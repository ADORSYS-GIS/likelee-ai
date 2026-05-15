//! Marketplace profiles module.
//!
//! Phase 2 migration note:
//! - `legacy` contains the former `face_profiles.rs` implementation.

pub mod legacy;

// Re-export legacy handlers and functions for backward compatibility.
pub use legacy::*;

