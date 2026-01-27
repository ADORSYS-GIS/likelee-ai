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

// Some flows may reference an OAuth code exchange; backend currently uses account links.
// Provide a safe placeholder to avoid runtime import errors if called.
export const exchangeStripeOAuthCode = async (
  _code: string,
  _profileId: string,
) => {
  return { data: { status: "error", error: "not_supported" } } as any;
};
