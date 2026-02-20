use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tracing::{info, warn};

use crate::{auth::AuthUser, config::AppState};

#[derive(Debug, Default, Deserialize)]
pub struct AgencyCheckoutAddons {
    #[serde(default)]
    pub irl_booking: bool,

    // Optional quantities (0/None means disabled)
    pub deepfake_protection_models: Option<u32>,
    pub additional_team_members: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct AgencyCheckoutRequest {
    pub plan: String, // "basic" | "pro" | "enterprise" (enterprise is contact-sales only)
    pub roster_models: u32,
    #[serde(default)]
    pub addons: AgencyCheckoutAddons,
}

#[derive(Debug, Serialize)]
pub struct AgencyCheckoutResponse {
    pub checkout_url: String,
}

fn plan_to_price_id(state: &AppState, plan: &str) -> Option<String> {
    match plan.trim().to_lowercase().as_str() {
        "basic" => Some(state.stripe_agency_basic_base_price_id.clone()),
        "pro" => Some(state.stripe_agency_pro_base_price_id.clone()),
        _ => None,
    }
}

fn plan_to_price_env_var(plan: &str) -> Option<&'static str> {
    match plan.trim().to_lowercase().as_str() {
        "basic" => Some("STRIPE_AGENCY_BASIC_BASE_PRICE_ID"),
        "pro" => Some("STRIPE_AGENCY_PRO_BASE_PRICE_ID"),
        _ => None,
    }
}

pub async fn create_agency_subscription_checkout(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<AgencyCheckoutRequest>,
) -> Result<Json<AgencyCheckoutResponse>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "agency_only".to_string()));
    }

    // Enforce Enterprise/contact-sales when agency roster exceeds the supported self-serve limit.
    // Roster size is derived from the agency's actual talent roster, not the UI slider.
    let roster_resp = state
        .pg
        .from("agency_users")
        .select("id")
        .eq("agency_id", &user.id)
        .eq("role", "talent")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !roster_resp.status().is_success() {
        let err = roster_resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }
    let roster_text = roster_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let roster_rows: serde_json::Value =
        serde_json::from_str(&roster_text).unwrap_or(serde_json::json!([]));
    let roster_count = roster_rows.as_array().map(|a| a.len()).unwrap_or(0) as u32;
    if roster_count > 186 {
        return Err((
            StatusCode::BAD_REQUEST,
            "enterprise_contact_sales_roster_limit".to_string(),
        ));
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

    let base_price_id = plan_to_price_id(&state, &payload.plan)
        .ok_or((StatusCode::BAD_REQUEST, "invalid_plan".to_string()))?;
    if base_price_id.trim().is_empty() {
        let ev = plan_to_price_env_var(&payload.plan).unwrap_or("STRIPE_AGENCY_*_BASE_PRICE_ID");
        return Err((
            StatusCode::PRECONDITION_FAILED,
            format!("stripe_price_not_configured:{}", ev),
        ));
    }

    // Note: roster_models / addons are currently accepted for backwards compatibility.
    if state.stripe_checkout_success_url.trim().is_empty()
        || state.stripe_checkout_cancel_url.trim().is_empty()
    {
        return Err((
            StatusCode::PRECONDITION_FAILED,
            "stripe_checkout_urls_not_configured".to_string(),
        ));
    }

    // Fetch agency profile to reuse/create Stripe customer.
    let agency_resp = state
        .pg
        .from("agencies")
        .select("id,email,agency_name,stripe_customer_id")
        .eq("id", &user.id)
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

    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());

    // Create Stripe customer if missing.
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
            user.id.clone(),
        )]));

        let cust = stripe_sdk::Customer::create(&client, params)
            .await
            .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

        let cust_id = cust.id.to_string();

        let _ = state
            .pg
            .from("agencies")
            .eq("id", &user.id)
            .update(json!({"stripe_customer_id": cust_id}).to_string())
            .execute()
            .await;

        cust.id.to_string()
    };

    // Create a subscription checkout session.
    let mut cs_params = stripe_sdk::CreateCheckoutSession::new();
    cs_params.success_url = Some(state.stripe_checkout_success_url.as_str());
    cs_params.cancel_url = Some(state.stripe_checkout_cancel_url.as_str());
    cs_params.mode = Some(stripe_sdk::CheckoutSessionMode::Subscription);
    cs_params.customer = Some(customer_id.parse().map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "invalid_stripe_customer_id".to_string(),
        )
    })?);

    let line_items: Vec<stripe_sdk::CreateCheckoutSessionLineItems> =
        vec![stripe_sdk::CreateCheckoutSessionLineItems {
            price: Some(base_price_id.clone()),
            quantity: Some(1),
            ..Default::default()
        }];

    cs_params.line_items = Some(line_items);

    cs_params.client_reference_id = Some(user.id.as_str());

    // Also add metadata for redundancy.
    let mut md = std::collections::HashMap::new();
    md.insert("agency_id".to_string(), user.id.clone());
    md.insert("billing_domain".to_string(), "agency".to_string());
    md.insert("plan".to_string(), payload.plan.trim().to_lowercase());
    cs_params.metadata = Some(md);

    // Propagate agency_id onto the Subscription itself so subscription.* webhooks can be correlated.
    // (Stripe does not automatically copy Checkout Session metadata to the Subscription.)
    let mut sub_md = std::collections::HashMap::new();
    sub_md.insert("agency_id".to_string(), user.id.clone());
    sub_md.insert("billing_domain".to_string(), "agency".to_string());
    sub_md.insert("plan".to_string(), payload.plan.trim().to_lowercase());
    sub_md.insert(
        "roster_models".to_string(),
        payload.roster_models.to_string(),
    );
    sub_md.insert(
        "addon_irl_booking".to_string(),
        if payload.addons.irl_booking {
            "1".to_string()
        } else {
            "0".to_string()
        },
    );
    let deepfake_models = payload.addons.deepfake_protection_models.unwrap_or(0);
    let team_members = payload.addons.additional_team_members.unwrap_or(0);
    // Preserve the request payload for telemetry/debugging, but pricing is package-based.
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

    info!(agency_id = %user.id, plan = %payload.plan, roster_models = payload.roster_models, "created stripe subscription checkout session");
    Ok(Json(AgencyCheckoutResponse { checkout_url: url }))
}
