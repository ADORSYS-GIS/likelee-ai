use axum::http::StatusCode;
use chrono::{DateTime, Duration, NaiveDateTime, Utc};
use serde_json::json;

use crate::{auth::AuthUser, config::AppState, face_profiles::resolve_effective_creator_id};

const CREATOR_FULL_ACCESS_TRIAL_DAYS: i64 = 30;

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
            "none" => PlanTier::Free,
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
            PlanTier::Free => "Unsubscribed".to_string(),
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
    let effective_tier = billed_tier;

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
            PlanTier::Basic => Some(5),
            PlanTier::Pro | PlanTier::Enterprise => Some(10),
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
        return Err((
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
            text,
        ));
    }

    let rows: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!([]));
    let plan_tier_str = rows
        .as_array()
        .and_then(|a| a.first())
        .and_then(|o| o.get("plan_tier"))
        .and_then(|v| v.as_str())
        .unwrap_or("free");

    Ok(PlanTier::from_db(plan_tier_str))
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

pub async fn get_creator_plan_tier_for_user(
    state: &AppState,
    user: &AuthUser,
) -> Result<(String, PlanTier), (StatusCode, String)> {
    let creator_id = resolve_effective_creator_id(state, user).await?;
    let tier = get_creator_plan_tier(state, &creator_id).await?;
    Ok((creator_id, tier))
}

async fn get_creator_trial_started_at(
    state: &AppState,
    creator_id: &str,
) -> Result<Option<DateTime<Utc>>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("creators")
        .select("trial_started_at")
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
        return Err(crate::errors::sanitize_db_error(status.as_u16(), text));
    }

    let row = serde_json::from_str::<serde_json::Value>(&text)
        .ok()
        .and_then(|v| v.as_array().and_then(|a| a.first().cloned()))
        .unwrap_or(json!({}));

    let dt = row
        .get("trial_started_at")
        .and_then(|v| v.as_str())
        .and_then(|s| {
            DateTime::parse_from_rfc3339(s)
                .map(|dt| dt.with_timezone(&Utc))
                .ok()
                .or_else(|| {
                    NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S%.f%#z")
                        .ok()
                        .map(|ndt| DateTime::<Utc>::from_naive_utc_and_offset(ndt, Utc))
                })
                .or_else(|| {
                    NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S%.f")
                        .ok()
                        .map(|ndt| DateTime::<Utc>::from_naive_utc_and_offset(ndt, Utc))
                })
        });

    Ok(dt)
}

pub async fn get_creator_entitlement_tier(
    state: &AppState,
    creator_id: &str,
    billed_tier: PlanTier,
) -> Result<PlanTier, (StatusCode, String)> {
    if billed_tier != PlanTier::Free {
        return Ok(billed_tier);
    }

    let trial_started_at = get_creator_trial_started_at(state, creator_id).await?;
    let Some(trial_started_at) = trial_started_at else {
        return Ok(PlanTier::Free);
    };

    if Utc::now() - trial_started_at < Duration::days(CREATOR_FULL_ACCESS_TRIAL_DAYS) {
        Ok(PlanTier::Pro)
    } else {
        Ok(PlanTier::Free)
    }
}

pub async fn get_creator_entitlement_tier_for_user(
    state: &AppState,
    user: &AuthUser,
) -> Result<(String, PlanTier, PlanTier), (StatusCode, String)> {
    let (creator_id, billed_tier) = get_creator_plan_tier_for_user(state, user).await?;
    let entitlement_tier = get_creator_entitlement_tier(state, &creator_id, billed_tier).await?;
    Ok((creator_id, billed_tier, entitlement_tier))
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
