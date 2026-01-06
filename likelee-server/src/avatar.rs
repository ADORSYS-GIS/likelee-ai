use crate::auth::AuthUser;
use crate::config::AppState;
use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct GenerateAvatarRequest {
    #[serde(default)]
    pub front_url: Option<String>,
    #[serde(default)]
    pub left_url: Option<String>,
    #[serde(default)]
    pub right_url: Option<String>,
}

#[derive(Serialize)]
pub struct GenerateAvatarResponse {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar_canonical_url: Option<String>,
}

pub async fn generate_avatar(
    _state: State<AppState>,
    _user: AuthUser,
    Json(_req): Json<GenerateAvatarRequest>,
) -> Result<Json<GenerateAvatarResponse>, (StatusCode, String)> {
    Ok(Json(GenerateAvatarResponse {
        avatar_canonical_url: None,
    }))
}
