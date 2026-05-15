import React from "react";
import { ArrowRight, Check, Loader2, Sparkles, X } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  BRAND_TRIAL_DAYS,
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

type BrandPricingT = (key: string, options?: Record<string, unknown>) => string;

const getBrandPlans = (t: BrandPricingT): BrandPlanCard[] => [
  {
    tier: "basic",
    eyebrow: t("brandPricing.plans.basic.eyebrow"),
    description: t("brandPricing.plans.basic.description"),
    monthlyPrice: 149,
    priceNote: t("brandPricing.billing.perMonth"),
    cta: t("brandPricing.plans.basic.cta"),
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
        title: t("brandPricing.sections.campaigns"),
        items: [
          {
            label: t("brandPricing.features.campaignList"),
            pill: t("brandPricing.pills.activeCampaigns", { count: 3 }),
          },
          { label: t("brandPricing.features.newCampaignWizardBasic") },
          { label: t("brandPricing.features.metricsOverview") },
          {
            label: t("brandPricing.features.talentBrowseLicense"),
            disabled: true,
          },
        ],
      },
      {
        title: t("brandPricing.sections.collaboration"),
        items: [
          {
            label: t("brandPricing.features.inviteCompanySeats"),
            pill: t("brandPricing.pills.seats", { count: 2 }),
          },
          { label: t("brandPricing.features.inviteAgency"), disabled: true },
          { label: t("brandPricing.features.addAiCreator"), disabled: true },
        ],
      },
      {
        title: t("brandPricing.sections.assetsReporting"),
        items: [
          { label: t("brandPricing.features.campaignDetailsDeliverables") },
          { label: t("brandPricing.features.approveRequestDownload") },
          { label: t("brandPricing.features.assetComments"), disabled: true },
        ],
      },
    ],
  },
  {
    tier: "pro",
    eyebrow: t("brandPricing.plans.pro.eyebrow"),
    description: t("brandPricing.plans.pro.description"),
    monthlyPrice: 349,
    priceNote: t("brandPricing.billing.perMonth"),
    cta: t("brandPricing.plans.pro.cta"),
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
        title: t("brandPricing.sections.campaigns"),
        items: [
          {
            label: t("brandPricing.features.campaignList"),
            pill: t("brandPricing.pills.activeCampaigns", { count: 10 }),
          },
          { label: t("brandPricing.features.fullCampaignWizard") },
          { label: t("brandPricing.features.talentBrowseLicenseAgency") },
        ],
      },
      {
        title: t("brandPricing.sections.collaboration"),
        items: [
          {
            label: t("brandPricing.features.inviteCompanySeats"),
            pill: t("brandPricing.pills.seats", { count: 5 }),
          },
          { label: t("brandPricing.features.inviteAgencyMarketplace") },
          { label: t("brandPricing.features.addAiCreatorCollaborators") },
        ],
      },
      {
        title: t("brandPricing.sections.assetsReporting"),
        items: [
          { label: t("brandPricing.features.campaignDetailsDeliverables") },
          { label: t("brandPricing.features.assetComments") },
          { label: t("brandPricing.features.contractsLicensingTab") },
          { label: t("brandPricing.features.analyticsReporting") },
        ],
      },
    ],
  },
  {
    tier: "enterprise",
    eyebrow: t("brandPricing.plans.enterprise.eyebrow"),
    description: t("brandPricing.plans.enterprise.description"),
    priceLabel: t("brandPricing.plans.enterprise.priceLabel"),
    priceNote: t("brandPricing.plans.enterprise.priceNote"),
    cta: t("brandPricing.plans.enterprise.cta"),
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
        title: t("brandPricing.sections.everythingInPro"),
        items: [
          { label: t("brandPricing.features.unlimitedCampaigns") },
          { label: t("brandPricing.features.unlimitedSeatsAgency") },
          {
            label: t("brandPricing.features.aiStudio"),
            pill: t("brandPricing.values.included"),
          },
          { label: t("brandPricing.features.notificationsActivity") },
        ],
      },
      {
        title: t("brandPricing.sections.platformSettings"),
        items: [
          { label: t("brandPricing.features.fullSettings") },
          { label: t("brandPricing.features.advancedAnalyticsCsv") },
          { label: t("brandPricing.features.customContractTemplates") },
          { label: t("brandPricing.features.ssoAuditLogs") },
          { label: t("brandPricing.features.apiZapier") },
          { label: t("brandPricing.features.dedicatedCsm") },
        ],
      },
    ],
  },
];

const getComparisonSections = (t: BrandPricingT): ComparisonSection[] => [
  {
    title: t("brandPricing.sections.campaigns"),
    rows: [
      {
        feature: t("brandPricing.comparison.activeCampaigns"),
        basic: "3",
        pro: "10",
        enterprise: t("brandPricing.values.unlimited"),
      },
      {
        feature: t("brandPricing.comparison.talentBrowseLicense"),
        basic: "cross",
        pro: "check",
        enterprise: "check",
      },
    ],
  },
  {
    title: t("brandPricing.sections.collaboration"),
    rows: [
      {
        feature: t("brandPricing.comparison.companySeats"),
        basic: "2",
        pro: "5",
        enterprise: t("brandPricing.values.unlimited"),
      },
      {
        feature: t("brandPricing.features.inviteAgency"),
        basic: "cross",
        pro: "check",
        enterprise: "check",
      },
      {
        feature: t("brandPricing.features.addAiCreator"),
        basic: "cross",
        pro: "check",
        enterprise: "check",
      },
      {
        feature: t("brandPricing.comparison.multiAgencyManagement"),
        basic: "cross",
        pro: "cross",
        enterprise: "check",
      },
    ],
  },
  {
    title: t("brandPricing.sections.assetsApprovals"),
    rows: [
      {
        feature: t("brandPricing.comparison.deliverableApproveDownload"),
        basic: "check",
        pro: "check",
        enterprise: "check",
      },
      {
        feature: t("brandPricing.features.assetComments"),
        basic: "cross",
        pro: "check",
        enterprise: "check",
      },
      {
        feature: t("brandPricing.features.contractsLicensingTab"),
        basic: "cross",
        pro: "check",
        enterprise: "check",
      },
      {
        feature: t("brandPricing.features.customContractTemplates"),
        basic: "cross",
        pro: "cross",
        enterprise: "check",
      },
    ],
  },
  {
    title: t("brandPricing.sections.analyticsPlatform"),
    rows: [
      {
        feature: t("brandPricing.features.analyticsReporting"),
        basic: "cross",
        pro: "check",
        enterprise: "check",
      },
      {
        feature: t("brandPricing.features.advancedAnalyticsCsv"),
        basic: "cross",
        pro: "cross",
        enterprise: "check",
      },
      {
        feature: t("brandPricing.comparison.notificationsActivityFeed"),
        basic: "cross",
        pro: "cross",
        enterprise: "check",
      },
      {
        feature: t("brandPricing.features.fullSettings"),
        basic: t("brandPricing.values.basic"),
        pro: t("brandPricing.values.basic"),
        enterprise: t("brandPricing.values.full"),
      },
      {
        feature: t("brandPricing.features.ssoAuditLogs"),
        basic: "cross",
        pro: "cross",
        enterprise: "check",
      },
    ],
  },
  {
    title: t("brandPricing.features.aiStudio"),
    rows: [
      {
        feature: t("brandPricing.comparison.aiStudioActivation"),
        basic: t("brandPricing.values.oneTimePrice", {
          price: BRAND_STUDIO_ADDON_PRICE,
        }),
        pro: t("brandPricing.values.oneTimePrice", {
          price: BRAND_STUDIO_ADDON_PRICE,
        }),
        enterprise: t("brandPricing.values.included"),
      },
      {
        feature: t("brandPricing.comparison.editInStudio"),
        basic: t("brandPricing.values.addOnOnly"),
        pro: t("brandPricing.values.addOnOnly"),
        enterprise: "check",
      },
    ],
  },
];

const getPricingFaqs = (t: BrandPricingT): PricingFaq[] => [
  {
    question: t("brandPricing.faq.upgrade.question"),
    answer: t("brandPricing.faq.upgrade.answer"),
  },
  {
    question: t("brandPricing.faq.activeCampaign.question"),
    answer: t("brandPricing.faq.activeCampaign.answer"),
  },
  {
    question: t("brandPricing.faq.studioAccess.question"),
    answer: t("brandPricing.faq.studioAccess.answer", {
      price: BRAND_STUDIO_ADDON_PRICE,
      credits: BRAND_STUDIO_ADDON_CREDITS.toLocaleString(),
    }),
  },
  {
    question: t("brandPricing.faq.agencySeats.question"),
    answer: t("brandPricing.faq.agencySeats.answer"),
  },
  {
    question: t("brandPricing.faq.talentLicensing.question"),
    answer: t("brandPricing.faq.talentLicensing.answer"),
  },
  {
    question: t("brandPricing.faq.enterprise.question"),
    answer: t("brandPricing.faq.enterprise.answer"),
  },
];

const BRAND_PLAN_ANNUAL_DISCOUNT = 0.2;

function getPlanPriceDisplay(
  plan: BrandPlanCard,
  billingCycle: BillingCycle,
  t: BrandPricingT,
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
      priceNote: t("brandPricing.billing.perMonthEquivalent"),
      priceCaption: t("brandPricing.billing.billedAnnually", {
        total: currencyFormatter.format(annualTotal),
      }),
      previousPriceLabel: `${currencyFormatter.format(plan.monthlyPrice)}/mo`,
    };
  }

  return {
    priceLabel: currencyFormatter.format(plan.monthlyPrice),
    priceNote: plan.priceNote,
    priceCaption:
      plan.tier === "basic" || plan.tier === "pro"
        ? t("brandPricing.billing.trialCaption", { days: BRAND_TRIAL_DAYS })
        : undefined,
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

function getCheckoutErrorMessage(message: string, t: BrandPricingT): string {
  if (message.includes("brand_subscription_already_active")) {
    return t("brandPricing.errors.baseAlreadyActive");
  }
  if (message.includes("studio_addon_already_active")) {
    return t("brandPricing.errors.studioAlreadyActive");
  }
  if (message.includes("studio_addon_included_with_enterprise")) {
    return t("brandPricing.errors.studioIncludedEnterprise");
  }
  if (message.includes("enterprise_contact_sales")) {
    return t("brandPricing.errors.enterpriseSales");
  }
  if (
    message.includes("STRIPE_BRAND_BASIC_ANNUAL_PRICE_ID") ||
    message.includes("STRIPE_BRAND_PRO_ANNUAL_PRICE_ID")
  ) {
    return t("brandPricing.errors.annualNotConfigured");
  }
  return message || t("brandPricing.errors.tryAgain");
}

function buildBrandSignupPath(input: {
  plan: "basic" | "pro";
  focusStudio?: boolean;
  billingCycle?: BillingCycle;
}) {
  const params = new URLSearchParams({
    type: "brand_company",
    plan: input.plan,
    autostart: "1",
  });
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
  const { t } = useTranslation("brand");
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
  const isRequired = searchParams.get("required") === "1";

  const [checkingOutPlan, setCheckingOutPlan] = React.useState<
    null | "basic" | "pro"
  >(null);
  const [checkingOutAddon, setCheckingOutAddon] = React.useState(false);
  const verifyCalledRef = React.useRef(false);
  const [billingCycle, setBillingCycle] =
    React.useState<BillingCycle>(searchBillingCycle);
  const autoCheckoutStartedRef = React.useRef(false);
  const brandPlans = React.useMemo(() => getBrandPlans(t), [t]);
  const comparisonSections = React.useMemo(() => getComparisonSections(t), [t]);
  const pricingFaqs = React.useMemo(() => getPricingFaqs(t), [t]);

  const isBrandAccount = profile?.role === "brand";
  const planTier = normalizeBrandPlanTier(profile?.plan_tier);
  const hasBaseSubscription =
    isBrandAccount && hasActiveBrandBaseSubscription(profile);
  const hasStudioAddon = isBrandAccount && hasBrandStudioAccess(profile);
  const baseStatusLabel = formatBrandSubscriptionStatus(profile);
  const studioStatusLabel = formatBrandStudioAddonStatus(profile);
  const planLabel =
    planTier === "free"
      ? t("brandPricing.planNames.free")
      : t(`brandPricing.planNames.${planTier}`);
  const trialEndsAt =
    String(profile?.subscription_status || "")
      .trim()
      .toLowerCase() === "trialing"
      ? formatDateLabel(profile?.subscription_trial_end)
      : null;
  const currentPeriodEnd = formatDateLabel(
    profile?.subscription_current_period_end,
  );

  React.useEffect(() => {
    if (!isRequired) return;
    if (!initialized || !authenticated || !isBrandAccount) return;
    if (hasBaseSubscription) {
      navigate("/BrandDashboard", { replace: true });
    }
  }, [
    authenticated,
    hasBaseSubscription,
    initialized,
    isBrandAccount,
    isRequired,
    navigate,
  ]);
  React.useEffect(() => {
    if (!success || !authenticated) return;
    if (verifyCalledRef.current) return;
    verifyCalledRef.current = true;

    const run = async () => {
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

      // Redirect to dashboard after successful subscription
      if (isBrandAccount) {
        const dest = nextPath || "/BrandDashboard";
        navigate(dest, { replace: true });
      }
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
    void beginBrandCheckout(requestedPlan);
  }, [
    authenticated,
    autoStartCheckout,
    canceled,
    hasBaseSubscription,
    initialized,
    isBrandAccount,
    requestedPlan,
    success,
  ]);

  const redirectToBrandSignup = (
    tier: "basic" | "pro",
    options?: { focusStudio?: boolean },
  ) => {
    navigate(
      buildBrandSignupPath({
        plan: tier,
        focusStudio: options?.focusStudio,
        billingCycle,
      }),
    );
  };

  const beginBrandCheckout = async (tier: "basic" | "pro") => {
    setCheckingOutPlan(tier);
    try {
      const response = await createBrandSubscriptionCheckout({
        plan: tier,
        billing_cycle: billingCycle,
        next_path: nextPath || undefined,
      });
      const checkoutUrl = (response as any)?.checkout_url as string | undefined;
      if (!checkoutUrl) {
        throw new Error(t("brandPricing.errors.noCheckoutUrl"));
      }
      window.location.href = checkoutUrl;
    } catch (error: any) {
      toast({
        title: t("brandPricing.errors.checkoutFailed"),
        description: getCheckoutErrorMessage(
          String(error?.message || error || ""),
          t,
        ),
        variant: "destructive",
      });
    } finally {
      setCheckingOutPlan(null);
    }
  };

  const handleBaseAction = async (tier: "basic" | "pro") => {
    if (!initialized) return;

    if (!authenticated) {
      redirectToBrandSignup(tier);
      return;
    }

    if (!isBrandAccount) {
      toast({
        title: t("brandPricing.errors.brandAccountRequired"),
        description: t("brandPricing.errors.brandAccountRequiredDescription"),
        variant: "destructive",
      });
      redirectToBrandSignup(tier);
      return;
    }

    if (hasBaseSubscription) {
      if (planTier === tier) {
        return;
      }

      await beginBrandCheckout(tier);
      return;
    }

    await beginBrandCheckout(tier);
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
      redirectToBrandSignup("pro", { focusStudio: true });
      return;
    }

    if (!isBrandAccount) {
      toast({
        title: t("brandPricing.errors.brandAccountRequired"),
        description: t(
          "brandPricing.errors.studioBrandAccountRequiredDescription",
        ),
        variant: "destructive",
      });
      redirectToBrandSignup("pro", { focusStudio: true });
      return;
    }

    setCheckingOutAddon(true);
    try {
      const response = await createBrandStudioAddonCheckout({
        next_path: nextPath || undefined,
      });
      const checkoutUrl = (response as any)?.checkout_url as string | undefined;
      if (!checkoutUrl) {
        throw new Error(t("brandPricing.errors.noCheckoutUrl"));
      }
      window.location.href = checkoutUrl;
    } catch (error: any) {
      toast({
        title: t("brandPricing.errors.checkoutFailed"),
        description: getCheckoutErrorMessage(
          String(error?.message || error || ""),
          t,
        ),
        variant: "destructive",
      });
    } finally {
      setCheckingOutAddon(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] text-[#1C2B47]">
      {isRequired && (
        <div className="bg-gradient-to-r from-[#18B1AE] via-[#16A8A5] to-[#14A3A0] text-white py-4 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0wIDBoNDB2NDBIMHoiLz48L2c+PC9zdmc+')] opacity-10"></div>
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 relative z-10">
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5">
              <span className="text-lg">🎉</span>
              <span className="text-sm font-bold">
                {t("brandPricing.requiredBanner")}
              </span>
            </div>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <section className="relative overflow-hidden rounded-[38px] border border-[#D7E1ED] bg-[linear-gradient(180deg,#F8FBFF_0%,#F4F7FB_100%)] px-6 py-12 shadow-[0_22px_80px_rgba(7,28,58,0.08)] sm:px-10 sm:py-14 lg:px-16 lg:py-16">
          <div className="absolute -left-10 top-20 h-40 w-40 rounded-full bg-[#CCF4F2] blur-3xl" />
          <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-[#DDE9FF] blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-24 w-[72%] -translate-x-1/2 rounded-full bg-white/70 blur-3xl" />

          <div className="relative mx-auto max-w-4xl text-center">
            {isRequired ? (
              <>
                <div className="inline-flex items-center gap-2 rounded-full border-2 border-[#B8E6E4] bg-gradient-to-r from-[#EDFAF8] to-[#E5F9F5] px-4 py-2 mb-6">
                  <span className="text-xl">✨</span>
                  <span className="text-sm font-semibold text-[#107573]">
                    {t("brandPricing.hero.setupPill")}
                  </span>
                </div>

                <h1 className="mt-4 font-serif text-5xl font-bold tracking-tight text-[#17315E] sm:text-6xl lg:text-[72px] lg:leading-[1.1]">
                  <span className="block">
                    {t("brandPricing.hero.titlePrefix")}
                  </span>
                  <span className="mt-2 block bg-gradient-to-r from-[#18B1AE] to-[#14A3A0] bg-clip-text text-transparent">
                    {t("brandPricing.hero.trialTitle", {
                      days: BRAND_TRIAL_DAYS,
                    })}
                  </span>
                </h1>

                <p className="mx-auto mt-6 max-w-2xl text-lg leading-7 text-[#6E7E9F] sm:text-xl">
                  {t("brandPricing.hero.subtitleBefore")}{" "}
                  <span className="font-semibold text-[#17315E]">
                    {t("brandPricing.hero.subtitleStrong")}
                  </span>
                  <br />
                  {t("brandPricing.hero.subtitleAfter", {
                    days: BRAND_TRIAL_DAYS,
                  })}
                </p>

                <div className="mt-8 inline-flex items-center gap-4 rounded-2xl border-2 border-[#B8E6E4] bg-white px-6 py-4 shadow-lg shadow-[#18B1AE]/10">
                  <div className="flex -space-x-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#18B1AE] to-[#14A3A0] flex items-center justify-center text-white text-sm font-bold border-2 border-white">
                      ✓
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-[#17315E]">
                      {t("brandPricing.hero.noChargeTitle")}
                    </p>
                    <p className="text-xs text-[#6E7E9F]">
                      {t("brandPricing.hero.noChargeSubtitle", {
                        days: BRAND_TRIAL_DAYS,
                      })}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Badge className="rounded-full border border-[#9FDCD7] bg-[#F1FBF9] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.28em] text-[#18A7A5] hover:bg-[#F1FBF9]">
                  {t("brandPricing.hero.brandPlans")}
                </Badge>

                <h1 className="mt-8 font-serif text-4xl font-bold tracking-tight text-[#17315E] sm:text-5xl lg:text-[64px] lg:leading-[1.02]">
                  <span className="block">
                    {t("brandPricing.hero.publicTitleLine1")}
                  </span>
                  <span className="mt-1 block italic text-[#18B1AE]">
                    {t("brandPricing.hero.publicTitleLine2")}
                  </span>
                </h1>

                <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#6E7E9F] sm:text-xl">
                  {t("brandPricing.hero.publicSubtitle")}
                </p>
              </>
            )}

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
                      {cycle === "monthly"
                        ? t("brandPricing.billing.monthly")
                        : t("brandPricing.billing.annual")}
                    </button>
                  );
                })}
                <span className="rounded-full bg-[#E9FFF2] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#2EB875]">
                  {t("brandPricing.billing.save20")}
                </span>
              </div>
            </div>

            <p className="mx-auto mt-4 max-w-2xl text-sm text-[#7D8CA9]">
              {billingCycle === "annual"
                ? t("brandPricing.hero.annualBasePlanNote")
                : t("brandPricing.hero.basePlanNote")}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {!authenticated && (
                <Badge className="border border-[#D7E6ED] bg-white text-[#4B638E] hover:bg-white">
                  {t("brandPricing.badges.publicPricing")}
                </Badge>
              )}
              {success && isBrandAccount && (
                <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                  {t("brandPricing.badges.billingUpdated")}
                </Badge>
              )}
              {canceled && (
                <Badge className="border border-[#D7E6ED] bg-white text-[#4B638E] hover:bg-white">
                  {t("brandPricing.badges.checkoutCanceled")}
                </Badge>
              )}
              {success && nextPath && hasStudioAddon && (
                <Button
                  variant="outline"
                  className="rounded-xl border-[#D7E6ED] bg-white"
                  onClick={() => navigate(nextPath)}
                >
                  {t("brandPricing.actions.continue")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </section>

        {authenticated && !isBrandAccount && (
          <Alert className="mx-auto mt-8 max-w-4xl border border-amber-200 bg-amber-50 text-amber-900">
            <AlertDescription>
              {t("brandPricing.errors.checkoutSignedInBrandsOnly")}
            </AlertDescription>
          </Alert>
        )}

        <div className="relative z-10 mt-10 grid gap-6 px-1 sm:grid-cols-2 xl:grid-cols-3 xl:px-4">
          {brandPlans.map((plan) => {
            const dark = plan.tier === "pro";
            const isCurrentPlan = hasBaseSubscription && planTier === plan.tier;
            const isLoading = checkingOutPlan === plan.tier;
            const priceDisplay = getPlanPriceDisplay(plan, billingCycle, t);

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

                <div className="flex min-h-[480px] sm:min-h-[560px] flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <Badge className={plan.badgeClassName}>
                      {plan.eyebrow}
                    </Badge>
                    {isCurrentPlan && (
                      <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                        {t("brandPricing.badges.current")}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-6">
                    <h2
                      className={`font-serif text-4xl font-bold ${plan.headingClassName}`}
                    >
                      {t(`brandPricing.planNames.${plan.tier}`)}
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
                    <div className="flex items-baseline gap-2">
                      <div
                        className={`font-serif text-5xl font-bold ${plan.headingClassName}`}
                      >
                        {priceDisplay.priceLabel}
                      </div>
                      {plan.tier !== "enterprise" && !hasBaseSubscription && (
                        <Badge className="bg-gradient-to-r from-[#18B1AE] to-[#14A3A0] text-white border-0 text-xs font-bold px-2 py-0.5 animate-pulse">
                          {t("brandPricing.badges.daysFree", {
                            days: BRAND_TRIAL_DAYS,
                          })}
                        </Badge>
                      )}
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
                    {plan.tier !== "enterprise" && !hasBaseSubscription && (
                      <p className="mt-3 text-xs text-[#18B1AE] font-semibold flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#18B1AE] animate-ping"></span>
                        {t("brandPricing.billing.cardRequired")}
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
                    ) : (
                      <div className="space-y-3">
                        <Button
                          disabled={
                            !initialized ||
                            (isCurrentPlan && hasBaseSubscription)
                          }
                          className={`h-12 w-full ${plan.buttonClassName} disabled:cursor-not-allowed disabled:opacity-60 group relative overflow-hidden`}
                          onClick={() =>
                            handleBaseAction(plan.tier as "basic" | "pro")
                          }
                        >
                          <span className="relative z-10 flex items-center justify-center gap-2">
                            {isLoading ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {t("brandPricing.actions.redirecting")}
                              </>
                            ) : isCurrentPlan ? (
                              t("brandPricing.actions.currentPlan")
                            ) : hasBaseSubscription ? (
                              <>
                                <span>
                                  {t("brandPricing.actions.upgradeTo")}
                                </span>
                                <span className="font-bold">
                                  {t(`brandPricing.planNames.${plan.tier}`)}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="font-bold">
                                  {t("brandPricing.actions.startTrial", {
                                    days: BRAND_TRIAL_DAYS,
                                  })}
                                </span>
                                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                              </>
                            )}
                          </span>
                        </Button>
                        {!hasBaseSubscription && !isCurrentPlan && (
                          <p className="text-center text-xs text-[#6E7E9F]">
                            {t("brandPricing.actions.or")}{" "}
                            <button
                              onClick={() => navigate("/SalesInquiry")}
                              className="text-[#18B1AE] font-semibold hover:underline underline-offset-2"
                            >
                              {t("brandPricing.actions.contactSalesActivation")}
                            </button>
                          </p>
                        )}
                      </div>
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
          <Card className="mx-auto mt-10 max-w-5xl rounded-[26px] border border-[#D7E6ED] bg-white px-4 sm:px-6 py-5 shadow-[0_18px_45px_rgba(7,28,58,0.08)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#8797B4]">
                  {t("brandPricing.subscription.currentSubscription")}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="font-serif text-3xl font-bold text-[#17315E]">
                    {planLabel}
                  </span>
                  <Badge className="border border-[#D7E6ED] bg-[#F6F8FB] text-[#4B638E] hover:bg-[#F6F8FB]">
                    {t("brandPricing.subscription.base", {
                      status: baseStatusLabel,
                    })}
                  </Badge>
                  <Badge className="border border-[#D7E6ED] bg-[#F6F8FB] text-[#4B638E] hover:bg-[#F6F8FB]">
                    {t("brandPricing.subscription.aiStudio", {
                      status: studioStatusLabel,
                    })}
                  </Badge>
                </div>
              </div>
              <div className="text-sm text-[#6E7E9F]">
                {trialEndsAt && (
                  <p>
                    {t("brandPricing.subscription.trialEndsOn", {
                      date: trialEndsAt,
                    })}
                  </p>
                )}
                {!trialEndsAt && currentPeriodEnd && (
                  <p>
                    {t("brandPricing.subscription.baseRenewsOn", {
                      date: currentPeriodEnd,
                    })}
                  </p>
                )}
                {hasStudioAddon && planTier !== "enterprise" && (
                  <p>{t("brandPricing.subscription.studioLifetimeActive")}</p>
                )}
              </div>
            </div>
          </Card>
        )}

        {hasBaseSubscription && (
          <Alert className="mx-auto mt-6 max-w-5xl border border-amber-200 bg-amber-50 text-amber-900">
            <AlertDescription>
              {t("brandPricing.subscription.baseAlreadyActiveNotice")}
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
                      {t("brandPricing.addon.eyebrow")}
                    </p>
                    <h3 className="font-serif text-3xl font-bold text-[#17315E]">
                      {t("brandPricing.addon.title")}
                    </h3>
                  </div>
                </div>
                <p className="mt-4 text-sm text-[#6E7E9F] sm:text-base">
                  {t("brandPricing.addon.descriptionPrefix")}{" "}
                  <span className="font-semibold text-[#17315E]">
                    ${BRAND_STUDIO_ADDON_PRICE}
                  </span>
                  {t("brandPricing.addon.descriptionMiddle")}{" "}
                  <span className="font-semibold text-[#17315E]">/studio</span>{" "}
                  {t("brandPricing.addon.descriptionAnd")}{" "}
                  <span className="font-semibold text-[#17315E]">
                    {BRAND_STUDIO_ADDON_CREDITS.toLocaleString()} initial{" "}
                    {t("brandPricing.addon.credits")}
                  </span>{" "}
                  {t("brandPricing.addon.descriptionSuffix")}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    t("brandPricing.addon.badges.initialCredits", {
                      credits: BRAND_STUDIO_ADDON_CREDITS.toLocaleString(),
                    }),
                    t("brandPricing.addon.badges.walletPlan"),
                    t("brandPricing.addon.badges.oneTimePayment"),
                    t("brandPricing.addon.badges.permanentAccess"),
                    t("brandPricing.addon.badges.enterpriseIncluded"),
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

              <div className="w-full lg:max-w-sm rounded-[20px] border border-[#F4DCC5] bg-[#FFF9F4] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-serif text-4xl font-bold text-[#17315E]">
                      ${BRAND_STUDIO_ADDON_PRICE}
                    </div>
                    <p className="mt-1 text-sm text-[#8D7459]">
                      {t("brandPricing.billing.oneTime")}
                    </p>
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
                      {t("brandPricing.actions.redirecting")}
                    </>
                  ) : authenticated &&
                    isBrandAccount &&
                    (hasStudioAddon || planTier === "enterprise") ? (
                    t("brandPricing.actions.openStudio")
                  ) : authenticated && isBrandAccount ? (
                    t("brandPricing.actions.activateStudio")
                  ) : (
                    t("brandPricing.actions.getStudioAddon")
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <section className="mt-14">
          <div className="max-w-2xl">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#17315E]">
              {t("brandPricing.comparison.title")}
            </h2>
            <p className="mt-3 sm:mt-4 text-base text-[#7D8CA9]">
              {t("brandPricing.comparison.subtitle")}
            </p>
          </div>

          <div className="mt-8 overflow-x-auto rounded-[30px] border border-[#D7E6ED] bg-white shadow-[0_18px_45px_rgba(7,28,58,0.08)]">
            <table className="w-full min-w-[880px] border-collapse">
              <thead>
                <tr className="text-sm font-semibold">
                  <th className="border-b border-[#D8E4F2] bg-[#F3F7FC] px-6 py-7 text-left text-[#6F83A9]">
                    {t("brandPricing.comparison.feature")}
                  </th>
                  <th className="border-b border-[#D8E4F2] bg-[#F3F7FC] px-6 py-7 text-center text-[#17315E]">
                    {t("brandPricing.planNames.basic")}
                  </th>
                  <th className="border-b border-[#D8E4F2] bg-[#17315E] px-6 py-7 text-center text-white">
                    {t("brandPricing.planNames.pro")}
                  </th>
                  <th className="border-b border-[#D8E4F2] bg-[#F3F7FC] px-6 py-7 text-center text-[#17315E]">
                    {t("brandPricing.planNames.enterprise")}
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
          <div className="rounded-[30px] border border-[#D7E6ED] bg-[linear-gradient(180deg,#F6F9FF_0%,#FFFFFF_32%)] px-4 py-6 shadow-[0_18px_45px_rgba(7,28,58,0.08)] sm:px-8 sm:py-10">
            <h2 className="text-center font-serif text-3xl sm:text-4xl font-bold text-[#17315E]">
              {t("brandPricing.faq.title")}
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
