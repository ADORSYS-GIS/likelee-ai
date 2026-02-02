use axum::{extract::State, http::StatusCode, Json};
use base64::{engine::general_purpose, Engine as _};
use lettre::message::{Attachment as LettreAttachment, MultiPart, SinglePart, Mailbox};
use lettre::transport::smtp::client::{Tls, TlsParameters};
use lettre::{Message, SmtpTransport, Transport};
use serde::Deserialize;
use serde_json::json;

use crate::config::AppState;

fn send_plain_email_smtp_with_from_name(
    state: &AppState,
    to: &str,
    subject: &str,
    body: &str,
    from_name: Option<&str>,
) -> Result<(), (StatusCode, serde_json::Value)> {
    if to.trim().is_empty() {
        return Err((
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
            json!({"status":"error","error":"missing_destination"}),
        ));
    }

    tracing::info!("send_email dest={}", dest);

    // SMTP is required (lettre-only). If not configured, return 500.
    if state.smtp_host.is_empty() || state.smtp_user.is_empty() {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            json!({"status":"error","error":"smtp_not_configured"}),
        ));
    }

    let parsed_from: Mailbox = state.email_from.parse().map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            json!({"status":"error","error":"invalid_from_address"}),
        )
    })?;
    let from_addr = match from_name.map(|s| s.trim()).filter(|s| !s.is_empty()) {
        Some(name) => Mailbox::new(Some(name.to_string()), parsed_from.email.clone()),
        None => parsed_from,
    };
    let to_addr = to.parse().map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            json!({"status":"error","error":"invalid_to_address"}),
        )
    })?;

    let email = Message::builder()
        .from(from_addr)
        .to(to_addr)
        .subject(subject.to_string())
        .singlepart(SinglePart::plain(body.to_string()))
        .map_err(|_| {
            (
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
                json!({"status":"error","error":"build_message_failed"}),
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
                json!({"status":"error","error":"tls_parameters_init_failed"}),
            )
        })?;
        let builder = SmtpTransport::relay(&state.smtp_host).map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                json!({"status":"error","error":"smtp_relay_init_failed"}),
            )
        })?;
        builder
            .port(465)
            .tls(Tls::Wrapper(tls))
            .credentials(creds)
            .build()
    } else {
        let relay = match SmtpTransport::starttls_relay(&state.smtp_host) {
            Ok(r) => r,
            Err(_) => SmtpTransport::relay(&state.smtp_host).map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    json!({"status":"error","error":"smtp_relay_init_failed"}),
                )
            })?,
        };
        relay.port(state.smtp_port).credentials(creds).build()
    };

    mailer.send(&email).map_err(|e| {
        (
            StatusCode::BAD_GATEWAY,
            json!({"status":"error","error":"smtp_send_failed","detail": e.to_string()}),
        )
    })?;

    Ok(())
}

fn send_plain_email_smtp(
    state: &AppState,
    to: &str,
    subject: &str,
    body: &str,
) -> Result<(), (StatusCode, serde_json::Value)> {
    send_plain_email_smtp_with_from_name(state, to, subject, body, None)
}

#[derive(Deserialize)]
pub struct SendEmailRequest {
    pub to: String,
    pub subject: String,
    pub body: String,
    pub from_name: Option<String>,
}

pub async fn send_email(
    State(state): State<AppState>,
    Json(payload): Json<SendEmailRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    // Determine destination: prefer configured EMAIL_CONTACT_TO only for internal likelee addresses.
    // This keeps SalesInquiry/contact-style emails safe while allowing sending to arbitrary recipients.
    let requested_to = payload.to.trim().to_string();
    let should_force_contact_to = !state.email_contact_to.trim().is_empty()
        && (requested_to.is_empty() || requested_to.to_lowercase().ends_with("@likelee.ai"));
    let dest = if should_force_contact_to {
        state.email_contact_to.trim().to_string()
    } else {
        requested_to
    };

    match send_plain_email_smtp_with_from_name(
        &state,
        &dest,
        &payload.subject,
        &payload.body,
        payload.from_name.as_deref(),
    ) {
        Ok(()) => (StatusCode::OK, Json(json!({ "status": "ok" }))),
        Err((code, body)) => (code, Json(body)),
    }
}

pub fn send_plain_email(
    state: &AppState,
    to: &str,
    subject: &str,
    body: &str,
) -> Result<(), (StatusCode, serde_json::Value)> {
    send_plain_email_smtp(state, to, subject, body)
}

pub fn send_plain_email_with_from_name(
    state: &AppState,
    to: &str,
    subject: &str,
    body: &str,
    from_name: Option<&str>,
) -> Result<(), (StatusCode, serde_json::Value)> {
    send_plain_email_smtp_with_from_name(state, to, subject, body, from_name)
}
