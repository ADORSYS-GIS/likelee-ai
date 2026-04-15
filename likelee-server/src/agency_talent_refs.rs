use crate::config::AppState;
use axum::http::StatusCode;
use serde::Serialize;
use std::collections::{HashMap, HashSet};

#[derive(Debug, Clone, Serialize)]
pub struct AgencyTalentRef {
    pub id: String,
    pub agency_id: String,
    pub relationship_id: Option<String>,
    pub relationship_type: String,
    pub creator_id: Option<String>,
    pub agency_user_id: Option<String>,
    pub full_name: String,
    pub profile_photo_url: Option<String>,
    pub status: String,
    pub performance_tier_name: Option<String>,
    pub contract_controlled: bool,
    pub is_connected_creator: bool,
}

fn preferred_name(
    stage_name: Option<&str>,
    legal_name: Option<&str>,
    creator_name: Option<&str>,
    creator_email: Option<&str>,
) -> String {
    let candidates = [
        stage_name.unwrap_or("").trim(),
        legal_name.unwrap_or("").trim(),
        creator_name.unwrap_or("").trim(),
    ];
    for candidate in candidates {
        if !candidate.is_empty() {
            return candidate.to_string();
        }
    }

    let email = creator_email.unwrap_or("").trim();
    if !email.is_empty() {
        let local = email.split('@').next().unwrap_or("").trim();
        if !local.is_empty() {
            return local.to_string();
        }
        return email.to_string();
    }

    "Unnamed".to_string()
}

async fn active_contract_creator_ids(
    state: &AppState,
    agency_id: &str,
) -> Result<HashSet<String>, (StatusCode, String)> {
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let resp = state
        .pg
        .from("agency_creator_marketplace_contracts")
        .select("creator_id")
        .eq("agency_id", agency_id)
        .eq("status", "active")
        .lte("valid_from", &today)
        .gte("valid_until", &today)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
    let mut out = HashSet::new();
    for row in rows {
        if let Some(creator_id) = row.get("creator_id").and_then(|v| v.as_str()) {
            let creator_id = creator_id.trim();
            if !creator_id.is_empty() {
                out.insert(creator_id.to_string());
            }
        }
    }
    Ok(out)
}

pub async fn list_agency_talent_refs(
    state: &AppState,
    agency_id: &str,
    query: Option<&str>,
) -> Result<Vec<AgencyTalentRef>, (StatusCode, String)> {
    let q = query.unwrap_or("").trim().to_lowercase();

    let relationships_resp = state
        .pg
        .from("agency_talent_relationships")
        .select("id,agency_id,talent_id,creator_id,status,performance_tier_name")
        .eq("agency_id", agency_id)
        .in_("status", vec!["active", "inactive", "pending"])
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let relationships_text = relationships_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let relationships: Vec<serde_json::Value> =
        serde_json::from_str(&relationships_text).unwrap_or_default();

    let users_resp = state
        .pg
        .from("agency_users")
        .select("id,agency_id,creator_id,full_legal_name,stage_name,profile_photo_url,status,role,performance_tier_name")
        .eq("agency_id", agency_id)
        .eq("role", "talent")
        .in_("status", vec!["active", "inactive", "pending"])
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let users_text = users_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let users: Vec<serde_json::Value> = serde_json::from_str(&users_text).unwrap_or_default();

    let mut creator_ids: HashSet<String> = HashSet::new();
    for row in &relationships {
        if let Some(creator_id) = row.get("creator_id").and_then(|v| v.as_str()) {
            let creator_id = creator_id.trim();
            if !creator_id.is_empty() {
                creator_ids.insert(creator_id.to_string());
            }
        }
    }
    for row in &users {
        if let Some(creator_id) = row.get("creator_id").and_then(|v| v.as_str()) {
            let creator_id = creator_id.trim();
            if !creator_id.is_empty() {
                creator_ids.insert(creator_id.to_string());
            }
        }
    }

    let creator_rows: Vec<serde_json::Value> = if creator_ids.is_empty() {
        vec![]
    } else {
        let creator_refs: Vec<&str> = creator_ids.iter().map(|s| s.as_str()).collect();
        let resp = state
            .pg
            .from("creators")
            .select("id,full_name,email,profile_photo_url")
            .in_("id", creator_refs)
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let text = resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        serde_json::from_str(&text).unwrap_or_default()
    };

    let contract_controlled_creator_ids = active_contract_creator_ids(state, agency_id).await?;

    let mut creators_by_id: HashMap<String, serde_json::Value> = HashMap::new();
    for row in creator_rows {
        if let Some(id) = row.get("id").and_then(|v| v.as_str()) {
            let id = id.trim();
            if !id.is_empty() {
                creators_by_id.insert(id.to_string(), row);
            }
        }
    }

    let mut rel_by_talent_id: HashMap<String, serde_json::Value> = HashMap::new();
    let mut rel_by_creator_id: HashMap<String, serde_json::Value> = HashMap::new();
    for row in &relationships {
        if let Some(talent_id) = row.get("talent_id").and_then(|v| v.as_str()) {
            let talent_id = talent_id.trim();
            if !talent_id.is_empty() {
                rel_by_talent_id.insert(talent_id.to_string(), row.clone());
            }
        }
        if let Some(creator_id) = row.get("creator_id").and_then(|v| v.as_str()) {
            let creator_id = creator_id.trim();
            if !creator_id.is_empty() {
                rel_by_creator_id.insert(creator_id.to_string(), row.clone());
            }
        }
    }

    let mut by_key: HashMap<String, AgencyTalentRef> = HashMap::new();

    for row in users {
        let agency_user_id = row
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if agency_user_id.is_empty() {
            continue;
        }
        let creator_id = row
            .get("creator_id")
            .and_then(|v| v.as_str())
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
        let rel_row = rel_by_talent_id.get(&agency_user_id).or_else(|| {
            creator_id
                .as_ref()
                .and_then(|cid| rel_by_creator_id.get(cid))
        });
        let creator_row = creator_id.as_ref().and_then(|cid| creators_by_id.get(cid));
        let full_name = preferred_name(
            row.get("stage_name").and_then(|v| v.as_str()),
            row.get("full_legal_name").and_then(|v| v.as_str()),
            creator_row
                .and_then(|v| v.get("full_name"))
                .and_then(|v| v.as_str()),
            creator_row
                .and_then(|v| v.get("email"))
                .and_then(|v| v.as_str()),
        );
        let key = creator_id.clone().unwrap_or_else(|| agency_user_id.clone());
        let profile_photo_url = row
            .get("profile_photo_url")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .or_else(|| {
                creator_row
                    .and_then(|v| v.get("profile_photo_url"))
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            });
        let performance_tier_name = row
            .get("performance_tier_name")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .or_else(|| {
                rel_row
                    .and_then(|v| v.get("performance_tier_name"))
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            });
        let status = rel_row
            .and_then(|v| v.get("status"))
            .and_then(|v| v.as_str())
            .unwrap_or_else(|| {
                row.get("status")
                    .and_then(|v| v.as_str())
                    .unwrap_or("active")
            })
            .to_string();

        by_key.insert(
            key,
            AgencyTalentRef {
                id: agency_user_id.clone(),
                agency_id: agency_id.to_string(),
                relationship_id: rel_row
                    .and_then(|v| v.get("id"))
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                relationship_type: "internal".to_string(),
                creator_id: creator_id.clone(),
                agency_user_id: Some(agency_user_id),
                full_name,
                profile_photo_url,
                status,
                performance_tier_name,
                contract_controlled: creator_id
                    .as_ref()
                    .map(|cid| contract_controlled_creator_ids.contains(cid))
                    .unwrap_or(false),
                is_connected_creator: false,
            },
        );
    }

    for row in relationships {
        let relationship_id = row
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        let creator_id = row
            .get("creator_id")
            .and_then(|v| v.as_str())
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
        let talent_id = row
            .get("talent_id")
            .and_then(|v| v.as_str())
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
        let key = creator_id
            .clone()
            .or_else(|| talent_id.clone())
            .unwrap_or_default();
        if key.is_empty() || by_key.contains_key(&key) {
            continue;
        }
        let creator_row = creator_id.as_ref().and_then(|cid| creators_by_id.get(cid));
        let full_name = preferred_name(
            None,
            None,
            creator_row
                .and_then(|v| v.get("full_name"))
                .and_then(|v| v.as_str()),
            creator_row
                .and_then(|v| v.get("email"))
                .and_then(|v| v.as_str()),
        );
        by_key.insert(
            key.clone(),
            AgencyTalentRef {
                id: creator_id
                    .clone()
                    .or_else(|| talent_id.clone())
                    .unwrap_or(key),
                agency_id: agency_id.to_string(),
                relationship_id: if relationship_id.is_empty() {
                    None
                } else {
                    Some(relationship_id)
                },
                relationship_type: "marketplace_connected".to_string(),
                creator_id: creator_id.clone(),
                agency_user_id: talent_id.clone(),
                full_name,
                profile_photo_url: creator_row
                    .and_then(|v| v.get("profile_photo_url"))
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                status: row
                    .get("status")
                    .and_then(|v| v.as_str())
                    .unwrap_or("active")
                    .to_string(),
                performance_tier_name: row
                    .get("performance_tier_name")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                contract_controlled: creator_id
                    .as_ref()
                    .map(|cid| contract_controlled_creator_ids.contains(cid))
                    .unwrap_or(false),
                is_connected_creator: true,
            },
        );
    }

    let mut out: Vec<AgencyTalentRef> = by_key
        .into_values()
        .filter(|item| {
            if q.is_empty() {
                return true;
            }
            item.full_name.to_lowercase().contains(&q)
        })
        .collect();
    out.sort_by(|a, b| a.full_name.to_lowercase().cmp(&b.full_name.to_lowercase()));
    Ok(out)
}

pub async fn resolve_agency_talent_ref(
    state: &AppState,
    agency_id: &str,
    input_id: &str,
) -> Result<AgencyTalentRef, (StatusCode, String)> {
    let needle = input_id.trim();
    if needle.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Talent selection is required".to_string(),
        ));
    }

    let refs = list_agency_talent_refs(state, agency_id, None).await?;
    refs.into_iter()
        .find(|item| {
            item.id == needle
                || item.agency_user_id.as_deref() == Some(needle)
                || item.creator_id.as_deref() == Some(needle)
                || item.relationship_id.as_deref() == Some(needle)
        })
        .ok_or((
            StatusCode::FORBIDDEN,
            "Access denied to this talent".to_string(),
        ))
}
