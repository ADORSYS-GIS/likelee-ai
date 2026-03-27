//! Cache Helper Utilities
//!
//! Provides convenient functions for using the multi-level cache
//! with the fallback chain pattern: L1 → L2 → L3 → DB.

use parking_lot::RwLock;
use std::sync::Arc;
use std::time::Duration;
use tracing::debug;

use super::{ApplicationCache, CacheLevel, CacheMetrics, RequestCache, SessionCache};

/// Execute a database query with multi-level cache fallback.
///
/// This helper implements the full fallback chain:
/// 1. Check L1 (request cache) - if hit, return
/// 2. Check L2 (session cache) - if hit, populate L1 and return
/// 3. Check L3 (application cache) - if hit, populate L1/L2 and return
/// 4. Execute DB fetch, populate all cache levels, return result
///
/// # Arguments
/// * `l1` - Request-level cache (from extensions)
/// * `l2` - Session-level cache (from AppState)
/// * `l3` - Application-level cache (from AppState)
/// * `metrics` - Cache metrics (from AppState)
/// * `session_id` - User session ID for L2 key namespacing
/// * `key` - Cache key (without namespace prefix)
/// * `l2_ttl` - TTL for L2 cache entry (None = use default)
/// * `l3_ttl` - TTL for L3 cache entry (None = use default)
/// * `db_fetch` - Async function to fetch from database on cache miss
///
/// # Example
/// ```ignore
/// let profile = with_cache_fallback(
///     &request_cache,
///     &state.cache_l2,
///     &state.cache_l3,
///     &state.cache_metrics,
///     &user.id,
///     "profile",
///     Some(Duration::from_secs(1800)),
///     None,
///     || async {
///         fetch_profile_from_db(&pg, user_id).await
///     }
/// ).await?;
/// ```
#[allow(clippy::too_many_arguments)]
pub async fn with_cache_fallback<T, F, Fut>(
    l1: &Arc<RwLock<RequestCache>>,
    l2: &Arc<SessionCache>,
    l3: &Arc<ApplicationCache>,
    metrics: &Arc<CacheMetrics>,
    session_id: &str,
    key: &str,
    l2_ttl: Option<Duration>,
    l3_ttl: Option<Duration>,
    db_fetch: F,
) -> Result<T, String>
where
    T: serde::Serialize + serde::de::DeserializeOwned + Clone,
    F: FnOnce() -> Fut,
    Fut: std::future::Future<Output = Result<T, String>>,
{
    // Try L1 first
    if let Some(cached) = l1.read().get_json(key) {
        metrics.hit(CacheLevel::L1);
        debug!(key = %key, level = "L1", "Cache hit");
        return Ok(cached);
    }
    metrics.miss(CacheLevel::L1);

    // Try L2
    if let Some(cached) = l2.get_json(session_id, key) {
        metrics.hit(CacheLevel::L2);
        debug!(key = %key, level = "L2", "Cache hit");
        // Populate L1 for subsequent lookups in same request
        l1.write().set_json(key, &cached);
        return Ok(cached);
    }
    metrics.miss(CacheLevel::L2);

    // Try L3
    if let Some(cached) = l3.get_json(key) {
        metrics.hit(CacheLevel::L3);
        debug!(key = %key, level = "L3", "Cache hit");
        // Populate L1 and L2
        l1.write().set_json(key, &cached);
        l2.set_json(session_id, key, &cached, l2_ttl);
        return Ok(cached);
    }
    metrics.miss(CacheLevel::L3);

    // Cache miss - fetch from DB
    debug!(key = %key, "Cache miss - fetching from DB");
    let result = db_fetch().await?;

    // Populate all cache levels
    l1.write().set_json(key, &result);
    l2.set_json(session_id, key, &result, l2_ttl);
    l3.set_json(key, &result, l3_ttl);

    Ok(result)
}

/// Execute a query with L3 (application-level) cache only.
///
/// Use this for global configuration data that doesn't vary by user.
pub async fn with_l3_cache<T, F, Fut>(
    l3: &Arc<ApplicationCache>,
    metrics: &Arc<CacheMetrics>,
    key: &str,
    ttl: Option<Duration>,
    db_fetch: F,
) -> Result<T, String>
where
    T: serde::Serialize + serde::de::DeserializeOwned + Clone,
    F: FnOnce() -> Fut,
    Fut: std::future::Future<Output = Result<T, String>>,
{
    // Try L3
    if let Some(cached) = l3.get_json(key) {
        metrics.hit(CacheLevel::L3);
        debug!(key = %key, level = "L3", "Cache hit");
        return Ok(cached);
    }
    metrics.miss(CacheLevel::L3);

    // Fetch from DB
    debug!(key = %key, "L3 cache miss - fetching from DB");
    let result = db_fetch().await?;

    // Store in L3
    l3.set_json(key, &result, ttl);

    Ok(result)
}

/// Invalidate a cache key across all levels.
///
/// Call this when data is mutated to ensure cache consistency.
pub fn invalidate_all_levels(
    l1: &Arc<RwLock<RequestCache>>,
    l2: &Arc<SessionCache>,
    l3: &Arc<ApplicationCache>,
    session_id: &str,
    key: &str,
) {
    l1.write().delete(key);
    l2.delete(session_id, key);
    l3.delete(key);
    debug!(key = %key, "Cache invalidated across all levels");
}

/// Invalidate cache for a session (e.g., on logout).
pub fn invalidate_session(l2: &Arc<SessionCache>, session_id: &str) {
    l2.clear_session(session_id);
    debug!(session_id = %session_id, "Session cache cleared");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_invalidate_all_levels() {
        let l1 = Arc::new(RwLock::new(RequestCache::new()));
        let l2 = Arc::new(SessionCache::new(Duration::from_secs(60), 100));
        let l3 = Arc::new(ApplicationCache::new(Duration::from_secs(60), 100));

        // Set values in all levels
        l1.write()
            .set("key1", Arc::from(b"value1".as_slice()), None);
        l2.set("session1", "key1", Arc::from(b"value1".as_slice()), None);
        l3.set("key1", Arc::from(b"value1".as_slice()), None);

        // Invalidate
        invalidate_all_levels(&l1, &l2, &l3, "session1", "key1");

        // Verify all are gone
        assert!(l1.read().get("key1").is_none());
        assert!(l2.get("session1", "key1").is_none());
        assert!(l3.get("key1").is_none());
    }
}
