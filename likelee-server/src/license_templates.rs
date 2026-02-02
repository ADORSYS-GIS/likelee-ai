use crate::auth::AuthUser;
use crate::config::AppState;
use axum::{
    extract::{Path,State},
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
    pub pricing_range_min_cents: Option<i64>,
    pub pricing_range_max_cents: Option<i64>,
    pub additional_terms: Option<String>,
    pub usage_count: i32,
    pub created_at: Option<String>,
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
    pub pricing_range_min_cents: Option<i64>,
    pub pricing_range_max_cents: Option<i64>,
    pub additional_terms: Option<String>,
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

    let text = resp.text().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
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

    let text = resp.text().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
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

    let total_value: i64 = templates
        .iter()
        .map(|t| (t.pricing_range_min_cents.unwrap_or(0) + t.pricing_range_max_cents.unwrap_or(0)) / 2)
        .sum();
    
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
        "pricing_range_min_cents": payload.pricing_range_min_cents,
        "pricing_range_max_cents": payload.pricing_range_max_cents,
        "additional_terms": payload.additional_terms,
    });

    let resp = state
        .pg
        .from("license_templates")
        .insert(body.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp.text().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let created: Vec<LicenseTemplate> = serde_json::from_str(&text).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    created.into_iter().next().ok_or((StatusCode::INTERNAL_SERVER_ERROR, "Failed to create template".to_string()).into()).map(Json)
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
        "pricing_range_min_cents": payload.pricing_range_min_cents,
        "pricing_range_max_cents": payload.pricing_range_max_cents,
        "additional_terms": payload.additional_terms,
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

    let text = resp.text().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let updated: Vec<LicenseTemplate> = serde_json::from_str(&text).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    updated.into_iter().next().ok_or((StatusCode::NOT_FOUND, "Template not found".to_string()).into()).map(Json)
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

    let text = resp.text().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let originals: Vec<LicenseTemplate> = serde_json::from_str(&text).unwrap_or(vec![]);
    let original = originals.first().ok_or((StatusCode::NOT_FOUND, "Template not found".to_string()))?;

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
        "pricing_range_min_cents": original.pricing_range_min_cents,
        "pricing_range_max_cents": original.pricing_range_max_cents,
        "additional_terms": original.additional_terms,
        "usage_count": 0,
    });

    let create_resp = state
        .pg
        .from("license_templates")
        .insert(body.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let create_text = create_resp.text().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let created: Vec<LicenseTemplate> = serde_json::from_str(&create_text).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    created.into_iter().next().ok_or((StatusCode::INTERNAL_SERVER_ERROR, "Failed to copy template".to_string()).into()).map(Json)
}
