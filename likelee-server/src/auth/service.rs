use crate::state::AppState;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use serde_json::json;

pub fn normalize_signup_email(email: &str) -> Result<String, (StatusCode, String)> {
    let normalized = email.trim().to_lowercase();
    if normalized.is_empty() || !normalized.contains('@') {
        return Err((
            StatusCode::BAD_REQUEST,
            json!({
                "code": "invalid_email",
                "message": "Please enter a valid email address."
            })
            .to_string(),
        ));
    }
    Ok(normalized)
}

pub async fn ensure_signup_email_available(
    state: &AppState,
    email: &str,
) -> Result<String, (StatusCode, String)> {
    let normalized = normalize_signup_email(email)?;
    if let Some(role) =
        crate::auth::repository::existing_profile_role_for_email(state, normalized.as_str()).await?
    {
        return Err((
            StatusCode::CONFLICT,
            json!({
                "code": "email_already_registered",
                "existing_role": role,
                "message": "This email is already registered. Please sign in with the existing account or use a different email."
            })
            .to_string(),
        ));
    }
    Ok(normalized)
}

pub async fn creator_only(
    user: crate::auth::AuthUser,
    request: axum::extract::Request,
    next: axum::middleware::Next,
) -> axum::response::Response {
    if user.role == "creator" {
        next.run(request).await
    } else {
        (
            StatusCode::FORBIDDEN,
            "You do not have permission to access this resource (Creator role required)"
                .to_string(),
        )
            .into_response()
    }
}

pub async fn agency_only(
    user: crate::auth::AuthUser,
    request: axum::extract::Request,
    next: axum::middleware::Next,
) -> axum::response::Response {
    if user.role == "agency" || user.role == "brand" {
        next.run(request).await
    } else {
        (
            StatusCode::FORBIDDEN,
            "You do not have permission to access this resource (Agency/Brand role required)"
                .to_string(),
        )
            .into_response()
    }
}

pub async fn admin_only(
    user: crate::auth::AuthUser,
    request: axum::extract::Request,
    next: axum::middleware::Next,
) -> axum::response::Response {
    if user.role == "admin" {
        next.run(request).await
    } else {
        (
            StatusCode::FORBIDDEN,
            "You do not have permission to access this resource (Admin role required)".to_string(),
        )
            .into_response()
    }
}
