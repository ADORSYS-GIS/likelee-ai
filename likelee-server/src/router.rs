use crate::config::AppState;
use axum::{
    routing::{get, post},
    Router,
};
use tower_http::cors::{Any, CorsLayer};
use axum::extract::DefaultBodyLimit;

pub fn build_router(state: AppState) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);
    Router::new()
        .layer(DefaultBodyLimit::max(5 * 1024 * 1024))
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
        .route("/api/dashboard", get(crate::dashboard::get_dashboard))
        .route("/api/avatar/generate", post(crate::avatar::generate_avatar))
        .route("/webhooks/kyc/veriff", post(crate::kyc::veriff_webhook))
        .route("/api/email/available", get(crate::profiles::check_email))
        .route("/api/profile", post(crate::profiles::upsert_profile))
        .route("/api/profile/photo-upload", post(crate::profiles::upload_profile_photo))
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
        .route(
            "/api/liveness/create",
            post(crate::liveness::create_session),
        )
        .route(
            "/api/liveness/result",
            post(crate::liveness::liveness_result),
        )
        .with_state(state)
        .layer(cors)
}
