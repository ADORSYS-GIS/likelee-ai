use crate::{auth::AuthUser, config::AppState};
use axum::{
    extract::{Path, Query, State},
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
    pub license_fee: Option<f64>,
    pub usage_scope: Option<String>,
    pub regions: Option<String>,
    pub deadline: Option<String>,
    pub license_start_date: Option<String>,
    pub license_end_date: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub status: String,
    pub pay_set: bool,
    pub payment_link_url: Option<String>,
    pub payment_link_id: Option<String>,
    pub payment_link_status: Option<String>,
    pub talents: Vec<LicensingRequestTalent>,
}

#[derive(Deserialize)]
pub struct UpdateLicensingRequestStatusBody {
    pub licensing_request_ids: Vec<String>,
    pub status: String,
    pub notes: Option<String>,
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

#[derive(Deserialize)]
pub struct PaySplitQuery {
    pub licensing_request_ids: String,
}

#[derive(Deserialize)]
pub struct PaySplitBody {
    pub licensing_request_ids: Vec<String>,
    pub total_payment_amount: f64,
    pub agency_percent: f64,
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
    // Filter out archived records (archived_at IS NULL means not archived)
    let resp = state
        .pg
        .from("licensing_requests")
        .select("id,brand_id,talent_id,status,created_at,campaign_title,client_name,talent_name,usage_scope,regions,deadline,license_start_date,license_end_date,notes,negotiation_reason,submission_id,archived_at,brands(email,company_name),license_submissions!licensing_requests_submission_id_fkey(client_email,client_name,license_fee),agency_users(full_legal_name,stage_name),campaigns(id,payment_amount,agency_percent,talent_percent,agency_earnings_cents,talent_earnings_cents)")
        .eq("agency_id", &user.id)
        .is("archived_at", "null")  // Only show non-archived records
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

    // Fetch latest payment link per licensing_request_id so UI can show resend state.
    let lr_ids: Vec<String> = requests
        .iter()
        .filter_map(|r| r.get("id").and_then(|v| v.as_str()).map(|s| s.to_string()))
        .collect();
    let mut payment_link_by_lr: HashMap<String, serde_json::Value> = HashMap::new();
    if !lr_ids.is_empty() {
        let lr_refs: Vec<&str> = lr_ids.iter().map(|s| s.as_str()).collect();
        if let Ok(pl_resp) = state
            .pg
            .from("agency_payment_links")
            .select("id,licensing_request_id,stripe_payment_link_url,status,created_at")
            .eq("agency_id", &user.id)
            .in_("licensing_request_id", lr_refs)
            .order("created_at.desc")
            .execute()
            .await
        {
            if pl_resp.status().is_success() {
                if let Ok(pl_text) = pl_resp.text().await {
                    let pl_rows: Vec<serde_json::Value> =
                        serde_json::from_str(&pl_text).unwrap_or_default();
                    for row in pl_rows {
                        let lrid = row
                            .get("licensing_request_id")
                            .and_then(|v| v.as_str())
                            .unwrap_or("");
                        if lrid.is_empty() {
                            continue;
                        }
                        // Rows are ordered by created_at desc; first seen is latest.
                        if !payment_link_by_lr.contains_key(lrid) {
                            payment_link_by_lr.insert(lrid.to_string(), row);
                        }
                    }
                }
            }
        }
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
        let license_fee = r
            .get("license_submissions")
            .and_then(|ls| ls.get("license_fee"))
            .and_then(value_to_f64)
            .map(|v| v / 100.0); // Convert cents to dollars for UI
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
                license_fee,
                usage_scope: usage_scope.clone(),
                regions: regions.clone(),
                deadline: deadline.clone(),
                license_start_date: license_start_date.clone(),
                license_end_date: license_end_date.clone(),
                notes: notes.clone(),
                created_at: created_at.clone(),
                status: "pending".to_string(),
                pay_set: false,
                payment_link_url: None,
                payment_link_id: None,
                payment_link_status: None,
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
        if entry.license_fee.is_none() {
            entry.license_fee = license_fee;
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

        if entry.payment_link_id.is_none() {
            if let Some(pl) = payment_link_by_lr.get(id) {
                entry.payment_link_id = pl
                    .get("id")
                    .and_then(|v| v.as_str())
                    .filter(|s| !s.trim().is_empty())
                    .map(|s| s.to_string());
                entry.payment_link_url = pl
                    .get("stripe_payment_link_url")
                    .and_then(|v| v.as_str())
                    .filter(|s| !s.trim().is_empty())
                    .map(|s| s.to_string());
                entry.payment_link_status = pl
                    .get("status")
                    .and_then(|v| v.as_str())
                    .filter(|s| !s.trim().is_empty())
                    .map(|s| s.to_string());
            }
        }
    }

    // Final pass for groups to set pay_set accurately
    for group in groups.values_mut() {
        group.pay_set = !group.talents.is_empty()
            && group
                .talents
                .iter()
                .all(|t| t.total_agreed_amount.is_some());
    }

    let mut out: Vec<LicensingRequestGroup> = groups
        .into_values()
        .filter(|g| g.payment_link_status.as_deref().unwrap_or("") != "paid")
        .collect();
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

// ============================================================================
// Send Payment Link (approve + generate Stripe link + email client)
// ============================================================================

#[derive(serde::Serialize)]
pub struct SendPaymentLinkResponse {
    pub payment_link_url: String,
    pub payment_link_id: String,
    pub total_amount_cents: i64,
    pub platform_fee_cents: i64,
    pub agency_amount_cents: i64,
    pub talent_amount_cents: i64,
    pub client_email: Option<String>,
    pub email_sent: bool,
}

pub async fn send_payment_link(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<SendPaymentLinkResponse>, (StatusCode, String)> {
    use crate::entitlements::{get_agency_plan_tier, PlanTier};
    use chrono::Duration;
    use std::str::FromStr;
    use tracing::{error, warn};

    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    // 1. Fetch the licensing request (must belong to this agency)
    let lr_resp = state
        .pg
        .from("licensing_requests")
        .select("id,agency_id,brand_id,talent_id,talent_ids,status,campaign_title,client_name,talent_name,submission_id,brands(email,company_name),license_submissions!licensing_requests_submission_id_fkey(client_email,client_name,license_fee),agency_users(full_legal_name,stage_name,creator_id),campaigns(id,payment_amount,agency_percent,talent_percent,agency_earnings_cents,talent_earnings_cents)")
        .eq("id", &id)
        .eq("agency_id", &user.id)
        .limit(1)
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
    let lr_rows: Vec<serde_json::Value> = serde_json::from_str(&lr_text).unwrap_or_default();
    let lr = lr_rows.into_iter().next().ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            "Licensing request not found".to_string(),
        )
    })?;

    // 2. Auto-approve the request
    let update_body = json!({
        "status": "approved",
        "decided_at": Utc::now().to_rfc3339(),
    });
    let upd_resp = state
        .pg
        .from("licensing_requests")
        .eq("id", &id)
        .eq("agency_id", &user.id)
        .update(update_body.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !upd_resp.status().is_success() {
        let err = upd_resp.text().await.unwrap_or_default();
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to approve request: {}", err),
        ));
    }

    // 3. Resolve license fee (from license_submissions join)
    let license_submission = lr.get("license_submissions");
    let total_cents: i64 = license_submission
        .and_then(|ls| ls.get("license_fee"))
        .and_then(|v| {
            v.as_i64()
                .or_else(|| v.as_f64().map(|f| f.round() as i64))
                .or_else(|| v.as_str().and_then(|s| s.parse::<i64>().ok()))
        })
        .unwrap_or(0);

    if total_cents <= 0 {
        return Err((
            StatusCode::BAD_REQUEST,
            "License fee is not set or is zero. Please complete the license submission first."
                .to_string(),
        ));
    }

    // 4. Resolve agency Stripe Connect account
    let agency_acct_resp = state
        .pg
        .from("agencies")
        .select("stripe_connect_account_id")
        .eq("id", &user.id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let agency_acct_text = agency_acct_resp.text().await.unwrap_or_default();
    let agency_rows: Vec<serde_json::Value> =
        serde_json::from_str(&agency_acct_text).unwrap_or_default();
    let agency_stripe_account_id = agency_rows
        .first()
        .and_then(|r| r.get("stripe_connect_account_id").and_then(|v| v.as_str()))
        .unwrap_or("")
        .trim()
        .to_string();

    if agency_stripe_account_id.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Agency must connect a Stripe account before sending a payment link".to_string(),
        ));
    }

    // 5. Platform fee based on subscription plan
    let tier = get_agency_plan_tier(&state, &user.id).await?;
    let fee_pct: f64 = match tier {
        PlanTier::Free => 0.08,
        PlanTier::Basic => 0.05,
        PlanTier::Pro => 0.03,
        PlanTier::Enterprise => 0.03,
    };
    let platform_fee_cents = ((total_cents as f64) * fee_pct).round() as i64;
    let net_amount_cents = (total_cents - platform_fee_cents).max(0);

    if net_amount_cents <= 0 {
        return Err((
            StatusCode::BAD_REQUEST,
            "Net amount after platform fee must be positive".to_string(),
        ));
    }

    // 6. Resolve campaign id (if any)
    let campaign = lr.get("campaigns");
    let campaign_id = campaign
        .and_then(|c| c.get("id"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    // 7. Resolve client info
    let client_email = license_submission
        .and_then(|ls| ls.get("client_email"))
        .and_then(|v| v.as_str())
        .filter(|s| !s.trim().is_empty())
        .map(|s| s.to_string())
        .or_else(|| {
            lr.get("brands")
                .and_then(|b| b.get("email"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        });

    let client_name = license_submission
        .and_then(|ls| ls.get("client_name"))
        .and_then(|v| v.as_str())
        .filter(|s| !s.trim().is_empty())
        .map(|s| s.to_string())
        .or_else(|| {
            lr.get("brands")
                .and_then(|b| b.get("company_name"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        });

    if client_email.is_none() {
        warn!(
            agency_id = %user.id,
            licensing_request_id = %id,
            "No client email found for payment link - email sending will be skipped"
        );
    }

    // 8. Build talent splits JSON for storage
    // Collect all talent IDs: prefer talent_ids array, fall back to single talent_id
    let mut all_talent_ids: Vec<String> = lr
        .get("talent_ids")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();

    if all_talent_ids.is_empty() {
        // Fall back to the single talent_id
        let single = lr
            .get("talent_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        if !single.is_empty() {
            all_talent_ids.push(single);
        }
    }

    all_talent_ids.sort();
    all_talent_ids.dedup();

    // Fetch agency_users details (name + creator_id + performance_tier_name) for all talent IDs
    let t_refs: Vec<&str> = all_talent_ids.iter().map(|s| s.as_str()).collect();
    let mut talent_name_map: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    let mut talent_creator_map: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    let mut talent_tier_name_map: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();

    if !t_refs.is_empty() {
        let au_resp = state
            .pg
            .from("agency_users")
            .select("id,creator_id,full_legal_name,stage_name,performance_tier_name")
            .in_("id", t_refs)
            .execute()
            .await;
        if let Ok(au_resp) = au_resp {
            if au_resp.status().is_success() {
                let au_text = au_resp.text().await.unwrap_or_else(|_| "[]".into());
                let au_rows: Vec<serde_json::Value> =
                    serde_json::from_str(&au_text).unwrap_or_default();
                for r in &au_rows {
                    let tid = r
                        .get("id")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                    if tid.is_empty() {
                        continue;
                    }
                    let name = r
                        .get("full_legal_name")
                        .or_else(|| r.get("stage_name"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("Unknown")
                        .to_string();
                    talent_name_map.insert(tid.clone(), name);
                    if let Some(cid) = r.get("creator_id").and_then(|v| v.as_str()) {
                        talent_creator_map.insert(tid.clone(), cid.to_string());
                    }
                    if let Some(tn) = r.get("performance_tier_name").and_then(|v| v.as_str()) {
                        talent_tier_name_map.insert(tid, tn.to_string());
                    }
                }
            }
        }
    }

    // If map is still empty (e.g. talent_ids populated but AU lookup failed), fall back to embedded agency_users join
    if talent_name_map.is_empty() && all_talent_ids.len() == 1 {
        let tid = all_talent_ids[0].clone();
        let name = lr
            .get("agency_users")
            .and_then(|au| au.get("full_legal_name").or_else(|| au.get("stage_name")))
            .and_then(|v| v.as_str())
            .unwrap_or("Unknown")
            .to_string();
        let cid = lr
            .get("agency_users")
            .and_then(|au| au.get("creator_id"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let tn = lr
            .get("agency_users")
            .and_then(|au| au.get("performance_tier_name"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        talent_name_map.insert(tid.clone(), name);
        if !cid.is_empty() {
            talent_creator_map.insert(tid.clone(), cid);
        }
        if !tn.is_empty() {
            talent_tier_name_map.insert(tid, tn);
        }
    }

    // Fetch creator Stripe Connect account IDs
    let creator_ids_vec: Vec<String> = talent_creator_map.values().cloned().collect();
    let cr_refs: Vec<&str> = creator_ids_vec.iter().map(|s| s.as_str()).collect();
    let mut stripe_account_map: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();

    if !cr_refs.is_empty() {
        let cr_resp = state
            .pg
            .from("creators")
            .select("id,stripe_connect_account_id")
            .in_("id", cr_refs)
            .execute()
            .await;
        if let Ok(cr_resp) = cr_resp {
            if cr_resp.status().is_success() {
                let cr_text = cr_resp.text().await.unwrap_or_else(|_| "[]".into());
                let cr_rows: Vec<serde_json::Value> =
                    serde_json::from_str(&cr_text).unwrap_or_default();
                for r in &cr_rows {
                    let cid = r.get("id").and_then(|v| v.as_str()).unwrap_or("");
                    let acct = r
                        .get("stripe_connect_account_id")
                        .and_then(|v| v.as_str())
                        .unwrap_or("");
                    if !cid.is_empty() && !acct.is_empty() {
                        stripe_account_map.insert(cid.to_string(), acct.to_string());
                    }
                }
            }
        }
    }

    // Check that all talents have connected their creator profiles and Stripe Connect accounts
    let mut missing_stripe: Vec<String> = vec![];
    for tid in &all_talent_ids {
        let name = talent_name_map
            .get(tid)
            .cloned()
            .unwrap_or_else(|| "Unknown".to_string());
        let cid = talent_creator_map.get(tid).cloned().unwrap_or_default();
        if cid.is_empty() {
            missing_stripe.push(format!("{} (No creator profile linked)", name));
            continue;
        }
        if !stripe_account_map.contains_key(&cid) {
            missing_stripe.push(format!("{} (No Stripe account connected)", name));
        }
    }

    if !missing_stripe.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            json!({
                "code": "MISSING_TALENT_STRIPE_CONNECT",
                "message": "Some talents are not ready for payments yet.",
                "action": "Link each talent to a Creator profile and ensure they complete Stripe Connect onboarding. Then try sending the payment link again.",
                "missing": missing_stripe,
            })
            .to_string(),
        ));
    }

    // Fetch payout_percent per tier name from performance_tiers table
    let tier_names: Vec<String> = talent_tier_name_map.values().cloned().collect();
    let mut tier_payout_percent_map: std::collections::HashMap<String, f64> =
        std::collections::HashMap::new();
    if !tier_names.is_empty() {
        let tn_refs: Vec<&str> = tier_names.iter().map(|s| s.as_str()).collect();
        let pt_resp = state
            .pg
            .from("performance_tiers")
            .select("tier_name,payout_percent")
            .eq("agency_id", &user.id)
            .in_("tier_name", tn_refs)
            .execute()
            .await;
        if let Ok(pt_resp) = pt_resp {
            if pt_resp.status().is_success() {
                let pt_text = pt_resp.text().await.unwrap_or_else(|_| "[]".into());
                let pt_rows: Vec<serde_json::Value> =
                    serde_json::from_str(&pt_text).unwrap_or_default();
                for r in &pt_rows {
                    let tn = r.get("tier_name").and_then(|v| v.as_str()).unwrap_or("");
                    let pct = r
                        .get("payout_percent")
                        .and_then(|v| v.as_f64())
                        .unwrap_or(25.0);
                    if !tn.is_empty() {
                        tier_payout_percent_map.insert(tn.to_string(), pct);
                    }
                }
            }
        }
    }

    // Talent split semantics:
    // - `performance_tiers.payout_percent` is treated as an absolute percent of `net_amount_cents`
    //   (net = total - platform fee) per talent.
    // - The agency receives the remainder.
    let mut raw_amounts: Vec<(String, i64, String, f64)> = Vec::new();
    let mut raw_total_cents: i64 = 0;

    for tid in &all_talent_ids {
        let tier_name = talent_tier_name_map
            .get(tid)
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .unwrap_or("Inactive");
        let payout_pct = tier_payout_percent_map
            .get(tier_name)
            .copied()
            .unwrap_or(0.0)
            .max(0.0);

        let cents = ((net_amount_cents as f64) * (payout_pct / 100.0)).round() as i64;
        raw_total_cents += cents;
        raw_amounts.push((tid.clone(), cents.max(0), tier_name.to_string(), payout_pct));
    }

    // If total talent payout exceeds net (e.g. sum of percents > 100), scale down proportionally.
    let scale = if raw_total_cents > net_amount_cents && raw_total_cents > 0 {
        (net_amount_cents as f64) / (raw_total_cents as f64)
    } else {
        1.0
    };

    let mut talent_splits_json: Vec<serde_json::Value> = Vec::new();
    let mut distributed_cents: i64 = 0;

    for (i, (tid, cents, tier_name, payout_pct)) in raw_amounts.iter().enumerate() {
        let name = talent_name_map
            .get(tid)
            .cloned()
            .unwrap_or_else(|| "Unknown".to_string());
        let cid = talent_creator_map.get(tid).cloned().unwrap_or_default();
        let stripe_acct = stripe_account_map.get(&cid).cloned().unwrap_or_default();

        let mut amount = ((*cents as f64) * scale).round() as i64;
        if i == raw_amounts.len() - 1 {
            // Last talent: clamp so we never exceed net_amount_cents due to rounding.
            amount = (net_amount_cents - distributed_cents).max(0);
        }
        distributed_cents += amount;

        talent_splits_json.push(json!({
            "talent_id": tid,
            "talent_name": name,
            "creator_id": cid,
            "amount_cents": amount,
            "stripe_connect_account_id": stripe_acct,
            "tier_name": tier_name,
            "payout_percent": payout_pct,
        }));
    }

    let talent_amount_cents = distributed_cents.max(0);
    let agency_amount_cents = (net_amount_cents - talent_amount_cents).max(0);
    let agency_percent = if net_amount_cents > 0 {
        ((agency_amount_cents as f64) * 100.0) / (net_amount_cents as f64)
    } else {
        0.0
    };
    let talent_percent = 100.0 - agency_percent;

    // Ensure at least one entry so downstream code always has splits
    if talent_splits_json.is_empty() {
        talent_splits_json.push(json!({
            "talent_id": "",
            "talent_name": "Unknown",
            "creator_id": "",
            "amount_cents": net_amount_cents,
            "stripe_connect_account_id": "",
        }));
    }

    tracing::info!(
        agency_id = %user.id,
        licensing_request_id = %id,
        net_amount_cents = net_amount_cents,
        agency_amount_cents = agency_amount_cents,
        talent_amount_cents = talent_amount_cents,
        talent_count = all_talent_ids.len(),
        scale = scale,
        "Computed payment link split"
    );

    // 9. Create Stripe product + price + payment link
    let stripe_client = stripe_sdk::Client::new(state.stripe_secret_key.clone());
    let currency = "USD";
    let expires_in_hours = 168i64; // 7 days

    let product_name = format!(
        "License - {}",
        lr.get("campaign_title")
            .and_then(|v| v.as_str())
            .unwrap_or("Campaign")
    );
    let product_params = stripe_sdk::CreateProduct::new(&product_name);
    let product = stripe_sdk::Product::create(&stripe_client, product_params)
        .await
        .map_err(|e| {
            error!("Failed to create Stripe product: {}", e);
            (
                StatusCode::BAD_GATEWAY,
                format!("Stripe product creation failed: {}", e),
            )
        })?;

    let currency_enum = stripe_sdk::Currency::from_str(&currency.to_lowercase()).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            format!("Invalid currency: {}", currency),
        )
    })?;

    let mut price_params = stripe_sdk::CreatePrice::new(currency_enum);
    let product_id_str = product.id.to_string();
    price_params.product = Some(stripe_sdk::IdOrCreate::Id(&product_id_str));
    price_params.unit_amount = Some(total_cents);
    let price = stripe_sdk::Price::create(&stripe_client, price_params)
        .await
        .map_err(|e| {
            error!("Failed to create Stripe price: {}", e);
            (
                StatusCode::BAD_GATEWAY,
                format!("Stripe price creation failed: {}", e),
            )
        })?;

    let line_items = vec![stripe_sdk::CreatePaymentLinkLineItems {
        price: price.id.to_string(),
        quantity: 1,
        ..Default::default()
    }];

    let expires_at = Utc::now() + Duration::hours(expires_in_hours);

    let mut metadata = std::collections::HashMap::new();
    metadata.insert("agency_id".to_string(), user.id.clone());
    metadata.insert("licensing_request_ids".to_string(), id.clone());
    metadata.insert(
        "campaign_id".to_string(),
        campaign_id.clone().unwrap_or_default(),
    );
    metadata.insert(
        "platform_fee_cents".to_string(),
        platform_fee_cents.to_string(),
    );
    metadata.insert("net_amount_cents".to_string(), net_amount_cents.to_string());
    metadata.insert(
        "plan_tier".to_string(),
        match tier {
            PlanTier::Free => "free",
            PlanTier::Basic => "basic",
            PlanTier::Pro => "pro",
            PlanTier::Enterprise => "enterprise",
        }
        .to_string(),
    );
    metadata.insert(
        "agency_amount_cents".to_string(),
        agency_amount_cents.to_string(),
    );
    metadata.insert(
        "talent_amount_cents".to_string(),
        talent_amount_cents.to_string(),
    );
    metadata.insert("currency".to_string(), currency.to_string());

    let mut link_params = stripe_sdk::CreatePaymentLink::new(line_items);
    link_params.metadata = Some(metadata);
    let payment_link = stripe_sdk::PaymentLink::create(&stripe_client, link_params)
        .await
        .map_err(|e| {
            error!("Failed to create Stripe payment link: {}", e);
            (
                StatusCode::BAD_GATEWAY,
                format!("Stripe payment link creation failed: {}", e),
            )
        })?;

    let stripe_payment_link_url = payment_link.url.clone();
    let stripe_payment_link_id = payment_link.id.to_string();

    // 10. Store in agency_payment_links
    let db_record = json!({
        "agency_id": user.id,
        "licensing_request_id": id,
        "campaign_id": campaign_id,
        "stripe_payment_link_id": stripe_payment_link_id,
        "stripe_payment_link_url": stripe_payment_link_url,
        "stripe_price_id": price.id.to_string(),
        "total_amount_cents": total_cents,
        "platform_fee_cents": platform_fee_cents,
        "net_amount_cents": net_amount_cents,
        "agency_amount_cents": agency_amount_cents,
        "talent_amount_cents": talent_amount_cents,
        "currency": currency,
        "agency_percent": agency_percent,
        "talent_percent": talent_percent,
        "talent_splits": talent_splits_json,
        "client_email": client_email,
        "client_name": client_name,
        "status": "active",
        "expires_at": expires_at.to_rfc3339(),
    });

    let insert_resp = state
        .pg
        .from("agency_payment_links")
        .insert(db_record.to_string())
        .select("id")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let insert_text = insert_resp.text().await.unwrap_or_default();
    let inserted: Vec<serde_json::Value> = serde_json::from_str(&insert_text).unwrap_or_default();
    let our_payment_link_id = inserted
        .first()
        .and_then(|r| r.get("id").and_then(|v| v.as_str()))
        .unwrap_or("")
        .to_string();

    info!(
        agency_id = %user.id,
        licensing_request_id = %id,
        payment_link_id = %our_payment_link_id,
        "Payment link generated via send_payment_link"
    );

    // 11. Send email to client
    let mut email_sent = false;
    if let Some(ref email) = db_record
        .get("client_email")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
    {
        if !email.is_empty() {
            let name = db_record
                .get("client_name")
                .and_then(|v| v.as_str())
                .unwrap_or("Client");
            let campaign_title = lr
                .get("campaign_title")
                .and_then(|v| v.as_str())
                .unwrap_or("Campaign");
            let amount_dollars = total_cents as f64 / 100.0;
            let formatted_amount = format!("${:.2}", amount_dollars);
            let subject = format!("Payment Request for {} - Likelee", campaign_title);
            let body = format!(
                "Dear {},\n\nYour licensing request has been approved.\n\nCampaign: {}\nTotal Amount: {}\n\nPlease complete your payment using the secure link below:\n{}\n\nThis link will expire on {}.\n\nBest regards,\nLikelee",
                name,
                campaign_title,
                formatted_amount,
                stripe_payment_link_url,
                expires_at.format("%Y-%m-%d %H:%M UTC"),
            );
            match crate::email::send_plain_email(&state, email, &subject, &body) {
                Ok(_) => {
                    email_sent = true;
                    info!(licensing_request_id = %id, email = %email, "Payment link email sent");
                }
                Err(e) => {
                    warn!(licensing_request_id = %id, email = %email, error = ?e, "Failed to send payment link email");
                }
            }
        }
    }

    let resolved_client_email = db_record
        .get("client_email")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string());

    Ok(Json(SendPaymentLinkResponse {
        payment_link_url: stripe_payment_link_url,
        payment_link_id: our_payment_link_id,
        total_amount_cents: total_cents,
        platform_fee_cents,
        agency_amount_cents,
        talent_amount_cents,
        client_email: resolved_client_email,
        email_sent,
    }))
}

pub async fn get_pay_split(
    State(state): State<AppState>,
    user: AuthUser,
    Query(q): Query<PaySplitQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    if q.licensing_request_ids.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "No licensing_request_ids".to_string(),
        ));
    }

    let ids: Vec<&str> = q.licensing_request_ids.split(',').collect();

    let lr_resp = state
        .pg
        .from("licensing_requests")
        .select("id,agency_id,brand_id,talent_id,status,created_at,agency_users(full_legal_name,stage_name)")
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

    let mut talent_name_by_id: HashMap<String, String> = HashMap::new();
    for r in &reqs {
        let tid = r.get("talent_id").and_then(|v| v.as_str()).unwrap_or("");
        let name = r
            .get("agency_users")
            .and_then(|v| v.get("full_legal_name").or(v.get("stage_name")))
            .and_then(|v| v.as_str())
            .unwrap_or("Unknown")
            .to_string();
        if !tid.is_empty() {
            talent_name_by_id.insert(tid.to_string(), name);
        }
    }

    // Find existing campaign rows
    let c_resp = state
        .pg
        .from("campaigns")
        .select("id,licensing_request_id,payment_amount,agency_percent,talent_percent")
        .in_("licensing_request_id", ids)
        .execute()
        .await;

    let mut total = 0.0;
    let mut agency_percent = 0.0;
    let mut talent_percent = 0.0;
    let mut out_rows: Vec<serde_json::Value> = vec![];

    if let Ok(c_resp) = c_resp {
        let c_text = c_resp.text().await.unwrap_or_else(|_| "[]".into());
        let c_rows: Vec<serde_json::Value> = serde_json::from_str(&c_text).unwrap_or_default();

        for r in &c_rows {
            total += r
                .get("payment_amount")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0);
            agency_percent = r
                .get("agency_percent")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0);
            talent_percent = r
                .get("talent_percent")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0);

            let talent_id = reqs
                .iter()
                .find(|lr| lr.get("id") == r.get("licensing_request_id"))
                .and_then(|lr| lr.get("talent_id"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
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
