use serde::Deserialize;
use uuid::Uuid;

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
