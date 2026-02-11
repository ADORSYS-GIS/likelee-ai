use crate::{auth::AuthUser, auth::RoleGuard, config::AppState};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Serialize, Deserialize)]
pub struct CreatorAgencyInvite {
    pub id: String,
    pub agency_id: String,
    pub creator_id: String,
    pub status: String,
    pub created_at: Option<String>,
    pub responded_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct ListInvitesResponse {
    pub status: String,
    pub invites: Vec<CreatorAgencyInvite>,
}

pub async fn list_invites(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<ListInvitesResponse>, (StatusCode, String)> {
    RoleGuard::new(vec!["creator", "talent"]).check(&user.role)?;

    let resp = state
        .pg
        .from("creator_agency_invites")
        .select("id,agency_id,creator_id,status,created_at,responded_at,updated_at")
        .eq("creator_id", &user.id)
        .order("created_at.desc")
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
    let invites: Vec<CreatorAgencyInvite> = match v {
        serde_json::Value::Array(_) => serde_json::from_value(v)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?,
        _ => vec![],
    };

    Ok(Json(ListInvitesResponse {
        status: "ok".to_string(),
        invites,
    }))
}

#[derive(Serialize, Deserialize)]
pub struct ActionResponse {
    pub status: String,
}

pub async fn decline_invite(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<ActionResponse>, (StatusCode, String)> {
    RoleGuard::new(vec!["creator", "talent"]).check(&user.role)?;

    let payload = json!({
        "status": "declined",
        "responded_at": chrono::Utc::now().to_rfc3339(),
        "updated_at": chrono::Utc::now().to_rfc3339(),
    });

    state
        .pg
        .from("creator_agency_invites")
        .eq("id", &id)
        .eq("creator_id", &user.id)
        .update(payload.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(ActionResponse {
        status: "ok".to_string(),
    }))
}

#[derive(Serialize, Deserialize)]
struct InviteRow {
    agency_id: String,
    creator_id: String,
    status: String,
}

#[derive(Serialize, Deserialize)]
struct CreatorRow {
    full_name: Option<String>,
    email: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct AgencyUserRow {
    id: String,
}

pub async fn accept_invite(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<ActionResponse>, (StatusCode, String)> {
    RoleGuard::new(vec!["creator", "talent"]).check(&user.role)?;

    // Load invite to get agency_id and ensure it belongs to this creator.
    let invite_resp = state
        .pg
        .from("creator_agency_invites")
        .select("agency_id,creator_id,status")
        .eq("id", &id)
        .eq("creator_id", &user.id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let invite_text = invite_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut rows: Vec<InviteRow> = serde_json::from_str(&invite_text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let invite = rows
        .pop()
        .ok_or((StatusCode::NOT_FOUND, "invite not found".to_string()))?;

    if invite.status != "pending" {
        return Err((StatusCode::BAD_REQUEST, "invite is not pending".to_string()));
    }

    // Mark invite accepted.
    let now = chrono::Utc::now().to_rfc3339();
    let update_payload = json!({
        "status": "accepted",
        "responded_at": now,
        "updated_at": chrono::Utc::now().to_rfc3339(),
    });

    state
        .pg
        .from("creator_agency_invites")
        .eq("id", &id)
        .eq("creator_id", &user.id)
        .update(update_payload.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Ensure agency_users roster row exists for this creator + agency.
    let au_resp = state
        .pg
        .from("agency_users")
        .select("id")
        .eq("agency_id", &invite.agency_id)
        .eq("creator_id", &user.id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let au_text = au_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let existing: Vec<AgencyUserRow> = serde_json::from_str(&au_text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if existing.is_empty() {
        // Fetch creator details for full_legal_name mapping.
        let creator_resp = state
            .pg
            .from("creators")
            .select("full_name,email")
            .eq("id", &user.id)
            .limit(1)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let creator_text = creator_resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let mut creator_rows: Vec<CreatorRow> = serde_json::from_str(&creator_text)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let creator = creator_rows.pop().unwrap_or(CreatorRow {
            full_name: None,
            email: None,
        });

        let full_legal_name = creator
            .full_name
            .filter(|s| !s.trim().is_empty())
            .or_else(|| user.email.clone())
            .or_else(|| creator.email)
            .unwrap_or_else(|| "Unknown".to_string());

        let insert_payload = json!({
            "agency_id": invite.agency_id,
            "creator_id": user.id,
            "full_legal_name": full_legal_name,
            "email": user.email,
            "status": "active",
            "updated_at": chrono::Utc::now().to_rfc3339(),
        });

        state
            .pg
            .from("agency_users")
            .insert(insert_payload.to_string())
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    Ok(Json(ActionResponse {
        status: "ok".to_string(),
    }))
}

#[derive(Serialize, Deserialize)]
pub struct AgencyConnection {
    pub agency_id: String,
    pub agencies: Option<AgencyConnectionAgency>,
}

#[derive(Serialize, Deserialize)]
pub struct AgencyConnectionAgency {
    pub agency_name: Option<String>,
    pub logo_url: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct ListConnectionsResponse {
    pub status: String,
    pub connections: Vec<AgencyConnection>,
}

pub async fn list_connections(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<ListConnectionsResponse>, (StatusCode, String)> {
    RoleGuard::new(vec!["creator", "talent"]).check(&user.role)?;

    let resp = state
        .pg
        .from("agency_users")
        .select("agency_id,agencies(agency_name,logo_url)")
        .eq("creator_id", &user.id)
        .eq("status", "active")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let connections: Vec<AgencyConnection> = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(ListConnectionsResponse {
        status: "ok".to_string(),
        connections,
    }))
}

pub async fn disconnect_agency(
    State(state): State<AppState>,
    user: AuthUser,
    Path(agency_id): Path<String>,
) -> Result<Json<ActionResponse>, (StatusCode, String)> {
    RoleGuard::new(vec!["creator", "talent"]).check(&user.role)?;

    let payload = json!({
        "status": "inactive",
        "updated_at": chrono::Utc::now().to_rfc3339(),
    });

    state
        .pg
        .from("agency_users")
        .eq("creator_id", &user.id)
        .eq("agency_id", &agency_id)
        .update(payload.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(ActionResponse {
        status: "ok".to_string(),
    }))
}
