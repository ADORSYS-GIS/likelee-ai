use axum::{
    body::Bytes,
    extract::State,
    http::{HeaderMap, StatusCode},
    Json,
};
use hmac::{Hmac, Mac};
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use reqwest::Url;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sha2::Sha256;
use tracing::{error, info, warn};

use crate::auth::AuthUser;
use crate::config::AppState;
use uuid::Uuid;

/// GET /api/booking/calendly-url
/// Returns the public Calendly booking URL used by the marketing-site demo CTA.
pub async fn get_calendly_booking_url(
    State(state): State<AppState>,
) -> (StatusCode, Json<serde_json::Value>) {
    let booking_url = state.calendly_booking_url.trim();

    if booking_url.is_empty() {
        return (
            StatusCode::PRECONDITION_FAILED,
            Json(json!({
                "status": "error",
                "error": "not_configured",
                "message": "Calendly booking URL is not configured."
            })),
        );
    }

    let (normalized_booking_url, warning_message) =
        normalize_public_calendly_booking_url(booking_url);

    (
        StatusCode::OK,
        Json(json!({
            "status": "success",
            "data": {
                "booking_url": normalized_booking_url,
                "warning": warning_message
            },
        })),
    )
}

fn normalize_public_calendly_booking_url(booking_url: &str) -> (String, Option<String>) {
    let Ok(mut parsed_url) = Url::parse(booking_url) else {
        return (booking_url.to_string(), None);
    };

    let host = parsed_url
        .host_str()
        .map(|value| value.to_ascii_lowercase())
        .unwrap_or_default();

    if !host.ends_with("calendly.com") {
        return (booking_url.to_string(), None);
    }

    let path_segments: Vec<String> = parsed_url
        .path_segments()
        .map(|segments| {
            segments
                .filter(|segment| !segment.is_empty())
                .map(|segment| segment.to_string())
                .collect()
        })
        .unwrap_or_default();

    if path_segments.len() < 2 {
        return (booking_url.to_string(), None);
    }

    let suspicious_terminal_segments = [
        "confirmed",
        "default",
        "casting",
        "option",
        "test-shoot",
        "test_shoot",
        "fitting",
        "rehearsal",
        "agency_discovery",
        "talent_interview",
        "photo_shoot",
        "photo-shoot",
        "scheduled",
        "completed",
        "cancelled",
        "canceled",
    ];

    let final_segment = path_segments
        .last()
        .map(|segment| segment.to_ascii_lowercase())
        .unwrap_or_default();

    if !suspicious_terminal_segments.contains(&final_segment.as_str()) {
        return (booking_url.to_string(), None);
    }

    let sanitized_path = format!("/{}", path_segments[..path_segments.len() - 1].join("/"));
    parsed_url.set_path(&sanitized_path);

    (
        parsed_url.to_string(),
        Some(format!(
            "Configured Calendly URL ended with '{}', which looks like an internal booking type. Falling back to the public Likelee scheduling page.",
            final_segment
        )),
    )
}

// --- Calendly Webhook Types ---

#[derive(Debug, Deserialize)]
struct CalendlyWebhookPayload {
    event: String,
    payload: serde_json::Value,
    #[allow(dead_code)]
    created_at: Option<String>,
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

    // Extract relevant data from payload (In V2, payload is the resource, e.g. Invitee)
    let invitee: Option<CalendlyInvitee> = serde_json::from_value(webhook.payload.clone()).ok();

    // Event URI is usually present in the payload for invitee events
    let event_uri = webhook
        .payload
        .get("event")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let event_uuid = event_uri
        .clone()
        .unwrap_or_else(|| format!("generated-{}", chrono::Utc::now().timestamp()));

    let invitee_email = invitee.as_ref().and_then(|i| i.email.clone());
    let invitee_name = invitee.as_ref().and_then(|i| i.name.clone());
    let invitee_timezone = invitee.as_ref().and_then(|i| i.timezone.clone());

    // In V2, start/end times might be in the payload if it's an event-related webhook
    // Or we might need to fetch them. For now, we try to extract from payload if present.
    let event_start_time = webhook
        .payload
        .get("start_time")
        .and_then(|v| v.as_str())
        .and_then(|t| chrono::DateTime::parse_from_rfc3339(t).ok())
        .map(|dt| dt.with_timezone(&chrono::Utc));

    let event_end_time = webhook
        .payload
        .get("end_time")
        .and_then(|v| v.as_str())
        .and_then(|t| chrono::DateTime::parse_from_rfc3339(t).ok())
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
        "raw_payload": webhook.payload,
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

// --- Calendly Agency Settings ---

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct AgencyCalendlySettings {
    pub agency_id: Uuid,
    pub calendly_api_token: Option<String>,
    pub is_enabled: bool,
    pub mappings: serde_json::Value,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

/// GET /api/calendly/settings
pub async fn get_agency_calendly_settings(
    State(state): State<AppState>,
    user: AuthUser,
) -> (StatusCode, Json<serde_json::Value>) {
    let access = match crate::entitlements::require_agency_pro_access(
        &state,
        &user.id,
        "pro_plan_required_for_calendly",
    )
    .await
    {
        Ok(access) => access,
        Err((status, error)) => {
            return (status, Json(json!({"status": "error", "error": error})));
        }
    };
    if !access.addon_irl_booking_enabled {
        return (
            StatusCode::FORBIDDEN,
            Json(json!({"status": "error", "error": "irl_booking_addon_required_for_calendly"})),
        );
    }

    let resp = state
        .pg
        .from("agency_calendly_settings")
        .select("*")
        .eq("agency_id", &user.id)
        .single()
        .execute()
        .await;

    match resp {
        Ok(r) if r.status().is_success() => {
            let txt = r.text().await.unwrap_or_default();
            let data: serde_json::Value = serde_json::from_str(&txt).unwrap_or_default();
            (
                StatusCode::OK,
                Json(json!({"status": "success", "data": data})),
            )
        }
        Ok(r) if r.status().as_u16() == 404 => {
            // Return default empty settings if not found
            (
                StatusCode::OK,
                Json(json!({
                    "status": "success",
                    "data": {
                        "agency_id": user.id,
                        "calendly_api_token": null,
                        "is_enabled": false,
                        "mappings": {}
                    }
                })),
            )
        }
        Ok(r) => {
            let status_code = r.status();
            let txt = r.text().await.unwrap_or_default();
            error!(status = %status_code, response = %txt, "Failed to fetch Calendly settings");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"status": "error", "error": "database_error"})),
            )
        }
        Err(e) => {
            error!(error = %e, "Failed to fetch Calendly settings");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"status": "error", "error": "database_error"})),
            )
        }
    }
}

/// POST /api/calendly/settings
pub async fn update_agency_calendly_settings(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<serde_json::Value>,
) -> (StatusCode, Json<serde_json::Value>) {
    let access = match crate::entitlements::require_agency_pro_access(
        &state,
        &user.id,
        "pro_plan_required_for_calendly",
    )
    .await
    {
        Ok(access) => access,
        Err((status, error)) => {
            return (status, Json(json!({"status": "error", "error": error})));
        }
    };
    if !access.addon_irl_booking_enabled {
        return (
            StatusCode::FORBIDDEN,
            Json(json!({"status": "error", "error": "irl_booking_addon_required_for_calendly"})),
        );
    }

    let mut insert_payload = payload;
    insert_payload["agency_id"] = json!(user.id);
    insert_payload["updated_at"] = json!(chrono::Utc::now().to_rfc3339());

    let resp = state
        .pg
        .from("agency_calendly_settings")
        .upsert(insert_payload.to_string())
        .on_conflict("agency_id")
        .execute()
        .await;

    match resp {
        Ok(r) if r.status().is_success() => (StatusCode::OK, Json(json!({"status": "success"}))),
        Ok(r) => {
            let status_code = r.status();
            let txt = r.text().await.unwrap_or_default();
            error!(status = %status_code, response = %txt, "Failed to update Calendly settings");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"status": "error", "message": "Failed to save settings"})),
            )
        }
        Err(e) => {
            error!(error = %e, "Failed to update Calendly settings");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"status": "error", "error": "database_error"})),
            )
        }
    }
}

/// GET /api/calendly/event-types
pub async fn get_calendly_event_types(
    State(state): State<AppState>,
    user: AuthUser,
) -> (StatusCode, Json<serde_json::Value>) {
    let access = match crate::entitlements::require_agency_pro_access(
        &state,
        &user.id,
        "pro_plan_required_for_calendly",
    )
    .await
    {
        Ok(access) => access,
        Err((status, error)) => {
            return (status, Json(json!({"status": "error", "error": error})));
        }
    };
    if !access.addon_irl_booking_enabled {
        return (
            StatusCode::FORBIDDEN,
            Json(json!({"status": "error", "error": "irl_booking_addon_required_for_calendly"})),
        );
    }

    // 1. Fetch agency settings to get the token
    let resp = state
        .pg
        .from("agency_calendly_settings")
        .select("calendly_api_token")
        .eq("agency_id", &user.id)
        .single()
        .execute()
        .await;

    let token = match resp {
        Ok(r) if r.status().is_success() => {
            let txt = r.text().await.unwrap_or_default();
            let v: serde_json::Value = serde_json::from_str(&txt).unwrap_or(json!({}));
            v.get("calendly_api_token")
                .and_then(|t| t.as_str())
                .map(|s| s.to_string())
        }
        _ => None,
    };

    let token = match token {
        Some(t) if !t.trim().is_empty() => t,
        _ => {
            // Fallback to system token if configured
            let system_token = state.calendly_api_token.trim();
            if system_token.is_empty() {
                return (
                    StatusCode::PRECONDITION_FAILED,
                    Json(
                        json!({"status": "error", "error": "not_configured", "message": "Calendly API token is not configured."}),
                    ),
                );
            }
            system_token.to_string()
        }
    };

    let client = reqwest::Client::new();

    // 1. Get user URI (mandatory in V2 to list event_types)
    let user_resp = match client
        .get("https://api.calendly.com/users/me")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"status": "error", "error": "api_error", "message": e.to_string()})),
            )
        }
    };

    if !user_resp.status().is_success() {
        return (
            StatusCode::BAD_GATEWAY,
            Json(json!({"status": "error", "error": "calendly_api_error"})),
        );
    }

    let user_data: CalendlyUserResponse = match user_resp.json().await {
        Ok(d) => d,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"status": "error", "error": "parse_error"})),
            )
        }
    };
    let user_uri = user_data.resource.uri;

    // 2. Get event types
    let et_resp = match client
        .get("https://api.calendly.com/event_types")
        .query(&[("user", &user_uri)])
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"status": "error", "error": "api_error", "message": e.to_string()})),
            )
        }
    };

    if !et_resp.status().is_success() {
        return (
            StatusCode::BAD_GATEWAY,
            Json(json!({"status": "error", "error": "calendly_api_error"})),
        );
    }

    let et_data: CalendlyEventTypesResponse = match et_resp.json().await {
        Ok(d) => d,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"status": "error", "error": "parse_error"})),
            )
        }
    };

    (
        StatusCode::OK,
        Json(json!({"status": "success", "data": et_data.collection})),
    )
}

#[derive(Debug, Deserialize)]
struct CalendlyUserResponse {
    resource: CalendlyUser,
}

#[derive(Debug, Deserialize)]
struct CalendlyUser {
    uri: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct CalendlyEventTypesResponse {
    collection: Vec<CalendlyEventType>,
}

#[derive(Debug, Serialize, Deserialize)]
struct CalendlyEventType {
    uri: String,
    slug: String,
    name: String,
    active: bool,
    locations: Option<Vec<CalendlyLocation>>,
}

#[derive(Debug, Serialize, Deserialize)]
struct CalendlyLocation {
    kind: String,
}

/// Schedules a Calendly meeting programmatically using the API V2.
/// Returns the URI of the created invitee on success.
#[allow(clippy::too_many_arguments)]
pub async fn schedule_calendly_invitee(
    state: &AppState,
    email: &str,
    name: &str,
    start_time: chrono::DateTime<chrono::Utc>,
    timezone: &str,
    target_slug_override: Option<&str>,
    location: Option<&str>,
    agency_name: Option<&str>,
    agency_id: Option<&str>,
) -> Result<String, String> {
    let mut token = state.calendly_api_token.trim().to_string();
    let mut target_slug_final = target_slug_override.map(|s| s.to_string());

    // If we have an agency_id, check for custom token and mappings
    if let Some(aid) = agency_id {
        if let Ok(resp) = state
            .pg
            .from("agency_calendly_settings")
            .select("*")
            .eq("agency_id", aid)
            .single()
            .execute()
            .await
        {
            if resp.status().is_success() {
                if let Ok(txt) = resp.text().await {
                    if let Ok(v) = serde_json::from_str::<serde_json::Value>(&txt) {
                        // Use agency token if provided
                        if let Some(t) = v.get("calendly_api_token").and_then(|t| t.as_str()) {
                            if !t.trim().is_empty() {
                                token = t.to_string();
                            }
                        }

                        // Use mapping if target_slug_override is present and matches a mapping key
                        // (e.g. mapping "confirmed" to an event slug)
                        if let (Some(slug), Some(mappings)) = (
                            &target_slug_final,
                            v.get("mappings").and_then(|m| m.as_object()),
                        ) {
                            if let Some(mapped_slug) = mappings.get(slug).and_then(|s| s.as_str()) {
                                target_slug_final = Some(mapped_slug.to_string());
                            }
                        }
                    }
                }
            }
        }
    }

    if token.is_empty() {
        return Err("Calendly API token not configured".to_string());
    }

    // Determine the target slug:
    let target_slug = if let Some(s) = target_slug_final {
        s
    } else {
        // Fallback to legacy behavior using CALENDLY_BOOKING_URL if no slug provided
        let booking_url = state.calendly_booking_url.trim();
        if booking_url.is_empty() {
            return Err("CALENDLY_BOOKING_URL not configured and no slug provided".to_string());
        }

        let trimmed_url = booking_url.trim_end_matches('/');
        let url_parts: Vec<&str> = trimmed_url.split('/').collect();

        let slug_from_url = if url_parts.len() > 4 {
            url_parts.last().map(|s| s.to_string())
        } else {
            None
        };

        slug_from_url.ok_or_else(|| {
            "No slug provided and CALENDLY_BOOKING_URL is a user-level URL".to_string()
        })?
    };

    info!(target_slug = %target_slug, "Scheduling Calendly meeting with slug");

    let client = reqwest::Client::new();

    // 1. Get user URI
    let user_resp = client
        .get("https://api.calendly.com/users/me")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("Failed to fetch Calendly user: {}", e))?;

    if !user_resp.status().is_success() {
        let status = user_resp.status();
        let text = user_resp.text().await.unwrap_or_default();
        return Err(format!("Calendly user API failed ({}): {}", status, text));
    }

    let user_data: CalendlyUserResponse = user_resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse Calendly user response: {}", e))?;
    let user_uri = user_data.resource.uri;

    // 2. Get event types and find the one matching the slug
    let et_resp = client
        .get("https://api.calendly.com/event_types")
        .query(&[("user", &user_uri)])
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("Failed to fetch Calendly event types: {}", e))?;

    if !et_resp.status().is_success() {
        let status = et_resp.status();
        let text = et_resp.text().await.unwrap_or_default();
        return Err(format!(
            "Calendly event types API failed ({}): {}",
            status, text
        ));
    }

    let et_data: CalendlyEventTypesResponse = et_resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse Calendly event types response: {}", e))?;

    let active_event_types: Vec<CalendlyEventType> = et_data
        .collection
        .into_iter()
        .filter(|et| et.active)
        .collect();

    let available_slugs: Vec<&str> = active_event_types
        .iter()
        .map(|et| et.slug.as_str())
        .collect();
    info!(available_slugs = ?available_slugs, requested_slug = %target_slug, "Resolving Calendly event type");

    // Try exact match first, then fall back to first active event type
    let event_type = active_event_types.iter()
        .find(|et| et.slug == target_slug)
        .or_else(|| {
            warn!(requested_slug = %target_slug, available_slugs = ?available_slugs, "No exact slug match found, falling back to first active event type");
            active_event_types.first()
        })
        .ok_or_else(|| "No active Calendly event types found. Please create an event type in your Calendly dashboard.".to_string())?;

    info!(event_type_slug = %event_type.slug, locations = ?event_type.locations, "Resolved Calendly event type");

    // 3. Create scheduled event invitee
    // CRITICAL: The Calendly V2 API requires `location` to be a ROOT level field,
    // NOT nested inside the `invitee` object.

    // Customize the invitee name to include "via Likelee for [Agency Name]"
    // This will appear in the calendar event title in most views.
    let display_name = if let Some(agency) = agency_name {
        format!("{} (via Likelee for {})", name, agency)
    } else {
        name.to_string()
    };

    let body_note = if let Some(agency) = agency_name {
        format!("This invitation is sent via Likelee on behalf of {}. Likelee is the channel of communication; {} is the real owner and host of this message.", agency, agency)
    } else {
        "This invitation is sent via Likelee.".to_string()
    };

    let mut payload = json!({
        "event_type": event_type.uri,
        "start_time": start_time.to_rfc3339(),
        "invitee": {
            "email": email,
            "name": display_name,
            "timezone": timezone,
            "questions_and_answers": [
                {
                    "question": "Note",
                    "answer": body_note
                }
            ]
        }
    });

    // Determine location kind and add to ROOT of payload
    let location_kind = event_type
        .locations
        .as_ref()
        .and_then(|locs| locs.first())
        .map(|loc| loc.kind.as_str());

    if let Some(kind) = location_kind {
        match kind {
            "physical" | "custom" | "ask_invitee" => {
                let loc_str = location.unwrap_or("Likelee Dashboard"); // Default to dashboard if missing
                payload["location"] = json!({
                    "kind": kind,
                    "location": loc_str
                });
            }
            _ => {
                // Conferencing types: send only the kind, no location string
                payload["location"] = json!({ "kind": kind });
            }
        }
    }

    info!(payload = ?payload, "Sending invitee creation payload to Calendly (ROOT location)");

    let invitee_resp = client
        .post("https://api.calendly.com/invitees")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .header(CONTENT_TYPE, "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Failed to create Calendly invitee: {}", e))?;

    if !invitee_resp.status().is_success() {
        let status = invitee_resp.status();
        let text = invitee_resp.text().await.unwrap_or_default();
        return Err(format!(
            "Calendly invitee creation failed ({}): {}",
            status, text
        ));
    }

    let invitee_data: serde_json::Value = invitee_resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse Calendly invitee response: {}", e))?;

    let invitee_uri = invitee_data
        .get("resource")
        .and_then(|r| r.get("uri"))
        .and_then(|u| u.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| "Invitee URI missing in Calendly response".to_string())?;

    info!(invitee_uri = %invitee_uri, invitee_email = %email, "Successfully scheduled Calendly meeting");

    Ok(invitee_uri)
}

/// Verify Calendly webhook signature using HMAC-SHA256
fn verify_calendly_signature(body: &str, signature_header: &str, signing_key: &str) -> bool {
    // Calendly sends signature as: t=timestamp,v1=signature
    let parts: Vec<&str> = signature_header.split(',').collect();
    let mut signature_hex = "";
    let mut timestamp = "";

    for part in parts {
        let part = part.trim();
        if let Some(stripped) = part.strip_prefix("t=") {
            timestamp = stripped;
        } else if let Some(stripped) = part.strip_prefix("v1=") {
            signature_hex = stripped;
        }
    }

    if signature_hex.is_empty() || timestamp.is_empty() {
        return false;
    }

    let signature_bytes = match hex::decode(signature_hex) {
        Ok(b) => b,
        Err(_) => return false,
    };

    // Create the message to sign: timestamp.body
    let message = format!("{}.{}", timestamp, body);

    // Compute HMAC-SHA256 and verify in constant time
    type HmacSha256 = Hmac<Sha256>;
    let mut mac = match HmacSha256::new_from_slice(signing_key.as_bytes()) {
        Ok(m) => m,
        Err(_) => return false,
    };
    mac.update(message.as_bytes());

    mac.verify_slice(&signature_bytes).is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_verify_calendly_signature() {
        let body = r#"{"event":"invitee.created","payload":{"email":"test@example.com"}}"#;
        let timestamp = "123456789";
        let signing_key = "secret_key";

        // Compute valid signature
        let message = format!("{}.{}", timestamp, body);
        type HmacSha256 = Hmac<Sha256>;
        let mut mac = HmacSha256::new_from_slice(signing_key.as_bytes()).unwrap();
        mac.update(message.as_bytes());
        let signature_hex = hex::encode(mac.finalize().into_bytes());

        let signature_header = format!("t={},v1={}", timestamp, signature_hex);

        assert!(verify_calendly_signature(
            body,
            &signature_header,
            signing_key
        ));
        assert!(!verify_calendly_signature(
            body,
            &signature_header,
            "wrong_key"
        ));
        assert!(!verify_calendly_signature(
            "wrong_body",
            &signature_header,
            signing_key
        ));
    }

    #[test]
    fn test_parse_calendly_v2_payload() {
        let body = r#"{
            "event": "invitee.created",
            "created_at": "2023-01-01T00:00:00.000000Z",
            "payload": {
                "email": "jane@example.com",
                "name": "Jane Doe",
                "timezone": "America/New_York",
                "event": "https://api.calendly.com/scheduled_events/GBHCI7GVNSC3VY6V",
                "start_time": "2023-01-01T12:00:00.000000Z",
                "end_time": "2023-01-01T13:00:00.000000Z"
            }
        }"#;

        let webhook: CalendlyWebhookPayload = serde_json::from_str(body).unwrap();
        assert_eq!(webhook.event, "invitee.created");

        let invitee: CalendlyInvitee = serde_json::from_value(webhook.payload.clone()).unwrap();
        assert_eq!(invitee.name.unwrap(), "Jane Doe");

        let event_uri = webhook
            .payload
            .get("event")
            .and_then(|v| v.as_str())
            .unwrap();
        assert_eq!(
            event_uri,
            "https://api.calendly.com/scheduled_events/GBHCI7GVNSC3VY6V"
        );

        let start_time = webhook
            .payload
            .get("start_time")
            .and_then(|v| v.as_str())
            .unwrap();
        let dt = chrono::DateTime::parse_from_rfc3339(start_time).unwrap();
        assert_eq!(dt.timestamp(), 1672574400);
    }
}
