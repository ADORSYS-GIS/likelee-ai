use crate::config::AppState;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use tracing::{error, info};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PerformanceTier {
    pub id: String,
    pub tier_name: String,
    pub tier_level: i32,
    pub min_monthly_earnings: f64,
    pub min_monthly_bookings: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub talent_count: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avg_monthly_earnings: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avg_booking_frequency: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TalentPerformanceMetrics {
    pub profile_id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub photo_url: Option<String>,
    pub avg_monthly_earnings: f64,
    pub avg_booking_frequency: f64,
    pub total_campaigns: i32,
    pub engagement_percentage: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub days_since_last_booking: Option<i32>,
    pub current_tier: String,
}

#[derive(Debug, Clone)]
struct MockTalent {
    profile_id: String,
    name: String,
    photo_url: Option<String>,
    monthly_earnings: f64,
    monthly_bookings: i32,
    total_campaigns: i32,
    engagement_percentage: f64,
}

/// Mock talent data - simulates what we'd get from agency_users + royalty_ledger
/// TODO: Replace with real database queries when bookings/earnings tracking is implemented
fn get_mock_talent_data() -> Vec<MockTalent> {
    vec![
        MockTalent {
            profile_id: "carla-uuid".to_string(),
            name: "Carla".to_string(),
            photo_url: Some("https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/cf591ec97_Screenshot2025-10-29at63544PM.png".to_string()),
            monthly_earnings: 6800.0,
            monthly_bookings: 13,
            total_campaigns: 13,
            engagement_percentage: 7.1,
        },
        MockTalent {
            profile_id: "emma-uuid".to_string(),
            name: "Emma".to_string(),
            photo_url: Some("https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/5d413193e_Screenshot2025-10-29at63349PM.png".to_string()),
            monthly_earnings: 3200.0,
            monthly_bookings: 6,
            total_campaigns: 6,
            engagement_percentage: 4.0,
        },
        MockTalent {
            profile_id: "sergine-uuid".to_string(),
            name: "Sergine".to_string(),
            photo_url: Some("https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/7b92ca646_Screenshot2025-10-29at63428PM.png".to_string()),
            monthly_earnings: 3600.0,
            monthly_bookings: 5,
            total_campaigns: 5,
            engagement_percentage: 3.8,
        },
        MockTalent {
            profile_id: "matt-uuid".to_string(),
            name: "Matt".to_string(),
            photo_url: Some("https://i.pravatar.cc/150?u=Matt".to_string()),
            monthly_earnings: 3600.0,
            monthly_bookings: 6,
            total_campaigns: 6,
            engagement_percentage: 4.5,
        },
        MockTalent {
            profile_id: "julia-uuid".to_string(),
            name: "Julia".to_string(),
            photo_url: Some("https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/c5a5c61e4_Screenshot2025-10-29at63512PM.png".to_string()),
            monthly_earnings: 2400.0,
            monthly_bookings: 4,
            total_campaigns: 4,
            engagement_percentage: 3.2,
        },
    ]
}

/// Calculate which tier a talent belongs to based on their earnings and bookings
fn calculate_tier(earnings: f64, bookings: i32, tiers: &[PerformanceTier]) -> String {
    // Sort tiers by level and check from highest (Premium=1) to lowest (Inactive=4)
    let mut sorted_tiers = tiers.to_vec();
    sorted_tiers.sort_by_key(|t| t.tier_level);

    for tier in sorted_tiers.iter() {
        if earnings >= tier.min_monthly_earnings && bookings >= tier.min_monthly_bookings {
            return tier.tier_name.clone();
        }
    }

    // Fallback to Inactive if no tier matches
    "Inactive".to_string()
}

/// GET /api/performance-tiers
pub async fn get_performance_tiers(
    State(state): State<AppState>,
) -> Result<Json<Vec<PerformanceTier>>, (StatusCode, String)> {
    info!("Fetching performance tiers with statistics");

    // Fetch tier definitions from database
    let tiers_resp = state
        .pg
        .from("performance_tiers")
        .select("id,tier_name,tier_level,min_monthly_earnings,min_monthly_bookings")
        .order("tier_level.asc")
        .execute()
        .await
        .map_err(|e| {
            error!("Failed to fetch performance tiers: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    let tiers_text = tiers_resp.text().await.map_err(|e| {
        error!("Failed to read tiers response: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let mut tiers: Vec<PerformanceTier> = serde_json::from_str(&tiers_text).map_err(|e| {
        error!("Failed to parse tiers: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    // Get mock talent data
    let mock_talents = get_mock_talent_data();

    // Calculate tier assignments
    let mut tier_counts: std::collections::HashMap<String, i64> = std::collections::HashMap::new();
    let mut tier_earnings: std::collections::HashMap<String, Vec<f64>> = std::collections::HashMap::new();
    let mut tier_bookings: std::collections::HashMap<String, Vec<f64>> = std::collections::HashMap::new();

    for talent in mock_talents.iter() {
        let assigned_tier = calculate_tier(talent.monthly_earnings, talent.monthly_bookings, &tiers);
        
        *tier_counts.entry(assigned_tier.clone()).or_insert(0) += 1;
        tier_earnings.entry(assigned_tier.clone()).or_default().push(talent.monthly_earnings);
        tier_bookings.entry(assigned_tier.clone()).or_default().push(talent.monthly_bookings as f64);
    }

    // Populate tier statistics
    for tier in &mut tiers {
        tier.talent_count = Some(*tier_counts.get(&tier.tier_name).unwrap_or(&0));
        
        if let Some(earnings_list) = tier_earnings.get(&tier.tier_name) {
            if !earnings_list.is_empty() {
                tier.avg_monthly_earnings = Some(earnings_list.iter().sum::<f64>() / earnings_list.len() as f64);
            }
        }
        
        if let Some(bookings_list) = tier_bookings.get(&tier.tier_name) {
            if !bookings_list.is_empty() {
                tier.avg_booking_frequency = Some(bookings_list.iter().sum::<f64>() / bookings_list.len() as f64);
            }
        }
    }

    info!("Successfully fetched {} performance tiers", tiers.len());
    Ok(Json(tiers))
}

/// GET /api/performance-tiers/:tier_name/talents
pub async fn get_tier_talents(
    State(state): State<AppState>,
    Path(tier_name): Path<String>,
) -> Result<Json<Vec<TalentPerformanceMetrics>>, (StatusCode, String)> {
    info!("Fetching talents for tier: {}", tier_name);

    // Fetch tier definitions
    let tiers_resp = state
        .pg
        .from("performance_tiers")
        .select("id,tier_name,tier_level,min_monthly_earnings,min_monthly_bookings")
        .execute()
        .await
        .map_err(|e| {
            error!("Failed to fetch tiers: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    let tiers_text = tiers_resp.text().await.map_err(|e| {
        error!("Failed to read tiers response: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let tiers: Vec<PerformanceTier> = serde_json::from_str(&tiers_text).map_err(|e| {
        error!("Failed to parse tiers: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    // Verify tier exists
    if !tiers.iter().any(|t| t.tier_name == tier_name) {
        return Err((
            StatusCode::NOT_FOUND,
            format!("Tier '{}' not found", tier_name),
        ));
    }

    // Get mock talent data
    let mock_talents = get_mock_talent_data();

    // Filter talents by tier and convert to response format
    let mut talents: Vec<TalentPerformanceMetrics> = mock_talents
        .into_iter()
        .filter_map(|talent| {
            let assigned_tier = calculate_tier(talent.monthly_earnings, talent.monthly_bookings, &tiers);
            
            if assigned_tier == tier_name {
                Some(TalentPerformanceMetrics {
                    profile_id: talent.profile_id,
                    name: talent.name,
                    photo_url: talent.photo_url,
                    avg_monthly_earnings: talent.monthly_earnings,
                    avg_booking_frequency: talent.monthly_bookings as f64,
                    total_campaigns: talent.total_campaigns,
                    engagement_percentage: talent.engagement_percentage,
                    days_since_last_booking: None,
                    current_tier: assigned_tier,
                })
            } else {
                None
            }
        })
        .collect();

    // Sort by earnings descending
    talents.sort_by(|a, b| {
        b.avg_monthly_earnings
            .partial_cmp(&a.avg_monthly_earnings)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    info!(
        "Successfully fetched {} talents for tier {}",
        talents.len(),
        tier_name
    );
    Ok(Json(talents))
}

// TODO: Future implementation when bookings/earnings are tracked in database
// async fn get_real_talent_data(pg: &postgrest::Postgrest) -> Result<Vec<MockTalent>, String> {
//     // 1. Fetch agency_users to get list of talents
//     // 2. Fetch v_face_payouts for current month to get earnings/bookings
//     // 3. Fetch profiles for names/photos
//     // 4. Join data and return
//     unimplemented!("Real data integration pending bookings implementation")
// }
