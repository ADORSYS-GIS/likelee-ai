//! Creator rates module.
//!
//! Phase 2 migration note:
//! - `legacy` contains the former `creator_rates.rs` implementation.

pub mod legacy;

// Re-export legacy handlers and functions for backward compatibility.
pub use legacy::*;

