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

  // --- Analytics ---

  async getAnalytics(agencyId: string) {
    if (!supabase) throw new Error("Supabase client not initialized");

    // For now, we'll fetch all prospects and calculate stats client-side
    // In the future, this should be replaced by a database view or RPC call
    const { data: prospects, error } = await supabase
      .from("scouting_prospects")
      .select("status")
      .eq("agency_id", agencyId);

    if (error) throw error;

    const stats = {
      new_leads: 0,
      contacted: 0,
      meeting: 0,
      signed: 0,
      rejected: 0,
      total: 0,
    };

    prospects?.forEach((p: { status: string }) => {
      stats.total++;
      switch (p.status) {
        case "new":
          stats.new_leads++;
          break;
        case "contacted":
          stats.contacted++;
          break;
        case "meeting":
          stats.meeting++;
          break;
        case "signed":
          stats.signed++;
          break;
        case "rejected":
          stats.rejected++;
          break;
      }
    });

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
    } catch (e) {
      console.error("Failed to parse createOffer response", text);
      throw new Error(`Failed to parse response from createOffer: ${e}`);
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
