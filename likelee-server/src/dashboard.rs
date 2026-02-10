use crate::{auth::AuthUser, config::AppState};
use axum::{extract::State, http::StatusCode, Json};
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
    let select_cols = "id, email, full_name, city, state, bio, vibes, content_types, industries, primary_platform, platform_handle, visibility, kyc_status, verified_at, base_monthly_price_cents, currency_code, profile_photo_url, accept_negotiations, content_restrictions, brand_exclusivity";

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
    let profile = rows
        .as_array()
        .and_then(|a| a.first())
        .cloned()
        .unwrap_or(serde_json::json!({}));

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
