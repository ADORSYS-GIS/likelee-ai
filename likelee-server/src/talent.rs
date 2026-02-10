use crate::{auth::AuthUser, auth::RoleGuard, config::AppState};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::Serialize;
use serde_json::json;
use std::collections::HashMap;
use tracing::warn;

#[derive(Serialize)]
pub struct TalentMeResponse {
    pub status: String,
    pub agency_user: serde_json::Value,
}

#[derive(Clone)]
struct ResolvedTalent {
    talent_id: String,
    agency_id: String,
    agency_user_row: serde_json::Value,
}

async fn resolve_talent(state: &AppState, user: &AuthUser) -> Result<ResolvedTalent, (StatusCode, String)> {
    RoleGuard::new(vec!["creator", "talent"]).check(&user.role)?;

    let resp = state
        .pg
        .from("agency_users")
        .select("*")
        .or(format!("creator_id.eq.{},user_id.eq.{}", user.id, user.id))
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut rows: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!([]));
    let row = rows
        .as_array_mut()
        .and_then(|a| a.pop())
        .unwrap_or(json!(null));

    let talent_id = row
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    if talent_id.is_empty() {
        return Err((StatusCode::NOT_FOUND, "Talent profile not found".to_string()));
    }

    let agency_id = row
        .get("agency_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    Ok(ResolvedTalent {
        talent_id,
        agency_id,
        agency_user_row: row,
    })
}

pub async fn talent_me(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<TalentMeResponse>, (StatusCode, String)> {
    let resolved = resolve_talent(&state, &user).await?;
    let mut row = resolved.agency_user_row;
    let agency_id = resolved.agency_id;

    if !agency_id.is_empty() {
        let aresp = state
            .pg
            .from("agencies")
            .select("agency_name")
            .eq("id", &agency_id)
            .limit(1)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        if aresp.status().is_success() {
            let atext = aresp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let arows: serde_json::Value = serde_json::from_str(&atext).unwrap_or(json!([]));
            let agency_name = arows
                .as_array()
                .and_then(|a| a.first())
                .and_then(|r| r.get("agency_name"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            if let (Some(name), Some(obj)) = (agency_name, row.as_object_mut()) {
                obj.insert("agency_name".to_string(), json!(name));
            }
        }
    }

    Ok(Json(TalentMeResponse {
        status: "ok".to_string(),
        agency_user: row,
    }))
}

#[derive(Serialize)]
pub struct TalentLicensingRequestItem {
    pub id: String,
    pub brand_id: Option<String>,
    pub brand_name: Option<String>,
    pub campaign_title: Option<String>,
    pub budget_min: Option<f64>,
    pub budget_max: Option<f64>,
    pub usage_scope: Option<String>,
    pub regions: Option<String>,
    pub deadline: Option<String>,
    pub created_at: Option<String>,
    pub status: String,
    pub pay_set: bool,
}

pub async fn list_licensing_requests(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<Vec<TalentLicensingRequestItem>>, (StatusCode, String)> {
    let resolved = resolve_talent(&state, &user).await?;

    let resp = state
        .pg
        .from("licensing_requests")
        .select("id,brand_id,talent_id,status,created_at,campaign_title,budget_min,budget_max,usage_scope,regions,deadline")
        .eq("agency_id", &resolved.agency_id)
        .eq("talent_id", &resolved.talent_id)
        .order("created_at.desc")
        .limit(250)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let rows: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!([]));
    let reqs = rows.as_array().cloned().unwrap_or_default();

    let mut brand_ids: Vec<String> = reqs
        .iter()
        .filter_map(|r| r.get("brand_id").and_then(|v| v.as_str()).map(|s| s.to_string()))
        .filter(|s| !s.is_empty())
        .collect();
    brand_ids.sort();
    brand_ids.dedup();

    let mut brand_name_by_id: HashMap<String, String> = HashMap::new();
    if !brand_ids.is_empty() {
        let ids: Vec<&str> = brand_ids.iter().map(|s| s.as_str()).collect();
        let b_resp = state
            .pg
            .from("brands")
            .select("id,company_name")
            .in_("id", ids)
            .execute()
            .await;
        if let Ok(b_resp) = b_resp {
            if b_resp.status().is_success() {
                let b_text = b_resp.text().await.unwrap_or_else(|_| "[]".into());
                let b_rows: serde_json::Value = serde_json::from_str(&b_text).unwrap_or(json!([]));
                if let Some(arr) = b_rows.as_array() {
                    for r in arr {
                        let id = r.get("id").and_then(|v| v.as_str()).unwrap_or("");
                        let name = r.get("company_name").and_then(|v| v.as_str()).unwrap_or("");
                        if !id.is_empty() {
                            brand_name_by_id.insert(id.to_string(), name.to_string());
                        }
                    }
                }
            }
        }
    }

    let mut request_ids: Vec<String> = reqs
        .iter()
        .filter_map(|r| r.get("id").and_then(|v| v.as_str()).map(|s| s.to_string()))
        .filter(|s| !s.is_empty())
        .collect();
    request_ids.sort();
    request_ids.dedup();

    let mut pay_set_request_ids: std::collections::HashSet<String> = std::collections::HashSet::new();
    if !request_ids.is_empty() {
        let ids: Vec<&str> = request_ids.iter().map(|s| s.as_str()).collect();
        let c_resp = state
            .pg
            .from("campaigns")
            .select("licensing_request_id,payment_amount")
            .in_("licensing_request_id", ids)
            .execute()
            .await;
        if let Ok(c_resp) = c_resp {
            if c_resp.status().is_success() {
                let c_text = c_resp.text().await.unwrap_or_else(|_| "[]".into());
                let c_rows: serde_json::Value = serde_json::from_str(&c_text).unwrap_or(json!([]));
                if let Some(arr) = c_rows.as_array() {
                    for r in arr {
                        let lrid = r
                            .get("licensing_request_id")
                            .and_then(|v| v.as_str())
                            .unwrap_or("");
                        if lrid.is_empty() {
                            continue;
                        }
                        let has_payment = r
                            .get("payment_amount")
                            .map(|v| !v.is_null())
                            .unwrap_or(false);
                        if has_payment {
                            pay_set_request_ids.insert(lrid.to_string());
                        }
                    }
                }
            }
        }
    }

    let out: Vec<TalentLicensingRequestItem> = reqs
        .iter()
        .filter_map(|r| {
            let id = r.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
            if id.is_empty() {
                return None;
            }
            let brand_id = r
                .get("brand_id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .filter(|s| !s.is_empty());
            let brand_name = brand_id
                .as_ref()
                .and_then(|bid| brand_name_by_id.get(bid).cloned());
            let status = r
                .get("status")
                .and_then(|v| v.as_str())
                .unwrap_or("pending")
                .to_string();

            Some(TalentLicensingRequestItem {
                id: id.clone(),
                brand_id,
                brand_name,
                campaign_title: r
                    .get("campaign_title")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
                    .filter(|s| !s.is_empty()),
                budget_min: r.get("budget_min").and_then(|v| v.as_f64()),
                budget_max: r.get("budget_max").and_then(|v| v.as_f64()),
                usage_scope: r
                    .get("usage_scope")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
                    .filter(|s| !s.is_empty()),
                regions: r
                    .get("regions")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
                    .filter(|s| !s.is_empty()),
                deadline: r
                    .get("deadline")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
                    .filter(|s| !s.is_empty()),
                created_at: r
                    .get("created_at")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
                    .filter(|s| !s.is_empty()),
                status,
                pay_set: pay_set_request_ids.contains(&id),
            })
        })
        .collect();

    Ok(Json(out))
}

pub async fn list_licenses_stub(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<Vec<serde_json::Value>>, (StatusCode, String)> {
    let _ = resolve_talent(&state, &user).await?;
    Ok(Json(vec![]))
}

#[derive(Serialize)]
pub struct TalentLicensingRevenueResponse {
    pub month: String,
    pub total_cents: i64,
}

fn parse_month_bounds(month: &str) -> Option<(String, String)> {
    let t = month.trim();
    if t.len() != 7 {
        return None;
    }
    let (y, m) = t.split_at(4);
    let y: i32 = y.parse().ok()?;
    if &m[0..1] != "-" {
        return None;
    }
    let mm: u32 = m[1..].parse().ok()?;
    if mm < 1 || mm > 12 {
        return None;
    }

    let start = chrono::NaiveDate::from_ymd_opt(y, mm, 1)?;
    let next = if mm == 12 {
        chrono::NaiveDate::from_ymd_opt(y + 1, 1, 1)?
    } else {
        chrono::NaiveDate::from_ymd_opt(y, mm + 1, 1)?
    };

    let start_ts = format!("{}T00:00:00Z", start.format("%Y-%m-%d"));
    let next_ts = format!("{}T00:00:00Z", next.format("%Y-%m-%d"));
    Some((start_ts, next_ts))
}

pub async fn get_licensing_revenue(
    State(state): State<AppState>,
    user: AuthUser,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Result<Json<TalentLicensingRevenueResponse>, (StatusCode, String)> {
    let resolved = resolve_talent(&state, &user).await?;
    let month = params
        .get("month")
        .cloned()
        .unwrap_or_else(|| "".to_string());

    let Some((start_ts, next_ts)) = parse_month_bounds(&month) else {
        return Err((StatusCode::BAD_REQUEST, "Invalid month".to_string()));
    };

    let resp = state
        .pg
        .from("licensing_payouts")
        .select("amount_cents,paid_at")
        .eq("agency_id", &resolved.agency_id)
        .eq("talent_id", &resolved.talent_id)
        .gte("paid_at", &start_ts)
        .lt("paid_at", &next_ts)
        .limit(5000)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let rows: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!([]));
    let mut total: i64 = 0;
    if let Some(arr) = rows.as_array() {
        for r in arr {
            let cents = r
                .get("amount_cents")
                .and_then(|v| v.as_i64().or_else(|| v.as_str().and_then(|s| s.parse::<i64>().ok())))
                .unwrap_or(0);
            total += cents;
        }
    }

    Ok(Json(TalentLicensingRevenueResponse { month, total_cents: total }))
}

#[derive(Debug, serde::Deserialize)]
pub struct UpdateTalentProfilePayload {
    pub stage_name: Option<String>,
    pub full_legal_name: Option<String>,
    pub email: Option<String>,
    pub phone_number: Option<String>,
    pub city: Option<String>,
    pub state_province: Option<String>,
    pub country: Option<String>,
    pub bio_notes: Option<String>,
    pub instagram_handle: Option<String>,
    pub photo_urls: Option<Vec<String>>,
    pub profile_photo_url: Option<String>,
    pub gender_identity: Option<String>,
    pub race_ethnicity: Option<Vec<String>>,
    pub hair_color: Option<String>,
    pub eye_color: Option<String>,
    pub height_feet: Option<i32>,
    pub height_inches: Option<i32>,
    pub bust_chest_inches: Option<i32>,
    pub waist_inches: Option<i32>,
    pub hips_inches: Option<i32>,
    pub tattoos: Option<bool>,
    pub piercings: Option<bool>,
    pub special_skills: Option<Vec<String>>,
}

pub async fn update_profile(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<UpdateTalentProfilePayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resolved = resolve_talent(&state, &user).await?;

    let mut body = json!({
        "stage_name": payload.stage_name,
        "full_legal_name": payload.full_legal_name,
        "email": payload.email,
        "phone_number": payload.phone_number,
        "city": payload.city,
        "state_province": payload.state_province,
        "country": payload.country,
        "bio_notes": payload.bio_notes,
        "instagram_handle": payload.instagram_handle,
        "photo_urls": payload.photo_urls,
        "profile_photo_url": payload.profile_photo_url,
        "gender_identity": payload.gender_identity,
        "race_ethnicity": payload.race_ethnicity,
        "hair_color": payload.hair_color,
        "eye_color": payload.eye_color,
        "height_feet": payload.height_feet,
        "height_inches": payload.height_inches,
        "bust_chest_inches": payload.bust_chest_inches,
        "waist_inches": payload.waist_inches,
        "hips_inches": payload.hips_inches,
        "tattoos": payload.tattoos,
        "piercings": payload.piercings,
        "special_skills": payload.special_skills,
        "updated_at": chrono::Utc::now().to_rfc3339(),
    });

    if let serde_json::Value::Object(ref mut map) = body {
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
        .eq("id", &resolved.talent_id)
        .eq("agency_id", &resolved.agency_id)
        .update(body.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        warn!(talent_id = %resolved.talent_id, body = %err, "talent profile update failed");
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let v: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!({"ok": true}));
    Ok(Json(v))
}

pub async fn list_bookings(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resolved = resolve_talent(&state, &user).await?;
    let resp = state
        .pg
        .from("bookings")
        .select("*")
        .eq("talent_id", &resolved.talent_id)
        .order("date.desc")
        .limit(250)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let v: serde_json::Value =
        serde_json::from_str(&text).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}

#[derive(Debug, serde::Deserialize)]
pub struct ListBookOutsParams {
    pub date_start: Option<String>,
    pub date_end: Option<String>,
}

pub async fn list_book_outs(
    State(state): State<AppState>,
    user: AuthUser,
    Query(params): Query<ListBookOutsParams>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resolved = resolve_talent(&state, &user).await?;
    let mut req = state
        .pg
        .from("book_outs")
        .select("*")
        .eq("talent_id", &resolved.talent_id);
    if let Some(ds) = params.date_start.as_ref() {
        req = req.gte("end_date", ds);
    }
    if let Some(de) = params.date_end.as_ref() {
        req = req.lte("start_date", de);
    }
    let resp = req
        .order("start_date.asc")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let v: serde_json::Value =
        serde_json::from_str(&text).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}

#[derive(Debug, serde::Deserialize)]
pub struct CreateBookOutPayload {
    pub start_date: String,
    pub end_date: String,
    pub reason: Option<String>,
    pub notes: Option<String>,
}

pub async fn create_book_out(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<CreateBookOutPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resolved = resolve_talent(&state, &user).await?;
    if resolved.agency_id.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Missing agency_id".to_string()));
    }
    let body = json!({
        "agency_user_id": resolved.agency_id,
        "talent_id": resolved.talent_id,
        "start_date": payload.start_date,
        "end_date": payload.end_date,
        "reason": payload.reason.unwrap_or_else(|| "personal".to_string()),
        "notes": payload.notes,
    });
    let resp = state
        .pg
        .from("book_outs")
        .insert(body.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let v: serde_json::Value =
        serde_json::from_str(&text).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}

pub async fn delete_book_out(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resolved = resolve_talent(&state, &user).await?;
    let resp = state
        .pg
        .from("book_outs")
        .eq("id", &id)
        .eq("talent_id", &resolved.talent_id)
        .delete()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let v: serde_json::Value =
        serde_json::from_str(&text).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}
