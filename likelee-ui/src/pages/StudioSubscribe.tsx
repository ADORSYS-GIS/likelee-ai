import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Zap, ArrowRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useToast } from "@/components/ui/use-toast";
import { getUserFriendlyError } from "@/utils";

const creditTiers = [
  { credits: 2000, price: 59, label: "2,000" },
  { credits: 5000, price: 129, label: "5,000" },
  { credits: 10000, price: 239, label: "10,000" },
  { credits: 25000, price: 519, label: "25,000" },
  { credits: 50000, price: 999, label: "50,000" },
  { credits: 100000, price: 1899, label: "100,000" },
  { credits: 250000, price: 4499, label: "250,000" },
  { credits: 500000, price: 8999, label: "500,000" },
];

export default function StudioSubscribe() {
  const [selectedTierIndex, setSelectedTierIndex] = useState(0);
  const [checkingOut, setCheckingOut] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: () => base44.auth.me(),
  });

  const { data: credits } = useQuery({
    queryKey: ["credits", user?.email],
    queryFn: async () => {
      const result = await base44.entities.StudioCredits.filter({
        user_email: user.email,
      });
      return result[0] || { credits_balance: 0, plan_type: "free" };
    },
    enabled: !!user,
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ plan_type, credits, price }) => {
      const { data } = await base44.functions.invoke("createCheckoutSession", {
        plan_type,
        credits,
        price,
      });
      return data;
    },
    onSuccess: (data) => {
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    },
    onError: (error) => {
      console.error("Checkout failed:", error);
      toast({
        title: "Error",
        description: getUserFriendlyError(error),
        variant: "destructive",
      });
      setCheckingOut(false);
    },
  });

  const selectedTier = creditTiers[selectedTierIndex];

  const handleSubscribe = (plan, creditAmount, price) => {
    setCheckingOut(true);
    checkoutMutation.mutate({ plan_type: plan, credits: creditAmount, price });
  };

  return (
    <div style={{ background: "#0A0A0F", minHeight: "100vh", color: "#fff" }}>
      <style>{`
        .credit-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 8px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.1);
          outline: none;
          opacity: 0.9;
          transition: opacity 0.2s;
        }

        .credit-slider:hover {
          opacity: 1;
        }

        .credit-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #F18B6A, #E07A5A);
          cursor: pointer;
          border: 3px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 12px rgba(241, 139, 106, 0.4);
          transition: transform 0.2s;
        }

        .credit-slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }

        .credit-slider::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #F18B6A, #E07A5A);
          cursor: pointer;
          border: 3px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 12px rgba(241, 139, 106, 0.4);
          transition: transform 0.2s;
        }

        .credit-slider::-moz-range-thumb:hover {
          transform: scale(1.1);
        }
      `}</style>

      {/* Header */}
      <header className="px-6 py-6 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/studio" className="flex items-center gap-3">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/eaaf29851_Screenshot2025-10-12at31742PM.png"
                alt="Likelee Logo"
                className="h-8 w-auto"
              />
              <span className="text-lg font-bold text-white">
                likelee.studio
              </span>
            </a>
          </div>
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("Studio"))}
            className="text-gray-400 hover:text-white"
          >
            ← Back to Studio
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 pt-16 pb-12 text-center">
        <Badge className="mb-6 bg-white/10 text-white border-white/20">
          Current Plan: {credits?.plan_type || "Free"}
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Choose Your Plan
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Get unlimited access to AI image and video generation with our
          flexible plans.
        </p>
      </section>

      {/* Pricing */}
      <section className="px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Lite Plan */}
            <Card className="p-8 bg-white/5 backdrop-blur-sm border-2 border-white/10 hover:border-white/20 transition-all rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-6 h-6 text-[#32C8D1]" />
                <Badge className="bg-[#32C8D1]/20 text-[#32C8D1]">
                  Most Popular
                </Badge>
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">Lite Plan</h3>
              <div className="flex items-baseline mb-2">
                <span className="text-5xl font-bold text-white">$15</span>
                <span className="text-gray-400 ml-2">/ month</span>
              </div>
              <p className="text-gray-400 mb-6">300 credits per month</p>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3 text-gray-300">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>30 videos / month</span>
                </li>
                <li className="flex items-start gap-3 text-gray-300">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>300 images / month</span>
                </li>
                <li className="flex items-start gap-3 text-gray-300">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>2 parallel tasks</span>
                </li>
                <li className="flex items-start gap-3 text-gray-300">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>All-in-one multi-model support</span>
                </li>
                <li className="flex items-start gap-3 text-gray-300">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Text/Image/Video to video</span>
                </li>
                <li className="flex items-start gap-3 text-gray-300">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>300+ templates & effects</span>
                </li>
              </ul>

              <Button
                onClick={() => handleSubscribe("lite", 300, 15)}
                disabled={checkingOut || checkoutMutation.isPending}
                className="w-full h-12 bg-gradient-to-r from-[#32C8D1] to-teal-500 hover:opacity-90"
              >
                {checkingOut || checkoutMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : credits?.plan_type === "lite" ? (
                  "Current Plan"
                ) : (
                  <>
                    Subscribe to Lite
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </Card>

            {/* Pro Plan */}
            <Card className="p-8 bg-white/5 backdrop-blur-sm border-2 border-white/10 hover:border-white/20 transition-all rounded-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-gradient-to-br from-[#F18B6A] to-[#E07A5A] text-white text-xs font-bold px-4 py-1 rounded-bl-lg">
                FLEXIBLE
              </div>

              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-6 h-6 text-[#F18B6A]" />
                <Badge className="bg-[#F18B6A]/20 text-[#F18B6A]">
                  Best Value
                </Badge>
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">
                Pro Plan — Flexible Credits
              </h3>
              <div className="flex items-baseline mb-2">
                <span className="text-5xl font-bold text-white">
                  ${selectedTier.price}
                </span>
                <span className="text-gray-400 ml-2">/ month</span>
              </div>
              <p className="text-gray-400 mb-6">
                {selectedTier.label} credits per month
              </p>

              {/* Credit Slider */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
                <label className="text-sm font-semibold text-gray-300 mb-4 block">
                  Choose your monthly credits:
                </label>
                <input
                  type="range"
                  min="0"
                  max={creditTiers.length - 1}
                  value={selectedTierIndex}
                  onChange={(e) =>
                    setSelectedTierIndex(parseInt(e.target.value))
                  }
                  className="credit-slider"
                />

                <div className="flex justify-between text-xs text-gray-400 mt-2 mb-6">
                  <span>2K</span>
                  <span>100K</span>
                  <span>500K</span>
                </div>

                <div className="pt-6 border-t border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Monthly total:</span>
                    <span className="text-3xl font-bold text-white">
                      ${selectedTier.price}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-2">
                    for {selectedTier.label} credits
                  </p>
                </div>
              </div>

              <ul className="space-y-2 mb-8 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Credits work across all AI tools</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Unused credits roll over for 30 days</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>3 parallel tasks</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Cancel anytime</span>
                </li>
              </ul>

              <Button
                onClick={() =>
                  handleSubscribe(
                    "pro",
                    selectedTier.credits,
                    selectedTier.price,
                  )
                }
                disabled={checkingOut || checkoutMutation.isPending}
                className="w-full h-12 bg-gradient-to-r from-[#F18B6A] to-[#E07A5A] hover:opacity-90"
              >
                {checkingOut || checkoutMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : credits?.plan_type === "pro" ? (
                  "Current Plan"
                ) : (
                  <>
                    Subscribe to Pro
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </Card>
          </div>

          {/* Current Credits Display */}
          {credits && (
            <Card className="p-6 mt-8 bg-white/5 border border-white/10 text-center">
              <p className="text-gray-400 mb-2">Your Current Balance</p>
              <p className="text-4xl font-bold text-white mb-2">
                {credits.credits_balance}
              </p>
              <p className="text-sm text-gray-400">credits available</p>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
