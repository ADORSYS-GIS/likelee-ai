use crate::errors::sanitize_db_error;
use crate::{
    auth::{AuthUser, RoleGuard},
    config::AppState,
    email::send_plain_email_with_from_name,
};
use axum::{extract::State, http::StatusCode, Json};
use serde::Deserialize;
use serde_json::json;

fn get_string(row: &serde_json::Value, keys: &[&str]) -> Option<String> {
    for k in keys {
        if let Some(v) = row.get(*k) {
            if let Some(s) = v.as_str() {
                let t = s.trim();
                if !t.is_empty() {
                    return Some(t.to_string());
                }
            }
        }
    }
    None
}

pub async fn list_agency_clients(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    RoleGuard::new(vec!["agency"]).check(&user.role)?;

    let resp = state
        .pg
        .from("agency_clients")
        .select("*")
        .eq("agency_id", &user.id)
        .order("created_at.desc")
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

    let v: serde_json::Value =
        serde_json::from_str(&text).unwrap_or_else(|_| serde_json::json!([]));

    Ok(Json(v))
}

#[derive(Deserialize)]
pub struct ShareCompCardRequest {
    pub client_ids: Vec<String>,
    pub subject: Option<String>,
    pub message: Option<String>,
    pub comp_card_url: String,
    pub talent_name: Option<String>,
}

pub async fn share_comp_card(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<ShareCompCardRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    RoleGuard::new(vec!["agency"]).check(&user.role)?;

    if payload.client_ids.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "client_ids is required".to_string(),
        ));
    }
    if payload.comp_card_url.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "comp_card_url is required".to_string(),
        ));
    }

    let agency_resp = state
        .pg
        .from("agencies")
        .select("agency_name")
        .eq("id", &user.id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let agency_status = agency_resp.status();
    let agency_text = agency_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !agency_status.is_success() {
        return Err(sanitize_db_error(agency_status.as_u16(), agency_text));
    }

    let agency_json: serde_json::Value =
        serde_json::from_str(&agency_text).unwrap_or_else(|_| serde_json::json!([]));

    let agency_name = agency_json
        .as_array()
        .and_then(|a| a.first())
        .and_then(|r| r.get("agency_name"))
        .and_then(|v| v.as_str())
        .unwrap_or("Your Agency")
        .to_string();

    let ids: Vec<&str> = payload.client_ids.iter().map(|s| s.as_str()).collect();
    let clients_resp = state
        .pg
        .from("agency_clients")
        .select("*")
        .eq("agency_id", &user.id)
        .in_("id", ids)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let clients_status = clients_resp.status();
    let clients_text = clients_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !clients_status.is_success() {
        return Err(sanitize_db_error(clients_status.as_u16(), clients_text));
    }

    let clients_json: serde_json::Value =
        serde_json::from_str(&clients_text).unwrap_or_else(|_| serde_json::json!([]));

    let subject = payload
        .subject
        .clone()
        .unwrap_or_else(|| format!("Comp Card from {} (via Likelee.ai)", agency_name));

    let from_name = format!("Likelee.ai from {}", agency_name);

    let talent_line = payload
        .talent_name
        .as_ref()
        .map(|t| format!("Talent: {}\n\n", t.trim()))
        .unwrap_or_default();

    let msg = payload.message.clone().unwrap_or_else(|| "".to_string());

    let mut sent: i64 = 0;
    let mut failed: Vec<serde_json::Value> = Vec::new();

    if let Some(arr) = clients_json.as_array() {
        for r in arr {
            let email = get_string(r, &["email", "client_email", "contact_email"]);
            if email.is_none() {
                failed.push(json!({"error":"missing_email","client":r}));
                continue;
            }
            let email = email.unwrap();

            let name = get_string(r, &["contact_name", "name", "client_name", "company"])
                .unwrap_or_else(|| "there".to_string());

            let body = format!(
                "Hi {},\n\n{}{}\n\nComp card link:\n{}\n\nSent via Likelee.ai on behalf of {}.",
                name,
                talent_line,
                msg.trim(),
                payload.comp_card_url.trim(),
                agency_name
            );

            match send_plain_email_with_from_name(&state, &email, &subject, &body, Some(&from_name))
            {
                Ok(()) => sent += 1,
                Err((code, err)) => {
                    failed.push(json!({"error":"send_failed","status":code.as_u16(),"detail":err,"to":email}));
                }
            }
        }
    }

    Ok(Json(json!({"status":"ok","sent":sent,"failed":failed})))
}
