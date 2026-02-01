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
  next_follow_up_date?: string;
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
    revenue_cents?: number;
    bookings: number;
    packagesSent: number;
    lastBookingDate: string;
    contacts?: number;
  };
}
