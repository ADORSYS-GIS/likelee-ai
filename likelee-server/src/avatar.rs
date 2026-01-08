use crate::config::AppState;
use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct GenerateAvatarRequest {
    pub user_id: String,
    pub brand_id: String,
    #[serde(default)]
    pub front_url: Option<String>,
    #[serde(default)]
    pub left_url: Option<String>,
    #[serde(default)]
    pub right_url: Option<String>,
}

#[derive(Serialize)]
pub struct GenerateAvatarResponse {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar_canonical_url: Option<String>,
}

pub async fn generate_avatar(
    State(state): State<AppState>,
    Json(req): Json<GenerateAvatarRequest>,
) -> Result<Json<GenerateAvatarResponse>, (StatusCode, String)> {
    // Log usage
    let event = crate::usage_logs::UsageEvent {
        face_id: req.user_id.clone(),
        brand_id: req.brand_id.clone(),
        usage_type: "image_gen".into(),
        metadata: serde_json::json!({
            "front_url": req.front_url,
            "left_url": req.left_url,
            "right_url": req.right_url,
        }),
    };
    crate::usage_logs::log_usage(&state, event).await;

    Ok(Json(GenerateAvatarResponse {
        avatar_canonical_url: None,
    }))
}
