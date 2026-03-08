use crate::{auth::AuthUser, config::AppState, errors::sanitize_db_error};
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
) -> Result<(String, String), (StatusCode, String)> {
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
        .ok_or((StatusCode::INTERNAL_SERVER_ERROR, "Campaign missing agency_id".into()))?
        .to_string();

    // Verify the creator has a booking in this campaign
    let booking_resp = state
        .pg
        .from("bookings")
        .select("id,talent_id")
        .eq("campaign_id", campaign_id)
        .eq("talent_id", &user.id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !booking_resp.status().is_success() {
        return Err((StatusCode::FORBIDDEN, "No active booking for this campaign".into()));
    }
    let booking_text = booking_resp.text().await.unwrap_or_default();
    let booking_rows: Vec<serde_json::Value> = serde_json::from_str(&booking_text).unwrap_or_default();
    if booking_rows.is_empty() {
        return Err((StatusCode::FORBIDDEN, "No active booking for this campaign".into()));
    }

    Ok((agency_id, user.id.clone()))
}

/// For an agency user, verify ownership of the campaign.
async fn verify_agency_campaign(
    state: &AppState,
    user: &AuthUser,
    campaign_id: &str,
) -> Result<(), (StatusCode, String)> {
    let resp = state
        .pg
        .from("bookings_campaigns")
        .select("id")
        .eq("id", campaign_id)
        .eq("agency_id", &user.id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp.text().await.unwrap_or_default();
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    if rows.is_empty() {
        return Err((StatusCode::FORBIDDEN, "Campaign not found or not yours".into()));
    }
    Ok(())
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
            verify_agency_campaign(&state, &user, &campaign_id).await?;
            (user.id.clone(), None, None)
        } else if is_creator_like(&user.role) {
            let (aid, cid) = resolve_creator_for_campaign(&state, &user, &campaign_id).await?;
            // Get the booking id for reference
            let booking_resp = state
                .pg
                .from("bookings")
                .select("id")
                .eq("campaign_id", &campaign_id)
                .eq("talent_id", &user.id)
                .limit(1)
                .execute()
                .await
                .ok();
            let bid = match booking_resp {
                Some(r) => match r.text().await {
                    Ok(t) => {
                        let rows: Vec<serde_json::Value> = serde_json::from_str(&t).unwrap_or_default();
                        rows.into_iter()
                            .next()
                            .and_then(|row| row.get("id").and_then(|v| v.as_str()).map(|s| s.to_string()))
                    }
                    Err(_) => None,
                },
                None => None,
            };
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
        .header("Authorization", format!("Bearer {}", state.supabase_service_key))
        .header("apikey", state.supabase_service_key.clone())
        .body(bytes)
        .send()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    if !up.status().is_success() {
        let msg = up.text().await.unwrap_or_default();
        return Err((StatusCode::BAD_GATEWAY, format!("storage upload failed: {msg}")));
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

    let created: serde_json::Value = serde_json::from_str(
        &resp.text().await.unwrap_or_default(),
    )
    .unwrap_or(json!({}));

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
        verify_agency_campaign(&state, &user, &campaign_id).await?;
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
    let deliverables: Vec<serde_json::Value> =
        serde_json::from_str(&text).unwrap_or_default();

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
        return Err((StatusCode::FORBIDDEN, "Only creators can submit deliverables".into()));
    }

    let resp = state
        .pg
        .from("booking_deliverables")
        .update(json!({ "status": "submitted", "updated_at": chrono::Utc::now().to_rfc3339() }).to_string())
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
    Path(DeliverablePath { campaign_id, deliverable_id }): Path<DeliverablePath>,
    Json(payload): Json<ReviewDeliverableRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Only agencies can review deliverables".into()));
    }

    let allowed = ["approved", "changes_requested", "rejected"];
    if !allowed.contains(&payload.status.as_str()) {
        return Err((StatusCode::BAD_REQUEST, "Invalid status".into()));
    }

    verify_agency_campaign(&state, &user, &campaign_id).await?;

    let mut update = serde_json::Map::new();
    update.insert("status".into(), json!(payload.status));
    update.insert("updated_at".into(), json!(chrono::Utc::now().to_rfc3339()));
    update.insert("reviewed_by_agency_at".into(), json!(chrono::Utc::now().to_rfc3339()));
    if let Some(note) = payload.note.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
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
    Path(DeliverablePath { campaign_id, deliverable_id }): Path<DeliverablePath>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let mut req = state
        .pg
        .from("booking_deliverables")
        .delete()
        .eq("id", &deliverable_id)
        .eq("booking_campaign_id", &campaign_id);

    if user.role == "agency" {
        verify_agency_campaign(&state, &user, &campaign_id).await?;
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
    Path(DeliverablePath { campaign_id, deliverable_id }): Path<DeliverablePath>,
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
        req = req.eq("agency_id", &user.id);
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
        .header("Authorization", format!("Bearer {}", state.supabase_service_key))
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
                [("content-type", Box::leak(content_type.into_boxed_str()) as &'static str)],
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
