pub mod utils {}

use serde_json::Value;

pub fn parse_budget_cents(budget_snapshot: &Value) -> i64 {
    let snapshot = budget_snapshot.as_object().cloned().unwrap_or_default();

    let raw_value = snapshot
        .get("budget_total")
        .cloned()
        .or_else(|| snapshot.get("total_amount").cloned())
        .or_else(|| snapshot.get("amount").cloned())
        .unwrap_or(Value::Null);

    if let Some(cents) = raw_value.as_i64() {
        return cents.max(0);
    }

    if let Some(amount) = raw_value.as_f64() {
        return ((amount.max(0.0)) * 100.0).round() as i64;
    }

    if let Some(raw) = raw_value.as_str() {
        let normalized = raw.replace(['$', ','], "").trim().to_string();
        if normalized.is_empty() {
            return 0;
        }
        let amount = normalized.parse::<f64>().unwrap_or(0.0);
        return ((amount.max(0.0)) * 100.0).round() as i64;
    }

    0
}

pub fn parse_paid_at(
    offer: &Value,
    fallback_now: chrono::DateTime<chrono::Utc>,
) -> chrono::DateTime<chrono::Utc> {
    let candidates = ["paid_at", "created_at"];

    for field in candidates {
        let raw = offer
            .get(field)
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim();
        if raw.is_empty() {
            continue;
        }
        if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(raw) {
            return dt.with_timezone(&chrono::Utc);
        }
    }

    fallback_now
}
