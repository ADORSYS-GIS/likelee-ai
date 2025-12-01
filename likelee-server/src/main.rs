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

    let pg = Postgrest::new(format!("{}/rest/v1", cfg.supabase_url))
        .insert_header("apikey", cfg.supabase_service_key.clone())
        .insert_header(
            "Authorization",
            format!("Bearer {}", cfg.supabase_service_key),
        );

    // Ensure Storage buckets and policies exist (Option B: server-only writes)
    {
        let rpc = Postgrest::new(format!("{}/rest/v1", cfg.supabase_url))
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
        info!("moderation: AWS Rekognition client initialized");
        Some(client)
    } else {
        info!("moderation: disabled via MODERATION_ENABLED=0");
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
        supabase_bucket_public: cfg.supabase_bucket_public.clone(),
    };

    let app = likelee_server::router::build_router(state);

    let listener = tokio::net::TcpListener::bind(("0.0.0.0", port))
        .await
        .expect("bind port");
    axum::serve(listener, app).await.expect("server run");
}
