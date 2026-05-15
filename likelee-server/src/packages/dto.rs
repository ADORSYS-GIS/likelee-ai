use crate::state::AppState;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};

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
    pub consent_items: Option<Vec<String>>,
    pub expires_at: Option<String>,
    pub access_token: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub meta: Option<serde_json::Value>,
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
    pub consent_items: Option<Vec<String>>,
    pub expires_at: Option<String>,
    pub client_name: Option<String>,
    pub client_email: Option<String>,
    pub items: Vec<PackageItemRequest>,
    pub is_template: Option<bool>,
    pub template_id: Option<String>,
    pub password: Option<String>,
    pub password_protected: Option<bool>,
    pub meta: Option<serde_json::Value>,
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

#[derive(Debug, Deserialize)]
pub struct ListPackagesQuery {
    pub is_template: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct PublicPackageFullAssetsRequest {
    pub client_name: Option<String>,
    pub client_email: Option<String>,
    pub message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeleteInteractionRequest {
    pub talent_id: Option<String>,
    pub creator_id: Option<String>,
    #[serde(rename = "type")]
    pub r#type: String,
}

pub async fn create_interaction(
    State(state): State<AppState>,
    Path(token): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Result<(StatusCode, Json<serde_json::Value>), (StatusCode, String)> {
    // Verify package exists via token
    let package_resp = state
        .pg
        .from("agency_talent_packages")
        .select("id,agency_id")
        .eq("access_token", &token)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !package_resp.status().is_success() {
        let status = package_resp.status();
        let err_text = package_resp.text().await.unwrap_or_default();
        return Err((
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::NOT_FOUND),
            err_text,
        ));
    }

    let package_text = package_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let package: serde_json::Value = serde_json::from_str(&package_text).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to parse interaction package: {}", e),
        )
    })?;
    let package_id = package["id"]
        .as_str()
        .ok_or((StatusCode::NOT_FOUND, "Package ID missing".to_string()))?;
    let package_agency_id = package["agency_id"].as_str().unwrap_or("").to_string();

    let mut interaction = payload.clone();
    interaction
        .as_object_mut()
        .unwrap()
        .insert("package_id".to_string(), serde_json::json!(package_id));

    let interaction_type = payload["type"].as_str().unwrap_or_default();

    let insert_resp = if interaction_type == "favorite"
        || interaction_type == "callback"
        || interaction_type == "selected"
    {
        let params = serde_json::json!({
            "interaction_data": interaction
        });
        state
            .pg
            .rpc("upsert_interaction", params.to_string())
            .execute()
            .await
    } else if interaction_type == "consent" {
        // Keep a single latest consent snapshot per package.
        let _ = state
            .pg
            .from("agency_talent_package_interactions")
            .delete()
            .eq("package_id", package_id)
            .eq("type", "consent")
            .execute()
            .await;
        state
            .pg
            .from("agency_talent_package_interactions")
            .insert(interaction.to_string())
            .execute()
            .await
    } else {
        state
            .pg
            .from("agency_talent_package_interactions")
            .insert(interaction.to_string())
            .execute()
            .await
    };

    let insert_resp =
        insert_resp.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !insert_resp.status().is_success() {
        let status = insert_resp.status();
        let err_text = insert_resp.text().await.unwrap_or_default();
        tracing::error!("Failed to create interaction: [{}] {}", status, err_text);
        return Err((
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
            err_text,
        ));
    }

    let text = insert_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let created_interaction: serde_json::Value = serde_json::from_str(&text).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to parse created interaction: {}", e),
        )
    })?;

    if interaction_type == "consent" {
        let consent_status = payload
            .get("content")
            .and_then(|v| v.as_str())
            .and_then(|s| serde_json::from_str::<serde_json::Value>(s).ok())
            .and_then(|obj| {
                obj.get("status")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            })
            .map(|s| s.trim().to_lowercase())
            .filter(|s| s == "complete" || s == "missing" || s == "expired")
            .unwrap_or_else(|| "missing".to_string());

        let item_resp = state
            .pg
            .from("agency_talent_package_items")
            .select("talent_id")
            .eq("package_id", package_id)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        if !item_resp.status().is_success() {
            let status = item_resp.status();
            let err_text = item_resp.text().await.unwrap_or_default();
            return Err((
                StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
                err_text,
            ));
        }

        let item_text = item_resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let item_rows: Vec<serde_json::Value> = serde_json::from_str(&item_text).map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to parse package items for consent sync: {}", e),
            )
        })?;
        let talent_ids: Vec<String> = item_rows
            .iter()
            .filter_map(|r| r.get("talent_id").and_then(|v| v.as_str()))
            .map(|s| s.to_string())
            .collect();

        if !talent_ids.is_empty() {
            let update_resp = state
                .pg
                .from("agency_users")
                .in_("id", talent_ids)
                .eq("agency_id", package_agency_id)
                .update(serde_json::json!({ "consent_status": consent_status }).to_string())
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

            if !update_resp.status().is_success() {
                let status = update_resp.status();
                let err_text = update_resp.text().await.unwrap_or_default();
                return Err((
                    StatusCode::from_u16(status.as_u16())
                        .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
                    err_text,
                ));
            }
        }
    }

    Ok((StatusCode::CREATED, Json(created_interaction)))
}
