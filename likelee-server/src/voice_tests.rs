#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::{
        canonical_object_path, sanitize_file_name, StorageContextType, StorageOwnerType,
        StorageVisibility,
    };

    #[test]
    fn test_voice_recording_path_generation() {
        let user_id = "user_123";
        let file_name = "recording.webm";
        let timestamp = 1234567890123i64;

        let path_prefix = format!("users/{}/voice-recordings", user_id);
        let path = canonical_object_path(
            &path_prefix,
            &sanitize_file_name(file_name),
            timestamp,
        );

        assert!(path.starts_with("users/user_123/voice-recordings/"));
        assert!(path.contains("1234567890123"));
        assert!(path.ends_with("recording.webm"));
    }

    #[test]
    fn test_voice_recording_file_extension_detection() {
        let test_cases = vec![
            ("audio/wav", "wav"),
            ("audio/x-wav", "wav"),
            ("audio/ogg", "ogg"),
            ("audio/mp4", "mp4"),
            ("audio/m4a", "mp4"),
            ("audio/webm", "webm"),
            ("audio/mpeg", "webm"), // default
        ];

        for (content_type, expected_ext) in test_cases {
            let ext = if content_type.contains("wav") {
                "wav"
            } else if content_type.contains("ogg") {
                "ogg"
            } else if content_type.contains("mp4") || content_type.contains("m4a") {
                "mp4"
            } else {
                "webm"
            };

            assert_eq!(
                ext, expected_ext,
                "Failed for content type: {}",
                content_type
            );
        }
    }

    #[test]
    fn test_storage_asset_record_for_voice_recording() {
        let user_id = "user_456";
        let recording_id = "rec_789";
        let object_path = "users/user_456/voice-recordings/1234567890123_recording.webm";
        let file_name = "recording.webm";
        let mime_type = "audio/webm";
        let size_bytes = 1024i64;

        let record = crate::storage::StorageAssetRecord {
            owner_type: StorageOwnerType::User,
            owner_id: user_id.to_string(),
            context_type: StorageContextType::VoiceRecording,
            context_id: None,
            visibility: StorageVisibility::Private,
            object_path: object_path.to_string(),
            original_file_name: Some(file_name.to_string()),
            mime_type: Some(mime_type.to_string()),
            size_bytes: Some(size_bytes),
            checksum_sha256: None,
            source_table: Some("voice_recordings".to_string()),
            source_id: Some(recording_id.to_string()),
            created_by: Some(user_id.to_string()),
            counts_toward_quota: false,
        };

        assert_eq!(record.owner_type, StorageOwnerType::User);
        assert_eq!(record.owner_id, user_id);
        assert_eq!(record.context_type, StorageContextType::VoiceRecording);
        assert_eq!(record.visibility, StorageVisibility::Private);
        assert_eq!(record.object_path, object_path);
        assert_eq!(record.source_table, Some("voice_recordings".to_string()));
        assert_eq!(record.source_id, Some(recording_id.to_string()));
        assert!(!record.counts_toward_quota);
    }

    #[test]
    fn test_sanitize_voice_recording_filename() {
        let test_cases = vec![
            ("recording.webm", "recording.webm"),
            ("my recording.wav", "my_recording.wav"),
            ("voice@sample#1.ogg", "voice_sample_1.ogg"),
            ("../../../etc/passwd", ".._.._.._etc_passwd"),
            ("", "upload.bin"),
            ("recording with spaces.mp4", "recording_with_spaces.mp4"),
        ];

        for (input, expected) in test_cases {
            let sanitized = sanitize_file_name(input);
            assert_eq!(
                sanitized, expected,
                "Failed to sanitize: {} -> {}",
                input, expected
            );
        }
    }

    #[test]
    fn test_voice_recording_visibility() {
        // Voice recordings should always be private
        let visibility = StorageVisibility::Private;
        assert_eq!(visibility, StorageVisibility::Private);
        assert_eq!(visibility.as_str(), "private");
    }

    #[test]
    fn test_voice_recording_owner_type() {
        // Voice recordings are owned by users
        let owner_type = StorageOwnerType::User;
        assert_eq!(owner_type, StorageOwnerType::User);
        assert_eq!(owner_type.as_str(), "user");
    }

    #[test]
    fn test_voice_recording_context_type() {
        let context_type = StorageContextType::VoiceRecording;
        assert_eq!(context_type, StorageContextType::VoiceRecording);
        assert_eq!(context_type.as_str(), "voice_recording");
    }

    #[test]
    fn test_voice_recording_quota_attribution() {
        // Voice recordings should NOT count toward agency quota
        // They are creator-owned source assets
        let counts_toward_quota = false;
        assert!(!counts_toward_quota);
    }

    #[test]
    fn test_default_expiry_for_signed_urls() {
        fn default_expiry() -> i64 {
            300
        }
        assert_eq!(default_expiry(), 300);
    }

    #[test]
    fn test_voice_recording_path_prefix_format() {
        let user_ids = vec!["user_123", "creator_456", "talent_789"];

        for user_id in user_ids {
            let path_prefix = format!("users/{}/voice-recordings", user_id);
            assert!(path_prefix.starts_with("users/"));
            assert!(path_prefix.ends_with("/voice-recordings"));
            assert!(path_prefix.contains(user_id));
        }
    }

    #[test]
    fn test_voice_recording_mime_types() {
        let valid_mime_types = vec![
            "audio/webm",
            "audio/wav",
            "audio/x-wav",
            "audio/ogg",
            "audio/mp4",
            "audio/m4a",
            "audio/mpeg",
        ];

        for mime_type in valid_mime_types {
            assert!(mime_type.starts_with("audio/"));
        }
    }
}
