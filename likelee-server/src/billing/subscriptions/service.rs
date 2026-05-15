use axum::http::{HeaderMap, StatusCode};
use chrono::{DateTime, Datelike, NaiveDateTime, TimeZone, Utc};
use reqwest::Url;
use serde_json::json;
use std::str::FromStr;

use crate::state::AppState;

pub const BRAND_STUDIO_ADDON_STUDIO_PLAN: &str = "pro";
pub const BRAND_STUDIO_ADDON_STUDIO_CREDITS: i64 = 2000;

pub const AGENCY_MIN_SELF_SERVE_ROSTER_MODELS: u32 = 2;
pub const AGENCY_MAX_SELF_SERVE_ROSTER_MODELS: u32 = 1000;

pub fn credits_to_price_id(raw: &str, credits: i64) -> Option<String> {
    let raw = raw.trim();
    if raw.is_empty() {
        return None;
    }
    for pair in raw.split(',') {
        let pair = pair.trim();
        if pair.is_empty() {
            continue;
        }

        let mut it = pair.splitn(2, ':');
        let k = it.next().unwrap_or("").trim();
        let v = it.next().unwrap_or("").trim();
        if k.is_empty() || v.is_empty() {
            continue;
        }

        if let Ok(kc) = k.parse::<i64>() {
            if kc == credits {
                return Some(v.to_string());
            }
        }
    }

    None
}

pub fn stripe_seat_quantity_for_subscription(state: &AppState, sub: &stripe_sdk::Subscription) -> i64 {
    sub.items
        .data
        .iter()
        .filter_map(|item| {
            let price_id = item
                .price
                .as_ref()
                .map(|price| price.id.to_string())
                .unwrap_or_default();
            if agency_headcount_price_id_matches(state, price_id.as_str()) {
                item.quantity.and_then(|q| i64::try_from(q).ok())
            } else {
                None
            }
        })
        .sum::<i64>()
}

pub fn stripe_subscription_interval(sub: &stripe_sdk::Subscription) -> String {
    if let Some(v) = sub.metadata.get("billing_interval") {
        let trimmed = v.trim().to_lowercase();
        if trimmed == "month" || trimmed == "year" {
            return trimmed;
        }
    }

    for item in sub.items.data.iter() {
        if let Some(price) = item.price.as_ref() {
            if let Some(rec) = price.recurring.as_ref() {
                let interval = rec.interval.to_string().to_lowercase();
                if interval == "month" || interval == "year" {
                    return interval;
                }
            }
        }
    }

    "month".to_string()
}

pub fn ts_to_rfc3339(ts: i64) -> Option<String> {
    DateTime::<Utc>::from_timestamp(ts, 0).map(|dt| dt.to_rfc3339())
}

pub fn studio_price_id_for_plan(
    state: &AppState,
    plan_type: Option<&str>,
    credits: i64,
) -> Option<String> {
    let p = plan_type.unwrap_or("").trim().to_lowercase();

    let plan_raw = if p == "lite" {
        state.stripe.studio_lite_price_ids.as_str()
    } else if p == "pro" {
        state.stripe.studio_pro_price_ids.as_str()
    } else {
        ""
    };

    credits_to_price_id(plan_raw, credits)
        .or_else(|| credits_to_price_id(state.stripe.studio_price_ids.as_str(), credits))
}

pub fn billing_error(status: StatusCode, code: &str, message: &str) -> (StatusCode, String) {
    (
        status,
        json!({
            "status": "error",
            "error": code,
            "message": message,
        })
        .to_string(),
    )
}

pub fn billing_error_msg(status: StatusCode, code: &str, message: String) -> (StatusCode, String) {
    billing_error(status, code, message.as_str())
}

pub fn map_postgrest_transport_error(e: impl std::fmt::Display) -> (StatusCode, String) {
    billing_error_msg(
        StatusCode::INTERNAL_SERVER_ERROR,
        "database_error",
        e.to_string(),
    )
}

pub fn normalize_interval(value: Option<&str>) -> Result<String, (StatusCode, String)> {
    let v = value.unwrap_or("month").trim().to_lowercase();
    if v == "month" || v == "year" {
        Ok(v)
    } else {
        Err(billing_error(
            StatusCode::BAD_REQUEST,
            "invalid_interval",
            "Interval must be 'month' or 'year'.",
        ))
    }
}

pub fn normalize_self_serve_plan(value: &str) -> Result<String, (StatusCode, String)> {
    let v = value.trim().to_lowercase();
    if v.is_empty() {
        return Err(billing_error(
            StatusCode::BAD_REQUEST,
            "invalid_plan",
            "Plan is required.",
        ));
    }
    if v == "enterprise" {
        return Err(billing_error(
            StatusCode::BAD_REQUEST,
            "enterprise_contact_sales",
            "Enterprise plan requires contacting sales.",
        ));
    }
    if v == "basic" || v == "pro" {
        Ok(v)
    } else {
        Err(billing_error(
            StatusCode::BAD_REQUEST,
            "invalid_plan",
            "Plan must be 'basic' or 'pro'.",
        ))
    }
}

pub fn normalize_optional_self_serve_plan(
    value: Option<&str>,
) -> Result<Option<String>, (StatusCode, String)> {
    match value {
        None => Ok(None),
        Some(v) => Ok(Some(normalize_self_serve_plan(v)?)),
    }
}

pub fn agency_plan_price_ids<'a>(
    state: &'a AppState,
    plan: &str,
    interval: Option<&str>,
) -> Option<(&'static str, &'a str, &'a str, &'static str, &'static str)> {
    let is_annual = interval.unwrap_or("month").eq_ignore_ascii_case("year");

    match plan.trim().to_lowercase().as_str() {
        "basic" => {
            if is_annual {
                Some((
                    "Agency Basic (Annual)",
                    state.stripe.agency_basic_base_annual_price_id.as_str(),
                    state.stripe.agency_basic_headcount_annual_price_id.as_str(),
                    "STRIPE_AGENCY_BASIC_BASE_ANNUAL_PRICE_ID",
                    "STRIPE_AGENCY_BASIC_HEADCOUNT_ANNUAL_PRICE_ID",
                ))
            } else {
                Some((
                    "Agency Basic",
                    state.stripe.agency_basic_base_price_id.as_str(),
                    state.stripe.agency_basic_headcount_price_id.as_str(),
                    "STRIPE_AGENCY_BASIC_BASE_PRICE_ID",
                    "STRIPE_AGENCY_BASIC_HEADCOUNT_PRICE_ID",
                ))
            }
        }
        "pro" => {
            if is_annual {
                Some((
                    "Agency Pro (Annual)",
                    state.stripe.agency_pro_base_annual_price_id.as_str(),
                    state.stripe.agency_pro_headcount_annual_price_id.as_str(),
                    "STRIPE_AGENCY_PRO_BASE_ANNUAL_PRICE_ID",
                    "STRIPE_AGENCY_PRO_HEADCOUNT_ANNUAL_PRICE_ID",
                ))
            } else {
                Some((
                    "Agency Pro",
                    state.stripe.agency_pro_base_price_id.as_str(),
                    state.stripe.agency_pro_headcount_price_id.as_str(),
                    "STRIPE_AGENCY_PRO_BASE_PRICE_ID",
                    "STRIPE_AGENCY_PRO_HEADCOUNT_PRICE_ID",
                ))
            }
        }
        _ => None,
    }
}

pub fn agency_seat_price_id<'a>(
    state: &'a AppState,
    plan: &str,
    interval: Option<&str>,
) -> Option<(&'a str, &'static str)> {
    let (_, _, headcount_price_id, _, headcount_env_var) =
        agency_plan_price_ids(state, plan, interval)?;
    Some((headcount_price_id, headcount_env_var))
}

pub fn recurring_price_line_item(
    price_id: &str,
    quantity: u32,
) -> stripe_sdk::CreateCheckoutSessionLineItems {
    stripe_sdk::CreateCheckoutSessionLineItems {
        price: Some(price_id.to_string()),
        quantity: Some(u64::from(quantity)),
        ..Default::default()
    }
}

pub fn normalize_brand_billing_cycle(value: Option<&str>) -> &'static str {
    match value.unwrap_or("monthly").trim().to_lowercase().as_str() {
        "annual" => "annual",
        _ => "monthly",
    }
}

pub fn brand_plan_to_price_id_for_billing_cycle(
    state: &AppState,
    plan: &str,
    billing_cycle: &str,
) -> Option<String> {
    match (
        plan.trim().to_lowercase().as_str(),
        normalize_brand_billing_cycle(Some(billing_cycle)),
    ) {
        ("basic", "annual") => Some(state.stripe.brand_basic_annual_price_id.clone()),
        ("basic", _) => Some(state.stripe.brand_basic_price_id.clone()),
        ("pro", "annual") => Some(state.stripe.brand_pro_annual_price_id.clone()),
        ("pro", _) => Some(state.stripe.brand_pro_price_id.clone()),
        _ => None,
    }
}

pub fn creator_plan_to_price_id(state: &AppState, plan: &str) -> Option<String> {
    match plan.trim().to_lowercase().as_str() {
        "basic" => Some(state.stripe.creator_basic_price_id.clone()),
        "pro" => Some(state.stripe.creator_pro_price_id.clone()),
        _ => None,
    }
}

pub fn brand_plan_to_price_env_var_for_billing_cycle(
    plan: &str,
    billing_cycle: &str,
) -> Option<&'static str> {
    match (
        plan.trim().to_lowercase().as_str(),
        normalize_brand_billing_cycle(Some(billing_cycle)),
    ) {
        ("basic", "annual") => Some("STRIPE_BRAND_BASIC_ANNUAL_PRICE_ID"),
        ("basic", _) => Some("STRIPE_BRAND_BASIC_PRICE_ID"),
        ("pro", "annual") => Some("STRIPE_BRAND_PRO_ANNUAL_PRICE_ID"),
        ("pro", _) => Some("STRIPE_BRAND_PRO_PRICE_ID"),
        _ => None,
    }
}

pub fn creator_plan_to_price_env_var(plan: &str) -> Option<&'static str> {
    match plan.trim().to_lowercase().as_str() {
        "basic" => Some("STRIPE_CREATOR_BASIC_PRICE_ID"),
        "pro" => Some("STRIPE_CREATOR_PRO_PRICE_ID"),
        _ => None,
    }
}

pub fn sanitize_next_path(next_path: Option<&str>) -> Option<String> {
    let candidate = next_path?.trim();
    if candidate.is_empty() || !candidate.starts_with('/') || candidate.starts_with("//") {
        return None;
    }
    Some(candidate.to_string())
}

pub fn brand_billing_frontend_url(
    state: &AppState,
    params: Vec<(&str, String)>,
) -> Result<String, (StatusCode, String)> {
    let base = state.frontend_url.trim();
    if base.is_empty() {
        return Err((
            StatusCode::PRECONDITION_FAILED,
            "frontend_url_not_configured".to_string(),
        ));
    }

    let mut url = Url::parse(base).map_err(|e| {
        (
            StatusCode::PRECONDITION_FAILED,
            format!("invalid_frontend_url:{e}"),
        )
    })?;
    url.set_path("/brandpricing");
    url.set_query(None);

    {
        let mut query = url.query_pairs_mut();
        for (key, value) in params {
            if !value.trim().is_empty() {
                query.append_pair(key, value.as_str());
            }
        }
    }

    Ok(url.to_string())
}

pub fn agency_studio_frontend_url(state: &AppState) -> Result<String, (StatusCode, String)> {
    let base = state.frontend_url.trim();
    if base.is_empty() {
        return Err((
            StatusCode::PRECONDITION_FAILED,
            "frontend_url_not_configured".to_string(),
        ));
    }

    let mut url = Url::parse(base).map_err(|e| {
        (
            StatusCode::PRECONDITION_FAILED,
            format!("invalid_frontend_url:{e}"),
        )
    })?;
    url.set_path("/studio");
    url.set_query(None);
    Ok(url.to_string())
}

pub fn creator_plan_to_price_id_with_interval(
    state: &AppState,
    plan: &str,
    interval: &str,
) -> Option<String> {
    let plan = plan.trim().to_lowercase();
    let interval = interval.trim().to_lowercase();
    match (plan.as_str(), interval.as_str()) {
        ("basic", "year") => Some(state.stripe.creator_basic_annual_price_id.clone()),
        ("pro", "year") => Some(state.stripe.creator_pro_annual_price_id.clone()),
        ("basic", "month") => Some(state.stripe.creator_basic_price_id.clone()),
        ("pro", "month") => Some(state.stripe.creator_pro_price_id.clone()),
        _ => None,
    }
}

pub fn creator_plan_to_price_env_var_with_interval(plan: &str, interval: &str) -> Option<&'static str> {
    let plan = plan.trim().to_lowercase();
    let interval = interval.trim().to_lowercase();
    match (plan.as_str(), interval.as_str()) {
        ("basic", "year") => Some("STRIPE_CREATOR_BASIC_ANNUAL_PRICE_ID"),
        ("pro", "year") => Some("STRIPE_CREATOR_PRO_ANNUAL_PRICE_ID"),
        ("basic", "month") => Some("STRIPE_CREATOR_BASIC_PRICE_ID"),
        ("pro", "month") => Some("STRIPE_CREATOR_PRO_PRICE_ID"),
        _ => None,
    }
}

pub fn agency_base_price_id_matches(state: &AppState, price_id: &str) -> bool {
    let price_id = price_id.trim();
    !price_id.is_empty()
        && [
            state.stripe.agency_basic_base_price_id.as_str(),
            state.stripe.agency_basic_base_annual_price_id.as_str(),
            state.stripe.agency_pro_base_price_id.as_str(),
            state.stripe.agency_pro_base_annual_price_id.as_str(),
            state.stripe.agency_price_id.as_str(),
            state.stripe.scale_price_id.as_str(),
        ]
        .into_iter()
        .filter(|candidate| !candidate.trim().is_empty())
        .any(|candidate| candidate == price_id)
}

pub fn agency_headcount_price_id_matches(state: &AppState, price_id: &str) -> bool {
    let price_id = price_id.trim();
    !price_id.is_empty()
        && [
            state.stripe.agency_basic_headcount_price_id.as_str(),
            state.stripe.agency_basic_headcount_annual_price_id.as_str(),
            state.stripe.agency_pro_headcount_price_id.as_str(),
            state.stripe.agency_pro_headcount_annual_price_id.as_str(),
        ]
        .into_iter()
        .filter(|candidate| !candidate.trim().is_empty())
        .any(|candidate| candidate == price_id)
}

pub fn agency_irl_booking_price_id_matches(state: &AppState, price_id: &str) -> bool {
    let price_id = price_id.trim();
    !price_id.is_empty()
        && [
            state.stripe.agency_irl_booking_price_id.as_str(),
            state.stripe.agency_irl_booking_annual_price_id.as_str(),
        ]
        .into_iter()
        .filter(|candidate| !candidate.trim().is_empty())
        .any(|candidate| candidate == price_id)
}

pub fn agency_checkout_success_url(url: &str) -> String {
    let trimmed = url.trim();
    if trimmed.is_empty()
        || trimmed.contains("{CHECKOUT_SESSION_ID}")
        || trimmed.contains("session_id=")
    {
        return trimmed.to_string();
    }

    let separator = if trimmed.contains('?') { '&' } else { '?' };
    format!("{trimmed}{separator}session_id={{CHECKOUT_SESSION_ID}}")
}

pub fn agency_plan_tier_rank(value: &str) -> i32 {
    match value.trim().to_lowercase().as_str() {
        "enterprise" => 3,
        "pro" => 2,
        "basic" => 1,
        _ => 0,
    }
}

pub fn parse_checkout_metadata_flag(value: Option<&String>) -> bool {
    value
        .map(|raw| raw.trim().to_lowercase())
        .map(|raw| matches!(raw.as_str(), "1" | "true" | "yes" | "on"))
        .unwrap_or(false)
}

pub fn verify_cron_auth(headers: &HeaderMap, cron_secret: &str) -> Result<(), (StatusCode, String)> {
    if cron_secret.trim().is_empty() {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            "CRON_SECRET not configured".to_string(),
        ));
    }

    let auth_header = headers
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    if !auth_header.starts_with("Bearer ") {
        return Err((
            StatusCode::UNAUTHORIZED,
            "Missing or invalid Authorization header. Use: Authorization: Bearer <secret>"
                .to_string(),
        ));
    }

    let token = auth_header.strip_prefix("Bearer ").unwrap_or("");
    if token != cron_secret.trim() {
        return Err((StatusCode::UNAUTHORIZED, "Invalid cron secret".to_string()));
    }

    Ok(())
}

pub fn parse_db_date(s: &str) -> Option<DateTime<Utc>> {
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
}

#[allow(dead_code)]
pub fn find_active_seat_addon_subscription<'a>(
    state: &AppState,
    subscriptions: &'a [stripe_sdk::Subscription],
    agency_id: &str,
) -> Option<&'a stripe_sdk::Subscription> {
    subscriptions.iter().find(|sub| {
        let belongs_to_agency = sub
            .metadata
            .get("agency_id")
            .map(|value| value.trim() == agency_id)
            .unwrap_or(false);
        if !belongs_to_agency || !crate::billing::payouts::stripe_subscription_is_active(sub) {
            return false;
        }

        let is_seat_addon = sub
            .metadata
            .get("subscription_kind")
            .map(|value| value.trim().eq_ignore_ascii_case("seat_addon"))
            .unwrap_or(false);
        if is_seat_addon {
            return true;
        }

        sub.items.data.iter().any(|item| {
            item.price
                .as_ref()
                .map(|price| price.id.to_string())
                .map(|price_id| agency_headcount_price_id_matches(state, price_id.as_str()))
                .unwrap_or(false)
        })
    })
}

#[cfg(test)]
mod tests {
    use super::{
        normalize_interval, normalize_optional_self_serve_plan, normalize_self_serve_plan,
    };

    #[test]
    fn normalize_interval_defaults_to_month() {
        let v = normalize_interval(None).expect("should default");
        assert_eq!(v, "month");
    }

    #[test]
    fn normalize_interval_accepts_month_and_year() {
        assert_eq!(normalize_interval(Some("month")).unwrap(), "month");
        assert_eq!(normalize_interval(Some("year")).unwrap(), "year");
        assert_eq!(normalize_interval(Some(" MONTH ")).unwrap(), "month");
        assert_eq!(normalize_interval(Some("YeAr")).unwrap(), "year");
    }

    #[test]
    fn normalize_interval_rejects_other_values() {
        assert!(normalize_interval(Some("weekly")).is_err());
        assert!(normalize_interval(Some("")).is_err());
    }

    #[test]
    fn normalize_self_serve_plan_accepts_basic_and_pro() {
        assert_eq!(normalize_self_serve_plan("basic").unwrap(), "basic");
        assert_eq!(normalize_self_serve_plan(" pro ").unwrap(), "pro");
        assert_eq!(normalize_self_serve_plan("BASIC").unwrap(), "basic");
    }

    #[test]
    fn normalize_self_serve_plan_rejects_enterprise_and_unknown() {
        assert!(normalize_self_serve_plan("enterprise").is_err());
        assert!(normalize_self_serve_plan("free").is_err());
        assert!(normalize_self_serve_plan("").is_err());
    }

    #[test]
    fn normalize_optional_self_serve_plan_handles_none_and_valid_values() {
        assert_eq!(normalize_optional_self_serve_plan(None).unwrap(), None);
        assert_eq!(
            normalize_optional_self_serve_plan(Some("basic")).unwrap(),
            Some("basic".to_string())
        );
    }
}
