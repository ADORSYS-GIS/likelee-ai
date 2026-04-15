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

#[derive(Debug, Clone)]
pub struct AgencyAccessState {
    pub billed_tier: PlanTier,
    pub effective_tier: PlanTier,
    pub plan_interval: String,
    pub trial_active: bool,
    pub trial_ends_at: Option<chrono::DateTime<chrono::Utc>>,
    pub addon_irl_booking_enabled: bool,
}

impl AgencyAccessState {
    pub fn has_paid_access(&self) -> bool {
        self.effective_tier != PlanTier::Free
    }

    pub fn has_pro_access(&self) -> bool {
        matches!(self.effective_tier, PlanTier::Pro | PlanTier::Enterprise)
    }

    pub fn display_plan_label(&self) -> String {
        let tier_label = match self.billed_tier {
            PlanTier::Enterprise => "Enterprise".to_string(),
            PlanTier::Pro => "Pro".to_string(),
            PlanTier::Basic => "Basic".to_string(),
            PlanTier::Free if self.trial_active => "Trial".to_string(),
            PlanTier::Free => "Free".to_string(),
        };

        if self.trial_active {
            let base = match self.effective_tier {
                PlanTier::Enterprise => "Enterprise",
                PlanTier::Pro => "Pro",
                PlanTier::Basic => "Basic",
                PlanTier::Free => "Pro",
            };
            return format!("{base} Trial");
        }

        match self.billed_tier {
            PlanTier::Basic | PlanTier::Pro => {
                let interval = if self.plan_interval.eq_ignore_ascii_case("year") {
                    "Annual"
                } else {
                    "Monthly"
                };
                format!("{tier_label} {interval}")
            }
            _ => tier_label,
        }
    }
}

fn parse_trial_datetime(value: Option<&str>) -> Option<chrono::DateTime<chrono::Utc>> {
    value.and_then(|s| {
        chrono::DateTime::parse_from_rfc3339(s)
            .ok()
            .map(|dt| dt.with_timezone(&chrono::Utc))
            .or_else(|| {
                chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S%.f")
                    .ok()
                    .map(|ndt| {
                        chrono::DateTime::<chrono::Utc>::from_naive_utc_and_offset(ndt, chrono::Utc)
                    })
            })
    })
}

pub async fn get_agency_access_state(
    state: &AppState,
    agency_id: &str,
) -> Result<AgencyAccessState, (StatusCode, String)> {
    let resp = state
        .pg
        .from("agencies")
        .select("plan_tier,trial_ends_at,plan_interval,addon_irl_booking_enabled")
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

    let billed_tier = row
        .and_then(|o| o.get("plan_tier"))
        .and_then(|v| v.as_str())
        .map(PlanTier::from_db)
        .unwrap_or(PlanTier::Free);
    let trial_ends_at = parse_trial_datetime(
        row.and_then(|o| o.get("trial_ends_at"))
            .and_then(|v| v.as_str()),
    );
    let trial_active = trial_ends_at
        .map(|dt| dt > chrono::Utc::now())
        .unwrap_or(false);
    let effective_tier = if trial_active && billed_tier == PlanTier::Free {
        PlanTier::Pro
    } else {
        billed_tier
    };

    Ok(AgencyAccessState {
        billed_tier,
        effective_tier,
        plan_interval: row
            .and_then(|o| o.get("plan_interval"))
            .and_then(|v| v.as_str())
            .unwrap_or("month")
            .to_string(),
        trial_active,
        trial_ends_at,
        addon_irl_booking_enabled: row
            .and_then(|o| o.get("addon_irl_booking_enabled"))
            .and_then(|v| v.as_bool())
            .unwrap_or(false),
    })
}

pub async fn require_agency_paid_access(
    state: &AppState,
    agency_id: &str,
    restriction_code: &str,
) -> Result<AgencyAccessState, (StatusCode, String)> {
    let access = get_agency_access_state(state, agency_id).await?;
    if !access.has_paid_access() {
        return Err((StatusCode::FORBIDDEN, restriction_code.to_string()));
    }
    Ok(access)
}

pub async fn require_agency_pro_access(
    state: &AppState,
    agency_id: &str,
    restriction_code: &str,
) -> Result<AgencyAccessState, (StatusCode, String)> {
    let access = get_agency_access_state(state, agency_id).await?;
    if !access.has_pro_access() {
        return Err((StatusCode::FORBIDDEN, restriction_code.to_string()));
    }
    Ok(access)
}

pub async fn get_agency_plan_tier(
    state: &AppState,
    agency_id: &str,
) -> Result<PlanTier, (StatusCode, String)> {
    Ok(get_agency_access_state(state, agency_id)
        .await?
        .effective_tier)
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

pub struct SeatLimitInfo {
    pub limit: Option<usize>,
    pub current_members: usize,
    pub pending_invites: usize,
    pub current_usage: usize,
    pub available: usize,
    pub plan_tier: PlanTier,
}

impl SeatLimitInfo {
    pub fn can_add_member(&self) -> bool {
        match self.limit {
            Some(limit) => self.current_usage < limit,
            None => true,
        }
    }

    pub fn seats_remaining(&self) -> Option<usize> {
        self.limit
            .map(|limit| limit.saturating_sub(self.current_usage))
    }
}

pub async fn get_brand_seat_limit_info(
    state: &AppState,
    brand_id: &str,
    current_members: usize,
    pending_invites: usize,
) -> Result<SeatLimitInfo, (StatusCode, String)> {
    let tier = get_brand_plan_tier(state, brand_id).await?;
    let limit = brand_seat_limit(tier);
    let current_usage = current_members.saturating_add(pending_invites);
    let available = match limit {
        Some(l) => l.saturating_sub(current_usage),
        None => usize::MAX,
    };
    Ok(SeatLimitInfo {
        limit,
        current_members,
        pending_invites,
        current_usage,
        available,
        plan_tier: tier,
    })
}

pub async fn get_agency_seat_limit_info(
    state: &AppState,
    agency_id: &str,
    current_members: usize,
    pending_invites: usize,
) -> Result<SeatLimitInfo, (StatusCode, String)> {
    let access = get_agency_access_state(state, agency_id).await?;
    let resp = state
        .pg
        .from("agencies")
        .select("seats_limit")
        .eq("id", agency_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let rows: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!([]));
    let db_seats_limit = rows
        .as_array()
        .and_then(|a| a.first())
        .and_then(|o| o.get("seats_limit"))
        .and_then(|v| v.as_i64());

    let limit = match db_seats_limit {
        Some(n) if n > 0 => Some(n as usize),
        _ => match access.billed_tier {
            PlanTier::Free => Some(1),
            PlanTier::Basic | PlanTier::Pro | PlanTier::Enterprise => Some(5),
        },
    };

    let current_usage = current_members.saturating_add(pending_invites);
    let available = match limit {
        Some(l) => l.saturating_sub(current_usage),
        None => usize::MAX,
    };

    Ok(SeatLimitInfo {
        limit,
        current_members,
        pending_invites,
        current_usage,
        available,
        plan_tier: access.billed_tier,
    })
}

pub fn format_seat_limit_error(info: &SeatLimitInfo) -> String {
    match info.limit {
        Some(limit) => {
            format!(
                "SEAT_LIMIT_EXCEEDED: Your current plan allows {} team seat(s). You currently have {} member(s) and {} pending invite(s). Please upgrade your plan to add more team members.",
                limit,
                info.current_members,
                info.pending_invites
            )
        }
        None => "SEAT_LIMIT_EXCEEDED: Unable to add team member.".to_string(),
    }
}

pub fn format_seat_limit_error_with_upgrade(
    info: &SeatLimitInfo,
    organization_type: &str,
) -> String {
    match info.limit {
        Some(limit) => {
            let upgrade_hint = match organization_type {
                "brand" => match info.plan_tier {
                    PlanTier::Free => "Upgrade to Basic or Pro to unlock team seats.",
                    PlanTier::Basic => {
                        "Upgrade to Pro for 5 seats or Enterprise for unlimited seats."
                    }
                    PlanTier::Pro => "Upgrade to Enterprise for unlimited seats.",
                    PlanTier::Enterprise => "",
                },
                "agency" => "Purchase additional seats or upgrade your plan.",
                _ => "Please upgrade your plan.",
            };
            format!(
                "SEAT_LIMIT_EXCEEDED: Your current plan allows {} team seat(s). You currently have {} member(s) and {} pending invite(s). {}",
                limit,
                info.current_members,
                info.pending_invites,
                upgrade_hint
            )
        }
        None => "SEAT_LIMIT_EXCEEDED: Unable to add team member.".to_string(),
    }
}
