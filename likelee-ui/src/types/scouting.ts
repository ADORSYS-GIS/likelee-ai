export type ScoutingStatus =
  | "new"
  | "contacted"
  | "meeting"
  | "test_shoot"
  | "offer_sent"
  | "signed"
  | "declined";
export type ScoutingSource =
  | "instagram"
  | "tiktok"
  | "street"
  | "referral"
  | "website";

export interface ScoutingProspect {
  id: string;
  agency_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  instagram_handle?: string;

  categories?: string[];
  instagram_followers?: number;
  engagement_rate?: number;

  status: ScoutingStatus;
  source?: ScoutingSource;
  discovery_date?: string; // ISO date string
  discovery_location?: string;
  referred_by?: string;

  assigned_agent_id?: string;
  assigned_agent_name?: string;

  notes?: string;
  rating?: number;

  created_at: string;
  updated_at: string;
}

export interface ScoutingTrip {
  id: string;
  agency_id: string;
  name: string;
  location: string;
  start_date?: string;
  end_date?: string;
  status: "planned" | "ongoing" | "completed";
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ScoutingEvent {
  id: string;
  agency_id: string;
  name: string;
  event_date: string;
  location: string;
  description?: string;
  status: "draft" | "scheduled" | "completed" | "cancelled" | "published";

  event_type?: string;
  casting_for?: string;
  start_time?: string;
  end_time?: string;
  looking_for?: string[];
  min_age?: number;
  max_age?: number;
  gender_preference?: string;
  special_skills?: string;
  what_to_bring?: string;
  dress_code?: string;
  location_details?: string;
  virtual_link?: string;
  max_attendees?: number;
  registration_required?: boolean;
  internal_notes?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;

  created_at: string;
  updated_at: string;
}

export interface ScoutingSubmission {
  id: string;
  agency_id: string;
  name: string;
  email: string;
  photos?: string[];
  instagram?: string;
  status: "pending" | "reviewed" | "contacted" | "rejected";
  submitted_at: string;
  created_at: string;
  updated_at: string;
}
