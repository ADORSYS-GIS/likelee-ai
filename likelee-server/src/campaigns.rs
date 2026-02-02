use crate::{auth::AuthUser, config::AppState};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use serde_json::json;

#[derive(Deserialize)]
pub struct UpdateCampaignSplitRequest {
    pub payment_amount: Option<f64>,
    pub agency_percent: Option<f64>,
    pub talent_percent: Option<f64>,
}

pub async fn update_campaign_split(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<UpdateCampaignSplitRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // Ensure this campaign row is within the agency scope.
    // Scope is determined by the talent record (campaigns.talent_id -> agency_users.agency_id).
    let campaign_resp = state
        .pg
        .from("campaigns")
        .select("id,talent_id")
        .eq("id", &id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !campaign_resp.status().is_success() {
        let err_text = campaign_resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err_text));
    }

    let campaign_text = campaign_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let campaign_rows: serde_json::Value =
        serde_json::from_str(&campaign_text).unwrap_or_else(|_| serde_json::json!([]));
    let campaign_row = campaign_rows
        .as_array()
        .and_then(|a| a.first())
        .cloned()
        .unwrap_or_else(|| json!({}));
    let talent_id = campaign_row
        .get("talent_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    if talent_id.is_empty() {
        return Err((StatusCode::NOT_FOUND, "Campaign not found".to_string()));
    }

    let talent_resp = state
        .pg
        .from("agency_users")
        .select("id")
        .eq("id", &talent_id)
        .eq("agency_id", &user.id)
        .eq("role", "talent")
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !talent_resp.status().is_success() {
        let err_text = talent_resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err_text));
    }

    let talent_text = talent_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let talent_rows: serde_json::Value =
        serde_json::from_str(&talent_text).unwrap_or_else(|_| serde_json::json!([]));
    if talent_rows.as_array().map(|a| a.is_empty()).unwrap_or(true) {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    let mut v = json!({
        "payment_amount": payload.payment_amount,
        "agency_percent": payload.agency_percent,
        "talent_percent": payload.talent_percent,
    });

    if let serde_json::Value::Object(ref mut map) = v {
        let null_keys: Vec<String> = map
            .iter()
            .filter_map(|(k, val)| if val.is_null() { Some(k.clone()) } else { None })
            .collect();
        for k in null_keys {
            map.remove(&k);
        }
    }

    if v.as_object().map(|m| m.is_empty()).unwrap_or(true) {
        return Err((StatusCode::BAD_REQUEST, "No fields to update".to_string()));
    }

    let resp = state
        .pg
        .from("campaigns")
        .eq("id", &id)
        .update(v.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let err_text = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err_text));
    }

    // Return updated row including computed cents
    let get_resp = state
        .pg
        .from("campaigns")
        .select("id,payment_amount,agency_percent,talent_percent,agency_earnings_cents,talent_earnings_cents")
        .eq("id", &id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !get_resp.status().is_success() {
        let err_text = get_resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err_text));
    }

    let get_text = get_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let rows: serde_json::Value = serde_json::from_str(&get_text).unwrap_or(json!([]));
    let out = rows
        .as_array()
        .and_then(|a| a.first())
        .cloned()
        .unwrap_or_else(|| json!({}));
    Ok(Json(out))
}
