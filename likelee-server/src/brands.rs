use crate::auth::AuthUser;
use crate::config::AppState;
use crate::errors::sanitize_db_error;
use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
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
    pub logo_url: Option<String>,
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
    pub notification_prefs: Option<serde_json::Value>,
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
    let mut v =
        serde_json::to_value(&payload).map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    if let serde_json::Value::Object(ref mut map) = v {
        // Remove nulls first to avoid overwriting existing data with nulls
        let null_keys: Vec<String> = map
            .iter()
            .filter_map(|(k, v)| if v.is_null() { Some(k.clone()) } else { None })
            .collect();
        for k in null_keys {
            map.remove(&k);
        }

        // Check if we're only updating notification_prefs (before adding id)
        let is_only_notification_prefs = map.len() == 1 && map.contains_key("notification_prefs");

        // If only updating notification_prefs, use UPDATE instead of UPSERT
        if is_only_notification_prefs {
            let resp = state
                .pg
                .from("brands")
                .auth(state.supabase_service_key.clone())
                .eq("id", &user.id)
                .update(v.to_string())
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

            return Ok(Json(v));
        }

        // Include the user's id for upsert matching
        map.insert("id".into(), json!(user.id));

        // Only set onboarding_step to complete if we're updating profile fields (not just notification_prefs)
        if !is_only_notification_prefs {
            map.insert("onboarding_step".into(), json!("complete"));

            // For new profiles (OAuth signup), set default values
            if payload.email.is_none() {
                // Try to get email from auth user metadata if not provided
                if let Some(email) = &user.email {
                    map.insert("email".into(), json!(email));
                }
            }
        }
    }

    // Use upsert to create or update the profile
    // This supports both:
    // - OAuth users creating their profile for the first time
    // - Existing users updating their profile
    let resp = state
        .pg
        .from("brands")
        .auth(state.supabase_service_key.clone())
        .upsert(v.to_string())
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

pub async fn get_by_user(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("brands")
        .select("*")
        .eq("id", &user.id)
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
        return Err(sanitize_db_error(status.as_u16(), text));
    }

    let rows: Vec<serde_json::Value> = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    match rows.into_iter().next() {
        Some(v) => Ok(Json(v)),
        None => Err((
            StatusCode::NOT_FOUND,
            json!({
                "error": "Brand profile not found.",
                "code": "profile_not_found"
            })
            .to_string(),
        )),
    }
}

// Brand Notifications

#[derive(Deserialize)]
pub struct ListBrandNotificationsQuery {
    pub limit: Option<u32>,
}

pub async fn list_notifications(
    State(state): State<AppState>,
    user: AuthUser,
    Query(q): Query<ListBrandNotificationsQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let limit = q.limit.unwrap_or(50).min(200);

    let resp = state
        .pg
        .from("brand_notifications")
        .select("id,agency_id,channel,from_label,subject,message,meta_json,read_at,created_at")
        .eq("brand_id", &user.id)
        .order("created_at.desc")
        .limit(limit as usize)
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

pub async fn mark_notification_read(
    State(state): State<AppState>,
    user: AuthUser,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let update = json!({
        "read_at": chrono::Utc::now().to_rfc3339()
    });

    let resp = state
        .pg
        .from("brand_notifications")
        .eq("id", &id)
        .eq("brand_id", &user.id)
        .update(update.to_string())
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

    Ok(Json(json!({"status": "ok"})))
}

pub async fn get_notification_count(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("brand_notifications")
        .select("id")
        .eq("brand_id", &user.id)
        .is("read_at", "null")
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

    let notifications: Vec<serde_json::Value> = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(json!({
        "count": notifications.len()
    })))
}

// Badge Count Endpoints

pub async fn get_inbox_unread_count(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // Count unread inbox events from brand_activity_events
    // Look for events with subject_table = 'campaign_offer_packages'
    let resp = state
        .pg
        .from("brand_activity_events")
        .select("id")
        .eq("brand_id", &user.id)
        .eq("subject_table", "campaign_offer_packages")
        .execute()
        .await;

    let count = match resp {
        Ok(resp) => {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();

            if !status.is_success() {
                // Table might not exist yet, return 0
                0
            } else {
                let events: Vec<serde_json::Value> =
                    serde_json::from_str(&text).unwrap_or_default();
                events.len()
            }
        }
        Err(_) => 0, // Table doesn't exist, return 0
    };

    Ok(Json(json!({
        "count": count
    })))
}

pub async fn get_jobs_unread_count(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // Count new job application events from brand_activity_events
    // Look for events with subject_table = 'job_postings' and type containing 'application'
    let resp = state
        .pg
        .from("brand_activity_events")
        .select("id")
        .eq("brand_id", &user.id)
        .eq("subject_table", "job_postings")
        .execute()
        .await;

    let count = match resp {
        Ok(resp) => {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();

            if !status.is_success() {
                // Table might not exist yet, return 0
                0
            } else {
                let events: Vec<serde_json::Value> =
                    serde_json::from_str(&text).unwrap_or_default();
                events.len()
            }
        }
        Err(_) => 0, // Table doesn't exist, return 0
    };

    Ok(Json(json!({
        "count": count
    })))
}

pub async fn mark_inbox_packages_viewed(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // Delete inbox activity events for this brand
    let resp = state
        .pg
        .from("brand_activity_events")
        .delete()
        .eq("brand_id", &user.id)
        .eq("subject_table", "campaign_offer_packages")
        .execute()
        .await;

    match resp {
        Ok(resp) => {
            if !resp.status().is_success() {
                tracing::warn!("Failed to clear inbox activity events");
            }
        }
        Err(e) => {
            tracing::warn!("Error clearing inbox activity events: {}", e);
        }
    }

    Ok(Json(json!({"ok": true})))
}

pub async fn mark_job_applications_viewed(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // Delete job application activity events for this brand
    let resp = state
        .pg
        .from("brand_activity_events")
        .delete()
        .eq("brand_id", &user.id)
        .eq("subject_table", "job_postings")
        .execute()
        .await;

    match resp {
        Ok(resp) => {
            if !resp.status().is_success() {
                tracing::warn!("Failed to clear job application activity events");
            }
        }
        Err(e) => {
            tracing::warn!("Error clearing job application activity events: {}", e);
        }
    }

    Ok(Json(json!({"ok": true})))
}

pub async fn get_licensing_contracts_count(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // Count licensing requests where agency has sent contract (status changed to contract_sent or similar)
    // This counts unread notifications of type "contract_ready"
    let resp = state
        .pg
        .from("brand_notifications")
        .select("id")
        .eq("brand_id", &user.id)
        .is("read_at", "null")
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

    let notifications: Vec<serde_json::Value> = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Filter for contract_ready type
    let contract_count = notifications
        .iter()
        .filter(|n| {
            n.get("meta_json")
                .and_then(|m| m.get("type"))
                .and_then(|t| t.as_str())
                == Some("contract_ready")
        })
        .count();

    Ok(Json(json!({
        "count": contract_count
    })))
}
