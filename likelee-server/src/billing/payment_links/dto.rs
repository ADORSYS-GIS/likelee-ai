use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct GeneratePaymentLinkRequest {
    pub licensing_request_ids: Vec<String>,
    pub total_amount_cents: Option<i64>,
    pub currency: Option<String>,
    pub expires_in_hours: Option<i64>,
    pub client_email: Option<String>,
    pub client_name: Option<String>,
}

#[derive(Serialize)]
pub struct PaymentLinkResponse {
    pub payment_link_id: String,
    pub payment_link_url: String,
    pub expires_at: String,
    pub total_amount_cents: i64,
    pub agency_amount_cents: i64,
    pub talent_amount_cents: i64,
    pub talent_splits: Vec<TalentSplit>,
    pub status: String,
}

#[derive(Serialize)]
pub struct TalentSplit {
    pub talent_id: String,
    pub talent_name: String,
    pub amount_cents: i64,
}

#[derive(Deserialize)]
pub struct SendPaymentLinkEmailRequest {
    pub payment_link_id: String,
    pub custom_message: Option<String>,
}

#[derive(Deserialize)]
pub struct ListPaymentLinksQuery {
    pub licensing_request_id: Option<String>,
    pub status: Option<String>,
}

#[derive(Deserialize)]
pub struct CreatorPayoutRequestBody {
    pub amount_cents: i64,
    pub currency: Option<String>,
    pub payout_method: Option<String>,
}
