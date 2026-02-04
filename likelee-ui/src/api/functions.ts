import { base44 as base44Client } from "./base44Client";
import { KycSessionResponse, KycStatusResponse } from "../types/kyc";

export const generateVideo = (data: any) =>
  base44Client.post("/api/video/generate", data);

export const generateImage = (data: any) =>
  base44Client.post("/api/image/generate", data);

export const checkJobStatus = (jobId: string) =>
  base44Client.get(`/api/job/status/${jobId}`);

export const generateAvatar = (data: any) =>
  base44Client.post("/api/avatar/generate", data);

export const imageToVideo = (data: any) =>
  base44Client.post("/api/image-to-video", data);

export const removeBackground = (data: any) =>
  base44Client.post("/api/image/remove-background", data);

export const upscaleImage = (data: any) =>
  base44Client.post("/api/image/upscale", data);

export const faceSwap = (data: any) =>
  base44Client.post("/api/image/face-swap", data);

export const createCheckoutSession = (data: any) =>
  base44Client.post("/api/stripe/create-checkout-session", data);

export const stripeWebhook = (data: any) =>
  base44Client.post("/webhooks/stripe", data);

export const generateAudio = (data: any) =>
  base44Client.post("/api/audio/generate", data);

export const sitemap = () => base44Client.get("/sitemap");

export const robots = () => base44Client.get("/robots.txt");

export const upworkCallback = (data: any) =>
  base44Client.post("/api/upwork/callback", data);

export const fetchAdzunaJobs = (params: any) =>
  base44Client.get("/api/jobs/adzuna", { params });

export const fetchGoogleJobs = (params: any) =>
  base44Client.get("/api/jobs/google", { params });

export const fetchJoobleJobs = (params: any) =>
  base44Client.get("/api/jobs/jooble", { params });

export const testJobApis = () => base44Client.get("/api/jobs/test");

export const expandJobDescription = (data: any) =>
  base44Client.post("/api/jobs/expand-description", data);

export const createUserAccount = (data: any) =>
  base44Client.post("/api/auth/register", data);

export const loginUser = (data: any) =>
  base44Client.post("/api/auth/login", data);

export const createVoiceProfile = (data: any) =>
  base44Client.post("/api/voice/create-profile", data);

export const sitemapXml = () => base44Client.get("/sitemap.xml");

export const staticPages = () => base44Client.get("/static-pages");

// Owner (user) KYC
export const createKycSession = () =>
  base44Client.post<KycSessionResponse>("/api/kyc/session", {});

export const getKycStatus = () =>
  base44Client.get<KycStatusResponse>(`/api/kyc/status`);

// Organization (profile) KYC
export const createOrganizationKycSession = (data: {
  organization_id: string;
}) =>
  base44Client.post<KycSessionResponse>("/api/kyc/organization/session", data);

export const getOrganizationKycStatus = (organization_id: string) =>
  base44Client.get<KycStatusResponse>(
    `/api/kyc/organization/status?organization_id=${organization_id}`,
  );

export const getBrandProfile = () =>
  base44Client.get(`/api/brand-profile/user`);

export const getAgencyProfile = () =>
  base44Client.get(`/api/agency-profile/user`);

// Agency billing (Stripe subscriptions)
export const createAgencySubscriptionCheckout = (data: {
  tier: "agency" | "scale";
}) => base44Client.post(`/api/agency/billing/checkout`, data);

export const updateBrandProfile = (data: any) =>
  base44Client.post(`/api/brand-profile`, data);

export const updateAgencyProfile = (data: any) =>
  base44Client.post(`/api/agency-profile`, data);

export const registerBrand = (data: any) =>
  base44Client.post(`/api/brand-register`, data);

export const registerAgency = (data: any) =>
  base44Client.post(`/api/agency-register`, data);

// Dashboard data for the authenticated user
export const getDashboard = () => base44Client.get(`/api/dashboard`);

// Payouts (Stripe Connect)
export const getPayoutsAccountStatus = async (profileId: string) => {
  const resp = await base44Client.get(`/api/payouts/account_status`, {
    params: { profile_id: profileId },
  });
  return { data: resp } as any;
};

// Agency Stripe Connect (Accounting)
export const getAgencyPayoutsAccountStatus = async () => {
  const resp = await base44Client.get(`/api/agency/payouts/account_status`);
  return { data: resp } as any;
};

export const getPayoutBalance = async (profileId: string) => {
  const resp = await base44Client.get(`/api/payouts/balance`, {
    params: { profile_id: profileId },
  });
  return { data: resp } as any;
};

export const getStripeOAuthUrl = async (profileId: string) => {
  const resp = await base44Client.post(
    `/api/payouts/onboarding_link`,
    {},
    {
      params: { profile_id: profileId },
    },
  );
  // Backend returns { url }, adapt to UI expectations
  return { data: { status: "ok", url: (resp as any)?.url } } as any;
};

export const getAgencyStripeOnboardingLink = async () => {
  const resp = await base44Client.post(
    `/api/agency/payouts/onboarding_link`,
    {},
  );
  return { data: { status: "ok", url: (resp as any)?.url } } as any;
};

// Some flows may reference an OAuth code exchange; backend currently uses account links.
// Provide a safe placeholder to avoid runtime import errors if called.
export const exchangeStripeOAuthCode = async (
  _code: string,
  _profileId: string,
) => {
  return { data: { status: "error", error: "not_supported" } } as any;
};

// Agency Dashboard API
export const getAgencyDashboardOverview = () =>
  base44Client.get("/api/agency/dashboard/overview");

export const getAgencyTalentPerformance = () =>
  base44Client.get("/api/agency/dashboard/talent-performance");

export const getAgencyRevenueBreakdown = () =>
  base44Client.get("/api/agency/dashboard/revenue-breakdown");

export const getAgencyLicensingPipeline = () =>
  base44Client.get("/api/agency/dashboard/licensing-pipeline");

export const getAgencyRecentActivity = () =>
  base44Client.get("/api/agency/dashboard/recent-activity");
// Agency Roster
export const getAgencyRoster = () => base44Client.get("/api/agency/roster");

export const createAgencyTalent = (data: any) =>
  base44Client.post("/api/agency/talent", data);

export const updateAgencyTalent = (id: string, data: any) =>
  base44Client.post(`/api/agency/talent/${id}`, data);

export const getAgencyDigitals = () => base44Client.get("/api/agency/digitals");

export const getTalentDigitals = (talentId: string) =>
  base44Client.get(`/api/agency/talent/${talentId}/digitals`);

export const getTalentCampaigns = (talentId: string) =>
  base44Client.get(`/api/agency/talent/${talentId}/campaigns`);

export const updateCampaignSplit = (
  campaignId: string,
  data: {
    payment_amount?: number;
    agency_percent?: number;
    talent_percent?: number;
  },
) => base44Client.post(`/api/agency/campaigns/${campaignId}`, data);

// Licensing Requests (Agency Dashboard)
export const getAgencyLicensingRequests = () =>
  base44Client.get(`/api/agency/licensing-requests`);

export const updateAgencyLicensingRequestsStatus = (data: {
  licensing_request_ids: string[];
  status: "pending" | "approved" | "rejected";
  notes?: string;
}) => base44Client.post(`/api/agency/licensing-requests/status`, data);

export const getAgencyLicensingRequestsPaySplit = (
  licensing_request_ids: string,
) =>
  base44Client.get(`/api/agency/licensing-requests/pay-split`, {
    params: { licensing_request_ids },
  });

export const setAgencyLicensingRequestsPaySplit = (data: {
  licensing_request_ids: string[];
  total_payment_amount: number;
  agency_percent: number;
}) => base44Client.post(`/api/agency/licensing-requests/pay-split`, data);

export const createTalentDigitals = (talentId: string, data: any) =>
  base44Client.post(`/api/agency/talent/${talentId}/digitals`, data);

export const updateDigitals = (id: string, data: any) =>
  base44Client.post(`/api/agency/digitals/${id}`, data);

export const sendDigitalsReminders = (
  talentIds: string[],
  opts?: { subject?: string; body?: string },
) =>
  base44Client.post(`/api/agency/digitals/reminders`, {
    talent_ids: talentIds,
    subject: opts?.subject,
    body: opts?.body,
  });

export const listAgencyClients = () => base44Client.get("/api/agency/clients");

export const shareCompCard = (data: {
  client_ids: string[];
  subject?: string;
  message?: string;
  comp_card_url: string;
  talent_name?: string;
}) => base44Client.post("/api/agency/comp-cards/share", data);

export const sendCoreEmail = (data: {
  to: string;
  subject: string;
  body: string;
  from_name?: string;
}) => base44Client.post("/api/integrations/core/send-email", data);
// Bookings (Agency Dashboard)
export const listBookings = (params?: {
  date_start?: string;
  date_end?: string;
  client_id?: string;
}) => base44Client.get(`/api/bookings`, { params: params || {} });

export const createBooking = (data: any) =>
  base44Client.post(`/api/bookings`, data);

export const updateBooking = (id: string, data: any) =>
  base44Client.post(`/api/bookings/${id}`, data);

export const cancelBooking = (id: string) =>
  base44Client.post(`/api/bookings/${id}/cancel`, {});

// Agency talents
export const getAgencyTalents = (params?: { q?: string }) =>
  base44Client.get(`/api/agency/talents`, { params: params || {} });

// Create booking with files (multipart)
export const createBookingWithFiles = async (data: any, files: File[]) => {
  const fd = new FormData();
  fd.append("data", JSON.stringify(data));
  for (const f of files) fd.append("files", f);
  // Do NOT set Content-Type manually; let the browser add the multipart boundary
  return base44Client.post(`/api/bookings/with-files`, fd);
};

// Agency clients
export const getAgencyClients = () => base44Client.get(`/api/agency/clients`);
export const createAgencyClient = (data: any) =>
  base44Client.post(`/api/agency/clients`, data);

// Invoices (Agency Dashboard)
export const listInvoices = (params?: {
  status?: string;
  date_start?: string;
  date_end?: string;
}) => base44Client.get(`/api/invoices`, { params: params || {} });

export const getInvoice = (id: string) =>
  base44Client.get(`/api/invoices/${id}`);

// Talent Statements (Agency Dashboard)
export const listTalentStatements = (params?: {
  talent_id?: string;
  year?: number;
}) => base44Client.get(`/api/talent-statements`, { params: params || {} });

// Expenses (Agency Dashboard)
export const listExpenses = (params?: {
  date_start?: string;
  date_end?: string;
  category?: string;
  status?: string;
}) => base44Client.get(`/api/expenses`, { params: params || {} });

export const createExpense = (data: any) =>
  base44Client.post(`/api/expenses`, data);

export const createInvoice = (data: any) =>
  base44Client.post(`/api/invoices`, data);

export const updateInvoice = (id: string, data: any) =>
  base44Client.post(`/api/invoices/${id}`, data);

export const markInvoiceSent = (id: string) =>
  base44Client.post(`/api/invoices/${id}/mark-sent`, {});

export const markInvoicePaid = (id: string) =>
  base44Client.post(`/api/invoices/${id}/mark-paid`, {});

export const voidInvoice = (id: string) =>
  base44Client.post(`/api/invoices/${id}/void`, {});

// Book-Outs (Availability)
export const listBookOuts = (params?: {
  date_start?: string;
  date_end?: string;
}) => base44Client.get(`/api/book-outs`, { params: params || {} });

export const createBookOut = (data: {
  talent_id: string;
  start_date: string;
  end_date: string;
  reason?: string;
  notes?: string;
}) => base44Client.post(`/api/book-outs`, data);

// Note: base44Client doesn't expose DELETE; use a POST shim if imported elsewhere.
export const deleteBookOut = (id: string) =>
  base44Client.post(`/api/book-outs/${id}`, { _method: "DELETE" });

// Notifications
export const notifyBookingCreatedEmail = (booking_id: string) =>
  base44Client.post(`/api/notifications/booking-created-email`, { booking_id });

export const listBookingNotifications = (params?: { limit?: number }) =>
  base44Client.get(`/api/notifications/booking-notifications`, {
    params: params || {},
  });

// Agency files (multipart)
export const uploadAgencyFile = async (file: File) => {
  const fd = new FormData();
  fd.append("file", file);
  // Do NOT set Content-Type manually; let the browser add the multipart boundary
  return base44Client.post(`/api/agency/files/upload`, fd);
};

// Agency storage (File Storage)
export const getAgencyStorageUsage = () =>
  base44Client.get(`/api/agency/storage/usage`);

export const listAgencyStorageFolders = () =>
  base44Client.get(`/api/agency/storage/folders`);

export const createAgencyStorageFolder = (data: {
  name: string;
  parent_id?: string | null;
}) => base44Client.post(`/api/agency/storage/folders`, data);

export const listAgencyStorageFoldersPaged = (params?: {
  limit?: number;
  offset?: number;
}) => base44Client.get(`/api/agency/storage/folders`, { params: params || {} });

export const listAgencyStorageFiles = (params?: { folder_id?: string }) =>
  base44Client.get(`/api/agency/storage/files`, { params: params || {} });

export const listAgencyStorageFilesPaged = (params?: {
  folder_id?: string;
  limit?: number;
  offset?: number;
}) => base44Client.get(`/api/agency/storage/files`, { params: params || {} });

export const uploadAgencyStorageFile = async (data: {
  file: File;
  folder_id?: string;
}) => {
  const fd = new FormData();
  fd.append("file", data.file);
  if (data.folder_id) fd.append("folder_id", data.folder_id);
  return base44Client.post(`/api/agency/storage/files/upload`, fd);
};

export const deleteAgencyStorageFile = (file_id: string) =>
  base44Client.delete(`/api/agency/storage/files/${file_id}`);

export const getAgencyStorageFileSignedUrl = (file_id: string) =>
  base44Client.get(`/api/agency/storage/files/${file_id}/signed-url`);

// Email
export const getEmailTemplates = () => base44Client.get(`/api/email/templates`);
export const saveEmailTemplate = (data: any) =>
  base44Client.post(`/api/email/templates`, data);

export const sendEmail = (data: {
  to: string;
  subject: string;
  body: string;
  attachments?: Array<{
    filename: string;
    content_type: string;
    content_base64: string;
  }>;
}) => base44Client.post(`/api/integrations/core/send-email`, data);
