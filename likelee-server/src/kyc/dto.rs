use hmac::Hmac;
use serde::{Deserialize, Serialize};
use sha2::Sha256;

pub type HmacSha256 = Hmac<Sha256>;

#[derive(Deserialize)]
pub struct SessionRequest {
    pub user_id: Option<String>,
    pub organization_id: Option<String>,
    #[allow(dead_code)]
    #[serde(default)]
    pub return_url: Option<String>,
}

#[derive(Serialize)]
pub struct SessionResponse {
    pub session_id: String,
    pub session_url: String,
    pub provider: String,
}

#[derive(Serialize, Deserialize, Default)]
pub struct ProfileVerification {
    pub kyc_status: Option<String>,
    pub liveness_status: Option<String>,
    pub kyc_provider: Option<String>,
    pub kyc_session_id: Option<String>,
    pub verified_at: Option<String>,
    pub kyc_rejection_reason: Option<String>,
    pub kyc_rejection_code: Option<String>,
}

#[derive(Serialize)]
pub struct VeriffVerification<'a> {
    #[serde(rename = "vendorData")]
    pub vendor_data: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lang: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub callback: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub features: Option<serde_json::Value>,
}

#[derive(Serialize)]
pub struct VeriffCreateSessionBody<'a> {
    pub verification: VeriffVerification<'a>,
}

#[derive(Deserialize)]
pub struct StatusQuery {
    pub user_id: Option<String>,
    pub organization_id: Option<String>,
}

#[allow(dead_code)]
#[derive(Deserialize)]
pub struct VeriffWebhookDecision {
    pub status: String,
}

#[allow(dead_code)]
#[derive(Deserialize)]
pub struct VeriffWebhookSession {
    pub id: String,
}

#[allow(dead_code)]
#[derive(Deserialize)]
pub struct VeriffWebhookBody {
    #[serde(rename = "vendorData")]
    pub vendor_data: Option<String>,
    pub session: Option<VeriffWebhookSession>,
    pub decision: Option<VeriffWebhookDecision>,
}
