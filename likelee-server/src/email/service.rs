use axum::{extract::State, http::StatusCode, Json};
use base64::{engine::general_purpose, Engine as _};
use lettre::message::{Attachment as LettreAttachment, MultiPart, SinglePart};
use lettre::transport::smtp::client::{Tls, TlsParameters};
use lettre::{message::Mailbox, Message, SmtpTransport, Transport};
use serde::Deserialize;
use serde_json::json;
use crate::state::AppState;

use super::*;

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

pub async fn send_email_core_with_from_name(
    state: &AppState,
    to: &str,
    subject: &str,
    body: &str,
    options: EmailSendOptions<'_>,
) -> Result<(), (StatusCode, String)> {
    if to.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "missing_destination".to_string()));
    }

    if state.smtp.host.is_empty() || state.smtp.user.is_empty() {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            "smtp_not_configured".to_string(),
        ));
    }

    let parsed_from: Mailbox = state.smtp.from.parse::<Mailbox>().map_err(|_e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "invalid_from_address".to_string(),
        )
    })?;
    let from_addr = match options.from_name {
        Some(name) if !name.trim().is_empty() => Mailbox {
            name: Some(name.trim().to_string()),
            email: parsed_from.email.clone(),
        },
        _ => parsed_from,
    };

    let to_addr: Mailbox = to
        .parse::<Mailbox>()
        .map_err(|_| (StatusCode::BAD_REQUEST, "invalid_to_address".to_string()))?;
    let reply_to_addr = parse_optional_reply_to(options.reply_to)?;

    let part = if options.is_html {
        SinglePart::html(body.to_string())
    } else {
        SinglePart::plain(body.to_string())
    };

    let email = if let Some(atts) = options.attachments {
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
        let mut builder = Message::builder()
            .from(from_addr)
            .to(to_addr)
            .subject(subject.to_string());
        if let Some(reply_to_addr) = reply_to_addr {
            builder = builder.reply_to(reply_to_addr);
        }
        builder.multipart(multipart).map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "build_message_failed".to_string(),
            )
        })?
    } else {
        let mut builder = Message::builder()
            .from(from_addr)
            .to(to_addr)
            .subject(subject.to_string());
        if let Some(reply_to_addr) = reply_to_addr {
            builder = builder.reply_to(reply_to_addr);
        }
        builder.singlepart(part).map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "build_message_failed".to_string(),
            )
        })?
    };

    let creds = lettre::transport::smtp::authentication::Credentials::new(
        state.smtp.user.clone(),
        state.smtp.password.clone(),
    );

    let mailer = if state.smtp.port == 465 {
        let tls = TlsParameters::new(state.smtp.host.clone()).map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "tls_parameters_init_failed".to_string(),
            )
        })?;

        SmtpTransport::relay(&state.smtp.host)
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
        let relay = SmtpTransport::starttls_relay(&state.smtp.host)
            .or_else(|_| SmtpTransport::relay(&state.smtp.host))
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "smtp_relay_init_failed".to_string(),
                )
            })?;

        relay.port(state.smtp.port).credentials(creds).build()
    };

    mailer
        .send(&email)
        .map_err(|e| (StatusCode::BAD_GATEWAY, format!("smtp_send_failed: {}", e)))?;

    Ok(())
}

pub fn send_sales_plain_text_email(
    state: &AppState,
    to: &str,
    subject: &str,
    body: &str,
    reply_to: Option<&str>,
) -> Result<(), (StatusCode, String)> {
    send_email_smtp_internal_sales(state, to, subject, body, reply_to)
}

pub fn is_missing_sales_inquiries_table(error: &str) -> bool {
    let normalized = error.to_ascii_lowercase();
    normalized.contains("pgrst205") && normalized.contains("sales_inquiries")
}

pub async fn insert_sales_inquiry(
    state: &AppState,
    payload: &SendSalesInquiryRequest,
    recipient_email: &str,
) -> Result<Option<String>, String> {
    let row = json!({
        "source": "website",
        "company_name": payload.company_name.trim(),
        "contact_name": payload.contact_name.trim(),
        "email": payload.email.trim(),
        "phone": payload.phone.as_deref().map(str::trim).filter(|v| !v.is_empty()),
        "company_size": payload.company_size.trim(),
        "message": payload.message.as_deref().map(str::trim).filter(|v| !v.is_empty()),
        "recipient_email": recipient_email,
        "email_delivery_status": "pending",
        "updated_at": chrono::Utc::now().to_rfc3339(),
    });

    let resp = state
        .pg
        .from("sales_inquiries")
        .insert(row.to_string())
        .execute()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err(resp.text().await.unwrap_or_default());
    }

    let text = resp.text().await.unwrap_or_else(|_| "[]".into());
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    let inquiry_id = rows
        .first()
        .and_then(|row| row.get("id"))
        .and_then(|value| value.as_str())
        .map(|value| value.to_string());

    Ok(inquiry_id)
}

pub async fn update_sales_inquiry_delivery(
    state: &AppState,
    inquiry_id: &str,
    delivery_status: &str,
    email_transport: Option<&str>,
    email_delivery_error: Option<&str>,
) {
    if inquiry_id.trim().is_empty() {
        return;
    }

    let mut patch = serde_json::Map::new();
    patch.insert("email_delivery_status".to_string(), json!(delivery_status));
    patch.insert(
        "updated_at".to_string(),
        json!(chrono::Utc::now().to_rfc3339()),
    );

    if let Some(email_transport) = email_transport.filter(|value| !value.trim().is_empty()) {
        patch.insert("email_transport".to_string(), json!(email_transport));
    }

    if let Some(email_delivery_error) = email_delivery_error {
        if email_delivery_error.trim().is_empty() {
            patch.insert("email_delivery_error".to_string(), serde_json::Value::Null);
        } else {
            patch.insert(
                "email_delivery_error".to_string(),
                json!(email_delivery_error.trim()),
            );
        }
    }

    let _ = state
        .pg
        .from("sales_inquiries")
        .eq("id", inquiry_id)
        .update(serde_json::Value::Object(patch).to_string())
        .execute()
        .await;
}

pub fn parse_optional_reply_to(
    reply_to: Option<&str>,
) -> Result<Option<Mailbox>, (StatusCode, String)> {
    let Some(reply_to) = reply_to.map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok(None);
    };

    let mailbox = reply_to.parse::<Mailbox>().map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            "invalid_reply_to_address".to_string(),
        )
    })?;

    Ok(Some(mailbox))
}

pub fn send_email_smtp_internal(
    state: &AppState,
    to: &str,
    subject: &str,
    body: &str,
    from_name: Option<&str>,
) -> Result<(), (StatusCode, String)> {
    // SMTP is required (lettre-only). If not configured, return 500.
    if state.smtp.host.is_empty() || state.smtp.user.is_empty() {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            "smtp_not_configured".to_string(),
        ));
    }

    let parsed_from: Mailbox = state.smtp.from.parse::<Mailbox>().map_err(|_e| {
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
        state.smtp.user.clone(),
        state.smtp.password.clone(),
    );

    let mailer = if state.smtp.port == 465 {
        let tls = TlsParameters::new(state.smtp.host.clone())
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let builder = SmtpTransport::relay(&state.smtp.host)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        builder
            .port(465)
            .tls(Tls::Wrapper(tls))
            .credentials(creds)
            .build()
    } else {
        let relay = match SmtpTransport::starttls_relay(&state.smtp.host) {
            Ok(r) => r,
            Err(_) => SmtpTransport::relay(&state.smtp.host)
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?,
        };
        relay.port(state.smtp.port).credentials(creds).build()
    };

    mailer
        .send(&email)
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    Ok(())
}

pub fn send_email_smtp_internal_sales(
    state: &AppState,
    to: &str,
    subject: &str,
    body: &str,
    reply_to: Option<&str>,
) -> Result<(), (StatusCode, String)> {
    if state.smtp_sales.host.is_empty() || state.smtp_sales.user.is_empty() {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            "smtp_sales_not_configured".to_string(),
        ));
    }

    let from_addr = state.smtp_sales.from.parse().map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "invalid_from_address".to_string(),
        )
    })?;

    let to_addr = to
        .parse()
        .map_err(|_| (StatusCode::BAD_REQUEST, "invalid_to_address".to_string()))?;
    let reply_to_addr = parse_optional_reply_to(reply_to)?;

    let mut builder = Message::builder()
        .from(from_addr)
        .to(to_addr)
        .subject(subject.to_string());
    if let Some(reply_to_addr) = reply_to_addr {
        builder = builder.reply_to(reply_to_addr);
    }

    let email = builder
        .singlepart(SinglePart::plain(body.to_string()))
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let creds = lettre::transport::smtp::authentication::Credentials::new(
        state.smtp_sales.user.clone(),
        state.smtp_sales.password.clone(),
    );

    let mailer = if state.smtp_sales.port == 465 {
        let tls = TlsParameters::new(state.smtp_sales.host.clone())
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let builder = SmtpTransport::relay(&state.smtp_sales.host)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        builder
            .port(465)
            .tls(Tls::Wrapper(tls))
            .credentials(creds)
            .build()
    } else {
        let relay = match SmtpTransport::starttls_relay(&state.smtp_sales.host) {
            Ok(r) => r,
            Err(_) => SmtpTransport::relay(&state.smtp_sales.host)
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?,
        };
        relay.port(state.smtp_sales.port).credentials(creds).build()
    };

    mailer
        .send(&email)
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    Ok(())
}

pub async fn send_email_core(
    state: &AppState,
    to: &str,
    subject: &str,
    body: &str,
    is_html: bool,
    attachments: Option<&[EmailAttachment]>,
) -> Result<(), (StatusCode, String)> {
    send_email_core_with_from_name(
        state,
        to,
        subject,
        body,
        EmailSendOptions {
            is_html,
            attachments,
            from_name: None,
            reply_to: None,
        },
    )
    .await
}

