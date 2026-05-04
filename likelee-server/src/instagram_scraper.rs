use crate::{
    auth::AuthUser,
    config::AppState,
    services::apify::{ApifyService, InstagramProfileData},
};
use axum::{
    extract::{Query, State},
    Json,
};
use axum::http::StatusCode;
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Deserialize)]
pub struct ScrapeRequest {
    pub instagram_handle: String,
}

#[derive(Serialize)]
pub struct ScrapeResponse {
    pub success: bool,
    pub profile: Option<InstagramProfileData>,
    pub error: Option<String>,
}

#[derive(Deserialize)]
pub struct ScrapeQuery {
    pub handle: String,
}

pub async fn scrape_instagram_profile(
    State(state): State<AppState>,
    user: AuthUser,
    Json(req): Json<ScrapeRequest>,
) -> Result<Json<ScrapeResponse>, (StatusCode, String)> {
    if !["agency", "creator", "talent", "brand"].contains(&user.role.as_str()) {
        return Err((StatusCode::FORBIDDEN, "Insufficient permissions".to_string()));
    }

    if state.apify_api_token.is_empty() {
        return Err((StatusCode::SERVICE_UNAVAILABLE, "Instagram scraping is not configured".to_string()));
    }

    let service = ApifyService::new(
        state.apify_api_token.clone(),
        state.apify_scraper_actor_id.clone(),
    );

    let handle = req.instagram_handle.trim().trim_start_matches('@').to_string();

    if handle.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Instagram handle is required".to_string()));
    }

    match service.scrape_and_wait(handle).await {
        Ok(profile) => Ok(Json(ScrapeResponse {
            success: true,
            profile,
            error: None,
        })),
        Err(e) => Ok(Json(ScrapeResponse {
            success: false,
            profile: None,
            error: Some(e),
        })),
    }
}

pub async fn scrape_instagram_profile_query(
    State(state): State<AppState>,
    user: AuthUser,
    Query(q): Query<ScrapeQuery>,
) -> Result<Json<ScrapeResponse>, (StatusCode, String)> {
    if !["agency", "creator", "talent", "brand"].contains(&user.role.as_str()) {
        return Err((StatusCode::FORBIDDEN, "Insufficient permissions".to_string()));
    }

    if state.apify_api_token.is_empty() {
        return Err((StatusCode::SERVICE_UNAVAILABLE, "Instagram scraping is not configured".to_string()));
    }

    let service = ApifyService::new(
        state.apify_api_token.clone(),
        state.apify_scraper_actor_id.clone(),
    );

    let handle = q.handle.trim().trim_start_matches('@').to_string();

    if handle.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Instagram handle is required".to_string()));
    }

    match service.scrape_and_wait(handle).await {
        Ok(profile) => Ok(Json(ScrapeResponse {
            success: true,
            profile,
            error: None,
        })),
        Err(e) => Ok(Json(ScrapeResponse {
            success: false,
            profile: None,
            error: Some(e),
        })),
    }
}

pub async fn handle_apify_webhook(
    State(_state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    tracing::info!("Received Apify webhook: {:?}", payload);
    Ok(Json(json!({"status": "ok"})))
}
