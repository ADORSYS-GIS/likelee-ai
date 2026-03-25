//! Idempotency Key Support
//!
//! Ensures mutating endpoints (POST, PATCH, DELETE) are idempotent so that
//! retrying a failed request never produces unintended side effects.
//!
//! **How it works**:
//! 1. Client sends `Idempotency-Key` header with a unique UUID
//! 2. Server checks if key has been processed before
//! 3. If yes, returns cached response immediately
//! 4. If no, executes operation, stores result after successful commit
//!
//! **TTL**: 24 hours (default)
//! **Thread Safety**: DashMap for concurrent access

use dashmap::DashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tracing::debug;

/// Record of a processed idempotency key
#[derive(Debug, Clone)]
pub struct IdempotencyRecord {
    /// The original request response body
    pub response_body: Arc<[u8]>,
    /// HTTP status code of the original response
    pub status_code: u16,
    /// Response content type (if known)
    pub content_type: Option<Arc<str>>,
    /// When this record was created
    pub created_at: Instant,
    /// TTL for this record
    pub ttl: Duration,
}

/// Store for idempotency keys using DashMap for concurrent access.
///
/// Keys are stored with a TTL (default 24 hours) and automatically
/// evicted when expired.
pub struct IdempotencyStore {
    /// Inner concurrent map
    inner: DashMap<String, IdempotencyRecord>,
    /// Default TTL for records
    default_ttl: Duration,
}

impl IdempotencyStore {
    /// Create a new idempotency store with default TTL
    pub fn new(default_ttl: Duration) -> Self {
        Self {
            inner: DashMap::new(),
            default_ttl,
        }
    }

    /// Check if a key has been processed and return the cached response
    pub fn get(&self, key: &str) -> Option<(Arc<[u8]>, u16, Option<Arc<str>>)> {
        self.inner.get(key).and_then(|entry| {
            // Check if expired
            if entry.created_at.elapsed() > entry.ttl {
                drop(entry);
                self.inner.remove(key);
                return None;
            }

            Some((
                entry.response_body.clone(),
                entry.status_code,
                entry.content_type.clone(),
            ))
        })
    }

    /// Store a result for an idempotency key
    /// Should only be called AFTER the database transaction commits successfully
    pub fn set(
        &self,
        key: &str,
        response_body: Arc<[u8]>,
        status_code: u16,
        content_type: Option<Arc<str>>,
    ) {
        self.inner.insert(
            key.to_string(),
            IdempotencyRecord {
                response_body,
                status_code,
                content_type,
                created_at: Instant::now(),
                ttl: self.default_ttl,
            },
        );

        debug!(key = %key, "Idempotency key stored");
    }

    /// Store a result with custom TTL
    pub fn set_with_ttl(
        &self,
        key: &str,
        response_body: Arc<[u8]>,
        status_code: u16,
        content_type: Option<Arc<str>>,
        ttl: Duration,
    ) {
        self.inner.insert(
            key.to_string(),
            IdempotencyRecord {
                response_body,
                status_code,
                content_type,
                created_at: Instant::now(),
                ttl,
            },
        );
    }

    /// Remove an idempotency key (use if operation failed after storing)
    pub fn remove(&self, key: &str) {
        self.inner.remove(key);
    }

    /// Check if key exists (without retrieving)
    pub fn contains(&self, key: &str) -> bool {
        self.inner
            .get(key)
            .map(|entry| entry.created_at.elapsed() <= entry.ttl)
            .unwrap_or(false)
    }

    /// Evict all expired entries
    pub fn evict_expired(&self) {
        let now = Instant::now();
        self.inner
            .retain(|_, entry| now.duration_since(entry.created_at) <= entry.ttl);
    }

    /// Get number of entries
    pub fn len(&self) -> usize {
        self.inner.len()
    }

    /// Check if store is empty
    pub fn is_empty(&self) -> bool {
        self.inner.is_empty()
    }
}

/// Helper to extract idempotency key from request headers
#[allow(dead_code)]
pub fn extract_idempotency_key(headers: &axum::http::HeaderMap) -> Option<String> {
    headers
        .get("Idempotency-Key")
        .and_then(|value| value.to_str().ok())
        .map(|s| s.to_string())
        .filter(|s| !s.is_empty())
}

/// Helper to validate idempotency key format (should be a UUID)
#[allow(dead_code)]
pub fn is_valid_idempotency_key(key: &str) -> bool {
    // Accept any non-empty string for flexibility
    // Client is responsible for generating unique keys
    !key.trim().is_empty()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_idempotency_store_basic() {
        let store = IdempotencyStore::new(Duration::from_secs(3600));

        let key = "test-key-123";
        let response: Arc<[u8]> = Arc::from(b"{\"status\":\"success\"}".as_slice());

        // Initially not present
        assert!(store.get(key).is_none());

        // Store result
        store.set(key, response.clone(), 200, Some(Arc::from("application/json")));

        // Retrieve result
        let (body, status, content_type) = store.get(key).unwrap();
        assert_eq!(body.as_ref(), b"{\"status\":\"success\"}");
        assert_eq!(status, 200);
        assert_eq!(content_type.as_deref(), Some("application/json"));
    }

    #[test]
    fn test_idempotency_expiry() {
        let store = IdempotencyStore::new(Duration::from_millis(10));

        let key = "expiring-key";
        store.set(key, Arc::from(b"response".as_slice()), 200, None);

        // Wait for expiry
        std::thread::sleep(Duration::from_millis(20));

        // Should be expired
        assert!(store.get(key).is_none());
    }

    #[test]
    fn test_extract_idempotency_key() {
        use axum::http::HeaderMap;

        let mut headers = HeaderMap::new();
        headers.insert("Idempotency-Key", "uuid-1234".parse().unwrap());

        assert_eq!(
            extract_idempotency_key(&headers),
            Some("uuid-1234".to_string())
        );
    }
}
