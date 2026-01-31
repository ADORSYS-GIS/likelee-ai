use crate::{auth::AuthUser, config::AppState};
use axum::http::StatusCode;
use axum::{
    extract::{Path, State},
    Json,
};
use chrono::{Datelike, NaiveDate};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::collections::HashSet;
use tracing::warn;

#[derive(Clone, Deserialize)]
#[serde(untagged)]
pub enum StringOrVec {
    String(String),
    Vec(Vec<String>),
}

impl StringOrVec {
    fn into_vec(self) -> Vec<String> {
        match self {
            Self::String(v) => vec![v],
            Self::Vec(v) => v,
        }
    }
}

fn split_csv_tags(s: &str) -> Vec<String> {
    s.split(',')
        .map(|p| p.trim())
        .filter(|p| !p.is_empty())
        .map(|p| p.to_string())
        .collect()
}

fn try_parse_json_string_array(s: &str) -> Option<Vec<String>> {
    let t = s.trim();
    if !t.starts_with('[') {
        return None;
    }
    serde_json::from_str::<Vec<String>>(t).ok()
}

fn try_parse_postgres_array_literal(s: &str) -> Option<Vec<String>> {
    let t = s.trim();
    if !(t.starts_with('{') && t.ends_with('}')) {
        return None;
    }
    let inner = &t[1..t.len().saturating_sub(1)];
    if inner.trim().is_empty() {
        return Some(vec![]);
    }

    let mut out: Vec<String> = Vec::new();
    let mut cur = String::new();
    let mut in_quotes = false;
    let mut escape = false;

    for ch in inner.chars() {
        if escape {
            cur.push(ch);
            escape = false;
            continue;
        }
        if ch == '\\' {
            escape = true;
            continue;
        }
        if ch == '"' {
            in_quotes = !in_quotes;
            continue;
        }
        if ch == ',' && !in_quotes {
            let v = cur.trim();
            if !v.is_empty() {
                out.push(v.to_string());
            }
            cur.clear();
            continue;
        }
        cur.push(ch);
    }
    let v = cur.trim();
    if !v.is_empty() {
        out.push(v.to_string());
    }

    Some(out)
}

fn parse_string_array_value(v: &serde_json::Value) -> Vec<String> {
    if let Some(arr) = v.as_array() {
        return arr
            .iter()
            .filter_map(|x| x.as_str())
            .map(|s| s.to_string())
            .collect();
    }
    if let Some(s) = v.as_str() {
        if let Some(arr) = try_parse_json_string_array(s) {
            return arr;
        }
        if let Some(arr) = try_parse_postgres_array_literal(s) {
            return arr;
        }
        if s.trim().is_empty() {
            return vec![];
        }
        return vec![s.to_string()];
    }
    vec![]
}

fn normalize_asset_url(s: &str) -> String {
    let t = s.trim();
    if let Some(i) = t.find("://") {
        let (scheme, rest) = t.split_at(i + 3);
        let mut r = rest.to_string();
        while r.contains("//") {
            r = r.replace("//", "/");
        }
        return format!("{}{}", scheme, r);
    }
    let mut r = t.to_string();
    while r.contains("//") {
        r = r.replace("//", "/");
    }
    r
}

#[derive(Serialize, Deserialize)]
pub struct TalentRow {
    pub id: String,
    pub name: String,
    pub stage_name: String,
    pub role: String,
    pub role_types: Vec<String>,
    pub status: String,
    pub consent: String,
    pub ai_usage: Vec<String>,
    pub followers: String,
    pub followers_val: i64,
    pub assets: i32,
    pub top_brand: String,
    pub expiry: String,
    pub earnings: String,
    pub earnings_val: i64,
    pub projected: String,
    pub projected_val: i64,
    pub is_verified: bool,
    pub img: String,
    pub photo_urls: Vec<String>,
    pub bio: String,
    pub engagement_rate: f64,
    pub email: String,
    pub phone: String,
    pub city: String,
    pub state_province: String,
    pub country: String,
    pub last_updated: String,
    pub special_skills: String,
    pub date_of_birth: Option<String>,
    pub gender_identity: Option<String>,
    pub height_feet: Option<i32>,
    pub height_inches: Option<i32>,
    pub bust_inches: Option<i32>,
    pub waist_inches: Option<i32>,
    pub hips_inches: Option<i32>,
    pub measurements: Option<String>,
    pub hair_color: Option<String>,
    pub eye_color: Option<String>,
    pub race_ethnicity: Vec<String>,
    pub tattoos: Option<bool>,
    pub piercings: Option<bool>,
}

#[derive(Serialize)]
pub struct AgencyRosterResponse {
    pub active_campaigns: i64,
    pub earnings_30d_total_cents: i64,
    pub earnings_prev_30d_total_cents: i64,
    pub talents: Vec<TalentRow>,
}

pub async fn get_roster(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<AgencyRosterResponse>, (StatusCode, String)> {
    // Fetch all talents linked to this agency
    let resp = state
        .pg
        .from("agency_users")
        .select("*")
        .eq("agency_id", &user.id)
        .eq("role", "talent")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // println!("DEBUG: agency_roster response: {}", text);

    let rows: serde_json::Value = serde_json::from_str(&text).unwrap_or(serde_json::json!([]));

    let mut roster: Vec<TalentRow> = Vec::new();
    let mut talent_ids: Vec<String> = Vec::new();
    let mut asset_urls_by_talent: HashMap<String, HashSet<String>> = HashMap::new();

    if let Some(array) = rows.as_array() {
        for item in array {
            let id = item
                .get("id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            // Try full_legal_name, then stage_name, then full_name
            let name = item
                .get("full_legal_name")
                .or(item.get("stage_name"))
                .or(item.get("full_name"))
                .and_then(|v| v.as_str())
                .unwrap_or("Unknown")
                .to_string();

            let stage_name = item
                .get("stage_name")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            let email = item
                .get("email")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let phone = item
                .get("phone_number")
                .or(item.get("phone"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            let city = item
                .get("city")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let state_province = item
                .get("state_province")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let country = item
                .get("country")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            let role_types: Vec<String> = item
                .get("role_type")
                .and_then(|v| {
                    v.as_str()
                        .map(|s| {
                            if let Some(arr) = try_parse_json_string_array(s) {
                                arr
                            } else if s.trim().is_empty() {
                                vec![]
                            } else {
                                vec![s.to_string()]
                            }
                        })
                        .or_else(|| {
                            v.as_array().map(|arr| {
                                arr.iter()
                                    .filter_map(|x| x.as_str())
                                    .map(|s| s.to_string())
                                    .collect::<Vec<_>>()
                            })
                        })
                })
                .unwrap_or_default();
            let role = role_types
                .first()
                .cloned()
                .unwrap_or_else(|| "Model".to_string());
            let status = item
                .get("status")
                .and_then(|v| v.as_str())
                .unwrap_or("inactive")
                .to_string();
            let consent = item
                .get("consent_status")
                .and_then(|v| v.as_str())
                .unwrap_or("missing")
                .to_string();

            let ai_usage: Vec<String> = item
                .get("ai_usage")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str().map(|s| s.to_string()))
                        .collect()
                })
                .unwrap_or_default();

            let followers_val = item
                .get("instagram_followers")
                .and_then(|v| v.as_i64())
                .unwrap_or(0);
            let followers = format_number(followers_val);

            let assets = item
                .get("total_assets")
                .and_then(|v| v.as_i64())
                .unwrap_or(0) as i32;
            let top_brand = item
                .get("top_brand")
                .and_then(|v| v.as_str())
                .unwrap_or("—")
                .to_string();
            let expiry = item
                .get("license_expiry")
                .and_then(|v| v.as_str())
                .unwrap_or("—")
                .to_string();

            let earnings_val = item
                .get("earnings_30d")
                .and_then(|v| v.as_i64())
                .unwrap_or(0);
            let earnings = format!("${}", format_number(earnings_val));

            let projected_val = item
                .get("projected_earnings")
                .and_then(|v| v.as_i64())
                .unwrap_or(0);
            let projected = format!("${}", format_number(projected_val));

            let is_verified = item
                .get("is_verified_talent")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            let img = item
                .get("profile_photo_url")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let photo_urls: Vec<String> = item
                .get("photo_urls")
                .map(parse_string_array_value)
                .unwrap_or_default();

            if !id.is_empty() {
                let entry = asset_urls_by_talent.entry(id.clone()).or_default();
                if !img.trim().is_empty() {
                    entry.insert(normalize_asset_url(&img));
                }
                for u in photo_urls.iter() {
                    let t = u.trim();
                    if !t.is_empty() {
                        entry.insert(normalize_asset_url(t));
                    }
                }
            }
            let bio = item
                .get("bio_notes")
                .or(item.get("bio"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let engagement_rate = item
                .get("engagement_rate")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0);
            let last_updated = item
                .get("updated_at")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let special_skills = item
                .get("special_skills")
                .and_then(|v| {
                    v.as_str()
                        .map(|s| {
                            if let Some(arr) = try_parse_json_string_array(s) {
                                arr.join(", ")
                            } else {
                                s.to_string()
                            }
                        })
                        .or_else(|| {
                            v.as_array().map(|arr| {
                                arr.iter()
                                    .filter_map(|x| x.as_str())
                                    .collect::<Vec<_>>()
                                    .join(", ")
                            })
                        })
                })
                .unwrap_or_default();

            let date_of_birth = item
                .get("date_of_birth")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let gender_identity = item
                .get("gender_identity")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let height_feet = item
                .get("height_feet")
                .and_then(|v| v.as_i64())
                .map(|v| v as i32);
            let height_inches = item
                .get("height_inches")
                .and_then(|v| v.as_i64())
                .map(|v| v as i32);
            let bust_inches = item
                .get("bust_chest_inches")
                .or(item.get("bust_inches"))
                .and_then(|v| v.as_i64())
                .map(|v| v as i32);
            let waist_inches = item
                .get("waist_inches")
                .and_then(|v| v.as_i64())
                .map(|v| v as i32);
            let hips_inches = item
                .get("hips_inches")
                .and_then(|v| v.as_i64())
                .map(|v| v as i32);
            let hair_color = item
                .get("hair_color")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let eye_color = item
                .get("eye_color")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let race_ethnicity: Vec<String> = item
                .get("race_ethnicity")
                .and_then(|v| {
                    v.as_array().map(|arr| {
                        arr.iter()
                            .filter_map(|x| x.as_str().map(|s| s.to_string()))
                            .collect::<Vec<_>>()
                    })
                })
                .or_else(|| {
                    item.get("race_ethnicity")
                        .and_then(|v| v.as_str())
                        .map(split_csv_tags)
                })
                .unwrap_or_default();

            let tattoos = item.get("tattoos").and_then(|v| v.as_bool());
            let piercings = item.get("piercings").and_then(|v| v.as_bool());

            let roster_row = TalentRow {
                id: id.clone(),
                name,
                stage_name,
                role,
                role_types,
                status,
                consent,
                ai_usage,
                followers,
                followers_val,
                assets,
                top_brand,
                expiry,
                earnings,
                earnings_val,
                projected,
                projected_val,
                is_verified,
                img,
                photo_urls,
                bio,
                engagement_rate,
                email,
                phone,
                city,
                state_province,
                country,
                last_updated,
                special_skills,
                date_of_birth,
                gender_identity,
                height_feet,
                height_inches,
                bust_inches,
                waist_inches,
                hips_inches,
                measurements: None,
                hair_color,
                eye_color,
                race_ethnicity,
                tattoos,
                piercings,
            };

            roster.push(roster_row);
            if !id.is_empty() {
                talent_ids.push(id);
            }
        }
    }

    let mut active_campaigns: i64 = 0;
    let mut earnings_30d_by_talent: HashMap<String, i64> = HashMap::new();
    let mut earnings_prev_30d_by_talent: HashMap<String, i64> = HashMap::new();
    let license_expiry_by_talent: HashMap<String, String> = HashMap::new();
    type DigitalsPhysicals = (Option<i32>, Option<i32>, Option<i32>, Option<String>);
    let mut digitals_by_talent: HashMap<String, DigitalsPhysicals> = HashMap::new();
    let mut status_by_talent: HashMap<String, String> = HashMap::new();
    let mut top_brand_by_talent: HashMap<String, String> = HashMap::new();

    let mut earnings_30d_total_cents: i64 = 0;
    let mut earnings_prev_30d_total_cents: i64 = 0;

    if !talent_ids.is_empty() {
        let ids: Vec<&str> = talent_ids.iter().map(|s| s.as_str()).collect();

        let digitals_resp = state
            .pg
            .from("digitals")
            .select("talent_id,photo_urls,comp_card_url,bust_inches,waist_inches,hips_inches,uploaded_at,created_at")
            .in_("talent_id", ids.clone())
            .order("uploaded_at.desc")
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let digitals_status = digitals_resp.status();
        let digitals_text = digitals_resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        if !digitals_status.is_success() {
            warn!(agency_id = %user.id, status = %digitals_status, body = %digitals_text, "digitals lookup failed");
            return Err((StatusCode::INTERNAL_SERVER_ERROR, digitals_text));
        }

        let digitals_rows: serde_json::Value =
            serde_json::from_str(&digitals_text).unwrap_or(serde_json::json!([]));
        if let Some(arr) = digitals_rows.as_array() {
            for r in arr {
                let t_id = r.get("talent_id").and_then(|v| v.as_str()).unwrap_or("");
                if t_id.is_empty() {
                    continue;
                }

                let entry = asset_urls_by_talent.entry(t_id.to_string()).or_default();
                if let Some(v) = r.get("photo_urls") {
                    for u in parse_string_array_value(v).iter() {
                        let t = u.trim();
                        if !t.is_empty() {
                            entry.insert(normalize_asset_url(t));
                        }
                    }
                }
                if let Some(cc) = r.get("comp_card_url").and_then(|v| v.as_str()) {
                    let t = cc.trim();
                    if !t.is_empty() {
                        entry.insert(normalize_asset_url(t));
                    }
                }

                if digitals_by_talent.contains_key(t_id) {
                    continue;
                }
                let bust = r
                    .get("bust_inches")
                    .and_then(|v| v.as_i64())
                    .map(|v| v as i32);
                let waist = r
                    .get("waist_inches")
                    .and_then(|v| v.as_i64())
                    .map(|v| v as i32);
                let hips = r
                    .get("hips_inches")
                    .and_then(|v| v.as_i64())
                    .map(|v| v as i32);
                let measurements = if let (Some(b), Some(w), Some(h)) = (bust, waist, hips) {
                    Some(format!("{b}-{w}-{h}"))
                } else {
                    None
                };
                digitals_by_talent.insert(t_id.to_string(), (bust, waist, hips, measurements));
            }
        }

        let active_campaigns_resp = state
            .pg
            .from("campaigns")
            .select("id")
            .in_("talent_id", ids.clone())
            .in_("status", vec!["Pending", "Confirmed"])
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let active_campaigns_text = active_campaigns_resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let active_campaigns_rows: serde_json::Value =
            serde_json::from_str(&active_campaigns_text).unwrap_or(serde_json::json!([]));
        active_campaigns = active_campaigns_rows
            .as_array()
            .map(|a| a.len() as i64)
            .unwrap_or(0);

        // Status (Active/Pending/Inactive) based on whether talent is currently booked.
        // Active: campaign is ongoing now
        // Pending: campaign is booked in the future
        // Inactive: no pending/confirmed campaigns
        let today = chrono::Utc::now().date_naive();
        let now = chrono::Utc::now();
        let booking_resp = state
            .pg
            .from("campaigns")
            .select("talent_id,status,start_at,end_at,date")
            .in_("talent_id", ids.clone())
            .in_("status", vec!["Pending", "Confirmed"])
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let booking_text = booking_resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let booking_rows: serde_json::Value =
            serde_json::from_str(&booking_text).unwrap_or(serde_json::json!([]));
        if let Some(arr) = booking_rows.as_array() {
            for r in arr {
                let t_id = r.get("talent_id").and_then(|v| v.as_str()).unwrap_or("");
                if t_id.is_empty() {
                    continue;
                }

                let start_at = r
                    .get("start_at")
                    .and_then(|v| v.as_str())
                    .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
                    .map(|dt| dt.with_timezone(&chrono::Utc));
                let end_at = r
                    .get("end_at")
                    .and_then(|v| v.as_str())
                    .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
                    .map(|dt| dt.with_timezone(&chrono::Utc));
                let date = r
                    .get("date")
                    .and_then(|v| v.as_str())
                    .and_then(|s| chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());

                let is_active = match (start_at, end_at, date) {
                    (Some(sa), Some(ea), _) => now >= sa && now <= ea,
                    (_, _, Some(d)) => d == today,
                    _ => false,
                };
                let is_future = match (start_at, date) {
                    (Some(sa), _) => sa > now,
                    (_, Some(d)) => d > today,
                    _ => false,
                };

                let current = status_by_talent
                    .get(t_id)
                    .cloned()
                    .unwrap_or_else(|| "Inactive".to_string());
                let next = if is_active {
                    "Active".to_string()
                } else if is_future {
                    if current == "Active" {
                        current
                    } else {
                        "Pending".to_string()
                    }
                } else {
                    current
                };
                status_by_talent.insert(t_id.to_string(), next);
            }
        }

        let lr_resp = state
            .pg
            .from("licensing_requests")
            .select("talent_id,status")
            .eq("agency_id", &user.id)
            .in_("talent_id", ids.clone())
            .eq("status", "pending")
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let lr_text = lr_resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let lr_rows: serde_json::Value =
            serde_json::from_str(&lr_text).unwrap_or(serde_json::json!([]));
        if let Some(arr) = lr_rows.as_array() {
            for r in arr {
                let t_id = r.get("talent_id").and_then(|v| v.as_str()).unwrap_or("");
                if t_id.is_empty() {
                    continue;
                }

                let current = status_by_talent
                    .get(t_id)
                    .cloned()
                    .unwrap_or_else(|| "Inactive".to_string());
                if current != "Active" {
                    status_by_talent.insert(t_id.to_string(), "Pending".to_string());
                }
            }
        }

        // Top brand based on last-30d earnings.
        // 30D window is based on booking date: end_at (preferred), else date.
        // Earnings are taken from computed campaigns.talent_earnings_cents (split-based).
        let start_30d = chrono::Utc::now() - chrono::Duration::days(30);
        let start_30d_date = start_30d.date_naive();
        let revenue_resp = state
            .pg
            .from("campaigns")
            .select("talent_id,brand_id,talent_earnings_cents,date,end_at")
            .in_("talent_id", ids.clone())
            .eq("status", "Completed")
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let revenue_text = revenue_resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let revenue_rows: serde_json::Value =
            serde_json::from_str(&revenue_text).unwrap_or(serde_json::json!([]));

        let mut revenue_by_talent_brand: HashMap<(String, String), i64> = HashMap::new();
        let mut brand_ids: Vec<String> = Vec::new();
        if let Some(arr) = revenue_rows.as_array() {
            for r in arr {
                let t_id = r.get("talent_id").and_then(|v| v.as_str()).unwrap_or("");
                let b_id = r.get("brand_id").and_then(|v| v.as_str()).unwrap_or("");
                if t_id.is_empty() || b_id.is_empty() {
                    continue;
                }

                let end_at_date = r
                    .get("end_at")
                    .and_then(|v| v.as_str())
                    .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
                    .map(|dt| dt.date_naive());
                let date = r
                    .get("date")
                    .and_then(|v| v.as_str())
                    .and_then(|s| chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());
                let booking_date = end_at_date.or(date);
                if let Some(d) = booking_date {
                    if d < start_30d_date {
                        continue;
                    }
                } else {
                    continue;
                }

                let amount_cents: i64 = r
                    .get("talent_earnings_cents")
                    .and_then(|v| {
                        v.as_i64()
                            .or_else(|| v.as_str().and_then(|s| s.parse::<i64>().ok()))
                    })
                    .unwrap_or(0);
                *revenue_by_talent_brand
                    .entry((t_id.to_string(), b_id.to_string()))
                    .or_insert(0) += amount_cents;
                brand_ids.push(b_id.to_string());
            }
        }

        brand_ids.sort();
        brand_ids.dedup();
        let mut brand_name_by_id: HashMap<String, String> = HashMap::new();
        if !brand_ids.is_empty() {
            let ids_brands: Vec<&str> = brand_ids.iter().map(|s| s.as_str()).collect();
            let brands_resp = state
                .pg
                .from("brands")
                .select("id,company_name")
                .in_("id", ids_brands)
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let brands_text = brands_resp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let brands_rows: serde_json::Value =
                serde_json::from_str(&brands_text).unwrap_or(serde_json::json!([]));
            if let Some(arr) = brands_rows.as_array() {
                for r in arr {
                    let id = r.get("id").and_then(|v| v.as_str()).unwrap_or("");
                    let name = r
                        .get("company_name")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                    if !id.is_empty() && !name.is_empty() {
                        brand_name_by_id.insert(id.to_string(), name);
                    }
                }
            }
        }

        for t_id in talent_ids.iter() {
            let mut best: Option<(String, i64)> = None;
            for ((tid, bid), cents) in revenue_by_talent_brand.iter() {
                if tid != t_id {
                    continue;
                }
                match best {
                    Some((_, best_cents)) if *cents <= best_cents => {}
                    _ => best = Some((bid.clone(), *cents)),
                }
            }
            if let Some((bid, _)) = best {
                let name = brand_name_by_id
                    .get(&bid)
                    .cloned()
                    .unwrap_or_else(|| "—".to_string());
                top_brand_by_talent.insert(t_id.clone(), name);
            }
        }

        // Earnings per talent: computed from campaigns split fields.
        // We use a 60D lookback so we can show the previous 30D period.
        let start_30d = chrono::Utc::now() - chrono::Duration::days(30);
        let start_60d = chrono::Utc::now() - chrono::Duration::days(60);
        let start_30d_date = start_30d.date_naive();
        let start_60d_date = start_60d.date_naive();

        let earnings_resp = state
            .pg
            .from("campaigns")
            .select("talent_id,talent_earnings_cents,date,end_at")
            .in_("talent_id", ids.clone())
            .eq("status", "Completed")
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let earnings_text = earnings_resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let earnings_rows: serde_json::Value =
            serde_json::from_str(&earnings_text).unwrap_or(serde_json::json!([]));

        if let Some(arr) = earnings_rows.as_array() {
            for r in arr {
                let t_id = r.get("talent_id").and_then(|v| v.as_str()).unwrap_or("");
                if t_id.is_empty() {
                    continue;
                }

                let end_at_date = r
                    .get("end_at")
                    .and_then(|v| v.as_str())
                    .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
                    .map(|dt| dt.date_naive());
                let date = r
                    .get("date")
                    .and_then(|v| v.as_str())
                    .and_then(|s| chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());
                let booking_date = end_at_date.or(date);
                let Some(d) = booking_date else {
                    continue;
                };
                if d < start_60d_date {
                    continue;
                }

                let cents: i64 = r
                    .get("talent_earnings_cents")
                    .and_then(|v| {
                        v.as_i64()
                            .or_else(|| v.as_str().and_then(|s| s.parse::<i64>().ok()))
                    })
                    .unwrap_or(0);

                if d >= start_30d_date {
                    let entry = earnings_30d_by_talent.entry(t_id.to_string()).or_insert(0);
                    *entry += cents;
                    earnings_30d_total_cents += cents;
                } else {
                    let entry = earnings_prev_30d_by_talent
                        .entry(t_id.to_string())
                        .or_insert(0);
                    *entry += cents;
                    earnings_prev_30d_total_cents += cents;
                }
            }
        }

        let bookings_resp = state
            .pg
            .from("bookings")
            .select("talent_id,rate_cents,currency,date,status")
            .eq("agency_user_id", &user.id)
            .eq("status", "completed")
            .in_("talent_id", ids.clone())
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let bookings_text = bookings_resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let bookings_rows: serde_json::Value =
            serde_json::from_str(&bookings_text).unwrap_or(serde_json::json!([]));

        if let Some(arr) = bookings_rows.as_array() {
            for r in arr {
                let t_id = r.get("talent_id").and_then(|v| v.as_str()).unwrap_or("");
                if t_id.is_empty() {
                    continue;
                }

                let date = r
                    .get("date")
                    .and_then(|v| v.as_str())
                    .and_then(|s| chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());
                let Some(d) = date else {
                    continue;
                };
                if d < start_60d_date {
                    continue;
                }

                let currency = r
                    .get("currency")
                    .and_then(|v| v.as_str())
                    .unwrap_or("USD")
                    .to_uppercase();
                if currency != "USD" {
                    continue;
                }

                let cents: i64 = r
                    .get("rate_cents")
                    .and_then(|v| {
                        v.as_i64()
                            .or_else(|| v.as_str().and_then(|s| s.parse::<i64>().ok()))
                    })
                    .unwrap_or(0);

                if d >= start_30d_date {
                    let entry = earnings_30d_by_talent.entry(t_id.to_string()).or_insert(0);
                    *entry += cents;
                    earnings_30d_total_cents += cents;
                } else {
                    let entry = earnings_prev_30d_by_talent
                        .entry(t_id.to_string())
                        .or_insert(0);
                    *entry += cents;
                    earnings_prev_30d_total_cents += cents;
                }
            }
        }

        for t_id in talent_ids.iter() {
            let cents = earnings_30d_by_talent.get(t_id).cloned().unwrap_or(0);
            let body = serde_json::json!({ "earnings_30d": cents });
            let upd = state
                .pg
                .from("agency_users")
                .eq("agency_id", &user.id)
                .eq("id", t_id)
                .update(body.to_string())
                .execute()
                .await;
            if let Ok(resp) = upd {
                if !resp.status().is_success() {
                    let txt = resp.text().await.unwrap_or_default();
                    warn!(talent_id = %t_id, body = %txt, "failed to persist earnings_30d");
                }
            } else if let Err(e) = upd {
                warn!(talent_id = %t_id, error = %e, "failed to persist earnings_30d");
            }
        }

        // License expiry: derived from brand_licenses (voice/brand licensing) when possible.
        // We best-effort map agency_users -> creators via email, then creators.id -> brand_licenses.face_user_id.
        // If anything is missing (tables/columns), we fall back to the existing agency_users.license_expiry field.
    }

    let mut assets_updates: Vec<(String, i32)> = Vec::new();

    for t in roster.iter_mut() {
        let computed_assets = asset_urls_by_talent
            .get(&t.id)
            .map(|s| s.len() as i32)
            .unwrap_or(0);

        if computed_assets != t.assets {
            t.assets = computed_assets;
            assets_updates.push((t.id.clone(), computed_assets));
        }

        if let Some(tb) = top_brand_by_talent.get(&t.id) {
            t.top_brand = tb.clone();
        }
        if t.top_brand.trim().is_empty() {
            t.top_brand = "—".to_string();
        }

        if let Some((b, w, h, m)) = digitals_by_talent.get(&t.id) {
            t.bust_inches = *b;
            t.waist_inches = *w;
            t.hips_inches = *h;
            t.measurements = m.clone();
        }
        if let Some(v) = earnings_30d_by_talent.get(&t.id) {
            t.earnings_val = *v;
            let cents = t.earnings_val;
            let abs = cents.abs();
            let dollars = abs / 100;
            let rem = abs % 100;
            let sign = if cents < 0 { "-" } else { "" };
            t.earnings = format!("{}${}.{:02}", sign, format_number(dollars), rem);
        }
        if let Some(st) = status_by_talent.get(&t.id) {
            t.status = st.clone();
        }
        if let Some(exp) = license_expiry_by_talent.get(&t.id) {
            t.expiry = exp.clone();
        }
    }

    for (t_id, assets) in assets_updates {
        let body = serde_json::json!({ "total_assets": assets });
        let upd = state
            .pg
            .from("agency_users")
            .eq("agency_id", &user.id)
            .eq("id", &t_id)
            .update(body.to_string())
            .execute()
            .await;
        if let Ok(resp) = upd {
            if !resp.status().is_success() {
                let txt = resp.text().await.unwrap_or_default();
                warn!(talent_id = %t_id, body = %txt, "failed to persist total_assets");
            }
        } else if let Err(e) = upd {
            warn!(talent_id = %t_id, error = %e, "failed to persist total_assets");
        }
    }

    Ok(Json(AgencyRosterResponse {
        active_campaigns,
        earnings_30d_total_cents,
        earnings_prev_30d_total_cents,
        talents: roster,
    }))
}

pub async fn list_talent_campaigns(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<Vec<serde_json::Value>>, (StatusCode, String)> {
    let talent_resp = state
        .pg
        .from("agency_users")
        .select("id")
        .eq("id", &id)
        .eq("agency_id", &user.id)
        .eq("role", "talent")
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !talent_resp.status().is_success() {
        let err = talent_resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }
    let talent_text = talent_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let talent_rows: serde_json::Value = serde_json::from_str(&talent_text).unwrap_or(json!([]));
    if talent_rows.as_array().map(|a| a.is_empty()).unwrap_or(true) {
        return Err((StatusCode::NOT_FOUND, "Talent not found".to_string()));
    }

    let resp = state
        .pg
        .from("campaigns")
        .select("id,name,date,payment_amount,status,agency_percent,talent_percent,agency_earnings_cents,talent_earnings_cents")
        .eq("talent_id", &id)
        .order("date.desc")
        .limit(5)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    Ok(Json(rows))
}

fn format_number(n: i64) -> String {
    if n >= 1_000_000 {
        format!("{:.1}M", n as f64 / 1_000_000.0)
    } else if n >= 1_000 {
        format!("{:.1}K", n as f64 / 1_000.0)
    } else {
        n.to_string()
    }
}

#[derive(Deserialize)]
pub struct CreateTalentRequest {
    pub full_name: String,
    pub stage_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub birthdate: Option<String>,
    pub role_type: Option<StringOrVec>,
    pub status: Option<String>,
    pub instagram_handle: Option<String>,
    pub instagram_followers: Option<i64>,
    pub engagement_rate: Option<f64>,
    pub profile_photo_url: Option<String>,
    pub photo_urls: Option<Vec<String>>,
    pub bio: Option<String>,
    pub special_skills: Option<StringOrVec>,

    // Physicals
    pub height_feet: Option<i32>,
    pub height_inches: Option<i32>,
    pub bust_inches: Option<i32>,
    pub waist_inches: Option<i32>,
    pub hips_inches: Option<i32>,
    pub gender_identity: Option<String>,
    pub race_ethnicity: Option<StringOrVec>,
    pub hair_color: Option<String>,
    pub eye_color: Option<String>,
    pub skin_tone: Option<String>,

    pub tattoos: Option<bool>,
    pub piercings: Option<bool>,

    // Location
    pub city: Option<String>,
    pub state_province: Option<String>,
    pub country: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateTalentRequest {
    pub full_name: Option<String>,
    pub stage_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub birthdate: Option<String>,
    pub role_type: Option<StringOrVec>,
    pub status: Option<String>,
    pub instagram_handle: Option<String>,
    pub instagram_followers: Option<i64>,
    pub engagement_rate: Option<f64>,
    pub profile_photo_url: Option<String>,
    pub photo_urls: Option<Vec<String>>,
    pub bio: Option<String>,
    pub special_skills: Option<StringOrVec>,

    // Physicals
    pub height_feet: Option<i32>,
    pub height_inches: Option<i32>,
    pub bust_inches: Option<i32>,
    pub waist_inches: Option<i32>,
    pub hips_inches: Option<i32>,
    pub gender_identity: Option<String>,
    pub race_ethnicity: Option<StringOrVec>,
    pub hair_color: Option<String>,
    pub eye_color: Option<String>,
    pub skin_tone: Option<String>,

    pub tattoos: Option<bool>,
    pub piercings: Option<bool>,

    // Location
    pub city: Option<String>,
    pub state_province: Option<String>,
    pub country: Option<String>,
}

use serde_json::json;

pub async fn create_talent(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<CreateTalentRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let role_types: Vec<String> = payload
        .role_type
        .clone()
        .map(|v| {
            v.into_vec()
                .into_iter()
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    if role_types.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "role_type is required".to_string()));
    }

    let birthdate_str = payload.birthdate.clone().ok_or_else(|| {
        (
            StatusCode::BAD_REQUEST,
            "birthdate is required and must be at least 18 years old".to_string(),
        )
    })?;

    let birthdate = NaiveDate::parse_from_str(&birthdate_str, "%Y-%m-%d")
        .or_else(|_| chrono::DateTime::parse_from_rfc3339(&birthdate_str).map(|dt| dt.date_naive()))
        .map_err(|_| {
            (
                StatusCode::BAD_REQUEST,
                "Invalid birthdate format. Expected YYYY-MM-DD".to_string(),
            )
        })?;

    let today = chrono::Utc::now().date_naive();
    let mut age = today.year() - birthdate.year();
    if (today.month(), today.day()) < (birthdate.month(), birthdate.day()) {
        age -= 1;
    }
    if age < 18 {
        return Err((
            StatusCode::BAD_REQUEST,
            "Talent must be at least 18 years old".to_string(),
        ));
    }

    let role_type = if role_types.len() == 1 {
        role_types[0].clone()
    } else {
        serde_json::to_string(&role_types).unwrap_or_else(|_| role_types[0].clone())
    };
    let status = payload.status.clone().unwrap_or("inactive".to_string());
    let race_ethnicity = payload.race_ethnicity.clone().map(|v| v.into_vec());
    let special_skills = payload.special_skills.clone().map(|v| match v {
        StringOrVec::String(s) => split_csv_tags(&s),
        StringOrVec::Vec(v) => v,
    });

    tracing::info!(
        "Creating talent for agency {}: {:?}",
        user.id,
        payload.full_name
    );

    // 1. Check Seat Limit
    let agency_resp = state
        .pg
        .from("agencies")
        .select("seats_limit")
        .eq("id", &user.id)
        .single()
        .execute()
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to fetch agency: {}", e),
            )
        })?;

    let agency_text = agency_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let agency_data: serde_json::Value = serde_json::from_str(&agency_text).unwrap_or(json!({}));
    let seats_limit = agency_data
        .get("seats_limit")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);

    // 2. Check current talent count
    let count_resp = state
        .pg
        .from("agency_users")
        .select("id")
        .eq("agency_id", &user.id)
        .eq("role", "talent")
        .execute()
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to count talent: {}", e),
            )
        })?;

    let count_text = count_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let count_data: Vec<serde_json::Value> = serde_json::from_str(&count_text).unwrap_or_default();

    if count_data.len() >= seats_limit as usize {
        return Err((
            StatusCode::FORBIDDEN,
            "Insufficient seats! Buy seats to create talents.".to_string(),
        ));
    }

    // 3. Insert and return the record
    let mut v = json!({
        "agency_id": user.id,
        "full_legal_name": payload.full_name,
        "stage_name": payload.stage_name,
        "email": payload.email,
        "phone_number": payload.phone,
        "date_of_birth": birthdate_str,
        "role": "talent",
        "role_type": role_type,
        "status": status,
        "profile_photo_url": payload.profile_photo_url,
        "photo_urls": payload.photo_urls,
        "bio_notes": payload.bio,
        "special_skills": special_skills,
        "instagram_handle": payload.instagram_handle,
        "instagram_followers": payload.instagram_followers.unwrap_or(0),
        "engagement_rate": payload.engagement_rate.unwrap_or(0.0),

        "height_feet": payload.height_feet,
        "height_inches": payload.height_inches,
        "bust_chest_inches": payload.bust_inches,
        "waist_inches": payload.waist_inches,
        "hips_inches": payload.hips_inches,
        "gender_identity": payload.gender_identity,
        "race_ethnicity": race_ethnicity,
        "hair_color": payload.hair_color,
        "eye_color": payload.eye_color,
        "skin_tone": payload.skin_tone,

        "tattoos": payload.tattoos,
        "piercings": payload.piercings,

        "city": payload.city,
        "state_province": payload.state_province,
        "country": payload.country,
    });

    if let serde_json::Value::Object(ref mut map) = v {
        let null_keys: Vec<String> = map
            .iter()
            .filter_map(|(k, val)| if val.is_null() { Some(k.clone()) } else { None })
            .collect();
        for k in null_keys {
            map.remove(&k);
        }
    }

    let resp = state
        .pg
        .from("agency_users")
        .insert(v.to_string())
        .execute()
        .await
        .map_err(|e| {
            tracing::error!(
                "Failed to insert talent (race_ethnicity={:?}): {}",
                race_ethnicity,
                e
            );
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    if !resp.status().is_success() {
        let err_text = resp.text().await.unwrap_or_default();
        tracing::error!(
            "DB error during talent insert (race_ethnicity={:?}): {}",
            race_ethnicity,
            err_text
        );
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err_text));
    }

    let inserted_text = resp.text().await.unwrap_or_default();
    let inserted_val: serde_json::Value =
        serde_json::from_str(&inserted_text).unwrap_or(json!({ "status": "ok" }));

    tracing::info!("Successfully created talent: {}", payload.full_name);

    Ok(Json(inserted_val))
}

pub async fn update_talent(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<UpdateTalentRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let race_ethnicity = payload.race_ethnicity.clone().map(|v| v.into_vec());
    let role_type = payload.role_type.clone().map(|v| {
        let role_types = v
            .into_vec()
            .into_iter()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect::<Vec<_>>();
        if role_types.is_empty() {
            "".to_string()
        } else if role_types.len() == 1 {
            role_types[0].clone()
        } else {
            serde_json::to_string(&role_types).unwrap_or_else(|_| role_types[0].clone())
        }
    });
    if let Some(ref s) = role_type {
        if s.trim().is_empty() {
            return Err((
                StatusCode::BAD_REQUEST,
                "role_type cannot be empty".to_string(),
            ));
        }
    }
    let special_skills = payload.special_skills.clone().map(|v| match v {
        StringOrVec::String(s) => split_csv_tags(&s),
        StringOrVec::Vec(v) => v,
    });

    let mut v = json!({
        "full_legal_name": payload.full_name,
        "stage_name": payload.stage_name,
        "email": payload.email,
        "phone_number": payload.phone,
        "date_of_birth": payload.birthdate,
        "role_type": role_type,
        "status": payload.status,
        "profile_photo_url": payload.profile_photo_url,
        "photo_urls": payload.photo_urls,
        "bio_notes": payload.bio,
        "special_skills": special_skills,
        "instagram_handle": payload.instagram_handle,
        "instagram_followers": payload.instagram_followers,
        "engagement_rate": payload.engagement_rate,

        "height_feet": payload.height_feet,
        "height_inches": payload.height_inches,
        "bust_chest_inches": payload.bust_inches,
        "waist_inches": payload.waist_inches,
        "hips_inches": payload.hips_inches,
        "gender_identity": payload.gender_identity,
        "race_ethnicity": race_ethnicity,
        "hair_color": payload.hair_color,
        "eye_color": payload.eye_color,
        "skin_tone": payload.skin_tone,

        "tattoos": payload.tattoos,
        "piercings": payload.piercings,

        "city": payload.city,
        "state_province": payload.state_province,
        "country": payload.country,
    });

    if let serde_json::Value::Object(ref mut map) = v {
        let null_keys: Vec<String> = map
            .iter()
            .filter_map(|(k, val)| if val.is_null() { Some(k.clone()) } else { None })
            .collect();
        for k in null_keys {
            map.remove(&k);
        }
    }

    let resp = state
        .pg
        .from("agency_users")
        .eq("id", &id)
        .eq("agency_id", &user.id)
        .eq("role", "talent")
        .update(v.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let err_text = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err_text));
    }

    let updated_text = resp.text().await.unwrap_or_default();
    let updated_val: serde_json::Value =
        serde_json::from_str(&updated_text).unwrap_or(json!({ "status": "ok" }));
    Ok(Json(updated_val))
}
