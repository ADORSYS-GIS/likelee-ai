use crate::{
    errors::sanitize_db_error,
    state::AppState,
    storage::{
        canonical_object_path, delete_object, insert_asset_record, sanitize_file_name,
        soft_delete_asset_record, upload_object, StorageAssetRecord, StorageContextType,
        StorageOwnerType, StorageVisibility,
    },
};
use axum::http::StatusCode;
use tracing::{info, warn};

use super::dto::BrandFileUploadResponse;

pub struct BrandFileListParams<'a> {
    pub folder_id: Option<&'a str>,
    pub root_only: bool,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
    pub mime_type: Option<&'a str>,
    pub source_type: Option<&'a str>,
}

pub struct BrandFileUploadInput {
    pub user_id: String,
    pub file_name: String,
    pub mime_type: Option<String>,
    pub folder_id: Option<String>,
    pub visibility: StorageVisibility,
    pub source_type: Option<String>,
    pub generation_id: Option<String>,
    pub bytes: Vec<u8>,
}

pub fn normalize_brand_folder_row(row: &serde_json::Value, file_count: i64) -> serde_json::Value {
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
    state: &AppState,
    brand_id: &str,
) -> Result<(i64, i64), (StatusCode, String)> {
    let limit = ensure_brand_storage_settings_row(state, brand_id).await?;
    let used = get_brand_used_storage_bytes(state, brand_id).await?;
    Ok((used, limit))
}

pub async fn list_brand_folders(
    state: &AppState,
    brand_id: &str,
    limit: Option<u32>,
    offset: Option<u32>,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let mut req = state
        .pg
        .from("brand_folders")
        .select("id,brand_id,parent_id,name,is_default,created_at")
        .eq("brand_id", brand_id)
        .order("created_at.asc");
    if limit.is_some() || offset.is_some() {
        let lim = limit.unwrap_or(50) as usize;
        let off = offset.unwrap_or(0) as usize;
        let to = off.saturating_add(lim.saturating_sub(1));
        req = req.range(off, to);
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
        return Ok(v);
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

    Ok(serde_json::Value::Array(enriched))
}

pub async fn create_brand_folder(
    state: &AppState,
    brand_id: &str,
    name: &str,
    parent_id: Option<String>,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let body = serde_json::json!({
        "brand_id": brand_id,
        "parent_id": parent_id,
        "name": name,
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
        return Ok(v);
    };
    let normalized = rows
        .iter()
        .map(|row| normalize_brand_folder_row(row, 0))
        .collect::<Vec<_>>();
    Ok(serde_json::Value::Array(normalized))
}

pub async fn delete_brand_folder(
    state: &AppState,
    brand_id: &str,
    folder_id: &str,
) -> Result<(), (StatusCode, String)> {
    let files_resp = state
        .pg
        .from("brand_files")
        .select("id,storage_bucket,storage_path")
        .eq("brand_id", brand_id)
        .eq("folder_id", folder_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let files_status = files_resp.status();
    let files_text = files_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !files_status.is_success() {
        return Err(sanitize_db_error(files_status.as_u16(), files_text));
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

        delete_object(state, bucket, path).await?;

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
        if let Err(err) = soft_delete_asset_record(state, "brand_files", file_id).await {
            warn!(brand_id = %brand_id, file_id = %file_id, error = %err.1, "failed to soft-delete storage_assets row for brand folder file");
        }
    }

    let resp = state
        .pg
        .from("brand_folders")
        .delete()
        .eq("id", folder_id)
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

    Ok(())
}

pub async fn update_brand_folder(
    state: &AppState,
    brand_id: &str,
    folder_id: &str,
    name: &str,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let update = serde_json::json!({ "name": name });
    let resp = state
        .pg
        .from("brand_folders")
        .update(update.to_string())
        .eq("id", folder_id)
        .eq("brand_id", brand_id)
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
    Ok(out)
}

pub async fn list_brand_files(
    state: &AppState,
    brand_id: &str,
    params: BrandFileListParams<'_>,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let mut req = state
        .pg
        .from("brand_files")
        .select("id,file_name,storage_bucket,storage_path,public_url,folder_id,size_bytes,mime_type,source_type,generation_id,created_at")
        .eq("brand_id", brand_id)
        .order("created_at.desc");
    if let Some(fid) = params.folder_id.filter(|s| !s.is_empty()) {
        req = req.eq("folder_id", fid);
    } else if params.root_only {
        req = req.is("folder_id", "null");
    }
    if let Some(mt) = params.mime_type.filter(|s| !s.is_empty()) {
        req = req.eq("mime_type", mt);
    }
    if let Some(st) = params.source_type.filter(|s| !s.is_empty()) {
        req = req.eq("source_type", st);
    }
    if params.limit.is_some() || params.offset.is_some() {
        let lim = params.limit.unwrap_or(50) as usize;
        let off = params.offset.unwrap_or(0) as usize;
        let to = off.saturating_add(lim.saturating_sub(1));
        req = req.range(off, to);
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
    Ok(v)
}

pub async fn get_brand_storage_file_signed_url(
    state: &AppState,
    brand_id: &str,
    file_id: &str,
) -> Result<String, (StatusCode, String)> {
    let resp = state
        .pg
        .from("brand_files")
        .select("storage_bucket,storage_path,brand_id")
        .eq("id", file_id)
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

    let row_brand_id = row
        .get("brand_id")
        .and_then(|v| v.as_str())
        .ok_or((StatusCode::INTERNAL_SERVER_ERROR, "missing brand_id".into()))?;
    if row_brand_id != brand_id {
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

    crate::storage::generate_signed_url(state, bucket, path, 3600).await
}

pub async fn upload_brand_storage_file(
    state: &AppState,
    brand_id: &str,
    input: BrandFileUploadInput,
) -> Result<BrandFileUploadResponse, (StatusCode, String)> {
    let limit = ensure_brand_storage_settings_row(state, brand_id).await?;
    let used = get_brand_used_storage_bytes(state, brand_id).await?;
    let new_size = input.bytes.len() as i64;
    if used + new_size > limit {
        return Err((
            StatusCode::PAYLOAD_TOO_LARGE,
            "storage_quota_exceeded".into(),
        ));
    }

    let fname = input.file_name;
    let sanitized = sanitize_file_name(&fname);
    let folder_segment = input
        .folder_id
        .clone()
        .unwrap_or_else(|| "root".to_string());
    let path = canonical_object_path(
        &format!("brands/{brand_id}/storage/{folder_segment}"),
        &sanitized,
        chrono::Utc::now().timestamp_millis(),
    );
    let uploaded = upload_object(
        state,
        input.visibility,
        &path,
        input.bytes,
        input.mime_type.as_deref(),
    )
    .await?;
    let public_url = uploaded.public_url.clone();
    let insert = serde_json::json!({
        "brand_id": brand_id,
        "file_name": fname,
        "storage_bucket": uploaded.bucket,
        "storage_path": uploaded.path,
        "public_url": public_url,
        "folder_id": input.folder_id,
        "size_bytes": new_size,
        "mime_type": input.mime_type,
        "source_type": input
            .source_type
            .clone()
            .unwrap_or_else(|| "upload".to_string()),
        "generation_id": input.generation_id,
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
        owner_id: brand_id.to_string(),
        context_type: StorageContextType::BrandStorage,
        context_id: input.folder_id.clone(),
        visibility: input.visibility,
        object_path: insert
            .get("storage_path")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
        original_file_name: Some(fname.clone()),
        mime_type: input.mime_type.clone(),
        size_bytes: Some(new_size),
        checksum_sha256: None,
        source_table: Some("brand_files".to_string()),
        source_id: if id.is_empty() {
            None
        } else {
            Some(id.clone())
        },
        created_by: Some(input.user_id),
        counts_toward_quota: true,
    };
    if let Err(err) = insert_asset_record(state, &storage_record).await {
        warn!(brand_id = %brand_id, file_id = %id, error = %err.1, "failed to mirror brand storage file into storage_assets");
    }

    info!(brand_id = %brand_id, file_id = %id, size_bytes = new_size, "brand_storage_file_uploaded");

    Ok(BrandFileUploadResponse {
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
        generation_id: insert
            .get("generation_id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        created_at: None,
    })
}

pub async fn delete_brand_storage_file(
    state: &AppState,
    brand_id: &str,
    file_id: &str,
) -> Result<(), (StatusCode, String)> {
    let resp = state
        .pg
        .from("brand_files")
        .select("storage_bucket,storage_path,brand_id")
        .eq("id", file_id)
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

    let row_brand_id = row
        .get("brand_id")
        .and_then(|v| v.as_str())
        .ok_or((StatusCode::INTERNAL_SERVER_ERROR, "missing brand_id".into()))?;
    if row_brand_id != brand_id {
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

    delete_object(state, &bucket, &path).await?;

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
    if let Err(err) = soft_delete_asset_record(state, "brand_files", file_id).await {
        warn!(brand_id = %brand_id, file_id = %file_id, error = %err.1, "failed to soft-delete storage_assets row for brand file");
    }

    Ok(())
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

pub async fn get_brand_storage_analytics(
    state: &AppState,
    brand_id: &str,
) -> Result<super::dto::BrandStorageAnalytics, (StatusCode, String)> {
    use super::dto::{BrandStorageAnalytics, BrandStorageAnalyticsItem};

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
        let mime_type = row
            .get("mime_type")
            .and_then(|x| x.as_str())
            .map(|s| s.to_string());
        let file_count = row.get("file_count").and_then(|x| x.as_i64()).unwrap_or(0);
        let total_bytes = row.get("total_bytes").and_then(|x| x.as_i64()).unwrap_or(0);
        let avg_file_size = row
            .get("avg_file_size")
            .and_then(|x| x.as_f64())
            .unwrap_or(0.0);

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

    Ok(BrandStorageAnalytics {
        by_source_type,
        by_mime_type,
    })
}
