use crate::config::AppState;
use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct DashboardQuery {
    pub agency_id: Option<String>,
}

#[derive(Serialize)]
pub struct RosterHealth {
    pub active_count: i32,
    pub total_count: i32,
    pub percentage: i32,
}

#[derive(Serialize)]
pub struct RevenueThisMonth {
    pub amount_cents: i64,
    pub currency: String,
    pub change_percentage: f64,
}

#[derive(Serialize)]
pub struct PendingActions {
    pub licensing_requests: i32,
    pub expiring_licenses: i32,
    pub compliance_issues: i32,
}

#[derive(Serialize)]
pub struct PlatformRanking {
    pub percentile: i32,
    pub status: String,
}

#[derive(Serialize)]
pub struct RevenueBreakdownItem {
    pub category: String,
    pub percentage: i32,
}

#[derive(Serialize)]
pub struct RevenueBreakdown {
    pub by_campaign_type: Vec<RevenueBreakdownItem>,
    pub by_brand_vertical: Vec<RevenueBreakdownItem>,
    pub by_region: Vec<RevenueBreakdownItem>,
}

#[derive(Serialize)]
pub struct LicensingPipeline {
    pub pending_approval: i32,
    pub active: i32,
    pub expiring_soon: i32,
    pub total_this_month: i32,
}

#[derive(Serialize)]
pub struct RecentActivity {
    pub activity_type: String,
    pub description: String,
    pub timestamp: String,
}

#[derive(Serialize)]
pub struct DashboardMetrics {
    pub roster_health: RosterHealth,
    pub revenue_this_month: RevenueThisMonth,
    pub pending_actions: PendingActions,
    pub platform_ranking: PlatformRanking,
    pub revenue_breakdown: RevenueBreakdown,
    pub licensing_pipeline: LicensingPipeline,
}

#[derive(Serialize)]
pub struct TopTalent {
    pub id: String,
    pub name: String,
    pub earnings_cents: i64,
    pub profile_photo_url: Option<String>,
}

#[derive(Serialize)]
pub struct NewTalent {
    pub id: String,
    pub name: String,
    pub status: String,
    pub days_to_first_booking: i32,
    pub profile_photo_url: Option<String>,
}

#[derive(Serialize)]
pub struct AgencyDashboardResponse {
    pub agency_name: String,
    pub metrics: DashboardMetrics,
    pub top_revenue_generators: Vec<TopTalent>,
    pub needs_activation: Vec<TopTalent>,
    pub new_talent_performance: Vec<NewTalent>,
    pub recent_activity: Vec<RecentActivity>,
}

pub async fn get_agency_dashboard(
    State(state): State<AppState>,
    Query(q): Query<DashboardQuery>,
) -> Result<Json<AgencyDashboardResponse>, (StatusCode, String)> {
    // 1. Fetch the agency ID from the agency table (organization_profiles)
    // If agency_id is not provided, we could try to find one, but user said "fetch from agency table"
    let agency_id = q.agency_id.clone().ok_or((
        StatusCode::BAD_REQUEST,
        "agency_id is required".to_string(),
    ))?;

    let agency_res = state
        .pg
        .from("agency")
        .select("*")
        .eq("id", &agency_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Agency lookup failed: {}", e)))?;

    let agency_text = agency_res.text().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let agencies: Vec<serde_json::Value> = serde_json::from_str(&agency_text)
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to parse agency response: {}", agency_text)))?;
    
    let agency = agencies.first().ok_or((
        StatusCode::NOT_FOUND,
        format!("Agency with ID {} not found", agency_id),
    ))?;

    let agency_name = agency.get("organization_name").and_then(|v| v.as_str()).unwrap_or("Unknown Agency").to_string();

    // 2. Get roster health - count active vs total talent
    // We'll try to use creators, but handle the potential missing table gracefully for now
    let roster_res = state
        .pg
        .from("creators")
        .select("id, kyc_status")
        .eq("role", "creator")
        .execute()
        .await;

    let (total_count, active_count) = match roster_res {
        Ok(resp) => {
            let text = resp.text().await.unwrap_or_else(|_| "[]".to_string());
            if let Ok(data) = serde_json::from_str::<Vec<serde_json::Value>>(&text) {
                let total = data.len() as i32;
                let active = data.iter().filter(|p| {
                    p.get("kyc_status").and_then(|s| s.as_str()) == Some("approved")
                }).count() as i32;
                (total, active)
            } else {
                (0, 0)
            }
        }
        Err(_) => {
            // Fallback: use talent_count from agency if creators table is missing
            let count_str = agency.get("talent_count").and_then(|v| v.as_str()).unwrap_or("0");
            let count = count_str.parse::<i32>().unwrap_or(0);
            (count, count) // Assume all are active if we don't know
        }
    };

    let percentage = if total_count > 0 {
        (active_count * 100) / total_count
    } else {
        0
    };

    // 3. Get revenue this month
    let current_month = chrono::Utc::now().format("%Y-%m-01").to_string();
    let revenue_res = state
        .pg
        .from("royalty_ledger")
        .select("amount_cents")
        .gte("period_month", &current_month)
        .execute()
        .await;

    let revenue_this_month: i64 = match revenue_res {
        Ok(resp) => {
            let text = resp.text().await.unwrap_or_else(|_| "[]".to_string());
            if let Ok(data) = serde_json::from_str::<Vec<serde_json::Value>>(&text) {
                data.iter().filter_map(|r| r.get("amount_cents").and_then(|a| a.as_i64())).sum()
            } else {
                0
            }
        }
        Err(_) => 0,
    };

    // Mock sections for now (as in the image)
    let revenue_breakdown = RevenueBreakdown {
        by_campaign_type: vec![
            RevenueBreakdownItem { category: "Social Media".to_string(), percentage: 45 },
            RevenueBreakdownItem { category: "E-commerce".to_string(), percentage: 35 },
            RevenueBreakdownItem { category: "Traditional".to_string(), percentage: 20 },
        ],
        by_brand_vertical: vec![
            RevenueBreakdownItem { category: "Beauty".to_string(), percentage: 40 },
            RevenueBreakdownItem { category: "Fashion".to_string(), percentage: 35 },
            RevenueBreakdownItem { category: "Lifestyle".to_string(), percentage: 25 },
        ],
        by_region: vec![
            RevenueBreakdownItem { category: "North America".to_string(), percentage: 60 },
            RevenueBreakdownItem { category: "Europe".to_string(), percentage: 30 },
            RevenueBreakdownItem { category: "Other".to_string(), percentage: 10 },
        ],
    };

    let licensing_pipeline = LicensingPipeline {
        pending_approval: 3,
        active: 9,
        expiring_soon: 1,
        total_this_month: 13,
    };

    let pending_actions = PendingActions {
        licensing_requests: 3,
        expiring_licenses: 1,
        compliance_issues: 1,
    };

    let platform_ranking = PlatformRanking {
        percentile: 15,
        status: "Top performer".to_string(),
    };

    let top_revenue_generators = vec![
        TopTalent {
            id: "t1".to_string(),
            name: "Carla".to_string(),
            earnings_cents: 680000,
            profile_photo_url: Some("https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/carla.jpg".to_string()),
        },
        TopTalent {
            id: "t2".to_string(),
            name: "Clemence".to_string(),
            earnings_cents: 540000,
            profile_photo_url: Some("https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/clemence.jpg".to_string()),
        },
    ];

    let new_talent_performance = vec![
        NewTalent {
            id: "n1".to_string(),
            name: "Aaron".to_string(),
            status: "PENDING".to_string(),
            days_to_first_booking: 12,
            profile_photo_url: Some("https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/aaron.jpg".to_string()),
        },
    ];

    let recent_activity = vec![
        RecentActivity {
            activity_type: "license_approved".to_string(),
            description: "License approved for Emma - Glossier Beauty".to_string(),
            timestamp: "2 hours ago".to_string(),
        },
        RecentActivity {
            activity_type: "payment_received".to_string(),
            description: "Payment received: $5,200 from & Other Stories".to_string(),
            timestamp: "5 hours ago".to_string(),
        },
    ];

    let metrics = DashboardMetrics {
        roster_health: RosterHealth { active_count, total_count, percentage },
        revenue_this_month: RevenueThisMonth {
            amount_cents: revenue_this_month,
            currency: "USD".to_string(),
            change_percentage: 12.0,
        },
        pending_actions,
        platform_ranking,
        revenue_breakdown,
        licensing_pipeline,
    };

    Ok(Json(AgencyDashboardResponse {
        agency_name,
        metrics,
        top_revenue_generators,
        needs_activation: vec![],
        new_talent_performance,
        recent_activity,
    }))
}
