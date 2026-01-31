use crate::{auth::AuthUser, config::AppState};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashSet;
use tracing::warn;

use crate::email;

 fn try_parse_json_string_array(s: &str) -> Option<Vec<String>> {
     let t = s.trim();
     if !t.starts_with('[') {
         return None;
     }
     serde_json::from_str::<Vec<String>>(t).ok()
 }

 fn try_parse_postgres_array_literal(s: &str) -> Option<Vec<String>> {
     let t = s.trim();
     if !(t.starts_with('{') && t.ends_with('}')) {
         return None;
     }
     let inner = &t[1..t.len().saturating_sub(1)];
     if inner.trim().is_empty() {
         return Some(vec![]);
     }

     let mut out: Vec<String> = Vec::new();
     let mut cur = String::new();
     let mut in_quotes = false;
     let mut escape = false;

     for ch in inner.chars() {
         if escape {
             cur.push(ch);
             escape = false;
             continue;
         }
         if ch == '\\' {
             escape = true;
             continue;
         }
         if ch == '"' {
             in_quotes = !in_quotes;
             continue;
         }
         if ch == ',' && !in_quotes {
             let v = cur.trim();
             if !v.is_empty() {
                 out.push(v.to_string());
             }
             cur.clear();
             continue;
         }
         cur.push(ch);
     }
     let v = cur.trim();
     if !v.is_empty() {
         out.push(v.to_string());
     }

     Some(out)
 }

 fn parse_string_array_value(v: &serde_json::Value) -> Vec<String> {
     if let Some(arr) = v.as_array() {
         return arr
             .iter()
             .filter_map(|x| x.as_str())
             .map(|s| s.to_string())
             .collect();
     }
     if let Some(s) = v.as_str() {
         if let Some(arr) = try_parse_json_string_array(s) {
             return arr;
         }
         if let Some(arr) = try_parse_postgres_array_literal(s) {
             return arr;
         }
         if s.trim().is_empty() {
             return vec![];
         }
         return vec![s.to_string()];
     }
     vec![]
 }

 fn normalize_asset_url(s: &str) -> String {
     let t = s.trim();
     if let Some(i) = t.find("://") {
         let (scheme, rest) = t.split_at(i + 3);
         let mut r = rest.to_string();
         while r.contains("//") {
             r = r.replace("//", "/");
         }
         return format!("{}{}", scheme, r);
     }
     let mut r = t.to_string();
     while r.contains("//") {
         r = r.replace("//", "/");
     }
     r
 }

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

async fn recompute_total_assets_for_talent(
    state: &AppState,
    agency_id: &str,
    talent_id: &str,
) -> Result<i32, (StatusCode, String)> {
    let mut assets: HashSet<String> = HashSet::new();

    let talent_resp = state
        .pg
        .from("agency_users")
        .select("profile_photo_url,photo_urls")
        .eq("id", talent_id)
        .eq("agency_id", agency_id)
        .eq("role", "talent")
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let talent_text = talent_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let talent_rows: serde_json::Value =
        serde_json::from_str(&talent_text).unwrap_or(serde_json::json!([]));
    let talent = talent_rows
        .as_array()
        .and_then(|a| a.first())
        .cloned()
        .unwrap_or_else(|| serde_json::json!({}));

    if let Some(url) = talent
        .get("profile_photo_url")
        .and_then(|v| v.as_str())
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
    {
        assets.insert(normalize_asset_url(url));
    }

    if let Some(arr) = talent.get("photo_urls").and_then(|v| v.as_array()) {
        for u in arr.iter().filter_map(|x| x.as_str()) {
            let t = u.trim();
            if !t.is_empty() {
                assets.insert(normalize_asset_url(t));
            }
        }
    } else if let Some(v) = talent.get("photo_urls") {
        for u in parse_string_array_value(v).iter() {
            let t = u.trim();
            if !t.is_empty() {
                assets.insert(normalize_asset_url(t));
            }
        }
    }

    let digitals_resp = state
        .pg
        .from("digitals")
        .select("photo_urls,comp_card_url")
        .eq("talent_id", talent_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let digitals_text = digitals_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let digitals_rows: serde_json::Value =
        serde_json::from_str(&digitals_text).unwrap_or(serde_json::json!([]));
    if let Some(arr) = digitals_rows.as_array() {
        for r in arr {
            if let Some(v) = r.get("photo_urls") {
                for u in parse_string_array_value(v).iter() {
                    let t = u.trim();
                    if !t.is_empty() {
                        assets.insert(normalize_asset_url(t));
                    }
                }
            }

            if let Some(cc) = r
                .get("comp_card_url")
                .and_then(|v| v.as_str())
                .map(|s| s.trim())
                .filter(|s| !s.is_empty())
            {
                assets.insert(normalize_asset_url(cc));
            }
        }
    }

    let total_assets = assets.len() as i32;
    let body = serde_json::json!({ "total_assets": total_assets });
    let upd = state
        .pg
        .from("agency_users")
        .eq("id", talent_id)
        .eq("agency_id", agency_id)
        .update(body.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !upd.status().is_success() {
        let err = upd.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    Ok(total_assets)
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

    if let Err((code, msg)) = recompute_total_assets_for_talent(&state, &user.id, &talent_id).await
    {
        warn!(talent_id = %talent_id, error = %msg, "failed to recompute total_assets after digitals create");
        return Err((code, msg));
    }

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

    if let Err((code, msg)) =
        recompute_total_assets_for_talent(&state, &user.id, &first.talent_id).await
    {
        warn!(talent_id = %first.talent_id, error = %msg, "failed to recompute total_assets after digitals update");
        return Err((code, msg));
    }

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
