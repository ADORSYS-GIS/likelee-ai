use std::env;

use axum::{
    extract::{Query, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use dotenvy::dotenv;
use postgrest::Postgrest;
use serde::{Deserialize, Serialize};
use tower_http::cors::{Any, CorsLayer};
use uuid::Uuid;

#[derive(Clone)]
struct AppState {
    pg: Postgrest,
}

#[derive(Deserialize)]
struct SessionRequest {
    user_id: String,
}

#[derive(Serialize)]
struct SessionResponse {
    session_id: String,
    session_url: String,
    provider: String,
}

#[derive(Serialize, Deserialize, Default)]
struct ProfileVerification {
    kyc_status: Option<String>,
    liveness_status: Option<String>,
    kyc_provider: Option<String>,
    kyc_session_id: Option<String>,
    verified_at: Option<String>,
}

async fn update_profile(state: &AppState, user_id: &str, payload: &ProfileVerification) -> Result<(), String> {
    let body = serde_json::to_string(payload).map_err(|e| e.to_string())?;
    let _ = state
        .pg
        .from("profiles")
        .eq("id", user_id)
        .update(body)
        .execute()
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

async fn create_session(State(state): State<AppState>, Json(req): Json<SessionRequest>) -> Result<Json<SessionResponse>, (StatusCode, String)> {
    let session_id = Uuid::new_v4().to_string();
    let session_url = format!("https://veriff.com/flow/{}", session_id);
    let payload = ProfileVerification {
        kyc_status: Some("pending".into()),
        liveness_status: Some("pending".into()),
        kyc_provider: Some("veriff".into()),
        kyc_session_id: Some(session_id.clone()),
        verified_at: None,
    };
    update_profile(&state, &req.user_id, &payload)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(Json(SessionResponse { session_id, session_url, provider: "veriff".into() }))
}

#[derive(Deserialize)]
struct StatusQuery {
    user_id: String,
}

async fn get_status(State(state): State<AppState>, Query(q): Query<StatusQuery>) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("profiles")
        .select("kyc_status,liveness_status,kyc_provider,kyc_session_id,verified_at")
        .eq("id", q.user_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text = resp.text().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let json: serde_json::Value = serde_json::from_str(&text).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json))
}

#[derive(Deserialize)]
struct WebhookBody {
    user_id: String,
    status: String,
    #[serde(default)]
    liveness_status: Option<String>,
}

async fn veriff_webhook(State(state): State<AppState>, Json(body): Json<WebhookBody>) -> Result<StatusCode, (StatusCode, String)> {
    let approved = body.status.to_lowercase() == "approved";
    let payload = ProfileVerification {
        kyc_status: Some(body.status.clone()),
        liveness_status: Some(body.liveness_status.clone().unwrap_or_else(|| if approved { "approved".into() } else { "rejected".into() })),
        kyc_provider: Some("veriff".into()),
        kyc_session_id: None,
        verified_at: approved.then(|| Utc::now().to_rfc3339()),
    };
    update_profile(&state, &body.user_id, &payload)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(StatusCode::OK)
}

#[tokio::main]
async fn main() {
    dotenv().ok();
    let supabase_url = env::var("SUPABASE_URL").expect("SUPABASE_URL is required");
    let supabase_service_key = env::var("SUPABASE_SERVICE_KEY").expect("SUPABASE_SERVICE_KEY is required");
    let port: u16 = env::var("PORT").ok().and_then(|s| s.parse().ok()).unwrap_or(8787);

    let pg = Postgrest::new(format!("{}/rest/v1", supabase_url))
        .insert_header("apikey", supabase_service_key.clone())
        .insert_header("Authorization", format!("Bearer {}", supabase_service_key));

    let state = AppState { pg };

    let cors = CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any);

    let app = Router::new()
        .route("/api/kyc/session", post(create_session))
        .route("/api/kyc/status", get(get_status))
        .route("/webhooks/kyc/veriff", post(veriff_webhook))
        .with_state(state)
        .layer(cors);

    let listener = tokio::net::TcpListener::bind(("0.0.0.0", port)).await.expect("bind port");
    axum::serve(listener, app).await.expect("server run");
}
