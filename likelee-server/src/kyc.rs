use crate::{auth::AuthUser, config::AppState};
use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use chrono::{Datelike, Utc};
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sha2::Sha256;
use tracing::{debug, error, info, warn};

use crate::entitlements::{get_agency_plan_tier, veriff_monthly_limit};

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

async fn update_verification_status(
    state: &AppState,
    profile_id: &str,
    role: &str,
    payload: &ProfileVerification,
) -> Result<(), String> {
    let table = match role {
        "agency" => "agencies",
        "brand" => "brands",
        _ => "creators",
    };

    let body = serde_json::to_string(payload).map_err(|e| e.to_string())?;
    match state
        .pg
        .from(table)
        .eq("id", profile_id)
        .update(body)
        .execute()
        .await
    {
        Ok(_) => {}
        Err(e) => {
            let msg = e.to_string();
            // If it's a "column does not exist" error, it might be an older migration state
            if msg.contains("42703") || (msg.contains("column") && msg.contains("does not exist")) {
                warn!(%msg, table, "Table missing verification columns; skipping update");
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
    callback: Option<&'a str>,
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
    user: AuthUser,
    Json(req): Json<SessionRequest>,
) -> Result<Json<SessionResponse>, (StatusCode, String)> {
    // Agencies are capped per-agency per month, and should not be able to create sessions on
    // behalf of arbitrary organization ids.
    let profile_id = if user.role == "agency" {
        &user.id
    } else {
        req.organization_id.as_ref().unwrap_or(&user.id)
    };

    if user.role == "agency" {
        let tier = get_agency_plan_tier(&state, &user.id).await?;
        let limit = veriff_monthly_limit(tier) as usize;

        let now = chrono::Utc::now();
        let month_start = chrono::DateTime::<chrono::Utc>::from_naive_utc_and_offset(
            chrono::NaiveDate::from_ymd_opt(now.year(), now.month(), 1)
                .unwrap_or_else(|| chrono::NaiveDate::from_ymd_opt(1970, 1, 1).unwrap())
                .and_hms_opt(0, 0, 0)
                .unwrap(),
            chrono::Utc,
        );
        let (next_year, next_month) = if now.month() == 12 {
            (now.year() + 1, 1)
        } else {
            (now.year(), now.month() + 1)
        };
        let next_month_start = chrono::DateTime::<chrono::Utc>::from_naive_utc_and_offset(
            chrono::NaiveDate::from_ymd_opt(next_year, next_month, 1)
                .unwrap_or_else(|| chrono::NaiveDate::from_ymd_opt(1970, 1, 1).unwrap())
                .and_hms_opt(0, 0, 0)
                .unwrap(),
            chrono::Utc,
        );

        if !state.kyc_bypass_veriff_limit {
            let usage_resp = state
                .pg
                .from("agency_veriff_sessions")
                .select("id")
                .eq("agency_id", &user.id)
                .gte("created_at", month_start.to_rfc3339())
                .lt("created_at", next_month_start.to_rfc3339())
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

            let status = usage_resp.status();
            let text = usage_resp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            if !status.is_success() {
                let code = StatusCode::from_u16(status.as_u16())
                    .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
                return Err((code, text));
            }
            let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
            if rows.len() >= limit {
                return Err((
                    StatusCode::FORBIDDEN,
                    "veriff_monthly_limit_reached".to_string(),
                ));
            }
        }
    }

    debug!(%profile_id, "Creating Veriff session");
    let vendor_data = format!("{}:{}", user.role, profile_id);
    let callback_url = req.return_url.as_deref().and_then(|url| {
        if url.starts_with("https://") {
            Some(url)
        } else {
            warn!(
                "Skipping Veriff return_url because it is not HTTPS: {}",
                url
            );
            None
        }
    });

    let veriff_body = VeriffCreateSessionBody {
        verification: VeriffVerification {
            vendor_data: &vendor_data,
            lang: None,
            callback: callback_url,
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

    // Track usage (agency monthly caps)
    if user.role == "agency" && !session_id.is_empty() {
        let row = json!({
            "agency_id": user.id,
            "veriff_session_id": session_id,
        });
        let _ = state
            .pg
            .from("agency_veriff_sessions")
            .insert(row.to_string())
            .execute()
            .await;
    }

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
    update_verification_status(&state, profile_id, &user.role, &payload)
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
    user: AuthUser,
    Query(q): Query<StatusQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let profile_id = q.organization_id.as_ref().unwrap_or(&user.id);
    let table = match user.role.as_str() {
        "agency" => "agencies",
        "brand" => "brands",
        _ => "creators",
    };

    let resp = state
        .pg
        .from(table)
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
        .as_array()
        .and_then(|a| a.first())
        .and_then(|r| r.get("kyc_status").and_then(|s| s.as_str()))
        .map(|s| s == "pending")
        .unwrap_or(false)
        && rows
            .as_array()
            .and_then(|a| a.first())
            .and_then(|r| r.get("kyc_session_id").and_then(|s| s.as_str()))
            .is_some();

    if should_poll {
        let session_id = rows
            .as_array()
            .and_then(|a| a.first())
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
        // Veriff expects HMAC of the query ID (session/verification id) for decision GET
        let sig = compute_hmac_hex(&state.veriff.shared_secret, session_id.as_bytes());
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
                    // Try multiple shapes: { decision: { status } } or { verification: { decision: { status } } }
                    let status = v
                        .get("decision")
                        .and_then(|d| d.get("status"))
                        .and_then(|s| s.as_str())
                        .or_else(|| {
                            v.get("verification")
                                .and_then(|vv| vv.get("decision"))
                                .and_then(|d| d.get("status"))
                                .and_then(|s| s.as_str())
                        })
                        .or_else(|| {
                            v.get("verification")
                                .and_then(|vv| vv.get("status"))
                                .and_then(|s| s.as_str())
                        })
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
                    let _ =
                        update_verification_status(&state, profile_id, &user.role, &payload).await;
                    let resp2 = state
                        .pg
                        .from(table)
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
    let vendor_data_raw = parsed.vendor_data.ok_or((
        axum::http::StatusCode::BAD_REQUEST,
        "missing vendorData".into(),
    ))?;

    // vendor_data format: "role:id"
    let parts: Vec<&str> = vendor_data_raw.splitn(2, ':').collect();
    let (role, profile_id) = if parts.len() == 2 {
        (parts[0], parts[1])
    } else {
        ("creator", parts[0]) // fallback for legacy sessions
    };
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
    info!(%profile_id, %role, %mapped_status, "Received Veriff decision webhook");

    let payload = ProfileVerification {
        kyc_status: Some(mapped_status.into()),
        liveness_status: Some(mapped_status.into()),
        kyc_provider: Some("veriff".into()),
        kyc_session_id: parsed.session.map(|s| s.id),
        verified_at: approved.then(|| Utc::now().to_rfc3339()),
    };
    update_verification_status(&state, profile_id, role, &payload)
        .await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(axum::http::StatusCode::OK)
}
