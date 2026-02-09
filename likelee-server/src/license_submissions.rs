use crate::auth::AuthUser;
use crate::config::AppState;
use crate::license_templates::LicenseTemplate;
use crate::services::docuseal::DocuSealClient;
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use postgrest::Postgrest;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tracing::{error, info};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LicenseSubmission {
    pub id: String,
    pub agency_id: String,
    pub client_id: Option<String>,
    pub template_id: String,
    pub licensing_request_id: Option<String>,
    pub docuseal_submission_id: Option<i32>,
    pub docuseal_slug: Option<String>,
    pub docuseal_template_id: Option<i32>,
    pub client_name: Option<String>,
    pub client_email: Option<String>,
    pub talent_names: Option<String>,
    pub license_fee: Option<i64>,
    pub duration_days: Option<i32>,
    pub start_date: Option<String>,
    pub custom_terms: Option<String>,
    pub status: String,
    pub sent_at: Option<String>,
    pub opened_at: Option<String>,
    pub signed_at: Option<String>,
    pub declined_at: Option<String>,
    pub decline_reason: Option<String>,
    pub signed_document_url: Option<String>,
    pub template_name: Option<String>, // Added for UI display
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSubmissionRequest {
    pub template_id: String,
    pub client_id: Option<String>,
    pub client_email: String,
    pub client_name: String,
    pub docuseal_template_id: Option<i32>,
    pub talent_names: Option<String>,
    pub document_base64: Option<String>,
    pub license_fee: Option<i64>,
    pub duration_days: Option<i32>,
    pub start_date: Option<String>,
    pub custom_terms: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ListQuery {
    pub status: Option<String>,
    pub client_id: Option<String>,
}

/// POST /api/license-submissions/draft - Create a draft template for a deal
pub async fn create_draft(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(req_val): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let req: CreateSubmissionRequest = serde_json::from_value(req_val.clone()).map_err(|e| {
        tracing::error!("JSON parse error: {} for value: {}", e, req_val);
        (
            StatusCode::BAD_REQUEST,
            format!("Invalid JSON: {}. Payload: {}", e, req_val),
        )
    })?;
    let agency_id = auth_user.id;

    // 1. Fetch License Template metadata
    let template_resp = state
        .pg
        .from("license_templates")
        .select("*")
        .eq("id", &req.template_id)
        .eq("agency_id", &agency_id)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let template_text = template_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let license_template: crate::license_templates::LicenseTemplate =
        serde_json::from_str(&template_text)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 2. Setup DocuSeal client
    let docuseal = DocuSealClient::new(
        state.docuseal_api_key.clone(),
        state.docuseal_base_url.clone(),
    );

    let docuseal_template_id = if let Some(base64) = req.document_base64 {
        let template_name = format!(
            "Contract - {} - {}",
            req.client_name, license_template.template_name
        );
        let ds_template = docuseal
            .create_template(template_name, "contract.pdf".to_string(), base64)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        Some(ds_template.id)
    } else {
        license_template
            .docuseal_template_id
            .or_else(|| state.docuseal_master_template_id.parse::<i32>().ok())
    };

    // 3. Create a draft record in Likelee
    let client_name = if !req.client_name.is_empty() {
        req.client_name.clone()
    } else {
        license_template.client_name.clone().unwrap_or_default()
    };
    let talent_names = req
        .talent_names
        .clone()
        .filter(|s| !s.trim().is_empty())
        .or_else(|| license_template.talent_name.clone())
        .unwrap_or_default();
    let start_date = req
        .start_date
        .clone()
        .or(license_template.start_date.clone());

    let draft_data = json!({
        "agency_id": agency_id,
        "client_id": req.client_id,
        "template_id": req.template_id,
        "docuseal_template_id": docuseal_template_id,
        "status": "draft",
        "client_name": client_name,
        "client_email": req.client_email,
        "talent_names": talent_names,
        "license_fee": req.license_fee,
        "duration_days": req.duration_days,
        "start_date": start_date,
        "custom_terms": req.custom_terms,
    });

    let resp = state
        .pg
        .from("license_submissions")
        .insert(draft_data.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !status.is_success() {
        return Err((
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
            text,
        ));
    }

    let created: Vec<serde_json::Value> = serde_json::from_str(&text).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!(
                "Failed to parse created draft: {}. Raw response: {}",
                e, text
            ),
        )
    })?;
    let draft = created.into_iter().next().ok_or((
        StatusCode::INTERNAL_SERVER_ERROR,
        "Failed to create draft (empty response)".to_string(),
    ))?;

    Ok(Json(draft))
}

#[derive(Debug, Deserialize)]
pub struct PreviewSubmissionRequest {
    pub docuseal_template_id: Option<i32>,
    pub client_name: Option<String>,
    pub client_email: Option<String>,
    pub talent_names: Option<String>,
    pub license_fee: Option<i64>,
    pub duration_days: Option<i32>,
    pub start_date: Option<String>,
    pub custom_terms: Option<String>,
}

/// POST /api/license-submissions/:id/preview - Create a DocuSeal submission for preview without emailing the client
pub async fn preview(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<String>,
    Json(req): Json<PreviewSubmissionRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let agency_id = auth_user.id;

    // 1. Fetch the draft submission
    let sub_resp = state
        .pg
        .from("license_submissions")
        .select("*")
        .eq("id", &id)
        .eq("agency_id", &agency_id)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let sub_text = sub_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let submission_data: serde_json::Value = serde_json::from_str(&sub_text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if submission_data["status"] != "draft" {
        return Err((
            StatusCode::BAD_REQUEST,
            "Only draft submissions can be previewed".to_string(),
        ));
    }

    // 2. Fetch the License Template metadata for values
    let template_id = submission_data["template_id"].as_str().ok_or((
        StatusCode::INTERNAL_SERVER_ERROR,
        "Invalid template_id".to_string(),
    ))?;
    let template_resp = state
        .pg
        .from("license_templates")
        .select("*")
        .eq("id", template_id)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let template_text = template_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let license_template: crate::license_templates::LicenseTemplate =
        serde_json::from_str(&template_text)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 3. Merge override values (request > submission record > template)
    let client_name = req
        .client_name
        .clone()
        .or_else(|| submission_data["client_name"].as_str().map(String::from))
        .or_else(|| license_template.client_name.clone())
        .unwrap_or_else(|| "Client".to_string());
    let client_email = req
        .client_email
        .clone()
        .or_else(|| submission_data["client_email"].as_str().map(String::from))
        .unwrap_or_default();
    let talent_names = req
        .talent_names
        .clone()
        .or_else(|| submission_data["talent_names"].as_str().map(String::from))
        .or_else(|| license_template.talent_name.clone())
        .unwrap_or_default();

    let license_fee = req
        .license_fee
        .or_else(|| submission_data["license_fee"].as_i64())
        .or(license_template.license_fee);
    let fee_str = license_fee
        .map(|c| format!("${:.2}", c as f64 / 100.0))
        .unwrap_or_default();

    let duration_days = req
        .duration_days
        .or_else(|| submission_data["duration_days"].as_i64().map(|d| d as i32))
        .unwrap_or(license_template.duration_days);

    let start_date = req
        .start_date
        .clone()
        .or_else(|| submission_data["start_date"].as_str().map(String::from))
        .or_else(|| license_template.start_date.clone())
        .unwrap_or_else(|| "-".to_string());

    let combined_custom_terms = req
        .custom_terms
        .clone()
        .or_else(|| submission_data["custom_terms"].as_str().map(String::from))
        .filter(|s| !s.trim().is_empty())
        .or_else(|| license_template.custom_terms.clone())
        .unwrap_or_default();

    // 4. Determine DocuSeal template id
    let docuseal_template_id = req
        .docuseal_template_id
        .or_else(|| {
            submission_data["docuseal_template_id"]
                .as_i64()
                .map(|i| i as i32)
        })
        .or(license_template.docuseal_template_id)
        .or_else(|| state.docuseal_master_template_id.parse::<i32>().ok())
        .ok_or((
            StatusCode::INTERNAL_SERVER_ERROR,
            "Invalid DS template id".to_string(),
        ))?;

    // Build fields array for pre-filling (DocuSeal API standard format)
    use crate::services::docuseal::SubmitterField;

    let mut fields = vec![
        SubmitterField {
            name: "Client/Brand Name".to_string(),
            default_value: Some(client_name.clone()),
            readonly: Some(true),
        },
        SubmitterField {
            name: "Talent Name".to_string(),
            default_value: Some(talent_names.clone()),
            readonly: Some(true),
        },
        SubmitterField {
            name: "License Fee".to_string(),
            default_value: Some(fee_str.clone()),
            readonly: Some(true),
        },
        SubmitterField {
            name: "Category".to_string(),
            default_value: Some(license_template.category.clone()),
            readonly: Some(true),
        },
    ];

    if let Some(desc) = &license_template.description {
        fields.push(SubmitterField {
            name: "Description".to_string(),
            default_value: Some(desc.clone()),
            readonly: Some(true),
        });
    }

    if let Some(scope) = &license_template.usage_scope {
        fields.push(SubmitterField {
            name: "Usage Scope".to_string(),
            default_value: Some(scope.clone()),
            readonly: Some(true),
        });
    }

    fields.push(SubmitterField {
        name: "Territory".to_string(),
        default_value: Some(license_template.territory.clone()),
        readonly: Some(true),
    });

    fields.push(SubmitterField {
        name: "Exclusivity".to_string(),
        default_value: Some(license_template.exclusivity.clone()),
        readonly: Some(true),
    });

    fields.push(SubmitterField {
        name: "Duration".to_string(),
        default_value: Some(duration_days.to_string()),
        readonly: Some(true),
    });

    fields.push(SubmitterField {
        name: "Start Date".to_string(),
        default_value: Some(start_date.to_string()),
        readonly: Some(true),
    });

    fields.push(SubmitterField {
        name: "Custom Terms".to_string(),
        default_value: Some(combined_custom_terms.clone()),
        readonly: Some(true),
    });

    fields.push(SubmitterField {
        name: "Template Name".to_string(),
        default_value: Some(license_template.template_name.clone()),
        readonly: Some(true),
    });

    // 5. Create DocuSeal submission without sending email using fields-based pre-fill
    let docuseal = DocuSealClient::new(
        state.docuseal_api_key.clone(),
        state.docuseal_base_url.clone(),
    );
    let docuseal_submission = docuseal
        .create_submission_with_fields(
            docuseal_template_id,
            client_name.clone(),
            client_email.clone(),
            "First Party".to_string(),
            fields,
            false,
        )
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("DocuSeal Error: {}", e),
            )
        })?;

    // 6. Fetch submitter slug to construct preview URL
    let details = docuseal
        .get_submission(docuseal_submission.id)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("DocuSeal Error: {}", e),
            )
        })?;

    let slug = details
        .submitters
        .first()
        .map(|s| s.slug.clone())
        .unwrap_or_else(|| docuseal_submission.slug);

    let preview_url = format!("{}/s/{}", state.docuseal_app_url, slug);

    Ok(Json(json!({
        "docuseal_submission_id": docuseal_submission.id,
        "docuseal_slug": slug,
        "preview_url": preview_url,
    })))
}

#[derive(Debug, Deserialize)]
pub struct FinalizeSubmissionRequest {
    pub docuseal_template_id: Option<i32>,
    pub client_name: Option<String>,
    pub client_email: Option<String>,
    pub talent_names: Option<String>,
}

/// POST /api/license-submissions/:id/finalize - Finalize and send a draft submission
pub async fn finalize(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<String>,
    Json(req): Json<FinalizeSubmissionRequest>,
) -> Result<Json<LicenseSubmission>, (StatusCode, String)> {
    let agency_id = auth_user.id;

    // 1. Fetch the draft submission
    let sub_resp = state
        .pg
        .from("license_submissions")
        .select("*")
        .eq("id", &id)
        .eq("agency_id", &agency_id)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let sub_text = sub_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let submission_data: serde_json::Value = serde_json::from_str(&sub_text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if submission_data["status"] != "draft" {
        return Err((
            StatusCode::BAD_REQUEST,
            "Submission is already finalized".to_string(),
        ));
    }

    // 2. Fetch the License Template metadata for values
    let template_id = submission_data["template_id"].as_str().ok_or((
        StatusCode::INTERNAL_SERVER_ERROR,
        "Invalid template_id".to_string(),
    ))?;
    let template_resp = state
        .pg
        .from("license_templates")
        .select("*")
        .eq("id", template_id)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let template_text = template_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let license_template: crate::license_templates::LicenseTemplate =
        serde_json::from_str(&template_text)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 3. Prepare values for DocuSeal (matching create_builder_token pattern)
    let license_fee = submission_data["license_fee"]
        .as_i64()
        .or(license_template.license_fee);
    let fee_str = license_fee
        .map(|c| format!("${:.2}", c as f64 / 100.0))
        .unwrap_or_default();

    let duration_days = submission_data["duration_days"]
        .as_i64()
        .map(|d| d as i32)
        .unwrap_or(license_template.duration_days);

    let start_date = submission_data["start_date"]
        .as_str()
        .or(license_template.start_date.as_deref())
        .unwrap_or("-");

    // Build fields array for pre-filling (DocuSeal API standard format)
    use crate::services::docuseal::SubmitterField;

    let mut fields = Vec::new();

    let client_name_str = submission_data["client_name"].as_str().unwrap_or("Client");
    let talent_names_str = submission_data["talent_names"].as_str().unwrap_or("");

    fields.push(SubmitterField {
        name: "Client/Brand Name".to_string(),
        default_value: Some(client_name_str.to_string()),
        readonly: Some(true),
    });

    fields.push(SubmitterField {
        name: "Talent Name".to_string(),
        default_value: Some(talent_names_str.to_string()),
        readonly: Some(true),
    });

    fields.push(SubmitterField {
        name: "License Fee".to_string(),
        default_value: Some(fee_str.clone()),
        readonly: Some(true),
    });

    fields.push(SubmitterField {
        name: "Category".to_string(),
        default_value: Some(license_template.category.clone()),
        readonly: Some(true),
    });

    if let Some(desc) = &license_template.description {
        fields.push(SubmitterField {
            name: "Description".to_string(),
            default_value: Some(desc.clone()),
            readonly: Some(true),
        });
    }

    if let Some(scope) = &license_template.usage_scope {
        fields.push(SubmitterField {
            name: "Usage Scope".to_string(),
            default_value: Some(scope.clone()),
            readonly: Some(true),
        });
    }

    fields.push(SubmitterField {
        name: "Territory".to_string(),
        default_value: Some(license_template.territory.clone()),
        readonly: Some(true),
    });

    fields.push(SubmitterField {
        name: "Exclusivity".to_string(),
        default_value: Some(license_template.exclusivity.clone()),
        readonly: Some(true),
    });

    fields.push(SubmitterField {
        name: "Duration".to_string(),
        default_value: Some(duration_days.to_string()),
        readonly: Some(true),
    });

    fields.push(SubmitterField {
        name: "Start Date".to_string(),
        default_value: Some(start_date.to_string()),
        readonly: Some(true),
    });

    let combined_terms = submission_data["custom_terms"]
        .as_str()
        .filter(|s| !s.trim().is_empty())
        .map(String::from)
        .or_else(|| license_template.custom_terms.clone())
        .unwrap_or_default();
    fields.push(SubmitterField {
        name: "Custom Terms".to_string(),
        default_value: Some(combined_terms),
        readonly: Some(true),
    });

    fields.push(SubmitterField {
        name: "Template Name".to_string(),
        default_value: Some(license_template.template_name.clone()),
        readonly: Some(true),
    });

    let docuseal = DocuSealClient::new(
        state.docuseal_api_key.clone(),
        state.docuseal_base_url.clone(),
    );

    // Use values from request if provided, otherwise fallback to existing record
    let docuseal_template_id = req
        .docuseal_template_id
        .or_else(|| {
            submission_data["docuseal_template_id"]
                .as_i64()
                .map(|i| i as i32)
        })
        .or(license_template.docuseal_template_id)
        .or_else(|| state.docuseal_master_template_id.parse::<i32>().ok())
        .ok_or((
            StatusCode::INTERNAL_SERVER_ERROR,
            "Invalid DS template id".to_string(),
        ))?;

    let client_name = req
        .client_name
        .clone()
        .or_else(|| submission_data["client_name"].as_str().map(String::from))
        .unwrap_or_else(|| "Client".to_string());

    let client_email = req
        .client_email
        .clone()
        .or_else(|| submission_data["client_email"].as_str().map(String::from))
        .unwrap_or_default();

    // If client info was provided in this request, update the record first
    if req.client_name.is_some() || req.client_email.is_some() || req.talent_names.is_some() {
        let mut update_json = serde_json::Map::new();
        if let Some(n) = &req.client_name {
            update_json.insert("client_name".to_string(), json!(n));
        }
        if let Some(e) = &req.client_email {
            update_json.insert("client_email".to_string(), json!(e));
        }
        if let Some(t) = &req.talent_names {
            update_json.insert("talent_names".to_string(), json!(t));
        }

        let _ = state
            .pg
            .from("license_submissions")
            .update(serde_json::Value::Object(update_json).to_string())
            .eq("id", &id)
            .execute()
            .await;
    }

    // 4. Create DocuSeal Submission with fields-based pre-fill
    let docuseal_submission = docuseal
        .create_submission_with_fields(
            docuseal_template_id,
            client_name.clone(),
            client_email.clone(),
            "First Party".to_string(),
            fields,
            true,
        )
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("DocuSeal Error: {}", e),
            )
        })?;

    // 5. Update Likelee record
    let update_data = json!({
        "docuseal_submission_id": docuseal_submission.id,
        "docuseal_slug": docuseal_submission.slug,
        "docuseal_template_id": docuseal_template_id,
        "status": "sent",
        "updated_at": chrono::Utc::now().to_rfc3339(),
    });

    let resp = state
        .pg
        .from("license_submissions")
        .update(update_data.to_string())
        .eq("id", &id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !status.is_success() {
        return Err((
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
            text,
        ));
    }

    let mut updated: Vec<LicenseSubmission> = serde_json::from_str(&text).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!(
                "Failed to parse updated submission: {}. Raw response: {}",
                e, text
            ),
        )
    })?;
    let submission = updated.pop().ok_or((
        StatusCode::INTERNAL_SERVER_ERROR,
        "Failed to update submission (empty response)".to_string(),
    ))?;

    // 6. Create linked licensing_request (if not already exists)
    let talent_name = submission_data["talent_names"].as_str();

    let lr_data = json!({
        "agency_id": agency_id,
        "brand_id": submission.client_id,
        "client_name": submission_data["client_name"],
        "talent_id": None::<String>,
        "talent_name": talent_name,
        "submission_id": submission.id,
        "status": "pending",
        "campaign_title": format!("License Contract - {}", client_name),
        "usage_scope": license_template.usage_scope.clone(),
        "regions": license_template.territory.clone(),
        "budget_min": license_fee.unwrap_or(0) as f64 / 100.0,
        "budget_max": license_fee.unwrap_or(0) as f64 / 100.0,
    });

    state
        .pg
        .from("licensing_requests")
        .insert(lr_data.to_string())
        .execute()
        .await
        .ok();

    Ok(Json(submission))
}

/// POST /api/license-submissions - Legacy create (calls draft + finalize if possible)
pub async fn create(
    State(_state): State<AppState>,
    _auth_user: AuthUser,
    Json(_req): Json<CreateSubmissionRequest>,
) -> Result<Json<LicenseSubmission>, (StatusCode, String)> {
    // If no document is provided, we can maybe finalize immediately?
    // But better to enforce the new flow.
    Err((
        StatusCode::NOT_IMPLEMENTED,
        "Please use draft and finalize flow".to_string(),
    ))
}

/// GET /api/license-submissions - List submissions for agency
pub async fn list(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Query(q): Query<ListQuery>,
) -> Result<Json<Vec<LicenseSubmission>>, (StatusCode, String)> {
    let agency_id = auth_user.id;

    let mut query = state
        .pg
        .from("license_submissions")
        .select("*, license_templates:license_templates(template_name)")
        .eq("agency_id", &agency_id)
        .order("created_at.desc");

    if let Some(status) = q.status {
        query = query.eq("status", &status);
    }

    if let Some(client_id) = q.client_id {
        query = query.eq("client_id", &client_id);
    }

    let resp = query.execute().await.map_err(|e| {
        tracing::error!(error = %e, "Failed to fetch license_submissions");
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        tracing::error!(error = %err, "license_submissions query error");
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    let text = resp.text().await.map_err(|e| {
        tracing::error!(error = %e, "Failed to read response");
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    // The select embeds license_templates as an object; flatten template_name for UI.
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    let mut submissions: Vec<LicenseSubmission> = Vec::with_capacity(rows.len());
    for mut r in rows {
        let template_name = r
            .get("license_templates")
            .and_then(|v| {
                // PostgREST might return an array for joins, even if it's 1-to-1
                if v.is_array() {
                    v.as_array().and_then(|a| a.first())
                } else {
                    Some(v)
                }
            })
            .and_then(|v| v.get("template_name"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        if let Some(name) = template_name {
            if let Some(obj) = r.as_object_mut() {
                obj.insert("template_name".to_string(), serde_json::Value::String(name));
            }
        }

        // Avoid leaking the embedded object; keep response shape stable.
        if let Some(obj) = r.as_object_mut() {
            obj.remove("license_templates");
        }

        if let Ok(sub) = serde_json::from_value::<LicenseSubmission>(r) {
            submissions.push(sub);
        }
    }

    tracing::info!(
        agency_id = %agency_id,
        count = submissions.len(),
        "License submissions fetched"
    );

    Ok(Json(submissions))
}

/// GET /api/license-submissions/:id - Get submission details
pub async fn get(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<LicenseSubmission>, (StatusCode, String)> {
    let agency_id = auth_user.id;

    let resp = state
        .pg
        .from("license_submissions")
        .select("*, license_templates:license_templates(template_name)")
        .eq("id", &id)
        .eq("agency_id", &agency_id)
        .single()
        .execute()
        .await
        .map_err(|e| {
            tracing::error!(error = %e, id = %id, "Failed to fetch submission");
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    if !resp.status().is_success() {
        let err = resp.text().await.unwrap_or_default();
        tracing::error!(error = %err, "submission query error");
        return Err((StatusCode::NOT_FOUND, "Submission not found".to_string()));
    }

    let text = resp.text().await.map_err(|e| {
        tracing::error!(error = %e, "Failed to read response");
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let mut row: serde_json::Value = serde_json::from_str(&text).map_err(|e| {
        tracing::error!(error = %e, body = %text, "Failed to parse submission JSON");
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    let template_name = row
        .get("license_templates")
        .and_then(|v| v.get("template_name"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    if let Some(name) = template_name {
        if let Some(obj) = row.as_object_mut() {
            obj.insert("template_name".to_string(), serde_json::Value::String(name));
            obj.remove("license_templates");
        }
    } else if let Some(obj) = row.as_object_mut() {
        obj.remove("license_templates");
    }

    let submission: LicenseSubmission = serde_json::from_value(row).map_err(|e| {
        tracing::error!(error = %e, body = %text, "Failed to parse submission");
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    Ok(Json(submission))
}

/// POST /api/license-submissions/:id/resend - Edit and resend submission
pub async fn resend(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<String>,
    Json(req): Json<CreateSubmissionRequest>,
) -> Result<Json<LicenseSubmission>, (StatusCode, String)> {
    let agency_id = auth_user.id;

    // 1. Archive old submission in DocuSeal
    let old_submission_resp = state
        .pg
        .from("license_submissions")
        .select("docuseal_submission_id")
        .eq("id", &id)
        .eq("agency_id", &agency_id)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !old_submission_resp.status().is_success() {
        return Err((StatusCode::NOT_FOUND, "Submission not found".to_string()));
    }

    let old_text = old_submission_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let old_data: serde_json::Value = serde_json::from_str(&old_text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let old_docuseal_id = old_data["docuseal_submission_id"].as_i64().ok_or_else(|| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Invalid data".to_string(),
        )
    })? as i32;

    // Archive in DocuSeal
    let docuseal = DocuSealClient::new(
        state.docuseal_api_key.clone(),
        state.docuseal_base_url.clone(),
    );

    docuseal
        .archive_submission(old_docuseal_id)
        .await
        .map_err(|e| {
            tracing::warn!(error = %e, "Failed to archive old DocuSeal submission");
            e
        })
        .ok();

    // 2. Update old submission status to archived
    let update_data = json!({ "status": "archived" });

    state
        .pg
        .from("license_submissions")
        .update(serde_json::to_string(&update_data).unwrap())
        .eq("id", &id)
        .execute()
        .await
        .ok();

    // 3. Create new submission (reuse create logic)
    let new_auth_user = AuthUser {
        id: agency_id.clone(),
        email: auth_user.email,
        role: auth_user.role,
    };
    create(State(state), new_auth_user, Json(req)).await
}

/// DELETE /api/license-submissions/:id - Archive submission
pub async fn archive(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    let agency_id = auth_user.id;

    let update_data = json!({ "status": "archived" });

    let resp = state
        .pg
        .from("license_submissions")
        .update(serde_json::to_string(&update_data).unwrap())
        .eq("id", &id)
        .eq("agency_id", &agency_id)
        .execute()
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Failed to archive submission");
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    if !resp.status().is_success() {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to archive".to_string(),
        ));
    }

    tracing::info!(submission_id = %id, "Submission archived");

    Ok(StatusCode::NO_CONTENT)
}

/// POST /api/license-submissions/:id/recover - Recover submission
pub async fn recover(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    let agency_id = auth_user.id;

    // We recover to 'sent' if it was sent, or 'opened' etc.
    // For simplicity, let's look up the previous status or just set to 'sent'
    // Actually, setting to 'sent' is safest.
    let update_data = json!({ "status": "sent" });

    let resp = state
        .pg
        .from("license_submissions")
        .update(serde_json::to_string(&update_data).unwrap())
        .eq("id", &id)
        .eq("agency_id", &agency_id)
        .execute()
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Failed to recover submission");
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;

    if !resp.status().is_success() {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to recover".to_string(),
        ));
    }

    Ok(StatusCode::OK)
}

#[derive(Debug, Deserialize)]
pub struct CreateAndSendRequest {
    pub template_id: String,
    pub docuseal_template_id: Option<i32>,
    pub client_name: String,
    pub client_email: String,
    pub talent_names: Option<String>,
    pub license_fee: Option<i64>,
    pub duration_days: Option<i32>,
    pub start_date: Option<String>,
    pub custom_terms: Option<String>,
    pub branding_color: Option<String>, // Optional customization
    pub logo_url: Option<String>,
}

/// POST /api/license-submissions/create-and-send
pub async fn create_and_send(
    State(state): State<AppState>,
    _auth_user: AuthUser,
    Json(req): Json<CreateAndSendRequest>,
) -> Result<Json<LicenseSubmission>, (StatusCode, String)> {
    // 1. Fetch the License Template (to ensure it exists & get agency_id)
    let template_resp = state
        .pg
        .from("license_templates")
        .select("*")
        .eq("id", &req.template_id)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let template_text = template_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let license_template: LicenseTemplate = serde_json::from_str(&template_text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let agency_id = license_template.agency_id;

    // 2. Initialize DocuSeal
    let docuseal_client = DocuSealClient::new(
        state.docuseal_api_key.clone(),
        state.docuseal_base_url.clone(),
    );

    let docuseal_template_id = req
        .docuseal_template_id
        .or(license_template.docuseal_template_id)
        .or_else(|| state.docuseal_master_template_id.parse::<i32>().ok())
        .ok_or((
            StatusCode::INTERNAL_SERVER_ERROR,
            "Invalid DS template id".to_string(),
        ))?;

    // 3. Build fields array for pre-filling (DocuSeal API standard format)
    let license_fee_val = req.license_fee.or(license_template.license_fee);
    let fee_str = license_fee_val
        .map(|c| format!("${:.2}", c as f64 / 100.0))
        .unwrap_or_default();

    let duration_days = req
        .duration_days
        .or(Some(license_template.duration_days))
        .unwrap_or(0);

    let start_date = req
        .start_date
        .clone()
        .or(license_template.start_date.clone())
        .unwrap_or_else(|| "-".to_string());

    let talent_names_val = req
        .talent_names
        .clone()
        .or(license_template.talent_name.clone());

    use crate::services::docuseal::SubmitterField;

    let mut fields = vec![
        SubmitterField {
            name: "Client/Brand Name".to_string(),
            default_value: Some(req.client_name.clone()),
            readonly: Some(true),
        },
        SubmitterField {
            name: "Talent Name".to_string(),
            default_value: Some(talent_names_val.clone().unwrap_or_default()),
            readonly: Some(true),
        },
        SubmitterField {
            name: "License Fee".to_string(),
            default_value: Some(fee_str.clone()),
            readonly: Some(true),
        },
        SubmitterField {
            name: "Category".to_string(),
            default_value: Some(license_template.category.clone()),
            readonly: Some(true),
        },
    ];

    if let Some(desc) = &license_template.description {
        fields.push(SubmitterField {
            name: "Description".to_string(),
            default_value: Some(desc.clone()),
            readonly: Some(true),
        });
    }

    if let Some(scope) = &license_template.usage_scope {
        fields.push(SubmitterField {
            name: "Usage Scope".to_string(),
            default_value: Some(scope.clone()),
            readonly: Some(true),
        });
    }

    fields.push(SubmitterField {
        name: "Territory".to_string(),
        default_value: Some(license_template.territory.clone()),
        readonly: Some(true),
    });

    fields.push(SubmitterField {
        name: "Exclusivity".to_string(),
        default_value: Some(license_template.exclusivity.clone()),
        readonly: Some(true),
    });

    fields.push(SubmitterField {
        name: "Duration".to_string(),
        default_value: Some(duration_days.to_string()),
        readonly: Some(true),
    });

    fields.push(SubmitterField {
        name: "Start Date".to_string(),
        default_value: Some(start_date.clone()),
        readonly: Some(true),
    });

    let combined_terms = format!(
        "{}\n{}",
        license_template.custom_terms.as_deref().unwrap_or_default(),
        req.custom_terms.as_deref().unwrap_or_default()
    );
    fields.push(SubmitterField {
        name: "Custom Terms".to_string(),
        default_value: Some(combined_terms),
        readonly: Some(true),
    });

    fields.push(SubmitterField {
        name: "Template Name".to_string(),
        default_value: Some(license_template.template_name.clone()),
        readonly: Some(true),
    });

    // 4. Create DocuSeal Submission with fields-based pre-fill
    let docuseal_submission = docuseal_client
        .create_submission_with_fields(
            docuseal_template_id,
            req.client_name.clone(),
            req.client_email.clone(),
            "First Party".to_string(),
            fields,
            true,
        )
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("DocuSeal Error: {}", e),
            )
        })?;

    // 5. Create the License Submission record in DB (Status = 'sent')
    let submission_data = json!({
        "agency_id": agency_id,
        "template_id": req.template_id,
        "docuseal_template_id": docuseal_template_id,
        "status": "sent",
        "client_name": req.client_name,
        "client_email": req.client_email,
        "talent_names": talent_names_val,
        "license_fee": license_fee_val,
        "duration_days": duration_days,
        "start_date": req.start_date.or(license_template.start_date),
        "custom_terms": req.custom_terms.or(license_template.custom_terms),
        "docuseal_submission_id": docuseal_submission.id,
        "docuseal_slug": docuseal_submission.slug,
        "sent_at": chrono::Utc::now().to_rfc3339(),
    });

    let insert_resp = state
        .pg
        .from("license_submissions")
        .insert(submission_data.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let insert_text = insert_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let created: Vec<LicenseSubmission> = serde_json::from_str(&insert_text).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to parse created submission: {}", e),
        )
    })?;

    let submission = created.first().ok_or((
        StatusCode::INTERNAL_SERVER_ERROR,
        "Failed to create submission".to_string(),
    ))?;

    // 6. Create Licensing Request record
    let talent_name = req.talent_names.clone().or(license_template.talent_name);

    let request_data = json!({
        "agency_id": agency_id,
        "submission_id": submission.id,
        "status": "pending",
        "campaign_title": format!("License Contract - {}", req.client_name),
        "client_name": req.client_name,
        "talent_name": talent_name,
        "usage_scope": license_template.usage_scope.clone(),
        "regions": license_template.territory.clone(),
        "budget_min": license_fee_val.unwrap_or(0) as f64 / 100.0,
        "budget_max": license_fee_val.unwrap_or(0) as f64 / 100.0,
    });

    // We don't error out if lr creation fails, but we try it
    let _ = state
        .pg
        .from("licensing_requests")
        .insert(request_data.to_string())
        .execute()
        .await;

    Ok(Json(submission.clone()))
}

#[derive(Debug, Deserialize)]
pub struct DocuSealWebhookEvent {
    pub event_type: String,
    pub timestamp: String,
    pub data: serde_json::Value,
}

/// POST /api/webhooks/license-contract
pub async fn handle_webhook(
    State(state): State<AppState>,
    Json(payload): Json<DocuSealWebhookEvent>,
) -> Result<axum::http::StatusCode, (axum::http::StatusCode, String)> {
    info!(
        event_type = %payload.event_type,
        "Received DocuSeal licensing webhook"
    );

    let status_update = match payload.event_type.as_str() {
        "submission.started" | "submission.opened" | "submission.viewed" | "form.started"
        | "form.viewed" => Some("opened"),
        "submission.completed" | "form.completed" => Some("completed"),
        "submission.declined" | "form.declined" => Some("declined"),
        _ => None,
    };

    if status_update.is_none() {
        return Ok(axum::http::StatusCode::OK);
    }

    let new_status = status_update.unwrap();
    let submission_id = payload.data["submission_id"]
        .as_i64()
        .or_else(|| payload.data["id"].as_i64())
        .ok_or_else(|| {
            error!("Missing submission id in licensing webhook payload");
            (
                axum::http::StatusCode::BAD_REQUEST,
                "Missing submission id".to_string(),
            )
        })?;

    let pg = Postgrest::new(format!("{}/rest/v1", state.supabase_url))
        .insert_header("apikey", &state.supabase_service_key)
        .insert_header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        );

    // Update license_submissions
    let sub_response = pg
        .from("license_submissions")
        .select("id")
        .eq("docuseal_submission_id", submission_id.to_string())
        .single()
        .execute()
        .await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if sub_response.status().is_success() {
        let sub_text = sub_response
            .text()
            .await
            .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let sub: serde_json::Value = serde_json::from_str(&sub_text)
            .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        if let Some(sub_id) = sub["id"].as_str() {
            let mut update_json = json!({ "status": new_status });
            if new_status == "completed" {
                update_json["signed_at"] = json!(chrono::Utc::now().to_rfc3339());

                // Extract signed document URL if available
                if let Some(url) = payload.data["documents"]
                    .as_array()
                    .and_then(|docs| docs.first())
                    .and_then(|doc| doc["url"].as_str())
                {
                    update_json["signed_document_url"] = json!(url);
                }
            } else if new_status == "declined" {
                update_json["declined_at"] = json!(chrono::Utc::now().to_rfc3339());
                if let Some(reason) = payload.data.get("decline_reason").and_then(|v| v.as_str()) {
                    update_json["decline_reason"] = json!(reason);
                }
            }

            let _ = pg
                .from("license_submissions")
                .update(update_json.to_string())
                .eq("id", sub_id)
                .execute()
                .await;

            // Also update licensing_requests if it exists
            let lr_status = match new_status {
                "completed" => "approved",
                "declined" => "rejected",
                _ => new_status,
            };

            let _ = pg
                .from("licensing_requests")
                .update(json!({ "status": lr_status }).to_string())
                .eq("submission_id", sub_id)
                .execute()
                .await;
        }
    }

    Ok(axum::http::StatusCode::OK)
}
