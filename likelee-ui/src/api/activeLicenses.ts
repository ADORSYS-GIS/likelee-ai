import { base44 } from "./base44Client";

export interface ActiveLicense {
    id: string;
    talent_id: string;
    talent_name: string;
    talent_avatar?: string;
    license_type: string;
    brand: string;
    start_date?: string;
    end_date?: string;
    days_left?: number;
    usage_scope: string;
    value: number;
    status: "Active" | "Expiring" | "Expired";
}

export interface ActiveLicensesStats {
    active_count: number;
    expiring_count: number;
    expired_count: number;
    total_value: number;
}

export interface CreateLicensingRequestPayload {
    talent_id: string;
    brand_name: string;
    start_date: string;
    duration_days: number;
    price: number;
    template_id?: string;
    license_type: string; // campaign_title
    usage_scope: string;
    terms: string;
}

export const activeLicenses = {
    list: async (status: string = "all", search: string = "") => {
        const params = new URLSearchParams();
        if (status) params.append("status", status);
        if (search) params.append("search", search);
        return base44.get<ActiveLicense[]>(`/api/agency/active-licenses?${params.toString()}`);
    },

    stats: async () => {
        return base44.get<ActiveLicensesStats>(`/api/agency/active-licenses/stats`);
    },

    create: async (data: CreateLicensingRequestPayload) => {
        return base44.post<{ id: string; ok: boolean }>(`/api/agency/licensing-requests`, data);
    },
};
