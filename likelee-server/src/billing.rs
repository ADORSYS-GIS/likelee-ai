use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tracing::{info, warn};

use crate::{auth::AuthUser, config::AppState};

#[derive(Debug, Deserialize)]
pub struct AgencyCheckoutRequest {
    pub tier: String, // "agency" | "scale"
}

#[derive(Debug, Serialize)]
pub struct AgencyCheckoutResponse {
    pub checkout_url: String,
}

fn tier_to_price_id(state: &AppState, tier: &str) -> Option<String> {
    match tier.trim().to_lowercase().as_str() {
        "agency" => Some(state.stripe_agency_price_id.clone()),
        "scale" => Some(state.stripe_scale_price_id.clone()),
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
    if state.stripe_secret_key.trim().is_empty() {
        return Err((
            StatusCode::PRECONDITION_FAILED,
            "stripe_not_configured".to_string(),
        ));
    }

    let price_id = tier_to_price_id(&state, &payload.tier)
        .ok_or((StatusCode::BAD_REQUEST, "invalid_tier".to_string()))?;
    if price_id.trim().is_empty() {
        return Err((
            StatusCode::PRECONDITION_FAILED,
            "stripe_price_not_configured".to_string(),
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

    cs_params.line_items = Some(vec![stripe_sdk::CreateCheckoutSessionLineItems {
        price: Some(price_id.clone()),
        quantity: Some(1),
        ..Default::default()
    }]);

    cs_params.client_reference_id = Some(user.id.as_str());

    // Also add metadata for redundancy.
    let mut md = std::collections::HashMap::new();
    md.insert("agency_id".to_string(), user.id.clone());
    md.insert("tier".to_string(), payload.tier.trim().to_lowercase());
    cs_params.metadata = Some(md);

    // Propagate agency_id onto the Subscription itself so subscription.* webhooks can be correlated.
    // (Stripe does not automatically copy Checkout Session metadata to the Subscription.)
    let mut sub_md = std::collections::HashMap::new();
    sub_md.insert("agency_id".to_string(), user.id.clone());
    sub_md.insert("tier".to_string(), payload.tier.trim().to_lowercase());
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

    info!(agency_id = %user.id, tier = %payload.tier, "created stripe subscription checkout session");
    Ok(Json(AgencyCheckoutResponse { checkout_url: url }))
}
