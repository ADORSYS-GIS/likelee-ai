//! Creators module.
//!
//! Phase 2 migration note:
//! - `legacy` contains the former `creators.rs` implementation.

pub mod dashboard;
pub mod legacy;

// Re-export legacy handlers and functions for backward compatibility.
pub use dashboard::*;
pub use legacy::*;

