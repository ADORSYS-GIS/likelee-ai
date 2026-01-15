import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
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
  const [initialized, setInitialized] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const fetchProfile = async (
    userId: string,
    userEmail?: string,
    userFullName?: string,
    role?: string,
  ) => {
    try {
      let table = "creators";
      const effectiveRole = role || "creator";

      if (effectiveRole === "brand") {
        table = "brands";
      } else if (effectiveRole === "agency") {
        table = "agencies";
      }

      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error(`Error fetching profile from ${table}:`, error);
        return;
      }

      if (data) {
        // Add role to profile object for convenience
        setProfile({ ...data, role: role || data.role });
      } else if (userEmail && table === "creators") {
        // Profile missing in profiles table, create it (only for creators)
        console.log("Profile missing, creating new profile for:", userId);
        const { data: newProfile, error: insertError } = await supabase
          .from("creators")
          .insert([
            {
              id: userId,
              email: userEmail,
              full_name: userFullName,
              role: role || "creator",
            },
          ])
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
                role: role || existingProfile.role,
              });
          } else {
            console.error("Error creating profile:", insertError);
          }
        } else if (newProfile) {
          setProfile({ ...newProfile, role: role || newProfile.role });
        }
      }
    } catch (err) {
      console.error("Error fetching/creating profile:", err);
    }
  };

  useEffect(() => {
    if (!supabase) {
      setInitialized(true);
      return;
    }
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // This is the key fix. When a user signs in after email verification,
        // we must explicitly set the session for the client to be aware of it.
        if (event === "SIGNED_IN" && session) {
          supabase.auth.setSession(session);
        }

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser && (currentUser.email_confirmed_at || session)) {
          fetchProfile(
            currentUser.id,
            currentUser.email,
            currentUser.user_metadata?.full_name,
            currentUser.user_metadata?.role,
          );
        } else {
          setProfile(null);
        }
        setInitialized(true);
      },
    );
    // Initialize from current session as well
    supabase.auth.getSession().then(({ data }) => {
      const currentUser = data.session?.user ?? null;
      setUser(currentUser);
      if (currentUser && currentUser.email_confirmed_at) {
        fetchProfile(
          currentUser.id,
          currentUser.email,
          currentUser.user_metadata?.full_name,
          currentUser.user_metadata?.role,
        );
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
      token: undefined,
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
            emailRedirectTo: `${window.location.origin}/ReserveProfile?step=2`,
          },
        });
        if (error) throw error;

        // Profile creation deferred until email verification and subsequent login/session refresh
        // if (data.user) {
        //   await fetchProfile(data.user.id, data.user.email, displayName);
        // }

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
