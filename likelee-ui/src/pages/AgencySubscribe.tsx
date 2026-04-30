import React from "react";
import { motion } from "framer-motion";
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
import { ArrowRight, Check, Gift } from "lucide-react";
import {
  changeAgencySubscriptionPlan,
  createAgencyBillingPortal,
  createAgencyIrlBookingAddonCheckout,
  createAgencyStudioAddonCheckout,
  createOrUpdateAgencySeatAddon,
  createAgencySubscriptionCheckout,
  getAgencySeatBreakdown,
  getAgencyProfile,
} from "@/api/functions";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useAuth } from "@/auth/AuthProvider";
import { useRef } from "react";

const DEFAULT_ROSTER_MODELS = 10;
const MIN_ROSTER_MODELS = 2;
const MAX_ROSTER_MODELS = 1000;
const BASIC_BASE_PLAN_COST = 399;
const PRO_BASE_PLAN_COST = 489;
const BASIC_ROSTER_RATE = 5;
const PRO_ROSTER_RATE = 10;
const IRL_BOOKING_COST = 489;
const STUDIO_ADDON_INITIAL_CREDITS = 2000;

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
  const postSignup = searchParams.get("post_signup") === "1";

  const [billingInterval, setBillingInterval] = React.useState<
    "month" | "year"
  >("month");

  const [plan, setPlan] = React.useState<"basic" | "pro">("pro");
  const [currentPlanTier, setCurrentPlanTier] = React.useState<string | null>(
    null,
  );
  const [currentTrialEndsAt, setCurrentTrialEndsAt] = React.useState<
    string | null
  >(null);
  const [currentPlanInterval, setCurrentPlanInterval] = React.useState<
    "month" | "year" | null
  >(null);
  const [currentSeatsLimit, setCurrentSeatsLimit] = React.useState(
    DEFAULT_ROSTER_MODELS,
  );
  const [minimumRosterModels, setMinimumRosterModels] =
    React.useState(MIN_ROSTER_MODELS);
  const [rosterModels, setRosterModels] = React.useState(DEFAULT_ROSTER_MODELS);
  const [rosterInput, setRosterInput] = React.useState(
    String(DEFAULT_ROSTER_MODELS),
  );
  const [hasIrlBookingAddon, setHasIrlBookingAddon] = React.useState(false);
  const [hasStudioAddon, setHasStudioAddon] = React.useState(false);
  const [includeIrlBookingInPlan, setIncludeIrlBookingInPlan] =
    React.useState(false);
  const includeSeatsInPlan = true;
  const [pendingPlanChange, setPendingPlanChange] = React.useState<{
    plan: "basic" | "pro";
    interval: "month" | "year";
    rosterModels: number;
    includeIrlBooking: boolean;
    includeSeatsInPlan: boolean;
  } | null>(null);
  const [checkingOut, setCheckingOut] = React.useState(false);
  const [checkingOutIrlAddon, setCheckingOutIrlAddon] = React.useState(false);
  const [checkingOutStudioAddon, setCheckingOutStudioAddon] =
    React.useState(false);
  const [checkingOutSeats, setCheckingOutSeats] = React.useState(false);
  const [seatBreakdownOpen, setSeatBreakdownOpen] = React.useState(false);
  const [seatBreakdownLoading, setSeatBreakdownLoading] = React.useState(false);
  const [seatAddonModalOpen, setSeatAddonModalOpen] = React.useState(false);
  const [seatBreakdown, setSeatBreakdown] = React.useState<{
    total_active_seats: number;
    annual_seats: number;
    monthly_seats: number;
    items: Array<{
      source: "in_plan" | "seat_addon";
      interval: "month" | "year";
      seats: number;
      status: string;
      subscription_id: string;
      current_period_start?: string | null;
      current_period_end?: string | null;
    }>;
  } | null>(null);
  const isAgencyUser = profile?.role === "agency";
  const profileLoading = initialized && authenticated && !profile;
  const hasAutoOpenedSeatBreakdown = useRef(false);

  const rosterRateBasic =
    billingInterval === "year" ? BASIC_ROSTER_RATE * 0.8 : BASIC_ROSTER_RATE;
  const rosterRatePro =
    billingInterval === "year" ? PRO_ROSTER_RATE * 0.8 : PRO_ROSTER_RATE;

  const isAgencyAuthed = initialized && authenticated && isAgencyUser;
  const hasExistingBilledSeats =
    isAgencyAuthed && currentSeatsLimit > minimumRosterModels;
  const effectiveSeatMin = hasExistingBilledSeats
    ? Math.max(minimumRosterModels, currentSeatsLimit)
    : minimumRosterModels;

  const inPlanSeatCount = includeSeatsInPlan
    ? hasExistingBilledSeats
      ? Math.max(0, rosterModels - currentSeatsLimit)
      : rosterModels
    : 0;

  const rosterCostBasic = Math.round(inPlanSeatCount * rosterRateBasic);
  const rosterCostPro = Math.round(inPlanSeatCount * rosterRatePro);

  const seatRosterRateBasic =
    billingInterval === "year" ? BASIC_ROSTER_RATE * 0.8 : BASIC_ROSTER_RATE;
  const seatRosterRatePro =
    billingInterval === "year" ? PRO_ROSTER_RATE * 0.8 : PRO_ROSTER_RATE;
  const additionalSeatCount = Math.max(0, rosterModels - currentSeatsLimit);
  const seatRosterCostBasic = Math.round(
    additionalSeatCount * seatRosterRateBasic,
  );
  const seatRosterCostPro = Math.round(additionalSeatCount * seatRosterRatePro);
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
  const totalMonthlyBasic = basePlanBasic + selectedIrlBookingCost;
  const totalMonthlyPro = basePlanPro + selectedIrlBookingCost;
  const bundledSeatCostBasic = rosterCostBasic;
  const bundledSeatCostPro = rosterCostPro;
  const displayedMonthlyBasic = totalMonthlyBasic + bundledSeatCostBasic;
  const displayedMonthlyPro = totalMonthlyPro + bundledSeatCostPro;
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

  const scrollToPlanCards = () => {
    document
      .getElementById("agency-plan-cards")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  React.useEffect(() => {
    if (hasAutoOpenedSeatBreakdown.current) return;
    const params = new URLSearchParams(location.search);
    if (params.get("seatBreakdown") !== "1") return;
    hasAutoOpenedSeatBreakdown.current = true;
    void openSeatBreakdown();
  }, [location.search]);

  const syncRosterModels = (nextValue: number) => {
    const clamped = clampRosterModels(
      nextValue,
      effectiveSeatMin,
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
        const tier = resp?.plan_tier || "none";
        const trialEndsAt = resp?.trial_ends_at
          ? String(resp.trial_ends_at)
          : null;
        const seats = Math.max(
          MIN_ROSTER_MODELS,
          Number(resp?.seats_limit || DEFAULT_ROSTER_MODELS),
        );
        setCurrentPlanTier(tier);
        setCurrentTrialEndsAt(trialEndsAt);
        setCurrentPlanInterval(resp?.plan_interval || "month");
        setCurrentSeatsLimit(seats);
        if (tier === "basic" || tier === "pro") {
          setPlan(tier);
        }
        setMinimumRosterModels(MIN_ROSTER_MODELS);
        setRosterModels(seats);
        setRosterInput(String(seats));
        setHasIrlBookingAddon(
          parseBooleanFlag(resp?.addon_irl_booking_enabled),
        );
        setHasStudioAddon(parseBooleanFlag(resp?.studio_addon_active));
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
    setCurrentTrialEndsAt(null);
    setCurrentPlanInterval(null);
    setCurrentSeatsLimit(DEFAULT_ROSTER_MODELS);
    setMinimumRosterModels(MIN_ROSTER_MODELS);
    setRosterModels(DEFAULT_ROSTER_MODELS);
    setRosterInput(String(DEFAULT_ROSTER_MODELS));
    setHasIrlBookingAddon(false);
    setHasStudioAddon(false);
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
  const seatRosterRate =
    plan === "basic" ? seatRosterRateBasic : seatRosterRatePro;
  const seatRosterCost =
    plan === "basic" ? seatRosterCostBasic : seatRosterCostPro;
  const currentPlanRank = planRank(currentPlanTier);
  const selectedPlanRank = planRank(plan);
  const seatCountChanged = rosterModels !== currentSeatsLimit;
  const isDowngradeSelection =
    (currentPlanTier === "pro" && plan === "basic") ||
    (currentPlanTier === plan &&
      currentPlanInterval === "year" &&
      billingInterval === "month");
  const alreadySubscribedToPlan =
    !requiresContactSales &&
    ((plan === "basic" &&
      currentPlanTier === "basic" &&
      currentPlanInterval === billingInterval &&
      !(includeSeatsInPlan && seatCountChanged)) ||
      (plan === "pro" &&
        currentPlanTier === "pro" &&
        currentPlanInterval === billingInterval &&
        !(includeSeatsInPlan && seatCountChanged)));
  const checkoutDisabled =
    checkingOut ||
    checkingOutIrlAddon ||
    checkingOutStudioAddon ||
    checkingOutSeats ||
    !initialized ||
    profileLoading ||
    requiresContactSales;
  const irlAddonCheckoutDisabled =
    checkingOut ||
    checkingOutIrlAddon ||
    checkingOutStudioAddon ||
    checkingOutSeats ||
    !initialized ||
    profileLoading ||
    requiresContactSales;
  const studioAddonCheckoutDisabled =
    checkingOut ||
    checkingOutIrlAddon ||
    checkingOutStudioAddon ||
    checkingOutSeats ||
    !initialized ||
    profileLoading ||
    requiresContactSales;
  const studioAddonCtaLabel = checkingOutStudioAddon
    ? "Processing..."
    : hasStudioAddon
      ? "Open Studio"
      : "Activate Studio Add-on";
  const planChangeRaisesCost =
    currentPlanTier !== null &&
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
      const resp = await createAgencySubscriptionCheckout({
        plan: targetPlan,
        roster_models: rosterModels,
        interval: billingInterval,
        start_trial: false,
        agreement_accepted: false,
        addons: {
          irl_booking: shouldBillIrlBookingInPlan,
          seats_in_plan: includeSeatsInPlan,
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

  const onCheckoutStudioAddon = async () => {
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
          "Sign in with your agency account to activate the Studio add-on.",
      });
      navigate(`/Login?${loginParams.toString()}`);
      return;
    }
    if (!isAgencyUser) {
      toast({
        title: "Agency account required",
        description: "Use an agency account to activate the Studio add-on.",
        variant: "destructive",
      });
      return;
    }

    setCheckingOutStudioAddon(true);
    try {
      const resp = await createAgencyStudioAddonCheckout();
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
      toast({
        title: "Checkout failed",
        description: String(e?.message || e || "Please try again."),
        variant: "destructive",
      });
    } finally {
      setCheckingOutStudioAddon(false);
    }
  };

  const onBack = () => {
    navigate(isAgencyUser ? "/AgencyDashboard" : "/");
  };

  const onStartTrial = async (planOverride?: "basic" | "pro") => {
    const targetPlan = planOverride || plan;
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
          "Sign in with your agency account to start a trial for your chosen plan.",
      });
      navigate(`/Login?${loginParams.toString()}`);
      return;
    }
    if (!isAgencyUser) {
      toast({
        title: "Agency account required",
        description: "Use an agency account to start a subscription trial.",
        variant: "destructive",
      });
      return;
    }

    setCheckingOut(true);
    try {
      const resp = await createAgencySubscriptionCheckout({
        plan: targetPlan,
        roster_models: rosterModels,
        interval: billingInterval,
        start_trial: true,
        agreement_accepted: true,
        addons: {
          irl_booking: shouldBillIrlBookingInPlan,
          seats_in_plan: includeSeatsInPlan,
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
      toast({
        title: "Could not start trial",
        description: String(e?.message || e || "Please try again."),
        variant: "destructive",
      });
    } finally {
      setCheckingOut(false);
    }
  };

  const openSeatAddonModal = () => {
    setSeatAddonModalOpen(true);
  };

  const openSeatBreakdown = async () => {
    setSeatBreakdownOpen(true);
    if (!initialized || profileLoading) return;
    if (!authenticated) return;
    if (!isAgencyUser) return;

    setSeatBreakdownLoading(true);
    try {
      const resp = (await getAgencySeatBreakdown()) as any;
      setSeatBreakdown({
        total_active_seats: Number(resp?.total_active_seats || 0),
        annual_seats: Number(resp?.annual_seats || 0),
        monthly_seats: Number(resp?.monthly_seats || 0),
        items: Array.isArray(resp?.items) ? resp.items : [],
      });
    } catch (e: any) {
      const msg = String(e?.message || e || "");
      toast({
        title: "Could not load seat breakdown",
        description: msg || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSeatBreakdownLoading(false);
    }
  };

  const onCheckoutSeats = async () => {
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
          "Sign in with your agency account to buy the seats add-on.",
      });
      navigate(`/Login?${loginParams.toString()}`);
      return;
    }
    if (!isAgencyUser) {
      toast({
        title: "Agency account required",
        description: "Use an agency account to buy seats separately.",
        variant: "destructive",
      });
      return;
    }
    if (!seatCountChanged) {
      toast({
        title: "Seats already up to date",
        description: "Your separate seat add-on already matches this count.",
      });
      return;
    }

    setCheckingOutSeats(true);
    try {
      const resp = await createOrUpdateAgencySeatAddon({
        seats: rosterModels,
        plan: currentPlanTier === "pro" ? "pro" : plan,
        interval: billingInterval,
      });
      const url = (resp as any)?.checkout_url as string | undefined;
      const nextSeats = Number((resp as any)?.seats_limit || rosterModels);
      const invoiceUrl = (resp as any)?.invoice_url as string | undefined;
      const invoiceStatus = (resp as any)?.invoice_status as string | undefined;
      if (url) {
        window.location.href = url;
        return;
      }
      setCurrentSeatsLimit(nextSeats);
      toast({
        title: "Seat add-on updated",
        description:
          invoiceStatus && invoiceStatus.trim().length > 0
            ? `Your separate seat billing is now set to ${formatNumber(nextSeats)} seats. Invoice status: ${invoiceStatus}.`
            : `Your separate seat billing is now set to ${formatNumber(nextSeats)} seats.`,
        action:
          invoiceUrl && invoiceUrl.trim().length > 0 ? (
            <ToastAction
              altText="View invoice"
              onClick={() =>
                window.open(invoiceUrl, "_blank", "noopener,noreferrer")
              }
            >
              View invoice
            </ToastAction>
          ) : undefined,
      });
    } catch (e: any) {
      const msg = String(e?.message || e || "");
      const contactSales = msg.match(
        /enterprise_contact_sales_roster_limit(?::(\d+))?/,
      );
      if (contactSales) {
        toast({
          title: "Contact Sales",
          description:
            "Self-serve seats support 2 to 1,000 models. Larger rosters use custom pricing.",
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
          description: `Your current roster is ${formatNumber(currentRoster)} models. The seat add-on has to cover at least that many.`,
        });
        return;
      }
      toast({
        title: "Seat checkout failed",
        description: msg || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCheckingOutSeats(false);
    }
  };

  const isPlanDisabled = (targetPlan: "basic" | "pro") => {
    const trialIsActiveNow = (trialDaysLeft ?? 0) > 0;

    // Disable: Annual -> Monthly switch (but allow during trial so user can switch interval)
    if (
      !trialIsActiveNow &&
      currentPlanTier === targetPlan &&
      currentPlanInterval === "year" &&
      billingInterval === "month"
    )
      return true;

    // Disable: already on this exact plan (during trial, allow changing interval)
    if (
      currentPlanTier === targetPlan &&
      currentPlanInterval === billingInterval
    ) {
      if (!(includeSeatsInPlan && seatCountChanged)) return true;
    }

    return false;
  };

  const openAgencyBillingPortal = async () => {
    try {
      const resp: any = await createAgencyBillingPortal();
      const url =
        resp?.checkout_url ||
        resp?.data?.checkout_url ||
        resp?.data?.url ||
        resp?.url;
      if (typeof url === "string" && url.trim()) {
        window.location.assign(url);
        return;
      }
      toast({
        title: "Billing portal unavailable",
        description: "Could not open billing portal. Please try again.",
        variant: "destructive",
      });
    } catch (e: any) {
      toast({
        title: "Billing portal unavailable",
        description: e?.message || "Could not open billing portal.",
        variant: "destructive",
      });
    }
  };

  const getPlanCtaLabel = (targetPlan: "basic" | "pro") => {
    if (!initialized || profileLoading) {
      return "Loading";
    }
    if (!authenticated) {
      return "Sign in";
    }
    if (!isAgencyUser) return "Agency account required";
    if (currentPlanTier === "none" || currentPlanTier === null) {
      return targetPlan === "basic" ? "Start Basic Trial" : "Start Pro Trial";
    }

    const trialIsActiveNow = (trialDaysLeft ?? 0) > 0;

    if (
      trialIsActiveNow &&
      currentTrialEndsAt &&
      (currentPlanTier === "basic" || currentPlanTier === "pro") &&
      currentPlanTier === targetPlan &&
      currentPlanInterval &&
      currentPlanInterval !== billingInterval
    ) {
      const days = trialDaysLeft ?? 0;
      return `Switch to ${billingInterval === "year" ? "Annual" : "Monthly"} for ${days} ${days === 1 ? "day" : "days"}`;
    }

    if (
      currentTrialEndsAt &&
      (currentPlanTier === "basic" || currentPlanTier === "pro") &&
      currentPlanTier !== targetPlan
    ) {
      const days = trialDaysLeft ?? 0;
      return `Try ${targetPlan === "basic" ? "Basic" : "Pro"} for ${days} ${days === 1 ? "day" : "days"}`;
    }

    return targetPlan === "basic" ? "Get Basic" : "Get Pro";
  };

  const getCheckoutButtonLabel = () => {
    if (!initialized || profileLoading) return "Loading";
  };

  const footerCtaLabel = (() => {
    if (!initialized || profileLoading) return "Loading...";
    if (requiresContactSales) return "Contact Sales";
    if (!authenticated) return "Sign in";
    if (!isAgencyUser) return "Agency account required";
    if (isDowngradeSelection || alreadySubscribedToPlan) return "Current Plan";
    if (checkingOut) return "Processing...";
    if (currentPlanTier === "none" || currentPlanTier === null)
      return "Get Started";
    if (includeSeatsInPlan && seatCountChanged) return "Update Plan";
    return "Upgrade Plan";
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
    // Silently ignore disabled actions (downgrade / already on plan)
    if (isPlanDisabled(targetPlan)) return;
    setPlan(targetPlan);

    const trialIsActiveNow = (trialDaysLeft ?? 0) > 0;
    const periodEndDowngrade =
      !trialIsActiveNow && currentPlanTier === "pro" && targetPlan === "basic";
    const periodEndAnnualToMonthly =
      !trialIsActiveNow &&
      currentPlanTier === targetPlan &&
      currentPlanInterval === "year" &&
      billingInterval === "month";

    if (periodEndDowngrade || periodEndAnnualToMonthly) {
      toast({
        title: "Scheduled for period end",
        description:
          "This change will take effect at the end of your current billing period. Manage it in the billing portal.",
      });
      void openAgencyBillingPortal();
      return;
    }

    const switchingIntervalDuringTrial =
      trialIsActiveNow &&
      currentTrialEndsAt &&
      (currentPlanTier === "basic" || currentPlanTier === "pro") &&
      currentPlanTier === targetPlan &&
      currentPlanInterval &&
      currentPlanInterval !== billingInterval;

    if (
      currentPlanTier === "none" ||
      currentPlanTier === null ||
      switchingIntervalDuringTrial ||
      (currentTrialEndsAt &&
        (currentPlanTier === "basic" || currentPlanTier === "pro") &&
        currentPlanTier !== targetPlan)
    ) {
      void onStartTrial(targetPlan);
      return;
    }
    void onCheckout(targetPlan);
  };

  const trialCountdown = React.useMemo(() => {
    if (!currentTrialEndsAt) return "";
    const end = new Date(currentTrialEndsAt).getTime();
    if (!Number.isFinite(end) || end <= 0) return "";
    const ms = Math.max(0, end - Date.now());
    const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
    if (days <= 0) return "Trial ended";
    return `${days} ${days === 1 ? "day" : "days"} left in trial`;
  }, [currentTrialEndsAt]);

  const trialDaysLeft = React.useMemo(() => {
    if (!currentTrialEndsAt) return null;
    const end = new Date(currentTrialEndsAt).getTime();
    if (!Number.isFinite(end) || end <= 0) return null;
    const ms = Math.max(0, end - Date.now());
    const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
    return days > 0 ? days : 0;
  }, [currentTrialEndsAt]);

  const showBasicTrialCountdown =
    !!currentTrialEndsAt &&
    (currentPlanTier === "basic" ||
      ((currentPlanTier === "none" || currentPlanTier === null) &&
        plan === "basic"));
  const showProTrialCountdown =
    !!currentTrialEndsAt &&
    (currentPlanTier === "pro" ||
      ((currentPlanTier === "none" || currentPlanTier === null) &&
        plan === "pro"));

  return (
    <div className="min-h-screen bg-[#F6F3EF] text-[#1B1C23]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-16 sm:pb-24">
        <div className="text-center">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight font-display">
            Simple, transparent pricing
          </h1>
          <p className="text-gray-500 mt-3 sm:mt-4 text-base sm:text-lg">
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
            {postSignup && !success && (
              <Badge className="bg-[#EEF4FF] text-[#17315F] border border-[#D9E4F1]">
                Finish setup by starting a trial
              </Badge>
            )}
            {canceled && (
              <Badge variant="outline" className="bg-white/70">
                Checkout canceled
              </Badge>
            )}
          </div>
        </div>

        {authenticated &&
          isAgencyUser &&
          currentPlanTier === "none" &&
          !success &&
          null}

        <div className="mt-12">
          <Card className="rounded-[28px] border border-gray-200 bg-white p-5 sm:p-8">
            <div className="flex flex-col gap-4 sm:gap-6">
              <div>
                <div className="text-xl sm:text-2xl font-black font-display">
                  How many models on your roster?
                </div>
                <div className="text-gray-500 mt-1 text-sm sm:text-base">
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
                    syncRosterModels(parsed);
                  }}
                  onBlur={() => setRosterInput(String(rosterModels))}
                  aria-label="Roster size"
                  className="h-14 sm:h-16 w-24 sm:w-32 rounded-2xl border-gray-200 bg-white text-center text-2xl sm:text-3xl font-black font-display"
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
                  syncRosterModels(value[0] ?? effectiveSeatMin)
                }
                aria-label="Roster size slider"
              />
              <div className="mt-3 flex items-center justify-between text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                <span>{formatNumber(sliderMin)} min</span>
                <span>{formatNumber(maxRosterModels)} max</span>
              </div>
            </div>

            <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-left text-[#4B4AE6] font-black font-display">
                {requiresContactSales
                  ? "More than 1,000 models requires custom pricing."
                  : `In-plan seat preview: ${formatNumber(rosterModels)} models × $${rosterRate}/mo = $${formatNumber(rosterCost)}/mo ${billingInterval === "year" ? "(billed annually)" : ""}`}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl font-black"
                onClick={openSeatAddonModal}
              >
                Buy Seats Separately
              </Button>
            </div>
          </Card>
        </div>

        <div
          id="agency-plan-cards"
          className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto"
        >
          {/* Card: Basic */}
          <Card className="rounded-2xl border-x border-b border-t-4 border-t-[#3B82F6] border-x-gray-200 border-b-gray-200 bg-white p-8 relative flex flex-col shadow-sm">
            <div className="absolute top-6 left-8 flex justify-between items-center w-[calc(100%-4rem)]">
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 font-bold text-[10px] tracking-[0.15em] rounded-full uppercase">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                </svg>
                Basic
              </span>
              <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-600 font-bold text-[10px] tracking-[0.15em] rounded-full uppercase">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  stroke="none"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                Most Popular
              </span>
            </div>

            <div className="mt-8 pt-4 flex justify-between items-start">
              <div className="pr-4">
                <div className="text-3xl font-black font-display text-gray-900">
                  Basic
                </div>
                <div className="text-gray-500 mt-2 text-sm leading-relaxed min-h-[40px]">
                  Get started with licensing
                </div>
              </div>
              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none shrink-0 font-bold text-xs px-2 py-0.5">
                10% fee
              </Badge>
            </div>

            {showBasicTrialCountdown && (
              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
                  Trial
                </div>
                <div className="mt-1 text-sm font-bold text-blue-900">
                  {trialCountdown}
                </div>
                <div className="mt-1 text-xs text-blue-800">
                  After the trial ends, you’ll be charged for the Basic plan
                  unless you cancel.
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-1">
              <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                <span className="text-5xl font-black font-display tracking-tight text-gray-900">
                  ${formatNumber(displayedMonthlyBasic)}
                </span>
                <span className="text-gray-500 font-medium pb-1 tracking-tight text-sm">
                  per month
                </span>
              </div>
              {billingInterval === "year" && (
                <div className="text-emerald-600 text-xs font-bold mt-1">
                  Billed annually (20% discount applied)
                </div>
              )}
            </div>

            <div className="mt-6 text-sm text-gray-500 font-medium space-y-2">
              <div className="flex justify-between">
                <span>Base plan</span>
                <span className="text-gray-900 font-semibold">
                  ${formatNumber(basePlanBasic)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Roster seats</span>
                <span className="text-[#3B82F6] font-semibold">
                  {`${formatNumber(inPlanSeatCount)} seats · $${formatNumber(rosterCostBasic)} in plan`}
                </span>
              </div>
              <div className="flex justify-between">
                <span>IRL Booking</span>
                <span className="text-gray-900 font-semibold">
                  {irlAddonLineItemLabel}
                </span>
              </div>
            </div>

            <div className="mt-8">
              <Button
                type="button"
                variant="outline"
                className={`w-full h-12 rounded-lg font-bold border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors ${
                  currentPlanTier === "basic" &&
                  currentPlanInterval === billingInterval &&
                  !(includeSeatsInPlan && seatCountChanged)
                    ? "bg-slate-50 text-slate-400 cursor-default"
                    : ""
                }`}
                onClick={() => {
                  void onSelectPlan("basic");
                }}
                disabled={
                  checkoutDisabled ||
                  isPlanDisabled("basic") ||
                  (!requiresContactSales &&
                    currentPlanTier === "basic" &&
                    currentPlanInterval === billingInterval) ||
                  (!requiresContactSales && currentPlanTier === "pro")
                }
              >
                {currentPlanTier === "basic" &&
                currentPlanInterval === billingInterval ? (
                  <span className="flex items-center gap-2 text-gray-500">
                    <Check className="w-5 h-5 text-gray-400" />
                    Current
                  </span>
                ) : (
                  getPlanCtaLabel("basic")
                )}
              </Button>
            </div>

            <hr className="my-8 border-gray-100" />

            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 mb-4">
              Included
            </div>
            <div className="space-y-4 flex-grow">
              {[
                "Roster Management & Performance Tiers",
                "Licensing Requests",
                "Active Licenses",
                "License Templates",
                "Invoice Generation & Management",
                "Payment Tracking",
                "Talent Statements",
                "5 team seats",
              ].map((label) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="mt-0.5 w-[18px] h-[18px] rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#00BFA5]" strokeWidth={3} />
                  </div>
                  <div className="leading-snug text-sm text-gray-600">
                    {label}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 text-[#3B82F6] font-bold text-xs uppercase tracking-wider">
              10% fee applied on all licensing bookings
            </div>
          </Card>

          {/* Card 3: Pro */}
          <Card className="rounded-2xl border-none bg-[#0B1828] text-white p-8 relative flex flex-col shadow-xl">
            <div className="absolute top-6 left-8">
              <span className="px-2 py-1 bg-[#1A2E44] text-emerald-300 font-bold text-[10px] tracking-[0.15em] rounded uppercase">
                Pro
              </span>
            </div>

            <div className="mt-8 pt-4 flex justify-between items-start">
              <div className="pr-4">
                <div className="text-3xl font-black font-display text-white">
                  Pro
                </div>
                <div className="text-gray-300 mt-2 text-sm leading-relaxed min-h-[40px]">
                  Full licensing power
                </div>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none shrink-0 font-bold text-xs px-2 py-0.5">
                5% fee
              </Badge>
            </div>

            {showProTrialCountdown && (
              <div className="mt-4 rounded-xl border border-emerald-200/40 bg-[#10263E] px-4 py-3">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-emerald-200">
                  Trial
                </div>
                <div className="mt-1 text-sm font-bold text-white">
                  {trialCountdown}
                </div>
                <div className="mt-1 text-xs text-gray-300">
                  After the trial ends, you’ll be charged for the Pro plan
                  unless you cancel.
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-1">
              <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                <span className="text-5xl font-black font-display tracking-tight text-white">
                  ${formatNumber(displayedMonthlyPro)}
                </span>
                <span className="text-gray-400 font-medium pb-1 tracking-tight text-sm">
                  per month
                </span>
              </div>
              {billingInterval === "year" && (
                <div className="text-emerald-400 text-xs font-bold mt-1">
                  Billed annually (20% discount applied)
                </div>
              )}
            </div>

            <div className="mt-6 text-sm text-gray-400 font-medium space-y-2">
              <div className="flex justify-between">
                <span>Base plan</span>
                <span className="text-white font-semibold">
                  ${formatNumber(basePlanPro)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Roster seats</span>
                <span className="text-emerald-300 font-semibold">
                  {`${formatNumber(inPlanSeatCount)} seats · $${formatNumber(rosterCostPro)} in plan`}
                </span>
              </div>
              <div className="flex justify-between">
                <span>IRL Booking</span>
                <span className="text-white font-semibold">
                  {irlAddonLineItemLabel}
                </span>
              </div>
            </div>

            <div className="mt-8">
              <Button
                type="button"
                className={`w-full h-12 rounded-lg font-bold transition-colors ${
                  currentPlanTier === "pro" &&
                  currentPlanInterval === billingInterval &&
                  !(includeSeatsInPlan && seatCountChanged)
                    ? "bg-white/10 text-white cursor-default hover:bg-white/10 border-none"
                    : "bg-white text-[#0B1828] hover:bg-gray-100 shadow-sm"
                }`}
                onClick={() => {
                  void onSelectPlan("pro");
                }}
                disabled={
                  checkoutDisabled ||
                  isPlanDisabled("pro") ||
                  (!requiresContactSales &&
                    currentPlanTier === "pro" &&
                    currentPlanInterval === billingInterval)
                }
              >
                {currentPlanTier === "pro" &&
                currentPlanInterval === billingInterval ? (
                  <span className="flex items-center gap-2 text-white">
                    <Check className="w-5 h-5 text-white" />
                    Current
                  </span>
                ) : (
                  getPlanCtaLabel("pro")
                )}
              </Button>
            </div>

            <hr className="my-8 border-white/10" />

            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-white/40 mb-4">
              Everything in Basic, plus
            </div>
            <div className="space-y-4 flex-grow">
              {[
                "Job invites & applications",
                "Direct messaging with talents",
                "Advanced Analytics",
                "Royalties & Payouts Dashboard",
                "Financial Reports & Expense Tracking",
                "Calendly integration",
                "10 team seats",
              ].map((label) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="mt-0.5 w-[18px] h-[18px] rounded-full bg-[#20C5B0] flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#0B1828]" strokeWidth={3} />
                  </div>
                  <div className="leading-snug text-sm text-gray-200">
                    {label}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              Only 5% fee on licensing bookings
            </div>
          </Card>
        </div>
        <Dialog open={seatAddonModalOpen} onOpenChange={setSeatAddonModalOpen}>
          <DialogContent className="max-w-lg rounded-[28px]">
            <DialogHeader>
              <DialogTitle className="font-display font-black text-2xl">
                Buy seats separately
              </DialogTitle>
              <DialogDescription>
                Review what you’ll pay before continuing to Stripe.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 grid gap-3 text-sm text-gray-700">
              <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                <span className="font-bold text-gray-500">
                  Current billed seats
                </span>
                <span className="font-black text-gray-900">
                  {formatNumber(currentSeatsLimit)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                <span className="font-bold text-gray-500">
                  Selected total seats
                </span>
                <span className="font-black text-gray-900">
                  {formatNumber(rosterModels)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                <span className="font-bold text-gray-500">
                  Additional seats to bill
                </span>
                <span className="font-black text-gray-900">
                  {formatNumber(additionalSeatCount)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                <span className="font-bold text-gray-500">
                  Billing interval
                </span>
                <span className="font-black text-gray-900">
                  {billingInterval === "year" ? "Annual" : "Monthly"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-[#D9E4F1] bg-[#F6F8FB] px-4 py-4">
                <span className="font-bold text-gray-500">Total</span>
                <span className="font-black text-[#1B1C23] text-lg">
                  ${formatNumber(seatRosterCost)}
                </span>
              </div>
              {billingInterval === "year" && (
                <div className="text-emerald-600 text-xs font-bold">
                  Billed annually (20% discount applied)
                </div>
              )}
              <div className="text-xs leading-5 text-gray-500">
                Seats are charged on a separate recurring Stripe subscription.
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl"
                disabled={checkingOutSeats}
                onClick={() => setSeatAddonModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-2xl font-black"
                disabled={
                  checkoutDisabled || !seatCountChanged || checkingOutSeats
                }
                onClick={() => {
                  void onCheckoutSeats();
                }}
              >
                {checkingOutSeats ? "Processing..." : "Pay"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="mt-12">
          <div className="text-center text-2xl sm:text-3xl font-black font-display">
            Add-Ons
          </div>
          <div className="text-center text-gray-500 mt-2 text-sm sm:text-base">
            Already have booking software? No problem — Likelee works as a
            standalone licensing platform. Add what you need.
          </div>

          <div className="mt-8 space-y-6">
            <Card className="rounded-[28px] border border-gray-200 bg-white p-5 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="text-xl sm:text-2xl font-black font-display">
                    IRL Booking Software
                  </div>
                  <div className="text-gray-500 mt-1 text-sm sm:text-base">
                    Manage real-world gigs alongside your licensing income, and
                    choose whether to add it to a plan or buy it separately.
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
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

            <Card className="rounded-[28px] border border-gray-200 bg-white p-5 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="text-xl sm:text-2xl font-black font-display">
                    Likelee Studio Access
                  </div>
                  <div className="text-gray-500 mt-1 text-sm sm:text-base">
                    One-time activation for your agency Studio workspace with an
                    initial wallet allocation.
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <Badge variant="outline" className="bg-white/70">
                    {hasStudioAddon ? "Active" : "One-time"}
                  </Badge>
                </div>
              </div>
              <div className="mt-6 grid gap-3 text-sm text-gray-600 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                  Grants access to{" "}
                  <span className="font-semibold">/studio</span> for this
                  agency.
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                  Includes {formatNumber(STUDIO_ADDON_INITIAL_CREDITS)} initial
                  Studio credits.
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                  Charged once. It is not a recurring monthly add-on.
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                  If already active, clicking subscribe redirects directly to
                  Studio.
                </div>
              </div>
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-sm text-gray-500">
                  <div className="font-bold">
                    Includes Studio Pro wallet plan
                  </div>
                </div>
                <Button
                  type="button"
                  className="rounded-2xl font-black"
                  disabled={studioAddonCheckoutDisabled}
                  onClick={() => {
                    void onCheckoutStudioAddon();
                  }}
                >
                  {studioAddonCtaLabel}
                </Button>
              </div>
            </Card>

            <Card className="rounded-[28px] border border-gray-200 bg-white p-5 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="text-xl sm:text-2xl font-black font-display">
                    Deepfake Detection & Protection
                  </div>
                  <div className="text-gray-500 mt-1 text-sm sm:text-base">
                    Track facial usage and unauthorized use of your models
                    across the web
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <Badge variant="outline" className="bg-white/70">
                    Coming Soon
                  </Badge>
                </div>
              </div>
            </Card>

            <Card className="rounded-[28px] border border-gray-200 bg-white p-5 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="text-xl sm:text-2xl font-black font-display">
                    Additional Team Members
                  </div>
                  <div className="text-gray-500 mt-1 text-sm sm:text-base">
                    Give your team access to the dashboard — bookers, scouts,
                    account managers
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
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

        <div className="mt-10">
          <Card className="rounded-[28px] border border-gray-200 bg-white p-5 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
              <div>
                <div className="text-xl sm:text-2xl font-black font-display">
                  Enterprise
                </div>
                <div className="text-gray-500 mt-1 text-sm sm:text-base">
                  Custom storage, security, SLAs, onboarding, integrations, and
                  bespoke billing support for agencies with more than 1,000
                  models.
                </div>
              </div>
              <Button
                className="rounded-2xl font-black shrink-0"
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
              <span className="font-bold text-gray-500">Seats add-on</span>
              <span className="font-black text-[#1B1C23]">
                {pendingPlanChange
                  ? `${formatNumber(pendingPlanChange.rosterModels)} seats in plan`
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

      <Dialog open={seatBreakdownOpen} onOpenChange={setSeatBreakdownOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Seat Breakdown</DialogTitle>
            <DialogDescription>
              Your total seats can come from annual and monthly subscriptions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">
                  Total active
                </div>
                <div className="mt-1 text-2xl font-black text-gray-900">
                  {seatBreakdownLoading
                    ? "…"
                    : formatNumber(seatBreakdown?.total_active_seats || 0)}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">
                  Annual
                </div>
                <div className="mt-1 text-2xl font-black text-gray-900">
                  {seatBreakdownLoading
                    ? "…"
                    : formatNumber(seatBreakdown?.annual_seats || 0)}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">
                  Monthly
                </div>
                <div className="mt-1 text-2xl font-black text-gray-900">
                  {seatBreakdownLoading
                    ? "…"
                    : formatNumber(seatBreakdown?.monthly_seats || 0)}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-12 gap-2 bg-gray-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-gray-500">
                <div className="col-span-2">Interval</div>
                <div className="col-span-2">Source</div>
                <div className="col-span-2 text-right">Seats</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-4">Renews/Ends</div>
              </div>
              <div className="divide-y divide-gray-100">
                {(seatBreakdown?.items || []).length === 0 ? (
                  <div className="px-4 py-6 text-sm text-gray-500">
                    {seatBreakdownLoading
                      ? "Loading…"
                      : "No active seat subscriptions found."}
                  </div>
                ) : (
                  (seatBreakdown?.items || []).map((item) => (
                    <div
                      key={item.subscription_id}
                      className="grid grid-cols-12 gap-2 px-4 py-3 text-sm"
                    >
                      <div className="col-span-2 font-bold text-gray-900">
                        {item.interval === "year" ? "Annual" : "Monthly"}
                      </div>
                      <div className="col-span-2 text-gray-600">
                        {item.source === "seat_addon" ? "Add-on" : "In plan"}
                      </div>
                      <div className="col-span-2 text-right font-bold text-gray-900">
                        {formatNumber(item.seats)}
                      </div>
                      <div className="col-span-2 text-gray-600">
                        {String(item.status || "").toLowerCase()}
                      </div>
                      <div className="col-span-4 text-gray-600">
                        {item.current_period_end
                          ? new Date(
                              item.current_period_end,
                            ).toLocaleDateString()
                          : "—"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSeatBreakdownOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
