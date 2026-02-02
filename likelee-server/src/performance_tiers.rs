use crate::{auth::AuthUser, config::AppState};
use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Clone)]
pub struct TierRule {
    pub tier_name: String,
    pub tier_level: i32,
    pub min_monthly_earnings: f64,
    pub min_monthly_bookings: i32,
    pub description: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct TierRuleDb {
    pub tier_name: String,
    pub tier_level: i32,
    pub description: Option<String>,
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
    let resp = state
        .pg
        .from("agencies")
        .eq("id", &auth_user.id)
        .update(json!({"performance_config": payload.config}).to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        let friendly_msg = serde_json::from_str::<serde_json::Value>(&text)
            .ok()
            .and_then(|v| v.get("message").and_then(|m| m.as_str()).map(|s| s.to_string()))
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
    let agency_id = &auth_user.id;

    // 1. Fetch Tier Definitions
    let resp = state
        .pg
        .from("performance_tiers")
        .order("tier_level.asc")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    
    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        let friendly_msg = serde_json::from_str::<serde_json::Value>(&text)
            .ok()
            .and_then(|v| v.get("message").and_then(|m| m.as_str()).map(|s| s.to_string()))
            .unwrap_or_else(|| text.clone());

        return Err((
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
            format!("Tiers Error: {}", friendly_msg),
        ));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let tiers_db: Vec<TierRuleDb> = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Parse error (tiers): {}", e)))?;

    // Map to TierRule with system defaults
    let mut tiers_json: Vec<TierRule> = tiers_db
        .into_iter()
        .map(|t| {
            let (def_e, def_b) = match t.tier_name.as_str() {
                "Premium" => (5000.0, 8),
                "Core" => (2500.0, 5),
                "Growth" => (500.0, 1),
                _ => (0.0, 0),
            };
            TierRule {
                tier_name: t.tier_name,
                tier_level: t.tier_level,
                min_monthly_earnings: def_e,
                min_monthly_bookings: def_b,
                description: t.description,
            }
        })
        .collect();

    // 1b. Fetch Agency Custom Config
    let resp = state
        .pg
        .from("agencies")
        .select("performance_config")
        .eq("id", agency_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        let friendly_msg = serde_json::from_str::<serde_json::Value>(&text)
            .ok()
            .and_then(|v| v.get("message").and_then(|m| m.as_str()).map(|s| s.to_string()))
            .unwrap_or_else(|| text.clone());

        return Err((
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
            format!("Agency Config Error: {}", friendly_msg),
        ));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let agency_data: Vec<serde_json::Value> = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Parse error (agency): {}", e)))?;

    let performance_config = agency_data
        .first()
        .and_then(|r| r.get("performance_config"))
        .cloned();

    if let Some(config) = performance_config.as_ref().and_then(|v| v.as_object()) {
        for rule in &mut tiers_json {
            if let Some(c) = config.get(&rule.tier_name) {
                if let Some(e) = c.get("min_earnings").and_then(|v| v.as_f64()) {
                    rule.min_monthly_earnings = e;
                }
                if let Some(b) = c.get("min_bookings").and_then(|v| v.as_i64()) {
                    rule.min_monthly_bookings = b as i32;
                }
            }
        }
    }

    // 2. Fetch Talents
    let resp = state
        .pg
        .from("agency_users")
        .select("id, full_legal_name, profile_photo_url")
        .eq("agency_id", agency_id)
        .eq("role", "talent")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        let friendly_msg = serde_json::from_str::<serde_json::Value>(&text)
            .ok()
            .and_then(|v| v.get("message").and_then(|m| m.as_str()).map(|s| s.to_string()))
            .unwrap_or_else(|| text.clone());

        return Err((
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
            format!("Talents Error: {}", friendly_msg),
        ));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let talents_json: Vec<serde_json::Value> = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Parse error (talents): {}", e)))?;

    // 3. Calculate Real-Time Metrics via RPC
    let now = chrono::Utc::now();
    let month_start = now.format("%Y-%m-01").to_string();
    let thirty_days_ago = (now - chrono::Duration::days(30)).format("%Y-%m-%d").to_string();

    let resp = state
        .pg
        .rpc("get_agency_performance_stats", json!({
            "p_agency_id": agency_id,
            "p_earnings_start_date": thirty_days_ago,
            "p_bookings_start_date": month_start,
        }).to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        
        // Try to parse friendly message from Supabase error JSON
        let friendly_msg = serde_json::from_str::<serde_json::Value>(&text)
            .ok()
            .and_then(|v| v.get("message").and_then(|m| m.as_str()).map(|s| s.to_string()))
            .unwrap_or_else(|| text.clone());

        return Err((
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
            format!("Dashboard Error: {}", friendly_msg),
        ));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let stats: Vec<PerformanceStats> = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Parse error (stats): {}", e)))?;

    let mut earnings_map: HashMap<String, f64> = HashMap::new();
    let mut bookings_map: HashMap<String, i64> = HashMap::new();
    
    for s in stats {
        earnings_map.insert(s.talent_id.clone(), s.earnings_cents as f64 / 100.0);
        bookings_map.insert(s.talent_id, s.booking_count);
    }

    // 4. Group Tiers
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

    // 5. Assign Tiers in-memory (No database updates here for speed)
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

        let mut assigned_tier = &tiers_json[tiers_json.len() - 1]; // Fallback to last (Inactive)

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

    Ok(Json(PerformanceTiersResponse {
        tiers: result_tiers,
        config: performance_config,
    }))
}
