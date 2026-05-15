use postgrest::Postgrest;
use std::sync::Arc;

#[derive(Clone)]
pub struct VeriffConfig {
    pub base_url: String,
    pub api_key: String,
    pub shared_secret: String,
}

#[derive(Clone)]
pub struct StripeConfig {
    pub secret_key: String,
    pub publishable_key: String,
    pub client_id: String,
    pub return_url: String,
    pub refresh_url: String,
    pub webhook_secret: String,

    pub agency_price_id: String,
    pub scale_price_id: String,
    pub licensing_basic_price_id: String,
    pub licensing_pro_price_id: String,
    pub licensing_enterprise_price_id: String,

    // Agency subscription (new pricing page)
    pub agency_basic_base_price_id: String,
    pub agency_basic_base_annual_price_id: String,
    pub agency_basic_headcount_price_id: String,
    pub agency_basic_headcount_annual_price_id: String,
    pub agency_pro_base_price_id: String,
    pub creator_basic_price_id: String,
    pub creator_pro_price_id: String,
    pub creator_basic_annual_price_id: String,
    pub creator_pro_annual_price_id: String,
    pub agency_pro_base_annual_price_id: String,
    pub agency_pro_headcount_price_id: String,
    pub agency_pro_headcount_annual_price_id: String,
    pub agency_irl_booking_price_id: String,
    pub agency_irl_booking_annual_price_id: String,
    pub brand_basic_price_id: String,
    pub brand_basic_annual_price_id: String,
    pub brand_pro_price_id: String,
    pub brand_pro_annual_price_id: String,
    pub brand_studio_addon_price_id: String,

    pub checkout_success_url: String,
    pub checkout_cancel_url: String,
    pub licensing_success_url: String,
    pub licensing_cancel_url: String,
    pub creator_success_url: String,
    pub creator_cancel_url: String,
    pub studio_success_url: String,
    pub studio_cancel_url: String,

    pub studio_price_ids: String,
    pub studio_lite_price_ids: String,
    pub studio_pro_price_ids: String,
}

#[derive(Clone)]
pub struct DocuSealConfig {
    pub api_key: String,
    pub base_url: String,
    pub api_url: String,
    pub app_url: String,
    pub webhook_url: String,
    pub user_email: String,
    pub master_template_id: String,
    pub master_template_name: String,
}

#[derive(Clone)]
pub struct SmtpConfig {
    pub host: String,
    pub port: u16,
    pub user: String,
    pub password: String,
    pub from: String,
    pub contact_to: String,
}

#[derive(Clone)]
pub struct SmtpSalesConfig {
    pub host: String,
    pub port: u16,
    pub user: String,
    pub password: String,
    pub from: String,
    pub to: String,
}

#[derive(Clone)]
pub struct CalendlyConfig {
    pub booking_url: String,
    pub webhook_signing_key: String,
    pub api_token: String,
}

#[derive(Clone)]
pub struct PayoutConfig {
    pub enabled: bool,
    pub auto_approve_threshold_cents: u32,
    pub min_amount_cents: u32,
    pub instant_enabled: bool,
    pub fee_bps: u32,
    pub currency: String,
    pub allowed_currencies: Vec<String>,
    pub agency_scheduler_enabled: bool,
    pub agency_scheduler_interval_secs: u64,
}

#[derive(Clone)]
pub struct AppState {
    pub pg: Postgrest,
    pub veriff: VeriffConfig,

    pub supabase_url: String,
    pub supabase_service_key: String,
    pub supabase_jwt_secret: String,
    pub supabase_bucket_public: String,
    pub supabase_bucket_private: String,
    pub supabase_bucket_temp: String,

    pub elevenlabs_api_key: String,

    pub stripe: StripeConfig,
    pub docuseal: DocuSealConfig,
    pub smtp: SmtpConfig,
    pub smtp_sales: SmtpSalesConfig,
    pub calendly: CalendlyConfig,
    pub payout: PayoutConfig,

    pub frontend_url: String,

    // Studio Provider API Keys
    pub fal_api_key: String,
    pub fal_api_url: String,

    // Cache Layers
    pub cache_l2: Arc<crate::cache::SessionCache>,
    pub cache_l3: Arc<crate::cache::ApplicationCache>,
    pub cache_idempotency: Arc<crate::cache::IdempotencyStore>,
    pub cache_metrics: Arc<crate::cache::CacheMetrics>,

    // Cron authentication
    pub cron_secret: String,

    // Brand trial configuration
    pub brand_trial_days: u32,

    // Apify Integration
    pub apify_api_token: String,
    pub apify_scraper_actor_id: String,

    // JWKS cache for JWT Signing Keys (Supabase)
    pub jwks_cache: Arc<crate::auth::JwksCache>,
}
