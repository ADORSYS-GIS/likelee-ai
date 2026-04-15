import React from "react";
import { ArrowRight, Check, Loader2, Sparkles, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/auth/AuthProvider";
import {
  createBrandBillingPortal,
  createBrandStudioAddonCheckout,
  createBrandSubscriptionCheckout,
  verifyBrandStudioAddonCheckout,
} from "@/api/functions";
import {
  BRAND_STUDIO_ADDON_CREDITS,
  BRAND_STUDIO_ADDON_PRICE,
  formatBrandPlanLabel,
  formatBrandStudioAddonStatus,
  formatBrandSubscriptionStatus,
  hasActiveBrandBaseSubscription,
  hasBrandStudioAccess,
  normalizeBrandPlanTier,
  type BrandPlanTier,
} from "@/lib/brandBilling";
import { cn, currencyFormatter } from "@/lib/utils";

type FeatureItem = {
  label: string;
  detail?: string;
  disabled?: boolean;
  pill?: string;
};

type PlanSection = {
  title: string;
  items: FeatureItem[];
};

type BillingCycle = "monthly" | "annual";

type ComparisonValue = "check" | "cross" | string;

type ComparisonSection = {
  title: string;
  rows: Array<{
    feature: string;
    basic: ComparisonValue;
    pro: ComparisonValue;
    enterprise: ComparisonValue;
  }>;
};

type PricingFaq = {
  question: string;
  answer: string;
};

type BrandPlanCard = {
  tier: Exclude<BrandPlanTier, "free">;
  eyebrow?: string;
  description: string;
  monthlyPrice?: number;
  priceLabel?: string;
  priceNote: string;
  cta: string;
  cardClassName: string;
  badgeClassName: string;
  buttonClassName: string;
  headingClassName: string;
  bodyClassName: string;
  dividerClassName: string;
  mutedClassName: string;
  sections: PlanSection[];
};

const brandPlans: BrandPlanCard[] = [
  {
    tier: "basic",
    eyebrow: "Starter",
    description:
      "Test the platform. Run your first campaigns with an in-house team.",
    monthlyPrice: 149,
    priceNote: "per month",
    cta: "Get started",
    cardClassName:
      "border border-[#D7E6ED] bg-white shadow-[0_22px_60px_rgba(7,28,58,0.08)]",
    badgeClassName:
      "border border-[#D7F0EB] bg-[#EEF9F7] text-[#18A7A5] hover:bg-[#EEF9F7]",
    buttonClassName:
      "bg-[#18B1AE] text-white hover:bg-[#119693] rounded-xl font-semibold",
    headingClassName: "text-[#19305A]",
    bodyClassName: "text-[#7C88A5]",
    dividerClassName: "border-[#E7EDF3]",
    mutedClassName: "text-[#B7C1D4]",
    sections: [
      {
        title: "Campaigns",
        items: [
          { label: "Campaign list & filter tabs", pill: "3 active" },
          { label: "New Campaign wizard (Steps 1–2)" },
          { label: "Metrics overview (4 cards)" },
          { label: "Talent browse & license (Step 3)", disabled: true },
        ],
      },
      {
        title: "Collaboration",
        items: [
          { label: "Invite Company Seats", pill: "2 seats" },
          { label: "Invite Modeling Agency", disabled: true },
          { label: "Add AI Creator", disabled: true },
        ],
      },
      {
        title: "Assets & Reporting",
        items: [
          { label: "Campaign details & deliverables" },
          { label: "Approve / request edit / download" },
          { label: "Per-asset comment threads", disabled: true },
        ],
      },
    ],
  },
  {
    tier: "pro",
    eyebrow: "Most popular",
    description:
      "Full campaign ops — agencies, AI creators, licensing, and analytics.",
    monthlyPrice: 349,
    priceNote: "per month",
    cta: "Pay now",
    cardClassName:
      "border border-[#2B4B8A] bg-[#17315E] text-white shadow-[0_30px_70px_rgba(7,28,58,0.25)]",
    badgeClassName:
      "border border-[#225F85] bg-[#1A4E74] text-[#7FECFF] hover:bg-[#1A4E74]",
    buttonClassName:
      "bg-white text-[#17315E] hover:bg-[#F4F8FD] rounded-xl font-semibold",
    headingClassName: "text-white",
    bodyClassName: "text-[#9CB1D5]",
    dividerClassName: "border-[#29456F]",
    mutedClassName: "text-[#6780AC]",
    sections: [
      {
        title: "Campaigns",
        items: [
          { label: "Campaign list & filter tabs", pill: "10 active" },
          { label: "Full Campaign wizard (Steps 1–3)" },
          { label: "Talent browse & license from agency" },
        ],
      },
      {
        title: "Collaboration",
        items: [
          { label: "Invite Company Seats", pill: "5 seats" },
          { label: "Invite Modeling Agency (marketplace)" },
          { label: "Add AI Creator + collaborator list" },
        ],
      },
      {
        title: "Assets & Reporting",
        items: [
          { label: "Campaign details & deliverables" },
          { label: "Per-asset comment threads" },
          { label: "Contracts & Licensing tab" },
          { label: "Analytics & reporting" },
        ],
      },
    ],
  },
  {
    tier: "enterprise",
    eyebrow: "Full suite",
    description:
      "Unlimited scale, AI Studio included, and white-glove support.",
    priceLabel: "Custom",
    priceNote: "tailored to your team",
    cta: "Talk to sales",
    cardClassName:
      "border border-[#D9E4FF] bg-white shadow-[0_22px_60px_rgba(7,28,58,0.08)]",
    badgeClassName:
      "border border-[#DCE5FF] bg-[#F3F6FF] text-[#4978FF] hover:bg-[#F3F6FF]",
    buttonClassName:
      "border border-[#D5DDF1] bg-white text-[#253C67] hover:bg-[#F8FAFF] rounded-xl font-semibold",
    headingClassName: "text-[#19305A]",
    bodyClassName: "text-[#7C88A5]",
    dividerClassName: "border-[#E7EDF3]",
    mutedClassName: "text-[#B7C1D4]",
    sections: [
      {
        title: "Everything in Pro, plus",
        items: [
          { label: "Unlimited active campaigns" },
          { label: "Unlimited seats + multi-agency" },
          { label: "AI Studio", pill: "Included" },
          { label: "Notifications & activity feed" },
        ],
      },
      {
        title: "Platform & Settings",
        items: [
          { label: "Full Settings (roles, billing, profile)" },
          { label: "Advanced analytics & CSV export" },
          { label: "Custom contract templates" },
          { label: "SSO + audit logs" },
          { label: "API access + Zapier integration" },
          { label: "Dedicated CSM + priority onboarding" },
        ],
      },
    ],
  },
];

const comparisonSections: ComparisonSection[] = [
  {
    title: "Campaigns",
    rows: [
      {
        feature: "Active campaigns",
        basic: "3",
        pro: "10",
        enterprise: "Unlimited",
      },
      {
        feature: "Talent browse & license",
        basic: "cross",
        pro: "check",
        enterprise: "check",
      },
    ],
  },
  {
    title: "Collaboration",
    rows: [
      {
        feature: "Company seats",
        basic: "2",
        pro: "5",
        enterprise: "Unlimited",
      },
      {
        feature: "Invite Modeling Agency",
        basic: "cross",
        pro: "check",
        enterprise: "check",
      },
      {
        feature: "Add AI Creator",
        basic: "cross",
        pro: "check",
        enterprise: "check",
      },
      {
        feature: "Multi-agency management",
        basic: "cross",
        pro: "cross",
        enterprise: "check",
      },
    ],
  },
  {
    title: "Assets & Approvals",
    rows: [
      {
        feature: "Deliverable approve / download",
        basic: "check",
        pro: "check",
        enterprise: "check",
      },
      {
        feature: "Per-asset comment threads",
        basic: "cross",
        pro: "check",
        enterprise: "check",
      },
      {
        feature: "Contracts & Licensing tab",
        basic: "cross",
        pro: "check",
        enterprise: "check",
      },
      {
        feature: "Custom contract templates",
        basic: "cross",
        pro: "cross",
        enterprise: "check",
      },
    ],
  },
  {
    title: "Analytics & Platform",
    rows: [
      {
        feature: "Analytics & reporting",
        basic: "cross",
        pro: "check",
        enterprise: "check",
      },
      {
        feature: "Advanced analytics + CSV export",
        basic: "cross",
        pro: "cross",
        enterprise: "check",
      },
      {
        feature: "Notifications / activity feed",
        basic: "cross",
        pro: "cross",
        enterprise: "check",
      },
      {
        feature: "Full Settings (roles, billing, profile)",
        basic: "Basic",
        pro: "Basic",
        enterprise: "Full",
      },
      {
        feature: "SSO + audit logs",
        basic: "cross",
        pro: "cross",
        enterprise: "check",
      },
    ],
  },
  {
    title: "AI Studio",
    rows: [
      {
        feature: "AI Studio (one-time activation)",
        basic: `$${BRAND_STUDIO_ADDON_PRICE} one-time`,
        pro: `$${BRAND_STUDIO_ADDON_PRICE} one-time`,
        enterprise: "Included",
      },
      {
        feature: '"Edit in Studio" on deliverables',
        basic: "Add-On only",
        pro: "Add-On only",
        enterprise: "check",
      },
    ],
  },
];

const pricingFaqs: PricingFaq[] = [
  {
    question: "Can I upgrade mid-cycle?",
    answer:
      "Yes — upgrades take effect immediately and are prorated. Downgrades apply at the start of the next billing period.",
  },
  {
    question: 'What counts as an "active" campaign?',
    answer:
      "Any campaign with a status of Active or Pending Approval counts toward your limit. Completed campaigns don't count.",
  },
  {
    question: "How does AI Studio access work?",
    answer: `AI Studio is a one-time add-on for $${BRAND_STUDIO_ADDON_PRICE}. After purchase, your brand gets permanent access to /studio and ${BRAND_STUDIO_ADDON_CREDITS.toLocaleString()} initial Studio credits. Enterprise includes Studio access at no extra charge.`,
  },
  {
    question: "Do agency invites count as seats?",
    answer:
      "No — seat limits apply to in-house Company Seats only. Agency and AI Creator collaborators are managed separately and don't count toward your cap.",
  },
  {
    question: "How does talent licensing work?",
    answer:
      "Pro and above unlocks Step 3 of the Campaign wizard — browse verified agencies on the Likelee marketplace and license talent directly.",
  },
  {
    question: "What's included in Enterprise?",
    answer:
      "Enterprise is custom-quoted and includes unlimited everything, a dedicated CSM, SSO, audit logs, advanced exports, custom contracts, and API access.",
  },
];

const BRAND_PLAN_ANNUAL_DISCOUNT = 0.2;

function getPlanPriceDisplay(
  plan: BrandPlanCard,
  billingCycle: BillingCycle,
): {
  priceLabel: string;
  priceNote: string;
  priceCaption?: string;
  previousPriceLabel?: string;
} {
  if (!plan.monthlyPrice) {
    return {
      priceLabel: plan.priceLabel || "",
      priceNote: plan.priceNote,
    };
  }

  if (billingCycle === "annual") {
    const annualTotal = Math.round(
      plan.monthlyPrice * 12 * (1 - BRAND_PLAN_ANNUAL_DISCOUNT),
    );
    const monthlyEquivalent = Math.round(annualTotal / 12);
    return {
      priceLabel: currencyFormatter.format(monthlyEquivalent),
      priceNote: "per month equivalent",
      priceCaption: `${currencyFormatter.format(annualTotal)} billed annually`,
      previousPriceLabel: `${currencyFormatter.format(plan.monthlyPrice)}/mo`,
    };
  }

  return {
    priceLabel: currencyFormatter.format(plan.monthlyPrice),
    priceNote: plan.priceNote,
    priceCaption:
      plan.tier === "pro" ? "Optional 14-day base-plan trial" : undefined,
  };
}

function formatDateLabel(value: unknown): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getCheckoutErrorMessage(message: string): string {
  if (message.includes("brand_subscription_already_active")) {
    return "This base plan is already active.";
  }
  if (message.includes("studio_addon_already_active")) {
    return "The AI Studio add-on is already active.";
  }
  if (message.includes("studio_addon_included_with_enterprise")) {
    return "AI Studio is already included with Enterprise.";
  }
  if (message.includes("enterprise_contact_sales")) {
    return "Enterprise plans are handled by sales.";
  }
  if (
    message.includes("STRIPE_BRAND_BASIC_ANNUAL_PRICE_ID") ||
    message.includes("STRIPE_BRAND_PRO_ANNUAL_PRICE_ID")
  ) {
    return "Annual billing is not configured yet. Use monthly billing or add the annual Stripe price IDs.";
  }
  return message || "Please try again.";
}

function buildBrandSignupPath(input: {
  plan: "basic" | "pro";
  trial?: boolean;
  focusStudio?: boolean;
  billingCycle?: BillingCycle;
}) {
  const params = new URLSearchParams({
    type: "brand_company",
    plan: input.plan,
    autostart: "1",
  });
  if (input.trial) params.set("trial", "1");
  if (input.focusStudio) params.set("focus", "studio");
  if (input.billingCycle === "annual") params.set("billing", "annual");
  return `/organization-signup?${params.toString()}`;
}

function PricingFeature({
  item,
  dark,
  mutedClassName,
}: {
  item: FeatureItem;
  dark: boolean;
  mutedClassName: string;
}) {
  const disabled = Boolean(item.disabled);

  return (
    <div
      className={`flex items-start gap-3 text-[14px] leading-5 ${
        disabled ? mutedClassName : dark ? "text-[#E6EEF9]" : "text-[#2B3A56]"
      }`}
    >
      <span
        className={`mt-[2px] inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${
          disabled
            ? dark
              ? "bg-[#27446F] text-[#84A1D1]"
              : "bg-[#EDF2F7] text-[#B4C0D3]"
            : dark
              ? "bg-[#1E5B87] text-[#8CF0FF]"
              : "bg-[#E8FAF8] text-[#18B1AE]"
        }`}
      >
        {disabled ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
      </span>
      <span className="flex-1">
        {item.label}
        {item.detail && (
          <span
            className={`ml-1.5 font-semibold ${
              dark ? "text-[#8CF0FF]" : "text-[#18B1AE]"
            }`}
          >
            {item.detail}
          </span>
        )}
      </span>
      {item.pill && (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            dark ? "bg-[#284872] text-[#9EDBFF]" : "bg-[#EFF4FA] text-[#7483A0]"
          }`}
        >
          {item.pill}
        </span>
      )}
    </div>
  );
}

function getComparisonTextClass(value: string): string {
  if (value === "Included" || value === "Full") {
    return "text-[#18B56B]";
  }
  if (value.includes("$") || value === "Add-On only") {
    return "text-[#356BFF]";
  }
  return "text-[#17315E]";
}

function ComparisonPlanCell({
  value,
  plan,
}: {
  value: ComparisonValue;
  plan: Exclude<BrandPlanTier, "free">;
}) {
  const backgroundClass = plan === "pro" ? "bg-[#ECF2FC]" : "bg-[#F5F8FD]";

  return (
    <td
      className={cn(
        "px-6 py-7 text-center align-middle text-sm font-medium",
        backgroundClass,
      )}
    >
      {value === "check" ? (
        <Check className="mx-auto h-4 w-4 text-[#0FAEB8]" />
      ) : value === "cross" ? (
        <X className="mx-auto h-4 w-4 text-[#A5B3C9]" />
      ) : (
        <span className={cn("font-medium", getComparisonTextClass(value))}>
          {value}
        </span>
      )}
    </td>
  );
}

export default function BrandSubscribe() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { initialized, authenticated, profile, refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();

  const addonRef = React.useRef<HTMLDivElement | null>(null);
  const success = searchParams.get("success") === "1";
  const canceled = searchParams.get("canceled") === "1";
  const focusStudio = searchParams.get("focus") === "studio";
  const checkoutSessionId = String(searchParams.get("session_id") || "").trim();
  const nextParam = String(searchParams.get("next") || "").trim();
  const nextPath =
    nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "";
  const searchBillingCycle: BillingCycle =
    searchParams.get("billing") === "annual" ? "annual" : "monthly";
  const requestedPlan = searchParams.get("plan");
  const autoStartCheckout = searchParams.get("autostart") === "1";
  const requestedTrial = searchParams.get("trial") === "1";

  const [checkingOutPlan, setCheckingOutPlan] = React.useState<
    null | "basic" | "pro_trial" | "pro_paid"
  >(null);
  const [checkingOutAddon, setCheckingOutAddon] = React.useState(false);
  const verifyCalledRef = React.useRef(false);
  const [billingCycle, setBillingCycle] =
    React.useState<BillingCycle>(searchBillingCycle);
  const autoCheckoutStartedRef = React.useRef(false);

  const isBrandAccount = profile?.role === "brand";
  const planTier = normalizeBrandPlanTier(profile?.plan_tier);
  const hasBaseSubscription =
    isBrandAccount && hasActiveBrandBaseSubscription(profile);
  const hasStudioAddon = isBrandAccount && hasBrandStudioAccess(profile);
  const baseStatusLabel = formatBrandSubscriptionStatus(profile);
  const studioStatusLabel = formatBrandStudioAddonStatus(profile);
  const planLabel = formatBrandPlanLabel(planTier);
  const trialEndsAt = formatDateLabel(profile?.subscription_trial_end);
  const currentPeriodEnd = formatDateLabel(
    profile?.subscription_current_period_end,
  );
  React.useEffect(() => {
    if (!success || !authenticated) return;
    // Guard: only run once per mount even if deps change (refreshProfile reference
    // changes on every render, which would cause an infinite loop without this).
    if (verifyCalledRef.current) return;
    verifyCalledRef.current = true;

    const run = async () => {
      // If we have a session ID (studio addon success redirect), verify and provision
      // immediately instead of waiting for the Stripe webhook.
      if (focusStudio && checkoutSessionId) {
        try {
          await verifyBrandStudioAddonCheckout({
            session_id: checkoutSessionId,
          });
        } catch {
          // Ignore — webhook will handle it if verify fails
        }
      }
      await refreshProfile();
    };

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, success]);

  React.useEffect(() => {
    if (!focusStudio || !addonRef.current) return;
    addonRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusStudio]);

  React.useEffect(() => {
    setBillingCycle(searchBillingCycle);
  }, [searchBillingCycle]);

  React.useEffect(() => {
    if (autoCheckoutStartedRef.current) return;
    if (!autoStartCheckout || success || canceled) return;
    if (!initialized || !authenticated || !isBrandAccount) return;
    if (hasBaseSubscription) return;
    if (requestedPlan !== "basic" && requestedPlan !== "pro") return;

    autoCheckoutStartedRef.current = true;
    void beginBrandCheckout(requestedPlan, requestedTrial);
  }, [
    authenticated,
    autoStartCheckout,
    canceled,
    hasBaseSubscription,
    initialized,
    isBrandAccount,
    requestedPlan,
    requestedTrial,
    success,
  ]);

  const redirectToBrandSignup = (
    tier: "basic" | "pro",
    options?: { trial?: boolean; focusStudio?: boolean },
  ) => {
    navigate(
      buildBrandSignupPath({
        plan: tier,
        trial: options?.trial,
        focusStudio: options?.focusStudio,
        billingCycle,
      }),
    );
  };

  const beginBrandCheckout = async (
    tier: "basic" | "pro",
    startTrial: boolean,
  ) => {
    setCheckingOutPlan(
      tier === "pro" ? (startTrial ? "pro_trial" : "pro_paid") : "basic",
    );
    try {
      const response = await createBrandSubscriptionCheckout({
        plan: tier,
        billing_cycle: billingCycle,
        start_trial: startTrial,
        next_path: nextPath || undefined,
      });
      const checkoutUrl = (response as any)?.checkout_url as string | undefined;
      if (!checkoutUrl) {
        throw new Error("No checkout URL returned.");
      }
      window.location.href = checkoutUrl;
    } catch (error: any) {
      toast({
        title: "Checkout failed",
        description: getCheckoutErrorMessage(
          String(error?.message || error || ""),
        ),
        variant: "destructive",
      });
    } finally {
      setCheckingOutPlan(null);
    }
  };

  const handleBaseAction = async (
    tier: "basic" | "pro",
    startTrial: boolean,
  ) => {
    if (!initialized) return;

    if (!authenticated) {
      redirectToBrandSignup(tier, { trial: startTrial });
      return;
    }

    if (!isBrandAccount) {
      toast({
        title: "Brand account required",
        description:
          "This pricing page is public, but checkout is only available for brand accounts.",
        variant: "destructive",
      });
      redirectToBrandSignup(tier, { trial: startTrial });
      return;
    }

    if (hasBaseSubscription) {
      if (planTier === tier) {
        return;
      }

      // Bug Fix #2: Directly proceed to checkout for plan changes
      // The backend will automatically cancel the old subscription before creating the new one
      await beginBrandCheckout(tier, startTrial);
      return;
    }

    await beginBrandCheckout(tier, startTrial);
  };

  const handleStudioAddonAction = async () => {
    if (!initialized) return;

    if (
      authenticated &&
      isBrandAccount &&
      (planTier === "enterprise" || hasStudioAddon)
    ) {
      navigate(nextPath || "/Studio");
      return;
    }

    if (!authenticated) {
      redirectToBrandSignup("pro", { trial: false, focusStudio: true });
      return;
    }

    if (!isBrandAccount) {
      toast({
        title: "Brand account required",
        description:
          "AI Studio add-on billing is only available for brand accounts.",
        variant: "destructive",
      });
      redirectToBrandSignup("pro", { trial: false, focusStudio: true });
      return;
    }

    setCheckingOutAddon(true);
    try {
      const response = await createBrandStudioAddonCheckout({
        next_path: nextPath || undefined,
      });
      const checkoutUrl = (response as any)?.checkout_url as string | undefined;
      if (!checkoutUrl) {
        throw new Error("No checkout URL returned.");
      }
      window.location.href = checkoutUrl;
    } catch (error: any) {
      toast({
        title: "Checkout failed",
        description: getCheckoutErrorMessage(
          String(error?.message || error || ""),
        ),
        variant: "destructive",
      });
    } finally {
      setCheckingOutAddon(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] text-[#1C2B47]">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[38px] border border-[#D7E1ED] bg-[linear-gradient(180deg,#F8FBFF_0%,#F4F7FB_100%)] px-6 py-12 shadow-[0_22px_80px_rgba(7,28,58,0.08)] sm:px-10 sm:py-14 lg:px-16 lg:py-16">
          <div className="absolute -left-10 top-20 h-40 w-40 rounded-full bg-[#CCF4F2] blur-3xl" />
          <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-[#DDE9FF] blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-24 w-[72%] -translate-x-1/2 rounded-full bg-white/70 blur-3xl" />

          <div className="relative mx-auto max-w-4xl text-center">
            <Badge className="rounded-full border border-[#9FDCD7] bg-[#F1FBF9] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.28em] text-[#18A7A5] hover:bg-[#F1FBF9]">
              Brand plans
            </Badge>

            <h1 className="mt-8 font-serif text-4xl font-bold tracking-tight text-[#17315E] sm:text-5xl lg:text-[64px] lg:leading-[1.02]">
              <span className="block">The right plan for</span>
              <span className="mt-1 block italic text-[#18B1AE]">
                every stage of growth
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#6E7E9F] sm:text-xl">
              From your first campaign to a full-stack creator ecosystem.
              Likelee scales with you.
            </p>

            <div className="mt-8 flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#D7E1ED] bg-white px-2 py-2 shadow-[0_10px_24px_rgba(15,36,84,0.07)]">
                {(["monthly", "annual"] as const).map((cycle) => {
                  const selected = billingCycle === cycle;
                  return (
                    <button
                      key={cycle}
                      type="button"
                      className={cn(
                        "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                        selected
                          ? "bg-[#E9F5FF] text-[#17315E]"
                          : "text-[#8B98B3] hover:text-[#17315E]",
                      )}
                      onClick={() => setBillingCycle(cycle)}
                    >
                      {cycle === "monthly" ? "Monthly" : "Annual"}
                    </button>
                  );
                })}
                <span className="rounded-full bg-[#E9FFF2] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#2EB875]">
                  Save 20%
                </span>
              </div>
            </div>

            <p className="mx-auto mt-4 max-w-2xl text-sm text-[#7D8CA9]">
              {billingCycle === "annual"
                ? "Annual base plans are billed upfront and save 20%. AI Studio is a separate one-time add-on."
                : "Choose a base plan first, then unlock AI Studio with a one-time add-on."}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {!authenticated && (
                <Badge className="border border-[#D7E6ED] bg-white text-[#4B638E] hover:bg-white">
                  Pricing is public. Brand signup happens after plan selection.
                </Badge>
              )}
              {success && isBrandAccount && (
                <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                  Billing updated
                </Badge>
              )}
              {canceled && (
                <Badge className="border border-[#D7E6ED] bg-white text-[#4B638E] hover:bg-white">
                  Checkout canceled
                </Badge>
              )}
              {success && nextPath && hasStudioAddon && (
                <Button
                  variant="outline"
                  className="rounded-xl border-[#D7E6ED] bg-white"
                  onClick={() => navigate(nextPath)}
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </section>

        {authenticated && !isBrandAccount && (
          <Alert className="mx-auto mt-8 max-w-4xl border border-amber-200 bg-amber-50 text-amber-900">
            <AlertDescription>
              This page is public, but checkout only works for signed-in brand
              accounts.
            </AlertDescription>
          </Alert>
        )}

        <div className="relative z-10 mt-10 grid gap-6 px-1 xl:grid-cols-3 xl:px-4">
          {brandPlans.map((plan) => {
            const dark = plan.tier === "pro";
            const isCurrentPlan = hasBaseSubscription && planTier === plan.tier;
            const isLoading =
              plan.tier === "basic"
                ? checkingOutPlan === "basic"
                : checkingOutPlan === "pro_paid" ||
                  checkingOutPlan === "pro_trial";
            const isProPaidLoading = checkingOutPlan === "pro_paid";
            const isProTrialLoading = checkingOutPlan === "pro_trial";
            const priceDisplay = getPlanPriceDisplay(plan, billingCycle);

            return (
              <Card
                key={plan.tier}
                className={`relative overflow-hidden rounded-[24px] px-5 py-5 sm:px-6 sm:py-6 ${plan.cardClassName}`}
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1.5 ${
                    plan.tier === "basic"
                      ? "bg-[#6AD9E6]"
                      : plan.tier === "pro"
                        ? "bg-[#355EA8]"
                        : "bg-[#6F96FF]"
                  }`}
                />

                <div className="flex min-h-[560px] flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <Badge className={plan.badgeClassName}>
                      {plan.eyebrow}
                    </Badge>
                    {isCurrentPlan && (
                      <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                        Current
                      </Badge>
                    )}
                  </div>

                  <div className="mt-6">
                    <h2
                      className={`font-serif text-4xl font-bold ${plan.headingClassName}`}
                    >
                      {formatBrandPlanLabel(plan.tier)}
                    </h2>
                    <p
                      className={`mt-3 max-w-[16rem] text-sm ${plan.bodyClassName}`}
                    >
                      {plan.description}
                    </p>
                  </div>

                  <div className="mt-8">
                    {priceDisplay.previousPriceLabel && (
                      <div
                        className={`mb-2 text-sm font-semibold line-through ${
                          dark ? "text-[#7B96C2]" : "text-[#91A0BB]"
                        }`}
                      >
                        {priceDisplay.previousPriceLabel}
                      </div>
                    )}
                    <div
                      className={`font-serif text-5xl font-bold ${plan.headingClassName}`}
                    >
                      {priceDisplay.priceLabel}
                    </div>
                    <p className={`mt-2 text-sm ${plan.bodyClassName}`}>
                      {priceDisplay.priceNote}
                    </p>
                    {priceDisplay.priceCaption && (
                      <p
                        className={`mt-2 text-xs font-medium ${
                          dark ? "text-[#B8C8E5]" : "text-[#7B8AA6]"
                        }`}
                      >
                        {priceDisplay.priceCaption}
                      </p>
                    )}
                  </div>

                  <div className="mt-6">
                    {plan.tier === "enterprise" ? (
                      <Button
                        className={`h-11 w-full ${plan.buttonClassName}`}
                        onClick={() => navigate("/SalesInquiry")}
                      >
                        {plan.cta}
                      </Button>
                    ) : plan.tier === "pro" && !isCurrentPlan ? (
                      <div className="space-y-3">
                        <Button
                          disabled={!initialized || isLoading}
                          className={`h-11 w-full ${plan.buttonClassName} disabled:cursor-not-allowed disabled:opacity-60`}
                          onClick={() => handleBaseAction("pro", false)}
                        >
                          {isProPaidLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Redirecting
                            </>
                          ) : hasBaseSubscription ? (
                            "Upgrade plan"
                          ) : (
                            plan.cta
                          )}
                        </Button>
                        {!hasBaseSubscription && (
                          <>
                            <Button
                              disabled={!initialized || isLoading}
                              variant="outline"
                              className="h-11 w-full rounded-xl border border-[#4A6494] bg-transparent font-semibold text-white hover:bg-[#203C6C] disabled:cursor-not-allowed disabled:opacity-60"
                              onClick={() => handleBaseAction("pro", true)}
                            >
                              {isProTrialLoading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Redirecting
                                </>
                              ) : (
                                "Start 14-day free trial"
                              )}
                            </Button>
                            <p className="text-center text-xs text-[#B8C8E5]">
                              Trial is optional. Start paid immediately or
                              launch with a trial first.
                            </p>
                          </>
                        )}
                      </div>
                    ) : (
                      <Button
                        disabled={
                          !initialized || (isCurrentPlan && hasBaseSubscription)
                        }
                        className={`h-11 w-full ${plan.buttonClassName} disabled:cursor-not-allowed disabled:opacity-60`}
                        onClick={() =>
                          handleBaseAction(plan.tier, plan.tier === "pro")
                        }
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Redirecting
                          </>
                        ) : isCurrentPlan ? (
                          "Current plan"
                        ) : hasBaseSubscription ? (
                          "Upgrade plan"
                        ) : (
                          plan.cta
                        )}
                      </Button>
                    )}
                  </div>

                  <div className="mt-6 flex-1 space-y-5">
                    {plan.sections.map((section, sectionIndex) => (
                      <div
                        key={section.title}
                        className={
                          sectionIndex === 0
                            ? ""
                            : `border-t pt-4 ${plan.dividerClassName}`
                        }
                      >
                        <p
                          className={`text-[11px] font-bold uppercase tracking-[0.26em] ${
                            dark ? "text-[#6983AF]" : "text-[#9AA9C2]"
                          }`}
                        >
                          {section.title}
                        </p>
                        <div className="mt-3 space-y-3">
                          {section.items.map((item) => (
                            <PricingFeature
                              key={`${section.title}-${item.label}`}
                              item={item}
                              dark={dark}
                              mutedClassName={plan.mutedClassName}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {isBrandAccount && (
          <Card className="mx-auto mt-10 max-w-5xl rounded-[26px] border border-[#D7E6ED] bg-white px-6 py-5 shadow-[0_18px_45px_rgba(7,28,58,0.08)]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#8797B4]">
                  Current subscription
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="font-serif text-3xl font-bold text-[#17315E]">
                    {planLabel}
                  </span>
                  <Badge className="border border-[#D7E6ED] bg-[#F6F8FB] text-[#4B638E] hover:bg-[#F6F8FB]">
                    Base: {baseStatusLabel}
                  </Badge>
                  <Badge className="border border-[#D7E6ED] bg-[#F6F8FB] text-[#4B638E] hover:bg-[#F6F8FB]">
                    AI Studio: {studioStatusLabel}
                  </Badge>
                </div>
              </div>
              <div className="text-sm text-[#6E7E9F]">
                {trialEndsAt && <p>Free trial ends on {trialEndsAt}.</p>}
                {!trialEndsAt && currentPeriodEnd && (
                  <p>Base plan renews on {currentPeriodEnd}.</p>
                )}
                {hasStudioAddon && planTier !== "enterprise" && (
                  <p>AI Studio access is active (lifetime).</p>
                )}
              </div>
            </div>
          </Card>
        )}

        {hasBaseSubscription && (
          <Alert className="mx-auto mt-6 max-w-5xl border border-amber-200 bg-amber-50 text-amber-900">
            <AlertDescription>
              Your base plan is already active. AI Studio remains a separate
              line item, but base-plan changes are not self-serve yet.
            </AlertDescription>
          </Alert>
        )}

        <div ref={addonRef} className="mt-10">
          <Card
            className={`rounded-[24px] border bg-white px-6 py-6 shadow-[0_18px_45px_rgba(7,28,58,0.08)] ${
              focusStudio
                ? "border-[#F2994A] shadow-[0_0_0_4px_rgba(242,153,74,0.12)]"
                : "border-[#D7E6ED]"
            }`}
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFF2E7] text-[#F2994A]">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-[#F2994A]">
                      AI Studio add-on
                    </p>
                    <h3 className="font-serif text-3xl font-bold text-[#17315E]">
                      Separate from the base plan
                    </h3>
                  </div>
                </div>
                <p className="mt-4 text-sm text-[#6E7E9F] sm:text-base">
                  Unlock AI Studio with a single one-time payment of{" "}
                  <span className="font-semibold text-[#17315E]">
                    ${BRAND_STUDIO_ADDON_PRICE}
                  </span>
                  . Your brand gets permanent access to{" "}
                  <span className="font-semibold text-[#17315E]">/studio</span>{" "}
                  and{" "}
                  <span className="font-semibold text-[#17315E]">
                    {BRAND_STUDIO_ADDON_CREDITS.toLocaleString()} initial
                    credits
                  </span>{" "}
                  credited to your Studio wallet. Enterprise includes Studio
                  access automatically.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    `${BRAND_STUDIO_ADDON_CREDITS.toLocaleString()} initial Studio credits`,
                    "Studio Pro wallet plan",
                    "One-time payment",
                    "Permanent /studio access",
                    "Included with Enterprise",
                  ].map((item) => (
                    <Badge
                      key={item}
                      className="border border-[#F4DCC5] bg-[#FFF9F4] text-[#9A6A37] hover:bg-[#FFF9F4]"
                    >
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="w-full max-w-sm rounded-[20px] border border-[#F4DCC5] bg-[#FFF9F4] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-serif text-4xl font-bold text-[#17315E]">
                      ${BRAND_STUDIO_ADDON_PRICE}
                    </div>
                    <p className="mt-1 text-sm text-[#8D7459]">one-time</p>
                  </div>
                  <Badge className="border border-[#F4DCC5] bg-white text-[#9A6A37] hover:bg-white">
                    {studioStatusLabel}
                  </Badge>
                </div>

                <Button
                  disabled={!initialized || checkingOutAddon}
                  className="mt-5 h-11 w-full rounded-xl bg-[#17315E] text-white hover:bg-[#11274D] disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleStudioAddonAction}
                >
                  {checkingOutAddon ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Redirecting
                    </>
                  ) : authenticated &&
                    isBrandAccount &&
                    (hasStudioAddon || planTier === "enterprise") ? (
                    "Open Studio"
                  ) : authenticated && isBrandAccount ? (
                    "Activate Studio"
                  ) : (
                    "Get Studio Add-On"
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <section className="mt-14">
          <div className="max-w-2xl">
            <h2 className="font-serif text-4xl font-bold text-[#17315E]">
              Full comparison
            </h2>
            <p className="mt-4 text-base text-[#7D8CA9]">
              Everything side by side.
            </p>
          </div>

          <div className="mt-8 overflow-x-auto rounded-[30px] border border-[#D7E6ED] bg-white shadow-[0_18px_45px_rgba(7,28,58,0.08)]">
            <table className="w-full min-w-[880px] border-collapse">
              <thead>
                <tr className="text-sm font-semibold">
                  <th className="border-b border-[#D8E4F2] bg-[#F3F7FC] px-6 py-7 text-left text-[#6F83A9]">
                    Feature
                  </th>
                  <th className="border-b border-[#D8E4F2] bg-[#F3F7FC] px-6 py-7 text-center text-[#17315E]">
                    Basic
                  </th>
                  <th className="border-b border-[#D8E4F2] bg-[#17315E] px-6 py-7 text-center text-white">
                    Pro
                  </th>
                  <th className="border-b border-[#D8E4F2] bg-[#F3F7FC] px-6 py-7 text-center text-[#17315E]">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonSections.map((section) => (
                  <React.Fragment key={section.title}>
                    <tr className="border-t border-[#D8E4F2]">
                      <td
                        colSpan={4}
                        className="px-6 py-5 text-[13px] font-bold uppercase tracking-[0.14em] text-[#0AA9B3]"
                      >
                        {section.title}
                      </td>
                    </tr>
                    {section.rows.map((row) => (
                      <tr
                        key={`${section.title}-${row.feature}`}
                        className="border-t border-[#E4ECF6]"
                      >
                        <td className="px-6 py-7 align-middle text-sm font-medium text-[#405474]">
                          {row.feature}
                        </td>
                        <ComparisonPlanCell value={row.basic} plan="basic" />
                        <ComparisonPlanCell value={row.pro} plan="pro" />
                        <ComparisonPlanCell
                          value={row.enterprise}
                          plan="enterprise"
                        />
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12">
          <div className="rounded-[30px] border border-[#D7E6ED] bg-[linear-gradient(180deg,#F6F9FF_0%,#FFFFFF_32%)] px-6 py-8 shadow-[0_18px_45px_rgba(7,28,58,0.08)] sm:px-8 sm:py-10">
            <h2 className="text-center font-serif text-4xl font-bold text-[#17315E]">
              Common questions
            </h2>

            <div className="mt-10 space-y-0">
              {pricingFaqs.map((item, index) => (
                <div
                  key={item.question}
                  className={cn(
                    "py-7",
                    index > 0 && "border-t border-[#E5ECF6]",
                  )}
                >
                  <h3 className="text-xl font-semibold text-[#17315E]">
                    {item.question}
                  </h3>
                  <p className="mt-4 max-w-4xl text-base leading-8 text-[#4B638E]">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
