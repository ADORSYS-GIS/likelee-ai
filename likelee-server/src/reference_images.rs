use crate::config::AppState;
use axum::{
    body::Bytes,
    extract::{Query, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use image::GenericImageView;
use serde::Deserialize;
use serde::Serialize;
use std::io::Cursor;
use tracing::{error, info};

#[derive(Deserialize)]
pub struct UploadQuery {
    pub user_id: String,
    pub section_id: String,
}

#[derive(Deserialize)]
pub struct ListQuery {
    pub user_id: String,
}

pub async fn list_reference_images(
    State(state): State<AppState>,
    Query(q): Query<ListQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // Query reference_images for this user via PostgREST and return raw JSON array
    let req = state
        .pg
        .from("reference_images")
        .select("*")
        .eq("user_id", &q.user_id)
        .order("created_at.desc");

    let resp = req.execute().await.map_err(|e| {
        let m = e.to_string();
        (StatusCode::BAD_GATEWAY, m)
    })?;

    let text = resp.text().await.unwrap_or_else(|_| "[]".into());
    let json: serde_json::Value = serde_json::from_str(&text).unwrap_or(serde_json::json!([]));
    Ok(Json(json))
}

#[derive(Serialize)]
pub struct UploadResponse {
    pub public_url: String,
    pub storage_bucket: String,
    pub storage_path: String,
}

#[derive(Serialize)]
pub struct ErrorOut {
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reasons: Option<Vec<String>>,
}

pub async fn upload_reference_image(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(q): Query<UploadQuery>,
    body: Bytes,
) -> Result<Json<UploadResponse>, (StatusCode, String)> {
    if body.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "empty body".into()));
    }
    let ct = headers
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("image/jpeg")
        .to_string();

    // 1) Moderation pre-scan (best-effort: if Rekog configured)
    if let Some(client) = state.rekog.as_ref() {
        if body.len() > 10_000_000 {
            let out = ErrorOut {
                message: "Please upload an image of 10 MB or less.".into(),
                reasons: None,
            };
            return Err((
                StatusCode::PAYLOAD_TOO_LARGE,
                serde_json::to_string(&out).unwrap(),
            ));
        }
        let image = aws_sdk_rekognition::types::Image::builder()
            .bytes(body.to_vec().into())
            .build();
        let res = client
            .detect_moderation_labels()
            .image(image)
            .min_confidence(60.0)
            .send()
            .await;
        let res = match res {
            Ok(r) => r,
            Err(e) => {
                // Hide internal AWS error; surface friendly message
                let msg = e.to_string();
                if msg.contains("AccessDeniedException") {
                    let out = ErrorOut {
                        message:
                            "Image moderation is temporarily unavailable. Please try again later."
                                .into(),
                        reasons: None,
                    };
                    return Err((
                        StatusCode::SERVICE_UNAVAILABLE,
                        serde_json::to_string(&out).unwrap(),
                    ));
                }
                let out = ErrorOut {
                    message: "We couldn't verify the image at this time. Please try again.".into(),
                    reasons: None,
                };
                return Err((
                    StatusCode::BAD_GATEWAY,
                    serde_json::to_string(&out).unwrap(),
                ));
            }
        };
        // Collect reasons and flag if any high-confidence label
        let mut flagged = false;
        let mut reasons: Vec<String> = vec![];
        for l in res.moderation_labels().iter() {
            let name = l.name().unwrap_or("");
            let conf = l.confidence().unwrap_or(0.0);
            let reason = format!("{name} ({conf:.0}%)");
            reasons.push(reason);
            if conf >= 60.0 {
                flagged = true;
            }
        }
        if flagged {
            reasons.sort_by(|a, b| b.split('(').next_back().cmp(&a.split('(').next_back()));
            let out = ErrorOut {
                message: "Your image was rejected by our safety checks.".into(),
                reasons: Some(reasons),
            };
            return Err((
                StatusCode::UNPROCESSABLE_ENTITY,
                serde_json::to_string(&out).unwrap(),
            ));
        }

        // 1b) Additional acceptance checks
        let mut reasons: Vec<String> = vec![];

        // Decode to get resolution
        if let Ok(_img) = image::load_from_memory(&body) {
            let (_w, _h) = _img.dimensions();
            // No minimum resolution enforcement
        } else {
            reasons.push("We couldn't read the image data.".into());
        }

        // EXIF recency check (if present)
        if reasons.is_empty() {
            let mut cursor = Cursor::new(&body);
            if let Ok(exif_reader) = exif::Reader::new().read_from_container(&mut cursor) {
                if let Some(dt) =
                    exif_reader.get_field(exif::Tag::DateTimeOriginal, exif::In::PRIMARY)
                {
                    if let exif::Value::Ascii(vs) = &dt.value {
                        if let Some(bytes) = vs.first() {
                            if let Ok(s) = std::str::from_utf8(bytes) {
                                // EXIF format "YYYY:MM:DD HH:MM:SS"
                                let parsed =
                                    chrono::NaiveDateTime::parse_from_str(s, "%Y:%m:%d %H:%M:%S");
                                if let Ok(naive) = parsed {
                                    let dt_utc =
                                        chrono::DateTime::<chrono::Utc>::from_naive_utc_and_offset(
                                            naive,
                                            chrono::Utc,
                                        );
                                    let ninety_days = chrono::Duration::days(90);
                                    if chrono::Utc::now() - dt_utc > ninety_days {
                                        reasons.push(
                                            "Photo appears older than 3 months (based on EXIF)."
                                                .into(),
                                        );
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // DetectFaces for face visibility and quality
        if reasons.is_empty() {
            let img = aws_sdk_rekognition::types::Image::builder()
                .bytes(body.to_vec().into())
                .build();
            let faces = client
                .detect_faces()
                .image(img)
                .attributes(aws_sdk_rekognition::types::Attribute::All)
                .send()
                .await;
            match faces {
                Ok(resp) => {
                    let face_details = resp.face_details();
                    if face_details.is_empty() {
                        reasons.push(
                            "No face detected. Please ensure your face is clearly visible.".into(),
                        );
                    } else {
                        let f = &face_details[0];
                        let conf_ok = f.confidence().unwrap_or(0.0) >= 90.0;
                        let quality = f.quality();
                        let brightness_ok =
                            quality.and_then(|q| q.brightness()).unwrap_or(0.0) >= 40.0;
                        let sharpness_ok =
                            quality.and_then(|q| q.sharpness()).unwrap_or(0.0) >= 40.0;
                        if !conf_ok {
                            reasons.push("Face detection confidence is too low.".into());
                        }
                        if !brightness_ok {
                            reasons.push(
                                "Lighting is too dim/harsh. Use natural or studio lighting.".into(),
                            );
                        }
                        if !sharpness_ok {
                            reasons
                                .push("Image appears blurry. Please use a sharper photo.".into());
                        }
                    }
                }
                Err(_) => {
                    // If DetectFaces fails, we do not hard fail; rely on moderation only.
                }
            }
        }

        // DetectLabels for body/person visibility
        if reasons.is_empty() {
            let img = aws_sdk_rekognition::types::Image::builder()
                .bytes(body.to_vec().into())
                .build();
            let labels = client
                .detect_labels()
                .image(img)
                .min_confidence(70.0)
                .max_labels(10)
                .send()
                .await;
            if let Ok(r) = labels {
                let has_person = r.labels().iter().any(|l| {
                    l.name()
                        .map(|n| n.eq_ignore_ascii_case("Person"))
                        .unwrap_or(false)
                        && l.confidence().unwrap_or(0.0) >= 70.0
                });
                if !has_person {
                    reasons.push("Please ensure your face or body is clearly visible.".into());
                }
            }
        }

        if !reasons.is_empty() {
            let out = ErrorOut {
                message: "Your image does not meet our quality requirements.".into(),
                reasons: Some(reasons),
            };
            return Err((
                StatusCode::UNPROCESSABLE_ENTITY,
                serde_json::to_string(&out).unwrap(),
            ));
        }
    } else {
        // Moderation strictly required before storage; if disabled, return 503
        let out = ErrorOut {
            message: "Image moderation is not configured. Please try again later.".into(),
            reasons: None,
        };
        return Err((
            StatusCode::SERVICE_UNAVAILABLE,
            serde_json::to_string(&out).unwrap(),
        ));
    }

    // 2) Upload to Supabase Storage (public bucket) using service key
    let bucket = state.supabase_bucket_public.clone();
    let owner = q.user_id.replace(
        |c: char| !c.is_ascii_alphanumeric() && c != '_' && c != '-',
        "_",
    );
    let ext = match ct.as_str() {
        "image/png" => "png",
        "image/webp" => "webp",
        _ => "jpg",
    };
    let path = format!(
        "likeness/{}/sections/{}/{}.{}",
        owner,
        q.section_id,
        chrono::Utc::now().timestamp_millis(),
        ext
    );

    let storage_url = format!(
        "{}/storage/v1/object/{}/{}",
        state.supabase_url, bucket, path
    );
    let http = reqwest::Client::builder()
        .http1_only()
        .tcp_keepalive(std::time::Duration::from_secs(30))
        .pool_idle_timeout(std::time::Duration::from_secs(30))
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .unwrap();
    let up = http
        .post(&storage_url)
        .header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        )
        .header("apikey", state.supabase_service_key.clone())
        .header("content-type", ct)
        .body(body)
        .send()
        .await
        .map_err(|e| {
            let m = e.to_string();
            error!(error=%m, "storage upload error");
            (StatusCode::BAD_GATEWAY, m)
        })?;
    if !up.status().is_success() {
        let msg = up.text().await.unwrap_or_default();
        return Err((
            StatusCode::BAD_GATEWAY,
            format!("storage upload failed: {msg}"),
        ));
    }

    let public_url = format!(
        "{}/storage/v1/object/public/{}/{}",
        state.supabase_url, bucket, path
    );

    // 3) Persist to reference_images via Postgrest
    let payload = serde_json::json!({
        "user_id": q.user_id,
        "section_id": q.section_id,
        "storage_bucket": bucket,
        "storage_path": path,
        "public_url": public_url,
        "moderation_status": "approved",
    });
    match state
        .pg
        .from("reference_images")
        .insert(payload.to_string())
        .execute()
        .await
    {
        Ok(_) => {}
        Err(e) => {
            info!(err=%e, "insert reference_images failed; continuing");
        }
    }

    Ok(Json(UploadResponse {
        public_url,
        storage_bucket: bucket,
        storage_path: path,
    }))
}
