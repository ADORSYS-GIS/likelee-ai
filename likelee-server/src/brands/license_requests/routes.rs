use crate::state::AppState;
use axum::{
    routing::{get, post},
    Router,
};

use super::handlers;

pub fn routes() -> Router<AppState> {
    Router::new().route("/", get(handlers::list_for_brand).post(handlers::create))
}

pub fn agency_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/agency/brand-license-requests",
            get(handlers::list_for_agency),
        )
        .route(
            "/api/agency/brand-license-requests/status",
            post(handlers::update_status_for_agency),
        )
}
