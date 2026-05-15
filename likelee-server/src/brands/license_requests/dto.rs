use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct CreateBrandLicenseRequest {
    pub creator_id: String,
    pub campaign_title: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub exclusivity: Option<String>,
    pub modifications_allowed: Option<String>,
    pub territory: Option<String>,
    pub usage_scope: Option<String>,
    pub license_fee: Option<f64>,
    pub duration_days: Option<i64>,
    pub start_date: Option<String>,
    pub custom_terms: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateBrandLicenseRequestStatus {
    pub brand_request_ids: Vec<String>,
    pub status: String,
    pub decline_reason: Option<String>,
}

#[derive(Serialize)]
pub struct BrandLicenseRequestListResponse {
    pub requests: Vec<serde_json::Value>,
}
