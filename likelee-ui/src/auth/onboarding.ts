import type { Profile } from "./AuthProvider";

export type AuthIntentRole = "creator" | "brand" | "agency";
export type OrganizationSignupType =
  | "brand_company"
  | "production_studio"
  | "marketing_agency"
  | "talent_agency"
  | "sports_agency";

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

export function normalizeOrganizationSignupType(
  rawType?: string | null,
): OrganizationSignupType | null {
  const type = String(rawType || "")
    .trim()
    .toLowerCase();

  if (type === "brand") return "brand_company";
  if (type === "agency") return "marketing_agency";
  if (
    type === "brand_company" ||
    type === "production_studio" ||
    type === "marketing_agency" ||
    type === "talent_agency" ||
    type === "sports_agency"
  ) {
    return type;
  }

  return null;
}

export function isOrganizationOnboardingIncomplete(profile?: Profile | null) {
  if (!profile || !isOrganizationRole(profile.role)) return false;
  const step = String(profile.onboarding_step || "")
    .trim()
    .toLowerCase();
  return !!step && step !== "complete";
}

export function isOnboardingIncomplete(profile?: Profile | null) {
  if (!profile) return false;
  
  // For creators/talent, if onboarding_step is not set or empty, treat as incomplete
  if (profile.role === "creator" || profile.role === "talent") {
    const step = String(profile.onboarding_step || "")
      .trim()
      .toLowerCase();
    // If step is empty/null, it's incomplete. If step is set but not "complete", it's incomplete.
    return !step || (!!step && step !== "complete");
  }
  
  // For other roles, use the original logic
  const step = String(profile.onboarding_step || "")
    .trim()
    .toLowerCase();
  return !!step && step !== "complete";
}

export function getOrganizationSignupType(profile?: Profile | null) {
  if (!profile) return null;
  if (profile.role === "brand") return "brand_company";
  if (profile.role === "agency")
    return profile.agency_type || "marketing_agency";
  return null;
}

export function getOrganizationSignupPath(profile?: Profile | null) {
  const type = getOrganizationSignupType(profile);
  if (!type) return "/organization-signup";
  return `/OrganizationSignup?type=${encodeURIComponent(type)}`;
}

export function getOrganizationSignupPathForType(
  type?: string | null,
  fallback = "/organization-signup",
) {
  const normalized = normalizeOrganizationSignupType(type);
  if (!normalized) return fallback;
  return `/OrganizationSignup?type=${encodeURIComponent(normalized)}`;
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

export function getCreatorOnboardingPath(
  creatorType?: string | null,
  mode: "signup" | "login" = "signup",
) {
  if (creatorType) {
    return `/ReserveProfile?type=${encodeURIComponent(creatorType)}&mode=${mode}`;
  }
  return "/CreatorSignupOptions";
}

export function getLoginPathForRole(
  role?: AuthIntentRole | null,
  creatorType?: string | null,
  next?: string | null,
) {
  const params = new URLSearchParams();

  if (role) {
    params.set("role", role);
  }
  if (role === "creator" && creatorType) {
    params.set("type", creatorType);
  }
  if (next && next.startsWith("/")) {
    params.set("next", next);
  }

  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}

export function getOnboardingPath(profile?: Profile | null) {
  if (!profile?.role) return null;

  if (profile.role === "brand" || profile.role === "agency") {
    return getOrganizationSignupPath(profile);
  }

  if (profile.role === "creator" || profile.role === "talent") {
    return getCreatorOnboardingPath(profile.creator_type || null);
  }

  return null;
}

export function getDashboardPath(
  profile?: Profile | null,
  fallback = "/CreatorDashboard",
) {
  if (!profile?.role) return fallback;
  if (profile.role === "brand") return "/BrandDashboard";
  if (profile.role === "agency") return "/AgencyDashboard";
  return "/CreatorDashboard";
}
