use crate::config::AppState;
use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};
use tracing::{error, info};

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
    State(state): State<AppState>,
    Json(req): Json<LivenessResultRequest>,
) -> Result<Json<LivenessResultResponse>, (StatusCode, String)> {
    let enabled = std::env::var("LIVENESS_ENABLED").unwrap_or_else(|_| "0".into()) != "0";
    if !enabled {
        return Err((
            StatusCode::PRECONDITION_REQUIRED,
            "liveness disabled".into(),
        ));
    }
    if state.rekog.is_none() {
        return Err((
            StatusCode::PRECONDITION_REQUIRED,
            "rekognition not configured".into(),
        ));
    }
    let client = state.rekog.as_ref().unwrap();
    let min_score: f32 = std::env::var("LIVENESS_MIN_SCORE")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(0.90);
    info!(session_id = %req.session_id, min_score, "liveness: fetching results");

    let res = client
        .get_face_liveness_session_results()
        .session_id(req.session_id.clone())
        .send()
        .await
        .map_err(|e| {
            let msg = format!("rekognition liveness error: dispatch failure: {e:?}");
            error!(error = %msg, "liveness: get results failed");
            (StatusCode::BAD_GATEWAY, msg)
        })?;

    let status = res.status().as_str().to_string();
    let score = res.confidence();
    let passed =
        status.eq_ignore_ascii_case("Succeeded") && score.map(|v| v >= min_score).unwrap_or(false);

    Ok(Json(LivenessResultResponse {
        status,
        score,
        passed,
    }))
}

pub async fn create_session(
    State(state): State<AppState>,
    Json(_req): Json<LivenessCreateRequest>,
) -> Result<Json<LivenessCreateResponse>, (StatusCode, String)> {
    let enabled = std::env::var("LIVENESS_ENABLED").unwrap_or_else(|_| "0".into()) != "0";
    if !enabled {
        return Err((
            StatusCode::PRECONDITION_REQUIRED,
            "liveness disabled".into(),
        ));
    }
    if state.rekog.is_none() {
        return Err((
            StatusCode::PRECONDITION_REQUIRED,
            "rekognition not configured".into(),
        ));
    }
    let client = state.rekog.as_ref().unwrap();
    info!("liveness: creating session");

    let res = client
        .create_face_liveness_session()
        .send()
        .await
        .map_err(|e| {
            let msg = format!("rekognition liveness error: dispatch failure: {e:?}");
            error!(error = %msg, "liveness: create session failed");
            (StatusCode::BAD_GATEWAY, msg)
        })?;

    let session_id = res.session_id().to_string();
    if session_id.is_empty() {
        return Err((
            StatusCode::BAD_GATEWAY,
            "missing session_id from rekognition".into(),
        ));
    }
    Ok(Json(LivenessCreateResponse { session_id }))
}
