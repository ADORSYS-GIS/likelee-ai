use crate::{
    auth::AuthUser,
    config::AppState,
    errors::sanitize_db_error,
    storage::{
        canonical_object_path, delete_object, insert_asset_record, sanitize_file_name,
        soft_delete_asset_record, upload_object, StorageAssetRecord, StorageContextType,
        StorageOwnerType, StorageVisibility,
    },
    team::require_brand_access,
};
use axum::{
    extract::{Multipart, Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use tracing::{info, warn};

#[derive(Serialize)]
pub struct BrandStorageUsageOut {
    pub used_bytes: i64,
    pub limit_bytes: i64,
}

#[derive(Deserialize)]
pub struct CreateBrandFolderIn {
    pub name: String,
    pub parent_id: Option<String>,
}

#[derive(Deserialize)]
pub struct ListBrandFilesQuery {
    pub folder_id: Option<String>,
    pub root_only: Option<bool>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
    pub mime_type: Option<String>,
    pub source_type: Option<String>,
}

#[derive(Deserialize)]
pub struct ListBrandFoldersQuery {
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

#[derive(Deserialize)]
pub struct UpdateBrandFolderIn {
    pub name: Option<String>,
}

#[derive(Serialize)]
pub struct BrandFileUploadResponse {
    pub id: String,
    pub file_name: String,
    pub public_url: Option<String>,
    pub storage_bucket: String,
    pub storage_path: String,
    pub source_type: String,
    pub generation_id: Option<String>,
    pub created_at: Option<String>,
}

fn normalize_brand_folder_row(row: &serde_json::Value, file_count: i64) -> serde_json::Value {
    let obj = row.as_object().cloned().unwrap_or_default();
    serde_json::json!({
        "id": obj.get("id").cloned().unwrap_or(serde_json::Value::Null),
        "brand_id": obj.get("brand_id").cloned().unwrap_or(serde_json::Value::Null),
        "parent_id": obj.get("parent_id").cloned().unwrap_or(serde_json::Value::Null),
        "name": obj.get("name").cloned().unwrap_or(serde_json::Value::Null),
        "is_default": obj.get("is_default").cloned().unwrap_or(serde_json::Value::Null),
        "created_at": obj.get("created_at").cloned().unwrap_or(serde_json::Value::Null),
        "file_count": file_count,
    })
}

pub async fn ensure_brand_storage_settings_row(
    state: &AppState,
    brand_id: &str,
) -> Result<i64, (StatusCode, String)> {
    let resp = state
        .pg
        .from("brand_storage_settings")
        .select("storage_limit_bytes")
        .eq("brand_id", brand_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        let code =
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err(sanitize_db_error(code.as_u16(), text));
    }

    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if let Some(limit) = v
        .as_array()
        .and_then(|a| a.first())
        .and_then(|o| o.get("storage_limit_bytes"))
        .and_then(|x| x.as_i64())
    {
        return Ok(limit);
    }

    let insert = serde_json::json!({ "brand_id": brand_id });
    let ins = state
        .pg
        .from("brand_storage_settings")
        .insert(insert.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = ins.status();
    let text = ins
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        let code =
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err(sanitize_db_error(code.as_u16(), text));
    }

    let resp2 = state
        .pg
        .from("brand_storage_settings")
        .select("storage_limit_bytes")
        .eq("brand_id", brand_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status2 = resp2.status();
    let text2 = resp2
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status2.is_success() {
        let code =
            StatusCode::from_u16(status2.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err((code, text2));
    }
    let v2: serde_json::Value = serde_json::from_str(&text2)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let limit = v2
        .as_array()
        .and_then(|a| a.first())
        .and_then(|o| o.get("storage_limit_bytes"))
        .and_then(|x| x.as_i64())
        .unwrap_or(5_368_709_120);
    Ok(limit)
}

pub async fn get_brand_used_storage_bytes(
    state: &AppState,
    brand_id: &str,
) -> Result<i64, (StatusCode, String)> {
    let resp = state
        .pg
        .from("brand_files")
        .select("size_bytes")
        .eq("brand_id", brand_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        let code =
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err(sanitize_db_error(code.as_u16(), text));
    }
    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let used = v
        .as_array()
        .map(|rows| {
            rows.iter()
                .map(|r| r.get("size_bytes").and_then(|x| x.as_i64()).unwrap_or(0))
                .sum::<i64>()
        })
        .unwrap_or(0);
    Ok(used)
}

pub async fn get_brand_storage_usage(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<BrandStorageUsageOut>, (StatusCode, String)> {
    let access = require_brand_access(&state, &user).await?;
    let brand_id = &access.organization_id;
    let limit = ensure_brand_storage_settings_row(&state, brand_id).await?;
    let used = get_brand_used_storage_bytes(&state, brand_id).await?;
    Ok(Json(BrandStorageUsageOut {
        used_bytes: used,
        limit_bytes: limit,
    }))
}

pub async fn list_brand_folders(
    State(state): State<AppState>,
    user: AuthUser,
    Query(q): Query<ListBrandFoldersQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let access = require_brand_access(&state, &user).await?;
    let brand_id = &access.organization_id;
    let mut req = state
        .pg
        .from("brand_folders")
        .select("id,brand_id,parent_id,name,is_default,created_at")
        .eq("brand_id", brand_id)
        .order("created_at.asc");
    if q.limit.is_some() || q.offset.is_some() {
        let limit = q.limit.unwrap_or(50) as usize;
        let offset = q.offset.unwrap_or(0) as usize;
        let to = offset.saturating_add(limit.saturating_sub(1));
        req = req.range(offset, to);
    }
    let resp = req
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        let code =
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err(sanitize_db_error(code.as_u16(), text));
    }
    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let Some(rows) = v.as_array() else {
        return Ok(Json(v));
    };

    let mut enriched = Vec::with_capacity(rows.len());
    for row in rows {
        let obj = row.as_object().cloned().unwrap_or_default();
        let folder_id = obj
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        let mut file_count = 0i64;
        if !folder_id.is_empty() {
            let resp = state
                .pg
                .from("brand_files")
                .select("id")
                .eq("brand_id", brand_id)
                .eq("folder_id", &folder_id)
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let status = resp.status();
            let text = resp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            if !status.is_success() {
                return Err(sanitize_db_error(status.as_u16(), text));
            }
            let files_json: serde_json::Value =
                serde_json::from_str(&text).unwrap_or(serde_json::json!([]));
            file_count = files_json.as_array().map(|a| a.len() as i64).unwrap_or(0);
        }

        enriched.push(normalize_brand_folder_row(row, file_count));
    }

    Ok(Json(serde_json::Value::Array(enriched)))
}

pub async fn create_brand_folder(
    State(state): State<AppState>,
    user: AuthUser,
    Json(input): Json<CreateBrandFolderIn>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let access = require_brand_access(&state, &user).await?;
    let brand_id = &access.organization_id;
    let body = serde_json::json!({
        "brand_id": brand_id,
        "parent_id": input.parent_id,
        "name": input.name,
    });
    let resp = state
        .pg
        .from("brand_folders")
        .insert(body.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        let code =
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err(sanitize_db_error(code.as_u16(), text));
    }

    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let Some(rows) = v.as_array() else {
        return Ok(Json(v));
    };
    let normalized = rows
        .iter()
        .map(|row| normalize_brand_folder_row(row, 0))
        .collect::<Vec<_>>();
    Ok(Json(serde_json::Value::Array(normalized)))
}

pub async fn delete_brand_folder(
    State(state): State<AppState>,
    user: AuthUser,
    Path(folder_id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    let access = require_brand_access(&state, &user).await?;
    let brand_id = &access.organization_id;

    let files_resp = state
        .pg
        .from("brand_files")
        .select("id,storage_bucket,storage_path")
        .eq("brand_id", brand_id)
        .eq("folder_id", &folder_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let files_status = files_resp.status();
    let files_text = files_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !files_status.is_success() {
        return Err(sanitize_db_error(
            files_status.as_u16(),
            files_text,
        ));
    }
    let files_json: serde_json::Value =
        serde_json::from_str(&files_text).unwrap_or(serde_json::json!([]));
    let files = files_json.as_array().cloned().unwrap_or_default();

    for f in files {
        let file_id = f.get("id").and_then(|v| v.as_str()).unwrap_or("");
        let bucket = f
            .get("storage_bucket")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let path = f.get("storage_path").and_then(|v| v.as_str()).unwrap_or("");
        if file_id.is_empty() || bucket.is_empty() || path.is_empty() {
            continue;
        }

        delete_object(&state, bucket, path).await?;

        let resp = state
            .pg
            .from("brand_files")
            .eq("id", file_id)
            .delete()
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let status = resp.status();
        let text = resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if !status.is_success() {
            let code =
                StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
            return Err(sanitize_db_error(code.as_u16(), text));
        }
        if let Err(err) = soft_delete_asset_record(&state, "brand_files", file_id).await {
            warn!(brand_id = %brand_id, file_id = %file_id, error = %err.1, "failed to soft-delete storage_assets row for brand folder file");
        }
    }

    let resp = state
        .pg
        .from("brand_folders")
        .delete()
        .eq("id", &folder_id)
        .eq("brand_id", brand_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        return Err(sanitize_db_error(status.as_u16(), text));
    }

    Ok(StatusCode::NO_CONTENT)
}

pub async fn update_brand_folder(
    State(state): State<AppState>,
    user: AuthUser,
    Path(folder_id): Path<String>,
    Json(body): Json<UpdateBrandFolderIn>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let access = require_brand_access(&state, &user).await?;
    let brand_id = access.organization_id;
    let name = body.name.unwrap_or_default().trim().to_string();
    if name.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "name is required".into()));
    }

    let update = serde_json::json!({ "name": name });
    let resp = state
        .pg
        .from("brand_folders")
        .update(update.to_string())
        .eq("id", &folder_id)
        .eq("brand_id", &brand_id)
        .select("id,brand_id,parent_id,name,created_at")
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !status.is_success() {
        let code =
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err(sanitize_db_error(code.as_u16(), text));
    }

    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let out = v
        .as_array()
        .and_then(|rows| rows.first())
        .map(|row| normalize_brand_folder_row(row, 0))
        .unwrap_or(v);
    Ok(Json(out))
}

pub async fn list_brand_files(
    State(state): State<AppState>,
    user: AuthUser,
    Query(q): Query<ListBrandFilesQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let access = require_brand_access(&state, &user).await?;
    let brand_id = &access.organization_id;
    let mut req = state
        .pg
        .from("brand_files")
        .select("id,file_name,storage_bucket,storage_path,public_url,folder_id,size_bytes,mime_type,source_type,generation_id,created_at")
        .eq("brand_id", brand_id)
        .order("created_at.desc");
    if let Some(folder_id) = q.folder_id.as_ref().filter(|s| !s.is_empty()) {
        req = req.eq("folder_id", folder_id);
    } else if q.root_only.unwrap_or(true) {
        req = req.is("folder_id", "null");
    }
    if let Some(mt) = q.mime_type.as_ref().filter(|s| !s.is_empty()) {
        req = req.eq("mime_type", mt);
    }
    if let Some(st) = q.source_type.as_ref().filter(|s| !s.is_empty()) {
        req = req.eq("source_type", st);
    }
    if q.limit.is_some() || q.offset.is_some() {
        let limit = q.limit.unwrap_or(50) as usize;
        let offset = q.offset.unwrap_or(0) as usize;
        let to = offset.saturating_add(limit.saturating_sub(1));
        req = req.range(offset, to);
    }
    let resp = req
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        let code =
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err(sanitize_db_error(code.as_u16(), text));
    }
    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}

pub async fn get_brand_storage_file_signed_url(
    State(state): State<AppState>,
    user: AuthUser,
    Path(file_id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let access = require_brand_access(&state, &user).await?;
    let brand_org_id = access.organization_id;
    let resp = state
        .pg
        .from("brand_files")
        .select("storage_bucket,storage_path,brand_id")
        .eq("id", file_id.clone())
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let arr: serde_json::Value = serde_json::from_str(&text).unwrap_or(serde_json::json!([]));
    let row = arr
        .as_array()
        .and_then(|a| a.first())
        .ok_or((StatusCode::NOT_FOUND, "file not found".to_string()))?;

    let brand_id = row.get("brand_id").and_then(|v| v.as_str()).ok_or((
        StatusCode::INTERNAL_SERVER_ERROR,
        "missing brand_id".into(),
    ))?;
    if brand_id != brand_org_id {
        return Err((StatusCode::FORBIDDEN, "Access denied".into()));
    }
    let bucket = row.get("storage_bucket").and_then(|v| v.as_str()).ok_or((
        StatusCode::INTERNAL_SERVER_ERROR,
        "missing storage_bucket".into(),
    ))?;
    let path = row.get("storage_path").and_then(|v| v.as_str()).ok_or((
        StatusCode::INTERNAL_SERVER_ERROR,
        "missing storage_path".into(),
    ))?;

    let full_url = crate::storage::generate_signed_url(&state, bucket, path, 3600).await?;
    Ok(Json(serde_json::json!({ "url": full_url })))
}

pub async fn upload_brand_storage_file(
    State(state): State<AppState>,
    user: AuthUser,
    mut multipart: Multipart,
) -> Result<Json<BrandFileUploadResponse>, (StatusCode, String)> {
    let access = require_brand_access(&state, &user).await?;
    let brand_id = access.organization_id;
    let mut file_name = None;
    let mut mime_type = None;
    let mut folder_id: Option<String> = None;
    let mut visibility = StorageVisibility::Private;
    let mut source_type: Option<String> = None;
    let mut generation_id: Option<String> = None;
    let mut bytes: Vec<u8> = vec![];

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?
    {
        let name = field.name().unwrap_or("").to_string();
        match name.as_str() {
            "folder_id" => {
                let txt = field
                    .text()
                    .await
                    .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
                if !txt.trim().is_empty() {
                    folder_id = Some(txt);
                }
            }
            "visibility" => {
                let txt = field
                    .text()
                    .await
                    .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
                if txt.trim().to_lowercase() == "public" {
                    visibility = StorageVisibility::Public;
                }
            }
            "source_type" => {
                let txt = field
                    .text()
                    .await
                    .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
                if !txt.trim().is_empty() {
                    source_type = Some(txt.trim().to_string());
                }
            }
            "generation_id" => {
                let txt = field
                    .text()
                    .await
                    .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
                if !txt.trim().is_empty() {
                    generation_id = Some(txt);
                }
            }
            "file" => {
                file_name = field.file_name().map(|s| s.to_string());
                mime_type = field.content_type().map(|s| s.to_string());
                let data = field
                    .bytes()
                    .await
                    .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
                bytes = data.to_vec();
            }
            _ => {}
        }
    }

    if bytes.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "missing file".into()));
    }

    let limit = ensure_brand_storage_settings_row(&state, &brand_id).await?;
    let used = get_brand_used_storage_bytes(&state, &brand_id).await?;
    let new_size = bytes.len() as i64;
    if used + new_size > limit {
        return Err((
            StatusCode::PAYLOAD_TOO_LARGE,
            "storage_quota_exceeded".into(),
        ));
    }

    let fname = file_name.unwrap_or_else(|| "upload.bin".to_string());
    let sanitized = sanitize_file_name(&fname);
    let folder_segment = folder_id.clone().unwrap_or_else(|| "root".to_string());
    let path = canonical_object_path(
        &format!("brands/{brand_id}/storage/{folder_segment}"),
        &sanitized,
        chrono::Utc::now().timestamp_millis(),
    );
    let uploaded = upload_object(&state, visibility, &path, bytes, mime_type.as_deref()).await?;
    let public_url = uploaded.public_url.clone();
    let insert = serde_json::json!({
        "brand_id": brand_id,
        "file_name": fname,
        "storage_bucket": uploaded.bucket,
        "storage_path": uploaded.path,
        "public_url": public_url,
        "folder_id": folder_id,
        "size_bytes": new_size,
        "mime_type": mime_type,
        "source_type": source_type.unwrap_or_else(|| "upload".to_string()),
        "generation_id": generation_id,
    });
    let resp = state
        .pg
        .from("brand_files")
        .insert(insert.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let txt = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let arr: Vec<serde_json::Value> = serde_json::from_str(&txt).unwrap_or_default();
    let rec = arr
        .first()
        .cloned()
        .unwrap_or(serde_json::json!({"id": ""}));
    let id = rec
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let storage_record = StorageAssetRecord {
        owner_type: StorageOwnerType::Brand,
        owner_id: brand_id.clone(),
        context_type: StorageContextType::BrandStorage,
        context_id: folder_id.clone(),
        visibility,
        object_path: insert
            .get("storage_path")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
        original_file_name: Some(fname.clone()),
        mime_type: mime_type.clone(),
        size_bytes: Some(new_size),
        checksum_sha256: None,
        source_table: Some("brand_files".to_string()),
        source_id: if id.is_empty() {
            None
        } else {
            Some(id.clone())
        },
        created_by: Some(user.id.clone()),
        counts_toward_quota: true,
    };
    if let Err(err) = insert_asset_record(&state, &storage_record).await {
        warn!(brand_id = %brand_id, file_id = %id, error = %err.1, "failed to mirror brand storage file into storage_assets");
    }

    info!(brand_id = %brand_id, file_id = %id, size_bytes = new_size, "brand_storage_file_uploaded");

    Ok(Json(BrandFileUploadResponse {
        id,
        file_name: fname,
        public_url,
        storage_bucket: insert
            .get("storage_bucket")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
        storage_path: insert
            .get("storage_path")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
        source_type: insert
            .get("source_type")
            .and_then(|v| v.as_str())
            .unwrap_or("upload")
            .to_string(),
        generation_id: generation_id,
        created_at: None,
    }))
}

pub async fn delete_brand_storage_file(
    State(state): State<AppState>,
    user: AuthUser,
    Path(file_id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let access = require_brand_access(&state, &user).await?;
    let brand_org_id = access.organization_id;

    let resp = state
        .pg
        .from("brand_files")
        .select("storage_bucket,storage_path,brand_id")
        .eq("id", file_id.clone())
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let arr: serde_json::Value = serde_json::from_str(&text).unwrap_or(serde_json::json!([]));
    let row = arr
        .as_array()
        .and_then(|a| a.first())
        .ok_or((StatusCode::NOT_FOUND, "file not found".to_string()))?;

    let brand_id = row.get("brand_id").and_then(|v| v.as_str()).ok_or((
        StatusCode::INTERNAL_SERVER_ERROR,
        "missing brand_id".into(),
    ))?;
    if brand_id != brand_org_id {
        return Err((StatusCode::FORBIDDEN, "Access denied".into()));
    }
    let bucket = row
        .get("storage_bucket")
        .and_then(|v| v.as_str())
        .ok_or((
            StatusCode::INTERNAL_SERVER_ERROR,
            "missing storage_bucket".into(),
        ))?
        .to_string();
    let path = row
        .get("storage_path")
        .and_then(|v| v.as_str())
        .ok_or((
            StatusCode::INTERNAL_SERVER_ERROR,
            "missing storage_path".into(),
        ))?
        .to_string();

    delete_object(&state, &bucket, &path).await?;

    let resp = state
        .pg
        .from("brand_files")
        .eq("id", &file_id)
        .delete()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        let code =
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err(sanitize_db_error(code.as_u16(), text));
    }
    if let Err(err) = soft_delete_asset_record(&state, "brand_files", &file_id).await {
        warn!(brand_id = %brand_org_id, file_id = %file_id, error = %err.1, "failed to soft-delete storage_assets row for brand file");
    }

    Ok(Json(serde_json::json!({ "ok": true })))
}

pub async fn get_or_create_default_folder(
    state: &AppState,
    brand_id: &str,
) -> Result<String, (StatusCode, String)> {
    let resp = state
        .pg
        .from("brand_folders")
        .select("id")
        .eq("brand_id", brand_id)
        .eq("is_default", "true")
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        let code =
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err(sanitize_db_error(code.as_u16(), text));
    }

    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    
    if let Some(id) = v
        .as_array()
        .and_then(|a| a.first())
        .and_then(|o| o.get("id"))
        .and_then(|x| x.as_str())
    {
        return Ok(id.to_string());
    }

    let body = serde_json::json!({
        "brand_id": brand_id,
        "name": "Studio Generations",
        "is_default": true,
    });
    let resp = state
        .pg
        .from("brand_folders")
        .insert(body.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        let code =
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err(sanitize_db_error(code.as_u16(), text));
    }

    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let id = v
        .as_array()
        .and_then(|a| a.first())
        .and_then(|o| o.get("id"))
        .and_then(|x| x.as_str())
        .unwrap_or("")
        .to_string();
    Ok(id)
}

#[derive(Serialize)]
pub struct BrandStorageAnalyticsItem {
    pub source_type: String,
    pub mime_type: Option<String>,
    pub file_count: i64,
    pub total_bytes: i64,
    pub avg_file_size: f64,
}

#[derive(Serialize)]
pub struct BrandStorageAnalytics {
    pub by_source_type: Vec<BrandStorageAnalyticsItem>,
    pub by_mime_type: Vec<BrandStorageAnalyticsItem>,
}

pub async fn get_brand_storage_analytics(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<BrandStorageAnalytics>, (StatusCode, String)> {
    let access = require_brand_access(&state, &user).await?;
    let brand_id = &access.organization_id;

    let resp = state
        .pg
        .from("brand_storage_analytics")
        .select("*")
        .eq("brand_id", brand_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        let code =
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err(sanitize_db_error(code.as_u16(), text));
    }

    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let rows = v.as_array().cloned().unwrap_or_default();
    let mut by_source_type: Vec<BrandStorageAnalyticsItem> = Vec::new();
    let mut by_mime_type: Vec<BrandStorageAnalyticsItem> = Vec::new();

    for row in rows {
        let source_type = row
            .get("source_type")
            .and_then(|x| x.as_str())
            .unwrap_or("upload")
            .to_string();
        let mime_type = row.get("mime_type").and_then(|x| x.as_str()).map(|s| s.to_string());
        let file_count = row.get("file_count").and_then(|x| x.as_i64()).unwrap_or(0);
        let total_bytes = row.get("total_bytes").and_then(|x| x.as_i64()).unwrap_or(0);
        let avg_file_size = row.get("avg_file_size").and_then(|x| x.as_f64()).unwrap_or(0.0);

        let item = BrandStorageAnalyticsItem {
            source_type: source_type.clone(),
            mime_type: mime_type.clone(),
            file_count,
            total_bytes,
            avg_file_size,
        };

        by_source_type.push(BrandStorageAnalyticsItem {
            source_type: source_type.clone(),
            mime_type: None,
            file_count,
            total_bytes,
            avg_file_size,
        });
        by_mime_type.push(item);
    }

    by_source_type.sort_by(|a, b| a.source_type.cmp(&b.source_type));
    by_mime_type.sort_by(|a, b| {
        a.mime_type
            .as_ref()
            .unwrap_or(&"".to_string())
            .cmp(b.mime_type.as_ref().unwrap_or(&"".to_string()))
    });

    Ok(Json(BrandStorageAnalytics {
        by_source_type,
        by_mime_type,
    }))
}
