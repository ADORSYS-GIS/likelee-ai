use crate::{auth::AuthUser, config::AppState};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};

// Accept either a single string or an array of strings for primary_goal
#[derive(Deserialize, Serialize, Debug, Clone)]
#[serde(untagged)]
pub enum PrimaryGoalField {
    One(String),
    Many(Vec<String>),
}

#[derive(Deserialize, Serialize, Debug)]
pub struct OrganizationProfilePayload {
    pub owner_user_id: Option<String>,
    pub email: Option<String>,
    pub organization_name: Option<String>,
    pub contact_name: Option<String>,
    pub contact_title: Option<String>,
    pub organization_type: Option<String>,
    pub website: Option<String>,
    pub phone_number: Option<String>,
    pub industry: Option<String>,
    pub primary_goal: Option<PrimaryGoalField>,
    pub geographic_target: Option<String>,
    pub production_type: Option<String>,
    pub budget_range: Option<String>,
    pub uses_ai: Option<String>,
    pub creates_for: Option<String>,
    pub roles_needed: Option<serde_json::Value>,
    pub client_count: Option<String>,
    pub campaign_budget: Option<String>,
    pub services_offered: Option<serde_json::Value>,
    pub handle_contracts: Option<String>,
    pub talent_count: Option<String>,
    pub licenses_likeness: Option<String>,
    pub open_to_ai: Option<serde_json::Value>,
    pub campaign_types: Option<serde_json::Value>,
    pub bulk_onboard: Option<String>,
    pub status: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct OrganizationProfileRow {
    pub id: String,
}

#[derive(Deserialize, Serialize, Debug)]
pub struct OrganizationRegisterPayload {
    pub email: String,
    pub password: String,
    pub organization_name: String,
    pub organization_type: String,
    pub contact_name: Option<String>,
    pub contact_title: Option<String>,
    pub website: Option<String>,
    pub phone_number: Option<String>,
}

pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<OrganizationRegisterPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let admin_url = format!("{}/auth/v1/admin/users", state.supabase_url);
    let client = reqwest::Client::new();
    let create_user_body = serde_json::json!({
        "email": payload.email,
        "password": payload.password,
        "email_confirm": true,
        "email_confirmed_at": chrono::Utc::now().to_rfc3339()
    });
    let user_resp = client
        .post(&admin_url)
        .header("apikey", state.supabase_service_key.clone())
        .header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        )
        .json(&create_user_body)
        .send()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = user_resp.status();
    let user_text = user_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        let code =
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err((code, user_text));
    }
    let user_json: serde_json::Value = serde_json::from_str(&user_text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let owner_user_id = user_json
        .get("user")
        .and_then(|u| u.get("id"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .or_else(|| {
            user_json
                .get("id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        })
        .ok_or((
            StatusCode::INTERNAL_SERVER_ERROR,
            "failed to parse created user id".to_string(),
        ))?;

    let mut org = serde_json::json!({
        "owner_user_id": owner_user_id,
        "email": user_json.get("user").and_then(|u| u.get("email")).and_then(|v| v.as_str()).unwrap_or("").to_string(),
        "organization_name": payload.organization_name,
        "organization_type": payload.organization_type,
        "contact_name": payload.contact_name,
        "contact_title": payload.contact_title,
        "website": payload.website,
        "phone_number": payload.phone_number,
        "status": "waitlist"
    });
    if let serde_json::Value::Object(ref mut map) = org {
        if let Some(serde_json::Value::Array(arr)) = map.get("primary_goal").cloned() {
            let joined = arr
                .into_iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect::<Vec<_>>()
                .join(", ");
            map.insert("primary_goal".into(), serde_json::Value::String(joined));
        }
    }
    let body = org.to_string();
    let resp = state
        .pg
        .from("organization_profiles")
        .insert(body)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let st = resp.status();
    let txt = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !st.is_success() {
        let code = StatusCode::from_u16(st.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err((code, txt));
    }
    let v: serde_json::Value = serde_json::from_str(&txt)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    // 3) Set role in profiles table
    let _ = state
        .pg
        .from("profiles")
        .update(serde_json::json!({ "role": "brand" }).to_string())
        .eq("id", &owner_user_id)
        .execute()
        .await;

    Ok(Json(v))
}

pub async fn create(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<OrganizationProfilePayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let owner_user_id = user.id;
    // Validate required fields on create
    let email = payload
        .email
        .clone()
        .ok_or((StatusCode::BAD_REQUEST, "missing email".to_string()))?;
    let organization_name = payload.organization_name.clone().ok_or((
        StatusCode::BAD_REQUEST,
        "missing organization_name".to_string(),
    ))?;
    let mut v =
        serde_json::to_value(&payload).map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    if let serde_json::Value::Object(ref mut map) = v {
        map.insert(
            "owner_user_id".into(),
            serde_json::Value::String(owner_user_id),
        );
        map.insert("email".into(), serde_json::Value::String(email));
        map.insert(
            "organization_name".into(),
            serde_json::Value::String(organization_name),
        );
        // Normalize primary_goal: if it's an array, join to a comma-separated string to fit DB text column
        if let Some(serde_json::Value::Array(arr)) = map.get("primary_goal").cloned() {
            let joined = arr
                .into_iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect::<Vec<_>>()
                .join(", ");
            map.insert("primary_goal".into(), serde_json::Value::String(joined));
        }
    }
    let body = v.to_string();
    let resp = state
        .pg
        .from("organization_profiles")
        .insert(body)
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

pub async fn update(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<OrganizationProfilePayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // 1. Verify ownership
    let check_resp = state
        .pg
        .from("organization_profiles")
        .select("owner_user_id")
        .eq("id", &id)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let check_text = check_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let check_json: serde_json::Value = serde_json::from_str(&check_text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let owner_id = check_json
        .get("owner_user_id")
        .and_then(|v| v.as_str())
        .ok_or((StatusCode::NOT_FOUND, "Organization not found".to_string()))?;

    if owner_id != user.id {
        return Err((
            StatusCode::FORBIDDEN,
            "You do not own this organization".to_string(),
        ));
    }

    // 2. Normalize primary_goal to a string if provided as array
    let mut v =
        serde_json::to_value(&payload).map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    if let serde_json::Value::Object(ref mut map) = v {
        if let Some(serde_json::Value::Array(arr)) = map.get("primary_goal").cloned() {
            let joined = arr
                .into_iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect::<Vec<_>>()
                .join(", ");
            map.insert("primary_goal".into(), serde_json::Value::String(joined));
        }
        // Do not allow updating ownership via this endpoint
        map.remove("owner_user_id");
        // Remove null fields so PostgREST does not overwrite existing values with NULL
        let null_keys: Vec<String> = map
            .iter()
            .filter_map(|(k, v)| if v.is_null() { Some(k.clone()) } else { None })
            .collect();
        for k in null_keys {
            map.remove(&k);
        }
    }
    let body = v.to_string();
    let resp = state
        .pg
        .from("organization_profiles")
        .eq("id", &id)
        .update(body)
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

pub async fn get_by_user(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("organization_profiles")
        .select("*")
        .eq("owner_user_id", &user.id)
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
