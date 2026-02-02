use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use serde_json::json;

use crate::{
    auth::AuthUser,
    config::AppState,
    email,
    email_templates::{load_active_email_template, render_placeholders},
};

#[derive(Deserialize)]
pub struct BookingCreatedEmailRequest {
    pub booking_id: String,
}

#[derive(Deserialize)]
pub struct ListBookingNotificationsQuery {
    pub limit: Option<u32>,
}

pub async fn list_booking_notifications(
    State(state): State<AppState>,
    user: AuthUser,
    Query(q): Query<ListBookingNotificationsQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let limit = q.limit.unwrap_or(50).min(200);

    let resp = state
        .pg
        .from("booking_notifications")
        .select(
            "id,booking_id,channel,recipient_type,to_email,subject,message,meta_json,created_at",
        )
        .eq("agency_user_id", &user.id)
        .order("created_at.desc")
        .limit(limit as usize)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        let code =
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err((code, text));
    }
    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
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
        .select("id,agency_user_id,client_name,talent_name,talent_id,date,call_time,wrap_time,location,rate_cents,rate_type")
        .eq("id", &payload.booking_id)
        .eq("agency_user_id", &user.id)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !resp.status().is_success() {
        let txt = resp.text().await.unwrap_or_default();
        return Err((StatusCode::NOT_FOUND, txt));
    }
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
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
                                                    to_email = v2
                                                        .get("email")
                                                        .and_then(|x| x.as_str())
                                                        .map(|s| s.to_string());
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
                                to_email = v
                                    .get("email")
                                    .and_then(|x| x.as_str())
                                    .map(|s| s.to_string());
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
                        to_email = first
                            .get("email")
                            .and_then(|x| x.as_str())
                            .map(|s| s.to_string());
                    }
                }
            }
        }
    }
    let dest = to_email.ok_or((
        StatusCode::BAD_REQUEST,
        "talent_email_not_found".to_string(),
    ))?;

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
                    agency_email = v
                        .get("email")
                        .and_then(|x| x.as_str())
                        .map(|s| s.to_string());
                    agency_name = v
                        .get("agency_name")
                        .and_then(|x| x.as_str())
                        .map(|s| s.to_string());
                }
            }
        }
    }

    let vars: Vec<(&str, String)> = vec![
        ("talent_name", talent_name.to_string()),
        ("client_name", client_name.to_string()),
        ("booking_date", date_str.to_string()),
        ("call_time", call_time.to_string()),
        ("location", location.to_string()),
        ("rate", rate_str.clone()),
        (
            "agency_name",
            agency_name.clone().unwrap_or_else(|| "".to_string()),
        ),
    ];

    let (subject, body) = match load_active_email_template(&state, &user.id, "booking_confirmation")
        .await
    {
        Ok(Some(tpl)) => (
            render_placeholders(&tpl.subject, &vars),
            render_placeholders(&tpl.body, &vars),
        ),
        _ => (fallback_subject, fallback_body),
    };

    let send_res = email::send_plain_text_email(
        &state,
        &dest,
        &subject,
        &body,
        agency_email.as_deref(),
    );

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

    match send_res {
        Ok(_) => Ok(Json(json!({"status":"ok"}))),
        Err(code) => Err((StatusCode::BAD_GATEWAY, code.to_string())),
    }
}
