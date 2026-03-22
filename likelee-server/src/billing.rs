use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::str::FromStr;
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
        let mut stripe_by_creator: std::collections::HashMap<String, String> = std::collections::HashMap::new();
        let mut name_by_creator: std::collections::HashMap<String, String> = std::collections::HashMap::new();
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
