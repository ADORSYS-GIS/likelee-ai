use crate::state::AppState;
use axum::http::StatusCode;

pub async fn list_reference_images(
    state: &AppState,
    user_id: &str,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let req = state
        .pg
        .from("reference_images")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at.desc");

    let resp = req.execute().await.map_err(|e| {
        let m = e.to_string();
        (StatusCode::BAD_GATEWAY, m)
    })?;

    let status = resp.status();
    let text = resp.text().await.unwrap_or_else(|_| "[]".into());

    if !status.is_success() {
        return Err(crate::errors::sanitize_db_error(status.as_u16(), text));
    }

    let json: serde_json::Value = serde_json::from_str(&text).unwrap_or(serde_json::json!([]));
    Ok(json)
}

pub async fn get_reference_images_for_section(
    state: &AppState,
    user_id: &str,
    section_id: &str,
) -> Result<Vec<serde_json::Value>, (StatusCode, String)> {
    let rows_resp = state
        .pg
        .from("reference_images")
        .select("id,storage_bucket,storage_path")
        .eq("user_id", user_id)
        .eq("section_id", section_id)
        .order("created_at.desc")
        .execute()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    let rows_status = rows_resp.status();
    let rows_text = rows_resp
        .text()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    if !rows_status.is_success() {
        return Err(crate::errors::sanitize_db_error(
            rows_status.as_u16(),
            rows_text,
        ));
    }

    let rows: Vec<serde_json::Value> = serde_json::from_str(&rows_text).unwrap_or_else(|_| vec![]);
    Ok(rows)
}

pub async fn delete_reference_images_for_section(
    state: &AppState,
    user_id: &str,
    section_id: &str,
) -> Result<(), (StatusCode, String)> {
    let del_resp = state
        .pg
        .from("reference_images")
        .delete()
        .eq("user_id", user_id)
        .eq("section_id", section_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    let del_status = del_resp.status();
    let del_text = del_resp
        .text()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    if !del_status.is_success() {
        return Err(crate::errors::sanitize_db_error(
            del_status.as_u16(),
            del_text,
        ));
    }

    Ok(())
}

pub async fn insert_reference_image(
    state: &AppState,
    payload: &serde_json::Value,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let resp = state
        .pg
        .from("reference_images")
        .insert(payload.to_string())
        .select("id")
        .execute()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    let status = resp.status();
    let text = resp.text().await.unwrap_or_else(|_| "[]".into());
    if !status.is_success() {
        return Err(crate::errors::sanitize_db_error(status.as_u16(), text));
    }

    let value: serde_json::Value = serde_json::from_str(&text).unwrap_or(serde_json::json!([]));
    Ok(value)
}
