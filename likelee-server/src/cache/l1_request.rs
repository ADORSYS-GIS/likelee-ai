//! Level 1: Request-Scoped Cache
//!
//! Cache data for the lifetime of a single HTTP request.
//! Uses Axum request extensions to store data that can be reused
//! across sub-functions within the same request without redundant DB calls.
//!
//! **Scope**: Single HTTP request
//! **TTL**: Request lifetime (auto-cleanup)
//! **Invalidation**: Automatic on request completion

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

/// Request-level cache stored in Axum request extensions.
///
/// This cache is created at the start of each request and automatically
/// dropped when the request completes, ensuring zero memory leak risk.
#[derive(Debug, Default)]
pub struct RequestCache {
    /// Inner storage for cached values
    inner: HashMap<String, Arc<[u8]>>,
}

impl RequestCache {
    /// Create a new empty request cache
    pub fn new() -> Self {
        Self {
            inner: HashMap::new(),
        }
    }

    /// Get a cached value by key
    pub fn get(&self, key: &str) -> Option<Arc<[u8]>> {
        self.inner.get(key).cloned()
    }

    /// Set a value in the cache (TTL is ignored for request-level)
    pub fn set(&mut self, key: &str, value: Arc<[u8]>, _ttl: Option<Duration>) {
        self.inner.insert(key.to_string(), value);
    }

    /// Delete a cached value
    pub fn delete(&mut self, key: &str) {
        self.inner.remove(key);
    }

    /// Check if key exists
    pub fn contains(&self, key: &str) -> bool {
        self.inner.contains_key(key)
    }

    /// Get cached JSON value, deserialized
    pub fn get_json<T: serde::de::DeserializeOwned>(&self, key: &str) -> Option<T> {
        self.get(key)
            .and_then(|bytes| serde_json::from_slice(&bytes).ok())
    }

    /// Set JSON value in cache
    pub fn set_json<T: serde::Serialize>(&mut self, key: &str, value: &T) {
        if let Ok(bytes) = serde_json::to_vec(value) {
            self.set(key, bytes.into(), None);
        }
    }

    /// Clear all entries
    pub fn clear(&mut self) {
        self.inner.clear();
    }

    /// Get number of entries
    pub fn len(&self) -> usize {
        self.inner.len()
    }

    /// Check if cache is empty
    pub fn is_empty(&self) -> bool {
        self.inner.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_request_cache_basic() {
        let mut cache = RequestCache::new();

        cache.set("key1", Arc::from(b"value1".as_slice()), None);
        assert_eq!(cache.get("key1"), Some(Arc::from(b"value1".as_slice())));

        cache.delete("key1");
        assert!(cache.get("key1").is_none());
    }

    #[test]
    fn test_request_cache_json() {
        let mut cache = RequestCache::new();

        let data = serde_json::json!({"name": "test", "value": 42});
        cache.set_json("json_key", &data);

        let retrieved: Option<serde_json::Value> = cache.get_json("json_key");
        assert_eq!(retrieved, Some(data));
    }
}
