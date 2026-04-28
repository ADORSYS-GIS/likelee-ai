use crate::config::AppState;
use axum::{
    async_trait,
    extract::{FromRef, FromRequestParts, State},
    http::{request::Parts, StatusCode},
    response::{IntoResponse, Response},
};
use base64::Engine;
use jsonwebtoken::{decode, decode_header, Algorithm, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use tokio::sync::RwLock;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String, // User ID
    pub email: Option<String>,
    pub exp: usize,
    pub user_metadata: Option<serde_json::Value>,
    pub app_metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Jwk {
    kty: String,
    kid: String,
    alg: String,
    n: Option<String>,
    e: Option<String>,
    crv: Option<String>,
    x: Option<String>,
    y: Option<String>,
    k: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct JwksResponse {
    keys: Vec<Jwk>,
}

pub struct JwksCache {
    keys: RwLock<HashMap<String, DecodingKey>>,
}

impl JwksCache {
    pub fn new() -> Self {
        Self {
            keys: RwLock::new(HashMap::new()),
        }
    }

    pub async fn get_key(&self, kid: &str) -> Option<DecodingKey> {
        self.keys.read().await.get(kid).cloned()
    }

    pub async fn refresh(&self, state: &AppState) {
        let url = format!(
            "{}/auth/v1/.well-known/jwks.json",
            supabase_auth_base_url(state)
        );
        let client = reqwest::Client::new();
        let resp = match client
            .get(&url)
            .header("apikey", &state.supabase_service_key)
            .send()
            .await
        {
            Ok(r) => r,
            Err(e) => {
                tracing::error!("Failed to fetch JWKS: {}", e);
                return;
            }
        };
        let text = match resp.text().await {
            Ok(t) => t,
            Err(e) => {
                tracing::error!("Failed to read JWKS response: {}", e);
                return;
            }
        };
        tracing::info!("JWKS response: {}", text);
        let jwks: JwksResponse = match serde_json::from_str(&text) {
            Ok(j) => j,
            Err(e) => {
                tracing::error!("Failed to parse JWKS: {} - response: {}", e, text);
                return;
            }
        };
        let mut keys = HashMap::new();
        for jwk in jwks.keys {
            let key = match jwk.kty.as_str() {
                "RSA" => {
                    if let (Some(n), Some(e)) = (&jwk.n, &jwk.e) {
                        DecodingKey::from_rsa_components(n, e).ok()
                    } else {
                        None
                    }
                }
                "EC" => {
                    if let (Some(x), Some(y), Some(crv)) = (&jwk.x, &jwk.y, &jwk.crv) {
                        match crv.as_str() {
                            "P-256" => DecodingKey::from_ec_components(x, y).ok(),
                            _ => None,
                        }
                    } else {
                        None
                    }
                }
                "oct" => {
                    if let Some(k) = &jwk.k {
                        let k_bytes = base64::engine::general_purpose::URL_SAFE_NO_PAD
                            .decode(k)
                            .unwrap_or_default();
                        if !k_bytes.is_empty() {
                            Some(DecodingKey::from_secret(&k_bytes))
                        } else {
                            None
                        }
                    } else {
                        None
                    }
                }
                _ => None,
            };
            if let Some(key) = key {
                keys.insert(jwk.kid, key);
            }
        }
        let mut cache = self.keys.write().await;
        *cache = keys;
        tracing::info!("JWKS refreshed: {} keys loaded", cache.len());
    }
}

impl Default for JwksCache {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub id: String,
    pub email: Option<String>,
    pub role: String,
    pub organization_id: Option<String>,
    pub access_token: String,
}

impl AuthUser {
    pub fn effective_org_id(&self) -> &str {
        self.organization_id.as_ref().unwrap_or(&self.id)
    }
}

fn supabase_auth_base_url(state: &AppState) -> String {
    state
        .supabase_url
        .trim_end_matches('/')
        .trim_end_matches("/rest/v1")
        .to_string()
}

async fn lookup_role_from_supabase_auth(state: &AppState, user_id: &str) -> Option<String> {
    let user_id = user_id.trim();
    if user_id.is_empty() {
        return None;
    }

    let url = format!(
        "{}/auth/v1/admin/users/{}",
        supabase_auth_base_url(state),
        user_id
    );
    let client = reqwest::Client::new();
    let resp = client
        .get(&url)
        .header("apikey", state.supabase_service_key.clone())
        .header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        )
        .send()
        .await
        .ok()?;

    if !resp.status().is_success() {
        return None;
    }

    let payload: Value = resp.json().await.ok()?;
    payload
        .get("user_metadata")
        .and_then(|v| v.get("role"))
        .and_then(|v| v.as_str())
        .or_else(|| {
            payload
                .get("app_metadata")
                .and_then(|v| v.get("role"))
                .and_then(|v| v.as_str())
        })
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
}

async fn lookup_role_from_profiles(state: &AppState, user_id: &str) -> Option<String> {
    let candidates = [
        ("agencies", "agency"),
        ("brands", "brand"),
        ("creators", "creator"),
    ];

    for (table, role) in candidates {
        let Ok(resp) = state
            .pg
            .from(table)
            .select("id")
            .eq("id", user_id)
            .limit(1)
            .execute()
            .await
        else {
            continue;
        };

        if !resp.status().is_success() {
            continue;
        }

        let Ok(text) = resp.text().await else {
            continue;
        };
        let Ok(rows) = serde_json::from_str::<Value>(&text) else {
            continue;
        };
        if rows
            .as_array()
            .map(|items| !items.is_empty())
            .unwrap_or(false)
        {
            return Some(role.to_string());
        }
    }

    None
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

        // 1. Get token from Authorization header or query parameter
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

        // 2. Verify JWT - use JWKS for Supabase JWT Signing Keys, fall back to legacy secret
        let token_data = {
            // Decode header to check for kid (JWT Signing Key)
            let header = decode_header(&token)
                .map_err(|e| (StatusCode::UNAUTHORIZED, format!("Invalid token header: {}", e)))?;
            
            if let Some(kid) = header.kid {
                // New-style token with JWT Signing Key - use JWKS
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
                    // Key not in cache, try refreshing JWKS
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
                            let key = DecodingKey::from_secret(
                                app_state.supabase_jwt_secret.as_bytes(),
                            );
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
            } else {
                // Legacy token without kid - try legacy secret
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
                    let key = DecodingKey::from_secret(
                        app_state.supabase_jwt_secret.as_bytes(),
                    );
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
            }
        };

        let user_id = token_data.claims.sub;

        // 3. Extract role from JWT metadata
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
            role = lookup_role_from_supabase_auth(&app_state, &user_id).await;
        }
        if role.is_none() {
            role = lookup_role_from_profiles(&app_state, &user_id).await;
        }

        // 4. Ensure role is present
        let role = role.ok_or((
            StatusCode::UNAUTHORIZED,
            "User role not found in token metadata".to_string(),
        ))?;

        // 5. For team members, lookup organization_id from organization_memberships
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

pub async fn admin_only(
    user: AuthUser,
    request: axum::extract::Request,
    next: axum::middleware::Next,
) -> Response {
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
