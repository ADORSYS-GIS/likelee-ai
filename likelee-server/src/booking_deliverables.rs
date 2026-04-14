use crate::{
    auth::AuthUser,
    config::AppState,
    errors::sanitize_db_error,
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
    let sanitized: String = fname
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '.' || c == '_' || c == '-' {
                c
            } else {
                '_'
            }
        })
        .collect();

    let bucket = state.supabase_bucket_private.clone();
    let path = format!(
        "campaigns/booking-deliverables/{}/{}_{sanitized}",
        campaign_id,
        chrono::Utc::now().timestamp_millis(),
    );

    let storage_url = format!(
        "{}/storage/v1/object/{}/{}",
        state.supabase_url, bucket, path
    );
    let http = reqwest::Client::new();
    let up = http
        .post(&storage_url)
        .header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        )
        .header("apikey", state.supabase_service_key.clone())
        .body(bytes)
        .send()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    if !up.status().is_success() {
        let msg = up.text().await.unwrap_or_default();
        return Err((
            StatusCode::BAD_GATEWAY,
            format!("storage upload failed: {msg}"),
        ));
    }

    let insert_payload = json!({
        "booking_campaign_id": campaign_id,
        "booking_id": booking_id,
        "agency_id": agency_id,
        "creator_id": creator_id,
        "asset_url": path,
        "storage_path": path,
        "storage_bucket": bucket,
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
    let deliverables: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();

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
    let mut req = state
        .pg
        .from("booking_deliverables")
        .delete()
        .eq("id", &deliverable_id)
        .eq("booking_campaign_id", &campaign_id);

    if user.role == "agency" {
        let _ = verify_agency_campaign(&state, &user, &campaign_id).await?;
    } else if is_creator_like(&user.role) {
        req = req.eq("creator_id", &user.id).eq("status", "draft");
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

    let storage_path = row
        .get("storage_path")
        .or_else(|| row.get("asset_url"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let bucket = row
        .get("storage_bucket")
        .and_then(|v| v.as_str())
        .unwrap_or(&state.supabase_bucket_private)
        .to_string();

    let file_url = format!(
        "{}/storage/v1/object/{}/{}",
        state.supabase_url, bucket, storage_path
    );

    let http = reqwest::Client::new();
    match http
        .get(&file_url)
        .header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        )
        .header("apikey", state.supabase_service_key.clone())
        .send()
        .await
    {
        Ok(upstream) if upstream.status().is_success() => {
            let content_type = upstream
                .headers()
                .get("content-type")
                .and_then(|v| v.to_str().ok())
                .unwrap_or("application/octet-stream")
                .to_string();
            let body = upstream.bytes().await.unwrap_or_default();
            (
                StatusCode::OK,
                [(
                    "content-type",
                    Box::leak(content_type.into_boxed_str()) as &'static str,
                )],
                body,
            )
        }
        _ => (
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
