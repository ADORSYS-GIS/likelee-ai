use super::support::internal_error;
use super::types::BrandAgencyConnection;
use crate::{state::AppState, errors::sanitize_db_error};
use axum::http::StatusCode;
use std::time::Duration as StdDuration;

const CACHE_NAMESPACE_BRAND_AGENCY_CONN: &str = "brand_agency_conn";
const BRAND_AGENCY_CONN_CACHE_TTL_SECS: u64 = 60;

pub async fn check_brand_agency_connection(
    state: &AppState,
    brand_id: &str,
    agency_id: &str,
) -> Result<Option<BrandAgencyConnection>, (StatusCode, String)> {
    let cache_key = format!(
        "{}:{}",
        CACHE_NAMESPACE_BRAND_AGENCY_CONN,
        crate::cache::cache_key(brand_id, agency_id)
    );

    if let Some(cached) = state.cache_l3.get_json::<BrandAgencyConnection>(&cache_key) {
        tracing::debug!(
            brand_id = %brand_id,
            agency_id = %agency_id,
            status = %cached.status,
            "Brand-agency connection cache hit"
        );
        state.cache_metrics.hit(crate::cache::CacheLevel::L3);

        if cached.status == "active" || cached.status == "accepted" {
            return Ok(Some(cached));
        }
        return Ok(None);
    }

    state.cache_metrics.miss(crate::cache::CacheLevel::L3);

    let resp = state
        .pg
        .from("brand_agency_connections")
        .select("id,brand_id,agency_id,status")
        .eq("brand_id", brand_id)
        .eq("agency_id", agency_id)
        .limit(1)
        .execute()
        .await
        .map_err(internal_error)?;

    let status = resp.status();
    let text = resp.text().await.map_err(internal_error)?;

    if !status.is_success() {
        if text.contains("brand_agency_connections") && text.contains("does not exist") {
            return Ok(None);
        }
        return Err(sanitize_db_error(status.as_u16(), text));
    }

    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();

    if let Some(row) = rows.first() {
        let conn = BrandAgencyConnection {
            brand_id: row
                .get("brand_id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
            agency_id: row
                .get("agency_id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
            status: row
                .get("status")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
        };

        state.cache_l3.set_json(
            &cache_key,
            &conn,
            Some(StdDuration::from_secs(BRAND_AGENCY_CONN_CACHE_TTL_SECS)),
        );

        tracing::debug!(
            brand_id = %brand_id,
            agency_id = %agency_id,
            status = %conn.status,
            "Brand-agency connection cached"
        );

        if conn.status == "active" || conn.status == "accepted" {
            return Ok(Some(conn));
        }
    }

    let placeholder = BrandAgencyConnection {
        brand_id: brand_id.to_string(),
        agency_id: agency_id.to_string(),
        status: "none".to_string(),
    };

    state.cache_l3.set_json(
        &cache_key,
        &placeholder,
        Some(StdDuration::from_secs(BRAND_AGENCY_CONN_CACHE_TTL_SECS)),
    );

    Ok(None)
}

pub fn invalidate_brand_agency_connection_cache(state: &AppState, brand_id: &str, agency_id: &str) {
    let cache_key = format!(
        "{}:{}",
        CACHE_NAMESPACE_BRAND_AGENCY_CONN,
        crate::cache::cache_key(brand_id, agency_id)
    );

    state.cache_l3.delete(&cache_key);

    tracing::debug!(
        brand_id = %brand_id,
        agency_id = %agency_id,
        "Brand-agency connection cache invalidated"
    );
}
