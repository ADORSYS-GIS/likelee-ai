pub async fn generate_signed_url(
    state: &crate::state::AppState,
    bucket: &str,
    path: &str,
) -> Option<String> {
    crate::storage::generate_signed_url(state, bucket, path, 86_400)
        .await
        .ok()
}
