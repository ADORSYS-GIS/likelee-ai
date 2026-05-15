use axum::routing::{get, post, put};
use axum::Router;

use crate::state::AppState;

use super::handlers;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/digitals/:talent_id", get(handlers::list_talent_digitals))
        .route(
            "/digitals/:talent_id",
            post(handlers::create_talent_digital),
        )
        .route("/digitals/:id", put(handlers::update_digital))
        .route("/agency/digitals", get(handlers::list_agency_digitals))
        .route(
            "/digitals/reminders",
            post(handlers::send_digitals_reminders),
        )
}
