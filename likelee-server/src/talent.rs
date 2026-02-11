use crate::{auth::AuthUser, auth::RoleGuard, config::AppState};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::Datelike;
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
    let resolved = resolve_talent(&state, &user).await?;

    let mut req = state
        .pg
        .from("brand_licenses")
        .select("id,brand_org_id,agency_id,talent_id,type,status,start_at,end_at,compliance_status,created_at,updated_at")
        .eq("talent_id", &resolved.talent_id);
    if !resolved.agency_id.is_empty() {
        req = req.eq("agency_id", &resolved.agency_id);
    }

    let resp = req
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
    let mut rows: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!([]));
    let licenses = rows.as_array_mut().cloned().unwrap_or_default();

    let mut brand_ids: Vec<String> = licenses
        .iter()
        .filter_map(|r| r.get("brand_org_id").and_then(|v| v.as_str()).map(|s| s.to_string()))
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
                        let name = r
                            .get("company_name")
                            .and_then(|v| v.as_str())
                            .unwrap_or("");
                        if !id.is_empty() {
                            brand_name_by_id.insert(id.to_string(), name.to_string());
                        }
                    }
                }
            }
        }
    }

    let out: Vec<serde_json::Value> = licenses
        .into_iter()
        .map(|mut r| {
            let bid = r
                .get("brand_org_id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            if let (Some(obj), Some(name)) = (r.as_object_mut(), brand_name_by_id.get(&bid)) {
                obj.insert("brand_name".to_string(), json!(name));
            }
            r
        })
        .collect();

    Ok(Json(out))
}

#[derive(Serialize)]
pub struct TalentLicensingRevenueResponse {
    pub month: String,
    pub total_cents: i64,
}

#[derive(Serialize)]
pub struct TalentEarningsByCampaignItem {
    pub brand_id: String,
    pub brand_name: Option<String>,
    pub monthly_cents: i64,
}

#[derive(Serialize)]
pub struct TalentAnalyticsKpis {
    pub total_views: i64,
    pub views_change_pct: f64,
    pub total_revenue_cents: i64,
    pub active_campaigns: i64,
}

#[derive(Serialize)]
pub struct TalentAnalyticsCampaignItem {
    pub brand_id: String,
    pub brand_name: Option<String>,
    pub views_week: i64,
    pub revenue_cents: i64,
}

#[derive(Serialize)]
pub struct TalentAnalyticsRoiTraditional {
    pub per_post_cents: i64,
    pub time_investment: String,
    pub posts_per_month: String,
    pub monthly_earnings_range: String,
}

#[derive(Serialize)]
pub struct TalentAnalyticsRoiAi {
    pub per_campaign_cents: i64,
    pub time_investment: String,
    pub active_campaigns: i64,
    pub monthly_earnings_cents: i64,
}

#[derive(Serialize)]
pub struct TalentAnalyticsRoi {
    pub traditional: TalentAnalyticsRoiTraditional,
    pub ai: TalentAnalyticsRoiAi,
    pub message: String,
}

#[derive(Serialize)]
pub struct TalentAnalyticsResponse {
    pub month: String,
    pub kpis: TalentAnalyticsKpis,
    pub campaigns: Vec<TalentAnalyticsCampaignItem>,
    pub roi: TalentAnalyticsRoi,
}

fn parse_month_bounds_date(month: &str) -> Option<(chrono::NaiveDate, chrono::NaiveDate)> {
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
    Some((start, next))
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

    let mut req = state
        .pg
        .from("licensing_payouts")
        .select("amount_cents,paid_at")
        .eq("talent_id", &resolved.talent_id)
        .gte("paid_at", &start_ts)
        .lt("paid_at", &next_ts)
        .limit(5000)
        ;
    if !resolved.agency_id.is_empty() {
        req = req.eq("agency_id", &resolved.agency_id);
    }

    let resp = req
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

pub async fn get_earnings_by_campaign(
    State(state): State<AppState>,
    user: AuthUser,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Result<Json<Vec<TalentEarningsByCampaignItem>>, (StatusCode, String)> {
    let resolved = resolve_talent(&state, &user).await?;
    let month = params
        .get("month")
        .cloned()
        .unwrap_or_else(|| "".to_string());

    let Some((start_ts, next_ts)) = parse_month_bounds(&month) else {
        return Err((StatusCode::BAD_REQUEST, "Invalid month".to_string()));
    };

    let mut req = state
        .pg
        .from("licensing_payouts")
        .select("amount_cents,licensing_request_id")
        .eq("talent_id", &resolved.talent_id)
        .gte("paid_at", &start_ts)
        .lt("paid_at", &next_ts)
        .limit(5000)
        ;
    if !resolved.agency_id.is_empty() {
        req = req.eq("agency_id", &resolved.agency_id);
    }

    let resp = req
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

    let mut request_ids: Vec<String> = Vec::new();
    if let Some(arr) = rows.as_array() {
        for r in arr {
            if let Some(id) = r
                .get("licensing_request_id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
            {
                if !id.is_empty() {
                    request_ids.push(id);
                }
            }
        }
    }
    request_ids.sort();
    request_ids.dedup();

    let mut brand_id_by_request_id: HashMap<String, String> = HashMap::new();
    if !request_ids.is_empty() {
        let ids: Vec<&str> = request_ids.iter().map(|s| s.as_str()).collect();
        let r_resp = state
            .pg
            .from("licensing_requests")
            .select("id,brand_id")
            .in_("id", ids)
            .execute()
            .await;
        if let Ok(r_resp) = r_resp {
            if r_resp.status().is_success() {
                let r_text = r_resp.text().await.unwrap_or_else(|_| "[]".into());
                let r_rows: serde_json::Value = serde_json::from_str(&r_text).unwrap_or(json!([]));
                if let Some(arr) = r_rows.as_array() {
                    for r in arr {
                        let rid = r.get("id").and_then(|v| v.as_str()).unwrap_or("");
                        let bid = r.get("brand_id").and_then(|v| v.as_str()).unwrap_or("");
                        if !rid.is_empty() && !bid.is_empty() {
                            brand_id_by_request_id.insert(rid.to_string(), bid.to_string());
                        }
                    }
                }
            }
        }
    }

    let mut cents_by_brand_id: HashMap<String, i64> = HashMap::new();
    if let Some(arr) = rows.as_array() {
        for r in arr {
            let cents = r
                .get("amount_cents")
                .and_then(|v| v.as_i64().or_else(|| v.as_str().and_then(|s| s.parse::<i64>().ok())))
                .unwrap_or(0);
            let rid = r
                .get("licensing_request_id")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            if cents <= 0 || rid.is_empty() {
                continue;
            }
            let Some(bid) = brand_id_by_request_id.get(rid) else {
                continue;
            };
            *cents_by_brand_id.entry(bid.clone()).or_insert(0) += cents;
        }
    }

    let mut brand_ids: Vec<String> = cents_by_brand_id.keys().cloned().collect();
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
                        let name = r
                            .get("company_name")
                            .and_then(|v| v.as_str())
                            .unwrap_or("");
                        if !id.is_empty() {
                            brand_name_by_id.insert(id.to_string(), name.to_string());
                        }
                    }
                }
            }
        }
    }

    let mut out: Vec<TalentEarningsByCampaignItem> = cents_by_brand_id
        .into_iter()
        .map(|(brand_id, monthly_cents)| TalentEarningsByCampaignItem {
            brand_name: brand_name_by_id.get(&brand_id).cloned(),
            brand_id,
            monthly_cents,
        })
        .collect();
    out.sort_by(|a, b| b.monthly_cents.cmp(&a.monthly_cents));
    Ok(Json(out))
}

pub async fn get_analytics(
    State(state): State<AppState>,
    user: AuthUser,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Result<Json<TalentAnalyticsResponse>, (StatusCode, String)> {
    let resolved = resolve_talent(&state, &user).await?;

    let month = params
        .get("month")
        .cloned()
        .unwrap_or_else(|| {
            let now = chrono::Utc::now().date_naive();
            format!("{:04}-{:02}", now.year(), now.month())
        });

    let Some((month_start, month_next)) = parse_month_bounds_date(&month) else {
        return Err((StatusCode::BAD_REQUEST, "Invalid month".to_string()));
    };

    // ---------------------------------------------------------------------
    // Revenue for month (reuse logic of get_licensing_revenue)
    // ---------------------------------------------------------------------
    let start_ts = format!("{}T00:00:00Z", month_start.format("%Y-%m-%d"));
    let next_ts = format!("{}T00:00:00Z", month_next.format("%Y-%m-%d"));
    let mut req = state
        .pg
        .from("licensing_payouts")
        .select("amount_cents,licensing_request_id,paid_at")
        .eq("talent_id", &resolved.talent_id)
        .gte("paid_at", &start_ts)
        .lt("paid_at", &next_ts)
        .limit(5000)
        ;
    if !resolved.agency_id.is_empty() {
        req = req.eq("agency_id", &resolved.agency_id);
    }

    let rev_resp = req
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !rev_resp.status().is_success() {
        let err = rev_resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }
    let rev_text = rev_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let rev_rows: serde_json::Value = serde_json::from_str(&rev_text).unwrap_or(json!([]));

    let mut total_revenue_cents: i64 = 0;
    let mut request_ids: Vec<String> = Vec::new();
    if let Some(arr) = rev_rows.as_array() {
        for r in arr {
            let cents = r
                .get("amount_cents")
                .and_then(|v| v.as_i64().or_else(|| v.as_str().and_then(|s| s.parse::<i64>().ok())))
                .unwrap_or(0);
            total_revenue_cents += cents;
            if let Some(id) = r
                .get("licensing_request_id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
            {
                if !id.is_empty() {
                    request_ids.push(id);
                }
            }
        }
    }
    request_ids.sort();
    request_ids.dedup();

    // Map request_id -> brand_id
    let mut brand_id_by_request_id: HashMap<String, String> = HashMap::new();
    if !request_ids.is_empty() {
        let ids: Vec<&str> = request_ids.iter().map(|s| s.as_str()).collect();
        let r_resp = state
            .pg
            .from("licensing_requests")
            .select("id,brand_id")
            .in_("id", ids)
            .execute()
            .await;
        if let Ok(r_resp) = r_resp {
            if r_resp.status().is_success() {
                let r_text = r_resp.text().await.unwrap_or_else(|_| "[]".into());
                let r_rows: serde_json::Value = serde_json::from_str(&r_text).unwrap_or(json!([]));
                if let Some(arr) = r_rows.as_array() {
                    for r in arr {
                        let rid = r.get("id").and_then(|v| v.as_str()).unwrap_or("");
                        let bid = r.get("brand_id").and_then(|v| v.as_str()).unwrap_or("");
                        if !rid.is_empty() && !bid.is_empty() {
                            brand_id_by_request_id.insert(rid.to_string(), bid.to_string());
                        }
                    }
                }
            }
        }
    }

    // Revenue by brand
    let mut revenue_by_brand: HashMap<String, i64> = HashMap::new();
    if let Some(arr) = rev_rows.as_array() {
        for r in arr {
            let cents = r
                .get("amount_cents")
                .and_then(|v| v.as_i64().or_else(|| v.as_str().and_then(|s| s.parse::<i64>().ok())))
                .unwrap_or(0);
            let rid = r
                .get("licensing_request_id")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            if rid.is_empty() {
                continue;
            }
            let Some(bid) = brand_id_by_request_id.get(rid) else {
                continue;
            };
            *revenue_by_brand.entry(bid.clone()).or_insert(0) += cents;
        }
    }

    // ---------------------------------------------------------------------
    // Views KPI (current month vs previous month) + per brand views for latest week
    // ---------------------------------------------------------------------
    let prev_month_start = (month_start - chrono::Months::new(1)).with_day(1).unwrap_or(month_start);
    let prev_month_next = month_start;

    let metrics_resp = state
        .pg
        .from("talent_campaign_metrics_weekly")
        .select("brand_id,views_week,week_start")
        .eq("talent_id", &resolved.talent_id)
        .gte("week_start", &prev_month_start.format("%Y-%m-%d").to_string())
        .lt("week_start", &month_next.format("%Y-%m-%d").to_string())
        .limit(2000)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !metrics_resp.status().is_success() {
        let err = metrics_resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }
    let metrics_text = metrics_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let metrics_rows: serde_json::Value = serde_json::from_str(&metrics_text).unwrap_or(json!([]));

    let mut total_views_this_month: i64 = 0;
    let mut total_views_prev_month: i64 = 0;
    let mut latest_week_start: Option<String> = None;
    let mut views_by_brand_latest_week: HashMap<String, i64> = HashMap::new();

    if let Some(arr) = metrics_rows.as_array() {
        for r in arr {
            let week_start = r.get("week_start").and_then(|v| v.as_str()).unwrap_or("");
            let views = r
                .get("views_week")
                .and_then(|v| v.as_i64().or_else(|| v.as_str().and_then(|s| s.parse::<i64>().ok())))
                .unwrap_or(0);
            if week_start.is_empty() {
                continue;
            }

            // month KPI totals
            if week_start >= prev_month_start.format("%Y-%m-%d").to_string().as_str()
                && week_start < prev_month_next.format("%Y-%m-%d").to_string().as_str()
            {
                total_views_prev_month += views;
            }
            if week_start >= month_start.format("%Y-%m-%d").to_string().as_str()
                && week_start < month_next.format("%Y-%m-%d").to_string().as_str()
            {
                total_views_this_month += views;
            }

            // latest week
            match latest_week_start.as_ref() {
                None => latest_week_start = Some(week_start.to_string()),
                Some(cur) => {
                    if week_start > cur.as_str() {
                        latest_week_start = Some(week_start.to_string())
                    }
                }
            }
        }

        if let Some(lw) = latest_week_start.as_ref() {
            for r in arr {
                let week_start = r.get("week_start").and_then(|v| v.as_str()).unwrap_or("");
                if week_start != lw.as_str() {
                    continue;
                }
                let brand_id = r.get("brand_id").and_then(|v| v.as_str()).unwrap_or("");
                if brand_id.is_empty() {
                    continue;
                }
                let views = r
                    .get("views_week")
                    .and_then(|v| v.as_i64().or_else(|| v.as_str().and_then(|s| s.parse::<i64>().ok())))
                    .unwrap_or(0);
                *views_by_brand_latest_week
                    .entry(brand_id.to_string())
                    .or_insert(0) += views;
            }
        }
    }

    let views_change_pct: f64 = if total_views_prev_month <= 0 {
        if total_views_this_month > 0 {
            100.0
        } else {
            0.0
        }
    } else {
        ((total_views_this_month - total_views_prev_month) as f64) / (total_views_prev_month as f64) * 100.0
    };

    // Active campaigns derived from licensing_requests
    let lr_resp = state
        .pg
        .from("licensing_requests")
        .select("id,status")
        .eq("agency_id", &resolved.agency_id)
        .eq("talent_id", &resolved.talent_id)
        .limit(500)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let lr_text = lr_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let lr_rows: serde_json::Value = serde_json::from_str(&lr_text).unwrap_or(json!([]));
    let mut active_campaigns: i64 = 0;
    if let Some(arr) = lr_rows.as_array() {
        for r in arr {
            let s = r.get("status").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
            if s == "approved" || s == "confirmed" {
                active_campaigns += 1;
            }
        }
    }

    // Brand names for campaign list
    let mut brand_ids: Vec<String> = views_by_brand_latest_week
        .keys()
        .cloned()
        .collect();
    for k in revenue_by_brand.keys() {
        if !brand_ids.iter().any(|x| x == k) {
            brand_ids.push(k.clone());
        }
    }
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

    let mut campaigns: Vec<TalentAnalyticsCampaignItem> = brand_ids
        .iter()
        .map(|bid| TalentAnalyticsCampaignItem {
            brand_id: bid.clone(),
            brand_name: brand_name_by_id.get(bid).cloned(),
            views_week: *views_by_brand_latest_week.get(bid).unwrap_or(&0),
            revenue_cents: *revenue_by_brand.get(bid).unwrap_or(&0),
        })
        .collect();
    campaigns.sort_by(|a, b| b.revenue_cents.cmp(&a.revenue_cents));

    // ROI (constants match screenshot style)
    let traditional_min_monthly = 250_000; // $2,500
    let traditional_max_monthly = 400_000; // $4,000
    let traditional_mid = (traditional_min_monthly + traditional_max_monthly) / 2;
    let ai_monthly = total_revenue_cents;
    let per_campaign = if active_campaigns > 0 {
        ai_monthly / active_campaigns
    } else {
        0
    };
    let pct_higher = if traditional_mid > 0 {
        ((ai_monthly - traditional_mid) as f64) / (traditional_mid as f64) * 100.0
    } else {
        0.0
    };

    let message = if pct_higher.is_finite() {
        format!(
            "Your earnings are {:.0}% {} with passive AI licensing vs active UGC creation",
            pct_higher.abs(),
            if pct_higher >= 0.0 { "higher" } else { "lower" }
        )
    } else {
        "Your earnings comparison will appear here.".to_string()
    };

    Ok(Json(TalentAnalyticsResponse {
        month: month.clone(),
        kpis: TalentAnalyticsKpis {
            total_views: total_views_this_month,
            views_change_pct,
            total_revenue_cents,
            active_campaigns,
        },
        campaigns,
        roi: TalentAnalyticsRoi {
            traditional: TalentAnalyticsRoiTraditional {
                per_post_cents: 50_000,
                time_investment: "4-6 hours".to_string(),
                posts_per_month: "5-8".to_string(),
                monthly_earnings_range: "$2,500-$4,000".to_string(),
            },
            ai: TalentAnalyticsRoiAi {
                per_campaign_cents: per_campaign,
                time_investment: "0 hours/month".to_string(),
                active_campaigns,
                monthly_earnings_cents: ai_monthly,
            },
            message,
        },
    }))
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
    pub hero_cameo_url: Option<String>,
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
        "hero_cameo_url": payload.hero_cameo_url,
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

    let mut req = state
        .pg
        .from("agency_users")
        .eq("id", &resolved.talent_id);
    if !resolved.agency_id.is_empty() {
        req = req.eq("agency_id", &resolved.agency_id);
    }
    let resp = req
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

#[derive(Debug, serde::Deserialize)]
pub struct CreatePortfolioItemPayload {
    pub media_url: String,
    pub title: Option<String>,
}

pub async fn list_portfolio_items(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<Vec<serde_json::Value>>, (StatusCode, String)> {
    let resolved = resolve_talent(&state, &user).await?;

    let resp = state
        .pg
        .from("talent_portfolio_items")
        .select("id,agency_id,talent_id,title,media_url,status,created_at")
        .eq("talent_id", &resolved.talent_id)
        .order("created_at.desc")
        .limit(200)
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
    let out = rows.as_array().cloned().unwrap_or_default();
    Ok(Json(out))
}

pub async fn create_portfolio_item(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<CreatePortfolioItemPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resolved = resolve_talent(&state, &user).await?;
    if payload.media_url.trim().is_empty() {
        return Err((StatusCode::BAD_REQUEST, "missing media_url".to_string()));
    }

    let body = json!({
        "agency_id": resolved.agency_id,
        "talent_id": resolved.talent_id,
        "title": payload.title,
        "media_url": payload.media_url,
        "status": "live",
    });

    let resp = state
        .pg
        .from("talent_portfolio_items")
        .insert(body.to_string())
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
    let v: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!({"ok": true}));
    Ok(Json(v))
}

pub async fn delete_portfolio_item(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resolved = resolve_talent(&state, &user).await?;

    let resp = state
        .pg
        .from("talent_portfolio_items")
        .eq("id", &id)
        .eq("talent_id", &resolved.talent_id)
        .delete()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    Ok(Json(json!({"status":"ok"})))
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
