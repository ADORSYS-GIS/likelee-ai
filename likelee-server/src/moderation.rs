use crate::auth::AuthUser;
use crate::config::AppState;
use axum::{
    body::Bytes,
    extract::{Query, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use serde::{Deserialize, Serialize};
use tracing::info;

#[derive(Deserialize)]
pub struct ModerationBytesQuery {
    #[serde(default)]
    pub image_role: Option<String>,
}

#[derive(Deserialize)]
pub struct ModerationRequest {
    pub image_url: String,
    #[serde(default)]
    pub image_role: Option<String>,
}

#[derive(Serialize)]
pub struct ModerationLabelOut {
    pub name: String,
    pub confidence: f32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_name: Option<String>,
}

#[derive(Serialize)]
pub struct ModerationResponse {
    pub flagged: bool,
    pub labels: Vec<ModerationLabelOut>,
    pub provider: &'static str,
    pub label_count: usize,
    pub confidence_threshold: f32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
}

pub async fn moderate_image_bytes(
    State(state): State<AppState>,
    user: AuthUser,
    headers: HeaderMap,
    Query(q): Query<ModerationBytesQuery>,
    body: Bytes,
) -> Result<Json<ModerationResponse>, (StatusCode, String)> {
    let ct = headers
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();
    info!(
        bytes_len = body.len(),
        content_type = %ct,
        user_id = %user.id,
        role = ?q.image_role,
        "moderation-bytes: not implemented (rekognition removed)"
    );
    let out = ModerationResponse {
        flagged: false,
        labels: vec![],
        provider: "disabled",
        label_count: 0,
        confidence_threshold: 0.0,
        request_id: None,
    };
    Err((StatusCode::NOT_IMPLEMENTED, serde_json::to_string(&out).unwrap()))
}

pub async fn moderate_image(
    State(state): State<AppState>,
    user: AuthUser,
    Json(req): Json<ModerationRequest>,
) -> Result<Json<ModerationResponse>, (StatusCode, String)> {
    info!(
        image_url = %req.image_url,
        user_id = %user.id,
        role = ?req.image_role,
        "moderation: not implemented (rekognition removed)"
    );
    let out = ModerationResponse {
        flagged: false,
        labels: vec![],
        provider: "disabled",
        label_count: 0,
        confidence_threshold: 0.0,
        request_id: None,
    };
    Err((StatusCode::NOT_IMPLEMENTED, serde_json::to_string(&out).unwrap()))
}
