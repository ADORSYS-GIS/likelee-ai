use crate::config::AppState;
use crate::errors::sanitize_db_error;
use crate::{auth::AuthUser, auth::RoleGuard};
use axum::{
    extract::{Path, Query, State},
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
    pub profile_type: Option<String>, // all | creator | agency | connected | waiting
    pub entity_type: Option<String>,  // creator | agency
    pub limit: Option<usize>,
}

#[derive(Deserialize)]
pub struct MarketplaceDetailsPath {
    pub profile_type: String, // creator | agency
    pub id: String,
}

#[derive(Deserialize)]
pub struct MarketplaceConnectPayload {
    pub profile_type: String, // creator | agency
    pub target_id: String,
    pub message: Option<String>,
}

#[derive(Deserialize)]
pub struct BrandLicensingRequestPayload {
    pub agency_id: String,
    pub creator_id: String,
    pub campaign_title: String,
    pub usage_scope: Option<String>,
    pub territory: Option<String>,
    pub duration_days: Option<i64>,
    pub offer_amount: Option<f64>,
    pub category: Option<String>,
    pub description: Option<String>,
    pub exclusivity: Option<String>,
    pub custom_terms: Option<String>,
    pub modifications_allowed: Option<String>,
}

fn is_missing_relation_error(text: &str, relation_hint: &str) -> bool {
    let lower = text.to_lowercase();
    if lower.contains("pgrst205") {
        return true;
    }
    if lower.contains("schema cache") && lower.contains("not found") {
        return true;
    }
    if !relation_hint.is_empty() && lower.contains(&relation_hint.to_lowercase()) {
        return lower.contains("not found")
            || lower.contains("does not exist")
            || lower.contains("schema cache");
    }
    false
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
    let entity_type = q
        .entity_type
        .as_ref()
        .map(|s| s.trim().to_lowercase())
        .unwrap_or_else(|| "creator".to_string());
    if entity_type != "creator" && entity_type != "agency" {
        return Err((StatusCode::BAD_REQUEST, "invalid entity_type".to_string()));
    }

    if profile_type != "all"
        && profile_type != "creator"
        && profile_type != "agency"
        && profile_type != "connected"
        && profile_type != "waiting"
    {
        return Err((StatusCode::BAD_REQUEST, "invalid profile_type".to_string()));
    }

    let mut results: Vec<serde_json::Value> = Vec::new();

    if entity_type == "creator" {
        let mut creators_rows: Vec<serde_json::Value> = Vec::new();
        let mut connected_creator_ids: HashSet<String> = HashSet::new();
        let mut invite_status_by_creator_id: HashMap<String, String> = HashMap::new();
        let mut followers_by_creator_id: HashMap<String, i64> = HashMap::new();
        let mut engagement_by_creator_id: HashMap<String, f64> = HashMap::new();
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

        if user.role == "brand" {
            let effective_brand_id = resolve_effective_brand_id(&state, &user).await?;

            let connected_resp = state
                .pg
                .from("brand_creator_connections")
                .select("creator_id")
                .eq("brand_id", &effective_brand_id)
                .eq("status", "active")
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
                for row in rows {
                    if let Some(creator_id) = row.get("creator_id").and_then(|v| v.as_str()) {
                        if !creator_id.is_empty() {
                            connected_creator_ids.insert(creator_id.to_string());
                        }
                    }
                }
            } else if !is_missing_relation_error(&connected_text, "brand_creator_connections") {
                return Err(sanitize_db_error(connected_status.as_u16(), connected_text));
            }

            let request_resp = state
                .pg
                .from("brand_creator_connection_requests")
                .select("creator_id,status")
                .eq("brand_id", &effective_brand_id)
                .order("created_at.desc")
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let request_status = request_resp.status();
            let request_text = request_resp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            if request_status.is_success() {
                let rows: Vec<serde_json::Value> =
                    serde_json::from_str(&request_text).unwrap_or_default();
                for row in rows {
                    if let Some(creator_id) = row.get("creator_id").and_then(|v| v.as_str()) {
                        if !creator_id.is_empty() {
                            let status = row
                                .get("status")
                                .and_then(|v| v.as_str())
                                .unwrap_or("pending")
                                .to_lowercase();
                            invite_status_by_creator_id
                                .entry(creator_id.to_string())
                                .or_insert(status);
                        }
                    }
                }
            } else if !is_missing_relation_error(&request_text, "brand_creator_connection_requests")
            {
                return Err(sanitize_db_error(request_status.as_u16(), request_text));
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
                if let Some(creator_id) = row.get("creator_id").and_then(|v| v.as_str()) {
                    if !creator_id.is_empty() {
                        connected_creator_ids.insert(creator_id.to_string());
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

        if profile_type == "all"
            || profile_type == "creator"
            || profile_type == "connected"
            || profile_type == "waiting"
        {
            let mut request = state
                .pg
                .from("creators")
                .select("id,full_name,city,state,tagline,bio,profile_photo_url,creator_type,facial_features,kyc_status,updated_at,public_profile_visible,visibility")
                .eq("role", "creator")
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

            let creator_ids: Vec<String> = creators_rows
                .iter()
                .filter_map(|r| r.get("id").and_then(|v| v.as_str()))
                .filter(|s| !s.is_empty())
                .map(|s| s.to_string())
                .collect();

            if !creator_ids.is_empty() {
                let creator_refs: Vec<&str> = creator_ids.iter().map(|s| s.as_str()).collect();
                let metrics_resp = state
                    .pg
                    .from("agency_users")
                    .select("creator_id,instagram_followers,engagement_rate,updated_at")
                    .in_("creator_id", creator_refs)
                    .eq("role", "talent")
                    .eq("status", "active")
                    .order("updated_at.desc")
                    .execute()
                    .await
                    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
                let metrics_status = metrics_resp.status();
                let metrics_text = metrics_resp
                    .text()
                    .await
                    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
                if metrics_status.is_success() {
                    let metric_rows: Vec<serde_json::Value> =
                        serde_json::from_str(&metrics_text).unwrap_or_default();
                    for row in metric_rows {
                        let creator_id = row
                            .get("creator_id")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();
                        if creator_id.is_empty() {
                            continue;
                        }
                        if !followers_by_creator_id.contains_key(&creator_id) {
                            if let Some(v) = row.get("instagram_followers").and_then(|v| v.as_i64())
                            {
                                followers_by_creator_id.insert(creator_id.clone(), v);
                            }
                        }
                        if !engagement_by_creator_id.contains_key(&creator_id) {
                            if let Some(v) = row.get("engagement_rate").and_then(|v| v.as_f64()) {
                                engagement_by_creator_id.insert(creator_id.clone(), v);
                            }
                        }
                    }
                }
            }
        }

        for row in creators_rows {
            let public_profile_visible =
                row.get("public_profile_visible").and_then(|v| v.as_bool());
            let visibility = row
                .get("visibility")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_lowercase();
            let is_visible_to_marketplace = public_profile_visible.unwrap_or_else(|| {
                visibility.is_empty()
                    || visibility == "public"
                    || visibility == "brands"
                    || visibility == "visible_to_brands"
                    || visibility == "true"
            });
            if !is_visible_to_marketplace {
                continue;
            }

            let creator_id = row.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let connection_status =
                if !creator_id.is_empty() && connected_creator_ids.contains(creator_id) {
                    "connected"
                } else if !creator_id.is_empty() {
                    match invite_status_by_creator_id
                        .get(creator_id)
                        .map(|s| s.as_str())
                    {
                        Some("accepted") => "disconnected",
                        Some("pending") => "waiting",
                        Some("declined") => "declined",
                        _ => "none",
                    }
                } else {
                    "none"
                };

            if profile_type == "connected" && connection_status != "connected" {
                continue;
            }
            if profile_type == "waiting" && connection_status != "waiting" {
                continue;
            }

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
                "followers": followers_by_creator_id
                    .get(creator_id)
                    .map(|v| serde_json::json!(v))
                    .unwrap_or(serde_json::Value::Null),
                "engagement_rate": engagement_by_creator_id
                    .get(creator_id)
                    .map(|v| serde_json::json!(v))
                    .unwrap_or(serde_json::Value::Null),
                "is_verified": true,
                "is_connected": connection_status == "connected",
                "is_pending": connection_status == "waiting",
                "connection_status": connection_status,
                "verification_source": "kyc",
                "kyc_status": row.get("kyc_status").cloned().unwrap_or(serde_json::Value::Null),
                "updated_at": row.get("updated_at").cloned().unwrap_or(serde_json::Value::Null),
            }));
        }
    } else {
        let mut invite_status_by_agency_id: HashMap<String, String> = HashMap::new();
        let mut connected_agency_ids: HashSet<String> = HashSet::new();
        let mut connection_table_available = true;
        if user.role == "brand" {
            let connected_resp = state
                .pg
                .from("brand_agency_connections")
                .select("agency_id")
                .eq("brand_id", &user.id)
                .eq("status", "active")
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let connected_status = connected_resp.status();
            let connected_text = connected_resp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            if !connected_status.is_success() {
                if !is_missing_relation_error(&connected_text, "brand_agency_connections") {
                    return Err(sanitize_db_error(connected_status.as_u16(), connected_text));
                }
                connection_table_available = false;
            } else {
                let connected_rows: Vec<serde_json::Value> =
                    serde_json::from_str(&connected_text).unwrap_or_default();
                for row in connected_rows {
                    let Some(agency_id) = row.get("agency_id").and_then(|v| v.as_str()) else {
                        continue;
                    };
                    if agency_id.is_empty() {
                        continue;
                    }
                    connected_agency_ids.insert(agency_id.to_string());
                }
            }

            let invite_resp = state
                .pg
                .from("brand_agency_connection_requests")
                .select("agency_id,status")
                .eq("brand_id", &user.id)
                .order("created_at.desc")
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let invite_status = invite_resp.status();
            let invite_text = invite_resp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            if !invite_status.is_success() {
                if !is_missing_relation_error(&invite_text, "brand_agency_connection_requests") {
                    return Err(sanitize_db_error(invite_status.as_u16(), invite_text));
                }
            } else {
                let invite_rows: Vec<serde_json::Value> =
                    serde_json::from_str(&invite_text).unwrap_or_default();
                for row in invite_rows {
                    let Some(agency_id) = row.get("agency_id").and_then(|v| v.as_str()) else {
                        continue;
                    };
                    if agency_id.is_empty() {
                        continue;
                    }
                    let status = row
                        .get("status")
                        .and_then(|v| v.as_str())
                        .unwrap_or("pending")
                        .to_lowercase();
                    invite_status_by_agency_id
                        .entry(agency_id.to_string())
                        .or_insert(status);
                }
            }
        }

        let mut request = state
            .pg
            .from("agencies")
            .select("id,agency_name,contact_name,city,state,country,agency_type,services_offered,website,logo_url,kyc_status,updated_at")
            .eq("kyc_status", "approved")
            .limit(limit);

        if let Some(search) = query_text.as_ref() {
            let search_val = format!("*{search}*");
            request = request.or(format!(
                "agency_name.ilike.{search_val},contact_name.ilike.{search_val},agency_type.ilike.{search_val},website.ilike.{search_val}"
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
        let agency_rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();

        for row in agency_rows {
            let agency_id = row.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let connection_status = if connected_agency_ids.contains(agency_id) {
                "connected"
            } else {
                let raw_status = invite_status_by_agency_id
                    .get(agency_id)
                    .map(|s| s.as_str())
                    .unwrap_or("none");
                match raw_status {
                    "accepted" if !connection_table_available => "connected",
                    "pending" => "waiting",
                    "declined" => "declined",
                    _ => "none",
                }
            };

            if profile_type == "connected" && connection_status != "connected" {
                continue;
            }
            if profile_type == "waiting" && connection_status != "waiting" {
                continue;
            }

            let city = row.get("city").and_then(|v| v.as_str()).unwrap_or("");
            let state = row.get("state").and_then(|v| v.as_str()).unwrap_or("");
            let country = row.get("country").and_then(|v| v.as_str()).unwrap_or("");
            let location = if !city.is_empty() && !state.is_empty() {
                format!("{city}, {state}")
            } else if !city.is_empty() {
                city.to_string()
            } else if !state.is_empty() {
                state.to_string()
            } else {
                country.to_string()
            };

            let services = row
                .get("services_offered")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str().map(|s| s.to_string()))
                        .collect::<Vec<String>>()
                })
                .unwrap_or_default();

            let agency_name = row
                .get("agency_name")
                .and_then(|v| v.as_str())
                .unwrap_or("Unknown Agency");
            let agency_type = row
                .get("agency_type")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let tagline = if agency_type.is_empty() {
                "Verified agency".to_string()
            } else {
                format!("{} agency", agency_type.replace('_', " "))
            };

            results.push(serde_json::json!({
                "id": row.get("id").cloned().unwrap_or(serde_json::Value::Null),
                "profile_type": "agency",
                "display_name": agency_name,
                "full_name": row.get("contact_name").cloned().unwrap_or(serde_json::Value::Null),
                "location": location,
                "city": row.get("city").cloned().unwrap_or(serde_json::Value::Null),
                "state": row.get("state").cloned().unwrap_or(serde_json::Value::Null),
                "country": row.get("country").cloned().unwrap_or(serde_json::Value::Null),
                "tagline": tagline,
                "bio": row
                    .get("agency_type")
                    .and_then(|v| v.as_str())
                    .map(|s| format!("Verified {} agency", s.replace('_', " ")))
                    .unwrap_or_else(|| "Verified agency".to_string()),
                "profile_photo_url": row.get("logo_url").cloned().unwrap_or(serde_json::Value::Null),
                "creator_type": row.get("agency_type").cloned().unwrap_or(serde_json::Value::Null),
                "skills": serde_json::json!(services),
                "followers": serde_json::Value::Null,
                "engagement_rate": serde_json::Value::Null,
                "is_verified": true,
                "is_connected": connection_status == "connected",
                "is_pending": connection_status == "waiting",
                "connection_status": connection_status,
                "verification_source": "kyc",
                "kyc_status": row.get("kyc_status").cloned().unwrap_or(serde_json::Value::Null),
                "updated_at": row.get("updated_at").cloned().unwrap_or(serde_json::Value::Null),
            }));
        }
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

async fn resolve_effective_brand_id(
    state: &AppState,
    user: &AuthUser,
) -> Result<String, (StatusCode, String)> {
    if user.role != "brand" {
        return Ok(user.id.clone());
    }

    let by_id_resp = state
        .pg
        .from("brands")
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
        .from("brands")
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

async fn resolve_effective_creator_id(
    state: &AppState,
    user: &AuthUser,
) -> Result<String, (StatusCode, String)> {
    if user.role != "creator" && user.role != "talent" {
        return Ok(user.id.clone());
    }

    let by_id_resp = state
        .pg
        .from("creators")
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
        .from("creators")
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
                if let Some(creator_id) = rows
                    .first()
                    .and_then(|r| r.get("id"))
                    .and_then(|v| v.as_str())
                {
                    if !creator_id.is_empty() {
                        return Ok(creator_id.to_string());
                    }
                }
            }
        }
    }

    if let Some(email) = user
        .email
        .as_ref()
        .map(|e| e.trim())
        .filter(|e| !e.is_empty())
    {
        if let Ok(by_email_resp) = state
            .pg
            .from("creators")
            .select("id")
            .eq("email", email)
            .limit(1)
            .execute()
            .await
        {
            if by_email_resp.status().is_success() {
                if let Ok(by_email_text) = by_email_resp.text().await {
                    let rows: Vec<serde_json::Value> =
                        serde_json::from_str(&by_email_text).unwrap_or_default();
                    if let Some(creator_id) = rows
                        .first()
                        .and_then(|r| r.get("id"))
                        .and_then(|v| v.as_str())
                    {
                        if !creator_id.is_empty() {
                            return Ok(creator_id.to_string());
                        }
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
    if profile_id.is_empty() || (profile_type != "creator" && profile_type != "agency") {
        return Err((
            StatusCode::BAD_REQUEST,
            "invalid marketplace profile path".to_string(),
        ));
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

    if profile_type == "creator" {
        let creator_id_for_connection: Option<String> = Some(profile_id.clone());
        let mut talent_ids_for_assets: Vec<String> = Vec::new();
        let creator_resp = state
            .pg
            .from("creators")
            .select("id,full_name,city,state,tagline,bio,profile_photo_url,creator_type,facial_features,kyc_status,content_types,industries,base_monthly_price_cents,currency_code,accept_negotiations,portfolio_link,public_profile_visible,visibility")
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
        let row = creator_rows.first().cloned().ok_or((
            StatusCode::NOT_FOUND,
            "marketplace profile not found".to_string(),
        ))?;
        let public_profile_visible = row.get("public_profile_visible").and_then(|v| v.as_bool());
        let visibility = row
            .get("visibility")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_lowercase();
        let is_visible_to_marketplace = public_profile_visible.unwrap_or_else(|| {
            visibility.is_empty()
                || visibility == "public"
                || visibility == "brands"
                || visibility == "visible_to_brands"
                || visibility == "true"
        });
        if !is_visible_to_marketplace {
            return Err((
                StatusCode::NOT_FOUND,
                "marketplace profile not found".to_string(),
            ));
        }
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

        if !talent_ids_for_assets.is_empty() {
            let id_refs = talent_ids_for_assets
                .iter()
                .map(|s| s.as_str())
                .collect::<Vec<_>>();

            let availability_resp = state
                .pg
                .from("talent_booking_preferences")
                .select("willing_to_travel,min_day_rate_cents,currency,updated_at")
                .in_("talent_id", id_refs.clone())
                .eq("agency_id", &effective_agency_id)
                .order("updated_at.desc")
                .limit(1)
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let availability_status = availability_resp.status();
            let availability_text = availability_resp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            if availability_status.is_success() {
                let rows: Vec<serde_json::Value> =
                    serde_json::from_str(&availability_text).unwrap_or_default();
                if let Some(first) = rows.first() {
                    response["availability"] = first.clone();
                }
            }

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
            if user.role == "brand" {
                let effective_brand_id = resolve_effective_brand_id(&state, &user).await?;

                let connected_resp = state
                    .pg
                    .from("brand_creator_connections")
                    .select("id")
                    .eq("brand_id", &effective_brand_id)
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
                } else if !is_missing_relation_error(&connected_text, "brand_creator_connections") {
                    return Err(sanitize_db_error(connected_status.as_u16(), connected_text));
                }

                if response["connection_status"] != serde_json::json!("connected") {
                    let request_resp = state
                        .pg
                        .from("brand_creator_connection_requests")
                        .select("status")
                        .eq("brand_id", &effective_brand_id)
                        .eq("creator_id", &creator_id)
                        .order("created_at.desc")
                        .limit(1)
                        .execute()
                        .await
                        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
                    let request_status = request_resp.status();
                    let request_text = request_resp
                        .text()
                        .await
                        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
                    if request_status.is_success() {
                        let rows: Vec<serde_json::Value> =
                            serde_json::from_str(&request_text).unwrap_or_default();
                        if let Some(status) = rows
                            .first()
                            .and_then(|r| r.get("status"))
                            .and_then(|v| v.as_str())
                        {
                            response["connection_status"] = serde_json::json!(match status {
                                "pending" => "waiting",
                                "declined" => "declined",
                                _ => "none",
                            });
                        }
                    } else if !is_missing_relation_error(
                        &request_text,
                        "brand_creator_connection_requests",
                    ) {
                        return Err(sanitize_db_error(request_status.as_u16(), request_text));
                    }
                }
            } else {
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
        }
    } else {
        let agency_resp = state
            .pg
            .from("agencies")
            .select("id,agency_name,contact_name,email,website,phone_number,agency_type,services_offered,city,state,country,logo_url,kyc_status,updated_at")
            .eq("id", &profile_id)
            .eq("kyc_status", "approved")
            .limit(1)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let agency_status = agency_resp.status();
        let agency_text = agency_resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if !agency_status.is_success() {
            return Err(sanitize_db_error(agency_status.as_u16(), agency_text));
        }
        let agency_rows: Vec<serde_json::Value> =
            serde_json::from_str(&agency_text).unwrap_or_default();
        let row = agency_rows.first().cloned().ok_or((
            StatusCode::NOT_FOUND,
            "marketplace profile not found".to_string(),
        ))?;
        response["profile"] = row;

        if user.role == "brand" {
            let mut connection_table_available = true;
            let connected_resp = state
                .pg
                .from("brand_agency_connections")
                .select("id")
                .eq("brand_id", &user.id)
                .eq("agency_id", &profile_id)
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
                    return Ok(Json(response));
                }
            } else if !is_missing_relation_error(&connected_text, "brand_agency_connections") {
                return Err(sanitize_db_error(connected_status.as_u16(), connected_text));
            } else {
                connection_table_available = false;
            }

            let invite_resp = state
                .pg
                .from("brand_agency_connection_requests")
                .select("status")
                .eq("brand_id", &user.id)
                .eq("agency_id", &profile_id)
                .order("created_at.desc")
                .limit(1)
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let invite_status = invite_resp.status();
            let invite_text = invite_resp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            if invite_status.is_success() {
                let rows: Vec<serde_json::Value> =
                    serde_json::from_str(&invite_text).unwrap_or_default();
                if let Some(status) = rows
                    .first()
                    .and_then(|r| r.get("status"))
                    .and_then(|v| v.as_str())
                {
                    response["connection_status"] = serde_json::json!(match status {
                        "accepted" if !connection_table_available => "connected",
                        "pending" => "waiting",
                        "declined" => "declined",
                        _ => "none",
                    });
                }
            } else if !is_missing_relation_error(&invite_text, "brand_agency_connection_requests") {
                return Err(sanitize_db_error(invite_status.as_u16(), invite_text));
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
    RoleGuard::new(vec!["agency", "brand"]).check(&user.role)?;
    let profile_type = payload.profile_type.trim().to_lowercase();
    let target_id = payload.target_id.trim();
    if target_id.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "missing target_id".to_string()));
    }

    if profile_type == "creator" {
        let creator_id = target_id.to_string();

        if user.role == "brand" {
            let effective_brand_id = resolve_effective_brand_id(&state, &user).await?;

            let creator_exists_resp = state
                .pg
                .from("creators")
                .select("id")
                .eq("id", &creator_id)
                .eq("kyc_status", "approved")
                .limit(1)
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let creator_exists_status = creator_exists_resp.status();
            let creator_exists_text = creator_exists_resp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            if !creator_exists_status.is_success() {
                return Err(sanitize_db_error(
                    creator_exists_status.as_u16(),
                    creator_exists_text,
                ));
            }
            let creator_exists_rows: Vec<serde_json::Value> =
                serde_json::from_str(&creator_exists_text).unwrap_or_default();
            if creator_exists_rows.is_empty() {
                return Err((StatusCode::NOT_FOUND, "creator not found".to_string()));
            }

            let connected_resp = state
                .pg
                .from("brand_creator_connections")
                .select("id")
                .eq("brand_id", &effective_brand_id)
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
                let connected_rows: Vec<serde_json::Value> =
                    serde_json::from_str(&connected_text).unwrap_or_default();
                if !connected_rows.is_empty() {
                    return Ok(Json(serde_json::json!({"status":"connected"})));
                }
            } else if !is_missing_relation_error(&connected_text, "brand_creator_connections") {
                return Err(sanitize_db_error(connected_status.as_u16(), connected_text));
            }

            let existing_resp = state
                .pg
                .from("brand_creator_connection_requests")
                .select("id,status")
                .eq("brand_id", &effective_brand_id)
                .eq("creator_id", &creator_id)
                .order("created_at.desc")
                .limit(1)
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let existing_status = existing_resp.status();
            let existing_text = existing_resp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            if !existing_status.is_success() {
                if is_missing_relation_error(&existing_text, "brand_creator_connection_requests") {
                    return Err((
                        StatusCode::SERVICE_UNAVAILABLE,
                        serde_json::json!({
                            "error": "Creator connections are temporarily unavailable.",
                            "details": "Please apply the latest marketplace migration and try again."
                        })
                        .to_string(),
                    ));
                }
                return Err(sanitize_db_error(existing_status.as_u16(), existing_text));
            }
            let existing_rows: Vec<serde_json::Value> =
                serde_json::from_str(&existing_text).unwrap_or_default();
            if let Some(row) = existing_rows.first() {
                let status = row
                    .get("status")
                    .and_then(|v| v.as_str())
                    .unwrap_or("pending")
                    .to_lowercase();
                if status == "accepted" {
                    return Ok(Json(serde_json::json!({"status":"connected"})));
                }
                if status == "pending" {
                    return Ok(Json(serde_json::json!({"status":"waiting"})));
                }
                let request_id = row
                    .get("id")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                if !request_id.is_empty() && (status == "declined") {
                    let reactivate_resp = state
                        .pg
                        .from("brand_creator_connection_requests")
                        .eq("id", &request_id)
                        .eq("brand_id", &effective_brand_id)
                        .eq("creator_id", &creator_id)
                        .update(
                            serde_json::json!({
                                "status": "pending",
                                "responded_at": serde_json::Value::Null,
                                "message": payload
                                    .message
                                    .as_ref()
                                    .map(|m| m.trim().to_string())
                                    .filter(|m| !m.is_empty()),
                                "updated_at": chrono::Utc::now().to_rfc3339(),
                            })
                            .to_string(),
                        )
                        .execute()
                        .await
                        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
                    let reactivate_status = reactivate_resp.status();
                    let reactivate_text = reactivate_resp
                        .text()
                        .await
                        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
                    if !reactivate_status.is_success() {
                        return Err(sanitize_db_error(
                            reactivate_status.as_u16(),
                            reactivate_text,
                        ));
                    }
                    return Ok(Json(serde_json::json!({"status":"waiting"})));
                }
            }

            let create_resp = state
                .pg
                .from("brand_creator_connection_requests")
                .insert(
                    serde_json::json!({
                        "brand_id": effective_brand_id,
                        "creator_id": creator_id,
                        "status": "pending",
                        "message": payload
                            .message
                            .as_ref()
                            .map(|m| m.trim().to_string())
                            .filter(|m| !m.is_empty()),
                    })
                    .to_string(),
                )
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
                            return Ok(Json(serde_json::json!({"status":"waiting"})));
                        }
                    }
                }
                return Err(sanitize_db_error(create_status.as_u16(), create_text));
            }

            return Ok(Json(serde_json::json!({"status":"waiting"})));
        }

        if user.role != "agency" {
            return Err((
                StatusCode::FORBIDDEN,
                "Only agencies and brands can connect with creators".to_string(),
            ));
        }
        let effective_agency_id = resolve_effective_agency_id(&state, &user).await?;

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
            let invite_id = row
                .get("id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .unwrap_or_default();
            let invite_status = row
                .get("status")
                .and_then(|v| v.as_str())
                .unwrap_or("pending")
                .to_lowercase();
            if invite_status == "accepted" || invite_status == "declined" {
                if invite_id.is_empty() {
                    return Err((
                        StatusCode::INTERNAL_SERVER_ERROR,
                        "invalid invite state: missing id".to_string(),
                    ));
                }

                let reactivate_payload = serde_json::json!({
                    "status": "pending",
                    "responded_at": serde_json::Value::Null,
                    "updated_at": chrono::Utc::now().to_rfc3339(),
                });
                let reactivate_resp = state
                    .pg
                    .from("creator_agency_invites")
                    .eq("id", &invite_id)
                    .eq("agency_id", &effective_agency_id)
                    .eq("creator_id", &creator_id)
                    .update(reactivate_payload.to_string())
                    .execute()
                    .await
                    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
                let reactivate_status = reactivate_resp.status();
                let reactivate_text = reactivate_resp
                    .text()
                    .await
                    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
                if !reactivate_status.is_success() {
                    return Err(sanitize_db_error(
                        reactivate_status.as_u16(),
                        reactivate_text,
                    ));
                }

                return Ok(Json(serde_json::json!({"status":"pending"})));
            }
            return Ok(Json(serde_json::json!({"status":"pending"})));
        }

        let insert_payload = serde_json::json!({
            "agency_id": effective_agency_id,
            "creator_id": creator_id,
            "status": "pending",
        });

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

        return Ok(Json(serde_json::json!({"status":"pending"})));
    }

    if profile_type != "agency" {
        return Err((StatusCode::BAD_REQUEST, "invalid profile_type".to_string()));
    }

    if user.role != "brand" {
        return Err((
            StatusCode::FORBIDDEN,
            "Only brands can connect with agencies".to_string(),
        ));
    }

    let agency_id = target_id.to_string();
    let agency_exists_resp = state
        .pg
        .from("agencies")
        .select("id")
        .eq("id", &agency_id)
        .eq("kyc_status", "approved")
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let agency_exists_status = agency_exists_resp.status();
    let agency_exists_text = agency_exists_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !agency_exists_status.is_success() {
        return Err(sanitize_db_error(
            agency_exists_status.as_u16(),
            agency_exists_text,
        ));
    }
    let agency_exists_rows: Vec<serde_json::Value> =
        serde_json::from_str(&agency_exists_text).unwrap_or_default();
    if agency_exists_rows.is_empty() {
        return Err((StatusCode::NOT_FOUND, "agency not found".to_string()));
    }

    let active_connection_resp = state
        .pg
        .from("brand_agency_connections")
        .select("id")
        .eq("brand_id", &user.id)
        .eq("agency_id", &agency_id)
        .eq("status", "active")
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let active_connection_status = active_connection_resp.status();
    let active_connection_text = active_connection_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let mut connection_table_available = true;
    if !active_connection_status.is_success() {
        if is_missing_relation_error(&active_connection_text, "brand_agency_connections") {
            connection_table_available = false;
        } else {
            return Err(sanitize_db_error(
                active_connection_status.as_u16(),
                active_connection_text,
            ));
        }
    } else {
        let active_rows: Vec<serde_json::Value> =
            serde_json::from_str(&active_connection_text).unwrap_or_default();
        if !active_rows.is_empty() {
            return Ok(Json(serde_json::json!({"status":"connected"})));
        }
    }

    let existing_resp = state
        .pg
        .from("brand_agency_connection_requests")
        .select("id,status")
        .eq("brand_id", &user.id)
        .eq("agency_id", &agency_id)
        .order("created_at.desc")
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let existing_status = existing_resp.status();
    let existing_text = existing_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !existing_status.is_success() {
        if is_missing_relation_error(&existing_text, "brand_agency_connection_requests") {
            return Err((
                StatusCode::SERVICE_UNAVAILABLE,
                serde_json::json!({
                    "error": "Agency connections are temporarily unavailable.",
                    "details": "Please apply the latest marketplace migration and try again."
                })
                .to_string(),
            ));
        }
        return Err(sanitize_db_error(existing_status.as_u16(), existing_text));
    }
    let existing_rows: Vec<serde_json::Value> =
        serde_json::from_str(&existing_text).unwrap_or_default();

    if let Some(row) = existing_rows.first() {
        let invite_status = row
            .get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("pending")
            .to_lowercase();
        if invite_status == "accepted" {
            if connection_table_available {
                let _ = state
                    .pg
                    .from("brand_agency_connections")
                    .upsert(
                        serde_json::json!({
                            "brand_id": user.id,
                            "agency_id": agency_id,
                            "status": "active",
                            "connected_at": chrono::Utc::now().to_rfc3339(),
                            "disconnected_at": serde_json::Value::Null,
                            "updated_at": chrono::Utc::now().to_rfc3339(),
                        })
                        .to_string(),
                    )
                    .on_conflict("brand_id,agency_id")
                    .execute()
                    .await;
            }
            return Ok(Json(serde_json::json!({"status":"connected"})));
        }
        if invite_status == "pending" {
            return Ok(Json(serde_json::json!({"status":"waiting"})));
        }

        let invite_id = row
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        if !invite_id.is_empty() && (invite_status == "declined") {
            let reactivate_payload = serde_json::json!({
                "status": "pending",
                "responded_at": serde_json::Value::Null,
                "message": payload
                    .message
                    .as_ref()
                    .map(|m| m.trim().to_string())
                    .filter(|m| !m.is_empty()),
                "updated_at": chrono::Utc::now().to_rfc3339(),
            });
            let reactivate_resp = state
                .pg
                .from("brand_agency_connection_requests")
                .eq("id", &invite_id)
                .eq("brand_id", &user.id)
                .eq("agency_id", &agency_id)
                .update(reactivate_payload.to_string())
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let reactivate_status = reactivate_resp.status();
            let reactivate_text = reactivate_resp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            if !reactivate_status.is_success() {
                return Err(sanitize_db_error(
                    reactivate_status.as_u16(),
                    reactivate_text,
                ));
            }
            return Ok(Json(serde_json::json!({"status":"waiting"})));
        }
    }

    let insert_payload = serde_json::json!({
        "brand_id": user.id,
        "agency_id": agency_id,
        "status": "pending",
        "message": payload
            .message
            .as_ref()
            .map(|m| m.trim().to_string())
            .filter(|m| !m.is_empty()),
    });
    let create_resp = state
        .pg
        .from("brand_agency_connection_requests")
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
        if is_missing_relation_error(&create_text, "brand_agency_connection_requests") {
            return Err((
                StatusCode::SERVICE_UNAVAILABLE,
                serde_json::json!({
                    "error": "Agency connections are temporarily unavailable.",
                    "details": "Please apply the latest marketplace migration and try again."
                })
                .to_string(),
            ));
        }
        if create_status.as_u16() == StatusCode::CONFLICT.as_u16() {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&create_text) {
                if v.get("code")
                    .and_then(|c| c.as_str())
                    .map(|c| c == "23505")
                    .unwrap_or(false)
                {
                    return Ok(Json(serde_json::json!({"status":"waiting"})));
                }
            }
        }
        return Err(sanitize_db_error(create_status.as_u16(), create_text));
    }

    Ok(Json(serde_json::json!({"status":"waiting"})))
}

pub async fn list_brand_connected_agencies(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    RoleGuard::new(vec!["brand"]).check(&user.role)?;

    let resp = state
        .pg
        .from("brand_agency_connections")
        .select("agency_id,connected_at,updated_at,agencies!inner(id,agency_name,contact_name,email,website,agency_type,city,state,country,logo_url,kyc_status)")
        .eq("brand_id", &user.id)
        .eq("status", "active")
        .order("updated_at.desc")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let rows: Vec<serde_json::Value> = if status.is_success() {
        serde_json::from_str(&text).unwrap_or_default()
    } else if is_missing_relation_error(&text, "brand_agency_connections") {
        let fallback_resp = state
            .pg
            .from("brand_agency_connection_requests")
            .select("agency_id,updated_at,agencies!inner(id,agency_name,contact_name,email,website,agency_type,city,state,country,logo_url,kyc_status)")
            .eq("brand_id", &user.id)
            .eq("status", "accepted")
            .order("updated_at.desc")
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let fallback_status = fallback_resp.status();
        let fallback_text = fallback_resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if !fallback_status.is_success() {
            if is_missing_relation_error(&fallback_text, "brand_agency_connection_requests") {
                return Ok(Json(serde_json::json!({
                    "status": "ok",
                    "agencies": [],
                })));
            }
            return Err(sanitize_db_error(fallback_status.as_u16(), fallback_text));
        }
        serde_json::from_str(&fallback_text).unwrap_or_default()
    } else {
        return Err(sanitize_db_error(status.as_u16(), text));
    };

    let mut out: Vec<serde_json::Value> = Vec::new();
    for row in rows {
        let Some(agency) = row.get("agencies") else {
            continue;
        };
        let kyc_status = agency
            .get("kyc_status")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_lowercase();
        if kyc_status != "approved" {
            continue;
        }

        let city = agency.get("city").and_then(|v| v.as_str()).unwrap_or("");
        let state = agency.get("state").and_then(|v| v.as_str()).unwrap_or("");
        let country = agency.get("country").and_then(|v| v.as_str()).unwrap_or("");
        let location = if !city.is_empty() && !state.is_empty() {
            format!("{city}, {state}")
        } else if !city.is_empty() {
            city.to_string()
        } else if !state.is_empty() {
            state.to_string()
        } else {
            country.to_string()
        };

        out.push(serde_json::json!({
            "id": agency.get("id").cloned().unwrap_or(serde_json::Value::Null),
            "agency_id": row.get("agency_id").cloned().unwrap_or(serde_json::Value::Null),
            "display_name": agency.get("agency_name").cloned().unwrap_or(serde_json::Value::Null),
            "agency_name": agency.get("agency_name").cloned().unwrap_or(serde_json::Value::Null),
            "contact_name": agency.get("contact_name").cloned().unwrap_or(serde_json::Value::Null),
            "email": agency.get("email").cloned().unwrap_or(serde_json::Value::Null),
            "website": agency.get("website").cloned().unwrap_or(serde_json::Value::Null),
            "agency_type": agency.get("agency_type").cloned().unwrap_or(serde_json::Value::Null),
            "location": location,
            "logo_url": agency.get("logo_url").cloned().unwrap_or(serde_json::Value::Null),
            "connected_at": row
                .get("connected_at")
                .cloned()
                .or_else(|| row.get("updated_at").cloned())
                .unwrap_or(serde_json::Value::Null),
            "connection_status": "connected",
        }));
    }

    Ok(Json(serde_json::json!({
        "status": "ok",
        "agencies": out,
    })))
}

pub async fn list_agency_brand_connection_requests(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    RoleGuard::new(vec!["agency"]).check(&user.role)?;
    let effective_agency_id = resolve_effective_agency_id(&state, &user).await?;

    let resp = state
        .pg
        .from("brand_agency_connection_requests")
        .select(
            "id,brand_id,agency_id,status,message,created_at,updated_at,brands(company_name,email)",
        )
        .eq("agency_id", &effective_agency_id)
        .eq("status", "pending")
        .order("created_at.desc")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        if is_missing_relation_error(&text, "brand_agency_connection_requests") {
            return Ok(Json(serde_json::json!({
                "status": "ok",
                "requests": [],
            })));
        }
        return Err(sanitize_db_error(status.as_u16(), text));
    }
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();

    Ok(Json(serde_json::json!({
        "status": "ok",
        "requests": rows,
    })))
}

pub async fn list_agency_brand_connections(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    RoleGuard::new(vec!["agency"]).check(&user.role)?;
    let effective_agency_id = resolve_effective_agency_id(&state, &user).await?;

    let resp = state
        .pg
        .from("brand_agency_connections")
        .select("id,brand_id,agency_id,status,connected_at,updated_at,brands(company_name,email)")
        .eq("agency_id", &effective_agency_id)
        .eq("status", "active")
        .order("updated_at.desc")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        if is_missing_relation_error(&text, "brand_agency_connections") {
            return Ok(Json(serde_json::json!({
                "status": "ok",
                "connections": [],
            })));
        }
        return Err(sanitize_db_error(status.as_u16(), text));
    }
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();

    Ok(Json(serde_json::json!({
        "status": "ok",
        "connections": rows,
    })))
}

pub async fn accept_agency_brand_connection_request(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    RoleGuard::new(vec!["agency"]).check(&user.role)?;
    let effective_agency_id = resolve_effective_agency_id(&state, &user).await?;

    let pending_resp = state
        .pg
        .from("brand_agency_connection_requests")
        .select("id,brand_id,agency_id")
        .eq("id", &id)
        .eq("agency_id", &effective_agency_id)
        .eq("status", "pending")
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = pending_resp.status();
    let text = pending_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        return Err(sanitize_db_error(status.as_u16(), text));
    }
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    let Some(row) = rows.first() else {
        return Err((
            StatusCode::NOT_FOUND,
            "connection request not found".to_string(),
        ));
    };
    let brand_id = row
        .get("brand_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    if brand_id.is_empty() {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            "invalid request data".to_string(),
        ));
    }

    let update_resp = state
        .pg
        .from("brand_agency_connection_requests")
        .eq("id", &id)
        .eq("agency_id", &effective_agency_id)
        .eq("status", "pending")
        .update(
            serde_json::json!({
                "status": "accepted",
                "responded_at": chrono::Utc::now().to_rfc3339(),
                "updated_at": chrono::Utc::now().to_rfc3339(),
            })
            .to_string(),
        )
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let update_status = update_resp.status();
    let update_text = update_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !update_status.is_success() {
        return Err(sanitize_db_error(update_status.as_u16(), update_text));
    }

    let connect_payload = serde_json::json!({
        "brand_id": brand_id,
        "agency_id": effective_agency_id,
        "status": "active",
        "connected_at": chrono::Utc::now().to_rfc3339(),
        "disconnected_at": serde_json::Value::Null,
        "updated_at": chrono::Utc::now().to_rfc3339(),
    });
    let connect_resp = state
        .pg
        .from("brand_agency_connections")
        .upsert(connect_payload.to_string())
        .on_conflict("brand_id,agency_id")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let connect_status = connect_resp.status();
    let connect_text = connect_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !connect_status.is_success() {
        if !is_missing_relation_error(&connect_text, "brand_agency_connections") {
            return Err(sanitize_db_error(connect_status.as_u16(), connect_text));
        }
    }

    Ok(Json(serde_json::json!({"status":"ok"})))
}

pub async fn decline_agency_brand_connection_request(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    RoleGuard::new(vec!["agency"]).check(&user.role)?;
    let effective_agency_id = resolve_effective_agency_id(&state, &user).await?;

    let resp = state
        .pg
        .from("brand_agency_connection_requests")
        .eq("id", &id)
        .eq("agency_id", &effective_agency_id)
        .eq("status", "pending")
        .update(
            serde_json::json!({
                "status": "declined",
                "responded_at": chrono::Utc::now().to_rfc3339(),
                "updated_at": chrono::Utc::now().to_rfc3339(),
            })
            .to_string(),
        )
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

    Ok(Json(serde_json::json!({"status":"ok"})))
}

pub async fn disconnect_brand_agency_connection_as_brand(
    State(state): State<AppState>,
    user: AuthUser,
    Path(agency_id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    RoleGuard::new(vec!["brand"]).check(&user.role)?;

    let resp = state
        .pg
        .from("brand_agency_connections")
        .eq("brand_id", &user.id)
        .eq("agency_id", &agency_id)
        .eq("status", "active")
        .update(
            serde_json::json!({
                "status": "disconnected",
                "disconnected_at": chrono::Utc::now().to_rfc3339(),
                "updated_at": chrono::Utc::now().to_rfc3339(),
            })
            .to_string(),
        )
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

    Ok(Json(serde_json::json!({"status":"ok"})))
}

pub async fn disconnect_brand_agency_connection_as_agency(
    State(state): State<AppState>,
    user: AuthUser,
    Path(brand_id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    RoleGuard::new(vec!["agency"]).check(&user.role)?;
    let effective_agency_id = resolve_effective_agency_id(&state, &user).await?;

    let resp = state
        .pg
        .from("brand_agency_connections")
        .eq("brand_id", &brand_id)
        .eq("agency_id", &effective_agency_id)
        .eq("status", "active")
        .update(
            serde_json::json!({
                "status": "disconnected",
                "disconnected_at": chrono::Utc::now().to_rfc3339(),
                "updated_at": chrono::Utc::now().to_rfc3339(),
            })
            .to_string(),
        )
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

    Ok(Json(serde_json::json!({"status":"ok"})))
}

pub async fn list_creator_brand_connection_requests(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    RoleGuard::new(vec!["creator", "talent"]).check(&user.role)?;
    let creator_id = resolve_effective_creator_id(&state, &user).await?;
    let creator_id_candidates: Vec<String> = if creator_id == user.id {
        vec![creator_id.clone()]
    } else {
        vec![creator_id.clone(), user.id.clone()]
    };
    let creator_id_refs: Vec<&str> = creator_id_candidates.iter().map(|s| s.as_str()).collect();

    let resp = state
        .pg
        .from("brand_creator_connection_requests")
        .select("id,brand_id,creator_id,status,message,created_at,updated_at,brands(company_name,email)")
        .in_("creator_id", creator_id_refs)
        .eq("status", "pending")
        .order("created_at.desc")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        if is_missing_relation_error(&text, "brand_creator_connection_requests") {
            return Ok(Json(serde_json::json!({
                "status": "ok",
                "requests": [],
            })));
        }
        return Err(sanitize_db_error(status.as_u16(), text));
    }
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    Ok(Json(serde_json::json!({
        "status": "ok",
        "requests": rows,
    })))
}

pub async fn list_creator_brand_connections(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    RoleGuard::new(vec!["creator", "talent"]).check(&user.role)?;
    let creator_id = resolve_effective_creator_id(&state, &user).await?;
    let creator_id_candidates: Vec<String> = if creator_id == user.id {
        vec![creator_id.clone()]
    } else {
        vec![creator_id.clone(), user.id.clone()]
    };
    let creator_id_refs: Vec<&str> = creator_id_candidates.iter().map(|s| s.as_str()).collect();

    let resp = state
        .pg
        .from("brand_creator_connections")
        .select("id,brand_id,creator_id,status,connected_at,updated_at,brands(company_name,email)")
        .in_("creator_id", creator_id_refs)
        .eq("status", "active")
        .order("updated_at.desc")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        if is_missing_relation_error(&text, "brand_creator_connections") {
            return Ok(Json(serde_json::json!({
                "status": "ok",
                "connections": [],
            })));
        }
        return Err(sanitize_db_error(status.as_u16(), text));
    }
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    Ok(Json(serde_json::json!({
        "status": "ok",
        "connections": rows,
    })))
}

pub async fn accept_creator_brand_connection_request(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    RoleGuard::new(vec!["creator", "talent"]).check(&user.role)?;
    let creator_id = resolve_effective_creator_id(&state, &user).await?;
    let creator_id_candidates: Vec<String> = if creator_id == user.id {
        vec![creator_id.clone()]
    } else {
        vec![creator_id.clone(), user.id.clone()]
    };
    let creator_id_refs: Vec<&str> = creator_id_candidates.iter().map(|s| s.as_str()).collect();

    let pending_resp = state
        .pg
        .from("brand_creator_connection_requests")
        .select("id,brand_id,creator_id")
        .eq("id", &id)
        .in_("creator_id", creator_id_refs.clone())
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
    if !pending_status.is_success() {
        return Err(sanitize_db_error(pending_status.as_u16(), pending_text));
    }
    let rows: Vec<serde_json::Value> = serde_json::from_str(&pending_text).unwrap_or_default();
    let Some(row) = rows.first() else {
        return Err((
            StatusCode::NOT_FOUND,
            "connection request not found".to_string(),
        ));
    };
    let brand_id = row
        .get("brand_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let row_creator_id = row
        .get("creator_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    if brand_id.is_empty() {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            "invalid request data".to_string(),
        ));
    }
    if row_creator_id.is_empty() {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            "invalid request data".to_string(),
        ));
    }

    let update_resp = state
        .pg
        .from("brand_creator_connection_requests")
        .eq("id", &id)
        .in_("creator_id", creator_id_refs)
        .eq("status", "pending")
        .update(
            serde_json::json!({
                "status": "accepted",
                "responded_at": chrono::Utc::now().to_rfc3339(),
                "updated_at": chrono::Utc::now().to_rfc3339(),
            })
            .to_string(),
        )
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let update_status = update_resp.status();
    let update_text = update_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !update_status.is_success() {
        return Err(sanitize_db_error(update_status.as_u16(), update_text));
    }

    let connect_resp = state
        .pg
        .from("brand_creator_connections")
        .upsert(
            serde_json::json!({
                "brand_id": brand_id,
                "creator_id": row_creator_id,
                "status": "active",
                "connected_at": chrono::Utc::now().to_rfc3339(),
                "disconnected_at": serde_json::Value::Null,
                "updated_at": chrono::Utc::now().to_rfc3339(),
            })
            .to_string(),
        )
        .on_conflict("brand_id,creator_id")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let connect_status = connect_resp.status();
    let connect_text = connect_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !connect_status.is_success()
        && !is_missing_relation_error(&connect_text, "brand_creator_connections")
    {
        return Err(sanitize_db_error(connect_status.as_u16(), connect_text));
    }

    Ok(Json(serde_json::json!({"status":"ok"})))
}

pub async fn decline_creator_brand_connection_request(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    RoleGuard::new(vec!["creator", "talent"]).check(&user.role)?;
    let creator_id = resolve_effective_creator_id(&state, &user).await?;
    let creator_id_candidates: Vec<String> = if creator_id == user.id {
        vec![creator_id.clone()]
    } else {
        vec![creator_id.clone(), user.id.clone()]
    };
    let creator_id_refs: Vec<&str> = creator_id_candidates.iter().map(|s| s.as_str()).collect();

    let resp = state
        .pg
        .from("brand_creator_connection_requests")
        .eq("id", &id)
        .in_("creator_id", creator_id_refs)
        .eq("status", "pending")
        .update(
            serde_json::json!({
                "status": "declined",
                "responded_at": chrono::Utc::now().to_rfc3339(),
                "updated_at": chrono::Utc::now().to_rfc3339(),
            })
            .to_string(),
        )
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

    Ok(Json(serde_json::json!({"status":"ok"})))
}

pub async fn disconnect_creator_brand_connection(
    State(state): State<AppState>,
    user: AuthUser,
    Path(brand_id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    RoleGuard::new(vec!["creator", "talent"]).check(&user.role)?;
    let creator_id = resolve_effective_creator_id(&state, &user).await?;
    let creator_id_candidates: Vec<String> = if creator_id == user.id {
        vec![creator_id.clone()]
    } else {
        vec![creator_id.clone(), user.id.clone()]
    };
    let creator_id_refs: Vec<&str> = creator_id_candidates.iter().map(|s| s.as_str()).collect();

    let resp = state
        .pg
        .from("brand_creator_connections")
        .eq("brand_id", &brand_id)
        .in_("creator_id", creator_id_refs)
        .eq("status", "active")
        .update(
            serde_json::json!({
                "status": "disconnected",
                "disconnected_at": chrono::Utc::now().to_rfc3339(),
                "updated_at": chrono::Utc::now().to_rfc3339(),
            })
            .to_string(),
        )
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

    Ok(Json(serde_json::json!({"status":"ok"})))
}

pub async fn create_brand_licensing_request(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<BrandLicensingRequestPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    RoleGuard::new(vec!["brand"]).check(&user.role)?;

    let agency_id = payload.agency_id.trim().to_string();
    let creator_id = payload.creator_id.trim().to_string();
    let campaign_title = payload.campaign_title.trim().to_string();
    if agency_id.is_empty() || creator_id.is_empty() || campaign_title.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "agency_id, creator_id and campaign_title are required".to_string(),
        ));
    }

    let duration_days = payload.duration_days.unwrap_or(30).max(1).min(3650);
    let usage_scope = payload.usage_scope.unwrap_or_default().trim().to_string();
    let territory = payload
        .territory
        .unwrap_or_else(|| "Global".to_string())
        .trim()
        .to_string();

    let connected_resp = state
        .pg
        .from("brand_agency_connections")
        .select("id")
        .eq("brand_id", &user.id)
        .eq("agency_id", &agency_id)
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
    let connected_rows: Vec<serde_json::Value> = if connected_status.is_success() {
        serde_json::from_str(&connected_text).unwrap_or_default()
    } else if is_missing_relation_error(&connected_text, "brand_agency_connections") {
        let fallback_resp = state
            .pg
            .from("brand_agency_connection_requests")
            .select("id")
            .eq("brand_id", &user.id)
            .eq("agency_id", &agency_id)
            .eq("status", "accepted")
            .limit(1)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let fallback_status = fallback_resp.status();
        let fallback_text = fallback_resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if !fallback_status.is_success() {
            return Err(sanitize_db_error(fallback_status.as_u16(), fallback_text));
        }
        serde_json::from_str(&fallback_text).unwrap_or_default()
    } else {
        return Err(sanitize_db_error(connected_status.as_u16(), connected_text));
    };
    if connected_rows.is_empty() {
        return Err((
            StatusCode::FORBIDDEN,
            "You can only request licenses from connected agencies.".to_string(),
        ));
    }

    let talent_resp = state
        .pg
        .from("agency_users")
        .select("id,full_legal_name,stage_name")
        .eq("agency_id", &agency_id)
        .eq("creator_id", &creator_id)
        .eq("status", "active")
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
    let talent = talent_rows.first().ok_or((
        StatusCode::BAD_REQUEST,
        "Creator is not in this agency roster.".to_string(),
    ))?;
    let talent_id = talent
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    if talent_id.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Invalid talent mapping".to_string(),
        ));
    }
    let talent_name = talent
        .get("full_legal_name")
        .or_else(|| talent.get("stage_name"))
        .and_then(|v| v.as_str())
        .unwrap_or("Talent")
        .to_string();

    let start_date = chrono::Utc::now().date_naive();
    let end_date = start_date + chrono::Duration::days(duration_days);

    let details_json = serde_json::json!({
        "source": "brand_campaign_dashboard",
        "category": payload.category.as_ref().map(|v| v.trim()).filter(|v| !v.is_empty()),
        "description": payload.description.as_ref().map(|v| v.trim()).filter(|v| !v.is_empty()),
        "exclusivity": payload.exclusivity.as_ref().map(|v| v.trim()).filter(|v| !v.is_empty()),
        "custom_terms": payload.custom_terms.as_ref().map(|v| v.trim()).filter(|v| !v.is_empty()),
        "modifications_allowed": payload
            .modifications_allowed
            .as_ref()
            .map(|v| v.trim())
            .filter(|v| !v.is_empty()),
        "offer_amount": payload.offer_amount,
    });

    let insert_payload = serde_json::json!({
        "agency_id": agency_id,
        "brand_id": user.id,
        "talent_id": talent_id,
        "status": "pending",
        "campaign_title": campaign_title,
        "talent_name": talent_name,
        "usage_scope": usage_scope,
        "regions": territory,
        "license_start_date": start_date.to_string(),
        "license_end_date": end_date.to_string(),
        "deadline": end_date.to_string(),
        "notes": details_json.to_string(),
    });

    let create_resp = state
        .pg
        .from("licensing_requests")
        .insert(insert_payload.to_string())
        .select("id")
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let create_status = create_resp.status();
    let create_text = create_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !create_status.is_success() {
        return Err(sanitize_db_error(create_status.as_u16(), create_text));
    }
    let created: serde_json::Value = serde_json::from_str(&create_text).unwrap_or_default();

    Ok(Json(serde_json::json!({
        "status": "ok",
        "licensing_request_id": created.get("id").cloned().unwrap_or(serde_json::Value::Null),
    })))
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
