//! Multi-Level Caching Module
//!
//! Implements a three-level hierarchical caching strategy:
//! - **L1 (Request)**: Per-request scope, auto-cleanup on request completion
//! - **L2 (Session)**: User-scoped cache keyed by session ID with TTL
//! - **L3 (Application)**: Global shared data preloaded at startup with background refresh
//!
//! Fallback chain: L1 → L2 → L3 → Database

pub mod helpers;
mod idempotency;
mod l1_request;
mod l2_session;
mod l3_application;
mod metrics;
pub mod middleware;

pub use idempotency::{IdempotencyRecord, IdempotencyStore};
pub use l1_request::RequestCache;
pub use l2_session::{SessionCache, SessionCacheEntry};
pub use l3_application::{ApplicationCache, ApplicationCacheEntry};
pub use metrics::{CacheLevel, CacheMetrics};
pub use middleware::{
    cache_layer, get_idempotency_key, get_request_cache, idempotency_layer,
    store_idempotency_result, RequestCacheExt,
};

use std::sync::Arc;
use std::time::Duration;

/// Common cache trait for consistent interface across all levels
pub trait Cache: Send + Sync {
    /// Get a cached value by key
    fn get(&self, key: &str) -> Option<Arc<[u8]>>;

    /// Set a value with optional TTL
    fn set(&self, key: &str, value: Arc<[u8]>, ttl: Option<Duration>);

    /// Delete a cached value
    fn delete(&self, key: &str);

    /// Check if key exists
    fn contains(&self, key: &str) -> bool;
}

/// Helper to build a cache key with namespace prefix
pub fn cache_key(namespace: &str, key: &str) -> String {
    format!("{}:{}", namespace, key)
}

/// Configuration for cache layers
#[derive(Clone, Debug)]
pub struct CacheConfig {
    /// TTL for L2 session cache entries (default: 30 min)
    pub l2_ttl: Duration,
    /// TTL for L3 application cache entries (default: 1 hour)
    pub l3_ttl: Duration,
    /// Interval for L3 background refresh (default: 5 min)
    pub l3_refresh_interval: Duration,
    /// Maximum entries in L2 cache
    pub l2_max_entries: usize,
    /// Maximum entries in L3 cache
    pub l3_max_entries: usize,
    /// TTL for idempotency records (default: 24 hours)
    pub idempotency_ttl: Duration,
}

impl Default for CacheConfig {
    fn default() -> Self {
        Self {
            l2_ttl: Duration::from_secs(1800),             // 30 min
            l3_ttl: Duration::from_secs(3600),             // 1 hour
            l3_refresh_interval: Duration::from_secs(300), // 5 min
            l2_max_entries: 10_000,
            l3_max_entries: 1_000,
            idempotency_ttl: Duration::from_secs(86400), // 24 hours
        }
    }
}
