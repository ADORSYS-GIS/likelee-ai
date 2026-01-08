use axum::{extract::{Query, State}, http::StatusCode, Json};
use crate::config::AppState;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tracing::{error, info};

#[derive(Deserialize)]
pub struct UsageLogsQuery {
    pub agency_id: Option<String>,
    pub face_id: Option<String>,
    pub limit: Option<i64>,
}

pub struct UsageEvent {
    pub face_id: String,
    pub brand_id: String,
    pub usage_type: String,
    pub metadata: serde_json::Value,
}

pub async fn log_usage(state: &AppState, event: UsageEvent) {
    let payload = json!({
        "face_id": event.face_id,
        "brand_id": event.brand_id,
        "usage_type": event.usage_type,
        "metadata": event.metadata,
    });

    info!(face_id = %event.face_id, brand_id = %event.brand_id, usage_type = %event.usage_type, "Logging face usage");

    match state
        .pg
        .from("face_usage_logs")
        .insert(payload.to_string())
        .execute()
        .await
    {
        Ok(resp) => {
            if !resp.status().is_success() {
                let status = resp.status();
                let text = resp.text().await.unwrap_or_default();
                error!(%status, "Failed to log face usage: {}", text);
            }
        }
        Err(e) => {
            error!(error = %e, "Failed to connect to DB for usage logging");
        }
    }
}

pub async fn get_usage_logs(
    State(state): State<AppState>,
    Query(q): Query<UsageLogsQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let mut builder = state.pg.from("face_usage_logs").select("*, profiles!face_id(id, full_name, profile_photo_url), organization_profiles!brand_id(id, organization_name)");

    if let Some(face_id) = q.face_id {
        builder = builder.eq("face_id", face_id);
    }

    // If agency_id is provided, we should filter by faces belonging to that agency.
    // However, the current schema might not have a direct mapping in a simple way without a complex join.
    // For now, if face_id is not provided but agency_id is, we'll try to join with agency_users.
    
    let limit = q.limit.unwrap_or(50);
    let resp = builder
        .order("created_at.desc")
        .limit(limit as usize)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp.text().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let json: serde_json::Value = serde_json::from_str(&text).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(json))
}

#[derive(Deserialize)]
pub struct SimulateUsageBody {
    pub target_name: String, // e.g., "Aaron"
    pub usage_type: String, // "image_gen", "voice_clone"
}

pub async fn simulate_usage(
    State(state): State<AppState>,
    Json(body): Json<SimulateUsageBody>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // 1. Find or Create Profile (Face)
    // We try to find a profile with this full_name or create one.
    // Note: full_name isn't unique, so we just take the first one or create new.
    let face_resp = state
        .pg
        .from("profiles")
        .select("id")
        .eq("full_name", &body.target_name)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let face_text = face_resp.text().await.unwrap_or_else(|_| "[]".into());
    let face_json: serde_json::Value = serde_json::from_str(&face_text).unwrap_or(serde_json::json!([]));
    
    let face_id = if let Some(row) = face_json.as_array().and_then(|a| a.first()) {
        row.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string()
    } else {
        // Create
        let new_profile_resp = state
            .pg
            .from("profiles")
            .insert(json!({ "full_name": body.target_name }).to_string())
            .select("id")
            .single()
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            
        let new_profile_text = new_profile_resp.text().await.unwrap_or_else(|_| "{}".into());
        let new_profile_json: serde_json::Value = serde_json::from_str(&new_profile_text).unwrap_or(serde_json::json!({}));
         new_profile_json.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string()
    };

    if face_id.is_empty() {
         return Err((StatusCode::INTERNAL_SERVER_ERROR, "Failed to find or create profile".to_string()));
    }

    // 2. Find or Create Organization (Brand)
    let brand_name = "Test Brand Inc.";
    let brand_resp = state
        .pg
        .from("organization_profiles")
        .select("id")
        .eq("organization_name", brand_name)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    
    let brand_text = brand_resp.text().await.unwrap_or_else(|_| "[]".into());
    let brand_json: serde_json::Value = serde_json::from_str(&brand_text).unwrap_or(serde_json::json!([]));
    
    let brand_id = if let Some(row) = brand_json.as_array().and_then(|a| a.first()) {
        row.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string()
    } else {
        // Create dummy owner UUID
        let dummy_owner = uuid::Uuid::new_v4();
        let email = "test@brand.com";
        let new_brand_resp = state
            .pg
            .from("organization_profiles")
            .insert(json!({
                "organization_name": brand_name,
                "owner_user_id": dummy_owner.to_string(),
                "email": email,
                "status": "active"
            }).to_string())
            .select("id")
            .single()
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            
        let new_brand_text = new_brand_resp.text().await.unwrap_or_else(|_| "{}".into());
        let new_brand_json: serde_json::Value = serde_json::from_str(&new_brand_text).unwrap_or(serde_json::json!({}));
        new_brand_json.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string()
    };
    
    if brand_id.is_empty() {
         return Err((StatusCode::INTERNAL_SERVER_ERROR, "Failed to find or create brand".to_string()));
    }

    // 3. Log Usage
    let event = UsageEvent {
        face_id: face_id.clone(),
        brand_id: brand_id.clone(),
        usage_type: body.usage_type.clone(),
        metadata: json!({
            "simulated": true,
            "simulated_at": chrono::Utc::now().to_rfc3339(),
            "note": "Generated via Test Button"
        }),
    };

    log_usage(&state, event).await;

    Ok(Json(json!({
        "success": true,
        "message": format!("Simulated {} usage for {}", body.usage_type, body.target_name),
        "face_id": face_id,
        "brand_id": brand_id
    })))
}
