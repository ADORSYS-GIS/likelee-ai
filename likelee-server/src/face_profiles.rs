use crate::config::AppState;
use crate::errors::sanitize_db_error;
use crate::{auth::AuthUser, auth::RoleGuard};
use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use tracing::info;
use uuid::Uuid;

#[derive(Deserialize, Serialize)]
pub struct FaceProfilePayload {
    pub age: Option<i32>,
    pub race: Option<String>,
    pub hair_color: Option<String>,
    pub hairstyle: Option<String>,
    pub eye_color: Option<String>,
    pub height_cm: Option<i32>,
    pub weight_kg: Option<i32>,
    pub facial_features: Option<Vec<String>>,
    pub creator_type: Option<String>,
}

#[derive(Serialize)]
pub struct FaceProfileResponse {
    pub id: String,
}

#[derive(Deserialize)]
pub struct SearchFacesQuery {
    pub query: Option<String>,
    pub creator_types: Option<String>,   // comma separated
    pub races: Option<String>,           // comma separated
    pub hair_colors: Option<String>,     // comma separated
    pub hairstyles: Option<String>,      // comma separated
    pub eye_colors: Option<String>,      // comma separated
    pub facial_features: Option<String>, // comma separated
    pub age_min: Option<i32>,
    pub age_max: Option<i32>,
    pub height_min: Option<i32>,
    pub height_max: Option<i32>,
    pub weight_min: Option<i32>,
    pub weight_max: Option<i32>,
}

#[derive(Deserialize)]
pub struct MarketplaceSearchQuery {
    pub query: Option<String>,
    pub profile_type: Option<String>, // all | creator | talent
    pub limit: Option<usize>,
}

#[derive(Deserialize)]
pub struct MarketplaceDetailsPath {
    pub profile_type: String, // creator | talent
    pub id: String,
}

#[derive(Deserialize)]
pub struct MarketplaceConnectPayload {
    pub profile_type: String, // creator | talent
    pub target_id: String,
    pub message: Option<String>,
}

pub async fn search_faces(
    State(state): State<AppState>,
    Query(q): Query<SearchFacesQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let mut request = state
        .pg
        .from("creators")
        .select("*")
        .eq("role", "creator")
        .eq("public_profile_visible", "true");

    if let Some(search) = q.query {
        if !search.is_empty() {
            let search_val = format!("*{search}*");
            request = request.or(format!(
                "full_name.ilike.{search_val},tagline.ilike.{search_val},bio.ilike.{search_val}"
            ));
        }
    }

    if let Some(types) = q.creator_types {
        if !types.is_empty() {
            let types_vec: Vec<&str> = types.split(',').collect();
            request = request.in_("creator_type", types_vec);
        }
    }

    if let Some(races) = q.races {
        if !races.is_empty() {
            let races_vec: Vec<&str> = races.split(',').collect();
            request = request.in_("race", races_vec);
        }
    }

    if let Some(colors) = q.hair_colors {
        if !colors.is_empty() {
            let colors_vec: Vec<&str> = colors.split(',').collect();
            request = request.in_("hair_color", colors_vec);
        }
    }

    if let Some(styles) = q.hairstyles {
        if !styles.is_empty() {
            let styles_vec: Vec<&str> = styles.split(',').collect();
            request = request.in_("hairstyle", styles_vec);
        }
    }

    if let Some(colors) = q.eye_colors {
        if !colors.is_empty() {
            let colors_vec: Vec<&str> = colors.split(',').collect();
            request = request.in_("eye_color", colors_vec);
        }
    }

    if let Some(features) = q.facial_features {
        if !features.is_empty() {
            let features_vec: Vec<&str> = features.split(',').collect();
            let features_str = format!("{{{}}}", features_vec.join(","));
            request = request.ov("facial_features", features_str);
        }
    }

    if let Some(min) = q.age_min {
        request = request.gte("age", min.to_string());
    }
    if let Some(max) = q.age_max {
        request = request.lte("age", max.to_string());
    }

    if let Some(min) = q.height_min {
        request = request.gte("height_cm", min.to_string());
    }
    if let Some(max) = q.height_max {
        request = request.lte("height_cm", max.to_string());
    }

    if let Some(min) = q.weight_min {
        request = request.gte("weight_kg", min.to_string());
    }
    if let Some(max) = q.weight_max {
        request = request.lte("weight_kg", max.to_string());
    }

    let resp = request
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

    let rows: serde_json::Value = serde_json::from_str(&text).unwrap_or(serde_json::json!([]));

    Ok(Json(rows))
}

pub async fn search_marketplace_profiles(
    State(state): State<AppState>,
    user: AuthUser,
    Query(q): Query<MarketplaceSearchQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    RoleGuard::new(vec!["agency", "brand"]).check(&user.role)?;

    let mut limit = q.limit.unwrap_or(60);
    if limit == 0 {
        limit = 1;
    }
    if limit > 120 {
        limit = 120;
    }

    let query_text = q
        .query
        .as_ref()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    let profile_type = q
        .profile_type
        .as_ref()
        .map(|s| s.trim().to_lowercase())
        .unwrap_or_else(|| "all".to_string());

    let mut creators_rows: Vec<serde_json::Value> = Vec::new();
    let mut talents_rows: Vec<serde_json::Value> = Vec::new();
    let mut connected_creator_ids: HashSet<String> = HashSet::new();
    let mut connected_talent_ids: HashSet<String> = HashSet::new();
    let mut connected_talent_name_keys: HashSet<String> = HashSet::new();
    let mut connected_talent_emails: HashSet<String> = HashSet::new();
    let mut invite_status_by_creator_id: HashMap<String, String> = HashMap::new();
    let mut effective_agency_id = user.id.clone();

    if user.role == "agency" {
        let by_id_resp = state
            .pg
            .from("agencies")
            .select("id")
            .eq("id", &user.id)
            .limit(1)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let by_id_status = by_id_resp.status();
        let by_id_text = by_id_resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if !by_id_status.is_success() {
            return Err(sanitize_db_error(by_id_status.as_u16(), by_id_text));
        }
        let by_id_rows: Vec<serde_json::Value> =
            serde_json::from_str(&by_id_text).unwrap_or_default();

        if by_id_rows.is_empty() {
            // Older schemas may key agency profile by user_id.
            if let Ok(by_user_resp) = state
                .pg
                .from("agencies")
                .select("id")
                .eq("user_id", &user.id)
                .limit(1)
                .execute()
                .await
            {
                if by_user_resp.status().is_success() {
                    if let Ok(by_user_text) = by_user_resp.text().await {
                        let rows: Vec<serde_json::Value> =
                            serde_json::from_str(&by_user_text).unwrap_or_default();
                        if let Some(org_id) = rows
                            .first()
                            .and_then(|r| r.get("id"))
                            .and_then(|v| v.as_str())
                        {
                            if !org_id.is_empty() {
                                effective_agency_id = org_id.to_string();
                            }
                        }
                    }
                }
            }
        }
    }

    if user.role == "agency" {
        let resp = state
            .pg
            .from("agency_users")
            .select("id,creator_id,full_legal_name,stage_name,email")
            .eq("agency_id", &effective_agency_id)
            .eq("status", "active")
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

        let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
        for row in rows {
            if let Some(id) = row.get("id").and_then(|v| v.as_str()) {
                if !id.is_empty() {
                    connected_talent_ids.insert(id.to_string());
                }
            }
            if let Some(creator_id) = row.get("creator_id").and_then(|v| v.as_str()) {
                if !creator_id.is_empty() {
                    connected_creator_ids.insert(creator_id.to_string());
                }
            }
            if let Some(full_legal_name) = row.get("full_legal_name").and_then(|v| v.as_str()) {
                let key = full_legal_name.trim().to_lowercase();
                if !key.is_empty() {
                    connected_talent_name_keys.insert(key);
                }
            }
            if let Some(stage_name) = row.get("stage_name").and_then(|v| v.as_str()) {
                let key = stage_name.trim().to_lowercase();
                if !key.is_empty() {
                    connected_talent_name_keys.insert(key);
                }
            }
            if let Some(email) = row.get("email").and_then(|v| v.as_str()) {
                let key = email.trim().to_lowercase();
                if !key.is_empty() {
                    connected_talent_emails.insert(key);
                }
            }
        }

        let pending_resp = state
            .pg
            .from("creator_agency_invites")
            .select("creator_id,status")
            .eq("agency_id", &effective_agency_id)
            .order("created_at.desc")
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let pending_status = pending_resp.status();
        let pending_text = pending_resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if !pending_status.is_success() {
            return Err(sanitize_db_error(pending_status.as_u16(), pending_text));
        }
        let pending_rows: Vec<serde_json::Value> =
            serde_json::from_str(&pending_text).unwrap_or_default();
        for row in pending_rows {
            if let Some(creator_id) = row.get("creator_id").and_then(|v| v.as_str()) {
                if !creator_id.is_empty() {
                    let status = row
                        .get("status")
                        .and_then(|v| v.as_str())
                        .unwrap_or("pending")
                        .to_lowercase();
                    invite_status_by_creator_id
                        .entry(creator_id.to_string())
                        .or_insert(status.clone());
                }
            }
        }
    }

    if profile_type == "all" || profile_type == "creator" {
        let mut request = state
            .pg
            .from("creators")
            .select("id,full_name,city,state,tagline,bio,profile_photo_url,creator_type,facial_features,kyc_status,updated_at")
            .eq("role", "creator")
            .eq("public_profile_visible", "true")
            .eq("kyc_status", "approved")
            .limit(limit);

        if let Some(search) = query_text.as_ref() {
            let search_val = format!("*{search}*");
            request = request.or(format!(
                "full_name.ilike.{search_val},tagline.ilike.{search_val},bio.ilike.{search_val},creator_type.ilike.{search_val}"
            ));
        }

        let resp = request
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
        creators_rows = serde_json::from_str(&text).unwrap_or_default();
    }

    if profile_type == "all" || profile_type == "talent" {
        let mut request = state
            .pg
            .from("agency_users")
            .select("id,agency_id,creator_id,full_legal_name,stage_name,email,city,state_province,country,bio_notes,profile_photo_url,special_skills,instagram_followers,engagement_rate,is_verified_talent,status,updated_at")
            .eq("role", "talent")
            .eq("status", "active")
            .eq("is_verified_talent", "true")
            .limit(limit);

        if let Some(search) = query_text.as_ref() {
            let search_val = format!("*{search}*");
            request = request.or(format!(
                "full_legal_name.ilike.{search_val},stage_name.ilike.{search_val},bio_notes.ilike.{search_val}"
            ));
        }

        let resp = request
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
        talents_rows = serde_json::from_str(&text).unwrap_or_default();
    }

    let mut results: Vec<serde_json::Value> = Vec::new();

    for row in creators_rows {
        let creator_id = row.get("id").and_then(|v| v.as_str()).unwrap_or("");
        let full_name = row
            .get("full_name")
            .and_then(|v| v.as_str())
            .unwrap_or("Unknown Creator")
            .to_string();
        let city = row.get("city").and_then(|v| v.as_str()).unwrap_or("");
        let state = row.get("state").and_then(|v| v.as_str()).unwrap_or("");
        let location = if city.is_empty() && state.is_empty() {
            String::new()
        } else if state.is_empty() {
            city.to_string()
        } else if city.is_empty() {
            state.to_string()
        } else {
            format!("{city}, {state}")
        };

        let connection_status = if !creator_id.is_empty() && connected_creator_ids.contains(creator_id) {
            "connected"
        } else if !creator_id.is_empty() {
            match invite_status_by_creator_id.get(creator_id).map(|s| s.as_str()) {
                Some("accepted") => "connected",
                Some("pending") => "pending",
                Some("declined") => "declined",
                _ => "none",
            }
        } else {
            "none"
        };

        results.push(serde_json::json!({
            "id": row.get("id").cloned().unwrap_or(serde_json::Value::Null),
            "profile_type": "creator",
            "display_name": full_name,
            "full_name": row.get("full_name").cloned().unwrap_or(serde_json::Value::Null),
            "location": location,
            "city": row.get("city").cloned().unwrap_or(serde_json::Value::Null),
            "state": row.get("state").cloned().unwrap_or(serde_json::Value::Null),
            "country": serde_json::Value::Null,
            "tagline": row.get("tagline").cloned().unwrap_or(serde_json::Value::Null),
            "bio": row.get("bio").cloned().unwrap_or(serde_json::Value::Null),
            "profile_photo_url": row.get("profile_photo_url").cloned().unwrap_or(serde_json::Value::Null),
            "creator_type": row.get("creator_type").cloned().unwrap_or(serde_json::Value::Null),
            "skills": row.get("facial_features").cloned().unwrap_or(serde_json::json!([])),
            "followers": serde_json::Value::Null,
            "engagement_rate": serde_json::Value::Null,
            "is_verified": true,
            "is_connected": connection_status == "connected",
            "is_pending": connection_status == "pending",
            "connection_status": connection_status,
            "verification_source": "kyc",
            "kyc_status": row.get("kyc_status").cloned().unwrap_or(serde_json::Value::Null),
            "updated_at": row.get("updated_at").cloned().unwrap_or(serde_json::Value::Null),
        }));
    }

    for row in talents_rows {
        let talent_id = row.get("id").and_then(|v| v.as_str()).unwrap_or("");
        let agency_id = row.get("agency_id").and_then(|v| v.as_str()).unwrap_or("");
        let creator_id = row.get("creator_id").and_then(|v| v.as_str()).unwrap_or("");
        let email_key = row
            .get("email")
            .and_then(|v| v.as_str())
            .map(|s| s.trim().to_lowercase())
            .unwrap_or_default();
        let display_name = row
            .get("stage_name")
            .and_then(|v| v.as_str())
            .filter(|s| !s.trim().is_empty())
            .or_else(|| row.get("full_legal_name").and_then(|v| v.as_str()))
            .unwrap_or("Unknown Talent")
            .to_string();
        let city = row.get("city").and_then(|v| v.as_str()).unwrap_or("");
        let state = row
            .get("state_province")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let country = row.get("country").and_then(|v| v.as_str()).unwrap_or("");
        let location = if city.is_empty() && state.is_empty() && country.is_empty() {
            String::new()
        } else {
            [city, state, country]
                .iter()
                .filter(|s| !s.is_empty())
                .cloned()
                .collect::<Vec<_>>()
                .join(", ")
        };

        let name_key_full = row
            .get("full_legal_name")
            .and_then(|v| v.as_str())
            .map(|s| s.trim().to_lowercase())
            .unwrap_or_default();
        let name_key_stage = row
            .get("stage_name")
            .and_then(|v| v.as_str())
            .map(|s| s.trim().to_lowercase())
            .unwrap_or_default();
        let is_connected = (!talent_id.is_empty() && connected_talent_ids.contains(talent_id))
            || (!creator_id.is_empty() && connected_creator_ids.contains(creator_id))
            || (!agency_id.is_empty() && agency_id == effective_agency_id)
            || (!name_key_full.is_empty() && connected_talent_name_keys.contains(&name_key_full))
            || (!name_key_stage.is_empty() && connected_talent_name_keys.contains(&name_key_stage))
            || (!email_key.is_empty() && connected_talent_emails.contains(&email_key));

        let connection_status = if is_connected {
            "connected"
        } else if !creator_id.is_empty() {
            match invite_status_by_creator_id.get(creator_id).map(|s| s.as_str()) {
                Some("accepted") => "connected",
                Some("pending") => "pending",
                Some("declined") => "declined",
                _ => "none",
            }
        } else {
            "none"
        };

        results.push(serde_json::json!({
            "id": row.get("id").cloned().unwrap_or(serde_json::Value::Null),
            "profile_type": "talent",
            "display_name": display_name,
            "full_name": row.get("full_legal_name").cloned().unwrap_or(serde_json::Value::Null),
            "stage_name": row.get("stage_name").cloned().unwrap_or(serde_json::Value::Null),
            "location": location,
            "city": row.get("city").cloned().unwrap_or(serde_json::Value::Null),
            "state": row.get("state_province").cloned().unwrap_or(serde_json::Value::Null),
            "country": row.get("country").cloned().unwrap_or(serde_json::Value::Null),
            "tagline": serde_json::Value::Null,
            "bio": row.get("bio_notes").cloned().unwrap_or(serde_json::Value::Null),
            "profile_photo_url": row.get("profile_photo_url").cloned().unwrap_or(serde_json::Value::Null),
            "creator_type": serde_json::Value::Null,
            "skills": row.get("special_skills").cloned().unwrap_or(serde_json::json!([])),
            "followers": row.get("instagram_followers").cloned().unwrap_or(serde_json::Value::Null),
            "engagement_rate": row.get("engagement_rate").cloned().unwrap_or(serde_json::Value::Null),
            "is_verified": true,
            "is_connected": connection_status == "connected",
            "is_pending": connection_status == "pending",
            "connection_status": connection_status,
            "verification_source": "agency",
            "kyc_status": serde_json::Value::Null,
            "updated_at": row.get("updated_at").cloned().unwrap_or(serde_json::Value::Null),
        }));
    }

    results.sort_by(|a, b| {
        let au = a
            .get("updated_at")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let bu = b
            .get("updated_at")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        bu.cmp(&au)
    });

    if results.len() > limit {
        results.truncate(limit);
    }

    Ok(Json(serde_json::Value::Array(results)))
}

async fn resolve_effective_agency_id(
    state: &AppState,
    user: &AuthUser,
) -> Result<String, (StatusCode, String)> {
    if user.role != "agency" {
        return Ok(user.id.clone());
    }

    let by_id_resp = state
        .pg
        .from("agencies")
        .select("id")
        .eq("id", &user.id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let by_id_status = by_id_resp.status();
    let by_id_text = by_id_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !by_id_status.is_success() {
        return Err(sanitize_db_error(by_id_status.as_u16(), by_id_text));
    }
    let by_id_rows: Vec<serde_json::Value> = serde_json::from_str(&by_id_text).unwrap_or_default();
    if !by_id_rows.is_empty() {
        return Ok(user.id.clone());
    }

    if let Ok(by_user_resp) = state
        .pg
        .from("agencies")
        .select("id")
        .eq("user_id", &user.id)
        .limit(1)
        .execute()
        .await
    {
        if by_user_resp.status().is_success() {
            if let Ok(by_user_text) = by_user_resp.text().await {
                let rows: Vec<serde_json::Value> =
                    serde_json::from_str(&by_user_text).unwrap_or_default();
                if let Some(org_id) = rows
                    .first()
                    .and_then(|r| r.get("id"))
                    .and_then(|v| v.as_str())
                {
                    if !org_id.is_empty() {
                        return Ok(org_id.to_string());
                    }
                }
            }
        }
    }

    Ok(user.id.clone())
}

pub async fn get_marketplace_profile_details(
    State(state): State<AppState>,
    user: AuthUser,
    axum::extract::Path(path): axum::extract::Path<MarketplaceDetailsPath>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    RoleGuard::new(vec!["agency", "brand"]).check(&user.role)?;

    let profile_type = path.profile_type.trim().to_lowercase();
    let profile_id = path.id.trim().to_string();
    if profile_id.is_empty() || (profile_type != "creator" && profile_type != "talent") {
        return Err((StatusCode::BAD_REQUEST, "invalid marketplace profile path".to_string()));
    }

    let effective_agency_id = resolve_effective_agency_id(&state, &user).await?;
    let mut response = serde_json::json!({
        "profile_type": profile_type,
        "profile": serde_json::Value::Null,
        "availability": serde_json::json!({}),
        "rates": serde_json::json!([]),
        "portfolio": serde_json::json!([]),
        "campaigns": serde_json::json!([]),
        "connection_status": "none",
    });

    let creator_id_for_connection: Option<String>;
    let mut talent_ids_for_assets: Vec<String> = Vec::new();

    if profile_type == "talent" {
        let talent_resp = state
            .pg
            .from("agency_users")
            .select("id,agency_id,creator_id,full_legal_name,stage_name,city,state_province,country,bio_notes,profile_photo_url,special_skills,instagram_followers,engagement_rate,is_verified_talent,status")
            .eq("id", &profile_id)
            .eq("role", "talent")
            .limit(1)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let talent_status = talent_resp.status();
        let talent_text = talent_resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if !talent_status.is_success() {
            return Err(sanitize_db_error(talent_status.as_u16(), talent_text));
        }
        let talent_rows: Vec<serde_json::Value> =
            serde_json::from_str(&talent_text).unwrap_or_default();
        let row = talent_rows
            .first()
            .cloned()
            .ok_or((StatusCode::NOT_FOUND, "marketplace profile not found".to_string()))?;
        creator_id_for_connection = row
            .get("creator_id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());
        talent_ids_for_assets.push(profile_id.clone());
        response["profile"] = row;

        let pref_resp = state
            .pg
            .from("talent_booking_preferences")
            .select("willing_to_travel,min_day_rate_cents,currency,updated_at")
            .eq("talent_id", &profile_id)
            .limit(1)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let pref_status = pref_resp.status();
        let pref_text = pref_resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if pref_status.is_success() {
            let pref_rows: Vec<serde_json::Value> = serde_json::from_str(&pref_text).unwrap_or_default();
            if let Some(pref) = pref_rows.first() {
                response["availability"] = serde_json::json!({
                    "willing_to_travel": pref.get("willing_to_travel").cloned().unwrap_or(serde_json::json!(false)),
                    "updated_at": pref.get("updated_at").cloned().unwrap_or(serde_json::Value::Null),
                });
                response["rates"] = serde_json::json!([{
                    "label": "Day Rate",
                    "amount_cents": pref.get("min_day_rate_cents").cloned().unwrap_or(serde_json::Value::Null),
                    "currency": pref.get("currency").cloned().unwrap_or(serde_json::json!("USD")),
                }]);
            }
        }
    } else {
        let creator_resp = state
            .pg
            .from("creators")
            .select("id,full_name,city,state,tagline,bio,profile_photo_url,creator_type,facial_features,kyc_status")
            .eq("id", &profile_id)
            .limit(1)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let creator_status = creator_resp.status();
        let creator_text = creator_resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if !creator_status.is_success() {
            return Err(sanitize_db_error(creator_status.as_u16(), creator_text));
        }
        let creator_rows: Vec<serde_json::Value> =
            serde_json::from_str(&creator_text).unwrap_or_default();
        let row = creator_rows
            .first()
            .cloned()
            .ok_or((StatusCode::NOT_FOUND, "marketplace profile not found".to_string()))?;
        creator_id_for_connection = Some(profile_id.clone());
        response["profile"] = row;

        let rates_resp = state
            .pg
            .from("creator_custom_rates")
            .select("rate_type,rate_name,price_per_month_cents")
            .eq("creator_id", &profile_id)
            .limit(12)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let rates_status = rates_resp.status();
        let rates_text = rates_resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if rates_status.is_success() {
            response["rates"] = serde_json::from_str(&rates_text).unwrap_or(serde_json::json!([]));
        }

        let talent_ids_resp = state
            .pg
            .from("agency_users")
            .select("id")
            .eq("creator_id", &profile_id)
            .eq("role", "talent")
            .limit(30)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let talent_ids_status = talent_ids_resp.status();
        let talent_ids_text = talent_ids_resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if talent_ids_status.is_success() {
            let rows: Vec<serde_json::Value> =
                serde_json::from_str(&talent_ids_text).unwrap_or_default();
            talent_ids_for_assets = rows
                .iter()
                .filter_map(|r| r.get("id").and_then(|v| v.as_str()))
                .map(|s| s.to_string())
                .collect();
        }
    }

    if !talent_ids_for_assets.is_empty() {
        let id_refs = talent_ids_for_assets.iter().map(|s| s.as_str()).collect::<Vec<_>>();
        let portfolio_resp = state
            .pg
            .from("talent_portfolio_items")
            .select("id,title,media_url,status,created_at,talent_id")
            .in_("talent_id", id_refs.clone())
            .eq("status", "live")
            .order("created_at.desc")
            .limit(12)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let portfolio_status = portfolio_resp.status();
        let portfolio_text = portfolio_resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if portfolio_status.is_success() {
            response["portfolio"] =
                serde_json::from_str(&portfolio_text).unwrap_or(serde_json::json!([]));
        }

        let campaigns_resp = state
            .pg
            .from("campaigns")
            .select("id,name,campaign_type,status,date,payment_amount,brand_vertical,region")
            .in_("talent_id", id_refs)
            .order("date.desc")
            .limit(10)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let campaigns_status = campaigns_resp.status();
        let campaigns_text = campaigns_resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if campaigns_status.is_success() {
            response["campaigns"] =
                serde_json::from_str(&campaigns_text).unwrap_or(serde_json::json!([]));
        }
    }

    if let Some(creator_id) = creator_id_for_connection {
        let connected_resp = state
            .pg
            .from("agency_users")
            .select("id")
            .eq("agency_id", &effective_agency_id)
            .eq("creator_id", &creator_id)
            .eq("status", "active")
            .limit(1)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let connected_status = connected_resp.status();
        let connected_text = connected_resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if connected_status.is_success() {
            let rows: Vec<serde_json::Value> =
                serde_json::from_str(&connected_text).unwrap_or_default();
            if !rows.is_empty() {
                response["connection_status"] = serde_json::json!("connected");
            }
        }

        if response["connection_status"] != serde_json::json!("connected") {
            let pending_resp = state
                .pg
                .from("creator_agency_invites")
                .select("id")
                .eq("agency_id", &effective_agency_id)
                .eq("creator_id", &creator_id)
                .eq("status", "pending")
                .limit(1)
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let pending_status = pending_resp.status();
            let pending_text = pending_resp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            if pending_status.is_success() {
                let rows: Vec<serde_json::Value> =
                    serde_json::from_str(&pending_text).unwrap_or_default();
                if !rows.is_empty() {
                    response["connection_status"] = serde_json::json!("pending");
                }
            }
        }
    }

    Ok(Json(response))
}

pub async fn create_marketplace_connection_request(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<MarketplaceConnectPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    RoleGuard::new(vec!["agency"]).check(&user.role)?;
    let effective_agency_id = resolve_effective_agency_id(&state, &user).await?;

    let profile_type = payload.profile_type.trim().to_lowercase();
    if profile_type != "creator" && profile_type != "talent" {
        return Err((StatusCode::BAD_REQUEST, "invalid profile_type".to_string()));
    }
    let target_id = payload.target_id.trim();
    if target_id.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "missing target_id".to_string()));
    }

    let creator_id = if profile_type == "creator" {
        target_id.to_string()
    } else {
        let resp = state
            .pg
            .from("agency_users")
            .select("creator_id")
            .eq("id", target_id)
            .eq("role", "talent")
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
        let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
        rows.first()
            .and_then(|r| r.get("creator_id"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .ok_or((StatusCode::BAD_REQUEST, "target talent has no linked creator".to_string()))?
    };

    let connected_resp = state
        .pg
        .from("agency_users")
        .select("id")
        .eq("agency_id", &effective_agency_id)
        .eq("creator_id", &creator_id)
        .eq("status", "active")
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let connected_status = connected_resp.status();
    let connected_text = connected_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !connected_status.is_success() {
        return Err(sanitize_db_error(connected_status.as_u16(), connected_text));
    }
    let connected_rows: Vec<serde_json::Value> =
        serde_json::from_str(&connected_text).unwrap_or_default();
    if !connected_rows.is_empty() {
        return Ok(Json(serde_json::json!({"status":"connected"})));
    }

    let pending_resp = state
        .pg
        .from("creator_agency_invites")
        .select("id,status")
        .eq("agency_id", &effective_agency_id)
        .eq("creator_id", &creator_id)
        .order("created_at.desc")
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let pending_status = pending_resp.status();
    let pending_text = pending_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !pending_status.is_success() {
        return Err(sanitize_db_error(pending_status.as_u16(), pending_text));
    }
    let pending_rows: Vec<serde_json::Value> =
        serde_json::from_str(&pending_text).unwrap_or_default();
    if let Some(row) = pending_rows.first() {
        let invite_status = row
            .get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("pending")
            .to_lowercase();
        if invite_status == "accepted" {
            return Ok(Json(serde_json::json!({"status":"connected"})));
        }
        if invite_status == "declined" {
            return Ok(Json(serde_json::json!({"status":"declined"})));
        }
        return Ok(Json(serde_json::json!({"status":"pending"})));
    }

    let insert_payload = serde_json::json!({
        "agency_id": effective_agency_id,
        "creator_id": creator_id,
        "status": "pending",
    });
    let _message = payload
        .message
        .as_ref()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty());

    let create_resp = state
        .pg
        .from("creator_agency_invites")
        .insert(insert_payload.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let create_status = create_resp.status();
    let create_text = create_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !create_status.is_success() {
        if create_status.as_u16() == StatusCode::CONFLICT.as_u16() {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&create_text) {
                if v.get("code")
                    .and_then(|c| c.as_str())
                    .map(|c| c == "23505")
                    .unwrap_or(false)
                {
                    return Ok(Json(serde_json::json!({"status":"pending"})));
                }
            }
        }
        return Err(sanitize_db_error(create_status.as_u16(), create_text));
    }

    Ok(Json(serde_json::json!({"status":"pending"})))
}

pub async fn create_face_profile(
    _state: State<AppState>,
    Json(_body): Json<FaceProfilePayload>,
) -> Result<Json<FaceProfileResponse>, (StatusCode, String)> {
    let id = Uuid::new_v4().to_string();
    info!(%id, "Created face profile");
    Ok(Json(FaceProfileResponse { id }))
}

pub async fn update_face_profile(
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(_body): Json<FaceProfilePayload>,
) -> Result<Json<FaceProfileResponse>, (StatusCode, String)> {
    info!(%id, "Updated face profile (no-op)");
    Ok(Json(FaceProfileResponse { id }))
}
