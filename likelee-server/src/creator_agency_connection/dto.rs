use crate::email;
use crate::errors::sanitize_db_error;
use crate::team::{permissions::Permission, require_agency_permission};
use crate::{auth::AuthUser, auth::RoleGuard, state::AppState};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;


use super::*;

#[derive(Serialize, Deserialize)]
pub struct CreatorAgencyInvite {
    pub id: String,
    pub agency_id: String,
    pub creator_id: String,
    pub status: String,
    pub contract_id: Option<String>,
    pub created_at: Option<String>,
    pub responded_at: Option<String>,
    pub updated_at: Option<String>,
    pub agencies: Option<CreatorAgencyInviteAgency>,
    pub marketplace_contract:
        Option<crate::agencies::marketplace_contracts::MarketplaceContractSummary>,
}


#[derive(Serialize, Deserialize)]
pub struct CreatorAgencyInviteAgency {
    pub agency_name: Option<String>,
    pub logo_url: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
}


#[derive(Serialize, Deserialize)]
pub struct ListInvitesResponse {
    pub status: String,
    pub invites: Vec<CreatorAgencyInvite>,
}


#[derive(Serialize, Deserialize)]
pub struct ActionResponse {
    pub status: String,
}


#[derive(Serialize, Deserialize)]
pub struct InviteRow {
    pub agency_id: String,
    pub creator_id: String,
    pub status: String,
}


#[derive(Serialize, Deserialize)]
pub struct AgencyUserRow {
    pub id: String,
}


#[derive(Serialize, Deserialize)]
pub struct AgencyConnection {
    pub agency_id: String,
    pub agencies: Option<AgencyConnectionAgency>,
    pub marketplace_contract:
        Option<crate::agencies::marketplace_contracts::MarketplaceContractSummary>,
}


#[derive(Serialize, Deserialize)]
pub struct AgencyConnectionAgency {
    pub agency_name: Option<String>,
    pub logo_url: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
}


#[derive(Serialize, Deserialize)]
pub struct ListConnectionsResponse {
    pub status: String,
    pub connections: Vec<AgencyConnection>,
}


#[derive(Serialize, Deserialize)]
pub struct ContractSummaryResponse {
    pub status: String,
    pub contract: Option<crate::agencies::marketplace_contracts::MarketplaceContractSummary>,
}


#[derive(Serialize, Deserialize)]
pub struct DisconnectRequestPayload {
    pub reason: Option<String>,
}


