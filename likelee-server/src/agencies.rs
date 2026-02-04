use crate::{auth::AuthUser, config::AppState};
use axum::extract::Multipart;
use axum::extract::Query;
use axum::{extract::Path, extract::State, http::StatusCode, Json};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tracing::info;

#[derive(Deserialize, Serialize, Debug)]
pub struct AgencyProfilePayload {
    pub agency_name: Option<String>,
    pub legal_entity_name: Option<String>,
    pub contact_name: Option<String>,
    pub contact_title: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub phone_number: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_postal_code: Option<String>,
    pub country: Option<String>,
    pub time_zone: Option<String>,
    pub tax_id_ein: Option<String>,
    pub agency_type: Option<String>,
    pub client_count: Option<String>,
    pub campaign_budget: Option<String>,
    pub services_offered: Option<serde_json::Value>,
    pub provide_creators: Option<String>,
    pub handle_contracts: Option<String>,
    pub talent_count: Option<String>,
    pub licenses_likeness: Option<String>,
    pub open_to_ai: Option<serde_json::Value>,
    pub campaign_types: Option<serde_json::Value>,
    pub bulk_onboard: Option<String>,
    pub logo_url: Option<String>,
    pub email_signature: Option<String>,
    pub primary_color: Option<String>,
    pub secondary_color: Option<String>,
    pub status: Option<String>,
    pub onboarding_step: Option<String>,
}

#[derive(Deserialize, Serialize, Debug)]
pub struct AgencyRegisterPayload {
    pub email: String,
    pub password: String,
    pub agency_name: String,
    pub agency_type: String,
    pub contact_name: Option<String>,
    pub contact_title: Option<String>,
    pub website: Option<String>,
    pub phone_number: Option<String>,
}

pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<AgencyRegisterPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let client = Client::new();

    // 1. Create Supabase user with role metadata
    let create_user_url = format!("{}/auth/v1/admin/users", state.supabase_url);
    let body = json!({
        "email": payload.email,
        "password": payload.password,
        "email_confirm": false,
        "user_metadata": {
            "role": "agency"
        }
    });

    let resp = client
        .post(&create_user_url)
        .header("apikey", state.supabase_service_key.clone())
        .header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        )
        .json(&body)
        .send()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let txt = resp
            .text()
            .await
            .unwrap_or_else(|_| "failed to create user".to_string());
        return Err((StatusCode::BAD_REQUEST, txt));
    }

    let created: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let user_id = created
        .get("id")
        .and_then(|v| v.as_str())
        .ok_or((StatusCode::INTERNAL_SERVER_ERROR, "missing id".to_string()))?
        .to_string();

    // 2. Generate confirmation link
    let gen_link_url = format!("{}/auth/v1/admin/generate_link", state.supabase_url);
    let link_body = json!({
        "type": "signup",
        "email": payload.email,
        "password": payload.password
    });

    let link_resp = client
        .post(&gen_link_url)
        .header("apikey", state.supabase_service_key.clone())
        .header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        )
        .json(&link_body)
        .send()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let action_link = if link_resp.status().is_success() {
        let link_json: serde_json::Value = link_resp.json().await.unwrap_or(json!({}));
        link_json
            .get("action_link")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string()
    } else {
        "".to_string()
    };

    // 3. Create agency profile
    let agency_profile = json!({
        "id": user_id,
        "agency_name": payload.agency_name,
        "agency_type": payload.agency_type,
        "contact_name": payload.contact_name,
        "contact_title": payload.contact_title,
        "email": payload.email,
        "website": payload.website,
        "phone_number": payload.phone_number,
        "status": "waitlist",
        "onboarding_step": "email_verification"
    });

    let resp = state
        .pg
        .from("agencies")
        .insert(agency_profile.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let txt = resp
            .text()
            .await
            .unwrap_or_else(|_| "failed to create agency profile".to_string());
        return Err((StatusCode::BAD_REQUEST, txt));
    }

    Ok(Json(json!({
        "user_id": user_id,
        "next_action": {
            "type": "verify_email",
            "action_link": action_link
        }
    })))
}

pub async fn update(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<AgencyProfilePayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let mut v =
        serde_json::to_value(&payload).map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    if let serde_json::Value::Object(ref mut map) = v {
        map.remove("id");
        map.insert("onboarding_step".into(), json!("complete"));

        // Remove nulls
        let null_keys: Vec<String> = map
            .iter()
            .filter_map(|(k, v)| if v.is_null() { Some(k.clone()) } else { None })
            .collect();
        for k in null_keys {
            map.remove(&k);
        }
    }

    let resp = state
        .pg
        .from("agencies")
        .auth(state.supabase_service_key.clone())
        .eq("id", &user.id)
        .update(v.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(v))
}

pub async fn get_profile(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("agencies")
        .select("*")
        .eq("id", &user.id)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    let txt = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        let code =
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err((code, txt));
    }
    let v: serde_json::Value = serde_json::from_str(&txt)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}

#[derive(Deserialize, Serialize, Debug)]
pub struct AgencyFileUploadResponse {
    pub id: String,
    pub file_name: String,
    pub public_url: Option<String>,
    pub storage_bucket: String,
    pub storage_path: String,
    pub client_id: Option<String>,
}

#[derive(Serialize)]
pub struct StorageUsageOut {
    pub used_bytes: i64,
    pub limit_bytes: i64,
}

#[derive(Deserialize)]
pub struct CreateAgencyFolderIn {
    pub name: String,
    pub parent_id: Option<String>,
}

#[derive(Deserialize)]
pub struct ListAgencyFilesQuery {
    pub folder_id: Option<String>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

#[derive(Deserialize)]
pub struct ListAgencyFoldersQuery {
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

async fn ensure_storage_settings_row(
    state: &AppState,
    agency_id: &str,
) -> Result<i64, (StatusCode, String)> {
    let resp = state
        .pg
        .from("agency_storage_settings")
        .select("storage_limit_bytes")
        .eq("agency_id", agency_id)
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
        return Err((code, text));
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

    // Insert default row (10GB default at DB level)
    let insert = serde_json::json!({
        "agency_id": agency_id,
    });
    let ins = state
        .pg
        .from("agency_storage_settings")
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
        return Err((code, text));
    }

    // Fetch again to return limit
    let resp2 = state
        .pg
        .from("agency_storage_settings")
        .select("storage_limit_bytes")
        .eq("agency_id", agency_id)
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
        .unwrap_or(10_737_418_240);
    Ok(limit)
}

async fn get_agency_used_storage_bytes(
    state: &AppState,
    agency_id: &str,
) -> Result<i64, (StatusCode, String)> {
    // Avoid PostgREST aggregates (may be disabled depending on Supabase config).
    // Sum in Rust instead.
    let resp = state
        .pg
        .from("agency_files")
        .select("size_bytes")
        .eq("agency_id", agency_id)
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
        return Err((code, text));
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

pub async fn get_agency_storage_usage(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<StorageUsageOut>, (StatusCode, String)> {
    let limit = ensure_storage_settings_row(&state, &user.id).await?;
    let used = get_agency_used_storage_bytes(&state, &user.id).await?;
    Ok(Json(StorageUsageOut {
        used_bytes: used,
        limit_bytes: limit,
    }))
}

pub async fn list_agency_folders(
    State(state): State<AppState>,
    user: AuthUser,
    Query(q): Query<ListAgencyFoldersQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let mut req = state
        .pg
        .from("agency_folders")
        .select("id,agency_id,parent_id,name,created_at")
        .eq("agency_id", &user.id)
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
        return Err((code, text));
    }
    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}

pub async fn create_agency_folder(
    State(state): State<AppState>,
    user: AuthUser,
    Json(input): Json<CreateAgencyFolderIn>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let body = serde_json::json!({
        "agency_id": user.id,
        "parent_id": input.parent_id,
        "name": input.name,
    });
    let resp = state
        .pg
        .from("agency_folders")
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
        return Err((code, text));
    }
    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}

pub async fn list_agency_files(
    State(state): State<AppState>,
    user: AuthUser,
    Query(q): Query<ListAgencyFilesQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let mut req = state
        .pg
        .from("agency_files")
        .select("id,file_name,storage_bucket,storage_path,public_url,folder_id,size_bytes,mime_type,created_at")
        .eq("agency_id", &user.id)
        .order("created_at.desc");
    if let Some(folder_id) = q.folder_id.as_ref().filter(|s| !s.is_empty()) {
        req = req.eq("folder_id", folder_id);
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
        return Err((code, text));
    }
    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}

pub async fn get_agency_storage_file_signed_url(
    State(state): State<AppState>,
    user: AuthUser,
    Path(file_id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("agency_files")
        .select("storage_bucket,storage_path,agency_id")
        .eq("id", &file_id)
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

    let agency_id = row.get("agency_id").and_then(|v| v.as_str()).ok_or((
        StatusCode::INTERNAL_SERVER_ERROR,
        "missing agency_id".into(),
    ))?;
    if agency_id != user.id {
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

    let url = format!(
        "{}/storage/v1/object/sign/{}/{}",
        state.supabase_url, bucket, path
    );
    let body = serde_json::json!({ "expiresIn": 3600 });
    let http = reqwest::Client::new();
    let sign_resp = http
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

    if !sign_resp.status().is_success() {
        let msg = sign_resp.text().await.unwrap_or_default();
        return Err((StatusCode::BAD_GATEWAY, format!("sign url failed: {msg}")));
    }

    let signed_json: serde_json::Value = sign_resp
        .json()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    let signed_path = signed_json
        .get("signedURL")
        .and_then(|v| v.as_str())
        .ok_or((StatusCode::BAD_GATEWAY, "invalid sign response".into()))?;
    let full_url = format!("{}/storage/v1{}", state.supabase_url, signed_path);
    Ok(Json(serde_json::json!({ "url": full_url })))
}

pub async fn upload_agency_storage_file(
    State(state): State<AppState>,
    user: AuthUser,
    mut multipart: Multipart,
) -> Result<Json<AgencyFileUploadResponse>, (StatusCode, String)> {
    let mut file_name = None;
    let mut mime_type = None;
    let mut folder_id: Option<String> = None;
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

    // Quota enforcement
    let limit = ensure_storage_settings_row(&state, &user.id).await?;
    let used = get_agency_used_storage_bytes(&state, &user.id).await?;
    let new_size = bytes.len() as i64;
    if used + new_size > limit {
        return Err((
            StatusCode::PAYLOAD_TOO_LARGE,
            "storage_quota_exceeded".into(),
        ));
    }

    let fname = file_name.unwrap_or_else(|| "upload.bin".to_string());
    let sanitized = fname
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '.' || c == '_' || c == '-' {
                c
            } else {
                '_'
            }
        })
        .collect::<String>();

    let bucket = state.supabase_bucket_private.clone();
    let folder_segment = folder_id.clone().unwrap_or_else(|| "root".to_string());
    let path = format!(
        "agencies/{}/storage/{}/{}_{}",
        user.id,
        folder_segment,
        chrono::Utc::now().timestamp_millis(),
        sanitized
    );

    let storage_url = format!(
        "{}/storage/v1/object/{}/{}",
        state.supabase_url, bucket, path
    );
    let http = reqwest::Client::new();
    let mut req = http
        .post(&storage_url)
        .header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        )
        .header("apikey", state.supabase_service_key.clone());
    if let Some(ct) = mime_type.as_ref().filter(|s| !s.is_empty()) {
        req = req.header("content-type", ct.clone());
    }
    let up = req
        .body(bytes)
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

    let public_url = None;
    let insert = serde_json::json!({
        "agency_id": user.id,
        "file_name": fname,
        "storage_bucket": bucket,
        "storage_path": path,
        "public_url": public_url,
        "folder_id": folder_id,
        "size_bytes": new_size,
        "mime_type": mime_type,
    });
    let resp = state
        .pg
        .from("agency_files")
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

    Ok(Json(AgencyFileUploadResponse {
        id,
        file_name: fname,
        public_url,
        storage_bucket: state.supabase_bucket_private.clone(),
        storage_path: insert
            .get("storage_path")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
        client_id: None,
    }))
}

pub async fn delete_agency_storage_file(
    State(state): State<AppState>,
    user: AuthUser,
    Path(file_id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // 1) Fetch file and verify ownership
    let resp = state
        .pg
        .from("agency_files")
        .select("storage_bucket,storage_path,agency_id")
        .eq("id", &file_id)
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

    let agency_id = row.get("agency_id").and_then(|v| v.as_str()).ok_or((
        StatusCode::INTERNAL_SERVER_ERROR,
        "missing agency_id".into(),
    ))?;
    if agency_id != user.id {
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

    // 2) Delete object from Supabase Storage
    let storage_url = format!(
        "{}/storage/v1/object/{}/{}",
        state.supabase_url, bucket, path
    );
    let http = reqwest::Client::new();
    let del = http
        .delete(&storage_url)
        .header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        )
        .header("apikey", state.supabase_service_key.clone())
        .send()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    if !del.status().is_success() {
        let msg = del.text().await.unwrap_or_default();
        return Err((
            StatusCode::BAD_GATEWAY,
            format!("storage delete failed: {msg}"),
        ));
    }

    // 3) Delete metadata row
    let resp = state
        .pg
        .from("agency_files")
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
        return Err((code, text));
    }

    Ok(Json(serde_json::json!({ "ok": true })))
}

// Upload an agency file (contracts, call sheets, references) to Supabase Storage and record it.
pub async fn upload_agency_file(
    State(state): State<AppState>,
    user: AuthUser,
    mut multipart: Multipart,
) -> Result<Json<AgencyFileUploadResponse>, (StatusCode, String)> {
    // Expect a single part named "file"
    let mut file_name = None;
    let mut bytes: Vec<u8> = vec![];
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?
    {
        let name = field.name().map(|s| s.to_string());
        if name.as_deref() == Some("file") {
            file_name = field.file_name().map(|s| s.to_string());
            let data = field
                .bytes()
                .await
                .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
            bytes = data.to_vec();
            break;
        }
    }
    if bytes.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "missing file".into()));
    }
    let fname = file_name.unwrap_or_else(|| "upload.bin".to_string());
    let sanitized = fname
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '.' || c == '_' || c == '-' {
                c
            } else {
                '_'
            }
        })
        .collect::<String>();

    // Storage target
    let bucket = state.supabase_bucket_private.clone();
    let path = format!(
        "agencies/{}/files/{}_{}",
        user.id,
        chrono::Utc::now().timestamp_millis(),
        sanitized
    );

    // Upload to Supabase Storage using service key
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
        .body(bytes)
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

    // For private bucket, no public URL; keep None
    let public_url = None;

    // Insert row into agency_files
    let insert = serde_json::json!({
        "agency_id": user.id,
        "file_name": fname,
        "storage_bucket": bucket,
        "storage_path": path,
        "public_url": public_url,
    });
    let resp = state
        .pg
        .from("agency_files")
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

    Ok(Json(AgencyFileUploadResponse {
        id,
        file_name: fname,
        public_url,
        storage_bucket: bucket,
        storage_path: path,
        client_id: None,
    }))
}

pub async fn list_client_files(
    State(state): State<AppState>,
    user: AuthUser,
    Path(client_id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("agency_files")
        .select("id,file_name,storage_bucket,storage_path,public_url,created_at")
        .eq("agency_id", &user.id)
        .eq("client_id", &client_id)
        .order("created_at.desc")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let files: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(files))
}

pub async fn get_client_file_signed_url(
    State(state): State<AppState>,
    user: AuthUser,
    Path((_client_id, file_id)): Path<(String, String)>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // 1. Fetch file and verify ownership
    let resp = state
        .pg
        .from("agency_files")
        .select("storage_bucket,storage_path,agency_id,client_id")
        .eq("id", &file_id)
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

    let agency_id = row.get("agency_id").and_then(|v| v.as_str()).ok_or((
        StatusCode::INTERNAL_SERVER_ERROR,
        "missing agency_id".into(),
    ))?;

    if agency_id != user.id {
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

    // 2. Request signed URL from Supabase Storage
    let url = format!(
        "{}/storage/v1/object/sign/{}/{}",
        state.supabase_url, bucket, path
    );
    let body = serde_json::json!({ "expiresIn": 3600 }); // 1 hour
    let http = reqwest::Client::new();
    let sign_resp = http
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

    if !sign_resp.status().is_success() {
        let msg = sign_resp.text().await.unwrap_or_default();
        return Err((StatusCode::BAD_GATEWAY, format!("sign url failed: {msg}")));
    }

    let signed_json: serde_json::Value = sign_resp
        .json()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    let signed_path = signed_json
        .get("signedURL")
        .and_then(|v| v.as_str())
        .ok_or((StatusCode::BAD_GATEWAY, "invalid sign response".into()))?;

    let full_url = format!("{}/storage/v1{}", state.supabase_url, signed_path);

    Ok(Json(serde_json::json!({ "url": full_url })))
}

pub async fn upload_client_file(
    State(state): State<AppState>,
    user: AuthUser,
    Path(client_id): Path<String>,
    mut multipart: Multipart,
) -> Result<Json<AgencyFileUploadResponse>, (StatusCode, String)> {
    // Expect a single part named "file"
    let mut file_name = None;
    let mut bytes: Vec<u8> = vec![];
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?
    {
        let name = field.name().map(|s| s.to_string());
        if name.as_deref() == Some("file") {
            file_name = field.file_name().map(|s| s.to_string());
            let data = field
                .bytes()
                .await
                .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
            bytes = data.to_vec();
            break;
        }
    }
    if bytes.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "missing file".into()));
    }
    let fname = file_name.unwrap_or_else(|| "upload.bin".to_string());
    let sanitized = fname
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '.' || c == '_' || c == '-' {
                c
            } else {
                '_'
            }
        })
        .collect::<String>();

    // Storage target
    let bucket = state.supabase_bucket_private.clone();
    let path = format!(
        "agencies/{}/clients/{}/files/{}_{}",
        user.id,
        client_id,
        chrono::Utc::now().timestamp_millis(),
        sanitized
    );

    // Upload to Supabase Storage using service key
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
        .body(bytes)
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

    let public_url = None;

    // Insert row into agency_files
    let insert = serde_json::json!({
        "agency_id": user.id,
        "client_id": client_id,
        "file_name": fname,
        "storage_bucket": bucket,
        "storage_path": path,
        "public_url": public_url,
    });
    let resp = state
        .pg
        .from("agency_files")
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

    Ok(Json(AgencyFileUploadResponse {
        id,
        file_name: fname,
        public_url,
        storage_bucket: bucket,
        storage_path: path,
        client_id: Some(client_id),
    }))
}

#[derive(Deserialize, Serialize, Debug)]
pub struct TalentItem {
    pub id: String,
    pub full_name: Option<String>,
    pub profile_photo_url: Option<String>,
}

// List talents associated to the agency's organization via agency_users
#[derive(Deserialize)]
pub struct TalentQuery {
    pub q: Option<String>,
}

pub async fn list_talents(
    State(state): State<AppState>,
    user: AuthUser,
    Query(params): Query<TalentQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // Agency id is the authenticated agency user's id
    let org_id = user.id.clone();
    info!(agency_user_id = %org_id, "list_talents request");

    // Query agency_users within this agency; select columns per schema
    let mut req = state
        .pg
        .from("agency_users")
        .select("id,agency_id,creator_id,full_legal_name,stage_name,profile_photo_url,status,role")
        .eq("agency_id", &org_id)
        .eq("role", "talent")
        .eq("status", "active");
    if let Some(q) = params.q.as_ref().filter(|s| !s.is_empty()) {
        let enc = format!("%25{}%25", q);
        // Filter by stage_name OR full_legal_name
        let or_expr = format!("stage_name.ilike.{},full_legal_name.ilike.{}", enc, enc);
        req = req.or(or_expr.as_str());
    }
    let resp = req
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let rows: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let count = rows.as_array().map(|a| a.len()).unwrap_or(0);
    info!(agency_user_id = %org_id, count, "list_talents result");

    // Map to array with fallback to names per schema
    let talents: Vec<TalentItem> = rows
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .map(|r| {
            let id = r
                .get("creator_id")
                .and_then(|v| v.as_str())
                .unwrap_or_else(|| r.get("id").and_then(|v| v.as_str()).unwrap_or(""))
                .to_string();
            let full_name = r
                .get("stage_name")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .or_else(|| {
                    r.get("full_legal_name")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string())
                });
            let photo = r
                .get("profile_photo_url")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            TalentItem {
                id,
                full_name,
                profile_photo_url: photo,
            }
        })
        .collect();

    Ok(Json(json!(talents)))
}

#[derive(Deserialize, Serialize, Debug)]
pub struct AgencyClientPayload {
    pub company: String,
    pub contact_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub terms: Option<String>,
    pub industry: Option<String>,
    pub status: Option<String>,
    pub website: Option<String>,
    pub tags: Option<Vec<String>>,
    pub notes: Option<String>,
    pub next_follow_up_date: Option<String>,
    pub preferences: Option<serde_json::Value>,
}

#[derive(Deserialize, Serialize, Debug)]
pub struct AgencyClientContactPayload {
    pub name: String,
    pub role: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub is_primary: Option<bool>,
}

#[derive(Deserialize, Serialize, Debug)]
pub struct AgencyClientCommunicationPayload {
    pub contact_id: Option<String>,
    pub communication_type: String, // 'type' is a reserved keyword in Rust
    pub subject: String,
    pub content: Option<String>,
    pub occurred_at: Option<String>,
}

pub async fn list_clients(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // 1. Fetch clients
    let resp = state
        .pg
        .from("agency_clients")
        .select(
            "id,agency_id,company,contact_name,email,phone,terms,industry,status,website,tags,notes,next_follow_up_date,preferences,created_at,updated_at",
        )
        .eq("agency_id", &user.id)
        .order("created_at.desc")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let mut clients: Vec<serde_json::Value> = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 2. Fetch all bookings for this agency to aggregate metrics
    let bookings_resp = state
        .pg
        .from("bookings")
        .select("client_id,rate_cents,date")
        .eq("agency_user_id", &user.id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let bookings_text = bookings_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let bookings: Vec<serde_json::Value> = serde_json::from_str(&bookings_text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 2.1 Fetch contacts to count them
    let contacts_resp = state
        .pg
        .from("client_contacts")
        .select("client_id")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let contacts_text = contacts_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let contacts: Vec<serde_json::Value> = serde_json::from_str(&contacts_text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 3. Aggregate metrics by client_id
    use std::collections::HashMap;
    let mut metrics_map: HashMap<String, (i32, i32, Option<String>)> = HashMap::new();
    let mut contacts_count_map: HashMap<String, i32> = HashMap::new();

    for b in bookings {
        if let Some(cid) = b.get("client_id").and_then(|v| v.as_str()) {
            let rate = b.get("rate_cents").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
            let date = b
                .get("date")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            let entry = metrics_map.entry(cid.to_string()).or_insert((0, 0, None));
            entry.0 += 1; // count
            entry.1 += rate; // revenue
            if let Some(d) = date {
                if entry.2.is_none() || d > *entry.2.as_ref().unwrap() {
                    entry.2 = Some(d);
                }
            }
        }
    }

    for c in contacts {
        if let Some(cid) = c.get("client_id").and_then(|v| v.as_str()) {
            let count = contacts_count_map.entry(cid.to_string()).or_insert(0);
            *count += 1;
        }
    }

    // 4. Attach metrics to clients
    for client in &mut clients {
        if let Some(id) = client.get("id").and_then(|v| v.as_str()) {
            let c_count = contacts_count_map.get(id).copied().unwrap_or(0);

            if let Some((count, revenue, last_date)) = metrics_map.get(id) {
                let formatted_revenue = if *revenue >= 100000 {
                    let k_value = (*revenue as f64) / 100000.0;
                    if k_value.fract() == 0.0 {
                        format!("${:.0}K", k_value)
                    } else {
                        format!("${:.1}K", k_value)
                    }
                } else {
                    format!("${}", revenue / 100)
                };

                client.as_object_mut().unwrap().insert(
                    "metrics".to_string(),
                    json!({
                        "bookings": count,
                        "revenue": formatted_revenue,
                        "revenue_cents": revenue,
                        "lastBookingDate": last_date.clone().unwrap_or_else(|| "Never".to_string()),
                        "contacts": c_count,
                    }),
                );
            } else {
                client.as_object_mut().unwrap().insert(
                    "metrics".to_string(),
                    json!({
                        "bookings": 0,
                        "revenue": "$0",
                        "revenue_cents": 0,
                        "lastBookingDate": "Never",
                        "contacts": c_count,
                    }),
                );
            }
        }
    }

    Ok(Json(serde_json::Value::Array(clients)))
}

pub async fn create_client(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<AgencyClientPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let body = json!({
        "agency_id": user.id,
        "company": payload.company,
        "contact_name": payload.contact_name,
        "email": payload.email,
        "phone": payload.phone,
        "terms": payload.terms,
        "industry": payload.industry,
        "status": payload.status.unwrap_or_else(|| "Lead".to_string()),
        "website": payload.website,
        "tags": payload.tags.unwrap_or_default(),
        "notes": payload.notes,
        "next_follow_up_date": payload.next_follow_up_date,
        "preferences": payload.preferences.unwrap_or_else(|| json!({})),
    });
    let resp = state
        .pg
        .from("agency_clients")
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
        return Err((code, text));
    }
    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}

#[derive(Deserialize, Serialize, Debug)]
pub struct UpdateAgencyClientPayload {
    pub company: Option<String>,
    pub contact_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub terms: Option<String>,
    pub industry: Option<String>,
    pub status: Option<String>,
    pub website: Option<String>,
    pub tags: Option<Vec<String>>,
    pub notes: Option<String>,
    pub next_follow_up_date: Option<String>,
    pub preferences: Option<serde_json::Value>,
}

pub async fn update_client(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<UpdateAgencyClientPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let mut v =
        serde_json::to_value(&payload).map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    // Remove nulls to allow partial updates
    if let serde_json::Value::Object(ref mut map) = v {
        let null_keys: Vec<String> = map
            .iter()
            .filter_map(|(k, v)| if v.is_null() { Some(k.clone()) } else { None })
            .collect();
        for k in null_keys {
            map.remove(&k);
        }
        // Always update updated_at
        map.insert("updated_at".to_string(), json!(chrono::Utc::now()));
    }

    let resp = state
        .pg
        .from("agency_clients")
        .eq("id", &id)
        .eq("agency_id", &user.id)
        .update(v.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}

pub async fn delete_client(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("agency_clients")
        .eq("id", &id)
        .eq("agency_id", &user.id)
        .delete()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    // Supabase delete returns the deleted row(s)
    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}

pub async fn list_contacts(
    State(state): State<AppState>,
    Path(client_id): Path<String>,
    _user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("client_contacts")
        .select("*")
        .eq("client_id", &client_id)
        .order("created_at.desc")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}

pub async fn create_contact(
    State(state): State<AppState>,
    Path(client_id): Path<String>,
    _user: AuthUser,
    Json(payload): Json<AgencyClientContactPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let body = json!({
        "client_id": client_id,
        "name": payload.name,
        "role": payload.role,
        "email": payload.email,
        "phone": payload.phone,
        "is_primary": payload.is_primary.unwrap_or(false),
    });
    let resp = state
        .pg
        .from("client_contacts")
        .insert(body.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}

pub async fn delete_contact(
    State(state): State<AppState>,
    Path((_client_id, contact_id)): Path<(String, String)>,
    _user: AuthUser,
) -> Result<StatusCode, (StatusCode, String)> {
    state
        .pg
        .from("client_contacts")
        .delete()
        .eq("id", &contact_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn list_communications(
    State(state): State<AppState>,
    Path(client_id): Path<String>,
    _user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("client_communications")
        .select("*")
        .eq("client_id", &client_id)
        .order("occurred_at.desc")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}

pub async fn create_communication(
    State(state): State<AppState>,
    Path(client_id): Path<String>,
    _user: AuthUser,
    Json(payload): Json<AgencyClientCommunicationPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let body = json!({
        "client_id": client_id,
        "contact_id": payload.contact_id,
        "type": payload.communication_type,
        "subject": payload.subject,
        "content": payload.content,
        "occurred_at": payload.occurred_at.unwrap_or_else(|| chrono::Utc::now().to_rfc3339()),
    });
    let resp = state
        .pg
        .from("client_communications")
        .insert(body.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}
