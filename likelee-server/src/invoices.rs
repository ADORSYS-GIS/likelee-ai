use crate::{auth::AuthUser, config::AppState};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::{Datelike, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Debug, Deserialize)]
pub struct InvoiceListParams {
    pub status: Option<String>,
    pub date_start: Option<String>,
    pub date_end: Option<String>,
}

pub async fn list(
    State(state): State<AppState>,
    user: AuthUser,
    Query(params): Query<InvoiceListParams>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let mut req = state
        .pg
        .from("agency_invoices")
        .select("*")
        .eq("agency_id", &user.id)
        .order("created_at.desc");

    if let Some(s) = params.status.as_ref().filter(|s| !s.is_empty()) {
        req = req.eq("status", s);
    }
    if let Some(d) = params.date_start.as_ref().filter(|s| !s.is_empty()) {
        req = req.gte("invoice_date", d);
    }
    if let Some(d) = params.date_end.as_ref().filter(|s| !s.is_empty()) {
        req = req.lte("invoice_date", d);
    }

    let resp = req
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
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

fn compute_totals(
    items: &[serde_json::Value],
    expenses: &[serde_json::Value],
    agency_commission_bps: i64,
    tax_rate_bps: i64,
    tax_exempt: bool,
    discount_cents: i64,
) -> (i64, i64, i64, i64, i64, i64) {
    let subtotal_cents: i64 = items
        .iter()
        .map(|it| it.get("line_total_cents").and_then(|v| v.as_i64()).unwrap_or(0))
        .sum();

    let expenses_cents: i64 = expenses
        .iter()
        .map(|ex| ex.get("amount_cents").and_then(|v| v.as_i64()).unwrap_or(0))
        .sum();

    let taxable_expenses_cents: i64 = expenses
        .iter()
        .filter(|ex| ex.get("taxable").and_then(|v| v.as_bool()).unwrap_or(false))
        .map(|ex| ex.get("amount_cents").and_then(|v| v.as_i64()).unwrap_or(0))
        .sum();

    let mut taxable_base_cents = subtotal_cents + taxable_expenses_cents - discount_cents;
    if taxable_base_cents < 0 {
        taxable_base_cents = 0;
    }

    let tax_cents = if tax_exempt {
        0
    } else {
        (taxable_base_cents * tax_rate_bps) / 10_000
    };

    let mut total_cents = (subtotal_cents + expenses_cents - discount_cents) + tax_cents;
    if total_cents < 0 {
        total_cents = 0;
    }

    let agency_fee_cents = (subtotal_cents * agency_commission_bps) / 10_000;
    let talent_net_cents = subtotal_cents - agency_fee_cents;

    (
        subtotal_cents,
        expenses_cents,
        tax_cents,
        total_cents,
        agency_fee_cents,
        talent_net_cents,
    )
}

fn normalize_items(inputs: &[CreateInvoiceItemInput]) -> Vec<serde_json::Value> {
    inputs
        .iter()
        .enumerate()
        .map(|(idx, it)| {
            let qty = it.quantity.unwrap_or(1.0);
            let unit = it.unit_price_cents.unwrap_or(0) as i64;
            let line_total_cents = (qty * unit as f64).round() as i64;
            json!({
                "sort_order": idx,
                "description": it.description,
                "talent_id": it.talent_id,
                "talent_name": it.talent_name,
                "date_of_service": it.date_of_service,
                "rate_type": it.rate_type,
                "quantity": qty,
                "unit_price_cents": it.unit_price_cents.unwrap_or(0),
                "line_total_cents": line_total_cents,
            })
        })
        .collect()
}

fn normalize_expenses(inputs: &[CreateInvoiceExpenseInput]) -> Vec<serde_json::Value> {
    inputs
        .iter()
        .enumerate()
        .map(|(idx, ex)| {
            json!({
                "sort_order": idx,
                "description": ex.description,
                "amount_cents": ex.amount_cents.unwrap_or(0),
                "taxable": ex.taxable.unwrap_or(false),
            })
        })
        .collect()
}

async fn get_client_snapshot(
    state: &AppState,
    user: &AuthUser,
    client_id: &str,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let resp = state
        .pg
        .from("agency_clients")
        .select("id,agency_id,company,contact_name,email,phone")
        .eq("id", client_id)
        .eq("agency_id", &user.id)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        let code = StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err((code, text));
    }

    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(v)
}

async fn get_booking(
    state: &AppState,
    user: &AuthUser,
    booking_id: &str,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let resp = state
        .pg
        .from("bookings")
        .select("id,agency_user_id,talent_id,talent_name,client_id,client_name,date,rate_cents,currency,rate_type,status")
        .eq("id", booking_id)
        .eq("agency_user_id", &user.id)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        let code = StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err((code, text));
    }

    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(v)
}

async fn ensure_invoice_owned(
    state: &AppState,
    user: &AuthUser,
    invoice_id: &str,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let resp = state
        .pg
        .from("agency_invoices")
        .select("*")
        .eq("id", invoice_id)
        .eq("agency_id", &user.id)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        let code = StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err((code, text));
    }

    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(v)
}

pub async fn create(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<CreateInvoicePayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let client = get_client_snapshot(&state, &user, &payload.client_id).await?;

    let booking = if let Some(bid) = payload.source_booking_id.as_ref() {
        Some(get_booking(&state, &user, bid).await?)
    } else {
        None
    };

    let today = Utc::now().date_naive();
    let invoice_date = payload
        .invoice_date
        .as_deref()
        .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok())
        .unwrap_or(today);

    let due_date = payload
        .due_date
        .as_deref()
        .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok())
        .unwrap_or_else(|| invoice_date + chrono::Duration::days(30));

    let agency_commission_bps = payload.agency_commission_bps.unwrap_or(2000) as i64;
    let tax_rate_bps = payload.tax_rate_bps.unwrap_or(0) as i64;
    let tax_exempt = payload.tax_exempt.unwrap_or(false);
    let discount_cents = payload.discount_cents.unwrap_or(0) as i64;

    let mut items_in: Vec<CreateInvoiceItemInput> = payload.items.unwrap_or_default();
    if items_in.is_empty() {
        if let Some(b) = booking.as_ref() {
            let date_of_service = b.get("date").and_then(|v| v.as_str()).map(|s| s.to_string());
            let rate_cents = b.get("rate_cents").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
            let rate_type = b.get("rate_type").and_then(|v| v.as_str()).map(|s| s.to_string());
            let talent_id = b.get("talent_id").and_then(|v| v.as_str()).map(|s| s.to_string());
            let talent_name = b.get("talent_name").and_then(|v| v.as_str()).map(|s| s.to_string());

            items_in.push(CreateInvoiceItemInput {
                description: "Booking services".to_string(),
                talent_id,
                talent_name,
                date_of_service,
                rate_type,
                quantity: Some(1.0),
                unit_price_cents: Some(rate_cents),
            });
        }
    }

    let items_norm = normalize_items(&items_in);
    let expenses_norm = normalize_expenses(&payload.expenses.unwrap_or_default());

    let (subtotal_cents, expenses_cents, tax_cents, total_cents, agency_fee_cents, talent_net_cents) =
        compute_totals(
            &items_norm,
            &expenses_norm,
            agency_commission_bps,
            tax_rate_bps,
            tax_exempt,
            discount_cents,
        );

    // Generate invoice number if not supplied
    let invoice_number = if let Some(s) = payload.invoice_number.as_ref().filter(|s| !s.is_empty()) {
        s.clone()
    } else {
        let body = json!({ "p_agency_id": user.id });
        let resp = state
            .pg
            .rpc("next_invoice_number", body.to_string())
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let status = resp.status();
        let text = resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if !status.is_success() {
            let code = StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
            return Err((code, text));
        }
        // Postgrest returns JSON; accept either {"next_invoice_number":"..."} or string
        let v: serde_json::Value = serde_json::from_str(&text)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        v.as_str()
            .map(|s| s.to_string())
            .or_else(|| v.get("next_invoice_number").and_then(|x| x.as_str()).map(|s| s.to_string()))
            .unwrap_or_else(|| {
                let yr = Utc::now().year();
                format!("INV-{}-0001", yr)
            })
    };

    let inv_row = json!({
        "agency_id": user.id,
        "client_id": payload.client_id,
        "booking_id": payload.source_booking_id,

        "invoice_number": invoice_number,
        "status": "draft",

        "invoice_date": invoice_date.format("%Y-%m-%d").to_string(),
        "due_date": due_date.format("%Y-%m-%d").to_string(),

        "bill_to_company": client.get("company").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        "bill_to_contact_name": client.get("contact_name").and_then(|v| v.as_str()),
        "bill_to_email": client.get("email").and_then(|v| v.as_str()),
        "bill_to_phone": client.get("phone").and_then(|v| v.as_str()),

        "po_number": payload.po_number,
        "project_reference": payload.project_reference,

        "currency": payload.currency.unwrap_or_else(|| "USD".to_string()),
        "payment_terms": payload.payment_terms.unwrap_or_else(|| "net_30".to_string()),

        "agency_commission_bps": agency_commission_bps as i32,
        "tax_rate_bps": tax_rate_bps as i32,
        "tax_exempt": tax_exempt,
        "discount_cents": discount_cents as i32,

        "notes_internal": payload.notes_internal,
        "payment_instructions": payload.payment_instructions,
        "footer_text": payload.footer_text,

        "subtotal_cents": subtotal_cents as i32,
        "expenses_cents": expenses_cents as i32,
        "tax_cents": tax_cents as i32,
        "total_cents": total_cents as i32,
        "agency_fee_cents": agency_fee_cents as i32,
        "talent_net_cents": talent_net_cents as i32,
    });

    let resp = state
        .pg
        .from("agency_invoices")
        .insert(inv_row.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        let code = StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err((code, text));
    }

    let created: Vec<serde_json::Value> = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let invoice = created.first().cloned().ok_or((
        StatusCode::INTERNAL_SERVER_ERROR,
        "create returned empty".to_string(),
    ))?;

    let invoice_id = invoice
        .get("id")
        .and_then(|v| v.as_str())
        .ok_or((StatusCode::INTERNAL_SERVER_ERROR, "missing invoice id".to_string()))?
        .to_string();

    // Insert items
    if !items_norm.is_empty() {
        let rows: Vec<serde_json::Value> = items_norm
            .into_iter()
            .map(|mut it| {
                if let Some(o) = it.as_object_mut() {
                    o.insert("invoice_id".to_string(), json!(invoice_id));
                }
                it
            })
            .collect();
        let _ = state
            .pg
            .from("agency_invoice_items")
            .insert(serde_json::to_string(&rows).unwrap_or_else(|_| "[]".to_string()))
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    // Insert expenses
    if !expenses_norm.is_empty() {
        let rows: Vec<serde_json::Value> = expenses_norm
            .into_iter()
            .map(|mut ex| {
                if let Some(o) = ex.as_object_mut() {
                    o.insert("invoice_id".to_string(), json!(invoice_id));
                }
                ex
            })
            .collect();
        let _ = state
            .pg
            .from("agency_invoice_expenses")
            .insert(serde_json::to_string(&rows).unwrap_or_else(|_| "[]".to_string()))
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    Ok(Json(invoice))
}

pub async fn get(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<InvoiceDetail>, (StatusCode, String)> {
    let invoice = ensure_invoice_owned(&state, &user, &id).await?;

    let items_resp = state
        .pg
        .from("agency_invoice_items")
        .select("*")
        .eq("invoice_id", &id)
        .order("sort_order.asc")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let items_text = items_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let items: serde_json::Value = serde_json::from_str(&items_text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let exp_resp = state
        .pg
        .from("agency_invoice_expenses")
        .select("*")
        .eq("invoice_id", &id)
        .order("sort_order.asc")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let exp_text = exp_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let expenses: serde_json::Value = serde_json::from_str(&exp_text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(InvoiceDetail {
        invoice,
        items,
        expenses,
    }))
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

pub async fn update(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<UpdateInvoicePayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let current = ensure_invoice_owned(&state, &user, &id).await?;

    let status = current
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("draft");
    if status != "draft" {
        return Err((
            StatusCode::CONFLICT,
            "Only draft invoices can be updated".to_string(),
        ));
    }

    let agency_commission_bps = payload
        .agency_commission_bps
        .or_else(|| current.get("agency_commission_bps").and_then(|v| v.as_i64()).map(|v| v as i32))
        .unwrap_or(2000) as i64;

    let tax_rate_bps = payload
        .tax_rate_bps
        .or_else(|| current.get("tax_rate_bps").and_then(|v| v.as_i64()).map(|v| v as i32))
        .unwrap_or(0) as i64;

    let tax_exempt = payload
        .tax_exempt
        .or_else(|| current.get("tax_exempt").and_then(|v| v.as_bool()))
        .unwrap_or(false);

    let discount_cents = payload
        .discount_cents
        .or_else(|| current.get("discount_cents").and_then(|v| v.as_i64()).map(|v| v as i32))
        .unwrap_or(0) as i64;

    // Replace items/expenses if provided
    let mut items_norm: Vec<serde_json::Value> = vec![];
    let mut expenses_norm: Vec<serde_json::Value> = vec![];

    if let Some(items) = payload.items.as_ref() {
        items_norm = normalize_items(items);
        let _ = state
            .pg
            .from("agency_invoice_items")
            .delete()
            .eq("invoice_id", &id)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        if !items_norm.is_empty() {
            let rows: Vec<serde_json::Value> = items_norm
                .iter()
                .cloned()
                .map(|mut it| {
                    if let Some(o) = it.as_object_mut() {
                        o.insert("invoice_id".to_string(), json!(id));
                    }
                    it
                })
                .collect();
            let _ = state
                .pg
                .from("agency_invoice_items")
                .insert(serde_json::to_string(&rows).unwrap_or_else(|_| "[]".to_string()))
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        }
    }

    if let Some(expenses) = payload.expenses.as_ref() {
        expenses_norm = normalize_expenses(expenses);
        let _ = state
            .pg
            .from("agency_invoice_expenses")
            .delete()
            .eq("invoice_id", &id)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        if !expenses_norm.is_empty() {
            let rows: Vec<serde_json::Value> = expenses_norm
                .iter()
                .cloned()
                .map(|mut ex| {
                    if let Some(o) = ex.as_object_mut() {
                        o.insert("invoice_id".to_string(), json!(id));
                    }
                    ex
                })
                .collect();
            let _ = state
                .pg
                .from("agency_invoice_expenses")
                .insert(serde_json::to_string(&rows).unwrap_or_else(|_| "[]".to_string()))
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        }
    }

    // If caller didn't provide items/expenses, load existing for totals
    if payload.items.is_none() {
        let resp = state
            .pg
            .from("agency_invoice_items")
            .select("line_total_cents")
            .eq("invoice_id", &id)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let txt = resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        items_norm = serde_json::from_str(&txt).unwrap_or_default();
    }
    if payload.expenses.is_none() {
        let resp = state
            .pg
            .from("agency_invoice_expenses")
            .select("amount_cents,taxable")
            .eq("invoice_id", &id)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let txt = resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        expenses_norm = serde_json::from_str(&txt).unwrap_or_default();
    }

    let (subtotal_cents, expenses_cents, tax_cents, total_cents, agency_fee_cents, talent_net_cents) =
        compute_totals(
            &items_norm,
            &expenses_norm,
            agency_commission_bps,
            tax_rate_bps,
            tax_exempt,
            discount_cents,
        );

    let body = json!({
        "invoice_number": payload.invoice_number,
        "invoice_date": payload.invoice_date,
        "due_date": payload.due_date,
        "payment_terms": payload.payment_terms,

        "po_number": payload.po_number,
        "project_reference": payload.project_reference,

        "currency": payload.currency,
        "agency_commission_bps": agency_commission_bps as i32,
        "tax_rate_bps": tax_rate_bps as i32,
        "tax_exempt": tax_exempt,
        "discount_cents": discount_cents as i32,

        "notes_internal": payload.notes_internal,
        "payment_instructions": payload.payment_instructions,
        "footer_text": payload.footer_text,

        "subtotal_cents": subtotal_cents as i32,
        "expenses_cents": expenses_cents as i32,
        "tax_cents": tax_cents as i32,
        "total_cents": total_cents as i32,
        "agency_fee_cents": agency_fee_cents as i32,
        "talent_net_cents": talent_net_cents as i32,
        "updated_at": Utc::now().to_rfc3339(),
    });

    let resp = state
        .pg
        .from("agency_invoices")
        .update(body.to_string())
        .eq("id", &id)
        .eq("agency_id", &user.id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        let code = StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err((code, text));
    }

    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}

pub async fn mark_sent(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let current = ensure_invoice_owned(&state, &user, &id).await?;
    let status = current
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("draft");
    if status != "draft" {
        return Err((
            StatusCode::CONFLICT,
            "Only draft invoices can be marked as sent".to_string(),
        ));
    }

    let body = json!({
        "status": "sent",
        "sent_at": Utc::now().to_rfc3339(),
        "updated_at": Utc::now().to_rfc3339(),
    });

    let resp = state
        .pg
        .from("agency_invoices")
        .update(body.to_string())
        .eq("id", &id)
        .eq("agency_id", &user.id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        let code = StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err((code, text));
    }

    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}

pub async fn mark_paid(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let current = ensure_invoice_owned(&state, &user, &id).await?;
    let status = current
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("draft");
    if status != "sent" {
        return Err((
            StatusCode::CONFLICT,
            "Only sent invoices can be marked as paid".to_string(),
        ));
    }

    let body = json!({
        "status": "paid",
        "paid_at": Utc::now().to_rfc3339(),
        "updated_at": Utc::now().to_rfc3339(),
    });

    let resp = state
        .pg
        .from("agency_invoices")
        .update(body.to_string())
        .eq("id", &id)
        .eq("agency_id", &user.id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        let code = StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err((code, text));
    }

    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}

pub async fn void_invoice(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let _ = ensure_invoice_owned(&state, &user, &id).await?;

    let body = json!({
        "status": "void",
        "updated_at": Utc::now().to_rfc3339(),
    });

    let resp = state
        .pg
        .from("agency_invoices")
        .update(body.to_string())
        .eq("id", &id)
        .eq("agency_id", &user.id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        let code = StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err((code, text));
    }

    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}
