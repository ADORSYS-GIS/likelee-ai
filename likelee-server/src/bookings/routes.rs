use axum::{
    routing::{delete, get, post},
    Router,
};

use crate::state::AppState;

/// Booking-related routes, grouped for future router nesting.
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/bookings", get(super::list).post(super::create))
        .route("/bookings/with-files", post(super::create_with_files))
        .route("/bookings/:id", post(super::update))
        .route("/bookings/:id/cancel", post(super::cancel))
        .route(
            "/bookings/:id/files/upload",
            post(super::upload_booking_file),
        )
        .route(
            "/bookings/:id/files/:file_id",
            get(super::serve_booking_file),
        )
        .route(
            "/bookings-campaigns",
            get(crate::bookings::campaigns::list).post(crate::bookings::campaigns::create),
        )
        .route(
            "/bookings-campaigns/:id",
            post(crate::bookings::campaigns::update)
                .delete(crate::bookings::campaigns::delete_campaign),
        )
        .route(
            "/bookings-campaigns/:campaign_id/deliverables",
            get(crate::bookings::deliverables::list_deliverables)
                .post(crate::bookings::deliverables::upload_deliverable),
        )
        .route(
            "/bookings-campaigns/:campaign_id/deliverables/submit",
            post(crate::bookings::deliverables::submit_deliverables),
        )
        .route(
            "/bookings-campaigns/:campaign_id/deliverables/submit-to-brand",
            post(crate::bookings::deliverables::submit_to_brand),
        )
        .route(
            "/bookings-campaigns/:campaign_id/deliverables/:deliverable_id/review",
            post(crate::bookings::deliverables::review_deliverable),
        )
        .route(
            "/bookings-campaigns/:campaign_id/deliverables/:deliverable_id",
            delete(crate::bookings::deliverables::delete_deliverable),
        )
        .route(
            "/bookings-campaigns/:campaign_id/deliverables/:deliverable_id/file",
            get(crate::bookings::deliverables::serve_deliverable_file),
        )
        .route(
            "/booking/calendly-url",
            get(crate::bookings::calendly::get_calendly_booking_url),
        )
}
