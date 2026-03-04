use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Provider {
    Fal,
    Higgsfield,
    Kive,
}

impl Provider {
    pub fn as_str(&self) -> &str {
        match self {
            Provider::Fal => "fal",
            Provider::Higgsfield => "higgsfield",
            Provider::Kive => "kive",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GenerationType {
    Video,
    Image,
    Avatar,
    ImageToVideo,
}

impl GenerationType {
    pub fn as_str(&self) -> &str {
        match self {
            GenerationType::Video => "video",
            GenerationType::Image => "image",
            GenerationType::Avatar => "avatar",
            GenerationType::ImageToVideo => "image_to_video",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum GenerationStatus {
    Draft,
    Pending,
    Processing,
    Completed,
    Failed,
    Cancelled,
}

impl GenerationStatus {
    pub fn as_str(&self) -> &str {
        match self {
            GenerationStatus::Draft => "draft",
            GenerationStatus::Pending => "pending",
            GenerationStatus::Processing => "processing",
            GenerationStatus::Completed => "completed",
            GenerationStatus::Failed => "failed",
            GenerationStatus::Cancelled => "cancelled",
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GenerateRequest {
    pub provider: Provider,
    pub model: String,
    pub generation_type: GenerationType,
    pub input_params: JsonValue,
    pub campaign_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GenerateResponse {
    pub generation_id: String,
    pub status: GenerationStatus,
    pub credits_used: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct JobStatusResponse {
    pub generation_id: String,
    pub status: GenerationStatus,
    pub output_urls: Vec<String>,
    pub output_metadata: Option<JsonValue>,
    pub error_message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WalletResponse {
    pub balance: i64,
    pub user_id: String,
    #[serde(default)]
    pub current_plan: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransactionResponse {
    pub id: String,
    pub delta: i64,
    pub balance_after: i64,
    pub reason: String,
    pub provider: Option<String>,
    pub generation_id: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProviderJobStatus {
    pub status: GenerationStatus,
    pub output_urls: Vec<String>,
    pub output_metadata: Option<JsonValue>,
    pub error_message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProviderCost {
    pub provider: String,
    pub model: String,
    pub generation_type: String,
    pub cost_per_generation: i64,
}
