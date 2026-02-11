use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tracing::{info, warn};

use crate::auth::AuthUser;
use crate::auth::RoleGuard;
use crate::config::AppState;
use std::str::FromStr;
// use stripe_sdk; // Implicitly available

async fn resolve_talent_creator_id(
    state: &AppState,
    user: &AuthUser,
) -> Result<String, (StatusCode, String)> {
    RoleGuard::new(vec!["creator", "talent"]).check(&user.role)?;
    let resp = state
        .pg
        .from("agency_users")
        .select("creator_id,user_id")
        .or(format!("creator_id.eq.{},user_id.eq.{}", user.id, user.id))
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !resp.status().is_success() {
        let txt = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, txt));
    }
    let txt = resp.text().await.unwrap_or("[]".into());
    let rows: Vec<serde_json::Value> = serde_json::from_str(&txt).unwrap_or_default();
    let first = rows.first().cloned().unwrap_or(json!({}));
    let cid = first
        .get("creator_id")
        .and_then(|v| v.as_str())
        .or_else(|| first.get("user_id").and_then(|v| v.as_str()))
        .unwrap_or("")
        .to_string();
    if cid.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "talent_creator_id_not_found".to_string()));
    }
    Ok(cid)
}

pub async fn get_my_account_status(
    State(state): State<AppState>,
    user: AuthUser,
) -> (StatusCode, Json<serde_json::Value>) {
    let profile_id = match resolve_talent_creator_id(&state, &user).await {
        Ok(v) => v,
        Err((code, msg)) => return (code, Json(json!({"status":"error","error":msg}))),
    };
    get_account_status(State(state), Query(ProfileQuery { profile_id })).await
}

pub async fn create_my_onboarding_link(
    State(state): State<AppState>,
    user: AuthUser,
) -> (StatusCode, Json<serde_json::Value>) {
    let profile_id = match resolve_talent_creator_id(&state, &user).await {
        Ok(v) => v,
        Err((code, msg)) => return (code, Json(json!({"status":"error","error":msg}))),
    };
    create_onboarding_link(State(state), Query(ProfileQuery { profile_id })).await
}

fn extract_bank_last4(acct: &stripe_sdk::Account) -> Option<String> {
    for ea in acct.external_accounts.data.iter() {
        if let stripe_sdk::ExternalAccount::BankAccount(ba) = ea {
            if let Some(last4) = ba.last4.as_ref() {
                if !last4.trim().is_empty() {
                    return Some(last4.clone());
                }
            }
        }
    }
    None
}

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
        params.type_ = Some(stripe_sdk::AccountType::Express);
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
    link_params.return_url = Some(state.stripe_return_url.as_str());
    link_params.refresh_url = Some(state.stripe_refresh_url.as_str());
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
        .select("id,stripe_connect_account_id,payouts_enabled,last_payout_error")
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
    if rows.is_empty() {
        return (
            StatusCode::NOT_FOUND,
            Json(json!({
                "status":"error",
                "error":"profile_not_found",
                "message":"No creator profile row found for this profile_id. Use the agency endpoints (/api/agency/payouts/*) for agency bank connection."
            })),
        );
    }
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
    let mut bank_last4: Option<String> = None;
    if connected {
        if let Some(acct_id) = row
            .get("stripe_connect_account_id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
        {
            let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
            if let Ok(parsed) = acct_id.parse::<stripe_sdk::AccountId>() {
                match stripe_sdk::Account::retrieve(&client, &parsed, &["external_accounts"]).await
                {
                    Ok(acct) => {
                        payouts_enabled = payouts_enabled || acct.payouts_enabled.unwrap_or(false);
                        if let Some(ref caps) = acct.capabilities {
                            if let Some(tr) = caps.transfers {
                                transfers_enabled = tr == stripe_sdk::CapabilityStatus::Active;
                            }
                        }
                        bank_last4 = extract_bank_last4(&acct);
                    }
                    Err(e) => warn!(error=%e, "stripe retrieve account failed"),
                }
            } else {
                warn!("invalid stripe account id in profile: {}", acct_id);
            }
        }
    }
    (
        StatusCode::OK,
        Json(json!({
            "connected": connected,
            "payouts_enabled": payouts_enabled,
            "transfers_enabled": transfers_enabled,
            "last_error": last_error,
            "bank_last4": bank_last4
        })),
    )
}

pub async fn create_agency_onboarding_link(
    State(state): State<AppState>,
    user: AuthUser,
) -> (StatusCode, Json<serde_json::Value>) {
    info!("Creating agency onboarding link for user: {}", user.id);
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

    let agency_resp = match state
        .pg
        .from("agencies")
        .select("id,stripe_connect_account_id")
        .eq("id", &user.id)
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
    let status = agency_resp.status();
    let text = agency_resp.text().await.unwrap_or_default();
    if !status.is_success() {
        // Most likely the agencies table is missing the Stripe columns (migration not applied)
        if text.contains("does not exist")
            && (text.contains("stripe_connect_account_id")
                || text.contains("payouts_enabled")
                || text.contains("last_payout_error"))
        {
            return (
                StatusCode::PRECONDITION_FAILED,
                Json(json!({
                    "status":"error",
                    "error":"agency_schema_outdated",
                    "message":"Database schema is missing Stripe Connect columns on public.agencies. Please apply migration supabase/migrations/0013_agency_stripe_connect.sql and restart the server."
                })),
            );
        }
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"status":"error","error":text})),
        );
    }
    let mut rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    if rows.is_empty() {
        // Self-heal: if the authenticated user has no agencies row, create a minimal profile row.
        // This keeps Stripe Connect state anchored to a stable agency record.
        let email = match user.email.as_deref() {
            Some(e) if !e.trim().is_empty() => e,
            _ => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(json!({
                        "status":"error",
                        "error":"agency_profile_missing_email",
                        "message":"Authenticated user has no email in token claims; cannot auto-create agency profile row. Please complete agency registration first."
                    })),
                )
            }
        };

        let minimal_agency = json!({
            "id": user.id,
            "agency_name": "Agency",
            "email": email,
            "status": "active",
            "onboarding_step": "complete"
        });
        let insert_resp = state
            .pg
            .from("agencies")
            .auth(state.supabase_service_key.clone())
            .insert(minimal_agency.to_string())
            .execute()
            .await;
        if let Err(e) = insert_resp {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"status":"error","error":e.to_string()})),
            );
        }

        // Re-fetch after insertion
        let agency_resp = match state
            .pg
            .from("agencies")
            .select("id,stripe_connect_account_id")
            .eq("id", &user.id)
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
        let status = agency_resp.status();
        let text = agency_resp.text().await.unwrap_or_default();
        if !status.is_success() {
            if text.contains("does not exist")
                && (text.contains("stripe_connect_account_id")
                    || text.contains("payouts_enabled")
                    || text.contains("last_payout_error"))
            {
                return (
                    StatusCode::PRECONDITION_FAILED,
                    Json(json!({
                        "status":"error",
                        "error":"agency_schema_outdated",
                        "message":"Database schema is missing Stripe Connect columns on public.agencies. Please apply migration supabase/migrations/0013_agency_stripe_connect.sql and restart the server."
                    })),
                );
            }
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"status":"error","error":text})),
            );
        }
        rows = serde_json::from_str(&text).unwrap_or_default();
        if rows.is_empty() {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "status":"error",
                    "error":"agency_profile_create_failed",
                    "message":"Failed to auto-create agency profile row."
                })),
            );
        }
    }

    let mut account_id = rows[0]
        .get("stripe_connect_account_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());

    if account_id.is_empty() {
        let mut params = stripe_sdk::CreateAccount::new();
        params.type_ = Some(stripe_sdk::AccountType::Express);
        match stripe_sdk::Account::create(&client, params).await {
            Ok(acct) => {
                account_id = acct.id.to_string();
                let body = json!({"stripe_connect_account_id": account_id});
                let _ = state
                    .pg
                    .from("agencies")
                    .eq("id", &user.id)
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
    link_params.return_url = Some(state.stripe_return_url.as_str());
    link_params.refresh_url = Some(state.stripe_refresh_url.as_str());
    match stripe_sdk::AccountLink::create(&client, link_params).await {
        Ok(link) => (StatusCode::OK, Json(json!({"url": link.url}))),
        Err(e) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({"status":"error","error":e.to_string()})),
        ),
    }
}

pub async fn get_agency_account_status(
    State(state): State<AppState>,
    user: AuthUser,
) -> (StatusCode, Json<serde_json::Value>) {
    let resp = match state
        .pg
        .from("agencies")
        .select("id,stripe_connect_account_id,payouts_enabled,last_payout_error")
        .eq("id", &user.id)
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
    let status = resp.status();
    let text = match resp.text().await {
        Ok(t) => t,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"status":"error","error":e.to_string()})),
            )
        }
    };
    if !status.is_success() {
        if text.contains("does not exist")
            && (text.contains("stripe_connect_account_id")
                || text.contains("payouts_enabled")
                || text.contains("last_payout_error"))
        {
            return (
                StatusCode::PRECONDITION_FAILED,
                Json(json!({
                    "status":"error",
                    "error":"agency_schema_outdated",
                    "message":"Database schema is missing Stripe Connect columns on public.agencies. Please apply migration supabase/migrations/0013_agency_stripe_connect.sql and restart the server."
                })),
            );
        }
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"status":"error","error":text})),
        );
    }
    let mut rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    if rows.is_empty() {
        // Mirror onboarding behavior: try to self-heal by creating a minimal agencies row.
        // This avoids "agency_not_found" when the user is authenticated but profile creation was skipped.
        let email = match user.email.as_deref() {
            Some(e) if !e.trim().is_empty() => e,
            _ => "",
        };

        if !email.is_empty() {
            let minimal_agency = json!({
                "id": user.id,
                "agency_name": "Agency",
                "email": email,
                "status": "active",
                "onboarding_step": "complete"
            });
            let _ = state
                .pg
                .from("agencies")
                .auth(state.supabase_service_key.clone())
                .insert(minimal_agency.to_string())
                .execute()
                .await;

            // Re-fetch
            if let Ok(r) = state
                .pg
                .from("agencies")
                .select("id,stripe_connect_account_id,payouts_enabled,last_payout_error")
                .eq("id", &user.id)
                .limit(1)
                .execute()
                .await
            {
                if let Ok(t) = r.text().await {
                    rows = serde_json::from_str(&t).unwrap_or_default();
                }
            }
        }
    }
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

    let mut transfers_enabled = false;
    let mut bank_last4: Option<String> = None;
    if connected {
        if let Some(acct_id) = row
            .get("stripe_connect_account_id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
        {
            let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
            if let Ok(parsed) = acct_id.parse::<stripe_sdk::AccountId>() {
                match stripe_sdk::Account::retrieve(&client, &parsed, &["external_accounts"]).await
                {
                    Ok(acct) => {
                        payouts_enabled = payouts_enabled || acct.payouts_enabled.unwrap_or(false);
                        if let Some(ref caps) = acct.capabilities {
                            if let Some(tr) = caps.transfers {
                                transfers_enabled = tr == stripe_sdk::CapabilityStatus::Active;
                            }
                        }
                        bank_last4 = extract_bank_last4(&acct);
                    }
                    Err(e) => warn!(error=%e, "stripe retrieve account failed"),
                }
            } else {
                warn!("invalid stripe account id in agency: {}", acct_id);
            }
        }
    }

    (
        StatusCode::OK,
        Json(json!({
            "connected": connected,
            "payouts_enabled": payouts_enabled,
            "transfers_enabled": transfers_enabled,
            "last_error": last_error,
            "bank_last4": bank_last4
        })),
    )
}

#[derive(Deserialize)]
pub struct BalanceQuery {
    pub profile_id: String,
}

pub async fn get_my_balance(
    State(state): State<AppState>,
    user: AuthUser,
) -> (StatusCode, Json<serde_json::Value>) {
    get_balance(
        State(state),
        Query(BalanceQuery {
            profile_id: user.id,
        }),
    )
    .await
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

#[derive(Deserialize)]
pub struct MyPayoutRequestPayload {
    pub amount_cents: i64,
    pub currency: Option<String>,
    pub payout_method: Option<String>, // "standard" | "instant"
}

pub async fn request_my_payout(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<MyPayoutRequestPayload>,
) -> (StatusCode, Json<serde_json::Value>) {
    request_payout(
        State(state),
        Json(PayoutRequestPayload {
            profile_id: user.id,
            amount_cents: payload.amount_cents,
            currency: payload.currency,
            payout_method: payload.payout_method,
        }),
    )
    .await
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
    let status = if (payload.amount_cents as u32) <= state.payout_auto_approve_threshold_cents {
        "approved"
    } else {
        "pending"
    };

    let body = json!({
        "creator_id": payload.profile_id,
        "amount_cents": payload.amount_cents,
        "fee_cents": fee_cents,
        "currency": currency,
        "payout_method": method,
        "instant_fee_cents": 0,
        "status": status,
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

    // If auto-approved, try to execute transfer (and instant payout if requested)
    if status == "approved" {
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
    let payload_json: serde_json::Value =
        serde_json::from_str(&payload).unwrap_or_else(|_| json!({}));

    // Verify Stripe signature without relying on full event deserialization.
    // Some Stripe event payloads may include fields that newer API versions add,
    // which can cause async-stripe's Event struct deserialization to fail.
    if let Err(e) = verify_stripe_signature(&payload, &sig, &state.stripe_webhook_secret) {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"status":"error","error":e})),
        );
    }

    // Best-effort: also parse into typed Event to support Connect/payout handling.
    // If this fails, we still process subscription events from raw JSON.
    let typed_event: Option<stripe_sdk::Event> = serde_json::from_str(&payload).ok();
    let etype = payload_json
        .get("type")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    // Store raw event
    let body = json!({
        "provider": "stripe",
        "event_type": etype,
        "payload": serde_json::from_str::<serde_json::Value>(&payload).unwrap_or(json!({}))
    });
    let _ = state
        .pg
        .from("webhook_events")
        .insert(body.to_string())
        .execute()
        .await;

    // Minimal handlers
    match etype.as_str() {
        // ====================================================================
        // Subscriptions (Agency billing)
        // ====================================================================
        // Checkout completion gives us a subscription id, but the plan tier should be
        // derived from the subscription items/price id.
        "checkout.session.completed" => {
            let obj = payload_json
                .get("data")
                .and_then(|d| d.get("object"))
                .cloned()
                .unwrap_or(json!({}));

            let agency_id = obj
                .get("client_reference_id")
                .and_then(|v| v.as_str())
                .or_else(|| {
                    obj.get("metadata")
                        .and_then(|m| m.get("agency_id"))
                        .and_then(|v| v.as_str())
                })
                .unwrap_or("")
                .to_string();

            let subscription_id = obj
                .get("subscription")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let customer_id = obj
                .get("customer")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            if !agency_id.is_empty() && !subscription_id.is_empty() {
                let _ = sync_agency_subscription_from_stripe(
                    &state,
                    &agency_id,
                    &subscription_id,
                    if customer_id.is_empty() {
                        None
                    } else {
                        Some(customer_id.as_str())
                    },
                )
                .await;
            }
        }
        "customer.subscription.created"
        | "customer.subscription.updated"
        | "customer.subscription.deleted" => {
            let obj = payload_json
                .get("data")
                .and_then(|d| d.get("object"))
                .cloned()
                .unwrap_or(json!({}));

            let subscription_id = obj.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let customer_id = obj
                .get("customer")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let agency_id = obj
                .get("metadata")
                .and_then(|m| m.get("agency_id"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            if !agency_id.is_empty() && !subscription_id.trim().is_empty() {
                let _ = sync_agency_subscription_from_stripe(
                    &state,
                    &agency_id,
                    subscription_id,
                    if customer_id.is_empty() {
                        None
                    } else {
                        Some(customer_id.as_str())
                    },
                )
                .await;
            }
        }
        "invoice.paid" => {
            let obj = payload_json
                .get("data")
                .and_then(|d| d.get("object"))
                .cloned()
                .unwrap_or(json!({}));

            let subscription_id = obj
                .get("subscription")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let customer_id = obj
                .get("customer")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            if !subscription_id.is_empty() {
                // We may not have agency_id on invoice; fetch subscription and read metadata.
                let _ = sync_agency_subscription_by_subscription_id(
                    &state,
                    &subscription_id,
                    if customer_id.is_empty() {
                        None
                    } else {
                        Some(customer_id.as_str())
                    },
                )
                .await;
            }
        }
        // Connected Account status updates
        "account.updated" => {
            if let Some(event) = typed_event {
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
        }
        // Transfer lifecycle
        "transfer.created" => {
            if let Some(event) = typed_event {
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
        }
        "transfer.reversed" => {
            if let Some(event) = typed_event {
                if let stripe_sdk::EventObject::Transfer(t) = event.data.object {
                    let tid = t.id.to_string();
                    let _ = state
                        .pg
                        .from("payout_requests")
                        .eq("stripe_transfer_id", tid)
                        .update(
                            json!({"status":"failed","failure_reason":"transfer_reversed"})
                                .to_string(),
                        )
                        .execute()
                        .await;
                }
            }
        }
        // Payout lifecycle on connected accounts
        "payout.paid" | "payout.failed" | "payout.canceled" | "payout.created" => {
            let is_paid = etype == "payout.paid";
            let is_failed = etype == "payout.failed";
            let is_canceled = etype == "payout.canceled";
            let maybe_account = typed_event
                .as_ref()
                .and_then(|e| e.account.clone().map(|a| a.to_string()));
            if let Some(event) = typed_event {
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
                            if let Ok(bt) = stripe_sdk::BalanceTransaction::retrieve(
                                &connected_client,
                                &id,
                                &[],
                            )
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
        }
        _ => {}
    }

    (StatusCode::OK, Json(json!({"status":"ok"})))
}

fn verify_stripe_signature(payload: &str, sig_header: &str, secret: &str) -> Result<(), String> {
    if secret.trim().is_empty() {
        return Err("stripe_webhook_secret_not_configured".to_string());
    }

    let mut timestamp: Option<&str> = None;
    let mut signatures: Vec<&str> = Vec::new();

    for part in sig_header.split(',') {
        let mut it = part.splitn(2, '=');
        let k = it.next().unwrap_or("").trim();
        let v = it.next().unwrap_or("").trim();
        if k == "t" {
            timestamp = Some(v);
        }
        if k == "v1" {
            signatures.push(v);
        }
    }

    let t = timestamp.ok_or_else(|| "missing_signature_timestamp".to_string())?;
    if signatures.is_empty() {
        return Err("missing_v1_signature".to_string());
    }

    let signed_payload = format!("{t}.{payload}");
    let mut mac = hmac::Hmac::<sha2::Sha256>::new_from_slice(secret.as_bytes())
        .map_err(|_| "invalid_webhook_secret".to_string())?;
    use hmac::Mac as _;
    mac.update(signed_payload.as_bytes());
    let expected = hex::encode(mac.finalize().into_bytes());

    let valid = signatures.iter().any(|s| expected == *s);
    if !valid {
        return Err("invalid_signature".to_string());
    }
    Ok(())
}

fn stripe_subscription_to_plan_tier(state: &AppState, price_id: &str) -> Option<&'static str> {
    if !state.stripe_scale_price_id.trim().is_empty() && price_id == state.stripe_scale_price_id {
        return Some("scale");
    }
    if !state.stripe_agency_price_id.trim().is_empty() && price_id == state.stripe_agency_price_id {
        return Some("agency");
    }
    None
}

async fn fetch_subscription(
    state: &AppState,
    subscription_id: &str,
) -> Result<stripe_sdk::Subscription, String> {
    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
    let parsed = subscription_id
        .parse::<stripe_sdk::SubscriptionId>()
        .map_err(|_| "invalid_subscription_id".to_string())?;
    stripe_sdk::Subscription::retrieve(&client, &parsed, &[])
        .await
        .map_err(|e| e.to_string())
}

async fn sync_agency_subscription_by_subscription_id(
    state: &AppState,
    subscription_id: &str,
    customer_id: Option<&str>,
) -> Result<(), String> {
    let sub = fetch_subscription(state, subscription_id).await?;
    let agency_id = sub.metadata.get("agency_id").cloned().unwrap_or_default();
    if agency_id.trim().is_empty() {
        return Ok(());
    }
    sync_agency_subscription_from_stripe(state, agency_id.trim(), subscription_id, customer_id)
        .await
}

async fn sync_agency_subscription_from_stripe(
    state: &AppState,
    agency_id: &str,
    subscription_id: &str,
    customer_id: Option<&str>,
) -> Result<(), String> {
    let sub = fetch_subscription(state, subscription_id).await?;

    let price_id = sub
        .items
        .data
        .first()
        .and_then(|i| i.price.as_ref())
        .map(|p| p.id.to_string())
        .unwrap_or_default();

    let status = sub.status.to_string();
    let cancel_at_period_end = sub.cancel_at_period_end;
    let current_period_end =
        chrono::DateTime::<chrono::Utc>::from_timestamp(sub.current_period_end, 0)
            .map(|dt| dt.to_rfc3339());

    let tier = stripe_subscription_to_plan_tier(state, &price_id);
    let plan_tier = match (tier, status.as_str()) {
        (Some(t), "active") | (Some(t), "trialing") => t,
        // When canceled/unpaid/etc, fall back to free.
        _ => "free",
    };

    // Update agency profile
    let mut update = serde_json::Map::new();
    update.insert("plan_tier".into(), json!(plan_tier));
    update.insert("stripe_subscription_id".into(), json!(subscription_id));
    update.insert(
        "plan_updated_at".into(),
        json!(chrono::Utc::now().to_rfc3339()),
    );
    if let Some(cust) = customer_id {
        if !cust.trim().is_empty() {
            update.insert("stripe_customer_id".into(), json!(cust));
        }
    }
    let _ = state
        .pg
        .from("agencies")
        .eq("id", agency_id)
        .update(serde_json::Value::Object(update).to_string())
        .execute()
        .await;

    // Best-effort: write audit row. Ignore conflicts/errors.
    let mut sub_row = serde_json::Map::new();
    sub_row.insert("agency_id".into(), json!(agency_id));
    sub_row.insert("stripe_subscription_id".into(), json!(subscription_id));
    sub_row.insert("stripe_price_id".into(), json!(price_id));
    sub_row.insert("status".into(), json!(status));
    sub_row.insert("cancel_at_period_end".into(), json!(cancel_at_period_end));
    if let Some(cust) = customer_id {
        if !cust.trim().is_empty() {
            sub_row.insert("stripe_customer_id".into(), json!(cust));
        }
    }
    if let Some(cpe) = current_period_end {
        sub_row.insert("current_period_end".into(), json!(cpe));
    }
    let _ = state
        .pg
        .from("agency_subscriptions")
        .insert(serde_json::Value::Object(sub_row).to_string())
        .execute()
        .await;

    info!(agency_id = %agency_id, plan_tier = %plan_tier, subscription_id = %subscription_id, "synced agency plan tier from stripe subscription");
    Ok(())
}
