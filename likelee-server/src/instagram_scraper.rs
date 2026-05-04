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

    match service.scrape_and_wait(handle.clone()).await {
        Ok(Some(profile)) => {
            // Auto-persist scraped data to creators table
            if let Some(followers) = profile.followers {
                tracing::info!(
                    handle = %handle,
                    followers = %followers,
                    user_id = %user.id,
                    "auto-persisting instagram followers from scrape"
                );

                let update_body = json!({
                    "instagram_followers": followers,
                    "instagram_connected": true,
                    "instagram_last_synced": chrono::Utc::now().to_rfc3339(),
                });

                let body_str = serde_json::to_string(&update_body)
                    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

                // Update by instagram_handle
                let _ = state
                    .pg
                    .from("creators")
                    .eq("instagram_handle", &handle)
                    .update(&body_str)
                    .execute()
                    .await;

                // Also update by platform_handle
                let _ = state
                    .pg
                    .from("creators")
                    .eq("platform_handle", &handle)
                    .update(&body_str)
                    .execute()
                    .await;

                // If user is a creator, also try updating by user id directly
                if user.role == "creator" {
                    let _ = state
                        .pg
                        .from("creators")
                        .eq("id", &user.id)
                        .update(&body_str)
                        .execute()
                        .await;
                }
            }

            Ok(Json(ScrapeResponse {
                success: true,
                profile: Some(profile),
                error: None,
            }))
        }
        Ok(None) => Ok(Json(ScrapeResponse {
            success: false,
            profile: None,
            error: Some("No profile data returned from scraper".to_string()),
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

    match service.scrape_and_wait(handle.clone()).await {
        Ok(Some(profile)) => {
            // Auto-persist scraped data to creators table
            if let Some(followers) = profile.followers {
                tracing::info!(
                    handle = %handle,
                    followers = %followers,
                    user_id = %user.id,
                    "auto-persisting instagram followers from scrape (query)"
                );

                let update_body = json!({
                    "instagram_followers": followers,
                    "instagram_connected": true,
                    "instagram_last_synced": chrono::Utc::now().to_rfc3339(),
                });

                let body_str = serde_json::to_string(&update_body)
                    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

                // Update by instagram_handle
                let _ = state
                    .pg
                    .from("creators")
                    .eq("instagram_handle", &handle)
                    .update(&body_str)
                    .execute()
                    .await;

                // Also update by platform_handle
                let _ = state
                    .pg
                    .from("creators")
                    .eq("platform_handle", &handle)
                    .update(&body_str)
                    .execute()
                    .await;

                // If user is a creator, also try updating by user id directly
                if user.role == "creator" {
                    let _ = state
                        .pg
                        .from("creators")
                        .eq("id", &user.id)
                        .update(&body_str)
                        .execute()
                        .await;
                }
            }

            Ok(Json(ScrapeResponse {
                success: true,
                profile: Some(profile),
                error: None,
            }))
        }
        Ok(None) => Ok(Json(ScrapeResponse {
            success: false,
            profile: None,
            error: Some("No profile data returned from scraper".to_string()),
        })),
        Err(e) => Ok(Json(ScrapeResponse {
            success: false,
            profile: None,
            error: Some(e),
        })),
    }
}

pub async fn handle_apify_webhook(
    State(state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    tracing::info!(?payload, "apify webhook received");

    // Extract handle and followers from webhook payload
    let handle = payload
        .get("username")
        .or_else(|| payload.get("ownerUsername"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    if handle.is_empty() {
        tracing::warn!("apify webhook: no username in payload");
        return Ok(Json(json!({"status": "ok", "note": "no username in payload"})));
    }

    let followers = payload
        .get("followers")
        .or_else(|| payload.get("followersCount"))
        .and_then(|v| v.as_i64())
        .or_else(|| {
            payload
                .get("followers")
                .or_else(|| payload.get("followersCount"))
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse::<i64>().ok())
        });

    if let Some(follower_count) = followers {
        tracing::info!(
            handle = %handle,
            followers = %follower_count,
            "updating creator instagram_followers from webhook"
        );

        // Update the creators table
        let update_body = json!({
            "instagram_followers": follower_count,
            "instagram_connected": true,
            "instagram_last_synced": chrono::Utc::now().to_rfc3339(),
        });

        let body_str = serde_json::to_string(&update_body)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let _ = state
            .pg
            .from("creators")
            .eq("instagram_handle", &handle)
            .update(&body_str)
            .execute()
            .await;

        // Also try updating via platform_handle
        let _ = state
            .pg
            .from("creators")
            .eq("platform_handle", &handle)
            .update(&body_str)
            .execute()
            .await;
    }

    Ok(Json(json!({"status": "ok"})))
}
