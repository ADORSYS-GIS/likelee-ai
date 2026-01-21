use crate::{auth::AuthUser, config::AppState};
use axum::{extract::State, http::StatusCode, Json};
use axum::extract::Multipart;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Deserialize, Serialize, Debug)]
pub struct AgencyProfilePayload {
    pub agency_name: Option<String>,
    pub contact_name: Option<String>,
    pub contact_title: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub phone_number: Option<String>,
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

#[derive(Deserialize, Serialize, Debug)]
pub struct AgencyFileUploadResponse {
    pub id: String,
    pub file_name: String,
    pub public_url: Option<String>,
    pub storage_bucket: String,
    pub storage_path: String,
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
    while let Some(field) = multipart.next_field().await.map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))? {
        let name = field.name().map(|s| s.to_string());
        if name.as_deref() == Some("file") {
            file_name = field.file_name().map(|s| s.to_string());
            let data = field.bytes().await.map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
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
        .map(|c| if c.is_ascii_alphanumeric() || c == '.' || c == '_' || c == '-' { c } else { '_' })
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
        return Err((StatusCode::BAD_GATEWAY, format!("storage upload failed: {msg}")));
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
    let txt = resp.text().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let arr: Vec<serde_json::Value> = serde_json::from_str(&txt).unwrap_or_default();
    let rec = arr.get(0).cloned().unwrap_or(serde_json::json!({"id": ""}));
    let id = rec.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();

    Ok(Json(AgencyFileUploadResponse {
        id,
        file_name: fname,
        public_url,
        storage_bucket: bucket,
        storage_path: path,
    }))
}

#[derive(Deserialize, Serialize, Debug)]
pub struct TalentItem {
    pub id: String,
    pub full_name: Option<String>,
    pub profile_photo_url: Option<String>,
}

// List talents associated to the agency's organization via agency_users
pub async fn list_talents(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // 1) Find the organization owned by this agency user
    let org_resp = state
        .pg
        .from("organization_profiles")
        .select("id")
        .eq("owner_user_id", &user.id)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let org_text = org_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let org_json: serde_json::Value = serde_json::from_str(&org_text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let org_id = match org_json.get("id").and_then(|v| v.as_str()) {
        Some(s) => s.to_string(),
        None => return Ok(Json(json!([]))),
    };

    // 2) Query agency_users joined to creators; only role='talent' and status='active'
    // Use PostgREST embedded resource via FK agency_users.user_id -> creators.id
    let sel = "creators:user_id(id,full_name,profile_photo_url)";
    let resp = state
        .pg
        .from("agency_users")
        .select(sel)
        .eq("agency_id", &org_id)
        .eq("role", "talent")
        .eq("status", "active")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let rows: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // 3) Flatten to array of creators
    let talents: Vec<TalentItem> = rows
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .filter_map(|r| r.get("creators"))
        .filter_map(|c| serde_json::from_value::<TalentItem>(c.clone()).ok())
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
}

pub async fn list_clients(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("agency_clients")
        .select("id,agency_id,company,contact_name,email,phone,terms,created_at,updated_at")
        .eq("agency_id", &user.id)
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
        let code = StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err((code, text));
    }
    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}

pub async fn get_by_user(
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

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(v))
}
