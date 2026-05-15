use crate::state::AppState;
use base64::Engine;
use jsonwebtoken::DecodingKey;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tokio::sync::RwLock;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,
    pub email: Option<String>,
    pub exp: usize,
    pub user_metadata: Option<serde_json::Value>,
    pub app_metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Jwk {
    pub kty: String,
    pub kid: String,
    pub alg: String,
    pub n: Option<String>,
    pub e: Option<String>,
    pub crv: Option<String>,
    pub x: Option<String>,
    pub y: Option<String>,
    pub k: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct JwksResponse {
    pub keys: Vec<Jwk>,
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
            crate::auth::repository::supabase_auth_base_url(state)
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

pub struct RoleGuard {
    pub allowed_roles: Vec<String>,
}

impl RoleGuard {
    pub fn new(roles: Vec<&str>) -> Self {
        Self {
            allowed_roles: roles.into_iter().map(|s| s.to_string()).collect(),
        }
    }

    pub fn check(&self, user_role: &str) -> Result<(), (axum::http::StatusCode, String)> {
        if self.allowed_roles.iter().any(|r| r == user_role) {
            Ok(())
        } else {
            Err((
                axum::http::StatusCode::FORBIDDEN,
                "You do not have permission to access this resource".to_string(),
            ))
        }
    }
}
