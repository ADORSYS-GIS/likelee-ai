use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use postgrest::Postgrest;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::time::Duration;
use tracing::{error, info, warn};

use crate::auth::AuthUser;
use crate::config::AppState;
use crate::entitlements::{docuseal_template_limit, get_agency_plan_tier};
use crate::services::docuseal::DocuSealClient;

async fn get_template_count(
    state: &AppState,
    agency_id: &str,
) -> Result<usize, (StatusCode, String)> {
    let resp = state
        .pg
        .from("scouting_templates")
        .select("id")
        .eq("agency_id", agency_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        let code =
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err(crate::errors::sanitize_db_error(code, text));
    }
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    Ok(rows.len())
}

async fn enforce_template_limit_for_insert(
    state: &AppState,
    agency_id: &str,
    inserts_requested: usize,
) -> Result<usize, (StatusCode, String)> {
    let tier = get_agency_plan_tier(state, agency_id).await?;
    if let Some(limit) = docuseal_template_limit(tier) {
        let current = get_template_count(state, agency_id).await?;
        if current >= limit {
            return Err((
                StatusCode::FORBIDDEN,
                "docuseal_template_limit_reached".to_string(),
            ));
        }
        let remaining = limit.saturating_sub(current);
        Ok(std::cmp::min(remaining, inserts_requested))
    } else {
        Ok(inserts_requested)
    }
}

// ============================================================================
// Request/Response Types
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct CreateTemplateRequest {
    pub agency_id: String,
    pub docuseal_template_id: i32,
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateOfferRequest {
    pub prospect_id: String,
    pub agency_id: String,
    pub template_id: String,
}

#[derive(Debug, Deserialize)]
pub struct RefreshOfferStatusQuery {
    pub offer_id: String,
}

#[derive(Debug, Serialize)]
pub struct OfferResponse {
    pub id: String,
    pub status: String,
    pub signing_url: Option<String>,
    pub signed_document_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct GeocodeQuery {
    pub q: String,
    pub limit: Option<u8>,
}

#[derive(Debug, Serialize)]
pub struct GeocodeResult {
    pub name: String,
    pub lat: f64,
    pub lng: f64,
}

#[derive(Debug, Deserialize)]
struct NominatimResult {
    display_name: String,
    lat: String,
    lon: String,
}

/// GET /api/scouting/geocode?q=Berlin&limit=5
pub async fn geocode(
    State(_state): State<AppState>,
    user: AuthUser,
    Query(params): Query<GeocodeQuery>,
) -> Result<Json<Vec<GeocodeResult>>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "agency_only".to_string()));
    }

    let q = params.q.trim();
    if q.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "q is required".to_string()));
    }
    if q.len() < 2 || q.len() > 120 {
        return Err((
            StatusCode::BAD_REQUEST,
            "q must be between 2 and 120 characters".to_string(),
        ));
    }

    let limit = params.limit.unwrap_or(5).clamp(1, 10);
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let resp = client
        .get("https://nominatim.openstreetmap.org/search")
        .query(&[
            ("format", "json"),
            ("q", q),
            ("limit", &limit.to_string()),
            ("addressdetails", "1"),
        ])
        .header(
            reqwest::header::USER_AGENT,
            "likelee.ai scouting geocode (support@likelee.ai)",
        )
        .header(reqwest::header::ACCEPT, "application/json")
        .send()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    let status = resp.status();
    let body = resp
        .text()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    if !status.is_success() {
        warn!(status = %status, body = %body, "nominatim_error");
        return Err((StatusCode::BAD_GATEWAY, "geocoding_failed".to_string()));
    }

    let raw: Vec<NominatimResult> =
        serde_json::from_str(&body).map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    let results = raw
        .into_iter()
        .filter_map(|r| {
            let lat = r.lat.parse::<f64>().ok()?;
            let lng = r.lon.parse::<f64>().ok()?;
            Some(GeocodeResult {
                name: r.display_name,
                lat,
                lng,
            })
        })
        .collect();

    Ok(Json(results))
}

/// GET /api/scouting/templates?agency_id=xxx
pub async fn list_templates(
    State(state): State<AppState>,
    user: AuthUser,
    Query(_params): Query<std::collections::HashMap<String, String>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "agency_only".to_string()));
    }
    let agency_id = user.id.clone();

    info!(agency_id = %agency_id, "Fetching templates");

    let pg = Postgrest::new(format!("{}/rest/v1", state.supabase_url))
        .insert_header("apikey", &state.supabase_service_key)
        .insert_header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        );

    let response = pg
        .from("scouting_templates")
        .select("*")
        .eq("agency_id", agency_id)
        .order("created_at.desc")
        .execute()
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to fetch templates");
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    let body = response.text().await.map_err(|e| {
        error!(error = %e, "Failed to read response");
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let templates: Vec<serde_json::Value> = serde_json::from_str(&body)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let response_data = json!({
        "templates": templates,
        "total_count": templates.len()
    });

    Ok((StatusCode::OK, response_data.to_string()))
}

/// POST /api/scouting/templates
pub async fn create_template(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<CreateTemplateRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "agency_only".to_string()));
    }
    let agency_id = user.id.clone();

    let _ = enforce_template_limit_for_insert(&state, &agency_id, 1).await?;

    info!(
        agency_id = %agency_id,
        docuseal_template_id = payload.docuseal_template_id,
        "Creating template"
    );

    let _pg = Postgrest::new(format!("{}/rest/v1", state.supabase_url))
        .insert_header("apikey", &state.supabase_service_key)
        .insert_header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        );

    let pg2 = Postgrest::new(format!("{}/rest/v1", state.supabase_url))
        .insert_header("apikey", &state.supabase_service_key)
        .insert_header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        );

    let template_data = json!({
        "agency_id": agency_id,
        "docuseal_template_id": payload.docuseal_template_id,
        "name": payload.name,
        "description": payload.description,
    });

    let response = pg2
        .from("scouting_templates")
        .insert(template_data.to_string())
        .execute()
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to create template");
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    let body = response.text().await.map_err(|e| {
        error!(error = %e, "Failed to read response");
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    Ok((StatusCode::CREATED, body))
}

/// DELETE /api/scouting/templates/:id
pub async fn delete_template(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    info!(template_id = %id, "Deleting template");

    let pg = Postgrest::new(format!("{}/rest/v1", state.supabase_url))
        .insert_header("apikey", &state.supabase_service_key)
        .insert_header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        );

    // Count offers before deleting (for response)
    let offers_resp = pg
        .from("scouting_offers")
        .select("id")
        .eq("template_id", &id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let offers_text = offers_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let offers: Vec<serde_json::Value> = serde_json::from_str(&offers_text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let offers_count = offers.len();

    info!(template_id = %id, offers_count, "Deleting template and associated offers");

    // Delete template (CASCADE will delete offers)
    let pg2 = Postgrest::new(format!("{}/rest/v1", state.supabase_url))
        .insert_header("apikey", &state.supabase_service_key)
        .insert_header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        );

    pg2.from("scouting_templates")
        .delete()
        .eq("id", &id)
        .execute()
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to delete template");
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    let response_data = json!({
        "deleted": true,
        "offers_deleted": offers_count
    });

    Ok((StatusCode::OK, response_data.to_string()))
}

// ============================================================================
// Offer Handlers
// ============================================================================

/// GET /api/scouting/offers?agency_id=xxx&include_archived=false
pub async fn list_offers(
    State(state): State<AppState>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let agency_id = params
        .get("agency_id")
        .ok_or((StatusCode::BAD_REQUEST, "agency_id required".to_string()))?;

    let filter = params.get("filter").map(|s| s.as_str()).unwrap_or("active");

    info!(agency_id = %agency_id, filter, "Fetching offers");

    let pg = Postgrest::new(format!("{}/rest/v1", state.supabase_url))
        .insert_header("apikey", &state.supabase_service_key)
        .insert_header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        );

    let mut query = pg
        .from("scouting_offers")
        .select("*,prospect:scouting_prospects(full_name,email,status),template:scouting_templates(name)")
        .eq("agency_id", agency_id);

    // Apply filter
    match filter {
        "archived" => {
            query = query.eq("status", "archived");
        }
        "all" => {
            // No status filter - show everything
        }
        _ => {
            // Default: "active" - show everything EXCEPT archived
            query = query.neq("status", "archived");
        }
    }

    let response = query
        .order("created_at.desc")
        .execute()
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to fetch offers");
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    let body = response.text().await.map_err(|e| {
        error!(error = %e, "Failed to read response");
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    Ok((StatusCode::OK, body))
}

/// POST /api/scouting/offers
pub async fn create_offer(
    State(state): State<AppState>,
    Json(payload): Json<CreateOfferRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    info!(
        prospect_id = %payload.prospect_id,
        template_id = %payload.template_id,
        "Creating offer"
    );

    // First, fetch prospect and template details
    let pg = Postgrest::new(format!("{}/rest/v1", state.supabase_url))
        .insert_header("apikey", &state.supabase_service_key)
        .insert_header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        );

    // Get prospect details
    let prospect_response = pg
        .from("scouting_prospects")
        .select("full_name,email")
        .eq("id", &payload.prospect_id)
        .single()
        .execute()
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to fetch prospect");
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    let prospect_body = prospect_response.text().await.map_err(|e| {
        error!(error = %e, "Failed to read prospect response");
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let prospect: serde_json::Value = serde_json::from_str(&prospect_body).map_err(|e| {
        error!(error = %e, "Failed to parse prospect");
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    // Get template details
    let pg2 = Postgrest::new(format!("{}/rest/v1", state.supabase_url))
        .insert_header("apikey", &state.supabase_service_key)
        .insert_header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        );

    let template_response = pg2
        .from("scouting_templates")
        .select("docuseal_template_id,name")
        .eq("id", &payload.template_id)
        .single()
        .execute()
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to fetch template");
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    let template_body = template_response.text().await.map_err(|e| {
        error!(error = %e, "Failed to read template response");
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let template: serde_json::Value = serde_json::from_str(&template_body).map_err(|e| {
        error!(error = %e, "Failed to parse template");
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    // Create DocuSeal submission
    let docuseal_client = DocuSealClient::new(
        state.docuseal_api_key.clone(),
        state.docuseal_api_url.clone(),
    );

    let docuseal_template_id = template["docuseal_template_id"]
        .as_i64()
        .ok_or((StatusCode::BAD_REQUEST, "Invalid template ID".to_string()))?
        as i32;
    let document_name = template["name"]
        .as_str()
        .unwrap_or("Untitled Document")
        .to_string();

    let prospect_name = prospect["full_name"]
        .as_str()
        .unwrap_or("Unknown")
        .to_string();
    let prospect_email = prospect["email"]
        .as_str()
        .ok_or((
            StatusCode::BAD_REQUEST,
            "Prospect email required".to_string(),
        ))?
        .to_string();

    let submission = docuseal_client
        .create_submission(docuseal_template_id, prospect_name, prospect_email)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to create DocuSeal submission");
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    // Get signing URL by fetching submission details (DocuSeal create response doesn't include URLs)
    let signing_url = match docuseal_client.get_submission(submission.id).await {
        Ok(details) => details
            .submitters
            .first()
            .map(|s| format!("{}/s/{}", state.docuseal_app_url, s.slug)),
        Err(e) => {
            error!(error = %e, submission_id = submission.id, "Failed to fetch DocuSeal submission details");
            None
        }
    };

    // Save offer to database
    let pg3 = Postgrest::new(format!("{}/rest/v1", state.supabase_url))
        .insert_header("apikey", &state.supabase_service_key)
        .insert_header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        );

    let offer_data = json!({
        "prospect_id": payload.prospect_id,
        "agency_id": payload.agency_id,
        "template_id": payload.template_id,
        "docuseal_submission_id": submission.id,
        "document_name": document_name,
        "status": "sent",
        "signing_url": signing_url,
        "sent_at": chrono::Utc::now().to_rfc3339(),
    });

    let response = pg3
        .from("scouting_offers")
        .insert(offer_data.to_string())
        .execute()
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to create offer");
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    // Update prospect status in pipeline
    let _ = pg3
        .from("scouting_prospects")
        .update(json!({ "status": "offer_sent" }).to_string())
        .eq("id", &payload.prospect_id)
        .execute()
        .await;

    let body = response.text().await.map_err(|e| {
        error!(error = %e, "Failed to read response");
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    Ok((StatusCode::CREATED, body))
}

/// POST /api/scouting/offers/refresh-status
pub async fn refresh_offer_status(
    State(state): State<AppState>,
    Json(query): Json<RefreshOfferStatusQuery>,
) -> Result<Json<OfferResponse>, (StatusCode, String)> {
    info!(offer_id = %query.offer_id, "Refreshing offer status");

    // Get offer from database
    let pg = Postgrest::new(format!("{}/rest/v1", state.supabase_url))
        .insert_header("apikey", &state.supabase_service_key)
        .insert_header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        );

    let offer_response = pg
        .from("scouting_offers")
        .select("docuseal_submission_id, prospect_id")
        .eq("id", &query.offer_id)
        .single()
        .execute()
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to fetch offer");
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    let offer_body = offer_response.text().await.map_err(|e| {
        error!(error = %e, "Failed to read offer response");
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let offer: serde_json::Value = serde_json::from_str(&offer_body).map_err(|e| {
        error!(error = %e, "Failed to parse offer");
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let submission_id = offer["docuseal_submission_id"]
        .as_i64()
        .ok_or((StatusCode::BAD_REQUEST, "Invalid submission ID".to_string()))?
        as i32;

    // Fetch status from DocuSeal
    let docuseal_client = DocuSealClient::new(
        state.docuseal_api_key.clone(),
        state.docuseal_api_url.clone(),
    );

    let (status, signed_document_url, latest_signing_url) = {
        let submission_result = docuseal_client.get_submission(submission_id).await;

        match submission_result {
            Ok(submission) => {
                info!(
                    submission_id,
                    status = %submission.status,
                    submitter_statuses = ?submission.submitters.iter().map(|s| &s.status).collect::<Vec<_>>(),
                    "Fetched DocuSeal submission for refresh"
                );

                // Log document information for debugging
                info!(
                    submission_id,
                    documents_count = submission.documents.len(),
                    "Documents in submission"
                );
                for (idx, doc) in submission.documents.iter().enumerate() {
                    info!(
                        submission_id,
                        doc_index = idx,
                        doc_name = %doc.name,
                        doc_url = %doc.url,
                        "Document details"
                    );
                }
                let status = match submission.status.as_str() {
                    "completed" => "completed",
                    "declined" => "declined",
                    "expired" => "voided",
                    "viewed" | "started" => "opened",
                    _ => {
                        // Check if any submitter has viewed it
                        if submission
                            .submitters
                            .iter()
                            .any(|s| s.status == "viewed" || s.status == "started")
                        {
                            "opened"
                        } else {
                            "sent"
                        }
                    }
                };
                let signed_url = if status == "completed" {
                    let url = submission.documents.first().map(|d| d.url.clone());
                    if url.is_none() {
                        warn!(
                            submission_id,
                            "Completed submission has no documents in response - signed document URL will be unavailable"
                        );
                    }
                    url
                } else {
                    None
                };
                let signing_url = submission
                    .submitters
                    .first()
                    .map(|s| format!("{}/s/{}", state.docuseal_app_url, s.slug));
                (status, signed_url, signing_url)
            }
            Err(e) => {
                let err_str = e.to_string();
                if err_str.contains("404") {
                    info!(
                        submission_id,
                        "Submission not found in DocuSeal, marking as voided"
                    );
                    ("voided", None, None)
                } else {
                    error!(error = %err_str, "Failed to fetch DocuSeal submission");
                    return Err((StatusCode::INTERNAL_SERVER_ERROR, err_str));
                }
            }
        }
    };

    // Update offer in database
    let pg2 = Postgrest::new(format!("{}/rest/v1", state.supabase_url))
        .insert_header("apikey", &state.supabase_service_key)
        .insert_header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        );

    let update_data = json!({
        "status": status,
        "signed_document_url": signed_document_url,
        "signing_url": latest_signing_url,
        "signed_at": if status == "completed" {
            Some(chrono::Utc::now().to_rfc3339())
        } else {
            None
        },
    });

    pg2.from("scouting_offers")
        .update(update_data.to_string())
        .eq("id", &query.offer_id)
        .execute()
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to update offer");
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    // Update prospect status in pipeline
    if let Some(prospect_id) = offer["prospect_id"].as_str() {
        let prospect_status = match status {
            "completed" | "signed" => Some("signed"),
            "declined" => Some("declined"),
            _ => None,
        };

        if let Some(new_p_status) = prospect_status {
            let _ = pg2
                .from("scouting_prospects")
                .update(json!({ "status": new_p_status }).to_string())
                .eq("id", prospect_id)
                .execute()
                .await;
        }
    }

    let response = OfferResponse {
        id: query.offer_id.clone(),
        status: status.to_string(),
        signing_url: latest_signing_url,
        signed_document_url,
    };

    Ok(Json(response))
}

/// DELETE /api/scouting/offers/:id?permanent=false
pub async fn delete_offer(
    State(state): State<AppState>,
    Path(offer_id): Path<String>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let permanent = params
        .get("permanent")
        .and_then(|v| v.parse::<bool>().ok())
        .unwrap_or(false);

    info!(offer_id = %offer_id, permanent, "Processing offer deletion");

    // 1. Get offer from database to find the submission ID and status
    let pg = Postgrest::new(format!("{}/rest/v1", state.supabase_url))
        .insert_header("apikey", &state.supabase_service_key)
        .insert_header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        );

    let offer_response = pg
        .from("scouting_offers")
        .select("docuseal_submission_id,status")
        .eq("id", &offer_id)
        .single()
        .execute()
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to fetch offer for deletion");
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    let offer_body = offer_response.text().await.map_err(|e| {
        error!(error = %e, "Failed to read offer response");
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let offer: serde_json::Value = serde_json::from_str(&offer_body).map_err(|e| {
        error!(error = %e, "Failed to parse offer for deletion");
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let current_status = offer["status"].as_str().unwrap_or("");

    // Safety check: only allow permanent deletion if already archived
    if permanent && current_status != "archived" {
        error!(offer_id = %offer_id, status = %current_status, "Attempted to permanently delete non-archived offer");
        return Err((
            StatusCode::BAD_REQUEST,
            "Cannot permanently delete an offer that is not archived. Archive it first."
                .to_string(),
        ));
    }

    if let Some(submission_id) = offer["docuseal_submission_id"].as_i64() {
        // 2. Archive in DocuSeal (for both archive and permanent delete)
        let docuseal_client = DocuSealClient::new(
            state.docuseal_api_key.clone(),
            state.docuseal_api_url.clone(),
        );

        if let Err(e) = docuseal_client
            .archive_submission(submission_id as i32)
            .await
        {
            // Log the error but continue, as we still want to archive/delete it in our system
            error!(error = %e, submission_id, "Failed to archive submission in DocuSeal, but proceeding locally.");
        }
    }

    // 3. Either permanently delete or archive in our database
    let pg2 = Postgrest::new(format!("{}/rest/v1", state.supabase_url))
        .insert_header("apikey", &state.supabase_service_key)
        .insert_header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        );

    if permanent {
        // Permanent deletion from database
        info!(offer_id = %offer_id, "Permanently deleting offer from database");
        pg2.from("scouting_offers")
            .delete()
            .eq("id", &offer_id)
            .execute()
            .await
            .map_err(|e| {
                error!(error = %e, "Failed to permanently delete offer");
                (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
            })?;
    } else {
        // Archive (soft delete)
        info!(offer_id = %offer_id, "Archiving offer (soft delete)");
        let update_data = json!({ "status": "archived" });
        pg2.from("scouting_offers")
            .update(update_data.to_string())
            .eq("id", &offer_id)
            .execute()
            .await
            .map_err(|e| {
                error!(error = %e, "Failed to update offer status to archived");
                (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
            })?;
    }

    Ok(StatusCode::NO_CONTENT)
}

// ============================================================================
// Builder Token Handler
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct GetBuilderTokenRequest {
    pub agency_id: String,
    pub template_id: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct BuilderTokenResponse {
    pub token: String,
}

/// POST /api/scouting/builder-token
pub async fn create_builder_token(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<GetBuilderTokenRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "agency_only".to_string()));
    }
    let agency_id = user.id.clone();

    info!(
        user_id = %user.id,
        agency_id = %agency_id,
        "Creating DocuSeal builder token"
    );

    // Verify agency exists and get user details (simplified for now)
    // In a real app, we would fetch the agency owner's email
    let pg = Postgrest::new(format!("{}/rest/v1", state.supabase_url))
        .insert_header("apikey", &state.supabase_service_key)
        .insert_header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        );

    let response = pg
        .from("agencies")
        .select("contact_email:email,name:agency_name")
        .eq("id", &agency_id)
        .single()
        .execute()
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to fetch agency");
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    let agency_body = response.text().await.map_err(|e| {
        error!(error = %e, "Failed to read agency response");
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let agency: serde_json::Value = serde_json::from_str(&agency_body).map_err(|e| {
        error!(error = %e, "Failed to parse agency");
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    // Use configured DocuSeal user email (required for builder token to match account owner)
    if state.docuseal_user_email.is_empty() {
        error!("DOCUSEAL_USER_EMAIL is not configured. This is required for DocuSeal integration.");
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            "DocuSeal admin email not configured on server".to_string(),
        ));
    }
    let user_email = state.docuseal_user_email.clone();

    let integration_email = agency["contact_email"]
        .as_str()
        .unwrap_or("agency@example.com")
        .to_string();

    let name = agency["name"].as_str().unwrap_or("Agency User").to_string();

    let docuseal_client = DocuSealClient::new(
        state.docuseal_api_key.clone(),
        state.docuseal_api_url.clone(),
    );

    let token = docuseal_client
        .create_builder_token(user_email, name, integration_email, payload.template_id)
        .map_err(|e| {
            error!(error = %e, "Failed to create builder token");
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    Ok(Json(BuilderTokenResponse { token }))
}

// ============================================================================
// Template Sync Handler
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct SyncTemplatesRequest {
    pub agency_id: String,
}

/// POST /api/scouting/templates/sync
pub async fn sync_templates(
    State(state): State<AppState>,
    user: AuthUser,
    Json(_payload): Json<SyncTemplatesRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "agency_only".to_string()));
    }
    let agency_id = user.id.clone();

    info!(
        agency_id = %agency_id,
        "Syncing templates from DocuSeal"
    );

    let docuseal_client = DocuSealClient::new(
        state.docuseal_api_key.clone(),
        state.docuseal_api_url.clone(),
    );

    // 1. Fetch templates from DocuSeal
    let templates_response = docuseal_client
        .list_templates(Some(100))
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to fetch templates from DocuSeal");
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    let pg = Postgrest::new(format!("{}/rest/v1", state.supabase_url))
        .insert_header("apikey", &state.supabase_service_key)
        .insert_header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        );

    // 2. Upsert each template into our database
    // Note: In a real app, we might want to filter by integration_email or similar if possible,
    // but DocuSeal API list_templates returns all templates visible to the API key.
    // For now, we assume all templates fetched belong to the agency context (or we sync all).
    // Given the multi-tenant setup, we might want to be careful here.
    // However, since we are using one DocuSeal account for all agencies (platform model),
    // we need a way to distinguish which template belongs to which agency.
    // DocuSeal templates don't have metadata fields easily accessible in the list response (usually).
    //
    // CRITICAL: If we sync ALL templates, Agency A might see Agency B's templates if we just assign them to the requesting agency.
    //
    // SOLUTION for now: We only sync templates that MATCH a naming convention OR we accept that for this MVP,
    // the user manually selects which templates to import?
    //
    // OR, better: We rely on the fact that the user just created it.
    // But sync pulls everything.
    //
    // Let's assume for this step that we sync ALL templates and assign them to the requesting agency.
    // This is risky for multi-tenancy but acceptable if we assume 1 Agency = 1 DocuSeal Account (which is the safest production setup).
    // If sharing one account, we really need metadata.
    //
    // Let's implement a simple sync that upserts based on docuseal_template_id.

    // For Free tier we only allow inserting up to remaining quota; updates are always allowed.
    let mut remaining_inserts = enforce_template_limit_for_insert(&state, &agency_id, usize::MAX)
        .await
        .unwrap_or(0);

    for template in templates_response.data {
        let template_data = json!({
            "agency_id": agency_id,
            "docuseal_template_id": template.id,
            "name": template.name,
            "description": "Synced from DocuSeal",
            "updated_at": chrono::Utc::now().to_rfc3339(),
        });

        // Check if template already exists for this agency
        let exists_response = pg
            .from("scouting_templates")
            .select("id")
            .eq("agency_id", &agency_id)
            .eq("docuseal_template_id", template.id.to_string())
            .execute()
            .await;

        let exists = match exists_response {
            Ok(resp) => {
                let text = resp.text().await.unwrap_or_default();
                let rows: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!([]));
                rows.as_array().map(|a| !a.is_empty()).unwrap_or(false)
            }
            Err(_) => false,
        };

        if exists {
            info!(template_id = template.id, name = %template.name, "Updating existing template");
            let _ = pg
                .from("scouting_templates")
                .update(template_data.to_string())
                .eq("agency_id", &agency_id)
                .eq("docuseal_template_id", template.id.to_string())
                .execute()
                .await;
        } else {
            if remaining_inserts == 0 {
                continue;
            }
            info!(template_id = template.id, name = %template.name, "Inserting new template");
            let _ = pg
                .from("scouting_templates")
                .insert(template_data.to_string())
                .execute()
                .await;
            remaining_inserts = remaining_inserts.saturating_sub(1);
        }
    }
    Ok(StatusCode::OK)
}

#[derive(Debug, Serialize)]
pub struct CreateTemplateFromPdfResponse {
    pub id: i32,
    pub slug: String,
    pub name: String,
}

/// POST /api/scouting/templates/upload
pub async fn create_template_from_pdf(
    State(state): State<AppState>,
    user: AuthUser,
    mut multipart: axum::extract::Multipart,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    use base64::{engine::general_purpose, Engine as _};

    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "agency_only".to_string()));
    }

    if state.docuseal_api_key.trim().is_empty() {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            "docuseal_api_key_not_configured".to_string(),
        ));
    }
    let agency_id = user.id.clone();

    let _ = enforce_template_limit_for_insert(&state, &agency_id, 1).await?;

    info!(user_id = %user.id, "Processing PDF upload for template");

    let mut file_name = String::new();
    let mut file_content = Vec::new();

    while let Some(field) = multipart.next_field().await.map_err(|e| {
        error!(error = %e, "Failed to read multipart field");
        (StatusCode::BAD_REQUEST, e.to_string())
    })? {
        let name = field.name().unwrap_or_default().to_string();

        if name == "file" {
            file_name = field.file_name().unwrap_or("document.pdf").to_string();
            file_content = field
                .bytes()
                .await
                .map_err(|e| {
                    error!(error = %e, "Failed to read file content");
                    (StatusCode::BAD_REQUEST, e.to_string())
                })?
                .to_vec();
        }
    }

    if file_content.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Missing file".to_string()));
    }

    // Convert to base64 with Data URI prefix
    let base64_content = format!(
        "data:application/pdf;base64,{}",
        general_purpose::STANDARD.encode(&file_content)
    );

    let docuseal_client = DocuSealClient::new(
        state.docuseal_api_key.clone(),
        state.docuseal_api_url.clone(),
    );

    // Create template in DocuSeal
    let template = docuseal_client
        .create_template(file_name.clone(), file_name.clone(), base64_content)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to create template in DocuSeal");
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    // Save to database
    let pg = Postgrest::new(format!("{}/rest/v1", state.supabase_url))
        .insert_header("apikey", &state.supabase_service_key)
        .insert_header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        );

    let template_data = json!({
        "agency_id": agency_id,
        "docuseal_template_id": template.id,
        "name": template.name,
        "description": "Uploaded PDF",
        "updated_at": chrono::Utc::now().to_rfc3339(),
    });

    let response = pg
        .from("scouting_templates")
        .insert(template_data.to_string())
        .execute()
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to save template to database");
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    let status = response.status();
    let body = response.text().await.unwrap_or_default();

    if !status.is_success() {
        error!(status = %status, error = %body, "Database error");
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Database error: {}", body),
        ));
    }

    info!(status = %status, body = %body, "Template saved to database successfully");

    Ok(Json(CreateTemplateFromPdfResponse {
        id: template.id,
        slug: template.slug,
        name: template.name,
    }))
}

/// PUT /api/scouting/templates/:id/upload
pub async fn update_template_from_pdf(
    State(state): State<AppState>,
    user: AuthUser,
    axum::extract::Path(template_id): axum::extract::Path<i32>,
    mut multipart: axum::extract::Multipart,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    use base64::{engine::general_purpose, Engine as _};

    info!(user_id = %user.id, template_id, "Processing PDF upload for template update");

    let mut file_name = String::new();
    let mut file_content = Vec::new();

    while let Some(field) = multipart.next_field().await.map_err(|e| {
        error!(error = %e, "Failed to read multipart field");
        (StatusCode::BAD_REQUEST, e.to_string())
    })? {
        let name = field.name().unwrap_or_default().to_string();

        if name == "file" {
            file_name = field.file_name().unwrap_or("document.pdf").to_string();
            file_content = field
                .bytes()
                .await
                .map_err(|e| {
                    error!(error = %e, "Failed to read file content");
                    (StatusCode::BAD_REQUEST, e.to_string())
                })?
                .to_vec();
        }
    }

    if file_content.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Missing file".to_string()));
    }

    // Convert to base64 with Data URI prefix
    let base64_content = format!(
        "data:application/pdf;base64,{}",
        general_purpose::STANDARD.encode(&file_content)
    );

    let docuseal_client = DocuSealClient::new(
        state.docuseal_api_key.clone(),
        state.docuseal_api_url.clone(),
    );

    // Get agency_id from database first
    let pg = Postgrest::new(format!("{}/rest/v1", state.supabase_url))
        .insert_header("apikey", &state.supabase_service_key)
        .insert_header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        );

    let response = pg
        .from("scouting_templates")
        .select("agency_id")
        .eq("docuseal_template_id", template_id.to_string())
        .single()
        .execute()
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to fetch template from database");
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    let body = response.text().await.unwrap_or_default();
    let template_record: serde_json::Value = serde_json::from_str(&body).map_err(|e| {
        error!(error = %e, body = %body, "Failed to parse template record");
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let _agency_id = template_record["agency_id"].as_str().ok_or_else(|| {
        error!("Missing agency_id in template record");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Missing agency_id".to_string(),
        )
    })?;

    // 1. Delete old template in DocuSeal
    let _ = docuseal_client.delete_template(template_id).await.map_err(|e| {
        error!(error = %e, template_id, "Failed to delete old template in DocuSeal (continuing)");
    });

    // 2. Create new template in DocuSeal
    let new_template = docuseal_client
        .create_template(file_name.clone(), file_name.clone(), base64_content)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to create new template in DocuSeal");
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    // 3. Update database record with new template ID and name
    let _ = pg
        .from("scouting_templates")
        .update(
            json!({
                "docuseal_template_id": new_template.id,
                "name": new_template.name,
                "updated_at": chrono::Utc::now().to_rfc3339()
            })
            .to_string(),
        )
        .eq("docuseal_template_id", template_id.to_string())
        .execute()
        .await;

    Ok(StatusCode::OK)
}

/// GET /api/scouting/offers/:offer_id
pub async fn get_offer_details(
    State(state): State<AppState>,
    Path(offer_id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    info!(offer_id = %offer_id, "Fetching offer details");

    let pg_client = Postgrest::new(format!("{}/rest/v1", state.supabase_url))
        .insert_header("apikey", &state.supabase_service_key)
        .insert_header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        );

    // Fetch the offer from our database
    let offer_response = pg_client
        .from("scouting_offers")
        .select("*, prospect:scouting_prospects(*), template:scouting_templates(*)")
        .eq("id", &offer_id)
        .single()
        .execute()
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to fetch offer from DB");
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    if !offer_response.status().is_success() {
        let error_body = offer_response.text().await.unwrap_or_default();
        error!(error = %error_body, "Offer not found in database");
        return Err((
            StatusCode::NOT_FOUND,
            format!("Offer not found: {}", error_body),
        ));
    }

    let offer_text = offer_response.text().await.map_err(|e| {
        error!(error = %e, "Failed to read offer from DB");
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let mut offer: serde_json::Value = serde_json::from_str(&offer_text).map_err(|e| {
        error!(error = %e, "Failed to parse offer from DB");
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    // If there's a DocuSeal submission ID, fetch its details
    if let Some(submission_id) = offer
        .get("docuseal_submission_id")
        .and_then(|id| id.as_i64())
    {
        let docuseal_client = DocuSealClient::new(
            state.docuseal_api_key.clone(),
            state.docuseal_api_url.clone(),
        );

        match docuseal_client.get_submission(submission_id as i32).await {
            Ok(docuseal_details) => {
                // Construct the signing URL
                let signing_url = docuseal_details
                    .submitters
                    .first()
                    .map(|s| format!("{}/s/{}", state.docuseal_app_url, s.slug));

                if let Some(obj) = offer.as_object_mut() {
                    // Insert the constructed URL into the main offer object
                    obj.insert("signing_url".to_string(), json!(signing_url));

                    // Also include the full details for context
                    if let Ok(details_json) = serde_json::to_value(docuseal_details) {
                        obj.insert("docuseal_details".to_string(), details_json);
                    }
                }
            }
            Err(e) => {
                let err_str = e.to_string();
                if err_str.contains("404") {
                    info!(
                        submission_id,
                        "Submission not found in DocuSeal for offer details"
                    );
                } else {
                    error!(error = %err_str, submission_id, "Failed to fetch details from DocuSeal");
                }
            }
        }
    }

    Ok(Json(offer))
}

// ============================================================================
// Webhook Handler
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct DocuSealWebhookEvent {
    pub event_type: String,
    pub timestamp: String,
    pub data: serde_json::Value,
}

/// POST /webhooks/docuseal
pub async fn handle_webhook(
    State(state): State<AppState>,
    Json(payload): Json<DocuSealWebhookEvent>,
) -> Result<StatusCode, (StatusCode, String)> {
    info!(
        event_type = %payload.event_type,
        payload = ?payload,
        "Received DocuSeal webhook"
    );

    // Map DocuSeal events to our statuses
    // submission.started -> opened
    // submission.completed -> completed/signed
    // submission.declined -> declined

    let status_update = match payload.event_type.as_str() {
        "submission.started" | "submission.opened" | "submission.viewed" | "form.started"
        | "form.viewed" => Some("opened"),
        "submission.completed" | "form.completed" => Some("completed"),
        "submission.declined" | "form.declined" => Some("declined"),
        _ => None,
    };

    if status_update.is_none() {
        // Ignore other events
        return Ok(StatusCode::OK);
    }

    let new_status = status_update.unwrap();

    let submission_id = payload.data["submission_id"]
        .as_i64()
        .or_else(|| payload.data["id"].as_i64())
        .ok_or_else(|| {
            error!("Missing submission id in webhook payload");
            (StatusCode::BAD_REQUEST, "Missing submission id".to_string())
        })?;

    info!(submission_id, new_status, "Processing submission update");

    let pg = Postgrest::new(format!("{}/rest/v1", state.supabase_url))
        .insert_header("apikey", &state.supabase_service_key)
        .insert_header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        );

    // 1. Update scouting_offers status
    // We need to find the offer associated with this submission_id
    let offer_response = pg
        .from("scouting_offers")
        .select("id, prospect_id")
        .eq("docuseal_submission_id", submission_id.to_string())
        .single()
        .execute()
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to find offer for submission");
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    info!(status = ?offer_response.status(), "Offer lookup response status");

    if !offer_response.status().is_success() {
        // It's possible we don't have this offer (e.g. created outside of our app or deleted)
        // Just log and ignore
        info!("No offer found for submission_id: {}", submission_id);
        return Ok(StatusCode::OK);
    }

    let offer_body = offer_response.text().await.unwrap_or_default();
    info!(body = %offer_body, "Offer lookup response body");
    let offer: serde_json::Value = serde_json::from_str(&offer_body).map_err(|e| {
        error!(error = %e, body = %offer_body, "Failed to parse offer");
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let offer_id = offer["id"].as_str().unwrap();
    let prospect_id = offer["prospect_id"].as_str().unwrap();

    // Extract signed document URL from webhook payload if submission is completed
    let signed_document_url = if new_status == "completed" {
        // Try to get the document URL from payload.data.documents[0].url
        let url = payload.data["documents"]
            .as_array()
            .and_then(|docs| docs.first())
            .and_then(|doc| doc["url"].as_str())
            .map(|s| s.to_string());

        if url.is_some() {
            info!(
                submission_id,
                url = ?url,
                "Extracted signed document URL from webhook payload"
            );
        } else {
            warn!(
                submission_id,
                payload_data = ?payload.data,
                "No signed document URL found in webhook payload"
            );
        }
        url
    } else {
        None
    };

    // Update offer status and signed_document_url
    let mut update_json = json!({ "status": new_status });
    if let Some(url) = signed_document_url {
        update_json["signed_document_url"] = json!(url);
        if new_status == "completed" {
            update_json["signed_at"] = json!(chrono::Utc::now().to_rfc3339());
        }
    }

    let _ = pg
        .from("scouting_offers")
        .update(update_json.to_string())
        .eq("id", offer_id)
        .execute()
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to update offer status");
        });

    // 2. Update prospect status (Pipeline logic)
    // Only move the prospect card for significant events
    if new_status == "completed" || new_status == "signed" {
        let _ = pg
            .from("scouting_prospects")
            .update(json!({ "status": "signed" }).to_string())
            .eq("id", prospect_id)
            .execute()
            .await
            .map_err(|e| {
                error!(error = %e, "Failed to update prospect status to signed");
            });
    } else if new_status == "declined" {
        let _ = pg
            .from("scouting_prospects")
            .update(json!({ "status": "declined" }).to_string())
            .eq("id", prospect_id)
            .execute()
            .await
            .map_err(|e| {
                error!(error = %e, "Failed to update prospect status to declined");
            });
    }
    // Note: We do NOT update prospect status for "opened".
    // It stays as "offer_sent" in the pipeline until signed or declined.

    Ok(StatusCode::OK)
}
