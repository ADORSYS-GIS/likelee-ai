use axum::{extract::State, http::StatusCode, Json};
use chrono::{DateTime, NaiveDateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::str::FromStr;
use std::time::Duration;
use tracing::{info, warn};

use crate::{auth::AuthUser, config::AppState};

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
        return Err((
            StatusCode::PRECONDITION_FAILED,
            "stripe_not_configured".to_string(),
        ));
    }

    if state.stripe_studio_success_url.trim().is_empty()
        || state.stripe_studio_cancel_url.trim().is_empty()
    {
        return Err((
            StatusCode::PRECONDITION_FAILED,
            "stripe_studio_checkout_urls_not_configured".to_string(),
        ));
    }

    // Validate that URLs are absolute (must have http:// or https://) to avoid Stripe rejecting them
    let success_url = state.stripe_studio_success_url.trim().to_string();
    let cancel_url = state.stripe_studio_cancel_url.trim().to_string();
    if !success_url.starts_with("http://") && !success_url.starts_with("https://") {
        return Err((
            StatusCode::PRECONDITION_FAILED,
            format!("stripe_studio_success_url is not an absolute URL: {success_url}"),
        ));
    }
    if !cancel_url.starts_with("http://") && !cancel_url.starts_with("https://") {
        return Err((
            StatusCode::PRECONDITION_FAILED,
            format!("stripe_studio_cancel_url is not an absolute URL: {cancel_url}"),
        ));
    }

    if payload.credits <= 0 {
        return Err((StatusCode::BAD_REQUEST, "invalid_credits".to_string()));
    }

    let stripe_price_id =
        studio_price_id_for_plan(&state, payload.plan_type.as_deref(), payload.credits)
            .unwrap_or_default();
    if stripe_price_id.trim().is_empty() {
        return Err((
            StatusCode::PRECONDITION_FAILED,
            "stripe_studio_price_ids_not_configured".to_string(),
        ));
    }

    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());

    // Studio credits are sold as one-time packs (CheckoutSessionMode::Payment).
    // A recurring price here will cause Stripe to reject the session creation.
    let price_id = stripe_sdk::PriceId::from_str(stripe_price_id.as_str())
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    let price = stripe_sdk::Price::retrieve(&client, &price_id, &[])
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
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

#[derive(Debug, Serialize)]
pub struct AgencyCheckoutResponse {
    pub checkout_url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub seats_limit: Option<i64>,
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
pub struct AgencyTrialStartResponse {
    pub trial_active: bool,
    pub trial_ends_at: Option<String>,
    pub display_plan_label: String,
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
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let agency_status = agency_resp.status();
    let agency_text = agency_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !agency_status.is_success() {
        return Err((StatusCode::INTERNAL_SERVER_ERROR, agency_text));
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
    let rel_resp = state
        .pg
        .from("agency_talent_relationships")
        .select("id")
        .eq("agency_id", agency_id)
        .eq("status", "active")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let rel_status = rel_resp.status();
    let rel_text = rel_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !rel_status.is_success() {
        return Err((StatusCode::INTERNAL_SERVER_ERROR, rel_text));
    }
    let rel_rows: Vec<serde_json::Value> = serde_json::from_str(&rel_text).unwrap_or_default();
    if !rel_rows.is_empty() {
        return Ok(rel_rows.len() as u32);
    }

    let legacy_resp = state
        .pg
        .from("agency_users")
        .select("id")
        .eq("agency_id", agency_id)
        .eq("role", "talent")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let legacy_status = legacy_resp.status();
    let legacy_text = legacy_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !legacy_status.is_success() {
        return Err((StatusCode::INTERNAL_SERVER_ERROR, legacy_text));
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
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))
}

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
}

async fn get_or_create_agency_billing_context(
    state: &AppState,
    agency_id: &str,
) -> Result<AgencyBillingContext, (StatusCode, String)> {
    let agency_resp = state
        .pg
        .from("agencies")
        .select("id,email,agency_name,stripe_customer_id,addon_irl_booking_enabled")
        .eq("id", agency_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = agency_resp.status();
    let text = agency_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        return Err((StatusCode::INTERNAL_SERVER_ERROR, text));
    }
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    if rows.is_empty() {
        return Err((
            StatusCode::NOT_FOUND,
            "agency_profile_not_found".to_string(),
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
            .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

        let cust_id = cust.id.to_string();

        let _ = state
            .pg
            .from("agencies")
            .eq("id", agency_id)
            .update(json!({"stripe_customer_id": cust_id}).to_string())
            .execute()
            .await;

        cust.id.to_string()
    };

    Ok(AgencyBillingContext {
        agency_name,
        customer_id,
        addon_irl_booking_enabled,
    })
}

pub async fn create_agency_subscription_checkout(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<AgencyCheckoutRequest>,
) -> Result<Json<AgencyCheckoutResponse>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "agency_only".to_string()));
    }

    if state.stripe_secret_key.trim().is_empty() {
        return Err((
            StatusCode::PRECONDITION_FAILED,
            "stripe_not_configured".to_string(),
        ));
    }

    if payload.roster_models < AGENCY_MIN_SELF_SERVE_ROSTER_MODELS {
        return Err((StatusCode::BAD_REQUEST, "invalid_roster_models".to_string()));
    }

    let normalized_plan = payload.plan.trim().to_lowercase();
    if normalized_plan == "enterprise" {
        return Err((
            StatusCode::BAD_REQUEST,
            "enterprise_contact_sales".to_string(),
        ));
    }

    let (_plan_name, base_plan_price_id, headcount_price_id, base_plan_env_var, headcount_env_var) =
        agency_plan_price_ids(&state, &normalized_plan, payload.interval.as_deref())
            .ok_or((StatusCode::BAD_REQUEST, "invalid_plan".to_string()))?;
    if base_plan_price_id.trim().is_empty() {
        return Err((
            StatusCode::PRECONDITION_FAILED,
            format!("stripe_price_not_configured:{base_plan_env_var}"),
        ));
    }
    if payload.addons.seats_in_plan && headcount_price_id.trim().is_empty() {
        return Err((
            StatusCode::PRECONDITION_FAILED,
            format!("stripe_price_not_configured:{headcount_env_var}"),
        ));
    }
    let roster_count = agency_roster_count(&state, &user.id).await?;
    if roster_count > AGENCY_MAX_SELF_SERVE_ROSTER_MODELS {
        return Err((
            StatusCode::BAD_REQUEST,
            format!("enterprise_contact_sales_roster_limit:{roster_count}"),
        ));
    }
    if payload.roster_models > AGENCY_MAX_SELF_SERVE_ROSTER_MODELS {
        return Err((
            StatusCode::BAD_REQUEST,
            format!(
                "enterprise_contact_sales_roster_limit:{}",
                payload.roster_models
            ),
        ));
    }
    if payload.roster_models < roster_count {
        return Err((
            StatusCode::BAD_REQUEST,
            format!("roster_models_below_current_roster:{roster_count}"),
        ));
    }

    if state.stripe_checkout_success_url.trim().is_empty()
        || state.stripe_checkout_cancel_url.trim().is_empty()
    {
        return Err((
            StatusCode::PRECONDITION_FAILED,
            "stripe_checkout_urls_not_configured".to_string(),
        ));
    }

    let billing_ctx = get_or_create_agency_billing_context(&state, &user.id).await?;
    let access = crate::entitlements::get_agency_access_state(&state, &user.id).await?;
    let is_annual = payload
        .interval
        .as_deref()
        .unwrap_or("month")
        .eq_ignore_ascii_case("year");
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
        return Err((
            StatusCode::PRECONDITION_FAILED,
            format!("stripe_price_not_configured:{irl_booking_env_var}"),
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
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "invalid_stripe_customer_id".to_string(),
        )
    })?);

    let mut line_items: Vec<stripe_sdk::CreateCheckoutSessionLineItems> =
        vec![recurring_price_line_item(base_plan_price_id, 1)];
    if payload.addons.seats_in_plan {
        line_items.push(recurring_price_line_item(
            headcount_price_id,
            payload.roster_models,
        ));
    }
    if include_irl_booking {
        line_items.push(recurring_price_line_item(irl_booking_price_id, 1));
    }

    cs_params.line_items = Some(line_items);

    cs_params.client_reference_id = Some(user.id.as_str());

    // Also add metadata for redundancy.
    let mut md = std::collections::HashMap::new();
    md.insert("agency_id".to_string(), user.id.clone());
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
    if payload.start_trial {
        if access.has_paid_access() {
            return Err((
                StatusCode::BAD_REQUEST,
                "trial_only_available_for_free_accounts".to_string(),
            ));
        }
        if !payload.agreement_accepted {
            return Err((
                StatusCode::BAD_REQUEST,
                "trial_agreement_required".to_string(),
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
    sub_md.insert("agency_id".to_string(), user.id.clone());
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
        trial_period_days: if payload.start_trial { Some(14) } else { None },
        metadata: Some(sub_md),
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

    info!(agency_id = %user.id, plan = %normalized_plan, roster_models = payload.roster_models, "created stripe subscription checkout session");
    Ok(Json(AgencyCheckoutResponse {
        checkout_url: url,
        seats_limit: None,
    }))
}

pub async fn change_agency_subscription_plan(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<AgencyCheckoutRequest>,
) -> Result<Json<AgencyPlanChangeResponse>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "agency_only".to_string()));
    }

    if state.stripe_secret_key.trim().is_empty() {
        return Err((
            StatusCode::PRECONDITION_FAILED,
            "stripe_not_configured".to_string(),
        ));
    }

    if payload.roster_models < AGENCY_MIN_SELF_SERVE_ROSTER_MODELS {
        return Err((StatusCode::BAD_REQUEST, "invalid_roster_models".to_string()));
    }

    let normalized_plan = payload.plan.trim().to_lowercase();
    if normalized_plan == "enterprise" {
        return Err((
            StatusCode::BAD_REQUEST,
            "enterprise_contact_sales".to_string(),
        ));
    }

    let (_plan_name, base_plan_price_id, headcount_price_id, base_plan_env_var, headcount_env_var) =
        agency_plan_price_ids(&state, &normalized_plan, payload.interval.as_deref())
            .ok_or((StatusCode::BAD_REQUEST, "invalid_plan".to_string()))?;
    if base_plan_price_id.trim().is_empty() {
        return Err((
            StatusCode::PRECONDITION_FAILED,
            format!("stripe_price_not_configured:{base_plan_env_var}"),
        ));
    }
    if payload.addons.seats_in_plan && headcount_price_id.trim().is_empty() {
        return Err((
            StatusCode::PRECONDITION_FAILED,
            format!("stripe_price_not_configured:{headcount_env_var}"),
        ));
    }

    let roster_count = agency_roster_count(&state, &user.id).await?;
    if roster_count > AGENCY_MAX_SELF_SERVE_ROSTER_MODELS {
        return Err((
            StatusCode::BAD_REQUEST,
            format!("enterprise_contact_sales_roster_limit:{roster_count}"),
        ));
    }
    if payload.roster_models > AGENCY_MAX_SELF_SERVE_ROSTER_MODELS {
        return Err((
            StatusCode::BAD_REQUEST,
            format!(
                "enterprise_contact_sales_roster_limit:{}",
                payload.roster_models
            ),
        ));
    }
    if payload.roster_models < roster_count {
        return Err((
            StatusCode::BAD_REQUEST,
            format!("roster_models_below_current_roster:{roster_count}"),
        ));
    }

    let billing_ctx = get_or_create_agency_billing_context(&state, &user.id).await?;
    let is_annual = payload
        .interval
        .as_deref()
        .unwrap_or("month")
        .eq_ignore_ascii_case("year");
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
            .eq("id", &user.id)
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
            return Err((StatusCode::INTERNAL_SERVER_ERROR, agency_text));
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
        return Err((
            StatusCode::BAD_REQUEST,
            "no_active_subscription_to_change".to_string(),
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
        return Err((StatusCode::BAD_REQUEST, "downgrade_not_allowed".to_string()));
    }

    let sub = crate::payouts::fetch_subscription(&state, &subscription_id)
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e))?;

    let include_irl_booking = payload.addons.irl_booking || billing_ctx.addon_irl_booking_enabled;
    if payload.addons.irl_booking
        && !billing_ctx.addon_irl_booking_enabled
        && irl_booking_price_id.trim().is_empty()
    {
        return Err((
            StatusCode::PRECONDITION_FAILED,
            format!("stripe_price_not_configured:{irl_booking_env_var}"),
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
    md.insert("agency_id".to_string(), user.id.clone());
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
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "invalid_subscription_id".to_string(),
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
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    crate::payouts::sync_agency_subscription_from_stripe(
        &state,
        &user.id,
        &subscription_id,
        Some(billing_ctx.customer_id.as_str()),
    )
    .await
    .map_err(|e| (StatusCode::BAD_GATEWAY, e))?;

    let latest_state = fetch_agency_checkout_sync_state(&state, &user.id).await?;

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
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "agency_only".to_string()));
    }

    if state.stripe_secret_key.trim().is_empty() {
        return Err((
            StatusCode::PRECONDITION_FAILED,
            "stripe_not_configured".to_string(),
        ));
    }

    if payload.seats < AGENCY_MIN_SELF_SERVE_ROSTER_MODELS {
        return Err((StatusCode::BAD_REQUEST, "invalid_roster_models".to_string()));
    }

    let roster_count = agency_roster_count(&state, &user.id).await?;
    if roster_count > AGENCY_MAX_SELF_SERVE_ROSTER_MODELS {
        return Err((
            StatusCode::BAD_REQUEST,
            format!("enterprise_contact_sales_roster_limit:{roster_count}"),
        ));
    }
    if payload.seats > AGENCY_MAX_SELF_SERVE_ROSTER_MODELS {
        return Err((
            StatusCode::BAD_REQUEST,
            format!("enterprise_contact_sales_roster_limit:{}", payload.seats),
        ));
    }
    if payload.seats < roster_count {
        return Err((
            StatusCode::BAD_REQUEST,
            format!("roster_models_below_current_roster:{roster_count}"),
        ));
    }

    if state.stripe_checkout_success_url.trim().is_empty()
        || state.stripe_checkout_cancel_url.trim().is_empty()
    {
        return Err((
            StatusCode::PRECONDITION_FAILED,
            "stripe_checkout_urls_not_configured".to_string(),
        ));
    }

    let billing_ctx = get_or_create_agency_billing_context(&state, &user.id).await?;
    let agency_resp = state
        .pg
        .from("agencies")
        .select("plan_tier,plan_interval")
        .eq("id", &user.id)
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
        return Err((StatusCode::INTERNAL_SERVER_ERROR, agency_text));
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

    let effective_plan = payload
        .plan
        .as_deref()
        .map(|value| value.trim().to_lowercase())
        .filter(|value| value == "basic" || value == "pro")
        .unwrap_or_else(|| {
            if current_plan_tier == "pro" {
                "pro".to_string()
            } else {
                "basic".to_string()
            }
        });
    let effective_interval = payload
        .interval
        .as_deref()
        .map(|value| value.trim().to_lowercase())
        .filter(|value| value == "month" || value == "year")
        .unwrap_or(current_plan_interval.clone());
    let (seat_price_id, seat_env_var) = agency_seat_price_id(
        &state,
        effective_plan.as_str(),
        Some(effective_interval.as_str()),
    )
    .ok_or((StatusCode::BAD_REQUEST, "invalid_plan".to_string()))?;
    if seat_price_id.trim().is_empty() {
        return Err((
            StatusCode::PRECONDITION_FAILED,
            format!("stripe_price_not_configured:{seat_env_var}"),
        ));
    }

    let subscriptions =
        list_customer_subscriptions_for_billing(&state, billing_ctx.customer_id.as_str()).await?;

    if let Some(existing_sub) =
        find_active_seat_addon_subscription(&state, &subscriptions, user.id.as_str())
    {
        let mut update_items: Vec<stripe_sdk::UpdateSubscriptionItems> = Vec::new();
        let mut seat_item_id: Option<String> = None;
        for item in existing_sub.items.data.iter() {
            let price_id = item
                .price
                .as_ref()
                .map(|price| price.id.to_string())
                .unwrap_or_default();
            if agency_headcount_price_id_matches(&state, price_id.as_str()) {
                seat_item_id = Some(item.id.to_string());
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
            id: seat_item_id,
            price: Some(seat_price_id.to_string()),
            quantity: Some(u64::from(payload.seats)),
            ..Default::default()
        });

        let mut md = existing_sub.metadata.clone();
        md.insert("agency_id".to_string(), user.id.clone());
        md.insert("billing_domain".to_string(), "agency".to_string());
        md.insert("subscription_kind".to_string(), "seat_addon".to_string());
        md.insert("plan".to_string(), effective_plan.clone());
        md.insert("billing_interval".to_string(), effective_interval.clone());
        md.insert("roster_models".to_string(), payload.seats.to_string());

        let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
        let parsed_subscription_id = existing_sub
            .id
            .to_string()
            .parse::<stripe_sdk::SubscriptionId>()
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "invalid_subscription_id".to_string(),
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
            .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

        crate::payouts::sync_agency_subscription_from_stripe(
            &state,
            &user.id,
            existing_sub.id.as_str(),
            Some(billing_ctx.customer_id.as_str()),
        )
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e))?;

        let latest_state = fetch_agency_checkout_sync_state(&state, &user.id).await?;
        return Ok(Json(AgencyCheckoutResponse {
            checkout_url: String::new(),
            seats_limit: Some(latest_state.seats_limit),
        }));
    }

    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
    let mut cs_params = stripe_sdk::CreateCheckoutSession::new();
    let success_url = agency_checkout_success_url(state.stripe_checkout_success_url.as_str());
    cs_params.success_url = Some(success_url.as_str());
    cs_params.cancel_url = Some(state.stripe_checkout_cancel_url.as_str());
    cs_params.mode = Some(stripe_sdk::CheckoutSessionMode::Subscription);
    cs_params.customer = Some(billing_ctx.customer_id.parse().map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "invalid_stripe_customer_id".to_string(),
        )
    })?);
    cs_params.line_items = Some(vec![recurring_price_line_item(
        seat_price_id,
        payload.seats,
    )]);
    cs_params.client_reference_id = Some(user.id.as_str());

    let mut md = std::collections::HashMap::new();
    md.insert("agency_id".to_string(), user.id.clone());
    md.insert("billing_domain".to_string(), "agency".to_string());
    md.insert("subscription_kind".to_string(), "seat_addon".to_string());
    md.insert("plan".to_string(), effective_plan.clone());
    md.insert("billing_interval".to_string(), effective_interval.clone());
    md.insert("roster_models".to_string(), payload.seats.to_string());
    cs_params.metadata = Some(md.clone());

    cs_params.subscription_data = Some(stripe_sdk::CreateCheckoutSessionSubscriptionData {
        metadata: Some(md),
        ..Default::default()
    });

    let session = stripe_sdk::CheckoutSession::create(&client, cs_params)
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    let url = session
        .url
        .as_ref()
        .map(|value| value.to_string())
        .unwrap_or_default();
    if url.is_empty() {
        return Err((
            StatusCode::BAD_GATEWAY,
            "stripe_checkout_missing_url".to_string(),
        ));
    }

    Ok(Json(AgencyCheckoutResponse {
        checkout_url: url,
        seats_limit: None,
    }))
}

pub async fn start_agency_pro_trial(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<AgencyTrialStartResponse>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "agency_only".to_string()));
    }

    let access = crate::entitlements::get_agency_access_state(&state, &user.id).await?;
    if access.trial_active {
        return Err((StatusCode::CONFLICT, "trial_already_active".to_string()));
    }
    if access.billed_tier != crate::entitlements::PlanTier::Free {
        return Err((
            StatusCode::BAD_REQUEST,
            "trial_only_available_for_free_accounts".to_string(),
        ));
    }

    let trial_ends_at = chrono::Utc::now() + chrono::Duration::days(14);
    let update = json!({
        "trial_ends_at": trial_ends_at.to_rfc3339(),
        "plan_updated_at": chrono::Utc::now().to_rfc3339(),
        "plan_interval": "month"
    });

    let resp = state
        .pg
        .from("agencies")
        .eq("id", &user.id)
        .update(update.to_string())
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
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "agency_only".to_string()));
    }

    if state.stripe_secret_key.trim().is_empty() {
        return Err((
            StatusCode::PRECONDITION_FAILED,
            "stripe_not_configured".to_string(),
        ));
    }
    if state.stripe_agency_irl_booking_price_id.trim().is_empty() {
        return Err((
            StatusCode::PRECONDITION_FAILED,
            "stripe_price_not_configured:STRIPE_AGENCY_IRL_BOOKING_PRICE_ID".to_string(),
        ));
    }
    if state.stripe_checkout_success_url.trim().is_empty()
        || state.stripe_checkout_cancel_url.trim().is_empty()
    {
        return Err((
            StatusCode::PRECONDITION_FAILED,
            "stripe_checkout_urls_not_configured".to_string(),
        ));
    }

    let billing_ctx = get_or_create_agency_billing_context(&state, &user.id).await?;
    if billing_ctx.addon_irl_booking_enabled {
        return Err((
            StatusCode::CONFLICT,
            "addon_irl_booking_already_enabled".to_string(),
        ));
    }

    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
    let mut cs_params = stripe_sdk::CreateCheckoutSession::new();
    let success_url = agency_checkout_success_url(state.stripe_checkout_success_url.as_str());
    cs_params.success_url = Some(success_url.as_str());
    cs_params.cancel_url = Some(state.stripe_checkout_cancel_url.as_str());
    cs_params.mode = Some(stripe_sdk::CheckoutSessionMode::Subscription);
    cs_params.customer = Some(billing_ctx.customer_id.parse().map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "invalid_stripe_customer_id".to_string(),
        )
    })?);
    cs_params.line_items = Some(vec![recurring_price_line_item(
        state.stripe_agency_irl_booking_price_id.as_str(),
        1,
    )]);
    cs_params.client_reference_id = Some(user.id.as_str());

    let mut md = std::collections::HashMap::new();
    md.insert("agency_id".to_string(), user.id.clone());
    md.insert("billing_domain".to_string(), "agency".to_string());
    md.insert(
        "subscription_kind".to_string(),
        "irl_booking_addon".to_string(),
    );
    md.insert("addon_irl_booking".to_string(), "1".to_string());
    cs_params.metadata = Some(md);

    let mut sub_md = std::collections::HashMap::new();
    sub_md.insert("agency_id".to_string(), user.id.clone());
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
        agency_id = %user.id,
        agency_name = %billing_ctx.agency_name,
        "created stripe IRL booking addon checkout session"
    );
    Ok(Json(AgencyCheckoutResponse {
        checkout_url: url,
        seats_limit: None,
    }))
}

pub async fn sync_agency_checkout_session(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<AgencyCheckoutSessionSyncRequest>,
) -> Result<Json<AgencyCheckoutSessionSyncResponse>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "agency_only".to_string()));
    }

    if state.stripe_secret_key.trim().is_empty() {
        return Err((
            StatusCode::PRECONDITION_FAILED,
            "stripe_not_configured".to_string(),
        ));
    }

    let session_id_raw = payload.session_id.trim();
    if session_id_raw.is_empty() {
        let agency_resp = state
            .pg
            .from("agencies")
            .select("stripe_subscription_id,stripe_customer_id")
            .eq("id", &user.id)
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
            return Err((StatusCode::INTERNAL_SERVER_ERROR, agency_text));
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
                fetch_agency_checkout_sync_state(&state, &user.id).await?,
            ));
        }

        crate::payouts::sync_agency_subscription_from_stripe(
            &state,
            &user.id,
            subscription_id.as_str(),
            customer_id.as_deref(),
        )
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e))?;

        return Ok(Json(
            fetch_agency_checkout_sync_state(&state, &user.id).await?,
        ));
    }

    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
    let session_id = session_id_raw
        .parse::<stripe_sdk::CheckoutSessionId>()
        .map_err(|_| (StatusCode::BAD_REQUEST, "invalid_session_id".to_string()))?;
    let session = stripe_sdk::CheckoutSession::retrieve(&client, &session_id, &[])
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

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
    if session_agency_id.is_empty() || session_agency_id != user.id {
        return Err((
            StatusCode::FORBIDDEN,
            "checkout_session_not_owned".to_string(),
        ));
    }

    let billing_domain = session
        .metadata
        .as_ref()
        .and_then(|m| m.get("billing_domain"))
        .map(|value| value.trim().to_lowercase())
        .unwrap_or_default();
    if !billing_domain.is_empty() && billing_domain != "agency" {
        return Err((
            StatusCode::BAD_REQUEST,
            "checkout_session_not_agency_billing".to_string(),
        ));
    }

    let subscription_id = session
        .subscription
        .as_ref()
        .map(|subscription| subscription.id().to_string())
        .unwrap_or_default();
    if subscription_id.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "checkout_session_missing_subscription".to_string(),
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
            &user.id,
            subscription_id.as_str(),
            customer_id.as_deref(),
        )
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e))?;

        latest_state = fetch_agency_checkout_sync_state(&state, &user.id).await?;

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
            tokio::time::sleep(Duration::from_millis(1500)).await;
        }
    }

    Ok(Json(latest_state))
}

#[derive(Debug, Serialize)]
pub struct CampaignCheckoutResponse {
    pub url: String,
}

pub async fn create_campaign_offer_checkout(
    State(state): State<AppState>,
    user: AuthUser,
    axum::extract::Path(offer_id): axum::extract::Path<String>,
) -> Result<Json<CampaignCheckoutResponse>, (StatusCode, String)> {
    if user.role != "brand" {
        return Err((StatusCode::FORBIDDEN, "brand_only".to_string()));
    }

    if state.stripe_secret_key.trim().is_empty() {
        return Err((
            StatusCode::PRECONDITION_FAILED,
            "stripe_not_configured".to_string(),
        ));
    }

    // 1. Fetch the campaign offer
    let offer_resp = state
        .pg
        .from("campaign_offers")
        .select("id,status,payment_status,target_type,target_id,billing_request_id,budget_snapshot")
        .eq("id", &offer_id)
        .eq("brand_id", &user.id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !offer_resp.status().is_success() {
        let err = offer_resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }
    let offer_text = offer_resp.text().await.unwrap_or_else(|_| "[]".into());
    let offer_rows: Vec<serde_json::Value> = serde_json::from_str(&offer_text).unwrap_or_default();
    let offer = offer_rows
        .first()
        .ok_or((StatusCode::NOT_FOUND, "offer_not_found".to_string()))?;

    let offer_status = offer.get("status").and_then(|v| v.as_str()).unwrap_or("");
    if offer_status != "contract_fully_signed" {
        return Err((
            StatusCode::BAD_REQUEST,
            "contract_must_be_fully_signed".to_string(),
        ));
    }

    let payment_status = offer
        .get("payment_status")
        .and_then(|v| v.as_str())
        .unwrap_or("unpaid");
    if payment_status != "unpaid" {
        return Err((
            StatusCode::BAD_REQUEST,
            "offer_already_paid_or_processing".to_string(),
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
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
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
            return Err((
                StatusCode::BAD_REQUEST,
                "Agency must connect a Stripe account before the brand can pay for this offer"
                    .to_string(),
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
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
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
            return Err((
                StatusCode::BAD_REQUEST,
                "At least one talent must be assigned before the brand can pay for this offer"
                    .to_string(),
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
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
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
            return Err((
                StatusCode::BAD_REQUEST,
                format!(
                    "The following creators must connect their Stripe account before the brand can pay: {}",
                    missing_stripe.join(", ")
                ),
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
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
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
            return Err((
                StatusCode::BAD_REQUEST,
                "Creator must connect a Stripe account before the brand can pay for this offer"
                    .to_string(),
            ));
        }
    }

    if target_type == "agency" && billing_request_id.is_empty() {
        match crate::brand_campaigns::ensure_campaign_billing_stub(&state, &offer_id).await {
            Ok(stub_id) => {
                billing_request_id = stub_id;
            }
            Err(e) => {
                return Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("failed_to_create_stub: {}", e),
                ));
            }
        }
    }

    if target_type == "agency" && billing_request_id.is_empty() {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            "missing_billing_stub_for_agency".to_string(),
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
        return Err((StatusCode::BAD_REQUEST, "invalid_budget".to_string()));
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
    cs_params.client_reference_id = Some(user.id.as_str());

    let mut md = std::collections::HashMap::new();
    md.insert("billing_domain".to_string(), "campaign_offer".to_string());
    md.insert("offer_id".to_string(), offer_id.clone());
    md.insert("target_type".to_string(), target_type.to_string());
    md.insert("target_id".to_string(), target_id.to_string());
    md.insert("brand_id".to_string(), user.id.clone());

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
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    let url = session
        .url
        .as_ref()
        .map(|u| u.to_string())
        .unwrap_or_default();
    if url.is_empty() {
        return Err((
            StatusCode::BAD_GATEWAY,
            "stripe_checkout_missing_url".to_string(),
        ));
    }

    // Mark as processing
    let _ = state
        .pg
        .from("campaign_offers")
        .eq("id", &offer_id)
        .update(json!({"payment_status": "processing", "stripe_checkout_session_id": session.id.to_string()}).to_string())
        .execute()
        .await;

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
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "agency_only".to_string()));
    }

    let agency_id = user.id.clone();
    let access = crate::entitlements::get_agency_access_state(&state, &agency_id).await?;

    let resp = state
        .pg
        .from("agencies")
        .select("id,plan_tier,trial_ends_at,stripe_customer_id,stripe_subscription_id,plan_updated_at,plan_interval,stripe_current_period_end,stripe_cancel_at_period_end,created_at")
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
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "agency_only".to_string()));
    }

    let agency_id = user.id.clone();
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
        })),
        Err(e) => {
            warn!(error = %e, agency_id = %agency_id, "failed to create stripe billing portal session");
            Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
        }
    }
}
