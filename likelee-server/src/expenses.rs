use crate::{auth::AuthUser, config::AppState, errors::sanitize_db_error};
use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use serde_json::json;

#[derive(Debug, Deserialize)]
pub struct ExpenseListParams {
    pub date_start: Option<String>,
    pub date_end: Option<String>,
    pub category: Option<String>,
    pub status: Option<String>,
}

pub async fn list(
    State(state): State<AppState>,
    user: AuthUser,
    Query(params): Query<ExpenseListParams>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let mut req = state
        .pg
        .from("agency_expenses")
        .select("*")
        .eq("agency_id", &user.id)
        .order("expense_date.desc");

    if let Some(s) = params.category.as_ref().filter(|s| !s.is_empty()) {
        req = req.eq("category", s);
    }
    if let Some(s) = params.status.as_ref().filter(|s| !s.is_empty()) {
        req = req.eq("status", s);
    }
    if let Some(d) = params.date_start.as_ref().filter(|s| !s.is_empty()) {
        req = req.gte("expense_date", d);
    }
    if let Some(d) = params.date_end.as_ref().filter(|s| !s.is_empty()) {
        req = req.lte("expense_date", d);
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
        return Err(sanitize_db_error(status.as_u16(), text));
    }

    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}

#[derive(Debug, Deserialize)]
pub struct CreateExpensePayload {
    pub name: String,
    pub category: String,
    pub expense_date: String,
    pub amount_cents: Option<i32>,
    pub currency: Option<String>,
    pub status: Option<String>,
    pub submitter: Option<String>,
}

pub async fn create(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<CreateExpensePayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let row = json!({
        "agency_id": user.id,
        "name": payload.name,
        "category": payload.category,
        "expense_date": payload.expense_date,
        "amount_cents": payload.amount_cents.unwrap_or(0),
        "currency": payload.currency.unwrap_or_else(|| "USD".to_string()),
        "status": payload.status.unwrap_or_else(|| "approved".to_string()),
        "submitter": payload.submitter,
    });

    let resp = state
        .pg
        .from("agency_expenses")
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
        return Err(sanitize_db_error(status.as_u16(), text));
    }

    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}
