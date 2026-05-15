use crate::{
    auth::AuthUser,
    state::AppState,
    billing::entitlements::{
        creator_category_limit, creator_has_cameo_uploads, creator_has_likeness_access,
        get_creator_entitlement_tier_for_user, PlanTier,
    },
};
use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use tracing::warn;


use super::*;

pub fn sanitize_db_error(error_text: &str) -> String {
    // Log the full error for debugging
    warn!("Database error: {}", error_text);

    // Return a generic message to clients to avoid exposing internal details
    if error_text.contains("unique constraint") || error_text.contains("duplicate key") {
        "A profile with this information already exists".to_string()
    } else if error_text.contains("foreign key") {
        "Invalid reference in profile data".to_string()
    } else if error_text.contains("not null") || error_text.contains("null value") {
        "Required field is missing".to_string()
    } else if error_text.contains("invalid input") || error_text.contains("malformed") {
        "Invalid data format provided".to_string()
    } else {
        "Failed to save profile. Please try again".to_string()
    }
}


pub fn visibility_maps_to_public_profile(visibility: &str) -> bool {
    matches!(
        visibility.trim().to_lowercase().as_str(),
        "public" | "brands" | "visible_to_brands" | "true"
    )
}


pub fn sync_public_profile_visibility(body: &mut serde_json::Value) {
    let explicit_public_visibility = body.get("public_profile_visible").and_then(|v| v.as_bool());
    let explicit_visibility = body
        .get("visibility")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_lowercase())
        .filter(|s| !s.is_empty());

    if let Some(is_public) = explicit_public_visibility {
        body["public_profile_visible"] = serde_json::Value::Bool(is_public);
        body["visibility"] =
            serde_json::Value::String(if is_public { "brands" } else { "private" }.to_string());
        return;
    }

    if let Some(visibility) = explicit_visibility {
        body["public_profile_visible"] =
            serde_json::Value::Bool(visibility_maps_to_public_profile(&visibility));
    }
}


pub fn normalized_string_array(values: Option<&serde_json::Value>) -> Vec<String> {
    values
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str())
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect::<Vec<_>>()
        })
        .unwrap_or_default()
}


