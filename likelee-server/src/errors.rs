use axum::http::StatusCode;
use serde_json::json;

pub fn sanitize_db_error(status: StatusCode, text: String) -> (StatusCode, String) {
    // Log the original error for debugging
    tracing::error!(
        status = %status,
        error = %text,
        "Database error occurred"
    );

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
                    "foreign key",
                    "violates",
                ];
                if sensitive_keywords.iter().any(|&k| msg.to_lowercase().contains(k)) {
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
                if msg.contains("duplicate key") || msg.contains("already exists") {
                    return (
                        StatusCode::CONFLICT,
                        json!({
                            "error": "This record already exists.",
                            "details": "Please use a different identifier or update the existing record."
                        })
                        .to_string(),
                    );
                }

                // If it's a not found error
                if msg.contains("not found") || msg.contains("no rows") {
                    return (
                        StatusCode::NOT_FOUND,
                        json!({
                            "error": "The requested resource was not found.",
                            "details": "Please verify the ID and try again."
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
        StatusCode::INTERNAL_SERVER_ERROR,
        json!({
            "error": "An internal error occurred. Our team has been notified.",
            "details": "Please try again later or contact support if the issue persists."
        })
        .to_string(),
    )
}

/// Helper to sanitize any error and log it
pub fn handle_error<E: std::fmt::Display>(err: E, context: &str) -> (StatusCode, String) {
    let err_str = err.to_string();
    tracing::error!(
        context = context,
        error = %err_str,
        "Error occurred"
    );
    sanitize_db_error(StatusCode::INTERNAL_SERVER_ERROR, err_str)
}
