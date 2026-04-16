// Admin endpoints for system maintenance and operations
//
// These endpoints should be protected by admin-level authentication in production.

use crate::config::AppState;
use crate::storage::backfill::{backfill_storage_assets, verify_backfill_parity};
use axum::extract::{Query, State};
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
