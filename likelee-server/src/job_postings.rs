use crate::{
    activity::log_activity_event_with_subject,
    auth::AuthUser,
    brand_campaigns::{resolve_agency_name, resolve_brand_name, resolve_creator_name},
    config::AppState,
    errors::sanitize_db_error,
};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use serde_json::json;
use std::collections::HashMap;
use std::path::Path as FsPath;

fn public_asset_url(state: &AppState, path: &str) -> String {
    let base = state.supabase_url.trim_end_matches('/');
    let bucket = state.supabase_bucket_public.trim_matches('/');
    let clean = path.trim_start_matches('/');
    format!("{}/storage/v1/object/public/{}/{}", base, bucket, clean)
}

fn normalize_brand_assets(
    state: &AppState,
    assets: &serde_json::Value,
) -> (serde_json::Value, bool) {
    let mut changed = false;
    let list = match assets.as_array() {
        Some(list) => list,
        None => return (assets.clone(), false),
    };

    let normalized: Vec<serde_json::Value> = list
        .iter()
        .map(|asset| match asset {
            serde_json::Value::String(value) => {
                let trimmed = value.trim();
                if trimmed.is_empty() {
                    return asset.clone();
                }
                if trimmed.starts_with("http") {
                    changed = true;
                    let name = FsPath::new(trimmed)
                        .file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or(trimmed);
                    json!({ "name": name, "url": trimmed })
                } else if trimmed.contains('/') {
                    changed = true;
                    let url = public_asset_url(state, trimmed);
                    json!({ "name": FsPath::new(trimmed).file_name().and_then(|n| n.to_str()).unwrap_or(trimmed), "path": trimmed, "url": url })
                } else {
                    changed = true;
                    json!({ "name": trimmed })
                }
            }
            serde_json::Value::Object(map) => {
                let mut obj = map.clone();
                let url = obj
                    .get("url")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim()
                    .to_string();
                if url.is_empty() {
                    let fallback_url = obj
                        .get("public_url")
                        .or_else(|| obj.get("asset_url"))
                        .or_else(|| obj.get("file_url"))
                        .and_then(|v| v.as_str())
                        .map(|v| v.trim().to_string())
                        .filter(|v| !v.is_empty());
                    if let Some(value) = fallback_url {
                        obj.insert("url".to_string(), serde_json::Value::String(value));
                        changed = true;
                        return serde_json::Value::Object(obj);
                    }
                    let path = obj
                        .get("path")
                        .and_then(|v| v.as_str())
                        .or_else(|| obj.get("name").and_then(|v| v.as_str()))
                        .unwrap_or("")
                        .trim();
                    if !path.is_empty() {
                        let resolved = if path.starts_with("http") {
                            path.to_string()
                        } else {
                            public_asset_url(state, path)
                        };
                        obj.insert("url".to_string(), serde_json::Value::String(resolved));
                        changed = true;
                    }
                }
                serde_json::Value::Object(obj)
            }
            _ => asset.clone(),
        })
        .collect();

    (serde_json::Value::Array(normalized), changed)
}

#[derive(Debug, Deserialize)]
pub struct CreateJobPayload {
    pub company_name: Option<String>,
    pub contact_email: Option<String>,
    pub job_title: Option<String>,
    pub about_role: Option<String>,
    pub call_type: Option<String>,
    pub category: Option<String>,
    pub job_type: Option<String>,
    pub location: Option<String>,
    pub budget: Option<f64>,
    pub payment_type: Option<String>,
    pub currency: Option<String>,
    pub deliverables: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub status: Option<String>,
    pub work_types: Option<Vec<String>>,
    pub talent_types: Option<Vec<String>>,
    pub goals: Option<Vec<String>>,
    pub region: Option<String>,
    pub language: Option<String>,
    pub required_skills: Option<Vec<String>>,
    pub needs_licensing: Option<bool>,
    pub usage_type: Option<String>,
    pub license_duration: Option<String>,
    pub territories: Option<String>,
    pub exclusivity: Option<bool>,
    pub royalty_option: Option<bool>,
    pub work_with_agency: Option<bool>,
    pub invite_creator: Option<bool>,
    pub invited_agency_ids: Option<Vec<String>>,
    pub invited_creator_ids: Option<Vec<String>>,
    pub brand_assets: Option<serde_json::Value>,
    pub confidential: Option<bool>,
    pub declined_agency_ids: Option<Vec<String>>,
    pub declined_creator_ids: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct ListJobsParams {
    pub call_type: Option<String>,
    pub job_type: Option<String>,
    pub location: Option<String>,
    pub category: Option<String>,
    pub status: Option<String>,
    pub search: Option<String>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct ApplyJobPayload {
    pub message: Option<String>,
    pub resume_name: Option<String>,
    pub resume_url: Option<String>,
    pub resume_path: Option<String>,
    pub resume_mime: Option<String>,
    pub resume_size: Option<i64>,
    pub comp_card_name: Option<String>,
    pub comp_card_url: Option<String>,
    pub comp_card_path: Option<String>,
    pub comp_cards: Option<serde_json::Value>,
    pub portfolio_link: Option<String>,
    pub github_link: Option<String>,
    pub linkedin_link: Option<String>,
}

pub async fn update_job(
    State(state): State<AppState>,
    user: AuthUser,
    Path(job_id): Path<String>,
    Json(payload): Json<CreateJobPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "brand" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let effective_brand_id = crate::team::resolve_effective_brand_id(&state, &user).await?;

    let job_check = state
        .pg
        .from("job_postings")
        .select("id,brand_id,invited_agency_ids,invited_creator_ids")
        .eq("id", &job_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let job_text = job_check.text().await.unwrap_or_default();
    let job_rows: Vec<serde_json::Value> = serde_json::from_str(&job_text).unwrap_or_default();
    let job = job_rows
        .first()
        .ok_or((StatusCode::NOT_FOUND, "job not found".to_string()))?;
    let brand_id = job.get("brand_id").and_then(|v| v.as_str()).unwrap_or("");
    if brand_id != effective_brand_id {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    let mut update = serde_json::Map::new();
    let status = payload
        .status
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|s| s.to_lowercase());
    if let Some(status) = status.as_ref() {
        if !["open", "closed", "draft"].contains(&status.as_str()) {
            return Err((StatusCode::BAD_REQUEST, "invalid status".to_string()));
        }
        update.insert("status".to_string(), json!(status));
    }

    if let Some(val) = payload.company_name {
        update.insert("company_name".to_string(), json!(val));
    }
    if let Some(val) = payload.contact_email {
        update.insert("contact_email".to_string(), json!(val));
    }
    if let Some(val) = payload.job_title {
        update.insert("job_title".to_string(), json!(val.trim()));
    }
    if let Some(val) = payload.about_role {
        update.insert("about_role".to_string(), json!(val.trim()));
    }
    if let Some(val) = payload.call_type {
        update.insert("call_type".to_string(), json!(val.trim().to_lowercase()));
    }
    if let Some(val) = payload.category {
        update.insert("category".to_string(), json!(val));
    }
    if let Some(val) = payload.job_type {
        update.insert("job_type".to_string(), json!(val));
    }
    if let Some(val) = payload.location {
        update.insert("location".to_string(), json!(val));
    }
    if let Some(val) = payload.budget {
        update.insert("budget".to_string(), json!(val));
    }
    if let Some(val) = payload.payment_type {
        update.insert("payment_type".to_string(), json!(val));
    }
    if let Some(val) = payload.currency {
        update.insert("currency".to_string(), json!(val));
    }
    if let Some(val) = payload.deliverables {
        update.insert("deliverables".to_string(), json!(val));
    }
    if let Some(val) = payload.start_date {
        update.insert("start_date".to_string(), json!(val));
    }
    if let Some(val) = payload.end_date {
        update.insert("end_date".to_string(), json!(val));
    }
    if let Some(val) = payload.work_types {
        update.insert("work_types".to_string(), json!(val));
    }
    if let Some(val) = payload.talent_types {
        update.insert("talent_types".to_string(), json!(val));
    }
    if let Some(val) = payload.goals {
        update.insert("goals".to_string(), json!(val));
    }
    if let Some(val) = payload.region {
        update.insert("region".to_string(), json!(val));
    }
    if let Some(val) = payload.language {
        update.insert("language".to_string(), json!(val));
    }
    if let Some(val) = payload.required_skills {
        update.insert("required_skills".to_string(), json!(val));
    }
    if let Some(val) = payload.needs_licensing {
        update.insert("needs_licensing".to_string(), json!(val));
    }
    if let Some(val) = payload.usage_type {
        update.insert("usage_type".to_string(), json!(val));
    }
    if let Some(val) = payload.license_duration {
        update.insert("license_duration".to_string(), json!(val));
    }
    if let Some(val) = payload.territories {
        update.insert("territories".to_string(), json!(val));
    }
    if let Some(val) = payload.exclusivity {
        update.insert("exclusivity".to_string(), json!(val));
    }
    if let Some(val) = payload.royalty_option {
        update.insert("royalty_option".to_string(), json!(val));
    }
    if let Some(val) = payload.work_with_agency {
        update.insert("work_with_agency".to_string(), json!(val));
    }
    if let Some(val) = payload.invite_creator {
        update.insert("invite_creator".to_string(), json!(val));
    }
    if let Some(val) = payload.invited_agency_ids.clone() {
        update.insert("invited_agency_ids".to_string(), json!(val));
    }
    if let Some(val) = payload.invited_creator_ids.clone() {
        update.insert("invited_creator_ids".to_string(), json!(val));
    }
    if let Some(val) = payload.brand_assets {
        update.insert("brand_assets".to_string(), val);
    }
    if let Some(val) = payload.confidential {
        update.insert("confidential".to_string(), json!(val));
    }

    if update.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "no updates provided".to_string()));
    }

    update.insert(
        "updated_at".to_string(),
        serde_json::Value::String(chrono::Utc::now().to_rfc3339()),
    );

    let resp = state
        .pg
        .from("job_postings")
        .update(serde_json::Value::Object(update).to_string())
        .eq("id", &job_id)
        .select("*,brands(id,company_name,logo_url)")
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

    // Determine diff of invited IDs
    let old_agency_ids: Vec<String> = job
        .get("invited_agency_ids")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|x| x.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();
    let old_creator_ids: Vec<String> = job
        .get("invited_creator_ids")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|x| x.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();

    let mut new_agency_ids = Vec::new();
    if let Some(ids) = payload.invited_agency_ids {
        for id in ids {
            if !old_agency_ids.contains(&id) {
                new_agency_ids.push(id.clone());
            }
        }
    }
    let mut new_creator_ids = Vec::new();
    if let Some(ids) = payload.invited_creator_ids {
        for id in ids {
            if !old_creator_ids.contains(&id) {
                new_creator_ids.push(id.clone());
            }
        }
    }

    if !new_agency_ids.is_empty() || !new_creator_ids.is_empty() {
        let brand_id = row
            .get("brand_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let job_title_str = row
            .get("job_title")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let job_id = row
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let brand_name = resolve_brand_name(&state, &brand_id)
            .await
            .or_else(|| {
                row.get("company_name")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            })
            .unwrap_or_else(|| "Brand".to_string());
        tokio::spawn({
            let state = state.clone();
            async move {
                send_job_invitation_notifications(
                    &state,
                    &job_title_str,
                    &brand_name,
                    &brand_id,
                    &job_id,
                    &new_agency_ids,
                    &new_creator_ids,
                )
                .await;
            }
        });
    }

    Ok(Json(json!({ "status": "ok", "job": row })))
}

pub async fn create_job(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<CreateJobPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "brand" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let effective_brand_id = crate::team::resolve_effective_brand_id(&state, &user).await?;

    let status = payload
        .status
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or("open")
        .to_string();

    let title = payload
        .job_title
        .as_deref()
        .unwrap_or("")
        .trim()
        .to_string();
    let about_role = payload
        .about_role
        .as_deref()
        .unwrap_or("")
        .trim()
        .to_string();
    let call_type = payload
        .call_type
        .as_deref()
        .unwrap_or("")
        .trim()
        .to_lowercase();

    if status != "draft" {
        if title.is_empty() {
            return Err((StatusCode::BAD_REQUEST, "job_title is required".to_string()));
        }
        if about_role.is_empty() {
            return Err((
                StatusCode::BAD_REQUEST,
                "about_role is required".to_string(),
            ));
        }
        if call_type.is_empty() {
            return Err((StatusCode::BAD_REQUEST, "call_type is required".to_string()));
        }
    }

    let row = json!({
        "brand_id": effective_brand_id,
        "company_name": payload.company_name,
        "contact_email": payload.contact_email,
        "job_title": title,
        "about_role": about_role,
        "call_type": call_type,
        "category": payload.category,
        "job_type": payload.job_type,
        "location": payload.location,
        "budget": payload.budget,
        "payment_type": payload.payment_type,
        "currency": payload.currency.unwrap_or_else(|| "USD".to_string()),
        "deliverables": payload.deliverables,
        "start_date": payload.start_date,
        "end_date": payload.end_date,
        "status": status,
        "work_types": payload.work_types,
        "talent_types": payload.talent_types,
        "goals": payload.goals,
        "region": payload.region,
        "language": payload.language,
        "required_skills": payload.required_skills,
        "needs_licensing": payload.needs_licensing,
        "usage_type": payload.usage_type,
        "license_duration": payload.license_duration,
        "territories": payload.territories,
        "exclusivity": payload.exclusivity,
        "royalty_option": payload.royalty_option,
        "work_with_agency": payload.work_with_agency,
        "invite_creator": payload.invite_creator,
        "invited_agency_ids": payload.invited_agency_ids.clone(),
        "invited_creator_ids": payload.invited_creator_ids.clone(),
        "brand_assets": payload.brand_assets,
        "confidential": payload.confidential,
        "updated_at": chrono::Utc::now().to_rfc3339(),
    });

    let resp = state
        .pg
        .from("job_postings")
        .insert(row.to_string())
        .select("*,brands(id,company_name,logo_url)")
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

    let job_id = row
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let job_title_str = row
        .get("job_title")
        .and_then(|v| v.as_str())
        .unwrap_or("job")
        .to_string();
    let brand_name = resolve_brand_name(&state, &effective_brand_id)
        .await
        .or_else(|| {
            row.get("company_name")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        })
        .unwrap_or_else(|| "Brand".to_string());
    log_activity_event_with_subject(
        &state,
        &effective_brand_id,
        None,
        "brand",
        &brand_name,
        "job.created",
        format!("{} created a job: {}.", brand_name, job_title_str),
        "job_postings",
        Some(&job_id),
    )
    .await;

    let agency_ids = payload.invited_agency_ids.unwrap_or_default();
    let creator_ids = payload.invited_creator_ids.unwrap_or_default();
    if !agency_ids.is_empty() || !creator_ids.is_empty() {
        tokio::spawn({
            let state = state.clone();
            let effective_brand_id = effective_brand_id.clone();
            let job_id = job_id.clone();
            async move {
                send_job_invitation_notifications(
                    &state,
                    &job_title_str,
                    &brand_name,
                    &effective_brand_id,
                    &job_id,
                    &agency_ids,
                    &creator_ids,
                )
                .await;
            }
        });
    }

    Ok(Json(json!({"status":"ok","job": row})))
}

pub async fn list_jobs(
    State(state): State<AppState>,
    user: AuthUser,
    Query(params): Query<ListJobsParams>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "creator"
        && user.role != "talent"
        && user.role != "agency"
        && user.role != "brand"
    {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    let limit = params.limit.unwrap_or(60).clamp(1, 200) as usize;
    let _offset = params.offset.unwrap_or(0).max(0);
    let status_filter = params
        .status
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or("open");

    let mut req = state
        .pg
        .from("job_postings")
        .select("*,brands(id,company_name,logo_url)")
        .eq("status", status_filter)
        .order("created_at.desc")
        .limit(limit);

    if let Some(s) = params.call_type.as_ref().filter(|s| !s.is_empty()) {
        req = req.eq("call_type", s);
    }
    if let Some(s) = params.job_type.as_ref().filter(|s| !s.is_empty()) {
        req = req.ilike("job_type", s);
    }
    if let Some(s) = params.location.as_ref().filter(|s| !s.is_empty()) {
        req = req.ilike("location", s);
    }
    if let Some(s) = params.category.as_ref().filter(|s| !s.is_empty()) {
        req = req.eq("category", s);
    }
    if let Some(s) = params.search.as_ref().filter(|s| !s.is_empty()) {
        let pattern = format!("%{}%", s);
        req = req.ilike("job_title", pattern);
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

    // Resolve invited access for confidential jobs
    let mut creator_match_id: Option<String> = None;
    let mut agency_match_id: Option<String> = None;
    let mut agency_parent_id: Option<String> = None;
    if user.role == "agency" {
        let resp = state
            .pg
            .from("agency_users")
            .select("id,user_id,creator_id,agency_id")
            .or(format!(
                "id.eq.{},user_id.eq.{},creator_id.eq.{}",
                user.id, user.id, user.id
            ))
            .limit(1)
            .execute()
            .await;
        if let Ok(resp) = resp {
            if resp.status().is_success() {
                let text = resp.text().await.unwrap_or_default();
                let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
                if let Some(row) = rows.first() {
                    if let Some(id) = row.get("id").and_then(|v| v.as_str()) {
                        agency_match_id = Some(id.to_string());
                    }
                    if let Some(id) = row.get("agency_id").and_then(|v| v.as_str()) {
                        agency_parent_id = Some(id.to_string());
                    }
                }
            }
        }
        if agency_parent_id.is_none() {
            if let Ok(resp) = state
                .pg
                .from("agencies")
                .select("id")
                .eq("user_id", &user.id)
                .limit(1)
                .execute()
                .await
            {
                if resp.status().is_success() {
                    let text = resp.text().await.unwrap_or_default();
                    let rows: Vec<serde_json::Value> =
                        serde_json::from_str(&text).unwrap_or_default();
                    if let Some(row) = rows.first() {
                        if let Some(id) = row.get("id").and_then(|v| v.as_str()) {
                            agency_parent_id = Some(id.to_string());
                        }
                    }
                }
            }
        }
    } else if user.role == "brand" {
        // If they are a brand, they are always an invited viewer of their own jobs
        // This is handled in the enrichment loop below
    } else if user.role == "creator" || user.role == "talent" {
        let resp = state
            .pg
            .from("creators")
            .select("id,email")
            .eq("user_id", &user.id)
            .limit(1)
            .execute()
            .await;
        if let Ok(resp) = resp {
            if resp.status().is_success() {
                let text = resp.text().await.unwrap_or_default();
                let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
                if let Some(row) = rows.first() {
                    if let Some(id) = row.get("id").and_then(|v| v.as_str()) {
                        creator_match_id = Some(id.to_string());
                    }
                }
            }
        }
        if creator_match_id.is_none() {
            if let Some(email) = user
                .email
                .as_ref()
                .map(|e| e.trim())
                .filter(|e| !e.is_empty())
            {
                if let Ok(resp) = state
                    .pg
                    .from("creators")
                    .select("id")
                    .eq("email", email)
                    .limit(1)
                    .execute()
                    .await
                {
                    if resp.status().is_success() {
                        let text = resp.text().await.unwrap_or_default();
                        let rows: Vec<serde_json::Value> =
                            serde_json::from_str(&text).unwrap_or_default();
                        if let Some(row) = rows.first() {
                            if let Some(id) = row.get("id").and_then(|v| v.as_str()) {
                                creator_match_id = Some(id.to_string());
                            }
                        }
                    }
                }
            }
        }
    }

    if user.role != "brand" {
        rows.retain(|row| {
            let confidential = row
                .get("confidential")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            if !confidential {
                return true;
            }
            if user.role == "agency" {
                let invited = row
                    .get("invited_agency_ids")
                    .and_then(|v| v.as_array())
                    .map(|arr| {
                        arr.iter().any(|id| {
                            let id = id.as_str().unwrap_or("");
                            id == user.id
                                || agency_match_id.as_ref().map(|x| x == id).unwrap_or(false)
                                || agency_parent_id.as_ref().map(|x| x == id).unwrap_or(false)
                        })
                    })
                    .unwrap_or(false);
                let accepted = row
                    .get("accepted_agency_ids")
                    .and_then(|v| v.as_array())
                    .map(|arr| {
                        arr.iter().any(|id| {
                            let id = id.as_str().unwrap_or("");
                            id == user.id
                                || agency_match_id.as_ref().map(|x| x == id).unwrap_or(false)
                                || agency_parent_id.as_ref().map(|x| x == id).unwrap_or(false)
                        })
                    })
                    .unwrap_or(false);
                let declined = row
                    .get("declined_agency_ids")
                    .and_then(|v| v.as_array())
                    .map(|arr| {
                        arr.iter().any(|id| {
                            let id = id.as_str().unwrap_or("");
                            id == user.id
                                || agency_match_id.as_ref().map(|x| x == id).unwrap_or(false)
                                || agency_parent_id.as_ref().map(|x| x == id).unwrap_or(false)
                        })
                    })
                    .unwrap_or(false);
                return invited || accepted || declined;
            }
            let invited = row
                .get("invited_creator_ids")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter().any(|id| {
                        let id = id.as_str().unwrap_or("");
                        id == user.id || creator_match_id.as_ref().map(|x| x == id).unwrap_or(false)
                    })
                })
                .unwrap_or(false);
            let accepted = row
                .get("accepted_creator_ids")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter().any(|id| {
                        let id = id.as_str().unwrap_or("");
                        id == user.id || creator_match_id.as_ref().map(|x| x == id).unwrap_or(false)
                    })
                })
                .unwrap_or(false);
            let declined = row
                .get("declined_creator_ids")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter().any(|id| {
                        let id = id.as_str().unwrap_or("");
                        id == user.id || creator_match_id.as_ref().map(|x| x == id).unwrap_or(false)
                    })
                })
                .unwrap_or(false);
            invited || accepted || declined
        });
    }
    for row in rows.iter_mut() {
        let id = row
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        if id.is_empty() {
            continue;
        }
        if let Some(assets) = row.get("brand_assets") {
            let (normalized, changed) = normalize_brand_assets(&state, assets);
            if changed {
                row["brand_assets"] = normalized.clone();
                let _ = state
                    .pg
                    .from("job_postings")
                    .update(
                        json!({
                            "brand_assets": normalized,
                            "updated_at": chrono::Utc::now().to_rfc3339()
                        })
                        .to_string(),
                    )
                    .eq("id", &id)
                    .execute()
                    .await;
            }
        }
    }
    // Enrich invited collaborator details
    let mut invited_agency_ids: Vec<String> = Vec::new();
    let mut invited_creator_ids: Vec<String> = Vec::new();
    let mut declined_agency_ids: Vec<String> = Vec::new();
    let mut declined_creator_ids: Vec<String> = Vec::new();
    for row in &rows {
        if let Some(arr) = row.get("invited_agency_ids").and_then(|v| v.as_array()) {
            for id in arr {
                if let Some(id) = id.as_str() {
                    invited_agency_ids.push(id.to_string());
                }
            }
        }
        if let Some(arr) = row.get("invited_creator_ids").and_then(|v| v.as_array()) {
            for id in arr {
                if let Some(id) = id.as_str() {
                    invited_creator_ids.push(id.to_string());
                }
            }
        }
        if let Some(arr) = row.get("declined_agency_ids").and_then(|v| v.as_array()) {
            for id in arr {
                if let Some(id) = id.as_str() {
                    declined_agency_ids.push(id.to_string());
                }
            }
        }
        if let Some(arr) = row.get("declined_creator_ids").and_then(|v| v.as_array()) {
            for id in arr {
                if let Some(id) = id.as_str() {
                    declined_creator_ids.push(id.to_string());
                }
            }
        }
    }
    invited_agency_ids.sort();
    invited_agency_ids.dedup();
    invited_creator_ids.sort();
    invited_creator_ids.dedup();
    declined_agency_ids.sort();
    declined_agency_ids.dedup();
    declined_creator_ids.sort();
    declined_creator_ids.dedup();

    let mut agency_map: HashMap<String, serde_json::Value> = HashMap::new();
    let mut agency_ids = invited_agency_ids.clone();
    agency_ids.extend(declined_agency_ids.clone());
    agency_ids.sort();
    agency_ids.dedup();
    if !agency_ids.is_empty() {
        let agency_filter_ids = agency_ids
            .iter()
            .map(|id| format!("\"{}\"", id))
            .collect::<Vec<String>>()
            .join(",");
        let resp = state
            .pg
            .from("agencies")
            .select("id,agency_name,contact_name,logo_url")
            .or(format!("id.in.({})", agency_filter_ids))
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let text = resp.text().await.unwrap_or_default();
        let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
        for row in rows {
            if let Some(id) = row.get("id").and_then(|v| v.as_str()) {
                agency_map.insert(id.to_string(), row);
            }
        }
    }

    let mut creator_map: HashMap<String, serde_json::Value> = HashMap::new();
    let mut creator_ids = invited_creator_ids.clone();
    creator_ids.extend(declined_creator_ids.clone());
    creator_ids.sort();
    creator_ids.dedup();
    if !creator_ids.is_empty() {
        let creator_filter_ids = creator_ids
            .iter()
            .map(|id| format!("\"{}\"", id))
            .collect::<Vec<String>>()
            .join(",");
        let resp = state
            .pg
            .from("creators")
            .select("id,full_name,profile_photo_url,email")
            .or(format!("id.in.({})", creator_filter_ids))
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let text = resp.text().await.unwrap_or_default();
        let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
        for row in rows {
            if let Some(id) = row.get("id").and_then(|v| v.as_str()) {
                creator_map.insert(id.to_string(), row);
            }
        }
    }

    for row in rows.iter_mut() {
        if user.role == "brand" {
            if let Some(arr) = row.get("invited_agency_ids").and_then(|v| v.as_array()) {
                let mut out: Vec<serde_json::Value> = Vec::new();
                for id in arr {
                    if let Some(id) = id.as_str() {
                        if let Some(detail) = agency_map.get(id) {
                            out.push(detail.clone());
                        }
                    }
                }
                if !out.is_empty() {
                    row["invited_agencies"] = serde_json::Value::Array(out);
                }
            }
            if let Some(arr) = row.get("invited_creator_ids").and_then(|v| v.as_array()) {
                let mut out: Vec<serde_json::Value> = Vec::new();
                for id in arr {
                    if let Some(id) = id.as_str() {
                        if let Some(detail) = creator_map.get(id) {
                            out.push(detail.clone());
                        }
                    }
                }
                if !out.is_empty() {
                    row["invited_creators"] = serde_json::Value::Array(out);
                }
            }
            if let Some(arr) = row.get("declined_agency_ids").and_then(|v| v.as_array()) {
                let mut out: Vec<serde_json::Value> = Vec::new();
                for id in arr {
                    if let Some(id) = id.as_str() {
                        if let Some(detail) = agency_map.get(id) {
                            out.push(detail.clone());
                        }
                    }
                }
                if !out.is_empty() {
                    row["declined_agencies"] = serde_json::Value::Array(out);
                }
            }
            if let Some(arr) = row.get("declined_creator_ids").and_then(|v| v.as_array()) {
                let mut out: Vec<serde_json::Value> = Vec::new();
                for id in arr {
                    if let Some(id) = id.as_str() {
                        if let Some(detail) = creator_map.get(id) {
                            out.push(detail.clone());
                        }
                    }
                }
                if !out.is_empty() {
                    row["declined_creators"] = serde_json::Value::Array(out);
                }
            }
            if let Some(arr) = row.get("accepted_agency_ids").and_then(|v| v.as_array()) {
                let mut out: Vec<serde_json::Value> = Vec::new();
                for id in arr {
                    if let Some(id) = id.as_str() {
                        if let Some(detail) = agency_map.get(id) {
                            out.push(detail.clone());
                        }
                    }
                }
                if !out.is_empty() {
                    row["accepted_agencies"] = serde_json::Value::Array(out);
                }
            }
            if let Some(arr) = row.get("accepted_creator_ids").and_then(|v| v.as_array()) {
                let mut out: Vec<serde_json::Value> = Vec::new();
                for id in arr {
                    if let Some(id) = id.as_str() {
                        if let Some(detail) = creator_map.get(id) {
                            out.push(detail.clone());
                        }
                    }
                }
                if !out.is_empty() {
                    row["accepted_creators"] = serde_json::Value::Array(out);
                }
            }
        }

        let is_collaborator = if user.role == "brand" {
            let brand_id = row.get("brand_id").and_then(|v| v.as_str()).unwrap_or("");
            brand_id == user.id
                || brand_id
                    == crate::team::resolve_effective_brand_id(&state, &user)
                        .await
                        .unwrap_or_default()
        } else {
            let check_ids = if user.role == "agency" {
                vec![
                    "invited_agency_ids",
                    "accepted_agency_ids",
                    "declined_agency_ids",
                ]
            } else {
                vec![
                    "invited_creator_ids",
                    "accepted_creator_ids",
                    "declined_creator_ids",
                ]
            };

            let match_ids = if user.role == "agency" {
                let mut ids = vec![user.id.clone()];
                if let Some(ref m) = agency_match_id {
                    ids.push(m.clone());
                }
                if let Some(ref p) = agency_parent_id {
                    ids.push(p.clone());
                }
                ids
            } else {
                let mut ids = vec![user.id.clone()];
                if let Some(ref m) = creator_match_id {
                    ids.push(m.clone());
                }
                ids
            };

            check_ids.iter().any(|key| {
                row.get(*key)
                    .and_then(|v| v.as_array())
                    .map(|arr| {
                        arr.iter().any(|id| {
                            let id_str = id.as_str().unwrap_or("");
                            match_ids.iter().any(|m| m == id_str)
                        })
                    })
                    .unwrap_or(false)
            })
        };

        row["is_invited_viewer"] = serde_json::Value::Bool(is_collaborator);

        let confidential = row
            .get("confidential")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);

        if confidential && !is_collaborator {
            row["details_redacted"] = serde_json::Value::Bool(true);
            // Redact ONLY Step 5: Collaboration Preferences
            row["work_with_agency"] = serde_json::Value::Null;
            row["invite_creator"] = serde_json::Value::Null;
            row["brand_assets"] = serde_json::Value::Array(vec![]);
            row["invited_agency_ids"] = serde_json::Value::Array(vec![]);
            row["invited_creator_ids"] = serde_json::Value::Array(vec![]);
            row["accepted_agency_ids"] = serde_json::Value::Array(vec![]);
            row["accepted_creator_ids"] = serde_json::Value::Array(vec![]);
            row["declined_agency_ids"] = serde_json::Value::Array(vec![]);
            row["declined_creator_ids"] = serde_json::Value::Array(vec![]);
            // Also hide detailed collaborator counts/lists if populated
            row["invited_agencies"] = serde_json::Value::Array(vec![]);
            row["invited_creators"] = serde_json::Value::Array(vec![]);
            row["accepted_agencies"] = serde_json::Value::Array(vec![]);
            row["accepted_creators"] = serde_json::Value::Array(vec![]);
            row["declined_agencies"] = serde_json::Value::Array(vec![]);
            row["declined_creators"] = serde_json::Value::Array(vec![]);
        }
    }
    Ok(Json(json!({ "jobs": rows, "total": rows.len() })))
}

pub async fn list_my_jobs(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "brand" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let effective_brand_id = crate::team::resolve_effective_brand_id(&state, &user).await?;

    let resp = state
        .pg
        .from("job_postings")
        .select("*,brands(id,company_name,logo_url)")
        .eq("brand_id", &effective_brand_id)
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
    for row in rows.iter_mut() {
        let id = row
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        if id.is_empty() {
            continue;
        }
        if let Some(assets) = row.get("brand_assets") {
            let (normalized, changed) = normalize_brand_assets(&state, assets);
            if changed {
                row["brand_assets"] = normalized.clone();
                let _ = state
                    .pg
                    .from("job_postings")
                    .update(
                        json!({
                            "brand_assets": normalized,
                            "updated_at": chrono::Utc::now().to_rfc3339()
                        })
                        .to_string(),
                    )
                    .eq("id", &id)
                    .execute()
                    .await;
            }
        }
    }
    // Enrich invited collaborator details
    let mut invited_agency_ids: Vec<String> = Vec::new();
    let mut invited_creator_ids: Vec<String> = Vec::new();
    let mut declined_agency_ids: Vec<String> = Vec::new();
    let mut declined_creator_ids: Vec<String> = Vec::new();
    let mut accepted_agency_ids: Vec<String> = Vec::new();
    let mut accepted_creator_ids: Vec<String> = Vec::new();
    for row in &rows {
        if let Some(arr) = row.get("invited_agency_ids").and_then(|v| v.as_array()) {
            for id in arr {
                if let Some(id) = id.as_str() {
                    invited_agency_ids.push(id.to_string());
                }
            }
        }
        if let Some(arr) = row.get("invited_creator_ids").and_then(|v| v.as_array()) {
            for id in arr {
                if let Some(id) = id.as_str() {
                    invited_creator_ids.push(id.to_string());
                }
            }
        }
        if let Some(arr) = row.get("declined_agency_ids").and_then(|v| v.as_array()) {
            for id in arr {
                if let Some(id) = id.as_str() {
                    declined_agency_ids.push(id.to_string());
                }
            }
        }
        if let Some(arr) = row.get("declined_creator_ids").and_then(|v| v.as_array()) {
            for id in arr {
                if let Some(id) = id.as_str() {
                    declined_creator_ids.push(id.to_string());
                }
            }
        }
        if let Some(arr) = row.get("accepted_agency_ids").and_then(|v| v.as_array()) {
            for id in arr {
                if let Some(id) = id.as_str() {
                    accepted_agency_ids.push(id.to_string());
                }
            }
        }
        if let Some(arr) = row.get("accepted_creator_ids").and_then(|v| v.as_array()) {
            for id in arr {
                if let Some(id) = id.as_str() {
                    accepted_creator_ids.push(id.to_string());
                }
            }
        }
    }
    invited_agency_ids.sort();
    invited_agency_ids.dedup();
    invited_creator_ids.sort();
    invited_creator_ids.dedup();
    declined_agency_ids.sort();
    declined_agency_ids.dedup();
    declined_creator_ids.sort();
    declined_creator_ids.dedup();
    accepted_agency_ids.sort();
    accepted_agency_ids.dedup();
    accepted_creator_ids.sort();
    accepted_creator_ids.dedup();

    let mut agency_map: HashMap<String, serde_json::Value> = HashMap::new();
    let mut agency_ids = invited_agency_ids.clone();
    agency_ids.extend(declined_agency_ids.clone());
    agency_ids.extend(accepted_agency_ids.clone());
    agency_ids.sort();
    agency_ids.dedup();
    if !agency_ids.is_empty() {
        let agency_filter_ids = agency_ids
            .iter()
            .map(|id| format!("\"{}\"", id))
            .collect::<Vec<String>>()
            .join(",");
        let resp = state
            .pg
            .from("agencies")
            .select("id,agency_name,contact_name,logo_url")
            .or(format!("id.in.({})", agency_filter_ids))
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let text = resp.text().await.unwrap_or_default();
        let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
        for row in rows {
            if let Some(id) = row.get("id").and_then(|v| v.as_str()) {
                agency_map.insert(id.to_string(), row);
            }
        }
    }

    let mut creator_map: HashMap<String, serde_json::Value> = HashMap::new();
    let mut creator_ids = invited_creator_ids.clone();
    creator_ids.extend(declined_creator_ids.clone());
    creator_ids.extend(accepted_creator_ids.clone());
    creator_ids.sort();
    creator_ids.dedup();
    if !creator_ids.is_empty() {
        let creator_filter_ids = creator_ids
            .iter()
            .map(|id| format!("\"{}\"", id))
            .collect::<Vec<String>>()
            .join(",");
        let resp = state
            .pg
            .from("creators")
            .select("id,full_name,profile_photo_url,email")
            .or(format!("id.in.({})", creator_filter_ids))
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let text = resp.text().await.unwrap_or_default();
        let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
        for row in rows {
            if let Some(id) = row.get("id").and_then(|v| v.as_str()) {
                creator_map.insert(id.to_string(), row);
            }
        }
    }

    for row in rows.iter_mut() {
        if let Some(arr) = row.get("invited_agency_ids").and_then(|v| v.as_array()) {
            let mut out: Vec<serde_json::Value> = Vec::new();
            for id in arr {
                if let Some(id) = id.as_str() {
                    if let Some(detail) = agency_map.get(id) {
                        out.push(detail.clone());
                    }
                }
            }
            if !out.is_empty() {
                row["invited_agencies"] = serde_json::Value::Array(out);
            }
        }
        if let Some(arr) = row.get("invited_creator_ids").and_then(|v| v.as_array()) {
            let mut out: Vec<serde_json::Value> = Vec::new();
            for id in arr {
                if let Some(id) = id.as_str() {
                    if let Some(detail) = creator_map.get(id) {
                        out.push(detail.clone());
                    }
                }
            }
            if !out.is_empty() {
                row["invited_creators"] = serde_json::Value::Array(out);
            }
        }
        if let Some(arr) = row.get("declined_agency_ids").and_then(|v| v.as_array()) {
            let mut out: Vec<serde_json::Value> = Vec::new();
            for id in arr {
                if let Some(id) = id.as_str() {
                    if let Some(detail) = agency_map.get(id) {
                        out.push(detail.clone());
                    }
                }
            }
            if !out.is_empty() {
                row["declined_agencies"] = serde_json::Value::Array(out);
            }
        }
        if let Some(arr) = row.get("declined_creator_ids").and_then(|v| v.as_array()) {
            let mut out: Vec<serde_json::Value> = Vec::new();
            for id in arr {
                if let Some(id) = id.as_str() {
                    if let Some(detail) = creator_map.get(id) {
                        out.push(detail.clone());
                    }
                }
            }
            if !out.is_empty() {
                row["declined_creators"] = serde_json::Value::Array(out);
            }
        }
        if let Some(arr) = row.get("accepted_agency_ids").and_then(|v| v.as_array()) {
            let mut out: Vec<serde_json::Value> = Vec::new();
            for id in arr {
                if let Some(id) = id.as_str() {
                    if let Some(detail) = agency_map.get(id) {
                        out.push(detail.clone());
                    }
                }
            }
            if !out.is_empty() {
                row["accepted_agencies"] = serde_json::Value::Array(out);
            }
        }
        if let Some(arr) = row.get("accepted_creator_ids").and_then(|v| v.as_array()) {
            let mut out: Vec<serde_json::Value> = Vec::new();
            for id in arr {
                if let Some(id) = id.as_str() {
                    if let Some(detail) = creator_map.get(id) {
                        out.push(detail.clone());
                    }
                }
            }
            if !out.is_empty() {
                row["accepted_creators"] = serde_json::Value::Array(out);
            }
        }
        row["is_invited_viewer"] = serde_json::Value::Bool(true);
    }
    Ok(Json(json!({ "jobs": rows })))
}

pub async fn apply_job(
    State(state): State<AppState>,
    user: AuthUser,
    Path(job_id): Path<String>,
    Json(payload): Json<ApplyJobPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "creator" && user.role != "talent" && user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    let job_resp = state
        .pg
        .from("job_postings")
        .select("id,brand_id,job_title")
        .eq("id", &job_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let job_text = job_resp.text().await.unwrap_or_default();
    let job_rows: Vec<serde_json::Value> = serde_json::from_str(&job_text).unwrap_or_default();
    let job = job_rows
        .first()
        .ok_or((StatusCode::NOT_FOUND, "job not found".to_string()))?;
    let job_brand_id = job
        .get("brand_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let job_title = job
        .get("job_title")
        .and_then(|v| v.as_str())
        .unwrap_or("job")
        .to_string();

    let applicant_role = if user.role == "agency" {
        "agency"
    } else if user.role == "talent" {
        "ai_artist"
    } else {
        "creator"
    };

    let mut applicant_id = user.id.clone();
    if applicant_role == "agency" {
        if let Ok(resp) = state
            .pg
            .from("agency_users")
            .select("agency_id")
            .or(format!(
                "id.eq.{},user_id.eq.{},creator_id.eq.{}",
                user.id, user.id, user.id
            ))
            .limit(1)
            .execute()
            .await
        {
            if resp.status().is_success() {
                let text = resp.text().await.unwrap_or_default();
                let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
                if let Some(row) = rows.first() {
                    if let Some(id) = row.get("agency_id").and_then(|v| v.as_str()) {
                        applicant_id = id.to_string();
                    }
                }
            }
        }
        crate::entitlements::require_agency_paid_access(
            &state,
            &applicant_id,
            "paid_plan_required_for_job_applications",
        )
        .await?;
    } else if applicant_role == "creator" || applicant_role == "ai_artist" {
        let mut req = state.pg.from("creators").select("id,email");
        if let Some(email) = user
            .email
            .as_ref()
            .map(|e| e.trim())
            .filter(|e| !e.is_empty())
        {
            req = req.eq("email", email);
        } else {
            req = req.eq("id", &user.id);
        }
        if let Ok(resp) = req.limit(1).execute().await {
            if resp.status().is_success() {
                let text = resp.text().await.unwrap_or_default();
                let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
                if let Some(row) = rows.first() {
                    if let Some(id) = row.get("id").and_then(|v| v.as_str()) {
                        applicant_id = id.to_string();
                    }
                }
            }
        }
    }

    // Allow multiple applications per user if they want to reapply with updates.

    let row = json!({
        "job_id": job_id,
        "applicant_id": applicant_id,
        "applicant_role": applicant_role,
        "message": payload.message.as_deref().map(str::trim).filter(|s| !s.is_empty()),
        "status": "submitted",
        "resume_name": payload.resume_name,
        "resume_url": payload.resume_url,
        "resume_path": payload.resume_path,
        "resume_mime": payload.resume_mime,
        "resume_size": payload.resume_size,
        "comp_card_name": payload.comp_card_name,
        "comp_card_url": payload.comp_card_url,
        "comp_card_path": payload.comp_card_path,
        "comp_cards": payload.comp_cards,
        "portfolio_link": payload.portfolio_link,
        "github_link": payload.github_link,
        "linkedin_link": payload.linkedin_link,
    });

    let resp = state
        .pg
        .from("job_applications")
        .insert(row.to_string())
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
    if !job_brand_id.is_empty() {
        let actor_type = if applicant_role == "agency" {
            "agency"
        } else {
            "creator"
        };
        let actor_name = if actor_type == "agency" {
            resolve_agency_name(&state, &applicant_id)
                .await
                .unwrap_or_else(|| "Agency".to_string())
        } else {
            resolve_creator_name(&state, &applicant_id)
                .await
                .unwrap_or_else(|| "Creator".to_string())
        };
        log_activity_event_with_subject(
            &state,
            &job_brand_id,
            None,
            actor_type,
            &actor_name,
            "job.application.submitted",
            format!("{} applied for job {}.", actor_name, job_title),
            "job_postings",
            Some(&job_id),
        )
        .await;
    }
    Ok(Json(json!({ "status": "ok", "application": row })))
}

pub async fn list_job_applications(
    State(state): State<AppState>,
    user: AuthUser,
    Path(job_id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "brand" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    let effective_brand_id = crate::team::resolve_effective_brand_id(&state, &user).await?;

    let job_check = state
        .pg
        .from("job_postings")
        .select("id,brand_id")
        .eq("id", &job_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let job_text = job_check.text().await.unwrap_or_default();
    let job_rows: Vec<serde_json::Value> = serde_json::from_str(&job_text).unwrap_or_default();
    let job = job_rows
        .first()
        .ok_or((StatusCode::NOT_FOUND, "job not found".to_string()))?;
    let brand_id = job.get("brand_id").and_then(|v| v.as_str()).unwrap_or("");
    if brand_id != effective_brand_id {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    let resp = state
        .pg
        .from("job_applications")
        .select("*")
        .eq("job_id", &job_id)
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
    let mut creator_ids: Vec<String> = Vec::new();
    let mut agency_ids: Vec<String> = Vec::new();
    let mut athlete_ids: Vec<String> = Vec::new();

    for row in &rows {
        let role = row
            .get("applicant_role")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let id = row
            .get("applicant_id")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        if id.is_empty() {
            continue;
        }
        if role == "agency" {
            agency_ids.push(id.to_string());
        } else if role == "athlete" {
            athlete_ids.push(id.to_string());
        } else {
            creator_ids.push(id.to_string());
        }
    }

    let mut creator_name_map: HashMap<String, (String, Option<String>)> = HashMap::new();
    if !creator_ids.is_empty() {
        let creator_filter_ids = creator_ids
            .iter()
            .map(|id| format!("\"{}\"", id))
            .collect::<Vec<String>>()
            .join(",");
        let resp = state
            .pg
            .from("creators")
            .select("id,full_name,profile_photo_url,email")
            .or(format!("id.in.({})", creator_filter_ids))
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let status = resp.status();
        let text = resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if status.is_success() {
            let creator_rows: Vec<serde_json::Value> =
                serde_json::from_str(&text).unwrap_or_default();
            for row in creator_rows {
                let id = row.get("id").and_then(|v| v.as_str()).unwrap_or("");
                let email = row.get("email").and_then(|v| v.as_str()).unwrap_or("");
                let name = row
                    .get("full_name")
                    .and_then(|v| v.as_str())
                    .filter(|v| !v.trim().is_empty())
                    .unwrap_or("");
                let photo = row
                    .get("profile_photo_url")
                    .and_then(|v| v.as_str())
                    .filter(|v| !v.trim().is_empty())
                    .map(|v| v.to_string());
                if !id.is_empty() && !name.is_empty() {
                    creator_name_map.insert(id.to_string(), (name.to_string(), photo.clone()));
                }
                if !email.is_empty() && !name.is_empty() {
                    creator_name_map.insert(email.to_string(), (name.to_string(), photo));
                }
            }
        }
    }

    let mut agency_name_map: HashMap<String, (String, Option<String>)> = HashMap::new();
    let mut agency_entity_map: HashMap<String, (String, Option<String>)> = HashMap::new();
    if !agency_ids.is_empty() {
        let agency_filter_ids = agency_ids
            .iter()
            .map(|id| format!("\"{}\"", id))
            .collect::<Vec<String>>()
            .join(",");
        let resp = state
            .pg
            .from("agencies")
            .select("id,agency_name,logo_url")
            .or(format!("id.in.({})", agency_filter_ids))
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let status = resp.status();
        let text = resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if status.is_success() {
            let agency_rows: Vec<serde_json::Value> =
                serde_json::from_str(&text).unwrap_or_default();
            for row in agency_rows {
                let id = row.get("id").and_then(|v| v.as_str()).unwrap_or("");
                let name = row
                    .get("agency_name")
                    .and_then(|v| v.as_str())
                    .filter(|v| !v.trim().is_empty())
                    .unwrap_or("");
                let photo = row
                    .get("logo_url")
                    .and_then(|v| v.as_str())
                    .filter(|v| !v.trim().is_empty())
                    .map(|v| v.to_string());
                if !id.is_empty() && !name.is_empty() {
                    agency_entity_map.insert(id.to_string(), (name.to_string(), photo));
                }
            }
        }
        let resp = state
            .pg
            .from("agency_users")
            .select("id,user_id,creator_id,stage_name,full_legal_name,profile_photo_url,agency_id")
            .or(format!(
                "id.in.({}),user_id.in.({}),creator_id.in.({}),agency_id.in.({})",
                agency_filter_ids, agency_filter_ids, agency_filter_ids, agency_filter_ids
            ))
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let status = resp.status();
        let text = resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if status.is_success() {
            let agency_rows: Vec<serde_json::Value> =
                serde_json::from_str(&text).unwrap_or_default();
            for row in agency_rows {
                let id = row.get("id").and_then(|v| v.as_str()).unwrap_or("");
                let user_id = row.get("user_id").and_then(|v| v.as_str()).unwrap_or("");
                let creator_id = row.get("creator_id").and_then(|v| v.as_str()).unwrap_or("");
                let agency_id = row.get("agency_id").and_then(|v| v.as_str()).unwrap_or("");
                let name = row
                    .get("stage_name")
                    .and_then(|v| v.as_str())
                    .filter(|v| !v.trim().is_empty())
                    .or_else(|| {
                        row.get("full_legal_name")
                            .and_then(|v| v.as_str())
                            .filter(|v| !v.trim().is_empty())
                    })
                    .unwrap_or("");
                let photo = row
                    .get("profile_photo_url")
                    .and_then(|v| v.as_str())
                    .filter(|v| !v.trim().is_empty())
                    .map(|v| v.to_string());
                // Only use agency_users names as secondary fallback;
                // primary name comes from agencies table (agency_entity_map)
                if !id.is_empty() && !name.is_empty() {
                    agency_name_map
                        .entry(id.to_string())
                        .or_insert((name.to_string(), photo.clone()));
                }
                if !user_id.is_empty() && !name.is_empty() {
                    agency_name_map
                        .entry(user_id.to_string())
                        .or_insert((name.to_string(), photo.clone()));
                }
                if !creator_id.is_empty() && !name.is_empty() {
                    agency_name_map
                        .entry(creator_id.to_string())
                        .or_insert((name.to_string(), photo.clone()));
                }
                if !agency_id.is_empty() && !name.is_empty() {
                    agency_name_map
                        .entry(agency_id.to_string())
                        .or_insert((name.to_string(), photo));
                }
            }
        }
    }

    let mut athlete_name_map: HashMap<String, (String, Option<String>)> = HashMap::new();
    if !athlete_ids.is_empty() {
        let athlete_filter_ids = athlete_ids
            .iter()
            .map(|id| format!("\"{}\"", id))
            .collect::<Vec<String>>()
            .join(",");
        let sports_resp = state
            .pg
            .from("agencies")
            .select("id")
            .eq("agency_type", "sports")
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let sports_text = sports_resp.text().await.unwrap_or_default();
        let sports_rows: Vec<serde_json::Value> =
            serde_json::from_str(&sports_text).unwrap_or_default();
        let sports_ids: Vec<String> = sports_rows
            .iter()
            .filter_map(|row| {
                row.get("id")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            })
            .collect();
        if !sports_ids.is_empty() {
            let resp = state
                .pg
                .from("agency_users")
                .select(
                    "id,user_id,creator_id,stage_name,full_legal_name,profile_photo_url,agency_id",
                )
                .or(format!(
                    "id.in.({}),user_id.in.({}),creator_id.in.({})",
                    athlete_filter_ids, athlete_filter_ids, athlete_filter_ids
                ))
                .in_("agency_id", sports_ids)
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let status = resp.status();
            let text = resp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            if status.is_success() {
                let athlete_rows: Vec<serde_json::Value> =
                    serde_json::from_str(&text).unwrap_or_default();
                for row in athlete_rows {
                    let id = row.get("id").and_then(|v| v.as_str()).unwrap_or("");
                    let user_id = row.get("user_id").and_then(|v| v.as_str()).unwrap_or("");
                    let creator_id = row.get("creator_id").and_then(|v| v.as_str()).unwrap_or("");
                    let name = row
                        .get("stage_name")
                        .and_then(|v| v.as_str())
                        .filter(|v| !v.trim().is_empty())
                        .or_else(|| {
                            row.get("full_legal_name")
                                .and_then(|v| v.as_str())
                                .filter(|v| !v.trim().is_empty())
                        })
                        .unwrap_or("");
                    let photo = row
                        .get("profile_photo_url")
                        .and_then(|v| v.as_str())
                        .filter(|v| !v.trim().is_empty())
                        .map(|v| v.to_string());
                    if !id.is_empty() && !name.is_empty() {
                        athlete_name_map.insert(id.to_string(), (name.to_string(), photo.clone()));
                    }
                    if !user_id.is_empty() && !name.is_empty() {
                        athlete_name_map
                            .insert(user_id.to_string(), (name.to_string(), photo.clone()));
                    }
                    if !creator_id.is_empty() && !name.is_empty() {
                        athlete_name_map.insert(creator_id.to_string(), (name.to_string(), photo));
                    }
                }
            }
        }
    }

    for row in rows.iter_mut() {
        let role = row
            .get("applicant_role")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let id = row
            .get("applicant_id")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        if id.is_empty() {
            continue;
        }
        let entry = if role == "agency" {
            agency_entity_map
                .get(id)
                .or_else(|| agency_name_map.get(id))
        } else if role == "athlete" {
            athlete_name_map.get(id)
        } else {
            creator_name_map.get(id)
        };
        if let Some((name, photo)) = entry {
            row["applicant_name"] = serde_json::Value::String(name.clone());
            if let Some(photo) = photo {
                row["applicant_photo_url"] = serde_json::Value::String(photo.clone());
            }
        }
    }

    Ok(Json(json!({ "applications": rows })))
}

pub async fn decline_job_invite(
    State(state): State<AppState>,
    user: AuthUser,
    Path(job_id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "creator" && user.role != "talent" && user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    let job_resp = state
        .pg
        .from("job_postings")
        .select(
            "id,brand_id,job_title,invited_creator_ids,invited_agency_ids,declined_creator_ids,declined_agency_ids",
        )
        .eq("id", &job_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let job_text = job_resp.text().await.unwrap_or_default();
    let job_rows: Vec<serde_json::Value> = serde_json::from_str(&job_text).unwrap_or_default();
    let job = job_rows
        .first()
        .ok_or((StatusCode::NOT_FOUND, "job not found".to_string()))?;

    let mut invited_creator_ids: Vec<String> = job
        .get("invited_creator_ids")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|id| id.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();
    let mut invited_agency_ids: Vec<String> = job
        .get("invited_agency_ids")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|id| id.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();
    let mut declined_creator_ids: Vec<String> = job
        .get("declined_creator_ids")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|id| id.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();
    let mut declined_agency_ids: Vec<String> = job
        .get("declined_agency_ids")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|id| id.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();

    let (actor_id, actor_type) = if user.role == "agency" {
        let mut agency_id = user.id.clone();
        if let Ok(resp) = state
            .pg
            .from("agency_users")
            .select("agency_id")
            .or(format!(
                "id.eq.{},user_id.eq.{},creator_id.eq.{}",
                user.id, user.id, user.id
            ))
            .limit(1)
            .execute()
            .await
        {
            if resp.status().is_success() {
                let text = resp.text().await.unwrap_or_default();
                let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
                if let Some(row) = rows.first() {
                    if let Some(id) = row.get("agency_id").and_then(|v| v.as_str()) {
                        agency_id = id.to_string();
                    }
                }
            }
        }
        invited_agency_ids.retain(|id| id != &agency_id);
        if !declined_agency_ids.contains(&agency_id) {
            declined_agency_ids.push(agency_id.clone());
        }
        (agency_id, "agency")
    } else {
        let mut creator_id = user.id.clone();
        if let Some(email) = user
            .email
            .as_ref()
            .map(|e| e.trim())
            .filter(|e| !e.is_empty())
        {
            if let Ok(resp) = state
                .pg
                .from("creators")
                .select("id")
                .eq("email", email)
                .limit(1)
                .execute()
                .await
            {
                if resp.status().is_success() {
                    let text = resp.text().await.unwrap_or_default();
                    let rows: Vec<serde_json::Value> =
                        serde_json::from_str(&text).unwrap_or_default();
                    if let Some(row) = rows.first() {
                        if let Some(id) = row.get("id").and_then(|v| v.as_str()) {
                            creator_id = id.to_string();
                        }
                    }
                }
            }
        }
        invited_creator_ids.retain(|id| id != &creator_id);
        if !declined_creator_ids.contains(&creator_id) {
            declined_creator_ids.push(creator_id.clone());
        }
        (creator_id, "creator")
    };

    let resp = state
        .pg
        .from("job_postings")
        .update(
            json!({
                "invited_creator_ids": invited_creator_ids,
                "invited_agency_ids": invited_agency_ids,
                "declined_creator_ids": declined_creator_ids,
                "declined_agency_ids": declined_agency_ids,
                "updated_at": chrono::Utc::now().to_rfc3339()
            })
            .to_string(),
        )
        .eq("id", &job_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = resp.status();
    if !status.is_success() {
        let text = resp.text().await.unwrap_or_default();
        return Err(sanitize_db_error(status.as_u16(), text));
    }
    let brand_id = job
        .get("brand_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let job_title = job
        .get("job_title")
        .and_then(|v| v.as_str())
        .unwrap_or("job")
        .to_string();
    if !brand_id.is_empty() && !actor_id.is_empty() {
        let actor_name = if actor_type == "agency" {
            resolve_agency_name(&state, &actor_id)
                .await
                .unwrap_or_else(|| "Agency".to_string())
        } else {
            resolve_creator_name(&state, &actor_id)
                .await
                .unwrap_or_else(|| "Creator".to_string())
        };
        log_activity_event_with_subject(
            &state,
            &brand_id,
            None,
            actor_type,
            &actor_name,
            "job.invite.declined",
            format!("{} declined the job invite for {}.", actor_name, job_title),
            "job_postings",
            Some(&job_id),
        )
        .await;
    }
    Ok(Json(json!({ "status": "ok" })))
}

pub async fn accept_job_invite(
    State(state): State<AppState>,
    user: AuthUser,
    Path(job_id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "creator" && user.role != "talent" && user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    let job_resp = state
        .pg
        .from("job_postings")
        .select(
            "id,brand_id,job_title,invited_creator_ids,invited_agency_ids,accepted_creator_ids,accepted_agency_ids",
        )
        .eq("id", &job_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let job_text = job_resp.text().await.unwrap_or_default();
    let job_rows: Vec<serde_json::Value> = serde_json::from_str(&job_text).unwrap_or_default();
    let job = job_rows
        .first()
        .ok_or((StatusCode::NOT_FOUND, "job not found".to_string()))?;

    let mut invited_creator_ids: Vec<String> = job
        .get("invited_creator_ids")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|id| id.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();
    let mut invited_agency_ids: Vec<String> = job
        .get("invited_agency_ids")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|id| id.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();
    let mut accepted_creator_ids: Vec<String> = job
        .get("accepted_creator_ids")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|id| id.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();
    let mut accepted_agency_ids: Vec<String> = job
        .get("accepted_agency_ids")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|id| id.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();

    let (actor_id, actor_type) = if user.role == "agency" {
        let mut agency_id = user.id.clone();
        if let Ok(resp) = state
            .pg
            .from("agency_users")
            .select("agency_id")
            .or(format!(
                "id.eq.{},user_id.eq.{},creator_id.eq.{}",
                user.id, user.id, user.id
            ))
            .limit(1)
            .execute()
            .await
        {
            if resp.status().is_success() {
                let text = resp.text().await.unwrap_or_default();
                let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
                if let Some(row) = rows.first() {
                    if let Some(id) = row.get("agency_id").and_then(|v| v.as_str()) {
                        agency_id = id.to_string();
                    }
                }
            }
        }
        invited_agency_ids.retain(|id| id != &agency_id);
        if !accepted_agency_ids.contains(&agency_id) {
            accepted_agency_ids.push(agency_id.clone());
        }
        (agency_id, "agency")
    } else {
        let mut creator_id = user.id.clone();
        if let Some(email) = user
            .email
            .as_ref()
            .map(|e| e.trim())
            .filter(|e| !e.is_empty())
        {
            if let Ok(resp) = state
                .pg
                .from("creators")
                .select("id")
                .eq("email", email)
                .limit(1)
                .execute()
                .await
            {
                if resp.status().is_success() {
                    let text = resp.text().await.unwrap_or_default();
                    let rows: Vec<serde_json::Value> =
                        serde_json::from_str(&text).unwrap_or_default();
                    if let Some(row) = rows.first() {
                        if let Some(id) = row.get("id").and_then(|v| v.as_str()) {
                            creator_id = id.to_string();
                        }
                    }
                }
            }
        }
        invited_creator_ids.retain(|id| id != &creator_id);
        if !accepted_creator_ids.contains(&creator_id) {
            accepted_creator_ids.push(creator_id.clone());
        }
        (creator_id, "creator")
    };

    let resp = state
        .pg
        .from("job_postings")
        .update(
            json!({
                "invited_creator_ids": invited_creator_ids,
                "invited_agency_ids": invited_agency_ids,
                "accepted_creator_ids": accepted_creator_ids,
                "accepted_agency_ids": accepted_agency_ids,
                "updated_at": chrono::Utc::now().to_rfc3339()
            })
            .to_string(),
        )
        .eq("id", &job_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = resp.status();
    if !status.is_success() {
        let text = resp.text().await.unwrap_or_default();
        return Err(sanitize_db_error(status.as_u16(), text));
    }
    let brand_id = job
        .get("brand_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let job_title = job
        .get("job_title")
        .and_then(|v| v.as_str())
        .unwrap_or("job")
        .to_string();
    if !brand_id.is_empty() && !actor_id.is_empty() {
        let actor_name = if actor_type == "agency" {
            resolve_agency_name(&state, &actor_id)
                .await
                .unwrap_or_else(|| "Agency".to_string())
        } else {
            resolve_creator_name(&state, &actor_id)
                .await
                .unwrap_or_else(|| "Creator".to_string())
        };
        log_activity_event_with_subject(
            &state,
            &brand_id,
            None,
            actor_type,
            &actor_name,
            "job.invite.accepted",
            format!("{} accepted the job invite for {}.", actor_name, job_title),
            "job_postings",
            Some(&job_id),
        )
        .await;
    }
    Ok(Json(json!({ "status": "ok" })))
}

async fn send_job_invitation_notifications(
    state: &AppState,
    job_title: &str,
    brand_name: &str,
    brand_id: &str,
    job_id: &str,
    agency_ids: &[String],
    creator_ids: &[String],
) {
    if agency_ids.is_empty() && creator_ids.is_empty() {
        return;
    }

    let subject = format!("You have been invited to a new job: {}", job_title);
    let body = format!(
        "Hello,\n\n{} has invited you to apply for the job: \"{}\".\n\nLog in to your Likelee dashboard to view the details and apply or decline.\n\nBest,\nThe Likelee Team",
        brand_name, job_title
    );

    let mut all_emails = Vec::new();

    if !agency_ids.is_empty() {
        if let Ok(resp) = state
            .pg
            .from("agencies")
            .select("email")
            .in_("id", agency_ids.to_vec())
            .execute()
            .await
        {
            if let Ok(text) = resp.text().await {
                let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
                for row in rows {
                    if let Some(email) = row.get("email").and_then(|v| v.as_str()) {
                        all_emails.push(email.to_string());
                    }
                }
            }
        }

        for agency_id in agency_ids {
            let agency_name = resolve_agency_name(state, agency_id)
                .await
                .unwrap_or_else(|| "Agency".to_string());
            log_activity_event_with_subject(
                state,
                brand_id,
                None,
                "brand",
                brand_name,
                "job.invite.sent",
                format!(
                    "{} invited {} to apply for job {}.",
                    brand_name, agency_name, job_title
                ),
                "job_postings",
                Some(job_id),
            )
            .await;
        }
    }

    if !creator_ids.is_empty() {
        if let Ok(resp) = state
            .pg
            .from("creators")
            .select("email")
            .in_("id", creator_ids.to_vec())
            .execute()
            .await
        {
            if let Ok(text) = resp.text().await {
                let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
                for row in rows {
                    if let Some(email) = row.get("email").and_then(|v| v.as_str()) {
                        all_emails.push(email.to_string());
                    }
                }
            }
        }

        for creator_id in creator_ids {
            let creator_name = resolve_creator_name(state, creator_id)
                .await
                .unwrap_or_else(|| "Creator".to_string());
            log_activity_event_with_subject(
                state,
                brand_id,
                None,
                "brand",
                brand_name,
                "job.invite.sent",
                format!(
                    "{} invited {} to apply for job {}.",
                    brand_name, creator_name, job_title
                ),
                "job_postings",
                Some(job_id),
            )
            .await;
        }
    }

    // Send emails (fire and forget to not block API response unnecessarily)
    for email in all_emails {
        let _ =
            crate::email::send_plain_text_email(state, &email, &subject, &body, Some(brand_name));
    }
}
