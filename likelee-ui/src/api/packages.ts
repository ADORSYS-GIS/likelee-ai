import { base44Client } from "./crm";

export const packageApi = {
  listPackages: () => base44Client.get("/agency/packages"),
  listTemplates: () => base44Client.get("/agency/packages"),
  listSentPackages: () =>
    base44Client.get("/agency/packages?is_template=false"),

  createPackage: (data: any) => base44Client.post("/agency/packages", data),

  updatePackage: (id: string, data: any) =>
    base44Client.put(`/agency/packages/${id}`, data),
  getPackageStats: () => base44Client.get("/agency/packages/stats"),

  getPackage: (id: string) => base44Client.get(`/agency/packages/${id}`),

  deletePackage: (id: string) =>
    base44Client.delete(`/agency/packages/${id}`),

  listTalents: (q?: string) => {
    const params = q ? `?q=${encodeURIComponent(q)}` : "";
    return base44Client.get(`/agency/talents${params}`);
  },
  listTalentAssets: (id: string) =>
    base44Client.get(`/agency/talents/${id}/assets`),
  uploadTalentAsset: (id: string, formData: FormData) =>
    base44Client.post(`/agency/talents/${id}/assets/upload`, formData),

  deleteTalentAsset: (talentId: string, assetId: string) =>
    base44Client.delete(`/agency/talents/${talentId}/assets/${assetId}`),

  getPublicPackage: (token: string, password?: string) => {
    const headers = password ? { "X-Package-Password": password } : {};
    return base44Client.get(`/public/packages/${token}`, { headers });
  },

  createInteraction: (token: string, data: any) =>
    base44Client.post(`/public/packages/${token}/interactions`, data),

  deleteInteraction: (
    token: string,
    data: { talent_id: string; type: "favorite" | "callback" | "selected" },
  ) =>
    base44Client.delete(`/public/packages/${token}/interactions`, { data }),
};
