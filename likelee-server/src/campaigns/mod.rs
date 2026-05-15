//! Campaigns module.
//!
//! Phase 1.4 migration note:
//! - `legacy` contains the former `brand_campaigns.rs` implementation.
//! - `splits` contains the former `campaigns.rs` (agency campaign split endpoint).
//! - `dto` contains extracted DTOs/structs.
//! - `domain` contains extracted domain helper functions.

pub mod activity;
pub mod legacy;
pub mod splits;
pub mod dto;
pub mod domain;
pub mod handlers;
pub mod routes;

// Re-export domain functions for backward compatibility
pub use domain::{
    campaign_is_past_end, docuseal_role_key, is_creator_like, is_submitter_signed,
    offer_contract_status_is_signed, offer_status_counts_toward_campaign_slot, offer_status_is_signed,
    trim_non_empty,
};

// Re-export DTOs for backward compatibility
pub use dto::*;

// Re-export legacy handlers and functions
pub use legacy::*;
pub use splits::*;
pub use routes::routes;
