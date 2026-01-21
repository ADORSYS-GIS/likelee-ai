use crate::{auth::AuthUser, config::AppState};
use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use chrono::{Datelike, Duration, TimeZone, Utc};
use serde::Deserialize;
use serde_json::{json, Value};
use tracing::warn;

#[derive(Deserialize, Debug)]
pub struct AgencyDashboardQuery {
    pub agency_id: String,
    pub month: Option<String>,
}

fn month_bounds(month: Option<String>) -> (chrono::DateTime<Utc>, chrono::DateTime<Utc>) {
    let now = Utc::now();
    let (y, m) = if let Some(mstr) = month {
        let parts: Vec<&str> = mstr.split('-').collect();
        if parts.len() == 2 {
            if let (Ok(y), Ok(m)) = (parts[0].parse::<i32>(), parts[1].parse::<u32>()) {
                (y, m)
            } else {
                (now.year(), now.month())
            }
        } else {
            (now.year(), now.month())
        }
    } else {
        (now.year(), now.month())
    };
    // first day of month at 00:00 UTC
    let start = Utc.with_ymd_and_hms(y, m, 1, 0, 0, 0).unwrap();
    // next month start
    let (ny, nm) = if m == 12 { (y + 1, 1) } else { (y, m + 1) };
    let end = Utc.with_ymd_and_hms(ny, nm, 1, 0, 0, 0).unwrap();
    (start, end)
}

async fn fetch_json(
    pg: &postgrest::Postgrest,
    req: postgrest::Builder,
) -> Result<Vec<Value>, String> {
    match req.execute().await {
        Ok(resp) => match resp.text().await {
            Ok(t) => serde_json::from_str::<Vec<Value>>(&t).map_err(|e| e.to_string()),
            Err(e) => Err(e.to_string()),
        },
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("relation") && msg.contains("does not exist") {
                Ok(vec![])
            } else {
                Err(msg)
            }
        }
    }
}

pub async fn get_agency_dashboard(
    State(state): State<AppState>,
    _user: AuthUser,
    Query(q): Query<AgencyDashboardQuery>,
) -> Result<Json<Value>, (StatusCode, String)> {
    if q.agency_id.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "missing agency_id".into()));
    }
    let (month_start, month_end) = month_bounds(q.month);
    let month_start_s = month_start.to_rfc3339();
    let month_end_s = month_end.to_rfc3339();

    // Roster Health
    let roster_rows = fetch_json(
        &state.pg,
        state
            .pg
            .from("agency_users")
            .select("id,status")
            .eq("agency_id", &q.agency_id)
            .eq("role", "talent"),
    )
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    let total_roster = roster_rows.len() as i64;
    let active_roster = roster_rows
        .iter()
        .filter(|r| r.get("status").and_then(|v| v.as_str()) == Some("active"))
        .count() as i64;

    // Payments this month
    let pay_rows = fetch_json(
        &state.pg,
        state
            .pg
            .from("payments")
            .select("talent_user_id,talent_earnings_cents,paid_at,status")
            .eq("agency_id", &q.agency_id)
            .eq("status", "succeeded")
            .gte("paid_at", &month_start_s)
            .lt("paid_at", &month_end_s),
    )
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    let mut monthly_revenue_cents: i64 = 0;
    use std::collections::{HashMap, HashSet};
    let mut by_talent_sum: HashMap<String, i64> = HashMap::new();
    let mut by_talent_last_paid: HashMap<String, String> = HashMap::new();
    let mut talents_with_payment: HashSet<String> = HashSet::new();
    for row in &pay_rows {
        let cents = row
            .get("talent_earnings_cents")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        monthly_revenue_cents += cents;
        let tid = row
            .get("talent_user_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        if !tid.is_empty() {
            *by_talent_sum.entry(tid.clone()).or_insert(0) += cents;
            if let Some(paid_at) = row.get("paid_at").and_then(|v| v.as_str()) {
                let update = match by_talent_last_paid.get(&tid) {
                    Some(cur) => paid_at > cur,
                    None => true,
                };
                if update {
                    by_talent_last_paid.insert(tid.clone(), paid_at.to_string());
                }
            }
            talents_with_payment.insert(tid);
        }
    }

    // Top 3 revenue generators
    let mut sums: Vec<(String, i64)> = by_talent_sum.into_iter().collect();
    sums.sort_by(|a, b| b.1.cmp(&a.1));
    let top3_ids: Vec<(String, i64)> = sums.into_iter().take(3).collect();

    // Resolve names for top3 and active earners
    let mut need_names: HashSet<String> = HashSet::new();
    for (tid, _) in &top3_ids {
        need_names.insert(tid.clone());
    }
    let mut recent5: Vec<(String, String)> = by_talent_last_paid.into_iter().collect();
    recent5.sort_by(|a, b| b.1.cmp(&a.1));
    let recent5_ids: Vec<(String, String)> = recent5.into_iter().take(5).collect();
    for (tid, _) in &recent5_ids {
        need_names.insert(tid.clone());
    }

    let mut name_map: HashMap<String, String> = HashMap::new();
    for tid in need_names.iter() {
        let rows = fetch_json(
            &state.pg,
            state
                .pg
                .from("agency_users")
                .select("user_id")
                .eq("agency_id", &q.agency_id)
                .eq("role", "talent")
                .eq("user_id", tid),
        )
        .await
        .unwrap_or_default();
        if let Some(row) = rows.first() {
            if let Some(uid) = row.get("user_id").and_then(|v| v.as_str()) {
                name_map.insert(uid.to_string(), String::new());
            }
        }
    }

    let top_creators: Vec<Value> = top3_ids
        .into_iter()
        .map(|(tid, sum)| {
            json!({
                "talent_id": tid,
                "name": name_map.get(&tid).cloned().unwrap_or_default(),
                "earnings_cents": sum
            })
        })
        .collect();

    let active_earners: Vec<Value> = recent5_ids
        .into_iter()
        .map(|(tid, last)| {
            json!({
                "talent_id": tid,
                "name": name_map.get(&tid).cloned().unwrap_or_default(),
                "last_paid": last
            })
        })
        .collect();

    // New talent performance (joined last 30 days)
    let last30 = (Utc::now() - Duration::days(30)).to_rfc3339();
    let new_roster_rows = fetch_json(
        &state.pg,
        state
            .pg
            .from("agency_users")
            .select("user_id,created_at")
            .eq("agency_id", &q.agency_id)
            .eq("role", "talent")
            .gte("created_at", &last30),
    )
    .await
    .unwrap_or_default();

    // Build a map of first payment per talent
    let first_pay_rows = fetch_json(
        &state.pg,
        state
            .pg
            .from("payments")
            .select("talent_user_id,paid_at,status")
            .eq("agency_id", &q.agency_id)
            .eq("status", "succeeded"),
    )
    .await
    .unwrap_or_default();
    let mut first_paid_map: HashMap<String, String> = HashMap::new();
    for r in first_pay_rows {
        if let (Some(tid), Some(paid_at)) = (
            r.get("talent_user_id").and_then(|v| v.as_str()),
            r.get("paid_at").and_then(|v| v.as_str()),
        ) {
            let entry = first_paid_map
                .entry(tid.to_string())
                .or_insert(paid_at.to_string());
            if &paid_at.to_string() < entry {
                *entry = paid_at.to_string();
            }
        }
    }
    let mut new_talent: Vec<Value> = vec![];
    for r in new_roster_rows {
        if let (Some(tid), Some(joined)) = (
            r.get("user_id").and_then(|v| v.as_str()),
            r.get("created_at").and_then(|v| v.as_str()),
        ) {
            let name = name_map.get(tid).cloned().unwrap_or_default();
            if let Some(first_paid) = first_paid_map.get(tid) {
                // compute days between
                let jd = joined.parse::<chrono::DateTime<Utc>>().ok();
                let fd = first_paid.parse::<chrono::DateTime<Utc>>().ok();
                let avg_days = match (jd, fd) {
                    (Some(j), Some(f)) if f >= j => (f - j).num_days(),
                    _ => 0,
                };
                new_talent.push(json!({
                    "talent_id": tid,
                    "name": name,
                    "avg_days_to_first": avg_days,
                    "status": "ok"
                }));
            } else {
                new_talent.push(json!({
                    "talent_id": tid,
                    "name": name,
                    "avg_days_to_first": null,
                    "status": "pending"
                }));
            }
        }
    }

    // Pending actions
    let pending_lic = fetch_json(
        &state.pg,
        state
            .pg
            .from("licensing_requests")
            .select("id")
            .eq("agency_id", &q.agency_id)
            .eq("status", "pending"),
    )
    .await
    .unwrap_or_default()
    .len() as i64;

    let expiring_licenses = fetch_json(
        &state.pg,
        state
            .pg
            .from("brand_licenses")
            .select("id")
            .eq("agency_id", &q.agency_id)
            .eq("status", "active")
            .gte("end_at", &Utc::now().to_rfc3339())
            .lt("end_at", &(Utc::now() + Duration::days(30)).to_rfc3339()),
    )
    .await
    .unwrap_or_default()
    .len() as i64;

    let compliance_issues = fetch_json(
        &state.pg,
        state
            .pg
            .from("brand_licenses")
            .select("id")
            .eq("agency_id", &q.agency_id)
            .eq("compliance_status", "issue"),
    )
    .await
    .unwrap_or_default()
    .len() as i64;

    // Licensing pipeline summary
    let active_licenses = fetch_json(
        &state.pg,
        state
            .pg
            .from("brand_licenses")
            .select("id")
            .eq("agency_id", &q.agency_id)
            .eq("status", "active"),
    )
    .await
    .unwrap_or_default()
    .len() as i64;

    let total_this_month = fetch_json(
        &state.pg,
        state
            .pg
            .from("brand_licenses")
            .select("id")
            .eq("agency_id", &q.agency_id)
            .gte("start_at", &month_start_s)
            .lt("start_at", &month_end_s),
    )
    .await
    .unwrap_or_default()
    .len() as i64;

    // Revenue Breakdown — percentages by dimension (top k)
    // Base set: campaign rows (each row represents one talent's participation with campaign dims)
    let campaign_rows = fetch_json(
        &state.pg,
        state
            .pg
            .from("campaigns")
            .select("id,campaign_type,brand_vertical,region,talent_user_id")
            .eq("agency_id", &q.agency_id)
            .gte("start_at", &month_start_s)
            .lt("start_at", &month_end_s),
    )
    .await
    .unwrap_or_default();
    // Build dimension counts
    let mut base_talents: std::collections::HashSet<String> = std::collections::HashSet::new();
    for r in &campaign_rows {
        if let Some(tid) = r.get("talent_user_id").and_then(|v| v.as_str()) {
            base_talents.insert(tid.to_string());
        }
    }
    let base = base_talents.len() as f64;

    fn top_pct(counts: &std::collections::HashMap<String, i64>, k: usize, base: f64) -> Vec<Value> {
        let mut v: Vec<(String, i64)> = counts.iter().map(|(k, v)| (k.clone(), *v)).collect();
        v.sort_by(|a, b| b.1.cmp(&a.1));
        v.into_iter()
            .take(k)
            .map(|(name, c)| json!({"name": name, "pct": if base>0.0 { (c as f64 * 100.0 / base).round() } else { 0.0 } }))
            .collect()
    }

    let mut by_type: std::collections::HashMap<String, i64> = std::collections::HashMap::new();
    let mut by_vert: std::collections::HashMap<String, i64> = std::collections::HashMap::new();
    let mut by_region: std::collections::HashMap<String, i64> = std::collections::HashMap::new();
    for c in &campaign_rows {
        let t = c
            .get("campaign_type")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let bv = c
            .get("brand_vertical")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let reg = c
            .get("region")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        *by_type.entry(t).or_insert(0) += 1;
        *by_vert.entry(bv).or_insert(0) += 1;
        *by_region.entry(reg).or_insert(0) += 1;
    }

    let by_campaign_type = top_pct(&by_type, 3, base);
    let by_brand_vertical = top_pct(&by_vert, 3, base);
    // For region: top 2 + other
    let mut region_sorted: Vec<(String, i64)> = by_region.into_iter().collect();
    region_sorted.sort_by(|a, b| b.1.cmp(&a.1));
    let mut by_region_vec: Vec<Value> = vec![];
    let mut used_pct = 0.0;
    for (i, (name, c)) in region_sorted.iter().take(2).enumerate() {
        let pct = if base > 0.0 {
            (*c as f64 * 100.0 / base).round()
        } else {
            0.0
        };
        used_pct += pct;
        by_region_vec.push(json!({"name": name, "pct": pct}));
    }
    if !by_region_vec.is_empty() || base > 0.0 {
        let other = (100.0 - used_pct).max(0.0);
        by_region_vec.push(json!({"name": "Other", "pct": other.round()}));
    }

    // Recent Activity
    let recent = fetch_json(
        &state.pg,
        state
            .pg
            .from("activity_events")
            .select("type,title,subtitle,created_at")
            .eq("agency_id", &q.agency_id)
            .order("created_at.desc"),
    )
    .await
    .unwrap_or_default();

    let resp = json!({
        "metrics": {
            "roster": {"active": active_roster, "total": total_roster},
            "monthly_revenue_cents": monthly_revenue_cents,
            "platform_ranking": {"label": "top 15%"}
        },
        "pending_actions": {
            "licensing_requests": pending_lic,
            "expiring_licenses_30d": expiring_licenses,
            "compliance_issues": compliance_issues
        },
        "talent_performance": {
            "top_creators": top_creators,
            "active_earners": active_earners,
            "new_talent": new_talent
        },
        "revenue_breakdown": {
            "by_campaign_type": by_campaign_type,
            "by_brand_vertical": by_brand_vertical,
            "by_region": by_region_vec
        },
        "licensing_pipeline": {
            "pending": pending_lic,
            "active": active_licenses,
            "expiring_30d": expiring_licenses,
            "total_this_month": total_this_month
        },
        "recent_activity": recent
    });

    Ok(Json(resp))
}
