use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use futures::future::join_all;
use serde_json::json;
use tracing::{info, warn};

use crate::{auth::AuthUser, config::AppState};

use super::{
    current_session::identify_current_session,
    types::{
        ListSessionsResponse, LoginEvent, LoginHistoryParams, LoginHistoryResponse,
        RawAuditLogEntry, RawSupabaseSession, RevokeAllResponse, SessionInfo,
    },
    ua_parser::parse_user_agent,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

fn supabase_auth_base(state: &AppState) -> String {
    state
        .supabase_url
        .trim_end_matches('/')
        .trim_end_matches("/rest/v1")
        .to_string()
}

fn session_error(status: StatusCode, code: &str, message: &str) -> (StatusCode, String) {
    (
        status,
        json!({ "error": code, "message": message }).to_string(),
    )
}

/// Extract the `sid` claim from the caller's raw JWT without re-validating it
/// (validation already happened in the `AuthUser` extractor).
fn extract_sid_from_token(token: &str) -> Option<String> {
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return None;
    }
    let payload = parts[1];
    // Base64url decode (no padding)
    let decoded =
        base64::Engine::decode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, payload).ok()?;
    let claims: serde_json::Value = serde_json::from_slice(&decoded).ok()?;
    claims
        .get("session_id")
        .or_else(|| claims.get("sid"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
}

/// Fetch all raw sessions for a user from the Supabase Admin API.
async fn fetch_raw_sessions(
    state: &AppState,
    user_id: &str,
) -> Result<Vec<RawSupabaseSession>, (StatusCode, String)> {
    let url = format!(
        "{}/auth/v1/admin/users/{}/sessions",
        supabase_auth_base(state),
        user_id
    );

    let client = reqwest::Client::new();
    let resp = client
        .get(&url)
        .header("apikey", &state.supabase_service_key)
        .header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        )
        .send()
        .await
        .map_err(|e| {
            warn!("[sessions] Network error fetching sessions: {e}");
            session_error(
                StatusCode::BAD_GATEWAY,
                "session_service_unavailable",
                "Could not reach the session service. Please try again.",
            )
        })?;

    let status = resp.status();

    if status == reqwest::StatusCode::NOT_FOUND {
        // Supabase free tier or endpoint not available — return empty list gracefully
        warn!("[sessions] Supabase sessions endpoint returned 404 — may be on free tier");
        return Ok(vec![]);
    }

    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        warn!("[sessions] Supabase sessions endpoint error {status}: {body}");
        return Err(session_error(
            StatusCode::BAD_GATEWAY,
            "session_service_unavailable",
            "Session service returned an error. Please try again.",
        ));
    }

    // Supabase returns either `[...]` or `{ "sessions": [...] }`
    let body = resp.text().await.map_err(|e| {
        session_error(
            StatusCode::BAD_GATEWAY,
            "session_service_unavailable",
            &e.to_string(),
        )
    })?;

    let sessions: Vec<RawSupabaseSession> = if body.trim_start().starts_with('[') {
        serde_json::from_str(&body).unwrap_or_default()
    } else {
        let val: serde_json::Value = serde_json::from_str(&body).unwrap_or_default();
        val.get("sessions")
            .and_then(|v| serde_json::from_value(v.clone()).ok())
            .unwrap_or_default()
    };

    Ok(sessions)
}

/// Transform a `RawSupabaseSession` into a `SessionInfo`.
fn to_session_info(raw: &RawSupabaseSession, current_session_id: Option<&str>) -> SessionInfo {
    let (device_label, device_type) = parse_user_agent(raw.user_agent.as_deref().unwrap_or(""));

    let last_active_at = raw
        .updated_at
        .clone()
        .or_else(|| raw.created_at.clone())
        .unwrap_or_default();

    SessionInfo {
        id: raw.id.clone(),
        created_at: raw.created_at.clone().unwrap_or_default(),
        last_active_at,
        ip_address: raw.ip.clone(),
        user_agent: raw.user_agent.clone(),
        device_label,
        device_type,
        is_current: current_session_id
            .map(|sid| sid == raw.id.as_str())
            .unwrap_or(false),
    }
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/// `GET /api/auth/sessions`
///
/// Returns all active sessions for the authenticated user, with the current
/// session identified and sorted first.
pub async fn list_sessions(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<ListSessionsResponse>, (StatusCode, String)> {
    let raw_sessions = fetch_raw_sessions(&state, &user.id).await?;

    // Extract `sid` from the caller's JWT to identify the current session
    let sid_claim = extract_sid_from_token(&user.access_token);
    let caller_ua = None::<&str>; // user_agent not available from AuthUser; sid is preferred

    let current_session_id =
        identify_current_session(&raw_sessions, sid_claim.as_deref(), caller_ua);

    let mut sessions: Vec<SessionInfo> = raw_sessions
        .iter()
        .map(|raw| to_session_info(raw, current_session_id.as_deref()))
        .collect();

    // Sort: current session first, then by last_active_at descending
    sessions.sort_by(|a, b| {
        if a.is_current != b.is_current {
            return b.is_current.cmp(&a.is_current); // current first
        }
        b.last_active_at.cmp(&a.last_active_at)
    });

    info!(
        user_id = %user.id,
        session_count = sessions.len(),
        current_session_id = ?current_session_id,
        "[sessions] Listed sessions"
    );

    Ok(Json(ListSessionsResponse {
        sessions,
        current_session_id,
    }))
}

/// `DELETE /api/auth/sessions/:session_id`
///
/// Revokes a specific session. Returns 403 if the caller tries to revoke their
/// own current session. Treats 404 from Supabase as success (idempotent).
pub async fn revoke_session(
    State(state): State<AppState>,
    user: AuthUser,
    Path(session_id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let session_id = session_id.trim().to_string();
    if session_id.is_empty() {
        return Err(session_error(
            StatusCode::BAD_REQUEST,
            "invalid_session_id",
            "Session ID must not be empty.",
        ));
    }

    // Guard: prevent revoking the caller's own current session
    let sid_claim = extract_sid_from_token(&user.access_token);
    if let Some(ref sid) = sid_claim {
        if sid.trim() == session_id.as_str() {
            return Err(session_error(
                StatusCode::FORBIDDEN,
                "cannot_revoke_current_session",
                "You cannot revoke your current session. Sign out instead.",
            ));
        }
    }

    // Verify the session belongs to this user before revoking
    let raw_sessions = fetch_raw_sessions(&state, &user.id).await?;
    let session_belongs_to_user = raw_sessions.iter().any(|s| s.id == session_id);
    if !session_belongs_to_user {
        // Treat as success — session is already gone or never existed for this user
        return Ok(Json(json!({ "success": true })));
    }

    let url = format!(
        "{}/auth/v1/admin/users/{}/sessions/{}",
        supabase_auth_base(&state),
        user.id,
        session_id
    );

    let client = reqwest::Client::new();
    let resp = client
        .delete(&url)
        .header("apikey", &state.supabase_service_key)
        .header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        )
        .send()
        .await
        .map_err(|e| {
            warn!("[sessions] Network error revoking session {session_id}: {e}");
            session_error(
                StatusCode::BAD_GATEWAY,
                "session_service_unavailable",
                "Could not reach the session service. Please try again.",
            )
        })?;

    let status = resp.status();

    // 404 = already revoked — treat as success (idempotent)
    if status == reqwest::StatusCode::NOT_FOUND || status.is_success() {
        info!(
            user_id = %user.id,
            session_id = %session_id,
            "[sessions] Session revoked"
        );
        return Ok(Json(json!({ "success": true })));
    }

    let body = resp.text().await.unwrap_or_default();
    warn!("[sessions] Failed to revoke session {session_id}: {status} — {body}");
    Err(session_error(
        StatusCode::BAD_GATEWAY,
        "session_service_unavailable",
        "Failed to revoke session. Please try again.",
    ))
}

/// `DELETE /api/auth/sessions`
///
/// Revokes all sessions except the caller's current session.
/// Uses concurrent requests for performance.
pub async fn revoke_all_other_sessions(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<RevokeAllResponse>, (StatusCode, String)> {
    let raw_sessions = fetch_raw_sessions(&state, &user.id).await?;

    let sid_claim = extract_sid_from_token(&user.access_token);
    let current_session_id = identify_current_session(&raw_sessions, sid_claim.as_deref(), None);

    // Filter out the current session — never revoke it
    let to_revoke: Vec<&RawSupabaseSession> = raw_sessions
        .iter()
        .filter(|s| {
            current_session_id
                .as_deref()
                .map(|sid| s.id != sid)
                .unwrap_or(true)
        })
        .collect();

    if to_revoke.is_empty() {
        return Ok(Json(RevokeAllResponse { revoked_count: 0 }));
    }

    let client = reqwest::Client::new();
    let base_url = supabase_auth_base(&state);
    let user_id = user.id.clone();
    let service_key = state.supabase_service_key.clone();

    // Issue all DELETE requests concurrently
    let futures: Vec<_> = to_revoke
        .iter()
        .map(|session| {
            let url = format!(
                "{}/auth/v1/admin/users/{}/sessions/{}",
                base_url, user_id, session.id
            );
            let client = client.clone();
            let key = service_key.clone();
            async move {
                client
                    .delete(&url)
                    .header("apikey", &key)
                    .header("Authorization", format!("Bearer {}", key))
                    .send()
                    .await
            }
        })
        .collect();

    let results = join_all(futures).await;

    let revoked_count = results
        .iter()
        .filter(|r| {
            r.as_ref()
                .map(|resp| {
                    resp.status().is_success() || resp.status() == reqwest::StatusCode::NOT_FOUND
                })
                .unwrap_or(false)
        })
        .count();

    info!(
        user_id = %user.id,
        revoked_count = revoked_count,
        total_attempted = to_revoke.len(),
        "[sessions] Bulk revoke completed"
    );

    Ok(Json(RevokeAllResponse { revoked_count }))
}

/// `GET /api/auth/login-history`
///
/// Returns recent login-related audit log entries for the authenticated user.
/// Capped at `limit` (default 50, max 100).
pub async fn get_login_history(
    State(state): State<AppState>,
    user: AuthUser,
    Query(params): Query<LoginHistoryParams>,
) -> Result<Json<LoginHistoryResponse>, (StatusCode, String)> {
    let limit = params.limit.unwrap_or(50).min(100);

    let url = format!(
        "{}/auth/v1/admin/users/{}/audit-log-entries",
        supabase_auth_base(&state),
        user.id
    );

    let client = reqwest::Client::new();
    let resp = client
        .get(&url)
        .header("apikey", &state.supabase_service_key)
        .header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        )
        .send()
        .await
        .map_err(|e| {
            warn!("[sessions] Network error fetching login history: {e}");
            session_error(
                StatusCode::BAD_GATEWAY,
                "session_service_unavailable",
                "Could not reach the session service. Please try again.",
            )
        })?;

    let status = resp.status();

    if status == reqwest::StatusCode::NOT_FOUND {
        // Free tier or endpoint unavailable — return empty history gracefully
        return Ok(Json(LoginHistoryResponse {
            events: vec![],
            total: 0,
        }));
    }

    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        warn!("[sessions] Audit log endpoint error {status}: {body}");
        return Err(session_error(
            StatusCode::BAD_GATEWAY,
            "session_service_unavailable",
            "Could not fetch login history. Please try again.",
        ));
    }

    let body = resp.text().await.unwrap_or_default();
    let raw_entries: Vec<RawAuditLogEntry> = if body.trim_start().starts_with('[') {
        serde_json::from_str(&body).unwrap_or_default()
    } else {
        let val: serde_json::Value = serde_json::from_str(&body).unwrap_or_default();
        val.get("audit_log_entries")
            .or_else(|| val.get("entries"))
            .and_then(|v| serde_json::from_value(v.clone()).ok())
            .unwrap_or_default()
    };

    // Login-related event types we care about
    const LOGIN_EVENTS: &[&str] = &[
        "login",
        "logout",
        "token_refreshed",
        "mfa_verified",
        "user.signed_in",
        "user.signed_out",
        "token.refreshed",
        "mfa.challenge_verified",
    ];

    let events: Vec<LoginEvent> = raw_entries
        .iter()
        .filter_map(|entry| {
            let raw_event_type = entry
                .payload
                .as_ref()
                .and_then(|p| p.get("action").or_else(|| p.get("event_type")))
                .and_then(|v| v.as_str())
                .unwrap_or("");

            // Normalise Supabase event type names to our schema
            let event_type = match raw_event_type {
                "user.signed_in" | "login" => "login",
                "user.signed_out" | "logout" => "logout",
                "token.refreshed" | "token_refreshed" => "token_refreshed",
                "mfa.challenge_verified" | "mfa_verified" => "mfa_verified",
                other if LOGIN_EVENTS.contains(&other) => other,
                _ => return None, // skip non-login events
            };

            let ua = entry
                .payload
                .as_ref()
                .and_then(|p| {
                    p.get("user_agent")
                        .or_else(|| p.get("traits").and_then(|t| t.get("user_agent")))
                })
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            let ip = entry.ip_address.clone().or_else(|| {
                entry
                    .payload
                    .as_ref()
                    .and_then(|p| {
                        p.get("ip_address")
                            .or_else(|| p.get("traits").and_then(|t| t.get("ip_address")))
                    })
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            });

            let (device_label, _) = parse_user_agent(ua.as_deref().unwrap_or(""));

            Some(LoginEvent {
                id: entry
                    .id
                    .clone()
                    .unwrap_or_else(|| uuid::Uuid::new_v4().to_string()),
                event_type: event_type.to_string(),
                created_at: entry.created_at.clone().unwrap_or_default(),
                ip_address: ip,
                user_agent: ua,
                device_label,
            })
        })
        .take(limit)
        .collect();

    let total = events.len();

    Ok(Json(LoginHistoryResponse { events, total }))
}
