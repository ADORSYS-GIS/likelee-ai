use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum OrganizationType {
    Agency,
    Brand,
}

impl OrganizationType {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Agency => "agency",
            Self::Brand => "brand",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value.trim() {
            "agency" => Some(Self::Agency),
            "brand" => Some(Self::Brand),
            _ => None,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MembershipRecord {
    pub organization_type: String,
    pub organization_id: String,
    pub organization_name: String,
    pub user_id: String,
    pub email: String,
    pub role: String,
    pub status: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub last_role_changed_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InviteRecord {
    pub id: String,
    pub organization_type: String,
    pub organization_id: String,
    pub email: String,
    pub role: String,
    pub status: String,
    pub invited_by: String,
    pub expires_at: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TeamContextResponse {
    pub organization_type: String,
    pub organization_id: String,
    pub organization_name: String,
    pub membership_role: String,
    pub permissions: Vec<String>,
    pub members: Vec<MembershipRecord>,
    pub invites: Vec<InviteRecord>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ActionResponse {
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuditLogRecord {
    pub id: String,
    pub organization_type: String,
    pub organization_id: String,
    pub actor_user_id: String,
    pub target_user_id: Option<String>,
    pub target_email: Option<String>,
    pub action: String,
    pub old_role: Option<String>,
    pub new_role: Option<String>,
    pub metadata: Value,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct TeamScopeQuery {
    pub organization_type: Option<String>,
    pub organization_id: Option<String>,
    pub include_details: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct CreateInvitePayload {
    pub email: String,
    pub role: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMemberRolePayload {
    pub role: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub(crate) struct ResolvedScope {
    pub organization_type: OrganizationType,
    pub organization_id: String,
    pub organization_name: String,
    pub membership: MembershipRecord,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrganizationAccess {
    pub organization_type: String,
    pub organization_id: String,
    pub organization_name: String,
    pub membership_role: String,
    pub permissions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrandAgencyConnection {
    pub brand_id: String,
    pub agency_id: String,
    pub status: String,
}
