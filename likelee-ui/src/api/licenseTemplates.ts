import { base44 } from "./base44Client";

export interface LicenseTemplate {
  id: string;
  agency_id: string;
  template_name: string;
  category: string;
  description?: string;
  usage_scope?: string;
  duration_days: number;
  territory: string;
  exclusivity: string;
  modifications_allowed?: string;
  license_fee?: number;
  custom_terms?: string;
  usage_count: number;
  created_at?: string;
  docuseal_template_id?: number;
  client_name?: string;
  talent_name?: string;
  start_date?: string;
}

export interface CreateTemplateRequest {
  template_name: string;
  category: string;
  description?: string;
  usage_scope?: string;
  duration_days: number;
  territory: string;
  exclusivity: string;
  modifications_allowed?: string;
  license_fee?: number;
  custom_terms?: string;
  docuseal_template_id?: number;
  document_base64?: string;
  client_name?: string;
  talent_name?: string;
  start_date?: string;
}

export interface TemplateStats {
  total_templates: number;
  categories: number;
  most_used: string;
  avg_deal_value: string;
}

export const getLicenseTemplates = async (): Promise<LicenseTemplate[]> => {
  return await base44.get<LicenseTemplate[]>("/license-templates");
};

export const getTemplateStats = async (): Promise<TemplateStats> => {
  return await base44.get<TemplateStats>("/license-templates/stats");
};

export const createLicenseTemplate = async (
  data: CreateTemplateRequest,
): Promise<LicenseTemplate> => {
  return await base44.post<LicenseTemplate>("/license-templates", data);
};

export const updateLicenseTemplate = async (
  id: string,
  data: CreateTemplateRequest,
): Promise<LicenseTemplate> => {
  return await base44.post<LicenseTemplate>(
    `/license-templates/${id}`,
    data,
  );
};

export const deleteLicenseTemplate = async (id: string): Promise<void> => {
  await base44.delete(`/license-templates/${id}`);
};

export const copyLicenseTemplate = async (
  id: string,
): Promise<LicenseTemplate> => {
  return await base44.post<LicenseTemplate>(
    `/license-templates/${id}/copy`,
  );
};

export const createBuilderToken = async (
  template_name: string,
  docuseal_template_id?: number,
  external_id?: string,
): Promise<{ token: string; values: any; docuseal_user_email: string }> => {
  return await base44.post<{
    token: string;
    values: any;
    docuseal_user_email: string;
  }>("/docuseal/builder-token", {
    template_name,
    docuseal_template_id,
    external_id,
  });
};
