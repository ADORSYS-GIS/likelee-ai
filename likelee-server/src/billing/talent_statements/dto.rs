use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct TalentStatementsQuery {
    pub talent_id: Option<String>,
    pub year: Option<i32>,
}

#[derive(Debug, Serialize, Clone)]
pub struct TalentStatementSummary {
    pub talent_id: String,
    pub talent_name: String,
    pub total_jobs: i32,
    pub total_owed_cents: i64,
    pub total_paid_ytd_cents: i64,
    pub last_payment_at: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct TalentStatementLine {
    pub talent_id: String,
    pub talent_name: String,
    pub invoice_id: String,
    pub invoice_number: String,
    pub invoice_date: Option<String>,
    pub client_name: String,
    pub description: String,
    pub gross_cents: i64,
    pub agency_fee_cents: i64,
    pub net_cents: i64,
    pub status: String,
    pub paid_at: Option<String>,
}
