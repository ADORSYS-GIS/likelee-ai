use crate::errors::sanitize_db_error;
use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tracing::{error, info, warn};

use crate::auth::AuthUser;
use crate::auth::RoleGuard;
use crate::config::AppState;
use std::str::FromStr;
// use stripe_sdk; // Implicitly available

fn sanitized_error_response(
    status_code: u16,
    text: String,
) -> (StatusCode, Json<serde_json::Value>) {
    let (code, body) = sanitize_db_error(status_code, text);
    let v: serde_json::Value = serde_json::from_str(&body).unwrap_or_else(
        |_| json!({"error":"An internal error occurred. Our team has been notified."}),
    );
    (code, Json(json!({"status":"error","error": v})))
}

fn internal_error_response<E: std::fmt::Display>(
    context: &str,
    err: E,
) -> (StatusCode, Json<serde_json::Value>) {
    error!(context = context, error = %err, "Internal error");
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(json!({
            "status":"error",
            "error":"internal_error"
        })),
    )
}

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

    let status = resp.status();
    let txt = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !status.is_success() {
        return Err(sanitize_db_error(status.as_u16(), txt));
    }

    let rows: Vec<serde_json::Value> = serde_json::from_str(&txt).unwrap_or_default();
    let first = rows.first().cloned().unwrap_or(json!({}));
    let cid = first
        .get("creator_id")
        .and_then(|v| v.as_str())
        .or_else(|| first.get("user_id").and_then(|v| v.as_str()))
        .unwrap_or("")
        .to_string();
    if cid.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "talent_creator_id_not_found".to_string(),
        ));
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
    get_account_status(
        State(state),
        Query(ProfileQuery {
            profile_id,
            limit: None,
        }),
    )
    .await
}

pub async fn create_my_onboarding_link(
    State(state): State<AppState>,
    user: AuthUser,
) -> (StatusCode, Json<serde_json::Value>) {
    let profile_id = match resolve_talent_creator_id(&state, &user).await {
        Ok(v) => v,
        Err((code, msg)) => return (code, Json(json!({"status":"error","error":msg}))),
    };
    create_onboarding_link(
        State(state),
        Query(ProfileQuery {
            profile_id,
            limit: None,
        }),
    )
    .await
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
            return internal_error_response("create_onboarding_link.fetch_profile", e);
        }
    };
    let text = prof_resp.text().await.unwrap_or("[]".into());
    let mut rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    if rows.is_empty() {
        // Auto-create a minimal creators row so any authenticated user can connect a creator bank account
        let minimal_creator = json!({
            "id": q.profile_id,
            "payouts_enabled": false
        });
        let _ = state
            .pg
            .from("creators")
            .auth(state.supabase_service_key.clone())
            .insert(minimal_creator.to_string())
            .execute()
            .await;
        // Re-fetch after insertion
        if let Ok(r) = state
            .pg
            .from("creators")
            .select("id,stripe_connect_account_id")
            .eq("id", &q.profile_id)
            .limit(1)
            .execute()
            .await
        {
            if let Ok(t) = r.text().await {
                rows = serde_json::from_str(&t).unwrap_or_default();
            }
        }
        if rows.is_empty() {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"status":"error","error":"profile_create_failed"})),
            );
        }
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
        params.settings = Some(stripe_sdk::AccountSettingsParams {
            payouts: Some(stripe_sdk::PayoutSettingsParams {
                schedule: Some(stripe_sdk::TransferScheduleParams {
                    interval: Some(stripe_sdk::TransferScheduleInterval::Manual),
                    ..Default::default()
                }),
                ..Default::default()
            }),
            ..Default::default()
        });
        params.capabilities = Some(stripe_sdk::CreateAccountCapabilities {
            card_payments: Some(stripe_sdk::CreateAccountCapabilitiesCardPayments {
                requested: Some(true),
            }),
            transfers: Some(stripe_sdk::CreateAccountCapabilitiesTransfers {
                requested: Some(true),
            }),
            ..Default::default()
        });
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
                return internal_error_response("create_onboarding_link.stripe_account_create", e);
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
        Err(e) => {
            let resp =
                internal_error_response("create_onboarding_link.stripe_account_link_create", e);
            (resp.0, resp.1)
        }
    }
}

#[derive(Deserialize)]
pub struct ProfileQuery {
    pub profile_id: String,
    pub limit: Option<i64>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct BalanceRow {
    pub creator_id: String,
    pub currency: String,
    pub available_cents: i64,
    pub earned_cents: i64,
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
            return internal_error_response("get_account_status.fetch_profile", e);
        }
    };
    let text = match resp.text().await {
        Ok(t) => t,
        Err(e) => {
            return internal_error_response("get_account_status.read_body", e);
        }
    };
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    if rows.is_empty() {
        // No creators row yet — return a clean "not connected" state instead of an error
        return (
            StatusCode::OK,
            Json(json!({
                "connected": false,
                "payouts_enabled": false,
                "transfers_enabled": false,
                "details_submitted": false,
                "last_error": "",
                "bank_last4": null
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
    let mut details_submitted = false;
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
                        details_submitted = acct.details_submitted.unwrap_or(false);
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
            "details_submitted": details_submitted,
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
            return internal_error_response("create_agency_onboarding_link.fetch_agency", e);
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
        return sanitized_error_response(status.as_u16(), text);
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
            return internal_error_response("create_agency_onboarding_link.create_agency_row", e);
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
                return internal_error_response("create_agency_onboarding_link.refetch_agency", e);
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
            return sanitized_error_response(status.as_u16(), text);
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
        params.settings = Some(stripe_sdk::AccountSettingsParams {
            payouts: Some(stripe_sdk::PayoutSettingsParams {
                schedule: Some(stripe_sdk::TransferScheduleParams {
                    interval: Some(stripe_sdk::TransferScheduleInterval::Manual),
                    ..Default::default()
                }),
                ..Default::default()
            }),
            ..Default::default()
        });
        params.capabilities = Some(stripe_sdk::CreateAccountCapabilities {
            card_payments: Some(stripe_sdk::CreateAccountCapabilitiesCardPayments {
                requested: Some(true),
            }),
            transfers: Some(stripe_sdk::CreateAccountCapabilitiesTransfers {
                requested: Some(true),
            }),
            ..Default::default()
        });
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
                return internal_error_response(
                    "create_agency_onboarding_link.stripe_account_create",
                    e,
                );
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
        Err(e) => internal_error_response(
            "create_agency_onboarding_link.stripe_account_link_create",
            e,
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
            return internal_error_response("get_agency_account_status.fetch_agency", e);
        }
    };
    let status = resp.status();
    let text = match resp.text().await {
        Ok(t) => t,
        Err(e) => {
            return internal_error_response("get_agency_account_status.read_body", e);
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
        return sanitized_error_response(status.as_u16(), text);
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
        .select("creator_id,currency,available_cents,earned_cents")
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
                    Json(
                        json!({"balances": [], "allowed_currencies": state.payout_allowed_currencies}),
                    ),
                );
            }
            return sanitized_error_response(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), msg);
        }
    };
    let text = match resp.text().await {
        Ok(t) => t,
        Err(e) => {
            return sanitized_error_response(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                e.to_string(),
            );
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

    info!(
        profile_id = %payload.profile_id,
        amount_cents = payload.amount_cents,
        currency = %currency,
        payout_method = %payload.payout_method.clone().unwrap_or_default(),
        "creator_payout_request_received"
    );
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

    // Likelee payouts are instant-only.
    if !state.instant_payouts_enabled {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"status":"error","error":"instant_payouts_disabled"})),
        );
    }
    if let Some(m) = payload.payout_method.as_deref() {
        let m = m.to_lowercase();
        if m == "standard" {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"status":"error","error":"standard_payouts_disabled"})),
            );
        }
        if m != "instant" {
            return (
                StatusCode::BAD_REQUEST,
                Json(
                    json!({"status":"error","error":"invalid_payout_method","allowed":["instant"]}),
                ),
            );
        }
    }
    let method = "instant".to_string();

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
            return sanitized_error_response(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                e.to_string(),
            );
        }
    };
    let text = bal_resp.text().await.unwrap_or("[]".to_string());
    let v: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    let available = v
        .first()
        .and_then(|r| r.get("available_cents").and_then(|x| x.as_i64()))
        .unwrap_or(0);

    info!(
        profile_id = %payload.profile_id,
        requested_cents = payload.amount_cents,
        internal_available_cents = available,
        currency = %currency,
        "creator_payout_internal_balance_preflight"
    );
    if available < payload.amount_cents {
        warn!(
            profile_id = %payload.profile_id,
            requested_cents = payload.amount_cents,
            internal_available_cents = available,
            currency = %currency,
            "creator_payout_rejected_insufficient_internal_balance"
        );
        return (
            StatusCode::BAD_REQUEST,
            Json(
                json!({"status":"error","error":"insufficient_funds","available_cents": available}),
            ),
        );
    }

    // Creator payouts: do not apply a platform fee; creators pay Stripe fees/charges only.
    let fee_cents: i64 = 0;
    let status = "approved";

    let body = json!({
        "creator_id": payload.profile_id,
        "amount_cents": payload.amount_cents,
        "currency": currency,
        "payout_method": method,
        "status": status,
    });
    let ins = match state
        .pg
        .from("creator_payout_requests")
        .insert(body.to_string())
        .execute()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            return sanitized_error_response(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                e.to_string(),
            );
        }
    };
    let st = ins.status();
    let text = ins.text().await.unwrap_or_else(|_| "".into());
    if !st.is_success() {
        return sanitized_error_response(st.as_u16(), text);
    }
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    let created = rows.first().cloned().unwrap_or(json!({"status":"ok"}));

    if rows.is_empty() {
        warn!(
            profile_id = %payload.profile_id,
            amount_cents = payload.amount_cents,
            currency = %currency,
            payout_method = %method,
            status = %status,
            response_body = %text,
            "creator_payout_request_insert_returned_no_rows"
        );
    }

    if let Some(req_id) = created.get("id").and_then(|v| v.as_str()) {
        let net_cents = payload.amount_cents;
        info!(
            payout_request_id = %req_id,
            profile_id = %payload.profile_id,
            amount_cents = payload.amount_cents,
            fee_cents,
            net_cents,
            currency = %currency,
            payout_method = %method,
            status = %status,
            "creator_payout_request_created"
        );
    }

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
        warn!(
            payout_request_id = %payout_request_id,
            profile_id = %profile_id,
            "creator_payout_missing_connected_account"
        );
        let _ = state
            .pg
            .from("creator_payout_requests")
            .eq("id", payout_request_id)
            .update(
                json!({"status":"failed","failure_reason":"missing_connected_account"}).to_string(),
            )
            .execute()
            .await;
        return Err(());
    }

    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
    // Creator payouts have no platform fee; Stripe fees apply at transfer/payout time.
    let net_cents = amount_cents;

    info!(
        payout_request_id = %payout_request_id,
        profile_id = %profile_id,
        connected_account_id = %account_id,
        amount_cents,
        fee_cents,
        net_cents,
        currency = %currency,
        payout_method = %method,
        "creator_payout_execute_start"
    );
    if net_cents <= 0 {
        let _ = state
            .pg
            .from("creator_payout_requests")
            .eq("id", payout_request_id)
            .update(json!({"status":"failed","failure_reason":"non_positive_net"}).to_string())
            .execute()
            .await;
        return Err(());
    }

    // Mark processing
    let _ = state
        .pg
        .from("creator_payout_requests")
        .eq("id", payout_request_id)
        .update(json!({"status":"processing"}).to_string())
        .execute()
        .await;

    let stripe_available_cents =
        fetch_connected_available_cents(&client, &account_id, currency).await;
    info!(
        payout_request_id = %payout_request_id,
        connected_account_id = %account_id,
        stripe_available_cents = ?stripe_available_cents,
        needed_cents = net_cents,
        currency = %currency,
        "creator_payout_stripe_balance_preflight"
    );

    // Creator payouts should be executed directly on the connected account balance.
    // Creating a Transfer here would require platform balance (and fails in test mode).
    let payout_currency = match stripe_sdk::Currency::from_str(&currency.to_lowercase()) {
        Ok(c) => c,
        Err(_) => {
            let _ = state
                .pg
                .from("creator_payout_requests")
                .eq("id", payout_request_id)
                .update(json!({"status":"failed","failure_reason":"invalid_currency"}).to_string())
                .execute()
                .await;
            return Err(());
        }
    };

    let connected_client = match account_id.parse::<stripe_sdk::AccountId>() {
        Ok(id) => client.with_stripe_account(id),
        Err(_) => {
            let _ = state
                .pg
                .from("creator_payout_requests")
                .eq("id", payout_request_id)
                .update(
                    json!({"status":"failed","failure_reason":"invalid_account_id"}).to_string(),
                )
                .execute()
                .await;
            return Err(());
        }
    };

    let mut payout_params = stripe_sdk::CreatePayout::new(net_cents, payout_currency);
    payout_params.method = Some(stripe_sdk::PayoutMethod::Instant);

    match stripe_sdk::Payout::create(&connected_client, payout_params).await {
        Ok(p) => {
            info!(
                payout_request_id = %payout_request_id,
                connected_account_id = %account_id,
                stripe_payout_id = %p.id.to_string(),
                net_cents,
                currency = %currency,
                payout_method = %method,
                "creator_payout_stripe_payout_created"
            );

            let _ = state
                .pg
                .from("creator_payout_requests")
                .eq("id", payout_request_id)
                .update(json!({"stripe_payout_id": p.id.to_string()}).to_string())
                .execute()
                .await;

            // For instant payouts, mark paid immediately (webhooks will confirm).
            if method == "instant" {
                let _ = state
                    .pg
                    .from("creator_payout_requests")
                    .eq("id", payout_request_id)
                    .update(
                        json!({
                            "status":"paid",
                            "processed_at": chrono::Utc::now().to_rfc3339()
                        })
                        .to_string(),
                    )
                    .execute()
                    .await;
            }
            Ok(())
        }
        Err(e) => {
            error!(
                payout_request_id = %payout_request_id,
                connected_account_id = %account_id,
                net_cents,
                currency = %currency,
                payout_method = %method,
                stripe_error = %e.to_string(),
                "creator_payout_stripe_payout_failed"
            );
            let _ = state
                .pg
                .from("creator_payout_requests")
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
    let limit_usize: usize = q.limit.unwrap_or(5).clamp(1, 100).try_into().unwrap_or(5);

    let resp = match state
        .pg
        .from("creator_payout_requests")
        .select("id,creator_id,amount_cents,payout_method,currency,status,created_at,requested_at,processed_at,stripe_transfer_id,stripe_payout_id,failure_reason")
        .eq("creator_id", &q.profile_id)
        .order("created_at.desc")
        .limit(limit_usize)
        .execute()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            return internal_error_response("get_history.fetch", e);
        }
    };
    let text = resp.text().await.unwrap_or("[]".into());
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    info!(
        profile_id = %q.profile_id,
        limit = q.limit.unwrap_or(5),
        items = rows.len(),
        "creator_payout_history_loaded"
    );
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

    // Best-effort: also parse into typed Event; currently unused but kept for potential
    // future event handlers without reintroducing signature parsing changes.
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

            let billing_domain = obj
                .get("metadata")
                .and_then(|m| m.get("billing_domain"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            if billing_domain == "licensing" {
                let md = obj.get("metadata").cloned().unwrap_or(json!({}));
                let has_request_ids = md
                    .get("licensing_request_ids")
                    .and_then(|v| v.as_str())
                    .map(|s| !s.trim().is_empty())
                    .unwrap_or(false);
                if has_request_ids {
                    let _ =
                        handle_licensing_requests_checkout_session_completed(&state, &obj).await;
                } else {
                    let _ = handle_licensing_checkout_session_completed(&state, &obj).await;
                }
                return (StatusCode::OK, Json(json!({"status":"ok"})));
            }

            // Check if this is a payment link checkout
            let md = obj.get("metadata").cloned().unwrap_or(json!({}));
            let agency_id_from_meta = md
                .get("agency_id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let stripe_payment_link_id = obj
                .get("payment_link")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let _payment_intent_id = obj
                .get("payment_intent")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            // Try to find matching payment link by metadata
            if !agency_id_from_meta.is_empty() || !stripe_payment_link_id.is_empty() {
                tracing::info!(
                    agency_id_from_meta = %agency_id_from_meta,
                    stripe_payment_link_id = %stripe_payment_link_id,
                    "checkout.session.completed detected as payment-link checkout"
                );
                let _ = handle_payment_link_checkout_completed(&state, &obj).await;
                return (StatusCode::OK, Json(json!({"status":"ok"})));
            }

            tracing::info!(
                "checkout.session.completed detected as subscription/other checkout (no payment_link and no agency_id metadata)"
            );

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

            let billing_domain = obj
                .get("metadata")
                .and_then(|m| m.get("billing_domain"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            if billing_domain == "licensing" {
                let _ = sync_licensing_access_grant_from_stripe_subscription(&state, &obj).await;
                return (StatusCode::OK, Json(json!({"status":"ok"})));
            }

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
                        update.insert(
                            "processed_at".into(),
                            json!(chrono::Utc::now().to_rfc3339()),
                        );
                    }
                    if is_failed {
                        update.insert("status".into(), json!("failed"));
                        update.insert(
                            "processed_at".into(),
                            json!(chrono::Utc::now().to_rfc3339()),
                        );
                    }
                    if is_canceled {
                        update.insert("status".into(), json!("canceled"));
                        update.insert(
                            "processed_at".into(),
                            json!(chrono::Utc::now().to_rfc3339()),
                        );
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
                                update.insert("fee_cents".into(), json!(bt.fee));
                            }
                        }
                    }
                    let _ = state
                        .pg
                        .from("creator_payout_requests")
                        .eq("id", &pid)
                        .update(json!(update).to_string())
                        .execute()
                        .await;
                }
            }
        }
        _ => {}
    }

    (StatusCode::OK, Json(json!({"status":"ok"})))
}

async fn handle_licensing_checkout_session_completed(
    state: &AppState,
    obj: &serde_json::Value,
) -> Result<(), String> {
    let subscription_id = obj
        .get("subscription")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let customer_id = obj
        .get("customer")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let session_id = obj
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();

    let md = obj.get("metadata").cloned().unwrap_or(json!({}));
    let agency_id = md
        .get("agency_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let package_id = md
        .get("package_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let package_access_token = md
        .get("package_access_token")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let client_email = md
        .get("client_email")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    if agency_id.is_empty() || package_id.is_empty() || package_access_token.is_empty() {
        return Ok(());
    }

    if !session_id.is_empty() {
        let update = json!({
            "status": "completed",
            "stripe_subscription_id": if subscription_id.is_empty() { serde_json::Value::Null } else { json!(subscription_id) },
            "stripe_customer_id": if customer_id.is_empty() { serde_json::Value::Null } else { json!(customer_id) },
        });
        let _ = state
            .pg
            .from("licensing_checkout_sessions")
            .update(update.to_string())
            .eq("stripe_checkout_session_id", session_id)
            .execute()
            .await;
    }

    if subscription_id.is_empty() {
        return Ok(());
    }

    // Fetch subscription for authoritative status/period end.
    let sub = fetch_subscription(state, &subscription_id)
        .await
        .map_err(|e| e.to_string())?;
    upsert_licensing_access_grant_from_subscription(
        state,
        &agency_id,
        &package_id,
        &package_access_token,
        client_email.as_deref(),
        &subscription_id,
        if customer_id.is_empty() {
            None
        } else {
            Some(customer_id.as_str())
        },
        &sub,
    )
    .await;

    Ok(())
}

async fn handle_licensing_requests_checkout_session_completed(
    state: &AppState,
    obj: &serde_json::Value,
) -> Result<(), String> {
    let session_id = obj
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    if session_id.is_empty() {
        return Ok(());
    }

    let md = obj.get("metadata").cloned().unwrap_or(json!({}));
    let agency_id = md
        .get("agency_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    if agency_id.is_empty() {
        return Ok(());
    }

    let licensing_request_ids_csv = md
        .get("licensing_request_ids")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    if licensing_request_ids_csv.is_empty() {
        return Ok(());
    }

    let ids: Vec<String> = licensing_request_ids_csv
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();
    if ids.is_empty() {
        return Ok(());
    }
    let id_refs: Vec<&str> = ids.iter().map(|s| s.as_str()).collect();

    // Idempotency: only early-return if this checkout session has already credited ALL licensing requests.
    let existing_resp = state
        .pg
        .from("licensing_payouts")
        .select("licensing_request_id")
        .eq("stripe_checkout_session_id", &session_id)
        .in_("licensing_request_id", id_refs.clone())
        .execute()
        .await
        .map_err(|e| e.to_string())?;
    if existing_resp.status().is_success() {
        let existing_text = existing_resp.text().await.unwrap_or_else(|_| "[]".into());
        let existing_rows: Vec<serde_json::Value> =
            serde_json::from_str(&existing_text).unwrap_or_default();
        if existing_rows.len() >= ids.len() {
            return Ok(());
        }
    }

    let gross_total_cents = obj
        .get("amount_total")
        .and_then(|v| v.as_i64())
        .unwrap_or(0)
        .max(0);
    let currency_code = obj
        .get("currency")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_uppercase())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "USD".to_string());

    let lr_resp = state
        .pg
        .from("licensing_requests")
        .select("id,talent_id,brand_id")
        .eq("agency_id", &agency_id)
        .in_("id", id_refs.clone())
        .execute()
        .await
        .map_err(|e| e.to_string())?;
    if !lr_resp.status().is_success() {
        let err = lr_resp.text().await.unwrap_or_default();
        return Err(err);
    }
    let lr_text = lr_resp.text().await.unwrap_or_else(|_| "[]".into());
    let lr_rows: Vec<serde_json::Value> = serde_json::from_str(&lr_text).unwrap_or_default();
    if lr_rows.is_empty() {
        return Ok(());
    }

    let mut lr_by_id: std::collections::HashMap<String, serde_json::Value> =
        std::collections::HashMap::new();
    for r in lr_rows {
        let lrid = r.get("id").and_then(|v| v.as_str()).unwrap_or("").trim();
        if lrid.is_empty() {
            continue;
        }
        lr_by_id.insert(lrid.to_string(), r);
    }
    if lr_by_id.is_empty() {
        return Ok(());
    }

    // Fetch existing payment rows for these licensing requests.
    let payments_resp = state
        .pg
        .from("payments")
        .select(
            "id,licensing_request_id,agency_id,talent_id,brand_id,gross_cents,agency_earnings_cents,talent_earnings_cents,commission_rate,currency_code",
        )
        .eq("agency_id", &agency_id)
        .in_("licensing_request_id", id_refs)
        .execute()
        .await
        .map_err(|e| e.to_string())?;
    if !payments_resp.status().is_success() {
        let err = payments_resp.text().await.unwrap_or_default();
        return Err(err);
    }
    let payments_text = payments_resp.text().await.unwrap_or_else(|_| "[]".into());
    let payments_rows: Vec<serde_json::Value> =
        serde_json::from_str(&payments_text).unwrap_or_default();
    if payments_rows.is_empty() {
        return Ok(());
    }

    let mut payments_by_lr: std::collections::HashMap<String, serde_json::Value> =
        std::collections::HashMap::new();
    for p in &payments_rows {
        let lrid = p
            .get("licensing_request_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim();
        if lrid.is_empty() {
            continue;
        }
        payments_by_lr.insert(lrid.to_string(), p.clone());
    }

    // Pro-rata allocate gross_total_cents across licensing_request_ids.
    // Weights come from precomputed per-request payments.gross_cents.
    let mut missing_weights: Vec<String> = vec![];
    for lrid in &ids {
        if !payments_by_lr.contains_key(lrid) {
            missing_weights.push(lrid.clone());
        }
    }
    if !missing_weights.is_empty() {
        tracing::error!(
            "Missing payments rows for licensing_request_ids in checkout session {}: {:?}",
            session_id,
            missing_weights
        );
        return Err("Missing payments rows for some licensing_request_ids".to_string());
    }

    let mut weights: Vec<(String, i64)> = ids
        .iter()
        .map(|lrid| {
            let w = payments_by_lr
                .get(lrid)
                .and_then(|p| p.get("gross_cents"))
                .and_then(|v| v.as_i64())
                .unwrap_or(0)
                .max(0);
            (lrid.clone(), w)
        })
        .collect();

    let mut sum_w: i64 = weights.iter().map(|(_, w)| *w).sum();
    if sum_w <= 0 {
        tracing::error!(
            "All weights are zero for checkout session {}; falling back to equal split",
            session_id
        );
        let n = weights.len().max(1) as i64;
        for (_, w) in &mut weights {
            *w = 1;
        }
        sum_w = n;
    }

    let mut alloc_floor_by_lr: std::collections::HashMap<String, i64> =
        std::collections::HashMap::new();
    let mut remainders: Vec<(String, i128)> = vec![];
    let mut floor_sum: i64 = 0;

    for (lrid, w) in &weights {
        let numer: i128 = (gross_total_cents as i128) * (*w as i128);
        let denom: i128 = (sum_w as i128).max(1);
        let floor_alloc: i64 = (numer / denom) as i64;
        let rem: i128 = numer - denom * (floor_alloc as i128);
        let floor_alloc = floor_alloc.max(0);
        alloc_floor_by_lr.insert(lrid.clone(), floor_alloc);
        remainders.push((lrid.clone(), rem));
        floor_sum += floor_alloc;
    }

    let mut leftover: i64 = (gross_total_cents - floor_sum).max(0);
    remainders
        .sort_by(|(a_id, a_rem), (b_id, b_rem)| b_rem.cmp(a_rem).then_with(|| a_id.cmp(b_id)));

    for (lrid, _) in remainders {
        if leftover <= 0 {
            break;
        }
        if let Some(v) = alloc_floor_by_lr.get_mut(&lrid) {
            *v += 1;
            leftover -= 1;
        }
    }

    let alloc_sum: i64 = alloc_floor_by_lr.values().sum();
    if alloc_sum != gross_total_cents {
        tracing::error!(
            "Allocation invariant violated: alloc_sum={} gross_total_cents={} session_id={}",
            alloc_sum,
            gross_total_cents,
            session_id
        );
        return Err("Allocation invariant violated".to_string());
    }

    let paid_at = chrono::Utc::now().to_rfc3339();

    // Resolve custom commission overrides (talent_commissions).
    let mut talent_ids: Vec<String> = vec![];
    for lrid in &ids {
        let tid = lr_by_id
            .get(lrid)
            .and_then(|lr| lr.get("talent_id"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if !tid.is_empty() {
            talent_ids.push(tid);
        }
    }
    talent_ids.sort();
    talent_ids.dedup();
    let talent_id_refs: Vec<&str> = talent_ids.iter().map(|s| s.as_str()).collect();

    let comm_resp = state
        .pg
        .from("talent_commissions")
        .select("talent_id,commission_rate")
        .eq("agency_id", &agency_id)
        .in_("talent_id", talent_id_refs)
        .execute()
        .await
        .map_err(|e| e.to_string())?;
    let mut custom_by_talent: std::collections::HashMap<String, f64> =
        std::collections::HashMap::new();
    if comm_resp.status().is_success() {
        let comm_text = comm_resp.text().await.unwrap_or_else(|_| "[]".into());
        let comm_rows: Vec<serde_json::Value> =
            serde_json::from_str(&comm_text).unwrap_or_default();
        for r in comm_rows {
            let tid = r
                .get("talent_id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim();
            if tid.is_empty() {
                continue;
            }
            let _old_custom_rate = r.get("commission_rate").and_then(|v| v.as_f64());
            if let Some(rate) = r.get("commission_rate").and_then(|v| v.as_f64()) {
                custom_by_talent.insert(tid.to_string(), rate.clamp(0.0, 100.0));
            }
        }
    }

    let (resp_tiers, resp_cfg, resp_stats) = tokio::try_join!(
        async {
            state
                .pg
                .from("performance_tiers")
                .select("tier_name,tier_level,description,payout_percent")
                .order("tier_level.asc")
                .execute()
                .await
                .map_err(|e| e.to_string())
        },
        async {
            state
                .pg
                .from("agencies")
                .select("performance_config,performance_commission_config")
                .eq("id", &agency_id)
                .limit(1)
                .execute()
                .await
                .map_err(|e| e.to_string())
        },
        async {
            let now = chrono::Utc::now();
            let month_start = now.format("%Y-%m-01").to_string();
            let thirty_days_ago = (now - chrono::Duration::days(30))
                .format("%Y-%m-%d")
                .to_string();
            state
                .pg
                .rpc(
                    "get_agency_performance_stats",
                    json!({
                        "p_agency_id": &agency_id,
                        "p_earnings_start_date": thirty_days_ago,
                        "p_bookings_start_date": month_start,
                    })
                    .to_string(),
                )
                .execute()
                .await
                .map_err(|e| e.to_string())
        }
    )?;

    let tiers_db: Vec<crate::performance_tiers::TierRuleDb> =
        serde_json::from_str(&resp_tiers.text().await.unwrap_or_default()).unwrap_or_default();
    let mut tiers: Vec<crate::performance_tiers::TierRule> = tiers_db
        .into_iter()
        .map(|t| crate::performance_tiers::TierRule {
            tier_name: t.tier_name,
            tier_level: t.tier_level,
            min_monthly_earnings: 0.0,
            min_monthly_bookings: 0,
            commission_rate: 0.0,
            description: t.description,
            payout_percent: t.payout_percent,
        })
        .collect();

    let cfg_rows: Vec<serde_json::Value> =
        serde_json::from_str(&resp_cfg.text().await.unwrap_or_default()).unwrap_or_default();
    let thresholds_cfg = cfg_rows
        .first()
        .and_then(|r| r.get("performance_config"))
        .and_then(|v| v.as_object());
    let commission_cfg = cfg_rows
        .first()
        .and_then(|r| r.get("performance_commission_config"))
        .and_then(|v| v.as_object());

    for t in &mut tiers {
        if let Some(c) = thresholds_cfg.and_then(|m| m.get(&t.tier_name)) {
            if let Some(e) = c.get("min_earnings").and_then(|v| v.as_f64()) {
                t.min_monthly_earnings = e;
            }
            if let Some(b) = c.get("min_bookings").and_then(|v| v.as_i64()) {
                t.min_monthly_bookings = b as i32;
            }
        }
        if let Some(c) = commission_cfg.and_then(|m| m.get(&t.tier_name)) {
            if let Some(r) = c.get("commission_rate").and_then(|v| v.as_f64()) {
                t.commission_rate = r;
            }
        }
    }

    let stats_text = resp_stats.text().await.unwrap_or_else(|_| "[]".into());
    let stats_all: Vec<crate::performance_tiers::PerformanceStats> =
        serde_json::from_str(&stats_text).unwrap_or_default();
    let mut stats_by_talent: std::collections::HashMap<
        String,
        crate::performance_tiers::PerformanceStats,
    > = std::collections::HashMap::new();
    for s in stats_all {
        stats_by_talent.insert(s.talent_id.clone(), s);
    }

    tiers.sort_by_key(|t| t.tier_level);

    let mut default_rate_by_talent: std::collections::HashMap<String, f64> =
        std::collections::HashMap::new();
    for tid in &talent_ids {
        let s = stats_by_talent.get(tid);
        let earnings = s.map(|x| x.earnings_cents as f64 / 100.0).unwrap_or(0.0);
        let bookings = s.map(|x| x.booking_count).unwrap_or(0);

        let mut assigned = tiers.last();
        for rule in &tiers {
            if earnings >= rule.min_monthly_earnings && bookings >= rule.min_monthly_bookings as i64
            {
                assigned = Some(rule);
                break;
            }
        }

        let rate = assigned.map(|r| r.commission_rate).unwrap_or(0.0);
        default_rate_by_talent.insert(tid.clone(), rate.clamp(0.0, 100.0));
    }

    let mut computed_payout_rows: Vec<serde_json::Value> = vec![];
    let mut computed_payment_ids: Vec<String> = vec![];

    for lrid in &ids {
        let lr = match lr_by_id.get(lrid) {
            Some(v) => v,
            None => continue,
        };
        let p = match payments_by_lr.get(lrid) {
            Some(v) => v,
            None => continue,
        };

        let payment_id = p
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if payment_id.is_empty() {
            continue;
        }

        let talent_id = lr
            .get("talent_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if talent_id.is_empty() {
            continue;
        }

        let gross_cents = alloc_floor_by_lr.get(lrid).copied().unwrap_or(0).max(0);
        let effective_rate = custom_by_talent
            .get(&talent_id)
            .copied()
            .unwrap_or_else(|| {
                default_rate_by_talent
                    .get(&talent_id)
                    .copied()
                    .unwrap_or(0.0)
            })
            .clamp(0.0, 100.0);

        let agency_earnings_cents =
            ((gross_cents as f64) * (effective_rate / 100.0)).round() as i64;
        let agency_earnings_cents = agency_earnings_cents.max(0).min(gross_cents);
        let talent_earnings_cents = (gross_cents - agency_earnings_cents).max(0);

        let update_body = json!({
            "gross_cents": gross_cents,
            "agency_earnings_cents": agency_earnings_cents,
            "talent_earnings_cents": talent_earnings_cents,
            "commission_rate": effective_rate,
            "currency_code": currency_code,
            "paid_at": paid_at,
            "status": "succeeded"
        });

        let _ = state
            .pg
            .from("payments")
            .eq("id", &payment_id)
            .update(update_body.to_string())
            .execute()
            .await;

        computed_payment_ids.push(payment_id);

        let mut row = serde_json::Map::new();
        row.insert("licensing_request_id".into(), json!(lrid));
        row.insert("agency_id".into(), json!(agency_id));
        row.insert("talent_id".into(), json!(talent_id));
        row.insert("amount_cents".into(), json!(agency_earnings_cents));
        row.insert("currency".into(), json!(currency_code));
        row.insert("paid_at".into(), json!(paid_at));
        row.insert("stripe_checkout_session_id".into(), json!(session_id));
        row.insert("commission_rate".into(), json!(effective_rate));
        computed_payout_rows.push(serde_json::Value::Object(row));
    }

    computed_payment_ids.sort();
    computed_payment_ids.dedup();

    // Insert licensing_payouts rows (agency share) so the DB trigger credits agency_balances.
    // Best-effort: insert each row; unique index + stripe_checkout_session_id makes it idempotent.
    for row in computed_payout_rows {
        let _ = state
            .pg
            .from("licensing_payouts")
            .insert(row.to_string())
            .execute()
            .await;
    }

    // Mark related payments as succeeded.
    let payment_ids: Vec<&str> = computed_payment_ids.iter().map(|s| s.as_str()).collect();
    if !payment_ids.is_empty() {
        let _ = state
            .pg
            .from("payments")
            .in_("id", payment_ids)
            .update(json!({"status":"succeeded"}).to_string())
            .execute()
            .await;
    }

    Ok(())
}

async fn handle_payment_link_checkout_completed(
    state: &AppState,
    obj: &serde_json::Value,
) -> Result<(), String> {
    let md = obj.get("metadata").cloned().unwrap_or(json!({}));
    let mut agency_id = md
        .get("agency_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let mut licensing_request_ids_str = md
        .get("licensing_request_ids")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let payment_intent_id = obj
        .get("payment_intent")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let amount_total = obj
        .get("amount_total")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);

    // Payment Links don't always propagate metadata to the Checkout Session.
    // If metadata is missing, attempt to resolve the payment link record via checkout.session.payment_link.
    if agency_id.trim().is_empty() || licensing_request_ids_str.trim().is_empty() {
        let stripe_payment_link_id = obj
            .get("payment_link")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();

        if !stripe_payment_link_id.is_empty() {
            let pl_resp = state
                .pg
                .from("agency_payment_links")
                .select("agency_id,licensing_request_id")
                .eq("stripe_payment_link_id", &stripe_payment_link_id)
                .limit(1)
                .execute()
                .await;

            if let Ok(pl_resp) = pl_resp {
                if pl_resp.status().is_success() {
                    let text = pl_resp.text().await.unwrap_or_else(|_| "[]".into());
                    let rows: Vec<serde_json::Value> =
                        serde_json::from_str(&text).unwrap_or_default();
                    if let Some(row) = rows.first() {
                        if agency_id.trim().is_empty() {
                            agency_id = row
                                .get("agency_id")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string();
                        }
                        if licensing_request_ids_str.trim().is_empty() {
                            licensing_request_ids_str = row
                                .get("licensing_request_id")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string();
                        }
                    }
                }
            }
        }
    }

    if agency_id.trim().is_empty() || licensing_request_ids_str.trim().is_empty() {
        warn!(
            agency_id = %agency_id,
            licensing_request_ids = %licensing_request_ids_str,
            payment_intent_id = %payment_intent_id,
            "Payment link checkout completed but missing identifiers; skipping distribution"
        );
        return Ok(());
    }

    let lr_ids: Vec<&str> = licensing_request_ids_str.split(',').collect();
    let first_lr_id = lr_ids.first().copied().unwrap_or("");

    // Find the payment link record
    let pl_resp = state
        .pg
        .from("agency_payment_links")
        .select("id,agency_id,licensing_request_id,campaign_id,total_amount_cents,platform_fee_cents,net_amount_cents,agency_amount_cents,talent_amount_cents,currency,talent_splits")
        .eq("agency_id", &agency_id)
        .eq("licensing_request_id", first_lr_id)
        .eq("status", "active")
        .limit(1)
        .execute()
        .await;

    let payment_link = match pl_resp {
        Ok(resp) => {
            if !resp.status().is_success() {
                return Ok(());
            }
            let text = resp.text().await.map_err(|e| e.to_string())?;
            let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
            rows.into_iter().next()
        }
        Err(_) => return Ok(()),
    };

    let Some(pl) = payment_link else {
        return Ok(());
    };

    let payment_link_id = pl
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let _campaign_id = pl
        .get("campaign_id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let agency_amount_cents = pl
        .get("agency_amount_cents")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);
    let talent_amount_cents = pl
        .get("talent_amount_cents")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);
    let platform_fee_cents = pl
        .get("platform_fee_cents")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);
    let net_amount_cents = pl
        .get("net_amount_cents")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);
    let currency = pl
        .get("currency")
        .and_then(|v| v.as_str())
        .unwrap_or("USD")
        .to_string();
    let talent_splits = pl.get("talent_splits").cloned().unwrap_or(json!([]));

    // Verify payment amount matches
    let pl_total = pl
        .get("total_amount_cents")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);
    if amount_total > 0 && amount_total != pl_total {
        warn!(
            payment_link_id = %payment_link_id,
            expected = pl_total,
            actual = amount_total,
            "Payment amount mismatch"
        );
    }

    // Update payment link status
    let update = json!({
        "status": "paid",
        "paid_at": chrono::Utc::now().to_rfc3339(),
        "stripe_payment_intent_id": payment_intent_id,
    });

    let _ = state
        .pg
        .from("agency_payment_links")
        .eq("id", &payment_link_id)
        .update(update.to_string())
        .execute()
        .await;

    // Insert into licensing_payouts to trigger balance updates
    // This will trigger both agency and creator balance updates
    let payout_record = json!({
        "licensing_request_id": first_lr_id,
        "agency_id": agency_id,
        "amount_cents": agency_amount_cents,  // Agency commission
        "talent_earnings_cents": talent_amount_cents,  // Total talent share
        "talent_splits": talent_splits,
        "platform_fee_cents": platform_fee_cents,
        "net_amount_cents": net_amount_cents,
        "currency": currency,
        "payment_link_id": payment_link_id,
        "stripe_payment_intent_id": payment_intent_id,
        "paid_at": chrono::Utc::now().to_rfc3339(),
    });

    let _ = state
        .pg
        .from("licensing_payouts")
        .insert(payout_record.to_string())
        .execute()
        .await;
    // Update payments table status
    let payment_update = json!({
        "status": "paid",
        "paid_at": chrono::Utc::now().to_rfc3339(),
        "stripe_payment_intent_id": payment_intent_id,
    });

    for lr_id in &lr_ids {
        let _ = state
            .pg
            .from("payments")
            .eq("licensing_request_id", *lr_id)
            .update(payment_update.to_string())
            .execute()
            .await;
    }

    info!(
        payment_link_id = %payment_link_id,
        agency_id = %agency_id,
        amount_cents = amount_total,
        "Payment link checkout completed and balances updated"
    );

    // Create Stripe transfers to connected accounts
    match create_payment_link_transfers(
        state,
        &agency_id,
        agency_amount_cents,
        &talent_splits,
        &currency,
        &payment_link_id,
        &lr_ids,
    )
    .await
    {
        Ok(transfers) => {
            info!(
                payment_link_id = %payment_link_id,
                agency_transfer = ?transfers.agency_transfer_id,
                talent_transfers = transfers.talent_transfer_ids.len(),
                "Stripe transfers created and balances adjusted successfully"
            );
        }
        Err(e) => {
            error!(
                payment_link_id = %payment_link_id,
                error = %e,
                "Failed to create Stripe transfers or adjust balances"
            );
        }
    }

    // Delete associated license_submissions and licensing_requests after successful payment.
    // We do this best-effort so a deletion failure doesn't block the payment confirmation.
    for lr_id in &lr_ids {
        // First fetch the submission_id linked to this licensing request
        if let Ok(sub_resp) = state
            .pg
            .from("licensing_requests")
            .select("id,submission_id")
            .eq("id", *lr_id)
            .limit(1)
            .execute()
            .await
        {
            if sub_resp.status().is_success() {
                let sub_text = sub_resp.text().await.unwrap_or_else(|_| "[]".into());
                let sub_rows: Vec<serde_json::Value> =
                    serde_json::from_str(&sub_text).unwrap_or_default();
                if let Some(row) = sub_rows.first() {
                    if let Some(submission_id) = row.get("submission_id").and_then(|v| v.as_str()) {
                        // Delete the license_submission
                        let _ = state
                            .pg
                            .from("license_submissions")
                            .eq("id", submission_id)
                            .update(json!({"status": "archived", "archived_at": chrono::Utc::now().to_rfc3339()}).to_string())
                            .execute()
                            .await;
                        info!(
                            submission_id = %submission_id,
                            "Archived license_submission after payment"
                        );
                    }
                }
            }
        }

        // Delete the licensing_request itself
        let _ = state
            .pg
            .from("licensing_requests")
            .eq("id", *lr_id)
            .update(
                json!({"status": "archived", "archived_at": chrono::Utc::now().to_rfc3339()})
                    .to_string(),
            )
            .execute()
            .await;
        info!(
            licensing_request_id = %lr_id,
            "Archived licensing_request after payment"
        );
    }

    info!(
        payment_link_id = %payment_link_id,
        agency_id = %agency_id,
        "Licensing requests and submissions archived after payment"
    );
    Ok(())
}

// ============================================================================
// Payment Link Transfer Creation
// ============================================================================

#[derive(Debug, Default)]
struct TransferResults {
    agency_transfer_id: Option<String>,
    talent_transfer_ids: Vec<String>,
}

async fn create_payment_link_transfers(
    state: &AppState,
    agency_id: &str,
    agency_amount_cents: i64,
    talent_splits: &serde_json::Value,
    currency: &str,
    payment_link_id: &str,
    _lr_ids: &[&str],
) -> Result<TransferResults, String> {
    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
    let currency_enum = stripe_sdk::Currency::from_str(&currency.to_lowercase())
        .map_err(|_| "invalid_currency".to_string())?;

    let mut results = TransferResults::default();

    // 1. Transfer to agency connected account
    if agency_amount_cents > 0 {
        match get_agency_stripe_account(state, agency_id).await {
            Ok(agency_account_id) => {
                let mut params =
                    stripe_sdk::CreateTransfer::new(currency_enum, agency_account_id.clone());
                params.amount = Some(agency_amount_cents);
                params.metadata = Some(std::collections::HashMap::from([
                    ("payment_link_id".to_string(), payment_link_id.to_string()),
                    ("agency_id".to_string(), agency_id.to_string()),
                    ("type".to_string(), "agency_commission".to_string()),
                ]));

                match stripe_sdk::Transfer::create(&client, params).await {
                    Ok(transfer) => {
                        results.agency_transfer_id = Some(transfer.id.to_string());

                        // Record transfer in DB via RPC
                        let _ = state
                            .pg
                            .rpc(
                                "record_stripe_transfer",
                                json!({
                                    "p_payment_link_id": payment_link_id,
                                    "p_recipient_type": "agency",
                                    "p_recipient_id": agency_id,
                                    "p_stripe_connect_account_id": agency_account_id,
                                    "p_amount_cents": agency_amount_cents,
                                    "p_currency": currency,
                                    "p_stripe_transfer_id": transfer.id,
                                    "p_status": "created"
                                })
                                .to_string(),
                            )
                            .execute()
                            .await;

                        info!(
                            agency_id = %agency_id,
                            transfer_id = %transfer.id,
                            amount = agency_amount_cents,
                            "Agency transfer recorded successfully"
                        );
                    }
                    Err(e) => {
                        error!(agency_id = %agency_id, error = ?e, "Failed to create agency transfer");
                        let _ = state
                            .pg
                            .rpc(
                                "record_stripe_transfer",
                                json!({
                                    "p_payment_link_id": payment_link_id,
                                    "p_recipient_type": "agency",
                                    "p_recipient_id": agency_id,
                                    "p_stripe_connect_account_id": agency_account_id,
                                    "p_amount_cents": agency_amount_cents,
                                    "p_currency": currency,
                                    "p_status": "failed",
                                    "p_failure_reason": format!("{:?}", e)
                                })
                                .to_string(),
                            )
                            .execute()
                            .await;
                    }
                }
            }
            Err(e) => {
                error!(agency_id = %agency_id, error = %e, "Agency has no connected Stripe account - skipping transfer");
            }
        }
    }

    // 2. Transfer to each talent connected account
    if let Some(splits) = talent_splits.as_array() {
        for split in splits {
            let talent_id = split
                .get("talent_id")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let creator_id = split
                .get("creator_id")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let amount_cents = split
                .get("amount_cents")
                .and_then(|v| v.as_i64())
                .unwrap_or(0);

            if amount_cents <= 0 {
                continue;
            }

            let talent_account_id_result = {
                let stored = split
                    .get("stripe_connect_account_id")
                    .and_then(|v| v.as_str())
                    .filter(|s| !s.is_empty())
                    .map(|s| s.to_string());

                if let Some(id) = stored {
                    Ok(id)
                } else {
                    let resolved_creator_id_result = if !creator_id.is_empty() {
                        Ok(creator_id.to_string())
                    } else {
                        get_creator_id_from_talent_id(state, talent_id).await
                    };

                    match resolved_creator_id_result {
                        Ok(cid) => get_creator_stripe_account(state, &cid).await,
                        Err(e) => Err(format!("Failed to resolve creator: {}", e)),
                    }
                }
            };

            match talent_account_id_result {
                Ok(talent_account_id) => {
                    let mut params =
                        stripe_sdk::CreateTransfer::new(currency_enum, talent_account_id.clone());
                    params.amount = Some(amount_cents);
                    params.metadata = Some(std::collections::HashMap::from([
                        ("payment_link_id".to_string(), payment_link_id.to_string()),
                        ("talent_id".to_string(), talent_id.to_string()),
                        ("creator_id".to_string(), creator_id.to_string()),
                        ("type".to_string(), "talent_earnings".to_string()),
                    ]));

                    match stripe_sdk::Transfer::create(&client, params).await {
                        Ok(transfer) => {
                            results.talent_transfer_ids.push(transfer.id.to_string());

                            // Record transfer in DB via RPC
                            let _ = state
                                .pg
                                .rpc(
                                    "record_stripe_transfer",
                                    json!({
                                        "p_payment_link_id": payment_link_id,
                                        "p_recipient_type": "creator",
                                        "p_recipient_id": talent_id,
                                        "p_stripe_connect_account_id": talent_account_id,
                                        "p_amount_cents": amount_cents,
                                        "p_currency": currency,
                                        "p_stripe_transfer_id": transfer.id,
                                        "p_status": "created"
                                    })
                                    .to_string(),
                                )
                                .execute()
                                .await;

                            info!(
                                talent_id = %talent_id,
                                creator_id = %creator_id,
                                transfer_id = %transfer.id,
                                amount = amount_cents,
                                "Talent transfer recorded successfully"
                            );
                        }
                        Err(e) => {
                            error!(talent_id = %talent_id, error = ?e, "Failed to create talent transfer");
                            let _ = state
                                .pg
                                .rpc(
                                    "record_stripe_transfer",
                                    json!({
                                        "p_payment_link_id": payment_link_id,
                                        "p_recipient_type": "creator",
                                        "p_recipient_id": talent_id,
                                        "p_stripe_connect_account_id": talent_account_id,
                                        "p_amount_cents": amount_cents,
                                        "p_currency": currency,
                                        "p_status": "failed",
                                        "p_failure_reason": format!("{:?}", e)
                                    })
                                    .to_string(),
                                )
                                .execute()
                                .await;
                        }
                    }
                }
                Err(e) => {
                    error!(talent_id = %talent_id, error = %e, "Skipping talent transfer");
                }
            }
        }
    }

    Ok(results)
}

async fn get_agency_stripe_account(state: &AppState, agency_id: &str) -> Result<String, String> {
    let resp = state
        .pg
        .from("agencies")
        .select("stripe_connect_account_id")
        .eq("id", agency_id)
        .single()
        .execute()
        .await
        .map_err(|e| e.to_string())?;

    let text = resp.text().await.map_err(|e| e.to_string())?;
    let row: serde_json::Value = serde_json::from_str(&text).map_err(|e| e.to_string())?;

    row.get("stripe_connect_account_id")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .ok_or_else(|| "Agency has no connected Stripe account".to_string())
}

/// Resolve the `creator_id` for a talent ID (agency_users.id).
async fn get_creator_id_from_talent_id(
    state: &AppState,
    talent_id: &str,
) -> Result<String, String> {
    let resp = state
        .pg
        .from("agency_users")
        .select("creator_id")
        .eq("id", talent_id)
        .single()
        .execute()
        .await
        .map_err(|e| e.to_string())?;

    let text = resp.text().await.map_err(|e| e.to_string())?;

    // Check if the response is actually an object (single() returns an object, not array)
    let row: serde_json::Value = serde_json::from_str(&text).map_err(|e| e.to_string())?;

    row.get("creator_id")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .ok_or_else(|| format!("Talent {} has no creator profile", talent_id))
}

async fn get_creator_stripe_account(state: &AppState, creator_id: &str) -> Result<String, String> {
    let resp = state
        .pg
        .from("creators")
        .select("stripe_connect_account_id")
        .eq("id", creator_id)
        .single()
        .execute()
        .await
        .map_err(|e| e.to_string())?;

    let text = resp.text().await.map_err(|e| e.to_string())?;
    let row: serde_json::Value = serde_json::from_str(&text).map_err(|e| e.to_string())?;

    row.get("stripe_connect_account_id")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .ok_or_else(|| "Creator has no connected Stripe account".to_string())
}

async fn sync_licensing_access_grant_from_stripe_subscription(
    state: &AppState,
    obj: &serde_json::Value,
) -> Result<(), String> {
    let subscription_id = obj.get("id").and_then(|v| v.as_str()).unwrap_or("").trim();
    if subscription_id.is_empty() {
        return Ok(());
    }

    let customer_id = obj
        .get("customer")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();

    let md = obj.get("metadata").cloned().unwrap_or(json!({}));
    let agency_id = md
        .get("agency_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let package_id = md
        .get("package_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let package_access_token = md
        .get("package_access_token")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let client_email = md
        .get("client_email")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    if agency_id.is_empty() || package_id.is_empty() || package_access_token.is_empty() {
        return Ok(());
    }

    let sub = fetch_subscription(state, subscription_id).await?;
    upsert_licensing_access_grant_from_subscription(
        state,
        &agency_id,
        &package_id,
        &package_access_token,
        client_email.as_deref(),
        subscription_id,
        if customer_id.is_empty() {
            None
        } else {
            Some(customer_id.as_str())
        },
        &sub,
    )
    .await;

    Ok(())
}

#[allow(clippy::too_many_arguments)]
async fn upsert_licensing_access_grant_from_subscription(
    state: &AppState,
    agency_id: &str,
    package_id: &str,
    package_access_token: &str,
    client_email: Option<&str>,
    subscription_id: &str,
    customer_id: Option<&str>,
    sub: &stripe_sdk::Subscription,
) {
    let stripe_status = sub.status.to_string();
    let cancel_at_period_end = sub.cancel_at_period_end;
    let current_period_end =
        chrono::DateTime::<chrono::Utc>::from_timestamp(sub.current_period_end, 0)
            .map(|dt| dt.to_rfc3339());

    let active = matches!(stripe_status.as_str(), "active" | "trialing");
    let status = if active { "active" } else { "inactive" };

    let mut row = serde_json::Map::new();
    row.insert("agency_id".into(), json!(agency_id));
    row.insert("package_id".into(), json!(package_id));
    row.insert("package_access_token".into(), json!(package_access_token));
    row.insert("scope".into(), json!("package_assets"));
    row.insert("stripe_subscription_id".into(), json!(subscription_id));
    row.insert("stripe_status".into(), json!(stripe_status));
    row.insert("cancel_at_period_end".into(), json!(cancel_at_period_end));
    row.insert("status".into(), json!(status));
    row.insert("updated_at".into(), json!(chrono::Utc::now().to_rfc3339()));
    if let Some(cpe) = current_period_end {
        row.insert("current_period_end".into(), json!(cpe));
    }
    if let Some(email) = client_email {
        if !email.trim().is_empty() {
            row.insert("client_email".into(), json!(email.trim()));
        }
    }
    if let Some(cust) = customer_id {
        if !cust.trim().is_empty() {
            row.insert("stripe_customer_id".into(), json!(cust.trim()));
        }
    }

    let _ = state
        .pg
        .from("licensing_access_grants")
        .upsert(serde_json::Value::Object(row).to_string())
        .execute()
        .await;

    info!(
        agency_id = %agency_id,
        package_id = %package_id,
        subscription_id = %subscription_id,
        active = active,
        "synced licensing access grant from stripe subscription"
    );
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

fn stripe_subscription_to_plan_tier_from_price_id(
    state: &AppState,
    price_id: &str,
) -> Option<&'static str> {
    // Legacy: base-plan pricing
    if !state.stripe_agency_pro_base_price_id.trim().is_empty()
        && price_id == state.stripe_agency_pro_base_price_id
    {
        return Some("pro");
    }
    if !state.stripe_agency_basic_base_price_id.trim().is_empty()
        && price_id == state.stripe_agency_basic_base_price_id
    {
        return Some("basic");
    }

    // Backward compatibility
    if !state.stripe_scale_price_id.trim().is_empty() && price_id == state.stripe_scale_price_id {
        return Some("pro");
    }
    if !state.stripe_agency_price_id.trim().is_empty() && price_id == state.stripe_agency_price_id {
        return Some("basic");
    }
    None
}

fn stripe_subscription_to_plan_tier(
    state: &AppState,
    sub: &stripe_sdk::Subscription,
) -> Option<&'static str> {
    // Subscriptions may contain multiple line items (roster + add-ons). Determine the tier by
    // scanning for a known base-plan price ID.
    for item in sub.items.data.iter() {
        let price_id = item
            .price
            .as_ref()
            .map(|p| p.id.to_string())
            .unwrap_or_default();
        if price_id.trim().is_empty() {
            continue;
        }
        if let Some(tier) = stripe_subscription_to_plan_tier_from_price_id(state, price_id.trim()) {
            return Some(tier);
        }
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

    // For audit/debug we still store the first item price ID (if any), but tier mapping scans all items.
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

    let tier = stripe_subscription_to_plan_tier(state, &sub);
    let plan_tier = match (tier, status.as_str()) {
        (Some(t), "active") | (Some(t), "trialing") => t,
        // When canceled/unpaid/etc, fall back to free.
        _ => "free",
    };

    let seats_limit: i64 = match plan_tier {
        "basic" | "pro" | "enterprise" => 186,
        _ => 1,
    };

    let storage_limit_bytes: i64 = match plan_tier {
        "basic" => 500_i64 * 1024 * 1024 * 1024,
        "pro" => 1024_i64 * 1024 * 1024 * 1024,
        _ => 5_i64 * 1024 * 1024 * 1024,
    };

    // Update agency profile
    let mut update = serde_json::Map::new();
    update.insert("plan_tier".into(), json!(plan_tier));
    update.insert("seats_limit".into(), json!(seats_limit));
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

    let _ = state
        .pg
        .from("agency_storage_settings")
        .insert(
            json!({
                "agency_id": agency_id,
                "storage_limit_bytes": storage_limit_bytes,
            })
            .to_string(),
        )
        .execute()
        .await;
    let _ = state
        .pg
        .from("agency_storage_settings")
        .eq("agency_id", agency_id)
        .update(json!({"storage_limit_bytes": storage_limit_bytes}).to_string())
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

#[derive(Deserialize)]
pub struct AgencyPayoutRequestPayload {
    pub amount_cents: i64,
    pub currency: Option<String>,
    pub payout_method: Option<String>, // "standard" | "instant"
}

pub async fn get_agency_balance(
    State(state): State<AppState>,
    user: AuthUser,
) -> (StatusCode, Json<serde_json::Value>) {
    // Get available balance from agency_balances table
    let balance_resp = match state
        .pg
        .from("agency_balances")
        .select("available_cents,currency,updated_at")
        .eq("agency_id", &user.id)
        .limit(1)
        .execute()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            return internal_error_response("get_agency_balance.fetch", e);
        }
    };

    let balance_text = match balance_resp.text().await {
        Ok(t) => t,
        Err(e) => {
            return internal_error_response("get_agency_balance.read_body", e);
        }
    };

    let balance_rows: Vec<serde_json::Value> =
        serde_json::from_str(&balance_text).unwrap_or_default();
    let balance_row = balance_rows.first().cloned().unwrap_or(json!({
        "available_cents": 0,
        "currency": "USD"
    }));

    let currency = balance_row
        .get("currency")
        .and_then(|v| v.as_str())
        .unwrap_or("USD")
        .to_string();

    (
        StatusCode::OK,
        Json(json!({
            "available_balance": {
                "amount_cents": balance_row.get("available_cents").and_then(|v| v.as_i64()).unwrap_or(0),
                "earned_cents": balance_row.get("earned_cents").and_then(|v| v.as_i64()).unwrap_or(0),
                "currency": currency.clone()
            }
        })),
    )
}

pub async fn request_agency_payout(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<AgencyPayoutRequestPayload>,
) -> (StatusCode, Json<serde_json::Value>) {
    if !state.payouts_enabled {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"status":"error","error":"payouts_disabled"})),
        );
    }

    if payload.amount_cents <= 0 {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"status":"error","error":"invalid_amount"})),
        );
    }

    let currency = payload
        .currency
        .unwrap_or_else(|| state.payout_currency.clone())
        .to_uppercase();

    // Validate currency
    if !state
        .payout_allowed_currencies
        .iter()
        .any(|c| c == &currency)
    {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "status":"error",
                "error":"unsupported_currency",
                "allowed": state.payout_allowed_currencies
            })),
        );
    }

    // Check minimum payout amount
    if (payload.amount_cents as u32) < state.min_payout_amount_cents {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "status":"error",
                "error":"below_minimum",
                "min_cents": state.min_payout_amount_cents
            })),
        );
    }

    // Likelee payouts are instant-only.
    if !state.instant_payouts_enabled {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"status":"error","error":"instant_payouts_disabled"})),
        );
    }
    if let Some(m) = payload.payout_method.as_deref() {
        let m = m.to_lowercase();
        if m == "standard" {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"status":"error","error":"standard_payouts_disabled"})),
            );
        }
        if m != "instant" {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "status":"error",
                    "error":"invalid_payout_method",
                    "allowed":["instant"]
                })),
            );
        }
    }
    let method = "instant".to_string();

    // Get agency's available balance
    let balance_resp = match state
        .pg
        .from("agency_balances")
        .select("available_cents")
        .eq("agency_id", &user.id)
        .limit(1)
        .execute()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            return internal_error_response("request_agency_payout.fetch_balance", e);
        }
    };

    let balance_text = balance_resp.text().await.unwrap_or("[]".to_string());
    let balance_rows: Vec<serde_json::Value> =
        serde_json::from_str(&balance_text).unwrap_or_default();
    let available = balance_rows
        .first()
        .and_then(|r| r.get("available_cents").and_then(|x| x.as_i64()))
        .unwrap_or(0);

    info!(
        agency_id = %user.id,
        requested_cents = payload.amount_cents,
        internal_available_cents = available,
        currency = %currency,
        "agency_payout_internal_balance_preflight"
    );

    if available < payload.amount_cents {
        warn!(
            agency_id = %user.id,
            requested_cents = payload.amount_cents,
            internal_available_cents = available,
            currency = %currency,
            "agency_payout_rejected_insufficient_internal_balance"
        );
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "status":"error",
                "error":"insufficient_funds",
                "available_cents": available
            })),
        );
    }

    // Get agency's Stripe Connect account
    let agency_resp = match state
        .pg
        .from("agencies")
        .select("stripe_connect_account_id")
        .eq("id", &user.id)
        .limit(1)
        .execute()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            return internal_error_response("request_agency_payout.fetch_agency_account", e);
        }
    };

    let agency_text = agency_resp.text().await.unwrap_or("[]".to_string());
    let agency_rows: Vec<serde_json::Value> =
        serde_json::from_str(&agency_text).unwrap_or_default();
    let stripe_account_id = agency_rows
        .first()
        .and_then(|r| r.get("stripe_connect_account_id").and_then(|v| v.as_str()))
        .unwrap_or("")
        .to_string();

    if stripe_account_id.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "status":"error",
                "error":"stripe_account_not_connected",
                "message":"Please complete Stripe onboarding first"
            })),
        );
    }

    // Compute fee
    let fee_cents = (payload.amount_cents * (state.payout_fee_bps as i64) + 9999) / 10000;

    // Auto-approve based on threshold
    let status = if (payload.amount_cents as u32) <= state.payout_auto_approve_threshold_cents {
        "approved"
    } else {
        "pending"
    };

    // Create payout request
    let body = json!({
        "agency_id": user.id,
        "amount_cents": payload.amount_cents,
        "currency": currency,
        "payout_method": method,
        "status": status,
        "requested_at": chrono::Utc::now().to_rfc3339(),
    });

    let ins = match state
        .pg
        .from("agency_payout_requests")
        .insert(body.to_string())
        .execute()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            return internal_error_response("request_agency_payout.insert_request", e);
        }
    };

    let ins_text = ins.text().await.unwrap_or("[]".into());
    let rows: Vec<serde_json::Value> = serde_json::from_str(&ins_text).unwrap_or_default();
    let created = rows.first().cloned().unwrap_or(json!({"status":"ok"}));

    if rows.is_empty() {
        warn!(
            agency_id = %user.id,
            amount_cents = payload.amount_cents,
            currency = %currency,
            payout_method = %method,
            status = %status,
            response_body = %ins_text,
            "agency_payout_request_insert_returned_no_rows"
        );
    }

    let created_id = created
        .get("id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    if let Some(req_id) = created_id.as_deref() {
        let net_cents = payload.amount_cents - fee_cents;
        info!(
            agency_payout_request_id = %req_id,
            agency_id = %user.id,
            connected_account_id = %stripe_account_id,
            amount_cents = payload.amount_cents,
            fee_cents,
            net_cents,
            currency = %currency,
            payout_method = %method,
            status = %status,
            "agency_payout_request_created"
        );
    }

    // If auto-approved, execute the payout
    if status == "approved" {
        if let Some(req_id) = created_id.as_deref() {
            let _ = execute_agency_payout(
                &state,
                req_id,
                &user.id,
                &stripe_account_id,
                payload.amount_cents,
                fee_cents,
                &currency,
                &method,
            )
            .await;
        }
    }

    // Re-fetch the row to return the latest status/failure_reason.
    let payout_request = if let Some(req_id) = created_id.as_deref() {
        match state
            .pg
            .from("agency_payout_requests")
            .select("id,agency_id,amount_cents,currency,payout_method,status,requested_at,processed_at,stripe_transfer_id,stripe_payout_id,failure_reason")
            .eq("id", req_id)
            .limit(1)
            .execute()
            .await
        {
            Ok(r) => {
                let st = r.status();
                let txt = r.text().await.unwrap_or("[]".into());
                if !st.is_success() {
                    created.clone()
                } else {
                    let v: Vec<serde_json::Value> = serde_json::from_str(&txt).unwrap_or_default();
                    v.first().cloned().unwrap_or_else(|| created.clone())
                }
            }
            Err(_) => created.clone(),
        }
    } else {
        created.clone()
    };

    (
        StatusCode::OK,
        Json(json!({"status":"ok","payout_request": payout_request})),
    )
}

#[allow(clippy::too_many_arguments)]
pub async fn execute_agency_payout(
    state: &AppState,
    payout_request_id: &str,
    _agency_id: &str,
    stripe_account_id: &str,
    amount_cents: i64,
    fee_cents: i64,
    currency: &str,
    method: &str,
) -> Result<(), ()> {
    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
    let net_cents = amount_cents - fee_cents;

    info!(
        agency_payout_request_id = %payout_request_id,
        connected_account_id = %stripe_account_id,
        amount_cents,
        fee_cents,
        net_cents,
        currency = %currency,
        payout_method = %method,
        "agency_payout_execute_start"
    );

    if net_cents <= 0 {
        let _ = state
            .pg
            .from("agency_payout_requests")
            .eq("id", payout_request_id)
            .update(json!({"status":"failed","failure_reason":"non_positive_net"}).to_string())
            .execute()
            .await;
        return Err(());
    }

    // Mark as processing
    let _ = state
        .pg
        .from("agency_payout_requests")
        .eq("id", payout_request_id)
        .update(json!({"status":"processing"}).to_string())
        .execute()
        .await;

    let stripe_available_cents =
        fetch_connected_available_cents(&client, stripe_account_id, currency).await;
    info!(
        agency_payout_request_id = %payout_request_id,
        connected_account_id = %stripe_account_id,
        stripe_available_cents = ?stripe_available_cents,
        needed_cents = net_cents,
        currency = %currency,
        "agency_payout_stripe_balance_preflight"
    );

    let payout_currency = match stripe_sdk::Currency::from_str(&currency.to_lowercase()) {
        Ok(c) => c,
        Err(_) => {
            let _ = state
                .pg
                .from("agency_payout_requests")
                .eq("id", payout_request_id)
                .update(json!({"status":"failed","failure_reason":"invalid_currency"}).to_string())
                .execute()
                .await;
            return Err(());
        }
    };

    let connected_client = match stripe_account_id.parse::<stripe_sdk::AccountId>() {
        Ok(id) => client.clone().with_stripe_account(id),
        Err(_) => {
            let _ = state
                .pg
                .from("agency_payout_requests")
                .eq("id", payout_request_id)
                .update(
                    json!({"status":"failed","failure_reason":"invalid_account_id"}).to_string(),
                )
                .execute()
                .await;
            return Err(());
        }
    };

    let mut payout_params = stripe_sdk::CreatePayout::new(net_cents, payout_currency);
    payout_params.method = Some(stripe_sdk::PayoutMethod::Instant);

    match stripe_sdk::Payout::create(&connected_client, payout_params).await {
        Ok(p) => {
            info!(
                agency_payout_request_id = %payout_request_id,
                connected_account_id = %stripe_account_id,
                stripe_payout_id = %p.id.to_string(),
                net_cents,
                currency = %currency,
                payout_method = %method,
                "agency_payout_stripe_payout_created"
            );
            let _ = state
                .pg
                .from("agency_payout_requests")
                .eq("id", payout_request_id)
                .update(json!({"stripe_payout_id": p.id.to_string()}).to_string())
                .execute()
                .await;

            if method == "instant" {
                let _ = state
                    .pg
                    .from("agency_payout_requests")
                    .eq("id", payout_request_id)
                    .update(
                        json!({
                            "status":"paid",
                            "processed_at": chrono::Utc::now().to_rfc3339()
                        })
                        .to_string(),
                    )
                    .execute()
                    .await;
            }

            Ok(())
        }
        Err(e) => {
            error!(
                agency_payout_request_id = %payout_request_id,
                connected_account_id = %stripe_account_id,
                net_cents,
                currency = %currency,
                payout_method = %method,
                stripe_error = %e.to_string(),
                "agency_payout_stripe_payout_failed"
            );
            let _ = state
                .pg
                .from("agency_payout_requests")
                .eq("id", payout_request_id)
                .update(json!({"status":"failed","failure_reason": e.to_string()}).to_string())
                .execute()
                .await;
            Err(())
        }
    }
}

async fn fetch_connected_available_cents(
    client: &stripe_sdk::Client,
    connected_account_id: &str,
    currency: &str,
) -> Option<i64> {
    let acct = connected_account_id.parse::<stripe_sdk::AccountId>().ok()?;
    let connected_client = client.clone().with_stripe_account(acct);
    let bal = stripe_sdk::Balance::retrieve(&connected_client, None)
        .await
        .ok()?;

    let cur = currency.to_lowercase();
    bal.available
        .iter()
        .find(|a| a.currency.to_string() == cur)
        .map(|a| a.amount)
}

pub async fn get_agency_payout_history(
    State(state): State<AppState>,
    user: AuthUser,
) -> (StatusCode, Json<serde_json::Value>) {
    let resp = match state
        .pg
        .from("agency_payout_requests")
        .select("id,amount_cents,currency,payout_method,status,requested_at,processed_at,stripe_transfer_id,stripe_payout_id,failure_reason")
        .eq("agency_id", &user.id)
        .order("requested_at.desc")
        .execute()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            return internal_error_response("get_agency_payout_history.fetch", e);
        }
    };

    let status = resp.status();

    let text = match resp.text().await {
        Ok(t) => t,
        Err(e) => {
            return internal_error_response("get_agency_payout_history.read_body", e);
        }
    };

    if !status.is_success() {
        return sanitized_error_response(status.as_u16(), text);
    }

    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    (StatusCode::OK, Json(json!({"items": rows})))
}
