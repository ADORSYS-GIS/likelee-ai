use axum::http::StatusCode;
use serde_json::json;

use crate::{auth::AuthUser, config::AppState, face_profiles::resolve_effective_creator_id};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PlanTier {
    Free,
    Basic,
    Pro,
    Enterprise,
}

impl PlanTier {
    pub fn from_db(value: &str) -> Self {
        match value.trim().to_lowercase().as_str() {
            // New tiers
            "basic" => PlanTier::Basic,
            "pro" => PlanTier::Pro,
            // Backward compatibility
            "agency" => PlanTier::Basic,
            "scale" => PlanTier::Pro,
            "enterprise" => PlanTier::Enterprise,
            _ => PlanTier::Free,
        }
    }
}

pub async fn get_agency_plan_tier(
    state: &AppState,
    agency_id: &str,
) -> Result<PlanTier, (StatusCode, String)> {
    let resp = state
        .pg
        .from("agencies")
        .select("plan_tier")
        .eq("id", agency_id)
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
        let code =
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err(crate::errors::sanitize_db_error(code.as_u16(), text));
    }

    let rows: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!([]));
    let tier = rows
        .as_array()
        .and_then(|a| a.first())
        .and_then(|o| o.get("plan_tier"))
        .and_then(|v| v.as_str())
        .map(PlanTier::from_db)
        .unwrap_or(PlanTier::Free);

    Ok(tier)
}

pub fn docuseal_template_limit(tier: PlanTier) -> Option<usize> {
    match tier {
        PlanTier::Free => Some(3),
        PlanTier::Basic | PlanTier::Pro | PlanTier::Enterprise => None,
    }
}

pub fn voice_clone_limit(tier: PlanTier) -> u32 {
    match tier {
        PlanTier::Free => 0,
        PlanTier::Basic => 6,
        PlanTier::Pro => 20,
        PlanTier::Enterprise => 20,
    }
}

pub async fn get_creator_plan_tier(
    state: &AppState,
    creator_id: &str,
) -> Result<PlanTier, (StatusCode, String)> {
    let resp = state
        .pg
        .from("creators")
        .select("plan_tier")
        .eq("id", creator_id)
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
        let code =
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err(crate::errors::sanitize_db_error(code.as_u16(), text));
    }

    let rows: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!([]));
    let tier = rows
        .as_array()
        .and_then(|a| a.first())
        .and_then(|o| o.get("plan_tier"))
        .and_then(|v| v.as_str())
        .map(PlanTier::from_db)
        .unwrap_or(PlanTier::Free);

    Ok(tier)
}

pub async fn get_creator_plan_tier_for_user(
    state: &AppState,
    user: &AuthUser,
) -> Result<(String, PlanTier), (StatusCode, String)> {
    let creator_id = resolve_effective_creator_id(state, user).await?;
    let tier = get_creator_plan_tier(state, &creator_id).await?;
    Ok((creator_id, tier))
}

pub fn creator_category_limit(tier: PlanTier) -> Option<usize> {
    match tier {
        PlanTier::Basic => Some(15),
        PlanTier::Free => None,
        PlanTier::Pro | PlanTier::Enterprise => None,
    }
}

pub fn creator_voice_tone_limit(tier: PlanTier) -> usize {
    match tier {
        PlanTier::Pro | PlanTier::Enterprise => 6,
        _ => 0,
    }
}

pub fn creator_has_cameo_uploads(tier: PlanTier) -> bool {
    matches!(tier, PlanTier::Pro | PlanTier::Enterprise)
}

pub fn creator_has_unauthorized_use_monitoring(tier: PlanTier) -> bool {
    matches!(tier, PlanTier::Pro | PlanTier::Enterprise)
}

pub fn creator_has_advanced_analytics(tier: PlanTier) -> bool {
    matches!(tier, PlanTier::Pro | PlanTier::Enterprise)
}

pub fn creator_has_voice_profiles(tier: PlanTier) -> bool {
    creator_voice_tone_limit(tier) > 0
}

pub fn creator_has_basic_access(tier: PlanTier) -> bool {
    !matches!(tier, PlanTier::Free)
}

pub fn creator_has_likeness_access(tier: PlanTier) -> bool {
    matches!(tier, PlanTier::Basic | PlanTier::Pro | PlanTier::Enterprise)
}

pub fn creator_has_kyc_access(tier: PlanTier) -> bool {
    creator_has_likeness_access(tier)
}

pub fn creator_has_agency_connection_access(tier: PlanTier) -> bool {
    creator_has_likeness_access(tier)
}

pub fn creator_has_brand_connection_access(tier: PlanTier) -> bool {
    creator_has_likeness_access(tier)
}

pub fn creator_has_payouts_access(tier: PlanTier) -> bool {
    creator_has_likeness_access(tier)
}

pub fn creator_has_jobs_access(tier: PlanTier) -> bool {
    matches!(tier, PlanTier::Pro | PlanTier::Enterprise)
}

pub fn creator_has_rules_access(tier: PlanTier) -> bool {
    matches!(tier, PlanTier::Pro | PlanTier::Enterprise)
}

pub fn creator_has_talent_portal_access(tier: PlanTier) -> bool {
    matches!(tier, PlanTier::Pro | PlanTier::Enterprise)
}

pub fn creator_has_campaign_archive_access(tier: PlanTier) -> bool {
    matches!(tier, PlanTier::Pro | PlanTier::Enterprise)
}

pub fn creator_has_active_campaigns_access(tier: PlanTier) -> bool {
    matches!(tier, PlanTier::Pro | PlanTier::Enterprise)
}

pub fn enforce_creator_entitlement(
    tier: PlanTier,
    allowed: impl FnOnce(PlanTier) -> bool,
    feature_key: &'static str,
    upgrade_to: &'static str,
) -> Result<(), (StatusCode, String)> {
    if allowed(tier) {
        return Ok(());
    }
    Err((
        StatusCode::FORBIDDEN,
        json!({
            "error": "feature_not_available_for_plan",
            "feature": feature_key,
            "current_plan": match tier {
                PlanTier::Free => "free",
                PlanTier::Basic => "basic",
                PlanTier::Pro => "pro",
                PlanTier::Enterprise => "enterprise",
            },
            "upgrade_to": upgrade_to,
        })
        .to_string(),
    ))
}
