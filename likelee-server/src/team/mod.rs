pub mod permissions;

use crate::{
    auth::AuthUser,
    config::AppState,
    email,
    errors::sanitize_db_error,
};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::{Duration, Utc};
use permissions::{has_permission, permissions_for_role, Permission, TeamRole};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::time::Duration as StdDuration;

const CACHE_NAMESPACE_ORG_ACCESS: &str = "org_access";
const CACHE_NAMESPACE_BRAND_AGENCY_CONN: &str = "brand_agency_conn";
const ORG_ACCESS_CACHE_TTL_SECS: u64 = 300; // 5 minutes
const BRAND_AGENCY_CONN_CACHE_TTL_SECS: u64 = 60; // 1 minute

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum OrganizationType {
    Agency,
    Brand,
}

impl OrganizationType {
    fn as_str(self) -> &'static str {
        match self {
            Self::Agency => "agency",
            Self::Brand => "brand",
        }
    }

    fn parse(value: &str) -> Option<Self> {
        match value.trim() {
            "agency" => Some(Self::Agency),
            "brand" => Some(Self::Brand),
            _ => None,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MembershipRecord {
    pub organization_type: String,
    pub organization_id: String,
    pub organization_name: String,
    pub user_id: String,
    pub email: String,
    pub role: String,
    pub status: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub last_role_changed_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InviteRecord {
    pub id: String,
    pub organization_type: String,
    pub organization_id: String,
    pub email: String,
    pub role: String,
    pub status: String,
    pub invited_by: String,
    pub expires_at: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TeamContextResponse {
    pub organization_type: String,
    pub organization_id: String,
    pub organization_name: String,
    pub membership_role: String,
    pub permissions: Vec<String>,
    pub members: Vec<MembershipRecord>,
    pub invites: Vec<InviteRecord>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ActionResponse {
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuditLogRecord {
    pub id: String,
    pub organization_type: String,
    pub organization_id: String,
    pub actor_user_id: String,
    pub target_user_id: Option<String>,
    pub target_email: Option<String>,
    pub action: String,
    pub old_role: Option<String>,
    pub new_role: Option<String>,
    pub metadata: Value,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct TeamScopeQuery {
    pub organization_type: Option<String>,
    pub organization_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateInvitePayload {
    pub email: String,
    pub role: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMemberRolePayload {
    pub role: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ResolvedScope {
    organization_type: OrganizationType,
    organization_id: String,
    organization_name: String,
    membership: MembershipRecord,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrganizationAccess {
    pub organization_type: String,
    pub organization_id: String,
    pub organization_name: String,
    pub membership_role: String,
    pub permissions: Vec<String>,
}

pub async fn get_context(
    State(state): State<AppState>,
    user: AuthUser,
    Query(query): Query<TeamScopeQuery>,
) -> Result<Json<TeamContextResponse>, (StatusCode, String)> {
    let scope = resolve_scope(&state, &user, &query).await?;
    ensure_permission(&scope.membership, Permission::ViewTeamMembers)?;

    let members =
        list_members_for_scope(&state, scope.organization_type, scope.organization_id.as_str()).await?;
    let invites =
        list_invites_for_scope(&state, scope.organization_type, scope.organization_id.as_str()).await?;

    Ok(Json(TeamContextResponse {
        organization_type: scope.organization_type.as_str().to_string(),
        organization_id: scope.organization_id,
        organization_name: scope.organization_name,
        membership_role: scope.membership.role.clone(),
        permissions: permissions_for_membership(&scope.membership)?,
        members,
        invites,
    }))
}

pub async fn get_invite_by_token(
    State(state): State<AppState>,
    Path(raw_token): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let invite = fetch_invite_by_raw_token(&state, raw_token.as_str()).await?;
    let invite = expire_invite_if_needed(&state, invite).await?;
    let organization_type =
        OrganizationType::parse(invite.organization_type.as_str()).ok_or((
            StatusCode::INTERNAL_SERVER_ERROR,
            "Invalid organization type on invite".to_string(),
        ))?;
    let organization_name =
        fetch_organization_name(&state, organization_type, invite.organization_id.as_str()).await?;

    Ok(Json(json!({
        "status": "ok",
        "invite": {
            "id": invite.id,
            "organization_type": invite.organization_type,
            "organization_id": invite.organization_id,
            "organization_name": organization_name,
            "email": invite.email,
            "role": invite.role,
            "status": invite.status,
            "expires_at": invite.expires_at,
            "created_at": invite.created_at,
            "updated_at": invite.updated_at,
        },
        "requires_password_setup": true
    })))
}

pub async fn list_members(
    State(state): State<AppState>,
    user: AuthUser,
    Query(query): Query<TeamScopeQuery>,
) -> Result<Json<Vec<MembershipRecord>>, (StatusCode, String)> {
    let scope = resolve_scope(&state, &user, &query).await?;
    ensure_permission(&scope.membership, Permission::ViewTeamMembers)?;

    let members =
        list_members_for_scope(&state, scope.organization_type, scope.organization_id.as_str()).await?;
    Ok(Json(members))
}

pub async fn list_invites(
    State(state): State<AppState>,
    user: AuthUser,
    Query(query): Query<TeamScopeQuery>,
) -> Result<Json<Vec<InviteRecord>>, (StatusCode, String)> {
    let scope = resolve_scope(&state, &user, &query).await?;
    ensure_permission(&scope.membership, Permission::ViewTeamMembers)?;

    let invites =
        list_invites_for_scope(&state, scope.organization_type, scope.organization_id.as_str()).await?;
    Ok(Json(invites))
}

pub async fn list_audit_logs(
    State(state): State<AppState>,
    user: AuthUser,
    Query(query): Query<TeamScopeQuery>,
) -> Result<Json<Vec<AuditLogRecord>>, (StatusCode, String)> {
    let scope = resolve_scope(&state, &user, &query).await?;
    ensure_permission(&scope.membership, Permission::ViewTeamMembers)?;

    let logs =
        list_audit_logs_for_scope(&state, scope.organization_type, scope.organization_id.as_str())
            .await?;
    Ok(Json(logs))
}

pub async fn create_invite(
    State(state): State<AppState>,
    user: AuthUser,
    Query(query): Query<TeamScopeQuery>,
    Json(payload): Json<CreateInvitePayload>,
) -> Result<Json<InviteRecord>, (StatusCode, String)> {
    let scope = resolve_scope(&state, &user, &query).await?;
    ensure_permission(&scope.membership, Permission::InviteTeamMembers)?;

    let invited_email = normalize_email(payload.email.as_str())?;
    let invited_role = parse_assignable_role(payload.role.as_str())?;

    ensure_assignable_role(&scope.membership.role, invited_role)?;
    ensure_member_not_active(
        &state,
        scope.organization_type,
        scope.organization_id.as_str(),
        invited_email.as_str(),
    )
    .await?;
    ensure_pending_invite_not_exists(
        &state,
        scope.organization_type,
        scope.organization_id.as_str(),
        invited_email.as_str(),
    )
    .await?;

    let raw_token = uuid::Uuid::new_v4().to_string();
    let token_hash = hash_token(raw_token.as_str());
    let expires_at = (Utc::now() + Duration::hours(72)).to_rfc3339();
    let row = json!({
        "organization_type": scope.organization_type.as_str(),
        "organization_id": scope.organization_id,
        "email": invited_email,
        "role": invited_role.as_str(),
        "token_hash": token_hash,
        "status": "pending",
        "invited_by": user.id,
        "expires_at": expires_at,
        "updated_at": now_rfc3339(),
    });

    let resp = state
        .pg
        .from("organization_invites")
        .insert(row.to_string())
        .execute()
        .await
        .map_err(internal_error)?;
    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(sanitize_db_error(status.as_u16(), text));
    }

    write_audit_log(
        &state,
        scope.organization_type,
        scope.organization_id.as_str(),
        user.id.as_str(),
        None,
        Some(invited_email.as_str()),
        "team_invite_created",
        None,
        Some(invited_role.as_str()),
        json!({ "expires_at": expires_at }),
    )
    .await?;

    let invite = latest_invite_for_email(
        &state,
        scope.organization_type,
        scope.organization_id.as_str(),
        invited_email.as_str(),
    )
    .await?;

    let invite_url = format!(
        "{}/invite/team/{}",
        state.frontend_url.trim_end_matches('/'),
        raw_token
    );
    let subject = format!("You’ve been invited to join {} on Likelee", scope.organization_name);
    let body = format!(
        "Hi,\n\nYou’ve been invited to join {} on Likelee as {}.\n\nUse this invitation link to continue: {}\n\nThis invite expires in 72 hours.",
        scope.organization_name,
        invited_role.as_str().replace('_', " "),
        invite_url
    );
    let _ = email::send_plain_text_email(
        &state,
        invite.email.as_str(),
        subject.as_str(),
        body.as_str(),
        Some(scope.organization_name.as_str()),
    );

    Ok(Json(invite))
}

pub async fn update_member_role(
    State(state): State<AppState>,
    user: AuthUser,
    Path(target_user_id): Path<String>,
    Query(query): Query<TeamScopeQuery>,
    Json(payload): Json<UpdateMemberRolePayload>,
) -> Result<Json<MembershipRecord>, (StatusCode, String)> {
    let scope = resolve_scope(&state, &user, &query).await?;
    ensure_permission(&scope.membership, Permission::UpdateMemberRoles)?;

    let current_role = TeamRole::parse(scope.membership.role.as_str()).ok_or((
        StatusCode::FORBIDDEN,
        "Invalid actor membership role".to_string(),
    ))?;
    let next_role = parse_assignable_role(payload.role.as_str())?;

    let target_membership = fetch_target_membership(
        &state,
        scope.organization_type,
        scope.organization_id.as_str(),
        target_user_id.as_str(),
    )
    .await?;
    let target_role = TeamRole::parse(target_membership.role.as_str()).ok_or((
        StatusCode::BAD_REQUEST,
        "Invalid target membership role".to_string(),
    ))?;

    match current_role {
        TeamRole::Owner => {
            if target_role == TeamRole::Owner || next_role == TeamRole::Owner {
                return Err((
                    StatusCode::BAD_REQUEST,
                    "Owner transfer is not supported by this endpoint".to_string(),
                ));
            }
        }
        TeamRole::Admin => {
            if target_role == TeamRole::Admin {
                return Err((
                    StatusCode::FORBIDDEN,
                    "Only the owner can change another admin's role".to_string(),
                ));
            }
            if next_role == TeamRole::Owner {
                return Err((
                    StatusCode::FORBIDDEN,
                    "Admins cannot promote members to owner".to_string(),
                ));
            }
        }
        _ => {
            return Err((
                StatusCode::FORBIDDEN,
                "Only owner or admin can update member roles".to_string(),
            ));
        }
    }

    if target_role == next_role {
        return Ok(Json(target_membership));
    }

    let resp = state
        .pg
        .from("organization_memberships")
        .eq("organization_type", scope.organization_type.as_str())
        .eq("organization_id", scope.organization_id.as_str())
        .eq("user_id", target_user_id.as_str())
        .update(
            json!({
                "role": next_role.as_str(),
                "updated_at": now_rfc3339(),
                "last_role_changed_at": now_rfc3339(),
            })
            .to_string(),
        )
        .execute()
        .await
        .map_err(internal_error)?;
    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(sanitize_db_error(status.as_u16(), text));
    }

    write_audit_log(
        &state,
        scope.organization_type,
        scope.organization_id.as_str(),
        user.id.as_str(),
        Some(target_user_id.as_str()),
        Some(target_membership.email.as_str()),
        "member_role_updated",
        Some(target_role.as_str()),
        Some(next_role.as_str()),
        json!({}),
    )
    .await?;

    let updated = fetch_target_membership(
        &state,
        scope.organization_type,
        scope.organization_id.as_str(),
        target_user_id.as_str(),
    )
    .await?;
    let subject = format!("Your role changed in {}", scope.organization_name);
    let body = format!(
        "Hi,\n\nYour role in {} has been updated from {} to {}.",
        scope.organization_name,
        target_role.as_str().replace('_', " "),
        next_role.as_str().replace('_', " ")
    );
    let _ = email::send_plain_text_email(
        &state,
        updated.email.as_str(),
        subject.as_str(),
        body.as_str(),
        Some(scope.organization_name.as_str()),
    );

    Ok(Json(updated))
}

pub async fn accept_invite_by_token(
    State(state): State<AppState>,
    user: AuthUser,
    Path(raw_token): Path<String>,
) -> Result<Json<ActionResponse>, (StatusCode, String)> {
    let invite = fetch_invite_by_raw_token(&state, raw_token.as_str()).await?;
    let invite = expire_invite_if_needed(&state, invite).await?;

    if invite.status != "pending" {
        return Err((
            StatusCode::BAD_REQUEST,
            format!("Invite is {}", invite.status),
        ));
    }

    let organization_type =
        OrganizationType::parse(invite.organization_type.as_str()).ok_or((
            StatusCode::INTERNAL_SERVER_ERROR,
            "Invalid organization type on invite".to_string(),
        ))?;
    let expected_role = organization_type.as_str();
    if user.role.trim() != expected_role {
        return Err((
            StatusCode::FORBIDDEN,
            format!(
                "This invite requires a signed-in {} account for {}",
                expected_role, invite.email
            ),
        ));
    }

    let user_email = user.email.clone().unwrap_or_default().trim().to_lowercase();
    if user_email.is_empty() || user_email != invite.email.trim().to_lowercase() {
        return Err((
            StatusCode::FORBIDDEN,
            "Signed-in email does not match the invitation".to_string(),
        ));
    }

    let existing_membership = fetch_membership_by_user(
        &state,
        organization_type,
        invite.organization_id.as_str(),
        user.id.as_str(),
    )
    .await?;

    if existing_membership.is_none() {
        let resp = state
            .pg
            .from("organization_memberships")
            .insert(
                json!({
                    "organization_type": invite.organization_type,
                    "organization_id": invite.organization_id,
                    "user_id": user.id,
                    "email": user_email,
                    "role": invite.role,
                    "status": "active",
                    "invited_by": invite.invited_by,
                    "updated_at": now_rfc3339(),
                    "last_role_changed_at": now_rfc3339(),
                })
                .to_string(),
            )
            .execute()
            .await
            .map_err(internal_error)?;
        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(sanitize_db_error(status.as_u16(), text));
        }
    }

    let update_resp = state
        .pg
        .from("organization_invites")
        .eq("id", invite.id.as_str())
        .update(
            json!({
                "status": "accepted",
                "accepted_by": user.id,
                "accepted_at": now_rfc3339(),
                "updated_at": now_rfc3339(),
            })
            .to_string(),
        )
        .execute()
        .await
        .map_err(internal_error)?;
    if !update_resp.status().is_success() {
        let status = update_resp.status();
        let text = update_resp.text().await.unwrap_or_default();
        return Err(sanitize_db_error(status.as_u16(), text));
    }

    write_audit_log(
        &state,
        organization_type,
        invite.organization_id.as_str(),
        user.id.as_str(),
        Some(user.id.as_str()),
        Some(user_email.as_str()),
        "team_invite_accepted",
        None,
        Some(invite.role.as_str()),
        json!({ "invite_id": invite.id }),
    )
    .await?;

    Ok(Json(ActionResponse {
        status: "ok".to_string(),
    }))
}

pub async fn decline_invite_by_token(
    State(state): State<AppState>,
    user: AuthUser,
    Path(raw_token): Path<String>,
) -> Result<Json<ActionResponse>, (StatusCode, String)> {
    let invite = fetch_invite_by_raw_token(&state, raw_token.as_str()).await?;
    let invite = expire_invite_if_needed(&state, invite).await?;

    if invite.status != "pending" {
        return Err((
            StatusCode::BAD_REQUEST,
            format!("Invite is {}", invite.status),
        ));
    }

    let user_email = user.email.clone().unwrap_or_default().trim().to_lowercase();
    if user_email.is_empty() || user_email != invite.email.trim().to_lowercase() {
        return Err((
            StatusCode::FORBIDDEN,
            "Signed-in email does not match the invitation".to_string(),
        ));
    }

    let organization_type =
        OrganizationType::parse(invite.organization_type.as_str()).ok_or((
            StatusCode::INTERNAL_SERVER_ERROR,
            "Invalid organization type on invite".to_string(),
        ))?;

    let update_resp = state
        .pg
        .from("organization_invites")
        .eq("id", invite.id.as_str())
        .update(
            json!({
                "status": "revoked",
                "updated_at": now_rfc3339(),
            })
            .to_string(),
        )
        .execute()
        .await
        .map_err(internal_error)?;
    if !update_resp.status().is_success() {
        let status = update_resp.status();
        let text = update_resp.text().await.unwrap_or_default();
        return Err(sanitize_db_error(status.as_u16(), text));
    }

    write_audit_log(
        &state,
        organization_type,
        invite.organization_id.as_str(),
        user.id.as_str(),
        None,
        Some(user_email.as_str()),
        "team_invite_declined",
        None,
        Some(invite.role.as_str()),
        json!({ "invite_id": invite.id }),
    )
    .await?;

    Ok(Json(ActionResponse {
        status: "ok".to_string(),
    }))
}

pub async fn require_organization_access(
    state: &AppState,
    user: &AuthUser,
    organization_type: OrganizationType,
) -> Result<OrganizationAccess, (StatusCode, String)> {
    let scope = resolve_scope(
        state,
        user,
        &TeamScopeQuery {
            organization_type: Some(organization_type.as_str().to_string()),
            organization_id: None,
        },
    )
    .await?;

    Ok(OrganizationAccess {
        organization_type: scope.organization_type.as_str().to_string(),
        organization_id: scope.organization_id,
        organization_name: scope.organization_name,
        membership_role: scope.membership.role.clone(),
        permissions: permissions_for_membership(&scope.membership)?,
    })
}

pub async fn require_organization_permission(
    state: &AppState,
    user: &AuthUser,
    organization_type: OrganizationType,
    permission: Permission,
) -> Result<OrganizationAccess, (StatusCode, String)> {
    let cache_key = format!(
        "{}:{}",
        CACHE_NAMESPACE_ORG_ACCESS,
        crate::cache::cache_key(&user.id, organization_type.as_str())
    );
    
    if let Some(cached) = state.cache_l2.get_json::<OrganizationAccess>(&user.id, &cache_key) {
        tracing::debug!(
            user_id = %user.id,
            org_type = %organization_type.as_str(),
            membership_role = %cached.membership_role,
            cached_permissions = ?cached.permissions,
            "Organization access cache hit"
        );
        state.cache_metrics.hit(crate::cache::CacheLevel::L2);
        
        let role = TeamRole::parse(cached.membership_role.as_str()).ok_or((
            StatusCode::FORBIDDEN,
            "Invalid membership role".to_string(),
        ))?;
        
        if !has_permission(role, permission) {
            tracing::warn!(
                user_id = %user.id,
                org_type = %organization_type.as_str(),
                membership_role = %cached.membership_role,
                required_permission = %permission.as_str(),
                "Permission denied (cached)"
            );
            return Err((
                StatusCode::FORBIDDEN,
                format!(
                    "Forbidden: missing '{}' permission for this organization",
                    permission.as_str()
                ),
            ));
        }
        
        return Ok(cached);
    }
    
    state.cache_metrics.miss(crate::cache::CacheLevel::L2);
    
    let scope = resolve_scope(
        state,
        user,
        &TeamScopeQuery {
            organization_type: Some(organization_type.as_str().to_string()),
            organization_id: None,
        },
    )
    .await?;
    
    tracing::debug!(
        user_id = %user.id,
        org_type = %organization_type.as_str(),
        membership_role = %scope.membership.role,
        required_permission = %permission.as_str(),
        "Checking permission for resolved scope"
    );
    
    ensure_permission(&scope.membership, permission)?;

    let access = OrganizationAccess {
        organization_type: scope.organization_type.as_str().to_string(),
        organization_id: scope.organization_id,
        organization_name: scope.organization_name,
        membership_role: scope.membership.role.clone(),
        permissions: permissions_for_membership(&scope.membership)?,
    };
    
    state.cache_l2.set_json(
        &user.id,
        &cache_key,
        &access,
        Some(StdDuration::from_secs(ORG_ACCESS_CACHE_TTL_SECS)),
    );
    
    tracing::debug!(
        user_id = %user.id,
        org_type = %organization_type.as_str(),
        membership_role = %scope.membership.role,
        "Organization access cached"
    );

    Ok(access)
}

pub async fn require_agency_access(
    state: &AppState,
    user: &AuthUser,
) -> Result<OrganizationAccess, (StatusCode, String)> {
    require_organization_access(state, user, OrganizationType::Agency).await
}

pub async fn require_brand_access(
    state: &AppState,
    user: &AuthUser,
) -> Result<OrganizationAccess, (StatusCode, String)> {
    require_organization_access(state, user, OrganizationType::Brand).await
}

pub async fn require_agency_permission(
    state: &AppState,
    user: &AuthUser,
    permission: Permission,
) -> Result<OrganizationAccess, (StatusCode, String)> {
    require_organization_permission(state, user, OrganizationType::Agency, permission).await
}

pub async fn require_brand_permission(
    state: &AppState,
    user: &AuthUser,
    permission: Permission,
) -> Result<OrganizationAccess, (StatusCode, String)> {
    require_organization_permission(state, user, OrganizationType::Brand, permission).await
}

pub async fn resolve_user_organization_id(
    state: &AppState,
    user: &AuthUser,
    organization_type: OrganizationType,
) -> Result<String, (StatusCode, String)> {
    let access = require_organization_access(state, user, organization_type).await?;
    Ok(access.organization_id)
}

pub async fn resolve_effective_agency_id(
    state: &AppState,
    user: &AuthUser,
) -> Result<String, (StatusCode, String)> {
    resolve_user_organization_id(state, user, OrganizationType::Agency).await
}

pub async fn resolve_effective_brand_id(
    state: &AppState,
    user: &AuthUser,
) -> Result<String, (StatusCode, String)> {
    resolve_user_organization_id(state, user, OrganizationType::Brand).await
}

pub async fn ensure_owner_membership(
    state: &AppState,
    user: &AuthUser,
    organization_type: OrganizationType,
    organization_id: &str,
) -> Result<(), (StatusCode, String)> {
    let existing = state
        .pg
        .from("organization_memberships")
        .select("id")
        .eq("organization_type", organization_type.as_str())
        .eq("organization_id", organization_id)
        .eq("user_id", &user.id)
        .limit(1)
        .execute()
        .await
        .map_err(internal_error)?;
    
    let status = existing.status();
    if status.is_success() {
        let text = existing.text().await.map_err(internal_error)?;
        let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
        if !rows.is_empty() {
            return Ok(());
        }
    }
    
    let membership = json!({
        "organization_type": organization_type.as_str(),
        "organization_id": organization_id,
        "user_id": user.id,
        "email": user.email.clone().unwrap_or_default(),
        "role": TeamRole::Owner.as_str(),
        "status": "active",
        "created_at": Utc::now().to_rfc3339(),
        "updated_at": Utc::now().to_rfc3339(),
    });
    
    let resp = state
        .pg
        .from("organization_memberships")
        .insert(membership.to_string())
        .execute()
        .await
        .map_err(internal_error)?;
    
    if !resp.status().is_success() {
        let text = resp.text().await.map_err(internal_error)?;
        tracing::warn!(
            user_id = %user.id,
            org_type = %organization_type.as_str(),
            org_id = %organization_id,
            error = %text,
            "Failed to create owner membership"
        );
    } else {
        tracing::info!(
            user_id = %user.id,
            org_type = %organization_type.as_str(),
            org_id = %organization_id,
            "Created owner membership"
        );
    }
    
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrandAgencyConnection {
    pub brand_id: String,
    pub agency_id: String,
    pub status: String,
}

pub async fn check_brand_agency_connection(
    state: &AppState,
    brand_id: &str,
    agency_id: &str,
) -> Result<Option<BrandAgencyConnection>, (StatusCode, String)> {
    let cache_key = format!(
        "{}:{}",
        CACHE_NAMESPACE_BRAND_AGENCY_CONN,
        crate::cache::cache_key(brand_id, agency_id)
    );
    
    if let Some(cached) = state.cache_l3.get_json::<BrandAgencyConnection>(&cache_key) {
        tracing::debug!(
            brand_id = %brand_id,
            agency_id = %agency_id,
            status = %cached.status,
            "Brand-agency connection cache hit"
        );
        state.cache_metrics.hit(crate::cache::CacheLevel::L3);
        
        if cached.status == "active" || cached.status == "accepted" {
            return Ok(Some(cached));
        }
        return Ok(None);
    }
    
    state.cache_metrics.miss(crate::cache::CacheLevel::L3);
    
    let resp = state
        .pg
        .from("brand_agency_connections")
        .select("id,brand_id,agency_id,status")
        .eq("brand_id", brand_id)
        .eq("agency_id", agency_id)
        .limit(1)
        .execute()
        .await
        .map_err(internal_error)?;
    
    let status = resp.status();
    let text = resp.text().await.map_err(internal_error)?;
    
    if !status.is_success() {
        if text.contains("brand_agency_connections") && text.contains("does not exist") {
            return Ok(None);
        }
        return Err(sanitize_db_error(status.as_u16(), text));
    }
    
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    
    if let Some(row) = rows.first() {
        let conn = BrandAgencyConnection {
            brand_id: row.get("brand_id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            agency_id: row.get("agency_id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            status: row.get("status").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        };
        
        state.cache_l3.set_json(
            &cache_key,
            &conn,
            Some(StdDuration::from_secs(BRAND_AGENCY_CONN_CACHE_TTL_SECS)),
        );
        
        tracing::debug!(
            brand_id = %brand_id,
            agency_id = %agency_id,
            status = %conn.status,
            "Brand-agency connection cached"
        );
        
        if conn.status == "active" || conn.status == "accepted" {
            return Ok(Some(conn));
        }
    }
    
    let placeholder = BrandAgencyConnection {
        brand_id: brand_id.to_string(),
        agency_id: agency_id.to_string(),
        status: "none".to_string(),
    };
    
    state.cache_l3.set_json(
        &cache_key,
        &placeholder,
        Some(StdDuration::from_secs(BRAND_AGENCY_CONN_CACHE_TTL_SECS)),
    );
    
    Ok(None)
}

pub fn invalidate_brand_agency_connection_cache(
    state: &AppState,
    brand_id: &str,
    agency_id: &str,
) {
    let cache_key = format!(
        "{}:{}",
        CACHE_NAMESPACE_BRAND_AGENCY_CONN,
        crate::cache::cache_key(brand_id, agency_id)
    );
    
    state.cache_l3.delete(&cache_key);
    
    tracing::debug!(
        brand_id = %brand_id,
        agency_id = %agency_id,
        "Brand-agency connection cache invalidated"
    );
}

pub fn invalidate_org_access_cache(
    state: &AppState,
    user_id: &str,
    organization_type: &str,
) {
    let cache_key = format!(
        "{}:{}",
        CACHE_NAMESPACE_ORG_ACCESS,
        crate::cache::cache_key(user_id, organization_type)
    );
    
    state.cache_l2.delete(user_id, &cache_key);
    
    tracing::debug!(
        user_id = %user_id,
        org_type = %organization_type,
        "Organization access cache invalidated"
    );
}

fn now_rfc3339() -> String {
    Utc::now().to_rfc3339()
}

fn internal_error<E: ToString>(error: E) -> (StatusCode, String) {
    (StatusCode::INTERNAL_SERVER_ERROR, error.to_string())
}

fn hash_token(raw_token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(raw_token.as_bytes());
    hex::encode(hasher.finalize())
}

fn normalize_email(input: &str) -> Result<String, (StatusCode, String)> {
    let normalized = input.trim().to_lowercase();
    if normalized.is_empty() || !normalized.contains('@') {
        return Err((
            StatusCode::BAD_REQUEST,
            "A valid email address is required".to_string(),
        ));
    }
    Ok(normalized)
}

fn parse_assignable_role(input: &str) -> Result<TeamRole, (StatusCode, String)> {
    let role = TeamRole::parse(input).ok_or((
        StatusCode::BAD_REQUEST,
        "Role must be one of admin, project_manager, or reviewer".to_string(),
    ))?;
    if role == TeamRole::Owner {
        return Err((
            StatusCode::BAD_REQUEST,
            "Owner cannot be assigned through this endpoint".to_string(),
        ));
    }
    Ok(role)
}

fn ensure_assignable_role(
    actor_role: &str,
    next_role: TeamRole,
) -> Result<(), (StatusCode, String)> {
    let actor_role = TeamRole::parse(actor_role).ok_or((
        StatusCode::FORBIDDEN,
        "Invalid actor membership role".to_string(),
    ))?;
    if actor_role == TeamRole::Admin && next_role == TeamRole::Owner {
        return Err((
            StatusCode::FORBIDDEN,
            "Admins cannot assign the owner role".to_string(),
        ));
    }
    Ok(())
}

fn permissions_for_membership(
    membership: &MembershipRecord,
) -> Result<Vec<String>, (StatusCode, String)> {
    let role = TeamRole::parse(membership.role.as_str()).ok_or((
        StatusCode::FORBIDDEN,
        "Invalid membership role".to_string(),
    ))?;
    Ok(permissions_for_role(role)
        .into_iter()
        .map(|permission| permission.as_str().to_string())
        .collect())
}

async fn resolve_scope(
    state: &AppState,
    user: &AuthUser,
    query: &TeamScopeQuery,
) -> Result<ResolvedScope, (StatusCode, String)> {
    if let Some(ref org_type) = query.organization_type {
        let cache_key = format!(
            "{}:{}",
            CACHE_NAMESPACE_ORG_ACCESS,
            crate::cache::cache_key(&user.id, org_type)
        );
        
        if let Some(cached) = state.cache_l2.get_json::<ResolvedScope>(&user.id, &cache_key) {
            tracing::debug!(
                user_id = %user.id,
                org_type = %org_type,
                "resolve_scope cache hit"
            );
            state.cache_metrics.hit(crate::cache::CacheLevel::L2);
            return Ok(cached);
        }
        state.cache_metrics.miss(crate::cache::CacheLevel::L2);
    }
    
    let mut req = state.pg.from("organization_memberships").select(
        "organization_type,organization_id,user_id,email,role,status,created_at,updated_at,last_role_changed_at",
    );
    req = req.eq("user_id", user.id.as_str()).eq("status", "active");

    if let Some(ref organization_type) = query.organization_type {
        let parsed = OrganizationType::parse(organization_type).ok_or((
            StatusCode::BAD_REQUEST,
            "organization_type must be 'agency' or 'brand'".to_string(),
        ))?;
        req = req.eq("organization_type", parsed.as_str());
    }
    if let Some(ref organization_id) = query.organization_id {
        req = req.eq("organization_id", organization_id.as_str());
    }

    let rows = execute_rows(req.execute().await.map_err(internal_error)?).await?;
    let mut memberships = rows
        .iter()
        .map(map_membership_record)
        .collect::<Result<Vec<_>, _>>()?;

    // If multiple memberships found, prioritize by role: owner > admin > project_manager > reviewer
    if memberships.len() > 1 {
        // Sort by role priority (owner=0, admin=1, project_manager=2, reviewer=3)
        memberships.sort_by_key(|m| {
            match m.role.as_str() {
                "owner" => 0,
                "admin" => 1,
                "project_manager" => 2,
                "reviewer" => 3,
                _ => 4,
            }
        });
        
        // If the top two have the same role, we can't auto-select
        if memberships.len() >= 2 && memberships[0].role == memberships[1].role {
            return Err((
                StatusCode::BAD_REQUEST,
                "Multiple active organizations found; specify organization_type and organization_id"
                    .to_string(),
            ));
        }
        
        // Otherwise, use the highest priority membership (owner takes precedence)
    }

    if memberships.len() >= 1 {
        let membership = memberships.remove(0);
        let organization_type = OrganizationType::parse(membership.organization_type.as_str()).ok_or((
            StatusCode::INTERNAL_SERVER_ERROR,
            "Invalid organization type on membership".to_string(),
        ))?;
        let organization_name =
            fetch_organization_name(state, organization_type, membership.organization_id.as_str()).await?;

        let scope = ResolvedScope {
            organization_type,
            organization_id: membership.organization_id.clone(),
            organization_name,
            membership,
        };
        
        if let Some(ref org_type) = query.organization_type {
            let cache_key = format!(
                "{}:{}",
                CACHE_NAMESPACE_ORG_ACCESS,
                crate::cache::cache_key(&user.id, org_type)
            );
            state.cache_l2.set_json(
                &user.id,
                &cache_key,
                &scope,
                Some(StdDuration::from_secs(ORG_ACCESS_CACHE_TTL_SECS)),
            );
        }
        
        return Ok(scope);
    }
    
    // No membership found - check if this is a legacy owner (user.id == org.id or org.user_id == user.id)
    tracing::debug!(
        user_id = %user.id,
        user_role = %user.role,
        org_type_filter = ?query.organization_type,
        "No membership found in organization_memberships, checking legacy owner pattern"
    );
    
    let organization_type_filter = query.organization_type.as_deref().and_then(|t| OrganizationType::parse(t));
    
    if let Some(org_type) = organization_type_filter {
        if let Some(membership) = resolve_legacy_owner_membership(state, user, org_type).await? {
            let organization_name =
                fetch_organization_name(state, org_type, membership.organization_id.as_str()).await?;
            let scope = ResolvedScope {
                organization_type: org_type,
                organization_id: membership.organization_id.clone(),
                organization_name,
                membership,
            };
            
            if let Some(ref org_type_str) = query.organization_type {
                let cache_key = format!(
                    "{}:{}",
                    CACHE_NAMESPACE_ORG_ACCESS,
                    crate::cache::cache_key(&user.id, org_type_str)
                );
                state.cache_l2.set_json(
                    &user.id,
                    &cache_key,
                    &scope,
                    Some(StdDuration::from_secs(ORG_ACCESS_CACHE_TTL_SECS)),
                );
            }
            
            return Ok(scope);
        }
    } else {
        // Try both agency and brand
        if let Some(membership) = resolve_legacy_owner_membership(state, user, OrganizationType::Agency).await? {
            let organization_name =
                fetch_organization_name(state, OrganizationType::Agency, membership.organization_id.as_str()).await?;
            return Ok(ResolvedScope {
                organization_type: OrganizationType::Agency,
                organization_id: membership.organization_id.clone(),
                organization_name,
                membership,
            });
        }
        if let Some(membership) = resolve_legacy_owner_membership(state, user, OrganizationType::Brand).await? {
            let organization_name =
                fetch_organization_name(state, OrganizationType::Brand, membership.organization_id.as_str()).await?;
            return Ok(ResolvedScope {
                organization_type: OrganizationType::Brand,
                organization_id: membership.organization_id.clone(),
                organization_name,
                membership,
            });
        }
    }

    Err((
        StatusCode::FORBIDDEN,
        "No active organization membership found".to_string(),
    ))
}

async fn resolve_legacy_owner_membership(
    state: &AppState,
    user: &AuthUser,
    organization_type: OrganizationType,
) -> Result<Option<MembershipRecord>, (StatusCode, String)> {
    let (table, role_filter) = match organization_type {
        OrganizationType::Agency => ("agencies", "agency"),
        OrganizationType::Brand => ("brands", "brand"),
    };
    
    tracing::debug!(
        user_id = %user.id,
        user_role = %user.role,
        expected_role = %role_filter,
        org_type = %organization_type.as_str(),
        "Checking legacy owner membership"
    );
    
    if user.role != role_filter {
        tracing::debug!(
            user_id = %user.id,
            user_role = %user.role,
            expected_role = %role_filter,
            "User role does not match expected role for legacy owner check"
        );
        return Ok(None);
    }
    
    // Check if user.id matches organization.id directly (legacy owner pattern)
    let resp = state
        .pg
        .from(table)
        .select("id")
        .eq("id", &user.id)
        .limit(1)
        .execute()
        .await
        .map_err(internal_error)?;
    
    let status = resp.status();
    if status.is_success() {
        let text = resp.text().await.map_err(internal_error)?;
        let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
        if !rows.is_empty() {
            return Ok(Some(MembershipRecord {
                organization_type: organization_type.as_str().to_string(),
                organization_id: user.id.clone(),
                organization_name: String::new(),
                user_id: user.id.clone(),
                email: user.email.clone().unwrap_or_default(),
                role: TeamRole::Owner.as_str().to_string(),
                status: "active".to_string(),
                created_at: None,
                updated_at: None,
                last_role_changed_at: None,
            }));
        }
    }
    
    // Check if organization.user_id matches user.id (another legacy pattern)
    let resp = state
        .pg
        .from(table)
        .select("id")
        .eq("user_id", &user.id)
        .limit(1)
        .execute()
        .await
        .map_err(internal_error)?;
    
    let status = resp.status();
    if status.is_success() {
        let text = resp.text().await.map_err(internal_error)?;
        let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
        if let Some(org_id) = rows.first().and_then(|r| r.get("id")).and_then(|v| v.as_str()) {
            if !org_id.is_empty() {
                return Ok(Some(MembershipRecord {
                    organization_type: organization_type.as_str().to_string(),
                    organization_id: org_id.to_string(),
                    organization_name: String::new(),
                    user_id: user.id.clone(),
                    email: user.email.clone().unwrap_or_default(),
                    role: TeamRole::Owner.as_str().to_string(),
                    status: "active".to_string(),
                    created_at: None,
                    updated_at: None,
                    last_role_changed_at: None,
                }));
            }
        }
    }
    
    Ok(None)
}

fn ensure_permission(
    membership: &MembershipRecord,
    permission: Permission,
) -> Result<(), (StatusCode, String)> {
    let role = TeamRole::parse(membership.role.as_str()).ok_or((
        StatusCode::FORBIDDEN,
        "Invalid membership role".to_string(),
    ))?;
    if has_permission(role, permission) {
        tracing::debug!(
            membership_role = %membership.role,
            permission = %permission.as_str(),
            "Permission check passed"
        );
        return Ok(());
    }
    tracing::warn!(
        membership_role = %membership.role,
        permission = %permission.as_str(),
        org_id = %membership.organization_id,
        user_id = %membership.user_id,
        "Permission denied"
    );
    Err((
        StatusCode::FORBIDDEN,
        format!(
            "Forbidden: missing '{}' permission for this organization",
            permission.as_str()
        ),
    ))
}

async fn fetch_organization_name(
    state: &AppState,
    organization_type: OrganizationType,
    organization_id: &str,
) -> Result<String, (StatusCode, String)> {
    let (table, column) = match organization_type {
        OrganizationType::Agency => ("agencies", "agency_name"),
        OrganizationType::Brand => ("brands", "company_name"),
    };
    let resp = state
        .pg
        .from(table)
        .select(column)
        .eq("id", organization_id)
        .single()
        .execute()
        .await
        .map_err(internal_error)?;
    let row = execute_object(resp).await?;
    Ok(row
        .get(column)
        .and_then(|value| value.as_str())
        .unwrap_or("Organization")
        .to_string())
}

async fn list_members_for_scope(
    state: &AppState,
    organization_type: OrganizationType,
    organization_id: &str,
) -> Result<Vec<MembershipRecord>, (StatusCode, String)> {
    let organization_name =
        fetch_organization_name(state, organization_type, organization_id).await?;
    let rows = execute_rows(
        state
            .pg
            .from("organization_memberships")
            .select(
                "organization_type,organization_id,user_id,email,role,status,created_at,updated_at,last_role_changed_at",
            )
            .eq("organization_type", organization_type.as_str())
            .eq("organization_id", organization_id)
            .order("created_at.asc")
            .execute()
            .await
            .map_err(internal_error)?,
    )
    .await?;

    let mut members = rows.iter().map(map_membership_record).collect::<Result<Vec<_>, _>>()?;
    for member in &mut members {
        member.organization_name = organization_name.clone();
    }
    Ok(members)
}

async fn list_invites_for_scope(
    state: &AppState,
    organization_type: OrganizationType,
    organization_id: &str,
) -> Result<Vec<InviteRecord>, (StatusCode, String)> {
    let rows = execute_rows(
        state
            .pg
            .from("organization_invites")
            .select(
                "id,organization_type,organization_id,email,role,status,invited_by,expires_at,created_at,updated_at",
            )
            .eq("organization_type", organization_type.as_str())
            .eq("organization_id", organization_id)
            .order("created_at.desc")
            .execute()
            .await
            .map_err(internal_error)?,
    )
    .await?;

    rows.iter().map(map_invite_record).collect()
}

async fn list_audit_logs_for_scope(
    state: &AppState,
    organization_type: OrganizationType,
    organization_id: &str,
) -> Result<Vec<AuditLogRecord>, (StatusCode, String)> {
    let rows = execute_rows(
        state
            .pg
            .from("organization_audit_logs")
            .select(
                "id,organization_type,organization_id,actor_user_id,target_user_id,target_email,action,old_role,new_role,metadata,created_at",
            )
            .eq("organization_type", organization_type.as_str())
            .eq("organization_id", organization_id)
            .order("created_at.desc")
            .limit(50)
            .execute()
            .await
            .map_err(internal_error)?,
    )
    .await?;

    rows.iter().map(map_audit_log_record).collect()
}

async fn ensure_member_not_active(
    state: &AppState,
    organization_type: OrganizationType,
    organization_id: &str,
    email: &str,
) -> Result<(), (StatusCode, String)> {
    let rows = execute_rows(
        state
            .pg
            .from("organization_memberships")
            .select("user_id")
            .eq("organization_type", organization_type.as_str())
            .eq("organization_id", organization_id)
            .eq("email", email)
            .eq("status", "active")
            .limit(1)
            .execute()
            .await
            .map_err(internal_error)?,
    )
    .await?;

    if !rows.is_empty() {
        return Err((
            StatusCode::CONFLICT,
            "That user is already an active member of this organization".to_string(),
        ));
    }
    Ok(())
}

async fn ensure_pending_invite_not_exists(
    state: &AppState,
    organization_type: OrganizationType,
    organization_id: &str,
    email: &str,
) -> Result<(), (StatusCode, String)> {
    let rows = execute_rows(
        state
            .pg
            .from("organization_invites")
            .select("id")
            .eq("organization_type", organization_type.as_str())
            .eq("organization_id", organization_id)
            .eq("email", email)
            .eq("status", "pending")
            .limit(1)
            .execute()
            .await
            .map_err(internal_error)?,
    )
    .await?;

    if !rows.is_empty() {
        return Err((
            StatusCode::CONFLICT,
            "A pending invite already exists for that email".to_string(),
        ));
    }
    Ok(())
}

async fn latest_invite_for_email(
    state: &AppState,
    organization_type: OrganizationType,
    organization_id: &str,
    email: &str,
) -> Result<InviteRecord, (StatusCode, String)> {
    let rows = execute_rows(
        state
            .pg
            .from("organization_invites")
            .select(
                "id,organization_type,organization_id,email,role,status,invited_by,expires_at,created_at,updated_at",
            )
            .eq("organization_type", organization_type.as_str())
            .eq("organization_id", organization_id)
            .eq("email", email)
            .order("created_at.desc")
            .limit(1)
            .execute()
            .await
            .map_err(internal_error)?,
    )
    .await?;

    let row = rows.first().ok_or((
        StatusCode::INTERNAL_SERVER_ERROR,
        "Invite could not be loaded after creation".to_string(),
    ))?;
    map_invite_record(row)
}

async fn fetch_invite_by_raw_token(
    state: &AppState,
    raw_token: &str,
) -> Result<InviteRecord, (StatusCode, String)> {
    let token_hash = hash_token(raw_token);
    let rows = execute_rows(
        state
            .pg
            .from("organization_invites")
            .select(
                "id,organization_type,organization_id,email,role,status,invited_by,expires_at,created_at,updated_at",
            )
            .eq("token_hash", token_hash.as_str())
            .limit(1)
            .execute()
            .await
            .map_err(internal_error)?,
    )
    .await?;
    let row = rows.first().ok_or((
        StatusCode::NOT_FOUND,
        "Invite not found".to_string(),
    ))?;
    map_invite_record(row)
}

async fn expire_invite_if_needed(
    state: &AppState,
    mut invite: InviteRecord,
) -> Result<InviteRecord, (StatusCode, String)> {
    let expires_at = chrono::DateTime::parse_from_rfc3339(invite.expires_at.as_str())
        .map_err(internal_error)?
        .with_timezone(&Utc);
    if invite.status == "pending" && expires_at <= Utc::now() {
        let resp = state
            .pg
            .from("organization_invites")
            .eq("id", invite.id.as_str())
            .update(
                json!({
                    "status": "expired",
                    "updated_at": now_rfc3339(),
                })
                .to_string(),
            )
            .execute()
            .await
            .map_err(internal_error)?;
        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(sanitize_db_error(status.as_u16(), text));
        }
        invite.status = "expired".to_string();
    }
    Ok(invite)
}

async fn fetch_target_membership(
    state: &AppState,
    organization_type: OrganizationType,
    organization_id: &str,
    user_id: &str,
) -> Result<MembershipRecord, (StatusCode, String)> {
    let rows = execute_rows(
        state
            .pg
            .from("organization_memberships")
            .select(
                "organization_type,organization_id,user_id,email,role,status,created_at,updated_at,last_role_changed_at",
            )
            .eq("organization_type", organization_type.as_str())
            .eq("organization_id", organization_id)
            .eq("user_id", user_id)
            .eq("status", "active")
            .limit(1)
            .execute()
            .await
            .map_err(internal_error)?,
    )
    .await?;

    let row = rows.first().ok_or((
        StatusCode::NOT_FOUND,
        "Target member not found in this organization".to_string(),
    ))?;
    let mut membership = map_membership_record(row)?;
    membership.organization_name =
        fetch_organization_name(state, organization_type, organization_id).await?;
    Ok(membership)
}

async fn fetch_membership_by_user(
    state: &AppState,
    organization_type: OrganizationType,
    organization_id: &str,
    user_id: &str,
) -> Result<Option<MembershipRecord>, (StatusCode, String)> {
    let rows = execute_rows(
        state
            .pg
            .from("organization_memberships")
            .select(
                "organization_type,organization_id,user_id,email,role,status,created_at,updated_at,last_role_changed_at",
            )
            .eq("organization_type", organization_type.as_str())
            .eq("organization_id", organization_id)
            .eq("user_id", user_id)
            .eq("status", "active")
            .limit(1)
            .execute()
            .await
            .map_err(internal_error)?,
    )
    .await?;

    match rows.first() {
        Some(row) => {
            let mut membership = map_membership_record(row)?;
            membership.organization_name =
                fetch_organization_name(state, organization_type, organization_id).await?;
            Ok(Some(membership))
        }
        None => Ok(None),
    }
}

async fn write_audit_log(
    state: &AppState,
    organization_type: OrganizationType,
    organization_id: &str,
    actor_user_id: &str,
    target_user_id: Option<&str>,
    target_email: Option<&str>,
    action: &str,
    old_role: Option<&str>,
    new_role: Option<&str>,
    metadata: Value,
) -> Result<(), (StatusCode, String)> {
    let resp = state
        .pg
        .from("organization_audit_logs")
        .insert(
            json!({
                "organization_type": organization_type.as_str(),
                "organization_id": organization_id,
                "actor_user_id": actor_user_id,
                "target_user_id": target_user_id,
                "target_email": target_email,
                "action": action,
                "old_role": old_role,
                "new_role": new_role,
                "metadata": metadata,
            })
            .to_string(),
        )
        .execute()
        .await
        .map_err(internal_error)?;
    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(sanitize_db_error(status.as_u16(), text));
    }
    Ok(())
}

async fn execute_rows(response: reqwest::Response) -> Result<Vec<Value>, (StatusCode, String)> {
    let status = response.status();
    let text = response.text().await.map_err(internal_error)?;
    if !status.is_success() {
        return Err(sanitize_db_error(status.as_u16(), text));
    }
    serde_json::from_str::<Vec<Value>>(text.as_str()).map_err(internal_error)
}

async fn execute_object(response: reqwest::Response) -> Result<Value, (StatusCode, String)> {
    let status = response.status();
    let text = response.text().await.map_err(internal_error)?;
    if !status.is_success() {
        return Err(sanitize_db_error(status.as_u16(), text));
    }
    serde_json::from_str::<Value>(text.as_str()).map_err(internal_error)
}

fn map_membership_record(row: &Value) -> Result<MembershipRecord, (StatusCode, String)> {
    Ok(MembershipRecord {
        organization_type: string_field(row, "organization_type")?,
        organization_id: string_field(row, "organization_id")?,
        organization_name: String::new(),
        user_id: string_field(row, "user_id")?,
        email: string_field(row, "email")?,
        role: string_field(row, "role")?,
        status: string_field(row, "status")?,
        created_at: optional_string_field(row, "created_at"),
        updated_at: optional_string_field(row, "updated_at"),
        last_role_changed_at: optional_string_field(row, "last_role_changed_at"),
    })
}

fn map_invite_record(row: &Value) -> Result<InviteRecord, (StatusCode, String)> {
    Ok(InviteRecord {
        id: string_field(row, "id")?,
        organization_type: string_field(row, "organization_type")?,
        organization_id: string_field(row, "organization_id")?,
        email: string_field(row, "email")?,
        role: string_field(row, "role")?,
        status: string_field(row, "status")?,
        invited_by: string_field(row, "invited_by")?,
        expires_at: string_field(row, "expires_at")?,
        created_at: optional_string_field(row, "created_at"),
        updated_at: optional_string_field(row, "updated_at"),
    })
}

fn map_audit_log_record(row: &Value) -> Result<AuditLogRecord, (StatusCode, String)> {
    Ok(AuditLogRecord {
        id: string_field(row, "id")?,
        organization_type: string_field(row, "organization_type")?,
        organization_id: string_field(row, "organization_id")?,
        actor_user_id: string_field(row, "actor_user_id")?,
        target_user_id: optional_string_field(row, "target_user_id"),
        target_email: optional_string_field(row, "target_email"),
        action: string_field(row, "action")?,
        old_role: optional_string_field(row, "old_role"),
        new_role: optional_string_field(row, "new_role"),
        metadata: row.get("metadata").cloned().unwrap_or_else(|| json!({})),
        created_at: string_field(row, "created_at")?,
    })
}

fn string_field(row: &Value, key: &str) -> Result<String, (StatusCode, String)> {
    row.get(key)
        .and_then(|value| value.as_str())
        .map(|value| value.to_string())
        .ok_or((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Missing '{}' in database row", key),
        ))
}

fn optional_string_field(row: &Value, key: &str) -> Option<String> {
    row.get(key)
        .and_then(|value| value.as_str())
        .map(|value| value.to_string())
}
