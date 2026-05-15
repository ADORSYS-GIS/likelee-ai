use crate::auth::AuthUser;
use crate::state::AppState;
use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};

use super::dto::CustomRate;
use super::repository;

pub async fn get_creator_rates(State(ctx): State<AppState>, user: AuthUser) -> impl IntoResponse {
    match repository::get_creator_rates(&ctx, &user.id).await {
        Ok(rates) => (StatusCode::OK, Json(rates)).into_response(),
        Err((code, msg)) => (code, msg).into_response(),
    }
}

pub async fn upsert_creator_rates(
    State(ctx): State<AppState>,
    user: AuthUser,
    Json(rates): Json<Vec<CustomRate>>,
) -> impl IntoResponse {
    match repository::upsert_creator_rates(&ctx, &user.id, rates).await {
        Ok(()) => (StatusCode::OK, "Rates updated successfully").into_response(),
        Err((code, msg)) => (code, msg).into_response(),
    }
}
