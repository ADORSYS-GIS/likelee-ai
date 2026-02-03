use axum::http::StatusCode;
use serde_json::json;

use crate::config::AppState;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PlanTier {
    Free,
    Agency,
    Scale,
    Enterprise,
}

impl PlanTier {
    pub fn from_db(value: &str) -> Self {
        match value.trim().to_lowercase().as_str() {
            "agency" => PlanTier::Agency,
            "scale" => PlanTier::Scale,
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
        return Err((code, text));
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
        PlanTier::Agency | PlanTier::Scale | PlanTier::Enterprise => None,
    }
}

pub fn veriff_monthly_limit(tier: PlanTier) -> u32 {
    match tier {
        PlanTier::Free => 1,
        PlanTier::Agency => 50,
        PlanTier::Scale => 150,
        PlanTier::Enterprise => 150,
    }
}

pub fn voice_clone_limit(tier: PlanTier) -> u32 {
    match tier {
        PlanTier::Free => 0,
        PlanTier::Agency => 6,
        PlanTier::Scale => 20,
        PlanTier::Enterprise => 20,
    }
}
