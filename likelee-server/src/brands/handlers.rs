use crate::auth::{ensure_signup_email_available, AuthUser};
use crate::state::AppState;
use crate::team::{ensure_owner_membership, resolve_effective_brand_id, OrganizationType};
use axum::extract::Query;
use axum::{extract::State, http::StatusCode, Json};
use reqwest::Client;
use serde_json::json;

use super::dto::{BrandProfilePayload, BrandRegisterPayload, ListBrandNotificationsQuery};
use super::repository;

pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<BrandRegisterPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let client = Client::new();
    let email = ensure_signup_email_available(&state, payload.email.as_str()).await?;

    // 1. Create Supabase user with role metadata
    let create_user_url = format!("{}/auth/v1/admin/users", state.supabase_url);
    let body = json!({
        "email": email,
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
        let lower = txt.to_lowercase();
        if lower.contains("already") || lower.contains("registered") || lower.contains("exists") {
            return Err((
                StatusCode::CONFLICT,
                json!({
                    "code": "email_already_registered",
                    "message": "This email is already registered. Please sign in with the existing account or use a different email."
                })
                .to_string(),
            ));
        }
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
        "email": email,
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
        "email": email,
        "website": payload.website,
        "phone_number": payload.phone_number,
        "status": "waitlist",
        "onboarding_step": "email_verification"
    });

    repository::create_brand_profile(&state, &brand_profile).await?;

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

    let brand_id = match resolve_effective_brand_id(&state, &user).await {
        Ok(id) => {
            tracing::debug!(
                user_id = %user.id,
                brand_id = %id,
                "Using resolved brand ID for profile update"
            );
            id
        }
        Err(_) => {
            tracing::debug!(
                user_id = %user.id,
                "No membership found, using user ID for profile update (new user)"
            );
            user.id.clone()
        }
    };

    if let serde_json::Value::Object(ref mut map) = v {
        let is_only_notification_prefs = payload.notification_prefs.is_some()
            && payload.company_name.is_none()
            && payload.contact_name.is_none()
            && payload.contact_title.is_none()
            && payload.email.is_none()
            && payload.website.is_none()
            && payload.phone_number.is_none()
            && payload.logo_url.is_none()
            && payload.industry.is_none()
            && payload.primary_goal.is_none()
            && payload.geographic_target.is_none()
            && payload.provide_creators.is_none()
            && payload.production_type.is_none()
            && payload.budget_range.is_none()
            && payload.creates_for.is_none()
            && payload.uses_ai.is_none()
            && payload.roles_needed.is_none()
            && payload.status.is_none()
            && payload.onboarding_step.is_none();

        if is_only_notification_prefs {
            let update_payload = json!({
                "notification_prefs": payload.notification_prefs
            });

            repository::update_brand_profile(&state, &brand_id, &update_payload).await?;
            return Ok(Json(repository::get_brand_profile(&state, &brand_id).await?));
        }

        map.insert("onboarding_step".into(), json!("complete"));

        if payload.email.is_none() {
            if let Some(email) = &user.email {
                map.insert("email".into(), json!(email));
            }
        }

        let null_keys: Vec<String> = map
            .iter()
            .filter_map(|(k, v)| if v.is_null() { Some(k.clone()) } else { None })
            .collect();
        for k in null_keys {
            map.remove(&k);
        }

        map.remove("id");
    }

    repository::update_brand_profile(&state, &brand_id, &v).await?;
    let _ = ensure_owner_membership(&state, &user, OrganizationType::Brand, &brand_id).await;

    Ok(Json(repository::get_brand_profile(&state, &brand_id).await?))
}

pub async fn get_by_user(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let brand_id = resolve_effective_brand_id(&state, &user).await?;
    Ok(Json(repository::get_brand_profile(&state, &brand_id).await?))
}

pub async fn list_notifications(
    State(state): State<AppState>,
    user: AuthUser,
    Query(q): Query<ListBrandNotificationsQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let brand_id = resolve_effective_brand_id(&state, &user).await?;
    let limit = q.limit.unwrap_or(50).min(200);
    Ok(Json(repository::list_brand_notifications(&state, &brand_id, limit).await?))
}

pub async fn mark_notification_read(
    State(state): State<AppState>,
    user: AuthUser,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let brand_id = resolve_effective_brand_id(&state, &user).await?;
    repository::mark_notification_read(&state, &brand_id, &id).await?;
    Ok(Json(json!({"status": "ok"})))
}

pub async fn get_notification_count(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let brand_id = resolve_effective_brand_id(&state, &user).await?;
    let count = repository::get_notification_count(&state, &brand_id).await?;
    Ok(Json(json!({ "count": count })))
}

pub async fn get_inbox_unread_count(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let brand_id = resolve_effective_brand_id(&state, &user).await?;
    let count = repository::get_inbox_unread_count(&state, &brand_id).await;
    Ok(Json(json!({ "count": count })))
}

pub async fn get_jobs_unread_count(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let brand_id = resolve_effective_brand_id(&state, &user).await?;
    let count = repository::get_jobs_unread_count(&state, &brand_id).await;
    Ok(Json(json!({ "count": count })))
}

pub async fn mark_inbox_packages_viewed(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let brand_id = resolve_effective_brand_id(&state, &user).await?;
    repository::mark_inbox_packages_viewed(&state, &brand_id).await;
    Ok(Json(json!({"ok": true})))
}

pub async fn mark_job_applications_viewed(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let brand_id = resolve_effective_brand_id(&state, &user).await?;
    repository::mark_job_applications_viewed(&state, &brand_id).await;
    Ok(Json(json!({"ok": true})))
}

pub async fn get_licensing_contracts_count(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let brand_id = resolve_effective_brand_id(&state, &user).await?;
    let count = repository::get_licensing_contracts_count(&state, &brand_id).await?;
    Ok(Json(json!({ "count": count })))
}
