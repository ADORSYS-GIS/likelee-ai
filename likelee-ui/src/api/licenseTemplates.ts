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
    pricing_range_min_cents?: number;
    pricing_range_max_cents?: number;
    additional_terms?: string;
    usage_count: number;
    created_at?: string;
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
    pricing_range_min_cents?: number;
    pricing_range_max_cents?: number;
    additional_terms?: string;
}

export interface TemplateStats {
    total_templates: number;
    categories: number;
    most_used: string;
    avg_deal_value: string;
}

export const getLicenseTemplates = async (): Promise<LicenseTemplate[]> => {
    return await base44.get<LicenseTemplate[]>("/api/license-templates");
};

export const getTemplateStats = async (): Promise<TemplateStats> => {
    return await base44.get<TemplateStats>("/api/license-templates/stats");
};

export const createLicenseTemplate = async (
    data: CreateTemplateRequest
): Promise<LicenseTemplate> => {
    return await base44.post<LicenseTemplate>("/api/license-templates", data);
};

export const updateLicenseTemplate = async (
    id: string,
    data: CreateTemplateRequest
): Promise<LicenseTemplate> => {
    return await base44.post<LicenseTemplate>(`/api/license-templates/${id}`, data);
};

export const deleteLicenseTemplate = async (id: string): Promise<void> => {
    await base44.delete(`/api/license-templates/${id}`);
};

export const copyLicenseTemplate = async (id: string): Promise<LicenseTemplate> => {
    return await base44.post<LicenseTemplate>(`/api/license-templates/${id}/copy`);
};
