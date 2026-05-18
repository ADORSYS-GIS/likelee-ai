use crate::{
    auth::AuthUser, state::AppState, storage::StorageVisibility, team::require_brand_access,
};
use axum::{
    extract::{Multipart, Path, Query, State},
    http::StatusCode,
    Json,
};

use super::dto::{
    BrandStorageUsageOut, CreateBrandFolderIn, ListBrandFilesQuery, ListBrandFoldersQuery,
    UpdateBrandFolderIn,
};
use super::repository;

pub async fn get_brand_storage_usage(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<BrandStorageUsageOut>, (StatusCode, String)> {
    let access = require_brand_access(&state, &user).await?;
    let brand_id = &access.organization_id;
    let (used, limit) = repository::get_brand_storage_usage(&state, brand_id).await?;
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
    Ok(Json(
        repository::list_brand_folders(&state, brand_id, q.limit, q.offset).await?,
    ))
}

pub async fn create_brand_folder(
    State(state): State<AppState>,
    user: AuthUser,
    Json(input): Json<CreateBrandFolderIn>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let access = require_brand_access(&state, &user).await?;
    let brand_id = &access.organization_id;
    Ok(Json(
        repository::create_brand_folder(&state, brand_id, &input.name, input.parent_id).await?,
    ))
}

pub async fn delete_brand_folder(
    State(state): State<AppState>,
    user: AuthUser,
    Path(folder_id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    let access = require_brand_access(&state, &user).await?;
    let brand_id = &access.organization_id;
    repository::delete_brand_folder(&state, brand_id, &folder_id).await?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn update_brand_folder(
    State(state): State<AppState>,
    user: AuthUser,
    Path(folder_id): Path<String>,
    Json(body): Json<UpdateBrandFolderIn>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let access = require_brand_access(&state, &user).await?;
    let brand_id = &access.organization_id;
    let name = body.name.unwrap_or_default().trim().to_string();
    if name.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "name is required".into()));
    }
    Ok(Json(
        repository::update_brand_folder(&state, brand_id, &folder_id, &name).await?,
    ))
}

pub async fn list_brand_files(
    State(state): State<AppState>,
    user: AuthUser,
    Query(q): Query<ListBrandFilesQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let access = require_brand_access(&state, &user).await?;
    let brand_id = &access.organization_id;
    Ok(Json(
        repository::list_brand_files(
            &state,
            brand_id,
            repository::BrandFileListParams {
                folder_id: q.folder_id.as_deref(),
                root_only: q.root_only.unwrap_or(true),
                limit: q.limit,
                offset: q.offset,
                mime_type: q.mime_type.as_deref(),
                source_type: q.source_type.as_deref(),
            },
        )
        .await?,
    ))
}

pub async fn get_brand_storage_file_signed_url(
    State(state): State<AppState>,
    user: AuthUser,
    Path(file_id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let access = require_brand_access(&state, &user).await?;
    let brand_id = &access.organization_id;
    let url = repository::get_brand_storage_file_signed_url(&state, brand_id, &file_id).await?;
    Ok(Json(serde_json::json!({ "url": url })))
}

pub async fn upload_brand_storage_file(
    State(state): State<AppState>,
    user: AuthUser,
    mut multipart: Multipart,
) -> Result<Json<super::dto::BrandFileUploadResponse>, (StatusCode, String)> {
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

    let fname = file_name.unwrap_or_else(|| "upload.bin".to_string());
    let response = repository::upload_brand_storage_file(
        &state,
        &brand_id,
        repository::BrandFileUploadInput {
            user_id: user.id.clone(),
            file_name: fname,
            mime_type,
            folder_id,
            visibility,
            source_type,
            generation_id,
            bytes,
        },
    )
    .await?;

    Ok(Json(response))
}

pub async fn delete_brand_storage_file(
    State(state): State<AppState>,
    user: AuthUser,
    Path(file_id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let access = require_brand_access(&state, &user).await?;
    let brand_id = &access.organization_id;
    repository::delete_brand_storage_file(&state, brand_id, &file_id).await?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

pub async fn get_brand_storage_analytics(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<super::dto::BrandStorageAnalytics>, (StatusCode, String)> {
    let access = require_brand_access(&state, &user).await?;
    let brand_id = &access.organization_id;
    Ok(Json(
        repository::get_brand_storage_analytics(&state, brand_id).await?,
    ))
}
