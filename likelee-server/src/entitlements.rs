use axum::http::StatusCode;
use serde_json::json;

use crate::config::AppState;

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

pub async fn get_brand_plan_tier(
    state: &AppState,
    brand_id: &str,
) -> Result<PlanTier, (StatusCode, String)> {
    let resp = state
        .pg
        .from("brands")
        .select("plan_tier")
        .eq("id", brand_id)
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

pub fn brand_campaign_limit(tier: PlanTier) -> Option<usize> {
    match tier {
        PlanTier::Free => Some(0),
        PlanTier::Basic => Some(3),
        PlanTier::Pro => Some(10),
        PlanTier::Enterprise => None,
    }
}

pub fn brand_seat_limit(tier: PlanTier) -> Option<usize> {
    match tier {
        PlanTier::Free => Some(0),
        PlanTier::Basic => Some(2),
        PlanTier::Pro => Some(5),
        PlanTier::Enterprise => None,
    }
}

pub fn brand_allows_campaign_collaboration(tier: PlanTier) -> bool {
    matches!(tier, PlanTier::Pro | PlanTier::Enterprise)
}

pub fn brand_includes_studio_access(tier: PlanTier) -> bool {
    matches!(tier, PlanTier::Enterprise)
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
