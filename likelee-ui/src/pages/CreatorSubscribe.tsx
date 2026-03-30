import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft } from "lucide-react";
import {
  createCreatorSubscriptionCheckout,
  getCreatorBillingStatus,
} from "@/api/functions";
import { useToast } from "@/components/ui/use-toast";

export default function CreatorSubscribe() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const success = searchParams.get("success") === "1";
  const canceled = searchParams.get("canceled") === "1";
  const [currentPlanTier, setCurrentPlanTier] = React.useState<string>("free");
  const [checkingOut, setCheckingOut] = React.useState(false);

  React.useEffect(() => {
    async function loadStatus() {
      try {
        const resp = await getCreatorBillingStatus();
        setCurrentPlanTier(String((resp as any)?.plan_tier || "free"));
      } catch (error) {
        console.error("Failed to load creator billing status", error);
      }
    }
    void loadStatus();
  }, []);

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
      const resp = await createCreatorSubscriptionCheckout({ plan });
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
      <div className="max-w-5xl mx-auto px-6 pt-16 pb-24">
        <div className="text-center">
          <h1 className="text-5xl font-black tracking-tight">
            Creator plans built for growth
          </h1>
          <p className="text-gray-500 mt-4 text-lg">
            Start with Content, upgrade to Basic for KYC and creator visibility,
            then unlock premium workflow tools with Pro.
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

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="rounded-[28px] border border-gray-200 bg-white p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-3xl font-black">Basic</div>
                <div className="text-gray-500 mt-1">
                  Unlock KYC, creator visibility, and connection workflows
                </div>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-right shadow-sm">
                <div className="text-5xl font-black leading-none text-amber-700">
                  $25
                </div>
                <div className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-amber-600">
                  per month
                </div>
              </div>
            </div>
            <div className="mt-8 space-y-3 text-gray-700 font-medium">
              {[
                "Identity verification (KYC)",
                "My Likeness",
                "Agency connection",
                "Brand connection",
                "Payouts",
              ].map((label) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="mt-[2px] w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-gray-700" />
                  </div>
                  <div>{label}</div>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <div className="mb-4 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">
                Basic is the trust unlock. Without Basic and approved KYC, a
                creator cannot be visible in the marketplace or be managed by
                agencies and brands.
              </div>
              <Button
                className="w-full rounded-2xl font-black"
                variant={currentPlanTier === "basic" ? "outline" : "default"}
                onClick={() => void onCheckout("basic")}
                disabled={checkingOut || currentPlanTier === "basic"}
              >
                {currentPlanTier === "basic" ? "Current Plan" : "Choose Basic"}
              </Button>
            </div>
          </Card>

          <Card className="rounded-[28px] border border-gray-200 bg-[#0F1225] text-white p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-black">Pro</div>
                  <Badge className="bg-[#4B4AE6] text-white border border-[#4B4AE6]">
                    Recommended
                  </Badge>
                </div>
                <div className="text-white/70 mt-1">
                  Unlock premium creator workflow and monetization tools
                </div>
              </div>
              <div className="rounded-2xl border border-emerald-300/30 bg-emerald-100 px-5 py-3 text-right shadow-sm">
                <div className="text-5xl font-black leading-none text-emerald-700">
                  $50
                </div>
                <div className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
                  per month
                </div>
              </div>
            </div>
            <div className="mt-8 space-y-3 text-white/80 font-medium">
              {[
                "Everything in Basic",
                "Cameo video uploads",
                "Jobs",
                "Settings: My Rules",
                "Voice",
                "Talent Portal",
                "Campaign Archives",
                "Active Campaigns",
              ].map((label) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="mt-[2px] w-5 h-5 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>{label}</div>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <Button
                className="w-full rounded-2xl font-black bg-[#4B4AE6] hover:bg-[#3F3EE0]"
                onClick={() => void onCheckout("pro")}
                disabled={checkingOut || currentPlanTier === "pro"}
              >
                {currentPlanTier === "pro" ? "Current Plan" : "Choose Pro"}
              </Button>
            </div>
          </Card>
        </div>

        <div className="mt-12 flex justify-center">
          <Button
            variant="outline"
            onClick={() => navigate("/CreatorDashboard")}
          >
            Back to Dashboard
            <ArrowLeft className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
