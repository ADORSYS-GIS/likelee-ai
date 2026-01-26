use crate::config::AppState;
use axum::{
    extract::DefaultBodyLimit,
    routing::{delete, get, post},
    Router,
};
use tower_http::cors::{Any, CorsLayer};

pub fn build_router(state: AppState) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);
    Router::new()
        .route("/api/kyc/session", post(crate::kyc::create_session))
        .route("/api/kyc/status", get(crate::kyc::get_status))
        .route(
            "/api/kyc/organization/session",
            post(crate::kyc::create_session),
        )
        .route("/api/kyc/organization/status", get(crate::kyc::get_status))
        // Brands
        .route("/api/brand-register", post(crate::brands::register))
        .route("/api/brand-profile", post(crate::brands::update))
        .route("/api/brand-profile/user", get(crate::brands::get_by_user))
        // Agencies
        .route("/api/agency-register", post(crate::agencies::register))
        .route("/api/agency-profile", post(crate::agencies::update))
        .route(
            "/api/agency-profile/user",
            get(crate::agencies::get_by_user),
        )
        .route("/api/dashboard", get(crate::dashboard::get_dashboard))
        // Removed legacy Tavus routes
        .route("/webhooks/kyc/veriff", post(crate::kyc::veriff_webhook))
        .route("/api/email/available", get(crate::creators::check_email))
        .route("/api/profile", post(crate::creators::upsert_profile))
        .route(
            "/api/profile/photo-upload",
            post(crate::creators::upload_profile_photo),
        )
        .route(
            "/api/face-profiles",
            post(crate::face_profiles::create_face_profile),
        )
        .route(
            "/api/face-profiles/:id",
            post(crate::face_profiles::update_face_profile),
        )
        .route(
            "/api/moderation/image",
            post(crate::moderation::moderate_image),
        )
        .route(
            "/api/moderation/image-bytes",
            post(crate::moderation::moderate_image_bytes),
        )
        .route(
            "/api/reference-images/upload",
            post(crate::reference_images::upload_reference_image),
        )
        .route(
            "/api/reference-images",
            get(crate::reference_images::list_reference_images),
        )
        // Voice
        .route(
            "/api/voice/recordings",
            post(crate::voice::upload_voice_recording),
        )
        .route(
            "/api/voice/recordings",
            get(crate::voice::list_voice_recordings),
        )
        .route(
            "/api/voice/models",
            post(crate::voice::register_voice_model),
        )
        .route(
            "/api/voice/models/clone",
            post(crate::voice::create_clone_from_recording),
        )
        .route(
            "/api/voice/recordings/signed-url",
            get(crate::voice::signed_url_for_recording),
        )
        .route(
            "/api/voice/recordings/:id",
            delete(crate::voice::delete_voice_recording),
        )
        // Licensing activation stub (to be called by checkout flow)
        .route(
            "/api/licenses/activated",
            post(crate::licenses::activated_stub),
        )
        // Brand voice folders/assets listing (implemented in licenses module)
        .route(
            "/api/brand/voice-folders",
            get(crate::licenses::list_brand_voice_folders),
        )
        .route(
            "/api/brand/voice-assets",
            get(crate::licenses::list_brand_voice_assets),
        )
        // Creatify integration
        .route(
            "/api/creatify/avatar-from-video",
            post(crate::creatify::create_avatar_from_video),
        )
        .route(
            "/api/creatify/avatar/status",
            get(crate::creatify::get_avatar_status),
        )
        .route(
            "/api/creatify/avatar/status/by-id",
            get(crate::creatify::get_avatar_status_by_id),
        )
        .route(
            "/api/creatify/avatar/set",
            post(crate::creatify::set_creatify_avatar_id),
        )
        .route(
            "/api/creatify/lipsyncs",
            post(crate::creatify::start_lipsync),
        )
        .route(
            "/api/creatify/lipsyncs/status",
            get(crate::creatify::get_lipsync_status),
        )
        .route(
            "/webhooks/creatify",
            post(crate::creatify::creatify_webhook),
        )
        // Payouts
        .route(
            "/api/payouts/onboarding_link",
            post(crate::payouts::create_onboarding_link),
        )
        .route(
            "/api/payouts/account_status",
            get(crate::payouts::get_account_status),
        )
        .route("/api/payouts/balance", get(crate::payouts::get_balance))
        .route("/api/payouts/request", post(crate::payouts::request_payout))
        .route("/api/payouts/history", get(crate::payouts::get_history))
        .route("/webhooks/stripe", post(crate::payouts::stripe_webhook))
        // Integrations: Core
        .route(
            "/api/integrations/core/send-email",
            post(crate::email::send_email),
        )
        .route(
            "/api/creator-rates",
            get(crate::creator_rates::get_creator_rates)
                .post(crate::creator_rates::upsert_creator_rates),
        )
        // Scouting (DocuSeal)
        .route(
            "/api/scouting/templates",
            get(crate::scouting::list_templates)
                .post(crate::scouting::create_template),
        )
        .route(
            "/api/scouting/templates/sync",
            post(crate::scouting::sync_templates),
        )
        .route(
            "/api/scouting/templates/upload",
            post(crate::scouting::create_template_from_pdf),
        )
        .route(
            "/api/scouting/templates/:id",
            delete(crate::scouting::delete_template)
                .put(crate::scouting::update_template_from_pdf),
        )
        .route(
            "/api/scouting/offers",
            get(crate::scouting::list_offers).post(crate::scouting::create_offer),
        )
        .route(
            "/api/scouting/offers/:offer_id",
            get(crate::scouting::get_offer_details).delete(crate::scouting::delete_offer),
        )
        .route(
            "/api/scouting/offers/refresh-status",
            post(crate::scouting::refresh_offer_status),
        )
        .route(
            "/api/scouting/builder-token",
            post(crate::scouting::create_builder_token),
        )
        .route(
            "/webhooks/docuseal",
            post(crate::scouting::handle_webhook),
        )
        .with_state(state)
        .layer(DefaultBodyLimit::max(20_000_000)) // 20MB limit
        .layer(cors)
}
