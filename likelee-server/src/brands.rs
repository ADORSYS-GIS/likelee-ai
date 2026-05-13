use crate::auth::{ensure_signup_email_available, AuthUser};
use crate::config::AppState;
use crate::errors::sanitize_db_error;
use crate::team::{ensure_owner_membership, resolve_effective_brand_id, OrganizationType};
use axum::extract::Query;
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

    // Resolve the effective brand ID - for team members this returns the organization's ID,
    // not the team member's user ID. For new users without a membership, fall back to user.id.
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
        // Check if we're only updating notification_prefs BEFORE mutating the map
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

        // If only updating notification_prefs, use UPDATE instead of UPSERT
        if is_only_notification_prefs {
            let update_payload = json!({
                "notification_prefs": payload.notification_prefs
            });

            let resp = state
                .pg
                .from("brands")
                .auth(state.supabase_service_key.clone())
                .eq("id", &brand_id)
                .update(update_payload.to_string())
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

            // UPDATE returns empty array by default, so fetch the updated record
            let fetch_resp = state
                .pg
                .from("brands")
                .auth(state.supabase_service_key.clone())
                .select("*")
                .eq("id", &brand_id)
                .limit(1)
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

            let fetch_text = fetch_resp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

            let rows: Vec<serde_json::Value> = serde_json::from_str(&fetch_text)
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

            let profile = rows.into_iter().next().ok_or((
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to fetch updated profile".to_string(),
            ))?;

            return Ok(Json(profile));
        }

        map.insert("onboarding_step".into(), json!("complete"));

        // For OAuth signups, fill in email from auth metadata if not provided
        if payload.email.is_none() {
            if let Some(email) = &user.email {
                map.insert("email".into(), json!(email));
            }
        }

        // Remove nulls to avoid overwriting existing data with nulls
        let null_keys: Vec<String> = map
            .iter()
            .filter_map(|(k, v)| if v.is_null() { Some(k.clone()) } else { None })
            .collect();
        for k in null_keys {
            map.remove(&k);
        }

        // Remove id from the update payload — the row is matched by the .eq() filter below.
        // Never include id in the UPDATE body; it is the primary key and must not be changed.
        map.remove("id");
    }

    // Use a plain UPDATE (not upsert). The brand row is always created first by
    // brand-register, so the row is guaranteed to exist at this point.
    // Using upsert here triggers the _enforce_single_role INSERT path on the
    // ON CONFLICT branch even when the row already exists, causing a false 23P01.
    let resp = state
        .pg
        .from("brands")
        .auth(state.supabase_service_key.clone())
        .eq("id", &brand_id)
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

    let _ = ensure_owner_membership(&state, &user, OrganizationType::Brand, &brand_id).await;

    // UPDATE returns an empty array by default; fetch the updated record explicitly.
    let fetch_resp = state
        .pg
        .from("brands")
        .auth(state.supabase_service_key.clone())
        .select("*")
        .eq("id", &brand_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let fetch_text = fetch_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let rows: Vec<serde_json::Value> = serde_json::from_str(&fetch_text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let profile = rows.into_iter().next().ok_or((
        StatusCode::NOT_FOUND,
        json!({
            "error": "Brand profile not found after update.",
            "code": "profile_not_found"
        })
        .to_string(),
    ))?;

    Ok(Json(profile))
}

pub async fn get_by_user(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // Resolve the effective brand ID - for team members this returns the organization's ID,
    // not the team member's user ID. This ensures team members see the same profile data
    // as the organization owner (same subscriptions, plan_tier, etc.)
    let brand_id = resolve_effective_brand_id(&state, &user).await?;

    let resp = state
        .pg
        .from("brands")
        .select("*")
        .eq("id", &brand_id)
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
        Some(profile) => Ok(Json(profile)),
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
    let brand_id = resolve_effective_brand_id(&state, &user).await?;
    let limit = q.limit.unwrap_or(50).min(200);

    let resp = state
        .pg
        .from("brand_notifications")
        .select("id,agency_id,channel,from_label,subject,message,meta_json,read_at,created_at")
        .eq("brand_id", &brand_id)
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
    let brand_id = resolve_effective_brand_id(&state, &user).await?;
    let update = json!({
        "read_at": chrono::Utc::now().to_rfc3339()
    });

    let resp = state
        .pg
        .from("brand_notifications")
        .eq("id", &id)
        .eq("brand_id", &brand_id)
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
    let brand_id = resolve_effective_brand_id(&state, &user).await?;
    let resp = state
        .pg
        .from("brand_notifications")
        .select("id")
        .eq("brand_id", &brand_id)
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
    let brand_id = resolve_effective_brand_id(&state, &user).await?;
    // Count unread inbox events from brand_activity_events
    // Look for events with subject_table = 'campaign_offer_packages'
    let resp = state
        .pg
        .from("brand_activity_events")
        .select("id")
        .eq("brand_id", &brand_id)
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
    let brand_id = resolve_effective_brand_id(&state, &user).await?;
    // Count new job application events from brand_activity_events
    // Look for events with subject_table = 'job_postings' and type containing 'application'
    let resp = state
        .pg
        .from("brand_activity_events")
        .select("id")
        .eq("brand_id", &brand_id)
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
    let brand_id = resolve_effective_brand_id(&state, &user).await?;
    // Delete inbox activity events for this brand
    let resp = state
        .pg
        .from("brand_activity_events")
        .delete()
        .eq("brand_id", &brand_id)
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
    let brand_id = resolve_effective_brand_id(&state, &user).await?;
    // Delete job application activity events for this brand
    let resp = state
        .pg
        .from("brand_activity_events")
        .delete()
        .eq("brand_id", &brand_id)
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
    let brand_id = resolve_effective_brand_id(&state, &user).await?;
    // Count licensing requests where agency has sent contract (status changed to contract_sent or similar)
    // This counts unread notifications of type "contract_ready"
    let resp = state
        .pg
        .from("brand_notifications")
        .select("id")
        .eq("brand_id", &brand_id)
        .is("read_at", "null")
        .eq("meta_json->>type", "contract_ready")
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

    let contract_count = notifications.len();

    Ok(Json(json!({
        "count": contract_count
    })))
}
