import { base44 } from "@/api/base44Client";

export type MarketplaceContractSummary = {
  id: string;
  status: string;
  commission_rate?: number | null;
  valid_from?: string | null;
  valid_until?: string | null;
  template_name?: string | null;
  docuseal_template_id?: number | null;
  docuseal_status?: string | null;
  creator_sign_url?: string | null;
  agency_sign_url?: string | null;
  signed_document_url?: string | null;
};

export type CreateMarketplaceCreatorContractRequest = {
  profile_type: "creator";
  target_id: string;
  contract_template_id?: string;
  contract_body?: string;
  contract_body_format?: "markdown" | "html";
  commission_rate: number;
  valid_from: string;
  valid_until: string;
};

export async function createMarketplaceCreatorContract(
  data: CreateMarketplaceCreatorContractRequest,
): Promise<{
  status: string;
  contract?: MarketplaceContractSummary;
}> {
  return await base44.post("/api/marketplace/connect", data);
}

export async function finalizeMarketplaceCreatorContract(id: string): Promise<{
  status: string;
  contract?: MarketplaceContractSummary;
}> {
  return await base44.post(
    `/api/marketplace/contracts/${encodeURIComponent(id)}/finalize`,
    {},
  );
}

export async function syncMarketplaceContract(id: string): Promise<{
  status: string;
  contract: MarketplaceContractSummary;
}> {
  return await base44.post(
    `/api/marketplace/contracts/${encodeURIComponent(id)}/sync`,
    {},
  );
}
