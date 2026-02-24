use crate::auth::AuthUser;
use crate::config::AppState;
use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use chrono::{DateTime, Utc};
use serde::Serialize;
use serde_json::json;
use std::collections::{HashMap, HashSet};

#[derive(Debug, Serialize)]
pub struct AnalyticsDashboard {
    pub overview: OverviewMetrics,
    pub campaign_status: CampaignStatusBreakdown,
    pub ai_usage: AIUsageMetrics,
    pub monthly_trends: Vec<MonthlyTrend>,
    pub consent_status: ConsentStatusBreakdown,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum AnalyticsMode {
    Ai,
    Irl,
}

#[derive(Debug, serde::Deserialize)]
pub struct AnalyticsModeQuery {
    pub mode: Option<String>,
}

fn parse_mode(mode: Option<&str>) -> AnalyticsMode {
    match mode.unwrap_or("irl").to_lowercase().as_str() {
        "ai" => AnalyticsMode::Ai,
        _ => AnalyticsMode::Irl,
    }
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
    pub earnings: f64,
    pub campaigns: i64,
    pub usages: i64,
}

#[derive(Debug, Serialize)]
pub struct ConsentStatusBreakdown {
    pub complete: i64,
    pub missing: i64,
    pub expiring: i64,
    pub total: i64,
    pub verified: i64,
}

/// GET /api/agency/analytics/dashboard
pub async fn get_analytics_dashboard(
    State(state): State<AppState>,
    Query(q): Query<AnalyticsModeQuery>,
    auth_user: AuthUser,
) -> Result<Json<AnalyticsDashboard>, (StatusCode, String)> {
    let agency_id = &auth_user.id;
    let mode = parse_mode(q.mode.as_deref());
    let now = Utc::now();
    let thirty_days_ago = (now - chrono::Duration::days(30)).to_rfc3339();
    let sixty_days_ago = (now - chrono::Duration::days(60)).to_rfc3339();
    let five_months_ago = (now - chrono::Duration::days(150)).to_rfc3339(); // Approx 5 months
    let today = now.format("%Y-%m-%d").to_string();
    let ten_days_hence = (now + chrono::Duration::days(10))
        .format("%Y-%m-%d")
        .to_string();
    let agency_id_owned = agency_id.clone();

    if mode == AnalyticsMode::Ai {
        // --- AI MODE: earnings from licensing_payouts, licenses from licensing_requests ---
        let payouts_resp = state
            .pg
            .from("licensing_payouts")
            .select("amount_cents, paid_at, talent_id")
            .eq("agency_id", agency_id)
            .gte("paid_at", &five_months_ago)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let payouts_text = payouts_resp
            .text()
            .await
            .unwrap_or_else(|_| "[]".to_string());
        let payouts_data: Vec<serde_json::Value> =
            serde_json::from_str(&payouts_text).unwrap_or(vec![]);

        // Fetch licensing requests (campaigns equivalent in AI mode)
        let requests_resp = state
            .pg
            .from("licensing_requests")
            .select("id, status, created_at, deadline")
            .eq("agency_id", agency_id)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let requests_text = requests_resp
            .text()
            .await
            .unwrap_or_else(|_| "[]".to_string());
        let requests_data: Vec<serde_json::Value> =
            serde_json::from_str(&requests_text).unwrap_or(vec![]);

        let active_licenses_count = requests_data
            .iter()
            .filter(|r| {
                let status = r.get("status").and_then(|v| v.as_str()).unwrap_or("");
                let deadline = r.get("deadline").and_then(|v| v.as_str()).unwrap_or("");
                // Active if approved and not past deadline
                status == "approved" && deadline >= today.as_str()
            })
            .count() as i64;

        // A. OVERVIEW & GROWTH (Payouts in last 30d vs prev 30d)
        let total_earnings_cents: i64 = payouts_data
            .iter()
            .filter(|p| {
                let paid_at = p.get("paid_at").and_then(|v| v.as_str()).unwrap_or("");
                paid_at >= thirty_days_ago.as_str()
            })
            .filter_map(|p| p.get("amount_cents").and_then(|v| v.as_i64()))
            .sum();

        let prev_earnings_cents: i64 = payouts_data
            .iter()
            .filter(|p| {
                let paid_at = p.get("paid_at").and_then(|v| v.as_str()).unwrap_or("");
                paid_at >= sixty_days_ago.as_str() && paid_at < thirty_days_ago.as_str()
            })
            .filter_map(|p| p.get("amount_cents").and_then(|v| v.as_i64()))
            .sum();

        let earnings_growth_percentage = if prev_earnings_cents > 0 {
            ((total_earnings_cents - prev_earnings_cents) as f64 / prev_earnings_cents as f64)
                * 100.0
        } else if total_earnings_cents > 0 {
            100.0
        } else {
            0.0
        };

        // B. MONTHLY TRENDS
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

            let month_earnings: i64 = payouts_data
                .iter()
                .filter(|p| {
                    let paid_at = p.get("paid_at").and_then(|v| v.as_str()).unwrap_or("");
                    paid_at >= month_start.as_str() && paid_at < month_end.as_str()
                })
                .filter_map(|p| p.get("amount_cents").and_then(|v| v.as_i64()))
                .sum();

            let month_licenses: i64 = requests_data
                .iter()
                .filter(|r| {
                    let status = r.get("status").and_then(|v| v.as_str()).unwrap_or("");
                    let created_at = r.get("created_at").and_then(|v| v.as_str()).unwrap_or("");
                    status == "approved" && created_at >= month_start.as_str() && created_at < month_end.as_str()
                })
                .count() as i64;

            monthly_trends.push(MonthlyTrend {
                month: month_start_date.format("%b").to_string(),
                earnings: month_earnings as f64 / 100.0,
                campaigns: month_licenses,
                usages: 60 + (i * 3), // Mock
            });
        }

        let total_earnings_formatted = format_currency(total_earnings_cents);

        // Mock AI Usage
        let total_usages_30d = 73;
        let usage_by_type = AIUsageByType {
            image: 45,
            video: 38,
            voice: 17,
        };

        // C. CONSENT STATUS — real data from agency_users
        let ai_talents_resp = state
            .pg
            .from("agency_users")
            .select("id, consent_status, is_verified_talent")
            .eq("agency_id", &agency_id_owned)
            .eq("role", "talent")
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let ai_talents_text = ai_talents_resp
            .text()
            .await
            .unwrap_or_else(|_| "[]".to_string());
        let ai_talents_data: Vec<serde_json::Value> =
            serde_json::from_str(&ai_talents_text).unwrap_or(vec![]);

        let ai_total_talents = ai_talents_data.len() as i64;
        let mut ai_consent_complete = 0i64;
        let mut ai_consent_missing = 0i64;
        let mut ai_verified_count = 0i64;
        for t in ai_talents_data.iter() {
            if t.get("is_verified_talent")
                .and_then(|v| v.as_bool())
                .unwrap_or(false)
            {
                ai_verified_count += 1;
            }
            let consent = t
                .get("consent_status")
                .and_then(|v| v.as_str())
                .unwrap_or("missing");
            if consent == "complete" {
                ai_consent_complete += 1;
            } else {
                ai_consent_missing += 1;
            }
        }

        // D. EXPIRING SOON — licensing_requests approved and deadline within 10 days
        let ai_expiring_resp = state
            .pg
            .from("licensing_requests")
            .select("talent_id")
            .eq("agency_id", &agency_id_owned)
            .eq("status", "approved")
            .gte("deadline", &today)
            .lte("deadline", &ten_days_hence)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let ai_expiring_text = ai_expiring_resp
            .text()
            .await
            .unwrap_or_else(|_| "[]".to_string());
        let ai_expiring_data: Vec<serde_json::Value> =
            serde_json::from_str(&ai_expiring_text).unwrap_or(vec![]);
        let ai_expiring = ai_expiring_data.len() as i64;

        let avg_value_cents = if active_licenses_count > 0 {
            total_earnings_cents / active_licenses_count
        } else {
            0
        };

        return Ok(Json(AnalyticsDashboard {
            overview: OverviewMetrics {
                total_earnings_cents,
                total_earnings_formatted,
                earnings_growth_percentage: (earnings_growth_percentage * 10.0).round() / 10.0,
                active_campaigns: active_licenses_count,
                total_value_cents: total_earnings_cents,
                avg_value_cents,
                avg_value_formatted: format_currency(avg_value_cents),
                top_scope: "Licensing".to_string(),
            },
            campaign_status: CampaignStatusBreakdown {
                in_progress: 0,
                ready_to_launch: 0,
                completed: 0,
            },
            ai_usage: AIUsageMetrics {
                total_usages_30d,
                avg_campaign_value_cents: 0,
                avg_campaign_value_formatted: format_currency(0),
                usage_by_type,
            },
            monthly_trends,
            consent_status: ConsentStatusBreakdown {
                complete: ai_consent_complete,
                missing: ai_consent_missing,
                expiring: ai_expiring,
                total: ai_total_talents,
                verified: ai_verified_count,
            },
        }));
    }

    // --- IRL MODE (DEFAULT) ---
    // 1. BULK FETCH PAYMENTS (Last 5 months)
    let payments_resp = state
        .pg
        .from("payments")
        .select("gross_cents, paid_at, campaign_id")
        .eq("agency_id", agency_id)
        .eq("status", "succeeded")
        .gte("paid_at", &five_months_ago)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let payments_text = payments_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let payments_data: Vec<serde_json::Value> =
        serde_json::from_str(&payments_text).unwrap_or(vec![]);

    // 2. BULK FETCH CAMPAIGNS (from bookings_campaigns)
    let campaigns_resp = state
        .pg
        .from("bookings_campaigns")
        .select("id, status, created_at")
        .eq("agency_id", agency_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let campaigns_text = campaigns_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let campaigns_data: Vec<serde_json::Value> =
        serde_json::from_str(&campaigns_text).unwrap_or(vec![]);

    // 3. BULK FETCH TALENTS
    let talents_resp = state
        .pg
        .from("agency_users")
        .select("id, status, consent_status, is_verified_talent")
        .eq("agency_id", agency_id)
        .eq("role", "talent")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let talents_text = talents_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let talents_data: Vec<serde_json::Value> =
        serde_json::from_str(&talents_text).unwrap_or(vec![]);

    // --- AGGREGATION IN MEMORY ---

    // A. OVERVIEW & GROWTH (Payments in last 30d vs prev 30d)
    let total_earnings_cents: i64 = payments_data
        .iter()
        .filter(|p| {
            let paid_at = p.get("paid_at").and_then(|v| v.as_str()).unwrap_or("");
            paid_at >= thirty_days_ago.as_str()
        })
        .filter_map(|p| p.get("gross_cents").and_then(|v| v.as_i64()))
        .sum();

    let prev_earnings_cents: i64 = payments_data
        .iter()
        .filter(|p| {
            let paid_at = p.get("paid_at").and_then(|v| v.as_str()).unwrap_or("");
            paid_at >= sixty_days_ago.as_str() && paid_at < thirty_days_ago.as_str()
        })
        .filter_map(|p| p.get("gross_cents").and_then(|v| v.as_i64()))
        .sum();

    let earnings_growth_percentage = if prev_earnings_cents > 0 {
        ((total_earnings_cents - prev_earnings_cents) as f64 / prev_earnings_cents as f64) * 100.0
    } else if total_earnings_cents > 0 {
        100.0
    } else {
        0.0
    };

    // B. CAMPAIGN METRICS
    let mut active_campaigns = 0i64;
    let mut in_progress = 0i64;
    let mut ready_to_launch = 0i64;
    let mut completed = 0i64;
    let mut scope_counts: HashMap<String, i64> = HashMap::new();

    for c in campaigns_data.iter() {
        let status = c.get("status").and_then(|v| v.as_str()).unwrap_or("");
        let created_at = c.get("created_at").and_then(|v| v.as_str()).unwrap_or("");

        // In Progress (Ongoing)
        if status == "ongoing" {
            active_campaigns += 1;
            in_progress += 1;
        }

        // Ready to Launch (Created)
        if status == "created" {
            ready_to_launch += 1;
        }

        // Completed
        if status == "completed" {
            completed += 1;
        }

        // Top Scope (created in last 30d) - skipping vertical as it's not in bookings_campaigns yet
        if created_at >= thirty_days_ago.as_str() {
            // Default to generic for now since vertical is not in bookings_campaigns
            *scope_counts.entry("Social Media".to_string()).or_insert(0) += 1;
        }
    }

    // Top Scope Result
    let top_scope = scope_counts
        .into_iter()
        .max_by_key(|(_, count)| *count)
        .map(|(scope, _)| scope)
        .unwrap_or_else(|| "Social Media".to_string());

    // C. AVG VALUE
    let avg_value_cents = if active_campaigns > 0 {
        total_earnings_cents / active_campaigns
    } else {
        0
    };

    // D. AVG CAMPAIGN VALUE (Earnings / Unique campaigns paid in last 30d)
    let campaign_count_30d = payments_data
        .iter()
        .filter(|p| {
            let paid_at = p.get("paid_at").and_then(|v| v.as_str()).unwrap_or("");
            paid_at >= thirty_days_ago.as_str()
        })
        .filter_map(|p| {
            p.get("campaign_id")
                .and_then(|v| v.as_str()) // Prioritize string ID
                .or_else(|| {
                    p.get("campaign_id")
                        .and_then(|v| v.as_i64())
                        .map(|i| i.to_string().leak() as &str)
                }) // Handle int ID if any
        })
        .collect::<HashSet<_>>() // Unique IDs
        .len() as i64;

    let avg_campaign_value_cents = if campaign_count_30d > 0 {
        total_earnings_cents / campaign_count_30d
    } else {
        0
    };

    // E. MONTHLY TRENDS
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

        // Filter payments for this month
        let month_earnings: i64 = payments_data
            .iter()
            .filter(|p| {
                let paid_at = p.get("paid_at").and_then(|v| v.as_str()).unwrap_or("");
                paid_at >= month_start.as_str() && paid_at < month_end.as_str()
            })
            .filter_map(|p| p.get("gross_cents").and_then(|v| v.as_i64()))
            .sum();

        // Filter campaigns created in this month
        let month_campaigns: i64 = campaigns_data
            .iter()
            .filter(|c| {
                let created_at = c.get("created_at").and_then(|v| v.as_str()).unwrap_or("");
                created_at >= month_start.as_str() && created_at < month_end.as_str()
            })
            .count() as i64;

        monthly_trends.push(MonthlyTrend {
            month: month_start_date.format("%b").to_string(),
            earnings: month_earnings as f64 / 100.0,
            campaigns: month_campaigns,
            usages: 60 + (i * 3), // Mock
        });
    }

    // F. CONSENT STATUS — active_consents = talents with consent_status="complete"
    //                       verification rate = talents with is_verified_talent=true
    let mut consent_complete = 0i64;
    let mut consent_missing = 0i64;
    let mut verified_count = 0i64;
    let total_talents = talents_data.len() as i64;

    for t in talents_data.iter() {
        let is_verified = t
            .get("is_verified_talent")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
        if is_verified {
            verified_count += 1;
        }

        let consent = t
            .get("consent_status")
            .and_then(|v| v.as_str())
            .unwrap_or("missing");
        if consent == "complete" {
            consent_complete += 1;
        } else {
            consent_missing += 1;
        }
    }

    // 4. EXPIRING REQUESTS — approved requests with deadline within 10 days
    let expiring_resp = state
        .pg
        .from("licensing_requests")
        .select("talent_id")
        .eq("agency_id", agency_id)
        .eq("status", "approved")
        .gte("deadline", &today)
        .lte("deadline", &ten_days_hence)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let expiring_text = expiring_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let expiring_data: Vec<serde_json::Value> =
        serde_json::from_str(&expiring_text).unwrap_or(vec![]);
    let expiring = expiring_data.len() as i64;

    // Format values
    let total_earnings_formatted = format_currency(total_earnings_cents);
    let avg_value_formatted = format_currency(avg_value_cents);
    let avg_campaign_value_formatted = format_currency(avg_campaign_value_cents);

    // Mock AI Usage
    let total_usages_30d = 73;
    let usage_by_type = AIUsageByType {
        image: 45,
        video: 38,
        voice: 17,
    };

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
            complete: consent_complete,
            missing: consent_missing,
            expiring,
            total: total_talents,
            verified: verified_count,
        },
    }))
}

#[derive(Debug, Serialize)]
pub struct ClientsCampaignsResponse {
    pub earnings_by_client: Vec<ClientEarning>,
    pub geographic_distribution: Vec<GeoMetric>,
    pub top_clients_performance: Vec<ClientPerformance>,
    pub repeat_client_rate: f64,
    pub avg_campaign_duration: i64,
    pub client_acquisition: i64,
}

#[derive(Debug, Serialize)]
pub struct ClientEarning {
    pub name: String,
    pub budget: f64,
    pub color: String,
}

#[derive(Debug, Serialize)]
pub struct GeoMetric {
    pub name: String,
    pub value: f64,
    pub color: String,
}

#[derive(Debug, Serialize)]
pub struct ClientPerformance {
    pub name: String,
    pub campaigns: i64,
    pub budget: f64,
    pub percentage: f64,
}

/// GET /api/agency/analytics/clients-campaigns
pub async fn get_clients_campaigns_analytics(
    State(state): State<AppState>,
    Query(q): Query<AnalyticsModeQuery>,
    auth_user: AuthUser,
) -> Result<Json<ClientsCampaignsResponse>, (StatusCode, String)> {
    let agency_id = &auth_user.id;
    let colors = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b"];
    let mode = parse_mode(q.mode.as_deref());

    // ===========================================================
    // AI MODE: licensing_requests + licensing_payouts
    // ===========================================================
    if mode == AnalyticsMode::Ai {
        // 1. All approved licensing requests for this agency
        let lr_resp = state
            .pg
            .from("licensing_requests")
            .select("id, client_name, regions")
            .eq("agency_id", agency_id)
            .eq("status", "approved")
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let lr_text = lr_resp.text().await.unwrap_or_else(|_| "[]".to_string());
        
        let lr_list: Vec<serde_json::Value> = if let Ok(parsed) = serde_json::from_str(&lr_text) {
            match parsed {
                serde_json::Value::Array(arr) => arr,
                _ => {
                    tracing::error!("licensing_requests fetch error or unexpected struct: {}", lr_text);
                    vec![]
                }
            }
        } else {
            vec![]
        };

        // 2. Licensing payouts for this agency (all time for Top Clients)
        let lp_resp = state
            .pg
            .from("licensing_payouts")
            .select("amount_cents, licensing_request_id")
            .eq("agency_id", agency_id)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let lp_text = lp_resp.text().await.unwrap_or_else(|_| "[]".to_string());
        let lp_list: Vec<serde_json::Value> =
            serde_json::from_str(&lp_text).unwrap_or(vec![]);

        // Build map: request_id -> amount_cents from payouts
        let mut payout_by_request: HashMap<String, i64> = HashMap::new();
        for p in &lp_list {
            let rid = p
                .get("licensing_request_id")
                .and_then(|v| v.as_str())
                .unwrap_or_default();
            let amt = p
                .get("amount_cents")
                .and_then(|v| v.as_i64())
                .unwrap_or(0);
            if !rid.is_empty() {
                *payout_by_request.entry(rid.to_string()).or_insert(0) += amt;
            }
        }

        // Aggregate by client name
        let mut client_earnings: HashMap<String, i64> = HashMap::new();
        let mut client_license_count: HashMap<String, i64> = HashMap::new();
        let mut region_counts: HashMap<String, i64> = HashMap::new();

        for req in &lr_list {
            let client = req
                .get("client_name")
                .and_then(|v| v.as_str())
                .unwrap_or("Unknown")
                .to_string();
            let rid = req
                .get("id")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string();

            let payout = payout_by_request.get(&rid).cloned().unwrap_or(0);
            *client_earnings.entry(client.clone()).or_insert(0) += payout;
            *client_license_count.entry(client).or_insert(0) += 1;

            let region = req
                .get("regions")
                .and_then(|v| v.as_str())
                .filter(|r| !r.is_empty())
                .unwrap_or("Unknown")
                .to_string();
            *region_counts.entry(region).or_insert(0) += 1;
        }

        let total_revenue: i64 = client_earnings.values().sum();

        // Earnings by client (top 4 by payout)
        let mut earnings_vec: Vec<ClientEarning> = client_earnings
            .iter()
            .map(|(name, cents)| ClientEarning {
                name: name.clone(),
                budget: *cents as f64 / 100.0,
                color: String::new(),
            })
            .collect();
        earnings_vec.sort_by(|a, b| {
            b.budget
                .partial_cmp(&a.budget)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        earnings_vec.truncate(4);
        for (i, item) in earnings_vec.iter_mut().enumerate() {
            item.color = colors[i % colors.len()].to_string();
        }

        // Geographic distribution (top 4 by license count)
        let mut geo_vec: Vec<GeoMetric> = region_counts
            .iter()
            .map(|(name, count)| GeoMetric {
                name: name.clone(),
                value: *count as f64,
                color: String::new(),
            })
            .collect();
        geo_vec.sort_by(|a, b| {
            b.value
                .partial_cmp(&a.value)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        geo_vec.truncate(4);
        for (i, item) in geo_vec.iter_mut().enumerate() {
            item.color = colors[i % colors.len()].to_string();
        }

        // Top Clients Performance (sorted by total payout, top 4)
        let mut perf_vec: Vec<ClientPerformance> = client_earnings
            .iter()
            .map(|(name, cents)| {
                let count = client_license_count.get(name).cloned().unwrap_or(0);
                ClientPerformance {
                    name: name.clone(),
                    campaigns: count,
                    budget: *cents as f64 / 100.0,
                    percentage: if total_revenue > 0 {
                        (*cents as f64 / total_revenue as f64) * 100.0
                    } else {
                        0.0
                    },
                }
            })
            .collect();
        perf_vec.sort_by(|a, b| {
            b.budget
                .partial_cmp(&a.budget)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        perf_vec.truncate(4);

        // Repeat Client Rate: % of clients who appear more than once
        let total_clients = client_license_count.len() as f64;
        let repeat_clients = client_license_count
            .values()
            .filter(|&&c| c > 1)
            .count() as f64;
        let repeat_client_rate = if total_clients > 0.0 {
            (repeat_clients / total_clients) * 100.0
        } else {
            0.0
        };

        // Client Acquisition: distinct clients seen in the last 30 days
        let thirty_days_ago = (Utc::now() - chrono::Duration::days(30)).to_rfc3339();
        let new_lr_resp = state
            .pg
            .from("licensing_requests")
            .select("client_name")
            .eq("agency_id", agency_id)
            .eq("status", "approved")
            .gte("created_at", &thirty_days_ago)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let new_lr_text = new_lr_resp
            .text()
            .await
            .unwrap_or_else(|_| "[]".to_string());
        
        let new_lr_list: Vec<serde_json::Value> = if let Ok(parsed) = serde_json::from_str(&new_lr_text) {
            match parsed {
                serde_json::Value::Array(arr) => arr,
                _ => vec![]
            }
        } else {
            vec![]
        };

        let new_client_names: HashSet<String> = new_lr_list
            .iter()
            .filter_map(|r| {
                r.get("client_name")
                    .and_then(|v| v.as_str())
                    .filter(|s| !s.is_empty())
                    .map(|s| s.to_string())
            })
            .collect();
        let client_acquisition = new_client_names.len() as i64;

        return Ok(Json(ClientsCampaignsResponse {
            earnings_by_client: earnings_vec,
            geographic_distribution: geo_vec,
            top_clients_performance: perf_vec,
            repeat_client_rate,
            avg_campaign_duration: 0,
            client_acquisition,
        }));
    }

    // ===========================================================
    // IRL MODE (original logic below)
    // ===========================================================


    // 1. Earnings by Client & Top Clients Performance
    // We need payments summed by brand, and campaigns counted by brand.

    // Fetch all successful payments for this agency to aggregate by brand
    let payments_resp = state
        .pg
        .from("payments")
        .select("gross_cents, brand_id, campaign_id")
        .eq("agency_id", agency_id)
        .eq("status", "succeeded")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let payments_data: serde_json::Value = serde_json::from_str(
        &payments_resp
            .text()
            .await
            .unwrap_or_else(|_| "[]".to_string()),
    )
    .unwrap_or(json!([]));

    // Debug logging
    let payment_count = payments_data.as_array().map(|a| a.len()).unwrap_or(0);
    tracing::info!(
        "Found {} successful payments for agency {}",
        payment_count,
        agency_id
    );

    let mut brand_earnings: HashMap<String, i64> = HashMap::new();
    let mut brand_campaigns_interactions: HashMap<String, HashSet<String>> = HashMap::new();

    if let Some(payments) = payments_data.as_array() {
        for p in payments {
            if let Some(brand_id) = p.get("brand_id").and_then(|v| v.as_str()) {
                let cents = p.get("gross_cents").and_then(|v| v.as_i64()).unwrap_or(0);
                *brand_earnings.entry(brand_id.to_string()).or_insert(0) += cents;

                if let Some(cid) = p.get("campaign_id").and_then(|v| v.as_str()) {
                    brand_campaigns_interactions
                        .entry(brand_id.to_string())
                        .or_default()
                        .insert(cid.to_string());
                }
            }
        }
    }

    tracing::info!("Aggregated earnings for {} brands", brand_earnings.len());

    // Fetch all campaigns to get regions and count per brand
    let campaigns_resp = state
        .pg
        .from("campaigns")
        .select("id, brand_id, region")
        .eq("agency_id", agency_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let campaigns_data: serde_json::Value = serde_json::from_str(
        &campaigns_resp
            .text()
            .await
            .unwrap_or_else(|_| "[]".to_string()),
    )
    .unwrap_or(json!([]));
    let mut region_earnings: HashMap<String, i64> = HashMap::new();
    let mut brand_campaign_count: HashMap<String, i64> = HashMap::new();
    let mut total_revenue = 0i64;

    if let Some(campaigns) = campaigns_data.as_array() {
        for c in campaigns {
            if let Some(bid) = c.get("brand_id").and_then(|v| v.as_str()) {
                *brand_campaign_count.entry(bid.to_string()).or_insert(0) += 1;
            }

            if let Some(rid) = c.get("id").and_then(|v| v.as_str()) {
                let region = c
                    .get("region")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Unknown");
                // Find earnings for this campaign from payments_data
                let campaign_rev: i64 = payments_data
                    .as_array()
                    .map(|arr| {
                        arr.iter()
                            .filter(|p| p.get("campaign_id").and_then(|v| v.as_str()) == Some(rid))
                            .filter_map(|p| p.get("gross_cents").and_then(|v| v.as_i64()))
                            .sum()
                    })
                    .unwrap_or(0);

                *region_earnings.entry(region.to_string()).or_insert(0) += campaign_rev;
                total_revenue += campaign_rev;
            }
        }
    }

    // Get Brand Names
    let brands_resp = state
        .pg
        .from("brands")
        .select("id, company_name")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let brands_list: serde_json::Value = serde_json::from_str(
        &brands_resp
            .text()
            .await
            .unwrap_or_else(|_| "[]".to_string()),
    )
    .unwrap_or(json!([]));
    let mut brand_names: HashMap<String, String> = HashMap::new();
    if let Some(arr) = brands_list.as_array() {
        for b in arr {
            if let (Some(id), Some(name)) = (
                b.get("id").and_then(|v| v.as_str()),
                b.get("company_name").and_then(|v| v.as_str()),
            ) {
                brand_names.insert(id.to_string(), name.to_string());
            }
        }
    }

    // Format Earnings by Client (Top 4)
    let mut earnings_vec: Vec<ClientEarning> = brand_earnings
        .iter()
        .map(|(id, cents)| ClientEarning {
            name: brand_names
                .get(id)
                .cloned()
                .unwrap_or_else(|| "Unknown Brand".to_string()),
            budget: *cents as f64 / 100.0,
            color: "".to_string(), // Will assign below
        })
        .collect();
    earnings_vec.sort_by(|a, b| {
        b.budget
            .partial_cmp(&a.budget)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    tracing::info!("Before truncate: {} earnings entries", earnings_vec.len());
    for (idx, earning) in earnings_vec.iter().enumerate() {
        tracing::info!("  [{}] {} = ${:.2}", idx, earning.name, earning.budget);
    }

    earnings_vec.truncate(4);
    for (i, item) in earnings_vec.iter_mut().enumerate() {
        item.color = colors[i % colors.len()].to_string();
    }

    // Format Geo Distribution (Top 4)
    let mut geo_vec: Vec<GeoMetric> = region_earnings
        .iter()
        .map(|(name, cents)| GeoMetric {
            name: name.clone(),
            value: *cents as f64 / 100.0,
            color: "".to_string(),
        })
        .collect();
    geo_vec.sort_by(|a, b| {
        b.value
            .partial_cmp(&a.value)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    geo_vec.truncate(4);
    for (i, item) in geo_vec.iter_mut().enumerate() {
        item.color = colors[i % colors.len()].to_string();
    }

    // Format Top Clients Performance (Top 4 by count)
    let mut perf_vec: Vec<ClientPerformance> = brand_campaign_count
        .iter()
        .map(|(id, count)| {
            let cents = brand_earnings.get(id).cloned().unwrap_or(0);
            ClientPerformance {
                name: brand_names
                    .get(id)
                    .cloned()
                    .unwrap_or_else(|| "Unknown Brand".to_string()),
                campaigns: *count,
                budget: cents as f64 / 100.0,
                percentage: if total_revenue > 0 {
                    (cents as f64 / total_revenue as f64) * 100.0
                } else {
                    0.0
                },
            }
        })
        .collect();
    perf_vec.sort_by(|a, b| {
        b.campaigns.cmp(&a.campaigns).then_with(|| {
            b.budget
                .partial_cmp(&a.budget)
                .unwrap_or(std::cmp::Ordering::Equal)
        })
    });
    perf_vec.truncate(4);

    // Repeat Client Rate
    // percentage = (brands with >1 unique campaign) / (total unique brands in campaigns)
    let total_brands = brand_campaign_count.len() as f64;
    let repeat_brands = brand_campaign_count.values().filter(|&&c| c > 1).count() as f64;
    let repeat_client_rate = if total_brands > 0.0 {
        (repeat_brands / total_brands) * 100.0
    } else {
        0.0
    };

    // Avg Campaign Duration
    // time difference between "Casting" phase (created_at) and "Completed" status
    let bookings_resp = state
        .pg
        .from("bookings")
        .select("created_at, updated_at")
        .eq("status", "completed")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let bookings_data: serde_json::Value = serde_json::from_str(
        &bookings_resp
            .text()
            .await
            .unwrap_or_else(|_| "[]".to_string()),
    )
    .unwrap_or(json!([]));
    let mut total_days = 0i64;
    let mut completed_count = 0i64;

    if let Some(arr) = bookings_data.as_array() {
        for b in arr {
            if let (Some(created), Some(updated)) = (
                b.get("created_at").and_then(|v| v.as_str()),
                b.get("updated_at").and_then(|v| v.as_str()),
            ) {
                if let (Ok(c_dt), Ok(u_dt)) = (
                    DateTime::parse_from_rfc3339(created),
                    DateTime::parse_from_rfc3339(updated),
                ) {
                    let duration = u_dt.signed_duration_since(c_dt);
                    let days = duration.num_days();
                    // Ensure at least 1 day for any completed booking to avoid "0 days" display issue
                    total_days += days.max(1);
                    completed_count += 1;
                }
            }
        }
    }
    let avg_campaign_duration = if completed_count > 0 {
        total_days / completed_count
    } else {
        0
    };

    // Client Acquisition (Brands first seen in the last 30 days)
    let thirty_days_ago = (Utc::now() - chrono::Duration::days(30)).to_rfc3339();
    let new_brands_resp = state
        .pg
        .from("brands")
        .select("id")
        .gte("created_at", &thirty_days_ago)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let new_brands_data: serde_json::Value = serde_json::from_str(
        &new_brands_resp
            .text()
            .await
            .unwrap_or_else(|_| "[]".to_string()),
    )
    .unwrap_or(json!([]));
    let client_acquisition = new_brands_data
        .as_array()
        .map(|a| a.len() as i64)
        .unwrap_or(0);

    Ok(Json(ClientsCampaignsResponse {
        earnings_by_client: earnings_vec,
        geographic_distribution: geo_vec,
        top_clients_performance: perf_vec,
        repeat_client_rate,
        avg_campaign_duration,
        client_acquisition,
    }))
}

fn format_currency(cents: i64) -> String {
    let dollars = (cents as f64 / 100.0).round() as i64;
    let s = dollars.to_string();
    let is_negative = s.starts_with('-');
    let abs_s = if is_negative { &s[1..] } else { &s };
    let mut out = String::new();
    for (i, c) in abs_s.chars().rev().enumerate() {
        if i > 0 && i % 3 == 0 { out.push(','); }
        out.push(c);
    }
    let formatted: String = out.chars().rev().collect();
    if is_negative {
        format!("-${}", formatted)
    } else {
        format!("${}", formatted)
    }
}

#[derive(Debug, Serialize)]
pub struct RosterInsightsResponse {
    pub highest_engagement: Option<TalentMetric>,
    pub most_active: Option<TalentMetric>,
    pub top_performer: Option<TalentMetric>,
    pub talent_metrics: Vec<TalentPerformanceMetric>,
}

#[derive(Debug, Serialize)]
pub struct TalentMetric {
    pub talent_id: uuid::Uuid,
    pub talent_name: String,
    pub value: String,
    pub sub_text: String,
    pub image_url: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TalentPerformanceMetric {
    pub talent_id: uuid::Uuid,
    pub talent_name: String,
    pub earnings_30d_cents: i64,
    pub earnings_30d_formatted: String,
    pub projected_earnings_cents: i64,
    pub projected_earnings_formatted: String,
    pub campaigns_count_30d: i64,
    pub avg_value_cents: i64,
    pub avg_value_formatted: String,
    pub status: String,
    pub image_url: Option<String>,
    pub followers_count: i64,
    pub engagement_rate: f64,
}

/// GET /api/agency/analytics/roster
pub async fn get_roster_insights(
    State(state): State<AppState>,
    Query(q): Query<AnalyticsModeQuery>,
    auth_user: AuthUser,
) -> Result<Json<RosterInsightsResponse>, (StatusCode, String)> {
    let mode = parse_mode(q.mode.as_deref());
    let now = Utc::now();
    let thirty_days_ago = (now - chrono::Duration::days(30)).to_rfc3339();
    let sixty_days_ago = (now - chrono::Duration::days(60)).to_rfc3339();

    if mode == AnalyticsMode::Ai {
        // --- AI MODE: license-based roster insights (no campaigns) ---

        // 1. Fetch all agency talents
        let query = state
            .pg
            .from("agency_users")
            .select("id, full_legal_name, stage_name, profile_photo_url, instagram_followers, engagement_rate, creator_id, is_verified_talent")
            .eq("agency_id", &auth_user.id)
            .eq("role", "talent")
            .order("created_at.desc");

        let response = query.execute().await.map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Database error: {}", e),
            )
        })?;

        let talents: Vec<serde_json::Value> =
            serde_json::from_str(&response.text().await.map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Failed to read response: {}", e),
                )
            })?)
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("Failed to parse talents: {}", e),
                )
            })?;

        // Collect creator_ids to fetch KYC status
        let creator_ids: Vec<String> = talents
            .iter()
            .filter_map(|t| t.get("creator_id").and_then(|v| v.as_str()))
            .map(|s| s.to_string())
            .collect();

        // 2. Fetch Creators (for KYC status)
        let mut creator_kyc_map: HashMap<String, String> = HashMap::new();
        if !creator_ids.is_empty() {
            let creators_resp = state
                .pg
                .from("creators")
                .select("id, kyc_status")
                .in_("id", creator_ids)
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

            let creators_text = creators_resp
                .text()
                .await
                .unwrap_or_else(|_| "[]".to_string());
            let creators_list: Vec<serde_json::Value> =
                serde_json::from_str(&creators_text).unwrap_or(vec![]);

            for c in creators_list {
                if let (Some(id), Some(status)) = (
                    c.get("id").and_then(|v| v.as_str()),
                    c.get("kyc_status").and_then(|v| v.as_str()),
                ) {
                    creator_kyc_map.insert(id.to_string(), status.to_string());
                }
            }
        }

        // 3. Licensing payouts (Last 60d) for earnings + projected
        let payouts_resp = state
            .pg
            .from("licensing_payouts")
            .select("amount_cents, talent_earnings_cents, talent_id, talent_splits, paid_at")
            .eq("agency_id", &auth_user.id)
            .gte("paid_at", &sixty_days_ago)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let payouts_text = payouts_resp
            .text()
            .await
            .unwrap_or_else(|_| "[]".to_string());
        
        let payouts_list: Vec<serde_json::Value> = if let Ok(parsed) = serde_json::from_str(&payouts_text) {
            match parsed {
                serde_json::Value::Array(arr) => arr,
                _ => vec![]
            }
        } else {
            vec![]
        };

        let mut talent_earnings_60d: HashMap<String, i64> = HashMap::new();
        let mut talent_earnings_30d: HashMap<String, i64> = HashMap::new();

        for payout in payouts_list {
            let paid_at = payout.get("paid_at").and_then(|v| v.as_str()).unwrap_or("");
            let splits_arr = payout.get("talent_splits").and_then(|v| v.as_array());
            
            if let Some(splits) = splits_arr {
                if !splits.is_empty() {
                    for split in splits {
                        let s_tid = split.get("talent_id").and_then(|v| v.as_str()).unwrap_or_default();
                        let s_amt = split.get("amount_cents").and_then(|v| v.as_i64()).unwrap_or(0);
                        if !s_tid.is_empty() {
                            *talent_earnings_60d.entry(s_tid.to_string()).or_insert(0) += s_amt;
                            if paid_at >= thirty_days_ago.as_str() {
                                *talent_earnings_30d.entry(s_tid.to_string()).or_insert(0) += s_amt;
                            }
                        }
                    }
                    continue;
                }
            }
            
            // Fallback for single-talent legacy payouts
            let fallback_amt = payout
                .get("talent_earnings_cents")
                .and_then(|v| v.as_i64())
                .unwrap_or(0);
            let legacy_tid = payout
                .get("talent_id")
                .and_then(|v| v.as_str())
                .unwrap_or_default();

            if !legacy_tid.is_empty() {
                *talent_earnings_60d.entry(legacy_tid.to_string()).or_insert(0) += fallback_amt;
                if paid_at >= thirty_days_ago.as_str() {
                    *talent_earnings_30d.entry(legacy_tid.to_string()).or_insert(0) += fallback_amt;
                }
            }
        }


        // 4. Approved licensing requests (Last 30d) for Most Active (Licenses)
        let licensing_resp = state
            .pg
            .from("licensing_requests")
            .select("talent_id, created_at, status")
            .eq("agency_id", &auth_user.id)
            .eq("status", "approved")
            .gte("created_at", &thirty_days_ago)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let licensing_text = licensing_resp
            .text()
            .await
            .unwrap_or_else(|_| "[]".to_string());
        let licensing_list: Vec<serde_json::Value> =
            serde_json::from_str(&licensing_text).unwrap_or(vec![]);

        let mut talent_approved_licenses_count: HashMap<String, i64> = HashMap::new();
        for r in licensing_list {
            if let Some(tid) = r.get("talent_id").and_then(|v| v.as_str()) {
                *talent_approved_licenses_count
                    .entry(tid.to_string())
                    .or_insert(0) += 1;
            }
        }

        let mut talent_metrics = Vec::new();
        for talent in talents.iter() {
            let tid = talent
                .get("id")
                .and_then(|v| v.as_str())
                .unwrap_or_default();
            if tid.is_empty() {
                continue;
            }

            let realized_30d = *talent_earnings_30d.get(tid).unwrap_or(&0);
            let total_60d = *talent_earnings_60d.get(tid).unwrap_or(&0);
            let projected = total_60d / 2;

            let licenses_count = *talent_approved_licenses_count.get(tid).unwrap_or(&0);

            let creator_id = talent.get("creator_id").and_then(|v| v.as_str());
            let is_verified_talent = talent
                .get("is_verified_talent")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            let _is_verified = is_verified_talent || creator_id.is_some();

            let name = talent
                .get("full_legal_name")
                .and_then(|v| v.as_str())
                .or_else(|| talent.get("stage_name").and_then(|v| v.as_str()))
                .unwrap_or("Unknown")
                .to_string();
            let image_url = talent
                .get("profile_photo_url")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            let avg_value = if licenses_count > 0 {
                realized_30d / licenses_count
            } else {
                0
            };

            let _format_currency = |cents: i64| format!("${:.0}", cents as f64 / 100.0);

            let followers_count = talent
                .get("instagram_followers")
                .and_then(|v| v.as_i64())
                .unwrap_or(0);
            let engagement_rate = talent
                .get("engagement_rate")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0);

            // Status = Active if talent has at least 1 approved license in last 30d
            let is_active = licenses_count > 0;

            talent_metrics.push(TalentPerformanceMetric {
                talent_id: uuid::Uuid::parse_str(tid).unwrap_or_default(),
                talent_name: name.clone(),
                earnings_30d_cents: realized_30d,
                earnings_30d_formatted: format_currency(realized_30d),
                projected_earnings_cents: projected,
                projected_earnings_formatted: format_currency(projected),
                campaigns_count_30d: licenses_count,
                avg_value_cents: avg_value,
                avg_value_formatted: format_currency(avg_value),
                status: if is_active {
                    "Active".to_string()
                } else {
                    "Inactive".to_string()
                },
                image_url: image_url.clone(),
                followers_count,
                engagement_rate,
            });
        }

        // Top Performer: highest earnings
        let top_performer_metric = talent_metrics.iter().max_by_key(|m| m.earnings_30d_cents);
        let top_performer = top_performer_metric.map(|m| TalentMetric {
            talent_id: m.talent_id,
            talent_name: m.talent_name.clone(),
            value: m.earnings_30d_formatted.clone(),
            sub_text: format!(
                "{} licenses • {:.1}% engagement",
                m.campaigns_count_30d, m.engagement_rate
            ),
            image_url: m.image_url.clone(),
        });

        // Most Active: most approved licenses
        let most_active_metric = talent_metrics
            .iter()
            .max_by_key(|m| (m.campaigns_count_30d, m.earnings_30d_cents));
        let most_active = most_active_metric.map(|m| TalentMetric {
            talent_id: m.talent_id,
            talent_name: m.talent_name.clone(),
            value: format!("{} licenses", m.campaigns_count_30d),
            sub_text: format!(
                "{} earnings • {:.1}% engagement",
                m.earnings_30d_formatted, m.engagement_rate
            ),
            image_url: m.image_url.clone(),
        });

        // Highest Engagement: talent with the most instagram_followers
        let highest_engagement_metric = talent_metrics
            .iter()
            .max_by_key(|m| m.followers_count);

        // Format follower count with commas (e.g. 53400 -> 53,400)
        let fmt_followers = |n: i64| -> String {
            let s = n.to_string();
            let mut out = String::new();
            for (i, c) in s.chars().rev().enumerate() {
                if i > 0 && i % 3 == 0 { out.push(','); }
                out.push(c);
            }
            out.chars().rev().collect()
        };

        let highest_engagement = highest_engagement_metric.map(|m| TalentMetric {
            talent_id: m.talent_id,
            talent_name: m.talent_name.clone(),
            value: fmt_followers(m.followers_count),
            sub_text: format!(
                "{} earnings • {} licenses",
                m.earnings_30d_formatted, m.campaigns_count_30d
            ),
            image_url: m.image_url.clone(),
        });

        // Preserve KYC-based data enrichment (not exposed yet but kept consistent)
        let _ = creator_kyc_map;

        return Ok(Json(RosterInsightsResponse {
            highest_engagement,
            most_active,
            top_performer,
            talent_metrics,
        }));
    }

    // --- IRL MODE (DEFAULT) ---

    // 1. Fetch all agency talents
    let query = state
        .pg
        .from("agency_users")
        .select("id, full_legal_name, stage_name, profile_photo_url, instagram_followers, engagement_rate, creator_id, is_verified_talent")
        .eq("agency_id", &auth_user.id)
        .eq("role", "talent")
        .order("created_at.desc");

    let response = query.execute().await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Database error: {}", e),
        )
    })?;

    let talents: Vec<serde_json::Value> =
        serde_json::from_str(&response.text().await.map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to read response: {}", e),
            )
        })?)
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to parse talents: {}", e),
            )
        })?;

    // Collect creator_ids to fetch KYC status
    let creator_ids: Vec<String> = talents
        .iter()
        .filter_map(|t| t.get("creator_id").and_then(|v| v.as_str()))
        .map(|s| s.to_string())
        .collect();

    // 2. Fetch Creators (for KYC status)
    let mut creator_kyc_map: HashMap<String, String> = HashMap::new();
    if !creator_ids.is_empty() {
        let creators_resp = state
            .pg
            .from("creators")
            .select("id, kyc_status")
            .in_("id", creator_ids)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let creators_text = creators_resp
            .text()
            .await
            .unwrap_or_else(|_| "[]".to_string());
        let creators_list: Vec<serde_json::Value> =
            serde_json::from_str(&creators_text).unwrap_or(vec![]);

        for c in creators_list {
            if let (Some(id), Some(status)) = (
                c.get("id").and_then(|v| v.as_str()),
                c.get("kyc_status").and_then(|v| v.as_str()),
            ) {
                creator_kyc_map.insert(id.to_string(), status.to_string());
            }
        }
    }

    // 3. Payments (Last 60d) for Projected Earnings
    // Projected = (Payments Last 60d) / 2
    let payments_resp = state
        .pg
        .from("payments")
        .select("talent_earnings_cents, talent_id, paid_at")
        .eq("agency_id", &auth_user.id)
        .eq("status", "succeeded")
        .gte("paid_at", &sixty_days_ago)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let payments_text = payments_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let payments_list: Vec<serde_json::Value> =
        serde_json::from_str(&payments_text).unwrap_or(vec![]);

    let mut talent_earnings_60d: HashMap<String, i64> = HashMap::new();
    let mut talent_earnings_30d: HashMap<String, i64> = HashMap::new();

    for payment in payments_list {
        let amt = payment
            .get("talent_earnings_cents")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        let tid = payment
            .get("talent_id")
            .and_then(|v| v.as_str())
            .unwrap_or_default();
        let paid_at = payment
            .get("paid_at")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        if !tid.is_empty() {
            *talent_earnings_60d.entry(tid.to_string()).or_insert(0) += amt;
            if paid_at >= thirty_days_ago.as_str() {
                *talent_earnings_30d.entry(tid.to_string()).or_insert(0) += amt;
            }
        }
    }

    // 4. Bookings (Last 30d) for "Most Active"
    // Count confirmed/completed bookings in last 30d
    let bookings_resp = state
        .pg
        .from("bookings")
        .select("talent_id")
        .eq("agency_id", &auth_user.id)
        .in_("status", vec!["confirmed", "completed"])
        .gte("created_at", &thirty_days_ago)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let bookings_text = bookings_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let bookings_list: Vec<serde_json::Value> =
        serde_json::from_str(&bookings_text).unwrap_or(vec![]);

    let mut talent_bookings_count: HashMap<String, i64> = HashMap::new();
    for b in bookings_list {
        if let Some(tid) = b.get("talent_id").and_then(|v| v.as_str()) {
            *talent_bookings_count.entry(tid.to_string()).or_insert(0) += 1;
        }
    }

    let mut talent_metrics = Vec::new();

    for talent in talents.iter() {
        let tid = talent
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or_default();
        if tid.is_empty() {
            continue;
        }

        // 1. Realized Earnings (30d)
        let realized_30d = *talent_earnings_30d.get(tid).unwrap_or(&0);

        // 2. Projected Earnings (Avg of last 60d)
        let total_60d = *talent_earnings_60d.get(tid).unwrap_or(&0);
        let projected = total_60d / 2;

        // 3. Bookings Count (30d)
        let bookings_count = *talent_bookings_count.get(tid).unwrap_or(&0);

        // 4. Verification Logic
        let creator_id = talent.get("creator_id").and_then(|v| v.as_str());
        let is_verified_talent = talent
            .get("is_verified_talent")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
        let _is_verified = is_verified_talent || creator_id.is_some();

        // Fetch name and image
        let name = talent
            .get("full_legal_name")
            .and_then(|v| v.as_str())
            .or_else(|| talent.get("stage_name").and_then(|v| v.as_str()))
            .unwrap_or("Unknown")
            .to_string();
        let image_url = talent
            .get("profile_photo_url")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        let avg_value = if bookings_count > 0 {
            realized_30d / bookings_count
        } else {
            0
        };

        let format_currency = |cents: i64| format!("${:.0}", cents as f64 / 100.0);

        let followers_count = talent
            .get("instagram_followers")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        let engagement_rate = talent
            .get("engagement_rate")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);

        // Status = Active if talent has an ongoing booking in the last 30d
        let is_active = bookings_count > 0;

        talent_metrics.push(TalentPerformanceMetric {
            talent_id: uuid::Uuid::parse_str(tid).unwrap_or_default(),
            talent_name: name.clone(),
            earnings_30d_cents: realized_30d,
            earnings_30d_formatted: format_currency(realized_30d),
            projected_earnings_cents: projected,
            projected_earnings_formatted: format_currency(projected),
            campaigns_count_30d: bookings_count,
            avg_value_cents: avg_value,
            avg_value_formatted: format_currency(avg_value),
            status: if is_active {
                "Active".to_string()
            } else {
                "Inactive".to_string()
            },
            image_url: image_url.clone(),
            followers_count,
            engagement_rate,
        });
    }

    // Helper to format large numbers (e.g. 53400 -> 53,400)
    let format_large_num = |n: i64| {
        let s = n.to_string();
        let mut out = String::new();
        for (i, c) in s.chars().rev().enumerate() {
            if i > 0 && i % 3 == 0 {
                out.push(',');
            }
            out.push(c);
        }
        out.chars().rev().collect::<String>()
    };

    // Sort to determine Top Cards

    // Top Performer: Highest Earnings
    let top_performer_metric = talent_metrics.iter().max_by_key(|m| m.earnings_30d_cents);
    let top_performer = top_performer_metric.map(|m| TalentMetric {
        talent_id: m.talent_id,
        talent_name: m.talent_name.clone(),
        value: m.earnings_30d_formatted.clone(),
        sub_text: format!(
            "{} bookings • {:.1}% engagement",
            m.campaigns_count_30d, m.engagement_rate
        ),
        image_url: m.image_url.clone(),
    });

    // Most Active: Highest Bookings
    let most_active_metric = talent_metrics
        .iter()
        .max_by_key(|m| (m.campaigns_count_30d, m.earnings_30d_cents));
    let most_active = most_active_metric.map(|m| TalentMetric {
        talent_id: m.talent_id,
        talent_name: m.talent_name.clone(),
        value: format!("{} bookings", m.campaigns_count_30d),
        sub_text: format!(
            "{} earnings • {:.1}% engagement",
            m.earnings_30d_formatted, m.engagement_rate
        ),
        image_url: m.image_url.clone(),
    });

    // Highest Engagement: talent with the most instagram_followers
    let highest_engagement_metric = talent_metrics
        .iter()
        .max_by_key(|m| m.followers_count);
    let highest_engagement = highest_engagement_metric.map(|m| TalentMetric {
        talent_id: m.talent_id,
        talent_name: m.talent_name.clone(),
        value: format_large_num(m.followers_count),
        sub_text: format!(
            "{} earnings • {} bookings",
            m.earnings_30d_formatted, m.campaigns_count_30d
        ),
        image_url: m.image_url.clone(),
    });

    // Robust fallback diversity logic preserved
    let mut highest_engagement = highest_engagement;
    let mut most_active = most_active;

    if talent_metrics.len() >= 2 {
        if let (Some(tp), Some(ma)) = (&top_performer, &most_active) {
            if tp.talent_id == ma.talent_id {
                let current_lead_metric =
                    talent_metrics.iter().find(|m| m.talent_id == ma.talent_id);
                if current_lead_metric
                    .map(|m| m.campaigns_count_30d)
                    .unwrap_or(0)
                    == 0
                {
                    if let Some(alt) = talent_metrics.iter().find(|m| m.talent_id != tp.talent_id) {
                        most_active = Some(TalentMetric {
                            talent_id: alt.talent_id,
                            talent_name: alt.talent_name.clone(),
                            value: format!("{} bookings", alt.campaigns_count_30d),
                            sub_text: format!(
                                "{} earnings • {:.1}% engagement",
                                alt.earnings_30d_formatted, alt.engagement_rate
                            ),
                            image_url: alt.image_url.clone(),
                        });
                    }
                }
            }
        }
    }

    if talent_metrics.len() >= 3 {
        // Variety for Highest Engagement
        if let (Some(tp), Some(ma), Some(he)) = (&top_performer, &most_active, &highest_engagement)
        {
            if he.talent_id == tp.talent_id || he.talent_id == ma.talent_id {
                let current_lead = talent_metrics.iter().find(|m| m.talent_id == he.talent_id);
                if current_lead.map(|m| m.engagement_rate).unwrap_or(0.0) == 0.0 {
                    if let Some(alt) = talent_metrics
                        .iter()
                        .find(|m| m.talent_id != tp.talent_id && m.talent_id != ma.talent_id)
                    {
                        highest_engagement = Some(TalentMetric {
                            talent_id: alt.talent_id,
                            talent_name: alt.talent_name.clone(),
                            value: format!("{:.1}%", alt.engagement_rate),
                            sub_text: format!(
                                "{} followers • {} bookings",
                                format_large_num(alt.followers_count),
                                alt.campaigns_count_30d
                            ),
                            image_url: alt.image_url.clone(),
                        });
                    }
                }
            }
        }
    }

    Ok(Json(RosterInsightsResponse {
        highest_engagement,
        most_active,
        top_performer,
        talent_metrics,
    }))
}

#[derive(Debug, Serialize)]
pub struct RoyaltiesPayoutsResponse {
    pub accrued_this_month_cents: i64,
    pub accrued_this_month_formatted: String,
    pub pending_approval_cents: i64,
    pub pending_approval_formatted: String,
    pub paid_ytd_cents: i64,
    pub paid_ytd_formatted: String,
    pub agency_commission_ytd_cents: i64,
    pub agency_commission_ytd_formatted: String,
}

/// GET /api/agency/analytics/royalties
pub async fn get_royalties_payouts(
    State(state): State<AppState>,
    Query(_q): Query<AnalyticsModeQuery>, // Accepted for consistency
    auth_user: AuthUser,
) -> Result<Json<RoyaltiesPayoutsResponse>, (StatusCode, String)> {
    let agency_id = &auth_user.id;
    let now = Utc::now();

    // Calculate month boundaries
    let month_start = now.format("%Y-%m-01T00:00:00Z").to_string();
    let year_start = now.format("%Y-01-01T00:00:00Z").to_string();

    // 1. ACCRUED THIS MONTH
    // Sum talent_earnings_cents from payments where status='succeeded' and paid_at is this month
    let accrued_resp = state
        .pg
        .from("payments")
        .select("talent_earnings_cents")
        .eq("agency_id", agency_id)
        .eq("status", "succeeded")
        .gte("paid_at", &month_start)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let accrued_text = accrued_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let accrued_data: Vec<serde_json::Value> =
        serde_json::from_str(&accrued_text).unwrap_or(vec![]);

    let accrued_this_month_cents: i64 = accrued_data
        .iter()
        .filter_map(|p| p.get("talent_earnings_cents").and_then(|v| v.as_i64()))
        .sum();

    // 2. PENDING APPROVAL
    // Pending approval is computed from payment rows that are still pending.
    // We use gross_cents here because talent_earnings/agency_earnings may not be finalized until Stripe success.
    let pending_resp = state
        .pg
        .from("payments")
        .select("gross_cents")
        .eq("agency_id", agency_id)
        .eq("status", "pending")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let pending_text = pending_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let pending_data: Vec<serde_json::Value> =
        serde_json::from_str(&pending_text).unwrap_or(vec![]);

    let pending_approval_cents: i64 = pending_data
        .iter()
        .filter_map(|p| p.get("gross_cents").and_then(|v| v.as_i64()))
        .sum();

    // 3. PAID YTD (Year to Date)
    // Sum talent_earnings_cents from payments where status='succeeded' and paid_at >= year start
    let paid_ytd_resp = state
        .pg
        .from("payments")
        .select("talent_earnings_cents")
        .eq("agency_id", agency_id)
        .eq("status", "succeeded")
        .gte("paid_at", &year_start)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let paid_ytd_text = paid_ytd_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let paid_ytd_data: Vec<serde_json::Value> =
        serde_json::from_str(&paid_ytd_text).unwrap_or(vec![]);

    let paid_ytd_cents: i64 = paid_ytd_data
        .iter()
        .filter_map(|p| p.get("talent_earnings_cents").and_then(|v| v.as_i64()))
        .sum();

    // 4. AGENCY COMMISSION YTD
    // Sum agency_earnings_cents from payments where status='succeeded' and paid_at >= year start
    let commission_ytd_resp = state
        .pg
        .from("payments")
        .select("agency_earnings_cents")
        .eq("agency_id", agency_id)
        .eq("status", "succeeded")
        .gte("paid_at", &year_start)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let commission_ytd_text = commission_ytd_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let commission_ytd_data: Vec<serde_json::Value> =
        serde_json::from_str(&commission_ytd_text).unwrap_or(vec![]);

    let agency_commission_ytd_cents: i64 = commission_ytd_data
        .iter()
        .filter_map(|p| p.get("agency_earnings_cents").and_then(|v| v.as_i64()))
        .sum();

    // Format values
    let accrued_this_month_formatted = format_currency(accrued_this_month_cents);
    let pending_approval_formatted = format_currency(pending_approval_cents);
    let paid_ytd_formatted = format_currency(paid_ytd_cents);
    let agency_commission_ytd_formatted = format_currency(agency_commission_ytd_cents);

    Ok(Json(RoyaltiesPayoutsResponse {
        accrued_this_month_cents,
        accrued_this_month_formatted,
        pending_approval_cents,
        pending_approval_formatted,
        paid_ytd_cents,
        paid_ytd_formatted,
        agency_commission_ytd_cents,
        agency_commission_ytd_formatted,
    }))
}
/// GET /api/agency/analytics/expired-licenses
/// Returns approved licensing_requests whose `deadline` has already passed.
pub async fn get_expired_licenses(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let today = Utc::now().format("%Y-%m-%d").to_string();

    // Fetch expired approved requests
    let resp = state
        .pg
        .from("licensing_requests")
        .select("id, talent_id, deadline, licensee_brand_name, status")
        .eq("agency_id", &auth_user.id)
        .eq("status", "approved")
        .lt("deadline", &today)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let requests_text = resp.text().await.unwrap_or_else(|_| "[]".to_string());
    let requests: Vec<serde_json::Value> =
        serde_json::from_str(&requests_text).unwrap_or(vec![]);

    // Collect talent_ids for name/avatar lookup
    let talent_ids: Vec<String> = requests
        .iter()
        .filter_map(|r| r.get("talent_id").and_then(|v| v.as_str()))
        .map(|s| s.to_string())
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect();

    let mut talent_map: HashMap<String, serde_json::Value> = HashMap::new();
    if !talent_ids.is_empty() {
        let talents_resp = state
            .pg
            .from("agency_users")
            .select("id, full_legal_name, stage_name, profile_photo_url")
            .in_("id", talent_ids)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let talents_text = talents_resp
            .text()
            .await
            .unwrap_or_else(|_| "[]".to_string());
        let talents: Vec<serde_json::Value> =
            serde_json::from_str(&talents_text).unwrap_or(vec![]);

        for t in talents {
            if let Some(id) = t.get("id").and_then(|v| v.as_str()) {
                talent_map.insert(id.to_string(), t);
            }
        }
    }

    let result: Vec<serde_json::Value> = requests
        .into_iter()
        .map(|r| {
            let tid = r
                .get("talent_id")
                .and_then(|v| v.as_str())
                .unwrap_or_default();
            let talent = talent_map.get(tid);

            let talent_name = talent
                .and_then(|t| {
                    t.get("full_legal_name")
                        .and_then(|v| v.as_str())
                        .or_else(|| t.get("stage_name").and_then(|v| v.as_str()))
                })
                .unwrap_or("Unknown")
                .to_string();

            let talent_avatar = talent
                .and_then(|t| t.get("profile_photo_url").and_then(|v| v.as_str()))
                .map(|s| s.to_string());

            json!({
                "id": r.get("id").and_then(|v| v.as_str()).unwrap_or_default(),
                "talent_id": tid,
                "talent_name": talent_name,
                "talent_avatar": talent_avatar,
                "brand_name": r.get("licensee_brand_name").and_then(|v| v.as_str()).unwrap_or("—"),
                "deadline": r.get("deadline").and_then(|v| v.as_str()).unwrap_or(""),
                "status": r.get("status").and_then(|v| v.as_str()).unwrap_or("approved"),
            })
        })
        .collect();

    Ok(Json(json!(result)))
}
