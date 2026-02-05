use crate::config::AppState;
use chrono::{Duration, Utc};
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

async fn run_reminders(state: &AppState) -> Result<(), String> {
    // We send reminders 5 days before the due date
    let target_date = (Utc::now() + Duration::days(5)).format("%Y-%m-%d").to_string();
    info!(target_date = %target_date, "Running payment reminders check");
    
    // Query payments due in 5 days that are still pending
    // We join with brands to get the recipient email
    let resp = state.pg.from("payments")
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
                let company_name = brand.get("company_name").and_then(|v| v.as_str()).unwrap_or("Brand");
                let amount = (r.get("gross_cents").and_then(|v| v.as_i64()).unwrap_or(0) as f64) / 100.0;
                let subject = "Upcoming Licensing Payment Reminder";
                let body = format!(
                    "Hello {company_name},\n\nThis is a friendly reminder from Likelee. Your licensing payment of ${amount:.2} is due in 5 days ({target_date}).\n\nPlease contact the agency or reply to this email to complete the payment.\n\nBest regards,\nLikelee Team"
                );
                
                match crate::email::send_plain_email(state, email, subject, &body) {
                    Ok(_) => info!(email = %email, "Reminder email sent"),
                    Err((status, val)) => warn!(email = %email, status = ?status, error = %val, "Failed to send reminder email"),
                }
            }
        }
    }

    Ok(())
}
