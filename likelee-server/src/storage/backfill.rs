// Storage Assets Backfill Module
//
// This module provides functionality to backfill existing storage data into the
// storage_assets registry table. It supports dry-run mode for validation and
// includes comprehensive error handling and reporting.

use crate::config::AppState;
use crate::storage::{StorageAssetRecord, StorageContextType, StorageOwnerType, StorageVisibility};
use axum::http::StatusCode;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackfillStats {
    pub table_name: String,
    pub total_rows: usize,
    pub processed: usize,
    pub inserted: usize,
    pub skipped: usize,
    pub errors: usize,
    pub error_messages: Vec<String>,
}

impl BackfillStats {
    fn new(table_name: String) -> Self {
        Self {
            table_name,
            total_rows: 0,
            processed: 0,
            inserted: 0,
            skipped: 0,
            errors: 0,
            error_messages: Vec::new(),
        }
    }

    fn add_error(&mut self, message: String) {
        self.errors += 1;
        if self.error_messages.len() < 10 {
            // Keep only first 10 errors
            self.error_messages.push(message);
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackfillReport {
    pub dry_run: bool,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub tables: HashMap<String, BackfillStats>,
    pub total_inserted: usize,
    pub total_skipped: usize,
    pub total_errors: usize,
}

impl BackfillReport {
    fn new(dry_run: bool) -> Self {
        Self {
            dry_run,
            started_at: chrono::Utc::now().to_rfc3339(),
            completed_at: None,
            tables: HashMap::new(),
            total_inserted: 0,
            total_skipped: 0,
            total_errors: 0,
        }
    }

    fn finalize(&mut self) {
        self.completed_at = Some(chrono::Utc::now().to_rfc3339());
        for stats in self.tables.values() {
            self.total_inserted += stats.inserted;
            self.total_skipped += stats.skipped;
            self.total_errors += stats.errors;
        }
    }
}

/// Backfill configuration for a specific source table
#[derive(Debug, Clone)]
struct BackfillConfig {
    source_table: &'static str,
    context_type: StorageContextType,
    owner_type: StorageOwnerType,
    visibility: StorageVisibility,
    counts_toward_quota: bool,
    /// Function to extract owner_id from the row
    owner_id_extractor: fn(&serde_json::Value) -> Option<String>,
    /// Function to extract context_id from the row (optional)
    context_id_extractor: fn(&serde_json::Value) -> Option<String>,
}

/// Main backfill orchestrator
pub async fn backfill_storage_assets(
    state: &AppState,
    dry_run: bool,
) -> Result<BackfillReport, (StatusCode, String)> {
    let mut report = BackfillReport::new(dry_run);

    // Define backfill configurations for each table
    let configs = get_backfill_configs();

    for config in configs {
        let mut stats = BackfillStats::new(config.source_table.to_string());

        match backfill_table(state, &config, dry_run, &mut stats).await {
            Ok(_) => {
                report.tables.insert(config.source_table.to_string(), stats);
            }
            Err((code, msg)) => {
                stats.add_error(format!("Table backfill failed: {} - {}", code, msg));
                report.tables.insert(config.source_table.to_string(), stats);
            }
        }
    }

    report.finalize();
    Ok(report)
}

/// Backfill a single table
async fn backfill_table(
    state: &AppState,
    config: &BackfillConfig,
    dry_run: bool,
    stats: &mut BackfillStats,
) -> Result<(), (StatusCode, String)> {
    // Fetch rows from source table
    let response = state
        .pg
        .from(config.source_table)
        .select("*")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !status.is_success() {
        return Err((
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
            format!("Failed to fetch from {}: {}", config.source_table, text),
        ));
    }

    let rows: Vec<serde_json::Value> = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    stats.total_rows = rows.len();

    for row in rows {
        stats.processed += 1;

        // Check if already backfilled
        if let Some(source_id) = row.get("id").and_then(|v| v.as_str()) {
            if is_already_backfilled(state, config.source_table, source_id).await? {
                stats.skipped += 1;
                continue;
            }

            // Extract required fields
            let owner_id = match (config.owner_id_extractor)(&row) {
                Some(id) => id,
                None => {
                    stats.add_error(format!("Missing owner_id for row id: {}", source_id));
                    continue;
                }
            };

            let context_id = (config.context_id_extractor)(&row);

            // Extract storage fields
            let _bucket_id = row
                .get("storage_bucket")
                .and_then(|v| v.as_str())
                .unwrap_or_else(|| config.visibility.bucket(state));

            let object_path = match row.get("storage_path").and_then(|v| v.as_str()) {
                Some(path) if !path.is_empty() => path.to_string(),
                _ => {
                    stats.add_error(format!(
                        "Missing or empty storage_path for row id: {}",
                        source_id
                    ));
                    continue;
                }
            };

            let original_file_name = row
                .get("original_file_name")
                .or_else(|| row.get("file_name"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            let mime_type = row
                .get("mime_type")
                .or_else(|| row.get("content_type"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            let size_bytes = row
                .get("size_bytes")
                .or_else(|| row.get("file_size"))
                .and_then(|v| v.as_i64());

            let created_by = row
                .get("created_by")
                .or_else(|| row.get("user_id"))
                .or_else(|| row.get("uploaded_by"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            // Create storage asset record
            let record = StorageAssetRecord {
                owner_type: config.owner_type,
                owner_id,
                context_type: config.context_type,
                context_id,
                visibility: config.visibility,
                object_path,
                original_file_name,
                mime_type,
                size_bytes,
                checksum_sha256: None,
                source_table: Some(config.source_table.to_string()),
                source_id: Some(source_id.to_string()),
                created_by,
                counts_toward_quota: config.counts_toward_quota,
            };

            // Insert into storage_assets (unless dry-run)
            if !dry_run {
                match insert_backfill_record(state, &record).await {
                    Ok(_) => {
                        stats.inserted += 1;
                    }
                    Err((_, msg)) => {
                        stats.add_error(format!("Failed to insert row id {}: {}", source_id, msg));
                    }
                }
            } else {
                // In dry-run mode, just count as inserted
                stats.inserted += 1;
            }
        } else {
            stats.add_error("Row missing 'id' field".to_string());
        }
    }

    Ok(())
}

/// Check if a record is already backfilled
async fn is_already_backfilled(
    state: &AppState,
    source_table: &str,
    source_id: &str,
) -> Result<bool, (StatusCode, String)> {
    let response = state
        .pg
        .from("storage_assets")
        .select("id")
        .eq("source_table", source_table)
        .eq("source_id", source_id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !status.is_success() {
        return Ok(false); // Assume not backfilled if check fails
    }

    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    Ok(!rows.is_empty())
}

/// Insert a backfill record into storage_assets
async fn insert_backfill_record(
    state: &AppState,
    record: &StorageAssetRecord,
) -> Result<(), (StatusCode, String)> {
    let payload = json!({
        "owner_type": record.owner_type.as_str(),
        "owner_id": record.owner_id,
        "context_type": record.context_type.as_str(),
        "context_id": record.context_id,
        "visibility": record.visibility.as_str(),
        "bucket_id": record.visibility.bucket(state),
        "object_path": record.object_path,
        "original_file_name": record.original_file_name,
        "mime_type": record.mime_type,
        "size_bytes": record.size_bytes,
        "checksum_sha256": record.checksum_sha256,
        "source_table": record.source_table,
        "source_id": record.source_id,
        "created_by": record.created_by,
        "counts_toward_quota": record.counts_toward_quota,
    });

    let response = state
        .pg
        .from("storage_assets")
        .insert(payload.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = response.status();
    if !status.is_success() {
        let text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err((
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
            text,
        ));
    }

    Ok(())
}

/// Get backfill configurations for all tables
fn get_backfill_configs() -> Vec<BackfillConfig> {
    vec![
        // Reference Images (Creator-owned, Public, No Quota)
        BackfillConfig {
            source_table: "reference_images",
            context_type: StorageContextType::ReferenceImage,
            owner_type: StorageOwnerType::Creator,
            visibility: StorageVisibility::Public,
            counts_toward_quota: false,
            owner_id_extractor: |row| {
                row.get("creator_id")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            },
            context_id_extractor: |row| {
                row.get("section_id")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            },
        },
        // Voice Recordings (User-owned, Private, No Quota)
        BackfillConfig {
            source_table: "voice_recordings",
            context_type: StorageContextType::VoiceRecording,
            owner_type: StorageOwnerType::User,
            visibility: StorageVisibility::Private,
            counts_toward_quota: false,
            owner_id_extractor: |row| {
                row.get("user_id")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            },
            context_id_extractor: |_row| None,
        },
        // Talent Portfolio (Agency-owned, Public, Counts Quota)
        BackfillConfig {
            source_table: "talent_portfolio_items",
            context_type: StorageContextType::TalentPortfolio,
            owner_type: StorageOwnerType::Agency,
            visibility: StorageVisibility::Public,
            counts_toward_quota: true,
            owner_id_extractor: |row| {
                row.get("agency_id")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            },
            context_id_extractor: |row| {
                row.get("talent_id")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            },
        },
        // Booking Files (Agency-owned, Private, Counts Quota)
        BackfillConfig {
            source_table: "booking_files",
            context_type: StorageContextType::BookingFile,
            owner_type: StorageOwnerType::Agency,
            visibility: StorageVisibility::Private,
            counts_toward_quota: true,
            owner_id_extractor: |row| {
                row.get("agency_id")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            },
            context_id_extractor: |row| {
                row.get("booking_id")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            },
        },
        // Booking Deliverables (Agency-owned, Private, Counts Quota)
        BackfillConfig {
            source_table: "booking_deliverables",
            context_type: StorageContextType::BookingDeliverable,
            owner_type: StorageOwnerType::Agency,
            visibility: StorageVisibility::Private,
            counts_toward_quota: true,
            owner_id_extractor: |row| {
                row.get("agency_id")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            },
            context_id_extractor: |row| {
                row.get("booking_campaign_id")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            },
        },
        // Campaign Offer Deliverables (Agency-owned, Private, Counts Quota)
        BackfillConfig {
            source_table: "campaign_offer_deliverables",
            context_type: StorageContextType::CampaignOfferDeliverable,
            owner_type: StorageOwnerType::Agency,
            visibility: StorageVisibility::Private,
            counts_toward_quota: true,
            owner_id_extractor: |row| {
                // Need to resolve agency_id from campaign_offer
                row.get("agency_id")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            },
            context_id_extractor: |row| {
                row.get("campaign_offer_id")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            },
        },
        // Tax Documents (Agency-owned, Private, Counts Quota)
        BackfillConfig {
            source_table: "talent_tax_documents",
            context_type: StorageContextType::TaxDocument,
            owner_type: StorageOwnerType::Agency,
            visibility: StorageVisibility::Private,
            counts_toward_quota: true,
            owner_id_extractor: |row| {
                row.get("agency_id")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            },
            context_id_extractor: |row| {
                row.get("talent_id")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            },
        },
        // Brand Voice Assets (Brand-owned, Private, Counts Quota)
        BackfillConfig {
            source_table: "brand_voice_assets",
            context_type: StorageContextType::BrandVoiceAsset,
            owner_type: StorageOwnerType::Brand,
            visibility: StorageVisibility::Private,
            counts_toward_quota: true,
            owner_id_extractor: |row| {
                row.get("brand_id")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            },
            context_id_extractor: |_row| None,
        },
        // Studio Campaign Documents (User-owned, Private, No Quota)
        BackfillConfig {
            source_table: "studio_campaign_documents",
            context_type: StorageContextType::StudioDocument,
            owner_type: StorageOwnerType::User,
            visibility: StorageVisibility::Private,
            counts_toward_quota: false,
            owner_id_extractor: |row| {
                row.get("user_id")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            },
            context_id_extractor: |row| {
                row.get("campaign_id")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            },
        },
    ]
}

/// Verify backfill parity - compare registry counts with source tables
pub async fn verify_backfill_parity(
    state: &AppState,
) -> Result<HashMap<String, ParityCheck>, (StatusCode, String)> {
    let mut results = HashMap::new();

    let tables = vec![
        "reference_images",
        "voice_recordings",
        "talent_portfolio_items",
        "booking_files",
        "booking_deliverables",
        "campaign_offer_deliverables",
        "talent_tax_documents",
        "brand_voice_assets",
        "studio_campaign_documents",
    ];

    for table in tables {
        let parity = check_table_parity(state, table).await?;
        results.insert(table.to_string(), parity);
    }

    Ok(results)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParityCheck {
    pub source_table: String,
    pub source_count: usize,
    pub registry_count: usize,
    pub source_total_bytes: i64,
    pub registry_total_bytes: i64,
    pub matches: bool,
    pub discrepancy: i64,
}

async fn check_table_parity(
    state: &AppState,
    table: &str,
) -> Result<ParityCheck, (StatusCode, String)> {
    // Count rows in source table
    let source_response = state
        .pg
        .from(table)
        .select("id,size_bytes,file_size")
        .not("is", "storage_path", "null")
        .neq("storage_path", "")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let source_text = source_response
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let source_rows: Vec<serde_json::Value> =
        serde_json::from_str(&source_text).unwrap_or_default();
    let source_count = source_rows.len();
    let source_total_bytes: i64 = source_rows
        .iter()
        .filter_map(|row| {
            row.get("size_bytes")
                .or_else(|| row.get("file_size"))
                .and_then(|v| v.as_i64())
        })
        .sum();

    // Count rows in registry
    let registry_response = state
        .pg
        .from("storage_assets")
        .select("id,size_bytes")
        .eq("source_table", table)
        .is("deleted_at", "null")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let registry_text = registry_response
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let registry_rows: Vec<serde_json::Value> =
        serde_json::from_str(&registry_text).unwrap_or_default();
    let registry_count = registry_rows.len();
    let registry_total_bytes: i64 = registry_rows
        .iter()
        .filter_map(|row| row.get("size_bytes").and_then(|v| v.as_i64()))
        .sum();

    let matches = source_count == registry_count;
    let discrepancy = source_count as i64 - registry_count as i64;

    Ok(ParityCheck {
        source_table: table.to_string(),
        source_count,
        registry_count,
        source_total_bytes,
        registry_total_bytes,
        matches,
        discrepancy,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_backfill_stats_initialization() {
        let stats = BackfillStats::new("test_table".to_string());
        assert_eq!(stats.table_name, "test_table");
        assert_eq!(stats.total_rows, 0);
        assert_eq!(stats.processed, 0);
        assert_eq!(stats.inserted, 0);
        assert_eq!(stats.skipped, 0);
        assert_eq!(stats.errors, 0);
        assert!(stats.error_messages.is_empty());
    }

    #[test]
    fn test_backfill_stats_add_error() {
        let mut stats = BackfillStats::new("test_table".to_string());
        stats.add_error("Error 1".to_string());
        stats.add_error("Error 2".to_string());

        assert_eq!(stats.errors, 2);
        assert_eq!(stats.error_messages.len(), 2);
        assert_eq!(stats.error_messages[0], "Error 1");
        assert_eq!(stats.error_messages[1], "Error 2");
    }

    #[test]
    fn test_backfill_stats_error_limit() {
        let mut stats = BackfillStats::new("test_table".to_string());

        // Add more than 10 errors
        for i in 0..15 {
            stats.add_error(format!("Error {}", i));
        }

        assert_eq!(stats.errors, 15);
        assert_eq!(stats.error_messages.len(), 10); // Should cap at 10
    }

    #[test]
    fn test_backfill_report_initialization() {
        let report = BackfillReport::new(true);
        assert!(report.dry_run);
        assert!(report.tables.is_empty());
        assert_eq!(report.total_inserted, 0);
        assert_eq!(report.total_skipped, 0);
        assert_eq!(report.total_errors, 0);
        assert!(report.completed_at.is_none());
    }

    #[test]
    fn test_backfill_report_finalize() {
        let mut report = BackfillReport::new(false);

        let mut stats1 = BackfillStats::new("table1".to_string());
        stats1.inserted = 10;
        stats1.skipped = 2;
        stats1.errors = 1;

        let mut stats2 = BackfillStats::new("table2".to_string());
        stats2.inserted = 20;
        stats2.skipped = 3;
        stats2.errors = 0;

        report.tables.insert("table1".to_string(), stats1);
        report.tables.insert("table2".to_string(), stats2);

        report.finalize();

        assert_eq!(report.total_inserted, 30);
        assert_eq!(report.total_skipped, 5);
        assert_eq!(report.total_errors, 1);
        assert!(report.completed_at.is_some());
    }

    #[test]
    fn test_backfill_configs_count() {
        let configs = get_backfill_configs();
        assert_eq!(configs.len(), 9); // Should have 9 tables to backfill
    }

    #[test]
    fn test_backfill_configs_quota_rules() {
        let configs = get_backfill_configs();

        // Creator-owned assets should NOT count toward quota
        let reference_images = configs
            .iter()
            .find(|c| c.source_table == "reference_images")
            .unwrap();
        assert_eq!(reference_images.owner_type, StorageOwnerType::Creator);
        assert!(!reference_images.counts_toward_quota);

        let voice_recordings = configs
            .iter()
            .find(|c| c.source_table == "voice_recordings")
            .unwrap();
        assert_eq!(voice_recordings.owner_type, StorageOwnerType::User);
        assert!(!voice_recordings.counts_toward_quota);

        // Agency-owned assets SHOULD count toward quota
        let talent_portfolio = configs
            .iter()
            .find(|c| c.source_table == "talent_portfolio_items")
            .unwrap();
        assert_eq!(talent_portfolio.owner_type, StorageOwnerType::Agency);
        assert!(talent_portfolio.counts_toward_quota);

        let booking_files = configs
            .iter()
            .find(|c| c.source_table == "booking_files")
            .unwrap();
        assert_eq!(booking_files.owner_type, StorageOwnerType::Agency);
        assert!(booking_files.counts_toward_quota);
    }

    #[test]
    fn test_backfill_configs_visibility() {
        let configs = get_backfill_configs();

        // Public assets
        let reference_images = configs
            .iter()
            .find(|c| c.source_table == "reference_images")
            .unwrap();
        assert_eq!(reference_images.visibility, StorageVisibility::Public);

        let talent_portfolio = configs
            .iter()
            .find(|c| c.source_table == "talent_portfolio_items")
            .unwrap();
        assert_eq!(talent_portfolio.visibility, StorageVisibility::Public);

        // Private assets
        let voice_recordings = configs
            .iter()
            .find(|c| c.source_table == "voice_recordings")
            .unwrap();
        assert_eq!(voice_recordings.visibility, StorageVisibility::Private);

        let booking_files = configs
            .iter()
            .find(|c| c.source_table == "booking_files")
            .unwrap();
        assert_eq!(booking_files.visibility, StorageVisibility::Private);
    }

    #[test]
    fn test_parity_check_structure() {
        let parity = ParityCheck {
            source_table: "test_table".to_string(),
            source_count: 100,
            registry_count: 100,
            source_total_bytes: 1024000,
            registry_total_bytes: 1024000,
            matches: true,
            discrepancy: 0,
        };

        assert!(parity.matches);
        assert_eq!(parity.discrepancy, 0);
    }

    #[test]
    fn test_parity_check_discrepancy() {
        let parity = ParityCheck {
            source_table: "test_table".to_string(),
            source_count: 100,
            registry_count: 95,
            source_total_bytes: 1024000,
            registry_total_bytes: 972800,
            matches: false,
            discrepancy: 5,
        };

        assert!(!parity.matches);
        assert_eq!(parity.discrepancy, 5);
    }
}
