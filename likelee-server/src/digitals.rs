use crate::{auth::AuthUser, config::AppState};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashSet;

use crate::email;

#[derive(Serialize, Deserialize, Clone)]
pub struct DigitalRow {
    pub id: String,
    pub talent_id: String,
    pub photo_urls: Vec<String>,

    pub height_feet: Option<i32>,
    pub height_inches: Option<i32>,
    pub weight_lbs: Option<i32>,
    pub bust_inches: Option<i32>,
    pub waist_inches: Option<i32>,
    pub hips_inches: Option<i32>,

    pub uploaded_at: Option<String>,
    pub expires_at: Option<String>,
    pub status: String,
    pub comp_card_url: Option<String>,

    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateDigitalRequest {
    pub photo_urls: Option<Vec<String>>,

    pub height_feet: Option<i32>,
    pub height_inches: Option<i32>,
    pub weight_lbs: Option<i32>,
    pub bust_inches: Option<i32>,
    pub waist_inches: Option<i32>,
    pub hips_inches: Option<i32>,

    pub uploaded_at: Option<String>,
    pub expires_at: Option<String>,
    pub status: Option<String>,
    pub comp_card_url: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateDigitalRequest {
    pub photo_urls: Option<Vec<String>>,

    pub height_feet: Option<i32>,
    pub height_inches: Option<i32>,
    pub weight_lbs: Option<i32>,
    pub bust_inches: Option<i32>,
    pub waist_inches: Option<i32>,
    pub hips_inches: Option<i32>,

    pub uploaded_at: Option<String>,
    pub expires_at: Option<String>,
    pub status: Option<String>,
    pub comp_card_url: Option<String>,
}

async fn ensure_talent_access(
    state: &AppState,
    agency_id: &str,
    talent_id: &str,
) -> Result<(), (StatusCode, String)> {
    let resp = state
        .pg
        .from("agency_users")
        .select("id")
        .eq("id", talent_id)
        .eq("agency_id", agency_id)
        .eq("role", "talent")
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let rows: serde_json::Value = serde_json::from_str(&text).unwrap_or(serde_json::json!([]));

    let ok = rows.as_array().map(|a| !a.is_empty()).unwrap_or(false);
    if ok {
        Ok(())
    } else {
        Err((StatusCode::FORBIDDEN, "Forbidden".to_string()))
    }
}

pub async fn list_talent_digitals(
    State(state): State<AppState>,
    user: AuthUser,
    Path(talent_id): Path<String>,
) -> Result<Json<Vec<DigitalRow>>, (StatusCode, String)> {
    ensure_talent_access(&state, &user.id, &talent_id).await?;

    let resp = state
        .pg
        .from("digitals")
        .select("*")
        .eq("talent_id", &talent_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let rows: Vec<DigitalRow> = serde_json::from_str(&text).unwrap_or_default();
    Ok(Json(rows))
}

pub async fn create_talent_digital(
    State(state): State<AppState>,
    user: AuthUser,
    Path(talent_id): Path<String>,
    Json(payload): Json<CreateDigitalRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    ensure_talent_access(&state, &user.id, &talent_id).await?;

    let status = payload.status.unwrap_or_else(|| "current".to_string());

    let mut body = json!({
        "talent_id": talent_id,
        "photo_urls": payload.photo_urls.unwrap_or_default(),
        "height_feet": payload.height_feet,
        "height_inches": payload.height_inches,
        "weight_lbs": payload.weight_lbs,
        "bust_inches": payload.bust_inches,
        "waist_inches": payload.waist_inches,
        "hips_inches": payload.hips_inches,
        "uploaded_at": payload.uploaded_at,
        "expires_at": payload.expires_at,
        "status": status,
        "comp_card_url": payload.comp_card_url,
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

    let resp = state
        .pg
        .from("digitals")
        .insert(body.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let err_text = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err_text));
    }

    let inserted_text = resp.text().await.unwrap_or_default();
    let inserted_val: serde_json::Value =
        serde_json::from_str(&inserted_text).unwrap_or(json!({ "status": "ok" }));
    Ok(Json(inserted_val))
}

pub async fn update_digital(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<UpdateDigitalRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("digitals")
        .select("*")
        .eq("id", &id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let rows: Vec<DigitalRow> = serde_json::from_str(&text).unwrap_or_default();
    let first = rows
        .first()
        .cloned()
        .ok_or((StatusCode::NOT_FOUND, "not_found".to_string()))?;

    ensure_talent_access(&state, &user.id, &first.talent_id).await?;

    let mut v = json!({
        "photo_urls": payload.photo_urls,
        "height_feet": payload.height_feet,
        "height_inches": payload.height_inches,
        "weight_lbs": payload.weight_lbs,
        "bust_inches": payload.bust_inches,
        "waist_inches": payload.waist_inches,
        "hips_inches": payload.hips_inches,
        "uploaded_at": payload.uploaded_at,
        "expires_at": payload.expires_at,
        "status": payload.status,
        "comp_card_url": payload.comp_card_url,
    });

    if let serde_json::Value::Object(ref mut map) = v {
        let null_keys: Vec<String> = map
            .iter()
            .filter_map(|(k, val)| if val.is_null() { Some(k.clone()) } else { None })
            .collect();
        for k in null_keys {
            map.remove(&k);
        }
    }

    let resp = state
        .pg
        .from("digitals")
        .eq("id", &id)
        .update(v.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let err_text = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err_text));
    }

    let updated_text = resp.text().await.unwrap_or_default();
    let updated_val: serde_json::Value =
        serde_json::from_str(&updated_text).unwrap_or(json!({ "status": "ok" }));
    Ok(Json(updated_val))
}

pub async fn list_agency_digitals(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<Vec<DigitalRow>>, (StatusCode, String)> {
    let talent_resp = state
        .pg
        .from("agency_users")
        .select("id")
        .eq("agency_id", &user.id)
        .eq("role", "talent")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let talent_text = talent_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let talent_rows: serde_json::Value =
        serde_json::from_str(&talent_text).unwrap_or(serde_json::json!([]));
    let mut talent_ids: HashSet<String> = HashSet::new();
    if let Some(arr) = talent_rows.as_array() {
        for v in arr {
            if let Some(id) = v.get("id").and_then(|x| x.as_str()) {
                talent_ids.insert(id.to_string());
            }
        }
    }

    let resp = state
        .pg
        .from("digitals")
        .select("*")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut rows: Vec<DigitalRow> = serde_json::from_str(&text).unwrap_or_default();
    rows.retain(|d| talent_ids.contains(&d.talent_id));
    Ok(Json(rows))
}

#[derive(Deserialize)]
pub struct SendDigitalsRemindersRequest {
    pub talent_ids: Vec<String>,
    pub subject: Option<String>,
    pub body: Option<String>,
}

#[derive(Serialize)]
pub struct SendDigitalsRemindersResponse {
    pub requested: usize,
    pub sent: usize,
    pub skipped_missing_email: usize,
    pub failed: usize,
}

pub async fn send_digitals_reminders(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<SendDigitalsRemindersRequest>,
) -> Result<Json<SendDigitalsRemindersResponse>, (StatusCode, String)> {
    let requested = payload.talent_ids.len();
    if requested == 0 {
        return Ok(Json(SendDigitalsRemindersResponse {
            requested: 0,
            sent: 0,
            skipped_missing_email: 0,
            failed: 0,
        }));
    }

    let ids: Vec<&str> = payload.talent_ids.iter().map(|s| s.as_str()).collect();
    let resp = state
        .pg
        .from("agency_users")
        .select("id,full_legal_name,stage_name,full_name,email")
        .eq("agency_id", &user.id)
        .eq("role", "talent")
        .in_("id", ids)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let rows: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!([]));

    let mut sent: usize = 0;
    let mut skipped_missing_email: usize = 0;
    let mut failed: usize = 0;

    if let Some(arr) = rows.as_array() {
        for r in arr {
            let email_addr = r
                .get("email")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if email_addr.is_empty() {
                skipped_missing_email += 1;
                continue;
            }

            let name = r
                .get("full_legal_name")
                .or(r.get("stage_name"))
                .or(r.get("full_name"))
                .and_then(|v| v.as_str())
                .unwrap_or("there")
                .to_string();

            let subject = payload
                .subject
                .as_deref()
                .filter(|s| !s.trim().is_empty())
                .unwrap_or("Digitals update reminder")
                .to_string();
            let body = payload
                .body
                .as_deref()
                .filter(|s| !s.trim().is_empty())
                .map(|tpl| tpl.replace("{name}", &name))
                .unwrap_or_else(|| {
                    format!(
                        "Hi {},\n\nPlease upload your latest digitals (plain photos, no makeup) to keep your profile up to date.\n\nThank you,\nLikelee",
                        name
                    )
                });

            match email::send_plain_email(&state, &email_addr, &subject, &body) {
                Ok(()) => {
                    sent += 1;
                }
                Err((_code, _body)) => {
                    failed += 1;
                }
            }
        }
    }

    Ok(Json(SendDigitalsRemindersResponse {
        requested,
        sent,
        skipped_missing_email,
        failed,
    }))
}
