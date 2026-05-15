// Temporary facade: `legacy` still owns the implementation.
//
// This file exists so `routes.rs` (and future refactors) can depend on a stable
// module path without importing `legacy` directly.

pub use super::legacy::*;
pub use super::splits::update_campaign_split;

