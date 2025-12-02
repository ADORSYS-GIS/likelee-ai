use crate::config::AppState;
use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use tracing::warn;

pub async fn upsert_profile(
    State(state): State<AppState>,
    Json(mut body): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let email = body
        .get("email")
        .and_then(|v| v.as_str())
        .ok_or((StatusCode::BAD_REQUEST, "missing email".to_string()))?
        .to_string();
    let now = chrono::Utc::now().to_rfc3339();
    if body.get("updated_date").is_none() {
        body["updated_date"] = serde_json::Value::String(now.clone());
    }

    let exists = match state
        .pg
        .from("profiles")
        .select("id")
        .eq("email", &email)
        .limit(1)
        .execute()
        .await
    {
        Ok(resp) => {
            let text = resp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let rows: serde_json::Value = serde_json::from_str(&text)
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            rows.as_array().map(|a| !a.is_empty()).unwrap_or(false)
        }
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("42703") || (msg.contains("relation") && msg.contains("does not exist"))
            {
                warn!(%msg, "profiles table missing; cannot upsert");
                return Err((
                    StatusCode::PRECONDITION_FAILED,
                    "profiles table missing".into(),
                ));
            }
            return Err((StatusCode::INTERNAL_SERVER_ERROR, msg));
        }
    };

    let body_str =
        serde_json::to_string(&body).map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    if exists {
        let resp = state
            .pg
            .from("profiles")
            .eq("email", &email)
            .update(body_str)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let text = resp.text().await.unwrap_or_else(|_| "{}".into());
        let v: serde_json::Value = serde_json::from_str(&text).unwrap_or(serde_json::json!({}));
        Ok(Json(v))
    } else {
        if body.get("created_date").is_none() {
            body["created_date"] = serde_json::Value::String(now);
        }
        let body_str =
            serde_json::to_string(&body).map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
        let resp = state
            .pg
            .from("profiles")
            .insert(body_str)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let text = resp.text().await.unwrap_or_else(|_| "{}".into());
        let v: serde_json::Value = serde_json::from_str(&text).unwrap_or(serde_json::json!({}));
        Ok(Json(v))
    }
}

#[derive(Deserialize)]
pub struct EmailQuery {
    pub email: String,
}
#[derive(Serialize)]
pub struct EmailAvailability {
    pub available: bool,
}

pub async fn check_email(
    State(state): State<AppState>,
    Query(q): Query<EmailQuery>,
) -> Result<Json<EmailAvailability>, (StatusCode, String)> {
    match state
        .pg
        .from("profiles")
        .select("id")
        .eq("email", &q.email)
        .limit(1)
        .execute()
        .await
    {
        Ok(resp) => {
            let text = resp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let rows: serde_json::Value = serde_json::from_str(&text)
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let exists = rows.as_array().map(|a| !a.is_empty()).unwrap_or(false);
            Ok(Json(EmailAvailability { available: !exists }))
        }
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("42703")
                || msg.contains("column") && msg.contains("does not exist")
                || msg.contains("relation") && msg.contains("does not exist")
            {
                warn!(%msg, "profiles table/email column missing; defaulting email available");
                return Ok(Json(EmailAvailability { available: true }));
            }
            Err((StatusCode::INTERNAL_SERVER_ERROR, msg))
        }
    }
}
