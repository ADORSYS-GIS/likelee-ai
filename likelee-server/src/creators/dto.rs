use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct EmailQuery {
    pub email: String,
}

#[derive(Serialize)]
pub struct EmailAvailability {
    pub available: bool,
}

#[derive(Deserialize)]
pub struct PhotoUploadQuery {
    pub user_id: String,
}

/// Handles the profile photo upload and updates the user's profile.
#[derive(Deserialize, Debug)]
pub struct FaceSearchQuery {
    pub age_min: Option<i32>,
    pub age_max: Option<i32>,
    pub race: Option<String>,
    pub hair_color: Option<String>,
    pub hairstyle: Option<String>,
    pub eye_color: Option<String>,
    pub height_min_cm: Option<i32>,
    pub height_max_cm: Option<i32>,
    pub weight_min_kg: Option<i32>,
    pub weight_max_kg: Option<i32>,
    // Comma-separated features (best-effort, applied client-side if present)
    pub features: Option<String>,
    pub page: Option<u32>,
    pub page_size: Option<u32>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FaceSummary {
    pub id: String,
    pub full_name: Option<String>,
    pub profile_photo_url: Option<String>,
    pub age: Option<i32>,
    pub race: Option<String>,
    pub hair_color: Option<String>,
    pub hairstyle: Option<String>,
    pub eye_color: Option<String>,
    pub height_cm: Option<i32>,
    pub weight_kg: Option<i32>,
    pub facial_features: Option<Vec<String>>,
}

#[derive(Serialize)]
pub struct FaceSearchResponse {
    pub items: Vec<FaceSummary>,
    pub page: u32,
    pub page_size: u32,
}
