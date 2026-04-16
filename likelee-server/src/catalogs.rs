use crate::{
    agency_talent_refs::list_agency_talent_refs,
    auth::AuthUser,
    config::AppState,
    team::{permissions::Permission, require_agency_permission},
};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tracing::info;

// ============================================================================
// Request / Response types
// ============================================================================

#[derive(Deserialize)]
pub struct CreateCatalogRequest {
    pub title: String,
    pub client_name: Option<String>,
    pub client_email: Option<String>,
    pub licensing_request_id: Option<String>,
    pub notes: Option<String>,
    pub expires_at: Option<String>,
    pub items: Vec<CatalogItemRequest>,
}

#[derive(Deserialize)]
pub struct CatalogItemRequest {
    pub talent_id: String,
    pub asset_ids: Vec<CatalogAssetRef>,
    pub recording_ids: Vec<CatalogRecordingRef>,
}

#[derive(Deserialize)]
pub struct CatalogAssetRef {
    pub asset_id: String,
    pub asset_type: String,
}

#[derive(Deserialize)]
pub struct CatalogRecordingRef {
    pub recording_id: String,
    pub emotion_tag: Option<String>,
}

#[derive(Serialize)]
pub struct CatalogRow {
    pub id: String,
    pub agency_id: String,
    pub licensing_request_id: Option<String>,
    pub title: String,
    pub client_name: Option<String>,
    pub client_email: Option<String>,
    pub access_token: String,
    pub created_at: String,
    pub sent_at: Option<String>,
    pub notes: Option<String>,
    pub item_count: i64,
}

// ============================================================================
// List catalogs (agency dashboard)
// ============================================================================

pub async fn list_catalogs(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let access = require_agency_permission(&state, &user, Permission::ViewLicenses).await?;
    let agency_id = &access.organization_id;

    let resp = state
        .pg
        .from("agency_catalogs")
        .select("id,agency_id,licensing_request_id,title,client_name,client_email,access_token,created_at,sent_at,notes,expires_at,items:agency_catalog_items(id,assets:agency_catalog_assets(count),recordings:agency_catalog_recordings(count))")
        .eq("agency_id", agency_id)
        .order("created_at.desc")
        .limit(200)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !status.is_success() {
        return Err(crate::errors::sanitize_db_error(status.as_u16(), text));
    }

    let mut rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();

    let lr_ids: Vec<String> = rows
        .iter()
        .filter_map(|r| {
            r.get("licensing_request_id")
                .and_then(|v| v.as_str())
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
        })
        .collect();

    let mut payment_link_by_lr: std::collections::HashMap<String, serde_json::Value> =
        std::collections::HashMap::new();
    if !lr_ids.is_empty() {
        let lr_refs: Vec<&str> = lr_ids.iter().map(|s| s.as_str()).collect();
        let pl_resp = state
            .pg
            .from("agency_payment_links")
            .select("licensing_request_id,status,paid_at,created_at")
            .eq("agency_id", &user.id)
            .in_("licensing_request_id", lr_refs)
            .order("created_at.desc")
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let pl_text = pl_resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let pl_rows: Vec<serde_json::Value> = serde_json::from_str(&pl_text).unwrap_or_default();
        for row in pl_rows {
            let lrid = row
                .get("licensing_request_id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            if lrid.is_empty() || payment_link_by_lr.contains_key(&lrid) {
                continue;
            }
            payment_link_by_lr.insert(lrid, row);
        }
    }

    for row in &mut rows {
        let Some(obj) = row.as_object_mut() else {
            continue;
        };
        let lrid = obj
            .get("licensing_request_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if lrid.is_empty() {
            obj.insert("payment_status".into(), json!("unlinked"));
            obj.insert("is_paid".into(), json!(false));
            continue;
        }
        let status = payment_link_by_lr
            .get(&lrid)
            .and_then(|pl| pl.get("status"))
            .and_then(|v| v.as_str())
            .unwrap_or("unpaid")
            .trim()
            .to_lowercase();
        obj.insert("payment_status".into(), json!(status.clone()));
        obj.insert("is_paid".into(), json!(status == "paid"));
        if let Some(paid_at) = payment_link_by_lr
            .get(&lrid)
            .and_then(|pl| pl.get("paid_at"))
            .cloned()
        {
            obj.insert("paid_at".into(), paid_at);
        }
    }

    Ok(Json(json!(rows)))
}

// ============================================================================
// List eligible signed licensing requests
// ============================================================================

pub async fn list_eligible_requests(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let access = require_agency_permission(&state, &user, Permission::ViewLicenses).await?;
    let agency_id = &access.organization_id;

    // 1. Fetch licensing requests (with license_submissions embedded) and filter to signed ones.
    // We allow both paid and unpaid requests; payment status is displayed separately.
    let lr_resp = state
        .pg
        .from("licensing_requests")
        .select(
            "id,client_name,campaign_title,talent_id,talent_ids,created_at,license_submissions!licensing_requests_submission_id_fkey(status,client_name,client_email,license_fee,created_at)",
        )
        .eq("agency_id", agency_id)
        .order("created_at.desc")
        .limit(250)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let lr_status = lr_resp.status();
    let lr_text = lr_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !lr_status.is_success() {
        return Err(crate::errors::sanitize_db_error(
            lr_status.as_u16(),
            lr_text,
        ));
    }

    let lr_rows: Vec<serde_json::Value> = serde_json::from_str(&lr_text).unwrap_or_default();

    // 2. Fetch latest payment-link state for these requests so the UI can show paid/unpaid.
    let lr_ids: Vec<String> = lr_rows
        .iter()
        .filter_map(|r| r.get("id").and_then(|v| v.as_str()).map(|s| s.to_string()))
        .collect();
    let mut payment_link_by_lr: std::collections::HashMap<String, serde_json::Value> =
        std::collections::HashMap::new();
    if !lr_ids.is_empty() {
        let lr_refs: Vec<&str> = lr_ids.iter().map(|s| s.as_str()).collect();
        let pl_resp = state
            .pg
            .from("agency_payment_links")
            .select("id,licensing_request_id,status,client_name,client_email,total_amount_cents,paid_at,created_at")
            .eq("agency_id", agency_id)
            .in_("licensing_request_id", lr_refs)
            .order("created_at.desc")
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let pl_text = pl_resp
            .text()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let pl_rows: Vec<serde_json::Value> = serde_json::from_str(&pl_text).unwrap_or_default();
        for row in pl_rows {
            let lrid = row
                .get("licensing_request_id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            if lrid.is_empty() || payment_link_by_lr.contains_key(&lrid) {
                continue;
            }
            payment_link_by_lr.insert(lrid, row);
        }
    }

    // 3. Keep eligible signed ones and gather all unique talent IDs
    let mut eligible: Vec<serde_json::Value> = Vec::new();
    let mut all_talent_ids: std::collections::HashSet<String> = std::collections::HashSet::new();

    for row in lr_rows {
        let lrid = row.get("id").and_then(|v| v.as_str()).unwrap_or("");

        let submission = row.get("license_submissions").and_then(|v| {
            if v.is_array() {
                v.as_array().and_then(|arr| arr.first()).cloned()
            } else {
                Some(v.clone())
            }
        });
        let submission_status = submission
            .as_ref()
            .and_then(|ls| ls.get("status"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_lowercase();
        let is_signed = submission_status == "completed" || submission_status == "signed";
        if !is_signed {
            continue;
        }

        let payment_link = payment_link_by_lr.get(lrid);
        let payment_status = payment_link
            .and_then(|pl| pl.get("status"))
            .and_then(|v| v.as_str())
            .unwrap_or("unpaid")
            .trim()
            .to_lowercase();
        let is_paid = payment_status == "paid";

        let mut mod_row = json!({
            "id": lrid,
            "licensing_request_id": lrid,
            "client_name": payment_link
                .and_then(|pl| pl.get("client_name"))
                .and_then(|v| v.as_str())
                .filter(|s| !s.trim().is_empty())
                .or_else(|| {
                    submission
                        .as_ref()
                        .and_then(|ls| ls.get("client_name"))
                        .and_then(|v| v.as_str())
                        .filter(|s| !s.trim().is_empty())
                })
                .or_else(|| row.get("client_name").and_then(|v| v.as_str()))
                .unwrap_or("Unnamed Client"),
            "client_email": payment_link
                .and_then(|pl| pl.get("client_email"))
                .and_then(|v| v.as_str())
                .filter(|s| !s.trim().is_empty())
                .or_else(|| {
                    submission
                        .as_ref()
                        .and_then(|ls| ls.get("client_email"))
                        .and_then(|v| v.as_str())
                        .filter(|s| !s.trim().is_empty())
                })
                .or_else(|| row.get("client_email").and_then(|v| v.as_str()))
                .unwrap_or(""),
            "campaign_title": row.get("campaign_title").cloned().unwrap_or(serde_json::Value::Null),
            "total_amount_cents": payment_link
                .and_then(|pl| pl.get("total_amount_cents"))
                .cloned()
                .or_else(|| submission.as_ref().and_then(|ls| ls.get("license_fee")).cloned())
                .unwrap_or(serde_json::Value::Null),
            "paid_at": payment_link
                .and_then(|pl| pl.get("paid_at"))
                .cloned()
                .unwrap_or(serde_json::Value::Null),
            "payment_status": payment_status,
            "is_paid": is_paid,
            "submission_status": submission_status,
        });

        // Extract talents
        let mut t_ids: Vec<String> = Vec::new();
        if let Some(arr) = row.get("talent_ids").and_then(|v| v.as_array()) {
            for t in arr {
                if let Some(s) = t.as_str() {
                    t_ids.push(s.to_string());
                }
            }
        }
        if t_ids.is_empty() {
            if let Some(t) = row.get("talent_id").and_then(|v| v.as_str()) {
                if !t.is_empty() {
                    t_ids.push(t.to_string());
                }
            }
        }

        for t in &t_ids {
            all_talent_ids.insert(t.clone());
        }

        // Store intermediate talent IDs array (will replace with full objects)
        if let Some(obj) = mod_row.as_object_mut() {
            obj.insert("_talent_ids".into(), serde_json::json!(t_ids));
        }
        eligible.push(mod_row);
    }

    // 4. Fetch talent names
    let mut talent_name_map: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    let mut talent_creator_map: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    if !all_talent_ids.is_empty() {
        let t_refs: Vec<&str> = all_talent_ids.iter().map(|s| s.as_str()).collect();

        if let Ok(refs) = list_agency_talent_refs(&state, agency_id, None).await {
            let mut by_any_id: std::collections::HashMap<String, (String, Option<String>)> =
                std::collections::HashMap::new();
            for r in refs {
                let name = r.full_name.trim().to_string();
                let cid = r.creator_id.clone();
                if !r.id.trim().is_empty() {
                    by_any_id.insert(r.id.clone(), (name.clone(), cid.clone()));
                }
                if let Some(v) = r.agency_user_id.as_deref() {
                    if !v.trim().is_empty() {
                        by_any_id.insert(v.to_string(), (name.clone(), cid.clone()));
                    }
                }
                if let Some(v) = r.relationship_id.as_deref() {
                    if !v.trim().is_empty() {
                        by_any_id.insert(v.to_string(), (name.clone(), cid.clone()));
                    }
                }
                if let Some(v) = r.creator_id.as_deref() {
                    if !v.trim().is_empty() {
                        by_any_id.insert(v.to_string(), (name.clone(), cid.clone()));
                    }
                }
            }

            for tid in &all_talent_ids {
                if let Some((name, cid)) = by_any_id.get(tid) {
                    if !name.trim().is_empty() {
                        talent_name_map.insert(tid.clone(), name.clone());
                    }
                    if let Some(cid) = cid {
                        if !cid.trim().is_empty() {
                            talent_creator_map.insert(tid.clone(), cid.clone());
                        }
                    }
                }
            }
        }

        // 4a. Resolve names by agency_user_id (internal talents)
        let mut resolved_as_agency_user: std::collections::HashSet<String> =
            std::collections::HashSet::new();
        let mut creator_ids_from_au: std::collections::HashSet<String> =
            std::collections::HashSet::new();
        let au_resp = state
            .pg
            .from("agency_users")
            .auth(state.supabase_service_key.clone())
            .select("id,creator_id,full_legal_name,stage_name")
            .in_("id", t_refs.clone())
            .execute()
            .await
            .ok();

        if let Some(resp) = au_resp {
            if let Ok(text) = resp.text().await {
                let au_rows: Vec<serde_json::Value> =
                    serde_json::from_str(&text).unwrap_or_default();
                for r in au_rows {
                    let id = r
                        .get("id")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                    if id.trim().is_empty() {
                        continue;
                    }
                    let name = r
                        .get("full_legal_name")
                        .or_else(|| r.get("stage_name"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("Talent")
                        .to_string();
                    talent_name_map.insert(id.clone(), name);
                    resolved_as_agency_user.insert(id.clone());
                    if let Some(cid) = r.get("creator_id").and_then(|v| v.as_str()) {
                        if !cid.trim().is_empty() {
                            talent_creator_map.insert(id, cid.to_string());
                            creator_ids_from_au.insert(cid.to_string());
                        }
                    }
                }
            }
        }

        // If the agency_users name is a generic placeholder but we have a creator_id,
        // prefer the creators full_name for display.
        if !creator_ids_from_au.is_empty() {
            let cr_refs: Vec<&str> = creator_ids_from_au.iter().map(|s| s.as_str()).collect();
            let cr_resp = state
                .pg
                .from("creators")
                .auth(state.supabase_service_key.clone())
                .select("id,full_name,stage_name")
                .in_("id", cr_refs)
                .execute()
                .await
                .ok();
            if let Some(cr_resp) = cr_resp {
                if let Ok(cr_text) = cr_resp.text().await {
                    let cr_rows: Vec<serde_json::Value> =
                        serde_json::from_str(&cr_text).unwrap_or_default();
                    let mut creator_full_name_map: std::collections::HashMap<String, String> =
                        std::collections::HashMap::new();
                    for r in &cr_rows {
                        let cid = r.get("id").and_then(|v| v.as_str()).unwrap_or("");
                        if cid.trim().is_empty() {
                            continue;
                        }
                        let full_name = r
                            .get("full_name")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .trim()
                            .to_string();
                        let stage_name = r
                            .get("stage_name")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .trim()
                            .to_string();

                        let mut chosen = String::new();
                        for cand in [&full_name, &stage_name] {
                            if cand.is_empty() {
                                continue;
                            }
                            let lc = cand.to_lowercase();
                            if lc == "talent" || lc == "user" || lc == "unknown" {
                                continue;
                            }
                            chosen = cand.clone();
                            break;
                        }

                        if !chosen.is_empty() {
                            creator_full_name_map.insert(cid.to_string(), chosen);
                        }
                    }

                    for (talent_key, cid) in talent_creator_map.clone() {
                        if let Some(creator_name) = creator_full_name_map.get(&cid).cloned() {
                            let current = talent_name_map
                                .get(&talent_key)
                                .cloned()
                                .unwrap_or_default();
                            let is_placeholder = current.trim().is_empty()
                                || current.trim().eq_ignore_ascii_case("talent")
                                || current.trim().eq_ignore_ascii_case("user");
                            if is_placeholder {
                                talent_name_map.insert(talent_key, creator_name);
                            }
                        }
                    }
                }
            }
        }

        // 4b. For IDs that are relationship/talent refs (connected creators), try mapping via relationships
        let missing_creator_links: Vec<String> = all_talent_ids
            .iter()
            .filter(|tid| !talent_creator_map.contains_key(*tid))
            .cloned()
            .collect();
        if !missing_creator_links.is_empty() {
            let rel_refs: Vec<&str> = missing_creator_links.iter().map(|s| s.as_str()).collect();

            // Some flows store agency_users.id in talent_ids, others store relationship.id.
            // Try both: match on talent_id and on relationship row id.
            for (col, selector) in [
                ("talent_id", "talent_id,creator_id"),
                ("id", "id,talent_id,creator_id"),
            ] {
                let rel_resp = state
                    .pg
                    .from("agency_talent_relationships")
                    .auth(state.supabase_service_key.clone())
                    .select(selector)
                    .in_(col, rel_refs.clone())
                    .execute()
                    .await
                    .ok();
                if let Some(rel_resp) = rel_resp {
                    if let Ok(rel_text) = rel_resp.text().await {
                        let rel_rows: Vec<serde_json::Value> =
                            serde_json::from_str(&rel_text).unwrap_or_default();
                        for r in &rel_rows {
                            let rel_id = r
                                .get("id")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string();
                            let tid = r
                                .get("talent_id")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string();
                            let cid = r
                                .get("creator_id")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string();
                            if cid.trim().is_empty() {
                                continue;
                            }
                            // Map relationship id -> creator id (for connected creators where talent_id is null)
                            if !rel_id.trim().is_empty() {
                                talent_creator_map.entry(rel_id).or_insert(cid.clone());
                            }
                            // Map talent_id -> creator id (for internal talents)
                            if !tid.trim().is_empty() {
                                talent_creator_map.entry(tid).or_insert(cid);
                            }
                        }
                    }
                }
            }
        }

        // 4c. If the remaining IDs are actually creator IDs, try agency_users by creator_id (same agency)
        let still_missing_creator_links: Vec<String> = all_talent_ids
            .iter()
            .filter(|tid| !talent_creator_map.contains_key(*tid))
            .cloned()
            .collect();
        if !still_missing_creator_links.is_empty() {
            let au_refs: Vec<&str> = still_missing_creator_links
                .iter()
                .map(|s| s.as_str())
                .collect();
            let au_by_creator_resp = state
                .pg
                .from("agency_users")
                .auth(state.supabase_service_key.clone())
                .select("creator_id,full_legal_name,stage_name")
                .eq("agency_id", agency_id)
                .in_("creator_id", au_refs)
                .execute()
                .await
                .ok();
            if let Some(au_by_creator_resp) = au_by_creator_resp {
                if let Ok(au_text) = au_by_creator_resp.text().await {
                    let au_rows: Vec<serde_json::Value> =
                        serde_json::from_str(&au_text).unwrap_or_default();
                    for r in &au_rows {
                        let cid = r
                            .get("creator_id")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();
                        if cid.trim().is_empty() {
                            continue;
                        }
                        let name = r
                            .get("stage_name")
                            .or_else(|| r.get("full_legal_name"))
                            .and_then(|v| v.as_str())
                            .unwrap_or("Talent")
                            .to_string();
                        talent_creator_map.entry(cid.clone()).or_insert(cid.clone());
                        talent_name_map.entry(cid).or_insert(name);
                    }
                }
            }
        }

        // 4d. Finally, resolve remaining IDs from creators table.
        // If we can map id -> creator_id via talent_creator_map, use that.
        let missing_name_keys: Vec<String> = all_talent_ids
            .iter()
            .filter(|tid| !talent_name_map.contains_key(*tid))
            .cloned()
            .collect();
        if !missing_name_keys.is_empty() {
            let mut creator_ids: std::collections::HashSet<String> =
                std::collections::HashSet::new();
            for key in &missing_name_keys {
                let cid = talent_creator_map
                    .get(key)
                    .cloned()
                    .unwrap_or_else(|| key.clone());
                if !cid.trim().is_empty() {
                    creator_ids.insert(cid);
                }
            }
            let cr_refs: Vec<&str> = creator_ids.iter().map(|s| s.as_str()).collect();
            let mut creator_name_map: std::collections::HashMap<String, String> =
                std::collections::HashMap::new();

            if !cr_refs.is_empty() {
                let cr_resp = state
                    .pg
                    .from("creators")
                    .auth(state.supabase_service_key.clone())
                    .select("id,full_name,stage_name")
                    .in_("id", cr_refs)
                    .execute()
                    .await
                    .ok();
                if let Some(cr_resp) = cr_resp {
                    if let Ok(cr_text) = cr_resp.text().await {
                        let cr_rows: Vec<serde_json::Value> =
                            serde_json::from_str(&cr_text).unwrap_or_default();
                        for r in &cr_rows {
                            let cid = r.get("id").and_then(|v| v.as_str()).unwrap_or("");
                            if cid.trim().is_empty() {
                                continue;
                            }
                            let name = r
                                .get("full_name")
                                .or_else(|| r.get("stage_name"))
                                .and_then(|v| v.as_str())
                                .unwrap_or("Talent")
                                .to_string();
                            creator_name_map.insert(cid.to_string(), name);
                        }
                    }
                }
            }

            for key in &missing_name_keys {
                let cid = talent_creator_map
                    .get(key)
                    .cloned()
                    .unwrap_or_else(|| key.clone());
                if let Some(name) = creator_name_map.get(&cid).cloned() {
                    // If this key is not an agency_users.id (connected creator / relationship id / creator id),
                    // prefer the creators-table name.
                    if !resolved_as_agency_user.contains(key) {
                        talent_name_map.insert(key.clone(), name);
                    } else {
                        talent_name_map.entry(key.clone()).or_insert(name);
                    }
                }
            }
        }

        // 4e. Final override: if we still have placeholder names but do have a creator_id mapping,
        // force the creators.full_name (covers relationship-id keys for connected creators).
        let mut creator_ids_all: std::collections::HashSet<String> =
            std::collections::HashSet::new();
        for cid in talent_creator_map.values() {
            if !cid.trim().is_empty() {
                creator_ids_all.insert(cid.clone());
            }
        }
        if !creator_ids_all.is_empty() {
            let cr_refs: Vec<&str> = creator_ids_all.iter().map(|s| s.as_str()).collect();
            let cr_resp = state
                .pg
                .from("creators")
                .auth(state.supabase_service_key.clone())
                .select("id,full_name,stage_name")
                .in_("id", cr_refs)
                .execute()
                .await
                .ok();
            if let Some(cr_resp) = cr_resp {
                if let Ok(cr_text) = cr_resp.text().await {
                    let cr_rows: Vec<serde_json::Value> =
                        serde_json::from_str(&cr_text).unwrap_or_default();
                    let mut creator_full_name_map: std::collections::HashMap<String, String> =
                        std::collections::HashMap::new();
                    for r in &cr_rows {
                        let cid = r.get("id").and_then(|v| v.as_str()).unwrap_or("");
                        if cid.trim().is_empty() {
                            continue;
                        }
                        let full_name = r
                            .get("full_name")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .trim()
                            .to_string();
                        let stage_name = r
                            .get("stage_name")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .trim()
                            .to_string();

                        let mut chosen = String::new();
                        for cand in [&full_name, &stage_name] {
                            if cand.is_empty() {
                                continue;
                            }
                            let lc = cand.to_lowercase();
                            if lc == "talent" || lc == "user" || lc == "unknown" {
                                continue;
                            }
                            chosen = cand.clone();
                            break;
                        }

                        if !chosen.is_empty() {
                            creator_full_name_map.insert(cid.to_string(), chosen);
                        }
                    }

                    for key in &all_talent_ids {
                        let current = talent_name_map.get(key).cloned().unwrap_or_default();
                        let is_placeholder = current.trim().is_empty()
                            || current.trim().eq_ignore_ascii_case("talent")
                            || current.trim().eq_ignore_ascii_case("user")
                            || current.trim().eq_ignore_ascii_case("unknown");
                        if !is_placeholder {
                            continue;
                        }
                        let Some(cid) = talent_creator_map.get(key).cloned() else {
                            continue;
                        };
                        if let Some(real_name) = creator_full_name_map.get(&cid).cloned() {
                            talent_name_map.insert(key.clone(), real_name);
                        }
                    }
                }
            }
        }
    }

    // 5. Build final array with talent objects
    for row in &mut eligible {
        if let Some(obj) = row.as_object_mut() {
            let ids = obj
                .remove("_talent_ids")
                .and_then(|v| v.as_array().cloned())
                .unwrap_or_default();
            let mut linked_talents = Vec::new();
            for tval in ids {
                if let Some(tid) = tval.as_str() {
                    let name = talent_name_map
                        .get(tid)
                        .cloned()
                        .unwrap_or_else(|| "Talent".to_string());
                    let creator_id = talent_creator_map
                        .get(tid)
                        .cloned()
                        .unwrap_or_else(|| "".to_string());
                    linked_talents.push(serde_json::json!({
                        "id": tid,
                        "name": name,
                        "creator_id": if creator_id.trim().is_empty() {
                            serde_json::Value::Null
                        } else {
                            serde_json::Value::String(creator_id)
                        }
                    }));
                }
            }
            obj.insert("talents".into(), serde_json::json!(linked_talents));
        }
    }

    Ok(Json(serde_json::json!(eligible)))
}

// ============================================================================
// Create catalog
// ============================================================================

pub async fn create_catalog(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<CreateCatalogRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if user.role != "agency" {
        return Err((StatusCode::FORBIDDEN, "Forbidden".to_string()));
    }

    if payload.title.trim().is_empty() {
        return Err((StatusCode::BAD_REQUEST, "title is required".to_string()));
    }

    if let Some(ref lrid) = payload.licensing_request_id {
        if !lrid.trim().is_empty() {
            let lr_resp = state
                .pg
                .from("licensing_requests")
                .select("id,license_submissions!licensing_requests_submission_id_fkey(status)")
                .eq("agency_id", &user.id)
                .eq("id", lrid.trim())
                .limit(1)
                .execute()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

            let lr_status = lr_resp.status();
            let lr_text = lr_resp
                .text()
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

            if !lr_status.is_success() {
                return Err(crate::errors::sanitize_db_error(
                    lr_status.as_u16(),
                    lr_text,
                ));
            }

            let lr_rows: Vec<serde_json::Value> =
                serde_json::from_str(&lr_text).unwrap_or_default();
            let lr = lr_rows.first().ok_or((
                StatusCode::NOT_FOUND,
                "Linked licensing request not found".to_string(),
            ))?;

            let submission_status = lr
                .get("license_submissions")
                .and_then(|ls| ls.get("status"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_lowercase();

            if submission_status != "completed" && submission_status != "signed" {
                return Err((
                    StatusCode::UNPROCESSABLE_ENTITY,
                    "Linked licensing request must be signed before creating a catalog".to_string(),
                ));
            }
        }
    }

    // 1. Insert the catalog root record
    let mut catalog_insert = json!({
        "agency_id": user.id,
        "title": payload.title.trim(),
    });

    if let Some(ref cn) = payload.client_name {
        if !cn.trim().is_empty() {
            catalog_insert["client_name"] = json!(cn.trim());
        }
    }
    if let Some(ref ce) = payload.client_email {
        if !ce.trim().is_empty() {
            catalog_insert["client_email"] = json!(ce.trim());
        }
    }
    if let Some(ref lrid) = payload.licensing_request_id {
        if !lrid.trim().is_empty() {
            catalog_insert["licensing_request_id"] = json!(lrid.trim());
        }
    }
    if let Some(ref notes) = payload.notes {
        if !notes.trim().is_empty() {
            catalog_insert["notes"] = json!(notes.trim());
        }
    }
    if let Some(ref expires) = payload.expires_at {
        if !expires.trim().is_empty() {
            catalog_insert["expires_at"] = json!(expires.trim());
        }
    }

    let ins_resp = state
        .pg
        .from("agency_catalogs")
        .insert(catalog_insert.to_string())
        .select("id,access_token")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let ins_status = ins_resp.status();
    let ins_text = ins_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !ins_status.is_success() {
        return Err(crate::errors::sanitize_db_error(
            ins_status.as_u16(),
            ins_text,
        ));
    }

    let ins_rows: Vec<serde_json::Value> = serde_json::from_str(&ins_text).unwrap_or_default();
    let catalog_row = ins_rows.into_iter().next().ok_or_else(|| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "catalog insert returned no row".to_string(),
        )
    })?;

    let catalog_id = catalog_row
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let access_token = catalog_row
        .get("access_token")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    // 2. Insert items, assets, and recordings
    for (idx, item) in payload.items.iter().enumerate() {
        if item.talent_id.trim().is_empty() {
            continue;
        }

        let item_insert = json!({
            "catalog_id": catalog_id,
            "talent_id": item.talent_id,
            "sort_order": idx,
        });

        let item_resp = state
            .pg
            .from("agency_catalog_items")
            .insert(item_insert.to_string())
            .select("id")
            .execute()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let item_text = item_resp.text().await.unwrap_or_else(|_| "[]".into());
        let item_rows: Vec<serde_json::Value> =
            serde_json::from_str(&item_text).unwrap_or_default();
        let item_id = item_rows
            .into_iter()
            .next()
            .and_then(|r| r.get("id").and_then(|v| v.as_str()).map(|s| s.to_string()))
            .unwrap_or_default();

        if item_id.is_empty() {
            continue;
        }

        // Insert digital assets
        for (ai, asset) in item.asset_ids.iter().enumerate() {
            if asset.asset_id.trim().is_empty() {
                continue;
            }
            let asset_insert = json!({
                "catalog_item_id": item_id,
                "asset_id": asset.asset_id,
                "asset_type": asset.asset_type,
                "sort_order": ai,
            });
            let _ = state
                .pg
                .from("agency_catalog_assets")
                .insert(asset_insert.to_string())
                .execute()
                .await;
        }

        // Insert voice recordings
        for (ri, rec) in item.recording_ids.iter().enumerate() {
            if rec.recording_id.trim().is_empty() {
                continue;
            }
            let rec_insert = json!({
                "catalog_item_id": item_id,
                "recording_id": rec.recording_id,
                "emotion_tag": rec.emotion_tag,
                "sort_order": ri,
            });
            let _ = state
                .pg
                .from("agency_catalog_recordings")
                .insert(rec_insert.to_string())
                .execute()
                .await;
        }
    }

    // 3. Send email to client if email provided
    let client_email = payload
        .client_email
        .as_deref()
        .unwrap_or("")
        .trim()
        .to_string();
    let mut email_sent = false;

    if !client_email.is_empty() {
        let app_url = std::env::var("APP_URL").unwrap_or_else(|_| "https://likelee.ai".to_string());
        let catalog_url = format!("{}/share/catalog/{}", app_url, access_token);
        let client_name = payload.client_name.as_deref().unwrap_or("Client");
        let subject = format!("Your Licensed Assets Catalog – {}", payload.title.trim());
        let body = format!(
            "Dear {},\n\nYour licensed asset catalog is now ready.\n\nTitle: {}\n\nAccess your catalog here:\n{}\n\nThis link contains all the approved digital assets and voice recordings included in your license.\n\nBest regards,\nLikelee",
            client_name,
            payload.title.trim(),
            catalog_url
        );

        match crate::email::send_plain_email(&state, &client_email, &subject, &body) {
            Ok(_) => {
                email_sent = true;
                // Mark sent_at
                let _ = state
                    .pg
                    .from("agency_catalogs")
                    .eq("id", &catalog_id)
                    .update(json!({"sent_at": chrono::Utc::now().to_rfc3339()}).to_string())
                    .execute()
                    .await;
            }
            Err(e) => {
                tracing::warn!(
                    catalog_id = %catalog_id,
                    error = ?e,
                    "Failed to send catalog email"
                );
            }
        }
    }

    info!(
        agency_id = %user.id,
        catalog_id = %catalog_id,
        item_count = payload.items.len(),
        email_sent = email_sent,
        "Catalog created"
    );

    Ok(Json(json!({
        "id": catalog_id,
        "access_token": access_token,
        "email_sent": email_sent,
        "ok": true,
    })))
}

// ============================================================================
// Delete catalog
// ============================================================================

pub async fn delete_catalog(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let access = require_agency_permission(&state, &user, Permission::ManageLicenses).await?;
    let agency_id = &access.organization_id;

    let resp = state
        .pg
        .from("agency_catalogs")
        .delete()
        .eq("id", &id)
        .eq("agency_id", agency_id)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let del_status = resp.status();
    if !del_status.is_success() {
        let err = resp.text().await.unwrap_or_default();
        return Err(crate::errors::sanitize_db_error(del_status.as_u16(), err));
    }

    Ok(Json(json!({"ok": true})))
}

// ============================================================================
// Public catalog view  GET /api/public/catalogs/:token
// ============================================================================

pub async fn get_public_catalog(
    State(state): State<AppState>,
    Path(token): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // 1. Fetch the catalog by access_token (no auth required)
    let cat_resp = state
        .pg
        .from("agency_catalogs")
        .select("id,agency_id,licensing_request_id,title,client_name,client_email,created_at,notes,expires_at")
        .eq("access_token", &token)
        .limit(1)
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let cat_status = cat_resp.status();
    let cat_text = cat_resp
        .text()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !cat_status.is_success() {
        return Err(crate::errors::sanitize_db_error(
            cat_status.as_u16(),
            cat_text,
        ));
    }

    let cat_rows: Vec<serde_json::Value> = serde_json::from_str(&cat_text).unwrap_or_default();
    let catalog = cat_rows
        .into_iter()
        .next()
        .ok_or_else(|| (StatusCode::NOT_FOUND, "Catalog not found".to_string()))?;

    // Expiry check
    if let Some(exp_str) = catalog.get("expires_at").and_then(|v| v.as_str()) {
        if let Ok(exp_dt) = chrono::DateTime::parse_from_rfc3339(exp_str) {
            if chrono::Utc::now() > exp_dt {
                return Err((StatusCode::GONE, "This link has expired".to_string()));
            }
        }
    }

    let catalog_id = catalog
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let agency_id = catalog
        .get("agency_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let licensing_request_id = catalog
        .get("licensing_request_id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let mut payment_status = "unlinked".to_string();
    let mut paid_at_value = serde_json::Value::Null;
    let mut downloads_locked = false;
    if let Some(ref lrid) = licensing_request_id {
        if let Ok(pay_resp) = state
            .pg
            .from("agency_payment_links")
            .auth(state.supabase_service_key.clone())
            .select("status,paid_at")
            .eq("licensing_request_id", lrid)
            .order("created_at.desc")
            .limit(1)
            .execute()
            .await
        {
            if let Ok(pay_text) = pay_resp.text().await {
                let pay_rows: Vec<serde_json::Value> =
                    serde_json::from_str(&pay_text).unwrap_or_default();
                if let Some(pay) = pay_rows.first() {
                    payment_status = pay
                        .get("status")
                        .and_then(|v| v.as_str())
                        .unwrap_or("unpaid")
                        .trim()
                        .to_lowercase();
                    paid_at_value = pay
                        .get("paid_at")
                        .cloned()
                        .unwrap_or(serde_json::Value::Null);
                } else {
                    payment_status = "unpaid".to_string();
                }
            }
        } else {
            payment_status = "unpaid".to_string();
        }
        downloads_locked = payment_status != "paid";
    }

    // 1b. Fetch agency branding
    let mut agency_branding = json!({});
    if !agency_id.is_empty() {
        let agency_resp = state
            .pg
            .from("agencies")
            .auth(state.supabase_service_key.clone())
            .select("agency_name,logo_url")
            .eq("id", agency_id)
            .limit(1)
            .execute()
            .await;

        if let Ok(resp) = agency_resp {
            if let Ok(text) = resp.text().await {
                let rows: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();
                if let Some(agency) = rows.into_iter().next() {
                    agency_branding = agency;
                }
            }
        }
    }

    // 2. Fetch all items for this catalog
    let items_resp = state
        .pg
        .from("agency_catalog_items")
        .select("id,talent_id,sort_order")
        .eq("catalog_id", &catalog_id)
        .order("sort_order.asc")
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let items_text = items_resp.text().await.unwrap_or_else(|_| "[]".into());
    let items: Vec<serde_json::Value> = serde_json::from_str(&items_text).unwrap_or_default();

    let mut talent_name_by_any_id: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    let mut talent_photo_by_any_id: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    if !agency_id.is_empty() {
        if let Ok(refs) =
            crate::agency_talent_refs::list_agency_talent_refs(&state, agency_id, None).await
        {
            for r in refs {
                let name = r.full_name.trim().to_string();
                if name.is_empty() {
                    continue;
                }
                let photo = r
                    .profile_photo_url
                    .as_deref()
                    .unwrap_or("")
                    .trim()
                    .to_string();
                if !r.id.trim().is_empty() {
                    talent_name_by_any_id.insert(r.id.clone(), name.clone());
                    if !photo.is_empty() {
                        talent_photo_by_any_id.insert(r.id.clone(), photo.clone());
                    }
                }
                if let Some(v) = r.agency_user_id.as_deref() {
                    if !v.trim().is_empty() {
                        talent_name_by_any_id.insert(v.to_string(), name.clone());
                        if !photo.is_empty() {
                            talent_photo_by_any_id.insert(v.to_string(), photo.clone());
                        }
                    }
                }
                if let Some(v) = r.relationship_id.as_deref() {
                    if !v.trim().is_empty() {
                        talent_name_by_any_id.insert(v.to_string(), name.clone());
                        if !photo.is_empty() {
                            talent_photo_by_any_id.insert(v.to_string(), photo.clone());
                        }
                    }
                }
                if let Some(v) = r.creator_id.as_deref() {
                    if !v.trim().is_empty() {
                        talent_name_by_any_id.insert(v.to_string(), name.clone());
                        if !photo.is_empty() {
                            talent_photo_by_any_id.insert(v.to_string(), photo.clone());
                        }
                    }
                }
            }
        }
    }

    // 3. For each item, fetch assets and recordings
    let mut enriched_items: Vec<serde_json::Value> = Vec::new();

    for item in &items {
        let item_id = item.get("id").and_then(|v| v.as_str()).unwrap_or("");
        let talent_id = item.get("talent_id").and_then(|v| v.as_str()).unwrap_or("");

        // Fetch digital assets
        let assets_resp = state
            .pg
            .from("agency_catalog_assets")
            .select("asset_id,asset_type,sort_order")
            .eq("catalog_item_id", item_id)
            .order("sort_order.asc")
            .execute()
            .await;

        let assets_raw: Vec<serde_json::Value> = if let Ok(resp) = assets_resp {
            if let Ok(text) = resp.text().await {
                serde_json::from_str(&text).unwrap_or_default()
            } else {
                Vec::new()
            }
        } else {
            Vec::new()
        };

        // Enrich each asset_id with its public_url (reference_images or agency_files)
        let mut assets: Vec<serde_json::Value> = Vec::new();
        for mut asset in assets_raw {
            let asset_id = asset
                .get("asset_id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            if !asset_id.is_empty() {
                // Try reference_images first
                let ri_rows: Vec<serde_json::Value> = if let Ok(r) = state
                    .pg
                    .from("reference_images")
                    .auth(state.supabase_service_key.clone())
                    .select("public_url,storage_bucket,storage_path")
                    .eq("id", &asset_id)
                    .limit(1)
                    .execute()
                    .await
                {
                    r.text()
                        .await
                        .ok()
                        .and_then(|t| serde_json::from_str(&t).ok())
                        .unwrap_or_default()
                } else {
                    vec![]
                };

                if let Some(ri) = ri_rows.into_iter().next() {
                    let pu = ri.get("public_url").and_then(|v| v.as_str()).unwrap_or("");
                    if !pu.is_empty() {
                        if let Some(obj) = asset.as_object_mut() {
                            obj.insert("url".into(), json!(pu));
                        }
                    } else {
                        let bucket = ri
                            .get("storage_bucket")
                            .and_then(|v| v.as_str())
                            .unwrap_or("");
                        let path = ri
                            .get("storage_path")
                            .and_then(|v| v.as_str())
                            .unwrap_or("");
                        if !bucket.is_empty() && !downloads_locked {
                            if let Some(su) = generate_signed_url(&state, bucket, path).await {
                                if let Some(obj) = asset.as_object_mut() {
                                    obj.insert("url".into(), json!(su));
                                }
                            }
                        }
                    }
                } else {
                    // Try agency_files
                    let af_rows: Vec<serde_json::Value> = if let Ok(r) = state
                        .pg
                        .from("agency_files")
                        .auth(state.supabase_service_key.clone())
                        .select("public_url,storage_bucket,storage_path")
                        .eq("id", &asset_id)
                        .limit(1)
                        .execute()
                        .await
                    {
                        r.text()
                            .await
                            .ok()
                            .and_then(|t| serde_json::from_str(&t).ok())
                            .unwrap_or_default()
                    } else {
                        vec![]
                    };

                    if let Some(af) = af_rows.into_iter().next() {
                        let pu = af.get("public_url").and_then(|v| v.as_str()).unwrap_or("");
                        if !pu.is_empty() {
                            if let Some(obj) = asset.as_object_mut() {
                                obj.insert("url".into(), json!(pu));
                            }
                        } else {
                            let bucket = af
                                .get("storage_bucket")
                                .and_then(|v| v.as_str())
                                .unwrap_or("");
                            let path = af
                                .get("storage_path")
                                .and_then(|v| v.as_str())
                                .unwrap_or("");
                            if !bucket.is_empty() && !downloads_locked {
                                if let Some(su) = generate_signed_url(&state, bucket, path).await {
                                    if let Some(obj) = asset.as_object_mut() {
                                        obj.insert("url".into(), json!(su));
                                    }
                                }
                            }
                        }
                    }
                }
            }
            assets.push(asset);
        }

        // Fetch voice recordings
        let recs_resp = state
            .pg
            .from("agency_catalog_recordings")
            .select("recording_id,emotion_tag,sort_order")
            .eq("catalog_item_id", item_id)
            .order("sort_order.asc")
            .execute()
            .await;

        let recordings_raw: Vec<serde_json::Value> = if let Ok(resp) = recs_resp {
            if let Ok(text) = resp.text().await {
                serde_json::from_str(&text).unwrap_or_default()
            } else {
                Vec::new()
            }
        } else {
            Vec::new()
        };

        // Enrich recordings with their storage paths so the client can request signed URLs
        let mut recordings: Vec<serde_json::Value> = Vec::new();
        for rec in &recordings_raw {
            let rec_id = rec
                .get("recording_id")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            if rec_id.is_empty() {
                continue;
            }

            let vr_resp = state
                .pg
                .from("voice_recordings")
                .auth(state.supabase_service_key.clone())
                .select("id,storage_bucket,storage_path,mime_type,emotion_tag,accessible")
                .eq("id", rec_id)
                .limit(1)
                .execute()
                .await;

            let vr_rows: Vec<serde_json::Value> = if let Ok(resp) = vr_resp {
                if let Ok(text) = resp.text().await {
                    serde_json::from_str(&text).unwrap_or_default()
                } else {
                    Vec::new()
                }
            } else {
                Vec::new()
            };

            if let Some(vr) = vr_rows.into_iter().next() {
                let accessible = vr
                    .get("accessible")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(true);
                if !accessible {
                    continue;
                }
                let mut merged = rec.clone();
                let bucket = vr
                    .get("storage_bucket")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let path = vr
                    .get("storage_path")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                if let Some(obj) = merged.as_object_mut() {
                    obj.insert("storage_bucket".into(), vr["storage_bucket"].clone());
                    obj.insert("storage_path".into(), vr["storage_path"].clone());
                    obj.insert("mime_type".into(), vr["mime_type"].clone());
                    obj.entry("emotion_tag")
                        .or_insert_with(|| vr["emotion_tag"].clone());
                    if !bucket.is_empty() && !path.is_empty() && !downloads_locked {
                        if let Some(su) = generate_signed_url(&state, &bucket, &path).await {
                            obj.insert("signed_url".into(), json!(su));
                        }
                    }
                }
                recordings.push(merged);
            }
        }

        let talent_name = talent_name_by_any_id
            .get(talent_id)
            .cloned()
            .unwrap_or_else(|| "Talent".to_string());
        let talent_stage_name: Option<String> =
            if talent_name.trim().is_empty() || talent_name.trim().eq_ignore_ascii_case("talent") {
                None
            } else {
                Some(talent_name.clone())
            };
        let talent_photo_url = talent_photo_by_any_id.get(talent_id).cloned();

        enriched_items.push(json!({
            "talent_id": talent_id,
            "talent_name": if talent_name.is_empty() { serde_json::Value::Null } else { json!(talent_name) },
            "talent_stage_name": talent_stage_name,
            "talent_photo_url": talent_photo_url,
            "sort_order": item.get("sort_order"),
            "assets": assets,
            "recordings": recordings,
        }));
    }

    let receipt = if let Some(ref lr_id) = licensing_request_id {
        let lr_resp = state
            .pg
            .from("licensing_requests")
            .auth(state.supabase_service_key.clone())
            .select("id,campaign_title,client_name,license_start_date,license_end_date,usage_scope,regions,created_at,license_submissions!licensing_requests_submission_id_fkey(license_fee,client_name,client_email)")
            .eq("id", lr_id)
            .limit(1)
            .execute()
            .await;

        let lr_rows: Vec<serde_json::Value> = if let Ok(resp) = lr_resp {
            if let Ok(text) = resp.text().await {
                serde_json::from_str(&text).unwrap_or_default()
            } else {
                Vec::new()
            }
        } else {
            Vec::new()
        };

        let lr = lr_rows.into_iter().next();

        if let Some(ref req) = lr {
            let ls = req.get("license_submissions");
            let fee_cents = ls
                .and_then(|ls| ls.get("license_fee"))
                .and_then(|v| v.as_i64())
                .unwrap_or(0);

            Some(json!({
                "campaign_title": req.get("campaign_title"),
                "client_name": req.get("client_name"),
                "license_start_date": req.get("license_start_date"),
                "license_end_date": req.get("license_end_date"),
                "usage_scope": req.get("usage_scope"),
                "regions": req.get("regions"),
                "created_at": req.get("created_at"),
                "license_fee_cents": fee_cents,
                "license_fee_display": format!("${:.2}", fee_cents as f64 / 100.0),
                "payment_status": payment_status,
                "paid_at": paid_at_value.clone(),
            }))
        } else {
            None
        }
    } else {
        None
    };

    Ok(Json(json!({
        "id": catalog_id,
        "title": catalog.get("title"),
        "client_name": catalog.get("client_name"),
        "created_at": catalog.get("created_at"),
        "notes": catalog.get("notes"),
        "expires_at": catalog.get("expires_at"),
        "payment_status": payment_status,
        "is_paid": payment_status == "paid",
        "paid_at": paid_at_value,
        "downloads_locked": downloads_locked,
        "items": enriched_items,
        "receipt": receipt,
        "agency": agency_branding,
    })))
}

// Helper: generate a 24-hour signed URL for a private storage object
async fn generate_signed_url(
    state: &crate::config::AppState,
    bucket: &str,
    path: &str,
) -> Option<String> {
    crate::storage::generate_signed_url(state, bucket, path, 86_400)
        .await
        .ok()
}
