import React from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft, X, Gift, ArrowRight, Loader2 } from "lucide-react";
import {
  createCreatorSubscriptionCheckout,
  createCreatorBillingPortal,
  getCreatorBillingStatus,
} from "@/api/functions";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/auth/AuthProvider";
import { useTranslation } from "react-i18next";

export default function CreatorSubscribe() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { initialized, authenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const success = searchParams.get("success") === "1";
  const canceled = searchParams.get("canceled") === "1";
  const billingParam = String(searchParams.get("billing") || "").trim();
  const [currentPlanTier, setCurrentPlanTier] = React.useState<string>("free");
  const [effectivePlanTier, setEffectivePlanTier] =
    React.useState<string>("free");
  const [checkingOut, setCheckingOut] = React.useState(false);
  const [billingInfo, setBillingInfo] = React.useState<{
    current_period_end?: string;
    cancel_at_period_end?: boolean;
    plan_interval?: string;
    stripe_subscription_id?: string;
  }>({});

  const [trialInfo, setTrialInfo] = React.useState<{
    active: boolean;
    endsAt?: string;
    startAt?: string;
    basicStartAt?: string;
    proStartAt?: string;
  }>({ active: false });
  const [trialCountdown, setTrialCountdown] = React.useState<string>("");

  const [billingInterval, setBillingInterval] = React.useState<
    "month" | "year"
  >("month");
  const [loading, setLoading] = React.useState(true);
  const [startingTrial, setStartingTrial] = React.useState(false);

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!initialized) return;
    if (!authenticated) {
      const currentPath = location.pathname + location.search;
      navigate("/Login", {
        replace: true,
        state: { from: currentPath },
      });
    }
  }, [initialized, authenticated, navigate, location]);

  // Start a free trial by going through Stripe Checkout (collects card upfront, defers charge 30 days)
  const onStartTrial = async (plan: "basic" | "pro") => {
    if (!authenticated) {
      navigate("/Login", { replace: true, state: { from: location.pathname } });
      return;
    }
    try {
      setStartingTrial(true);
      const resp = await createCreatorSubscriptionCheckout({
        plan,
        interval: billingInterval,
        start_trial: true,
        agreement_accepted: true,
      });
      const url = String(resp?.checkout_url || "");
      if (!url)
        throw new Error(
          t("creatorSubscribe.errors.noCheckoutUrl", {
            defaultValue: "No checkout URL returned.",
          }),
        );
      window.location.href = url;
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: t("creatorSubscribe.errors.couldNotStartTrial", {
          defaultValue: "Could not start trial",
        }),
        description: e?.message?.includes("trial_already_used")
          ? t("creatorSubscribe.errors.trialAlreadyUsed", {
              defaultValue:
                "You have already used your free trial. Please subscribe directly.",
            })
          : e?.message || String(e),
      });
    } finally {
      setStartingTrial(false);
    }
  };

  const onManageSubscription = async () => {
    if (!authenticated) {
      navigate("/Login", { replace: true, state: { from: location.pathname } });
      return;
    }
    setCheckingOut(true);
    try {
      const resp = await createCreatorBillingPortal();
      const url = String((resp as any)?.checkout_url || "");
      if (!url) {
        throw new Error("No portal URL returned.");
      }
      window.location.href = url;
    } catch (error: any) {
      toast({
        title: "Could not open billing portal",
        description: String(error?.message || error || "Please try again."),
        variant: "destructive",
      });
    } finally {
      setCheckingOut(false);
    }
  };

  const pricing = {
    basic: {
      month: 25,
      year: 20, // $240/yr
    },
    pro: {
      month: 50,
      year: 40, // $480/yr
    },
  };

  const currentInterval = String(billingInfo?.plan_interval || "month");
  const isIntervalChange = (plan: "basic" | "pro") => {
    if (currentPlanTier !== plan) return false;
    return currentInterval !== billingInterval;
  };

  const canSelectBasic =
    !checkingOut && (currentPlanTier !== "basic" || isIntervalChange("basic"));
  const canSelectPro =
    !checkingOut && (currentPlanTier !== "pro" || isIntervalChange("pro"));

  const hasActiveSubscription = !!billingInfo?.stripe_subscription_id;
  const isPaidActive =
    hasActiveSubscription && currentPlanTier !== "free" && !trialInfo.active;

  const basicGroups = [
    {
      title: t("creatorSubscribe.groups.dashboardProfile"),
      items: [
        t("creatorSubscribe.features.dashboardOverview"),
        t("creatorSubscribe.features.likeness"),
        t("creatorSubscribe.features.kyc"),
        t("creatorSubscribe.features.visibilityUnlock"),
      ],
    },
    {
      title: t("creatorSubscribe.groups.connectionsPayouts"),
      items: [
        t("creatorSubscribe.features.agencyConnection"),
        t("creatorSubscribe.features.brandConnection"),
        t("creatorSubscribe.features.payouts"),
      ],
    },
  ];

  const proGroups = [
    {
      title: t("creatorSubscribe.groups.everythingInBasic"),
      items: [
        t("creatorSubscribe.features.cameoUploads"),
        t("creatorSubscribe.features.jobs"),
        t("creatorSubscribe.features.rules"),
      ],
    },
    {
      title: t("creatorSubscribe.groups.voiceTools"),
      items: [
        t("creatorSubscribe.features.voiceProfileCreation"),
        t("creatorSubscribe.features.voiceTones"),
        t("creatorSubscribe.features.talentPortal"),
      ],
    },
    {
      title: t("creatorSubscribe.groups.campaignsAnalytics"),
      items: [
        t("creatorSubscribe.features.archives"),
        t("creatorSubscribe.features.activeCampaigns"),
        t("creatorSubscribe.features.analytics"),
      ],
    },
  ];

  const comparisonSections = [
    {
      title: t("creatorSubscribe.comparison.coreAccess"),
      rows: [
        [t("creatorSubscribe.features.content"), true, true],
        [t("creatorSubscribe.features.dashboard"), true, true],
        [t("creatorSubscribe.features.likeness"), true, true],
        [t("creatorSubscribe.features.kyc"), true, true],
        [t("creatorSubscribe.features.agencyConnection"), true, true],
        [t("creatorSubscribe.features.brandConnection"), true, true],
        [t("creatorSubscribe.features.payouts"), true, true],
      ],
    },
    {
      title: t("creatorSubscribe.comparison.premiumWorkflow"),
      rows: [
        [t("creatorSubscribe.features.cameoUploads"), false, true],
        [t("creatorSubscribe.features.jobs"), false, true],
        [t("creatorSubscribe.features.rules"), false, true],
        [t("creatorSubscribe.features.voice"), false, true],
        [t("creatorSubscribe.features.talentPortal"), false, true],
        [t("creatorSubscribe.features.archives"), false, true],
        [t("creatorSubscribe.features.activeCampaigns"), false, true],
        [t("creatorSubscribe.features.analytics"), false, true],
      ],
    },
  ] as const;

  React.useEffect(() => {
    async function loadStatus() {
      try {
        const resp = await getCreatorBillingStatus();
        const tier = String((resp as any)?.plan_tier || "free");
        const entitlementTier = String(
          (resp as any)?.entitlement_tier || tier || "free",
        );
        const interval = String((resp as any)?.plan_interval || "month");

        const trialActive = !!(resp as any)?.trial_active;
        const trialEndsAt = (resp as any)?.trial_ends_at
          ? String((resp as any)?.trial_ends_at)
          : undefined;

        setCurrentPlanTier(tier);
        setEffectivePlanTier(entitlementTier);
        setBillingInfo({
          current_period_end: (resp as any)?.stripe_current_period_end,
          cancel_at_period_end: (resp as any)?.stripe_cancel_at_period_end,
          plan_interval: (resp as any)?.plan_interval,
          stripe_subscription_id: (resp as any)?.stripe_subscription_id,
        });

        setTrialInfo({
          active: trialActive,
          endsAt: trialEndsAt,
          startAt: (resp as any)?.trial_start_at,
          basicStartAt: (resp as any)?.trial_basic_start_at,
          proStartAt: (resp as any)?.trial_pro_start_at,
        });

        // If they have an active plan, sync the toggle to their current interval
        if (tier !== "free") {
          setBillingInterval(interval === "year" ? "year" : "month");
        }
      } catch (error) {
        console.error("Failed to load creator billing status", error);
      } finally {
        setLoading(false);
      }
    }
    void loadStatus();
  }, []);

  React.useEffect(() => {
    if (!trialInfo.active || !trialInfo.endsAt) {
      setTrialCountdown("");
      return;
    }

    const compute = () => {
      const end = new Date(trialInfo.endsAt as string).getTime();
      const now = Date.now();
      const ms = Math.max(0, end - now);

      const days = Math.ceil(ms / (24 * 60 * 60 * 1000));

      if (ms <= 0) {
        setTrialCountdown("Trial ended");
        return;
      }

      setTrialCountdown(`${days} ${days === 1 ? "day" : "days"} left`);
    };

    compute();
    const id = window.setInterval(compute, 60 * 1000);
    return () => window.clearInterval(id);
  }, [currentPlanTier, trialInfo.active, trialInfo.endsAt]);

  React.useEffect(() => {
    const key = "creator_billing_interval";
    const fromUrl = billingParam.toLowerCase();
    if (fromUrl === "monthly") {
      setBillingInterval("month");
      try {
        window.localStorage.setItem(key, "month");
      } catch {
        // ignore
      }
      return;
    }
    if (fromUrl === "annual") {
      setBillingInterval("year");
      try {
        window.localStorage.setItem(key, "year");
      } catch {
        // ignore
      }
      return;
    }

    try {
      const stored = String(window.localStorage.getItem(key) || "").trim();
      if (stored === "year") {
        setBillingInterval("year");
      } else {
        setBillingInterval("month");
      }
    } catch {
      setBillingInterval("month");
    }
  }, [billingParam]);

  React.useEffect(() => {
    if (success) {
      navigate("/CreatorDashboard?section=settings&settings=billing", {
        replace: true,
      });
    }
  }, [navigate, success]);

  const onUpgrade = async (plan: "basic" | "pro") => {
    if (trialInfo.active) {
      // Trialing users should use the checkout flow (renewal) to inherit days and see $0 confirmation
      return onCheckout(plan, true);
    }

    setCheckingOut(true);
    try {
      await base44.post("/creator/billing/upgrade", {
        plan,
        interval: billingInterval,
      });

      toast({
        title: "Plan Upgraded",
        description: `Your subscription has been updated to ${plan.toUpperCase()}.`,
      });

      // Redirect back to dashboard, it will refetch billing status on mount
      navigate("/CreatorDashboard?section=settings&settings=billing");
    } catch (error: any) {
      toast({
        title: "Upgrade failed",
        description: String(error?.message || error || "Please try again."),
        variant: "destructive",
      });
    } finally {
      setCheckingOut(false);
    }
  };

  const onCheckout = async (plan: "basic" | "pro", forceCheckout = false) => {
    if (
      billingInfo?.stripe_subscription_id &&
      !forceCheckout &&
      !trialInfo.active
    ) {
      return onUpgrade(plan);
    }
    setCheckingOut(true);
    try {
      const resp = await createCreatorSubscriptionCheckout({
        plan,
        interval: billingInterval,
      });
      const url = String(resp?.checkout_url || "");
      if (!url) {
        throw new Error("No checkout URL returned.");
      }
      window.location.href = url;
    } catch (error: any) {
      toast({
        title: "Checkout failed",
        description: String(error?.message || error || "Please try again."),
        variant: "destructive",
      });
    } finally {
      setCheckingOut(false);
    }
  };

  // Whether user has already used their trial (trial_started_at is set)
  const hasUsedBasicTrial =
    !!trialInfo.basicStartAt ||
    (!!trialInfo.startAt && currentPlanTier === "basic");
  const hasUsedProTrial =
    !!trialInfo.proStartAt ||
    (!!trialInfo.startAt && currentPlanTier === "pro");
  const hasUsedAnyTrial =
    !!trialInfo.startAt || !!trialInfo.basicStartAt || !!trialInfo.proStartAt;

  const hasActiveProTrial = trialInfo.active && !!trialInfo.proStartAt;

  const disableBasicSwitchOnPaidProMonthly =
    isPaidActive &&
    currentPlanTier === "pro" &&
    currentInterval === "month" &&
    billingInterval === "month";

  const canSelectBasicUi =
    canSelectBasic && !hasActiveProTrial && !disableBasicSwitchOnPaidProMonthly;

  const handlePlanSelection = (plan: "basic" | "pro") => {
    if (billingInfo?.stripe_subscription_id) {
      if (plan === "basic" && hasActiveProTrial) return;
      if (plan === "basic" && disableBasicSwitchOnPaidProMonthly) return;

      if (trialInfo.active) {
        void onCheckout(plan, true);
        return;
      }

      void onManageSubscription();
      return;
    } else if (plan === "basic" ? !hasUsedBasicTrial : !hasUsedProTrial) {
      // New trial
      void onStartTrial(plan);
    } else {
      // Paid checkout
      void onCheckout(plan);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F3EF] text-[#1B1C23]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-16 sm:pb-24">
        <div className="rounded-[24px] sm:rounded-[36px] border border-[#D9E4F1] bg-[linear-gradient(180deg,#F3F8FF_0%,#F8FBFF_100%)] px-4 sm:px-8 py-8 sm:py-14 text-center shadow-[0_18px_60px_rgba(15,34,71,0.08)]">
          <Badge className="rounded-full border border-[#9EE4E6] bg-[#E9FBFB] px-5 py-2 text-[11px] font-bold uppercase tracking-[0.28em] text-[#0B9DA2] shadow-none">
            {t("creatorSubscribe.hero.badge")}
          </Badge>
          <h1 className="mt-6 text-3xl sm:text-5xl font-black tracking-tight text-[#17315F]">
            {t("creatorSubscribe.hero.title")}
            <span className="mt-2 block font-serif italic font-medium text-[#0FA8AE]">
              {t("creatorSubscribe.hero.subtitle")}
            </span>
          </h1>
          <p className="mx-auto mt-4 sm:mt-6 max-w-3xl text-base sm:text-lg leading-7 sm:leading-8 text-[#56708F]">
            {t("creatorSubscribe.hero.description")}
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Badge className="rounded-full border border-[#D9E4F1] bg-white/80 px-4 py-2 text-xs font-semibold text-[#56708F] shadow-none">
              Plans are billed{" "}
              {t("creatorSubscribe.billing.plansAreBilled", {
                interval:
                  billingInterval === "year"
                    ? t("creatorSubscribe.billing.annually")
                    : t("creatorSubscribe.billing.monthly"),
              })}
            </Badge>

            <div className="flex items-center gap-2 rounded-full border border-[#D9E4F1] bg-white/90 px-3 py-1.5">
              <button
                type="button"
                className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                  billingInterval === "month"
                    ? "bg-[#E9FBFB] text-[#0B9DA2]"
                    : "text-[#6D7F97] hover:text-[#17315F]"
                }`}
                onClick={() => {
                  const next = "month" as const;
                  setBillingInterval(next);
                  try {
                    window.localStorage.setItem(
                      "creator_billing_interval",
                      next,
                    );
                  } catch {
                    // ignore
                  }
                  const sp = new URLSearchParams(searchParams);
                  sp.set("billing", "monthly");
                  navigate({ search: sp.toString() }, { replace: true });
                }}
              >
                {t("creatorSubscribe.billing.monthly")}
              </button>
              <div
                className={`h-5 w-10 rounded-full border border-[#D9E4F1] p-0.5 transition-colors ${
                  billingInterval === "year"
                    ? "bg-[#0B9DA2]/15"
                    : "bg-[#F5F7FA]"
                }`}
                role="switch"
                aria-checked={billingInterval === "year"}
                tabIndex={0}
                onClick={() => {
                  const next = billingInterval === "year" ? "month" : "year";
                  setBillingInterval(next);
                  try {
                    window.localStorage.setItem(
                      "creator_billing_interval",
                      next,
                    );
                  } catch {
                    // ignore
                  }
                  const sp = new URLSearchParams(searchParams);
                  sp.set("billing", next === "year" ? "annual" : "monthly");
                  navigate({ search: sp.toString() }, { replace: true });
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" && e.key !== " ") return;
                  e.preventDefault();
                  const next = billingInterval === "year" ? "month" : "year";
                  setBillingInterval(next);
                  try {
                    window.localStorage.setItem(
                      "creator_billing_interval",
                      next,
                    );
                  } catch {
                    // ignore
                  }
                  const sp = new URLSearchParams(searchParams);
                  sp.set("billing", next === "year" ? "annual" : "monthly");
                  navigate({ search: sp.toString() }, { replace: true });
                }}
              >
                <div
                  className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    billingInterval === "year"
                      ? "translate-x-5"
                      : "translate-x-0"
                  }`}
                />
              </div>
              <button
                type="button"
                className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                  billingInterval === "year"
                    ? "bg-[#E9FBFB] text-[#0B9DA2]"
                    : "text-[#6D7F97] hover:text-[#17315F]"
                }`}
                onClick={() => {
                  const next = "year" as const;
                  setBillingInterval(next);
                  try {
                    window.localStorage.setItem(
                      "creator_billing_interval",
                      next,
                    );
                  } catch {
                    // ignore
                  }
                  const sp = new URLSearchParams(searchParams);
                  sp.set("billing", "annual");
                  navigate({ search: sp.toString() }, { replace: true });
                }}
              >
                {t("creatorSubscribe.billing.annual")}
              </button>
              <Badge className="ml-1 border border-emerald-200 bg-emerald-100 text-emerald-700">
                {t("creatorSubscribe.billing.save20")}
              </Badge>
            </div>
            {success && (
              <Badge className="border border-emerald-200 bg-emerald-100 text-emerald-700">
                {t("creatorSubscribe.billing.subscriptionStarted")}
              </Badge>
            )}
            {canceled && (
              <Badge variant="outline" className="bg-white/80">
                {t("creatorSubscribe.billing.checkoutCanceled")}
              </Badge>
            )}
          </div>
          {currentPlanTier !== "free" && billingInfo.current_period_end && (
            <div className="mt-8 flex flex-col items-center gap-2">
              <div className="text-sm font-medium text-[#56708F]">
                {t("creatorSubscribe.currentPlan.label")}{" "}
                <span className="font-bold text-[#17315F] uppercase">
                  {currentPlanTier}
                </span>{" "}
                (
                {billingInfo.plan_interval === "year"
                  ? t("creatorSubscribe.billing.annual")
                  : t("creatorSubscribe.billing.monthly")}
                )
              </div>
              <Badge
                variant="secondary"
                className="bg-[#F0F4F8] text-[#56708F] border-[#D9E4F1]"
              >
                {billingInfo.cancel_at_period_end
                  ? t("creatorSubscribe.currentPlan.expiresOn")
                  : t("creatorSubscribe.currentPlan.renewsOn")}
                {new Date(billingInfo.current_period_end).toLocaleDateString(
                  undefined,
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  },
                )}
              </Badge>
              {isPaidActive && (
                <Button
                  className="mt-2 rounded-full bg-white text-[#17315F] font-black border border-[#D9E4F1] hover:bg-white/95"
                  onClick={() => {
                    void onManageSubscription();
                  }}
                  disabled={checkingOut || startingTrial}
                >
                  {t("creatorSubscribe.currentPlan.manageSubscription")}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Trial Banner: shown if user has not used ANY trial yet */}
        {!loading && !hasUsedAnyTrial && currentPlanTier === "free" && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 overflow-hidden rounded-[32px] border border-emerald-200/30 bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#042f2e] text-white shadow-[0_32px_64px_-16px_rgba(4,47,46,0.5)]"
          >
            <div className="flex flex-col gap-6 p-6 md:p-8 lg:flex-row lg:items-center lg:justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6 relative z-10">
                <motion.div
                  animate={{
                    y: [0, -8, 0],
                    rotate: [0, -5, 5, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-white/10 ring-1 ring-white/20 backdrop-blur-xl"
                >
                  <Gift className="h-8 w-8 text-[#5eead4]" />
                </motion.div>
                <div className="max-w-xl">
                  <div className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#5eead4] mb-3">
                    {t("creatorSubscribe.trial.oneTimeOffer")}
                  </div>
                  <h2 className="text-2xl font-black tracking-tight sm:text-3xl leading-tight">
                    {t("creatorSubscribe.trial.startPrefix")}{" "}
                    <span className="text-[#5eead4]">
                      {t("creatorSubscribe.trial.free")}
                    </span>{" "}
                    {t("creatorSubscribe.trial.startSuffix")}
                  </h2>
                  <p className="mt-2 text-sm text-white/60">
                    {t("creatorSubscribe.trial.description")}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6 items-stretch max-w-2xl mx-auto sm:max-w-none">
          <Card
            role="button"
            tabIndex={0}
            aria-disabled={!canSelectBasicUi}
            onClick={() => {
              handlePlanSelection("basic");
            }}
            onKeyDown={(e) => {
              if (!canSelectBasicUi) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handlePlanSelection("basic");
              }
            }}
            className={`flex flex-col rounded-[28px] border border-[#D8E1EC]/60 bg-white p-5 lg:p-6 shadow-[0_10px_30px_rgba(20,37,66,0.04)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15A9AD]/40 ${
              canSelectBasicUi
                ? "cursor-pointer hover:shadow-[0_14px_40px_rgba(20,37,66,0.06)]"
                : "cursor-default border-[#15A9AD]/30 bg-emerald-50/20"
            }`}
          >
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <Badge className="bg-[#DFF7F8] text-[#128C96] shadow-none hover:bg-[#DFF7F8] w-fit">
                  {t("creatorSubscribe.plans.basic.badge")}
                </Badge>
                {!isPaidActive && !hasUsedBasicTrial && (
                  <motion.div
                    animate={{ y: [0, -5, 0], rotate: [0, -3, 3, 0] }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#15A9AD]/10 ring-1 ring-[#15A9AD]/20"
                  >
                    <Gift className="h-5 w-5 text-[#15A9AD]" />
                  </motion.div>
                )}
              </div>
              <div className="text-3xl font-black text-[#17315F]">
                {t("creatorSubscribe.plans.basic.name")}
              </div>
              <div className="mt-2 text-[15px] leading-6 text-[#6D7F97]">
                {t("creatorSubscribe.plans.basic.description")}
              </div>
              <div className="mt-4 flex items-baseline gap-1 mb-6">
                <div className="text-[40px] font-black leading-none tracking-[-0.06em] text-[#17315F]">
                  ${pricing.basic[billingInterval]}
                </div>
                <div className="text-sm font-bold text-[#A9B6C8]">
                  {t("creatorSubscribe.billing.perMonth")}{" "}
                  {billingInterval === "year"
                    ? t("creatorSubscribe.billing.annualSuffix")
                    : ""}
                </div>
              </div>
              <Button
                className="w-full rounded-xl bg-[#15A9AD] text-white font-black hover:bg-[#0F9699]"
                variant={currentPlanTier === "basic" ? "outline" : "default"}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlanSelection("basic");
                }}
                disabled={!canSelectBasicUi || checkingOut || startingTrial}
              >
                {currentPlanTier === "basic" && !isIntervalChange("basic") ? (
                  t("creatorSubscribe.actions.currentPlan")
                ) : currentPlanTier === "basic" && isIntervalChange("basic") ? (
                  t("creatorSubscribe.actions.switchToInterval", {
                    interval:
                      billingInterval === "year"
                        ? t("creatorSubscribe.billing.annual")
                        : t("creatorSubscribe.billing.monthly"),
                  })
                ) : isPaidActive && currentPlanTier === "pro" ? (
                  t("creatorSubscribe.actions.switchToBasic")
                ) : currentPlanTier === "pro" && !hasUsedBasicTrial ? (
                  <span className="flex items-center gap-2">
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Gift className="h-4 w-4" />
                    </motion.span>
                    {t("creatorSubscribe.actions.switchToBasicTrial")}
                  </span>
                ) : !hasUsedBasicTrial ? (
                  <span className="flex items-center gap-2">
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Gift className="h-4 w-4" />
                    </motion.span>
                    {t("creatorSubscribe.actions.startFreeTrial")}
                  </span>
                ) : (
                  t("creatorSubscribe.actions.subscribeToBasic")
                )}
              </Button>
              {!isPaidActive &&
                currentPlanTier === "pro" &&
                !hasUsedBasicTrial &&
                trialInfo.endsAt && (
                  <div className="mt-3 text-center">
                    <p className="text-[11px] font-bold text-[#12A4A9]/70 uppercase tracking-wider">
                      {t("creatorSubscribe.trial.continuation")}
                    </p>
                    <p className="mt-1 text-[13px] text-[#26415F]/80 leading-snug">
                      {t("creatorSubscribe.trial.basicCarryOver")}{" "}
                      <span className="font-bold text-[#26415F]">
                        {new Date(trialInfo.endsAt).toLocaleDateString(
                          undefined,
                          {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </span>
                      .
                    </p>
                  </div>
                )}
              <div className="mt-6 space-y-4">
                {basicGroups.map((group) => (
                  <div key={group.title} className="space-y-2">
                    <div className="text-[10px] font-black uppercase tracking-[0.15em] text-[#9AA9BC]">
                      {group.title}
                    </div>
                    <div className="space-y-2">
                      {group.items.slice(0, 3).map((label) => (
                        <div
                          key={label}
                          className="flex items-center gap-2.5 text-[#26415F]"
                        >
                          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#E8FAFB] text-[#12A4A9]">
                            <Check className="h-3 w-3" />
                          </div>
                          <div className="text-[14px] font-semibold">
                            {label}
                          </div>
                        </div>
                      ))}
                      {group.items.length > 3 && (
                        <div className="text-[12px] font-bold text-[#12A4A9] pl-6">
                          {t("creatorSubscribe.moreFeatures")}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card
            role="button"
            tabIndex={0}
            aria-disabled={!canSelectPro}
            onClick={() => {
              if (!canSelectPro) return;
              if (!hasUsedProTrial) {
                void onStartTrial("pro");
              } else {
                void onCheckout("pro");
              }
            }}
            onKeyDown={(e) => {
              if (!canSelectPro) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (!hasUsedProTrial) {
                  void onStartTrial("pro");
                } else {
                  void onCheckout("pro");
                }
              }
            }}
            className={`flex flex-col rounded-[28px] border border-[#D8E1EC]/60 bg-[linear-gradient(180deg,#173664_0%,#122C55_100%)] p-5 lg:p-6 text-white shadow-[0_14px_40px_rgba(20,37,66,0.1)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
              canSelectPro
                ? "cursor-pointer hover:shadow-[0_18px_48px_rgba(20,37,66,0.15)]"
                : "cursor-default border-white/20"
            }`}
          >
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <Badge className="bg-[#1C5375] text-[#89F4F7] shadow-none hover:bg-[#1C5375]">
                  {t("creatorSubscribe.plans.pro.badge")}
                </Badge>
                {currentPlanTier !== "pro" && (
                  <Badge className="bg-[#2E4DA4] text-white text-[10px]">
                    {t("creatorSubscribe.plans.pro.recommended")}
                  </Badge>
                )}
                {!isPaidActive && !hasUsedProTrial && (
                  <motion.div
                    animate={{ y: [0, -5, 0], rotate: [0, -3, 3, 0] }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur-md ml-auto"
                  >
                    <Gift className="h-5 w-5 text-[#89F4F7]" />
                  </motion.div>
                )}
              </div>
              <div className="text-3xl font-black">
                {t("creatorSubscribe.plans.pro.name")}
              </div>
              <div className="mt-2 text-[15px] leading-6 text-[#B8CAE3]">
                {t("creatorSubscribe.plans.pro.description")}
              </div>
              <div className="mt-4 flex items-baseline gap-1 mb-6">
                <div className="text-[40px] font-black leading-none tracking-[-0.06em] text-white">
                  ${pricing.pro[billingInterval]}
                </div>
                <div className="text-sm font-bold text-[#9EB2CA]">
                  {t("creatorSubscribe.billing.perMonth")}{" "}
                  {billingInterval === "year"
                    ? t("creatorSubscribe.billing.annualSuffix")
                    : ""}
                </div>
              </div>
              <Button
                className="w-full rounded-xl bg-white text-[#17315F] font-black hover:bg-white/95"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlanSelection("pro");
                }}
                disabled={!canSelectPro || checkingOut || startingTrial}
              >
                {currentPlanTier === "pro" && !isIntervalChange("pro") ? (
                  t("creatorSubscribe.actions.currentPlan")
                ) : currentPlanTier === "pro" && isIntervalChange("pro") ? (
                  t("creatorSubscribe.actions.switchToInterval", {
                    interval:
                      billingInterval === "year"
                        ? t("creatorSubscribe.billing.annual")
                        : t("creatorSubscribe.billing.monthly"),
                  })
                ) : isPaidActive && currentPlanTier === "basic" ? (
                  t("creatorSubscribe.actions.switchToPro")
                ) : currentPlanTier === "basic" && !hasUsedProTrial ? (
                  <span className="flex items-center gap-2">
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Gift className="h-5 w-5" />
                    </motion.span>
                    {t("creatorSubscribe.actions.switchToProTrial")}
                  </span>
                ) : !hasUsedProTrial ? (
                  <span className="flex items-center gap-2">
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Gift className="h-5 w-5" />
                    </motion.span>
                    {t("creatorSubscribe.actions.startFreeTrial")}
                  </span>
                ) : (
                  t("creatorSubscribe.actions.subscribeToPro")
                )}
              </Button>
              {!isPaidActive &&
                currentPlanTier === "basic" &&
                !hasUsedProTrial &&
                trialInfo.endsAt && (
                  <div className="mt-3 text-center">
                    <p className="text-[11px] font-bold text-[#89F4F7]/70 uppercase tracking-wider">
                      {t("creatorSubscribe.trial.continuation")}
                    </p>
                    <p className="mt-1 text-[13px] text-white/80 leading-snug">
                      {t("creatorSubscribe.trial.proCarryOver")}{" "}
                      <span className="font-bold text-white">
                        {new Date(trialInfo.endsAt).toLocaleDateString(
                          undefined,
                          {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </span>
                      .
                    </p>
                  </div>
                )}
              <div className="mt-6 space-y-4">
                {proGroups.map((group) => (
                  <div key={group.title} className="space-y-2">
                    <div className="text-[10px] font-black uppercase tracking-[0.15em] text-white/40">
                      {group.title}
                    </div>
                    <div className="space-y-2">
                      {group.items.slice(0, 3).map((label) => (
                        <div
                          key={label}
                          className="flex items-center gap-2.5 text-white/90"
                        >
                          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white/10 text-[#89F4F7]">
                            <Check className="h-3 w-3" />
                          </div>
                          <div className="text-[14px] font-semibold">
                            {label}
                          </div>
                        </div>
                      ))}
                      {group.items.length > 3 && (
                        <div className="text-[12px] font-bold text-[#89F4F7] pl-6">
                          {t("creatorSubscribe.moreFeatures")}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-14 rounded-[32px] border border-[#DDE6F0] bg-white px-4 sm:px-6 py-6 sm:py-8 shadow-[0_18px_50px_rgba(20,37,66,0.06)] lg:px-10">
          <div>
            <div className="text-2xl sm:text-3xl font-black text-[#17315F]">
              {t("creatorSubscribe.comparison.title")}
            </div>
            <div className="mt-2 text-[#7A8CA4]">
              {t("creatorSubscribe.comparison.subtitle")}
            </div>
          </div>
          <div className="mt-8 overflow-x-auto rounded-[24px] border border-[#E3EAF2]">
            <table className="w-full min-w-[480px] border-collapse text-left">
              <thead>
                <tr className="bg-[#F6FAFD] text-[#17315F]">
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.24em] text-[#89A0B9]">
                    {t("creatorSubscribe.comparison.feature")}
                  </th>
                  <th className="px-6 py-4 text-sm font-bold">
                    {t("creatorSubscribe.plans.basic.name")} — $
                    {pricing.basic[billingInterval]}
                    {t("creatorSubscribe.billing.perMonth")}
                  </th>
                  <th className="bg-[#173562] px-6 py-4 text-sm font-bold text-white">
                    {t("creatorSubscribe.plans.pro.name")} — $
                    {pricing.pro[billingInterval]}
                    {t("creatorSubscribe.billing.perMonth")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonSections.map((section) => (
                  <React.Fragment key={section.title}>
                    <tr className="border-t border-[#E8EEF5] bg-white">
                      <td
                        colSpan={3}
                        className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.24em] text-[#10A4AA]"
                      >
                        {section.title}
                      </td>
                    </tr>
                    {section.rows.map(([label, basic, pro]) => (
                      <tr
                        key={label}
                        className="border-t border-[#EEF3F8] text-[#47617D]"
                      >
                        <td className="px-6 py-4 text-[15px]">{label}</td>
                        <td className="px-6 py-4 bg-[#F9FBFD]">
                          <div className="flex justify-center">
                            {basic ? (
                              <Check className="h-4 w-4 text-[#12A4A9]" />
                            ) : (
                              <X className="h-4 w-4 text-[#9DB0C2]" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 bg-[#EEF4FB]">
                          <div className="flex justify-center">
                            {pro ? (
                              <Check className="h-4 w-4 text-[#12A4A9]" />
                            ) : (
                              <X className="h-4 w-4 text-[#9DB0C2]" />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-12 flex justify-center">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-[#9DB0C2] hover:text-[#17315F] font-bold"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("creatorSubscribe.backToDashboard")}
          </Button>
        </div>
      </div>
    </div>
  );
}
