use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct CreateBookingPayload {
    pub booking_type: Option<String>,
    pub status: Option<String>,
    pub client_id: Option<String>,
    pub talent_id: Option<String>,
    pub creator_id: Option<String>,
    pub relationship_id: Option<String>,
    pub talent_name: Option<String>,
    pub client_name: Option<String>,
    pub date: String,
    pub all_day: Option<bool>,
    pub call_time: Option<String>, // HH:MM
    pub wrap_time: Option<String>,
    pub location: Option<String>,
    pub location_notes: Option<String>,
    pub rate_cents: Option<i32>,
    pub currency: Option<String>,
    pub rate_type: Option<String>,
    pub usage_terms: Option<String>,
    pub usage_duration: Option<String>,
    pub exclusive: Option<bool>,
    pub notes: Option<String>,
    pub industries: Option<Vec<String>>, // text[]
    // Notifications
    pub notify_email: Option<bool>,
    pub notify_sms: Option<bool>,
    pub notify_push: Option<bool>,
    pub notify_calendar: Option<bool>,
    pub campaign_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ListParams {
    pub date_start: Option<String>,
    pub date_end: Option<String>,
    pub client_id: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct BookingFileUploadResponse {
    pub id: String,
    pub file_name: String,
    pub public_url: Option<String>,
    pub storage_bucket: String,
    pub storage_path: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct UpdateBookingPayload {
    pub booking_type: Option<String>,
    pub status: Option<String>,
    pub client_id: Option<String>,
    pub date: Option<String>,
    pub all_day: Option<bool>,
    pub call_time: Option<String>,
    pub wrap_time: Option<String>,
    pub location: Option<String>,
    pub location_notes: Option<String>,
    pub rate_cents: Option<i32>,
    pub currency: Option<String>,
    pub rate_type: Option<String>,
    pub usage_terms: Option<String>,
    pub usage_duration: Option<String>,
    pub exclusive: Option<bool>,
    pub notes: Option<String>,
    pub industries: Option<Vec<String>>,
    // Notifications
    pub notify_email: Option<bool>,
    pub notify_sms: Option<bool>,
    pub notify_push: Option<bool>,
    pub notify_calendar: Option<bool>,
    pub campaign_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BookingFilePath {
    pub id: String,
    pub file_id: String,
}
