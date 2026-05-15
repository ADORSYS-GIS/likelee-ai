use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use serde_json::json;
use uuid::Uuid;

use crate::{auth::AuthUser, state::AppState};


use super::*;

pub async fn resolve_effective_creator_id(
    state: &AppState,
    user: &AuthUser,
) -> Result<String, (StatusCode, String)> {
    if user.role != "talent" {
        return Ok(user.id.clone());
    }

    pub fn is_missing_user_id_column(text: &str) -> bool {
        let lower = text.to_lowercase();
        if !(lower.contains("user_id")
            && (lower.contains("not found")
                || lower.contains("does not exist")
                || lower.contains("schema cache")))
        {
            // try Postgres undefined_column code (42703) when error is JSON
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(text) {
                if v.get("code").and_then(|c| c.as_str()) == Some("42703") {
                    return true;
                }
            }
            return false;
        }
        true
    }

    pub async fn fetch_creator_id(
        state: &AppState,
        field: &str,
        value: &str,
    ) -> Result<Option<String>, (StatusCode, String)> {
        let resp = state
            .pg
            .from("agency_users")
            .select("creator_id")
            .eq(field, value)
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
            return Err((status, text));
        }

        let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
        Ok(rows
            .first()
            .and_then(|r| r.get("creator_id"))
            .and_then(|v| v.as_str())
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty()))
    }

    // Prefer mapping via agency_users.user_id when the column exists; fall back to agency_users.id.
    // Some deployments do not have user_id on agency_users, so we treat missing-column errors
    // as a signal to fall back.
    let mapped = match fetch_creator_id(state, "user_id", &user.id).await {
        Ok(value) => value,
        Err((status, text)) => {
            if is_missing_user_id_column(&text) {
                None
            } else {
                let (code, msg) = crate::errors::sanitize_db_error(status.as_u16(), text);
                return Err((code, msg));
            }
        }
    };

    let mapped = if mapped.is_some() {
        mapped
    } else {
        match fetch_creator_id(state, "id", &user.id).await {
            Ok(value) => value,
            Err((status, text)) => {
                let (code, msg) = crate::errors::sanitize_db_error(status.as_u16(), text);
                return Err((code, msg));
            }
        }
    };

    Ok(mapped.unwrap_or_else(|| user.id.clone()))
}

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------


