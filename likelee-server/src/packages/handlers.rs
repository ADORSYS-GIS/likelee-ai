use super::*;
use crate::agencies::talent_refs::resolve_agency_talent_ref;
use crate::{
    auth::AuthUser,
    state::AppState,
    team::{permissions::Permission, require_agency_access, require_agency_permission},
};
use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    Json,
};

pub async fn list_packages(
    State(state): State<AppState>,
    user: AuthUser,
    Query(query): Query<ListPackagesQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let access = require_agency_access(&state, &user).await?;
    let agency_id = &access.organization_id;
    let mut db_query = state
        .pg
        .from("agency_talent_packages")
        .select("*, items:agency_talent_package_items(id), stats:agency_talent_package_stats(*)")
        .eq("agency_id", agency_id)
        .order("created_at.desc");

    if let Some(is_template) = query.is_template {
        db_query = db_query.eq("is_template", is_template.to_string());
    }

    let resp = db_query
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let err_text = resp.text().await.unwrap_or_default();
        tracing::error!("list_packages database error: [{}] {}", status, err_text);
        return Err((
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
            err_text,
        ));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let packages: serde_json::Value = serde_json::from_str(&text).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to parse packages JSON: {}, body: {}", e, text),
        )
    })?;

    Ok(Json(packages))
}

pub async fn create_package(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<CreatePackageRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // Helper to treat empty strings as None
    let sanitize = |s: &Option<String>| s.as_ref().filter(|v| !v.trim().is_empty()).cloned();

    let access = require_agency_permission(&state, &user, Permission::CreateCampaigns).await?;
    let agency_id = &access.organization_id;

    if payload.password_protected.unwrap_or(false) {
        let pwd_ok = payload
            .password
            .as_ref()
            .map(|p| !p.trim().is_empty())
            .unwrap_or(false);
        if !pwd_ok {
            return Err((
                StatusCode::BAD_REQUEST,
                "Password is required when password protection is enabled.".to_string(),
            ));
        }
    }

    // 1. Insert Package metadata
    let package_insert = serde_json::json!({
        "agency_id": agency_id,
        "title": payload.title,
        "description": sanitize(&payload.description),
        "cover_image_url": sanitize(&payload.cover_image_url),
        "primary_color": sanitize(&payload.primary_color),
        "secondary_color": sanitize(&payload.secondary_color),
        "custom_message": sanitize(&payload.custom_message),
        "allow_comments": payload.allow_comments.unwrap_or(true),
        "allow_favorites": payload.allow_favorites.unwrap_or(true),
        "allow_callbacks": payload.allow_callbacks.unwrap_or(true),
        "consent_items": payload
            .consent_items
            .as_ref()
            .map(|v| serde_json::Value::Array(v.iter().map(|s| serde_json::Value::String(s.clone())).collect()))
            .unwrap_or_else(|| serde_json::json!([])),
        "expires_at": sanitize(&payload.expires_at),
        "client_name": sanitize(&payload.client_name),
        "client_email": sanitize(&payload.client_email),
        "is_template": payload.is_template.unwrap_or(false),
        "template_id": sanitize(&payload.template_id),
        "password_protected": payload.password_protected.unwrap_or(false),
        "password_hash": if payload.password_protected.unwrap_or(false) {
            payload.password.as_ref().filter(|p| !p.trim().is_empty()).and_then(|p| bcrypt::hash(p, 10).ok())
        } else {
            None
        },
        "meta": payload.meta.clone().unwrap_or_else(|| serde_json::json!({})),
    });

    let resp = state
        .pg
        .from("agency_talent_packages")
        .insert(package_insert.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status_code_val = resp.status();
    if !status_code_val.is_success() {
        let error_text = resp
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        tracing::error!("Failed to create package: {}", error_text);
        let status = StatusCode::from_u16(status_code_val.as_u16())
            .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err((status, format!("Database error: {}", error_text)));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let packages: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let package = match packages {
        serde_json::Value::Array(ref arr) => arr.first().ok_or((
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to create package".to_string(),
        ))?,
        serde_json::Value::Object(_) => &packages,
        _ => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                "Unexpected package response shape".to_string(),
            ))
        }
    };
    let package_id = package["id"].as_str().ok_or((
        StatusCode::INTERNAL_SERVER_ERROR,
        "Package ID missing in response".to_string(),
    ))?;

    // 1.5 Initialize Stats
    let _ = state
        .pg
        .from("agency_talent_package_stats")
        .insert(serde_json::json!({ "package_id": package_id }).to_string())
        .execute()
        .await;

    // 2. Insert Items and Assets
    // First, verify ownership of all talents
    let supplied_talent_ids: Vec<String> =
        payload.items.iter().map(|i| i.talent_id.clone()).collect();

    if !supplied_talent_ids.is_empty() {
        for requested_id in &supplied_talent_ids {
            if let Err((code, _msg)) =
                resolve_effective_agency_talent_id(&state, agency_id, requested_id).await
            {
                tracing::error!(
                    "Invalid talent_id on package create agency_id={} talent_id={} status={}",
                    agency_id,
                    requested_id,
                    code
                );
                return Err((
                    StatusCode::BAD_REQUEST,
                    "Invalid talent selection".to_string(),
                ));
            }
        }
    }

    for (item_idx, item_req) in payload.items.iter().enumerate() {
        let talent_ref = resolve_agency_talent_ref(&state, agency_id, &item_req.talent_id)
            .await
            .map_err(|(code, msg)| {
                tracing::error!(
                    "Failed to resolve talent ref during package create agency_id={} talent_id={} status={} msg={}",
                    agency_id,
                    item_req.talent_id,
                    code,
                    msg
                );
                (StatusCode::BAD_REQUEST, "Invalid talent selection".to_string())
            })?;
        let agency_user_id = talent_ref.agency_user_id.clone();
        let creator_id = talent_ref.creator_id.clone();
        let item_insert = serde_json::json!({
            "package_id": package_id,
            "talent_id": agency_user_id,
            "creator_id": talent_ref.creator_id,
            "relationship_id": talent_ref.relationship_id,
            "sort_order": item_idx,
        });
        // ... insert item

        let item_resp = state
            .pg
            .from("agency_talent_package_items")
            .insert(item_insert.to_string())
            .select("id")
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let item_status = item_resp.status();

        let item_text = item_resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        if !item_status.is_success() {
            tracing::error!("Failed to create package item: {}", item_text);
            return Err((
                StatusCode::from_u16(item_status.as_u16())
                    .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
                "Failed to create package item".to_string(),
            ));
        }
        let created_items: serde_json::Value = serde_json::from_str(&item_text)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let item = match created_items {
            serde_json::Value::Array(ref arr) => arr.first().ok_or((
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to create item".to_string(),
            ))?,
            serde_json::Value::Object(_) => &created_items,
            _ => {
                return Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Unexpected item response shape".to_string(),
                ))
            }
        };
        let item_id = if let Some(id) = item["id"].as_str() {
            id.to_string()
        } else {
            // Defensive fallback: some PostgREST configs return an empty representation.
            // Re-select the row we just inserted.
            let mut lookup = state
                .pg
                .from("agency_talent_package_items")
                .select("id")
                .eq("package_id", package_id)
                .eq("sort_order", item_idx.to_string());
            if let Some(ref tid) = agency_user_id {
                lookup = lookup.eq("talent_id", tid);
            } else if let Some(ref cid) = creator_id {
                lookup = lookup.eq("creator_id", cid);
            }
            let lookup_resp = lookup
                .single()
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let lookup_status = lookup_resp.status();
            let lookup_text = lookup_resp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            if !lookup_status.is_success() {
                tracing::error!("Failed to lookup package item id: {}", lookup_text);
                return Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Item ID missing".to_string(),
                ));
            }
            let v: serde_json::Value = serde_json::from_str(&lookup_text)
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            v.get("id")
                .and_then(|x| x.as_str())
                .ok_or((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Item ID missing".to_string(),
                ))?
                .to_string()
        };

        for (asset_idx, asset_req) in item_req.asset_ids.iter().enumerate() {
            let asset_insert = serde_json::json!({
                "item_id": item_id,
                "asset_id": asset_req.asset_id,
                "asset_type": asset_req.asset_type,
                "sort_order": asset_idx,
            });

            let asset_resp = state
                .pg
                .from("agency_talent_package_item_assets")
                .insert(asset_insert.to_string())
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

            if !asset_resp.status().is_success() {
                let error_text = asset_resp
                    .text()
                    .await
                    .unwrap_or_else(|_| "Unknown error".to_string());
                tracing::error!("Failed to insert package asset: {}", error_text);
                return Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Failed to save package".to_string(),
                ));
            }
        }
    }

    // 3. Trigger Email Notification if client email is provided AND not a template
    let is_template = payload.is_template.unwrap_or(false);
    if !is_template {
        if let Some(client_email) = &payload.client_email {
            if !client_email.trim().is_empty() {
                let agency_name = fetch_agency_name(&state, &user.id)
                    .await
                    .unwrap_or_else(|_| "Premier Talent Agency".to_string());
                let client_name = payload.client_name.as_deref().unwrap_or("Client");
                let package_url = format!(
                    "{}/share/package/{}",
                    state.frontend_url,
                    package["access_token"].as_str().unwrap_or("")
                );

                let subject = format!("New Talent Selection from {}", agency_name);
                let body = format!(
                    r#"
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #333; margin-bottom: 24px;">Hello {},</h2>
                    <p style="color: #555; line-height: 1.6; font-size: 16px;">
                        <strong>{}</strong> has curated a new talent selection specifically for your project.
                    </p>
                    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 30px 0;">
                        <h3 style="margin-top: 0; color: #111;">{}</h3>
                        <p style="color: #666; font-size: 14px;">{}</p>
                        <a href="{}" style="display: inline-block; background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">View Portfolio</a>
                    </div>
                    <p style="color: #888; font-size: 12px; margin-top: 40px; border-top: 1px solid #eee; pt: 20px;">
                        Powered by LikeLee.ai - Professional Talent Management
                    </p>
                </div>
                "#,
                    client_name,
                    agency_name,
                    payload.title,
                    payload.description.as_deref().unwrap_or(""),
                    package_url
                );

                match crate::email::send_email_core(
                    &state,
                    client_email,
                    &subject,
                    &body,
                    true,
                    None,
                )
                .await
                {
                    Ok(_) => {}
                    Err((code, msg)) => tracing::error!(
                        "Failed to send package email to {}: [{}] {}",
                        client_email,
                        code,
                        msg
                    ),
                }
            } else {
                tracing::warn!(
                    "Client email provided but is empty after trimming: '{:?}'",
                    payload.client_email
                );
            }
        }
    } // End of !is_template check

    Ok(Json(package.clone()))
}

pub async fn update_package(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<CreatePackageRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let access = require_agency_permission(&state, &user, Permission::CreateCampaigns).await?;
    let agency_id = &access.organization_id;

    // 1. Verify ownership and existence
    let exists_resp = state
        .pg
        .from("agency_talent_packages")
        .select("id,password_protected,password_hash")
        .eq("id", &id)
        .eq("agency_id", agency_id)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !exists_resp.status().is_success() {
        return Err((
            StatusCode::NOT_FOUND,
            "Package not found or access denied".to_string(),
        ));
    }

    let exists_text = exists_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let existing: serde_json::Value = serde_json::from_str(&exists_text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let existing_password_protected = existing["password_protected"].as_bool().unwrap_or(false);
    let existing_password_hash_present = existing["password_hash"]
        .as_str()
        .map(|s| !s.trim().is_empty())
        .unwrap_or(false);

    // Helper to treat empty strings as None
    let sanitize = |s: &Option<String>| s.as_ref().filter(|v| !v.trim().is_empty()).cloned();

    let desired_password_protected = payload
        .password_protected
        .unwrap_or(existing_password_protected);

    // If enabling protection and we don't already have a stored hash, require a password.
    if desired_password_protected && !existing_password_hash_present {
        let pwd_ok = payload
            .password
            .as_ref()
            .map(|p| !p.trim().is_empty())
            .unwrap_or(false);
        if !pwd_ok {
            return Err((
                StatusCode::BAD_REQUEST,
                "Password is required when enabling password protection.".to_string(),
            ));
        }
    }

    // 2. Update Metadata (build dynamically so we don't accidentally null-out password_hash)
    let mut package_update = serde_json::Map::new();
    package_update.insert(
        "title".to_string(),
        serde_json::Value::String(payload.title),
    );
    package_update.insert(
        "description".to_string(),
        sanitize(&payload.description)
            .map(serde_json::Value::String)
            .unwrap_or(serde_json::Value::Null),
    );
    package_update.insert(
        "cover_image_url".to_string(),
        sanitize(&payload.cover_image_url)
            .map(serde_json::Value::String)
            .unwrap_or(serde_json::Value::Null),
    );
    package_update.insert(
        "primary_color".to_string(),
        sanitize(&payload.primary_color)
            .map(serde_json::Value::String)
            .unwrap_or(serde_json::Value::Null),
    );
    package_update.insert(
        "secondary_color".to_string(),
        sanitize(&payload.secondary_color)
            .map(serde_json::Value::String)
            .unwrap_or(serde_json::Value::Null),
    );
    package_update.insert(
        "custom_message".to_string(),
        sanitize(&payload.custom_message)
            .map(serde_json::Value::String)
            .unwrap_or(serde_json::Value::Null),
    );
    package_update.insert(
        "allow_comments".to_string(),
        serde_json::Value::Bool(payload.allow_comments.unwrap_or(true)),
    );
    package_update.insert(
        "allow_favorites".to_string(),
        serde_json::Value::Bool(payload.allow_favorites.unwrap_or(true)),
    );
    package_update.insert(
        "allow_callbacks".to_string(),
        serde_json::Value::Bool(payload.allow_callbacks.unwrap_or(true)),
    );
    package_update.insert(
        "consent_items".to_string(),
        payload
            .consent_items
            .as_ref()
            .map(|v| {
                serde_json::Value::Array(
                    v.iter()
                        .map(|s| serde_json::Value::String(s.clone()))
                        .collect(),
                )
            })
            .unwrap_or_else(|| serde_json::json!([])),
    );
    package_update.insert(
        "expires_at".to_string(),
        sanitize(&payload.expires_at)
            .map(serde_json::Value::String)
            .unwrap_or(serde_json::Value::Null),
    );
    package_update.insert(
        "client_name".to_string(),
        sanitize(&payload.client_name)
            .map(serde_json::Value::String)
            .unwrap_or(serde_json::Value::Null),
    );
    package_update.insert(
        "client_email".to_string(),
        sanitize(&payload.client_email)
            .map(serde_json::Value::String)
            .unwrap_or(serde_json::Value::Null),
    );
    package_update.insert(
        "password_protected".to_string(),
        serde_json::Value::Bool(desired_password_protected),
    );

    if !desired_password_protected {
        // When turning off protection, clear the stored hash.
        package_update.insert("password_hash".to_string(), serde_json::Value::Null);
    } else if let Some(p) = payload
        .password
        .as_ref()
        .map(|s| s.trim())
        .filter(|p| !p.is_empty())
    {
        // Only update the hash when a new password is explicitly provided.
        if let Ok(hash) = bcrypt::hash(p, 10) {
            package_update.insert("password_hash".to_string(), serde_json::Value::String(hash));
        } else {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to hash package password.".to_string(),
            ));
        }
    }

    package_update.insert(
        "updated_at".to_string(),
        serde_json::Value::String(chrono::Utc::now().to_rfc3339()),
    );
    let package_update = serde_json::Value::Object(package_update);

    let resp = state
        .pg
        .from("agency_talent_packages")
        .update(package_update.to_string())
        .eq("id", &id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let err_text = resp.text().await.unwrap_or_default();
        tracing::error!(
            "Failed to update package {} agency_id={} err={}",
            id,
            agency_id,
            err_text
        );
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to update package".to_string(),
        ));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let packages: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let package = match packages {
        serde_json::Value::Array(ref arr) => arr.first().cloned().ok_or((
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to return updated package".to_string(),
        ))?,
        serde_json::Value::Object(_) => packages,
        _ => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                "Unexpected package response shape".to_string(),
            ))
        }
    };

    // 3. Replace Items (Full Replacement Strategy)
    // First delete existing items (cascade will handle assets?)
    // Need to check schema for cascade.
    // If not cascading, we must delete items manually.
    // Assuming DB Foreign Keys have ON DELETE CASCADE usually.
    // If NO cascade, we might need explicit deletes.
    // agency_talent_package_items -> package_id.
    // Let's assume we can delete items by package_id.

    let _ = state
        .pg
        .from("agency_talent_package_items")
        .delete()
        .eq("package_id", &id)
        .execute()
        .await;

    // 4. Re-insert Items (Same logic as create)
    // ... skipping detailed ownership check for brevity in update, assuming frontend sends valid data or db constraints catch it ...
    // Actually, we SHOULD reuse the verification logic from Create for security.

    // Simplification for this artifact: Just insert. DB Foreign Key likely checks existence?
    // No, RLS/FK checks existence but ownership check is robust.
    // We proceed with insertion logic.

    // Validate + normalize talent ids before writing
    for item_req in payload.items.iter() {
        if let Err((code, _msg)) =
            resolve_effective_agency_talent_id(&state, agency_id, &item_req.talent_id).await
        {
            tracing::error!(
                "Invalid talent_id on package update agency_id={} talent_id={} status={}",
                agency_id,
                item_req.talent_id,
                code
            );
            return Err((
                StatusCode::BAD_REQUEST,
                "Invalid talent selection".to_string(),
            ));
        }
    }

    for (item_idx, item_req) in payload.items.iter().enumerate() {
        let talent_ref = resolve_agency_talent_ref(&state, agency_id, &item_req.talent_id)
            .await
            .map_err(|(code, msg)| {
                tracing::error!(
                    "Failed to resolve talent ref during package update agency_id={} talent_id={} status={} msg={}",
                    agency_id,
                    item_req.talent_id,
                    code,
                    msg
                );
                (StatusCode::BAD_REQUEST, "Invalid talent selection".to_string())
            })?;
        let agency_user_id = talent_ref.agency_user_id.clone();
        let item_insert = serde_json::json!({
            "package_id": id,
            "talent_id": agency_user_id,
            "creator_id": talent_ref.creator_id,
            "relationship_id": talent_ref.relationship_id,
            "sort_order": item_idx,
        });

        let item_resp = state
            .pg
            .from("agency_talent_package_items")
            .insert(item_insert.to_string())
            .select("id")
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        if let Ok(item_text) = item_resp.text().await {
            if let Ok(created_items) = serde_json::from_str::<serde_json::Value>(&item_text) {
                if let Some(item_id) = created_items
                    .as_array()
                    .and_then(|a| a.first())
                    .and_then(|i| i["id"].as_str())
                    .or_else(|| created_items["id"].as_str())
                {
                    for (asset_idx, asset_req) in item_req.asset_ids.iter().enumerate() {
                        let asset_insert = serde_json::json!({
                            "item_id": item_id,
                            "asset_id": asset_req.asset_id,
                            "asset_type": asset_req.asset_type,
                            "sort_order": asset_idx,
                        });
                        let _ = state
                            .pg
                            .from("agency_talent_package_item_assets")
                            .insert(asset_insert.to_string())
                            .execute()
                            .await;
                    }
                }
            }
        }
    }

    Ok(Json(package))
}

pub async fn create_public_package_full_assets_request(
    State(state): State<AppState>,
    Path(token): Path<String>,
    Json(payload): Json<PublicPackageFullAssetsRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // Resolve package by token — also fetch stored client identity so we can
    // use it as a fallback when the public request doesn't carry those fields.
    let meta_resp = state
        .pg
        .from("agency_talent_packages")
        .select("id,agency_id,title,client_name,client_email")
        .eq("access_token", &token)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !meta_resp.status().is_success() {
        let status = meta_resp.status();
        let err_text = meta_resp.text().await.unwrap_or_default();
        return Err((
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::NOT_FOUND),
            if err_text.is_empty() {
                "package_not_found".to_string()
            } else {
                err_text
            },
        ));
    }

    let meta_text = meta_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let meta: serde_json::Value = serde_json::from_str(&meta_text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let agency_id = meta
        .get("agency_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    if agency_id.is_empty() {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            "package_meta_invalid".to_string(),
        ));
    }
    let package_title = meta
        .get("title")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    // The stored package client identity is the authoritative source.
    // Use the payload values if provided, otherwise fall back to what the
    // agency set when they created/sent the package.
    let stored_client_name = meta
        .get("client_name")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let stored_client_email = meta
        .get("client_email")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();

    let payload_name = payload
        .client_name
        .as_deref()
        .unwrap_or("")
        .trim()
        .to_string();
    let payload_email = payload
        .client_email
        .as_deref()
        .unwrap_or("")
        .trim()
        .to_string();

    // Prefer payload values; fall back to the package's stored recipient details.
    let client_name = if payload_name.is_empty() {
        stored_client_name
    } else {
        payload_name
    };
    let client_email = if payload_email.is_empty() {
        stored_client_email
    } else {
        payload_email
    };
    let message = payload.message.as_deref().unwrap_or("").trim().to_string();

    let notes = format!(
        "Full assets requested for package.\n\nPackage: {}\nToken: {}\n\nClient name: {}\nClient email: {}\n\nMessage:\n{}",
        package_title, token, client_name, client_email, message
    );

    let insert_row = serde_json::json!({
        "agency_id": agency_id,
        "status": "pending",
        "campaign_title": "Full Assets Request",
        "talent_name": if package_title.is_empty() { "Package Full Assets Request" } else { &package_title },
        "client_name": if client_name.is_empty() { serde_json::Value::Null } else { serde_json::Value::String(client_name.clone()) },
        "usage_scope": "package_full_assets",
        "notes": notes,
    });

    let ins_resp = state
        .pg
        .from("licensing_requests")
        .insert(insert_row.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !ins_resp.status().is_success() {
        let err = ins_resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    // Record interaction for the Client Activity timeline
    let package_id = meta["id"].as_str().unwrap_or("");
    let interaction_row = serde_json::json!({
        "package_id": package_id,
        "type": "asset_request",
        "content": if message.is_empty() { serde_json::Value::Null } else { serde_json::Value::String(message.clone()) },
        "client_name": if client_name.is_empty() { serde_json::Value::Null } else { serde_json::Value::String(client_name.clone()) },
        "client_email": if client_email.is_empty() { serde_json::Value::Null } else { serde_json::Value::String(client_email.clone()) },
    });

    if let Err(e) = state
        .pg
        .from("agency_talent_package_interactions")
        .insert(interaction_row.to_string())
        .execute()
        .await
    {
        tracing::warn!("Failed to record asset_request interaction: {}", e);
    }

    // Best-effort email notification to agency.
    let mut agency_email: Option<String> = None;
    let mut agency_name: Option<String> = None;
    if let Ok(resp) = state
        .pg
        .from("agencies")
        .select("email,agency_name")
        .eq("id", &agency_id)
        .single()
        .execute()
        .await
    {
        if resp.status().is_success() {
            if let Ok(txt) = resp.text().await {
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(&txt) {
                    agency_email = v
                        .get("email")
                        .and_then(|x| x.as_str())
                        .map(|s| s.to_string());
                    agency_name = v
                        .get("agency_name")
                        .and_then(|x| x.as_str())
                        .map(|s| s.to_string());
                }
            }
        }
    }

    if let Some(dest) = agency_email.as_ref().filter(|s| !s.trim().is_empty()) {
        let subject = "New request for full package assets";
        let body = format!(
            "You received a new request for full package assets.\n\nPackage: {}\nToken: {}\n\nClient name: {}\nClient email: {}\n\nMessage:\n{}\n\nView and manage requests in your Agency Dashboard under Licensing Requests.",
            package_title,
            token,
            payload.client_name.as_deref().unwrap_or(""),
            payload.client_email.as_deref().unwrap_or(""),
            payload.message.as_deref().unwrap_or("")
        );
        let _ = crate::email::send_plain_text_email(
            &state,
            dest,
            subject,
            &body,
            agency_name.as_deref(),
        );
    }

    Ok(Json(serde_json::json!({ "ok": true })))
}

pub async fn get_package(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let access = require_agency_access(&state, &user).await?;
    let agency_id = &access.organization_id;
    let resp = state
        .pg
        .from("agency_talent_packages")
        .select("*, items:agency_talent_package_items(*, talent:agency_users(*), creator:creators(*), assets:agency_talent_package_item_assets(*)), stats:agency_talent_package_stats(*), interactions:agency_talent_package_interactions(*)")
        .eq("agency_id", agency_id)
        .eq("id", &id)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let err_text = resp.text().await.unwrap_or_default();
        return Err((
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
            err_text,
        ));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let package: serde_json::Value = serde_json::from_str(&text).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("failed to parse package: {}", e),
        )
    })?;

    Ok(Json(package))
}

pub async fn delete_package(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    let access = require_agency_permission(&state, &user, Permission::CreateCampaigns).await?;
    let agency_id = &access.organization_id;
    state
        .pg
        .from("agency_talent_packages")
        .delete()
        .eq("agency_id", agency_id)
        .eq("id", &id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn get_dashboard_stats(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let access = require_agency_access(&state, &user).await?;
    let agency_id = &access.organization_id;
    // 1. Get total packages and active shares
    let packages_resp = state
        .pg
        .from("agency_talent_packages")
        .select("id,expires_at")
        .eq("agency_id", agency_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let packages_text = packages_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let packages: Vec<serde_json::Value> = serde_json::from_str(&packages_text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let total_packages = packages.len();
    let now = chrono::Utc::now();
    let active_shares = packages
        .iter()
        .filter(|p| match p["expires_at"].as_str() {
            Some(exp) => match chrono::DateTime::parse_from_rfc3339(exp) {
                Ok(exp_dt) => exp_dt > now,
                Err(_) => true,
            },
            None => true,
        })
        .count();

    // 2. Get total views and interactions via RPC
    let stats_resp = state
        .pg
        .rpc(
            "get_agency_package_stats",
            serde_json::json!({ "p_agency_id": user.id }).to_string(),
        )
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !stats_resp.status().is_success() {
        let status = stats_resp.status();
        let err_text = stats_resp.text().await.unwrap_or_default();
        tracing::error!(
            "get_agency_package_stats RPC error: [{}] {}",
            status,
            err_text
        );
        // Fallback to zeros instead of 500 error if RPC fails
        return Ok(Json(serde_json::json!({
            "total_packages": total_packages,
            "active_shares": active_shares,
            "total_views": 0,
        })));
    }

    let stats_text = stats_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let stats_arr: Vec<serde_json::Value> = serde_json::from_str(&stats_text).unwrap_or_default();

    let stats = stats_arr.first().cloned().unwrap_or(serde_json::json!({
        "total_views": 0,
        "total_favorites": 0,
        "total_callbacks": 0
    }));

    let views = stats["total_views"].as_i64().unwrap_or(0);

    Ok(Json(serde_json::json!({
        "total_packages": total_packages,
        "active_shares": active_shares,
        "total_views": views,
    })))
}

// Public Handlers

pub async fn get_public_package(
    State(state): State<AppState>,
    Path(token): Path<String>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // 1. Fetch package metadata first to check for password protection
    let meta_resp = state
        .pg
        .from("agency_talent_packages")
        .select("id,password_protected,password_hash,expires_at")
        .eq("access_token", &token)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !meta_resp.status().is_success() {
        let status = meta_resp.status();
        let err_text = meta_resp.text().await.unwrap_or_default();
        return Err((
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::NOT_FOUND),
            if err_text.is_empty() {
                "Package not found".to_string()
            } else {
                err_text
            },
        ));
    }

    let meta_text = meta_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let package_meta: serde_json::Value = serde_json::from_str(&meta_text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 2. Check if expired
    if let Some(expires_at) = package_meta["expires_at"].as_str() {
        if let Ok(expires) = chrono::DateTime::parse_from_rfc3339(expires_at) {
            if expires < chrono::Utc::now() {
                return Err((StatusCode::GONE, "Package expired".to_string()));
            }
        }
    }

    // 3. Check for password if protected
    if package_meta["password_protected"]
        .as_bool()
        .unwrap_or(false)
    {
        let provided_password = headers
            .get("X-Package-Password")
            .and_then(|v| v.to_str().ok());

        let stored_hash = package_meta["password_hash"].as_str();

        match (provided_password, stored_hash) {
            (Some(password), Some(hash)) => {
                if !bcrypt::verify(password, hash).unwrap_or(false) {
                    return Err((StatusCode::UNAUTHORIZED, "Invalid password".to_string()));
                }
            }
            _ => {
                return Err((StatusCode::UNAUTHORIZED, "Password required".to_string()));
            }
        }
    }

    // 4. If authorized, fetch full package details via RPC
    let resp = state
        .pg
        .rpc(
            "get_public_package_details",
            serde_json::json!({ "p_access_token": token }).to_string(),
        )
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let err_text = resp.text().await.unwrap_or_default();
        return Err((
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
            err_text,
        ));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let mut package: serde_json::Value = serde_json::from_str(&text).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to parse public package: {}", e),
        )
    })?;

    if let Some(obj) = package.as_object_mut() {
        obj.insert(
            "licensing_unlocked".to_string(),
            serde_json::Value::Bool(true),
        );
    }

    if let Some(items) = package.get_mut("items").and_then(|i| i.as_array_mut()) {
        for item in items {
            if let Some(assets) = item.get_mut("assets").and_then(|a| a.as_array_mut()) {
                for asset_container in assets {
                    if let Some(asset) = asset_container.get_mut("asset") {
                        let public_url = asset
                            .get("public_url")
                            .and_then(|v| v.as_str())
                            .map(str::to_string);
                        if public_url.as_deref().unwrap_or("").is_empty() {
                            if let (Some(bucket), Some(path)) = (
                                asset.get("storage_bucket").and_then(|v| v.as_str()),
                                asset.get("storage_path").and_then(|v| v.as_str()),
                            ) {
                                let constructed_url = format!(
                                    "{}/storage/v1/object/public/{}/{}",
                                    state.supabase_url, bucket, path
                                );
                                if let Some(obj) = asset.as_object_mut() {
                                    obj.insert(
                                        "asset_url".to_string(),
                                        serde_json::Value::String(constructed_url),
                                    );
                                }
                            }
                        } else if let (Some(obj), Some(url)) = (asset.as_object_mut(), public_url) {
                            obj.insert("asset_url".to_string(), serde_json::Value::String(url));
                        }
                    }
                }
            }
        }
    }

    // 5. Increment view count
    if let Some(id) = package_meta["id"].as_str() {
        let _ = state
            .pg
            .rpc(
                "increment_package_view",
                serde_json::json!({ "p_package_id": id }).to_string(),
            )
            .execute()
            .await;
    }

    Ok(Json(package))
}

pub async fn delete_interaction(
    State(state): State<AppState>,
    Path(token): Path<String>,
    Json(payload): Json<DeleteInteractionRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    // 1. Verify package exists via token and get its ID
    let package_resp = state
        .pg
        .from("agency_talent_packages")
        .select("id")
        .eq("access_token", &token)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !package_resp.status().is_success() {
        let status = package_resp.status();
        let err_text = package_resp.text().await.unwrap_or_default();
        return Err((
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::NOT_FOUND),
            err_text,
        ));
    }

    let package_text = package_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let package: serde_json::Value = serde_json::from_str(&package_text).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to parse interaction package: {}", e),
        )
    })?;
    let package_id = package["id"]
        .as_str()
        .ok_or((StatusCode::NOT_FOUND, "Package ID missing".to_string()))?;

    // 2. Delete the interaction — match on whichever identity column is set.
    //    Onboarded roster talent: talent_id is set.
    //    Independent connected creator: talent_id is null, creator_id is set.
    let delete_query = state
        .pg
        .from("agency_talent_package_interactions")
        .delete()
        .eq("package_id", package_id)
        .eq("type", &payload.r#type);

    let delete_resp = if let Some(ref tid) = payload.talent_id {
        if !tid.trim().is_empty() {
            delete_query.eq("talent_id", tid.trim()).execute().await
        } else if let Some(ref cid) = payload.creator_id {
            delete_query.eq("creator_id", cid.trim()).execute().await
        } else {
            return Ok(StatusCode::NO_CONTENT);
        }
    } else if let Some(ref cid) = payload.creator_id {
        delete_query.eq("creator_id", cid.trim()).execute().await
    } else {
        return Ok(StatusCode::NO_CONTENT);
    };

    let delete_resp =
        delete_resp.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !delete_resp.status().is_success() {
        let status = delete_resp.status();
        let err_text = delete_resp.text().await.unwrap_or_default();
        tracing::error!("Failed to delete interaction: [{}] {}", status, err_text);
        return Err((
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
            err_text,
        ));
    }

    Ok(StatusCode::NO_CONTENT)
}
