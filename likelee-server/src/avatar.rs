use crate::auth::AuthUser;
use crate::config::AppState;
use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};
use serde_json::json;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct GenerateAvatarRequest {
    #[serde(default)]
    pub video_url: Option<String>,
}

#[derive(Serialize)]
pub struct GenerateAvatarResponse {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tavus_avatar_id: Option<String>,
    pub status: String,
}

pub async fn generate_avatar(
    _state: State<AppState>,
    _user: AuthUser,
    Json(_req): Json<GenerateAvatarRequest>,
) -> Result<Json<GenerateAvatarResponse>, (StatusCode, String)> {
    if state.tavus_api_key.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Tavus not configured".into()));
    }

    let user_id = req.user_id;

    let resp = state
        .pg
        .from("profiles")
        .select("id, cameo_front_url, tavus_avatar_id, tavus_avatar_status")
        .eq("id", &user_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status_ok = resp.status().is_success();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status_ok {
        return Err((StatusCode::INTERNAL_SERVER_ERROR, text));
    }
    let parsed: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let mut rows: Vec<serde_json::Value> = match parsed {
        serde_json::Value::Array(arr) => arr,
        other => {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("unexpected response from profiles select: {}", other),
            ))
        }
    };
    let row = rows
        .pop()
        .ok_or((StatusCode::BAD_REQUEST, "Profile not found".into()))?;

    if let Some(status) = row.get("tavus_avatar_status").and_then(|v| v.as_str()) {
        if status == "started" || status == "completed" {
            let id = row
                .get("tavus_avatar_id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            return Ok(Json(GenerateAvatarResponse {
                tavus_avatar_id: id,
                status: status.to_string(),
            }));
        }
    }

    let raw_url = req
        .video_url
        .or_else(|| {
            row.get("cameo_front_url")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        })
        .ok_or((
            StatusCode::BAD_REQUEST,
            "No training video available".into(),
        ))?;

    let (bucket, object) = parse_supabase_public_url(&raw_url).ok_or((
        StatusCode::BAD_REQUEST,
        "Unsupported video URL for signing".into(),
    ))?;

    let sign_url = format!(
        "{}/storage/v1/object/sign/{}/{}",
        state.supabase_url.trim_end_matches('/'),
        bucket,
        urlencoding::encode(&object)
    );
    let sign_body = json!({ "expiresIn": 3600 });
    let signed = reqwest::Client::new()
        .post(&sign_url)
        .header("apikey", &state.supabase_service_key)
        .header(
            "Authorization",
            format!("Bearer {}", &state.supabase_service_key),
        )
        .json(&sign_body)
        .send()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !signed.status().is_success() {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            signed.text().await.unwrap_or_default(),
        ));
    }
    let signed_json: serde_json::Value = signed
        .json()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let signed_path = signed_json
        .get("signedURL")
        .and_then(|v| v.as_str())
        .ok_or((StatusCode::INTERNAL_SERVER_ERROR, "sign failed".into()))?;
    let train_video_url = format!(
        "{}/storage/v1{}",
        state.supabase_url.trim_end_matches('/'),
        signed_path
    );

    let callback_url = if state.tavus_callback_url.is_empty() {
        None
    } else {
        Some(state.tavus_callback_url.clone())
    };

    let replica_name = format!("user-{}", Uuid::new_v4());
    let mut payload = json!({
        "replica_name": replica_name,
        "train_video_url": train_video_url,
    });
    if let Some(cb) = callback_url {
        payload["callback_url"] = json!(cb);
    }

    let tavus_url = format!("{}/v2/replicas", state.tavus_base_url.trim_end_matches('/'));
    let tavus_resp = reqwest::Client::new()
        .post(tavus_url)
        .header("Content-Type", "application/json")
        .header("x-api-key", &state.tavus_api_key)
        .json(&payload)
        .send()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    if !tavus_resp.status().is_success() {
        let body = tavus_resp.text().await.unwrap_or_default();
        return Err((StatusCode::BAD_GATEWAY, body));
    }
    let tavus_json: serde_json::Value = tavus_resp
        .json()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    let replica_id = tavus_json
        .get("replica_id")
        .and_then(|v| v.as_str())
        .ok_or((StatusCode::BAD_GATEWAY, "missing replica_id".into()))?;

    let update = json!({
        "tavus_avatar_id": replica_id,
        "tavus_avatar_status": "started",
    });
    state
        .pg
        .from("profiles")
        .update(update.to_string())
        .eq("id", &user_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(GenerateAvatarResponse {
        tavus_avatar_id: Some(replica_id.to_string()),
        status: "started".into(),
    }))
}

#[derive(Deserialize)]
pub struct StatusQuery {
    pub user_id: String,
}

pub async fn get_avatar_status(
    State(state): State<AppState>,
    axum::extract::Query(q): axum::extract::Query<StatusQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("profiles")
        .select("tavus_avatar_id, tavus_avatar_status, id")
        .eq("id", &q.user_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if rows.is_empty() {
        return Err((StatusCode::NOT_FOUND, "profile not found".into()));
    }
    let row = rows[0].clone();
    let replica_id = row
        .get("tavus_avatar_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let mut status = row
        .get("tavus_avatar_status")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown")
        .to_string();

    // If we have a replica_id, query Tavus for fresh status
    if !replica_id.is_empty() && !state.tavus_api_key.is_empty() {
        let url = format!(
            "{}/v2/replicas/{}",
            state.tavus_base_url.trim_end_matches('/'),
            replica_id
        );
        if let Ok(resp) = reqwest::Client::new()
            .get(url)
            .header("x-api-key", &state.tavus_api_key)
            .send()
            .await
        {
            if resp.status().is_success() {
                if let Ok(j) = resp.json::<serde_json::Value>().await {
                    if let Some(s) = j.get("status").and_then(|v| v.as_str()) {
                        status = s.to_string();
                    }
                    // Persist updated status
                    let _ = state
                        .pg
                        .from("profiles")
                        .update(json!({ "tavus_avatar_status": status }).to_string())
                        .eq("tavus_avatar_id", &replica_id)
                        .execute()
                        .await;
                }
            }
        }
    }

    Ok(Json(json!({ "replica_id": replica_id, "status": status })))
}

#[derive(Deserialize)]
pub struct TavusWebhookBody {
    pub replica_id: String,
    pub status: String,
}

pub async fn tavus_webhook(
    State(state): State<AppState>,
    _: axum::http::HeaderMap,
    Json(body): Json<TavusWebhookBody>,
) -> Result<StatusCode, (StatusCode, String)> {
    let status = body.status;
    let id = body.replica_id;
    let update = json!({ "tavus_avatar_status": status });
    state
        .pg
        .from("profiles")
        .update(update.to_string())
        .eq("tavus_avatar_id", id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(StatusCode::OK)
}

fn parse_supabase_public_url(url: &str) -> Option<(String, String)> {
    let marker = "/storage/v1/object/public/";
    let pos = url.find(marker)?;
    let rest = &url[pos + marker.len()..];
    let mut parts = rest.splitn(2, '/');
    let bucket = parts.next()?.to_string();
    let object = parts.next()?.to_string();
    Some((bucket, object))
}
