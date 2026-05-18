use crate::state::AppState;
use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};
use tracing::info;

#[derive(Deserialize)]
pub struct LivenessResultRequest {
    pub session_id: String,
}

#[derive(Serialize)]
pub struct LivenessResultResponse {
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub score: Option<f32>,
    pub passed: bool,
}

#[derive(Deserialize)]
pub struct LivenessCreateRequest {
    #[serde(default)]
    pub user_id: Option<String>,
}

#[derive(Serialize)]
pub struct LivenessCreateResponse {
    pub session_id: String,
}

pub async fn liveness_result(
    State(_state): State<AppState>,
    Json(req): Json<LivenessResultRequest>,
) -> Result<Json<LivenessResultResponse>, (StatusCode, String)> {
    info!(
        session_id = %req.session_id,
        "liveness: not implemented (rekognition removed)"
    );
    let out = LivenessResultResponse {
        status: "disabled".into(),
        score: None,
        passed: false,
    };
    Err((
        StatusCode::NOT_IMPLEMENTED,
        serde_json::to_string(&out).unwrap(),
    ))
}

pub async fn create_session(
    State(_state): State<AppState>,
    Json(_req): Json<LivenessCreateRequest>,
) -> Result<Json<LivenessCreateResponse>, (StatusCode, String)> {
    info!("liveness: not implemented (rekognition removed)");
    let out = LivenessCreateResponse {
        session_id: "".into(),
    };
    Err((
        StatusCode::NOT_IMPLEMENTED,
        serde_json::to_string(&out).unwrap(),
    ))
}
