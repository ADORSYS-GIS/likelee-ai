use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct CreateCatalogRequest {
    pub title: String,
    pub client_name: Option<String>,
    pub client_email: Option<String>,
    pub licensing_request_id: Option<String>,
    pub notes: Option<String>,
    pub expires_at: Option<String>,
    pub items: Vec<CatalogItemRequest>,
}

#[derive(Deserialize)]
pub struct CatalogItemRequest {
    pub talent_id: String,
    pub asset_ids: Vec<CatalogAssetRef>,
    pub recording_ids: Vec<CatalogRecordingRef>,
}

#[derive(Deserialize)]
pub struct CatalogAssetRef {
    pub asset_id: String,
    pub asset_type: String,
}

#[derive(Deserialize)]
pub struct CatalogRecordingRef {
    pub recording_id: String,
    pub emotion_tag: Option<String>,
}

#[derive(Serialize)]
pub struct CatalogRow {
    pub id: String,
    pub agency_id: String,
    pub licensing_request_id: Option<String>,
    pub title: String,
    pub client_name: Option<String>,
    pub client_email: Option<String>,
    pub access_token: String,
    pub created_at: String,
    pub sent_at: Option<String>,
    pub notes: Option<String>,
    pub item_count: i64,
}

// ============================================================================
// List catalogs (agency dashboard)
// ============================================================================
