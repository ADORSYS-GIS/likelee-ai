use axum::routing::{delete, get, post};
use axum::Router;

use crate::state::AppState;

use super::handlers;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/reference-images", get(handlers::list_reference_images))
        .route(
            "/reference-images/:section_id",
            delete(handlers::delete_reference_image),
        )
        .route(
            "/reference-images/upload",
            post(handlers::upload_reference_image),
        )
}
