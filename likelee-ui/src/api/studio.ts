import { base44 } from "./base44Client";

export type StudioProvider = "fal" | "higgsfield" | "kive";
export type StudioGenerationType = "video" | "image" | "avatar" | "image_to_video";
export type StudioGenerationStatus =
  | "draft"
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type StudioWalletResponse = {
  balance: number;
  user_id: string;
  current_plan?: string | null;
};

export type StudioTransaction = {
  id: string;
  delta: number;
  balance_after: number;
  reason: string;
  provider?: string | null;
  generation_id?: string | null;
  created_at: string;
};

export type StudioGenerateResponse = {
  generation_id: string;
  status: StudioGenerationStatus;
  credits_used: number;
};

export type StudioJobStatusResponse = {
  generation_id: string;
  status: StudioGenerationStatus;
  output_urls: string[];
  output_metadata?: any;
  error_message?: string | null;
};

export type StudioGenerationRow = {
  id: string;
  provider: string;
  model: string;
  generation_type: string;
  status: string;
  input_params?: any;
  output_urls?: string[];
  credits_used?: number;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
};

export function inferProviderFromModel(model: string): StudioProvider {
  const m = String(model || "").toLowerCase();
  if (m.includes("higgsfield")) return "higgsfield";
  if (m.includes("kive")) return "kive";
  return "fal";
}

export async function getWallet(): Promise<StudioWalletResponse> {
  return await base44.get("/studio/wallet");
}

export async function listTransactions(): Promise<StudioTransaction[]> {
  return await base44.get("/studio/transactions");
}

export async function listGenerations(params?: {
  generation_type?: StudioGenerationType;
  limit?: number;
}): Promise<StudioGenerationRow[]> {
  return await base44.get("/studio/generations", {
    params: {
      generation_type: params?.generation_type,
      limit: params?.limit,
    },
  });
}

export async function generate(input: {
  provider: StudioProvider;
  model: string;
  generation_type: StudioGenerationType;
  input_params: any;
  campaign_id?: string;
}): Promise<StudioGenerateResponse> {
  return await base44.post("/studio/generate", input);
}

export async function getJobStatus(generationId: string): Promise<StudioJobStatusResponse> {
  return await base44.get(`/studio/jobs/${generationId}`);
}
