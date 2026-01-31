use axum::{extract::State, http::StatusCode, Json};
use lettre::message::SinglePart;
use lettre::transport::smtp::client::{Tls, TlsParameters};
use lettre::{Message, SmtpTransport, Transport};
use serde::Deserialize;
use serde_json::json;

use crate::config::AppState;

#[derive(Deserialize)]
pub struct SendEmailRequest {
    pub to: String,
    pub subject: String,
    pub body: String,
    pub is_html: Option<bool>,
}

pub async fn send_email(
    State(state): State<AppState>,
    Json(payload): Json<SendEmailRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    let to = if !state.email_contact_to.trim().is_empty() {
        state.email_contact_to.trim().to_string()
    } else {
        payload.to.clone()
    };

    match send_email_core(&state, &to, &payload.subject, &payload.body, payload.is_html.unwrap_or(false)).await {
        Ok(_) => (StatusCode::OK, Json(json!({"status":"ok"}))),
        Err((code, msg)) => (code, Json(json!({"status":"error", "error": msg}))),
    }
}

pub async fn send_email_core(
    state: &AppState,
    to: &str,
    subject: &str,
    body: &str,
    is_html: bool,
) -> Result<(), (StatusCode, String)> {
    if to.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "missing_destination".to_string()));
    }

    if state.smtp_host.is_empty() || state.smtp_user.is_empty() {
        return Err((StatusCode::INTERNAL_SERVER_ERROR, "smtp_not_configured".to_string()));
    }

    let from_addr = state.email_from.parse()
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "invalid_from_address".to_string()))?;
    
    let to_addr = to.parse()
        .map_err(|_| (StatusCode::BAD_REQUEST, "invalid_to_address".to_string()))?;

    let part = if is_html {
        SinglePart::html(body.to_string())
    } else {
        SinglePart::plain(body.to_string())
    };

    let email = Message::builder()
        .from(from_addr)
        .to(to_addr)
        .subject(subject.to_string())
        .singlepart(part)
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "build_message_failed".to_string()))?;

    let creds = lettre::transport::smtp::authentication::Credentials::new(
        state.smtp_user.clone(),
        state.smtp_password.clone(),
    );

    let mailer = if state.smtp_port == 465 {
        let tls = TlsParameters::new(state.smtp_host.clone())
            .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "tls_parameters_init_failed".to_string()))?;
        
        SmtpTransport::relay(&state.smtp_host)
            .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "smtp_relay_init_failed".to_string()))?
            .port(465)
            .tls(Tls::Wrapper(tls))
            .credentials(creds)
            .build()
    } else {
        let relay = SmtpTransport::starttls_relay(&state.smtp_host)
            .or_else(|_| SmtpTransport::relay(&state.smtp_host))
            .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "smtp_relay_init_failed".to_string()))?;
        
        relay.port(state.smtp_port).credentials(creds).build()
    };

    mailer.send(&email)
        .map_err(|e| (StatusCode::BAD_GATEWAY, format!("smtp_send_failed: {}", e)))?;

    Ok(())
}
