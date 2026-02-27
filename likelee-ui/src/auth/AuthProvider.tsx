import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { SupabaseClient, User } from "@supabase/supabase-js";

interface AuthContextValue {
  supabase: SupabaseClient;
  initialized: boolean;
  authenticated: boolean;
  token?: string | undefined;
  user?: User | null;
  profile?: Profile | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithProvider: (provider: "google") => Promise<void>;
  logout: () => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<{ user: User | null; session: any | null }>;
  refreshToken: () => Promise<void>;
  resendEmailConfirmation?: (
    email: string,
    redirectTo?: string,
  ) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  profile_photo_url?: string;
  kyc_status?: string;
  onboarding_step?: string;
  [key: string]: any;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [initialized, setInitialized] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const userRef = React.useRef<User | null>(null);
  const profileRef = React.useRef<Profile | null>(null);

  const redirectToPasswordUpdateIfNeeded = (event?: string) => {
    try {
      const href = window.location.href;
      const hash = window.location.hash || "";
      const isRecoveryEvent = event === "PASSWORD_RECOVERY";
      const isRecoveryHash =
        /\btype=recovery\b/i.test(hash) || /\brecovery\b/i.test(hash);

      if (!isRecoveryEvent && !isRecoveryHash) return;
      if (href.includes("/update-password")) return;

      const next = localStorage.getItem("likelee_invite_next") || "";
      const tsRaw = localStorage.getItem("likelee_invite_next_ts") || "0";
      const ts = Number(tsRaw);
      const fresh = ts && Date.now() - ts < 1000 * 60 * 30;
      const nextPath = fresh && next.startsWith("/") ? next : "/login";

      window.location.replace(
        `/update-password?next=${encodeURIComponent(nextPath)}${hash}`,
      );
    } catch {
      // ignore
    }
  };

  const fetchProfile = async (
    userId: string,
    userEmail?: string,
    userFullName?: string,
    role?: string,
  ) => {
    try {
      const roleHint = (role || "").trim();
      const roleToTable: Record<string, string> = {
        creator: "creators",
        brand: "brands",
        agency: "agencies",
      };

      const tryFetch = async (table: string) => {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        return { data, error };
      };

      let table = roleToTable[roleHint] || "";
      let data: any = null;
      let error: any = null;

      if (table) {
        const resp = await tryFetch(table);
        data = resp.data;
        error = resp.error;
      } else {
        for (const candidate of ["agencies", "brands", "creators"]) {
          const resp = await tryFetch(candidate);
          if (resp.error) {
            error = resp.error;
            continue;
          }
          if (resp.data) {
            data = resp.data;
            table = candidate;
            error = null;
            break;
          }
        }
      }

      if (error) {
        // Ignore AbortError which happens on rapid re-renders/navigation
        if (error.message && error.message.includes("AbortError")) {
          return;
        }
        console.error(
          `Error fetching profile from ${table}:`,
          JSON.stringify(error, null, 2),
        );
        return;
      }

      if (data) {
        // Add role to profile object for convenience
        let resolvedRole = roleHint;
        if (!resolvedRole) {
          if (table === "agencies") resolvedRole = "agency";
          else if (table === "brands") resolvedRole = "brand";
          else resolvedRole = String((data as any)?.role || "creator");
        }

        // Role override: if this authenticated user is linked via agency_users,
        // treat them as a talent for routing/dashboard purposes.
        // This allows talents to log in via the Creator tab.
        if (!resolvedRole || resolvedRole === "creator") {
          const { data: agencyUser } = await supabase
            .from("agency_users")
            .select("id")
            .or(`user_id.eq.${userId},creator_id.eq.${userId}`)
            .limit(1)
            .maybeSingle();

          if (agencyUser?.id) {
            resolvedRole = "talent";
          }
        }

        setProfile({ ...data, role: resolvedRole || (data as any)?.role });
      } else if (userEmail && (table === "creators" || !table)) {
        // Profile missing in profiles table, create it (only for creators)
        console.log("Profile missing, creating new profile for:", userId);
        const { data: newProfile, error: insertError } = await supabase
          .from("creators")
          .upsert(
            {
              id: userId,
              email: userEmail,
              full_name: userFullName,
              role: roleHint || "creator",
            },
            { onConflict: "id" },
          )
          .select()
          .single();

        if (insertError) {
          if (
            insertError.code === "23505" ||
            insertError.message.includes("duplicate key")
          ) {
            const { data: existingProfile } = await supabase
              .from("creators")
              .select("*")
              .eq("id", userId)
              .maybeSingle();
            if (existingProfile)
              setProfile({
                ...existingProfile,
                role: roleHint || existingProfile.role,
              });
          } else {
            console.error("Error creating profile:", insertError);
          }
        } else if (newProfile) {
          setProfile({ ...newProfile, role: roleHint || newProfile.role });
        }
      }
    } catch (err) {
      console.error("Error fetching/creating profile:", err);
    }
  };

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    if (!supabase) {
      setInitialized(true);
      return;
    }

    const applySession = (nextSession: any | null) => {
      const nextUser = nextSession?.user ?? null;
      const prevUserId = userRef.current?.id ?? null;
      const nextUserId = nextUser?.id ?? null;
      const userChanged = prevUserId !== nextUserId;

      if (userChanged) {
        setProfile(null);
        profileRef.current = null;
        queryClient.clear();
      }

      setUser(nextUser);
      userRef.current = nextUser;
      setSession(nextSession);
      return nextUser;
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, _session) => {
        const session = _session;
        const currentUser = applySession(session);

        redirectToPasswordUpdateIfNeeded(event);

        if (currentUser && (currentUser.email_confirmed_at || session)) {
          const currentProfile = profileRef.current;
          if (!currentProfile || currentProfile.id !== currentUser.id) {
            fetchProfile(
              currentUser.id,
              currentUser.email,
              currentUser.user_metadata?.full_name,
              currentUser.user_metadata?.role,
            );
          }
        } else {
          setProfile(null);
          profileRef.current = null;
        }
        setInitialized(true);
      },
    );
    // Initialize from current session as well
    supabase.auth.getSession().then(({ data }) => {
      const currentUser = applySession(data.session ?? null);

      redirectToPasswordUpdateIfNeeded();

      // If a session already exists on page load, onAuthStateChange may not fire.
      // Ensure profile is fetched so ProtectedRoute can render role-gated pages.
      const currentProfile = profileRef.current;
      if (currentUser && (!currentProfile || currentProfile.id !== currentUser.id)) {
        fetchProfile(
          currentUser.id,
          currentUser.email,
          currentUser.user_metadata?.full_name,
          currentUser.user_metadata?.role,
        );
      } else if (!currentUser) {
        setProfile(null);
        profileRef.current = null;
      }

      setInitialized(true);
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // No automatic profile upsert; creation is deferred to end of step 5

  const value: AuthContextValue = useMemo(
    () => ({
      supabase,
      initialized,
      authenticated: !!user,
      user,
      profile,
      token: session?.access_token,
      login: async (email, password) => {
        if (!supabase) throw new Error("Supabase not configured");
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      },
      loginWithProvider: async (provider: "google") => {
        if (!supabase) throw new Error("Supabase not configured");
        const redirectTo = window.location.href; // return to current page so existing logic can route accordingly
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo },
        });
        if (error) throw error;
      },
      logout: async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
        queryClient.clear();
      },
      register: async (email, password, displayName) => {
        if (!supabase) throw new Error("Supabase not configured");
        const emailNormalized = (email || "").trim().toLowerCase();
        const { data, error } = await supabase.auth.signUp({
          email: emailNormalized,
          password,
          options: {
            data: {
              full_name: displayName || null,
              role: "creator",
            },
            emailRedirectTo:
              (displayName as any)?.redirectTo ||
              `${window.location.origin}/ReserveProfile?step=2`,
          },
        });
        if (error) throw error;

        // Profile creation is now handled immediately after signup to capture full_name.
        if (data.user) {
          await fetchProfile(data.user.id, data.user.email, displayName);
        }

        return { user: data.user, session: data.session };
      },
      resendEmailConfirmation: async (email: string, redirectTo?: string) => {
        if (!supabase) throw new Error("Supabase not configured");
        const emailNormalized = (email || "").trim().toLowerCase();
        const { error } = await supabase.auth.resend({
          type: "signup",
          email: emailNormalized,
          options: {
            emailRedirectTo:
              redirectTo || `${window.location.origin}/ReserveProfile?step=1`,
          },
        });
        if (error) throw error;
      },
      refreshToken: async () => {
        if (!supabase) return;
        await supabase.auth.refreshSession();
      },
      refreshProfile: async () => {
        if (user) {
          await fetchProfile(
            user.id,
            user.email,
            user.user_metadata?.full_name,
            user.user_metadata?.role,
          );
        }
      },
    }),
    [initialized, user, profile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
