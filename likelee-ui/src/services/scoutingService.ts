import { supabase } from "@/lib/supabase";
import { ScoutingProspect, ScoutingTrip, ScoutingSubmission, ScoutingEvent } from "@/types/scouting";

export const scoutingService = {
    async getUserAgencyId() {
        if (!supabase) throw new Error("Supabase client not initialized");

        const { data: { user } } = await supabase.auth.getUser();
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

    async createProspect(prospect: Omit<ScoutingProspect, "id" | "created_at" | "updated_at">) {
        if (!supabase) throw new Error("Supabase client not initialized");

        const { data, error } = await supabase
            .from("scouting_prospects")
            .insert(prospect)
            .select()
            .single();

        if (error) throw error;
        return data as ScoutingProspect;
    },

    async checkDuplicate(agencyId: string, email?: string, instagramHandle?: string) {
        if (!supabase) throw new Error("Supabase client not initialized");
        if (!email && !instagramHandle) return null;

        let query = supabase
            .from("scouting_prospects")
            .select("*")
            .eq("agency_id", agencyId);

        if (email && instagramHandle) {
            query = query.or(`email.eq.${email},instagram_handle.eq.${instagramHandle}`);
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
            total: 0
        };

        prospects?.forEach((p: { status: string }) => {
            stats.total++;
            switch (p.status) {
                case 'new': stats.new_leads++; break;
                case 'contacted': stats.contacted++; break;
                case 'meeting': stats.meeting++; break;
                case 'signed': stats.signed++; break;
                case 'rejected': stats.rejected++; break;
            }
        });

        return stats;
    }
};
