use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct ExpenseListParams {
    pub date_start: Option<String>,
    pub date_end: Option<String>,
    pub category: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateExpensePayload {
    pub name: String,
    pub category: String,
    pub expense_date: String,
    pub amount_cents: Option<i32>,
    pub currency: Option<String>,
    pub status: Option<String>,
    pub submitter: Option<String>,
}
