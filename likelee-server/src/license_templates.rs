use crate::auth::AuthUser;
use crate::config::AppState;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use base64::{engine::general_purpose, Engine as _};
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

fn extract_text_from_markdown(input: &str) -> String {
    use pulldown_cmark::{Event, Parser};
    let mut out = String::new();
    for ev in Parser::new(input) {
        match ev {
            Event::Text(t) | Event::Code(t) => {
                out.push_str(&t);
            }
            Event::SoftBreak | Event::HardBreak => {
                out.push('\n');
            }
            _ => {}
        }
    }
    out
}

fn extract_text_from_html(input: &str) -> String {
    let mut out = String::new();
    let mut in_tag = false;
    for ch in input.chars() {
        match ch {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ => {
                if !in_tag {
                    out.push(ch);
                }
            }
        }
    }
    out
}

fn render_template_to_pdf_data_uri(
    template_name: &str,
    contract_body: &str,
    contract_body_format: &str,
) -> Result<String, (StatusCode, String)> {
    use printpdf::{BuiltinFont, Mm, PdfDocument};

    let text = match contract_body_format {
        "html" => extract_text_from_html(contract_body),
        _ => extract_text_from_markdown(contract_body),
    };

    let (doc, page1, layer1) = PdfDocument::new(template_name, Mm(210.0), Mm(297.0), "Layer 1");
    let current_layer = doc.get_page(page1).get_layer(layer1);
    let font = doc
        .add_builtin_font(BuiltinFont::Helvetica)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Very simple text layout: single page, fixed-width lines.
    // This is enough to bootstrap DocuSeal template generation and builder workflow.
    let font_size = 11.0;
    let mut y = 280.0;
    for line in text.lines() {
        if y < 15.0 {
            break;
        }
        current_layer.use_text(line, font_size, Mm(15.0), Mm(y), &font);
        y -= 6.0;
    }

    let cursor = std::io::Cursor::new(Vec::<u8>::new());
    let mut writer = std::io::BufWriter::new(cursor);
    doc.save(&mut writer)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let bytes = writer
        .into_inner()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .into_inner();
    let base64_content = general_purpose::STANDARD.encode(bytes);
    Ok(format!("data:application/pdf;base64,{}", base64_content))
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
        "start_date": payload.start_date.filter(|s| !s.is_empty()),
        "contract_body": payload.contract_body,
        "contract_body_format": payload.contract_body_format,
    });

    let resp = state
        .pg
        .from("license_templates")
        .insert(body.to_string())
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
        "start_date": payload.start_date.filter(|s| !s.is_empty()),
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
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

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
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
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
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let create_status = create_resp.status();
    let create_text = create_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

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

    // 2. Fetch template from DB to get pre-fill values
    let mut values = None;
    let mut submitters = None;
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
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let text = resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let templates: Vec<LicenseTemplate> = serde_json::from_str(&text).unwrap_or_default();

        if let Some(license_template) = templates.first() {
            template_docuseal_id = license_template.docuseal_template_id;

            // Ensure DocuSeal template exists and is based on the latest contract body.
            // Licensing only: no master-template fallback, no PDF upload paths.
            let contract_body = license_template
                .contract_body
                .clone()
                .unwrap_or_default();
            let contract_body_format = license_template
                .contract_body_format
                .clone()
                .unwrap_or_else(|| "markdown".to_string());

            if !contract_body.trim().is_empty() {
                let document_base64 = render_template_to_pdf_data_uri(
                    &license_template.template_name,
                    &contract_body,
                    &contract_body_format,
                )?;

                let docuseal = DocuSealClient::new(
                    state.docuseal_api_key.clone(),
                    state.docuseal_base_url.clone(),
                );

                let ensured_id = if let Some(existing_id) = license_template.docuseal_template_id {
                    docuseal
                        .update_template_documents(
                            existing_id,
                            "contract.pdf".to_string(),
                            document_base64,
                        )
                        .await
                        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
                    existing_id
                } else {
                    let created = docuseal
                        .create_template(
                            license_template.template_name.clone(),
                            "contract.pdf".to_string(),
                            document_base64,
                        )
                        .await
                        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

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

            let talent_names = license_template.talent_name.clone().unwrap_or_default();
            let fee_str = format!(
                "${:.2}",
                license_template.license_fee.unwrap_or(0) as f64 / 100.0
            );
            let start_date = license_template
                .start_date
                .clone()
                .and_then(|date| {
                    chrono::NaiveDate::parse_from_str(&date, "%Y-%m-%d")
                        .ok()
                        .map(|parsed| parsed.format("%m/%d/%Y").to_string())
                        .or(Some(date))
                })
                .unwrap_or_default();

            let mut role_data = serde_json::Map::new();
            role_data.insert(
                "Client/Brand Name".to_string(),
                json!(license_template.client_name.clone().unwrap_or_default()),
            );
            role_data.insert("Talent Name".to_string(), json!(talent_names));
            role_data.insert("License Fee".to_string(), json!(fee_str));
            role_data.insert("Category".to_string(), json!(license_template.category));
            role_data.insert(
                "Description".to_string(),
                json!(license_template.description.clone().unwrap_or_default()),
            );
            role_data.insert(
                "Usage Scope".to_string(),
                json!(license_template.usage_scope.clone().unwrap_or_default()),
            );
            role_data.insert("Territory".to_string(), json!(license_template.territory));
            role_data.insert(
                "Exclusivity".to_string(),
                json!(license_template.exclusivity),
            );
            role_data.insert(
                "Duration".to_string(),
                json!(license_template.duration_days),
            );
            role_data.insert("Start Date".to_string(), json!(start_date));
            role_data.insert(
                "Custom Terms".to_string(),
                json!(license_template.custom_terms.clone().unwrap_or_default()),
            );
            role_data.insert(
                "Modifications Allowed".to_string(),
                json!(license_template.modifications_allowed.clone().unwrap_or_default()),
            );
            role_data.insert(
                "Template Name".to_string(),
                json!(license_template.template_name),
            );

            // Prepare submitters array for role pre-fill
            let mut fields_list = Vec::new();
            let mut values_map = serde_json::Map::new();

            for (k, v) in role_data.iter() {
                let val_str = if let Some(s) = v.as_str() {
                    s.to_string()
                } else {
                    v.to_string()
                };

                // Add to fields array (standard builder prop)
                fields_list.push(json!({
                    "name": k,
                    "default_value": val_str,
                    "value": val_str
                }));

                // Add to values map (standard submission pre-fill)
                values_map.insert(k.clone(), json!(val_str));
            }

            submitters = Some(json!([{
                "email": target_email.clone(),
                "role": "First Party",
                "fields": fields_list,
                "values": values_map
            }]));

            let mut final_values = serde_json::Map::new();
            final_values.insert("First Party".to_string(), json!(role_data));
            for (k, v) in role_data.iter() {
                final_values.insert(k.clone(), v.clone());
            }
            values = Some(serde_json::Value::Object(final_values));
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
            values.clone(),
            submitters,
        )
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(json!({
        "token": token,
        "values": values,
        "docuseal_user_email": state.docuseal_user_email.clone()
    })))
}
