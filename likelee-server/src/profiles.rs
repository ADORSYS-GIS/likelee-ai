use crate::config::AppState;
use axum::{
    body::Bytes,
    extract::{Query, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use serde::{Deserialize, Serialize};
use tracing::{error, warn};

pub async fn upsert_profile(
    State(state): State<AppState>,
    Json(mut body): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let email = body
        .get("email")
        .and_then(|v| v.as_str())
        .ok_or((StatusCode::BAD_REQUEST, "missing email".to_string()))?
        .to_string();
    let now = chrono::Utc::now().to_rfc3339();
    if body.get("updated_date").is_none() {
        body["updated_date"] = serde_json::Value::String(now.clone());
    }

    let exists = match state
        .pg
        .from("profiles")
        .select("id")
        .eq("email", &email)
        .limit(1)
        .execute()
        .await
    {
        Ok(resp) => {
            let text = resp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let rows: serde_json::Value = serde_json::from_str(&text)
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            rows.as_array().map(|a| !a.is_empty()).unwrap_or(false)
        }
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("42703") || (msg.contains("relation") && msg.contains("does not exist"))
            {
                warn!(%msg, "profiles table missing; cannot upsert");
                return Err((
                    StatusCode::PRECONDITION_FAILED,
                    "profiles table missing".into(),
                ));
            }
            return Err((StatusCode::INTERNAL_SERVER_ERROR, msg));
        }
    };

    let body_str =
        serde_json::to_string(&body).map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    if exists {
        let resp = state
            .pg
            .from("profiles")
            .eq("email", &email)
            .update(body_str)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let text = resp.text().await.unwrap_or_else(|_| "{}".into());
        let v: serde_json::Value = serde_json::from_str(&text).unwrap_or(serde_json::json!({}));
        Ok(Json(v))
    } else {
        if body.get("created_date").is_none() {
            body["created_date"] = serde_json::Value::String(now);
        }
        let body_str =
            serde_json::to_string(&body).map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
        let resp = state
            .pg
            .from("profiles")
            .insert(body_str)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let text = resp.text().await.unwrap_or_else(|_| "{}".into());
        let v: serde_json::Value = serde_json::from_str(&text).unwrap_or(serde_json::json!({}));
        Ok(Json(v))
    }
}

#[derive(Deserialize)]
pub struct UploadQuery {
    pub user_id: String,
}

#[derive(Serialize)]
pub struct UploadResponse {
    pub public_url: String,
}

pub async fn upload_profile_photo(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(q): Query<UploadQuery>,
    body: Bytes,
) -> Result<Json<UploadResponse>, (StatusCode, String)> {
    if body.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "empty body".into()));
    }
    let ct = headers
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("image/jpeg")
        .to_string();

    let bucket = state.supabase_bucket_public.clone();
    let owner = q.user_id.replace(
        |c: char| !c.is_ascii_alphanumeric() && c != '_' && c != '-',
        "_",
    );
    let ext = match ct.as_str() {
        "image/png" => "png",
        "image/webp" => "webp",
        _ => "jpg",
    };
    let path = format!("avatars/{}/profile.{}", owner, ext);

    let storage_url = format!(
        "{}/storage/v1/object/{}/{}",
        state.supabase_url, bucket, path
    );
    let http = reqwest::Client::new();
    let up = http
        .post(&storage_url)
        .header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        )
        .header("apikey", state.supabase_service_key.clone())
        .header("content-type", ct)
        .header("x-upsert", "true")
        .body(body)
        .send()
        .await
        .map_err(|e| {
            let m = e.to_string();
            error!(error=%m, "storage upload error");
            (StatusCode::BAD_GATEWAY, m)
        })?;
    if !up.status().is_success() {
        let msg = up.text().await.unwrap_or_default();
        return Err((
            StatusCode::BAD_GATEWAY,
            format!("storage upload failed: {msg}"),
        ));
    }

    let public_url = format!(
        "{}/storage/v1/object/public/{}/{}",
        state.supabase_url, bucket, path
    );

    let update_payload = serde_json::json!({
        "profile_photo_url": public_url,
        "updated_date": chrono::Utc::now().to_rfc3339(),
    });

    let res = state
        .pg
        .from("profiles")
        .eq("id", &q.user_id)
        .update(update_payload.to_string())
        .execute()
        .await;
    if let Err(e) = res {
        let msg = format!("failed to update profile photo url: {}", e);
        error!(%msg);
        return Err((StatusCode::INTERNAL_SERVER_ERROR, msg));
    }

    Ok(Json(UploadResponse { public_url }))
}

#[derive(Deserialize)]
pub struct EmailQuery {
    pub email: String,
}
#[derive(Serialize)]
pub struct EmailAvailability {
    pub available: bool,
}

pub async fn check_email(
    State(state): State<AppState>,
    Query(q): Query<EmailQuery>,
) -> Result<Json<EmailAvailability>, (StatusCode, String)> {
    match state
        .pg
        .from("profiles")
        .select("id")
        .eq("email", &q.email)
        .limit(1)
        .execute()
        .await
    {
        Ok(resp) => {
            let text = resp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let rows: serde_json::Value = serde_json::from_str(&text)
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let exists = rows.as_array().map(|a| !a.is_empty()).unwrap_or(false);
            Ok(Json(EmailAvailability { available: !exists }))
        }
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("42703")
                || msg.contains("column") && msg.contains("does not exist")
                || msg.contains("relation") && msg.contains("does not exist")
            {
                warn!(%msg, "profiles table/email column missing; defaulting email available");
                return Ok(Json(EmailAvailability { available: true }));
            }
            Err((StatusCode::INTERNAL_SERVER_ERROR, msg))
        }
    }
}
