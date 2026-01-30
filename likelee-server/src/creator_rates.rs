use crate::{auth::AuthUser, config::AppState};
use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Deserialize)]
pub struct RateQuery {
    pub user_id: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CustomRate {
    pub rate_type: String,
    pub rate_name: String,
    pub price_per_month_cents: i32,
}

pub async fn get_creator_rates(State(ctx): State<AppState>, user: AuthUser) -> impl IntoResponse {
    let response = ctx
        .pg
        .from("creator_custom_rates")
        .select("rate_type, rate_name, price_per_month_cents")
        .eq("creator_id", &user.id)
        .execute()
        .await;

    match response {
        Ok(res) => {
            if res.status().is_success() {
                let body_text = match res.text().await {
                    Ok(text) => text,
                    Err(_) => {
                        return (
                            StatusCode::INTERNAL_SERVER_ERROR,
                            "Failed to read response body",
                        )
                            .into_response()
                    }
                };
                match serde_json::from_str::<Vec<CustomRate>>(&body_text) {
                    Ok(rates) => (StatusCode::OK, Json(rates)).into_response(),
                    Err(_) => (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        "Failed to parse rates from response",
                    )
                        .into_response(),
                }
            } else {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Failed to fetch rates from db",
                )
                    .into_response()
            }
        }
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Database request failed").into_response(),
    }
}

pub async fn upsert_creator_rates(
    State(ctx): State<AppState>,
    user: AuthUser,
    Json(rates): Json<Vec<CustomRate>>,
) -> impl IntoResponse {
    // Use an RPC function to handle the upsert logic transactionally
    let rpc_payload = json!({
        "p_creator_id": &user.id,
        "p_rates": rates
    });

    let response = ctx
        .pg
        .rpc("upsert_creator_rates", rpc_payload.to_string())
        .execute()
        .await;

    match response {
        Ok(res) => {
            if res.status().is_success() {
                (StatusCode::OK, "Rates updated successfully").into_response()
            } else {
                (
                    StatusCode::BAD_REQUEST,
                    format!(
                        "Failed to upsert rates: {}",
                        res.text().await.unwrap_or_default()
                    ),
                )
                    .into_response()
            }
        }
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, "RPC request failed").into_response(),
    }
}
