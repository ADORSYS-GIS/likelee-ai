import { base44Client } from "./crm";

export const packageApi = {
    listPackages: () => base44Client.get("/api/agency/packages"),

    createPackage: (data: any) => base44Client.post("/api/agency/packages", data),

    getPackage: (id: string) => base44Client.get(`/api/agency/packages/${id}`),

    deletePackage: (id: string) => base44Client.delete(`/api/agency/packages/${id}`),

    listTalents: () => base44Client.get("/api/agency/talents"),

    getPublicPackage: (token: string) => base44Client.get(`/api/public/packages/${token}`),

    createInteraction: (token: string, data: any) =>
        base44Client.post(`/api/public/packages/${token}/interactions`, data),
};
