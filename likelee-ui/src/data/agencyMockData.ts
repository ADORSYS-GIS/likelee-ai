import { Client, FileItem, FolderItem } from "../types/agency";

export const MOCK_AGENCY = {
    name: "CM Models",
    email: "admin@cmmodels.com",
};

export const MOCK_FOLDERS: FolderItem[] = [
    {
        id: "1",
        name: "Talent Files",
        fileCount: 124,
        totalSize: "4.2 GB",
        type: "talent",
    },
    {
        id: "2",
        name: "Client Contracts",
        fileCount: 45,
        totalSize: "1.8 GB",
        type: "client",
    },
    {
        id: "3",
        name: "Booking Documents",
        fileCount: 89,
        totalSize: "3.1 GB",
        type: "booking",
    },
    {
        id: "4",
        name: "Receipts & Expenses",
        fileCount: 156,
        totalSize: "2.1 GB",
        type: "expense",
    },
    {
        id: "5",
        name: "Marketing Materials",
        fileCount: 67,
        totalSize: "1.2 GB",
        type: "marketing",
    },
];

export const MOCK_FILES: FileItem[] = [
    {
        id: "1",
        name: "Emma_Contract_2024.pdf",
        type: "pdf",
        size: "245 KB",
        folder: "Talent Files",
        uploadedBy: "John Doe",
        uploadedAt: "Jan 10, 2024",
        thumbnailUrl:
            "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=300&fit=crop",
    },
    {
        id: "2",
        name: "Vogue_Shoot_Callsheet.pdf",
        type: "pdf",
        size: "186 KB",
        folder: "Booking Documents",
        uploadedBy: "Jane Smith",
        uploadedAt: "Jan 9, 2024",
        thumbnailUrl:
            "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=400&h=300&fit=crop",
    },
    {
        id: "3",
        name: "Milan_Headshot_2024.jpg",
        type: "jpg",
        size: "3.2 MB",
        folder: "Talent Files",
        uploadedBy: "John Doe",
        uploadedAt: "Jan 8, 2024",
        thumbnailUrl:
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=300&fit=crop",
    },
    {
        id: "4",
        name: "Client_Brief_Nike.docx",
        type: "docx",
        size: "124 KB",
        folder: "Client Contracts",
        uploadedBy: "Sarah Wilson",
        uploadedAt: "Jan 7, 2024",
        thumbnailUrl:
            "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop",
    },
];

export const MOCK_CLIENTS: Client[] = [
    {
        id: "nike",
        name: "Nike Global",
        status: "Active Client",
        industry: "Athletic Apparel",
        website: "nike.com",
        contacts: 3,
        totalRevenue: "$450K",
        bookings: 12,
        lastBooking: "Dec 15, 2025",
        nextFollowUp: "Jan 20, 2026",
        tags: ["Fashion", "Sports", "High-Budget"],
        description: "Global athletic footwear and apparel corporation",
        address: "One Bowerman Drive, Beaverton, OR 97005",
        phone: "+1 503-671-6453",
        email: "info@nike.com",
        budgetRange: "$50,000 - $250,000",
        leadTime: "3-4 weeks",
        metrics: {
            revenue: "$450K",
            bookings: 12,
            packagesSent: 8,
            lastBookingDate: "Dec 15",
        },
        revenue: "$450K",
        packagesSent: 1,
        lastBookingDate: "Never",
    },
];

export const MOCK_CONTACTS = [
    {
        name: "Sarah Chen",
        role: "Casting Director",
        email: "sarah.chen@nike.com",
        phone: "+1 (503) 555-0101",
    },
    {
        name: "Mike Johnson",
        role: "Creative Director",
        email: "mike.j@nike.com",
        phone: "+1 (503) 555-0102",
    },
    {
        name: "Lisa Park",
        role: "Finance",
        email: "lisa.park@nike.com",
        phone: "+1 (503) 555-0103",
    },
];

export const MOCK_COMMUNICATIONS = [
    {
        subject: "Spring Campaign Talent Options",
        date: "January 5, 2026",
        type: "email",
        participants: "Agency",
    },
    {
        subject: "Follow-up on December shoot",
        date: "December 20, 2025",
        type: "call",
        participants: "Client",
    },
    {
        subject: "Q1 2026 Planning Meeting",
        date: "December 10, 2025",
        type: "meeting",
        participants: "Both",
    },
];

export const MOCK_TALENT_EARNINGS = [
    {
        id: "1",
        name: "Emma",
        photo:
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
        totalOwed: "$0",
        totalPaidYTD: "$2.4k",
        lastPayment: "No payments",
        totalJobs: 3,
    },
    {
        id: "2",
        name: "Sergine",
        photo:
            "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop",
        totalOwed: "$0",
        totalPaidYTD: "$0",
        lastPayment: "No payments",
        totalJobs: 0,
    },
    {
        id: "3",
        name: "Milan",
        photo:
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
        totalOwed: "$0",
        totalPaidYTD: "$0",
        lastPayment: "No payments",
        totalJobs: 0,
    },
    {
        id: "4",
        name: "Julia",
        photo:
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
        totalOwed: "$0",
        totalPaidYTD: "$0",
        lastPayment: "No payments",
        totalJobs: 0,
    },
];

export const MOCK_EXPENSES = [
    {
        id: "1",
        name: "Client meeting - Uber",
        category: "Travel",
        date: "Jan 10, 2026",
        submitter: "Emma",
        status: "approved",
        amount: "$45",
    },
    {
        id: "2",
        name: "Camera rental",
        category: "Equipment",
        date: "Jan 8, 2026",
        submitter: "Milan",
        status: "pending",
        amount: "$320",
    },
    {
        id: "3",
        name: "Instagram ads",
        category: "Marketing",
        date: "Jan 5, 2026",
        status: "approved",
        submitter: "",
        amount: "$250",
    },
    {
        id: "4",
        name: "Flight to LA casting",
        category: "Travel",
        date: "Jan 3, 2026",
        submitter: "Carla",
        status: "approved",
        amount: "$480",
    },
];

export const MOCK_PAYMENTS = [
    {
        id: "1",
        invoiceNumber: "#2026-1000",
        client: "WRE-5678",
        amount: "$3",
        date: "Jan 27, 2026",
    },
];

export const MOCK_INVOICES = [
    {
        id: "1",
        invoiceNumber: "2026-1000",
        clientName: "Emma",
        issueDate: "Jan 12, 2026",
        dueDate: "Feb 11, 2026",
        amount: "$3",
        status: "draft",
    },
];

export const TALENT_DATA_RAW = [
    {
        id: "aaron",
        name: "Aaron",
        role: "Model",
        status: "pending",
        consent: "missing",
        aiUsage: [],
        followers: "2,100",
        followersVal: 2100,
        assets: 19,
        brand: "—",
        expiry: "—",
        earnings: "$0",
        earningsVal: 0,
        projected: "$0",
        projectedVal: 0,
        img: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/86e331be1_Screenshot2025-10-29at63806PM.png",
    },
    {
        id: "carla",
        name: "Carla",
        role: "Model, Creator",
        status: "active",
        consent: "complete",
        aiUsage: ["Video", "Image"],
        followers: "53,400",
        followersVal: 53400,
        assets: 61,
        brand: "Reformation",
        expiry: "11/8/2025",
        earnings: "$6,800",
        earningsVal: 6800,
        projected: "$8,200",
        projectedVal: 8200,
        isVerified: true,
        img: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/cf591ec97_Screenshot2025-10-29at63544PM.png",
    },
    {
        id: "clemence",
        name: "Clemence",
        role: "Model",
        status: "active",
        consent: "complete",
        aiUsage: ["Image"],
        followers: "32,200",
        followersVal: 32200,
        assets: 47,
        brand: "COS",
        expiry: "8/28/2025",
        earnings: "$5,400",
        earningsVal: 5400,
        projected: "$6,200",
        projectedVal: 6200,
        isVerified: true,
        img: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/ee3aae03f_Screenshot2025-10-29at63651PM.png",
    },
    {
        id: "emma",
        name: "Emma",
        role: "Model, Creator",
        status: "active",
        consent: "complete",
        aiUsage: ["Video", "Image"],
        followers: "42,300",
        followersVal: 42300,
        assets: 38,
        brand: "Glossier",
        expiry: "8/15/2025",
        earnings: "$3,200",
        earningsVal: 3200,
        projected: "$4,100",
        projectedVal: 4100,
        isVerified: true,
        img: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/5d413193e_Screenshot2025-10-29at63349PM.png",
    },
    {
        id: "julia",
        name: "Julia",
        role: "Model, Voice",
        status: "active",
        consent: "expiring",
        aiUsage: ["Video", "Image", "Voice"],
        followers: "5,700",
        followersVal: 5700,
        assets: 54,
        brand: "& Other Stories",
        expiry: "2/15/2025",
        earnings: "$5,200",
        earningsVal: 5200,
        projected: "$6,500",
        projectedVal: 6500,
        isVerified: true,
        img: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/c5a5c61e4_Screenshot2025-10-29at63512PM.png",
    },
    {
        id: "lina",
        name: "Lina",
        role: "Model",
        status: "active",
        consent: "complete",
        aiUsage: ["Image"],
        followers: "12,400",
        followersVal: 12400,
        assets: 28,
        brand: "Mango",
        expiry: "6/12/2025",
        earnings: "$2,800",
        earningsVal: 2800,
        projected: "$3,500",
        projectedVal: 3500,
        isVerified: true,
        img: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/ac71e274e_Screenshot2025-10-29at63715PM.png",
    },
    {
        id: "luisa",
        name: "Luisa",
        role: "Model",
        status: "active",
        consent: "complete",
        aiUsage: ["Video", "Image"],
        followers: "28,600",
        followersVal: 28600,
        assets: 41,
        brand: "Zara",
        expiry: "9/30/2025",
        earnings: "$4,100",
        earningsVal: 4100,
        projected: "$5,000",
        projectedVal: 5000,
        isVerified: true,
        img: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/dfe7c47ac_Screenshot2025-10-29at63612PM.png",
    },
    {
        id: "milan",
        name: "Milan",
        role: "Model, Actor",
        status: "active",
        consent: "complete",
        aiUsage: ["Video", "Image"],
        followers: "8,200",
        followersVal: 8200,
        assets: 31,
        brand: "Carhartt WIP",
        expiry: "10/15/2025",
        earnings: "$2,400",
        earningsVal: 2400,
        projected: "$3,100",
        projectedVal: 3100,
        isVerified: true,
        img: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/b0ae64ffa_Screenshot2025-10-29at63451PM.png",
    },
    {
        id: "sergine",
        name: "Sergine",
        role: "Model, Creator",
        status: "active",
        consent: "complete",
        aiUsage: ["Video", "Image"],
        followers: "15,800",
        followersVal: 15800,
        assets: 45,
        brand: "Ganni",
        expiry: "12/20/2025",
        earnings: "$3,600",
        earningsVal: 3600,
        projected: "$4,400",
        projectedVal: 4400,
        isVerified: true,
        img: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/7b92ca646_Screenshot2025-10-29at63428PM.png",
        engagement: "3.8%",
        campaigns: 5,
    },
    {
        id: "matt",
        name: "Matt",
        role: "Model",
        status: "active",
        consent: "complete",
        aiUsage: ["Image"],
        followers: "12,100",
        followersVal: 12100,
        assets: 34,
        brand: "Zara",
        expiry: "12/15/2025",
        earnings: "$3,600",
        earningsVal: 3600,
        projected: "$4,500",
        projectedVal: 4500,
        isVerified: true,
        img: "https://i.pravatar.cc/150?u=Matt",
        engagement: "4.5%",
        campaigns: 6,
    },
];

// Helper to process talent data
export const TALENT_DATA = TALENT_DATA_RAW.map((t: any) => {
    const enhanced = { ...t };
    // Add tiers/logic as needed by the app
    if (t.id === "carla") {
        enhanced.tier = "Premium";
        enhanced.engagement = "7.1%";
        enhanced.campaigns = 13;
    } else if (t.id === "matt") {
        enhanced.tier = "Core";
        enhanced.engagement = "4.5%";
        enhanced.campaigns = 6;
        enhanced.sortOrder = 1;
    } else if (t.id === "emma") {
        enhanced.tier = "Core";
        enhanced.engagement = "4.0%";
        enhanced.campaigns = 6;
        enhanced.sortOrder = 2;
    } else if (t.id === "sergine") {
        enhanced.tier = "Core";
        enhanced.engagement = "3.8%";
        enhanced.campaigns = 5;
        enhanced.sortOrder = 3;
    } else if (t.id === "lina") {
        enhanced.tier = "Growth";
        enhanced.engagement = "3.5%";
        enhanced.campaigns = 4;
    }
    return enhanced;
});

export const ANALYTICS_CAMPAIGN_STATUS = [
    { name: "In Progress", value: 15, color: "#111827" },
    { name: "Ready to Launch", value: 5, color: "#9ca3af" },
    { name: "Completed", value: 3, color: "#374151" },
];

export const ANALYTICS_PERFORMANCE_TRENDS = [
    { month: "Jul", earnings: 28500, campaigns: 10, usages: 60 },
    { month: "Aug", earnings: 32000, campaigns: 12, usages: 65 },
    { month: "Sep", earnings: 30500, campaigns: 11, usages: 62 },
    { month: "Oct", earnings: 35000, campaigns: 14, usages: 68 },
    { month: "Nov", earnings: 37700, campaigns: 15, usages: 73 },
];

export const ANALYTICS_AI_USAGE_TYPE = [
    { name: "Image", value: 45, color: "#60a5fa" },
    { name: "Video", value: 38, color: "#8b5cf6" },
    { name: "Voice", value: 17, color: "#ec4899" },
];

export const ANALYTICS_CONSENT_STATUS = [
    { name: "Complete", value: 80, color: "#10b981" },
    { name: "Missing", value: 10, color: "#f59e0b" },
    { name: "Expiring", value: 10, color: "#facc15" },
];

export const ROSTER_INSIGHTS_DATA = [
    { name: "Carla", earnings: 6800, projected: 8200 },
    { name: "Clemence", earnings: 5400, projected: 6200 },
    { name: "Julia", earnings: 5200, projected: 6500 },
    { name: "Luisa", earnings: 4100, projected: 5100 },
    { name: "Milan", earnings: 4100, projected: 5200 },
    { name: "Matt", earnings: 3600, projected: 4300 },
    { name: "Emma", earnings: 3200, projected: 4100 },
    { name: "Sergine", earnings: 2800, projected: 3500 },
    { name: "Lina", earnings: 2400, projected: 3000 },
];

export const CLIENTS_PERFORMANCE_DATA = [
    { name: "L'Oreal", budget: 45000, color: "#6366f1", roi: "3.2x" }, // Indigo
    { name: "Nike", budget: 28500, color: "#8b5cf6", roi: "2.8x" }, // Violet
    { name: "Zara", budget: 15000, color: "#f59e0b", roi: "2.5x" }, // Amber
    { name: "Glossier", budget: 12500, color: "#ec4899", roi: "3.5x" }, // Rose
];

export const CONSENT_DATA = [
    {
        id: 1,
        name: "Emma",
        image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
        status: "compliant",
        consentDate: "Jan 12, 2024",
        expiryDate: "Jan 12, 2026",
        types: ["IMAGE", "VIDEO"],
    },
    {
        id: 2,
        name: "Julia",
        image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
        status: "warning",
        consentDate: "Feb 10, 2023",
        expiryDate: "Feb 10, 2025",
        types: ["VOICE"],
    },
    {
        id: 3,
        name: "Sergine",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
        status: "error",
        consentDate: "Expired",
        expiryDate: "Dec 31, 2024",
        types: ["IMAGE"],
    }
];

export const LICENSE_COMPLIANCE_DATA = [
    {
        talent: "Carla",
        brand: "Reformation",
        scope: "Social Media",
        date: "5/12/2025",
        expiry: "11/8/2025",
        days: "Expired",
        level: "EXPIRED",
        auto: true,
        image: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=150",
    },
    {
        talent: "Luisa",
        brand: "Ganni",
        scope: "Social Media",
        date: "12/22/2024",
        expiry: "6/20/2025",
        days: "Expired",
        level: "EXPIRED",
        auto: false,
        image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150",
    },
    {
        talent: "Clemence",
        brand: "COS",
        scope: "Social Media",
        date: "3/1/2025",
        expiry: "8/28/2025",
        days: "Expired",
        level: "EXPIRED",
        auto: true,
        image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150",
    },
    {
        talent: "Lina",
        brand: "Sezane",
        scope: "Social Media",
        date: "3/19/2025",
        expiry: "9/15/2025",
        days: "Expired",
        level: "EXPIRED",
        auto: false,
        image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=150",
    }
];

export const DOCS_CHECKLIST = [
    {
        talent: "Emma",
        id: true,
        tax: true,
        consent: true,
        contract: true,
        bank: true,
        status: "Complete",
        image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
    },
    {
        talent: "Sergine",
        id: true,
        tax: true,
        consent: true,
        contract: true,
        bank: true,
        status: "Complete",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
    },
    {
        talent: "Milan",
        id: true,
        tax: true,
        consent: true,
        contract: true,
        bank: true,
        status: "Complete",
        image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150",
    },
    {
        talent: "Julia",
        id: true,
        tax: true,
        consent: false,
        contract: true,
        bank: true,
        status: "Pending",
        image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
    },
    {
        talent: "Matt",
        id: true,
        tax: true,
        consent: true,
        contract: true,
        bank: true,
        status: "Complete",
        image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150",
    },
    {
        talent: "Carla",
        id: true,
        tax: true,
        consent: true,
        contract: true,
        bank: true,
        status: "Complete",
        image: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=150",
    },
    {
        talent: "Luisa",
        id: true,
        tax: true,
        consent: true,
        contract: true,
        bank: true,
        status: "Complete",
        image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150",
    },
    {
        talent: "Clemence",
        id: true,
        tax: true,
        consent: true,
        contract: true,
        bank: true,
        status: "Complete",
        image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150",
    },
    {
        talent: "Lina",
        id: true,
        tax: true,
        consent: true,
        contract: true,
        bank: true,
        status: "Complete",
        image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=150",
    },
    {
        talent: "Aaron",
        id: false,
        tax: false,
        consent: false,
        contract: false,
        bank: false,
        status: "Pending",
        image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150",
    },
];

export const BRAND_USAGE = [
    { brand: "Glossier", count: "12 authorized uses", status: "Compliant" },
    { brand: "Reformation", count: "8 authorized uses", status: "Compliant" },
    { brand: "Carhartt WIP", count: "6 authorized uses", status: "Compliant" },
];
