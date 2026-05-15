use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct UploadQuery {
    pub section_id: String,
}

#[derive(Serialize)]
pub struct DeleteResponse {
    pub deleted: bool,
}

#[derive(Serialize)]
pub struct UploadResponse {
    pub public_url: String,
    pub storage_bucket: String,
    pub storage_path: String,
}

#[derive(Serialize)]
pub struct ErrorOut {
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reasons: Option<Vec<String>>,
}
