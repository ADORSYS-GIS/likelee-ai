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
use crate::team::{permissions::Permission, require_agency_permission};
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
    if let Some(ea_list) = acct.external_accounts.as_ref() {
        for ea in ea_list.data.iter() {
            if let stripe_sdk::ExternalAccount::BankAccount(ba) = ea {
                if let Some(last4) = ba.last4.as_ref() {
                    let last4 = last4.to_string();
                    if !last4.trim().is_empty() {
                        return Some(last4);
                    }
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

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct StripeBalanceRow {
    pub currency: String,
    pub available_cents: i64,
    pub pending_cents: i64,
}

async fn fetch_connected_balance_rows(
    client: &stripe_sdk::Client,
    connected_account_id: &str,
    allowed_currencies: &[String],
) -> Vec<StripeBalanceRow> {
    let acct = match connected_account_id.parse::<stripe_sdk::AccountId>() {
        Ok(a) => a,
        Err(_) => return vec![],
    };
    let connected_client = client.clone().with_stripe_account(acct);
    let bal = match stripe_sdk::Balance::retrieve(&connected_client, None).await {
        Ok(b) => b,
        Err(_) => return vec![],
    };

    let mut rows: Vec<StripeBalanceRow> = vec![];
    for cur in allowed_currencies {
        let cur_lc = cur.to_lowercase();
        let available_cents = bal
            .available
            .iter()
            .find(|a| a.currency.to_string() == cur_lc)
            .map(|a| a.amount)
            .unwrap_or(0);
        let pending_cents = bal
            .pending
            .iter()
            .find(|a| a.currency.to_string() == cur_lc)
            .map(|a| a.amount)
            .unwrap_or(0);
        rows.push(StripeBalanceRow {
            currency: cur.to_uppercase(),
            available_cents,
            pending_cents,
        });
    }
    rows
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
    let status = resp.status();
    let text = match resp.text().await {
        Ok(t) => t,
        Err(e) => {
            return sanitized_error_response(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                e.to_string(),
            );
        }
    };
    if !status.is_success() {
        // Backward compatible fallback: some DBs may not have `earned_cents` yet.
        if text.contains("earned_cents")
            && (text.contains("does not exist") || text.contains("column"))
        {
            let resp2 = match state
                .pg
                .from("creator_balances")
                .select("creator_id,currency,available_cents")
                .eq("creator_id", &q.profile_id)
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
            let status2 = resp2.status();
            let text2 = resp2.text().await.unwrap_or_else(|_| "[]".into());
            if !status2.is_success() {
                return sanitized_error_response(status2.as_u16(), text2);
            }
            let mut v: Vec<serde_json::Value> = serde_json::from_str(&text2).unwrap_or_default();
            for row in &mut v {
                if let Some(obj) = row.as_object_mut() {
                    obj.insert("earned_cents".to_string(), json!(0));
                }
            }
            let mut rows: Vec<BalanceRow> = serde_json::from_value(json!(v)).unwrap_or_default();
            rows.retain(|r| {
                state
                    .payout_allowed_currencies
                    .iter()
                    .any(|c| c == &r.currency.to_uppercase())
            });

            // Stripe connected balances best-effort (same as below).
            let mut stripe_balances: Vec<StripeBalanceRow> = vec![];
            let stripe_account_id = match state
                .pg
                .from("creators")
                .select("stripe_connect_account_id")
                .eq("id", &q.profile_id)
                .limit(1)
                .execute()
                .await
            {
                Ok(r) => {
                    let txt = r.text().await.unwrap_or_else(|_| "[]".into());
                    let v: Vec<serde_json::Value> = serde_json::from_str(&txt).unwrap_or_default();
                    v.first()
                        .and_then(|row| row.get("stripe_connect_account_id"))
                        .and_then(|x| x.as_str())
                        .unwrap_or("")
                        .trim()
                        .to_string()
                }
                Err(_) => "".to_string(),
            };
            if !stripe_account_id.is_empty() {
                let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
                stripe_balances = fetch_connected_balance_rows(
                    &client,
                    &stripe_account_id,
                    &state.payout_allowed_currencies,
                )
                .await;
            }

            return (
                StatusCode::OK,
                Json(json!({
                    "balances": rows,
                    "stripe_balances": stripe_balances,
                    "allowed_currencies": state.payout_allowed_currencies
                })),
            );
        }
        return sanitized_error_response(status.as_u16(), text);
    }
    let mut rows: Vec<BalanceRow> = serde_json::from_str(&text).unwrap_or_default();
    // filter to allowed currencies
    rows.retain(|r| {
        state
            .payout_allowed_currencies
            .iter()
            .any(|c| c == &r.currency.to_uppercase())
    });

    // Stripe-connected cashout balance snapshot (best-effort).
    let mut stripe_balances: Vec<StripeBalanceRow> = vec![];
    let stripe_account_id = match state
        .pg
        .from("creators")
        .select("stripe_connect_account_id")
        .eq("id", &q.profile_id)
        .limit(1)
        .execute()
        .await
    {
        Ok(r) => {
            let txt = r.text().await.unwrap_or_else(|_| "[]".into());
            let v: Vec<serde_json::Value> = serde_json::from_str(&txt).unwrap_or_default();
            v.first()
                .and_then(|row| row.get("stripe_connect_account_id"))
                .and_then(|x| x.as_str())
                .unwrap_or("")
                .trim()
                .to_string()
        }
        Err(_) => "".to_string(),
    };
    if !stripe_account_id.is_empty() {
        let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
        stripe_balances = fetch_connected_balance_rows(
            &client,
            &stripe_account_id,
            &state.payout_allowed_currencies,
        )
        .await;
    }
    (
        StatusCode::OK,
        Json(json!({
            "balances": rows,
            "stripe_balances": stripe_balances,
            "allowed_currencies": state.payout_allowed_currencies
        })),
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

    // Payouts are executed on the CONNECTED account balance.
    // Therefore, the cashout ceiling must be based on Stripe (not internal ledger balances).
    let resp = match state
        .pg
        .from("creators")
        .select("stripe_connect_account_id")
        .eq("id", &payload.profile_id)
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
    let txt = resp.text().await.unwrap_or_else(|_| "[]".into());
    let rows: Vec<serde_json::Value> = serde_json::from_str(&txt).unwrap_or_default();
    let account_id = rows
        .first()
        .and_then(|r| r.get("stripe_connect_account_id").and_then(|v| v.as_str()))
        .unwrap_or("")
        .trim()
        .to_string();
    if account_id.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "status":"error",
                "error":"stripe_account_not_connected",
                "message":"Please complete Stripe onboarding first."
            })),
        );
    }

    let stripe_available_cents =
        fetch_connected_available_cents(state.stripe_secret_key.as_str(), &account_id, &currency)
            .await
            .unwrap_or(0);
    if stripe_available_cents < payload.amount_cents {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "status":"error",
                "error":"stripe_insufficient_available_balance",
                "stripe_available_cents": stripe_available_cents
            })),
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
        fetch_connected_available_cents(state.stripe_secret_key.as_str(), &account_id, currency)
            .await;
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
    if stripe_available_cents.unwrap_or(0) < net_cents {
        let _ = state
            .pg
            .from("creator_payout_requests")
            .eq("id", payout_request_id)
            .update(
                json!({
                    "status":"failed",
                    "failure_reason":"stripe_insufficient_available_balance"
                })
                .to_string(),
            )
            .execute()
            .await;
        return Err(());
    }
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
    tracing::info!("Received Stripe webhook request");
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

            if billing_domain == "studio" {
                let _ = handle_studio_checkout_session_completed(&state, &obj).await;
                return (StatusCode::OK, Json(json!({"status":"ok"})));
            }

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

            if billing_domain == "campaign_offer" {
                let _ = handle_campaign_offer_checkout_session_completed(&state, &obj).await;
                return (StatusCode::OK, Json(json!({"status":"ok"})));
            }

            if billing_domain == "brand" {
                let brand_id = obj
                    .get("client_reference_id")
                    .and_then(|v| v.as_str())
                    .or_else(|| {
                        obj.get("metadata")
                            .and_then(|m| m.get("brand_id"))
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

                if !brand_id.is_empty() && !subscription_id.is_empty() {
                    let _ = handle_brand_invoice_paid(
                        &state,
                        &subscription_id,
                        if customer_id.is_empty() {
                            None
                        } else {
                            Some(customer_id.as_str())
                        },
                        None,
                    )
                    .await;
                }
                return (StatusCode::OK, Json(json!({"status":"ok"})));
            }

            if billing_domain == "creator" {
                let creator_id = obj
                    .get("client_reference_id")
                    .and_then(|v| v.as_str())
                    .or_else(|| {
                        obj.get("metadata")
                            .and_then(|m| m.get("creator_id"))
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

                let previous_subscription_id = obj
                    .get("metadata")
                    .and_then(|m| m.get("previous_subscription_id"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim()
                    .to_string();

                if !creator_id.is_empty() && !subscription_id.is_empty() {
                    let _ = sync_creator_subscription_from_stripe(
                        &state,
                        &creator_id,
                        &subscription_id,
                        if customer_id.is_empty() {
                            None
                        } else {
                            Some(customer_id.as_str())
                        },
                        None,
                    )
                    .await;

                    if !previous_subscription_id.is_empty()
                        && previous_subscription_id != subscription_id
                    {
                        let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
                        match previous_subscription_id.parse::<stripe_sdk::SubscriptionId>() {
                            Ok(prev_id) => {
                                match stripe_sdk::Subscription::cancel(
                                    &client,
                                    &prev_id,
                                    stripe_sdk::CancelSubscription::default(),
                                )
                                .await
                                {
                                    Ok(_) => {
                                        tracing::info!(
                                            creator_id = %creator_id,
                                            previous_subscription_id = %previous_subscription_id,
                                            new_subscription_id = %subscription_id,
                                            "cancelled previous creator subscription after successful checkout"
                                        );
                                    }
                                    Err(e) => {
                                        tracing::warn!(
                                            creator_id = %creator_id,
                                            previous_subscription_id = %previous_subscription_id,
                                            error = %e,
                                            "failed to cancel previous creator subscription after checkout (best-effort)"
                                        );
                                    }
                                }
                            }
                            Err(_) => {
                                tracing::warn!(
                                    creator_id = %creator_id,
                                    previous_subscription_id = %previous_subscription_id,
                                    "could not parse previous subscription id for cancellation"
                                );
                            }
                        }
                    }
                }
                return (StatusCode::OK, Json(json!({"status":"ok"})));
            }

            if billing_domain == "agency" {
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

                let previous_subscription_id = obj
                    .get("metadata")
                    .and_then(|m| m.get("previous_subscription_id"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim()
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

                    if !previous_subscription_id.is_empty()
                        && previous_subscription_id != subscription_id
                    {
                        let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
                        match previous_subscription_id.parse::<stripe_sdk::SubscriptionId>() {
                            Ok(prev_id) => {
                                match stripe_sdk::Subscription::cancel(
                                    &client,
                                    &prev_id,
                                    stripe_sdk::CancelSubscription::default(),
                                )
                                .await
                                {
                                    Ok(_) => {
                                        tracing::info!(
                                            agency_id = %agency_id,
                                            previous_subscription_id = %previous_subscription_id,
                                            new_subscription_id = %subscription_id,
                                            "cancelled previous agency subscription after successful checkout"
                                        );
                                    }
                                    Err(e) => {
                                        tracing::warn!(
                                            agency_id = %agency_id,
                                            previous_subscription_id = %previous_subscription_id,
                                            error = %e,
                                            "failed to cancel previous agency subscription after checkout (best-effort)"
                                        );
                                    }
                                }
                            }
                            Err(_) => {
                                tracing::warn!(
                                    agency_id = %agency_id,
                                    previous_subscription_id = %previous_subscription_id,
                                    "could not parse previous subscription id for cancellation"
                                );
                            }
                        }
                    }
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
            let licensing_request_ids_from_meta = md
                .get("licensing_request_ids")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let offer_id_from_meta = md
                .get("offer_id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let stripe_payment_link_id = obj
                .get("payment_link")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
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
            let subscription_kind = obj
                .get("metadata")
                .and_then(|m| m.get("subscription_kind"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
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

            if !stripe_payment_link_id.is_empty() {
                tracing::info!(
                    agency_id_from_meta = %agency_id_from_meta,
                    licensing_request_ids = %licensing_request_ids_from_meta,
                    stripe_payment_link_id = %stripe_payment_link_id,
                    "checkout.session.completed detected as payment-link checkout"
                );
                match handle_payment_link_checkout_completed(&state, &obj).await {
                    Ok(true) => {
                        tracing::info!(
                            stripe_payment_link_id = %stripe_payment_link_id,
                            "Payment link checkout completed successfully"
                        );
                    }
                    Ok(false) => {
                        tracing::warn!(
                            stripe_payment_link_id = %stripe_payment_link_id,
                            "Payment link checkout handler returned false — payment link record not found or already processed"
                        );
                    }
                    Err(e) => {
                        tracing::error!(
                            stripe_payment_link_id = %stripe_payment_link_id,
                            error = %e,
                            "Payment link checkout handler FAILED — earnings will not be recorded"
                        );
                        // Return 500 so Stripe retries the webhook delivery.
                        return (
                            StatusCode::INTERNAL_SERVER_ERROR,
                            Json(json!({"status":"error","error":"payment_link_checkout_failed"})),
                        );
                    }
                }
                return (StatusCode::OK, Json(json!({"status":"ok"})));
            }

            if !offer_id_from_meta.is_empty() {
                tracing::info!(
                    offer_id = %offer_id_from_meta,
                    "checkout.session.completed missing billing_domain; falling back to campaign offer handling"
                );
                let _ = handle_campaign_offer_checkout_session_completed(&state, &obj).await;
                return (StatusCode::OK, Json(json!({"status":"ok"})));
            }

            if !agency_id.is_empty() && !subscription_id.is_empty() {
                if subscription_kind.eq_ignore_ascii_case("seat_addon") {
                    // Strict policy: do not grant seats on checkout completion. Wait for invoice.paid.
                    return (StatusCode::OK, Json(json!({"status":"ok"})));
                }
                tracing::info!(
                    agency_id = %agency_id,
                    subscription_id = %subscription_id,
                    "checkout.session.completed missing billing_domain; falling back to agency subscription sync"
                );
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
                return (StatusCode::OK, Json(json!({"status":"ok"})));
            }

            if !agency_id_from_meta.is_empty() && !licensing_request_ids_from_meta.is_empty() {
                tracing::info!(
                    agency_id_from_meta = %agency_id_from_meta,
                    licensing_request_ids = %licensing_request_ids_from_meta,
                    "checkout.session.completed missing billing_domain; attempting payment-link resolution from metadata"
                );
                match handle_payment_link_checkout_completed(&state, &obj).await {
                    Ok(true) => return (StatusCode::OK, Json(json!({"status":"ok"}))),
                    Ok(false) => {
                        tracing::info!(
                            agency_id_from_meta = %agency_id_from_meta,
                            licensing_request_ids = %licensing_request_ids_from_meta,
                            "metadata-only checkout session did not match a stored payment link; falling back to licensing checkout handling"
                        );
                        let _ = handle_licensing_requests_checkout_session_completed(&state, &obj)
                            .await;
                        return (StatusCode::OK, Json(json!({"status":"ok"})));
                    }
                    Err(e) => {
                        tracing::error!(
                            agency_id_from_meta = %agency_id_from_meta,
                            error = %e,
                            "Payment link checkout handler FAILED in metadata fallback path — earnings will not be recorded"
                        );
                        return (
                            StatusCode::INTERNAL_SERVER_ERROR,
                            Json(json!({"status":"error","error":"payment_link_checkout_failed"})),
                        );
                    }
                }
            }

            tracing::info!(
                agency_id = %agency_id,
                subscription_id = %subscription_id,
                "checkout.session.completed detected as other checkout"
            );
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

            if billing_domain == "brand" {
                let subscription_id = obj.get("id").and_then(|v| v.as_str()).unwrap_or("");
                let customer_id = obj
                    .get("customer")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let brand_id = obj
                    .get("metadata")
                    .and_then(|m| m.get("brand_id"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();

                if !brand_id.is_empty() && !subscription_id.trim().is_empty() {
                    let _ = handle_brand_invoice_paid(
                        &state,
                        subscription_id,
                        if customer_id.is_empty() {
                            None
                        } else {
                            Some(customer_id.as_str())
                        },
                        None,
                    )
                    .await;
                }
                return (StatusCode::OK, Json(json!({"status":"ok"})));
            }

            if billing_domain == "creator" {
                let subscription_id = obj.get("id").and_then(|v| v.as_str()).unwrap_or("");
                let customer_id = obj
                    .get("customer")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let creator_id = obj
                    .get("metadata")
                    .and_then(|m| m.get("creator_id"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();

                if !creator_id.is_empty() && !subscription_id.trim().is_empty() {
                    let _ = sync_creator_subscription_from_stripe(
                        &state,
                        &creator_id,
                        subscription_id,
                        if customer_id.is_empty() {
                            None
                        } else {
                            Some(customer_id.as_str())
                        },
                        None,
                    )
                    .await;
                }
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
            let subscription_kind = obj
                .get("metadata")
                .and_then(|m| m.get("subscription_kind"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();

            if !agency_id.is_empty() && !subscription_id.trim().is_empty() {
                if subscription_kind.eq_ignore_ascii_case("seat_addon") {
                    // Strict policy: seat add-ons only apply after invoice.paid.
                    return (StatusCode::OK, Json(json!({"status":"ok"})));
                }
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

            let invoice_id = obj
                .get("id")
                .and_then(|v| v.as_str())
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
                let _ = handle_brand_invoice_paid(
                    &state,
                    &subscription_id,
                    if customer_id.is_empty() {
                        None
                    } else {
                        Some(customer_id.as_str())
                    },
                    if invoice_id.is_empty() {
                        None
                    } else {
                        Some(invoice_id.as_str())
                    },
                )
                .await;
                let _ = sync_creator_subscription_by_subscription_id(
                    &state,
                    &subscription_id,
                    if customer_id.is_empty() {
                        None
                    } else {
                        Some(customer_id.as_str())
                    },
                    if invoice_id.is_empty() {
                        None
                    } else {
                        Some(invoice_id.as_str())
                    },
                )
                .await;
            }
        }
        // Connected Account status updates
        "account.updated" => {
            let obj = payload_json
                .get("data")
                .and_then(|d| d.get("object"))
                .cloned()
                .unwrap_or(json!({}));
            let account_id = obj
                .get("id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let payouts_enabled = obj
                .get("payouts_enabled")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            let disabled_reason = obj
                .get("requirements")
                .and_then(|v| v.get("disabled_reason"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            if !account_id.is_empty() {
                let _ = state
                    .pg
                    .from("creators")
                    .eq("stripe_connect_account_id", &account_id)
                    .update(
                        json!({
                            "payouts_enabled": payouts_enabled,
                            "last_payout_error": disabled_reason
                        })
                        .to_string(),
                    )
                    .execute()
                    .await;
                let _ = state
                    .pg
                    .from("agencies")
                    .eq("stripe_connect_account_id", &account_id)
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
        // Payout lifecycle on connected accounts
        "payout.paid" | "payout.failed" | "payout.canceled" | "payout.created" => {
            let is_paid = etype == "payout.paid";
            let is_failed = etype == "payout.failed";
            let is_canceled = etype == "payout.canceled";
            let obj = payload_json
                .get("data")
                .and_then(|d| d.get("object"))
                .cloned()
                .unwrap_or(json!({}));
            let maybe_account = payload_json
                .get("account")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let pid = obj
                .get("id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if !pid.is_empty() {
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

                let balance_transaction_id = obj.get("balance_transaction").and_then(|v| {
                    // Can be string ID or expanded object
                    v.as_str()
                        .map(|s| s.to_string())
                        .or_else(|| v.get("id").and_then(|v| v.as_str()).map(|s| s.to_string()))
                });
                if let (Some(btx_id), Some(acct_id)) = (balance_transaction_id, maybe_account) {
                    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
                    let connected_client = match acct_id.parse::<stripe_sdk::AccountId>() {
                        Ok(id) => client.with_stripe_account(id),
                        Err(_) => client,
                    };
                    if let Ok(bt_id) = btx_id.parse::<stripe_sdk::BalanceTransactionId>() {
                        if let Ok(bt) =
                            stripe_sdk::BalanceTransaction::retrieve(&connected_client, &bt_id, &[])
                                .await
                        {
                            update.insert("fee_cents".into(), json!(bt.fee));
                        }
                    }
                }
                let _ = state
                    .pg
                    .from("creator_payout_requests")
                    .eq("stripe_payout_id", &pid)
                    .update(json!(update).to_string())
                    .execute()
                    .await;
            }
        }
        // Brand payment method setup completion
        "setup_intent.succeeded" => {
            let _ = handle_brand_setup_intent_succeeded(&state, &payload_json).await;
        }
        _ => {}
    }

    (StatusCode::OK, Json(json!({"status":"ok"})))
}

async fn handle_brand_setup_intent_succeeded(
    state: &AppState,
    payload: &serde_json::Value,
) -> Result<(), String> {
    let obj = payload
        .get("data")
        .and_then(|d| d.get("object"))
        .ok_or("missing setup_intent object")?;

    let customer_id = obj
        .get("customer")
        .and_then(|v| v.as_str())
        .ok_or("missing customer id")?;

    let payment_method_id = obj
        .get("payment_method")
        .and_then(|v| v.as_str())
        .ok_or("missing payment_method id")?;

    let billing_domain = obj
        .get("metadata")
        .and_then(|m| m.get("billing_domain"))
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if billing_domain != "brand" {
        return Ok(());
    }

    // Look up brand by stripe_customer_id
    let brand_resp = state
        .pg
        .from("brands")
        .eq("stripe_customer_id", customer_id)
        .select("id")
        .single()
        .execute()
        .await
        .map_err(|e| format!("failed to lookup brand: {}", e))?;

    let brand_text = brand_resp
        .text()
        .await
        .map_err(|e| format!("failed to read brand response: {}", e))?;
    let brand_row: serde_json::Value = serde_json::from_str(&brand_text).unwrap_or(json!({}));
    let brand_id = brand_row
        .get("id")
        .and_then(|v| v.as_str())
        .ok_or("brand not found for customer")?;

    // Retrieve payment method details from Stripe
    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
    let pm_id = payment_method_id
        .parse::<stripe_sdk::PaymentMethodId>()
        .map_err(|e| format!("invalid payment method id: {}", e))?;
    let pm = stripe_sdk::PaymentMethod::retrieve(&client, &pm_id, &[])
        .await
        .map_err(|e| format!("failed to retrieve payment method: {}", e))?;

    let card = pm.card.ok_or("payment method is not a card")?;

    let last_four = card.last4.clone();
    let card_brand = card.brand.clone();
    let exp_month = card.exp_month as i32;
    let exp_year = card.exp_year as i32;

    // Insert into brand_payment_methods
    state
        .pg
        .from("brand_payment_methods")
        .insert(
            json!({
                "brand_id": brand_id,
                "stripe_payment_method_id": payment_method_id,
                "card_last_four": last_four,
                "card_brand": card_brand,
                "card_exp_month": exp_month,
                "card_exp_year": exp_year,
                "is_active": true
            })
            .to_string(),
        )
        .execute()
        .await
        .map_err(|e| format!("failed to insert payment method: {}", e))?;

    // Update brands table with primary payment method
    state
        .pg
        .from("brands")
        .eq("id", brand_id)
        .update(
            json!({
                "stripe_payment_method_id": payment_method_id,
                "payment_method_last_four": last_four,
                "payment_method_brand": card_brand,
                "payment_method_exp_month": exp_month,
                "payment_method_exp_year": exp_year,
                "payment_method_updated_at": chrono::Utc::now().to_rfc3339()
            })
            .to_string(),
        )
        .execute()
        .await
        .map_err(|e| format!("failed to update brand: {}", e))?;

    tracing::info!(
        brand_id = %brand_id,
        payment_method_id = %payment_method_id,
        card_brand = %card_brand,
        last_four = %last_four,
        "Brand payment method saved successfully"
    );

    Ok(())
}

async fn handle_studio_checkout_session_completed(
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
    let billing_target = md
        .get("billing_target")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_lowercase();
    let user_id = md
        .get("user_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let credits = md
        .get("credits")
        .and_then(|v| v.as_str())
        .and_then(|s| s.trim().parse::<i64>().ok())
        .unwrap_or(0);
    let agency_id = md
        .get("agency_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let studio_plan = md
        .get("studio_plan")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_lowercase())
        .filter(|s| s == "lite" || s == "pro")
        .unwrap_or_else(|| crate::billing::BRAND_STUDIO_ADDON_STUDIO_PLAN.to_string());

    if billing_target == "brand_studio_addon" {
        let brand_id = md
            .get("brand_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();

        if brand_id.is_empty() || credits <= 0 {
            return Ok(());
        }

        let brand_resp = state
            .pg
            .from("brands")
            .select("studio_addon_active")
            .eq("id", brand_id.as_str())
            .limit(1)
            .execute()
            .await
            .map_err(|e| e.to_string())?;
        if !brand_resp.status().is_success() {
            let error_text = brand_resp.text().await.unwrap_or_default();
            return Err(error_text);
        }
        let rows_text = brand_resp.text().await.map_err(|e| e.to_string())?;
        let rows: Vec<serde_json::Value> = serde_json::from_str(&rows_text).unwrap_or_default();
        let already_active = rows
            .first()
            .and_then(|row| row.get("studio_addon_active"))
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
        if already_active {
            let _ =
                crate::studio::wallet::set_current_plan(&state.pg, &brand_id, Some(&studio_plan))
                    .await;
            return Ok(());
        }

        if crate::studio::wallet::has_stripe_credit_transaction(&state.pg, &session_id)
            .await
            .map_err(|e| e.to_string())?
        {
            return Ok(());
        }

        crate::studio::wallet::add_credits(&state.pg, &brand_id, credits, Some(&session_id))
            .await
            .map_err(|e| e.to_string())?;
        let _ =
            crate::studio::wallet::set_current_plan(&state.pg, &brand_id, Some(&studio_plan)).await;

        let _ = state
            .pg
            .from("brands")
            .eq("id", brand_id.as_str())
            .update(
                json!({
                    "studio_addon_active": true,
                    "studio_addon_activated_at": chrono::Utc::now().to_rfc3339(),
                })
                .to_string(),
            )
            .execute()
            .await;

        info!(
            brand_id = %brand_id,
            credits = credits,
            stripe_session_id = %session_id,
            "brand studio add-on activated via stripe checkout"
        );
        return Ok(());
    }

    if billing_target == "agency_studio_addon" {
        if agency_id.is_empty() || user_id.is_empty() || credits <= 0 {
            return Ok(());
        }

        let agency_resp = state
            .pg
            .from("agencies")
            .select("studio_addon_active")
            .eq("id", agency_id.as_str())
            .limit(1)
            .execute()
            .await
            .map_err(|e| e.to_string())?;
        if !agency_resp.status().is_success() {
            let error_text = agency_resp.text().await.unwrap_or_default();
            return Err(error_text);
        }
        let rows_text = agency_resp.text().await.map_err(|e| e.to_string())?;
        let rows: Vec<serde_json::Value> = serde_json::from_str(&rows_text).unwrap_or_default();
        let already_active = rows
            .first()
            .and_then(|row| row.get("studio_addon_active"))
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
        if already_active {
            let _ =
                crate::studio::wallet::set_current_plan(&state.pg, &user_id, Some(&studio_plan))
                    .await;
            return Ok(());
        }

        if crate::studio::wallet::has_stripe_credit_transaction(&state.pg, &session_id)
            .await
            .map_err(|e| e.to_string())?
        {
            return Ok(());
        }

        crate::studio::wallet::add_credits(&state.pg, &user_id, credits, Some(&session_id))
            .await
            .map_err(|e| e.to_string())?;
        let _ =
            crate::studio::wallet::set_current_plan(&state.pg, &user_id, Some(&studio_plan)).await;

        let _ = state
            .pg
            .from("agencies")
            .eq("id", agency_id.as_str())
            .update(
                json!({
                    "studio_addon_active": true,
                    "studio_addon_activated_at": chrono::Utc::now().to_rfc3339(),
                })
                .to_string(),
            )
            .execute()
            .await;

        info!(
            agency_id = %agency_id,
            user_id = %user_id,
            credits = credits,
            stripe_session_id = %session_id,
            "agency studio add-on activated via stripe checkout"
        );
        return Ok(());
    }

    if user_id.is_empty() || credits <= 0 {
        return Ok(());
    }

    // Idempotency: if we've already recorded a purchase for this session, do nothing.
    if crate::studio::wallet::has_stripe_credit_transaction(&state.pg, &session_id)
        .await
        .map_err(|e| e.to_string())?
    {
        return Ok(());
    }

    crate::studio::wallet::add_credits(&state.pg, &user_id, credits, Some(&session_id))
        .await
        .map_err(|e| e.to_string())?;

    let _ = crate::studio::wallet::set_current_plan(&state.pg, &user_id, Some(&studio_plan)).await;

    info!(user_id = %user_id, credits = credits, stripe_session_id = %session_id, "studio credits purchased via stripe checkout");
    Ok(())
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

    // Resolve custom commission overrides (agency_creator_commissions).
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

    // Resolve creator_ids for these talent_ids, then load per-creator overrides.
    let au_resp = state
        .pg
        .from("agency_users")
        .select("id,creator_id")
        .eq("agency_id", &agency_id)
        .in_("id", talent_id_refs.clone())
        .execute()
        .await
        .map_err(|e| e.to_string())?;
    let au_rows: Vec<serde_json::Value> =
        serde_json::from_str(&au_resp.text().await.unwrap_or_default()).unwrap_or_default();
    let mut creator_id_by_talent: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    let mut creator_ids: Vec<String> = vec![];
    for r in au_rows {
        let tid = r.get("id").and_then(|v| v.as_str()).unwrap_or("").trim();
        let cid = r
            .get("creator_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim();
        if tid.is_empty() || cid.is_empty() {
            continue;
        }
        creator_id_by_talent.insert(tid.to_string(), cid.to_string());
        creator_ids.push(cid.to_string());
    }
    creator_ids.sort();
    creator_ids.dedup();

    let comm_resp = if creator_ids.is_empty() {
        None
    } else {
        let creator_id_refs: Vec<&str> = creator_ids.iter().map(|s| s.as_str()).collect();
        Some(
            state
                .pg
                .from("agency_creator_commissions")
                .select("creator_id,commission_rate")
                .eq("agency_id", &agency_id)
                .in_("creator_id", creator_id_refs)
                .execute()
                .await
                .map_err(|e| e.to_string())?,
        )
    };
    let mut custom_by_creator: std::collections::HashMap<String, f64> =
        std::collections::HashMap::new();
    if let Some(comm_resp) = comm_resp {
        if comm_resp.status().is_success() {
            let comm_text = comm_resp.text().await.unwrap_or_else(|_| "[]".into());
            let comm_rows: Vec<serde_json::Value> =
                serde_json::from_str(&comm_text).unwrap_or_default();
            for r in comm_rows {
                let cid = r
                    .get("creator_id")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim();
                if cid.is_empty() {
                    continue;
                }
                let _old_custom_rate = r.get("commission_rate").and_then(|v| v.as_f64());
                if let Some(rate) = r.get("commission_rate").and_then(|v| v.as_f64()) {
                    custom_by_creator.insert(cid.to_string(), rate.clamp(0.0, 100.0));
                }
            }
        }
    }

    let mut contract_by_creator: std::collections::HashMap<String, f64> =
        std::collections::HashMap::new();
    if !creator_ids.is_empty() {
        let creator_id_refs: Vec<&str> = creator_ids.iter().map(|s| s.as_str()).collect();
        let today = chrono::Utc::now().date_naive().to_string();
        let contract_resp = state
            .pg
            .from("agency_creator_marketplace_contracts")
            .select("creator_id,commission_rate,status,valid_from,valid_until")
            .eq("agency_id", &agency_id)
            .eq("status", "active")
            .lte("valid_from", &today)
            .gte("valid_until", &today)
            .in_("creator_id", creator_id_refs)
            .execute()
            .await;
        if let Ok(contract_resp) = contract_resp {
            if contract_resp.status().is_success() {
                let contract_text = contract_resp.text().await.unwrap_or_else(|_| "[]".into());
                let contract_rows: Vec<serde_json::Value> =
                    serde_json::from_str(&contract_text).unwrap_or_default();
                for row in contract_rows {
                    let cid = row
                        .get("creator_id")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .trim();
                    if cid.is_empty() {
                        continue;
                    }
                    if let Some(rate) = row.get("commission_rate").and_then(|v| v.as_f64()) {
                        contract_by_creator.insert(cid.to_string(), rate.clamp(0.0, 100.0));
                    }
                }
            }
        }
    }

    let (resp_talent_tiers, resp_creator_tiers) = tokio::try_join!(
        async {
            state
                .pg
                .from("agency_users")
                .select("id,creator_id,performance_tier_name")
                .eq("agency_id", &agency_id)
                .in_("id", talent_id_refs.clone())
                .execute()
                .await
                .map_err(|e| e.to_string())
        },
        async {
            state
                .pg
                .from("agency_users")
                .select("id,creator_id,performance_tier_name")
                .eq("agency_id", &agency_id)
                .in_("creator_id", talent_id_refs.clone())
                .execute()
                .await
                .map_err(|e| e.to_string())
        }
    )?;

    let mut tier_rows: Vec<serde_json::Value> =
        serde_json::from_str(&resp_talent_tiers.text().await.unwrap_or_default())
            .unwrap_or_default();
    let mut creator_rows: Vec<serde_json::Value> =
        serde_json::from_str(&resp_creator_tiers.text().await.unwrap_or_default())
            .unwrap_or_default();
    if !creator_rows.is_empty() {
        tier_rows.append(&mut creator_rows);
    }
    let mut tier_name_by_talent: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    for row in tier_rows {
        let tier_name = row
            .get("performance_tier_name")
            .and_then(|v| v.as_str())
            .unwrap_or("Inactive")
            .trim()
            .to_string();
        if tier_name.is_empty() {
            continue;
        }
        let au_id = row
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if !au_id.is_empty() {
            tier_name_by_talent.insert(au_id, tier_name.clone());
        }
        let creator_id = row
            .get("creator_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if !creator_id.is_empty() {
            tier_name_by_talent.insert(creator_id, tier_name);
        }
    }

    let tier_names: Vec<String> = tier_name_by_talent.values().cloned().collect();
    let mut tier_payout_percent_map: std::collections::HashMap<String, f64> =
        std::collections::HashMap::new();
    let pt_query = if !tier_names.is_empty() {
        let tn_refs: Vec<&str> = tier_names.iter().map(|s| s.as_str()).collect();
        Some(
            state
                .pg
                .from("performance_tiers")
                .select("tier_name,payout_percent")
                .eq("agency_id", &agency_id)
                .in_("tier_name", tn_refs),
        )
    } else {
        Some(
            state
                .pg
                .from("performance_tiers")
                .select("tier_name,payout_percent")
                .eq("agency_id", &agency_id),
        )
    };

    if let Some(pt_query) = pt_query {
        let pt_resp = pt_query.execute().await;
        if let Ok(pt_resp) = pt_resp {
            if pt_resp.status().is_success() {
                let pt_text = pt_resp.text().await.unwrap_or_else(|_| "[]".into());
                let pt_rows: Vec<serde_json::Value> =
                    serde_json::from_str(&pt_text).unwrap_or_default();
                for r in &pt_rows {
                    let tn = r.get("tier_name").and_then(|v| v.as_str()).unwrap_or("");
                    let pct = r
                        .get("payout_percent")
                        .and_then(|v| v.as_f64())
                        .unwrap_or(40.0);
                    if !tn.is_empty() {
                        tier_payout_percent_map.insert(tn.to_string(), pct);
                    }
                }
            }
        }
    }

    let mut default_rate_by_talent: std::collections::HashMap<String, f64> =
        std::collections::HashMap::new();
    for tid in &talent_ids {
        let tier_name = tier_name_by_talent.get(tid).map(String::as_str);
        let rate = match tier_name {
            Some(name) => tier_payout_percent_map.get(name).copied().unwrap_or(40.0),
            None => 40.0,
        };
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
        let creator_id = creator_id_by_talent.get(&talent_id);
        let talent_rate = creator_id
            .and_then(|cid| contract_by_creator.get(cid).copied())
            .or_else(|| creator_id.and_then(|cid| custom_by_creator.get(cid).copied()))
            .unwrap_or_else(|| {
                default_rate_by_talent
                    .get(&talent_id)
                    .copied()
                    .unwrap_or(0.0)
            })
            .clamp(0.0, 100.0);

        let talent_payout_rate = (100.0 - talent_rate).clamp(0.0, 100.0);
        let talent_earnings_cents =
            ((gross_cents as f64) * (talent_payout_rate / 100.0)).round() as i64;
        let talent_earnings_cents = talent_earnings_cents.max(0).min(gross_cents);
        let agency_earnings_cents = (gross_cents - talent_earnings_cents).max(0);

        let update_body = json!({
            "gross_cents": gross_cents,
            "agency_earnings_cents": agency_earnings_cents,
            "talent_earnings_cents": talent_earnings_cents,
            "commission_rate": talent_rate,
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
        row.insert("commission_rate".into(), json!(talent_rate));
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
) -> Result<bool, String> {
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
    let stripe_payment_link_id = obj
        .get("payment_link")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let amount_total = obj
        .get("amount_total")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);

    // Payment Links don't always propagate metadata to the Checkout Session.
    // If metadata is missing, attempt to resolve the payment link record via checkout.session.payment_link.
    if (agency_id.trim().is_empty() || licensing_request_ids_str.trim().is_empty())
        && !stripe_payment_link_id.is_empty()
    {
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
                let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
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

    if agency_id.trim().is_empty() || licensing_request_ids_str.trim().is_empty() {
        warn!(
            agency_id = %agency_id,
            licensing_request_ids = %licensing_request_ids_str,
            payment_intent_id = %payment_intent_id,
            "Payment link checkout completed but missing identifiers; skipping distribution"
        );
        return Ok(false);
    }

    let lr_ids: Vec<&str> = licensing_request_ids_str.split(',').collect();
    let first_lr_id = lr_ids.first().copied().unwrap_or("");

    // Find the payment link record
    let mut pl_query = state
        .pg
        .from("agency_payment_links")
        .select("id,agency_id,licensing_request_id,campaign_id,total_amount_cents,platform_fee_cents,net_amount_cents,agency_amount_cents,talent_amount_cents,currency,talent_splits");
    if !stripe_payment_link_id.is_empty() {
        pl_query = pl_query.eq("stripe_payment_link_id", &stripe_payment_link_id);
    } else {
        pl_query = pl_query
            .eq("agency_id", &agency_id)
            .eq("licensing_request_id", first_lr_id);
    }
    let pl_resp = pl_query.limit(1).execute().await;

    let payment_link = match pl_resp {
        Ok(resp) => {
            if !resp.status().is_success() {
                let err_text = resp.text().await.unwrap_or_else(|_| "unknown error".into());
                return Err(err_text);
            }
            let text = resp.text().await.map_err(|e| e.to_string())?;
            let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
            rows.into_iter().next()
        }
        Err(e) => return Err(e.to_string()),
    };

    let Some(pl) = payment_link else {
        return Ok(false);
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
    let effective_commission_rate = if net_amount_cents > 0 {
        ((agency_amount_cents as f64 / net_amount_cents as f64) * 100.0).clamp(0.0, 100.0)
    } else {
        0.0
    };

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

    // Use atomic RPC to complete the payment link checkout in a single transaction.
    // This ensures: payment link update, licensing_payouts insert, payments update,
    // and archival of related records all succeed or all roll back together.
    let rpc_payload = json!({
        "p_payment_link_id": payment_link_id,
        "p_payment_intent_id": payment_intent_id,
        "p_agency_id": agency_id,
        "p_licensing_request_ids": licensing_request_ids_str,
        "p_agency_amount_cents": agency_amount_cents,
        "p_talent_amount_cents": talent_amount_cents,
        "p_platform_fee_cents": platform_fee_cents,
        "p_net_amount_cents": net_amount_cents,
        "p_currency": currency,
        "p_talent_splits": talent_splits,
        "p_commission_rate": effective_commission_rate
    });

    match state
        .pg
        .rpc("complete_payment_link_checkout", rpc_payload.to_string())
        .execute()
        .await
    {
        Ok(resp) => {
            if !resp.status().is_success() {
                let err_text = resp.text().await.unwrap_or_else(|_| "unknown error".into());
                error!(
                    payment_link_id = %payment_link_id,
                    error = %err_text,
                    "Atomic payment link checkout completion failed"
                );
                return Err(format!(
                    "complete_payment_link_checkout RPC failed: {}",
                    err_text
                ));
            }
            let result_text = resp.text().await.unwrap_or_else(|_| "{}".into());
            info!(
                payment_link_id = %payment_link_id,
                agency_id = %agency_id,
                amount_cents = amount_total,
                result = %result_text,
                "Payment link checkout completed atomically"
            );
        }
        Err(e) => {
            error!(
                payment_link_id = %payment_link_id,
                error = %e,
                "Failed to call complete_payment_link_checkout RPC"
            );
            return Err(format!("RPC call failed: {}", e));
        }
    }

    info!(
        payment_link_id = %payment_link_id,
        agency_id = %agency_id,
        amount_cents = amount_total,
        "Payment link checkout completed and committed via RPC"
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

    // Note: Archival of license_submissions and licensing_requests is handled
    // atomically within the complete_payment_link_checkout RPC function above.

    Ok(true)
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
                let metadata = std::collections::HashMap::from([
                    ("payment_link_id".to_string(), payment_link_id.to_string()),
                    ("agency_id".to_string(), agency_id.to_string()),
                    ("type".to_string(), "agency_commission".to_string()),
                ]);

                let res = execute_and_record_stripe_transfer(
                    state,
                    &client,
                    currency,
                    currency_enum,
                    "agency",
                    agency_id,
                    &agency_account_id,
                    agency_amount_cents,
                    metadata,
                    "record_stripe_transfer",
                    "p_payment_link_id",
                    payment_link_id,
                )
                .await;

                if let Ok(tid) = res {
                    results.agency_transfer_id = Some(tid);
                    info!(agency_id = %agency_id, amount = agency_amount_cents, "Agency transfer recorded successfully");
                } else {
                    error!(agency_id = %agency_id, error = ?res.err(), "Failed to create agency transfer");
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
                    let metadata = std::collections::HashMap::from([
                        ("payment_link_id".to_string(), payment_link_id.to_string()),
                        ("talent_id".to_string(), talent_id.to_string()),
                        ("creator_id".to_string(), creator_id.to_string()),
                        ("type".to_string(), "talent_earnings".to_string()),
                    ]);

                    let res = execute_and_record_stripe_transfer(
                        state,
                        &client,
                        currency,
                        currency_enum,
                        "creator",
                        talent_id,
                        &talent_account_id,
                        amount_cents,
                        metadata,
                        "record_stripe_transfer",
                        "p_payment_link_id",
                        payment_link_id,
                    )
                    .await;

                    if let Ok(tid) = res {
                        results.talent_transfer_ids.push(tid);
                        info!(talent_id = %talent_id, creator_id = %creator_id, amount = amount_cents, "Talent transfer recorded successfully");
                    } else {
                        error!(talent_id = %talent_id, error = ?res.err(), "Failed to create talent transfer");
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

#[allow(clippy::too_many_arguments)]
pub async fn execute_and_record_stripe_transfer(
    state: &AppState,
    client: &stripe_sdk::Client,
    currency: &str,
    currency_enum: stripe_sdk::Currency,
    recipient_type: &str,
    recipient_id: &str,
    stripe_account_id: &str,
    amount_cents: i64,
    metadata: std::collections::HashMap<String, String>,
    rpc_name: &str,
    rpc_source_id_key: &str,
    rpc_source_id_val: &str,
) -> Result<String, String> {
    let extract_code_from_text = |text: &str| -> Option<&'static str> {
        let t = text.to_lowercase();
        // Stripe error codes we care about most in Connect transfers.
        if t.contains("insufficient_capabilities_for_transfer") {
            return Some("insufficient_capabilities_for_transfer");
        }
        if t.contains("transfers_not_allowed") {
            return Some("transfers_not_allowed");
        }
        if t.contains("payouts_not_allowed") {
            return Some("payouts_not_allowed");
        }
        if t.contains("balance_insufficient") {
            return Some("balance_insufficient");
        }
        None
    };

    // Preflight: ensure the connected account can receive transfers.
    // This avoids confusing failures and keeps our DB `failure_reason` clean/actionable.
    if let Ok(acct_id) = stripe_account_id.parse::<stripe_sdk::AccountId>() {
        if let Ok(acct) = stripe_sdk::Account::retrieve(client, &acct_id, &[]).await {
            let transfers_active = acct
                .capabilities
                .as_ref()
                .and_then(|c| c.transfers.as_ref())
                .map(|s| s == &stripe_sdk::CapabilityStatus::Active)
                .unwrap_or(false);
            if !transfers_active {
                let mut payload = serde_json::Map::new();
                payload.insert(
                    rpc_source_id_key.to_string(),
                    serde_json::json!(rpc_source_id_val),
                );
                payload.insert(
                    "p_recipient_type".to_string(),
                    serde_json::json!(recipient_type),
                );
                payload.insert(
                    "p_recipient_id".to_string(),
                    serde_json::json!(recipient_id),
                );
                payload.insert(
                    "p_stripe_connect_account_id".to_string(),
                    serde_json::json!(stripe_account_id),
                );
                payload.insert(
                    "p_amount_cents".to_string(),
                    serde_json::json!(amount_cents),
                );
                payload.insert("p_currency".to_string(), serde_json::json!(currency));
                payload.insert("p_status".to_string(), serde_json::json!("failed"));
                payload.insert(
                    "p_failure_reason".to_string(),
                    serde_json::json!(
                        "insufficient_capabilities_for_transfer: connected account transfers capability is not active"
                    ),
                );
                let _ = state
                    .pg
                    .rpc(rpc_name, serde_json::Value::Object(payload).to_string())
                    .execute()
                    .await;
                return Err("insufficient_capabilities_for_transfer".to_string());
            }
        }
    }

    let mut params = stripe_sdk::CreateTransfer::new(currency_enum, stripe_account_id.to_string());
    params.amount = Some(amount_cents);
    params.metadata = Some(metadata);

    match stripe_sdk::Transfer::create(client, params).await {
        Ok(transfer) => {
            let mut payload = serde_json::Map::new();
            payload.insert(
                rpc_source_id_key.to_string(),
                serde_json::json!(rpc_source_id_val),
            );
            payload.insert(
                "p_recipient_type".to_string(),
                serde_json::json!(recipient_type),
            );
            payload.insert(
                "p_recipient_id".to_string(),
                serde_json::json!(recipient_id),
            );
            payload.insert(
                "p_stripe_connect_account_id".to_string(),
                serde_json::json!(stripe_account_id),
            );
            payload.insert(
                "p_amount_cents".to_string(),
                serde_json::json!(amount_cents),
            );
            payload.insert("p_currency".to_string(), serde_json::json!(currency));
            payload.insert(
                "p_stripe_transfer_id".to_string(),
                serde_json::json!(transfer.id),
            );
            payload.insert("p_status".to_string(), serde_json::json!("created"));
            let _ = state
                .pg
                .rpc(rpc_name, serde_json::Value::Object(payload).to_string())
                .execute()
                .await;
            Ok(transfer.id.to_string())
        }
        Err(e) => {
            // Avoid `{:?}` because the Stripe SDK may fail to deserialize new/unknown error codes
            // (e.g. `insufficient_capabilities_for_transfer`) and produce a huge JSONSerialize(...) blob.
            // Use Display + a best-effort extraction of the code so we persist stable failure reasons.
            let display_msg = e.to_string();
            let code = extract_code_from_text(&display_msg);
            let failure_reason = if let Some(c) = code {
                format!("{c}: {display_msg}")
            } else {
                display_msg.clone()
            };
            let mut payload = serde_json::Map::new();
            payload.insert(
                rpc_source_id_key.to_string(),
                serde_json::json!(rpc_source_id_val),
            );
            payload.insert(
                "p_recipient_type".to_string(),
                serde_json::json!(recipient_type),
            );
            payload.insert(
                "p_recipient_id".to_string(),
                serde_json::json!(recipient_id),
            );
            payload.insert(
                "p_stripe_connect_account_id".to_string(),
                serde_json::json!(stripe_account_id),
            );
            payload.insert(
                "p_amount_cents".to_string(),
                serde_json::json!(amount_cents),
            );
            payload.insert("p_currency".to_string(), serde_json::json!(currency));
            payload.insert("p_status".to_string(), serde_json::json!("failed"));
            payload.insert(
                "p_failure_reason".to_string(),
                serde_json::json!(failure_reason),
            );
            let _ = state
                .pg
                .rpc(rpc_name, serde_json::Value::Object(payload).to_string())
                .execute()
                .await;
            Err(display_msg)
        }
    }
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
    if (!state.stripe_creator_pro_price_id.trim().is_empty()
        && price_id == state.stripe_creator_pro_price_id)
        || (!state.stripe_creator_pro_annual_price_id.trim().is_empty()
            && price_id == state.stripe_creator_pro_annual_price_id)
    {
        return Some("pro");
    }
    if (!state.stripe_creator_basic_price_id.trim().is_empty()
        && price_id == state.stripe_creator_basic_price_id)
        || (!state.stripe_creator_basic_annual_price_id.trim().is_empty()
            && price_id == state.stripe_creator_basic_annual_price_id)
    {
        return Some("basic");
    }

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

fn stripe_subscription_to_interval_from_price_id(state: &AppState, price_id: &str) -> &'static str {
    if (!state.stripe_creator_pro_annual_price_id.trim().is_empty()
        && price_id == state.stripe_creator_pro_annual_price_id)
        || (!state.stripe_creator_basic_annual_price_id.trim().is_empty()
            && price_id == state.stripe_creator_basic_annual_price_id)
    {
        return "year";
    }
    "month"
}

fn stripe_subscription_to_plan_tier_from_metadata(
    sub: &stripe_sdk::Subscription,
) -> Option<&'static str> {
    if let Some(plan) = sub.metadata.get("plan") {
        let plan = plan.to_string().trim().to_lowercase();
        match plan.as_str() {
            "basic" => return Some("basic"),
            "pro" => return Some("pro"),
            "enterprise" => return Some("enterprise"),
            _ => {}
        }
    }
    if let Some(plan_tier) = sub.metadata.get("plan_tier") {
        let plan_tier = plan_tier.to_string().trim().to_lowercase();
        match plan_tier.as_str() {
            "basic" => return Some("basic"),
            "pro" => return Some("pro"),
            "enterprise" => return Some("enterprise"),
            _ => {}
        }
    }
    None
}

fn stripe_subscription_roster_models(sub: &stripe_sdk::Subscription) -> Option<i64> {
    let value = sub.metadata.get("roster_models")?.to_string();
    value.trim().parse::<i64>().ok().filter(|value| *value > 0)
}

fn stripe_subscription_metadata_flag(sub: &stripe_sdk::Subscription, key: &str) -> Option<bool> {
    let value = sub.metadata.get(key)?.to_string();
    let value = value.trim().to_lowercase();
    match value.as_str() {
        "1" | "true" | "yes" | "on" => Some(true),
        "0" | "false" | "no" | "off" => Some(false),
        _ => None,
    }
}

fn stripe_subscription_has_irl_booking_addon(
    state: &AppState,
    sub: &stripe_sdk::Subscription,
) -> bool {
    if let Some(enabled) = stripe_subscription_metadata_flag(sub, "addon_irl_booking") {
        return enabled;
    }

    let irl_price_id = state.stripe_agency_irl_booking_price_id.trim();
    if irl_price_id.is_empty() {
        return false;
    }

    sub.items.data.iter().any(|item| {
        item.price
            .as_ref()
            .map(|price| price.id.to_string())
            .as_deref()
            == Some(irl_price_id)
    })
}

fn stripe_subscription_plan_interval(
    state: &AppState,
    sub: &stripe_sdk::Subscription,
) -> &'static str {
    match sub
        .metadata
        .get("billing_interval")
        .map(|value| value.trim().to_lowercase())
        .as_deref()
    {
        Some("year") | Some("annual") | Some("annually") => return "year",
        Some("month") | Some("monthly") => return "month",
        _ => {}
    }

    for item in sub.items.data.iter() {
        let price_id = item
            .price
            .as_ref()
            .map(|price| price.id.to_string())
            .unwrap_or_default();
        if price_id.is_empty() {
            continue;
        }

        if price_id == state.stripe_agency_basic_base_annual_price_id
            || price_id == state.stripe_agency_basic_headcount_annual_price_id
            || price_id == state.stripe_agency_pro_base_annual_price_id
            || price_id == state.stripe_agency_pro_headcount_annual_price_id
            || price_id == state.stripe_agency_irl_booking_annual_price_id
        {
            return "year";
        }
    }

    "month"
}

pub(crate) fn stripe_subscription_is_active(sub: &stripe_sdk::Subscription) -> bool {
    matches!(sub.status.as_str(), "active" | "trialing")
}

fn stripe_subscription_seat_quantity(
    state: &AppState,
    sub: &stripe_sdk::Subscription,
) -> Option<i64> {
    let quantity = sub
        .items
        .data
        .iter()
        .filter_map(|item| {
            let price_id = item
                .price
                .as_ref()
                .map(|price| price.id.to_string())
                .unwrap_or_default();
            if crate::billing::agency_headcount_price_id_matches(state, price_id.as_str()) {
                item.quantity.and_then(|value| i64::try_from(value).ok())
            } else {
                None
            }
        })
        .sum::<i64>();

    if quantity > 0 {
        Some(quantity)
    } else {
        stripe_subscription_roster_models(sub)
    }
}

fn agency_plan_tier_rank(tier: &str) -> i32 {
    match tier {
        "enterprise" => 3,
        "pro" => 2,
        "basic" => 1,
        _ => 0,
    }
}

struct AggregatedAgencySubscriptionState {
    plan_tier: &'static str,
    plan_interval: &'static str,
    seats_limit: i64,
    addon_irl_booking_enabled: bool,
    primary_subscription_id: String,
}

fn stripe_subscription_to_plan_tier(
    state: &AppState,
    sub: &stripe_sdk::Subscription,
) -> Option<&'static str> {
    if let Some(tier) = stripe_subscription_to_plan_tier_from_metadata(sub) {
        return Some(tier);
    }

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

pub(crate) async fn fetch_subscription(
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

async fn list_customer_subscriptions(
    state: &AppState,
    customer_id: &str,
) -> Result<Vec<stripe_sdk::Subscription>, String> {
    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
    let parsed_customer_id = customer_id
        .parse::<stripe_sdk::CustomerId>()
        .map_err(|_| "invalid_stripe_customer_id".to_string())?;

    let mut params = stripe_sdk::ListSubscriptions::new();
    params.customer = Some(parsed_customer_id);
    params.status = Some(stripe_sdk::SubscriptionStatusFilter::All);
    params.limit = Some(100);

    let list = stripe_sdk::Subscription::list(&client, &params)
        .await
        .map_err(|e| e.to_string())?;
    Ok(list.data)
}

fn aggregate_agency_subscription_state(
    state: &AppState,
    agency_id: &str,
    subscriptions: &[stripe_sdk::Subscription],
    fallback_subscription: &stripe_sdk::Subscription,
) -> AggregatedAgencySubscriptionState {
    fn is_seat_addon_subscription(sub: &stripe_sdk::Subscription) -> bool {
        sub.metadata
            .get("subscription_kind")
            .map(|value| value.to_string())
            .is_some_and(|value| value.trim().eq_ignore_ascii_case("seat_addon"))
    }

    let exact_matches: Vec<&stripe_sdk::Subscription> = subscriptions
        .iter()
        .filter(|sub| {
            sub.metadata
                .get("agency_id")
                .map(|value| value.to_string())
                .is_some_and(|value| value.trim() == agency_id)
        })
        .collect();

    let mut relevant_subscriptions: Vec<&stripe_sdk::Subscription> = if !exact_matches.is_empty() {
        exact_matches
    } else if subscriptions.is_empty() {
        vec![fallback_subscription]
    } else {
        subscriptions.iter().collect()
    };

    if !relevant_subscriptions
        .iter()
        .any(|sub| sub.id == fallback_subscription.id)
    {
        relevant_subscriptions.push(fallback_subscription);
    }

    let active_subscriptions: Vec<&stripe_sdk::Subscription> = relevant_subscriptions
        .iter()
        .copied()
        .filter(|sub| stripe_subscription_is_active(sub))
        .collect();

    let mut best_plan: Option<(&'static str, &'static str, i64, String)> = None;
    for sub in &active_subscriptions {
        if is_seat_addon_subscription(sub) {
            continue;
        }
        let Some(tier) = stripe_subscription_to_plan_tier(state, sub) else {
            continue;
        };
        let plan_interval = stripe_subscription_plan_interval(state, sub);
        let roster_models = stripe_subscription_seat_quantity(state, sub).unwrap_or(1);

        let replace = match &best_plan {
            None => true,
            Some((current_tier, current_interval, current_roster, _)) => {
                let next_rank = agency_plan_tier_rank(tier);
                let current_rank = agency_plan_tier_rank(current_tier);
                next_rank > current_rank
                    || (next_rank == current_rank
                        && (roster_models > *current_roster
                            || (roster_models == *current_roster
                                && plan_interval == "year"
                                && *current_interval != "year")))
            }
        };

        if replace {
            best_plan = Some((tier, plan_interval, roster_models, sub.id.to_string()));
        }
    }

    let addon_irl_booking_enabled = active_subscriptions
        .iter()
        .any(|sub| stripe_subscription_has_irl_booking_addon(state, sub));
    let aggregated_seat_quantity = active_subscriptions
        .iter()
        .filter_map(|sub| stripe_subscription_seat_quantity(state, sub))
        .sum::<i64>();

    let (plan_tier, plan_interval, seats_limit, primary_subscription_id) = match best_plan {
        Some((tier, interval, roster_models, subscription_id)) => (
            tier,
            interval,
            if aggregated_seat_quantity > 0 {
                aggregated_seat_quantity
            } else {
                roster_models
            },
            subscription_id,
        ),
        None => {
            let addon_subscription_id = active_subscriptions
                .iter()
                .find(|sub| stripe_subscription_has_irl_booking_addon(state, sub))
                .map(|sub| sub.id.to_string())
                .unwrap_or_else(|| fallback_subscription.id.to_string());
            (
                "none",
                "month",
                if aggregated_seat_quantity > 0 {
                    aggregated_seat_quantity
                } else {
                    1
                },
                addon_subscription_id,
            )
        }
    };

    AggregatedAgencySubscriptionState {
        plan_tier,
        plan_interval,
        seats_limit,
        addon_irl_booking_enabled,
        primary_subscription_id,
    }
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

pub(crate) async fn sync_agency_subscription_from_stripe(
    state: &AppState,
    agency_id: &str,
    subscription_id: &str,
    customer_id: Option<&str>,
) -> Result<(), String> {
    let sub = fetch_subscription(state, subscription_id).await?;

    let seat_charge_mode = sub
        .metadata
        .get("seat_charge_mode")
        .map(|v| v.trim().to_lowercase())
        .unwrap_or_default();
    let roster_models_total: Option<i64> = sub
        .metadata
        .get("roster_models_total")
        .and_then(|v| v.trim().parse::<i64>().ok());

    let is_seat_addon_subscription = sub
        .metadata
        .get("subscription_kind")
        .map(|value| value.trim().eq_ignore_ascii_case("seat_addon"))
        .unwrap_or(false);

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
    let trial_ends_at = sub
        .trial_end
        .and_then(|ts| chrono::DateTime::<chrono::Utc>::from_timestamp(ts, 0))
        .map(|dt| dt.to_rfc3339());
    let aggregated = if let Some(cust) = customer_id.filter(|cust| !cust.trim().is_empty()) {
        match list_customer_subscriptions(state, cust).await {
            Ok(subscriptions) => {
                aggregate_agency_subscription_state(state, agency_id, &subscriptions, &sub)
            }
            Err(err) => {
                warn!(
                    agency_id = %agency_id,
                    customer_id = %cust,
                    error = %err,
                    "failed to list customer subscriptions, falling back to single-subscription sync"
                );
                aggregate_agency_subscription_state(state, agency_id, &[], &sub)
            }
        }
    } else {
        aggregate_agency_subscription_state(state, agency_id, &[], &sub)
    };

    let storage_limit_bytes: i64 = match aggregated.plan_tier {
        "basic" => 500_i64 * 1024 * 1024 * 1024,
        "pro" => 1024_i64 * 1024 * 1024 * 1024,
        _ => 5_i64 * 1024 * 1024 * 1024,
    };

    // Update agency profile
    let mut update = serde_json::Map::new();
    if !is_seat_addon_subscription {
        update.insert("plan_tier".into(), json!(aggregated.plan_tier));
        update.insert("plan_interval".into(), json!(aggregated.plan_interval));
    }
    let seats_limit = if !is_seat_addon_subscription
        && seat_charge_mode == "delta"
        && roster_models_total.unwrap_or(0) > 0
    {
        roster_models_total.unwrap_or(aggregated.seats_limit)
    } else {
        aggregated.seats_limit
    };
    update.insert("seats_limit".into(), json!(seats_limit));
    update.insert(
        "addon_irl_booking_enabled".into(),
        json!(aggregated.addon_irl_booking_enabled),
    );
    if !is_seat_addon_subscription {
        update.insert(
            "stripe_subscription_id".into(),
            json!(aggregated.primary_subscription_id),
        );
    }
    update.insert(
        "plan_updated_at".into(),
        json!(chrono::Utc::now().to_rfc3339()),
    );
    if !is_seat_addon_subscription {
        update.insert(
            "trial_ends_at".into(),
            match status.as_str() {
                "trialing" => trial_ends_at.map_or(serde_json::Value::Null, |value| json!(value)),
                _ => serde_json::Value::Null,
            },
        );
    }
    if let Some(cust) = customer_id {
        if !cust.trim().is_empty() {
            update.insert("stripe_customer_id".into(), json!(cust));
        }
    }

    // Before writing the new subscription ID, check if the agency already has a different
    // active subscription that would result in double-billing.
    let old_subscription_id: Option<String> = async {
        let resp = state
            .pg
            .from("agencies")
            .select("stripe_subscription_id")
            .eq("id", agency_id)
            .limit(1)
            .execute()
            .await
            .ok()?;
        let text = resp.text().await.ok()?;
        let rows: Vec<serde_json::Value> = serde_json::from_str(&text).ok()?;
        rows.first()
            .and_then(|row| row.get("stripe_subscription_id"))
            .and_then(|v| v.as_str())
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
    }
    .await;

    if let Some(ref old_sub_id) = old_subscription_id {
        let is_different = old_sub_id != subscription_id;
        let is_not_seat_addon = !aggregated.primary_subscription_id.is_empty()
            && old_sub_id != &aggregated.primary_subscription_id;
        if is_different && is_not_seat_addon {
            let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
            match old_sub_id.parse::<stripe_sdk::SubscriptionId>() {
                Ok(parsed_old_id) => {
                    match stripe_sdk::Subscription::cancel(
                        &client,
                        &parsed_old_id,
                        stripe_sdk::CancelSubscription::default(),
                    )
                    .await
                    {
                        Ok(_) => {
                            info!(
                                agency_id = %agency_id,
                                old_subscription_id = %old_sub_id,
                                new_subscription_id = %subscription_id,
                                "cancelled superseded agency subscription to prevent double-billing"
                            );
                        }
                        Err(e) => {
                            warn!(
                                agency_id = %agency_id,
                                old_subscription_id = %old_sub_id,
                                error = %e,
                                "failed to cancel superseded agency subscription (best-effort)"
                            );
                        }
                    }
                }
                Err(_) => {
                    warn!(
                        agency_id = %agency_id,
                        old_subscription_id = %old_sub_id,
                        "could not parse old subscription id for cancellation"
                    );
                }
            }
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

    info!(
        agency_id = %agency_id,
        plan_tier = %aggregated.plan_tier,
        addon_irl_booking_enabled = aggregated.addon_irl_booking_enabled,
        subscription_id = %subscription_id,
        "synced agency plan tier from stripe subscription"
    );
    Ok(())
}

fn brand_subscription_to_plan_tier_from_price_id(
    state: &AppState,
    price_id: &str,
) -> Option<&'static str> {
    if (!state.stripe_brand_pro_price_id.trim().is_empty()
        && price_id == state.stripe_brand_pro_price_id)
        || (!state.stripe_brand_pro_annual_price_id.trim().is_empty()
            && price_id == state.stripe_brand_pro_annual_price_id)
    {
        return Some("pro");
    }
    if (!state.stripe_brand_basic_price_id.trim().is_empty()
        && price_id == state.stripe_brand_basic_price_id)
        || (!state.stripe_brand_basic_annual_price_id.trim().is_empty()
            && price_id == state.stripe_brand_basic_annual_price_id)
    {
        return Some("basic");
    }
    None
}

fn brand_subscription_to_plan_tier(
    state: &AppState,
    sub: &stripe_sdk::Subscription,
) -> Option<&'static str> {
    for item in sub.items.data.iter() {
        let price_id = item
            .price
            .as_ref()
            .map(|p| p.id.to_string())
            .unwrap_or_default();
        if price_id.trim().is_empty() {
            continue;
        }
        if let Some(tier) = brand_subscription_to_plan_tier_from_price_id(state, price_id.trim()) {
            return Some(tier);
        }
    }
    None
}

fn brand_subscription_has_studio_addon(state: &AppState, sub: &stripe_sdk::Subscription) -> bool {
    if state.stripe_brand_studio_addon_price_id.trim().is_empty() {
        return false;
    }

    sub.items.data.iter().any(|item| {
        item.price
            .as_ref()
            .map(|price| price.id == state.stripe_brand_studio_addon_price_id)
            .unwrap_or(false)
    })
}

fn brand_subscription_target(
    state: &AppState,
    sub: &stripe_sdk::Subscription,
) -> Option<&'static str> {
    match sub.metadata.get("billing_target").map(|s| s.trim()) {
        Some("base") => return Some("base"),
        Some("studio_addon") => return Some("studio_addon"),
        _ => {}
    }

    if brand_subscription_to_plan_tier(state, sub).is_some() {
        return Some("base");
    }
    if brand_subscription_has_studio_addon(state, sub) {
        return Some("studio_addon");
    }
    None
}

fn brand_subscription_studio_plan(sub: &stripe_sdk::Subscription) -> String {
    let plan = sub
        .metadata
        .get("studio_plan")
        .map(|value| value.trim().to_lowercase())
        .filter(|value| value == "lite" || value == "pro");

    plan.unwrap_or_else(|| crate::billing::BRAND_STUDIO_ADDON_STUDIO_PLAN.to_string())
}

fn brand_subscription_studio_credits(sub: &stripe_sdk::Subscription) -> i64 {
    sub.metadata
        .get("studio_credits")
        .and_then(|value| value.trim().parse::<i64>().ok())
        .filter(|credits| *credits > 0)
        .unwrap_or(crate::billing::BRAND_STUDIO_ADDON_STUDIO_CREDITS)
}

async fn sync_brand_subscription_from_subscription(
    state: &AppState,
    brand_id: &str,
    subscription_id: &str,
    customer_id: Option<&str>,
    sub: &stripe_sdk::Subscription,
) -> Result<(), String> {
    let Some(target) = brand_subscription_target(state, sub) else {
        return Ok(());
    };

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
    let trial_end = sub
        .trial_end
        .and_then(|ts| chrono::DateTime::<chrono::Utc>::from_timestamp(ts, 0))
        .map(|dt| dt.to_rfc3339());

    let mut update = serde_json::Map::new();

    if target == "base" {
        let tier = brand_subscription_to_plan_tier(state, sub);
        let plan_tier = match (tier, status.as_str()) {
            (Some(t), "active") | (Some(t), "trialing") => t,
            _ => "free",
        };

        update.insert("plan_tier".into(), json!(plan_tier));
        update.insert("stripe_subscription_id".into(), json!(subscription_id));
        update.insert("subscription_status".into(), json!(status));
        update.insert(
            "subscription_current_period_end".into(),
            current_period_end
                .map(|dt| json!(dt))
                .unwrap_or(serde_json::Value::Null),
        );
        update.insert(
            "subscription_cancel_at_period_end".into(),
            json!(cancel_at_period_end),
        );
        update.insert(
            "subscription_trial_end".into(),
            trial_end
                .map(|dt| json!(dt))
                .unwrap_or(serde_json::Value::Null),
        );
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
            .from("brands")
            .eq("id", brand_id)
            .update(serde_json::Value::Object(update).to_string())
            .execute()
            .await;

        let brand_storage_limit_bytes: i64 = match plan_tier {
            "basic" => 50_i64 * 1024 * 1024 * 1024,
            "pro" => 200_i64 * 1024 * 1024 * 1024,
            "enterprise" => 1024_i64 * 1024 * 1024 * 1024,
            _ => 5_i64 * 1024 * 1024 * 1024,
        };

        let upsert_payload = json!({
            "brand_id": brand_id,
            "storage_limit_bytes": brand_storage_limit_bytes,
            "updated_at": chrono::Utc::now().to_rfc3339(),
        });
        let storage_resp = state
            .pg
            .from("brand_storage_settings")
            .upsert(upsert_payload.to_string())
            .execute()
            .await;

        match storage_resp {
            Ok(resp) if resp.status().is_success() => {
                info!(
                    brand_id = %brand_id,
                    plan_tier = %plan_tier,
                    storage_limit_bytes = brand_storage_limit_bytes,
                    "brand_storage_settings upserted successfully"
                );
            }
            Ok(resp) => {
                let status = resp.status();
                let text = resp.text().await.unwrap_or_default();
                warn!(
                    brand_id = %brand_id,
                    status = %status,
                    error = %text,
                    "brand_storage_settings upsert returned non-success status"
                );
            }
            Err(e) => {
                error!(
                    brand_id = %brand_id,
                    error = %e,
                    "brand_storage_settings upsert failed"
                );
            }
        }

        info!(
            brand_id = %brand_id,
            plan_tier = %plan_tier,
            subscription_id = %subscription_id,
            storage_limit_bytes = brand_storage_limit_bytes,
            "synced brand base subscription from stripe subscription"
        );
        return Ok(());
    }

    let studio_addon_active = matches!(status.as_str(), "active" | "trialing");
    update.insert("studio_addon_active".into(), json!(studio_addon_active));
    update.insert(
        "studio_addon_subscription_id".into(),
        json!(subscription_id),
    );
    update.insert("studio_addon_status".into(), json!(status));
    update.insert(
        "studio_addon_current_period_end".into(),
        current_period_end
            .map(|dt| json!(dt))
            .unwrap_or(serde_json::Value::Null),
    );
    update.insert(
        "studio_addon_cancel_at_period_end".into(),
        json!(cancel_at_period_end),
    );
    update.insert(
        "studio_addon_updated_at".into(),
        json!(chrono::Utc::now().to_rfc3339()),
    );
    if let Some(cust) = customer_id {
        if !cust.trim().is_empty() {
            update.insert("stripe_customer_id".into(), json!(cust));
        }
    }

    let _ = state
        .pg
        .from("brands")
        .eq("id", brand_id)
        .update(serde_json::Value::Object(update).to_string())
        .execute()
        .await;

    info!(
        brand_id = %brand_id,
        subscription_id = %subscription_id,
        price_id = %price_id,
        active = studio_addon_active,
        "synced brand studio add-on from stripe subscription"
    );
    Ok(())
}

#[allow(dead_code)]
async fn sync_brand_subscription_from_stripe(
    state: &AppState,
    brand_id: &str,
    subscription_id: &str,
    customer_id: Option<&str>,
) -> Result<(), String> {
    let sub = fetch_subscription(state, subscription_id).await?;
    sync_brand_subscription_from_subscription(state, brand_id, subscription_id, customer_id, &sub)
        .await
}

async fn provision_brand_studio_addon_from_invoice(
    state: &AppState,
    brand_id: &str,
    invoice_id: &str,
    sub: &stripe_sdk::Subscription,
) -> Result<(), String> {
    if brand_subscription_target(state, sub) != Some("studio_addon") {
        return Ok(());
    }

    if !matches!(sub.status.to_string().as_str(), "active" | "trialing") {
        return Ok(());
    }

    let invoice_id = invoice_id.trim();
    if invoice_id.is_empty() {
        return Ok(());
    }

    if crate::studio::wallet::has_stripe_credit_transaction(&state.pg, invoice_id)
        .await
        .map_err(|e| e.to_string())?
    {
        return Ok(());
    }

    let credits = brand_subscription_studio_credits(sub);
    if credits <= 0 {
        return Ok(());
    }
    let plan = brand_subscription_studio_plan(sub);

    crate::studio::wallet::add_credits_with_reason(
        &state.pg,
        brand_id,
        credits,
        "brand_studio_addon",
        Some(invoice_id),
    )
    .await
    .map_err(|e| e.to_string())?;

    let _ = crate::studio::wallet::set_current_plan(&state.pg, brand_id, Some(plan.as_str())).await;

    info!(
        brand_id = %brand_id,
        invoice_id = %invoice_id,
        credits = credits,
        plan = %plan,
        "provisioned brand studio add-on studio plan from invoice"
    );
    Ok(())
}

async fn handle_brand_invoice_paid(
    state: &AppState,
    subscription_id: &str,
    customer_id: Option<&str>,
    invoice_id: Option<&str>,
) -> Result<(), String> {
    let sub = fetch_subscription(state, subscription_id).await?;
    let brand_id = sub.metadata.get("brand_id").cloned().unwrap_or_default();
    if brand_id.trim().is_empty() {
        return Ok(());
    }

    sync_brand_subscription_from_subscription(
        state,
        brand_id.trim(),
        subscription_id,
        customer_id,
        &sub,
    )
    .await?;

    provision_brand_studio_addon_from_invoice(
        state,
        brand_id.trim(),
        invoice_id.unwrap_or(""),
        &sub,
    )
    .await
}

async fn sync_creator_subscription_by_subscription_id(
    state: &AppState,
    subscription_id: &str,
    customer_id: Option<&str>,
    invoice_id: Option<&str>,
) -> Result<(), String> {
    let sub = fetch_subscription(state, subscription_id).await?;
    let creator_id = sub.metadata.get("creator_id").cloned().unwrap_or_default();
    if creator_id.trim().is_empty() {
        return Ok(());
    }
    sync_creator_subscription_from_stripe(
        state,
        creator_id.trim(),
        subscription_id,
        customer_id,
        invoice_id,
    )
    .await
}

async fn sync_creator_subscription_from_stripe(
    state: &AppState,
    creator_id: &str,
    subscription_id: &str,
    customer_id: Option<&str>,
    _invoice_id: Option<&str>,
) -> Result<(), String> {
    let sub = fetch_subscription(state, subscription_id).await?;
    let _price_id = sub
        .items
        .data
        .first()
        .and_then(|i| i.price.as_ref())
        .map(|p| p.id.to_string())
        .unwrap_or_default();
    let status = sub.status.to_string();

    let (plan_tier, plan_interval) = match (
        stripe_subscription_to_plan_tier(state, &sub),
        status.as_str(),
    ) {
        (Some(t), "active") | (Some(t), "trialing") => {
            let interval = sub
                .items
                .data
                .first()
                .and_then(|i| i.price.as_ref())
                .map(|p| stripe_subscription_to_interval_from_price_id(state, p.id.as_str()))
                .unwrap_or("month");
            (t, interval)
        }
        _ => ("none", "month"),
    };

    let cancel_at_period_end = sub.cancel_at_period_end;
    let current_period_end =
        chrono::DateTime::<chrono::Utc>::from_timestamp(sub.current_period_end, 0)
            .map(|dt| dt.to_rfc3339());
    let _trial_end = sub
        .trial_end
        .and_then(|ts| chrono::DateTime::<chrono::Utc>::from_timestamp(ts, 0))
        .map(|dt| dt.to_rfc3339());

    let mut update = serde_json::Map::new();

    if status == "trialing" {
        let ts = chrono::DateTime::<chrono::Utc>::from_timestamp(sub.start_date, 0)
            .map(|dt| dt.to_rfc3339())
            .unwrap_or_else(|| chrono::Utc::now().to_rfc3339());
        update.insert("trial_started_at".into(), json!(ts));

        match plan_tier {
            "basic" => {
                update.insert("trial_basic_started_at".into(), json!(ts));
            }
            "pro" => {
                update.insert("trial_pro_started_at".into(), json!(ts));
            }
            _ => {}
        }
    } else {
        update.insert("trial_started_at".into(), json!(null));
        update.insert("trial_basic_started_at".into(), json!(null));
        update.insert("trial_pro_started_at".into(), json!(null));
    }

    update.insert("plan_tier".into(), json!(plan_tier));
    update.insert("plan_interval".into(), json!(plan_interval));
    update.insert(
        "stripe_cancel_at_period_end".into(),
        json!(cancel_at_period_end),
    );
    if let Some(cpe) = current_period_end {
        update.insert("stripe_current_period_end".into(), json!(cpe));
    }
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
        .from("creators")
        .eq("id", creator_id)
        .update(serde_json::Value::Object(update).to_string())
        .execute()
        .await;

    let mut event_row = serde_json::Map::new();
    event_row.insert("creator_id".into(), json!(creator_id));
    event_row.insert("provider".into(), json!("stripe"));
    event_row.insert("stripe_subscription_id".into(), json!(subscription_id));
    event_row.insert(
        "stripe_customer_id".into(),
        json!(customer_id.unwrap_or("")),
    );
    event_row.insert("event_type".into(), json!("subscription_sync"));
    event_row.insert("plan_tier".into(), json!(plan_tier));
    event_row.insert("subscription_status".into(), json!(status));
    event_row.insert("payload_json".into(), json!(sub));
    let _ = state
        .pg
        .from("creator_subscription_events")
        .insert(serde_json::Value::Object(event_row).to_string())
        .execute()
        .await;

    info!(creator_id = %creator_id, plan_tier = %plan_tier, subscription_id = %subscription_id, "synced creator plan tier from stripe subscription");
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
    let agency_id = match require_agency_permission(&state, &user, Permission::ManageBilling).await
    {
        Ok(access) => access.organization_id,
        Err((code, msg)) => {
            return (code, Json(json!({"status":"error","error": msg})));
        }
    };
    // Get available balance from agency_balances table
    let balance_resp = match state
        .pg
        .from("agency_balances")
        .select("available_cents,earned_cents,currency,updated_at")
        .eq("agency_id", &agency_id)
        .limit(1)
        .execute()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            return internal_error_response("get_agency_balance.fetch", e);
        }
    };

    let balance_status = balance_resp.status();
    let balance_text = match balance_resp.text().await {
        Ok(t) => t,
        Err(e) => {
            return internal_error_response("get_agency_balance.read_body", e);
        }
    };
    let balance_text = if !balance_status.is_success() {
        // Backward compatible fallback: some DBs may not have `earned_cents` yet.
        if balance_text.contains("earned_cents")
            && (balance_text.contains("does not exist") || balance_text.contains("column"))
        {
            let resp2 = match state
                .pg
                .from("agency_balances")
                .select("available_cents,currency,updated_at")
                .eq("agency_id", &agency_id)
                .limit(1)
                .execute()
                .await
            {
                Ok(r) => r,
                Err(e) => {
                    return internal_error_response("get_agency_balance.fetch_fallback", e);
                }
            };
            let st2 = resp2.status();
            let txt2 = resp2.text().await.unwrap_or_else(|_| "[]".into());
            if !st2.is_success() {
                return sanitized_error_response(st2.as_u16(), txt2);
            }
            txt2
        } else {
            return sanitized_error_response(balance_status.as_u16(), balance_text);
        }
    } else {
        balance_text
    };

    let balance_rows: Vec<serde_json::Value> =
        serde_json::from_str(&balance_text).unwrap_or_default();
    let mut balance_row = balance_rows.first().cloned().unwrap_or(json!({
        "available_cents": 0,
        "currency": "USD"
    }));
    // If fallback query ran (no earned_cents), ensure it exists for response shape.
    if balance_row.get("earned_cents").is_none() {
        if let Some(obj) = balance_row.as_object_mut() {
            obj.insert("earned_cents".to_string(), json!(0));
        }
    }

    let currency = balance_row
        .get("currency")
        .and_then(|v| v.as_str())
        .unwrap_or("USD")
        .to_string();

    // Stripe-connected cashout balance snapshot (best-effort).
    let mut stripe_balances: Vec<StripeBalanceRow> = vec![];
    let stripe_account_id = match state
        .pg
        .from("agencies")
        .select("stripe_connect_account_id")
        .eq("id", &agency_id)
        .limit(1)
        .execute()
        .await
    {
        Ok(r) => {
            let txt = r.text().await.unwrap_or_else(|_| "[]".into());
            let v: Vec<serde_json::Value> = serde_json::from_str(&txt).unwrap_or_default();
            v.first()
                .and_then(|row| row.get("stripe_connect_account_id"))
                .and_then(|x| x.as_str())
                .unwrap_or("")
                .trim()
                .to_string()
        }
        Err(_) => "".to_string(),
    };
    if !stripe_account_id.is_empty() {
        let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
        stripe_balances = fetch_connected_balance_rows(
            &client,
            &stripe_account_id,
            &state.payout_allowed_currencies,
        )
        .await;
    }

    (
        StatusCode::OK,
        Json(json!({
            "available_balance": {
                "amount_cents": balance_row.get("available_cents").and_then(|v| v.as_i64()).unwrap_or(0),
                "earned_cents": balance_row.get("earned_cents").and_then(|v| v.as_i64()).unwrap_or(0),
                "currency": currency.clone()
            },
            "stripe_balances": stripe_balances
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
    let net_cents = payload.amount_cents - fee_cents;

    // Payouts are executed on the CONNECTED account balance.
    // Therefore, the cashout ceiling must be based on Stripe (not internal ledger balances).
    let stripe_available_cents = fetch_connected_available_cents(
        state.stripe_secret_key.as_str(),
        &stripe_account_id,
        &currency,
    )
    .await
    .unwrap_or(0);
    if stripe_available_cents < net_cents {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "status":"error",
                "error":"stripe_insufficient_available_balance",
                "stripe_available_cents": stripe_available_cents
            })),
        );
    }

    // Compute fee
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

    let stripe_available_cents = fetch_connected_available_cents(
        state.stripe_secret_key.as_str(),
        stripe_account_id,
        currency,
    )
    .await;
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

    if stripe_available_cents.unwrap_or(0) < net_cents {
        let _ = state
            .pg
            .from("agency_payout_requests")
            .eq("id", payout_request_id)
            .update(
                json!({
                    "status":"failed",
                    "failure_reason":"stripe_insufficient_available_balance"
                })
                .to_string(),
            )
            .execute()
            .await;
        return Err(());
    }

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
    stripe_secret_key: &str,
    connected_account_id: &str,
    currency: &str,
) -> Option<i64> {
    let acct = connected_account_id.parse::<stripe_sdk::AccountId>().ok()?;
    let connected_client = stripe_sdk::Client::new(stripe_secret_key).with_stripe_account(acct);
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
    let agency_id = match require_agency_permission(&state, &user, Permission::ManageBilling).await
    {
        Ok(access) => access.organization_id,
        Err((code, msg)) => {
            return (code, Json(json!({"status":"error","error": msg})));
        }
    };
    let resp = match state
        .pg
        .from("agency_payout_requests")
        .select("id,amount_cents,currency,payout_method,status,requested_at,processed_at,stripe_transfer_id,stripe_payout_id,failure_reason")
        .eq("agency_id", &agency_id)
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

async fn handle_campaign_offer_checkout_session_completed(
    state: &AppState,
    obj: &serde_json::Value,
) -> Result<(), String> {
    let md = obj.get("metadata").cloned().unwrap_or(json!({}));
    let offer_id = md
        .get("offer_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let target_type = md
        .get("target_type")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let session_id = obj
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();

    tracing::info!(offer_id = %offer_id, "Processing campaign offer checkout completion");

    if offer_id.is_empty() {
        return Err("missing_offer_id".into());
    }

    let offer_resp = state
        .pg
        .from("campaign_offers")
        .select("id,payment_status,paid_at,billing_request_id")
        .eq("id", &offer_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| e.to_string())?;
    let offer_text = offer_resp.text().await.unwrap_or_else(|_| "[]".into());
    let offer_rows: Vec<serde_json::Value> = serde_json::from_str(&offer_text).unwrap_or_default();
    let existing_offer = offer_rows.first().cloned().unwrap_or_else(|| json!({}));
    let existing_paid_at = existing_offer
        .get("paid_at")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let billing_request_id_from_offer = existing_offer
        .get("billing_request_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let paid_at_rfc3339 = if existing_paid_at.is_empty() {
        chrono::Utc::now().to_rfc3339()
    } else {
        existing_paid_at.clone()
    };

    // Mark the offer as paid
    if existing_offer
        .get("payment_status")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        != "paid"
        || existing_paid_at.is_empty()
    {
        let update_resp = state
            .pg
            .from("campaign_offers")
            .eq("id", &offer_id)
            .update(
                json!({
                    "payment_status": "paid",
                    "paid_at": paid_at_rfc3339,
                    "updated_at": chrono::Utc::now().to_rfc3339()
                })
                .to_string(),
            )
            .execute()
            .await
            .map_err(|e| e.to_string())?;

        if !update_resp.status().is_success() {
            tracing::error!("Failed to update campaign offer {} to paid", offer_id);
        }
    }

    if target_type == "agency" {
        let billing_request_ids = md
            .get("licensing_request_ids")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        let billing_request_id = if billing_request_ids.is_empty() {
            billing_request_id_from_offer
        } else {
            billing_request_ids
                .split(',')
                .next()
                .unwrap_or("")
                .trim()
                .to_string()
        };
        let agency_id = md
            .get("agency_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();

        if billing_request_id.is_empty() || agency_id.is_empty() || session_id.is_empty() {
            tracing::warn!(
                offer_id = %offer_id,
                agency_id = %agency_id,
                billing_request_ids = %billing_request_ids,
                session_id = %session_id,
                "campaign offer paid but missing billing identifiers; skipping distribution"
            );
            return Ok(());
        }

        let payments_update_resp = state
            .pg
            .from("payments")
            .eq("licensing_request_id", &billing_request_id)
            .update(
                json!({
                    "status": "succeeded",
                    "paid_at": paid_at_rfc3339
                })
                .to_string(),
            )
            .execute()
            .await;
        match payments_update_resp {
            Ok(resp) if !resp.status().is_success() => {
                let body = resp.text().await.unwrap_or_default();
                tracing::warn!(
                    offer_id = %offer_id,
                    licensing_request_id = %billing_request_id,
                    body = %body,
                    "failed to mark campaign offer payment rows as succeeded"
                );
            }
            Err(e) => {
                tracing::warn!(
                    offer_id = %offer_id,
                    licensing_request_id = %billing_request_id,
                    error = %e,
                    "transport error marking campaign offer payment rows as succeeded"
                );
            }
            _ => {}
        }

        // Distribute funds to agency + assigned talents by writing a single licensing_payouts row
        // with talent_splits; DB triggers will credit agency_balances + creator_balances.
        let _ = handle_campaign_offer_agency_distribution(
            state,
            &offer_id,
            &agency_id,
            &billing_request_id,
            &session_id,
            obj,
        )
        .await;
    } else {
        // Handle independent creator checkout
        let creator_id = md
            .get("target_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let amount_total = obj
            .get("amount_total")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        let currency = obj
            .get("currency")
            .and_then(|v| v.as_str())
            .unwrap_or("usd")
            .to_string();

        if !creator_id.is_empty() && amount_total > 0 {
            // Idempotency: check if we've already credited this session
            let existing_resp = state
                .pg
                .from("campaign_offers")
                .select("id,budget_snapshot,escrow_status")
                .eq("id", &offer_id)
                .limit(1)
                .execute()
                .await
                .map_err(|e| e.to_string())?;
            let existing_text = existing_resp.text().await.unwrap_or_else(|_| "[]".into());
            let existing_rows: Vec<serde_json::Value> =
                serde_json::from_str(&existing_text).unwrap_or_default();
            let offer_data = existing_rows.first().cloned().unwrap_or_else(|| json!({}));
            let already_credited = offer_data
                .get("escrow_status")
                .and_then(|v| v.as_str())
                .map(|s| s != "holding")
                .unwrap_or(false);

            if already_credited {
                tracing::info!(
                    offer_id = %offer_id,
                    creator_id = %creator_id,
                    "creator balance already credited for this offer (idempotent)"
                );
                return Ok(());
            }

            // Use net amount (budget_creator_payment) not gross (amount_total)
            let budget_snapshot = offer_data
                .get("budget_snapshot")
                .and_then(|v| v.as_object())
                .cloned()
                .unwrap_or_default();
            let net_str = budget_snapshot
                .get("budget_creator_payment")
                .and_then(|v| v.as_str())
                .unwrap_or("0")
                .replace(",", "");
            let net_amount: f64 = net_str.parse().unwrap_or(0.0);
            let net_amount_cents = (net_amount * 100.0).round() as i64;

            if net_amount_cents <= 0 {
                tracing::warn!(
                    offer_id = %offer_id,
                    creator_id = %creator_id,
                    "creator offer has zero net amount; skipping balance credit"
                );
                return Ok(());
            }

            tracing::info!(
                creator_id = %creator_id,
                net_amount_cents = net_amount_cents,
                gross_amount_cents = amount_total,
                "Crediting creator balance with net amount (not gross)"
            );

            let _ = state
                .pg
                .rpc(
                    "increment_creator_balance",
                    json!({
                        "p_creator_id": creator_id,
                        "p_amount_cents": net_amount_cents,
                        "p_currency_code": currency
                    })
                    .to_string(),
                )
                .execute()
                .await;
        }
    }

    Ok(())
}

async fn handle_campaign_offer_agency_distribution(
    state: &AppState,
    offer_id: &str,
    agency_id: &str,
    billing_request_ids: &str,
    stripe_checkout_session_id: &str,
    obj: &serde_json::Value,
) -> Result<(), String> {
    // For campaign offers, billing_request_ids is expected to be a single licensing_request_id (shadow stub).
    let licensing_request_id = billing_request_ids
        .split(',')
        .next()
        .unwrap_or("")
        .trim()
        .to_string();
    if licensing_request_id.is_empty() {
        return Ok(());
    }

    // Idempotency: if we've already inserted the payout for this (session, licensing_request_id), skip.
    let existing_resp = state
        .pg
        .from("licensing_payouts")
        .select("id")
        .eq("stripe_checkout_session_id", stripe_checkout_session_id)
        .eq("licensing_request_id", &licensing_request_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| e.to_string())?;
    if existing_resp.status().is_success() {
        let txt = existing_resp.text().await.unwrap_or_else(|_| "[]".into());
        let rows: Vec<serde_json::Value> = serde_json::from_str(&txt).unwrap_or_default();
        if !rows.is_empty() {
            tracing::info!(
                offer_id = %offer_id,
                licensing_request_id = %licensing_request_id,
                stripe_checkout_session_id = %stripe_checkout_session_id,
                "campaign offer distribution already processed (idempotent)"
            );
            return Ok(());
        }
    }

    // Load offer budget snapshot for net vs gross.
    let offer_resp = state
        .pg
        .from("campaign_offers")
        .select("id,budget_snapshot")
        .eq("id", offer_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| e.to_string())?;
    let offer_txt = offer_resp.text().await.unwrap_or_else(|_| "[]".into());
    let offer_rows: Vec<serde_json::Value> = serde_json::from_str(&offer_txt).unwrap_or_default();
    let offer = offer_rows.first().cloned().unwrap_or(json!({}));
    let budget_snapshot = offer
        .get("budget_snapshot")
        .and_then(|v| v.as_object())
        .cloned()
        .unwrap_or_default();

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
    let payment_intent_id = obj
        .get("payment_intent")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();

    let parse_dollars_to_cents = |s: &str| -> i64 {
        let s = s.trim().replace(",", "");
        if s.is_empty() {
            return 0;
        }
        let v: f64 = s.parse().unwrap_or(0.0);
        (v * 100.0).round() as i64
    };

    let net_amount_cents = budget_snapshot
        .get("budget_creator_payment")
        .and_then(|v| v.as_str())
        .map(parse_dollars_to_cents)
        .filter(|v| *v > 0)
        .unwrap_or(gross_total_cents);
    let platform_fee_cents = (gross_total_cents - net_amount_cents).max(0);

    #[derive(Clone)]
    struct DistributionRow {
        payment_id: String,
        creator_id: String,
        talent_id: Option<String>,
        weight_cents: i64,
    }

    // Prefer payments stub rows (created when the contract becomes fully signed). Fallback to assignments.
    let payments_resp = state
        .pg
        .from("payments")
        .select("id,creator_id,talent_id,gross_cents")
        .eq("agency_id", agency_id)
        .eq("licensing_request_id", &licensing_request_id)
        .execute()
        .await
        .map_err(|e| e.to_string())?;
    let payments_txt = payments_resp.text().await.unwrap_or_else(|_| "[]".into());
    let payment_rows: Vec<serde_json::Value> =
        serde_json::from_str(&payments_txt).unwrap_or_default();

    let mut rows: Vec<DistributionRow> = vec![];
    for p in &payment_rows {
        let payment_id = p.get("id").and_then(|v| v.as_str()).unwrap_or("").trim();
        if payment_id.is_empty() {
            continue;
        }
        let creator_id = p
            .get("creator_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        let talent_id = p
            .get("talent_id")
            .and_then(|v| v.as_str())
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
        let weight_cents = p.get("gross_cents").and_then(|v| v.as_i64()).unwrap_or(0);
        rows.push(DistributionRow {
            payment_id: payment_id.to_string(),
            creator_id,
            talent_id,
            weight_cents: weight_cents.max(0),
        });
    }

    if rows.is_empty() {
        tracing::warn!(
            offer_id = %offer_id,
            licensing_request_id = %licensing_request_id,
            "no payments rows found for campaign offer distribution; falling back to assignments"
        );
        let assignments_resp = state
            .pg
            .from("offer_talent_assignments")
            .select("creator_id,talent_id")
            .eq("offer_id", offer_id)
            .eq("status", "assigned")
            .execute()
            .await
            .map_err(|e| e.to_string())?;
        let assignments_txt = assignments_resp
            .text()
            .await
            .unwrap_or_else(|_| "[]".into());
        let assignments: Vec<serde_json::Value> =
            serde_json::from_str(&assignments_txt).unwrap_or_default();
        for a in &assignments {
            let creator_id = a
                .get("creator_id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if creator_id.is_empty() {
                continue;
            }
            let talent_id = a
                .get("talent_id")
                .and_then(|v| v.as_str())
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty());
            rows.push(DistributionRow {
                payment_id: String::new(), // no payments row to update in fallback
                creator_id,
                talent_id,
                weight_cents: 1,
            });
        }
    }

    if rows.is_empty() {
        tracing::warn!(
            offer_id = %offer_id,
            agency_id = %agency_id,
            "no assigned creators found for campaign offer; skipping distribution"
        );
        return Ok(());
    }

    // Resolve any missing creator_id via talent_id -> agency_users.creator_id (legacy support).
    let mut missing_creator_by_talent: Vec<String> = vec![];
    for r in &rows {
        if r.creator_id.trim().is_empty() {
            if let Some(tid) = r.talent_id.as_deref() {
                missing_creator_by_talent.push(tid.to_string());
            }
        }
    }
    if !missing_creator_by_talent.is_empty() {
        missing_creator_by_talent.sort();
        missing_creator_by_talent.dedup();
        let tid_refs: Vec<&str> = missing_creator_by_talent
            .iter()
            .map(|s| s.as_str())
            .collect();
        let map_resp = state
            .pg
            .from("agency_users")
            .select("id,creator_id")
            .eq("agency_id", agency_id)
            .in_("id", tid_refs)
            .execute()
            .await
            .map_err(|e| e.to_string())?;
        if map_resp.status().is_success() {
            let txt = map_resp.text().await.unwrap_or_else(|_| "[]".into());
            let map_rows: Vec<serde_json::Value> = serde_json::from_str(&txt).unwrap_or_default();
            let mut creator_id_by_talent: std::collections::HashMap<String, String> =
                std::collections::HashMap::new();
            for m in map_rows {
                let tid = m.get("id").and_then(|v| v.as_str()).unwrap_or("").trim();
                let cid = m
                    .get("creator_id")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim();
                if !tid.is_empty() && !cid.is_empty() {
                    creator_id_by_talent.insert(tid.to_string(), cid.to_string());
                }
            }
            for r in &mut rows {
                if r.creator_id.trim().is_empty() {
                    if let Some(tid) = r.talent_id.as_deref() {
                        if let Some(cid) = creator_id_by_talent.get(tid) {
                            r.creator_id = cid.clone();
                        }
                    }
                }
            }
        }
    }

    // Collect unique creators; missing creator_ids are not distributable.
    let mut creator_ids: Vec<String> = rows
        .iter()
        .map(|r| r.creator_id.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();
    creator_ids.sort();
    creator_ids.dedup();
    if creator_ids.is_empty() {
        tracing::warn!(
            offer_id = %offer_id,
            "campaign offer distribution has no valid creator_id rows; skipping"
        );
        return Ok(());
    }

    // Commission overrides + tier defaults (same model as licensing flow), but keyed by creator_id.
    let creator_refs: Vec<&str> = creator_ids.iter().map(|s| s.as_str()).collect();

    let (resp_agency, resp_roster_tiers, resp_rel_tiers) = tokio::try_join!(
        async {
            state
                .pg
                .from("agencies")
                .select("performance_commission_config")
                .eq("id", agency_id)
                .limit(1)
                .execute()
                .await
                .map_err(|e| e.to_string())
        },
        async {
            state
                .pg
                .from("agency_users")
                .select("creator_id,performance_tier_name")
                .eq("agency_id", agency_id)
                .in_("creator_id", creator_refs.clone())
                .execute()
                .await
                .map_err(|e| e.to_string())
        },
        async {
            state
                .pg
                .from("agency_talent_relationships")
                .select("creator_id,performance_tier_name")
                .eq("agency_id", agency_id)
                .in_("creator_id", creator_refs.clone())
                .execute()
                .await
                .map_err(|e| e.to_string())
        }
    )?;

    let agency_rows: Vec<serde_json::Value> =
        serde_json::from_str(&resp_agency.text().await.unwrap_or_default()).unwrap_or_default();
    let commission_cfg = agency_rows
        .first()
        .and_then(|r| r.get("performance_commission_config"))
        .and_then(|v| v.as_object());

    let roster_tier_rows: Vec<serde_json::Value> =
        serde_json::from_str(&resp_roster_tiers.text().await.unwrap_or_default())
            .unwrap_or_default();
    let rel_tier_rows: Vec<serde_json::Value> =
        serde_json::from_str(&resp_rel_tiers.text().await.unwrap_or_default()).unwrap_or_default();

    let mut tier_by_creator: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    // Relationship tiers as baseline
    for row in rel_tier_rows {
        let cid = row
            .get("creator_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim();
        if cid.is_empty() {
            continue;
        }
        let tier = row
            .get("performance_tier_name")
            .and_then(|v| v.as_str())
            .unwrap_or("Inactive")
            .trim()
            .to_string();
        tier_by_creator.insert(cid.to_string(), tier);
    }
    // Roster tiers override
    for row in roster_tier_rows {
        let cid = row
            .get("creator_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim();
        if cid.is_empty() {
            continue;
        }
        let tier = row
            .get("performance_tier_name")
            .and_then(|v| v.as_str())
            .unwrap_or("Inactive")
            .trim()
            .to_string();
        tier_by_creator.insert(cid.to_string(), tier);
    }

    // Per-creator custom commission overrides for this agency.
    let mut custom_by_creator: std::collections::HashMap<String, f64> =
        std::collections::HashMap::new();
    let comm_resp = state
        .pg
        .from("agency_creator_commissions")
        .select("creator_id,commission_rate")
        .eq("agency_id", agency_id)
        .in_("creator_id", creator_refs.clone())
        .execute()
        .await
        .map_err(|e| e.to_string())?;
    if comm_resp.status().is_success() {
        let comm_text = comm_resp.text().await.unwrap_or_else(|_| "[]".into());
        let comm_rows: Vec<serde_json::Value> =
            serde_json::from_str(&comm_text).unwrap_or_default();
        for r in comm_rows {
            let cid = r
                .get("creator_id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim();
            if cid.is_empty() {
                continue;
            }
            if let Some(rate) = r.get("commission_rate").and_then(|v| v.as_f64()) {
                custom_by_creator.insert(cid.to_string(), rate.clamp(0.0, 100.0));
            }
        }
    }

    let mut contract_by_creator: std::collections::HashMap<String, f64> =
        std::collections::HashMap::new();
    let today = chrono::Utc::now().date_naive().to_string();
    let contract_resp = state
        .pg
        .from("agency_creator_marketplace_contracts")
        .select("creator_id,commission_rate")
        .eq("agency_id", agency_id)
        .eq("status", "active")
        .lte("valid_from", &today)
        .gte("valid_until", &today)
        .in_("creator_id", creator_refs.clone())
        .execute()
        .await
        .map_err(|e| e.to_string())?;
    if contract_resp.status().is_success() {
        let contract_text = contract_resp.text().await.unwrap_or_else(|_| "[]".into());
        let contract_rows: Vec<serde_json::Value> =
            serde_json::from_str(&contract_text).unwrap_or_default();
        for r in contract_rows {
            let cid = r
                .get("creator_id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim();
            if cid.is_empty() {
                continue;
            }
            if let Some(rate) = r.get("commission_rate").and_then(|v| v.as_f64()) {
                contract_by_creator.insert(cid.to_string(), rate.clamp(0.0, 100.0));
            }
        }
    }

    let mut default_rate_by_creator: std::collections::HashMap<String, f64> =
        std::collections::HashMap::new();
    for cid in &creator_ids {
        let tier_name = tier_by_creator
            .get(cid)
            .map(String::as_str)
            .unwrap_or("Inactive");
        let rate = commission_cfg
            .and_then(|cfg| cfg.get(tier_name))
            .and_then(|tier_cfg| tier_cfg.get("commission_rate"))
            .and_then(|v| v.as_f64())
            .unwrap_or(60.0); // historical fallback: 40% to talent, 60% to agency
        default_rate_by_creator.insert(cid.clone(), rate.clamp(0.0, 100.0));
    }

    // Allocate net_amount_cents across payment rows using their existing gross_cents as weights.
    let mut sum_w: i64 = rows.iter().map(|r| r.weight_cents.max(0)).sum();
    if sum_w <= 0 {
        // equal weights if missing
        sum_w = rows.len() as i64;
        for r in &mut rows {
            r.weight_cents = 1;
        }
    }

    let mut alloc_floor_by_idx: std::collections::HashMap<usize, i64> =
        std::collections::HashMap::new();
    let mut remainders: Vec<(usize, i128)> = vec![];
    let mut floor_sum: i64 = 0;

    for (idx, r) in rows.iter().enumerate() {
        let w = r.weight_cents.max(0);
        let numer: i128 = (net_amount_cents as i128) * (w as i128);
        let denom: i128 = (sum_w as i128).max(1);
        let floor_alloc: i64 = (numer / denom) as i64;
        let rem: i128 = numer - denom * (floor_alloc as i128);
        let floor_alloc = floor_alloc.max(0);
        alloc_floor_by_idx.insert(idx, floor_alloc);
        remainders.push((idx, rem));
        floor_sum += floor_alloc;
    }

    let mut leftover: i64 = (net_amount_cents - floor_sum).max(0);
    remainders.sort_by(|(a_i, a_r), (b_i, b_r)| b_r.cmp(a_r).then_with(|| a_i.cmp(b_i)));
    for (idx, _) in remainders {
        if leftover <= 0 {
            break;
        }
        if let Some(v) = alloc_floor_by_idx.get_mut(&idx) {
            *v += 1;
            leftover -= 1;
        }
    }

    let alloc_sum: i64 = alloc_floor_by_idx.values().sum();
    if alloc_sum != net_amount_cents {
        return Err("campaign_offer_allocation_invariant_violated".to_string());
    }

    let paid_at = chrono::Utc::now().to_rfc3339();

    // Resolve creator Stripe Connect account IDs + display names (best-effort; not required for balance crediting).
    let mut stripe_acct_by_creator: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    let mut creator_name_by_id: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    if !creator_ids.is_empty() {
        let cr_resp = state
            .pg
            .from("creators")
            .select("id,full_name,stripe_connect_account_id")
            .in_("id", creator_refs.clone())
            .execute()
            .await
            .map_err(|e| e.to_string())?;
        if cr_resp.status().is_success() {
            let cr_txt = cr_resp.text().await.unwrap_or_else(|_| "[]".into());
            let cr_rows: Vec<serde_json::Value> = serde_json::from_str(&cr_txt).unwrap_or_default();
            for r in cr_rows {
                let cid = r.get("id").and_then(|v| v.as_str()).unwrap_or("").trim();
                let name = r
                    .get("full_name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim();
                let acct = r
                    .get("stripe_connect_account_id")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim();
                if !cid.is_empty() && !acct.is_empty() {
                    stripe_acct_by_creator.insert(cid.to_string(), acct.to_string());
                }
                if !cid.is_empty() && !name.is_empty() {
                    creator_name_by_id.insert(cid.to_string(), name.to_string());
                }
            }
        }
    }

    let mut agency_total_cents: i64 = 0;
    let mut talent_total_cents: i64 = 0;
    let mut talent_splits_json: Vec<serde_json::Value> = vec![];

    // Update each payments row to reflect the computed per-creator distribution.
    for (idx, r) in rows.iter().enumerate() {
        let gross_share_cents = alloc_floor_by_idx.get(&idx).copied().unwrap_or(0).max(0);

        let creator_id = r.creator_id.trim().to_string();
        if creator_id.is_empty() {
            continue;
        }
        let talent_rate = contract_by_creator
            .get(&creator_id)
            .copied()
            .or_else(|| custom_by_creator.get(&creator_id).copied())
            .unwrap_or_else(|| {
                default_rate_by_creator
                    .get(&creator_id)
                    .copied()
                    .unwrap_or(0.0)
            })
            .clamp(0.0, 100.0);

        let talent_payout_rate = (100.0 - talent_rate).clamp(0.0, 100.0);
        let talent_earnings_cents =
            ((gross_share_cents as f64) * (talent_payout_rate / 100.0)).round() as i64;
        let talent_earnings_cents = talent_earnings_cents.max(0).min(gross_share_cents);
        let agency_earnings_cents = (gross_share_cents - talent_earnings_cents).max(0);

        agency_total_cents += agency_earnings_cents;
        talent_total_cents += talent_earnings_cents;

        let update_body = json!({
            "gross_cents": gross_share_cents,
            "agency_earnings_cents": agency_earnings_cents,
            "talent_earnings_cents": talent_earnings_cents,
            "commission_rate": talent_rate,
            "currency_code": currency_code,
            "paid_at": paid_at,
            "status": "succeeded",
            "creator_id": creator_id
        });
        if !r.payment_id.trim().is_empty() {
            let _ = state
                .pg
                .from("payments")
                .eq("id", &r.payment_id)
                .update(update_body.to_string())
                .execute()
                .await;
        }

        let stripe_acct = stripe_acct_by_creator
            .get(&creator_id)
            .cloned()
            .unwrap_or_default();
        let talent_name = creator_name_by_id
            .get(&creator_id)
            .cloned()
            .unwrap_or_else(|| "Talent".to_string());

        talent_splits_json.push(json!({
            "talent_id": r.talent_id.clone().unwrap_or_default(),
            "talent_name": talent_name,
            "creator_id": creator_id,
            "amount_cents": talent_earnings_cents,
            "stripe_connect_account_id": stripe_acct,
            "commission_rate": talent_rate,
            "gross_share_cents": gross_share_cents,
            "agency_commission_cents": agency_earnings_cents,
        }));
    }

    // Credit internal balances (agency + creators) via a single licensing_payouts insert.
    // Triggers (0044_fix_payout_triggers_available_cents.sql) will increment earned + available balances.
    let payout_record = json!({
        "licensing_request_id": licensing_request_id,
        "agency_id": agency_id,
        "amount_cents": agency_total_cents.max(0).min(net_amount_cents),
        "talent_earnings_cents": talent_total_cents.max(0).min(net_amount_cents),
        "talent_splits": talent_splits_json,
        "platform_fee_cents": platform_fee_cents,
        "net_amount_cents": net_amount_cents,
        "currency": currency_code,
        "paid_at": paid_at,
        "stripe_checkout_session_id": stripe_checkout_session_id,
        "stripe_payment_intent_id": payment_intent_id,
    });

    let ins_resp = state
        .pg
        .from("licensing_payouts")
        .insert(payout_record.to_string())
        .execute()
        .await
        .map_err(|e| e.to_string())?;
    if !ins_resp.status().is_success() {
        // Unique index may reject duplicates if a race occurs; treat as ok.
        let err = ins_resp.text().await.unwrap_or_default();
        tracing::warn!(
            offer_id = %offer_id,
            licensing_request_id = %licensing_request_id,
            error = %err,
            "failed to insert campaign offer licensing_payouts row"
        );
    }

    tracing::info!(
        offer_id = %offer_id,
        licensing_request_id = %licensing_request_id,
        agency_total_cents,
        talent_total_cents,
        platform_fee_cents,
        net_amount_cents,
        currency = %currency_code,
        "campaign offer distribution credited to internal balances"
    );

    Ok(())
}
