// Billing module (Phase 1.5): consolidate billing-related root modules under `crate::billing::*`.
//
// We keep the old root modules (`crate::payouts`, `crate::invoices`, etc.) as thin shims
// so the refactor can land without a massive import churn.

pub mod entitlements;
pub mod expenses;
pub mod invoices;
pub mod payment_links;
pub mod payouts;
pub mod subscriptions;
pub mod talent_statements;

// Convenience re-exports: keep the historically-used `crate::billing::...` surface.
//
// We intentionally avoid glob re-exporting `invoices`, `payouts`, etc. here because those
// modules define overlapping function names like `list`/`create`, which makes glob imports
// ambiguous (`use crate::billing::*`).
pub use entitlements::*;
pub use subscriptions::*;
