use crate::state::AppState;
use axum::{extract::State, http::StatusCode, Json};
use serde_json::json;

use super::*;

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
        state.smtp.contact_to.trim().to_string()
    };

    let is_sales = !state.smtp_sales.to.trim().is_empty()
        && to.trim().eq_ignore_ascii_case(state.smtp_sales.to.trim());

    if is_sales && (payload.attachments.is_some() || payload.is_html.unwrap_or(false)) {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "status":"error",
                "error":"sales_smtp_plain_text_only"
            })),
        );
    }

    let res = if is_sales {
        match send_sales_plain_text_email(&state, &to, &payload.subject, &payload.body, None) {
            Ok(_) => Ok(()),
            Err((_code, msg)) if msg == "smtp_sales_not_configured" => {
                send_email_core(&state, &to, &payload.subject, &payload.body, false, None).await
            }
            Err(e) => Err(e),
        }
    } else {
        send_email_core(
            &state,
            &to,
            &payload.subject,
            &payload.body,
            payload.is_html.unwrap_or(false),
            payload.attachments.as_deref(),
        )
        .await
    };

    match res {
        Ok(_) => (StatusCode::OK, Json(json!({"status":"ok"}))),
        Err((code, msg)) => (code, Json(json!({"status":"error", "error": msg}))),
    }
}

pub async fn send_sales_inquiry(
    State(state): State<AppState>,
    Json(payload): Json<SendSalesInquiryRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    let company_name = payload.company_name.trim();
    let contact_name = payload.contact_name.trim();
    let email = payload.email.trim();
    let phone = payload.phone.as_deref().unwrap_or("").trim();
    let company_size = payload.company_size.trim();
    let message = payload.message.as_deref().unwrap_or("").trim();

    if company_name.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"status":"error","error":"missing_company_name"})),
        );
    }
    if contact_name.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"status":"error","error":"missing_contact_name"})),
        );
    }
    if email.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"status":"error","error":"missing_email"})),
        );
    }
    if company_size.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"status":"error","error":"missing_company_size"})),
        );
    }

    let to = state.smtp_sales.to.trim();
    if to.is_empty() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"status":"error","error":"email_sales_to_not_configured"})),
        );
    }

    let inquiry_id = match insert_sales_inquiry(&state, &payload, to).await {
        Ok(id) => id,
        Err(err) => {
            if is_missing_sales_inquiries_table(&err) {
                tracing::warn!(
                    error = %err,
                    "sales_inquiries table unavailable; continuing without inquiry persistence"
                );
            } else {
                tracing::error!(
                    error = %err,
                    "Failed to persist sales inquiry before email send"
                );
            }
            None
        }
    };

    let subject_company = company_name.replace(['\r', '\n'], " ");
    let subject = format!("Sales Inquiry from {subject_company}");
    let body = format!(
        "New Sales Inquiry:\n\nCompany: {company_name}\nContact: {contact_name}\nEmail: {email}\nPhone: {phone}\nCompany Size: {company_size}\n\nMessage:\n{message}",
        phone = if phone.is_empty() { "-" } else { phone },
        message = if message.is_empty() { "-" } else { message },
    );

    let res: Result<SalesInquiryDelivery, (StatusCode, String)> =
        match send_sales_plain_text_email(&state, to, &subject, &body, Some(email)) {
            Ok(()) => Ok(SalesInquiryDelivery::EmailAccepted),
            Err((_code, msg)) if msg == "smtp_sales_not_configured" => {
                send_email_core_with_from_name(
                    &state,
                    to,
                    &subject,
                    &body,
                    EmailSendOptions {
                        is_html: false,
                        attachments: None,
                        from_name: None,
                        reply_to: Some(email),
                    },
                )
                .await
                .map(|_| SalesInquiryDelivery::EmailAccepted)
            }
            Err(err) => Err(err),
        };

    match res {
        Ok(SalesInquiryDelivery::EmailAccepted) => {
            if let Some(inquiry_id) = inquiry_id.as_deref() {
                update_sales_inquiry_delivery(
                    &state,
                    inquiry_id,
                    "email_accepted",
                    Some("smtp"),
                    Some(""),
                )
                .await;
            }
            (
                StatusCode::OK,
                Json(json!({
                    "status":"ok",
                    "delivery":"email_accepted",
                    "inquiry_id": inquiry_id
                })),
            )
        }
        Err((_code, msg)) if inquiry_id.is_some() => {
            if let Some(inquiry_id) = inquiry_id.as_deref() {
                update_sales_inquiry_delivery(
                    &state,
                    inquiry_id,
                    "stored_only",
                    Some("smtp"),
                    Some(msg.as_str()),
                )
                .await;
            }
            (
                StatusCode::OK,
                Json(json!({
                    "status":"ok",
                    "delivery":"stored_only",
                    "error": msg,
                    "inquiry_id": inquiry_id
                })),
            )
        }
        Err((code, msg)) => (code, Json(json!({"status":"error", "error": msg}))),
    }
}
