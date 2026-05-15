use crate::{
    auth::AuthUser,
    state::AppState,
    errors::sanitize_db_error,
    storage::{
        canonical_object_path, generate_signed_url, insert_asset_record, safe_fetch_url,
        sanitize_file_name, upload_object, StorageAssetRecord, StorageContextType,
        StorageOwnerType, StorageVisibility,
    },
    team::{require_agency_access, require_brand_access},

};
use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use serde_json::json;
use tracing::info;

#[derive(Deserialize)]
pub struct ListOrgStorageAssetsQuery {
    pub r#type: Option<String>,
    pub search: Option<String>,
    pub folder_id: Option<String>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

#[derive(Deserialize)]
pub struct SaveFromUrlIn {
    pub temp_url: String,
    pub file_name: String,
    pub mime_type: Option<String>,
    pub folder_id: Option<String>,
}

fn mime_to_asset_type(mime: &str) -> &'static str {
    if mime.starts_with("image/") {
        "image"
    } else if mime.starts_with("audio/") {
        "audio"
    } else if mime.starts_with("video/") {
        "video"
    } else {
        "document"
    }
}

pub async fn list_org_storage_assets(
    State(state): State<AppState>,
    user: AuthUser,
    Query(q): Query<ListOrgStorageAssetsQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let (org_type, org_id) = match require_agency_access(&state, &user).await {
        Ok(access) => ("agency", access.organization_id),
        Err(_) => {
            let access = require_brand_access(&state, &user).await?;
            ("brand", access.organization_id)
        }
    };

    let table = if org_type == "agency" {
        "agency_files"
    } else {
        "brand_files"
    };

    let type_filter = q.r#type.as_deref().unwrap_or("");
    // Parse comma-separated types (e.g., "image,audio")
    let allowed_types: Vec<&str> = if type_filter.is_empty() {
        vec![]
    } else {
        type_filter.split(',').map(|s| s.trim()).collect()
    };

    let owner_col = format!("{}_id", org_type);

    let mut req = state
        .pg
        .from(table)
        .select("id,file_name,storage_bucket,storage_path,public_url,folder_id,size_bytes,mime_type,created_at")
        .eq(&owner_col, &org_id)
        .order("created_at.desc");

    // If only one type is requested, filter at database level for efficiency
    if allowed_types.len() == 1 {
        let mime_prefix = match allowed_types[0] {
            "image" => Some("image/"),
            "audio" => Some("audio/"),
            "video" => Some("video/"),
            _ => None,
        };
        if let Some(prefix) = mime_prefix {
            req = req.like("mime_type", format!("{}%", prefix));
        }
    }

    if let Some(ref folder_id) = q.folder_id {
        if !folder_id.is_empty() {
            req = req.eq("folder_id", folder_id);
        }
    }

    let limit = q.limit.unwrap_or(50) as usize;
    let offset = q.offset.unwrap_or(0) as usize;
    let to = offset.saturating_add(limit.saturating_sub(1));
    req = req.range(offset, to);

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
        return Err(sanitize_db_error(status.as_u16(), text));
    }

    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let rows = v.as_array().cloned().unwrap_or_default();

    let folder_table = if org_type == "agency" {
        "agency_folders"
    } else {
        "brand_folders"
    };

    let mut assets = Vec::with_capacity(rows.len());
    for row in rows {
        let file_name = row
            .get("file_name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        if let Some(ref search) = q.search {
            if !search.is_empty() && !file_name.to_lowercase().contains(&search.to_lowercase()) {
                continue;
            }
        }

        let file_id = row
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let storage_bucket = row
            .get("storage_bucket")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let storage_path = row
            .get("storage_path")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let public_url = row
            .get("public_url")
            .and_then(|v| v.as_str())
            .map(String::from);
        let folder_id_val = row
            .get("folder_id")
            .and_then(|v| v.as_str())
            .map(String::from);
        let size_bytes = row.get("size_bytes").and_then(|v| v.as_i64()).unwrap_or(0);
        let mime_type = row
            .get("mime_type")
            .and_then(|v| v.as_str())
            .unwrap_or("application/octet-stream")
            .to_string();
        let created_at = row
            .get("created_at")
            .and_then(|v| v.as_str())
            .map(String::from);

        let asset_type = mime_to_asset_type(&mime_type);

        // Filter by allowed types if specified
        if !allowed_types.is_empty() && !allowed_types.contains(&asset_type) {
            continue;
        }

        let mut folder_name: Option<String> = None;
        if let Some(ref fid) = folder_id_val {
            if !fid.is_empty() {
                let fresp = state
                    .pg
                    .from(folder_table)
                    .select("name")
                    .eq("id", fid)
                    .limit(1)
                    .execute()
                    .await
                    .ok();
                if let Some(fresp) = fresp {
                    let ftext = fresp.text().await.unwrap_or_default();
                    let fv: serde_json::Value = serde_json::from_str(&ftext).unwrap_or(json!([]));
                    folder_name = fv
                        .as_array()
                        .and_then(|a| a.first())
                        .and_then(|o| o.get("name"))
                        .and_then(|v| v.as_str())
                        .map(String::from);
                }
            }
        }

        let url = if public_url.is_some() && storage_bucket.contains("public") {
            public_url.clone()
        } else if !storage_bucket.is_empty() && !storage_path.is_empty() {
            generate_signed_url(&state, &storage_bucket, &storage_path, 3600)
                .await
                .ok()
        } else {
            public_url.clone()
        };

        assets.push(json!({
            "id": file_id,
            "name": file_name,
            "type": asset_type,
            "url": url.unwrap_or_default(),
            "mime_type": mime_type,
            "size_bytes": size_bytes,
            "folder_id": folder_id_val,
            "folder_name": folder_name,
            "source": "storage",
            "storage_path": storage_path,
            "created_at": created_at,
        }));
    }

    info!(org_type = org_type, org_id = %org_id, count = assets.len(), "org_storage_assets_listed");

    Ok(Json(json!({ "assets": assets })))
}

pub async fn save_from_url(
    State(state): State<AppState>,
    user: AuthUser,
    Json(input): Json<SaveFromUrlIn>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let (org_type, org_id) = match require_agency_access(&state, &user).await {
        Ok(access) => ("agency", access.organization_id),
        Err(_) => {
            let access = require_brand_access(&state, &user).await?;
            ("brand", access.organization_id)
        }
    };

    let downloaded = safe_fetch_url(&input.temp_url, None).await?;
    let data = downloaded.bytes.to_vec();
    let new_size = data.len() as i64;

    let file_table = if org_type == "agency" {
        "agency_files"
    } else {
        "brand_files"
    };
    let owner_col = format!("{}_id", org_type);

    if org_type == "brand" {
        let limit =
            crate::brands::storage::ensure_brand_storage_settings_row(&state, &org_id).await?;
        let used = crate::brands::storage::get_brand_used_storage_bytes(&state, &org_id).await?;
        if used + new_size > limit {
            return Err((
                StatusCode::PAYLOAD_TOO_LARGE,
                "storage_quota_exceeded".into(),
            ));
        }
    } else {
        let limit = crate::agencies::ensure_storage_settings_row(&state, &org_id).await?;
        let used = crate::agencies::get_agency_used_storage_bytes(&state, &org_id).await?;
        if used + new_size > limit {
            return Err((
                StatusCode::PAYLOAD_TOO_LARGE,
                "storage_quota_exceeded".into(),
            ));
        }
    }

    let sanitized = sanitize_file_name(&input.file_name);
    let folder_segment = input
        .folder_id
        .clone()
        .unwrap_or_else(|| "root".to_string());
    let visibility = StorageVisibility::Private;
    let path = canonical_object_path(
        &format!("{org_type}s/{org_id}/storage/{folder_segment}"),
        &sanitized,
        chrono::Utc::now().timestamp_millis(),
    );
    let mime = input
        .mime_type
        .as_deref()
        .or(Some("application/octet-stream"));
    let uploaded = upload_object(&state, visibility, &path, data, mime).await?;
    let public_url = uploaded.public_url.clone();

    let insert = json!({
        &owner_col: org_id,
        "file_name": input.file_name,
        "storage_bucket": uploaded.bucket,
        "storage_path": uploaded.path,
        "public_url": public_url,
        "folder_id": input.folder_id,
        "size_bytes": new_size,
        "mime_type": input.mime_type,
    });
    let resp = state
        .pg
        .from(file_table)
        .insert(insert.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let txt = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let arr: Vec<serde_json::Value> = serde_json::from_str(&txt).unwrap_or_default();
    let rec = arr.first().cloned().unwrap_or(json!({"id": ""}));
    let id = rec
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let (owner_type_enum, context_type_enum) = if org_type == "brand" {
        (StorageOwnerType::Brand, StorageContextType::BrandStorage)
    } else {
        (StorageOwnerType::Agency, StorageContextType::AgencyStorage)
    };

    let storage_record = StorageAssetRecord {
        owner_type: owner_type_enum,
        owner_id: org_id.clone(),
        context_type: context_type_enum,
        context_id: input.folder_id.clone(),
        visibility,
        object_path: insert
            .get("storage_path")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
        original_file_name: Some(input.file_name.clone()),
        mime_type: input.mime_type.clone(),
        size_bytes: Some(new_size),
        checksum_sha256: None,
        source_table: Some(file_table.to_string()),
        source_id: if id.is_empty() {
            None
        } else {
            Some(id.clone())
        },
        created_by: Some(user.id.clone()),
        counts_toward_quota: true,
    };
    if let Err(err) = insert_asset_record(&state, &storage_record).await {
        tracing::warn!(org_type = org_type, org_id = %org_id, file_id = %id, error = %err.1, "failed to mirror save-from-url into storage_assets");
    }

    info!(org_type = org_type, org_id = %org_id, file_id = %id, "save_from_url_completed");

    Ok(Json(json!({
        "id": id,
        "storage_path": insert.get("storage_path").and_then(|v| v.as_str()).unwrap_or(""),
        "public_url": public_url,
        "source": "storage",
    })))
}
