import { base44Client } from "./crm";

export const packageApi = {
  listPackages: () => base44Client.get("/api/agency/packages"),
  listTemplates: () =>
    base44Client.get("/api/agency/packages?is_template=true"),
  listSentPackages: () =>
    base44Client.get("/api/agency/packages?is_template=false"),

  createPackage: (data: any) => base44Client.post("/api/agency/packages", data),

  updatePackage: (id: string, data: any) =>
    base44Client.put(`/api/agency/packages/${id}`, data),
  getPackageStats: () => base44Client.get("/api/agency/packages/stats"),

  getPackage: (id: string) => base44Client.get(`/api/agency/packages/${id}`),

  deletePackage: (id: string) =>
    base44Client.delete(`/api/agency/packages/${id}`),

  listTalents: (q?: string) => {
    const params = q ? `?q=${encodeURIComponent(q)}` : "";
    return base44Client.get(`/api/agency/talents${params}`);
  },
  listTalentAssets: (id: string) =>
    base44Client.get(`/api/agency/talents/${id}/assets`),
  uploadTalentAsset: (id: string, formData: FormData) =>
    base44Client.post(`/api/agency/talents/${id}/assets/upload`, formData),

  deleteTalentAsset: (talentId: string, assetId: string) =>
    base44Client.delete(`/api/agency/talents/${talentId}/assets/${assetId}`),

  getPublicPackage: (token: string, password?: string) => {
    const headers = password ? { "X-Package-Password": password } : {};
    return base44Client.get(`/api/public/packages/${token}`, { headers });
  },

  createInteraction: (token: string, data: any) =>
    base44Client.post(`/api/public/packages/${token}/interactions`, data),

  deleteInteraction: (
    token: string,
    data: { talent_id: string; type: "favorite" | "callback" | "selected" },
  ) =>
    base44Client.delete(`/api/public/packages/${token}/interactions`, { data }),
};
