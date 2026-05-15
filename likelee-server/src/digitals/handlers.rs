use crate::auth::AuthUser;
use crate::email;
use crate::state::AppState;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde_json::json;
use tracing::warn;

use super::dto::{
    CreateDigitalRequest, DigitalRow, SendDigitalsRemindersRequest, SendDigitalsRemindersResponse,
    UpdateDigitalRequest,
};
use super::repository;

pub async fn list_talent_digitals(
    State(state): State<AppState>,
    user: AuthUser,
    Path(talent_id): Path<String>,
) -> Result<Json<Vec<DigitalRow>>, (StatusCode, String)> {
    repository::ensure_talent_access(&state, &user.id, &talent_id).await?;
    let rows = repository::list_talent_digitals(&state, &talent_id).await?;
    Ok(Json(rows))
}

pub async fn create_talent_digital(
    State(state): State<AppState>,
    user: AuthUser,
    Path(talent_id): Path<String>,
    Json(payload): Json<CreateDigitalRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    repository::ensure_talent_access(&state, &user.id, &talent_id).await?;

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

    let inserted_val = repository::create_talent_digital(&state, &talent_id, body).await?;

    if let Err((code, msg)) =
        repository::recompute_total_assets_for_talent(&state, &user.id, &talent_id).await
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
    let first = repository::get_digital_by_id(&state, &id).await?;
    repository::ensure_talent_access(&state, &user.id, &first.talent_id).await?;

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

    let updated_val = repository::update_digital(&state, &id, v).await?;

    if let Err((code, msg)) =
        repository::recompute_total_assets_for_talent(&state, &user.id, &first.talent_id).await
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
    let access = crate::team::require_agency_access(&state, &user).await?;
    let agency_id = &access.organization_id;
    let rows = repository::list_agency_digitals(&state, agency_id).await?;
    Ok(Json(rows))
}

pub async fn send_digitals_reminders(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<SendDigitalsRemindersRequest>,
) -> Result<Json<SendDigitalsRemindersResponse>, (StatusCode, String)> {
    let access = crate::team::require_agency_access(&state, &user).await?;
    let agency_id = &access.organization_id;

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
        .eq("agency_id", agency_id)
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
