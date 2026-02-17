use crate::config::AppState;
use chrono::{Duration, Utc};
use serde_json::json;
use serde_json::Value;
use std::time::Duration as StdDuration;
use tracing::{info, warn};

/// Starts the background loop for payment reminders.
/// This should be called once at server startup.
pub async fn start_payment_reminders(state: AppState) {
    info!("Starting background job: payment reminders");
    loop {
        // Run every 24 hours
        // In a real environment, we might want to run this at a specific hour
        tokio::time::sleep(StdDuration::from_secs(24 * 3600)).await;

        if let Err(e) = run_reminders(&state).await {
            warn!(error = %e, "Payment reminder job iteration failed");
        }
    }
}

pub async fn start_agency_payout_scheduler(state: AppState) {
    info!("Starting background job: agency payout scheduler");
    loop {
        tokio::time::sleep(StdDuration::from_secs(
            state.agency_payout_scheduler_interval_secs,
        ))
        .await;

        if !state.agency_payout_scheduler_enabled {
            continue;
        }

        if !state.payouts_enabled || state.stripe_secret_key.trim().is_empty() {
            continue;
        }

        if let Err(e) = run_agency_payout_scheduler(&state).await {
            warn!(error = %e, "Agency payout scheduler iteration failed");
        }
    }
}

async fn run_agency_payout_scheduler(state: &AppState) -> Result<(), String> {
    // Fetch settings for all agencies (1 row per agency)
    let resp = state
        .pg
        .from("agency_payout_settings")
        .select("agency_id,payout_frequency,min_payout_threshold_cents,last_payout_at")
        .limit(2000)
        .execute()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err(format!("Supabase query failed: {err}"));
    }

    let text = resp.text().await.unwrap_or_default();
    let rows: Vec<Value> = serde_json::from_str(&text).unwrap_or_default();
    if rows.is_empty() {
        return Ok(());
    }

    for r in rows {
        let agency_id = match r.get("agency_id").and_then(|v| v.as_str()) {
            Some(v) if !v.trim().is_empty() => v.to_string(),
            _ => continue,
        };

        let payout_frequency = r
            .get("payout_frequency")
            .and_then(|v| v.as_str())
            .unwrap_or("Monthly")
            .to_string();

        let threshold = r
            .get("min_payout_threshold_cents")
            .and_then(|v| v.as_i64())
            .unwrap_or(5000);

        let last_payout_at = r.get("last_payout_at").and_then(|v| v.as_str());

        let next_due_at = compute_next_due_at(&payout_frequency, last_payout_at);
        if Utc::now() < next_due_at {
            continue;
        }

        let available_to_pay_cents = compute_agency_available_to_pay_cents(state, &agency_id).await;
        if available_to_pay_cents <= threshold {
            continue;
        }

        let create = json!({
            "agency_id": agency_id,
            "amount_cents": available_to_pay_cents,
            "currency": "USD",
            "payout_method": "standard",
            "status": "pending"
        });

        let ins = state
            .pg
            .from("agency_payout_requests")
            .insert(create.to_string())
            .select("id")
            .single()
            .execute()
            .await
            .map_err(|e| e.to_string())?;

        let ins_status = ins.status();
        let ins_text = ins.text().await.unwrap_or_default();
        if !ins_status.is_success() {
            return Err(format!("agency_payout_requests insert failed: {ins_text}"));
        }

        let created: Value = serde_json::from_str(&ins_text).unwrap_or(json!({}));
        let req_id = created
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        if req_id.trim().is_empty() {
            return Err("agency_payout_requests insert missing id".to_string());
        }

        // Link payments to this payout request before executing, so future availability
        // calculations are based on payments that have not been assigned to a payout.
        let _ = link_payments_to_agency_payout_request(state, &agency_id, &req_id).await;

        match crate::payouts::execute_agency_payout(state, &req_id, &agency_id, available_to_pay_cents, "USD")
            .await
        {
            Ok(_) => {
                let _ = state
                    .pg
                    .from("agency_payout_settings")
                    .eq("agency_id", &agency_id)
                    .update(json!({"last_payout_at": Utc::now().to_rfc3339()}).to_string())
                    .execute()
                    .await;
            }
            Err(_) => {
                // execute_agency_payout already updates request status/failure_reason
                // Best-effort: unlink payments so they remain eligible next run.
                let _ = unlink_payments_from_agency_payout_request(state, &agency_id, &req_id).await;
            }
        }
    }

    Ok(())
}

fn compute_next_due_at(payout_frequency: &str, last_payout_at: Option<&str>) -> chrono::DateTime<Utc> {
    let last = last_payout_at
        .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap_or_else(Utc::now);

    let days = match payout_frequency {
        "Weekly" => 7,
        "Bi-Weekly" => 14,
        "Monthly" => 30,
        _ => 30,
    };

    last + Duration::days(days)
}

async fn compute_agency_available_to_pay_cents(state: &AppState, agency_id: &str) -> i64 {
    // Available = sum(agency share from succeeded payments that are not linked to an agency payout request.
    // Agency share is stored directly on payments as agency_earnings_cents.

    let pay_resp = match state
        .pg
        .from("payments")
        .select("agency_earnings_cents")
        .eq("agency_id", agency_id)
        .eq("status", "succeeded")
        .is("agency_payout_request_id", "null")
        .limit(2000)
        .execute()
        .await
    {
        Ok(r) => r,
        Err(_) => return 0,
    };
    let pay_text = pay_resp.text().await.unwrap_or_else(|_| "[]".into());
    let pay_rows: Vec<Value> = serde_json::from_str(&pay_text).unwrap_or_default();
    let mut total_earned: i64 = 0;
    for r in pay_rows {
        total_earned += r
            .get("agency_earnings_cents")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
    }

    total_earned.max(0)
}

async fn link_payments_to_agency_payout_request(
    state: &AppState,
    agency_id: &str,
    req_id: &str,
) -> Result<(), String> {
    // Best-effort bulk update: link all succeeded, unlinked payments for the agency.
    // This creates a clear audit trail of which payments were included in the payout.
    let resp = state
        .pg
        .from("payments")
        .eq("agency_id", agency_id)
        .eq("status", "succeeded")
        .is("agency_payout_request_id", "null")
        .update(json!({"agency_payout_request_id": req_id}).to_string())
        .execute()
        .await
        .map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        let txt = resp.text().await.unwrap_or_default();
        return Err(txt);
    }
    Ok(())
}

async fn unlink_payments_from_agency_payout_request(
    state: &AppState,
    agency_id: &str,
    req_id: &str,
) -> Result<(), String> {
    let resp = state
        .pg
        .from("payments")
        .eq("agency_id", agency_id)
        .eq("agency_payout_request_id", req_id)
        .update(json!({"agency_payout_request_id": serde_json::Value::Null}).to_string())
        .execute()
        .await
        .map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        let txt = resp.text().await.unwrap_or_default();
        return Err(txt);
    }
    Ok(())
}

async fn run_reminders(state: &AppState) -> Result<(), String> {
    // We send reminders 5 days before the due date
    let target_date = (Utc::now() + Duration::days(5))
        .format("%Y-%m-%d")
        .to_string();
    info!(target_date = %target_date, "Running payment reminders check");

    // Query payments due in 5 days that are still pending
    // We join with brands to get the recipient email
    let resp = state
        .pg
        .from("payments")
        .select("id,gross_cents,due_date,brand_id,brands(email,company_name)")
        .eq("status", "pending")
        .eq("due_date", &target_date)
        .execute()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err(format!("Supabase query failed: {err}"));
    }

    let text = resp.text().await.unwrap_or_default();
    let rows: Vec<Value> = serde_json::from_str(&text).unwrap_or_default();

    info!(count = rows.len(), "Found payments needing reminders");

    for r in rows {
        if let Some(brand) = r.get("brands") {
            if let Some(email) = brand.get("email").and_then(|v| v.as_str()) {
                let company_name = brand
                    .get("company_name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Brand");
                let amount =
                    (r.get("gross_cents").and_then(|v| v.as_i64()).unwrap_or(0) as f64) / 100.0;
                let subject = "Upcoming Licensing Payment Reminder";
                let body = format!(
                    "Hello {company_name},\n\nThis is a friendly reminder from Likelee. Your licensing payment of ${amount:.2} is due in 5 days ({target_date}).\n\nPlease contact the agency or reply to this email to complete the payment.\n\nBest regards,\nLikelee Team"
                );

                match crate::email::send_plain_email(state, email, subject, &body) {
                    Ok(_) => info!(email = %email, "Reminder email sent"),
                    Err((status, val)) => {
                        warn!(email = %email, status = ?status, error = %val, "Failed to send reminder email")
                    }
                }
            }
        }
    }

    Ok(())
}
