use crate::auth::AuthUser;
use crate::config::AppState;
use axum::{extract::State, http::StatusCode, Json};
use chrono::Datelike;
use serde::Serialize;
use serde_json::json;
use std::collections::{HashMap, HashSet};

#[derive(Debug, Serialize)]
pub struct DashboardOverview {
    pub roster_health: RosterHealth,
    pub monthly_revenue: MonthlyRevenue,
    pub pending_actions: PendingActions,
    pub platform_ranking: PlatformRanking,
    pub kyc_status: String,
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

    // Fetch KYC Status
    let kyc_status = match state
        .pg
        .from("agencies")
        .select("kyc_status")
        .eq("id", agency_id)
        .execute()
        .await
    {
        Ok(res) => {
            let text = res.text().await.unwrap_or_default();
            let data: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!([]));
            data.get(0)
                .and_then(|v| v.get("kyc_status"))
                .and_then(|v| v.as_str())
                .unwrap_or("not_started")
                .to_string()
        }
        Err(_) => "not_started".to_string(),
    };

    Ok(Json(DashboardOverview {
        roster_health,
        monthly_revenue,
        pending_actions,
        platform_ranking,
        kyc_status,
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

    let pending_text = pending_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let pending_data: serde_json::Value = serde_json::from_str(&pending_text).unwrap_or(json!([]));
    let pending_approval = pending_data.as_array().map(|a| a.len() as i64).unwrap_or(0);

    // 2. Counts from brand_licenses
    let now = chrono::Utc::now();
    // month_start removed as it was unused
    let thirty_days_hence = (now + chrono::Duration::days(30)).to_rfc3339();

    // Expiring Soon
    let expiring_resp = state
        .pg
        .from("brand_licenses")
        .select("id")
        .eq("agency_id", agency_id)
        .eq("status", "active")
        .lte("end_at", &thirty_days_hence)
        .gte("end_at", now.to_rfc3339())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let expiring_text = expiring_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let expiring_data: serde_json::Value =
        serde_json::from_str(&expiring_text).unwrap_or(json!([]));
    let expiring_soon = expiring_data
        .as_array()
        .map(|a| a.len() as i64)
        .unwrap_or(0);

    // Active
    let active_resp = state
        .pg
        .from("brand_licenses")
        .select("id")
        .eq("agency_id", agency_id)
        .eq("status", "active")
        .gt("end_at", now.to_rfc3339())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let active_text = active_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let active_data: serde_json::Value = serde_json::from_str(&active_text).unwrap_or(json!([]));
    let active = active_data.as_array().map(|a| a.len() as i64).unwrap_or(0);

    // Total This Month (Sum of Pending and Active, per requirement)
    let total_this_month = pending_approval + active;

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
    let mut all_activities = Vec::new();

    // 1. Campaigns
    let resp_camp = state
        .pg
        .from("campaigns")
        .select("id, name, created_at")
        .eq("agency_id", agency_id)
        .order("created_at.desc")
        .limit(5)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text_camp = resp_camp.text().await.unwrap_or_else(|_| "[]".to_string());
    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text_camp) {
        if let Some(arr) = json.as_array() {
            for item in arr {
                let name = item
                    .get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Campaign");
                let time = item
                    .get("created_at")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                if let Some(id) = item.get("id").and_then(|v| v.as_str()) {
                    all_activities.push(ActivityItem {
                        id: id.to_string(),
                        type_name: "campaign".to_string(),
                        title: format!("New Campaign: {}", name),
                        subtitle: "Campaign Created".to_string(),
                        timestamp: time.to_string(),
                        relative_time: "Recently".to_string(),
                    });
                }
            }
        }
    }

    // 2. Payments
    let resp_pay = state
        .pg
        .from("payments")
        .select("id, gross_cents, created_at")
        .eq("agency_id", agency_id)
        .eq("status", "succeeded")
        .order("created_at.desc")
        .limit(5)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text_pay = resp_pay.text().await.unwrap_or_else(|_| "[]".to_string());
    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text_pay) {
        if let Some(arr) = json.as_array() {
            for item in arr {
                let cents = item
                    .get("gross_cents")
                    .and_then(|v| v.as_i64())
                    .unwrap_or(0);
                let time = item
                    .get("created_at")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                if let Some(id) = item.get("id").and_then(|v| v.as_str()) {
                    all_activities.push(ActivityItem {
                        id: id.to_string(),
                        type_name: "payment".to_string(),
                        title: "Payment Received".to_string(),
                        subtitle: format!("+${:.2}", cents as f64 / 100.0),
                        timestamp: time.to_string(),
                        relative_time: "Recently".to_string(),
                    });
                }
            }
        }
    }

    // 3. New Talents
    let resp_tal = state
        .pg
        .from("agency_users")
        .select("id, stage_name, full_legal_name, created_at")
        .eq("agency_id", agency_id)
        .eq("role", "talent")
        .order("created_at.desc")
        .limit(5)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text_tal = resp_tal.text().await.unwrap_or_else(|_| "[]".to_string());
    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text_tal) {
        if let Some(arr) = json.as_array() {
            for item in arr {
                let s_name = item
                    .get("stage_name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let l_name = item
                    .get("full_legal_name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Unknown");
                let name = if !s_name.is_empty() { s_name } else { l_name };
                let time = item
                    .get("created_at")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                if let Some(id) = item.get("id").and_then(|v| v.as_str()) {
                    all_activities.push(ActivityItem {
                        id: id.to_string(),
                        type_name: "talent".to_string(),
                        title: format!("New Talent: {}", name),
                        subtitle: "Roster Addition".to_string(),
                        timestamp: time.to_string(),
                        relative_time: "Recently".to_string(),
                    });
                }
            }
        }
    }

    // 4. Licensing Requests
    let resp_req = state
        .pg
        .from("licensing_requests")
        .select("id, created_at")
        .eq("agency_id", agency_id)
        .order("created_at.desc")
        .limit(5)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text_req = resp_req.text().await.unwrap_or_else(|_| "[]".to_string());
    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text_req) {
        if let Some(arr) = json.as_array() {
            for item in arr {
                let time = item
                    .get("created_at")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                if let Some(id) = item.get("id").and_then(|v| v.as_str()) {
                    all_activities.push(ActivityItem {
                        id: id.to_string(),
                        type_name: "licensing".to_string(),
                        title: "New Licensing Request".to_string(),
                        subtitle: "Pending Approval".to_string(),
                        timestamp: time.to_string(),
                        relative_time: "Recently".to_string(),
                    });
                }
            }
        }
    }

    // Sort and Limit
    all_activities.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    all_activities.truncate(5);

    Ok(Json(ActivityFeed {
        activities: all_activities,
    }))
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

    let text = resp
        .text()
        .await
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
    let thirty_days_ago = (now - chrono::Duration::days(30)).to_rfc3339();
    let sixty_days_ago = (now - chrono::Duration::days(60)).to_rfc3339();

    // Get last 30 days revenue
    let resp = state
        .pg
        .from("payments")
        .select("gross_cents")
        .eq("agency_id", agency_id)
        .eq("status", "succeeded")
        .gte("paid_at", &thirty_days_ago)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let data: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let empty_vec = vec![];
    let payments = data.as_array().unwrap_or(&empty_vec);
    let amount_cents: i64 = payments
        .iter()
        .filter_map(|p| p.get("gross_cents")?.as_i64())
        .sum();

    // Get previous 30 days revenue (days 31-60) for growth calculation
    let last_resp = state
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

    let last_text = last_resp.text().await.unwrap_or_else(|_| "[]".to_string());
    let last_data: serde_json::Value =
        serde_json::from_str(&last_text).unwrap_or(serde_json::Value::Array(vec![]));
    let last_payments = last_data.as_array().unwrap_or(&empty_vec);
    let last_amount_cents: i64 = last_payments
        .iter()
        .filter_map(|p| p.get("gross_cents")?.as_i64())
        .sum();

    let growth_percentage = if last_amount_cents > 0 {
        ((amount_cents - last_amount_cents) as f64 / last_amount_cents as f64) * 100.0
    } else if amount_cents > 0 {
        100.0
    } else {
        0.0
    };

    let amount_formatted = if amount_cents >= 100_000_000 {
        format!("${:.1}M", amount_cents as f64 / 100_000_000.0)
    } else if amount_cents >= 100_000 {
        format!("${:.1}K", amount_cents as f64 / 100_000.0)
    } else {
        format!("${:.0}", amount_cents as f64 / 100.0)
    };

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

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let data: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
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
        .gte("end_at", now.to_rfc3339())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let licenses_text = licenses_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let licenses_data: serde_json::Value =
        serde_json::from_str(&licenses_text).unwrap_or(json!([]));
    let expiring_licenses = licenses_data
        .as_array()
        .map(|a| a.len() as i64)
        .unwrap_or(0);

    // 3. Mock compliance issues - REMOVED

    Ok(PendingActions {
        licensing_requests,
        expiring_licenses,
    })
}

async fn get_top_revenue_generators(
    state: &AppState,
    agency_id: &str,
) -> Result<Vec<TopTalent>, (StatusCode, String)> {
    let now = chrono::Utc::now();
    let thirty_days_ago = (now - chrono::Duration::days(30)).to_rfc3339();

    // Query payments joined with agency_users to get real gross revenue
    let resp = state
        .pg
        .from("payments")
        .select(
            "talent_id, gross_cents, agency_users(stage_name, full_legal_name, profile_photo_url)",
        )
        .eq("agency_id", agency_id)
        .eq("status", "succeeded")
        .gte("paid_at", &thirty_days_ago)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp.text().await.unwrap_or_else(|_| "[]".to_string());
    let data: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!([]));
    let empty_vec = vec![];
    let items = data.as_array().unwrap_or(&empty_vec);

    let mut talent_map: HashMap<String, (String, Option<String>, i64)> = HashMap::new();

    for item in items {
        let talent_id = item
            .get("talent_id")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown")
            .to_string();

        let cents = item
            .get("gross_cents")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);

        let user = item.get("agency_users");
        let stage_name = user
            .and_then(|u| u.get("stage_name"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let legal_name = user
            .and_then(|u| u.get("full_legal_name"))
            .and_then(|v| v.as_str())
            .unwrap_or("Unknown User")
            .to_string();

        let name = if !stage_name.trim().is_empty() {
            stage_name
        } else {
            legal_name
        };
        let photo = user
            .and_then(|u| u.get("profile_photo_url"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        let entry = talent_map.entry(talent_id).or_insert((name, photo, 0));
        entry.2 += cents;
    }

    let mut sorted_talents: Vec<TopTalent> = talent_map
        .into_iter()
        .map(|(id, (name, photo, cents))| TopTalent {
            id,
            name,
            photo_url: photo,
            earnings_cents: cents,
            earnings_formatted: format!("${:.2}K", cents as f64 / 100_000.0),
        })
        .collect();

    // Sort descending by earnings
    sorted_talents.sort_by(|a, b| b.earnings_cents.cmp(&a.earnings_cents));

    // Take top 3
    Ok(sorted_talents.into_iter().take(3).collect())
}

async fn get_actively_earning(
    state: &AppState,
    agency_id: &str,
) -> Result<Vec<ActiveTalent>, (StatusCode, String)> {
    let now = chrono::Utc::now();
    let month_start = format!("{}-{:02}-01", now.year(), now.month());

    let resp = state
        .pg
        .from("payments")
        .select("talent_id, talent_earnings_cents, paid_at, agency_users(stage_name, full_legal_name, profile_photo_url)")
        .eq("agency_id", agency_id)
        .eq("status", "succeeded")
        .gte("paid_at", &month_start)

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
        let talent_id = p
            .get("talent_id")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown")
            .to_string();
        if seen_talents.contains(&talent_id) {
            continue;
        }

        let cents = p
            .get("talent_earnings_cents")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        let paid_at = p
            .get("paid_at")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let talent = p.get("agency_users");

        let stage_name = talent
            .and_then(|v| v.get("stage_name"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let legal_name = talent
            .and_then(|v| v.get("full_legal_name"))
            .and_then(|v| v.as_str())
            .unwrap_or("Unknown User")
            .to_string();

        let name = if !stage_name.trim().is_empty() {
            stage_name
        } else {
            legal_name
        };
        let photo = talent
            .and_then(|v| v.get("profile_photo_url"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

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
        .select("id, created_at, stage_name, full_legal_name, profile_photo_url, status")
        .eq("agency_id", agency_id)
        .eq("role", "talent")
        .gte("created_at", &date_filter)
        .order("created_at.desc")
        .limit(3)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let data: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut talents = vec![];
    if let Some(arr) = data.as_array() {
        for item in arr {
            let id = item
                .get("id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let created_at_str = item
                .get("created_at")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let created_date = chrono::DateTime::parse_from_rfc3339(created_at_str)
                .ok()
                .map(|dt| dt.with_timezone(&chrono::Utc))
                .unwrap_or(chrono::Utc::now());
            let days_since_added = (chrono::Utc::now() - created_date).num_days();

            let stage = item
                .get("stage_name")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let legal = item
                .get("full_legal_name")
                .and_then(|v| v.as_str())
                .unwrap_or("Unknown");
            let name = if !stage.trim().is_empty() {
                stage.to_string()
            } else {
                legal.to_string()
            };
            let photo = item
                .get("profile_photo_url")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let status = item
                .get("status")
                .and_then(|v| v.as_str())
                .unwrap_or("pending")
                .to_uppercase();

            // Calculate REAL avg time to first booking for this specific talent
            // We find their earliest booking from the bookings table
            let booking_resp = state
                .pg
                .from("bookings")
                .select("date")
                .eq("talent_id", &id)
                .order("date.asc")
                .limit(1)
                .execute()
                .await;

            let avg_days = if let Ok(br) = booking_resp {
                let b_text = br.text().await.unwrap_or_else(|_| "[]".to_string());
                let b_data: serde_json::Value = serde_json::from_str(&b_text).unwrap_or(json!([]));
                if let Some(first_booking) = b_data.as_array().and_then(|a| a.first()) {
                    let booking_date_str = first_booking
                        .get("date")
                        .and_then(|v| v.as_str())
                        .unwrap_or("");
                    // Parse date (YYYY-MM-DD or RFC3339)
                    let booking_date =
                        chrono::NaiveDate::parse_from_str(booking_date_str, "%Y-%m-%d")
                            .ok()
                            .map(|d| {
                                chrono::DateTime::from_naive_utc_and_offset(
                                    chrono::NaiveDateTime::new(
                                        d,
                                        chrono::NaiveTime::from_hms_opt(0, 0, 0).unwrap(),
                                    ),
                                    chrono::Utc,
                                )
                            })
                            .or_else(|| {
                                chrono::DateTime::parse_from_rfc3339(booking_date_str)
                                    .ok()
                                    .map(|dt| dt.with_timezone(&chrono::Utc))
                            });

                    booking_date
                        .map(|bd| {
                            let diff = (bd - created_date).num_days();
                            if diff < 0 {
                                0.0
                            } else {
                                diff as f64
                            }
                        })
                        .unwrap_or(0.0)
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
    let thirty_days_ago = (now - chrono::Duration::days(30)).to_rfc3339();

    let resp = state
        .pg
        .from("payments")
        .select("gross_cents, campaigns(campaign_type)")
        .eq("agency_id", agency_id)
        .eq("status", "succeeded")
        .gte("paid_at", &thirty_days_ago)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp.text().await.unwrap_or_else(|_| "[]".to_string());
    let data: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!([]));
    let empty_vec = vec![];
    let items = data.as_array().unwrap_or(&empty_vec);

    let mut map: HashMap<String, (i64, i64)> = HashMap::new();
    let mut total_cents = 0i64;

    for item in items {
        let campaign_type = item
            .get("campaigns")
            .and_then(|c| c.get("campaign_type"))
            .and_then(|v| v.as_str())
            .unwrap_or("Other")
            .to_string();
        let cents = item
            .get("gross_cents")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        let entry = map.entry(campaign_type).or_insert((0, 0));
        entry.0 += cents;
        entry.1 += 1;
        total_cents += cents;
    }

    Ok(map
        .into_iter()
        .map(|(name, (cents, count))| {
            let percentage = if total_cents > 0 {
                (cents as f64 / total_cents as f64) * 100.0
            } else {
                0.0
            };
            BreakdownItem {
                name,
                percentage: (percentage * 10.0).round() / 10.0,
                count,
            }
        })
        .collect())
}

async fn get_breakdown_by_brand_vertical(
    state: &AppState,
    agency_id: &str,
) -> Result<Vec<BreakdownItem>, (StatusCode, String)> {
    let now = chrono::Utc::now();
    let thirty_days_ago = (now - chrono::Duration::days(30)).to_rfc3339();

    let resp = state
        .pg
        .from("payments")
        .select("gross_cents, campaigns(brand_vertical)")
        .eq("agency_id", agency_id)
        .eq("status", "succeeded")
        .gte("paid_at", &thirty_days_ago)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp.text().await.unwrap_or_else(|_| "[]".to_string());
    let data: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!([]));
    let empty_vec = vec![];
    let items = data.as_array().unwrap_or(&empty_vec);

    let mut map: HashMap<String, (i64, i64)> = HashMap::new();
    let mut total_cents = 0i64;

    for item in items {
        let vertical = item
            .get("campaigns")
            .and_then(|c| c.get("brand_vertical"))
            .and_then(|v| v.as_str())
            .unwrap_or("Other")
            .to_string();
        let cents = item
            .get("gross_cents")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        let entry = map.entry(vertical).or_insert((0, 0));
        entry.0 += cents;
        entry.1 += 1;
        total_cents += cents;
    }

    Ok(map
        .into_iter()
        .map(|(name, (cents, count))| {
            let percentage = if total_cents > 0 {
                (cents as f64 / total_cents as f64) * 100.0
            } else {
                0.0
            };
            BreakdownItem {
                name,
                percentage: (percentage * 10.0).round() / 10.0,
                count,
            }
        })
        .collect())
}

async fn get_breakdown_by_region(
    state: &AppState,
    agency_id: &str,
) -> Result<Vec<BreakdownItem>, (StatusCode, String)> {
    let now = chrono::Utc::now();
    let thirty_days_ago = (now - chrono::Duration::days(30)).to_rfc3339();

    let resp = state
        .pg
        .from("payments")
        .select("gross_cents, campaigns(region)")
        .eq("agency_id", agency_id)
        .eq("status", "succeeded")
        .gte("paid_at", &thirty_days_ago)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp.text().await.unwrap_or_else(|_| "[]".to_string());
    let data: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!([]));
    let empty_vec = vec![];
    let items = data.as_array().unwrap_or(&empty_vec);

    let mut map: HashMap<String, (i64, i64)> = HashMap::new();
    let mut total_cents = 0i64;

    for item in items {
        let region = item
            .get("campaigns")
            .and_then(|c| c.get("region"))
            .and_then(|v| v.as_str())
            .unwrap_or("Other")
            .to_string();
        let cents = item
            .get("gross_cents")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        let entry = map.entry(region).or_insert((0, 0));
        entry.0 += cents;
        entry.1 += 1;
        total_cents += cents;
    }

    Ok(map
        .into_iter()
        .map(|(name, (cents, count))| {
            let percentage = if total_cents > 0 {
                (cents as f64 / total_cents as f64) * 100.0
            } else {
                0.0
            };
            BreakdownItem {
                name,
                percentage: (percentage * 10.0).round() / 10.0,
                count,
            }
        })
        .collect())
}
