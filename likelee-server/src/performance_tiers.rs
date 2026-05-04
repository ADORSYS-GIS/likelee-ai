use crate::{
    auth::{AuthUser, RoleGuard},
    config::AppState,
};
use axum::{extract::{Query, State}, http::StatusCode, Json};
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
    pub creator_id: Option<String>,
    pub name: String,
    pub photo_url: Option<String>,
    pub earnings_30d: f64,
    pub bookings_this_month: i64,
    /// Signed licensing deals this month (AI mode equivalent of bookings_this_month).
    pub licensing_deals_this_month: i64,
    pub tier: TierRule,
    pub commission_rate: f64,
    pub is_custom_rate: bool,
    pub relationship_type: String,
    pub commission_source: String,
    pub is_editable: bool,
    /// True only when the talent has completed portal onboarding AND
    /// their KYC is approved in the creators table.
    pub is_verified: bool,
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

#[derive(Deserialize, Serialize, Clone)]
pub struct UpdateTalentCommissionRequest {
    pub creator_id: String,
    pub custom_rate: Option<f64>,
}

#[derive(Deserialize)]
pub struct BulkUpdateTalentCommissionsRequest {
    pub updates: Vec<UpdateTalentCommissionRequest>,
}

#[derive(Deserialize)]
pub struct PerformanceStats {
    pub talent_id: String,
    pub earnings_cents: i64,
    pub booking_count: i64,
}

#[derive(Deserialize)]
struct ActiveMarketplaceContractRow {
    creator_id: String,
    commission_rate: f64,
}

fn today_iso() -> String {
    chrono::Utc::now().date_naive().to_string()
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
    RoleGuard::new(vec!["agency"]).check(&auth_user.role)?;
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

#[derive(Deserialize)]
pub struct PerformanceTiersQuery {
    pub agency_mode: Option<String>,
}

pub async fn get_performance_tiers(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Query(query): Query<PerformanceTiersQuery>,
) -> Result<Json<PerformanceTiersResponse>, (StatusCode, String)> {
    RoleGuard::new(vec!["agency"]).check(&auth_user.role)?;
    let start_total = Instant::now();
    let agency_id = auth_user.effective_org_id();
    let today = today_iso();
    // In AI mode bookings are irrelevant — creators earn through licensing deals.
    // Tier classification uses only earnings; min_monthly_bookings is treated as 0.
    let is_ai_mode = query
        .agency_mode
        .as_deref()
        .map(|m| m.eq_ignore_ascii_case("AI"))
        .unwrap_or(true); // default to AI mode

    // Parallelize calls
    let (
        resp_tiers_db,
        resp_talents,
        resp_connected,
        resp_stats,
        resp_agency,
        resp_marketplace_contracts,
        resp_licensing_deals,
    ) = tokio::try_join!(
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
            .in_("status", vec!["active", "inactive"])
            .limit(500)
            .select("id, creator_id, full_legal_name, profile_photo_url, performance_tier_name")
            .execute(),
        state
            .pg
            .from("agency_talent_relationships")
            .eq("agency_id", agency_id)
            .is("talent_id", "null")
            .eq("status", "active")
            .select("creator_id, performance_tier_name, creators(full_name, profile_photo_url)")
            .limit(500)
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
            .execute(),
        state
            .pg
            .from("agency_creator_marketplace_contracts")
            .select("id,creator_id,commission_rate")
            .eq("agency_id", agency_id)
            .eq("status", "active")
            .lte("valid_from", &today)
            .gte("valid_until", &today)
            .execute(),
        // Fetch signed licensing deals this month for AI mode deal count.
        // Counts license_submissions with status='completed' and signed_at >= month start.
        // Covers both single-talent (talent_id) and multi-talent (talent_ids array) submissions.
        async {
            let now = chrono::Utc::now();
            let month_start = now.format("%Y-%m-01").to_string();
            state
                .pg
                .from("license_submissions")
                .select("talent_id,talent_ids")
                .eq("agency_id", agency_id)
                .eq("status", "completed")
                .gte("signed_at", &month_start)
                .limit(1000)
                .execute()
                .await
        }
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

    // Process signed licensing deals this month (AI mode deal count).
    // Use talent_ids array when non-empty (preferred, covers multi-talent).
    // Fall back to talent_id only when talent_ids is absent or empty.
    // Never count both for the same submission to avoid double-counting.
    let text_licensing_deals = resp_licensing_deals
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let licensing_deal_rows: Vec<serde_json::Value> =
        serde_json::from_str(&text_licensing_deals).unwrap_or_default();
    let mut licensing_deals_map: HashMap<String, i64> = HashMap::new();
    for row in &licensing_deal_rows {
        // Prefer talent_ids array — it's the authoritative multi-talent list.
        let arr = row.get("talent_ids").and_then(|v| v.as_array());
        let used_array = arr.map(|a| !a.is_empty()).unwrap_or(false);

        if used_array {
            for item in arr.unwrap() {
                if let Some(tid) = item.as_str() {
                    let tid = tid.trim();
                    if !tid.is_empty() {
                        *licensing_deals_map.entry(tid.to_string()).or_insert(0) += 1;
                    }
                }
            }
        } else {
            // Single-talent path — only when talent_ids is absent/empty
            if let Some(tid) = row.get("talent_id").and_then(|v| v.as_str()) {
                let tid = tid.trim();
                if !tid.is_empty() {
                    *licensing_deals_map.entry(tid.to_string()).or_insert(0) += 1;
                }
            }
        }
    }

    // Process Talents
    let text_talents = resp_talents
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let talents_json: Vec<serde_json::Value> =
        serde_json::from_str(&text_talents).unwrap_or_default();

    // Connected creators without an agency_users row (creator-only memberships)
    let text_connected = resp_connected
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let connected_json: Vec<serde_json::Value> =
        serde_json::from_str(&text_connected).unwrap_or_default();

    let text_marketplace_contracts = resp_marketplace_contracts
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let marketplace_contracts: Vec<ActiveMarketplaceContractRow> =
        serde_json::from_str(&text_marketplace_contracts).unwrap_or_default();
    let active_contracts_by_creator: HashMap<String, ActiveMarketplaceContractRow> =
        marketplace_contracts
            .into_iter()
            .map(|row| (row.creator_id.clone(), row))
            .collect();

    // Load per-creator custom commission overrides for this agency.
    let mut creator_ids: Vec<String> = vec![];
    for t in &talents_json {
        if let Some(cid) = t.get("creator_id").and_then(|v| v.as_str()) {
            let cid = cid.trim();
            if !cid.is_empty() {
                creator_ids.push(cid.to_string());
            }
        }
    }
    for r in &connected_json {
        if let Some(cid) = r.get("creator_id").and_then(|v| v.as_str()) {
            let cid = cid.trim();
            if !cid.is_empty() {
                creator_ids.push(cid.to_string());
            }
        }
    }
    creator_ids.sort();
    creator_ids.dedup();

    // Fetch kyc_status and profile_photo_url for all creators so we can:
    // 1. Mark verified talent (kyc_status = 'approved')
    // 2. Fall back to creators.profile_photo_url when agency_users has no photo
    let mut kyc_approved_creators: std::collections::HashSet<String> =
        std::collections::HashSet::new();
    let mut creator_photo_by_id: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    if !creator_ids.is_empty() {
        let kyc_refs: Vec<&str> = creator_ids.iter().map(|s| s.as_str()).collect();
        if let Ok(kyc_resp) = state
            .pg
            .from("creators")
            .select("id,kyc_status,profile_photo_url")
            .in_("id", kyc_refs)
            .execute()
            .await
        {
            if kyc_resp.status().is_success() {
                let kyc_text = kyc_resp.text().await.unwrap_or_else(|_| "[]".into());
                let kyc_rows: Vec<serde_json::Value> =
                    serde_json::from_str(&kyc_text).unwrap_or_default();
                for r in kyc_rows {
                    let cid = r
                        .get("id")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .trim();
                    if cid.is_empty() {
                        continue;
                    }
                    let status = r
                        .get("kyc_status")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .trim()
                        .to_lowercase();
                    if status == "approved" {
                        kyc_approved_creators.insert(cid.to_string());
                    }
                    if let Some(photo) = r
                        .get("profile_photo_url")
                        .and_then(|v| v.as_str())
                        .filter(|s| !s.trim().is_empty())
                    {
                        creator_photo_by_id.insert(cid.to_string(), photo.to_string());
                    }
                }
            }
        }
    }

    let mut custom_by_creator: HashMap<String, f64> = HashMap::new();
    if !creator_ids.is_empty() {
        let creator_id_refs: Vec<&str> = creator_ids.iter().map(|s| s.as_str()).collect();
        let comm_resp = state
            .pg
            .from("agency_creator_commissions")
            .select("creator_id,commission_rate")
            .eq("agency_id", agency_id)
            .in_("creator_id", creator_id_refs)
            .execute()
            .await
            .ok();

        if let Some(comm_resp) = comm_resp {
            if comm_resp.status().is_success() {
                let comm_text = comm_resp.text().await.unwrap_or_else(|_| "[]".into());
                let comm_rows: Vec<serde_json::Value> =
                    serde_json::from_str(&comm_text).unwrap_or_default();
                for r in comm_rows {
                    let cid = r
                        .get("creator_id")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .trim();
                    if cid.is_empty() {
                        continue;
                    }
                    if let Some(rate) = r.get("commission_rate").and_then(|v| v.as_f64()) {
                        custom_by_creator.insert(cid.to_string(), rate.clamp(0.0, 100.0));
                    }
                }
            }
        }
    }

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

    let mut tier_by_name: HashMap<String, TierRule> = HashMap::new();
    for t in &tiers_json {
        tier_by_name.insert(t.tier_name.clone(), t.clone());
    }

    for t in talents_json {
        let id = t
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let creator_id = t
            .get("creator_id")
            .and_then(|v| v.as_str())
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
        let name = t
            .get("full_legal_name")
            .and_then(|v| v.as_str())
            .unwrap_or("Unknown")
            .to_string();
        let photo = t
            .get("profile_photo_url")
            .and_then(|v| v.as_str())
            .filter(|s| !s.trim().is_empty())
            .map(|s| s.to_string())
            // Fall back to creators.profile_photo_url when agency_users has no photo
            .or_else(|| {
                creator_id
                    .as_ref()
                    .and_then(|cid| creator_photo_by_id.get(cid))
                    .cloned()
            });
        let earnings = *earnings_map.get(&id).unwrap_or(&0.0);
        let booking_count = *bookings_map.get(&id).unwrap_or(&0);

        let mut assigned_tier = &tiers_json[tiers_json.len() - 1];
        for rule in &tiers_json {
            // In AI mode bookings are irrelevant — only earnings drive tier placement.
            // In IRL mode both earnings and bookings must meet the threshold.
            let meets_bookings = is_ai_mode || booking_count >= rule.min_monthly_bookings as i64;
            if earnings >= rule.min_monthly_earnings && meets_bookings {
                assigned_tier = rule;
                break;
            }
        }

        if let Some(group) = groups.get_mut(&assigned_tier.tier_level) {
            let custom_rate = creator_id
                .as_ref()
                .and_then(|cid| custom_by_creator.get(cid).copied());
            let active_contract = creator_id
                .as_ref()
                .and_then(|cid| active_contracts_by_creator.get(cid));
            let (relationship_type, commission_source, is_editable, final_rate, is_custom_rate) =
                if let Some(contract) = active_contract {
                    (
                        "marketplace_connected".to_string(),
                        "contract".to_string(),
                        false,
                        contract.commission_rate.clamp(0.0, 100.0),
                        false,
                    )
                } else if let Some(rate) = custom_rate {
                    (
                        "internal".to_string(),
                        "custom_override".to_string(),
                        true,
                        rate,
                        true,
                    )
                } else if creator_id.is_none() {
                    (
                        "internal".to_string(),
                        "tier_default".to_string(),
                        false,
                        assigned_tier.commission_rate,
                        false,
                    )
                } else {
                    (
                        "internal".to_string(),
                        "tier_default".to_string(),
                        true,
                        assigned_tier.commission_rate,
                        false,
                    )
                };

            group.talents.push(TalentPerformance {
                id: id.clone(),
                creator_id: creator_id.clone(),
                name,
                photo_url: photo,
                earnings_30d: earnings,
                bookings_this_month: booking_count,
                licensing_deals_this_month: *licensing_deals_map.get(&id).unwrap_or(&0),
                tier: assigned_tier.clone(),
                commission_rate: final_rate,
                is_custom_rate,
                relationship_type,
                commission_source,
                is_editable,
                is_verified: creator_id
                    .as_ref()
                    .map(|cid| kyc_approved_creators.contains(cid))
                    .unwrap_or(false),
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

    let empty_creator = json!({});
    for r in connected_json {
        let creator_id = r
            .get("creator_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if creator_id.is_empty() {
            continue;
        }
        let tier_name = r
            .get("performance_tier_name")
            .and_then(|v| v.as_str())
            .unwrap_or("Inactive")
            .trim()
            .to_string();
        let assigned_tier = tier_by_name
            .get(&tier_name)
            .or_else(|| tier_by_name.get("Inactive"))
            .expect("tier rule exists");

        let creator_obj = r.get("creators").unwrap_or(&empty_creator);
        let name = creator_obj
            .get("full_name")
            .and_then(|v| v.as_str())
            .unwrap_or("Unknown")
            .to_string();
        let photo = creator_obj
            .get("profile_photo_url")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        let active_contract = active_contracts_by_creator.get(&creator_id);
        let custom_rate = custom_by_creator.get(&creator_id).copied();
        let (relationship_type, commission_source, is_editable, final_rate, is_custom_rate) =
            if let Some(contract) = active_contract {
                (
                    "marketplace_connected".to_string(),
                    "contract".to_string(),
                    false,
                    contract.commission_rate.clamp(0.0, 100.0),
                    false,
                )
            } else if let Some(rate) = custom_rate {
                (
                    "marketplace_connected".to_string(),
                    "custom_override".to_string(),
                    true,
                    rate,
                    true,
                )
            } else {
                (
                    "marketplace_connected".to_string(),
                    "tier_default".to_string(),
                    true,
                    assigned_tier.commission_rate,
                    false,
                )
            };

        if let Some(group) = groups.get_mut(&assigned_tier.tier_level) {
            group.talents.push(TalentPerformance {
                id: creator_id.clone(),
                creator_id: Some(creator_id.clone()),
                name,
                photo_url: photo,
                earnings_30d: 0.0,
                bookings_this_month: 0,
                licensing_deals_this_month: *licensing_deals_map.get(&creator_id).unwrap_or(&0),
                tier: assigned_tier.clone(),
                commission_rate: final_rate,
                is_custom_rate,
                relationship_type,
                commission_source,
                is_editable,
                is_verified: kyc_approved_creators.contains(&creator_id),
            });
        }
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
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    RoleGuard::new(vec!["agency"]).check(&auth_user.role)?;
    let agency_id = auth_user.effective_org_id();
    let creator_id = payload.creator_id.trim().to_string();
    if creator_id.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "creator_id is required".to_string(),
        ));
    }

    // Validate creator is actually linked to this agency (created talent or connected creator).
    let (roster_resp, rel_resp) = tokio::try_join!(
        state
            .pg
            .from("agency_users")
            .select("creator_id")
            .eq("agency_id", agency_id)
            .or(format!("id.eq.{},creator_id.eq.{}", creator_id, creator_id))
            .limit(1)
            .execute(),
        state
            .pg
            .from("agency_talent_relationships")
            .select("creator_id")
            .eq("agency_id", agency_id)
            .eq("creator_id", &creator_id)
            .limit(1)
            .execute()
    )
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let roster_text = roster_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let rel_text = rel_resp.text().await.unwrap_or_else(|_| "[]".to_string());
    let roster_rows: Vec<serde_json::Value> =
        serde_json::from_str(&roster_text).unwrap_or_default();
    let rel_rows: Vec<serde_json::Value> = serde_json::from_str(&rel_text).unwrap_or_default();
    let roster_ok = !roster_rows.is_empty();
    let rel_ok = !rel_rows.is_empty();
    if !roster_ok && !rel_ok {
        return Err((
            StatusCode::BAD_REQUEST,
            "creator is not linked to this agency".to_string(),
        ));
    }

    let mut actual_creator_id = creator_id.clone();
    if let Some(row) = roster_rows.first() {
        if let Some(cid) = row.get("creator_id").and_then(|v| v.as_str()) {
            actual_creator_id = cid.to_string();
        }
    }
    let today = today_iso();

    let contract_guard_resp = state
        .pg
        .from("agency_creator_marketplace_contracts")
        .select("id")
        .eq("agency_id", agency_id)
        .eq("creator_id", &actual_creator_id)
        .eq("status", "active")
        .lte("valid_from", &today)
        .gte("valid_until", &today)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let contract_guard_text = contract_guard_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let contract_guard_rows: Vec<serde_json::Value> =
        serde_json::from_str(&contract_guard_text).unwrap_or_default();
    if !contract_guard_rows.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Commission for marketplace-connected creators is controlled by the active signed contract.".to_string(),
        ));
    }

    let resp_user = state
        .pg
        .from("agency_creator_commissions")
        .select("commission_rate")
        .eq("creator_id", &actual_creator_id)
        .eq("agency_id", agency_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text_user = resp_user.text().await.unwrap_or_else(|_| "[]".to_string());
    let user_data: Vec<serde_json::Value> = serde_json::from_str(&text_user).unwrap_or_default();
    let _old_custom_rate = user_data
        .first()
        .and_then(|v| v.get("commission_rate"))
        .and_then(|v| v.as_f64());

    // Semantics:
    // - custom_rate = Some(x): upsert override row with x
    // - custom_rate = None: delete override row (reset to tier default at read time)
    let Some(new_rate_raw) = payload.custom_rate else {
        let resp = state
            .pg
            .from("agency_creator_commissions")
            .delete()
            .eq("agency_id", agency_id)
            .eq("creator_id", &actual_creator_id)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        if !resp.status().is_success() {
            let txt = resp.text().await.unwrap_or_else(|_| "delete failed".into());
            return Err((StatusCode::BAD_REQUEST, txt));
        }

        let resp_hist = state
            .pg
            .from("agency_creator_commission_history")
            .insert(
                json!({
                    "creator_id": actual_creator_id,
                    "agency_id": agency_id,
                    "action": "reset",
                    "commission_rate": null
                })
                .to_string(),
            )
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        if !resp_hist.status().is_success() {
            let txt = resp_hist
                .text()
                .await
                .unwrap_or_else(|_| "insert history failed".into());
            return Err((StatusCode::BAD_REQUEST, txt));
        }

        return Ok(Json(json!({ "status": "ok" })));
    };

    if !new_rate_raw.is_finite() {
        return Err((
            StatusCode::BAD_REQUEST,
            "custom_rate must be a number".into(),
        ));
    }
    let new_rate_to_log = new_rate_raw.clamp(0.0, 100.0);

    let resp = state
        .pg
        .from("agency_creator_commissions")
        .upsert(
            json!({
                "creator_id": actual_creator_id,
                "agency_id": agency_id,
                "commission_rate": new_rate_to_log,
                "updated_at": chrono::Utc::now().to_rfc3339()
            })
            .to_string(),
        )
        .on_conflict("agency_id,creator_id")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let txt = resp.text().await.unwrap_or_else(|_| "upsert failed".into());
        return Err((StatusCode::BAD_REQUEST, txt));
    }

    let resp_hist = state
        .pg
        .from("agency_creator_commission_history")
        .insert(
            json!({
                "creator_id": actual_creator_id,
                "commission_rate": new_rate_to_log,
                "agency_id": agency_id,
                "action": "set"
            })
            .to_string(),
        )
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp_hist.status().is_success() {
        let txt = resp_hist
            .text()
            .await
            .unwrap_or_else(|_| "insert history failed".into());
        return Err((StatusCode::BAD_REQUEST, txt));
    }

    Ok(Json(json!({ "status": "ok" })))
}

pub async fn bulk_update_talent_commissions(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<BulkUpdateTalentCommissionsRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    RoleGuard::new(vec!["agency"]).check(&auth_user.role)?;
    let agency_id = auth_user.effective_org_id();

    let mut updated: usize = 0;
    let mut reset: usize = 0;
    let mut skipped: Vec<serde_json::Value> = vec![];

    for update in payload.updates {
        let creator_id = update.creator_id.trim().to_string();
        if creator_id.is_empty() {
            skipped.push(json!({"creator_id": "", "reason": "missing_creator_id"}));
            continue;
        }

        // Validate creator is actually linked to this agency (created talent or connected creator).
        let (roster_resp, rel_resp) = tokio::try_join!(
            state
                .pg
                .from("agency_users")
                .select("creator_id")
                .eq("agency_id", agency_id)
                .or(format!("id.eq.{},creator_id.eq.{}", creator_id, creator_id))
                .limit(1)
                .execute(),
            state
                .pg
                .from("agency_talent_relationships")
                .select("creator_id")
                .eq("agency_id", agency_id)
                .eq("creator_id", &creator_id)
                .limit(1)
                .execute()
        )
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let roster_text = roster_resp
            .text()
            .await
            .unwrap_or_else(|_| "[]".to_string());
        let rel_text = rel_resp.text().await.unwrap_or_else(|_| "[]".to_string());
        let roster_rows: Vec<serde_json::Value> =
            serde_json::from_str(&roster_text).unwrap_or_default();
        let rel_rows: Vec<serde_json::Value> = serde_json::from_str(&rel_text).unwrap_or_default();
        let roster_ok = !roster_rows.is_empty();
        let rel_ok = !rel_rows.is_empty();
        if !roster_ok && !rel_ok {
            skipped.push(json!({"creator_id": creator_id, "reason": "not_linked_to_agency"}));
            continue;
        }

        let mut actual_creator_id = creator_id.clone();
        if let Some(row) = roster_rows.first() {
            if let Some(cid) = row.get("creator_id").and_then(|v| v.as_str()) {
                actual_creator_id = cid.to_string();
            }
        }
        let today = today_iso();

        let contract_guard_resp = state
            .pg
            .from("agency_creator_marketplace_contracts")
            .select("id")
            .eq("agency_id", agency_id)
            .eq("creator_id", &actual_creator_id)
            .eq("status", "active")
            .lte("valid_from", &today)
            .gte("valid_until", &today)
            .limit(1)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let contract_guard_text = contract_guard_resp
            .text()
            .await
            .unwrap_or_else(|_| "[]".to_string());
        let contract_guard_rows: Vec<serde_json::Value> =
            serde_json::from_str(&contract_guard_text).unwrap_or_default();
        if !contract_guard_rows.is_empty() {
            skipped.push(json!({
                "creator_id": actual_creator_id,
                "reason": "contract_controlled"
            }));
            continue;
        }

        if let Some(new_rate_raw) = update.custom_rate {
            if !new_rate_raw.is_finite() {
                skipped.push(json!({"creator_id": actual_creator_id, "reason": "invalid_rate"}));
                continue;
            }
            let new_rate = new_rate_raw.clamp(0.0, 100.0);

            let resp = state
                .pg
                .from("agency_creator_commissions")
                .upsert(
                    json!({
                        "creator_id": actual_creator_id,
                        "agency_id": agency_id,
                        "commission_rate": new_rate,
                        "updated_at": chrono::Utc::now().to_rfc3339()
                    })
                    .to_string(),
                )
                .on_conflict("agency_id,creator_id")
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

            if !resp.status().is_success() {
                let txt = resp.text().await.unwrap_or_else(|_| "upsert failed".into());
                return Err((StatusCode::BAD_REQUEST, txt));
            }

            let _ = state
                .pg
                .from("agency_creator_commission_history")
                .insert(
                    json!({
                        "creator_id": actual_creator_id,
                        "commission_rate": new_rate,
                        "agency_id": agency_id,
                        "action": "set"
                    })
                    .to_string(),
                )
                .execute()
                .await;

            updated += 1;
        } else {
            // Reset to default: delete the override row.
            let _ = state
                .pg
                .from("agency_creator_commissions")
                .delete()
                .eq("agency_id", agency_id)
                .eq("creator_id", &actual_creator_id)
                .execute()
                .await;

            let _ = state
                .pg
                .from("agency_creator_commission_history")
                .insert(
                    json!({
                        "creator_id": actual_creator_id,
                        "agency_id": agency_id,
                        "action": "reset",
                        "commission_rate": null
                    })
                    .to_string(),
                )
                .execute()
                .await;

            reset += 1;
        }
    }

    Ok(Json(
        json!({ "status": "ok", "updated": updated, "reset": reset, "skipped": skipped }),
    ))
}

pub async fn get_commission_history(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<Vec<serde_json::Value>>, (StatusCode, String)> {
    RoleGuard::new(vec!["agency"]).check(&auth_user.role)?;

    // Override-change history (not payout history).
    let resp = state
        .pg
        .from("agency_creator_commission_history")
        .select(
            "id, creator_id, commission_rate, action, changed_at, creators:creator_id(full_name)",
        )
        .eq("agency_id", &auth_user.id)
        .order("changed_at.desc")
        .limit(200)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp.text().await.unwrap_or_else(|_| "[]".to_string());
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();

    // Compute old_rate by looking at the next older entry per creator.
    let mut last_rate_by_creator: HashMap<String, Option<f64>> = HashMap::new();
    let mut out: Vec<serde_json::Value> = vec![];
    for row in rows.iter().rev() {
        let creator_id = row
            .get("creator_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        if creator_id.is_empty() {
            continue;
        }
        let new_rate = row.get("commission_rate").and_then(|v| v.as_f64());
        let old_rate = last_rate_by_creator.get(&creator_id).copied().flatten();
        last_rate_by_creator.insert(creator_id.clone(), new_rate);

        let talent_name = row
            .get("creators")
            .and_then(|v| v.get("full_name"))
            .and_then(|v| v.as_str())
            .unwrap_or("Unknown")
            .to_string();

        out.push(json!({
            "id": row.get("id").and_then(|v| v.as_str()).unwrap_or(""),
            "creator_id": creator_id,
            "talent_name": talent_name,
            "old_rate": old_rate,
            "new_rate": new_rate,
            "action": row.get("action").and_then(|v| v.as_str()).unwrap_or("set"),
            "changed_by_name": "Agency Admin",
            "changed_at": row.get("changed_at").and_then(|v| v.as_str()).unwrap_or("")
        }));
    }

    // Re-sort newest-first after reverse scan.
    out.sort_by(|a, b| {
        let at = a.get("changed_at").and_then(|v| v.as_str()).unwrap_or("");
        let bt = b.get("changed_at").and_then(|v| v.as_str()).unwrap_or("");
        bt.cmp(at)
    });

    Ok(Json(out))
}

pub async fn get_commission_breakdowns(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<Vec<CommissionBreakdown>>, (StatusCode, String)> {
    RoleGuard::new(vec!["agency"]).check(&auth_user.role)?;
    let agency_id = auth_user.effective_org_id();
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
    RoleGuard::new(vec!["agency"]).check(&auth_user.role)?;
    let agency_id = auth_user.effective_org_id();
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
