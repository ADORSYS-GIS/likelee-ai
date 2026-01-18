use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tracing::warn;

use crate::config::AppState;
use std::str::FromStr;
use stripe as stripe_sdk;

pub async fn create_onboarding_link(
    State(state): State<AppState>,
    Query(q): Query<ProfileQuery>,
) -> (StatusCode, Json<serde_json::Value>) {
    if !state.payouts_enabled {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"status":"error","error":"payouts_disabled"})),
        );
    }
    if state.stripe_secret_key.trim().is_empty() {
        return (
            StatusCode::PRECONDITION_FAILED,
            Json(json!({"status":"error","error":"stripe_not_configured"})),
        );
    }
    if q.profile_id.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"status":"error","error":"missing_profile_id"})),
        );
    }
    // Ensure profile exists and get existing account id if any
    let prof_resp = match state
        .pg
        .from("creators")
        .select("id,stripe_connect_account_id")
        .eq("id", &q.profile_id)
        .limit(1)
        .execute()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"status":"error","error":e.to_string()})),
            )
        }
    };
    let text = prof_resp.text().await.unwrap_or("[]".into());
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    if rows.is_empty() {
        return (
            StatusCode::NOT_FOUND,
            Json(json!({"status":"error","error":"profile_not_found"})),
        );
    }
    let mut account_id = rows[0]
        .get("stripe_connect_account_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());

    // Create account if missing
    if account_id.is_empty() {
        let mut params = stripe_sdk::CreateAccount::new();
        params.type_ = Some(stripe_sdk::AccountType::Standard);
        // Optional: set default currency/country if you want to constrain onboarding
        match stripe_sdk::Account::create(&client, params).await {
            Ok(acct) => {
                account_id = acct.id.to_string();
                // Persist on profile
                let body = json!({"stripe_connect_account_id": account_id});
                let _ = state
                    .pg
                    .from("creators")
                    .eq("id", &q.profile_id)
                    .update(body.to_string())
                    .execute()
                    .await;
            }
            Err(e) => {
                return (
                    StatusCode::BAD_GATEWAY,
                    Json(json!({"status":"error","error":e.to_string()})),
                )
            }
        }
    }

    // Create onboarding link
    let account_id_parsed = match account_id.parse::<stripe_sdk::AccountId>() {
        Ok(v) => v,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"status":"error","error":"invalid_account_id"})),
            )
        }
    };
    let mut link_params = stripe_sdk::CreateAccountLink::new(
        account_id_parsed,
        stripe_sdk::AccountLinkType::AccountOnboarding,
    );
    link_params.return_url = Some(state.stripe_onboarding_return_url.as_str());
    link_params.refresh_url = Some(state.stripe_onboarding_refresh_url.as_str());
    match stripe_sdk::AccountLink::create(&client, link_params).await {
        Ok(link) => (StatusCode::OK, Json(json!({"url": link.url}))),
        Err(e) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({"status":"error","error":e.to_string()})),
        ),
    }
}

#[derive(Deserialize)]
pub struct ProfileQuery {
    pub profile_id: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct BalanceRow {
    pub creator_id: String,
    pub currency: String,
    pub available_cents: i64,
    pub total_credits_cents: i64,
    pub total_debits_cents: i64,
    pub reserved_cents: i64,
}

#[derive(Deserialize)]
pub struct PayoutSettingsPayload {
    pub profile_id: String,
    pub preference: String, // "stripe", "paypal", "wise"
    pub paypal_email: Option<String>,
    pub wise_details: Option<serde_json::Value>,
}

pub async fn update_payout_settings(
    State(state): State<AppState>,
    Json(payload): Json<PayoutSettingsPayload>,
) -> (StatusCode, Json<serde_json::Value>) {
    if payload.profile_id.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"status":"error","error":"missing_profile_id"})),
        );
    }

    let valid_methods = ["stripe", "paypal", "wise"];
    if !valid_methods.contains(&payload.preference.as_str()) {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"status":"error","error":"invalid_preference"})),
        );
    }

    // First, fetch existing settings to merge
    let existing_resp = state
        .pg
        .from("creators")
        .select("payout_settings")
        .eq("id", &payload.profile_id)
        .limit(1)
        .execute()
        .await;

    let mut settings = match existing_resp {
        Ok(r) => {
            let text = r.text().await.unwrap_or("[]".to_string());
            let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
            rows.first()
                .and_then(|row| row.get("payout_settings"))
                .and_then(|v| v.as_object())
                .cloned()
                .unwrap_or_default()
        }
        Err(_) => serde_json::Map::new(),
    };

    // Merge new settings
    if let Some(email) = payload.paypal_email {
        settings.insert("paypal_email".to_string(), json!(email));
    }
    if let Some(details) = payload.wise_details {
        settings.insert("wise_details".to_string(), details);
    }

    let body = json!({
        "payout_method_preference": payload.preference,
        "payout_settings": settings
    });

    match state
        .pg
        .from("creators")
        .eq("id", &payload.profile_id)
        .update(body.to_string())
        .execute()
        .await
    {
        Ok(_) => (
            StatusCode::OK,
            Json(json!({
                "status": "ok",
                "preference": payload.preference,
                "settings": settings
            })),
        ),
        Err(e) => {
            warn!(error = %e, "Failed to update payout settings");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"status":"error","error": e.to_string()})),
            )
        }
    }
}

pub async fn get_account_status(
    State(state): State<AppState>,
    Query(q): Query<ProfileQuery>,
) -> (StatusCode, Json<serde_json::Value>) {
    if q.profile_id.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"status":"error","error":"missing_profile_id"})),
        );
    }
    let resp = match state
        .pg
        .from("creators")
        .select("id,stripe_connect_account_id,payouts_enabled,last_payout_error,payout_method_preference,payout_settings")
        .eq("id", &q.profile_id)
        .limit(1)
        .execute()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"status":"error","error":e.to_string()})),
            )
        }
    };
    let text = match resp.text().await {
        Ok(t) => t,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"status":"error","error":e.to_string()})),
            )
        }
    };
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    let row = rows.first().cloned().unwrap_or(json!({}));
    let connected = row
        .get("stripe_connect_account_id")
        .and_then(|v| v.as_str())
        .map(|s| !s.is_empty())
        .unwrap_or(false);
    let mut payouts_enabled = row
        .get("payouts_enabled")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let last_error = row
        .get("last_payout_error")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    // If connected, fetch live status from Stripe
    let mut transfers_enabled = false;
    if connected {
        if let Some(acct_id) = row
            .get("stripe_connect_account_id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
        {
            let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
            if let Ok(parsed) = acct_id.parse::<stripe_sdk::AccountId>() {
                match stripe_sdk::Account::retrieve(&client, &parsed, &[]).await {
                    Ok(acct) => {
                        payouts_enabled = payouts_enabled || acct.payouts_enabled.unwrap_or(false);
                        if let Some(caps) = acct.capabilities {
                            if let Some(tr) = caps.transfers {
                                transfers_enabled = tr == stripe_sdk::CapabilityStatus::Active;
                            }
                        }
                    }
                    Err(e) => warn!(error=%e, "stripe retrieve account failed"),
                }
            } else {
                warn!("invalid stripe account id in profile: {}", acct_id);
            }
        }
    }

    let preference = row
        .get("payout_method_preference")
        .and_then(|v| v.as_str())
        .unwrap_or("stripe")
        .to_string();

    let settings = row.get("payout_settings").cloned().unwrap_or(json!({}));

    // Check if configured
    let paypal_configured = settings
        .get("paypal_email")
        .and_then(|s| s.as_str())
        .map(|s| !s.is_empty())
        .unwrap_or(false);
    let wise_configured = settings
        .get("wise_details")
        .map(|obj| obj.is_object() && !obj.as_object().unwrap().is_empty())
        .unwrap_or(false);

    // If preference is NOT stripe, we consider "payouts_enabled" based on configuration
    // But we still return the stripe-specific flag as "stripe_payouts_enabled" for clarity
    let stripe_payouts_enabled = payouts_enabled;
    if preference == "paypal" {
        payouts_enabled = paypal_configured;
    } else if preference == "wise" {
        payouts_enabled = wise_configured;
    } else {
        payouts_enabled = stripe_payouts_enabled;
    }
    (
        StatusCode::OK,
        Json(json!({
            "connected": connected,
            "payouts_enabled": payouts_enabled,
            "stripe_payouts_enabled": stripe_payouts_enabled,
            "preference": preference,
            "paypal_configured": paypal_configured,
            "wise_configured": wise_configured,
            "settings": settings,
            "transfers_enabled": transfers_enabled,
            "last_error": last_error
        })),
    )
}

#[derive(Deserialize)]
pub struct BalanceQuery {
    pub profile_id: String,
}

pub async fn get_balance(
    State(state): State<AppState>,
    Query(q): Query<BalanceQuery>,
) -> (StatusCode, Json<serde_json::Value>) {
    if q.profile_id.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"status":"error","error":"missing_profile_id"})),
        );
    }
    let resp = match state
        .pg
        .from("creator_balances")
        .select("creator_id,currency,available_cents,total_credits_cents,total_debits_cents,reserved_cents")
        .eq("creator_id", &q.profile_id)
        .execute()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("relation") && msg.contains("does not exist") {
                warn!(%msg, "creator_balances view missing; defaulting zero");
                return (
                    StatusCode::OK,
                    Json(json!({"balances": [], "allowed_currencies": state.payout_allowed_currencies})),
                );
            }
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"status":"error","error":msg})),
            );
        }
    };
    let text = match resp.text().await {
        Ok(t) => t,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"status":"error","error":e.to_string()})),
            )
        }
    };
    let mut rows: Vec<BalanceRow> = serde_json::from_str(&text).unwrap_or_default();
    // filter to allowed currencies
    rows.retain(|r| {
        state
            .payout_allowed_currencies
            .iter()
            .any(|c| c == &r.currency.to_uppercase())
    });
    (
        StatusCode::OK,
        Json(json!({"balances": rows, "allowed_currencies": state.payout_allowed_currencies})),
    )
}

#[derive(Deserialize)]
pub struct PayoutRequestPayload {
    pub profile_id: String,
    pub amount_cents: i64,
    pub currency: Option<String>,
    pub payout_method: Option<String>, // "standard" | "instant"
}

pub async fn request_payout(
    State(state): State<AppState>,
    Json(payload): Json<PayoutRequestPayload>,
) -> (StatusCode, Json<serde_json::Value>) {
    if !state.payouts_enabled {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"status":"error","error":"payouts_disabled"})),
        );
    }
    if payload.profile_id.is_empty() || payload.amount_cents <= 0 {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"status":"error","error":"invalid_payload"})),
        );
    }
    let currency = payload
        .currency
        .unwrap_or_else(|| state.payout_currency.clone())
        .to_uppercase();
    if !state
        .payout_allowed_currencies
        .iter()
        .any(|c| c == &currency)
    {
        return (
            StatusCode::BAD_REQUEST,
            Json(
                json!({"status":"error","error":"unsupported_currency","allowed": state.payout_allowed_currencies}),
            ),
        );
    }
    if (payload.amount_cents as u32) < state.min_payout_amount_cents {
        return (
            StatusCode::BAD_REQUEST,
            Json(
                json!({"status":"error","error":"below_minimum","min_cents": state.min_payout_amount_cents}),
            ),
        );
    }

    // Validate payout method
    let method = payload
        .payout_method
        .unwrap_or_else(|| {
            if state.instant_payouts_enabled {
                "instant".to_string()
            } else {
                "standard".to_string()
            }
        })
        .to_lowercase();
    if method != "standard" && method != "instant" {
        return (
            StatusCode::BAD_REQUEST,
            Json(
                json!({"status":"error","error":"invalid_payout_method","allowed":["standard","instant"]}),
            ),
        );
    }
    if method == "instant" && !state.instant_payouts_enabled {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"status":"error","error":"instant_payouts_disabled"})),
        );
    }

    // Read available balance
    let bal_resp = match state
        .pg
        .from("creator_balances")
        .select("available_cents")
        .eq("creator_id", &payload.profile_id)
        .eq("currency", &currency)
        .limit(1)
        .execute()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"status":"error","error":e.to_string()})),
            )
        }
    };
    let text = bal_resp.text().await.unwrap_or("[]".to_string());
    let v: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    let available = v
        .first()
        .and_then(|r| r.get("available_cents").and_then(|x| x.as_i64()))
        .unwrap_or(0);
    if available < payload.amount_cents {
        return (
            StatusCode::BAD_REQUEST,
            Json(
                json!({"status":"error","error":"insufficient_funds","available_cents": available}),
            ),
        );
    }

    // Compute fee and initial status (auto-approve under threshold)
    let fee_cents = (payload.amount_cents * (state.payout_fee_bps as i64) + 9999) / 10000;
    let mut status = if (payload.amount_cents as u32) <= state.payout_auto_approve_threshold_cents {
        "approved"
    } else {
        "pending"
    };

    // Determine provider from preference
    let prof_resp = match state
        .pg
        .from("creators")
        .select("payout_method_preference")
        .eq("id", &payload.profile_id)
        .limit(1)
        .execute()
        .await
    {
        Ok(r) => r,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"status":"error"})),
            )
        }
    };

    let prof_text = prof_resp.text().await.unwrap_or("[]".into());
    let prof_rows: Vec<serde_json::Value> = serde_json::from_str(&prof_text).unwrap_or_default();
    let provider = prof_rows
        .first()
        .and_then(|r| r.get("payout_method_preference").and_then(|v| v.as_str()))
        .unwrap_or("stripe")
        .to_string();

    if provider != "stripe" {
        // Non-stripe providers are always pending manual approval/processing for now
        // Or if auto-approved, they enter "processing" state but won't be executed by Stripe logic
        if status == "approved" {
            status = "processing";
        }
    }

    let body = json!({
        "creator_id": payload.profile_id,
        "amount_cents": payload.amount_cents,
        "fee_cents": fee_cents,
        "currency": currency,
        "payout_method": method,
        "instant_fee_cents": 0,
        "status": status,
        "payout_provider": provider,
    });
    let ins = match state
        .pg
        .from("payout_requests")
        .insert(body.to_string())
        .execute()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"status":"error","error":e.to_string()})),
            )
        }
    };
    let text = ins.text().await.unwrap_or("[]".into());
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    let created = rows.first().cloned().unwrap_or(json!({"status":"ok"}));

    // If auto-approved (and Stripe), try to execute transfer
    if status == "approved" && provider == "stripe" {
        if let (Some(req_id), Some(profile_id)) = (
            created
                .get("id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            created
                .get("creator_id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
        ) {
            let _ = execute_payout(
                &state,
                &req_id,
                &profile_id,
                payload.amount_cents,
                fee_cents,
                &currency,
                &method,
            )
            .await;
        }
    }
    (
        StatusCode::OK,
        Json(json!({"status":"ok","payout_request": created})),
    )
}

async fn execute_payout(
    state: &AppState,
    payout_request_id: &str,
    profile_id: &str,
    amount_cents: i64,
    fee_cents: i64,
    currency: &str,
    method: &str,
) -> Result<(), ()> {
    // Get connected account id
    let resp = state
        .pg
        .from("creators")
        .select("stripe_connect_account_id")
        .eq("id", profile_id)
        .limit(1)
        .execute()
        .await
        .map_err(|_| ())?;
    let text = resp.text().await.unwrap_or("[]".into());
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    let account_id = rows
        .first()
        .and_then(|r| r.get("stripe_connect_account_id").and_then(|v| v.as_str()))
        .unwrap_or("")
        .to_string();
    if account_id.is_empty() {
        let _ = state
            .pg
            .from("payout_requests")
            .eq("id", payout_request_id)
            .update(
                json!({"status":"failed","failure_reason":"missing_connected_account"}).to_string(),
            )
            .execute()
            .await;
        return Err(());
    }

    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
    // Transfer net (amount - platform fee) to connected account
    let net_cents = amount_cents - fee_cents;
    if net_cents <= 0 {
        let _ = state
            .pg
            .from("payout_requests")
            .eq("id", payout_request_id)
            .update(json!({"status":"failed","failure_reason":"non_positive_net"}).to_string())
            .execute()
            .await;
        return Err(());
    }

    // Mark processing
    let _ = state
        .pg
        .from("payout_requests")
        .eq("id", payout_request_id)
        .update(json!({"status":"processing"}).to_string())
        .execute()
        .await;

    // Create a Transfer
    let currency_enum = match stripe_sdk::Currency::from_str(&currency.to_lowercase()) {
        Ok(c) => c,
        Err(_) => {
            let _ = state
                .pg
                .from("payout_requests")
                .eq("id", payout_request_id)
                .update(json!({"status":"failed","failure_reason":"invalid_currency"}).to_string())
                .execute()
                .await;
            return Err(());
        }
    };
    let mut params = stripe_sdk::CreateTransfer::new(currency_enum, account_id.clone());
    params.amount = Some(net_cents);
    match stripe_sdk::Transfer::create(&client, params).await {
        Ok(t) => {
            let _ = state
                .pg
                .from("payout_requests")
                .eq("id", payout_request_id)
                .update(json!({"stripe_transfer_id": t.id.to_string()}).to_string())
                .execute()
                .await;

            // If instant method requested, attempt an immediate payout from connected account
            if method == "instant" && state.instant_payouts_enabled {
                let payout_currency = match stripe_sdk::Currency::from_str(&currency.to_lowercase())
                {
                    Ok(c) => c,
                    Err(_) => {
                        let _ = state
                            .pg
                            .from("payout_requests")
                            .eq("id", payout_request_id)
                            .update(
                                json!({"status":"failed","failure_reason":"invalid_currency"})
                                    .to_string(),
                            )
                            .execute()
                            .await;
                        return Err(());
                    }
                };
                let mut payout_params = stripe_sdk::CreatePayout::new(net_cents, payout_currency);
                payout_params.method = Some(stripe_sdk::PayoutMethod::Instant);
                // Create payout on connected account (use special header)
                let connected_client = match account_id.parse::<stripe_sdk::AccountId>() {
                    Ok(id) => client.with_stripe_account(id),
                    Err(_) => {
                        let _ = state
                            .pg
                            .from("payout_requests")
                            .eq("id", payout_request_id)
                            .update(
                                json!({"status":"failed","failure_reason":"invalid_account_id"})
                                    .to_string(),
                            )
                            .execute()
                            .await;
                        return Err(());
                    }
                };
                match stripe_sdk::Payout::create(&connected_client, payout_params).await {
                    Ok(p) => {
                        let _ = state
                            .pg
                            .from("payout_requests")
                            .eq("id", payout_request_id)
                            .update(
                                json!({
                                    "stripe_payout_id": p.id.to_string(),
                                    // instant_fee_cents to be updated later from balance transaction via webhook (MVP: 0)
                                })
                                .to_string(),
                            )
                            .execute()
                            .await;
                        // Mark paid optimistically; webhooks will confirm
                        let _ = state
                            .pg
                            .from("payout_requests")
                            .eq("id", payout_request_id)
                            .update(json!({"status":"paid"}).to_string())
                            .execute()
                            .await;
                    }
                    Err(e) => {
                        let _ = state
                            .pg
                            .from("payout_requests")
                            .eq("id", payout_request_id)
                            .update(
                                json!({"status":"failed","failure_reason": e.to_string()})
                                    .to_string(),
                            )
                            .execute()
                            .await;
                        return Err(());
                    }
                }
            } else {
                // Standard schedule: leave as processing; webhooks/cron can mark paid later
            }
            Ok(())
        }
        Err(e) => {
            let _ = state
                .pg
                .from("payout_requests")
                .eq("id", payout_request_id)
                .update(json!({"status":"failed","failure_reason": e.to_string()}).to_string())
                .execute()
                .await;
            Err(())
        }
    }
}

pub async fn get_history(
    State(state): State<AppState>,
    Query(q): Query<ProfileQuery>,
) -> (StatusCode, Json<serde_json::Value>) {
    if q.profile_id.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"status":"error","error":"missing_profile_id"})),
        );
    }
    let resp = match state
        .pg
        .from("payout_requests")
        .select("id,amount_cents,fee_cents,instant_fee_cents,payout_method,currency,status,created_at,stripe_transfer_id,stripe_payout_id,failure_reason")
        .eq("creator_id", &q.profile_id)
        .order("created_at.desc")
        .execute()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"status":"error","error":e.to_string()})),
            )
        }
    };
    let text = resp.text().await.unwrap_or("[]".into());
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    (StatusCode::OK, Json(json!({"items": rows})))
}

pub async fn stripe_webhook(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    body: axum::body::Bytes,
) -> (StatusCode, Json<serde_json::Value>) {
    let sig = match headers
        .get("Stripe-Signature")
        .and_then(|v| v.to_str().ok())
    {
        Some(s) => s.to_string(),
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"status":"error","error":"missing_signature"})),
            )
        }
    };
    let payload = String::from_utf8_lossy(&body).to_string();
    let event =
        match stripe_sdk::Webhook::construct_event(&payload, &sig, &state.stripe_webhook_secret) {
            Ok(e) => e,
            Err(e) => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(json!({"status":"error","error":e.to_string()})),
                )
            }
        };
    // Store raw event
    let body = json!({
        "provider": "stripe",
        "event_type": event.type_.to_string(),
        "payload": serde_json::from_str::<serde_json::Value>(&payload).unwrap_or(json!({}))
    });
    let _ = state
        .pg
        .from("webhook_events")
        .insert(body.to_string())
        .execute()
        .await;

    // Minimal handlers
    let etype = event.type_.to_string();
    match etype.as_str() {
        // Connected Account status updates
        "account.updated" => {
            if let stripe_sdk::EventObject::Account(acct) = event.data.object {
                let account_id = acct.id.to_string();
                let payouts_enabled = acct.payouts_enabled.unwrap_or(false);
                let disabled_reason = acct
                    .requirements
                    .and_then(|r| r.disabled_reason)
                    .unwrap_or_default();
                if !account_id.is_empty() {
                    let _ = state
                        .pg
                        .from("creators")
                        .eq("stripe_connect_account_id", account_id)
                        .update(
                            json!({
                                "payouts_enabled": payouts_enabled,
                                "last_payout_error": disabled_reason
                            })
                            .to_string(),
                        )
                        .execute()
                        .await;
                }
            }
        }
        // Transfer lifecycle
        "transfer.created" => {
            if let stripe_sdk::EventObject::Transfer(t) = event.data.object {
                let tid = t.id.to_string();
                let _ = state
                    .pg
                    .from("payout_requests")
                    .eq("stripe_transfer_id", tid)
                    .update(json!({"status":"processing"}).to_string())
                    .execute()
                    .await;
            }
        }
        "transfer.reversed" => {
            if let stripe_sdk::EventObject::Transfer(t) = event.data.object {
                let tid = t.id.to_string();
                let _ = state
                    .pg
                    .from("payout_requests")
                    .eq("stripe_transfer_id", tid)
                    .update(
                        json!({"status":"failed","failure_reason":"transfer_reversed"}).to_string(),
                    )
                    .execute()
                    .await;
            }
        }
        // Payout lifecycle on connected accounts
        "payout.paid" | "payout.failed" | "payout.canceled" | "payout.created" => {
            let is_paid = etype == "payout.paid";
            let is_failed = etype == "payout.failed";
            let is_canceled = etype == "payout.canceled";
            let maybe_account = event.account.clone().map(|a| a.to_string());
            if let stripe_sdk::EventObject::Payout(p) = event.data.object.clone() {
                let pid = p.id.to_string();
                let mut update = serde_json::Map::new();
                if is_paid {
                    update.insert("status".into(), json!("paid"));
                }
                if is_failed {
                    update.insert("status".into(), json!("failed"));
                }
                if is_canceled {
                    update.insert("status".into(), json!("canceled"));
                }
                update.insert("stripe_payout_id".into(), json!(pid));
                if let (Some(btx), Some(acct_id)) = (p.balance_transaction, maybe_account) {
                    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
                    let connected_client = match acct_id.parse::<stripe_sdk::AccountId>() {
                        Ok(id) => client.with_stripe_account(id),
                        Err(_) => client, // fallback: use platform client, retrieval may fail but won't panic
                    };
                    let maybe_id = match btx {
                        stripe_sdk::Expandable::Id(id) => Some(id),
                        stripe_sdk::Expandable::Object(obj) => Some(obj.id),
                    };
                    if let Some(id) = maybe_id {
                        if let Ok(bt) =
                            stripe_sdk::BalanceTransaction::retrieve(&connected_client, &id, &[])
                                .await
                        {
                            let fee = bt.fee.abs();
                            update.insert("instant_fee_cents".into(), json!(fee));
                        }
                    }
                }
                let _ = state
                    .pg
                    .from("payout_requests")
                    .eq("stripe_payout_id", pid)
                    .update(serde_json::Value::Object(update).to_string())
                    .execute()
                    .await;
            }
        }
        _ => {}
    }

    (StatusCode::OK, Json(json!({"status":"ok"})))
}
