use axum::http::StatusCode;
use serde_json::Value;

pub fn offer_contract_status_is_signed(value: &Value) -> bool {
    let st = value.as_str().unwrap_or("").trim().to_lowercase();
    st == "completed" || st == "signed"
}

pub fn offer_status_is_signed(value: &Value) -> bool {
    let st = value
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_lowercase();

    matches!(
        st.as_str(),
        "contract_fully_signed"
            | "signed"
            | "in_execution"
            | "deliverables_submitted"
            | "in_review"
            | "changes_requested"
            | "approved"
            | "completed"
    )
}

pub fn trim_non_empty(value: &str, field: &str) -> Result<String, (StatusCode, String)> {
    let out = value.trim().to_string();
    if out.is_empty() {
        return Err((StatusCode::BAD_REQUEST, format!("{field} is required")));
    }
    Ok(out)
}

pub fn is_creator_like(role: &str) -> bool {
    role == "creator" || role == "talent"
}

pub fn offer_status_counts_toward_campaign_slot(status: &str) -> bool {
    !matches!(
        status.trim().to_lowercase().as_str(),
        "cancelled" | "declined" | "expired" | "completed"
    )
}

pub fn campaign_is_past_end(campaign: &Value) -> bool {
    if campaign
        .get("completed_at")
        .and_then(|v| v.as_str())
        .map(|value| !value.trim().is_empty())
        .unwrap_or(false)
    {
        return true;
    }

    let start_date = campaign
        .get("start_date")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim();
    if start_date.is_empty() {
        return false;
    }

    let Ok(start) = chrono::NaiveDate::parse_from_str(start_date, "%Y-%m-%d") else {
        return false;
    };
    let duration_days = campaign
        .get("duration_days")
        .and_then(|v| v.as_i64())
        .filter(|value| *value > 0)
        .unwrap_or(30);
    let end = start + chrono::Duration::days(duration_days.saturating_sub(1));
    chrono::Utc::now().date_naive() > end
}

pub fn docuseal_role_key(role: &str) -> String {
    role.chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .flat_map(|c| c.to_lowercase())
        .collect::<String>()
}

pub fn is_submitter_signed(status: &str) -> bool {
    matches!(
        status.trim().to_lowercase().as_str(),
        "completed" | "signed" | "done"
    )
}
