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
    let dest = if !payload.to.trim().is_empty() {
        payload.to.trim().to_string()
    } else {
        state.email_contact_to.trim().to_string()
    };
    if dest.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"status":"error","error":"missing_destination"})),
        );
    }

    tracing::info!("send_email dest={}", dest);

    // SMTP is required (lettre-only). If not configured, return 500.
    if state.smtp_host.is_empty() || state.smtp_user.is_empty() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"status":"error","error":"smtp_not_configured"})),
        );
    }

    let from_addr = match state.email_from.parse() {
        Ok(a) => a,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"status":"error","error":"invalid_from_address"})),
            )
        }
    };
    let to_addr = match dest.parse() {
        Ok(a) => a,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"status":"error","error":"invalid_to_address"})),
            )
        }
    };

    let mut multipart = MultiPart::mixed().singlepart(SinglePart::plain(payload.body.clone()));
    if let Some(atts) = payload.attachments.as_ref() {
        for att in atts {
            let bytes = match general_purpose::STANDARD.decode(att.content_base64.trim()) {
                Ok(b) => b,
                Err(_) => {
                    return (
                        StatusCode::BAD_REQUEST,
                        Json(json!({"status":"error","error":"invalid_attachment_base64"})),
                    )
                }
            };
            let ct = match att.content_type.parse() {
                Ok(v) => v,
                Err(_) => {
                    return (
                        StatusCode::BAD_REQUEST,
                        Json(json!({"status":"error","error":"invalid_attachment_content_type"})),
                    )
                }
            };
            multipart =
                multipart.singlepart(LettreAttachment::new(att.filename.clone()).body(bytes, ct));
        }
    }

    let email = match Message::builder()
        .from(from_addr)
        .to(to_addr)
        .subject(payload.subject.clone())
        .multipart(multipart)
    {
        Ok(m) => m,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"status":"error","error":"build_message_failed"})),
            )
        }
    };

    let creds = lettre::transport::smtp::authentication::Credentials::new(
        state.smtp_user.clone(),
        state.smtp_password.clone(),
    );

    let mailer = if state.smtp_port == 465 {
        let tls = match TlsParameters::new(state.smtp_host.clone()) {
            Ok(p) => p,
            Err(_) => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({"status":"error","error":"tls_parameters_init_failed"})),
                )
            }
        };
        let builder = match SmtpTransport::relay(&state.smtp_host) {
            Ok(b) => b,
            Err(_) => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({"status":"error","error":"smtp_relay_init_failed"})),
                )
            }
        };
        builder
            .port(465)
            .tls(Tls::Wrapper(tls))
            .credentials(creds)
            .build()
    } else {
        let relay = match SmtpTransport::starttls_relay(&state.smtp_host) {
            Ok(r) => r,
            Err(_) => match SmtpTransport::relay(&state.smtp_host) {
                Ok(r2) => r2,
                Err(_) => {
                    return (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(json!({"status":"error","error":"smtp_relay_init_failed"})),
                    )
                }
            },
        };
        relay.port(state.smtp_port).credentials(creds).build()
    };

    match mailer.send(&email) {
        Ok(_) => (StatusCode::OK, Json(json!({"status":"ok"}))),
        Err(e) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({"status":"error","error":"smtp_send_failed","detail": e.to_string()})),
        ),
    }
}
