export const MIN_BASE_MONTHLY_CENTS = 15000;
export const DEFAULT_PRICING_GRACE_SECONDS = 60;

export function parseIsoToMs(value?: string | null): number | null {
  if (!value) {
    return null;
  }
  const hasTimezone = /[zZ]|[+-]\d{2}:\d{2}$/.test(value);
  const normalized = hasTimezone ? value : `${value}Z`;
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

export function isDefaultPricing(profile: {
  base_monthly_price_cents?: number | null;
  created_at?: string | null;
  pricing_updated_at?: string | null;
}): boolean {
  const monthly = profile.base_monthly_price_cents ?? null;

  const matchesMin = monthly === MIN_BASE_MONTHLY_CENTS;
  if (!matchesMin) {
    return false;
  }

  const createdAt = parseIsoToMs(profile.created_at ?? null);
  const pricingUpdatedAt = parseIsoToMs(profile.pricing_updated_at ?? null);
  if (!pricingUpdatedAt || !createdAt) {
    return true;
  }

  return (pricingUpdatedAt - createdAt) / 1000 <= DEFAULT_PRICING_GRACE_SECONDS;
}

export function shouldDefaultVisibilityOn(profile: {
  public_profile_visible?: boolean | null;
  visibility?: string | null;
  base_monthly_price_cents?: number | null;
  created_at?: string | null;
  pricing_updated_at?: string | null;
}): boolean {
  const publicVisible = profile.public_profile_visible;
  const visibility = (profile.visibility ?? "").trim().toLowerCase();

  if (publicVisible !== false) {
    return false;
  }
  if (!(visibility === "" || visibility === "private")) {
    return false;
  }
  return isDefaultPricing(profile);
}
