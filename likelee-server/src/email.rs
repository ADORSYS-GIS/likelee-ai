use axum::{extract::State, http::StatusCode, Json};
use base64::{engine::general_purpose, Engine as _};
use lettre::message::{Attachment as LettreAttachment, MultiPart, SinglePart, Mailbox};
use lettre::transport::smtp::client::{Tls, TlsParameters};
use lettre::{Message, SmtpTransport, Transport};
use serde::Deserialize;
use serde_json::{json, Value};

use crate::config::AppState;

#[derive(Deserialize)]
pub struct EmailAttachment {
    pub filename: String,
    pub content_type: String,
    pub content_base64: String,
}

#[derive(Deserialize)]
pub struct SendEmailRequest {
    pub to: String,
    pub subject: String,
    pub body: String,
    pub from_name: Option<String>,
    pub attachments: Option<Vec<EmailAttachment>>,
}

/// Internal helper for SMTP sending
fn send_email_smtp_internal(
    state: &AppState,
    to: &str,
    subject: &str,
    body: &str,
    from_name: Option<&str>,
    attachments: Option<&Vec<EmailAttachment>>,
) -> Result<(), (StatusCode, Value)> {
    if to.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            json!({"status": "error", "error": "missing_destination"}),
        ));
    }

    if state.smtp_host.is_empty() || state.smtp_user.is_empty() {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            json!({"status": "error", "error": "smtp_not_configured"}),
        ));
    }

    let parsed_from: Mailbox = state.email_from.parse().map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            json!({"status": "error", "error": "invalid_from_address"}),
        )
    })?;

    let from_addr = match from_name.map(|s| s.trim()).filter(|s| !s.is_empty()) {
        Some(name) => Mailbox::new(Some(name.to_string()), parsed_from.email.clone()),
        None => parsed_from,
    };

    let to_addr = to.parse().map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            json!({"status": "error", "error": "invalid_to_address"}),
        )
    })?;

    let builder = Message::builder()
        .from(from_addr)
        .to(to_addr)
        .subject(subject.to_string());

    let email = if let Some(atts) = attachments {
        let mut multipart = MultiPart::mixed().singlepart(SinglePart::plain(body.to_string()));
        for att in atts {
            let bytes = general_purpose::STANDARD
                .decode(att.content_base64.trim())
                .map_err(|_| {
                    (
                        StatusCode::BAD_REQUEST,
                        json!({"status": "error", "error": "invalid_attachment_base64"}),
                    )
                })?;
            let ct = att.content_type.parse().map_err(|_| {
                (
                    StatusCode::BAD_REQUEST,
                    json!({"status": "error", "error": "invalid_attachment_content_type"}),
                )
            })?;
            multipart =
                multipart.singlepart(LettreAttachment::new(att.filename.clone()).body(bytes, ct));
        }
        builder.multipart(multipart)
    } else {
        builder.singlepart(SinglePart::plain(body.to_string()))
    }
    .map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            json!({"status": "error", "error": "build_message_failed"}),
        )
    })?;

    let creds = lettre::transport::smtp::authentication::Credentials::new(
        state.smtp_user.clone(),
        state.smtp_password.clone(),
    );

    let mailer = if state.smtp_port == 465 {
        let tls = TlsParameters::new(state.smtp_host.clone()).map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                json!({"status": "error", "error": "tls_parameters_init_failed"}),
            )
        })?;
        SmtpTransport::relay(&state.smtp_host)
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    json!({"status": "error", "error": "smtp_relay_init_failed"}),
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
                    json!({"status": "error", "error": "smtp_relay_init_failed"}),
                )
            })?;
        relay.port(state.smtp_port).credentials(creds).build()
    };

    mailer.send(&email).map_err(|e| {
        (
            StatusCode::BAD_GATEWAY,
            json!({"status": "error", "error": "smtp_send_failed", "detail": e.to_string()}),
        )
    })?;

    Ok(())
}

pub async fn send_email(
    State(state): State<AppState>,
    Json(payload): Json<SendEmailRequest>,
) -> (StatusCode, Json<Value>) {
    let requested_to = payload.to.trim().to_string();
    let should_force_contact_to = !state.email_contact_to.trim().is_empty()
        && (requested_to.is_empty() || requested_to.to_lowercase().ends_with("@likelee.ai"));

    let dest = if should_force_contact_to {
        state.email_contact_to.trim().to_string()
    } else {
        requested_to
    };

    match send_email_smtp_internal(
        &state,
        &dest,
        &payload.subject,
        &payload.body,
        payload.from_name.as_deref(),
        payload.attachments.as_ref(),
    ) {
        Ok(()) => (StatusCode::OK, Json(json!({"status": "ok"}))),
        Err((code, body)) => (code, Json(body)),
    }
}

pub fn send_plain_email(
    state: &AppState,
    to: &str,
    subject: &str,
    body: &str,
) -> Result<(), (StatusCode, Value)> {
    send_email_smtp_internal(state, to, subject, body, None, None)
}

pub fn send_plain_email_with_from_name(
    state: &AppState,
    to: &str,
    subject: &str,
    body: &str,
    from_name: Option<&str>,
) -> Result<(), (StatusCode, Value)> {
    send_email_smtp_internal(state, to, subject, body, from_name, None)
}
