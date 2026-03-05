use super::types::{GenerationStatus, ProviderJobStatus};
use anyhow::{anyhow, Result};
use serde_json::{json, Value as JsonValue};
use tracing::{info, warn};

/// Returned from a successful Fal submission
pub struct FalSubmitResult {
    pub request_id: String,
    /// Full status URL returned by Fal (preferred over reconstructing)
    pub status_url: Option<String>,
    /// Full response URL returned by Fal (preferred over reconstructing)
    pub response_url: Option<String>,
}

/// Submit a generation job to Fal Queue API
pub async fn fal_submit_job(
    api_key: &str,
    api_url: &str,
    model: &str,
    input_params: &JsonValue,
) -> Result<FalSubmitResult> {
    if api_key.is_empty() {
        return Err(anyhow!("FAL_API_KEY not configured"));
    }

    if api_url.trim().is_empty() {
        return Err(anyhow!("FAL_API_URL not configured"));
    }

    let client = reqwest::Client::new();
    let endpoint = format!("{}/{}", api_url.trim_end_matches('/'), model);
    info!(endpoint = %endpoint, "submitting job to fal_submit_job");

    let response = client
        .post(&endpoint)
        .header("Authorization", format!("Key {}", api_key))
        .header("Content-Type", "application/json")
        .json(input_params)
        .send()
        .await?;

    if !response.status().is_success() {
        let error_text = response.text().await?;
        warn!(endpoint = %endpoint, error = %error_text, "fal_submit_job terminal error");
        return Err(anyhow!("Fal API error: {}", error_text));
    }

    let result: JsonValue = response.json().await?;
    info!(result = ?result, "fal_submit_job response received");

    let request_id = result["request_id"]
        .as_str()
        .ok_or_else(|| anyhow!("missing request_id in Fal response"))?
        .to_string();

    let status_url = result["status_url"].as_str().map(String::from);
    let response_url = result["response_url"].as_str().map(String::from);

    Ok(FalSubmitResult {
        request_id,
        status_url,
        response_url,
    })
}

/// Check job status on Fal Queue API.
/// Accepts optional pre-computed status_url and response_url from the submit response
/// to avoid reconstructing paths that may differ from the model ID (subpath stripping).
pub async fn fal_check_status(
    api_key: &str,
    _api_url: &str,
    _model: &str,
    job_id: &str,
    status_url: Option<&str>,
    response_url: Option<&str>,
) -> Result<ProviderJobStatus> {
    if api_key.is_empty() {
        return Err(anyhow!("FAL_API_KEY not configured"));
    }

    let client = reqwest::Client::new();

    // Prefer Fal-provided URLs; fall back to reconstruction only when not stored
    let derived_status_url = status_url.map(String::from).unwrap_or_else(|| {
        warn!(
            job_id = %job_id,
            "fal_check_status: no stored status_url, reconstructing (may fail for subpath models)"
        );
        format!(
            "{}/{}/requests/{}/status",
            _api_url.trim_end_matches('/'),
            _model.trim_matches('/'),
            job_id
        )
    });

    let response = client
        .get(&derived_status_url)
        .header("Authorization", format!("Key {}", api_key))
        .send()
        .await?;

    if !response.status().is_success() {
        let error_text = response.text().await?;
        return Err(anyhow!("Fal API error: {}", error_text));
    }

    let status_result: JsonValue = response.json().await?;
    let mut parsed = parse_fal_status(&status_result)?;

    if matches!(parsed.status, GenerationStatus::Completed) {
        // Use Fal-provided response_url; fall back to removing /status suffix
        let derived_response_url = response_url.map(String::from).unwrap_or_else(|| {
            derived_status_url
                .strip_suffix("/status")
                .unwrap_or(&derived_status_url)
                .to_string()
        });

        let response = client
            .get(&derived_response_url)
            .header("Authorization", format!("Key {}", api_key))
            .send()
            .await?;

        if response.status().is_success() {
            let result: JsonValue = response.json().await.unwrap_or_else(|_| json!({}));
            let urls = extract_fal_output_urls(&result);

            // Extract billing cost from the Fal result so the caller can reconcile credits
            let (cost_credits, inference_secs) = extract_fal_cost_credits(&result);

            // SILENT FAILURE DETECTION:
            // If status is completed but no URLs and very low inference time (< 1s),
            // it's likely a prompt rejection or system error that Fal didn't report as 'failed'.
            if urls.is_empty() && inference_secs < 1.0 {
                warn!(
                    job_id = %job_id,
                    inference_time = %inference_secs,
                    "fal_check_status: job marked COMPLETED but no URLs and low inference time; flagging as FAILED"
                );
                parsed.status = GenerationStatus::Failed;
                parsed.error_message = Some("Silent failure: Job completed with no output and low inference time (likely prompt rejection)".to_string());
            }

            if !urls.is_empty() {
                parsed.output_urls = urls;
            } else if matches!(parsed.status, GenerationStatus::Completed) {
                warn!(
                    "fal_check_status: completed but no output URLs found in result: {:?}",
                    result
                );
            }

            let mut meta = result.clone();
            if let Some(obj) = meta.as_object_mut() {
                obj.insert("fal_cost_credits".to_string(), json!(cost_credits));
                obj.insert("fal_inference_time_secs".to_string(), json!(inference_secs));
            }
            parsed.output_metadata = Some(meta);
        } else {
            warn!(
                status = %response.status(),
                url = %derived_response_url,
                "fal_check_status: failed to fetch result for completed job"
            );
            // If we can't fetch the result (404/405/etc), we shouldn't just stay in 'Completed' with no URLs.
            // 422 Unprocessable Entity often happens when the job logic failed but the queue marked it completed.
            if response.status() == 422
                || response.status() == 404
                || response.status() == 405
                || response.status() == 410
            {
                let status_code = response.status();
                let error_body = response
                    .text()
                    .await
                    .unwrap_or_else(|_| "unknown error body".to_string());
                warn!(job_id = %job_id, error_body = %error_body, "fal_check_status: result fetch returned terminal error");

                parsed.status = GenerationStatus::Failed;
                parsed.error_message = Some(format!(
                    "Failed to retrieve result ({}): {}",
                    status_code, error_body
                ));
            }
        }
    }

    Ok(parsed)
}

/// Extract the actual cost in credits from a Fal completed-job response.
///
/// Priority order:
///   1. `fal_cost_usd`                   – direct cost field (some models)
///   2. `metrics.cost`                    – alternate cost field
///   3. `timings.inference_time` × rate  – inference-time heuristic fallback
///      (default rate: 1 credit = $0.01 USD, video ≈ $0.05/s → 5 credits/s)
///
/// Returns `(cost_credits: i64, inference_time_secs: f64)`.
/// Returns `(0, 0.0)` when no billing data is available (caller keeps estimated cost).
fn extract_fal_cost_credits(result: &JsonValue) -> (i64, f64) {
    // 1. Direct cost field in USD
    if let Some(usd) = result.get("fal_cost_usd").and_then(|v| v.as_f64()) {
        let credits = (usd * 100.0).round() as i64; // 1 credit = $0.01
        return (credits.max(1), 0.0);
    }

    // 2. metrics.cost (sometimes present)
    if let Some(usd) = result
        .get("metrics")
        .and_then(|m| m.get("cost"))
        .and_then(|v| v.as_f64())
    {
        let credits = (usd * 100.0).round() as i64;
        return (credits.max(1), 0.0);
    }

    // 3. Inference-time heuristic
    //    timings.inference_time is in seconds; assume ~5 credits/s for video models
    let inference_secs = result
        .get("timings")
        .and_then(|t| t.get("inference_time"))
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);

    if inference_secs > 0.0 {
        let credits = (inference_secs * 5.0).round() as i64;
        return (credits.max(1), inference_secs);
    }

    // No billing data found – return 0 so the caller keeps the estimated cost
    (0, inference_secs)
}

fn parse_fal_status(result: &JsonValue) -> Result<ProviderJobStatus> {
    let status_str = result["status"]
        .as_str()
        .ok_or_else(|| anyhow!("missing status"))?
        .to_lowercase();

    let status = match status_str.as_str() {
        "pending" | "queued" | "in_queue" => GenerationStatus::Pending,
        "processing" | "running" | "in_progress" => GenerationStatus::Processing,
        "completed" | "success" => GenerationStatus::Completed,
        "failed" | "error" => GenerationStatus::Failed,
        _ => GenerationStatus::Processing,
    };

    let error_message = result["error"].as_str().map(String::from);

    Ok(ProviderJobStatus {
        status,
        output_urls: vec![],
        output_metadata: Some(result.clone()),
        error_message,
    })
}

/// Extract output video/image URLs from a Fal result payload.
/// Handles all known Fal response shapes:
///   { video: { url } }
///   { video_url: "..." }
///   { videos: [{ url }] }
///   { video: "url-string" }
///   { output: { url } }
///   { output: "url-string" }
///   { images: [{ url }] }
///   { outputs: [{ url }] }
///   { data: [{ url }] }
fn extract_fal_output_urls(result: &JsonValue) -> Vec<String> {
    let mut urls = Vec::new();

    // Debug logging for troubleshooting missed result URLs
    warn!(
        "extract_fal_output_urls: checking payload keys: {:?}",
        result.as_object().map(|o| o.keys().collect::<Vec<_>>())
    );

    // Helper to extract URL from a field that can be either:
    // 1. A string: "https://..."
    // 2. An object with a url property: { url: "https://..." }
    let add_if_valid = |v: &JsonValue, urls: &mut Vec<String>| {
        if let Some(u) = v.as_str() {
            urls.push(u.to_string());
        } else if let Some(u) = v.get("url").and_then(|u| u.as_str()) {
            urls.push(u.to_string());
        }
    };

    // { video: ... } or { video_url: "..." }
    if let Some(v) = result.get("video") {
        add_if_valid(v, &mut urls);
    }
    if let Some(u) = result.get("video_url").and_then(|u| u.as_str()) {
        urls.push(u.to_string());
    }

    // { image: ... } or { image_url: "..." }
    if let Some(v) = result.get("image") {
        add_if_valid(v, &mut urls);
    }
    if let Some(u) = result.get("image_url").and_then(|u| u.as_str()) {
        urls.push(u.to_string());
    }

    // Arrays: { videos: [...] }, { images: [...] }, { outputs: [...] }, { data: [...] }
    let array_fields = [
        "videos", "images", "outputs", "output", "data", "result", "results",
    ];
    for field in array_fields {
        if let Some(v) = result.get(field) {
            if let Some(arr) = v.as_array() {
                for item in arr {
                    add_if_valid(item, &mut urls);
                }
            } else if field == "output" || field == "result" {
                // Handle { output: { url } } or { output: "url" }
                add_if_valid(v, &mut urls);
            }
        }
    }

    if urls.is_empty() {
        // Log the full result if we found nothing - helps identify new response structures
        warn!(
            "extract_fal_output_urls: found NO URLs in payload: {}",
            result
        );
    } else {
        warn!("extract_fal_output_urls: found {} URLs", urls.len());
    }

    urls.sort();
    urls.dedup();
    urls
}
