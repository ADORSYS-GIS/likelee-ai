use crate::auth::AuthUser;
use crate::config::AppState;
use axum::{extract::State, http::StatusCode, Json};
use chrono::Utc;
use serde::Serialize;
use serde_json::json;
use std::collections::HashMap;

#[derive(Debug, Serialize)]
pub struct AnalyticsDashboard {
    pub overview: OverviewMetrics,
    pub campaign_status: CampaignStatusBreakdown,
    pub ai_usage: AIUsageMetrics,
    pub monthly_trends: Vec<MonthlyTrend>,
    pub consent_status: ConsentStatusBreakdown,
}

#[derive(Debug, Serialize)]
pub struct OverviewMetrics {
    pub total_earnings_cents: i64,
    pub total_earnings_formatted: String,
    pub earnings_growth_percentage: f64,
    pub active_campaigns: i64,
    pub total_value_cents: i64,
    pub avg_value_cents: i64,
    pub avg_value_formatted: String,
    pub top_scope: String,
}

#[derive(Debug, Serialize)]
pub struct CampaignStatusBreakdown {
    pub in_progress: i64,
    pub ready_to_launch: i64,
    pub completed: i64,
}

#[derive(Debug, Serialize)]
pub struct AIUsageMetrics {
    pub total_usages_30d: i64,
    pub avg_campaign_value_cents: i64,
    pub avg_campaign_value_formatted: String,
    pub usage_by_type: AIUsageByType,
}

#[derive(Debug, Serialize)]
pub struct AIUsageByType {
    pub image: i64,
    pub video: i64,
    pub voice: i64,
}

#[derive(Debug, Serialize)]
pub struct MonthlyTrend {
    pub month: String,
    pub earnings_cents: i64,
    pub campaigns: i64,
    pub ai_usages: i64,
}

#[derive(Debug, Serialize)]
pub struct ConsentStatusBreakdown {
    pub complete: i64,
    pub missing: i64,
    pub expiring: i64,
}

/// GET /api/agency/analytics/dashboard
pub async fn get_analytics_dashboard(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<AnalyticsDashboard>, (StatusCode, String)> {
    let agency_id = &auth_user.id;
    let now = Utc::now();
    let thirty_days_ago = (now - chrono::Duration::days(30)).to_rfc3339();
    let sixty_days_ago = (now - chrono::Duration::days(60)).to_rfc3339();
    let today = now.format("%Y-%m-%d").to_string();
    let thirty_days_hence = (now + chrono::Duration::days(30))
        .format("%Y-%m-%d")
        .to_string();

    // 1. OVERVIEW METRICS

    // Total Earnings (30d)
    let earnings_resp = state
        .pg
        .from("payments")
        .select("gross_cents")
        .eq("agency_id", agency_id)
        .eq("status", "succeeded")
        .gte("paid_at", &thirty_days_ago)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let earnings_text = earnings_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let earnings_data: serde_json::Value =
        serde_json::from_str(&earnings_text).unwrap_or(json!([]));
    let total_earnings_cents: i64 = earnings_data
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .filter_map(|p| p.get("gross_cents")?.as_i64())
        .sum();

    // Previous 30 days earnings for growth calculation
    let prev_earnings_resp = state
        .pg
        .from("payments")
        .select("gross_cents")
        .eq("agency_id", agency_id)
        .eq("status", "succeeded")
        .gte("paid_at", &sixty_days_ago)
        .lt("paid_at", &thirty_days_ago)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let prev_earnings_text = prev_earnings_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let prev_earnings_data: serde_json::Value =
        serde_json::from_str(&prev_earnings_text).unwrap_or(json!([]));
    let prev_earnings_cents: i64 = prev_earnings_data
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .filter_map(|p| p.get("gross_cents")?.as_i64())
        .sum();

    let earnings_growth_percentage = if prev_earnings_cents > 0 {
        ((total_earnings_cents - prev_earnings_cents) as f64 / prev_earnings_cents as f64) * 100.0
    } else if total_earnings_cents > 0 {
        100.0
    } else {
        0.0
    };

    // Active Campaigns
    let active_campaigns_resp = state
        .pg
        .from("campaigns")
        .select("id")
        .eq("agency_id", agency_id)
        .eq("status", "active")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let active_campaigns_text = active_campaigns_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let active_campaigns_data: serde_json::Value =
        serde_json::from_str(&active_campaigns_text).unwrap_or(json!([]));
    let active_campaigns = active_campaigns_data
        .as_array()
        .map(|a| a.len() as i64)
        .unwrap_or(0);

    // Avg Value
    let avg_value_cents = if active_campaigns > 0 {
        total_earnings_cents / active_campaigns
    } else {
        0
    };

    // Top Scope (scope with highest count in last 30 days)
    let scope_resp = state
        .pg
        .from("campaigns")
        .select("brand_vertical")
        .eq("agency_id", agency_id)
        .gte("created_at", &thirty_days_ago)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let scope_text = scope_resp.text().await.unwrap_or_else(|_| "[]".to_string());
    let scope_data: serde_json::Value = serde_json::from_str(&scope_text).unwrap_or(json!([]));

    let mut scope_counts: HashMap<String, i64> = HashMap::new();
    for campaign in scope_data.as_array().unwrap_or(&vec![]) {
        if let Some(scope) = campaign.get("brand_vertical").and_then(|s| s.as_str()) {
            if !scope.is_empty() {
                *scope_counts.entry(scope.to_string()).or_insert(0) += 1;
            }
        }
    }

    let top_scope = scope_counts
        .into_iter()
        .max_by_key(|(_, count)| *count)
        .map(|(scope, _)| scope)
        .unwrap_or_else(|| "Social Media".to_string());

    // 2. CAMPAIGN STATUS BREAKDOWN

    // In Progress (active)
    let in_progress = active_campaigns;

    // Ready to Launch (pending)
    let pending_resp = state
        .pg
        .from("campaigns")
        .select("id")
        .eq("agency_id", agency_id)
        .eq("status", "Pending")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let pending_text = pending_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let pending_data: serde_json::Value = serde_json::from_str(&pending_text).unwrap_or(json!([]));
    let ready_to_launch = pending_data.as_array().map(|a| a.len() as i64).unwrap_or(0);

    // Completed (end_at < today)
    let completed_resp = state
        .pg
        .from("campaigns")
        .select("id")
        .eq("agency_id", agency_id)
        .lt("end_at", &today)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let completed_text = completed_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let completed_data: serde_json::Value =
        serde_json::from_str(&completed_text).unwrap_or(json!([]));
    let completed = completed_data
        .as_array()
        .map(|a| a.len() as i64)
        .unwrap_or(0);

    // 3. AI USAGE METRICS

    // Total AI usages (mock for now - needs ai_usage tracking implementation)
    let total_usages_30d = 73;

    // Avg Campaign Value (total earnings / all campaigns)
    let all_campaigns_resp = state
        .pg
        .from("campaigns")
        .select("id")
        .eq("agency_id", agency_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let all_campaigns_text = all_campaigns_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let all_campaigns_data: serde_json::Value =
        serde_json::from_str(&all_campaigns_text).unwrap_or(json!([]));
    let total_campaigns = all_campaigns_data
        .as_array()
        .map(|a| a.len() as i64)
        .unwrap_or(1);

    let avg_campaign_value_cents = total_earnings_cents / total_campaigns.max(1);

    // AI Usage by Type (mock for now - needs implementation)
    let usage_by_type = AIUsageByType {
        image: 45,
        video: 38,
        voice: 17,
    };

    // 4. MONTHLY TRENDS (last 5 months)
    let mut monthly_trends = Vec::new();
    for i in (0..5).rev() {
        let month_start_date = now - chrono::Duration::days(30 * i);
        let month_start = month_start_date.format("%Y-%m-01").to_string();
        let month_end = if i == 0 {
            now.to_rfc3339()
        } else {
            (now - chrono::Duration::days(30 * (i - 1)))
                .format("%Y-%m-01")
                .to_string()
        };

        // Get earnings for this month
        let month_earnings_resp = state
            .pg
            .from("payments")
            .select("gross_cents")
            .eq("agency_id", agency_id)
            .eq("status", "succeeded")
            .gte("paid_at", &month_start)
            .lt("paid_at", &month_end)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let month_earnings_text = month_earnings_resp
            .text()
            .await
            .unwrap_or_else(|_| "[]".to_string());
        let month_earnings_data: serde_json::Value =
            serde_json::from_str(&month_earnings_text).unwrap_or(json!([]));
        let month_earnings: i64 = month_earnings_data
            .as_array()
            .unwrap_or(&vec![])
            .iter()
            .filter_map(|p| p.get("gross_cents")?.as_i64())
            .sum();

        // Get campaigns for this month
        let month_campaigns_resp = state
            .pg
            .from("campaigns")
            .select("id")
            .eq("agency_id", agency_id)
            .gte("created_at", &month_start)
            .lt("created_at", &month_end)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let month_campaigns_text = month_campaigns_resp
            .text()
            .await
            .unwrap_or_else(|_| "[]".to_string());
        let month_campaigns_data: serde_json::Value =
            serde_json::from_str(&month_campaigns_text).unwrap_or(json!([]));
        let month_campaigns = month_campaigns_data
            .as_array()
            .map(|a| a.len() as i64)
            .unwrap_or(0);

        monthly_trends.push(MonthlyTrend {
            month: month_start_date.format("%b").to_string(),
            earnings_cents: month_earnings,
            campaigns: month_campaigns,
            ai_usages: 60 + (i * 3), // Mock for now
        });
    }

    // 5. CONSENT STATUS

    // Complete (active talents)
    let active_talents_resp = state
        .pg
        .from("agency_users")
        .select("id")
        .eq("agency_id", agency_id)
        .eq("role", "talent")
        .eq("status", "active")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let active_talents_text = active_talents_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let active_talents_data: serde_json::Value =
        serde_json::from_str(&active_talents_text).unwrap_or(json!([]));
    let complete = active_talents_data
        .as_array()
        .map(|a| a.len() as i64)
        .unwrap_or(0);

    // Missing (inactive talents)
    let inactive_talents_resp = state
        .pg
        .from("agency_users")
        .select("id")
        .eq("agency_id", agency_id)
        .eq("role", "talent")
        .eq("status", "inactive")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let inactive_talents_text = inactive_talents_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let inactive_talents_data: serde_json::Value =
        serde_json::from_str(&inactive_talents_text).unwrap_or(json!([]));
    let missing = inactive_talents_data
        .as_array()
        .map(|a| a.len() as i64)
        .unwrap_or(0);

    // Expiring (licensing requests expiring within 30 days)
    let expiring_resp = state
        .pg
        .from("licensing_requests")
        .select("talent_id")
        .eq("agency_id", agency_id)
        .gte("effective_end_date", &today)
        .lte("effective_end_date", &thirty_days_hence)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let expiring_text = expiring_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let expiring_data: serde_json::Value =
        serde_json::from_str(&expiring_text).unwrap_or(json!([]));
    let expiring = expiring_data
        .as_array()
        .map(|a| a.len() as i64)
        .unwrap_or(0);

    // Format values
    let total_earnings_formatted = format_currency(total_earnings_cents);
    let avg_value_formatted = format_currency(avg_value_cents);
    let avg_campaign_value_formatted = format_currency(avg_campaign_value_cents);

    Ok(Json(AnalyticsDashboard {
        overview: OverviewMetrics {
            total_earnings_cents,
            total_earnings_formatted,
            earnings_growth_percentage: (earnings_growth_percentage * 10.0).round() / 10.0,
            active_campaigns,
            total_value_cents: total_earnings_cents,
            avg_value_cents,
            avg_value_formatted,
            top_scope,
        },
        campaign_status: CampaignStatusBreakdown {
            in_progress,
            ready_to_launch,
            completed,
        },
        ai_usage: AIUsageMetrics {
            total_usages_30d,
            avg_campaign_value_cents,
            avg_campaign_value_formatted,
            usage_by_type,
        },
        monthly_trends,
        consent_status: ConsentStatusBreakdown {
            complete,
            missing,
            expiring,
        },
    }))
}

fn format_currency(cents: i64) -> String {
    let dollars = cents as f64 / 100.0;
    format!("${:.0}", dollars)
}
