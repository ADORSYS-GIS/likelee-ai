const MIN_BASE_MONTHLY_CENTS: i64 = 15_000;
const DEFAULT_PRICING_GRACE_SECONDS: i64 = 60;

fn parse_rfc3339(value: Option<&str>) -> Option<chrono::DateTime<chrono::FixedOffset>> {
    value.and_then(|v| chrono::DateTime::parse_from_rfc3339(v).ok())
}

pub fn is_default_pricing(row: &serde_json::Value) -> bool {
    let monthly = row.get("base_monthly_price_cents").and_then(|v| v.as_i64());
    let matches_min = monthly == Some(MIN_BASE_MONTHLY_CENTS);
    if !matches_min {
        return false;
    }

    let created_at = parse_rfc3339(row.get("created_at").and_then(|v| v.as_str()));
    let pricing_updated_at = parse_rfc3339(row.get("pricing_updated_at").and_then(|v| v.as_str()));
    if pricing_updated_at.is_none() {
        return true;
    }
    match (created_at, pricing_updated_at) {
        (Some(created), Some(pricing)) => {
            (pricing - created).num_seconds() <= DEFAULT_PRICING_GRACE_SECONDS
        }
        _ => true,
    }
}

pub fn should_default_visibility_on(row: &serde_json::Value) -> bool {
    let public_visible = row.get("public_profile_visible").and_then(|v| v.as_bool());
    let visibility = row
        .get("visibility")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_lowercase();

    if public_visible != Some(false) {
        return false;
    }
    if !(visibility.is_empty() || visibility == "private") {
        return false;
    }
    if !is_default_pricing(row) {
        return false;
    }

    let created_at = parse_rfc3339(row.get("created_at").and_then(|v| v.as_str()));
    let updated_at = parse_rfc3339(row.get("updated_at").and_then(|v| v.as_str()));

    // Privacy-safe: if timestamps are missing or unparseable, default to false (keep private)
    match (created_at, updated_at) {
        (Some(created), Some(updated)) => updated == created,
        _ => false, // Conservative default: don't enable visibility when timestamps are missing
    }
}
