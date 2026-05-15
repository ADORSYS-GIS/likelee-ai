use super::permissions::{has_permission, Permission, TeamRole};
use super::queries::fetch_organization_name;
use super::support::{
    ensure_permission, execute_rows, internal_error, map_membership_record,
    permissions_for_membership,
};
use super::types::{
    MembershipRecord, OrganizationAccess, OrganizationType, ResolvedScope, TeamScopeQuery,
};
use crate::{auth::AuthUser, state::AppState};
use axum::http::StatusCode;
use chrono::Utc;
use serde_json::json;
use std::time::Duration as StdDuration;

const CACHE_NAMESPACE_ORG_ACCESS: &str = "org_access";
const ORG_ACCESS_CACHE_TTL_SECS: u64 = 300;

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
            include_details: None,
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

    if let Some(cached) = state
        .cache_l2
        .get_json::<OrganizationAccess>(&user.id, &cache_key)
    {
        tracing::debug!(
            user_id = %user.id,
            org_type = %organization_type.as_str(),
            membership_role = %cached.membership_role,
            cached_permissions = ?cached.permissions,
            "Organization access cache hit"
        );
        state.cache_metrics.hit(crate::cache::CacheLevel::L2);

        let role = TeamRole::parse(cached.membership_role.as_str())
            .ok_or((StatusCode::FORBIDDEN, "Invalid membership role".to_string()))?;

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
            include_details: None,
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

pub fn invalidate_org_access_cache(state: &AppState, user_id: &str, organization_type: &str) {
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

pub(crate) async fn resolve_scope(
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

        if let Some(cached) = state
            .cache_l2
            .get_json::<ResolvedScope>(&user.id, &cache_key)
        {
            tracing::debug!(user_id = %user.id, org_type = %org_type, "resolve_scope cache hit");
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

    if memberships.len() > 1 {
        memberships.sort_by_key(|m| match m.role.as_str() {
            "owner" => 0,
            "admin" => 1,
            "project_manager" => 2,
            "reviewer" => 3,
            _ => 4,
        });

        if memberships.len() >= 2 && memberships[0].role == memberships[1].role {
            return Err((
                StatusCode::BAD_REQUEST,
                "Multiple active organizations found; specify organization_type and organization_id"
                    .to_string(),
            ));
        }
    }

    if !memberships.is_empty() {
        let membership = memberships.remove(0);
        let organization_type = OrganizationType::parse(membership.organization_type.as_str())
            .ok_or((
                StatusCode::INTERNAL_SERVER_ERROR,
                "Invalid organization type on membership".to_string(),
            ))?;
        let organization_name = fetch_organization_name(
            state,
            organization_type,
            membership.organization_id.as_str(),
        )
        .await?;

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

    tracing::debug!(
        user_id = %user.id,
        user_role = %user.role,
        org_type_filter = ?query.organization_type,
        "No membership found in organization_memberships, checking legacy owner pattern"
    );

    let organization_type_filter = query
        .organization_type
        .as_deref()
        .and_then(OrganizationType::parse);

    if let Some(org_type) = organization_type_filter {
        if let Some(membership) = resolve_legacy_owner_membership(state, user, org_type).await? {
            let organization_name =
                fetch_organization_name(state, org_type, membership.organization_id.as_str())
                    .await?;
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
        if let Some(membership) =
            resolve_legacy_owner_membership(state, user, OrganizationType::Agency).await?
        {
            let organization_name = fetch_organization_name(
                state,
                OrganizationType::Agency,
                membership.organization_id.as_str(),
            )
            .await?;
            return Ok(ResolvedScope {
                organization_type: OrganizationType::Agency,
                organization_id: membership.organization_id.clone(),
                organization_name,
                membership,
            });
        }
        if let Some(membership) =
            resolve_legacy_owner_membership(state, user, OrganizationType::Brand).await?
        {
            let organization_name = fetch_organization_name(
                state,
                OrganizationType::Brand,
                membership.organization_id.as_str(),
            )
            .await?;
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
        if let Some(org_id) = rows
            .first()
            .and_then(|r| r.get("id"))
            .and_then(|v| v.as_str())
        {
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
