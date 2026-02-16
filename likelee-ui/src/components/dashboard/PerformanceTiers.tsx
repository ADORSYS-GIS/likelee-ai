import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import {
  Trophy,
  TrendingUp,
  Users,
  AlertCircle,
  Calendar,
  DollarSign,
  Target,
  CheckCircle2,
  Settings,
  Check,
  X,
  History,
  Info,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { format } from "date-fns";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

const TIER_CONFIG: Record<string, any> = {
  Premium: {
    label: "Tier 1 - Premium",
    icon: Trophy,
    color: "border-amber-400",
    textColor: "text-white",
    iconBg: "bg-gradient-to-br from-amber-400 to-amber-600",
    brandColor: "text-amber-500",
    brandBorder: "border-amber-500",
    statsBg: "bg-amber-50/30",
    statsBorder: "border-amber-100",
    modalBg: "bg-amber-50",
    modalInputBg: "bg-amber-100/30",
    recommendation:
      "Prioritize for high-value campaigns. Consider exclusive partnerships.",
    thresholds: "≥ $5,000/mo • ≥ 8 bookings",
    id: "Premium",
  },
  Core: {
    label: "Tier 2 - Core",
    icon: TrendingUp,
    color: "border-blue-400",
    textColor: "text-white",
    iconBg: "bg-gradient-to-br from-blue-400 to-blue-600",
    brandColor: "text-blue-500",
    brandBorder: "border-blue-500",
    statsBg: "bg-blue-50/30",
    statsBorder: "border-blue-100",
    modalBg: "bg-blue-50",
    modalInputBg: "bg-blue-100/30",
    recommendation:
      "Stable performers. Focus on increasing campaign frequency and average deal value.",
    thresholds: "≥ $2,500/mo • ≥ 5 bookings",
    id: "Core",
  },
  Growth: {
    label: "Tier 3 - Growth",
    icon: Target,
    color: "border-green-400",
    textColor: "text-white",
    iconBg: "bg-gradient-to-br from-emerald-400 to-emerald-600",
    brandColor: "text-green-500",
    brandBorder: "border-green-500",
    statsBg: "bg-green-50/30",
    statsBorder: "border-green-100",
    modalBg: "bg-emerald-50",
    modalInputBg: "bg-emerald-100/30",
    recommendation:
      "Invest in portfolio development. Increase brand exposure and campaign opportunities.",
    thresholds: "≥ $500/mo • ≥ 1 bookings",
    id: "Growth",
  },
  Inactive: {
    label: "Tier 4 - Needs Attention",
    icon: AlertCircle,
    color: "border-gray-200",
    textColor: "text-white",
    iconBg: "bg-gradient-to-br from-gray-400 to-gray-600",
    brandColor: "text-gray-400",
    brandBorder: "border-gray-400",
    statsBg: "bg-gray-50/30",
    statsBorder: "border-gray-100",
    modalBg: "bg-gray-50",
    modalInputBg: "bg-gray-100/30",
    recommendation:
      "Requires immediate action. Consider portfolio refresh, marketing push, or roster review.",
    thresholds: "Includes all talent that don't meet Tier 3 requirements",
    id: "Inactive",
  },
};

interface TierRule {
  tier_name: string;
  tier_level: number;
  min_monthly_earnings: number;
  min_monthly_bookings: number;
  commission_rate: number;
  description: string | null;
}

interface TalentPerformance {
  id: string;
  name: string;
  photo_url: string | null;
  earnings_30d: number;
  bookings_this_month: number;
  tier: TierRule;
  commission_rate: number;
  is_custom_rate: boolean;
}

interface TierGroup {
  name: string;
  level: number;
  description: string;
  talents: TalentPerformance[];
}

interface PerformanceTiersResponse {
  tiers: TierGroup[];
  config?: Record<
    string,
    { min_earnings: number; min_bookings: number; commission_rate?: number }
  >;
}

interface CommissionHistoryLog {
  id: string;
  talent_name: string;
  old_rate: number | null;
  new_rate: number;
  changed_by_name: string | null;
  changed_at: string;
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export const PerformanceTiers: React.FC = () => {
  const queryClient = useQueryClient();
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedTalentIdForHistory, setSelectedTalentIdForHistory] = useState<
    string | null
  >(null);

  const [configForm, setConfigForm] = useState<
    Record<string, { min_earnings: number; min_bookings: number }>
  >({});

  const { data, isLoading, error } = useQuery<PerformanceTiersResponse>({
    queryKey: ["performance-tiers"],
    queryFn: async () => {
      try {
        const resp = await base44.get<PerformanceTiersResponse>(
          "/agency/dashboard/performance-tiers",
        );
        return resp;
      } catch (err: any) {
        // If the backend sent a "Dashboard Error: ..." message, use it directly
        const errorMessage = err?.response?.data || err.message;
        if (
          typeof errorMessage === "string" &&
          errorMessage.includes("Dashboard Error:")
        ) {
          throw new Error(errorMessage.split("Dashboard Error:")[1].trim());
        }
        throw new Error(errorMessage || "Failed to load performance tiers");
      }
    },
  });

  useEffect(() => {
    if (data?.config) {
      const next: Record<
        string,
        { min_earnings: number; min_bookings: number }
      > = {};
      for (const tier of ["Premium", "Core", "Growth"]) {
        next[tier] = {
          min_earnings: data.config?.[tier]?.min_earnings ?? 0,
          min_bookings: data.config?.[tier]?.min_bookings ?? 0,
        };
      }
      setConfigForm(next);
    }
  }, [data?.config]);

  const configMutation = useMutation({
    mutationFn: async (config: any) => {
      await base44.post("/agency/dashboard/performance-tiers/configure", {
        config,
      });
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance-tiers"] });
      setIsConfigModalOpen(false);
      toast.success("Tier thresholds updated successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update configuration");
    },
  });

  const updateCommissionMutation = useMutation({
    mutationFn: async ({
      talentId,
      rate,
    }: {
      talentId: string;
      rate: number | null;
    }) => {
      await base44.post("/agency/dashboard/talent-commissions/update", {
        talent_id: talentId,
        custom_rate: rate,
      });
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance-tiers"] });
      queryClient.invalidateQueries({ queryKey: ["commission-history"] });
      toast.success("Commission rate updated");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update commission rate");
    },
  });

  const { data: historyData } = useQuery<CommissionHistoryLog[]>({
    queryKey: ["commission-history"],
    queryFn: async () => {
      const resp = await base44.get<CommissionHistoryLog[]>(
        "/agency/dashboard/talent-commissions/history",
      );
      return resp;
    },
    enabled: isHistoryOpen,
  });

  const allTalents = React.useMemo(() => {
    return data?.tiers.flatMap((t) => t.talents) || [];
  }, [data?.tiers]);

  const filteredHistory = React.useMemo(() => {
    if (!historyData) return [];
    if (!selectedTalentIdForHistory) return historyData;
    if (selectedTalentIdForHistory) {
      const talentName = allTalents.find(
        (t) => t.id === selectedTalentIdForHistory,
      )?.name;
      if (talentName) {
        return historyData.filter((log) => log.talent_name === talentName);
      }
    }
    return historyData;
  }, [historyData, selectedTalentIdForHistory, allTalents]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-3">
        <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 text-[13px] font-medium">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <Card className="w-full border-red-100 bg-red-50/50 rounded-2xl shadow-sm">
          <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-gray-900">
                Unable to load Performance Dashboard
              </h3>
              <p className="text-sm text-red-600 font-medium">
                {(error as Error).message}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() =>
                queryClient.invalidateQueries({
                  queryKey: ["performance-tiers"],
                })
              }
              className="mt-2 border-red-200 text-red-700 hover:bg-red-100 font-bold px-8 rounded-xl"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalTalents =
    data?.tiers.reduce((acc, t) => acc + t.talents.length, 0) || 0;

  const handleSaveConfig = () => {
    const existing = data?.config || {};
    const merged: any = { ...existing };

    for (const tier of ["Premium", "Core", "Growth"]) {
      merged[tier] = {
        min_earnings:
          configForm?.[tier]?.min_earnings ?? existing?.[tier]?.min_earnings,
        min_bookings:
          configForm?.[tier]?.min_bookings ?? existing?.[tier]?.min_bookings,
        commission_rate: existing?.[tier]?.commission_rate,
      };
    }

    configMutation.mutate(merged);
  };

  return (
    <div className="p-10 animate-in fade-in duration-500 space-y-12">
      <div className="mb-12">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Performance Tiers
            </h1>
            <p className="text-gray-500 font-medium text-sm mt-1">
              Talent segmented by earnings and activity levels
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setIsConfigModalOpen(true)}
            className="flex items-center gap-2 border-gray-200 font-bold text-gray-700 bg-white hover:bg-gray-50 transition-colors rounded-none shadow-sm"
          >
            <Settings className="w-4 h-4 text-gray-400" /> Configure Tiers
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.keys(TIER_CONFIG).map((key) => {
            const cfg = TIER_CONFIG[key];
            const group = data?.tiers.find((t) => t.name === key) || {
              talents: [],
            };
            return (
              <Card
                key={key}
                className="p-6 bg-white border border-gray-200 shadow-sm rounded-none hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col h-full">
                  <div className="mb-4">
                    <cfg.icon className={cn("w-7 h-7", cfg.brandColor)} />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1">
                    {cfg.label}
                  </h3>
                  <div className="flex items-baseline gap-1.5 mt-auto">
                    <span className="text-3xl font-bold text-gray-900">
                      {group.talents.length}
                    </span>
                    <span className="text-xs text-gray-500 font-medium pb-1">
                      talent
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="space-y-12">
        {data?.tiers.map((group) => {
          const cfg = TIER_CONFIG[group.name] || TIER_CONFIG.Inactive;
          const avgEarnings =
            group.talents.length > 0
              ? group.talents.reduce((acc, t) => acc + t.earnings_30d, 0) /
                group.talents.length
              : 0;
          const avgBookings =
            group.talents.length > 0
              ? group.talents.reduce(
                  (acc, t) => acc + t.bookings_this_month,
                  0,
                ) / group.talents.length
              : 0;
          const percentOfRoster =
            totalTalents > 0
              ? Math.round((group.talents.length / totalTalents) * 100)
              : 0;

          // Get threshold string from data.config if available, otherwise use defaults
          let thresholdStr = cfg.thresholds;
          if (data?.config && data.config[group.name]) {
            const c = data.config[group.name];
            thresholdStr = `≥ ${currencyFormatter.format(c.min_earnings)}/mo • ≥ ${c.min_bookings} bookings`;
          } else if (group.name === "Inactive") {
            thresholdStr =
              "Includes all talent that don't meet Tier 3 requirements";
          }

          return (
            <div
              key={group.name}
              className="bg-white rounded-none border border-gray-200 shadow-sm overflow-hidden p-8"
            >
              <div className="flex items-center gap-4 mb-8">
                <div
                  className={cn(
                    "p-4 rounded-none border-2 border-black",
                    cfg.iconBg,
                  )}
                >
                  <cfg.icon className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-xl font-bold text-gray-900 leading-tight">
                      {cfg.label}
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsConfigModalOpen(true)}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 font-medium">
                    {thresholdStr}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div
                  className={cn(
                    "p-6 rounded-2xl border border-gray-100 bg-white shadow-sm",
                  )}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div
                      className={cn(
                        "p-2 rounded-xl shadow-sm border bg-transparent",
                        cfg.brandBorder,
                      )}
                    >
                      <DollarSign className={cn("w-4 h-4", cfg.brandColor)} />
                    </div>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Avg Monthly Earnings
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {currencyFormatter.format(avgEarnings)}
                  </div>
                </div>

                <div
                  className={cn(
                    "p-6 rounded-2xl border border-gray-100 bg-white shadow-sm",
                  )}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div
                      className={cn(
                        "p-2 rounded-xl shadow-sm border bg-transparent",
                        cfg.brandBorder,
                      )}
                    >
                      <Calendar className={cn("w-4 h-4", cfg.brandColor)} />
                    </div>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Avg Booking Frequency
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {avgBookings.toFixed(1)}{" "}
                    <span className="text-sm font-medium text-gray-500">
                      campaigns/month
                    </span>
                  </div>
                </div>

                <div
                  className={cn(
                    "p-6 rounded-2xl border border-gray-100 bg-white shadow-sm",
                  )}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div
                      className={cn(
                        "p-2 rounded-xl shadow-sm border bg-white",
                        cfg.brandBorder,
                      )}
                    >
                      <Users className={cn("w-4 h-4", cfg.brandColor)} />
                    </div>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Total Talent
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {group.talents.length}{" "}
                    <span className="text-sm font-medium text-gray-500">
                      {percentOfRoster}% of roster
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl flex items-start gap-4 mb-8">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border-[3px] border-blue-200 flex-shrink-0 mt-0.5 shadow-sm">
                  <Check className="w-4 h-4 text-blue-600" strokeWidth={3} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-1">
                    Agency Recommendation
                  </h4>
                  <p className="text-[13px] text-blue-600 font-semibold leading-snug">
                    {cfg.recommendation}
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-sm font-bold text-gray-900 font-bold">
                    Talent in This Tier
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsConfigModalOpen(true)}
                    className="h-8 gap-2 px-3 text-xs font-bold text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                  >
                    <Settings className="w-3.5 h-3.5" /> Configure Tiers
                  </Button>
                </div>
                <div className="space-y-3">
                  {group.talents.length > 0 ? (
                    group.talents.map((talent) => (
                      <div
                        key={talent.id}
                        className="flex items-center gap-4 p-5 border border-gray-100 rounded-none bg-white shadow-sm hover:shadow-md transition-all group"
                      >
                        <Avatar className="w-14 h-14 rounded-none object-cover bg-gray-50 shadow-sm border border-gray-200">
                          <AvatarImage
                            src={talent.photo_url || ""}
                            className="rounded-none"
                          />
                          <AvatarFallback className="bg-indigo-50 text-indigo-700 text-xs rounded-none">
                            {talent.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-gray-900 text-[15px]">
                              {talent.name}
                            </span>
                            <CheckCircle2 className="w-4 h-4 text-green-500 fill-green-500/10" />
                          </div>
                          <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400">
                            <span className="text-gray-900 font-bold">
                              {currencyFormatter.format(talent.earnings_30d)}/mo
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="flex items-center gap-1 group-hover:text-indigo-500 transition-colors">
                              <TrendingUp className="w-3.5 h-3.5" />{" "}
                              {talent.bookings_this_month} campaigns
                            </span>
                          </div>
                        </div>
                        <div className="hidden md:flex flex-col items-center gap-2 w-48 mr-6">
                          <div className="w-full h-2 bg-gray-100 rounded-none overflow-hidden border border-gray-50">
                            <div
                              className="h-full bg-gray-900 rounded-none"
                              style={{
                                width:
                                  talent.tier.tier_name === "Premium"
                                    ? "85%"
                                    : talent.tier.tier_name === "Core"
                                      ? "65%"
                                      : "45%",
                              }}
                            ></div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 font-bold text-gray-700 bg-white border-gray-200 px-6 rounded-none hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                        >
                          View
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center bg-gray-50/30 rounded-none border border-dashed border-gray-200">
                      <div className="p-6 bg-white rounded-none mb-4 shadow-sm border border-gray-200">
                        <Users className="w-12 h-12 text-gray-100" />
                      </div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                        No talent assigned to
                        <br />
                        this performance tier yet
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Configure Tiers Modal */}
      <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl max-h-[95vh] flex flex-col">
          <DialogHeader className="p-10 pb-4 flex-shrink-0">
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Configure Performance Tier Thresholds
            </DialogTitle>
            <DialogDescription className="text-gray-500 font-medium pt-1">
              Set minimum earnings and booking requirements for each tier
            </DialogDescription>
          </DialogHeader>

          <div className="px-10 py-2 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
            {["Premium", "Core", "Growth"].map((tier) => (
              <div
                key={tier}
                className={cn(
                  "p-8 rounded-2xl border border-gray-100 transition-all",
                  TIER_CONFIG[tier].modalBg,
                )}
              >
                <div className="flex items-center gap-2 mb-6">
                  {React.createElement(TIER_CONFIG[tier].icon, {
                    className: cn("w-5 h-5", TIER_CONFIG[tier].brandColor),
                  })}
                  <span className="font-bold text-gray-900">
                    {TIER_CONFIG[tier].label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label className="text-[13px] font-bold text-gray-600 ml-1">
                      Min Monthly Earnings ($)
                    </Label>
                    <Input
                      type="number"
                      value={configForm[tier]?.min_earnings}
                      onChange={(e) =>
                        setConfigForm({
                          ...configForm,
                          [tier]: {
                            ...configForm[tier],
                            min_earnings: Number(e.target.value),
                          },
                        })
                      }
                      className={cn(
                        "h-12 border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all",
                        TIER_CONFIG[tier].modalInputBg,
                      )}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[13px] font-bold text-gray-600 ml-1">
                      Min Bookings/Month
                    </Label>
                    <Input
                      type="number"
                      value={configForm[tier]?.min_bookings}
                      onChange={(e) =>
                        setConfigForm({
                          ...configForm,
                          [tier]: {
                            ...configForm[tier],
                            min_bookings: Number(e.target.value),
                          },
                        })
                      }
                      className={cn(
                        "h-12 border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all",
                        TIER_CONFIG[tier].modalInputBg,
                      )}
                    />
                  </div>
                </div>
              </div>
            ))}
            <p className="text-[13px] text-gray-500 font-medium pl-1 py-2">
              <span className="font-bold">Note:</span> Tier 4 includes all
              talent that don't meet Tier 3 requirements.
            </p>
          </div>

          <div className="px-10 pb-10 pt-4 flex flex-col sm:flex-row gap-4 sm:justify-end flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => setIsConfigModalOpen(false)}
              className="h-11 px-8 rounded-xl border-gray-200 font-bold text-gray-700 bg-white hover:bg-gray-50 order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveConfig}
              disabled={configMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 px-10 rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-70 order-1 sm:order-2 min-w-[160px] border-none"
            >
              {configMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Talent Commission Settings
            </h2>
            <p className="text-sm text-gray-500 font-medium">
              Manage custom commission rates for individual talent
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              if (isHistoryOpen) {
                setIsHistoryOpen(false);
              } else {
                setSelectedTalentIdForHistory(null);
                setIsHistoryOpen(true);
              }
            }}
            className={cn(
              "flex items-center gap-2 border-gray-200 font-bold transition-colors rounded-xl h-10 shadow-sm",
              isHistoryOpen
                ? "bg-gray-100 text-gray-900 border-gray-300"
                : "bg-white text-gray-700 hover:bg-gray-50",
            )}
          >
            {isHistoryOpen ? (
              <>
                <X className="w-4 h-4 text-gray-400" /> Hide History
              </>
            ) : (
              <>
                <History className="w-4 h-4 text-gray-400" /> View History
              </>
            )}
          </Button>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow className="hover:bg-transparent border-gray-100">
                <TableHead className="font-bold text-gray-500 text-[12px] uppercase tracking-wider pl-6 h-12">
                  Talent
                </TableHead>
                <TableHead className="font-bold text-gray-500 text-[12px] uppercase tracking-wider h-12">
                  Current Tier
                </TableHead>
                <TableHead className="font-bold text-gray-500 text-[12px] uppercase tracking-wider h-12">
                  30d Earnings
                </TableHead>
                <TableHead className="font-bold text-gray-500 text-[12px] uppercase tracking-wider h-12">
                  Effective Rate
                </TableHead>
                <TableHead className="font-bold text-gray-500 text-[12px] uppercase tracking-wider h-12 w-[220px]">
                  Custom Rate
                </TableHead>
                <TableHead className="h-12 w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allTalents.length > 0 ? (
                allTalents.map((talent) => (
                  <TalentCommissionRow
                    key={talent.id}
                    talent={talent}
                    onUpdate={(rate) =>
                      updateCommissionMutation.mutate({
                        talentId: talent.id,
                        rate,
                      })
                    }
                    isUpdating={updateCommissionMutation.isPending}
                    onViewHistory={() => {
                      setSelectedTalentIdForHistory(talent.id);
                      setIsHistoryOpen(true);
                    }}
                  />
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-gray-500 font-medium"
                  >
                    No talent found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {isHistoryOpen && (
        <div className="animate-in slide-in-from-top-4 duration-300">
          <Card className="bg-gray-50/50 border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-8 pb-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-500" /> Commission
                  History
                </h3>
                <p className="text-sm text-gray-500 font-medium">
                  Running log of all commission rate changes
                  {selectedTalentIdForHistory &&
                    allTalents.find((t) => t.id === selectedTalentIdForHistory)
                      ?.name && (
                      <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-xs font-bold">
                        Filter:{" "}
                        {
                          allTalents.find(
                            (t) => t.id === selectedTalentIdForHistory,
                          )?.name
                        }
                      </span>
                    )}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsHistoryOpen(false)}
                className="font-bold text-xs text-gray-400 hover:text-gray-900 gap-2"
              >
                <X className="w-4 h-4" /> HIDE HISTORY
              </Button>
            </div>
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
              {filteredHistory && filteredHistory.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {filteredHistory.map((log) => (
                    <div
                      key={log.id}
                      className="p-6 hover:bg-white transition-colors flex items-start gap-4"
                    >
                      <div className="mt-1 p-2 bg-indigo-50 text-indigo-600 rounded-full">
                        <History className="w-4 h-4" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-gray-900">
                            {log.talent_name}
                          </p>
                          <span className="text-xs text-gray-400 font-medium">
                            {format(
                              new Date(log.changed_at),
                              "MMM d, yyyy h:mm a",
                            )}
                          </span>
                        </div>
                        <p className="text-[13px] text-gray-600">
                          Rate changed from{" "}
                          <span className="font-bold text-gray-900">
                            {log.old_rate !== null
                              ? `${log.old_rate}%`
                              : "Tier Default"}
                          </span>{" "}
                          to{" "}
                          <span className="font-bold text-indigo-600">
                            {log.new_rate}%
                          </span>
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-xs text-gray-400 font-medium bg-white border border-gray-100 px-2 py-0.5 rounded-md">
                            Changed by: {log.changed_by_name || "Admin"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="p-4 bg-white rounded-full mb-4 shadow-sm border border-gray-100">
                    <History className="w-8 h-8 text-gray-200" />
                  </div>
                  <p className="text-sm font-bold text-gray-900">
                    No history found
                  </p>
                  <p className="text-xs text-gray-500 mt-1 font-medium">
                    Changes to commission rates will appear here
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PerformanceTiers;

const TalentCommissionRow: React.FC<{
  talent: TalentPerformance;
  onUpdate: (rate: number | null) => void;
  isUpdating: boolean;
  onViewHistory: () => void;
}> = ({ talent, onUpdate, isUpdating, onViewHistory }) => {
  const [customRate, setCustomRate] = useState<string>(
    talent.is_custom_rate ? talent.commission_rate.toString() : "",
  );
  const [isFocused, setIsFocused] = useState(false);

  // Sync with prop updates
  useEffect(() => {
    setCustomRate(
      talent.is_custom_rate ? talent.commission_rate.toString() : "",
    );
  }, [talent.is_custom_rate, talent.commission_rate]);

  const hasChanged =
    (talent.is_custom_rate &&
      customRate !== talent.commission_rate.toString()) ||
    (!talent.is_custom_rate && customRate !== "");

  const handleSave = () => {
    if (customRate === "") {
      onUpdate(null);
    } else {
      const val = parseFloat(customRate);
      if (!isNaN(val) && val >= 0 && val <= 100) {
        onUpdate(val);
      } else {
        toast.error("Please enter a valid rate between 0 and 100");
      }
    }
  };

  const tierConfig = TIER_CONFIG[talent.tier.tier_name] || TIER_CONFIG.Inactive;

  return (
    <TableRow className="group hover:bg-gray-50/50 transition-colors border-gray-100">
      <TableCell className="pl-6 py-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9 border border-gray-200 rounded-lg">
            <AvatarImage
              src={talent.photo_url || ""}
              className="rounded-lg object-cover"
            />
            <AvatarFallback className="rounded-lg bg-gray-100 text-gray-500 font-bold text-xs">
              {talent.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="font-bold text-gray-900 text-sm">{talent.name}</span>
        </div>
      </TableCell>
      <TableCell className="py-4">
        <Badge
          variant="outline"
          className={cn(
            "rounded-md px-2.5 py-0.5 font-bold border-0",
            tierConfig.modalBg,
            tierConfig.brandColor,
          )}
        >
          {tierConfig.label.split("-")[1].trim()}
        </Badge>
      </TableCell>
      <TableCell className="py-4">
        <span className="font-bold text-gray-600 text-sm">
          {currencyFormatter.format(talent.earnings_30d)}
        </span>
      </TableCell>
      <TableCell className="py-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900 text-sm">
            {talent.commission_rate}%
          </span>
          {talent.is_custom_rate && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3.5 h-3.5 text-indigo-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium text-xs">Custom rate set</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </TableCell>
      <TableCell className="py-4">
        <div className="flex items-center gap-2">
          <div className="relative w-24">
            <Input
              type="number"
              value={customRate}
              onChange={(e) => setCustomRate(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => {
                setIsFocused(false);
                // Optional: reset if not changed and empty?
              }}
              placeholder="Default"
              className={cn(
                "h-9 text-right pr-7 font-bold text-sm transition-all",
                talent.is_custom_rate
                  ? "border-indigo-200 bg-indigo-50/50 text-indigo-700"
                  : "border-gray-200 text-gray-600 placeholder:text-gray-300",
                isFocused && "border-indigo-500 ring-2 ring-indigo-100",
              )}
            />
            <span className="absolute right-2.5 top-2.5 text-xs font-bold text-gray-400 pointer-events-none">
              %
            </span>
          </div>
          {hasChanged && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isUpdating}
              className="h-9 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold animate-in fade-in zoom-in duration-200 rounded-lg shadow-sm"
            >
              {isUpdating ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </Button>
          )}
          {talent.is_custom_rate && !hasChanged && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onUpdate(null)}
                    className="h-9 w-9 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium text-xs">Reset to Tier Rate</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </TableCell>
      <TableCell className="py-4 text-right pr-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewHistory}
          className="h-8 w-8 p-0 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <History className="w-4 h-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
};
