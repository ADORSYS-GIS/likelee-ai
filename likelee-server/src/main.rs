use aws_config::BehaviorVersion;
use aws_types::region::Region;
use dotenvy::dotenv;
use envconfig::Envconfig;
use postgrest::Postgrest;
use serde_json::json;
use tracing::{info, warn};

#[tokio::main]
async fn main() {
    dotenv().ok();
    let cfg = likelee_server::config::ServerConfig::init_from_env()
        .expect("invalid/missing environment configuration");
    let port = cfg.port;
    let moderation_enabled = cfg.moderation_enabled != "0";

    // Init tracing
    let filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info"));
    tracing_subscriber::fmt().with_env_filter(filter).init();
    info!(port, endpoint_base = %cfg.veriff_base_url, "Starting likelee-server");

    let supabase_base = cfg.supabase_url.trim_end_matches('/');
    let postgrest_base = if supabase_base.ends_with("/rest/v1") {
        supabase_base.to_string()
    } else {
        format!("{}/rest/v1", supabase_base)
    };

    let pg = Postgrest::new(postgrest_base.clone())
        .insert_header("apikey", cfg.supabase_service_key.clone())
        .insert_header(
            "Authorization",
            format!("Bearer {}", cfg.supabase_service_key),
        );

    // Ensure Storage buckets and policies exist (Option B: server-only writes)
    {
        let rpc = Postgrest::new(postgrest_base.clone())
            .insert_header("apikey", cfg.supabase_service_key.clone())
            .insert_header(
                "Authorization",
                format!("Bearer {}", cfg.supabase_service_key),
            );
        let body = json!({
            "p_public_bucket": cfg.supabase_bucket_public,
            "p_private_bucket": cfg.supabase_bucket_private,
            "p_temp_bucket": cfg.supabase_bucket_temp,
        });
        match rpc.rpc("ensure_storage", body.to_string()).execute().await {
            Ok(_) => info!(
                public = %cfg.supabase_bucket_public,
                private = %cfg.supabase_bucket_private,
                temp = %cfg.supabase_bucket_temp,
                "storage buckets ensured"
            ),
            Err(e) => {
                warn!(error = %e, "failed to ensure storage buckets/policies via RPC; continuing")
            }
        }
    }

    let rekog = if moderation_enabled {
        let region = Region::new(cfg.aws_region.clone());
        let sdk_config = aws_config::defaults(BehaviorVersion::latest())
            .region(region)
            .load()
            .await;
        let client = aws_sdk_rekognition::Client::new(&sdk_config);
        info!(moderation_enabled, "AWS Rekognition client initialized");
        Some(client)
    } else {
        info!("rekognition: disabled (moderation disabled)");

        None
    };

    let state = likelee_server::config::AppState {
        pg,
        veriff: likelee_server::config::VeriffConfig {
            base_url: cfg.veriff_base_url,
            api_key: cfg.veriff_api_key,
            shared_secret: cfg.veriff_shared_secret,
        },
        duix: likelee_server::config::DuixConfig {
            base_url: cfg.duix_base_url,
            auth_token: cfg.duix_auth_token,
        },
        rekog,
        supabase_url: cfg.supabase_url.clone(),
        supabase_service_key: cfg.supabase_service_key.clone(),
        supabase_jwt_secret: cfg.supabase_jwt_secret.clone(),
        supabase_bucket_public: cfg.supabase_bucket_public.clone(),
        supabase_bucket_private: cfg.supabase_bucket_private.clone(),
        elevenlabs_api_key: cfg.elevenlabs_api_key.clone(),
        creatify_base_url: cfg.creatify_base_url.clone(),
        creatify_api_id: cfg.creatify_api_id.clone(),
        creatify_api_key: cfg.creatify_api_key.clone(),
        creatify_callback_url: cfg.creatify_callback_url.clone(),
        tavus_api_key: cfg.tavus_api_key.clone(),
        tavus_base_url: cfg.tavus_base_url.clone(),
        tavus_webhook_secret: cfg.tavus_webhook_secret.clone(),
        tavus_callback_url: cfg.tavus_callback_url.clone(),
        stripe_secret_key: cfg.stripe_secret_key.clone(),
        stripe_client_id: cfg.stripe_client_id.clone(),
        stripe_return_url: cfg.stripe_return_url.clone(),
        stripe_refresh_url: cfg.stripe_refresh_url.clone(),
        stripe_webhook_secret: cfg.stripe_webhook_secret.clone(),
        payouts_enabled: cfg.payouts_enabled,
        payout_auto_approve_threshold_cents: cfg.payout_auto_approve_threshold_cents,
        min_payout_amount_cents: cfg.min_payout_amount_cents,
        instant_payouts_enabled: cfg.instant_payouts_enabled,
        payout_fee_bps: cfg.payout_fee_bps,
        payout_currency: cfg.payout_currency.clone(),
        payout_allowed_currencies: cfg
            .payout_allowed_currencies
            .split(',')
            .map(|s| s.trim().to_uppercase())
            .filter(|s| !s.is_empty())
            .collect(),

        smtp_host: cfg.smtp_host.clone(),
        smtp_port: cfg.smtp_port,
        smtp_user: cfg.smtp_user.clone(),
        smtp_password: cfg.smtp_password.clone(),
        email_from: cfg.email_from.clone(),
        email_contact_to: cfg.email_contact_to.clone(),

        docuseal_api_key: cfg.docuseal_api_key.clone(),
        docuseal_api_url: cfg.docuseal_api_url.clone(),
        docuseal_app_url: cfg.docuseal_app_url.clone(),
        docuseal_webhook_url: cfg.docuseal_webhook_url.clone(),
        docuseal_user_email: cfg.docuseal_user_email.clone(),
    };

    let app = likelee_server::router::build_router(state);

    let listener = tokio::net::TcpListener::bind(("0.0.0.0", port))
        .await
        .expect("bind port");
    axum::serve(listener, app).await.expect("server run");
}
