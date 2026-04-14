use crate::email;
use crate::errors::sanitize_db_error;
use crate::team::{permissions::Permission, require_agency_permission};
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
    pub contract_id: Option<String>,
    pub created_at: Option<String>,
    pub responded_at: Option<String>,
    pub updated_at: Option<String>,
    pub agencies: Option<CreatorAgencyInviteAgency>,
    pub marketplace_contract:
        Option<crate::agency_marketplace_contracts::MarketplaceContractSummary>,
}

#[derive(Serialize, Deserialize)]
pub struct CreatorAgencyInviteAgency {
    pub agency_name: Option<String>,
    pub logo_url: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
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
    let creator_id = resolve_effective_creator_id(&state, &user).await?;
    crate::agency_marketplace_contracts::sync_open_contracts_for_creator(&state, &creator_id)
        .await?;

    let resp = state
        .pg
        .from("creator_agency_invites")
        .select("id,agency_id,creator_id,status,contract_id,created_at,responded_at,updated_at,agencies(agency_name,logo_url,email,website)")
        .eq("creator_id", &creator_id)
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
    let mut invites: Vec<CreatorAgencyInvite> = match v {
        serde_json::Value::Array(_) => serde_json::from_value(v)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?,
        _ => vec![],
    };

    for invite in &mut invites {
        invite.marketplace_contract =
            crate::agency_marketplace_contracts::get_latest_contract_for_pair(
                &state,
                &invite.agency_id,
                &invite.creator_id,
            )
            .await;
    }

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
    let creator_id = resolve_effective_creator_id(&state, &user).await?;

    let contract_resp = state
        .pg
        .from("agency_creator_marketplace_contracts")
        .select("*")
        .eq("invite_id", &id)
        .order("created_at.desc")
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let contract_text = contract_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let contract_rows: Vec<serde_json::Value> =
        serde_json::from_str(&contract_text).unwrap_or_default();
    if let Some(contract_row) = contract_rows.first() {
        let _ = state
            .pg
            .from("agency_creator_marketplace_contracts")
            .eq(
                "id",
                contract_row
                    .get("id")
                    .and_then(|v| v.as_str())
                    .unwrap_or(""),
            )
            .update(
                json!({
                    "status": "declined",
                    "docuseal_status": "declined",
                    "updated_at": chrono::Utc::now().to_rfc3339(),
                    "last_synced_at": chrono::Utc::now().to_rfc3339(),
                })
                .to_string(),
            )
            .execute()
            .await;
    }

    let payload = json!({
        "status": "declined",
        "responded_at": chrono::Utc::now().to_rfc3339(),
        "updated_at": chrono::Utc::now().to_rfc3339(),
    });

    state
        .pg
        .from("creator_agency_invites")
        .eq("id", &id)
        .eq("creator_id", &creator_id)
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
struct AgencyUserRow {
    id: String,
}

async fn upsert_agency_talent_connection(
    state: &AppState,
    agency_id: &str,
    talent_id: Option<&str>,
    creator_id: &str,
    status: &str,
) -> Result<(), (StatusCode, String)> {
    let payload = json!({
        "agency_id": agency_id,
        "talent_id": talent_id,
        "creator_id": creator_id,
        "status": status,
        "updated_at": chrono::Utc::now().to_rfc3339(),
    });

    let existing_resp = state
        .pg
        .from("agency_talent_relationships")
        .select("id")
        .eq("agency_id", agency_id)
        .eq("creator_id", creator_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let existing_status = existing_resp.status();
    let existing_text = existing_resp.text().await.unwrap_or_default();
    if !existing_status.is_success() {
        return Err(sanitize_db_error(existing_status.as_u16(), existing_text));
    }
    let existing_rows: Vec<serde_json::Value> =
        serde_json::from_str(&existing_text).unwrap_or_default();

    let resp = if let Some(existing_id) = existing_rows
        .first()
        .and_then(|row| row.get("id"))
        .and_then(|v| v.as_str())
        .filter(|id| !id.trim().is_empty())
    {
        state
            .pg
            .from("agency_talent_relationships")
            .eq("id", existing_id)
            .update(payload.to_string())
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    } else {
        state
            .pg
            .from("agency_talent_relationships")
            .insert(payload.to_string())
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    };
    let resp_status = resp.status();
    if !resp_status.is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err(sanitize_db_error(resp_status.as_u16(), err));
    }
    Ok(())
}

pub async fn accept_invite(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<ActionResponse>, (StatusCode, String)> {
    RoleGuard::new(vec!["creator", "talent"]).check(&user.role)?;
    let creator_id = resolve_effective_creator_id(&state, &user).await?;

    let contract_resp = state
        .pg
        .from("agency_creator_marketplace_contracts")
        .select("*")
        .eq("invite_id", &id)
        .order("created_at.desc")
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let contract_text = contract_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let contract_rows: Vec<serde_json::Value> =
        serde_json::from_str(&contract_text).unwrap_or_default();
    if let Some(contract_row) = contract_rows.first() {
        let synced =
            crate::agency_marketplace_contracts::sync_contract_for_row(&state, contract_row)
                .await?;
        if synced.status != "active" {
            return Err((
                StatusCode::BAD_REQUEST,
                "This invitation requires contract signature before activation.".to_string(),
            ));
        }
        return Ok(Json(ActionResponse {
            status: "ok".to_string(),
        }));
    }

    // Load invite to get agency_id and ensure it belongs to this creator.
    let invite_resp = state
        .pg
        .from("creator_agency_invites")
        .select("agency_id,creator_id,status")
        .eq("id", &id)
        .eq("creator_id", &creator_id)
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

    // Ensure a creators row exists for this user so "talent is also creator" holds.
    // Best-effort: if it already exists, the insert will fail and we ignore it.
    let _ = state
        .pg
        .from("creators")
        .insert(
            json!({
                "id": creator_id,
                "email": user.email,
                "full_name": user.email.clone().unwrap_or_default(),
                "updated_at": chrono::Utc::now().to_rfc3339(),
            })
            .to_string(),
        )
        .execute()
        .await;

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
        .eq("creator_id", &creator_id)
        .update(update_payload.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let au_resp = state
        .pg
        .from("agency_users")
        .select("id")
        .eq("agency_id", &invite.agency_id)
        .eq("creator_id", &creator_id)
        .eq("role", "talent")
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
    let talent_id = existing.first().map(|r| r.id.as_str());

    upsert_agency_talent_connection(&state, &invite.agency_id, talent_id, &creator_id, "active")
        .await?;

    Ok(Json(ActionResponse {
        status: "ok".to_string(),
    }))
}

#[derive(Serialize, Deserialize)]
pub struct AgencyConnection {
    pub agency_id: String,
    pub agencies: Option<AgencyConnectionAgency>,
    pub marketplace_contract:
        Option<crate::agency_marketplace_contracts::MarketplaceContractSummary>,
}

#[derive(Serialize, Deserialize)]
pub struct AgencyConnectionAgency {
    pub agency_name: Option<String>,
    pub logo_url: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct ListConnectionsResponse {
    pub status: String,
    pub connections: Vec<AgencyConnection>,
}

#[derive(Serialize, Deserialize)]
pub struct ContractSummaryResponse {
    pub status: String,
    pub contract: Option<crate::agency_marketplace_contracts::MarketplaceContractSummary>,
}

#[derive(Serialize, Deserialize)]
pub struct DisconnectRequestPayload {
    pub reason: Option<String>,
}

pub async fn list_connections(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<ListConnectionsResponse>, (StatusCode, String)> {
    RoleGuard::new(vec!["creator", "talent"]).check(&user.role)?;
    let creator_id = resolve_effective_creator_id(&state, &user).await?;
    crate::agency_marketplace_contracts::sync_open_contracts_for_creator(&state, &creator_id)
        .await?;

    let resp = state
        .pg
        .from("agency_talent_relationships")
        .select("agency_id,agencies(agency_name,logo_url,email,website)")
        .eq("creator_id", &creator_id)
        .eq("status", "active")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut connections: Vec<AgencyConnection> = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    for connection in &mut connections {
        connection.marketplace_contract =
            crate::agency_marketplace_contracts::get_latest_live_contract_for_pair(
                &state,
                &connection.agency_id,
                &creator_id,
            )
            .await;
    }

    Ok(Json(ListConnectionsResponse {
        status: "ok".to_string(),
        connections,
    }))
}

async fn get_latest_contract_for_connection(
    state: &AppState,
    agency_id: &str,
    creator_id: &str,
) -> Result<Option<serde_json::Value>, (StatusCode, String)> {
    crate::agency_marketplace_contracts::get_latest_contract_row_for_pair(
        state, agency_id, creator_id,
    )
    .await
}

async fn notify_agency_about_disconnect_request(
    state: &AppState,
    agency_id: &str,
    creator_name: &str,
    reason: Option<&str>,
) {
    let Ok((agency_name, agency_email)) =
        crate::agency_marketplace_contracts::resolve_agency_identity(state, agency_id).await
    else {
        return;
    };

    if agency_email.trim().is_empty() {
        return;
    }

    let subject = format!(
        "{} requested to disconnect from {}",
        creator_name, agency_name
    );
    let mut body = format!(
        "{} has requested to disconnect from your active marketplace contract on Likelee.",
        creator_name
    );
    if let Some(text) = reason.filter(|value| !value.trim().is_empty()) {
        body.push_str(&format!("\n\nReason provided:\n{}", text.trim()));
    }
    body.push_str(
        "\n\nPlease review this request in your agency dashboard roster before approving the disconnect.",
    );

    let _ = email::send_plain_text_email(state, &agency_email, &subject, &body, Some(&agency_name));
}

pub async fn disconnect_agency(
    State(state): State<AppState>,
    user: AuthUser,
    Path(agency_id): Path<String>,
    maybe_payload: Option<Json<DisconnectRequestPayload>>,
) -> Result<Json<ActionResponse>, (StatusCode, String)> {
    RoleGuard::new(vec!["creator", "talent"]).check(&user.role)?;
    let creator_id = resolve_effective_creator_id(&state, &user).await?;
    crate::agency_marketplace_contracts::sync_open_contracts_for_creator(&state, &creator_id)
        .await?;

    if let Some(contract_row) =
        get_latest_contract_for_connection(&state, &agency_id, &creator_id).await?
    {
        let contract_status = contract_row
            .get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("draft")
            .to_lowercase();
        let disconnect_status = contract_row
            .get("disconnect_status")
            .and_then(|v| v.as_str())
            .unwrap_or("none")
            .to_lowercase();

        if contract_status == "active"
            && crate::agency_marketplace_contracts::get_latest_live_contract_for_pair(
                &state,
                &agency_id,
                &creator_id,
            )
            .await
            .is_some()
        {
            if disconnect_status == "pending" {
                return Ok(Json(ActionResponse {
                    status: "disconnect_pending".to_string(),
                }));
            }

            let reason = maybe_payload
                .as_ref()
                .and_then(|payload| payload.reason.clone())
                .map(|value| value.trim().to_string())
                .filter(|value| !value.is_empty());

            let contract_id = contract_row
                .get("id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let update = json!({
                "disconnect_status": "pending",
                "disconnect_requested_by": "creator",
                "disconnect_requested_at": chrono::Utc::now().to_rfc3339(),
                "disconnect_reason": reason,
                "disconnect_reviewed_by": serde_json::Value::Null,
                "disconnect_reviewed_at": serde_json::Value::Null,
                "updated_at": chrono::Utc::now().to_rfc3339(),
            });
            state
                .pg
                .from("agency_creator_marketplace_contracts")
                .eq("id", &contract_id)
                .update(update.to_string())
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

            let creator_name = user.email.clone().unwrap_or_else(|| "Creator".to_string());
            notify_agency_about_disconnect_request(
                &state,
                &agency_id,
                &creator_name,
                reason.as_deref(),
            )
            .await;

            return Ok(Json(ActionResponse {
                status: "disconnect_requested".to_string(),
            }));
        }

        if contract_status == "expired" || contract_status == "terminated" {
            crate::agency_marketplace_contracts::remove_live_connection_for_contract_row(
                &state,
                &contract_row,
            )
            .await;
            return Ok(Json(ActionResponse {
                status: "ok".to_string(),
            }));
        }
    }

    state
        .pg
        .from("agency_talent_relationships")
        .eq("creator_id", &creator_id)
        .eq("agency_id", &agency_id)
        .delete()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(ActionResponse {
        status: "ok".to_string(),
    }))
}

pub async fn approve_disconnect_request(
    State(state): State<AppState>,
    user: AuthUser,
    Path(creator_id): Path<String>,
) -> Result<Json<ActionResponse>, (StatusCode, String)> {
    RoleGuard::new(vec!["agency"]).check(&user.role)?;
    let access =
        require_agency_permission(&state, &user, Permission::DisconnectBrandConnections).await?;
    let agency_id = &access.organization_id;
    crate::agency_marketplace_contracts::sync_open_contracts_for_agency(&state, agency_id).await?;
    let contract_row = get_latest_contract_for_connection(&state, agency_id, &creator_id)
        .await?
        .ok_or((StatusCode::NOT_FOUND, "contract not found".to_string()))?;
    let disconnect_status = contract_row
        .get("disconnect_status")
        .and_then(|v| v.as_str())
        .unwrap_or("none");
    if disconnect_status != "pending" {
        return Err((
            StatusCode::BAD_REQUEST,
            "there is no pending disconnect request".to_string(),
        ));
    }

    let contract_id = contract_row
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let update = json!({
        "status": "terminated",
        "disconnect_status": "approved",
        "disconnect_reviewed_by": user.id,
        "disconnect_reviewed_at": chrono::Utc::now().to_rfc3339(),
        "updated_at": chrono::Utc::now().to_rfc3339(),
    });
    let update_resp = state
        .pg
        .from("agency_creator_marketplace_contracts")
        .eq("id", &contract_id)
        .eq("agency_id", agency_id)
        .update(update.to_string())
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
    let rows: Vec<serde_json::Value> = serde_json::from_str(&update_text).unwrap_or_default();
    if let Some(updated_row) = rows.first() {
        crate::agency_marketplace_contracts::remove_live_connection_for_contract_row(
            &state,
            updated_row,
        )
        .await;
    }

    Ok(Json(ActionResponse {
        status: "approved".to_string(),
    }))
}

pub async fn reject_disconnect_request(
    State(state): State<AppState>,
    user: AuthUser,
    Path(creator_id): Path<String>,
) -> Result<Json<ActionResponse>, (StatusCode, String)> {
    RoleGuard::new(vec!["agency"]).check(&user.role)?;
    let access =
        require_agency_permission(&state, &user, Permission::DisconnectBrandConnections).await?;
    let agency_id = &access.organization_id;
    let contract_row = get_latest_contract_for_connection(&state, agency_id, &creator_id)
        .await?
        .ok_or((StatusCode::NOT_FOUND, "contract not found".to_string()))?;
    let disconnect_status = contract_row
        .get("disconnect_status")
        .and_then(|v| v.as_str())
        .unwrap_or("none");
    if disconnect_status != "pending" {
        return Err((
            StatusCode::BAD_REQUEST,
            "there is no pending disconnect request".to_string(),
        ));
    }
    let contract_id = contract_row
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let update = json!({
        "disconnect_status": "rejected",
        "disconnect_reviewed_by": user.id,
        "disconnect_reviewed_at": chrono::Utc::now().to_rfc3339(),
        "updated_at": chrono::Utc::now().to_rfc3339(),
    });
    state
        .pg
        .from("agency_creator_marketplace_contracts")
        .eq("id", &contract_id)
        .eq("agency_id", agency_id)
        .update(update.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(ActionResponse {
        status: "rejected".to_string(),
    }))
}

pub async fn get_agency_contract_summary(
    State(state): State<AppState>,
    user: AuthUser,
    Path(creator_id): Path<String>,
) -> Result<Json<ContractSummaryResponse>, (StatusCode, String)> {
    RoleGuard::new(vec!["agency"]).check(&user.role)?;
    crate::agency_marketplace_contracts::sync_open_contracts_for_agency(&state, &user.id).await?;
    let contract = crate::agency_marketplace_contracts::get_latest_live_contract_for_pair(
        &state,
        &user.id,
        &creator_id,
    )
    .await;
    Ok(Json(ContractSummaryResponse {
        status: "ok".to_string(),
        contract,
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
