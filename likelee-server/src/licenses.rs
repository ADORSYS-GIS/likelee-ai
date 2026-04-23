use crate::config::AppState;
use crate::storage::{
    canonical_object_path, download_object, insert_asset_record, sanitize_file_name, upload_object,
    StorageAssetRecord, StorageContextType, StorageOwnerType, StorageVisibility,
};
use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use tracing::warn;

#[derive(Deserialize)]
pub struct ActivatedIn {
    pub license_id: String,
    pub brand_org_id: String,
    pub face_user_id: String,
    #[serde(default)]
    pub license_type: Option<String>,
    #[serde(default)]
    pub start_at: Option<String>,
    #[serde(default)]
    pub end_at: Option<String>,
}

#[derive(Serialize)]
pub struct ActivatedOut {
    pub folder_id: String,
    pub assets_created: i64,
}

pub async fn activated_stub(
    State(state): State<AppState>,
    Json(input): Json<ActivatedIn>,
) -> Result<Json<ActivatedOut>, (StatusCode, String)> {
    // 1) Ensure brand_licenses row exists or active
    let license_body = serde_json::json!({
        "id": input.license_id,
        "brand_org_id": input.brand_org_id,
        "face_user_id": input.face_user_id,
        "type": input.license_type,
        "status": "active",
        "start_at": input.start_at,
        "end_at": input.end_at,
    });
    // Try insert; if conflict, update
    let ins = state
        .pg
        .from("brand_licenses")
        .insert(license_body.to_string())
        .execute()
        .await;
    if ins.is_err() {
        // best-effort update if already exists
        let _ = state
            .pg
            .from("brand_licenses")
            .update(
                serde_json::json!({
                    "status": "active",
                    "type": input.license_type,
                    "start_at": input.start_at,
                    "end_at": input.end_at,
                })
                .to_string(),
            )
            .eq("id", &input.license_id)
            .execute()
            .await;
    }

    // 2) Upsert brand_voice_folders
    let name = format!("{} – Voice Assets", &input.face_user_id);
    let folder_body = serde_json::json!({
        "brand_org_id": input.brand_org_id,
        "face_user_id": input.face_user_id,
        "license_id": input.license_id,
        "name": name,
    });
    // Try insert folder; if exists, select id
    let insf = state
        .pg
        .from("brand_voice_folders")
        .insert(folder_body.to_string())
        .select("id")
        .execute()
        .await;
    let folder_resp = match insf {
        Ok(resp) => resp,
        Err(_) => state
            .pg
            .from("brand_voice_folders")
            .select("id")
            .eq("brand_org_id", &input.brand_org_id)
            .eq("face_user_id", &input.face_user_id)
            .eq("license_id", &input.license_id)
            .limit(1)
            .execute()
            .await
            .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?,
    };
    let folder_text = folder_resp.text().await.unwrap_or_else(|_| "[]".into());
    let folder_json: serde_json::Value =
        serde_json::from_str(&folder_text).unwrap_or(serde_json::json!([]));
    let folder_id = folder_json
        .as_array()
        .and_then(|a| a.first())
        .and_then(|o| o.get("id"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    if folder_id.is_empty() {
        return Err((StatusCode::BAD_GATEWAY, "failed to upsert folder".into()));
    }

    // 3) Fetch accessible recordings and ready models
    let rec_resp = state
        .pg
        .from("voice_recordings")
        .select("id,storage_bucket,storage_path")
        .eq("user_id", &input.face_user_id)
        .eq("accessible", "true")
        .execute()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    let rec_text = rec_resp.text().await.unwrap_or_else(|_| "[]".into());
    let recs: serde_json::Value = serde_json::from_str(&rec_text).unwrap_or(serde_json::json!([]));

    let mdl_resp = state
        .pg
        .from("voice_models")
        .select("id")
        .eq("user_id", &input.face_user_id)
        .eq("status", "ready")
        .execute()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    let mdl_text = mdl_resp.text().await.unwrap_or_else(|_| "[]".into());
    let mdls: serde_json::Value = serde_json::from_str(&mdl_text).unwrap_or(serde_json::json!([]));

    // 4) Insert brand_voice_assets entries and copy recordings to brand storage
    let mut assets_created: i64 = 0;

    let brand_storage_folder_name = "Voice Assets";
    let mut brand_storage_folder_id: Option<String> = None;

    if let Some(arr) = recs.as_array() {
        if !arr.is_empty() {
            let folder_check = state
                .pg
                .from("brand_folders")
                .select("id")
                .eq("brand_id", &input.brand_org_id)
                .eq("name", brand_storage_folder_name)
                .limit(1)
                .execute()
                .await;
            if let Ok(fc_resp) = folder_check {
                let fc_text = fc_resp.text().await.unwrap_or_default();
                let fc_json: serde_json::Value =
                    serde_json::from_str(&fc_text).unwrap_or(serde_json::json!([]));
                brand_storage_folder_id = fc_json
                    .as_array()
                    .and_then(|a| a.first())
                    .and_then(|o| o.get("id"))
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());
            }
            if brand_storage_folder_id.is_none() {
                let bf_insert = serde_json::json!({
                    "brand_id": input.brand_org_id,
                    "name": brand_storage_folder_name,
                });
                let bf_resp = state
                    .pg
                    .from("brand_folders")
                    .insert(bf_insert.to_string())
                    .execute()
                    .await;
                if let Ok(resp) = bf_resp {
                    let bf_text = resp.text().await.unwrap_or_default();
                    let bf_json: serde_json::Value =
                        serde_json::from_str(&bf_text).unwrap_or(serde_json::json!([]));
                    brand_storage_folder_id = bf_json
                        .as_array()
                        .and_then(|a| a.first())
                        .and_then(|o| o.get("id"))
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());
                }
            }
        }
    }

    if let Some(arr) = recs.as_array() {
        for r in arr {
            let recording_id = r.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let storage_bucket = r
                .get("storage_bucket")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let storage_path = r.get("storage_path").and_then(|v| v.as_str()).unwrap_or("");
            if recording_id.is_empty() {
                continue;
            }

            let mut brand_bucket = storage_bucket.to_string();
            let mut brand_path = storage_path.to_string();
            let mut brand_public_url: Option<String> = None;

            if !storage_bucket.is_empty() && !storage_path.is_empty() {
                match download_object(&state, storage_bucket, storage_path).await {
                    Ok(downloaded) => {
                        let file_bytes = downloaded.bytes.to_vec();
                        let new_size = file_bytes.len() as i64;
                        let fname = format!("voice_{}.webm", recording_id);
                        let sanitized = sanitize_file_name(&fname);
                        let visibility = StorageVisibility::Private;
                        let dest_path = canonical_object_path(
                            &format!("brands/{}/voice-assets", input.brand_org_id),
                            &sanitized,
                            chrono::Utc::now().timestamp_millis(),
                        );

                        if let Ok(uploaded) =
                            upload_object(&state, visibility, &dest_path, file_bytes, None).await
                        {
                            brand_bucket = uploaded.bucket.clone();
                            brand_path = uploaded.path.clone();
                            brand_public_url = uploaded.public_url.clone();

                            let bf_insert = serde_json::json!({
                                "brand_id": input.brand_org_id,
                                "file_name": fname,
                                "storage_bucket": uploaded.bucket,
                                "storage_path": uploaded.path,
                                "public_url": uploaded.public_url,
                                "folder_id": brand_storage_folder_id,
                                "size_bytes": new_size,
                                "mime_type": downloaded.content_type,
                            });
                            let _ = state
                                .pg
                                .from("brand_files")
                                .insert(bf_insert.to_string())
                                .execute()
                                .await;

                            let bf_resp = state
                                .pg
                                .from("brand_files")
                                .select("id")
                                .eq("brand_id", &input.brand_org_id)
                                .eq("storage_path", &uploaded.path)
                                .limit(1)
                                .execute()
                                .await;
                            let bf_id = if let Ok(resp) = bf_resp {
                                let txt = resp.text().await.unwrap_or_default();
                                let v: serde_json::Value =
                                    serde_json::from_str(&txt).unwrap_or(serde_json::json!([]));
                                v.as_array()
                                    .and_then(|a| a.first())
                                    .and_then(|o| o.get("id"))
                                    .and_then(|v| v.as_str())
                                    .map(|s| s.to_string())
                            } else {
                                None
                            };

                            let storage_record = StorageAssetRecord {
                                owner_type: StorageOwnerType::Brand,
                                owner_id: input.brand_org_id.clone(),
                                context_type: StorageContextType::BrandVoiceAsset,
                                context_id: Some(recording_id.to_string()),
                                visibility,
                                object_path: uploaded.path,
                                original_file_name: Some(fname),
                                mime_type: downloaded.content_type,
                                size_bytes: Some(new_size),
                                checksum_sha256: None,
                                source_table: Some("brand_files".to_string()),
                                source_id: bf_id,
                                created_by: None,
                                counts_toward_quota: true,
                            };
                            if let Err(err) = insert_asset_record(&state, &storage_record).await {
                                warn!(recording_id = %recording_id, error = %err.1, "failed to mirror voice asset into storage_assets");
                            }
                        }
                    }
                    Err(e) => {
                        warn!(recording_id = %recording_id, error = %e.1, "failed to download voice recording for brand storage copy");
                    }
                }
            }

            let payload = serde_json::json!({
                "folder_id": folder_id,
                "asset_type": "recording",
                "recording_id": recording_id,
                "storage_bucket": brand_bucket,
                "storage_path": brand_path,
            });
            let _ = state
                .pg
                .from("brand_voice_assets")
                .insert(payload.to_string())
                .execute()
                .await;
            assets_created += 1;
        }
    }
    if let Some(arr) = mdls.as_array() {
        for m in arr {
            let model_id = m.get("id").and_then(|v| v.as_str()).unwrap_or("");
            if model_id.is_empty() {
                continue;
            }
            let payload = serde_json::json!({
                "folder_id": folder_id,
                "asset_type": "model",
                "model_id": model_id,
            });
            let _ = state
                .pg
                .from("brand_voice_assets")
                .insert(payload.to_string())
                .execute()
                .await;
            assets_created += 1;
        }
    }

    Ok(Json(ActivatedOut {
        folder_id,
        assets_created,
    }))
}

#[derive(Deserialize)]
pub struct ListFoldersQuery {
    pub brand_org_id: String,
}

pub async fn list_brand_voice_folders(
    State(state): State<AppState>,
    Query(q): Query<ListFoldersQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("brand_voice_folders")
        .select("*")
        .eq("brand_org_id", &q.brand_org_id)
        .order("created_at.desc")
        .execute()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    let text = resp.text().await.unwrap_or_else(|_| "[]".into());
    let json: serde_json::Value = serde_json::from_str(&text).unwrap_or(serde_json::json!([]));
    Ok(Json(json))
}

#[derive(Deserialize)]
pub struct ListAssetsQuery {
    pub folder_id: String,
}

pub async fn list_brand_voice_assets(
    State(state): State<AppState>,
    Query(q): Query<ListAssetsQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("brand_voice_assets")
        .select("*")
        .eq("folder_id", &q.folder_id)
        .order("created_at.asc")
        .execute()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    let text = resp.text().await.unwrap_or_else(|_| "[]".into());
    let json: serde_json::Value = serde_json::from_str(&text).unwrap_or(serde_json::json!([]));
    Ok(Json(json))
}
