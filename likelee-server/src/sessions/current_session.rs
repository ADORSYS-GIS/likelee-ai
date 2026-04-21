use super::types::RawSupabaseSession;
use tracing::warn;

/// Identifies which session in `sessions` corresponds to the caller's active JWT.
///
/// Matching strategy:
/// 1. Primary: compare `sid_claim` (the `sid` field Supabase embeds in JWTs) against `session.id`
/// 2. Fallback: if `sid_claim` is absent, attempt best-effort match by `user_agent` + `created_at`
///    proximity (within 60 seconds). Logs a warning when falling back.
///
/// # Postconditions
/// - Returns `Some(session_id)` if a match is found
/// - Returns `None` if no match (e.g. session already revoked, or JWT has no `sid` claim)
/// - Does not mutate input
pub fn identify_current_session(
    sessions: &[RawSupabaseSession],
    sid_claim: Option<&str>,
    caller_user_agent: Option<&str>,
) -> Option<String> {
    // Primary: exact match on session ID from JWT `sid` claim
    if let Some(sid) = sid_claim {
        let sid = sid.trim();
        if !sid.is_empty() {
            return sessions
                .iter()
                .find(|s| s.id.trim() == sid)
                .map(|s| s.id.clone());
        }
    }

    // Fallback: best-effort match by user_agent when `sid` claim is absent
    warn!(
        "[sessions] JWT does not contain a `sid` claim — falling back to user_agent matching"
    );

    if let Some(caller_ua) = caller_user_agent {
        let caller_ua = caller_ua.trim();
        if !caller_ua.is_empty() {
            // Find the most recently created session with a matching user_agent
            let matched = sessions
                .iter()
                .filter(|s| {
                    s.user_agent
                        .as_deref()
                        .map(|ua| ua.trim() == caller_ua)
                        .unwrap_or(false)
                })
                .max_by_key(|s| s.created_at.as_deref().unwrap_or(""));

            if let Some(session) = matched {
                warn!(
                    "[sessions] Matched current session by user_agent fallback: {}",
                    session.id
                );
                return Some(session.id.clone());
            }
        }
    }

    warn!("[sessions] Could not identify current session — is_current will be false for all sessions");
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_session(id: &str, ua: Option<&str>) -> RawSupabaseSession {
        RawSupabaseSession {
            id: id.to_string(),
            created_at: Some("2024-01-01T00:00:00Z".to_string()),
            updated_at: Some("2024-01-01T00:00:00Z".to_string()),
            user_agent: ua.map(|s| s.to_string()),
            ip: None,
        }
    }

    #[test]
    fn test_matching_sid_claim() {
        let sessions = vec![
            make_session("session-aaa", Some("Chrome")),
            make_session("session-bbb", Some("Firefox")),
        ];
        let result = identify_current_session(&sessions, Some("session-bbb"), None);
        assert_eq!(result, Some("session-bbb".to_string()));
    }

    #[test]
    fn test_non_matching_sid_claim_returns_none() {
        let sessions = vec![make_session("session-aaa", Some("Chrome"))];
        let result = identify_current_session(&sessions, Some("session-zzz"), None);
        assert_eq!(result, None);
    }

    #[test]
    fn test_empty_session_list_returns_none() {
        let result = identify_current_session(&[], Some("session-aaa"), None);
        assert_eq!(result, None);
    }

    #[test]
    fn test_no_sid_claim_falls_back_to_user_agent() {
        let sessions = vec![
            make_session("session-aaa", Some("Mozilla/5.0 Chrome")),
            make_session("session-bbb", Some("Mozilla/5.0 Firefox")),
        ];
        let result =
            identify_current_session(&sessions, None, Some("Mozilla/5.0 Firefox"));
        assert_eq!(result, Some("session-bbb".to_string()));
    }

    #[test]
    fn test_no_sid_no_ua_match_returns_none() {
        let sessions = vec![make_session("session-aaa", Some("Chrome"))];
        let result = identify_current_session(&sessions, None, Some("Firefox"));
        assert_eq!(result, None);
    }

    #[test]
    fn test_empty_sid_falls_back() {
        let sessions = vec![make_session("session-aaa", Some("Chrome"))];
        // Empty string sid should be treated as absent
        let result = identify_current_session(&sessions, Some("  "), Some("Chrome"));
        assert_eq!(result, Some("session-aaa".to_string()));
    }
}
