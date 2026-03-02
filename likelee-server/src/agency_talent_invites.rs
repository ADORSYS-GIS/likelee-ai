use crate::{auth::AuthUser, auth::RoleGuard, config::AppState, errors::sanitize_db_error};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use chrono::{DateTime, Utc};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tracing::warn;
use urlencoding::encode;

#[derive(Serialize, Deserialize)]
pub struct AgencyTalentInvite {
    pub id: String,
    pub agency_id: String,
    pub email: String,
    pub invited_name: Option<String>,
    pub token: Option<String>,
    pub status: String,
    pub expires_at: Option<String>,
    pub created_at: Option<String>,
    pub responded_at: Option<String>,
    pub updated_at: Option<String>,
    pub agencies: Option<AgencyInviteAgency>,
}

#[derive(Serialize, Deserialize)]
pub struct AgencyInviteAgency {
    pub agency_name: Option<String>,
    pub logo_url: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct ListAgencyTalentInvitesResponse {
    pub status: String,
    pub invites: Vec<AgencyTalentInvite>,
}

#[derive(Serialize, Deserialize)]
pub struct ActionResponse {
    pub status: String,
}

#[derive(Deserialize)]
pub struct CreateAgencyTalentInvitePayload {
    pub email: String,
    pub invited_name: Option<String>,
}

fn now_rfc3339() -> String {
    Utc::now().to_rfc3339()
}

fn is_expired(expires_at: &Option<String>) -> bool {
    let Some(s) = expires_at.as_ref() else {
        return false;
    };
    if let Ok(dt) = DateTime::parse_from_rfc3339(s) {
        return dt.with_timezone(&Utc) <= Utc::now();
    }
    false
}

async fn creator_profile_exists_by_email(state: &AppState, email: &str) -> bool {
    let normalized = email.trim().to_lowercase();
    if normalized.is_empty() {
        return false;
    }

    let resp = match state
        .pg
        .from("creators")
        .select("id")
        .eq("email", &normalized)
        .limit(1)
        .execute()
        .await
    {
        Ok(v) => v,
        Err(_) => return false,
    };

    if !resp.status().is_success() {
        return false;
    }

    let text = match resp.text().await {
        Ok(v) => v,
        Err(_) => return false,
    };

    let rows: Vec<Value> = serde_json::from_str(&text).unwrap_or_default();
    !rows.is_empty()
}

async fn creator_id_by_email(state: &AppState, email: &str) -> Option<String> {
    let normalized = email.trim().to_lowercase();
    if normalized.is_empty() {
        return None;
    }

    let resp = state
        .pg
        .from("creators")
        .select("id")
        .eq("email", &normalized)
        .limit(1)
        .execute()
        .await
        .ok()?;
    if !resp.status().is_success() {
        return None;
    }
    let text = resp.text().await.ok()?;
    let rows: Vec<Value> = serde_json::from_str(&text).ok()?;
    rows.first()
        .and_then(|r| r.get("id"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
}

fn parse_string_list(value: &Value) -> Vec<String> {
    if let Some(arr) = value.as_array() {
        return arr
            .iter()
            .filter_map(|v| v.as_str())
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();
    }

    if let Some(s) = value.as_str() {
        let trimmed = s.trim();
        if trimmed.is_empty() {
            return vec![];
        }
        if let Ok(parsed) = serde_json::from_str::<Vec<String>>(trimmed) {
            return parsed
                .into_iter()
                .map(|x| x.trim().to_string())
                .filter(|x| !x.is_empty())
                .collect();
        }
        return trimmed
            .split(',')
            .map(|x| x.trim().to_string())
            .filter(|x| !x.is_empty())
            .collect();
    }

    vec![]
}

fn is_missing_field(row: &Value, key: &str) -> bool {
    match row.get(key) {
        None => true,
        Some(v) if v.is_null() => true,
        Some(v) if v.is_string() => v.as_str().map(|s| s.trim().is_empty()).unwrap_or(true),
        Some(v) if v.is_array() => v.as_array().map(|a| a.is_empty()).unwrap_or(true),
        _ => false,
    }
}

fn parse_i32(value: Option<&Value>) -> Option<i32> {
    value.and_then(|v| {
        v.as_i64()
            .map(|x| x as i32)
            .or_else(|| v.as_f64().map(|x| x as i32))
            .or_else(|| v.as_str().and_then(|s| s.trim().parse::<i32>().ok()))
    })
}

fn parse_f64(value: Option<&Value>) -> Option<f64> {
    value.and_then(|v| {
        v.as_f64()
            .or_else(|| v.as_i64().map(|x| x as f64))
            .or_else(|| v.as_str().and_then(|s| s.trim().parse::<f64>().ok()))
    })
}

fn parse_non_empty_string(value: Option<&Value>) -> Option<String> {
    value
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

async fn hydrate_creator_from_agency_row(
    state: &AppState,
    creator_id: &str,
    invited_email: &str,
    agency_row: &Value,
) {
    let creator_resp = match state
        .pg
        .from("creators")
        .select("*")
        .eq("id", creator_id)
        .limit(1)
        .execute()
        .await
    {
        Ok(v) => v,
        Err(e) => {
            warn!(error = %e, creator_id, "hydrate_creator_from_agency_row: failed to read creators row");
            return;
        }
    };

    if !creator_resp.status().is_success() {
        return;
    }

    let creator_text = match creator_resp.text().await {
        Ok(v) => v,
        Err(_) => return,
    };
    let creator_rows: Vec<Value> = serde_json::from_str(&creator_text).unwrap_or_default();
    let creator_row = creator_rows.first().cloned().unwrap_or_else(|| json!({}));

    let mut patch = serde_json::Map::new();
    let mut optional_patch = serde_json::Map::new();

    let full_name = parse_non_empty_string(agency_row.get("full_legal_name"))
        .or_else(|| parse_non_empty_string(agency_row.get("stage_name")));
    if is_missing_field(&creator_row, "full_name") {
        if let Some(v) = full_name {
            patch.insert("full_name".to_string(), Value::String(v));
        }
    }

    if is_missing_field(&creator_row, "email") {
        let email = if invited_email.trim().is_empty() {
            parse_non_empty_string(agency_row.get("email"))
        } else {
            Some(invited_email.trim().to_lowercase())
        };
        if let Some(v) = email {
            patch.insert("email".to_string(), Value::String(v));
        }
    }

    if is_missing_field(&creator_row, "city") {
        if let Some(v) = parse_non_empty_string(agency_row.get("city")) {
            patch.insert("city".to_string(), Value::String(v));
        }
    }

    if is_missing_field(&creator_row, "state") {
        if let Some(v) = parse_non_empty_string(agency_row.get("state_province")) {
            patch.insert("state".to_string(), Value::String(v));
        }
    }

    if is_missing_field(&creator_row, "bio") {
        if let Some(v) = parse_non_empty_string(agency_row.get("bio_notes")) {
            patch.insert("bio".to_string(), Value::String(v));
        }
    }

    if is_missing_field(&creator_row, "profile_photo_url") {
        if let Some(v) = parse_non_empty_string(agency_row.get("profile_photo_url")) {
            patch.insert("profile_photo_url".to_string(), Value::String(v));
        }
    }

    if is_missing_field(&creator_row, "creator_type") {
        if let Some(role_value) = agency_row.get("role_type") {
            let role_types = parse_string_list(role_value);
            if let Some(first_role) = role_types.first() {
                patch.insert(
                    "creator_type".to_string(),
                    Value::String(first_role.clone()),
                );
            }
        }
    }

    if is_missing_field(&creator_row, "race") {
        if let Some(race_value) = agency_row.get("race_ethnicity") {
            let races = parse_string_list(race_value);
            if let Some(first_race) = races.first() {
                patch.insert("race".to_string(), Value::String(first_race.clone()));
            }
        }
    }

    if is_missing_field(&creator_row, "hair_color") {
        if let Some(v) = parse_non_empty_string(agency_row.get("hair_color")) {
            patch.insert("hair_color".to_string(), Value::String(v));
        }
    }

    if is_missing_field(&creator_row, "eye_color") {
        if let Some(v) = parse_non_empty_string(agency_row.get("eye_color")) {
            patch.insert("eye_color".to_string(), Value::String(v));
        }
    }

    if is_missing_field(&creator_row, "height_cm") {
        let feet = parse_i32(agency_row.get("height_feet")).unwrap_or(0);
        let inches = parse_i32(agency_row.get("height_inches")).unwrap_or(0);
        let total_inches = (feet * 12) + inches;
        if total_inches > 0 {
            let cm = ((total_inches as f64) * 2.54).round() as i32;
            patch.insert("height_cm".to_string(), Value::Number(cm.into()));
        }
    }

    if is_missing_field(&creator_row, "birthday") {
        if let Some(v) = parse_non_empty_string(agency_row.get("date_of_birth")) {
            optional_patch.insert("birthday".to_string(), Value::String(v));
        }
    }

    if is_missing_field(&creator_row, "gender") {
        if let Some(v) = parse_non_empty_string(agency_row.get("gender_identity")) {
            optional_patch.insert("gender".to_string(), Value::String(v));
        }
    }

    if is_missing_field(&creator_row, "ethnicity") {
        if let Some(race_value) = agency_row.get("race_ethnicity") {
            let races = parse_string_list(race_value);
            if !races.is_empty() {
                optional_patch.insert("ethnicity".to_string(), Value::String(races.join(", ")));
            }
        }
    }

    if is_missing_field(&creator_row, "instagram_handle") {
        if let Some(v) = parse_non_empty_string(agency_row.get("instagram_handle")) {
            optional_patch.insert("instagram_handle".to_string(), Value::String(v));
        }
    }

    if is_missing_field(&creator_row, "instagram_followers") {
        if let Some(v) = parse_i32(agency_row.get("instagram_followers")) {
            optional_patch.insert("instagram_followers".to_string(), Value::Number(v.into()));
        }
    }

    if is_missing_field(&creator_row, "engagement_rate") {
        if let Some(v) = parse_f64(agency_row.get("engagement_rate")) {
            if let Some(num) = serde_json::Number::from_f64(v) {
                optional_patch.insert("engagement_rate".to_string(), Value::Number(num));
            }
        }
    }

    if !patch.is_empty() {
        patch.insert("updated_at".to_string(), Value::String(now_rfc3339()));
        let _ = state
            .pg
            .from("creators")
            .eq("id", creator_id)
            .update(Value::Object(patch).to_string())
            .execute()
            .await;
    }

    if !optional_patch.is_empty() {
        optional_patch.insert("updated_at".to_string(), Value::String(now_rfc3339()));
        let res = state
            .pg
            .from("creators")
            .eq("id", creator_id)
            .update(Value::Object(optional_patch).to_string())
            .execute()
            .await;
        if let Err(e) = res {
            warn!(error = %e, creator_id, "optional creator hydration skipped due to schema mismatch");
        }
    }
}

pub async fn list_for_agency(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<ListAgencyTalentInvitesResponse>, (StatusCode, String)> {
    RoleGuard::new(vec!["agency"]).check(&user.role)?;

    let resp = state
        .pg
        .from("agency_talent_invites")
        .select(
            "id,agency_id,email,invited_name,status,expires_at,created_at,responded_at,updated_at",
        )
        .eq("agency_id", &user.id)
        .order("created_at.desc")
        .limit(500)
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

    let invites: Vec<AgencyTalentInvite> = serde_json::from_str(&text).unwrap_or_else(|_| vec![]);

    Ok(Json(ListAgencyTalentInvitesResponse {
        status: "ok".to_string(),
        invites,
    }))
}

pub async fn list_for_talent(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<ListAgencyTalentInvitesResponse>, (StatusCode, String)> {
    RoleGuard::new(vec!["creator", "talent"]).check(&user.role)?;

    let email = user.email.clone().unwrap_or_default().trim().to_lowercase();
    if email.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "missing email".to_string()));
    }

    let resp = state
        .pg
        .from("agency_talent_invites")
        .select(
            "id,agency_id,email,invited_name,token,status,expires_at,created_at,responded_at,updated_at,agencies(agency_name,logo_url)",
        )
        .eq("email", &email)
        .order("created_at.desc")
        .limit(200)
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

    let invites: Vec<AgencyTalentInvite> = serde_json::from_str(&text).unwrap_or_default();

    Ok(Json(ListAgencyTalentInvitesResponse {
        status: "ok".to_string(),
        invites,
    }))
}

pub async fn create_for_agency(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<CreateAgencyTalentInvitePayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    RoleGuard::new(vec!["agency"]).check(&user.role)?;

    let email = payload.email.trim().to_lowercase();
    if email.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "missing email".to_string()));
    }
    let creator_profile_exists = creator_profile_exists_by_email(&state, &email).await;
    let existing_creator_id = creator_id_by_email(&state, &email).await;

    if let Some(creator_id) = existing_creator_id.as_ref() {
        let active_link_resp = state
            .pg
            .from("agency_users")
            .select("id")
            .eq("agency_id", &user.id)
            .eq("creator_id", creator_id)
            .eq("status", "active")
            .limit(1)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let active_link_text = active_link_resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let active_link_rows: Vec<Value> =
            serde_json::from_str(&active_link_text).unwrap_or_default();

        if !active_link_rows.is_empty() {
            let _ = state
                .pg
                .from("agency_talent_invites")
                .eq("agency_id", &user.id)
                .eq("email", &email)
                .eq("status", "pending")
                .update(
                    json!({
                        "status": "revoked",
                        "updated_at": now_rfc3339(),
                    })
                    .to_string(),
                )
                .execute()
                .await;

            return Ok(Json(json!({
                "status": "ok",
                "invite_status": "already_connected",
                "creator_profile_exists": creator_profile_exists,
                "requires_password_setup": false,
            })));
        }
    }

    // Re-invitation: revoke previous pending invites to same email for this agency.
    let _ = state
        .pg
        .from("agency_talent_invites")
        .eq("agency_id", &user.id)
        .eq("email", &email)
        .eq("status", "pending")
        .update(
            json!({
                "status": "revoked",
                "updated_at": now_rfc3339(),
            })
            .to_string(),
        )
        .execute()
        .await;

    let token = uuid::Uuid::new_v4().to_string();

    let row = json!({
        "agency_id": user.id,
        "email": email,
        "invited_name": payload.invited_name,
        "token": token,
        "status": "pending",
        "updated_at": now_rfc3339(),
    });

    let resp = state
        .pg
        .from("agency_talent_invites")
        .insert(row.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(sanitize_db_error(status.as_u16(), text));
    }

    // Fetch agency name/logo for email
    let (agency_name, agency_logo_url) = {
        let aresp = state
            .pg
            .from("agencies")
            .select("agency_name,logo_url")
            .eq("id", &user.id)
            .single()
            .execute()
            .await
            .ok();
        if let Some(aresp) = aresp {
            if aresp.status().is_success() {
                if let Ok(atext) = aresp.text().await {
                    let v: serde_json::Value = serde_json::from_str(&atext).unwrap_or(json!({}));
                    (
                        v.get("agency_name")
                            .and_then(|x| x.as_str())
                            .unwrap_or("Agency")
                            .to_string(),
                        v.get("logo_url")
                            .and_then(|x| x.as_str())
                            .map(|s| s.to_string()),
                    )
                } else {
                    ("Agency".to_string(), None)
                }
            } else {
                ("Agency".to_string(), None)
            }
        } else {
            ("Agency".to_string(), None)
        }
    };

    let invite_url = format!(
        "{}/invite/agency/{}",
        state.frontend_url.trim_end_matches('/'),
        row.get("token").and_then(|x| x.as_str()).unwrap_or("")
    );

    let subject = format!("You’ve been invited to join {} on Likelee", agency_name);
    let mut lines: Vec<String> = vec![];
    lines.push("Hi,".to_string());
    lines.push("".to_string());
    lines.push(format!(
        "You’ve been invited to join {} on Likelee and access the Talent Portal.",
        agency_name
    ));
    lines.push("".to_string());
    lines.push("To accept the invitation:".to_string());
    if creator_profile_exists {
        lines.push("1) Sign in to your creator account".to_string());
        lines.push("2) Accept or decline the invitation".to_string());
    } else {
        lines.push("1) Set your password".to_string());
        lines.push("2) Accept or decline the invitation".to_string());
    }
    lines.push("".to_string());
    lines.push(format!("Invitation link: {}", invite_url));
    lines.push("".to_string());
    lines.push("This invitation expires in 7 days.".to_string());

    let body = lines.join("\n");

    // Best-effort email send
    let _ =
        crate::email::send_plain_text_email(&state, &email, &subject, &body, Some(&agency_name));

    Ok(Json(json!({
        "status": "ok",
        "invite_url": invite_url,
        "agency_name": agency_name,
        "agency_logo_url": agency_logo_url,
        "creator_profile_exists": creator_profile_exists,
        "requires_password_setup": !creator_profile_exists,
    })))
}

pub async fn revoke_for_agency(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<ActionResponse>, (StatusCode, String)> {
    RoleGuard::new(vec!["agency"]).check(&user.role)?;

    state
        .pg
        .from("agency_talent_invites")
        .eq("id", &id)
        .eq("agency_id", &user.id)
        .eq("status", "pending")
        .update(
            json!({
                "status": "revoked",
                "updated_at": now_rfc3339(),
            })
            .to_string(),
        )
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(ActionResponse {
        status: "ok".to_string(),
    }))
}

pub async fn get_by_token(
    State(state): State<AppState>,
    Path(token): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("agency_talent_invites")
        .select("id,agency_id,email,invited_name,token,status,expires_at,created_at,responded_at,updated_at,agencies(agency_name,logo_url)")
        .eq("token", &token)
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

    let mut rows: Vec<AgencyTalentInvite> = serde_json::from_str(&text).unwrap_or_default();
    let mut inv = rows
        .pop()
        .ok_or((StatusCode::NOT_FOUND, "invite not found".to_string()))?;

    let expired = is_expired(&inv.expires_at);
    if expired && inv.status == "pending" {
        // Best-effort mark as expired
        let _ = state
            .pg
            .from("agency_talent_invites")
            .eq("id", &inv.id)
            .update(
                json!({
                    "status": "expired",
                    "updated_at": now_rfc3339(),
                })
                .to_string(),
            )
            .execute()
            .await;
        inv.status = "expired".to_string();
    }

    let creator_profile_exists = creator_profile_exists_by_email(&state, &inv.email).await;

    Ok(Json(json!({
        "status": "ok",
        "invite": inv,
        "creator_profile_exists": creator_profile_exists,
        "requires_password_setup": !creator_profile_exists,
    })))
}

pub async fn get_magic_link_by_token(
    State(state): State<AppState>,
    Path(token): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("agency_talent_invites")
        .select("id,agency_id,email,invited_name,token,status,expires_at")
        .eq("token", &token)
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

    let mut rows: Vec<AgencyTalentInvite> = serde_json::from_str(&text).unwrap_or_default();
    let inv = rows
        .pop()
        .ok_or((StatusCode::NOT_FOUND, "invite not found".to_string()))?;

    if inv.status != "pending" {
        return Err((StatusCode::BAD_REQUEST, "invite is not pending".to_string()));
    }
    if is_expired(&inv.expires_at) {
        return Err((StatusCode::BAD_REQUEST, "invite expired".to_string()));
    }

    let email = inv.email.trim().to_lowercase();
    if email.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "missing email".to_string()));
    }

    let creator_profile_exists = creator_profile_exists_by_email(&state, &email).await;
    let client = Client::new();
    let gen_link_url = format!("{}/auth/v1/admin/generate_link", state.supabase_url);
    let invite_next = format!("/invite/agency/{}?intent=accept", token);
    let invite_redirect_to = format!(
        "{}/{}",
        state.frontend_url.trim_end_matches('/'),
        invite_next.trim_start_matches('/')
    );
    let recovery_redirect_to = format!(
        "{}/update-password?next={}",
        state.frontend_url.trim_end_matches('/'),
        encode(&invite_next)
    );

    let auth_headers = |rb: reqwest::RequestBuilder| {
        rb.header("apikey", state.supabase_service_key.clone())
            .header(
                "Authorization",
                format!("Bearer {}", state.supabase_service_key),
            )
    };

    let mut link_resp = if creator_profile_exists {
        let magic_body = json!({
            "type": "magiclink",
            "email": email.clone(),
            "options": { "redirect_to": invite_redirect_to }
        });
        auth_headers(client.post(&gen_link_url))
            .json(&magic_body)
            .send()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    } else {
        let recovery_body = json!({
            "type": "recovery",
            "email": email.clone(),
            "options": { "redirect_to": recovery_redirect_to }
        });
        auth_headers(client.post(&gen_link_url))
            .json(&recovery_body)
            .send()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    };

    if !link_resp.status().is_success() {
        let txt = link_resp.text().await.unwrap_or_default();
        let v: Value = serde_json::from_str(&txt).unwrap_or(json!({}));
        let error_code = v.get("error_code").and_then(|x| x.as_str()).unwrap_or("");
        let can_create_user = error_code == "user_not_found";

        if !can_create_user {
            return Err((StatusCode::BAD_REQUEST, txt));
        }

        let create_user_url = format!("{}/auth/v1/admin/users", state.supabase_url);
        let temp_password = format!("{}Aa1!", uuid::Uuid::new_v4());
        let create_body = json!({
            "email": email,
            "password": temp_password,
            "email_confirm": true,
            "user_metadata": {
                "role": "creator"
            }
        });

        let create_resp = auth_headers(client.post(&create_user_url))
            .json(&create_body)
            .send()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        if !create_resp.status().is_success() {
            let create_txt = create_resp.text().await.unwrap_or_default();
            return Err((StatusCode::BAD_REQUEST, create_txt));
        }

        let recovery_body = json!({
            "type": "recovery",
            "email": email,
            "options": { "redirect_to": recovery_redirect_to }
        });
        link_resp = auth_headers(client.post(&gen_link_url))
            .json(&recovery_body)
            .send()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        if !link_resp.status().is_success() {
            let retry_txt = link_resp.text().await.unwrap_or_default();
            return Err((StatusCode::BAD_REQUEST, retry_txt));
        }
    }

    let link_json: serde_json::Value = link_resp.json().await.unwrap_or(json!({}));
    let action_link = link_json
        .get("action_link")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    if action_link.is_empty() {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            "missing action_link".to_string(),
        ));
    }

    Ok(Json(json!({
        "status": "ok",
        "action_link": action_link,
        "requires_password_setup": !creator_profile_exists,
    })))
}

async fn ensure_creator_row_exists(state: &AppState, user: &AuthUser, creator_id: &str) {
    let resp = state
        .pg
        .from("creators")
        .select("id")
        .eq("id", creator_id)
        .limit(1)
        .execute()
        .await
        .ok();
    if let Some(resp) = resp {
        if resp.status().is_success() {
            if let Ok(txt) = resp.text().await {
                let rows: serde_json::Value = serde_json::from_str(&txt).unwrap_or(json!([]));
                if rows.as_array().map(|a| !a.is_empty()).unwrap_or(false) {
                    return;
                }
            }
        }
    }

    let _ = state
        .pg
        .from("creators")
        .insert(
            json!({
                "id": creator_id,
                "email": user.email,
                "full_name": user.email.clone().unwrap_or_default(),
                "updated_at": now_rfc3339(),
            })
            .to_string(),
        )
        .execute()
        .await;
}

pub async fn accept_by_token(
    State(state): State<AppState>,
    user: AuthUser,
    Path(token): Path<String>,
) -> Result<Json<ActionResponse>, (StatusCode, String)> {
    RoleGuard::new(vec!["creator", "talent"]).check(&user.role)?;
    let creator_id = resolve_effective_creator_id(&state, &user).await?;

    let resp = state
        .pg
        .from("agency_talent_invites")
        .select("id,agency_id,email,status,expires_at")
        .eq("token", &token)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let mut rows: Vec<AgencyTalentInvite> = serde_json::from_str(&text).unwrap_or_default();
    let inv = rows
        .pop()
        .ok_or((StatusCode::NOT_FOUND, "invite not found".to_string()))?;

    if inv.status != "pending" {
        return Err((StatusCode::BAD_REQUEST, "invite is not pending".to_string()));
    }
    if is_expired(&inv.expires_at) {
        return Err((StatusCode::BAD_REQUEST, "invite expired".to_string()));
    }

    let user_email = user.email.clone().unwrap_or_default().trim().to_lowercase();
    if user_email.is_empty() || user_email != inv.email.trim().to_lowercase() {
        return Err((
            StatusCode::FORBIDDEN,
            "email does not match invite".to_string(),
        ));
    }

    ensure_creator_row_exists(&state, &user, &creator_id).await;

    let mut existing_agency_user_id: Option<String> = None;
    let mut matched_agency_row: Option<Value> = None;

    let au_by_creator_resp = state
        .pg
        .from("agency_users")
        .select("*")
        .eq("agency_id", &inv.agency_id)
        .eq("creator_id", &creator_id)
        .order("updated_at.desc")
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let au_by_creator_text = au_by_creator_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let au_by_creator_rows: Vec<Value> =
        serde_json::from_str(&au_by_creator_text).unwrap_or_default();
    if let Some(row) = au_by_creator_rows.first() {
        if let Some(id) = row.get("id").and_then(|v| v.as_str()) {
            existing_agency_user_id = Some(id.to_string());
            matched_agency_row = Some(row.clone());
        }
    }

    if existing_agency_user_id.is_none() {
        let invited_email = inv.email.trim().to_lowercase();
        let au_by_email_resp = state
            .pg
            .from("agency_users")
            .select("*")
            .eq("agency_id", &inv.agency_id)
            .eq("email", &invited_email)
            .order("updated_at.desc")
            .limit(1)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let au_by_email_text = au_by_email_resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let au_by_email_rows: Vec<Value> =
            serde_json::from_str(&au_by_email_text).unwrap_or_default();
        if let Some(row) = au_by_email_rows.first() {
            if let Some(id) = row.get("id").and_then(|v| v.as_str()) {
                existing_agency_user_id = Some(id.to_string());
                matched_agency_row = Some(row.clone());
            }
        }
    }

    if let Some(agency_user_id) = existing_agency_user_id {
        let _ = state
            .pg
            .from("agency_users")
            .eq("id", &agency_user_id)
            .update(
                json!({
                    "creator_id": creator_id,
                    "status": "active",
                    "role": "talent",
                    "email": user.email.clone().unwrap_or_else(|| inv.email.clone()),
                    "updated_at": now_rfc3339(),
                })
                .to_string(),
            )
            .execute()
            .await;
    } else {
        // Compute full_legal_name
        let creator_resp = state
            .pg
            .from("creators")
            .select("full_name,email")
            .eq("id", &creator_id)
            .single()
            .execute()
            .await
            .ok();
        let mut full_legal_name = user.email.clone().unwrap_or_else(|| "Unknown".to_string());
        if let Some(cresp) = creator_resp {
            if cresp.status().is_success() {
                if let Ok(ctxt) = cresp.text().await {
                    let v: serde_json::Value = serde_json::from_str(&ctxt).unwrap_or(json!({}));
                    full_legal_name = v
                        .get("full_name")
                        .and_then(|x| x.as_str())
                        .filter(|s| !s.trim().is_empty())
                        .map(|s| s.to_string())
                        .or_else(|| user.email.clone())
                        .or_else(|| {
                            v.get("email")
                                .and_then(|x| x.as_str())
                                .map(|s| s.to_string())
                        })
                        .unwrap_or_else(|| "Unknown".to_string());
                }
            }
        }

        let _ = state
            .pg
            .from("agency_users")
            .insert(
                json!({
                    "agency_id": inv.agency_id,
                    "creator_id": creator_id,
                    "full_legal_name": full_legal_name,
                    "email": user.email.clone().unwrap_or_else(|| inv.email.clone()),
                    "status": "active",
                    "role": "talent",
                    "updated_at": now_rfc3339(),
                })
                .to_string(),
            )
            .execute()
            .await;
    }

    if let Some(row) = matched_agency_row.as_ref() {
        hydrate_creator_from_agency_row(&state, &creator_id, &inv.email, row).await;
    }

    // Mark invite accepted
    let _ = state
        .pg
        .from("agency_talent_invites")
        .eq("id", &inv.id)
        .update(
            json!({
                "status": "accepted",
                "responded_at": now_rfc3339(),
                "updated_at": now_rfc3339(),
            })
            .to_string(),
        )
        .execute()
        .await;

    Ok(Json(ActionResponse {
        status: "ok".to_string(),
    }))
}

async fn resolve_effective_creator_id(
    state: &AppState,
    user: &AuthUser,
) -> Result<String, (StatusCode, String)> {
    let resp = state
        .pg
        .from("agency_users")
        .select("creator_id")
        .or(format!("id.eq.{},user_id.eq.{}", user.id, user.id))
        .order("updated_at.desc")
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
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    let mapped = rows
        .first()
        .and_then(|r| r.get("creator_id"))
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    Ok(mapped.unwrap_or_else(|| user.id.clone()))
}

pub async fn decline_by_token(
    State(state): State<AppState>,
    user: AuthUser,
    Path(token): Path<String>,
) -> Result<Json<ActionResponse>, (StatusCode, String)> {
    RoleGuard::new(vec!["creator", "talent"]).check(&user.role)?;

    let resp = state
        .pg
        .from("agency_talent_invites")
        .select("id,agency_id,email,status,expires_at")
        .eq("token", &token)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let mut rows: Vec<AgencyTalentInvite> = serde_json::from_str(&text).unwrap_or_default();
    let inv = rows
        .pop()
        .ok_or((StatusCode::NOT_FOUND, "invite not found".to_string()))?;

    if inv.status != "pending" {
        return Err((StatusCode::BAD_REQUEST, "invite is not pending".to_string()));
    }
    if is_expired(&inv.expires_at) {
        return Err((StatusCode::BAD_REQUEST, "invite expired".to_string()));
    }

    let user_email = user.email.clone().unwrap_or_default().trim().to_lowercase();
    if user_email.is_empty() || user_email != inv.email.trim().to_lowercase() {
        return Err((
            StatusCode::FORBIDDEN,
            "email does not match invite".to_string(),
        ));
    }

    let _ = state
        .pg
        .from("agency_talent_invites")
        .eq("id", &inv.id)
        .update(
            json!({
                "status": "declined",
                "responded_at": now_rfc3339(),
                "updated_at": now_rfc3339(),
            })
            .to_string(),
        )
        .execute()
        .await;

    Ok(Json(ActionResponse {
        status: "ok".to_string(),
    }))
}
