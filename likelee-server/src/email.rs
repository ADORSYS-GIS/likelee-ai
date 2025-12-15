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
}

pub async fn send_email(
    State(state): State<AppState>,
    Json(payload): Json<SendEmailRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    // Determine destination: prefer configured EMAIL_CONTACT_TO when set
    let dest = if !state.email_contact_to.trim().is_empty() {
        state.email_contact_to.trim().to_string()
    } else {
        payload.to.trim().to_string()
    };
    if dest.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"status":"error","error":"missing_destination"})),
        );
    }

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

    let email = match Message::builder()
        .from(from_addr)
        .to(to_addr)
        .subject(payload.subject.clone())
        .singlepart(SinglePart::plain(payload.body.clone()))
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
