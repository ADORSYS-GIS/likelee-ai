use crate::{
    auth::AuthUser,
    config::AppState,
    errors::sanitize_db_error,
    services::docuseal::{DocuSealClient, Submitter},
    team::{
        self,
        permissions::Permission,
    },
};
use axum::{
    body::Body,
    extract::{Multipart, Path, Query, State},
    http::{header, HeaderMap, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use base64::{engine::general_purpose, Engine as _};
use chrono::{Datelike, TimeZone};
use postgrest::Postgrest;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::str::FromStr;
use stripe_sdk;
use tracing::{error, info};
use uuid::Uuid;

fn offer_contract_status_is_signed(value: &serde_json::Value) -> bool {
    let st = value.as_str().unwrap_or("").trim().to_lowercase();
    st == "completed" || st == "signed"
}

async fn attach_is_fully_signed_to_offers(
    state: &AppState,
    offers: &mut [serde_json::Value],
) -> Result<(), String> {
    let offer_ids: Vec<String> = offers
        .iter()
        .filter_map(|o| {
            o.get("id")
                .and_then(|v| v.as_str())
                .map(|s| s.trim().to_string())
        })
        .filter(|id| !id.is_empty())
        .collect();
    if offer_ids.is_empty() {
        return Ok(());
    }
    let offer_refs: Vec<&str> = offer_ids.iter().map(|s| s.as_str()).collect();

    // 1) Signed via offer workflow status (fallback).
    // NOTE: offer.status advances during deliverables/review; treat any post-signature status as signed.
    let mut signed_offer_ids: std::collections::HashSet<String> = std::collections::HashSet::new();
    for o in offers.iter() {
        let offer_id = o.get("id").and_then(|v| v.as_str()).unwrap_or("").trim();
        if offer_id.is_empty() {
            continue;
        }
        let st = o
            .get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_lowercase();
        if matches!(
            st.as_str(),
            "contract_fully_signed"
                | "signed"
                | "in_execution"
                | "deliverables_submitted"
                | "in_review"
                | "changes_requested"
                | "approved"
                | "completed"
        ) {
            signed_offer_ids.insert(offer_id.to_string());
        }
    }

    // 2) Signed via DocuSeal contract state.
    let contracts_resp = state
        .pg
        .from("campaign_offer_contracts")
        .select("offer_id,docuseal_status,status")
        .in_("offer_id", offer_refs)
        .limit(5000)
        .execute()
        .await
        .map_err(|e| e.to_string())?;

    if contracts_resp.status().is_success() {
        let contracts_text = contracts_resp.text().await.unwrap_or_else(|_| "[]".into());
        let contracts: Vec<serde_json::Value> =
            serde_json::from_str(&contracts_text).unwrap_or_default();
        for row in &contracts {
            let offer_id = row
                .get("offer_id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim();
            if offer_id.is_empty() {
                continue;
            }
            let signed = row
                .get("docuseal_status")
                .map(offer_contract_status_is_signed)
                .unwrap_or(false)
                || row
                    .get("status")
                    .map(offer_contract_status_is_signed)
                    .unwrap_or(false);
            if signed {
                signed_offer_ids.insert(offer_id.to_string());
            }
        }
    }

    for o in offers.iter_mut() {
        if let Some(obj) = o.as_object_mut() {
            let offer_id = obj.get("id").and_then(|v| v.as_str()).unwrap_or("").trim();
            let signed = !offer_id.is_empty() && signed_offer_ids.contains(offer_id);
            obj.insert("is_fully_signed".to_string(), json!(signed));
        }
    }

    Ok(())
}

#[derive(Debug, Serialize)]
struct EscrowReleaseOutcome {
    payment_status: String,
    escrow_status: String,
    released_now: bool,
}

#[derive(Debug, Deserialize)]
pub struct CreateBrandCampaignRequest {
    pub name: String,
    pub objective: String,
    pub category: String,
    pub description: String,
    pub usage_scope: Option<String>,
    pub duration_days: Option<i32>,
    pub territory: Option<String>,
    pub exclusivity: Option<String>,
    pub budget_range: String,
    pub start_date: String,
    pub custom_terms: Option<String>,
    pub brief_snapshot: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateBrandCampaignRequest {
    pub name: Option<String>,
    pub objective: Option<String>,
    pub category: Option<String>,
    pub description: Option<String>,
    pub usage_scope: Option<String>,
    pub duration_days: Option<i32>,
    pub territory: Option<String>,
    pub exclusivity: Option<String>,
    pub budget_range: Option<String>,
    pub start_date: Option<String>,
    pub custom_terms: Option<String>,
    pub brief_snapshot: Option<serde_json::Value>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ListCampaignQuery {
    pub status: Option<String>,
    pub limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct ListActivityEventsQuery {
    pub limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct CampaignMetricsQuery {
    pub month: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCampaignOffersRequest {
    pub target_type: String,
    pub target_ids: Vec<String>,
    pub offer_title: Option<String>,
    pub message: Option<String>,
    pub expires_at: Option<String>,
    pub brief_snapshot: Option<serde_json::Value>,
    pub budget_snapshot: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct OfferOptionsQuery {
    pub target_type: Option<String>,
    pub q: Option<String>,
    pub limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct MyOffersQuery {
    pub status: Option<String>,
    pub limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct OfferResponseRequest {
    pub action: String, // accept | decline
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateOfferContractRequest {
    pub title: Option<String>,
    pub file_url: Option<String>,
    pub docuseal_template_id: Option<i64>,
    pub meta: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct SendOfferContractRequest {
    pub contract_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SyncOfferContractRequest {
    pub contract_id: String,
    pub docuseal_status: Option<String>,
    pub docuseal_submission_id: Option<i64>,
    pub docuseal_slug: Option<String>,
    pub meta: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTemplateFromPdfResponse {
    pub id: String,
    pub slug: String,
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct ContractPath {
    pub offer_id: String,
    pub contract_id: String,
}

#[derive(Debug, Deserialize)]
pub struct GetOfferBuilderTokenRequest {
    pub template_id: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct CreateOfferPackageRequest {
    pub title: Option<String>,
    pub message: Option<String>,
    pub package_snapshot: Option<serde_json::Value>,
    pub expires_at: Option<String>,
    pub meta: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct SendOfferPackageRequest {
    pub package_id: String,
}

#[derive(Debug, Deserialize)]
pub struct PackageDoneRequest {
    pub package_id: String,
    pub selected_talent_ids: Option<Vec<String>>,
    pub feedback_note: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SubmitDeliverableRequest {
    pub asset_url: String,
    pub asset_type: Option<String>,
    pub caption: Option<String>,
    pub brand_id: Option<String>,
    pub brand_campaign_id: Option<String>,
    pub talent_id: Option<String>,
    pub creator_id: Option<String>,
    pub asset_request_id: Option<String>,
    pub meta: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct CreateOfferTalentAssignmentRequest {
    pub talent_id: Option<String>,
    pub creator_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateOfferAssetRequestRequest {
    pub talent_id: Option<String>,
    pub creator_id: Option<String>,
    pub title: Option<String>,
    pub message: Option<String>,
    pub file_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct OfferAssignmentPath {
    pub offer_id: String,
    pub assignment_id: String,
}

#[derive(Debug, Deserialize)]
pub struct OfferAssetRequestPath {
    pub request_id: String,
}

#[derive(Debug, Deserialize)]
pub struct ReviewDeliverableRequest {
    pub action: String, // approve | changes_requested | reject | final_approve
    pub note: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CommentDeliverableRequest {
    pub message: String,
}

#[derive(Debug, Deserialize)]
pub struct OfferPath {
    pub offer_id: String,
}

#[derive(Debug, Deserialize)]
pub struct OfferContractPath {
    pub offer_id: String,
    pub contract_id: String,
}

#[derive(Debug, Deserialize)]
pub struct OfferDeliverablePath {
    pub offer_id: String,
    pub deliverable_id: String,
}

#[derive(Debug, Deserialize, Default)]
pub struct OfferDeliverableFileQuery {
    /// When true, this request is considered an explicit user-initiated download.
    /// Previews (e.g. <img>/<video>) should omit it so they don't get blocked.
    pub download: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct DocuSealWebhookEvent {
    pub event_type: String,
    #[allow(dead_code)]
    pub timestamp: Option<String>,
    pub data: serde_json::Value,
}

fn trim_non_empty(value: &str, field: &str) -> Result<String, (StatusCode, String)> {
    let out = value.trim().to_string();
    if out.is_empty() {
        return Err((StatusCode::BAD_REQUEST, format!("{field} is required")));
    }
    Ok(out)
}

fn is_creator_like(role: &str) -> bool {
    role == "creator" || role == "talent"
}

async fn resolve_agency_talent(
    state: &AppState,
    agency_id: &str,
    talent_id: &str,
) -> Result<serde_json::Value, (StatusCode, String)> {
    // We accept multiple id shapes from the UI:
    // - agency_users.id (canonical)
    // - agency_users.creator_id / agency_users.user_id
    // - agency_talent_relationships.id (legacy roster ids)
    //
    // Always resolve to the canonical agency_users row.

    // 1) canonical: agency_users.id
    let resp = state
        .pg
        .from("agency_users")
        .select("*")
        .eq("id", talent_id)
        .eq("agency_id", agency_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !resp.status().is_success() {
        return Err(sanitize_db_error(
            resp.status().as_u16(),
            resp.text().await.unwrap_or_default(),
        ));
    }
    let text = resp.text().await.unwrap_or_default();
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    if let Some(row) = rows.first().cloned() {
        return Ok(row);
    }

    // 2) creator/user id: agency_users.creator_id or agency_users.user_id
    let resp = state
        .pg
        .from("agency_users")
        .select("*")
        .eq("agency_id", agency_id)
        .or(format!(
            "creator_id.eq.{},user_id.eq.{}",
            talent_id, talent_id
        ))
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !resp.status().is_success() {
        return Err(sanitize_db_error(
            resp.status().as_u16(),
            resp.text().await.unwrap_or_default(),
        ));
    }
    let text = resp.text().await.unwrap_or_default();
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    if let Some(row) = rows.first().cloned() {
        return Ok(row);
    }

    // 3) legacy relationship id: agency_talent_relationships.id -> creator_id -> agency_users
    let rel_resp = state
        .pg
        .from("agency_talent_relationships")
        .select("creator_id")
        .eq("id", talent_id)
        .eq("agency_id", agency_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !rel_resp.status().is_success() {
        return Err(sanitize_db_error(
            rel_resp.status().as_u16(),
            rel_resp.text().await.unwrap_or_default(),
        ));
    }
    let rel_text = rel_resp.text().await.unwrap_or_default();
    let rel_rows: Vec<serde_json::Value> = serde_json::from_str(&rel_text).unwrap_or_default();
    let creator_id = rel_rows
        .first()
        .and_then(|r| r.get("creator_id"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    if !creator_id.is_empty() {
        let resp = state
            .pg
            .from("agency_users")
            .select("*")
            .eq("agency_id", agency_id)
            .or(format!(
                "creator_id.eq.{},user_id.eq.{}",
                creator_id, creator_id
            ))
            .limit(1)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if !resp.status().is_success() {
            return Err(sanitize_db_error(
                resp.status().as_u16(),
                resp.text().await.unwrap_or_default(),
            ));
        }
        let text = resp.text().await.unwrap_or_default();
        let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
        if let Some(row) = rows.first().cloned() {
            return Ok(row);
        }
    }

    Err((StatusCode::NOT_FOUND, "talent not found".to_string()))
}

async fn resolve_offer_assignment_for_creator(
    state: &AppState,
    offer_id: &str,
    creator_id: &str,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let resp = state
        .pg
        .from("offer_talent_assignments")
        .select("*")
        .eq("offer_id", offer_id)
        .eq("creator_id", creator_id)
        .eq("status", "assigned")
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !resp.status().is_success() {
        return Err(sanitize_db_error(
            resp.status().as_u16(),
            resp.text().await.unwrap_or_default(),
        ));
    }
    let text = resp.text().await.unwrap_or_default();
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    if let Some(row) = rows.first().cloned() {
        return Ok(row);
    }

    Err((
        StatusCode::FORBIDDEN,
        "no assigned talent for this offer".to_string(),
    ))
}
async fn resolve_effective_creator_id(state: &AppState, user: &AuthUser) -> String {
    let resp = state
        .pg
        .from("agency_users")
        .select("creator_id")
        .or(format!("id.eq.{},user_id.eq.{}", user.id, user.id))
        .order("updated_at.desc")
        .limit(1)
        .execute()
        .await;

    if let Ok(resp) = resp {
        if resp.status().is_success() {
            let text = resp.text().await.unwrap_or_default();
            let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
            if let Some(mapped) = rows
                .first()
                .and_then(|r| r.get("creator_id"))
                .and_then(|v| v.as_str())
            {
                let s = mapped.trim();
                if !s.is_empty() {
                    return s.to_string();
                }
            }
        }
    }
    user.id.clone()
}

fn docuseal_role_key(role: &str) -> String {
    role.chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .flat_map(|c| c.to_lowercase())
        .collect::<String>()
}

fn is_submitter_signed(status: &str) -> bool {
    matches!(
        status.trim().to_lowercase().as_str(),
        "completed" | "signed" | "done"
    )
}

async fn resolve_agency_signer_email(
    state: &AppState,
    agency_id: &str,
    auth_email: Option<&String>,
) -> Option<String> {
    if let Some(email) = auth_email {
        if !email.trim().is_empty() {
            return Some(email.trim().to_string());
        }
    }

    let resp = state
        .pg
        .from("agencies")
        .select("email")
        .eq("id", agency_id)
        .single()
        .execute()
        .await
        .ok()?;
    let txt = resp.text().await.ok()?;
    let row: serde_json::Value = serde_json::from_str(&txt).ok()?;
    row.get("email")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

async fn ensure_offer_access(
    state: &AppState,
    user: &AuthUser,
    offer_id: &str,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let mut req = state
        .pg
        .from("campaign_offers")
        .select("*")
        .eq("id", offer_id);

    if user.role == "brand" {
        let brand_access = team::require_brand_access(state, user).await?;
        req = req.eq("brand_id", brand_access.organization_id.as_str());
    } else if user.role == "agency" {
        let agency_access = team::require_agency_access(state, user).await?;
        req = req
            .eq("target_type", "agency")
            .eq("target_id", agency_access.organization_id.as_str());
    } else if !is_creator_like(&user.role) {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    let resp = req
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
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    let offer = rows.first().cloned().ok_or((
        StatusCode::NOT_FOUND,
        "campaign offer not found".to_string(),
    ))?;

    if is_creator_like(&user.role) {
        let creator_id = resolve_effective_creator_id(state, user).await;
        let target_type = offer
            .get("target_type")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let target_id = offer
            .get("target_id")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        if target_type == "creator" && target_id == creator_id {
            return Ok(offer);
        }
        let assignment_resp = state
            .pg
            .from("offer_talent_assignments")
            .select("id")
            .eq("offer_id", offer_id)
            .eq("creator_id", &creator_id)
            .eq("status", "assigned")
            .limit(1)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let assignment_status = assignment_resp.status();
        let assignment_text = assignment_resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if !assignment_status.is_success() {
            return Err(sanitize_db_error(
                assignment_status.as_u16(),
                assignment_text,
            ));
        }
        let assignment_rows: Vec<serde_json::Value> =
            serde_json::from_str(&assignment_text).unwrap_or_default();
        if assignment_rows.is_empty() {
            return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
        }
    }

    Ok(offer)
}

pub(crate) async fn resolve_brand_name(state: &AppState, brand_id: &str) -> Option<String> {
    let resp = state
        .pg
        .from("brands")
        .select("company_name,email")
        .eq("id", brand_id)
        .limit(1)
        .execute()
        .await
        .ok()?;
    if !resp.status().is_success() {
        return None;
    }
    let text = resp.text().await.ok()?;
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).ok()?;
    let row = rows.first()?;
    let name = row
        .get("company_name")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim();
    if !name.is_empty() {
        return Some(name.to_string());
    }
    row.get("email")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
}

pub(crate) async fn resolve_agency_name(state: &AppState, agency_id: &str) -> Option<String> {
    let resp = state
        .pg
        .from("agencies")
        .select("agency_name,email")
        .eq("id", agency_id)
        .limit(1)
        .execute()
        .await
        .ok()?;
    if !resp.status().is_success() {
        return None;
    }
    let text = resp.text().await.ok()?;
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).ok()?;
    let row = rows.first()?;
    let name = row
        .get("agency_name")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim();
    if !name.is_empty() {
        return Some(name.to_string());
    }
    row.get("email")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
}

pub(crate) async fn resolve_creator_name(state: &AppState, creator_id: &str) -> Option<String> {
    let resp = state
        .pg
        .from("creators")
        .select("full_name,email")
        .eq("id", creator_id)
        .limit(1)
        .execute()
        .await
        .ok()?;
    if !resp.status().is_success() {
        return None;
    }
    let text = resp.text().await.ok()?;
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).ok()?;
    let row = rows.first()?;
    let name = row
        .get("full_name")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim();
    if !name.is_empty() {
        return Some(name.to_string());
    }
    row.get("email")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
}

async fn resolve_offer_target_name(state: &AppState, offer: &serde_json::Value) -> Option<String> {
    let target_type = offer
        .get("target_type")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_lowercase();
    let target_id = offer
        .get("target_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if target_id.is_empty() {
        return None;
    }
    if target_type == "agency" {
        resolve_agency_name(state, target_id).await
    } else {
        resolve_creator_name(state, target_id).await
    }
}

async fn ensure_brand_campaign_ownership(
    state: &AppState,
    brand_id: &str,
    campaign_id: &str,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let resp = state
        .pg
        .from("brand_campaigns")
        .select("*")
        .eq("id", campaign_id)
        .eq("brand_id", brand_id)
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
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    rows.first().cloned().ok_or((
        StatusCode::NOT_FOUND,
        "brand campaign not found".to_string(),
    ))
}

pub async fn create_campaign(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<CreateBrandCampaignRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let brand_access =
        team::require_brand_permission(&state, &user, Permission::CreateCampaigns).await?;
    let brand_id = brand_access.organization_id.clone();

    let name = trim_non_empty(&payload.name, "name")?;
    let objective = trim_non_empty(&payload.objective, "objective")?;
    let category = trim_non_empty(&payload.category, "category")?;
    let description = trim_non_empty(&payload.description, "description")?;
    let budget_range = trim_non_empty(&payload.budget_range, "budget_range")?;
    let start_date = trim_non_empty(&payload.start_date, "start_date")?;

    let insert_payload = json!({
        "brand_id": brand_id,
        "name": name,
        "objective": objective,
        "category": category,
        "description": description,
        "usage_scope": payload.usage_scope.as_deref().map(|s| s.trim()).filter(|s| !s.is_empty()),
        "duration_days": payload.duration_days,
        "territory": payload.territory.as_deref().map(|s| s.trim()).filter(|s| !s.is_empty()),
        "exclusivity": payload.exclusivity.as_deref().map(|s| s.trim()).filter(|s| !s.is_empty()),
        "budget_range": budget_range,
        "start_date": start_date,
        "custom_terms": payload.custom_terms.as_deref().map(|s| s.trim()).filter(|s| !s.is_empty()),
        "brief_snapshot": payload.brief_snapshot.unwrap_or_else(|| json!({})),
        "status": "draft",
        "created_by": user.id,
    });

    let resp = state
        .pg
        .from("brand_campaigns")
        .insert(insert_payload.to_string())
        .select("*")
        .single()
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

    let row: serde_json::Value =
        serde_json::from_str(&text).unwrap_or_else(|_| json!({"status":"ok"}));
    let campaign_id = row
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let campaign_name = row
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("campaign");
    let brand_name = resolve_brand_name(&state, &brand_id)
        .await
        .unwrap_or_else(|| "Brand".to_string());
    if !campaign_id.is_empty() {
        log_activity_event(
            &state,
            &brand_id,
            Some(&campaign_id),
            "brand",
            &brand_name,
            "campaign.created",
            format!("{} created {}.", brand_name, campaign_name),
        )
        .await;
    }
    Ok(Json(row))
}

pub async fn update_campaign(
    State(state): State<AppState>,
    user: AuthUser,
    Path(campaign_id): Path<String>,
    Json(payload): Json<UpdateBrandCampaignRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let brand_access =
        team::require_brand_permission(&state, &user, Permission::CreateCampaigns).await?;
    let brand_id = brand_access.organization_id.clone();

    let _existing = ensure_brand_campaign_ownership(&state, &brand_id, &campaign_id).await?;
    let mut update = serde_json::Map::new();

    if let Some(v) = payload.name.as_deref() {
        update.insert("name".to_string(), json!(trim_non_empty(v, "name")?));
    }
    if let Some(v) = payload.objective.as_deref() {
        update.insert(
            "objective".to_string(),
            json!(trim_non_empty(v, "objective")?),
        );
    }
    if let Some(v) = payload.category.as_deref() {
        update.insert(
            "category".to_string(),
            json!(trim_non_empty(v, "category")?),
        );
    }
    if let Some(v) = payload.description.as_deref() {
        update.insert(
            "description".to_string(),
            json!(trim_non_empty(v, "description")?),
        );
    }
    if let Some(v) = payload.usage_scope.as_deref() {
        update.insert("usage_scope".to_string(), json!(v.trim()));
    }
    if let Some(v) = payload.duration_days {
        update.insert("duration_days".to_string(), json!(v));
    }
    if let Some(v) = payload.territory.as_deref() {
        update.insert("territory".to_string(), json!(v.trim()));
    }
    if let Some(v) = payload.exclusivity.as_deref() {
        update.insert("exclusivity".to_string(), json!(v.trim()));
    }
    if let Some(v) = payload.budget_range.as_deref() {
        update.insert(
            "budget_range".to_string(),
            json!(trim_non_empty(v, "budget_range")?),
        );
    }
    if let Some(v) = payload.start_date.as_deref() {
        update.insert(
            "start_date".to_string(),
            json!(trim_non_empty(v, "start_date")?),
        );
    }
    if let Some(v) = payload.custom_terms.as_deref() {
        update.insert("custom_terms".to_string(), json!(v.trim()));
    }
    if let Some(v) = payload.status.as_deref() {
        let status = v.trim().to_lowercase();
        if !["draft", "active", "paused", "completed", "archived"].contains(&status.as_str()) {
            return Err((StatusCode::BAD_REQUEST, "invalid status".to_string()));
        }
        update.insert("status".to_string(), json!(status));
    }
    if let Some(v) = payload.brief_snapshot {
        update.insert("brief_snapshot".to_string(), v);
    }

    if update.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "no fields to update".to_string()));
    }
    update.insert(
        "updated_at".to_string(),
        json!(chrono::Utc::now().to_rfc3339()),
    );

    let resp = state
        .pg
        .from("brand_campaigns")
        .eq("id", &campaign_id)
        .eq("brand_id", &brand_id)
        .update(serde_json::Value::Object(update).to_string())
        .select("*")
        .single()
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
    let row: serde_json::Value =
        serde_json::from_str(&text).unwrap_or_else(|_| json!({"status":"ok"}));
    Ok(Json(row))
}

pub async fn mark_campaign_done(
    State(state): State<AppState>,
    user: AuthUser,
    Path(campaign_id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let brand_access =
        team::require_brand_permission(&state, &user, Permission::CreateCampaigns).await?;
    let brand_id = brand_access.organization_id.clone();

    let fetch_resp = state
        .pg
        .from("brand_campaigns")
        .select("id, name, status, completed_at")
        .eq("id", &campaign_id)
        .eq("brand_id", &brand_id)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let fetch_status = fetch_resp.status();
    let fetch_text = fetch_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !fetch_status.is_success() {
        return Err(sanitize_db_error(fetch_status.as_u16(), fetch_text));
    }
    let row: serde_json::Value = serde_json::from_str(&fetch_text).unwrap_or_else(|_| json!({}));
    let status_raw = row
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_lowercase();
    let completed_at_exists = row
        .get("completed_at")
        .and_then(|v| v.as_str())
        .map(|v| !v.trim().is_empty())
        .unwrap_or(false);
    if completed_at_exists {
        return Ok(Json(row));
    }
    if status_raw != "active" && status_raw != "expired" {
        return Err((
            StatusCode::BAD_REQUEST,
            "campaign can only be marked done when active or expired".to_string(),
        ));
    }

    let completed_at = chrono::Utc::now().to_rfc3339();
    let mut update = serde_json::Map::new();
    update.insert("completed_at".to_string(), json!(completed_at));
    update.insert("updated_at".to_string(), json!(completed_at));

    let update_resp = state
        .pg
        .from("brand_campaigns")
        .eq("id", &campaign_id)
        .eq("brand_id", &brand_id)
        .update(serde_json::Value::Object(update).to_string())
        .select("*")
        .single()
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
    let updated_row: serde_json::Value =
        serde_json::from_str(&update_text).unwrap_or_else(|_| json!({}));

    // Update non-terminal offers to completed status
    // Using individual neq() calls for better Postgrest compatibility
    if let Err(e) = state
        .pg
        .from("campaign_offers")
        .eq("brand_campaign_id", &campaign_id)
        .eq("brand_id", &brand_id)
        .neq("status", "cancelled")
        .neq("status", "declined")
        .neq("status", "completed")
        .update(
            json!({
                "status": "completed",
                "updated_at": chrono::Utc::now().to_rfc3339(),
            })
            .to_string(),
        )
        .execute()
        .await
    {
        eprintln!("Failed to update campaign offers status: {}", e);
    }

    let campaign_name = row
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("campaign");
    let brand_name = resolve_brand_name(&state, &brand_id)
        .await
        .unwrap_or_else(|| "Brand".to_string());
    log_activity_event(
        &state,
        &brand_id,
        Some(&campaign_id),
        "brand",
        &brand_name,
        "campaign.completed",
        format!("{} marked {} as done.", brand_name, campaign_name),
    )
    .await;

    Ok(Json(updated_row))
}

pub async fn list_campaigns(
    State(state): State<AppState>,
    user: AuthUser,
    Query(q): Query<ListCampaignQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "brand" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    let mut limit = q.limit.unwrap_or(50) as usize;
    if limit == 0 {
        limit = 1;
    }
    if limit > 200 {
        limit = 200;
    }

    let mut req = state
        .pg
        .from("brand_campaigns")
        .select("*")
        .eq("brand_id", &user.id)
        .order("created_at.desc")
        .limit(limit);
    if let Some(status) = q.status.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        req = req.eq("status", status);
    }

    let resp = req
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
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    Ok(Json(json!({ "campaigns": rows })))
}

pub async fn list_activity_events(
    State(state): State<AppState>,
    user: AuthUser,
    Query(q): Query<ListActivityEventsQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "brand" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let mut limit = q.limit.unwrap_or(10) as usize;
    if limit == 0 {
        limit = 1;
    }
    if limit > 50 {
        limit = 50;
    }

    let resp = state
        .pg
        .from("brand_activity_events")
        .select("id,brand_id,campaign_id,actor_type,actor_name,event_type,description,created_at")
        .eq("brand_id", &user.id)
        .order("created_at.desc")
        .limit(limit)
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
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    Ok(Json(json!({ "events": rows })))
}

pub async fn get_campaign_metrics(
    State(state): State<AppState>,
    user: AuthUser,
    Query(q): Query<CampaignMetricsQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "brand" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    let month_start = q
        .month
        .as_deref()
        .and_then(|value| chrono::NaiveDate::parse_from_str(value, "%Y-%m").ok())
        .unwrap_or_else(|| chrono::Utc::now().date_naive().with_day(1).unwrap());

    // 1) Load all offers for the brand with campaign timing info.
    let offers_resp = state
        .pg
        .from("campaign_offers")
        .select("id,brand_campaign_id,status,brand_campaigns(start_date,duration_days,status,completed_at)")
        .eq("brand_id", &user.id)
        .limit(5000)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let offers_status = offers_resp.status();
    let offers_text = offers_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !offers_status.is_success() {
        return Err(sanitize_db_error(offers_status.as_u16(), offers_text));
    }
    let offers: Vec<serde_json::Value> = serde_json::from_str(&offers_text).unwrap_or_default();

    if offers.is_empty() {
        return Ok(Json(json!({
            "active_projects_count": 0,
            "pending_approvals_count": 0,
            "action_needed": false
        })));
    }

    // 2) Fetch "completed" contracts (both parties signed).
    let offer_ids: Vec<String> = offers
        .iter()
        .filter_map(|o| o.get("id").and_then(|v| v.as_str()).map(|s| s.to_string()))
        .collect();
    let offer_refs: Vec<&str> = offer_ids.iter().map(|s| s.as_str()).collect();

    let contracts_resp = state
        .pg
        .from("campaign_offer_contracts")
        .select("id,offer_id,docuseal_status")
        .eq("brand_id", &user.id)
        .in_("offer_id", offer_refs)
        .eq("docuseal_status", "completed")
        .limit(5000)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let contracts_status = contracts_resp.status();
    let contracts_text = contracts_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !contracts_status.is_success() {
        return Err(sanitize_db_error(contracts_status.as_u16(), contracts_text));
    }
    let contracts: Vec<serde_json::Value> =
        serde_json::from_str(&contracts_text).unwrap_or_default();
    let mut signed_offer_ids: std::collections::HashSet<String> = std::collections::HashSet::new();
    for row in &contracts {
        if let Some(offer_id) = row.get("offer_id").and_then(|v| v.as_str()) {
            let offer_id = offer_id.trim();
            if !offer_id.is_empty() {
                signed_offer_ids.insert(offer_id.to_string());
            }
        }
    }

    let fully_signed_offer_statuses: std::collections::HashSet<&'static str> =
        ["contract_fully_signed", "signed", "completed"]
            .into_iter()
            .collect();
    let terminal_offer_statuses: std::collections::HashSet<&'static str> =
        ["cancelled", "declined", "expired", "completed"]
            .into_iter()
            .collect();

    let today = chrono::Utc::now().date_naive();
    let mut grouped_statuses: std::collections::HashMap<String, std::collections::HashSet<String>> =
        std::collections::HashMap::new();

    for offer in &offers {
        let offer_id = offer
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if offer_id.is_empty() {
            continue;
        }
        let group_id = offer
            .get("brand_campaign_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        let group_key = if group_id.is_empty() {
            offer_id.clone()
        } else {
            group_id
        };
        let status_raw = offer
            .get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_lowercase();
        if terminal_offer_statuses.contains(status_raw.as_str()) {
            continue;
        }
        let has_completed_contract = signed_offer_ids.contains(&offer_id);
        let is_fully_signed =
            has_completed_contract || fully_signed_offer_statuses.contains(status_raw.as_str());

        let (start_date, duration_days, completed_at) = offer
            .get("brand_campaigns")
            .and_then(|v| v.as_object())
            .map(|obj| {
                let start = obj
                    .get("start_date")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim()
                    .to_string();
                let duration = obj
                    .get("duration_days")
                    .and_then(|v| v.as_i64())
                    .unwrap_or(30);
                let completed_at = obj
                    .get("completed_at")
                    .and_then(|v| v.as_str())
                    .map(|v| v.trim().to_string())
                    .filter(|v| !v.is_empty());
                (start, duration, completed_at)
            })
            .unwrap_or_else(|| ("".to_string(), 30, None));

        if completed_at.is_some() {
            continue;
        }

        let is_after_end = if !start_date.is_empty() {
            if let Ok(start) = chrono::NaiveDate::parse_from_str(&start_date, "%Y-%m-%d") {
                let end = start + chrono::Duration::days(duration_days.saturating_sub(1));
                today > end
            } else {
                false
            }
        } else {
            false
        };
        if is_after_end {
            continue;
        }

        let mapped = if is_fully_signed {
            "in_progress"
        } else {
            "pending_approval"
        };
        grouped_statuses
            .entry(group_key)
            .or_default()
            .insert(mapped.to_string());
    }

    let mut active_projects_count = 0usize;
    let mut pending_approvals_count = 0usize;
    for statuses in grouped_statuses.values() {
        if statuses.contains("in_progress") {
            active_projects_count += 1;
        } else if statuses.contains("pending_approval") {
            pending_approvals_count += 1;
        }
    }

    let parse_rpc_int = |text: &str, key: &str| -> i64 {
        serde_json::from_str::<serde_json::Value>(text)
            .ok()
            .and_then(|value| {
                value
                    .as_array()
                    .and_then(|arr| arr.first().cloned())
                    .or(Some(value))
            })
            .and_then(|value| {
                value
                    .get(key)
                    .and_then(|v| v.as_i64())
                    .or_else(|| value.as_i64())
            })
            .unwrap_or(0)
    };

    let avg_turnaround_hours = match state
        .pg
        .rpc(
            "brand_avg_turnaround_hours",
            json!({
                "p_brand_id": user.id,
                "p_month": month_start.to_string()
            })
            .to_string(),
        )
        .execute()
        .await
    {
        Ok(resp) => {
            let text = resp.text().await.unwrap_or_default();
            parse_rpc_int(&text, "brand_avg_turnaround_hours")
        }
        Err(_) => 0,
    };

    let industry_avg_turnaround_hours = match state
        .pg
        .rpc(
            "industry_avg_turnaround_hours",
            json!({
                "p_month": month_start.to_string()
            })
            .to_string(),
        )
        .execute()
        .await
    {
        Ok(resp) => {
            let text = resp.text().await.unwrap_or_default();
            parse_rpc_int(&text, "industry_avg_turnaround_hours")
        }
        Err(_) => 0,
    };

    Ok(Json(json!({
        "active_projects_count": active_projects_count,
        "pending_approvals_count": pending_approvals_count,
        "action_needed": pending_approvals_count > 0,
        "avg_turnaround_hours": avg_turnaround_hours,
        "industry_avg_turnaround_hours": industry_avg_turnaround_hours
    })))
}

pub async fn get_brand_analytics(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "brand" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    let now = chrono::Utc::now();
    let year_start = chrono::Utc
        .with_ymd_and_hms(now.year(), 1, 1, 0, 0, 0)
        .unwrap();

    let offers_resp = state
        .pg
        .from("campaign_offers")
        .select("id,brand_campaign_id,target_type,target_id,status,created_at,brand_campaigns(start_date,duration_days,status,completed_at)")
        .eq("brand_id", &user.id)
        .limit(5000)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let offers_status = offers_resp.status();
    let offers_text = offers_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !offers_status.is_success() {
        return Err(sanitize_db_error(offers_status.as_u16(), offers_text));
    }
    let offers: Vec<serde_json::Value> = serde_json::from_str(&offers_text).unwrap_or_default();
    if offers.is_empty() {
        return Ok(Json(json!({
            "total_projects_ytd": 0,
            "talent_performance": []
        })));
    }

    let offer_ids: Vec<String> = offers
        .iter()
        .filter_map(|o| o.get("id").and_then(|v| v.as_str()).map(|s| s.to_string()))
        .collect();
    let offer_refs: Vec<&str> = offer_ids.iter().map(|s| s.as_str()).collect();
    let contracts_resp = state
        .pg
        .from("campaign_offer_contracts")
        .select("offer_id,docuseal_status")
        .eq("brand_id", &user.id)
        .in_("offer_id", offer_refs)
        .eq("docuseal_status", "completed")
        .limit(5000)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let contracts_status = contracts_resp.status();
    let contracts_text = contracts_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !contracts_status.is_success() {
        return Err(sanitize_db_error(contracts_status.as_u16(), contracts_text));
    }
    let contracts: Vec<serde_json::Value> =
        serde_json::from_str(&contracts_text).unwrap_or_default();
    let mut signed_offer_ids: std::collections::HashSet<String> = std::collections::HashSet::new();
    for row in &contracts {
        if let Some(offer_id) = row.get("offer_id").and_then(|v| v.as_str()) {
            let offer_id = offer_id.trim();
            if !offer_id.is_empty() {
                signed_offer_ids.insert(offer_id.to_string());
            }
        }
    }

    let fully_signed_offer_statuses: std::collections::HashSet<&'static str> =
        ["contract_fully_signed", "signed", "completed"]
            .into_iter()
            .collect();
    let participation_terminal_statuses: std::collections::HashSet<&'static str> =
        ["cancelled", "declined", "expired"].into_iter().collect();

    struct TargetAccumulator {
        target_type: String,
        target_id: String,
        projects: std::collections::HashSet<String>,
        completed_seen: std::collections::HashSet<String>,
        turnaround_sum: f64,
        turnaround_count: i64,
        success_count: i64,
    }

    let mut ytd_projects: std::collections::HashSet<String> = std::collections::HashSet::new();
    let mut target_stats: std::collections::HashMap<String, TargetAccumulator> =
        std::collections::HashMap::new();

    for offer in &offers {
        let offer_id = offer
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if offer_id.is_empty() {
            continue;
        }
        let campaign_key = offer_id.clone();
        let status_raw = offer
            .get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_lowercase();
        let is_fully_signed = signed_offer_ids.contains(&offer_id)
            || fully_signed_offer_statuses.contains(status_raw.as_str());

        let (start_date, duration_days, completed_at) = offer
            .get("brand_campaigns")
            .and_then(|v| v.as_object())
            .map(|obj| {
                let start = obj
                    .get("start_date")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim()
                    .to_string();
                let duration = obj
                    .get("duration_days")
                    .and_then(|v| v.as_i64())
                    .unwrap_or(30);
                let completed_at = obj
                    .get("completed_at")
                    .and_then(|v| v.as_str())
                    .map(|v| v.trim().to_string())
                    .filter(|v| !v.is_empty());
                (start, duration, completed_at)
            })
            .unwrap_or_else(|| ("".to_string(), 30, None));

        if is_fully_signed {
            if let Some(created_at) = offer.get("created_at").and_then(|v| v.as_str()) {
                if let Ok(created_dt) = chrono::DateTime::parse_from_rfc3339(created_at) {
                    let created_dt = created_dt.with_timezone(&chrono::Utc);
                    if created_dt >= year_start && created_dt <= now {
                        ytd_projects.insert(campaign_key.clone());
                    }
                }
            }
        }

        if !is_fully_signed || participation_terminal_statuses.contains(status_raw.as_str()) {
            continue;
        }
        let target_type = offer
            .get("target_type")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_lowercase();
        let target_id = offer
            .get("target_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if target_type.is_empty() || target_id.is_empty() {
            continue;
        }
        let target_key = format!("{}:{}", target_type, target_id);
        let entry = target_stats.entry(target_key).or_insert(TargetAccumulator {
            target_type: target_type.clone(),
            target_id: target_id.clone(),
            projects: std::collections::HashSet::new(),
            completed_seen: std::collections::HashSet::new(),
            turnaround_sum: 0.0,
            turnaround_count: 0,
            success_count: 0,
        });
        entry.projects.insert(campaign_key.clone());

        if let (Some(completed_at), true) = (completed_at.as_deref(), !start_date.is_empty()) {
            if let (Ok(start), Ok(done)) = (
                chrono::NaiveDate::parse_from_str(&start_date, "%Y-%m-%d"),
                chrono::DateTime::parse_from_rfc3339(completed_at),
            ) {
                let done = done.with_timezone(&chrono::Utc);
                if done.date_naive() >= start && entry.completed_seen.insert(campaign_key.clone()) {
                    let start_dt = chrono::DateTime::<chrono::Utc>::from_naive_utc_and_offset(
                        start.and_hms_opt(0, 0, 0).unwrap(),
                        chrono::Utc,
                    );
                    let diff_hours = (done - start_dt).num_seconds() as f64 / 3600.0;
                    if diff_hours >= 0.0 {
                        entry.turnaround_sum += diff_hours;
                        entry.turnaround_count += 1;
                    }
                    let end_date = start + chrono::Duration::days(duration_days.saturating_sub(1));
                    if done.date_naive() <= end_date {
                        entry.success_count += 1;
                    }
                }
            }
        }
    }

    let mut agency_ids: Vec<String> = Vec::new();
    let mut creator_ids: Vec<String> = Vec::new();
    for entry in target_stats.values() {
        if entry.target_type == "agency" {
            agency_ids.push(entry.target_id.clone());
        } else {
            creator_ids.push(entry.target_id.clone());
        }
    }

    let mut agency_name_map: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    let mut agency_logo_map: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    if !agency_ids.is_empty() {
        let resp = state
            .pg
            .from("agencies")
            .select("id,agency_name,logo_url,email")
            .in_("id", agency_ids.clone())
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if resp.status().is_success() {
            let text = resp.text().await.unwrap_or_default();
            let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
            for row in rows {
                if let (Some(id), Some(name)) = (
                    row.get("id").and_then(|v| v.as_str()),
                    row.get("agency_name").and_then(|v| v.as_str()),
                ) {
                    if !name.trim().is_empty() {
                        agency_name_map.insert(id.to_string(), name.trim().to_string());
                    }
                    if let Some(logo) = row.get("logo_url").and_then(|v| v.as_str()) {
                        if !logo.trim().is_empty() {
                            agency_logo_map.insert(id.to_string(), logo.trim().to_string());
                        }
                    }
                    if !agency_name_map.contains_key(id) {
                        if let Some(email) = row.get("email").and_then(|v| v.as_str()) {
                            if !email.trim().is_empty() {
                                agency_name_map.insert(id.to_string(), email.trim().to_string());
                            }
                        }
                    }
                }
            }
        }
    }

    let mut creator_name_map: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    let mut creator_photo_map: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    if !creator_ids.is_empty() {
        let resp = state
            .pg
            .from("creators")
            .select("id,full_name,profile_photo_url,email")
            .in_("id", creator_ids.clone())
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if resp.status().is_success() {
            let text = resp.text().await.unwrap_or_default();
            let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
            for row in rows {
                if let Some(id) = row.get("id").and_then(|v| v.as_str()) {
                    let name = row
                        .get("full_name")
                        .and_then(|v| v.as_str())
                        .filter(|v| !v.trim().is_empty())
                        .map(|v| v.trim().to_string());
                    if let Some(name) = name {
                        creator_name_map.insert(id.to_string(), name);
                    }
                    if let Some(photo) = row.get("profile_photo_url").and_then(|v| v.as_str()) {
                        if !photo.trim().is_empty() {
                            creator_photo_map.insert(id.to_string(), photo.trim().to_string());
                        }
                    }
                    if !creator_name_map.contains_key(id) {
                        if let Some(email) = row.get("email").and_then(|v| v.as_str()) {
                            if !email.trim().is_empty() {
                                creator_name_map.insert(id.to_string(), email.trim().to_string());
                            }
                        }
                    }
                }
            }
        }
    }

    let mut talent_performance: Vec<serde_json::Value> = target_stats
        .values()
        .map(|entry| {
            let projects_count = entry.projects.len() as i64;
            let avg_turnaround_hours = if entry.turnaround_count > 0 {
                (entry.turnaround_sum / entry.turnaround_count as f64).round() as i64
            } else {
                0
            };
            let success_rate_pct = if projects_count > 0 {
                ((entry.success_count as f64 / projects_count as f64) * 100.0).round() as i64
            } else {
                0
            };
            let (name, image_url) = if entry.target_type == "agency" {
                let name = agency_name_map
                    .get(&entry.target_id)
                    .cloned()
                    .unwrap_or_else(|| "Agency".to_string());
                let image = agency_logo_map
                    .get(&entry.target_id)
                    .cloned()
                    .unwrap_or_default();
                (name, image)
            } else {
                let name = creator_name_map
                    .get(&entry.target_id)
                    .cloned()
                    .unwrap_or_else(|| "Creator".to_string());
                let image = creator_photo_map
                    .get(&entry.target_id)
                    .cloned()
                    .unwrap_or_default();
                (name, image)
            };
            json!({
                "target_type": entry.target_type,
                "target_id": entry.target_id,
                "name": name,
                "image_url": image_url,
                "projects_count": projects_count,
                "avg_turnaround_hours": avg_turnaround_hours,
                "success_rate_pct": success_rate_pct,
                "total_cost_cents": serde_json::Value::Null,
                "avg_rating": serde_json::Value::Null
            })
        })
        .collect();

    talent_performance.sort_by(|a, b| {
        let a_projects = a
            .get("projects_count")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        let b_projects = b
            .get("projects_count")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        let a_turnaround = a
            .get("avg_turnaround_hours")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        let b_turnaround = b
            .get("avg_turnaround_hours")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        let a_success = a
            .get("success_rate_pct")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        let b_success = b
            .get("success_rate_pct")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        let a_turnaround_sort = if a_turnaround == 0 {
            i64::MAX
        } else {
            a_turnaround
        };
        let b_turnaround_sort = if b_turnaround == 0 {
            i64::MAX
        } else {
            b_turnaround
        };
        b_projects
            .cmp(&a_projects)
            .then_with(|| a_turnaround_sort.cmp(&b_turnaround_sort))
            .then_with(|| b_success.cmp(&a_success))
    });
    if talent_performance.len() > 10 {
        talent_performance.truncate(10);
    }

    Ok(Json(json!({
        "total_projects_ytd": ytd_projects.len(),
        "talent_performance": talent_performance
    })))
}

pub async fn get_campaign(
    State(state): State<AppState>,
    user: AuthUser,
    Path(campaign_id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "brand" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let campaign = ensure_brand_campaign_ownership(&state, &user.id, &campaign_id).await?;
    Ok(Json(campaign))
}

pub async fn list_offer_options(
    State(state): State<AppState>,
    user: AuthUser,
    Path(campaign_id): Path<String>,
    Query(q): Query<OfferOptionsQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "brand" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let _campaign = ensure_brand_campaign_ownership(&state, &user.id, &campaign_id).await?;
    let target_type = q
        .target_type
        .as_deref()
        .unwrap_or("creator")
        .trim()
        .to_lowercase();
    let search = q.q.as_deref().unwrap_or("").trim().to_lowercase();
    let mut limit = q.limit.unwrap_or(60) as usize;
    if limit == 0 {
        limit = 1;
    }
    if limit > 200 {
        limit = 200;
    }

    if target_type == "agency" {
        let req = state
            .pg
            .from("brand_agency_connections")
            .select("agency_id,status,agencies(id,agency_name,email,agency_type,logo_url)")
            .eq("brand_id", &user.id)
            .eq("status", "active")
            .limit(limit);
        let resp = req
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
        let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
        let items: Vec<serde_json::Value> = if search.is_empty() {
            rows
        } else {
            rows.into_iter()
                .filter(|row| {
                    let agency = row.get("agencies").unwrap_or(&serde_json::Value::Null);
                    let name = agency
                        .get("agency_name")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_lowercase();
                    let email = agency
                        .get("email")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_lowercase();
                    let kind = agency
                        .get("agency_type")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_lowercase();
                    name.contains(&search) || email.contains(&search) || kind.contains(&search)
                })
                .collect()
        };
        return Ok(Json(json!({"target_type":"agency","items": items})));
    }

    let connected_resp = state
        .pg
        .from("brand_creator_connections")
        .select("creator_id")
        .eq("brand_id", &user.id)
        .eq("status", "active")
        .limit(500)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let connected_status = connected_resp.status();
    let connected_text = connected_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !connected_status.is_success() {
        return Err(sanitize_db_error(connected_status.as_u16(), connected_text));
    }
    let connected_rows: Vec<serde_json::Value> =
        serde_json::from_str(&connected_text).unwrap_or_default();
    let connected_creator_ids: Vec<String> = connected_rows
        .into_iter()
        .filter_map(|r| {
            r.get("creator_id")
                .and_then(|v| v.as_str())
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .map(|s| s.to_string())
        })
        .collect();
    if connected_creator_ids.is_empty() {
        return Ok(Json(json!({"target_type":"creator","items": []})));
    }

    let connected_refs: Vec<&str> = connected_creator_ids.iter().map(|s| s.as_str()).collect();
    let mut req = state
        .pg
        .from("creators")
        .select("id,full_name,city,state,profile_photo_url,creator_type,base_weekly_price_cents,base_monthly_price_cents,currency_code,accept_negotiations,public_profile_visible,visibility")
        .in_("id", connected_refs)
        .eq("role", "creator")
        .eq("kyc_status", "approved")
        .limit(limit);
    if !search.is_empty() {
        let needle = format!("*{}*", search);
        req = req.or(format!(
            "full_name.ilike.{needle},creator_type.ilike.{needle},city.ilike.{needle},state.ilike.{needle}"
        ));
    }
    let resp = req
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
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    let items: Vec<serde_json::Value> = rows
        .into_iter()
        .filter(|r| {
            let public_profile_visible = r
                .get("public_profile_visible")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            let visibility = r
                .get("visibility")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_lowercase();
            public_profile_visible
                || visibility.is_empty()
                || visibility == "public"
                || visibility == "brands"
                || visibility == "visible_to_brands"
                || visibility == "true"
        })
        .map(|r| {
            let monthly = r
                .get("base_weekly_price_cents")
                .and_then(|v| v.as_i64())
                .or_else(|| {
                    r.get("base_monthly_price_cents")
                        .and_then(|v| v.as_i64())
                        .map(|m| ((m as f64) / 4.345).round() as i64)
                });
            json!({
                "id": r.get("id").cloned().unwrap_or(serde_json::Value::Null),
                "display_name": r.get("full_name").cloned().unwrap_or(serde_json::Value::Null),
                "city": r.get("city").cloned().unwrap_or(serde_json::Value::Null),
                "state": r.get("state").cloned().unwrap_or(serde_json::Value::Null),
                "profile_photo_url": r.get("profile_photo_url").cloned().unwrap_or(serde_json::Value::Null),
                "creator_type": r.get("creator_type").cloned().unwrap_or(serde_json::Value::Null),
                "base_rate_monthly_cents": monthly,
                "rate_currency": r.get("currency_code").cloned().unwrap_or(json!("USD")),
                "accept_negotiations": r.get("accept_negotiations").cloned().unwrap_or(json!(true)),
            })
        })
        .collect();
    Ok(Json(json!({"target_type":"creator","items": items})))
}

pub async fn create_campaign_offers(
    State(state): State<AppState>,
    user: AuthUser,
    Path(campaign_id): Path<String>,
    Json(payload): Json<CreateCampaignOffersRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let brand_access =
        team::require_brand_permission(&state, &user, Permission::CreateCampaigns).await?;
    let brand_id = brand_access.organization_id.clone();
    if payload.target_ids.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "target_ids is required".to_string(),
        ));
    }
    let campaign = ensure_brand_campaign_ownership(&state, &brand_id, &campaign_id).await?;
    let target_type = payload.target_type.trim().to_lowercase();
    if !["creator", "agency"].contains(&target_type.as_str()) {
        return Err((
            StatusCode::BAD_REQUEST,
            "target_type must be creator or agency".to_string(),
        ));
    }

    let brief_snapshot = payload.brief_snapshot.unwrap_or_else(|| {
        campaign
            .get("brief_snapshot")
            .cloned()
            .unwrap_or_else(|| json!({}))
    });
    let budget_snapshot = payload.budget_snapshot.unwrap_or_else(|| {
        json!({
            "budget_range": campaign.get("budget_range").cloned().unwrap_or(serde_json::Value::Null),
            "start_date": campaign.get("start_date").cloned().unwrap_or(serde_json::Value::Null),
            "duration_days": campaign.get("duration_days").cloned().unwrap_or(serde_json::Value::Null),
        })
    });

    let mut created: Vec<serde_json::Value> = Vec::new();
    for target_id in payload.target_ids {
        let tid = target_id.trim().to_string();
        if tid.is_empty() {
            continue;
        }
        if target_type == "agency" {
            let conn_resp = state
                .pg
                .from("brand_agency_connections")
                .select("id")
                .eq("brand_id", &brand_id)
                .eq("agency_id", tid.as_str())
                .eq("status", "active")
                .limit(1)
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let conn_status = conn_resp.status();
            let conn_text = conn_resp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            if !conn_status.is_success() {
                return Err(sanitize_db_error(conn_status.as_u16(), conn_text));
            }
            let conn_rows: Vec<serde_json::Value> =
                serde_json::from_str(&conn_text).unwrap_or_default();
            if conn_rows.is_empty() {
                return Err((
                    StatusCode::FORBIDDEN,
                    "you can only send offers to connected agencies".to_string(),
                ));
            }
        } else {
            let conn_resp = state
                .pg
                .from("brand_creator_connections")
                .select("id")
                .eq("brand_id", &user.id)
                .eq("creator_id", tid.as_str())
                .eq("status", "active")
                .limit(1)
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let conn_status = conn_resp.status();
            let conn_text = conn_resp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            if !conn_status.is_success() {
                return Err(sanitize_db_error(conn_status.as_u16(), conn_text));
            }
            let conn_rows: Vec<serde_json::Value> =
                serde_json::from_str(&conn_text).unwrap_or_default();
            if conn_rows.is_empty() {
                return Err((
                    StatusCode::FORBIDDEN,
                    "you can only send offers to connected creators".to_string(),
                ));
            }

            let c_resp = state
                .pg
                .from("creators")
                .select("id")
                .eq("id", tid.as_str())
                .eq("role", "creator")
                .eq("kyc_status", "approved")
                .limit(1)
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let c_status = c_resp.status();
            let c_text = c_resp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            if !c_status.is_success() {
                return Err(sanitize_db_error(c_status.as_u16(), c_text));
            }
            let c_rows: Vec<serde_json::Value> = serde_json::from_str(&c_text).unwrap_or_default();
            if c_rows.is_empty() {
                return Err((StatusCode::NOT_FOUND, "creator not found".to_string()));
            }
        }

        let insert_payload = json!({
            "brand_campaign_id": campaign_id,
            "brand_id": brand_id,
            "target_type": target_type,
            "target_id": tid,
            "status": "sent",
            "offer_title": payload.offer_title.as_deref().map(|s| s.trim()).filter(|s| !s.is_empty()),
            "message": payload.message.as_deref().map(|s| s.trim()).filter(|s| !s.is_empty()),
            "expires_at": payload.expires_at,
            "brief_snapshot": brief_snapshot,
            "budget_snapshot": budget_snapshot,
            "created_by": user.id,
        });
        let resp = state
            .pg
            .from("campaign_offers")
            .insert(insert_payload.to_string())
            .select("*")
            .single()
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
        let row: serde_json::Value = serde_json::from_str(&text).unwrap_or_default();
        let offer_id = row.get("id").and_then(|v| v.as_str()).unwrap_or("");

        // If agency, create a shadow licensing_request (billing stub)
        if target_type == "agency" && !offer_id.is_empty() {
            let budget_str = budget_snapshot
                .get("budget_total")
                .and_then(|v| v.as_str())
                .unwrap_or("0");
            let budget_float: f64 = budget_str.replace(",", "").parse().unwrap_or(0.0);
            let amount_cents = (budget_float * 100.0).round() as i64;

            let mut brand_name = "Brand".to_string();
            let b_resp = state
                .pg
                .from("brands")
                .select("company_name")
                .eq("id", &brand_id)
                .single()
                .execute()
                .await;
            if let Ok(br) = b_resp {
                if let Ok(bt) = br.text().await {
                    if let Ok(bj) = serde_json::from_str::<serde_json::Value>(&bt) {
                        if let Some(n) = bj.get("company_name").and_then(|v| v.as_str()) {
                            brand_name = n.to_string();
                        }
                    }
                }
            }

            let stub_payload = json!({
                "agency_id": tid,
                "brand_id": brand_id,
                "status": "approved", // Pre-approved stub for payment
                "campaign_title": payload.offer_title.as_deref().unwrap_or("Campaign Offer"),
                "client_name": brand_name,
                "context_type": "campaign",
                "campaign_offer_id": offer_id,
            });

            let stub_resp = state
                .pg
                .from("licensing_requests")
                .insert(stub_payload.to_string())
                .select("id")
                .single()
                .execute()
                .await;

            if let Ok(sr) = stub_resp {
                if sr.status().is_success() {
                    if let Ok(st) = sr.text().await {
                        if let Ok(sj) = serde_json::from_str::<serde_json::Value>(&st) {
                            if let Some(stub_id) = sj.get("id").and_then(|v| v.as_str()) {
                                // Link back to the offer
                                let _ = state
                                    .pg
                                    .from("campaign_offers")
                                    .eq("id", offer_id)
                                    .update(json!({ "billing_request_id": stub_id }).to_string())
                                    .execute()
                                    .await;

                                // Create the campaign entry for accounting (similar to licensing flow)
                                let _ = state
                                    .pg
                                    .from("campaigns")
                                    .insert(json!({
                                        "agency_id": tid,
                                        "licensing_request_id": stub_id,
                                        "name": payload.offer_title.as_deref().unwrap_or("Campaign Offer"),
                                        "payment_amount": amount_cents,
                                        "status": "Confirmed",
                                        "campaign_type": "Campaign",
                                    }).to_string())
                                    .execute()
                                    .await;
                            }
                        }
                    }
                }
            }
        }

        let target_label = if target_type == "agency" {
            "agency"
        } else {
            "creator"
        };
        let campaign_name = campaign
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("campaign");
        let brand_name = resolve_brand_name(&state, &brand_id)
            .await
            .unwrap_or_else(|| "Brand".to_string());
        let target_name = resolve_offer_target_name(&state, &row)
            .await
            .unwrap_or_else(|| target_label.to_string());
        log_activity_event(
            &state,
            &brand_id,
            Some(&campaign_id),
            "brand",
            &brand_name,
            "offer.sent",
            format!(
                "{} sent an offer to {} for {}.",
                brand_name, target_name, campaign_name
            ),
        )
        .await;
        created.push(row);
    }
    Ok(Json(json!({"status":"ok","offers":created})))
}

pub async fn list_campaign_offers(
    State(state): State<AppState>,
    user: AuthUser,
    Path(campaign_id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "brand" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let _campaign = ensure_brand_campaign_ownership(&state, &user.id, &campaign_id).await?;
    let resp = state
        .pg
        .from("campaign_offers")
        .select("*")
        .eq("brand_campaign_id", &campaign_id)
        .eq("brand_id", &user.id)
        .order("created_at.desc")
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
    let mut rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();

    // Attach is_fully_signed (computed from contract completion) so clients don't rely on offer workflow states.
    let _ = attach_is_fully_signed_to_offers(&state, &mut rows).await;

    let creator_ids: Vec<String> = rows
        .iter()
        .filter(|row| {
            let tt = row
                .get("target_type")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_lowercase();
            tt == "creator" || tt == "talent"
        })
        .filter_map(|row| row.get("target_id").and_then(|v| v.as_str()))
        .map(|id| id.to_string())
        .collect();
    let agency_ids: Vec<String> = rows
        .iter()
        .filter(|row| {
            row.get("target_type")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .eq_ignore_ascii_case("agency")
        })
        .filter_map(|row| row.get("target_id").and_then(|v| v.as_str()))
        .map(|id| id.to_string())
        .collect();

    let mut target_name_map: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    let mut target_logo_map: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();

    if !creator_ids.is_empty() {
        let creator_refs: Vec<&str> = creator_ids.iter().map(|s| s.as_str()).collect();
        if let Ok(creator_resp) = state
            .pg
            .from("creators")
            .select("id,full_name,email,profile_photo_url")
            .in_("id", creator_refs)
            .execute()
            .await
        {
            if creator_resp.status().is_success() {
                if let Ok(creator_text) = creator_resp.text().await {
                    let creator_rows: Vec<serde_json::Value> =
                        serde_json::from_str(&creator_text).unwrap_or_default();
                    for creator in creator_rows {
                        let id = creator
                            .get("id")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .trim()
                            .to_string();
                        if id.is_empty() {
                            continue;
                        }
                        let name = creator
                            .get("full_name")
                            .and_then(|v| v.as_str())
                            .or_else(|| creator.get("email").and_then(|v| v.as_str()))
                            .unwrap_or("")
                            .trim()
                            .to_string();
                        let logo = creator
                            .get("profile_photo_url")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .trim()
                            .to_string();
                        if !name.is_empty() {
                            target_name_map.insert(id.clone(), name);
                        }
                        if !logo.is_empty() {
                            target_logo_map.insert(id, logo);
                        }
                    }
                }
            }
        }
    }

    if !agency_ids.is_empty() {
        let agency_refs: Vec<&str> = agency_ids.iter().map(|s| s.as_str()).collect();
        if let Ok(agency_resp) = state
            .pg
            .from("agencies")
            .select("id,agency_name,email,logo_url")
            .in_("id", agency_refs)
            .execute()
            .await
        {
            if agency_resp.status().is_success() {
                if let Ok(agency_text) = agency_resp.text().await {
                    let agency_rows: Vec<serde_json::Value> =
                        serde_json::from_str(&agency_text).unwrap_or_default();
                    for agency in agency_rows {
                        let id = agency
                            .get("id")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .trim()
                            .to_string();
                        if id.is_empty() {
                            continue;
                        }
                        let name = agency
                            .get("agency_name")
                            .and_then(|v| v.as_str())
                            .or_else(|| agency.get("email").and_then(|v| v.as_str()))
                            .unwrap_or("")
                            .trim()
                            .to_string();
                        let logo = agency
                            .get("logo_url")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .trim()
                            .to_string();
                        if !name.is_empty() {
                            target_name_map.insert(id.clone(), name);
                        }
                        if !logo.is_empty() {
                            target_logo_map.insert(id, logo);
                        }
                    }
                }
            }
        }
    }

    for row in rows.iter_mut() {
        let target_id = row
            .get("target_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if target_id.is_empty() {
            continue;
        }
        if let Some(target_name) = target_name_map.get(&target_id) {
            if let Some(obj) = row.as_object_mut() {
                obj.insert("target_name".to_string(), json!(target_name));
            }
        }
        if let Some(target_logo) = target_logo_map.get(&target_id) {
            if let Some(obj) = row.as_object_mut() {
                obj.insert("target_logo".to_string(), json!(target_logo));
            }
        }
    }

    Ok(Json(json!({"offers": rows})))
}

pub async fn list_my_campaign_offers(
    State(state): State<AppState>,
    user: AuthUser,
    Query(q): Query<MyOffersQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let mut limit = q.limit.unwrap_or(80) as usize;
    if limit == 0 {
        limit = 1;
    }
    if limit > 300 {
        limit = 300;
    }

    let mut req = state
        .pg
        .from("campaign_offers")
        .select(
            "id,brand_campaign_id,brand_id,target_type,target_id,status,offer_title,message,expires_at,decided_at,brief_snapshot,budget_snapshot,meta,created_at,updated_at,billing_request_id,payment_status,brand_campaigns(id,name,objective,category,description,usage_scope,duration_days,territory,exclusivity,budget_range,start_date,custom_terms,completed_at,created_at,updated_at,status),brands(id,company_name,email,logo_url)",
        )
        .order("created_at.desc")
        .limit(limit);

    if let Some(status_filter) = q.status.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        req = req.eq("status", status_filter);
    }

    if user.role == "brand" {
        let brand_access = team::require_brand_access(&state, &user).await?;
        req = req.eq("brand_id", brand_access.organization_id.as_str());
    } else if user.role == "agency" {
        let agency_access = team::require_agency_access(&state, &user).await?;
        req = req.eq("target_type", "agency").eq("target_id", agency_access.organization_id.as_str());
    } else if is_creator_like(&user.role) {
        let creator_id = resolve_effective_creator_id(&state, &user).await;
        // Get connected agencies
        let mut agency_ids = Vec::new();
        let agencies_resp = state
            .pg
            .from("agency_talent_relationships")
            .select("agency_id")
            .eq("creator_id", &creator_id)
            .eq("status", "active")
            .execute()
            .await;

        if let Ok(resp) = agencies_resp {
            if resp.status().is_success() {
                let text = resp.text().await.unwrap_or_default();
                let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
                agency_ids = rows
                    .iter()
                    .filter_map(|r| r.get("agency_id").and_then(|v| v.as_str()))
                    .map(|s| s.to_string())
                    .collect();
            }
        }

        if !agency_ids.is_empty() {
            let agency_in = agency_ids.join(",");
            req = req.or(format!(
                "and(target_type.eq.creator,target_id.eq.{}),and(target_type.eq.agency,target_id.in.({}))",
                creator_id, agency_in
            ));
        } else {
            req = req.eq("target_type", "creator").eq("target_id", creator_id);
        }
    } else {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    let resp = req
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
    let mut rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();

    // Attach is_fully_signed (computed from contract completion) so clients don't rely on offer workflow states.
    let _ = attach_is_fully_signed_to_offers(&state, &mut rows).await;

    if user.role == "brand" {
        let creator_ids: Vec<String> = rows
            .iter()
            .filter(|row| {
                let tt = row
                    .get("target_type")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_lowercase();
                tt == "creator" || tt == "talent"
            })
            .filter_map(|row| row.get("target_id").and_then(|v| v.as_str()))
            .map(|id| id.to_string())
            .collect();
        let agency_ids: Vec<String> = rows
            .iter()
            .filter(|row| {
                row.get("target_type")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .eq_ignore_ascii_case("agency")
            })
            .filter_map(|row| row.get("target_id").and_then(|v| v.as_str()))
            .map(|id| id.to_string())
            .collect();
        let mut target_name_map: std::collections::HashMap<String, String> =
            std::collections::HashMap::new();
        let mut target_avatar_map: std::collections::HashMap<String, String> =
            std::collections::HashMap::new();

        if !creator_ids.is_empty() {
            let creator_refs: Vec<&str> = creator_ids.iter().map(|s| s.as_str()).collect();
            if let Ok(creator_resp) = state
                .pg
                .from("creators")
                .select("id,full_name,email,profile_photo_url")
                .in_("id", creator_refs)
                .execute()
                .await
            {
                if creator_resp.status().is_success() {
                    if let Ok(creator_text) = creator_resp.text().await {
                        let creator_rows: Vec<serde_json::Value> =
                            serde_json::from_str(&creator_text).unwrap_or_default();
                        for creator in creator_rows {
                            let id = creator
                                .get("id")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .trim()
                                .to_string();
                            if id.is_empty() {
                                continue;
                            }
                            let name = creator
                                .get("full_name")
                                .and_then(|v| v.as_str())
                                .or_else(|| creator.get("email").and_then(|v| v.as_str()))
                                .unwrap_or("")
                                .trim()
                                .to_string();
                            if !name.is_empty() {
                                target_name_map.insert(id.clone(), name);
                            }
                            let avatar = creator
                                .get("profile_photo_url")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .trim()
                                .to_string();
                            if !avatar.is_empty() {
                                target_avatar_map.insert(id, avatar);
                            }
                        }
                    }
                }
            }
        }

        if !agency_ids.is_empty() {
            let agency_refs: Vec<&str> = agency_ids.iter().map(|s| s.as_str()).collect();
            if let Ok(agency_resp) = state
                .pg
                .from("agencies")
                .select("id,agency_name,email,logo_url")
                .in_("id", agency_refs)
                .execute()
                .await
            {
                if agency_resp.status().is_success() {
                    if let Ok(agency_text) = agency_resp.text().await {
                        let agency_rows: Vec<serde_json::Value> =
                            serde_json::from_str(&agency_text).unwrap_or_default();
                        for agency in agency_rows {
                            let id = agency
                                .get("id")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .trim()
                                .to_string();
                            if id.is_empty() {
                                continue;
                            }
                            let name = agency
                                .get("agency_name")
                                .and_then(|v| v.as_str())
                                .or_else(|| agency.get("email").and_then(|v| v.as_str()))
                                .unwrap_or("")
                                .trim()
                                .to_string();
                            if !name.is_empty() {
                                target_name_map.insert(id.clone(), name);
                            }
                            let avatar = agency
                                .get("logo_url")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .trim()
                                .to_string();
                            if !avatar.is_empty() {
                                target_avatar_map.insert(id, avatar);
                            }
                        }
                    }
                }
            }
        }

        for row in rows.iter_mut() {
            let target_id = row
                .get("target_id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if target_id.is_empty() {
                continue;
            }
            if let Some(target_name) = target_name_map.get(&target_id) {
                if let Some(obj) = row.as_object_mut() {
                    obj.insert("target_name".to_string(), json!(target_name));
                }
            }
            if let Some(target_avatar_url) = target_avatar_map.get(&target_id) {
                if let Some(obj) = row.as_object_mut() {
                    obj.insert("target_avatar_url".to_string(), json!(target_avatar_url));
                }
            }
        }
    }

    Ok(Json(json!({ "offers": rows })))
}

pub async fn respond_to_campaign_offer(
    State(state): State<AppState>,
    user: AuthUser,
    Path(OfferPath { offer_id }): Path<OfferPath>,
    Json(payload): Json<OfferResponseRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "agency" && !is_creator_like(&user.role) {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    if user.role == "agency" {
        team::require_agency_permission(&state, &user, Permission::ManageBrandConnections).await?;
    }
    let _offer = ensure_offer_access(&state, &user, &offer_id).await?;
    let action = payload.action.trim().to_lowercase();
    let new_status = match action.as_str() {
        "accept" => "accepted",
        "decline" => "declined",
        _ => return Err((StatusCode::BAD_REQUEST, "invalid action".to_string())),
    };

    let mut update = serde_json::Map::new();
    update.insert("status".to_string(), json!(new_status));
    update.insert(
        "decided_at".to_string(),
        json!(chrono::Utc::now().to_rfc3339()),
    );
    update.insert(
        "updated_at".to_string(),
        json!(chrono::Utc::now().to_rfc3339()),
    );
    if let Some(reason) = payload
        .reason
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
    {
        update.insert("meta".to_string(), json!({ "decision_reason": reason }));
    }

    let resp = state
        .pg
        .from("campaign_offers")
        .eq("id", &offer_id)
        .update(serde_json::Value::Object(update).to_string())
        .select("*")
        .single()
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
    let row: serde_json::Value = serde_json::from_str(&text).unwrap_or_default();

    if user.role == "agency" && action == "approve" {
        if let Some(req_id) = row
            .get("asset_request_id")
            .and_then(|v| v.as_str())
            .filter(|s| !s.is_empty())
        {
            let _ = state
                .pg
                .from("offer_asset_requests")
                .eq("id", req_id)
                .update(
                    json!({
                        "status": "fulfilled",
                        "updated_at": chrono::Utc::now().to_rfc3339(),
                    })
                    .to_string(),
                )
                .execute()
                .await;
        }
    }
    Ok(Json(json!({"status":"ok","offer": row})))
}

pub async fn create_offer_contract(
    State(state): State<AppState>,
    user: AuthUser,
    Path(OfferPath { offer_id }): Path<OfferPath>,
    Json(payload): Json<CreateOfferContractRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "brand" && user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let offer = ensure_offer_access(&state, &user, &offer_id).await?;
    let target_type = offer
        .get("target_type")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let target_id = offer
        .get("target_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let agency_id = if user.role == "agency" {
        let access = team::require_agency_access(&state, &user).await?;
        if target_type != "agency" || target_id != access.organization_id {
            return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
        }
        Some(access.organization_id)
    } else {
        None
    };

    // Agencies must assign at least one talent BEFORE preparing contracts for brand campaign offers.
    // This avoids the "brand pays before assignments exist" payout/distribution failure mode.
    if let Some(ref agency_id) = agency_id {
        let assignments_resp = state
            .pg
            .from("offer_talent_assignments")
            .select("id")
            .eq("offer_id", &offer_id)
            .eq("agency_id", agency_id)
            .eq("status", "assigned")
            .limit(1)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if !assignments_resp.status().is_success() {
            return Err(sanitize_db_error(
                assignments_resp.status().as_u16(),
                assignments_resp.text().await.unwrap_or_default(),
            ));
        }
        let assignments_txt = assignments_resp
            .text()
            .await
            .unwrap_or_else(|_| "[]".into());
        let assignments_rows: Vec<serde_json::Value> =
            serde_json::from_str(&assignments_txt).unwrap_or_default();
        if assignments_rows.is_empty() {
            return Err((StatusCode::BAD_REQUEST, "no_talents_assigned".to_string()));
        }
    }

    let insert_payload = json!({
        "offer_id": offer_id,
        "brand_campaign_id": offer.get("brand_campaign_id").cloned().unwrap_or(serde_json::Value::Null),
        "brand_id": offer.get("brand_id").cloned().unwrap_or(serde_json::Value::Null),
        "target_type": target_type,
        "target_id": target_id,
        "owner_role": user.role,
        "title": payload.title.as_deref().map(str::trim).filter(|s| !s.is_empty()),
        "file_url": payload.file_url.as_deref().map(str::trim).filter(|s| !s.is_empty()),
        "docuseal_template_id": payload.docuseal_template_id,
        "docuseal_status": "draft",
        "meta": payload.meta.unwrap_or_else(|| json!({})),
        "created_by": user.id,
    });

    let resp = state
        .pg
        .from("campaign_offer_contracts")
        .insert(insert_payload.to_string())
        .select("*")
        .single()
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
    let row: serde_json::Value = serde_json::from_str(&text).unwrap_or_default();
    Ok(Json(json!({"status":"ok","contract": row})))
}

#[axum::debug_handler]
pub async fn send_offer_contract(
    State(state): State<AppState>,
    user: AuthUser,
    Path(OfferPath { offer_id }): Path<OfferPath>,
    Json(payload): Json<SendOfferContractRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "brand" && user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let offer = ensure_offer_access(&state, &user, &offer_id).await?;

    let agency_id = if user.role == "agency" {
        let access = team::require_agency_access(&state, &user).await?;
        Some(access.organization_id)
    } else {
        None
    };

    if let Some(ref agency_id) = agency_id {
        let assignments_resp = state
            .pg
            .from("offer_talent_assignments")
            .select("id")
            .eq("offer_id", &offer_id)
            .eq("agency_id", agency_id)
            .eq("status", "assigned")
            .limit(1)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if !assignments_resp.status().is_success() {
            return Err(sanitize_db_error(
                assignments_resp.status().as_u16(),
                assignments_resp.text().await.unwrap_or_default(),
            ));
        }
        let assignments_txt = assignments_resp
            .text()
            .await
            .unwrap_or_else(|_| "[]".into());
        let assignments_rows: Vec<serde_json::Value> =
            serde_json::from_str(&assignments_txt).unwrap_or_default();
        if assignments_rows.is_empty() {
            return Err((StatusCode::BAD_REQUEST, "no_talents_assigned".to_string()));
        }
    }

    let contract_id = if let Some(id) = payload.contract_id.as_deref() {
        trim_non_empty(id, "contract_id")?
    } else {
        let latest_resp = state
            .pg
            .from("campaign_offer_contracts")
            .select("id")
            .eq("offer_id", &offer_id)
            .order("created_at.desc")
            .limit(1)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let latest_status = latest_resp.status();
        let latest_text = latest_resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if !latest_status.is_success() {
            return Err(sanitize_db_error(latest_status.as_u16(), latest_text));
        }
        let rows: Vec<serde_json::Value> = serde_json::from_str(&latest_text).unwrap_or_default();
        rows.first()
            .and_then(|v| v.get("id"))
            .and_then(|v| v.as_str())
            .ok_or((StatusCode::NOT_FOUND, "contract not found".to_string()))?
            .to_string()
    };

    // Fetch the contract and related offer details
    let contract_req = state
        .pg
        .from("campaign_offer_contracts")
        .select("*, offer:campaign_offers(*, brand:brands(*))")
        .eq("id", &contract_id)
        .eq("offer_id", &offer_id)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let contract_status = contract_req.status();
    let contract_text = contract_req
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !contract_status.is_success() {
        return Err(sanitize_db_error(contract_status.as_u16(), contract_text));
    }

    let contract_data: serde_json::Value = serde_json::from_str(&contract_text).unwrap_or_default();

    let target_type = offer
        .get("target_type")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let target_id = offer
        .get("target_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let template_id = contract_data
        .get("docuseal_template_id")
        .and_then(|v| v.as_i64())
        .map(|v| v as i32);
    let mut updated_contract: Option<serde_json::Value> = None;

    if let Some(docuseal_template_id) = template_id {
        if state.docuseal_api_key.trim().is_empty() {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                "docuseal_api_key_not_configured".to_string(),
            ));
        }

        let submission_missing = contract_data.get("docuseal_submission_id").is_none()
            || contract_data["docuseal_submission_id"].is_null();

        if submission_missing && (target_type == "creator" || target_type == "talent") {
            let brand_id = offer
                .get("brand_id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let brand_resp = state
                .pg
                .from("brands")
                .select("id,company_name,email")
                .eq("id", brand_id.as_str())
                .limit(1)
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let brand_status = brand_resp.status();
            let brand_text = brand_resp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            if !brand_status.is_success() {
                return Err(sanitize_db_error(brand_status.as_u16(), brand_text));
            }
            let brand_rows: Vec<serde_json::Value> =
                serde_json::from_str(&brand_text).unwrap_or_default();
            let brand = brand_rows.first().cloned().ok_or((
                StatusCode::BAD_REQUEST,
                "brand profile not found for DocuSeal submission".to_string(),
            ))?;
            let brand_name = brand
                .get("company_name")
                .and_then(|v| v.as_str())
                .unwrap_or("Brand")
                .to_string();
            let brand_email = brand
                .get("email")
                .and_then(|v| v.as_str())
                .ok_or((
                    StatusCode::BAD_REQUEST,
                    "brand email missing for DocuSeal submission".to_string(),
                ))?
                .to_string();

            let creator_resp = state
                .pg
                .from("creators")
                .select("id,full_name,email")
                .eq("id", target_id.as_str())
                .limit(1)
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let creator_status = creator_resp.status();
            let creator_text = creator_resp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            if !creator_status.is_success() {
                return Err(sanitize_db_error(creator_status.as_u16(), creator_text));
            }
            let creator_rows: Vec<serde_json::Value> =
                serde_json::from_str(&creator_text).unwrap_or_default();
            let creator = creator_rows.first().cloned().ok_or((
                StatusCode::BAD_REQUEST,
                "creator profile not found for DocuSeal submission".to_string(),
            ))?;
            let creator_name = creator
                .get("full_name")
                .and_then(|v| v.as_str())
                .unwrap_or("Creator")
                .to_string();
            let creator_email = creator
                .get("email")
                .and_then(|v| v.as_str())
                .ok_or((
                    StatusCode::BAD_REQUEST,
                    "creator email missing for DocuSeal submission".to_string(),
                ))?
                .to_string();

            let docuseal_client = DocuSealClient::new(
                state.docuseal_api_key.clone(),
                state.docuseal_api_url.clone(),
            );
            let submission = docuseal_client
                .create_submission_with_submitters(
                    docuseal_template_id,
                    vec![
                        Submitter {
                            name: Some(brand_name.clone()),
                            email: Some(brand_email.clone()),
                            role: Some("First Party".to_string()),
                            order: Some(1),
                            fields: None,
                            values: None,
                        },
                        Submitter {
                            name: Some(creator_name.clone()),
                            email: Some(creator_email.clone()),
                            role: Some("Second Party".to_string()),
                            order: Some(2),
                            fields: None,
                            values: None,
                        },
                    ],
                    true,
                )
                .await
                .map_err(|e| {
                    let msg = e.to_string();
                    let lower = msg.to_lowercase();
                    if lower.contains("template") && lower.contains("not found") {
                        (
                            StatusCode::BAD_REQUEST,
                            "DocuSeal template not found. Verify DOCUSEAL_API_KEY account and upload a fresh PDF in Step 5."
                                .to_string(),
                        )
                    } else {
                        (StatusCode::INTERNAL_SERVER_ERROR, msg)
                    }
                })?;
            let brand_submitter = submission.submitters.iter().find(|s| {
                s.role
                    .as_deref()
                    .map(|r| docuseal_role_key(r) == "firstparty")
                    .unwrap_or(false)
            });
            let creator_submitter = submission.submitters.iter().find(|s| {
                s.role
                    .as_deref()
                    .map(|r| docuseal_role_key(r) == "secondparty")
                    .unwrap_or(false)
            });
            let brand_slug = brand_submitter
                .map(|s| s.slug.clone())
                .or_else(|| submission.submitters.first().map(|s| s.slug.clone()))
                .unwrap_or_else(|| submission.slug.clone());
            let creator_slug = creator_submitter
                .map(|s| s.slug.clone())
                .or_else(|| submission.submitters.get(1).map(|s| s.slug.clone()))
                .unwrap_or_else(|| brand_slug.clone());
            let brand_signing_url = format!(
                "{}/s/{}",
                state.docuseal_app_url.trim_end_matches('/'),
                brand_slug
            );
            let creator_signing_url = format!(
                "{}/s/{}",
                state.docuseal_app_url.trim_end_matches('/'),
                creator_slug
            );
            let mut merged_meta = contract_data
                .get("meta")
                .and_then(|v| v.as_object().cloned())
                .unwrap_or_default();
            merged_meta.insert(
                "docuseal_signing_url".to_string(),
                json!(creator_signing_url.clone()),
            );
            merged_meta.insert("brand_signing_url".to_string(), json!(brand_signing_url));
            merged_meta.insert(
                "creator_signing_url".to_string(),
                json!(creator_signing_url.clone()),
            );
            merged_meta.insert(
                "submitter_statuses".to_string(),
                json!(submission
                    .submitters
                    .iter()
                    .map(|s| json!({
                        "role": s.role,
                        "email": s.email,
                        "status": s.status,
                        "slug": s.slug,
                    }))
                    .collect::<Vec<_>>()),
            );
            let sync_resp = state
                .pg
                .from("campaign_offer_contracts")
                .eq("id", &contract_id)
                .eq("offer_id", &offer_id)
                .update(
                    json!({
                        "docuseal_submission_id": submission.id,
                        "docuseal_slug": creator_slug,
                        "docuseal_status": "sent",
                        "meta": serde_json::Value::Object(merged_meta),
                        "sent_at": chrono::Utc::now().to_rfc3339(),
                        "updated_at": chrono::Utc::now().to_rfc3339(),
                    })
                    .to_string(),
                )
                .select("*")
                .single()
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let sync_status = sync_resp.status();
            let sync_text = sync_resp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            if !sync_status.is_success() {
                return Err(sanitize_db_error(sync_status.as_u16(), sync_text));
            }
            updated_contract = Some(serde_json::from_str(&sync_text).unwrap_or_default());
        } else if submission_missing && target_type == "agency" {
            let brand_id = offer
                .get("brand_id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let brand_resp = state
                .pg
                .from("brands")
                .select("id,company_name,email")
                .eq("id", brand_id.as_str())
                .limit(1)
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let brand_status = brand_resp.status();
            let brand_text = brand_resp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            if !brand_status.is_success() {
                return Err(sanitize_db_error(brand_status.as_u16(), brand_text));
            }
            let brand_rows: Vec<serde_json::Value> =
                serde_json::from_str(&brand_text).unwrap_or_default();
            let brand = brand_rows.first().cloned().ok_or((
                StatusCode::BAD_REQUEST,
                "brand profile not found for DocuSeal submission".to_string(),
            ))?;
            let brand_name = brand
                .get("company_name")
                .and_then(|v| v.as_str())
                .unwrap_or("Brand")
                .to_string();
            let brand_email = brand
                .get("email")
                .and_then(|v| v.as_str())
                .ok_or((
                    StatusCode::BAD_REQUEST,
                    "brand email missing for DocuSeal submission".to_string(),
                ))?
                .to_string();

            let agency_resp = state
                .pg
                .from("agencies")
                .select("id,agency_name,email")
                .eq("id", target_id.as_str())
                .limit(1)
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let agency_status = agency_resp.status();
            let agency_text = agency_resp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            if !agency_status.is_success() {
                return Err(sanitize_db_error(agency_status.as_u16(), agency_text));
            }
            let agency_rows: Vec<serde_json::Value> =
                serde_json::from_str(&agency_text).unwrap_or_default();
            let agency = agency_rows.first().cloned().ok_or((
                StatusCode::BAD_REQUEST,
                "agency profile not found for DocuSeal submission".to_string(),
            ))?;
            let agency_name = agency
                .get("agency_name")
                .and_then(|v| v.as_str())
                .unwrap_or("Agency")
                .to_string();
            let agency_email = resolve_agency_signer_email(
                &state,
                &target_id,
                if user.role == "agency" {
                    user.email.as_ref()
                } else {
                    None
                },
            )
            .await
            .or_else(|| {
                agency
                    .get("email")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            })
            .ok_or((
                StatusCode::BAD_REQUEST,
                "agency email missing for DocuSeal submission".to_string(),
            ))?;

            let docuseal_client = DocuSealClient::new(
                state.docuseal_api_key.clone(),
                state.docuseal_api_url.clone(),
            );
            let submission = docuseal_client
                .create_submission_with_submitters(
                    docuseal_template_id,
                    vec![
                        Submitter {
                            name: Some(agency_name.clone()),
                            email: Some(agency_email.clone()),
                            role: Some("First Party".to_string()),
                            order: Some(0),
                            fields: None,
                            values: None,
                        },
                        Submitter {
                            name: Some(brand_name.clone()),
                            email: Some(brand_email.clone()),
                            role: Some("Second Party".to_string()),
                            order: Some(1),
                            fields: None,
                            values: None,
                        },
                    ],
                    true,
                )
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

            let agency_submitter = submission.submitters.iter().find(|s| {
                s.role
                    .as_deref()
                    .map(|r| docuseal_role_key(r) == "firstparty")
                    .unwrap_or(false)
            });
            let brand_submitter = submission.submitters.iter().find(|s| {
                s.role
                    .as_deref()
                    .map(|r| docuseal_role_key(r) == "secondparty")
                    .unwrap_or(false)
            });
            let agency_slug = agency_submitter
                .map(|s| s.slug.clone())
                .or_else(|| submission.submitters.first().map(|s| s.slug.clone()))
                .unwrap_or_else(|| submission.slug.clone());
            let brand_slug = brand_submitter
                .map(|s| s.slug.clone())
                .or_else(|| submission.submitters.get(1).map(|s| s.slug.clone()))
                .unwrap_or_else(|| agency_slug.clone());
            let agency_signing_url = format!(
                "{}/s/{}",
                state.docuseal_app_url.trim_end_matches('/'),
                agency_slug
            );
            let brand_signing_url = format!(
                "{}/s/{}",
                state.docuseal_app_url.trim_end_matches('/'),
                brand_slug
            );
            let mut merged_meta = contract_data
                .get("meta")
                .and_then(|v| v.as_object().cloned())
                .unwrap_or_default();
            merged_meta.insert(
                "agency_signing_url".to_string(),
                json!(agency_signing_url.clone()),
            );
            merged_meta.insert(
                "brand_signing_url".to_string(),
                json!(brand_signing_url.clone()),
            );
            merged_meta.insert(
                "docuseal_signing_url".to_string(),
                json!(agency_signing_url.clone()),
            );
            merged_meta.insert(
                "submitter_statuses".to_string(),
                json!(submission
                    .submitters
                    .iter()
                    .map(|s| json!({
                        "role": s.role,
                        "email": s.email,
                        "status": s.status,
                        "slug": s.slug,
                    }))
                    .collect::<Vec<_>>()),
            );
            merged_meta.insert(
                "agency_submitter_status".to_string(),
                json!(agency_submitter
                    .map(|s| s.status.clone())
                    .unwrap_or("pending".to_string())),
            );
            merged_meta.insert(
                "brand_submitter_status".to_string(),
                json!(brand_submitter
                    .map(|s| s.status.clone())
                    .unwrap_or("pending".to_string())),
            );

            let sync_resp = state
                .pg
                .from("campaign_offer_contracts")
                .eq("id", &contract_id)
                .eq("offer_id", &offer_id)
                .update(
                    json!({
                        "docuseal_submission_id": submission.id,
                        "docuseal_slug": agency_slug,
                        "docuseal_status": "agency_pending",
                        "meta": serde_json::Value::Object(merged_meta),
                        "sent_at": chrono::Utc::now().to_rfc3339(),
                        "updated_at": chrono::Utc::now().to_rfc3339(),
                    })
                    .to_string(),
                )
                .select("*")
                .single()
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let sync_status = sync_resp.status();
            let sync_text = sync_resp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            if !sync_status.is_success() {
                return Err(sanitize_db_error(sync_status.as_u16(), sync_text));
            }
            updated_contract = Some(serde_json::from_str(&sync_text).unwrap_or_default());
        }
    }

    let contract = if let Some(updated) = updated_contract {
        updated
    } else {
        let now = chrono::Utc::now().to_rfc3339();
        let mut update = json!({
            "sent_at": now,
            "updated_at": now,
        });
        if contract_data
            .get("docuseal_status")
            .and_then(|v| v.as_str())
            .unwrap_or("draft")
            == "draft"
        {
            update["docuseal_status"] = json!("sent");
        }

        let resp = state
            .pg
            .from("campaign_offer_contracts")
            .eq("id", &contract_id)
            .eq("offer_id", &offer_id)
            .update(update.to_string())
            .select("*")
            .single()
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
        serde_json::from_str(&text).unwrap_or_default()
    };

    let _ = state
        .pg
        .from("campaign_offers")
        .eq("id", &offer_id)
        .update(
            json!({
                "status": "contract_sent",
                "updated_at": chrono::Utc::now().to_rfc3339(),
            })
            .to_string(),
        )
        .execute()
        .await;

    Ok(Json(json!({"status":"ok","contract": contract})))
}

pub async fn refresh_offer_contract_status(
    State(state): State<AppState>,
    user: AuthUser,
    Path(OfferContractPath {
        offer_id,
        contract_id,
    }): Path<OfferContractPath>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let offer = ensure_offer_access(&state, &user, &offer_id).await?;
    let resp = state
        .pg
        .from("campaign_offer_contracts")
        .select("*")
        .eq("id", &contract_id)
        .eq("offer_id", &offer_id)
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
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    let existing = rows
        .first()
        .cloned()
        .ok_or((StatusCode::NOT_FOUND, "contract not found".to_string()))?;

    // Refresh is best-effort: never break the UI if DocuSeal is unavailable or misconfigured.
    // When we can't refresh, return the existing row (with any derived signing link we can compute)
    // as 200 OK and include a lightweight warning in `meta`.
    let submission_id_opt = existing
        .get("docuseal_submission_id")
        .and_then(|v| v.as_i64());

    if submission_id_opt.is_none() || state.docuseal_api_key.trim().is_empty() {
        let signer_slug = existing
            .get("docuseal_slug")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .or_else(|| {
                existing
                    .get("meta")
                    .and_then(|v| v.as_object())
                    .and_then(|m| m.get("docuseal_slug"))
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            })
            .unwrap_or_default();
        let signing_url = if signer_slug.trim().is_empty() {
            "".to_string()
        } else {
            format!(
                "{}/s/{}",
                state.docuseal_app_url.trim_end_matches('/'),
                signer_slug.trim()
            )
        };
        let mut merged_meta = existing
            .get("meta")
            .and_then(|v| v.as_object().cloned())
            .unwrap_or_default();
        if !signing_url.is_empty() {
            merged_meta.insert("docuseal_signing_url".to_string(), json!(signing_url));
        }
        merged_meta.insert(
            "docuseal_refresh_warning".to_string(),
            json!(if submission_id_opt.is_none() {
                "docuseal_submission_id_missing"
            } else {
                "docuseal_api_key_not_configured"
            }),
        );
        let mut contract = existing.clone();
        contract["meta"] = serde_json::Value::Object(merged_meta);
        return Ok(Json(
            json!({"status":"ok","contract": contract, "refreshed": false}),
        ));
    }

    let submission_id = submission_id_opt.unwrap_or_default();
    let docuseal_client = DocuSealClient::new(
        state.docuseal_api_key.clone(),
        state.docuseal_api_url.clone(),
    );
    let details = match docuseal_client.get_submission(submission_id as i32).await {
        Ok(d) => d,
        Err(e) => {
            tracing::warn!(
                offer_id = %offer_id,
                contract_id = %contract_id,
                submission_id,
                error = %e,
                "DocuSeal refresh failed; returning existing contract without refresh"
            );
            let mut merged_meta = existing
                .get("meta")
                .and_then(|v| v.as_object().cloned())
                .unwrap_or_default();
            merged_meta.insert(
                "docuseal_refresh_warning".to_string(),
                json!("docuseal_sync_failed"),
            );
            merged_meta.insert(
                "docuseal_refresh_failed_at".to_string(),
                json!(chrono::Utc::now().to_rfc3339()),
            );
            let mut contract = existing.clone();
            contract["meta"] = serde_json::Value::Object(merged_meta);
            return Ok(Json(
                json!({"status":"ok","contract": contract, "refreshed": false}),
            ));
        }
    };

    let signer_slug = details
        .submitters
        .first()
        .map(|s| s.slug.clone())
        .or_else(|| {
            existing
                .get("docuseal_slug")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        })
        .unwrap_or_default();
    let signing_url = if signer_slug.is_empty() {
        "".to_string()
    } else {
        format!(
            "{}/s/{}",
            state.docuseal_app_url.trim_end_matches('/'),
            signer_slug
        )
    };
    let mut merged_meta = existing
        .get("meta")
        .and_then(|v| v.as_object().cloned())
        .unwrap_or_default();
    if !signing_url.is_empty() {
        merged_meta.insert("docuseal_signing_url".to_string(), json!(signing_url));
    }
    if let Some(first_doc) = details.documents.first() {
        if !first_doc.url.trim().is_empty() {
            merged_meta.insert(
                "docuseal_document_url".to_string(),
                json!(first_doc.url.trim()),
            );
        }
    }
    let submitter_statuses = details
        .submitters
        .iter()
        .map(|s| {
            json!({
                "role": s.role,
                "email": s.email,
                "status": s.status,
                "slug": s.slug,
            })
        })
        .collect::<Vec<_>>();
    merged_meta.insert("submitter_statuses".to_string(), json!(submitter_statuses));
    let target_type = offer
        .get("target_type")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let first_submitter_status = details
        .submitters
        .iter()
        .find(|s| {
            s.role
                .as_deref()
                .map(|r| docuseal_role_key(r) == "firstparty")
                .unwrap_or(false)
        })
        .map(|s| s.status.to_lowercase())
        .unwrap_or_default();
    let second_submitter_status = details
        .submitters
        .iter()
        .find(|s| {
            s.role
                .as_deref()
                .map(|r| docuseal_role_key(r) == "secondparty")
                .unwrap_or(false)
        })
        .map(|s| s.status.to_lowercase())
        .unwrap_or_default();
    let any_opened = details.submitters.iter().any(|s| {
        let st = s.status.to_lowercase();
        st == "opened" || st == "viewed"
    });
    let any_declined = details.submitters.iter().any(|s| {
        let st = s.status.to_lowercase();
        st == "declined" || st == "rejected"
    });
    let (brand_submitter_status, creator_submitter_status, agency_submitter_status) =
        if target_type == "agency" {
            (
                second_submitter_status.clone(),
                String::new(),
                first_submitter_status.clone(),
            )
        } else {
            (
                first_submitter_status.clone(),
                second_submitter_status.clone(),
                String::new(),
            )
        };
    let brand_is_signed = is_submitter_signed(&brand_submitter_status);
    let creator_is_signed = is_submitter_signed(&creator_submitter_status);
    let agency_is_signed = is_submitter_signed(&agency_submitter_status);
    let both_signed = if target_type == "agency" {
        agency_is_signed && brand_is_signed
    } else {
        brand_is_signed && creator_is_signed
    };
    let derived_status = if any_declined {
        "declined"
    } else if both_signed {
        "completed"
    } else if target_type == "agency" {
        if agency_is_signed {
            if any_opened || brand_is_signed {
                "opened"
            } else {
                "sent"
            }
        } else {
            "agency_pending"
        }
    } else if any_opened || brand_is_signed {
        "opened"
    } else {
        "sent"
    };
    merged_meta.insert(
        "brand_submitter_status".to_string(),
        json!(brand_submitter_status),
    );
    if target_type == "agency" {
        merged_meta.insert(
            "agency_submitter_status".to_string(),
            json!(agency_submitter_status),
        );
    } else {
        merged_meta.insert(
            "creator_submitter_status".to_string(),
            json!(creator_submitter_status),
        );
    }
    merged_meta.insert(
        "docuseal_submission_status".to_string(),
        json!(details.status.clone()),
    );

    let docuseal_status = derived_status.to_string();
    let update_resp = state
        .pg
        .from("campaign_offer_contracts")
        .eq("id", &contract_id)
        .eq("offer_id", &offer_id)
        .update(
            json!({
                "docuseal_status": docuseal_status,
                "docuseal_slug": if signer_slug.is_empty() { serde_json::Value::Null } else { json!(signer_slug) },
                "meta": serde_json::Value::Object(merged_meta),
                "last_synced_at": chrono::Utc::now().to_rfc3339(),
                "updated_at": chrono::Utc::now().to_rfc3339(),
            })
            .to_string(),
        )
        .select("*")
        .single()
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
    let updated_contract: serde_json::Value =
        serde_json::from_str(&update_text).unwrap_or_default();

    // Only consider an offer "fully signed" when BOTH parties have signed.
    // We treat all in-flight signature states as "sent"/"partially signed".
    let mapped_offer_status = match derived_status {
        "completed" => Some("contract_fully_signed"),
        "opened" => Some("contract_partially_signed"),
        "sent" | "agency_pending" => Some("contract_sent"),
        "declined" => Some("changes_requested"),
        _ => None,
    };
    if let Some(status_value) = mapped_offer_status {
        let _ = state
            .pg
            .from("campaign_offers")
            .eq("id", &offer_id)
            .update(
                json!({
                    "status": status_value,
                    "updated_at": chrono::Utc::now().to_rfc3339(),
                })
                .to_string(),
            )
            .execute()
            .await;
    }

    Ok(Json(json!({"status":"ok","contract": updated_contract})))
}

pub async fn archive_offer_contract(
    State(state): State<AppState>,
    user: AuthUser,
    Path(OfferContractPath {
        offer_id,
        contract_id,
    }): Path<OfferContractPath>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "brand" && user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let _offer = ensure_offer_access(&state, &user, &offer_id).await?;
    let resp = state
        .pg
        .from("campaign_offer_contracts")
        .select("*")
        .eq("id", &contract_id)
        .eq("offer_id", &offer_id)
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
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    let existing = rows
        .first()
        .cloned()
        .ok_or((StatusCode::NOT_FOUND, "contract not found".to_string()))?;

    if let Some(submission_id) = existing
        .get("docuseal_submission_id")
        .and_then(|v| v.as_i64())
    {
        if !state.docuseal_api_key.trim().is_empty() {
            let docuseal_client = DocuSealClient::new(
                state.docuseal_api_key.clone(),
                state.docuseal_api_url.clone(),
            );
            let _ = docuseal_client
                .archive_submission(submission_id as i32)
                .await;
        }
    }

    let mut merged_meta = existing
        .get("meta")
        .and_then(|v| v.as_object().cloned())
        .unwrap_or_default();
    merged_meta.insert(
        "archived_at".to_string(),
        json!(chrono::Utc::now().to_rfc3339()),
    );
    merged_meta.insert("archived_by".to_string(), json!(user.id));

    let update_resp = state
        .pg
        .from("campaign_offer_contracts")
        .eq("id", &contract_id)
        .eq("offer_id", &offer_id)
        .update(
            json!({
                "docuseal_status": "archived",
                "meta": serde_json::Value::Object(merged_meta),
                "updated_at": chrono::Utc::now().to_rfc3339(),
            })
            .to_string(),
        )
        .select("*")
        .single()
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
    let updated_contract: serde_json::Value =
        serde_json::from_str(&update_text).unwrap_or_default();
    Ok(Json(json!({"status":"ok","contract": updated_contract})))
}

pub async fn list_offer_contracts(
    State(state): State<AppState>,
    user: AuthUser,
    Path(OfferPath { offer_id }): Path<OfferPath>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let _offer = ensure_offer_access(&state, &user, &offer_id).await?;
    let resp = state
        .pg
        .from("campaign_offer_contracts")
        .select("*")
        .eq("offer_id", &offer_id)
        .order("created_at.desc")
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
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    Ok(Json(json!({ "contracts": rows })))
}

pub async fn sync_offer_contract(
    State(state): State<AppState>,
    user: AuthUser,
    Path(OfferPath { offer_id }): Path<OfferPath>,
    Json(payload): Json<SyncOfferContractRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "brand" && user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let _offer = ensure_offer_access(&state, &user, &offer_id).await?;

    // 1. Fetch the current contract record to get its docuseal_submission_id
    let contract_resp = state
        .pg
        .from("campaign_offer_contracts")
        .select("*")
        .eq("id", &payload.contract_id)
        .eq("offer_id", &offer_id)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !contract_resp.status().is_success() {
        let text = contract_resp.text().await.unwrap_or_default();
        return Err(sanitize_db_error(404, text));
    }

    let contract_text = contract_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let contract_record: serde_json::Value =
        serde_json::from_str(&contract_text).unwrap_or_default();

    let submission_id = contract_record
        .get("docuseal_submission_id")
        .and_then(|v| v.as_i64());

    let now = chrono::Utc::now().to_rfc3339();
    let mut update = serde_json::Map::new();
    update.insert("last_synced_at".to_string(), json!(now));
    update.insert("updated_at".to_string(), json!(now));

    // 2. If we have a submission_id, fetch live status from DocuSeal
    if let Some(sid) = submission_id {
        let docuseal_client = DocuSealClient::new(
            state.docuseal_api_key.clone(),
            state.docuseal_base_url.clone(),
        );

        match docuseal_client.get_submission(sid as i32).await {
            Ok(ds_submission) => {
                info!(
                    submission_id = sid,
                    docuseal_status = %ds_submission.status,
                    "Fetched live DocuSeal status during sync"
                );
                let target_type = contract_record
                    .get("target_type")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let first_submitter_status = ds_submission
                    .submitters
                    .iter()
                    .find(|s| {
                        s.role
                            .as_deref()
                            .map(|r| docuseal_role_key(r) == "firstparty")
                            .unwrap_or(false)
                    })
                    .map(|s| s.status.to_lowercase())
                    .unwrap_or_default();
                let second_submitter_status = ds_submission
                    .submitters
                    .iter()
                    .find(|s| {
                        s.role
                            .as_deref()
                            .map(|r| docuseal_role_key(r) == "secondparty")
                            .unwrap_or(false)
                    })
                    .map(|s| s.status.to_lowercase())
                    .unwrap_or_default();
                let any_opened = ds_submission.submitters.iter().any(|s| {
                    let st = s.status.to_lowercase();
                    st == "opened" || st == "viewed"
                });
                let any_declined = ds_submission.submitters.iter().any(|s| {
                    let st = s.status.to_lowercase();
                    st == "declined" || st == "rejected"
                });
                let live_status = if any_declined {
                    "declined"
                } else if target_type == "agency" {
                    let agency_signed = is_submitter_signed(&first_submitter_status);
                    let brand_signed = is_submitter_signed(&second_submitter_status);
                    if agency_signed && brand_signed {
                        "completed"
                    } else if agency_signed {
                        if any_opened || brand_signed {
                            "opened"
                        } else {
                            "sent"
                        }
                    } else {
                        "agency_pending"
                    }
                } else {
                    match ds_submission.status.as_str() {
                        "completed" => "completed",
                        "declined" => "declined",
                        "pending" | "sent" => "sent",
                        "opened" | "viewed" => "opened",
                        other => other,
                    }
                };
                update.insert("docuseal_status".to_string(), json!(live_status));

                // Pull slug from first submitter if we don't have one stored yet
                let stored_slug = contract_record
                    .get("docuseal_slug")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                if stored_slug.is_empty() {
                    if let Some(first_submitter) = ds_submission.submitters.first() {
                        update.insert("docuseal_slug".to_string(), json!(first_submitter.slug));
                    }
                }

                // If completed, capture the signed document URL
                if live_status == "completed" {
                    if let Some(url) = ds_submission.documents.first().map(|d| d.url.clone()) {
                        update.insert("signed_document_url".to_string(), json!(url));
                    }
                }
            }
            Err(e) => {
                tracing::warn!(
                    submission_id = sid,
                    error = %e,
                    "Could not reach DocuSeal during sync; updating timestamp only"
                );
            }
        }
    }

    // Allow the client to override slug / meta if provided
    if let Some(v) = payload.docuseal_slug.as_deref().filter(|s| !s.is_empty()) {
        update.insert("docuseal_slug".to_string(), json!(v));
    }
    if let Some(meta) = payload.meta {
        update.insert("meta".to_string(), meta);
    }

    // 3. Write the update back to the database
    let resp = state
        .pg
        .from("campaign_offer_contracts")
        .eq("id", &payload.contract_id)
        .eq("offer_id", &offer_id)
        .update(serde_json::Value::Object(update).to_string())
        .select("*")
        .single()
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
    let contract: serde_json::Value = serde_json::from_str(&text).unwrap_or_default();

    // 4. Propagate status change to the parent campaign offer
    if let Some(ds) = contract.get("docuseal_status").and_then(|v| v.as_str()) {
        let mapped = match ds {
            "completed" | "fully_signed" => Some("contract_fully_signed"),
            "partially_signed" => Some("contract_partially_signed"),
            "sent" | "pending" | "opened" | "viewed" => Some("contract_sent"),
            _ => None,
        };
        if let Some(status_value) = mapped {
            let _ = state
                .pg
                .from("campaign_offers")
                .eq("id", &offer_id)
                .update(
                    json!({
                        "status": status_value,
                        "updated_at": chrono::Utc::now().to_rfc3339(),
                    })
                    .to_string(),
                )
                .execute()
                .await;
        }
    }

    Ok(Json(json!({"status": "ok", "contract": contract})))
}

pub async fn upload_offer_contract(
    State(state): State<AppState>,
    user: AuthUser,
    Path(OfferPath { offer_id }): Path<OfferPath>,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "agency_only".to_string()));
    }
    let offer = ensure_offer_access(&state, &user, &offer_id).await?;

    let mut file_name = String::new();
    let mut file_data = Vec::new();

    while let Some(field) = multipart.next_field().await.map_err(|e| {
        error!(error = %e, "Failed to get next field from multipart");
        (StatusCode::BAD_REQUEST, e.to_string())
    })? {
        let name = field.name().unwrap_or("").to_string();
        if name == "file" {
            file_name = field.file_name().unwrap_or("document.pdf").to_string();
            file_data = field
                .bytes()
                .await
                .map_err(|e| {
                    error!(error = %e, "Failed to read bytes from multipart field");
                    (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
                })?
                .to_vec();
        }
    }

    if file_data.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "No file provided".to_string()));
    }

    // Convert to base64 with Data URI prefix
    let base64_content = format!(
        "data:application/pdf;base64,{}",
        general_purpose::STANDARD.encode(file_data)
    );

    let docuseal_client = DocuSealClient::new(
        state.docuseal_api_key.clone(),
        state.docuseal_api_url.clone(),
    );

    // Create template in DocuSeal
    let template = docuseal_client
        .create_template(file_name.clone(), file_name.clone(), base64_content)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to create template in DocuSeal");
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    // Create contract record in database
    let pg = Postgrest::new(format!("{}/rest/v1", state.supabase_url))
        .insert_header("apikey", &state.supabase_service_key)
        .insert_header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        );

    let target_type = offer
        .get("target_type")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let target_id = offer
        .get("target_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    let insert_payload = json!({
        "offer_id": offer_id,
        "brand_campaign_id": offer.get("brand_campaign_id").cloned().unwrap_or(serde_json::Value::Null),
        "brand_id": offer.get("brand_id").cloned().unwrap_or(serde_json::Value::Null),
        "target_type": target_type,
        "target_id": target_id,
        "owner_role": user.role,
        "title": file_name,
        "docuseal_template_id": template.id,
        "docuseal_status": "draft",
        "created_by": user.id,
    });

    let resp = pg
        .from("campaign_offer_contracts")
        .insert(insert_payload.to_string())
        .select("*")
        .single()
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

    let inserted_contract: serde_json::Value = serde_json::from_str(&text).unwrap_or_default();
    let contract_id = inserted_contract
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    Ok(Json(CreateTemplateFromPdfResponse {
        id: contract_id.to_string(),
        slug: template.slug,
        name: template.name,
    }))
}

pub async fn get_offer_contract_builder_token(
    State(state): State<AppState>,
    user: AuthUser,
    Path(ContractPath {
        offer_id,
        contract_id,
    }): Path<ContractPath>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "agency_only".to_string()));
    }
    let _offer = ensure_offer_access(&state, &user, &offer_id).await?;

    // Fetch contract to get docuseal_template_id
    let pg = Postgrest::new(format!("{}/rest/v1", state.supabase_url))
        .insert_header("apikey", &state.supabase_service_key)
        .insert_header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        );

    let resp = pg
        .from("campaign_offer_contracts")
        .select("docuseal_template_id")
        .eq("id", &contract_id)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let contract_text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let contract: serde_json::Value = serde_json::from_str(&contract_text).unwrap_or_default();
    let template_id = contract
        .get("docuseal_template_id")
        .and_then(|v| v.as_i64());

    if template_id.is_none() {
        return Err((
            StatusCode::NOT_FOUND,
            "Contract template not found".to_string(),
        ));
    }

    // Fetch agency details
    let agency_resp = pg
        .from("agencies")
        .select("contact_email:email,name:agency_name")
        .eq("id", &user.id)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let agency_text = agency_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let agency: serde_json::Value = serde_json::from_str(&agency_text).unwrap_or_default();

    if state.docuseal_user_email.is_empty() {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            "DocuSeal admin email not configured".to_string(),
        ));
    }

    let user_email = state.docuseal_user_email.clone();
    let name = agency["name"].as_str().unwrap_or("Agency User").to_string();
    let integration_email = agency["contact_email"]
        .as_str()
        .unwrap_or("agency@example.com")
        .to_string();

    let docuseal_client = DocuSealClient::new(
        state.docuseal_api_key.clone(),
        state.docuseal_api_url.clone(),
    );

    let token = docuseal_client
        .create_builder_token(
            user_email,
            name,
            integration_email,
            Some(template_id.unwrap() as i32),
            None,
        )
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(json!({ "token": token })))
}

pub async fn delete_offer_contract(
    State(state): State<AppState>,
    user: AuthUser,
    Path(ContractPath {
        offer_id,
        contract_id,
    }): Path<ContractPath>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "agency_only".to_string()));
    }
    let _offer = ensure_offer_access(&state, &user, &offer_id).await?;

    // Check if contract exists and is a draft
    let pg = Postgrest::new(format!("{}/rest/v1", state.supabase_url))
        .insert_header("apikey", &state.supabase_service_key)
        .insert_header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        );

    let resp = pg
        .from("campaign_offer_contracts")
        .delete()
        .eq("id", &contract_id)
        .eq("offer_id", &offer_id)
        .eq("docuseal_status", "draft")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    if !status.is_success() {
        let text = resp.text().await.unwrap_or_default();
        return Err(sanitize_db_error(status.as_u16(), text));
    }

    Ok(StatusCode::NO_CONTENT)
}

pub async fn create_offer_package(
    State(state): State<AppState>,
    user: AuthUser,
    Path(OfferPath { offer_id }): Path<OfferPath>,
    Json(payload): Json<CreateOfferPackageRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let offer = ensure_offer_access(&state, &user, &offer_id).await?;
    let target_type = offer
        .get("target_type")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if target_type != "agency" {
        return Err((
            StatusCode::BAD_REQUEST,
            "packages are only available for agency offers".to_string(),
        ));
    }
    let insert_payload = json!({
        "offer_id": offer_id,
        "brand_campaign_id": offer.get("brand_campaign_id").cloned().unwrap_or(serde_json::Value::Null),
        "brand_id": offer.get("brand_id").cloned().unwrap_or(serde_json::Value::Null),
        "agency_id": user.id,
        "status": "draft",
        "title": payload.title.as_deref().map(str::trim).filter(|s| !s.is_empty()),
        "message": payload.message.as_deref().map(str::trim).filter(|s| !s.is_empty()),
        "package_snapshot": payload.package_snapshot.unwrap_or_else(|| json!({})),
        "expires_at": payload.expires_at,
        "meta": payload.meta.unwrap_or_else(|| json!({})),
        "created_by": user.id,
    });

    let resp = state
        .pg
        .from("campaign_offer_packages")
        .insert(insert_payload.to_string())
        .select("*")
        .single()
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
    let row: serde_json::Value = serde_json::from_str(&text).unwrap_or_default();
    Ok(Json(json!({"status":"ok","package": row})))
}

pub async fn send_offer_package(
    State(state): State<AppState>,
    user: AuthUser,
    Path(OfferPath { offer_id }): Path<OfferPath>,
    Json(payload): Json<SendOfferPackageRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let _offer = ensure_offer_access(&state, &user, &offer_id).await?;
    let access = team::require_agency_access(&state, &user).await?;
    let agency_id = &access.organization_id;
    let now = chrono::Utc::now().to_rfc3339();
    let resp = state
        .pg
        .from("campaign_offer_packages")
        .eq("id", &payload.package_id)
        .eq("offer_id", &offer_id)
        .eq("agency_id", agency_id)
        .update(
            json!({
                "status": "sent",
                "sent_at": now,
                "updated_at": now,
            })
            .to_string(),
        )
        .select("*")
        .single()
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
    let row: serde_json::Value = serde_json::from_str(&text).unwrap_or_default();
    Ok(Json(json!({"status":"ok","package": row})))
}

pub async fn list_brand_inbox_packages(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "brand" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let resp = state
        .pg
        .from("campaign_offer_packages")
        .select("*,campaign_offers(id,status,target_type,target_id,offer_title,brand_campaigns(name)),agencies(id,agency_name)")
        .eq("brand_id", &user.id)
        .order("created_at.desc")
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
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    Ok(Json(json!({"packages": rows})))
}

pub async fn mark_brand_package_done(
    State(state): State<AppState>,
    user: AuthUser,
    Path(OfferPath { offer_id }): Path<OfferPath>,
    Json(payload): Json<PackageDoneRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "brand" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let offer = ensure_offer_access(&state, &user, &offer_id).await?;
    if offer.get("brand_id").and_then(|v| v.as_str()) != Some(user.id.as_str()) {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let now = chrono::Utc::now().to_rfc3339();
    let current_resp = state
        .pg
        .from("campaign_offer_packages")
        .eq("id", &payload.package_id)
        .eq("offer_id", &offer_id)
        .eq("brand_id", &user.id)
        .select("meta")
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let current_text = current_resp.text().await.unwrap_or_default();
    let current_row: serde_json::Value = serde_json::from_str(&current_text).unwrap_or_default();
    let mut current_meta = current_row
        .get("meta")
        .cloned()
        .unwrap_or_else(|| json!({}));

    if let Some(obj) = current_meta.as_object_mut() {
        if let Some(ids) = payload.selected_talent_ids {
            obj.insert("selected_talent_ids".to_string(), json!(ids));
        }
        if let Some(note) = payload
            .feedback_note
            .as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty())
        {
            obj.insert("feedback_note".to_string(), json!(note));
        }
        obj.insert("done_by_brand_id".to_string(), json!(user.id));
    }

    let resp = state
        .pg
        .from("campaign_offer_packages")
        .eq("id", &payload.package_id)
        .eq("offer_id", &offer_id)
        .eq("brand_id", &user.id)
        .update(
            json!({
                "status": "feedback_received",
                "decided_at": now,
                "meta": current_meta,
                "updated_at": now,
            })
            .to_string(),
        )
        .select("*")
        .single()
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
    let row: serde_json::Value = serde_json::from_str(&text).unwrap_or_default();
    Ok(Json(json!({"status":"ok","package": row})))
}

pub async fn list_agency_offer_packages(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let access = team::require_agency_access(&state, &user).await?;
    let agency_id = &access.organization_id;
    let resp = state
        .pg
        .from("campaign_offer_packages")
        .select("*,brand_campaigns(id,name),campaign_offers(id,offer_title,target_type,target_id)")
        .eq("agency_id", agency_id)
        .order("created_at.desc")
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
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    Ok(Json(json!({"items": rows})))
}

pub async fn list_agency_package_feedback(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let access = team::require_agency_access(&state, &user).await?;
    let agency_id = &access.organization_id;
    let resp = state
        .pg
        .from("campaign_offer_packages")
        .select("*,campaign_offers(id,brand_campaign_id,status,offer_title,message)")
        .eq("agency_id", agency_id)
        .eq("status", "feedback_received")
        .order("updated_at.desc")
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
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    Ok(Json(json!({"items": rows})))
}

pub async fn list_offer_talent_assignments(
    State(state): State<AppState>,
    user: AuthUser,
    Path(OfferPath { offer_id }): Path<OfferPath>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let _offer = ensure_offer_access(&state, &user, &offer_id).await?;
    let access = team::require_agency_access(&state, &user).await?;
    let agency_id = &access.organization_id;
    let resp = state
        .pg
        .from("offer_talent_assignments")
        .select("*, creators(id, full_name, profile_photo_url), agency_users(id, full_legal_name, stage_name, profile_photo_url, creator_id)")
        .eq("offer_id", &offer_id)
        .eq("agency_id", agency_id)
        .eq("status", "assigned")
        .order("created_at.desc")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !resp.status().is_success() {
        return Err(sanitize_db_error(
            resp.status().as_u16(),
            resp.text().await.unwrap_or_default(),
        ));
    }
    let text = resp.text().await.unwrap_or_default();
    let mut rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();

    // Backward-compat: older rows may have stored a non-canonical talent_id
    // (e.g. creator_id), which breaks the foreign-table join. Best-effort
    // attach the agency_users row using creator_id.
    for row in rows.iter_mut() {
        let needs_user = row
            .get("agency_users")
            .and_then(|v| v.as_object())
            .is_none();
        if !needs_user {
            continue;
        }
        let creator_id = row
            .get("creator_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if creator_id.is_empty() {
            continue;
        }
        let au_resp = state
            .pg
            .from("agency_users")
            .select("id, full_legal_name, stage_name, profile_photo_url, creator_id")
            .eq("agency_id", agency_id)
            .or(format!(
                "creator_id.eq.{},user_id.eq.{}",
                creator_id, creator_id
            ))
            .limit(1)
            .execute()
            .await;
        if let Ok(au_resp) = au_resp {
            if au_resp.status().is_success() {
                let au_text = au_resp.text().await.unwrap_or_default();
                let au_rows: Vec<serde_json::Value> =
                    serde_json::from_str(&au_text).unwrap_or_default();
                if let Some(au) = au_rows.first().cloned() {
                    if let Some(obj) = row.as_object_mut() {
                        obj.insert("agency_users".to_string(), au);
                    }
                }
            }
        }
    }

    Ok(Json(json!({ "assignments": rows })))
}

pub async fn create_offer_talent_assignment(
    State(state): State<AppState>,
    user: AuthUser,
    Path(OfferPath { offer_id }): Path<OfferPath>,
    Json(payload): Json<CreateOfferTalentAssignmentRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let offer = ensure_offer_access(&state, &user, &offer_id).await?;
    let access = team::require_agency_access(&state, &user).await?;
    let agency_id = &access.organization_id;
    let offer_status = offer
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_lowercase();
    if offer_status == "contract_sent" || offer_status == "contract_fully_signed" {
        return Err((
            StatusCode::BAD_REQUEST,
            "cannot_change_assignments_after_contract_sent".to_string(),
        ));
    }
    let payment_status = offer
        .get("payment_status")
        .and_then(|v| v.as_str())
        .unwrap_or("unpaid")
        .trim()
        .to_lowercase();
    if payment_status != "unpaid" && !payment_status.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "cannot_change_assignments_after_payment_started".to_string(),
        ));
    }
    let mut creator_id = payload
        .creator_id
        .as_deref()
        .unwrap_or("")
        .trim()
        .to_string();
    let mut canonical_talent_id = payload
        .talent_id
        .as_deref()
        .unwrap_or("")
        .trim()
        .to_string();

    if creator_id.is_empty() {
        // Legacy/roster flow: resolve by talent_id (agency_users.id or alias id shapes).
        canonical_talent_id = trim_non_empty(&canonical_talent_id, "talent_id")?;
        let talent = resolve_agency_talent(&state, agency_id, &canonical_talent_id).await?;
        canonical_talent_id = talent
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        creator_id = talent
            .get("creator_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if creator_id.is_empty() {
            return Err((
                StatusCode::BAD_REQUEST,
                "This talent must create a creator account before they can be assigned to a contract."
                    .to_string(),
            ));
        }
    } else {
        // Creator-only assignment: ensure relationship exists OR creator is already on roster.
        let rel_resp = state
            .pg
            .from("agency_talent_relationships")
            .select("id,status")
            .eq("agency_id", agency_id)
            .eq("creator_id", &creator_id)
            .limit(1)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if !rel_resp.status().is_success() {
            return Err(sanitize_db_error(
                rel_resp.status().as_u16(),
                rel_resp.text().await.unwrap_or_default(),
            ));
        }
        let rel_text = rel_resp.text().await.unwrap_or_default();
        let rel_rows: Vec<serde_json::Value> = serde_json::from_str(&rel_text).unwrap_or_default();
        let rel_status = rel_rows
            .first()
            .and_then(|r| r.get("status"))
            .and_then(|v| v.as_str())
            .unwrap_or("");
        if rel_rows.is_empty() {
            // Allow direct roster creators even if relationship row is missing.
            let roster_resp = state
                .pg
                .from("agency_users")
                .select("id")
                .eq("agency_id", agency_id)
                .eq("creator_id", &creator_id)
                .limit(1)
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            if !roster_resp.status().is_success() {
                return Err(sanitize_db_error(
                    roster_resp.status().as_u16(),
                    roster_resp.text().await.unwrap_or_default(),
                ));
            }
            let roster_text = roster_resp.text().await.unwrap_or_default();
            let roster_rows: Vec<serde_json::Value> =
                serde_json::from_str(&roster_text).unwrap_or_default();
            if roster_rows.is_empty() {
                return Err((
                    StatusCode::BAD_REQUEST,
                    "creator is not linked to this agency".to_string(),
                ));
            }
        } else if rel_status == "declined" || rel_status == "inactive" {
            return Err((
                StatusCode::BAD_REQUEST,
                "creator is not linked to this agency".to_string(),
            ));
        }
    }
    let insert_payload = json!({
        "offer_id": offer_id,
        "agency_id": agency_id,
        "talent_id": if canonical_talent_id.is_empty() { serde_json::Value::Null } else { json!(canonical_talent_id) },
        "creator_id": creator_id,
        "status": "assigned",
        "assigned_by": user.id,
        "meta": json!({}),
    });
    let resp = state
        .pg
        .from("offer_talent_assignments")
        .upsert(insert_payload.to_string())
        .on_conflict("offer_id,creator_id")
        .select("*")
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !resp.status().is_success() {
        let status_code = resp.status().as_u16();
        let body = resp.text().await.unwrap_or_default();
        // Backward/partial-migration compatibility: if the UNIQUE index backing our ON CONFLICT
        // does not exist yet, Postgres returns 42P10. In that case, fallback to a manual
        // read-then-insert flow.
        if body.contains("42P10")
            || body.contains("no unique or exclusion constraint matching the ON CONFLICT")
        {
            let existing_resp = state
                .pg
                .from("offer_talent_assignments")
                .select("*")
                .eq("offer_id", &offer_id)
                .eq("agency_id", agency_id)
                .eq("creator_id", &creator_id)
                .eq("status", "assigned")
                .limit(1)
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            if existing_resp.status().is_success() {
                let existing_text = existing_resp.text().await.unwrap_or_default();
                let existing_rows: Vec<serde_json::Value> =
                    serde_json::from_str(&existing_text).unwrap_or_default();
                if let Some(row) = existing_rows.first().cloned() {
                    return Ok(Json(json!({ "status": "ok", "assignment": row })));
                }
            }

            let insert_only_resp = state
                .pg
                .from("offer_talent_assignments")
                .insert(insert_payload.to_string())
                .select("*")
                .single()
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            if !insert_only_resp.status().is_success() {
                return Err(sanitize_db_error(
                    insert_only_resp.status().as_u16(),
                    insert_only_resp.text().await.unwrap_or_default(),
                ));
            }
            let row: serde_json::Value =
                serde_json::from_str(&insert_only_resp.text().await.unwrap_or_default())
                    .unwrap_or_default();
            return Ok(Json(json!({ "status": "ok", "assignment": row })));
        }

        return Err(sanitize_db_error(status_code, body));
    }
    let row: serde_json::Value =
        serde_json::from_str(&resp.text().await.unwrap_or_default()).unwrap_or_default();
    Ok(Json(json!({ "status": "ok", "assignment": row })))
}

pub async fn delete_offer_talent_assignment(
    State(state): State<AppState>,
    user: AuthUser,
    Path(OfferAssignmentPath {
        offer_id,
        assignment_id,
    }): Path<OfferAssignmentPath>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let offer = ensure_offer_access(&state, &user, &offer_id).await?;
    let access = team::require_agency_access(&state, &user).await?;
    let agency_id = &access.organization_id;
    let offer_status = offer
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_lowercase();
    if offer_status == "contract_sent" || offer_status == "contract_fully_signed" {
        return Err((
            StatusCode::BAD_REQUEST,
            "cannot_change_assignments_after_contract_sent".to_string(),
        ));
    }
    let payment_status = offer
        .get("payment_status")
        .and_then(|v| v.as_str())
        .unwrap_or("unpaid")
        .trim()
        .to_lowercase();
    if payment_status != "unpaid" && !payment_status.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "cannot_change_assignments_after_payment_started".to_string(),
        ));
    }
    let resp = state
        .pg
        .from("offer_talent_assignments")
        .eq("id", &assignment_id)
        .eq("offer_id", &offer_id)
        .eq("agency_id", agency_id)
        .update(
            json!({
                "status": "removed",
                "updated_at": chrono::Utc::now().to_rfc3339(),
            })
            .to_string(),
        )
        .select("*")
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !resp.status().is_success() {
        return Err(sanitize_db_error(
            resp.status().as_u16(),
            resp.text().await.unwrap_or_default(),
        ));
    }
    let row: serde_json::Value =
        serde_json::from_str(&resp.text().await.unwrap_or_default()).unwrap_or_default();
    Ok(Json(json!({ "status": "ok", "assignment": row })))
}

pub async fn list_offer_asset_requests(
    State(state): State<AppState>,
    user: AuthUser,
    Path(OfferPath { offer_id }): Path<OfferPath>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let _offer = ensure_offer_access(&state, &user, &offer_id).await?;
    let access = team::require_agency_access(&state, &user).await?;
    let agency_id = &access.organization_id;
    let resp = state
        .pg
        .from("offer_asset_requests")
        .select("*, creators(id, full_name, profile_photo_url), agency_users(id, full_legal_name, stage_name, profile_photo_url, creator_id)")
        .eq("offer_id", &offer_id)
        .eq("agency_id", agency_id)
        .order("created_at.desc")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !resp.status().is_success() {
        return Err(sanitize_db_error(
            resp.status().as_u16(),
            resp.text().await.unwrap_or_default(),
        ));
    }
    let rows: Vec<serde_json::Value> =
        serde_json::from_str(&resp.text().await.unwrap_or_default()).unwrap_or_default();
    Ok(Json(json!({ "requests": rows })))
}

pub async fn create_offer_asset_request(
    State(state): State<AppState>,
    user: AuthUser,
    Path(OfferPath { offer_id }): Path<OfferPath>,
    Json(payload): Json<CreateOfferAssetRequestRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let _offer = ensure_offer_access(&state, &user, &offer_id).await?;
    let mut creator_id = payload
        .creator_id
        .as_deref()
        .unwrap_or("")
        .trim()
        .to_string();
    let mut talent_id = payload
        .talent_id
        .as_deref()
        .unwrap_or("")
        .trim()
        .to_string();

    if creator_id.is_empty() {
        talent_id = trim_non_empty(&talent_id, "talent_id")?;
        let talent = resolve_agency_talent(&state, &user.id, &talent_id).await?;
        creator_id = talent
            .get("creator_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if creator_id.is_empty() {
            return Err((
                StatusCode::BAD_REQUEST,
                "This talent must create a creator account before they can be assigned to a contract."
                    .to_string(),
            ));
        }
    }

    let assignment = resolve_offer_assignment_for_creator(&state, &offer_id, &creator_id).await?;
    let insert_payload = json!({
        "offer_id": offer_id,
        "agency_id": user.id,
        "talent_id": if talent_id.is_empty() { serde_json::Value::Null } else { json!(talent_id) },
        "creator_id": creator_id,
        "title": payload.title,
        "message": payload.message,
        "file_url": payload.file_url,
        "status": "sent",
        "created_by": user.id,
        "meta": assignment.get("meta").cloned().unwrap_or_else(|| json!({})),
    });
    let resp = state
        .pg
        .from("offer_asset_requests")
        .insert(insert_payload.to_string())
        .select("*")
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !resp.status().is_success() {
        return Err(sanitize_db_error(
            resp.status().as_u16(),
            resp.text().await.unwrap_or_default(),
        ));
    }
    let row: serde_json::Value =
        serde_json::from_str(&resp.text().await.unwrap_or_default()).unwrap_or_default();
    Ok(Json(json!({ "status": "ok", "request": row })))
}

pub async fn upload_offer_asset_request_file(
    State(state): State<AppState>,
    user: AuthUser,
    Path(OfferPath { offer_id }): Path<OfferPath>,
    headers: HeaderMap,
    body: axum::body::Bytes,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let _offer = ensure_offer_access(&state, &user, &offer_id).await?;
    if body.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "missing file bytes".to_string()));
    }
    const MAX_FILE_SIZE: usize = 25_000_000;
    if body.len() > MAX_FILE_SIZE {
        return Err((
            StatusCode::PAYLOAD_TOO_LARGE,
            "file too large (max 25MB)".to_string(),
        ));
    }
    let content_type = headers
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("application/pdf");
    let ext = if content_type == "application/pdf" {
        "pdf"
    } else {
        "bin"
    };
    let file_name = format!("{}_{}_{}.{}", offer_id, user.id, Uuid::new_v4(), ext);
    let path = format!("offer-asset-requests/{}/{}", user.id, file_name);
    let storage_url = format!(
        "{}/storage/v1/object/{}/{}",
        state.supabase_url, state.supabase_bucket_public, path
    );
    let client = Client::new();
    let upload_resp = client
        .post(&storage_url)
        .header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        )
        .header("apikey", state.supabase_service_key.clone())
        .header("content-type", content_type)
        .body(body)
        .send()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !upload_resp.status().is_success() {
        let err = upload_resp.text().await.unwrap_or_default();
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("failed to upload file: {err}"),
        ));
    }
    let public_url = format!(
        "{}/storage/v1/object/public/{}/{}",
        state.supabase_url, state.supabase_bucket_public, path
    );
    Ok(Json(
        json!({ "status": "ok", "file_url": public_url, "file_name": file_name }),
    ))
}

pub async fn list_creator_asset_requests(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if !is_creator_like(&user.role) {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let creator_id = resolve_effective_creator_id(&state, &user).await;
    let resp = state
        .pg
        .from("offer_asset_requests")
        .select("*, campaign_offers(id,offer_title,brand_campaigns(name),brands(company_name)), agencies(agency_name,logo_url)")
        .eq("creator_id", &creator_id)
        .order("created_at.desc")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !resp.status().is_success() {
        return Err(sanitize_db_error(
            resp.status().as_u16(),
            resp.text().await.unwrap_or_default(),
        ));
    }
    let rows: Vec<serde_json::Value> =
        serde_json::from_str(&resp.text().await.unwrap_or_default()).unwrap_or_default();
    Ok(Json(json!({ "requests": rows })))
}

pub async fn mark_creator_asset_request_viewed(
    State(state): State<AppState>,
    user: AuthUser,
    Path(OfferAssetRequestPath { request_id }): Path<OfferAssetRequestPath>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if !is_creator_like(&user.role) {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let creator_id = resolve_effective_creator_id(&state, &user).await;
    let resp = state
        .pg
        .from("offer_asset_requests")
        .eq("id", &request_id)
        .eq("creator_id", &creator_id)
        .update(
            json!({
                "status": "viewed",
                "updated_at": chrono::Utc::now().to_rfc3339(),
            })
            .to_string(),
        )
        .select("*")
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !resp.status().is_success() {
        return Err(sanitize_db_error(
            resp.status().as_u16(),
            resp.text().await.unwrap_or_default(),
        ));
    }
    let row: serde_json::Value =
        serde_json::from_str(&resp.text().await.unwrap_or_default()).unwrap_or_default();
    Ok(Json(json!({ "status": "ok", "request": row })))
}

pub async fn submit_offer_deliverable(
    State(state): State<AppState>,
    user: AuthUser,
    Path(OfferPath { offer_id }): Path<OfferPath>,
    Json(payload): Json<SubmitDeliverableRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "agency" && !is_creator_like(&user.role) {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let _offer = ensure_offer_access(&state, &user, &offer_id).await?;

    // Payment gate: do not allow campaign deliverables to be submitted until the offer is paid.
    let payment_status = _offer
        .get("payment_status")
        .and_then(|v| v.as_str())
        .unwrap_or("unpaid");
    if payment_status != "paid" {
        return Err((StatusCode::PAYMENT_REQUIRED, "offer_unpaid".to_string()));
    }

    let offer_brand_id = _offer
        .get("brand_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let offer_brand_campaign_id = _offer
        .get("brand_campaign_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    if let Some(payload_brand_id) = payload
        .brand_id
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
    {
        if payload_brand_id != offer_brand_id {
            return Err((
                StatusCode::BAD_REQUEST,
                "brand mismatch for this offer".to_string(),
            ));
        }
    }
    if let Some(payload_campaign_id) = payload
        .brand_campaign_id
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
    {
        if payload_campaign_id != offer_brand_campaign_id {
            return Err((
                StatusCode::BAD_REQUEST,
                "campaign mismatch for this offer".to_string(),
            ));
        }
    }
    let asset_url = trim_non_empty(&payload.asset_url, "asset_url")?;
    let asset_type = payload
        .asset_type
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or("file")
        .to_string();

    let agency_id = if user.role == "agency" {
        let access = team::require_agency_access(&state, &user).await?;
        Some(access.organization_id)
    } else if _offer.get("target_type").and_then(|v| v.as_str()) == Some("agency") {
        _offer
            .get("target_id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
    } else {
        None
    };
    let (talent_id, creator_id) = if user.role == "agency" {
        let agency_id_val = agency_id.clone().unwrap_or_default();
        let payload_creator_id = payload
            .creator_id
            .as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string());

        if let Some(creator_id) = payload_creator_id {
            // Creator-first: validate assignment by creator_id (Option 2).
            let assignment = state
                .pg
                .from("offer_talent_assignments")
                .select("*")
                .eq("offer_id", &offer_id)
                .eq("agency_id", &agency_id_val)
                .eq("creator_id", &creator_id)
                .eq("status", "assigned")
                .limit(1)
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            if !assignment.status().is_success() {
                return Err(sanitize_db_error(
                    assignment.status().as_u16(),
                    assignment.text().await.unwrap_or_default(),
                ));
            }
            let assignment_text = assignment.text().await.unwrap_or_default();
            let assignment_rows: Vec<serde_json::Value> =
                serde_json::from_str(&assignment_text).unwrap_or_default();
            if assignment_rows.is_empty() {
                return Err((
                    StatusCode::BAD_REQUEST,
                    "creator not assigned to this offer".to_string(),
                ));
            }

            // Best-effort: preserve talent_id if the agency provided it and it matches the creator.
            let tid_opt = payload
                .talent_id
                .as_deref()
                .map(str::trim)
                .filter(|s| !s.is_empty());
            let talent_id = if let Some(tid) = tid_opt {
                let talent = resolve_agency_talent(&state, &agency_id_val, tid).await?;
                let canonical_tid = talent
                    .get("id")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim()
                    .to_string();
                let talent_creator_id = talent
                    .get("creator_id")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim()
                    .to_string();
                if !canonical_tid.is_empty() && talent_creator_id == creator_id {
                    Some(canonical_tid)
                } else {
                    None
                }
            } else {
                None
            };

            (talent_id, Some(creator_id))
        } else {
            // Legacy/roster flow: resolve by talent_id.
            let tid = payload
                .talent_id
                .as_deref()
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .ok_or((
                    StatusCode::BAD_REQUEST,
                    "talent_id or creator_id required".to_string(),
                ))?;
            let talent = resolve_agency_talent(&state, &agency_id_val, tid).await?;
            let assignment = state
                .pg
                .from("offer_talent_assignments")
                .select("*")
                .eq("offer_id", &offer_id)
                .eq("agency_id", &agency_id_val)
                .eq("talent_id", tid)
                .eq("status", "assigned")
                .limit(1)
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            if !assignment.status().is_success() {
                return Err(sanitize_db_error(
                    assignment.status().as_u16(),
                    assignment.text().await.unwrap_or_default(),
                ));
            }
            let assignment_text = assignment.text().await.unwrap_or_default();
            let assignment_rows: Vec<serde_json::Value> =
                serde_json::from_str(&assignment_text).unwrap_or_default();
            if assignment_rows.is_empty() {
                return Err((
                    StatusCode::BAD_REQUEST,
                    "talent not assigned to this offer".to_string(),
                ));
            }
            let creator = talent
                .get("creator_id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            (Some(tid.to_string()), creator)
        }
    } else {
        let resolved_creator = resolve_effective_creator_id(&state, &user).await;
        let target_type = _offer
            .get("target_type")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_lowercase();
        let target_id = _offer
            .get("target_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        let has_asset_request = payload
            .asset_request_id
            .as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .is_some();
        let is_direct_creator_offer = target_type == "creator" && target_id == resolved_creator;
        if !has_asset_request && is_direct_creator_offer {
            (None, Some(resolved_creator))
        } else {
            let assignment =
                resolve_offer_assignment_for_creator(&state, &offer_id, &resolved_creator).await?;
            let tid = assignment
                .get("talent_id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            (tid, Some(resolved_creator))
        }
    };

    let insert_payload = json!({
        "offer_id": offer_id,
        "brand_campaign_id": _offer.get("brand_campaign_id").cloned().unwrap_or(serde_json::Value::Null),
        "brand_id": _offer.get("brand_id").cloned().unwrap_or(serde_json::Value::Null),
        "agency_id": agency_id,
        "creator_id": creator_id
            .as_deref()
            .map(|v| json!(v))
            .unwrap_or(serde_json::Value::Null),
        "talent_id": talent_id
            .as_deref()
            .map(|v| json!(v))
            .unwrap_or(serde_json::Value::Null),
        "submitted_by": user.id,
        "submitted_by_role": if user.role == "agency" { "agency" } else { "creator" },
        "asset_request_id": payload
            .asset_request_id
            .as_deref()
            .map(|v| json!(v))
            .unwrap_or(serde_json::Value::Null),
        "asset_url": asset_url,
        "asset_type": asset_type,
        "caption": payload.caption.as_deref().map(str::trim).filter(|s| !s.is_empty()),
        "status": "submitted",
        "meta": payload.meta.unwrap_or_else(|| json!({})),
    });
    let resp = state
        .pg
        .from("campaign_offer_deliverables")
        .insert(insert_payload.to_string())
        .select("*")
        .single()
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
    let row: serde_json::Value = serde_json::from_str(&text).unwrap_or_default();
    // Do not mark asset request fulfilled until agency approves the deliverable.
    let _ = state
        .pg
        .from("campaign_offers")
        .eq("id", &offer_id)
        .update(
            json!({
                "status": "deliverables_submitted",
                "updated_at": chrono::Utc::now().to_rfc3339(),
            })
            .to_string(),
        )
        .execute()
        .await;
    let actor_type = if user.role == "agency" {
        "agency"
    } else {
        "creator"
    };
    let campaign_name = _offer
        .get("brand_campaigns")
        .and_then(|v| v.get("name"))
        .and_then(|v| v.as_str())
        .unwrap_or("campaign");
    let actor_name = if actor_type == "agency" {
        resolve_agency_name(&state, &user.id)
            .await
            .unwrap_or_else(|| "Agency".to_string())
    } else {
        let creator_id = resolve_effective_creator_id(&state, &user).await;
        resolve_creator_name(&state, &creator_id)
            .await
            .unwrap_or_else(|| "Creator".to_string())
    };
    log_activity_event(
        &state,
        &offer_brand_id,
        Some(&offer_brand_campaign_id),
        actor_type,
        &actor_name,
        "deliverable.submitted",
        format!(
            "{} submitted a deliverable for {}.",
            actor_name, campaign_name
        ),
    )
    .await;
    Ok(Json(json!({"status":"ok","deliverable": row})))
}

pub async fn upload_offer_deliverable(
    State(state): State<AppState>,
    user: AuthUser,
    Path(OfferPath { offer_id }): Path<OfferPath>,
    headers: HeaderMap,
    body: axum::body::Bytes,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "agency" && !is_creator_like(&user.role) {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let _offer = ensure_offer_access(&state, &user, &offer_id).await?;

    let payment_status = _offer
        .get("payment_status")
        .and_then(|v| v.as_str())
        .unwrap_or("unpaid");
    if payment_status != "paid" {
        return Err((StatusCode::PAYMENT_REQUIRED, "offer_unpaid".to_string()));
    }

    const MAX_FILE_SIZE: usize = 100_000_000; // 100 MB
    if body.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "missing file bytes".to_string()));
    }
    if body.len() > MAX_FILE_SIZE {
        return Err((
            StatusCode::PAYLOAD_TOO_LARGE,
            "file too large (max 100MB)".to_string(),
        ));
    }

    let content_type = headers
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("application/octet-stream");
    let ext = match content_type {
        "image/png" => "png",
        "image/jpeg" => "jpg",
        "image/webp" => "webp",
        "video/mp4" => "mp4",
        "video/quicktime" => "mov",
        "audio/mpeg" => "mp3",
        "audio/wav" => "wav",
        "application/pdf" => "pdf",
        _ => "bin",
    };

    let file_name = format!("{}_{}_{}.{}", offer_id, user.id, Uuid::new_v4(), ext);
    let path = format!("offer-deliverables/{}/{}", user.id, file_name);
    let storage_url = format!(
        "{}/storage/v1/object/{}/{}",
        state.supabase_url, state.supabase_bucket_public, path
    );

    let client = Client::new();
    let upload_resp = client
        .post(&storage_url)
        .header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        )
        .header("apikey", state.supabase_service_key.clone())
        .header("content-type", content_type)
        .body(body)
        .send()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !upload_resp.status().is_success() {
        let err = upload_resp.text().await.unwrap_or_default();
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("failed to upload deliverable: {err}"),
        ));
    }

    let public_url = format!(
        "{}/storage/v1/object/public/{}/{}",
        state.supabase_url, state.supabase_bucket_public, path
    );
    Ok(Json(json!({
        "status": "ok",
        "public_url": public_url,
        "file_name": file_name,
        "content_type": content_type,
    })))
}

pub async fn upload_campaign_contract_template(
    State(state): State<AppState>,
    user: AuthUser,
    headers: HeaderMap,
    body: axum::body::Bytes,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    use base64::{engine::general_purpose, Engine as _};

    if user.role != "brand" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    if state.docuseal_api_key.trim().is_empty() {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            "docuseal_api_key_not_configured".to_string(),
        ));
    }
    if body.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "missing file bytes".to_string()));
    }
    const MAX_FILE_SIZE: usize = 25_000_000; // 25 MB
    if body.len() > MAX_FILE_SIZE {
        return Err((
            StatusCode::PAYLOAD_TOO_LARGE,
            "file too large (max 25MB)".to_string(),
        ));
    }

    let content_type = headers
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    if content_type != "application/pdf" {
        return Err((StatusCode::BAD_REQUEST, "PDF file required".to_string()));
    }

    let file_name = headers
        .get("x-file-name")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .unwrap_or("Campaign Contract.pdf")
        .to_string();

    let base64_content = format!(
        "data:application/pdf;base64,{}",
        general_purpose::STANDARD.encode(&body)
    );
    let docuseal_client = DocuSealClient::new(
        state.docuseal_api_key.clone(),
        state.docuseal_api_url.clone(),
    );
    let template = docuseal_client
        .create_template(file_name.clone(), file_name.clone(), base64_content)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(json!({
        "status": "ok",
        "docuseal_template_id": template.id,
        "template_name": template.name,
        "template_slug": template.slug,
    })))
}

pub async fn handle_campaign_contract_webhook(
    State(state): State<AppState>,
    Json(payload): Json<DocuSealWebhookEvent>,
) -> Result<StatusCode, (StatusCode, String)> {
    let submission_id = payload
        .data
        .get("submission_id")
        .and_then(|v| v.as_i64())
        .or_else(|| payload.data.get("id").and_then(|v| v.as_i64()))
        .ok_or((StatusCode::BAD_REQUEST, "missing submission id".to_string()))?;

    let list_resp = state
        .pg
        .from("campaign_offer_contracts")
        .select("id,offer_id,meta,target_type")
        .eq("docuseal_submission_id", submission_id.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let list_status = list_resp.status();
    let list_text = list_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !list_status.is_success() {
        return Err(sanitize_db_error(list_status.as_u16(), list_text));
    }
    let contracts: Vec<serde_json::Value> = serde_json::from_str(&list_text).unwrap_or_default();
    if contracts.is_empty() {
        return Ok(StatusCode::OK);
    }

    let submitters = payload
        .data
        .get("submitters")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    let first_submitter = submitters.iter().find(|s| {
        s.get("role")
            .and_then(|v| v.as_str())
            .map(|r| docuseal_role_key(r) == "firstparty")
            .unwrap_or(false)
    });
    let second_submitter = submitters.iter().find(|s| {
        s.get("role")
            .and_then(|v| v.as_str())
            .map(|r| docuseal_role_key(r) == "secondparty")
            .unwrap_or(false)
    });
    let first_status = first_submitter
        .and_then(|s| s.get("status"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_lowercase();
    let second_status = second_submitter
        .and_then(|s| s.get("status"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_lowercase();
    let any_opened = submitters.iter().any(|s| {
        let st = s
            .get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_lowercase();
        st == "opened" || st == "viewed"
    });
    let any_declined = submitters.iter().any(|s| {
        let st = s
            .get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_lowercase();
        st == "declined" || st == "rejected"
    });
    let fallback_event_status = match payload.event_type.as_str() {
        "submission.completed" | "form.completed" => "signed",
        "submission.declined" | "form.declined" => "declined",
        "submission.started" | "submission.opened" | "submission.viewed" | "form.started"
        | "form.viewed" => "opened",
        _ => "sent",
    };
    let first_slug = first_submitter
        .and_then(|s| s.get("slug"))
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let second_slug = second_submitter
        .and_then(|s| s.get("slug"))
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let first_signing_url = if first_slug.is_empty() {
        None
    } else {
        Some(format!(
            "{}/s/{}",
            state.docuseal_app_url.trim_end_matches('/'),
            first_slug
        ))
    };
    let second_signing_url = if second_slug.is_empty() {
        None
    } else {
        Some(format!(
            "{}/s/{}",
            state.docuseal_app_url.trim_end_matches('/'),
            second_slug
        ))
    };
    let signed_doc_url = payload
        .data
        .get("documents")
        .and_then(|v| v.as_array())
        .and_then(|docs| docs.first())
        .and_then(|d| d.get("url"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    for contract in contracts {
        let contract_id = contract
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let offer_id = contract
            .get("offer_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        if contract_id.is_empty() || offer_id.is_empty() {
            continue;
        }
        let mut merged_meta = contract
            .get("meta")
            .and_then(|v| v.as_object().cloned())
            .unwrap_or_default();
        let target_type = contract
            .get("target_type")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        merged_meta.insert(
            "submitter_statuses".to_string(),
            json!(submitters
                .iter()
                .map(|s| json!({
                    "role": s.get("role").cloned().unwrap_or(serde_json::Value::Null),
                    "email": s.get("email").cloned().unwrap_or(serde_json::Value::Null),
                    "status": s.get("status").cloned().unwrap_or(serde_json::Value::Null),
                    "slug": s.get("slug").cloned().unwrap_or(serde_json::Value::Null),
                }))
                .collect::<Vec<_>>()),
        );
        let (brand_status, creator_status, agency_status) = if target_type == "agency" {
            (second_status.clone(), String::new(), first_status.clone())
        } else {
            (first_status.clone(), second_status.clone(), String::new())
        };
        let brand_is_signed = is_submitter_signed(&brand_status);
        let creator_is_signed = is_submitter_signed(&creator_status);
        let agency_is_signed = is_submitter_signed(&agency_status);
        let both_signed = if target_type == "agency" {
            agency_is_signed && brand_is_signed
        } else {
            brand_is_signed && creator_is_signed
        };
        let derived_status = if any_declined {
            "declined"
        } else if both_signed {
            "completed"
        } else if target_type == "agency" {
            if agency_is_signed {
                if any_opened || brand_is_signed {
                    "opened"
                } else {
                    "sent"
                }
            } else {
                "agency_pending"
            }
        } else if any_opened || brand_is_signed {
            "opened"
        } else {
            fallback_event_status
        };

        if target_type == "agency" {
            merged_meta.insert("agency_submitter_status".to_string(), json!(agency_status));
            merged_meta.insert("brand_submitter_status".to_string(), json!(brand_status));
            if let Some(url) = &second_signing_url {
                merged_meta.insert("brand_signing_url".to_string(), json!(url));
            }
            if let Some(url) = &first_signing_url {
                merged_meta.insert("agency_signing_url".to_string(), json!(url));
                merged_meta.insert("docuseal_signing_url".to_string(), json!(url));
            }
        } else {
            merged_meta.insert("brand_submitter_status".to_string(), json!(brand_status));
            merged_meta.insert(
                "creator_submitter_status".to_string(),
                json!(creator_status),
            );
            if let Some(url) = &first_signing_url {
                merged_meta.insert("brand_signing_url".to_string(), json!(url));
            }
            if let Some(url) = &second_signing_url {
                merged_meta.insert("creator_signing_url".to_string(), json!(url));
                merged_meta.insert("docuseal_signing_url".to_string(), json!(url));
            }
        }
        if let Some(url) = &signed_doc_url {
            merged_meta.insert("docuseal_document_url".to_string(), json!(url));
        }
        merged_meta.insert(
            "docuseal_submission_status".to_string(),
            json!(payload
                .data
                .get("status")
                .and_then(|v| v.as_str())
                .unwrap_or("")),
        );

        let _ = state
            .pg
            .from("campaign_offer_contracts")
            .eq("id", &contract_id)
            .eq("offer_id", &offer_id)
            .update(
                json!({
                    "docuseal_status": derived_status,
                    "meta": serde_json::Value::Object(merged_meta),
                    "last_synced_at": chrono::Utc::now().to_rfc3339(),
                    "updated_at": chrono::Utc::now().to_rfc3339(),
                })
                .to_string(),
            )
            .execute()
            .await;

        // Only consider an offer "fully signed" when BOTH parties have signed.
        let mapped_offer_status = match derived_status {
            "completed" => Some("contract_fully_signed"),
            "opened" => Some("contract_partially_signed"),
            "sent" | "agency_pending" => Some("contract_sent"),
            "declined" => Some("changes_requested"),
            _ => None,
        };
        if let Some(status_value) = mapped_offer_status {
            let _ = state
                .pg
                .from("campaign_offers")
                .eq("id", &offer_id)
                .update(
                    json!({
                        "status": status_value,
                        "updated_at": chrono::Utc::now().to_rfc3339(),
                    })
                    .to_string(),
                )
                .execute()
                .await;
        }
    }

    Ok(StatusCode::OK)
}

pub async fn list_offer_deliverables(
    State(state): State<AppState>,
    user: AuthUser,
    Path(OfferPath { offer_id }): Path<OfferPath>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let _offer = ensure_offer_access(&state, &user, &offer_id).await?;
    let resp = state
        .pg
        .from("campaign_offer_deliverables")
        .select("*")
        .eq("offer_id", &offer_id)
        .order("created_at.desc")
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
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    Ok(Json(json!({"deliverables": rows})))
}

pub async fn upload_offer_deliverable_form(
    State(state): State<AppState>,
    user: AuthUser,
    Path(OfferPath { offer_id }): Path<OfferPath>,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "agency" && !is_creator_like(&user.role) {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let _offer = ensure_offer_access(&state, &user, &offer_id).await?;

    let payment_status = _offer
        .get("payment_status")
        .and_then(|v| v.as_str())
        .unwrap_or("unpaid");
    if payment_status != "paid" {
        return Err((StatusCode::PAYMENT_REQUIRED, "offer_unpaid".to_string()));
    }

    let mut file_name = None;
    let mut bytes: Vec<u8> = vec![];
    let mut asset_type = "file".to_string();
    let mut caption = None;
    let mut talent_id: Option<String> = None;
    let mut creator_id_field: Option<String> = None;
    let mut asset_request_id: Option<String> = None;
    let mut desired_status: Option<String> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?
    {
        match field.name() {
            Some("file") => {
                file_name = field.file_name().map(|s| s.to_string());
                if let Some(ct) = field.content_type() {
                    if ct.starts_with("image/") {
                        asset_type = "image".to_string();
                    } else if ct.starts_with("video/") {
                        asset_type = "video".to_string();
                    }
                }
                bytes = field
                    .bytes()
                    .await
                    .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?
                    .to_vec();
            }
            Some("caption") => {
                caption = Some(
                    field
                        .text()
                        .await
                        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?,
                );
            }
            Some("talent_id") => {
                talent_id = Some(
                    field
                        .text()
                        .await
                        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?,
                );
            }
            Some("creator_id") => {
                creator_id_field = Some(
                    field
                        .text()
                        .await
                        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?,
                );
            }
            Some("asset_request_id") => {
                asset_request_id = Some(
                    field
                        .text()
                        .await
                        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?,
                );
            }
            Some("status") => {
                desired_status = Some(
                    field
                        .text()
                        .await
                        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?,
                );
            }
            _ => {}
        }
    }

    if bytes.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "missing file".into()));
    }

    let fname = file_name.unwrap_or_else(|| "deliverable.bin".to_string());
    let sanitized = fname
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '.' || c == '_' || c == '-' {
                c
            } else {
                '_'
            }
        })
        .collect::<String>();

    let bucket = state.supabase_bucket_private.clone();
    let path = format!(
        "campaigns/deliverables/{}/{}_{}",
        offer_id,
        chrono::Utc::now().timestamp_millis(),
        sanitized
    );

    let storage_url = format!(
        "{}/storage/v1/object/{}/{}",
        state.supabase_url, bucket, path
    );
    let http = reqwest::Client::new();
    let up = http
        .post(&storage_url)
        .header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        )
        .header("apikey", state.supabase_service_key.clone())
        .body(bytes)
        .send()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    if !up.status().is_success() {
        let msg = up.text().await.unwrap_or_default();
        return Err((
            StatusCode::BAD_GATEWAY,
            format!("storage upload failed: {msg}"),
        ));
    }

    let agency_id = if user.role == "agency" {
        let access = team::require_agency_access(&state, &user).await?;
        Some(access.organization_id)
    } else if _offer.get("target_type").and_then(|v| v.as_str()) == Some("agency") {
        _offer
            .get("target_id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
    } else {
        None
    };
    let (resolved_talent_id, resolved_creator_id) = if user.role == "agency" {
        let agency_id_val = agency_id.clone().unwrap_or_default();
        let cid_opt = creator_id_field
            .as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string());

        if let Some(creator_id) = cid_opt {
            let assignment = state
                .pg
                .from("offer_talent_assignments")
                .select("*")
                .eq("offer_id", &offer_id)
                .eq("agency_id", &agency_id_val)
                .eq("creator_id", &creator_id)
                .eq("status", "assigned")
                .limit(1)
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            if !assignment.status().is_success() {
                return Err(sanitize_db_error(
                    assignment.status().as_u16(),
                    assignment.text().await.unwrap_or_default(),
                ));
            }
            let assignment_text = assignment.text().await.unwrap_or_default();
            let assignment_rows: Vec<serde_json::Value> =
                serde_json::from_str(&assignment_text).unwrap_or_default();
            if assignment_rows.is_empty() {
                return Err((
                    StatusCode::BAD_REQUEST,
                    "creator not assigned to this offer".to_string(),
                ));
            }

            // Best-effort: preserve talent_id if supplied and it matches the creator.
            let tid_opt = talent_id
                .as_deref()
                .map(str::trim)
                .filter(|s| !s.is_empty());
            let talent_id = if let Some(tid) = tid_opt {
                let talent = resolve_agency_talent(&state, &agency_id_val, tid).await?;
                let canonical_tid = talent
                    .get("id")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim()
                    .to_string();
                let talent_creator_id = talent
                    .get("creator_id")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim()
                    .to_string();
                if !canonical_tid.is_empty() && talent_creator_id == creator_id {
                    Some(canonical_tid)
                } else {
                    None
                }
            } else {
                None
            };

            (talent_id, Some(creator_id))
        } else {
            let tid = talent_id
                .as_deref()
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .ok_or((
                    StatusCode::BAD_REQUEST,
                    "talent_id or creator_id required".to_string(),
                ))?;
            let talent = resolve_agency_talent(&state, &agency_id_val, tid).await?;
            let assignment = state
                .pg
                .from("offer_talent_assignments")
                .select("*")
                .eq("offer_id", &offer_id)
                .eq("agency_id", &agency_id_val)
                .eq("talent_id", tid)
                .eq("status", "assigned")
                .limit(1)
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            if !assignment.status().is_success() {
                return Err(sanitize_db_error(
                    assignment.status().as_u16(),
                    assignment.text().await.unwrap_or_default(),
                ));
            }
            let assignment_text = assignment.text().await.unwrap_or_default();
            let assignment_rows: Vec<serde_json::Value> =
                serde_json::from_str(&assignment_text).unwrap_or_default();
            if assignment_rows.is_empty() {
                return Err((
                    StatusCode::BAD_REQUEST,
                    "talent not assigned to this offer".to_string(),
                ));
            }
            let creator = talent
                .get("creator_id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            (Some(tid.to_string()), creator)
        }
    } else {
        let resolved_creator = resolve_effective_creator_id(&state, &user).await;
        let target_type = _offer
            .get("target_type")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_lowercase();
        let target_id = _offer
            .get("target_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        let has_asset_request = asset_request_id
            .as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .is_some();
        let is_direct_creator_offer = target_type == "creator" && target_id == resolved_creator;
        if !has_asset_request && is_direct_creator_offer {
            (None, Some(resolved_creator))
        } else {
            let assignment =
                resolve_offer_assignment_for_creator(&state, &offer_id, &resolved_creator).await?;
            let tid = assignment
                .get("talent_id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            (tid, Some(resolved_creator))
        }
    };
    let status_value = desired_status
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or(if user.role == "agency" {
            "draft"
        } else {
            "submitted"
        });

    // Now insert the deliverable record
    let insert_payload = json!({
        "offer_id": offer_id,
        "brand_campaign_id": _offer.get("brand_campaign_id").cloned().unwrap_or(serde_json::Value::Null),
        "brand_id": _offer.get("brand_id").cloned().unwrap_or(serde_json::Value::Null),
        "agency_id": agency_id,
        "creator_id": resolved_creator_id
            .as_deref()
            .map(|v| json!(v))
            .unwrap_or(serde_json::Value::Null),
        "talent_id": resolved_talent_id
            .as_deref()
            .map(|v| json!(v))
            .unwrap_or(serde_json::Value::Null),
        "submitted_by": user.id,
        "submitted_by_role": if user.role == "agency" { "agency" } else { "creator" },
        "asset_request_id": asset_request_id
            .as_deref()
            .map(|v| json!(v))
            .unwrap_or(serde_json::Value::Null),
        "asset_url": path, // Storing path relative to bucket
        "asset_type": asset_type,
        "caption": caption.as_deref().map(str::trim).filter(|s| !s.is_empty()),
        "status": status_value,
        "meta": json!({
            "original_filename": fname,
            "bucket": bucket,
        }),
    });

    let resp = state
        .pg
        .from("campaign_offer_deliverables")
        .insert(insert_payload.to_string())
        .select("*")
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        return Err(sanitize_db_error(
            resp.status().as_u16(),
            resp.text().await.unwrap_or_default(),
        ));
    }

    if status_value == "submitted" {
        let _ = state
            .pg
            .from("campaign_offers")
            .eq("id", &offer_id)
            .update(
                json!({
                    "status": "deliverables_submitted",
                    "updated_at": chrono::Utc::now().to_rfc3339(),
                })
                .to_string(),
            )
            .execute()
            .await;
    }

    let row: serde_json::Value =
        serde_json::from_str(&resp.text().await.unwrap_or_default()).unwrap_or_default();
    Ok(Json(json!({"status":"ok","deliverable": row})))
}

pub async fn submit_draft_deliverables(
    State(state): State<AppState>,
    user: AuthUser,
    Path(OfferPath { offer_id }): Path<OfferPath>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "agency" && !is_creator_like(&user.role) {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let _offer = ensure_offer_access(&state, &user, &offer_id).await?;

    let payment_status = _offer
        .get("payment_status")
        .and_then(|v| v.as_str())
        .unwrap_or("unpaid");
    if payment_status != "paid" {
        return Err((StatusCode::PAYMENT_REQUIRED, "offer_unpaid".to_string()));
    }

    let resp = state
        .pg
        .from("campaign_offer_deliverables")
        .eq("status", "draft")
        .eq("offer_id", &offer_id)
        .update(json!({ "status": "submitted" }).to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        return Err(sanitize_db_error(
            resp.status().as_u16(),
            resp.text().await.unwrap_or_default(),
        ));
    }

    // Update offer status
    let _ = state
        .pg
        .from("campaign_offers")
        .eq("id", &offer_id)
        .update(
            json!({
                "status": "deliverables_submitted",
                "updated_at": chrono::Utc::now().to_rfc3339(),
            })
            .to_string(),
        )
        .execute()
        .await;

    Ok(Json(json!({"status":"ok"})))
}

pub async fn delete_offer_deliverable(
    State(state): State<AppState>,
    user: AuthUser,
    Path(OfferDeliverablePath {
        offer_id,
        deliverable_id,
    }): Path<OfferDeliverablePath>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "agency" && !is_creator_like(&user.role) {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let _offer = ensure_offer_access(&state, &user, &offer_id).await?;

    // Check if it's draft or rejected and if the user owns it (if creator)
    let del_resp = state
        .pg
        .from("campaign_offer_deliverables")
        .eq("id", &deliverable_id)
        .eq("offer_id", &offer_id)
        .select("*")
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !del_resp.status().is_success() {
        return Err((StatusCode::NOT_FOUND, "Deliverable not found".to_string()));
    }

    let del: serde_json::Value =
        serde_json::from_str(&del_resp.text().await.unwrap_or_default()).unwrap_or_default();
    let status = del.get("status").and_then(|s| s.as_str()).unwrap_or("");

    if status != "draft" && status != "rejected" && status != "changes_requested" {
        return Err((
            StatusCode::BAD_REQUEST,
            "Only drafts or rejected deliverables can be deleted".to_string(),
        ));
    }

    // Actually delete
    let resp = state
        .pg
        .from("campaign_offer_deliverables")
        .eq("id", &deliverable_id)
        .delete()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let status = resp.status().as_u16();
        let msg = resp.text().await.unwrap_or_default();
        return Err(sanitize_db_error(status, msg));
    }

    Ok(Json(json!({"status": "ok"})))
}

pub async fn serve_offer_deliverable(
    State(state): State<AppState>,
    user: AuthUser,
    Path(OfferDeliverablePath {
        offer_id,
        deliverable_id,
    }): Path<OfferDeliverablePath>,
    Query(query): Query<OfferDeliverableFileQuery>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let _offer = ensure_offer_access(&state, &user, &offer_id).await?;

    // NOTE: This endpoint is used for in-app previews via <img>/<video>.
    // Do NOT gate media previews on "all deliverables submitted/approved" or the UI can't show thumbnails.
    // Download-gating (if desired) should be implemented via a dedicated download endpoint or explicit flag.

    // Get the deliverable record
    let del_resp = state
        .pg
        .from("campaign_offer_deliverables")
        .eq("id", &deliverable_id)
        .eq("offer_id", &offer_id)
        .select("*")
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !del_resp.status().is_success() {
        return Err((StatusCode::NOT_FOUND, "Deliverable not found".to_string()));
    }

    let del: serde_json::Value =
        serde_json::from_str(&del_resp.text().await.unwrap_or_default()).unwrap_or_default();
    let path = del.get("asset_url").and_then(|v| v.as_str()).unwrap_or("");
    let asset_type = del
        .get("asset_type")
        .and_then(|v| v.as_str())
        .unwrap_or("image");
    let deliverable_status = del
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_lowercase();

    if path.is_empty() {
        return Err((StatusCode::NOT_FOUND, "Asset path is empty".to_string()));
    }

    let is_download = query
        .download
        .as_deref()
        .map(|v| v.trim().to_lowercase())
        .map(|v| matches!(v.as_str(), "1" | "true" | "t" | "yes" | "y" | "on"))
        .unwrap_or(false);
    if is_download && user.role == "brand" {
        let approved = deliverable_status == "brand_approved"
            || deliverable_status == "approved"
            || deliverable_status == "accepted";
        if !approved {
            return Err((
                StatusCode::FORBIDDEN,
                "deliverable_not_approved_for_download".to_string(),
            ));
        }
    }

    let bucket = state.supabase_bucket_private.clone();
    let storage_url = format!(
        "{}/storage/v1/object/{}/{}",
        state.supabase_url, bucket, path
    );

    let http = reqwest::Client::new();
    let up = http
        .get(&storage_url)
        .header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        )
        .header("apikey", state.supabase_service_key.clone())
        .send()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    if !up.status().is_success() {
        return Err((
            StatusCode::BAD_GATEWAY,
            "failed to fetch from storage".to_string(),
        ));
    }

    let content_type = up
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or(if asset_type == "video" {
            "video/mp4"
        } else {
            "image/jpeg"
        })
        .to_string();

    let bytes = up
        .bytes()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut resp = Response::new(Body::from(bytes));
    resp.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_str(&content_type)
            .unwrap_or_else(|_| HeaderValue::from_static("application/octet-stream")),
    );

    if is_download {
        let filename = del
            .get("meta")
            .and_then(|m| m.get("original_name"))
            .and_then(|v| v.as_str())
            .or_else(|| del.get("caption").and_then(|v| v.as_str()))
            .unwrap_or("deliverable");
        let filename = filename.trim().replace(['\r', '\n'], " ").replace('"', "'");
        let content_disposition = format!("attachment; filename=\"{filename}\"");
        if let Ok(v) = HeaderValue::from_str(&content_disposition) {
            resp.headers_mut().insert(header::CONTENT_DISPOSITION, v);
        }
    }

    Ok(resp)
}

pub async fn review_offer_deliverable(
    State(state): State<AppState>,
    user: AuthUser,
    Path(OfferDeliverablePath {
        offer_id,
        deliverable_id,
    }): Path<OfferDeliverablePath>,
    Json(payload): Json<ReviewDeliverableRequest>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    let actor_org_id = if user.role == "brand" {
        team::require_brand_permission(&state, &user, Permission::ApproveDeliverables)
            .await?
            .organization_id
    } else if user.role == "agency" {
        team::require_agency_permission(&state, &user, Permission::ApproveDeliverables)
            .await?
            .organization_id
    } else {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    };
    let _offer = ensure_offer_access(&state, &user, &offer_id).await?;
    let action = payload.action.trim().to_lowercase();
    let now = chrono::Utc::now().to_rfc3339();

    let current_resp = state
        .pg
        .from("campaign_offer_deliverables")
        .select("status")
        .eq("id", &deliverable_id)
        .eq("offer_id", &offer_id)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !current_resp.status().is_success() {
        return Err(sanitize_db_error(
            current_resp.status().as_u16(),
            current_resp.text().await.unwrap_or_default(),
        ));
    }
    let current_text = current_resp.text().await.unwrap_or_default();
    let current_row: serde_json::Value = serde_json::from_str(&current_text).unwrap_or_default();
    let current_status = current_row
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_lowercase();

    if user.role == "brand"
        && (current_status == "brand_approved" || current_status == "approved")
        && (action == "changes_requested" || action == "reject")
    {
        return Err((
            StatusCode::BAD_REQUEST,
            "cannot_disapprove_after_approval".to_string(),
        ));
    }

    let (status_value, offer_status) = if user.role == "agency" {
        match action.as_str() {
            "approve" => ("brand_review", "in_review"),
            "final_approve" => {
                if current_status != "brand_approved" {
                    return Err((
                        StatusCode::BAD_REQUEST,
                        "deliverable must be brand_approved before final approval".to_string(),
                    ));
                }
                ("approved", "approved")
            }
            "changes_requested" => ("changes_requested", "changes_requested"),
            "reject" => ("rejected", "changes_requested"),
            _ => return Err((StatusCode::BAD_REQUEST, "invalid action".to_string())),
        }
    } else {
        match action.as_str() {
            "approve" => ("brand_approved", "approved"),
            "changes_requested" => ("changes_requested", "changes_requested"),
            "reject" => ("rejected", "changes_requested"),
            _ => return Err((StatusCode::BAD_REQUEST, "invalid action".to_string())),
        }
    };

    let mut update = serde_json::Map::new();
    update.insert("status".to_string(), json!(status_value));
    update.insert("updated_at".to_string(), json!(now.clone()));
    if user.role == "agency" {
        update.insert("reviewed_by_agency_at".to_string(), json!(now.clone()));
        if let Some(note) = payload
            .note
            .as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty())
        {
            update.insert("agency_review_note".to_string(), json!(note));
        }
    } else {
        update.insert("reviewed_by_brand_at".to_string(), json!(now.clone()));
        if let Some(note) = payload
            .note
            .as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty())
        {
            update.insert("brand_review_note".to_string(), json!(note));
        }
    }

    let resp = state
        .pg
        .from("campaign_offer_deliverables")
        .eq("id", &deliverable_id)
        .eq("offer_id", &offer_id)
        .update(serde_json::Value::Object(update).to_string())
        .select("*")
        .single()
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
    let row: serde_json::Value = serde_json::from_str(&text).unwrap_or_default();

    let _ = state
        .pg
        .from("campaign_offers")
        .eq("id", &offer_id)
        .update(
            json!({
                "status": offer_status,
                "updated_at": chrono::Utc::now().to_rfc3339(),
            })
            .to_string(),
        )
        .execute()
        .await;

    let brand_id_value = if user.role == "brand" {
        actor_org_id.as_str()
    } else {
        _offer
            .get("brand_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
    };
    let brand_name = resolve_brand_name(&state, brand_id_value)
        .await
        .unwrap_or_else(|| "Brand".to_string());
    let actor_label = if user.role == "brand" {
        brand_name.clone()
    } else {
        resolve_agency_name(&state, &actor_org_id)
            .await
            .unwrap_or_else(|| "Agency".to_string())
    };
    let event_type = if status_value == "changes_requested" {
        "deliverable.changes_requested"
    } else {
        "deliverable.approved"
    };
    let target_name = resolve_offer_target_name(&state, &_offer)
        .await
        .unwrap_or_else(|| {
            if _offer
                .get("target_type")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .eq_ignore_ascii_case("agency")
            {
                "Agency".to_string()
            } else {
                "Creator".to_string()
            }
        });
    let action_text = if status_value == "changes_requested" {
        "requested edits on"
    } else {
        "approved"
    };
    let description = if user.role == "brand" {
        format!(
            "{} {} a deliverable from {}.",
            actor_label, action_text, target_name
        )
    } else {
        format!(
            "{} {} a deliverable for {}.",
            actor_label, action_text, brand_name
        )
    };
    log_activity_event(
        &state,
        brand_id_value,
        _offer.get("brand_campaign_id").and_then(|v| v.as_str()),
        if user.role == "brand" {
            "brand"
        } else {
            "agency"
        },
        &actor_label,
        event_type,
        description,
    )
    .await;

    // Sync back to booking_deliverables if this was linked
    if let Some(source_id) = row
        .get("meta")
        .and_then(|m| m.get("source_booking_deliverable_id"))
        .and_then(|v| v.as_str())
    {
        let mut b_update = serde_json::Map::new();
        if user.role == "brand" {
            b_update.insert("brand_status".to_string(), json!(status_value));
            b_update.insert("reviewed_by_brand_at".to_string(), json!(now.clone()));
            if let Some(note) = payload
                .note
                .as_deref()
                .map(str::trim)
                .filter(|s| !s.is_empty())
            {
                b_update.insert("brand_review_note".to_string(), json!(note));
            }
            // Also update status if it's a request for changes
            if status_value == "changes_requested" {
                b_update.insert("status".to_string(), json!("changes_requested"));
            }
        }

        if !b_update.is_empty() {
            let _ = state
                .pg
                .from("booking_deliverables")
                .eq("id", source_id)
                .update(serde_json::Value::Object(b_update).to_string())
                .execute()
                .await;
        }
    }

    if user.role == "brand" && action == "approve" {
        let outcome = try_release_campaign_offer_escrow(&state, &offer_id)
            .await
            .unwrap_or(EscrowReleaseOutcome {
                payment_status: "unknown".to_string(),
                escrow_status: "unknown".to_string(),
                released_now: false,
            });

        return Ok(Json(
            json!({"status":"ok","deliverable": row, "escrow": outcome}),
        ));
    }

    Ok(Json(json!({"status":"ok","deliverable": row})))
}

async fn try_release_campaign_offer_escrow(
    state: &AppState,
    offer_id: &str,
) -> Result<EscrowReleaseOutcome, String> {
    let offer_resp = state
        .pg
        .from("campaign_offers")
        .select("id,target_type,target_id,payment_status,billing_request_id,escrow_status,brief_snapshot,budget_snapshot")
        .eq("id", offer_id)
        .single()
        .execute()
        .await
        .map_err(|e| e.to_string())?;
    if !offer_resp.status().is_success() {
        return Ok(EscrowReleaseOutcome {
            payment_status: "unknown".to_string(),
            escrow_status: "unknown".to_string(),
            released_now: false,
        });
    }
    let offer_text = offer_resp.text().await.map_err(|e| e.to_string())?;
    let offer: serde_json::Value = serde_json::from_str(&offer_text).unwrap_or_default();

    let escrow_status = offer
        .get("escrow_status")
        .and_then(|v| v.as_str())
        .unwrap_or("holding");

    let target_type = offer
        .get("target_type")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let payment_status = offer
        .get("payment_status")
        .and_then(|v| v.as_str())
        .unwrap_or("unpaid");

    // Escrow release applies to both agency-collaborated offers and independent creator offers.
    if target_type != "agency" && target_type != "creator" {
        return Ok(EscrowReleaseOutcome {
            payment_status: payment_status.to_string(),
            escrow_status: escrow_status.to_string(),
            released_now: false,
        });
    }

    if payment_status != "paid" {
        return Ok(EscrowReleaseOutcome {
            payment_status: payment_status.to_string(),
            escrow_status: escrow_status.to_string(),
            released_now: false,
        });
    }

    // Guard against already-released or in-progress releasing state
    if escrow_status == "released" || escrow_status == "releasing" {
        return Ok(EscrowReleaseOutcome {
            payment_status: payment_status.to_string(),
            escrow_status: escrow_status.to_string(),
            released_now: false,
        });
    }

    // NEW RULE (testing): release escrow once the brand approves at least 1 deliverable.
    // This decouples escrow release from the expected deliverables count, which may change over time.
    let any_approved_resp = state
        .pg
        .from("campaign_offer_deliverables")
        .select("id")
        .eq("offer_id", offer_id)
        .in_(
            "status",
            vec!["brand_approved".to_string(), "approved".to_string()],
        )
        .limit(1)
        .execute()
        .await
        .map_err(|e| e.to_string())?;
    if !any_approved_resp.status().is_success() {
        return Ok(EscrowReleaseOutcome {
            payment_status: payment_status.to_string(),
            escrow_status: escrow_status.to_string(),
            released_now: false,
        });
    }
    let any_text = any_approved_resp.text().await.map_err(|e| e.to_string())?;
    let any_rows: Vec<serde_json::Value> = serde_json::from_str(&any_text).unwrap_or_default();
    if any_rows.is_empty() {
        return Ok(EscrowReleaseOutcome {
            payment_status: payment_status.to_string(),
            escrow_status: escrow_status.to_string(),
            released_now: false,
        });
    }

    // Independent creator offers do not use licensing_requests/licensing_payouts.
    // We transfer the creator payout directly from the platform balance using budget_snapshot.
    if target_type == "creator" {
        let creator_id = offer
            .get("target_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if creator_id.is_empty() {
            return Ok(EscrowReleaseOutcome {
                payment_status: payment_status.to_string(),
                escrow_status: escrow_status.to_string(),
                released_now: false,
            });
        }

        let budget_snapshot = offer
            .get("budget_snapshot")
            .and_then(|v| v.as_object())
            .cloned()
            .unwrap_or_default();
        let net_str = budget_snapshot
            .get("budget_creator_payment")
            .and_then(|v| v.as_str())
            .unwrap_or("0")
            .replace(",", "");
        let net_amount: f64 = net_str.parse().unwrap_or(0.0);
        let net_amount_cents = (net_amount * 100.0).round() as i64;
        if net_amount_cents <= 0 {
            return Ok(EscrowReleaseOutcome {
                payment_status: payment_status.to_string(),
                escrow_status: escrow_status.to_string(),
                released_now: false,
            });
        }

        // Atomically claim the escrow release (holding -> releasing) before triggering transfers.
        let claim_resp = state
            .pg
            .from("campaign_offers")
            .update(json!({"escrow_status": "releasing"}).to_string())
            .eq("id", offer_id)
            .eq("escrow_status", "holding")
            .select("id")
            .execute()
            .await;

        let claim_text = match claim_resp {
            Ok(resp) if resp.status().is_success() => {
                resp.text().await.unwrap_or_else(|_| "[]".into())
            }
            Ok(resp) => {
                let status = resp.status();
                let err_text = resp.text().await.unwrap_or_default();
                tracing::warn!(
                    offer_id = %offer_id,
                    status = %status,
                    err = %err_text,
                    "escrow claim via releasing failed for creator offer; attempting fallback claim via released"
                );
                let fallback_resp = state
                    .pg
                    .from("campaign_offers")
                    .update(json!({"escrow_status": "released"}).to_string())
                    .eq("id", offer_id)
                    .eq("escrow_status", "holding")
                    .select("id")
                    .execute()
                    .await
                    .map_err(|e| e.to_string())?;
                if !fallback_resp.status().is_success() {
                    return Ok(EscrowReleaseOutcome {
                        payment_status: payment_status.to_string(),
                        escrow_status: escrow_status.to_string(),
                        released_now: false,
                    });
                }
                fallback_resp.text().await.unwrap_or_else(|_| "[]".into())
            }
            Err(e) => {
                tracing::warn!(
                    offer_id = %offer_id,
                    error = %e,
                    "escrow claim request failed for creator offer"
                );
                return Ok(EscrowReleaseOutcome {
                    payment_status: payment_status.to_string(),
                    escrow_status: escrow_status.to_string(),
                    released_now: false,
                });
            }
        };

        let claimed_rows: Vec<serde_json::Value> =
            serde_json::from_str(&claim_text).unwrap_or_default();
        if claimed_rows.is_empty() {
            return Ok(EscrowReleaseOutcome {
                payment_status: payment_status.to_string(),
                escrow_status: "released".to_string(),
                released_now: false,
            });
        }

        // Trigger the Stripe transfer to the creator (best-effort; failures are logged/recorded).
        let currency = "USD".to_string();
        let currency_enum = stripe_sdk::Currency::USD;
        let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
        if let Ok(creator_account_id) = get_creator_stripe_account(state, &creator_id).await {
            let metadata = std::collections::HashMap::from([
                ("offer_id".to_string(), offer_id.to_string()),
                ("creator_id".to_string(), creator_id.to_string()),
                ("type".to_string(), "creator_earnings".to_string()),
            ]);
            let _ = crate::payouts::execute_and_record_stripe_transfer(
                state,
                &client,
                &currency,
                currency_enum,
                "creator",
                &creator_id,
                &creator_account_id,
                net_amount_cents,
                metadata,
                "record_campaign_offer_transfer",
                "p_offer_id",
                offer_id,
            )
            .await;
        }

        let _ = state
            .pg
            .from("campaign_offers")
            .eq("id", offer_id)
            .update(
                json!({
                    "escrow_status": "released",
                    "escrow_released_at": chrono::Utc::now().to_rfc3339(),
                    "updated_at": chrono::Utc::now().to_rfc3339(),
                })
                .to_string(),
            )
            .execute()
            .await;

        return Ok(EscrowReleaseOutcome {
            payment_status: payment_status.to_string(),
            escrow_status: "released".to_string(),
            released_now: true,
        });
    }

    let billing_request_id = offer
        .get("billing_request_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if billing_request_id.is_empty() {
        return Ok(EscrowReleaseOutcome {
            payment_status: payment_status.to_string(),
            escrow_status: escrow_status.to_string(),
            released_now: false,
        });
    }

    // Ensure we have a payout record ready before claiming the escrow release. If this is missing,
    // transferring would be a no-op and we'd risk leaving the offer stuck in "releasing".
    let payouts_resp = state
        .pg
        .from("licensing_payouts")
        .select("id,amount_cents,talent_splits")
        .eq("licensing_request_id", billing_request_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| e.to_string())?;
    if !payouts_resp.status().is_success() {
        return Ok(EscrowReleaseOutcome {
            payment_status: payment_status.to_string(),
            escrow_status: escrow_status.to_string(),
            released_now: false,
        });
    }
    let payouts_text = payouts_resp.text().await.map_err(|e| e.to_string())?;
    let payouts_rows: Vec<serde_json::Value> =
        serde_json::from_str(&payouts_text).unwrap_or_default();
    let payout = match payouts_rows.first() {
        Some(p) => p,
        None => {
            return Ok(EscrowReleaseOutcome {
                payment_status: payment_status.to_string(),
                escrow_status: escrow_status.to_string(),
                released_now: false,
            })
        }
    };
    let payout_agency_amount_cents = payout
        .get("amount_cents")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);
    let payout_splits_total_cents = payout
        .get("talent_splits")
        .and_then(|v| v.as_array())
        .map(|splits| {
            splits
                .iter()
                .filter_map(|s| s.get("amount_cents").and_then(|v| v.as_i64()))
                .sum::<i64>()
        })
        .unwrap_or(0);
    if payout_agency_amount_cents <= 0 && payout_splits_total_cents <= 0 {
        return Ok(EscrowReleaseOutcome {
            payment_status: payment_status.to_string(),
            escrow_status: escrow_status.to_string(),
            released_now: false,
        });
    }

    let agency_id = offer
        .get("target_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if agency_id.is_empty() {
        return Ok(EscrowReleaseOutcome {
            payment_status: payment_status.to_string(),
            escrow_status: escrow_status.to_string(),
            released_now: false,
        });
    }

    // Atomically claim the escrow release to prevent race conditions from concurrent deliverable approvals.
    // Preferred: move holding -> releasing.
    // Fallback (for DBs that don't allow "releasing" yet): claim directly with holding -> released
    // and still execute transfers + set escrow_released_at immediately after.
    let claim_resp = state
        .pg
        .from("campaign_offers")
        .update(json!({"escrow_status": "releasing"}).to_string())
        .eq("id", offer_id)
        .eq("escrow_status", "holding")
        .select("id")
        .execute()
        .await;

    let claim_text = match claim_resp {
        Ok(resp) if resp.status().is_success() => resp.text().await.unwrap_or_else(|_| "[]".into()),
        Ok(resp) => {
            let status = resp.status();
            let err_text = resp.text().await.unwrap_or_default();
            tracing::warn!(
                offer_id = %offer_id,
                status = %status,
                err = %err_text,
                "escrow claim via releasing failed; attempting fallback claim via released"
            );
            let fallback_resp = state
                .pg
                .from("campaign_offers")
                .update(json!({"escrow_status": "released"}).to_string())
                .eq("id", offer_id)
                .eq("escrow_status", "holding")
                .select("id")
                .execute()
                .await
                .map_err(|e| e.to_string())?;
            if !fallback_resp.status().is_success() {
                return Ok(EscrowReleaseOutcome {
                    payment_status: payment_status.to_string(),
                    escrow_status: escrow_status.to_string(),
                    released_now: false,
                });
            }
            fallback_resp.text().await.unwrap_or_else(|_| "[]".into())
        }
        Err(e) => {
            tracing::warn!(offer_id = %offer_id, error = %e, "escrow claim request failed");
            return Ok(EscrowReleaseOutcome {
                payment_status: payment_status.to_string(),
                escrow_status: escrow_status.to_string(),
                released_now: false,
            });
        }
    };

    let rows: Vec<serde_json::Value> = serde_json::from_str(&claim_text).unwrap_or_default();
    if rows.is_empty() {
        // Another concurrent request already claimed the release or it is already released
        return Ok(EscrowReleaseOutcome {
            payment_status: payment_status.to_string(),
            escrow_status: "released".to_string(),
            released_now: false,
        });
    }

    release_campaign_offer_transfers(state, offer_id, agency_id, billing_request_id).await?;

    let _ = state
        .pg
        .from("campaign_offers")
        .eq("id", offer_id)
        .update(
            json!({
                "escrow_status": "released",
                "escrow_released_at": chrono::Utc::now().to_rfc3339(),
                "updated_at": chrono::Utc::now().to_rfc3339(),
            })
            .to_string(),
        )
        .execute()
        .await;

    Ok(EscrowReleaseOutcome {
        payment_status: payment_status.to_string(),
        escrow_status: "released".to_string(),
        released_now: true,
    })
}

async fn release_campaign_offer_transfers(
    state: &AppState,
    offer_id: &str,
    agency_id: &str,
    billing_request_id: &str,
) -> Result<(), String> {
    let payouts_resp = state
        .pg
        .from("licensing_payouts")
        .select("amount_cents,talent_splits,currency")
        .eq("licensing_request_id", billing_request_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| e.to_string())?;
    if !payouts_resp.status().is_success() {
        return Ok(());
    }
    let payouts_text = payouts_resp.text().await.map_err(|e| e.to_string())?;
    let payouts_rows: Vec<serde_json::Value> =
        serde_json::from_str(&payouts_text).unwrap_or_default();
    let payout = match payouts_rows.first() {
        Some(p) => p,
        None => return Ok(()),
    };

    let currency = payout
        .get("currency")
        .and_then(|v| v.as_str())
        .unwrap_or("USD")
        .to_string();
    let currency_enum = stripe_sdk::Currency::from_str(&currency.to_lowercase())
        .map_err(|_| "invalid_currency".to_string())?;
    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());

    let agency_amount_cents = payout
        .get("amount_cents")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);

    if agency_amount_cents > 0 {
        if let Ok(agency_account_id) = get_agency_stripe_account(state, agency_id).await {
            let metadata = std::collections::HashMap::from([
                ("offer_id".to_string(), offer_id.to_string()),
                ("agency_id".to_string(), agency_id.to_string()),
                ("type".to_string(), "agency_commission".to_string()),
            ]);

            let _ = crate::payouts::execute_and_record_stripe_transfer(
                state,
                &client,
                &currency,
                currency_enum,
                "agency",
                agency_id,
                &agency_account_id,
                agency_amount_cents,
                metadata,
                "record_campaign_offer_transfer",
                "p_offer_id",
                offer_id,
            )
            .await;
        }
    }

    let talent_splits = payout
        .get("talent_splits")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    for split in &talent_splits {
        let amount_cents = split
            .get("amount_cents")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        if amount_cents <= 0 {
            continue;
        }

        let talent_id = split
            .get("talent_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        let split_creator_id = split
            .get("creator_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();

        let creator_id = if !split_creator_id.is_empty() {
            split_creator_id
        } else if !talent_id.is_empty() {
            get_creator_id_from_talent_id(state, &talent_id)
                .await
                .unwrap_or_default()
        } else {
            String::new()
        };
        if creator_id.is_empty() {
            continue;
        }
        let talent_account_id_result = if !creator_id.is_empty() {
            get_creator_stripe_account(state, &creator_id).await
        } else {
            Err("missing_creator_id".to_string())
        };

        if let Ok(talent_account_id) = talent_account_id_result {
            let mut metadata = std::collections::HashMap::from([
                ("offer_id".to_string(), offer_id.to_string()),
                ("creator_id".to_string(), creator_id.to_string()),
                ("type".to_string(), "talent_earnings".to_string()),
            ]);
            if !talent_id.is_empty() {
                metadata.insert("talent_id".to_string(), talent_id.to_string());
            }

            let _ = crate::payouts::execute_and_record_stripe_transfer(
                state,
                &client,
                &currency,
                currency_enum,
                "creator",
                &creator_id,
                &talent_account_id,
                amount_cents,
                metadata,
                "record_campaign_offer_transfer",
                "p_offer_id",
                offer_id,
            )
            .await;
        }
    }

    Ok(())
}

async fn get_agency_stripe_account(state: &AppState, agency_id: &str) -> Result<String, String> {
    let resp = state
        .pg
        .from("agencies")
        .select("stripe_connect_account_id")
        .eq("id", agency_id)
        .single()
        .execute()
        .await
        .map_err(|e| e.to_string())?;

    let text = resp.text().await.map_err(|e| e.to_string())?;
    let row: serde_json::Value = serde_json::from_str(&text).map_err(|e| e.to_string())?;

    row.get("stripe_connect_account_id")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .ok_or_else(|| "Agency has no connected Stripe account".to_string())
}

async fn get_creator_id_from_talent_id(
    state: &AppState,
    talent_id: &str,
) -> Result<String, String> {
    let resp = state
        .pg
        .from("agency_users")
        .select("creator_id")
        .eq("id", talent_id)
        .single()
        .execute()
        .await
        .map_err(|e| e.to_string())?;

    let text = resp.text().await.map_err(|e| e.to_string())?;
    let row: serde_json::Value = serde_json::from_str(&text).map_err(|e| e.to_string())?;

    row.get("creator_id")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .ok_or_else(|| format!("Talent {} has no creator profile", talent_id))
}

async fn get_creator_stripe_account(state: &AppState, creator_id: &str) -> Result<String, String> {
    let resp = state
        .pg
        .from("creators")
        .select("stripe_connect_account_id")
        .eq("id", creator_id)
        .single()
        .execute()
        .await
        .map_err(|e| e.to_string())?;

    let text = resp.text().await.map_err(|e| e.to_string())?;
    let row: serde_json::Value = serde_json::from_str(&text).map_err(|e| e.to_string())?;

    row.get("stripe_connect_account_id")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .ok_or_else(|| "Creator has no connected Stripe account".to_string())
}

/// POST /webhooks/brand-contracts
pub async fn handle_webhook(
    State(state): State<AppState>,
    Json(payload): Json<DocuSealWebhookEvent>,
) -> Result<StatusCode, (StatusCode, String)> {
    info!(
        event_type = %payload.event_type,
        "Received DocuSeal brand campaign webhook"
    );

    let status_update = match payload.event_type.as_str() {
        "submission.started" | "submission.opened" | "submission.viewed" | "form.started"
        | "form.viewed" => Some("opened"),
        "submission.completed" | "form.completed" => Some("completed"),
        "submission.declined" | "form.declined" => Some("declined"),
        _ => None,
    };

    if status_update.is_none() {
        return Ok(StatusCode::OK);
    }

    let new_status = status_update.unwrap();

    let submission_id = payload.data["submission_id"]
        .as_i64()
        .or_else(|| payload.data["id"].as_i64())
        .ok_or_else(|| {
            error!("Missing submission id in DocuSeal webhook");
            (StatusCode::BAD_REQUEST, "Missing submission id".to_string())
        })?;

    info!(
        submission_id,
        new_status, "Processing DocuSeal status update for brand contracts"
    );

    // 1. Find and update the campaign_offer_contracts record
    let resp = state
        .pg
        .from("campaign_offer_contracts")
        .select("id, offer_id")
        .eq("docuseal_submission_id", submission_id.to_string())
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !resp.status().is_success() {
        info!(
            "No brand campaign contract found for submission_id: {}",
            submission_id
        );
        return Ok(StatusCode::OK); // Not our concern, might belong to another module
    }

    let contract_text = resp.text().await.unwrap_or_default();
    let contract: serde_json::Value = serde_json::from_str(&contract_text).unwrap_or_default();
    let contract_id = contract["id"].as_str().unwrap_or_default();
    let offer_id = contract["offer_id"].as_str().unwrap_or_default();

    if contract_id.is_empty() {
        return Ok(StatusCode::OK);
    }

    // Prepare update data
    let mut update_json = json!({
        "docuseal_status": new_status,
        "updated_at": chrono::Utc::now().to_rfc3339(),
    });

    // If completed, capture the signed document URL
    if new_status == "completed" {
        if let Some(url) = payload.data["documents"]
            .as_array()
            .and_then(|docs| docs.first())
            .and_then(|doc| doc["url"].as_str())
        {
            update_json["signed_document_url"] = json!(url);
        }
    }

    // Update contract
    let _ = state
        .pg
        .from("campaign_offer_contracts")
        .update(update_json.to_string())
        .eq("id", contract_id)
        .execute()
        .await;

    let submitters = payload
        .data
        .get("submitters")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    let brand_signed = submitters
        .iter()
        .find(|s| {
            s.get("role")
                .and_then(|v| v.as_str())
                .map(|r| docuseal_role_key(r) == "firstparty")
                .unwrap_or(false)
        })
        .and_then(|s| s.get("status"))
        .and_then(|v| v.as_str())
        .map(|s| is_submitter_signed(&s.to_lowercase()))
        .unwrap_or(false);

    // 2. Update the parent campaign_offers status and log activity
    if !offer_id.is_empty() {
        if brand_signed || new_status == "completed" {
            info!(
                offer_id,
                "Updating campaign offer status to contract_fully_signed via webhook"
            );

            // Fetch offer details for activity logging
            let _offer_resp = state
                .pg
                .from("campaign_offers")
                .select("brand_id,brand_campaign_id,target_type,target_id")
                .eq("id", offer_id)
                .single()
                .execute()
                .await;

            let _ = state
                .pg
                .from("campaign_offers")
                .update(
                    json!({
                        "status": "contract_fully_signed",
                        "updated_at": chrono::Utc::now().to_rfc3339(),
                    })
                    .to_string(),
                )
                .eq("id", offer_id)
                .execute()
                .await;

            // NEW: Generate the billing stub (licensing_request) for the campaign offer
            let _ = ensure_campaign_billing_stub(&state, offer_id).await;
        } else if new_status == "opened" {
            let _ = state
                .pg
                .from("campaign_offers")
                .update(
                    json!({
                        "status": "contract_sent",
                        "updated_at": chrono::Utc::now().to_rfc3339(),
                    })
                    .to_string(),
                )
                .eq("id", offer_id)
                .execute()
                .await;
        }
    }

    Ok(StatusCode::OK)
}

pub async fn mark_offer_deliverable_downloaded(
    State(state): State<AppState>,
    user: AuthUser,
    Path(OfferDeliverablePath {
        offer_id,
        deliverable_id,
    }): Path<OfferDeliverablePath>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "brand" && user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let _offer = ensure_offer_access(&state, &user, &offer_id).await?;
    let current_resp = state
        .pg
        .from("campaign_offer_deliverables")
        .select("*")
        .eq("id", &deliverable_id)
        .eq("offer_id", &offer_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let current_status = current_resp.status();
    let current_text = current_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !current_status.is_success() {
        return Err(sanitize_db_error(current_status.as_u16(), current_text));
    }
    let current_rows: Vec<serde_json::Value> =
        serde_json::from_str(&current_text).unwrap_or_default();
    let current = current_rows
        .first()
        .cloned()
        .ok_or((StatusCode::NOT_FOUND, "deliverable not found".to_string()))?;

    let mut merged_meta = current
        .get("meta")
        .and_then(|v| v.as_object().cloned())
        .unwrap_or_default();
    merged_meta.insert(
        "brand_downloaded_at".to_string(),
        json!(chrono::Utc::now().to_rfc3339()),
    );
    merged_meta.insert("brand_downloaded_by".to_string(), json!(user.id));

    let update_resp = state
        .pg
        .from("campaign_offer_deliverables")
        .eq("id", &deliverable_id)
        .eq("offer_id", &offer_id)
        .update(
            json!({
                "meta": serde_json::Value::Object(merged_meta),
                "updated_at": chrono::Utc::now().to_rfc3339(),
            })
            .to_string(),
        )
        .select("*")
        .single()
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
    let row: serde_json::Value = serde_json::from_str(&update_text).unwrap_or_default();
    let actor_label = if user.role == "brand" {
        resolve_brand_name(&state, &user.id)
            .await
            .unwrap_or_else(|| "Brand".to_string())
    } else if user.role == "agency" {
        resolve_agency_name(&state, &user.id)
            .await
            .unwrap_or_else(|| "Agency".to_string())
    } else {
        let creator_id = resolve_effective_creator_id(&state, &user).await;
        resolve_creator_name(&state, &creator_id)
            .await
            .unwrap_or_else(|| "Creator".to_string())
    };
    let campaign_name = _offer
        .get("brand_campaigns")
        .and_then(|v| v.get("name"))
        .and_then(|v| v.as_str())
        .unwrap_or("campaign");
    log_activity_event(
        &state,
        _offer
            .get("brand_id")
            .and_then(|v| v.as_str())
            .unwrap_or(""),
        _offer.get("brand_campaign_id").and_then(|v| v.as_str()),
        if user.role == "brand" {
            "brand"
        } else if user.role == "agency" {
            "agency"
        } else {
            "creator"
        },
        &actor_label,
        "deliverable.comment",
        format!("{} left feedback on {}.", actor_label, campaign_name),
    )
    .await;
    Ok(Json(json!({"status":"ok","deliverable": row})))
}

pub async fn comment_offer_deliverable(
    State(state): State<AppState>,
    user: AuthUser,
    Path(OfferDeliverablePath {
        offer_id,
        deliverable_id,
    }): Path<OfferDeliverablePath>,
    Json(payload): Json<CommentDeliverableRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "brand" && user.role != "agency" && !is_creator_like(&user.role) {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let _offer = ensure_offer_access(&state, &user, &offer_id).await?;
    let message = payload.message.trim();
    if message.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "message is required".to_string()));
    }

    let current_resp = state
        .pg
        .from("campaign_offer_deliverables")
        .select("*")
        .eq("id", &deliverable_id)
        .eq("offer_id", &offer_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let current_status = current_resp.status();
    let current_text = current_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !current_status.is_success() {
        return Err(sanitize_db_error(current_status.as_u16(), current_text));
    }
    let current_rows: Vec<serde_json::Value> =
        serde_json::from_str(&current_text).unwrap_or_default();
    let current = current_rows
        .first()
        .cloned()
        .ok_or((StatusCode::NOT_FOUND, "deliverable not found".to_string()))?;

    let mut merged_meta = current
        .get("meta")
        .and_then(|v| v.as_object().cloned())
        .unwrap_or_default();
    let mut comments = merged_meta
        .get("feedback_comments")
        .and_then(|v| v.as_array().cloned())
        .unwrap_or_default();
    comments.push(json!({
        "id": Uuid::new_v4().to_string(),
        "author_role": user.role,
        "author_id": user.id,
        "message": message,
        "created_at": chrono::Utc::now().to_rfc3339(),
    }));
    merged_meta.insert("feedback_comments".to_string(), json!(comments));

    let update_resp = state
        .pg
        .from("campaign_offer_deliverables")
        .eq("id", &deliverable_id)
        .eq("offer_id", &offer_id)
        .update(
            json!({
                "meta": serde_json::Value::Object(merged_meta),
                "updated_at": chrono::Utc::now().to_rfc3339(),
            })
            .to_string(),
        )
        .select("*")
        .single()
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
    let row: serde_json::Value = serde_json::from_str(&update_text).unwrap_or_default();
    Ok(Json(json!({"status":"ok","deliverable": row})))
}

/// Automatically generates a licensing_request billing stub for a fully signed campaign offer (Agency only).
/// This hooks into the existing `payouts.rs` system seamlessly.
pub async fn ensure_campaign_billing_stub(
    state: &AppState,
    offer_id: &str,
) -> Result<String, String> {
    let offer_resp = state
        .pg
        .from("campaign_offers")
        .select("*")
        .eq("id", offer_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| e.to_string())?;

    let offer_text = offer_resp.text().await.map_err(|e| e.to_string())?;
    let offer_rows: Vec<serde_json::Value> = serde_json::from_str(&offer_text).unwrap_or_default();
    let offer = match offer_rows.first() {
        Some(o) => o,
        None => return Err("offer_not_found".to_string()),
    };

    let target_type = offer
        .get("target_type")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if target_type != "agency" {
        // Independent creators bypass licensing_requests entirely.
        return Ok("".to_string());
    }

    if let Some(existing_id) = offer.get("billing_request_id").and_then(|v| v.as_str()) {
        if !existing_id.is_empty() {
            // Stub already exists. Check if payments rows were created; if not, create them.
            let existing_payments_resp = state
                .pg
                .from("payments")
                .select("id")
                .eq("licensing_request_id", existing_id)
                .execute()
                .await;
            if let Ok(r) = existing_payments_resp {
                if let Ok(txt) = r.text().await {
                    let rows: Vec<serde_json::Value> =
                        serde_json::from_str(&txt).unwrap_or_default();
                    if !rows.is_empty() {
                        // Payments already exist, nothing to do.
                        return Ok(existing_id.to_string());
                    }
                    // Fall through to create missing payments rows.
                    tracing::warn!(
                        offer_id,
                        "billing stub exists but no payments rows; creating them now"
                    );
                }
            }
            // Rebuild enough state to create payments rows below.
            let agency_id = offer
                .get("target_id")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let brand_id = offer.get("brand_id").and_then(|v| v.as_str()).unwrap_or("");
            let brand_campaign_id = offer
                .get("brand_campaign_id")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let budget_snapshot = offer
                .get("budget_snapshot")
                .and_then(|v| v.as_object())
                .cloned()
                .unwrap_or_default();
            let budget_str = budget_snapshot
                .get("budget_total")
                .and_then(|v| v.as_str())
                .unwrap_or("0")
                .replace(",", "");
            let budget_total: f64 = budget_str.parse().unwrap_or(0.0);
            let assignments_resp = state
                .pg
                .from("offer_talent_assignments")
                .select("creator_id")
                .eq("offer_id", offer_id)
                .eq("status", "assigned")
                .execute()
                .await
                .map_err(|e| e.to_string())?;
            let assignments_text = assignments_resp
                .text()
                .await
                .unwrap_or_else(|_| "[]".into());
            let assignments: Vec<serde_json::Value> =
                serde_json::from_str(&assignments_text).unwrap_or_default();
            if assignments.is_empty() {
                return Ok(existing_id.to_string());
            }
            let split_cents = (budget_total / assignments.len() as f64 * 100.0).round() as i64;
            for assigned in &assignments {
                let cid = assigned
                    .get("creator_id")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                if cid.trim().is_empty() {
                    continue;
                }
                let payment_body = json!({
                    "agency_id": agency_id,
                    "brand_id": if brand_id.is_empty() { serde_json::Value::Null } else { serde_json::Value::String(brand_id.to_string()) },
                    "creator_id": cid,
                    "campaign_id": if brand_campaign_id.is_empty() { serde_json::Value::Null } else { serde_json::Value::String(brand_campaign_id.to_string()) },
                    "status": "pending",
                    "currency_code": "USD",
                    "gross_cents": split_cents,
                    "licensing_request_id": existing_id,
                });
                let pay_res = state
                    .pg
                    .from("payments")
                    .insert(payment_body.to_string())
                    .execute()
                    .await;
                match pay_res {
                    Ok(resp) => {
                        if !resp.status().is_success() {
                            tracing::error!(
                                "Failed to insert missing payment for creator {}: {}",
                                cid,
                                resp.text().await.unwrap_or_default()
                            );
                        }
                    }
                    Err(e) => {
                        tracing::error!(
                            "Network error inserting missing payment for creator {}: {}",
                            cid,
                            e
                        );
                    }
                }
            }
            return Ok(existing_id.to_string());
        }
    }

    let agency_id = offer
        .get("target_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let brand_id = offer.get("brand_id").and_then(|v| v.as_str()).unwrap_or("");
    let brand_campaign_id = offer
        .get("brand_campaign_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let budget_snapshot = offer
        .get("budget_snapshot")
        .and_then(|v| v.as_object())
        .cloned()
        .unwrap_or_default();

    let budget_str = budget_snapshot
        .get("budget_total")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "0".to_string());

    // remove commas just in case
    let budget_str = budget_str.replace(",", "");
    let budget_total: f64 = budget_str.parse().unwrap_or(0.0);
    let _amount_cents = (budget_total * 100.0).round() as i64;

    let assignments_resp = state
        .pg
        .from("offer_talent_assignments")
        .select("creator_id")
        .eq("offer_id", offer_id)
        .eq("status", "assigned")
        .execute()
        .await
        .map_err(|e| e.to_string())?;
    let assignments_text = assignments_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".into());
    let assignments: Vec<serde_json::Value> =
        serde_json::from_str(&assignments_text).unwrap_or_default();

    if assignments.is_empty() {
        tracing::warn!(
            "No talents assigned to offer {}, cannot create billing stub.",
            offer_id
        );
        return Err("no_talents_assigned".to_string());
    }

    let split_cents = (budget_total / assignments.len() as f64 * 100.0).round() as i64;
    let primary_creator_id = assignments
        .first()
        .and_then(|a| a.get("creator_id"))
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if primary_creator_id.trim().is_empty() {
        tracing::warn!(
            offer_id,
            "No creator_id found on assigned talents for offer; cannot create billing stub."
        );
        return Err("assigned_talents_missing_creator_id".to_string());
    }

    let lr_body = json!({
        "agency_id": agency_id,
        "brand_id": if brand_id.is_empty() { None } else { Some(brand_id.to_string()) },
        "creator_id": primary_creator_id,
        "status": "approved", // Auto-approved to allow payment
        "context_type": "campaign",
        "campaign_offer_id": offer_id,
    });

    let lr_resp = state
        .pg
        .from("licensing_requests")
        .insert(lr_body.to_string())
        .select("id")
        .single()
        .execute()
        .await
        .map_err(|e| e.to_string())?;

    let lr_status = lr_resp.status();
    if !lr_status.is_success() {
        tracing::error!(
            "Failed to create billing stub for offer {}: {}",
            offer_id,
            lr_resp.text().await.unwrap_or_default()
        );
        return Err("failed_to_create_stub".to_string());
    }

    let lr_row: serde_json::Value =
        serde_json::from_str(&lr_resp.text().await.unwrap_or_default()).unwrap_or_default();
    let lr_id = lr_row.get("id").and_then(|v| v.as_str()).unwrap_or("");

    // Link back to offer
    let _ = state
        .pg
        .from("campaign_offers")
        .update(json!({"billing_request_id": lr_id}).to_string())
        .eq("id", offer_id)
        .execute()
        .await;

    // Create tracking rows in `payments` (creator_id-native; talent_id optional).
    for assigned in assignments {
        let cid = assigned
            .get("creator_id")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        if cid.trim().is_empty() {
            continue;
        }

        let payment_body = json!({
            "agency_id": agency_id,
            "brand_id": if brand_id.is_empty() { None } else { Some(brand_id.to_string()) },
            "creator_id": cid,
            "campaign_id": if brand_campaign_id.is_empty() { None } else { Some(brand_campaign_id.to_string()) },
            "status": "pending",
            "currency_code": "USD",
            "gross_cents": split_cents,
            "licensing_request_id": lr_id,
        });

        let pay_res = state
            .pg
            .from("payments")
            .insert(payment_body.to_string())
            .execute()
            .await;
        match pay_res {
            Ok(resp) => {
                if !resp.status().is_success() {
                    tracing::error!(
                        "Failed to insert payment for creator {}: {}",
                        cid,
                        resp.text().await.unwrap_or_default()
                    );
                }
            }
            Err(e) => {
                tracing::error!("Network error inserting payment for creator {}: {}", cid, e);
            }
        }
    }

    info!(
        offer_id,
        "Generated billing stub {} with {} per-talent payments.", lr_id, split_cents
    );
    Ok(lr_id.to_string())
}

#[allow(clippy::too_many_arguments)]
pub(crate) async fn log_activity_event_with_subject(
    state: &AppState,
    brand_id: &str,
    campaign_id: Option<&str>,
    actor_type: &str,
    actor_name: &str,
    event_type: &str,
    description: String,
    subject_table: &str,
    subject_id: Option<&str>,
) {
    if brand_id.trim().is_empty() {
        return;
    }
    let mut payload = serde_json::Map::new();
    payload.insert("brand_id".to_string(), json!(brand_id));
    if let Some(campaign_id) = campaign_id {
        if !campaign_id.trim().is_empty() {
            payload.insert("campaign_id".to_string(), json!(campaign_id));
        }
    }
    payload.insert("actor_type".to_string(), json!(actor_type));
    payload.insert("actor_name".to_string(), json!(actor_name));
    payload.insert("event_type".to_string(), json!(event_type));
    payload.insert("description".to_string(), json!(description));
    payload.insert("type".to_string(), json!(event_type));
    payload.insert("subject_table".to_string(), json!(subject_table));
    let subject_value = subject_id.or(campaign_id).unwrap_or("");
    payload.insert("subject_id".to_string(), json!(subject_value));
    payload.insert("title".to_string(), json!(description));
    payload.insert("subtitle".to_string(), json!(actor_name));
    if let Err(e) = state
        .pg
        .from("brand_activity_events")
        .insert(serde_json::Value::Object(payload).to_string())
        .execute()
        .await
    {
        eprintln!("Failed to log activity event: {}", e);
    }
}

async fn log_activity_event(
    state: &AppState,
    brand_id: &str,
    campaign_id: Option<&str>,
    actor_type: &str,
    actor_name: &str,
    event_type: &str,
    description: String,
) {
    log_activity_event_with_subject(
        state,
        brand_id,
        campaign_id,
        actor_type,
        actor_name,
        event_type,
        description,
        "brand_campaigns",
        campaign_id,
    )
    .await;
}
