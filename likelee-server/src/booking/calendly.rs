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
use std::collections::BTreeMap;
use tracing::{error, info, warn};

use crate::auth::AuthUser;
use crate::config::AppState;
use uuid::Uuid;

const CALENDLY_MAPPING_KEYS: &[&str] = &["default"];
const CALENDLY_EVENT_TYPE_URI_PREFIX: &str = "https://api.calendly.com/event_types/";

#[derive(Debug, Clone)]
struct CalendlyConfigError {
    code: &'static str,
    message: String,
}

impl CalendlyConfigError {
    fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }
}

#[derive(Debug, Clone, Default)]
struct AgencyCalendlySettingsRecord {
    calendly_api_token: String,
    scheduling_url: String,
    is_enabled: bool,
    mappings: BTreeMap<String, String>,
}

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
    pub scheduling_url: Option<String>,
    pub is_enabled: bool,
    pub mappings: serde_json::Value,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

fn normalize_calendly_mappings(
    raw_mappings: Option<&serde_json::Value>,
) -> serde_json::Map<String, serde_json::Value> {
    let mut normalized = serde_json::Map::new();

    let Some(obj) = raw_mappings.and_then(|value| value.as_object()) else {
        return normalized;
    };

    for key in CALENDLY_MAPPING_KEYS {
        let Some(value) = obj.get(*key).and_then(|entry| entry.as_str()) else {
            continue;
        };
        let value = canonicalize_calendly_mapping_value(value);
        if value.is_empty() {
            continue;
        }
        normalized.insert((*key).to_string(), json!(value));
    }

    normalized
}

fn parse_agency_calendly_settings(row: &serde_json::Value) -> AgencyCalendlySettingsRecord {
    AgencyCalendlySettingsRecord {
        calendly_api_token: row
            .get("calendly_api_token")
            .and_then(|value| value.as_str())
            .map(|value| value.trim().to_string())
            .unwrap_or_default(),
        scheduling_url: row
            .get("scheduling_url")
            .and_then(|value| value.as_str())
            .map(|value| value.trim().to_string())
            .unwrap_or_default(),
        is_enabled: row
            .get("is_enabled")
            .and_then(|value| value.as_bool())
            .unwrap_or(false),
        mappings: normalize_calendly_mappings(row.get("mappings"))
            .into_iter()
            .filter_map(|(key, value)| value.as_str().map(|slug| (key, slug.to_string())))
            .collect(),
    }
}

async fn load_agency_calendly_settings(
    state: &AppState,
    agency_id: &str,
) -> Result<Option<AgencyCalendlySettingsRecord>, CalendlyConfigError> {
    let resp = state
        .pg
        .from("agency_calendly_settings")
        .select("agency_id,calendly_api_token,scheduling_url,is_enabled,mappings")
        .eq("agency_id", agency_id)
        .limit(1)
        .execute()
        .await
        .map_err(|error| {
            CalendlyConfigError::new(
                "database_error",
                format!("Failed to fetch settings: {error}"),
            )
        })?;

    let status = resp.status();
    let text = resp.text().await.unwrap_or_default();
    if !status.is_success() {
        return Err(CalendlyConfigError::new(
            "database_error",
            format!("Failed to fetch settings ({status}): {text}"),
        ));
    }

    let rows: serde_json::Value = serde_json::from_str(&text).unwrap_or_else(|_| json!([]));
    Ok(rows
        .as_array()
        .and_then(|items| items.first())
        .map(parse_agency_calendly_settings))
}

fn build_serializable_calendly_settings(
    agency_id: &str,
    settings: &AgencyCalendlySettingsRecord,
) -> serde_json::Value {
    json!({
        "agency_id": agency_id,
        "calendly_api_token": if settings.calendly_api_token.is_empty() {
            serde_json::Value::Null
        } else {
            json!(settings.calendly_api_token)
        },
        "scheduling_url": if settings.scheduling_url.is_empty() {
            serde_json::Value::Null
        } else {
            json!(settings.scheduling_url)
        },
        "is_enabled": settings.is_enabled,
        "mappings": settings.mappings,
    })
}

fn normalize_agency_calendly_settings_payload(
    payload: serde_json::Value,
) -> AgencyCalendlySettingsRecord {
    let calendly_api_token = payload
        .get("calendly_api_token")
        .and_then(|value| value.as_str())
        .map(|value| value.trim().to_string())
        .unwrap_or_default();
    let scheduling_url = payload
        .get("scheduling_url")
        .and_then(|value| value.as_str())
        .map(|value| {
            normalize_public_calendly_booking_url(value)
                .0
                .trim()
                .to_string()
        })
        .unwrap_or_default();
    let is_enabled = payload
        .get("is_enabled")
        .and_then(|value| value.as_bool())
        .unwrap_or(false);
    let mappings = normalize_calendly_mappings(payload.get("mappings"))
        .into_iter()
        .filter_map(|(key, value)| value.as_str().map(|slug| (key, slug.to_string())))
        .collect::<BTreeMap<_, _>>();

    AgencyCalendlySettingsRecord {
        calendly_api_token,
        scheduling_url,
        is_enabled,
        mappings,
    }
}

fn calendly_error_response(error: CalendlyConfigError) -> (StatusCode, Json<serde_json::Value>) {
    let status = match error.code {
        "token_missing" => StatusCode::PRECONDITION_FAILED,
        "token_invalid" | "mapping_invalid" => StatusCode::BAD_REQUEST,
        "calendly_api_error" => StatusCode::BAD_GATEWAY,
        _ => StatusCode::INTERNAL_SERVER_ERROR,
    };

    (
        status,
        Json(json!({
            "status": "error",
            "error": error.code,
            "message": error.message,
        })),
    )
}

fn classify_calendly_status_error(
    status: reqwest::StatusCode,
    context: &'static str,
    response_text: &str,
) -> CalendlyConfigError {
    let trimmed_response = response_text.trim();
    let parsed_response = serde_json::from_str::<serde_json::Value>(trimmed_response).ok();
    let extracted_message = parsed_response
        .as_ref()
        .and_then(extract_calendly_error_message)
        .filter(|entry| !entry.is_empty())
        .unwrap_or_else(|| trimmed_response.to_string());

    if status == StatusCode::UNAUTHORIZED || status == StatusCode::FORBIDDEN {
        if let Some(scope_message) =
            build_calendly_scope_error_message(context, parsed_response.as_ref())
        {
            return CalendlyConfigError::new("token_invalid", scope_message);
        }

        return CalendlyConfigError::new(
            "token_invalid",
            format!(
                "Calendly rejected the saved personal access token while {context}. {}",
                if extracted_message.is_empty() {
                    "Regenerate the token with Scheduling access and make sure it belongs to the Calendly user who owns the target event types.".to_string()
                } else {
                    extracted_message
                }
            ),
        );
    }

    CalendlyConfigError::new(
        "calendly_api_error",
        format!(
            "Calendly returned {} while {}. {}",
            status.as_u16(),
            context,
            extracted_message
        ),
    )
}

fn extract_calendly_error_message(value: &serde_json::Value) -> Option<String> {
    value
        .get("message")
        .and_then(|entry| entry.as_str())
        .or_else(|| value.get("title").and_then(|entry| entry.as_str()))
        .or_else(|| value.get("error").and_then(|entry| entry.as_str()))
        .map(|entry| entry.trim().to_string())
}

fn collect_required_scopes(value: &serde_json::Value) -> Vec<String> {
    fn visit(node: &serde_json::Value, scopes: &mut Vec<String>) {
        match node {
            serde_json::Value::Object(map) => {
                if let Some(entries) = map
                    .get("required_scopes")
                    .and_then(|entry| entry.as_array())
                {
                    for scope in entries.iter().filter_map(|entry| entry.as_str()) {
                        let scope = scope.trim();
                        if !scope.is_empty() && !scopes.iter().any(|existing| existing == scope) {
                            scopes.push(scope.to_string());
                        }
                    }
                }

                for value in map.values() {
                    visit(value, scopes);
                }
            }
            serde_json::Value::Array(items) => {
                for value in items {
                    visit(value, scopes);
                }
            }
            _ => {}
        }
    }

    let mut scopes = Vec::new();
    visit(value, &mut scopes);
    scopes
}

fn expected_scopes_for_context(context: &str) -> &'static [&'static str] {
    match context {
        "loading Calendly event types" | "loading the Calendly event type" => &["event_types:read"],
        "loading the Calendly account" => &["users:read"],
        "creating the Calendly invitee" => &["scheduled_events:write"],
        _ => &[],
    }
}

fn build_calendly_scope_error_message(
    context: &str,
    response_value: Option<&serde_json::Value>,
) -> Option<String> {
    let response_value = response_value?;
    let mut scopes = collect_required_scopes(response_value);

    if scopes.is_empty() {
        let extracted_message = extract_calendly_error_message(response_value).unwrap_or_default();
        let mentions_scopes = extracted_message.contains("required_scopes")
            || extracted_message.to_ascii_lowercase().contains("scope");

        if !mentions_scopes {
            return None;
        }

        scopes = expected_scopes_for_context(context)
            .iter()
            .map(|scope| (*scope).to_string())
            .collect();
    }

    if scopes.is_empty() {
        return None;
    }

    Some(format!(
        "Your Calendly token is valid, but it is missing the required scopes for {context}: {}. Update the token to include these scopes and try again.",
        scopes.join(", ")
    ))
}

fn build_calendly_invitee_request_error(status: StatusCode, response_text: &str) -> String {
    let parsed_response = serde_json::from_str::<serde_json::Value>(response_text).ok();

    if let Some(details) = parsed_response
        .as_ref()
        .and_then(|value| value.get("details"))
        .and_then(|value| value.as_array())
    {
        let slot_already_filled = details.iter().any(|detail| {
            let code = detail
                .get("code")
                .and_then(|value| value.as_str())
                .unwrap_or("");
            let parameter = detail
                .get("parameter")
                .and_then(|value| value.as_str())
                .unwrap_or("");
            let message = detail
                .get("message")
                .and_then(|value| value.as_str())
                .unwrap_or("");

            code == "already_filled"
                || parameter == "event.start_time"
                    && message.to_ascii_lowercase().contains("filled")
        });

        if slot_already_filled {
            return format!(
                "The selected Calendly time slot is no longer available ({}). Choose a different booking time in Likelee or free the slot in Calendly.",
                status.as_u16()
            );
        }
    }

    format!(
        "Calendly event type configuration rejected the invitee request ({}): {}",
        status.as_u16(),
        response_text
    )
}

fn canonicalize_calendly_mapping_value(value: &str) -> String {
    canonicalize_calendly_event_type_reference(value).unwrap_or_else(|| value.trim().to_string())
}

fn canonicalize_calendly_event_type_reference(reference: &str) -> Option<String> {
    let trimmed = reference.trim().trim_matches(|char: char| {
        char.is_whitespace() || matches!(char, '"' | '\'' | ',' | ';' | '.')
    });

    if trimmed.is_empty() {
        return None;
    }

    if let Ok(parsed_url) = Url::parse(trimmed) {
        if parsed_url
            .host_str()
            .map(|host| host.eq_ignore_ascii_case("api.calendly.com"))
            .unwrap_or(false)
        {
            let segments = parsed_url
                .path_segments()
                .map(|entries| entries.collect::<Vec<_>>())
                .unwrap_or_default();

            if segments.len() >= 2 && segments[0] == "event_types" {
                let event_type_uuid = segments[1]
                    .trim_matches(|char: char| !char.is_ascii_alphanumeric() && char != '-');
                if !event_type_uuid.is_empty()
                    && event_type_uuid
                        .chars()
                        .all(|char| char.is_ascii_alphanumeric() || char == '-')
                {
                    return Some(format!("{CALENDLY_EVENT_TYPE_URI_PREFIX}{event_type_uuid}"));
                }
            }
        }
    }

    let (_, raw_uuid) = trimmed.rsplit_once("/event_types/")?;
    let event_type_uuid =
        raw_uuid.trim_matches(|char: char| !char.is_ascii_alphanumeric() && char != '-');
    if event_type_uuid.is_empty()
        || !event_type_uuid
            .chars()
            .all(|char| char.is_ascii_alphanumeric() || char == '-')
    {
        return None;
    }

    Some(format!("{CALENDLY_EVENT_TYPE_URI_PREFIX}{event_type_uuid}"))
}

fn is_calendly_event_type_uri(value: &str) -> bool {
    canonicalize_calendly_event_type_reference(value).is_some()
}

fn calendly_event_type_uuid_from_reference(reference: &str) -> Option<String> {
    canonicalize_calendly_event_type_reference(reference).and_then(|value| {
        value
            .strip_prefix(CALENDLY_EVENT_TYPE_URI_PREFIX)
            .map(str::to_string)
    })
}

async fn fetch_calendly_event_type_by_reference(
    token: &str,
    reference: &str,
) -> Result<CalendlyEventType, CalendlyConfigError> {
    let event_type_uuid = calendly_event_type_uuid_from_reference(reference).ok_or_else(|| {
        CalendlyConfigError::new(
            "mapping_invalid",
            format!(
                "Calendly event type reference '{reference}' is not a valid Calendly event type URI."
            ),
        )
    })?;

    let client = reqwest::Client::new();
    let response = client
        .get(format!(
            "https://api.calendly.com/event_types/{event_type_uuid}"
        ))
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await
        .map_err(|error| {
            CalendlyConfigError::new(
                "calendly_api_error",
                format!("Failed to reach Calendly while loading the event type: {error}"),
            )
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(classify_calendly_status_error(
            status,
            "loading the Calendly event type",
            &text,
        ));
    }

    let event_type_response: CalendlyEventTypeResponse =
        response.json().await.map_err(|error| {
            CalendlyConfigError::new(
                "calendly_api_error",
                format!("Failed to parse the Calendly event type response: {error}"),
            )
        })?;

    Ok(event_type_response.resource)
}

async fn fetch_calendly_event_types_for_token(
    token: &str,
) -> Result<Vec<CalendlyEventType>, CalendlyConfigError> {
    let client = reqwest::Client::new();

    let direct_event_types_resp = client
        .get("https://api.calendly.com/event_types")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await
        .map_err(|error| {
            CalendlyConfigError::new(
                "calendly_api_error",
                format!("Failed to reach Calendly while loading event types: {error}"),
            )
        })?;

    if direct_event_types_resp.status().is_success() {
        let et_data: CalendlyEventTypesResponse =
            direct_event_types_resp.json().await.map_err(|error| {
                CalendlyConfigError::new(
                    "calendly_api_error",
                    format!("Failed to parse the Calendly event types response: {error}"),
                )
            })?;

        return Ok(et_data.collection);
    }

    let direct_status = direct_event_types_resp.status();
    let direct_text = direct_event_types_resp.text().await.unwrap_or_default();

    // Calendly's scheduling docs describe GET /event_types directly for scheduling flows.
    // If that endpoint accepts the token, we avoid calling /users/me and requiring
    // broader non-scheduling scopes just to look up the current user URI.
    if direct_status != StatusCode::BAD_REQUEST {
        return Err(classify_calendly_status_error(
            direct_status,
            "loading Calendly event types",
            &direct_text,
        ));
    }

    let user_resp = client
        .get("https://api.calendly.com/users/me")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await
        .map_err(|error| {
            CalendlyConfigError::new(
                "calendly_api_error",
                format!("Failed to reach Calendly while validating the token: {error}"),
            )
        })?;

    if !user_resp.status().is_success() {
        let status = user_resp.status();
        let text = user_resp.text().await.unwrap_or_default();
        return Err(classify_calendly_status_error(
            status,
            "loading the Calendly account",
            &text,
        ));
    }

    let user_data: CalendlyUserResponse = user_resp.json().await.map_err(|error| {
        CalendlyConfigError::new(
            "calendly_api_error",
            format!("Failed to parse the Calendly account response: {error}"),
        )
    })?;
    let user_uri = user_data.resource.uri;

    let et_resp = client
        .get("https://api.calendly.com/event_types")
        .query(&[("user", &user_uri)])
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()
        .await
        .map_err(|error| {
            CalendlyConfigError::new(
                "calendly_api_error",
                format!("Failed to reach Calendly while loading event types: {error}"),
            )
        })?;

    if !et_resp.status().is_success() {
        let status = et_resp.status();
        let text = et_resp.text().await.unwrap_or_default();
        return Err(classify_calendly_status_error(
            status,
            "loading Calendly event types",
            &text,
        ));
    }

    let et_data: CalendlyEventTypesResponse = et_resp.json().await.map_err(|error| {
        CalendlyConfigError::new(
            "calendly_api_error",
            format!("Failed to parse the Calendly event types response: {error}"),
        )
    })?;

    Ok(et_data.collection)
}

/// GET /api/calendly/settings
pub async fn get_agency_calendly_settings(
    State(state): State<AppState>,
    user: AuthUser,
) -> (StatusCode, Json<serde_json::Value>) {
    let access = match crate::billing::entitlements::require_agency_pro_access(
        &state,
        &user.id,
        "pro_plan_required_for_calendly",
    )
    .await
    {
        Ok(access) => access,
        Err((status, error)) => {
            return (status, Json(json!({ "status": "error", "error": error })));
        }
    };

    if !access.addon_irl_booking_enabled {
        return (
            StatusCode::FORBIDDEN,
            Json(json!({
                "status": "error",
                "error": "irl_booking_addon_required_for_calendly"
            })),
        );
    }

    match load_agency_calendly_settings(&state, &user.id).await {
        Ok(Some(settings)) => (
            StatusCode::OK,
            Json(json!({
                "status": "success",
                "data": build_serializable_calendly_settings(&user.id, &settings),
            })),
        ),
        Ok(None) => (
            StatusCode::OK,
            Json(json!({
                "status": "success",
                "data": build_serializable_calendly_settings(
                    &user.id,
                    &AgencyCalendlySettingsRecord::default(),
                ),
            })),
        ),
        Err(error) => {
            error!(
                agency_id = %user.id,
                error = %error.message,
                "Failed to fetch Calendly settings"
            );
            calendly_error_response(error)
        }
    }
}

/// POST /api/calendly/settings
pub async fn update_agency_calendly_settings(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<serde_json::Value>,
) -> (StatusCode, Json<serde_json::Value>) {
    let access = match crate::billing::entitlements::require_agency_pro_access(
        &state,
        &user.id,
        "pro_plan_required_for_calendly",
    )
    .await
    {
        Ok(access) => access,
        Err((status, error)) => {
            return (status, Json(json!({ "status": "error", "error": error })));
        }
    };

    if !access.addon_irl_booking_enabled {
        return (
            StatusCode::FORBIDDEN,
            Json(json!({
                "status": "error",
                "error": "irl_booking_addon_required_for_calendly"
            })),
        );
    }

    let existing_settings = match load_agency_calendly_settings(&state, &user.id).await {
        Ok(settings) => settings,
        Err(error) => return calendly_error_response(error),
    };

    let mut settings = normalize_agency_calendly_settings_payload(payload);
    let token_replaced = existing_settings
        .as_ref()
        .map(|existing| {
            !existing.calendly_api_token.is_empty()
                && !settings.calendly_api_token.is_empty()
                && existing.calendly_api_token != settings.calendly_api_token
        })
        .unwrap_or(false);

    if token_replaced {
        settings.mappings.clear();
    }

    if settings.is_enabled && settings.calendly_api_token.is_empty() {
        return calendly_error_response(CalendlyConfigError::new(
            "token_missing",
            "Save a Calendly personal access token before enabling the integration.",
        ));
    }

    if !settings.calendly_api_token.is_empty() {
        let mut slug_based_mappings = Vec::new();
        let mut invalid_uri_mappings = Vec::new();

        for (key, reference) in &settings.mappings {
            if is_calendly_event_type_uri(reference) {
                match fetch_calendly_event_type_by_reference(
                    &settings.calendly_api_token,
                    reference,
                )
                .await
                {
                    Ok(event_type) if event_type.active => {}
                    Ok(_) => invalid_uri_mappings.push(format!("{key} -> {reference} (inactive)")),
                    Err(error) => {
                        return calendly_error_response(CalendlyConfigError::new(
                            error.code,
                            format!(
                                "The saved Calendly mapping for booking type '{key}' could not be validated. {}",
                                error.message
                            ),
                        ))
                    }
                }
            } else {
                slug_based_mappings.push((key.clone(), reference.clone()));
            }
        }

        if !invalid_uri_mappings.is_empty() {
            return calendly_error_response(CalendlyConfigError::new(
                "mapping_invalid",
                format!(
                    "Some saved mappings do not point to an active Calendly event type: {}.",
                    invalid_uri_mappings.join(", ")
                ),
            ));
        }

        if !slug_based_mappings.is_empty() {
            match fetch_calendly_event_types_for_token(&settings.calendly_api_token).await {
                Ok(event_types) => {
                    let active_event_slugs = event_types
                        .iter()
                        .filter(|event_type| event_type.active)
                        .map(|event_type| event_type.slug.as_str())
                        .collect::<Vec<_>>();

                    let invalid_mappings = slug_based_mappings
                        .iter()
                        .filter(|(_, slug)| !active_event_slugs.iter().any(|active| active == slug))
                        .map(|(key, slug)| format!("{key} -> {slug}"))
                        .collect::<Vec<_>>();

                    if !invalid_mappings.is_empty() {
                        return calendly_error_response(CalendlyConfigError::new(
                            "mapping_invalid",
                            format!(
                                "Some saved mappings do not match an active Calendly event type: {}.",
                                invalid_mappings.join(", ")
                            ),
                        ));
                    }
                }
                Err(error) => {
                    if settings.mappings.is_empty() {
                        info!(
                            agency_id = %user.id,
                            error = %error.message,
                            "Skipping Calendly event type discovery during save because no mappings were provided"
                        );
                    } else {
                        return calendly_error_response(CalendlyConfigError::new(
                            error.code,
                            format!(
                                "{} Save event type URIs instead of slugs if you want to keep using a minimal-scope Calendly token.",
                                error.message
                            ),
                        ));
                    }
                }
            }
        }
    }

    let mut insert_payload = build_serializable_calendly_settings(&user.id, &settings);
    insert_payload["updated_at"] = json!(chrono::Utc::now().to_rfc3339());

    let resp = state
        .pg
        .from("agency_calendly_settings")
        .upsert(insert_payload.to_string())
        .on_conflict("agency_id")
        .execute()
        .await;

    match resp {
        Ok(r) if r.status().is_success() => (
            StatusCode::OK,
            Json(json!({
                "status": "success",
                "message": if token_replaced {
                    "Calendly token updated. Previous event type mappings were cleared so you can remap this account cleanly."
                } else {
                    "Calendly settings saved."
                },
                "data": build_serializable_calendly_settings(&user.id, &settings),
            })),
        ),
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
    let access = match crate::billing::entitlements::require_agency_pro_access(
        &state,
        &user.id,
        "pro_plan_required_for_calendly",
    )
    .await
    {
        Ok(access) => access,
        Err((status, error)) => {
            return (status, Json(json!({ "status": "error", "error": error })));
        }
    };

    if !access.addon_irl_booking_enabled {
        return (
            StatusCode::FORBIDDEN,
            Json(json!({
                "status": "error",
                "error": "irl_booking_addon_required_for_calendly"
            })),
        );
    }

    let settings = match load_agency_calendly_settings(&state, &user.id).await {
        Ok(Some(settings)) => settings,
        Ok(None) => {
            return calendly_error_response(CalendlyConfigError::new(
                "token_missing",
                "Save a Calendly personal access token first to load your event types.",
            ))
        }
        Err(error) => return calendly_error_response(error),
    };

    if settings.calendly_api_token.is_empty() {
        return calendly_error_response(CalendlyConfigError::new(
            "token_missing",
            "Save a Calendly personal access token first to load your event types.",
        ));
    }

    match fetch_calendly_event_types_for_token(&settings.calendly_api_token).await {
        Ok(collection) => (
            StatusCode::OK,
            Json(json!({
                "status": "success",
                "data": collection
                    .into_iter()
                    .filter(|event_type| event_type.active)
                    .collect::<Vec<_>>(),
            })),
        ),
        Err(error) => calendly_error_response(error),
    }
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
struct CalendlyEventTypeResponse {
    resource: CalendlyEventType,
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
        if let Ok(Some(settings)) = load_agency_calendly_settings(state, aid).await {
            let has_agency_calendly_config = !settings.calendly_api_token.is_empty();

            if settings.is_enabled || has_agency_calendly_config {
                if !settings.calendly_api_token.is_empty() {
                    token = settings.calendly_api_token;
                }

                if let Some(default_slug) = settings.mappings.get("default") {
                    target_slug_final = Some(default_slug.clone());
                }
            } else if agency_id.is_some() {
                return Err(
                    "Calendly is not configured for this agency. Save a Calendly token and event type in Agency Settings > Integrations."
                        .to_string(),
                );
            }
        }
    }

    if token.is_empty() {
        return Err("Calendly API token not configured".to_string());
    }

    // Determine the target slug:
    let target_reference = if let Some(s) = target_slug_final {
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

    info!(target_reference = %target_reference, "Resolving Calendly event type");

    let client = reqwest::Client::new();
    let event_type = if is_calendly_event_type_uri(&target_reference) {
        let event_type = fetch_calendly_event_type_by_reference(&token, &target_reference)
            .await
            .map_err(|error| error.message)?;
        if !event_type.active {
            return Err(
                "The configured Calendly event type is not active in Calendly.".to_string(),
            );
        }
        event_type
    } else {
        let active_event_types: Vec<CalendlyEventType> =
            fetch_calendly_event_types_for_token(&token)
                .await
                .map_err(|error| error.message)?
                .into_iter()
                .filter(|et| et.active)
                .collect();

        let available_slugs: Vec<&str> = active_event_types
            .iter()
            .map(|et| et.slug.as_str())
            .collect();
        info!(available_slugs = ?available_slugs, requested_slug = %target_reference, "Resolving Calendly event type by slug");

        active_event_types
            .into_iter()
            .find(|et| et.slug == target_reference)
            .ok_or_else(|| {
                format!(
                    "The configured Calendly event type '{target_reference}' is not active in Calendly."
                )
            })?
    };

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
        if status == StatusCode::UNAUTHORIZED || status == StatusCode::FORBIDDEN {
            let parsed_response = serde_json::from_str::<serde_json::Value>(&text).ok();
            if let Some(scope_message) = build_calendly_scope_error_message(
                "creating the Calendly invitee",
                parsed_response.as_ref(),
            ) {
                return Err(scope_message);
            }
        }
        if status == StatusCode::BAD_REQUEST || status == StatusCode::UNPROCESSABLE_ENTITY {
            return Err(build_calendly_invitee_request_error(status, &text));
        }
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

    #[test]
    fn test_normalize_calendly_mappings_keeps_supported_keys_only() {
        let raw = json!({
            "default": "agency-general",
            "photo_shoot": "legacy-unsupported",
            "casting": "casting-call",
            "empty": "",
        });

        let normalized = normalize_calendly_mappings(Some(&raw));

        assert_eq!(
            normalized.get("default").and_then(|v| v.as_str()),
            Some("agency-general")
        );
        assert!(!normalized.contains_key("confirmed"));
        assert!(!normalized.contains_key("casting"));
        assert!(!normalized.contains_key("photo_shoot"));
        assert!(!normalized.contains_key("empty"));
    }

    #[test]
    fn test_normalize_calendly_mappings_canonicalizes_event_type_uris() {
        let raw = json!({
            "default": " https://api.calendly.com/event_types/34laa5ff-72b5-4305-865d-1e378749d04e. ",
            "confirmed": "https://calendly.com/api/v2/event_types/34laa5ff-72b5-4305-865d-1e378749d04e",
        });

        let normalized = normalize_calendly_mappings(Some(&raw));

        assert_eq!(
            normalized.get("default").and_then(|v| v.as_str()),
            Some("https://api.calendly.com/event_types/34laa5ff-72b5-4305-865d-1e378749d04e")
        );
        assert!(!normalized.contains_key("confirmed"));
    }
}
