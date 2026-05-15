//! KYC module (Phase 3 - Cross-cutting).

mod legacy;
pub mod liveness;
pub mod moderation;
pub mod voice;

// Re-export from legacy (the real implementations)
pub use legacy::{create_session, get_status, SessionRequest, SessionResponse, veriff_webhook, ProfileVerification, StatusQuery};

// Re-export from liveness (liveness-specific types, but NOT create_session to avoid ambiguity)
pub use liveness::{LivenessCreateRequest, LivenessCreateResponse, LivenessResultRequest, LivenessResultResponse, liveness_result};

// Re-export moderation
pub use moderation::*;
