use std::env;

use axum::{
    body::Bytes,
    extract::{Query, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
    http::HeaderMap,
};
use chrono::Utc;
use dotenvy::dotenv;
use postgrest::Postgrest;
use serde::{Deserialize, Serialize};
use tower_http::cors::{Any, CorsLayer};
use hmac::{Hmac, Mac};
use sha2::Sha256;
type HmacSha256 = Hmac<Sha256>;
use tracing::{debug, error, info, warn};
use uuid::Uuid;

#[derive(Clone)]
struct VeriffConfig {
    base_url: String,
    api_key: String,
    shared_secret: String,
}

// Upsert profile by email (and id if provided)
async fn upsert_profile(State(state): State<AppState>, Json(mut body): Json<serde_json::Value>) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let email = body.get("email").and_then(|v| v.as_str()).ok_or((StatusCode::BAD_REQUEST, "missing email".to_string()))?.to_string();
    // Ensure timestamps if not provided
    let now = Utc::now().to_rfc3339();
    if body.get("updated_date").is_none() {
        body["updated_date"] = serde_json::Value::String(now.clone());
    }
    // Check if a profile exists by email
    let exists = match state
        .pg
        .from("profiles")
        .select("id")
        .eq("email", &email)
        .limit(1)
        .execute()
        .await
    {
        Ok(resp) => {
            let text = resp.text().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let rows: serde_json::Value = serde_json::from_str(&text).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            rows.as_array().map(|a| !a.is_empty()).unwrap_or(false)
        }
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("42703") || (msg.contains("relation") && msg.contains("does not exist")) {
                warn!(%msg, "profiles table missing; cannot upsert");
                return Err((StatusCode::PRECONDITION_FAILED, "profiles table missing".into()));
            }
            return Err((StatusCode::INTERNAL_SERVER_ERROR, msg));
        }
    };

    let body_str = serde_json::to_string(&body).map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    if exists {
        let resp = state
            .pg
            .from("profiles")
            .eq("email", &email)
            .update(body_str)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let text = resp.text().await.unwrap_or_else(|_| "{}".into());
        let v: serde_json::Value = serde_json::from_str(&text).unwrap_or(serde_json::json!({}));
        Ok(Json(v))
    } else {
        // If id not provided, leave it to DB default; otherwise insert with provided id
        if body.get("created_date").is_none() {
            body["created_date"] = serde_json::Value::String(now);
        }
        let body_str = serde_json::to_string(&body).map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
        let resp = state
            .pg
            .from("profiles")
            .insert(body_str)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let text = resp.text().await.unwrap_or_else(|_| "{}".into());
        let v: serde_json::Value = serde_json::from_str(&text).unwrap_or(serde_json::json!({}));
        Ok(Json(v))
    }
}

#[derive(Deserialize)]
struct DashboardQuery { user_id: String }

#[derive(Serialize)]
struct DashboardResponse {
    profile: serde_json::Value,
    metrics: serde_json::Value,
    campaigns: Vec<serde_json::Value>,
    approvals: Vec<serde_json::Value>,
    contracts: Vec<serde_json::Value>,
}

async fn get_dashboard(State(state): State<AppState>, Query(q): Query<DashboardQuery>) -> Result<Json<DashboardResponse>, (StatusCode, String)> {
    // Fetch the user's profile fields used by the dashboard
    let resp = state
        .pg
        .from("profiles")
        .select("id, email, full_name, city, state, vibes, content_types, industries, primary_platform, platform_handle, visibility, kyc_status, verified_at")
        .eq("id", &q.user_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text = resp.text().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let rows: serde_json::Value = serde_json::from_str(&text).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let profile = rows.get(0).cloned().unwrap_or(serde_json::json!({}));

    // Placeholder arrays until real campaign/licensing data is wired
    let campaigns: Vec<serde_json::Value> = vec![];
    let approvals: Vec<serde_json::Value> = vec![];
    let contracts: Vec<serde_json::Value> = vec![];

    // Simple computed metrics (can be expanded later)
    let metrics = serde_json::json!({
        "active_campaigns": campaigns.len(),
        "pending_approvals": approvals.len(),
        "monthly_revenue": 0,
        "annual_run_rate": 0,
    });

    Ok(Json(DashboardResponse { profile, metrics, campaigns, approvals, contracts }))
}

// --- Minimal Face Profile endpoints (local, no-op persistence) ---
#[derive(Deserialize, Serialize)]
struct FaceProfilePayload(serde_json::Value);

#[derive(Serialize)]
struct FaceProfileResponse { id: String }

async fn create_face_profile(Json(_body): Json<FaceProfilePayload>) -> Result<Json<FaceProfileResponse>, (StatusCode, String)> {
    let id = Uuid::new_v4().to_string();
    info!(%id, "Created face profile (no-op)");
    Ok(Json(FaceProfileResponse { id }))
}

async fn update_face_profile(axum::extract::Path(id): axum::extract::Path<String>, Json(_body): Json<FaceProfilePayload>) -> Result<Json<FaceProfileResponse>, (StatusCode, String)> {
    info!(%id, "Updated face profile (no-op)");
    Ok(Json(FaceProfileResponse { id }))
}

#[derive(Deserialize)]
struct EmailQuery { email: String }

#[derive(Serialize)]
struct EmailAvailability { available: bool }

async fn check_email(State(state): State<AppState>, Query(q): Query<EmailQuery>) -> Result<Json<EmailAvailability>, (StatusCode, String)> {
    // Query profiles by email
    match state
        .pg
        .from("profiles")
        .select("id")
        .eq("email", &q.email)
        .limit(1)
        .execute()
        .await
    {
        Ok(resp) => {
            let text = resp.text().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let rows: serde_json::Value = serde_json::from_str(&text).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let exists = rows.as_array().map(|a| !a.is_empty()).unwrap_or(false);
            Ok(Json(EmailAvailability { available: !exists }))
        }
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("42703") || msg.contains("column") && msg.contains("does not exist") || msg.contains("relation") && msg.contains("does not exist") {
                warn!(%msg, "profiles table/email column missing; defaulting email available");
                return Ok(Json(EmailAvailability { available: true }));
            }
            Err((StatusCode::INTERNAL_SERVER_ERROR, msg))
        }
    }
}

#[derive(Clone)]
struct AppState {
    pg: Postgrest,
    veriff: VeriffConfig,
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
    match state
        .pg
        .from("profiles")
        .eq("id", user_id)
        .update(body)
        .execute()
        .await
    {
        Ok(_) => {}
        Err(e) => {
            let msg = e.to_string();
            // If columns are missing (e.g., 42703), log and continue
            if msg.contains("42703") || msg.contains("column") && msg.contains("does not exist") {
                warn!(%msg, "profiles table missing verification columns; skipping profile update");
                return Ok(());
            }
            return Err(msg);
        }
    }
    Ok(())
}

#[derive(Serialize)]
struct VeriffVerification<'a> {
    #[serde(rename = "vendorData")]
    vendor_data: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    lang: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    features: Option<serde_json::Value>,
}

#[derive(Serialize)]
struct VeriffCreateSessionBody<'a> {
    verification: VeriffVerification<'a>,
}

#[derive(Deserialize)]
struct VeriffCreateSessionResponse {
    session: VeriffSession,
}

#[derive(Deserialize)]
struct VeriffSession {
    id: String,
    url: String,
}

fn compute_hmac_hex(secret: &str, body: &[u8]) -> String {
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).expect("HMAC can take key of any size");
    mac.update(body);
    let result = mac.finalize().into_bytes();
    hex::encode(result)
}

async fn create_session(State(state): State<AppState>, Json(req): Json<SessionRequest>) -> Result<Json<SessionResponse>, (StatusCode, String)> {
    // Build request body for Veriff
    debug!(user_id = %req.user_id, "Creating Veriff session");
    let veriff_body = VeriffCreateSessionBody {
        verification: VeriffVerification {
            vendor_data: &req.user_id,
            lang: None,
            features: None,
        },
    };
    let body_str = serde_json::to_string(&veriff_body).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let sig = compute_hmac_hex(&state.veriff.shared_secret, body_str.as_bytes());

    let client = reqwest::Client::new();
    let url = format!("{}/v1/sessions", state.veriff.base_url.trim_end_matches('/'));
    info!(endpoint = %url, "POST Veriff create session");
    let res = client
        .post(&url)
        .header("x-auth-client", &state.veriff.api_key)
        .header("x-hmac-signature", sig)
        .header("content-type", "application/json")
        .body(body_str)
        .send()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, format!("veriff request error: {}", e)))?;

    if !res.status().is_success() {
        let status = res.status();
        let text = res.text().await.unwrap_or_default();
        error!(%status, body = %text, "Veriff create session failed");
        return Err((StatusCode::BAD_GATEWAY, format!("veriff error: {} {}", status, text)));
    }

    let body_text = res.text().await.map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    debug!(body = %body_text, "Veriff create session success body");
    let v: serde_json::Value = serde_json::from_str(&body_text).map_err(|e| (StatusCode::BAD_GATEWAY, format!("error decoding response body: {}", e)))?;
    // Try common shapes
    let (session_id, session_url) = if let (Some(id), Some(url)) = (
        v.get("session").and_then(|s| s.get("id")).and_then(|x| x.as_str()),
        v.get("session").and_then(|s| s.get("url")).and_then(|x| x.as_str()),
    ) {
        (id.to_string(), url.to_string())
    } else if let (Some(id), Some(url)) = (
        v.get("verification").and_then(|s| s.get("id")).and_then(|x| x.as_str()),
        v.get("verification").and_then(|s| s.get("url")).and_then(|x| x.as_str()),
    ) {
        (id.to_string(), url.to_string())
    } else if let Some(url) = v.get("url").and_then(|x| x.as_str()) {
        ("".to_string(), url.to_string())
    } else {
        error!(body = %body_text, "Unable to extract session id/url from Veriff response");
        return Err((StatusCode::BAD_GATEWAY, "unexpected veriff response".into()));
    };
    info!(%session_id, "Veriff session created");

    // Persist pending state
    let payload = ProfileVerification {
        kyc_status: Some("pending".into()),
        liveness_status: Some("pending".into()),
        kyc_provider: Some("veriff".into()),
        kyc_session_id: if session_id.is_empty() { None } else { Some(session_id.clone()) },
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
    // Fetch current profile status
    let resp = state
        .pg
        .from("profiles")
        .select("kyc_status,liveness_status,kyc_provider,kyc_session_id,verified_at")
        .eq("id", &q.user_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text = resp.text().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let mut rows: serde_json::Value = serde_json::from_str(&text).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Poll Veriff if pending and session id exists
    let should_poll = rows
        .get(0)
        .and_then(|r| r.get("kyc_status").and_then(|s| s.as_str()))
        .map(|s| s == "pending")
        .unwrap_or(false)
        && rows
            .get(0)
            .and_then(|r| r.get("kyc_session_id").and_then(|s| s.as_str()))
            .is_some();

    if should_poll {
        let session_id = rows
            .get(0)
            .and_then(|r| r.get("kyc_session_id").and_then(|s| s.as_str()))
            .unwrap_or("")
            .to_string();
        let url = format!("{}/v1/sessions/{}/decision", state.veriff.base_url.trim_end_matches('/'), session_id);
        info!(endpoint = %url, "GET Veriff decision");
        let client = reqwest::Client::new();
        let empty: &[u8] = &[];
        let sig = compute_hmac_hex(&state.veriff.shared_secret, empty);
        match client
            .get(&url)
            .header("x-auth-client", &state.veriff.api_key)
            .header("x-hmac-signature", sig)
            .send()
            .await
        {
            Ok(mut res) => {
                if res.status().is_success() {
                    let body = res.text().await.unwrap_or_default();
                    debug!(body = %body, "Veriff decision body");
                    let v: serde_json::Value = serde_json::from_str(&body).unwrap_or(serde_json::json!({}));
                    let status = v
                        .get("decision").and_then(|d| d.get("status")).and_then(|s| s.as_str())
                        .unwrap_or("pending").to_lowercase();
                    let approved = status == "approved";
                    let mapped = if approved { "approved" } else if status == "declined" { "rejected" } else { "pending" };
                    let payload = ProfileVerification {
                        kyc_status: Some(mapped.into()),
                        liveness_status: Some(mapped.into()),
                        kyc_provider: Some("veriff".into()),
                        kyc_session_id: Some(session_id.clone()),
                        verified_at: approved.then(|| chrono::Utc::now().to_rfc3339()),
                    };
                    let _ = update_profile(&state, &q.user_id, &payload).await;
                    // Re-fetch after update
                    let resp2 = state
                        .pg
                        .from("profiles")
                        .select("kyc_status,liveness_status,kyc_provider,kyc_session_id,verified_at")
                        .eq("id", &q.user_id)
                        .execute()
                        .await
                        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
                    let text2 = resp2.text().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
                    rows = serde_json::from_str(&text2).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
                } else {
                    debug!(status = %res.status(), "Veriff decision request failed");
                }
            }
            Err(e) => {
                debug!(error = %e, "Veriff decision request error");
            }
        }
    }

    Ok(Json(rows))
}

#[derive(Deserialize)]
struct VeriffWebhookDecision {
    status: String,
}

#[derive(Deserialize)]
struct VeriffWebhookSession {
    id: String,
}

#[derive(Deserialize)]
struct VeriffWebhookBody {
    #[serde(rename = "vendorData")]
    vendor_data: Option<String>,
    session: Option<VeriffWebhookSession>,
    decision: Option<VeriffWebhookDecision>,
}

fn constant_time_eq(a: &str, b: &str) -> bool {
    if a.len() != b.len() { return false; }
    let mut res = 0u8;
    for (x, y) in a.bytes().zip(b.bytes()) { res |= x ^ y; }
    res == 0
}

async fn veriff_webhook(State(state): State<AppState>, headers: HeaderMap, body_bytes: Bytes) -> Result<StatusCode, (StatusCode, String)> {
    // Accept either x-hmac-signature or vrf-hmac-sigature
    let sig_hdr = headers.get("x-hmac-signature").or_else(|| headers.get("vrf-hmac-sigature"));
    let provided = sig_hdr.and_then(|v| v.to_str().ok()).ok_or((StatusCode::UNAUTHORIZED, "missing signature".to_string()))?;
    let computed = compute_hmac_hex(&state.veriff.shared_secret, &body_bytes);
    if !constant_time_eq(&computed, provided) {
        warn!("Invalid webhook signature");
        return Err((StatusCode::UNAUTHORIZED, "invalid signature".into()));
    }

    let parsed: VeriffWebhookBody = serde_json::from_slice(&body_bytes).map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    let user_id = parsed.vendor_data.ok_or((StatusCode::BAD_REQUEST, "missing vendorData".into()))?;
    let status = parsed.decision.as_ref().map(|d| d.status.to_lowercase()).unwrap_or("pending".into());
    let approved = status == "approved";
    let mapped_status = if approved { "approved" } else if status == "declined" { "rejected" } else { "pending" };
    info!(%user_id, %mapped_status, "Received Veriff decision webhook");

    let payload = ProfileVerification {
        kyc_status: Some(mapped_status.into()),
        liveness_status: Some(mapped_status.into()),
        kyc_provider: Some("veriff".into()),
        kyc_session_id: parsed.session.map(|s| s.id),
        verified_at: approved.then(|| Utc::now().to_rfc3339()),
    };
    update_profile(&state, &user_id, &payload)
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
    let veriff_base_url = env::var("VERIFF_BASE_URL").expect("VERIFF_BASE_URL is required");
    let veriff_api_key = env::var("VERIFF_API_KEY").expect("VERIFF_API_KEY is required");
    let veriff_shared_secret = env::var("VERIFF_SHARED_SECRET").expect("VERIFF_SHARED_SECRET is required");

    // Init tracing
    let filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info"));
    tracing_subscriber::fmt().with_env_filter(filter).init();
    info!(port, endpoint_base = %veriff_base_url, "Starting likelee-server");

    let pg = Postgrest::new(format!("{}/rest/v1", supabase_url))
        .insert_header("apikey", supabase_service_key.clone())
        .insert_header("Authorization", format!("Bearer {}", supabase_service_key));

    let state = AppState { 
        pg,
        veriff: VeriffConfig { base_url: veriff_base_url, api_key: veriff_api_key, shared_secret: veriff_shared_secret },
    };

    let cors = CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any);

    let app = Router::new()
        .route("/api/kyc/session", post(create_session))
        .route("/api/kyc/status", get(get_status))
        .route("/api/dashboard", get(get_dashboard))
        .route("/webhooks/kyc/veriff", post(veriff_webhook))
        .route("/api/email/available", get(check_email))
        .route("/api/profile", post(upsert_profile))
        .route("/api/face-profiles", post(create_face_profile))
        .route("/api/face-profiles/:id", post(update_face_profile))
        .with_state(state)
        .layer(cors);

    let listener = tokio::net::TcpListener::bind(("0.0.0.0", port)).await.expect("bind port");
    axum::serve(listener, app).await.expect("server run");
}
