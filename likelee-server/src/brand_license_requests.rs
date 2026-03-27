use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tracing::error;

use crate::{auth::AuthUser, config::AppState, errors::sanitize_db_error};

#[derive(Deserialize)]
pub struct CreateBrandLicenseRequest {
    pub creator_id: String,
    pub campaign_title: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub exclusivity: Option<String>,
    pub modifications_allowed: Option<String>,
    pub territory: Option<String>,
    pub usage_scope: Option<String>,
    pub license_fee: Option<f64>,
    pub duration_days: Option<i64>,
    pub start_date: Option<String>,
    pub custom_terms: Option<String>,
}

pub async fn create(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "brand" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

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

    // ── Step 1: Auto-resolve agency_id from the creator's active roster entry ──
    // If the caller supplied an agency_id hint we use it to narrow the lookup;
    // otherwise we just find any active agency for this creator.
    let agency_id_hint: Option<String> = payload
        .get("agency_id")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    let mut roster_query = state
        .pg
        .from("agency_users")
        .select("id,full_legal_name,stage_name,agency_id,created_at")
        .eq("creator_id", &creator_id)
        .eq("role", "talent")
        .eq("status", "active");

    if let Some(ref hint) = agency_id_hint {
        roster_query = roster_query.eq("agency_id", hint);
    }

    // Don't limit yet - let's see all active entries first
    let roster_resp = roster_query
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let roster_status = roster_resp.status();
    let roster_text = roster_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    tracing::info!(
        "Agency roster lookup for creator {}: status={}, response={}",
        creator_id,
        roster_status,
        roster_text
    );

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

    // If multiple active entries, warn and pick the most recent
    if roster_rows.len() > 1 {
        tracing::warn!(
            "Creator {} has {} active agency associations! This should not happen. Picking most recent.",
            creator_id,
            roster_rows.len()
        );
        // Sort by created_at descending to get most recent
        roster_rows.sort_by(|a, b| {
            let a_date = a.get("created_at").and_then(|v| v.as_str()).unwrap_or("");
            let b_date = b.get("created_at").and_then(|v| v.as_str()).unwrap_or("");
            b_date.cmp(a_date)
        });
    }

    let talent_row = &roster_rows[0];

    let agency_id = talent_row
        .get("agency_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    tracing::info!(
        "Selected agency_id {} for creator {} from {} roster entries",
        agency_id,
        creator_id,
        roster_rows.len()
    );
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

    let effective_brand_id =
        crate::face_profiles::resolve_effective_brand_id(&state, &user).await?;

    tracing::info!(
        "Brand license request - user.id: {}, user.role: {}, effective_brand_id: {}, agency_id: {}",
        user.id,
        user.role,
        effective_brand_id,
        agency_id
    );

    // ── Step 2: Verify brand is connected to that agency (or auto-create connection) ──
    // First try brand_agency_connections table
    let connected_resp = state
        .pg
        .from("brand_agency_connections")
        .select("id,status,brand_id,agency_id")
        .eq("brand_id", &effective_brand_id)
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

    tracing::info!(
        "brand_agency_connections query status: {}, response: {}",
        connected_status,
        connected_text
    );

    let connected_rows: Vec<serde_json::Value> = if connected_status.is_success() {
        serde_json::from_str(&connected_text).unwrap_or_default()
    } else if crate::face_profiles::is_missing_relation_error(
        &connected_text,
        "brand_agency_connections",
    ) {
        tracing::info!(
            "brand_agency_connections table not found, checking brand_agency_connection_requests"
        );
        // Fallback: check connection requests table
        let fallback_resp = state
            .pg
            .from("brand_agency_connection_requests")
            .select("id,status,brand_id,agency_id")
            .eq("brand_id", &effective_brand_id)
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
        serde_json::from_str(&fb_text).unwrap_or_default()
    } else {
        return Err(sanitize_db_error(connected_status.as_u16(), connected_text));
    };

    tracing::info!("Found {} connection rows", connected_rows.len());

    // Debug: List all connections for this brand
    if connected_rows.is_empty() {
        let all_conns_resp = state
            .pg
            .from("brand_agency_connections")
            .select("id,brand_id,agency_id,status")
            .eq("brand_id", &effective_brand_id)
            .execute()
            .await;

        if let Ok(resp) = all_conns_resp {
            if let Ok(text) = resp.text().await {
                tracing::info!("All connections for brand {}: {}", effective_brand_id, text);
            }
        }
    }

    // Check if connection exists with any status (active or accepted)
    if !connected_rows.is_empty() {
        let conn_status = connected_rows[0]
            .get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        tracing::info!("Found connection with status: {}", conn_status);

        // Accept both "active" and "accepted" statuses
        if conn_status != "active" && conn_status != "accepted" {
            return Err((
                StatusCode::FORBIDDEN,
                format!("Connection exists but is not active (status: {}). Please ensure the connection is accepted.", conn_status),
            ));
        }
    } else {
        // No connection found - auto-create a connection request
        tracing::info!(
            "No connection found between brand {} and agency {}, auto-creating connection",
            effective_brand_id,
            agency_id
        );

        let connection_payload = json!({
            "brand_id": effective_brand_id,
            "agency_id": agency_id,
            "status": "active",  // Changed from "accepted" to "active" for brand_agency_connections table
            "connected_at": chrono::Utc::now().to_rfc3339(),
            "created_at": chrono::Utc::now().to_rfc3339(),
            "updated_at": chrono::Utc::now().to_rfc3339()
        });

        tracing::info!("Creating connection with payload: {}", connection_payload);

        // Try to create in brand_agency_connections first
        let create_conn_resp = state
            .pg
            .from("brand_agency_connections")
            .auth(state.supabase_service_key.clone()) // Use service key to bypass RLS
            .insert(connection_payload.to_string())
            .execute()
            .await;

        match create_conn_resp {
            Ok(resp) => {
                let status = resp.status();
                let text = resp.text().await.unwrap_or_default();

                if status.is_success() {
                    tracing::info!(
                        "Successfully auto-created brand_agency_connection: {}",
                        text
                    );
                } else if crate::face_profiles::is_missing_relation_error(
                    &text,
                    "brand_agency_connections",
                ) {
                    // Table doesn't exist, try connection_requests table
                    tracing::info!(
                        "brand_agency_connections table missing, trying connection_requests"
                    );
                    let req_payload = json!({
                        "brand_id": effective_brand_id,
                        "agency_id": agency_id,
                        "status": "accepted",
                        "message": "Auto-created via license request",
                        "created_at": chrono::Utc::now().to_rfc3339(),
                        "updated_at": chrono::Utc::now().to_rfc3339()
                    });

                    let req_resp = state
                        .pg
                        .from("brand_agency_connection_requests")
                        .auth(state.supabase_service_key.clone()) // Use service key to bypass RLS
                        .insert(req_payload.to_string())
                        .execute()
                        .await;

                    match req_resp {
                        Ok(r) if r.status().is_success() => {
                            tracing::info!(
                                "Successfully auto-created brand_agency_connection_request"
                            );
                        }
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

    // ── Step 3: Build and insert the request ──
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
        "brand_id": effective_brand_id,
        "agency_id": agency_id,
        "creator_id": creator_id,
        "talent_id": if talent_id.is_empty() { serde_json::Value::Null } else { json!(talent_id) },
        "talent_name": talent_name,
        "campaign_title": campaign_title,
        "description": str_field("description"),
        "category": str_field("category"),
        "exclusivity": str_field("exclusivity"),
        "modifications_allowed": str_field("modifications_allowed"),
        // "custom_terms": str_field("custom_terms"),  // Temporarily disabled until migration is applied
        "territory": territory,
        "usage_scope": usage_scope,
        "license_fee": payload.get("license_fee").and_then(|v| v.as_f64()),
        "duration_days": duration_days,
        "license_start_date": start_naive.to_string(),
        "license_end_date": end_naive.to_string(),
        "status": "pending",
    });

    tracing::info!(
        "Creating brand license request with payload: {}",
        insert_payload
    );

    let create_resp = state
        .pg
        .from("brand_license_requests")
        .auth(state.supabase_service_key.clone()) // Use service key to bypass RLS
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

    Ok(Json(json!({
        "status": "ok",
        "id": created.get("id").cloned().unwrap_or(serde_json::Value::Null),
    })))
}

#[derive(Deserialize)]
pub struct UpdateBrandLicenseRequestStatus {
    pub brand_request_ids: Vec<String>,
    pub status: String,
    pub decline_reason: Option<String>,
}

#[derive(Serialize)]
pub struct BrandLicenseRequestListResponse {
    pub requests: Vec<serde_json::Value>,
}

pub async fn list_for_brand(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<BrandLicenseRequestListResponse>, (StatusCode, String)> {
    if user.role != "brand" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    let resp = state
        .pg
        .from("brand_license_requests")
        .select("id,brand_id,agency_id,creator_id,talent_id,talent_name,campaign_title,description,category,exclusivity,modifications_allowed,territory,usage_scope,license_fee,duration_days,license_start_date,license_end_date,status,decline_reason,submission_id,notes,created_at,agencies(agency_name,logo_url),license_submissions!license_submissions_brand_request_id_fkey(id,docuseal_slug,client_submitter_slug,status)")
        .eq("brand_id", &user.id)
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

    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).map_err(|e| {
        error!(error = %e, "brand_license_requests JSON parse error");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("JSON parse error: {}", e),
        )
    })?;

    Ok(Json(BrandLicenseRequestListResponse { requests: rows }))
}

pub async fn list_for_agency(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<BrandLicenseRequestListResponse>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    tracing::info!("Fetching brand license requests for agency_id: {}", user.id);

    // First, let's check if ANY brand license requests exist at all
    let all_requests_resp = state
        .pg
        .from("brand_license_requests")
        .auth(state.supabase_service_key.clone())
        .select("id,agency_id,brand_id,creator_id,campaign_title,status,created_at")
        .order("created_at.desc")
        .limit(10)
        .execute()
        .await;

    if let Ok(resp) = all_requests_resp {
        if let Ok(text) = resp.text().await {
            tracing::info!("ALL brand license requests in database (last 10): {}", text);
            tracing::info!("Current agency user ID: {}", user.id);
        }
    }

    let resp = state
        .pg
        .from("brand_license_requests")
        .auth(state.supabase_service_key.clone())  // Use service key to bypass RLS for debugging
        .select("id,brand_id,agency_id,creator_id,talent_id,talent_name,campaign_title,description,category,exclusivity,modifications_allowed,territory,usage_scope,license_fee,duration_days,license_start_date,license_end_date,status,decline_reason,submission_id,notes,created_at,brands(company_name,email),creators(full_name,email,profile_photo_url)")
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

    tracing::info!("Found {} brand license requests for agency", rows.len());

    Ok(Json(BrandLicenseRequestListResponse { requests: rows }))
}

pub async fn update_status_for_agency(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<UpdateBrandLicenseRequestStatus>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }
    if payload.brand_request_ids.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "No brand_request_ids".to_string()));
    }

    let ids: Vec<&str> = payload
        .brand_request_ids
        .iter()
        .map(|s| s.as_str())
        .collect();
    let mut update = serde_json::Map::new();
    update.insert("status".to_string(), json!(payload.status));
    update.insert(
        "updated_at".to_string(),
        json!(chrono::Utc::now().to_rfc3339()),
    );
    if let Some(reason) = payload
        .decline_reason
        .as_ref()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
    {
        update.insert("decline_reason".to_string(), json!(reason));
    }

    let resp = state
        .pg
        .from("brand_license_requests")
        .update(serde_json::Value::Object(update).to_string())
        .in_("id", ids)
        .eq("agency_id", &user.id)
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

    Ok(Json(json!({"status":"ok"})))
}
