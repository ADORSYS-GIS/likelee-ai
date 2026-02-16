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
    pub commission_rate: f64,
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
    pub commission_rate: f64,
    pub is_custom_rate: bool,
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
    pub commission_rate: f64,
    pub min_monthly_earnings: f64,
    pub min_monthly_bookings: i32,
    pub talents: Vec<TalentPerformance>,
}

#[derive(Deserialize)]
pub struct ConfigurePerformanceRequest {
    pub config: serde_json::Value,
}

#[derive(Serialize)]
pub struct CommissionHistoryLog {
    pub id: String,
    pub talent_name: String,
    pub old_rate: Option<f64>,
    pub new_rate: f64,
    pub changed_by_name: Option<String>,
    pub changed_at: String,
}

#[derive(Deserialize)]
pub struct UpdateTalentCommissionRequest {
    pub talent_id: String,
    pub custom_rate: Option<f64>,
}

#[derive(Deserialize)]
pub struct PerformanceStats {
    pub talent_id: String,
    pub earnings_cents: i64,
    pub booking_count: i64,
}

#[derive(Serialize)]
pub struct CommissionBreakdown {
    pub id: String,
    pub talent_name: String,
    pub brand_name: String,
    pub date: String,
    pub total_value: f64,
    pub talent_share: f64,
    pub agency_share: f64,
    pub commission_percentage: f64,
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

    // Parallelize the 4 main database/RPC calls
    let (resp_tiers, resp_config, resp_talents, resp_stats) = tokio::try_join!(
        // 1. Fetch Tier Definitions
        state
            .pg
            .from("performance_tiers")
            .order("tier_level.asc")
            .execute(),
        // 2. Fetch Agency Custom Config
        state
            .pg
            .from("agencies")
            .select("performance_config")
            .eq("id", agency_id)
            .execute(),
        // 3. Fetch Talents (Limit increased to 500 to avoid 10-talent cap)
        state
            .pg
            .from("agency_users")
            .eq("agency_id", agency_id)
            .eq("role", "talent")
            .limit(500)
            .select("id, full_legal_name, profile_photo_url, custom_commission_rate")
            .execute(),
        // 4. Calculate Real-Time Metrics via RPC
        async {
            let now = chrono::Utc::now();
            let month_start = now.format("%Y-%m-01").to_string();
            let thirty_days_ago = (now - chrono::Duration::days(30))
                .format("%Y-%m-%d")
                .to_string();
            state
                .pg
                .rpc(
                    "get_agency_performance_stats",
                    json!({
                        "p_agency_id": agency_id,
                        "p_earnings_start_date": thirty_days_ago,
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

    // 1. Process Tiers
    if !resp_tiers.status().is_success() {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Tiers Error: {}", resp_tiers.status()),
        ));
    }
    let text_tiers = resp_tiers.text().await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Read tiers: {}", e),
        )
    })?;
    let tiers_db: Vec<TierRuleDb> = serde_json::from_str(&text_tiers).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Parse tiers: {}", e),
        )
    })?;

    let mut tiers_json: Vec<TierRule> = tiers_db
        .into_iter()
        .map(|t| {
            TierRule {
                tier_name: t.tier_name,
                tier_level: t.tier_level,
                min_monthly_earnings: 0.0, // Will be set from config
                min_monthly_bookings: 0, // Will be set from config
                commission_rate: 0.0, // Will be set from config
                description: t.description,
            }
        })
        .collect();

    // 2. Process Agency Config
    if !resp_config.status().is_success() {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Config Error: {}", resp_config.status()),
        ));
    }
    let text_config = resp_config.text().await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Read config: {}", e),
        )
    })?;
    let agency_data: Vec<serde_json::Value> = serde_json::from_str(&text_config).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Parse config: {}", e),
        )
    })?;
    let performance_config = agency_data
        .first()
        .and_then(|r| r.get("performance_config"))
        .cloned();

    // Apply configuration from agency's performance_config
    if let Some(config) = performance_config.as_ref().and_then(|v| v.as_object()) {
        for rule in &mut tiers_json {
            if let Some(c) = config.get(&rule.tier_name) {
                if let Some(e) = c.get("min_earnings").and_then(|v| v.as_f64()) {
                    rule.min_monthly_earnings = e;
                }
                if let Some(b) = c.get("min_bookings").and_then(|v| v.as_i64()) {
                    rule.min_monthly_bookings = b as i32;
                }
                if let Some(r) = c.get("commission_rate").and_then(|v| v.as_f64()) {
                    rule.commission_rate = r;
                }
            }
        }
    }

    // 3. Process Talents
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

    // 4. Process Stats
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
                commission_rate: rule.commission_rate,
                min_monthly_earnings: rule.min_monthly_earnings,
                min_monthly_bookings: rule.min_monthly_bookings,
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
            let custom_rate = t.get("custom_commission_rate").and_then(|v| v.as_f64());
            let final_rate = custom_rate.unwrap_or(assigned_tier.commission_rate);

            group.talents.push(TalentPerformance {
                id,
                name,
                photo_url: photo,
                earnings_30d: earnings,
                bookings_this_month: booking_count,
                tier: assigned_tier.clone(),
                commission_rate: final_rate,
                is_custom_rate: custom_rate.is_some(),
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
        config: performance_config,
    }))
}

pub async fn update_talent_commission(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<UpdateTalentCommissionRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    let agency_id = &auth_user.id;

    // 1. Fetch current status and tiers/config for effective rate calculation
    let (resp_user, resp_tiers, resp_config, resp_stats) = tokio::try_join!(
        state
            .pg
            .from("agency_users")
            .select("custom_commission_rate")
            .eq("id", &payload.talent_id)
            .eq("agency_id", agency_id)
            .single()
            .execute(),
        state
            .pg
            .from("performance_tiers")
            .order("tier_level.asc")
            .execute(),
        state
            .pg
            .from("agencies")
            .select("performance_config")
            .eq("id", agency_id)
            .execute(),
        async {
            let now = chrono::Utc::now();
            let month_start = now.format("%Y-%m-01").to_string();
            let thirty_days_ago = (now - chrono::Duration::days(30))
                .format("%Y-%m-%d")
                .to_string();
            state
                .pg
                .rpc(
                    "get_agency_performance_stats",
                    json!({
                        "p_agency_id": agency_id,
                        "p_earnings_start_date": thirty_days_ago,
                        "p_bookings_start_date": month_start,
                    })
                    .to_string(),
                )
                .execute()
                .await
        }
    )
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Current custom rate
    let current_user_json: serde_json::Value =
        serde_json::from_str(&resp_user.text().await.unwrap_or_default()).unwrap_or(json!({}));
    let old_custom_rate = current_user_json
        .get("custom_commission_rate")
        .and_then(|v| v.as_f64());

    // Parse Tiers
    let tiers_db: Vec<TierRuleDb> =
        serde_json::from_str(&resp_tiers.text().await.unwrap_or_default()).unwrap_or_default();
    let mut tiers: Vec<TierRule> = tiers_db
        .into_iter()
        .map(|t| {
            TierRule {
                tier_name: t.tier_name,
                tier_level: t.tier_level,
                min_monthly_earnings: 0.0, // Will be set from config
                min_monthly_bookings: 0, // Will be set from config
                commission_rate: 0.0, // Will be set from config
                description: t.description,
            }
        })
        .collect();

    // Parse Config
    let config_data: Vec<serde_json::Value> =
        serde_json::from_str(&resp_config.text().await.unwrap_or_default()).unwrap_or_default();
    if let Some(config) = config_data
        .first()
        .and_then(|r| r.get("performance_config"))
        .and_then(|v| v.as_object())
    {
        for t in &mut tiers {
            if let Some(c) = config.get(&t.tier_name) {
                if let Some(e) = c.get("min_earnings").and_then(|v| v.as_f64()) {
                    t.min_monthly_earnings = e;
                }
                if let Some(b) = c.get("min_bookings").and_then(|v| v.as_i64()) {
                    t.min_monthly_bookings = b as i32;
                }
                if let Some(r) = c.get("commission_rate").and_then(|v| v.as_f64()) {
                    t.commission_rate = r;
                }
            }
        }
    }

    // Parse Stats for THIS talent
    let stats_all: Vec<PerformanceStats> =
        serde_json::from_str(&resp_stats.text().await.unwrap_or_default()).unwrap_or_default();
    let talent_stats = stats_all.iter().find(|s| s.talent_id == payload.talent_id);
    let earnings = talent_stats
        .map(|s| s.earnings_cents as f64 / 100.0)
        .unwrap_or(0.0);
    let bookings = talent_stats.map(|s| s.booking_count).unwrap_or(0);

    // Current Assigned Tier Default Rate
    let mut assigned_tier = &tiers[tiers.len() - 1]; // Inactive fallback
    for rule in &tiers {
        if earnings >= rule.min_monthly_earnings && bookings >= rule.min_monthly_bookings as i64 {
            assigned_tier = rule;
            break;
        }
    }
    let default_tier_rate = assigned_tier.commission_rate;
    let old_effective_rate = old_custom_rate.unwrap_or(default_tier_rate);

    // 2. Determine new rate to store in history (NOT NULL requirement)
    let new_rate_to_log = payload.custom_rate.unwrap_or(default_tier_rate);

    // 3. Check if actually changed from CURRENT EFFECTIVE rate OR custom state changed
    if old_effective_rate == new_rate_to_log && old_custom_rate == payload.custom_rate {
        return Ok(StatusCode::OK);
    }

    // 4. Update Database
    let update_body = if let Some(rate) = payload.custom_rate {
        json!({ "custom_commission_rate": rate })
    } else {
        json!({ "custom_commission_rate": serde_json::Value::Null })
    };

    let update_resp = state
        .pg
        .from("agency_users")
        .eq("id", &payload.talent_id)
        .eq("agency_id", agency_id)
        .update(update_body.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !update_resp.status().is_success() {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!(
                "Failed to update commission rate: {}",
                update_resp.status()
            ),
        ));
    }

    // 5. Log History (Always log if we got here, as we checked for changes above)
    let history_entry = json!({
        "agency_user_id": payload.talent_id,
        "old_rate": old_effective_rate, // Use effective rate for history clarity
        "new_rate": new_rate_to_log,
        "changed_by": auth_user.id,
        "agency_id": agency_id
    });

    let _ = state
        .pg
        .from("talent_commission_history")
        .insert(history_entry.to_string())
        .execute()
        .await;

    Ok(StatusCode::OK)

}

pub async fn get_commission_history(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<Vec<CommissionHistoryLog>>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("talent_commission_history")
        .select("id, old_rate, new_rate, changed_at, agency_users!talent_commission_history_agency_user_id_fkey(full_legal_name)")
        .eq("agency_id", &auth_user.id)
        .order("changed_at.desc")
        .limit(50)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp.text().await.unwrap_or_else(|_| "[]".to_string());
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or(vec![]);
    let empty_obj = json!({});

    let logs: Vec<CommissionHistoryLog> = rows
        .iter()
        .map(|r| {
            let talent_obj = r.get("agency_users").unwrap_or(&empty_obj);
            let talent_name = talent_obj
                .get("full_legal_name")
                .and_then(|v| v.as_str())
                .unwrap_or("Unknown")
                .to_string();

            CommissionHistoryLog {
                id: r.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                talent_name,
                old_rate: r.get("old_rate").and_then(|v| v.as_f64()),
                new_rate: r.get("new_rate").and_then(|v| v.as_f64()).unwrap_or(0.0),
                changed_by_name: Some("Agency Admin".to_string()),
                changed_at: r
                    .get("changed_at")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
            }
        })
        .collect();


    Ok(Json(logs))
}
pub async fn get_commission_breakdowns(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<Vec<CommissionBreakdown>>, (StatusCode, String)> {
    let agency_id = &auth_user.id;

    // Fetch payments joined with talent and brand names
    let resp = state
        .pg
        .from("payments")
        .eq("agency_id", agency_id)
        .eq("status", "succeeded")
        .select("id, created_at, gross_cents, talent_earnings_cents, agency_users:talent_id(full_legal_name), brands:brand_id(name)")
        .order("created_at.desc")
        .limit(50)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Payments Error: {}", resp.status()),
        ));
    }

    let text = resp.text().await.unwrap_or_else(|_| "[]".to_string());
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();

    let breakdowns: Vec<CommissionBreakdown> = rows.into_iter().map(|row| {
        let id = row.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
        let date = row.get("created_at").and_then(|v| v.as_str()).unwrap_or_default().to_string();
        
        let gross_cents = row.get("gross_cents").and_then(|v| v.as_i64()).unwrap_or(0);
        let talent_cents = row.get("talent_earnings_cents").and_then(|v| v.as_i64()).unwrap_or(0);
        
        let total_value = gross_cents as f64 / 100.0;
        let talent_share = talent_cents as f64 / 100.0;
        let agency_share = (gross_cents - talent_cents) as f64 / 100.0;
        
        let commission_percentage = if total_value > 0.0 {
            (agency_share / total_value) * 100.0
        } else {
            0.0
        };

        let talent_name = row.get("agency_users")
            .and_then(|v| v.get("full_legal_name"))
            .and_then(|v| v.as_str())
            .unwrap_or("Unknown")
            .to_string();
            
        let brand_name = row.get("brands")
            .and_then(|v| v.get("name"))
            .and_then(|v| v.as_str())
            .unwrap_or("Direct Project")
            .to_string();

        CommissionBreakdown {
            id,
            talent_name,
            brand_name,
            date,
            total_value,
            talent_share,
            agency_share,
            commission_percentage,
        }
    }).collect();

    Ok(Json(breakdowns))
}
