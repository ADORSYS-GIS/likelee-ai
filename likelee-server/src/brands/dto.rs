use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Debug)]
pub struct BrandProfilePayload {
    pub company_name: Option<String>,
    pub contact_name: Option<String>,
    pub contact_title: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub phone_number: Option<String>,
    pub logo_url: Option<String>,
    pub industry: Option<String>,
    pub primary_goal: Option<serde_json::Value>,
    pub geographic_target: Option<String>,
    pub provide_creators: Option<String>,
    pub production_type: Option<String>,
    pub budget_range: Option<String>,
    pub creates_for: Option<String>,
    pub uses_ai: Option<String>,
    pub roles_needed: Option<serde_json::Value>,
    pub status: Option<String>,
    pub onboarding_step: Option<String>,
    pub notification_prefs: Option<serde_json::Value>,
}

#[derive(Deserialize, Serialize, Debug)]
pub struct BrandRegisterPayload {
    pub email: String,
    pub password: String,
    pub company_name: String,
    pub contact_name: Option<String>,
    pub contact_title: Option<String>,
    pub website: Option<String>,
    pub phone_number: Option<String>,
}

#[derive(Deserialize)]
pub struct ListBrandNotificationsQuery {
    pub limit: Option<u32>,
}
