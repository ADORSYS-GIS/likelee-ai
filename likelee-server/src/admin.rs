// Admin endpoints for system maintenance and operations
//
// These endpoints should be protected by admin-level authentication in production.

use crate::config::AppState;
use crate::errors::sanitize_db_error;
use crate::storage::backfill::{backfill_storage_assets, verify_backfill_parity};
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::Json;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct BackfillParams {
    /// If true, performs a dry-run without actually inserting records
    #[serde(default)]
    pub dry_run: bool,
}

#[derive(Debug, Serialize)]
pub struct BackfillResponse {
    pub success: bool,
    pub message: String,
    pub report: serde_json::Value,
}

/// POST /api/admin/storage/backfill
///
/// Backfill existing storage data into the storage_assets registry.
///
/// Query Parameters:
/// - dry_run: boolean (default: false) - If true, performs validation without inserting
///
/// This endpoint:
/// 1. Scans all source tables for storage records
/// 2. Checks if each record is already in storage_assets
/// 3. Inserts missing records (unless dry_run=true)
/// 4. Returns a detailed report of the operation
///
/// Example:
/// ```text
/// POST /api/admin/storage/backfill?dry_run=true
/// ```
pub async fn backfill_storage(
    State(state): State<AppState>,
    Query(params): Query<BackfillParams>,
) -> Result<Json<BackfillResponse>, (StatusCode, String)> {
    let report = backfill_storage_assets(&state, params.dry_run).await?;

    let message = if params.dry_run {
        format!(
            "Dry-run complete: {} records would be inserted, {} skipped, {} errors",
            report.total_inserted, report.total_skipped, report.total_errors
        )
    } else {
        format!(
            "Backfill complete: {} records inserted, {} skipped, {} errors",
            report.total_inserted, report.total_skipped, report.total_errors
        )
    };

    Ok(Json(BackfillResponse {
        success: report.total_errors == 0,
        message,
        report: serde_json::to_value(&report)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?,
    }))
}

/// GET /api/admin/storage/verify-parity
///
/// Verify that storage_assets registry matches source tables.
///
/// This endpoint:
/// 1. Counts rows in each source table
/// 2. Counts corresponding rows in storage_assets
/// 3. Compares total bytes
/// 4. Returns a detailed parity report
///
/// Use this to verify backfill completeness before switching to registry-based quota.
pub async fn verify_storage_parity(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let parity_checks = verify_backfill_parity(&state).await?;

    let mut all_match = true;
    for check in parity_checks.values() {
        if !check.matches {
            all_match = false;
            break;
        }
    }

    let summary = serde_json::json!({
        "all_tables_match": all_match,
        "checks": parity_checks,
        "timestamp": chrono::Utc::now().to_rfc3339(),
    });

    Ok(Json(summary))
}

#[derive(Debug, Serialize)]
pub struct BrandStorageSummary {
    pub brand_id: String,
    pub company_name: Option<String>,
    pub used_bytes: i64,
    pub limit_bytes: i64,
    pub file_count: i64,
}

#[derive(Debug, Serialize)]
pub struct ListBrandsStorageResponse {
    pub brands: Vec<BrandStorageSummary>,
    pub total_bytes: i64,
    pub total_limit: i64,
}

/// GET /api/admin/storage/brands
///
/// List all brands with their storage usage.
pub async fn list_brands_storage(
    State(state): State<AppState>,
) -> Result<Json<ListBrandsStorageResponse>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("brands")
        .select("id,company_name")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        let code =
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err(sanitize_db_error(code.as_u16(), text));
    }

    let brands_json: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let brands_array = brands_json.as_array().cloned().unwrap_or_default();

    let mut summaries = Vec::new();
    let mut total_bytes = 0i64;
    let mut total_limit = 0i64;

    for brand in brands_array {
        let brand_id = brand
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let company_name = brand
            .get("company_name")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        if brand_id.is_empty() {
            continue;
        }

        let limit = crate::brand_storage::ensure_brand_storage_settings_row(&state, &brand_id)
            .await
            .unwrap_or(5_368_709_120);
        let used = crate::brand_storage::get_brand_used_storage_bytes(&state, &brand_id)
            .await
            .unwrap_or(0);

        let count_resp = state
            .pg
            .from("brand_files")
            .select("id")
            .eq("brand_id", &brand_id)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let count_text = count_resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let count_json: serde_json::Value =
            serde_json::from_str(&count_text).unwrap_or(serde_json::json!([]));
        let file_count = count_json.as_array().map(|a| a.len() as i64).unwrap_or(0);

        total_bytes += used;
        total_limit += limit;

        summaries.push(BrandStorageSummary {
            brand_id,
            company_name,
            used_bytes: used,
            limit_bytes: limit,
            file_count,
        });
    }

    Ok(Json(ListBrandsStorageResponse {
        brands: summaries,
        total_bytes,
        total_limit,
    }))
}

#[derive(Debug, Deserialize)]
pub struct UpdateQuotaBody {
    pub storage_limit_bytes: i64,
}

#[derive(Debug, Serialize)]
pub struct UpdateQuotaResponse {
    pub brand_id: String,
    pub storage_limit_bytes: i64,
}

/// PATCH /api/admin/storage/brands/:brand_id/quota
///
/// Update storage quota for a specific brand.
pub async fn update_brand_quota(
    State(state): State<AppState>,
    Path(brand_id): Path<String>,
    Json(body): Json<UpdateQuotaBody>,
) -> Result<Json<UpdateQuotaResponse>, (StatusCode, String)> {
    let update = serde_json::json!({
        "brand_id": &brand_id,
        "storage_limit_bytes": body.storage_limit_bytes,
    });
    let resp = state
        .pg
        .from("brand_storage_settings")
        .upsert(update.to_string())
        .eq("brand_id", &brand_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        let code =
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err(sanitize_db_error(code.as_u16(), text));
    }

    Ok(Json(UpdateQuotaResponse {
        brand_id,
        storage_limit_bytes: body.storage_limit_bytes,
    }))
}

#[derive(Debug, Serialize)]
pub struct PlatformStorageAnalytics {
    pub total_brands: i64,
    pub total_files: i64,
    pub total_bytes: i64,
    pub by_source_type: Vec<serde_json::Value>,
    pub by_mime_type: Vec<serde_json::Value>,
}

/// GET /api/admin/storage/analytics
///
/// Get platform-wide storage analytics.
pub async fn get_platform_storage_analytics(
    State(state): State<AppState>,
) -> Result<Json<PlatformStorageAnalytics>, (StatusCode, String)> {
    let brands_resp = state
        .pg
        .from("brands")
        .select("id")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let brands_text = brands_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let brands_json: serde_json::Value =
        serde_json::from_str(&brands_text).unwrap_or(serde_json::json!([]));
    let total_brands = brands_json.as_array().map(|a| a.len() as i64).unwrap_or(0);

    let files_resp = state
        .pg
        .from("brand_files")
        .select("id,size_bytes")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let files_text = files_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let files_json: serde_json::Value =
        serde_json::from_str(&files_text).unwrap_or(serde_json::json!([]));
    let files_array = files_json.as_array().cloned().unwrap_or_default();
    let total_files = files_array.len() as i64;
    let total_bytes: i64 = files_array
        .iter()
        .map(|f| f.get("size_bytes").and_then(|x| x.as_i64()).unwrap_or(0))
        .sum();

    let analytics_resp = state
        .pg
        .from("brand_storage_analytics")
        .select("*")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let analytics_text = analytics_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let analytics_json: serde_json::Value =
        serde_json::from_str(&analytics_text).unwrap_or(serde_json::json!([]));
    let analytics_array = analytics_json.as_array().cloned().unwrap_or_default();

    let mut by_source_type_map: std::collections::HashMap<String, serde_json::Value> =
        std::collections::HashMap::new();
    let mut by_mime_type_map: std::collections::HashMap<String, serde_json::Value> =
        std::collections::HashMap::new();

    for row in analytics_array {
        let source_type = row
            .get("source_type")
            .and_then(|x| x.as_str())
            .unwrap_or("upload")
            .to_string();
        let mime_type = row
            .get("mime_type")
            .and_then(|x| x.as_str())
            .unwrap_or("unknown")
            .to_string();
        let file_count = row.get("file_count").and_then(|x| x.as_i64()).unwrap_or(0);
        let row_bytes = row.get("total_bytes").and_then(|x| x.as_i64()).unwrap_or(0);

        by_source_type_map
            .entry(source_type.clone())
            .and_modify(|e| {
                let obj = e.as_object_mut().unwrap();
                let count = obj.get("file_count").and_then(|x| x.as_i64()).unwrap_or(0);
                let bytes = obj.get("total_bytes").and_then(|x| x.as_i64()).unwrap_or(0);
                obj.insert(
                    "file_count".to_string(),
                    serde_json::json!(count + file_count),
                );
                obj.insert(
                    "total_bytes".to_string(),
                    serde_json::json!(bytes + row_bytes),
                );
            })
            .or_insert_with(|| {
                serde_json::json!({
                    "source_type": source_type,
                    "file_count": file_count,
                    "total_bytes": row_bytes,
                })
            });

        by_mime_type_map
            .entry(mime_type.clone())
            .and_modify(|e| {
                let obj = e.as_object_mut().unwrap();
                let count = obj.get("file_count").and_then(|x| x.as_i64()).unwrap_or(0);
                let bytes = obj.get("total_bytes").and_then(|x| x.as_i64()).unwrap_or(0);
                obj.insert(
                    "file_count".to_string(),
                    serde_json::json!(count + file_count),
                );
                obj.insert(
                    "total_bytes".to_string(),
                    serde_json::json!(bytes + row_bytes),
                );
            })
            .or_insert_with(|| {
                serde_json::json!({
                    "mime_type": mime_type,
                    "file_count": file_count,
                    "total_bytes": row_bytes,
                })
            });
    }

    let mut by_source_type: Vec<serde_json::Value> = by_source_type_map.into_values().collect();
    let mut by_mime_type: Vec<serde_json::Value> = by_mime_type_map.into_values().collect();
    by_source_type.sort_by(|a, b| {
        a.get("source_type")
            .and_then(|x| x.as_str())
            .unwrap_or("")
            .cmp(b.get("source_type").and_then(|x| x.as_str()).unwrap_or(""))
    });
    by_mime_type.sort_by(|a, b| {
        a.get("mime_type")
            .and_then(|x| x.as_str())
            .unwrap_or("")
            .cmp(b.get("mime_type").and_then(|x| x.as_str()).unwrap_or(""))
    });

    Ok(Json(PlatformStorageAnalytics {
        total_brands,
        total_files,
        total_bytes,
        by_source_type,
        by_mime_type,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_backfill_params_default() {
        let json = r#"{}"#;
        let params: BackfillParams = serde_json::from_str(json).unwrap();
        assert!(!params.dry_run);
    }

    #[test]
    fn test_backfill_params_dry_run() {
        let json = r#"{"dry_run": true}"#;
        let params: BackfillParams = serde_json::from_str(json).unwrap();
        assert!(params.dry_run);
    }

    #[test]
    fn test_backfill_response_structure() {
        let response = BackfillResponse {
            success: true,
            message: "Test message".to_string(),
            report: serde_json::json!({"test": "data"}),
        };

        assert!(response.success);
        assert_eq!(response.message, "Test message");
        assert_eq!(response.report["test"], "data");
    }
}
