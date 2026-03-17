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
use std::sync::Arc;
use tracing::debug;

use super::{CacheMetrics, CacheLevel, IdempotencyStore, RequestCache};

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
pub async fn cache_layer(
    request: Request,
    next: Next,
) -> Response {
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
    if !matches!(request.method(), &Method::POST | &Method::PATCH | &Method::DELETE) {
        return next.run(request).await;
    }

    // Check for idempotency key
    let idempotency_key = request
        .headers()
        .get("Idempotency-Key")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    if let Some(key) = idempotency_key {
        // Check if key has been processed
        if let Some((body, status_code)) = idempotency_store.get(&key) {
            cache_metrics.hit(CacheLevel::Idempotency);
            debug!(
                key = %key,
                status = status_code,
                "Idempotency key hit - returning cached response"
            );
            
            // Return cached response
            return Response::builder()
                .status(StatusCode::from_u16(status_code).unwrap_or(StatusCode::OK))
                .header("X-Idempotent-Replayed", "true")
                .header(header::CONTENT_TYPE, "application/json")
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
) {
    if key.is_empty() {
        return;
    }
    
    idempotency_store.set(
        key,
        Arc::from(response_body.to_vec().into_boxed_slice()),
        status_code,
    );
}

/// Helper to extract idempotency key from request headers
pub fn get_idempotency_key(request: &Request) -> Option<String> {
    request
        .headers()
        .get("Idempotency-Key")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .filter(|s| !s.trim().is_empty())
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

    #[test]
    fn test_request_cache_ext() {
        let ext = RequestCacheExt::new();
        let cache = ext.cache();
        
        cache.write().set("key1", Arc::from(b"value1".as_slice()), None);
        assert_eq!(
            cache.read().get("key1"),
            Some(Arc::from(b"value1".as_slice()))
        );
    }
}
