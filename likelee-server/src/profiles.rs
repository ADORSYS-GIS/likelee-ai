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
        .from("creators")
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
            .from("creators")
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
            .from("creators")
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
        .from("creators")
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

#[derive(Deserialize)]
pub struct PhotoUploadQuery {
    pub user_id: String,
}

/// Handles the profile photo upload and updates the user's profile.
pub async fn upload_profile_photo(
    State(state): State<AppState>,
    Query(q): Query<PhotoUploadQuery>,
    headers: axum::http::HeaderMap,
    body: axum::body::Bytes,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let user_id = q.user_id;
    if user_id.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "user_id is required".to_string()));
    }

    // Validate file size: max 20MB
    const MAX_FILE_SIZE: usize = 20_000_000; // 20MB
    if body.len() > MAX_FILE_SIZE {
        return Err((
            StatusCode::PAYLOAD_TOO_LARGE,
            format!(
                "File size ({} bytes) exceeds maximum allowed size of {} bytes (20MB)",
                body.len(),
                MAX_FILE_SIZE
            ),
        ));
    }

    let ct = headers
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("image/jpeg")
        .to_string();

    let ext = match ct.as_str() {
        "image/png" => "png",
        "image/webp" => "webp",
        _ => "jpg",
    };

    let file_name = format!("profile_{}_{}.{}", user_id, uuid::Uuid::new_v4(), ext);
    let path = format!("{}/profile-photos/{}", user_id, file_name);

    let bucket = state.supabase_bucket_public.clone();
    let storage_url = format!(
        "{}/storage/v1/object/{}/{}",
        state.supabase_url, bucket, path
    );

    let http = reqwest::Client::new();
    let res = http
        .post(&storage_url)
        .header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        )
        .header("apikey", state.supabase_service_key.clone())
        .header("content-type", ct)
        .body(body)
        .send()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !res.status().is_success() {
        let err_body = res.text().await.unwrap_or_default();
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to upload to storage: {}", err_body),
        ));
    }

    let public_url = format!(
        "{}/storage/v1/object/public/{}/{}",
        state.supabase_url, bucket, path
    );

    let update_body = serde_json::json!({
        "profile_photo_url": public_url,
        "updated_date": chrono::Utc::now().to_rfc3339(),
    });

    let resp = state
        .pg
        .from("creators")
        .eq("id", &user_id)
        .update(update_body.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let profile = rows.first().cloned().unwrap_or(serde_json::json!({}));

    Ok(Json(serde_json::json!({
        "message": "Upload successful",
        "public_url": public_url,
        "profile": profile,
    })))
}

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

/// Basic search for Faces (Talents/Creators) with optional filters
pub async fn search_faces(
    State(state): State<AppState>,
    Query(q): Query<FaceSearchQuery>,
) -> Result<Json<FaceSearchResponse>, (axum::http::StatusCode, String)> {
    let mut req = state
        .pg
        .from("creators")
        .select(
            "id,full_name,profile_photo_url,age,race,hair_color,hairstyle,eye_color,height_cm,weight_kg,facial_features",
        )
        .order("full_name.asc");

    if let Some(min) = q.age_min {
        req = req.gte("age", min.to_string());
    }
    if let Some(max) = q.age_max {
        req = req.lte("age", max.to_string());
    }
    // Multi-select categorical filters (comma-separated lists)
    if let Some(ref v) = q.race {
        let vals: Vec<String> = v
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();
        if !vals.is_empty() {
            if vals.len() == 1 {
                req = req.eq("race", vals[0].clone());
            } else {
                let cond_inner = vals
                    .iter()
                    .map(|s| format!("race.eq.{}", s))
                    .collect::<Vec<_>>()
                    .join(",");
                req = req.or(format!("({})", cond_inner));
            }
        }
    }
    if let Some(ref v) = q.hair_color {
        let vals: Vec<String> = v
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();
        if !vals.is_empty() {
            if vals.len() == 1 {
                req = req.eq("hair_color", vals[0].clone());
            } else {
                let cond_inner = vals
                    .iter()
                    .map(|s| format!("hair_color.eq.{}", s))
                    .collect::<Vec<_>>()
                    .join(",");
                req = req.or(format!("({})", cond_inner));
            }
        }
    }
    if let Some(ref v) = q.hairstyle {
        let vals: Vec<String> = v
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();
        if !vals.is_empty() {
            if vals.len() == 1 {
                req = req.eq("hairstyle", vals[0].clone());
            } else {
                let cond_inner = vals
                    .iter()
                    .map(|s| format!("hairstyle.eq.{}", s))
                    .collect::<Vec<_>>()
                    .join(",");
                req = req.or(format!("({})", cond_inner));
            }
        }
    }
    if let Some(ref v) = q.eye_color {
        let vals: Vec<String> = v
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();
        if !vals.is_empty() {
            if vals.len() == 1 {
                req = req.eq("eye_color", vals[0].clone());
            } else {
                let cond_inner = vals
                    .iter()
                    .map(|s| format!("eye_color.eq.{}", s))
                    .collect::<Vec<_>>()
                    .join(",");
                req = req.or(format!("({})", cond_inner));
            }
        }
    }
    if let Some(min) = q.height_min_cm {
        req = req.gte("height_cm", min.to_string());
    }
    if let Some(max) = q.height_max_cm {
        req = req.lte("height_cm", max.to_string());
    }
    if let Some(min) = q.weight_min_kg {
        req = req.gte("weight_kg", min.to_string());
    }
    if let Some(max) = q.weight_max_kg {
        req = req.lte("weight_kg", max.to_string());
    }

    // Pagination
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(24).clamp(1, 100);
    let from = ((page - 1) * page_size) as usize;
    let to = (from + page_size as usize) - 1;
    req = req.range(from, to);

    let resp = req
        .execute()
        .await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp
        .text()
        .await
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut items: Vec<FaceSummary> = serde_json::from_str(&text)
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Optional features filter (client-side best-effort if provided as comma-separated values)
    if let Some(features) = q.features.as_ref().filter(|s| !s.trim().is_empty()) {
        let wanted: Vec<String> = features
            .split(',')
            .map(|s| s.trim().to_lowercase())
            .filter(|s| !s.is_empty())
            .collect();
        if !wanted.is_empty() {
            items.retain(|it| {
                let have = it
                    .facial_features
                    .as_ref()
                    .map(|v| v.iter().map(|s| s.to_lowercase()).collect::<Vec<_>>())
                    .unwrap_or_default();
                wanted.iter().any(|w| have.iter().any(|h| h.contains(w)))
            });
        }
    }

    Ok(Json(FaceSearchResponse {
        items,
        page,
        page_size,
    }))
}
