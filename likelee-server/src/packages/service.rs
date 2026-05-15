use crate::agencies::talent_refs::resolve_agency_talent_ref;
use crate::state::AppState;
use axum::http::StatusCode;

pub async fn resolve_effective_agency_talent_id(
    state: &AppState,
    agency_id: &str,
    input_id: &str,
) -> Result<String, (StatusCode, String)> {
    let talent_ref = resolve_agency_talent_ref(state, agency_id, input_id).await?;
    Ok(talent_ref
        .agency_user_id
        .clone()
        .unwrap_or_else(|| talent_ref.id.clone()))
}

pub async fn fetch_agency_name(state: &AppState, agency_id: &str) -> Result<String, String> {
    let resp = state
        .pg
        .from("agencies")
        .select("agency_name")
        .eq("id", agency_id)
        .execute()
        .await
        .map_err(|e| e.to_string())?;

    let text = resp.text().await.map_err(|e| e.to_string())?;
    let agencies: Vec<serde_json::Value> =
        serde_json::from_str(&text).map_err(|e| e.to_string())?;

    agencies
        .first()
        .and_then(|a| a["agency_name"].as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| "Agency not found".to_string())
}
