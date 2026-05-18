use crate::email;
use crate::errors::sanitize_db_error;
use crate::{auth::AuthUser, state::AppState};
use axum::http::StatusCode;
use serde_json::json;

pub async fn upsert_agency_talent_connection(
    state: &AppState,
    agency_id: &str,
    talent_id: Option<&str>,
    creator_id: &str,
    status: &str,
) -> Result<(), (StatusCode, String)> {
    let payload = json!({
        "agency_id": agency_id,
        "talent_id": talent_id,
        "creator_id": creator_id,
        "status": status,
        "updated_at": chrono::Utc::now().to_rfc3339(),
    });

    let existing_resp = state
        .pg
        .from("agency_talent_relationships")
        .select("id")
        .eq("agency_id", agency_id)
        .eq("creator_id", creator_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let existing_status = existing_resp.status();
    let existing_text = existing_resp.text().await.unwrap_or_default();
    if !existing_status.is_success() {
        return Err(sanitize_db_error(existing_status.as_u16(), existing_text));
    }
    let existing_rows: Vec<serde_json::Value> =
        serde_json::from_str(&existing_text).unwrap_or_default();

    let resp = if let Some(existing_id) = existing_rows
        .first()
        .and_then(|row| row.get("id"))
        .and_then(|v| v.as_str())
        .filter(|id| !id.trim().is_empty())
    {
        state
            .pg
            .from("agency_talent_relationships")
            .eq("id", existing_id)
            .update(payload.to_string())
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    } else {
        state
            .pg
            .from("agency_talent_relationships")
            .insert(payload.to_string())
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    };
    let resp_status = resp.status();
    if !resp_status.is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err(sanitize_db_error(resp_status.as_u16(), err));
    }
    Ok(())
}

pub async fn get_latest_contract_for_connection(
    state: &AppState,
    agency_id: &str,
    creator_id: &str,
) -> Result<Option<serde_json::Value>, (StatusCode, String)> {
    crate::agencies::marketplace_contracts::get_latest_contract_row_for_pair(
        state, agency_id, creator_id,
    )
    .await
}

pub async fn notify_agency_about_disconnect_request(
    state: &AppState,
    agency_id: &str,
    creator_name: &str,
    reason: Option<&str>,
) {
    let Ok((agency_name, agency_email)) =
        crate::agencies::marketplace_contracts::resolve_agency_identity(state, agency_id).await
    else {
        return;
    };

    if agency_email.trim().is_empty() {
        return;
    }

    let subject = format!(
        "{} requested to disconnect from {}",
        creator_name, agency_name
    );
    let mut body = format!(
        "{} has requested to disconnect from your active marketplace contract on Likelee.",
        creator_name
    );
    if let Some(text) = reason.filter(|value| !value.trim().is_empty()) {
        body.push_str(&format!("\n\nReason provided:\n{}", text.trim()));
    }
    body.push_str(
        "\n\nPlease review this request in your agency dashboard roster before approving the disconnect.",
    );

    let _ = email::send_plain_text_email(state, &agency_email, &subject, &body, Some(&agency_name));
}

pub async fn resolve_effective_creator_id(
    state: &AppState,
    user: &AuthUser,
) -> Result<String, (StatusCode, String)> {
    let resp = state
        .pg
        .from("agency_users")
        .select("creator_id")
        .or(format!("id.eq.{},user_id.eq.{}", user.id, user.id))
        .order("updated_at.desc")
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    let mapped = rows
        .first()
        .and_then(|r| r.get("creator_id"))
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    Ok(mapped.unwrap_or_else(|| user.id.clone()))
}
