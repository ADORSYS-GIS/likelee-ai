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
        .select("plan_tier,trial_ends_at")
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
    let row = rows.as_array().and_then(|a| a.first());

    let tier = row
        .and_then(|o| o.get("plan_tier"))
        .and_then(|v| v.as_str())
        .map(PlanTier::from_db)
        .unwrap_or(PlanTier::Free);

    // If the agency is on the free tier but their 14-day trial is still active,
    // grant them Pro-level access for the duration of the trial.
    if tier == PlanTier::Free {
        let trial_ends_at_str = row
            .and_then(|o| o.get("trial_ends_at"))
            .and_then(|v| v.as_str());

        let trial_active = trial_ends_at_str
            .and_then(|s| {
                chrono::DateTime::parse_from_rfc3339(s)
                    .ok()
                    .map(|dt| dt.with_timezone(&chrono::Utc))
                    .or_else(|| {
                        chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S%.f")
                            .ok()
                            .map(|ndt| {
                                chrono::DateTime::<chrono::Utc>::from_naive_utc_and_offset(
                                    ndt,
                                    chrono::Utc,
                                )
                            })
                    })
            })
            .map(|dt| dt > chrono::Utc::now())
            .unwrap_or(false);

        if trial_active {
            return Ok(PlanTier::Pro);
        }
    }

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
