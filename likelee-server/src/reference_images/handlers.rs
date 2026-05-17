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
use tracing::{error, info, warn};

use super::dto::{DeleteResponse, ErrorOut, UploadQuery, UploadResponse};
use super::repository;

pub async fn list_reference_images(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let json = repository::list_reference_images(&state, &user.id).await?;
    Ok(Json(json))
}

pub async fn delete_reference_image(
    State(state): State<AppState>,
    user: AuthUser,
    Path(section_id): Path<String>,
) -> Result<Json<DeleteResponse>, (StatusCode, String)> {
    let rows = repository::get_reference_images_for_section(&state, &user.id, &section_id).await?;
    if rows.is_empty() {
        return Err((StatusCode::NOT_FOUND, "reference image not found".into()));
    }

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

    repository::delete_reference_images_for_section(&state, &user.id, &section_id).await?;

    Ok(Json(DeleteResponse { deleted: true }))
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

    let payload = serde_json::json!({
        "user_id": user.id,
        "section_id": q.section_id,
        "storage_bucket": uploaded.bucket,
        "storage_path": uploaded.path,
        "public_url": public_url,
        "moderation_status": "approved",
    });

    let db_result = repository::insert_reference_image(&state, &payload).await;
    let mut source_id: Option<String> = None;
    if let Ok(value) = db_result {
        source_id = value
            .as_array()
            .and_then(|rows| rows.first())
            .cloned()
            .and_then(|row| {
                row.get("id")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            });
    } else {
        info!("insert reference_images failed; continuing");
    }

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
