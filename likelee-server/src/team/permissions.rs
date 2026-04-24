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
    DisconnectBrandConnections,
    ViewClients,
    ManageClients,
    ViewLicenses,
    ManageLicenses,
    TransferOwnership,
    DeleteOrganisation,
    // Brand-specific permissions
    ManageJobs,
    ViewJobs,
    ManageContracts,
    ViewContracts,
    ManageSubscriptions,
    ViewSubscriptions,
    ManagePayOffers,
    ViewPayOffers,
    RemoveTeamMembers,
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
            Self::DisconnectBrandConnections => "disconnect_brand_connections",
            Self::ViewClients => "view_clients",
            Self::ManageClients => "manage_clients",
            Self::ViewLicenses => "view_licenses",
            Self::ManageLicenses => "manage_licenses",
            Self::TransferOwnership => "transfer_ownership",
            Self::DeleteOrganisation => "delete_organisation",
            Self::ManageJobs => "manage_jobs",
            Self::ViewJobs => "view_jobs",
            Self::ManageContracts => "manage_contracts",
            Self::ViewContracts => "view_contracts",
            Self::ManageSubscriptions => "manage_subscriptions",
            Self::ViewSubscriptions => "view_subscriptions",
            Self::ManagePayOffers => "manage_pay_offers",
            Self::ViewPayOffers => "view_pay_offers",
            Self::RemoveTeamMembers => "remove_team_members",
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
            Permission::DisconnectBrandConnections,
            Permission::ViewClients,
            Permission::ManageClients,
            Permission::ViewLicenses,
            Permission::ManageLicenses,
            Permission::TransferOwnership,
            Permission::DeleteOrganisation,
            Permission::ManageJobs,
            Permission::ViewJobs,
            Permission::ManageContracts,
            Permission::ViewContracts,
            Permission::ManageSubscriptions,
            Permission::ViewSubscriptions,
            Permission::ManagePayOffers,
            Permission::ViewPayOffers,
            Permission::RemoveTeamMembers,
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
            Permission::DisconnectBrandConnections,
            Permission::ViewClients,
            Permission::ManageClients,
            Permission::ViewLicenses,
            Permission::ManageLicenses,
            Permission::ManageJobs,
            Permission::ViewJobs,
            Permission::ManageContracts,
            Permission::ViewContracts,
            Permission::ManageSubscriptions,
            Permission::ViewSubscriptions,
            Permission::ManagePayOffers,
            Permission::ViewPayOffers,
            Permission::RemoveTeamMembers,
        ],
        TeamRole::ProjectManager => vec![
            Permission::CreateCampaigns,
            Permission::ApproveDeliverables,
            Permission::ViewDeliverables,
            Permission::ViewTeamMembers,
            Permission::ViewBrandConnections,
            Permission::ManageBrandConnections,
            Permission::DisconnectBrandConnections,
            Permission::ViewClients,
            Permission::ManageClients,
            Permission::ViewLicenses,
            Permission::ManageLicenses,
            Permission::ManageJobs,
            Permission::ViewJobs,
            Permission::ManageContracts,
            Permission::ViewContracts,
            Permission::ViewSubscriptions,
            Permission::ManagePayOffers,
            Permission::ViewPayOffers,
        ],
        TeamRole::Reviewer => vec![
            Permission::ViewDeliverables,
            Permission::ViewTeamMembers,
            Permission::ViewBrandConnections,
            Permission::ViewClients,
            Permission::ViewLicenses,
            Permission::ViewJobs,
            Permission::ViewContracts,
            Permission::ViewPayOffers,
        ],
    }
}

pub fn has_permission(role: TeamRole, permission: Permission) -> bool {
    permissions_for_role(role).contains(&permission)
}
