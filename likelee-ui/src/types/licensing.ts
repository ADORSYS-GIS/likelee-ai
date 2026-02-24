export interface ComplianceRenewableLicense {
    id: string;
    template_id?: string | null;
    talent_name?: string;
    talent_avatar?: string;
    client_name?: string | null;
    client_email?: string | null;
    brand?: string;
    end_date?: string;
}

export interface RenewalLaunchContext {
    templateId: string;
    clientName: string;
    clientEmail: string;
    talentName: string;
}
