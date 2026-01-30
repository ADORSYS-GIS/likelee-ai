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

    // Creatify API configuration
    #[envconfig(from = "CREATIFY_BASE_URL", default = "https://creatify.ai")]
    pub creatify_base_url: String,

    #[envconfig(from = "CREATIFY_API_ID", default = "")]
    pub creatify_api_id: String,

    #[envconfig(from = "CREATIFY_API_KEY", default = "")]
    pub creatify_api_key: String,

    // Public callback URL for Creatify to hit our webhook
    #[envconfig(from = "CREATIFY_CALLBACK_URL", default = "")]
    pub creatify_callback_url: String,

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

    // Tavus API configuration
    #[envconfig(from = "TAVUS_API_KEY", default = "")]
    pub tavus_api_key: String,

    #[envconfig(from = "TAVUS_BASE_URL", default = "https://tavusapi.com")]
    pub tavus_base_url: String,

    #[envconfig(from = "TAVUS_WEBHOOK_SECRET", default = "")]
    pub tavus_webhook_secret: String,

    #[envconfig(from = "TAVUS_CALLBACK_URL", default = "")]
    pub tavus_callback_url: String,

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

    // Payout Logic
    #[envconfig(from = "PAYOUTS_ENABLED", default = "false")]
    pub payouts_enabled: bool,

    #[envconfig(from = "PAYOUT_AUTO_APPROVE_THRESHOLD_CENTS", default = "5000")]
    pub payout_auto_approve_threshold_cents: u32,

    #[envconfig(from = "MIN_PAYOUT_AMOUNT_CENTS", default = "1000")]
    pub min_payout_amount_cents: u32,

    #[envconfig(from = "INSTANT_PAYOUTS_ENABLED", default = "false")]
    pub instant_payouts_enabled: bool,

    #[envconfig(from = "PAYOUT_FEE_BPS", default = "100")] // 1%
    pub payout_fee_bps: u32,

    #[envconfig(from = "PAYOUT_CURRENCY", default = "USD")]
    pub payout_currency: String,

    #[envconfig(from = "PAYOUT_ALLOWED_CURRENCIES", default = "USD,EUR")]
    pub payout_allowed_currencies: String,
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
    pub creatify_base_url: String,
    pub creatify_api_id: String,
    pub creatify_api_key: String,
    pub creatify_callback_url: String,
    pub tavus_api_key: String,
    pub tavus_base_url: String,
    pub tavus_webhook_secret: String,
    pub tavus_callback_url: String,

    pub stripe_secret_key: String,
    pub stripe_client_id: String,
    pub stripe_return_url: String,
    pub stripe_refresh_url: String,
    pub stripe_webhook_secret: String,

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
}
