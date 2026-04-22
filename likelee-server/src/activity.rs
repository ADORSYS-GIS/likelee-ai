use crate::config::AppState;
use serde_json::json;

#[allow(clippy::too_many_arguments)]
pub async fn log_activity_event_with_subject(
    state: &AppState,
    brand_id: &str,
    campaign_id: Option<&str>,
    actor_type: &str,
    actor_name: &str,
    event_type: &str,
    description: String,
    subject_table: &str,
    subject_id: Option<&str>,
) {
    if brand_id.trim().is_empty() {
        return;
    }
    let mut payload = serde_json::Map::new();
    payload.insert("brand_id".to_string(), json!(brand_id));
    if let Some(campaign_id) = campaign_id {
        if !campaign_id.trim().is_empty() {
            payload.insert("campaign_id".to_string(), json!(campaign_id));
        }
    }
    payload.insert("actor_type".to_string(), json!(actor_type));
    payload.insert("actor_name".to_string(), json!(actor_name));
    payload.insert("event_type".to_string(), json!(event_type));
    payload.insert("description".to_string(), json!(description));
    payload.insert("type".to_string(), json!(event_type));
    payload.insert("subject_table".to_string(), json!(subject_table));
    let subject_value = subject_id.or(campaign_id).unwrap_or("");
    payload.insert("subject_id".to_string(), json!(subject_value));
    payload.insert("title".to_string(), json!(description));
    payload.insert("subtitle".to_string(), json!(actor_name));
    if let Err(e) = state
        .pg
        .from("brand_activity_events")
        .insert(serde_json::Value::Object(payload).to_string())
        .execute()
        .await
    {
        eprintln!("Failed to log activity event: {}", e);
    }
}

pub async fn log_activity_event(
    state: &AppState,
    brand_id: &str,
    campaign_id: Option<&str>,
    actor_type: &str,
    actor_name: &str,
    event_type: &str,
    description: String,
) {
    log_activity_event_with_subject(
        state,
        brand_id,
        campaign_id,
        actor_type,
        actor_name,
        event_type,
        description,
        "brand_campaigns",
        campaign_id,
    )
    .await;
}
