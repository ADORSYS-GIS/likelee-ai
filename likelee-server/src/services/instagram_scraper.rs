use crate::{
    auth::AuthUser,
    config::AppState,
    services::apify::{ApifyService, InstagramProfileData},
};
use axum::http::StatusCode;
use axum::{
    extract::{Query, State},
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Deserialize)]
pub struct ScrapeRequest {
    pub instagram_handle: String,
    pub creator_id: Option<String>,
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

#[derive(Deserialize)]
pub struct ScrapeRequestWithTarget {
    pub instagram_handle: String,
    pub target_creator_id: Option<String>,
}

async fn persist_scraped_data(
    state: &AppState,
    user: &AuthUser,
    handle: &str,
    profile: &InstagramProfileData,
    target_creator_id: Option<&str>,
) -> Result<(), (StatusCode, String)> {
    let Some(followers) = profile.followers else {
        return Ok(());
    };

    tracing::info!(
        handle = %handle,
        followers = %followers,
        user_id = %user.id,
        target_creator_id = ?target_creator_id,
        "persisting instagram followers from scrape"
    );

    let update_body = json!({
        "instagram_followers": followers,
        "instagram_connected": true,
        "instagram_last_synced": chrono::Utc::now().to_rfc3339(),
    });

    let body_str = serde_json::to_string(&update_body)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    match user.role.as_str() {
        "creator" | "talent" => {
            if let Some(target) = target_creator_id {
                if target != user.id {
                    return Err((
                        StatusCode::FORBIDDEN,
                        "Can only update your own creator profile".to_string(),
                    ));
                }
            }
            let creator_id = &user.id;
            let resp = state
                .pg
                .from("creators")
                .eq("id", creator_id)
                .select("id")
                .limit(1)
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

            if !resp.status().is_success() {
                return Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Failed to verify creator".to_string(),
                ));
            }

            let text = resp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();

            if rows.is_empty() {
                return Err((
                    StatusCode::FORBIDDEN,
                    "Can only update your own creator profile".to_string(),
                ));
            }

            let _ = state
                .pg
                .from("creators")
                .eq("id", creator_id)
                .update(&body_str)
                .execute()
                .await;
        }
        "agency" => {
            let creator_id = target_creator_id.ok_or((
                StatusCode::BAD_REQUEST,
                "Agencies must specify target_creator_id".to_string(),
            ))?;

            let resp = state
                .pg
                .from("agency_talent_relationships")
                .select("creator_id")
                .eq("agency_id", &user.id)
                .eq("creator_id", creator_id)
                .eq("status", "active")
                .limit(1)
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

            if !resp.status().is_success() {
                return Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Failed to verify relationship".to_string(),
                ));
            }

            let text = resp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();

            if rows.is_empty() {
                return Err((
                    StatusCode::FORBIDDEN,
                    "Agency can only update managed talent profiles".to_string(),
                ));
            }

            let _ = state
                .pg
                .from("creators")
                .eq("id", creator_id)
                .update(&body_str)
                .execute()
                .await;
        }
        "brand" => {
            return Err((
                StatusCode::FORBIDDEN,
                "Brands cannot persist scraped data".to_string(),
            ));
        }
        _ => {
            return Err((
                StatusCode::FORBIDDEN,
                "Insufficient permissions".to_string(),
            ));
        }
    }

    Ok(())
}

pub async fn scrape_instagram_profile(
    State(state): State<AppState>,
    user: AuthUser,
    Json(req): Json<ScrapeRequestWithTarget>,
) -> Result<Json<ScrapeResponse>, (StatusCode, String)> {
    if !["agency", "creator", "talent", "brand"].contains(&user.role.as_str()) {
        return Err((
            StatusCode::FORBIDDEN,
            "Insufficient permissions".to_string(),
        ));
    }

    if state.apify_api_token.is_empty() {
        return Err((
            StatusCode::SERVICE_UNAVAILABLE,
            "Instagram scraping is not configured".to_string(),
        ));
    }

    let service = ApifyService::new(
        state.apify_api_token.clone(),
        state.apify_scraper_actor_id.clone(),
    );

    let handle = req
        .instagram_handle
        .trim()
        .trim_start_matches('@')
        .to_string();

    if handle.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Instagram handle is required".to_string(),
        ));
    }

    match service.scrape_and_wait(handle.clone()).await {
        Ok(Some(profile)) => {
            let _ = persist_scraped_data(
                &state,
                &user,
                &handle,
                &profile,
                req.target_creator_id.as_deref(),
            )
            .await;

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
        return Err((
            StatusCode::FORBIDDEN,
            "Insufficient permissions".to_string(),
        ));
    }

    if state.apify_api_token.is_empty() {
        return Err((
            StatusCode::SERVICE_UNAVAILABLE,
            "Instagram scraping is not configured".to_string(),
        ));
    }

    let service = ApifyService::new(
        state.apify_api_token.clone(),
        state.apify_scraper_actor_id.clone(),
    );

    let handle = q.handle.trim().trim_start_matches('@').to_string();

    if handle.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Instagram handle is required".to_string(),
        ));
    }

    match service.scrape_and_wait(handle.clone()).await {
        Ok(Some(profile)) => {
            let _ = persist_scraped_data(&state, &user, &handle, &profile, None).await;

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
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    tracing::info!(
        ?payload,
        "apify webhook received (placeholder - webhook integration deferred)"
    );

    Ok(Json(
        json!({"status": "ok", "note": "webhook integration deferred in favor of synchronous request-response"}),
    ))
}
