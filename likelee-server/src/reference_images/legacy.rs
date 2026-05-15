use crate::auth::AuthUser;
use crate::state::AppState;
use crate::storage::{
    canonical_object_path, delete_object, insert_asset_record, public_object_url,
    sanitize_file_name, soft_delete_asset_record, upload_object, StorageAssetRecord,
    StorageContextType, StorageOwnerType, StorageVisibility,
};
use axum::{
    body::Bytes,
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use serde::Deserialize;
use serde::Serialize;
use tracing::{error, info, warn};

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
    for r in rows.iter() {
        let row_id = r.get("id").and_then(|v| v.as_str()).unwrap_or("");
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
        if let Err(err) = delete_object(&state, bucket, path).await {
            error!(status=?err.0, body=%err.1, "reference image storage delete failed");
            return Err((
                StatusCode::BAD_GATEWAY,
                "failed to delete reference image from storage".into(),
            ));
        }
        if !row_id.is_empty() {
            if let Err(err) = soft_delete_asset_record(&state, "reference_images", row_id).await {
                warn!(reference_image_id = %row_id, error = %err.1, "failed to soft-delete storage_assets row for reference image");
            }
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

    let owner = user.id.replace(
        |c: char| !c.is_ascii_alphanumeric() && c != '_' && c != '-',
        "_",
    );
    let file_name = format!("section_{}.{}", q.section_id, ext);
    let path = canonical_object_path(
        &format!("likeness/{owner}/sections/{}", q.section_id),
        &sanitize_file_name(&file_name),
        chrono::Utc::now().timestamp_millis(),
    );
    let uploaded = upload_object(
        &state,
        StorageVisibility::Public,
        &path,
        body.to_vec(),
        Some(&ct),
    )
    .await
    .inspect_err(|err| {
        error!(error=%err.1, "storage upload error");
    })?;
    let public_url = uploaded
        .public_url
        .clone()
        .unwrap_or_else(|| public_object_url(&state, &uploaded.bucket, &uploaded.path));

    // 3) Persist to reference_images via Postgrest
    let payload = serde_json::json!({
        "user_id": user.id,
        "section_id": q.section_id,
        "storage_bucket": uploaded.bucket,
        "storage_path": uploaded.path,
        "public_url": public_url,
        "moderation_status": "approved",
    });
    match state
        .pg
        .from("reference_images")
        .insert(payload.to_string())
        .select("id")
        .execute()
        .await
    {
        Ok(resp) => {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_else(|_| "[]".into());
            if !status.is_success() {
                info!(status=?status, body=%text, "insert reference_images failed; continuing");
                return Ok(Json(UploadResponse {
                    public_url,
                    storage_bucket: payload
                        .get("storage_bucket")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    storage_path: payload
                        .get("storage_path")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                }));
            }
            let source_id = serde_json::from_str::<serde_json::Value>(&text)
                .ok()
                .and_then(|value| value.as_array().and_then(|rows| rows.first()).cloned())
                .and_then(|row| {
                    row.get("id")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string())
                });
            if let Some(source_id) = source_id {
                let storage_record = StorageAssetRecord {
                    owner_type: StorageOwnerType::Creator,
                    owner_id: user.id.clone(),
                    context_type: StorageContextType::ReferenceImage,
                    context_id: Some(q.section_id.clone()),
                    visibility: StorageVisibility::Public,
                    object_path: payload
                        .get("storage_path")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    original_file_name: Some(file_name.clone()),
                    mime_type: Some(ct.clone()),
                    size_bytes: Some(body.len() as i64),
                    checksum_sha256: None,
                    source_table: Some("reference_images".to_string()),
                    source_id: Some(source_id),
                    created_by: Some(user.id.clone()),
                    counts_toward_quota: false,
                };
                if let Err(err) = insert_asset_record(&state, &storage_record).await {
                    warn!(section_id = %q.section_id, user_id = %user.id, error = %err.1, "failed to mirror reference image into storage_assets");
                }
            }
        }
        Err(e) => {
            info!(err=%e, "insert reference_images failed; continuing");
        }
    }

    Ok(Json(UploadResponse {
        public_url,
        storage_bucket: payload
            .get("storage_bucket")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
        storage_path: payload
            .get("storage_path")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
    }))
}
