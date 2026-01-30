use crate::config::AppState;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use chrono::{DateTime, Datelike, Duration, TimeZone, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
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

#[derive(Debug, Serialize, Deserialize, Clone)]
struct AgencyUserEarningsRow {
    #[serde(alias = "id")]
    pub talent_id: String,
    pub full_legal_name: Option<String>,
    pub profile_photo_url: Option<String>,
    pub earnings_30d: Option<Value>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct BookingRow {
    pub talent_id: String,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct PaymentEarningsRow {
    pub talent_id: String,
    pub talent_earnings_cents: i64,
}

fn last_30_days_range() -> (String, String) {
    let now = Utc::now();
    let start = now - Duration::days(30);
    (start.to_rfc3339(), now.to_rfc3339())
}

fn current_month_range() -> (String, String) {
    let now = Utc::now();
    let start = Utc
        .with_ymd_and_hms(now.year(), now.month(), 1, 0, 0, 0)
        .single()
        .unwrap_or(now);

    let (next_year, next_month) = if now.month() == 12 {
        (now.year() + 1, 1)
    } else {
        (now.year(), now.month() + 1)
    };

    let next_month_start = Utc
        .with_ymd_and_hms(next_year, next_month, 1, 0, 0, 0)
        .single()
        .unwrap_or(now);
    let end = next_month_start - Duration::seconds(1);

    (start.to_rfc3339(), end.to_rfc3339())
}

fn parse_earnings_30d_to_dollars(v: &Value) -> f64 {
    if let Some(n) = v.as_i64() {
        // Heuristic: values that look like cents.
        if n.abs() >= 10_000 {
            return (n as f64) / 100.0;
        }
        return n as f64;
    }

    if let Some(n) = v.as_f64() {
        if n.abs() >= 10_000.0 {
            return n / 100.0;
        }
        return n;
    }

    0.0
}

async fn compute_talent_metrics(
    state: &AppState,
    tiers: &[PerformanceTier],
) -> Result<Vec<TalentPerformanceMetrics>, (StatusCode, String)> {
    let (payments_start_dt, payments_end_dt) = last_30_days_range();
    let (bookings_start_dt, bookings_end_dt) = current_month_range();

    let mut has_earnings_30d = true;

    // Prefer agency_users.id (talent id) + full_legal_name + earnings_30d.
    let au_resp = state
        .pg
        .from("agency_users")
        .select("id,full_legal_name,profile_photo_url,earnings_30d")
        .execute()
        .await;
    let au_resp = au_resp.map_err(|e| {
        error!("Failed to fetch agency_users: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let agency_users: Vec<AgencyUserEarningsRow> = if au_resp.status().is_success() {
        let au_text = au_resp.text().await.map_err(|e| {
            error!("Failed to read agency_users response: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

        serde_json::from_str(&au_text).map_err(|e| {
            error!("Failed to parse agency_users: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?
    } else {
        let status = au_resp.status();
        let body = au_resp.text().await.unwrap_or_default();
        // 42703 = undefined_column
        let is_undefined_column = body.contains('"') && body.contains("\"code\":\"42703\"");

        if is_undefined_column && body.contains("earnings_30d") {
            // earnings_30d missing: fetch ids only; we'll compute earnings from payments.
            has_earnings_30d = false;
            let resp = state
                .pg
                .from("agency_users")
                .select("id,full_legal_name,profile_photo_url")
                .execute()
                .await
                .map_err(|e| {
                    error!("Failed to fetch agency_users (id only): {}", e);
                    (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
                })?;

            if !resp.status().is_success() {
                let st = resp.status();
                let b = resp.text().await.unwrap_or_default();
                error!(status = %st, body = %b, "Supabase returned non-success response for agency_users (id only)");
                return Err((
                    StatusCode::BAD_GATEWAY,
                    format!("Failed to fetch agency_users from Supabase: {} {}", st, b),
                ));
            }

            let text = resp.text().await.map_err(|e| {
                error!("Failed to read agency_users (id only) response: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
            })?;
            let rows: Vec<serde_json::Value> = serde_json::from_str(&text).map_err(|e| {
                error!("Failed to parse agency_users (id only): {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
            })?;
            rows.into_iter()
                .filter_map(|v| {
                    let id = v.get("id")?.as_str()?.to_string();
                    let full_legal_name = v
                        .get("full_legal_name")
                        .and_then(|x| x.as_str())
                        .map(|s| s.to_string());
                    let profile_photo_url = v
                        .get("profile_photo_url")
                        .and_then(|x| x.as_str())
                        .map(|s| s.to_string());
                    Some(AgencyUserEarningsRow {
                        talent_id: id,
                        full_legal_name,
                        profile_photo_url,
                        earnings_30d: None,
                    })
                })
                .collect()
        } else {
            error!(status = %status, body = %body, "Supabase returned non-success response for agency_users");
            return Err((
                StatusCode::BAD_GATEWAY,
                format!(
                    "Failed to fetch agency_users from Supabase: {} {}",
                    status, body
                ),
            ));
        }
    };

    if agency_users.is_empty() {
        return Ok(vec![]);
    }

    let talent_ids: Vec<String> = agency_users.iter().map(|r| r.talent_id.clone()).collect();
    let talent_id_refs: Vec<&str> = talent_ids.iter().map(|s| s.as_str()).collect();

    // If earnings_30d doesn't exist, compute from payments for the last 30 days.
    let mut earnings_from_payments: std::collections::HashMap<String, f64> =
        std::collections::HashMap::new();
    if !has_earnings_30d {
        let payment_candidates = ["payments", "payment"];
        let mut payment_rows: Vec<PaymentEarningsRow> = vec![];
        let mut found_table = None;
        for table in payment_candidates {
            let resp = state
                .pg
                .from(table)
                .select("talent_id,talent_earnings_cents")
                .in_("talent_id", talent_id_refs.clone())
                .gte("created_at", &payments_start_dt)
                .lte("created_at", &payments_end_dt)
                .execute()
                .await
                .map_err(|e| {
                    error!("Failed to fetch payments from {}: {}", table, e);
                    (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
                })?;

            if !resp.status().is_success() {
                let st = resp.status();
                let b = resp.text().await.unwrap_or_default();
                // Ignore table-not-found schema cache errors.
                if b.contains("PGRST205") {
                    continue;
                }
                error!(status = %st, body = %b, "Supabase returned non-success response for payments");
                return Err((
                    StatusCode::BAD_GATEWAY,
                    format!(
                        "Failed to fetch payments from Supabase ({}): {} {}",
                        table, st, b
                    ),
                ));
            }

            let text = resp.text().await.map_err(|e| {
                error!("Failed to read payments response ({}): {}", table, e);
                (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
            })?;
            payment_rows = serde_json::from_str(&text).map_err(|e| {
                error!("Failed to parse payments ({}): {}", table, e);
                (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
            })?;
            found_table = Some(table);
            break;
        }

        if found_table.is_none() {
            return Err((
                StatusCode::BAD_GATEWAY,
                "Payments table not found in Supabase (expected 'payments' or 'payment')"
                    .to_string(),
            ));
        }

        for r in payment_rows {
            *earnings_from_payments.entry(r.talent_id).or_insert(0.0) +=
                (r.talent_earnings_cents as f64) / 100.0;
        }
    }

    let bookings_resp = state
        .pg
        .from("bookings")
        .select("talent_id,created_at")
        .in_("talent_id", talent_id_refs.clone())
        .gte("created_at", &bookings_start_dt)
        .lte("created_at", &bookings_end_dt)
        .execute()
        .await
        .map_err(|e| {
            error!("Failed to fetch bookings: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    if !bookings_resp.status().is_success() {
        let status = bookings_resp.status();
        let body = bookings_resp.text().await.unwrap_or_default();
        error!(status = %status, body = %body, "Supabase returned non-success response for bookings");
        return Err((
            StatusCode::BAD_GATEWAY,
            format!(
                "Failed to fetch bookings from Supabase: {} {}",
                status, body
            ),
        ));
    }

    let bookings_text = bookings_resp.text().await.map_err(|e| {
        error!("Failed to read bookings response: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let booking_rows: Vec<BookingRow> = serde_json::from_str(&bookings_text).map_err(|e| {
        error!("Failed to parse bookings: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let mut bookings_by_talent: std::collections::HashMap<String, i64> =
        std::collections::HashMap::new();
    let mut last_booking_by_talent: std::collections::HashMap<String, DateTime<Utc>> =
        std::collections::HashMap::new();
    for r in booking_rows {
        *bookings_by_talent.entry(r.talent_id.clone()).or_insert(0) += 1;
        if let Some(created_at) = r.created_at.as_deref() {
            if let Ok(dt) = DateTime::parse_from_rfc3339(created_at) {
                let dt_utc = dt.with_timezone(&Utc);
                let entry = last_booking_by_talent.entry(r.talent_id).or_insert(dt_utc);
                if dt_utc > *entry {
                    *entry = dt_utc;
                }
            }
        }
    }

    let mut metrics: Vec<TalentPerformanceMetrics> = vec![];
    for row in agency_users {
        let earnings = if has_earnings_30d {
            row.earnings_30d
                .as_ref()
                .map(parse_earnings_30d_to_dollars)
                .unwrap_or(0.0)
        } else {
            *earnings_from_payments.get(&row.talent_id).unwrap_or(&0.0)
        };

        let booking_count = *bookings_by_talent.get(&row.talent_id).unwrap_or(&0);
        let booking_count_i32 = i32::try_from(booking_count).unwrap_or(i32::MAX);
        let assigned_tier = calculate_tier(earnings, booking_count_i32, tiers);

        let days_since_last_booking = last_booking_by_talent
            .get(&row.talent_id)
            .map(|dt| (Utc::now() - *dt).num_days())
            .and_then(|v| i32::try_from(v).ok());

        let display_name = row
            .full_legal_name
            .clone()
            .unwrap_or_else(|| "Unknown".to_string());

        metrics.push(TalentPerformanceMetrics {
            profile_id: row.talent_id.clone(),
            name: display_name,
            photo_url: row.profile_photo_url.clone(),
            avg_monthly_earnings: earnings,
            avg_booking_frequency: booking_count as f64,
            total_campaigns: booking_count_i32,
            engagement_percentage: 0.0,
            days_since_last_booking,
            current_tier: assigned_tier,
        });
    }

    Ok(metrics)
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

    if !tiers_resp.status().is_success() {
        let status = tiers_resp.status();
        let body = tiers_resp.text().await.unwrap_or_default();
        error!(status = %status, body = %body, "Supabase returned non-success response for performance_tiers");
        return Err((
            StatusCode::BAD_GATEWAY,
            format!(
                "Failed to fetch performance tiers from Supabase: {} {}",
                status, body
            ),
        ));
    }

    let tiers_text = tiers_resp.text().await.map_err(|e| {
        error!("Failed to read tiers response: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let mut tiers: Vec<PerformanceTier> = serde_json::from_str(&tiers_text).map_err(|e| {
        error!("Failed to parse tiers: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let metrics = compute_talent_metrics(&state, &tiers).await?;

    // Calculate tier assignments
    let mut tier_counts: std::collections::HashMap<String, i64> = std::collections::HashMap::new();
    let mut tier_earnings: std::collections::HashMap<String, Vec<f64>> =
        std::collections::HashMap::new();
    let mut tier_bookings: std::collections::HashMap<String, Vec<f64>> =
        std::collections::HashMap::new();

    for m in metrics.iter() {
        *tier_counts.entry(m.current_tier.clone()).or_insert(0) += 1;
        tier_earnings
            .entry(m.current_tier.clone())
            .or_default()
            .push(m.avg_monthly_earnings);
        tier_bookings
            .entry(m.current_tier.clone())
            .or_default()
            .push(m.avg_booking_frequency);
    }

    // Populate tier statistics
    for tier in &mut tiers {
        tier.talent_count = Some(*tier_counts.get(&tier.tier_name).unwrap_or(&0));

        if let Some(earnings_list) = tier_earnings.get(&tier.tier_name) {
            if !earnings_list.is_empty() {
                tier.avg_monthly_earnings =
                    Some(earnings_list.iter().sum::<f64>() / earnings_list.len() as f64);
            }
        }

        if let Some(bookings_list) = tier_bookings.get(&tier.tier_name) {
            if !bookings_list.is_empty() {
                tier.avg_booking_frequency =
                    Some(bookings_list.iter().sum::<f64>() / bookings_list.len() as f64);
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

    if !tiers_resp.status().is_success() {
        let status = tiers_resp.status();
        let body = tiers_resp.text().await.unwrap_or_default();
        error!(status = %status, body = %body, "Supabase returned non-success response for performance_tiers");
        return Err((
            StatusCode::BAD_GATEWAY,
            format!(
                "Failed to fetch performance tiers from Supabase: {} {}",
                status, body
            ),
        ));
    }

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

    let metrics = compute_talent_metrics(&state, &tiers).await?;
    let mut talents: Vec<TalentPerformanceMetrics> = metrics
        .into_iter()
        .filter(|m| m.current_tier == tier_name)
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
