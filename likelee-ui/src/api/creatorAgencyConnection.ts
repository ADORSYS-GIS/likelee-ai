import { base44 } from "@/api/base44Client";
import { MarketplaceContractSummary } from "@/api/marketplaceContracts";

export type CreatorAgencyInvite = {
  id: string;
  agency_id: string;
  creator_id: string;
  status: "pending" | "accepted" | "declined" | "revoked" | string;
  contract_id?: string | null;
  marketplace_contract?: MarketplaceContractSummary | null;
  created_at?: string;
  responded_at?: string;
  updated_at?: string;
  agencies?: {
    agency_name?: string;
    logo_url?: string;
    email?: string;
    website?: string;
  };
};

export async function listCreatorAgencyInvites(): Promise<
  CreatorAgencyInvite[]
> {
  const res = await base44.get<{
    status: string;
    invites: CreatorAgencyInvite[];
  }>("/api/creator/agency-invites");
  return res.invites || [];
}

export async function acceptCreatorAgencyInvite(id: string): Promise<void> {
  await base44.post<{ status: string }>(
    `/api/creator/agency-invites/${encodeURIComponent(id)}/accept`,
  );
}

export async function declineCreatorAgencyInvite(id: string): Promise<void> {
  await base44.post<{ status: string }>(
    `/api/creator/agency-invites/${encodeURIComponent(id)}/decline`,
  );
}

export async function syncCreatorAgencyMarketplaceContract(
  id: string,
): Promise<{
  status: string;
  contract: MarketplaceContractSummary;
}> {
  return await base44.post(
    `/api/marketplace/contracts/${encodeURIComponent(id)}/sync`,
    {},
  );
}

export type CreatorAgencyConnection = {
  agency_id: string;
  agencies?: {
    agency_name?: string;
    logo_url?: string;
  };
};

export async function listCreatorAgencyConnections(): Promise<
  CreatorAgencyConnection[]
> {
  const res = await base44.get<{
    status: string;
    connections: CreatorAgencyConnection[];
  }>("/api/creator/agency-connections");
  return res.connections || [];
}

export async function disconnectCreatorAgencyConnection(
  agencyId: string,
): Promise<void> {
  await base44.post<{ status: string }>(
    `/api/creator/agency-connections/${encodeURIComponent(agencyId)}/disconnect`,
  );
}
