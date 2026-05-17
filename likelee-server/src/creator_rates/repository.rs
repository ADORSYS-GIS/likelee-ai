use crate::state::AppState;
use axum::http::StatusCode;
use serde_json::json;

use super::dto::CustomRate;

pub async fn get_creator_rates(
    ctx: &AppState,
    user_id: &str,
) -> Result<Vec<CustomRate>, (StatusCode, String)> {
    let response = ctx
        .pg
        .from("creator_custom_rates")
        .select("rate_type, rate_name, price_per_month_cents")
        .eq("creator_id", user_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !status.is_success() {
        let (code, sanitized) = crate::errors::sanitize_db_error(status.as_u16(), text);
        return Err((code, sanitized));
    }

    serde_json::from_str::<Vec<CustomRate>>(&text).map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to parse rates from response".to_string(),
        )
    })
}

pub async fn upsert_creator_rates(
    ctx: &AppState,
    user_id: &str,
    rates: Vec<CustomRate>,
) -> Result<(), (StatusCode, String)> {
    let rpc_payload = json!({
        "p_creator_id": user_id,
        "p_rates": rates
    });

    let response = ctx
        .pg
        .rpc("upsert_creator_rates", rpc_payload.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = response.status();
    let text = response.text().await.unwrap_or_default();
    if status.is_success() {
        Ok(())
    } else {
        let (code, sanitized) = crate::errors::sanitize_db_error(status.as_u16(), text);
        Err((code, sanitized))
    }
}
