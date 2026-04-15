use crate::config::AppState;
use axum::http::StatusCode;
use axum::body::Bytes;
use reqwest::header::{CONTENT_TYPE, HeaderMap as ReqwestHeaderMap};
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum StorageOwnerType {
    Agency,
    Creator,
    Brand,
    User,
    System,
}

impl StorageOwnerType {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Agency => "agency",
            Self::Creator => "creator",
            Self::Brand => "brand",
            Self::User => "user",
            Self::System => "system",
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum StorageVisibility {
    Public,
    Private,
    Temp,
}

impl StorageVisibility {
    pub fn bucket<'a>(self, state: &'a AppState) -> &'a str {
        match self {
            Self::Public => &state.supabase_bucket_public,
            Self::Private => &state.supabase_bucket_private,
            Self::Temp => "likelee-temp",
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::Public => "public",
            Self::Private => "private",
            Self::Temp => "temp",
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum StorageContextType {
    AgencyStorage,
    ClientFile,
    TalentAsset,
    TalentPortfolio,
    BookingFile,
    BookingDeliverable,
    CampaignOfferDeliverable,
    ReferenceImage,
    VoiceRecording,
    TaxDocument,
    BrandVoiceAsset,
    StudioDocument,
}

impl StorageContextType {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::AgencyStorage => "agency_storage",
            Self::ClientFile => "client_file",
            Self::TalentAsset => "talent_asset",
            Self::TalentPortfolio => "talent_portfolio",
            Self::BookingFile => "booking_file",
            Self::BookingDeliverable => "booking_deliverable",
            Self::CampaignOfferDeliverable => "campaign_offer_deliverable",
            Self::ReferenceImage => "reference_image",
            Self::VoiceRecording => "voice_recording",
            Self::TaxDocument => "tax_document",
            Self::BrandVoiceAsset => "brand_voice_asset",
            Self::StudioDocument => "studio_document",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageAssetRecord {
    pub owner_type: StorageOwnerType,
    pub owner_id: String,
    pub context_type: StorageContextType,
    pub context_id: Option<String>,
    pub visibility: StorageVisibility,
    pub object_path: String,
    pub original_file_name: Option<String>,
    pub mime_type: Option<String>,
    pub size_bytes: Option<i64>,
    pub checksum_sha256: Option<String>,
    pub source_table: Option<String>,
    pub source_id: Option<String>,
    pub created_by: Option<String>,
    pub counts_toward_quota: bool,
}

#[derive(Debug, Clone)]
pub struct UploadedObject {
    pub bucket: String,
    pub path: String,
    pub public_url: Option<String>,
}

#[derive(Debug, Clone)]
pub struct DownloadedObject {
    pub bytes: Bytes,
    pub content_type: Option<String>,
    pub headers: ReqwestHeaderMap,
}

pub fn sanitize_file_name(file_name: &str) -> String {
    let sanitized = file_name
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '.' || c == '_' || c == '-' {
                c
            } else {
                '_'
            }
        })
        .collect::<String>();
    if sanitized.is_empty() {
        "upload.bin".to_string()
    } else {
        sanitized
    }
}

pub fn canonical_object_path(
    prefix: &str,
    file_name: &str,
    timestamp_ms: i64,
) -> String {
    format!(
        "{}/{}_{}",
        prefix.trim_matches('/'),
        timestamp_ms,
        sanitize_file_name(file_name)
    )
}

pub fn public_object_url(state: &AppState, bucket: &str, path: &str) -> String {
    format!(
        "{}/storage/v1/object/public/{}/{}",
        state.supabase_url, bucket, path
    )
}

pub async fn upload_object(
    state: &AppState,
    visibility: StorageVisibility,
    path: &str,
    body: Vec<u8>,
    content_type: Option<&str>,
) -> Result<UploadedObject, (StatusCode, String)> {
    let bucket = visibility.bucket(state).to_string();
    let storage_url = format!(
        "{}/storage/v1/object/{}/{}",
        state.supabase_url, bucket, path
    );
    let http = reqwest::Client::new();
    let mut request = http
        .post(&storage_url)
        .header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        )
        .header("apikey", state.supabase_service_key.clone());
    if let Some(ct) = content_type.filter(|s| !s.trim().is_empty()) {
        request = request.header(CONTENT_TYPE, ct);
    }
    let response = request
        .body(body)
        .send()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    if !response.status().is_success() {
        let message = response.text().await.unwrap_or_default();
        return Err((
            StatusCode::BAD_GATEWAY,
            format!("storage upload failed: {message}"),
        ));
    }

    let public_url = match visibility {
        StorageVisibility::Public => Some(public_object_url(state, &bucket, path)),
        StorageVisibility::Private | StorageVisibility::Temp => None,
    };

    Ok(UploadedObject {
        bucket,
        path: path.to_string(),
        public_url,
    })
}

pub async fn delete_object(
    state: &AppState,
    bucket: &str,
    path: &str,
) -> Result<(), (StatusCode, String)> {
    let storage_url = format!(
        "{}/storage/v1/object/{}/{}",
        state.supabase_url, bucket, path
    );
    let response = reqwest::Client::new()
        .delete(&storage_url)
        .header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        )
        .header("apikey", state.supabase_service_key.clone())
        .send()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    if !response.status().is_success() {
        let message = response.text().await.unwrap_or_default();
        return Err((
            StatusCode::BAD_GATEWAY,
            format!("storage delete failed: {message}"),
        ));
    }
    Ok(())
}

pub async fn generate_signed_url(
    state: &AppState,
    bucket: &str,
    path: &str,
    expires_in_sec: i64,
) -> Result<String, (StatusCode, String)> {
    let url = format!(
        "{}/storage/v1/object/sign/{}/{}",
        state.supabase_url, bucket, path
    );
    let body = json!({ "expiresIn": expires_in_sec.max(1) });
    let response = reqwest::Client::new()
        .post(&url)
        .header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        )
        .header("apikey", state.supabase_service_key.clone())
        .json(&body)
        .send()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    if !response.status().is_success() {
        let message = response.text().await.unwrap_or_default();
        return Err((StatusCode::BAD_GATEWAY, format!("sign url failed: {message}")));
    }
    let signed_json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    let signed_path = signed_json
        .get("signedURL")
        .and_then(|v| v.as_str())
        .ok_or((StatusCode::BAD_GATEWAY, "invalid sign response".into()))?;
    Ok(format!("{}/storage/v1{}", state.supabase_url, signed_path))
}

pub async fn download_object(
    state: &AppState,
    bucket: &str,
    path: &str,
) -> Result<DownloadedObject, (StatusCode, String)> {
    let file_url = format!(
        "{}/storage/v1/object/{}/{}",
        state.supabase_url, bucket, path
    );
    let response = reqwest::Client::new()
        .get(&file_url)
        .header(
            "Authorization",
            format!("Bearer {}", state.supabase_service_key),
        )
        .header("apikey", state.supabase_service_key.clone())
        .send()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    if !response.status().is_success() {
        let message = response.text().await.unwrap_or_default();
        return Err((StatusCode::BAD_GATEWAY, format!("file fetch failed: {message}")));
    }

    let headers = response.headers().clone();
    let content_type = headers
        .get(CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());
    let bytes = response
        .bytes()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    Ok(DownloadedObject {
        bytes,
        content_type,
        headers,
    })
}

pub async fn insert_asset_record(
    state: &AppState,
    record: &StorageAssetRecord,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let payload = json!({
        "owner_type": record.owner_type.as_str(),
        "owner_id": record.owner_id,
        "context_type": record.context_type.as_str(),
        "context_id": record.context_id,
        "visibility": record.visibility.as_str(),
        "bucket_id": record.visibility.bucket(state),
        "object_path": record.object_path,
        "original_file_name": record.original_file_name,
        "mime_type": record.mime_type,
        "size_bytes": record.size_bytes,
        "checksum_sha256": record.checksum_sha256,
        "source_table": record.source_table,
        "source_id": record.source_id,
        "created_by": record.created_by,
        "counts_toward_quota": record.counts_toward_quota,
    });
    let response = state
        .pg
        .from("storage_assets")
        .insert(payload.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        let code =
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err(crate::errors::sanitize_db_error(code.as_u16(), text));
    }
    serde_json::from_str(&text).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
}

pub async fn soft_delete_asset_record(
    state: &AppState,
    source_table: &str,
    source_id: &str,
) -> Result<(), (StatusCode, String)> {
    let payload = json!({ "deleted_at": chrono::Utc::now().to_rfc3339() });
    let response = state
        .pg
        .from("storage_assets")
        .update(payload.to_string())
        .eq("source_table", source_table)
        .eq("source_id", source_id)
        .is("deleted_at", "null")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if !status.is_success() {
        let code =
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        return Err(crate::errors::sanitize_db_error(code.as_u16(), text));
    }
    Ok(())
}
