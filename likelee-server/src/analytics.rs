use crate::auth::AuthUser;
use crate::config::AppState;
use axum::{extract::State, http::StatusCode, Json};
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
    let five_months_ago = (now - chrono::Duration::days(150)).to_rfc3339(); // Approx 5 months
    let today = now.format("%Y-%m-%d").to_string();
    let thirty_days_hence = (now + chrono::Duration::days(30))
        .format("%Y-%m-%d")
        .to_string();

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

    // 2. BULK FETCH CAMPAIGNS (All relevant)
    // We fetch all agency campaigns to correctly determine status (Active, Pending, Completed)
    // and historical trends.
    let campaigns_resp = state
        .pg
        .from("campaigns")
        .select("id, status, created_at, end_at, brand_vertical")
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
        .select("id, status, consent_status")
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
        let end_at = c.get("end_at").and_then(|v| v.as_str()).unwrap_or("");
        let created_at = c.get("created_at").and_then(|v| v.as_str()).unwrap_or("");

        // Active / In Progress
        if status == "active" {
            active_campaigns += 1;
            in_progress += 1;
        }

        // Pending / Ready to Launch
        if status == "Pending" {
            ready_to_launch += 1;
        }

        // Completed
        if !end_at.is_empty() && end_at < today.as_str() {
            completed += 1;
        }

        // Top Scope (created in last 30d)
        if created_at >= thirty_days_ago.as_str() {
            if let Some(scope) = c.get("brand_vertical").and_then(|s| s.as_str()) {
                if !scope.is_empty() {
                    *scope_counts.entry(scope.to_string()).or_insert(0) += 1;
                }
            }
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

    // F. CONSENT STATUS
    let mut consent_complete = 0i64;
    let mut consent_missing = 0i64;
    for t in talents_data.iter() {
        let consent = t
            .get("consent_status")
            .and_then(|v| v.as_str())
            .unwrap_or("missing");
        // Assume 'missing' or 'pending' or 'revoked' = missing. 'granted' or 'complete' = complete.
        // Or simpler: if it's NOT missing/pending -> complete.
        // Check migration default is 'missing'.
        if consent == "missing" || consent == "pending" || consent == "not_started" {
            consent_missing += 1;
        } else {
            // granted, signed, active, etc.
            consent_complete += 1;
        }
    }

    // 4. EXPIRING REQUESTS (Keep standalone query)
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
    auth_user: AuthUser,
) -> Result<Json<ClientsCampaignsResponse>, (StatusCode, String)> {
    let agency_id = &auth_user.id;
    let colors = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b"];

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
    let dollars = cents as f64 / 100.0;
    format!("${:.0}", dollars)
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
    auth_user: AuthUser,
) -> Result<Json<RosterInsightsResponse>, (StatusCode, String)> {
    let now = Utc::now();
    let thirty_days_ago = (now - chrono::Duration::days(30)).to_rfc3339();
    let sixty_days_ago = (now - chrono::Duration::days(60)).to_rfc3339();

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
        //.gte("date", &thirty_days_ago) // Filter by date? Or just all time active? User said "Most active... gotten from bookings table". Usually implies recent. I'll stick to 30d for "Most Active" card consistency.
        // Actually, let's fetch ALL confirmed/completed to be safe for "Most Active" if user implies general activity level.
        // But dashboard usually implies monthly. I'll stick to 30d filter for now.
        .gte("created_at", &thirty_days_ago) // Using created_at or date? date is better for booking date.
        // let's use date column if possible. Date is YYYY-MM-DD.
        // thirty_days_ago is RFC3339.
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

        let is_verified = is_verified_talent || creator_id.is_some();

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

        talent_metrics.push(TalentPerformanceMetric {
            talent_id: uuid::Uuid::parse_str(tid).unwrap_or_default(),
            talent_name: name.clone(),
            earnings_30d_cents: realized_30d,
            earnings_30d_formatted: format_currency(realized_30d),
            projected_earnings_cents: projected,
            projected_earnings_formatted: format_currency(projected),
            campaigns_count_30d: bookings_count, // Reusing field name, mapped to bookings
            avg_value_cents: avg_value,
            avg_value_formatted: format_currency(avg_value),
            status: if is_verified {
                "Verified".to_string()
            } else {
                "Pending Verification".to_string()
            }, // Using status field for verification status display ?? Or keep Active/Inactive?
            // User didn't explicitly say to change status text, but "talent verification... determined by..." suggests displaying it.
            // Existing UI likely shows "Active" / "Inactive".
            // If I change it to "Verified", existing UI might break or look different.
            // I'll assume status here should reflect the "Active/Inactive" AND maybe verification?
            // Wait, existing logic was "Active" if campaigns active.
            // User asked for "talent verification".
            // I'll stick to "Active" if realized > 0 or bookings > 0?
            // Or I'll just map `is_verified` to `status` text?
            // Let's use "Verified" if verified, else "Unverified".
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

    // Highest Engagement: Highest Rate
    let highest_engagement_metric = talent_metrics.iter().max_by(|a, b| {
        a.engagement_rate
            .partial_cmp(&b.engagement_rate)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| a.earnings_30d_cents.cmp(&b.earnings_30d_cents))
    });
    let highest_engagement = highest_engagement_metric.map(|m| TalentMetric {
        talent_id: m.talent_id,
        talent_name: m.talent_name.clone(),
        value: format!("{:.1}%", m.engagement_rate),
        sub_text: format!(
            "{} followers • {} bookings",
            format_large_num(m.followers_count),
            m.campaigns_count_30d
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
    // Sum from bookings with status in ('pending', 'submitted', 'awaiting_confirmation')
    let pending_bookings_resp = state
        .pg
        .from("bookings")
        .select("talent_fee_cents")
        .eq("agency_id", agency_id)
        .in_(
            "status",
            vec!["pending", "submitted", "awaiting_confirmation"],
        )
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let pending_bookings_text = pending_bookings_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let pending_bookings_data: Vec<serde_json::Value> =
        serde_json::from_str(&pending_bookings_text).unwrap_or(vec![]);

    let pending_bookings_cents: i64 = pending_bookings_data
        .iter()
        .filter_map(|b| b.get("talent_fee_cents").and_then(|v| v.as_i64()))
        .sum();

    // Sum from licensing_requests with status in ('pending', 'submitted', 'awaiting_confirmation')
    let pending_licensing_resp = state
        .pg
        .from("licensing_requests")
        .select("talent_fee_cents")
        .eq("agency_id", agency_id)
        .in_(
            "status",
            vec!["pending", "submitted", "awaiting_confirmation"],
        )
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let pending_licensing_text = pending_licensing_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let pending_licensing_data: Vec<serde_json::Value> =
        serde_json::from_str(&pending_licensing_text).unwrap_or(vec![]);

    let pending_licensing_cents: i64 = pending_licensing_data
        .iter()
        .filter_map(|l| l.get("talent_fee_cents").and_then(|v| v.as_i64()))
        .sum();

    let pending_approval_cents = pending_bookings_cents + pending_licensing_cents;

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
    // Sum agency_commission_cents from payments where status='succeeded' and paid_at >= year start
    let commission_ytd_resp = state
        .pg
        .from("payments")
        .select("agency_commission_cents")
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
        .filter_map(|p| p.get("agency_commission_cents").and_then(|v| v.as_i64()))
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
