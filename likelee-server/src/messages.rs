use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use serde_json::json;
use uuid::Uuid;

use crate::{auth::AuthUser, config::AppState};

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct SendMessageRequest {
    pub conversation_id: Uuid,
    pub content: String,
}

#[derive(Deserialize)]
pub struct EditMessageRequest {
    pub content: String,
}

#[derive(Deserialize)]
pub struct StartConversationRequest {
    pub agency_id: Uuid,
    pub creator_id: Uuid,
    /// Optional first message to send upon creation
    pub content: Option<String>,
}

// ---------------------------------------------------------------------------
// GET /api/conversations
// List all conversations for the authenticated user (agency or creator).
// Each conversation is annotated with the counterpart's display name and avatar.
// ---------------------------------------------------------------------------
pub async fn list_conversations(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // Fetch all conversations where the user participates as either side.
    // Pull profile data for both sides so the UI can render participant info.
    let resp = state
        .pg
        .from("conversations")
        .select(
            "id,created_at,updated_at,\
             agency_id,agencies(agency_name,logo_url,email),\
             creator_id,creators(full_name,profile_photo_url,email)",
        )
        .or(format!(
            "agency_id.eq.{uid},creator_id.eq.{uid}",
            uid = user.id
        ))
        .order("updated_at.desc")
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

    let mut v: Vec<serde_json::Value> = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Concurrently fetch last message and unread count for each thread
    let mut futures = Vec::new();
    for conv in v.iter() {
        let cid = conv
            .get("id")
            .and_then(|i| i.as_str())
            .unwrap_or_default()
            .to_string();
        let user_id = user.id.clone();
        let state_clone = state.clone();

        futures.push(tokio::spawn(async move {
            // Fetch unread count
            let unread_resp = state_clone
                .pg
                .from("messages")
                .select("id")
                .eq("conversation_id", &cid)
                .eq("is_read", "false")
                .neq("sender_id", &user_id)
                .execute()
                .await;

            let mut unread_count = 0;
            if let Ok(resp) = unread_resp {
                if let Ok(txt) = resp.text().await {
                    if let Ok(msgs) = serde_json::from_str::<Vec<serde_json::Value>>(&txt) {
                        unread_count = msgs.len();
                    }
                }
            }

            // Fetch last message content
            let last_msg_resp = state_clone
                .pg
                .from("messages")
                .select("content")
                .eq("conversation_id", &cid)
                .order("created_at.desc")
                .limit(1)
                .execute()
                .await;

            let mut last_message_content = None;
            if let Ok(resp) = last_msg_resp {
                if let Ok(txt) = resp.text().await {
                    if let Ok(msgs) = serde_json::from_str::<Vec<serde_json::Value>>(&txt) {
                        if let Some(msg) = msgs.first() {
                            if let Some(content) = msg.get("content").and_then(|c| c.as_str()) {
                                last_message_content = Some(content.to_string());
                            }
                        }
                    }
                }
            }

            (cid, unread_count, last_message_content)
        }));
    }

    let results = futures::future::join_all(futures).await;
    let mut enrichments = std::collections::HashMap::new();
    for res in results {
        if let Ok((cid, unread_count, last_message_content)) = res {
            enrichments.insert(cid, (unread_count, last_message_content));
        }
    }

    for conv in v.iter_mut() {
        if let Some(cid) = conv.get("id").and_then(|i| i.as_str()) {
            if let Some((unread_count, last_message_content)) = enrichments.get(cid) {
                conv["unread_count"] = json!(unread_count);
                if let Some(msg) = last_message_content {
                    conv["last_message_content"] = json!(msg);
                } else {
                    conv["last_message_content"] = serde_json::Value::Null;
                }
            }
        }
    }

    Ok(Json(json!({ "conversations": v })))
}

// ---------------------------------------------------------------------------
// GET /api/conversations/contacts
// Fetches the user's active connections (WhatsApp style).
// If user is an agency, fetches connected creators.
// If user is a creator, fetches connected agencies.
// ---------------------------------------------------------------------------
pub async fn list_contacts(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let resp = state
        .pg
        .from("agency_talent_relationships")
        .select("agency_id,creator_id,agencies(agency_name,logo_url,email),creators(full_name,profile_photo_url,email)")
        .or(format!(
            "agency_id.eq.{uid},creator_id.eq.{uid}",
            uid = user.id
        ))
        .eq("status", "active")
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

    let items: Vec<serde_json::Value> = serde_json::from_str(&text).unwrap_or_default();

    // Deduplicate contacts based on agency_id or creator_id
    let mut unique_contacts = std::collections::HashMap::new();
    for item in items {
        if let Some(agency_id) = item.get("agency_id").and_then(|v| v.as_str()) {
            if agency_id == user.id.to_string() {
                // User is the agency, contact is the creator
                if let Some(creator_id) = item.get("creator_id").and_then(|v| v.as_str()) {
                    if !creator_id.trim().is_empty() {
                        if let Some(creator_data) = item.get("creators") {
                            let mut contact = creator_data.clone();
                            contact["id"] = json!(creator_id);
                            contact["display_name"] = contact["full_name"].clone();
                            contact["avatar_url"] = contact["profile_photo_url"].clone();
                            contact["contact_type"] = json!("creator");
                            unique_contacts.insert(creator_id.to_string(), contact);
                        }
                    }
                }
            } else {
                // User is the creator, contact is the agency
                if let Some(agency_data) = item.get("agencies") {
                    let mut contact = agency_data.clone();
                    contact["id"] = json!(agency_id);
                    contact["display_name"] = contact["agency_name"].clone();
                    contact["avatar_url"] = contact["logo_url"].clone();
                    contact["contact_type"] = json!("agency");
                    unique_contacts.insert(agency_id.to_string(), contact);
                }
            }
        }
    }

    let contacts_list: Vec<serde_json::Value> = unique_contacts.into_values().collect();

    Ok(Json(json!({ "contacts": contacts_list })))
}

// ---------------------------------------------------------------------------
// POST /api/conversations/start
// Agency initiates or retrieves an existing conversation thread with a creator.
// Idempotent thanks to UNIQUE(agency_id, creator_id).
// ---------------------------------------------------------------------------
pub async fn start_conversation(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<StartConversationRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if payload.agency_id.to_string() != user.id && payload.creator_id.to_string() != user.id {
        return Err((StatusCode::FORBIDDEN, "not_a_participant".to_string()));
    }

    // Upsert conversation (UNIQUE constraint prevents duplicate threads)
    let upsert_body = json!({
        "agency_id": payload.agency_id,
        "creator_id": payload.creator_id,
    });

    let resp = state
        .pg
        .from("conversations")
        .upsert(upsert_body.to_string())
        .on_conflict("agency_id,creator_id")
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

    let conversation: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Extract conversation id from the array response
    let conv_id = conversation
        .as_array()
        .and_then(|a| a.first())
        .and_then(|c| c.get("id"))
        .and_then(|id| id.as_str())
        .ok_or((
            StatusCode::INTERNAL_SERVER_ERROR,
            "failed_to_resolve_conversation_id".to_string(),
        ))?;

    // If the caller also wants to send a first message, do it now
    if let Some(content) = payload.content.as_deref() {
        if !content.trim().is_empty() {
            let msg = json!({
                "conversation_id": conv_id,
                "sender_id": user.id,
                "content": content.trim(),
            });
            let _ = state
                .pg
                .from("messages")
                .insert(msg.to_string())
                .execute()
                .await;
        }
    }

    Ok(Json(json!({ "conversation_id": conv_id })))
}

// ---------------------------------------------------------------------------
// GET /api/conversations/:id/messages
// Paginated message history for a conversation.
// RLS enforces that only participants can read.
// ---------------------------------------------------------------------------
pub async fn list_messages(
    State(state): State<AppState>,
    user: AuthUser,
    Path(conversation_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // Verify participation (RLS will also enforce this, but gives a cleaner 403)
    let check = state
        .pg
        .from("conversations")
        .select("id")
        .eq("id", &conversation_id.to_string())
        .or(format!(
            "agency_id.eq.{uid},creator_id.eq.{uid}",
            uid = user.id
        ))
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !check.status().is_success() {
        return Err((StatusCode::FORBIDDEN, "not_a_participant".to_string()));
    }

    // Fetch messages with sender metadata for avatar display
    let resp = state
        .pg
        .from("messages")
        .select("id,conversation_id,sender_id,content,is_read,created_at,is_deleted,edited_at")
        .eq("conversation_id", &conversation_id.to_string())
        .order("created_at.asc")
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

    // Mark all non-own messages as read (best-effort)
    let _ = state
        .pg
        .from("messages")
        .update(json!({"is_read": true}).to_string())
        .eq("conversation_id", &conversation_id.to_string())
        .neq("sender_id", &user.id.to_string())
        .eq("is_read", "false")
        .execute()
        .await;

    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(json!({ "messages": v })))
}

// ---------------------------------------------------------------------------
// POST /api/messages/send
// Send a message in an existing conversation.
// RLS enforces that sender must be a participant.
// ---------------------------------------------------------------------------
pub async fn send_message(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<SendMessageRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let content = payload.content.trim().to_string();
    if content.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "content_empty".to_string()));
    }
    if content.len() > 5000 {
        return Err((
            StatusCode::UNPROCESSABLE_ENTITY,
            "content_too_long".to_string(),
        ));
    }

    // Verify participation before insert (gives a clean 403)
    let check = state
        .pg
        .from("conversations")
        .select("id")
        .eq("id", &payload.conversation_id.to_string())
        .or(format!(
            "agency_id.eq.{uid},creator_id.eq.{uid}",
            uid = user.id
        ))
        .single()
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !check.status().is_success() {
        return Err((StatusCode::FORBIDDEN, "not_a_participant".to_string()));
    }

    let insert = json!({
        "conversation_id": payload.conversation_id,
        "sender_id": user.id,
        "content": content,
    });

    let resp = state
        .pg
        .from("messages")
        .insert(insert.to_string())
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

    // Update conversation updated_at so thread list re-sorts (best-effort)
    let _ = state
        .pg
        .from("conversations")
        .update(json!({"updated_at": chrono::Utc::now().to_rfc3339()}).to_string())
        .eq("id", &payload.conversation_id.to_string())
        .execute()
        .await;

    let v: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(json!({ "message": v })))
}

// ---------------------------------------------------------------------------
// PUT /api/messages/:id
// Edit an existing message.
// RLS enforces that only the sender can edit.
// ---------------------------------------------------------------------------
pub async fn edit_message(
    State(state): State<AppState>,
    user: AuthUser,
    Path(message_id): Path<Uuid>,
    Json(payload): Json<EditMessageRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let content = payload.content.trim().to_string();
    if content.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "content_empty".to_string()));
    }

    let update = json!({
        "content": content,
        "edited_at": chrono::Utc::now().to_rfc3339(),
    });

    let resp = state
        .pg
        .from("messages")
        .update(update.to_string())
        .eq("id", &message_id.to_string())
        .eq("sender_id", &user.id.to_string()) // Extra safety
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    if !status.is_success() {
        let text = resp.text().await.unwrap_or_default();
        return Err(crate::errors::sanitize_db_error(status.as_u16(), text));
    }

    Ok(Json(json!({ "success": true })))
}

// ---------------------------------------------------------------------------
// DELETE /api/messages/:id
// Soft-delete an existing message.
// RLS enforces that only the sender can delete.
// ---------------------------------------------------------------------------
pub async fn delete_message(
    State(state): State<AppState>,
    user: AuthUser,
    Path(message_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let update = json!({
        "is_deleted": true,
    });

    let resp = state
        .pg
        .from("messages")
        .update(update.to_string())
        .eq("id", &message_id.to_string())
        .eq("sender_id", &user.id.to_string()) // Extra safety
        .execute()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let status = resp.status();
    if !status.is_success() {
        let text = resp.text().await.unwrap_or_default();
        return Err(crate::errors::sanitize_db_error(status.as_u16(), text));
    }

    Ok(Json(json!({ "success": true })))
}
