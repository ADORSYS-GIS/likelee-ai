use std::collections::{HashMap, HashSet};
use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use serde::Serialize;
use serde_json::json;
use chrono::Datelike;
use crate::config::AppState;
use crate::auth::AuthUser;


#[derive(Debug, Serialize)]
pub struct DashboardOverview {
    pub roster_health: RosterHealth,
    pub monthly_revenue: MonthlyRevenue,
    pub pending_actions: PendingActions,
    pub platform_ranking: PlatformRanking,
}

#[derive(Debug, Serialize)]
pub struct RosterHealth {
    pub active_count: i64,
    pub total_count: i64,
    pub percentage: f64,
}

#[derive(Debug, Serialize)]
pub struct MonthlyRevenue {
    pub amount_cents: i64,
    pub amount_formatted: String,
    pub growth_percentage: f64,
}

#[derive(Debug, Serialize)]
pub struct PendingActions {
    pub licensing_requests: i64,
    pub expiring_licenses: i64,
    pub compliance_issues: i64,
}

#[derive(Debug, Serialize)]
pub struct PlatformRanking {
    pub rank_text: String,
    pub rank_description: String,
}

#[derive(Debug, Serialize)]
pub struct TalentPerformanceSummary {
    pub top_revenue_generators: Vec<TopTalent>,
    pub actively_earning: Vec<ActiveTalent>,
    pub new_talent_performance: Vec<NewTalent>,
}

#[derive(Debug, Serialize)]
pub struct TopTalent {
    pub id: String,
    pub name: String,
    pub photo_url: Option<String>,
    pub earnings_cents: i64,
    pub earnings_formatted: String,
}

#[derive(Debug, Serialize)]
pub struct ActiveTalent {
    pub id: String,
    pub name: String,
    pub photo_url: Option<String>,
    pub recent_payment_cents: i64,
    pub payment_formatted: String,
    pub payment_date: String,
}

#[derive(Debug, Serialize)]
pub struct NewTalent {
    pub id: String,
    pub name: String,
    pub photo_url: Option<String>,
    pub days_since_added: i64,
    pub avg_days_to_first_booking: Option<f64>,
    pub status: String,
}

#[derive(Debug, Serialize)]
pub struct RevenueBreakdown {
    pub by_campaign_type: Vec<BreakdownItem>,
    pub by_brand_vertical: Vec<BreakdownItem>,
    pub by_region: Vec<BreakdownItem>,
}

#[derive(Debug, Serialize)]
pub struct BreakdownItem {
    pub name: String,
    pub percentage: f64,
    pub count: i64,
}

#[derive(Debug, Serialize)]
pub struct LicensingPipeline {
    pub pending_approval: i64,
    pub expiring_soon: i64,
    pub active: i64,
    pub total_this_month: i64,
}

#[derive(Debug, Serialize)]
pub struct ActivityFeed {
    pub activities: Vec<ActivityItem>,
}

#[derive(Debug, Serialize)]
pub struct ActivityItem {
    pub id: String,
    pub type_name: String,
    pub title: String,
    pub subtitle: String,
    pub timestamp: String,
    pub relative_time: String,
}


/// GET /api/agency/dashboard/overview
pub async fn get_dashboard_overview(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<DashboardOverview>, (StatusCode, String)> {
    let agency_id = &auth_user.id;

    // Roster Health
    let roster_health = get_roster_health(&state, agency_id).await?;

    // Monthly Revenue
    let monthly_revenue = get_monthly_revenue(&state, agency_id).await?;

    // Pending Actions
    let pending_actions = get_pending_actions(&state, agency_id).await?;

    // Platform Ranking (mock for now)
    let platform_ranking = PlatformRanking {
        rank_text: "top 15%".to_string(),
        rank_description: "Top performer".to_string(),
    };

    Ok(Json(DashboardOverview {
        roster_health,
        monthly_revenue,
        pending_actions,
        platform_ranking,
    }))
}

/// GET /api/agency/dashboard/talent-performance
pub async fn get_talent_performance(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<TalentPerformanceSummary>, (StatusCode, String)> {
    let agency_id = &auth_user.id;

    let top_revenue_generators = get_top_revenue_generators(&state, agency_id).await?;
    let actively_earning = get_actively_earning(&state, agency_id).await?;
    let new_talent_performance = get_new_talent_performance(&state, agency_id).await?;

    Ok(Json(TalentPerformanceSummary {
        top_revenue_generators,
        actively_earning,
        new_talent_performance,
    }))
}

/// GET /api/agency/dashboard/revenue-breakdown
pub async fn get_revenue_breakdown(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<RevenueBreakdown>, (StatusCode, String)> {
    let agency_id = &auth_user.id;

    let by_campaign_type = get_breakdown_by_campaign_type(&state, agency_id).await?;
    let by_brand_vertical = get_breakdown_by_brand_vertical(&state, agency_id).await?;
    let by_region = get_breakdown_by_region(&state, agency_id).await?;

    Ok(Json(RevenueBreakdown {
        by_campaign_type,
        by_brand_vertical,
        by_region,
    }))
}

/// GET /api/agency/dashboard/licensing-pipeline
pub async fn get_licensing_pipeline(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<LicensingPipeline>, (StatusCode, String)> {
    let agency_id = &auth_user.id;

    // 1. Pending Approval
    let pending_resp = state
        .pg
        .from("licensing_requests")
        .select("id")
        .eq("agency_id", agency_id)
        .eq("status", "pending")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    
    let pending_text = pending_resp.text().await.unwrap_or_else(|_| "[]".to_string());
    let pending_data: serde_json::Value = serde_json::from_str(&pending_text).unwrap_or(json!([]));
    let pending_approval = pending_data.as_array().map(|a| a.len() as i64).unwrap_or(0);

    // 2. Counts from brand_licenses
    let now = chrono::Utc::now();
    let month_start = format!("{}-{:02}-01", now.year(), now.month());
    let thirty_days_hence = (now + chrono::Duration::days(30)).to_rfc3339();

    // Expiring Soon
    let expiring_resp = state.pg.from("brand_licenses")
        .select("id")
        .eq("agency_id", agency_id)
        .eq("status", "active")
        .lte("end_at", &thirty_days_hence)
        .gte("end_at", &now.to_rfc3339())
        .execute().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let expiring_text = expiring_resp.text().await.unwrap_or_else(|_| "[]".to_string());
    let expiring_data: serde_json::Value = serde_json::from_str(&expiring_text).unwrap_or(json!([]));
    let expiring_soon = expiring_data.as_array().map(|a| a.len() as i64).unwrap_or(0);

    // Active
    let active_resp = state.pg.from("brand_licenses")
        .select("id")
        .eq("agency_id", agency_id)
        .eq("status", "active")
        .gt("end_at", &now.to_rfc3339())
        .execute().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let active_text = active_resp.text().await.unwrap_or_else(|_| "[]".to_string());
    let active_data: serde_json::Value = serde_json::from_str(&active_text).unwrap_or(json!([]));
    let active = active_data.as_array().map(|a| a.len() as i64).unwrap_or(0);

    // Total This Month (New requests + licenses created this month)
    let total_req_month_resp = state.pg.from("licensing_requests")
        .select("id")
        .eq("agency_id", agency_id)
        .gte("created_at", &month_start)
        .execute().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let total_req_month_data: serde_json::Value = serde_json::from_str(&total_req_month_resp.text().await.unwrap_or_else(|_| "[]".to_string())).unwrap_or(json!([]));
    let total_requests_this_month = total_req_month_data.as_array().map(|a| a.len() as i64).unwrap_or(0);

    let total_lic_month_resp = state.pg.from("brand_licenses")
        .select("id")
        .eq("agency_id", agency_id)
        .gte("created_at", &month_start)
        .execute().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let total_lic_month_data: serde_json::Value = serde_json::from_str(&total_lic_month_resp.text().await.unwrap_or_else(|_| "[]".to_string())).unwrap_or(json!([]));
    let total_licenses_this_month = total_lic_month_data.as_array().map(|a| a.len() as i64).unwrap_or(0);

    let total_this_month = total_requests_this_month + total_licenses_this_month;

    Ok(Json(LicensingPipeline {
        pending_approval,
        expiring_soon,
        active,
        total_this_month,
    }))
}

/// GET /api/agency/dashboard/recent-activity
pub async fn get_recent_activity(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<ActivityFeed>, (StatusCode, String)> {
    let agency_id = &auth_user.id;

    let resp = state
        .pg
        .from("activity_events")
        .select("id,type,title,subtitle,created_at")
        .eq("agency_id", agency_id)
        .order("created_at.desc")
        .limit(10)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp.text().await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    
    let data: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let empty_vec = vec![];
    let activities: Vec<ActivityItem> = data
        .as_array()
        .unwrap_or(&empty_vec)
        .iter()
        .filter_map(|item| {
            Some(ActivityItem {
                id: item.get("id")?.as_str()?.to_string(),
                type_name: item.get("type")?.as_str()?.to_string(),
                title: item.get("title")?.as_str()?.to_string(),
                subtitle: item.get("subtitle")?.as_str()?.to_string(),
                timestamp: item.get("created_at")?.as_str()?.to_string(),
                relative_time: "Recently".to_string(), // Simplified for now
            })
        })
        .collect();

    Ok(Json(ActivityFeed { activities }))
}


async fn get_roster_health(
    state: &AppState,
    agency_id: &str,
) -> Result<RosterHealth, (StatusCode, String)> {
    // Get all talents for this agency
    let resp = state
        .pg
        .from("agency_users")
        .select("status")
        .eq("agency_id", agency_id)
        .eq("role", "talent")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp.text().await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    
    let data: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let empty_vec = vec![];
    let talents = data.as_array().unwrap_or(&empty_vec);
    let total_count = talents.len() as i64;
    let active_count = talents
        .iter()
        .filter(|t| t.get("status").and_then(|s| s.as_str()) == Some("active"))
        .count() as i64;

    let percentage = if total_count > 0 {
        (active_count as f64 / total_count as f64) * 100.0
    } else {
        0.0
    };

    Ok(RosterHealth {
        active_count,
        total_count,
        percentage,
    })
}

async fn get_monthly_revenue(
    state: &AppState,
    agency_id: &str,
) -> Result<MonthlyRevenue, (StatusCode, String)> {
    let now = chrono::Utc::now();
    let month_start = format!("{}-{:02}-01", now.year(), now.month());
    
    // Get current month revenue
    let resp = state
        .pg
        .from("payments")
        .select("talent_earnings_cents")
        .eq("agency_id", agency_id)
        .eq("status", "succeeded")
        .gte("paid_at", &month_start)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp.text().await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let data: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let empty_vec = vec![];
    let payments = data.as_array().unwrap_or(&empty_vec);
    let amount_cents: i64 = payments
        .iter()
        .filter_map(|p| p.get("talent_earnings_cents")?.as_i64())
        .sum();

    // Get last month revenue for growth calculation
    let last_month_date = if now.month() == 1 {
        chrono::NaiveDate::from_ymd_opt(now.year() - 1, 12, 1).unwrap()
    } else {
        chrono::NaiveDate::from_ymd_opt(now.year(), now.month() - 1, 1).unwrap()
    };
    let last_month_start = last_month_date.format("%Y-%m-01").to_string();
    let last_month_end = month_start.clone();

    let last_resp = state
        .pg
        .from("payments")
        .select("talent_earnings_cents")
        .eq("agency_id", agency_id)
        .eq("status", "succeeded")
        .gte("paid_at", &last_month_start)
        .lt("paid_at", &last_month_end)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let last_text = last_resp.text().await.unwrap_or_else(|_| "[]".to_string());
    let last_data: serde_json::Value = serde_json::from_str(&last_text).unwrap_or(serde_json::Value::Array(vec![]));
    let last_payments = last_data.as_array().unwrap_or(&empty_vec);
    let last_amount_cents: i64 = last_payments
        .iter()
        .filter_map(|p| p.get("talent_earnings_cents")?.as_i64())
        .sum();

    let growth_percentage = if last_amount_cents > 0 {
        ((amount_cents - last_amount_cents) as f64 / last_amount_cents as f64) * 100.0
    } else if amount_cents > 0 {
        100.0
    } else {
        0.0
    };

    let amount_formatted = format!("${:.1}K", amount_cents as f64 / 100_000.0);

    Ok(MonthlyRevenue {
        amount_cents,
        amount_formatted,
        growth_percentage: (growth_percentage * 10.0).round() / 10.0,
    })
}

async fn get_pending_actions(
    state: &AppState,
    agency_id: &str,
) -> Result<PendingActions, (StatusCode, String)> {
    // 1. Get licensing requests count
    let resp = state
        .pg
        .from("licensing_requests")
        .select("id")
        .eq("agency_id", agency_id)
        .eq("status", "pending")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp.text().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let data: serde_json::Value = serde_json::from_str(&text).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let licensing_requests = data.as_array().map(|a| a.len() as i64).unwrap_or(0);

    // 2. Get expiring licenses count
    let now = chrono::Utc::now();
    let thirty_days_hence = (now + chrono::Duration::days(30)).to_rfc3339();
    
    let licenses_resp = state
        .pg
        .from("brand_licenses")
        .select("id")
        .eq("agency_id", agency_id)
        .eq("status", "active")
        .lte("end_at", &thirty_days_hence)
        .gte("end_at", &now.to_rfc3339())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let licenses_text = licenses_resp.text().await.unwrap_or_else(|_| "[]".to_string());
    let licenses_data: serde_json::Value = serde_json::from_str(&licenses_text).unwrap_or(json!([]));
    let expiring_licenses = licenses_data.as_array().map(|a| a.len() as i64).unwrap_or(0);

    // 3. Mock compliance issues
    let compliance_issues = 0i64;

    Ok(PendingActions {
        licensing_requests,
        expiring_licenses,
        compliance_issues,
    })
}

async fn get_top_revenue_generators(
    state: &AppState,
    agency_id: &str,
) -> Result<Vec<TopTalent>, (StatusCode, String)> {
    let now = chrono::Utc::now();
    let month_start = format!("{}-{:02}-01", now.year(), now.month());

    // Fetch payments for the month with talent info
    let resp = state
        .pg
        .from("payments")
        .select("talent_id, talent_earnings_cents, agency_users(stage_name, profile_photo_url)")
        .eq("agency_id", agency_id)
        .eq("status", "succeeded")
        .gte("paid_at", &month_start)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp.text().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let data: serde_json::Value = serde_json::from_str(&text).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let payments = data.as_array().ok_or((StatusCode::INTERNAL_SERVER_ERROR, "Invalid payments data".to_string()))?;

    let mut talent_map: HashMap<String, (i64, String, Option<String>)> = HashMap::new();

    for p in payments {
        let talent_id = p.get("talent_id").and_then(|v| v.as_str()).unwrap_or("unknown").to_string();
        let cents = p.get("talent_earnings_cents").and_then(|v| v.as_i64()).unwrap_or(0);
        let talent = p.get("agency_users");
        let name = talent.and_then(|v| v.get("stage_name")).and_then(|v| v.as_str()).unwrap_or("Unknown").to_string();
        let photo = talent.and_then(|v| v.get("profile_photo_url")).and_then(|v| v.as_str()).map(|s| s.to_string());

        let entry = talent_map.entry(talent_id).or_insert((0, name, photo));
        entry.0 += cents;
    }

    let mut top_talents: Vec<TopTalent> = talent_map
        .into_iter()
        .map(|(id, (cents, name, photo))| TopTalent {
            id,
            name,
            photo_url: photo,
            earnings_cents: cents,
            earnings_formatted: format!("${:.2}K", cents as f64 / 100_000.0),
        })
        .collect();

    top_talents.truncate(3);
    Ok(top_talents)
}

async fn get_actively_earning(
    state: &AppState,
    agency_id: &str,
) -> Result<Vec<ActiveTalent>, (StatusCode, String)> {
    let now = chrono::Utc::now();
    let thirty_days_ago = (now - chrono::Duration::days(30)).to_rfc3339();

    let resp = state
        .pg
        .from("payments")
        .select("talent_id, talent_earnings_cents, paid_at, agency_users(stage_name, profile_photo_url)")
        .eq("agency_id", agency_id)
        .eq("status", "succeeded")
        .gte("paid_at", &thirty_days_ago)
        .order("paid_at.desc")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp.text().await.unwrap_or_else(|_| "[]".to_string());
    let data: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!([]));
    let empty_vec = vec![];
    let payments = data.as_array().unwrap_or(&empty_vec);

    let mut seen_talents = HashSet::new();
    let mut active_talents = vec![];

    for p in payments {
        let talent_id = p.get("talent_id").and_then(|v| v.as_str()).unwrap_or("unknown").to_string();
        if seen_talents.contains(&talent_id) {
            continue;
        }

        let cents = p.get("talent_earnings_cents").and_then(|v| v.as_i64()).unwrap_or(0);
        let paid_at = p.get("paid_at").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let talent = p.get("agency_users");
        let name = talent.and_then(|v| v.get("stage_name")).and_then(|v| v.as_str()).unwrap_or("Unknown").to_string();
        let photo = talent.and_then(|v| v.get("profile_photo_url")).and_then(|v| v.as_str()).map(|s| s.to_string());

        active_talents.push(ActiveTalent {
            id: talent_id.clone(),
            name,
            photo_url: photo,
            recent_payment_cents: cents,
            payment_formatted: format!("${:.2}", cents as f64 / 100.0),
            payment_date: paid_at,
        });

        seen_talents.insert(talent_id);
    }

    active_talents.truncate(3);
    Ok(active_talents)
}

async fn get_new_talent_performance(
    state: &AppState,
    agency_id: &str,
) -> Result<Vec<NewTalent>, (StatusCode, String)> {
    // Get talents added in last 30 days
    let thirty_days_ago = chrono::Utc::now() - chrono::Duration::days(30);
    let date_filter = thirty_days_ago.to_rfc3339();

    let resp = state
        .pg
        .from("agency_users")
        .select("id, created_at, stage_name, profile_photo_url, status")
        .eq("agency_id", agency_id)
        .eq("role", "talent")
        .gte("created_at", &date_filter)
        .order("created_at.desc")
        .limit(3)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp.text().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let data: serde_json::Value = serde_json::from_str(&text).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut talents = vec![];
    if let Some(arr) = data.as_array() {
        for item in arr {
            let id = item.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let created_at_str = item.get("created_at").and_then(|v| v.as_str()).unwrap_or("");
            let created_date = chrono::DateTime::parse_from_rfc3339(created_at_str).ok().map(|dt| dt.with_timezone(&chrono::Utc)).unwrap_or(chrono::Utc::now());
            let days_since_added = (chrono::Utc::now() - created_date).num_days();

            let name = item.get("stage_name").and_then(|v| v.as_str()).unwrap_or("Unknown").to_string();
            let photo = item.get("profile_photo_url").and_then(|v| v.as_str()).map(|s| s.to_string());
            let status = item.get("status").and_then(|v| v.as_str()).unwrap_or("pending").to_uppercase();

            // Calculate REAL avg time to first booking for this specific talent
            // We find their earliest succeeded payment
            let pay_resp = state.pg.from("payments")
                .select("paid_at")
                .eq("talent_id", &id)
                .eq("status", "succeeded")
                .order("paid_at.asc")
                .limit(1)
                .execute().await;

            let avg_days = if let Ok(pr) = pay_resp {
                let p_text = pr.text().await.unwrap_or_else(|_| "[]".to_string());
                let p_data: serde_json::Value = serde_json::from_str(&p_text).unwrap_or(json!([]));
                if let Some(first_pay) = p_data.as_array().and_then(|a| a.get(0)) {
                    let paid_at_str = first_pay.get("paid_at").and_then(|v| v.as_str()).unwrap_or("");
                    let paid_date = chrono::DateTime::parse_from_rfc3339(paid_at_str).ok().map(|dt| dt.with_timezone(&chrono::Utc));
                    paid_date.map(|pd| {
                        let diff = (pd - created_date).num_days();
                        if diff < 0 { 0.0 } else { diff as f64 }
                    }).unwrap_or(0.0)
                } else {
                    0.0
                }
            } else {
                0.0
            };

            talents.push(NewTalent {
                id,
                name,
                photo_url: photo,
                days_since_added,
                avg_days_to_first_booking: Some(avg_days),
                status,
            });
        }
    }

    Ok(talents)
}

async fn get_breakdown_by_campaign_type(
    state: &AppState,
    agency_id: &str,
) -> Result<Vec<BreakdownItem>, (StatusCode, String)> {
    let now = chrono::Utc::now();
    let month_start = format!("{}-{:02}-01", now.year(), now.month());

    let resp = state
        .pg
        .from("payments")
        .select("talent_earnings_cents, campaigns!inner(campaign_type)")
        .eq("agency_id", agency_id)
        .eq("status", "succeeded")
        .gte("paid_at", &month_start)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp.text().await.unwrap_or_else(|_| "[]".to_string());
    let data: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!([]));
    let empty_vec = vec![];
    let payments = data.as_array().unwrap_or(&empty_vec);

    let mut map: HashMap<String, (i64, i64)> = HashMap::new();
    let mut total_cents = 0i64;

    for p in payments {
        let campaign_type = p.get("campaigns").and_then(|v| v.get("campaign_type")).and_then(|v| v.as_str()).unwrap_or("Other").to_string();
        let cents = p.get("talent_earnings_cents").and_then(|v| v.as_i64()).unwrap_or(0);
        let entry = map.entry(campaign_type).or_insert((0, 0));
        entry.0 += cents;
        entry.1 += 1;
        total_cents += cents;
    }

    Ok(map.into_iter().map(|(name, (cents, count))| {
        let percentage = if total_cents > 0 { (cents as f64 / total_cents as f64) * 100.0 } else { 0.0 };
        BreakdownItem { name, percentage: (percentage * 10.0).round() / 10.0, count }
    }).collect())
}

async fn get_breakdown_by_brand_vertical(
    state: &AppState,
    agency_id: &str,
) -> Result<Vec<BreakdownItem>, (StatusCode, String)> {
    let now = chrono::Utc::now();
    let month_start = format!("{}-{:02}-01", now.year(), now.month());

    let resp = state
        .pg
        .from("payments")
        .select("talent_earnings_cents, campaigns!inner(brand_vertical)")
        .eq("agency_id", agency_id)
        .eq("status", "succeeded")
        .gte("paid_at", &month_start)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp.text().await.unwrap_or_else(|_| "[]".to_string());
    let data: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!([]));
    let empty_vec = vec![];
    let payments = data.as_array().unwrap_or(&empty_vec);

    let mut map: HashMap<String, (i64, i64)> = HashMap::new();
    let mut total_cents = 0i64;

    for p in payments {
        let vertical = p.get("campaigns").and_then(|v| v.get("brand_vertical")).and_then(|v| v.as_str()).unwrap_or("Other").to_string();
        let cents = p.get("talent_earnings_cents").and_then(|v| v.as_i64()).unwrap_or(0);
        let entry = map.entry(vertical).or_insert((0, 0));
        entry.0 += cents;
        entry.1 += 1;
        total_cents += cents;
    }

    Ok(map.into_iter().map(|(name, (cents, count))| {
        let percentage = if total_cents > 0 { (cents as f64 / total_cents as f64) * 100.0 } else { 0.0 };
        BreakdownItem { name, percentage: (percentage * 10.0).round() / 10.0, count }
    }).collect())
}

async fn get_breakdown_by_region(
    state: &AppState,
    agency_id: &str,
) -> Result<Vec<BreakdownItem>, (StatusCode, String)> {
    let now = chrono::Utc::now();
    let month_start = format!("{}-{:02}-01", now.year(), now.month());

    let resp = state
        .pg
        .from("payments")
        .select("talent_earnings_cents, campaigns!inner(region)")
        .eq("agency_id", agency_id)
        .eq("status", "succeeded")
        .gte("paid_at", &month_start)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp.text().await.unwrap_or_else(|_| "[]".to_string());
    let data: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!([]));
    let empty_vec = vec![];
    let payments = data.as_array().unwrap_or(&empty_vec);

    let mut map: HashMap<String, (i64, i64)> = HashMap::new();
    let mut total_cents = 0i64;

    for p in payments {
        let region = p.get("campaigns").and_then(|v| v.get("region")).and_then(|v| v.as_str()).unwrap_or("Other").to_string();
        let cents = p.get("talent_earnings_cents").and_then(|v| v.as_i64()).unwrap_or(0);
        let entry = map.entry(region).or_insert((0, 0));
        entry.0 += cents;
        entry.1 += 1;
        total_cents += cents;
    }

    Ok(map.into_iter().map(|(name, (cents, count))| {
        let percentage = if total_cents > 0 { (cents as f64 / total_cents as f64) * 100.0 } else { 0.0 };
        BreakdownItem { name, percentage: (percentage * 10.0).round() / 10.0, count }
    }).collect())
}
