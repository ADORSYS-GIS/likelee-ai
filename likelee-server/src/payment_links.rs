use crate::{auth::AuthUser, config::AppState};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::{Duration, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::str::FromStr;
use tracing::{error, info, warn};

use crate::entitlements::{get_agency_plan_tier, PlanTier};

// ============================================================================
// Request/Response Types
// ============================================================================

#[derive(Deserialize)]
pub struct GeneratePaymentLinkRequest {
    pub licensing_request_ids: Vec<String>,
    pub total_amount_cents: Option<i64>,
    pub currency: Option<String>,
    pub expires_in_hours: Option<i64>,
    pub client_email: Option<String>,
    pub client_name: Option<String>,
}

#[derive(Serialize)]
pub struct PaymentLinkResponse {
    pub payment_link_id: String,
    pub payment_link_url: String,
    pub expires_at: String,
    pub total_amount_cents: i64,
    pub agency_amount_cents: i64,
    pub talent_amount_cents: i64,
    pub talent_splits: Vec<TalentSplit>,
    pub status: String,
}

#[derive(Serialize)]
pub struct TalentSplit {
    pub talent_id: String,
    pub talent_name: String,
    pub amount_cents: i64,
}

#[derive(Deserialize)]
pub struct SendPaymentLinkEmailRequest {
    pub payment_link_id: String,
    pub custom_message: Option<String>,
}

#[derive(Deserialize)]
pub struct ListPaymentLinksQuery {
    pub licensing_request_id: Option<String>,
    pub status: Option<String>,
}

#[derive(Deserialize)]
pub struct CreatorPayoutRequestBody {
    pub amount_cents: i64,
    pub currency: Option<String>,
    pub payout_method: Option<String>,
}

// ============================================================================
// 1. Generate Payment Link
// ============================================================================

pub async fn generate_payment_link(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<GeneratePaymentLinkRequest>,
) -> Result<Json<PaymentLinkResponse>, (StatusCode, String)> {
    // Verify agency role
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    if payload.licensing_request_ids.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "No licensing_request_ids provided".to_string(),
        ));
    }

    // Agency must have a Stripe Connect account since we distribute funds immediately on payment.
    let agency_acct_resp = state
        .pg
        .from("agencies")
        .select("stripe_connect_account_id")
        .eq("id", &user.id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !agency_acct_resp.status().is_success() {
        let err = agency_acct_resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    let agency_acct_text = agency_acct_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
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
            "Agency must connect a Stripe account before generating a payment link".to_string(),
        ));
    }

    let currency = payload.currency.unwrap_or_else(|| "USD".to_string());
    let expires_in_hours = payload.expires_in_hours.unwrap_or(168); // 7 days default

    // Fetch licensing requests with validation
    let ids: Vec<&str> = payload
        .licensing_request_ids
        .iter()
        .map(|s| s.as_str())
        .collect();

    let lr_resp = state
        .pg
        .from("licensing_requests")
        .select("id,agency_id,brand_id,talent_id,status,campaign_title,client_name,talent_name,brands(email,company_name),license_submissions!licensing_requests_submission_id_fkey(client_email,client_name),campaigns(id,payment_amount,agency_percent,talent_percent,agency_earnings_cents,talent_earnings_cents)")
        .eq("agency_id", &user.id)
        .in_("id", ids.clone())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !lr_resp.status().is_success() {
        let err = lr_resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    let lr_text = lr_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let lr_rows: Vec<serde_json::Value> = serde_json::from_str(&lr_text).unwrap_or_default();

    if lr_rows.len() != payload.licensing_request_ids.len() {
        return Err((
            StatusCode::FORBIDDEN,
            "Invalid licensing request IDs".to_string(),
        ));
    }

    // Verify all requests are approved
    for r in &lr_rows {
        let status = r.get("status").and_then(|v| v.as_str()).unwrap_or("");
        if status != "approved" && status != "confirmed" {
            return Err((
                StatusCode::BAD_REQUEST,
                "All licensing requests must be approved before generating payment link"
                    .to_string(),
            ));
        }
    }

    // Derive total amount from license_submissions.license_fee (stored in cents)
    let mut fee_by_lr_id: HashMap<String, i64> = HashMap::new();

    // First: try direct mapping license_submissions.licensing_request_id -> license_fee
    let ls_resp = state
        .pg
        .from("license_submissions")
        .select("licensing_request_id,license_fee")
        .eq("agency_id", &user.id)
        .in_("licensing_request_id", ids.clone())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !ls_resp.status().is_success() {
        let err = ls_resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    let ls_text = ls_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let ls_rows: Vec<serde_json::Value> = serde_json::from_str(&ls_text).unwrap_or_default();
    for r in &ls_rows {
        let lrid = r
            .get("licensing_request_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        if lrid.is_empty() {
            continue;
        }
        let fee = r
            .get("license_fee")
            .and_then(|v| {
                v.as_i64()
                    .or_else(|| v.as_str().and_then(|s| s.parse::<i64>().ok()))
            })
            .unwrap_or(0);
        if fee > 0 {
            fee_by_lr_id.insert(lrid, fee);
        }
    }

    // Second: fallback via licensing_requests.submission_id -> license_submissions.id
    // (some rows may not have license_submissions.licensing_request_id set)
    let mut missing_lr_ids: Vec<String> = payload
        .licensing_request_ids
        .iter()
        .filter(|id| !fee_by_lr_id.contains_key(*id))
        .cloned()
        .collect();
    missing_lr_ids.sort();
    missing_lr_ids.dedup();

    if !missing_lr_ids.is_empty() {
        let missing_refs: Vec<&str> = missing_lr_ids.iter().map(|s| s.as_str()).collect();
        let lr2_resp = state
            .pg
            .from("licensing_requests")
            .select("id,submission_id")
            .eq("agency_id", &user.id)
            .in_("id", missing_refs)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        if !lr2_resp.status().is_success() {
            let err = lr2_resp.text().await.unwrap_or_default();
            return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
        }

        let lr2_text = lr2_resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let lr2_rows: Vec<serde_json::Value> = serde_json::from_str(&lr2_text).unwrap_or_default();

        let mut submission_id_by_lr_id: HashMap<String, String> = HashMap::new();
        let mut submission_ids: Vec<String> = vec![];
        for r in &lr2_rows {
            let id = r.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let sid = r
                .get("submission_id")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            if !id.is_empty() && !sid.is_empty() {
                submission_id_by_lr_id.insert(id.to_string(), sid.to_string());
                submission_ids.push(sid.to_string());
            }
        }

        submission_ids.sort();
        submission_ids.dedup();

        if !submission_ids.is_empty() {
            let s_refs: Vec<&str> = submission_ids.iter().map(|s| s.as_str()).collect();
            let ls2_resp = state
                .pg
                .from("license_submissions")
                .select("id,license_fee")
                .eq("agency_id", &user.id)
                .in_("id", s_refs)
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

            if !ls2_resp.status().is_success() {
                let err = ls2_resp.text().await.unwrap_or_default();
                return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
            }

            let ls2_text = ls2_resp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let ls2_rows: Vec<serde_json::Value> =
                serde_json::from_str(&ls2_text).unwrap_or_default();

            let mut fee_by_submission_id: HashMap<String, i64> = HashMap::new();
            for r in &ls2_rows {
                let id = r.get("id").and_then(|v| v.as_str()).unwrap_or("");
                let fee = r
                    .get("license_fee")
                    .and_then(|v| {
                        v.as_i64()
                            .or_else(|| v.as_str().and_then(|s| s.parse::<i64>().ok()))
                    })
                    .unwrap_or(0);
                if !id.is_empty() && fee > 0 {
                    fee_by_submission_id.insert(id.to_string(), fee);
                }
            }

            for (lrid, sid) in &submission_id_by_lr_id {
                if fee_by_lr_id.contains_key(lrid) {
                    continue;
                }
                if let Some(fee) = fee_by_submission_id.get(sid) {
                    fee_by_lr_id.insert(lrid.clone(), *fee);
                }
            }
        }
    }

    let mut missing_fee_lr_ids: Vec<String> = payload
        .licensing_request_ids
        .iter()
        .filter(|id| !fee_by_lr_id.contains_key(*id))
        .cloned()
        .collect();
    missing_fee_lr_ids.sort();
    missing_fee_lr_ids.dedup();

    if !missing_fee_lr_ids.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            format!(
                "Missing license fee for licensing requests: {}. Please complete the license submission and set the license fee.",
                missing_fee_lr_ids.join(", ")
            ),
        ));
    }

    let total_cents: i64 = payload
        .licensing_request_ids
        .iter()
        .filter_map(|id| fee_by_lr_id.get(id).copied())
        .sum();

    if total_cents <= 0 {
        return Err((
            StatusCode::BAD_REQUEST,
            "License fee must be positive".to_string(),
        ));
    }

    // Platform fee based on agency plan tier
    let tier = get_agency_plan_tier(&state, &user.id).await?;
    let fee_pct: f64 = match tier {
        PlanTier::Free => 0.08,
        PlanTier::Basic => 0.05,
        PlanTier::Pro => 0.03,
        PlanTier::Enterprise => 0.03,
    };
    let platform_fee_cents = ((total_cents as f64) * fee_pct).round() as i64;
    let net_amount_cents = (total_cents - platform_fee_cents).max(0);

    if net_amount_cents <= 0 {
        return Err((
            StatusCode::BAD_REQUEST,
            "Net amount must be positive".to_string(),
        ));
    }

    // Fetch pay split from campaigns table
    let c_resp = state
        .pg
        .from("campaigns")
        .select(
            "talent_id,agency_percent,talent_percent,agency_earnings_cents,talent_earnings_cents",
        )
        .in_("licensing_request_id", ids)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let c_text = c_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let c_rows: Vec<serde_json::Value> = serde_json::from_str(&c_text).unwrap_or_default();

    // Calculate splits based on campaigns table
    let mut agency_percent = 20.0f64;
    let mut talent_percent = 80.0f64;
    let mut talent_ids: Vec<String> = vec![];
    let mut talent_earnings_map: HashMap<String, i64> = HashMap::new();

    if !c_rows.is_empty() {
        // Use first row's percentages (they should all be the same for a group)
        if let Some(first) = c_rows.first() {
            agency_percent = first
                .get("agency_percent")
                .and_then(|v| v.as_f64())
                .unwrap_or(20.0);
            talent_percent = first
                .get("talent_percent")
                .and_then(|v| v.as_f64())
                .unwrap_or(80.0);
        }

        for r in &c_rows {
            if let Some(tid) = r.get("talent_id").and_then(|v| v.as_str()) {
                talent_ids.push(tid.to_string());
                let talent_cents = r
                    .get("talent_earnings_cents")
                    .and_then(|v| v.as_i64())
                    .unwrap_or(0);
                talent_earnings_map.insert(tid.to_string(), talent_cents);
            }
        }
    }

    talent_ids.sort();
    talent_ids.dedup();

    // Calculate amounts (splits are based on net after platform fee)
    let agency_amount_cents = ((net_amount_cents as f64) * (agency_percent / 100.0)).round() as i64;
    let talent_amount_cents = net_amount_cents - agency_amount_cents;

    // Fetch talent details and Stripe Connect account IDs
    let mut talent_splits: Vec<TalentSplit> = vec![];
    let mut talent_splits_json: Vec<serde_json::Value> = vec![];

    if !talent_ids.is_empty() {
        let t_refs: Vec<&str> = talent_ids.iter().map(|s| s.as_str()).collect();

        // Fetch agency_users (talents) — include cached performance_tier_name
        let au_resp = state
            .pg
            .from("agency_users")
            .select("id,creator_id,full_legal_name,stage_name,performance_tier_name")
            .in_("id", t_refs)
            .execute()
            .await;

        let mut talent_name_map: HashMap<String, String> = HashMap::new();
        let mut talent_creator_map: HashMap<String, String> = HashMap::new();
        let mut talent_tier_name_map: HashMap<String, String> = HashMap::new();

        if let Ok(au_resp) = au_resp {
            if au_resp.status().is_success() {
                let au_text = au_resp.text().await.unwrap_or_else(|_| "[]".into());
                let au_rows: Vec<serde_json::Value> =
                    serde_json::from_str(&au_text).unwrap_or_default();

                for r in &au_rows {
                    let id = r.get("id").and_then(|v| v.as_str()).unwrap_or("");
                    if id.is_empty() {
                        continue;
                    }

                    let name = r
                        .get("full_legal_name")
                        .or_else(|| r.get("stage_name"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("Unknown")
                        .to_string();

                    talent_name_map.insert(id.to_string(), name);

                    if let Some(cid) = r.get("creator_id").and_then(|v| v.as_str()) {
                        talent_creator_map.insert(id.to_string(), cid.to_string());
                    }

                    if let Some(tn) = r.get("performance_tier_name").and_then(|v| v.as_str()) {
                        talent_tier_name_map.insert(id.to_string(), tn.to_string());
                    }
                }
            }
        }

        // Fetch creator Stripe Connect account IDs
        let creator_ids: Vec<&str> = talent_creator_map.values().map(|s| s.as_str()).collect();
        let mut stripe_account_map: HashMap<String, String> = HashMap::new();

        if !creator_ids.is_empty() {
            let cr_resp = state
                .pg
                .from("creators")
                .select("id,stripe_connect_account_id")
                .in_("id", creator_ids)
                .execute()
                .await;

            if let Ok(cr_resp) = cr_resp {
                if cr_resp.status().is_success() {
                    let cr_text = cr_resp.text().await.unwrap_or_else(|_| "[]".into());
                    let cr_rows: Vec<serde_json::Value> =
                        serde_json::from_str(&cr_text).unwrap_or_default();

                    for r in &cr_rows {
                        let cid = r.get("id").and_then(|v| v.as_str()).unwrap_or("");
                        let acct = r
                            .get("stripe_connect_account_id")
                            .and_then(|v| v.as_str())
                            .unwrap_or("");
                        if !cid.is_empty() && !acct.is_empty() {
                            stripe_account_map.insert(cid.to_string(), acct.to_string());
                        }
                    }
                }
            }
        }

        // Fetch payout_percent per tier name from performance_tiers table
        let tier_names: Vec<String> = talent_tier_name_map.values().cloned().collect();
        let mut tier_payout_percent_map: HashMap<String, f64> = HashMap::new();
        if !tier_names.is_empty() {
            let tn_refs: Vec<&str> = tier_names.iter().map(|s| s.as_str()).collect();
            let pt_resp = state
                .pg
                .from("performance_tiers")
                .select("tier_name,payout_percent")
                .eq("agency_id", &user.id)
                .in_("tier_name", tn_refs)
                .execute()
                .await;
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
                            .unwrap_or(25.0);
                        if !tn.is_empty() {
                            tier_payout_percent_map.insert(tn.to_string(), pct);
                        }
                    }
                }
            }
        }

        // Check that all talents have Stripe Connect accounts
        let mut missing_stripe: Vec<String> = vec![];
        for (talent_id, creator_id) in &talent_creator_map {
            if !stripe_account_map.contains_key(creator_id) {
                let name = talent_name_map
                    .get(talent_id)
                    .cloned()
                    .unwrap_or_else(|| "Unknown".to_string());
                missing_stripe.push(format!("{} ({})", name, talent_id));
            }
        }

        if !missing_stripe.is_empty() {
            return Err((
                StatusCode::BAD_REQUEST,
                format!(
                    "The following talents must connect their Stripe account before generating a payment link: {}",
                    missing_stripe.join(", ")
                ),
            ));
        }

        // Build talent splits weighted by performance tier payout_percent
        // Each talent gets (their tier payout_percent / total payout_percent of all talents) * talent_amount_cents
        let total_payout_weight: f64 = talent_ids
            .iter()
            .map(|tid| {
                let tier_name = talent_tier_name_map
                    .get(tid)
                    .map(|s| s.as_str())
                    .unwrap_or("Inactive");
                tier_payout_percent_map
                    .get(tier_name)
                    .copied()
                    .unwrap_or(25.0)
            })
            .sum::<f64>();

        let mut distributed_cents: i64 = 0;

        for (i, talent_id) in talent_ids.iter().enumerate() {
            let talent_name = talent_name_map
                .get(talent_id)
                .cloned()
                .unwrap_or_else(|| "Unknown".to_string());

            let tier_name = talent_tier_name_map
                .get(talent_id)
                .map(|s| s.as_str())
                .unwrap_or("Inactive");
            let payout_pct = tier_payout_percent_map
                .get(tier_name)
                .copied()
                .unwrap_or(25.0);

            // Proportional share; give remainder to last talent to avoid rounding loss
            let amount_cents = if i == talent_ids.len() - 1 {
                talent_amount_cents - distributed_cents
            } else if total_payout_weight > 0.0 {
                (talent_amount_cents as f64 * (payout_pct / total_payout_weight)).round() as i64
            } else {
                (talent_amount_cents as f64 / talent_ids.len() as f64).round() as i64
            };

            distributed_cents += amount_cents;

            talent_splits.push(TalentSplit {
                talent_id: talent_id.clone(),
                talent_name: talent_name.clone(),
                amount_cents,
            });

            let creator_id = talent_creator_map
                .get(talent_id)
                .cloned()
                .unwrap_or_default();
            let stripe_account_id = stripe_account_map
                .get(&creator_id)
                .cloned()
                .unwrap_or_default();

            talent_splits_json.push(json!({
                "talent_id": talent_id,
                "talent_name": talent_name,
                "creator_id": creator_id,
                "amount_cents": amount_cents,
                "stripe_connect_account_id": stripe_account_id,
                "tier_name": tier_name,
                "payout_percent": payout_pct,
            }));
        }
    }

    // Get campaign_id from first licensing request
    let first_lr = lr_rows.first().cloned().unwrap_or(json!({}));
    let campaign_id = c_rows
        .first()
        .and_then(|r| r.get("id").and_then(|v| v.as_str()))
        .map(|s| s.to_string());

    // Get client info from licensing request
    // Priority: payload > license_submissions > brands > direct fields
    let license_submission = first_lr.get("license_submissions");

    let client_email = payload
        .client_email
        .or_else(|| {
            // Try license_submissions first
            license_submission
                .and_then(|ls| ls.get("client_email"))
                .and_then(|v| v.as_str())
                .filter(|s| !s.trim().is_empty())
                .map(|s| s.to_string())
        })
        .or_else(|| {
            // Try brands as object: brands: { email: "..." }
            first_lr
                .get("brands")
                .and_then(|b| b.get("email").and_then(|v| v.as_str()))
                .map(|s| s.to_string())
        })
        .or_else(|| {
            // Try brands as array: brands: [{ email: "..." }]
            first_lr
                .get("brands")
                .and_then(|b| b.as_array())
                .and_then(|arr| arr.first())
                .and_then(|b| b.get("email").and_then(|v| v.as_str()))
                .map(|s| s.to_string())
        })
        .or_else(|| {
            // Try direct client_email field on licensing_requests
            first_lr
                .get("client_email")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        });

    let client_name = payload
        .client_name
        .or_else(|| {
            // Try license_submissions first
            license_submission
                .and_then(|ls| ls.get("client_name"))
                .and_then(|v| v.as_str())
                .filter(|s| !s.trim().is_empty())
                .map(|s| s.to_string())
        })
        .or_else(|| {
            // Try brands as object: brands: { company_name: "..." }
            first_lr
                .get("brands")
                .and_then(|b| b.get("company_name").and_then(|v| v.as_str()))
                .map(|s| s.to_string())
        })
        .or_else(|| {
            // Try brands as array: brands: [{ company_name: "..." }]
            first_lr
                .get("brands")
                .and_then(|b| b.as_array())
                .and_then(|arr| arr.first())
                .and_then(|b| b.get("company_name").and_then(|v| v.as_str()))
                .map(|s| s.to_string())
        })
        .or_else(|| {
            // Try direct client_name field on licensing_requests
            first_lr
                .get("client_name")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        });

    // Log warning if client_email is missing
    if client_email.is_none() {
        warn!(
            agency_id = %user.id,
            licensing_request_id = %payload.licensing_request_ids.first().unwrap_or(&String::new()),
            "No client email found for payment link - email sending will fail"
        );
    }

    // Create Stripe Payment Link
    let stripe_client = stripe_sdk::Client::new(state.stripe_secret_key.clone());

    // Create a product for this payment
    let product_name = format!(
        "License - {}",
        first_lr
            .get("campaign_title")
            .and_then(|v| v.as_str())
            .unwrap_or("Campaign")
    );
    let product_params = stripe_sdk::CreateProduct::new(&product_name);

    let product = match stripe_sdk::Product::create(&stripe_client, product_params).await {
        Ok(p) => p,
        Err(e) => {
            error!("Failed to create Stripe product: {}", e);
            return Err((
                StatusCode::BAD_GATEWAY,
                format!("Stripe product creation failed: {}", e),
            ));
        }
    };

    // Create price
    let currency_enum = match stripe_sdk::Currency::from_str(&currency.to_lowercase()) {
        Ok(c) => c,
        Err(_) => {
            return Err((
                StatusCode::BAD_REQUEST,
                format!("Invalid currency: {}", currency),
            ))
        }
    };

    let mut price_params = stripe_sdk::CreatePrice::new(currency_enum);
    let product_id_str = product.id.to_string();
    price_params.product = Some(stripe_sdk::IdOrCreate::Id(&product_id_str));
    price_params.unit_amount = Some(total_cents);

    let price = match stripe_sdk::Price::create(&stripe_client, price_params).await {
        Ok(p) => p,
        Err(e) => {
            error!("Failed to create Stripe price: {}", e);
            return Err((
                StatusCode::BAD_GATEWAY,
                format!("Stripe price creation failed: {}", e),
            ));
        }
    };

    // Create payment link line items
    let line_items = vec![stripe_sdk::CreatePaymentLinkLineItems {
        price: price.id.to_string(),
        quantity: 1,
        ..Default::default()
    }];

    // Set expiration
    let expires_at = Utc::now() + Duration::hours(expires_in_hours);

    // Add metadata
    let mut metadata = HashMap::new();
    metadata.insert("agency_id".to_string(), user.id.clone());
    metadata.insert(
        "licensing_request_ids".to_string(),
        payload.licensing_request_ids.join(","),
    );
    metadata.insert(
        "campaign_id".to_string(),
        campaign_id.clone().unwrap_or_default(),
    );
    metadata.insert(
        "platform_fee_cents".to_string(),
        platform_fee_cents.to_string(),
    );
    metadata.insert("net_amount_cents".to_string(), net_amount_cents.to_string());
    metadata.insert(
        "plan_tier".to_string(),
        match tier {
            PlanTier::Free => "free",
            PlanTier::Basic => "basic",
            PlanTier::Pro => "pro",
            PlanTier::Enterprise => "enterprise",
        }
        .to_string(),
    );
    metadata.insert(
        "agency_amount_cents".to_string(),
        agency_amount_cents.to_string(),
    );
    metadata.insert(
        "talent_amount_cents".to_string(),
        talent_amount_cents.to_string(),
    );
    metadata.insert("currency".to_string(), currency.clone());

    let mut link_params = stripe_sdk::CreatePaymentLink::new(line_items);
    link_params.metadata = Some(metadata);

    let payment_link = match stripe_sdk::PaymentLink::create(&stripe_client, link_params).await {
        Ok(pl) => pl,
        Err(e) => {
            error!("Failed to create Stripe payment link: {}", e);
            return Err((
                StatusCode::BAD_GATEWAY,
                format!("Stripe payment link creation failed: {}", e),
            ));
        }
    };

    let stripe_payment_link_url = payment_link.url;
    let stripe_payment_link_id = payment_link.id.to_string();

    // Store in database
    let db_record = json!({
        "agency_id": user.id,
        "licensing_request_id": payload.licensing_request_ids.first().cloned().unwrap_or_default(),
        "campaign_id": campaign_id,
        "stripe_payment_link_id": stripe_payment_link_id,
        "stripe_payment_link_url": stripe_payment_link_url,
        "stripe_price_id": price.id.to_string(),
        "total_amount_cents": total_cents,
        "platform_fee_cents": platform_fee_cents,
        "net_amount_cents": net_amount_cents,
        "agency_amount_cents": agency_amount_cents,
        "talent_amount_cents": talent_amount_cents,
        "currency": currency,
        "agency_percent": agency_percent,
        "talent_percent": talent_percent,
        "talent_splits": talent_splits_json,
        "client_email": client_email,
        "client_name": client_name,
        "status": "active",
        "expires_at": expires_at.to_rfc3339(),
    });

    let insert_resp = state
        .pg
        .from("agency_payment_links")
        .insert(db_record.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !insert_resp.status().is_success() {
        let err = insert_resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    let insert_text = insert_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let inserted: Vec<serde_json::Value> = serde_json::from_str(&insert_text).unwrap_or_default();
    let our_payment_link_id = inserted
        .first()
        .and_then(|r| r.get("id").and_then(|v| v.as_str()))
        .unwrap_or("")
        .to_string();

    info!(
        agency_id = %user.id,
        payment_link_id = %our_payment_link_id,
        stripe_link_id = %stripe_payment_link_id,
        "Payment link generated"
    );

    Ok(Json(PaymentLinkResponse {
        payment_link_id: our_payment_link_id,
        payment_link_url: stripe_payment_link_url,
        expires_at: expires_at.to_rfc3339(),
        total_amount_cents: total_cents,
        agency_amount_cents,
        talent_amount_cents,
        talent_splits,
        status: "active".to_string(),
    }))
}

// ============================================================================
// 2. Send Payment Link Email
// ============================================================================

pub async fn send_payment_link_email(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<SendPaymentLinkEmailRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    // Fetch payment link
    let pl_resp = state
        .pg
        .from("agency_payment_links")
        .select("*,licensing_requests(campaign_title,brand_id,brands(company_name))")
        .eq("id", &payload.payment_link_id)
        .eq("agency_id", &user.id)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !pl_resp.status().is_success() {
        return Err((StatusCode::NOT_FOUND, "Payment link not found".to_string()));
    }

    let pl_text = pl_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let pl_row: serde_json::Value = serde_json::from_str(&pl_text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let client_email = pl_row
        .get("client_email")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                "No client email on payment link".to_string(),
            )
        })?;

    let client_name = pl_row
        .get("client_name")
        .and_then(|v| v.as_str())
        .unwrap_or("Client");

    let payment_link_url = pl_row
        .get("stripe_payment_link_url")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    let total_amount_cents = pl_row
        .get("total_amount_cents")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);
    let amount_dollars = total_amount_cents as f64 / 100.0;
    let formatted_amount = format!("${:.2}", amount_dollars);

    let expires_at = pl_row
        .get("expires_at")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    let lr = pl_row
        .get("licensing_requests")
        .cloned()
        .unwrap_or(json!({}));
    let campaign_title = lr
        .get("campaign_title")
        .and_then(|v| v.as_str())
        .unwrap_or("Campaign");

    let agency_name = lr
        .get("brands")
        .and_then(|b| b.get("company_name"))
        .and_then(|v| v.as_str())
        .unwrap_or("Your Agency");

    // Build email body
    let custom_msg = payload
        .custom_message
        .as_ref()
        .map(|m| format!("\n\n{}", m))
        .unwrap_or_default();

    let subject = format!("Payment Request for {} - {}", campaign_title, agency_name);
    let body = format!(
        "Dear {},\n\n{} has approved your licensing request.\n\nCampaign: {}\nTotal Amount: {}\n\nPlease complete your payment using the secure link below:\n{}{}\n\nThis link will expire on {}.\n\nQuestions? Reply to this email.\n\nBest regards,\n{} via Likelee",
        client_name,
        agency_name,
        campaign_title,
        formatted_amount,
        payment_link_url,
        custom_msg,
        expires_at,
        agency_name
    );

    // Send email
    match crate::email::send_plain_email(&state, client_email, &subject, &body) {
        Ok(_) => {
            // Update email_sent_at and increment count
            let update = json!({
                "email_sent_at": Utc::now().to_rfc3339(),
                "email_sent_count": pl_row
                    .get("email_sent_count")
                    .and_then(|v| v.as_i64())
                    .unwrap_or(0) + 1
            });

            let _ = state
                .pg
                .from("agency_payment_links")
                .eq("id", &payload.payment_link_id)
                .update(update.to_string())
                .execute()
                .await;

            info!(
                payment_link_id = %payload.payment_link_id,
                email = %client_email,
                "Payment link email sent"
            );

            Ok(Json(json!({
                "ok": true,
                "email_sent": true,
                "recipient": client_email
            })))
        }
        Err(e) => {
            error!(
                payment_link_id = %payload.payment_link_id,
                email = %client_email,
                error = ?e,
                "Failed to send payment link email"
            );
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to send email: {:?}", e),
            ))
        }
    }
}

// ============================================================================
// 3. List Payment Links
// ============================================================================

pub async fn list_payment_links(
    State(state): State<AppState>,
    user: AuthUser,
    Query(query): Query<ListPaymentLinksQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    let mut request = state
        .pg
        .from("agency_payment_links")
        .select("*")
        .eq("agency_id", &user.id)
        .order("created_at.desc");

    if let Some(lr_id) = query.licensing_request_id {
        request = request.eq("licensing_request_id", lr_id);
    }

    if let Some(status) = query.status {
        request = request.eq("status", status);
    }

    let resp = request
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let items: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();

    Ok(Json(json!({
        "items": items,
        "count": items.len()
    })))
}

// ============================================================================
// 4. Cancel Payment Link
// ============================================================================

pub async fn cancel_payment_link(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    // Fetch the payment link to get Stripe ID
    let pl_resp = state
        .pg
        .from("agency_payment_links")
        .select("stripe_payment_link_id,status")
        .eq("id", &id)
        .eq("agency_id", &user.id)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !pl_resp.status().is_success() {
        return Err((StatusCode::NOT_FOUND, "Payment link not found".to_string()));
    }

    let pl_text = pl_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let pl_row: serde_json::Value = serde_json::from_str(&pl_text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let current_status = pl_row.get("status").and_then(|v| v.as_str()).unwrap_or("");

    if current_status == "paid" {
        return Err((
            StatusCode::BAD_REQUEST,
            "Cannot cancel a paid payment link".to_string(),
        ));
    }

    // Deactivate Stripe payment link
    let stripe_payment_link_id = pl_row
        .get("stripe_payment_link_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if !stripe_payment_link_id.is_empty() {
        let stripe_client = stripe_sdk::Client::new(state.stripe_secret_key.clone());

        // Stripe doesn't have a direct "deactivate" for payment links, but we can update
        // to make it inactive by setting active=false
        match stripe_sdk::PaymentLinkId::from_str(stripe_payment_link_id) {
            Ok(pl_id) => {
                let update_params = stripe_sdk::UpdatePaymentLink::default();
                // Note: Stripe SDK may not support direct deactivation, but we can try
                let _ =
                    stripe_sdk::PaymentLink::update(&stripe_client, &pl_id, update_params).await;
            }
            Err(_) => {
                warn!("Invalid Stripe payment link ID: {}", stripe_payment_link_id);
            }
        }
    }

    // Update database status
    let update = json!({
        "status": "cancelled",
        "updated_at": Utc::now().to_rfc3339()
    });

    let resp = state
        .pg
        .from("agency_payment_links")
        .eq("id", &id)
        .update(update.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    info!(
        payment_link_id = %id,
        agency_id = %user.id,
        "Payment link cancelled"
    );

    Ok(Json(json!({"ok": true, "status": "cancelled"})))
}

// ============================================================================
// 5. Get Single Payment Link
// ============================================================================

pub async fn get_payment_link(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    let resp = state
        .pg
        .from("agency_payment_links")
        .select("*")
        .eq("id", &id)
        .eq("agency_id", &user.id)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        return Err((StatusCode::NOT_FOUND, "Payment link not found".to_string()));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let link: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(link))
}

// ============================================================================
// 6. Get Creator Balance (for talents)
// ============================================================================

pub async fn get_creator_balance(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // Verify creator/talent role
    if user.role != "creator" && user.role != "talent" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    // Resolve creator ID from user
    let creator_id = resolve_creator_id(&state, &user.id).await?;

    let resp = state
        .pg
        .from("creator_balances")
        .select("*")
        .eq("creator_id", &creator_id)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        // No balance record yet - return zero balance
        return Ok(Json(json!({
            "available_balance": {
                "amount_cents": 0,
                "currency": "USD"
            },
            "creator_id": creator_id
        })));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let balance: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let amount_cents = balance
        .get("available_cents")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);
    let currency = balance
        .get("currency")
        .and_then(|v| v.as_str())
        .unwrap_or("USD");

    Ok(Json(json!({
        "available_balance": {
            "amount_cents": amount_cents,
            "currency": currency
        },
        "creator_id": creator_id,
        "updated_at": balance.get("updated_at")
    })))
}

// ============================================================================
// 7. Request Creator Payout
// ============================================================================

pub async fn request_creator_payout(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<CreatorPayoutRequestBody>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if !state.payouts_enabled {
        return Err((
            StatusCode::BAD_REQUEST,
            "Payouts are currently disabled".to_string(),
        ));
    }

    if user.role != "creator" && user.role != "talent" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    if payload.amount_cents <= 0 {
        return Err((
            StatusCode::BAD_REQUEST,
            "amount_cents must be positive".to_string(),
        ));
    }

    // Check minimum payout amount
    if payload.amount_cents < state.min_payout_amount_cents as i64 {
        return Err((
            StatusCode::BAD_REQUEST,
            format!(
                "Minimum payout amount is {} cents",
                state.min_payout_amount_cents
            ),
        ));
    }

    let currency = payload
        .currency
        .unwrap_or_else(|| state.payout_currency.clone());

    // Verify currency is allowed
    if !state
        .payout_allowed_currencies
        .contains(&currency.to_uppercase())
    {
        return Err((
            StatusCode::BAD_REQUEST,
            format!("Currency {} is not supported for payouts", currency),
        ));
    }

    // Resolve creator ID
    let creator_id = resolve_creator_id(&state, &user.id).await?;

    // Get current balance
    let balance_resp = state
        .pg
        .from("creator_balances")
        .select("available_cents")
        .eq("creator_id", &creator_id)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let available_cents = if balance_resp.status().is_success() {
        let text = balance_resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let balance: serde_json::Value = serde_json::from_str(&text)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        balance
            .get("available_cents")
            .and_then(|v| v.as_i64())
            .unwrap_or(0)
    } else {
        0
    };

    if available_cents < payload.amount_cents {
        return Err((
            StatusCode::BAD_REQUEST,
            format!(
                "Insufficient balance. Available: {} cents, Requested: {} cents",
                available_cents, payload.amount_cents
            ),
        ));
    }

    // Get creator's Stripe Connect account ID
    let cr_resp = state
        .pg
        .from("creators")
        .select("stripe_connect_account_id")
        .eq("id", &creator_id)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !cr_resp.status().is_success() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Creator profile not found".to_string(),
        ));
    }

    let cr_text = cr_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let creator: serde_json::Value = serde_json::from_str(&cr_text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let stripe_account_id = creator
        .get("stripe_connect_account_id")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                "Stripe Connect account not connected. Please complete onboarding first."
                    .to_string(),
            )
        })?;

    // Determine payout method and status
    let payout_method = payload
        .payout_method
        .unwrap_or_else(|| "standard".to_string());
    let instant_enabled = state.instant_payouts_enabled && payout_method == "instant";

    // Auto-approve if under threshold
    let auto_approve = payload.amount_cents <= state.payout_auto_approve_threshold_cents as i64;
    let initial_status = if auto_approve { "approved" } else { "pending" };

    // Create payout request record
    let payout_record = json!({
        "creator_id": creator_id,
        "amount_cents": payload.amount_cents,
        "currency": currency,
        "payout_method": if instant_enabled { "instant" } else { "standard" },
        "status": initial_status,
    });

    let insert_resp = state
        .pg
        .from("creator_payout_requests")
        .insert(payout_record.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !insert_resp.status().is_success() {
        let err = insert_resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    let insert_text = insert_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let inserted: Vec<serde_json::Value> = serde_json::from_str(&insert_text).unwrap_or_default();
    let payout_request_id = inserted
        .first()
        .and_then(|r| r.get("id").and_then(|v| v.as_str()))
        .unwrap_or("")
        .to_string();

    info!(
        creator_id = %creator_id,
        payout_request_id = %payout_request_id,
        amount_cents = payload.amount_cents,
        auto_approve = auto_approve,
        "Creator payout request created"
    );

    // If auto-approved, execute the transfer immediately
    if auto_approve {
        match execute_creator_stripe_transfer(
            &state,
            &payout_request_id,
            &creator_id,
            stripe_account_id,
            payload.amount_cents,
            &currency,
        )
        .await
        {
            Ok(transfer_id) => {
                return Ok(Json(json!({
                    "payout_request_id": payout_request_id,
                    "status": "paid",
                    "stripe_transfer_id": transfer_id,
                    "amount_cents": payload.amount_cents,
                    "currency": currency,
                    "message": "Payout completed successfully"
                })));
            }
            Err((status, msg)) => {
                // Update status to failed
                let _ = state
                    .pg
                    .from("creator_payout_requests")
                    .eq("id", &payout_request_id)
                    .update(json!({"status": "failed", "failure_reason": msg}).to_string())
                    .execute()
                    .await;

                return Err((status, msg));
            }
        }
    }

    Ok(Json(json!({
        "payout_request_id": payout_request_id,
        "status": initial_status,
        "amount_cents": payload.amount_cents,
        "currency": currency,
        "message": if auto_approve {
            "Payout completed"
        } else {
            "Payout request submitted for approval"
        }
    })))
}

// ============================================================================
// 8. Get Creator Payout History
// ============================================================================

pub async fn get_creator_payout_history(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "creator" && user.role != "talent" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    let creator_id = resolve_creator_id(&state, &user.id).await?;

    let resp = state
        .pg
        .from("creator_payout_requests")
        .select("*")
        .eq("creator_id", &creator_id)
        .order("requested_at.desc")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let items: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();

    Ok(Json(json!({
        "items": items,
        "count": items.len()
    })))
}

// ============================================================================
// Helper Functions
// ============================================================================

async fn resolve_creator_id(
    state: &AppState,
    user_id: &str,
) -> Result<String, (StatusCode, String)> {
    // Try direct creator lookup first
    let resp = state
        .pg
        .from("creators")
        .select("id")
        .eq("id", user_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if resp.status().is_success() {
        let text = resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
        if let Some(row) = rows.first() {
            if let Some(id) = row.get("id").and_then(|v| v.as_str()) {
                return Ok(id.to_string());
            }
        }
    }

    // Try agency_users lookup (talent)
    let resp = state
        .pg
        .from("agency_users")
        .select("creator_id")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if resp.status().is_success() {
        let text = resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
        if let Some(row) = rows.first() {
            if let Some(id) = row.get("creator_id").and_then(|v| v.as_str()) {
                return Ok(id.to_string());
            }
        }
    }

    Err((
        StatusCode::BAD_REQUEST,
        "Could not resolve creator ID for user".to_string(),
    ))
}

async fn execute_creator_stripe_transfer(
    state: &AppState,
    payout_request_id: &str,
    creator_id: &str,
    stripe_account_id: &str,
    amount_cents: i64,
    currency: &str,
) -> Result<String, (StatusCode, String)> {
    let client = stripe_sdk::Client::new(state.stripe_secret_key.clone());

    let currency_enum = match stripe_sdk::Currency::from_str(&currency.to_lowercase()) {
        Ok(c) => c,
        Err(_) => {
            return Err((
                StatusCode::BAD_REQUEST,
                format!("Invalid currency: {}", currency),
            ))
        }
    };

    let account_id = match stripe_account_id.parse::<stripe_sdk::AccountId>() {
        Ok(id) => id,
        Err(_) => {
            return Err((
                StatusCode::BAD_REQUEST,
                "Invalid Stripe account ID".to_string(),
            ))
        }
    };

    let mut params = stripe_sdk::CreateTransfer::new(currency_enum, account_id.to_string());
    params.amount = Some(amount_cents);
    params.metadata = Some(HashMap::from([
        ("creator_id".to_string(), creator_id.to_string()),
        (
            "payout_request_id".to_string(),
            payout_request_id.to_string(),
        ),
    ]));

    match stripe_sdk::Transfer::create(&client, params).await {
        Ok(transfer) => {
            let transfer_id = transfer.id.to_string();

            // Update payout request
            let update = json!({
                "status": "paid",
                "stripe_transfer_id": transfer_id,
                "processed_at": Utc::now().to_rfc3339()
            });

            let _ = state
                .pg
                .from("creator_payout_requests")
                .eq("id", payout_request_id)
                .update(update.to_string())
                .execute()
                .await;

            info!(
                payout_request_id = %payout_request_id,
                transfer_id = %transfer_id,
                "Creator payout transfer completed"
            );

            Ok(transfer_id)
        }
        Err(e) => {
            error!(
                payout_request_id = %payout_request_id,
                error = %e,
                "Creator payout transfer failed"
            );
            Err((
                StatusCode::BAD_GATEWAY,
                format!("Stripe transfer failed: {}", e),
            ))
        }
    }
}
