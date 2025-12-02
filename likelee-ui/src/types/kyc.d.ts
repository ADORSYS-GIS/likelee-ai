export interface KycSessionResponse {
  session_id: string;
  session_url: string;
  provider: string;
}

export interface KycStatusResponse {
  kyc_status: string;
  liveness_status: string;
  kyc_provider: string;
  kyc_session_id: string;
  verified_at: string | null;
}
