//! Pricing defaults helpers.
//!
//! Phase 2 migration note:
//! - `legacy` contains the former `pricing_defaults.rs` implementation.

pub mod legacy;

// Re-export legacy helpers for backward compatibility.
pub use legacy::*;

