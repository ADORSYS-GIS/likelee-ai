use crate::config::AppState;
use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
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

pub async fn search_faces(
    State(state): State<AppState>,
    Query(q): Query<SearchFacesQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let mut request = state.pg.from("creators").select("*").eq("role", "creator");

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

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let rows: serde_json::Value = serde_json::from_str(&text).unwrap_or(serde_json::json!([]));

    Ok(Json(rows))
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
