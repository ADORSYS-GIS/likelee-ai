use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
    extract::Multipart,
};
use serde::{Deserialize, Serialize};
use crate::auth::AuthUser;
use crate::config::AppState;

#[derive(Debug, Serialize, Deserialize)]
pub struct TalentPackage {
    pub id: Option<String>,
    pub agency_id: String,
    pub title: String,
    pub description: Option<String>,
    pub cover_image_url: Option<String>,
    pub primary_color: Option<String>,
    pub secondary_color: Option<String>,
    pub custom_message: Option<String>,
    pub allow_comments: bool,
    pub allow_favorites: bool,
    pub allow_callbacks: bool,
    pub expires_at: Option<String>,
    pub access_token: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePackageRequest {
    pub title: String,
    pub description: Option<String>,
    pub cover_image_url: Option<String>,
    pub primary_color: Option<String>,
    pub secondary_color: Option<String>,
    pub custom_message: Option<String>,
    pub allow_comments: Option<bool>,
    pub allow_favorites: Option<bool>,
    pub allow_callbacks: Option<bool>,
    pub expires_at: Option<String>,
    pub items: Vec<PackageItemRequest>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PackageItemRequest {
    pub talent_id: String,
    pub asset_ids: Vec<PackageAssetRequest>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PackageAssetRequest {
    pub asset_id: String,
    pub asset_type: String,
}

pub async fn list_packages(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("agency_talent_packages")
        .select("*, stats:agency_talent_package_stats(*)")
        .eq("agency_id", &user.id)
        .order("created_at.desc")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp.text().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let packages: serde_json::Value = serde_json::from_str(&text).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(packages))
}

pub async fn create_package(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<CreatePackageRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // 1. Insert Package metadata
    let package_insert = serde_json::json!({
        "agency_id": user.id,
        "title": payload.title,
        "description": payload.description,
        "cover_image_url": payload.cover_image_url,
        "primary_color": payload.primary_color,
        "secondary_color": payload.secondary_color,
        "custom_message": payload.custom_message,
        "allow_comments": payload.allow_comments.unwrap_or(true),
        "allow_favorites": payload.allow_favorites.unwrap_or(true),
        "allow_callbacks": payload.allow_callbacks.unwrap_or(true),
        "expires_at": payload.expires_at,
    });

    let resp = state
        .pg
        .from("agency_talent_packages")
        .insert(package_insert.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp.text().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let created_packages: Vec<serde_json::Value> = serde_json::from_str(&text).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    
    let package = created_packages.first().ok_or((StatusCode::INTERNAL_SERVER_ERROR, "Failed to create package".to_string()))?;
    let package_id = package["id"].as_str().ok_or((StatusCode::INTERNAL_SERVER_ERROR, "Package ID missing".to_string()))?;

    // 2. Insert Items and Assets
    for (item_idx, item_req) in payload.items.iter().enumerate() {
        let item_insert = serde_json::json!({
            "package_id": package_id,
            "talent_id": item_req.talent_id,
            "sort_order": item_idx,
        });

        let item_resp = state
            .pg
            .from("agency_talent_package_items")
            .insert(item_insert.to_string())
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let item_text = item_resp.text().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let created_items: Vec<serde_json::Value> = serde_json::from_str(&item_text).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let item = created_items.first().ok_or((StatusCode::INTERNAL_SERVER_ERROR, "Failed to create item".to_string()))?;
        let item_id = item["id"].as_str().ok_or((StatusCode::INTERNAL_SERVER_ERROR, "Item ID missing".to_string()))?;

        for (asset_idx, asset_req) in item_req.asset_ids.iter().enumerate() {
            let asset_insert = serde_json::json!({
                "item_id": item_id,
                "asset_id": asset_req.asset_id,
                "asset_type": asset_req.asset_type,
                "sort_order": asset_idx,
            });

            state
                .pg
                .from("agency_talent_package_item_assets")
                .insert(asset_insert.to_string())
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        }
    }

    Ok(Json(package.clone()))
}

pub async fn get_package(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("agency_talent_packages")
        .select("*, items:agency_talent_package_items(*, assets:agency_talent_package_item_assets(*)), stats:agency_talent_package_stats(*)")
        .eq("agency_id", &user.id)
        .eq("id", &id)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp.text().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let package: serde_json::Value = serde_json::from_str(&text).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(package))
}

pub async fn delete_package(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    state
        .pg
        .from("agency_talent_packages")
        .delete()
        .eq("agency_id", &user.id)
        .eq("id", &id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn get_dashboard_stats(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // 1. Get total packages and active shares
    let packages_resp = state
        .pg
        .from("agency_talent_packages")
        .select("id,expires_at")
        .eq("agency_id", &user.id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let packages_text = packages_resp.text().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let packages: Vec<serde_json::Value> = serde_json::from_str(&packages_text).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let total_packages = packages.len();
    let now = chrono::Utc::now();
    let active_shares = packages.iter().filter(|p| {
        match p["expires_at"].as_str() {
            Some(exp) => {
                match chrono::DateTime::parse_from_rfc3339(exp) {
                    Ok(exp_dt) => exp_dt > now,
                    Err(_) => true,
                }
            },
            None => true,
        }
    }).count();

    // 2. Get total views and interactions via RPC
    let stats_resp = state
        .pg
        .rpc("get_agency_package_stats", serde_json::json!({ "p_agency_id": user.id }).to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let stats_text = stats_resp.text().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let stats_arr: Vec<serde_json::Value> = serde_json::from_str(&stats_text).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    
    let stats = stats_arr.first().cloned().unwrap_or(serde_json::json!({
        "total_views": 0,
        "total_favorites": 0,
        "total_callbacks": 0
    }));

    let views = stats["total_views"].as_i64().unwrap_or(0);
    let favorites = stats["total_favorites"].as_i64().unwrap_or(0);
    let callbacks = stats["total_callbacks"].as_i64().unwrap_or(0);

    let conversion = if views > 0 {
        ((favorites + callbacks) as f64 / views as f64) * 100.0
    } else {
        0.0
    };

    Ok(Json(serde_json::json!({
        "total_packages": total_packages,
        "active_shares": active_shares,
        "total_views": views,
        "conversion_rate": format!("{:.1}%", conversion),
    })))
}

// Public Handlers
pub async fn get_public_package(
    State(state): State<AppState>,
    Path(token): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("agency_talent_packages")
        .select("*, items:agency_talent_package_items(*, talent:creators(*), assets:agency_talent_package_item_assets(*))")
        .eq("access_token", &token)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp.text().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let package: serde_json::Value = serde_json::from_str(&text).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Check if expired
    if let Some(expires_at) = package["expires_at"].as_str() {
        if let Ok(expires) = chrono::DateTime::parse_from_rfc3339(expires_at) {
            if expires < chrono::Utc::now() {
                return Err((StatusCode::GONE, "Package expired".to_string()));
            }
        }
    }

    // Increment view count
    if let Some(id) = package["id"].as_str() {
        let _ = state.pg
            .rpc("increment_package_view", serde_json::json!({ "p_package_id": id }).to_string())
            .execute()
            .await;
    }

    Ok(Json(package))
}

pub async fn create_interaction(
    State(state): State<AppState>,
    Path(token): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Result<StatusCode, (StatusCode, String)> {
    // Verify package exists via token
    let package_resp = state
        .pg
        .from("agency_talent_packages")
        .select("id")
        .eq("access_token", &token)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let package_text = package_resp.text().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let package: serde_json::Value = serde_json::from_str(&package_text).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let package_id = package["id"].as_str().ok_or((StatusCode::NOT_FOUND, "Package not found".to_string()))?;

    let mut interaction = payload.clone();
    interaction.as_object_mut().unwrap().insert("package_id".to_string(), serde_json::json!(package_id));

    state
        .pg
        .from("agency_talent_package_interactions")
        .insert(interaction.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::CREATED)
}
