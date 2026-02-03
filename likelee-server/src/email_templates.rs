use axum::http::StatusCode;
use serde_json;

use crate::config::AppState;

#[derive(Clone, Debug)]
pub struct EmailTemplate {
    pub subject: String,
    pub body: String,
}

pub async fn load_active_email_template(
    state: &AppState,
    agency_id: &str,
    template_key: &str,
) -> Result<Option<EmailTemplate>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("agency_email_templates")
        .select("subject,body,is_active")
        .eq("agency_id", agency_id)
        .eq("template_key", template_key)
        .eq("is_active", "true")
        .limit(1)
        .execute()
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "db_error".to_string()))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "db_error".to_string()))?;
    if !status.is_success() {
        let code =
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err((code, "db_error".to_string()));
    }

    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "db_error".to_string()))?;
    let first = v
        .as_array()
        .and_then(|a| a.first())
        .and_then(|x| x.as_object());
    if let Some(obj) = first {
        let subject = obj
            .get("subject")
            .and_then(|x| x.as_str())
            .unwrap_or("")
            .to_string();
        let body = obj
            .get("body")
            .and_then(|x| x.as_str())
            .unwrap_or("")
            .to_string();
        if subject.is_empty() && body.is_empty() {
            return Ok(None);
        }
        return Ok(Some(EmailTemplate { subject, body }));
    }

    Ok(None)
}

pub fn render_placeholders(input: &str, vars: &[(&str, String)]) -> String {
    let mut out = input.to_string();
    for (k, v) in vars {
        let needle = format!("{{{}}}", k);
        out = out.replace(&needle, v);
    }
    out
}
