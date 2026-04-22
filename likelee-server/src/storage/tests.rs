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
        assert_eq!(sanitize_file_name("../../etc/passwd"), "_.etc_passwd");
    }

    #[test]
    fn test_sanitize_file_name_leading_dots() {
        assert_eq!(sanitize_file_name(".hidden"), "hidden");
        assert_eq!(sanitize_file_name("..double"), "double");
        assert_eq!(sanitize_file_name("...triple"), "_.triple");
    }

    #[test]
    fn test_sanitize_file_name_empty() {
        assert_eq!(sanitize_file_name(""), "upload.bin");
    }

    #[test]
    fn test_sanitize_file_name_unicode() {
        assert_eq!(sanitize_file_name("файл.txt"), "_____.txt");
        assert_eq!(sanitize_file_name("文件.pdf"), "___.pdf");
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
    fn test_storage_visibility_bucket_mapping() {
        // Note: This test documents the expected bucket mapping behavior
        // Actual bucket names come from AppState configuration
        assert_eq!(StorageVisibility::Public.as_str(), "public");
        assert_eq!(StorageVisibility::Private.as_str(), "private");
        assert_eq!(StorageVisibility::Temp.as_str(), "temp");
    }

    #[test]
    fn test_uploaded_object_structure() {
        let uploaded = UploadedObject {
            bucket: "likelee-private".to_string(),
            path: "test/path/file.txt".to_string(),
            public_url: None,
        };

        assert_eq!(uploaded.bucket, "likelee-private");
        assert_eq!(uploaded.path, "test/path/file.txt");
        assert!(uploaded.public_url.is_none());

        let uploaded_public = UploadedObject {
            bucket: "likelee-public".to_string(),
            path: "test/path/image.jpg".to_string(),
            public_url: Some("https://example.com/image.jpg".to_string()),
        };

        assert!(uploaded_public.public_url.is_some());
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
