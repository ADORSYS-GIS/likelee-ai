//! Cache Middleware for Axum
//!
//! Provides request-level cache initialization and idempotency key handling.
//!
//! **Responsibilities**:
//! - Initialize L1 (request) cache at the start of each request
//! - Inject cache into request extensions for handler access
//! - Check idempotency keys for mutating endpoints (POST, PATCH, DELETE)
//! - Record metrics on request completion

use axum::{
    body::Body,
    extract::Request,
    http::{header, Method, StatusCode},
    middleware::Next,
    response::Response,
    Extension,
};
use parking_lot::RwLock;
use std::hash::{Hash, Hasher};
use std::sync::Arc;
use tracing::debug;

use super::{CacheLevel, CacheMetrics, IdempotencyStore, RequestCache};

/// Extension type for L1 request cache using RwLock for thread safety
#[derive(Clone)]
pub struct RequestCacheExt(pub Arc<RwLock<RequestCache>>);

impl RequestCacheExt {
    /// Create a new request cache extension
    pub fn new() -> Self {
        Self(Arc::new(RwLock::new(RequestCache::new())))
    }

    /// Get the underlying request cache
    pub fn cache(&self) -> &Arc<RwLock<RequestCache>> {
        &self.0
    }
}

impl Default for RequestCacheExt {
    fn default() -> Self {
        Self::new()
    }
}

/// Middleware that initializes L1 request cache and handles idempotency
pub async fn cache_layer(request: Request, next: Next) -> Response {
    // Create L1 request cache
    let request_cache = RequestCacheExt::new();

    // Add request cache as extension
    let mut request = request;
    request.extensions_mut().insert(request_cache);

    // Process request
    let response = next.run(request).await;

    // L1 cache is automatically dropped here (auto-cleanup)
    response
}

/// Idempotency middleware for mutating endpoints
///
/// This should be applied as route-specific middleware for POST, PATCH, DELETE endpoints.
/// It checks for an `Idempotency-Key` header and returns cached responses for repeated keys.
pub async fn idempotency_layer(
    Extension(idempotency_store): Extension<Arc<IdempotencyStore>>,
    Extension(cache_metrics): Extension<Arc<CacheMetrics>>,
    request: Request,
    next: Next,
) -> Response {
    // Only process for mutating methods
    if !matches!(
        request.method(),
        &Method::POST | &Method::PATCH | &Method::DELETE
    ) {
        return next.run(request).await;
    }

    // Check for idempotency key
    if let Some(key) = get_idempotency_key(&request) {
        // Check if key has been processed
        if let Some((body, status_code, content_type)) = idempotency_store.get(&key) {
            cache_metrics.hit(CacheLevel::Idempotency);
            debug!(
                key = %key,
                status = status_code,
                "Idempotency key hit - returning cached response"
            );

            let content_type = content_type.as_deref().unwrap_or("application/json");

            // Return cached response
            return Response::builder()
                .status(StatusCode::from_u16(status_code).unwrap_or(StatusCode::OK))
                .header("X-Idempotent-Replayed", "true")
                .header(header::CONTENT_TYPE, content_type)
                .body(Body::from(body.as_ref().to_vec()))
                .unwrap();
        }

        cache_metrics.miss(CacheLevel::Idempotency);
        debug!(key = %key, "Idempotency key miss - processing request");
    }

    // Process request normally
    next.run(request).await
}

/// Helper to store idempotency result after successful operation
///
/// Call this after a successful database transaction commit.
pub fn store_idempotency_result(
    idempotency_store: &Arc<IdempotencyStore>,
    key: &str,
    response_body: &[u8],
    status_code: u16,
    content_type: Option<&str>,
) {
    if key.is_empty() {
        return;
    }

    idempotency_store.set(
        key,
        Arc::from(response_body.to_vec().into_boxed_slice()),
        status_code,
        content_type.map(Arc::from),
    );
}

/// Helper to extract idempotency key from request headers
pub fn get_idempotency_key(request: &Request) -> Option<String> {
    let raw_key = request
        .headers()
        .get("Idempotency-Key")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .filter(|s| !s.trim().is_empty())?;

    Some(scoped_idempotency_key(request, &raw_key))
}

fn scoped_idempotency_key(request: &Request, raw_key: &str) -> String {
    let method = request.method().as_str();
    let path = request.uri().path();

    let auth = request
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    auth.hash(&mut hasher);
    let auth_hash = hasher.finish();

    format!("{}:{}:{:016x}:{}", method, path, auth_hash, raw_key)
}

/// Helper to get request cache from extensions
pub fn get_request_cache(extensions: &axum::http::Extensions) -> Option<Arc<RwLock<RequestCache>>> {
    extensions
        .get::<RequestCacheExt>()
        .map(|ext| ext.cache().clone())
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::{HeaderValue, Request as HttpRequest};

    #[test]
    fn test_request_cache_ext() {
        let ext = RequestCacheExt::new();
        let cache = ext.cache();

        cache
            .write()
            .set("key1", Arc::from(b"value1".as_slice()), None);
        assert_eq!(
            cache.read().get("key1"),
            Some(Arc::from(b"value1".as_slice()))
        );
    }

    #[test]
    fn test_scoped_idempotency_key_includes_method_path_and_raw_key() {
        let req = HttpRequest::builder()
            .method("POST")
            .uri("/api/jobs")
            .header("Authorization", "Bearer token-a")
            .header("Idempotency-Key", "raw-123")
            .body(Body::empty())
            .unwrap();

        let scoped = get_idempotency_key(&req).unwrap();
        assert!(scoped.starts_with("POST:/api/jobs:"));
        assert!(scoped.ends_with(":raw-123"));

        let parts: Vec<&str> = scoped.splitn(4, ':').collect();
        assert_eq!(parts.len(), 4);
        assert_eq!(parts[0], "POST");
        assert_eq!(parts[1], "/api/jobs");
        assert_eq!(parts[3], "raw-123");
        assert_eq!(parts[2].len(), 16);
        assert!(u64::from_str_radix(parts[2], 16).is_ok());
    }

    #[test]
    fn test_scoped_idempotency_key_changes_with_auth_and_path() {
        let base = HttpRequest::builder()
            .method("POST")
            .uri("/api/jobs")
            .header("Authorization", "Bearer token-a")
            .header("Idempotency-Key", "raw-123")
            .body(Body::empty())
            .unwrap();
        let base_key = get_idempotency_key(&base).unwrap();

        let different_auth = HttpRequest::builder()
            .method("POST")
            .uri("/api/jobs")
            .header("Authorization", "Bearer token-b")
            .header("Idempotency-Key", "raw-123")
            .body(Body::empty())
            .unwrap();
        let different_auth_key = get_idempotency_key(&different_auth).unwrap();
        assert_ne!(base_key, different_auth_key);

        let different_path = HttpRequest::builder()
            .method("POST")
            .uri("/api/jobs/123")
            .header("Authorization", "Bearer token-a")
            .header("Idempotency-Key", "raw-123")
            .body(Body::empty())
            .unwrap();
        let different_path_key = get_idempotency_key(&different_path).unwrap();
        assert_ne!(base_key, different_path_key);

        let mut no_auth = HttpRequest::builder()
            .method("POST")
            .uri("/api/jobs")
            .header("Idempotency-Key", "raw-123")
            .body(Body::empty())
            .unwrap();
        let no_auth_key = get_idempotency_key(&no_auth).unwrap();
        assert_ne!(base_key, no_auth_key);

        // Ensure different raw keys are isolated even with same context
        no_auth
            .headers_mut()
            .insert("Idempotency-Key", HeaderValue::from_static("raw-999"));
        let no_auth_key_2 = get_idempotency_key(&no_auth).unwrap();
        assert_ne!(no_auth_key, no_auth_key_2);
    }
}
