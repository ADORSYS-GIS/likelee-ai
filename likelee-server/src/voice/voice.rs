use crate::storage::{
    canonical_object_path, delete_object, download_object, generate_signed_url,
    insert_asset_record, sanitize_file_name, soft_delete_asset_record, upload_object,
    StorageAssetRecord, StorageContextType, StorageOwnerType, StorageVisibility,
};
use crate::{auth::AuthUser, config::AppState};
use axum::{
    body::Bytes,
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use tracing::warn;

use crate::billing::entitlements::{
    creator_has_voice_profiles, creator_voice_tone_limit, get_agency_plan_tier,
    get_creator_entitlement_tier_for_user, get_creator_plan_tier_for_user, voice_clone_limit,
};

async fn enforce_voice_clone_limit_for_agency(
    state: &AppState,
    agency_id: &str,
) -> Result<(), (StatusCode, String)> {
    let tier = get_agency_plan_tier(state, agency_id).await?;
    let limit = voice_clone_limit(tier) as usize;
    if limit == 0 {
        return Err((
            StatusCode::FORBIDDEN,
            "voice_clone_not_included".to_string(),
        ));
    }

    // voice_models.user_id stores the auth.users UUID for agency-owned models
    // (set explicitly in register_voice_model/create_clone_from_recording via input.user_id = user.id).
    // agencies.id is also REFERENCES auth.users(id), so agency_id == voice_models.user_id is correct.
    let resp = state
        .pg
        .from("voice_models")
        .select("id")
        .eq("user_id", agency_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    let status = resp.status();
    let text = resp.text().await.unwrap_or_else(|_| "[]".into());
    if !status.is_success() {
        let code = StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY);
        return Err(crate::errors::sanitize_db_error(code.as_u16(), text));
    }
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    if rows.len() >= limit {
        return Err((
            StatusCode::FORBIDDEN,
            "voice_clone_limit_reached".to_string(),
        ));
    }
    Ok(())
}

async fn enforce_voice_access_for_creator(
    state: &AppState,
    user: &AuthUser,
) -> Result<(String, usize), (StatusCode, String)> {
    let (creator_id, _billed_tier, entitlement_tier) =
        get_creator_entitlement_tier_for_user(state, user).await?;
    if !creator_has_voice_profiles(entitlement_tier) {
        return Err((
            StatusCode::FORBIDDEN,
            "voice_profiles_require_pro".to_string(),
        ));
    }
    Ok((creator_id, creator_voice_tone_limit(entitlement_tier)))
}

async fn count_creator_voice_recordings(
    state: &AppState,
    creator_id: &str,
) -> Result<usize, (StatusCode, String)> {
    let resp = state
        .pg
        .from("voice_recordings")
        .select("id")
        .eq("user_id", creator_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    let status = resp.status();
    let text = resp.text().await.unwrap_or_else(|_| "[]".into());
    if !status.is_success() {
        let code = StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY);
        return Err(crate::errors::sanitize_db_error(code.as_u16(), text));
    }
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    Ok(rows.len())
}

async fn resolve_voice_owner_ids(
    state: &AppState,
    user: &AuthUser,
    talent_id: Option<&str>,
) -> Result<Vec<String>, (StatusCode, String)> {
    let mut owner_ids = HashSet::new();

    match user.role.as_str() {
        "agency" => {
            if let Some(tid) = talent_id {
                let resp = state
                    .pg
                    .from("agency_users")
                    .select("id,creator_id")
                    .eq("agency_id", &user.id)
                    .eq("id", tid)
                    .limit(1)
                    .execute()
                    .await
                    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
                let text = resp.text().await.unwrap_or_default();
                let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
                let row = rows.first().ok_or((
                    StatusCode::FORBIDDEN,
                    "Not authorized to access this talent".to_string(),
                ))?;
                owner_ids.insert(tid.to_string());
                if let Some(creator_id) = row.get("creator_id").and_then(|v| v.as_str()) {
                    if !creator_id.is_empty() {
                        owner_ids.insert(creator_id.to_string());
                    }
                }
            } else {
                owner_ids.insert(user.id.clone());
            }
        }
        "creator" | "talent" => {
            let (creator_id, _) = get_creator_plan_tier_for_user(state, user).await?;
            owner_ids.insert(creator_id);
            owner_ids.insert(user.id.clone());
        }
        "admin" => {
            if let Some(tid) = talent_id {
                owner_ids.insert(tid.to_string());
            } else {
                owner_ids.insert(user.id.clone());
            }
        }
        _ => {
            owner_ids.insert(user.id.clone());
        }
    }

    Ok(owner_ids.into_iter().collect())
}

#[derive(Deserialize)]
pub struct UploadVoiceQuery {
    #[serde(default)]
    pub emotion_tag: Option<String>,
}

#[derive(Serialize)]
pub struct UploadVoiceResponse {
    pub id: String,
    pub storage_bucket: String,
    pub storage_path: String,
}

pub async fn upload_voice_recording(
    State(state): State<AppState>,
    user: AuthUser,
    headers: HeaderMap,
    Query(q): Query<UploadVoiceQuery>,
    body: Bytes,
) -> Result<Json<UploadVoiceResponse>, (StatusCode, String)> {
    if body.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "empty body".into()));
    }

    let (owner_id, owner_type) = if user.role == "agency" {
        (user.id.clone(), StorageOwnerType::Agency)
    } else if user.role == "creator" || user.role == "talent" {
        let (creator_id, limit) = enforce_voice_access_for_creator(&state, &user).await?;
        let existing_count = count_creator_voice_recordings(&state, &creator_id).await?;
        if existing_count >= limit {
            return Err((
                StatusCode::FORBIDDEN,
                "voice_profile_limit_reached".to_string(),
            ));
        }
        (creator_id, StorageOwnerType::Creator)
    } else {
        (user.id.clone(), StorageOwnerType::User)
    };

    let ct = headers
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("audio/webm")
        .to_string();

    let ext = if ct.contains("wav") {
        "wav"
    } else if ct.contains("ogg") {
        "ogg"
    } else if ct.contains("mp4") || ct.contains("m4a") {
        "mp4"
    } else {
        "webm"
    };

    let file_name = format!("recording.{}", ext);
    let path_prefix = format!("users/{}/voice-recordings", owner_id);
    let path = canonical_object_path(
        &path_prefix,
        &sanitize_file_name(&file_name),
        chrono::Utc::now().timestamp_millis(),
    );

    // Upload using shared storage module
    let uploaded = upload_object(
        &state,
        StorageVisibility::Private,
        &path,
        body.to_vec(),
        Some(&ct),
    )
    .await
    .inspect_err(|err| {
        tracing::error!(error=%err.1, "voice recording storage upload error");
    })?;

    // Persist row to voice_recordings
    let payload = serde_json::json!({
        "user_id": owner_id,
        "storage_bucket": uploaded.bucket,
        "storage_path": uploaded.path,
        "mime_type": ct,
        "emotion_tag": q.emotion_tag,
        "accessible": true,
    });
    let ins = state
        .pg
        .from("voice_recordings")
        .insert(payload.to_string())
        .select("id")
        .execute()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    let status = ins.status();
    let txt = ins.text().await.unwrap_or_else(|_| "[]".into());

    if !status.is_success() {
        return Err(crate::errors::sanitize_db_error(status.as_u16(), txt));
    }

    let arr: serde_json::Value = serde_json::from_str(&txt).unwrap_or(serde_json::json!([]));
    let rec_id = arr
        .as_array()
        .and_then(|a| a.first())
        .and_then(|o| o.get("id"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    // Mirror into storage_assets registry
    if !rec_id.is_empty() {
        let storage_record = StorageAssetRecord {
            owner_type,
            owner_id: owner_id.clone(),
            context_type: StorageContextType::VoiceRecording,
            context_id: None,
            visibility: StorageVisibility::Private,
            object_path: uploaded.path.clone(),
            original_file_name: Some(file_name),
            mime_type: Some(ct),
            size_bytes: Some(body.len() as i64),
            checksum_sha256: None,
            source_table: Some("voice_recordings".to_string()),
            source_id: Some(rec_id.clone()),
            created_by: Some(user.id.clone()),
            counts_toward_quota: false,
        };
        if let Err(err) = insert_asset_record(&state, &storage_record).await {
            warn!(recording_id = %rec_id, user_id = %user.id, error = %err.1, "failed to mirror voice recording into storage_assets");
        }
    }

    Ok(Json(UploadVoiceResponse {
        id: rec_id,
        storage_bucket: uploaded.bucket,
        storage_path: uploaded.path,
    }))
}

#[derive(Deserialize)]
pub struct RegisterModelIn {
    pub user_id: String,
    pub provider: String,
    pub provider_voice_id: String,
    pub source_recording_id: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Serialize)]
pub struct RegisterModelOut {
    pub id: String,
}

pub async fn register_voice_model(
    State(state): State<AppState>,
    user: AuthUser,
    Json(mut input): Json<RegisterModelIn>,
) -> Result<Json<RegisterModelOut>, (StatusCode, String)> {
    if user.role == "agency" {
        enforce_voice_clone_limit_for_agency(&state, &user.id).await?;
        input.user_id = user.id.clone();
    } else if user.role == "creator" || user.role == "talent" {
        let (creator_id, limit) = enforce_voice_access_for_creator(&state, &user).await?;
        let resp = state
            .pg
            .from("voice_models")
            .select("id")
            .eq("user_id", &creator_id)
            .execute()
            .await
            .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
        let status = resp.status();
        let text = resp.text().await.unwrap_or_else(|_| "[]".into());
        if !status.is_success() {
            let code = StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY);
            return Err(crate::errors::sanitize_db_error(code.as_u16(), text));
        }
        let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
        if rows.len() >= limit {
            return Err((
                StatusCode::FORBIDDEN,
                "voice_profile_limit_reached".to_string(),
            ));
        }
        input.user_id = creator_id;
    }
    if input.user_id.is_empty() {
        input.user_id = user.id;
    }
    let payload = serde_json::json!({
        "user_id": input.user_id,
        "provider": input.provider,
        "provider_voice_id": input.provider_voice_id,
        "status": "ready",
        "source_recording_id": input.source_recording_id,
        "metadata": input.metadata,
    });
    let resp = state
        .pg
        .from("voice_models")
        .insert(payload.to_string())
        .select("id")
        .execute()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    let text = resp.text().await.unwrap_or_else(|_| "[]".into());
    let json: serde_json::Value = serde_json::from_str(&text).unwrap_or(serde_json::json!([]));
    let id = json
        .as_array()
        .and_then(|a| a.first())
        .and_then(|o| o.get("id"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    if id.is_empty() {
        return Err((StatusCode::BAD_GATEWAY, "missing inserted id".into()));
    }
    Ok(Json(RegisterModelOut { id }))
}

#[derive(Deserialize)]
pub struct SignedUrlQuery {
    pub recording_id: String,
    #[serde(default = "default_expiry")]
    pub expires_sec: i64,
}
fn default_expiry() -> i64 {
    300
}

#[derive(Serialize)]
pub struct SignedUrlOut {
    pub url: String,
}

pub async fn signed_url_for_recording(
    State(state): State<AppState>,
    user: AuthUser,
    Query(q): Query<SignedUrlQuery>,
) -> Result<Json<SignedUrlOut>, (StatusCode, String)> {
    // 1) Fetch recording and verify ownership
    let resp = state
        .pg
        .from("voice_recordings")
        .select("storage_bucket,storage_path,user_id,accessible")
        .eq("id", &q.recording_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    let text = resp.text().await.unwrap_or_else(|_| "[]".into());
    let arr: serde_json::Value = serde_json::from_str(&text).unwrap_or(serde_json::json!([]));
    let row = arr
        .as_array()
        .and_then(|a| a.first())
        .cloned()
        .ok_or((StatusCode::NOT_FOUND, "recording not found".into()))?;

    let owner_id = row
        .get("user_id")
        .and_then(|v| v.as_str())
        .ok_or((StatusCode::NOT_FOUND, "recording not found".into()))?;

    let allowed_owner_ids = resolve_voice_owner_ids(&state, &user, None).await?;
    let allowed_owner_refs: Vec<&str> = allowed_owner_ids.iter().map(|s| s.as_str()).collect();
    let mut has_access = allowed_owner_ids.iter().any(|allowed| allowed == owner_id);

    if !has_access && user.role == "admin" {
        has_access = true;
    }

    if !has_access && user.role == "agency" {
        let access = crate::team::require_agency_access(&state, &user).await?;
        let agency_id = &access.organization_id;
        let or_cond = format!("id.eq.{},creator_id.eq.{}", owner_id, owner_id);
        let check_resp = state
            .pg
            .from("agency_users")
            .select("id")
            .eq("agency_id", agency_id)
            .or(&or_cond)
            .limit(1)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let text = check_resp.text().await.unwrap_or_default();
        let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
        if !rows.is_empty() {
            has_access = true;
        }
    }

    if !has_access {
        return Err((
            StatusCode::FORBIDDEN,
            "You do not have permission to access/sign this recording".to_string(),
        ));
    }

    let bucket = row
        .get("storage_bucket")
        .and_then(|v| v.as_str())
        .ok_or((StatusCode::NOT_FOUND, "recording not found".into()))?;
    let path = row
        .get("storage_path")
        .and_then(|v| v.as_str())
        .ok_or((StatusCode::NOT_FOUND, "recording not found".into()))?;

    if !row
        .get("accessible")
        .and_then(|v| v.as_bool())
        .unwrap_or(true)
    {
        return Err((StatusCode::NOT_FOUND, "recording not found".into()));
    }

    // Use shared storage module for signed URL generation
    let signed_url = match generate_signed_url(&state, bucket, path, q.expires_sec).await {
        Ok(url) => url,
        Err(err) => {
            let is_object_not_found = err.1.contains("Object not found")
                || err.1.contains("\"error\":\"not_found\"")
                || err.1.contains("\"error\": \"not_found\"")
                || err.1.contains("\"statusCode\":404")
                || err.1.contains("\"statusCode\": 404");

            if is_object_not_found {
                let _ = state
                    .pg
                    .from("voice_recordings")
                    .update("{\"accessible\": false}")
                    .eq("id", &q.recording_id)
                    .in_("user_id", allowed_owner_refs)
                    .execute()
                    .await;

                return Err((StatusCode::NOT_FOUND, "recording not found".into()));
            } else {
                return Err(err);
            }
        }
    };

    Ok(Json(SignedUrlOut { url: signed_url }))
}

#[derive(Deserialize)]
pub struct CreateCloneIn {
    pub user_id: String,
    pub recording_id: String,
    pub voice_name: String,
    #[serde(default)]
    pub description: Option<String>,
}

#[derive(Serialize)]
pub struct CreateCloneOut {
    pub provider: String,
    pub voice_id: String,
    pub model_row_id: String,
}

// Creates an ElevenLabs voice from an existing private recording
pub async fn create_clone_from_recording(
    State(state): State<AppState>,
    user: AuthUser,
    Json(mut input): Json<CreateCloneIn>,
) -> Result<Json<CreateCloneOut>, (StatusCode, String)> {
    if user.role == "agency" {
        enforce_voice_clone_limit_for_agency(&state, &user.id).await?;
        input.user_id = user.id.clone();
    } else if user.role == "creator" || user.role == "talent" {
        let (creator_id, limit) = enforce_voice_access_for_creator(&state, &user).await?;
        let resp = state
            .pg
            .from("voice_models")
            .select("id")
            .eq("user_id", &creator_id)
            .execute()
            .await
            .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
        let status = resp.status();
        let text = resp.text().await.unwrap_or_else(|_| "[]".into());
        if !status.is_success() {
            let code = StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY);
            return Err(crate::errors::sanitize_db_error(code.as_u16(), text));
        }
        let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
        if rows.len() >= limit {
            return Err((
                StatusCode::FORBIDDEN,
                "voice_profile_limit_reached".to_string(),
            ));
        }
        input.user_id = creator_id;
    }
    if input.user_id.is_empty() {
        input.user_id = user.id;
    }
    if state.elevenlabs_api_key.is_empty() {
        return Err((
            StatusCode::SERVICE_UNAVAILABLE,
            "ELEVENLABS_API_KEY not configured".into(),
        ));
    }

    // 1) Lookup recording path
    let rec_resp = state
        .pg
        .from("voice_recordings")
        .select("storage_bucket,storage_path,mime_type,emotion_tag")
        .eq("id", &input.recording_id)
        .eq("user_id", &input.user_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    let rec_txt = rec_resp.text().await.unwrap_or_else(|_| "[]".into());
    let arr: serde_json::Value = serde_json::from_str(&rec_txt).unwrap_or(serde_json::json!([]));
    let rec = arr
        .as_array()
        .and_then(|a| a.first())
        .cloned()
        .unwrap_or(serde_json::json!(null));
    let bucket = rec
        .get("storage_bucket")
        .and_then(|v| v.as_str())
        .ok_or((StatusCode::NOT_FOUND, "recording not found".into()))?;
    let path = rec
        .get("storage_path")
        .and_then(|v| v.as_str())
        .ok_or((StatusCode::NOT_FOUND, "recording not found".into()))?;
    let mime = rec
        .get("mime_type")
        .and_then(|v| v.as_str())
        .unwrap_or("audio/webm");

    // 2) Download audio bytes from private storage using shared module
    let downloaded = download_object(&state, bucket, path).await.map_err(|err| {
        (
            StatusCode::BAD_GATEWAY,
            format!("failed to download recording: {}", err.1),
        )
    })?;

    let bytes = downloaded.bytes;

    // 3) POST to ElevenLabs voices/add
    let form = reqwest::multipart::Form::new()
        .text("name", input.voice_name.clone())
        .text("description", input.description.clone().unwrap_or_default())
        .part(
            "files",
            reqwest::multipart::Part::bytes(bytes.to_vec())
                .mime_str(mime)
                .unwrap()
                .file_name("sample.".to_string()),
        );

    let el_http = reqwest::Client::new();
    let el_resp = el_http
        .post("https://api.elevenlabs.io/v1/voices/add")
        .header("xi-api-key", state.elevenlabs_api_key.clone())
        .multipart(form)
        .send()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    if !el_resp.status().is_success() {
        let msg = el_resp.text().await.unwrap_or_default();
        return Err((StatusCode::BAD_GATEWAY, format!("elevenlabs error: {msg}")));
    }
    let el_json: serde_json::Value = el_resp
        .json()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    let voice_id = el_json
        .get("voice_id")
        .or_else(|| el_json.get("voiceId"))
        .and_then(|v| v.as_str())
        .ok_or((StatusCode::BAD_GATEWAY, "missing voice_id".into()))?
        .to_string();

    // 4) Persist voice_models row
    let payload = serde_json::json!({
        "user_id": input.user_id,
        "provider": "elevenlabs",
        "provider_voice_id": voice_id,
        "status": "ready",
        "metadata": el_json,
        "source_recording_id": input.recording_id,
    });
    let ins = state
        .pg
        .from("voice_models")
        .insert(payload.to_string())
        .select("id")
        .execute()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    let txt = ins.text().await.unwrap_or_else(|_| "[]".into());
    let arr: serde_json::Value = serde_json::from_str(&txt).unwrap_or(serde_json::json!([]));
    let model_row_id = arr
        .as_array()
        .and_then(|a| a.first())
        .and_then(|o| o.get("id"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    if model_row_id.is_empty() {
        return Err((StatusCode::BAD_GATEWAY, "missing inserted id".into()));
    }

    Ok(Json(CreateCloneOut {
        provider: "elevenlabs".into(),
        voice_id,
        model_row_id,
    }))
}

#[derive(Deserialize)]
pub struct ListVoiceQuery {
    pub user_id: String,
}
// List persisted recordings for a user and include derived fields
pub async fn list_voice_recordings(
    State(state): State<AppState>,
    Query(params): Query<std::collections::HashMap<String, String>>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // We will query recordings where user_id is IN this list
    let mut target_user_ids = vec![user.id.clone()];

    if user.role == "creator" || user.role == "talent" {
        if let Ok((creator_id, _)) = get_creator_plan_tier_for_user(&state, &user).await {
            if !creator_id.trim().is_empty() && !target_user_ids.iter().any(|v| v == &creator_id) {
                target_user_ids.push(creator_id);
            }
        }
    }

    // If a talent_id is provided and the user is an agency, check management access
    if let Some(tid) = params.get("talent_id") {
        if user.role == "agency" {
            let access = crate::team::require_agency_access(&state, &user).await?;
            let agency_id = &access.organization_id;

            let talent_ref =
                crate::agency::agency_talent_refs::resolve_agency_talent_ref(&state, agency_id, tid)
                    .await?;

            let effective_agency_user_id = talent_ref
                .agency_user_id
                .clone()
                .unwrap_or_else(|| talent_ref.id.clone());
            let effective_creator_id = talent_ref.creator_id.clone();

            target_user_ids.clear();
            if !effective_agency_user_id.trim().is_empty() {
                target_user_ids.push(effective_agency_user_id);
            }
            if let Some(cid) = effective_creator_id {
                if !cid.trim().is_empty() && !target_user_ids.iter().any(|x| x == &cid) {
                    target_user_ids.push(cid);
                }
            }

            if target_user_ids.is_empty() {
                return Err((
                    StatusCode::FORBIDDEN,
                    "Not authorized to access this talent".into(),
                ));
            }
        } else if user.role == "admin" {
            target_user_ids = vec![tid.clone()];
        }
    }

    let t_refs: Vec<&str> = target_user_ids.iter().map(|s| s.as_str()).collect();

    let resp = state
        .pg
        .from("voice_recordings")
        .select("*")
        .in_("user_id", t_refs)
        .order("created_at.desc")
        .execute()
        .await // Added .await here
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    let txt = resp.text().await.unwrap_or_else(|_| "[]".into());
    let json: serde_json::Value = serde_json::from_str(&txt).unwrap_or(serde_json::json!([]));

    let mut out_arr = Vec::new();
    if let Some(arr) = json.as_array() {
        for row in arr {
            let mut row_obj = row.clone();
            let rec_id = row.get("id").and_then(|v| v.as_str()).unwrap_or("");
            if !rec_id.is_empty() {
                let has_model = match state
                    .pg
                    .from("voice_models")
                    .select("id")
                    .eq("source_recording_id", rec_id)
                    .limit(1)
                    .execute()
                    .await
                {
                    Ok(r) => {
                        let t = r.text().await.unwrap_or_else(|_| "[]".into());
                        let v: serde_json::Value =
                            serde_json::from_str(&t).unwrap_or(serde_json::json!([]));
                        v.as_array().map(|a| !a.is_empty()).unwrap_or(false)
                    }
                    Err(_) => false,
                };
                if let Some(obj) = row_obj.as_object_mut() {
                    obj.insert("voice_profile_created".into(), serde_json::json!(has_model));
                }
            }
            out_arr.push(row_obj);
        }
    }

    Ok(Json(serde_json::json!(out_arr)))
}

#[derive(Serialize)]
pub struct DeleteVoiceOut {
    pub deleted: bool,
}

// Delete a recording: remove storage object, any brand_voice_assets references, then DB row
pub async fn delete_voice_recording(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<DeleteVoiceOut>, (StatusCode, String)> {
    // 1) Lookup bucket/path and verify ownership
    let resp = state
        .pg
        .from("voice_recordings")
        .select("storage_bucket,storage_path,user_id")
        .eq("id", &id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    let txt = resp.text().await.unwrap_or_else(|_| "[]".into());
    let arr: serde_json::Value = serde_json::from_str(&txt).unwrap_or(serde_json::json!([]));
    let row = arr
        .as_array()
        .and_then(|a| a.first())
        .cloned()
        .ok_or((StatusCode::NOT_FOUND, "recording not found".into()))?;

    let owner_id = row
        .get("user_id")
        .and_then(|v| v.as_str())
        .ok_or((StatusCode::NOT_FOUND, "recording not found".into()))?;

    let allowed_owner_ids = resolve_voice_owner_ids(&state, &user, None).await?;
    let allowed_owner_refs: Vec<&str> = allowed_owner_ids.iter().map(|s| s.as_str()).collect();
    if !allowed_owner_ids.iter().any(|allowed| allowed == owner_id) {
        return Err((
            StatusCode::FORBIDDEN,
            "You do not have permission to delete this recording".to_string(),
        ));
    }

    let bucket = row
        .get("storage_bucket")
        .and_then(|v| v.as_str())
        .ok_or((StatusCode::NOT_FOUND, "recording not found".into()))?;
    let path = row
        .get("storage_path")
        .and_then(|v| v.as_str())
        .ok_or((StatusCode::NOT_FOUND, "recording not found".into()))?;

    // 2) Delete storage object using shared module (STRICT)
    if let Err(err) = delete_object(&state, bucket, path).await {
        tracing::error!(status=?err.0, body=%err.1, "voice recording storage delete failed");
        return Err((
            StatusCode::BAD_GATEWAY,
            "failed to delete recording from storage".into(),
        ));
    }

    // 3) Soft-delete storage_assets registry row
    if let Err(err) = soft_delete_asset_record(&state, "voice_recordings", &id).await {
        warn!(recording_id = %id, error = %err.1, "failed to soft-delete storage_assets row for voice recording");
    }

    // 4) Delete brand asset references (best-effort)
    let _ = state
        .pg
        .from("brand_voice_assets")
        .delete()
        .eq("recording_id", &id)
        .execute()
        .await;

    // 5) If a voice model references this recording, clear it first.
    // Some PostgREST deployments surface this as a 409/validation error on delete,
    // even though the FK is configured as ON DELETE SET NULL.
    let vm_upd = state
        .pg
        .from("voice_models")
        .update("{\"source_recording_id\": null}")
        .eq("source_recording_id", &id)
        .in_("user_id", allowed_owner_refs.clone())
        .execute()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    let vm_status = vm_upd.status();
    let vm_text = vm_upd
        .text()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    if !vm_status.is_success() {
        return Err(crate::errors::sanitize_db_error(
            vm_status.as_u16(),
            vm_text,
        ));
    }

    // 6) Delete DB row
    let del_resp = state
        .pg
        .from("voice_recordings")
        .delete()
        .eq("id", &id)
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

    // 7) Confirm the row is actually gone (PostgREST may return 2xx even if nothing was deleted,
    // and some deployments don't support returning deleted rows from DELETE)
    let check = state
        .pg
        .from("voice_recordings")
        .select("id")
        .eq("id", &id)
        .in_("user_id", allowed_owner_refs)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    let check_status = check.status();
    let check_text = check
        .text()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    if !check_status.is_success() {
        return Err(crate::errors::sanitize_db_error(
            check_status.as_u16(),
            check_text,
        ));
    }
    let remaining: serde_json::Value =
        serde_json::from_str(&check_text).unwrap_or(serde_json::json!([]));
    if remaining.as_array().map(|a| !a.is_empty()).unwrap_or(false) {
        return Err((
            StatusCode::BAD_GATEWAY,
            format!("delete did not remove row: {del_text}"),
        ));
    }

    Ok(Json(DeleteVoiceOut { deleted: true }))
}

#[cfg(test)]
mod tests {
    use crate::storage::{
        canonical_object_path, sanitize_file_name, StorageContextType, StorageOwnerType,
        StorageVisibility,
    };

    #[test]
    fn test_voice_recording_path_generation() {
        let user_id = "user_123";
        let file_name = "recording.webm";
        let timestamp = 1234567890123i64;

        let path_prefix = format!("users/{}/voice-recordings", user_id);
        let path = canonical_object_path(&path_prefix, &sanitize_file_name(file_name), timestamp);

        assert!(path.starts_with("users/user_123/voice-recordings/"));
        assert!(path.contains("1234567890123"));
        assert!(path.ends_with("recording.webm"));
    }

    #[test]
    fn test_voice_recording_file_extension_detection() {
        let test_cases = vec![
            ("audio/wav", "wav"),
            ("audio/x-wav", "wav"),
            ("audio/ogg", "ogg"),
            ("audio/mp4", "mp4"),
            ("audio/m4a", "mp4"),
            ("audio/webm", "webm"),
            ("audio/mpeg", "webm"), // default
        ];

        for (content_type, expected_ext) in test_cases {
            let ext = if content_type.contains("wav") {
                "wav"
            } else if content_type.contains("ogg") {
                "ogg"
            } else if content_type.contains("mp4") || content_type.contains("m4a") {
                "mp4"
            } else {
                "webm"
            };

            assert_eq!(
                ext, expected_ext,
                "Failed for content type: {}",
                content_type
            );
        }
    }

    #[test]
    fn test_storage_asset_record_for_voice_recording() {
        let user_id = "user_456";
        let recording_id = "rec_789";
        let object_path = "users/user_456/voice-recordings/1234567890123_recording.webm";
        let file_name = "recording.webm";
        let mime_type = "audio/webm";
        let size_bytes = 1024i64;

        let record = crate::storage::StorageAssetRecord {
            owner_type: StorageOwnerType::User,
            owner_id: user_id.to_string(),
            context_type: StorageContextType::VoiceRecording,
            context_id: None,
            visibility: StorageVisibility::Private,
            object_path: object_path.to_string(),
            original_file_name: Some(file_name.to_string()),
            mime_type: Some(mime_type.to_string()),
            size_bytes: Some(size_bytes),
            checksum_sha256: None,
            source_table: Some("voice_recordings".to_string()),
            source_id: Some(recording_id.to_string()),
            created_by: Some(user_id.to_string()),
            counts_toward_quota: false,
        };

        assert_eq!(record.owner_type, StorageOwnerType::User);
        assert_eq!(record.owner_id, user_id);
        assert_eq!(record.context_type, StorageContextType::VoiceRecording);
        assert_eq!(record.visibility, StorageVisibility::Private);
        assert_eq!(record.object_path, object_path);
        assert_eq!(record.source_table, Some("voice_recordings".to_string()));
        assert_eq!(record.source_id, Some(recording_id.to_string()));
        assert!(!record.counts_toward_quota);
    }

    #[test]
    fn test_sanitize_voice_recording_filename() {
        let test_cases = vec![
            ("recording.webm", "recording.webm"),
            ("my recording.wav", "my_recording.wav"),
            ("voice@sample#1.ogg", "voice_sample_1.ogg"),
            ("../../../etc/passwd", "_._._etc_passwd"),
            ("", "upload.bin"),
            ("recording with spaces.mp4", "recording_with_spaces.mp4"),
        ];

        for (input, expected) in test_cases {
            let sanitized = sanitize_file_name(input);
            assert_eq!(
                sanitized, expected,
                "Failed to sanitize: {} -> {}",
                input, expected
            );
        }
    }

    #[test]
    fn test_voice_recording_visibility() {
        // Voice recordings should always be private
        let visibility = StorageVisibility::Private;
        assert_eq!(visibility, StorageVisibility::Private);
        assert_eq!(visibility.as_str(), "private");
    }

    #[test]
    fn test_voice_recording_owner_type() {
        let owner_type = StorageOwnerType::User;
        assert_eq!(owner_type, StorageOwnerType::User);
        assert_eq!(owner_type.as_str(), "user");
    }

    #[test]
    fn test_voice_recording_agency_owner_type() {
        let owner_type = StorageOwnerType::Agency;
        assert_eq!(owner_type, StorageOwnerType::Agency);
        assert_eq!(owner_type.as_str(), "agency");
    }

    #[test]
    fn test_voice_recording_creator_owner_type() {
        let owner_type = StorageOwnerType::Creator;
        assert_eq!(owner_type, StorageOwnerType::Creator);
        assert_eq!(owner_type.as_str(), "creator");
    }

    #[test]
    fn test_voice_recording_context_type() {
        let context_type = StorageContextType::VoiceRecording;
        assert_eq!(context_type, StorageContextType::VoiceRecording);
        assert_eq!(context_type.as_str(), "voice_recording");
    }

    #[test]
    fn test_voice_recording_quota_attribution() {
        // Voice recordings should NOT count toward agency quota
        // They are creator-owned source assets
        let counts_toward_quota = false;
        assert!(!counts_toward_quota);
    }
}
