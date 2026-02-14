use crate::{auth::AuthUser, config::AppState};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Debug, Deserialize, Serialize)]
pub struct CampaignPayload {
    pub booking_id: String,
    pub name: String,
    pub status: Option<String>,
    pub duration_days: Option<i32>,
    pub start_date: Option<String>,
}

pub async fn list(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // We only list campaigns linked to bookings owned by this agency user
    let resp = state
        .pg
        .from("bookings_campaigns")
        .select("*, bookings!inner(agency_user_id, talent_name, client_name)")
        .eq("bookings.agency_user_id", &user.id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        let code =
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err(crate::errors::sanitize_db_error(code, text));
    }

    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}

pub async fn create(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<CampaignPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // Validate booking ownership
    let booking_check = state
        .pg
        .from("bookings")
        .select("id")
        .eq("id", &payload.booking_id)
        .eq("agency_user_id", &user.id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let b_status = booking_check.status();
    let check_text = booking_check.text().await.unwrap_or_default();
    if !b_status.is_success() || check_text == "[]" {
        return Err((
            StatusCode::FORBIDDEN,
            "Unauthorized booking access or booking not found".to_string(),
        ));
    }

    let row = json!({
        "booking_id": payload.booking_id,
        "name": payload.name,
        "status": payload.status.unwrap_or_else(|| "created".to_string()),
        "duration_days": payload.duration_days,
        "start_date": payload.start_date,
    });

    let resp = state
        .pg
        .from("bookings_campaigns")
        .insert(row.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        let code =
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err(crate::errors::sanitize_db_error(code, text));
    }

    let created: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    Ok(Json(created.first().cloned().unwrap_or(json!({}))))
}

#[derive(Debug, Deserialize)]
pub struct UpdateCampaignPayload {
    pub name: Option<String>,
    pub status: Option<String>,
    pub duration_days: Option<i32>,
    pub start_date: Option<String>,
}

pub async fn update(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<UpdateCampaignPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // Ensure ownership via booking
    let campaign_check = state
        .pg
        .from("bookings_campaigns")
        .select("id, booking_id, status, start_date")
        .eq("id", &id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let campaign_text = campaign_check.text().await.unwrap_or_default();
    let campaigns: Vec<serde_json::Value> =
        serde_json::from_str(&campaign_text).unwrap_or_default();
    let existing = campaigns
        .first()
        .ok_or((StatusCode::NOT_FOUND, "Campaign not found".to_string()))?;

    let booking_id = existing.get("booking_id").and_then(|v| v.as_str()).ok_or((
        StatusCode::INTERNAL_SERVER_ERROR,
        "Invalid campaign record".to_string(),
    ))?;

    let booking_check = state
        .pg
        .from("bookings")
        .select("id")
        .eq("id", booking_id)
        .eq("agency_user_id", &user.id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let b_status = booking_check.status();
    let b_check_text = booking_check.text().await.unwrap_or_default();
    if !b_status.is_success() || b_check_text == "[]" {
        return Err((
            StatusCode::FORBIDDEN,
            "Unauthorized campaign access".to_string(),
        ));
    }

    let mut map = serde_json::Map::new();
    if let Some(n) = payload.name {
        map.insert("name".to_string(), json!(n));
    }
    if let Some(d) = payload.duration_days {
        map.insert("duration_days".to_string(), json!(d));
    }

    if let Some(s) = payload.status {
        map.insert("status".to_string(), json!(s));
        if s == "ongoing" {
            let current_start = existing.get("start_date");
            if current_start.is_none() || current_start.unwrap().is_null() {
                map.insert(
                    "start_date".to_string(),
                    json!(chrono::Utc::now().format("%Y-%m-%d").to_string()),
                );
            }
        }
    }

    if let Some(sd) = payload.start_date {
        map.insert("start_date".to_string(), json!(sd));
    }

    if map.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "No fields to update".to_string()));
    }

    let resp = state
        .pg
        .from("bookings_campaigns")
        .eq("id", &id)
        .update(serde_json::Value::Object(map).to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        let code =
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err(crate::errors::sanitize_db_error(code, text));
    }

    let updated: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    Ok(Json(updated.first().cloned().unwrap_or(json!({}))))
}

pub async fn delete_campaign(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let campaign_check = state
        .pg
        .from("bookings_campaigns")
        .select("id, booking_id")
        .eq("id", &id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let campaign_text = campaign_check.text().await.unwrap_or_default();
    let campaigns: Vec<serde_json::Value> =
        serde_json::from_str(&campaign_text).unwrap_or_default();
    let existing = campaigns
        .first()
        .ok_or((StatusCode::NOT_FOUND, "Campaign not found".to_string()))?;

    let booking_id = existing.get("booking_id").and_then(|v| v.as_str()).ok_or((
        StatusCode::INTERNAL_SERVER_ERROR,
        "Invalid campaign record".to_string(),
    ))?;

    let booking_check = state
        .pg
        .from("bookings")
        .select("id")
        .eq("id", booking_id)
        .eq("agency_user_id", &user.id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let b_status = booking_check.status();
    let b_check_text = booking_check.text().await.unwrap_or_default();
    if !b_status.is_success() || b_check_text == "[]" {
        return Err((
            StatusCode::FORBIDDEN,
            "Unauthorized campaign access".to_string(),
        ));
    }

    let resp = state
        .pg
        .from("bookings_campaigns")
        .eq("id", &id)
        .delete()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    if !status.is_success() {
        let text = resp.text().await.unwrap_or_default();
        let code =
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err(crate::errors::sanitize_db_error(code, text));
    }

    Ok(Json(json!({"deleted": true})))
}
