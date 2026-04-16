use axum::{extract::State, http::StatusCode, Json};
use chrono::{DateTime, NaiveDateTime, Utc};
use reqwest::Url;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::str::FromStr;
use std::time::Duration as StdDuration;
use tracing::{info, warn};

use crate::{
    auth::AuthUser,
    config::AppState,
    entitlements::{
        creator_category_limit, creator_has_active_campaigns_access,
        creator_has_advanced_analytics, creator_has_agency_connection_access,
        creator_has_brand_connection_access, creator_has_cameo_uploads,
        creator_has_campaign_archive_access, creator_has_jobs_access, creator_has_kyc_access,
        creator_has_likeness_access, creator_has_payouts_access, creator_has_rules_access,
        creator_has_talent_portal_access, creator_has_unauthorized_use_monitoring,
        creator_has_voice_profiles, creator_voice_tone_limit,
        get_creator_entitlement_tier_for_user, get_creator_plan_tier_for_user, PlanTier,
    },
    team::{self, permissions::Permission},
};

pub const BRAND_STUDIO_ADDON_STUDIO_PLAN: &str = "pro";
pub const BRAND_STUDIO_ADDON_STUDIO_CREDITS: i64 = 2000;

fn credits_to_price_id(raw: &str, credits: i64) -> Option<String> {
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

fn stripe_seat_quantity_for_subscription(state: &AppState, sub: &stripe_sdk::Subscription) -> i64 {
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

fn stripe_subscription_interval(sub: &stripe_sdk::Subscription) -> String {
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

fn ts_to_rfc3339(ts: i64) -> Option<String> {
    DateTime::<Utc>::from_timestamp(ts, 0).map(|dt| dt.to_rfc3339())
}

pub async fn get_agency_seat_breakdown(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<AgencySeatBreakdownResponse>, (StatusCode, String)> {
    let agency_access = team::require_agency_access(&state, &user).await?;
    let agency_id = agency_access.organization_id.clone();
    if state.stripe_secret_key.trim().is_empty() {
        return Err(billing_error(
            StatusCode::PRECONDITION_FAILED,
            "stripe_not_configured",
            "Stripe is not configured on the server.",
        ));
    }

    let billing_ctx = get_or_create_agency_billing_context(&state, &agency_id).await?;
    let subscriptions =
        list_customer_subscriptions_for_billing(&state, billing_ctx.customer_id.as_str()).await?;

    let mut items: Vec<AgencySeatBreakdownItem> = Vec::new();
    for sub in subscriptions.iter() {
        let belongs_to_agency = sub
            .metadata
            .get("agency_id")
            .map(|value| value.trim() == agency_id.as_str())
            .unwrap_or(false);
        if !belongs_to_agency {
            continue;
        }
        if !crate::payouts::stripe_subscription_is_active(sub) {
            continue;
        }

        let seat_qty = stripe_seat_quantity_for_subscription(&state, sub);
        if seat_qty <= 0 {
            continue;
        }

        let subscription_kind = sub
            .metadata
            .get("subscription_kind")
            .map(|value| value.trim().to_string())
            .unwrap_or_default();
        let seats_in_plan = sub
            .metadata
            .get("seats_in_plan")
            .map(|value| value.trim() == "1")
            .unwrap_or(false);

        let source = if subscription_kind.eq_ignore_ascii_case("seat_addon") {
            "seat_addon"
        } else if seats_in_plan {
            "in_plan"
        } else {
            // Non-seat_addon subscription with headcount price but no explicit metadata.
            "in_plan"
        };

        let interval = stripe_subscription_interval(sub);
        let current_period_start = ts_to_rfc3339(sub.current_period_start);
        let current_period_end = ts_to_rfc3339(sub.current_period_end);

        items.push(AgencySeatBreakdownItem {
            source: source.to_string(),
            interval,
            seats: seat_qty,
            status: sub.status.to_string(),
            subscription_id: sub.id.to_string(),
            current_period_start,
            current_period_end,
        });
    }

    let mut total_active_seats = 0_i64;
    let mut annual_seats = 0_i64;
    let mut monthly_seats = 0_i64;
    for item in items.iter() {
        total_active_seats = total_active_seats.saturating_add(item.seats);
        if item.interval.eq_ignore_ascii_case("year") {
            annual_seats = annual_seats.saturating_add(item.seats);
        } else {
            monthly_seats = monthly_seats.saturating_add(item.seats);
        }
    }

    Ok(Json(AgencySeatBreakdownResponse {
        total_active_seats,
        annual_seats,
        monthly_seats,
        items,
    }))
}

fn studio_price_id_for_plan(
    state: &AppState,
    plan_type: Option<&str>,
    credits: i64,
) -> Option<String> {
    let p = plan_type.unwrap_or("").trim().to_lowercase();

    let plan_raw = if p == "lite" {
        state.stripe_studio_lite_price_ids.as_str()
    } else if p == "pro" {
        state.stripe_studio_pro_price_ids.as_str()
    } else {
        ""
    };

    credits_to_price_id(plan_raw, credits)
        .or_else(|| credits_to_price_id(state.stripe_studio_price_ids.as_str(), credits))
}

#[derive(Debug, Deserialize)]
pub struct StudioCheckoutRequest {
    #[serde(default)]
    pub plan_type: Option<String>,
    pub credits: i64,
}

#[derive(Debug, Serialize)]
pub struct StudioCheckoutResponse {
    pub url: String,
}

pub async fn create_checkout_session_legacy(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<StudioCheckoutRequest>,
) -> Result<Json<StudioCheckoutResponse>, (StatusCode, String)> {
    if state.stripe_secret_key.trim().is_empty() {
        return Err(billing_error(
            StatusCode::PRECONDITION_FAILED,
            "stripe_not_configured",
            "Stripe is not configured on the server.",
        ));
    }

    if state.stripe_studio_success_url.trim().is_empty()
        || state.stripe_studio_cancel_url.trim().is_empty()
    {
        return Err(billing_error(
            StatusCode::PRECONDITION_FAILED,
            "stripe_studio_checkout_urls_not_configured",
            "Stripe studio checkout URLs are not configured on the server.",
        ));
    }

    // Validate that URLs are absolute (must have http:// or https://) to avoid Stripe rejecting them
    let success_url = state.stripe_studio_success_url.trim().to_string();
    let cancel_url = state.stripe_studio_cancel_url.trim().to_string();
    if !success_url.starts_with("http://") && !success_url.starts_with("https://") {
        return Err(billing_error(
            StatusCode::PRECONDITION_FAILED,
            "stripe_studio_success_url_invalid",
            "Stripe studio success URL is not an absolute URL.",
        ));
    }
    if !cancel_url.starts_with("http://") && !cancel_url.starts_with("https://") {
        return Err(billing_error(
            StatusCode::PRECONDITION_FAILED,
            "stripe_studio_cancel_url_invalid",
            "Stripe studio cancel URL is not an absolute URL.",
        ));
    }

    if payload.credits <= 0 {
        return Err(billing_error(
            StatusCode::BAD_REQUEST,
            "invalid_credits",
            "Credits must be greater than 0.",
        ));
    }

    let stripe_price_id =
        studio_price_id_for_plan(&state, payload.plan_type.as_deref(), payload.credits)
            .unwrap_or_default();
    if stripe_price_id.trim().is_empty() {
        return Err(billing_error(
            StatusCode::PRECONDITION_FAILED,
            "stripe_studio_price_ids_not_configured",
            "Stripe studio price IDs are not configured on the server.",
        ));
    }

    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());

    // Studio credits are sold as one-time packs (CheckoutSessionMode::Payment).
    // A recurring price here will cause Stripe to reject the session creation.
    let price_id = stripe_sdk::PriceId::from_str(stripe_price_id.as_str()).map_err(|e| {
        billing_error_msg(
            StatusCode::BAD_REQUEST,
            "invalid_stripe_price_id",
            e.to_string(),
        )
    })?;
    let price = stripe_sdk::Price::retrieve(&client, &price_id, &[])
        .await
        .map_err(|e| billing_error_msg(StatusCode::BAD_GATEWAY, "stripe_error", e.to_string()))?;
    let is_recurring =
        price.recurring.is_some() || matches!(price.type_, Some(stripe_sdk::PriceType::Recurring));
    let (mode, sub_data) = if is_recurring {
        let mut sub_md = std::collections::HashMap::new();
        sub_md.insert("user_id".to_string(), user.id.clone());
        sub_md.insert("billing_domain".to_string(), "studio".to_string());
        sub_md.insert("credits".to_string(), payload.credits.to_string());
        if let Some(pt) = payload.plan_type.as_deref() {
            sub_md.insert("plan_type".to_string(), pt.trim().to_lowercase());
        }

        (
            stripe_sdk::CheckoutSessionMode::Subscription,
            Some(stripe_sdk::CreateCheckoutSessionSubscriptionData {
                metadata: Some(sub_md),
                ..Default::default()
            }),
        )
    } else {
        (stripe_sdk::CheckoutSessionMode::Payment, None)
    };

    let mut cs_params = stripe_sdk::CreateCheckoutSession::new();
    cs_params.success_url = Some(success_url.as_str());
    cs_params.cancel_url = Some(cancel_url.as_str());
    info!(
        user_id = %user.id,
        success_url = %success_url,
        cancel_url = %cancel_url,
        "Creating Stripe checkout session"
    );
    cs_params.mode = Some(mode);
    cs_params.subscription_data = sub_data;
    cs_params.client_reference_id = Some(user.id.as_str());
    cs_params.line_items = Some(vec![stripe_sdk::CreateCheckoutSessionLineItems {
        price: Some(stripe_price_id.clone()),
        quantity: Some(1),
        ..Default::default()
    }]);

    let mut md = std::collections::HashMap::new();
    md.insert("billing_domain".to_string(), "studio".to_string());
    md.insert("user_id".to_string(), user.id.clone());
    md.insert("credits".to_string(), payload.credits.to_string());
    if let Some(pt) = payload.plan_type.as_deref() {
        let pt = pt.trim().to_lowercase();
        if pt == "lite" || pt == "pro" {
            md.insert("plan_type".to_string(), pt);
        }
    }
    cs_params.metadata = Some(md);

    let session = stripe_sdk::CheckoutSession::create(&client, cs_params)
        .await
        .map_err(|e| billing_error_msg(StatusCode::BAD_GATEWAY, "stripe_error", e.to_string()))?;

    let url = session
        .url
        .as_ref()
        .map(|u| u.to_string())
        .unwrap_or_default();
    if url.is_empty() {
        warn!("stripe checkout session missing url");
        return Err(billing_error(
            StatusCode::BAD_GATEWAY,
            "stripe_checkout_missing_url",
            "Stripe checkout session was created without a redirect URL.",
        ));
    }

    info!(user_id = %user.id, credits = payload.credits, "created studio stripe checkout session");
    Ok(Json(StudioCheckoutResponse { url }))
}

#[derive(Debug, Default, Deserialize)]
pub struct AgencyCheckoutAddons {
    #[serde(default)]
    pub irl_booking: bool,
    #[serde(default)]
    pub seats_in_plan: bool,

    // Optional quantities (0/None means disabled)
    pub deepfake_protection_models: Option<u32>,
    pub additional_team_members: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct AgencyCheckoutRequest {
    pub plan: String, // "basic" | "pro" | "enterprise" (enterprise is contact-sales only)
    pub roster_models: u32,
    pub interval: Option<String>,
    #[serde(default)]
    pub start_trial: bool,
    #[serde(default)]
    pub agreement_accepted: bool,
    #[serde(default)]
    pub addons: AgencyCheckoutAddons,
}

#[derive(Debug, Deserialize)]
pub struct AgencySeatAddonRequest {
    pub seats: u32,
    pub plan: Option<String>,
    pub interval: Option<String>,
}

fn billing_error(status: StatusCode, code: &str, message: &str) -> (StatusCode, String) {
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

fn billing_error_msg(status: StatusCode, code: &str, message: String) -> (StatusCode, String) {
    billing_error(status, code, message.as_str())
}

fn map_postgrest_transport_error(e: impl std::fmt::Display) -> (StatusCode, String) {
    billing_error_msg(
        StatusCode::INTERNAL_SERVER_ERROR,
        "database_error",
        e.to_string(),
    )
}

fn normalize_interval(value: Option<&str>) -> Result<String, (StatusCode, String)> {
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

fn normalize_self_serve_plan(value: &str) -> Result<String, (StatusCode, String)> {
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

fn normalize_optional_self_serve_plan(
    value: Option<&str>,
) -> Result<Option<String>, (StatusCode, String)> {
    match value {
        None => Ok(None),
        Some(v) => Ok(Some(normalize_self_serve_plan(v)?)),
    }
}

#[derive(Debug, Serialize)]
pub struct AgencyCheckoutResponse {
    pub checkout_url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub seats_limit: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub invoice_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub invoice_status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub invoice_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AgencyCheckoutSessionSyncRequest {
    #[serde(default)]
    pub session_id: String,
}

#[derive(Debug, Serialize)]
pub struct AgencyCheckoutSessionSyncResponse {
    pub plan_tier: String,
    pub seats_limit: i64,
    pub addon_irl_booking_enabled: bool,
}

#[derive(Debug, Serialize)]
pub struct AgencyPlanChangeResponse {
    pub plan_tier: String,
    pub seats_limit: i64,
    pub addon_irl_booking_enabled: bool,
}

#[derive(Debug, Serialize)]
pub struct AgencySeatAddonChangeResponse {
    pub seats_limit: i64,
}

#[derive(Debug, Serialize)]
pub struct AgencySeatBreakdownItem {
    pub source: String,   // "in_plan" | "seat_addon"
    pub interval: String, // "month" | "year"
    pub seats: i64,
    pub status: String,
    pub subscription_id: String,
    pub current_period_start: Option<String>,
    pub current_period_end: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AgencySeatBreakdownResponse {
    pub total_active_seats: i64,
    pub annual_seats: i64,
    pub monthly_seats: i64,
    pub items: Vec<AgencySeatBreakdownItem>,
}

#[derive(Debug, Serialize)]
pub struct AgencyTrialStartResponse {
    pub trial_active: bool,
    pub trial_ends_at: Option<String>,
    pub display_plan_label: String,
}

#[derive(Debug, Deserialize)]
pub struct CreatorCheckoutRequest {
    pub plan: String,
    #[serde(default)]
    pub interval: Option<String>,
    #[serde(default)]
    pub start_trial: bool,
    #[serde(default)]
    pub agreement_accepted: bool,
}

#[derive(Debug, Deserialize)]
pub struct CreatorUpgradeRequest {
    pub plan: String,
    #[serde(default)]
    pub interval: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CreatorBillingStatusResponse {
    pub creator_id: String,
    pub plan_tier: String,
    pub entitlement_tier: String,
    pub plan_interval: String,
    pub subscription_status: String,
    pub stripe_customer_id: Option<String>,
    pub stripe_subscription_id: Option<String>,
    pub plan_updated_at: Option<String>,
    pub stripe_current_period_end: Option<String>,
    pub stripe_cancel_at_period_end: bool,
    pub trial_active: bool,
    pub trial_ends_at: Option<String>,
    pub trial_start_at: Option<String>,
    pub trial_basic_start_at: Option<String>,
    pub trial_pro_start_at: Option<String>,
    pub can_use_kyc: bool,
    pub can_use_likeness: bool,
    pub can_use_agency_connection: bool,
    pub can_use_brand_connection: bool,
    pub can_use_payouts: bool,
    pub can_use_cameo_uploads: bool,
    pub can_use_unauthorized_monitoring: bool,
    pub can_use_voice_profiles: bool,
    pub voice_tone_limit: usize,
    pub category_limit: Option<usize>,
    pub can_use_advanced_analytics: bool,
    pub can_use_jobs: bool,
    pub can_use_rules: bool,
    pub can_use_talent_portal: bool,
    pub can_use_campaign_archive: bool,
    pub can_use_active_campaigns: bool,
}

#[derive(Debug, Serialize)]
pub struct CreatorCheckoutResponse {
    pub checkout_url: String,
}

const AGENCY_MIN_SELF_SERVE_ROSTER_MODELS: u32 = 2;
const AGENCY_MAX_SELF_SERVE_ROSTER_MODELS: u32 = 1000;

fn agency_plan_price_ids<'a>(
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
                    state.stripe_agency_basic_base_annual_price_id.as_str(),
                    state.stripe_agency_basic_headcount_annual_price_id.as_str(),
                    "STRIPE_AGENCY_BASIC_BASE_ANNUAL_PRICE_ID",
                    "STRIPE_AGENCY_BASIC_HEADCOUNT_ANNUAL_PRICE_ID",
                ))
            } else {
                Some((
                    "Agency Basic",
                    state.stripe_agency_basic_base_price_id.as_str(),
                    state.stripe_agency_basic_headcount_price_id.as_str(),
                    "STRIPE_AGENCY_BASIC_BASE_PRICE_ID",
                    "STRIPE_AGENCY_BASIC_HEADCOUNT_PRICE_ID",
                ))
            }
        }
        "pro" => {
            if is_annual {
                Some((
                    "Agency Pro (Annual)",
                    state.stripe_agency_pro_base_annual_price_id.as_str(),
                    state.stripe_agency_pro_headcount_annual_price_id.as_str(),
                    "STRIPE_AGENCY_PRO_BASE_ANNUAL_PRICE_ID",
                    "STRIPE_AGENCY_PRO_HEADCOUNT_ANNUAL_PRICE_ID",
                ))
            } else {
                Some((
                    "Agency Pro",
                    state.stripe_agency_pro_base_price_id.as_str(),
                    state.stripe_agency_pro_headcount_price_id.as_str(),
                    "STRIPE_AGENCY_PRO_BASE_PRICE_ID",
                    "STRIPE_AGENCY_PRO_HEADCOUNT_PRICE_ID",
                ))
            }
        }
        _ => None,
    }
}

fn agency_seat_price_id<'a>(
    state: &'a AppState,
    plan: &str,
    interval: Option<&str>,
) -> Option<(&'a str, &'static str)> {
    let (_, _, headcount_price_id, _, headcount_env_var) =
        agency_plan_price_ids(state, plan, interval)?;
    Some((headcount_price_id, headcount_env_var))
}

fn recurring_price_line_item(
    price_id: &str,
    quantity: u32,
) -> stripe_sdk::CreateCheckoutSessionLineItems {
    stripe_sdk::CreateCheckoutSessionLineItems {
        price: Some(price_id.to_string()),
        quantity: Some(u64::from(quantity)),
        ..Default::default()
    }
}

fn normalize_brand_billing_cycle(value: Option<&str>) -> &'static str {
    match value.unwrap_or("monthly").trim().to_lowercase().as_str() {
        "annual" => "annual",
        _ => "monthly",
    }
}

fn brand_plan_to_price_id_for_billing_cycle(
    state: &AppState,
    plan: &str,
    billing_cycle: &str,
) -> Option<String> {
    match (
        plan.trim().to_lowercase().as_str(),
        normalize_brand_billing_cycle(Some(billing_cycle)),
    ) {
        ("basic", "annual") => Some(state.stripe_brand_basic_annual_price_id.clone()),
        ("basic", _) => Some(state.stripe_brand_basic_price_id.clone()),
        ("pro", "annual") => Some(state.stripe_brand_pro_annual_price_id.clone()),
        ("pro", _) => Some(state.stripe_brand_pro_price_id.clone()),
        _ => None,
    }
}

fn creator_plan_to_price_id(state: &AppState, plan: &str) -> Option<String> {
    match plan.trim().to_lowercase().as_str() {
        "basic" => Some(state.stripe_creator_basic_price_id.clone()),
        "pro" => Some(state.stripe_creator_pro_price_id.clone()),
        _ => None,
    }
}

fn brand_plan_to_price_env_var_for_billing_cycle(
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

fn creator_plan_to_price_env_var(plan: &str) -> Option<&'static str> {
    match plan.trim().to_lowercase().as_str() {
        "basic" => Some("STRIPE_CREATOR_BASIC_PRICE_ID"),
        "pro" => Some("STRIPE_CREATOR_PRO_PRICE_ID"),
        _ => None,
    }
}

fn sanitize_next_path(next_path: Option<&str>) -> Option<String> {
    let candidate = next_path?.trim();
    if candidate.is_empty() || !candidate.starts_with('/') || candidate.starts_with("//") {
        return None;
    }
    Some(candidate.to_string())
}

fn brand_billing_frontend_url(
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

fn agency_studio_frontend_url(state: &AppState) -> Result<String, (StatusCode, String)> {
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

async fn get_brand_checkout_row(
    state: &AppState,
    brand_id: &str,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let brand_resp = state
        .pg
        .from("brands")
        .select(
            "id,email,company_name,stripe_customer_id,stripe_subscription_id,plan_tier,subscription_status,studio_addon_active",
        )
        .eq("id", brand_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = brand_resp.status();
    let text = brand_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        return Err((StatusCode::INTERNAL_SERVER_ERROR, text));
    }

    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    rows.first()
        .cloned()
        .ok_or((StatusCode::NOT_FOUND, "brand_profile_not_found".to_string()))
}

async fn ensure_brand_customer(
    state: &AppState,
    brand_id: &str,
    email: &str,
    company_name: &str,
    existing_customer: &str,
) -> Result<String, (StatusCode, String)> {
    if !existing_customer.trim().is_empty() {
        return Ok(existing_customer.to_string());
    }

    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
    let mut params = stripe_sdk::CreateCustomer::new();
    if !email.trim().is_empty() {
        params.email = Some(email);
    }
    params.name = Some(company_name);
    params.metadata = Some(std::collections::HashMap::from([(
        "brand_id".to_string(),
        brand_id.to_string(),
    )]));

    let customer = stripe_sdk::Customer::create(&client, params)
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    let customer_id = customer.id.to_string();
    let cust_update_resp = state
        .pg
        .from("brands")
        .eq("id", brand_id)
        .update(json!({ "stripe_customer_id": customer_id }).to_string())
        .execute()
        .await;

    match cust_update_resp {
        Ok(resp) if !resp.status().is_success() => {
            let body = resp.text().await.unwrap_or_default();
            warn!(brand_id = %brand_id, status = %body, "failed to persist stripe_customer_id to brands table");
        }
        Err(e) => {
            warn!(brand_id = %brand_id, error = %e, "transport error persisting stripe_customer_id to brands table");
        }
        _ => {}
    }

    Ok(customer.id.to_string())
}

fn creator_plan_to_price_id_with_interval(
    state: &AppState,
    plan: &str,
    interval: &str,
) -> Option<String> {
    let plan = plan.trim().to_lowercase();
    let interval = interval.trim().to_lowercase();
    match (plan.as_str(), interval.as_str()) {
        ("basic", "year") => Some(state.stripe_creator_basic_annual_price_id.clone()),
        ("pro", "year") => Some(state.stripe_creator_pro_annual_price_id.clone()),
        ("basic", "month") => Some(state.stripe_creator_basic_price_id.clone()),
        ("pro", "month") => Some(state.stripe_creator_pro_price_id.clone()),
        _ => None,
    }
}

fn creator_plan_to_price_env_var_with_interval(plan: &str, interval: &str) -> Option<&'static str> {
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
fn agency_base_price_id_matches(state: &AppState, price_id: &str) -> bool {
    let price_id = price_id.trim();
    !price_id.is_empty()
        && [
            state.stripe_agency_basic_base_price_id.as_str(),
            state.stripe_agency_basic_base_annual_price_id.as_str(),
            state.stripe_agency_pro_base_price_id.as_str(),
            state.stripe_agency_pro_base_annual_price_id.as_str(),
            state.stripe_agency_price_id.as_str(),
            state.stripe_scale_price_id.as_str(),
        ]
        .into_iter()
        .filter(|candidate| !candidate.trim().is_empty())
        .any(|candidate| candidate == price_id)
}

pub(crate) fn agency_headcount_price_id_matches(state: &AppState, price_id: &str) -> bool {
    let price_id = price_id.trim();
    !price_id.is_empty()
        && [
            state.stripe_agency_basic_headcount_price_id.as_str(),
            state.stripe_agency_basic_headcount_annual_price_id.as_str(),
            state.stripe_agency_pro_headcount_price_id.as_str(),
            state.stripe_agency_pro_headcount_annual_price_id.as_str(),
        ]
        .into_iter()
        .filter(|candidate| !candidate.trim().is_empty())
        .any(|candidate| candidate == price_id)
}

fn agency_irl_booking_price_id_matches(state: &AppState, price_id: &str) -> bool {
    let price_id = price_id.trim();
    !price_id.is_empty()
        && [
            state.stripe_agency_irl_booking_price_id.as_str(),
            state.stripe_agency_irl_booking_annual_price_id.as_str(),
        ]
        .into_iter()
        .filter(|candidate| !candidate.trim().is_empty())
        .any(|candidate| candidate == price_id)
}

fn agency_checkout_success_url(url: &str) -> String {
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

fn agency_plan_tier_rank(value: &str) -> i32 {
    match value.trim().to_lowercase().as_str() {
        "enterprise" => 3,
        "pro" => 2,
        "basic" => 1,
        _ => 0,
    }
}

fn parse_checkout_metadata_flag(value: Option<&String>) -> bool {
    value
        .map(|raw| raw.trim().to_lowercase())
        .map(|raw| matches!(raw.as_str(), "1" | "true" | "yes" | "on"))
        .unwrap_or(false)
}

async fn fetch_agency_checkout_sync_state(
    state: &AppState,
    agency_id: &str,
) -> Result<AgencyCheckoutSessionSyncResponse, (StatusCode, String)> {
    let agency_resp = state
        .pg
        .from("agencies")
        .select("plan_tier,seats_limit,addon_irl_booking_enabled")
        .eq("id", agency_id)
        .limit(1)
        .execute()
        .await
        .map_err(map_postgrest_transport_error)?;
    let agency_status = agency_resp.status();
    let agency_text = agency_resp
        .text()
        .await
        .map_err(map_postgrest_transport_error)?;
    if !agency_status.is_success() {
        return Err(crate::errors::sanitize_db_error(
            agency_status.as_u16(),
            agency_text,
        ));
    }
    let rows: Vec<serde_json::Value> = serde_json::from_str(&agency_text).unwrap_or_default();
    let row = rows.first().cloned().unwrap_or_else(|| json!({}));

    Ok(AgencyCheckoutSessionSyncResponse {
        plan_tier: row
            .get("plan_tier")
            .and_then(|v| v.as_str())
            .unwrap_or("free")
            .to_string(),
        seats_limit: row.get("seats_limit").and_then(|v| v.as_i64()).unwrap_or(1),
        addon_irl_booking_enabled: row
            .get("addon_irl_booking_enabled")
            .and_then(|v| v.as_bool())
            .unwrap_or(false),
    })
}

async fn agency_roster_count(
    state: &AppState,
    agency_id: &str,
) -> Result<u32, (StatusCode, String)> {
    fn is_missing_postgrest_table(status: StatusCode, body: &str) -> bool {
        if status != StatusCode::NOT_FOUND {
            return false;
        }
        let Ok(v) = serde_json::from_str::<serde_json::Value>(body) else {
            return false;
        };
        let code = v.get("code").and_then(|c| c.as_str()).unwrap_or("");
        if code == "PGRST205" {
            return true;
        }
        let msg = v.get("message").and_then(|m| m.as_str()).unwrap_or("");
        msg.contains("Could not find the table")
    }

    let rel_resp = state
        .pg
        .from("agency_roster")
        .select("id")
        .eq("agency_id", agency_id)
        .eq("status", "active")
        .execute()
        .await
        .map_err(map_postgrest_transport_error)?;
    let rel_status = rel_resp.status();
    let rel_text = rel_resp
        .text()
        .await
        .map_err(map_postgrest_transport_error)?;
    if !rel_status.is_success() {
        if is_missing_postgrest_table(rel_status, &rel_text) {
            return legacy_agency_roster_count(state, agency_id).await;
        }
        return Err(crate::errors::sanitize_db_error(
            rel_status.as_u16(),
            rel_text,
        ));
    }
    let rel_rows: Vec<serde_json::Value> = serde_json::from_str(&rel_text).unwrap_or_default();
    if !rel_rows.is_empty() {
        return Ok(rel_rows.len() as u32);
    }

    legacy_agency_roster_count(state, agency_id).await
}

async fn legacy_agency_roster_count(
    state: &AppState,
    agency_id: &str,
) -> Result<u32, (StatusCode, String)> {
    let legacy_resp = state
        .pg
        .from("agency_users")
        .select("id")
        .eq("agency_id", agency_id)
        .eq("role", "talent")
        .execute()
        .await
        .map_err(map_postgrest_transport_error)?;
    let legacy_status = legacy_resp.status();
    let legacy_text = legacy_resp
        .text()
        .await
        .map_err(map_postgrest_transport_error)?;
    if !legacy_status.is_success() {
        return Err(crate::errors::sanitize_db_error(
            legacy_status.as_u16(),
            legacy_text,
        ));
    }
    let legacy_rows: Vec<serde_json::Value> =
        serde_json::from_str(&legacy_text).unwrap_or_default();
    Ok(legacy_rows.len() as u32)
}

async fn list_customer_subscriptions_for_billing(
    state: &AppState,
    customer_id: &str,
) -> Result<Vec<stripe_sdk::Subscription>, (StatusCode, String)> {
    let parsed_customer_id = customer_id.parse::<stripe_sdk::CustomerId>().map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "invalid_stripe_customer_id".to_string(),
        )
    })?;

    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
    let params = stripe_sdk::ListSubscriptions {
        customer: Some(parsed_customer_id),
        status: Some(stripe_sdk::SubscriptionStatusFilter::All),
        ..Default::default()
    };

    stripe_sdk::Subscription::list(&client, &params)
        .await
        .map(|list| list.data)
        .map_err(|e| billing_error_msg(StatusCode::BAD_GATEWAY, "stripe_error", e.to_string()))
}

#[allow(dead_code)]
fn find_active_seat_addon_subscription<'a>(
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
        if !belongs_to_agency || !crate::payouts::stripe_subscription_is_active(sub) {
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

struct AgencyBillingContext {
    agency_name: String,
    customer_id: String,
    addon_irl_booking_enabled: bool,
    studio_addon_active: bool,
}

async fn get_or_create_agency_billing_context(
    state: &AppState,
    agency_id: &str,
) -> Result<AgencyBillingContext, (StatusCode, String)> {
    let agency_resp = state
        .pg
        .from("agencies")
        .select(
            "id,email,agency_name,stripe_customer_id,addon_irl_booking_enabled,studio_addon_active",
        )
        .eq("id", agency_id)
        .limit(1)
        .execute()
        .await
        .map_err(map_postgrest_transport_error)?;

    let status = agency_resp.status();
    let text = agency_resp
        .text()
        .await
        .map_err(map_postgrest_transport_error)?;
    if !status.is_success() {
        return Err(crate::errors::sanitize_db_error(status.as_u16(), text));
    }
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    if rows.is_empty() {
        return Err(billing_error(
            StatusCode::NOT_FOUND,
            "agency_profile_not_found",
            "Agency profile not found.",
        ));
    }

    let row = rows[0].clone();
    let email = row
        .get("email")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let agency_name = row
        .get("agency_name")
        .and_then(|v| v.as_str())
        .unwrap_or("Agency")
        .to_string();
    let existing_customer = row
        .get("stripe_customer_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let addon_irl_booking_enabled = row
        .get("addon_irl_booking_enabled")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let studio_addon_active = row
        .get("studio_addon_active")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
    let customer_id = if !existing_customer.trim().is_empty() {
        existing_customer
    } else {
        let mut params = stripe_sdk::CreateCustomer::new();
        if !email.trim().is_empty() {
            params.email = Some(email.as_str());
        }
        params.name = Some(agency_name.as_str());
        params.metadata = Some(std::collections::HashMap::from([(
            "agency_id".to_string(),
            agency_id.to_string(),
        )]));

        let cust = stripe_sdk::Customer::create(&client, params)
            .await
            .map_err(|e| {
                billing_error_msg(StatusCode::BAD_GATEWAY, "stripe_error", e.to_string())
            })?;

        let cust_id = cust.id.to_string();

        let cust_update_resp = state
            .pg
            .from("agencies")
            .eq("id", agency_id)
            .update(json!({"stripe_customer_id": cust_id}).to_string())
            .execute()
            .await;

        match cust_update_resp {
            Ok(resp) if !resp.status().is_success() => {
                let body = resp.text().await.unwrap_or_default();
                warn!(agency_id = %agency_id, status = %body, "failed to persist stripe_customer_id to agencies table");
            }
            Err(e) => {
                warn!(agency_id = %agency_id, error = %e, "transport error persisting stripe_customer_id to agencies table");
            }
            _ => {}
        }

        cust.id.to_string()
    };

    Ok(AgencyBillingContext {
        agency_name,
        customer_id,
        addon_irl_booking_enabled,
        studio_addon_active,
    })
}

pub async fn create_agency_subscription_checkout(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<AgencyCheckoutRequest>,
) -> Result<Json<AgencyCheckoutResponse>, (StatusCode, String)> {
    let agency_access =
        team::require_agency_permission(&state, &user, Permission::ManageBilling).await?;
    let agency_id = agency_access.organization_id.clone();

    if state.stripe_secret_key.trim().is_empty() {
        return Err(billing_error(
            StatusCode::PRECONDITION_FAILED,
            "stripe_not_configured",
            "Stripe is not configured on the server.",
        ));
    }

    if payload.roster_models < AGENCY_MIN_SELF_SERVE_ROSTER_MODELS {
        return Err(billing_error(
            StatusCode::BAD_REQUEST,
            "invalid_roster_models",
            "Roster models must be at least 1.",
        ));
    }

    let normalized_plan = normalize_self_serve_plan(payload.plan.as_str())?;
    let interval = normalize_interval(payload.interval.as_deref())?;

    // Prevent Basic annual -> Basic monthly downgrade via direct checkout creation.
    // (Plan changes should be upgrades only; downgrades require support intervention.)
    {
        let agency_resp = state
            .pg
            .from("agencies")
            .select("plan_tier,plan_interval")
            .eq("id", &user.id)
            .limit(1)
            .execute()
            .await
            .map_err(map_postgrest_transport_error)?;
        let agency_status = agency_resp.status();
        let agency_text = agency_resp
            .text()
            .await
            .map_err(map_postgrest_transport_error)?;
        if !agency_status.is_success() {
            return Err(crate::errors::sanitize_db_error(
                agency_status.as_u16(),
                agency_text,
            ));
        }
        let rows: Vec<serde_json::Value> = serde_json::from_str(&agency_text).unwrap_or_default();
        let row = rows.first().cloned().unwrap_or_else(|| json!({}));
        let current_plan_tier = row
            .get("plan_tier")
            .and_then(|value| value.as_str())
            .unwrap_or("free")
            .trim()
            .to_lowercase();
        let current_plan_interval = row
            .get("plan_interval")
            .and_then(|value| value.as_str())
            .unwrap_or("month")
            .trim()
            .to_lowercase();

        if normalized_plan == "basic"
            && current_plan_tier == "basic"
            && current_plan_interval == "year"
            && interval == "month"
        {
            return Err(billing_error(
                StatusCode::BAD_REQUEST,
                "downgrade_not_allowed",
                "Downgrades are not allowed from this endpoint.",
            ));
        }
    }

    let (_plan_name, base_plan_price_id, headcount_price_id, base_plan_env_var, headcount_env_var) =
        agency_plan_price_ids(&state, &normalized_plan, Some(interval.as_str())).ok_or_else(
            || billing_error(StatusCode::BAD_REQUEST, "invalid_plan", "Invalid plan."),
        )?;
    if base_plan_price_id.trim().is_empty() {
        return Err(billing_error(
            StatusCode::PRECONDITION_FAILED,
            "stripe_price_not_configured",
            format!("Missing Stripe price configuration: {base_plan_env_var}").as_str(),
        ));
    }
    if payload.addons.seats_in_plan && headcount_price_id.trim().is_empty() {
        return Err(billing_error(
            StatusCode::PRECONDITION_FAILED,
            "stripe_price_not_configured",
            format!("Missing Stripe price configuration: {headcount_env_var}").as_str(),
        ));
    }
    let roster_count = agency_roster_count(&state, &agency_id).await?;
    if roster_count > AGENCY_MAX_SELF_SERVE_ROSTER_MODELS {
        return Err(billing_error(
            StatusCode::BAD_REQUEST,
            "enterprise_contact_sales_roster_limit",
            "Roster size exceeds self-serve limits. Please contact sales for enterprise.",
        ));
    }
    if payload.roster_models > AGENCY_MAX_SELF_SERVE_ROSTER_MODELS {
        return Err(billing_error(
            StatusCode::BAD_REQUEST,
            "enterprise_contact_sales_roster_limit",
            "Roster size exceeds self-serve limits. Please contact sales for enterprise.",
        ));
    }
    if payload.roster_models < roster_count {
        return Err(billing_error(
            StatusCode::BAD_REQUEST,
            "roster_models_below_current_roster",
            format!("Roster models cannot be below current roster size ({roster_count}).").as_str(),
        ));
    }

    if state.stripe_checkout_success_url.trim().is_empty()
        || state.stripe_checkout_cancel_url.trim().is_empty()
    {
        return Err(billing_error(
            StatusCode::PRECONDITION_FAILED,
            "stripe_checkout_urls_not_configured",
            "Stripe checkout URLs are not configured on the server.",
        ));
    }

    let billing_ctx = get_or_create_agency_billing_context(&state, &agency_id).await?;
    let access = crate::entitlements::get_agency_access_state(&state, &agency_id).await?;
    let is_annual = interval.eq_ignore_ascii_case("year");
    let (irl_booking_price_id, irl_booking_env_var) = if is_annual {
        (
            state.stripe_agency_irl_booking_annual_price_id.as_str(),
            "STRIPE_AGENCY_IRL_BOOKING_ANNUAL_PRICE_ID",
        )
    } else {
        (
            state.stripe_agency_irl_booking_price_id.as_str(),
            "STRIPE_AGENCY_IRL_BOOKING_PRICE_ID",
        )
    };

    let include_irl_booking = payload.addons.irl_booking && !billing_ctx.addon_irl_booking_enabled;
    if include_irl_booking && irl_booking_price_id.trim().is_empty() {
        return Err(billing_error(
            StatusCode::PRECONDITION_FAILED,
            "stripe_price_not_configured",
            format!("Missing Stripe price configuration: {irl_booking_env_var}").as_str(),
        ));
    }

    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());

    // Create a subscription checkout session.
    let mut cs_params = stripe_sdk::CreateCheckoutSession::new();
    let success_url = agency_checkout_success_url(state.stripe_checkout_success_url.as_str());
    cs_params.success_url = Some(success_url.as_str());
    cs_params.cancel_url = Some(state.stripe_checkout_cancel_url.as_str());
    cs_params.mode = Some(stripe_sdk::CheckoutSessionMode::Subscription);
    cs_params.customer = Some(billing_ctx.customer_id.parse().map_err(|_| {
        billing_error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "invalid_stripe_customer_id",
            "Server has an invalid Stripe customer ID configured for this agency.",
        )
    })?);

    let current_state = fetch_agency_checkout_sync_state(&state, &agency_id).await?;
    let current_paid_seats = current_state.seats_limit.max(0);

    let mut seat_charge_mode = "total".to_string();
    let mut roster_models_delta: u32 = payload.roster_models;
    if payload.addons.seats_in_plan {
        let requested_total_seats_i64 = i64::from(payload.roster_models);
        if requested_total_seats_i64 < current_paid_seats {
            return Err(billing_error(
                StatusCode::BAD_REQUEST,
                "roster_models_below_current_seats",
                format!("Roster models cannot be below current paid seats ({current_paid_seats}).")
                    .as_str(),
            ));
        }

        let delta_i64 = requested_total_seats_i64.saturating_sub(current_paid_seats);
        roster_models_delta = u32::try_from(delta_i64).unwrap_or(0);
        seat_charge_mode = "delta".to_string();
    }

    let mut line_items: Vec<stripe_sdk::CreateCheckoutSessionLineItems> =
        vec![recurring_price_line_item(base_plan_price_id, 1)];
    if payload.addons.seats_in_plan && roster_models_delta > 0 {
        line_items.push(recurring_price_line_item(
            headcount_price_id,
            roster_models_delta,
        ));
    }
    if include_irl_booking {
        line_items.push(recurring_price_line_item(irl_booking_price_id, 1));
    }

    cs_params.line_items = Some(line_items);

    cs_params.client_reference_id = Some(agency_id.as_str());

    // Also add metadata for redundancy.
    let mut md = std::collections::HashMap::new();
    md.insert("agency_id".to_string(), agency_id.clone());
    md.insert("billing_domain".to_string(), "agency".to_string());
    md.insert("plan".to_string(), normalized_plan.clone());
    md.insert(
        "billing_interval".to_string(),
        if is_annual { "year" } else { "month" }.to_string(),
    );
    md.insert(
        "seats_in_plan".to_string(),
        if payload.addons.seats_in_plan {
            "1".to_string()
        } else {
            "0".to_string()
        },
    );
    md.insert(
        "roster_models".to_string(),
        payload.roster_models.to_string(),
    );
    md.insert("seat_charge_mode".to_string(), seat_charge_mode.clone());
    md.insert(
        "roster_models_total".to_string(),
        payload.roster_models.to_string(),
    );
    md.insert(
        "roster_models_delta".to_string(),
        roster_models_delta.to_string(),
    );
    md.insert(
        "addon_irl_booking".to_string(),
        if include_irl_booking {
            "1".to_string()
        } else {
            "0".to_string()
        },
    );
    if payload.start_trial {
        if access.has_paid_access() {
            return Err(billing_error(
                StatusCode::BAD_REQUEST,
                "trial_only_available_for_free_accounts",
                "Trial is only available for free agencies.",
            ));
        }
        if !payload.agreement_accepted {
            return Err(billing_error(
                StatusCode::BAD_REQUEST,
                "trial_agreement_required",
                "You must accept the trial agreement before starting a trial.",
            ));
        }
        md.insert("trial_started_from_checkout".to_string(), "1".to_string());
        md.insert(
            "trial_agreement_accepted_at".to_string(),
            chrono::Utc::now().to_rfc3339(),
        );
    }
    cs_params.metadata = Some(md);

    // Propagate agency_id onto the Subscription itself so subscription.* webhooks can be correlated.
    // (Stripe does not automatically copy Checkout Session metadata to the Subscription.)
    let mut sub_md = std::collections::HashMap::new();
    sub_md.insert("agency_id".to_string(), agency_id.clone());
    sub_md.insert("billing_domain".to_string(), "agency".to_string());
    sub_md.insert("plan".to_string(), normalized_plan.clone());
    sub_md.insert(
        "billing_interval".to_string(),
        if is_annual { "year" } else { "month" }.to_string(),
    );
    sub_md.insert(
        "seats_in_plan".to_string(),
        if payload.addons.seats_in_plan {
            "1".to_string()
        } else {
            "0".to_string()
        },
    );
    sub_md.insert(
        "roster_models".to_string(),
        payload.roster_models.to_string(),
    );
    sub_md.insert("seat_charge_mode".to_string(), seat_charge_mode);
    sub_md.insert(
        "roster_models_total".to_string(),
        payload.roster_models.to_string(),
    );
    sub_md.insert(
        "roster_models_delta".to_string(),
        roster_models_delta.to_string(),
    );
    sub_md.insert(
        "addon_irl_booking".to_string(),
        if include_irl_booking {
            "1".to_string()
        } else {
            "0".to_string()
        },
    );
    if payload.start_trial {
        sub_md.insert("trial_started_from_checkout".to_string(), "1".to_string());
        sub_md.insert(
            "trial_agreement_accepted_at".to_string(),
            chrono::Utc::now().to_rfc3339(),
        );
    }
    let deepfake_models = payload.addons.deepfake_protection_models.unwrap_or(0);
    let team_members = payload.addons.additional_team_members.unwrap_or(0);
    // Preserve upcoming add-on quantities for telemetry/debugging while those products remain non-billable.
    if deepfake_models > 0 {
        sub_md.insert(
            "addon_deepfake_models".to_string(),
            deepfake_models.to_string(),
        );
    }
    if team_members > 0 {
        sub_md.insert("addon_team_members".to_string(), team_members.to_string());
    }
    cs_params.subscription_data = Some(stripe_sdk::CreateCheckoutSessionSubscriptionData {
        trial_period_days: if payload.start_trial { Some(30) } else { None },
        metadata: Some(sub_md),
        ..Default::default()
    });

    let session = stripe_sdk::CheckoutSession::create(&client, cs_params)
        .await
        .map_err(|e| billing_error_msg(StatusCode::BAD_GATEWAY, "stripe_error", e.to_string()))?;

    let url = session
        .url
        .as_ref()
        .map(|u| u.to_string())
        .unwrap_or_default();
    if url.is_empty() {
        warn!("stripe checkout session missing url");
        return Err(billing_error(
            StatusCode::BAD_GATEWAY,
            "stripe_checkout_missing_url",
            "Stripe checkout session was created without a redirect URL.",
        ));
    }

    info!(agency_id = %agency_id, plan = %normalized_plan, roster_models = payload.roster_models, "created stripe subscription checkout session");
    Ok(Json(AgencyCheckoutResponse {
        checkout_url: url,
        seats_limit: None,
        invoice_id: None,
        invoice_status: None,
        invoice_url: None,
    }))
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

pub async fn change_agency_subscription_plan(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<AgencyCheckoutRequest>,
) -> Result<Json<AgencyPlanChangeResponse>, (StatusCode, String)> {
    let agency_access =
        team::require_agency_permission(&state, &user, Permission::ManageBilling).await?;
    let agency_id = agency_access.organization_id.clone();

    if state.stripe_secret_key.trim().is_empty() {
        return Err(billing_error(
            StatusCode::PRECONDITION_FAILED,
            "stripe_not_configured",
            "Stripe is not configured on the server.",
        ));
    }

    if payload.roster_models < AGENCY_MIN_SELF_SERVE_ROSTER_MODELS {
        return Err(billing_error(
            StatusCode::BAD_REQUEST,
            "invalid_roster_models",
            "Roster models must be at least 1.",
        ));
    }

    let normalized_plan = normalize_self_serve_plan(payload.plan.as_str())?;
    let interval = normalize_interval(payload.interval.as_deref())?;

    let (_plan_name, base_plan_price_id, headcount_price_id, base_plan_env_var, headcount_env_var) =
        agency_plan_price_ids(&state, &normalized_plan, Some(interval.as_str())).ok_or_else(
            || billing_error(StatusCode::BAD_REQUEST, "invalid_plan", "Invalid plan."),
        )?;
    if base_plan_price_id.trim().is_empty() {
        return Err(billing_error(
            StatusCode::PRECONDITION_FAILED,
            "stripe_price_not_configured",
            format!("Missing Stripe price configuration: {base_plan_env_var}").as_str(),
        ));
    }
    if payload.addons.seats_in_plan && headcount_price_id.trim().is_empty() {
        return Err(billing_error(
            StatusCode::PRECONDITION_FAILED,
            "stripe_price_not_configured",
            format!("Missing Stripe price configuration: {headcount_env_var}").as_str(),
        ));
    }

    let roster_count = agency_roster_count(&state, &agency_id).await?;
    if roster_count > AGENCY_MAX_SELF_SERVE_ROSTER_MODELS {
        return Err(billing_error(
            StatusCode::BAD_REQUEST,
            "enterprise_contact_sales_roster_limit",
            "Roster size exceeds self-serve limits. Please contact sales for enterprise.",
        ));
    }
    if payload.roster_models > AGENCY_MAX_SELF_SERVE_ROSTER_MODELS {
        return Err(billing_error(
            StatusCode::BAD_REQUEST,
            "enterprise_contact_sales_roster_limit",
            "Roster size exceeds self-serve limits. Please contact sales for enterprise.",
        ));
    }
    if payload.roster_models < roster_count {
        return Err(billing_error(
            StatusCode::BAD_REQUEST,
            "roster_models_below_current_roster",
            format!("Roster models cannot be below current roster size ({roster_count}).").as_str(),
        ));
    }

    let billing_ctx = get_or_create_agency_billing_context(&state, &agency_id).await?;
    let is_annual = interval.eq_ignore_ascii_case("year");
    let (irl_booking_price_id, irl_booking_env_var) = if is_annual {
        (
            state.stripe_agency_irl_booking_annual_price_id.as_str(),
            "STRIPE_AGENCY_IRL_BOOKING_ANNUAL_PRICE_ID",
        )
    } else {
        (
            state.stripe_agency_irl_booking_price_id.as_str(),
            "STRIPE_AGENCY_IRL_BOOKING_PRICE_ID",
        )
    };

    let (subscription_id, current_plan_tier, current_plan_interval) = {
        let agency_resp = state
            .pg
            .from("agencies")
            .select("stripe_subscription_id,stripe_customer_id,plan_tier,plan_interval")
            .eq("id", &agency_id)
            .limit(1)
            .execute()
            .await
            .map_err(map_postgrest_transport_error)?;
        let agency_status = agency_resp.status();
        let agency_text = agency_resp
            .text()
            .await
            .map_err(map_postgrest_transport_error)?;
        if !agency_status.is_success() {
            return Err(crate::errors::sanitize_db_error(
                agency_status.as_u16(),
                agency_text,
            ));
        }
        let rows: Vec<serde_json::Value> = serde_json::from_str(&agency_text).unwrap_or_default();
        let row = rows.first().cloned().unwrap_or_else(|| json!({}));
        (
            row.get("stripe_subscription_id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string(),
            row.get("plan_tier")
                .and_then(|v| v.as_str())
                .unwrap_or("free")
                .trim()
                .to_lowercase(),
            row.get("plan_interval")
                .and_then(|v| v.as_str())
                .unwrap_or("month")
                .trim()
                .to_lowercase(),
        )
    };

    if subscription_id.is_empty() {
        return Err(billing_error(
            StatusCode::BAD_REQUEST,
            "no_active_subscription_to_change",
            "No active subscription found to change.",
        ));
    }

    let current_rank = agency_plan_tier_rank(current_plan_tier.as_str());
    let target_rank = agency_plan_tier_rank(normalized_plan.as_str());
    let target_interval = if is_annual { "year" } else { "month" };
    if target_rank < current_rank
        || (target_rank == current_rank
            && current_plan_interval == "year"
            && target_interval == "month")
    {
        return Err(billing_error(
            StatusCode::BAD_REQUEST,
            "downgrade_not_allowed",
            "Downgrades are not allowed from this endpoint.",
        ));
    }

    let sub = crate::payouts::fetch_subscription(&state, &subscription_id)
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e))?;

    let include_irl_booking = payload.addons.irl_booking || billing_ctx.addon_irl_booking_enabled;
    if payload.addons.irl_booking
        && !billing_ctx.addon_irl_booking_enabled
        && irl_booking_price_id.trim().is_empty()
    {
        return Err(billing_error(
            StatusCode::PRECONDITION_FAILED,
            "stripe_price_not_configured",
            format!("Missing Stripe price configuration: {irl_booking_env_var}").as_str(),
        ));
    }

    let mut base_item_id: Option<String> = None;
    let mut seat_item_id: Option<String> = None;
    let mut irl_item_id: Option<String> = None;
    let mut update_items: Vec<stripe_sdk::UpdateSubscriptionItems> = Vec::new();

    for item in sub.items.data.iter() {
        let item_id = item.id.to_string();
        let price_id = item
            .price
            .as_ref()
            .map(|price| price.id.to_string())
            .unwrap_or_default();

        if agency_base_price_id_matches(&state, &price_id) {
            base_item_id = Some(item_id);
            continue;
        }
        if agency_headcount_price_id_matches(&state, &price_id) {
            seat_item_id = Some(item_id);
            continue;
        }
        if agency_irl_booking_price_id_matches(&state, &price_id) {
            irl_item_id = Some(item_id);
            continue;
        }

        update_items.push(stripe_sdk::UpdateSubscriptionItems {
            id: Some(item.id.to_string()),
            price: Some(price_id),
            quantity: item.quantity,
            ..Default::default()
        });
    }

    update_items.push(stripe_sdk::UpdateSubscriptionItems {
        id: base_item_id,
        price: Some(base_plan_price_id.to_string()),
        quantity: Some(1),
        ..Default::default()
    });
    if payload.addons.seats_in_plan {
        update_items.push(stripe_sdk::UpdateSubscriptionItems {
            id: seat_item_id,
            price: Some(headcount_price_id.to_string()),
            quantity: Some(u64::from(payload.roster_models)),
            ..Default::default()
        });
    } else if let Some(existing_seat_item_id) = seat_item_id {
        update_items.push(stripe_sdk::UpdateSubscriptionItems {
            id: Some(existing_seat_item_id),
            deleted: Some(true),
            ..Default::default()
        });
    }
    if include_irl_booking {
        update_items.push(stripe_sdk::UpdateSubscriptionItems {
            id: irl_item_id,
            price: Some(irl_booking_price_id.to_string()),
            quantity: Some(1),
            ..Default::default()
        });
    } else if let Some(existing_irl_item_id) = irl_item_id {
        update_items.push(stripe_sdk::UpdateSubscriptionItems {
            id: Some(existing_irl_item_id),
            deleted: Some(true),
            ..Default::default()
        });
    }

    let mut md = std::collections::HashMap::new();
    md.insert("agency_id".to_string(), agency_id.clone());
    md.insert("billing_domain".to_string(), "agency".to_string());
    md.insert("plan".to_string(), normalized_plan.clone());
    md.insert(
        "billing_interval".to_string(),
        if is_annual { "year" } else { "month" }.to_string(),
    );
    md.insert(
        "seats_in_plan".to_string(),
        if payload.addons.seats_in_plan {
            "1".to_string()
        } else {
            "0".to_string()
        },
    );
    md.insert(
        "roster_models".to_string(),
        payload.roster_models.to_string(),
    );
    md.insert(
        "addon_irl_booking".to_string(),
        if include_irl_booking {
            "1".to_string()
        } else {
            "0".to_string()
        },
    );

    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
    let parsed_subscription_id = subscription_id
        .parse::<stripe_sdk::SubscriptionId>()
        .map_err(|_| {
            billing_error(
                StatusCode::INTERNAL_SERVER_ERROR,
                "invalid_subscription_id",
                "Server has an invalid Stripe subscription ID configured for this agency.",
            )
        })?;

    let mut params = stripe_sdk::UpdateSubscription::new();
    params.items = Some(update_items);
    params.cancel_at_period_end = Some(false);
    params.payment_behavior = Some(stripe_sdk::SubscriptionPaymentBehavior::AllowIncomplete);
    params.proration_behavior = Some(
        stripe_sdk::generated::billing::subscription::SubscriptionProrationBehavior::AlwaysInvoice,
    );
    params.metadata = Some(md);

    stripe_sdk::Subscription::update(&client, &parsed_subscription_id, params)
        .await
        .map_err(|e| billing_error_msg(StatusCode::BAD_GATEWAY, "stripe_error", e.to_string()))?;

    crate::payouts::sync_agency_subscription_from_stripe(
        &state,
        &agency_id,
        &subscription_id,
        Some(billing_ctx.customer_id.as_str()),
    )
    .await
    .map_err(|e| (StatusCode::BAD_GATEWAY, e))?;

    let latest_state = fetch_agency_checkout_sync_state(&state, &agency_id).await?;

    Ok(Json(AgencyPlanChangeResponse {
        plan_tier: latest_state.plan_tier,
        seats_limit: latest_state.seats_limit,
        addon_irl_booking_enabled: latest_state.addon_irl_booking_enabled,
    }))
}

pub async fn create_or_update_agency_seat_addon(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<AgencySeatAddonRequest>,
) -> Result<Json<AgencyCheckoutResponse>, (StatusCode, String)> {
    let agency_access =
        team::require_agency_permission(&state, &user, Permission::ManageBilling).await?;
    let agency_id = agency_access.organization_id.clone();

    if state.stripe_secret_key.trim().is_empty() {
        return Err(billing_error(
            StatusCode::PRECONDITION_FAILED,
            "stripe_not_configured",
            "Stripe is not configured on the server.",
        ));
    }

    if payload.seats < AGENCY_MIN_SELF_SERVE_ROSTER_MODELS {
        return Err(billing_error(
            StatusCode::BAD_REQUEST,
            "invalid_roster_models",
            "Seats must be at least 1.",
        ));
    }

    let requested_plan = normalize_optional_self_serve_plan(payload.plan.as_deref())?;
    let requested_interval = match payload.interval.as_deref() {
        None => None,
        Some(v) => Some(normalize_interval(Some(v))?),
    };

    let roster_count = agency_roster_count(&state, &agency_id).await?;
    if roster_count > AGENCY_MAX_SELF_SERVE_ROSTER_MODELS {
        return Err(billing_error(
            StatusCode::BAD_REQUEST,
            "enterprise_contact_sales_roster_limit",
            "Roster size exceeds self-serve limits. Please contact sales for enterprise.",
        ));
    }
    if payload.seats > AGENCY_MAX_SELF_SERVE_ROSTER_MODELS {
        return Err(billing_error(
            StatusCode::BAD_REQUEST,
            "enterprise_contact_sales_roster_limit",
            "Roster size exceeds self-serve limits. Please contact sales for enterprise.",
        ));
    }
    if payload.seats < roster_count {
        return Err(billing_error(
            StatusCode::BAD_REQUEST,
            "roster_models_below_current_roster",
            format!("Seats cannot be below current roster size ({roster_count}).").as_str(),
        ));
    }

    if state.stripe_checkout_success_url.trim().is_empty()
        || state.stripe_checkout_cancel_url.trim().is_empty()
    {
        return Err(billing_error(
            StatusCode::PRECONDITION_FAILED,
            "stripe_checkout_urls_not_configured",
            "Stripe checkout URLs are not configured on the server.",
        ));
    }

    let billing_ctx = get_or_create_agency_billing_context(&state, &agency_id).await?;
    let agency_resp = state
        .pg
        .from("agencies")
        .select("plan_tier,plan_interval")
        .eq("id", &agency_id)
        .limit(1)
        .execute()
        .await
        .map_err(map_postgrest_transport_error)?;
    let agency_status = agency_resp.status();
    let agency_text = agency_resp
        .text()
        .await
        .map_err(map_postgrest_transport_error)?;
    if !agency_status.is_success() {
        return Err(crate::errors::sanitize_db_error(
            agency_status.as_u16(),
            agency_text,
        ));
    }
    let rows: Vec<serde_json::Value> = serde_json::from_str(&agency_text).unwrap_or_default();
    let row = rows.first().cloned().unwrap_or_else(|| json!({}));
    let current_plan_tier = row
        .get("plan_tier")
        .and_then(|value| value.as_str())
        .unwrap_or("free")
        .trim()
        .to_lowercase();
    let _current_plan_interval = row
        .get("plan_interval")
        .and_then(|value| value.as_str())
        .unwrap_or("month")
        .trim()
        .to_lowercase();

    let effective_plan = requested_plan.unwrap_or_else(|| {
        if current_plan_tier == "pro" {
            "pro".to_string()
        } else {
            "basic".to_string()
        }
    });
    // Seat add-ons should not inherit the base plan billing cadence by default.
    // Default to monthly unless the client explicitly requests an interval.
    let effective_interval = requested_interval.unwrap_or_else(|| "month".to_string());
    let (seat_price_id, seat_env_var) = agency_seat_price_id(
        &state,
        effective_plan.as_str(),
        Some(effective_interval.as_str()),
    )
    .ok_or_else(|| billing_error(StatusCode::BAD_REQUEST, "invalid_plan", "Invalid plan."))?;
    if seat_price_id.trim().is_empty() {
        return Err(billing_error(
            StatusCode::PRECONDITION_FAILED,
            "stripe_price_not_configured",
            format!("Missing Stripe price configuration: {seat_env_var}").as_str(),
        ));
    }

    let current_state = fetch_agency_checkout_sync_state(&state, &agency_id).await?;
    let already_billed_seats = current_state.seats_limit;
    let requested_total_seats = payload.seats;
    let requested_total_seats_i64 = i64::from(requested_total_seats);
    if requested_total_seats_i64 <= already_billed_seats {
        return Ok(Json(AgencyCheckoutResponse {
            checkout_url: String::new(),
            seats_limit: Some(already_billed_seats),
            invoice_id: None,
            invoice_status: None,
            invoice_url: None,
        }));
    }
    let additional_seats_i64 = requested_total_seats_i64.saturating_sub(already_billed_seats);
    let additional_seats: u32 = u32::try_from(additional_seats_i64).unwrap_or(0);

    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
    let mut cs_params = stripe_sdk::CreateCheckoutSession::new();
    let success_url = agency_checkout_success_url(state.stripe_checkout_success_url.as_str());
    cs_params.success_url = Some(success_url.as_str());
    cs_params.cancel_url = Some(state.stripe_checkout_cancel_url.as_str());
    cs_params.mode = Some(stripe_sdk::CheckoutSessionMode::Subscription);
    cs_params.customer = Some(billing_ctx.customer_id.parse().map_err(|_| {
        billing_error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "invalid_stripe_customer_id",
            "Server has an invalid Stripe customer ID configured for this agency.",
        )
    })?);
    cs_params.line_items = Some(vec![recurring_price_line_item(
        seat_price_id,
        additional_seats,
    )]);
    cs_params.client_reference_id = Some(agency_id.as_str());

    let mut md = std::collections::HashMap::new();
    md.insert("agency_id".to_string(), agency_id.clone());
    md.insert("billing_domain".to_string(), "agency".to_string());
    md.insert("subscription_kind".to_string(), "seat_addon".to_string());
    md.insert("plan".to_string(), effective_plan.clone());
    md.insert("billing_interval".to_string(), effective_interval.clone());
    md.insert("roster_models".to_string(), additional_seats.to_string());
    cs_params.metadata = Some(md.clone());

    cs_params.subscription_data = Some(stripe_sdk::CreateCheckoutSessionSubscriptionData {
        metadata: Some(md),
        ..Default::default()
    });

    let session = stripe_sdk::CheckoutSession::create(&client, cs_params)
        .await
        .map_err(|e| billing_error_msg(StatusCode::BAD_GATEWAY, "stripe_error", e.to_string()))?;

    let url = session
        .url
        .as_ref()
        .map(|value| value.to_string())
        .unwrap_or_default();
    if url.is_empty() {
        return Err(billing_error(
            StatusCode::BAD_GATEWAY,
            "stripe_checkout_missing_url",
            "Stripe checkout session was created without a redirect URL.",
        ));
    }

    Ok(Json(AgencyCheckoutResponse {
        checkout_url: url,
        seats_limit: None,
        invoice_id: None,
        invoice_status: None,
        invoice_url: None,
    }))
}

pub async fn start_agency_pro_trial(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<AgencyTrialStartResponse>, (StatusCode, String)> {
    let agency_access =
        team::require_agency_permission(&state, &user, Permission::ManageBilling).await?;
    let agency_id = agency_access.organization_id.clone();

    let access = crate::entitlements::get_agency_access_state(&state, &agency_id).await?;
    if access.trial_active {
        return Err(billing_error(
            StatusCode::CONFLICT,
            "trial_already_active",
            "Trial is already active.",
        ));
    }
    if access.trial_ends_at.is_some() {
        return Err(billing_error(
            StatusCode::BAD_REQUEST,
            "trial_already_used",
            "This agency has already used its trial.",
        ));
    }
    if access.billed_tier != crate::entitlements::PlanTier::Free {
        return Err(billing_error(
            StatusCode::BAD_REQUEST,
            "trial_only_available_for_free_accounts",
            "Trial is only available for free agencies.",
        ));
    }

    let trial_ends_at = chrono::Utc::now() + chrono::Duration::days(30);
    let update = json!({
        "trial_ends_at": trial_ends_at.to_rfc3339(),
        "plan_updated_at": chrono::Utc::now().to_rfc3339(),
        "plan_interval": "month"
    });

    let resp = state
        .pg
        .from("agencies")
        .eq("id", &agency_id)
        .update(update.to_string())
        .execute()
        .await
        .map_err(map_postgrest_transport_error)?;
    let status = resp.status();
    let text = resp.text().await.map_err(map_postgrest_transport_error)?;
    if !status.is_success() {
        return Err(crate::errors::sanitize_db_error(status.as_u16(), text));
    }

    Ok(Json(AgencyTrialStartResponse {
        trial_active: true,
        trial_ends_at: Some(trial_ends_at.to_rfc3339()),
        display_plan_label: "Trial".to_string(),
    }))
}

pub async fn create_agency_irl_booking_addon_checkout(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<AgencyCheckoutResponse>, (StatusCode, String)> {
    let agency_access =
        team::require_agency_permission(&state, &user, Permission::ManageBilling).await?;
    let agency_id = agency_access.organization_id.clone();

    if state.stripe_secret_key.trim().is_empty() {
        return Err(billing_error(
            StatusCode::PRECONDITION_FAILED,
            "stripe_not_configured",
            "Stripe is not configured on the server.",
        ));
    }
    if state.stripe_agency_irl_booking_price_id.trim().is_empty() {
        return Err(billing_error(
            StatusCode::PRECONDITION_FAILED,
            "stripe_price_not_configured",
            "Missing Stripe price configuration: STRIPE_AGENCY_IRL_BOOKING_PRICE_ID",
        ));
    }
    if state.stripe_checkout_success_url.trim().is_empty()
        || state.stripe_checkout_cancel_url.trim().is_empty()
    {
        return Err(billing_error(
            StatusCode::PRECONDITION_FAILED,
            "stripe_checkout_urls_not_configured",
            "Stripe checkout URLs are not configured on the server.",
        ));
    }

    let billing_ctx = get_or_create_agency_billing_context(&state, &agency_id).await?;
    if billing_ctx.addon_irl_booking_enabled {
        return Err(billing_error(
            StatusCode::CONFLICT,
            "addon_irl_booking_already_enabled",
            "IRL booking add-on is already enabled.",
        ));
    }

    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
    let mut cs_params = stripe_sdk::CreateCheckoutSession::new();
    let success_url = agency_checkout_success_url(state.stripe_checkout_success_url.as_str());
    cs_params.success_url = Some(success_url.as_str());
    cs_params.cancel_url = Some(state.stripe_checkout_cancel_url.as_str());
    cs_params.mode = Some(stripe_sdk::CheckoutSessionMode::Subscription);
    cs_params.customer = Some(billing_ctx.customer_id.parse().map_err(|_| {
        billing_error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "invalid_stripe_customer_id",
            "Server has an invalid Stripe customer ID configured for this agency.",
        )
    })?);
    cs_params.line_items = Some(vec![recurring_price_line_item(
        state.stripe_agency_irl_booking_price_id.as_str(),
        1,
    )]);
    cs_params.client_reference_id = Some(agency_id.as_str());

    let mut md = std::collections::HashMap::new();
    md.insert("agency_id".to_string(), agency_id.clone());
    md.insert("billing_domain".to_string(), "agency".to_string());
    md.insert(
        "subscription_kind".to_string(),
        "irl_booking_addon".to_string(),
    );
    md.insert("addon_irl_booking".to_string(), "1".to_string());
    cs_params.metadata = Some(md);

    let mut sub_md = std::collections::HashMap::new();
    sub_md.insert("agency_id".to_string(), agency_id.clone());
    sub_md.insert("billing_domain".to_string(), "agency".to_string());
    sub_md.insert(
        "subscription_kind".to_string(),
        "irl_booking_addon".to_string(),
    );
    sub_md.insert("addon_irl_booking".to_string(), "1".to_string());
    cs_params.subscription_data = Some(stripe_sdk::CreateCheckoutSessionSubscriptionData {
        metadata: Some(sub_md),
        ..Default::default()
    });

    let session = stripe_sdk::CheckoutSession::create(&client, cs_params)
        .await
        .map_err(|e| billing_error_msg(StatusCode::BAD_GATEWAY, "stripe_error", e.to_string()))?;

    let url = session
        .url
        .as_ref()
        .map(|u| u.to_string())
        .unwrap_or_default();
    if url.is_empty() {
        warn!("stripe checkout session missing url");
        return Err(billing_error(
            StatusCode::BAD_GATEWAY,
            "stripe_checkout_missing_url",
            "Stripe checkout session was created without a redirect URL.",
        ));
    }

    info!(
        agency_id = %agency_id,
        agency_name = %billing_ctx.agency_name,
        "created stripe IRL booking addon checkout session"
    );
    Ok(Json(AgencyCheckoutResponse {
        checkout_url: url,
        seats_limit: None,
        invoice_id: None,
        invoice_status: None,
        invoice_url: None,
    }))
}

pub async fn create_agency_studio_addon_checkout(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<AgencyCheckoutResponse>, (StatusCode, String)> {
    let agency_access =
        team::require_agency_permission(&state, &user, Permission::ManageBilling).await?;
    let agency_id = agency_access.organization_id;

    if state.stripe_secret_key.trim().is_empty() {
        return Err(billing_error(
            StatusCode::PRECONDITION_FAILED,
            "stripe_not_configured",
            "Stripe is not configured on the server.",
        ));
    }

    if state.stripe_brand_studio_addon_price_id.trim().is_empty() {
        return Err(billing_error(
            StatusCode::PRECONDITION_FAILED,
            "stripe_price_not_configured",
            "Studio add-on Stripe price is not configured on the server.",
        ));
    }

    let billing_ctx = get_or_create_agency_billing_context(&state, &agency_id).await?;
    if billing_ctx.studio_addon_active {
        let studio_url = agency_studio_frontend_url(&state)?;
        return Ok(Json(AgencyCheckoutResponse {
            checkout_url: studio_url,
            seats_limit: None,
            invoice_id: None,
            invoice_status: None,
            invoice_url: None,
        }));
    }

    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
    let studio_url = agency_studio_frontend_url(&state)?;
    let mut cs_params = stripe_sdk::CreateCheckoutSession::new();
    cs_params.success_url = Some(studio_url.as_str());
    cs_params.cancel_url = Some(studio_url.as_str());
    cs_params.mode = Some(stripe_sdk::CheckoutSessionMode::Payment);
    cs_params.customer = Some(billing_ctx.customer_id.parse().map_err(|_| {
        billing_error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "invalid_stripe_customer_id",
            "Invalid Stripe customer ID.",
        )
    })?);
    cs_params.client_reference_id = Some(agency_id.as_str());
    cs_params.line_items = Some(vec![stripe_sdk::CreateCheckoutSessionLineItems {
        price: Some(state.stripe_brand_studio_addon_price_id.clone()),
        quantity: Some(1),
        ..Default::default()
    }]);

    let mut md = std::collections::HashMap::new();
    md.insert("billing_domain".to_string(), "studio".to_string());
    md.insert(
        "billing_target".to_string(),
        "agency_studio_addon".to_string(),
    );
    md.insert("user_id".to_string(), agency_id.clone());
    md.insert("agency_id".to_string(), agency_id.clone());
    md.insert(
        "studio_plan".to_string(),
        BRAND_STUDIO_ADDON_STUDIO_PLAN.to_string(),
    );
    md.insert(
        "credits".to_string(),
        BRAND_STUDIO_ADDON_STUDIO_CREDITS.to_string(),
    );
    cs_params.metadata = Some(md);

    let session = stripe_sdk::CheckoutSession::create(&client, cs_params)
        .await
        .map_err(|e| billing_error_msg(StatusCode::BAD_GATEWAY, "stripe_error", e.to_string()))?;

    let url = session
        .url
        .as_ref()
        .map(|u| u.to_string())
        .unwrap_or_default();
    if url.is_empty() {
        return Err(billing_error(
            StatusCode::BAD_GATEWAY,
            "stripe_checkout_missing_url",
            "Stripe checkout session was created without a redirect URL.",
        ));
    }

    info!(
        agency_id = %agency_id,
        "created agency studio add-on checkout session"
    );
    Ok(Json(AgencyCheckoutResponse {
        checkout_url: url,
        seats_limit: None,
        invoice_id: None,
        invoice_status: None,
        invoice_url: None,
    }))
}

pub async fn sync_agency_checkout_session(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<AgencyCheckoutSessionSyncRequest>,
) -> Result<Json<AgencyCheckoutSessionSyncResponse>, (StatusCode, String)> {
    let agency_access =
        team::require_agency_permission(&state, &user, Permission::ManageBilling).await?;
    let agency_id = agency_access.organization_id.clone();

    if state.stripe_secret_key.trim().is_empty() {
        return Err(billing_error(
            StatusCode::PRECONDITION_FAILED,
            "stripe_not_configured",
            "Stripe is not configured on the server.",
        ));
    }

    let session_id_raw = payload.session_id.trim();
    if session_id_raw.is_empty() {
        let agency_resp = state
            .pg
            .from("agencies")
            .select("stripe_subscription_id,stripe_customer_id")
            .eq("id", &agency_id)
            .limit(1)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let agency_status = agency_resp.status();
        let agency_text = agency_resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if !agency_status.is_success() {
            return Err(crate::errors::sanitize_db_error(
                agency_status.as_u16(),
                agency_text,
            ));
        }
        let rows: Vec<serde_json::Value> = serde_json::from_str(&agency_text).unwrap_or_default();
        let row = rows.first().cloned().unwrap_or_else(|| json!({}));
        let subscription_id = row
            .get("stripe_subscription_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        let customer_id = row
            .get("stripe_customer_id")
            .and_then(|v| v.as_str())
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty());

        if subscription_id.is_empty() {
            return Ok(Json(
                fetch_agency_checkout_sync_state(&state, &agency_id).await?,
            ));
        }

        crate::payouts::sync_agency_subscription_from_stripe(
            &state,
            &agency_id,
            subscription_id.as_str(),
            customer_id.as_deref(),
        )
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e))?;

        return Ok(Json(
            fetch_agency_checkout_sync_state(&state, &agency_id).await?,
        ));
    }

    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
    let session_id = payload
        .session_id
        .trim()
        .parse::<stripe_sdk::CheckoutSessionId>()
        .map_err(|_| {
            billing_error_msg(
                StatusCode::BAD_REQUEST,
                "invalid_session_id",
                "Invalid checkout session id.".to_string(),
            )
        })?;
    let session = stripe_sdk::CheckoutSession::retrieve(&client, &session_id, &[])
        .await
        .map_err(|e| billing_error_msg(StatusCode::BAD_GATEWAY, "stripe_error", e.to_string()))?;

    let session_agency_id = session
        .client_reference_id
        .as_deref()
        .or_else(|| {
            session
                .metadata
                .as_ref()
                .and_then(|m| m.get("agency_id"))
                .map(|value| value.as_str())
        })
        .unwrap_or("")
        .trim()
        .to_string();
    if session_agency_id.is_empty() || session_agency_id != agency_id {
        return Err(billing_error(
            StatusCode::FORBIDDEN,
            "checkout_session_not_owned",
            "Checkout session does not belong to this agency.",
        ));
    }

    let billing_domain = session
        .metadata
        .as_ref()
        .and_then(|m| m.get("billing_domain"))
        .map(|value| value.trim().to_lowercase())
        .unwrap_or_default();
    if !billing_domain.is_empty() && billing_domain != "agency" {
        return Err(billing_error(
            StatusCode::BAD_REQUEST,
            "checkout_session_not_agency_billing",
            "Checkout session is not an agency billing session.",
        ));
    }

    let subscription_id = session
        .subscription
        .as_ref()
        .map(|subscription| subscription.id().to_string())
        .unwrap_or_default();
    if subscription_id.trim().is_empty() {
        return Err(billing_error(
            StatusCode::BAD_REQUEST,
            "checkout_session_missing_subscription",
            "Checkout session is missing a subscription.",
        ));
    }

    let customer_id = session
        .customer
        .as_ref()
        .map(|customer| customer.id().to_string());
    let expected_plan_tier = session
        .metadata
        .as_ref()
        .and_then(|m| m.get("plan"))
        .map(|value| value.trim().to_lowercase());
    let expected_irl_booking = parse_checkout_metadata_flag(
        session
            .metadata
            .as_ref()
            .and_then(|m| m.get("addon_irl_booking")),
    );

    let mut latest_state = AgencyCheckoutSessionSyncResponse {
        plan_tier: "free".to_string(),
        seats_limit: 1,
        addon_irl_booking_enabled: false,
    };

    for attempt in 0..4 {
        crate::payouts::sync_agency_subscription_from_stripe(
            &state,
            &agency_id,
            subscription_id.as_str(),
            customer_id.as_deref(),
        )
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e))?;

        latest_state = fetch_agency_checkout_sync_state(&state, &agency_id).await?;

        let plan_ready = expected_plan_tier
            .as_deref()
            .map(|expected| {
                agency_plan_tier_rank(latest_state.plan_tier.as_str())
                    >= agency_plan_tier_rank(expected)
            })
            .unwrap_or(true);
        let addon_ready = !expected_irl_booking || latest_state.addon_irl_booking_enabled;
        if plan_ready && addon_ready {
            break;
        }

        if attempt < 3 {
            tokio::time::sleep(StdDuration::from_millis(1500)).await;
        }
    }

    Ok(Json(latest_state))
}

#[derive(Debug, Deserialize)]
pub struct BrandCheckoutRequest {
    pub plan: String,
    #[serde(default)]
    pub billing_cycle: Option<String>,
    #[serde(default)]
    pub start_trial: bool,
    pub next_path: Option<String>,
}

pub async fn create_creator_subscription_checkout(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<CreatorCheckoutRequest>,
) -> Result<Json<CreatorCheckoutResponse>, (StatusCode, String)> {
    if user.role != "creator" && user.role != "talent" {
        return Err((StatusCode::FORBIDDEN, "creator_only".to_string()));
    }

    if state.stripe_secret_key.trim().is_empty() {
        return Err((
            StatusCode::PRECONDITION_FAILED,
            "stripe_not_configured".to_string(),
        ));
    }

    let plan = payload.plan.trim().to_lowercase();
    if plan != "basic" && plan != "pro" {
        return Err((StatusCode::BAD_REQUEST, "invalid_creator_plan".to_string()));
    }

    if payload.start_trial && !payload.agreement_accepted {
        return Err((
            StatusCode::BAD_REQUEST,
            "must_accept_agreement_for_trial".to_string(),
        ));
    }

    let interval = payload
        .interval
        .as_deref()
        .unwrap_or("month")
        .trim()
        .to_lowercase();
    if interval != "month" && interval != "year" {
        return Err((
            StatusCode::BAD_REQUEST,
            "invalid_creator_interval".to_string(),
        ));
    }

    let price_id = creator_plan_to_price_id_with_interval(&state, &plan, &interval)
        .or_else(|| creator_plan_to_price_id(&state, &plan))
        .unwrap_or_default();
    if price_id.trim().is_empty() {
        let env_var = creator_plan_to_price_env_var_with_interval(&plan, &interval)
            .or_else(|| creator_plan_to_price_env_var(&plan))
            .unwrap_or("creator");
        return Err((
            StatusCode::PRECONDITION_FAILED,
            format!("{env_var}_not_configured"),
        ));
    }

    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
    let (creator_id, _) = get_creator_plan_tier_for_user(&state, &user).await?;
    let creator_resp = state
        .pg
        .from("creators")
        .select("id,email,full_name,stripe_customer_id,stripe_subscription_id,trial_started_at")
        .eq("id", &creator_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let creator_status = creator_resp.status();
    let creator_text = creator_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !creator_status.is_success() {
        return Err(crate::errors::sanitize_db_error(
            creator_status.as_u16(),
            creator_text,
        ));
    }

    let creator_row = serde_json::from_str::<serde_json::Value>(&creator_text)
        .ok()
        .and_then(|v| v.as_array().and_then(|a| a.first().cloned()))
        .ok_or((
            StatusCode::NOT_FOUND,
            "creator_profile_not_found".to_string(),
        ))?;

    let existing_customer = creator_row
        .get("stripe_customer_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();

    if payload.start_trial {
        let (trial_used, _) = match plan.as_str() {
            "basic" => (
                creator_row
                    .get("trial_basic_started_at")
                    .filter(|v| !v.is_null())
                    .is_some(),
                "trial_basic_started_at",
            ),
            "pro" => (
                creator_row
                    .get("trial_pro_started_at")
                    .filter(|v| !v.is_null())
                    .is_some(),
                "trial_pro_started_at",
            ),
            _ => (false, "trial_started_at"),
        };

        if trial_used {
            return Err((StatusCode::FORBIDDEN, "trial_already_used".to_string()));
        }
    }
    let customer_id = if !existing_customer.is_empty() {
        existing_customer
    } else {
        let mut params = stripe_sdk::CreateCustomer::new();
        if let Some(email) = creator_row
            .get("email")
            .and_then(|v| v.as_str())
            .map(str::trim)
            .filter(|v| !v.is_empty())
        {
            params.email = Some(email);
        }
        params.name = Some(
            creator_row
                .get("full_name")
                .and_then(|v| v.as_str())
                .map(str::trim)
                .filter(|v| !v.is_empty())
                .unwrap_or("Creator"),
        );
        params.metadata = Some(std::collections::HashMap::from([(
            "creator_id".to_string(),
            creator_id.clone(),
        )]));

        let customer = stripe_sdk::Customer::create(&client, params)
            .await
            .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
        let cust_id = customer.id.to_string();
        let cust_update_resp = state
            .pg
            .from("creators")
            .eq("id", &creator_id)
            .update(json!({ "stripe_customer_id": cust_id }).to_string())
            .execute()
            .await;

        match cust_update_resp {
            Ok(resp) if !resp.status().is_success() => {
                let body = resp.text().await.unwrap_or_default();
                warn!(creator_id = %creator_id, status = %body, "failed to persist stripe_customer_id to creators table");
            }
            Err(e) => {
                warn!(creator_id = %creator_id, error = %e, "transport error persisting stripe_customer_id to creators table");
            }
            _ => {}
        }

        cust_id
    };

    let mut inherited_trial_days: Option<u32> = None;
    let existing_subscription = creator_row
        .get("stripe_subscription_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();

    if !existing_subscription.is_empty() {
        let parsed_subscription = existing_subscription
            .parse::<stripe_sdk::SubscriptionId>()
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "invalid_creator_subscription_id".to_string(),
                )
            })?;
        match stripe_sdk::Subscription::retrieve(&client, &parsed_subscription, &[]).await {
            Ok(subscription) => {
                let live_subscription = matches!(
                    subscription.status,
                    stripe_sdk::SubscriptionStatus::Active
                        | stripe_sdk::SubscriptionStatus::Trialing
                        | stripe_sdk::SubscriptionStatus::PastDue
                        | stripe_sdk::SubscriptionStatus::Incomplete
                        | stripe_sdk::SubscriptionStatus::Paused
                        | stripe_sdk::SubscriptionStatus::Unpaid
                );

                if live_subscription {
                    let current_price_id = subscription
                        .items
                        .data
                        .first()
                        .and_then(|item| item.price.as_ref())
                        .map(|price| price.id.to_string())
                        .unwrap_or_default();

                    // If plan is DIFFERENT and user is in a TRIAL, we do the "Inheritance via Renewal" flow
                    if current_price_id != price_id
                        && subscription.status == stripe_sdk::SubscriptionStatus::Trialing
                    {
                        let now = chrono::Utc::now().timestamp();
                        let trial_end = subscription.trial_end.unwrap_or(now);
                        let seconds_left = trial_end - now;
                        let days_left = (seconds_left as f64 / 86400.0).ceil() as i64;
                        let final_days = days_left.max(1) as u32;
                        inherited_trial_days = Some(final_days);

                        info!("Inheriting trial: {} days left. Deferring cancellation of old subscription {} until checkout completes.", final_days, existing_subscription);
                        // Proceed to Checkout Session block below (inherited_trial_days will be used).
                        // The previous subscription will be cancelled after successful checkout via webhook.
                    } else if current_price_id != price_id {
                        // PAID user – Use Portal
                        let customer =
                            customer_id.parse::<stripe_sdk::CustomerId>().map_err(|_| {
                                (
                                    StatusCode::INTERNAL_SERVER_ERROR,
                                    "invalid_stripe_customer_id".to_string(),
                                )
                            })?;
                        let mut portal_params =
                            stripe_sdk::CreateBillingPortalSession::new(customer);
                        portal_params.return_url = Some(state.stripe_creator_success_url.as_str());

                        let subscription_item = subscription
                            .items
                            .data
                            .first()
                            .map(|item| item.id.to_string())
                            .ok_or((
                                StatusCode::BAD_GATEWAY,
                                "creator_subscription_missing_items".to_string(),
                            ))?;

                        portal_params.flow_data =
                            Some(stripe_sdk::CreateBillingPortalSessionFlowData {
                                after_completion: Some(
                                    stripe_sdk::CreateBillingPortalSessionFlowDataAfterCompletion {
                                        redirect: Some(
                                            stripe_sdk::CreateBillingPortalSessionFlowDataAfterCompletionRedirect {
                                                return_url: state
                                                    .stripe_creator_success_url
                                                    .clone(),
                                            },
                                        ),
                                        type_: stripe_sdk::CreateBillingPortalSessionFlowDataAfterCompletionType::Redirect,
                                        ..Default::default()
                                    },
                                ),
                                subscription_update_confirm: Some(
                                    stripe_sdk::CreateBillingPortalSessionFlowDataSubscriptionUpdateConfirm {
                                        subscription: existing_subscription.clone(),
                                        items: vec![
                                            stripe_sdk::CreateBillingPortalSessionFlowDataSubscriptionUpdateConfirmItems {
                                                id: subscription_item,
                                                price: Some(price_id.clone()),
                                                quantity: Some(1),
                                            },
                                        ],
                                        ..Default::default()
                                    },
                                ),
                                type_: stripe_sdk::CreateBillingPortalSessionFlowDataType::SubscriptionUpdateConfirm,
                                ..Default::default()
                            });

                        let portal =
                            stripe_sdk::BillingPortalSession::create(&client, portal_params)
                                .await
                                .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
                        return Ok(Json(CreatorCheckoutResponse {
                            checkout_url: portal.url,
                        }));
                    } else {
                        // SAME plan – portal for basic management (cancel, etc)
                        let customer =
                            customer_id.parse::<stripe_sdk::CustomerId>().map_err(|_| {
                                (
                                    StatusCode::INTERNAL_SERVER_ERROR,
                                    "invalid_stripe_customer_id".to_string(),
                                )
                            })?;
                        let mut portal_params =
                            stripe_sdk::CreateBillingPortalSession::new(customer);
                        portal_params.return_url = Some(state.stripe_creator_success_url.as_str());
                        let portal =
                            stripe_sdk::BillingPortalSession::create(&client, portal_params)
                                .await
                                .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
                        return Ok(Json(CreatorCheckoutResponse {
                            checkout_url: portal.url,
                        }));
                    }
                }
            }
            Err(error) => {
                let message = error.to_string();
                let not_found = message.contains("No such subscription")
                    || message.contains("resource_missing")
                    || message.contains("invalid_request_error");
                if !not_found {
                    return Err((StatusCode::BAD_GATEWAY, message));
                }
            }
        }
    }

    let mut cs_params = stripe_sdk::CreateCheckoutSession::new();
    cs_params.success_url = Some(state.stripe_creator_success_url.as_str());
    cs_params.cancel_url = Some(state.stripe_creator_cancel_url.as_str());
    cs_params.mode = Some(stripe_sdk::CheckoutSessionMode::Subscription);
    cs_params.customer = Some(customer_id.parse().map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "invalid_stripe_customer_id".to_string(),
        )
    })?);
    cs_params.client_reference_id = Some(creator_id.as_str());
    cs_params.line_items = Some(vec![stripe_sdk::CreateCheckoutSessionLineItems {
        price: Some(price_id.clone()),
        quantity: Some(1),
        ..Default::default()
    }]);

    let mut md = std::collections::HashMap::new();
    md.insert("creator_id".to_string(), creator_id.clone());
    md.insert("billing_domain".to_string(), "creator".to_string());
    md.insert("plan_tier".to_string(), plan.clone());
    md.insert("interval".to_string(), interval.clone());
    if inherited_trial_days.is_some() && !existing_subscription.trim().is_empty() {
        md.insert(
            "previous_subscription_id".to_string(),
            existing_subscription.trim().to_string(),
        );
    }
    if payload.start_trial {
        md.insert("trial_started_from_checkout".to_string(), "1".to_string());
        cs_params.payment_method_collection =
            Some(stripe_sdk::CheckoutSessionPaymentMethodCollection::Always);
    }

    info!(
        "Creating creator checkout session for user {} (creator {}): plan={}, interval={}, start_trial={}, price_id={}",
        user.id, creator_id, plan, interval, payload.start_trial, price_id
    );

    cs_params.metadata = Some(md.clone());
    cs_params.subscription_data = Some(stripe_sdk::CreateCheckoutSessionSubscriptionData {
        trial_period_days: if payload.start_trial {
            Some(inherited_trial_days.unwrap_or(30))
        } else if inherited_trial_days.is_some() {
            inherited_trial_days
        } else {
            None
        },
        metadata: Some(md),
        ..Default::default()
    });

    let session = stripe_sdk::CheckoutSession::create(&client, cs_params)
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    let url = session
        .url
        .as_ref()
        .map(|u| u.to_string())
        .unwrap_or_default();
    if url.is_empty() {
        warn!("stripe checkout session missing url");
        return Err((
            StatusCode::BAD_GATEWAY,
            "stripe_checkout_missing_url".to_string(),
        ));
    }

    Ok(Json(CreatorCheckoutResponse { checkout_url: url }))
}

pub async fn upgrade_creator_subscription(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<CreatorUpgradeRequest>,
) -> Result<Json<CreatorCheckoutResponse>, (StatusCode, String)> {
    if user.role != "creator" && user.role != "talent" {
        return Err((StatusCode::FORBIDDEN, "creator_only".to_string()));
    }

    if state.stripe_secret_key.trim().is_empty() {
        return Err((
            StatusCode::PRECONDITION_FAILED,
            "stripe_not_configured".to_string(),
        ));
    }

    let plan = payload.plan.trim().to_lowercase();
    if plan != "basic" && plan != "pro" {
        return Err((StatusCode::BAD_REQUEST, "invalid_creator_plan".to_string()));
    }

    let interval = payload
        .interval
        .unwrap_or_else(|| "month".to_string())
        .trim()
        .to_lowercase();
    if interval != "month" && interval != "year" {
        return Err((
            StatusCode::BAD_REQUEST,
            "invalid_billing_interval".to_string(),
        ));
    }

    let (creator_id, _) = get_creator_plan_tier_for_user(&state, &user).await?;
    let resp = state
        .pg
        .from("creators")
        .select("stripe_subscription_id, plan_tier")
        .eq("id", &creator_id)
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

    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    let creator_row = rows
        .first()
        .and_then(|v| v.as_object())
        .ok_or((StatusCode::NOT_FOUND, "creator_not_found".to_string()))?;

    let stripe_subscription_id = creator_row
        .get("stripe_subscription_id")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .ok_or((
            StatusCode::BAD_REQUEST,
            "no_active_subscription".to_string(),
        ))?;

    let stripe_subscription_id_parsed = stripe_subscription_id
        .parse::<stripe_sdk::SubscriptionId>()
        .map_err(|_| {
            (
                StatusCode::BAD_REQUEST,
                "invalid_subscription_id".to_string(),
            )
        })?;

    let price_id = creator_plan_to_price_id_with_interval(&state, &plan, &interval).ok_or((
        StatusCode::BAD_REQUEST,
        "invalid_plan_configuration".to_string(),
    ))?;

    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
    let sub = stripe_sdk::Subscription::retrieve(&client, &stripe_subscription_id_parsed, &[])
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    let item_id = sub
        .items
        .data
        .first()
        .ok_or((
            StatusCode::BAD_GATEWAY,
            "subscription_has_no_items".to_string(),
        ))?
        .id
        .to_string();

    let req_client = reqwest::Client::new();
    let res = req_client
        .post(format!(
            "https://api.stripe.com/v1/subscriptions/{}",
            stripe_subscription_id
        ))
        .basic_auth(&state.stripe_secret_key, Some(""))
        .form(&[
            ("items[0][id]", item_id.as_str()),
            ("items[0][price]", price_id.as_str()),
            ("proration_behavior", "create_prorations"),
        ])
        .send()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    if !res.status().is_success() {
        warn!("stripe upgrade failed: {:?}", res.text().await);
        return Err((StatusCode::BAD_GATEWAY, "stripe_upgrade_failed".to_string()));
    }

    Ok(Json(CreatorCheckoutResponse {
        checkout_url: String::new(),
    }))
}

pub async fn get_creator_billing_status(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<CreatorBillingStatusResponse>, (StatusCode, String)> {
    if user.role != "creator" && user.role != "talent" {
        return Err((StatusCode::FORBIDDEN, "creator_only".to_string()));
    }

    let (creator_id, billed_tier, entitlement_tier) =
        get_creator_entitlement_tier_for_user(&state, &user).await?;
    let resp = state
        .pg
        .from("creators")
        .select("plan_tier,plan_interval,stripe_customer_id,stripe_subscription_id,plan_updated_at,stripe_current_period_end,stripe_cancel_at_period_end,created_at,trial_started_at,trial_basic_started_at,trial_pro_started_at")
        .eq("id", &creator_id)
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

    fn parse_db_date(s: &str) -> Option<DateTime<Utc>> {
        // Try RFC3339 (T delimiter)
        DateTime::parse_from_rfc3339(s)
            .map(|dt| dt.with_timezone(&Utc))
            .ok()
            .or_else(|| {
                // Try format with space instead of T
                NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S%.f%#z")
                    .ok()
                    .map(|ndt| DateTime::<Utc>::from_naive_utc_and_offset(ndt, Utc))
            })
            .or_else(|| {
                // Fallback for space without TZ offset
                NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S%.f")
                    .ok()
                    .map(|ndt| DateTime::<Utc>::from_naive_utc_and_offset(ndt, Utc))
            })
    }
    let plan_tier = row
        .get("plan_tier")
        .and_then(|v| v.as_str())
        .unwrap_or("free")
        .to_string();

    let trial_start_at_str = row.get("trial_started_at").and_then(|v| v.as_str());
    let trial_basic_start_at_str = row.get("trial_basic_started_at").and_then(|v| v.as_str());
    let trial_pro_start_at_str = row.get("trial_pro_started_at").and_then(|v| v.as_str());

    let trial_start_at = trial_start_at_str.and_then(parse_db_date);
    let trial_basic_start_at = trial_basic_start_at_str.and_then(parse_db_date);
    let trial_pro_start_at = trial_pro_start_at_str.and_then(parse_db_date);

    // Dynamic trial status based on the CURRENT plan tier.
    // Important: if the creator is still marked as `free` but has plan-specific trial timestamps,
    // we must still surface an active countdown.
    let current_plan_trial_start = match plan_tier.as_str() {
        "basic" => trial_basic_start_at.or(trial_start_at),
        "pro" | "enterprise" => trial_pro_start_at.or(trial_start_at),
        _ => trial_start_at
            .or(trial_pro_start_at)
            .or(trial_basic_start_at),
    };

    // For safety, treat the most recent known trial start as authoritative.
    let latest_trial_start = [trial_start_at, trial_basic_start_at, trial_pro_start_at]
        .into_iter()
        .flatten()
        .max();

    let resolved_trial_start = current_plan_trial_start.or(latest_trial_start);

    let trial_active = resolved_trial_start.is_some_and(|start_dt| {
        chrono::Utc::now()
            .signed_duration_since(start_dt)
            .num_days()
            < 30
    });

    // Trial ends dynamically 30 days after it started
    let trial_ends_at_dt = resolved_trial_start.map(|dt| dt + chrono::Duration::days(30));
    let trial_ends_at = trial_ends_at_dt.map(|dt| dt.to_rfc3339());

    Ok(Json(CreatorBillingStatusResponse {
        creator_id: creator_id.clone(),
        plan_tier: plan_tier.clone(),
        entitlement_tier: format!("{:?}", entitlement_tier).to_lowercase(),
        trial_start_at: trial_start_at.map(|dt| dt.to_rfc3339()),
        trial_basic_start_at: trial_basic_start_at.map(|dt| dt.to_rfc3339()),
        trial_pro_start_at: trial_pro_start_at.map(|dt| dt.to_rfc3339()),
        trial_active,
        trial_ends_at,
        subscription_status: if matches!(
            billed_tier,
            PlanTier::Basic | PlanTier::Pro | PlanTier::Enterprise
        ) {
            "active".to_string()
        } else {
            "inactive".to_string()
        },
        stripe_customer_id: row
            .get("stripe_customer_id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        stripe_subscription_id: row
            .get("stripe_subscription_id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        plan_updated_at: row
            .get("plan_updated_at")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        plan_interval: row
            .get("plan_interval")
            .and_then(|v| v.as_str())
            .unwrap_or("month")
            .to_string(),
        stripe_current_period_end: row
            .get("stripe_current_period_end")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        stripe_cancel_at_period_end: row
            .get("stripe_cancel_at_period_end")
            .and_then(|v| v.as_bool())
            .unwrap_or(false),
        category_limit: creator_category_limit(entitlement_tier),
        can_use_kyc: creator_has_kyc_access(entitlement_tier),
        can_use_likeness: creator_has_likeness_access(entitlement_tier),
        can_use_agency_connection: creator_has_agency_connection_access(entitlement_tier),
        can_use_brand_connection: creator_has_brand_connection_access(entitlement_tier),
        can_use_payouts: creator_has_payouts_access(entitlement_tier),
        can_use_cameo_uploads: creator_has_cameo_uploads(entitlement_tier),
        can_use_unauthorized_monitoring: creator_has_unauthorized_use_monitoring(entitlement_tier),
        can_use_voice_profiles: creator_has_voice_profiles(entitlement_tier),
        voice_tone_limit: creator_voice_tone_limit(entitlement_tier),
        can_use_advanced_analytics: creator_has_advanced_analytics(entitlement_tier),
        can_use_jobs: creator_has_jobs_access(entitlement_tier),
        can_use_rules: creator_has_rules_access(entitlement_tier),
        can_use_talent_portal: creator_has_talent_portal_access(entitlement_tier),
        can_use_campaign_archive: creator_has_campaign_archive_access(entitlement_tier),
        can_use_active_campaigns: creator_has_active_campaigns_access(entitlement_tier),
    }))
}

#[derive(Debug, Serialize)]
pub struct CampaignCheckoutResponse {
    pub url: String,
}

#[derive(Debug, Default, Deserialize)]
pub struct BrandStudioAddonCheckoutRequest {
    pub next_path: Option<String>,
}

pub async fn create_brand_subscription_checkout(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<BrandCheckoutRequest>,
) -> Result<Json<AgencyCheckoutResponse>, (StatusCode, String)> {
    if user.role != "brand" {
        return Err((StatusCode::FORBIDDEN, "brand_only".to_string()));
    }

    if state.stripe_secret_key.trim().is_empty() {
        return Err((
            StatusCode::PRECONDITION_FAILED,
            "stripe_not_configured".to_string(),
        ));
    }

    if payload.plan.trim().eq_ignore_ascii_case("enterprise") {
        return Err((
            StatusCode::BAD_REQUEST,
            "enterprise_contact_sales".to_string(),
        ));
    }

    let billing_cycle = normalize_brand_billing_cycle(payload.billing_cycle.as_deref());

    let base_price_id =
        brand_plan_to_price_id_for_billing_cycle(&state, &payload.plan, billing_cycle)
            .ok_or((StatusCode::BAD_REQUEST, "invalid_plan".to_string()))?;
    if base_price_id.trim().is_empty() {
        let ev = brand_plan_to_price_env_var_for_billing_cycle(&payload.plan, billing_cycle)
            .unwrap_or("STRIPE_BRAND_*_PRICE_ID");
        return Err((
            StatusCode::PRECONDITION_FAILED,
            format!("stripe_price_not_configured:{ev}"),
        ));
    }

    let row = get_brand_checkout_row(&state, &user.id).await?;
    let email = row
        .get("email")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let company_name = row
        .get("company_name")
        .and_then(|v| v.as_str())
        .unwrap_or("Brand")
        .to_string();
    let existing_customer = row
        .get("stripe_customer_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let current_plan_tier = row
        .get("plan_tier")
        .and_then(|v| v.as_str())
        .unwrap_or("free")
        .trim()
        .to_lowercase();
    let current_subscription_status = row
        .get("subscription_status")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_lowercase();
    let current_subscription_id = row
        .get("stripe_subscription_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let has_active_base_subscription =
        current_subscription_status == "active" || current_subscription_status == "trialing";
    let target_plan = payload.plan.trim().to_lowercase();

    // Bug Fix #2: Handle subscription changes by canceling old subscription before creating new checkout
    if has_active_base_subscription {
        if current_plan_tier == target_plan {
            return Err((
                StatusCode::BAD_REQUEST,
                "brand_subscription_already_active".to_string(),
            ));
        }

        // Cancel the existing subscription before creating new checkout
        if !current_subscription_id.is_empty() {
            let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
            let subscription_id = current_subscription_id
                .parse::<stripe_sdk::SubscriptionId>()
                .map_err(|_| {
                    billing_error(
                        StatusCode::INTERNAL_SERVER_ERROR,
                        "invalid_subscription_id",
                        "Invalid Stripe subscription ID.",
                    )
                })?;

            // Cancel the subscription immediately
            let mut cancel_params = stripe_sdk::CancelSubscription::new();
            cancel_params.prorate = Some(true);

            match stripe_sdk::Subscription::cancel(&client, &subscription_id, cancel_params).await {
                Ok(_) => {
                    info!(
                        brand_id = %user.id,
                        old_plan = %current_plan_tier,
                        new_plan = %target_plan,
                        "canceled existing brand subscription for plan change"
                    );
                }
                Err(e) => {
                    warn!(
                        error = %e,
                        brand_id = %user.id,
                        subscription_id = %current_subscription_id,
                        "failed to cancel existing subscription, proceeding with checkout anyway"
                    );
                }
            }
        }
    }

    let customer_id =
        ensure_brand_customer(&state, &user.id, &email, &company_name, &existing_customer).await?;

    let next_path = sanitize_next_path(payload.next_path.as_deref());
    let success_url = brand_billing_frontend_url(
        &state,
        vec![
            ("success", "1".to_string()),
            ("plan", target_plan.clone()),
            ("billing", billing_cycle.to_string()),
            ("next", next_path.clone().unwrap_or_default()),
        ],
    )?;
    let cancel_url = brand_billing_frontend_url(
        &state,
        vec![
            ("canceled", "1".to_string()),
            ("plan", target_plan.clone()),
            ("billing", billing_cycle.to_string()),
            ("next", next_path.unwrap_or_default()),
        ],
    )?;

    let should_start_trial =
        payload.start_trial && target_plan == "pro" && current_plan_tier == "free";

    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
    let mut cs_params = stripe_sdk::CreateCheckoutSession::new();
    cs_params.success_url = Some(success_url.as_str());
    cs_params.cancel_url = Some(cancel_url.as_str());
    cs_params.mode = Some(stripe_sdk::CheckoutSessionMode::Subscription);
    cs_params.customer = Some(customer_id.parse().map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "invalid_stripe_customer_id".to_string(),
        )
    })?);
    cs_params.client_reference_id = Some(user.id.as_str());
    cs_params.line_items = Some(vec![stripe_sdk::CreateCheckoutSessionLineItems {
        price: Some(base_price_id.clone()),
        quantity: Some(1),
        ..Default::default()
    }]);

    let mut md = std::collections::HashMap::new();
    md.insert("brand_id".to_string(), user.id.clone());
    md.insert("billing_domain".to_string(), "brand".to_string());
    md.insert("billing_target".to_string(), "base".to_string());
    md.insert("plan".to_string(), target_plan.clone());
    md.insert("billing_cycle".to_string(), billing_cycle.to_string());
    cs_params.metadata = Some(md);

    let mut sub_md = std::collections::HashMap::new();
    sub_md.insert("brand_id".to_string(), user.id.clone());
    sub_md.insert("billing_domain".to_string(), "brand".to_string());
    sub_md.insert("billing_target".to_string(), "base".to_string());
    sub_md.insert("plan".to_string(), target_plan.clone());
    sub_md.insert("billing_cycle".to_string(), billing_cycle.to_string());
    cs_params.subscription_data = Some(stripe_sdk::CreateCheckoutSessionSubscriptionData {
        metadata: Some(sub_md),
        trial_period_days: if should_start_trial { Some(14) } else { None },
        ..Default::default()
    });

    let session = stripe_sdk::CheckoutSession::create(&client, cs_params)
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    let url = session
        .url
        .as_ref()
        .map(|u| u.to_string())
        .unwrap_or_default();
    if url.is_empty() {
        warn!("stripe checkout session missing url");
        return Err((
            StatusCode::BAD_GATEWAY,
            "stripe_checkout_missing_url".to_string(),
        ));
    }

    info!(
        brand_id = %user.id,
        plan = %target_plan,
        billing_cycle = %billing_cycle,
        start_trial = should_start_trial,
        "created brand subscription checkout session"
    );
    Ok(Json(AgencyCheckoutResponse {
        checkout_url: url,
        seats_limit: None,
        invoice_id: None,
        invoice_status: None,
        invoice_url: None,
    }))
}

pub async fn create_brand_studio_addon_checkout(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<BrandStudioAddonCheckoutRequest>,
) -> Result<Json<AgencyCheckoutResponse>, (StatusCode, String)> {
    if user.role != "brand" {
        return Err((StatusCode::FORBIDDEN, "brand_only".to_string()));
    }

    if state.stripe_secret_key.trim().is_empty() {
        return Err((
            StatusCode::PRECONDITION_FAILED,
            "stripe_not_configured".to_string(),
        ));
    }

    if state.stripe_brand_studio_addon_price_id.trim().is_empty() {
        return Err((
            StatusCode::PRECONDITION_FAILED,
            "stripe_price_not_configured:STRIPE_BRAND_STUDIO_ADDON_PRICE_ID".to_string(),
        ));
    }

    let row = get_brand_checkout_row(&state, &user.id).await?;
    let email = row
        .get("email")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let company_name = row
        .get("company_name")
        .and_then(|v| v.as_str())
        .unwrap_or("Brand")
        .to_string();
    let existing_customer = row
        .get("stripe_customer_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let current_plan_tier = row
        .get("plan_tier")
        .and_then(|v| v.as_str())
        .unwrap_or("free")
        .trim()
        .to_lowercase();
    let studio_addon_active = row
        .get("studio_addon_active")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    if current_plan_tier == "enterprise" {
        return Err((
            StatusCode::BAD_REQUEST,
            "studio_addon_included_with_enterprise".to_string(),
        ));
    }

    if studio_addon_active {
        let studio_url = agency_studio_frontend_url(&state)?;
        return Ok(Json(AgencyCheckoutResponse {
            checkout_url: studio_url,
            seats_limit: None,
            invoice_id: None,
            invoice_status: None,
            invoice_url: None,
        }));
    }

    let customer_id =
        ensure_brand_customer(&state, &user.id, &email, &company_name, &existing_customer).await?;

    let next_path = sanitize_next_path(payload.next_path.as_deref());
    let success_url_base = brand_billing_frontend_url(
        &state,
        vec![
            ("success", "1".to_string()),
            ("focus", "studio".to_string()),
            ("next", next_path.clone().unwrap_or_default()),
        ],
    )?;
    // Append the Stripe session ID template so the frontend can verify immediately on redirect.
    let success_url = format!("{success_url_base}&session_id={{CHECKOUT_SESSION_ID}}");
    let cancel_url = brand_billing_frontend_url(
        &state,
        vec![
            ("canceled", "1".to_string()),
            ("focus", "studio".to_string()),
            ("next", next_path.unwrap_or_default()),
        ],
    )?;

    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
    let mut cs_params = stripe_sdk::CreateCheckoutSession::new();
    cs_params.success_url = Some(success_url.as_str());
    cs_params.cancel_url = Some(cancel_url.as_str());
    cs_params.mode = Some(stripe_sdk::CheckoutSessionMode::Payment);
    cs_params.customer = Some(customer_id.parse().map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "invalid_stripe_customer_id".to_string(),
        )
    })?);
    cs_params.client_reference_id = Some(user.id.as_str());
    cs_params.line_items = Some(vec![stripe_sdk::CreateCheckoutSessionLineItems {
        price: Some(state.stripe_brand_studio_addon_price_id.clone()),
        quantity: Some(1),
        ..Default::default()
    }]);

    let mut md = std::collections::HashMap::new();
    md.insert("brand_id".to_string(), user.id.clone());
    md.insert("billing_domain".to_string(), "studio".to_string());
    md.insert(
        "billing_target".to_string(),
        "brand_studio_addon".to_string(),
    );
    md.insert(
        "studio_plan".to_string(),
        BRAND_STUDIO_ADDON_STUDIO_PLAN.to_string(),
    );
    md.insert(
        "credits".to_string(),
        BRAND_STUDIO_ADDON_STUDIO_CREDITS.to_string(),
    );
    cs_params.metadata = Some(md);

    let session = stripe_sdk::CheckoutSession::create(&client, cs_params)
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    let url = session
        .url
        .as_ref()
        .map(|u| u.to_string())
        .unwrap_or_default();
    if url.is_empty() {
        warn!("stripe checkout session missing url");
        return Err((
            StatusCode::BAD_GATEWAY,
            "stripe_checkout_missing_url".to_string(),
        ));
    }

    info!(brand_id = %user.id, "created brand studio add-on checkout session");
    Ok(Json(AgencyCheckoutResponse {
        checkout_url: url,
        seats_limit: None,
        invoice_id: None,
        invoice_status: None,
        invoice_url: None,
    }))
}

#[derive(Debug, Deserialize)]
pub struct BrandStudioAddonVerifyRequest {
    pub session_id: String,
}

/// Verifies a completed Stripe checkout session for the brand studio add-on and provisions
/// access immediately. Called from the success-redirect page so activation does not depend
/// solely on the webhook arriving.
pub async fn verify_brand_studio_addon_checkout(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<BrandStudioAddonVerifyRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "brand" {
        return Err((StatusCode::FORBIDDEN, "brand_only".to_string()));
    }

    let session_id_raw = payload.session_id.trim().to_string();
    if session_id_raw.is_empty() {
        return Err(billing_error(
            StatusCode::BAD_REQUEST,
            "missing_session_id",
            "session_id is required.",
        ));
    }

    if state.stripe_secret_key.trim().is_empty() {
        return Err(billing_error(
            StatusCode::PRECONDITION_FAILED,
            "stripe_not_configured",
            "Stripe is not configured on the server.",
        ));
    }

    // Retrieve the session from Stripe.
    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
    let session_id = session_id_raw
        .parse::<stripe_sdk::CheckoutSessionId>()
        .map_err(|_| {
            billing_error(
                StatusCode::BAD_REQUEST,
                "invalid_session_id",
                "Invalid checkout session id.",
            )
        })?;
    let session = stripe_sdk::CheckoutSession::retrieve(&client, &session_id, &[])
        .await
        .map_err(|e| billing_error_msg(StatusCode::BAD_GATEWAY, "stripe_error", e.to_string()))?;

    // Verify the session belongs to this brand.
    let session_brand_id = session
        .client_reference_id
        .as_deref()
        .or_else(|| {
            session
                .metadata
                .as_ref()
                .and_then(|m| m.get("brand_id"))
                .map(|v| v.as_str())
        })
        .unwrap_or("")
        .trim()
        .to_string();
    if session_brand_id.is_empty() || session_brand_id != user.id {
        return Err(billing_error(
            StatusCode::FORBIDDEN,
            "checkout_session_not_owned",
            "Checkout session does not belong to this brand.",
        ));
    }

    // Verify it is a paid studio addon session.
    let billing_target = session
        .metadata
        .as_ref()
        .and_then(|m| m.get("billing_target"))
        .map(|v| v.trim().to_lowercase())
        .unwrap_or_default();
    if billing_target != "brand_studio_addon" {
        return Err(billing_error(
            StatusCode::BAD_REQUEST,
            "not_studio_addon_session",
            "Checkout session is not a studio add-on session.",
        ));
    }

    let is_paid = matches!(
        session.payment_status,
        stripe_sdk::CheckoutSessionPaymentStatus::Paid
    );
    if !is_paid {
        return Ok(Json(
            json!({ "studio_addon_active": false, "payment_status": "unpaid" }),
        ));
    }

    // Idempotency: skip if already active.
    let brand_resp = state
        .pg
        .from("brands")
        .select("studio_addon_active")
        .eq("id", user.id.as_str())
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let rows_text = brand_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let rows: Vec<serde_json::Value> = serde_json::from_str(&rows_text).unwrap_or_default();
    let already_active = rows
        .first()
        .and_then(|row| row.get("studio_addon_active"))
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    if already_active {
        return Ok(Json(json!({ "studio_addon_active": true })));
    }

    // Check wallet idempotency via session id.
    let session_str = session_id_raw.as_str();
    let already_credited =
        crate::studio::wallet::has_stripe_credit_transaction(&state.pg, session_str)
            .await
            .unwrap_or(false);

    if !already_credited {
        let credits = session
            .metadata
            .as_ref()
            .and_then(|m| m.get("credits"))
            .and_then(|v| v.parse::<i64>().ok())
            .filter(|&c| c > 0)
            .unwrap_or(BRAND_STUDIO_ADDON_STUDIO_CREDITS);

        let studio_plan = session
            .metadata
            .as_ref()
            .and_then(|m| m.get("studio_plan"))
            .map(|v| v.trim().to_lowercase())
            .filter(|v| v == "lite" || v == "pro")
            .unwrap_or_else(|| BRAND_STUDIO_ADDON_STUDIO_PLAN.to_string());

        crate::studio::wallet::add_credits(&state.pg, &user.id, credits, Some(session_str))
            .await
            .map_err(|e| {
                warn!(brand_id = %user.id, error = %e, "failed to add studio credits after verified checkout");
                billing_error(StatusCode::INTERNAL_SERVER_ERROR, "credit_add_failed", "Failed to add studio credits.")
            })?;
        crate::studio::wallet::set_current_plan(
            &state.pg,
            &user.id,
            Some(studio_plan.as_str()),
        )
        .await
        .map_err(|e| {
            warn!(brand_id = %user.id, error = %e, "failed to set studio plan after verified checkout");
            billing_error(StatusCode::INTERNAL_SERVER_ERROR, "plan_set_failed", "Failed to set studio plan.")
        })?;
    }

    let addon_resp = state
        .pg
        .from("brands")
        .eq("id", user.id.as_str())
        .update(
            json!({
                "studio_addon_active": true,
                "studio_addon_activated_at": chrono::Utc::now().to_rfc3339(),
            })
            .to_string(),
        )
        .execute()
        .await
        .map_err(|e| {
            warn!(brand_id = %user.id, error = %e, "transport error marking studio_addon_active");
            billing_error(
                StatusCode::INTERNAL_SERVER_ERROR,
                "addon_activate_failed",
                "Failed to activate studio add-on.",
            )
        })?;

    if !addon_resp.status().is_success() {
        let body = addon_resp.text().await.unwrap_or_default();
        warn!(brand_id = %user.id, status = %body, "DB rejected studio_addon_active update");
        return Err(billing_error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "addon_activate_failed",
            "Failed to activate studio add-on.",
        ));
    }

    info!(brand_id = %user.id, stripe_session_id = %session_id_raw, "brand studio add-on verified and activated");
    Ok(Json(json!({ "studio_addon_active": true })))
}

pub async fn create_campaign_offer_checkout(
    State(state): State<AppState>,
    user: AuthUser,
    axum::extract::Path(offer_id): axum::extract::Path<String>,
) -> Result<Json<CampaignCheckoutResponse>, (StatusCode, String)> {
    let brand_access =
        team::require_brand_permission(&state, &user, Permission::ManagePayOffers).await?;
    let brand_id = brand_access.organization_id;

    if state.stripe_secret_key.trim().is_empty() {
        return Err(billing_error(
            StatusCode::PRECONDITION_FAILED,
            "stripe_not_configured",
            "Stripe is not configured on the server.",
        ));
    }

    // 1. Fetch the campaign offer
    let offer_resp = state
        .pg
        .from("campaign_offers")
        .select("id,status,payment_status,target_type,target_id,billing_request_id,budget_snapshot")
        .eq("id", &offer_id)
        .eq("brand_id", &brand_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let offer_status = offer_resp.status();
    if !offer_status.is_success() {
        let err = offer_resp.text().await.unwrap_or_default();
        return Err(crate::errors::sanitize_db_error(offer_status.as_u16(), err));
    }
    let offer_text = offer_resp.text().await.unwrap_or_else(|_| "[]".into());
    let offer_rows: Vec<serde_json::Value> = serde_json::from_str(&offer_text).unwrap_or_default();
    let offer = offer_rows.first().ok_or_else(|| {
        billing_error(StatusCode::NOT_FOUND, "offer_not_found", "Offer not found.")
    })?;

    let offer_status = offer.get("status").and_then(|v| v.as_str()).unwrap_or("");
    if offer_status != "contract_fully_signed" {
        return Err(billing_error(
            StatusCode::BAD_REQUEST,
            "contract_must_be_fully_signed",
            "Offer contract must be fully signed before payment.",
        ));
    }

    let payment_status = offer
        .get("payment_status")
        .and_then(|v| v.as_str())
        .unwrap_or("unpaid");
    if payment_status != "unpaid" {
        return Err(billing_error(
            StatusCode::BAD_REQUEST,
            "offer_already_paid_or_processing",
            "Offer is already paid or processing.",
        ));
    }

    let target_type = offer
        .get("target_type")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let target_id = offer
        .get("target_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let mut billing_request_id = offer
        .get("billing_request_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    // Hard requirements for campaign offers:
    // - Agency offers: at least one talent must be assigned BEFORE the brand can pay.
    // - Agency offers: agency + all assigned talents must have Stripe Connect accounts (like licensing flow),
    //   otherwise escrow will get stuck on the platform with no ability to transfer out.
    // - Creator offers: the creator must have a Stripe Connect account.
    if target_type == "agency" {
        // 1) Agency must be connected to Stripe
        let agency_acct_resp = state
            .pg
            .from("agencies")
            .select("stripe_connect_account_id")
            .eq("id", target_id)
            .limit(1)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if !agency_acct_resp.status().is_success() {
            return Err(crate::errors::sanitize_db_error(
                agency_acct_resp.status().as_u16(),
                agency_acct_resp.text().await.unwrap_or_default(),
            ));
        }
        let agency_acct_text = agency_acct_resp
            .text()
            .await
            .unwrap_or_else(|_| "[]".into());
        let agency_rows: Vec<serde_json::Value> =
            serde_json::from_str(&agency_acct_text).unwrap_or_default();
        let agency_stripe_account_id = agency_rows
            .first()
            .and_then(|r| r.get("stripe_connect_account_id").and_then(|v| v.as_str()))
            .unwrap_or("")
            .trim()
            .to_string();
        if agency_stripe_account_id.is_empty() {
            return Err(billing_error(
                StatusCode::BAD_REQUEST,
                "agency_stripe_connect_required",
                "Agency must connect a Stripe account before the brand can pay for this offer.",
            ));
        }

        // 2) At least one creator-backed talent must be assigned
        let assignments_resp = state
            .pg
            .from("offer_talent_assignments")
            .select("creator_id")
            .eq("offer_id", &offer_id)
            .eq("agency_id", target_id)
            .eq("status", "assigned")
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if !assignments_resp.status().is_success() {
            return Err(crate::errors::sanitize_db_error(
                assignments_resp.status().as_u16(),
                assignments_resp.text().await.unwrap_or_default(),
            ));
        }
        let assignments_txt = assignments_resp
            .text()
            .await
            .unwrap_or_else(|_| "[]".into());
        let assignments_rows: Vec<serde_json::Value> =
            serde_json::from_str(&assignments_txt).unwrap_or_default();
        let mut creator_ids: Vec<String> = assignments_rows
            .iter()
            .filter_map(|r| r.get("creator_id").and_then(|v| v.as_str()))
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();
        creator_ids.sort();
        creator_ids.dedup();
        if creator_ids.is_empty() {
            return Err(billing_error(
                StatusCode::BAD_REQUEST,
                "offer_requires_assigned_talent",
                "At least one talent must be assigned before the brand can pay for this offer.",
            ));
        }

        // 3) Every assigned creator must have a connected Stripe account
        let creator_refs: Vec<&str> = creator_ids.iter().map(|s| s.as_str()).collect();
        let creators_resp = state
            .pg
            .from("creators")
            .select("id,full_name,stripe_connect_account_id")
            .in_("id", creator_refs)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if !creators_resp.status().is_success() {
            return Err(crate::errors::sanitize_db_error(
                creators_resp.status().as_u16(),
                creators_resp.text().await.unwrap_or_default(),
            ));
        }
        let creators_text = creators_resp.text().await.unwrap_or_else(|_| "[]".into());
        let creators_rows: Vec<serde_json::Value> =
            serde_json::from_str(&creators_text).unwrap_or_default();
        let mut stripe_by_creator: std::collections::HashMap<String, String> =
            std::collections::HashMap::new();
        let mut name_by_creator: std::collections::HashMap<String, String> =
            std::collections::HashMap::new();
        for r in &creators_rows {
            let cid = r.get("id").and_then(|v| v.as_str()).unwrap_or("").trim();
            if cid.is_empty() {
                continue;
            }
            let name = r
                .get("full_name")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if !name.is_empty() {
                name_by_creator.insert(cid.to_string(), name);
            }
            let acct = r
                .get("stripe_connect_account_id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if !acct.is_empty() {
                stripe_by_creator.insert(cid.to_string(), acct);
            }
        }

        let mut missing_stripe: Vec<String> = vec![];
        for cid in &creator_ids {
            if !stripe_by_creator.contains_key(cid) {
                let label = name_by_creator
                    .get(cid)
                    .cloned()
                    .unwrap_or_else(|| cid.clone());
                missing_stripe.push(label);
            }
        }
        if !missing_stripe.is_empty() {
            return Err(billing_error(
                StatusCode::BAD_REQUEST,
                "creator_stripe_connect_required",
                format!(
                    "The following creators must connect their Stripe account before the brand can pay: {}",
                    missing_stripe.join(", ")
                )
                .as_str(),
            ));
        }
    } else if target_type == "creator" {
        let creator_resp = state
            .pg
            .from("creators")
            .select("stripe_connect_account_id")
            .eq("id", target_id)
            .limit(1)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if !creator_resp.status().is_success() {
            return Err(crate::errors::sanitize_db_error(
                creator_resp.status().as_u16(),
                creator_resp.text().await.unwrap_or_default(),
            ));
        }
        let creator_text = creator_resp.text().await.unwrap_or_else(|_| "[]".into());
        let creator_rows: Vec<serde_json::Value> =
            serde_json::from_str(&creator_text).unwrap_or_default();
        let stripe_id = creator_rows
            .first()
            .and_then(|r| r.get("stripe_connect_account_id").and_then(|v| v.as_str()))
            .unwrap_or("")
            .trim()
            .to_string();
        if stripe_id.is_empty() {
            return Err(billing_error(
                StatusCode::BAD_REQUEST,
                "creator_stripe_connect_required",
                "Creator must connect a Stripe account before the brand can pay for this offer.",
            ));
        }
    }

    if target_type == "agency" && billing_request_id.is_empty() {
        match crate::brand_campaigns::ensure_campaign_billing_stub(&state, &offer_id).await {
            Ok(stub_id) => {
                billing_request_id = stub_id;
            }
            Err(e) => {
                return Err(billing_error(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "failed_to_create_stub",
                    format!("failed_to_create_stub: {}", e).as_str(),
                ));
            }
        }
    }

    if target_type == "agency" && billing_request_id.is_empty() {
        return Err(billing_error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "missing_billing_stub_for_agency",
            "missing_billing_stub_for_agency",
        ));
    }

    let budget_snapshot = offer
        .get("budget_snapshot")
        .and_then(|v| v.as_object())
        .cloned()
        .unwrap_or_default();

    let budget_str = budget_snapshot
        .get("budget_total")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "0".to_string());

    let budget_str = budget_str.replace(",", "");
    let budget_total: f64 = budget_str.parse().unwrap_or(0.0);
    let amount_cents = (budget_total * 100.0).round() as i64;

    if amount_cents <= 0 {
        return Err(billing_error(
            StatusCode::BAD_REQUEST,
            "invalid_budget",
            "Budget must be greater than 0.",
        ));
    }

    let success_url = format!(
        "{}/BrandDashboard?section=campaigns&paid=1&offer_id={}",
        state.frontend_url, offer_id
    );
    let cancel_url = format!(
        "{}/BrandDashboard?section=campaigns&canceled=1&offer_id={}",
        state.frontend_url, offer_id
    );

    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());

    let mut cs_params = stripe_sdk::CreateCheckoutSession::new();
    cs_params.success_url = Some(success_url.as_str());
    cs_params.cancel_url = Some(cancel_url.as_str());
    cs_params.mode = Some(stripe_sdk::CheckoutSessionMode::Payment);
    cs_params.client_reference_id = Some(brand_id.as_str());

    let mut md = std::collections::HashMap::new();
    md.insert("billing_domain".to_string(), "campaign_offer".to_string());
    md.insert("offer_id".to_string(), offer_id.clone());
    md.insert("target_type".to_string(), target_type.to_string());
    md.insert("target_id".to_string(), target_id.to_string());
    md.insert("brand_id".to_string(), brand_id.clone());

    if target_type == "agency" {
        md.insert("agency_id".to_string(), target_id.to_string());
        md.insert(
            "licensing_request_ids".to_string(),
            billing_request_id.to_string(),
        );
    }

    cs_params.metadata = Some(md);

    cs_params.line_items = Some(vec![stripe_sdk::CreateCheckoutSessionLineItems {
        price_data: Some(stripe_sdk::CreateCheckoutSessionLineItemsPriceData {
            currency: stripe_sdk::Currency::from_str("usd").unwrap(),
            product_data: Some(
                stripe_sdk::CreateCheckoutSessionLineItemsPriceDataProductData {
                    name: "Campaign Offer Escrow Deposit".to_string(),
                    description: Some(
                        "Funds will be held in escrow until deliverables are approved.".to_string(),
                    ),
                    ..Default::default()
                },
            ),
            unit_amount: Some(amount_cents),
            ..Default::default()
        }),
        quantity: Some(1),
        ..Default::default()
    }]);

    let session = stripe_sdk::CheckoutSession::create(&client, cs_params)
        .await
        .map_err(|e| billing_error_msg(StatusCode::BAD_GATEWAY, "stripe_error", e.to_string()))?;

    let url = session
        .url
        .as_ref()
        .map(|u| u.to_string())
        .unwrap_or_default();
    if url.is_empty() {
        return Err(billing_error(
            StatusCode::BAD_GATEWAY,
            "stripe_checkout_missing_url",
            "Stripe checkout session was created without a redirect URL.",
        ));
    }

    let processing_resp = state
        .pg
        .from("campaign_offers")
        .eq("id", &offer_id)
        .update(json!({"payment_status": "processing", "stripe_checkout_session_id": session.id.to_string()}).to_string())
        .execute()
        .await;

    match processing_resp {
        Ok(resp) if !resp.status().is_success() => {
            let body = resp.text().await.unwrap_or_default();
            warn!(offer_id = %offer_id, status = %body, "failed to mark campaign offer as processing");
        }
        Err(e) => {
            warn!(offer_id = %offer_id, error = %e, "transport error marking campaign offer as processing");
        }
        _ => {}
    }

    info!(offer_id, "created campaign offer checkout session");
    Ok(Json(CampaignCheckoutResponse { url }))
}

#[derive(Debug, Serialize)]
pub struct AgencyBillingStatusResponse {
    pub agency_id: String,
    pub plan_tier: String,
    pub effective_plan_tier: String,
    pub display_plan_label: String,
    pub trial_start_at: Option<String>,
    pub trial_active: bool,
    pub trial_ends_at: Option<String>,
    pub subscription_status: String,
    pub has_paid_access: bool,
    pub has_pro_access: bool,
    pub can_apply_for_jobs: bool,
    pub can_connect_marketplace_creators: bool,
    pub can_use_brand_connections: bool,
    pub can_use_calendly: bool,
    pub stripe_customer_id: Option<String>,
    pub stripe_subscription_id: Option<String>,
    pub plan_updated_at: Option<String>,
    pub plan_interval: String,
    pub stripe_current_period_end: Option<String>,
    pub stripe_cancel_at_period_end: bool,
}

pub async fn get_agency_billing_status(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<AgencyBillingStatusResponse>, (StatusCode, String)> {
    let agency_access = team::require_agency_access(&state, &user).await?;
    let agency_id = agency_access.organization_id.clone();

    let access = crate::entitlements::get_agency_access_state(&state, &agency_id).await?;

    let resp = state
        .pg
        .from("agencies")
        .select("id,plan_tier,trial_ends_at,stripe_customer_id,stripe_subscription_id,plan_updated_at,plan_interval,stripe_current_period_end,stripe_cancel_at_period_end,created_at")
        .eq("id", &agency_id)
        .limit(1)
        .execute()
        .await
        .map_err(map_postgrest_transport_error)?;

    let status = resp.status();
    let text = resp.text().await.map_err(map_postgrest_transport_error)?;
    if !status.is_success() {
        return Err(crate::errors::sanitize_db_error(status.as_u16(), text));
    }

    let row = serde_json::from_str::<serde_json::Value>(&text)
        .ok()
        .and_then(|v| v.as_array().and_then(|a| a.first().cloned()))
        .unwrap_or(json!({}));

    fn parse_db_date(s: &str) -> Option<DateTime<Utc>> {
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

    let plan_tier_str = row
        .get("plan_tier")
        .and_then(|v| v.as_str())
        .unwrap_or("free")
        .to_string();

    let trial_start_at = row
        .get("created_at")
        .and_then(|v| v.as_str())
        .and_then(parse_db_date);

    let trial_ends_at_str = access.trial_ends_at.map(|dt| dt.to_rfc3339());

    let subscription_status = if access.has_paid_access() {
        "active".to_string()
    } else {
        "inactive".to_string()
    };

    let effective_plan_tier = match access.effective_tier {
        crate::entitlements::PlanTier::Enterprise => "enterprise",
        crate::entitlements::PlanTier::Pro => "pro",
        crate::entitlements::PlanTier::Basic => "basic",
        crate::entitlements::PlanTier::Free => "free",
    }
    .to_string();

    Ok(Json(AgencyBillingStatusResponse {
        agency_id,
        plan_tier: plan_tier_str,
        effective_plan_tier,
        display_plan_label: access.display_plan_label(),
        trial_start_at: trial_start_at.map(|dt| dt.to_rfc3339()),
        trial_active: access.trial_active,
        trial_ends_at: trial_ends_at_str,
        subscription_status,
        has_paid_access: access.has_paid_access(),
        has_pro_access: access.has_pro_access(),
        can_apply_for_jobs: access.has_paid_access(),
        can_connect_marketplace_creators: access.has_paid_access(),
        can_use_brand_connections: access.has_paid_access(),
        can_use_calendly: access.has_pro_access() && access.addon_irl_booking_enabled,
        stripe_customer_id: row
            .get("stripe_customer_id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        stripe_subscription_id: row
            .get("stripe_subscription_id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        plan_updated_at: row
            .get("plan_updated_at")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        plan_interval: row
            .get("plan_interval")
            .and_then(|v| v.as_str())
            .unwrap_or("month")
            .to_string(),
        stripe_current_period_end: row
            .get("stripe_current_period_end")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        stripe_cancel_at_period_end: row
            .get("stripe_cancel_at_period_end")
            .and_then(|v| v.as_bool())
            .unwrap_or(false),
    }))
}

pub async fn create_agency_billing_portal(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<AgencyCheckoutResponse>, (StatusCode, String)> {
    let agency_access =
        team::require_agency_permission(&state, &user, Permission::ManageBilling).await?;
    let agency_id = agency_access.organization_id.clone();
    let resp = state
        .pg
        .from("agencies")
        .select("stripe_customer_id")
        .eq("id", &agency_id)
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

    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    let row = rows
        .first()
        .ok_or((StatusCode::NOT_FOUND, "agency_not_found".to_string()))?;

    let customer_id_str = row
        .get("stripe_customer_id")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .ok_or((StatusCode::BAD_REQUEST, "no_stripe_customer".to_string()))?;

    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
    let customer_id = customer_id_str
        .parse::<stripe_sdk::CustomerId>()
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "invalid_customer_id".to_string(),
            )
        })?;

    let mut params = stripe_sdk::CreateBillingPortalSession::new(customer_id);
    // Use the AgencySubscribe page as return URL so they come back to the pricing view
    let return_url = format!(
        "{}/agency/subscribe",
        state.frontend_url.trim_end_matches('/')
    );
    params.return_url = Some(&return_url);

    match stripe_sdk::BillingPortalSession::create(&client, params).await {
        Ok(session) => Ok(Json(AgencyCheckoutResponse {
            checkout_url: session.url,
            seats_limit: None,
            invoice_id: None,
            invoice_status: None,
            invoice_url: None,
        })),
        Err(e) => {
            warn!(error = %e, agency_id = %agency_id, "failed to create stripe billing portal session");
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}

pub async fn create_brand_billing_portal(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<AgencyCheckoutResponse>, (StatusCode, String)> {
    if user.role != "brand" {
        return Err((StatusCode::FORBIDDEN, "brand_only".to_string()));
    }

    if state.stripe_secret_key.trim().is_empty() {
        return Err(billing_error(
            StatusCode::PRECONDITION_FAILED,
            "stripe_not_configured",
            "Stripe is not configured on the server.",
        ));
    }

    let row = get_brand_checkout_row(&state, &user.id).await?;
    let customer_id_str = row
        .get("stripe_customer_id")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .ok_or_else(|| {
            billing_error(
                StatusCode::BAD_REQUEST,
                "no_stripe_customer",
                "No Stripe customer found for this brand.",
            )
        })?;

    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
    let customer_id = customer_id_str
        .parse::<stripe_sdk::CustomerId>()
        .map_err(|_| {
            billing_error(
                StatusCode::INTERNAL_SERVER_ERROR,
                "invalid_customer_id",
                "Invalid Stripe customer ID.",
            )
        })?;

    let return_url = format!("{}/brandpricing", state.frontend_url.trim_end_matches('/'));
    let mut params = stripe_sdk::CreateBillingPortalSession::new(customer_id);
    params.return_url = Some(&return_url);

    match stripe_sdk::BillingPortalSession::create(&client, params).await {
        Ok(session) => Ok(Json(AgencyCheckoutResponse {
            checkout_url: session.url,
            seats_limit: None,
            invoice_id: None,
            invoice_status: None,
            invoice_url: None,
        })),
        Err(e) => {
            warn!(error = %e, brand_id = %user.id, "failed to create stripe billing portal session for brand");
            Err(billing_error_msg(
                StatusCode::BAD_GATEWAY,
                "stripe_error",
                e.to_string(),
            ))
        }
    }
}

pub async fn create_creator_billing_portal(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<CreatorCheckoutResponse>, (StatusCode, String)> {
    if user.role != "creator" {
        return Err(billing_error(
            StatusCode::FORBIDDEN,
            "creator_only",
            "Only creator accounts can perform this action.",
        ));
    }

    let creator_id = user.id.clone();
    let resp = state
        .pg
        .from("creators")
        .select("stripe_customer_id")
        .eq("id", &creator_id)
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

    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    let row = rows
        .first()
        .ok_or((StatusCode::NOT_FOUND, "creator_not_found".to_string()))?;

    let customer_id_str = row
        .get("stripe_customer_id")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .ok_or((StatusCode::BAD_REQUEST, "no_stripe_customer".to_string()))?;

    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
    let customer_id = customer_id_str
        .parse::<stripe_sdk::CustomerId>()
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "invalid_customer_id".to_string(),
            )
        })?;

    let mut params = stripe_sdk::CreateBillingPortalSession::new(customer_id);
    // Return to dashboard settings with the billing tab active
    let return_url = format!(
        "{}/CreatorDashboard?tab=billing",
        state.frontend_url.trim_end_matches('/')
    );
    params.return_url = Some(&return_url);

    match stripe_sdk::BillingPortalSession::create(&client, params).await {
        Ok(session) => Ok(Json(CreatorCheckoutResponse {
            checkout_url: session.url,
        })),
        Err(e) => {
            warn!(error = %e, creator_id = %creator_id, "failed to create stripe creator billing portal session");
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}
