use super::*;
use crate::{
    auth::AuthUser,
    state::AppState,
    team::{resolve_effective_agency_id, resolve_effective_brand_id},
};
use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use serde_json::json;
use tracing::{debug, error, info, warn};

pub async fn create_session(
    State(state): State<AppState>,
    user: AuthUser,
    Json(req): Json<SessionRequest>,
) -> Result<Json<SessionResponse>, (StatusCode, String)> {
    // For agencies and brands, resolve the effective organization ID so team members
    // can create KYC sessions for their organization (not just their own user ID).
    // This ensures team members share the same KYC verification as the organization owner.
    let profile_id = if user.role == "agency" {
        // Use resolved organization ID for agencies (team members get org ID)
        resolve_effective_agency_id(&state, &user).await?
    } else if user.role == "brand" {
        // For brands, also resolve organization ID
        resolve_effective_brand_id(&state, &user).await?
    } else {
        // For creators and other roles, use the requested or user ID
        let requested = req.organization_id.as_ref().unwrap_or(&user.id);
        resolve_profile_id_for_role(&state, &user, requested).await?
    };

    let current_status = get_current_kyc_status(&state, &profile_id, &user.role).await?;
    if current_status
        .as_deref()
        .map(normalize_veriff_status)
        .as_deref()
        == Some("approved")
    {
        return Err((StatusCode::CONFLICT, "kyc_already_approved".to_string()));
    }

    debug!(profile_id = %profile_id, "Creating Veriff session");
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

    // Track usage (agency monthly caps) - use resolved organization ID
    // so that team members' KYC sessions count against the org's cap
    if user.role == "agency" && !session_id.is_empty() {
        let row = json!({
            "agency_id": profile_id,
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
        kyc_rejection_reason: None,
        kyc_rejection_code: None,
    };
    update_verification_status(&state, &profile_id, &user.role, &payload)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    Ok(Json(SessionResponse {
        session_id,
        session_url,
        provider: "veriff".into(),
    }))
}

pub async fn get_status(
    State(state): State<AppState>,
    user: AuthUser,
    Query(q): Query<StatusQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // For agencies and brands, resolve the effective organization ID so team members
    // can view the organization's KYC status (not their own, which doesn't exist).
    let profile_id = if user.role == "agency" {
        resolve_effective_agency_id(&state, &user).await?
    } else if user.role == "brand" {
        resolve_effective_brand_id(&state, &user).await?
    } else {
        let requested = q.organization_id.as_ref().unwrap_or(&user.id);
        resolve_profile_id_for_role(&state, &user, requested).await?
    };
    let table = match user.role.as_str() {
        "agency" => "agencies",
        "brand" => "brands",
        _ => "creators",
    };

    let resp = state
        .pg
        .from(table)
        .select("kyc_status,liveness_status,kyc_provider,kyc_session_id,verified_at,kyc_rejection_reason,kyc_rejection_code")
        .eq("id", &profile_id)
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
                    let mapped = map_veriff_status(&status);
                    let (rejection_reason, rejection_code) =
                        extract_veriff_rejection_details(&v, &status);
                    let payload = ProfileVerification {
                        kyc_status: Some(mapped.into()),
                        liveness_status: Some(mapped.into()),
                        kyc_provider: Some("veriff".into()),
                        kyc_session_id: Some(session_id.clone()),
                        verified_at: approved.then(|| chrono::Utc::now().to_rfc3339()),
                        kyc_rejection_reason: rejection_reason,
                        kyc_rejection_code: rejection_code,
                    };
                    let _ =
                        update_verification_status(&state, &profile_id, &user.role, &payload).await;
                    let resp2 = state
                        .pg
                        .from(table)
                        .select(
                            "kyc_status,liveness_status,kyc_provider,kyc_session_id,verified_at,kyc_rejection_reason,kyc_rejection_code",
                        )
                        .eq("id", &profile_id)
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

    // Veriff webhook payload can have multiple shapes. We accept:
    // 1) { vendorData, decision: { status }, session: { id } }
    // 2) { verification: { vendorData, status, id, ... }, status: "success" }
    let v: serde_json::Value = serde_json::from_slice(&body_bytes)
        .map_err(|e| (axum::http::StatusCode::BAD_REQUEST, e.to_string()))?;
    debug!(body = %v, "Veriff webhook payload");

    let vendor_data_raw = json_get_str(&v, &["vendorData"])
        .or_else(|| json_get_str(&v, &["verification", "vendorData"]))
        .ok_or((
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

    let status = json_get_str(&v, &["decision", "status"])
        .or_else(|| json_get_str(&v, &["verification", "decision", "status"]))
        .or_else(|| json_get_str(&v, &["verification", "status"]))
        .unwrap_or("pending")
        .to_lowercase();
    let approved = status == "approved";
    let mapped_status = map_veriff_status(&status);
    let (rejection_reason, rejection_code) = extract_veriff_rejection_details(&v, &status);
    info!(%profile_id, %role, %mapped_status, "Received Veriff decision webhook");

    let session_id = json_get_str(&v, &["session", "id"])
        .or_else(|| json_get_str(&v, &["verification", "id"]))
        .map(|s| s.to_string());

    let payload = ProfileVerification {
        kyc_status: Some(mapped_status.into()),
        liveness_status: Some(mapped_status.into()),
        kyc_provider: Some("veriff".into()),
        kyc_session_id: session_id,
        verified_at: approved.then(|| Utc::now().to_rfc3339()),
        kyc_rejection_reason: rejection_reason,
        kyc_rejection_code: rejection_code,
    };
    update_verification_status(&state, profile_id, role, &payload)
        .await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(axum::http::StatusCode::OK)
}
