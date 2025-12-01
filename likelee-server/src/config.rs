use postgrest::Postgrest;
use aws_sdk_rekognition::Client as RekogClient;
use envconfig::Envconfig;

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
}

#[derive(Clone)]
pub struct AppState {
    pub pg: Postgrest,
    pub veriff: VeriffConfig,
    pub duix: DuixConfig,
    pub rekog: Option<RekogClient>,
    pub supabase_url: String,
    pub supabase_service_key: String,
    pub supabase_bucket_public: String,
}
