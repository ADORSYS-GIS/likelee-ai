use super::access::{invalidate_org_access_cache, resolve_scope};
use super::permissions::{Permission, TeamRole};
use super::queries::{
    count_active_members, count_pending_invites, ensure_member_not_active,
    ensure_pending_invite_not_exists, expire_invite_if_needed, fetch_invite_by_raw_token,
    fetch_membership_by_user, fetch_organization_name, fetch_target_membership,
    latest_invite_for_email, list_audit_logs_for_scope, list_invites_for_scope,
    list_members_for_scope, write_audit_log, AuditLogEntry,
};
use super::support::{
    ensure_assignable_role, ensure_permission, hash_token, internal_error, normalize_email,
    now_rfc3339, parse_assignable_role, permissions_for_membership,
};
use super::types::{
    ActionResponse, CreateInvitePayload, InviteRecord, MembershipRecord, OrganizationType,
    TeamContextResponse, TeamScopeQuery, UpdateMemberRolePayload,
};
use crate::{
    auth::AuthUser,
    config::AppState,
    email,
    entitlements::{
        format_seat_limit_error_with_upgrade, get_agency_seat_limit_info, get_brand_seat_limit_info,
    },
};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::{Duration, Utc};
use serde_json::json;

pub async fn get_context(
    State(state): State<AppState>,
    user: AuthUser,
    Query(query): Query<TeamScopeQuery>,
) -> Result<Json<TeamContextResponse>, (StatusCode, String)> {
    let scope = resolve_scope(&state, &user, &query).await?;
    ensure_permission(&scope.membership, Permission::ViewTeamMembers)?;

    let include_details = query.include_details.unwrap_or(false);
    let members = if include_details {
        list_members_for_scope(
            &state,
            scope.organization_type,
            scope.organization_id.as_str(),
        )
        .await?
    } else {
        Vec::new()
    };
    let invites = if include_details {
        list_invites_for_scope(
            &state,
            scope.organization_type,
            scope.organization_id.as_str(),
        )
        .await?
    } else {
        Vec::new()
    };

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
    let organization_type = OrganizationType::parse(invite.organization_type.as_str()).ok_or((
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

    let members = list_members_for_scope(
        &state,
        scope.organization_type,
        scope.organization_id.as_str(),
    )
    .await?;
    Ok(Json(members))
}

pub async fn list_invites(
    State(state): State<AppState>,
    user: AuthUser,
    Query(query): Query<TeamScopeQuery>,
) -> Result<Json<Vec<InviteRecord>>, (StatusCode, String)> {
    let scope = resolve_scope(&state, &user, &query).await?;
    ensure_permission(&scope.membership, Permission::ViewTeamMembers)?;

    let invites = list_invites_for_scope(
        &state,
        scope.organization_type,
        scope.organization_id.as_str(),
    )
    .await?;
    Ok(Json(invites))
}

pub async fn list_audit_logs(
    State(state): State<AppState>,
    user: AuthUser,
    Query(query): Query<TeamScopeQuery>,
) -> Result<Json<Vec<super::types::AuditLogRecord>>, (StatusCode, String)> {
    let scope = resolve_scope(&state, &user, &query).await?;
    ensure_permission(&scope.membership, Permission::ViewTeamMembers)?;

    let logs = list_audit_logs_for_scope(
        &state,
        scope.organization_type,
        scope.organization_id.as_str(),
    )
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

    let current_members = count_active_members(
        &state,
        scope.organization_type,
        scope.organization_id.as_str(),
    )
    .await?;
    let pending_invites = count_pending_invites(
        &state,
        scope.organization_type,
        scope.organization_id.as_str(),
    )
    .await?;

    let seat_info = match scope.organization_type {
        OrganizationType::Brand => {
            get_brand_seat_limit_info(
                &state,
                scope.organization_id.as_str(),
                current_members,
                pending_invites,
            )
            .await?
        }
        OrganizationType::Agency => {
            get_agency_seat_limit_info(
                &state,
                scope.organization_id.as_str(),
                current_members,
                pending_invites,
            )
            .await?
        }
    };

    if !seat_info.can_add_member() {
        return Err((
            StatusCode::FORBIDDEN,
            format_seat_limit_error_with_upgrade(&seat_info, scope.organization_type.as_str()),
        ));
    }

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
        return Err(crate::errors::sanitize_db_error(status.as_u16(), text));
    }

    write_audit_log(
        &state,
        AuditLogEntry {
            organization_type: scope.organization_type,
            organization_id: scope.organization_id.as_str(),
            actor_user_id: user.id.as_str(),
            target_user_id: None,
            target_email: Some(invited_email.as_str()),
            action: "team_invite_created",
            old_role: None,
            new_role: Some(invited_role.as_str()),
            metadata: json!({ "expires_at": expires_at }),
        },
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
    let subject = format!(
        "You’ve been invited to join {} on Likelee",
        scope.organization_name
    );
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
        return Err(crate::errors::sanitize_db_error(status.as_u16(), text));
    }

    invalidate_org_access_cache(&state, &target_user_id, scope.organization_type.as_str());

    tracing::info!(
        user_id = %target_user_id,
        org_type = %scope.organization_type.as_str(),
        old_role = %target_role.as_str(),
        new_role = %next_role.as_str(),
        "User role updated and cache invalidated"
    );

    write_audit_log(
        &state,
        AuditLogEntry {
            organization_type: scope.organization_type,
            organization_id: scope.organization_id.as_str(),
            actor_user_id: user.id.as_str(),
            target_user_id: Some(target_user_id.as_str()),
            target_email: Some(target_membership.email.as_str()),
            action: "member_role_updated",
            old_role: Some(target_role.as_str()),
            new_role: Some(next_role.as_str()),
            metadata: json!({}),
        },
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

pub async fn remove_member(
    State(state): State<AppState>,
    user: AuthUser,
    Path(target_user_id): Path<String>,
    Query(query): Query<TeamScopeQuery>,
) -> Result<Json<ActionResponse>, (StatusCode, String)> {
    let scope = resolve_scope(&state, &user, &query).await?;
    ensure_permission(&scope.membership, Permission::RemoveTeamMembers)?;

    let current_role = TeamRole::parse(scope.membership.role.as_str()).ok_or((
        StatusCode::FORBIDDEN,
        "Invalid actor membership role".to_string(),
    ))?;

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

    if target_role == TeamRole::Owner {
        return Err((
            StatusCode::FORBIDDEN,
            "Cannot remove the organization owner".to_string(),
        ));
    }

    match current_role {
        TeamRole::Owner => {}
        TeamRole::Admin => {
            if target_role == TeamRole::Admin {
                return Err((
                    StatusCode::FORBIDDEN,
                    "Only the owner can remove another admin".to_string(),
                ));
            }
        }
        _ => {
            return Err((
                StatusCode::FORBIDDEN,
                "Only owner or admin can remove team members".to_string(),
            ));
        }
    }

    let resp = state
        .pg
        .from("organization_memberships")
        .eq("organization_type", scope.organization_type.as_str())
        .eq("organization_id", scope.organization_id.as_str())
        .eq("user_id", target_user_id.as_str())
        .delete()
        .execute()
        .await
        .map_err(internal_error)?;
    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(crate::errors::sanitize_db_error(status.as_u16(), text));
    }

    invalidate_org_access_cache(&state, &target_user_id, scope.organization_type.as_str());

    tracing::info!(
        user_id = %target_user_id,
        org_type = %scope.organization_type.as_str(),
        role = %target_role.as_str(),
        "User removed from organization"
    );

    write_audit_log(
        &state,
        AuditLogEntry {
            organization_type: scope.organization_type,
            organization_id: scope.organization_id.as_str(),
            actor_user_id: user.id.as_str(),
            target_user_id: Some(target_user_id.as_str()),
            target_email: Some(target_membership.email.as_str()),
            action: "member_removed",
            old_role: Some(target_role.as_str()),
            new_role: None,
            metadata: json!({}),
        },
    )
    .await?;

    let subject = format!("You've been removed from {}", scope.organization_name);
    let body = format!(
        "Hi,\n\nYou have been removed from {} on Likelee. If you believe this was an error, please contact the organization owner.",
        scope.organization_name
    );
    let _ = email::send_plain_text_email(
        &state,
        target_membership.email.as_str(),
        subject.as_str(),
        body.as_str(),
        Some(scope.organization_name.as_str()),
    );

    Ok(Json(ActionResponse {
        status: "ok".to_string(),
    }))
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

    let organization_type = OrganizationType::parse(invite.organization_type.as_str()).ok_or((
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
        let current_members =
            count_active_members(&state, organization_type, invite.organization_id.as_str())
                .await?;
        let pending_invites =
            count_pending_invites(&state, organization_type, invite.organization_id.as_str())
                .await?;

        let seat_info = match organization_type {
            OrganizationType::Brand => {
                get_brand_seat_limit_info(
                    &state,
                    invite.organization_id.as_str(),
                    current_members,
                    pending_invites.saturating_sub(1),
                )
                .await?
            }
            OrganizationType::Agency => {
                get_agency_seat_limit_info(
                    &state,
                    invite.organization_id.as_str(),
                    current_members,
                    pending_invites.saturating_sub(1),
                )
                .await?
            }
        };

        if !seat_info.can_add_member() {
            let update_resp = state
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
            if !update_resp.status().is_success() {
                tracing::warn!(
                    invite_id = %invite.id,
                    "Failed to mark invite as expired due to seat limit"
                );
            }
            return Err((
                StatusCode::FORBIDDEN,
                format_seat_limit_error_with_upgrade(&seat_info, organization_type.as_str()),
            ));
        }

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
            return Err(crate::errors::sanitize_db_error(status.as_u16(), text));
        }

        invalidate_org_access_cache(&state, &user.id, organization_type.as_str());
        tracing::info!(
            user_id = %user.id,
            org_type = %organization_type.as_str(),
            role = %invite.role,
            "User accepted invite, cache invalidated"
        );
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
        return Err(crate::errors::sanitize_db_error(status.as_u16(), text));
    }

    write_audit_log(
        &state,
        AuditLogEntry {
            organization_type,
            organization_id: invite.organization_id.as_str(),
            actor_user_id: user.id.as_str(),
            target_user_id: Some(user.id.as_str()),
            target_email: Some(user_email.as_str()),
            action: "team_invite_accepted",
            old_role: None,
            new_role: Some(invite.role.as_str()),
            metadata: json!({ "invite_id": invite.id }),
        },
    )
    .await?;

    Ok(Json(ActionResponse {
        status: "ok".to_string(),
    }))
}

pub async fn decline_invite_by_token(
    State(state): State<AppState>,
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

    let update_resp = state
        .pg
        .from("organization_invites")
        .eq("id", invite.id.as_str())
        .update(
            json!({
                "status": "declined",
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
        return Err(crate::errors::sanitize_db_error(status.as_u16(), text));
    }

    Ok(Json(ActionResponse {
        status: "ok".to_string(),
    }))
}
