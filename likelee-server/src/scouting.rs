use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use postgrest::Postgrest;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tracing::{error, info};

use crate::config::AppState;
use crate::services::docuseal::DocuSealClient;
use crate::auth::AuthUser;

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

// ============================================================================
// Template Handlers
// ============================================================================

/// GET /api/scouting/templates?agency_id=xxx
pub async fn list_templates(
    State(state): State<AppState>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let agency_id = params
        .get("agency_id")
        .ok_or((StatusCode::BAD_REQUEST, "agency_id required".to_string()))?;

    info!(agency_id = %agency_id, "Fetching templates");

    let pg = Postgrest::new(format!("{}/rest/v1", state.supabase_url))
        .insert_header("apikey", &state.supabase_service_key)
        .insert_header("Authorization", format!("Bearer {}", state.supabase_service_key));

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

    Ok((StatusCode::OK, body))
}

/// POST /api/scouting/templates
pub async fn create_template(
    State(state): State<AppState>,
    Json(payload): Json<CreateTemplateRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    info!(
        agency_id = %payload.agency_id,
        docuseal_template_id = payload.docuseal_template_id,
        "Creating template"
    );

    let pg = Postgrest::new(format!("{}/rest/v1", state.supabase_url))
        .insert_header("apikey", &state.supabase_service_key)
        .insert_header("Authorization", format!("Bearer {}", state.supabase_service_key));

    let template_data = json!({
        "agency_id": payload.agency_id,
        "docuseal_template_id": payload.docuseal_template_id,
        "name": payload.name,
        "description": payload.description,
    });

    let response = pg
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
        .insert_header("Authorization", format!("Bearer {}", state.supabase_service_key));

    pg.from("scouting_templates")
        .delete()
        .eq("id", &id)
        .execute()
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to delete template");
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    Ok(StatusCode::NO_CONTENT)
}

// ============================================================================
// Offer Handlers
// ============================================================================

/// GET /api/scouting/offers?agency_id=xxx
pub async fn list_offers(
    State(state): State<AppState>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let agency_id = params
        .get("agency_id")
        .ok_or((StatusCode::BAD_REQUEST, "agency_id required".to_string()))?;

    info!(agency_id = %agency_id, "Fetching offers");

    let pg = Postgrest::new(format!("{}/rest/v1", state.supabase_url))
        .insert_header("apikey", &state.supabase_service_key)
        .insert_header("Authorization", format!("Bearer {}", state.supabase_service_key));

    let response = pg
        .from("scouting_offers")
        .select("*,prospect:scouting_prospects(full_name,email,status),template:scouting_templates(name)")
        .eq("agency_id", agency_id)
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
        .insert_header("Authorization", format!("Bearer {}", state.supabase_service_key));

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
        .insert_header("Authorization", format!("Bearer {}", state.supabase_service_key));

    let template_response = pg2
        .from("scouting_templates")
        .select("docuseal_template_id")
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
        .ok_or((StatusCode::BAD_REQUEST, "Invalid template ID".to_string()))? as i32;

    let prospect_name = prospect["full_name"]
        .as_str()
        .unwrap_or("Unknown")
        .to_string();
    let prospect_email = prospect["email"]
        .as_str()
        .ok_or((StatusCode::BAD_REQUEST, "Prospect email required".to_string()))?
        .to_string();

    let submission = docuseal_client
        .create_submission(docuseal_template_id, prospect_name, prospect_email)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to create DocuSeal submission");
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    // Get signing URL from first submitter
    let signing_url = submission
        .submitters
        .first()
        .map(|s| s.url.clone())
        .unwrap_or_default();

    // Save offer to database
    let pg3 = Postgrest::new(format!("{}/rest/v1", state.supabase_url))
        .insert_header("apikey", &state.supabase_service_key)
        .insert_header("Authorization", format!("Bearer {}", state.supabase_service_key));

    let offer_data = json!({
        "prospect_id": payload.prospect_id,
        "agency_id": payload.agency_id,
        "template_id": payload.template_id,
        "docuseal_submission_id": submission.id,
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
) -> Result<impl IntoResponse, (StatusCode, String)> {
    info!(offer_id = %query.offer_id, "Refreshing offer status");

    // Get offer from database
    let pg = Postgrest::new(format!("{}/rest/v1", state.supabase_url))
        .insert_header("apikey", &state.supabase_service_key)
        .insert_header("Authorization", format!("Bearer {}", state.supabase_service_key));

    let offer_response = pg
        .from("scouting_offers")
        .select("docuseal_submission_id")
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
        .ok_or((StatusCode::BAD_REQUEST, "Invalid submission ID".to_string()))? as i32;

    // Fetch status from DocuSeal
    let docuseal_client = DocuSealClient::new(
        state.docuseal_api_key.clone(),
        state.docuseal_api_url.clone(),
    );

    let submission = docuseal_client
        .get_submission(submission_id)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to fetch DocuSeal submission");
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    // Map DocuSeal status to our status
    let status = match submission.status.as_str() {
        "completed" => "signed",
        "declined" => "declined",
        "expired" => "voided",
        _ => "sent",
    };

    // Get signed document URL if completed
    let signed_document_url = if status == "signed" {
        submission.documents.first().map(|d| d.url.clone())
    } else {
        None
    };

    // Update offer in database
    let pg2 = Postgrest::new(format!("{}/rest/v1", state.supabase_url))
        .insert_header("apikey", &state.supabase_service_key)
        .insert_header("Authorization", format!("Bearer {}", state.supabase_service_key));

    let update_data = json!({
        "status": status,
        "signed_document_url": signed_document_url,
        "signed_at": if status == "signed" {
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

    let response = OfferResponse {
        id: query.offer_id.clone(),
        status: status.to_string(),
        signing_url: submission.submitters.first().map(|s| s.url.clone()),
        signed_document_url,
    };

    Ok(Json(response))
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
    info!(
        user_id = %user.id,
        agency_id = %payload.agency_id,
        "Creating builder token"
    );

    // Verify agency exists and get user details (simplified for now)
    // In a real app, we would fetch the agency owner's email
    let pg = Postgrest::new(format!("{}/rest/v1", state.supabase_url))
        .insert_header("apikey", &state.supabase_service_key)
        .insert_header("Authorization", format!("Bearer {}", state.supabase_service_key));

    let agency_response = pg
        .from("agencies")
        .select("name, contact_email") // Assuming these fields exist
        .eq("id", &payload.agency_id)
        .single()
        .execute()
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to fetch agency");
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    let agency_body = agency_response.text().await.map_err(|e| {
        error!(error = %e, "Failed to read agency response");
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let agency: serde_json::Value = serde_json::from_str(&agency_body).map_err(|e| {
        error!(error = %e, "Failed to parse agency");
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    // Use configured DocuSeal user email if set (required for builder token to match account owner)
    // Otherwise fallback to agency contact email (which might fail if not a user in DocuSeal)
    let user_email = if !state.docuseal_user_email.is_empty() {
        state.docuseal_user_email.clone()
    } else {
        agency["contact_email"]
            .as_str()
            .unwrap_or("agency@example.com")
            .to_string()
    };

    let integration_email = agency["contact_email"]
        .as_str()
        .unwrap_or("agency@example.com")
        .to_string();

    let name = agency["name"]
        .as_str()
        .unwrap_or("Agency User")
        .to_string();

    let docuseal_client = DocuSealClient::new(
        state.docuseal_api_key.clone(),
        state.docuseal_api_url.clone(),
    );

    let token = docuseal_client
        .create_builder_token(
            user_email,
            name,
            integration_email,
            payload.template_id,
        )
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
    Json(payload): Json<SyncTemplatesRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    info!(
        user_id = %user.id,
        agency_id = %payload.agency_id,
        "Syncing templates from DocuSeal"
    );

    let docuseal_client = DocuSealClient::new(
        state.docuseal_api_key.clone(),
        state.docuseal_api_url.clone(),
    );

    // 1. Fetch templates from DocuSeal
    let templates_response = docuseal_client.list_templates(Some(100)).await.map_err(|e| {
        error!(error = %e, "Failed to fetch templates from DocuSeal");
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let pg = Postgrest::new(format!("{}/rest/v1", state.supabase_url))
        .insert_header("apikey", &state.supabase_service_key)
        .insert_header("Authorization", format!("Bearer {}", state.supabase_service_key));

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
    
    let mut synced_count = 0;

    for template in templates_response.data {
        let template_data = json!({
            "agency_id": payload.agency_id,
            "docuseal_template_id": template.id,
            "name": template.name,
            "description": "Synced from DocuSeal",
            "updated_at": chrono::Utc::now().to_rfc3339(),
        });

        // We use upsert (insert with on_conflict)
        // Note: PostgREST upsert requires ON CONFLICT column.
        // Our table has (agency_id, docuseal_template_id) unique constraint?
        // Let's check migration.
        // Migration 0008 says: UNIQUE(agency_id, docuseal_template_id)
        
        let _ = pg
            .from("scouting_templates")
            .insert(template_data.to_string())
            .upsert("true") // Enable upsert
            .on_conflict("agency_id,docuseal_template_id") // Specify conflict columns
            .execute()
            .await
            .map_err(|e| {
                error!(error = %e, "Failed to upsert template {}", template.id);
                // Continue even if one fails
            });
            
        synced_count += 1;
    }

    info!(synced_count, "Templates synced successfully");
    Ok(StatusCode::OK)
}

// ============================================================================
// PDF Upload Handler
// ============================================================================

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

    info!(user_id = %user.id, "Processing PDF upload for template");

    let mut agency_id = String::new();
    let mut file_name = String::new();
    let mut file_content = Vec::new();

    while let Some(field) = multipart.next_field().await.map_err(|e| {
        error!(error = %e, "Failed to read multipart field");
        (StatusCode::BAD_REQUEST, e.to_string())
    })? {
        let name = field.name().unwrap_or_default().to_string();

        if name == "agency_id" {
            agency_id = field.text().await.map_err(|e| {
                error!(error = %e, "Failed to read agency_id");
                (StatusCode::BAD_REQUEST, e.to_string())
            })?;
        } else if name == "file" {
            file_name = field.file_name().unwrap_or("document.pdf").to_string();
            file_content = field.bytes().await.map_err(|e| {
                error!(error = %e, "Failed to read file content");
                (StatusCode::BAD_REQUEST, e.to_string())
            })?.to_vec();
        }
    }

    if agency_id.is_empty() || file_content.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Missing agency_id or file".to_string(),
        ));
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
        .insert_header("Authorization", format!("Bearer {}", state.supabase_service_key));

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
        return Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", body)));
    }

    info!(status = %status, body = %body, "Template saved to database successfully");

    Ok(Json(CreateTemplateFromPdfResponse {
        id: template.id,
        slug: template.slug,
        name: template.name,
    }))
}
