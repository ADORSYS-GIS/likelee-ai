use crate::config::AppState;
use aws_sdk_rekognition as rekognition;
use axum::{
    body::Bytes,
    extract::{Query, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use tracing::{debug, error, info};

#[derive(Deserialize)]
pub struct ModerationBytesQuery {
    #[serde(default)]
    pub user_id: Option<String>,
    #[serde(default)]
    pub image_role: Option<String>,
}

#[derive(Deserialize)]
pub struct ModerationRequest {
    pub image_url: String,
    #[serde(default)]
    pub user_id: Option<String>,
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
    headers: HeaderMap,
    Query(q): Query<ModerationBytesQuery>,
    body: Bytes,
) -> Result<Json<ModerationResponse>, (StatusCode, String)> {
    if state.rekog.is_none() {
        return Err((
            StatusCode::PRECONDITION_REQUIRED,
            "rekognition not configured".into(),
        ));
    }
    let client = state.rekog.as_ref().unwrap();
    let ct = headers
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();
    info!(bytes_len = body.len(), content_type = %ct, user_id = ?q.user_id, role = ?q.image_role, "moderation-bytes: start");

    if body.len() > 20_000_000 {
        return Err((
            StatusCode::PAYLOAD_TOO_LARGE,
            "image too large; please upload <= 20MB".into(),
        ));
    }
    let image = rekognition::types::Image::builder()
        .bytes(body.to_vec().into())
        .build();
    let res = client
        .detect_moderation_labels()
        .image(image)
        .min_confidence(60.0)
        .send()
        .await
        .map_err(|e| {
            let msg = format!("rekognition error: dispatch failure: {e:?}");
            error!(error = %msg, "moderation-bytes: rekognition call failed");
            (StatusCode::BAD_GATEWAY, msg)
        })?;
    let labels_slice = res.moderation_labels();
    let request_id: Option<String> = None;
    debug!(
        label_count = labels_slice.len(),
        "moderation-bytes: rekognition returned labels"
    );
    let mut labels_out: Vec<ModerationLabelOut> = vec![];
    let mut flagged = false;
    for l in labels_slice.iter() {
        let name = l.name().unwrap_or("").to_string();
        let conf = l.confidence().unwrap_or(0.0);
        let parent = l.parent_name().map(|s| s.to_string());
        if conf >= 60.0 {
            flagged = true;
        }
        labels_out.push(ModerationLabelOut {
            name,
            confidence: conf,
            parent_name: parent,
        });
    }
    Ok(Json(ModerationResponse {
        flagged,
        labels: labels_out,
        provider: "aws_rekognition",
        label_count: labels_slice.len(),
        confidence_threshold: 60.0,
        request_id,
    }))
}

pub async fn moderate_image(
    State(state): State<AppState>,
    Json(req): Json<ModerationRequest>,
) -> Result<Json<ModerationResponse>, (StatusCode, String)> {
    if state.rekog.is_none() {
        return Err((
            StatusCode::PRECONDITION_REQUIRED,
            "rekognition not configured".into(),
        ));
    }
    let client = state.rekog.as_ref().unwrap();
    info!(image_url = %req.image_url, user_id = ?req.user_id, role = ?req.image_role, "moderation: start");

    let http = reqwest::Client::new();
    let resp = http
        .get(&req.image_url)
        .send()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, format!("fetch image error: {e}")))?;
    if !resp.status().is_success() {
        return Err((
            StatusCode::BAD_GATEWAY,
            format!("fetch image status {}", resp.status()),
        ));
    }
    let bytes = resp.bytes().await.map_err(|e| {
        (
            StatusCode::BAD_GATEWAY,
            format!("read image bytes error: {e}"),
        )
    })?;

    if bytes.len() > 20_000_000 {
        return Err((
            StatusCode::PAYLOAD_TOO_LARGE,
            "image too large; please upload <= 20MB".into(),
        ));
    }
    let image = rekognition::types::Image::builder()
        .bytes(bytes.to_vec().into())
        .build();
    let res = client
        .detect_moderation_labels()
        .image(image)
        .min_confidence(60.0)
        .send()
        .await
        .map_err(|e| {
            let msg = format!("rekognition error: dispatch failure: {e:?}");
            error!(error = %msg, "moderation: rekognition call failed");
            (StatusCode::BAD_GATEWAY, msg)
        })?;
    let labels_slice = res.moderation_labels();
    let request_id: Option<String> = None;
    debug!(
        label_count = labels_slice.len(),
        "moderation: rekognition returned labels"
    );
    let mut labels_out: Vec<ModerationLabelOut> = vec![];
    let mut flagged = false;
    for l in labels_slice.iter() {
        let name = l.name().unwrap_or("").to_string();
        let conf = l.confidence().unwrap_or(0.0);
        let parent = l.parent_name().map(|s| s.to_string());
        if conf >= 60.0 {
            flagged = true;
        }
        labels_out.push(ModerationLabelOut {
            name,
            confidence: conf,
            parent_name: parent,
        });
    }

    let payload = serde_json::json!({
        "image_url": req.image_url,
        "user_id": req.user_id,
        "image_role": req.image_role,
        "flagged": flagged,
        "labels": labels_out,
        "created_at": Utc::now().to_rfc3339(),
    });
    let body = serde_json::to_string(&payload).unwrap_or("{}".into());
    match state
        .pg
        .from("moderation_events")
        .insert(body)
        .execute()
        .await
    {
        Ok(_) => {}
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("relation") && msg.contains("does not exist") {
                tracing::warn!(%msg, "moderation_events table missing; skipping persistence");
            } else {
                tracing::debug!(%msg, "moderation_events insert error");
            }
        }
    }

    Ok(Json(ModerationResponse {
        flagged,
        labels: labels_out,
        provider: "aws_rekognition",
        label_count: labels_slice.len(),
        confidence_threshold: 60.0,
        request_id,
    }))
}
