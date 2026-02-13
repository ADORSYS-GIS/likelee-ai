import { base44 } from "./base44Client";

export interface LicenseSubmission {
  id: string;
  agency_id: string;
  client_id?: string;
  template_id: string;
  licensing_request_id?: string;
  docuseal_submission_id: number;
  docuseal_slug: string;
  client_name?: string;
  client_email?: string;
  talent_names?: string;
  license_fee?: number;
  duration_days?: number;
  start_date?: string;
  custom_terms?: string;
  status: string; // 'sent', 'opened', 'completed', 'declined', 'expired'
  sent_at?: string;
  opened_at?: string;
  signed_at?: string;
  declined_at?: string;
  decline_reason?: string;
  signed_document_url?: string;
  template_name?: string; // Fetched via join
  created_at: string;
  updated_at: string;
}

export interface CreateSubmissionRequest {
  template_id: string;
  client_id?: string;
  client_email: string;
  client_name: string;
  docuseal_template_id?: number;
  talent_names?: string;
  license_fee?: number;
  duration_days?: number;
  start_date?: string;
  custom_terms?: string;
}

export const getLicenseSubmissions = async (): Promise<LicenseSubmission[]> => {
  return await base44.get<LicenseSubmission[]>("/license-submissions");
};

export const createLicenseSubmissionDraft = async (
  data: CreateSubmissionRequest,
): Promise<any> => {
  return await base44.post<any>("/license-submissions/draft", data);
};

export const createAndSendLicenseSubmission = async (data: {
  template_id: string;
  docuseal_template_id?: number;
  client_name: string;
  client_email: string;
  talent_names?: string;
  license_fee?: number;
  duration_days?: number;
  start_date?: string;
  custom_terms?: string;
}): Promise<LicenseSubmission> => {
  return await base44.post<LicenseSubmission>(
    "/license-submissions/create-and-send",
    data,
  );
};

export const finalizeLicenseSubmission = async (
  id: string,
  data?: {
    docuseal_template_id?: number;
    client_name?: string;
    client_email?: string;
    talent_names?: string;
    usage_scope?: string;
    license_fee?: number;
    duration_days?: number;
    territory?: string;
    exclusivity?: string;
    modifications_allowed?: string;
    custom_terms?: string;
    start_date?: string;
  },
): Promise<LicenseSubmission> => {
  return await base44.post<LicenseSubmission>(
    `/license-submissions/${id}/finalize`,
    data || {},
  );
};

export const previewLicenseSubmission = async (
  id: string,
  data?: {
    docuseal_template_id?: number;
    client_name?: string;
    client_email?: string;
    talent_names?: string;
    license_fee?: number;
    duration_days?: number;
    start_date?: string;
    custom_terms?: string;
  },
): Promise<{
  preview_url: string;
  docuseal_submission_id: number;
  docuseal_slug: string;
}> => {
  return await base44.post<{
    preview_url: string;
    docuseal_submission_id: number;
    docuseal_slug: string;
  }>(`/license-submissions/${id}/preview`, data || {});
};

export const getLicenseSubmissionDetails = async (
  id: string,
): Promise<LicenseSubmission> => {
  return await base44.get<LicenseSubmission>(`/license-submissions/${id}`);
};

export const resendLoginSubmission = async (id: string): Promise<void> => {
  await base44.post(`/license-submissions/${id}/resend`);
};

export const archiveLicenseSubmission = async (id: string): Promise<void> => {
  await base44.delete(`/license-submissions/${id}`);
};
export const recoverLicenseSubmission = async (id: string): Promise<void> => {
  await base44.post(`/license-submissions/${id}/recover`);
};
