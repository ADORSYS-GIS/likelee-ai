use crate::{auth::AuthUser, config::AppState};
use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};
use serde_json::json;
use serde_json::Value;
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
    pub payout_percent: f64,
}

#[derive(Serialize, Deserialize)]
pub struct TierConfigDb {
    pub tier_name: String,
    pub min_monthly_earnings: f64,
    pub min_monthly_bookings: i32,
    pub payout_percent: f64,
}

#[derive(Serialize, Deserialize)]
pub struct TierRuleDb {
    pub tier_name: String,
    pub tier_level: i32,
    pub description: Option<String>,
    pub payout_percent: f64,
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
    pub payout_percent: f64,
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
    pub commission_rate: f64,
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

#[derive(Serialize)]
pub struct TalentPayoutWeight {
    pub talent_id: String,
    pub name: String,
    pub photo_url: Option<String>,
    pub earnings_30d: f64,
    pub bookings_this_month: i64,
    pub tier_name: String,
    pub payout_percent: f64,
}

#[derive(Serialize)]
pub struct AgencyPayoutWeightsResponse {
    pub items: Vec<TalentPayoutWeight>,
}

pub async fn configure_performance_tiers(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<ConfigurePerformanceRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let mut commission_config = serde_json::Map::new();
    let config_obj = payload.config.as_object().ok_or((
        StatusCode::BAD_REQUEST,
        "Invalid config payload".to_string(),
    ))?;

    for (tier_name, tier_cfg) in config_obj {
        if let Some(tier_obj) = tier_cfg.as_object() {
            if let Some(v) = tier_obj.get("commission_rate") {
                let mut next_commission = serde_json::Map::new();
                next_commission.insert("commission_rate".to_string(), v.clone());
                commission_config.insert(tier_name.clone(), Value::Object(next_commission));
            }
        }
    }

    let update_payload = json!({
        "performance_commission_config": Value::Object(commission_config)
    });

    // Update agencies table (Legacy/Analytics config)
    let _ = state
        .pg
        .from("agencies")
        .eq("id", &auth_user.id)
        .update(update_payload.to_string())
        .execute()
        .await;

    // Table-based tiers update (New architecture)
    let defaults = [
        ("Premium", 5000.0_f64, 8_i32, 40.0_f64),
        ("Core", 2500.0_f64, 5_i32, 30.0_f64),
        ("Growth", 500.0_f64, 1_i32, 20.0_f64),
        ("Inactive", 0.0_f64, 0_i32, 10.0_f64),
    ];

    let rows: Vec<serde_json::Value> = defaults
        .iter()
        .map(|(name, default_e, default_b, default_pct)| {
            let tier_cfg = config_obj.get(*name).and_then(|v| v.as_object());
            let min_earnings = tier_cfg
                .and_then(|v| v.get("min_earnings"))
                .and_then(|v| v.as_f64())
                .unwrap_or(*default_e);
            let min_bookings = tier_cfg
                .and_then(|v| v.get("min_bookings"))
                .and_then(|v| v.as_i64())
                .map(|v| v as i32)
                .unwrap_or(*default_b);
            let payout_percent = tier_cfg
                .and_then(|v| v.get("payout_percent"))
                .and_then(|v| v.as_f64())
                .unwrap_or(*default_pct);

            json!({
                "agency_id": auth_user.id,
                "tier_name": name,
                "min_monthly_earnings": min_earnings,
                "min_monthly_bookings": min_bookings,
                "payout_percent": payout_percent,
                "updated_at": chrono::Utc::now().to_rfc3339(),
            })
        })
        .collect();

    // Replace existing rows
    let _ = state
        .pg
        .from("performance_tiers")
        .eq("agency_id", &auth_user.id)
        .delete()
        .execute()
        .await;

    let _ = state
        .pg
        .from("performance_tiers")
        .insert(json!(rows).to_string())
        .execute()
        .await;

    Ok(Json(json!({ "ok": true })))
}

pub async fn get_performance_tiers(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<PerformanceTiersResponse>, (StatusCode, String)> {
    let start_total = Instant::now();
    let agency_id = &auth_user.id;

    // Parallelize calls
    let (resp_tiers_db, resp_talents, resp_stats, resp_agency) = tokio::try_join!(
        state
            .pg
            .from("performance_tiers")
            .eq("agency_id", agency_id)
            .select("tier_name,min_monthly_earnings,min_monthly_bookings,payout_percent")
            .execute(),
        state
            .pg
            .from("agency_users")
            .eq("agency_id", agency_id)
            .eq("role", "talent")
            .limit(500)
            .select(
                "id, full_legal_name, profile_photo_url, talent_commissions!left(commission_rate)"
            )
            .execute(),
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
        },
        state
            .pg
            .from("agencies")
            .select("performance_commission_config")
            .eq("id", agency_id)
            .execute()
    )
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let _db_time = start_total.elapsed();

    // Process Tiers Config
    let text_tiers = resp_tiers_db
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let tiers_db: Vec<TierConfigDb> = serde_json::from_str(&text_tiers).unwrap_or_default();
    let mut config_map: HashMap<String, (f64, i32, f64)> = tiers_db
        .into_iter()
        .map(|r| {
            (
                r.tier_name,
                (
                    r.min_monthly_earnings,
                    r.min_monthly_bookings,
                    r.payout_percent,
                ),
            )
        })
        .collect();

    let defaults: [(String, i32, f64, i32, Option<String>, f64); 4] = [
        (
            "Premium".to_string(),
            1,
            5000.0_f64,
            8_i32,
            Some("Top-performing talent with highest earnings and booking frequency".to_string()),
            40.0_f64,
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
            30.0_f64,
        ),
        (
            "Growth".to_string(),
            3,
            500.0_f64,
            1_i32,
            Some("Developing talent with moderate activity".to_string()),
            20.0_f64,
        ),
        (
            "Inactive".to_string(),
            4,
            0.0_f64,
            0_i32,
            Some("Talent requiring attention or inactive".to_string()),
            10.0_f64,
        ),
    ];

    let mut tiers_json: Vec<TierRule> = defaults
        .into_iter()
        .map(
            |(tier_name, tier_level, default_e, default_b, description, default_pct)| {
                let (min_e, min_b, payout_percent) =
                    config_map
                        .remove(&tier_name)
                        .unwrap_or((default_e, default_b, default_pct));
                TierRule {
                    tier_name,
                    tier_level,
                    min_monthly_earnings: min_e,
                    min_monthly_bookings: min_b,
                    commission_rate: 0.0,
                    description,
                    payout_percent,
                }
            },
        )
        .collect();

    // Capture Agency Config for Commissions
    let text_agency = resp_agency
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let agency_data: Vec<serde_json::Value> =
        serde_json::from_str(&text_agency).unwrap_or_default();
    let performance_commission_config = agency_data
        .first()
        .and_then(|r| r.get("performance_commission_config"))
        .cloned();

    if let Some(config) = performance_commission_config
        .as_ref()
        .and_then(|v| v.as_object())
    {
        for rule in &mut tiers_json {
            if let Some(c) = config.get(&rule.tier_name) {
                if let Some(r) = c.get("commission_rate").and_then(|v| v.as_f64()) {
                    rule.commission_rate = r;
                }
            }
        }
    }

    // Process Stats
    let text_stats = resp_stats.text().await.unwrap_or_else(|_| "[]".to_string());
    let stats: Vec<PerformanceStats> = serde_json::from_str(&text_stats).unwrap_or_default();
    let mut earnings_map: HashMap<String, f64> = HashMap::new();
    let mut bookings_map: HashMap<String, i64> = HashMap::new();
    for s in stats {
        earnings_map.insert(s.talent_id.clone(), s.earnings_cents as f64 / 100.0);
        bookings_map.insert(s.talent_id, s.booking_count);
    }

    // Process Talents
    let text_talents = resp_talents
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let talents_json: Vec<serde_json::Value> =
        serde_json::from_str(&text_talents).unwrap_or_default();

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
                payout_percent: rule.payout_percent,
                talents: vec![],
            },
        );
    }

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

        let mut assigned_tier = &tiers_json[tiers_json.len() - 1];
        for rule in &tiers_json {
            if earnings >= rule.min_monthly_earnings
                && booking_count >= rule.min_monthly_bookings as i64
            {
                assigned_tier = rule;
                break;
            }
        }

        if let Some(group) = groups.get_mut(&assigned_tier.tier_level) {
            let custom_rate = t.get("talent_commissions").and_then(|v| {
                if v.is_array() {
                    v.as_array()?.first()?.get("commission_rate")?.as_f64()
                } else {
                    v.get("commission_rate")?.as_f64()
                }
            });
            let final_rate = custom_rate.unwrap_or(assigned_tier.commission_rate);

            group.talents.push(TalentPerformance {
                id: id.clone(),
                name,
                photo_url: photo,
                earnings_30d: earnings,
                bookings_this_month: booking_count,
                tier: assigned_tier.clone(),
                commission_rate: final_rate,
                is_custom_rate: custom_rate.is_some(),
            });
        }

        let tier_body = serde_json::json!({ "performance_tier_name": assigned_tier.tier_name });
        let _ = state
            .pg
            .from("agency_users")
            .eq("id", &id)
            .eq("agency_id", agency_id)
            .update(tier_body.to_string())
            .execute()
            .await;
    }

    let mut result_tiers: Vec<TierGroup> = groups.into_values().collect();
    result_tiers.sort_by_key(|g| g.level);

    let merged_config = {
        let mut out = serde_json::Map::new();
        for rule in &tiers_json {
            let mut tier_obj = serde_json::Map::new();
            tier_obj.insert("min_earnings".to_string(), json!(rule.min_monthly_earnings));
            tier_obj.insert("min_bookings".to_string(), json!(rule.min_monthly_bookings));
            tier_obj.insert("payout_percent".to_string(), json!(rule.payout_percent));
            tier_obj.insert("commission_rate".to_string(), json!(rule.commission_rate));
            out.insert(rule.tier_name.clone(), Value::Object(tier_obj));
        }
        Value::Object(out)
    };

    Ok(Json(PerformanceTiersResponse {
        tiers: result_tiers,
        config: Some(merged_config),
    }))
}

pub async fn update_talent_commission(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<UpdateTalentCommissionRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    let agency_id = &auth_user.id;

    let (resp_user, resp_tiers_db, resp_agency, resp_stats) = tokio::try_join!(
        state.pg.from("talent_commissions").select("commission_rate").eq("talent_id", &payload.talent_id).eq("agency_id", agency_id).limit(1).execute(),
        state.pg.from("performance_tiers").eq("agency_id", agency_id).select("tier_name,min_monthly_earnings,min_monthly_bookings,payout_percent").execute(),
        state.pg.from("agencies").select("performance_commission_config").eq("id", agency_id).execute(),
        async {
            let now = chrono::Utc::now();
            let month_start = now.format("%Y-%m-01").to_string();
            state.pg.rpc("get_agency_performance_stats", json!({ "p_agency_id": agency_id, "p_earnings_start_date": month_start, "p_bookings_start_date": month_start }).to_string()).execute().await
        }
    ).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text_user = resp_user.text().await.unwrap_or_else(|_| "[]".to_string());
    let user_data: Vec<serde_json::Value> = serde_json::from_str(&text_user).unwrap_or_default();
    let _old_custom_rate = user_data
        .first()
        .and_then(|v| v.get("commission_rate"))
        .and_then(|v| v.as_f64());

    let text_tiers = resp_tiers_db
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let tiers_db: Vec<TierConfigDb> = serde_json::from_str(&text_tiers).unwrap_or_default();
    let mut config_map: HashMap<String, (f64, i32, f64)> = tiers_db
        .into_iter()
        .map(|r| {
            (
                r.tier_name,
                (
                    r.min_monthly_earnings,
                    r.min_monthly_bookings,
                    r.payout_percent,
                ),
            )
        })
        .collect();

    let defaults: [(String, i32, f64, i32, Option<String>, f64); 4] = [
        ("Premium".to_string(), 1, 5000.0, 8, None, 40.0),
        ("Core".to_string(), 2, 2500.0, 5, None, 30.0),
        ("Growth".to_string(), 3, 500.0, 1, None, 20.0),
        ("Inactive".to_string(), 4, 0.0, 0, None, 10.0),
    ];

    let mut tiers: Vec<TierRule> = defaults
        .into_iter()
        .map(
            |(tier_name, tier_level, default_e, default_b, description, default_pct)| {
                let (min_e, min_b, payout_percent) =
                    config_map
                        .remove(&tier_name)
                        .unwrap_or((default_e, default_b, default_pct));
                TierRule {
                    tier_name,
                    tier_level,
                    min_monthly_earnings: min_e,
                    min_monthly_bookings: min_b,
                    commission_rate: 0.0,
                    description,
                    payout_percent,
                }
            },
        )
        .collect();

    let text_agency = resp_agency
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let agency_data: Vec<serde_json::Value> =
        serde_json::from_str(&text_agency).unwrap_or_default();
    let commission_config = agency_data
        .first()
        .and_then(|r| r.get("performance_commission_config"))
        .and_then(|v| v.as_object());

    if let Some(config) = commission_config {
        for t in &mut tiers {
            if let Some(c) = config.get(&t.tier_name) {
                if let Some(r) = c.get("commission_rate").and_then(|v| v.as_f64()) {
                    t.commission_rate = r;
                }
            }
        }
    }

    let stats_all: Vec<PerformanceStats> =
        serde_json::from_str(&resp_stats.text().await.unwrap_or_default()).unwrap_or_default();
    let talent_stats = stats_all.iter().find(|s| s.talent_id == payload.talent_id);
    let earnings = talent_stats
        .map(|s| s.earnings_cents as f64 / 100.0)
        .unwrap_or(0.0);
    let bookings = talent_stats.map(|s| s.booking_count).unwrap_or(0);

    let mut assigned_tier = &tiers[tiers.len() - 1];
    for rule in &tiers {
        if earnings >= rule.min_monthly_earnings && bookings >= rule.min_monthly_bookings as i64 {
            assigned_tier = rule;
            break;
        }
    }
    let default_tier_rate = assigned_tier.commission_rate;
    let new_rate_to_log = payload.custom_rate.unwrap_or(default_tier_rate);

    let _ = state.pg.from("talent_commissions").upsert(json!({"talent_id": payload.talent_id, "agency_id": agency_id, "commission_rate": new_rate_to_log, "updated_at": chrono::Utc::now().to_rfc3339()}).to_string()).on_conflict("talent_id, agency_id").execute().await;
    let _ = state.pg.from("talent_commission_history").insert(json!({"talent_id": payload.talent_id, "commission_rate": new_rate_to_log, "agency_id": agency_id}).to_string()).execute().await;

    Ok(StatusCode::OK)
}

pub async fn get_commission_history(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<Vec<CommissionHistoryLog>>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("licensing_payouts")
        .select("id, commission_rate, paid_at, agency_users:talent_id(full_legal_name)")
        .eq("agency_id", &auth_user.id)
        .order("paid_at.desc")
        .limit(50)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp.text().await.unwrap_or_else(|_| "[]".to_string());
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
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
                id: r
                    .get("id")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                talent_name,
                commission_rate: r
                    .get("commission_rate")
                    .and_then(|v| v.as_f64())
                    .unwrap_or(0.0),
                changed_by_name: Some("System (Payout)".to_string()),
                changed_at: r
                    .get("paid_at")
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
    let resp = state.pg.from("payments").eq("agency_id", agency_id).eq("status", "succeeded").select("id, created_at, gross_cents, talent_earnings_cents, agency_users:talent_id(full_legal_name), brands:brand_id(name)").order("created_at.desc").limit(50).execute().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp.text().await.unwrap_or_else(|_| "[]".to_string());
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();

    let breakdowns: Vec<CommissionBreakdown> = rows
        .into_iter()
        .map(|row| {
            let id = row
                .get("id")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string();
            let date = row
                .get("created_at")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string();
            let gross_cents = row.get("gross_cents").and_then(|v| v.as_i64()).unwrap_or(0);
            let talent_cents = row
                .get("talent_earnings_cents")
                .and_then(|v| v.as_i64())
                .unwrap_or(0);
            let total_value = gross_cents as f64 / 100.0;
            let talent_share = talent_cents as f64 / 100.0;
            let agency_share = (gross_cents - talent_cents) as f64 / 100.0;
            let commission_percentage = if total_value > 0.0 {
                (agency_share / total_value) * 100.0
            } else {
                0.0
            };
            let talent_name = row
                .get("agency_users")
                .and_then(|v| v.get("full_legal_name"))
                .and_then(|v| v.as_str())
                .unwrap_or("Unknown")
                .to_string();
            let brand_name = row
                .get("brands")
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
        })
        .collect();

    Ok(Json(breakdowns))
}

pub async fn get_agency_payout_weights(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<AgencyPayoutWeightsResponse>, (StatusCode, String)> {
    let agency_id = &auth_user.id;
    let (resp_talents, resp_stats, resp_tiers) = tokio::try_join!(
        state.pg.from("agency_users").select("id, full_legal_name, stage_name, profile_photo_url, performance_tier_name").eq("agency_id", agency_id).eq("role", "talent").execute(),
        async {
            let now = chrono::Utc::now();
            let month_start = now.format("%Y-%m-01").to_string();
            state.pg.rpc("get_agency_performance_stats", json!({ "p_agency_id": agency_id, "p_earnings_start_date": month_start, "p_bookings_start_date": month_start }).to_string()).execute().await
        },
        state.pg.from("performance_tiers").select("tier_name,payout_percent").eq("agency_id", agency_id).execute()
    ).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let talents_text = resp_talents
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let talents: Vec<serde_json::Value> = serde_json::from_str(&talents_text).unwrap_or_default();
    let stats_text = resp_stats
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let stats: Vec<PerformanceStats> = serde_json::from_str(&stats_text).unwrap_or_default();
    let tiers_text = resp_tiers
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let tiers_rows: Vec<serde_json::Value> = serde_json::from_str(&tiers_text).unwrap_or_default();

    let mut payout_percent_by_tier: HashMap<String, f64> = HashMap::new();
    for r in tiers_rows {
        let name = r.get("tier_name").and_then(|v| v.as_str()).unwrap_or("");
        let pct = r
            .get("payout_percent")
            .and_then(|v| v.as_f64())
            .unwrap_or(25.0);
        if !name.is_empty() {
            payout_percent_by_tier.insert(name.to_string(), pct);
        }
    }

    let mut earnings_map: HashMap<String, f64> = HashMap::new();
    let mut bookings_map: HashMap<String, i64> = HashMap::new();
    for s in stats {
        earnings_map.insert(s.talent_id.clone(), s.earnings_cents as f64 / 100.0);
        bookings_map.insert(s.talent_id, s.booking_count);
    }

    let mut items: Vec<TalentPayoutWeight> = Vec::new();
    for t in talents {
        let id = t
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        if id.is_empty() {
            continue;
        }
        let name = t
            .get("full_legal_name")
            .or_else(|| t.get("stage_name"))
            .and_then(|v| v.as_str())
            .unwrap_or("Unknown")
            .to_string();
        let photo_url = t
            .get("profile_photo_url")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());
        let earnings = *earnings_map.get(&id).unwrap_or(&0.0);
        let bookings = *bookings_map.get(&id).unwrap_or(&0);
        let tier_name = t
            .get("performance_tier_name")
            .and_then(|v| v.as_str())
            .filter(|s| !s.trim().is_empty())
            .unwrap_or("Inactive")
            .to_string();
        let payout_percent = payout_percent_by_tier
            .get(&tier_name)
            .copied()
            .unwrap_or(25.0);

        items.push(TalentPayoutWeight {
            talent_id: id,
            name,
            photo_url,
            earnings_30d: earnings,
            bookings_this_month: bookings,
            tier_name,
            payout_percent,
        });
    }

    items.sort_by(|a, b| {
        b.payout_percent
            .partial_cmp(&a.payout_percent)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    Ok(Json(AgencyPayoutWeightsResponse { items }))
}
