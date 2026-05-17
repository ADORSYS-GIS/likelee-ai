use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct RateQuery {
    pub user_id: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CustomRate {
    pub rate_type: String,
    pub rate_name: String,
    pub price_per_month_cents: i32,
}
