use crate::{auth::AuthUser, config::AppState};
use axum::{extract::State, http::StatusCode, Json};
use serde::Serialize;

const MIN_BASE_MONTHLY_CENTS: i64 = 15_000;
const MIN_BASE_WEEKLY_CENTS: i64 = ((MIN_BASE_MONTHLY_CENTS as f64) / 4.345).round() as i64;
const DEFAULT_PRICING_GRACE_SECONDS: i64 = 60;

fn parse_rfc3339(value: Option<&str>) -> Option<chrono::DateTime<chrono::FixedOffset>> {
    value.and_then(|v| chrono::DateTime::parse_from_rfc3339(v).ok())
}

fn is_default_pricing(profile: &serde_json::Value) -> bool {
    let monthly = profile
        .get("base_monthly_price_cents")
        .and_then(|v| v.as_i64());
    let weekly = profile
        .get("base_weekly_price_cents")
        .and_then(|v| v.as_i64());

    let matches_min = monthly == Some(MIN_BASE_MONTHLY_CENTS)
        || weekly
            .map(|v| (v - MIN_BASE_WEEKLY_CENTS).abs() <= 5)
            .unwrap_or(false);
    if !matches_min {
        return false;
    }

    let created_at = parse_rfc3339(profile.get("created_at").and_then(|v| v.as_str()));
    let pricing_updated_at =
        parse_rfc3339(profile.get("pricing_updated_at").and_then(|v| v.as_str()));
    if pricing_updated_at.is_none() {
        return true;
    }
    match (created_at, pricing_updated_at) {
        (Some(created), Some(pricing)) => {
            (pricing - created).num_seconds() <= DEFAULT_PRICING_GRACE_SECONDS
        }
        _ => true,
    }
}

fn should_default_visibility_on(profile: &serde_json::Value) -> bool {
    let public_visible = profile
        .get("public_profile_visible")
        .and_then(|v| v.as_bool());
    let visibility = profile
        .get("visibility")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_lowercase();

    if public_visible != Some(false) {
        return false;
    }
    if !(visibility.is_empty() || visibility == "private") {
        return false;
    }
    is_default_pricing(profile)
}

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
    let select_cols = "id, email, full_name, city, state, bio, vibes, content_types, industries, primary_platform, platform_handle, tiktok_handle, portfolio_link, visibility, public_profile_visible, kyc_status, kyc_rejection_reason, kyc_rejection_code, verified_at, base_weekly_price_cents, base_monthly_price_cents, pricing_updated_at, created_at, currency_code, profile_photo_url, accept_negotiations, content_restrictions, brand_exclusivity";

    let resp = state
        .pg
        .from("creators")
        .select(select_cols)
        .eq("id", &user.id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let mut rows: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Backwards compatibility: if creators row was created with a random UUID instead of auth.users.id,
    // fall back to email lookup.
    let empty = rows.as_array().map(|a| a.is_empty()).unwrap_or(true);
    if empty {
        if let Some(email) = user.email.as_deref() {
            let resp2 = state
                .pg
                .from("creators")
                .select(select_cols)
                .eq("email", email)
                .limit(1)
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let text2 = resp2
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            rows = serde_json::from_str(&text2)
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        }
    }
    let mut profile = rows
        .as_array()
        .and_then(|a| a.first())
        .cloned()
        .unwrap_or(serde_json::json!({}));

    if is_default_pricing(&profile) {
        profile["base_monthly_price_cents"] = serde_json::Value::Null;
        profile["base_weekly_price_cents"] = serde_json::Value::Null;
    }
    if should_default_visibility_on(&profile) {
        profile["public_profile_visible"] = serde_json::Value::Bool(true);
        profile["visibility"] = serde_json::Value::String("brands".to_string());
    }

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
