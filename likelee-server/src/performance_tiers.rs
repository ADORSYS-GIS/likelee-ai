use crate::config::AppState;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use tracing::{error, info};

#[derive(Debug, Serialize, Deserialize)]
pub struct PerformanceTier {
    pub id: String,
    pub tier_name: String,
    pub tier_level: i32,
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

#[derive(Debug, Serialize, Deserialize)]
pub struct TierCalculationResult {
    pub total_talents_processed: i32,
    pub tier_assignments: Vec<TierAssignment>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TierAssignment {
    pub tier_name: String,
    pub count: i32,
}

/// GET /api/performance-tiers
pub async fn get_performance_tiers(
    State(state): State<AppState>,
) -> Result<Json<Vec<PerformanceTier>>, (StatusCode, String)> {
    info!("Fetching performance tiers with statistics");

    let tiers_resp = state
        .pg
        .from("performance_tiers")
        .select("id,tier_name,tier_level")
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

    for tier in &mut tiers {
        let metrics_resp = state
            .pg
            .from("talent_performance_metrics")
            .select("avg_monthly_earnings,avg_booking_frequency")
            .eq("current_tier_id", &tier.id)
            .execute()
            .await
            .map_err(|e| {
                error!("Failed to fetch metrics for tier {}: {}", tier.tier_name, e);
                (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
            })?;

        let metrics_text = metrics_resp.text().await.unwrap_or_else(|_| "[]".to_string());
        let metrics: Vec<serde_json::Value> =
            serde_json::from_str(&metrics_text).unwrap_or_default();

        tier.talent_count = Some(metrics.len() as i64);

        if !metrics.is_empty() {
            let total_earnings: f64 = metrics
                .iter()
                .filter_map(|m| m.get("avg_monthly_earnings")?.as_f64())
                .sum();
            let total_freq: f64 = metrics
                .iter()
                .filter_map(|m| m.get("avg_booking_frequency")?.as_f64())
                .sum();

            tier.avg_monthly_earnings = Some(total_earnings / metrics.len() as f64);
            tier.avg_booking_frequency = Some(total_freq / metrics.len() as f64);
        } else {
            tier.avg_monthly_earnings = Some(0.0);
            tier.avg_booking_frequency = Some(0.0);
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

    let tier_resp = state
        .pg
        .from("performance_tiers")
        .select("id")
        .eq("tier_name", &tier_name)
        .limit(1)
        .execute()
        .await
        .map_err(|e| {
            error!("Failed to fetch tier {}: {}", tier_name, e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    let tier_text = tier_resp.text().await.unwrap_or_else(|_| "[]".to_string());
    let tier_rows: Vec<serde_json::Value> = serde_json::from_str(&tier_text).unwrap_or_default();

    if tier_rows.is_empty() {
        return Err((
            StatusCode::NOT_FOUND,
            format!("Tier '{}' not found", tier_name),
        ));
    }

    let tier_id = tier_rows[0]
        .get("id")
        .and_then(|v| v.as_str())
        .ok_or((
            StatusCode::INTERNAL_SERVER_ERROR,
            "Invalid tier ID".to_string(),
        ))?;

    let metrics_resp = state
        .pg
        .from("talent_performance_metrics")
        .select("profile_id,avg_monthly_earnings,avg_booking_frequency,total_campaigns,engagement_percentage,days_since_last_booking")
        .eq("current_tier_id", tier_id)
        .order("avg_monthly_earnings.desc")
        .execute()
        .await
        .map_err(|e| {
            error!("Failed to fetch talent metrics: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    let metrics_text = metrics_resp.text().await.unwrap_or_else(|_| "[]".to_string());
    let metrics: Vec<serde_json::Value> = serde_json::from_str(&metrics_text).unwrap_or_default();

    let mut talents = Vec::new();

    for metric in metrics {
        let profile_id = metric
            .get("profile_id")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        if profile_id.is_empty() {
            continue;
        }

        let profile_resp = state
            .pg
            .from("profiles")
            .select("name,photo_url")
            .eq("id", profile_id)
            .limit(1)
            .execute()
            .await;

        if let Ok(resp) = profile_resp {
            if let Ok(text) = resp.text().await {
                if let Ok(profiles) = serde_json::from_str::<Vec<serde_json::Value>>(&text) {
                    if let Some(profile) = profiles.first() {
                        talents.push(TalentPerformanceMetrics {
                            profile_id: profile_id.to_string(),
                            name: profile
                                .get("name")
                                .and_then(|v| v.as_str())
                                .unwrap_or("Unknown")
                                .to_string(),
                            photo_url: profile.get("photo_url").and_then(|v| v.as_str()).map(String::from),
                            avg_monthly_earnings: metric
                                .get("avg_monthly_earnings")
                                .and_then(|v| v.as_f64())
                                .unwrap_or(0.0),
                            avg_booking_frequency: metric
                                .get("avg_booking_frequency")
                                .and_then(|v| v.as_f64())
                                .unwrap_or(0.0),
                            total_campaigns: metric
                                .get("total_campaigns")
                                .and_then(|v| v.as_i64())
                                .unwrap_or(0) as i32,
                            engagement_percentage: metric
                                .get("engagement_percentage")
                                .and_then(|v| v.as_f64())
                                .unwrap_or(0.0),
                            days_since_last_booking: metric
                                .get("days_since_last_booking")
                                .and_then(|v| v.as_i64())
                                .map(|v| v as i32),
                            current_tier: tier_name.clone(),
                        });
                    }
                }
            }
        }
    }

    info!("Successfully fetched {} talents for tier {}", talents.len(), tier_name);
    Ok(Json(talents))
}

/// POST /api/performance-tiers/calculate
pub async fn calculate_tier_assignments(
    State(_state): State<AppState>,
) -> Result<Json<TierCalculationResult>, (StatusCode, String)> {
    info!("Tier calculation endpoint called");
    
    Ok(Json(TierCalculationResult {
        total_talents_processed: 0,
        tier_assignments: vec![
            TierAssignment {
                tier_name: "Premium".to_string(),
                count: 0,
            },
            TierAssignment {
                tier_name: "Core".to_string(),
                count: 0,
            },
            TierAssignment {
                tier_name: "Growth".to_string(),
                count: 0,
            },
            TierAssignment {
                tier_name: "Inactive".to_string(),
                count: 0,
            },
        ],
    }))
}
