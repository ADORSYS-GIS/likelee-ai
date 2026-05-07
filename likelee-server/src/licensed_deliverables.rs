use crate::auth::AuthUser;
use crate::config::AppState;
use crate::storage::{
    insert_asset_record, soft_delete_asset_record, StorageAssetRecord, StorageContextType,
    StorageOwnerType, StorageVisibility,
};
use crate::team::require_brand_access;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use serde_json::json;
use tracing::{info, warn};

/// Generate licensed deliverables for a single talent
async fn generate_for_talent(
    state: &AppState,
    brand_id: &str,
    license_request_id: &str,
    talent_id: &str,
    campaign_title: &str,
) -> i32 {
    let mut created_count = 0;

    // Get talent info
    let talent_resp = state
        .pg
        .from("agency_users")
        .select("id,full_legal_name,stage_name,profile_photo_url")
        .eq("id", talent_id)
        .single()
        .execute()
        .await;

    let talent: serde_json::Value = match talent_resp {
        Ok(resp) => {
            if let Ok(text) = resp.text().await {
                serde_json::from_str(&text).unwrap_or_else(|_| json!({}))
            } else {
                json!({})
            }
        }
        Err(_) => json!({}),
    };

    let talent_name = talent
        .get("stage_name")
        .and_then(|v| v.as_str())
        .or_else(|| talent.get("full_legal_name").and_then(|v| v.as_str()))
        .unwrap_or("Talent")
        .to_string();

    // 1. Profile photo
    if let Some(avatar_url) = talent.get("profile_photo_url").and_then(|v| v.as_str()) {
        let deliverable_id = uuid::Uuid::new_v4().to_string();
        let insert_result = state
            .pg
            .from("brand_licensed_deliverables")
            .insert(
                json!({
                    "id": &deliverable_id,
                    "brand_id": brand_id,
                    "license_request_id": license_request_id,
                    "talent_id": talent_id,
                    "asset_type": "profile_photo",
                    "asset_name": format!("{} – Profile Photo", talent_name),
                    "asset_url": avatar_url,
                    "source_table": "agency_users",
                    "source_id": talent_id,
                    "mime_type": "image/jpeg",
                    "talent_name": &talent_name,
                    "campaign_title": campaign_title,
                })
                .to_string(),
            )
            .execute()
            .await;

        if let Ok(resp) = insert_result {
            if resp.status().is_success() {
                let record = StorageAssetRecord {
                    owner_type: StorageOwnerType::Brand,
                    owner_id: brand_id.to_string(),
                    context_type: StorageContextType::LicensedDeliverable,
                    context_id: Some(deliverable_id.clone()),
                    visibility: StorageVisibility::Public,
                    object_path: format!("licensed-deliverables/{}/{}", brand_id, deliverable_id),
                    original_file_name: Some(format!("{}-profile-photo.jpg", talent_name)),
                    mime_type: Some("image/jpeg".to_string()),
                    size_bytes: None,
                    checksum_sha256: None,
                    source_table: Some("brand_licensed_deliverables".to_string()),
                    source_id: Some(deliverable_id.clone()),
                    created_by: None,
                    counts_toward_quota: false,
                };
                if let Err(e) = insert_asset_record(state, &record).await {
                    warn!(
                        brand_id = %brand_id,
                        deliverable_id = %deliverable_id,
                        error = %e.1,
                        "failed to mirror profile photo into storage_assets"
                    );
                }
                created_count += 1;
            }
        }
    }

    // 2. Voice recordings
    let vr_resp = state
        .pg
        .from("voice_recordings")
        .select("id,file_name,storage_bucket,storage_path,mime_type,size_bytes")
        .eq("user_id", talent_id)
        .eq("accessible", "true")
        .execute()
        .await;

    if let Ok(vr_resp) = vr_resp {
        let vr_text = vr_resp.text().await.unwrap_or_else(|_| "[]".into());
        let recordings: Vec<serde_json::Value> =
            serde_json::from_str(&vr_text).unwrap_or_default();

        for rec in recordings {
            let rec_id = rec["id"].as_str().unwrap_or("").to_string();
            let file_name = rec["file_name"].as_str().unwrap_or("voice").to_string();
            let bucket = rec["storage_bucket"].as_str().unwrap_or("likelee-private");
            let path = rec["storage_path"].as_str().unwrap_or("");
            let mime_type = rec["mime_type"].as_str().unwrap_or("audio/mpeg");
            let size_bytes = rec["size_bytes"].as_i64();

            let url = format!(
                "{}/storage/v1/object/public/{}/{}",
                state.supabase_url.trim_end_matches('/'),
                bucket,
                path
            );

            let deliverable_id = uuid::Uuid::new_v4().to_string();
            let insert_result = state
                .pg
                .from("brand_licensed_deliverables")
                .insert(
                    json!({
                        "id": &deliverable_id,
                        "brand_id": brand_id,
                        "license_request_id": license_request_id,
                        "talent_id": talent_id,
                        "asset_type": "voice_recording",
                        "asset_name": format!("{} – {}", talent_name, file_name),
                        "asset_url": &url,
                        "source_table": "voice_recordings",
                        "source_id": &rec_id,
                        "mime_type": mime_type,
                        "size_bytes": size_bytes,
                        "talent_name": &talent_name,
                        "campaign_title": campaign_title,
                    })
                    .to_string(),
                )
                .execute()
                .await;

            if let Ok(resp) = insert_result {
                if resp.status().is_success() {
                    let record = StorageAssetRecord {
                        owner_type: StorageOwnerType::Brand,
                        owner_id: brand_id.to_string(),
                        context_type: StorageContextType::LicensedDeliverable,
                        context_id: Some(deliverable_id.clone()),
                        visibility: StorageVisibility::Public,
                        object_path: format!("licensed-deliverables/{}/{}", brand_id, deliverable_id),
                        original_file_name: Some(file_name.clone()),
                        mime_type: Some(mime_type.to_string()),
                        size_bytes,
                        checksum_sha256: None,
                        source_table: Some("brand_licensed_deliverables".to_string()),
                        source_id: Some(deliverable_id.clone()),
                        created_by: None,
                        counts_toward_quota: false,
                    };
                    if let Err(e) = insert_asset_record(state, &record).await {
                        warn!(
                            brand_id = %brand_id,
                            deliverable_id = %deliverable_id,
                            error = %e.1,
                            "failed to mirror voice recording into storage_assets"
                        );
                    }
                    created_count += 1;
                }
            }
        }
    }

    // 3. Portfolio images
    let pa_resp = state
        .pg
        .from("portfolio_items")
        .select("id,title,media_url,mime_type,size_bytes")
        .eq("user_id", talent_id)
        .eq("media_type", "image")
        .limit(10)
        .execute()
        .await;

    if let Ok(pa_resp) = pa_resp {
        let pa_text = pa_resp.text().await.unwrap_or_else(|_| "[]".into());
        let items: Vec<serde_json::Value> = serde_json::from_str(&pa_text).unwrap_or_default();

        for item in items {
            let item_id = item["id"].as_str().unwrap_or("").to_string();
            let title = item["title"].as_str().unwrap_or("Portfolio Image").to_string();
            let url = item["media_url"].as_str().unwrap_or("").to_string();
            let mime_type = item["mime_type"].as_str().unwrap_or("image/jpeg");
            let size_bytes = item["size_bytes"].as_i64();

            if url.is_empty() {
                continue;
            }

            let deliverable_id = uuid::Uuid::new_v4().to_string();
            let insert_result = state
                .pg
                .from("brand_licensed_deliverables")
                .insert(
                    json!({
                        "id": &deliverable_id,
                        "brand_id": brand_id,
                        "license_request_id": license_request_id,
                        "talent_id": talent_id,
                        "asset_type": "portfolio_image",
                        "asset_name": format!("{} – {}", talent_name, title),
                        "asset_url": &url,
                        "source_table": "portfolio_items",
                        "source_id": &item_id,
                        "mime_type": mime_type,
                        "size_bytes": size_bytes,
                        "talent_name": &talent_name,
                        "campaign_title": campaign_title,
                    })
                    .to_string(),
                )
                .execute()
                .await;

            if let Ok(resp) = insert_result {
                if resp.status().is_success() {
                    let record = StorageAssetRecord {
                        owner_type: StorageOwnerType::Brand,
                        owner_id: brand_id.to_string(),
                        context_type: StorageContextType::LicensedDeliverable,
                        context_id: Some(deliverable_id.clone()),
                        visibility: StorageVisibility::Public,
                        object_path: format!("licensed-deliverables/{}/{}", brand_id, deliverable_id),
                        original_file_name: Some(format!("{}-{}.jpg", talent_name, title)),
                        mime_type: Some(mime_type.to_string()),
                        size_bytes,
                        checksum_sha256: None,
                        source_table: Some("brand_licensed_deliverables".to_string()),
                        source_id: Some(deliverable_id.clone()),
                        created_by: None,
                        counts_toward_quota: false,
                    };
                    if let Err(e) = insert_asset_record(state, &record).await {
                        warn!(
                            brand_id = %brand_id,
                            deliverable_id = %deliverable_id,
                            error = %e.1,
                            "failed to mirror portfolio image into storage_assets"
                        );
                    }
                    created_count += 1;
                }
            }
        }
    }

    created_count
}

/// Generate licensed deliverables for a license request
/// Only processes specific talent if talent_id is provided
/// For agency licenses, talents must be explicitly tracked elsewhere (e.g., talent_ids array)
pub async fn generate_licensed_deliverables(
    state: &AppState,
    brand_id: &str,
    license_request_id: &str,
    talent_id: Option<&str>,
) -> Result<i32, (axum::http::StatusCode, String)> {
    // Only proceed if we have a specific talent_id
    // Getting all talents from an agency would give assets the brand didn't pay for
    let talent_id = match talent_id {
        Some(tid) if !tid.is_empty() => tid,
        _ => {
            info!(
                brand_id = %brand_id,
                license_request_id = %license_request_id,
                "skipping deliverable generation - no specific talent_id"
            );
            return Ok(0);
        }
    };

    // Get campaign title from license request
    let lr_resp = state
        .pg
        .from("brand_license_requests")
        .select("campaign_title")
        .eq("id", license_request_id)
        .single()
        .execute()
        .await
        .ok();
    let campaign_title = if let Some(resp) = lr_resp {
        if let Ok(text) = resp.text().await {
            if let Ok(lr) = serde_json::from_str::<serde_json::Value>(&text) {
                lr.get("campaign_title")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Licensed Campaign")
                    .to_string()
            } else {
                "Licensed Campaign".to_string()
            }
        } else {
            "Licensed Campaign".to_string()
        }
    } else {
        "Licensed Campaign".to_string()
    };

    let total_created = generate_for_talent(state, brand_id, license_request_id, talent_id, &campaign_title).await;

    info!(
        brand_id = %brand_id,
        license_request_id = %license_request_id,
        talent_id = %talent_id,
        total_created = total_created,
        "generated_licensed_deliverables"
    );

    Ok(total_created)
}

#[derive(Deserialize)]
pub struct ListQuery {
    pub asset_type: Option<String>,
    pub search: Option<String>,
}

/// GET /api/brand/licensed-deliverables
/// List all licensed deliverables for the authenticated brand
/// Only shows deliverables from approved license requests
pub async fn list_licensed_deliverables(
    State(state): State<AppState>,
    user: AuthUser,
    query: Option<axum::extract::Query<ListQuery>>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let access = require_brand_access(&state, &user).await?;
    let brand_id = &access.organization_id;

    let mut req = state
        .pg
        .from("brand_licensed_deliverables")
        .select("id,asset_type,asset_name,asset_url,talent_name,campaign_title,mime_type,size_bytes,created_at,license_request_id,brand_license_requests(status)")
        .eq("brand_id", brand_id)
        .is("deleted_at", "null")
        .order("created_at.desc");

    if let Some(ref q) = query {
        if let Some(ref asset_type) = q.asset_type {
            if !asset_type.is_empty() {
                req = req.eq("asset_type", asset_type);
            }
        }
    }

    let resp = req
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !status.is_success() {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to fetch deliverables: {}", text),
        ));
    }

    let mut deliverables: Vec<serde_json::Value> =
        serde_json::from_str(&text).unwrap_or_default();

    // Only keep deliverables from approved license requests
    deliverables.retain(|d| {
        d.get("brand_license_requests")
            .and_then(|lr| lr.get("status"))
            .and_then(|s| s.as_str())
            .map(|s| s == "approved")
            .unwrap_or(false)
    });

    // Client-side search filter
    if let Some(ref q) = query {
        if let Some(ref search) = q.search {
            if !search.is_empty() {
                let search_lower = search.to_lowercase();
                deliverables.retain(|d| {
                    d.get("asset_name")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_lowercase().contains(&search_lower))
                        .unwrap_or(false)
                        || d.get("talent_name")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_lowercase().contains(&search_lower))
                            .unwrap_or(false)
                        || d.get("campaign_title")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_lowercase().contains(&search_lower))
                            .unwrap_or(false)
                });
            }
        }
    }

    info!(
        brand_id = %brand_id,
        count = deliverables.len(),
        "listed_licensed_deliverables"
    );

    Ok(Json(json!({ "deliverables": deliverables })))
}

/// DELETE /api/brand/licensed-deliverables/:id
/// Soft delete a licensed deliverable
pub async fn delete_licensed_deliverable(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let access = require_brand_access(&state, &user).await?;
    let brand_id = &access.organization_id;

    let now = chrono::Utc::now().to_rfc3339();
    let resp = state
        .pg
        .from("brand_licensed_deliverables")
        .update(json!({ "deleted_at": now }).to_string())
        .eq("id", &id)
        .eq("brand_id", brand_id)
        .is("deleted_at", "null")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let text = resp.text().await.unwrap_or_default();
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to delete deliverable: {}", text),
        ));
    }

    // Also soft-delete the storage_assets record
    let _ = soft_delete_asset_record(&state, "brand_licensed_deliverables", &id).await;

    info!(
        brand_id = %brand_id,
        deliverable_id = %id,
        "deleted_licensed_deliverable"
    );

    Ok(Json(json!({ "status": "ok" })))
}
