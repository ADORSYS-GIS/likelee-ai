use crate::{auth::AuthUser, config::AppState};
use axum::{extract::{Path, Query, State}, http::StatusCode, Json};
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Debug, Deserialize, Serialize)]
pub struct CreateBookingPayload {
    pub booking_type: Option<String>,
    pub status: Option<String>,
    pub talent_id: Option<String>,
    pub talent_name: Option<String>,
    pub client_name: Option<String>,
    pub date: String,
    pub all_day: Option<bool>,
    pub call_time: Option<String>, // HH:MM
    pub wrap_time: Option<String>,
    pub location: Option<String>,
    pub location_notes: Option<String>,
    pub rate_cents: Option<i32>,
    pub currency: Option<String>,
    pub rate_type: Option<String>,
    pub usage_terms: Option<String>,
    pub usage_duration: Option<String>,
    pub exclusive: Option<bool>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ListParams {
    pub date_start: Option<String>,
    pub date_end: Option<String>,
}

pub async fn create(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<CreateBookingPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // Compose row
    let row = json!({
        "agency_user_id": user.id,
        "talent_id": payload.talent_id,
        "talent_name": payload.talent_name,
        "client_name": payload.client_name,
        "date": payload.date,
        "all_day": payload.all_day.unwrap_or(false),
        "call_time": payload.call_time,
        "wrap_time": payload.wrap_time,
        "location": payload.location,
        "location_notes": payload.location_notes,
        "rate_cents": payload.rate_cents,
        "currency": payload.currency.unwrap_or_else(|| "USD".to_string()),
        "rate_type": payload.rate_type,
        "usage_terms": payload.usage_terms,
        "usage_duration": payload.usage_duration,
        "exclusive": payload.exclusive.unwrap_or(false),
        "type": payload.booking_type.unwrap_or_else(|| "confirmed".to_string()),
        "status": payload.status.unwrap_or_else(|| "pending".to_string()),
        "notes": payload.notes,
    });

    let resp = state
        .pg
        .from("bookings")
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
        return Err((code, text));
    }
    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}

pub async fn list(
    State(state): State<AppState>,
    user: AuthUser,
    Query(params): Query<ListParams>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let req = state
        .pg
        .from("bookings")
        .select("*")
        .eq("agency_user_id", &user.id);
    let req = if let Some(ds) = params.date_start.as_ref() {
        req.gte("date", ds)
    } else {
        req
    };
    let req = if let Some(de) = params.date_end.as_ref() {
        req.lte("date", de)
    } else {
        req
    };
    let resp = req
        .order("date.desc")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}

#[derive(Debug, Deserialize, Serialize)]
pub struct UpdateBookingPayload {
    pub booking_type: Option<String>,
    pub status: Option<String>,
    pub date: Option<String>,
    pub all_day: Option<bool>,
    pub call_time: Option<String>,
    pub wrap_time: Option<String>,
    pub location: Option<String>,
    pub location_notes: Option<String>,
    pub rate_cents: Option<i32>,
    pub currency: Option<String>,
    pub rate_type: Option<String>,
    pub usage_terms: Option<String>,
    pub usage_duration: Option<String>,
    pub exclusive: Option<bool>,
    pub notes: Option<String>,
}

pub async fn update(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<UpdateBookingPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // Only update fields that are Some
    let mut v = serde_json::to_value(&payload)
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    if let serde_json::Value::Object(ref mut map) = v {
        // Map booking_type -> type for DB column
        if let Some(bt) = map.remove("booking_type") {
            map.insert("type".into(), bt);
        }
        // Remove nulls
        let null_keys: Vec<String> = map
            .iter()
            .filter_map(|(k, v)| if v.is_null() { Some(k.clone()) } else { None })
            .collect();
        for k in null_keys {
            map.remove(&k);
        }
    }
    let req = state
        .pg
        .from("bookings")
        .eq("id", &id)
        .eq("agency_user_id", &user.id)
        .update(v.to_string());
    let resp = req
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}

pub async fn cancel(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("bookings")
        .eq("id", &id)
        .eq("agency_user_id", &user.id)
        .update(json!({"status": "cancelled"}).to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}
