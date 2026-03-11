use axum::{
    body::Bytes,
    extract::State,
    http::{HeaderMap, StatusCode},
    Json,
};
use hmac::{Hmac, Mac};
use serde::Deserialize;
use serde_json::json;
use sha2::Sha256;
use tracing::{error, info, warn};

use crate::config::AppState;

/// GET /api/booking/calendly-url
/// Returns the configured Calendly booking URL for IRL mode demo scheduling.
pub async fn get_calendly_url(
    State(state): State<AppState>,
) -> (StatusCode, Json<serde_json::Value>) {
    let url = state.calendly_booking_url.trim();

    if url.is_empty() {
        info!("Calendly booking URL not configured");
        return (
            StatusCode::PRECONDITION_FAILED,
            Json(json!({
                "status": "error",
                "error": "calendly_not_configured",
                "message": "Calendly booking URL is not configured. Please set CALENDLY_BOOKING_URL environment variable."
            })),
        );
    }

    info!(calendly_url = %url, "Returning Calendly booking URL");
    (
        StatusCode::OK,
        Json(json!({
            "status": "success",
            "data": {
                "booking_url": url
            }
        })),
    )
}

// --- Calendly Webhook Types ---

#[derive(Debug, Deserialize)]
struct CalendlyWebhookPayload {
    event: String,
    payload: CalendlyPayload,
    #[allow(dead_code)]
    created_at: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CalendlyPayload {
    event: Option<CalendlyEvent>,
    invitee: Option<CalendlyInvitee>,
}

#[derive(Debug, Deserialize)]
struct CalendlyEvent {
    uuid: Option<String>,
    #[allow(dead_code)]
    name: Option<String>,
    start_time: Option<String>,
    end_time: Option<String>,
    #[allow(dead_code)]
    status: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CalendlyInvitee {
    email: Option<String>,
    name: Option<String>,
    timezone: Option<String>,
}

/// POST /webhooks/calendly
/// Receives Calendly webhook events and stores them for tracking.
/// Verifies the webhook signature using HMAC-SHA256 if a signing key is configured.
pub async fn handle_calendly_webhook(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> (StatusCode, Json<serde_json::Value>) {
    // Get raw body as string for signature verification
    let body_str = match String::from_utf8(body.to_vec()) {
        Ok(s) => s,
        Err(e) => {
            error!(error = %e, "Failed to parse webhook body as UTF-8");
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"status": "error", "error": "invalid_body"})),
            );
        }
    };

    // Verify signature if signing key is configured
    let signing_key = state.calendly_webhook_signing_key.trim();
    if !signing_key.is_empty() {
        let signature_header = headers
            .get("calendly-webhook-signature")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("");

        if !verify_calendly_signature(&body_str, signature_header, signing_key) {
            warn!("Calendly webhook signature verification failed");
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({"status": "error", "error": "invalid_signature"})),
            );
        }
        info!("Calendly webhook signature verified successfully");
    } else {
        warn!("Calendly webhook signing key not configured - skipping signature verification");
    }

    // Parse the webhook payload
    let webhook: CalendlyWebhookPayload = match serde_json::from_str(&body_str) {
        Ok(w) => w,
        Err(e) => {
            error!(error = %e, "Failed to parse Calendly webhook payload");
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({"status": "error", "error": "invalid_payload"})),
            );
        }
    };

    let event_type = &webhook.event;
    info!(event_type = %event_type, "Processing Calendly webhook event");

    // Extract relevant data
    let event_uuid = webhook
        .payload
        .event
        .as_ref()
        .and_then(|e| e.uuid.clone())
        .unwrap_or_else(|| format!("generated-{}", chrono::Utc::now().timestamp()));

    let invitee_email = webhook
        .payload
        .invitee
        .as_ref()
        .and_then(|i| i.email.clone());
    let invitee_name = webhook
        .payload
        .invitee
        .as_ref()
        .and_then(|i| i.name.clone());
    let invitee_timezone = webhook
        .payload
        .invitee
        .as_ref()
        .and_then(|i| i.timezone.clone());

    let event_start_time = webhook
        .payload
        .event
        .as_ref()
        .and_then(|e| e.start_time.clone())
        .and_then(|t| chrono::DateTime::parse_from_rfc3339(&t).ok())
        .map(|dt| dt.with_timezone(&chrono::Utc));

    let event_end_time = webhook
        .payload
        .event
        .as_ref()
        .and_then(|e| e.end_time.clone())
        .and_then(|t| chrono::DateTime::parse_from_rfc3339(&t).ok())
        .map(|dt| dt.with_timezone(&chrono::Utc));

    // Determine status based on event type
    let status = match event_type.as_str() {
        "invitee.created" => "scheduled",
        "invitee.canceled" => "canceled",
        "invitee.no_show" => "no_show",
        _ => "scheduled",
    };

    // Store the event in the database
    let insert_payload = json!({
        "calendly_event_uuid": event_uuid,
        "calendly_event_type": event_type,
        "invitee_email": invitee_email,
        "invitee_name": invitee_name,
        "invitee_timezone": invitee_timezone,
        "event_start_time": event_start_time.map(|t| t.to_rfc3339()),
        "event_end_time": event_end_time.map(|t| t.to_rfc3339()),
        "status": status,
        "raw_payload": serde_json::from_str::<serde_json::Value>(&body_str).unwrap_or(json!({})),
        "processed_at": chrono::Utc::now().to_rfc3339(),
    });

    let resp = state
        .pg
        .from("calendly_booking_events")
        .upsert(insert_payload.to_string())
        .on_conflict("calendly_event_uuid")
        .execute()
        .await;

    match resp {
        Ok(r) => {
            let status = r.status();
            if status.is_success() {
                info!(event_uuid = %event_uuid, status = %status, "Calendly booking event stored successfully");
                (
                    StatusCode::OK,
                    Json(json!({"status": "success", "event_uuid": event_uuid})),
                )
            } else {
                let txt = r.text().await.unwrap_or_default();
                error!(status = %status.as_u16(), response = %txt, "Failed to store Calendly booking event");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({"status": "error", "error": "database_error"})),
                )
            }
        }
        Err(e) => {
            error!(error = %e, "Failed to store Calendly booking event");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"status": "error", "error": "database_error"})),
            )
        }
    }
}

/// Verify Calendly webhook signature using HMAC-SHA256
fn verify_calendly_signature(body: &str, signature_header: &str, signing_key: &str) -> bool {
    // Calendly sends signature as: t=timestamp,v1=signature
    // We extract the v1 signature and verify
    let parts: Vec<&str> = signature_header.split(',').collect();
    let mut signature = "";
    let mut timestamp = "";

    for part in parts {
        if let Some(stripped) = part.strip_prefix("t=") {
            timestamp = stripped;
        } else if let Some(stripped) = part.strip_prefix("v1=") {
            signature = stripped;
        }
    }

    if signature.is_empty() || timestamp.is_empty() {
        return false;
    }

    // Create the message to sign: timestamp.body
    let message = format!("{}.{}", timestamp, body);

    // Compute HMAC-SHA256
    type HmacSha256 = Hmac<Sha256>;
    let mut mac = match HmacSha256::new_from_slice(signing_key.as_bytes()) {
        Ok(m) => m,
        Err(_) => return false,
    };
    mac.update(message.as_bytes());
    let result = mac.finalize();
    let computed = hex::encode(result.into_bytes());

    // Compare signatures (constant-time comparison would be ideal, but this is acceptable)
    computed == signature
}
