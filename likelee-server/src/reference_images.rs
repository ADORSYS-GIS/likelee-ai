use crate::auth::AuthUser;
use crate::config::AppState;
use axum::{
    body::Bytes,
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use serde::Deserialize;
use serde::Serialize;
use tracing::{error, info};

#[derive(Deserialize)]
pub struct UploadQuery {
    pub section_id: String,
}

pub async fn list_reference_images(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // Query reference_images for this user via PostgREST and return raw JSON array
    let req = state
        .pg
        .from("reference_images")
        .select("*")
        .eq("user_id", &user.id)
        .order("created_at.desc");

    let resp = req.execute().await.map_err(|e| {
        let m = e.to_string();
        (StatusCode::BAD_GATEWAY, m)
    })?;

    let status = resp.status();
    let text = resp.text().await.unwrap_or_else(|_| "[]".into());

    if !status.is_success() {
        return Err(crate::errors::sanitize_db_error(status.as_u16(), text));
    }

    let json: serde_json::Value = serde_json::from_str(&text).unwrap_or(serde_json::json!([]));
    Ok(Json(json))
}

#[derive(Serialize)]
pub struct DeleteResponse {
    pub deleted: bool,
}

pub async fn delete_reference_image(
    State(state): State<AppState>,
    user: AuthUser,
    Path(section_id): Path<String>,
) -> Result<Json<DeleteResponse>, (StatusCode, String)> {
    // 1) Find all rows for user + section
    let rows_resp = state
        .pg
        .from("reference_images")
        .select("id,storage_bucket,storage_path")
        .eq("user_id", &user.id)
        .eq("section_id", &section_id)
        .order("created_at.desc")
        .execute()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    let rows_status = rows_resp.status();
    let rows_text = rows_resp
        .text()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    if !rows_status.is_success() {
        return Err(crate::errors::sanitize_db_error(
            rows_status.as_u16(),
            rows_text,
        ));
    }
    let rows: Vec<serde_json::Value> = serde_json::from_str(&rows_text).unwrap_or_else(|_| vec![]);
    if rows.is_empty() {
        return Err((StatusCode::NOT_FOUND, "reference image not found".into()));
    }

    // 2) Delete storage objects (STRICT)
    // If any storage deletion fails, do not delete DB rows.
    let http = reqwest::Client::new();
    for r in rows.iter() {
        let bucket = r
            .get("storage_bucket")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let path = r.get("storage_path").and_then(|v| v.as_str()).unwrap_or("");
        if bucket.is_empty() || path.is_empty() {
            return Err((
                StatusCode::BAD_GATEWAY,
                "missing storage metadata for reference image".into(),
            ));
        }
        let del_url = format!("{}/storage/v1/object/{}/{path}", state.supabase_url, bucket);
        let del = http
            .delete(&del_url)
            .header(
                "Authorization",
                format!("Bearer {}", state.supabase_service_key),
            )
            .header("apikey", state.supabase_service_key.clone())
            .send()
            .await
            .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
        let del_status = del.status();
        if !del_status.is_success() {
            let txt = del.text().await.unwrap_or_default();
            error!(status=?del_status, body=%txt, "reference image storage delete failed");
            return Err((
                StatusCode::BAD_GATEWAY,
                "failed to delete reference image from storage".into(),
            ));
        }
    }

    // 3) Delete all DB rows for this section (strict: storage already removed)
    let del_resp = state
        .pg
        .from("reference_images")
        .delete()
        .eq("user_id", &user.id)
        .eq("section_id", &section_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    let del_status = del_resp.status();
    let del_text = del_resp
        .text()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    if !del_status.is_success() {
        return Err(crate::errors::sanitize_db_error(
            del_status.as_u16(),
            del_text,
        ));
    }

    Ok(Json(DeleteResponse { deleted: true }))
}

#[derive(Serialize)]
pub struct UploadResponse {
    pub public_url: String,
    pub storage_bucket: String,
    pub storage_path: String,
}

#[derive(Serialize)]
pub struct ErrorOut {
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reasons: Option<Vec<String>>,
}

pub async fn upload_reference_image(
    State(state): State<AppState>,
    user: AuthUser,
    headers: HeaderMap,
    Query(q): Query<UploadQuery>,
    body: Bytes,
) -> Result<Json<UploadResponse>, (StatusCode, String)> {
    if body.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "empty body".into()));
    }

    if body.len() > 10_000_000 {
        let out = ErrorOut {
            message: "Please upload an image of 10 MB or less.".into(),
            reasons: None,
        };
        return Err((
            StatusCode::PAYLOAD_TOO_LARGE,
            serde_json::to_string(&out).unwrap(),
        ));
    }

    let ct = headers
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("image/jpeg")
        .to_string();

    let ext = match ct.as_str() {
        "image/png" => "png",
        "image/webp" => "webp",
        "image/jpeg" | "image/jpg" => "jpg",
        _ => {
            let out = ErrorOut {
                message: "Unsupported image type. Please upload a JPEG, PNG, or WEBP.".into(),
                reasons: None,
            };
            return Err((
                StatusCode::UNSUPPORTED_MEDIA_TYPE,
                serde_json::to_string(&out).unwrap(),
            ));
        }
    };

    if image::load_from_memory(&body).is_err() {
        let out = ErrorOut {
            message: "We couldn't read the image data.".into(),
            reasons: None,
        };
        return Err((
            StatusCode::BAD_REQUEST,
            serde_json::to_string(&out).unwrap(),
        ));
    }

    // 2) Upload to Supabase Storage (public bucket) using service key
    let bucket = state.supabase_bucket_public.clone();
    let owner = user.id.replace(
        |c: char| !c.is_ascii_alphanumeric() && c != '_' && c != '-',
        "_",
    );
    let path = format!(
        "likeness/{}/sections/{}/{}.{}",
        owner,
        q.section_id,
        chrono::Utc::now().timestamp_millis(),
        ext
    );

    let storage_url = format!(
        "{}/storage/v1/object/{}/{}",
        state.supabase_url, bucket, path
    );
    let http = reqwest::Client::builder()
        .http1_only()
        .tcp_keepalive(std::time::Duration::from_secs(30))
        .pool_idle_timeout(std::time::Duration::from_secs(30))
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .unwrap();
    let up = http
        .post(&storage_url)
        .header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        )
        .header("apikey", state.supabase_service_key.clone())
        .header("content-type", ct)
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

    // 3) Persist to reference_images via Postgrest
    let payload = serde_json::json!({
        "user_id": user.id,
        "section_id": q.section_id,
        "storage_bucket": bucket,
        "storage_path": path,
        "public_url": public_url,
        "moderation_status": "approved",
    });
    match state
        .pg
        .from("reference_images")
        .insert(payload.to_string())
        .execute()
        .await
    {
        Ok(_) => {}
        Err(e) => {
            info!(err=%e, "insert reference_images failed; continuing");
        }
    }

    Ok(Json(UploadResponse {
        public_url,
        storage_bucket: bucket,
        storage_path: path,
    }))
}
