use crate::{auth::AuthUser, config::AppState};
use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::time::Instant;

#[derive(Serialize, Deserialize, Clone)]
pub struct TierRule {
    pub tier_name: String,
    pub tier_level: i32,
    pub min_monthly_earnings: f64,
    pub min_monthly_bookings: i32,
    pub description: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct TierConfigDb {
    pub tier_name: String,
    pub min_monthly_earnings: f64,
    pub min_monthly_bookings: i32,
}

#[derive(Serialize)]
pub struct TalentPerformance {
    pub id: String,
    pub name: String,
    pub photo_url: Option<String>,
    pub earnings_30d: f64,
    pub bookings_this_month: i64,
    pub tier: TierRule,
}

#[derive(Serialize)]
pub struct PerformanceTiersResponse {
    pub tiers: Vec<TierGroup>,
    pub config: Option<serde_json::Value>,
}

#[derive(Serialize)]
pub struct TierGroup {
    pub name: String,
    pub level: i32,
    pub description: String,
    pub talents: Vec<TalentPerformance>,
}

#[derive(Deserialize)]
pub struct ConfigurePerformanceRequest {
    pub config: serde_json::Value,
}

#[derive(Deserialize)]
pub struct PerformanceStats {
    pub talent_id: String,
    pub earnings_cents: i64,
    pub booking_count: i64,
}

pub async fn configure_performance_tiers(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<ConfigurePerformanceRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    let config = payload.config.as_object().ok_or((
        StatusCode::BAD_REQUEST,
        "Invalid config payload".to_string(),
    ))?;

    let defaults = [
        ("Premium", 1, 5000.0_f64, 8_i32),
        ("Core", 2, 2500.0_f64, 5_i32),
        ("Growth", 3, 500.0_f64, 1_i32),
    ];

    let rows: Vec<serde_json::Value> = defaults
        .iter()
        .map(|(name, _, default_e, default_b)| {
            let tier_cfg = config.get(*name).and_then(|v| v.as_object());
            let min_earnings = tier_cfg
                .and_then(|v| v.get("min_earnings"))
                .and_then(|v| v.as_f64())
                .unwrap_or(*default_e);
            let min_bookings = tier_cfg
                .and_then(|v| v.get("min_bookings"))
                .and_then(|v| v.as_i64())
                .map(|v| v as i32)
                .unwrap_or(*default_b);

            json!({
                "agency_id": auth_user.id,
                "tier_name": name,
                "min_monthly_earnings": min_earnings,
                "min_monthly_bookings": min_bookings,
                "updated_at": chrono::Utc::now().to_rfc3339(),
            })
        })
        .collect();

    // Ensure there is an agencies row for this auth user before writing FK-bound rows.
    let agency_exists_resp = state
        .pg
        .from("agencies")
        .select("id")
        .eq("id", &auth_user.id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !agency_exists_resp.status().is_success() {
        let status = agency_exists_resp.status();
        let text = agency_exists_resp.text().await.unwrap_or_default();
        return Err((
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
            format!("Configuration Error: {}", text),
        ));
    }

    let agency_rows_text = agency_exists_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let agency_rows: Vec<serde_json::Value> =
        serde_json::from_str(&agency_rows_text).unwrap_or_default();
    if agency_rows.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Configuration Error: agency profile not found for this account".to_string(),
        ));
    }

    // Replace existing rows to avoid relying on upsert conflict inference on composite keys.
    let delete_resp = state
        .pg
        .from("performance_tiers")
        .eq("agency_id", &auth_user.id)
        .delete()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !delete_resp.status().is_success() {
        let status = delete_resp.status();
        let text = delete_resp.text().await.unwrap_or_default();
        let friendly_msg = serde_json::from_str::<serde_json::Value>(&text)
            .ok()
            .and_then(|v| {
                v.get("message")
                    .and_then(|m| m.as_str())
                    .map(|s| s.to_string())
            })
            .unwrap_or_else(|| text.clone());

        return Err((
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
            format!("Configuration Error: {}", friendly_msg),
        ));
    }

    let insert_resp = state
        .pg
        .from("performance_tiers")
        .insert(json!(rows).to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !insert_resp.status().is_success() {
        let status = insert_resp.status();
        let text = insert_resp.text().await.unwrap_or_default();
        let friendly_msg = serde_json::from_str::<serde_json::Value>(&text)
            .ok()
            .and_then(|v| {
                v.get("message")
                    .and_then(|m| m.as_str())
                    .map(|s| s.to_string())
            })
            .unwrap_or_else(|| text.clone());

        return Err((
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
            format!("Configuration Error: {}", friendly_msg),
        ));
    }

    Ok(StatusCode::OK)
}

pub async fn get_performance_tiers(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<PerformanceTiersResponse>, (StatusCode, String)> {
    let start_total = Instant::now();
    let agency_id = &auth_user.id;

    // Parallelize the 3 main database/RPC calls
    let (resp_config_rows, resp_talents, resp_stats) = tokio::try_join!(
        // 1. Fetch Agency Tier Config Rows
        state
            .pg
            .from("performance_tiers")
            .select("tier_name,min_monthly_earnings,min_monthly_bookings")
            .eq("agency_id", agency_id)
            .execute(),
        // 2. Fetch Talents
        state
            .pg
            .from("agency_users")
            .select("id, full_legal_name, profile_photo_url")
            .eq("agency_id", agency_id)
            .eq("role", "talent")
            .execute(),
        // 3. Calculate Real-Time Metrics via RPC
        async {
            let now = chrono::Utc::now();
            let month_start = now.format("%Y-%m-01").to_string();
            state
                .pg
                .rpc(
                    "get_agency_performance_stats",
                    json!({
                        "p_agency_id": agency_id,
                        "p_earnings_start_date": month_start,
                        "p_bookings_start_date": month_start,
                    })
                    .to_string(),
                )
                .execute()
                .await
        }
    )
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let db_time = start_total.elapsed();

    // 1. Process Tier Config rows
    if !resp_config_rows.status().is_success() {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Tiers Error: {}", resp_config_rows.status()),
        ));
    }
    let text_tiers = resp_config_rows.text().await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Read tiers: {}", e),
        )
    })?;
    let tiers_db: Vec<TierConfigDb> = serde_json::from_str(&text_tiers).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Parse tiers: {}", e),
        )
    })?;

    let defaults = [
        (
            "Premium".to_string(),
            1,
            5000.0_f64,
            8_i32,
            Some("Top-performing talent with highest earnings and booking frequency".to_string()),
        ),
        (
            "Core".to_string(),
            2,
            2500.0_f64,
            5_i32,
            Some(
                "Consistently performing talent with solid earnings and regular bookings"
                    .to_string(),
            ),
        ),
        (
            "Growth".to_string(),
            3,
            500.0_f64,
            1_i32,
            Some("Developing talent with moderate activity".to_string()),
        ),
        (
            "Inactive".to_string(),
            4,
            0.0_f64,
            0_i32,
            Some("Talent requiring attention or inactive".to_string()),
        ),
    ];

    let mut config_map: HashMap<String, (f64, i32)> = tiers_db
        .into_iter()
        .map(|r| {
            (
                r.tier_name,
                (r.min_monthly_earnings, r.min_monthly_bookings),
            )
        })
        .collect();

    let tiers_json: Vec<TierRule> = defaults
        .into_iter()
        .map(|t| {
            let (tier_name, tier_level, default_e, default_b, description) = t;
            let (min_e, min_b) = config_map
                .remove(&tier_name)
                .unwrap_or((default_e, default_b));
            TierRule {
                tier_name,
                tier_level,
                min_monthly_earnings: min_e,
                min_monthly_bookings: min_b,
                description,
            }
        })
        .collect();

    let performance_config = json!({
        "Premium": {
            "min_earnings": tiers_json[0].min_monthly_earnings,
            "min_bookings": tiers_json[0].min_monthly_bookings
        },
        "Core": {
            "min_earnings": tiers_json[1].min_monthly_earnings,
            "min_bookings": tiers_json[1].min_monthly_bookings
        },
        "Growth": {
            "min_earnings": tiers_json[2].min_monthly_earnings,
            "min_bookings": tiers_json[2].min_monthly_bookings
        }
    });

    // 2. Process Talents
    if !resp_talents.status().is_success() {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Talents Error: {}", resp_talents.status()),
        ));
    }
    let text_talents = resp_talents.text().await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Read talents: {}", e),
        )
    })?;
    let talents_json: Vec<serde_json::Value> =
        serde_json::from_str(&text_talents).map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Parse talents: {}", e),
            )
        })?;

    // 3. Process Stats
    if !resp_stats.status().is_success() {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Stats Error: {}", resp_stats.status()),
        ));
    }
    let text_stats = resp_stats.text().await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Read stats: {}", e),
        )
    })?;
    let stats: Vec<PerformanceStats> = serde_json::from_str(&text_stats).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Parse stats: {}", e),
        )
    })?;

    let mut earnings_map: HashMap<String, f64> = HashMap::new();
    let mut bookings_map: HashMap<String, i64> = HashMap::new();
    for s in stats {
        earnings_map.insert(s.talent_id.clone(), s.earnings_cents as f64 / 100.0);
        bookings_map.insert(s.talent_id, s.booking_count);
    }

    // 5. Group Tiers
    let mut groups: HashMap<i32, TierGroup> = HashMap::new();
    for rule in &tiers_json {
        groups.insert(
            rule.tier_level,
            TierGroup {
                name: rule.tier_name.clone(),
                level: rule.tier_level,
                description: rule.description.clone().unwrap_or_default(),
                talents: vec![],
            },
        );
    }

    // Assign Tiers
    for t in talents_json {
        let id = t
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let name = t
            .get("full_legal_name")
            .and_then(|v| v.as_str())
            .unwrap_or("Unknown")
            .to_string();
        let photo = t
            .get("profile_photo_url")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());
        let earnings = *earnings_map.get(&id).unwrap_or(&0.0);
        let booking_count = *bookings_map.get(&id).unwrap_or(&0);

        let mut assigned_tier = &tiers_json[tiers_json.len() - 1]; // Fallback
        for rule in &tiers_json {
            if earnings >= rule.min_monthly_earnings
                && booking_count >= rule.min_monthly_bookings as i64
            {
                assigned_tier = rule;
                break;
            }
        }
        if let Some(group) = groups.get_mut(&assigned_tier.tier_level) {
            group.talents.push(TalentPerformance {
                id,
                name,
                photo_url: photo,
                earnings_30d: earnings,
                bookings_this_month: booking_count,
                tier: assigned_tier.clone(),
            });
        }
    }

    let mut result_tiers: Vec<TierGroup> = groups.into_values().collect();
    result_tiers.sort_by_key(|g| g.level);

    let total_time = start_total.elapsed();
    println!(
        "Performance Tiers: DB parallel fetch took {:?}, Total took {:?}",
        db_time, total_time
    );

    Ok(Json(PerformanceTiersResponse {
        tiers: result_tiers,
        config: Some(performance_config),
    }))
}
