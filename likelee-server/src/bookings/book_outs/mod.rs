use crate::agencies::talent_refs::resolve_agency_talent_ref;
use crate::{
    auth::AuthUser, state::AppState,
    team::resolve_effective_agency_id,
};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Debug, Deserialize)]
pub struct ListParams {
    pub date_start: Option<String>,
    pub date_end: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CreateBookOutPayload {
    pub talent_id: String,
    pub creator_id: Option<String>,
    pub relationship_id: Option<String>,
    pub start_date: String, // YYYY-MM-DD
    pub end_date: String,   // YYYY-MM-DD
    pub reason: Option<String>,
    pub notes: Option<String>,
}

pub async fn list(
    State(state): State<AppState>,
    user: AuthUser,
    Query(params): Query<ListParams>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let mut req = state
        .pg
        .from("book_outs")
        .select("*")
        .eq("agency_user_id", &user.id);
    if let Some(ds) = params.date_start.as_ref() {
        req = req.gte("end_date", ds);
    }
    if let Some(de) = params.date_end.as_ref() {
        req = req.lte("start_date", de);
    }
    let resp = req
        .order("start_date.asc")
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

pub async fn create(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<CreateBookOutPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let agency_id = resolve_effective_agency_id(&state, &user).await?;
    let talent_ref = resolve_agency_talent_ref(&state, &agency_id, &payload.talent_id).await?;
    let body = json!({
        "agency_user_id": user.id,
        "talent_id": talent_ref.agency_user_id,
        "creator_id": talent_ref.creator_id.or(payload.creator_id),
        "relationship_id": talent_ref.relationship_id.or(payload.relationship_id),
        "start_date": payload.start_date,
        "end_date": payload.end_date,
        "reason": payload.reason.unwrap_or_else(|| "personal".to_string()),
        "notes": payload.notes,
    });
    let resp = state
        .pg
        .from("book_outs")
        .insert(body.to_string())
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

pub async fn delete_book_out(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("book_outs")
        .eq("id", &id)
        .eq("agency_user_id", &user.id)
        .delete()
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
