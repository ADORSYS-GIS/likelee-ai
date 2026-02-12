use crate::{auth::AuthUser, auth::RoleGuard, config::AppState};
use axum::{
    extract::{Multipart, Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::Datelike;
use serde::Serialize;
use serde_json::json;
use std::collections::HashMap;
use tracing::warn;

#[derive(Debug, serde::Deserialize)]
pub struct ListTalentNotificationsQuery {
    pub limit: Option<u32>,
}

#[derive(Debug, serde::Deserialize)]
pub struct UpdatePortalSettingsPayload {
    pub allow_training: Option<bool>,
    pub public_profile_visible: Option<bool>,
}

pub async fn get_portal_settings(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    RoleGuard::new(vec!["creator", "talent"]).check(&user.role)?;
    let resolved = resolve_talent(&state, &user).await?;

    let resp = state
        .pg
        .from("talent_portal_settings")
        .select("talent_id,allow_training,public_profile_visible,updated_at")
        .eq("talent_id", &resolved.talent_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }
    let txt = resp.text().await.unwrap_or("[]".into());
    let rows: serde_json::Value = serde_json::from_str(&txt).unwrap_or(json!([]));
    if let Some(first) = rows.as_array().and_then(|a| a.first()).cloned() {
        return Ok(Json(first));
    }

    // Default row if none exists yet
    Ok(Json(json!({
        "talent_id": resolved.talent_id,
        "allow_training": false,
        "public_profile_visible": true,
    })))
}

pub async fn update_portal_settings(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<UpdatePortalSettingsPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    RoleGuard::new(vec!["creator", "talent"]).check(&user.role)?;
    let resolved = resolve_talent(&state, &user).await?;

    let row = json!({
        "talent_id": resolved.talent_id,
        "allow_training": payload.allow_training,
        "public_profile_visible": payload.public_profile_visible,
        "updated_at": chrono::Utc::now().to_rfc3339(),
    });

    let resp = state
        .pg
        .from("talent_portal_settings")
        .upsert(row.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    // Mirror public visibility to creators table (marketplace search filter)
    if let Some(vis) = payload.public_profile_visible {
        // agency_users has creator_id; best-effort update
        let au_resp = state
            .pg
            .from("agency_users")
            .select("creator_id,user_id")
            .eq("id", &resolved.talent_id)
            .single()
            .execute()
            .await
            .ok();
        if let Some(au_resp) = au_resp {
            if au_resp.status().is_success() {
                if let Ok(txt) = au_resp.text().await {
                    if let Ok(v) = serde_json::from_str::<serde_json::Value>(&txt) {
                        let cid = v
                            .get("creator_id")
                            .and_then(|x| x.as_str())
                            .or_else(|| v.get("user_id").and_then(|x| x.as_str()))
                            .unwrap_or("")
                            .to_string();
                        if !cid.is_empty() {
                            let _ = state
                                .pg
                                .from("creators")
                                .eq("id", &cid)
                                .update(json!({"public_profile_visible": vis}).to_string())
                                .execute()
                                .await;
                        }
                    }
                }
            }
        }
    }

    Ok(Json(json!({"status":"ok"})))
}

#[derive(Debug, serde::Deserialize)]
pub struct BookingPreferencesPayload {
    pub willing_to_travel: Option<bool>,
    pub min_day_rate_cents: Option<i32>,
    pub currency: Option<String>,
    pub agency_id: Option<String>,
}

#[derive(Debug, serde::Deserialize)]
pub struct BookingPreferencesQuery {
    pub agency_id: Option<String>,
}

pub async fn get_booking_preferences(
    State(state): State<AppState>,
    user: AuthUser,
    Query(q): Query<BookingPreferencesQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    RoleGuard::new(vec!["creator", "talent"]).check(&user.role)?;
    let connections = list_active_talent_connections(&state, &user).await?;
    let ids = connected_agency_ids_from_connections(&connections);
    let resolved = if let Some(aid) = q.agency_id.as_ref().filter(|s| !s.trim().is_empty()) {
        if !ids.iter().any(|x| x == aid) {
            return Err((StatusCode::FORBIDDEN, "not connected to agency".to_string()));
        }
        resolve_talent_for_agency(&state, &user, aid).await?
    } else {
        if ids.len() > 1 {
            return Err((
                StatusCode::BAD_REQUEST,
                "agency_id is required when connected to multiple agencies".to_string(),
            ));
        }
        resolve_talent(&state, &user).await?
    };

    let resp = state
        .pg
        .from("talent_booking_preferences")
        .select("talent_id,agency_id,willing_to_travel,min_day_rate_cents,currency,created_at,updated_at")
        .eq("talent_id", &resolved.talent_id)
        .eq("agency_id", &resolved.agency_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }
    let txt = resp.text().await.unwrap_or_else(|_| "[]".into());
    let rows: serde_json::Value = serde_json::from_str(&txt).unwrap_or(json!([]));
    if let Some(first) = rows.as_array().and_then(|a| a.first()).cloned() {
        return Ok(Json(first));
    }

    Ok(Json(json!({
        "talent_id": resolved.talent_id,
        "agency_id": resolved.agency_id,
        "willing_to_travel": false,
        "min_day_rate_cents": null,
        "currency": "USD"
    })))
}

pub async fn update_booking_preferences(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<BookingPreferencesPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    RoleGuard::new(vec!["creator", "talent"]).check(&user.role)?;
    let connections = list_active_talent_connections(&state, &user).await?;
    let ids = connected_agency_ids_from_connections(&connections);
    let resolved = if let Some(aid) = payload.agency_id.as_ref().filter(|s| !s.trim().is_empty()) {
        if !ids.iter().any(|x| x == aid) {
            return Err((StatusCode::FORBIDDEN, "not connected to agency".to_string()));
        }
        resolve_talent_for_agency(&state, &user, aid).await?
    } else {
        if ids.len() > 1 {
            return Err((
                StatusCode::BAD_REQUEST,
                "agency_id is required when connected to multiple agencies".to_string(),
            ));
        }
        resolve_talent(&state, &user).await?
    };

    let row = json!({
        "talent_id": resolved.talent_id,
        "agency_id": resolved.agency_id,
        "willing_to_travel": payload.willing_to_travel,
        "min_day_rate_cents": payload.min_day_rate_cents,
        "currency": payload.currency,
        "updated_at": chrono::Utc::now().to_rfc3339(),
    });

    let resp = state
        .pg
        .from("talent_booking_preferences")
        .upsert(row.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    Ok(Json(json!({"status":"ok"})))
}

#[derive(Debug, serde::Deserialize)]
pub struct ListIrlPaymentsQuery {
    pub limit: Option<u32>,
    pub agency_id: Option<String>,
}

pub async fn list_irl_payments(
    State(state): State<AppState>,
    user: AuthUser,
    Query(q): Query<ListIrlPaymentsQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    RoleGuard::new(vec!["creator", "talent"]).check(&user.role)?;
    let resolved = resolve_talent(&state, &user).await?;
    let connections = list_active_talent_connections(&state, &user).await?;
    let ids = connected_agency_ids_from_connections(&connections);
    if ids.is_empty() {
        return Ok(Json(json!([])));
    }
    let ids_refs: Vec<&str> = ids.iter().map(|s| s.as_str()).collect();
    let limit = q.limit.unwrap_or(50).min(200) as usize;

    let mut req = state
        .pg
        .from("talent_irl_payments")
        .select("id,agency_id,talent_id,booking_id,amount_cents,currency,paid_at,status,source,notes,created_at")
        .eq("talent_id", &resolved.talent_id)
        .in_("agency_id", ids_refs)
        .order("paid_at.desc")
        .order("created_at.desc")
        .limit(limit);
    if let Some(aid) = q.agency_id.as_ref().filter(|s| !s.trim().is_empty()) {
        if !ids.iter().any(|x| x == aid) {
            return Err((StatusCode::FORBIDDEN, "not connected to agency".to_string()));
        }
        req = req.eq("agency_id", aid);
    }

    let resp = req
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }
    let text = resp.text().await.unwrap_or_else(|_| "[]".into());
    let v: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!([]));
    Ok(Json(v))
}

pub async fn get_irl_earnings_summary(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    RoleGuard::new(vec!["creator", "talent"]).check(&user.role)?;
    let resolved = resolve_talent(&state, &user).await?;

    let summary = compute_irl_earnings_summary(&state, &resolved).await?;
    Ok(Json(summary))
}

async fn compute_irl_earnings_summary(
    state: &AppState,
    resolved: &ResolvedTalent,
) -> Result<serde_json::Value, (StatusCode, String)> {
    // Pull recent paid ledger rows and compute balances server-side.
    // Note: PostgREST doesn't support server-side aggregates here in our wrapper; keep it simple.
    let resp = state
        .pg
        .from("talent_irl_payments")
        .select("amount_cents,currency,status")
        .eq("talent_id", &resolved.talent_id)
        .limit(2000)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }
    let text = resp.text().await.unwrap_or_else(|_| "[]".into());
    let rows: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!([]));
    let arr = rows.as_array().cloned().unwrap_or_default();

    let mut total_paid_cents: i64 = 0;
    let mut currency: String = "USD".to_string();
    for r in arr.iter() {
        let status = r
            .get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("pending");
        if status != "paid" {
            continue;
        }
        if let Some(c) = r.get("currency").and_then(|v| v.as_str()) {
            if !c.trim().is_empty() {
                currency = c.to_string();
            }
        }
        let amt = r.get("amount_cents").and_then(|v| v.as_i64()).unwrap_or(0);
        total_paid_cents += amt;
    }

    // Compute requested payouts (requested/processing/paid) to determine withdrawable.
    let pr = state
        .pg
        .from("talent_irl_payout_requests")
        .select("amount_cents,currency,status")
        .eq("talent_id", &resolved.talent_id)
        .limit(2000)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !pr.status().is_success() {
        let err = pr.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }
    let pr_text = pr.text().await.unwrap_or_else(|_| "[]".into());
    let pr_rows: serde_json::Value = serde_json::from_str(&pr_text).unwrap_or(json!([]));
    let pr_arr = pr_rows.as_array().cloned().unwrap_or_default();

    let mut payouts_reserved_cents: i64 = 0;
    for r in pr_arr.iter() {
        let status = r
            .get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("requested");
        if status == "failed" || status == "cancelled" {
            continue;
        }
        let amt = r.get("amount_cents").and_then(|v| v.as_i64()).unwrap_or(0);
        payouts_reserved_cents += amt;
    }

    let withdrawable_cents = (total_paid_cents - payouts_reserved_cents).max(0);

    Ok(json!({
        "talent_id": resolved.talent_id,
        "currency": currency,
        "total_paid_cents": total_paid_cents,
        "payouts_reserved_cents": payouts_reserved_cents,
        "withdrawable_cents": withdrawable_cents,
    }))
}

#[derive(Debug, serde::Deserialize)]
pub struct CreateIrlPayoutRequestPayload {
    pub amount_cents: i64,
    pub currency: Option<String>,
}

pub async fn create_irl_payout_request(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<CreateIrlPayoutRequestPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    RoleGuard::new(vec!["creator", "talent"]).check(&user.role)?;
    let resolved = resolve_talent(&state, &user).await?;
    if payload.amount_cents <= 0 {
        return Err((StatusCode::BAD_REQUEST, "amount_cents must be > 0".into()));
    }

    let summary = compute_irl_earnings_summary(&state, &resolved).await?;
    let withdrawable = summary
        .get("withdrawable_cents")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);
    if payload.amount_cents > withdrawable {
        return Err((
            StatusCode::BAD_REQUEST,
            "amount exceeds withdrawable".into(),
        ));
    }

    let currency = payload
        .currency
        .clone()
        .filter(|s| !s.trim().is_empty())
        .or_else(|| {
            summary
                .get("currency")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        })
        .unwrap_or_else(|| "USD".to_string());

    let row = json!({
        "agency_id": resolved.agency_id,
        "talent_id": resolved.talent_id,
        "amount_cents": payload.amount_cents,
        "currency": currency,
        "status": "requested",
    });
    let resp = state
        .pg
        .from("talent_irl_payout_requests")
        .insert(row.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }
    let text = resp.text().await.unwrap_or_else(|_| "[]".into());
    let v: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!({"ok": true}));
    Ok(Json(v))
}

pub async fn upload_portfolio_item(
    State(state): State<AppState>,
    user: AuthUser,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    RoleGuard::new(vec!["creator", "talent"]).check(&user.role)?;
    let connections = list_active_talent_connections(&state, &user).await?;
    let ids = connected_agency_ids_from_connections(&connections);

    let mut agency_id_override: Option<String> = None;

    let mut title: Option<String> = None;
    let mut file_name: Option<String> = None;
    let mut mime_type: Option<String> = None;
    let mut bytes: Vec<u8> = vec![];

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?
    {
        let name = field.name().unwrap_or("").to_string();
        match name.as_str() {
            "agency_id" => {
                let txt = field
                    .text()
                    .await
                    .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
                if !txt.trim().is_empty() {
                    agency_id_override = Some(txt);
                }
            }
            "title" => {
                let txt = field
                    .text()
                    .await
                    .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
                if !txt.trim().is_empty() {
                    title = Some(txt);
                }
            }
            "file" => {
                file_name = field.file_name().map(|s| s.to_string());
                mime_type = field.content_type().map(|s| s.to_string());
                let data = field
                    .bytes()
                    .await
                    .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
                bytes = data.to_vec();
            }
            _ => {}
        }
    }

    if bytes.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "missing file".into()));
    }

    let resolved = if let Some(aid) = agency_id_override.as_ref().filter(|s| !s.trim().is_empty()) {
        if !ids.iter().any(|x| x == aid) {
            return Err((StatusCode::FORBIDDEN, "not connected to agency".to_string()));
        }
        resolve_talent_for_agency(&state, &user, aid).await?
    } else {
        if ids.len() > 1 {
            return Err((
                StatusCode::BAD_REQUEST,
                "agency_id is required when connected to multiple agencies".to_string(),
            ));
        }
        resolve_talent(&state, &user).await?
    };

    let fname = file_name.unwrap_or_else(|| "upload.bin".to_string());
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

    // Use PUBLIC bucket so the UI can render without signed URLs.
    let bucket = state.supabase_bucket_public.clone();
    let path = format!(
        "talent/{}/portfolio/{}_{}",
        resolved.talent_id,
        chrono::Utc::now().timestamp_millis(),
        sanitized
    );

    let storage_url = format!(
        "{}/storage/v1/object/{}/{}",
        state.supabase_url, bucket, path
    );
    let http = reqwest::Client::new();
    let mut req = http
        .post(&storage_url)
        .header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        )
        .header("apikey", state.supabase_service_key.clone());
    if let Some(ct) = mime_type.as_ref().filter(|s| !s.is_empty()) {
        req = req.header("content-type", ct.clone());
    }
    let up = req
        .body(bytes.clone())
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

    let public_url = format!(
        "{}/storage/v1/object/public/{}/{}",
        state.supabase_url, bucket, path
    );

    let body = json!({
        "agency_id": resolved.agency_id,
        "talent_id": resolved.talent_id,
        "title": title,
        "media_url": public_url,
        "status": "live",
        "storage_bucket": bucket,
        "storage_path": path,
        "public_url": public_url,
        "size_bytes": bytes.len() as i64,
        "mime_type": mime_type,
    });

    let resp = state
        .pg
        .from("talent_portfolio_items")
        .insert(body.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }
    let text = resp.text().await.unwrap_or_else(|_| "[]".into());
    let v: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!({"ok": true}));
    Ok(Json(v))
}

#[derive(Debug, serde::Deserialize)]
pub struct LatestTaxDocumentQuery {
    pub doc_type: Option<String>,
    pub tax_year: Option<i32>,
}

pub async fn get_latest_tax_document(
    State(state): State<AppState>,
    user: AuthUser,
    Query(q): Query<LatestTaxDocumentQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    RoleGuard::new(vec!["creator", "talent"]).check(&user.role)?;
    let resolved = resolve_talent(&state, &user).await?;

    let mut req = state
        .pg
        .from("talent_tax_documents")
        .select("id,talent_id,doc_type,tax_year,public_url,created_at")
        .eq("talent_id", &resolved.talent_id);
    if let Some(dt) = q.doc_type {
        if !dt.trim().is_empty() {
            req = req.eq("doc_type", dt);
        }
    }
    if let Some(y) = q.tax_year {
        req = req.eq("tax_year", y.to_string());
    }

    let resp = req
        .order("created_at.desc")
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }
    let txt = resp.text().await.unwrap_or("[]".into());
    let rows: serde_json::Value = serde_json::from_str(&txt).unwrap_or(json!([]));
    if let Some(first) = rows.as_array().and_then(|a| a.first()).cloned() {
        return Ok(Json(first));
    }
    Ok(Json(json!({})))
}

pub async fn list_notifications(
    State(state): State<AppState>,
    user: AuthUser,
    Query(q): Query<ListTalentNotificationsQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    RoleGuard::new(vec!["creator", "talent"]).check(&user.role)?;
    let limit = q.limit.unwrap_or(50).min(200);

    let resp = state
        .pg
        .from("talent_notifications")
        .select("id,agency_id,channel,from_label,subject,message,meta_json,read_at,created_at")
        .eq("talent_user_id", &user.id)
        .order("created_at.desc")
        .limit(limit as usize)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}

pub async fn mark_notification_read(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    RoleGuard::new(vec!["creator", "talent"]).check(&user.role)?;
    let v = json!({
        "read_at": chrono::Utc::now().to_rfc3339(),
    });

    let resp = state
        .pg
        .from("talent_notifications")
        .eq("id", &id)
        .eq("talent_user_id", &user.id)
        .update(v.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    Ok(Json(json!({"status":"ok"})))
}

#[derive(Serialize)]
pub struct TalentMeResponse {
    pub status: String,
    pub agency_user: serde_json::Value,
    pub connected_agencies: Vec<serde_json::Value>,
    pub connected_agency_ids: Vec<String>,
}

#[derive(Clone)]
struct ResolvedTalent {
    talent_id: String,
    agency_id: String,
    agency_user_row: serde_json::Value,
}

async fn list_active_talent_connections(
    state: &AppState,
    user: &AuthUser,
) -> Result<Vec<serde_json::Value>, (StatusCode, String)> {
    RoleGuard::new(vec!["creator", "talent"]).check(&user.role)?;

    let resp = state
        .pg
        .from("agency_users")
        .select("*,agencies(agency_name,logo_url)")
        .or(format!("creator_id.eq.{},user_id.eq.{}", user.id, user.id))
        .eq("status", "active")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let rows: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!([]));
    Ok(rows.as_array().cloned().unwrap_or_default())
}

fn connected_agency_ids_from_connections(connections: &[serde_json::Value]) -> Vec<String> {
    let mut out: Vec<String> = connections
        .iter()
        .filter_map(|r| {
            r.get("agency_id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        })
        .filter(|s| !s.is_empty())
        .collect();
    out.sort();
    out.dedup();
    out
}

async fn resolve_talent_for_agency(
    state: &AppState,
    user: &AuthUser,
    agency_id: &str,
) -> Result<ResolvedTalent, (StatusCode, String)> {
    let connections = list_active_talent_connections(state, user).await?;
    let row = connections
        .iter()
        .find(|r| r.get("agency_id").and_then(|v| v.as_str()) == Some(agency_id))
        .cloned()
        .unwrap_or(json!(null));

    let talent_id = row
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    if talent_id.is_empty() {
        return Err((
            StatusCode::NOT_FOUND,
            "Talent profile not found".to_string(),
        ));
    }

    Ok(ResolvedTalent {
        talent_id,
        agency_id: agency_id.to_string(),
        agency_user_row: row,
    })
}

async fn resolve_talent(
    state: &AppState,
    user: &AuthUser,
) -> Result<ResolvedTalent, (StatusCode, String)> {
    RoleGuard::new(vec!["creator", "talent"]).check(&user.role)?;

    let resp = state
        .pg
        .from("agency_users")
        .select("*")
        .or(format!("creator_id.eq.{},user_id.eq.{}", user.id, user.id))
        .eq("status", "active")
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut rows: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!([]));
    let row = rows
        .as_array_mut()
        .and_then(|a| a.pop())
        .unwrap_or(json!(null));

    let talent_id = row
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    if talent_id.is_empty() {
        return Err((
            StatusCode::NOT_FOUND,
            "Talent profile not found".to_string(),
        ));
    }

    let agency_id = row
        .get("agency_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    Ok(ResolvedTalent {
        talent_id,
        agency_id,
        agency_user_row: row,
    })
}

pub async fn talent_me(
    State(state): State<AppState>,
    user: AuthUser,
    Query(q): Query<std::collections::HashMap<String, String>>,
) -> Result<Json<TalentMeResponse>, (StatusCode, String)> {
    let connections = list_active_talent_connections(&state, &user).await?;
    let connected_agency_ids: Vec<String> = connections
        .iter()
        .filter_map(|r| {
            r.get("agency_id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        })
        .filter(|s| !s.is_empty())
        .collect();

    let requested_agency_id = q
        .get("agency_id")
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string());
    let resolved = if let Some(ref aid) = requested_agency_id {
        resolve_talent_for_agency(&state, &user, aid).await?
    } else {
        resolve_talent(&state, &user).await?
    };
    let row = resolved.agency_user_row;
    Ok(Json(TalentMeResponse {
        status: "ok".to_string(),
        agency_user: row,
        connected_agencies: connections,
        connected_agency_ids,
    }))
}

#[derive(Serialize)]
pub struct TalentLicensingRequestItem {
    pub id: String,
    pub brand_id: Option<String>,
    pub brand_name: Option<String>,
    pub campaign_title: Option<String>,
    pub budget_min: Option<f64>,
    pub budget_max: Option<f64>,
    pub usage_scope: Option<String>,
    pub regions: Option<String>,
    pub deadline: Option<String>,
    pub license_start_date: Option<String>,
    pub license_end_date: Option<String>,
    pub created_at: Option<String>,
    pub status: String,
    pub pay_set: bool,
}

pub async fn list_licensing_requests(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<Vec<TalentLicensingRequestItem>>, (StatusCode, String)> {
    let resolved = resolve_talent(&state, &user).await?;

    let resp = state
        .pg
        .from("licensing_requests")
        .select("id,brand_id,talent_id,status,created_at,campaign_title,budget_min,budget_max,usage_scope,regions,deadline,license_start_date,license_end_date")
        .eq("agency_id", &resolved.agency_id)
        .eq("talent_id", &resolved.talent_id)
        .order("created_at.desc")
        .limit(250)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let rows: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!([]));
    let reqs = rows.as_array().cloned().unwrap_or_default();

    let mut brand_ids: Vec<String> = reqs
        .iter()
        .filter_map(|r| {
            r.get("brand_id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        })
        .filter(|s| !s.is_empty())
        .collect();
    brand_ids.sort();
    brand_ids.dedup();

    let mut brand_name_by_id: HashMap<String, String> = HashMap::new();
    if !brand_ids.is_empty() {
        let ids: Vec<&str> = brand_ids.iter().map(|s| s.as_str()).collect();
        let b_resp = state
            .pg
            .from("brands")
            .select("id,company_name")
            .in_("id", ids)
            .execute()
            .await;
        if let Ok(b_resp) = b_resp {
            if b_resp.status().is_success() {
                let b_text = b_resp.text().await.unwrap_or_else(|_| "[]".into());
                let b_rows: serde_json::Value = serde_json::from_str(&b_text).unwrap_or(json!([]));
                if let Some(arr) = b_rows.as_array() {
                    for r in arr {
                        let id = r.get("id").and_then(|v| v.as_str()).unwrap_or("");
                        let name = r.get("company_name").and_then(|v| v.as_str()).unwrap_or("");
                        if !id.is_empty() {
                            brand_name_by_id.insert(id.to_string(), name.to_string());
                        }
                    }
                }
            }
        }
    }

    let mut request_ids: Vec<String> = reqs
        .iter()
        .filter_map(|r| r.get("id").and_then(|v| v.as_str()).map(|s| s.to_string()))
        .filter(|s| !s.is_empty())
        .collect();
    request_ids.sort();
    request_ids.dedup();

    let mut pay_set_request_ids: std::collections::HashSet<String> =
        std::collections::HashSet::new();
    if !request_ids.is_empty() {
        let ids: Vec<&str> = request_ids.iter().map(|s| s.as_str()).collect();
        let c_resp = state
            .pg
            .from("campaigns")
            .select("licensing_request_id,payment_amount")
            .in_("licensing_request_id", ids)
            .execute()
            .await;
        if let Ok(c_resp) = c_resp {
            if c_resp.status().is_success() {
                let c_text = c_resp.text().await.unwrap_or_else(|_| "[]".into());
                let c_rows: serde_json::Value = serde_json::from_str(&c_text).unwrap_or(json!([]));
                if let Some(arr) = c_rows.as_array() {
                    for r in arr {
                        let lrid = r
                            .get("licensing_request_id")
                            .and_then(|v| v.as_str())
                            .unwrap_or("");
                        if lrid.is_empty() {
                            continue;
                        }
                        let has_payment = r
                            .get("payment_amount")
                            .map(|v| !v.is_null())
                            .unwrap_or(false);
                        if has_payment {
                            pay_set_request_ids.insert(lrid.to_string());
                        }
                    }
                }
            }
        }
    }

    let out: Vec<TalentLicensingRequestItem> = reqs
        .iter()
        .filter_map(|r| {
            let id = r
                .get("id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            if id.is_empty() {
                return None;
            }
            let brand_id = r
                .get("brand_id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .filter(|s| !s.is_empty());
            let brand_name = brand_id
                .as_ref()
                .and_then(|bid| brand_name_by_id.get(bid).cloned());
            let status = r
                .get("status")
                .and_then(|v| v.as_str())
                .unwrap_or("pending")
                .to_string();

            Some(TalentLicensingRequestItem {
                id: id.clone(),
                brand_id,
                brand_name,
                campaign_title: r
                    .get("campaign_title")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
                    .filter(|s| !s.is_empty()),
                budget_min: r.get("budget_min").and_then(|v| v.as_f64()),
                budget_max: r.get("budget_max").and_then(|v| v.as_f64()),
                usage_scope: r
                    .get("usage_scope")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
                    .filter(|s| !s.is_empty()),
                regions: r
                    .get("regions")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
                    .filter(|s| !s.is_empty()),
                deadline: r
                    .get("deadline")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
                    .filter(|s| !s.is_empty()),
                license_start_date: r
                    .get("license_start_date")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
                    .filter(|s| !s.is_empty()),
                license_end_date: r
                    .get("license_end_date")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
                    .filter(|s| !s.is_empty()),
                created_at: r
                    .get("created_at")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
                    .filter(|s| !s.is_empty()),
                status,
                pay_set: pay_set_request_ids.contains(&id),
            })
        })
        .collect();

    Ok(Json(out))
}

pub async fn approve_licensing_request(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resolved = resolve_talent(&state, &user).await?;

    let v = json!({
        "status": "approved",
        "decided_at": chrono::Utc::now().to_rfc3339(),
    });

    let mut req = state
        .pg
        .from("licensing_requests")
        .eq("id", &id)
        .eq("talent_id", &resolved.talent_id);
    if !resolved.agency_id.is_empty() {
        req = req.eq("agency_id", &resolved.agency_id);
    }

    let resp = req
        .update(v.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }
    Ok(Json(json!({"status":"ok"})))
}

pub async fn decline_licensing_request(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resolved = resolve_talent(&state, &user).await?;

    let v = json!({
        "status": "declined",
        "decided_at": chrono::Utc::now().to_rfc3339(),
    });

    let mut req = state
        .pg
        .from("licensing_requests")
        .eq("id", &id)
        .eq("talent_id", &resolved.talent_id);
    if !resolved.agency_id.is_empty() {
        req = req.eq("agency_id", &resolved.agency_id);
    }

    let resp = req
        .update(v.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }
    Ok(Json(json!({"status":"ok"})))
}

pub async fn list_licenses_stub(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<Vec<serde_json::Value>>, (StatusCode, String)> {
    let resolved = resolve_talent(&state, &user).await?;

    let mut req = state
        .pg
        .from("brand_licenses")
        .select("id,brand_org_id,agency_id,talent_id,type,status,start_at,end_at,compliance_status,created_at,updated_at")
        .eq("talent_id", &resolved.talent_id);
    if !resolved.agency_id.is_empty() {
        req = req.eq("agency_id", &resolved.agency_id);
    }

    let resp = req
        .order("created_at.desc")
        .limit(250)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let mut rows: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!([]));
    let licenses = rows.as_array_mut().cloned().unwrap_or_default();

    let mut brand_ids: Vec<String> = licenses
        .iter()
        .filter_map(|r| {
            r.get("brand_org_id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        })
        .filter(|s| !s.is_empty())
        .collect();
    brand_ids.sort();
    brand_ids.dedup();

    let mut brand_name_by_id: HashMap<String, String> = HashMap::new();
    if !brand_ids.is_empty() {
        let ids: Vec<&str> = brand_ids.iter().map(|s| s.as_str()).collect();
        let b_resp = state
            .pg
            .from("brands")
            .select("id,company_name")
            .in_("id", ids)
            .execute()
            .await;
        if let Ok(b_resp) = b_resp {
            if b_resp.status().is_success() {
                let b_text = b_resp.text().await.unwrap_or_else(|_| "[]".into());
                let b_rows: serde_json::Value = serde_json::from_str(&b_text).unwrap_or(json!([]));
                if let Some(arr) = b_rows.as_array() {
                    for r in arr {
                        let id = r.get("id").and_then(|v| v.as_str()).unwrap_or("");
                        let name = r.get("company_name").and_then(|v| v.as_str()).unwrap_or("");
                        if !id.is_empty() {
                            brand_name_by_id.insert(id.to_string(), name.to_string());
                        }
                    }
                }
            }
        }
    }

    let out: Vec<serde_json::Value> = licenses
        .into_iter()
        .map(|mut r| {
            let bid = r
                .get("brand_org_id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            if let (Some(obj), Some(name)) = (r.as_object_mut(), brand_name_by_id.get(&bid)) {
                obj.insert("brand_name".to_string(), json!(name));
            }
            r
        })
        .collect();

    Ok(Json(out))
}

#[derive(Serialize)]
pub struct TalentLicensingRevenueResponse {
    pub month: String,
    pub total_cents: i64,
}

#[derive(Serialize)]
pub struct TalentEarningsByCampaignItem {
    pub brand_id: String,
    pub brand_name: Option<String>,
    pub monthly_cents: i64,
}

#[derive(Serialize)]
pub struct TalentAnalyticsKpis {
    pub total_views: i64,
    pub views_change_pct: f64,
    pub total_revenue_cents: i64,
    pub active_campaigns: i64,
}

#[derive(Serialize)]
pub struct TalentAnalyticsCampaignItem {
    pub brand_id: String,
    pub brand_name: Option<String>,
    pub views_week: i64,
    pub revenue_cents: i64,
}

#[derive(Serialize)]
pub struct TalentAnalyticsRoiTraditional {
    pub per_post_cents: i64,
    pub time_investment: String,
    pub posts_per_month: String,
    pub monthly_earnings_range: String,
}

#[derive(Serialize)]
pub struct TalentAnalyticsRoiAi {
    pub per_campaign_cents: i64,
    pub time_investment: String,
    pub active_campaigns: i64,
    pub monthly_earnings_cents: i64,
}

#[derive(Serialize)]
pub struct TalentAnalyticsRoi {
    pub traditional: TalentAnalyticsRoiTraditional,
    pub ai: TalentAnalyticsRoiAi,
    pub message: String,
}

#[derive(Serialize)]
pub struct TalentAnalyticsResponse {
    pub month: String,
    pub kpis: TalentAnalyticsKpis,
    pub campaigns: Vec<TalentAnalyticsCampaignItem>,
    pub roi: TalentAnalyticsRoi,
}

fn parse_month_bounds_date(month: &str) -> Option<(chrono::NaiveDate, chrono::NaiveDate)> {
    let t = month.trim();
    if t.len() != 7 {
        return None;
    }
    let (y, m) = t.split_at(4);
    let y: i32 = y.parse().ok()?;
    if &m[0..1] != "-" {
        return None;
    }
    let mm: u32 = m[1..].parse().ok()?;
    if !(1..=12).contains(&mm) {
        return None;
    }
    let start = chrono::NaiveDate::from_ymd_opt(y, mm, 1)?;
    let next = if mm == 12 {
        chrono::NaiveDate::from_ymd_opt(y + 1, 1, 1)?
    } else {
        chrono::NaiveDate::from_ymd_opt(y, mm + 1, 1)?
    };
    Some((start, next))
}

fn parse_month_bounds(month: &str) -> Option<(String, String)> {
    let t = month.trim();
    if t.len() != 7 {
        return None;
    }
    let (y, m) = t.split_at(4);
    let y: i32 = y.parse().ok()?;
    if &m[0..1] != "-" {
        return None;
    }
    let mm: u32 = m[1..].parse().ok()?;
    if !(1..=12).contains(&mm) {
        return None;
    }

    let start = chrono::NaiveDate::from_ymd_opt(y, mm, 1)?;
    let next = if mm == 12 {
        chrono::NaiveDate::from_ymd_opt(y + 1, 1, 1)?
    } else {
        chrono::NaiveDate::from_ymd_opt(y, mm + 1, 1)?
    };

    let start_ts = format!("{}T00:00:00Z", start.format("%Y-%m-%d"));
    let next_ts = format!("{}T00:00:00Z", next.format("%Y-%m-%d"));
    Some((start_ts, next_ts))
}

pub async fn get_licensing_revenue(
    State(state): State<AppState>,
    user: AuthUser,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Result<Json<TalentLicensingRevenueResponse>, (StatusCode, String)> {
    let resolved = resolve_talent(&state, &user).await?;
    let month = params
        .get("month")
        .cloned()
        .unwrap_or_else(|| "".to_string());

    let bounds = if month.trim().is_empty() {
        None
    } else {
        Some(
            parse_month_bounds(&month)
                .ok_or((StatusCode::BAD_REQUEST, "Invalid month".to_string()))?,
        )
    };

    let mut req = state
        .pg
        .from("licensing_payouts")
        .select("amount_cents,paid_at")
        .eq("talent_id", &resolved.talent_id)
        .limit(5000);
    if !resolved.agency_id.is_empty() {
        req = req.eq("agency_id", &resolved.agency_id);
    }

    if let Some((start_ts, next_ts)) = bounds {
        req = req.gte("paid_at", &start_ts).lt("paid_at", &next_ts);
    }

    let resp = req
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let rows: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!([]));
    let mut total: i64 = 0;
    if let Some(arr) = rows.as_array() {
        for r in arr {
            let cents = r
                .get("amount_cents")
                .and_then(|v| {
                    v.as_i64()
                        .or_else(|| v.as_str().and_then(|s| s.parse::<i64>().ok()))
                })
                .unwrap_or(0);
            total += cents;
        }
    }

    Ok(Json(TalentLicensingRevenueResponse {
        month,
        total_cents: total,
    }))
}

pub async fn get_earnings_by_campaign(
    State(state): State<AppState>,
    user: AuthUser,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Result<Json<Vec<TalentEarningsByCampaignItem>>, (StatusCode, String)> {
    let resolved = resolve_talent(&state, &user).await?;
    let month = params
        .get("month")
        .cloned()
        .unwrap_or_else(|| "".to_string());

    let bounds = if month.trim().is_empty() {
        None
    } else {
        Some(
            parse_month_bounds(&month)
                .ok_or((StatusCode::BAD_REQUEST, "Invalid month".to_string()))?,
        )
    };

    let mut req = state
        .pg
        .from("licensing_payouts")
        .select("amount_cents,licensing_request_id")
        .eq("talent_id", &resolved.talent_id)
        .limit(5000);
    if !resolved.agency_id.is_empty() {
        req = req.eq("agency_id", &resolved.agency_id);
    }

    if let Some((start_ts, next_ts)) = bounds {
        req = req.gte("paid_at", &start_ts).lt("paid_at", &next_ts);
    }

    let resp = req
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let rows: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!([]));

    let mut request_ids: Vec<String> = Vec::new();
    if let Some(arr) = rows.as_array() {
        for r in arr {
            if let Some(id) = r
                .get("licensing_request_id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
            {
                if !id.is_empty() {
                    request_ids.push(id);
                }
            }
        }
    }
    request_ids.sort();
    request_ids.dedup();

    let mut brand_id_by_request_id: HashMap<String, String> = HashMap::new();
    if !request_ids.is_empty() {
        let ids: Vec<&str> = request_ids.iter().map(|s| s.as_str()).collect();
        let r_resp = state
            .pg
            .from("licensing_requests")
            .select("id,brand_id")
            .in_("id", ids)
            .execute()
            .await;
        if let Ok(r_resp) = r_resp {
            if r_resp.status().is_success() {
                let r_text = r_resp.text().await.unwrap_or_else(|_| "[]".into());
                let r_rows: serde_json::Value = serde_json::from_str(&r_text).unwrap_or(json!([]));
                if let Some(arr) = r_rows.as_array() {
                    for r in arr {
                        let rid = r.get("id").and_then(|v| v.as_str()).unwrap_or("");
                        let bid = r.get("brand_id").and_then(|v| v.as_str()).unwrap_or("");
                        if !rid.is_empty() && !bid.is_empty() {
                            brand_id_by_request_id.insert(rid.to_string(), bid.to_string());
                        }
                    }
                }
            }
        }
    }

    let mut cents_by_brand_id: HashMap<String, i64> = HashMap::new();
    if let Some(arr) = rows.as_array() {
        for r in arr {
            let cents = r
                .get("amount_cents")
                .and_then(|v| {
                    v.as_i64()
                        .or_else(|| v.as_str().and_then(|s| s.parse::<i64>().ok()))
                })
                .unwrap_or(0);
            let rid = r
                .get("licensing_request_id")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            if cents <= 0 || rid.is_empty() {
                continue;
            }
            let Some(bid) = brand_id_by_request_id.get(rid) else {
                continue;
            };
            *cents_by_brand_id.entry(bid.clone()).or_insert(0) += cents;
        }
    }

    let mut brand_ids: Vec<String> = cents_by_brand_id.keys().cloned().collect();
    brand_ids.sort();
    brand_ids.dedup();

    let mut brand_name_by_id: HashMap<String, String> = HashMap::new();
    if !brand_ids.is_empty() {
        let ids: Vec<&str> = brand_ids.iter().map(|s| s.as_str()).collect();
        let b_resp = state
            .pg
            .from("brands")
            .select("id,company_name")
            .in_("id", ids)
            .execute()
            .await;
        if let Ok(b_resp) = b_resp {
            if b_resp.status().is_success() {
                let b_text = b_resp.text().await.unwrap_or_else(|_| "[]".into());
                let b_rows: serde_json::Value = serde_json::from_str(&b_text).unwrap_or(json!([]));
                if let Some(arr) = b_rows.as_array() {
                    for r in arr {
                        let id = r.get("id").and_then(|v| v.as_str()).unwrap_or("");
                        let name = r.get("company_name").and_then(|v| v.as_str()).unwrap_or("");
                        if !id.is_empty() {
                            brand_name_by_id.insert(id.to_string(), name.to_string());
                        }
                    }
                }
            }
        }
    }

    let mut out: Vec<TalentEarningsByCampaignItem> = cents_by_brand_id
        .into_iter()
        .map(|(brand_id, monthly_cents)| TalentEarningsByCampaignItem {
            brand_name: brand_name_by_id.get(&brand_id).cloned(),
            brand_id,
            monthly_cents,
        })
        .collect();
    out.sort_by(|a, b| b.monthly_cents.cmp(&a.monthly_cents));
    Ok(Json(out))
}

pub async fn get_analytics(
    State(state): State<AppState>,
    user: AuthUser,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Result<Json<TalentAnalyticsResponse>, (StatusCode, String)> {
    let resolved = resolve_talent(&state, &user).await?;

    let month = params.get("month").cloned().unwrap_or_else(|| {
        let now = chrono::Utc::now().date_naive();
        format!("{:04}-{:02}", now.year(), now.month())
    });

    let Some((month_start, month_next)) = parse_month_bounds_date(&month) else {
        return Err((StatusCode::BAD_REQUEST, "Invalid month".to_string()));
    };

    // ---------------------------------------------------------------------
    // Revenue for month (reuse logic of get_licensing_revenue)
    // ---------------------------------------------------------------------
    let start_ts = format!("{}T00:00:00Z", month_start.format("%Y-%m-%d"));
    let next_ts = format!("{}T00:00:00Z", month_next.format("%Y-%m-%d"));
    let mut req = state
        .pg
        .from("licensing_payouts")
        .select("amount_cents,licensing_request_id,paid_at")
        .eq("talent_id", &resolved.talent_id)
        .gte("paid_at", &start_ts)
        .lt("paid_at", &next_ts)
        .limit(5000);
    if !resolved.agency_id.is_empty() {
        req = req.eq("agency_id", &resolved.agency_id);
    }

    let rev_resp = req
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !rev_resp.status().is_success() {
        let err = rev_resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }
    let rev_text = rev_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let rev_rows: serde_json::Value = serde_json::from_str(&rev_text).unwrap_or(json!([]));

    let mut total_revenue_cents: i64 = 0;
    let mut request_ids: Vec<String> = Vec::new();
    if let Some(arr) = rev_rows.as_array() {
        for r in arr {
            let cents = r
                .get("amount_cents")
                .and_then(|v| {
                    v.as_i64()
                        .or_else(|| v.as_str().and_then(|s| s.parse::<i64>().ok()))
                })
                .unwrap_or(0);
            total_revenue_cents += cents;
            if let Some(id) = r
                .get("licensing_request_id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
            {
                if !id.is_empty() {
                    request_ids.push(id);
                }
            }
        }
    }
    request_ids.sort();
    request_ids.dedup();

    // Map request_id -> brand_id
    let mut brand_id_by_request_id: HashMap<String, String> = HashMap::new();
    if !request_ids.is_empty() {
        let ids: Vec<&str> = request_ids.iter().map(|s| s.as_str()).collect();
        let r_resp = state
            .pg
            .from("licensing_requests")
            .select("id,brand_id")
            .in_("id", ids)
            .execute()
            .await;
        if let Ok(r_resp) = r_resp {
            if r_resp.status().is_success() {
                let r_text = r_resp.text().await.unwrap_or_else(|_| "[]".into());
                let r_rows: serde_json::Value = serde_json::from_str(&r_text).unwrap_or(json!([]));
                if let Some(arr) = r_rows.as_array() {
                    for r in arr {
                        let rid = r.get("id").and_then(|v| v.as_str()).unwrap_or("");
                        let bid = r.get("brand_id").and_then(|v| v.as_str()).unwrap_or("");
                        if !rid.is_empty() && !bid.is_empty() {
                            brand_id_by_request_id.insert(rid.to_string(), bid.to_string());
                        }
                    }
                }
            }
        }
    }

    // Revenue by brand
    let mut revenue_by_brand: HashMap<String, i64> = HashMap::new();
    if let Some(arr) = rev_rows.as_array() {
        for r in arr {
            let cents = r
                .get("amount_cents")
                .and_then(|v| {
                    v.as_i64()
                        .or_else(|| v.as_str().and_then(|s| s.parse::<i64>().ok()))
                })
                .unwrap_or(0);
            let rid = r
                .get("licensing_request_id")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            if rid.is_empty() {
                continue;
            }
            let Some(bid) = brand_id_by_request_id.get(rid) else {
                continue;
            };
            *revenue_by_brand.entry(bid.clone()).or_insert(0) += cents;
        }
    }

    // ---------------------------------------------------------------------
    // Views KPI (current month vs previous month) + per brand views for latest week
    // ---------------------------------------------------------------------
    let prev_month_start = (month_start - chrono::Months::new(1))
        .with_day(1)
        .unwrap_or(month_start);
    let prev_month_next = month_start;

    let metrics_resp = state
        .pg
        .from("talent_campaign_metrics_weekly")
        .select("brand_id,views_week,week_start")
        .eq("talent_id", &resolved.talent_id)
        .gte(
            "week_start",
            prev_month_start.format("%Y-%m-%d").to_string(),
        )
        .lt("week_start", month_next.format("%Y-%m-%d").to_string())
        .limit(2000)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !metrics_resp.status().is_success() {
        let err = metrics_resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }
    let metrics_text = metrics_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let metrics_rows: serde_json::Value = serde_json::from_str(&metrics_text).unwrap_or(json!([]));

    let mut total_views_this_month: i64 = 0;
    let mut total_views_prev_month: i64 = 0;
    let mut latest_week_start: Option<String> = None;
    let mut views_by_brand_latest_week: HashMap<String, i64> = HashMap::new();

    if let Some(arr) = metrics_rows.as_array() {
        for r in arr {
            let week_start = r.get("week_start").and_then(|v| v.as_str()).unwrap_or("");
            let views = r
                .get("views_week")
                .and_then(|v| {
                    v.as_i64()
                        .or_else(|| v.as_str().and_then(|s| s.parse::<i64>().ok()))
                })
                .unwrap_or(0);
            if week_start.is_empty() {
                continue;
            }

            // month KPI totals
            if week_start >= prev_month_start.format("%Y-%m-%d").to_string().as_str()
                && week_start < prev_month_next.format("%Y-%m-%d").to_string().as_str()
            {
                total_views_prev_month += views;
            }
            if week_start >= month_start.format("%Y-%m-%d").to_string().as_str()
                && week_start < month_next.format("%Y-%m-%d").to_string().as_str()
            {
                total_views_this_month += views;
            }

            // latest week
            match latest_week_start.as_ref() {
                None => latest_week_start = Some(week_start.to_string()),
                Some(cur) => {
                    if week_start > cur.as_str() {
                        latest_week_start = Some(week_start.to_string())
                    }
                }
            }
        }

        if let Some(lw) = latest_week_start.as_ref() {
            for r in arr {
                let week_start = r.get("week_start").and_then(|v| v.as_str()).unwrap_or("");
                if week_start != lw.as_str() {
                    continue;
                }
                let brand_id = r.get("brand_id").and_then(|v| v.as_str()).unwrap_or("");
                if brand_id.is_empty() {
                    continue;
                }
                let views = r
                    .get("views_week")
                    .and_then(|v| {
                        v.as_i64()
                            .or_else(|| v.as_str().and_then(|s| s.parse::<i64>().ok()))
                    })
                    .unwrap_or(0);
                *views_by_brand_latest_week
                    .entry(brand_id.to_string())
                    .or_insert(0) += views;
            }
        }
    }

    let views_change_pct: f64 = if total_views_prev_month <= 0 {
        if total_views_this_month > 0 {
            100.0
        } else {
            0.0
        }
    } else {
        ((total_views_this_month - total_views_prev_month) as f64) / (total_views_prev_month as f64)
            * 100.0
    };

    // Active campaigns derived from licensing_requests
    let lr_resp = state
        .pg
        .from("licensing_requests")
        .select("id,status")
        .eq("agency_id", &resolved.agency_id)
        .eq("talent_id", &resolved.talent_id)
        .limit(500)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let lr_text = lr_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let lr_rows: serde_json::Value = serde_json::from_str(&lr_text).unwrap_or(json!([]));
    let mut active_campaigns: i64 = 0;
    if let Some(arr) = lr_rows.as_array() {
        for r in arr {
            let s = r
                .get("status")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_lowercase();
            if s == "approved" || s == "confirmed" {
                active_campaigns += 1;
            }
        }
    }

    // Brand names for campaign list
    let mut brand_ids: Vec<String> = views_by_brand_latest_week.keys().cloned().collect();
    for k in revenue_by_brand.keys() {
        if !brand_ids.iter().any(|x| x == k) {
            brand_ids.push(k.clone());
        }
    }
    brand_ids.sort();
    brand_ids.dedup();

    let mut brand_name_by_id: HashMap<String, String> = HashMap::new();
    if !brand_ids.is_empty() {
        let ids: Vec<&str> = brand_ids.iter().map(|s| s.as_str()).collect();
        let b_resp = state
            .pg
            .from("brands")
            .select("id,company_name")
            .in_("id", ids)
            .execute()
            .await;
        if let Ok(b_resp) = b_resp {
            if b_resp.status().is_success() {
                let b_text = b_resp.text().await.unwrap_or_else(|_| "[]".into());
                let b_rows: serde_json::Value = serde_json::from_str(&b_text).unwrap_or(json!([]));
                if let Some(arr) = b_rows.as_array() {
                    for r in arr {
                        let id = r.get("id").and_then(|v| v.as_str()).unwrap_or("");
                        let name = r.get("company_name").and_then(|v| v.as_str()).unwrap_or("");
                        if !id.is_empty() {
                            brand_name_by_id.insert(id.to_string(), name.to_string());
                        }
                    }
                }
            }
        }
    }

    let mut campaigns: Vec<TalentAnalyticsCampaignItem> = brand_ids
        .iter()
        .map(|bid| TalentAnalyticsCampaignItem {
            brand_id: bid.clone(),
            brand_name: brand_name_by_id.get(bid).cloned(),
            views_week: *views_by_brand_latest_week.get(bid).unwrap_or(&0),
            revenue_cents: *revenue_by_brand.get(bid).unwrap_or(&0),
        })
        .collect();
    campaigns.sort_by(|a, b| b.revenue_cents.cmp(&a.revenue_cents));

    // ROI (constants match screenshot style)
    let traditional_min_monthly = 250_000; // $2,500
    let traditional_max_monthly = 400_000; // $4,000
    let traditional_mid = (traditional_min_monthly + traditional_max_monthly) / 2;
    let ai_monthly = total_revenue_cents;
    let per_campaign = if active_campaigns > 0 {
        ai_monthly / active_campaigns
    } else {
        0
    };
    let pct_higher = if traditional_mid > 0 {
        ((ai_monthly - traditional_mid) as f64) / (traditional_mid as f64) * 100.0
    } else {
        0.0
    };

    let message = if pct_higher.is_finite() {
        format!(
            "Your earnings are {:.0}% {} with passive AI licensing vs active UGC creation",
            pct_higher.abs(),
            if pct_higher >= 0.0 { "higher" } else { "lower" }
        )
    } else {
        "Your earnings comparison will appear here.".to_string()
    };

    Ok(Json(TalentAnalyticsResponse {
        month: month.clone(),
        kpis: TalentAnalyticsKpis {
            total_views: total_views_this_month,
            views_change_pct,
            total_revenue_cents,
            active_campaigns,
        },
        campaigns,
        roi: TalentAnalyticsRoi {
            traditional: TalentAnalyticsRoiTraditional {
                per_post_cents: 50_000,
                time_investment: "4-6 hours".to_string(),
                posts_per_month: "5-8".to_string(),
                monthly_earnings_range: "$2,500-$4,000".to_string(),
            },
            ai: TalentAnalyticsRoiAi {
                per_campaign_cents: per_campaign,
                time_investment: "0 hours/month".to_string(),
                active_campaigns,
                monthly_earnings_cents: ai_monthly,
            },
            message,
        },
    }))
}

#[derive(Debug, serde::Deserialize)]
pub struct UpdateTalentProfilePayload {
    pub agency_id: Option<String>,
    pub stage_name: Option<String>,
    pub full_legal_name: Option<String>,
    pub email: Option<String>,
    pub phone_number: Option<String>,
    pub date_of_birth: Option<String>,
    pub role_type: Option<String>,
    pub status: Option<String>,
    pub city: Option<String>,
    pub state_province: Option<String>,
    pub country: Option<String>,
    pub bio_notes: Option<String>,
    pub instagram_handle: Option<String>,
    pub instagram_followers: Option<i64>,
    pub engagement_rate: Option<f64>,
    pub photo_urls: Option<Vec<String>>,
    pub profile_photo_url: Option<String>,
    pub gender_identity: Option<String>,
    pub race_ethnicity: Option<Vec<String>>,
    pub hair_color: Option<String>,
    pub eye_color: Option<String>,
    pub skin_tone: Option<String>,
    pub height_feet: Option<i32>,
    pub height_inches: Option<i32>,
    pub bust_chest_inches: Option<i32>,
    pub waist_inches: Option<i32>,
    pub hips_inches: Option<i32>,
    pub tattoos: Option<bool>,
    pub piercings: Option<bool>,
    pub special_skills: Option<Vec<String>>,
}

pub async fn update_profile(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<UpdateTalentProfilePayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let connections = list_active_talent_connections(&state, &user).await?;
    let agency_ids = connected_agency_ids_from_connections(&connections);

    let requested_agency_id = payload
        .agency_id
        .clone()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());
    let resolved = if let Some(ref aid) = requested_agency_id {
        resolve_talent_for_agency(&state, &user, aid).await?
    } else if agency_ids.len() == 1 {
        resolve_talent_for_agency(&state, &user, &agency_ids[0]).await?
    } else {
        return Err((
            StatusCode::BAD_REQUEST,
            "agency_id is required when connected to multiple agencies".to_string(),
        ));
    };

    let mut body = json!({
        "stage_name": payload.stage_name,
        "full_legal_name": payload.full_legal_name,
        "email": payload.email,
        "phone_number": payload.phone_number,
        "date_of_birth": payload.date_of_birth,
        "role_type": payload.role_type,
        "status": payload.status,
        "city": payload.city,
        "state_province": payload.state_province,
        "country": payload.country,
        "bio_notes": payload.bio_notes,
        "instagram_handle": payload.instagram_handle,
        "instagram_followers": payload.instagram_followers,
        "engagement_rate": payload.engagement_rate,
        "photo_urls": payload.photo_urls,
        "profile_photo_url": payload.profile_photo_url,
        "gender_identity": payload.gender_identity,
        "race_ethnicity": payload.race_ethnicity,
        "hair_color": payload.hair_color,
        "eye_color": payload.eye_color,
        "skin_tone": payload.skin_tone,
        "height_feet": payload.height_feet,
        "height_inches": payload.height_inches,
        "bust_chest_inches": payload.bust_chest_inches,
        "waist_inches": payload.waist_inches,
        "hips_inches": payload.hips_inches,
        "tattoos": payload.tattoos,
        "piercings": payload.piercings,
        "special_skills": payload.special_skills,
        "updated_at": chrono::Utc::now().to_rfc3339(),
    });

    if let serde_json::Value::Object(ref mut map) = body {
        let null_keys: Vec<String> = map
            .iter()
            .filter_map(|(k, val)| if val.is_null() { Some(k.clone()) } else { None })
            .collect();
        for k in null_keys {
            map.remove(&k);
        }
    }

    let mut req = state.pg.from("agency_users").eq("id", &resolved.talent_id);
    if !resolved.agency_id.is_empty() {
        req = req.eq("agency_id", &resolved.agency_id);
    }
    let resp = req
        .update(body.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        warn!(talent_id = %resolved.talent_id, body = %err, "talent profile update failed");
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let v: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!({"ok": true}));
    Ok(Json(v))
}

#[derive(Debug, serde::Deserialize)]
pub struct CreatePortfolioItemPayload {
    pub media_url: String,
    pub title: Option<String>,
}

pub async fn list_portfolio_items(
    State(state): State<AppState>,
    user: AuthUser,
    Query(q): Query<std::collections::HashMap<String, String>>,
) -> Result<Json<Vec<serde_json::Value>>, (StatusCode, String)> {
    let resolved = resolve_talent(&state, &user).await?;
    let connections = list_active_talent_connections(&state, &user).await?;
    let ids = connected_agency_ids_from_connections(&connections);
    if ids.is_empty() {
        return Ok(Json(vec![]));
    }
    let mut ids_filtered = ids;
    if let Some(aid) = q
        .get("agency_id")
        .map(|s| s.as_str())
        .filter(|s| !s.trim().is_empty())
    {
        if !ids_filtered.iter().any(|x| x == aid) {
            return Err((StatusCode::FORBIDDEN, "not connected to agency".to_string()));
        }
        ids_filtered = vec![aid.to_string()];
    }
    let ids_refs: Vec<&str> = ids_filtered.iter().map(|s| s.as_str()).collect();

    let resp = state
        .pg
        .from("talent_portfolio_items")
        .select("id,agency_id,talent_id,title,media_url,status,created_at,storage_bucket,storage_path,public_url,size_bytes,mime_type")
        .eq("talent_id", &resolved.talent_id)
        .in_("agency_id", ids_refs)
        .order("created_at.desc")
        .limit(200)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let rows: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!([]));
    let out = rows.as_array().cloned().unwrap_or_default();
    Ok(Json(out))
}

pub async fn create_portfolio_item(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<CreatePortfolioItemPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let connections = list_active_talent_connections(&state, &user).await?;
    let ids = connected_agency_ids_from_connections(&connections);
    if ids.len() > 1 {
        return Err((
            StatusCode::BAD_REQUEST,
            "agency_id is required when connected to multiple agencies".to_string(),
        ));
    }
    let resolved = resolve_talent(&state, &user).await?;
    if payload.media_url.trim().is_empty() {
        return Err((StatusCode::BAD_REQUEST, "missing media_url".to_string()));
    }

    let body = json!({
        "agency_id": resolved.agency_id,
        "talent_id": resolved.talent_id,
        "title": payload.title,
        "media_url": payload.media_url,
        "status": "live",
    });

    let resp = state
        .pg
        .from("talent_portfolio_items")
        .insert(body.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let v: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!({"ok": true}));
    Ok(Json(v))
}

pub async fn delete_portfolio_item(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resolved = resolve_talent(&state, &user).await?;

    let resp = state
        .pg
        .from("talent_portfolio_items")
        .eq("id", &id)
        .eq("talent_id", &resolved.talent_id)
        .delete()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    Ok(Json(json!({"status":"ok"})))
}

pub async fn list_bookings(
    State(state): State<AppState>,
    user: AuthUser,
    Query(q): Query<std::collections::HashMap<String, String>>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resolved = resolve_talent(&state, &user).await?;
    let connections = list_active_talent_connections(&state, &user).await?;
    let ids = connected_agency_ids_from_connections(&connections);
    if ids.is_empty() {
        return Ok(Json(json!([])));
    }
    let mut ids_filtered = ids;
    if let Some(aid) = q
        .get("agency_id")
        .map(|s| s.as_str())
        .filter(|s| !s.trim().is_empty())
    {
        if !ids_filtered.iter().any(|x| x == aid) {
            return Err((StatusCode::FORBIDDEN, "not connected to agency".to_string()));
        }
        ids_filtered = vec![aid.to_string()];
    }
    let ids_refs: Vec<&str> = ids_filtered.iter().map(|s| s.as_str()).collect();

    let req = state
        .pg
        .from("bookings")
        .select("*")
        .eq("talent_id", &resolved.talent_id)
        .in_("agency_user_id", ids_refs);

    let resp = req
        .order("date.desc")
        .limit(250)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}

#[derive(Debug, serde::Deserialize)]
pub struct ListBookOutsParams {
    pub date_start: Option<String>,
    pub date_end: Option<String>,
    pub agency_id: Option<String>,
}

pub async fn list_book_outs(
    State(state): State<AppState>,
    user: AuthUser,
    Query(params): Query<ListBookOutsParams>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resolved = resolve_talent(&state, &user).await?;
    let connections = list_active_talent_connections(&state, &user).await?;
    let ids = connected_agency_ids_from_connections(&connections);
    if ids.is_empty() {
        return Ok(Json(json!([])));
    }
    let ids_refs: Vec<&str> = ids.iter().map(|s| s.as_str()).collect();

    let mut req = state
        .pg
        .from("book_outs")
        .select("*")
        .eq("talent_id", &resolved.talent_id)
        .in_("agency_user_id", ids_refs);

    if let Some(aid) = params.agency_id.as_ref().filter(|s| !s.trim().is_empty()) {
        if !ids.iter().any(|x| x == aid) {
            return Err((StatusCode::FORBIDDEN, "not connected to agency".to_string()));
        }
        req = req.eq("agency_user_id", aid);
    }
    if let Some(ds) = params.date_start.as_ref() {
        req = req.gte("end_date", ds);
    }
    if let Some(de) = params.date_end.as_ref() {
        req = req.lte("start_date", de);
    }
    let resp = req
        .order("start_date.asc")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}

#[derive(Debug, serde::Deserialize)]
pub struct CreateBookOutPayload {
    pub start_date: String,
    pub end_date: String,
    pub reason: Option<String>,
    pub notes: Option<String>,
    pub notify_agency: Option<bool>,
    pub agency_id: Option<String>,
}

pub async fn create_book_out(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<CreateBookOutPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resolved = if let Some(aid) = payload.agency_id.as_ref().filter(|s| !s.trim().is_empty()) {
        resolve_talent_for_agency(&state, &user, aid).await?
    } else {
        let connections = list_active_talent_connections(&state, &user).await?;
        let mut ids: Vec<String> = connections
            .iter()
            .filter_map(|r| {
                r.get("agency_id")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            })
            .filter(|s| !s.is_empty())
            .collect();
        ids.sort();
        ids.dedup();
        if ids.len() > 1 {
            return Err((
                StatusCode::BAD_REQUEST,
                "agency_id is required when connected to multiple agencies".to_string(),
            ));
        }
        let aid = ids.first().cloned().unwrap_or_default();
        if aid.is_empty() {
            return Err((StatusCode::BAD_REQUEST, "Missing agency_id".to_string()));
        }
        resolve_talent_for_agency(&state, &user, &aid).await?
    };

    let reason_str = payload
        .reason
        .clone()
        .unwrap_or_else(|| "personal".to_string());
    let body = json!({
        "agency_user_id": resolved.agency_id,
        "talent_id": resolved.talent_id,
        "start_date": payload.start_date,
        "end_date": payload.end_date,
        "reason": reason_str,
        "notes": payload.notes,
    });
    let resp = state
        .pg
        .from("book_outs")
        .insert(body.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Option C: notify agency (email + in-app notification)
    let should_notify = payload.notify_agency.unwrap_or(false);
    if should_notify {
        let start = payload.start_date.clone();
        let end = payload.end_date.clone();
        let reason = payload
            .reason
            .clone()
            .unwrap_or_else(|| "personal".to_string());
        let notes = payload.notes.clone().unwrap_or_default();

        let talent_name = resolved
            .agency_user_row
            .get("full_name")
            .and_then(|v| v.as_str())
            .or_else(|| {
                resolved
                    .agency_user_row
                    .get("name")
                    .and_then(|v| v.as_str())
            })
            .or_else(|| {
                resolved
                    .agency_user_row
                    .get("stage_name")
                    .and_then(|v| v.as_str())
            })
            .unwrap_or("Talent")
            .to_string();

        // Agency email/name
        let aresp = state
            .pg
            .from("agencies")
            .select("email,agency_name")
            .eq("id", &resolved.agency_id)
            .single()
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let astatus = aresp.status();
        let atext = aresp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if astatus.is_success() {
            let av: serde_json::Value = serde_json::from_str(&atext).unwrap_or(json!({}));
            let agency_email = av.get("email").and_then(|v| v.as_str()).unwrap_or("");
            let agency_name = av
                .get("agency_name")
                .and_then(|v| v.as_str())
                .unwrap_or("Agency")
                .to_string();

            if !agency_email.trim().is_empty() {
                let subject = format!("Talent Book-Out: {} ({} to {})", talent_name, start, end);
                let mut lines: Vec<String> = vec![];
                lines.push(format!("Hi {},", agency_name));
                lines.push(String::new());
                lines.push(format!("{} has booked out availability.", talent_name));
                lines.push(String::new());
                lines.push(format!("Dates: {} – {}", start, end));
                lines.push(format!("Reason: {}", reason.replace('_', " ")));
                if !notes.trim().is_empty() {
                    lines.push(format!("Notes: {}", notes));
                }
                let body = lines.join("\n");

                let send_res = crate::email::send_plain_text_email(
                    &state,
                    agency_email,
                    &subject,
                    &body,
                    Some(&talent_name),
                );

                // In-app agency notification log (best-effort)
                let book_out_id = v
                    .as_array()
                    .and_then(|a| a.first())
                    .and_then(|x| x.get("id"))
                    .and_then(|x| x.as_str())
                    .map(|s| s.to_string());
                let meta = json!({
                    "smtp_status": if send_res.is_ok() {"ok"} else {"error"},
                    "talent_id": resolved.talent_id,
                    "talent_name": talent_name,
                    "start_date": start,
                    "end_date": end,
                    "reason": reason,
                });

                let insert = json!({
                    "agency_user_id": resolved.agency_id,
                    "booking_id": null,
                    "book_out_id": book_out_id,
                    "channel": "email",
                    "recipient_type": "agency",
                    "to_email": agency_email,
                    "subject": subject,
                    "message": body,
                    "meta_json": meta,
                });
                let _ = state
                    .pg
                    .from("booking_notifications")
                    .insert(insert.to_string())
                    .execute()
                    .await;
            }
        }
    }
    Ok(Json(v))
}

pub async fn delete_book_out(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resolved = resolve_talent(&state, &user).await?;
    let resp = state
        .pg
        .from("book_outs")
        .eq("id", &id)
        .eq("talent_id", &resolved.talent_id)
        .delete()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}
