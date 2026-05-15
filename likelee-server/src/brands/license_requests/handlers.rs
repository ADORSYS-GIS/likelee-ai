use crate::{
    auth::AuthUser,
    billing::entitlements::{brand_allows_campaign_collaboration, get_brand_plan_tier},
    state::AppState,
    team::{permissions::Permission, require_agency_permission, resolve_effective_brand_id},
};
use axum::{extract::State, http::StatusCode, Json};
use serde_json::json;

use super::dto::{BrandLicenseRequestListResponse, UpdateBrandLicenseRequestStatus};
use super::repository;

pub async fn create(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "brand" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    let effective_brand_id = resolve_effective_brand_id(&state, &user).await?;
    let tier = get_brand_plan_tier(&state, &effective_brand_id).await?;
    if !brand_allows_campaign_collaboration(tier) {
        return Err((
            StatusCode::FORBIDDEN,
            "brand_talent_browsing_requires_pro_plan".to_string(),
        ));
    }

    let created =
        repository::create_brand_license_request(&state, &effective_brand_id, &payload, &user.access_token).await?;

    Ok(Json(json!({
        "status": "ok",
        "id": created.get("id").cloned().unwrap_or(serde_json::Value::Null),
    })))
}

pub async fn list_for_brand(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<BrandLicenseRequestListResponse>, (StatusCode, String)> {
    if user.role != "brand" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    let effective_brand_id = resolve_effective_brand_id(&state, &user).await?;

    tracing::info!(
        "🔍 Brand licensing requests query: user_id={}, effective_brand_id={}, user_role={}",
        user.id,
        effective_brand_id,
        user.role
    );

    // Debug: List all brand_license_requests for debugging
    let debug_resp = state
        .pg
        .from("brand_license_requests")
        .select("id, brand_id, agency_id, status, created_at")
        .eq("brand_id", &effective_brand_id)
        .limit(10)
        .execute()
        .await;

    if let Ok(debug_resp) = debug_resp {
        if let Ok(debug_text) = debug_resp.text().await {
            tracing::info!(
                "🔍 Recent brand_license_requests in database: {}",
                debug_text
            );
        }
    }

    let rows = repository::list_brand_license_requests_for_brand(
        &state,
        &effective_brand_id,
        &user.access_token,
    )
    .await?;

    Ok(Json(BrandLicenseRequestListResponse { requests: rows }))
}

pub async fn list_for_agency(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<BrandLicenseRequestListResponse>, (StatusCode, String)> {
    let access = require_agency_permission(&state, &user, Permission::ViewLicenses).await?;
    let agency_id = &access.organization_id;

    let rows = repository::list_brand_license_requests_for_agency(&state, agency_id).await?;

    Ok(Json(BrandLicenseRequestListResponse { requests: rows }))
}

pub async fn update_status_for_agency(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<UpdateBrandLicenseRequestStatus>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let access = require_agency_permission(&state, &user, Permission::ManageLicenses).await?;
    let agency_id = &access.organization_id;
    if payload.brand_request_ids.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "No brand_request_ids".to_string()));
    }

    repository::update_brand_license_request_status(
        &state,
        agency_id,
        &payload.brand_request_ids,
        &payload.status,
        payload.decline_reason.as_deref(),
    )
    .await?;

    Ok(Json(json!({"status":"ok"})))
}
