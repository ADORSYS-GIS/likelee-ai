use crate::{auth::AuthUser, config::AppState, errors::sanitize_db_error};
use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ActiveLicense {
    pub id: String,
    pub talent_id: String,
    pub talent_name: String,
    pub talent_avatar: Option<String>,
    pub license_type: String,
    pub brand: String,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub days_left: Option<i64>,
    pub usage_scope: String,
    pub value: f64,
    pub status: String, // "Active", "Expiring", "Expired"
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ActiveLicensesStats {
    pub active: i64,
    pub expiring: i64,
    pub expired: i64,
    pub total_value: f64,
}

#[derive(Deserialize)]
pub struct ListActiveLicensesQuery {
    pub search: Option<String>,
    pub status: Option<String>, // "all", "active", "expiring", "expired"
}

// Helper structs for PostgREST response
#[derive(Deserialize)]
struct BrandEmbed {
    company_name: Option<String>,
}

#[derive(Deserialize)]
struct AgencyUserEmbed {
    full_legal_name: Option<String>,
    stage_name: Option<String>,
    profile_photo_url: Option<String>,
}

fn talent_display_name_row(u: &AgencyUserEmbed) -> String {
    u.stage_name
        .clone()
        .or_else(|| u.full_legal_name.clone())
        .unwrap_or_default()
}

#[derive(Deserialize)]
struct CampaignEmbed {
    payment_amount: Option<f64>,
}

#[derive(Deserialize)]
struct LicensingRequestRow {
    id: String,
    talent_id: Option<String>,
    talent_name: Option<String>,
    campaign_title: Option<String>,
    client_name: Option<String>,
    license_start_date: Option<String>,
    license_end_date: Option<String>,
    deadline: Option<String>,
    usage_scope: Option<String>,
    license_submissions: Option<serde_json::Value>,

    // Embedded resources
    brands: Option<BrandEmbed>,
    agency_users: Option<AgencyUserEmbed>,
    campaigns: Option<Vec<CampaignEmbed>>, // Reverse relation might be array
}

#[derive(Deserialize)]
struct StatRow {
    license_end_date: Option<String>,
    deadline: Option<String>,
    campaigns: Option<Vec<CampaignEmbed>>,
}

pub async fn list(
    State(state): State<AppState>,
    user: AuthUser,
    Query(q): Query<ListActiveLicensesQuery>,
) -> Result<Json<Vec<ActiveLicense>>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    let select = "id,talent_id,talent_name,campaign_title,client_name,brand_id,license_start_date,license_end_date,deadline,usage_scope,brands(company_name),agency_users(full_legal_name,stage_name,profile_photo_url),campaigns(payment_amount),license_submissions!licensing_requests_submission_id_fkey(license_fee)";

    let mut query = state
        .pg
        .from("licensing_requests")
        .select(select)
        .eq("agency_id", &user.id)
        .eq("status", "approved");

    let today = Utc::now().date_naive();
    let today_str = today.to_string();
    let expiring_threshold = today + chrono::Duration::days(5); // Changed from 30 to 5 days
    let threshold_str = expiring_threshold.to_string();

    // Database-level status filtering
    if let Some(s) = &q.status {
        match s.to_lowercase().as_str() {
            "active" => {
                // Active: (end_date is null OR end_date >= today)
                query = query.or(format!(
                    "license_end_date.is.null,license_end_date.gte.{}",
                    today_str
                ));
            }
            "expiring" => {
                // Expiring: today <= end_date <= threshold (5 days)
                query = query
                    .gte("license_end_date", &today_str)
                    .lte("license_end_date", &threshold_str);
            }
            "expired" => {
                // Expired: end_date < today
                query = query.lt("license_end_date", &today_str);
            }
            _ => {
                // "all" or unknown: no additional filter (already eq("status", "approved"))
            }
        }
    }

    let resp = query
        .order("created_at.desc")
        .limit(200)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !status.is_success() {
        return Err(sanitize_db_error(status.as_u16(), text));
    }

    let rows: Vec<LicensingRequestRow> = serde_json::from_str(&text)
        .map_err(|e| {
            tracing::error!(agency_id = %user.id, error = %e, response_body = %text, "active_licenses JSON parse error");
            (StatusCode::INTERNAL_SERVER_ERROR, format!("JSON parse error: {}", e))
        })?;

    tracing::info!(
        agency_id = %user.id,
        row_count = rows.len(),
        "Fetched licensing_requests with status=approved"
    );

    let mut licenses = Vec::new();

    for r in rows {
        let talent_name = r
            .agency_users
            .as_ref()
            .map(talent_display_name_row)
            .or_else(|| r.talent_name.clone())
            .filter(|s| !s.trim().is_empty())
            .unwrap_or_else(|| "Unknown Talent".to_string());

        let talent_avatar = r
            .agency_users
            .as_ref()
            .and_then(|u| u.profile_photo_url.clone());
        let license_type = r
            .campaign_title
            .clone()
            .unwrap_or_else(|| "General License".to_string());

        let brand_name = r
            .client_name
            .clone()
            .filter(|s| !s.trim().is_empty())
            .or_else(|| r.brands.as_ref().and_then(|b| b.company_name.clone()))
            .unwrap_or_else(|| "Unknown Brand".to_string());

        let usage_scope = r.usage_scope.clone().unwrap_or_default();

        let value = r
            .campaigns
            .as_ref()
            .and_then(|c| c.first())
            .and_then(|c| c.payment_amount)
            .or_else(|| {
                r.license_submissions
                    .as_ref()
                    .and_then(|ls| ls.get("license_fee"))
                    .and_then(|v| v.as_f64())
                    .map(|v| v / 100.0)
            })
            .unwrap_or(0.0);

        let mut status = "Active".to_string();
        let mut days_left = None;

        let effective_end_date_str = r.license_end_date.as_ref().or(r.deadline.as_ref());

        if let Some(end_str) = effective_end_date_str {
            if let Ok(end_date) = chrono::NaiveDate::parse_from_str(end_str, "%Y-%m-%d") {
                let duration = end_date.signed_duration_since(today).num_days();
                days_left = Some(duration);

                if end_date < today {
                    status = "Expired".to_string();
                } else if end_date <= expiring_threshold {
                    status = "Expiring".to_string();
                }
            }
        }

        // Search filter
        if let Some(search) = &q.search {
            let search_lower = search.to_lowercase();
            if !talent_name.to_lowercase().contains(&search_lower)
                && !brand_name.to_lowercase().contains(&search_lower)
                && !license_type.to_lowercase().contains(&search_lower)
            {
                continue;
            }
        }

        licenses.push(ActiveLicense {
            id: r.id,
            talent_id: r.talent_id.unwrap_or_default(),
            talent_name,
            talent_avatar,
            license_type,
            brand: brand_name,
            start_date: r.license_start_date,
            end_date: r.license_end_date.or(r.deadline),
            days_left,
            usage_scope,
            value,
            status,
        });
    }

    Ok(Json(licenses))
}

pub async fn stats(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<ActiveLicensesStats>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    // Optimization: Fetch only necessary columns for stats calculation
    let select = "license_end_date,deadline,campaigns(payment_amount)";

    let resp = state
        .pg
        .from("licensing_requests")
        .select(select)
        .eq("agency_id", &user.id)
        .eq("status", "approved")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !status.is_success() {
        return Err(sanitize_db_error(status.as_u16(), text));
    }

    let rows: Vec<StatRow> = serde_json::from_str(&text).unwrap_or_default();

    let today = Utc::now().date_naive();
    let expiring_threshold = today + chrono::Duration::days(5); // Changed from 30 to 5 days

    let mut active = 0;
    let mut expiring = 0;
    let mut expired = 0;
    let mut total_val = 0.0;

    for r in rows {
        let val = r
            .campaigns
            .as_ref()
            .and_then(|c| c.first())
            .and_then(|c| c.payment_amount)
            .unwrap_or(0.0);

        total_val += val;

        let mut row_status = "Active";
        let effective_end_date_str = r.license_end_date.as_ref().or(r.deadline.as_ref());

        if let Some(end_str) = effective_end_date_str {
            if let Ok(end_date) = chrono::NaiveDate::parse_from_str(end_str, "%Y-%m-%d") {
                if end_date < today {
                    row_status = "Expired";
                } else if end_date <= expiring_threshold {
                    row_status = "Expiring";
                }
            }
        }

        match row_status {
            "Expired" => expired += 1,
            "Expiring" => expiring += 1,
            _ => active += 1,
        }
    }

    Ok(Json(ActiveLicensesStats {
        active,
        expiring,
        expired,
        total_value: total_val,
    }))
}
