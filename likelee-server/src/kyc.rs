use crate::config::AppState;
use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use tracing::{debug, error, info, warn};

type HmacSha256 = Hmac<Sha256>;

#[derive(Deserialize)]
pub struct SessionRequest {
    pub user_id: Option<String>,
    pub organization_id: Option<String>,
    #[allow(dead_code)]
    #[serde(default)]
    pub return_url: Option<String>,
}

#[derive(Serialize)]
pub struct SessionResponse {
    pub session_id: String,
    pub session_url: String,
    pub provider: String,
}

#[derive(Serialize, Deserialize, Default)]
pub struct ProfileVerification {
    pub kyc_status: Option<String>,
    pub liveness_status: Option<String>,
    pub kyc_provider: Option<String>,
    pub kyc_session_id: Option<String>,
    pub verified_at: Option<String>,
}

async fn update_profile(
    state: &AppState,
    user_id: &str,
    payload: &ProfileVerification,
) -> Result<(), String> {
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

fn compute_hmac_hex(secret: &str, body: &[u8]) -> String {
    let mut mac =
        HmacSha256::new_from_slice(secret.as_bytes()).expect("HMAC can take key of any size");
    mac.update(body);
    let result = mac.finalize().into_bytes();
    hex::encode(result)
}

pub async fn create_session(
    State(state): State<AppState>,
    Json(req): Json<SessionRequest>,
) -> Result<Json<SessionResponse>, (StatusCode, String)> {
    let profile_id = req
        .user_id
        .as_ref()
        .or(req.organization_id.as_ref())
        .ok_or((
            StatusCode::BAD_REQUEST,
            "missing user_id or organization_id".to_string(),
        ))?;
    debug!(%profile_id, "Creating Veriff session");
    let veriff_body = VeriffCreateSessionBody {
        verification: VeriffVerification {
            vendor_data: profile_id,
            lang: None,
            features: None,
        },
    };
    let body_str = serde_json::to_string(&veriff_body)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let sig = compute_hmac_hex(&state.veriff.shared_secret, body_str.as_bytes());

    let client = reqwest::Client::new();
    let url = format!(
        "{}/v1/sessions",
        state.veriff.base_url.trim_end_matches('/')
    );
    info!(endpoint = %url, "POST Veriff create session");
    let res = client
        .post(&url)
        .header("x-auth-client", &state.veriff.api_key)
        .header("x-hmac-signature", sig)
        .header("content-type", "application/json")
        .body(body_str)
        .send()
        .await
        .map_err(|e| {
            (
                StatusCode::BAD_GATEWAY,
                format!("veriff request error: {e}"),
            )
        })?;

    if !res.status().is_success() {
        let status = res.status();
        let text = res.text().await.unwrap_or_default();
        error!(%status, body = %text, "Veriff create session failed");
        return Err((
            StatusCode::BAD_GATEWAY,
            format!("veriff error: {status} {text}"),
        ));
    }

    let body_text = res
        .text()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    debug!(body = %body_text, "Veriff create session success body");
    let v: serde_json::Value = serde_json::from_str(&body_text).map_err(|e| {
        (
            StatusCode::BAD_GATEWAY,
            format!("error decoding response body: {e}"),
        )
    })?;
    let (session_id, session_url) = if let (Some(id), Some(url)) = (
        v.get("session")
            .and_then(|s| s.get("id"))
            .and_then(|x| x.as_str()),
        v.get("session")
            .and_then(|s| s.get("url"))
            .and_then(|x| x.as_str()),
    ) {
        (id.to_string(), url.to_string())
    } else if let (Some(id), Some(url)) = (
        v.get("verification")
            .and_then(|s| s.get("id"))
            .and_then(|x| x.as_str()),
        v.get("verification")
            .and_then(|s| s.get("url"))
            .and_then(|x| x.as_str()),
    ) {
        (id.to_string(), url.to_string())
    } else if let Some(url) = v.get("url").and_then(|x| x.as_str()) {
        ("".to_string(), url.to_string())
    } else {
        error!(body = %body_text, "Unable to extract session id/url from Veriff response");
        return Err((StatusCode::BAD_GATEWAY, "unexpected veriff response".into()));
    };
    info!(%session_id, "Veriff session created");

    let payload = ProfileVerification {
        kyc_status: Some("pending".into()),
        liveness_status: Some("pending".into()),
        kyc_provider: Some("veriff".into()),
        kyc_session_id: if session_id.is_empty() {
            None
        } else {
            Some(session_id.clone())
        },
        verified_at: None,
    };
    update_profile(&state, profile_id, &payload)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    Ok(Json(SessionResponse {
        session_id,
        session_url,
        provider: "veriff".into(),
    }))
}

#[derive(Deserialize)]
pub struct StatusQuery {
    pub user_id: Option<String>,
    pub organization_id: Option<String>,
}

pub async fn get_status(
    State(state): State<AppState>,
    Query(q): Query<StatusQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let profile_id = q.user_id.as_ref().or(q.organization_id.as_ref()).ok_or((
        StatusCode::BAD_REQUEST,
        "missing user_id or organization_id".to_string(),
    ))?;
    let resp = state
        .pg
        .from("profiles")
        .select("kyc_status,liveness_status,kyc_provider,kyc_session_id,verified_at")
        .eq("id", profile_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let mut rows: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

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
        let url = format!(
            "{}/v1/sessions/{}/decision",
            state.veriff.base_url.trim_end_matches('/'),
            session_id
        );
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
            Ok(res) => {
                if res.status().is_success() {
                    let body = res.text().await.unwrap_or_default();
                    debug!(body = %body, "Veriff decision body");
                    let v: serde_json::Value =
                        serde_json::from_str(&body).unwrap_or(serde_json::json!({}));
                    let status = v
                        .get("decision")
                        .and_then(|d| d.get("status"))
                        .and_then(|s| s.as_str())
                        .unwrap_or("pending")
                        .to_lowercase();
                    let approved = status == "approved";
                    let mapped = if approved {
                        "approved"
                    } else if status == "declined" {
                        "rejected"
                    } else {
                        "pending"
                    };
                    let payload = ProfileVerification {
                        kyc_status: Some(mapped.into()),
                        liveness_status: Some(mapped.into()),
                        kyc_provider: Some("veriff".into()),
                        kyc_session_id: Some(session_id.clone()),
                        verified_at: approved.then(|| chrono::Utc::now().to_rfc3339()),
                    };
                    let _ = update_profile(&state, profile_id, &payload).await;
                    let resp2 = state
                        .pg
                        .from("profiles")
                        .select(
                            "kyc_status,liveness_status,kyc_provider,kyc_session_id,verified_at",
                        )
                        .eq("id", profile_id)
                        .execute()
                        .await
                        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
                    let text2 = resp2
                        .text()
                        .await
                        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
                    rows = serde_json::from_str(&text2)
                        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
                } else {
                    let status = res.status();
                    let body = res.text().await.unwrap_or_default();
                    warn!(%status, body = %body, "Veriff decision request failed");
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
    if a.len() != b.len() {
        return false;
    }
    let mut res = 0u8;
    for (x, y) in a.bytes().zip(b.bytes()) {
        res |= x ^ y;
    }
    res == 0
}

pub async fn veriff_webhook(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    body_bytes: axum::body::Bytes,
) -> Result<axum::http::StatusCode, (axum::http::StatusCode, String)> {
    let sig_hdr = headers
        .get("x-hmac-signature")
        .or_else(|| headers.get("vrf-hmac-signature"))
        .or_else(|| headers.get("x-veriff-signature"));
    let provided = sig_hdr.and_then(|v| v.to_str().ok()).ok_or((
        axum::http::StatusCode::UNAUTHORIZED,
        "missing signature".to_string(),
    ))?;
    let computed = compute_hmac_hex(&state.veriff.shared_secret, &body_bytes);
    if !constant_time_eq(&computed, provided) {
        warn!("Invalid webhook signature");
        return Err((
            axum::http::StatusCode::UNAUTHORIZED,
            "invalid signature".into(),
        ));
    }

    let parsed: VeriffWebhookBody = serde_json::from_slice(&body_bytes)
        .map_err(|e| (axum::http::StatusCode::BAD_REQUEST, e.to_string()))?;
    let user_id = parsed.vendor_data.ok_or((
        axum::http::StatusCode::BAD_REQUEST,
        "missing vendorData".into(),
    ))?;
    let status = parsed
        .decision
        .as_ref()
        .map(|d| d.status.to_lowercase())
        .unwrap_or("pending".into());
    let approved = status == "approved";
    let mapped_status = if approved {
        "approved"
    } else if status == "declined" {
        "rejected"
    } else {
        "pending"
    };
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
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(axum::http::StatusCode::OK)
}
