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
    if axum_status.is_client_error() {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&text) {
            if let (Some(code), Some(msg)) = (
                v.get("code").and_then(|c| c.as_str()),
                v.get("message").and_then(|m| m.as_str()),
            ) {
                // Check if message contains schema-leaking keywords
                let sensitive_keywords = [
                    "column",
                    "table",
                    "relation",
                    "schema",
                    "cache",
                    "null constraint",
<<<<<<< HEAD
                    "violates",
                    "fk_",
                    "pk_",
                    "idx_",
                ];
                let contains_sensitive = sensitive_keywords
                    .iter()
                    .any(|&k| msg.to_lowercase().contains(k));

                // Map PostgREST/PostgreSQL error codes to user-friendly messages
                // Reference: https://www.postgresql.org/docs/current/errcodes-appendix.html
                match code {
                    "23505" => {
                        return (
                            axum_status,
                            json!({
                                "error": "This record already exists.",
                                "code": code
                            })
                            .to_string(),
                        );
                    }
                    "23503" => {
                        return (
                            axum_status,
                            json!({
                                "error": "The referenced record was not found.",
                                "code": code
                            })
                            .to_string(),
                        );
                    }
                    "23502" => {
                        return (
                            axum_status,
                            json!({
                                "error": "Missing required information.",
                                "code": code
                            })
                            .to_string(),
                        );
                    }
                    "42P01" | "42703" => {
                        // Undefined table or column - definitely sensitive
                        return (
                            StatusCode::INTERNAL_SERVER_ERROR,
                            json!({
                                "error": "A server configuration error occurred.",
                                "code": code
                            })
                            .to_string(),
                        );
                    }
                    _ if contains_sensitive => {
                        return (
                            axum_status,
                            json!({
                                "error": "Invalid data provided. Please check your input.",
                                "details": "A validation error occurred on the server.",
                                "code": code
                            })
                            .to_string(),
                        );
                    }
                    _ => {
                        return (
                            axum_status,
                            json!({
                                "error": msg,
                                "code": code
                            })
                            .to_string(),
                        );
                    }
=======
                    "foreign key",
                    "violates",
                ];
                if sensitive_keywords
                    .iter()
                    .any(|&k| msg.to_lowercase().contains(k))
                {
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
>>>>>>> licRequest
                }
            }
        }
    }

    // For 5xx or unknown 4xx, return generic error
    (
<<<<<<< HEAD
        axum_status,
=======
        StatusCode::INTERNAL_SERVER_ERROR,
>>>>>>> licRequest
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
