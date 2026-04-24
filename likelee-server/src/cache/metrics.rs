//! Cache Metrics (Logging-Based)
//!
//! Provides observability for cache performance using tracing counters.
//! Tracks hit/miss rates per cache level for tuning TTLs based on real usage.
//!
//! **Metrics exposed**:
//! - `cache.l1.hits` / `cache.l1.misses`
//! - `cache.l2.hits` / `cache.l2.misses`
//! - `cache.l3.hits` / `cache.l3.misses`
//! - `cache.idempotency.hits` / `cache.idempotency.misses`

use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Duration, Instant};
use tracing::info;

const CACHE_METRICS_ENABLED: bool = false;

/// Cache level identifier
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CacheLevel {
    L1,
    L2,
    L3,
    Idempotency,
}

impl CacheLevel {
    pub fn as_str(&self) -> &'static str {
        match self {
            CacheLevel::L1 => "l1",
            CacheLevel::L2 => "l2",
            CacheLevel::L3 => "l3",
            CacheLevel::Idempotency => "idempotency",
        }
    }
}

/// Counters for a single cache level
#[derive(Debug, Default)]
struct CacheCounters {
    hits: AtomicU64,
    misses: AtomicU64,
}

/// Logging-based metrics for cache layers
#[derive(Debug)]
pub struct CacheMetrics {
    l1: CacheCounters,
    l2: CacheCounters,
    l3: CacheCounters,
    idempotency: CacheCounters,
    /// Last time metrics were logged
    last_log: std::sync::Mutex<Instant>,
    /// Interval between log outputs
    log_interval: Duration,
}

impl CacheMetrics {
    /// Create new metrics with specified log interval
    pub fn new(log_interval: Duration) -> Self {
        Self {
            l1: CacheCounters::default(),
            l2: CacheCounters::default(),
            l3: CacheCounters::default(),
            idempotency: CacheCounters::default(),
            last_log: std::sync::Mutex::new(Instant::now()),
            log_interval,
        }
    }

    /// Record a cache hit
    pub fn hit(&self, level: CacheLevel) {
        let counters = self.get_counters(level);
        counters.hits.fetch_add(1, Ordering::Relaxed);
        self.maybe_log();
    }

    /// Record a cache miss
    pub fn miss(&self, level: CacheLevel) {
        let counters = self.get_counters(level);
        counters.misses.fetch_add(1, Ordering::Relaxed);
        self.maybe_log();
    }

    /// Get counters for a cache level
    fn get_counters(&self, level: CacheLevel) -> &CacheCounters {
        match level {
            CacheLevel::L1 => &self.l1,
            CacheLevel::L2 => &self.l2,
            CacheLevel::L3 => &self.l3,
            CacheLevel::Idempotency => &self.idempotency,
        }
    }

    /// Log metrics periodically
    fn maybe_log(&self) {
        if !CACHE_METRICS_ENABLED {
            return;
        }
        let mut last_log = self.last_log.lock().unwrap();
        if last_log.elapsed() >= self.log_interval {
            *last_log = Instant::now();
            drop(last_log);
            self.log_summary();
        }
    }

    /// Log a summary of all cache metrics
    pub fn log_summary(&self) {
        if !CACHE_METRICS_ENABLED {
            return;
        }
        let l1_hits = self.l1.hits.load(Ordering::Relaxed);
        let l1_misses = self.l1.misses.load(Ordering::Relaxed);
        let l2_hits = self.l2.hits.load(Ordering::Relaxed);
        let l2_misses = self.l2.misses.load(Ordering::Relaxed);
        let l3_hits = self.l3.hits.load(Ordering::Relaxed);
        let l3_misses = self.l3.misses.load(Ordering::Relaxed);
        let idem_hits = self.idempotency.hits.load(Ordering::Relaxed);
        let idem_misses = self.idempotency.misses.load(Ordering::Relaxed);

        let l1_rate = Self::hit_rate(l1_hits, l1_misses);
        let l2_rate = Self::hit_rate(l2_hits, l2_misses);
        let l3_rate = Self::hit_rate(l3_hits, l3_misses);
        let idem_rate = Self::hit_rate(idem_hits, idem_misses);

        info!(
            l1.hits = l1_hits,
            l1.misses = l1_misses,
            l1.hit_rate_pct = format_args!("{:.1}", l1_rate * 100.0),
            l2.hits = l2_hits,
            l2.misses = l2_misses,
            l2.hit_rate_pct = format_args!("{:.1}", l2_rate * 100.0),
            l3.hits = l3_hits,
            l3.misses = l3_misses,
            l3.hit_rate_pct = format_args!("{:.1}", l3_rate * 100.0),
            idempotency.hits = idem_hits,
            idempotency.misses = idem_misses,
            idempotency.hit_rate_pct = format_args!("{:.1}", idem_rate * 100.0),
            "Cache metrics summary"
        );
    }

    /// Calculate hit rate (0.0 to 1.0)
    fn hit_rate(hits: u64, misses: u64) -> f64 {
        let total = hits + misses;
        if total == 0 {
            0.0
        } else {
            hits as f64 / total as f64
        }
    }

    /// Get current stats for a level
    pub fn get_stats(&self, level: CacheLevel) -> (u64, u64) {
        let counters = self.get_counters(level);
        (
            counters.hits.load(Ordering::Relaxed),
            counters.misses.load(Ordering::Relaxed),
        )
    }

    /// Reset all counters
    pub fn reset(&self) {
        self.l1.hits.store(0, Ordering::Relaxed);
        self.l1.misses.store(0, Ordering::Relaxed);
        self.l2.hits.store(0, Ordering::Relaxed);
        self.l2.misses.store(0, Ordering::Relaxed);
        self.l3.hits.store(0, Ordering::Relaxed);
        self.l3.misses.store(0, Ordering::Relaxed);
        self.idempotency.hits.store(0, Ordering::Relaxed);
        self.idempotency.misses.store(0, Ordering::Relaxed);
    }
}

impl Default for CacheMetrics {
    fn default() -> Self {
        Self::new(Duration::from_secs(60)) // Log every 60 seconds by default
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_metrics_counters() {
        let metrics = CacheMetrics::new(Duration::from_secs(60));

        metrics.hit(CacheLevel::L1);
        metrics.hit(CacheLevel::L1);
        metrics.miss(CacheLevel::L1);

        let (hits, misses) = metrics.get_stats(CacheLevel::L1);
        assert_eq!(hits, 2);
        assert_eq!(misses, 1);
    }

    #[test]
    fn test_hit_rate() {
        assert_eq!(CacheMetrics::hit_rate(0, 0), 0.0);
        assert!((CacheMetrics::hit_rate(3, 1) - 0.75).abs() < 0.001);
        assert!((CacheMetrics::hit_rate(1, 1) - 0.5).abs() < 0.001);
    }
}
