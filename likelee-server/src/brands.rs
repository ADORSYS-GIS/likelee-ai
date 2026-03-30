use crate::auth::AuthUser;
use crate::config::AppState;
use crate::errors::sanitize_db_error;
use axum::{extract::State, http::StatusCode, Json};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Deserialize, Serialize, Debug)]
pub struct BrandProfilePayload {
    pub company_name: Option<String>,
    pub contact_name: Option<String>,
    pub contact_title: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub phone_number: Option<String>,
    pub industry: Option<String>,
    pub primary_goal: Option<serde_json::Value>,
    pub geographic_target: Option<String>,
    pub provide_creators: Option<String>,
    pub production_type: Option<String>,
    pub budget_range: Option<String>,
    pub creates_for: Option<String>,
    pub uses_ai: Option<String>,
    pub roles_needed: Option<serde_json::Value>,
    pub status: Option<String>,
    pub onboarding_step: Option<String>,
}

#[derive(Deserialize, Serialize, Debug)]
pub struct BrandRegisterPayload {
    pub email: String,
    pub password: String,
    pub company_name: String,
    pub contact_name: Option<String>,
    pub contact_title: Option<String>,
    pub website: Option<String>,
    pub phone_number: Option<String>,
}

pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<BrandRegisterPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let client = Client::new();

    // 1. Create Supabase user with role metadata
    let create_user_url = format!("{}/auth/v1/admin/users", state.supabase_url);
    let body = json!({
        "email": payload.email,
        "password": payload.password,
        "email_confirm": false,
        "user_metadata": {
            "role": "brand"
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

    // 3. Create brand profile
    let brand_profile = json!({
        "id": user_id,
        "company_name": payload.company_name,
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
        .from("brands")
        .insert(brand_profile.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    let txt = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        return Err(sanitize_db_error(status.as_u16(), txt));
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
    Json(payload): Json<BrandProfilePayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if !user.role.trim().is_empty() && user.role != "brand" {
        return Err((
            StatusCode::FORBIDDEN,
            format!(
                "This account is already registered as {}. Use a separate account for brand access.",
                user.role
            ),
        ));
    }

    let target_onboarding_step = payload
        .onboarding_step
        .clone()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| "complete".to_string());
    let company_name = payload
        .company_name
        .clone()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());
    let email = payload
        .email
        .clone()
        .or_else(|| user.email.clone())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    let mut v =
        serde_json::to_value(&payload).map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    if let serde_json::Value::Object(ref mut map) = v {
        map.remove("id");
        map.insert("onboarding_step".into(), json!(target_onboarding_step));

        // Remove nulls
        let null_keys: Vec<String> = map
            .iter()
            .filter_map(|(k, v)| if v.is_null() { Some(k.clone()) } else { None })
            .collect();
        for k in null_keys {
            map.remove(&k);
        }
    }

    let exists_resp = state
        .pg
        .from("brands")
        .select("id")
        .eq("id", &user.id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let exists_status = exists_resp.status();
    let exists_text = exists_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !exists_status.is_success() {
        return Err(sanitize_db_error(exists_status.as_u16(), exists_text));
    }

    let exists_rows: Vec<serde_json::Value> = serde_json::from_str(&exists_text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let exists = !exists_rows.is_empty();

    let resp = if exists {
        state
            .pg
            .from("brands")
            .auth(state.supabase_service_key.clone())
            .eq("id", &user.id)
            .update(v.to_string())
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    } else {
        for (table, role_label) in [("creators", "creator"), ("agencies", "agency")] {
            let conflict_resp = state
                .pg
                .from(table)
                .select("id")
                .eq("id", &user.id)
                .limit(1)
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

            let conflict_status = conflict_resp.status();
            let conflict_text = conflict_resp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

            if !conflict_status.is_success() {
                return Err(sanitize_db_error(conflict_status.as_u16(), conflict_text));
            }

            let conflict_rows: Vec<serde_json::Value> = serde_json::from_str(&conflict_text)
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

            if !conflict_rows.is_empty() {
                return Err((
                    StatusCode::FORBIDDEN,
                    format!(
                        "This account already has a {} profile. Use a separate account for brand access.",
                        role_label
                    ),
                ));
            }
        }

        let company_name = company_name.ok_or((
            StatusCode::BAD_REQUEST,
            "company_name is required to create a brand profile".to_string(),
        ))?;
        let email = email.ok_or((
            StatusCode::BAD_REQUEST,
            "email is required to create a brand profile".to_string(),
        ))?;

        let mut insert_map = match v {
            serde_json::Value::Object(map) => map,
            _ => serde_json::Map::new(),
        };
        insert_map.insert("id".into(), json!(user.id));
        insert_map.insert("company_name".into(), json!(company_name));
        insert_map.insert("email".into(), json!(email));
        insert_map
            .entry("status")
            .or_insert_with(|| json!("waitlist"));

        state
            .pg
            .from("brands")
            .auth(state.supabase_service_key.clone())
            .insert(serde_json::Value::Object(insert_map).to_string())
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    };

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !status.is_success() {
        return Err(sanitize_db_error(status.as_u16(), text));
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
        .from("brands")
        .select("*")
        .eq("id", &user.id)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !status.is_success() {
        return Err(sanitize_db_error(status.as_u16(), text));
    }

    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(v))
}
