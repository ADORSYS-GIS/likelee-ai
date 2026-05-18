pub mod domain;
pub mod extractor;
pub mod repository;
pub mod service;

pub use domain::{AuthUser, Claims, Jwk, JwksCache, JwksResponse, RoleGuard};
pub use repository::existing_profile_role_for_email;
pub use service::{
    admin_only, agency_only, creator_only, ensure_signup_email_available, normalize_signup_email,
};
