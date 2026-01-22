import { supabase } from "@/lib/supabase";
import {
  ScoutingProspect,
  ScoutingTrip,
  ScoutingSubmission,
  ScoutingEvent,
} from "@/types/scouting";

export const scoutingService = {
  async getUserAgencyId() {
    if (!supabase) throw new Error("Supabase client not initialized");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    console.log("scoutingService: Current user:", user?.id);
    if (!user) return null;

    // In the new schema, agencies.id directly references auth.users(id)
    // So we just need to check if this user has an agency profile
    const { data: agency, error } = await supabase
      .from("agencies")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (error) console.error("scoutingService: Error fetching agency:", error);
    console.log("scoutingService: Found agency:", agency);

    return agency ? agency.id : null;
  },

  // --- Prospects ---

  async getProspects(agencyId: string) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const { data, error } = await supabase
      .from("scouting_prospects")
      .select("*")
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as ScoutingProspect[];
  },

  async createProspect(
    prospect: Omit<ScoutingProspect, "id" | "created_at" | "updated_at">,
  ) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const { data, error } = await supabase
      .from("scouting_prospects")
      .insert(prospect)
      .select()
      .single();

    if (error) throw error;
    return data as ScoutingProspect;
  },

  async checkDuplicate(
    agencyId: string,
    email?: string,
    instagramHandle?: string,
  ) {
    if (!supabase) throw new Error("Supabase client not initialized");
    if (!email && !instagramHandle) return null;

    let query = supabase
      .from("scouting_prospects")
      .select("*")
      .eq("agency_id", agencyId);

    if (email && instagramHandle) {
      query = query.or(
        `email.eq.${email},instagram_handle.eq.${instagramHandle}`,
      );
    } else if (email) {
      query = query.eq("email", email);
    } else if (instagramHandle) {
      query = query.eq("instagram_handle", instagramHandle);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data as ScoutingProspect | null;
  },

  async updateProspect(id: string, updates: Partial<ScoutingProspect>) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const { data, error } = await supabase
      .from("scouting_prospects")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as ScoutingProspect;
  },

  async deleteProspect(id: string) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const { error } = await supabase
      .from("scouting_prospects")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  // --- Trips ---
  async getTrips(agencyId: string) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const { data, error } = await supabase
      .from("scouting_trips")
      .select("*")
      .eq("agency_id", agencyId)
      .order("start_date", { ascending: true });

    if (error) throw error;
    return data as ScoutingTrip[];
  },

  async createTrip(
    trip: Omit<ScoutingTrip, "id" | "created_at" | "updated_at">,
  ) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const { data, error } = await supabase
      .from("scouting_trips")
      .insert(trip)
      .select()
      .single();

    if (error) throw error;
    return data as ScoutingTrip;
  },

  async updateTrip(id: string, updates: Partial<ScoutingTrip>) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const { data, error } = await supabase
      .from("scouting_trips")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as ScoutingTrip;
  },

  // --- Territories ---
  async getTerritories(agencyId: string) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const { data, error } = await supabase
      .from("scouting_territories")
      .select("*")
      .eq("agency_id", agencyId);

    if (error) throw error;
    return data;
  },

  async createTerritory(territory: any) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const { data, error } = await supabase
      .from("scouting_territories")
      .insert(territory)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // --- Locations ---
  async getLocations(agencyId: string) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const { data, error } = await supabase
      .from("scouting_locations")
      .select("*")
      .eq("agency_id", agencyId);

    if (error) throw error;
    return data;
  },

  async createLocation(location: any) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const { data, error } = await supabase
      .from("scouting_locations")
      .insert(location)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // --- Submissions ---

  async getSubmissions(agencyId: string) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const { data, error } = await supabase
      .from("scouting_submissions")
      .select("*")
      .eq("agency_id", agencyId)
      .order("submitted_at", { ascending: false });

    if (error) throw error;
    return data as ScoutingSubmission[];
  },

  // --- Events ---

  async getEvents(agencyId: string) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const { data, error } = await supabase
      .from("scouting_events")
      .select("*")
      .eq("agency_id", agencyId)
      .order("event_date", { ascending: true });

    if (error) throw error;
    return data as ScoutingEvent[];
  },

  async createEvent(
    event: Omit<ScoutingEvent, "id" | "created_at" | "updated_at">,
  ) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const { data, error } = await supabase
      .from("scouting_events")
      .insert(event)
      .select()
      .single();

    if (error) throw error;
    return data as ScoutingEvent;
  },

  async updateEvent(id: string, updates: Partial<ScoutingEvent>) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const { data, error } = await supabase
      .from("scouting_events")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as ScoutingEvent;
  },

  async deleteEvent(id: string) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const { error } = await supabase
      .from("scouting_events")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  // --- Analytics ---

  async getAnalytics(agencyId: string) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const { data: prospects, error } = await supabase
      .from("scouting_prospects")
      .select("status, source, discovery_date, updated_at")
      .eq("agency_id", agencyId);

    if (error) throw error;

    const stats = {
      totalProspects: prospects?.length || 0,
      newLeads: 0,
      contacted: 0,
      meeting: 0,
      signed: 0,
      declined: 0,
      conversionRate: 0,
      avgTimeToSign: 0,
      sources: {} as Record<string, number>,
    };

    let totalDaysToSign = 0;
    let signedCountForAvg = 0;

    prospects?.forEach((p) => {
      switch (p.status) {
        case "new":
          stats.newLeads++;
          break;
        case "contacted":
          stats.contacted++;
          break;
        case "meeting":
          stats.meeting++;
          break;
        case "signed":
          stats.signed++;
          if (p.discovery_date && p.updated_at) {
            const start = new Date(p.discovery_date);
            const end = new Date(p.updated_at);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            totalDaysToSign += diffDays;
            signedCountForAvg++;
          }
          break;
        case "declined":
          stats.declined++;
          break;
      }

      if (p.source) {
        stats.sources[p.source] = (stats.sources[p.source] || 0) + 1;
      }
    });

    if (stats.totalProspects > 0) {
      stats.conversionRate = Math.round(
        (stats.signed / stats.totalProspects) * 100,
      );
    }

    if (signedCountForAvg > 0) {
      stats.avgTimeToSign = Math.round(totalDaysToSign / signedCountForAvg);
    }

    return stats;
  },
};
