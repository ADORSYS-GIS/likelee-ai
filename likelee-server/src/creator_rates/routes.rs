use axum::routing::{get, post};
use axum::Router;

use crate::state::AppState;

use super::handlers;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/creator-rates", get(handlers::get_creator_rates))
        .route("/creator-rates", post(handlers::upsert_creator_rates))
}
