use crate::state::AppState;
use axum::{
    async_trait,
    extract::{FromRef, FromRequestParts, State},
    http::{request::Parts, StatusCode},
};
use base64::Engine;
use jsonwebtoken::{decode, decode_header, Algorithm, DecodingKey, Validation};
use serde_json::{json, Value};

use super::{repository, Claims, AuthUser};

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

        let token = if let Some(auth_header) = parts
            .headers
            .get("Authorization")
            .and_then(|v| v.to_str().ok())
        {
            if !auth_header.starts_with("Bearer ") {
                return Err((StatusCode::UNAUTHORIZED, "Invalid token format".to_string()));
            }
            auth_header[7..].to_string()
        } else if let Some(query) = parts.uri.query() {
            let token_param = query
                .split('&')
                .find(|s| s.starts_with("token="))
                .map(|s| s[6..].to_string());

            token_param.ok_or((
                StatusCode::UNAUTHORIZED,
                "Missing Authorization header or token query parameter".to_string(),
            ))?
        } else {
            return Err((
                StatusCode::UNAUTHORIZED,
                "Missing Authorization header".to_string(),
            ));
        };

        let token_data = {
            let header = decode_header(&token).map_err(|e| {
                (
                    StatusCode::UNAUTHORIZED,
                    format!("Invalid token header: {}", e),
                )
            })?;

            if let Some(kid) = header.kid {
                if let Some(key) = app_state.jwks_cache.get_key(&kid).await {
                    let mut validation = Validation::new(header.alg);
                    validation.set_audience(&["authenticated"]);
                    match decode::<Claims>(&token, &key, &validation) {
                        Ok(data) => data,
                        Err(e) => {
                            return Err((
                                StatusCode::UNAUTHORIZED,
                                format!("Invalid token (JWKS kid={}): {}", kid, e),
                            ));
                        }
                    }
                } else {
                    app_state.jwks_cache.refresh(&app_state).await;
                    if let Some(key) = app_state.jwks_cache.get_key(&kid).await {
                        let mut validation = Validation::new(header.alg);
                        validation.set_audience(&["authenticated"]);
                        match decode::<Claims>(&token, &key, &validation) {
                            Ok(data) => data,
                            Err(e) => {
                                return Err((
                                    StatusCode::UNAUTHORIZED,
                                    format!("Invalid token (JWKS kid={}): {}", kid, e),
                                ));
                            }
                        }
                    } else {
                        tracing::warn!("JWKS kid {} not found, falling back to JWT_SECRET", kid);
                        if let Ok(der_bytes) = base64::engine::general_purpose::STANDARD
                            .decode(app_state.supabase_jwt_secret.as_str())
                        {
                            let key = DecodingKey::from_ec_der(&der_bytes);
                            let mut validation = Validation::new(Algorithm::ES256);
                            validation.set_audience(&["authenticated"]);
                            match decode::<Claims>(&token, &key, &validation) {
                                Ok(data) => data,
                                Err(es256_err) => {
                                    let key = DecodingKey::from_secret(
                                        app_state.supabase_jwt_secret.as_bytes(),
                                    );
                                    let mut validation = Validation::new(Algorithm::HS256);
                                    validation.set_audience(&["authenticated"]);
                                    match decode::<Claims>(&token, &key, &validation) {
                                        Ok(data) => data,
                                        Err(_) => {
                                            return Err((
                                                StatusCode::UNAUTHORIZED,
                                                format!("Unknown JWKS key id: {} and JWT_SECRET fallback failed: {}", kid, es256_err),
                                            ));
                                        }
                                    }
                                }
                            }
                        } else {
                            let key =
                                DecodingKey::from_secret(app_state.supabase_jwt_secret.as_bytes());
                            let mut validation = Validation::new(Algorithm::HS256);
                            validation.set_audience(&["authenticated"]);
                            match decode::<Claims>(&token, &key, &validation) {
                                Ok(data) => data,
                                Err(e) => {
                                    return Err((
                                        StatusCode::UNAUTHORIZED,
                                        format!("Unknown JWKS key id: {} and JWT_SECRET fallback failed: {}", kid, e),
                                    ));
                                }
                            }
                        }
                    }
                }
            } else if let Ok(der_bytes) = base64::engine::general_purpose::STANDARD
                .decode(app_state.supabase_jwt_secret.as_str())
            {
                let key = DecodingKey::from_ec_der(&der_bytes);
                let mut validation = Validation::new(Algorithm::ES256);
                validation.set_audience(&["authenticated"]);
                match decode::<Claims>(&token, &key, &validation) {
                    Ok(data) => data,
                    Err(es256_err) => {
                        let key = DecodingKey::from_secret(app_state.supabase_jwt_secret.as_bytes());
                        let mut validation = Validation::default();
                        validation.set_audience(&["authenticated"]);
                        match decode::<Claims>(&token, &key, &validation) {
                            Ok(data) => data,
                            Err(_) => {
                                return Err((
                                    StatusCode::UNAUTHORIZED,
                                    format!("Invalid token (legacy): {}", es256_err),
                                ));
                            }
                        }
                    }
                }
            } else {
                let key = DecodingKey::from_secret(app_state.supabase_jwt_secret.as_bytes());
                let mut validation = Validation::default();
                validation.set_audience(&["authenticated"]);
                match decode::<Claims>(&token, &key, &validation) {
                    Ok(data) => data,
                    Err(e) => {
                        return Err((
                            StatusCode::UNAUTHORIZED,
                            format!("Invalid token (legacy): {}", e),
                        ));
                    }
                }
            }
        };

        let user_id = token_data.claims.sub;

        let mut role = token_data
            .claims
            .user_metadata
            .as_ref()
            .and_then(|m| m.get("role"))
            .and_then(|r| r.as_str())
            .or_else(|| {
                token_data
                    .claims
                    .app_metadata
                    .as_ref()
                    .and_then(|m| m.get("role"))
                    .and_then(|r| r.as_str())
            })
            .map(|s| s.to_string());

        if role.is_none() {
            role = repository::lookup_role_from_supabase_auth(&app_state, &user_id).await;
        }
        if role.is_none() {
            role = repository::lookup_role_from_profiles(&app_state, &user_id).await;
        }

        let role = role.ok_or((
            StatusCode::UNAUTHORIZED,
            "User role not found in token metadata".to_string(),
        ))?;

        let organization_id = if role == "agency" || role == "brand" {
            let org_type = if role == "agency" { "agency" } else { "brand" };

            let org_resp = app_state
                .pg
                .from("organization_memberships")
                .select("organization_id")
                .eq("user_id", &user_id)
                .eq("organization_type", org_type)
                .eq("status", "active")
                .limit(1)
                .execute()
                .await;

            match org_resp {
                Ok(res) => {
                    let text = res.text().await.unwrap_or_default();
                    let data: Value = serde_json::from_str(&text).unwrap_or(json!([]));
                    data.as_array()
                        .and_then(|arr| arr.first())
                        .and_then(|item| item.get("organization_id"))
                        .and_then(|v| v.as_str().map(|s| s.to_string()))
                }
                Err(_) => None,
            }
        } else {
            None
        };

        Ok(AuthUser {
            id: user_id,
            email: token_data.claims.email,
            role,
            organization_id,
            access_token: token,
        })
    }
}
