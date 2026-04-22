export type BrandPlanTier = "free" | "basic" | "pro" | "enterprise";

// Re-export BRAND_TRIAL_DAYS from config for centralized configuration
export { BRAND_TRIAL_DAYS } from "@/config/public";
export const BRAND_STUDIO_ADDON_PRICE = 299;
export const BRAND_STUDIO_ADDON_CREDITS = 2000;

function resolveBrandPlanInput(value: unknown): unknown {
  if (value && typeof value === "object" && "plan_tier" in (value as any)) {
    return (value as any).plan_tier;
  }
  return value;
}

export function normalizeBrandPlanTier(value: unknown): BrandPlanTier {
  const tier = String(value || "")
    .trim()
    .toLowerCase();

  if (tier === "basic") return "basic";
  if (tier === "pro") return "pro";
  if (tier === "enterprise") return "enterprise";
  return "free";
}

export function formatBrandPlanLabel(tier: BrandPlanTier): string {
  if (tier === "basic") return "Basic";
  if (tier === "pro") return "Pro";
  if (tier === "enterprise") return "Enterprise";
  return "Free";
}

export function brandPlanPrice(tier: BrandPlanTier): number | null {
  if (tier === "basic") return 149;
  if (tier === "pro") return 349;
  return null;
}

export function brandPlanSeatLimit(tier: BrandPlanTier): number | null {
  if (tier === "basic") return 2;
  if (tier === "pro") return 5;
  if (tier === "enterprise") return null;
  return 0;
}

export function brandPlanCampaignLimit(tier: BrandPlanTier): number | null {
  if (tier === "basic") return 3;
  if (tier === "pro") return 10;
  if (tier === "enterprise") return null;
  return 0;
}

export function brandAllowsCampaignCollaboration(value: unknown): boolean {
  const planTier = normalizeBrandPlanTier(resolveBrandPlanInput(value));
  return planTier === "pro" || planTier === "enterprise";
}

export function brandMaxCampaignWizardStep(value: unknown): number {
  return brandAllowsCampaignCollaboration(value) ? 5 : 2;
}

export function brandIncludesStudioAccess(value: unknown): boolean {
  return normalizeBrandPlanTier(resolveBrandPlanInput(value)) === "enterprise";
}

export function brandCanPurchaseStudioAddon(value: unknown): boolean {
  return normalizeBrandPlanTier(resolveBrandPlanInput(value)) === "pro";
}

export function hasBrandStudioAccess(profile: any): boolean {
  return (
    brandIncludesStudioAccess(profile) || Boolean(profile?.studio_addon_active)
  );
}

export function hasActiveBrandBaseSubscription(profile: any): boolean {
  const status = String(profile?.subscription_status || "")
    .trim()
    .toLowerCase();
  return status === "active" || status === "trialing";
}

export function formatBrandSubscriptionStatus(profile: any): string {
  const status = String(profile?.subscription_status || "")
    .trim()
    .toLowerCase();
  if (status === "trialing") return "Free trial";
  if (status === "active") return "Active";
  if (status === "past_due") return "Past due";
  if (status === "canceled") return "Canceled";
  if (status === "unpaid") return "Unpaid";
  return "Not started";
}

export function formatBrandStudioAddonStatus(profile: any): string {
  if (brandIncludesStudioAccess(profile)) {
    return "Included";
  }
  if (Boolean(profile?.studio_addon_active)) return "Active";
  return "Not active";
}
