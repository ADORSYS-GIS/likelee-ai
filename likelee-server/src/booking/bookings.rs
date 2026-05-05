use crate::{
    agency::agency_talent_refs::resolve_agency_talent_ref,
    auth::AuthUser,
    config::AppState,
    errors::sanitize_db_error,
    storage::{
        canonical_object_path, download_object, insert_asset_record, sanitize_file_name,
        upload_object, StorageAssetRecord, StorageContextType, StorageOwnerType, StorageVisibility,
    },
    team::resolve_effective_agency_id,
};
use axum::extract::Multipart;
use axum::{
    body::Body,
    extract::{Path, Query, State},
    http::{header, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tracing::warn;

#[derive(Debug, Deserialize, Serialize)]
pub struct CreateBookingPayload {
    pub booking_type: Option<String>,
    pub status: Option<String>,
    pub client_id: Option<String>,
    pub talent_id: Option<String>,
    pub creator_id: Option<String>,
    pub relationship_id: Option<String>,
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
    pub campaign_id: Option<String>,
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
                let fname = field
                    .file_name()
                    .map(|s| s.to_string())
                    .unwrap_or_else(|| "upload.bin".to_string());
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
    let agency_id = resolve_effective_agency_id(&state, &user).await?;
    let resolved_talent_ref = match payload
        .talent_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        Some(value) => Some(resolve_agency_talent_ref(&state, &agency_id, value).await?),
        None => None,
    };
    let resolved_talent_id = resolved_talent_ref
        .as_ref()
        .and_then(|talent_ref| talent_ref.agency_user_id.clone());
    let resolved_creator_id = resolved_talent_ref
        .as_ref()
        .and_then(|talent_ref| talent_ref.creator_id.clone())
        .or_else(|| {
            payload
                .creator_id
                .clone()
                .filter(|value| !value.trim().is_empty())
        });
    let resolved_relationship_id = resolved_talent_ref
        .as_ref()
        .and_then(|talent_ref| talent_ref.relationship_id.clone())
        .or_else(|| {
            payload
                .relationship_id
                .clone()
                .filter(|value| !value.trim().is_empty())
        });

    // Reuse create logic: normalize times
    let is_all_day = payload.all_day.unwrap_or(false);
    let (call_time, wrap_time) = if is_all_day {
        (Some("00:00".to_string()), Some("23:59".to_string()))
    } else {
        (payload.call_time.clone(), payload.wrap_time.clone())
    };

    // Validate: if talent is booked out on this date, block the booking
    if let Some(talent_ref) = resolved_talent_ref.as_ref() {
        // Overlap when date is within [start_date, end_date]
        let mut req = state
            .pg
            .from("book_outs")
            .select("id")
            .lte("start_date", &payload.date)
            .gte("end_date", &payload.date);
        req = if let Some(agency_user_id) = talent_ref.agency_user_id.as_ref() {
            if let Some(creator_id) = talent_ref.creator_id.as_ref() {
                req.or(format!(
                    "talent_id.eq.{},creator_id.eq.{}",
                    agency_user_id, creator_id
                ))
            } else {
                req.eq("talent_id", agency_user_id)
            }
        } else if let Some(creator_id) = talent_ref.creator_id.as_ref() {
            req.eq("creator_id", creator_id)
        } else {
            req.eq("talent_id", &talent_ref.id)
        };
        let resp = req
            .limit(1)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let status = resp.status();
        let text = resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        if !status.is_success() {
            return Err(sanitize_db_error(status.as_u16(), text));
        }

        let rows: serde_json::Value = serde_json::from_str(&text)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if rows.as_array().map(|a| !a.is_empty()).unwrap_or(false) {
            return Err((
                StatusCode::CONFLICT,
                "Talent is unavailable during the selected date".to_string(),
            ));
        }
    }

    let row = json!({
        "agency_user_id": user.id,
        "agency_id": agency_id,
        "client_id": payload.client_id,
        "talent_id": resolved_talent_id,
        "creator_id": resolved_creator_id,
        "relationship_id": resolved_relationship_id,
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
        "notify_sms": false,
        "notify_push": payload.notify_push.unwrap_or(true),
        "notify_calendar": payload.notify_calendar.unwrap_or(true),
        "campaign_id": payload.campaign_id,
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
        let code =
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err(crate::errors::sanitize_db_error(code.as_u16(), text));
    }
    let created: Vec<serde_json::Value> = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let booking = created.first().and_then(|v| v.as_object()).ok_or((
        StatusCode::INTERNAL_SERVER_ERROR,
        "create returned empty".to_string(),
    ))?;
    let booking_id = booking
        .get("id")
        .and_then(|v| v.as_str())
        .ok_or((
            StatusCode::INTERNAL_SERVER_ERROR,
            "missing booking id".to_string(),
        ))?
        .to_string();

    // Upload files and insert booking_files rows
    let mut uploaded: Vec<serde_json::Value> = Vec::new();
    for (fname, data) in files.into_iter() {
        let sanitized = sanitize_file_name(&fname);
        let path = canonical_object_path(
            &format!("agencies/{agency_id}/bookings/{booking_id}/files"),
            &sanitized,
            chrono::Utc::now().timestamp_millis(),
        );
        let uploaded_object =
            upload_object(&state, StorageVisibility::Private, &path, data, None).await?;

        let rec_body = json!({
            "booking_id": booking_id,
            "file_name": fname,
            "storage_bucket": uploaded_object.bucket,
            "storage_path": uploaded_object.path,
            "public_url": null,
        });
        let ins = state
            .pg
            .from("booking_files")
            .insert(rec_body.to_string())
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let txt = ins
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let arr: Vec<serde_json::Value> = serde_json::from_str(&txt).unwrap_or_default();
        if let Some(v) = arr.first() {
            if let Some(file_id) = v
                .get("id")
                .and_then(|id| id.as_str())
                .filter(|id| !id.is_empty())
            {
                let record = StorageAssetRecord {
                    owner_type: StorageOwnerType::Agency,
                    owner_id: agency_id.clone(),
                    context_type: StorageContextType::BookingFile,
                    context_id: Some(booking_id.clone()),
                    visibility: StorageVisibility::Private,
                    object_path: rec_body
                        .get("storage_path")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    original_file_name: Some(fname.clone()),
                    mime_type: None,
                    size_bytes: None,
                    checksum_sha256: None,
                    source_table: Some("booking_files".to_string()),
                    source_id: Some(file_id.to_string()),
                    created_by: Some(user.id.clone()),
                    counts_toward_quota: true,
                };
                if let Err(err) = insert_asset_record(&state, &record).await {
                    warn!(booking_id = %booking_id, file_id = %file_id, error = %err.1, "failed to mirror booking file into storage_assets");
                }
            }
            uploaded.push(v.clone());
        }
    }

    // Return booking + files summary
    let mut out = serde_json::Map::new();
    for (k, v) in booking.iter() {
        out.insert(k.clone(), v.clone());
    }
    out.insert("files".to_string(), serde_json::Value::Array(uploaded));
    Ok(Json(serde_json::Value::Object(out)))
}
#[derive(Debug, Deserialize)]
pub struct ListParams {
    pub date_start: Option<String>,
    pub date_end: Option<String>,
    pub client_id: Option<String>,
}

pub async fn create(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<CreateBookingPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let agency_id = resolve_effective_agency_id(&state, &user).await?;
    let resolved_talent_ref = match payload
        .talent_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        Some(value) => Some(resolve_agency_talent_ref(&state, &agency_id, value).await?),
        None => None,
    };
    let resolved_talent_id = resolved_talent_ref
        .as_ref()
        .and_then(|talent_ref| talent_ref.agency_user_id.clone());
    let resolved_creator_id = resolved_talent_ref
        .as_ref()
        .and_then(|talent_ref| talent_ref.creator_id.clone())
        .or_else(|| {
            payload
                .creator_id
                .clone()
                .filter(|value| !value.trim().is_empty())
        });
    let resolved_relationship_id = resolved_talent_ref
        .as_ref()
        .and_then(|talent_ref| talent_ref.relationship_id.clone())
        .or_else(|| {
            payload
                .relationship_id
                .clone()
                .filter(|value| !value.trim().is_empty())
        });
    // Enforce full-day booking times if all_day=true
    let is_all_day = payload.all_day.unwrap_or(false);
    let (call_time, wrap_time) = if is_all_day {
        (Some("00:00".to_string()), Some("23:59".to_string()))
    } else {
        (payload.call_time.clone(), payload.wrap_time.clone())
    };

    // Validate: if talent is booked out on this date, block the booking
    if let Some(talent_ref) = resolved_talent_ref.as_ref() {
        let mut req = state
            .pg
            .from("book_outs")
            .select("id")
            .eq("agency_user_id", &user.id)
            .lte("start_date", &payload.date)
            .gte("end_date", &payload.date);
        req = if let Some(agency_user_id) = talent_ref.agency_user_id.as_ref() {
            if let Some(creator_id) = talent_ref.creator_id.as_ref() {
                req.or(format!(
                    "talent_id.eq.{},creator_id.eq.{}",
                    agency_user_id, creator_id
                ))
            } else {
                req.eq("talent_id", agency_user_id)
            }
        } else if let Some(creator_id) = talent_ref.creator_id.as_ref() {
            req.eq("creator_id", creator_id)
        } else {
            req.eq("talent_id", &talent_ref.id)
        };
        let resp = req
            .limit(1)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let status = resp.status();
        let text = resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        if !status.is_success() {
            return Err(sanitize_db_error(status.as_u16(), text));
        }

        let rows: serde_json::Value = serde_json::from_str(&text)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if rows.as_array().map(|a| !a.is_empty()).unwrap_or(false) {
            return Err((
                StatusCode::CONFLICT,
                "Talent is unavailable during the selected date".to_string(),
            ));
        }
    }

    // Compose row
    let row = json!({
        "agency_user_id": user.id,
        "agency_id": agency_id,
        "client_id": payload.client_id,
        "talent_id": resolved_talent_id,
        "creator_id": resolved_creator_id,
        "relationship_id": resolved_relationship_id,
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
        "campaign_id": payload.campaign_id,
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
        return Err(crate::errors::sanitize_db_error(code.as_u16(), text));
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
    let agency_id = resolve_effective_agency_id(&state, &user).await?;
    let booking_resp = state
        .pg
        .from("bookings")
        .select("id")
        .eq("id", &booking_id)
        .eq("agency_user_id", &user.id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !booking_resp.status().is_success() {
        return Err((StatusCode::FORBIDDEN, "booking_not_found".into()));
    }
    let booking_rows: Vec<serde_json::Value> =
        serde_json::from_str(&booking_resp.text().await.unwrap_or_default()).unwrap_or_default();
    if booking_rows.is_empty() {
        return Err((StatusCode::FORBIDDEN, "booking_not_found".into()));
    }

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
    let size_bytes = bytes.len() as i64;
    let fname = file_name.unwrap_or_else(|| "upload.bin".to_string());
    let sanitized = sanitize_file_name(&fname);
    let path = canonical_object_path(
        &format!("agencies/{agency_id}/bookings/{booking_id}/files"),
        &sanitized,
        chrono::Utc::now().timestamp_millis(),
    );
    let uploaded = upload_object(&state, StorageVisibility::Private, &path, bytes, None).await?;
    let public_url = uploaded.public_url.clone();

    // Insert row into booking_files
    let insert = serde_json::json!({
        "booking_id": booking_id,
        "file_name": fname,
        "storage_bucket": uploaded.bucket,
        "storage_path": uploaded.path,
        "public_url": public_url,
    });
    let resp = state
        .pg
        .from("booking_files")
        .insert(insert.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let txt = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let arr: Vec<serde_json::Value> = serde_json::from_str(&txt).unwrap_or_default();
    let rec = arr
        .first()
        .cloned()
        .unwrap_or(serde_json::json!({"id": ""}));
    let id = rec
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    if !id.is_empty() {
        let record = StorageAssetRecord {
            owner_type: StorageOwnerType::Agency,
            owner_id: agency_id,
            context_type: StorageContextType::BookingFile,
            context_id: Some(booking_id.clone()),
            visibility: StorageVisibility::Private,
            object_path: insert
                .get("storage_path")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
            original_file_name: Some(fname.clone()),
            mime_type: None,
            size_bytes: Some(size_bytes),
            checksum_sha256: None,
            source_table: Some("booking_files".to_string()),
            source_id: Some(id.clone()),
            created_by: Some(user.id.clone()),
            counts_toward_quota: true,
        };
        if let Err(err) = insert_asset_record(&state, &record).await {
            warn!(booking_id = %booking_id, file_id = %id, error = %err.1, "failed to mirror uploaded booking file into storage_assets");
        }
    }

    Ok(Json(BookingFileUploadResponse {
        id,
        file_name: fname,
        public_url,
        storage_bucket: insert
            .get("storage_bucket")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
        storage_path: insert
            .get("storage_path")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
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
    let req = if let Some(cid) = params.client_id.as_ref() {
        req.eq("client_id", cid)
    } else {
        req
    };
    let resp = req
        .order("date.desc")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !status.is_success() {
        return Err(sanitize_db_error(status.as_u16(), text));
    }

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
    pub campaign_id: Option<String>,
}

pub async fn update(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<UpdateBookingPayload>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // Only update fields that are Some
    let mut v =
        serde_json::to_value(&payload).map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    if let serde_json::Value::Object(ref mut map) = v {
        // If all_day=true in update, enforce full-day times
        if map.get("all_day").and_then(|x| x.as_bool()) == Some(true) {
            map.insert(
                "call_time".into(),
                serde_json::Value::String("00:00".into()),
            );
            map.insert(
                "wrap_time".into(),
                serde_json::Value::String("23:59".into()),
            );
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
        .update(json!({"status": "cancelled", "campaign_id": null}).to_string())
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

#[derive(Debug, Deserialize)]
pub struct BookingFilePath {
    pub id: String,
    pub file_id: String,
}

pub async fn serve_booking_file(
    State(state): State<AppState>,
    user: AuthUser,
    Path(BookingFilePath { id, file_id }): Path<BookingFilePath>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Load booking file record
    let file_resp = state
        .pg
        .from("booking_files")
        .select("id,booking_id,file_name,storage_bucket,storage_path")
        .eq("id", &file_id)
        .eq("booking_id", &id)
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !file_resp.status().is_success() {
        return Err((StatusCode::NOT_FOUND, "file_not_found".to_string()));
    }

    let file_row: serde_json::Value =
        serde_json::from_str(&file_resp.text().await.unwrap_or_default()).unwrap_or_default();
    let booking_id = file_row
        .get("booking_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let storage_bucket = file_row
        .get("storage_bucket")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let storage_path = file_row
        .get("storage_path")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let file_name = file_row
        .get("file_name")
        .and_then(|v| v.as_str())
        .unwrap_or("attachment")
        .trim()
        .to_string();

    if booking_id.is_empty() || storage_path.is_empty() || storage_bucket.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "invalid_file_record".to_string()));
    }

    // Strict: only serve private bucket files via this endpoint.
    if storage_bucket != state.supabase_bucket_private {
        return Err((StatusCode::BAD_REQUEST, "invalid_bucket".to_string()));
    }

    // Authorization
    let role = user.role.as_str();
    let is_agency = role == "agency";
    let is_creator_like = role == "creator" || role == "talent";

    if !(is_agency || is_creator_like) {
        return Err((StatusCode::FORBIDDEN, "forbidden".to_string()));
    }

    if is_agency {
        // Agencies can only access their own bookings.
        let b_resp = state
            .pg
            .from("bookings")
            .select("id")
            .eq("id", &booking_id)
            .eq("agency_user_id", &user.id)
            .limit(1)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if !b_resp.status().is_success() {
            return Err((StatusCode::FORBIDDEN, "forbidden".to_string()));
        }
        let txt = b_resp.text().await.unwrap_or_else(|_| "[]".into());
        let rows: Vec<serde_json::Value> = serde_json::from_str(&txt).unwrap_or_default();
        if rows.is_empty() {
            return Err((StatusCode::FORBIDDEN, "forbidden".to_string()));
        }
    } else {
        // Creators can access files for bookings where they are the booked talent.
        // bookings.talent_id -> agency_users.id, where agency_users.creator_id = auth.uid().
        let b_resp = state
            .pg
            .from("bookings")
            .select("id,talent_id,creator_id")
            .eq("id", &booking_id)
            .single()
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        if !b_resp.status().is_success() {
            return Err((StatusCode::FORBIDDEN, "forbidden".to_string()));
        }
        let b_row: serde_json::Value =
            serde_json::from_str(&b_resp.text().await.unwrap_or_default()).unwrap_or_default();
        let talent_id = b_row
            .get("talent_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        let creator_id = b_row
            .get("creator_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();

        if !creator_id.is_empty() {
            if creator_id != user.id {
                return Err((StatusCode::FORBIDDEN, "forbidden".to_string()));
            }
        } else if !talent_id.is_empty() {
            let au_resp = state
                .pg
                .from("agency_users")
                .select("id")
                .eq("id", &talent_id)
                .eq("creator_id", &user.id)
                .limit(1)
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            if !au_resp.status().is_success() {
                return Err((StatusCode::FORBIDDEN, "forbidden".to_string()));
            }
            let txt = au_resp.text().await.unwrap_or_else(|_| "[]".into());
            let rows: Vec<serde_json::Value> = serde_json::from_str(&txt).unwrap_or_default();
            if rows.is_empty() {
                return Err((StatusCode::FORBIDDEN, "forbidden".to_string()));
            }
        } else {
            return Err((StatusCode::FORBIDDEN, "forbidden".to_string()));
        }
    }

    let downloaded = download_object(&state, &storage_bucket, &storage_path).await?;

    let content_type = downloaded
        .headers
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("application/octet-stream")
        .to_string();
    let bytes = downloaded.bytes;

    let mut resp = Response::new(Body::from(bytes));
    resp.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_str(&content_type)
            .unwrap_or_else(|_| HeaderValue::from_static("application/octet-stream")),
    );

    let safe_name = file_name.replace(['\r', '\n'], " ").replace('"', "'");
    let cd = format!("attachment; filename=\"{safe_name}\"");
    if let Ok(v) = HeaderValue::from_str(&cd) {
        resp.headers_mut().insert(header::CONTENT_DISPOSITION, v);
    }

    Ok(resp)
}
