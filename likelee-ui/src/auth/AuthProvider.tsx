import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface AuthContextValue {
  initialized: boolean;
  authenticated: boolean;
  token?: string | undefined;
  user?: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<void>;
  refreshToken: () => Promise<void>;
  resendEmailConfirmation?: (email: string) => Promise<void>;
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
  ) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        return;
      }

      if (data) {
        setProfile(data);
      } else if (userEmail) {
        // Profile missing, create it
        console.log("Profile missing, creating new profile for:", userId);
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert([
            {
              id: userId,
              email: userEmail,
              full_name: userFullName,
            },
          ])
          .select()
          .single();

        if (insertError) {
          console.error("Error creating profile:", insertError);
        } else if (newProfile) {
          setProfile(newProfile);
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
      (_event, session) => {
        setUser(session?.user ?? null);
        setInitialized(true);
      },
    );
    // Initialize from current session as well
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setInitialized(true);
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // No automatic profile upsert; creation is deferred to end of step 5

  const value: AuthContextValue = useMemo(
    () => ({
      initialized,
      authenticated: !!user,
      user,
      token: undefined,
      login: async (email, password) => {
        if (!supabase) throw new Error("Supabase not configured");
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
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
        const { error } = await supabase.auth.signUp({
          email: emailNormalized,
          password,
          options: {
            data: { full_name: displayName || null },
            emailRedirectTo: `${window.location.origin}/Login`,
          },
        });
        if (error) throw error;
        // Ensure session exists (in some configs signUp may not start a session)
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: emailNormalized,
            password,
          });
          if (signInErr) throw signInErr;
        }
      },
      resendEmailConfirmation: async (email: string) => {
        if (!supabase) throw new Error("Supabase not configured");
        const emailNormalized = (email || "").trim().toLowerCase();
        const { error } = await supabase.auth.resend({
          type: "signup",
          email: emailNormalized,
          options: { emailRedirectTo: `${window.location.origin}/Login` },
        });
        if (error) throw error;
      },
      refreshToken: async () => {
        if (!supabase) return;
        await supabase.auth.refreshSession();
      },
    }),
    [initialized, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
