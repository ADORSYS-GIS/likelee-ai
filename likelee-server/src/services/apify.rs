use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct InstagramScraperInput {
    #[serde(rename = "usernames")]
    pub handles: Vec<String>,
    pub results_limit: Option<i32>,
}

#[derive(Debug, Deserialize, Clone, Serialize)]
pub struct InstagramProfileData {
    pub username: Option<String>,
    #[serde(default)]
    pub followers: Option<i64>,
    #[serde(default)]
    pub following: Option<i64>,
    #[serde(default)]
    pub bio: Option<String>,
    #[serde(default)]
    pub profile_pic_url: Option<String>,
    #[serde(default)]
    pub external_url: Option<String>,
    #[serde(default)]
    pub posts_count: Option<i64>,
    #[serde(default)]
    pub engagement_rate: Option<f64>,
    #[serde(default)]
    pub avg_likes: Option<i64>,
    #[serde(default)]
    pub avg_comments: Option<i64>,
    #[serde(default)]
    pub is_verified: Option<bool>,
    #[serde(default)]
    pub is_private: Option<bool>,
}

impl InstagramProfileData {
    pub fn from_apify_raw(raw: &serde_json::Value) -> Self {
        let get_str = |key: &str| -> Option<String> {
            raw.get(key).and_then(|v| v.as_str()).map(|s| s.to_string())
        };

        let get_i64 = |key: &str| -> Option<i64> { raw.get(key).and_then(|v| v.as_i64()) };

        let get_i64_from_string_or_number = |key: &str| -> Option<i64> {
            raw.get(key).and_then(|v| {
                if let Some(n) = v.as_i64() {
                    Some(n)
                } else if let Some(s) = v.as_str() {
                    s.parse::<i64>().ok()
                } else {
                    v.as_f64().map(|f| f as i64)
                }
            })
        };

        let get_f64 = |key: &str| -> Option<f64> { raw.get(key).and_then(|v| v.as_f64()) };

        let get_bool = |key: &str| -> Option<bool> { raw.get(key).and_then(|v| v.as_bool()) };

        Self {
            username: get_str("username")
                .or_else(|| get_str("ownerUsername"))
                .or_else(|| get_str("fullName")),
            followers: get_i64_from_string_or_number("followers")
                .or_else(|| get_i64_from_string_or_number("followersCount")),
            following: get_i64_from_string_or_number("following")
                .or_else(|| get_i64_from_string_or_number("followsCount")),
            bio: get_str("bio").or_else(|| get_str("biography")),
            profile_pic_url: get_str("profile_pic_url")
                .or_else(|| get_str("profilePicUrl"))
                .or_else(|| get_str("profilePicUrlHD")),
            external_url: get_str("external_url").or_else(|| get_str("externalUrl")),
            posts_count: get_i64_from_string_or_number("posts_count")
                .or_else(|| get_i64_from_string_or_number("postsCount")),
            engagement_rate: get_f64("engagement_rate"),
            avg_likes: get_i64("avg_likes"),
            avg_comments: get_i64("avg_comments"),
            is_verified: get_bool("is_verified").or_else(|| get_bool("verified")),
            is_private: get_bool("is_private").or_else(|| get_bool("private")),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct ApifyRunData {
    pub id: String,
    pub status: String,
    #[serde(default)]
    pub default_dataset_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ApifyRunResponse {
    pub data: ApifyRunData,
}

pub struct ApifyService {
    client: Client,
    api_token: String,
    actor_id: String,
}

impl ApifyService {
    pub fn new(api_token: String, actor_id: String) -> Self {
        Self {
            client: Client::new(),
            api_token,
            actor_id,
        }
    }

    pub async fn scrape_profiles(&self, handles: Vec<String>) -> Result<ApifyRunResponse, String> {
        let input = InstagramScraperInput {
            handles,
            results_limit: Some(1),
        };

        let url = format!(
            "https://api.apify.com/v2/acts/{}/runs?token={}",
            self.actor_id, self.api_token
        );

        let response = self
            .client
            .post(&url)
            .json(&input)
            .send()
            .await
            .map_err(|e| format!("Failed to start Apify run: {}", e))?;

        if !response.status().is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(format!("Apify API error: {}", body));
        }

        let text = response
            .text()
            .await
            .map_err(|e| format!("Failed to read response body: {}", e))?;

        serde_json::from_str::<ApifyRunResponse>(&text)
            .map_err(|e| format!("Failed to parse Apify response: {}. Raw: {}", e, text))
    }

    pub async fn get_run_results(
        &self,
        dataset_id: &str,
    ) -> Result<Vec<InstagramProfileData>, String> {
        let url = format!(
            "https://api.apify.com/v2/datasets/{}/items?token={}",
            dataset_id, self.api_token
        );

        let response = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Failed to fetch Apify results: {}", e))?;

        if !response.status().is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(format!("Apify API error: {}", body));
        }

        let text = response
            .text()
            .await
            .map_err(|e| format!("Failed to read response body: {}", e))?;

        let raw_items: Vec<serde_json::Value> = serde_json::from_str(&text)
            .map_err(|e| format!("Failed to parse Apify results: {}. Raw: {}", e, text))?;

        Ok(raw_items
            .iter()
            .map(InstagramProfileData::from_apify_raw)
            .collect())
    }

    pub async fn scrape_and_wait(
        &self,
        handle: String,
    ) -> Result<Option<InstagramProfileData>, String> {
        let run = self.scrape_profiles(vec![handle.clone()]).await?;

        let max_attempts = 12;
        let poll_interval = std::time::Duration::from_secs(5);

        for _attempt in 0..max_attempts {
            tokio::time::sleep(poll_interval).await;

            let status_url = format!(
                "https://api.apify.com/v2/actor-runs/{}?token={}",
                run.data.id, self.api_token
            );

            let status_resp = self
                .client
                .get(&status_url)
                .send()
                .await
                .map_err(|e| format!("Failed to check run status: {}", e))?;

            let status_body = status_resp
                .text()
                .await
                .map_err(|e| format!("Failed to read status body: {}", e))?;

            let status_json: serde_json::Value = serde_json::from_str(&status_body)
                .map_err(|e| format!("Failed to parse status: {}", e))?;

            let current_status = status_json
                .get("data")
                .and_then(|d| d.get("status"))
                .and_then(|s| s.as_str())
                .unwrap_or("UNKNOWN");

            match current_status {
                "SUCCEEDED" => {
                    let dataset_id = status_json
                        .get("data")
                        .and_then(|d| d.get("defaultDatasetId"))
                        .and_then(|d| d.as_str())
                        .unwrap_or(run.data.default_dataset_id.as_deref().unwrap_or(""));

                    if dataset_id.is_empty() {
                        return Err("No dataset ID available".to_string());
                    }

                    let results = self.get_run_results(dataset_id).await?;
                    return Ok(results.into_iter().next());
                }
                "FAILED" | "ABORTED" | "TIMED-OUT" => {
                    return Err(format!("Apify run ended with status: {}", current_status));
                }
                _ => {}
            }
        }

        Err("Apify run timed out after 60 seconds".to_string())
    }
}
