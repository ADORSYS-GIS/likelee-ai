use crate::{auth::AuthUser, state::AppState};
use axum::{extract::State, http::StatusCode, Json};
use serde::Serialize;

use crate::pricing_defaults::{is_default_pricing, should_default_visibility_on};

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
    let select_cols = "id, email, full_name, city, state, bio, birthdate, gender, ethnicity, creator_type, race, hair_color, eye_color, height_cm, vibes, content_types, industries, primary_platform, platform_handle, instagram_handle, instagram_followers, instagram_connected, tiktok_handle, portfolio_link, visibility, public_profile_visible, kyc_status, kyc_rejection_reason, kyc_rejection_code, verified_at, base_weekly_price_cents, base_monthly_price_cents, pricing_updated_at, created_at, updated_at, currency_code, profile_photo_url, accept_negotiations, content_restrictions, brand_exclusivity";

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

    let default_pricing = is_default_pricing(&profile);
    let default_visibility = should_default_visibility_on(&profile);

    if default_pricing {
        profile["base_monthly_price_cents"] = serde_json::Value::Null;
        profile["base_weekly_price_cents"] = serde_json::Value::Null;
    }
    if default_visibility {
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
