use super::support::{
    execute_rows, hash_token, internal_error, map_audit_log_record, map_invite_record,
    map_membership_record, now_rfc3339,
};
use super::types::{AuditLogRecord, InviteRecord, MembershipRecord, OrganizationType};
use crate::{errors::sanitize_db_error, state::AppState};
use axum::http::StatusCode;
use chrono::Utc;
use serde_json::{json, Value};

pub(crate) struct AuditLogEntry<'a> {
    pub organization_type: OrganizationType,
    pub organization_id: &'a str,
    pub actor_user_id: &'a str,
    pub target_user_id: Option<&'a str>,
    pub target_email: Option<&'a str>,
    pub action: &'a str,
    pub old_role: Option<&'a str>,
    pub new_role: Option<&'a str>,
    pub metadata: Value,
}

pub(crate) async fn fetch_organization_name(
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
    let row = super::support::execute_object(resp).await?;
    Ok(row
        .get(column)
        .and_then(|value| value.as_str())
        .unwrap_or("Organization")
        .to_string())
}

pub(crate) async fn list_members_for_scope(
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

    let mut members = rows
        .iter()
        .map(map_membership_record)
        .collect::<Result<Vec<_>, _>>()?;
    for member in &mut members {
        member.organization_name = organization_name.clone();
    }
    Ok(members)
}

pub(crate) async fn list_invites_for_scope(
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

pub(crate) async fn list_audit_logs_for_scope(
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

pub(crate) async fn ensure_member_not_active(
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

pub(crate) async fn ensure_pending_invite_not_exists(
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

pub(crate) async fn latest_invite_for_email(
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

pub(crate) async fn fetch_invite_by_raw_token(
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
    let row = rows
        .first()
        .ok_or((StatusCode::NOT_FOUND, "Invite not found".to_string()))?;
    map_invite_record(row)
}

pub(crate) async fn expire_invite_if_needed(
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

pub(crate) async fn fetch_target_membership(
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

pub(crate) async fn fetch_membership_by_user(
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

pub(crate) async fn write_audit_log(
    state: &AppState,
    entry: AuditLogEntry<'_>,
) -> Result<(), (StatusCode, String)> {
    let resp = state
        .pg
        .from("organization_audit_logs")
        .insert(
            json!({
                "organization_type": entry.organization_type.as_str(),
                "organization_id": entry.organization_id,
                "actor_user_id": entry.actor_user_id,
                "target_user_id": entry.target_user_id,
                "target_email": entry.target_email,
                "action": entry.action,
                "old_role": entry.old_role,
                "new_role": entry.new_role,
                "metadata": entry.metadata,
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

pub(crate) async fn count_active_members(
    state: &AppState,
    organization_type: OrganizationType,
    organization_id: &str,
) -> Result<usize, (StatusCode, String)> {
    let rows = execute_rows(
        state
            .pg
            .from("organization_memberships")
            .select("user_id")
            .eq("organization_type", organization_type.as_str())
            .eq("organization_id", organization_id)
            .eq("status", "active")
            .execute()
            .await
            .map_err(internal_error)?,
    )
    .await?;
    Ok(rows.len())
}

pub(crate) async fn count_pending_invites(
    state: &AppState,
    organization_type: OrganizationType,
    organization_id: &str,
) -> Result<usize, (StatusCode, String)> {
    let rows = execute_rows(
        state
            .pg
            .from("organization_invites")
            .select("id")
            .eq("organization_type", organization_type.as_str())
            .eq("organization_id", organization_id)
            .eq("status", "pending")
            .execute()
            .await
            .map_err(internal_error)?,
    )
    .await?;
    Ok(rows.len())
}
