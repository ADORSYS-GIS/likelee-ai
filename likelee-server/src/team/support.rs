use super::types::{AuditLogRecord, InviteRecord, MembershipRecord};
use crate::errors::sanitize_db_error;
use axum::http::StatusCode;
use chrono::Utc;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

use super::permissions::{has_permission, permissions_for_role, Permission, TeamRole};

pub(crate) fn now_rfc3339() -> String {
    Utc::now().to_rfc3339()
}

pub(crate) fn internal_error<E: ToString>(error: E) -> (StatusCode, String) {
    (StatusCode::INTERNAL_SERVER_ERROR, error.to_string())
}

pub(crate) fn hash_token(raw_token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(raw_token.as_bytes());
    hex::encode(hasher.finalize())
}

pub(crate) fn normalize_email(input: &str) -> Result<String, (StatusCode, String)> {
    let normalized = input.trim().to_lowercase();
    if normalized.is_empty() || !normalized.contains('@') {
        return Err((
            StatusCode::BAD_REQUEST,
            "A valid email address is required".to_string(),
        ));
    }
    Ok(normalized)
}

pub(crate) fn parse_assignable_role(input: &str) -> Result<TeamRole, (StatusCode, String)> {
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

pub(crate) fn ensure_assignable_role(
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

pub(crate) fn permissions_for_membership(
    membership: &MembershipRecord,
) -> Result<Vec<String>, (StatusCode, String)> {
    let role = TeamRole::parse(membership.role.as_str())
        .ok_or((StatusCode::FORBIDDEN, "Invalid membership role".to_string()))?;
    Ok(permissions_for_role(role)
        .into_iter()
        .map(|permission| permission.as_str().to_string())
        .collect())
}

pub(crate) fn ensure_permission(
    membership: &MembershipRecord,
    permission: Permission,
) -> Result<(), (StatusCode, String)> {
    let role = TeamRole::parse(membership.role.as_str())
        .ok_or((StatusCode::FORBIDDEN, "Invalid membership role".to_string()))?;
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

pub(crate) async fn execute_rows(
    response: reqwest::Response,
) -> Result<Vec<Value>, (StatusCode, String)> {
    let status = response.status();
    let text = response.text().await.map_err(internal_error)?;
    if !status.is_success() {
        return Err(sanitize_db_error(status.as_u16(), text));
    }
    serde_json::from_str::<Vec<Value>>(text.as_str()).map_err(internal_error)
}

pub(crate) async fn execute_object(
    response: reqwest::Response,
) -> Result<Value, (StatusCode, String)> {
    let status = response.status();
    let text = response.text().await.map_err(internal_error)?;
    if !status.is_success() {
        return Err(sanitize_db_error(status.as_u16(), text));
    }
    serde_json::from_str::<Value>(text.as_str()).map_err(internal_error)
}

pub(crate) fn map_membership_record(row: &Value) -> Result<MembershipRecord, (StatusCode, String)> {
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

pub(crate) fn map_invite_record(row: &Value) -> Result<InviteRecord, (StatusCode, String)> {
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

pub(crate) fn map_audit_log_record(row: &Value) -> Result<AuditLogRecord, (StatusCode, String)> {
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

pub(crate) fn string_field(row: &Value, key: &str) -> Result<String, (StatusCode, String)> {
    row.get(key)
        .and_then(|value| value.as_str())
        .map(|value| value.to_string())
        .ok_or((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Missing '{}' in database row", key),
        ))
}

pub(crate) fn optional_string_field(row: &Value, key: &str) -> Option<String> {
    row.get(key)
        .and_then(|value| value.as_str())
        .map(|value| value.to_string())
}
