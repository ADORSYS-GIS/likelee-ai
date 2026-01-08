use crate::config::AppState;
use axum::{
    async_trait,
    extract::{FromRef, FromRequestParts, State},
    http::{request::Parts, StatusCode},
    response::{IntoResponse, Response},
};
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String, // User ID
    pub email: Option<String>,
    pub exp: usize,
}

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub id: String,
    pub email: Option<String>,
    pub role: String,
}

#[async_trait]
impl<S> FromRequestParts<S> for AuthUser
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = (StatusCode, String);

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let State(app_state) = State::<AppState>::from_request_parts(parts, state)
            .await
            .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "State error".to_string()))?;

        // 1. Get token from Authorization header
        let auth_header = parts
            .headers
            .get("Authorization")
            .and_then(|v| v.to_str().ok())
            .ok_or((
                StatusCode::UNAUTHORIZED,
                "Missing Authorization header".to_string(),
            ))?;

        if !auth_header.starts_with("Bearer ") {
            return Err((StatusCode::UNAUTHORIZED, "Invalid token format".to_string()));
        }

        let token = &auth_header[7..];

        // 2. Verify JWT
        let decoding_key = DecodingKey::from_secret(app_state.supabase_jwt_secret.as_bytes());
        let mut validation = Validation::default();
        validation.set_audience(&["authenticated"]);
        let token_data = decode::<Claims>(token, &decoding_key, &validation)
            .map_err(|e| (StatusCode::UNAUTHORIZED, format!("Invalid token: {}", e)))?;

        let user_id = token_data.claims.sub;

        // 3. Fetch role from database
        let resp = app_state
            .pg
            .from("profiles")
            .select("role")
            .eq("id", &user_id)
            .single()
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let text = resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let profile: serde_json::Value = serde_json::from_str(&text)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let role = profile
            .get("role")
            .and_then(|v| v.as_str())
            .unwrap_or("creator") // Default to creator if not found
            .to_string();

        Ok(AuthUser {
            id: user_id,
            email: token_data.claims.email,
            role,
        })
    }
}

pub struct RoleGuard {
    pub allowed_roles: Vec<String>,
}

impl RoleGuard {
    pub fn new(roles: Vec<&str>) -> Self {
        Self {
            allowed_roles: roles.into_iter().map(|s| s.to_string()).collect(),
        }
    }

    pub fn check(&self, user_role: &str) -> Result<(), (StatusCode, String)> {
        if self.allowed_roles.iter().any(|r| r == user_role) {
            Ok(())
        } else {
            Err((
                StatusCode::FORBIDDEN,
                "You do not have permission to access this resource".to_string(),
            ))
        }
    }
}

pub async fn creator_only(
    user: AuthUser,
    request: axum::extract::Request,
    next: axum::middleware::Next,
) -> Response {
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
    user: AuthUser,
    request: axum::extract::Request,
    next: axum::middleware::Next,
) -> Response {
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

pub async fn marketplace_access(
    user: AuthUser,
    request: axum::extract::Request,
    next: axum::middleware::Next,
) -> Response {
    if user.role == "creator" || user.role == "agency" || user.role == "brand" {
        next.run(request).await
    } else {
        (
            StatusCode::FORBIDDEN,
            "You do not have permission to access this resource (Marketplace access required)"
                .to_string(),
        )
            .into_response()
    }
}
