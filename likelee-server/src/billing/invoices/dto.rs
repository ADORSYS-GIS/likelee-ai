use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct InvoiceListParams {
    pub status: Option<String>,
    pub date_start: Option<String>,
    pub date_end: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateInvoiceItemInput {
    pub description: String,
    pub talent_id: Option<String>,
    pub talent_name: Option<String>,
    pub date_of_service: Option<String>,
    pub rate_type: Option<String>,
    pub quantity: Option<f64>,
    pub unit_price_cents: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct CreateInvoiceExpenseInput {
    pub description: String,
    pub amount_cents: Option<i32>,
    pub taxable: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct CreateInvoicePayload {
    pub client_id: String,
    pub source_booking_id: Option<String>,
    pub invoice_number: Option<String>,
    pub invoice_date: Option<String>,
    pub due_date: Option<String>,
    pub payment_terms: Option<String>,
    pub po_number: Option<String>,
    pub project_reference: Option<String>,
    pub currency: Option<String>,
    pub agency_commission_bps: Option<i32>,
    pub tax_rate_bps: Option<i32>,
    pub tax_exempt: Option<bool>,
    pub discount_cents: Option<i32>,
    pub notes_internal: Option<String>,
    pub payment_instructions: Option<String>,
    pub footer_text: Option<String>,
    pub items: Option<Vec<CreateInvoiceItemInput>>,
    pub expenses: Option<Vec<CreateInvoiceExpenseInput>>,
}

#[derive(Debug, Serialize)]
pub struct InvoiceDetail {
    pub invoice: serde_json::Value,
    pub items: serde_json::Value,
    pub expenses: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct UpdateInvoicePayload {
    pub invoice_number: Option<String>,
    pub invoice_date: Option<String>,
    pub due_date: Option<String>,
    pub payment_terms: Option<String>,
    pub po_number: Option<String>,
    pub project_reference: Option<String>,
    pub currency: Option<String>,
    pub agency_commission_bps: Option<i32>,
    pub tax_rate_bps: Option<i32>,
    pub tax_exempt: Option<bool>,
    pub discount_cents: Option<i32>,
    pub notes_internal: Option<String>,
    pub payment_instructions: Option<String>,
    pub footer_text: Option<String>,
    pub items: Option<Vec<CreateInvoiceItemInput>>,
    pub expenses: Option<Vec<CreateInvoiceExpenseInput>>,
}
