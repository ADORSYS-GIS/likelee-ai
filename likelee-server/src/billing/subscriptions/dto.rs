use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct StudioCheckoutRequest {
    #[serde(default)]
    pub plan_type: Option<String>,
    pub credits: i64,
}

#[derive(Debug, Serialize)]
pub struct StudioCheckoutResponse {
    pub url: String,
}

#[derive(Debug, Default, Deserialize)]
pub struct AgencyCheckoutAddons {
    #[serde(default)]
    pub irl_booking: bool,
    #[serde(default)]
    pub seats_in_plan: bool,
    pub deepfake_protection_models: Option<u32>,
    pub additional_team_members: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct AgencyCheckoutRequest {
    pub plan: String,
    pub roster_models: u32,
    pub interval: Option<String>,
    #[serde(default)]
    pub start_trial: bool,
    #[serde(default)]
    pub agreement_accepted: bool,
    #[serde(default)]
    pub addons: AgencyCheckoutAddons,
}

#[derive(Debug, Deserialize)]
pub struct AgencySeatAddonRequest {
    pub seats: u32,
    pub plan: Option<String>,
    pub interval: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AgencyCheckoutResponse {
    pub checkout_url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub seats_limit: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub invoice_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub invoice_status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub invoice_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AgencyCheckoutSessionSyncRequest {
    #[serde(default)]
    pub session_id: String,
}

#[derive(Debug, Serialize)]
pub struct AgencyCheckoutSessionSyncResponse {
    pub plan_tier: String,
    pub seats_limit: i64,
    pub addon_irl_booking_enabled: bool,
}

#[derive(Debug, Serialize)]
pub struct AgencyPlanChangeResponse {
    pub plan_tier: String,
    pub seats_limit: i64,
    pub addon_irl_booking_enabled: bool,
}

#[derive(Debug, Serialize)]
pub struct AgencySeatAddonChangeResponse {
    pub seats_limit: i64,
}

#[derive(Debug, Serialize)]
pub struct AgencySeatBreakdownItem {
    pub source: String,
    pub interval: String,
    pub seats: i64,
    pub status: String,
    pub subscription_id: String,
    pub current_period_start: Option<String>,
    pub current_period_end: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AgencySeatBreakdownResponse {
    pub total_active_seats: i64,
    pub annual_seats: i64,
    pub monthly_seats: i64,
    pub items: Vec<AgencySeatBreakdownItem>,
}

#[derive(Debug, Serialize)]
pub struct AgencyTrialStartResponse {
    pub trial_active: bool,
    pub trial_ends_at: Option<String>,
    pub display_plan_label: String,
}

#[derive(Debug, Deserialize)]
pub struct CreatorCheckoutRequest {
    pub plan: String,
    #[serde(default)]
    pub interval: Option<String>,
    #[serde(default)]
    pub start_trial: bool,
    #[serde(default)]
    pub agreement_accepted: bool,
}

#[derive(Debug, Deserialize)]
pub struct CreatorUpgradeRequest {
    pub plan: String,
    #[serde(default)]
    pub interval: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CreatorBillingStatusResponse {
    pub creator_id: String,
    pub plan_tier: String,
    pub entitlement_tier: String,
    pub plan_interval: String,
    pub subscription_status: String,
    pub stripe_customer_id: Option<String>,
    pub stripe_subscription_id: Option<String>,
    pub plan_updated_at: Option<String>,
    pub stripe_current_period_end: Option<String>,
    pub stripe_cancel_at_period_end: bool,
    pub trial_active: bool,
    pub trial_ends_at: Option<String>,
    pub trial_start_at: Option<String>,
    pub trial_basic_start_at: Option<String>,
    pub trial_pro_start_at: Option<String>,
    pub can_use_kyc: bool,
    pub can_use_likeness: bool,
    pub can_use_agency_connection: bool,
    pub can_use_brand_connection: bool,
    pub can_use_payouts: bool,
    pub can_use_cameo_uploads: bool,
    pub can_use_unauthorized_monitoring: bool,
    pub can_use_voice_profiles: bool,
    pub voice_tone_limit: usize,
    pub category_limit: Option<usize>,
    pub can_use_advanced_analytics: bool,
    pub can_use_jobs: bool,
    pub can_use_rules: bool,
    pub can_use_talent_portal: bool,
    pub can_use_campaign_archive: bool,
    pub can_use_active_campaigns: bool,
}

#[derive(Debug, Serialize)]
pub struct CreatorCheckoutResponse {
    pub checkout_url: String,
}

#[derive(Debug, Deserialize)]
pub struct BrandCheckoutRequest {
    pub plan: String,
    #[serde(default)]
    pub billing_cycle: Option<String>,
    pub next_path: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CampaignCheckoutResponse {
    pub url: String,
}

#[derive(Debug, Default, Deserialize)]
pub struct BrandStudioAddonCheckoutRequest {
    pub next_path: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BrandStudioAddonVerifyRequest {
    pub session_id: String,
}

#[derive(Debug, Serialize)]
pub struct AgencyBillingStatusResponse {
    pub agency_id: String,
    pub plan_tier: String,
    pub effective_plan_tier: String,
    pub display_plan_label: String,
    pub trial_start_at: Option<String>,
    pub trial_active: bool,
    pub trial_ends_at: Option<String>,
    pub subscription_status: String,
    pub has_paid_access: bool,
    pub has_pro_access: bool,
    pub can_apply_for_jobs: bool,
    pub can_connect_marketplace_creators: bool,
    pub can_use_brand_connections: bool,
    pub can_use_calendly: bool,
    pub stripe_customer_id: Option<String>,
    pub stripe_subscription_id: Option<String>,
    pub plan_updated_at: Option<String>,
    pub plan_interval: String,
    pub stripe_current_period_end: Option<String>,
    pub stripe_cancel_at_period_end: bool,
}

#[derive(Debug, Serialize)]
pub struct BrandBillingStatusResponse {
    pub brand_id: String,
    pub plan_tier: String,
    pub subscription_status: String,
    pub stripe_customer_id: Option<String>,
    pub stripe_subscription_id: Option<String>,
    pub current_period_end: Option<String>,
    pub cancel_at_period_end: bool,
    pub trial_active: bool,
    pub trial_ends_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct BrandInvoice {
    pub id: String,
    pub number: Option<String>,
    pub amount: i64,
    pub currency: String,
    pub status: String,
    pub created_at: Option<String>,
    pub invoice_url: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct BrandInvoicesResponse {
    pub invoices: Vec<BrandInvoice>,
}

#[derive(Debug, Serialize)]
pub struct BrandBudgetSettings {
    pub monthly_budget_limit: Option<f64>,
    pub budget_alert_enabled: bool,
}

#[derive(Debug, Deserialize)]
pub struct UpdateBrandBudgetSettingsRequest {
    pub monthly_budget_limit: Option<f64>,
    pub budget_alert_enabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct CronQueryParams {
    pub idempotency_key: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SetupIntentResponse {
    pub client_secret: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaymentMethodInfo {
    pub id: String,
    pub stripe_payment_method_id: String,
    pub card_last_four: String,
    pub card_brand: String,
    pub card_exp_month: i32,
    pub card_exp_year: i32,
    pub is_active: bool,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PrimaryPaymentMethod {
    pub stripe_payment_method_id: String,
    pub card_last_four: String,
    pub card_brand: String,
    pub card_exp_month: i32,
    pub card_exp_year: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GetPaymentMethodsResponse {
    pub payment_methods: Vec<PaymentMethodInfo>,
    pub primary_payment_method: Option<PrimaryPaymentMethod>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SetPrimaryPaymentMethodRequest {
    pub stripe_payment_method_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeletePaymentMethodRequest {
    pub stripe_payment_method_id: String,
}
