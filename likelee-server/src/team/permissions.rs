use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TeamRole {
    Owner,
    Admin,
    ProjectManager,
    Reviewer,
}

impl TeamRole {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Owner => "owner",
            Self::Admin => "admin",
            Self::ProjectManager => "project_manager",
            Self::Reviewer => "reviewer",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value.trim() {
            "owner" => Some(Self::Owner),
            "admin" => Some(Self::Admin),
            "project_manager" => Some(Self::ProjectManager),
            "reviewer" => Some(Self::Reviewer),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Permission {
    CreateCampaigns,
    ApproveDeliverables,
    ViewDeliverables,
    ManageBilling,
    InviteTeamMembers,
    UpdateMemberRoles,
    ViewTeamMembers,
    ViewBrandConnections,
    ManageBrandConnections,
    ViewLicenses,
    ManageLicenses,
}

impl Permission {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::CreateCampaigns => "create_campaigns",
            Self::ApproveDeliverables => "approve_deliverables",
            Self::ViewDeliverables => "view_deliverables",
            Self::ManageBilling => "manage_billing",
            Self::InviteTeamMembers => "invite_team_members",
            Self::UpdateMemberRoles => "update_member_roles",
            Self::ViewTeamMembers => "view_team_members",
            Self::ViewBrandConnections => "view_brand_connections",
            Self::ManageBrandConnections => "manage_brand_connections",
            Self::ViewLicenses => "view_licenses",
            Self::ManageLicenses => "manage_licenses",
        }
    }
}

pub fn permissions_for_role(role: TeamRole) -> Vec<Permission> {
    match role {
        TeamRole::Owner => vec![
            Permission::CreateCampaigns,
            Permission::ApproveDeliverables,
            Permission::ViewDeliverables,
            Permission::ManageBilling,
            Permission::InviteTeamMembers,
            Permission::UpdateMemberRoles,
            Permission::ViewTeamMembers,
            Permission::ViewBrandConnections,
            Permission::ManageBrandConnections,
            Permission::ViewLicenses,
            Permission::ManageLicenses,
        ],
        TeamRole::Admin => vec![
            Permission::CreateCampaigns,
            Permission::ApproveDeliverables,
            Permission::ViewDeliverables,
            Permission::ManageBilling,
            Permission::InviteTeamMembers,
            Permission::UpdateMemberRoles,
            Permission::ViewTeamMembers,
            Permission::ViewBrandConnections,
            Permission::ManageBrandConnections,
            Permission::ViewLicenses,
            Permission::ManageLicenses,
        ],
        TeamRole::ProjectManager => vec![
            Permission::CreateCampaigns,
            Permission::ApproveDeliverables,
            Permission::ViewDeliverables,
            Permission::ViewTeamMembers,
            Permission::ViewBrandConnections,
            Permission::ManageBrandConnections,
            Permission::ViewLicenses,
            Permission::ManageLicenses,
        ],
        TeamRole::Reviewer => vec![
            Permission::ViewDeliverables,
            Permission::ViewTeamMembers,
            Permission::ViewBrandConnections,
            Permission::ViewLicenses,
        ],
    }
}

pub fn has_permission(role: TeamRole, permission: Permission) -> bool {
    permissions_for_role(role).contains(&permission)
}
