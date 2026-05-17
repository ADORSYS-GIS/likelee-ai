use crate::state::AppState;
use axum::{
    routing::{get, post},
    Router,
};

use super::handlers;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/brand-register", post(handlers::register))
        .route("/api/brand-profile", post(handlers::update))
        .route("/api/brand-profile/user", get(handlers::get_by_user))
        .route(
            "/api/brand/notifications",
            get(handlers::list_notifications),
        )
        .route(
            "/api/brand/notifications/count",
            get(handlers::get_notification_count),
        )
        .route(
            "/api/brand/notifications/:id/read",
            post(handlers::mark_notification_read),
        )
        .route(
            "/api/brand/inbox/unread-count",
            get(handlers::get_inbox_unread_count),
        )
        .route(
            "/api/brand/inbox/mark-viewed",
            post(handlers::mark_inbox_packages_viewed),
        )
        .route(
            "/api/brand/jobs/unread-count",
            get(handlers::get_jobs_unread_count),
        )
        .route(
            "/api/brand/jobs/mark-viewed",
            post(handlers::mark_job_applications_viewed),
        )
        .route(
            "/api/brand/licensing/contracts-count",
            get(handlers::get_licensing_contracts_count),
        )
}
