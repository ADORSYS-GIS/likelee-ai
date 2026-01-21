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
        // Organization Profiles
        .route(
            "/api/organization-register",
            post(crate::organization_profiles::register),
        )
        .route(
            "/api/organization-profile",
            post(crate::organization_profiles::create),
        )
        .route(
            "/api/organization-profile/:id",
            post(crate::organization_profiles::update),
        )
        .route(
            "/api/organization-profile/user/:user_id",
            get(crate::organization_profiles::get_by_user),
        )
        .route(
            "/api/agency/talents",
            get(crate::agencies::list_talents),
        )
        .route(
            "/api/agency/clients",
            get(crate::agencies::list_clients).post(crate::agencies::create_client),
        )
        .route(
            "/api/agency/files/upload",
            post(crate::agencies::upload_agency_file),
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
        // Bookings (Agency Dashboard)
        .route(
            "/api/bookings",
            get(crate::bookings::list).post(crate::bookings::create),
        )
        .route(
            "/api/bookings/with-files",
            post(crate::bookings::create_with_files),
        )
        .route(
            "/api/bookings/:id",
            post(crate::bookings::update),
        )
        .route(
            "/api/bookings/:id/files/upload",
            post(crate::bookings::upload_booking_file),
        )
        .route(
            "/api/bookings/:id/cancel",
            post(crate::bookings::cancel),
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
        .with_state(state)
        .layer(DefaultBodyLimit::max(20_000_000)) // 20MB limit
        .layer(cors)
}
