use super::*;
use crate::{auth::AuthUser, state::AppState};
use axum::http::StatusCode;
use chrono::Utc;
use hmac::Mac;
use serde_json::json;
use tracing::{info, warn};

pub async fn resolve_profile_id_for_role(
    state: &AppState,
    user: &AuthUser,
    requested_profile_id: &str,
) -> Result<String, (StatusCode, String)> {
    if user.role != "creator" {
        return Ok(requested_profile_id.to_string());
    }

    // For creators, historically some rows may have been created with a random UUID
    // rather than auth.users.id. If id lookup fails, fall back to email lookup.
    let by_id = state
        .pg
        .from("creators")
        .select("id")
        .eq("id", requested_profile_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text = by_id
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let rows: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let found = rows.as_array().map(|a| !a.is_empty()).unwrap_or(false);
    if found {
        return Ok(requested_profile_id.to_string());
    }

    let email = user.email.as_deref().ok_or((
        StatusCode::BAD_REQUEST,
        "missing email for creator profile lookup".to_string(),
    ))?;
    let by_email = state
        .pg
        .from("creators")
        .select("id")
        .eq("email", email)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text2 = by_email
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let rows2: serde_json::Value = serde_json::from_str(&text2)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if let Some(resolved) = rows2
        .as_array()
        .and_then(|a| a.first())
        .and_then(|r| r.get("id"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
    {
        return Ok(resolved);
    }

    let now = Utc::now().to_rfc3339();
    let stub_profile = json!({
        "id": requested_profile_id,
        "email": email,
        "created_at": now,
        "updated_at": now,
    });
    let insert_resp = state
        .pg
        .from("creators")
        .insert(stub_profile.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let insert_status = insert_resp.status();
    let insert_text = insert_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if insert_status.is_success() {
        info!(
            profile_id = %requested_profile_id,
            "Created placeholder creator profile for KYC"
        );
        return Ok(requested_profile_id.to_string());
    }

    warn!(
        profile_id = %requested_profile_id,
        status = %insert_status,
        body = %insert_text,
        "Failed to create placeholder creator profile; retrying email lookup"
    );

    let retry_resp = state
        .pg
        .from("creators")
        .select("id")
        .eq("email", email)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let retry_status = retry_resp.status();
    let retry_text = retry_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !retry_status.is_success() {
        return Err((
            StatusCode::from_u16(retry_status.as_u16())
                .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
            retry_text,
        ));
    }
    let retry_rows: serde_json::Value = serde_json::from_str(&retry_text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let resolved = retry_rows
        .as_array()
        .and_then(|a| a.first())
        .and_then(|r| r.get("id"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or((
            StatusCode::NOT_FOUND,
            "creator profile not found".to_string(),
        ))?;

    Ok(resolved)
}

pub async fn update_verification_status(
    state: &AppState,
    profile_id: &str,
    role: &str,
    payload: &ProfileVerification,
) -> Result<(), String> {
    let table = table_for_role(role);

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

pub fn table_for_role(role: &str) -> &'static str {
    match role {
        "agency" => "agencies",
        "brand" => "brands",
        _ => "creators",
    }
}

pub async fn get_current_kyc_status(
    state: &AppState,
    profile_id: &str,
    role: &str,
) -> Result<Option<String>, (StatusCode, String)> {
    let resp = state
        .pg
        .from(table_for_role(role))
        .select("kyc_status")
        .eq("id", profile_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !status.is_success() {
        let code =
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err(crate::errors::sanitize_db_error(code.as_u16(), text));
    }

    let rows: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(rows
        .as_array()
        .and_then(|items| items.first())
        .and_then(|row| row.get("kyc_status"))
        .and_then(|value| value.as_str())
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty()))
}

pub fn compute_hmac_hex(secret: &str, body: &[u8]) -> String {
    let mut mac =
        HmacSha256::new_from_slice(secret.as_bytes()).expect("HMAC can take key of any size");
    mac.update(body);
    let result = mac.finalize().into_bytes();
    hex::encode(result)
}

pub fn normalize_veriff_status(status: &str) -> String {
    status.trim().to_lowercase()
}

pub fn map_veriff_status(status: &str) -> &'static str {
    match normalize_veriff_status(status).as_str() {
        "approved" => "approved",
        "declined" | "expired" | "abandoned" => "rejected",
        _ => "pending",
    }
}

pub fn humanize_machine_text(value: &str) -> String {
    let normalized = value
        .trim()
        .replace(['_', '-'], " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");

    if normalized.is_empty() {
        return normalized;
    }

    let looks_like_code = normalized
        .chars()
        .all(|ch| ch.is_ascii_uppercase() || ch.is_ascii_digit() || ch == ' ');

    if !looks_like_code {
        return normalized;
    }

    normalized
        .to_lowercase()
        .split_whitespace()
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                Some(first) => format!("{}{}", first.to_uppercase(), chars.as_str()),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

pub fn json_get_string(v: &serde_json::Value, path: &[&str]) -> Option<String> {
    json_get_str(v, path)
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

pub fn fallback_veriff_reason(status: &str) -> Option<String> {
    match normalize_veriff_status(status).as_str() {
        "declined" => Some("Verification was not approved.".to_string()),
        "expired" => Some("Verification session expired before completion.".to_string()),
        "abandoned" => Some("Verification was started but not completed.".to_string()),
        "resubmission_requested" => {
            Some("Additional verification is required before approval.".to_string())
        }
        _ => None,
    }
}

pub fn extract_veriff_rejection_details(
    v: &serde_json::Value,
    raw_status: &str,
) -> (Option<String>, Option<String>) {
    let status = normalize_veriff_status(raw_status);
    if status == "approved" || status == "pending" || status == "review" {
        return (None, None);
    }

    let reason_code = json_get_string(v, &["verification", "reasonCode"])
        .or_else(|| json_get_string(v, &["verification", "decision", "reasonCode"]))
        .or_else(|| json_get_string(v, &["decision", "reasonCode"]))
        .or_else(|| json_get_string(v, &["reasonCode"]));

    let reason = json_get_string(v, &["verification", "reason"])
        .or_else(|| json_get_string(v, &["verification", "decision", "reason"]))
        .or_else(|| json_get_string(v, &["decision", "reason"]))
        .or_else(|| json_get_string(v, &["reason"]))
        .or_else(|| reason_code.as_deref().map(humanize_machine_text))
        .or_else(|| fallback_veriff_reason(&status));

    (reason, reason_code)
}

pub fn json_get_str<'a>(v: &'a serde_json::Value, path: &[&str]) -> Option<&'a str> {
    let mut cur = v;
    for p in path {
        cur = cur.get(*p)?;
    }
    cur.as_str()
}

pub fn constant_time_eq(a: &str, b: &str) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut res = 0u8;
    for (x, y) in a.bytes().zip(b.bytes()) {
        res |= x ^ y;
    }
    res == 0
}
