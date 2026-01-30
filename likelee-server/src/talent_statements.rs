use crate::{auth::AuthUser, config::AppState};
use axum::{extract::Query, extract::State, http::StatusCode, Json};
use chrono::{Datelike, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;

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

fn parse_date(v: &str) -> Option<NaiveDate> {
    NaiveDate::parse_from_str(v, "%Y-%m-%d").ok()
}

pub async fn list(
    State(state): State<AppState>,
    user: AuthUser,
    Query(params): Query<TalentStatementsQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // Pull invoice items with their parent invoice + client snapshot.
    // PostgREST supports embedding via foreign keys: invoice_id -> agency_invoices.
    let resp = state
        .pg
        .from("agency_invoice_items")
        .select(
            "id,invoice_id,description,talent_id,talent_name,date_of_service,quantity,unit_price_cents,line_total_cents,agency_invoices!inner(id,agency_id,client_id,invoice_number,status,invoice_date,paid_at,agency_commission_bps,bill_to_company)",
        )
        .eq("agency_invoices.agency_id", &user.id)
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

    let rows: serde_json::Value =
        serde_json::from_str(&text).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let arr = rows.as_array().cloned().unwrap_or_default();

    let now = Utc::now();
    let current_year = now.year();
    let ytd_year = params.year.unwrap_or(current_year);

    let mut summary_by_talent: HashMap<String, TalentStatementSummary> = HashMap::new();
    let mut lines: Vec<TalentStatementLine> = vec![];

    for r in arr {
        let invoice = r.get("agency_invoices");
        let inv_obj = invoice.and_then(|v| v.as_object());
        let inv_agency_id = inv_obj
            .and_then(|o| o.get("agency_id"))
            .and_then(|v| v.as_str())
            .unwrap_or("");
        if inv_agency_id != user.id {
            continue;
        }

        let talent_id = r
            .get("talent_id")
            .and_then(|v| v.as_str())
            .filter(|s| !s.trim().is_empty())
            .unwrap_or("unknown")
            .to_string();

        if let Some(filter_id) = params.talent_id.as_ref().filter(|s| !s.trim().is_empty()) {
            if &talent_id != filter_id {
                continue;
            }
        }

        let talent_name = r
            .get("talent_name")
            .and_then(|v| v.as_str())
            .filter(|s| !s.trim().is_empty())
            .unwrap_or("(unknown)")
            .to_string();

        let status_str = inv_obj
            .and_then(|o| o.get("status"))
            .and_then(|v| v.as_str())
            .unwrap_or("draft")
            .to_string();

        let invoice_id = inv_obj
            .and_then(|o| o.get("id"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        let invoice_number = inv_obj
            .and_then(|o| o.get("invoice_number"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        let invoice_date = inv_obj
            .and_then(|o| o.get("invoice_date"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        let paid_at = inv_obj
            .and_then(|o| o.get("paid_at"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        let client_name = inv_obj
            .and_then(|o| o.get("bill_to_company"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        let commission_bps = inv_obj
            .and_then(|o| o.get("agency_commission_bps"))
            .and_then(|v| v.as_i64())
            .unwrap_or(2000);

        let gross_cents = r
            .get("line_total_cents")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);

        let agency_fee_cents = (gross_cents * commission_bps) / 10_000;
        let net_cents = gross_cents - agency_fee_cents;

        let owed = status_str == "sent";
        let paid = status_str == "paid" || paid_at.is_some();

        let ytd_paid = if let Some(paid_at_str) = paid_at.as_ref() {
            let paid_date = paid_at_str
                .split('T')
                .next()
                .and_then(|d| parse_date(d));
            paid && paid_date.map(|d| d.year() == ytd_year).unwrap_or(false)
        } else {
            false
        };

        let entry = summary_by_talent
            .entry(talent_id.clone())
            .or_insert(TalentStatementSummary {
                talent_id: talent_id.clone(),
                talent_name: talent_name.clone(),
                total_jobs: 0,
                total_owed_cents: 0,
                total_paid_ytd_cents: 0,
                last_payment_at: None,
            });

        entry.total_jobs += 1;
        if owed {
            entry.total_owed_cents += net_cents;
        }
        if ytd_paid {
            entry.total_paid_ytd_cents += net_cents;
        }
        if paid {
            if let Some(paid_at_str) = paid_at.as_ref() {
                let replace = match entry.last_payment_at.as_ref() {
                    None => true,
                    Some(prev) => prev < paid_at_str,
                };
                if replace {
                    entry.last_payment_at = Some(paid_at_str.clone());
                }
            }
        }

        lines.push(TalentStatementLine {
            talent_id,
            talent_name,
            invoice_id,
            invoice_number,
            invoice_date,
            client_name,
            description: r
                .get("description")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
            gross_cents,
            agency_fee_cents,
            net_cents,
            status: if owed { "sent".to_string() } else if paid { "paid".to_string() } else { status_str },
            paid_at,
        });
    }

    let mut summaries: Vec<TalentStatementSummary> = summary_by_talent.into_values().collect();
    summaries.sort_by(|a, b| b.total_owed_cents.cmp(&a.total_owed_cents));

    Ok(Json(json!({
        "year": ytd_year,
        "summaries": summaries,
        "lines": lines,
    })))
}
