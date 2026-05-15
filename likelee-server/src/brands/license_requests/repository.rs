use crate::{
    errors::sanitize_db_error,
    state::AppState,
};
use axum::http::StatusCode;
use serde_json::{json, Value};
use std::collections::HashMap;
use tracing::error;

pub async fn create_brand_license_request(
    state: &AppState,
    brand_id: &str,
    payload: &serde_json::Value,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let creator_id = payload
        .get("creator_id")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .unwrap_or_default();
    let campaign_title = payload
        .get("campaign_title")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .unwrap_or_default();

    if creator_id.is_empty() || campaign_title.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "creator_id and campaign_title are required".to_string(),
        ));
    }

    let duration_days = payload
        .get("duration_days")
        .and_then(|v| v.as_i64())
        .unwrap_or(30)
        .clamp(1, 3650);
    let territory = payload
        .get("territory")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "Global".to_string());
    let usage_scope = payload
        .get("usage_scope")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| territory.clone());

    let agency_id_hint: Option<String> = payload
        .get("agency_id")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    let all_roster_resp = state
        .pg
        .from("agency_users")
        .select("id,full_legal_name,stage_name,agency_id,created_at")
        .eq("creator_id", &creator_id)
        .eq("role", "talent")
        .eq("status", "active")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let roster_status = all_roster_resp.status();
    let roster_text = all_roster_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !roster_status.is_success() {
        return Err(sanitize_db_error(
            roster_status.as_u16(),
            roster_text.clone(),
        ));
    }

    let mut roster_rows: Vec<serde_json::Value> =
        serde_json::from_str(&roster_text).unwrap_or_default();

    if roster_rows.is_empty() {
        return Err((
            StatusCode::UNPROCESSABLE_ENTITY,
            "This creator is not currently represented by an agency. \
             Direct licensing requests are not yet supported — \
             please reach out to the creator directly."
                .to_string(),
        ));
    }

    if let Some(ref hint) = agency_id_hint {
        roster_rows.retain(|row| {
            row.get("agency_id")
                .and_then(|v| v.as_str())
                .map(|v| v == hint)
                .unwrap_or(false)
        });

        if roster_rows.is_empty() {
            return Err((
                StatusCode::UNPROCESSABLE_ENTITY,
                "This creator is not currently represented by the selected agency.".to_string(),
            ));
        }
    }

    if roster_rows.len() > 1 {
        roster_rows.sort_by(|a, b| {
            let a_date = a.get("created_at").and_then(|v| v.as_str()).unwrap_or("");
            let b_date = b.get("created_at").and_then(|v| v.as_str()).unwrap_or("");
            b_date.cmp(a_date)
        });

        let distinct_agencies: std::collections::HashSet<String> = roster_rows
            .iter()
            .filter_map(|row| row.get("agency_id").and_then(|v| v.as_str()))
            .map(|s| s.to_string())
            .collect();

        if agency_id_hint.is_none() && distinct_agencies.len() > 1 {
            tracing::warn!(
                creator_id = %creator_id,
                agency_count = distinct_agencies.len(),
                "Rejecting brand license request because creator has multiple active agency associations and no agency hint was supplied"
            );
            return Err((
                StatusCode::CONFLICT,
                "This creator is linked to multiple active agencies. Please request the license from the represented agency profile."
                    .to_string(),
            ));
        }

        tracing::warn!(
            creator_id = %creator_id,
            roster_count = roster_rows.len(),
            "Multiple active roster rows found for creator; using the most recent matching entry"
        );
    }

    let talent_row = &roster_rows[0];

    let agency_id = talent_row
        .get("agency_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let talent_id = talent_row
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let talent_name: Option<String> = talent_row
        .get("full_legal_name")
        .or_else(|| talent_row.get("stage_name"))
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    if agency_id.is_empty() {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            "Could not resolve agency for this creator (active roster row is missing agency_id)."
                .to_string(),
        ));
    }

    // ── Step 2: Verify brand is connected to that agency (or auto-create connection) ──
    let connected_resp = state
        .pg
        .from("brand_agency_connections")
        .select("id,status,brand_id,agency_id")
        .eq("brand_id", brand_id)
        .eq("agency_id", &agency_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let connected_status = connected_resp.status();
    let connected_text = connected_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let (connection_table, connected_rows): (&str, Vec<serde_json::Value>) =
        if connected_status.is_success() {
            (
                "brand_agency_connections",
                serde_json::from_str(&connected_text).unwrap_or_default(),
            )
        } else if crate::face_profiles::is_missing_relation_error(
            &connected_text,
            "brand_agency_connections",
        ) {
            let fallback_resp = state
                .pg
                .from("brand_agency_connection_requests")
                .select("id,status,brand_id,agency_id")
                .eq("brand_id", brand_id)
                .eq("agency_id", &agency_id)
                .limit(1)
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let fb_status = fallback_resp.status();
            let fb_text = fallback_resp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

            tracing::info!(
                "brand_agency_connection_requests query status: {}, response: {}",
                fb_status,
                fb_text
            );

            if !fb_status.is_success() {
                return Err(sanitize_db_error(fb_status.as_u16(), fb_text));
            }
            (
                "brand_agency_connection_requests",
                serde_json::from_str(&fb_text).unwrap_or_default(),
            )
        } else {
            return Err(sanitize_db_error(connected_status.as_u16(), connected_text));
        };

    if !connected_rows.is_empty() {
        let conn_status = connected_rows[0]
            .get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        if conn_status != "active" && conn_status != "accepted" {
            let connection_id = connected_rows[0]
                .get("id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            tracing::info!(
                connection_id = %connection_id,
                connection_table = %connection_table,
                previous_status = %conn_status,
                "Existing brand-agency connection is inactive; restoring it as part of the licensing request flow"
            );

            if !connection_id.is_empty() {
                let restore_payload = match connection_table {
                    "brand_agency_connections" => json!({
                        "status": "active",
                        "connected_at": chrono::Utc::now().to_rfc3339(),
                        "updated_at": chrono::Utc::now().to_rfc3339()
                    }),
                    _ => json!({
                        "status": "accepted",
                        "message": "Reactivated via license request",
                        "updated_at": chrono::Utc::now().to_rfc3339()
                    }),
                };

                let restore_result = state
                    .pg
                    .from(connection_table)
                    .auth(state.supabase_service_key.clone())
                    .update(restore_payload.to_string())
                    .eq("id", &connection_id)
                    .execute()
                    .await;

                match restore_result {
                    Ok(resp) if resp.status().is_success() => {
                        tracing::info!(
                            connection_id = %connection_id,
                            connection_table = %connection_table,
                            "Successfully restored existing brand-agency connection for licensing request"
                        );
                    }
                    Ok(resp) => {
                        let status = resp.status();
                        let body = resp.text().await.unwrap_or_default();
                        tracing::warn!(
                            connection_id = %connection_id,
                            connection_table = %connection_table,
                            restore_status = %status,
                            restore_body = %body,
                            "Failed to restore existing brand-agency connection; continuing with licensing request creation"
                        );
                    }
                    Err(e) => {
                        tracing::warn!(
                            connection_id = %connection_id,
                            connection_table = %connection_table,
                            error = %e,
                            "Error restoring existing brand-agency connection; continuing with licensing request creation"
                        );
                    }
                }
            }
        }
    } else {
        let connection_payload = json!({
            "brand_id": brand_id,
            "agency_id": agency_id,
            "status": "active",
            "connected_at": chrono::Utc::now().to_rfc3339(),
            "created_at": chrono::Utc::now().to_rfc3339(),
            "updated_at": chrono::Utc::now().to_rfc3339()
        });

        let create_conn_resp = state
            .pg
            .from("brand_agency_connections")
            .auth(state.supabase_service_key.clone())
            .insert(connection_payload.to_string())
            .execute()
            .await;

        match create_conn_resp {
            Ok(resp) => {
                let status = resp.status();
                let text = resp.text().await.unwrap_or_default();

                if status.is_success() {
                    crate::team::invalidate_brand_agency_connection_cache(
                        state,
                        brand_id,
                        &agency_id,
                    );
                } else if crate::face_profiles::is_missing_relation_error(
                    &text,
                    "brand_agency_connections",
                ) {
                    let req_payload = json!({
                        "brand_id": brand_id,
                        "agency_id": agency_id,
                        "status": "accepted",
                        "message": "Auto-created via license request",
                        "created_at": chrono::Utc::now().to_rfc3339(),
                        "updated_at": chrono::Utc::now().to_rfc3339()
                    });

                    let req_resp = state
                        .pg
                        .from("brand_agency_connection_requests")
                        .auth(state.supabase_service_key.clone())
                        .insert(req_payload.to_string())
                        .execute()
                        .await;

                    match req_resp {
                        Ok(r) if r.status().is_success() => {}
                        Ok(r) => {
                            let status = r.status();
                            let err_text = r.text().await.unwrap_or_default();
                            tracing::warn!(
                                "Failed to create connection_request: status={}, body={}",
                                status,
                                err_text
                            );
                        }
                        Err(e) => {
                            tracing::warn!("Error creating connection_request: {}", e);
                        }
                    }
                } else {
                    tracing::warn!(
                        "Failed to auto-create connection: status={}, body={}",
                        status,
                        text
                    );
                }
            }
            Err(e) => {
                tracing::warn!("Error auto-creating connection: {}", e);
            }
        }
    }

    let start_date = payload
        .get("start_date")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| chrono::Utc::now().date_naive().to_string());
    let start_naive = chrono::NaiveDate::parse_from_str(&start_date, "%Y-%m-%d")
        .unwrap_or_else(|_| chrono::Utc::now().date_naive());
    let end_naive = start_naive + chrono::Duration::days(duration_days);

    let str_field = |key: &str| -> Option<String> {
        payload
            .get(key)
            .and_then(|v| v.as_str())
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
    };

    let insert_payload = json!({
        "brand_id": brand_id,
        "agency_id": agency_id,
        "creator_id": creator_id,
        "talent_id": if talent_id.is_empty() { serde_json::Value::Null } else { json!(talent_id) },
        "talent_name": talent_name,
        "campaign_title": campaign_title,
        "description": str_field("description"),
        "category": str_field("category"),
        "exclusivity": str_field("exclusivity"),
        "modifications_allowed": str_field("modifications_allowed"),
        "territory": territory,
        "usage_scope": usage_scope,
        "license_fee": payload.get("license_fee").and_then(|v| v.as_f64()),
        "duration_days": duration_days,
        "license_start_date": start_naive.to_string(),
        "license_end_date": end_naive.to_string(),
        "status": "pending",
    });

    let create_resp = state
        .pg
        .from("brand_license_requests")
        .auth(payload.get("access_token").and_then(|v| v.as_str()).unwrap_or("").to_string())
        .insert(insert_payload.to_string())
        .select("id")
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let create_status = create_resp.status();
    let create_text = create_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !create_status.is_success() {
        return Err(sanitize_db_error(create_status.as_u16(), create_text));
    }
    let created: serde_json::Value = serde_json::from_str(&create_text).unwrap_or_default();

    Ok(created)
}

pub async fn list_brand_license_requests_for_brand(
    state: &AppState,
    brand_id: &str,
    access_token: &str,
) -> Result<Vec<serde_json::Value>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("brand_license_requests")
        .auth(access_token.to_string())
        .select("id,brand_id,agency_id,creator_id,talent_id,talent_name,campaign_title,description,category,exclusivity,modifications_allowed,territory,usage_scope,license_fee,duration_days,license_start_date,license_end_date,status,decline_reason,submission_id,notes,created_at,agencies(agency_name,logo_url),creators(full_name,email),license_submission:license_submissions!brand_license_requests_submission_id_fkey(id,docuseal_slug,client_submitter_slug,status,created_at),license_submissions!license_submissions_brand_request_id_fkey(id,docuseal_slug,client_submitter_slug,status,created_at)")
        .eq("brand_id", brand_id)
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
        return Err(sanitize_db_error(status.as_u16(), text));
    }

    let mut rows: Vec<serde_json::Value> = serde_json::from_str(&text).map_err(|e| {
        error!(error = %e, "brand_license_requests JSON parse error");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("JSON parse error: {}", e),
        )
    })?;

    let submission_ids: Vec<&str> = rows
        .iter()
        .filter_map(|row| row.get("submission_id").and_then(|v| v.as_str()))
        .filter(|id| !id.trim().is_empty())
        .collect();
    let brand_request_ids: Vec<&str> = rows
        .iter()
        .filter_map(|row| row.get("id").and_then(|v| v.as_str()))
        .filter(|id| !id.trim().is_empty())
        .collect();

    if !submission_ids.is_empty() || !brand_request_ids.is_empty() {
        let mut supplements_by_submission_id: HashMap<String, Vec<Value>> = HashMap::new();
        let mut supplements_by_brand_request_id: HashMap<String, Vec<Value>> = HashMap::new();

        let mut query = state
            .pg
            .from("license_submissions")
            .select("id,brand_request_id,docuseal_slug,client_submitter_slug,status,created_at");

        if !submission_ids.is_empty() {
            query = query.in_("id", submission_ids.clone());
        }
        if !brand_request_ids.is_empty() {
            query = query.in_("brand_request_id", brand_request_ids.clone());
        }

        if let Ok(extra_resp) = query.order("created_at.desc").limit(500).execute().await {
            if extra_resp.status().is_success() {
                if let Ok(extra_text) = extra_resp.text().await {
                    if let Ok(extra_rows) = serde_json::from_str::<Vec<Value>>(&extra_text) {
                        for sub in extra_rows {
                            if let Some(id) = sub.get("id").and_then(|v| v.as_str()) {
                                supplements_by_submission_id
                                    .entry(id.to_string())
                                    .or_default()
                                    .push(sub.clone());
                            }
                            if let Some(brand_request_id) =
                                sub.get("brand_request_id").and_then(|v| v.as_str())
                            {
                                supplements_by_brand_request_id
                                    .entry(brand_request_id.to_string())
                                    .or_default()
                                    .push(sub.clone());
                            }
                        }
                    }
                }
            }
        }

        for row in &mut rows {
            let mut merged_submissions: Vec<Value> = Vec::new();
            let mut seen_ids: std::collections::HashSet<String> = std::collections::HashSet::new();

            let push_unique = |target: &mut Vec<Value>,
                               seen: &mut std::collections::HashSet<String>,
                               sub: Value| {
                let id = sub
                    .get("id")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
                    .unwrap_or_default();
                if id.is_empty() || seen.insert(id) {
                    target.push(sub);
                }
            };

            if let Some(existing) = row.get("license_submission").cloned() {
                if let Some(arr) = existing.as_array() {
                    for sub in arr.iter().cloned() {
                        push_unique(&mut merged_submissions, &mut seen_ids, sub);
                    }
                } else if existing.is_object() {
                    push_unique(&mut merged_submissions, &mut seen_ids, existing);
                }
            }

            if let Some(existing) = row.get("license_submissions").cloned() {
                if let Some(arr) = existing.as_array() {
                    for sub in arr.iter().cloned() {
                        push_unique(&mut merged_submissions, &mut seen_ids, sub);
                    }
                } else if existing.is_object() {
                    push_unique(&mut merged_submissions, &mut seen_ids, existing);
                }
            }

            if let Some(submission_id) = row.get("submission_id").and_then(|v| v.as_str()) {
                if let Some(extra) = supplements_by_submission_id.get(submission_id) {
                    for sub in extra.iter().cloned() {
                        push_unique(&mut merged_submissions, &mut seen_ids, sub);
                    }
                }
            }

            if let Some(brand_request_id) = row.get("id").and_then(|v| v.as_str()) {
                if let Some(extra) = supplements_by_brand_request_id.get(brand_request_id) {
                    for sub in extra.iter().cloned() {
                        push_unique(&mut merged_submissions, &mut seen_ids, sub);
                    }
                }
            }

            if let Some(obj) = row.as_object_mut() {
                if let Some(first) = merged_submissions.first().cloned() {
                    obj.insert("license_submission".to_string(), first);
                }
                obj.insert(
                    "license_submissions".to_string(),
                    Value::Array(merged_submissions),
                );
            }
        }
    }

    Ok(rows)
}

pub async fn list_brand_license_requests_for_agency(
    state: &AppState,
    agency_id: &str,
) -> Result<Vec<serde_json::Value>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("brand_license_requests")
        .select("id,brand_id,agency_id,creator_id,talent_id,talent_name,campaign_title,description,category,exclusivity,modifications_allowed,territory,usage_scope,license_fee,duration_days,license_start_date,license_end_date,status,decline_reason,submission_id,notes,created_at,brands(company_name,email),creators(full_name,email,profile_photo_url)")
        .eq("agency_id", agency_id)
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
        tracing::error!(
            "Failed to fetch brand license requests: status={}, body={}",
            status,
            text
        );
        return Err(sanitize_db_error(status.as_u16(), text));
    }

    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).map_err(|e| {
        error!(error = %e, "brand_license_requests JSON parse error");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("JSON parse error: {}", e),
        )
    })?;

    Ok(rows)
}

pub async fn update_brand_license_request_status(
    state: &AppState,
    agency_id: &str,
    brand_request_ids: &[String],
    status: &str,
    decline_reason: Option<&str>,
) -> Result<(), (StatusCode, String)> {
    let ids: Vec<&str> = brand_request_ids.iter().map(|s| s.as_str()).collect();
    let mut update = serde_json::Map::new();
    update.insert("status".to_string(), json!(status));
    update.insert(
        "updated_at".to_string(),
        json!(chrono::Utc::now().to_rfc3339()),
    );
    if let Some(reason) = decline_reason.map(|s| s.trim()).filter(|s| !s.is_empty()) {
        update.insert("decline_reason".to_string(), json!(reason));
    }

    let resp = state
        .pg
        .from("brand_license_requests")
        .update(serde_json::Value::Object(update).to_string())
        .in_("id", ids)
        .eq("agency_id", agency_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status_resp = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !status_resp.is_success() {
        return Err(sanitize_db_error(status_resp.as_u16(), text));
    }

    Ok(())
}
