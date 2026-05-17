use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct DigitalRow {
    pub id: String,
    pub talent_id: String,
    pub photo_urls: Vec<String>,

    pub height_feet: Option<i32>,
    pub height_inches: Option<i32>,
    pub weight_lbs: Option<i32>,
    pub bust_inches: Option<i32>,
    pub waist_inches: Option<i32>,
    pub hips_inches: Option<i32>,

    pub uploaded_at: Option<String>,
    pub expires_at: Option<String>,
    pub status: String,
    pub comp_card_url: Option<String>,

    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateDigitalRequest {
    pub photo_urls: Option<Vec<String>>,

    pub height_feet: Option<i32>,
    pub height_inches: Option<i32>,
    pub weight_lbs: Option<i32>,
    pub bust_inches: Option<i32>,
    pub waist_inches: Option<i32>,
    pub hips_inches: Option<i32>,

    pub uploaded_at: Option<String>,
    pub expires_at: Option<String>,
    pub status: Option<String>,
    pub comp_card_url: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateDigitalRequest {
    pub photo_urls: Option<Vec<String>>,

    pub height_feet: Option<i32>,
    pub height_inches: Option<i32>,
    pub weight_lbs: Option<i32>,
    pub bust_inches: Option<i32>,
    pub waist_inches: Option<i32>,
    pub hips_inches: Option<i32>,

    pub uploaded_at: Option<String>,
    pub expires_at: Option<String>,
    pub status: Option<String>,
    pub comp_card_url: Option<String>,
}

#[derive(Deserialize)]
pub struct SendDigitalsRemindersRequest {
    pub talent_ids: Vec<String>,
    pub subject: Option<String>,
    pub body: Option<String>,
}

#[derive(Serialize)]
pub struct SendDigitalsRemindersResponse {
    pub requested: usize,
    pub sent: usize,
    pub skipped_missing_email: usize,
    pub failed: usize,
}
