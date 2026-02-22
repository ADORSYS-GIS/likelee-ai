use aws_sdk_rekognition::Client as RekogClient;
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

    // Keep as string to allow legacy "1"/"0" values
    #[envconfig(from = "MODERATION_ENABLED", default = "1")]
    pub moderation_enabled: String,

    #[envconfig(from = "AWS_REGION", default = "us-east-1")]
    pub aws_region: String,

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

    #[envconfig(from = "STRIPE_AGENCY_PRO_BASE_PRICE_ID", default = "")]
    pub stripe_agency_pro_base_price_id: String,

    #[envconfig(from = "STRIPE_CHECKOUT_SUCCESS_URL", default = "")]
    pub stripe_checkout_success_url: String,

    #[envconfig(from = "STRIPE_CHECKOUT_CANCEL_URL", default = "")]
    pub stripe_checkout_cancel_url: String,

    #[envconfig(from = "STRIPE_LICENSING_SUCCESS_URL", default = "")]
    pub stripe_licensing_success_url: String,

    #[envconfig(from = "STRIPE_LICENSING_CANCEL_URL", default = "")]
    pub stripe_licensing_cancel_url: String,

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

    #[envconfig(from = "KYC_BYPASS_VERIFF_LIMIT", default = "false")]
    pub kyc_bypass_veriff_limit: bool,

    #[envconfig(from = "FRONTEND_URL", default = "http://localhost:5173")]
    pub frontend_url: String,
}

#[derive(Clone)]
pub struct AppState {
    pub pg: Postgrest,
    pub veriff: VeriffConfig,
    pub duix: DuixConfig,
    pub rekog: Option<RekogClient>,
    pub supabase_url: String,
    pub supabase_service_key: String,
    pub supabase_jwt_secret: String,
    pub supabase_bucket_public: String,
    pub supabase_bucket_private: String,
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
    pub stripe_agency_pro_base_price_id: String,
    pub stripe_checkout_success_url: String,
    pub stripe_checkout_cancel_url: String,
    pub stripe_licensing_success_url: String,
    pub stripe_licensing_cancel_url: String,

    // Payout Logic
    pub payouts_enabled: bool,
    pub payout_auto_approve_threshold_cents: u32,
    pub min_payout_amount_cents: u32,
    pub instant_payouts_enabled: bool,
    pub payout_fee_bps: u32,
    pub payout_currency: String,
    pub payout_allowed_currencies: Vec<String>,

    pub smtp_host: String,
    pub smtp_port: u16,
    pub smtp_user: String,
    pub smtp_password: String,
    pub email_from: String,
    pub email_contact_to: String,

    // DocuSeal
    pub docuseal_api_key: String,
    pub docuseal_base_url: String,
    pub docuseal_api_url: String,
    pub docuseal_app_url: String,
    pub docuseal_webhook_url: String,
    pub docuseal_user_email: String,
    pub docuseal_master_template_id: String,
    pub docuseal_master_template_name: String,

    pub kyc_bypass_veriff_limit: bool,
    pub frontend_url: String,
}
