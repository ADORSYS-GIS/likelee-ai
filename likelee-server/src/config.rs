use envconfig::Envconfig;
use postgrest::Postgrest;

#[derive(Clone)]
pub struct VeriffConfig {
    pub base_url: String,
    pub api_key: String,
    pub shared_secret: String,
}

#[derive(Clone)]
pub struct DuixConfig {
    pub base_url: String,
    pub auth_token: String,
}

#[derive(Envconfig, Clone)]
pub struct ServerConfig {
    #[envconfig(from = "SUPABASE_URL")]
    pub supabase_url: String,

    #[envconfig(from = "SUPABASE_SERVICE_KEY")]
    pub supabase_service_key: String,

    #[envconfig(from = "SUPABASE_JWT_SECRET")]
    pub supabase_jwt_secret: String,

    #[envconfig(from = "SUPABASE_BUCKET_PRIVATE", default = "likelee-private")]
    pub supabase_bucket_private: String,

    #[envconfig(from = "SUPABASE_BUCKET_PUBLIC", default = "likelee-public")]
    pub supabase_bucket_public: String,

    #[envconfig(from = "SUPABASE_BUCKET_TEMP", default = "likelee-temp")]
    pub supabase_bucket_temp: String,

    #[envconfig(from = "PORT", default = "8787")]
    pub port: u16,

    #[envconfig(from = "VERIFF_BASE_URL")]
    pub veriff_base_url: String,

    #[envconfig(from = "VERIFF_API_KEY")]
    pub veriff_api_key: String,

    #[envconfig(from = "VERIFF_SHARED_SECRET")]
    pub veriff_shared_secret: String,

    #[envconfig(from = "DUIX_BASE_URL", default = "http://127.0.0.1:7860")]
    pub duix_base_url: String,

    #[envconfig(from = "DUIX_AUTH_TOKEN", default = "change-me")]
    pub duix_auth_token: String,

    #[envconfig(from = "ELEVENLABS_API_KEY", default = "")]
    pub elevenlabs_api_key: String,

    #[envconfig(from = "SMTP_HOST", default = "")]
    pub smtp_host: String,

    #[envconfig(from = "SMTP_PORT", default = "587")]
    pub smtp_port: u16,

    #[envconfig(from = "SMTP_USER", default = "")]
    pub smtp_user: String,

    #[envconfig(from = "SMTP_PASSWORD", default = "")]
    pub smtp_password: String,

    #[envconfig(from = "EMAIL_FROM", default = "noreply@likelee.ai")]
    pub email_from: String,

    #[envconfig(from = "EMAIL_CONTACT_TO", default = "")]
    pub email_contact_to: String,

    #[envconfig(from = "SMTP_SALES_HOST", default = "")]
    pub smtp_sales_host: String,

    #[envconfig(from = "SMTP_SALES_PORT", default = "587")]
    pub smtp_sales_port: u16,

    #[envconfig(from = "SMTP_SALES_USER", default = "")]
    pub smtp_sales_user: String,

    #[envconfig(from = "SMTP_SALES_PASSWORD", default = "")]
    pub smtp_sales_password: String,

    #[envconfig(from = "EMAIL_FROM_SALES", default = "operations@likelee.ai")]
    pub email_from_sales: String,

    #[envconfig(from = "EMAIL_SALES_TO", default = "operations@likelee.ai")]
    pub email_sales_to: String,

    // Stripe
    #[envconfig(from = "STRIPE_SECRET_KEY", default = "")]
    pub stripe_secret_key: String,

    #[envconfig(from = "STRIPE_CLIENT_ID", default = "")]
    pub stripe_client_id: String,

    #[envconfig(from = "STRIPE_RETURN_URL", default = "")]
    pub stripe_return_url: String,

    #[envconfig(from = "STRIPE_REFRESH_URL", default = "")]
    pub stripe_refresh_url: String,

    #[envconfig(from = "STRIPE_WEBHOOK_SECRET", default = "")]
    pub stripe_webhook_secret: String,

    #[envconfig(from = "STRIPE_AGENCY_PRICE_ID", default = "")]
    pub stripe_agency_price_id: String,

    #[envconfig(from = "STRIPE_SCALE_PRICE_ID", default = "")]
    pub stripe_scale_price_id: String,

    #[envconfig(from = "STRIPE_LICENSING_BASIC_PRICE_ID", default = "")]
    pub stripe_licensing_basic_price_id: String,

    #[envconfig(from = "STRIPE_LICENSING_PRO_PRICE_ID", default = "")]
    pub stripe_licensing_pro_price_id: String,

    #[envconfig(from = "STRIPE_LICENSING_ENTERPRISE_PRICE_ID", default = "")]
    pub stripe_licensing_enterprise_price_id: String,

    // Agency subscription (new pricing page)
    #[envconfig(from = "STRIPE_AGENCY_BASIC_BASE_PRICE_ID", default = "")]
    pub stripe_agency_basic_base_price_id: String,

    #[envconfig(from = "STRIPE_AGENCY_BASIC_HEADCOUNT_PRICE_ID", default = "")]
    pub stripe_agency_basic_headcount_price_id: String,

    #[envconfig(from = "STRIPE_AGENCY_BASIC_BASE_ANNUAL_PRICE_ID", default = "")]
    pub stripe_agency_basic_base_annual_price_id: String,

    #[envconfig(from = "STRIPE_AGENCY_BASIC_HEADCOUNT_ANNUAL_PRICE_ID", default = "")]
    pub stripe_agency_basic_headcount_annual_price_id: String,

    #[envconfig(from = "STRIPE_AGENCY_PRO_BASE_PRICE_ID", default = "")]
    pub stripe_agency_pro_base_price_id: String,

    #[envconfig(from = "STRIPE_CREATOR_BASIC_PRICE_ID", default = "")]
    pub stripe_creator_basic_price_id: String,

    #[envconfig(from = "STRIPE_CREATOR_PRO_PRICE_ID", default = "")]
    pub stripe_creator_pro_price_id: String,

    #[envconfig(from = "STRIPE_CREATOR_BASIC_ANNUAL_PRICE_ID", default = "")]
    pub stripe_creator_basic_annual_price_id: String,

    #[envconfig(from = "STRIPE_CREATOR_PRO_ANNUAL_PRICE_ID", default = "")]
    pub stripe_creator_pro_annual_price_id: String,

    #[envconfig(from = "STRIPE_AGENCY_PRO_HEADCOUNT_PRICE_ID", default = "")]
    pub stripe_agency_pro_headcount_price_id: String,

    #[envconfig(from = "STRIPE_AGENCY_PRO_BASE_ANNUAL_PRICE_ID", default = "")]
    pub stripe_agency_pro_base_annual_price_id: String,

    #[envconfig(from = "STRIPE_AGENCY_PRO_HEADCOUNT_ANNUAL_PRICE_ID", default = "")]
    pub stripe_agency_pro_headcount_annual_price_id: String,

    #[envconfig(from = "STRIPE_AGENCY_IRL_BOOKING_PRICE_ID", default = "")]
    pub stripe_agency_irl_booking_price_id: String,

    #[envconfig(from = "STRIPE_AGENCY_IRL_BOOKING_ANNUAL_PRICE_ID", default = "")]
    pub stripe_agency_irl_booking_annual_price_id: String,

    #[envconfig(from = "STRIPE_BRAND_BASIC_PRICE_ID", default = "")]
    pub stripe_brand_basic_price_id: String,

    #[envconfig(from = "STRIPE_BRAND_BASIC_ANNUAL_PRICE_ID", default = "")]
    pub stripe_brand_basic_annual_price_id: String,

    #[envconfig(from = "STRIPE_BRAND_PRO_PRICE_ID", default = "")]
    pub stripe_brand_pro_price_id: String,

    #[envconfig(from = "STRIPE_BRAND_PRO_ANNUAL_PRICE_ID", default = "")]
    pub stripe_brand_pro_annual_price_id: String,

    #[envconfig(from = "STRIPE_BRAND_STUDIO_ADDON_PRICE_ID", default = "")]
    pub stripe_brand_studio_addon_price_id: String,

    #[envconfig(from = "STRIPE_CHECKOUT_SUCCESS_URL", default = "")]
    pub stripe_checkout_success_url: String,

    #[envconfig(from = "STRIPE_CHECKOUT_CANCEL_URL", default = "")]
    pub stripe_checkout_cancel_url: String,

    #[envconfig(from = "STRIPE_LICENSING_SUCCESS_URL", default = "")]
    pub stripe_licensing_success_url: String,

    #[envconfig(from = "STRIPE_LICENSING_CANCEL_URL", default = "")]
    pub stripe_licensing_cancel_url: String,

    #[envconfig(from = "STRIPE_STUDIO_SUCCESS_URL", default = "")]
    pub stripe_studio_success_url: String,

    #[envconfig(from = "STRIPE_STUDIO_CANCEL_URL", default = "")]
    pub stripe_studio_cancel_url: String,

    #[envconfig(from = "STRIPE_CREATOR_SUCCESS_URL", default = "")]
    pub stripe_creator_success_url: String,

    #[envconfig(from = "STRIPE_CREATOR_CANCEL_URL", default = "")]
    pub stripe_creator_cancel_url: String,

    #[envconfig(from = "STRIPE_STUDIO_PRICE_IDS", default = "")]
    pub stripe_studio_price_ids: String,

    #[envconfig(from = "STRIPE_STUDIO_LITE_PRICE_IDS", default = "")]
    pub stripe_studio_lite_price_ids: String,

    #[envconfig(from = "STRIPE_STUDIO_PRO_PRICE_IDS", default = "")]
    pub stripe_studio_pro_price_ids: String,

    // Payout Logic
    #[envconfig(from = "PAYOUTS_ENABLED", default = "false")]
    pub payouts_enabled: bool,

    #[envconfig(from = "PAYOUT_AUTO_APPROVE_THRESHOLD_CENTS", default = "500000")]
    pub payout_auto_approve_threshold_cents: u32,

    #[envconfig(from = "MIN_PAYOUT_AMOUNT_CENTS", default = "1000")]
    pub min_payout_amount_cents: u32,

    #[envconfig(from = "INSTANT_PAYOUTS_ENABLED", default = "true")]
    pub instant_payouts_enabled: bool,

    #[envconfig(from = "PAYOUT_FEE_BPS", default = "100")] // 1%
    pub payout_fee_bps: u32,

    #[envconfig(from = "PAYOUT_CURRENCY", default = "USD")]
    pub payout_currency: String,

    #[envconfig(from = "PAYOUT_ALLOWED_CURRENCIES", default = "USD,EUR")]
    pub payout_allowed_currencies: String,

    #[envconfig(from = "AGENCY_PAYOUT_SCHEDULER_ENABLED", default = "false")]
    pub agency_payout_scheduler_enabled: bool,

    #[envconfig(from = "AGENCY_PAYOUT_SCHEDULER_INTERVAL_SECS", default = "3600")]
    pub agency_payout_scheduler_interval_secs: u64,

    // DocuSeal API configuration
    #[envconfig(from = "DOCUSEAL_API_KEY", default = "")]
    pub docuseal_api_key: String,

    #[envconfig(from = "DOCUSEAL_API_URL", default = "https://api.docuseal.com")]
    pub docuseal_api_url: String,

    #[envconfig(from = "DOCUSEAL_APP_URL", default = "https://docuseal.co")]
    pub docuseal_app_url: String,

    #[envconfig(from = "DOCUSEAL_WEBHOOK_URL", default = "")]
    pub docuseal_webhook_url: String,

    #[envconfig(from = "DOCUSEAL_USER_EMAIL", default = "")]
    pub docuseal_user_email: String,

    #[envconfig(from = "DOCUSEAL_MASTER_TEMPLATE_ID", default = "")]
    pub docuseal_master_template_id: String,

    #[envconfig(from = "DOCUSEAL_MASTER_TEMPLATE_NAME", default = "")]
    pub docuseal_master_template_name: String,

    #[envconfig(from = "FRONTEND_URL", default = "http://localhost:5173")]
    pub frontend_url: String,

    // Studio Provider API Keys
    #[envconfig(from = "FAL_API_KEY", default = "")]
    pub fal_api_key: String,

    #[envconfig(from = "FAL_API_URL", default = "https://queue.fal.run")]
    pub fal_api_url: String,

    // Calendly Integration (IRL Booking)
    #[envconfig(from = "CALENDLY_BOOKING_URL", default = "")]
    pub calendly_booking_url: String,

    #[envconfig(from = "CALENDLY_WEBHOOK_SIGNING_KEY", default = "")]
    pub calendly_webhook_signing_key: String,

    #[envconfig(from = "CALENDLY_API_TOKEN", default = "")]
    pub calendly_api_token: String,

    // Cache Configuration
    /// TTL for L2 session cache entries in seconds (default: 30 min)
    #[envconfig(from = "CACHE_L2_TTL_SECS", default = "1800")]
    pub cache_l2_ttl_secs: u64,

    /// TTL for L3 application cache entries in seconds (default: 1 hour)
    #[envconfig(from = "CACHE_L3_TTL_SECS", default = "3600")]
    pub cache_l3_ttl_secs: u64,

    /// Interval for L3 background refresh in seconds (default: 5 min)
    #[envconfig(from = "CACHE_L3_REFRESH_SECS", default = "300")]
    pub cache_l3_refresh_secs: u64,

    /// Maximum entries in L2 session cache (default: 10000)
    #[envconfig(from = "CACHE_L2_MAX_ENTRIES", default = "10000")]
    pub cache_l2_max_entries: usize,

    /// Maximum entries in L3 application cache (default: 1000)
    #[envconfig(from = "CACHE_L3_MAX_ENTRIES", default = "1000")]
    pub cache_l3_max_entries: usize,

    /// TTL for idempotency records in seconds (default: 24 hours)
    #[envconfig(from = "CACHE_IDEMPOTENCY_TTL_SECS", default = "86400")]
    pub cache_idempotency_ttl_secs: u64,

    /// Secret token for authenticating cron job endpoints
    #[envconfig(from = "CRON_SECRET", default = "")]
    pub cron_secret: String,

    /// Brand trial period in days (default: 14)
    #[envconfig(from = "BRAND_TRIAL_DAYS", default = "14")]
    pub brand_trial_days: u32,
}

#[derive(Clone)]
pub struct AppState {
    pub pg: Postgrest,
    pub veriff: VeriffConfig,
    pub duix: DuixConfig,
    pub supabase_url: String,
    pub supabase_service_key: String,
    pub supabase_jwt_secret: String,
    pub supabase_bucket_public: String,
    pub supabase_bucket_private: String,
    pub supabase_bucket_temp: String,
    pub elevenlabs_api_key: String,

    pub stripe_secret_key: String,
    pub stripe_client_id: String,
    pub stripe_return_url: String,
    pub stripe_refresh_url: String,
    pub stripe_webhook_secret: String,

    pub stripe_agency_price_id: String,
    pub stripe_scale_price_id: String,
    pub stripe_licensing_basic_price_id: String,
    pub stripe_licensing_pro_price_id: String,
    pub stripe_licensing_enterprise_price_id: String,

    pub stripe_agency_basic_base_price_id: String,
    pub stripe_agency_basic_base_annual_price_id: String,
    pub stripe_agency_basic_headcount_price_id: String,
    pub stripe_agency_basic_headcount_annual_price_id: String,
    pub stripe_agency_pro_base_price_id: String,
    pub stripe_creator_basic_price_id: String,
    pub stripe_creator_pro_price_id: String,
    pub stripe_creator_basic_annual_price_id: String,
    pub stripe_creator_pro_annual_price_id: String,
    pub stripe_agency_pro_base_annual_price_id: String,
    pub stripe_agency_pro_headcount_price_id: String,
    pub stripe_agency_pro_headcount_annual_price_id: String,
    pub stripe_agency_irl_booking_price_id: String,
    pub stripe_agency_irl_booking_annual_price_id: String,
    pub stripe_brand_basic_price_id: String,
    pub stripe_brand_basic_annual_price_id: String,
    pub stripe_brand_pro_price_id: String,
    pub stripe_brand_pro_annual_price_id: String,
    pub stripe_brand_studio_addon_price_id: String,
    pub stripe_checkout_success_url: String,
    pub stripe_checkout_cancel_url: String,
    pub stripe_licensing_success_url: String,
    pub stripe_licensing_cancel_url: String,
    pub stripe_creator_success_url: String,
    pub stripe_creator_cancel_url: String,

    pub stripe_studio_success_url: String,
    pub stripe_studio_cancel_url: String,
    pub stripe_studio_price_ids: String,
    pub stripe_studio_lite_price_ids: String,
    pub stripe_studio_pro_price_ids: String,

    // Payout Logic
    pub payouts_enabled: bool,
    pub payout_auto_approve_threshold_cents: u32,
    pub min_payout_amount_cents: u32,
    pub instant_payouts_enabled: bool,
    pub payout_fee_bps: u32,
    pub payout_currency: String,
    pub payout_allowed_currencies: Vec<String>,

    pub agency_payout_scheduler_enabled: bool,
    pub agency_payout_scheduler_interval_secs: u64,

    pub smtp_host: String,
    pub smtp_port: u16,
    pub smtp_user: String,
    pub smtp_password: String,
    pub email_from: String,
    pub email_contact_to: String,

    pub smtp_sales_host: String,
    pub smtp_sales_port: u16,
    pub smtp_sales_user: String,
    pub smtp_sales_password: String,
    pub email_from_sales: String,
    pub email_sales_to: String,

    // DocuSeal
    pub docuseal_api_key: String,
    pub docuseal_base_url: String,
    pub docuseal_api_url: String,
    pub docuseal_app_url: String,
    pub docuseal_webhook_url: String,
    pub docuseal_user_email: String,
    pub docuseal_master_template_id: String,
    pub docuseal_master_template_name: String,

    pub frontend_url: String,

    // Studio Provider API Keys
    pub fal_api_key: String,
    pub fal_api_url: String,

    // Calendly Integration (IRL Booking)
    pub calendly_booking_url: String,
    pub calendly_webhook_signing_key: String,
    pub calendly_api_token: String,

    // Cache Layers
    pub cache_l2: std::sync::Arc<crate::cache::SessionCache>,
    pub cache_l3: std::sync::Arc<crate::cache::ApplicationCache>,
    pub cache_idempotency: std::sync::Arc<crate::cache::IdempotencyStore>,
    pub cache_metrics: std::sync::Arc<crate::cache::CacheMetrics>,

    // Cron authentication
    pub cron_secret: String,

    // Brand trial configuration
    pub brand_trial_days: u32,
}
