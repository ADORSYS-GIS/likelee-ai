import { base44Client } from "./crm";

export const catalogApi = {
    list: () => base44Client.get("/agency/catalogs"),
    eligibleRequests: () => base44Client.get("/agency/catalogs/eligible-requests"),
    create: (data: any) => base44Client.post("/agency/catalogs", data),
    remove: (id: string) => base44Client.delete(`/agency/catalogs/${id}`),
    getPublic: (token: string) =>
        base44Client.get(`/public/catalogs/${token}`),
    getTalentAssets: (talentId: string) =>
        base44Client.get(`/agency/talents/${talentId}/assets`),
    uploadTalentAsset: (talentId: string, formData: FormData) =>
        base44Client.post(`/agency/talents/${talentId}/assets/upload`, formData),
    getTalentRecordings: (talentId: string) =>
        base44Client.get(`/voice/recordings?talent_id=${talentId}`),
    getSignedRecordingUrl: (recordingId: string) =>
        base44Client.get(`/voice/recordings/signed-url`, { params: { recording_id: recordingId } }),
    uploadTalentRecording: (formData: FormData) =>
        base44Client.post(`/voice/recordings/upload`, formData),
    getTalents: (q?: string) => {
        const params = q ? `?q=${encodeURIComponent(q)}` : "";
        return base44Client.get(`/agency/talents${params}`);
    },
};
