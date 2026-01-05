use crate::config::AppState;
use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};
use serde_json::json;
use uuid::Uuid;
use tracing::info;

#[derive(Deserialize)]
pub struct StartLipsyncRequest {
    pub user_id: String,
    #[serde(default)]
    pub tts_text: Option<String>,
    #[serde(default)]
    pub audio_url: Option<String>,
    #[serde(default)]
    pub voice_id: Option<String>,
    #[serde(default)]
    pub model_version: Option<String>,
    #[serde(default)]
    pub avatar_id: Option<String>,
}

#[derive(Serialize)]
pub struct StartLipsyncResponse {
    pub creatify_job_id: String,
    pub status: String,
}

pub async fn start_lipsync(
    State(state): State<AppState>,
    Json(req): Json<StartLipsyncRequest>,
) -> Result<Json<StartLipsyncResponse>, (StatusCode, String)> {
    if state.creatify_api_key.is_empty() || state.creatify_api_id.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Creatify not configured".into()));
    }
    let user_id = req.user_id;
    // Always fetch profile to read stored avatar id or cameo url as needed
    let resp = state
        .pg
        .from("profiles")
        .select("id, cameo_front_url, creatify_avatar_id, creatify_job_id, creatify_job_status")
        .eq("id", &user_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let ok = resp.status().is_success();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !ok {
        return Err((StatusCode::INTERNAL_SERVER_ERROR, text));
    }
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let row = rows.into_iter().next().ok_or((
        StatusCode::BAD_REQUEST,
        "Profile not found".to_string(),
    ))?;
    let stored_avatar_id = row.get("creatify_avatar_id").and_then(|v| v.as_str()).map(|s| s.to_string());
    // Enforce reading avatar id only from profile; ignore any avatar_id provided in the request
    let final_avatar_id = stored_avatar_id;
    if final_avatar_id.is_none() {
        return Err((StatusCode::BAD_REQUEST, "Missing avatar_id. Please store your Creatify avatar on the profile using POST /api/creatify/avatar before generating.".into()));
    }

    // Build Creatify payload per provided sample when avatar_id is supplied.
    // If neither tts_text nor audio_url provided, try to synthesize using ElevenLabs voice for the user.
    let mut tts_text = req.tts_text.clone();
    let mut audio_url = req.audio_url.clone();
    if tts_text.is_none() && audio_url.is_none() {
        // default intro text
        tts_text = Some("Hi! I'm using my Likelee AI cameo. Likelee AI makes it easy to create amazing branded content.".to_string());
        if !state.elevenlabs_api_key.is_empty() {
            if let Ok(maybe_audio) = synthesize_tts_and_upload(&state, &user_id, tts_text.clone().unwrap()).await {
                if let Some(u) = maybe_audio {
                    audio_url = Some(u);
                    // Prefer audio over text when we have synthesized TTS via ElevenLabs
                    tts_text = None;
                }
            }
        }
    }

    let model_version = req.model_version.unwrap_or_else(|| "standard".to_string());

    let mut payload = serde_json::Map::new();
    // Keep payload minimal to match Creatify expectations
    payload.insert("model_version".into(), json!(model_version));

    if let Some(avatar_id) = final_avatar_id.clone() {
        let character = json!({
            "type": "avatar",
            "avatar_id": avatar_id
        });
        // Only include voice_id if provided to avoid API validation errors
        let voice = if let Some(text) = tts_text.clone() {
            let mut v = serde_json::Map::new();
            v.insert("type".into(), json!("text"));
            v.insert("input_text".into(), json!(text));
            // voice_id is required for text voices in v2 API — use provided or default fallback
            let vid = req
                .voice_id
                .clone()
                .filter(|s| !s.is_empty())
                .unwrap_or_else(|| "6f8ca7a8-87b9-4f5d-905d-cc4598e79717".to_string());
            v.insert("voice_id".into(), json!(vid));
            serde_json::Value::Object(v)
        } else {
            let mut v = serde_json::Map::new();
            v.insert("type".into(), json!("audio"));
            v.insert("url".into(), json!(audio_url.clone().unwrap_or_default()));
            if let Some(vid) = req.voice_id.clone() { if !vid.is_empty() { v.insert("voice_id".into(), json!(vid)); } }
            serde_json::Value::Object(v)
        };

        let video_inputs = json!([
            {
                "character": character,
                "voice": voice
            }
        ]);
        payload.insert("video_inputs".into(), video_inputs);
        payload.insert("aspect_ratio".into(), json!("9x16"));
    }

    let base = state.creatify_base_url.trim_end_matches('/').to_string();
    let client = reqwest::Client::new();

    // Attempt v2 first
    let url_v2 = format!("{}/api/lipsyncs_v2", base);
    let payload_dbg = serde_json::Value::Object(payload.clone());
    info!(target: "creatify", "POST /api/lipsyncs_v2 payload={}", payload_dbg);
    let res = client
        .post(url_v2.clone())
        .header("Content-Type", "application/json")
        .header("X-API-ID", &state.creatify_api_id)
        .header("X-API-KEY", &state.creatify_api_key)
        .json(&payload)
        .send()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    if !res.status().is_success() {
        let body = res.text().await.unwrap_or_default();
        return Err((StatusCode::BAD_GATEWAY, format!("Creatify v2 error: {}", body)));
    }
    let text_body = res.text().await.map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    // Try parse as object first
    let parsed_val: serde_json::Value = serde_json::from_str(&text_body).map_err(|e| (StatusCode::BAD_GATEWAY, format!("invalid json from creatify: {}", e)))?;
    let (root_obj, from_array);
    if let Some(arr) = parsed_val.as_array() {
        if arr.is_empty() {
            // Treat as missing id to trigger fallback to legacy endpoint below
            root_obj = serde_json::json!({});
            from_array = true;
        } else {
            root_obj = arr[0].clone();
            from_array = true;
        }
    } else {
        root_obj = parsed_val.clone();
        from_array = false;
    }

    let job_id_opt = root_obj
        .get("id")
        .or_else(|| root_obj.get("job_id"))
        .or_else(|| root_obj.get("task_id"))
        .or_else(|| root_obj.get("lipsync_id"))
        .or_else(|| root_obj.get("uuid"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .or_else(|| root_obj.pointer("/data/id").and_then(|v| v.as_str()).map(|s| s.to_string()))
        .or_else(|| root_obj.pointer("/result/id").and_then(|v| v.as_str()).map(|s| s.to_string()))
        .or_else(|| root_obj.pointer("/data/0/id").and_then(|v| v.as_str()).map(|s| s.to_string()))
        .or_else(|| root_obj.pointer("/result/job/id").and_then(|v| v.as_str()).map(|s| s.to_string()));
    let job_id = match job_id_opt {
        Some(id) => id,
        None => {
            // We'll collect an id here and return it as the arm's value
            let mut out_id: Option<String> = None;

            // Retry v2 with alternative schema: character.type = "creator" and use creator_id copied from avatar_id
            let mut payload_alt = payload.clone();
            if let Some(inputs) = payload_alt.get_mut("video_inputs").and_then(|v| v.as_array_mut()) {
                if let Some(first) = inputs.get_mut(0) {
                    if let Some(mut char_obj) = first.get("character").and_then(|c| c.as_object()).cloned() {
                        let avatar_id_val = char_obj.get("avatar_id").and_then(|v| v.as_str()).map(|s| s.to_string());
                        char_obj.insert("type".into(), json!("creator"));
                        if let Some(aid) = avatar_id_val {
                            char_obj.insert("creator_id".into(), json!(aid));
                        }
                        let _ = first.as_object_mut().unwrap().insert("character".into(), serde_json::Value::Object(char_obj));
                    }
                }
            }
            let payload_alt_dbg = serde_json::Value::Object(payload_alt.clone());
            info!(target: "creatify", "POST /api/lipsyncs_v2 (alt) payload={}", payload_alt_dbg);
            let res_alt = client
                .post(url_v2.clone())
                .header("Content-Type", "application/json")
                .header("X-API-ID", &state.creatify_api_id)
                .header("X-API-KEY", &state.creatify_api_key)
                .json(&payload_alt)
                .send()
                .await
                .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
            if res_alt.status().is_success() {
                let text_alt = res_alt.text().await.map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
                let val_alt: serde_json::Value = serde_json::from_str(&text_alt).map_err(|e| (StatusCode::BAD_GATEWAY, format!("invalid json from creatify v2 alt: {}", e)))?;
                out_id = if let Some(arr_alt) = val_alt.as_array() {
                    arr_alt.get(0).and_then(|o| o.get("id").and_then(|v| v.as_str()).map(|s| s.to_string()))
                } else {
                    val_alt.get("id").and_then(|v| v.as_str()).map(|s| s.to_string())
                };
            }

            // If still no id, fallback to legacy /api/lipsyncs ensuring character has avatar_id
            if out_id.is_none() {
                let url_v1 = format!("{}/api/lipsyncs", base);
                let mut payload_v1 = payload.clone();
                if let Some(inputs) = payload_v1.get_mut("video_inputs").and_then(|v| v.as_array_mut()) {
                    if let Some(first) = inputs.get_mut(0) {
                        if let Some(char_obj) = first.get_mut("character").and_then(|c| c.as_object()).cloned() {
                            let mut new_char = char_obj.clone();
                            // Ensure avatar_id exists on legacy payload
                            if new_char.get("avatar_id").is_none() {
                                if let Some(aid) = new_char.get("creator_id").and_then(|v| v.as_str()) {
                                    new_char.insert("avatar_id".into(), json!(aid));
                                }
                            }
                            new_char.remove("creator_id");
                            let _ = first.as_object_mut().unwrap().insert("character".into(), serde_json::Value::Object(new_char));
                        }
                    }
                }
                let payload_v1_dbg = serde_json::Value::Object(payload_v1.clone());
                info!(target: "creatify", "POST /api/lipsyncs (legacy) payload={}", payload_v1_dbg);
                let res2 = client
                    .post(url_v1.clone())
                    .header("Content-Type", "application/json")
                    .header("X-API-ID", &state.creatify_api_id)
                    .header("X-API-KEY", &state.creatify_api_key)
                    .json(&payload_v1)
                    .send()
                    .await
                    .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
                if !res2.status().is_success() {
                    let body2 = res2.text().await.unwrap_or_default();
                    return Err((StatusCode::BAD_GATEWAY, format!(
                        "Creatify v2 returned no id: {} ; Creatify v1 error: {}",
                        if from_array { root_obj } else { parsed_val }, body2
                    )));
                }
                let text2 = res2.text().await.map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
                let val2: serde_json::Value = serde_json::from_str(&text2).map_err(|e| (StatusCode::BAD_GATEWAY, format!("invalid json from creatify v1: {}", e)))?;
                let try_obj = |obj: &serde_json::Value| {
                    obj.get("id")
                        .or_else(|| obj.get("job_id"))
                        .or_else(|| obj.get("task_id"))
                        .or_else(|| obj.get("lipsync_id"))
                        .or_else(|| obj.get("uuid"))
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string())
                        .or_else(|| obj.pointer("/data/id").and_then(|v| v.as_str()).map(|s| s.to_string()))
                        .or_else(|| obj.pointer("/result/id").and_then(|v| v.as_str()).map(|s| s.to_string()))
                        .or_else(|| obj.pointer("/data/0/id").and_then(|v| v.as_str()).map(|s| s.to_string()))
                        .or_else(|| obj.pointer("/result/job/id").and_then(|v| v.as_str()).map(|s| s.to_string()))
                };
                out_id = if let Some(arr2) = val2.as_array() {
                    arr2.get(0).and_then(|first| try_obj(first))
                } else {
                    try_obj(&val2)
                };
                if out_id.is_none() {
                    return Err((StatusCode::BAD_GATEWAY, format!(
                        "Creatify v2 and v1 returned no job id. Verify your Creatify avatar_id exists and the payload matches API spec. v2_resp={} ; v1_resp={} ; payload={}",
                        if from_array { root_obj } else { parsed_val }, val2, serde_json::Value::Object(payload.clone())
                    )));
                }
            }

            // Return the resolved job id
            out_id.unwrap()
        }
    };

    // Persist job id and initial status
    let update = json!({
        "creatify_job_id": job_id,
        "creatify_job_status": "started",
    });
    state
        .pg
        .from("profiles")
        .update(update.to_string())
        .eq("id", &user_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(StartLipsyncResponse { creatify_job_id: job_id, status: "started".into() }))
}

#[derive(Deserialize)]
pub struct StatusQuery { pub user_id: String }

pub async fn get_lipsync_status(
    State(state): State<AppState>,
    axum::extract::Query(q): axum::extract::Query<StatusQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("profiles")
        .select("creatify_job_id, creatify_job_status, creatify_output_url")
        .eq("id", &q.user_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let ok = resp.status().is_success();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !ok { return Err((StatusCode::INTERNAL_SERVER_ERROR, text)); }
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if rows.is_empty() {
        return Err((StatusCode::NOT_FOUND, "profile not found".into()));
    }
    let mut row = rows[0].clone();

    // If we have a job id, query Creatify for latest status
    let job_id_opt = row
        .get("creatify_job_id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    if let Some(job_id) = job_id_opt {
        if !job_id.is_empty() && !state.creatify_api_key.is_empty() && !state.creatify_api_id.is_empty() {
            let client = reqwest::Client::new();
            // Try v2 status first
            let url_v2 = format!("{}/api/lipsyncs_v2/{}", state.creatify_base_url.trim_end_matches('/'), job_id);
            let mut fetched = None;
            if let Ok(res) = client
                .get(&url_v2)
                .header("X-API-ID", &state.creatify_api_id)
                .header("X-API-KEY", &state.creatify_api_key)
                .send()
                .await
            {
                if res.status().is_success() {
                    if let Ok(j) = res.json::<serde_json::Value>().await { fetched = Some(j); }
                }
            }
            // Fallback to legacy if v2 missing/not found
            if fetched.is_none() {
                let url_v1 = format!("{}/api/lipsyncs/{}", state.creatify_base_url.trim_end_matches('/'), job_id);
                if let Ok(res2) = client
                    .get(&url_v1)
                    .header("X-API-ID", &state.creatify_api_id)
                    .header("X-API-KEY", &state.creatify_api_key)
                    .send()
                    .await
                {
                    if res2.status().is_success() {
                        if let Ok(j2) = res2.json::<serde_json::Value>().await { fetched = Some(j2); }
                    }
                }
            }
            if let Some(j) = fetched {
                if let Some(s) = j.get("status").and_then(|v| v.as_str()) {
                    row["creatify_job_status"] = json!(s);
                }
                // try common output url fields
                let out = j.get("output_url").or_else(|| j.get("video_url")).or_else(|| j.pointer("/result/url"));
                if let Some(u) = out.and_then(|v| v.as_str()) {
                    row["creatify_output_url"] = json!(u);
                }
                // persist any changes
                let mut upd = serde_json::Map::new();
                if let Some(s) = row.get("creatify_job_status").and_then(|v| v.as_str()) { upd.insert("creatify_job_status".into(), json!(s)); }
                if let Some(u) = row.get("creatify_output_url").and_then(|v| v.as_str()) { upd.insert("creatify_output_url".into(), json!(u)); }
                if !upd.is_empty() {
                    let _ = state.pg.from("profiles").update(serde_json::Value::Object(upd).to_string()).eq("creatify_job_id", &job_id).execute().await;
                }
            }
        }
    }

    Ok(Json(row))
}

#[derive(Deserialize)]
pub struct CreatifyWebhookBody {
    pub job_id: String,
    pub status: String,
    #[serde(default)]
    pub output_url: Option<String>,
}

pub async fn creatify_webhook(
    State(state): State<AppState>,
    _: axum::http::HeaderMap,
    Json(body): Json<CreatifyWebhookBody>,
) -> Result<StatusCode, (StatusCode, String)> {
    let update = if let Some(url) = body.output_url {
        json!({ "creatify_job_status": body.status, "creatify_output_url": url })
    } else {
        json!({ "creatify_job_status": body.status })
    };
    state
        .pg
        .from("profiles")
        .update(update.to_string())
        .eq("creatify_job_id", &body.job_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(StatusCode::OK)
}

#[derive(Deserialize)]
pub struct SetAvatarRequest { pub user_id: String, pub avatar_id: String }

// Persist the Creatify avatar id to the user's profile so future jobs can use it by default.
pub async fn set_creatify_avatar_id(
    State(state): State<AppState>,
    Json(req): Json<SetAvatarRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    let update = json!({ "creatify_avatar_id": req.avatar_id });
    state
        .pg
        .from("profiles")
        .update(update.to_string())
        .eq("id", &req.user_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(StatusCode::OK)
}

// Create a Creatify avatar (persona) from user's cameo using personas_v2 (multipart/form-data)
#[derive(Deserialize)]
pub struct CreateAvatarFromVideoRequest {
    pub user_id: String,
    #[serde(default)]
    pub video_scene: Option<String>,
}

#[derive(Serialize)]
pub struct CreateAvatarFromVideoResponse { pub avatar_id: String, pub status: String }

pub async fn create_avatar_from_video(
    State(state): State<AppState>,
    Json(req): Json<CreateAvatarFromVideoRequest>,
) -> Result<Json<CreateAvatarFromVideoResponse>, (StatusCode, String)> {
    if state.creatify_api_key.is_empty() || state.creatify_api_id.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Creatify not configured".into()));
    }
    // Fetch cameo and user info from profile (name, gender, existing avatar)
    let r = state.pg.from("profiles").select("cameo_front_url, full_name, gender, creatify_avatar_id").eq("id", &req.user_id).limit(1).execute().await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let ok = r.status().is_success();
    let txt = r.text().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !ok { return Err((StatusCode::INTERNAL_SERVER_ERROR, txt)); }
    let rows: Vec<serde_json::Value> = serde_json::from_str(&txt).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if rows.is_empty() { return Err((StatusCode::BAD_REQUEST, "Profile not found".into())); }
    let row = &rows[0];
    let cameo_url = row.get("cameo_front_url").and_then(|v| v.as_str()).ok_or((StatusCode::BAD_REQUEST, "Missing cameo_front_url on profile".into()))?;
    let creator_name = row.get("full_name").and_then(|v| v.as_str()).unwrap_or("Creator");
    let gender_val = row.get("gender").and_then(|v| v.as_str()).unwrap_or("m");
    // Map compact gender codes to full strings some APIs expect
    let gender_lower = gender_val.to_lowercase();
    let gender_mapped = match gender_lower.as_str() { "m" => "male", "f" => "female", other => other };

    // Enforce idempotency per user: if an avatar_id already exists for this user, return it
    if let Some(existing_id) = row.get("creatify_avatar_id").and_then(|v| v.as_str()) {
        return Ok(Json(CreateAvatarFromVideoResponse{ avatar_id: existing_id.to_string(), status: "existing".to_string() }));
    }

    // Build a unique creator_name per user to avoid cross-user reuse on Creatify
    let uid_suffix = if req.user_id.len() > 8 { &req.user_id[req.user_id.len()-8..] } else { &req.user_id[..] };
    let expected_name = format!("{} – Likelee {}", creator_name, uid_suffix);

    // Build JSON payload per Creatify docs (https://docs.creatify.ai/api-reference/personas/post-apipersonas-v2)
    let client = reqwest::Client::new();
    let mut payload = serde_json::Map::new();
    payload.insert("gender".into(), json!(gender_mapped));
    payload.insert("creator_name".into(), json!(expected_name));
    payload.insert("lipsync_input".into(), json!(cameo_url));
    if let Some(scene) = req.video_scene.clone() { payload.insert("video_scene".into(), json!(scene)); }
    // Helpful defaults
    payload.insert("labels".into(), json!(["likelee", "byoa", req.user_id]));
    payload.insert("keywords".into(), json!(expected_name));
    if !state.creatify_callback_url.is_empty() { payload.insert("webhook_url".into(), json!(state.creatify_callback_url.clone())); }

    let url = format!("{}/api/personas_v2", state.creatify_base_url.trim_end_matches('/'));
    let payload_dbg = serde_json::Value::Object(payload.clone());
    info!(target: "creatify", "POST /api/personas_v2 payload={}", payload_dbg);
    let res = client.post(url)
        .header("Content-Type", "application/json")
        .header("X-API-ID", &state.creatify_api_id)
        .header("X-API-KEY", &state.creatify_api_key)
        .json(&payload)
        .send().await.map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    let ok2 = res.status().is_success();
    let body2 = res.text().await.map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    if !ok2 {
        return Err((StatusCode::BAD_GATEWAY, body2));
    }
    let val_res: Result<serde_json::Value, _> = serde_json::from_str(&body2);
    let (mut avatar_id_opt, mut status_opt) = (None::<String>, None::<String>);
    if let Ok(val) = val_res {
        if let Some(arr) = val.as_array() {
            if let Some(first) = arr.get(0) {
                avatar_id_opt = first.get("id").and_then(|v| v.as_str()).map(|s| s.to_string());
                status_opt = first.get("status").and_then(|v| v.as_str()).map(|s| s.to_string());
            }
        } else {
            avatar_id_opt = val.get("id").and_then(|v| v.as_str()).map(|s| s.to_string());
            status_opt = val.get("status").and_then(|v| v.as_str()).map(|s| s.to_string());
        }
    }

    // Fallback: if v2 returned empty list or no id, try legacy personas endpoint variants
    let (avatar_id, status) = if let Some(id) = avatar_id_opt {
        (id, status_opt.unwrap_or_else(|| "pending".to_string()))
    } else {
        // Legacy attempt 1: JSON payload to /api/personas (older endpoint)
        let url_v1 = format!("{}/api/personas", state.creatify_base_url.trim_end_matches('/'));
        let payload_v1_dbg = serde_json::Value::Object(payload.clone());
        info!(target: "creatify", "POST /api/personas (legacy) payload={}", payload_v1_dbg);
        let res_v1 = client.post(url_v1.clone())
            .header("Content-Type", "application/json")
            .header("X-API-ID", &state.creatify_api_id)
            .header("X-API-KEY", &state.creatify_api_key)
            .json(&payload)
            .send().await.map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
        let ok_v1 = res_v1.status().is_success();
        let body_v1 = res_v1.text().await.map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
        let mut id_v1: Option<String> = None;
        let mut st_v1: Option<String> = None;
        if ok_v1 {
            if let Ok(val1) = serde_json::from_str::<serde_json::Value>(&body_v1) {
                if let Some(arr) = val1.as_array() {
                    if let Some(first) = arr.get(0) {
                        id_v1 = first.get("id").and_then(|v| v.as_str()).map(|s| s.to_string());
                        st_v1 = first.get("status").and_then(|v| v.as_str()).map(|s| s.to_string());
                    }
                } else {
                    id_v1 = val1.get("id").and_then(|v| v.as_str()).map(|s| s.to_string());
                    st_v1 = val1.get("status").and_then(|v| v.as_str()).map(|s| s.to_string());
                }
            }
        }
        if let Some(id) = id_v1 {
            (id, st_v1.unwrap_or_else(|| "pending".to_string()))
        } else {
            // Legacy attempt 2: send JSON with alternate field name "video" as URL alongside lipsync_input
            let mut payload_v1b = serde_json::Value::Object(payload.clone());
            if let Some(obj) = payload_v1b.as_object_mut() { obj.insert("video".into(), json!(cameo_url)); }
            let payload_v1b_dbg = payload_v1b.clone();
            info!(target: "creatify", "POST /api/personas (legacy alt) payload={}", payload_v1b_dbg);
            let res_v1b = client.post(url_v1)
                .header("Content-Type", "application/json")
                .header("X-API-ID", &state.creatify_api_id)
                .header("X-API-KEY", &state.creatify_api_key)
                .json(&payload_v1b)
                .send().await.map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
            let ok_v1b = res_v1b.status().is_success();
            let body_v1b = res_v1b.text().await.map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
            if ok_v1b {
                if let Ok(val1b) = serde_json::from_str::<serde_json::Value>(&body_v1b) {
                    let id_b = val1b.get("id").and_then(|v| v.as_str()).map(|s| s.to_string())
                        .or_else(|| val1b.pointer("/data/id").and_then(|v| v.as_str()).map(|s| s.to_string()));
                    if let Some(final_id) = id_b {
                        let st_b = val1b.get("status").and_then(|v| v.as_str()).unwrap_or("pending").to_string();
                        (final_id, st_b)
                    } else {
                        return Err((StatusCode::BAD_GATEWAY, format!("Creatify personas_v2 and personas returned no id. v2_body={} v1_body={} v1b_body={}", body2, body_v1, body_v1b)));
                    }
                } else {
                    return Err((StatusCode::BAD_GATEWAY, format!("Creatify personas_v2 and personas invalid json. v2_body={} v1b_body={}", body2, body_v1b)));
                }
            } else {
                return Err((StatusCode::BAD_GATEWAY, format!("invalid creatify response: {}", body2)));
            }
        }
    };

    // Verify the returned persona actually corresponds to this user (unique per user)
    let verify_url = format!("{}/api/personas_v2/{}", state.creatify_base_url.trim_end_matches('/'), avatar_id);
    if let Ok(resv) = client
        .get(&verify_url)
        .header("X-API-ID", &state.creatify_api_id)
        .header("X-API-KEY", &state.creatify_api_key)
        .send().await {
        if resv.status().is_success() {
            if let Ok(jv) = resv.json::<serde_json::Value>().await {
                let api_name = jv.get("creator_name").and_then(|v| v.as_str()).unwrap_or("");
                let typ = jv.get("type").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
                let is_custom = typ == "custom";
                let labels_match = jv.get("labels").and_then(|v| v.as_array()).map(|arr| arr.iter().any(|x| x.as_str() == Some(&req.user_id))).unwrap_or(false);
                let name_match = api_name == expected_name;
                if !(is_custom && (labels_match || name_match)) {
                    return Err((StatusCode::CONFLICT, format!(
                        "Creatify returned a persona that does not match this user. Expected name='{}' or labels to contain user_id. Response: {}",
                        expected_name, jv
                    )));
                }
            }
        }
    }

    // Persist avatar id to profile
    let upd = json!({"creatify_avatar_id": avatar_id});
    state.pg.from("profiles").update(upd.to_string()).eq("id", &req.user_id).execute().await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(CreateAvatarFromVideoResponse{ avatar_id, status }))
}

#[derive(Deserialize)]
pub struct AvatarStatusQuery { pub user_id: String }

pub async fn get_avatar_status(
    State(state): State<AppState>,
    axum::extract::Query(q): axum::extract::Query<AvatarStatusQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // get avatar id from profile
    let r = state.pg.from("profiles").select("creatify_avatar_id").eq("id", &q.user_id).limit(1).execute().await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let ok = r.status().is_success();
    let txt = r.text().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !ok { return Err((StatusCode::INTERNAL_SERVER_ERROR, txt)); }
    let rows: Vec<serde_json::Value> = serde_json::from_str(&txt).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if rows.is_empty() { return Err((StatusCode::NOT_FOUND, "profile not found".into())); }
    let avatar_id = rows[0].get("creatify_avatar_id").and_then(|v| v.as_str()).ok_or((StatusCode::BAD_REQUEST, "creatify_avatar_id missing".into()))?;

    let base = state.creatify_base_url.trim_end_matches('/');
    let client = reqwest::Client::new();
    // Try v2 (no trailing slash)
    let url_v2 = format!("{}/api/personas_v2/{}", base, avatar_id);
    let mut final_json: Option<serde_json::Value> = None;
    let mut err_bodies: Vec<String> = vec![];

    if let Ok(res) = client.get(&url_v2)
        .header("X-API-ID", &state.creatify_api_id)
        .header("X-API-KEY", &state.creatify_api_key)
        .send().await {
        if res.status().is_success() {
            if let Ok(j) = res.json::<serde_json::Value>().await { final_json = Some(j); }
        } else {
            let status = res.status();
            let b = res.text().await.unwrap_or_default();
            err_bodies.push(format!("v2:{}:{}", status.as_u16(), b));
        }
    }

    // Try v2 with trailing slash if not found yet
    if final_json.is_none() {
        let url_v2_slash = format!("{}/api/personas_v2/{}/", base, avatar_id);
        if let Ok(res2) = client.get(&url_v2_slash)
            .header("X-API-ID", &state.creatify_api_id)
            .header("X-API-KEY", &state.creatify_api_key)
            .send().await {
            if res2.status().is_success() {
                if let Ok(j2) = res2.json::<serde_json::Value>().await { final_json = Some(j2); }
            } else {
                let status2 = res2.status();
                let b2 = res2.text().await.unwrap_or_default();
                err_bodies.push(format!("v2/:{}:{}", status2.as_u16(), b2));
            }
        }
    }

    // Fallback to legacy personas
    if final_json.is_none() {
        let url_v1 = format!("{}/api/personas/{}", base, avatar_id);
        if let Ok(res3) = client.get(&url_v1)
            .header("X-API-ID", &state.creatify_api_id)
            .header("X-API-KEY", &state.creatify_api_key)
            .send().await {
            if res3.status().is_success() {
                if let Ok(j3) = res3.json::<serde_json::Value>().await { final_json = Some(j3); }
            } else {
                let status3 = res3.status();
                let b3 = res3.text().await.unwrap_or_default();
                err_bodies.push(format!("v1:{}:{}", status3.as_u16(), b3));
            }
        }
    }

    if let Some(j) = final_json { return Ok(Json(j)); }

    // If Creatify says no creator/persona matches, surface a clearer message instead of 502
    let combined = err_bodies.join(" | ");
    let helpful = if combined.to_lowercase().contains("no creator matches") || combined.contains("404") {
        "Unknown or not-yet-approved avatar_id on Creatify. Please ensure avatar creation succeeded and use the returned id."
    } else {
        "Failed to fetch avatar status from Creatify."
    };
    Err((StatusCode::BAD_REQUEST, format!("{} details: {}", helpful, combined)))
}

#[derive(Deserialize)]
pub struct AvatarIdQuery { pub avatar_id: String }

pub async fn get_avatar_status_by_id(
    State(state): State<AppState>,
    axum::extract::Query(q): axum::extract::Query<AvatarIdQuery>,
)
-> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let avatar_id = q.avatar_id;
    if avatar_id.is_empty() { return Err((StatusCode::BAD_REQUEST, "avatar_id missing".into())); }
    let base = state.creatify_base_url.trim_end_matches('/');
    let client = reqwest::Client::new();
    let url_v2 = format!("{}/api/personas_v2/{}", base, avatar_id);
    let mut final_json: Option<serde_json::Value> = None;
    let mut err_bodies: Vec<String> = vec![];
    if let Ok(res) = client.get(&url_v2)
        .header("X-API-ID", &state.creatify_api_id)
        .header("X-API-KEY", &state.creatify_api_key)
        .send().await {
        if res.status().is_success() {
            if let Ok(j) = res.json::<serde_json::Value>().await { final_json = Some(j); }
        } else {
            let status = res.status();
            let b = res.text().await.unwrap_or_default();
            err_bodies.push(format!("v2:{}:{}", status.as_u16(), b));
        }
    }
    if final_json.is_none() {
        let url_v2_slash = format!("{}/api/personas_v2/{}/", base, avatar_id);
        if let Ok(res2) = client.get(&url_v2_slash)
            .header("X-API-ID", &state.creatify_api_id)
            .header("X-API-KEY", &state.creatify_api_key)
            .send().await {
            if res2.status().is_success() {
                if let Ok(j2) = res2.json::<serde_json::Value>().await { final_json = Some(j2); }
            } else {
                let status2 = res2.status();
                let b2 = res2.text().await.unwrap_or_default();
                err_bodies.push(format!("v2/:{}:{}", status2.as_u16(), b2));
            }
        }
    }
    if final_json.is_none() {
        let url_v1 = format!("{}/api/personas/{}", base, avatar_id);
        if let Ok(res3) = client.get(&url_v1)
            .header("X-API-ID", &state.creatify_api_id)
            .header("X-API-KEY", &state.creatify_api_key)
            .send().await {
            if res3.status().is_success() {
                if let Ok(j3) = res3.json::<serde_json::Value>().await { final_json = Some(j3); }
            } else {
                let status3 = res3.status();
                let b3 = res3.text().await.unwrap_or_default();
                err_bodies.push(format!("v1:{}:{}", status3.as_u16(), b3));
            }
        }
    }
    if let Some(j) = final_json { return Ok(Json(j)); }
    let combined = err_bodies.join(" | ");
    Err((StatusCode::BAD_REQUEST, format!("Failed to fetch avatar by id. details: {}", combined)))
}

// Synthesize TTS via ElevenLabs using the user's ready voice model and upload to Supabase public bucket.
async fn synthesize_tts_and_upload(state: &AppState, user_id: &str, text: String) -> Result<Option<String>, String> {
    if state.elevenlabs_api_key.is_empty() { return Ok(None); }
    // 1) Find user's ElevenLabs voice model
    let resp = state.pg
        .from("voice_models")
        .select("provider, provider_voice_id, status")
        .eq("user_id", user_id)
        .eq("provider", "elevenlabs")
        .eq("status", "ready")
        .limit(1)
        .execute().await.map_err(|e| e.to_string())?;
    let ok = resp.status().is_success();
    let body = resp.text().await.map_err(|e| e.to_string())?;
    if !ok { return Err(body); }
    let rows: Vec<serde_json::Value> = serde_json::from_str(&body).map_err(|e| e.to_string())?;
    let row = if let Some(r) = rows.first() { r } else { return Ok(None); };
    let voice_id = row.get("provider_voice_id").and_then(|v| v.as_str()).ok_or("missing provider_voice_id")?;

    // 2) Call ElevenLabs TTS
    let tts_url = format!("https://api.elevenlabs.io/v1/text-to-speech/{}", voice_id);
    let client = reqwest::Client::new();
    let tts_res = client.post(tts_url)
        .header("xi-api-key", &state.elevenlabs_api_key)
        .header("accept", "audio/mpeg")
        .header("content-type", "application/json")
        .body(serde_json::json!({
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}
        }).to_string())
        .send().await.map_err(|e| e.to_string())?;
    if !tts_res.status().is_success() {
        return Err(tts_res.text().await.unwrap_or_default());
    }
    let audio_bytes = tts_res.bytes().await.map_err(|e| e.to_string())?;

    // 3) Upload to Supabase storage public bucket
    let owner = user_id.replace(|c: char| !c.is_ascii_alphanumeric() && c != '_' && c != '-', "_");
    let path = format!("audio/{}/{}.mp3", owner, Uuid::new_v4());
    let upload_url = format!(
        "{}/storage/v1/object/{}/{}",
        state.supabase_url.trim_end_matches('/'),
        state.supabase_bucket_public,
        urlencoding::encode(&path)
    );
    let up_res = client.post(upload_url)
        .header("apikey", &state.supabase_service_key)
        .header("Authorization", format!("Bearer {}", &state.supabase_service_key))
        .header("content-type", "audio/mpeg")
        .body(audio_bytes)
        .send().await.map_err(|e| e.to_string())?;
    if !up_res.status().is_success() {
        return Err(up_res.text().await.unwrap_or_default());
    }
    let public_url = format!(
        "{}/storage/v1/object/public/{}/{}",
        state.supabase_url.trim_end_matches('/'),
        state.supabase_bucket_public,
        path
    );
    Ok(Some(public_url))
}
