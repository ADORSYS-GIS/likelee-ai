import { supabase } from "@/lib/supabase";
import {
  ScoutingProspect,
  ScoutingTrip,
  ScoutingSubmission,
  ScoutingEvent,
  ScoutingTemplate,
  ScoutingOffer,
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

  async getProspects(
    agencyId: string,
    options?: {
      searchQuery?: string;
      statusFilter?: string;
      sourceFilter?: string;
      categoryFilter?: string[];
      minRating?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    },
  ) {
    if (!supabase) throw new Error("Supabase client not initialized");

    let query = supabase
      .from("scouting_prospects")
      .select("*")
      .eq("agency_id", agencyId);

    // Apply search filter (case-insensitive search across multiple fields)
    if (options?.searchQuery && options.searchQuery.trim()) {
      const searchTerm = `%${options.searchQuery.trim()}%`;
      query = query.or(
        `full_name.ilike.${searchTerm},email.ilike.${searchTerm},instagram_handle.ilike.${searchTerm},notes.ilike.${searchTerm}`,
      );
    }

    // Apply status filter
    if (options?.statusFilter && options.statusFilter !== "all") {
      query = query.eq("status", options.statusFilter);
    }

    // Apply source filter
    if (options?.sourceFilter && options.sourceFilter !== "all") {
      query = query.eq("source", options.sourceFilter);
    }

    // Apply category filter (array contains)
    if (options?.categoryFilter && options.categoryFilter.length > 0) {
      query = query.contains("categories", options.categoryFilter);
    }

    // Apply minimum rating filter
    if (options?.minRating && options.minRating > 0) {
      query = query.gte("rating", options.minRating);
    }

    // Apply sorting
    const sortBy = options?.sortBy || "created_at";
    const sortOrder = options?.sortOrder || "desc";
    query = query.order(sortBy, { ascending: sortOrder === "asc" });

    const { data, error } = await query;

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

  async getProspect(id: string) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const { data, error } = await supabase
      .from("scouting_prospects")
      .select("*")
      .eq("id", id)
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

  // --- Templates ---

  async getTemplates(agencyId: string) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const { data, error } = await supabase
      .from("scouting_templates")
      .select("*")
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as ScoutingTemplate[];
  },

  async createTemplate(
    template: Omit<ScoutingTemplate, "id" | "created_at" | "updated_at">,
  ) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const { data, error } = await supabase
      .from("scouting_templates")
      .insert(template)
      .select()
      .single();

    if (error) throw error;
    return data as ScoutingTemplate;
  },

  async updateTemplate(id: string, updates: Partial<ScoutingTemplate>) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const { data, error } = await supabase
      .from("scouting_templates")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as ScoutingTemplate;
  },

  async updateTemplateFromPdf(docusealTemplateId: number, file: File) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("No active session");

    const formData = new FormData();
    formData.append("file", file);

    const baseUrl =
      import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      "http://localhost:8787";
    const response = await fetch(
      `${baseUrl}/api/scouting/templates/${docusealTemplateId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to update template: ${response.statusText}`);
    }
  },

  async deleteTemplate(id: string) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const { error } = await supabase
      .from("scouting_templates")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  // --- Offers ---

  async getOffers(
    agencyId: string,
    filter: "active" | "archived" | "all" = "active",
  ) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("No active session");

    const params = new URLSearchParams({
      agency_id: agencyId,
      filter: filter,
    });

    const baseUrl =
      import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      "http://localhost:8787";
    console.log(
      `scoutingService: Fetching offers from ${baseUrl}/api/scouting/offers?${params}`,
    );
    const response = await fetch(`${baseUrl}/api/scouting/offers?${params}`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch offers: ${response.statusText}`);
    }

    return response.json() as Promise<ScoutingOffer[]>;
  },

  async getOffer(offerId: string) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("No active session");

    const baseUrl =
      import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      "http://localhost:8787";
    const response = await fetch(`${baseUrl}/api/scouting/offers/${offerId}`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch offer: ${response.statusText}`);
    }

    return (await response.json()) as ScoutingOffer;
  },

  async createOffer(
    offer: Pick<ScoutingOffer, "prospect_id" | "agency_id" | "template_id">,
  ) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("No active session");

    const baseUrl =
      import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      "http://localhost:8787";
    const response = await fetch(`${baseUrl}/api/scouting/offers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        prospect_id: offer.prospect_id,
        agency_id: offer.agency_id,
        template_id: offer.template_id,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to create offer: ${response.statusText} ${text}`);
    }

    // The backend returns the inserted row(s) as text; best-effort JSON parse
    const text = await response.text();
    try {
      return JSON.parse(text) as ScoutingOffer;
    } catch {
      return undefined as unknown as ScoutingOffer;
    }
  },

  async updateOffer(id: string, updates: Partial<ScoutingOffer>) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const { data, error } = await supabase
      .from("scouting_offers")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as ScoutingOffer;
  },

  async deleteOffer(offerId: string) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("No active session");

    const baseUrl =
      import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      "http://localhost:8787";
    const response = await fetch(`${baseUrl}/api/scouting/offers/${offerId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete offer: ${response.statusText}`);
    }
  },

  async permanentlyDeleteOffer(offerId: string) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("No active session");

    const baseUrl =
      import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      "http://localhost:8787";
    const response = await fetch(
      `${baseUrl}/api/scouting/offers/${offerId}?permanent=true`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to permanently delete offer: ${response.statusText}`,
      );
    }
  },

  async refreshOfferStatus(offerId: string) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("No active session");

    const baseUrl =
      import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      "http://localhost:8787";
    const response = await fetch(
      `${baseUrl}/api/scouting/offers/refresh-status`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ offer_id: offerId }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to refresh offer status: ${response.statusText}`);
    }

    return await response.json();
  },

  async getBuilderToken(agencyId: string, templateId?: number) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("No active session");

    const baseUrl =
      import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      "http://localhost:8787";
    // Call our backend API endpoint
    const response = await fetch(`${baseUrl}/api/scouting/builder-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ agency_id: agencyId, template_id: templateId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get builder token: ${response.statusText}`);
    }

    const data = await response.json();
    return data.token;
  },

  async syncTemplates(agencyId: string) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("No active session");

    const baseUrl =
      import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      "http://localhost:8787";
    const response = await fetch(`${baseUrl}/api/scouting/templates/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ agency_id: agencyId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to sync templates: ${response.statusText}`);
    }
  },

  async createTemplateFromPdf(agencyId: string, file: File) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("No active session");

    const formData = new FormData();
    formData.append("agency_id", agencyId);
    formData.append("file", file);

    const baseUrl =
      import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      "http://localhost:8787";
    const response = await fetch(`${baseUrl}/api/scouting/templates/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload template: ${response.statusText}`);
    }

    return await response.json();
  },
};
