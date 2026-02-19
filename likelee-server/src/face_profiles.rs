use crate::config::AppState;
use crate::errors::sanitize_db_error;
use crate::{auth::AuthUser, auth::RoleGuard};
use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
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
            .select("id,creator_id,full_legal_name,stage_name")
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
            .select("id,agency_id,creator_id,full_legal_name,stage_name,city,state_province,country,bio_notes,profile_photo_url,special_skills,instagram_followers,engagement_rate,is_verified_talent,status,updated_at")
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
            "is_connected": !creator_id.is_empty() && connected_creator_ids.contains(creator_id),
            "verification_source": "kyc",
            "kyc_status": row.get("kyc_status").cloned().unwrap_or(serde_json::Value::Null),
            "updated_at": row.get("updated_at").cloned().unwrap_or(serde_json::Value::Null),
        }));
    }

    for row in talents_rows {
        let talent_id = row.get("id").and_then(|v| v.as_str()).unwrap_or("");
        let agency_id = row.get("agency_id").and_then(|v| v.as_str()).unwrap_or("");
        let creator_id = row.get("creator_id").and_then(|v| v.as_str()).unwrap_or("");
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
            || (!name_key_stage.is_empty() && connected_talent_name_keys.contains(&name_key_stage));

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
            "is_connected": is_connected,
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
