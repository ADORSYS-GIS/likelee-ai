//! Level 3: Application-Scoped Cache
//!
//! Cache global, shared data for the lifetime of the application.
//! Preloaded at startup with TTL-based eviction.
//! Shared across all users and sessions.
//!
//! **Scope**: Application lifetime (all users/sessions)
//! **TTL**: Configurable (default: 15 min)
//! **Invalidation**: TTL expiry + manual invalidation
//! **Thread Safety**: Arc<RwLock> for read-heavy access pattern

use parking_lot::RwLock;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

/// Entry in the application cache with TTL tracking
#[derive(Debug, Clone)]
pub struct ApplicationCacheEntry {
    /// Cached value as bytes
    pub value: Arc<[u8]>,
    /// When this entry was created/refreshed
    pub created_at: Instant,
    /// TTL for this entry
    pub ttl: Duration,
}

/// Application-level cache for global shared data.
///
/// Supports:
/// - Preloading at startup
/// - TTL-based expiry
/// - Manual invalidation on config changes
pub struct ApplicationCache {
    /// Inner map with RwLock for read-heavy pattern
    inner: RwLock<HashMap<String, ApplicationCacheEntry>>,
    /// Default TTL for entries
    default_ttl: Duration,
    /// Maximum entries
    max_entries: usize,
}

impl ApplicationCache {
    /// Create a new application cache with the given configuration
    pub fn new(default_ttl: Duration, max_entries: usize) -> Self {
        Self {
            inner: RwLock::new(HashMap::new()),
            default_ttl,
            max_entries,
        }
    }

    /// Get a cached value by key
    pub fn get(&self, key: &str) -> Option<Arc<[u8]>> {
        let inner = self.inner.read();

        inner.get(key).and_then(|entry| {
            // Check if expired
            if entry.created_at.elapsed() > entry.ttl {
                // Entry expired - return None, caller should re-fetch
                return None;
            }

            Some(entry.value.clone())
        })
    }

    /// Set a value with optional custom TTL
    pub fn set(&self, key: &str, value: Arc<[u8]>, ttl: Option<Duration>) {
        let mut inner = self.inner.write();

        // Evict if at capacity
        if inner.len() >= self.max_entries && !inner.contains_key(key) {
            self.evict_expired_locked(&mut inner);
            if inner.len() >= self.max_entries {
                self.evict_oldest_locked(&mut inner, 10);
            }
        }

        inner.insert(
            key.to_string(),
            ApplicationCacheEntry {
                value,
                created_at: Instant::now(),
                ttl: ttl.unwrap_or(self.default_ttl),
            },
        );
    }

    /// Delete a cached value
    pub fn delete(&self, key: &str) {
        let mut inner = self.inner.write();
        inner.remove(key);
    }

    /// Check if key exists and is not expired
    pub fn contains(&self, key: &str) -> bool {
        self.get(key).is_some()
    }

    /// Get cached JSON value, deserialized
    pub fn get_json<T: serde::de::DeserializeOwned>(&self, key: &str) -> Option<T> {
        self.get(key)
            .and_then(|bytes| serde_json::from_slice(&bytes).ok())
    }

    /// Set JSON value in cache
    pub fn set_json<T: serde::Serialize>(&self, key: &str, value: &T, ttl: Option<Duration>) {
        if let Ok(bytes) = serde_json::to_vec(value) {
            self.set(key, bytes.into(), ttl);
        }
    }

    /// Preload multiple entries at startup
    pub fn preload(&self, entries: Vec<(String, Arc<[u8]>, Option<Duration>)>) {
        let mut inner = self.inner.write();
        for (key, value, ttl) in entries {
            inner.insert(
                key,
                ApplicationCacheEntry {
                    value,
                    created_at: Instant::now(),
                    ttl: ttl.unwrap_or(self.default_ttl),
                },
            );
        }
    }

    /// Clear all entries
    pub fn clear(&self) {
        let mut inner = self.inner.write();
        inner.clear();
    }

    /// Evict all expired entries (called internally)
    fn evict_expired_locked(&self, inner: &mut HashMap<String, ApplicationCacheEntry>) {
        let now = Instant::now();
        inner.retain(|_, entry| now.duration_since(entry.created_at) <= entry.ttl);
    }

    /// Evict the N oldest entries (called internally)
    fn evict_oldest_locked(
        &self,
        inner: &mut HashMap<String, ApplicationCacheEntry>,
        count: usize,
    ) {
        // Collect entries with their keys and creation times
        let mut entries: Vec<(String, Instant)> = inner
            .iter()
            .map(|(k, v)| (k.clone(), v.created_at))
            .collect();

        // Sort by creation time (oldest first)
        entries.sort_by_key(|(_, time)| *time);

        // Remove the oldest entries
        for (key, _) in entries.into_iter().take(count) {
            inner.remove(&key);
        }
    }

    /// Evict all expired entries (public for maintenance)
    pub fn evict_expired(&self) {
        let mut inner = self.inner.write();
        self.evict_expired_locked(&mut inner);
    }

    /// Get number of entries
    pub fn len(&self) -> usize {
        self.inner.read().len()
    }

    /// Check if cache is empty
    pub fn is_empty(&self) -> bool {
        self.inner.read().is_empty()
    }

    /// Get all keys (for debugging/metrics)
    pub fn keys(&self) -> Vec<String> {
        self.inner.read().keys().cloned().collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_application_cache_basic() {
        let cache = ApplicationCache::new(Duration::from_secs(60), 100);

        cache.set("key1", Arc::from(b"value1".as_slice()), None);
        assert_eq!(cache.get("key1"), Some(Arc::from(b"value1".as_slice())));

        cache.delete("key1");
        assert!(cache.get("key1").is_none());
    }

    #[test]
    fn test_application_cache_preload() {
        let cache = ApplicationCache::new(Duration::from_secs(60), 100);

        cache.preload(vec![
            ("key1".to_string(), Arc::from(b"value1".as_slice()), None),
            ("key2".to_string(), Arc::from(b"value2".as_slice()), None),
        ]);

        assert_eq!(cache.len(), 2);
        assert!(cache.get("key1").is_some());
        assert!(cache.get("key2").is_some());
    }

    #[test]
    fn test_application_cache_json() {
        let cache = ApplicationCache::new(Duration::from_secs(60), 100);

        let data = serde_json::json!({"config": "value"});
        cache.set_json("config", &data, None);

        let retrieved: Option<serde_json::Value> = cache.get_json("config");
        assert_eq!(retrieved, Some(data));
    }
}
