import { base44 as base44Client } from "./base44Client";
import { KycSessionResponse, KycStatusResponse } from "../types/kyc";
import { supabase } from "@/lib/supabase";

export const generateVideo = (data: any) =>
  base44Client.post("/video/generate", data);

export const generateImage = (data: any) =>
  base44Client.post("/image/generate", data);

export const checkJobStatus = (jobId: string) =>
  base44Client.get(`/job/status/${jobId}`);

export const imageToVideo = (data: any) =>
  base44Client.post("/image-to-video", data);

export const removeBackground = (data: any) =>
  base44Client.post("/image/remove-background", data);

export const upscaleImage = (data: any) =>
  base44Client.post("/image/upscale", data);

export const faceSwap = (data: any) =>
  base44Client.post("/image/face-swap", data);

export const createCheckoutSession = (data: any) =>
  base44Client.post("/stripe/create-checkout-session", data);

export const stripeWebhook = (data: any) =>
  base44Client.post("/webhooks/stripe", data);

export const generateAudio = (data: any) =>
  base44Client.post("/audio/generate", data);

export const sitemap = () => base44Client.get("/sitemap");

export const robots = () => base44Client.get("/robots.txt");

export const upworkCallback = (data: any) =>
  base44Client.post("/upwork/callback", data);

export const fetchAdzunaJobs = (params: any) =>
  base44Client.get("/jobs/adzuna", { params });

export const fetchGoogleJobs = (params: any) =>
  base44Client.get("/jobs/google", { params });

export const fetchJoobleJobs = (params: any) =>
  base44Client.get("/jobs/jooble", { params });

// Calendly Integration
export const getCalendlyBookingUrl = () =>
  base44Client.get<{
    status: string;
    data?: { booking_url: string; warning?: string | null };
    error?: string;
  }>("/booking/calendly-url");

export const getAgencyCalendlySettings = () =>
  base44Client.get<{
    status: string;
    data?: {
      calendly_api_token?: string | null;
      scheduling_url?: string | null;
      is_enabled?: boolean;
      mappings?: Record<string, string>;
    };
    error?: string;
    message?: string;
  }>("/calendly/settings");

export const testJobApis = () => base44Client.get("/jobs/test");

export const expandJobDescription = (data: any) =>
  base44Client.post("/jobs/expand-description", data);

export const createUserAccount = (data: any) =>
  base44Client.post("/auth/register", data);

export const loginUser = (data: any) => base44Client.post("/auth/login", data);

export const createVoiceProfile = (data: any) =>
  base44Client.post("/voice/create-profile", data);

export const listVoiceRecordings = () =>
  base44Client.get(`/api/voice/recordings`);

export const deleteVoiceRecording = (id: string) =>
  base44Client.delete(`/api/voice/recordings/${id}`);

export const uploadVoiceRecording = async (input: {
  file: File;
  emotion_tag?: string;
}) => {
  const {
    data: { session },
  } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  const token = session?.access_token;

  const base =
    (import.meta as any)?.env?.VITE_API_BASE_URL ||
    ((import.meta as any)?.env?.DEV ? "http://localhost:8787" : "/api");
  const normalizedBase = String(base).endsWith("/") ? String(base) : `${base}/`;
  const full = new URL(
    `/api/voice/recordings?emotion_tag=${encodeURIComponent(input.emotion_tag || "")}`,
    normalizedBase.startsWith("http")
      ? normalizedBase
      : new URL(normalizedBase, window.location.origin).toString(),
  ).toString();

  const body = await input.file.arrayBuffer();
  const res = await fetch(full, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": input.file.type || "audio/webm",
    },
    body,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`POST ${full} failed: ${res.status} ${txt}`);
  }
  return (await res.json()) as any;
};

export const sitemapXml = () => base44Client.get("/sitemap.xml");

export const staticPages = () => base44Client.get("/static-pages");

// Owner (user) KYC
export const createKycSession = () =>
  base44Client.post<KycSessionResponse>("/kyc/session", {});

export const getKycStatus = () =>
  base44Client.get<KycStatusResponse>(`/kyc/status`);

// Organization (profile) KYC
export const createOrganizationKycSession = (data: {
  organization_id: string;
}) => base44Client.post<KycSessionResponse>("/kyc/organization/session", data);

export const getOrganizationKycStatus = (organization_id: string) =>
  base44Client.get<KycStatusResponse>(
    `/kyc/organization/status?organization_id=${organization_id}`,
  );

export const getBrandProfile = () => base44Client.get(`/brand-profile/user`);

export const getAgencyProfile = () => base44Client.get(`/agency-profile/user`);

// Agency billing (Stripe subscriptions)
export const createAgencySubscriptionCheckout = (data: {
  plan: "basic" | "pro" | "enterprise";
  roster_models: number;
  interval?: "month" | "year";
  start_trial?: boolean;
  agreement_accepted?: boolean;
  addons?: {
    irl_booking?: boolean;
    seats_in_plan?: boolean;
    deepfake_protection_models?: number;
    additional_team_members?: number;
  };
}) => base44Client.post(`/agency/billing/checkout`, data);

export const createBrandSubscriptionCheckout = (data: {
  plan: "basic" | "pro" | "enterprise";
  billing_cycle?: "monthly" | "annual";
  next_path?: string;
}) => base44Client.post(`/brand/billing/checkout`, data);

export const createBrandBillingPortal = () =>
  base44Client.post<{ checkout_url: string }>(`/brand/billing/portal`, {});

export const createBrandPaymentMethodSetupIntent = () =>
  base44Client.post<{ client_secret: string }>(
    `/brand/billing/payment-method/setup-intent`,
    {},
  );

export const getBrandPaymentMethods = () =>
  base44Client.get<{
    payment_methods: Array<{
      id: string;
      stripe_payment_method_id: string;
      card_last_four: string;
      card_brand: string;
      card_exp_month: number;
      card_exp_year: number;
      is_active: boolean;
      created_at: string;
    }>;
    primary_payment_method: {
      stripe_payment_method_id: string;
      card_last_four: string;
      card_brand: string;
      card_exp_month: number;
      card_exp_year: number;
    } | null;
  }>(`/brand/billing/payment-methods`);

export const setBrandPrimaryPaymentMethod = (data: {
  stripe_payment_method_id: string;
}) => base44Client.post(`/brand/billing/payment-method/set-primary`, data);

export const deleteBrandPaymentMethod = (data: {
  stripe_payment_method_id: string;
}) => base44Client.post(`/brand/billing/payment-method/delete`, data);

export const getBrandBillingStatus = () =>
  base44Client.get<{
    brand_id: string;
    plan_tier: string;
    subscription_status: string;
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
    current_period_end?: string | null;
    cancel_at_period_end: boolean;
    trial_active: boolean;
    trial_ends_at?: string | null;
  }>(`/api/brand/billing/status`);

export const getBrandSpendAnalytics = () =>
  base44Client.get<{
    monthly_spend: Array<{ month: string; spend: number }>;
    ytd_spend: number;
    monthly_avg: number;
    current_month_spend: number;
    previous_month_spend: number;
    current_month_growth_percentage: number;
    projected_eoy: number;
  }>(`/api/brand/billing/spend`);

export const getBrandEscrowSummary = () =>
  base44Client.get<{
    currencies: Record<string, number>;
    project_count: number;
  }>(`/api/brand/billing/escrow-summary`);

export const listBrandInvoices = () =>
  base44Client.get<{
    invoices: Array<{
      id: string;
      number?: string;
      amount: number;
      currency: string;
      status: string;
      created_at?: string;
      invoice_url?: string;
    }>;
  }>(`/api/brand/billing/invoices`);

export const getBrandBudgetSettings = () =>
  base44Client.get<{
    monthly_budget_limit: number | null;
    budget_alert_enabled: boolean;
  }>(`/api/brand/billing/budget-settings`);

export const updateBrandBudgetSettings = (data: {
  monthly_budget_limit?: number | null;
  budget_alert_enabled?: boolean;
}) =>
  base44Client.put<{
    monthly_budget_limit: number | null;
    budget_alert_enabled: boolean;
  }>(`/api/brand/billing/budget-settings`, data);

export const createBrandStudioAddonCheckout = (data?: { next_path?: string }) =>
  base44Client.post(`/brand/billing/studio-addon/checkout`, data || {});

export const verifyBrandStudioAddonCheckout = (data: { session_id: string }) =>
  base44Client.post<{ studio_addon_active: boolean }>(
    `/brand/billing/studio-addon/verify`,
    data,
  );

export const createCreatorSubscriptionCheckout = (data: {
  plan: "basic" | "pro";
  interval?: "month" | "year";
  start_trial?: boolean;
  agreement_accepted?: boolean;
}) => base44Client.post(`/creator/billing/checkout`, data);

export const getCreatorBillingStatus = () =>
  base44Client.get(`/creator/billing/status`);

export const createCreatorBillingPortal = () =>
  base44Client.post<{ checkout_url: string }>(
    `/api/creator/billing/portal`,
    {},
  );
export const createAgencyIrlBookingAddonCheckout = () =>
  base44Client.post(`/agency/billing/addons/irl-booking/checkout`, {});

export const createAgencyStudioAddonCheckout = () =>
  base44Client.post(`/agency/billing/addons/studio/checkout`, {});

export const startAgencyProTrial = () =>
  base44Client.post<{
    trial_active: boolean;
    trial_ends_at?: string | null;
    display_plan_label: string;
  }>(`/api/agency/billing/start-trial`, {});

export const createOrUpdateAgencySeatAddon = (data: {
  seats: number;
  plan?: "basic" | "pro";
  interval?: "month" | "year";
}) =>
  base44Client.post<{
    checkout_url: string;
    seats_limit?: number;
    invoice_id?: string;
    invoice_status?: string;
    invoice_url?: string;
  }>(`/api/agency/billing/addons/seats`, data);

export const getAgencySeatBreakdown = () =>
  base44Client.get<{
    total_active_seats: number;
    annual_seats: number;
    monthly_seats: number;
    items: Array<{
      source: "in_plan" | "seat_addon";
      interval: "month" | "year";
      seats: number;
      status: string;
      subscription_id: string;
      current_period_start?: string | null;
      current_period_end?: string | null;
    }>;
  }>(`/api/agency/billing/addons/seats/breakdown`);

export const createAgencyBillingPortal = () =>
  base44Client.post(`/api/agency/billing/portal`, {});

export const changeAgencySubscriptionPlan = (data: {
  plan: "basic" | "pro" | "enterprise";
  roster_models: number;
  interval?: "month" | "year";
  addons?: {
    irl_booking?: boolean;
    seats_in_plan?: boolean;
    deepfake_protection_models?: number;
    additional_team_members?: number;
  };
}) =>
  base44Client.post<{
    plan_tier: string;
    seats_limit: number;
    addon_irl_booking_enabled: boolean;
  }>(`/api/agency/billing/change-plan`, data);

export const syncAgencyCheckoutSession = (data?: { session_id?: string }) =>
  base44Client.post<{
    plan_tier: string;
    seats_limit: number;
    addon_irl_booking_enabled: boolean;
  }>(`/agency/billing/checkout/sync`, data || {});

export const syncCreatorCheckoutSession = (data?: { session_id?: string }) =>
  base44Client.post<{
    entitlement_tier: string;
    plan_tier: string;
    trial_active: boolean;
  }>(`/creator/billing/checkout/sync`, data || {});

export const updateBrandProfile = (data: any) =>
  base44Client.post(`/brand-profile`, data);

// Brand Notifications
export const listBrandNotifications = (params?: { limit?: number }) =>
  base44Client.get(`/brand/notifications`, { params });

export const markBrandNotificationRead = (id: string) =>
  base44Client.post(`/brand/notifications/${id}/read`);

export const getBrandNotificationCount = () =>
  base44Client.get(`/brand/notifications/count`);

export const getInboxUnreadCount = () =>
  base44Client.get(`/brand/inbox/unread-count`);

export const markInboxPackagesViewed = () =>
  base44Client.post(`/brand/inbox/mark-viewed`, {});

export const getJobsUnreadCount = () =>
  base44Client.get(`/brand/jobs/unread-count`);

export const markJobApplicationsViewed = () =>
  base44Client.post(`/brand/jobs/mark-viewed`, {});

export const getLicensingContractsCount = () =>
  base44Client.get(`/brand/licensing/contracts-count`);

export const createBrandCampaignLicenseRequest = (
  campaignId: string,
  data: {
    collaborator_type: "agency" | "creator";
    target_id: string;
    offered_rate_monthly_cents?: number;
    rate_currency?: string;
    campaign_title?: string;
    usage_scope?: string;
    regions?: string;
    deadline?: string;
    license_start_date?: string;
    license_end_date?: string;
    notes?: string;
  },
) =>
  base44Client.post(
    `/api/brand/campaigns/${encodeURIComponent(campaignId)}/license-requests`,
    data,
  );

export const updateAgencyProfile = (data: any) =>
  base44Client.post(`/agency-profile`, data);

export const registerBrand = (data: any) =>
  base44Client.post(`/brand-register`, data);

export const registerAgency = (data: any) =>
  base44Client.post(`/agency-register`, data);

// Dashboard data for the authenticated user
export const getDashboard = () => base44Client.get(`/dashboard`);

export const getTalentMe = (params?: { agency_id?: string }) =>
  base44Client.get(`/api/talent/me`, { params });

export const listTalentLicensingRequests = () =>
  base44Client.get(`/api/talent/licensing-requests`);

export const approveTalentLicensingRequest = (id: string) =>
  base44Client.post(`/api/talent/licensing-requests/${id}/approve`, {});

export const declineTalentLicensingRequest = (id: string) =>
  base44Client.post(`/api/talent/licensing-requests/${id}/decline`, {});

export const listTalentLicenses = () =>
  base44Client.get(`/api/talent/licenses`);

export const getTalentLicensingRevenue = (params?: {
  month?: string;
  agency_id?: string;
}) =>
  base44Client.get(`/api/talent/licensing/revenue`, { params: params || {} });

export const getTalentEarningsByCampaign = (params?: {
  month?: string;
  agency_id?: string;
}) =>
  base44Client.get(`/api/talent/licensing/earnings-by-campaign`, {
    params: params || {},
  });

export const getTalentEarningsByAgency = (params?: {
  month?: string;
  agency_id?: string;
}) =>
  base44Client.get(`/api/talent/licensing/earnings-by-agency`, {
    params: params || {},
  });

export const getTalentPayoutBalance = () =>
  base44Client.get(`/api/talent/payouts/balance`);

export const requestTalentPayout = (data: {
  amount_cents: number;
  currency?: string;
  payout_method?: "instant";
}) => base44Client.post(`/api/talent/payouts/request`, data);

export const getTalentPayoutAccountStatus = () =>
  base44Client.get(`/api/talent/payouts/account-status`);

export const getTalentPayoutOnboardingLink = () =>
  base44Client.post(`/api/talent/payouts/onboarding-link`, {});
export const getTalentPortalSettings = () =>
  base44Client.get(`/api/talent/settings`);

export const updateTalentPortalSettings = (data: {
  allow_training?: boolean;
  public_profile_visible?: boolean;
}) => base44Client.post(`/api/talent/settings`, data);

export const listTalentAgencyInvites = () =>
  base44Client.get(`/api/talent/agency-invites`);

export const getLatestTalentTaxDocument = (params?: {
  doc_type?: string;
  tax_year?: number;
}) =>
  base44Client.get(`/api/talent/tax-documents/latest`, {
    params: params || {},
  });

export const getTalentAnalytics = (params?: { month?: string }) =>
  base44Client.get(`/api/talent/analytics`, { params: params || {} });

export const listTalentPortfolioItems = (params?: { agency_id?: string }) =>
  base44Client.get(`/api/talent/portfolio-items`, { params: params || {} });

export const createTalentPortfolioItem = (data: {
  media_url: string;
  title?: string;
}) => base44Client.post(`/api/talent/portfolio-items`, data);

export const deleteTalentPortfolioItem = (id: string) =>
  base44Client.delete(`/api/talent/portfolio-items/${id}`);

export const listTalentBookings = (params?: { agency_id?: string }) =>
  base44Client.get(`/api/talent/bookings`, { params: params || {} });

export const listTalentBookOuts = (params?: {
  date_start?: string;
  date_end?: string;
  agency_id?: string;
}) => base44Client.get(`/api/talent/book-outs`, { params: params || {} });

export const createTalentBookOut = (data: {
  start_date: string;
  end_date: string;
  reason?: string;
  notes?: string;
  notify_agency?: boolean;
  agency_id?: string;
}) => base44Client.post(`/api/talent/book-outs`, data);

export const deleteTalentBookOut = (id: string) =>
  base44Client.delete(`/api/talent/book-outs/${id}`);

export const getTalentBookingPreferences = (params?: { agency_id?: string }) =>
  base44Client.get(`/api/talent/booking-preferences`, { params: params || {} });

export const updateTalentBookingPreferences = (data: {
  willing_to_travel?: boolean;
  min_day_rate_cents?: number | null;
  currency?: string;
  agency_id?: string;
}) => base44Client.post(`/api/talent/booking-preferences`, data);

export const getTalentIrlEarningsSummary = () =>
  base44Client.get(`/api/talent/irl/earnings/summary`);

export const listTalentIrlPayments = (params?: {
  limit?: number;
  agency_id?: string;
}) =>
  base44Client.get(`/api/talent/irl/earnings/payments`, {
    params: params || {},
  });

export const createTalentIrlPayoutRequest = (data: {
  amount_cents: number;
  currency?: string;
}) => base44Client.post(`/api/talent/irl/earnings/payout-request`, data);

export const uploadTalentPortfolioItem = async (data: {
  file: File;
  title?: string;
  agency_id?: string;
}) => {
  const fd = new FormData();
  fd.append("file", data.file);
  if (data.title) fd.append("title", data.title);
  if (data.agency_id) fd.append("agency_id", data.agency_id);
  return base44Client.post(`/api/talent/portfolio-items/upload`, fd);
};

export const updateTalentProfile = (data: any) =>
  base44Client.post(`/api/talent/profile`, data);

export const listTalentNotifications = (params?: { limit?: number }) =>
  base44Client.get(`/api/talent/notifications`, { params: params || {} });

export const markTalentNotificationRead = (id: string) =>
  base44Client.post(`/api/talent/notifications/${id}/read`, {});

// Payouts (Stripe Connect)
export const getPayoutsAccountStatus = async (profileId: string) => {
  const resp = await base44Client.get(`/payouts/account_status`, {
    params: { profile_id: profileId },
  });
  return { data: resp } as any;
};

// Agency Stripe Connect (Accounting)
export const getAgencyPayoutsAccountStatus = async () => {
  const resp = await base44Client.get(`/agency/payouts/account_status`);
  return { data: resp } as any;
};

export const getPayoutBalance = async (profileId: string) => {
  const resp = await base44Client.get(`/payouts/balance`, {
    params: { profile_id: profileId },
  });
  return { data: resp } as any;
};

export const getHistory = async (params: {
  profile_id: string;
  limit?: number;
}) => {
  const resp = await base44Client.get(`/api/payouts/history`, {
    params: params || {},
  });
  return { data: resp } as any;
};

export const getStripeOAuthUrl = async (profileId: string) => {
  const resp = await base44Client.post(
    `/payouts/onboarding_link`,
    {},
    {
      params: { profile_id: profileId },
    },
  );
  // Backend returns { url }, adapt to UI expectations
  return { data: { status: "ok", url: (resp as any)?.url } } as any;
};

export const getAgencyStripeOnboardingLink = async () => {
  const resp = await base44Client.post(`/agency/payouts/onboarding_link`, {});
  return { data: { status: "ok", url: (resp as any)?.url } } as any;
};

// Agency Payout Balance and Requests
export const getAgencyPayoutBalance = async () => {
  const resp = await base44Client.get(`/api/agency/payouts/balance`);
  return { data: resp } as any;
};

export const requestAgencyPayout = async (data: {
  amount_cents: number;
  currency?: string;
  payout_method?: "instant";
}) => {
  const resp = await base44Client.post(`/api/agency/payouts/request`, data);
  return { data: resp } as any;
};

export const getAgencyPayoutHistory = async () => {
  const resp = await base44Client.get(`/api/agency/payouts/history`);
  return { data: resp } as any;
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
  base44Client.get("/agency/dashboard/overview");

export const getAgencyTalentPerformance = () =>
  base44Client.get("/agency/dashboard/talent-performance");

export const getAgencyRevenueBreakdown = () =>
  base44Client.get("/agency/dashboard/revenue-breakdown");

export const getAgencyLicensingPipeline = () =>
  base44Client.get("/agency/dashboard/licensing-pipeline");

export const getAgencyRecentActivity = () =>
  base44Client.get("/agency/dashboard/recent-activity");
// Agency Roster
export const getAgencyRoster = () => base44Client.get("/agency/roster");

export const createAgencyTalent = (data: any) =>
  base44Client.post("/agency/talent", data);

export const updateAgencyTalent = (id: string, data: any) =>
  base44Client.post(`/agency/talent/${id}`, data);

export const uploadTalentAsset = (id: string, fd: FormData) =>
  base44Client.post(`/api/agency/talents/${id}/assets/upload`, fd);

export const getAgencyDigitals = () => base44Client.get("/agency/digitals");

export const getTalentDigitals = (talentId: string) =>
  base44Client.get(`/agency/talent/${talentId}/digitals`);

export const listAgencyTalentInvites = () =>
  base44Client.get(`/api/agency/talent-invites`);

export const createAgencyTalentInvite = (data: {
  email: string;
  invited_name?: string;
}) => base44Client.post(`/api/agency/talent-invites`, data);

export const revokeAgencyTalentInvite = (id: string) =>
  base44Client.post(
    `/api/agency/talent-invites/${encodeURIComponent(id)}/revoke`,
    {},
  );

export const getAgencyTalentInviteByToken = (token: string) =>
  base44Client.get(`/api/invites/agency-talent/${encodeURIComponent(token)}`);

export const getAgencyTalentInviteMagicLinkByToken = (token: string) =>
  base44Client.get(
    `/api/invites/agency-talent/${encodeURIComponent(token)}/magic-link`,
  );

export const acceptAgencyTalentInviteByToken = (token: string) =>
  base44Client.post(
    `/api/invites/agency-talent/${encodeURIComponent(token)}/accept`,
    {},
  );

export const declineAgencyTalentInviteByToken = (token: string) =>
  base44Client.post(
    `/api/invites/agency-talent/${encodeURIComponent(token)}/decline`,
    {},
  );

export const getTeamInviteByToken = (token: string) =>
  base44Client.get(`/api/invites/team/${encodeURIComponent(token)}`);

export const acceptTeamInviteByToken = (token: string) =>
  base44Client.post(
    `/api/invites/team/${encodeURIComponent(token)}/accept`,
    {},
  );

export const declineTeamInviteByToken = (token: string) =>
  base44Client.post(
    `/api/invites/team/${encodeURIComponent(token)}/decline`,
    {},
  );

export const getTeamAuditLogs = () =>
  base44Client.get(`/api/team/audit-logs?organization_type=agency`);

export const getTalentCampaigns = (talentId: string) =>
  base44Client.get(`/agency/talent/${talentId}/campaigns`);

export const updateCampaignSplit = (
  campaignId: string,
  data: {
    payment_amount?: number;
    agency_percent?: number;
    talent_percent?: number;
  },
) => base44Client.post(`/agency/campaigns/${campaignId}`, data);

// Licensing Requests (Agency Dashboard)
export const getAgencyLicensingRequests = () =>
  base44Client.get(`/agency/licensing-requests`);

export const getAgencyBrandConnections = () =>
  base44Client.get(`/api/agency/brand-connections`);

export const getAgencyLicensingRequestsPaySplit = (
  licensing_request_ids: string,
) =>
  base44Client.get(`/agency/licensing-requests/pay-split`, {
    params: { licensing_request_ids },
  });

export const setAgencyLicensingRequestsPaySplit = (data: {
  licensing_request_ids: string[];
  total_payment_amount: number;
  agency_percent: number;
}) => base44Client.post(`/agency/licensing-requests/pay-split`, data);

export const sendLicensingRequestPaymentLink = (id: string) =>
  base44Client.post(`/agency/licensing-requests/${id}/send-payment-link`, {});

export const getAgencyActiveLicenses = (params?: {
  status?: string;
  search?: string;
}) => base44Client.get(`/agency/active-licenses`, { params });

export const getAgencyActiveLicensesStats = () =>
  base44Client.get(`/agency/active-licenses/stats`);

export const updateAgencyLicensingRequestsStatus = (data: {
  licensing_request_ids: string[];
  status:
    | "pending"
    | "approved"
    | "rejected"
    | "declined"
    | "negotiating"
    | "archived";
  notes?: string;
}) => base44Client.post(`/agency/licensing-requests/status`, data);

export const deleteAgencyLicensingRequests = (data: {
  licensing_request_ids: string[];
}) => base44Client.post(`/agency/licensing-requests/delete`, data);

// Payment Links (Agency)
export const generateAgencyPaymentLink = (data: {
  licensing_request_ids: string[];
  total_amount_cents: number;
  currency?: string;
  expires_in_hours?: number;
  client_email?: string;
  client_name?: string;
}) => base44Client.post(`/agency/payment-links`, data);

export const sendAgencyPaymentLinkEmail = (data: {
  payment_link_id: string;
  custom_message?: string;
}) => base44Client.post(`/agency/payment-links/send`, data);

export const listAgencyPaymentLinks = (params?: {
  licensing_request_id?: string;
  status?: string;
}) => base44Client.get(`/agency/payment-links`, { params: params || {} });

export const getAgencyPaymentLink = (id: string) =>
  base44Client.get(`/agency/payment-links/${id}`);

export const cancelAgencyPaymentLink = (id: string) =>
  base44Client.post(`/agency/payment-links/${id}`, {});
export const createTalentDigitals = (talentId: string, data: any) =>
  base44Client.post(`/agency/talent/${talentId}/digitals`, data);

export const updateDigitals = (id: string, data: any) =>
  base44Client.post(`/agency/digitals/${id}`, data);

export const sendDigitalsReminders = (
  talentIds: string[],
  opts?: { subject?: string; body?: string },
) =>
  base44Client.post(`/agency/digitals/reminders`, {
    talent_ids: talentIds,
    subject: opts?.subject,
    body: opts?.body,
  });

export const listAgencyClients = () => base44Client.get("/agency/clients");

export const shareCompCard = (data: {
  client_ids: string[];
  subject?: string;
  message?: string;
  comp_card_url: string;
  talent_name?: string;
}) => base44Client.post("/agency/comp-cards/share", data);

export const sendCoreEmail = (data: {
  to: string;
  subject: string;
  body: string;
  from_name?: string;
}) => base44Client.post("/integrations/core/send-email", data);
// Bookings (Agency Dashboard)
export const listBookings = (params?: {
  date_start?: string;
  date_end?: string;
  client_id?: string;
}) => base44Client.get(`/bookings`, { params: params || {} });

export const createBooking = (data: any) =>
  base44Client.post(`/bookings`, data);

export const updateBooking = (id: string, data: any) =>
  base44Client.post(`/bookings/${id}`, data);

export const cancelBooking = (id: string) =>
  base44Client.post(`/bookings/${id}/cancel`, {});

// Agency talents
export const getAgencyTalents = (params?: { q?: string }) =>
  base44Client.get(`/agency/talents`, { params: params || {} });

// Create booking with files (multipart)
export const createBookingWithFiles = async (data: any, files: File[]) => {
  const fd = new FormData();
  fd.append("data", JSON.stringify(data));
  for (const f of files) fd.append("files", f);
  // Do NOT set Content-Type manually; let the browser add the multipart boundary
  return base44Client.post(`/bookings/with-files`, fd);
};

export const sendBookingCreatedEmail = (bookingId: string) =>
  base44Client.post(`/notifications/booking-created-email`, {
    booking_id: bookingId,
  });

// Agency clients
export const getAgencyClients = () => base44Client.get(`/agency/clients`);
export const createAgencyClient = (data: any) =>
  base44Client.post(`/agency/clients`, data);

// Invoices (Agency Dashboard)
export const listInvoices = (params?: {
  status?: string;
  date_start?: string;
  date_end?: string;
}) => base44Client.get(`/invoices`, { params: params || {} });

export const getInvoice = (id: string) => base44Client.get(`/invoices/${id}`);

// Talent Statements (Agency Dashboard)
export const listTalentStatements = (params?: {
  talent_id?: string;
  year?: number;
}) => base44Client.get(`/talent-statements`, { params: params || {} });

// Expenses (Agency Dashboard)
export const listExpenses = (params?: {
  date_start?: string;
  date_end?: string;
  category?: string;
  status?: string;
}) => base44Client.get(`/expenses`, { params: params || {} });

export const createExpense = (data: any) =>
  base44Client.post(`/expenses`, data);

export const createInvoice = (data: any) =>
  base44Client.post(`/invoices`, data);

export const updateInvoice = (id: string, data: any) =>
  base44Client.post(`/invoices/${id}`, data);

export const markInvoiceSent = (id: string) =>
  base44Client.post(`/invoices/${id}/mark-sent`, {});

export const markInvoicePaid = (id: string) =>
  base44Client.post(`/invoices/${id}/mark-paid`, {});

export const voidInvoice = (id: string) =>
  base44Client.post(`/invoices/${id}/void`, {});

// Book-Outs (Availability)
export const listBookOuts = (params?: {
  date_start?: string;
  date_end?: string;
}) => base44Client.get(`/book-outs`, { params: params || {} });

export const createBookOut = (data: {
  talent_id: string;
  start_date: string;
  end_date: string;
  reason?: string;
  notes?: string;
}) => base44Client.post(`/book-outs`, data);

// Note: base44Client doesn't expose DELETE; use a POST shim if imported elsewhere.
export const deleteBookOut = (id: string) =>
  base44Client.post(`/book-outs/${id}`, { _method: "DELETE" });

// Notifications
export const notifyBookingCreatedEmail = (booking_id: string) =>
  base44Client.post(`/notifications/booking-created-email`, { booking_id });

export const listBookingNotifications = (params?: { limit?: number }) =>
  base44Client.get(`/notifications/booking-notifications`, {
    params: params || {},
  });

// Agency files (multipart)
export const uploadAgencyFile = async (file: File) => {
  const fd = new FormData();
  fd.append("file", file);
  // Do NOT set Content-Type manually; let the browser add the multipart boundary
  return base44Client.post(`/agency/files/upload`, fd);
};

// Agency storage (File Storage)
export const getAgencyStorageUsage = () =>
  base44Client.get(`/agency/storage/usage`);

export const listAgencyStorageFolders = () =>
  base44Client.get(`/agency/storage/folders`);

export const createAgencyStorageFolder = (data: {
  name: string;
  parent_id?: string | null;
}) => base44Client.post(`/agency/storage/folders`, data);

export const listAgencyStorageFoldersPaged = (params?: {
  limit?: number;
  offset?: number;
}) => base44Client.get(`/agency/storage/folders`, { params: params || {} });

export const deleteAgencyStorageFolder = (folder_id: string) =>
  base44Client.delete(`/agency/storage/folders/${folder_id}`);

export const updateAgencyStorageFolder = (
  folder_id: string,
  data: { name: string },
) => base44Client.patch(`/agency/storage/folders/${folder_id}`, data);

export const listAgencyStorageFiles = (params?: { folder_id?: string }) =>
  base44Client.get(`/agency/storage/files`, { params: params || {} });

export const listAgencyStorageFilesPaged = (params?: {
  folder_id?: string;
  root_only?: boolean;
  limit?: number;
  offset?: number;
}) => base44Client.get(`/agency/storage/files`, { params: params || {} });

export const uploadAgencyStorageFile = async (data: {
  file: File;
  folder_id?: string;
  visibility?: "public" | "private";
}) => {
  const fd = new FormData();
  fd.append("file", data.file);
  if (data.folder_id) fd.append("folder_id", data.folder_id);
  if (data.visibility) fd.append("visibility", data.visibility);
  return base44Client.post(`/agency/storage/files/upload`, fd);
};

export const deleteAgencyStorageFile = (file_id: string) =>
  base44Client.delete(`/agency/storage/files/${file_id}`);

export const getAgencyStorageFileSignedUrl = (file_id: string) =>
  base44Client.get(`/agency/storage/files/${file_id}/signed-url`);

export const getBrandStorageUsage = () =>
  base44Client.get(`/brand/storage/usage`);

export const listBrandStorageFolders = () =>
  base44Client.get(`/brand/storage/folders`);

export const createBrandStorageFolder = (data: {
  name: string;
  parent_id?: string | null;
}) => base44Client.post(`/brand/storage/folders`, data);

export const listBrandStorageFoldersPaged = (params?: {
  limit?: number;
  offset?: number;
}) => base44Client.get(`/brand/storage/folders`, { params: params || {} });

export const deleteBrandStorageFolder = (folder_id: string) =>
  base44Client.delete(`/brand/storage/folders/${folder_id}`);

export const updateBrandStorageFolder = (
  folder_id: string,
  data: { name: string },
) => base44Client.patch(`/brand/storage/folders/${folder_id}`, data);

export const listBrandStorageFiles = (params?: { folder_id?: string }) =>
  base44Client.get(`/brand/storage/files`, { params: params || {} });

export const listBrandStorageFilesPaged = (params?: {
  folder_id?: string;
  root_only?: boolean;
  limit?: number;
  offset?: number;
  mime_type?: string;
  source_type?: string;
}) => base44Client.get(`/brand/storage/files`, { params: params || {} });

export const uploadBrandStorageFile = async (data: {
  file: File;
  folder_id?: string;
  visibility?: "public" | "private";
}) => {
  const fd = new FormData();
  fd.append("file", data.file);
  if (data.folder_id) fd.append("folder_id", data.folder_id);
  if (data.visibility) fd.append("visibility", data.visibility);
  return base44Client.post(`/brand/storage/files/upload`, fd);
};

export const deleteBrandStorageFile = (file_id: string) =>
  base44Client.delete(`/brand/storage/files/${file_id}`);

export const getBrandStorageFileSignedUrl = (file_id: string) =>
  base44Client.get(`/brand/storage/files/${file_id}/signed-url`);

export const getBrandStorageAnalytics = () =>
  base44Client.get<{
    by_source_type: Array<{
      source_type: string;
      mime_type: string | null;
      file_count: number;
      total_bytes: number;
      avg_file_size: number;
    }>;
    by_mime_type: Array<{
      source_type: string;
      mime_type: string | null;
      file_count: number;
      total_bytes: number;
      avg_file_size: number;
    }>;
  }>(`/brand/storage/analytics`);

// Email
export const getEmailTemplates = () => base44Client.get(`/email/templates`);
export const saveEmailTemplate = (data: any) =>
  base44Client.post(`/email/templates`, data);

export const sendEmail = (data: {
  to: string;
  subject: string;
  body: string;
  attachments?: Array<{
    filename: string;
    content_type: string;
    content_base64: string;
  }>;
}) => base44Client.post(`/integrations/core/send-email`, data);

export const getBookingsCampaigns = () =>
  base44Client.get("/bookings-campaigns");

export const createBookingsCampaign = (data: any) =>
  base44Client.post("/bookings-campaigns", data);

export const updateBookingsCampaign = (id: string, data: any) =>
  base44Client.post(`/bookings-campaigns/${id}`, data);

export const deleteBookingsCampaign = (id: string) =>
  base44Client.delete(`/bookings-campaigns/${id}`);

// Deliverables
export const listOfferDeliverables = (offerId: string) =>
  base44Client.get(`/api/campaign-offers/${offerId}/deliverables`);

export const uploadOfferDeliverable = (
  offerId: string,
  data: {
    file: File;
    caption?: string;
    talent_id?: string;
    creator_id?: string;
    asset_request_id?: string;
    status?: string;
  },
) => {
  const fd = new FormData();
  fd.append("file", data.file);
  if (data.caption) fd.append("caption", data.caption);
  if (data.talent_id) fd.append("talent_id", data.talent_id);
  if (data.creator_id) fd.append("creator_id", data.creator_id);
  if (data.asset_request_id)
    fd.append("asset_request_id", data.asset_request_id);
  if (data.status) fd.append("status", data.status);
  return base44Client.post(
    `/api/campaign-offers/${offerId}/deliverables/upload-form`,
    fd,
  );
};

export const submitAllDraftDeliverables = (
  offerId: string,
  data?: {
    confirm_unpaid?: boolean;
  },
) =>
  base44Client.post(
    `/api/campaign-offers/${offerId}/deliverables/submit`,
    data,
  );

export const submitOfferDeliverable = (
  offerId: string,
  data: {
    asset_url: string;
    asset_type?: string;
    caption?: string;
    talent_id?: string;
    creator_id?: string;
    asset_request_id?: string;
    meta?: any;
    confirm_unpaid?: boolean;
  },
) => base44Client.post(`/api/campaign-offers/${offerId}/deliverables`, data);

export const listOfferTalentAssignments = (offerId: string) =>
  base44Client.get(`/api/campaign-offers/${offerId}/assignments`);

export const createOfferTalentAssignment = (
  offerId: string,
  talent:
    | string
    | {
        talent_id?: string;
        creator_id?: string;
      },
) =>
  base44Client.post(`/api/campaign-offers/${offerId}/assignments`, {
    ...(typeof talent === "string" ? { talent_id: talent } : talent),
  });

export const deleteOfferTalentAssignment = (
  offerId: string,
  assignmentId: string,
) =>
  base44Client.delete(
    `/api/campaign-offers/${offerId}/assignments/${assignmentId}`,
  );

export const getOfferTransferStatus = (offerId: string) =>
  base44Client.get(`/api/agency/campaign-offers/${offerId}/transfer-status`);

export const retryOfferTransfers = (offerId: string) =>
  base44Client.post(`/api/agency/campaign-offers/${offerId}/retry-transfers`);

export const getCreatorTransferStatus = () =>
  base44Client.get(`/api/talent/campaign-offers/transfer-status`);

export const uploadOfferAssetRequestFile = (offerId: string, file: File) => {
  const fd = new FormData();
  fd.append("file", file);
  return base44Client.post(
    `/api/campaign-offers/${offerId}/asset-requests/upload`,
    fd,
  );
};

export const listOfferAssetRequests = (offerId: string) =>
  base44Client.get(`/api/campaign-offers/${offerId}/asset-requests`);

export const createOfferAssetRequest = (
  offerId: string,
  data: {
    talent_id?: string;
    creator_id?: string;
    title?: string;
    message?: string;
    file_url?: string;
  },
) => base44Client.post(`/api/campaign-offers/${offerId}/asset-requests`, data);

export const listTalentAssetRequests = () =>
  base44Client.get("/api/talent/offer-asset-requests");

export const markTalentAssetRequestViewed = (requestId: string) =>
  base44Client.post(`/api/talent/offer-asset-requests/${requestId}/viewed`, {});

export const reviewOfferDeliverable = (
  offerId: string,
  deliverableId: string,
  data: {
    action: string;
    note?: string;
  },
) =>
  base44Client.post(
    `/api/campaign-offers/${offerId}/deliverables/${deliverableId}/review`,
    data,
  );

export const deleteOfferDeliverable = (
  offerId: string,
  deliverableId: string,
) =>
  base44Client.delete(
    `/api/campaign-offers/${offerId}/deliverables/${deliverableId}`,
  );

export const listMyCampaignOffers = () =>
  base44Client.get(`/api/campaign-offers/my`);

export const listAgencyOfferPackages = () =>
  base44Client.get(`/api/agency/brand-offers/packages`);

// ── Booking Deliverables (rooted in bookings_campaigns) ──────────────────────

export const listBookingDeliverables = (campaignId: string) =>
  base44Client.get(`/api/bookings-campaigns/${campaignId}/deliverables`);

export const uploadBookingDeliverable = (
  campaignId: string,
  data: { file: File; caption?: string },
) => {
  const form = new FormData();
  form.append("file", data.file);
  if (data.caption) form.append("caption", data.caption);
  return base44Client.post(
    `/api/bookings-campaigns/${campaignId}/deliverables`,
    form,
  );
};

export const submitBookingDeliverables = (campaignId: string) =>
  base44Client.post(
    `/api/bookings-campaigns/${campaignId}/deliverables/submit`,
  );

export const reviewBookingDeliverable = (
  campaignId: string,
  deliverableId: string,
  payload: { status: string; note?: string },
) =>
  base44Client.post(
    `/api/bookings-campaigns/${campaignId}/deliverables/${deliverableId}/review`,
    payload,
  );

export const deleteBookingDeliverable = (
  campaignId: string,
  deliverableId: string,
) =>
  base44Client.delete(
    `/api/bookings-campaigns/${campaignId}/deliverables/${deliverableId}`,
  );

export const submitToBrand = (
  campaignId: string,
  payload: { deliverable_ids: string[]; brand_offer_id: string },
) =>
  base44Client.post(
    `/api/bookings-campaigns/${campaignId}/deliverables/submit-to-brand`,
    payload,
  );

// ── Brand License Requests (new table, separate from licensing_requests) ───────
// ── Brand License Requests (new table, separate from licensing_requests) ───────

export const createBrandLicensingRequest = (data: {
  agency_id?: string;
  creator_id: string;
  campaign_title: string;
  usage_scope?: string;
  territory?: string;
  duration_days?: number;
  start_date?: string;
  offer_amount?: number;
  category?: string;
  description?: string;
  exclusivity?: string;
  custom_terms?: string;
  modifications_allowed?: string;
}) => base44Client.post(`/api/brand/licensing-requests`, data);

export const createAgencyBrandLicensingRequest = (payload: {
  creator_id: string;
  agency_id?: string;
  campaign_title: string;
  description?: string;
  category?: string;
  exclusivity?: string;
  modifications_allowed?: string;
  territory?: string;
  usage_scope?: string;
  license_fee?: number;
  duration_days?: number;
  start_date?: string;
  custom_terms?: string;
}) => base44Client.post("/api/brand/brand-license-requests", payload);

export const getBrandLicensingRequests = () =>
  base44Client.get<{ requests: any[] }>("/api/brand/brand-license-requests");

export const updateBrandLicensingRequestsStatus = (payload: {
  licensing_request_ids: string[];
  status: string;
  notes?: string;
}) => base44Client.post("/api/brand/licensing-requests/status", payload);

export const deleteBrandLicensingRequests = (payload: {
  licensing_request_ids: string[];
}) => base44Client.post("/api/brand/licensing-requests/delete", payload);

export const getAgencyBrandLicenseRequests = () =>
  base44Client.get<{ requests: any[] }>("/api/agency/brand-license-requests");

export const updateAgencyBrandLicenseRequestStatus = (payload: {
  brand_request_ids: string[];
  status: string;
  decline_reason?: string;
}) => base44Client.post("/api/agency/brand-license-requests/status", payload);

export const getAgencyBillingStatus = () =>
  base44Client.get<{
    agency_id: string;
    plan_tier: string;
    effective_plan_tier: string;
    display_plan_label: string;
    trial_start_at?: string | null;
    trial_active: boolean;
    trial_ends_at?: string | null;
    subscription_status: string;
    has_paid_access: boolean;
    has_pro_access: boolean;
    can_apply_for_jobs: boolean;
    can_connect_marketplace_creators: boolean;
    can_use_brand_connections: boolean;
    can_use_calendly: boolean;
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
    plan_updated_at?: string | null;
    plan_interval: string;
    stripe_current_period_end?: string | null;
    stripe_cancel_at_period_end: boolean;
  }>(`/api/agency/billing/status`);

export interface InstagramProfileData {
  username: string;
  followers?: number | null;
  following?: number | null;
  bio?: string | null;
  profile_pic_url?: string | null;
  external_url?: string | null;
  posts_count?: number | null;
  engagement_rate?: number | null;
  avg_likes?: number | null;
  avg_comments?: number | null;
  is_verified?: boolean | null;
  is_private?: boolean | null;
}

export interface ScrapeInstagramResponse {
  success: boolean;
  profile?: InstagramProfileData | null;
  error?: string | null;
}

export const scrapeInstagramProfile = (instagram_handle: string) =>
  base44Client.post<ScrapeInstagramResponse>("/api/instagram/scrape", {
    instagram_handle,
  });
