use crate::config::AppState;
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};

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

    // 4) Insert brand_voice_assets entries
    let mut assets_created: i64 = 0;
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
            let payload = serde_json::json!({
                "folder_id": folder_id,
                "asset_type": "recording",
                "recording_id": recording_id,
                "storage_bucket": storage_bucket,
                "storage_path": storage_path,
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

#[derive(Deserialize)]
pub struct ListLicensesQuery {
    pub user_id: String,
}

pub async fn list_creator_licenses(
    State(state): State<AppState>,
    Query(params): Query<ListLicensesQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("brand_licenses")
        .select("*, organization_profiles(org_name, logo_url)")
        .eq("face_user_id", &params.user_id)
        .order("created_at.desc")
        .execute()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    if !resp.status().is_success() {
        let status_code = resp.status().as_u16();
        let text = resp.text().await.unwrap_or_default();
        return Err((
            StatusCode::from_u16(status_code).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
            text,
        ));
    }

    let text = resp.text().await.unwrap_or_else(|_| "[]".into());
    let json: serde_json::Value =
        serde_json::from_str(&text).unwrap_or(serde_json::json!([]));

    Ok(Json(json))
}

pub async fn revoke_license(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // 1. Update license status to 'revoked'
    let resp = state
        .pg
        .from("brand_licenses")
        .update(
            serde_json::json!({
                "status": "revoked",
                "end_at": chrono::Utc::now().to_rfc3339()
            })
            .to_string(),
        )
        .eq("id", &id)
        .execute()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    let text = resp.text().await.unwrap_or_else(|_| "{}".into());
    let json: serde_json::Value =
        serde_json::from_str(&text).unwrap_or(serde_json::json!({}));

    // 2. Delete brand_voice_assets (via folder cascade)
    // First get folder IDs for this license
    let folders_resp = state
        .pg
        .from("brand_voice_folders")
        .select("id")
        .eq("license_id", &id)
        .execute()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    let folders_text = folders_resp.text().await.unwrap_or_else(|_| "[]".into());
    let folders: serde_json::Value =
        serde_json::from_str(&folders_text).unwrap_or(serde_json::json!([]));

    // Delete assets for each folder
    if let Some(folder_arr) = folders.as_array() {
        for folder in folder_arr {
            if let Some(folder_id) = folder.get("id").and_then(|v| v.as_str()) {
                let _ = state
                    .pg
                    .from("brand_voice_assets")
                    .delete()
                    .eq("folder_id", folder_id)
                    .execute()
                    .await;
            }
        }
    }

    // 3. Delete brand_voice_folders for this license
    let _ = state
        .pg
        .from("brand_voice_folders")
        .delete()
        .eq("license_id", &id)
        .execute()
        .await;

    Ok(Json(json))
}

#[derive(Deserialize)]
pub struct AgencyRosterQuery {
    pub agency_id: String,
}

pub async fn list_agency_roster(
    State(state): State<AppState>,
    Query(params): Query<AgencyRosterQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // Get all profiles (talent) managed by this agency
    let resp = state
        .pg
        .from("profiles")
        .select("id,full_name,profile_photo_url,email")
        .execute()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    if !resp.status().is_success() {
        let status_code = resp.status().as_u16();
        let text = resp.text().await.unwrap_or_default();
        return Err((
            StatusCode::from_u16(status_code).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
            text,
        ));
    }

    let profiles_text = resp.text().await.unwrap_or_else(|_| "[]".into());
    let mut profiles: serde_json::Value =
        serde_json::from_str(&profiles_text).unwrap_or(serde_json::json!([]));

    // For each profile, fetch their active licenses
    if let Some(profiles_arr) = profiles.as_array_mut() {
        for profile in profiles_arr.iter_mut() {
            if let Some(profile_id) = profile.get("id").and_then(|v| v.as_str()) {
                // Check if this profile belongs to the agency
                let agency_check = state
                    .pg
                    .from("agency_users")
                    .select("id")
                    .eq("agency_id", &params.agency_id)
                    .eq("user_id", profile_id)
                    .limit(1)
                    .execute()
                    .await;

                // Skip if not part of this agency
                if agency_check.is_err() {
                    continue;
                }

                let check_text = agency_check
                    .unwrap()
                    .text()
                    .await
                    .unwrap_or_else(|_| "[]".into());
                let check_json: serde_json::Value =
                    serde_json::from_str(&check_text).unwrap_or(serde_json::json!([]));

                if check_json.as_array().map(|a| a.is_empty()).unwrap_or(true) {
                    continue;
                }

                // Fetch active licenses for this profile
                let licenses_resp = state
                    .pg
                    .from("brand_licenses")
                    .select("id,status,type,start_at,end_at,brand_org_id,organization_profiles(org_name,logo_url)")
                    .eq("face_user_id", profile_id)
                    .execute()
                    .await;

                if let Ok(lic_resp) = licenses_resp {
                    let lic_text = lic_resp.text().await.unwrap_or_else(|_| "[]".into());
                    let licenses: serde_json::Value =
                        serde_json::from_str(&lic_text).unwrap_or(serde_json::json!([]));
                    profile.as_object_mut().unwrap().insert(
                        "licenses".to_string(),
                        licenses,
                    );
                } else {
                    profile.as_object_mut().unwrap().insert(
                        "licenses".to_string(),
                        serde_json::json!([]),
                    );
                }
            }
        }

        // Filter out profiles not in this agency
        profiles_arr.retain(|p| p.get("licenses").is_some());
    }

    Ok(Json(profiles))
}

pub async fn approve_license(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("brand_licenses")
        .update(
            serde_json::json!({
                "status": "active",
                "start_at": chrono::Utc::now().to_rfc3339()
            })
            .to_string(),
        )
        .eq("id", &id)
        .execute()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    let text = resp.text().await.unwrap_or_else(|_| "{}".into());
    let json: serde_json::Value =
        serde_json::from_str(&text).unwrap_or(serde_json::json!({}));

    Ok(Json(json))
}
