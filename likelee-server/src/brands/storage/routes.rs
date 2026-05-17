use crate::state::AppState;
use axum::{
    routing::{delete, get, post},
    Router,
};

use super::handlers;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/usage", get(handlers::get_brand_storage_usage))
        .route(
            "/folders",
            get(handlers::list_brand_folders).post(handlers::create_brand_folder),
        )
        .route(
            "/folders/:folder_id",
            delete(handlers::delete_brand_folder).patch(handlers::update_brand_folder),
        )
        .route("/files", get(handlers::list_brand_files))
        .route("/files/upload", post(handlers::upload_brand_storage_file))
        .route(
            "/files/:file_id",
            delete(handlers::delete_brand_storage_file),
        )
        .route(
            "/files/:file_id/signed-url",
            get(handlers::get_brand_storage_file_signed_url),
        )
        .route("/analytics", get(handlers::get_brand_storage_analytics))
}
