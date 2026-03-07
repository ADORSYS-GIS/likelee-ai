use crate::{auth::AuthUser, config::AppState, errors::sanitize_db_error, services::docuseal::DocuSealClient};
use axum::{
    extract::{Multipart, Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use base64::{engine::general_purpose, Engine as _};
use postgrest::Postgrest;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tracing::error;

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

#[derive(Debug, Serialize)]
pub struct CreateTemplateFromPdfResponse {
    pub id: i64,
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
    pub meta: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct ReviewDeliverableRequest {
    pub action: String, // approve | changes_requested | reject
    pub note: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct OfferPath {
    pub offer_id: String,
}

#[derive(Debug, Deserialize)]
pub struct OfferDeliverablePath {
    pub offer_id: String,
    pub deliverable_id: String,
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
        req = req.eq("brand_id", user.id.as_str());
    } else if user.role == "agency" {
        req = req
            .eq("target_type", "agency")
            .eq("target_id", user.id.as_str());
    } else if is_creator_like(&user.role) {
        req = req
            .eq("target_type", "creator")
            .eq("target_id", user.id.as_str());
    } else {
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
    rows.first().cloned().ok_or((
        StatusCode::NOT_FOUND,
        "campaign offer not found".to_string(),
    ))
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
    if user.role != "brand" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    let name = trim_non_empty(&payload.name, "name")?;
    let objective = trim_non_empty(&payload.objective, "objective")?;
    let category = trim_non_empty(&payload.category, "category")?;
    let description = trim_non_empty(&payload.description, "description")?;
    let budget_range = trim_non_empty(&payload.budget_range, "budget_range")?;
    let start_date = trim_non_empty(&payload.start_date, "start_date")?;

    let insert_payload = json!({
        "brand_id": user.id,
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
    Ok(Json(row))
}

pub async fn update_campaign(
    State(state): State<AppState>,
    user: AuthUser,
    Path(campaign_id): Path<String>,
    Json(payload): Json<UpdateBrandCampaignRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "brand" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    let _existing = ensure_brand_campaign_ownership(&state, &user.id, &campaign_id).await?;
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
        .eq("brand_id", &user.id)
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

    let mut req = state
        .pg
        .from("creators")
        .select("id,full_name,city,state,profile_photo_url,creator_type,base_weekly_price_cents,base_monthly_price_cents,currency_code,accept_negotiations,public_profile_visible,visibility")
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
            let weekly = r
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
                "base_rate_weekly_cents": weekly,
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
    if user.role != "brand" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    if payload.target_ids.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "target_ids is required".to_string(),
        ));
    }
    let campaign = ensure_brand_campaign_ownership(&state, &user.id, &campaign_id).await?;
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
                .eq("brand_id", &user.id)
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
            "brand_id": user.id,
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
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
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
            "id,brand_campaign_id,brand_id,target_type,target_id,status,offer_title,message,expires_at,decided_at,brief_snapshot,budget_snapshot,meta,created_at,updated_at,brand_campaigns(id,name,objective,start_date),brands(id,company_name,email,logo_url)",
        )
        .order("created_at.desc")
        .limit(limit);

    if let Some(status_filter) = q.status.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        req = req.eq("status", status_filter);
    }

    if user.role == "brand" {
        req = req.eq("brand_id", &user.id);
    } else if user.role == "agency" {
        req = req.eq("target_type", "agency").eq("target_id", &user.id);
    } else if is_creator_like(&user.role) {
        req = req.eq("target_type", "creator").eq("target_id", &user.id);
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
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
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
    if user.role == "agency" && (target_type != "agency" || target_id != user.id) {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
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

pub async fn send_offer_contract(
    State(state): State<AppState>,
    user: AuthUser,
    Path(OfferPath { offer_id }): Path<OfferPath>,
    Json(payload): Json<SendOfferContractRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "brand" && user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let _offer = ensure_offer_access(&state, &user, &offer_id).await?;

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

    let now = chrono::Utc::now().to_rfc3339();
    let resp = state
        .pg
        .from("campaign_offer_contracts")
        .eq("id", &contract_id)
        .eq("offer_id", &offer_id)
        .update(
            json!({
                "docuseal_status": "sent",
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
    let contract: serde_json::Value = serde_json::from_str(&text).unwrap_or_default();

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

    let mut update = serde_json::Map::new();
    if let Some(v) = payload
        .docuseal_status
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
    {
        update.insert("docuseal_status".to_string(), json!(v));
    }
    if let Some(v) = payload.docuseal_submission_id {
        update.insert("docuseal_submission_id".to_string(), json!(v));
    }
    if let Some(v) = payload
        .docuseal_slug
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
    {
        update.insert("docuseal_slug".to_string(), json!(v));
    }
    if let Some(meta) = payload.meta {
        update.insert("meta".to_string(), meta);
    }
    update.insert(
        "last_synced_at".to_string(),
        json!(chrono::Utc::now().to_rfc3339()),
    );
    update.insert(
        "updated_at".to_string(),
        json!(chrono::Utc::now().to_rfc3339()),
    );

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

    if let Some(ds) = contract.get("docuseal_status").and_then(|v| v.as_str()) {
        let mapped = match ds {
            "completed" | "fully_signed" => Some("contract_fully_signed"),
            "partially_signed" => Some("contract_partially_signed"),
            "sent" | "pending" => Some("contract_sent"),
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

    Ok(Json(json!({"status":"ok","contract": contract})))
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
            file_data = field.bytes().await.map_err(|e| {
                error!(error = %e, "Failed to read bytes from multipart field");
                (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
            })?.to_vec();
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

    let target_type = offer.get("target_type").and_then(|v| v.as_str()).unwrap_or("");
    let target_id = offer.get("target_id").and_then(|v| v.as_str()).unwrap_or("");

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
    let text = resp.text().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        return Err(sanitize_db_error(status.as_u16(), text));
    }

    Ok(Json(CreateTemplateFromPdfResponse {
        id: template.id as i64,
        slug: template.slug,
        name: template.name,
    }))
}

pub async fn get_offer_contract_builder_token(
    State(state): State<AppState>,
    user: AuthUser,
    Path(ContractPath { offer_id, contract_id }): Path<ContractPath>,
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

    let contract_text = resp.text().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let contract: serde_json::Value = serde_json::from_str(&contract_text).unwrap_or_default();
    let template_id = contract.get("docuseal_template_id").and_then(|v| v.as_i64());

    if template_id.is_none() {
        return Err((StatusCode::NOT_FOUND, "Contract template not found".to_string()));
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

    let agency_text = agency_resp.text().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let agency: serde_json::Value = serde_json::from_str(&agency_text).unwrap_or_default();

    if state.docuseal_user_email.is_empty() {
        return Err((StatusCode::INTERNAL_SERVER_ERROR, "DocuSeal admin email not configured".to_string()));
    }

    let user_email = state.docuseal_user_email.clone();
    let name = agency["name"].as_str().unwrap_or("Agency User").to_string();
    let integration_email = agency["contact_email"].as_str().unwrap_or("agency@example.com").to_string();

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
    Path(ContractPath { offer_id, contract_id }): Path<ContractPath>,
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
    let now = chrono::Utc::now().to_rfc3339();
    let resp = state
        .pg
        .from("campaign_offer_packages")
        .eq("id", &payload.package_id)
        .eq("offer_id", &offer_id)
        .eq("agency_id", &user.id)
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
        .select("*,campaign_offers(id,status,target_type,target_id,offer_title),agencies(id,agency_name)")
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
    let mut current_meta = current_row.get("meta").cloned().unwrap_or_else(|| json!({}));

    if let Some(obj) = current_meta.as_object_mut() {
        if let Some(ids) = payload.selected_talent_ids {
            obj.insert("selected_talent_ids".to_string(), json!(ids));
        }
        if let Some(note) = payload.feedback_note.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
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
    let resp = state
        .pg
        .from("campaign_offer_packages")
        .select("*")
        .eq("agency_id", &user.id)
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
    let resp = state
        .pg
        .from("campaign_offer_packages")
        .select("*,campaign_offers(id,brand_campaign_id,status,offer_title,message)")
        .eq("agency_id", &user.id)
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
    let asset_url = trim_non_empty(&payload.asset_url, "asset_url")?;
    let asset_type = payload
        .asset_type
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or("file")
        .to_string();

    let insert_payload = json!({
        "offer_id": offer_id,
        "brand_campaign_id": _offer.get("brand_campaign_id").cloned().unwrap_or(serde_json::Value::Null),
        "brand_id": _offer.get("brand_id").cloned().unwrap_or(serde_json::Value::Null),
        "agency_id": if user.role == "agency" { json!(user.id.clone()) } else { serde_json::Value::Null },
        "creator_id": if is_creator_like(&user.role) { json!(user.id.clone()) } else { serde_json::Value::Null },
        "submitted_by": user.id,
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
    Ok(Json(json!({"status":"ok","deliverable": row})))
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

pub async fn review_offer_deliverable(
    State(state): State<AppState>,
    user: AuthUser,
    Path(OfferDeliverablePath {
        offer_id,
        deliverable_id,
    }): Path<OfferDeliverablePath>,
    Json(payload): Json<ReviewDeliverableRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "brand" && user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let _offer = ensure_offer_access(&state, &user, &offer_id).await?;
    let action = payload.action.trim().to_lowercase();
    let now = chrono::Utc::now().to_rfc3339();

    let (status_value, offer_status) = if user.role == "agency" {
        match action.as_str() {
            "approve" => ("brand_review", "in_review"),
            "changes_requested" => ("changes_requested", "changes_requested"),
            "reject" => ("rejected", "changes_requested"),
            _ => return Err((StatusCode::BAD_REQUEST, "invalid action".to_string())),
        }
    } else {
        match action.as_str() {
            "approve" => ("approved", "approved"),
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

    Ok(Json(json!({"status":"ok","deliverable": row})))
}
