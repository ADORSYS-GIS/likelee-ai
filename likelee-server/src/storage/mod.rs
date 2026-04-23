use crate::config::AppState;
use axum::body::Bytes;
use axum::http::StatusCode;
use reqwest::header::{HeaderMap as ReqwestHeaderMap, CONTENT_TYPE};
use serde::{Deserialize, Serialize};
use serde_json::json;

pub mod backfill;

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
    pub fn bucket(self, state: &AppState) -> &str {
        match self {
            Self::Public => &state.supabase_bucket_public,
            Self::Private => &state.supabase_bucket_private,
            Self::Temp => &state.supabase_bucket_temp,
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
    BrandStorage,
    StudioGeneration,
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
            Self::BrandStorage => "brand_storage",
            Self::StudioGeneration => "studio_generation",
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
    let mut sanitized: String = file_name
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '.' || c == '_' || c == '-' {
                c
            } else {
                '_'
            }
        })
        .collect();

    while sanitized.contains("..") {
        sanitized = sanitized.replace("..", ".");
    }

    sanitized = sanitized.trim_start_matches('.').to_string();

    if sanitized.is_empty() {
        "upload.bin".to_string()
    } else {
        sanitized
    }
}

pub fn canonical_object_path(prefix: &str, file_name: &str, timestamp_ms: i64) -> String {
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
        return Err((
            StatusCode::BAD_GATEWAY,
            format!("sign url failed: {message}"),
        ));
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
        return Err((
            StatusCode::BAD_GATEWAY,
            format!("file fetch failed: {message}"),
        ));
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_storage_owner_type_serialization() {
        assert_eq!(StorageOwnerType::Agency.as_str(), "agency");
        assert_eq!(StorageOwnerType::Creator.as_str(), "creator");
        assert_eq!(StorageOwnerType::Brand.as_str(), "brand");
        assert_eq!(StorageOwnerType::User.as_str(), "user");
        assert_eq!(StorageOwnerType::System.as_str(), "system");
    }

    #[test]
    fn test_storage_visibility_serialization() {
        assert_eq!(StorageVisibility::Public.as_str(), "public");
        assert_eq!(StorageVisibility::Private.as_str(), "private");
        assert_eq!(StorageVisibility::Temp.as_str(), "temp");
    }

    #[test]
    fn test_storage_context_type_serialization() {
        assert_eq!(StorageContextType::AgencyStorage.as_str(), "agency_storage");
        assert_eq!(StorageContextType::ClientFile.as_str(), "client_file");
        assert_eq!(StorageContextType::TalentAsset.as_str(), "talent_asset");
        assert_eq!(
            StorageContextType::TalentPortfolio.as_str(),
            "talent_portfolio"
        );
        assert_eq!(StorageContextType::BookingFile.as_str(), "booking_file");
        assert_eq!(
            StorageContextType::BookingDeliverable.as_str(),
            "booking_deliverable"
        );
        assert_eq!(
            StorageContextType::CampaignOfferDeliverable.as_str(),
            "campaign_offer_deliverable"
        );
        assert_eq!(
            StorageContextType::ReferenceImage.as_str(),
            "reference_image"
        );
        assert_eq!(
            StorageContextType::VoiceRecording.as_str(),
            "voice_recording"
        );
        assert_eq!(StorageContextType::TaxDocument.as_str(), "tax_document");
        assert_eq!(
            StorageContextType::BrandVoiceAsset.as_str(),
            "brand_voice_asset"
        );
        assert_eq!(
            StorageContextType::StudioDocument.as_str(),
            "studio_document"
        );
        assert_eq!(StorageContextType::BrandStorage.as_str(), "brand_storage");
        assert_eq!(
            StorageContextType::StudioGeneration.as_str(),
            "studio_generation"
        );
    }

    #[test]
    fn test_sanitize_file_name_alphanumeric() {
        assert_eq!(sanitize_file_name("test.txt"), "test.txt");
        assert_eq!(sanitize_file_name("file_123.pdf"), "file_123.pdf");
        assert_eq!(sanitize_file_name("my-document.docx"), "my-document.docx");
    }

    #[test]
    fn test_sanitize_file_name_special_chars() {
        assert_eq!(sanitize_file_name("file name.txt"), "file_name.txt");
        assert_eq!(sanitize_file_name("file@#$%.txt"), "file____.txt");
        assert_eq!(sanitize_file_name("../../etc/passwd"), "_._etc_passwd");
    }

    #[test]
    fn test_sanitize_file_name_leading_dots() {
        assert_eq!(sanitize_file_name(".hidden"), "hidden");
        assert_eq!(sanitize_file_name("..double"), "double");
        assert_eq!(sanitize_file_name("...triple"), "triple");
    }

    #[test]
    fn test_sanitize_file_name_empty() {
        assert_eq!(sanitize_file_name(""), "upload.bin");
    }

    #[test]
    fn test_sanitize_file_name_unicode() {
        assert_eq!(sanitize_file_name("файл.txt"), "____.txt");
        assert_eq!(sanitize_file_name("文件.pdf"), "__.pdf");
    }

    #[test]
    fn test_canonical_object_path_format() {
        let path = canonical_object_path("agencies/123/storage", "test.txt", 1234567890123);
        assert_eq!(path, "agencies/123/storage/1234567890123_test.txt");
    }

    #[test]
    fn test_canonical_object_path_strips_slashes() {
        let path = canonical_object_path("/agencies/123/storage/", "test.txt", 1234567890123);
        assert_eq!(path, "agencies/123/storage/1234567890123_test.txt");
    }

    #[test]
    fn test_canonical_object_path_sanitizes_filename() {
        let path = canonical_object_path("agencies/123/storage", "my file.txt", 1234567890123);
        assert_eq!(path, "agencies/123/storage/1234567890123_my_file.txt");
    }

    #[test]
    fn test_canonical_object_path_various_contexts() {
        let test_cases = vec![
            (
                "agencies/123/storage",
                "doc.pdf",
                1000000000000i64,
                "agencies/123/storage/1000000000000_doc.pdf",
            ),
            (
                "users/456/voice-recordings",
                "audio.webm",
                2000000000000i64,
                "users/456/voice-recordings/2000000000000_audio.webm",
            ),
            (
                "creators/789/reference-images/section1",
                "image.jpg",
                3000000000000i64,
                "creators/789/reference-images/section1/3000000000000_image.jpg",
            ),
        ];

        for (prefix, filename, timestamp, expected) in test_cases {
            let path = canonical_object_path(prefix, filename, timestamp);
            assert_eq!(path, expected, "Failed for prefix: {}", prefix);
        }
    }

    #[test]
    fn test_storage_asset_record_structure() {
        let record = StorageAssetRecord {
            owner_type: StorageOwnerType::Agency,
            owner_id: "agency_123".to_string(),
            context_type: StorageContextType::AgencyStorage,
            context_id: Some("folder_456".to_string()),
            visibility: StorageVisibility::Private,
            object_path: "agencies/123/storage/file.pdf".to_string(),
            original_file_name: Some("document.pdf".to_string()),
            mime_type: Some("application/pdf".to_string()),
            size_bytes: Some(1024),
            checksum_sha256: Some("abc123".to_string()),
            source_table: Some("agency_files".to_string()),
            source_id: Some("file_789".to_string()),
            created_by: Some("user_999".to_string()),
            counts_toward_quota: true,
        };

        assert_eq!(record.owner_type, StorageOwnerType::Agency);
        assert_eq!(record.owner_id, "agency_123");
        assert_eq!(record.context_type, StorageContextType::AgencyStorage);
        assert_eq!(record.context_id, Some("folder_456".to_string()));
        assert_eq!(record.visibility, StorageVisibility::Private);
        assert!(record.counts_toward_quota);
    }

    #[test]
    fn test_quota_attribution_rules() {
        // Agency-owned assets should count toward quota
        let agency_record = StorageAssetRecord {
            owner_type: StorageOwnerType::Agency,
            owner_id: "agency_123".to_string(),
            context_type: StorageContextType::AgencyStorage,
            context_id: None,
            visibility: StorageVisibility::Private,
            object_path: "test.pdf".to_string(),
            original_file_name: None,
            mime_type: None,
            size_bytes: Some(1024),
            checksum_sha256: None,
            source_table: None,
            source_id: None,
            created_by: None,
            counts_toward_quota: true,
        };
        assert!(agency_record.counts_toward_quota);

        // Creator-owned source assets should NOT count toward quota
        let creator_record = StorageAssetRecord {
            owner_type: StorageOwnerType::Creator,
            owner_id: "creator_456".to_string(),
            context_type: StorageContextType::ReferenceImage,
            context_id: None,
            visibility: StorageVisibility::Public,
            object_path: "test.jpg".to_string(),
            original_file_name: None,
            mime_type: None,
            size_bytes: Some(2048),
            checksum_sha256: None,
            source_table: None,
            source_id: None,
            created_by: None,
            counts_toward_quota: false,
        };
        assert!(!creator_record.counts_toward_quota);
    }

    #[test]
    fn test_path_generation_consistency() {
        let timestamp = 1234567890123i64;
        let filename = "test.txt";

        // Same inputs should produce same output
        let path1 = canonical_object_path("prefix", filename, timestamp);
        let path2 = canonical_object_path("prefix", filename, timestamp);
        assert_eq!(path1, path2);

        // Different timestamps should produce different outputs
        let path3 = canonical_object_path("prefix", filename, timestamp + 1);
        assert_ne!(path1, path3);
    }

    #[test]
    fn test_file_name_edge_cases() {
        // Very long filename
        let long_name = "a".repeat(300);
        let sanitized = sanitize_file_name(&long_name);
        assert_eq!(sanitized.len(), 300);

        // Only special characters
        let special = "!@#$%^&*()";
        let sanitized = sanitize_file_name(special);
        assert_eq!(sanitized, "__________");

        // Mixed valid and invalid
        let mixed = "file!@#name.txt";
        let sanitized = sanitize_file_name(mixed);
        assert_eq!(sanitized, "file___name.txt");
    }

    #[test]
    fn test_path_prefix_normalization() {
        // Leading and trailing slashes should be handled
        let test_cases = vec![
            ("prefix", "prefix"),
            ("/prefix", "prefix"),
            ("prefix/", "prefix"),
            ("/prefix/", "prefix"),
            ("prefix/sub", "prefix/sub"),
            ("/prefix/sub/", "prefix/sub"),
        ];

        for (input, expected) in test_cases {
            let path = canonical_object_path(input, "file.txt", 1000000000000);
            assert!(
                path.starts_with(expected),
                "Path '{}' should start with '{}'",
                path,
                expected
            );
        }
    }
}
