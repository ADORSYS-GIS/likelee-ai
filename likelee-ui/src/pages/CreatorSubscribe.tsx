import React from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  ArrowLeft,
  X,
  Gift,
  ArrowRight,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import {
  createCreatorSubscriptionCheckout,
  getCreatorBillingStatus,
} from "@/api/functions";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function CreatorSubscribe() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const success = searchParams.get("success") === "1";
  const canceled = searchParams.get("canceled") === "1";
  const billingParam = String(searchParams.get("billing") || "").trim();
  const [currentPlanTier, setCurrentPlanTier] = React.useState<string>("free");
  const [checkingOut, setCheckingOut] = React.useState(false);
  const [billingInfo, setBillingInfo] = React.useState<{
    current_period_end?: string;
    cancel_at_period_end?: boolean;
    plan_interval?: string;
  }>({});

  const [trialInfo, setTrialInfo] = React.useState<{
    active: boolean;
    endsAt?: string;
    startAt?: string;
  }>({ active: false });
  const [trialCountdown, setTrialCountdown] = React.useState<string>("");

  const [billingInterval, setBillingInterval] = React.useState<
    "month" | "year"
  >("month");
  const [loading, setLoading] = React.useState(true);
  const [startingTrial, setStartingTrial] = React.useState(false);
  const [showActiveTrialModal, setShowActiveTrialModal] = React.useState(false);

  const onStartTrial = async () => {
    try {
      setStartingTrial(true);
      await base44.post("/api/creator/billing/start-trial", {});
      // Refresh billing status
      const resp = await getCreatorBillingStatus();
      const tier = String((resp as any)?.plan_tier || "free");
      setCurrentPlanTier(tier);
      setTrialInfo({
        active: !!(resp as any)?.trial_active,
        endsAt: (resp as any)?.trial_ends_at
          ? String((resp as any)?.trial_ends_at)
          : undefined,
        startAt: (resp as any)?.trial_start_at,
      });
      toast({
        title: "Trial started!",
        description:
          "You now have 30 days of Pro access to explore all features.",
      });
    } catch (e: any) {
      if (
        e?.message?.includes("trial_already_started") ||
        String(e).includes("trial_already_started")
      ) {
        setShowActiveTrialModal(true);
      } else {
        toast({
          variant: "destructive",
          title: "Failed to start trial",
          description: e?.message || String(e),
        });
      }
    } finally {
      setStartingTrial(false);
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

  const canSelectBasic = !checkingOut && currentPlanTier !== "basic";
  const canSelectPro = !checkingOut && currentPlanTier !== "pro";

  const basicGroups = [
    {
      title: "Dashboard & Profile",
      items: [
        "Dashboard overview",
        "My Likeness",
        "Identity verification (KYC)",
        "Creator visibility trust unlock",
      ],
    },
    {
      title: "Connections & Payouts",
      items: ["Agency connection", "Brand connection", "Payouts"],
    },
  ];

  const proGroups = [
    {
      title: "Everything in Basic, plus",
      items: ["Cameo video uploads", "Jobs", "Settings: My Rules"],
    },
    {
      title: "Voice & Creator Tools",
      items: ["Voice profile creation", "Up to 6 voice tones", "Talent Portal"],
    },
    {
      title: "Campaigns & Analytics",
      items: [
        "Campaign Archives",
        "Active Campaigns",
        "Advanced earnings analytics",
      ],
    },
  ];

  const comparisonSections = [
    {
      title: "Core access",
      rows: [
        ["Content", true, true],
        ["Dashboard", true, true],
        ["My Likeness", true, true],
        ["Identity verification (KYC)", true, true],
        ["Agency connection", true, true],
        ["Brand connection", true, true],
        ["Payouts", true, true],
      ],
    },
    {
      title: "Premium workflow",
      rows: [
        ["Cameo video uploads", false, true],
        ["Jobs", false, true],
        ["Settings: My Rules", false, true],
        ["Voice", false, true],
        ["Talent Portal", false, true],
        ["Campaign Archives", false, true],
        ["Active Campaigns", false, true],
        ["Advanced earnings analytics", false, true],
      ],
    },
  ] as const;

  React.useEffect(() => {
    async function loadStatus() {
      try {
        const resp = await getCreatorBillingStatus();
        const tier = String((resp as any)?.plan_tier || "free");
        const interval = String((resp as any)?.plan_interval || "month");

        const trialActive = !!(resp as any)?.trial_active;
        const trialEndsAt = (resp as any)?.trial_ends_at
          ? String((resp as any)?.trial_ends_at)
          : undefined;

        setCurrentPlanTier(tier);
        setBillingInfo({
          current_period_end: (resp as any)?.stripe_current_period_end,
          cancel_at_period_end: (resp as any)?.stripe_cancel_at_period_end,
          plan_interval: (resp as any)?.plan_interval,
        });

        setTrialInfo({
          active: trialActive,
          endsAt: trialEndsAt,
          startAt: (resp as any)?.trial_start_at,
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
    if (currentPlanTier !== "free" || !trialInfo.active || !trialInfo.endsAt) {
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

  const onCheckout = async (plan: "basic" | "pro") => {
    setCheckingOut(true);
    try {
      const resp = await createCreatorSubscriptionCheckout({
        plan,
        interval: billingInterval,
      });
      const url = String((resp as any)?.checkout_url || "");
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

  return (
    <div className="min-h-screen bg-[#F6F3EF] text-[#1B1C23]">
      <div className="max-w-6xl mx-auto px-6 pt-12 pb-24">
        <div className="rounded-[36px] border border-[#D9E4F1] bg-[linear-gradient(180deg,#F3F8FF_0%,#F8FBFF_100%)] px-8 py-14 text-center shadow-[0_18px_60px_rgba(15,34,71,0.08)]">
          <Badge className="rounded-full border border-[#9EE4E6] bg-[#E9FBFB] px-5 py-2 text-[11px] font-bold uppercase tracking-[0.28em] text-[#0B9DA2] shadow-none">
            Creator Plans
          </Badge>
          <h1 className="mt-6 text-5xl font-black tracking-tight text-[#17315F]">
            Own your likeness.
            <span className="mt-2 block font-serif italic font-medium text-[#0FA8AE]">
              Earn from it forever.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-[#56708F]">
            Simple, affordable plans so creators can protect, license, and
            monetize their identity in the AI era with the right level of
            access.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
            {currentPlanTier === "free" &&
              trialInfo.active &&
              trialInfo.endsAt && (
                <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
                  <Badge className="border border-amber-200 bg-amber-100 text-amber-800 shadow-none">
                    30-day trial
                  </Badge>
                  <span className="font-semibold">
                    Full access • {trialCountdown || "Calculating..."}
                  </span>
                </div>
              )}
            <Badge variant="outline" className="bg-white/80">
              Plans are billed{" "}
              {billingInterval === "year" ? "annually" : "monthly"}
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
                Monthly
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
                Annual
              </button>
              <Badge className="ml-1 border border-emerald-200 bg-emerald-100 text-emerald-700">
                SAVE 20%
              </Badge>
            </div>
            {success && (
              <Badge className="border border-emerald-200 bg-emerald-100 text-emerald-700">
                Subscription started
              </Badge>
            )}
            {canceled && (
              <Badge variant="outline" className="bg-white/80">
                Checkout canceled
              </Badge>
            )}
          </div>
          {currentPlanTier !== "free" && billingInfo.current_period_end && (
            <div className="mt-8 flex flex-col items-center gap-2">
              <div className="text-sm font-medium text-[#56708F]">
                Current Plan:{" "}
                <span className="font-bold text-[#17315F] uppercase">
                  {currentPlanTier}
                </span>{" "}
                ({billingInfo.plan_interval === "year" ? "Annual" : "Monthly"})
              </div>
              <Badge
                variant="secondary"
                className="bg-[#F0F4F8] text-[#56708F] border-[#D9E4F1]"
              >
                {billingInfo.cancel_at_period_end
                  ? "Expires on "
                  : "Renews on "}
                {new Date(billingInfo.current_period_end).toLocaleDateString(
                  undefined,
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  },
                )}
              </Badge>
            </div>
          )}
        </div>

        {!loading && !trialInfo.startAt && currentPlanTier === "free" && (
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
                    Limited Time Trial
                  </div>
                  <h2 className="text-2xl font-black tracking-tight sm:text-3xl leading-tight">
                    Start Your 30-Day{" "}
                    <span className="text-[#5eead4]">Pro</span> Trial
                  </h2>
                </div>
              </div>
              <div className="w-full lg:w-auto relative z-10">
                <Button
                  type="button"
                  disabled={startingTrial}
                  onClick={onStartTrial}
                  className="w-full lg:w-64 h-12 rounded-xl bg-white text-[#0f172a] hover:bg-[#ccfbf1] transition-all duration-300 font-black text-base shadow-xl group"
                >
                  {startingTrial ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Unlock My Trial
                      <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        <div className="mt-10 flex flex-wrap justify-center gap-6 items-stretch">
          {currentPlanTier === "free" && (
            <Card className="flex-1 min-w-[320px] max-w-[380px] flex flex-col rounded-[28px] border border-[#D8E1EC]/60 bg-white p-5 lg:p-6 shadow-[0_10px_30px_rgba(20,37,66,0.04)] transition-all">
              <Badge className="bg-gray-100 text-gray-600 shadow-none hover:bg-gray-100 mb-4">
                DEFAULT
              </Badge>
              <div className="text-3xl font-black text-[#17315F]">Free</div>
              <div className="mt-2 text-[15px] leading-6 text-[#6D7F97]">
                Basic visibility and profile setup.
              </div>
              <div className="mt-4 flex items-baseline gap-1 mb-6">
                <div className="text-[40px] font-black leading-none tracking-[-0.06em] text-[#17315F]">
                  $0
                </div>
                <div className="text-sm font-bold text-[#A9B6C8]">forever</div>
              </div>
              <Button
                className="w-full rounded-xl bg-gray-50 text-[#8E9EB3] font-black"
                disabled
              >
                Current Plan
              </Button>
              <div className="mt-6 space-y-3">
                {[
                  "Basic profile setup",
                  "Marketplace visibility",
                  "Standard support",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2.5 text-[#26415F]"
                  >
                    <div className="h-4 w-4 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
                      <Check className="h-3 w-3" />
                    </div>
                    <span className="text-[14px] font-semibold">{item}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card
            role="button"
            tabIndex={0}
            aria-disabled={!canSelectBasic}
            onClick={() => {
              if (!canSelectBasic) return;
              void onCheckout("basic");
            }}
            onKeyDown={(e) => {
              if (!canSelectBasic) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                void onCheckout("basic");
              }
            }}
            className={`flex-1 min-w-[320px] max-w-[380px] flex flex-col rounded-[28px] border border-[#D8E1EC]/60 bg-white p-5 lg:p-6 shadow-[0_10px_30px_rgba(20,37,66,0.04)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15A9AD]/40 ${
              canSelectBasic
                ? "cursor-pointer hover:shadow-[0_14px_40px_rgba(20,37,66,0.06)]"
                : "cursor-default border-[#15A9AD]/30 bg-emerald-50/20"
            }`}
          >
            <div className="flex flex-col h-full">
              <Badge className="bg-[#DFF7F8] text-[#128C96] shadow-none hover:bg-[#DFF7F8] w-fit mb-4">
                ESSENTIAL
              </Badge>
              <div className="text-3xl font-black text-[#17315F]">Basic</div>
              <div className="mt-2 text-[15px] leading-6 text-[#6D7F97]">
                Get verified and start earning.
              </div>
              <div className="mt-4 flex items-baseline gap-1 mb-6">
                <div className="text-[40px] font-black leading-none tracking-[-0.06em] text-[#17315F]">
                  ${pricing.basic[billingInterval]}
                </div>
                <div className="text-sm font-bold text-[#A9B6C8]">
                  /mo {billingInterval === "year" ? "(annual)" : ""}
                </div>
              </div>
              <Button
                className="w-full rounded-xl bg-[#15A9AD] text-white font-black hover:bg-[#0F9699]"
                variant={currentPlanTier === "basic" ? "outline" : "default"}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!canSelectBasic) return;
                  void onCheckout("basic");
                }}
                disabled={!canSelectBasic}
              >
                {currentPlanTier === "basic" ? "Current Plan" : "Get Basic"}
              </Button>
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
                          + More features
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
              void onCheckout("pro");
            }}
            onKeyDown={(e) => {
              if (!canSelectPro) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                void onCheckout("pro");
              }
            }}
            className={`flex-1 min-w-[320px] max-w-[380px] flex flex-col rounded-[28px] border border-[#D8E1EC]/60 bg-[linear-gradient(180deg,#173664_0%,#122C55_100%)] p-5 lg:p-6 text-white shadow-[0_14px_40px_rgba(20,37,66,0.1)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
              canSelectPro
                ? "cursor-pointer hover:shadow-[0_18px_48px_rgba(20,37,66,0.15)]"
                : "cursor-default border-white/20"
            }`}
          >
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <Badge className="bg-[#1C5375] text-[#89F4F7] shadow-none hover:bg-[#1C5375]">
                  MOST POPULAR
                </Badge>
                {currentPlanTier !== "pro" && (
                  <Badge className="bg-[#2E4DA4] text-white text-[10px]">
                    RECOM.
                  </Badge>
                )}
              </div>
              <div className="text-3xl font-black">Pro</div>
              <div className="mt-2 text-[15px] leading-6 text-[#B8CAE3]">
                The full premium creator suite.
              </div>
              <div className="mt-4 flex items-baseline gap-1 mb-6">
                <div className="text-[40px] font-black leading-none tracking-[-0.06em] text-white">
                  ${pricing.pro[billingInterval]}
                </div>
                <div className="text-sm font-bold text-[#9EB2CA]">
                  /mo {billingInterval === "year" ? "(annual)" : ""}
                </div>
              </div>
              <Button
                className="w-full rounded-xl bg-white text-[#17315F] font-black hover:bg-white/95"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!canSelectPro) return;
                  void onCheckout("pro");
                }}
                disabled={!canSelectPro}
              >
                {currentPlanTier === "pro" ? "Current Plan" : "Get Pro"}
              </Button>
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
                          + More features
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-14 rounded-[32px] border border-[#DDE6F0] bg-white px-6 py-8 shadow-[0_18px_50px_rgba(20,37,66,0.06)] lg:px-10">
          <div>
            <div className="text-3xl font-black text-[#17315F]">
              Full comparison
            </div>
            <div className="mt-2 text-[#7A8CA4]">
              Every feature, side by side.
            </div>
          </div>
          <div className="mt-8 overflow-hidden rounded-[24px] border border-[#E3EAF2]">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-[#F6FAFD] text-[#17315F]">
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.24em] text-[#89A0B9]">
                    Feature
                  </th>
                  <th className="px-6 py-4 text-sm font-bold">
                    Basic — ${pricing.basic[billingInterval]}/mo
                  </th>
                  <th className="bg-[#173562] px-6 py-4 text-sm font-bold text-white">
                    Pro — ${pricing.pro[billingInterval]}/mo
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
            Back to Dashboard
          </Button>
        </div>

        <Dialog
          open={showActiveTrialModal}
          onOpenChange={setShowActiveTrialModal}
        >
          <DialogContent className="sm:max-w-[420px] rounded-[32px] p-8">
            <div className="flex flex-col items-center text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 shadow-sm ring-1 ring-emerald-100">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-[#0f172a]">
                  Pro Trial Active!
                </DialogTitle>
                <DialogDescription className="mt-4 text-base leading-relaxed text-[#475569]">
                  It looks like your 30-day Pro trial has already been
                  activated. You're all set to explore every premium feature on
                  Likelee!
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="mt-8 w-full sm:justify-center">
                <Button
                  onClick={() => setShowActiveTrialModal(false)}
                  className="w-full sm:w-32 h-11 rounded-xl bg-[#0f172a] font-black text-white hover:bg-black transition-all"
                >
                  Got it!
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
