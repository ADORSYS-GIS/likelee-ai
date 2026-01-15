use crate::{auth::AuthUser, config::AppState};
use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use serde::Serialize;

#[derive(Serialize)]
pub struct DashboardResponse {
    pub profile: serde_json::Value,
    pub metrics: serde_json::Value,
    pub campaigns: Vec<serde_json::Value>,
    pub approvals: Vec<serde_json::Value>,
    pub contracts: Vec<serde_json::Value>,
}

pub async fn get_dashboard(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<DashboardResponse>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("profiles")
        .select("id, email, full_name, city, state, bio, vibes, content_types, industries, primary_platform, platform_handle, visibility, kyc_status, verified_at, cameo_front_url, cameo_left_url, cameo_right_url, avatar_canonical_url, base_monthly_price_cents, currency_code, profile_photo_url, accept_negotiations, content_restrictions, brand_exclusivity")
        .eq("id", &user.id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let rows: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let profile = rows.get(0).cloned().unwrap_or(serde_json::json!({}));

    let campaigns: Vec<serde_json::Value> = vec![];
    let approvals: Vec<serde_json::Value> = vec![];
    let contracts: Vec<serde_json::Value> = vec![];

    let metrics = serde_json::json!({
        "active_campaigns": campaigns.len(),
        "pending_approvals": approvals.len(),
        "monthly_revenue": 0,
        "annual_run_rate": 0,
    });

    Ok(Json(DashboardResponse {
        profile,
        metrics,
        campaigns,
        approvals,
        contracts,
    }))
}
