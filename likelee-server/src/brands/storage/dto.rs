use serde::{Deserialize, Serialize};

#[derive(Serialize)]
pub struct BrandStorageUsageOut {
    pub used_bytes: i64,
    pub limit_bytes: i64,
}

#[derive(Deserialize)]
pub struct CreateBrandFolderIn {
    pub name: String,
    pub parent_id: Option<String>,
}

#[derive(Deserialize)]
pub struct ListBrandFilesQuery {
    pub folder_id: Option<String>,
    pub root_only: Option<bool>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
    pub mime_type: Option<String>,
    pub source_type: Option<String>,
}

#[derive(Deserialize)]
pub struct ListBrandFoldersQuery {
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

#[derive(Deserialize)]
pub struct UpdateBrandFolderIn {
    pub name: Option<String>,
}

#[derive(Serialize)]
pub struct BrandFileUploadResponse {
    pub id: String,
    pub file_name: String,
    pub public_url: Option<String>,
    pub storage_bucket: String,
    pub storage_path: String,
    pub source_type: String,
    pub generation_id: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Serialize)]
pub struct BrandStorageAnalyticsItem {
    pub source_type: String,
    pub mime_type: Option<String>,
    pub file_count: i64,
    pub total_bytes: i64,
    pub avg_file_size: f64,
}

#[derive(Serialize)]
pub struct BrandStorageAnalytics {
    pub by_source_type: Vec<BrandStorageAnalyticsItem>,
    pub by_mime_type: Vec<BrandStorageAnalyticsItem>,
}
