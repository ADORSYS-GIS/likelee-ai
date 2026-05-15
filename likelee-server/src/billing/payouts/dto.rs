use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct ProfileQuery {
    pub profile_id: String,
    pub limit: Option<i64>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct BalanceRow {
    pub creator_id: String,
    pub currency: String,
    pub available_cents: i64,
    pub earned_cents: i64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct StripeBalanceRow {
    pub currency: String,
    pub available_cents: i64,
    pub pending_cents: i64,
}

#[derive(Deserialize)]
pub struct BalanceQuery {
    pub profile_id: String,
}

#[derive(Deserialize)]
pub struct PayoutRequestPayload {
    pub profile_id: String,
    pub amount_cents: i64,
    pub currency: Option<String>,
    pub payout_method: Option<String>,
}

#[derive(Deserialize)]
pub struct MyPayoutRequestPayload {
    pub amount_cents: i64,
    pub currency: Option<String>,
    pub payout_method: Option<String>,
}

#[derive(Deserialize)]
pub struct AgencyPayoutRequestPayload {
    pub amount_cents: i64,
    pub currency: Option<String>,
    pub payout_method: Option<String>,
}
