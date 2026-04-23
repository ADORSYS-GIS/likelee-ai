use serde::{Deserialize, Serialize};

// ── Response types returned to the frontend ──────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionInfo {
    pub id: String,
    /// ISO 8601 — when the session was created
    pub created_at: String,
    /// ISO 8601 — last token refresh / activity
    pub last_active_at: String,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    /// Human-readable label, e.g. "Chrome on macOS"
    pub device_label: String,
    /// One of: "desktop" | "mobile" | "tablet" | "unknown"
    pub device_type: String,
    pub is_current: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LoginEvent {
    pub id: String,
    /// One of: "login" | "logout" | "token_refreshed" | "mfa_verified"
    pub event_type: String,
    pub created_at: String,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub device_label: String,
}

#[derive(Debug, Serialize)]
pub struct ListSessionsResponse {
    pub sessions: Vec<SessionInfo>,
    pub current_session_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct LoginHistoryResponse {
    pub events: Vec<LoginEvent>,
    pub total: usize,
}

#[derive(Debug, Serialize)]
pub struct RevokeAllResponse {
    pub revoked_count: usize,
}

// ── Query parameters ──────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct LoginHistoryParams {
    pub limit: Option<usize>,
}

// ── Raw Supabase Admin API shapes ─────────────────────────────────────────────

/// Raw session object returned by `GET /auth/v1/admin/users/{uid}/sessions`
#[derive(Debug, Deserialize)]
pub struct RawSupabaseSession {
    pub id: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub user_agent: Option<String>,
    pub ip: Option<String>,
}

/// Raw audit log entry from `GET /auth/v1/admin/users/{uid}/audit-log-entries`
#[derive(Debug, Deserialize)]
pub struct RawAuditLogEntry {
    pub id: Option<String>,
    pub created_at: Option<String>,
    pub ip_address: Option<String>,
    pub payload: Option<serde_json::Value>,
}
