import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Check } from "lucide-react";
import {
  createAgencySubscriptionCheckout,
  getAgencyProfile,
} from "@/api/functions";
import { useToast } from "@/components/ui/use-toast";

type PricingBracket = {
  label: string;
  min: number;
  max: number | null;
  rate: number;
};

const rosterBrackets: PricingBracket[] = [
  { label: "186", min: 0, max: null, rate: 10 },
];

function bracketForValue(brackets: PricingBracket[], value: number) {
  return (
    brackets.find((b) => value >= b.min && (b.max == null || value <= b.max)) ||
    brackets[0]
  );
}

export default function AgencySubscribe() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [searchParams] = useSearchParams();
  const success = searchParams.get("success") === "1";
  const canceled = searchParams.get("canceled") === "1";

  const [plan, setPlan] = React.useState<"basic" | "pro" | "enterprise">("pro");
  const [currentPlanTier, setCurrentPlanTier] = React.useState<string | null>(
    null,
  );

  const rosterModels = 186;
  const rosterRateBasic = 5;
  const rosterRatePro = 10;
  const rosterCostBasic = rosterModels * rosterRateBasic;
  const rosterCostPro = rosterModels * rosterRatePro;
  const irlBookingCost = 489;
  const basePlanBasic = 399;
  const basePlanPro = 489;
  const totalMonthlyBasic = basePlanBasic + rosterCostBasic + irlBookingCost;
  const totalMonthlyPro = basePlanPro + rosterCostPro + irlBookingCost;

  const [checkingOut, setCheckingOut] = React.useState(false);

  React.useEffect(() => {
    async function fetchCurrentPlan() {
      try {
        const resp = await getAgencyProfile();
        const tier = (resp as any)?.plan_tier || "free";
        setCurrentPlanTier(tier);
        // Default the selected toggle to the current plan if it's one of the options
        if (["basic", "pro", "enterprise"].includes(tier)) {
          setPlan(tier as any);
        }
      } catch (e) {
        console.error("Failed to fetch agency profile:", e);
      }
    }
    fetchCurrentPlan();
  }, []);

  React.useEffect(() => {
    if (!success) return;
    navigate(`/AgencyDashboard?tab=settings&subTab=General%20Settings`, {
      replace: true,
    });
  }, [navigate, success]);

  const onContact = () => navigate("/SalesInquiry");

  const rosterBracket = React.useMemo(
    () => bracketForValue(rosterBrackets, rosterModels),
    [],
  );

  const rosterRate = plan === "basic" ? rosterRateBasic : rosterRatePro;
  const rosterCost = plan === "basic" ? rosterCostBasic : rosterCostPro;

  const onCheckout = async (planOverride?: "basic" | "pro" | "enterprise") => {
    const targetPlan = planOverride || plan;
    if (targetPlan === "enterprise") {
      onContact();
      return;
    }

    setCheckingOut(true);
    try {
      const resp = await createAgencySubscriptionCheckout({
        plan: targetPlan,
        roster_models: 186,
        addons: {
          irl_booking: true,
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
      if (msg.includes("enterprise_contact_sales_roster_limit")) {
        toast({
          title: "Contact Sales",
          description:
            "Enterprise is required when you have more than 186 models on your roster.",
        });
        onContact();
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

  const onBack = () => {
    navigate("/AgencyDashboard");
  };

  return (
    <div className="min-h-screen bg-[#F6F3EF] text-[#1B1C23]">
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-24">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-black tracking-tight">
            Simple, transparent pricing
          </h1>
          <p className="text-gray-500 mt-4 text-lg">
            Start with licensing. Add what you need. Scale when you're ready.
          </p>

          <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
            <Badge variant="outline" className="bg-white/70">
              Plans are billed monthly
            </Badge>
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
                <div className="text-2xl font-black">
                  How many models on your roster?
                </div>
                <div className="text-gray-500 mt-1">Fixed at 186 models.</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="border border-gray-200 rounded-2xl px-4 py-3 text-3xl font-black bg-white">
                  {rosterModels}
                </div>
                <div className="text-gray-400">models</div>
              </div>
            </div>

            <div className="text-center text-[#4B4AE6] font-black mt-6">
              {rosterModels} models × ${rosterRate}/mo = ${rosterCost}/mo
              (headcount)
            </div>
          </Card>
        </div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="rounded-[28px] border border-gray-200 bg-white p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-3xl font-black">Basic</div>
                <div className="text-gray-500 mt-1">
                  Get started with licensing
                </div>
              </div>
              <Badge className="bg-amber-100 text-amber-700 border border-amber-200">
                10% fee
              </Badge>
            </div>
            <div className="mt-6 flex items-end gap-2">
              <div className="text-6xl font-black">${totalMonthlyBasic}</div>
              <div className="text-gray-500 font-bold">/mo</div>
            </div>
            <div className="mt-6 text-gray-500 font-medium">
              <div className="flex justify-between">
                <span>Base plan</span>
                <span>${basePlanBasic}</span>
              </div>
              <div className="flex justify-between">
                <span>
                  {rosterModels} models × ${rosterRateBasic}
                </span>
                <span>${rosterCostBasic}</span>
              </div>
              <div className="flex justify-between">
                <span>IRL Booking add-on</span>
                <span>+${irlBookingCost}</span>
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
                className={`w-full h-12 rounded-2xl font-black ${
                  currentPlanTier === "basic"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 cursor-default hover:bg-emerald-50"
                    : ""
                }`}
                variant={plan === "basic" ? "default" : "outline"}
                onClick={async () => {
                  if (currentPlanTier === "basic") return;
                  setPlan("basic");
                  await onCheckout("basic");
                }}
                disabled={checkingOut || currentPlanTier === "basic"}
              >
                {currentPlanTier === "basic" ? (
                  <span className="flex items-center gap-2">
                    <Check className="w-5 h-5" />
                    Current Plan
                  </span>
                ) : (
                  "Select Basic"
                )}
              </Button>
            </div>
          </Card>

          <Card className="rounded-[28px] border border-gray-200 bg-[#0F1225] text-white p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-black">Pro</div>
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
            <div className="mt-6 flex items-end gap-2">
              <div className="text-6xl font-black">${totalMonthlyPro}</div>
              <div className="text-white/60 font-bold">/mo</div>
            </div>
            <div className="mt-6 text-white/70 font-medium">
              <div className="flex justify-between">
                <span>Base plan</span>
                <span>${basePlanPro}</span>
              </div>
              <div className="flex justify-between">
                <span>
                  {rosterModels} models × ${rosterRatePro}
                </span>
                <span>${rosterCostPro}</span>
              </div>
              <div className="flex justify-between">
                <span>IRL Booking add-on</span>
                <span>+${irlBookingCost}</span>
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
                className={`w-full h-12 rounded-2xl font-black ${
                  currentPlanTier === "pro"
                    ? "bg-white/10 text-white cursor-default hover:bg-white/10 border-white/20"
                    : "bg-[#4B4AE6] hover:bg-[#3F3EE0]"
                }`}
                onClick={async () => {
                  if (currentPlanTier === "pro") return;
                  setPlan("pro");
                  await onCheckout("pro");
                }}
                disabled={checkingOut || currentPlanTier === "pro"}
              >
                {currentPlanTier === "pro" ? (
                  <span className="flex items-center gap-2">
                    <Check className="w-5 h-5" />
                    Current Plan
                  </span>
                ) : (
                  "Select Pro"
                )}
              </Button>
            </div>
          </Card>
        </div>

        <div className="mt-12">
          <div className="text-center text-3xl font-black">Add-Ons</div>
          <div className="text-center text-gray-500 mt-2">
            Already have booking software? No problem — Likelee works as a
            standalone licensing platform. Add what you need.
          </div>

          <div className="mt-8 space-y-6">
            <Card className="rounded-[28px] border border-gray-200 bg-white p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-2xl font-black">
                    IRL AI-Powered Booking Software
                  </div>
                  <div className="text-gray-500 mt-1">
                    Manage real-world gigs alongside your licensing income — all
                    in one place.
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-xl font-black text-gray-900">
                    +${489}
                    <span className="text-gray-400 text-sm">/mo</span>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-700 border-emerald-200"
                  >
                    Included
                  </Badge>
                </div>
              </div>
            </Card>

            <Card className="rounded-[28px] border border-gray-200 bg-white p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-2xl font-black">
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
                  <div className="text-2xl font-black">
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
            <div className="text-4xl font-black">
              ${plan === "basic" ? totalMonthlyBasic : totalMonthlyPro}/mo
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="rounded-2xl" onClick={onBack}>
              Back to Dashboard
            </Button>
            <Button
              className="rounded-2xl font-black bg-[#4B4AE6] hover:bg-[#3F3EE0]"
              onClick={() => onCheckout()}
              disabled={
                checkingOut ||
                (plan === "basic" && currentPlanTier === "basic") ||
                (plan === "pro" && currentPlanTier === "pro")
              }
            >
              {(plan === "basic" && currentPlanTier === "basic") ||
              (plan === "pro" && currentPlanTier === "pro")
                ? "Already Subscribed"
                : "Get Started"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        <div className="mt-10">
          <Card className="rounded-[28px] border border-gray-200 bg-white p-8">
            <div className="flex items-center justify-between gap-6 flex-wrap">
              <div>
                <div className="text-2xl font-black">Enterprise</div>
                <div className="text-gray-500 mt-1">
                  Custom storage, security, SLAs, onboarding, integrations — and
                  required for agencies with more than 186 models on roster.
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
    </div>
  );
}
