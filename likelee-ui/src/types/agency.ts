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
    description?: string;
    address?: string;
    phone?: string;
    email?: string;
    budgetRange: string;
    leadTime: string;
    metrics?: {
        revenue: string;
        bookings: number;
        packagesSent: number;
        lastBookingDate: string;
    };
    revenue: string;
    packagesSent: number;
    lastBookingDate: string;
}

export interface FileItem {
    id: string;
    name: string;
    type: "pdf" | "docx" | "jpg" | "png";
    size: string;
    folder: string;
    uploadedBy: string;
    uploadedAt: string;
    thumbnailUrl?: string;
}

export interface FolderItem {
    id: string;
    name: string;
    fileCount: number;
    totalSize: string;
    type: string;
}
