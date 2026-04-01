import type { Profile } from "./AuthProvider";

export type AuthIntentRole = "creator" | "brand" | "agency";

export interface AuthIntent {
  role: AuthIntentRole;
  creatorType?: string | null;
  ts: number;
}

const AUTH_INTENT_KEY = "likelee_auth_intent_v1";
const AUTH_INTENT_MAX_AGE_MS = 1000 * 60 * 30;

export function saveAuthIntent(intent: Omit<AuthIntent, "ts">) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    AUTH_INTENT_KEY,
    JSON.stringify({ ...intent, ts: Date.now() }),
  );
}

export function readAuthIntent(): AuthIntent | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(AUTH_INTENT_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<AuthIntent>;
    if (
      !parsed ||
      (parsed.role !== "creator" &&
        parsed.role !== "brand" &&
        parsed.role !== "agency")
    ) {
      clearAuthIntent();
      return null;
    }

    const ts = Number(parsed.ts || 0);
    if (!ts || Date.now() - ts > AUTH_INTENT_MAX_AGE_MS) {
      clearAuthIntent();
      return null;
    }

    return {
      role: parsed.role,
      creatorType: parsed.creatorType || null,
      ts,
    };
  } catch {
    clearAuthIntent();
    return null;
  }
}

export function clearAuthIntent() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_INTENT_KEY);
}

export function isOrganizationRole(role?: string | null) {
  return role === "brand" || role === "agency";
}

export function isOrganizationOnboardingIncomplete(profile?: Profile | null) {
  if (!profile || !isOrganizationRole(profile.role)) return false;
  return !!profile.onboarding_step && profile.onboarding_step !== "complete";
}

export function getOrganizationSignupType(
  profile?: Pick<Profile, "role" | "agency_type"> | null,
) {
  if (!profile) return null;
  if (profile.role === "brand") return "brand_company";
  if (profile.role === "agency")
    return profile.agency_type || "marketing_agency";
  return null;
}

export function getOrganizationSignupPath(
  profile?: Pick<Profile, "role" | "agency_type"> | null,
) {
  const type = getOrganizationSignupType(profile);
  if (!type) return "/organization-signup";
  return `/OrganizationSignup?type=${encodeURIComponent(type)}`;
}

export function getSignupPathForRole(
  role: AuthIntentRole,
  creatorType?: string | null,
) {
  if (role === "brand") return "/OrganizationSignup?type=brand_company";
  if (role === "agency") return "/AgencySelection?mode=signup";
  if (creatorType) {
    return `/ReserveProfile?type=${encodeURIComponent(creatorType)}&mode=signup`;
  }
  return "/CreatorSignupOptions";
}
