/// Parses a raw User-Agent string into a `(device_label, device_type)` tuple.
///
/// # Postconditions
/// - `device_label` is never empty — falls back to `"Unknown Device"`
/// - `device_type` ∈ `{"desktop", "mobile", "tablet", "unknown"}`
/// - No side effects; deterministic for the same input
pub fn parse_user_agent(ua: &str) -> (String, String) {
    let ua_lower = ua.to_lowercase();

    if ua_lower.is_empty() {
        return ("Unknown Device".to_string(), "unknown".to_string());
    }

    // ── Device type detection ─────────────────────────────────────────────────
    let device_type = if ua_lower.contains("ipad")
        || ua_lower.contains("tablet")
        || (ua_lower.contains("android") && !ua_lower.contains("mobile"))
    {
        "tablet"
    } else if ua_lower.contains("mobile")
        || ua_lower.contains("iphone")
        || ua_lower.contains("ipod")
        || ua_lower.contains("android")
        || ua_lower.contains("blackberry")
        || ua_lower.contains("windows phone")
    {
        "mobile"
    } else if ua_lower.contains("mozilla")
        || ua_lower.contains("chrome")
        || ua_lower.contains("safari")
        || ua_lower.contains("firefox")
        || ua_lower.contains("edge")
        || ua_lower.contains("opera")
        || ua_lower.contains("windows")
        || ua_lower.contains("macintosh")
        || ua_lower.contains("linux")
    {
        "desktop"
    } else {
        "unknown"
    };

    // ── Browser detection ─────────────────────────────────────────────────────
    let browser = if ua_lower.contains("edg/") || ua_lower.contains("edge/") {
        "Edge"
    } else if ua_lower.contains("opr/") || ua_lower.contains("opera") {
        "Opera"
    } else if ua_lower.contains("chrome") && !ua_lower.contains("chromium") {
        "Chrome"
    } else if ua_lower.contains("chromium") {
        "Chromium"
    } else if ua_lower.contains("firefox") {
        "Firefox"
    } else if ua_lower.contains("safari") && !ua_lower.contains("chrome") {
        "Safari"
    } else if ua_lower.contains("msie") || ua_lower.contains("trident") {
        "Internet Explorer"
    } else {
        ""
    };

    // ── OS / platform detection ───────────────────────────────────────────────
    let os = if ua_lower.contains("iphone") {
        "iPhone"
    } else if ua_lower.contains("ipad") {
        "iPad"
    } else if ua_lower.contains("ipod") {
        "iPod"
    } else if ua_lower.contains("android") {
        "Android"
    } else if ua_lower.contains("windows phone") {
        "Windows Phone"
    } else if ua_lower.contains("windows") {
        "Windows"
    } else if ua_lower.contains("macintosh") || ua_lower.contains("mac os") {
        "macOS"
    } else if ua_lower.contains("linux") {
        "Linux"
    } else if ua_lower.contains("cros") {
        "ChromeOS"
    } else {
        ""
    };

    // ── Compose label ─────────────────────────────────────────────────────────
    let label = match (browser, os) {
        ("", "") => "Unknown Device".to_string(),
        ("", os) => os.to_string(),
        (browser, "") => browser.to_string(),
        (browser, os) => format!("{} on {}", browser, os),
    };

    (label, device_type.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    const VALID_DEVICE_TYPES: &[&str] = &["desktop", "mobile", "tablet", "unknown"];

    fn assert_valid(ua: &str) {
        let (label, device_type) = parse_user_agent(ua);
        assert!(!label.is_empty(), "label must not be empty for UA: {ua:?}");
        assert!(
            VALID_DEVICE_TYPES.contains(&device_type.as_str()),
            "device_type '{device_type}' is not valid for UA: {ua:?}"
        );
    }

    #[test]
    fn test_chrome_macos() {
        let ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        let (label, device_type) = parse_user_agent(ua);
        assert_eq!(device_type, "desktop");
        assert!(label.contains("Chrome"), "expected Chrome in label, got: {label}");
        assert!(label.contains("macOS"), "expected macOS in label, got: {label}");
    }

    #[test]
    fn test_safari_iphone() {
        let ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
        let (label, device_type) = parse_user_agent(ua);
        assert_eq!(device_type, "mobile");
        assert!(label.contains("Safari"), "expected Safari in label, got: {label}");
        assert!(label.contains("iPhone"), "expected iPhone in label, got: {label}");
    }

    #[test]
    fn test_firefox_windows() {
        let ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0";
        let (label, device_type) = parse_user_agent(ua);
        assert_eq!(device_type, "desktop");
        assert!(label.contains("Firefox"), "expected Firefox in label, got: {label}");
        assert!(label.contains("Windows"), "expected Windows in label, got: {label}");
    }

    #[test]
    fn test_android_chrome_mobile() {
        let ua = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
        let (label, device_type) = parse_user_agent(ua);
        assert_eq!(device_type, "mobile");
        assert!(label.contains("Chrome"), "expected Chrome in label, got: {label}");
        assert!(label.contains("Android"), "expected Android in label, got: {label}");
    }

    #[test]
    fn test_ipad_safari() {
        let ua = "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
        let (label, device_type) = parse_user_agent(ua);
        assert_eq!(device_type, "tablet");
        assert!(!label.is_empty());
    }

    #[test]
    fn test_empty_string() {
        let (label, device_type) = parse_user_agent("");
        assert_eq!(label, "Unknown Device");
        assert_eq!(device_type, "unknown");
    }

    #[test]
    fn test_garbage_input() {
        assert_valid("zzz-not-a-real-ua-string-!!!###");
    }

    #[test]
    fn test_all_common_uas_are_valid() {
        let uas = [
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Firefox/120.0",
            "Mozilla/5.0 (Linux; Android 13) Chrome/120.0.0.0 Mobile Safari/537.36",
            "Mozilla/5.0 (iPad; CPU OS 17_0) Safari/604.1",
            "",
            "garbage",
        ];
        for ua in uas {
            assert_valid(ua);
        }
    }
}
