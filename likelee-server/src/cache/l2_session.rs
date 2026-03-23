//! Level 2: Session-Scoped Cache
//!
//! Cache user-specific data across multiple requests for the duration
//! of a session, keyed by session ID (from JWT/cookie).
//!
//! **Scope**: User session (multiple requests)
//! **TTL**: Configurable, expires on inactivity (default: 30 min)
//! **Invalidation**: TTL expiry + explicit invalidation on data mutation
//! **Thread Safety**: DashMap for concurrent access

use dashmap::DashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

/// Entry in the session cache with TTL tracking
#[derive(Debug, Clone)]
pub struct SessionCacheEntry {
    /// Cached value as bytes
    pub value: Arc<[u8]>,
    /// When this entry was last accessed
    pub last_accessed: Instant,
    /// TTL for this entry
    pub ttl: Duration,
}

/// Session-level cache using DashMap for concurrent access.
///
/// Keyed by a combination of session_id and cache key to ensure
/// user isolation. Entries expire after configurable inactivity timeout.
pub struct SessionCache {
    /// Inner concurrent map
    inner: DashMap<String, SessionCacheEntry>,
    /// Default TTL for entries
    default_ttl: Duration,
    /// Maximum entries before eviction
    max_entries: usize,
}

impl SessionCache {
    /// Create a new session cache with the given configuration
    pub fn new(default_ttl: Duration, max_entries: usize) -> Self {
        Self {
            inner: DashMap::new(),
            default_ttl,
            max_entries,
        }
    }

    /// Build a session-scoped key (session_id:key)
    fn session_key(session_id: &str, key: &str) -> String {
        format!("{}:{}", session_id, key)
    }

    /// Get a cached value for a session
    pub fn get(&self, session_id: &str, key: &str) -> Option<Arc<[u8]>> {
        let full_key = Self::session_key(session_id, key);

        self.inner.get(&full_key).and_then(|entry| {
            // Check if expired
            let elapsed = entry.last_accessed.elapsed();
            if elapsed > entry.ttl {
                // Entry expired, remove it
                drop(entry);
                self.inner.remove(&full_key);
                return None;
            }

            // Update last accessed time
            // Note: DashMap doesn't allow mutation through read guard, so we use update
            let value = entry.value.clone();
            let ttl = entry.ttl;
            drop(entry);

            self.inner.insert(
                full_key,
                SessionCacheEntry {
                    value: value.clone(),
                    last_accessed: Instant::now(),
                    ttl,
                },
            );

            Some(value)
        })
    }

    /// Set a value for a session with optional custom TTL
    pub fn set(&self, session_id: &str, key: &str, value: Arc<[u8]>, ttl: Option<Duration>) {
        // Evict if at capacity
        if self.inner.len() >= self.max_entries {
            self.evict_expired();
            // If still at capacity, remove oldest entries
            if self.inner.len() >= self.max_entries {
                self.evict_oldest(10); // Remove 10 oldest entries
            }
        }

        let full_key = Self::session_key(session_id, key);
        self.inner.insert(
            full_key,
            SessionCacheEntry {
                value,
                last_accessed: Instant::now(),
                ttl: ttl.unwrap_or(self.default_ttl),
            },
        );
    }

    /// Delete a cached value for a session
    pub fn delete(&self, session_id: &str, key: &str) {
        let full_key = Self::session_key(session_id, key);
        self.inner.remove(&full_key);
    }

    /// Delete all entries for a session (use on logout or session expiry)
    pub fn clear_session(&self, session_id: &str) {
        let prefix = format!("{}:", session_id);
        self.inner.retain(|k, _| !k.starts_with(&prefix));
    }

    /// Check if key exists for a session
    pub fn contains(&self, session_id: &str, key: &str) -> bool {
        self.get(session_id, key).is_some()
    }

    /// Get cached JSON value, deserialized
    pub fn get_json<T: serde::de::DeserializeOwned>(
        &self,
        session_id: &str,
        key: &str,
    ) -> Option<T> {
        self.get(session_id, key)
            .and_then(|bytes| serde_json::from_slice(&bytes).ok())
    }

    /// Set JSON value in cache
    pub fn set_json<T: serde::Serialize>(
        &self,
        session_id: &str,
        key: &str,
        value: &T,
        ttl: Option<Duration>,
    ) {
        if let Ok(bytes) = serde_json::to_vec(value) {
            self.set(session_id, key, bytes.into(), ttl);
        }
    }

    /// Evict all expired entries
    pub fn evict_expired(&self) {
        let now = Instant::now();
        self.inner
            .retain(|_, entry| now.duration_since(entry.last_accessed) <= entry.ttl);
    }

    /// Evict the N oldest entries
    fn evict_oldest(&self, count: usize) {
        // Collect entries with their keys and access times
        let mut entries: Vec<(String, Instant)> = self
            .inner
            .iter()
            .map(|entry| (entry.key().clone(), entry.last_accessed))
            .collect();

        // Sort by access time (oldest first)
        entries.sort_by_key(|(_, time)| *time);

        // Remove the oldest entries
        for (key, _) in entries.into_iter().take(count) {
            self.inner.remove(&key);
        }
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
    fn test_session_cache_basic() {
        let cache = SessionCache::new(Duration::from_secs(60), 100);

        cache.set("session1", "key1", Arc::from(b"value1".as_slice()), None);
        assert_eq!(
            cache.get("session1", "key1"),
            Some(Arc::from(b"value1".as_slice()))
        );

        cache.delete("session1", "key1");
        assert!(cache.get("session1", "key1").is_none());
    }

    #[test]
    fn test_session_isolation() {
        let cache = SessionCache::new(Duration::from_secs(60), 100);

        cache.set("session1", "key1", Arc::from(b"value1".as_slice()), None);
        cache.set("session2", "key1", Arc::from(b"value2".as_slice()), None);

        assert_eq!(
            cache.get("session1", "key1"),
            Some(Arc::from(b"value1".as_slice()))
        );
        assert_eq!(
            cache.get("session2", "key1"),
            Some(Arc::from(b"value2".as_slice()))
        );
    }

    #[test]
    fn test_clear_session() {
        let cache = SessionCache::new(Duration::from_secs(60), 100);

        cache.set("session1", "key1", Arc::from(b"value1".as_slice()), None);
        cache.set("session1", "key2", Arc::from(b"value2".as_slice()), None);
        cache.set("session2", "key1", Arc::from(b"value3".as_slice()), None);

        cache.clear_session("session1");

        assert!(cache.get("session1", "key1").is_none());
        assert!(cache.get("session1", "key2").is_none());
        assert!(cache.get("session2", "key1").is_some());
    }
}
