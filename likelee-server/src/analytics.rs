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
        .select("id, status")
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
        let status = t.get("status").and_then(|v| v.as_str()).unwrap_or("");
        if status == "active" {
            consent_complete += 1;
        } else if status == "inactive" {
            consent_missing += 1;
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

    // 1. Fetch all agency talents
    // 1. Fetch all talents associated with this agency
    // We can reuse the query from get_roster roughly, but we need the IDs and photos.
    // Query: associated_users joined with agency_users?
    // Actually associated_users table has user_id and agency_id.
    // We need to fetch the user details.

    // Simpler: Fetch from agency_users where agency_id = ...
    // But wait, the schema says agency_users links agency and user.
    // Let's use the 'active_licenses' view logic or similar?
    // Let's check how 'get_roster' does it. It uses 'agency_users' joined with 'digitals'.
    // Here we just need basic info + calculate metrics.

    let query = state
        .pg
        .from("agency_users")
        .select("id, full_legal_name, stage_name, profile_photo_url, instagram_followers, engagement_rate") // Fetch added fields
        .eq("agency_id", &auth_user.id) // Use auth_user.id for agency_id
        .eq("role", "talent") // Ensure we only get talents
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

    let mut talent_metrics = Vec::new();

    for talent in talents.iter() {
        let _talent_id = talent
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or_default();
        let _talent_name = talent
            .get("full_legal_name")
            .and_then(|v| v.as_str())
            .or_else(|| talent.get("stage_name").and_then(|v| v.as_str()))
            .unwrap_or("Unknown")
            .to_string();
        let _image_url = talent
            .get("profile_photo_url")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        // 2. Earnings (30d) - from payments table linked to campaigns for this talent
        // Query: payments combined with campaigns is hard in PostgREST simple client without views/RPC.
        // Instead, we'll query payments directly if they have talent_id or we filter in memory?
        // The payments table usually links to a campaign. A campaign links to a talent.
        // Let's assume payments has a `campaign_id`.
        // To do this efficiently, we should probably fetch ALL payments for the agency in the last 30d and aggregate in memory.
        // Fetching per talent in a loop is N+1 queries.
        // Optimization: Fetch all agency payments and campaigns for last 30d, then map to talents.

        // This initial implementation inside the loop is fine for small rosters but inefficient.
        // Let's optimize by fetching everything first.
    }

    // Optimized Fetching strategy:

    // A. Fetch all payments for agency in last 30d
    let payments_resp = state
        .pg
        .from("payments")
        .select("gross_cents, talent_earnings_cents, campaign_id, talent_id") // Fetch talent_earnings_cents and talent_id
        .eq("agency_id", &auth_user.id)
        .eq("status", "succeeded")
        .gte("paid_at", &thirty_days_ago)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let payments_text = payments_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let payments_list: Vec<serde_json::Value> =
        serde_json::from_str(&payments_text).unwrap_or(vec![]);

    // Map campaign_id -> total_earnings (for agency stats if needed, but here mostly for talent)
    // Map talent_id -> realized_earnings_30d
    let mut talent_realized_earnings: HashMap<String, i64> = HashMap::new();

    for payment in payments_list {
        let amt = payment
            .get("talent_earnings_cents")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        let tid = payment
            .get("talent_id")
            .and_then(|v| v.as_str())
            .unwrap_or_default();
        if !tid.is_empty() {
            *talent_realized_earnings.entry(tid.to_string()).or_insert(0) += amt;
        }
    }

    // B. Fetch all campaigns for agency in last 30d (or active)
    // We need campaigns to link earnings to talent, count campaigns, and calculate projected earnings.
    // For "Active" status, we need currently active campaigns.
    // For "Projected", we need pending campaigns.

    let campaigns_resp = state
        .pg
        .from("campaigns")
        .select("id, talent_id, status, talent_earnings_cents, start_at, end_at")
        .eq("agency_id", &auth_user.id)
        .execute() // Fetch all to filter in memory for complex dates/status logic, or optimize query
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let campaigns_text = campaigns_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let campaigns_list: Vec<serde_json::Value> =
        serde_json::from_str(&campaigns_text).unwrap_or(vec![]);

    // Aggregate metrics per talent
    // Map talent_id -> (projected_earnings, campaign_count, is_active)
    let mut talent_campaign_stats: HashMap<String, (i64, i64, bool)> = HashMap::new();

    for campaign in campaigns_list {
        let tid = match campaign.get("talent_id").and_then(|v| v.as_str()) {
            Some(id) => id.to_string(),
            None => continue,
        };

        let status = campaign
            .get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let start_at = campaign
            .get("start_at")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let end_at = campaign
            .get("end_at")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        let stat_entry = talent_campaign_stats.entry(tid).or_insert((0, 0, false));

        // Projected Earnings (Pending)
        if status == "Pending" {
            let projected = campaign
                .get("talent_earnings_cents")
                .and_then(|v| v.as_i64())
                .unwrap_or(0);
            stat_entry.0 += projected;
        }

        // Campaign Count (Active in last 30d)
        if !end_at.is_empty() && end_at >= thirty_days_ago.as_str() {
            stat_entry.1 += 1;
        }

        // Status (Active)
        let now_str = now.to_rfc3339();
        if (status == "Confirmed" || status == "active")
            && (start_at.is_empty() || start_at <= now_str.as_str())
            && (end_at.is_empty() || end_at >= now_str.as_str())
        {
            stat_entry.2 = true;
        }
    }

    for talent in talents.iter() {
        let tid = talent
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or_default();
        if tid.is_empty() {
            continue;
        }

        // 1. Realized Earnings (from payments)
        let realized = *talent_realized_earnings.get(tid).unwrap_or(&0);

        // 2. Stats from campaigns
        let (projected, count, is_active) =
            *talent_campaign_stats.get(tid).unwrap_or(&(0, 0, false));
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

        let avg_value = if count > 0 { realized / count } else { 0 };

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
            earnings_30d_cents: realized,
            earnings_30d_formatted: format_currency(realized),
            projected_earnings_cents: projected,
            projected_earnings_formatted: format_currency(projected),
            campaigns_count_30d: count,
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
            "{} campaigns • {:.1}% engagement",
            m.campaigns_count_30d, m.engagement_rate
        ),
        image_url: m.image_url.clone(),
    });

    // Most Active: Highest Uses/Campaigns
    let most_active_metric = talent_metrics
        .iter()
        .max_by_key(|m| (m.campaigns_count_30d, m.earnings_30d_cents));
    let most_active = most_active_metric.map(|m| TalentMetric {
        talent_id: m.talent_id,
        talent_name: m.talent_name.clone(),
        value: format!("{} uses", m.campaigns_count_30d),
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
            "{} followers • {} campaigns",
            format_large_num(m.followers_count),
            m.campaigns_count_30d
        ),
        image_url: m.image_url.clone(),
    });

    // ROBUST FALLBACK DIVERSITY:
    // If the metrics are all 0, ensure we show DIFFERENT talents if available.
    // This overrides the simple max() above if the results would be repetitive and roster allows diversity.
    let mut highest_engagement = highest_engagement;
    let mut most_active = most_active;

    if talent_metrics.len() >= 2 {
        // If Most Active and Top Performer are same and have 0 activity record, pick another for variety
        if let (Some(tp), Some(ma)) = (&top_performer, &most_active) {
            if tp.talent_id == ma.talent_id {
                let current_lead_metric =
                    talent_metrics.iter().find(|m| m.talent_id == ma.talent_id);
                if current_lead_metric
                    .map(|m| m.campaigns_count_30d)
                    .unwrap_or(0)
                    == 0
                {
                    // Try to find a DIFFERENT talent for variety
                    if let Some(alt) = talent_metrics.iter().find(|m| m.talent_id != tp.talent_id) {
                        most_active = Some(TalentMetric {
                            talent_id: alt.talent_id,
                            talent_name: alt.talent_name.clone(),
                            value: format!("{} uses", alt.campaigns_count_30d),
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
        // Variety for Highest Engagement if Leader and Others are same and have 0 record
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
                                "{} followers • {} campaigns",
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
