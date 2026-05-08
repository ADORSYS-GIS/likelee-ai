use crate::auth::{AuthUser, RoleGuard};
use crate::config::AppState;
use crate::email;
use crate::errors::sanitize_db_error;
use crate::creators::face_profiles::MarketplaceConnectPayload;
use crate::services::docuseal::{DocuSealClient, Submitter};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use tracing::{error, info, warn};

const REQUIRED_PLACEHOLDERS: [&str; 3] = ["{commission_rate}", "{valid_from}", "{valid_until}"];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketplaceContractSummary {
    pub id: String,
    pub status: String,
    pub commission_rate: Option<f64>,
    pub valid_from: Option<String>,
    pub valid_until: Option<String>,
    pub template_name: Option<String>,
    pub docuseal_template_id: Option<i32>,
    pub docuseal_status: Option<String>,
    pub creator_sign_url: Option<String>,
    pub agency_sign_url: Option<String>,
    pub signed_document_url: Option<String>,
    pub disconnect_status: Option<String>,
    pub disconnect_requested_by: Option<String>,
    pub disconnect_requested_at: Option<String>,
    pub disconnect_reason: Option<String>,
    pub disconnect_reviewed_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SyncContractPath {
    pub id: String,
}

#[derive(Debug, Deserialize)]
pub struct FinalizeContractPath {
    pub id: String,
}

#[derive(Debug, Deserialize)]
pub struct DocuSealWebhookEvent {
    pub event_type: String,
    pub timestamp: String,
    pub data: serde_json::Value,
}

fn default_contract_template() -> String {
    "AGENCY-CREATOR MARKETPLACE CONNECTION AGREEMENT\n\nThis agreement is entered into between {agency_name} and {creator_name}.\n\n1. COMMISSION\nThe agency commission rate for work governed by this connection is {commission_rate}.\n\n2. TERM\nThis agreement starts on {valid_from} and ends on {valid_until}.\n\n3. PURPOSE\nThis agreement governs marketplace-based collaboration and payout routing between the agency and creator.\n\n4. SIGNATURES\nBy signing, both parties agree that connected-work commissions will follow the rate stated above for the valid term of this agreement.\n".to_string()
}

fn replace_placeholders(body: &str, replacements: &HashMap<String, String>) -> String {
    let mut rendered = body.to_string();
    for (key, value) in replacements {
        rendered = rendered.replace(&format!("{{{}}}", key), value);
    }
    rendered
}

fn render_contract_to_html(body: &str, format: &str) -> String {
    let content_html = if format == "markdown" {
        use pulldown_cmark::{html, Parser};
        let parser = Parser::new(body);
        let mut html_output = String::new();
        html::push_html(&mut html_output, parser);
        html_output
    } else {
        body.to_string()
    };

    format!(
        "<!DOCTYPE html><html><head><meta charset=\"utf-8\" /><style>body{{font-family:Arial,sans-serif;line-height:1.6;padding:32px;color:#0f172a}} h1,h2,h3{{color:#111827}} p,li{{font-size:14px}}</style></head><body>{}</body></html>",
        content_html
    )
}

fn required_placeholders_present(body: &str) -> bool {
    REQUIRED_PLACEHOLDERS.iter().all(|p| body.contains(p))
}

pub fn parse_contract_summary(row: &Value) -> MarketplaceContractSummary {
    MarketplaceContractSummary {
        id: row
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string(),
        status: row
            .get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("draft")
            .to_string(),
        commission_rate: row.get("commission_rate").and_then(|v| v.as_f64()),
        valid_from: row
            .get("valid_from")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        valid_until: row
            .get("valid_until")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        template_name: row
            .get("template_name")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        docuseal_template_id: row
            .get("docuseal_template_id")
            .and_then(|v| v.as_i64())
            .map(|v| v as i32),
        docuseal_status: row
            .get("docuseal_status")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        creator_sign_url: row
            .get("creator_submitter_slug")
            .and_then(|v| v.as_str())
            .map(|slug| format!("https://docuseal.co/s/{}", slug)),
        agency_sign_url: row
            .get("agency_submitter_slug")
            .and_then(|v| v.as_str())
            .map(|slug| format!("https://docuseal.co/s/{}", slug)),
        signed_document_url: row
            .get("signed_document_url")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        disconnect_status: row
            .get("disconnect_status")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        disconnect_requested_by: row
            .get("disconnect_requested_by")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        disconnect_requested_at: row
            .get("disconnect_requested_at")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        disconnect_reason: row
            .get("disconnect_reason")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        disconnect_reviewed_at: row
            .get("disconnect_reviewed_at")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
    }
}

fn supabase_auth_base_url(state: &AppState) -> String {
    state
        .supabase_url
        .trim_end_matches('/')
        .trim_end_matches("/rest/v1")
        .to_string()
}

async fn lookup_auth_user_email(state: &AppState, user_id: &str) -> Option<String> {
    let user_id = user_id.trim();
    if user_id.is_empty() {
        return None;
    }

    let url = format!(
        "{}/auth/v1/admin/users/{}",
        supabase_auth_base_url(state),
        user_id
    );
    let client = reqwest::Client::new();
    let resp = client
        .get(&url)
        .header("apikey", state.supabase_service_key.clone())
        .header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        )
        .send()
        .await
        .ok()?;

    if !resp.status().is_success() {
        return None;
    }

    let payload: Value = resp.json().await.ok()?;
    payload
        .get("email")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

struct MarketplaceContractNotification<'a> {
    creator_user_id: &'a str,
    agency_id: &'a str,
    agency_name: &'a str,
    creator_email: Option<&'a str>,
    creator_sign_url: Option<&'a str>,
    contract_id: &'a str,
    invite_id: &'a str,
}

async fn notify_creator_about_marketplace_contract(
    state: &AppState,
    notification: MarketplaceContractNotification<'_>,
) {
    let subject = format!(
        "{} sent you a marketplace connection contract",
        notification.agency_name
    );
    let mut body = format!(
        "{} sent you a marketplace connection contract on Likelee.\n\nYou can review and sign it from your Talent Portal.",
        notification.agency_name
    );
    if let Some(url) = notification
        .creator_sign_url
        .filter(|s| !s.trim().is_empty())
    {
        body.push_str(&format!("\n\nDirect signing link: {}", url));
    }

    let insert = json!({
        "talent_user_id": notification.creator_user_id,
        "agency_id": notification.agency_id,
        "channel": if notification.creator_email.is_some() { "email_and_dashboard" } else { "dashboard" },
        "from_label": notification.agency_name,
        "subject": subject,
        "message": body,
        "meta_json": {
            "contract_id": notification.contract_id,
            "invite_id": notification.invite_id,
            "creator_sign_url": notification.creator_sign_url,
            "notification_type": "marketplace_contract_signature"
        },
    });
    let _ = state
        .pg
        .from("talent_notifications")
        .insert(insert.to_string())
        .execute()
        .await;

    if let Some(dest) = notification.creator_email.filter(|s| !s.trim().is_empty()) {
        let _ = email::send_plain_text_email(
            state,
            dest,
            &subject,
            &body,
            Some(notification.agency_name),
        );
    }
}

async fn resolve_creator_identity(
    state: &AppState,
    creator_id: &str,
) -> Result<(String, Option<String>), (StatusCode, String)> {
    let resp = state
        .pg
        .from("creators")
        .select("full_name,email")
        .eq("id", creator_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        return Err(sanitize_db_error(status.as_u16(), text));
    }
    let rows: Vec<Value> = serde_json::from_str(&text).unwrap_or_default();
    let row = rows.first().ok_or((
        StatusCode::NOT_FOUND,
        "creator not found for marketplace contract".to_string(),
    ))?;
    let creator_name = row
        .get("full_name")
        .and_then(|v| v.as_str())
        .unwrap_or("Creator")
        .trim()
        .to_string();
    let creator_email = row
        .get("email")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());
    let creator_email = match creator_email {
        Some(email) => Some(email),
        None => lookup_auth_user_email(state, creator_id).await,
    };
    Ok((creator_name, creator_email))
}

pub async fn resolve_agency_identity(
    state: &AppState,
    agency_id: &str,
) -> Result<(String, String), (StatusCode, String)> {
    let resp = state
        .pg
        .from("agencies")
        .select("agency_name,email")
        .eq("id", agency_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        return Err(sanitize_db_error(status.as_u16(), text));
    }
    let rows: Vec<Value> = serde_json::from_str(&text).unwrap_or_default();
    let row = rows.first().ok_or((
        StatusCode::NOT_FOUND,
        "agency not found for marketplace contract".to_string(),
    ))?;
    let agency_name = row
        .get("agency_name")
        .and_then(|v| v.as_str())
        .unwrap_or("Agency")
        .trim()
        .to_string();
    let agency_email = row
        .get("email")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    if agency_email.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "agency does not have an email address for signing".to_string(),
        ));
    }
    Ok((agency_name, agency_email))
}

async fn ensure_invite_row(
    state: &AppState,
    agency_id: &str,
    creator_id: &str,
) -> Result<String, (StatusCode, String)> {
    let existing_resp = state
        .pg
        .from("creator_agency_invites")
        .select("id,status")
        .eq("agency_id", agency_id)
        .eq("creator_id", creator_id)
        .order("created_at.desc")
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = existing_resp.status();
    let text = existing_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        return Err(sanitize_db_error(status.as_u16(), text));
    }
    let rows: Vec<Value> = serde_json::from_str(&text).unwrap_or_default();
    if let Some(row) = rows.first() {
        let invite_id = row
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        if !invite_id.is_empty() {
            let _ = state
                .pg
                .from("creator_agency_invites")
                .eq("id", &invite_id)
                .update(
                    json!({
                        "status": "pending",
                        "responded_at": Value::Null,
                        "updated_at": chrono::Utc::now().to_rfc3339(),
                    })
                    .to_string(),
                )
                .execute()
                .await;
            return Ok(invite_id);
        }
    }

    let create_resp = state
        .pg
        .from("creator_agency_invites")
        .insert(
            json!({
                "agency_id": agency_id,
                "creator_id": creator_id,
                "status": "pending",
            })
            .to_string(),
        )
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let create_status = create_resp.status();
    let create_text = create_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !create_status.is_success() {
        return Err(sanitize_db_error(create_status.as_u16(), create_text));
    }
    let rows: Vec<Value> = serde_json::from_str(&create_text).unwrap_or_default();
    let invite_id = rows
        .first()
        .and_then(|row| row.get("id"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    if invite_id.is_empty() {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            "failed to create marketplace invite".to_string(),
        ));
    }
    Ok(invite_id)
}

async fn resolve_template(
    state: &AppState,
    agency_id: &str,
    template_id: Option<&str>,
) -> Result<Option<Value>, (StatusCode, String)> {
    let Some(template_id) = template_id.filter(|id| !id.trim().is_empty()) else {
        return Ok(None);
    };
    let resp = state
        .pg
        .from("license_templates")
        .select("id,template_name,contract_body,contract_body_format")
        .eq("id", template_id)
        .eq("agency_id", agency_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        return Err(sanitize_db_error(status.as_u16(), text));
    }
    let rows: Vec<Value> = serde_json::from_str(&text).unwrap_or_default();
    Ok(rows.first().cloned())
}

async fn activate_connection_from_contract_row(
    state: &AppState,
    row: &Value,
) -> Result<(), (StatusCode, String)> {
    let agency_id = row
        .get("agency_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let creator_id = row
        .get("creator_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let invite_id = row
        .get("invite_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    if agency_id.is_empty() || creator_id.is_empty() {
        return Ok(());
    }

    let au_lookup_resp = state
        .pg
        .from("agency_users")
        .select("id")
        .eq("agency_id", &agency_id)
        .eq("creator_id", &creator_id)
        .eq("role", "talent")
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let au_lookup_text = au_lookup_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let au_rows: Vec<Value> = serde_json::from_str(&au_lookup_text).unwrap_or_default();
    let talent_id = au_rows
        .first()
        .and_then(|r| r.get("id"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let existing_rel_resp = state
        .pg
        .from("agency_talent_relationships")
        .select("id,talent_id,creator_id")
        .eq("agency_id", &agency_id)
        .eq("creator_id", &creator_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let existing_rel_status = existing_rel_resp.status();
    let existing_rel_text = existing_rel_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !existing_rel_status.is_success() {
        return Err(sanitize_db_error(
            existing_rel_status.as_u16(),
            existing_rel_text,
        ));
    }
    let existing_rel_rows: Vec<Value> =
        serde_json::from_str(&existing_rel_text).unwrap_or_default();

    let rel_payload = json!({
        "agency_id": agency_id,
        "talent_id": talent_id,
        "creator_id": creator_id,
        "status": "active",
        "updated_at": chrono::Utc::now().to_rfc3339(),
    });

    let rel_resp = if let Some(existing_rel_id) = existing_rel_rows
        .first()
        .and_then(|r| r.get("id"))
        .and_then(|v| v.as_str())
        .filter(|id| !id.trim().is_empty())
    {
        state
            .pg
            .from("agency_talent_relationships")
            .eq("id", existing_rel_id)
            .update(rel_payload.to_string())
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    } else {
        state
            .pg
            .from("agency_talent_relationships")
            .insert(rel_payload.to_string())
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    };
    let rel_status = rel_resp.status();
    if !rel_status.is_success() {
        let rel_err = rel_resp.text().await.unwrap_or_default();
        return Err(sanitize_db_error(rel_status.as_u16(), rel_err));
    }

    if !invite_id.is_empty() {
        let _ = state
            .pg
            .from("creator_agency_invites")
            .eq("id", invite_id)
            .update(
                json!({
                    "status": "accepted",
                    "responded_at": chrono::Utc::now().to_rfc3339(),
                    "updated_at": chrono::Utc::now().to_rfc3339(),
                })
                .to_string(),
            )
            .execute()
            .await;
    }

    Ok(())
}

pub async fn remove_live_connection_for_contract_row(state: &AppState, row: &Value) {
    let agency_id = row
        .get("agency_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let creator_id = row
        .get("creator_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    if agency_id.is_empty() || creator_id.is_empty() {
        return;
    }
    let _ = state
        .pg
        .from("agency_talent_relationships")
        .eq("agency_id", &agency_id)
        .eq("creator_id", &creator_id)
        .delete()
        .execute()
        .await;
}

pub async fn create_marketplace_connect_contract(
    state: &AppState,
    agency_id: &str,
    creator_id: &str,
    payload: &MarketplaceConnectPayload,
) -> Result<Value, (StatusCode, String)> {
    let existing_resp = state
        .pg
        .from("agency_creator_marketplace_contracts")
        .select("*")
        .eq("agency_id", agency_id)
        .eq("creator_id", creator_id)
        .in_("status", vec!["pending_signature", "active"])
        .order("created_at.desc")
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let existing_status = existing_resp.status();
    let existing_text = existing_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if existing_status.is_success() {
        let rows: Vec<Value> = serde_json::from_str(&existing_text).unwrap_or_default();
        if let Some(existing_row) = rows.first() {
            let synced = sync_contract_for_row(state, existing_row).await?;
            if synced.status == "active" {
                return Ok(json!({ "status": "connected", "contract": synced }));
            }
            if synced.status == "pending_signature" {
                return Ok(json!({ "status": "pending_signature", "contract": synced }));
            }
        }
    }

    let commission_rate = payload.commission_rate.ok_or((
        StatusCode::BAD_REQUEST,
        "commission_rate is required for marketplace contracts".to_string(),
    ))?;
    let valid_from = payload.valid_from.clone().ok_or((
        StatusCode::BAD_REQUEST,
        "valid_from is required for marketplace contracts".to_string(),
    ))?;
    let valid_until = payload.valid_until.clone().ok_or((
        StatusCode::BAD_REQUEST,
        "valid_until is required for marketplace contracts".to_string(),
    ))?;
    let valid_from_date =
        chrono::NaiveDate::parse_from_str(&valid_from, "%Y-%m-%d").map_err(|_| {
            (
                StatusCode::BAD_REQUEST,
                "valid_from must be YYYY-MM-DD".to_string(),
            )
        })?;
    let valid_until_date =
        chrono::NaiveDate::parse_from_str(&valid_until, "%Y-%m-%d").map_err(|_| {
            (
                StatusCode::BAD_REQUEST,
                "valid_until must be YYYY-MM-DD".to_string(),
            )
        })?;
    if valid_until_date < valid_from_date {
        return Err((
            StatusCode::BAD_REQUEST,
            "valid_until must be on or after valid_from".to_string(),
        ));
    }

    let template =
        resolve_template(state, agency_id, payload.contract_template_id.as_deref()).await?;
    let template_body = template
        .as_ref()
        .and_then(|t| t.get("contract_body"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let contract_body = payload
        .contract_body
        .clone()
        .filter(|s| !s.trim().is_empty())
        .or_else(|| (!template_body.trim().is_empty()).then_some(template_body))
        .unwrap_or_else(default_contract_template);
    if !required_placeholders_present(&contract_body) {
        return Err((
            StatusCode::BAD_REQUEST,
            format!(
                "contract body must include required placeholders: {}",
                REQUIRED_PLACEHOLDERS.join(", ")
            ),
        ));
    }
    let contract_body_format = payload
        .contract_body_format
        .clone()
        .filter(|f| f == "markdown" || f == "html")
        .or_else(|| {
            template
                .as_ref()
                .and_then(|t| t.get("contract_body_format"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        })
        .unwrap_or_else(|| "markdown".to_string());

    let (agency_name, _) = resolve_agency_identity(state, agency_id).await?;
    let (creator_name, _) = resolve_creator_identity(state, creator_id).await?;
    let invite_id = ensure_invite_row(state, agency_id, creator_id).await?;

    let replacements = HashMap::from([
        ("agency_name".to_string(), agency_name.clone()),
        ("creator_name".to_string(), creator_name.clone()),
        (
            "commission_rate".to_string(),
            format!("{:.2}%", commission_rate.clamp(0.0, 100.0)),
        ),
        ("valid_from".to_string(), valid_from.clone()),
        ("valid_until".to_string(), valid_until.clone()),
    ]);
    let rendered_contract = replace_placeholders(&contract_body, &replacements);
    let html = render_contract_to_html(&rendered_contract, &contract_body_format);

    let docuseal = DocuSealClient::new(
        state.docuseal_api_key.clone(),
        state.docuseal_base_url.clone(),
    );
    let ds_template = docuseal
        .create_template_from_html(
            template
                .as_ref()
                .and_then(|t| t.get("template_name"))
                .and_then(|v| v.as_str())
                .unwrap_or("Marketplace Creator Connection Contract")
                .to_string(),
            html,
        )
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("failed to create DocuSeal template: {}", e),
            )
        })?;

    let insert_payload = json!({
        "agency_id": agency_id,
        "creator_id": creator_id,
        "invite_id": invite_id,
        "template_id": template.as_ref().and_then(|t| t.get("id")).and_then(|v| v.as_str()),
        "template_name": template
            .as_ref()
            .and_then(|t| t.get("template_name"))
            .and_then(|v| v.as_str())
            .unwrap_or("Marketplace Creator Connection Contract"),
        "contract_body": contract_body,
        "contract_body_format": contract_body_format,
        "rendered_contract_body": rendered_contract,
        "commission_rate": commission_rate,
        "valid_from": valid_from,
        "valid_until": valid_until,
        "placeholder_values": json!(replacements),
        "status": "draft",
        "docuseal_template_id": ds_template.id,
        "docuseal_status": "draft",
        "updated_at": chrono::Utc::now().to_rfc3339(),
    });
    let insert_resp = state
        .pg
        .from("agency_creator_marketplace_contracts")
        .insert(insert_payload.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let insert_status = insert_resp.status();
    let insert_text = insert_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !insert_status.is_success() {
        return Err(sanitize_db_error(insert_status.as_u16(), insert_text));
    }
    let rows: Vec<Value> = serde_json::from_str(&insert_text).unwrap_or_default();
    let contract_row = rows.first().cloned().ok_or((
        StatusCode::INTERNAL_SERVER_ERROR,
        "failed to persist marketplace contract".to_string(),
    ))?;
    if let Some(contract_id) = contract_row.get("id").and_then(|v| v.as_str()) {
        let _ = state
            .pg
            .from("creator_agency_invites")
            .eq("id", &invite_id)
            .update(
                json!({
                    "contract_id": contract_id,
                    "updated_at": chrono::Utc::now().to_rfc3339(),
                })
                .to_string(),
            )
            .execute()
            .await;
    }

    Ok(json!({
        "status": "draft",
        "contract": parse_contract_summary(&contract_row),
    }))
}

pub async fn finalize_contract_endpoint(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(path): Path<FinalizeContractPath>,
) -> Result<Json<Value>, (StatusCode, String)> {
    RoleGuard::new(vec!["agency"]).check(&auth_user.role)?;

    let resp = state
        .pg
        .from("agency_creator_marketplace_contracts")
        .select("*")
        .eq("id", &path.id)
        .eq("agency_id", &auth_user.id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        return Err(sanitize_db_error(status.as_u16(), text));
    }
    let rows: Vec<Value> = serde_json::from_str(&text).unwrap_or_default();
    let row = rows.first().cloned().ok_or((
        StatusCode::NOT_FOUND,
        "marketplace contract not found".to_string(),
    ))?;

    let current_status = row
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("draft");
    if current_status == "pending_signature" || current_status == "active" {
        return Ok(Json(json!({
            "status": current_status,
            "contract": parse_contract_summary(&row),
        })));
    }

    let contract_id = row
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let agency_id = row
        .get("agency_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let creator_id = row
        .get("creator_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let invite_id = row
        .get("invite_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let docuseal_template_id = row
        .get("docuseal_template_id")
        .and_then(|v| v.as_i64())
        .map(|v| v as i32)
        .ok_or((
            StatusCode::BAD_REQUEST,
            "DocuSeal template is missing for this contract draft".to_string(),
        ))?;

    let (agency_name, agency_email) = resolve_agency_identity(&state, &agency_id).await?;
    let (creator_name, creator_email) = resolve_creator_identity(&state, &creator_id).await?;

    let docuseal = DocuSealClient::new(
        state.docuseal_api_key.clone(),
        state.docuseal_base_url.clone(),
    );
    let submission = docuseal
        .create_submission_with_submitters(
            docuseal_template_id,
            vec![
                Submitter {
                    name: Some(agency_name.clone()),
                    email: Some(agency_email),
                    role: Some("First Party".to_string()),
                    order: Some(0),
                    fields: None,
                    values: None,
                },
                Submitter {
                    name: Some(creator_name.clone()),
                    email: creator_email.clone(),
                    role: Some("Second Party".to_string()),
                    order: Some(1),
                    fields: None,
                    values: None,
                },
            ],
            creator_email.is_some(),
        )
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("failed to create DocuSeal submission: {}", e),
            )
        })?;

    let agency_submitter = submission.submitters.first().cloned();
    let creator_submitter = submission.submitters.get(1).cloned();
    let creator_sign_url = creator_submitter
        .as_ref()
        .map(|submitter| format!("https://docuseal.co/s/{}", submitter.slug));

    let update_payload = json!({
        "status": "pending_signature",
        "docuseal_submission_id": submission.id,
        "docuseal_status": "sent",
        "agency_submitter_id": agency_submitter.as_ref().map(|s| s.id),
        "agency_submitter_slug": agency_submitter.as_ref().map(|s| s.slug.clone()),
        "agency_embed_src": agency_submitter
            .as_ref()
            .and_then(|s| s.embed_src.clone())
            .or_else(|| agency_submitter.as_ref().map(|s| format!("{}/s/{}", state.docuseal_app_url.trim_end_matches('/'), s.slug))),
        "creator_submitter_id": creator_submitter.as_ref().map(|s| s.id),
        "creator_submitter_slug": creator_submitter.as_ref().map(|s| s.slug.clone()),
        "sent_at": chrono::Utc::now().to_rfc3339(),
        "last_synced_at": chrono::Utc::now().to_rfc3339(),
        "updated_at": chrono::Utc::now().to_rfc3339(),
    });
    let update_resp = state
        .pg
        .from("agency_creator_marketplace_contracts")
        .eq("id", &contract_id)
        .eq("agency_id", &agency_id)
        .update(update_payload.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let update_status = update_resp.status();
    let update_text = update_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !update_status.is_success() {
        return Err(sanitize_db_error(update_status.as_u16(), update_text));
    }
    let updated_rows: Vec<Value> = serde_json::from_str(&update_text).unwrap_or_default();
    let updated_row = updated_rows.first().cloned().unwrap_or(row);

    notify_creator_about_marketplace_contract(
        &state,
        MarketplaceContractNotification {
            creator_user_id: &creator_id,
            agency_id: &agency_id,
            agency_name: &agency_name,
            creator_email: creator_email.as_deref(),
            creator_sign_url: creator_sign_url.as_deref(),
            contract_id: &contract_id,
            invite_id: &invite_id,
        },
    )
    .await;

    Ok(Json(json!({
        "status": "pending_signature",
        "contract": parse_contract_summary(&updated_row),
    })))
}

pub async fn get_latest_contract_for_pair(
    state: &AppState,
    agency_id: &str,
    creator_id: &str,
) -> Option<MarketplaceContractSummary> {
    let row = get_latest_contract_row_for_pair(state, agency_id, creator_id)
        .await
        .ok()
        .flatten()?;
    Some(parse_contract_summary(&row))
}

pub async fn get_latest_contract_row_for_pair(
    state: &AppState,
    agency_id: &str,
    creator_id: &str,
) -> Result<Option<Value>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("agency_creator_marketplace_contracts")
        .select("*")
        .eq("agency_id", agency_id)
        .eq("creator_id", creator_id)
        .order("created_at.desc")
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        return Err(sanitize_db_error(status.as_u16(), text));
    }
    let rows: Vec<Value> = serde_json::from_str(&text).unwrap_or_default();
    Ok(rows.first().cloned())
}

pub async fn get_latest_live_contract_for_pair(
    state: &AppState,
    agency_id: &str,
    creator_id: &str,
) -> Option<MarketplaceContractSummary> {
    let row = get_latest_contract_row_for_pair(state, agency_id, creator_id)
        .await
        .ok()
        .flatten()?;
    let status = row
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("draft");
    if matches!(status, "draft" | "pending_signature" | "active") {
        if let Ok(summary) = sync_contract_for_row(state, &row).await {
            return Some(summary);
        }
    }
    Some(parse_contract_summary(&row))
}

pub async fn sync_open_contracts_for_creator(
    state: &AppState,
    creator_id: &str,
) -> Result<(), (StatusCode, String)> {
    if creator_id.trim().is_empty() {
        return Ok(());
    }

    let resp = state
        .pg
        .from("agency_creator_marketplace_contracts")
        .select("*")
        .eq("creator_id", creator_id)
        .in_("status", vec!["draft", "pending_signature", "active"])
        .order("created_at.desc")
        .limit(50)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        return Err(sanitize_db_error(status.as_u16(), text));
    }

    let rows: Vec<Value> = serde_json::from_str(&text).unwrap_or_default();
    for row in &rows {
        let _ = sync_contract_for_row(state, row).await?;
    }
    Ok(())
}

pub async fn sync_open_contracts_for_agency(
    state: &AppState,
    agency_id: &str,
) -> Result<(), (StatusCode, String)> {
    if agency_id.trim().is_empty() {
        return Ok(());
    }

    let resp = state
        .pg
        .from("agency_creator_marketplace_contracts")
        .select("*")
        .eq("agency_id", agency_id)
        .in_("status", vec!["draft", "pending_signature", "active"])
        .order("created_at.desc")
        .limit(100)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        return Err(sanitize_db_error(status.as_u16(), text));
    }

    let rows: Vec<Value> = serde_json::from_str(&text).unwrap_or_default();
    for row in &rows {
        let _ = sync_contract_for_row(state, row).await?;
    }
    Ok(())
}

pub async fn sync_contract_for_row(
    state: &AppState,
    row: &Value,
) -> Result<MarketplaceContractSummary, (StatusCode, String)> {
    let contract_id = row
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let submission_id = row
        .get("docuseal_submission_id")
        .and_then(|v| v.as_i64())
        .map(|v| v as i32);
    if contract_id.is_empty() || submission_id.is_none() {
        return Ok(parse_contract_summary(row));
    }

    let docuseal = DocuSealClient::new(
        state.docuseal_api_key.clone(),
        state.docuseal_base_url.clone(),
    );
    let submission = match docuseal.get_submission(submission_id.unwrap()).await {
        Ok(s) => s,
        Err(e) => {
            warn!(
                contract_id = %contract_id,
                submission_id = %submission_id.unwrap(),
                error = %e,
                "failed to sync DocuSeal submission, skipping for now"
            );
            return Ok(parse_contract_summary(row));
        }
    };

    let live_status = submission.status.to_lowercase();
    let mut next_status = row
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("pending_signature")
        .to_string();
    if live_status == "completed" || live_status == "signed" {
        next_status = "active".to_string();
    } else if live_status == "declined" {
        next_status = "declined".to_string();
    } else if live_status == "archived" || live_status == "voided" {
        next_status = "voided".to_string();
    }

    let today = chrono::Utc::now().date_naive();
    let valid_until = row
        .get("valid_until")
        .and_then(|v| v.as_str())
        .and_then(|s| chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());
    let existing_signed_at = row
        .get("signed_at")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    if next_status == "active" && valid_until.map(|d| d < today).unwrap_or(false) {
        next_status = "expired".to_string();
    }

    let signed_document_url = submission.documents.first().map(|doc| doc.url.clone());
    let update_payload = json!({
        "status": next_status,
        "docuseal_status": live_status,
        "signed_document_url": signed_document_url,
        "signed_at": if next_status == "active" {
            existing_signed_at
                .map(Value::String)
                .unwrap_or_else(|| json!(chrono::Utc::now().to_rfc3339()))
        } else {
            existing_signed_at.map(Value::String).unwrap_or(Value::Null)
        },
        "last_synced_at": chrono::Utc::now().to_rfc3339(),
        "updated_at": chrono::Utc::now().to_rfc3339(),
    });
    let update_resp = state
        .pg
        .from("agency_creator_marketplace_contracts")
        .eq("id", &contract_id)
        .update(update_payload.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = update_resp.status();
    let text = update_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        return Err(sanitize_db_error(status.as_u16(), text));
    }
    let rows: Vec<Value> = serde_json::from_str(&text).unwrap_or_default();
    let updated = rows.first().cloned().unwrap_or_else(|| row.clone());

    match next_status.as_str() {
        "active" => {
            activate_connection_from_contract_row(state, &updated).await?;
        }
        "expired" | "terminated" => {
            remove_live_connection_for_contract_row(state, &updated).await;
        }
        "declined" | "voided" => {
            if let Some(invite_id) = updated.get("invite_id").and_then(|v| v.as_str()) {
                let _ = state
                    .pg
                    .from("creator_agency_invites")
                    .eq("id", invite_id)
                    .update(
                        json!({
                            "status": "declined",
                            "responded_at": chrono::Utc::now().to_rfc3339(),
                            "updated_at": chrono::Utc::now().to_rfc3339(),
                        })
                        .to_string(),
                    )
                    .execute()
                    .await;
            }
        }
        _ => {}
    }

    Ok(parse_contract_summary(&updated))
}

async fn apply_webhook_status_to_contract_row(
    state: &AppState,
    row: &Value,
    live_status: &str,
    payload: Option<&Value>,
) -> Result<MarketplaceContractSummary, (StatusCode, String)> {
    let contract_id = row
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    if contract_id.is_empty() {
        return Ok(parse_contract_summary(row));
    }

    let mut next_status = row
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("pending_signature")
        .to_string();

    if live_status == "completed" || live_status == "signed" {
        next_status = "active".to_string();
    } else if live_status == "declined" {
        next_status = "declined".to_string();
    } else if live_status == "archived" || live_status == "voided" {
        next_status = "voided".to_string();
    } else if live_status == "opened" || live_status == "viewed" || live_status == "started" {
        next_status = "pending_signature".to_string();
    }

    let today = chrono::Utc::now().date_naive();
    let valid_until = row
        .get("valid_until")
        .and_then(|v| v.as_str())
        .and_then(|s| chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());
    let existing_signed_at = row
        .get("signed_at")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    if next_status == "active" && valid_until.map(|d| d < today).unwrap_or(false) {
        next_status = "expired".to_string();
    }

    let signed_document_url = payload
        .and_then(|value| value.get("documents"))
        .and_then(|v| v.as_array())
        .and_then(|docs| docs.first())
        .and_then(|doc| doc.get("url"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .or_else(|| {
            row.get("signed_document_url")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        });

    let update_payload = json!({
        "status": next_status,
        "docuseal_status": live_status,
        "signed_document_url": signed_document_url,
        "signed_at": if next_status == "active" {
            existing_signed_at
                .map(Value::String)
                .unwrap_or_else(|| json!(chrono::Utc::now().to_rfc3339()))
        } else {
            existing_signed_at.map(Value::String).unwrap_or(Value::Null)
        },
        "last_synced_at": chrono::Utc::now().to_rfc3339(),
        "updated_at": chrono::Utc::now().to_rfc3339(),
    });
    let update_resp = state
        .pg
        .from("agency_creator_marketplace_contracts")
        .eq("id", &contract_id)
        .update(update_payload.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = update_resp.status();
    let text = update_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        return Err(sanitize_db_error(status.as_u16(), text));
    }
    let rows: Vec<Value> = serde_json::from_str(&text).unwrap_or_default();
    let updated = rows.first().cloned().unwrap_or_else(|| row.clone());

    match next_status.as_str() {
        "active" => {
            activate_connection_from_contract_row(state, &updated).await?;
        }
        "expired" | "terminated" => {
            remove_live_connection_for_contract_row(state, &updated).await;
        }
        "declined" | "voided" => {
            if let Some(invite_id) = updated.get("invite_id").and_then(|v| v.as_str()) {
                let _ = state
                    .pg
                    .from("creator_agency_invites")
                    .eq("id", invite_id)
                    .update(
                        json!({
                            "status": "declined",
                            "responded_at": chrono::Utc::now().to_rfc3339(),
                            "updated_at": chrono::Utc::now().to_rfc3339(),
                        })
                        .to_string(),
                    )
                    .execute()
                    .await;
            }
        }
        _ => {}
    }

    Ok(parse_contract_summary(&updated))
}

pub async fn sync_contract_endpoint(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(path): Path<SyncContractPath>,
) -> Result<Json<Value>, (StatusCode, String)> {
    RoleGuard::new(vec!["agency", "creator", "talent"]).check(&auth_user.role)?;
    let resp = state
        .pg
        .from("agency_creator_marketplace_contracts")
        .select("*")
        .eq("id", &path.id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        return Err(sanitize_db_error(status.as_u16(), text));
    }
    let rows: Vec<Value> = serde_json::from_str(&text).unwrap_or_default();
    let row = rows.first().ok_or((
        StatusCode::NOT_FOUND,
        "marketplace contract not found".to_string(),
    ))?;

    let agency_id = row.get("agency_id").and_then(|v| v.as_str()).unwrap_or("");
    let creator_id = row.get("creator_id").and_then(|v| v.as_str()).unwrap_or("");
    let effective_creator_id = if auth_user.role == "creator" || auth_user.role == "talent" {
        crate::creators::face_profiles::resolve_effective_creator_id(&state, &auth_user).await?
    } else {
        auth_user.id.clone()
    };
    let authorized = auth_user.id == agency_id || effective_creator_id == creator_id;
    if !authorized {
        return Err((StatusCode::FORBIDDEN, "not authorized".to_string()));
    }

    let synced = sync_contract_for_row(&state, row).await?;
    Ok(Json(json!({
        "status": "ok",
        "contract": synced,
    })))
}

pub async fn handle_webhook(
    State(state): State<AppState>,
    Json(payload): Json<DocuSealWebhookEvent>,
) -> Result<StatusCode, (StatusCode, String)> {
    info!(
        event_type = %payload.event_type,
        timestamp = %payload.timestamp,
        "Received DocuSeal marketplace contract webhook"
    );

    let status_update = match payload.event_type.as_str() {
        "submission.started" | "submission.opened" | "submission.viewed" | "form.started"
        | "form.viewed" => Some("opened"),
        "submission.completed" | "form.completed" => Some("completed"),
        "submission.declined" | "form.declined" => Some("declined"),
        "submission.expired" => Some("voided"),
        _ => None,
    };

    if status_update.is_none() {
        return Ok(StatusCode::OK);
    }

    let submission_id = payload.data["submission_id"]
        .as_i64()
        .or_else(|| payload.data["id"].as_i64())
        .ok_or_else(|| {
            error!("Missing submission id in DocuSeal marketplace webhook");
            (StatusCode::BAD_REQUEST, "Missing submission id".to_string())
        })?;

    let resp = state
        .pg
        .from("agency_creator_marketplace_contracts")
        .select("*")
        .eq("docuseal_submission_id", submission_id.to_string())
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        return Err(sanitize_db_error(status.as_u16(), text));
    }
    let rows: Vec<Value> = serde_json::from_str(&text).unwrap_or_default();
    let Some(row) = rows.first() else {
        info!(
            submission_id,
            "No marketplace contract found for DocuSeal webhook submission"
        );
        return Ok(StatusCode::OK);
    };

    let _ = apply_webhook_status_to_contract_row(
        &state,
        row,
        status_update.unwrap(),
        Some(&payload.data),
    )
    .await?;
    Ok(StatusCode::OK)
}
