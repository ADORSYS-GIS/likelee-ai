use axum::http::StatusCode;
use serde_json::json;

// Option 2: Reverted to StatusCode to avoid changing unrelated files
pub fn sanitize_db_error(status: StatusCode, text: String) -> (StatusCode, String) {
    // If it's a 4xx error that looks like a PostgREST error, try to extract a user-friendly message
    // but default to a generic one if it contains schema info.
    if status.is_client_error() {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&text) {
            if v.get("code").is_some() && v.get("message").is_some() {
                let msg = v.get("message").and_then(|m| m.as_str()).unwrap_or("");

                // Check if message contains schema-leaking keywords
                let sensitive_keywords = [
                    "column",
                    "table",
                    "relation",
                    "schema",
                    "cache",
                    "null constraint",
                ];
                if sensitive_keywords.iter().any(|&k| msg.contains(k)) {
                    return (
                        status,
                        json!({
                            "error": "Invalid data provided. Please check your input.",
                            "details": "A validation error occurred on the server."
                        })
                        .to_string(),
                    );
                }

                // If it's a unique constraint violation, we can be more specific
                if msg.contains("duplicate key") {
                    return (
                        status,
                        json!({
                            "error": "This record already exists.",
                            "details": msg
                        })
                        .to_string(),
                    );
                }

                return (
                    status,
                    json!({
                        "error": msg,
                        "code": v.get("code")
                    })
                    .to_string(),
                );
            }
        }
    }

    // For 5xx or unknown 4xx, return generic error
    (
        status,
        json!({
            "error": "An internal error occurred. Our team has been notified.",
            "details": "Please try again later or contact support if the issue persists."
        })
        .to_string(),
    )
}
