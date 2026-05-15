use crate::state::AppState;
use axum::http::StatusCode;
use serde_json::Value;

pub fn supabase_auth_base_url(state: &AppState) -> String {
    state
        .supabase_url
        .trim_end_matches('/')
        .trim_end_matches("/rest/v1")
        .to_string()
}

pub async fn lookup_auth_user_email(state: &AppState, user_id: &str) -> Option<String> {
    let user_id = user_id.trim();
    if user_id.is_empty() {
        return None;
    }

    let url = format!(
        "{}/auth/v1/admin/users/{}",
        supabase_auth_base_url(state),
        user_id
    );
    let client = reqwest::Client::new();
    let resp = client
        .get(&url)
        .header("apikey", state.supabase_service_key.clone())
        .header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        )
        .send()
        .await
        .ok()?;

    if !resp.status().is_success() {
        return None;
    }

    let payload: Value = resp.json().await.ok()?;
    payload
        .get("email")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

pub async fn lookup_role_from_supabase_auth(state: &AppState, user_id: &str) -> Option<String> {
    let user_id = user_id.trim();
    if user_id.is_empty() {
        return None;
    }

    let url = format!(
        "{}/auth/v1/admin/users/{}",
        supabase_auth_base_url(state),
        user_id
    );
    let client = reqwest::Client::new();
    let resp = client
        .get(&url)
        .header("apikey", state.supabase_service_key.clone())
        .header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        )
        .send()
        .await
        .ok()?;

    if !resp.status().is_success() {
        return None;
    }

    let payload: Value = resp.json().await.ok()?;
    payload
        .get("user_metadata")
        .and_then(|v| v.get("role"))
        .and_then(|v| v.as_str())
        .or_else(|| {
            payload
                .get("app_metadata")
                .and_then(|v| v.get("role"))
                .and_then(|v| v.as_str())
        })
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
}

pub async fn lookup_role_from_profiles(state: &AppState, user_id: &str) -> Option<String> {
    let candidates = [
        ("agencies", "agency"),
        ("brands", "brand"),
        ("creators", "creator"),
    ];

    for (table, role) in candidates {
        let Ok(resp) = state
            .pg
            .from(table)
            .select("id")
            .eq("id", user_id)
            .limit(1)
            .execute()
            .await
        else {
            continue;
        };

        if !resp.status().is_success() {
            continue;
        }

        let Ok(text) = resp.text().await else {
            continue;
        };
        let Ok(rows) = serde_json::from_str::<Value>(&text) else {
            continue;
        };
        if rows
            .as_array()
            .map(|items| !items.is_empty())
            .unwrap_or(false)
        {
            return Some(role.to_string());
        }
    }

    None
}

pub async fn existing_profile_role_for_email(
    state: &AppState,
    email: &str,
) -> Result<Option<&'static str>, (StatusCode, String)> {
    let normalized = crate::auth::service::normalize_signup_email(email)?;
    let candidates = [
        ("agencies", "agency"),
        ("brands", "brand"),
        ("creators", "creator"),
    ];

    for (table, role) in candidates {
        let resp = state
            .pg
            .from(table)
            .select("id")
            .eq("email", normalized.as_str())
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
            return Err(crate::errors::sanitize_db_error(status.as_u16(), text));
        }

        let rows: Value = serde_json::from_str(&text)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if rows.as_array().map(|a| !a.is_empty()).unwrap_or(false) {
            return Ok(Some(role));
        }
    }

    Ok(None)
}
