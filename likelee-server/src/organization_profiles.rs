use crate::{auth::AuthUser, config::AppState};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;

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
    // Create a Supabase user via Admin API (service role) so brand can sign up unauthenticated
    let client = Client::new();
    let create_user_url = format!("{}/auth/v1/admin/users", state.supabase_url);
    let body = json!({
        "email": payload.email,
        "password": payload.password,
        "email_confirm": false
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
    let owner_user_id = created
        .get("id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or((
            StatusCode::INTERNAL_SERVER_ERROR,
            "missing id in create user response".to_string(),
        ))?;

    // Generate a signup confirmation link so the brand can verify their email
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
    if !link_resp.status().is_success() {
        let txt = link_resp
            .text()
            .await
            .unwrap_or_else(|_| "failed to generate signup confirmation link".to_string());
        return Err((StatusCode::BAD_REQUEST, txt));
    }
    let link_json: serde_json::Value = link_resp
        .json()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let action_link = link_json
        .get("action_link")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    // Use provided email from payload; user was just created above
    let email = payload.email.clone();
    let organization_name = payload.organization_name.clone();

    let mut org =
        serde_json::to_value(&payload).map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    if let serde_json::Value::Object(ref mut map) = org {
        map.insert(
            "owner_user_id".into(),
            serde_json::Value::String(owner_user_id.clone()),
        );
        map.insert("email".into(), serde_json::Value::String(email));
        map.insert(
            "organization_name".into(),
            serde_json::Value::String(organization_name),
        );
        map.insert(
            "status".into(),
            serde_json::Value::String("waitlist".to_string()),
        );
        map.insert(
            "onboarding_step".into(),
            serde_json::Value::String("email_verification".to_string()),
        );
        // Remove auth-only fields that are not part of organization_profiles schema
        map.remove("password");
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
    let org_row: serde_json::Value = serde_json::from_str(&txt)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    // 3) Set role in profiles table based on organization type
    let role = match payload.organization_type.as_str() {
        "brand" | "brand_company" | "production_studio" => "brand",
        "marketing_agency" | "talent_agency" | "sports_agency" => "agency",
        _ => "brand", // Default to brand if unknown
    };

    // Use upsert to ensure the profile exists and has the correct role
    let _ = state
        .pg
        .from("profiles")
        .auth(state.supabase_service_key.clone())
        .upsert(
            serde_json::json!({
                "id": &owner_user_id,
                "role": role,
                "email": payload.email
            })
            .to_string(),
        )
        .execute()
        .await;

    let resp = json!({
        "organization": org_row,
        "next_action": {
            "type": "verify_email",
            "action_link": action_link
        }
    });
    Ok(Json(resp))
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
        map.insert(
            "onboarding_step".into(),
            serde_json::Value::String("complete".to_string()),
        );
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
        map.insert(
            "onboarding_step".into(),
            serde_json::Value::String("complete".to_string()),
        );
    }
    let body = v.to_string();
    let resp = state
        .pg
        .from("organization_profiles")
        .auth(state.supabase_service_key.clone()) // Use service key
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
