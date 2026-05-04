export interface ComplianceRenewableLicense {
  id: string;
  brand_id?: string | null;
  talent_id?: string | null;
  submission_id?: string | null;
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
  oldLicenseId?: string; // ID of the expired license being renewed
  brandId?: string;
  talentId?: string;
  clientName: string;
  clientEmail: string;
  talentName: string;
  durationDays?: number;
  startDate?: string;
  customTerms?: string;
  requiresAgencySignature?: boolean;
  territory?: string;
  exclusivity?: string;
  modificationsAllowed?: string;
  licenseFee?: number;
}
