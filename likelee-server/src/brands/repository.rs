use crate::errors::sanitize_db_error;
use crate::state::AppState;
use axum::http::StatusCode;
use serde_json::json;

pub async fn create_brand_profile(
    state: &AppState,
    profile: &serde_json::Value,
) -> Result<(), (StatusCode, String)> {
    let resp = state
        .pg
        .from("brands")
        .insert(profile.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    let txt = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        return Err(sanitize_db_error(status.as_u16(), txt));
    }

    Ok(())
}

pub async fn update_brand_profile(
    state: &AppState,
    brand_id: &str,
    payload: &serde_json::Value,
) -> Result<(), (StatusCode, String)> {
    let resp = state
        .pg
        .from("brands")
        .auth(state.supabase_service_key.clone())
        .eq("id", brand_id)
        .update(payload.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !status.is_success() {
        return Err(sanitize_db_error(status.as_u16(), text));
    }

    Ok(())
}

pub async fn get_brand_profile(
    state: &AppState,
    brand_id: &str,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let resp = state
        .pg
        .from("brands")
        .select("*")
        .eq("id", brand_id)
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
        return Err(sanitize_db_error(status.as_u16(), text));
    }

    let rows: Vec<serde_json::Value> = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    rows.into_iter().next().ok_or((
        StatusCode::NOT_FOUND,
        json!({
            "error": "Brand profile not found.",
            "code": "profile_not_found"
        })
        .to_string(),
    ))
}

pub async fn list_brand_notifications(
    state: &AppState,
    brand_id: &str,
    limit: u32,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let resp = state
        .pg
        .from("brand_notifications")
        .select("id,agency_id,channel,from_label,subject,message,meta_json,read_at,created_at")
        .eq("brand_id", brand_id)
        .order("created_at.desc")
        .limit(limit as usize)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !status.is_success() {
        return Err(sanitize_db_error(status.as_u16(), text));
    }

    serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
}

pub async fn mark_notification_read(
    state: &AppState,
    brand_id: &str,
    notification_id: &str,
) -> Result<(), (StatusCode, String)> {
    let update = json!({
        "read_at": chrono::Utc::now().to_rfc3339()
    });

    let resp = state
        .pg
        .from("brand_notifications")
        .eq("id", notification_id)
        .eq("brand_id", brand_id)
        .update(update.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !status.is_success() {
        return Err(sanitize_db_error(status.as_u16(), text));
    }

    Ok(())
}

pub async fn get_notification_count(
    state: &AppState,
    brand_id: &str,
) -> Result<usize, (StatusCode, String)> {
    let resp = state
        .pg
        .from("brand_notifications")
        .select("id")
        .eq("brand_id", brand_id)
        .is("read_at", "null")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !status.is_success() {
        return Err(sanitize_db_error(status.as_u16(), text));
    }

    let notifications: Vec<serde_json::Value> = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(notifications.len())
}

pub async fn get_inbox_unread_count(state: &AppState, brand_id: &str) -> usize {
    let resp = state
        .pg
        .from("brand_activity_events")
        .select("id")
        .eq("brand_id", brand_id)
        .eq("subject_table", "campaign_offer_packages")
        .execute()
        .await;

    match resp {
        Ok(resp) => {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();

            if !status.is_success() {
                0
            } else {
                let events: Vec<serde_json::Value> =
                    serde_json::from_str(&text).unwrap_or_default();
                events.len()
            }
        }
        Err(_) => 0,
    }
}

pub async fn get_jobs_unread_count(state: &AppState, brand_id: &str) -> usize {
    let resp = state
        .pg
        .from("brand_activity_events")
        .select("id")
        .eq("brand_id", brand_id)
        .eq("subject_table", "job_postings")
        .execute()
        .await;

    match resp {
        Ok(resp) => {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();

            if !status.is_success() {
                0
            } else {
                let events: Vec<serde_json::Value> =
                    serde_json::from_str(&text).unwrap_or_default();
                events.len()
            }
        }
        Err(_) => 0,
    }
}

pub async fn mark_inbox_packages_viewed(state: &AppState, brand_id: &str) {
    let resp = state
        .pg
        .from("brand_activity_events")
        .delete()
        .eq("brand_id", brand_id)
        .eq("subject_table", "campaign_offer_packages")
        .execute()
        .await;

    match resp {
        Ok(resp) => {
            if !resp.status().is_success() {
                tracing::warn!("Failed to clear inbox activity events");
            }
        }
        Err(e) => {
            tracing::warn!("Error clearing inbox activity events: {}", e);
        }
    }
}

pub async fn mark_job_applications_viewed(state: &AppState, brand_id: &str) {
    let resp = state
        .pg
        .from("brand_activity_events")
        .delete()
        .eq("brand_id", brand_id)
        .eq("subject_table", "job_postings")
        .execute()
        .await;

    match resp {
        Ok(resp) => {
            if !resp.status().is_success() {
                tracing::warn!("Failed to clear job application activity events");
            }
        }
        Err(e) => {
            tracing::warn!("Error clearing job application activity events: {}", e);
        }
    }
}

pub async fn get_licensing_contracts_count(
    state: &AppState,
    brand_id: &str,
) -> Result<usize, (StatusCode, String)> {
    let resp = state
        .pg
        .from("brand_notifications")
        .select("id")
        .eq("brand_id", brand_id)
        .is("read_at", "null")
        .eq("meta_json->>type", "contract_ready")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !status.is_success() {
        return Err(sanitize_db_error(status.as_u16(), text));
    }

    let notifications: Vec<serde_json::Value> = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(notifications.len())
}
