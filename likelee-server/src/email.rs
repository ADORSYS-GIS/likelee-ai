use axum::{extract::State, http::StatusCode, Json};
use base64::{engine::general_purpose, Engine as _};
use lettre::message::{Attachment as LettreAttachment, MultiPart, SinglePart};
use lettre::transport::smtp::client::{Tls, TlsParameters};
use lettre::{message::Mailbox, Message, SmtpTransport, Transport};
use serde::Deserialize;
use serde_json::json;

use crate::config::AppState;

#[derive(Deserialize)]
pub struct SendEmailRequest {
    pub to: String,
    pub subject: String,
    pub body: String,
    pub attachments: Option<Vec<EmailAttachment>>,
    pub is_html: Option<bool>,
}

#[derive(Deserialize)]
pub struct EmailAttachment {
    pub filename: String,
    pub content_type: String,
    pub content_base64: String,
}

// ---- Legacy-compatible helpers for other modules (non-HTTP) ----
// These are synchronous helpers returning Result<(), StatusCode> used across the codebase.
pub fn send_plain_text_email(
    state: &AppState,
    to: &str,
    subject: &str,
    body: &str,
    from_name: Option<&str>,
) -> Result<(), (StatusCode, String)> {
    send_email_smtp_internal(state, to, subject, body, from_name)
}

pub fn send_plain_email(
    state: &AppState,
    to: &str,
    subject: &str,
    body: &str,
) -> Result<(), (StatusCode, String)> {
    send_email_smtp_internal(state, to, subject, body, None)
}

pub fn send_plain_email_with_from_name(
    state: &AppState,
    to: &str,
    subject: &str,
    body: &str,
    from_name: Option<&str>,
) -> Result<(), (StatusCode, String)> {
    send_email_smtp_internal(state, to, subject, body, from_name)
}

fn send_email_smtp_internal(
    state: &AppState,
    to: &str,
    subject: &str,
    body: &str,
    from_name: Option<&str>,
) -> Result<(), (StatusCode, String)> {
    // SMTP is required (lettre-only). If not configured, return 500.
    if state.smtp_host.is_empty() || state.smtp_user.is_empty() {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            "smtp_not_configured".to_string(),
        ));
    }

    let parsed_from: Mailbox = state.email_from.parse::<Mailbox>().map_err(|_e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "invalid_from_address".to_string(),
        )
    })?;
    let from_addr = match from_name {
        Some(name) if !name.trim().is_empty() => Mailbox {
            name: Some(name.trim().to_string()),
            email: parsed_from.email.clone(),
        },
        _ => parsed_from,
    };

    let to_addr: Mailbox = to
        .parse::<Mailbox>()
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    // Build simple text email
    let email = Message::builder()
        .from(from_addr)
        .to(to_addr)
        .subject(subject.to_string())
        .singlepart(SinglePart::plain(body.to_string()))
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let creds = lettre::transport::smtp::authentication::Credentials::new(
        state.smtp_user.clone(),
        state.smtp_password.clone(),
    );

    let mailer = if state.smtp_port == 465 {
        let tls = TlsParameters::new(state.smtp_host.clone())
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let builder = SmtpTransport::relay(&state.smtp_host)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        builder
            .port(465)
            .tls(Tls::Wrapper(tls))
            .credentials(creds)
            .build()
    } else {
        let relay = match SmtpTransport::starttls_relay(&state.smtp_host) {
            Ok(r) => r,
            Err(_) => SmtpTransport::relay(&state.smtp_host)
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?,
        };
        relay.port(state.smtp_port).credentials(creds).build()
    };

    mailer
        .send(&email)
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    Ok(())
}

pub async fn send_email(
    State(state): State<AppState>,
    Json(payload): Json<SendEmailRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    // Determine destination:
    // - Use payload.to when provided (normal behavior for app emails like invoices)
    // - Fall back to configured EMAIL_CONTACT_TO only when payload.to is empty
    let to = if !payload.to.trim().is_empty() {
        payload.to.trim().to_string()
    } else {
        state.email_contact_to.trim().to_string()
    };

    match send_email_core(
        &state,
        &to,
        &payload.subject,
        &payload.body,
        payload.is_html.unwrap_or(false),
        payload.attachments.as_deref(),
    )
    .await
    {
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
    attachments: Option<&[EmailAttachment]>,
) -> Result<(), (StatusCode, String)> {
    if to.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "missing_destination".to_string()));
    }

    if state.smtp_host.is_empty() || state.smtp_user.is_empty() {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            "smtp_not_configured".to_string(),
        ));
    }

    let from_addr = state.email_from.parse().map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "invalid_from_address".to_string(),
        )
    })?;

    let to_addr = to
        .parse()
        .map_err(|_| (StatusCode::BAD_REQUEST, "invalid_to_address".to_string()))?;

    let part = if is_html {
        SinglePart::html(body.to_string())
    } else {
        SinglePart::plain(body.to_string())
    };

    let email = if let Some(atts) = attachments {
        let mut multipart = MultiPart::mixed().singlepart(part);
        for att in atts {
            let bytes = general_purpose::STANDARD
                .decode(att.content_base64.trim())
                .map_err(|_| {
                    (
                        StatusCode::BAD_REQUEST,
                        "invalid_attachment_base64".to_string(),
                    )
                })?;
            let ct = att.content_type.parse().map_err(|_| {
                (
                    StatusCode::BAD_REQUEST,
                    "invalid_attachment_content_type".to_string(),
                )
            })?;
            multipart =
                multipart.singlepart(LettreAttachment::new(att.filename.clone()).body(bytes, ct));
        }
        Message::builder()
            .from(from_addr)
            .to(to_addr)
            .subject(subject.to_string())
            .multipart(multipart)
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "build_message_failed".to_string(),
                )
            })?
    } else {
        Message::builder()
            .from(from_addr)
            .to(to_addr)
            .subject(subject.to_string())
            .singlepart(part)
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "build_message_failed".to_string(),
                )
            })?
    };

    let creds = lettre::transport::smtp::authentication::Credentials::new(
        state.smtp_user.clone(),
        state.smtp_password.clone(),
    );

    let mailer = if state.smtp_port == 465 {
        let tls = TlsParameters::new(state.smtp_host.clone()).map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "tls_parameters_init_failed".to_string(),
            )
        })?;

        SmtpTransport::relay(&state.smtp_host)
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "smtp_relay_init_failed".to_string(),
                )
            })?
            .port(465)
            .tls(Tls::Wrapper(tls))
            .credentials(creds)
            .build()
    } else {
        let relay = SmtpTransport::starttls_relay(&state.smtp_host)
            .or_else(|_| SmtpTransport::relay(&state.smtp_host))
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "smtp_relay_init_failed".to_string(),
                )
            })?;

        relay.port(state.smtp_port).credentials(creds).build()
    };

    mailer
        .send(&email)
        .map_err(|e| (StatusCode::BAD_GATEWAY, format!("smtp_send_failed: {}", e)))?;

    Ok(())
}
