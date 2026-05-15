use crate::agencies::talent_refs::list_agency_talent_refs;
use crate::{
    auth::AuthUser,
    state::AppState,
    team::{permissions::Permission, require_agency_permission},
};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tracing::info;



use super::*;

pub async fn generate_signed_url(
    state: &crate::state::AppState,
    bucket: &str,
    path: &str,
) -> Option<String> {
    crate::storage::generate_signed_url(state, bucket, path, 86_400)
        .await
        .ok()
}

