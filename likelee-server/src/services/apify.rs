                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            ````````````````````````````````````use reqwest::Client;
use serde::{Deserialize, Serialize};
use tracing::info;

#[derive(Debug, Serialize)]
pub struct InstagramScraperInput {
    pub handles: Vec<String>,
    pub results_limit: Option<i32>,
}

#[derive(Debug, Deserialize, Clone, Serialize)]
pub struct InstagramProfileData {
    pub username: String,
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

#[derive(Debug, Deserialize)]
pub struct ApifyRunResponse {
    pub id: String,
    pub status: String,
    #[serde(default)]
    pub default_dataset_id: Option<String>,
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

    pub async fn scrape_profiles(
        &self,
        handles: Vec<String>,
    ) -> Result<ApifyRunResponse, String> {
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

        response
            .json::<ApifyRunResponse>()
            .await
            .map_err(|e| format!("Failed to parse Apify response: {}", e))
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

        response
            .json::<Vec<InstagramProfileData>>()
            .await
            .map_err(|e| format!("Failed to parse Apify results: {}", e))
    }

    pub async fn scrape_and_wait(
        &self,
        handle: String,
    ) -> Result<Option<InstagramProfileData>, String> {
        info!(%handle, "Starting Instagram profile scrape");

        let run = self.scrape_profiles(vec![handle.clone()]).await?;

        let max_attempts = 12;
        let poll_interval = std::time::Duration::from_secs(5);

        for attempt in 0..max_attempts {
            tokio::time::sleep(poll_interval).await;

            let status_url = format!(
                "https://api.apify.com/v2/actor-runs/{}?token={}",
                run.id, self.api_token
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
                        .unwrap_or(&run.default_dataset_id.as_deref().unwrap_or(""));

                    if dataset_id.is_empty() {
                        return Err("No dataset ID available".to_string());
                    }

                    let results = self.get_run_results(dataset_id).await?;
                    return Ok(results.into_iter().next());
                }
                "FAILED" | "ABORTED" | "TIMED-OUT" => {
                    return Err(format!("Apify run ended with status: {}", current_status));
                }
                _ => {
                    info!(%current_status, attempt, "Run still in progress");
                }
            }
        }

        Err("Apify run timed out after 60 seconds".to_string())
    }
}
