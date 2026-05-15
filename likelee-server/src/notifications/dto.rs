use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use serde_json::json;
use tracing::{info, warn};

use crate::{
    auth::AuthUser,
    bookings::calendly,
    state::AppState,
    email,
    email::templates::{load_active_email_template, render_placeholders},
};

use super::*;

#[derive(Deserialize)]
pub struct BookingCreatedEmailRequest {
    pub booking_id: String,
}


#[derive(Deserialize)]
pub struct ListBookingNotificationsQuery {
    pub limit: Option<u32>,
}


pub async fn booking_created_email(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<BookingCreatedEmailRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // Fetch booking row scoped to agency user
    let resp = state
        .pg
        .from("bookings")
        .select("id,agency_user_id,client_name,client_id,talent_name,talent_id,date,call_time,wrap_time,location,rate_cents,rate_type,notify_email,notify_calendar,type")
        .eq("id", &payload.booking_id)
        .eq("agency_user_id", &user.id)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !status.is_success() {
        return Err(crate::errors::sanitize_db_error(status.as_u16(), text));
    }

    let b: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let client_name = b
        .get("client_name")
        .and_then(|v| v.as_str())
        .unwrap_or("Client");
    let talent_name = b
        .get("talent_name")
        .and_then(|v| v.as_str())
        .unwrap_or("Talent");
    let talent_id_opt = b.get("talent_id").and_then(|v| v.as_str());
    let date_str = b.get("date").and_then(|v| v.as_str()).unwrap_or("");
    let call_time = b.get("call_time").and_then(|v| v.as_str()).unwrap_or("");
    let wrap_time = b.get("wrap_time").and_then(|v| v.as_str()).unwrap_or("");
    let location = b.get("location").and_then(|v| v.as_str()).unwrap_or("");
    let rate_cents = b.get("rate_cents").and_then(|v| v.as_i64()).unwrap_or(0);
    let rate_type = b.get("rate_type").and_then(|v| v.as_str()).unwrap_or("");
    let notify_calendar = b
        .get("notify_calendar")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let booking_type = b.get("type").and_then(|v| v.as_str()).unwrap_or("");
    let client_id_opt = b.get("client_id").and_then(|v| v.as_str());

    // Check notification preferences
    let effective_agency_id = user.effective_org_id();
    let preference_enabled = is_notification_enabled(
        &state,
        effective_agency_id,
        "booking_confirmation",
        "email",
        talent_id_opt,
    )
    .await;

    if !preference_enabled {
        info!(
            booking_id = %payload.booking_id,
            agency_id = %effective_agency_id,
            "Email notification skipped due to agency/athlete preferences"
        );
        return Ok(Json(json!({
            "status": "skipped",
            "message": "Email notification disabled by preference"
        })));
    }

    // Defaults (fallback if no active template)
    let fallback_subject = format!("New Booking: {} on {}", client_name, date_str);
    let mut lines: Vec<String> = vec![];
    lines.push(format!("Hi {},", talent_name));
    lines.push(String::new());
    lines.push("You have a new confirmed booking:".into());
    lines.push(String::new());
    lines.push(format!("Client: {}", client_name));
    if !date_str.is_empty() {
        lines.push(format!("Date: {}", date_str));
    }
    if !call_time.is_empty() {
        lines.push(format!("Call Time: {}", call_time));
    }
    if !wrap_time.is_empty() {
        lines.push(format!("Wrap Time: {}", wrap_time));
    }
    if !location.is_empty() {
        lines.push(format!("Location: {}", location));
    }
    let rate_str = if rate_cents > 0 {
        let dollars = (rate_cents as f64) / 100.0;
        if !rate_type.is_empty() {
            format!("${:.2} {}", dollars, rate_type)
        } else {
            format!("${:.2}", dollars)
        }
    } else {
        String::new()
    };
    if !rate_str.is_empty() {
        lines.push(format!("Rate: {}", rate_str));
    }
    let fallback_body = lines.join("\n");

    // Resolve destination: talent email from DB
    // Try creators by id, else fallback by agency_users -> creator_id chain, else by full name match (best-effort)
    let mut to_email: Option<String> = None;
    if let Some(talent_id) = talent_id_opt {
        if !talent_id.is_empty() {
            if let Ok(resp) = state
                .pg
                .from("creators")
                .select("email")
                .eq("id", talent_id)
                .single()
                .execute()
                .await
            {
                if resp.status().is_success() {
                    if let Ok(txt) = resp.text().await {
                        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&txt) {
                            to_email = v
                                .get("email")
                                .and_then(|x| x.as_str())
                                .map(|s| s.to_string());
                        }
                    }
                }
            }
            // If not found in creators by id, try resolving via agency_users -> creator_id
            if to_email.is_none() {
                if let Ok(resp) = state
                    .pg
                    .from("agency_users")
                    .select("creator_id")
                    .eq("id", talent_id)
                    .single()
                    .execute()
                    .await
                {
                    if resp.status().is_success() {
                        if let Ok(txt) = resp.text().await {
                            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&txt) {
                                if let Some(cid) = v.get("creator_id").and_then(|x| x.as_str()) {
                                    if let Ok(resp2) = state
                                        .pg
                                        .from("creators")
                                        .select("email")
                                        .eq("id", cid)
                                        .single()
                                        .execute()
                                        .await
                                    {
                                        if resp2.status().is_success() {
                                            if let Ok(txt2) = resp2.text().await {
                                                if let Ok(v2) =
                                                    serde_json::from_str::<serde_json::Value>(&txt2)
                                                {
                                                    to_email = non_empty_string(
                                                        v2.get("email").and_then(|x| x.as_str()),
                                                    );
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // If still not found, fallback to agency_users.email (some deployments store talent emails there)
            if to_email.is_none() {
                if let Ok(resp) = state
                    .pg
                    .from("agency_users")
                    .select("email")
                    .eq("id", talent_id)
                    .single()
                    .execute()
                    .await
                {
                    if resp.status().is_success() {
                        if let Ok(txt) = resp.text().await {
                            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&txt) {
                                to_email =
                                    non_empty_string(v.get("email").and_then(|x| x.as_str()));
                            }
                        }
                    }
                }
            }
        }
    }
    if to_email.is_none() {
        if let Ok(resp) = state
            .pg
            .from("creators")
            .select("email,full_name")
            .ilike("full_name", talent_name)
            .limit(1)
            .execute()
            .await
        {
            if let Ok(txt) = resp.text().await {
                if let Ok(arr) = serde_json::from_str::<serde_json::Value>(&txt) {
                    if let Some(first) = arr.as_array().and_then(|a| a.first()) {
                        to_email = non_empty_string(first.get("email").and_then(|x| x.as_str()));
                    }
                }
            }
        }
    }
    let dest = to_email.ok_or((
        StatusCode::BAD_REQUEST,
        "talent_email_not_found".to_string(),
    ))?;

    // Best-effort: resolve talent auth user id for in-app inbox
    let mut talent_user_id: Option<String> = None;
    if let Some(talent_id) = talent_id_opt {
        if !talent_id.is_empty() {
            // If the booking.talent_id is an agency_users.id, resolve to agency_users.user_id or creator_id
            if let Ok(resp) = state
                .pg
                .from("agency_users")
                .select("user_id,creator_id")
                .eq("id", talent_id)
                .single()
                .execute()
                .await
            {
                if resp.status().is_success() {
                    if let Ok(txt) = resp.text().await {
                        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&txt) {
                            talent_user_id = v
                                .get("user_id")
                                .and_then(|x| x.as_str())
                                .map(|s| s.to_string())
                                .or_else(|| {
                                    v.get("creator_id")
                                        .and_then(|x| x.as_str())
                                        .map(|s| s.to_string())
                                });
                        }
                    }
                }
            }
            // Fallback: assume talent_id itself is an auth user id
            if talent_user_id.is_none() {
                talent_user_id = Some(talent_id.to_string());
            }
        }
    }

    // Best-effort: agency label for inbox
    let mut from_label: Option<String> = None;
    if let Ok(resp) = state
        .pg
        .from("agencies")
        .select("agency_name")
        .eq("id", &user.id)
        .single()
        .execute()
        .await
    {
        if resp.status().is_success() {
            if let Ok(txt) = resp.text().await {
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(&txt) {
                    from_label = v
                        .get("agency_name")
                        .and_then(|x| x.as_str())
                        .map(|s| s.to_string());
                }
            }
        }
    }

    // Resolve agency email to use as Reply-To if available
    let mut agency_email: Option<String> = None;
    let mut agency_name: Option<String> = None;
    if let Ok(resp) = state
        .pg
        .from("agencies")
        .select("email,agency_name")
        .eq("id", &user.id)
        .single()
        .execute()
        .await
    {
        if resp.status().is_success() {
            if let Ok(txt) = resp.text().await {
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(&txt) {
                    agency_email = non_empty_string(v.get("email").and_then(|x| x.as_str()));
                    agency_name = non_empty_string(v.get("agency_name").and_then(|x| x.as_str()));
                }
            }
        }
    }

    // Schedule Calendly meeting if requested — register client email so Calendly sends reminders
    if notify_calendar {
        // Fetch client email for Calendly registration (so the client gets reminders)
        let mut client_email: Option<String> = None;
        let mut client_contact_name = client_name.to_string();
        if let Some(cid) = client_id_opt {
            if let Ok(resp) = state
                .pg
                .from("agency_clients")
                .select("email,contact_name")
                .eq("id", cid)
                .single()
                .execute()
                .await
            {
                if resp.status().is_success() {
                    if let Ok(txt) = resp.text().await {
                        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&txt) {
                            if let Some(email) =
                                non_empty_string(v.get("email").and_then(|x| x.as_str()))
                            {
                                client_email = Some(email);
                            }
                            if let Some(contact_name) =
                                non_empty_string(v.get("contact_name").and_then(|x| x.as_str()))
                            {
                                client_contact_name = contact_name;
                            }
                        }
                    }
                }
            }
        }

        // Fetch agency timezone for Calendly
        let mut agency_timezone = "UTC".to_string();
        if let Ok(resp) = state
            .pg
            .from("agencies")
            .select("time_zone")
            .eq("id", &user.id)
            .single()
            .execute()
            .await
        {
            if resp.status().is_success() {
                if let Ok(txt) = resp.text().await {
                    if let Ok(v) = serde_json::from_str::<serde_json::Value>(&txt) {
                        if let Some(tz) = v.get("time_zone").and_then(|x| x.as_str()) {
                            agency_timezone = tz.to_string();
                        }
                    }
                }
            }
        }

        // Parse start time (date + call_time)
        // date is YYYY-MM-DD, call_time is HH:MM
        let start_time_str = if call_time.is_empty() {
            format!("{}T09:00:00Z", date_str)
        } else {
            format!("{}T{}:00Z", date_str, call_time)
        };

        if let Ok(start_dt) = chrono::DateTime::parse_from_rfc3339(&start_time_str) {
            let start_utc = start_dt.with_timezone(&chrono::Utc);
            if start_utc <= chrono::Utc::now() {
                warn!(
                    booking_id = %payload.booking_id,
                    start_time = %start_utc,
                    error = "Calendly invitee registration skipped because the booking start time is in the past. Calendly invites can only be created for future bookings.",
                    error_category = "timing",
                    "Calendly invitee registration skipped"
                );
                return Ok(Json(json!({
                    "status": "ok",
                    "queued": true,
                    "sent_to": dest,
                })));
            }

            // Use the client email for Calendly (so they receive the invite + reminders)
            // Fall back to talent email if client email is unavailable
            let calendly_email = client_email
                .or_else(|| non_empty_string(Some(dest.as_str())))
                .unwrap_or_default();
            if calendly_email.is_empty() {
                warn!(
                    error = "Calendly invitee registration skipped because neither the client nor the talent has a valid email address on file.",
                    error_category = "recipient",
                    "Calendly invitee registration skipped"
                );
                return Ok(Json(json!({
                    "status": "ok",
                    "queued": true,
                    "sent_to": dest,
                })));
            }

            let state_clone = state.clone();
            let booking_type_clone = if booking_type.is_empty() {
                None
            } else {
                Some(booking_type.to_string())
            };
            let location_clone = if location.is_empty() {
                None
            } else {
                Some(location.to_string())
            };
            let agency_name_clone = agency_name.clone();

            let agency_id_clone = Some(user.id.to_string());

            tokio::spawn(async move {
                match calendly::schedule_calendly_invitee(
                    &state_clone,
                    &calendly_email,
                    &client_contact_name,
                    start_utc,
                    &agency_timezone,
                    booking_type_clone.as_deref(),
                    location_clone.as_deref(),
                    agency_name_clone.as_deref(),
                    agency_id_clone.as_deref(),
                )
                .await
                {
                    Ok(uri) => {
                        info!(invitee_uri = %uri, invitee_email = %calendly_email, "Calendly invitee registered — reminders will be sent")
                    }
                    Err(e) => {
                        warn!(
                            error = %e,
                            error_category = classify_calendly_failure(&e),
                            "Calendly invitee registration skipped"
                        )
                    }
                }
            });
        }
    }

    let vars: Vec<(&str, String)> = vec![
        ("talent_name", talent_name.to_string()),
        ("client_name", client_name.to_string()),
        ("booking_date", date_str.to_string()),
        ("call_time", call_time.to_string()),
        ("location", location.to_string()),
        ("rate", rate_str.clone()),
        ("agency_name", agency_name.clone().unwrap_or_default()),
    ];

    let (subject, body) =
        match load_active_email_template(&state, &user.id, "booking_confirmation").await {
            Ok(Some(tpl)) => (
                render_placeholders(&tpl.subject, &vars),
                render_placeholders(&tpl.body, &vars),
            ),
            _ => (fallback_subject, fallback_body),
        };

    // Persist to in-app inbox (best-effort)
    if let Some(tuid) = talent_user_id.clone() {
        let insert = json!({
            "talent_user_id": tuid,
            "agency_id": user.id,
            "channel": "email",
            "from_label": from_label,
            "subject": subject,
            "message": body,
            "meta_json": json!({"booking_id": payload.booking_id}),
        });
        let _ = state
            .pg
            .from("talent_notifications")
            .insert(insert.to_string())
            .execute()
            .await;
    }

    if preference_enabled {
        let send_res =
            email::send_plain_text_email(&state, &dest, &subject, &body, agency_email.as_deref());

        // Log notification regardless of SMTP result (status success/error)
        let status_ok = send_res.is_ok();
        let insert = json!({
            "agency_user_id": user.id,
            "booking_id": payload.booking_id,
            "channel": "email",
            "recipient_type": "talent",
            "to_email": dest,
            "subject": subject,
            "message": body,
            "meta_json": json!({"smtp_status": if status_ok {"ok"} else {"error"}}),
        });
        let _ = state
            .pg
            .from("booking_notifications")
            .insert(insert.to_string())
            .execute()
            .await;

        return match send_res {
            Ok(_) => Ok(Json(json!({"status":"ok"}))),
            Err((code, msg)) => Err((
                StatusCode::BAD_GATEWAY,
                format!("email_send_failed upstream_status={} message={}", code, msg),
            )),
        };
    }

    Ok(Json(json!({"status":"toggle_off_skipped"})))
}


pub struct BrandNotificationRequest<'a> {
    pub brand_id: &'a str,
    pub agency_id: Option<&'a str>,
    pub pref_key: &'a str,
    pub subject: &'a str,
    pub message: &'a str,
    pub meta_json: serde_json::Value,
    pub notify_email: bool,
}


