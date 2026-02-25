use crate::{auth::AuthUser, config::AppState};
use axum::{
    body::Bytes,
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use serde::{Deserialize, Serialize};

use crate::entitlements::{get_agency_plan_tier, voice_clone_limit};

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

    let ct = headers
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("audio/webm")
        .to_string();

    // Private bucket
    let bucket = state.supabase_bucket_private.clone();
    let owner = user.id.replace(
        |c: char| !c.is_ascii_alphanumeric() && c != '_' && c != '-',
        "_",
    );
    let ext = if ct.contains("wav") {
        "wav"
    } else if ct.contains("ogg") {
        "ogg"
    } else if ct.contains("mp4") || ct.contains("m4a") {
        "mp4"
    } else {
        "webm"
    };

    let path = format!(
        "likeness/{}/voice/recordings/{}.{}",
        owner,
        chrono::Utc::now().timestamp_millis(),
        ext
    );

    // Upload to Storage
    let storage_url = format!(
        "{}/storage/v1/object/{}/{}",
        state.supabase_url, bucket, path
    );
    let http = reqwest::Client::new();
    let up = http
        .post(&storage_url)
        .header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        )
        .header("apikey", state.supabase_service_key.clone())
        .header("content-type", ct.clone())
        .body(body)
        .send()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    if !up.status().is_success() {
        let msg = up.text().await.unwrap_or_default();
        return Err((
            StatusCode::BAD_GATEWAY,
            format!("storage upload failed: {msg}"),
        ));
    }

    // Persist row
    let payload = serde_json::json!({
        "user_id": user.id,
        "storage_bucket": bucket,
        "storage_path": path,
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
    let txt = ins.text().await.unwrap_or_else(|_| "[]".into());
    let arr: serde_json::Value = serde_json::from_str(&txt).unwrap_or(serde_json::json!([]));
    let rec_id = arr
        .as_array()
        .and_then(|a| a.first())
        .and_then(|o| o.get("id"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    Ok(Json(UploadVoiceResponse {
        id: rec_id,
        storage_bucket: state.supabase_bucket_private.clone(),
        storage_path: path,
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
    }
    input.user_id = user.id;
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

    let mut has_access = owner_id == user.id;

    if !has_access && user.role == "admin" {
        has_access = true;
    }

    if !has_access && user.role == "agency" {
        // check if this agency manages the owner_id (either as the agency_user ID or their creator_id)
        let or_cond = format!("id.eq.{},creator_id.eq.{}", owner_id, owner_id);
        let check_resp = state
            .pg
            .from("agency_users")
            .select("id")
            .eq("agency_id", &user.id)
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

    // Request signed URL via Storage API
    let url = format!(
        "{}/storage/v1/object/sign/{}/{}",
        state.supabase_url, bucket, path
    );
    let body = serde_json::json!({ "expiresIn": q.expires_sec });
    let http = reqwest::Client::new();
    let sign = http
        .post(&url)
        .header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        )
        .header("apikey", state.supabase_service_key.clone())
        .json(&body)
        .send()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    if !sign.status().is_success() {
        let msg = sign.text().await.unwrap_or_default();

        let is_object_not_found = msg.contains("Object not found")
            || msg.contains("\"error\":\"not_found\"")
            || msg.contains("\"error\": \"not_found\"")
            || msg.contains("\"statusCode\":404")
            || msg.contains("\"statusCode\": 404");

        if is_object_not_found {
            let _ = state
                .pg
                .from("voice_recordings")
                .update("{\"accessible\": false}")
                .eq("id", &q.recording_id)
                .eq("user_id", &user.id)
                .execute()
                .await;

            return Err((StatusCode::NOT_FOUND, "recording not found".into()));
        }

        return Err((StatusCode::BAD_GATEWAY, format!("sign url failed: {msg}")));
    }
    let signed_json: serde_json::Value = sign
        .json()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    let signed_path = signed_json
        .get("signedURL")
        .and_then(|v| v.as_str())
        .ok_or((StatusCode::BAD_GATEWAY, "invalid sign response".into()))?;
    let full = format!("{}/storage/v1{}", state.supabase_url, signed_path);
    Ok(Json(SignedUrlOut { url: full }))
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
    }
    input.user_id = user.id;
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

    // 2) Download audio bytes from private storage using service key
    let get_url = format!(
        "{}/storage/v1/object/{}/{}",
        state.supabase_url, bucket, path
    );
    let http = reqwest::Client::new();
    let audio_resp = http
        .get(&get_url)
        .header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        )
        .header("apikey", state.supabase_service_key.clone())
        .send()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    if !audio_resp.status().is_success() {
        let msg = audio_resp.text().await.unwrap_or_default();
        return Err((
            StatusCode::BAD_GATEWAY,
            format!("failed to download recording: {msg}"),
        ));
    }
    let bytes = audio_resp
        .bytes()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

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

    // If a talent_id is provided and the user is an agency, check management access
    if let Some(tid) = params.get("talent_id") {
        if user.role == "agency" {
            let resp = state
                .pg
                .from("agency_users")
                .select("id, creator_id")
                .eq("agency_id", &user.id)
                .eq("id", tid)
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            
            let text = resp.text().await.unwrap_or_default();
            let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
            
            if let Some(row) = rows.first() {
                target_user_ids.clear();
                // 1. push the agency_users.id itself (where agency uploads might go)
                target_user_ids.push(tid.clone());
                // 2. push the creator_id (where talent's own recordings go)
                if let Some(creator_id) = row.get("creator_id").and_then(|v| v.as_str()) {
                    if !creator_id.is_empty() {
                        target_user_ids.push(creator_id.to_string());
                    }
                }
            } else {
                return Err((StatusCode::FORBIDDEN, "Not authorized to access this talent".into()));
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

    if owner_id != user.id {
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

    // Delete storage object (best-effort)
    let del_url = format!(
        "{}/storage/v1/object/{}/{}",
        state.supabase_url, bucket, path
    );
    let http = reqwest::Client::new();
    let _ = http
        .delete(&del_url)
        .header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        )
        .header("apikey", state.supabase_service_key.clone())
        .send()
        .await;

    // Delete brand asset references (best-effort)
    let _ = state
        .pg
        .from("brand_voice_assets")
        .delete()
        .eq("recording_id", &id)
        .execute()
        .await;

    // If a voice model references this recording, clear it first.
    // Some PostgREST deployments surface this as a 409/validation error on delete,
    // even though the FK is configured as ON DELETE SET NULL.
    let vm_upd = state
        .pg
        .from("voice_models")
        .update("{\"source_recording_id\": null}")
        .eq("source_recording_id", &id)
        .eq("user_id", &user.id)
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

    // Delete DB row
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

    // Confirm the row is actually gone (PostgREST may return 2xx even if nothing was deleted,
    // and some deployments don't support returning deleted rows from DELETE)
    let check = state
        .pg
        .from("voice_recordings")
        .select("id")
        .eq("id", &id)
        .eq("user_id", &user.id)
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
