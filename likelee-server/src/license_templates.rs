use crate::auth::AuthUser;
use crate::config::AppState;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Debug, Serialize, Deserialize)]
pub struct LicenseTemplate {
    pub id: String,
    pub agency_id: String,
    pub template_name: String,
    pub category: String,
    pub description: Option<String>,
    pub usage_scope: Option<String>,
    pub duration_days: i32,
    pub territory: String,
    pub exclusivity: String,
    pub modifications_allowed: Option<String>,
    pub license_fee: Option<i64>,
    pub custom_terms: Option<String>,
    pub usage_count: i32,
    pub created_at: Option<String>,
    pub docuseal_template_id: Option<i32>,
    pub client_name: Option<String>,
    pub talent_name: Option<String>,
    pub start_date: Option<String>,
    pub contract_body: Option<String>,
    pub contract_body_format: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTemplateRequest {
    pub template_name: String,
    pub category: String,
    pub description: Option<String>,
    pub usage_scope: Option<String>,
    pub duration_days: i32,
    pub territory: String,
    pub exclusivity: String,
    pub modifications_allowed: Option<String>,
    pub license_fee: Option<i64>,
    pub custom_terms: Option<String>,
    pub docuseal_template_id: Option<i32>,
    pub client_name: Option<String>,
    pub talent_name: Option<String>,
    pub start_date: Option<String>,
    pub contract_body: Option<String>,
    pub contract_body_format: Option<String>,
}

/// Render contract body (MD or HTML) into a clean, styled HTML document for DocuSeal
fn render_contract_to_html(body: &str, format: &str) -> String {
    let content_html = if format == "markdown" {
        use pulldown_cmark::{html, Parser};
        let parser = Parser::new(body);
        let mut html_output = String::new();
        html::push_html(&mut html_output, parser);
        html_output
    } else {
        body.to_string() // Already HTML
    };

    format!(
        r#"
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{
                    font-family: 'Helvetica', 'Arial', sans-serif;
                    line-height: 1.6;
                    color: #1a202c;
                    margin: 0;
                    padding: 0;
                }}
                .container {{
                    max-width: 800px;
                    margin: 0 auto;
                }}
                h1 {{ font-size: 24pt; color: #1a202c; margin-bottom: 24pt; }}
                h2 {{ font-size: 18pt; color: #2d3748; margin-top: 24pt; margin-bottom: 12pt; border-bottom: 1px solid #e2e8f0; }}
                p {{ margin-bottom: 12pt; text-align: justify; }}
                strong {{ font-weight: bold; }}
                hr {{ border: 0; border-top: 1px solid #cbd5e0; margin: 24pt 0; }}
                ul, ol {{ margin-bottom: 12pt; padding-left: 24pt; }}
                li {{ margin-bottom: 6pt; }}
            </style>
        </head>
        <body>
            <div class="container">
                {}
            </div>
        </body>
        </html>
        "#,
        content_html
    )
}

/// Replace placeholders like {client_name} with actual values
fn replace_placeholders(text: &str, values: &std::collections::HashMap<String, String>) -> String {
    use regex::Regex;
    let re = Regex::new(r"\{(\w+)\}").unwrap();

    re.replace_all(text, |caps: &regex::Captures| {
        let key = &caps[1];
        values
            .get(key)
            .cloned()
            .unwrap_or_else(|| caps[0].to_string())
    })
    .to_string()
}

#[derive(Debug, Serialize)]
pub struct TemplateStats {
    pub total_templates: i64,
    pub categories: i64,
    pub most_used: String,
    pub avg_deal_value: String,
}

/// GET /api/license-templates
pub async fn list(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<Vec<LicenseTemplate>>, (StatusCode, String)> {
    let agency_id = auth_user.id;

    let resp = state
        .pg
        .from("license_templates")
        .select("*")
        .eq("agency_id", agency_id)
        .order("created_at.desc")
        .execute()
        .await
        .map_err(|e| crate::errors::handle_error(e, "list_license_templates"))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| crate::errors::handle_error(e, "list_license_templates_read_body"))?;

    if !status.is_success() {
        return Err(crate::errors::sanitize_db_error(status.as_u16(), text));
    }

    let templates: Vec<LicenseTemplate> = serde_json::from_str(&text).unwrap_or(vec![]);
    Ok(Json(templates))
}

/// GET /api/license-templates/stats
pub async fn stats(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<TemplateStats>, (StatusCode, String)> {
    let agency_id = auth_user.id;

    let resp = state
        .pg
        .from("license_templates")
        .select("*")
        .eq("agency_id", agency_id)
        .execute()
        .await
        .map_err(|e| crate::errors::handle_error(e, "license_templates"))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| crate::errors::handle_error(e, "license_templates"))?;

    if !status.is_success() {
        return Err((
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
            text,
        ));
    }

    let templates: Vec<LicenseTemplate> = serde_json::from_str(&text).unwrap_or(vec![]);

    let total_templates = templates.len() as i64;

    let categories = templates
        .iter()
        .map(|t| t.category.clone())
        .collect::<std::collections::HashSet<_>>()
        .len() as i64;

    let _most_used = templates
        .iter()
        .max_by_key(|t| t.usage_count)
        .map(|t| t.category.clone());

    // Calculating most used category correctly:
    let mut category_usage = std::collections::HashMap::new();
    for t in &templates {
        *category_usage.entry(t.category.clone()).or_insert(0) += t.usage_count;
    }
    let most_used_category = category_usage
        .into_iter()
        .max_by_key(|&(_, count)| count)
        .map(|(cat, _)| cat)
        .unwrap_or("None".to_string());

    let total_value: i64 = templates.iter().map(|t| t.license_fee.unwrap_or(0)).sum();

    let avg_val = if total_templates > 0 {
        total_value as f64 / total_templates as f64
    } else {
        0.0
    };

    let avg_deal_value = if avg_val >= 100000.0 {
        format!("${:.1}K", avg_val / 100000.0)
    } else {
        format!("${:.0}", avg_val / 100.0)
    };

    Ok(Json(TemplateStats {
        total_templates,
        categories,
        most_used: most_used_category,
        avg_deal_value,
    }))
}

/// POST /api/license-templates
pub async fn create(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<CreateTemplateRequest>,
) -> Result<Json<LicenseTemplate>, (StatusCode, String)> {
    let agency_id = auth_user.id;

    let body = json!({
        "agency_id": agency_id,
        "template_name": payload.template_name,
        "category": payload.category,
        "description": payload.description,
        "usage_scope": payload.usage_scope,
        "duration_days": payload.duration_days,
        "territory": payload.territory,
        "exclusivity": payload.exclusivity,
        "modifications_allowed": payload.modifications_allowed,
        "license_fee": payload.license_fee,
        "custom_terms": payload.custom_terms,
        "docuseal_template_id": payload.docuseal_template_id,
        "client_name": payload.client_name,
        "talent_name": payload.talent_name,
        "start_date": payload.start_date,
        "contract_body": payload.contract_body,
        "contract_body_format": payload.contract_body_format,
    });

    let resp = state
        .pg
        .from("license_templates")
        .insert(body.to_string())
        .execute()
        .await
        .map_err(|e| crate::errors::handle_error(e, "license_templates"))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| crate::errors::handle_error(e, "license_templates"))?;

    if !status.is_success() {
        return Err((
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
            text,
        ));
    }

    let created: Vec<LicenseTemplate> = serde_json::from_str(&text).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!(
                "Failed to parse created template: {}. Raw response: {}",
                e, text
            ),
        )
    })?;

    created
        .into_iter()
        .next()
        .ok_or((
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to create template (empty response)".to_string(),
        ))
        .map(Json)
}

/// PUT /api/license-templates/:id
pub async fn update(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<CreateTemplateRequest>,
) -> Result<Json<LicenseTemplate>, (StatusCode, String)> {
    let agency_id = auth_user.id;

    let body = json!({
        "template_name": payload.template_name,
        "category": payload.category,
        "description": payload.description,
        "usage_scope": payload.usage_scope,
        "duration_days": payload.duration_days,
        "territory": payload.territory,
        "exclusivity": payload.exclusivity,
        "modifications_allowed": payload.modifications_allowed,
        "license_fee": payload.license_fee,
        "custom_terms": payload.custom_terms,
        "docuseal_template_id": payload.docuseal_template_id,
        "client_name": payload.client_name,
        "talent_name": payload.talent_name,
        "start_date": payload.start_date,
        "contract_body": payload.contract_body,
        "contract_body_format": payload.contract_body_format,
        "updated_at": chrono::Utc::now().to_rfc3339(),
    });

    let resp = state
        .pg
        .from("license_templates")
        .update(body.to_string())
        .eq("id", id)
        .eq("agency_id", agency_id)
        .execute()
        .await
        .map_err(|e| crate::errors::handle_error(e, "license_templates"))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| crate::errors::handle_error(e, "license_templates"))?;

    if !status.is_success() {
        return Err((
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
            text,
        ));
    }

    let updated: Vec<LicenseTemplate> = serde_json::from_str(&text).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!(
                "Failed to parse updated template: {}. Raw response: {}",
                e, text
            ),
        )
    })?;

    updated
        .into_iter()
        .next()
        .ok_or((StatusCode::NOT_FOUND, "Template not found".to_string()))
        .map(Json)
}

/// DELETE /api/license-templates/:id
pub async fn delete_template(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    let agency_id = auth_user.id;

    state
        .pg
        .from("license_templates")
        .delete()
        .eq("id", id)
        .eq("agency_id", agency_id)
        .execute()
        .await
        .map_err(|e| crate::errors::handle_error(e, "license_templates"))?;

    Ok(StatusCode::NO_CONTENT)
}

/// POST /api/license-templates/:id/copy
pub async fn copy(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<LicenseTemplate>, (StatusCode, String)> {
    let agency_id = auth_user.id;

    // 1. Fetch original
    let resp = state
        .pg
        .from("license_templates")
        .select("*")
        .eq("id", id)
        .eq("agency_id", &agency_id)
        .execute()
        .await
        .map_err(|e| crate::errors::handle_error(e, "license_templates"))?;

    let text = resp
        .text()
        .await
        .map_err(|e| crate::errors::handle_error(e, "license_templates"))?;
    let originals: Vec<LicenseTemplate> = serde_json::from_str(&text).unwrap_or(vec![]);
    let original = originals
        .first()
        .ok_or((StatusCode::NOT_FOUND, "Template not found".to_string()))?;

    // 2. Create copy
    let new_name = format!("{} (Copy)", original.template_name);

    let body = json!({
        "agency_id": agency_id,
        "template_name": new_name,
        "category": original.category,
        "description": original.description,
        "usage_scope": original.usage_scope,
        "duration_days": original.duration_days,
        "territory": original.territory,
        "exclusivity": original.exclusivity,
        "modifications_allowed": original.modifications_allowed,
        "license_fee": original.license_fee,
        "custom_terms": original.custom_terms,
        "client_name": original.client_name,
        "talent_name": original.talent_name,
        "start_date": original.start_date,
        "usage_count": 0,
    });

    let create_resp = state
        .pg
        .from("license_templates")
        .insert(body.to_string())
        .execute()
        .await
        .map_err(|e| crate::errors::handle_error(e, "license_templates"))?;

    let create_status = create_resp.status();
    let create_text = create_resp
        .text()
        .await
        .map_err(|e| crate::errors::handle_error(e, "license_templates"))?;

    if !create_status.is_success() {
        return Err((
            StatusCode::from_u16(create_status.as_u16())
                .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
            create_text,
        ));
    }

    let created: Vec<LicenseTemplate> = serde_json::from_str(&create_text).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!(
                "Failed to parse copied template: {}. Raw response: {}",
                e, create_text
            ),
        )
    })?;

    created
        .into_iter()
        .next()
        .ok_or((
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to copy template".to_string(),
        ))
        .map(Json)
}

#[derive(Debug, Deserialize)]
pub struct BuilderTokenRequest {
    pub template_name: String,
    pub docuseal_template_id: Option<i32>,
    pub external_id: Option<String>,
    pub contract_body: Option<String>,
    pub builder_roles: Option<Vec<String>>,
}

pub async fn create_builder_token(
    State(state): State<AppState>,
    _auth_user: AuthUser,
    Json(req): Json<BuilderTokenRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    use crate::services::docuseal::DocuSealClient;

    // 1. Determine the template ID to look up in our database
    let template_id = if let Some(ext_id) = &req.external_id {
        if ext_id.starts_with("temp-") {
            let stripped = ext_id.strip_prefix("temp-").unwrap_or(ext_id);
            if let Some(last_hyphen_idx) = stripped.rfind('-') {
                stripped[..last_hyphen_idx].to_string()
            } else {
                stripped.to_string()
            }
        } else {
            ext_id.clone()
        }
    } else {
        req.docuseal_template_id
            .map(|id| id.to_string())
            .unwrap_or_default()
    };

    // 2. Fetch template from DB to ensure DocuSeal template is up-to-date
    let target_email = state.docuseal_user_email.clone();
    let mut template_docuseal_id: Option<i32> = None;

    if !template_id.is_empty() {
        let resp = state
            .pg
            .from("license_templates")
            .select("*")
            .eq("id", &template_id)
            .execute()
            .await
            .map_err(|e| crate::errors::handle_error(e, "license_templates"))?;

        let text = resp
            .text()
            .await
            .map_err(|e| crate::errors::handle_error(e, "license_templates"))?;
        let templates: Vec<LicenseTemplate> = serde_json::from_str(&text).unwrap_or_default();

        if let Some(license_template) = templates.first() {
            template_docuseal_id = license_template.docuseal_template_id;

            // Ensure DocuSeal template exists and is based on the latest contract body.
            // Licensing only: no master-template fallback, no PDF upload paths.
            // Use the provided contract_body if available, otherwise use the template's body.
            let contract_body = req
                .contract_body
                .clone()
                .or_else(|| license_template.contract_body.clone())
                .unwrap_or_default();

            let contract_body_format = license_template
                .contract_body_format
                .clone()
                .unwrap_or_else(|| "markdown".to_string());

            if !contract_body.trim().is_empty() {
                // Build replacement map from template data
                let mut replacements = std::collections::HashMap::new();
                replacements.insert(
                    "client_name".to_string(),
                    license_template.client_name.clone().unwrap_or_default(),
                );
                replacements.insert(
                    "talent_name".to_string(),
                    license_template.talent_name.clone().unwrap_or_default(),
                );
                replacements.insert(
                    "template_name".to_string(),
                    license_template.template_name.clone(),
                );
                replacements.insert("category".to_string(), license_template.category.clone());
                replacements.insert(
                    "description".to_string(),
                    license_template.description.clone().unwrap_or_default(),
                );
                replacements.insert(
                    "usage_scope".to_string(),
                    license_template.usage_scope.clone().unwrap_or_default(),
                );
                replacements.insert("territory".to_string(), license_template.territory.clone());
                replacements.insert(
                    "exclusivity".to_string(),
                    license_template.exclusivity.clone(),
                );
                replacements.insert(
                    "duration_days".to_string(),
                    license_template.duration_days.to_string(),
                );
                replacements.insert(
                    "modifications_allowed".to_string(),
                    license_template
                        .modifications_allowed
                        .clone()
                        .unwrap_or_default(),
                );
                replacements.insert(
                    "custom_terms".to_string(),
                    license_template.custom_terms.clone().unwrap_or_default(),
                );

                // Format license fee
                let fee_str = format!(
                    "${:.2}",
                    license_template.license_fee.unwrap_or(0) as f64 / 100.0
                );
                replacements.insert("license_fee".to_string(), fee_str);

                // Format start date
                let start_date_str = license_template
                    .start_date
                    .clone()
                    .unwrap_or_else(|| "-".to_string());
                replacements.insert("start_date".to_string(), start_date_str);

                // Perform placeholder replacement
                let rendered_contract = replace_placeholders(&contract_body, &replacements);

                let document_html =
                    render_contract_to_html(&rendered_contract, &contract_body_format);

                let docuseal = DocuSealClient::new(
                    state.docuseal_api_key.clone(),
                    state.docuseal_base_url.clone(),
                );

                // IMPORTANT: Do not replace/update template documents on every builder open.
                // Updating the underlying document can wipe previously placed fields in DocuSeal.
                // We only create a template when missing; otherwise reuse the existing template.
                let ensured_id = if let Some(existing_id) = license_template.docuseal_template_id {
                    existing_id
                } else {
                    let created = docuseal
                        .create_template_from_html(
                            license_template.template_name.clone(),
                            document_html,
                        )
                        .await
                        .map_err(|e| crate::errors::handle_error(e, "docuseal_create_template"))?;

                    // Persist DS template id back to license_templates
                    let update_json = json!({
                        "docuseal_template_id": created.id,
                        "updated_at": chrono::Utc::now().to_rfc3339(),
                    });
                    let _ = state
                        .pg
                        .from("license_templates")
                        .update(update_json.to_string())
                        .eq("id", &license_template.id)
                        .execute()
                        .await;

                    created.id
                };

                template_docuseal_id = Some(ensured_id);
            }
        }
    }

    // 3. Determine DocuSeal template
    // Licensing only: do not use master template fallback.
    let docuseal_template_id = template_docuseal_id.or(req.docuseal_template_id).ok_or((
        StatusCode::BAD_REQUEST,
        "docuseal_template_id_missing".to_string(),
    ))?;

    let docuseal = DocuSealClient::new(
        state.docuseal_api_key.clone(),
        state.docuseal_base_url.clone(),
    );

    let token = docuseal
        .create_builder_token_with_external_id(
            target_email.clone(),
            target_email.clone(),
            target_email.clone(),
            Some(docuseal_template_id),
            req.external_id,
            None, // No values - we pre-fill in the PDF itself
            req.builder_roles.clone().map(|roles| {
                json!(roles
                    .into_iter()
                    .map(|role| json!({ "role": role }))
                    .collect::<Vec<_>>())
            }),
        )
        .map_err(|e| crate::errors::handle_error(e, "license_templates"))?;

    Ok(Json(json!({
        "token": token,
        "docuseal_user_email": state.docuseal_user_email.clone()
    })))
}
