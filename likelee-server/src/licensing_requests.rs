use crate::{auth::AuthUser, config::AppState};
use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::{BTreeMap, HashMap, HashSet};
use tracing::{info, warn};

#[derive(Serialize, Clone)]
pub struct LicensingRequestTalent {
    pub licensing_request_id: String,
    pub talent_id: String,
    pub talent_name: String,
    pub status: String,
}

#[derive(Serialize, Clone)]
pub struct LicensingRequestGroup {
    pub group_key: String,
    pub brand_id: Option<String>,
    pub brand_name: Option<String>,
    pub campaign_title: Option<String>,
    pub budget_min: Option<f64>,
    pub budget_max: Option<f64>,
    pub usage_scope: Option<String>,
    pub regions: Option<String>,
    pub deadline: Option<String>,
    pub created_at: String,
    pub status: String,
    pub pay_set: bool,
    pub talents: Vec<LicensingRequestTalent>,
}

#[derive(Deserialize)]
pub struct UpdateLicensingRequestStatusBody {
    pub licensing_request_ids: Vec<String>,
    pub status: String,
    pub notes: Option<String>,
}

#[derive(Deserialize)]
pub struct PaySplitBody {
    pub licensing_request_ids: Vec<String>,
    pub total_payment_amount: f64,
    pub agency_percent: f64,
}

#[derive(Deserialize)]
pub struct PaySplitQuery {
    pub licensing_request_ids: String,
}

fn talent_display_name(row: &serde_json::Value) -> String {
    row.get("full_legal_name")
        .or(row.get("stage_name"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string()
}

fn value_to_f64(v: &serde_json::Value) -> Option<f64> {
    v.as_f64()
        .or_else(|| v.as_str().and_then(|s| s.parse::<f64>().ok()))
}

fn value_to_non_empty_string(v: Option<&serde_json::Value>) -> Option<String> {
    v.and_then(|vv| vv.as_str())
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
}

fn created_at_group_key(brand_id: &str, created_at: &str) -> String {
    format!("{}:{}", brand_id, created_at)
}

fn group_status(statuses: &[String]) -> String {
    if statuses.iter().any(|s| s == "rejected") {
        return "rejected".to_string();
    }
    if !statuses.is_empty() && statuses.iter().all(|s| s == "approved" || s == "confirmed") {
        return "approved".to_string();
    }
    "pending".to_string()
}

pub async fn list_for_agency(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<Vec<LicensingRequestGroup>>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    let resp = state
        .pg
        .from("licensing_requests")
        .select("id,brand_id,talent_id,status,created_at,campaign_title,budget_min,budget_max,usage_scope,regions,deadline")
        .eq("agency_id", &user.id)
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

    let mut requests: Vec<serde_json::Value> = vec![];
    if let Some(arr) = rows.as_array() {
        requests = arr.clone();
    }

    info!(agency_id = %user.id, count = requests.len(), "licensing_requests fetched");

    let mut brand_ids: Vec<String> = vec![];
    let mut talent_ids: Vec<String> = vec![];
    let mut request_ids: Vec<String> = vec![];

    for r in &requests {
        if let Some(id) = r.get("id").and_then(|v| v.as_str()) {
            if !id.is_empty() {
                request_ids.push(id.to_string());
            }
        }
        if let Some(b) = r.get("brand_id").and_then(|v| v.as_str()) {
            if !b.is_empty() {
                brand_ids.push(b.to_string());
            }
        }
        if let Some(t) = r.get("talent_id").and_then(|v| v.as_str()) {
            if !t.is_empty() {
                talent_ids.push(t.to_string());
            }
        }
    }

    brand_ids.sort();
    brand_ids.dedup();
    talent_ids.sort();
    talent_ids.dedup();

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

    let mut talent_name_by_id: HashMap<String, String> = HashMap::new();
    if !talent_ids.is_empty() {
        let ids: Vec<&str> = talent_ids.iter().map(|s| s.as_str()).collect();
        let t_resp = state
            .pg
            .from("agency_users")
            .select("id,full_legal_name,stage_name")
            .in_("id", ids)
            .execute()
            .await;
        match t_resp {
            Ok(t_resp) => {
                if t_resp.status().is_success() {
                    let t_text = t_resp.text().await.unwrap_or_else(|_| "[]".into());
                    let t_rows: serde_json::Value =
                        serde_json::from_str(&t_text).unwrap_or(json!([]));
                    if let Some(arr) = t_rows.as_array() {
                        for r in arr {
                            let id = r.get("id").and_then(|v| v.as_str()).unwrap_or("");
                            if !id.is_empty() {
                                talent_name_by_id.insert(id.to_string(), talent_display_name(r));
                            }
                        }
                    }
                } else {
                    let status = t_resp.status();
                    let body = t_resp.text().await.unwrap_or_default();
                    warn!(agency_id = %user.id, status = %status, body = %body, "agency_users lookup failed");
                }
            }
            Err(e) => {
                warn!(agency_id = %user.id, error = %e, "agency_users lookup request failed");
            }
        }
    }

    // Determine which requests already have a pay split set (campaign exists with payment_amount)
    let mut pay_set_request_ids: HashSet<String> = HashSet::new();
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

    let mut groups: BTreeMap<String, LicensingRequestGroup> = BTreeMap::new();

    for r in &requests {
        let id = r.get("id").and_then(|v| v.as_str()).unwrap_or("");
        if id.is_empty() {
            continue;
        }
        let brand_id = r.get("brand_id").and_then(|v| v.as_str()).unwrap_or("");
        let brand_key = if brand_id.is_empty() {
            "__none__"
        } else {
            brand_id
        };
        let talent_id = r.get("talent_id").and_then(|v| v.as_str()).unwrap_or("");
        let status = r
            .get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("pending")
            .to_string();
        let created_at = r
            .get("created_at")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        let campaign_title = value_to_non_empty_string(r.get("campaign_title"));
        let budget_min = r.get("budget_min").and_then(value_to_f64);
        let budget_max = r.get("budget_max").and_then(value_to_f64);
        let usage_scope = value_to_non_empty_string(r.get("usage_scope"));
        let regions = value_to_non_empty_string(r.get("regions"));
        let deadline = value_to_non_empty_string(r.get("deadline"));

        let key = created_at_group_key(brand_key, &created_at);

        let entry = groups
            .entry(key.clone())
            .or_insert_with(|| LicensingRequestGroup {
                group_key: key.clone(),
                brand_id: if brand_id.is_empty() {
                    None
                } else {
                    Some(brand_id.to_string())
                },
                brand_name: if brand_id.is_empty() {
                    None
                } else {
                    brand_name_by_id.get(brand_id).cloned()
                },
                campaign_title: campaign_title.clone(),
                budget_min,
                budget_max,
                usage_scope: usage_scope.clone(),
                regions: regions.clone(),
                deadline: deadline.clone(),
                created_at: created_at.clone(),
                status: "pending".to_string(),
                pay_set: false,
                talents: vec![],
            });

        if entry
            .campaign_title
            .as_ref()
            .map(|s| s.trim().is_empty())
            .unwrap_or(true)
        {
            entry.campaign_title = campaign_title;
        }
        if entry.budget_min.is_none() {
            entry.budget_min = budget_min;
        }
        if entry.budget_max.is_none() {
            entry.budget_max = budget_max;
        }
        if entry
            .usage_scope
            .as_ref()
            .map(|s| s.trim().is_empty())
            .unwrap_or(true)
        {
            entry.usage_scope = usage_scope;
        }
        if entry
            .regions
            .as_ref()
            .map(|s| s.trim().is_empty())
            .unwrap_or(true)
        {
            entry.regions = regions;
        }
        if entry
            .deadline
            .as_ref()
            .map(|s| s.trim().is_empty())
            .unwrap_or(true)
        {
            entry.deadline = deadline;
        }

        let talent_name = talent_name_by_id
            .get(talent_id)
            .cloned()
            .unwrap_or_else(|| "".to_string());

        entry.talents.push(LicensingRequestTalent {
            licensing_request_id: id.to_string(),
            talent_id: talent_id.to_string(),
            talent_name,
            status: status.clone(),
        });

        // Pay is considered "set" for the group only if all requests have a campaign row w/ payment.
        entry.pay_set = entry
            .talents
            .iter()
            .all(|t| pay_set_request_ids.contains(&t.licensing_request_id));

        let statuses: Vec<String> = entry.talents.iter().map(|t| t.status.clone()).collect();
        entry.status = group_status(&statuses);
    }

    let mut out: Vec<LicensingRequestGroup> = groups.into_values().collect();
    out.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(Json(out))
}

pub async fn update_status_bulk(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<UpdateLicensingRequestStatusBody>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    if payload.licensing_request_ids.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "No licensing_request_ids".to_string(),
        ));
    }

    let status = payload.status.trim().to_lowercase();
    if status != "approved" && status != "rejected" && status != "pending" {
        return Err((StatusCode::BAD_REQUEST, "Invalid status".to_string()));
    }

    let decided_at = if status == "pending" {
        serde_json::Value::Null
    } else {
        json!(Utc::now().to_rfc3339())
    };

    let mut v = json!({
        "status": status,
        "decided_at": decided_at,
        "notes": payload.notes,
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

    let ids: Vec<&str> = payload
        .licensing_request_ids
        .iter()
        .map(|s| s.as_str())
        .collect();

    let resp = state
        .pg
        .from("licensing_requests")
        .eq("agency_id", &user.id)
        .in_("id", ids)
        .update(v.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    Ok(Json(json!({"ok": true})))
}

pub async fn get_pay_split(
    State(state): State<AppState>,
    user: AuthUser,
    Query(q): Query<PaySplitQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    let ids: Vec<String> = q
        .licensing_request_ids
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();

    if ids.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "No licensing_request_ids".to_string(),
        ));
    }

    let id_refs: Vec<&str> = ids.iter().map(|s| s.as_str()).collect();

    let c_resp = state
        .pg
        .from("campaigns")
        .select("id,talent_id,licensing_request_id,payment_amount,agency_percent,talent_percent,agency_earnings_cents,talent_earnings_cents")
        .in_("licensing_request_id", id_refs)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !c_resp.status().is_success() {
        let err = c_resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    let c_text = c_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let c_rows: serde_json::Value = serde_json::from_str(&c_text).unwrap_or(json!([]));

    let mut talent_ids: Vec<String> = vec![];
    if let Some(arr) = c_rows.as_array() {
        for r in arr {
            let t = r.get("talent_id").and_then(|v| v.as_str()).unwrap_or("");
            if !t.is_empty() {
                talent_ids.push(t.to_string());
            }
        }
    }
    talent_ids.sort();
    talent_ids.dedup();

    let mut talent_name_by_id: HashMap<String, String> = HashMap::new();
    if !talent_ids.is_empty() {
        let t_refs: Vec<&str> = talent_ids.iter().map(|s| s.as_str()).collect();
        let t_resp = state
            .pg
            .from("agency_users")
            .select("id,full_legal_name,stage_name")
            .in_("id", t_refs)
            .execute()
            .await;
        if let Ok(t_resp) = t_resp {
            if t_resp.status().is_success() {
                let t_text = t_resp.text().await.unwrap_or_else(|_| "[]".into());
                let t_rows: serde_json::Value = serde_json::from_str(&t_text).unwrap_or(json!([]));
                if let Some(arr) = t_rows.as_array() {
                    for r in arr {
                        let id = r.get("id").and_then(|v| v.as_str()).unwrap_or("");
                        if !id.is_empty() {
                            talent_name_by_id.insert(id.to_string(), talent_display_name(r));
                        }
                    }
                }
            }
        }
    }

    let mut total: f64 = 0.0;
    let mut agency_percent: Option<f64> = None;
    let mut talent_percent: Option<f64> = None;

    let mut out_rows: Vec<serde_json::Value> = vec![];

    if let Some(arr) = c_rows.as_array() {
        for r in arr {
            let payment_amount = r
                .get("payment_amount")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0);
            total += payment_amount;
            if agency_percent.is_none() {
                agency_percent = r.get("agency_percent").and_then(|v| v.as_f64());
            }
            if talent_percent.is_none() {
                talent_percent = r.get("talent_percent").and_then(|v| v.as_f64());
            }
            let talent_id = r.get("talent_id").and_then(|v| v.as_str()).unwrap_or("");
            let talent_name = talent_name_by_id
                .get(talent_id)
                .cloned()
                .unwrap_or_default();
            let mut obj = r.clone();
            if let Some(map) = obj.as_object_mut() {
                map.insert("talent_name".into(), json!(talent_name));
            }
            out_rows.push(obj);
        }
    }

    Ok(Json(json!({
        "total_payment_amount": total,
        "agency_percent": agency_percent,
        "talent_percent": talent_percent,
        "campaigns": out_rows,
    })))
}

pub async fn set_pay_split(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<PaySplitBody>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    if payload.licensing_request_ids.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "No licensing_request_ids".to_string(),
        ));
    }

    if payload.total_payment_amount < 0.0 {
        return Err((
            StatusCode::BAD_REQUEST,
            "Invalid total_payment_amount".to_string(),
        ));
    }

    if payload.agency_percent < 0.0 || payload.agency_percent > 100.0 {
        return Err((
            StatusCode::BAD_REQUEST,
            "Invalid agency_percent".to_string(),
        ));
    }

    let talent_percent = 100.0 - payload.agency_percent;
    let per_talent_payment_amount = if payload.licensing_request_ids.is_empty() {
        0.0
    } else {
        payload.total_payment_amount / payload.licensing_request_ids.len() as f64
    };

    let ids: Vec<&str> = payload
        .licensing_request_ids
        .iter()
        .map(|s| s.as_str())
        .collect();

    let lr_resp = state
        .pg
        .from("licensing_requests")
        .select("id,agency_id,brand_id,talent_id,status,created_at")
        .eq("agency_id", &user.id)
        .in_("id", ids.clone())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !lr_resp.status().is_success() {
        let err = lr_resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    let lr_text = lr_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let lr_rows: serde_json::Value = serde_json::from_str(&lr_text).unwrap_or(json!([]));

    let mut reqs: Vec<serde_json::Value> = vec![];
    if let Some(arr) = lr_rows.as_array() {
        reqs = arr.clone();
    }

    if reqs.len() != payload.licensing_request_ids.len() {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    for r in &reqs {
        let st = r
            .get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("pending");
        if st != "approved" && st != "confirmed" {
            return Err((
                StatusCode::BAD_REQUEST,
                "All licensing requests must be approved before setting pay".to_string(),
            ));
        }
    }

    // Find existing campaign rows
    let c_resp = state
        .pg
        .from("campaigns")
        .select("id,licensing_request_id")
        .in_("licensing_request_id", ids.clone())
        .execute()
        .await;

    let mut campaign_id_by_request_id: HashMap<String, String> = HashMap::new();
    if let Ok(c_resp) = c_resp {
        if c_resp.status().is_success() {
            let c_text = c_resp.text().await.unwrap_or_else(|_| "[]".into());
            let c_rows: serde_json::Value = serde_json::from_str(&c_text).unwrap_or(json!([]));
            if let Some(arr) = c_rows.as_array() {
                for r in arr {
                    let cid = r.get("id").and_then(|v| v.as_str()).unwrap_or("");
                    let lrid = r
                        .get("licensing_request_id")
                        .and_then(|v| v.as_str())
                        .unwrap_or("");
                    if !cid.is_empty() && !lrid.is_empty() {
                        campaign_id_by_request_id.insert(lrid.to_string(), cid.to_string());
                    }
                }
            }
        }
    }

    for r in &reqs {
        let lrid = r.get("id").and_then(|v| v.as_str()).unwrap_or("");
        if lrid.is_empty() {
            continue;
        }
        let talent_id = r.get("talent_id").and_then(|v| v.as_str()).unwrap_or("");
        let brand_id = r.get("brand_id").and_then(|v| v.as_str()).unwrap_or("");
        let created_at = r.get("created_at").and_then(|v| v.as_str()).unwrap_or("");
        let date = created_at.get(0..10).unwrap_or("");

        let mut row = json!({
            "agency_id": user.id,
            "talent_id": talent_id,
            "brand_id": if brand_id.is_empty() { serde_json::Value::Null } else { json!(brand_id) },
            "name": "Licensing",
            "campaign_type": "Endorsement",
            "date": if date.is_empty() { serde_json::Value::Null } else { json!(date) },
            "status": "Confirmed",
            "payment_amount": per_talent_payment_amount,
            "agency_percent": payload.agency_percent,
            "talent_percent": talent_percent,
            "licensing_request_id": lrid,
        });

        if let serde_json::Value::Object(ref mut map) = row {
            let null_keys: Vec<String> = map
                .iter()
                .filter_map(|(k, val)| if val.is_null() { Some(k.clone()) } else { None })
                .collect();
            for k in null_keys {
                map.remove(&k);
            }
        }

        if let Some(cid) = campaign_id_by_request_id.get(lrid).cloned() {
            let resp = state
                .pg
                .from("campaigns")
                .eq("id", &cid)
                .update(row.to_string())
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            if !resp.status().is_success() {
                let err = resp.text().await.unwrap_or_default();
                return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
            }
        } else {
            let resp = state
                .pg
                .from("campaigns")
                .insert(row.to_string())
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            if !resp.status().is_success() {
                let err = resp.text().await.unwrap_or_default();
                return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
            }
        }
    }

    // Return the updated pay split details
    let ids_joined = payload.licensing_request_ids.join(",");
    get_pay_split(
        State(state),
        user,
        Query(PaySplitQuery {
            licensing_request_ids: ids_joined,
        }),
    )
    .await
}
