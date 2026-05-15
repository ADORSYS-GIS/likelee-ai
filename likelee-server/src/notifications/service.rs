use axum::http::StatusCode;

use crate::notifications::BrandNotificationRequest;
use crate::state::AppState;
use serde_json::json;

pub fn classify_calendly_failure(error: &str) -> &'static str {
    let normalized = error.to_ascii_lowercase();

    if normalized.contains("token") {
        "token"
    } else if normalized.contains("mapping") {
        "mapping"
    } else if normalized.contains("not configured")
        || normalized.contains("disabled for this agency")
        || normalized.contains("agency settings")
    {
        "configuration"
    } else if normalized.contains("in the past")
        || normalized.contains("must be in the future")
        || normalized.contains("past booking")
    {
        "timing"
    } else if normalized.contains("no longer available")
        || normalized.contains("already_filled")
        || normalized.contains("slot")
        || normalized.contains("filled")
    {
        "availability"
    } else if normalized.contains("email")
        || normalized.contains("recipient")
        || normalized.contains("contact")
    {
        "recipient"
    } else if normalized.contains("webhook") {
        "webhook"
    } else if normalized.contains("event type")
        || normalized.contains("location")
        || normalized.contains("invitee")
    {
        "event_type"
    } else {
        "unknown"
    }
}

pub fn non_empty_string(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}

pub async fn is_notification_enabled(
    state: &AppState,
    agency_id: &str,
    event_key: &str,
    channel: &str,
    talent_id: Option<&str>,
) -> bool {
    let resp_res = state
        .pg
        .from("agency_notification_settings")
        .select("prefs")
        .eq("agency_id", agency_id)
        .single()
        .execute()
        .await;

    let Ok(resp) = resp_res else {
        return true;
    };
    if !resp.status().is_success() {
        return true;
    }

    let Ok(text) = resp.text().await else {
        return true;
    };
    let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) else {
        return true;
    };

    let Some(prefs) = json.get("prefs").and_then(|p| p.as_array()) else {
        return true;
    };

    let mut enabled = true;

    // 1. Check global event setting
    if let Some(global) = prefs
        .iter()
        .find(|p| p.get("key").and_then(|k| k.as_str()) == Some(event_key))
    {
        if let Some(chan_val) = global
            .get("channels")
            .and_then(|c| c.get(channel))
            .and_then(|v| v.as_bool())
        {
            enabled = chan_val;
        }
    }

    // 2. Check talent override
    if let Some(tid) = talent_id {
        let override_key = format!("athlete:{}", tid);
        if let Some(over) = prefs
            .iter()
            .find(|p| p.get("key").and_then(|k| k.as_str()) == Some(&override_key))
        {
            if let Some(chan_val) = over
                .get("channels")
                .and_then(|c| c.get(channel))
                .and_then(|v| v.as_bool())
            {
                enabled = chan_val;
            }
        }
    }

    enabled
}

pub async fn send_brand_notification(
    state: &AppState,
    brand_id: &str,
    agency_id: Option<&str>,
    subject: &str,
    message: &str,
    meta_json: serde_json::Value,
    notify_email: bool,
) -> Result<(), (StatusCode, String)> {
    // 1. Resolve brand email
    let resp = state
        .pg
        .from("brands")
        .select("email")
        .eq("id", brand_id)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        return Err((StatusCode::NOT_FOUND, "brand_not_found".to_string()));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let brand_data: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let brand_email = brand_data.get("email").and_then(|v| v.as_str());

    // 2. Persist to in-app inbox
    let insert = json!({
        "brand_id": brand_id,
        "agency_id": agency_id,
        "subject": subject,
        "message": message,
        "meta_json": meta_json,
    });

    if let Err(e) = state
        .pg
        .from("brand_notifications")
        .insert(insert.to_string())
        .execute()
        .await
    {
        tracing::warn!(error = %e, brand_id, "failed to persist brand notification");
    }

    // 3. Send email if enabled
    if notify_email {
        if let Some(email) = brand_email {
            if let Err((code, err)) =
                crate::email::send_plain_text_email(state, email, subject, message, None)
            {
                tracing::warn!(
                    status = %code,
                    error = %err,
                    brand_id,
                    "failed to send brand notification email"
                );
            }
        }
    }

    Ok(())
}

pub async fn notify_brand_if_enabled(
    state: &AppState,
    request: BrandNotificationRequest<'_>,
) -> Result<(), (StatusCode, String)> {
    let resp = state
        .pg
        .from("brands")
        .select("notification_prefs")
        .eq("id", request.brand_id)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        return Ok(());
    }

    let prefs: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let notify_enabled = prefs
        .get("notification_prefs")
        .and_then(|p| p.get(request.pref_key))
        .and_then(|v| v.as_bool())
        .unwrap_or(true);

    if !notify_enabled {
        return Ok(());
    }

    send_brand_notification(
        state,
        request.brand_id,
        request.agency_id,
        request.subject,
        request.message,
        request.meta_json,
        request.notify_email,
    )
    .await
}
