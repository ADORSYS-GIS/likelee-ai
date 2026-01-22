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
  is_signed?: boolean;
  neighborhood?: string;
  social_activity_concentration?: number;
  competition_presence?: string;
  demographics?: {
    age_range?: string;
    income_level?: string;
    ethnicity?: string;
    style_trends?: string[];
  };
  social_post_locations?: {
    lat: number;
    lng: number;
    platform: string;
    post_url: string;
  }[];
  trending_score?: number;

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
  trip_type?: "Open Scouting" | "Specific Casting" | "Event Coverage" | "Other";
  description?: string;
  scout_ids?: string[];
  route?: any[];
  prospects_approached?: number;
  prospects_submitted?: number;
  prospects_agreed?: number;
  prospects_added?: number;
  conversion_rate?: number;
  total_cost?: number;
  photos?: string[];
  weather?: string;
  best_locations?: ScoutingTripLocation[];
  locations_visited?: ScoutingTripLocation[];
  weather_forecast?: any;
  historical_weather_success_correlation?: number;
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
  targeted_talent_goal?: number;
  registration_fee?: number;
  expected_attendance?: number;
  is_attending?: boolean;
  prospects_to_meet?: string[];
  past_success_rate?: number;
  calendar_event_id?: string;
  sync_with_calendar?: boolean;

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

export interface ScoutingAnalytics {
  id: string;
  agency_id: string;
  metric_name: string;
  metric_value: any;
  period_start: string;
  period_end: string;
  created_at: string;
}

export interface ScoutingTerritory {
  id: string;
  agency_id: string;
  name: string;
  boundary: any; // GeoJSON polygon
  assigned_scout_id?: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface ScoutingTripLocation {
  id: string;
  name: string;
  date?: string;
  time?: string;
  prospects_found?: number;
  lat?: number;
  lng?: number;
}
