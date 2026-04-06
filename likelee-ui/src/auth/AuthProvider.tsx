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
import { readAuthIntent } from "./onboarding";

interface AuthContextValue {
  supabase: SupabaseClient;
  initialized: boolean;
  authenticated: boolean;
  token?: string | undefined;
  user?: User | null;
  profile?: Profile | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithProvider: (
    provider: "google",
    options?: { redirectTo?: string },
  ) => Promise<void>;
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
  role?: string;
  agency_type?: string;
  creator_type?: string;
  full_name?: string;
  profile_photo_url?: string;
  kyc_status?: string;
  kyc_rejection_reason?: string | null;
  kyc_rejection_code?: string | null;
  onboarding_step?: string;
  [key: string]: any;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [initialized, setInitialized] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const userRef = React.useRef<User | null>(null);
  const profileRef = React.useRef<Profile | null | undefined>(undefined);

  const getUserRoleHint = (user: User | null): string => {
    if (!user) return "";
    return String(
      user.user_metadata?.role || user.app_metadata?.role || "",
    ).trim();
  };

  const redirectToPasswordUpdateIfNeeded = (event?: string) => {
    try {
      const href = window.location.href;
      const hash = window.location.hash || "";
      const isRecoveryEvent = event === "PASSWORD_RECOVERY";
      const isRecoveryHash = /\btype=recovery\b/i.test(hash);

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
    isOAuthUser?: boolean,
  ) => {
    console.log("[AuthProvider] fetchProfile START", {
      userId,
      userEmail,
      role,
      isOAuthUser,
    });
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

      const tryFetchMembership = async () => {
        const { data, error } = await supabase
          .from("organization_memberships")
          .select("organization_type, organization_id, role, status, email")
          .eq("user_id", userId)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();
        return { data, error };
      };

      // IMPORTANT: Check for organization membership FIRST for agency/brand roles.
      // Team members should NOT have their own agency/brand profile row - they share
      // the organization's profile. This ensures team members get the same subscriptions,
      // plan_tier, and settings as the organization owner.
      if (roleHint === "agency" || roleHint === "brand") {
        const membershipResp = await tryFetchMembership();
        if (membershipResp.data && !membershipResp.error) {
          const membership = membershipResp.data as any;
          const organizationType = String(
            membership.organization_type || roleHint || "",
          ).trim();
          const organizationId = String(membership.organization_id || "").trim();
          let organizationName = "";

          if (organizationType && organizationId) {
            const organizationTable =
              organizationType === "brand" ? "brands" : "agencies";
            const organizationLabelColumn =
              organizationType === "brand" ? "company_name" : "agency_name";
            
            // Fetch the organization's profile data (owner's profile)
            const { data: orgData } = await supabase
              .from(organizationTable)
              .select("*")
              .eq("id", organizationId)
              .maybeSingle();
            
            organizationName = String(
              (orgData as any)?.[organizationLabelColumn] || "",
            ).trim();

            // Set profile with the organization's data plus membership info
            // This gives team members access to the same data as the owner
            console.log("[AuthProvider] Found membership, using organization profile");
            setProfile({
              ...(orgData || {}),
              id: userId,
              email:
                String(membership.email || userEmail || "").trim().toLowerCase() ||
                userEmail ||
                "",
              full_name: userFullName,
              role: organizationType || roleHint,
              organization_type: organizationType,
              organization_id: organizationId,
              organization_name: organizationName,
              membership_role: membership.role,
              onboarding_step: null,
            });
            return;
          }
        }
      }

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
        console.log("[AuthProvider] Profile found in table:", table);
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

        console.log("[AuthProvider] Setting profile with role:", resolvedRole);
        setProfile({ ...data, role: resolvedRole || (data as any)?.role });
      } else {
        // Fallback to membership check for non-agency/brand roles
        const membershipResp = await tryFetchMembership();
        if (membershipResp.data && !membershipResp.error) {
          const membership = membershipResp.data as any;
          const organizationType = String(
            membership.organization_type || roleHint || "",
          ).trim();
          const organizationId = String(membership.organization_id || "").trim();
          let organizationName = "";

          if (organizationType && organizationId) {
            const organizationTable =
              organizationType === "brand" ? "brands" : "agencies";
            const organizationLabelColumn =
              organizationType === "brand" ? "company_name" : "agency_name";
            const { data: orgData } = await supabase
              .from(organizationTable)
              .select(organizationLabelColumn)
              .eq("id", organizationId)
              .maybeSingle();
            organizationName = String(
              (orgData as any)?.[organizationLabelColumn] || "",
            ).trim();
          }

          setProfile({
            id: userId,
            email:
              String(membership.email || userEmail || "").trim().toLowerCase() ||
              userEmail ||
              "",
            full_name: userFullName,
            role: organizationType || roleHint,
            organization_type: organizationType,
            organization_id: organizationId,
            organization_name: organizationName,
            membership_role: membership.role,
            onboarding_step: null,
          });
          return;
        }

        // No profile found yet. Let the onboarding flow create the record explicitly.
        console.log(
          "[AuthProvider] No profile found, setting profile to null",
          {
            isOAuthUser,
            userEmail,
            table,
          },
        );
        setProfile(null);
      }

      console.log("[AuthProvider] fetchProfile END", {
        finalProfileState: data ? "FOUND" : "NULL",
      });
    } catch (err) {
      console.error("[AuthProvider] Error fetching/creating profile:", err);
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

    const ensureRoleMetadata = async (currentUser: User | null) => {
      if (!currentUser) return null;

      const existingRole = getUserRoleHint(currentUser);
      const intent = readAuthIntent();
      if (existingRole || !intent?.role) {
        return null;
      }

      try {
        const nextMetadata = {
          ...(currentUser.user_metadata || {}),
          role: intent.role,
        };
        const { error: updateError } = await supabase.auth.updateUser({
          data: nextMetadata,
        });
        if (updateError) throw updateError;

        const { data: refreshed, error: refreshError } =
          await supabase.auth.refreshSession();
        if (refreshError) throw refreshError;

        return refreshed.session ?? null;
      } catch (err) {
        console.error("Failed to set role metadata:", err);
        return null;
      }
    };

    const applySession = (nextSession: any | null) => {
      const nextUser = nextSession?.user ?? null;
      const prevUserId = userRef.current?.id ?? null;
      const nextUserId = nextUser?.id ?? null;
      const userChanged = prevUserId !== nextUserId;

      if (userChanged) {
        setProfile(undefined);
        profileRef.current = undefined;
        queryClient.clear();
      }

      setUser(nextUser);
      userRef.current = nextUser;
      setSession(nextSession);
      return nextUser;
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, _session) => {
        const ensuredSession =
          event === "SIGNED_IN"
            ? await ensureRoleMetadata(_session?.user ?? null)
            : null;
        const session = ensuredSession ?? _session;
        const currentUser = applySession(session);

        redirectToPasswordUpdateIfNeeded(event);

        if (currentUser && (currentUser.email_confirmed_at || session)) {
          const currentProfile = profileRef.current;

          if (!currentProfile || currentProfile.id !== currentUser.id) {
            const isOAuth = currentUser.app_metadata?.provider === "google";
            const roleHint =
              getUserRoleHint(currentUser) || readAuthIntent()?.role || "";
            fetchProfile(
              currentUser.id,
              currentUser.email,
              currentUser.user_metadata?.full_name,
              roleHint,
              isOAuth,
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
    supabase.auth.getSession().then(async ({ data }) => {
      const ensuredSession = await ensureRoleMetadata(
        data.session?.user ?? null,
      );
      const currentSession = ensuredSession ?? data.session ?? null;
      const currentUser = applySession(currentSession);

      redirectToPasswordUpdateIfNeeded();

      // If a session already exists on page load, onAuthStateChange may not fire.
      // Ensure profile is fetched so ProtectedRoute can render role-gated pages.
      const currentProfile = profileRef.current;
      if (
        currentUser &&
        (!currentProfile || currentProfile.id !== currentUser.id)
      ) {
        const isOAuth = currentUser.app_metadata?.provider === "google";
        const roleHint =
          getUserRoleHint(currentUser) || readAuthIntent()?.role || "";
        fetchProfile(
          currentUser.id,
          currentUser.email,
          currentUser.user_metadata?.full_name,
          roleHint,
          isOAuth,
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
      loginWithProvider: async (
        provider: "google",
        options?: { redirectTo?: string },
      ) => {
        if (!supabase) throw new Error("Supabase not configured");
        const redirectTo = options?.redirectTo || window.location.href;
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
          const isOAuth = user.app_metadata?.provider === "google";
          await fetchProfile(
            user.id,
            user.email,
            user.user_metadata?.full_name,
            getUserRoleHint(user) || readAuthIntent()?.role || "",
            isOAuth,
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
