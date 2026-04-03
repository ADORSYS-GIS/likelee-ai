import React from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ArrowRight, Check } from "lucide-react";
import {
  changeAgencySubscriptionPlan,
  createAgencyIrlBookingAddonCheckout,
  createAgencySubscriptionCheckout,
  getAgencyProfile,
} from "@/api/functions";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/auth/AuthProvider";

const DEFAULT_ROSTER_MODELS = 10;
const MIN_ROSTER_MODELS = 2;
const MAX_ROSTER_MODELS = 1000;
const BASIC_BASE_PLAN_COST = 399;
const PRO_BASE_PLAN_COST = 489;
const BASIC_ROSTER_RATE = 5;
const PRO_ROSTER_RATE = 10;
const IRL_BOOKING_COST = 489;

function parseBooleanFlag(value: unknown) {
  if (typeof value === "boolean") return value;
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

function parsePositiveInteger(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/[^\d]/g, "");
  if (!normalized) return null;
  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isFinite(parsed) || parsed < MIN_ROSTER_MODELS) {
    return null;
  }
  return parsed;
}

function clampRosterModels(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function planRank(plan: string | null) {
  if (plan === "pro") return 2;
  if (plan === "basic") return 1;
  return 0;
}

function describePlan(plan: "basic" | "pro", interval: "month" | "year") {
  return `${plan === "pro" ? "Pro" : "Basic"} ${interval === "year" ? "Annual" : "Monthly"}`;
}

export default function AgencySubscribe() {
  const { initialized, authenticated, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [searchParams] = useSearchParams();
  const success = searchParams.get("success") === "1";
  const canceled = searchParams.get("canceled") === "1";
  const checkoutSessionId = String(searchParams.get("session_id") || "").trim();
  const billingParam = String(searchParams.get("billing") || "").trim();

  const [billingInterval, setBillingInterval] = React.useState<
    "month" | "year"
  >("month");

  const [plan, setPlan] = React.useState<"basic" | "pro">("pro");
  const [currentPlanTier, setCurrentPlanTier] = React.useState<string | null>(
    null,
  );
  const [currentPlanInterval, setCurrentPlanInterval] = React.useState<
    "month" | "year" | null
  >(null);
  const [minimumRosterModels, setMinimumRosterModels] =
    React.useState(MIN_ROSTER_MODELS);
  const [rosterModels, setRosterModels] = React.useState(DEFAULT_ROSTER_MODELS);
  const [rosterInput, setRosterInput] = React.useState(
    String(DEFAULT_ROSTER_MODELS),
  );
  const [hasIrlBookingAddon, setHasIrlBookingAddon] = React.useState(false);
  const [includeIrlBookingInPlan, setIncludeIrlBookingInPlan] =
    React.useState(false);
  const [pendingPlanChange, setPendingPlanChange] = React.useState<{
    plan: "basic" | "pro";
    interval: "month" | "year";
    rosterModels: number;
    includeIrlBooking: boolean;
  } | null>(null);
  const [checkingOut, setCheckingOut] = React.useState(false);
  const [checkingOutIrlAddon, setCheckingOutIrlAddon] = React.useState(false);
  const isAgencyUser = profile?.role === "agency";
  const profileLoading = initialized && authenticated && !profile;

  const rosterRateBasic =
    billingInterval === "year" ? BASIC_ROSTER_RATE * 0.8 : BASIC_ROSTER_RATE;
  const rosterRatePro =
    billingInterval === "year" ? PRO_ROSTER_RATE * 0.8 : PRO_ROSTER_RATE;
  const rosterCostBasic = Math.round(rosterModels * rosterRateBasic);
  const rosterCostPro = Math.round(rosterModels * rosterRatePro);
  const irlBookingCost = Math.round(
    billingInterval === "year" ? IRL_BOOKING_COST * 0.8 : IRL_BOOKING_COST,
  );
  const shouldBillIrlBookingInPlan =
    includeIrlBookingInPlan && !hasIrlBookingAddon;
  const selectedIrlBookingCost = shouldBillIrlBookingInPlan
    ? irlBookingCost
    : 0;
  const basePlanBasic = Math.round(
    billingInterval === "year"
      ? BASIC_BASE_PLAN_COST * 0.8
      : BASIC_BASE_PLAN_COST,
  );
  const basePlanPro = Math.round(
    billingInterval === "year" ? PRO_BASE_PLAN_COST * 0.8 : PRO_BASE_PLAN_COST,
  );
  const totalMonthlyBasic =
    basePlanBasic + rosterCostBasic + selectedIrlBookingCost;
  const totalMonthlyPro = basePlanPro + rosterCostPro + selectedIrlBookingCost;
  const requiresContactSales = rosterModels > MAX_ROSTER_MODELS;
  const sliderMin = requiresContactSales ? rosterModels : minimumRosterModels;
  const maxRosterModels = requiresContactSales
    ? rosterModels
    : MAX_ROSTER_MODELS;
  const irlAddonLineItemLabel = hasIrlBookingAddon
    ? "Already active"
    : shouldBillIrlBookingInPlan
      ? `+$${formatNumber(irlBookingCost)}`
      : "Not selected";

  const syncRosterModels = (nextValue: number) => {
    const clamped = clampRosterModels(
      nextValue,
      minimumRosterModels,
      maxRosterModels,
    );
    setRosterModels(clamped);
    setRosterInput(String(clamped));
  };

  React.useEffect(() => {
    async function fetchCurrentPlan() {
      if (!initialized || !authenticated || !isAgencyUser) {
        return;
      }

      try {
        const resp = (await getAgencyProfile()) as any;
        const tier = resp?.plan_tier || "free";
        setCurrentPlanTier(tier);
        setCurrentPlanInterval(resp?.plan_interval || "month");
        if (tier === "basic" || tier === "pro") {
          setPlan(tier);
        }
        setMinimumRosterModels(MIN_ROSTER_MODELS);
        setRosterModels(DEFAULT_ROSTER_MODELS);
        setRosterInput(String(DEFAULT_ROSTER_MODELS));
        setHasIrlBookingAddon(
          parseBooleanFlag(resp?.addon_irl_booking_enabled),
        );
        setIncludeIrlBookingInPlan(false);
      } catch (e) {
        console.error("Failed to fetch agency profile:", e);
      }
    }
    void fetchCurrentPlan();
  }, [authenticated, initialized, isAgencyUser]);

  React.useEffect(() => {
    if (!initialized || (authenticated && isAgencyUser)) {
      return;
    }

    setCurrentPlanTier(null);
    setCurrentPlanInterval(null);
    setMinimumRosterModels(MIN_ROSTER_MODELS);
    setRosterModels(DEFAULT_ROSTER_MODELS);
    setRosterInput(String(DEFAULT_ROSTER_MODELS));
    setHasIrlBookingAddon(false);
    setIncludeIrlBookingInPlan(false);
  }, [authenticated, initialized, isAgencyUser]);

  React.useEffect(() => {
    const key = "agency_billing_interval";
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
    if (!success && !checkoutSessionId) return;
    if (canceled) return;

    const nextParams = new URLSearchParams({
      tab: "settings",
      subTab: "General Settings",
      billing_sync: "1",
    });
    if (checkoutSessionId) {
      nextParams.set("session_id", checkoutSessionId);
    }

    navigate(`/AgencyDashboard?${nextParams.toString()}`, {
      replace: true,
    });
  }, [canceled, checkoutSessionId, navigate, success]);

  const onContact = () => navigate("/SalesInquiry");

  const rosterRate = plan === "basic" ? rosterRateBasic : rosterRatePro;
  const rosterCost = plan === "basic" ? rosterCostBasic : rosterCostPro;
  const currentPlanRank = planRank(currentPlanTier);
  const selectedPlanRank = planRank(plan);
  const isDowngradeSelection =
    (currentPlanTier === "pro" && plan === "basic") ||
    (currentPlanTier === plan &&
      currentPlanInterval === "year" &&
      billingInterval === "month");
  const planChangeRaisesCost =
    currentPlanTier !== null &&
    currentPlanTier !== "free" &&
    (selectedPlanRank > currentPlanRank ||
      (currentPlanTier === plan &&
        currentPlanInterval === "month" &&
        billingInterval === "year"));

  const onCheckout = async (planOverride?: "basic" | "pro") => {
    const targetPlan = planOverride || plan;
    if (requiresContactSales) {
      onContact();
      return;
    }
    if (!initialized || profileLoading) {
      return;
    }
    if (!authenticated) {
      const next = `${location.pathname}${location.search}${location.hash}`;
      const loginParams = new URLSearchParams({
        next,
        role: "agency",
      });
      toast({
        title: "Sign in required",
        description:
          "Sign in with your agency account to continue to checkout.",
      });
      navigate(`/Login?${loginParams.toString()}`);
      return;
    }
    if (!isAgencyUser) {
      toast({
        title: "Agency account required",
        description: "Use an agency account to start a subscription checkout.",
        variant: "destructive",
      });
      return;
    }

    setCheckingOut(true);
    try {
      const isSwitchOrUpgrade =
        currentPlanTier !== "free" &&
        currentPlanTier !== null &&
        (targetPlan !== currentPlanTier || billingInterval !== currentPlanInterval);

      if (isSwitchOrUpgrade) {
        const resp = await changeAgencySubscriptionPlan({
          plan: targetPlan,
          roster_models: rosterModels,
          interval: billingInterval,
          addons: {
            irl_booking: shouldBillIrlBookingInPlan,
            deepfake_protection_models: 0,
            additional_team_members: 0,
          },
        });
        const nextPlanTier = String((resp as any)?.plan_tier || targetPlan);
        setCurrentPlanTier(nextPlanTier);
        setCurrentPlanInterval(billingInterval);
        setPlan(targetPlan);
        setHasIrlBookingAddon(
          Boolean((resp as any)?.addon_irl_booking_enabled) ||
            shouldBillIrlBookingInPlan,
        );
        setIncludeIrlBookingInPlan(false);
        toast({
          title: "Subscription updated",
          description:
            billingInterval === "year"
              ? "Your upgrade was confirmed and annual billing is now active."
              : "Your upgrade was confirmed and monthly billing is now active.",
        });
        setPendingPlanChange(null);
        return;
      }

      const resp = await createAgencySubscriptionCheckout({
        plan: targetPlan,
        roster_models: rosterModels,
        interval: billingInterval,
        addons: {
          irl_booking: shouldBillIrlBookingInPlan,
          deepfake_protection_models: 0,
          additional_team_members: 0,
        },
      });
      const url = (resp as any)?.checkout_url as string | undefined;
      if (!url) {
        toast({
          title: "Checkout failed",
          description: "No checkout URL returned.",
          variant: "destructive",
        });
        return;
      }
      window.location.href = url;
    } catch (e: any) {
      const msg = String(e?.message || e || "");
      const contactSales = msg.match(
        /enterprise_contact_sales_roster_limit(?::(\d+))?/,
      );
      if (contactSales) {
        const rosterOverLimit = Number.parseInt(contactSales[1] || "", 10);
        if (Number.isFinite(rosterOverLimit) && rosterOverLimit > 0) {
          setMinimumRosterModels(rosterOverLimit);
          setRosterModels(rosterOverLimit);
          setRosterInput(String(rosterOverLimit));
        }
        toast({
          title: "Contact Sales",
          description:
            "Self-serve plans support 2 to 1,000 models. Larger rosters use custom pricing.",
        });
        onContact();
        return;
      }
      const rosterMismatch = msg.match(
        /roster_models_below_current_roster:(\d+)/,
      );
      if (rosterMismatch) {
        const currentRoster = Math.max(
          minimumRosterModels,
          Number.parseInt(rosterMismatch[1], 10) || minimumRosterModels,
        );
        setMinimumRosterModels(currentRoster);
        setRosterModels(currentRoster);
        setRosterInput(String(currentRoster));
        toast({
          title: "Roster updated",
          description: `Your current roster is ${formatNumber(currentRoster)} models. Pricing has been updated to match.`,
        });
        return;
      }
      if (msg.includes("downgrade_not_allowed")) {
        toast({
          title: "Downgrades unavailable",
          description:
            "This billing flow only supports upgrades. Contact support if you need a downgrade.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Checkout failed",
        description: msg || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCheckingOut(false);
    }
  };

  const onCheckoutIrlAddon = async () => {
    if (!initialized || profileLoading) {
      return;
    }
    if (hasIrlBookingAddon) {
      toast({
        title: "IRL Booking already active",
        description: "This agency account already has the IRL Booking add-on.",
      });
      return;
    }
    if (!authenticated) {
      const next = `${location.pathname}${location.search}${location.hash}`;
      const loginParams = new URLSearchParams({
        next,
        role: "agency",
      });
      toast({
        title: "Sign in required",
        description:
          "Sign in with your agency account to buy the IRL Booking add-on.",
      });
      navigate(`/Login?${loginParams.toString()}`);
      return;
    }
    if (!isAgencyUser) {
      toast({
        title: "Agency account required",
        description: "Use an agency account to buy the IRL Booking add-on.",
        variant: "destructive",
      });
      return;
    }

    setCheckingOutIrlAddon(true);
    try {
      const resp = await createAgencyIrlBookingAddonCheckout();
      const url = (resp as any)?.checkout_url as string | undefined;
      if (!url) {
        toast({
          title: "Checkout failed",
          description: "No checkout URL returned.",
          variant: "destructive",
        });
        return;
      }
      window.location.href = url;
    } catch (e: any) {
      if (e?.status === 409) {
        setHasIrlBookingAddon(true);
        setIncludeIrlBookingInPlan(false);
        toast({
          title: "IRL Booking already active",
          description:
            "This agency account already has the IRL Booking add-on.",
        });
        return;
      }
      toast({
        title: "Checkout failed",
        description: String(e?.message || e || "Please try again."),
        variant: "destructive",
      });
    } finally {
      setCheckingOutIrlAddon(false);
    }
  };

  const onBack = () => {
    navigate(isAgencyUser ? "/AgencyDashboard" : "/");
  };

  const getPlanCtaLabel = (targetPlan: "basic" | "pro") => {
    if (!initialized || profileLoading) {
      return "Loading...";
    }
    if (!authenticated) {
      return targetPlan === "basic" ? "Sign in for Basic" : "Sign in for Pro";
    }
    if (!isAgencyUser) {
      return "Agency account required";
    }
    if (currentPlanTier === "pro" && targetPlan === "basic") {
      return "Downgrade unavailable";
    }
    if (
      currentPlanTier === targetPlan &&
      currentPlanInterval === "year" &&
      billingInterval === "month"
    ) {
      return "Monthly downgrade unavailable";
    }
    if (requiresContactSales) {
      return "Contact Sales";
    }

    const isCurrentTier = currentPlanTier === targetPlan;
    const isCurrentInterval = currentPlanInterval === billingInterval;

    if (isCurrentTier && isCurrentInterval) return "Current Plan";

    if (currentPlanTier === "free" || currentPlanTier === null) {
      return targetPlan === "basic" ? "Checkout Basic" : "Checkout Pro";
    }

    if (targetPlan === "pro" && currentPlanTier === "basic") {
      return "Upgrade to Pro";
    }
    if (targetPlan === "basic" && currentPlanTier === "pro") {
      return "Downgrade to Basic";
    }

    if (isCurrentTier && !isCurrentInterval) {
      return billingInterval === "year"
        ? "Switch to Annual"
        : "Switch to Monthly";
    }

    return "Change Plan";
  };

  const checkoutDisabled =
    checkingOut || checkingOutIrlAddon || !initialized || profileLoading;
  const irlAddonCheckoutDisabled =
    checkingOut || checkingOutIrlAddon || !initialized || profileLoading;
  const alreadySubscribedToPlan =
    !requiresContactSales &&
    ((plan === "basic" &&
      currentPlanTier === "basic" &&
      currentPlanInterval === billingInterval) ||
      (plan === "pro" &&
        currentPlanTier === "pro" &&
        currentPlanInterval === billingInterval));
  const footerCtaLabel = (() => {
    if (!initialized || profileLoading) {
      return "Loading...";
    }
    if (requiresContactSales) {
      return "Contact Sales";
    }
    if (!authenticated) {
      return "Sign in to Checkout";
    }
    if (!isAgencyUser) {
      return "Agency account required";
    }
    if (isDowngradeSelection) {
      return "Downgrade unavailable";
    }
    if (alreadySubscribedToPlan) {
      return "Already Subscribed";
    }
    return checkingOut
      ? "Processing..."
      : currentPlanTier && currentPlanTier !== "free"
        ? "Review Upgrade"
        : "Get Started";
  })();
  const irlAddonCtaLabel = (() => {
    if (!initialized || profileLoading) {
      return "Loading...";
    }
    if (hasIrlBookingAddon) {
      return "Already Active";
    }
    if (!authenticated) {
      return "Sign in to Buy";
    }
    if (!isAgencyUser) {
      return "Agency account required";
    }
    return checkingOutIrlAddon ? "Redirecting..." : "Buy Separately";
  })();

  const onSelectPlan = async (targetPlan: "basic" | "pro") => {
    if (requiresContactSales) {
      onContact();
      return;
    }
    if (currentPlanTier === "pro" && targetPlan === "basic") {
      toast({
        title: "Downgrades unavailable",
        description:
          "Basic downgrades are not available in self-serve. Contact support if you need plan changes downward.",
      });
      return;
    }
    if (
      currentPlanTier === targetPlan &&
      currentPlanInterval === "year" &&
      billingInterval === "month"
    ) {
      toast({
        title: "Monthly downgrade unavailable",
        description:
          "Annual plans cannot be switched down to monthly in self-serve. Contact support if you need help.",
      });
      return;
    }
    if (
      currentPlanTier === targetPlan &&
      currentPlanInterval === billingInterval
    ) {
      return;
    }
    setPlan(targetPlan);
    if (currentPlanTier && currentPlanTier !== "free") {
      setPendingPlanChange({
        plan: targetPlan,
        interval: billingInterval,
        rosterModels,
        includeIrlBooking: shouldBillIrlBookingInPlan,
      });
      return;
    }
    await onCheckout(targetPlan);
  };

  return (
    <div className="min-h-screen bg-[#F6F3EF] text-[#1B1C23]">
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-24">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-black tracking-tight font-display">
            Simple, transparent pricing
          </h1>
          <p className="text-gray-500 mt-4 text-lg">
            Start with licensing. Add what you need. Scale when you're ready.
          </p>

          <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
            <Badge variant="outline" className="bg-white/70">
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
                      "agency_billing_interval",
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
                className={`h-5 w-10 rounded-full border border-[#D9E4F1] p-0.5 transition-colors cursor-pointer ${
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
                      "agency_billing_interval",
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
                      "agency_billing_interval",
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
                      "agency_billing_interval",
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
            {!authenticated && initialized && (
              <Badge variant="outline" className="bg-white/70">
                Public pricing preview
              </Badge>
            )}
            {success && (
              <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">
                Subscription started
              </Badge>
            )}
            {canceled && (
              <Badge variant="outline" className="bg-white/70">
                Checkout canceled
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-12">
          <Card className="rounded-[28px] border border-gray-200 bg-white p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <div className="text-2xl font-black font-display">
                  How many models on your roster?
                </div>
                <div className="text-gray-500 mt-1">
                  {requiresContactSales
                    ? `Self-serve supports 2 to 1,000 models. Your current setup is ${formatNumber(rosterModels)}, so pricing goes through Sales.`
                    : minimumRosterModels > MIN_ROSTER_MODELS
                      ? `Minimum ${formatNumber(minimumRosterModels)} based on your active roster.`
                      : "Choose a self-serve roster size between 2 and 1,000."}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={rosterInput}
                  disabled={requiresContactSales}
                  onChange={(event) => {
                    const nextValue = event.target.value.replace(/[^\d]/g, "");
                    setRosterInput(nextValue);
                    const parsed = parsePositiveInteger(nextValue);
                    if (parsed == null) return;
                    setRosterModels(
                      clampRosterModels(
                        parsed,
                        minimumRosterModels,
                        maxRosterModels,
                      ),
                    );
                  }}
                  onBlur={() => setRosterInput(String(rosterModels))}
                  aria-label="Roster size"
                  className="h-16 w-32 rounded-2xl border-gray-200 bg-white text-center text-3xl font-black font-display"
                />
                <div className="text-gray-400">models</div>
              </div>
            </div>

            <div className="mt-8">
              <Slider
                value={[rosterModels]}
                min={sliderMin}
                max={maxRosterModels}
                step={1}
                disabled={requiresContactSales}
                onValueChange={(value) =>
                  syncRosterModels(value[0] ?? minimumRosterModels)
                }
                aria-label="Roster size slider"
              />
              <div className="mt-3 flex items-center justify-between text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                <span>{formatNumber(sliderMin)} min</span>
                <span>{formatNumber(maxRosterModels)} max</span>
              </div>
            </div>

            <div className="text-center text-[#4B4AE6] font-black mt-6 font-display">
              {requiresContactSales
                ? "More than 1,000 models requires custom pricing."
                : `${formatNumber(rosterModels)} models × $${rosterRate}/mo = $${formatNumber(rosterCost)}/mo ${billingInterval === "year" ? "(billed annually)" : ""}`}
            </div>
          </Card>
        </div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="rounded-[28px] border border-gray-200 bg-white p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-3xl font-black font-display">Basic</div>
                <div className="text-gray-500 mt-1">
                  Get started with licensing
                </div>
              </div>
              <Badge className="bg-amber-100 text-amber-700 border border-amber-200">
                10% fee
              </Badge>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row sm:items-end gap-2">
              <div className="text-6xl font-black font-display">
                ${formatNumber(totalMonthlyBasic)}
              </div>
              <div className="text-gray-500 font-bold pb-2">
                /mo
                {billingInterval === "year" && (
                  <div className="text-emerald-600 text-sm font-bold mt-0.5">
                    Billed annually (20% discount applied)
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 text-gray-500 font-medium">
              <div className="flex justify-between">
                <span>Base plan</span>
                <span>${formatNumber(basePlanBasic)}</span>
              </div>
              <div className="flex justify-between">
                <span>
                  {formatNumber(rosterModels)} models × ${rosterRateBasic}
                </span>
                <span>${formatNumber(rosterCostBasic)}</span>
              </div>
              <div className="flex justify-between">
                <span>IRL Booking add-on</span>
                <span>{irlAddonLineItemLabel}</span>
              </div>
            </div>

            <div className="mt-8">
              <div className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-400">
                Included
              </div>
              <div className="mt-4 space-y-3 text-gray-700 font-medium">
                {[
                  "Roster Management & Performance Tiers",
                  "Licensing Requests",
                  "Active Licenses",
                  "License Templates",
                  "Basic Analytics Dashboard",
                  "Invoice Generation & Management",
                  "Payment Tracking",
                  "Talent Statements",
                ].map((label) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="mt-[2px] w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5 text-gray-700" />
                    </div>
                    <div className="leading-snug">{label}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 text-amber-700 font-bold text-sm">
                10% fee applied on all licensing bookings
              </div>
            </div>

            <div className="mt-8">
              <Button
                type="button"
                className={`w-full h-12 rounded-2xl font-black ${
                  currentPlanTier === "basic"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 cursor-default hover:bg-emerald-50"
                    : ""
                }`}
                variant={plan === "basic" ? "default" : "outline"}
                onClick={() => {
                  void onSelectPlan("basic");
                }}
                disabled={
                  checkoutDisabled ||
                  (!requiresContactSales &&
                    currentPlanTier === "basic" &&
                    currentPlanInterval === billingInterval) ||
                  (!requiresContactSales && currentPlanTier === "pro")
                }
              >
                {currentPlanTier === "basic" &&
                currentPlanInterval === billingInterval ? (
                  <span className="flex items-center gap-2">
                    <Check className="w-5 h-5" />
                    Current Plan
                  </span>
                ) : (
                  getPlanCtaLabel("basic")
                )}
              </Button>
            </div>
          </Card>

          <Card className="rounded-[28px] border border-gray-200 bg-[#0F1225] text-white p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-black font-display">Pro</div>
                  <Badge className="bg-[#4B4AE6] text-white border border-[#4B4AE6]">
                    Most Popular
                  </Badge>
                </div>
                <div className="text-white/70 mt-1">Full licensing power</div>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">
                5% fee
              </Badge>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row sm:items-end gap-2">
              <div className="text-6xl font-black font-display">
                ${formatNumber(totalMonthlyPro)}
              </div>
              <div className="text-white/60 font-bold pb-2">
                /mo
                {billingInterval === "year" && (
                  <div className="text-emerald-400 text-sm font-bold mt-0.5">
                    Billed annually (20% discount applied)
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 text-white/70 font-medium">
              <div className="flex justify-between">
                <span>Base plan</span>
                <span>${formatNumber(basePlanPro)}</span>
              </div>
              <div className="flex justify-between">
                <span>
                  {formatNumber(rosterModels)} models × ${rosterRatePro}
                </span>
                <span>${formatNumber(rosterCostPro)}</span>
              </div>
              <div className="flex justify-between">
                <span>IRL Booking add-on</span>
                <span>{irlAddonLineItemLabel}</span>
              </div>
            </div>

            <div className="mt-8">
              <div className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">
                Everything in Basic, plus
              </div>
              <div className="mt-4 space-y-3 text-white/80 font-medium">
                {[
                  "Advanced Analytics",
                  "Royalties & Payouts Dashboard",
                  "Financial Reports & Expense Tracking",
                  "Connect Bank Account",
                ].map((label) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="mt-[2px] w-5 h-5 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="leading-snug">{label}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 text-emerald-300 font-bold text-sm">
                Only 5% fee on licensing bookings
              </div>
            </div>

            <div className="mt-8">
              <Button
                type="button"
                className={`w-full h-12 rounded-2xl font-black ${
                  currentPlanTier === "pro"
                    ? "bg-white/10 text-white cursor-default hover:bg-white/10 border-white/20"
                    : "bg-[#4B4AE6] hover:bg-[#3F3EE0]"
                }`}
                onClick={() => {
                  void onSelectPlan("pro");
                }}
                disabled={
                  checkoutDisabled ||
                  (!requiresContactSales &&
                    currentPlanTier === "pro" &&
                    currentPlanInterval === billingInterval)
                }
              >
                {currentPlanTier === "pro" &&
                currentPlanInterval === billingInterval ? (
                  <span className="flex items-center gap-2">
                    <Check className="w-5 h-5" />
                    Current Plan
                  </span>
                ) : (
                  getPlanCtaLabel("pro")
                )}
              </Button>
            </div>
          </Card>
        </div>

        <div className="mt-12">
          <div className="text-center text-3xl font-black font-display">
            Add-Ons
          </div>
          <div className="text-center text-gray-500 mt-2">
            Already have booking software? No problem — Likelee works as a
            standalone licensing platform. Add what you need.
          </div>

          <div className="mt-8 space-y-6">
            <Card className="rounded-[28px] border border-gray-200 bg-white p-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="text-2xl font-black font-display">
                    IRL Booking Software
                  </div>
                  <div className="text-gray-500 mt-1">
                    Manage real-world gigs alongside your licensing income, and
                    choose whether to add it to a plan or buy it separately.
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 rounded-full border border-gray-200 bg-gray-50 px-4 py-2">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">
                      {hasIrlBookingAddon
                        ? "Active"
                        : includeIrlBookingInPlan
                          ? "In Plan"
                          : "Off"}
                    </span>
                    <Switch
                      checked={hasIrlBookingAddon || includeIrlBookingInPlan}
                      disabled={hasIrlBookingAddon}
                      onCheckedChange={setIncludeIrlBookingInPlan}
                      aria-label="Toggle IRL Booking add-on in plan checkout"
                    />
                  </div>
                  <div className="text-xl font-black text-gray-900 font-display flex flex-col items-end">
                    <div>
                      +${formatNumber(irlBookingCost)}
                      <span className="text-gray-400 text-sm ml-1">/mo</span>
                    </div>
                    {billingInterval === "year" && (
                      <div className="text-emerald-500 text-xs font-bold mt-0.5">
                        Billed annually (20% discount applied)
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-6 grid gap-3 text-sm text-gray-600 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                  Unlocks IRL mode in the agency dashboard.
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                  Enables scouting, client CRM, bookings, accounting, and
                  Calendly integration.
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                  {hasIrlBookingAddon
                    ? "Already active on this agency account. Plan checkout will not charge it again."
                    : "Use the toggle to include it in the selected plan checkout."}
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                  Buy it as a standalone monthly subscription if you do not want
                  it bundled into the plan checkout.
                </div>
              </div>
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-sm text-gray-500">
                  <div className="font-bold">
                    Standalone price: ${formatNumber(irlBookingCost)}/mo
                  </div>
                  {billingInterval === "year" && (
                    <div className="text-emerald-500 text-xs font-bold mt-0.5">
                      (Billed annually, 20% discount applied)
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant={hasIrlBookingAddon ? "outline" : "default"}
                  className="rounded-2xl font-black"
                  disabled={irlAddonCheckoutDisabled || hasIrlBookingAddon}
                  onClick={() => {
                    void onCheckoutIrlAddon();
                  }}
                >
                  {irlAddonCtaLabel}
                </Button>
              </div>
            </Card>

            <Card className="rounded-[28px] border border-gray-200 bg-white p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-2xl font-black font-display">
                    Deepfake Detection & Protection
                  </div>
                  <div className="text-gray-500 mt-1">
                    Track facial usage and unauthorized use of your models
                    across the web
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="bg-white/70">
                    Coming Soon
                  </Badge>
                </div>
              </div>
            </Card>

            <Card className="rounded-[28px] border border-gray-200 bg-white p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-2xl font-black font-display">
                    Additional Team Members
                  </div>
                  <div className="text-gray-500 mt-1">
                    Give your team access to the dashboard — bookers, scouts,
                    account managers
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="bg-white/70">
                    Coming Soon
                  </Badge>
                </div>
              </div>
            </Card>

            <Card className="rounded-[28px] border border-amber-200 bg-amber-50 p-6">
              <div className="text-amber-900 font-bold">
                Deepfake Detection & Protection is an add-on.
              </div>
              <div className="text-amber-800 mt-1">
                Add it when you need it.
              </div>
            </Card>
          </div>
        </div>

        <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="text-gray-500 font-bold">Estimated total</div>
            <div className="text-4xl font-black font-display">
              {requiresContactSales
                ? "Custom pricing"
                : `$${formatNumber(
                    plan === "basic" ? totalMonthlyBasic : totalMonthlyPro,
                  )}/mo ${billingInterval === "year" ? "(billed annually)" : ""}`}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl"
              onClick={onBack}
            >
              {isAgencyUser ? "Back to Dashboard" : "Back to Home"}
            </Button>
            <Button
              type="button"
              className="rounded-2xl font-black bg-[#4B4AE6] hover:bg-[#3F3EE0]"
              disabled={
                checkoutDisabled || alreadySubscribedToPlan || isDowngradeSelection
              }
              onClick={() => {
                if (requiresContactSales) {
                  onContact();
                  return;
                }
                void onSelectPlan(plan);
              }}
            >
              {footerCtaLabel}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        <div className="mt-10">
          <Card className="rounded-[28px] border border-gray-200 bg-white p-8">
            <div className="flex items-center justify-between gap-6 flex-wrap">
              <div>
                <div className="text-2xl font-black font-display">
                  Enterprise
                </div>
                <div className="text-gray-500 mt-1">
                  Custom storage, security, SLAs, onboarding, integrations, and
                  bespoke billing support for agencies with more than 1,000
                  models.
                </div>
              </div>
              <Button
                className="rounded-2xl font-black"
                variant="outline"
                onClick={onContact}
              >
                Contact Sales
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <Dialog
        open={pendingPlanChange !== null}
        onOpenChange={(open) => {
          if (!open && !checkingOut) {
            setPendingPlanChange(null);
          }
        }}
      >
        <DialogContent className="max-w-xl rounded-[28px] border border-gray-200 bg-white p-8">
          <DialogHeader className="text-left">
            <Badge className="w-fit border border-amber-200 bg-amber-100 text-amber-700">
              Payment confirmation
            </Badge>
            <DialogTitle className="mt-3 text-2xl font-black font-display text-[#1B1C23]">
              Confirm your paid upgrade
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-6 text-gray-600">
              This change updates your active Stripe subscription immediately.
              Stripe will apply prorated credit for unused time on your current
              plan and charge your saved payment method for the upgraded plan
              now.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 rounded-[24px] border border-[#D9E4F1] bg-[#F6F8FB] p-5">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-bold text-gray-500">Current plan</span>
              <span className="font-black text-[#1B1C23]">
                {describePlan(
                  currentPlanTier === "pro" ? "pro" : "basic",
                  currentPlanInterval || "month",
                )}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-4 text-sm">
              <span className="font-bold text-gray-500">New plan</span>
              <span className="font-black text-[#1B1C23]">
                {pendingPlanChange
                  ? describePlan(
                      pendingPlanChange.plan,
                      pendingPlanChange.interval,
                    )
                  : ""}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-4 text-sm">
              <span className="font-bold text-gray-500">Roster</span>
              <span className="font-black text-[#1B1C23]">
                {pendingPlanChange
                  ? `${formatNumber(pendingPlanChange.rosterModels)} models`
                  : ""}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-4 text-sm">
              <span className="font-bold text-gray-500">IRL Booking</span>
              <span className="font-black text-[#1B1C23]">
                {hasIrlBookingAddon
                  ? "Already active"
                  : pendingPlanChange?.includeIrlBooking
                    ? "Included in upgrade"
                    : "Not included"}
              </span>
            </div>
          </div>

          <div className="mt-5 rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
            <div className="font-black">
              {planChangeRaisesCost
                ? "Your saved payment method will be charged immediately if you continue."
                : "Your subscription will be updated immediately if you continue."}
            </div>
            <div className="mt-2">
              By confirming, you authorize Likelee to switch your existing
              subscription to the selected plan and billing interval.
            </div>
          </div>

          <DialogFooter className="mt-8 flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl"
              disabled={checkingOut}
              onClick={() => setPendingPlanChange(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-2xl font-black bg-[#4B4AE6] hover:bg-[#3F3EE0]"
              disabled={checkingOut || !pendingPlanChange}
              onClick={() => {
                if (!pendingPlanChange) return;
                void onCheckout(pendingPlanChange.plan);
              }}
            >
              {checkingOut ? "Processing payment..." : "Confirm and Pay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
