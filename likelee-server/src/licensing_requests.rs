use crate::{auth::AuthUser, config::AppState};
use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::{BTreeMap, HashMap};
use tracing::info;

#[derive(Serialize, Clone)]
pub struct LicensingRequestTalent {
    pub licensing_request_id: String,
    pub talent_id: String,
    pub talent_name: String,
    pub status: String,
    pub total_agreed_amount: Option<f64>,
    pub agency_commission_percent: Option<f64>,
    pub agency_amount: Option<f64>,
    pub talent_amount: Option<f64>,
}

#[derive(Serialize, Clone)]
pub struct LicensingRequestGroup {
    pub group_key: String,
    pub brand_id: Option<String>,
    pub brand_name: Option<String>,
    pub brand_email: Option<String>,
    pub campaign_title: Option<String>,
    pub budget_min: Option<f64>,
    pub budget_max: Option<f64>,
    pub usage_scope: Option<String>,
    pub regions: Option<String>,
    pub deadline: Option<String>,
    pub license_start_date: Option<String>,
    pub license_end_date: Option<String>,
    pub notes: Option<String>,
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

#[derive(Deserialize)]
pub struct CreateLicensingRequest {
    pub talent_id: String,
    pub brand_name: String, // client_name
    pub start_date: String,
    pub duration_days: i64,
    pub price: f64,
    pub template_id: Option<String>,
    pub license_type: String, // campaign_title
    pub usage_scope: String,
    pub terms: String, // notes? or ignored for now
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
    if statuses.iter().any(|s| s == "negotiating") {
        return "negotiating".to_string();
    }
    if statuses.iter().any(|s| s == "rejected" || s == "declined") {
        return "declined".to_string();
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

    // Optimization: Single query with resource embedding to fetch everything at once
    let resp = state
        .pg
        .from("licensing_requests")
        .select("id,brand_id,talent_id,status,created_at,campaign_title,client_name,talent_name,budget_min,budget_max,usage_scope,regions,deadline,license_start_date,license_end_date,notes,negotiation_reason,submission_id,brands(email,company_name),license_submissions!licensing_requests_submission_id_fkey(client_email,client_name),agency_users(full_legal_name,stage_name),campaigns(id,payment_amount,agency_percent,talent_percent,agency_earnings_cents,talent_earnings_cents)")
        .eq("agency_id", &user.id)
        .order("created_at.desc")
        .limit(250)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !status.is_success() {
        return Err(crate::errors::sanitize_db_error(status.as_u16(), text));
    }

    let rows: serde_json::Value = serde_json::from_str(&text).map_err(|e| {
        tracing::error!(agency_id = %user.id, error = %e, "licensing_requests JSON parse error");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("JSON parse error: {}", e),
        )
    })?;

    let mut requests: Vec<serde_json::Value> = vec![];
    if let Some(arr) = rows.as_array() {
        requests = arr.clone();
    }

    info!(agency_id = %user.id, count = requests.len(), "licensing_requests fetched (optimized)");

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
        let license_start_date = value_to_non_empty_string(r.get("license_start_date"));
        let license_end_date = value_to_non_empty_string(r.get("license_end_date"));
        let notes = value_to_non_empty_string(r.get("notes"));

        // Try to get client info from license_submissions first, then brands, then direct fields
        let license_submission = r.get("license_submissions");

        let brand_email = license_submission
            .and_then(|ls| ls.get("client_email"))
            .and_then(|v| v.as_str())
            .filter(|s| !s.trim().is_empty())
            .map(|s| s.to_string())
            .or_else(|| {
                r.get("brands")
                    .and_then(|b| b.get("email"))
                    .and_then(|v| v.as_str())
                    .filter(|s| !s.trim().is_empty())
                    .map(|s| s.to_string())
            });

        let brand_name = license_submission
            .and_then(|ls| ls.get("client_name"))
            .and_then(|v| v.as_str())
            .filter(|s| !s.trim().is_empty())
            .map(|s| s.to_string())
            .or_else(|| {
                r.get("brands")
                    .and_then(|b| b.get("company_name"))
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            })
            .or_else(|| {
                r.get("client_name")
                    .and_then(|v| v.as_str())
                    .filter(|s| !s.trim().is_empty())
                    .map(|s| s.to_string())
            });

        let talent_info = r.get("agency_users");
        let talent_name_field = r
            .get("talent_name")
            .and_then(|v| v.as_str())
            .filter(|s| !s.trim().is_empty())
            .map(|s| s.to_string());
        let talent_name = talent_info
            .map(talent_display_name)
            .filter(|s| !s.trim().is_empty())
            .or(talent_name_field)
            .unwrap_or_else(|| "Assigned Talent".to_string());

        let campaigns_arr = r.get("campaigns").and_then(|c| c.as_array());
        let campaign = campaigns_arr.and_then(|a| a.first());

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
                brand_name: brand_name
                    .clone()
                    .or_else(|| Some("Direct Client".to_string())),
                brand_email: brand_email.clone(),
                campaign_title: campaign_title.clone(),
                budget_min,
                budget_max,
                usage_scope: usage_scope.clone(),
                regions: regions.clone(),
                deadline: deadline.clone(),
                license_start_date: license_start_date.clone(),
                license_end_date: license_end_date.clone(),
                notes: notes.clone(),
                created_at: created_at.clone(),
                status: "pending".to_string(),
                pay_set: false,
                talents: vec![],
            });

        // Fill group level fields if empty
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
        if entry
            .license_start_date
            .as_ref()
            .map(|s| s.trim().is_empty())
            .unwrap_or(true)
        {
            entry.license_start_date = license_start_date;
        }
        if entry
            .license_end_date
            .as_ref()
            .map(|s| s.trim().is_empty())
            .unwrap_or(true)
        {
            entry.license_end_date = license_end_date;
        }

        let total_agreed_amount = campaign
            .and_then(|c| c.get("payment_amount"))
            .and_then(value_to_f64);
        let agency_commission_percent = campaign
            .and_then(|c| c.get("agency_percent"))
            .and_then(value_to_f64);

        let agency_amount = campaign
            .and_then(|c| c.get("agency_earnings_cents"))
            .and_then(|v| v.as_f64())
            .map(|v| v / 100.0);
        let talent_amount = campaign
            .and_then(|c| c.get("talent_earnings_cents"))
            .and_then(|v| v.as_f64())
            .map(|v| v / 100.0);

        entry.talents.push(LicensingRequestTalent {
            licensing_request_id: id.to_string(),
            talent_id: talent_id.to_string(),
            talent_name: talent_name.clone(),
            status: status.clone(),
            total_agreed_amount,
            agency_commission_percent,
            agency_amount,
            talent_amount,
        });

        let statuses: Vec<String> = entry.talents.iter().map(|t| t.status.clone()).collect();
        entry.status = group_status(&statuses);
    }

    // Final pass for groups to set pay_set accurately
    for group in groups.values_mut() {
        group.pay_set = !group.talents.is_empty()
            && group
                .talents
                .iter()
                .all(|t| t.total_agreed_amount.is_some());
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
    if status != "approved"
        && status != "rejected"
        && status != "pending"
        && status != "negotiating"
        && status != "declined"
    {
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
        "negotiation_reason": payload.notes, // Using notes as the reason for now
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
        .in_("id", ids.clone())
        .update(v.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    // If counter offer (negotiating), send email to brand
    if status == "negotiating" {
        tracing::info!("Status is negotiating, checking for notes...");
        if let Some(reason) = payload.notes.as_ref() {
            tracing::info!("Notes found: {}, sending counter offer emails", reason);
            // Fetch brand emails for these requests
            let b_resp = state
                .pg
                .from("licensing_requests")
                .select("brand_id,brands(email,company_name),submission_id,license_submissions!licensing_requests_submission_id_fkey(client_email,client_name)")
                .in_("id", ids)
                .execute()
                .await;
            if let Ok(b_resp) = b_resp {
                if b_resp.status().is_success() {
                    let b_text = b_resp.text().await.unwrap_or_else(|_| "[]".into());
                    let b_rows: serde_json::Value =
                        serde_json::from_str(&b_text).unwrap_or(json!([]));
                    tracing::info!("Fetched brand/submission data: {}", b_text);
                    if let Some(arr) = b_rows.as_array() {
                        tracing::info!(
                            "Processing {} licensing requests for counter offer emails",
                            arr.len()
                        );
                        let mut sent_emails = std::collections::HashSet::new();
                        for r in arr {
                            let mut target_email = None;
                            let mut target_name = "Client".to_string();

                            // Try brand email first
                            if let Some(brand) = r.get("brands") {
                                if !brand.is_null() {
                                    if let Some(email) = brand.get("email").and_then(|v| v.as_str())
                                    {
                                        target_email = Some(email.to_string());
                                        info!("Found brand email: {}", email);
                                        if let Some(name) =
                                            brand.get("company_name").and_then(|v| v.as_str())
                                        {
                                            target_name = name.to_string();
                                        }
                                    }
                                }
                            }

                            // Fallback to submission email
                            if target_email.is_none() {
                                if let Some(sub) = r.get("license_submissions") {
                                    if !sub.is_null() {
                                        if let Some(email) =
                                            sub.get("client_email").and_then(|v| v.as_str())
                                        {
                                            target_email = Some(email.to_string());
                                            info!("Falling back to submission email: {}", email);
                                            if let Some(name) =
                                                sub.get("client_name").and_then(|v| v.as_str())
                                            {
                                                target_name = name.to_string();
                                            }
                                        }
                                    }
                                }
                            }

                            if let Some(email) = target_email {
                                if !sent_emails.contains(&email) {
                                    let subject = "Counter Offer for Licensing Request from Agency"
                                        .to_string();
                                    let body = format!(
                                        "Hello {},\n\nThe agency has sent a counter offer for your licensing request.\n\nReason/Notes: {}\n\nPlease reply to this email or contact the agency to review and respond.\n\nBest regards,\nLikelee Team",
                                        target_name, reason
                                    );
                                    if let Err(e) = crate::email::send_plain_email(
                                        &state, &email, &subject, &body,
                                    ) {
                                        tracing::error!(
                                            "Failed to send counter offer email to {}: {:?}",
                                            email,
                                            e
                                        );
                                    }
                                    sent_emails.insert(email);
                                }
                            }
                        }
                    }
                } else {
                    let status = b_resp.status();
                    let err_body = b_resp.text().await.unwrap_or_default();
                    tracing::error!(
                        "Database query for brand emails failed: status={}, body={}",
                        status,
                        err_body
                    );
                }
            } else {
                tracing::error!(
                    "Failed to execute database query for brand emails: {:?}",
                    b_resp.err()
                );
            }
        }
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
        .in_("licensing_request_id", id_refs.clone())
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

    // If campaigns are not created yet (pay split not set), derive the total from license_submissions.
    // In this schema, license_submissions links back to licensing_requests via license_submissions.licensing_request_id.
    if total <= 0.0 {
        let ls_resp = state
            .pg
            .from("license_submissions")
            .select("id,agency_id,licensing_request_id,license_fee")
            .eq("agency_id", &user.id)
            .in_("licensing_request_id", id_refs)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        if ls_resp.status().is_success() {
            let ls_text = ls_resp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let ls_rows: serde_json::Value = serde_json::from_str(&ls_text).unwrap_or(json!([]));
            if let Some(arr) = ls_rows.as_array() {
                for r in arr {
                    let fee = r
                        .get("license_fee")
                        .and_then(|v| v.as_f64().or_else(|| v.as_i64().map(|n| n as f64)))
                        .unwrap_or(0.0);
                    total += fee;
                }
            }
        }
    }

    Ok(Json(json!({
        "total_payment_amount": total,
        "agency_percent": agency_percent.or(Some(80.0)),
        "talent_percent": talent_percent.or(Some(20.0)),
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

    // Setting pay split implicitly approves the licensing requests for this agency.
    // This keeps the UX simple: agencies set pay, which moves the requests forward.
    let approve_body = json!({"status": "approved"});
    let _ = state
        .pg
        .from("licensing_requests")
        .eq("agency_id", &user.id)
        .in_("id", ids.clone())
        .update(approve_body.to_string())
        .execute()
        .await;

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

        let gross_cents = (per_talent_payment_amount * 100.0) as i64;
        let talent_cents = (gross_cents as f64 * (talent_percent / 100.0)) as i64;
        let agency_cents = gross_cents - talent_cents;

        let mut campaign_row = json!({
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
            "agency_earnings_cents": agency_cents,
            "talent_earnings_cents": talent_cents,
            "licensing_request_id": lrid,
        });

        if let serde_json::Value::Object(ref mut map) = campaign_row {
            let null_keys: Vec<String> = map
                .iter()
                .filter_map(|(k, val)| if val.is_null() { Some(k.clone()) } else { None })
                .collect();
            for k in null_keys {
                map.remove(&k);
            }
        }

        let cid = if let Some(existing_cid) = campaign_id_by_request_id.get(lrid).cloned() {
            let _ = state
                .pg
                .from("campaigns")
                .eq("id", &existing_cid)
                .update(campaign_row.to_string())
                .execute()
                .await;
            existing_cid
        } else {
            let c_resp = state
                .pg
                .from("campaigns")
                .insert(campaign_row.to_string())
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let c_text = c_resp.text().await.unwrap_or_else(|_| "[]".into());
            let c_rows: serde_json::Value = serde_json::from_str(&c_text).unwrap_or(json!([]));
            c_rows
                .get(0)
                .and_then(|v| v.get("id"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string()
        };

        if !cid.is_empty() {
            // Create or update payment record - Aligning with existing schema (gross_cents)
            let payment_row = json!({
                "agency_id": user.id,
                "talent_id": talent_id,
                "campaign_id": cid,
                "licensing_request_id": lrid,
                "brand_id": if brand_id.is_empty() { serde_json::Value::Null } else { json!(brand_id) },
                "gross_cents": gross_cents,
                "talent_earnings_cents": talent_cents,
                "status": "pending",
                "currency_code": "USD",
                "due_date": if date.is_empty() { serde_json::Value::Null } else { json!(date) },
            });

            let _ = state
                .pg
                .from("payments")
                .upsert(payment_row.to_string())
                .execute()
                .await;
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

pub async fn create(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<CreateLicensingRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    // Calculate end date
    let start_date =
        chrono::NaiveDate::parse_from_str(&payload.start_date, "%Y-%m-%d").map_err(|_| {
            (
                StatusCode::BAD_REQUEST,
                "Invalid start_date format (YYYY-MM-DD)".to_string(),
            )
        })?;
    let end_date = start_date + chrono::Duration::days(payload.duration_days);

    // 1. Create Licensing Request
    let request_json = json!({
        "agency_id": user.id,
        "talent_id": payload.talent_id,
        "client_name": payload.brand_name,
        "status": "approved",
        "campaign_title": payload.license_type,
        "usage_scope": payload.usage_scope,
        "license_start_date": payload.start_date,
        "license_end_date": end_date.to_string(),
        "notes": payload.terms, // Verify if we want to store custom terms in notes
    });

    let resp = state
        .pg
        .from("licensing_requests")
        .insert(request_json.to_string())
        .select("id")
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            resp.text().await.unwrap_or_default(),
        ));
    }

    let created: serde_json::Value =
        serde_json::from_str(&resp.text().await.unwrap_or_default())
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let request_id = created.get("id").and_then(|v| v.as_str()).unwrap_or("");

    // 2. Create Campaign (for value)
    if !request_id.is_empty() {
        let campaign_json = json!({
            "agency_id": user.id,
            "talent_id": payload.talent_id,
            "licensing_request_id": request_id,
            "name": payload.license_type,
            "payment_amount": payload.price,
            "status": "Confirmed",
            "campaign_type": "Licensing",
        });

        let _ = state
            .pg
            .from("campaigns")
            .insert(campaign_json.to_string())
            .execute()
            .await;
    }

    // 3. Increment Template Usage
    if let Some(template_id) = payload.template_id {
        // This requires a stored procedure or raw SQL typically to do atomic increment,
        // but via PostgREST we might need a workaround or just read-modify-write if low concurrency.
        // Or use the `rpc` call if we had a function.
        // For now, simpler read-modify-write as we don't have an `rpc` increment function set up.
        // ACTUALLY: We can just ignore the race condition for now or use SQLX if we had it.
        // Let's retrieve current count and update.

        let t_resp = state
            .pg
            .from("license_templates")
            .select("usage_count")
            .eq("id", &template_id)
            .single()
            .execute()
            .await;

        if let Ok(r) = t_resp {
            if let Ok(body) = r.text().await {
                if let Ok(obj) = serde_json::from_str::<serde_json::Value>(&body) {
                    let count = obj.get("usage_count").and_then(|v| v.as_i64()).unwrap_or(0);
                    let _ = state
                        .pg
                        .from("license_templates")
                        .eq("id", &template_id)
                        .update(json!({ "usage_count": count + 1 }).to_string())
                        .execute()
                        .await;
                }
            }
        }
    }

    Ok(Json(json!({ "id": request_id, "ok": true })))
}
