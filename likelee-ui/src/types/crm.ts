export interface Client {
    id: string;
    name: string;
    status: "Active Client" | "Prospect" | "Lead" | "Inactive";
    industry: string;
    website: string;
    contacts: number;
    totalRevenue: string;
    bookings: number;
    lastBooking: string;
    nextFollowUp: string;
    tags: string[];
    notes?: string;
    preferences?: {
        talentTypes: string[];
        budgetRange: string;
        leadTime: string;
        notes?: string;
    };
    metrics?: {
        revenue: string;
        bookings: number;
        packagesSent: number;
        lastBookingDate: string;
    };
}
