use crate::state::AppState;
use axum::http::StatusCode;
use std::collections::HashSet;

use super::dto::DigitalRow;

fn try_parse_json_string_array(s: &str) -> Option<Vec<String>> {
    let t = s.trim();
    if !t.starts_with('[') {
        return None;
    }
    serde_json::from_str::<Vec<String>>(t).ok()
}

fn try_parse_postgres_array_literal(s: &str) -> Option<Vec<String>> {
    let t = s.trim();
    if !(t.starts_with('{') && t.ends_with('}')) {
        return None;
    }
    let inner = &t[1..t.len().saturating_sub(1)];
    if inner.trim().is_empty() {
        return Some(vec![]);
    }

    let mut out: Vec<String> = Vec::new();
    let mut cur = String::new();
    let mut in_quotes = false;
    let mut escape = false;

    for ch in inner.chars() {
        if escape {
            cur.push(ch);
            escape = false;
            continue;
        }
        if ch == '\\' {
            escape = true;
            continue;
        }
        if ch == '"' {
            in_quotes = !in_quotes;
            continue;
        }
        if ch == ',' && !in_quotes {
            let v = cur.trim();
            if !v.is_empty() {
                out.push(v.to_string());
            }
            cur.clear();
            continue;
        }
        cur.push(ch);
    }
    let v = cur.trim();
    if !v.is_empty() {
        out.push(v.to_string());
    }

    Some(out)
}

fn parse_string_array_value(v: &serde_json::Value) -> Vec<String> {
    if let Some(arr) = v.as_array() {
        return arr
            .iter()
            .filter_map(|x| x.as_str())
            .map(|s| s.to_string())
            .collect();
    }
    if let Some(s) = v.as_str() {
        if let Some(arr) = try_parse_json_string_array(s) {
            return arr;
        }
        if let Some(arr) = try_parse_postgres_array_literal(s) {
            return arr;
        }
        if s.trim().is_empty() {
            return vec![];
        }
        return vec![s.to_string()];
    }
    vec![]
}

fn normalize_asset_url(s: &str) -> String {
    let t = s.trim();
    if let Some(i) = t.find("://") {
        let (scheme, rest) = t.split_at(i + 3);
        let mut r = rest.to_string();
        while r.contains("//") {
            r = r.replace("//", "/");
        }
        return format!("{}{}", scheme, r);
    }
    let mut r = t.to_string();
    while r.contains("//") {
        r = r.replace("//", "/");
    }
    r
}

pub async fn ensure_talent_access(
    state: &AppState,
    agency_id: &str,
    talent_id: &str,
) -> Result<(), (StatusCode, String)> {
    let resp = state
        .pg
        .from("agency_users")
        .select("id")
        .eq("id", talent_id)
        .eq("agency_id", agency_id)
        .eq("role", "talent")
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let rows: serde_json::Value = serde_json::from_str(&text).unwrap_or(serde_json::json!([]));

    let ok = rows.as_array().map(|a| !a.is_empty()).unwrap_or(false);
    if ok {
        Ok(())
    } else {
        Err((StatusCode::FORBIDDEN, "Forbidden".to_string()))
    }
}

pub async fn list_talent_digitals(
    state: &AppState,
    talent_id: &str,
) -> Result<Vec<DigitalRow>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("digitals")
        .select("*")
        .eq("talent_id", talent_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let rows: Vec<DigitalRow> = serde_json::from_str(&text).unwrap_or_default();
    Ok(rows)
}

pub async fn create_talent_digital(
    state: &AppState,
    _talent_id: &str,
    body: serde_json::Value,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let resp = state
        .pg
        .from("digitals")
        .insert(body.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let err_text = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err_text));
    }

    let inserted_text = resp.text().await.unwrap_or_default();
    let inserted_val: serde_json::Value =
        serde_json::from_str(&inserted_text).unwrap_or(serde_json::json!({ "status": "ok" }));
    Ok(inserted_val)
}

pub async fn update_digital(
    state: &AppState,
    id: &str,
    v: serde_json::Value,
) -> Result<serde_json::Value, (StatusCode, String)> {
    let resp = state
        .pg
        .from("digitals")
        .eq("id", id)
        .update(v.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !resp.status().is_success() {
        let err_text = resp.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err_text));
    }

    let updated_text = resp.text().await.unwrap_or_default();
    let updated_val: serde_json::Value =
        serde_json::from_str(&updated_text).unwrap_or(serde_json::json!({ "status": "ok" }));
    Ok(updated_val)
}

pub async fn get_digital_by_id(
    state: &AppState,
    id: &str,
) -> Result<DigitalRow, (StatusCode, String)> {
    let resp = state
        .pg
        .from("digitals")
        .select("*")
        .eq("id", id)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let rows: Vec<DigitalRow> = serde_json::from_str(&text).unwrap_or_default();
    rows.into_iter()
        .next()
        .ok_or((StatusCode::NOT_FOUND, "not_found".to_string()))
}

pub async fn list_agency_digitals(
    state: &AppState,
    agency_id: &str,
) -> Result<Vec<DigitalRow>, (StatusCode, String)> {
    let talent_resp = state
        .pg
        .from("agency_users")
        .select("id")
        .eq("agency_id", agency_id)
        .eq("role", "talent")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let talent_text = talent_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let talent_rows: serde_json::Value =
        serde_json::from_str(&talent_text).unwrap_or(serde_json::json!([]));
    let mut talent_ids: HashSet<String> = HashSet::new();
    if let Some(arr) = talent_rows.as_array() {
        for v in arr {
            if let Some(id) = v.get("id").and_then(|x| x.as_str()) {
                talent_ids.insert(id.to_string());
            }
        }
    }

    let resp = state
        .pg
        .from("digitals")
        .select("*")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut rows: Vec<DigitalRow> = serde_json::from_str(&text).unwrap_or_default();
    rows.retain(|d| talent_ids.contains(&d.talent_id));
    Ok(rows)
}

pub async fn recompute_total_assets_for_talent(
    state: &AppState,
    agency_id: &str,
    talent_id: &str,
) -> Result<i32, (StatusCode, String)> {
    let mut assets: HashSet<String> = HashSet::new();

    let talent_resp = state
        .pg
        .from("agency_users")
        .select("profile_photo_url,photo_urls")
        .eq("id", talent_id)
        .eq("agency_id", agency_id)
        .eq("role", "talent")
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let talent_text = talent_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let talent_rows: serde_json::Value =
        serde_json::from_str(&talent_text).unwrap_or(serde_json::json!([]));
    let talent = talent_rows
        .as_array()
        .and_then(|a| a.first())
        .cloned()
        .unwrap_or_else(|| serde_json::json!({}));

    if let Some(url) = talent
        .get("profile_photo_url")
        .and_then(|v| v.as_str())
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
    {
        assets.insert(normalize_asset_url(url));
    }

    if let Some(arr) = talent.get("photo_urls").and_then(|v| v.as_array()) {
        for u in arr.iter().filter_map(|x| x.as_str()) {
            let t = u.trim();
            if !t.is_empty() {
                assets.insert(normalize_asset_url(t));
            }
        }
    } else if let Some(v) = talent.get("photo_urls") {
        for u in parse_string_array_value(v).iter() {
            let t = u.trim();
            if !t.is_empty() {
                assets.insert(normalize_asset_url(t));
            }
        }
    }

    let digitals_resp = state
        .pg
        .from("digitals")
        .select("photo_urls,comp_card_url")
        .eq("talent_id", talent_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let digitals_text = digitals_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let digitals_rows: serde_json::Value =
        serde_json::from_str(&digitals_text).unwrap_or(serde_json::json!([]));
    if let Some(arr) = digitals_rows.as_array() {
        for r in arr {
            if let Some(v) = r.get("photo_urls") {
                for u in parse_string_array_value(v).iter() {
                    let t = u.trim();
                    if !t.is_empty() {
                        assets.insert(normalize_asset_url(t));
                    }
                }
            }

            if let Some(cc) = r
                .get("comp_card_url")
                .and_then(|v| v.as_str())
                .map(|s| s.trim())
                .filter(|s| !s.is_empty())
            {
                assets.insert(normalize_asset_url(cc));
            }
        }
    }

    let total_assets = assets.len() as i32;
    let body = serde_json::json!({ "total_assets": total_assets });
    let upd = state
        .pg
        .from("agency_users")
        .eq("id", talent_id)
        .eq("agency_id", agency_id)
        .update(body.to_string())
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !upd.status().is_success() {
        let err = upd.text().await.unwrap_or_default();
        return Err((StatusCode::INTERNAL_SERVER_ERROR, err));
    }

    Ok(total_assets)
}
