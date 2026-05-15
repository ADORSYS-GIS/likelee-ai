use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize)]
pub struct EscrowReleaseOutcome {
    pub payment_status: String,
    pub escrow_status: String,
    pub released_now: bool,
}

#[derive(Debug, Deserialize)]
pub struct CreateBrandCampaignRequest {
    pub name: String,
    pub objective: String,
    pub category: String,
    pub description: String,
    pub usage_scope: Option<String>,
    pub duration_days: Option<i32>,
    pub territory: Option<String>,
    pub exclusivity: Option<String>,
    pub budget_range: String,
    pub start_date: String,
    pub custom_terms: Option<String>,
    pub brief_snapshot: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateBrandCampaignRequest {
    pub name: Option<String>,
    pub objective: Option<String>,
    pub category: Option<String>,
    pub description: Option<String>,
    pub usage_scope: Option<String>,
    pub duration_days: Option<i32>,
    pub territory: Option<String>,
    pub exclusivity: Option<String>,
    pub budget_range: Option<String>,
    pub start_date: Option<String>,
    pub custom_terms: Option<String>,
    pub brief_snapshot: Option<serde_json::Value>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ListCampaignQuery {
    pub status: Option<String>,
    pub limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct ListActivityEventsQuery {
    pub limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct CampaignMetricsQuery {
    pub month: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCampaignOffersRequest {
    pub target_type: String,
    pub target_ids: Vec<String>,
    pub offer_title: Option<String>,
    pub message: Option<String>,
    pub expires_at: Option<String>,
    pub brief_snapshot: Option<serde_json::Value>,
    pub budget_snapshot: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct OfferOptionsQuery {
    pub target_type: Option<String>,
    pub q: Option<String>,
    pub limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct MyOffersQuery {
    pub status: Option<String>,
    pub limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct OfferResponseRequest {
    pub action: String,
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateOfferContractRequest {
    pub title: Option<String>,
    pub file_url: Option<String>,
    pub docuseal_template_id: Option<i64>,
    pub meta: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct SendOfferContractRequest {
    pub contract_id: Option<String>,
    #[serde(default)]
    pub force_new_submission: bool,
}

#[derive(Debug, Deserialize)]
pub struct SyncOfferContractRequest {
    pub contract_id: String,
    pub docuseal_status: Option<String>,
    pub docuseal_submission_id: Option<i64>,
    pub docuseal_slug: Option<String>,
    pub meta: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTemplateFromPdfResponse {
    pub id: String,
    pub slug: String,
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct ContractPath {
    pub offer_id: String,
    pub contract_id: String,
}

#[derive(Debug, Deserialize)]
pub struct GetOfferBuilderTokenRequest {
    pub template_id: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct CreateOfferPackageRequest {
    pub title: Option<String>,
    pub message: Option<String>,
    pub package_snapshot: Option<serde_json::Value>,
    pub expires_at: Option<String>,
    pub meta: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct SendOfferPackageRequest {
    pub package_id: String,
}

#[derive(Debug, Deserialize)]
pub struct PackageDoneRequest {
    pub package_id: String,
    pub selected_talent_ids: Option<Vec<String>>,
    pub feedback_note: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct PackageDeleteRequest {
    pub package_id: String,
}

#[derive(Debug, Deserialize)]
pub struct SubmitDeliverableRequest {
    pub asset_url: String,
    pub asset_type: Option<String>,
    pub caption: Option<String>,
    pub brand_id: Option<String>,
    pub brand_campaign_id: Option<String>,
    pub talent_id: Option<String>,
    pub creator_id: Option<String>,
    pub asset_request_id: Option<String>,
    pub meta: Option<serde_json::Value>,
    pub confirm_unpaid: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct SubmitDraftDeliverablesRequest {
    pub confirm_unpaid: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct CreateOfferTalentAssignmentRequest {
    pub talent_id: Option<String>,
    pub creator_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateOfferAssetRequestRequest {
    pub talent_id: Option<String>,
    pub creator_id: Option<String>,
    pub title: Option<String>,
    pub message: Option<String>,
    pub file_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct OfferAssignmentPath {
    pub offer_id: String,
    pub assignment_id: String,
}

#[derive(Debug, Deserialize)]
pub struct OfferAssetRequestPath {
    pub request_id: String,
}

#[derive(Debug, Deserialize)]
pub struct ReviewDeliverableRequest {
    pub action: String,
    pub note: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CommentDeliverableRequest {
    pub message: String,
}

#[derive(Debug, Deserialize)]
pub struct OfferPath {
    pub offer_id: String,
}

#[derive(Debug, Deserialize)]
pub struct PackagePath {
    pub offer_id: String,
    pub package_id: String,
}

#[derive(Debug, Deserialize)]
pub struct OfferContractPath {
    pub offer_id: String,
    pub contract_id: String,
}

#[derive(Debug, Deserialize)]
pub struct OfferDeliverablePath {
    pub offer_id: String,
    pub deliverable_id: String,
}

#[derive(Debug, Deserialize, Default)]
pub struct OfferDeliverableFileQuery {
    pub download: Option<String>,
    pub thumbnail: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct DocuSealWebhookEvent {
    pub event_type: String,
    #[allow(dead_code)]
    pub timestamp: Option<String>,
    pub data: serde_json::Value,
}

#[derive(Debug, Serialize)]
pub struct MonthlySpend {
    pub month: String,
    pub spend: i64,
}

#[derive(Debug, Serialize)]
pub struct BrandSpendAnalytics {
    pub monthly_spend: Vec<MonthlySpend>,
    pub ytd_spend: i64,
    pub monthly_avg: i64,
    pub current_month_spend: i64,
    pub previous_month_spend: i64,
    pub current_month_growth_percentage: f64,
    pub projected_eoy: i64,
}

#[derive(Debug, Serialize)]
pub struct EscrowSummary {
    pub currencies: HashMap<String, f64>,
    pub project_count: usize,
}

#[derive(Debug, Deserialize)]
pub struct OfferPackageInteractionsPath {
    pub offer_id: String,
    pub package_id: String,
}

#[derive(Debug, Serialize)]
pub struct StripeReadinessParty {
    pub party_type: String,
    pub id: String,
    pub name: String,
    pub connected: bool,
    pub transfers_enabled: bool,
    pub details_submitted: bool,
}

#[derive(Debug, Serialize)]
pub struct OfferStripeReadinessResponse {
    pub offer_id: String,
    pub agency: StripeReadinessParty,
    pub talents: Vec<StripeReadinessParty>,
    pub all_connected: bool,
    pub all_transfers_enabled: bool,
}

#[derive(Debug, Serialize)]
pub struct RecipientTransferStatus {
    pub recipient_type: String,
    pub recipient_id: String,
    pub name: String,
    pub amount_cents: i64,
    pub currency: String,
    pub transfer_status: String,
    pub failure_reason: Option<String>,
    pub retry_count: i64,
    pub retried_at: Option<String>,
    pub notified_at: Option<String>,
    pub stripe_transfer_id: Option<String>,
    pub stripe_connected: bool,
    pub stripe_transfers_enabled: bool,
    pub stripe_payouts_enabled: bool,
    pub stripe_details_submitted: bool,
    pub stripe_account_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct OfferTransferStatusResponse {
    pub offer_id: String,
    pub escrow_status: String,
    pub payment_status: String,
    pub recipients: Vec<RecipientTransferStatus>,
}

#[derive(Debug, Serialize)]
pub struct RetryTransferResult {
    pub recipient_type: String,
    pub recipient_id: String,
    pub name: String,
    pub amount_cents: i64,
    pub result: String,
    pub failure_reason: Option<String>,
    pub stripe_transfer_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct RetryTransfersResponse {
    pub offer_id: String,
    pub retried: Vec<RetryTransferResult>,
    pub nothing_to_retry: bool,
}

#[derive(Debug, Serialize)]
pub struct CreatorTransferRow {
    pub offer_id: String,
    pub offer_title: String,
    pub brand_name: String,
    pub amount_cents: i64,
    pub currency: String,
    pub transfer_status: String,
    pub failure_reason: Option<String>,
    pub retry_count: i64,
    pub retried_at: Option<String>,
    pub stripe_transfer_id: Option<String>,
    pub escrow_status: String,
    pub paid_at: Option<String>,
    pub target_type: String,
}
