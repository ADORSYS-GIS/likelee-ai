use axum::{extract::State, http::StatusCode, Json};
use base64::{engine::general_purpose, Engine as _};
use lettre::message::{Attachment as LettreAttachment, MultiPart, SinglePart};
use lettre::transport::smtp::client::{Tls, TlsParameters};
use lettre::{message::Mailbox, Message, SmtpTransport, Transport};
use serde::Deserialize;
use serde_json::json;
use crate::state::AppState;

use super::*;



#[derive(Deserialize)]
pub struct SendEmailRequest {
    pub to: String,
    pub subject: String,
    pub body: String,
    pub attachments: Option<Vec<EmailAttachment>>,
    pub is_html: Option<bool>,
}

#[derive(Deserialize)]
pub struct SendSalesInquiryRequest {
    pub company_name: String,
    pub contact_name: String,
    pub email: String,
    pub phone: Option<String>,
    pub company_size: String,
    pub message: Option<String>,
}

#[derive(Clone, Copy)]
pub enum SalesInquiryDelivery {
    EmailAccepted,
}

#[derive(Deserialize)]
pub struct EmailAttachment {
    pub filename: String,
    pub content_type: String,
    pub content_base64: String,
}

pub struct EmailSendOptions<'a> {
    pub is_html: bool,
    pub attachments: Option<&'a [EmailAttachment]>,
    pub from_name: Option<&'a str>,
    pub reply_to: Option<&'a str>,
}

