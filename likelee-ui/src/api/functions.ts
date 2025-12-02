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
export const createKycSession = (data: { user_id: string }) =>
  base44Client.post<KycSessionResponse>("/api/kyc/session", data);

export const getKycStatus = (user_id: string) =>
  base44Client.get<KycStatusResponse>(`/api/kyc/status?user_id=${user_id}`);

// Organization (profile) KYC
export const createOrganizationKycSession = (data: {
  organization_id: string;
}) =>
  base44Client.post<KycSessionResponse>("/api/kyc/organization/session", data);

export const getOrganizationKycStatus = (organization_id: string) =>
  base44Client.get<KycStatusResponse>(
    `/api/kyc/organization/status?organization_id=${organization_id}`,
  );

export const getOrganizationProfileByUserId = (user_id: string) =>
  base44Client.get(`/api/organization-profile/user/${user_id}`);

// Organization profile CRUD
export const createOrganizationProfile = (data: any, userId?: string) =>
  base44Client.post(`/api/organization-profile`, data, {
    headers: userId ? { "x-user-id": userId } : {},
  });

export const updateOrganizationProfile = (
  id: string,
  data: any,
  userId?: string,
) =>
  base44Client.post(`/api/organization-profile/${id}`, data, {
    headers: userId ? { "x-user-id": userId } : {},
  });

// Organization registration (creates user + organization and links ownership)
export const registerOrganization = (data: {
  email: string;
  password: string;
  organization_name: string;
  contact_name?: string;
  contact_title?: string;
  organization_type?: string;
  website?: string;
  phone_number?: string;
}) => base44Client.post(`/api/organization-register`, data);

// Liveness
export const createLivenessSession = (data: { user_id?: string }) =>
  base44Client.post(`/api/liveness/create`, data);

// Dashboard data for a specific user
export const getDashboard = (user_id: string) =>
  base44Client.get(`/api/dashboard`, { params: { user_id } });
