import { base44Client } from "./crm";

export const packageApi = {
    listPackages: () => base44Client.get("/api/agency/packages"),

    createPackage: (data: any) => base44Client.post("/api/agency/packages", data),
    getPackageStats: () => base44Client.get("/api/agency/packages/stats"),

    getPackage: (id: string) => base44Client.get(`/api/agency/packages/${id}`),

    deletePackage: (id: string) => base44Client.delete(`/api/agency/packages/${id}`),

    listTalents: () => base44Client.get("/api/agency/talents"),
    listTalentAssets: (id: string) => base44Client.get(`/api/agency/talents/${id}/assets`),
    uploadTalentAsset: (id: string, formData: FormData) =>
        base44Client.post(`/api/agency/talents/${id}/assets/upload`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        }),

    getPublicPackage: (token: string) => base44Client.get(`/api/public/packages/${token}`),

    createInteraction: (token: string, data: any) =>
        base44Client.post(`/api/public/packages/${token}/interactions`, data),
};
