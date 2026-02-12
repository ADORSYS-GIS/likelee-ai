use crate::{auth::AuthUser, auth::RoleGuard, config::AppState};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use chrono::{DateTime, Utc};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;

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

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

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

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

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
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
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
    lines.push("1) Set your password / log in".to_string());
    lines.push("2) Accept or decline the invitation".to_string());
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

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
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

    Ok(Json(json!({
        "status": "ok",
        "invite": inv,
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

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

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

    let email = inv.email.trim().to_lowercase();
    if email.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "missing email".to_string()));
    }

    let client = Client::new();
    let gen_link_url = format!("{}/auth/v1/admin/generate_link", state.supabase_url);
    let redirect_to = format!(
        "{}/update-password?next=/invite/agency/{}",
        state.frontend_url.trim_end_matches('/'),
        token
    );
    let body = json!({
        "type": "recovery",
        "email": email,
        "options": {
            "redirect_to": redirect_to
        }
    });

    let mut link_resp = client
        .post(&gen_link_url)
        .header("apikey", state.supabase_service_key.clone())
        .header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        )
        .json(&body)
        .send()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !link_resp.status().is_success() {
        let txt = link_resp.text().await.unwrap_or_default();
        let v: serde_json::Value = serde_json::from_str(&txt).unwrap_or(json!({}));
        let error_code = v.get("error_code").and_then(|x| x.as_str()).unwrap_or("");

        // If the invited email doesn't exist yet in Supabase Auth, create it (temp password)
        // then retry generate_link.
        if error_code == "user_not_found" {
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

            let create_resp = client
                .post(&create_user_url)
                .header("apikey", state.supabase_service_key.clone())
                .header(
                    "Authorization",
                    format!("Bearer {}", state.supabase_service_key),
                )
                .json(&create_body)
                .send()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

            if !create_resp.status().is_success() {
                let create_txt = create_resp.text().await.unwrap_or_default();
                return Err((StatusCode::BAD_REQUEST, create_txt));
            }

            link_resp = client
                .post(&gen_link_url)
                .header("apikey", state.supabase_service_key.clone())
                .header(
                    "Authorization",
                    format!("Bearer {}", state.supabase_service_key),
                )
                .json(&body)
                .send()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

            if !link_resp.status().is_success() {
                let retry_txt = link_resp.text().await.unwrap_or_default();
                return Err((StatusCode::BAD_REQUEST, retry_txt));
            }
        } else {
            return Err((StatusCode::BAD_REQUEST, txt));
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
    })))
}

async fn ensure_creator_row_exists(state: &AppState, user: &AuthUser) {
    let resp = state
        .pg
        .from("creators")
        .select("id")
        .eq("id", &user.id)
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
                "id": user.id,
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

    ensure_creator_row_exists(&state, &user).await;

    // Upsert / reactivate agency_users row
    let au_resp = state
        .pg
        .from("agency_users")
        .select("id,status")
        .eq("agency_id", &inv.agency_id)
        .eq("creator_id", &user.id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let au_text = au_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let existing: serde_json::Value = serde_json::from_str(&au_text).unwrap_or(json!([]));

    if existing.as_array().map(|a| !a.is_empty()).unwrap_or(false) {
        let _ = state
            .pg
            .from("agency_users")
            .eq("agency_id", &inv.agency_id)
            .eq("creator_id", &user.id)
            .update(
                json!({
                    "status": "active",
                    "role": "talent",
                    "email": user.email,
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
            .eq("id", &user.id)
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
                    "creator_id": user.id,
                    "full_legal_name": full_legal_name,
                    "email": user.email,
                    "status": "active",
                    "role": "talent",
                    "updated_at": now_rfc3339(),
                })
                .to_string(),
            )
            .execute()
            .await;
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
