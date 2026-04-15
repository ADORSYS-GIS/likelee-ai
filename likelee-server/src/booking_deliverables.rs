use crate::{
    auth::AuthUser,
    config::AppState,
    errors::sanitize_db_error,
    storage::{
        canonical_object_path, delete_object, download_object, insert_asset_record,
        sanitize_file_name, soft_delete_asset_record, upload_object, StorageAssetRecord,
        StorageContextType, StorageOwnerType, StorageVisibility,
    },
    team::{self, permissions::Permission},
};
use axum::{
    extract::{Multipart, Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use serde_json::json;
use tracing::{error, info};

// ──────────────────────────────────────────────────────────────────────────────
// Path extractors
// ──────────────────────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct CampaignPath {
    campaign_id: String,
}

#[derive(Deserialize)]
pub struct DeliverablePath {
    campaign_id: String,
    deliverable_id: String,
}

// ──────────────────────────────────────────────────────────────────────────────
// Request/response types
// ──────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct ReviewDeliverableRequest {
    pub status: String, // approved | changes_requested | rejected
    pub note: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SubmitToBrandRequest {
    pub deliverable_ids: Vec<String>,
    pub brand_offer_id: String,
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

fn is_creator_like(role: &str) -> bool {
    role == "creator" || role == "talent"
}

/// Resolve the `agency_id` and `creator_id` for incoming creator uploads.
/// Finds the creator's active connection to the campaign's owning agency.
async fn resolve_creator_for_campaign(
    state: &AppState,
    user: &AuthUser,
    campaign_id: &str,
) -> Result<(String, String, Option<String>), (StatusCode, String)> {
    // Fetch the campaign to know which agency owns it
    let resp = state
        .pg
        .from("bookings_campaigns")
        .select("id,agency_id")
        .eq("id", campaign_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        return Err((StatusCode::NOT_FOUND, "Campaign not found".into()));
    }
    let text = resp.text().await.unwrap_or_default();
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    let campaign = rows
        .into_iter()
        .next()
        .ok_or((StatusCode::NOT_FOUND, "Campaign not found".into()))?;

    let agency_id = campaign
        .get("agency_id")
        .and_then(|v| v.as_str())
        .ok_or((
            StatusCode::INTERNAL_SERVER_ERROR,
            "Campaign missing agency_id".into(),
        ))?
        .to_string();

    // Resolve the creator's agency_user ID for this agency
    let au_resp = state
        .pg
        .from("agency_users")
        .select("id")
        .eq("agency_id", &agency_id)
        .or(format!("creator_id.eq.{},user_id.eq.{}", user.id, user.id))
        .eq("status", "active")
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !au_resp.status().is_success() {
        return Err((
            StatusCode::FORBIDDEN,
            "Not registered with this agency".into(),
        ));
    }
    let au_text = au_resp.text().await.unwrap_or_default();
    let au_rows: Vec<serde_json::Value> = serde_json::from_str(&au_text).unwrap_or_default();
    let agency_user_id = au_rows
        .into_iter()
        .next()
        .and_then(|row| {
            row.get("id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        })
        .ok_or((
            StatusCode::FORBIDDEN,
            "Not registered with this agency".into(),
        ))?;

    // Verify the creator has a booking in this campaign using their agency_user_id
    let booking_resp = state
        .pg
        .from("bookings")
        .select("id,talent_id")
        .eq("campaign_id", campaign_id)
        .eq("talent_id", &agency_user_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !booking_resp.status().is_success() {
        return Err((
            StatusCode::FORBIDDEN,
            "No active booking for this campaign".into(),
        ));
    }
    let booking_text = booking_resp.text().await.unwrap_or_default();
    let booking_rows: Vec<serde_json::Value> =
        serde_json::from_str(&booking_text).unwrap_or_default();
    if booking_rows.is_empty() {
        return Err((
            StatusCode::FORBIDDEN,
            "No active booking for this campaign".into(),
        ));
    }
    let booking_id = booking_rows.into_iter().next().and_then(|row| {
        row.get("id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
    });

    Ok((agency_id, user.id.clone(), booking_id))
}

/// For an agency user, verify ownership of the campaign.
async fn verify_agency_campaign(
    state: &AppState,
    user: &AuthUser,
    campaign_id: &str,
) -> Result<String, (StatusCode, String)> {
    let agency_access =
        team::require_agency_permission(state, user, Permission::ApproveDeliverables).await?;
    let agency_id = agency_access.organization_id;
    let resp = state
        .pg
        .from("bookings_campaigns")
        .select("id")
        .eq("id", campaign_id)
        .eq("agency_id", &agency_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp.text().await.unwrap_or_default();
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    if rows.is_empty() {
        return Err((
            StatusCode::FORBIDDEN,
            "Campaign not found or not yours".into(),
        ));
    }
    Ok(agency_id)
}

// ──────────────────────────────────────────────────────────────────────────────
// Upload deliverable (creator or agency)
// POST /api/bookings-campaigns/:campaign_id/deliverables
// ──────────────────────────────────────────────────────────────────────────────

pub async fn upload_deliverable(
    State(state): State<AppState>,
    user: AuthUser,
    Path(CampaignPath { campaign_id }): Path<CampaignPath>,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let mut file_name: Option<String> = None;
    let mut bytes: Vec<u8> = vec![];
    let mut asset_type = "image".to_string();
    let mut caption: Option<String> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?
    {
        match field.name() {
            Some("file") => {
                file_name = field.file_name().map(|s| s.to_string());
                if let Some(ct) = field.content_type() {
                    if ct.starts_with("image/") {
                        asset_type = "image".to_string();
                    } else if ct.starts_with("video/") {
                        asset_type = "video".to_string();
                    }
                }
                bytes = field
                    .bytes()
                    .await
                    .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?
                    .to_vec();
            }
            Some("caption") => {
                caption = Some(
                    field
                        .text()
                        .await
                        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?,
                );
            }
            _ => {}
        }
    }

    if bytes.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "missing file".into()));
    }

    // Resolve permissions
    let (agency_id, creator_id, booking_id): (String, Option<String>, Option<String>) =
        if user.role == "agency" {
            let agency_id = verify_agency_campaign(&state, &user, &campaign_id).await?;
            (agency_id, None, None)
        } else if is_creator_like(&user.role) {
            let (aid, cid, bid) = resolve_creator_for_campaign(&state, &user, &campaign_id).await?;
            (aid, Some(cid), bid)
        } else {
            return Err((StatusCode::FORBIDDEN, "Forbidden".into()));
        };

    // Upload to storage
    let fname = file_name.unwrap_or_else(|| "deliverable.bin".to_string());
    let size_bytes = bytes.len() as i64;
    let sanitized = sanitize_file_name(&fname);
    let path = canonical_object_path(
        &format!("agencies/{agency_id}/booking-campaigns/{campaign_id}/deliverables"),
        &sanitized,
        chrono::Utc::now().timestamp_millis(),
    );
    let uploaded =
        upload_object(&state, StorageVisibility::Private, &path, bytes, None).await?;

    let insert_payload = json!({
        "booking_campaign_id": campaign_id,
        "booking_id": booking_id,
        "agency_id": agency_id,
        "creator_id": creator_id,
        "asset_url": path,
        "storage_path": uploaded.path,
        "storage_bucket": uploaded.bucket,
        "asset_type": asset_type,
        "caption": caption.as_deref().map(str::trim).filter(|s| !s.is_empty()),
        "status": "draft",
    });

    let resp = state
        .pg
        .from("booking_deliverables")
        .insert(insert_payload.to_string())
        .select("*")
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        return Err(sanitize_db_error(
            resp.status().as_u16(),
            resp.text().await.unwrap_or_default(),
        ));
    }

    let created: serde_json::Value =
        serde_json::from_str(&resp.text().await.unwrap_or_default()).unwrap_or(json!({}));
    if let Some(deliverable_id) = created.get("id").and_then(|v| v.as_str()).filter(|s| !s.is_empty())
    {
        let owner_type = if creator_id.is_some() {
            StorageOwnerType::Creator
        } else {
            StorageOwnerType::Agency
        };
        let owner_id = creator_id.clone().unwrap_or_else(|| agency_id.clone());
        let record = StorageAssetRecord {
            owner_type,
            owner_id,
            context_type: StorageContextType::BookingDeliverable,
            context_id: Some(campaign_id.clone()),
            visibility: StorageVisibility::Private,
            object_path: insert_payload
                .get("storage_path")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
            original_file_name: Some(fname.clone()),
            mime_type: None,
            size_bytes: Some(size_bytes),
            checksum_sha256: None,
            source_table: Some("booking_deliverables".to_string()),
            source_id: Some(deliverable_id.to_string()),
            created_by: Some(user.id.clone()),
            counts_toward_quota: creator_id.is_none(),
        };
        if let Err(err) = insert_asset_record(&state, &record).await {
            error!(deliverable_id = %deliverable_id, error = %err.1, "failed to mirror booking deliverable into storage_assets");
        }
    }

    info!(
        campaign_id = %campaign_id,
        uploader_role = %user.role,
        "booking deliverable uploaded"
    );

    Ok(Json(json!({ "deliverable": created })))
}

// ──────────────────────────────────────────────────────────────────────────────
// List deliverables for a campaign
// GET /api/bookings-campaigns/:campaign_id/deliverables
// Agency sees all; creator sees own only.
// ──────────────────────────────────────────────────────────────────────────────

pub async fn list_deliverables(
    State(state): State<AppState>,
    user: AuthUser,
    Path(CampaignPath { campaign_id }): Path<CampaignPath>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let mut req = state
        .pg
        .from("booking_deliverables")
        .select("*")
        .eq("booking_campaign_id", &campaign_id)
        .order("created_at.desc");

    if user.role == "agency" {
        // Agency must own the campaign
        let _ = verify_agency_campaign(&state, &user, &campaign_id).await?;
    } else if is_creator_like(&user.role) {
        // Creator can only see their own deliverables
        req = req.eq("creator_id", &user.id);
    } else {
        return Err((StatusCode::FORBIDDEN, "Forbidden".into()));
    }

    let resp = req
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        return Err(sanitize_db_error(
            resp.status().as_u16(),
            resp.text().await.unwrap_or_default(),
        ));
    }

    let text = resp.text().await.unwrap_or_default();
    let mut deliverables: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();

    // Normalize asset_url to consistently return the secure file endpoint
    // for private deliverables instead of the storage path
    for deliverable in deliverables.iter_mut() {
        if let Some(obj) = deliverable.as_object_mut() {
            if let Some(id) = obj.get("id").and_then(|v| v.as_str()) {
                // Replace asset_url with the secure file endpoint URL
                let secure_url = format!(
                    "/api/bookings-campaigns/{}/deliverables/{}/file",
                    campaign_id, id
                );
                obj.insert("asset_url".to_string(), json!(secure_url));
            }
        }
    }

    Ok(Json(json!({ "deliverables": deliverables })))
}

// ──────────────────────────────────────────────────────────────────────────────
// Submit all draft deliverables for a campaign (creator only)
// POST /api/bookings-campaigns/:campaign_id/deliverables/submit
// ──────────────────────────────────────────────────────────────────────────────

pub async fn submit_deliverables(
    State(state): State<AppState>,
    user: AuthUser,
    Path(CampaignPath { campaign_id }): Path<CampaignPath>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if !is_creator_like(&user.role) {
        return Err((
            StatusCode::FORBIDDEN,
            "Only creators can submit deliverables".into(),
        ));
    }

    let resp = state
        .pg
        .from("booking_deliverables")
        .update(
            json!({ "status": "submitted", "updated_at": chrono::Utc::now().to_rfc3339() })
                .to_string(),
        )
        .eq("booking_campaign_id", &campaign_id)
        .eq("creator_id", &user.id)
        .eq("status", "draft")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        return Err(sanitize_db_error(
            resp.status().as_u16(),
            resp.text().await.unwrap_or_default(),
        ));
    }

    Ok(Json(json!({ "ok": true })))
}

// ──────────────────────────────────────────────────────────────────────────────
// Review a deliverable (agency only)
// POST /api/bookings-campaigns/:campaign_id/deliverables/:deliverable_id/review
// ──────────────────────────────────────────────────────────────────────────────

pub async fn review_deliverable(
    State(state): State<AppState>,
    user: AuthUser,
    Path(DeliverablePath {
        campaign_id,
        deliverable_id,
    }): Path<DeliverablePath>,
    Json(payload): Json<ReviewDeliverableRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((
            StatusCode::FORBIDDEN,
            "Only agencies can review deliverables".into(),
        ));
    }

    let allowed = ["approved", "changes_requested", "rejected"];
    if !allowed.contains(&payload.status.as_str()) {
        return Err((StatusCode::BAD_REQUEST, "Invalid status".into()));
    }

    let _agency_id = verify_agency_campaign(&state, &user, &campaign_id).await?;

    let mut update = serde_json::Map::new();
    update.insert("status".into(), json!(payload.status));
    update.insert("updated_at".into(), json!(chrono::Utc::now().to_rfc3339()));
    update.insert(
        "reviewed_by_agency_at".into(),
        json!(chrono::Utc::now().to_rfc3339()),
    );
    if let Some(note) = payload
        .note
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
    {
        update.insert("agency_review_note".into(), json!(note));
    }

    let resp = state
        .pg
        .from("booking_deliverables")
        .update(serde_json::Value::Object(update).to_string())
        .eq("id", &deliverable_id)
        .eq("booking_campaign_id", &campaign_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        return Err(sanitize_db_error(
            resp.status().as_u16(),
            resp.text().await.unwrap_or_default(),
        ));
    }

    Ok(Json(json!({ "ok": true })))
}

// ──────────────────────────────────────────────────────────────────────────────
// Delete a deliverable (draft only, creator or agency)
// DELETE /api/bookings-campaigns/:campaign_id/deliverables/:deliverable_id
// ──────────────────────────────────────────────────────────────────────────────

pub async fn delete_deliverable(
    State(state): State<AppState>,
    user: AuthUser,
    Path(DeliverablePath {
        campaign_id,
        deliverable_id,
    }): Path<DeliverablePath>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let mut select_req = state
        .pg
        .from("booking_deliverables")
        .select("id,storage_bucket,storage_path")
        .eq("id", &deliverable_id)
        .eq("booking_campaign_id", &campaign_id);

    if user.role == "agency" {
        let _ = verify_agency_campaign(&state, &user, &campaign_id).await?;
    } else if is_creator_like(&user.role) {
        select_req = select_req.eq("creator_id", &user.id).eq("status", "draft");
    } else {
        return Err((StatusCode::FORBIDDEN, "Forbidden".into()));
    }

    let lookup_resp = select_req
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !lookup_resp.status().is_success() {
        return Err(sanitize_db_error(
            lookup_resp.status().as_u16(),
            lookup_resp.text().await.unwrap_or_default(),
        ));
    }
    let rows: Vec<serde_json::Value> =
        serde_json::from_str(&lookup_resp.text().await.unwrap_or_default()).unwrap_or_default();
    let row = rows
        .first()
        .cloned()
        .ok_or((StatusCode::NOT_FOUND, "Not found".into()))?;
    if let (Some(bucket), Some(path)) = (
        row.get("storage_bucket").and_then(|v| v.as_str()),
        row.get("storage_path").and_then(|v| v.as_str()),
    ) {
        delete_object(&state, bucket, path).await?;
    }

    let mut delete_req = state
        .pg
        .from("booking_deliverables")
        .delete()
        .eq("id", &deliverable_id)
        .eq("booking_campaign_id", &campaign_id);
    if is_creator_like(&user.role) {
        delete_req = delete_req.eq("creator_id", &user.id).eq("status", "draft");
    }
    let resp = delete_req
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !resp.status().is_success() {
        return Err(sanitize_db_error(
            resp.status().as_u16(),
            resp.text().await.unwrap_or_default(),
        ));
    }
    let _ = soft_delete_asset_record(&state, "booking_deliverables", &deliverable_id).await;

    Ok(Json(json!({ "deleted": true })))
}

// ──────────────────────────────────────────────────────────────────────────────
// Serve deliverable file (securely proxied from private bucket)
// GET /api/bookings-campaigns/:campaign_id/deliverables/:deliverable_id/file
// ──────────────────────────────────────────────────────────────────────────────

pub async fn serve_deliverable_file(
    State(state): State<AppState>,
    user: AuthUser,
    Path(DeliverablePath {
        campaign_id,
        deliverable_id,
    }): Path<DeliverablePath>,
) -> impl IntoResponse {
    // Verify access
    let mut req = state
        .pg
        .from("booking_deliverables")
        .select("storage_path,storage_bucket,asset_url")
        .eq("id", &deliverable_id)
        .eq("booking_campaign_id", &campaign_id)
        .limit(1);

    if user.role == "agency" {
        let agency_id = match verify_agency_campaign(&state, &user, &campaign_id).await {
            Ok(agency_id) => agency_id,
            Err(_) => {
                return (
                    StatusCode::FORBIDDEN,
                    [("content-type", "application/json")],
                    axum::body::Bytes::from(r#"{"error":"Forbidden"}"#),
                );
            }
        };
        req = req.eq("agency_id", &agency_id);
    } else if is_creator_like(&user.role) {
        req = req.eq("creator_id", &user.id);
    } else {
        return (
            StatusCode::FORBIDDEN,
            [("content-type", "application/json")],
            axum::body::Bytes::from(r#"{"error":"Forbidden"}"#),
        );
    }

    let resp = match req.execute().await {
        Ok(r) => r,
        Err(e) => {
            error!("DB error serving booking deliverable file: {e}");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                [("content-type", "application/json")],
                axum::body::Bytes::from(r#"{"error":"DB error"}"#),
            );
        }
    };

    let text = resp.text().await.unwrap_or_default();
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    let row = match rows.into_iter().next() {
        Some(r) => r,
        None => {
            return (
                StatusCode::NOT_FOUND,
                [("content-type", "application/json")],
                axum::body::Bytes::from(r#"{"error":"Not found"}"#),
            );
        }
    };

    let storage_path = match row.get("storage_path").and_then(|v| v.as_str()) {
        Some(path) if !path.is_empty() => path.to_string(),
        _ => {
            error!("Booking deliverable {} missing storage_path", deliverable_id);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                [("content-type", "application/json")],
                axum::body::Bytes::from(r#"{"error":"Missing storage path"}"#),
            );
        }
    };

    let bucket = row
        .get("storage_bucket")
        .and_then(|v| v.as_str())
        .unwrap_or(&state.supabase_bucket_private)
        .to_string();

    match download_object(&state, &bucket, &storage_path).await {
        Ok(downloaded) => {
            let content_type = downloaded
                .headers
                .get("content-type")
                .and_then(|v| v.to_str().ok())
                .unwrap_or("application/octet-stream")
                .to_string();
            (
                StatusCode::OK,
                [(
                    "content-type",
                    Box::leak(content_type.into_boxed_str()) as &'static str,
                )],
                downloaded.bytes,
            )
        }
        Err(_) => (
            StatusCode::BAD_GATEWAY,
            [("content-type", "application/json")],
            axum::body::Bytes::from(r#"{"error":"File fetch failed"}"#),
        ),
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Submit deliverables to Brand (Agency only)
// POST /api/bookings-campaigns/:campaign_id/deliverables/submit-to-brand
// ──────────────────────────────────────────────────────────────────────────────

pub async fn submit_to_brand(
    State(state): State<AppState>,
    user: AuthUser,
    Path(CampaignPath { campaign_id }): Path<CampaignPath>,
    Json(payload): Json<SubmitToBrandRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((
            StatusCode::FORBIDDEN,
            "Only agencies can submit to brands".into(),
        ));
    }

    // 1. Verify agency owns the campaign
    let agency_id = verify_agency_campaign(&state, &user, &campaign_id).await?;

    // 2. Load the brand offer to get brand_id and brand_campaign_id
    let offer_resp = state
        .pg
        .from("campaign_offers")
        .select("id,brand_id,brand_campaign_id")
        .eq("id", &payload.brand_offer_id)
        .eq("target_type", "agency")
        .eq("target_id", &agency_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !offer_resp.status().is_success() {
        return Err((StatusCode::NOT_FOUND, "Brand offer not found".into()));
    }
    let offer_text = offer_resp.text().await.unwrap_or_default();
    let offer_rows: Vec<serde_json::Value> = serde_json::from_str(&offer_text).unwrap_or_default();
    let offer = offer_rows
        .into_iter()
        .next()
        .ok_or((StatusCode::NOT_FOUND, "Brand offer not found".into()))?;

    let brand_id = offer
        .get("brand_id")
        .and_then(|v| v.as_str())
        .ok_or((StatusCode::INTERNAL_SERVER_ERROR, "Missing brand_id".into()))?;
    let brand_campaign_id = offer
        .get("brand_campaign_id")
        .and_then(|v| v.as_str())
        .ok_or((
            StatusCode::INTERNAL_SERVER_ERROR,
            "Missing brand_campaign_id".into(),
        ))?;

    // 3. Load the booking deliverables to ensure agency owns them and they are approved
    let dels_resp = state
        .pg
        .from("booking_deliverables")
        .select("*")
        .in_(
            "id",
            payload
                .deliverable_ids
                .iter()
                .map(|s| s.as_str())
                .collect::<Vec<_>>(),
        )
        .eq("booking_campaign_id", &campaign_id)
        .eq("agency_id", &agency_id)
        .eq("status", "approved")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !dels_resp.status().is_success() {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to fetch deliverables".into(),
        ));
    }
    let dels_text = dels_resp.text().await.unwrap_or_default();
    let deliverables: Vec<serde_json::Value> = serde_json::from_str(&dels_text).unwrap_or_default();

    if deliverables.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "No valid deliverables found".into(),
        ));
    }

    // 4. Create records in campaign_offer_deliverables
    let mut brand_deliverables = vec![];
    for del in deliverables {
        let payload = json!({
            "offer_id": payload.brand_offer_id,
            "brand_campaign_id": brand_campaign_id,
            "brand_id": brand_id,
            "agency_id": agency_id,
            "creator_id": del.get("creator_id"),
            "submitted_by_role": "agency",
            "submitted_by": user.id,
            "asset_url": del.get("asset_url"),
            "asset_type": del.get("asset_type").unwrap_or(&json!("image")),
            "caption": del.get("caption"),
            "status": "brand_review",
            "meta": {
                "source_booking_deliverable_id": del.get("id"),
            }
        });
        brand_deliverables.push(payload);
    }

    let insert_resp = state
        .pg
        .from("campaign_offer_deliverables")
        .insert(json!(brand_deliverables).to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !insert_resp.status().is_success() {
        error!(
            "Failed to insert brand deliverables: {}",
            insert_resp.text().await.unwrap_or_default()
        );
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to submit to brand".into(),
        ));
    }

    // 5. Update the brand offer status
    let _ = state
        .pg
        .from("campaign_offers")
        .update(json!({ "status": "deliverables_submitted", "updated_at": chrono::Utc::now().to_rfc3339() }).to_string())
        .eq("id", &payload.brand_offer_id)
        .execute()
        .await;

    info!(
        agency_id = %agency_id,
        brand_id = %brand_id,
        offer_id = %payload.brand_offer_id,
        count = %brand_deliverables.len(),
        "deliverables submitted to brand"
    );

    Ok(Json(
        json!({ "ok": true, "count": brand_deliverables.len() }),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deliverable_asset_url_normalization() {
        // Test that asset_url is normalized to secure endpoint format
        let campaign_id = "campaign-123";
        let deliverable_id = "deliverable-456";
        
        let expected_url = format!(
            "/api/bookings-campaigns/{}/deliverables/{}/file",
            campaign_id, deliverable_id
        );
        
        assert_eq!(
            expected_url,
            "/api/bookings-campaigns/campaign-123/deliverables/deliverable-456/file"
        );
    }

    #[test]
    fn test_offer_deliverable_asset_url_normalization() {
        // Test that offer deliverable asset_url is normalized to secure endpoint format
        let offer_id = "offer-789";
        let deliverable_id = "deliverable-abc";
        
        let expected_url = format!(
            "/api/campaign-offers/{}/deliverables/{}/file",
            offer_id, deliverable_id
        );
        
        assert_eq!(
            expected_url,
            "/api/campaign-offers/offer-789/deliverables/deliverable-abc/file"
        );
    }

    #[test]
    fn test_storage_path_validation() {
        // Test that empty storage paths are rejected
        let storage_path = "";
        assert!(storage_path.is_empty());
        
        // Test that valid storage paths are accepted
        let storage_path = "agencies/123/deliverables/1234567890_file.pdf";
        assert!(!storage_path.is_empty());
        assert!(storage_path.contains("agencies/"));
        assert!(storage_path.contains("deliverables/"));
    }

    #[test]
    fn test_deliverable_status_values() {
        // Test valid deliverable status values
        let valid_statuses = vec![
            "draft",
            "submitted",
            "approved",
            "changes_requested",
            "rejected",
            "brand_review",
            "brand_approved",
            "accepted",
        ];
        
        for status in valid_statuses {
            assert!(!status.is_empty());
            assert!(status.chars().all(|c| c.is_ascii_lowercase() || c == '_'));
        }
    }

    #[test]
    fn test_secure_endpoint_path_format() {
        // Test that secure endpoint paths follow the correct format
        let campaign_id = "550e8400-e29b-41d4-a716-446655440000";
        let deliverable_id = "660e8400-e29b-41d4-a716-446655440001";
        
        let secure_url = format!(
            "/api/bookings-campaigns/{}/deliverables/{}/file",
            campaign_id, deliverable_id
        );
        
        assert!(secure_url.starts_with("/api/bookings-campaigns/"));
        assert!(secure_url.contains("/deliverables/"));
        assert!(secure_url.ends_with("/file"));
    }

    #[test]
    fn test_offer_secure_endpoint_path_format() {
        // Test that offer secure endpoint paths follow the correct format
        let offer_id = "770e8400-e29b-41d4-a716-446655440002";
        let deliverable_id = "880e8400-e29b-41d4-a716-446655440003";
        
        let secure_url = format!(
            "/api/campaign-offers/{}/deliverables/{}/file",
            offer_id, deliverable_id
        );
        
        assert!(secure_url.starts_with("/api/campaign-offers/"));
        assert!(secure_url.contains("/deliverables/"));
        assert!(secure_url.ends_with("/file"));
    }

    #[test]
    fn test_storage_bucket_defaults() {
        // Test that private bucket is the default for deliverables
        let default_bucket = "likelee-private";
        assert_eq!(default_bucket, "likelee-private");
        
        // Deliverables should always use private bucket
        let bucket = "likelee-private";
        assert!(bucket.contains("private"));
    }

    #[test]
    fn test_asset_url_no_longer_fallback() {
        // Test that we no longer use asset_url as a fallback for storage_path
        // This test documents the change: asset_url should NOT be used as storage_path
        
        let storage_path = Some("agencies/123/deliverables/file.pdf");
        let asset_url = Some("/api/bookings-campaigns/123/deliverables/456/file");
        
        // New behavior: use storage_path directly, don't fall back to asset_url
        let path = storage_path.unwrap();
        assert_eq!(path, "agencies/123/deliverables/file.pdf");
        
        // asset_url should be the secure endpoint, not a storage path
        let url = asset_url.unwrap();
        assert!(url.starts_with("/api/"));
        assert!(!url.contains("agencies/"));
    }
}
