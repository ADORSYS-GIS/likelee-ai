use crate::{auth::AuthUser, state::AppState};
use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};

use super::*;

pub async fn list_booking_notifications(
    State(state): State<AppState>,
    user: AuthUser,
    Query(q): Query<ListBookingNotificationsQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let limit = q.limit.unwrap_or(50).min(200);

    let resp = state
        .pg
        .from("booking_notifications")
        .select(
            "id,booking_id,book_out_id,channel,recipient_type,to_email,subject,message,meta_json,created_at",
        )
        .eq("agency_user_id", &user.id)
        .order("created_at.desc")
        .limit(limit as usize)
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
        return Err(crate::errors::sanitize_db_error(code.as_u16(), text));
    }
    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}
