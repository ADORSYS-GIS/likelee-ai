use crate::{auth::AuthUser, config::AppState};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tracing::info;

// ============================================================================
// Request / Response types
// ============================================================================

#[derive(Deserialize)]
pub struct CreateCatalogRequest {
    pub title: String,
    pub client_name: Option<String>,
    pub client_email: Option<String>,
    pub licensing_request_id: Option<String>,
    pub notes: Option<String>,
    pub items: Vec<CatalogItemRequest>,
}

#[derive(Deserialize)]
pub struct CatalogItemRequest {
    pub talent_id: String,
    pub asset_ids: Vec<CatalogAssetRef>,
    pub recording_ids: Vec<CatalogRecordingRef>,
}

#[derive(Deserialize)]
pub struct CatalogAssetRef {
    pub asset_id: String,
    pub asset_type: String,
}

#[derive(Deserialize)]
pub struct CatalogRecordingRef {
    pub recording_id: String,
    pub emotion_tag: Option<String>,
}

#[derive(Serialize)]
pub struct CatalogRow {
    pub id: String,
    pub agency_id: String,
    pub licensing_request_id: Option<String>,
    pub title: String,
    pub client_name: Option<String>,
    pub client_email: Option<String>,
    pub access_token: String,
    pub created_at: String,
    pub sent_at: Option<String>,
    pub notes: Option<String>,
    pub item_count: i64,
}

// ============================================================================
// List catalogs (agency dashboard)
// ============================================================================

pub async fn list_catalogs(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    let resp = state
        .pg
        .from("agency_catalogs")
        .select("id,agency_id,licensing_request_id,title,client_name,client_email,access_token,created_at,sent_at,notes")
        .eq("agency_id", &user.id)
        .order("created_at.desc")
        .limit(200)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !status.is_success() {
        return Err(crate::errors::sanitize_db_error(status.as_u16(), text));
    }

    let rows: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!([]));
    Ok(Json(rows))
}

// ============================================================================
// List eligible paid licensing requests (no catalog yet)
// ============================================================================

pub async fn list_eligible_requests(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    // 1. Fetch agency_payment_links with status = 'paid' for this agency
    let pl_resp = state
        .pg
        .from("agency_payment_links")
        .select("id,licensing_request_id,client_name,client_email,total_amount_cents,paid_at,licensing_requests(talent_id,talent_ids,campaign_title)")
        .eq("agency_id", &user.id)
        .eq("status", "paid")
        .order("paid_at.desc")
        .limit(200)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let pl_status = pl_resp.status();
    let pl_text = pl_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !pl_status.is_success() {
        return Err(crate::errors::sanitize_db_error(pl_status.as_u16(), pl_text));
    }

    let pl_rows: Vec<serde_json::Value> = serde_json::from_str(&pl_text).unwrap_or_default();

    // 2. Fetch existing catalogs
    let existing_resp = state
        .pg
        .from("agency_catalogs")
        .select("licensing_request_id")
        .eq("agency_id", &user.id)
        .not("is", "licensing_request_id", "null")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let existing_text = existing_resp.text().await.unwrap_or_else(|_| "[]".into());
    let existing_rows: Vec<serde_json::Value> = serde_json::from_str(&existing_text).unwrap_or_default();

    let used_lr_ids: std::collections::HashSet<String> = existing_rows
        .iter()
        .filter_map(|r| r.get("licensing_request_id").and_then(|v| v.as_str()).map(|s| s.to_string()))
        .collect();

    // 3. Keep eligible ones and gather all unique talent IDs
    let mut eligible: Vec<serde_json::Value> = Vec::new();
    let mut all_talent_ids: std::collections::HashSet<String> = std::collections::HashSet::new();

    for row in pl_rows {
        let lrid = row.get("licensing_request_id").and_then(|v| v.as_str()).unwrap_or("");
        if !lrid.is_empty() && used_lr_ids.contains(lrid) {
            continue; // already used
        }

        let mut mod_row = row.clone();

        // Extract talents
        let mut t_ids: Vec<String> = Vec::new();
        if let Some(lr) = row.get("licensing_requests") {
            if let Some(arr) = lr.get("talent_ids").and_then(|v| v.as_array()) {
                for t in arr {
                    if let Some(s) = t.as_str() {
                        t_ids.push(s.to_string());
                    }
                }
            }
            if t_ids.is_empty() {
                if let Some(t) = lr.get("talent_id").and_then(|v| v.as_str()) {
                    if !t.is_empty() {
                        t_ids.push(t.to_string());
                    }
                }
            }
            // Propagate campaign title to root for easier wizard usage
            if let Some(ct) = lr.get("campaign_title") {
                if let Some(obj) = mod_row.as_object_mut() {
                    obj.insert("campaign_title".into(), ct.clone());
                }
            }
        }

        for t in &t_ids {
            all_talent_ids.insert(t.clone());
        }

        // Store intermediate talent IDs array (will replace with full objects)
        if let Some(obj) = mod_row.as_object_mut() {
            obj.insert("_talent_ids".into(), serde_json::json!(t_ids));
        }
        eligible.push(mod_row);
    }

    // 4. Fetch talent names
    let mut talent_name_map: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    if !all_talent_ids.is_empty() {
        let t_refs: Vec<&str> = all_talent_ids.iter().map(|s| s.as_str()).collect();
        let au_resp = state
            .pg
            .from("agency_users")
            .auth(state.supabase_service_key.clone())
            .select("id,full_legal_name,stage_name")
            .in_("id", t_refs)
            .execute()
            .await
            .ok();

        if let Some(resp) = au_resp {
            if let Ok(text) = resp.text().await {
                let au_rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
                for r in au_rows {
                    let id = r.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let name = r.get("full_legal_name").or_else(|| r.get("stage_name")).and_then(|v| v.as_str()).unwrap_or("Talent").to_string();
                    talent_name_map.insert(id, name);
                }
            }
        }
    }

    // 5. Build final array with talent objects
    for row in &mut eligible {
        if let Some(obj) = row.as_object_mut() {
            let ids = obj.remove("_talent_ids").and_then(|v| v.as_array().map(|a| a.clone())).unwrap_or_default();
            let mut linked_talents = Vec::new();
            for tval in ids {
                if let Some(tid) = tval.as_str() {
                    let name = talent_name_map.get(tid).cloned().unwrap_or_else(|| "Talent".to_string());
                    linked_talents.push(serde_json::json!({
                        "id": tid,
                        "name": name
                    }));
                }
            }
            obj.insert("talents".into(), serde_json::json!(linked_talents));
            obj.remove("licensing_requests"); // don't send raw joined block
        }
    }

    Ok(Json(serde_json::json!(eligible)))
}

// ============================================================================
// Create catalog
// ============================================================================

pub async fn create_catalog(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<CreateCatalogRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    if payload.title.trim().is_empty() {
        return Err((StatusCode::BAD_REQUEST, "title is required".to_string()));
    }

    // 1. Insert the catalog root record
    let mut catalog_insert = json!({
        "agency_id": user.id,
        "title": payload.title.trim(),
    });

    if let Some(ref cn) = payload.client_name {
        if !cn.trim().is_empty() {
            catalog_insert["client_name"] = json!(cn.trim());
        }
    }
    if let Some(ref ce) = payload.client_email {
        if !ce.trim().is_empty() {
            catalog_insert["client_email"] = json!(ce.trim());
        }
    }
    if let Some(ref lrid) = payload.licensing_request_id {
        if !lrid.trim().is_empty() {
            catalog_insert["licensing_request_id"] = json!(lrid.trim());
        }
    }
    if let Some(ref notes) = payload.notes {
        if !notes.trim().is_empty() {
            catalog_insert["notes"] = json!(notes.trim());
        }
    }

    let ins_resp = state
        .pg
        .from("agency_catalogs")
        .insert(catalog_insert.to_string())
        .select("id,access_token")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let ins_status = ins_resp.status();
    let ins_text = ins_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !ins_status.is_success() {
        return Err(crate::errors::sanitize_db_error(ins_status.as_u16(), ins_text));
    }

    let ins_rows: Vec<serde_json::Value> = serde_json::from_str(&ins_text).unwrap_or_default();
    let catalog_row = ins_rows.into_iter().next().ok_or_else(|| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "catalog insert returned no row".to_string(),
        )
    })?;

    let catalog_id = catalog_row
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let access_token = catalog_row
        .get("access_token")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    // 2. Insert items, assets, and recordings
    for (idx, item) in payload.items.iter().enumerate() {
        if item.talent_id.trim().is_empty() {
            continue;
        }

        let item_insert = json!({
            "catalog_id": catalog_id,
            "talent_id": item.talent_id,
            "sort_order": idx,
        });

        let item_resp = state
            .pg
            .from("agency_catalog_items")
            .insert(item_insert.to_string())
            .select("id")
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let item_text = item_resp.text().await.unwrap_or_else(|_| "[]".into());
        let item_rows: Vec<serde_json::Value> = serde_json::from_str(&item_text).unwrap_or_default();
        let item_id = item_rows
            .into_iter()
            .next()
            .and_then(|r| r.get("id").and_then(|v| v.as_str()).map(|s| s.to_string()))
            .unwrap_or_default();

        if item_id.is_empty() {
            continue;
        }

        // Insert digital assets
        for (ai, asset) in item.asset_ids.iter().enumerate() {
            if asset.asset_id.trim().is_empty() {
                continue;
            }
            let asset_insert = json!({
                "catalog_item_id": item_id,
                "asset_id": asset.asset_id,
                "asset_type": asset.asset_type,
                "sort_order": ai,
            });
            let _ = state
                .pg
                .from("agency_catalog_assets")
                .insert(asset_insert.to_string())
                .execute()
                .await;
        }

        // Insert voice recordings
        for (ri, rec) in item.recording_ids.iter().enumerate() {
            if rec.recording_id.trim().is_empty() {
                continue;
            }
            let rec_insert = json!({
                "catalog_item_id": item_id,
                "recording_id": rec.recording_id,
                "emotion_tag": rec.emotion_tag,
                "sort_order": ri,
            });
            let _ = state
                .pg
                .from("agency_catalog_recordings")
                .insert(rec_insert.to_string())
                .execute()
                .await;
        }
    }

    // 3. Send email to client if email provided
    let client_email = payload.client_email.as_deref().unwrap_or("").trim().to_string();
    let mut email_sent = false;

    if !client_email.is_empty() {
        let app_url = std::env::var("APP_URL").unwrap_or_else(|_| "https://app.likelee.com".to_string());
        let catalog_url = format!("{}/share/catalog/{}", app_url, access_token);
        let client_name = payload.client_name.as_deref().unwrap_or("Client");
        let subject = format!("Your Licensed Assets Catalog – {}", payload.title.trim());
        let body = format!(
            "Dear {},\n\nYour licensed asset catalog is now ready.\n\nTitle: {}\n\nAccess your catalog here:\n{}\n\nThis link contains all the approved digital assets and voice recordings included in your license.\n\nBest regards,\nLikelee",
            client_name,
            payload.title.trim(),
            catalog_url
        );

        match crate::email::send_plain_email(&state, &client_email, &subject, &body) {
            Ok(_) => {
                email_sent = true;
                // Mark sent_at
                let _ = state
                    .pg
                    .from("agency_catalogs")
                    .eq("id", &catalog_id)
                    .update(json!({"sent_at": chrono::Utc::now().to_rfc3339()}).to_string())
                    .execute()
                    .await;
            }
            Err(e) => {
                tracing::warn!(
                    catalog_id = %catalog_id,
                    error = ?e,
                    "Failed to send catalog email"
                );
            }
        }
    }

    info!(
        agency_id = %user.id,
        catalog_id = %catalog_id,
        item_count = payload.items.len(),
        email_sent = email_sent,
        "Catalog created"
    );

    Ok(Json(json!({
        "id": catalog_id,
        "access_token": access_token,
        "email_sent": email_sent,
        "ok": true,
    })))
}

// ============================================================================
// Delete catalog
// ============================================================================

pub async fn delete_catalog(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    let resp = state
        .pg
        .from("agency_catalogs")
        .delete()
        .eq("id", &id)
        .eq("agency_id", &user.id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let del_status = resp.status();
    if !del_status.is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err(crate::errors::sanitize_db_error(del_status.as_u16(), err));
    }

    Ok(Json(json!({"ok": true})))
}

// ============================================================================
// Public catalog view  GET /api/public/catalogs/:token
// ============================================================================

pub async fn get_public_catalog(
    State(state): State<AppState>,
    Path(token): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // 1. Fetch the catalog by access_token (no auth required)
    let cat_resp = state
        .pg
        .from("agency_catalogs")
        .select("id,agency_id,licensing_request_id,title,client_name,client_email,created_at,notes")
        .eq("access_token", &token)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let cat_status = cat_resp.status();
    let cat_text = cat_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !cat_status.is_success() {
        return Err(crate::errors::sanitize_db_error(cat_status.as_u16(), cat_text));
    }

    let cat_rows: Vec<serde_json::Value> = serde_json::from_str(&cat_text).unwrap_or_default();
    let catalog = cat_rows.into_iter().next().ok_or_else(|| {
        (StatusCode::NOT_FOUND, "Catalog not found".to_string())
    })?;

    let catalog_id = catalog
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let licensing_request_id = catalog
        .get("licensing_request_id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    // 2. Fetch all items for this catalog
    let items_resp = state
        .pg
        .from("agency_catalog_items")
        .select("id,talent_id,sort_order")
        .eq("catalog_id", &catalog_id)
        .order("sort_order.asc")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let items_text = items_resp.text().await.unwrap_or_else(|_| "[]".into());
    let items: Vec<serde_json::Value> = serde_json::from_str(&items_text).unwrap_or_default();

    // 3. For each item, fetch assets and recordings
    let mut enriched_items: Vec<serde_json::Value> = Vec::new();

    for item in &items {
        let item_id = item.get("id").and_then(|v| v.as_str()).unwrap_or("");
        let talent_id = item.get("talent_id").and_then(|v| v.as_str()).unwrap_or("");

        // Fetch digital assets
        let assets_resp = state
            .pg
            .from("agency_catalog_assets")
            .select("asset_id,asset_type,sort_order")
            .eq("catalog_item_id", item_id)
            .order("sort_order.asc")
            .execute()
            .await;

        let assets_raw: Vec<serde_json::Value> = if let Ok(resp) = assets_resp {
            if let Ok(text) = resp.text().await {
                serde_json::from_str(&text).unwrap_or_default()
            } else { Vec::new() }
        } else { Vec::new() };

        // Enrich each asset_id with its public_url (reference_images or agency_files)
        let mut assets: Vec<serde_json::Value> = Vec::new();
        for mut asset in assets_raw {
            let asset_id = asset.get("asset_id").and_then(|v| v.as_str()).unwrap_or("").to_string();
            if !asset_id.is_empty() {
                // Try reference_images first
                let ri_rows: Vec<serde_json::Value> = if let Ok(r) = state.pg
                    .from("reference_images")
                    .auth(state.supabase_service_key.clone())
                    .select("public_url,storage_bucket,storage_path")
                    .eq("id", &asset_id)
                    .limit(1)
                    .execute().await {
                    r.text().await.ok().and_then(|t| serde_json::from_str(&t).ok()).unwrap_or_default()
                } else { vec![] };

                if let Some(ri) = ri_rows.into_iter().next() {
                    let pu = ri.get("public_url").and_then(|v| v.as_str()).unwrap_or("");
                    if !pu.is_empty() {
                        if let Some(obj) = asset.as_object_mut() { obj.insert("url".into(), json!(pu)); }
                    } else {
                        let bucket = ri.get("storage_bucket").and_then(|v| v.as_str()).unwrap_or("");
                        let path  = ri.get("storage_path").and_then(|v| v.as_str()).unwrap_or("");
                        if !bucket.is_empty() {
                            if let Some(su) = generate_signed_url(&state, bucket, path).await {
                                if let Some(obj) = asset.as_object_mut() { obj.insert("url".into(), json!(su)); }
                            }
                        }
                    }
                } else {
                    // Try agency_files
                    let af_rows: Vec<serde_json::Value> = if let Ok(r) = state.pg
                        .from("agency_files")
                        .auth(state.supabase_service_key.clone())
                        .select("public_url,storage_bucket,storage_path")
                        .eq("id", &asset_id)
                        .limit(1)
                        .execute().await {
                        r.text().await.ok().and_then(|t| serde_json::from_str(&t).ok()).unwrap_or_default()
                    } else { vec![] };

                    if let Some(af) = af_rows.into_iter().next() {
                        let pu = af.get("public_url").and_then(|v| v.as_str()).unwrap_or("");
                        if !pu.is_empty() {
                            if let Some(obj) = asset.as_object_mut() { obj.insert("url".into(), json!(pu)); }
                        } else {
                            let bucket = af.get("storage_bucket").and_then(|v| v.as_str()).unwrap_or("");
                            let path  = af.get("storage_path").and_then(|v| v.as_str()).unwrap_or("");
                            if !bucket.is_empty() {
                                if let Some(su) = generate_signed_url(&state, bucket, path).await {
                                    if let Some(obj) = asset.as_object_mut() { obj.insert("url".into(), json!(su)); }
                                }
                            }
                        }
                    }
                }
            }
            assets.push(asset);
        }

        // Fetch voice recordings
        let recs_resp = state
            .pg
            .from("agency_catalog_recordings")
            .select("recording_id,emotion_tag,sort_order")
            .eq("catalog_item_id", item_id)
            .order("sort_order.asc")
            .execute()
            .await;

        let recordings_raw: Vec<serde_json::Value> = if let Ok(resp) = recs_resp {
            if let Ok(text) = resp.text().await {
                serde_json::from_str(&text).unwrap_or_default()
            } else { Vec::new() }
        } else { Vec::new() };

        // Enrich recordings with their storage paths so the client can request signed URLs
        let mut recordings: Vec<serde_json::Value> = Vec::new();
        for rec in &recordings_raw {
            let rec_id = rec.get("recording_id").and_then(|v| v.as_str()).unwrap_or("");
            if rec_id.is_empty() {
                continue;
            }

            let vr_resp = state
                .pg
                .from("voice_recordings")
                .auth(state.supabase_service_key.clone())
                .select("id,storage_bucket,storage_path,mime_type,emotion_tag,accessible")
                .eq("id", rec_id)
                .limit(1)
                .execute()
                .await;

            let vr_rows: Vec<serde_json::Value> = if let Ok(resp) = vr_resp {
                if let Ok(text) = resp.text().await {
                    serde_json::from_str(&text).unwrap_or_default()
                } else { Vec::new() }
            } else { Vec::new() };

            if let Some(vr) = vr_rows.into_iter().next() {
                let accessible = vr.get("accessible").and_then(|v| v.as_bool()).unwrap_or(true);
                if !accessible { continue; }
                let mut merged = rec.clone();
                let bucket = vr.get("storage_bucket").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let path   = vr.get("storage_path").and_then(|v| v.as_str()).unwrap_or("").to_string();
                if let Some(obj) = merged.as_object_mut() {
                    obj.insert("storage_bucket".into(), vr["storage_bucket"].clone());
                    obj.insert("storage_path".into(),   vr["storage_path"].clone());
                    obj.insert("mime_type".into(),       vr["mime_type"].clone());
                    obj.entry("emotion_tag").or_insert_with(|| vr["emotion_tag"].clone());
                    if !bucket.is_empty() && !path.is_empty() {
                        if let Some(su) = generate_signed_url(&state, &bucket, &path).await {
                            obj.insert("signed_url".into(), json!(su));
                        }
                    }
                }
                recordings.push(merged);
            }
        }

        // Fetch talent display name
        let talent_name = {
            let tn_resp = state
                .pg
                .from("agency_users")
                .auth(state.supabase_service_key.clone())
                .select("full_legal_name,stage_name")
                .eq("id", talent_id)
                .limit(1)
                .execute()
                .await;

            let tn_rows: Vec<serde_json::Value> = if let Ok(resp) = tn_resp {
                if let Ok(text) = resp.text().await {
                    serde_json::from_str(&text).unwrap_or_default()
                } else {
                    Vec::new()
                }
            } else {
                Vec::new()
            };

            tn_rows.first()
                .and_then(|r| {
                    r.get("full_legal_name")
                        .or_else(|| r.get("stage_name"))
                        .and_then(|v| v.as_str())
                })
                .unwrap_or("Talent")
                .to_string()
        };

        enriched_items.push(json!({
            "talent_id": talent_id,
            "talent_name": talent_name,
            "sort_order": item.get("sort_order"),
            "assets": assets,
            "recordings": recordings,
        }));
    }

    // 4. Retrieve licensing receipt details (if linked)
    let receipt = if let Some(ref lr_id) = licensing_request_id {
        let lr_resp = state
            .pg
            .from("licensing_requests")
            .auth(state.supabase_service_key.clone())
            .select("id,campaign_title,client_name,license_start_date,license_end_date,usage_scope,regions,created_at,license_submissions!licensing_requests_submission_id_fkey(license_fee,client_name,client_email)")
            .eq("id", lr_id)
            .limit(1)
            .execute()
            .await;

        let lr_rows: Vec<serde_json::Value> = if let Ok(resp) = lr_resp {
            if let Ok(text) = resp.text().await {
                serde_json::from_str(&text).unwrap_or_default()
            } else {
                Vec::new()
            }
        } else {
            Vec::new()
        };

        let lr = lr_rows.into_iter().next();

        if let Some(ref req) = lr {
            let ls = req.get("license_submissions");
            let fee_cents = ls
                .and_then(|ls| ls.get("license_fee"))
                .and_then(|v| v.as_i64())
                .unwrap_or(0);

            Some(json!({
                "campaign_title": req.get("campaign_title"),
                "client_name": req.get("client_name"),
                "license_start_date": req.get("license_start_date"),
                "license_end_date": req.get("license_end_date"),
                "usage_scope": req.get("usage_scope"),
                "regions": req.get("regions"),
                "created_at": req.get("created_at"),
                "license_fee_cents": fee_cents,
                "license_fee_display": format!("${:.2}", fee_cents as f64 / 100.0),
            }))
        } else {
            None
        }
    } else {
        None
    };

    Ok(Json(json!({
        "id": catalog_id,
        "title": catalog.get("title"),
        "client_name": catalog.get("client_name"),
        "created_at": catalog.get("created_at"),
        "notes": catalog.get("notes"),
        "items": enriched_items,
        "receipt": receipt,
    })))
}

// Helper: generate a 24-hour signed URL for a private storage object
async fn generate_signed_url(state: &crate::config::AppState, bucket: &str, path: &str) -> Option<String> {
    let url = format!("{}/storage/v1/object/sign/{}/{}", state.supabase_url, bucket, path);
    let body = serde_json::json!({ "expiresIn": 86400 }); // 24h
    let http = reqwest::Client::new();
    let resp = http
        .post(&url)
        .header("Authorization", format!("Bearer {}", state.supabase_service_key))
        .header("apikey", state.supabase_service_key.clone())
        .json(&body)
        .send()
        .await
        .ok()?;
    if !resp.status().is_success() {
        return None;
    }
    let j: serde_json::Value = resp.json().await.ok()?;
    let signed_path = j.get("signedURL").and_then(|v| v.as_str())?;
    Some(format!("{}/storage/v1{}", state.supabase_url, signed_path))
}
