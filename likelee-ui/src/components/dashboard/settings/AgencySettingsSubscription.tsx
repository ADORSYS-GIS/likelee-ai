import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  ArrowUpRight,
  Loader2,
  Calendar,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import {
  getAgencyBillingStatus,
  createAgencyBillingPortal,
} from "@/api/functions";
import { createPageUrl } from "@/utils";
import { useToast } from "@/components/ui/use-toast";

type BillingStatus = {
  plan_tier: string;
  subscription_status: string;
  has_paid_access: boolean;
  has_pro_access: boolean;
  can_apply_for_jobs: boolean;
  can_connect_marketplace_creators: boolean;
  can_use_brand_connections: boolean;
  can_use_calendly: boolean;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  plan_updated_at?: string | null;
  plan_interval: string;
  stripe_current_period_end?: string | null;
  stripe_cancel_at_period_end: boolean;
};

export const AgencySettingsSubscription = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  const fetchBillingStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getAgencyBillingStatus();
      setBillingStatus(data);
    } catch (err: any) {
      console.error("Failed to load billing status", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBillingStatus();
  }, [fetchBillingStatus]);

  const handleOpenBillingPortal = async () => {
    try {
      setIsOpeningPortal(true);
      const response = await createAgencyBillingPortal();
      if (response?.checkout_url) {
        window.open(response.checkout_url, "_blank");
      } else {
        toast({
          title: "Billing portal unavailable",
          description:
            "Please contact support to manage your billing settings.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description:
          err?.message || "Failed to open billing portal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsOpeningPortal(false);
    }
  };

  const planTier = billingStatus?.plan_tier || "free";
  const planLabel =
    planTier === "pro"
      ? "Pro"
      : planTier === "basic"
        ? "Basic"
        : planTier === "enterprise"
          ? "Enterprise"
          : "Free";

  const intervalLabel =
    billingStatus?.plan_interval === "year" ? "Annual" : "Monthly";

  const renewalDate = billingStatus?.stripe_current_period_end
    ? new Date(billingStatus.stripe_current_period_end).toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
          year: "numeric",
        },
      )
    : null;

  const isCanceled = billingStatus?.stripe_cancel_at_period_end;

  const planFeatures = [
    {
      label: "Apply for jobs",
      available: billingStatus?.can_apply_for_jobs ?? false,
    },
    {
      label: "Connect marketplace creators",
      available: billingStatus?.can_connect_marketplace_creators ?? false,
    },
    {
      label: "Use brand connections",
      available: billingStatus?.can_use_brand_connections ?? false,
    },
    {
      label: "Calendly integration",
      available: billingStatus?.can_use_calendly ?? false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card
        className={`p-6 border shadow-sm rounded-2xl transition-all duration-300 ${
          planTier === "pro"
            ? "bg-gradient-to-br from-indigo-600 to-indigo-700 border-indigo-500/30 text-white"
            : planTier === "basic"
              ? "bg-gradient-to-br from-emerald-600 to-emerald-700 border-emerald-500/30 text-white"
              : planTier === "enterprise"
                ? "bg-gradient-to-br from-amber-600 to-amber-700 border-amber-500/30 text-white"
                : "bg-white border-gray-200 text-gray-900"
        }`}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div
              className={`text-[11px] font-black uppercase tracking-[0.3em] ${
                planTier === "free" ? "text-gray-400" : "text-white/70"
              }`}
            >
              Current Plan
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div
                className={`text-2xl font-black ${planTier === "free" ? "text-gray-900" : "text-white"}`}
              >
                {planLabel}
              </div>
              <Badge
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  planTier === "pro"
                    ? "bg-indigo-500/30 text-indigo-100 border border-indigo-400/30"
                    : planTier === "basic"
                      ? "bg-emerald-500/30 text-emerald-100 border border-emerald-400/30"
                      : planTier === "enterprise"
                        ? "bg-amber-500/30 text-amber-100 border border-amber-400/30"
                        : "bg-gray-100 text-gray-600 border border-gray-200"
                }`}
              >
                {intervalLabel}
              </Badge>
              {isCanceled && (
                <Badge className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-200 border border-red-400/30">
                  Canceling
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {planTier === "free" && (
              <Button
                onClick={() => navigate(createPageUrl("AgencySubscribe"))}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2"
              >
                Upgrade Plan
                <ArrowUpRight className="w-4 h-4" />
              </Button>
            )}
            {billingStatus?.stripe_subscription_id && (
              <Button
                onClick={handleOpenBillingPortal}
                disabled={isOpeningPortal}
                variant="outline"
                className={`font-bold rounded-xl flex items-center gap-2 ${
                  planTier === "free"
                    ? "border-gray-200 text-gray-600 hover:bg-gray-50"
                    : "border-white/20 text-white hover:bg-white/10"
                }`}
              >
                {isOpeningPortal ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                Manage Billing
              </Button>
            )}
          </div>
        </div>

        {renewalDate && (
          <div
            className={`mt-4 pt-4 border-t flex items-center gap-2 text-sm ${
              planTier === "free"
                ? "border-gray-100 text-gray-500"
                : "border-white/10 text-white/70"
            }`}
          >
            <Calendar className="w-4 h-4" />
            {isCanceled ? "Access ends" : "Renews on"} {renewalDate}
          </div>
        )}
      </Card>

      {/* Plan Features */}
      <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 tracking-tight">
              Plan Features
            </h3>
            <p className="text-sm text-gray-500 font-medium">
              What's included in your current plan
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {planFeatures.map((feature) => (
            <div
              key={feature.label}
              className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100"
            >
              <span className="text-sm font-medium text-gray-700">
                {feature.label}
              </span>
              {feature.available ? (
                <Badge className="bg-green-100 text-green-700 border border-green-200 font-medium text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              ) : (
                <Badge className="bg-gray-100 text-gray-500 border border-gray-200 font-medium text-xs">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Not available
                </Badge>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Upgrade Options */}
      {planTier !== "enterprise" && (
        <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                Upgrade Options
              </h3>
              <p className="text-sm text-gray-500 font-medium">
                Choose a plan that fits your needs
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {planTier !== "pro" && planTier !== "enterprise" && (
              <div className="p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-emerald-900">Basic</h4>
                  <Badge className="bg-emerald-600 text-white text-xs font-bold">
                    $399/mo
                  </Badge>
                </div>
                <p className="text-xs text-emerald-700 mb-3">
                  Essential tools for growing agencies
                </p>
                <Button
                  onClick={() => navigate(createPageUrl("AgencySubscribe"))}
                  size="sm"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs"
                >
                  Upgrade to Basic
                </Button>
              </div>
            )}
            {planTier !== "pro" && planTier !== "enterprise" && (
              <div className="p-4 rounded-xl border-2 border-indigo-200 bg-indigo-50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-indigo-900">Pro</h4>
                  <Badge className="bg-indigo-600 text-white text-xs font-bold">
                    $489/mo
                  </Badge>
                </div>
                <p className="text-xs text-indigo-700 mb-3">
                  Full access with advanced features
                </p>
                <Button
                  onClick={() => navigate(createPageUrl("AgencySubscribe"))}
                  size="sm"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs"
                >
                  Upgrade to Pro
                </Button>
              </div>
            )}
            <div className="p-4 rounded-xl border-2 border-amber-200 bg-amber-50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-amber-900">Enterprise</h4>
                <Badge className="bg-amber-600 text-white text-xs font-bold">
                  Custom
                </Badge>
              </div>
              <p className="text-xs text-amber-700 mb-3">
                Tailored solution for large organizations
              </p>
              <Button
                onClick={() => navigate(createPageUrl("AgencySubscribe"))}
                size="sm"
                variant="outline"
                className="w-full border-amber-300 text-amber-700 hover:bg-amber-100 font-bold rounded-lg text-xs"
              >
                Contact Sales
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">
            Loading subscription details...
          </span>
        </div>
      )}
    </div>
  );
};
