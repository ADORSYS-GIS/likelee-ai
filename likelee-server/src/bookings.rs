use crate::{auth::AuthUser, config::AppState};
use axum::{extract::{Path, Query, State}, http::StatusCode, Json};
use axum::extract::Multipart;
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Debug, Deserialize, Serialize)]
pub struct CreateBookingPayload {
    pub booking_type: Option<String>,
    pub status: Option<String>,
    pub client_id: Option<String>,
    pub talent_id: Option<String>,
    pub talent_name: Option<String>,
    pub client_name: Option<String>,
    pub date: String,
    pub all_day: Option<bool>,
    pub call_time: Option<String>, // HH:MM
    pub wrap_time: Option<String>,
    pub location: Option<String>,
    pub location_notes: Option<String>,
    pub rate_cents: Option<i32>,
    pub currency: Option<String>,
    pub rate_type: Option<String>,
    pub usage_terms: Option<String>,
    pub usage_duration: Option<String>,
    pub exclusive: Option<bool>,
    pub notes: Option<String>,
    pub industries: Option<Vec<String>>, // text[]
    // Notifications
    pub notify_email: Option<bool>,
    pub notify_sms: Option<bool>,
    pub notify_push: Option<bool>,
    pub notify_calendar: Option<bool>,
}

// Create a booking and attach uploaded files (multipart):
// - part "data": JSON body matching CreateBookingPayload
// - parts named "files": zero or more files
pub async fn create_with_files(
    State(state): State<AppState>,
    user: AuthUser,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let mut payload: Option<CreateBookingPayload> = None;
    let mut files: Vec<(String, Vec<u8>)> = Vec::new();

    // Parse multipart parts
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?
    {
        let name = field.name().map(|s| s.to_string());
        match name.as_deref() {
            Some("data") => {
                let txt = field
                    .text()
                    .await
                    .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
                let p: CreateBookingPayload = serde_json::from_str(&txt)
                    .map_err(|e| (StatusCode::BAD_REQUEST, format!("invalid data json: {}", e)))?;
                payload = Some(p);
            }
            Some("files") | Some("file") => {
                let fname = field.file_name().map(|s| s.to_string()).unwrap_or_else(|| "upload.bin".to_string());
                let data = field
                    .bytes()
                    .await
                    .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
                files.push((fname, data.to_vec()));
            }
            _ => {}
        }
    }

    let payload = payload.ok_or((StatusCode::BAD_REQUEST, "missing data part".to_string()))?;

    // Reuse create logic: normalize times
    let is_all_day = payload.all_day.unwrap_or(false);
    let (call_time, wrap_time) = if is_all_day {
        (Some("00:00".to_string()), Some("23:59".to_string()))
    } else {
        (payload.call_time.clone(), payload.wrap_time.clone())
    };

    // Validate: if talent is booked out on this date, block the booking
    if let (Some(tid), date) = (payload.talent_id.as_ref(), &payload.date) {
        // Overlap when date is within [start_date, end_date]
        let resp = state
            .pg
            .from("book_outs")
            .select("id")
            .eq("agency_user_id", &user.id)
            .eq("talent_id", tid)
            .lte("start_date", date)
            .gte("end_date", date)
            .limit(1)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let text = resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let rows: serde_json::Value = serde_json::from_str(&text)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if rows.as_array().map(|a| !a.is_empty()).unwrap_or(false) {
            return Err((StatusCode::CONFLICT, "Talent is unavailable during the selected date".to_string()));
        }
    }

    let row = json!({
        "agency_user_id": user.id,
        "client_id": payload.client_id,
        "talent_id": payload.talent_id,
        "talent_name": payload.talent_name,
        "client_name": payload.client_name,
        "date": payload.date,
        "all_day": is_all_day,
        "call_time": call_time,
        "wrap_time": wrap_time,
        "location": payload.location,
        "location_notes": payload.location_notes,
        "rate_cents": payload.rate_cents,
        "currency": payload.currency.unwrap_or_else(|| "USD".to_string()),
        "rate_type": payload.rate_type,
        "usage_terms": payload.usage_terms,
        "usage_duration": payload.usage_duration,
        "exclusive": payload.exclusive.unwrap_or(false),
        "type": payload.booking_type.unwrap_or_else(|| "confirmed".to_string()),
        "status": payload.status.unwrap_or_else(|| "pending".to_string()),
        "notes": payload.notes,
        "industries": payload.industries,
        "notify_email": payload.notify_email.unwrap_or(true),
        "notify_sms": payload.notify_sms.unwrap_or(false),
        "notify_push": payload.notify_push.unwrap_or(false),
        "notify_calendar": payload.notify_calendar.unwrap_or(true),
    });

    // Insert booking and return generated id
    let resp = state
        .pg
        .from("bookings")
        .insert(row.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        let code = StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err((code, text));
    }
    let created: Vec<serde_json::Value> = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let booking = created.get(0).and_then(|v| v.as_object()).ok_or((StatusCode::INTERNAL_SERVER_ERROR, "create returned empty".to_string()))?;
    let booking_id = booking.get("id").and_then(|v| v.as_str()).ok_or((StatusCode::INTERNAL_SERVER_ERROR, "missing booking id".to_string()))?.to_string();

    // Upload files and insert booking_files rows
    let http = reqwest::Client::new();
    let bucket = state.supabase_bucket_private.clone();
    let mut uploaded: Vec<serde_json::Value> = Vec::new();
    for (fname, data) in files.into_iter() {
        let sanitized = fname
            .chars()
            .map(|c| if c.is_ascii_alphanumeric() || c == '.' || c == '_' || c == '-' { c } else { '_' })
            .collect::<String>();
        let path = format!(
            "agencies/{}/bookings/{}/files/{}_{}",
            user.id,
            booking_id,
            chrono::Utc::now().timestamp_millis(),
            sanitized
        );
        let storage_url = format!(
            "{}/storage/v1/object/{}/{}",
            state.supabase_url, bucket, path
        );
        let up = http
            .post(&storage_url)
            .header("Authorization", format!("Bearer {}", state.supabase_service_key))
            .header("apikey", state.supabase_service_key.clone())
            .body(data)
            .send()
            .await
            .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
        if !up.status().is_success() {
            let msg = up.text().await.unwrap_or_default();
            return Err((StatusCode::BAD_GATEWAY, format!("storage upload failed: {}", msg)));
        }

        let rec_body = json!({
            "booking_id": booking_id,
            "file_name": fname,
            "storage_bucket": bucket,
            "storage_path": path,
            "public_url": null,
        });
        let ins = state
            .pg
            .from("booking_files")
            .insert(rec_body.to_string())
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let txt = ins.text().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let arr: Vec<serde_json::Value> = serde_json::from_str(&txt).unwrap_or_default();
        if let Some(v) = arr.get(0) { uploaded.push(v.clone()); }
    }

    // Return booking + files summary
    let mut out = serde_json::Map::new();
    for (k, v) in booking.iter() { out.insert(k.clone(), v.clone()); }
    out.insert("files".to_string(), serde_json::Value::Array(uploaded));
    Ok(Json(serde_json::Value::Object(out)))
}
#[derive(Debug, Deserialize)]
pub struct ListParams {
    pub date_start: Option<String>,
    pub date_end: Option<String>,
}

pub async fn create(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<CreateBookingPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // Enforce full-day booking times if all_day=true
    let is_all_day = payload.all_day.unwrap_or(false);
    let (call_time, wrap_time) = if is_all_day {
        (Some("00:00".to_string()), Some("23:59".to_string()))
    } else {
        (payload.call_time.clone(), payload.wrap_time.clone())
    };

    // Validate: if talent is booked out on this date, block the booking
    if let (Some(tid), date) = (payload.talent_id.as_ref(), &payload.date) {
        let resp = state
            .pg
            .from("book_outs")
            .select("id")
            .eq("agency_user_id", &user.id)
            .eq("talent_id", tid)
            .lte("start_date", date)
            .gte("end_date", date)
            .limit(1)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let text = resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let rows: serde_json::Value = serde_json::from_str(&text)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if rows.as_array().map(|a| !a.is_empty()).unwrap_or(false) {
            return Err((StatusCode::CONFLICT, "Talent is unavailable during the selected date".to_string()));
        }
    }

    // Compose row
    let row = json!({
        "agency_user_id": user.id,
        "client_id": payload.client_id,
        "talent_id": payload.talent_id,
        "talent_name": payload.talent_name,
        "client_name": payload.client_name,
        "date": payload.date,
        "all_day": is_all_day,
        "call_time": call_time,
        "wrap_time": wrap_time,
        "location": payload.location,
        "location_notes": payload.location_notes,
        "rate_cents": payload.rate_cents,
        "currency": payload.currency.unwrap_or_else(|| "USD".to_string()),
        "rate_type": payload.rate_type,
        "usage_terms": payload.usage_terms,
        "usage_duration": payload.usage_duration,
        "exclusive": payload.exclusive.unwrap_or(false),
        "type": payload.booking_type.unwrap_or_else(|| "confirmed".to_string()),
        "status": payload.status.unwrap_or_else(|| "pending".to_string()),
        "notes": payload.notes,
        "industries": payload.industries,
    });

    let resp = state
        .pg
        .from("bookings")
        .insert(row.to_string())
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

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct BookingFileUploadResponse {
    pub id: String,
    pub file_name: String,
    pub public_url: Option<String>,
    pub storage_bucket: String,
    pub storage_path: String,
}

// Upload a file and attach it to a specific booking
pub async fn upload_booking_file(
    State(state): State<AppState>,
    user: AuthUser,
    Path(booking_id): Path<String>,
    mut multipart: Multipart,
) -> Result<Json<BookingFileUploadResponse>, (StatusCode, String)> {
    // Expect a single part named "file"
    let mut file_name = None;
    let mut bytes: Vec<u8> = vec![];
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?
    {
        let name = field.name().map(|s| s.to_string());
        if name.as_deref() == Some("file") {
            file_name = field.file_name().map(|s| s.to_string());
            let data = field
                .bytes()
                .await
                .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
            bytes = data.to_vec();
            break;
        }
    }
    if bytes.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "missing file".into()));
    }
    let fname = file_name.unwrap_or_else(|| "upload.bin".to_string());
    let sanitized = fname
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '.' || c == '_' || c == '-' { c } else { '_' })
        .collect::<String>();

    // Storage target (private bucket)
    let bucket = state.supabase_bucket_private.clone();
    let path = format!(
        "agencies/{}/bookings/{}/files/{}_{}",
        user.id,
        booking_id,
        chrono::Utc::now().timestamp_millis(),
        sanitized
    );

    // Upload to Supabase Storage using service key
    let storage_url = format!(
        "{}/storage/v1/object/{}/{}",
        state.supabase_url, bucket, path
    );
    let http = reqwest::Client::new();
    let up = http
        .post(&storage_url)
        .header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        )
        .header("apikey", state.supabase_service_key.clone())
        .body(bytes)
        .send()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    if !up.status().is_success() {
        let msg = up.text().await.unwrap_or_default();
        return Err((StatusCode::BAD_GATEWAY, format!("storage upload failed: {msg}")));
    }

    // No public URL for private bucket
    let public_url = None;

    // Insert row into booking_files
    let insert = serde_json::json!({
        "booking_id": booking_id,
        "file_name": fname,
        "storage_bucket": bucket,
        "storage_path": path,
        "public_url": public_url,
    });
    let resp = state
        .pg
        .from("booking_files")
        .insert(insert.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let txt = resp.text().await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let arr: Vec<serde_json::Value> = serde_json::from_str(&txt).unwrap_or_default();
    let rec = arr.get(0).cloned().unwrap_or(serde_json::json!({"id": ""}));
    let id = rec.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();

    Ok(Json(BookingFileUploadResponse {
        id,
        file_name: fname,
        public_url,
        storage_bucket: bucket,
        storage_path: path,
    }))
}

pub async fn list(
    State(state): State<AppState>,
    user: AuthUser,
    Query(params): Query<ListParams>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let req = state
        .pg
        .from("bookings")
        .select("*")
        .eq("agency_user_id", &user.id);
    let req = if let Some(ds) = params.date_start.as_ref() {
        req.gte("date", ds)
    } else {
        req
    };
    let req = if let Some(de) = params.date_end.as_ref() {
        req.lte("date", de)
    } else {
        req
    };
    let resp = req
        .order("date.desc")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}

#[derive(Debug, Deserialize, Serialize)]
pub struct UpdateBookingPayload {
    pub booking_type: Option<String>,
    pub status: Option<String>,
    pub client_id: Option<String>,
    pub date: Option<String>,
    pub all_day: Option<bool>,
    pub call_time: Option<String>,
    pub wrap_time: Option<String>,
    pub location: Option<String>,
    pub location_notes: Option<String>,
    pub rate_cents: Option<i32>,
    pub currency: Option<String>,
    pub rate_type: Option<String>,
    pub usage_terms: Option<String>,
    pub usage_duration: Option<String>,
    pub exclusive: Option<bool>,
    pub notes: Option<String>,
    pub industries: Option<Vec<String>>,
    // Notifications
    pub notify_email: Option<bool>,
    pub notify_sms: Option<bool>,
    pub notify_push: Option<bool>,
    pub notify_calendar: Option<bool>,
}

pub async fn update(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<UpdateBookingPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // Only update fields that are Some
    let mut v = serde_json::to_value(&payload)
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    if let serde_json::Value::Object(ref mut map) = v {
        // If all_day=true in update, enforce full-day times
        if map.get("all_day").and_then(|x| x.as_bool()) == Some(true) {
            map.insert("call_time".into(), serde_json::Value::String("00:00".into()));
            map.insert("wrap_time".into(), serde_json::Value::String("23:59".into()));
        }
        // Map booking_type -> type for DB column
        if let Some(bt) = map.remove("booking_type") {
            map.insert("type".into(), bt);
        }
        // Remove nulls
        let null_keys: Vec<String> = map
            .iter()
            .filter_map(|(k, v)| if v.is_null() { Some(k.clone()) } else { None })
            .collect();
        for k in null_keys {
            map.remove(&k);
        }
    }
    let req = state
        .pg
        .from("bookings")
        .eq("id", &id)
        .eq("agency_user_id", &user.id)
        .update(v.to_string());
    let resp = req
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}

pub async fn cancel(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("bookings")
        .eq("id", &id)
        .eq("agency_user_id", &user.id)
        .update(json!({"status": "cancelled"}).to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(v))
}
