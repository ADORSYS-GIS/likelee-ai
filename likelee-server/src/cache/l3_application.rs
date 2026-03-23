//! Level 3: Application-Scoped Cache
//!
//! Cache global, shared data for the lifetime of the application.
//! Preloaded at startup and refreshed periodically in the background.
//! Shared across all users and sessions.
//!
//! **Scope**: Application lifetime (all users/sessions)
//! **TTL**: Configurable (default: 1 hour)
//! **Invalidation**: TTL expiry + background refresh + manual invalidation
//! **Thread Safety**: Arc<RwLock> for read-heavy access pattern

use parking_lot::RwLock;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tracing::debug;

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

/// Function type for background refresh
/// Returns a boxed future that resolves to an optional cached value
pub type RefreshFn = Box<
    dyn Fn() -> std::pin::Pin<Box<dyn std::future::Future<Output = Option<Arc<[u8]>>> + Send>>
        + Send
        + Sync,
>;

/// Application-level cache for global shared data.
///
/// Supports:
/// - Preloading at startup
/// - Background refresh without downtime
/// - Manual invalidation on config changes
pub struct ApplicationCache {
    /// Inner map with RwLock for read-heavy pattern
    inner: RwLock<HashMap<String, ApplicationCacheEntry>>,
    /// Default TTL for entries
    default_ttl: Duration,
    /// Maximum entries
    max_entries: usize,
    /// Stop signal for background refresh task
    stop_tx: Option<tokio::sync::watch::Sender<bool>>,
}

impl ApplicationCache {
    /// Create a new application cache with the given configuration
    pub fn new(default_ttl: Duration, max_entries: usize) -> Self {
        let (stop_tx, _) = tokio::sync::watch::channel(false);

        Self {
            inner: RwLock::new(HashMap::new()),
            default_ttl,
            max_entries,
            stop_tx: Some(stop_tx),
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

    /// Stop background refresh task
    pub fn stop(&self) {
        if let Some(tx) = &self.stop_tx {
            let _ = tx.send(true);
        }
    }

    pub(crate) fn stop_rx(&self) -> Option<tokio::sync::watch::Receiver<bool>> {
        self.stop_tx.as_ref().map(|tx| tx.subscribe())
    }
}

impl Drop for ApplicationCache {
    fn drop(&mut self) {
        self.stop();
    }
}

/// Background refresh task for application cache
pub struct CacheRefreshTask {
    /// Cache reference
    cache: Arc<ApplicationCache>,
    /// Refresh interval
    interval: Duration,
    /// Keys to refresh with their refresh functions
    refreshers: HashMap<String, RefreshFn>,
}

impl CacheRefreshTask {
    /// Create a new refresh task
    pub fn new(cache: Arc<ApplicationCache>, interval: Duration) -> Self {
        Self {
            cache,
            interval,
            refreshers: HashMap::new(),
        }
    }

    /// Register a refresh function for a key
    pub fn register<F, Fut>(&mut self, key: &str, refresh_fn: F)
    where
        F: Fn() -> Fut + Send + Sync + 'static,
        Fut: std::future::Future<Output = Option<Arc<[u8]>>> + Send + 'static,
    {
        self.refreshers
            .insert(key.to_string(), Box::new(move || Box::pin(refresh_fn())));
    }

    /// Start the background refresh loop
    pub fn start(self) -> tokio::task::JoinHandle<()> {
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(self.interval);
            let mut stop_rx = self
                .cache
                .stop_rx()
                .expect("ApplicationCache stop channel missing");
            loop {
                tokio::select! {
                    _ = interval.tick() => {}
                    _ = stop_rx.changed() => {
                        if *stop_rx.borrow() {
                            break;
                        }
                    }
                }

                // Refresh each registered key
                for (key, refresher) in &self.refreshers {
                    if let Some(value) = refresher().await {
                        self.cache.set(key, value, None);
                        debug!(key = %key, "Application cache refreshed");
                    }
                }
            }
        })
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
