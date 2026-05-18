use super::*;
use crate::{
    auth::{AuthUser, RoleGuard},
    state::AppState,
};
use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use serde::Serialize;
use std::collections::{HashMap, HashSet};

#[derive(Debug, Serialize)]
pub struct AnalyticsDashboard {
    pub overview: OverviewMetrics,
    pub campaign_status: CampaignStatusBreakdown,
    pub ai_usage: AIUsageMetrics,
    pub monthly_trends: Vec<MonthlyTrend>,
    pub consent_status: ConsentStatusBreakdown,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AnalyticsMode {
    Ai,
    Irl,
}

#[derive(Debug, serde::Deserialize)]
pub struct AnalyticsModeQuery {
    pub mode: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct OverviewMetrics {
    pub total_earnings_cents: i64,
    pub total_earnings_formatted: String,
    pub earnings_growth_percentage: f64,
    pub active_campaigns: i64,
    pub active_campaigns_growth_percentage: f64,
    pub total_value_cents: i64,
    pub avg_value_cents: i64,
    pub avg_value_formatted: String,
    pub top_scope: String,
}

#[derive(Debug, Serialize)]
pub struct CampaignStatusBreakdown {
    pub in_progress: i64,
    pub ready_to_launch: i64,
    pub completed: i64,
}

#[derive(Debug, Serialize)]
pub struct AIUsageMetrics {
    pub total_usages_30d: i64,
    pub usages_growth_percentage: f64,
    pub avg_campaign_value_cents: i64,
    pub avg_campaign_value_formatted: String,
    pub usage_by_type: AIUsageByType,
}

#[derive(Debug, Serialize)]
pub struct AIUsageByType {
    pub image: i64,
    pub video: i64,
    pub voice: i64,
}

#[derive(Debug, Serialize)]
pub struct MonthlyTrend {
    pub month: String,
    pub earnings: f64,
    pub campaigns: i64,
    pub usages: i64,
}

#[derive(Debug, Serialize)]
pub struct ConsentStatusBreakdown {
    pub complete: i64,
    pub missing: i64,
    pub expiring: i64,
    pub expiring_current_month: i64,
    pub total: i64,
    pub verified: i64,
    pub total_talents: i64,
}

/// GET /api/agency/analytics/dashboard
pub async fn get_analytics_dashboard(
    State(state): State<AppState>,
    Query(q): Query<AnalyticsModeQuery>,
    auth_user: AuthUser,
) -> Result<Json<AnalyticsDashboard>, (StatusCode, String)> {
    RoleGuard::new(vec!["agency"]).check(&auth_user.role)?;
    let agency_id = auth_user.effective_org_id();
    let mode = parse_mode(q.mode.as_deref());
    let now = Utc::now();
    let thirty_days_ago = (now - chrono::Duration::days(30)).to_rfc3339();
    let sixty_days_ago = (now - chrono::Duration::days(60)).to_rfc3339();
    let five_months_ago = (now - chrono::Duration::days(150)).to_rfc3339(); // Approx 5 months
    let today = now.format("%Y-%m-%d").to_string();
    let ten_days_hence = (now + chrono::Duration::days(10))
        .format("%Y-%m-%d")
        .to_string();

    if mode == AnalyticsMode::Ai {
        // --- AI MODE: earnings from licensing_payouts, licenses from licensing_requests ---
        let payouts_resp = state
            .pg
            .from("licensing_payouts")
            .select("amount_cents, paid_at, talent_id")
            .eq("agency_id", agency_id)
            .gte("paid_at", &five_months_ago)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let payouts_text = payouts_resp
            .text()
            .await
            .unwrap_or_else(|_| "[]".to_string());
        let payouts_data: Vec<serde_json::Value> =
            serde_json::from_str(&payouts_text).unwrap_or(vec![]);

        // Fetch licensing requests (campaigns equivalent in AI mode)
        let requests_resp = state
            .pg
            .from("licensing_requests")
            .select("id, status, created_at, deadline")
            .eq("agency_id", agency_id)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let requests_text = requests_resp
            .text()
            .await
            .unwrap_or_else(|_| "[]".to_string());
        let requests_data: Vec<serde_json::Value> =
            serde_json::from_str(&requests_text).unwrap_or(vec![]);

        let active_licenses_count = requests_data
            .iter()
            .filter(|r| {
                let status = r.get("status").and_then(|v| v.as_str()).unwrap_or("");
                let deadline = r.get("deadline").and_then(|v| v.as_str()).unwrap_or("");
                // Active if approved and not past deadline
                status == "approved" && deadline >= today.as_str()
            })
            .count() as i64;

        // Calculate active licenses count 30 days ago using proper DB query
        let thirty_days_ago_date = (now - chrono::Duration::days(30))
            .format("%Y-%m-%d")
            .to_string();

        // Query for licenses that were active 30 days ago
        let prev_requests_resp = state
            .pg
            .from("licensing_requests")
            .select("id, status, deadline")
            .eq("agency_id", agency_id)
            .eq("status", "approved")
            .gte("deadline", &thirty_days_ago_date)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let prev_requests_text = prev_requests_resp
            .text()
            .await
            .unwrap_or_else(|_| "[]".to_string());
        let prev_requests_data: Vec<serde_json::Value> =
            serde_json::from_str(&prev_requests_text).unwrap_or(vec![]);

        let prev_active_licenses_count = prev_requests_data.len() as i64;

        let active_campaigns_growth_percentage = if prev_active_licenses_count > 0 {
            let growth = ((active_licenses_count - prev_active_licenses_count) as f64
                / prev_active_licenses_count as f64)
                * 100.0;
            growth.clamp(-100.0, 100.0)
        } else if active_licenses_count > 0 {
            100.0
        } else {
            0.0
        };

        // A. OVERVIEW & GROWTH (Payouts in last 30d vs prev 30d)
        let total_earnings_cents: i64 = payouts_data
            .iter()
            .filter(|p| {
                let paid_at = p.get("paid_at").and_then(|v| v.as_str()).unwrap_or("");
                paid_at >= thirty_days_ago.as_str()
            })
            .filter_map(|p| p.get("amount_cents").and_then(|v| v.as_i64()))
            .sum();

        let prev_earnings_cents: i64 = payouts_data
            .iter()
            .filter(|p| {
                let paid_at = p.get("paid_at").and_then(|v| v.as_str()).unwrap_or("");
                paid_at >= sixty_days_ago.as_str() && paid_at < thirty_days_ago.as_str()
            })
            .filter_map(|p| p.get("amount_cents").and_then(|v| v.as_i64()))
            .sum();

        let earnings_growth_percentage = if prev_earnings_cents > 0 {
            let growth = ((total_earnings_cents - prev_earnings_cents) as f64
                / prev_earnings_cents as f64)
                * 100.0;
            growth.clamp(-100.0, 100.0)
        } else if total_earnings_cents > 0 {
            100.0
        } else {
            0.0
        };

        // B. MONTHLY TRENDS
        let mut monthly_trends = Vec::new();
        for i in (0..5).rev() {
            let month_start_date = now - chrono::Duration::days(30 * i);
            let month_start = month_start_date.format("%Y-%m-01").to_string();
            let month_end = if i == 0 {
                now.to_rfc3339()
            } else {
                (now - chrono::Duration::days(30 * (i - 1)))
                    .format("%Y-%m-01")
                    .to_string()
            };

            let month_earnings: i64 = payouts_data
                .iter()
                .filter(|p| {
                    let paid_at = p.get("paid_at").and_then(|v| v.as_str()).unwrap_or("");
                    paid_at >= month_start.as_str() && paid_at < month_end.as_str()
                })
                .filter_map(|p| p.get("amount_cents").and_then(|v| v.as_i64()))
                .sum();

            let month_licenses: i64 = requests_data
                .iter()
                .filter(|r| {
                    let status = r.get("status").and_then(|v| v.as_str()).unwrap_or("");
                    let created_at = r.get("created_at").and_then(|v| v.as_str()).unwrap_or("");
                    status == "approved"
                        && created_at >= month_start.as_str()
                        && created_at < month_end.as_str()
                })
                .count() as i64;

            monthly_trends.push(MonthlyTrend {
                month: month_start_date.format("%b").to_string(),
                earnings: month_earnings as f64 / 100.0,
                campaigns: month_licenses,
                usages: 60 + (i * 3), // Mock
            });
        }

        let total_earnings_formatted = format_currency(total_earnings_cents);

        // B. AI USAGE — Calculate from catalogs sent to clients using aggregated queries
        // Count total assets (not catalogs) and calculate growth

        // Get all catalog IDs for the last 30 days in one query
        let catalogs_30d_resp = state
            .pg
            .from("agency_catalogs")
            .select("id")
            .eq("agency_id", agency_id)
            .gte("created_at", &thirty_days_ago)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let catalogs_30d_text = catalogs_30d_resp
            .text()
            .await
            .unwrap_or_else(|_| "[]".to_string());
        let catalogs_30d_data: Vec<serde_json::Value> =
            serde_json::from_str(&catalogs_30d_text).unwrap_or(vec![]);

        // Get all catalog IDs for the previous 30 days in one query
        let catalogs_prev_resp = state
            .pg
            .from("agency_catalogs")
            .select("id")
            .eq("agency_id", agency_id)
            .gte("created_at", &sixty_days_ago)
            .lt("created_at", &thirty_days_ago)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let catalogs_prev_text = catalogs_prev_resp
            .text()
            .await
            .unwrap_or_else(|_| "[]".to_string());
        let catalogs_prev_data: Vec<serde_json::Value> =
            serde_json::from_str(&catalogs_prev_text).unwrap_or(vec![]);

        let mut total_assets_30d = 0i64;
        let mut total_assets_prev = 0i64;
        let mut video_total = 0.0;
        let mut voice_total = 0.0;
        let mut image_total = 0.0;

        // Process current period catalogs with bulk queries
        if !catalogs_30d_data.is_empty() {
            let catalog_ids_30d: Vec<String> = catalogs_30d_data
                .iter()
                .filter_map(|c| c.get("id").and_then(|v| v.as_str()))
                .map(|s| s.to_string())
                .collect();

            if !catalog_ids_30d.is_empty() {
                // Get all catalog items for these catalogs in one query
                let items_resp = state
                    .pg
                    .from("agency_catalog_items")
                    .select("id, catalog_id")
                    .in_("catalog_id", catalog_ids_30d)
                    .execute()
                    .await
                    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
                let items_text = items_resp.text().await.unwrap_or_else(|_| "[]".to_string());
                let items_data: Vec<serde_json::Value> =
                    serde_json::from_str(&items_text).unwrap_or(vec![]);

                if !items_data.is_empty() {
                    let item_ids: Vec<String> = items_data
                        .iter()
                        .filter_map(|i| i.get("id").and_then(|v| v.as_str()))
                        .map(|s| s.to_string())
                        .collect();

                    if !item_ids.is_empty() {
                        // Get all assets for these items in one query
                        let assets_resp = state
                            .pg
                            .from("agency_catalog_assets")
                            .select("catalog_item_id, asset_type")
                            .in_("catalog_item_id", &item_ids)
                            .execute()
                            .await
                            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
                        let assets_text = assets_resp
                            .text()
                            .await
                            .unwrap_or_else(|_| "[]".to_string());
                        let assets_data: Vec<serde_json::Value> =
                            serde_json::from_str(&assets_text).unwrap_or(vec![]);

                        // Get all recordings for these items in one query
                        let recordings_resp = state
                            .pg
                            .from("agency_catalog_recordings")
                            .select("catalog_item_id, recording_id")
                            .in_("catalog_item_id", &item_ids)
                            .execute()
                            .await
                            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
                        let recordings_text = recordings_resp
                            .text()
                            .await
                            .unwrap_or_else(|_| "[]".to_string());
                        let recordings_data: Vec<serde_json::Value> =
                            serde_json::from_str(&recordings_text).unwrap_or(vec![]);

                        total_assets_30d = assets_data.len() as i64 + recordings_data.len() as i64;

                        // Group assets by catalog to calculate asset type distribution
                        use std::collections::{HashMap, HashSet};
                        let mut catalog_asset_types: HashMap<String, HashSet<String>> =
                            HashMap::new();

                        // Map items to catalogs
                        let mut item_to_catalog: HashMap<String, String> = HashMap::new();
                        for item in &items_data {
                            if let (Some(item_id), Some(catalog_id)) = (
                                item.get("id").and_then(|v| v.as_str()),
                                item.get("catalog_id").and_then(|v| v.as_str()),
                            ) {
                                item_to_catalog.insert(item_id.to_string(), catalog_id.to_string());
                            }
                        }

                        // Process assets
                        for asset in &assets_data {
                            if let (Some(item_id), Some(asset_type)) = (
                                asset.get("catalog_item_id").and_then(|v| v.as_str()),
                                asset.get("asset_type").and_then(|v| v.as_str()),
                            ) {
                                if let Some(catalog_id) = item_to_catalog.get(item_id) {
                                    let asset_types =
                                        catalog_asset_types.entry(catalog_id.clone()).or_default();
                                    let asset_type_lower = asset_type.to_lowercase();
                                    if asset_type_lower.contains("video") {
                                        asset_types.insert("video".to_string());
                                    } else if asset_type_lower.contains("voice")
                                        || asset_type_lower.contains("audio")
                                    {
                                        asset_types.insert("voice".to_string());
                                    } else if asset_type_lower.contains("image")
                                        || asset_type_lower.contains("photo")
                                    {
                                        asset_types.insert("image".to_string());
                                    }
                                }
                            }
                        }

                        // Process recordings (all count as voice)
                        for recording in &recordings_data {
                            if let Some(item_id) =
                                recording.get("catalog_item_id").and_then(|v| v.as_str())
                            {
                                if let Some(catalog_id) = item_to_catalog.get(item_id) {
                                    let asset_types =
                                        catalog_asset_types.entry(catalog_id.clone()).or_default();
                                    asset_types.insert("voice".to_string());
                                }
                            }
                        }

                        // Calculate percentages
                        for asset_types in catalog_asset_types.values() {
                            let asset_count = asset_types.len() as f64;
                            if asset_count > 0.0 {
                                let percentage_per_type = 100.0 / asset_count;
                                if asset_types.contains("video") {
                                    video_total += percentage_per_type;
                                }
                                if asset_types.contains("voice") {
                                    voice_total += percentage_per_type;
                                }
                                if asset_types.contains("image") {
                                    image_total += percentage_per_type;
                                }
                            }
                        }
                    }
                }
            }
        }

        // Process previous period catalogs with bulk queries for growth calculation
        if !catalogs_prev_data.is_empty() {
            let catalog_ids_prev: Vec<String> = catalogs_prev_data
                .iter()
                .filter_map(|c| c.get("id").and_then(|v| v.as_str()))
                .map(|s| s.to_string())
                .collect();

            if !catalog_ids_prev.is_empty() {
                // Get all catalog items for previous period catalogs
                let items_resp = state
                    .pg
                    .from("agency_catalog_items")
                    .select("id")
                    .in_("catalog_id", catalog_ids_prev)
                    .execute()
                    .await
                    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
                let items_text = items_resp.text().await.unwrap_or_else(|_| "[]".to_string());
                let items_data: Vec<serde_json::Value> =
                    serde_json::from_str(&items_text).unwrap_or(vec![]);

                if !items_data.is_empty() {
                    let item_ids: Vec<String> = items_data
                        .iter()
                        .filter_map(|i| i.get("id").and_then(|v| v.as_str()))
                        .map(|s| s.to_string())
                        .collect();

                    if !item_ids.is_empty() {
                        // Count assets and recordings for previous period
                        let assets_resp = state
                            .pg
                            .from("agency_catalog_assets")
                            .select("catalog_item_id")
                            .in_("catalog_item_id", &item_ids)
                            .execute()
                            .await
                            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
                        let assets_text = assets_resp
                            .text()
                            .await
                            .unwrap_or_else(|_| "[]".to_string());
                        let assets_data: Vec<serde_json::Value> =
                            serde_json::from_str(&assets_text).unwrap_or(vec![]);

                        let recordings_resp = state
                            .pg
                            .from("agency_catalog_recordings")
                            .select("catalog_item_id")
                            .in_("catalog_item_id", &item_ids)
                            .execute()
                            .await
                            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
                        let recordings_text = recordings_resp
                            .text()
                            .await
                            .unwrap_or_else(|_| "[]".to_string());
                        let recordings_data: Vec<serde_json::Value> =
                            serde_json::from_str(&recordings_text).unwrap_or(vec![]);

                        total_assets_prev = assets_data.len() as i64 + recordings_data.len() as i64;
                    }
                }
            }
        }

        // Calculate growth percentage (capped at 100%)
        let usages_growth_percentage = if total_assets_prev > 0 {
            let growth =
                ((total_assets_30d - total_assets_prev) as f64 / total_assets_prev as f64) * 100.0;
            growth.clamp(-100.0, 100.0)
        } else if total_assets_30d > 0 {
            100.0
        } else {
            0.0
        };

        // Calculate final percentages - ensure they sum to 100%
        let catalog_count = catalogs_30d_data.len() as f64;
        let (video_pct, voice_pct, image_pct) = if catalog_count > 0.0 {
            let video_raw = video_total / catalog_count;
            let voice_raw = voice_total / catalog_count;
            let image_raw = image_total / catalog_count;

            let total_raw = video_raw + voice_raw + image_raw;

            if total_raw > 0.0 {
                // Normalize to ensure sum equals 100%
                let video_normalized = (video_raw / total_raw * 100.0).round() as i64;
                let voice_normalized = (voice_raw / total_raw * 100.0).round() as i64;
                let image_normalized = 100 - video_normalized - voice_normalized; // Ensure sum = 100

                (video_normalized, voice_normalized, image_normalized)
            } else {
                (0, 0, 0)
            }
        } else {
            (0, 0, 0)
        };

        let usage_by_type = AIUsageByType {
            image: image_pct,
            video: video_pct,
            voice: voice_pct,
        };

        // C. CONSENT STATUS — based on agency_creator_marketplace_contracts (external creators only)
        let contracts_resp = state
            .pg
            .from("agency_creator_marketplace_contracts")
            .select("id, status, docuseal_status, valid_until")
            .eq("agency_id", agency_id)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let contracts_text = contracts_resp
            .text()
            .await
            .unwrap_or_else(|_| "[]".to_string());
        let contracts_data: Vec<serde_json::Value> =
            serde_json::from_str(&contracts_text).unwrap_or(vec![]);

        let ai_total_contracts = contracts_data.len() as i64;
        let mut ai_consent_complete = 0i64;
        let mut ai_consent_missing = 0i64;
        let mut ai_consent_expired = 0i64;

        for contract in contracts_data.iter() {
            let status = contract
                .get("status")
                .and_then(|v| v.as_str())
                .unwrap_or("draft");
            let docuseal_status = contract
                .get("docuseal_status")
                .and_then(|v| v.as_str())
                .unwrap_or("");

            // Complete: Both parties signed (status = "active")
            if status == "active" {
                ai_consent_complete += 1;
            }
            // Expired: Contract has expired or terminated
            else if status == "expired" || status == "terminated" {
                ai_consent_expired += 1;
            }
            // Missing: Contract sent but creator hasn't responded or declined
            else if status == "draft" || status == "pending" || docuseal_status == "declined" {
                ai_consent_missing += 1;
            }
        }

        // Verification count:
        // Count all talents in agency_users who have access to talent portal (have creator_id)
        // AND whose creator has kyc_status='approved'
        let talents_resp = state
            .pg
            .from("agency_users")
            .select("id, creator_id")
            .eq("agency_id", agency_id)
            .eq("role", "talent")
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let talents_text = talents_resp
            .text()
            .await
            .unwrap_or_else(|_| "[]".to_string());
        let talents_data: Vec<serde_json::Value> =
            serde_json::from_str(&talents_text).unwrap_or(vec![]);

        // Collect all creator_ids from talents
        let creator_ids: Vec<String> = talents_data
            .iter()
            .filter_map(|t| t.get("creator_id").and_then(|v| v.as_str()))
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string())
            .collect();

        let mut ai_verified_count = 0i64;

        if !creator_ids.is_empty() {
            // Fetch creators and check kyc_status
            let creators_resp = state
                .pg
                .from("creators")
                .select("id, kyc_status")
                .in_("id", creator_ids)
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let creators_text = creators_resp
                .text()
                .await
                .unwrap_or_else(|_| "[]".to_string());
            let creators_data: Vec<serde_json::Value> =
                serde_json::from_str(&creators_text).unwrap_or(vec![]);

            // Count creators with kyc_status='approved'
            ai_verified_count = creators_data
                .iter()
                .filter(|c| {
                    c.get("kyc_status")
                        .and_then(|v| v.as_str())
                        .map(|s| s == "approved")
                        .unwrap_or(false)
                })
                .count() as i64;
        }

        // Count expired licenses in current month
        let month_start = now.format("%Y-%m-01").to_string();
        let ai_expired_current_month = requests_data
            .iter()
            .filter(|r| {
                let status = r.get("status").and_then(|v| v.as_str()).unwrap_or("");
                let deadline = r.get("deadline").and_then(|v| v.as_str()).unwrap_or("");
                // Expired if approved and deadline is past but within current month
                status == "approved"
                    && deadline < today.as_str()
                    && deadline >= month_start.as_str()
            })
            .count() as i64;

        let avg_value_cents = if active_licenses_count > 0 {
            total_earnings_cents / active_licenses_count
        } else {
            0
        };

        return Ok(Json(AnalyticsDashboard {
            overview: OverviewMetrics {
                total_earnings_cents,
                total_earnings_formatted,
                earnings_growth_percentage: (earnings_growth_percentage * 10.0).round() / 10.0,
                active_campaigns: active_licenses_count,
                active_campaigns_growth_percentage: (active_campaigns_growth_percentage * 10.0)
                    .round()
                    / 10.0,
                total_value_cents: total_earnings_cents,
                avg_value_cents,
                avg_value_formatted: format_currency(avg_value_cents),
                top_scope: "Licensing".to_string(),
            },
            campaign_status: CampaignStatusBreakdown {
                in_progress: 0,
                ready_to_launch: 0,
                completed: 0,
            },
            ai_usage: AIUsageMetrics {
                total_usages_30d: total_assets_30d,
                usages_growth_percentage: (usages_growth_percentage * 10.0).round() / 10.0,
                avg_campaign_value_cents: 0,
                avg_campaign_value_formatted: format_currency(0),
                usage_by_type,
            },
            monthly_trends,
            consent_status: ConsentStatusBreakdown {
                complete: ai_consent_complete,
                missing: ai_consent_missing,
                expiring: ai_consent_expired,
                expiring_current_month: ai_expired_current_month,
                total: ai_total_contracts,
                verified: ai_verified_count,
                total_talents: talents_data.len() as i64,
            },
        }));
    }

    // --- IRL MODE (DEFAULT) ---
    // 1. BULK FETCH PAYMENTS (Last 5 months)
    let payments_resp = state
        .pg
        .from("payments")
        .select("gross_cents, paid_at, campaign_id")
        .eq("agency_id", agency_id)
        .eq("status", "succeeded")
        .gte("paid_at", &five_months_ago)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let payments_text = payments_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let payments_data: Vec<serde_json::Value> =
        serde_json::from_str(&payments_text).unwrap_or(vec![]);

    // 2. BULK FETCH CAMPAIGNS (from bookings_campaigns)
    let campaigns_resp = state
        .pg
        .from("bookings_campaigns")
        .select("id, status, created_at")
        .eq("agency_id", agency_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let campaigns_text = campaigns_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let campaigns_data: Vec<serde_json::Value> =
        serde_json::from_str(&campaigns_text).unwrap_or(vec![]);

    // 3. BULK FETCH BOOKINGS (to validate payments mapping)
    let bookings_resp = state
        .pg
        .from("bookings")
        .select("id")
        .eq("agency_user_id", agency_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let bookings_text = bookings_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let bookings_data: Vec<serde_json::Value> =
        serde_json::from_str(&bookings_text).unwrap_or(vec![]);

    // 4. BULK FETCH TALENTS
    let talents_resp = state
        .pg
        .from("agency_users")
        .select("id, status, consent_status, is_verified_talent")
        .eq("agency_id", agency_id)
        .eq("role", "talent")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let talents_text = talents_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let talents_data: Vec<serde_json::Value> =
        serde_json::from_str(&talents_text).unwrap_or(vec![]);

    // --- AGGREGATION IN MEMORY ---
    let mut valid_campaigns = HashSet::new();
    for c in &campaigns_data {
        if let Some(id) = c.get("id").and_then(|v| v.as_str()) {
            valid_campaigns.insert(id.to_string());
        }
    }

    let mut valid_bookings = HashSet::new();
    for b in &bookings_data {
        if let Some(id) = b.get("id").and_then(|v| v.as_str()) {
            valid_bookings.insert(id.to_string());
        }
    }

    // A. OVERVIEW & GROWTH (Payments in last 30d vs prev 30d)
    let total_earnings_cents: i64 = payments_data
        .iter()
        .filter(|p| {
            let p_cid = p.get("campaign_id").and_then(|v| v.as_str()).unwrap_or("");
            let p_bid = p.get("booking_id").and_then(|v| v.as_str()).unwrap_or("");
            let is_valid = (!p_cid.is_empty() && valid_campaigns.contains(p_cid))
                || (!p_bid.is_empty() && valid_bookings.contains(p_bid));

            let paid_at = p.get("paid_at").and_then(|v| v.as_str()).unwrap_or("");
            is_valid && paid_at >= thirty_days_ago.as_str()
        })
        .filter_map(|p| p.get("gross_cents").and_then(|v| v.as_i64()))
        .sum();

    let prev_earnings_cents: i64 = payments_data
        .iter()
        .filter(|p| {
            let p_cid = p.get("campaign_id").and_then(|v| v.as_str()).unwrap_or("");
            let p_bid = p.get("booking_id").and_then(|v| v.as_str()).unwrap_or("");
            let is_valid = (!p_cid.is_empty() && valid_campaigns.contains(p_cid))
                || (!p_bid.is_empty() && valid_bookings.contains(p_bid));

            let paid_at = p.get("paid_at").and_then(|v| v.as_str()).unwrap_or("");
            is_valid && paid_at >= sixty_days_ago.as_str() && paid_at < thirty_days_ago.as_str()
        })
        .filter_map(|p| p.get("gross_cents").and_then(|v| v.as_i64()))
        .sum();

    let earnings_growth_percentage = if prev_earnings_cents > 0 {
        let growth = ((total_earnings_cents - prev_earnings_cents) as f64
            / prev_earnings_cents as f64)
            * 100.0;
        growth.clamp(-100.0, 100.0)
    } else if total_earnings_cents > 0 {
        100.0
    } else {
        0.0
    };

    // B. CAMPAIGN METRICS
    let mut active_campaigns = 0i64;
    let mut in_progress = 0i64;
    let mut ready_to_launch = 0i64;
    let mut completed = 0i64;
    let mut scope_counts: HashMap<String, i64> = HashMap::new();
    let mut prev_active_campaigns = 0i64;

    for c in campaigns_data.iter() {
        let status = c.get("status").and_then(|v| v.as_str()).unwrap_or("");
        let created_at = c.get("created_at").and_then(|v| v.as_str()).unwrap_or("");

        // In Progress (Ongoing)
        if status == "ongoing" {
            active_campaigns += 1;
            in_progress += 1;

            // Count if it was also active 30 days ago (created before 30 days ago)
            if created_at < thirty_days_ago.as_str() {
                prev_active_campaigns += 1;
            }
        }

        // Ready to Launch (Created)
        if status == "created" {
            ready_to_launch += 1;
        }

        // Completed
        if status == "completed" {
            completed += 1;
        }

        // Top Scope (created in last 30d) - skipping vertical
        if created_at >= thirty_days_ago.as_str() {
            // Default to generic for now since vertical is not in bookings_campaigns
            *scope_counts.entry("Social Media".to_string()).or_insert(0) += 1;
        }
    }

    // Top Scope Result
    let top_scope = scope_counts
        .into_iter()
        .max_by_key(|(_, count)| *count)
        .map(|(scope, _)| scope)
        .unwrap_or_else(|| "Social Media".to_string());

    // Calculate active campaigns growth percentage
    let active_campaigns_growth_percentage = if prev_active_campaigns > 0 {
        let growth = ((active_campaigns - prev_active_campaigns) as f64
            / prev_active_campaigns as f64)
            * 100.0;
        growth.clamp(-100.0, 100.0)
    } else if active_campaigns > 0 {
        100.0
    } else {
        0.0
    };

    // C. AVG VALUE
    let avg_value_cents = if active_campaigns > 0 {
        total_earnings_cents / active_campaigns
    } else {
        0
    };

    // D. AVG CAMPAIGN VALUE (Earnings / Unique campaigns paid in last 30d)
    let campaign_count_30d = payments_data
        .iter()
        .filter(|p| {
            let paid_at = p.get("paid_at").and_then(|v| v.as_str()).unwrap_or("");
            paid_at >= thirty_days_ago.as_str()
        })
        .filter_map(|p| {
            p.get("campaign_id")
                .and_then(|v| v.as_str()) // Prioritize string ID
                .or_else(|| {
                    p.get("campaign_id")
                        .and_then(|v| v.as_i64())
                        .map(|i| i.to_string().leak() as &str)
                }) // Handle int ID if any
        })
        .collect::<HashSet<_>>() // Unique IDs
        .len() as i64;

    let avg_campaign_value_cents = if campaign_count_30d > 0 {
        total_earnings_cents / campaign_count_30d
    } else {
        0
    };

    // E. MONTHLY TRENDS
    let mut monthly_trends = Vec::new();
    for i in (0..5).rev() {
        let month_start_date = now - chrono::Duration::days(30 * i);
        let month_start = month_start_date.format("%Y-%m-01").to_string();
        let month_end = if i == 0 {
            now.to_rfc3339()
        } else {
            (now - chrono::Duration::days(30 * (i - 1)))
                .format("%Y-%m-01")
                .to_string()
        };

        // Filter payments for this month
        let month_earnings: i64 = payments_data
            .iter()
            .filter(|p| {
                let paid_at = p.get("paid_at").and_then(|v| v.as_str()).unwrap_or("");
                paid_at >= month_start.as_str() && paid_at < month_end.as_str()
            })
            .filter_map(|p| p.get("gross_cents").and_then(|v| v.as_i64()))
            .sum();

        // Filter campaigns created in this month
        let month_campaigns: i64 = campaigns_data
            .iter()
            .filter(|c| {
                let created_at = c.get("created_at").and_then(|v| v.as_str()).unwrap_or("");
                created_at >= month_start.as_str() && created_at < month_end.as_str()
            })
            .count() as i64;

        monthly_trends.push(MonthlyTrend {
            month: month_start_date.format("%b").to_string(),
            earnings: month_earnings as f64 / 100.0,
            campaigns: month_campaigns,
            usages: 60 + (i * 3), // Mock
        });
    }

    // F. CONSENT STATUS — active_consents = talents with consent_status="complete"
    //                       verification rate = talents with is_verified_talent=true
    let mut consent_complete = 0i64;
    let mut consent_missing = 0i64;
    let total_talents = talents_data.len() as i64;

    // Collect creator_ids for verification check
    let mut creator_ids_for_verification: Vec<String> = Vec::new();

    for t in talents_data.iter() {
        // Track connected creators for verification
        let creator_id = t.get("creator_id").and_then(|v| v.as_str());
        if let Some(cid) = creator_id {
            if !cid.is_empty() {
                creator_ids_for_verification.push(cid.to_string());
            }
        }

        let consent = t
            .get("consent_status")
            .and_then(|v| v.as_str())
            .unwrap_or("missing");
        if consent == "complete" {
            consent_complete += 1;
        } else {
            consent_missing += 1;
        }
    }

    // Verification count: Count talents with creator_id whose kyc_status='approved'
    let mut verified_count = 0i64;
    if !creator_ids_for_verification.is_empty() {
        let creators_resp = state
            .pg
            .from("creators")
            .select("id, kyc_status")
            .in_("id", creator_ids_for_verification)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let creators_text = creators_resp
            .text()
            .await
            .unwrap_or_else(|_| "[]".to_string());
        let creators_data: Vec<serde_json::Value> =
            serde_json::from_str(&creators_text).unwrap_or(vec![]);

        verified_count = creators_data
            .iter()
            .filter(|c| {
                c.get("kyc_status")
                    .and_then(|v| v.as_str())
                    .map(|s| s == "approved")
                    .unwrap_or(false)
            })
            .count() as i64;
    }

    // 4. EXPIRING REQUESTS — approved requests with deadline within 10 days
    let expiring_resp = state
        .pg
        .from("licensing_requests")
        .select("talent_id")
        .eq("agency_id", agency_id)
        .eq("status", "approved")
        .gte("deadline", &today)
        .lte("deadline", &ten_days_hence)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let expiring_text = expiring_resp
        .text()
        .await
        .unwrap_or_else(|_| "[]".to_string());
    let expiring_data: Vec<serde_json::Value> =
        serde_json::from_str(&expiring_text).unwrap_or(vec![]);
    let expiring = expiring_data.len() as i64;

    // Format values
    let total_earnings_formatted = format_currency(total_earnings_cents);
    let avg_value_formatted = format_currency(avg_value_cents);
    let avg_campaign_value_formatted = format_currency(avg_campaign_value_cents);

    // Mock AI Usage
    let total_usages_30d = 73;
    let usage_by_type = AIUsageByType {
        image: 45,
        video: 38,
        voice: 17,
    };

    Ok(Json(AnalyticsDashboard {
        overview: OverviewMetrics {
            total_earnings_cents,
            total_earnings_formatted,
            earnings_growth_percentage: (earnings_growth_percentage * 10.0).round() / 10.0,
            active_campaigns,
            active_campaigns_growth_percentage: (active_campaigns_growth_percentage * 10.0).round()
                / 10.0,
            total_value_cents: total_earnings_cents,
            avg_value_cents,
            avg_value_formatted,
            top_scope,
        },
        campaign_status: CampaignStatusBreakdown {
            in_progress,
            ready_to_launch,
            completed,
        },
        ai_usage: AIUsageMetrics {
            total_usages_30d,
            usages_growth_percentage: 0.0,
            avg_campaign_value_cents,
            avg_campaign_value_formatted,
            usage_by_type,
        },
        monthly_trends,
        consent_status: ConsentStatusBreakdown {
            complete: consent_complete,
            missing: consent_missing,
            expiring,
            expiring_current_month: expiring,
            total: total_talents,
            verified: verified_count,
            total_talents,
        },
    }))
}

#[derive(Debug, Serialize)]
pub struct ClientsCampaignsResponse {
    pub earnings_by_client: Vec<ClientEarning>,
    pub geographic_distribution: Vec<GeoMetric>,
    pub top_clients_performance: Vec<ClientPerformance>,
    pub repeat_client_rate: f64,
    pub avg_campaign_duration: i64,
    pub client_acquisition: i64,
}

#[derive(Debug, Serialize)]
pub struct ClientEarning {
    pub name: String,
    pub budget: f64,
    pub color: String,
}

#[derive(Debug, Serialize)]
pub struct GeoMetric {
    pub name: String,
    pub value: f64,
    pub color: String,
}

#[derive(Debug, Serialize)]
pub struct ClientPerformance {
    pub name: String,
    pub campaigns: i64,
    pub budget: f64,
    pub percentage: f64,
}

/// GET /api/agency/analytics/clients-campaigns

#[derive(Debug, Serialize)]
pub struct RosterInsightsResponse {
    pub highest_engagement: Option<TalentMetric>,
    pub most_active: Option<TalentMetric>,
    pub top_performer: Option<TalentMetric>,
    pub talent_metrics: Vec<TalentPerformanceMetric>,
}

#[derive(Debug, Serialize)]
pub struct TalentMetric {
    pub talent_id: uuid::Uuid,
    pub talent_name: String,
    pub value: String,
    pub sub_text: String,
    pub image_url: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TalentPerformanceMetric {
    pub talent_id: uuid::Uuid,
    pub talent_name: String,
    pub earnings_30d_cents: i64,
    pub earnings_30d_formatted: String,
    pub projected_earnings_cents: i64,
    pub projected_earnings_formatted: String,
    pub campaigns_count_30d: i64,
    pub avg_value_cents: i64,
    pub avg_value_formatted: String,
    pub status: String,
    pub image_url: Option<String>,
    pub followers_count: i64,
    pub engagement_rate: f64,
}

/// GET /api/agency/analytics/roster

#[derive(Debug, Serialize)]
pub struct RoyaltiesPayoutsResponse {
    pub accrued_this_month_cents: i64,
    pub accrued_this_month_formatted: String,
    pub pending_approval_cents: i64,
    pub pending_approval_formatted: String,
    pub paid_ytd_cents: i64,
    pub paid_ytd_formatted: String,
    pub agency_commission_ytd_cents: i64,
    pub agency_commission_ytd_formatted: String,
}
