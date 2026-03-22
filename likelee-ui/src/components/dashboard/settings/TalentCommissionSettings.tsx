import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  RefreshCw,
  Save,
  X,
  Target,
  Trophy,
  TrendingUp,
  AlertCircle,
  Undo2,
  ChevronRight,
  DollarSign,
  Info,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TIER_CONFIG: Record<string, any> = {
  Premium: {
    icon: Trophy,
    color: "text-amber-500",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-100",
  },
  Core: {
    icon: TrendingUp,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-100",
  },
  Growth: {
    icon: Target,
    color: "text-emerald-500",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-100",
  },
  Inactive: {
    icon: AlertCircle,
    color: "text-gray-400",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
  },
};

interface TalentPerformance {
  id: string;
  name: string;
  photo_url: string | null;
  tier: {
    tier_name: string;
    commission_rate: number;
  };
  commission_rate: number;
  is_custom_rate: boolean;
}

interface PerformanceTiersResponse {
  tiers: {
    name: string;
    talents: TalentPerformance[];
  }[];
}

export const TalentCommissionSettings: React.FC<{
  entitySingularLower: string;
}> = ({ entitySingularLower }) => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [draftRates, setDraftRates] = useState<Record<string, string>>({});

  const { data, isLoading, isError } = useQuery<PerformanceTiersResponse>({
    queryKey: ["performance-tiers"],
    queryFn: () => base44.get("/agency/dashboard/performance-tiers"),
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: { creatorId: string; rate: number | null }[]) => {
      await base44.post("/agency/dashboard/talent-commissions/bulk-update", {
        updates: updates.map(u => ({
          creator_id: u.creatorId,
          custom_rate: u.rate,
        })),
      });
      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["performance-tiers"] });
      toast.success(`${variables.length > 1 ? `${variables.length} commission settings` : "Commission setting"} updated successfully`);
      setDraftRates({});
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update commission settings");
    },
  });

  const allTalents = React.useMemo(() => {
    if (!data?.tiers) return [];
    return data.tiers.flatMap((tier) => tier.talents);
  }, [data]);

  const filteredTalents = React.useMemo(() => {
    if (!searchTerm) return allTalents;
    const term = searchTerm.toLowerCase();
    return allTalents.filter((t) => t.name.toLowerCase().includes(term));
  }, [allTalents, searchTerm]);

  const handleRateChange = (talentId: string, value: string) => {
    setDraftRates((prev) => ({ ...prev, [talentId]: value }));
  };

  const handleBulkSave = () => {
    const updates = Object.entries(draftRates).map(([talentId, rate]) => ({
      creatorId: talentId,
      rate: parseFloat(rate),
    }));
    updateMutation.mutate(updates);
  };

  const resetRate = (talentId: string) => {
    updateMutation.mutate([{ creatorId: talentId, rate: null }]);
    setDraftRates((prev) => {
      const next = { ...prev };
      delete next[talentId];
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
        <p className="text-sm font-bold text-gray-500">Loading roster data...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-red-50/50 rounded-2xl border border-dashed border-red-200">
        <AlertCircle className="w-8 h-8 text-red-500 mb-4" />
        <p className="text-sm font-bold text-red-600">Failed to load roster data</p>
        <Button
          variant="ghost"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["performance-tiers"] })}
          className="mt-4 text-red-700 hover:bg-red-100 font-bold"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden border border-gray-200 shadow-sm rounded-2xl bg-white">
      <div className="p-4 bg-blue-50/50 border-b border-blue-100 flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 border border-blue-200">
          <Info className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-blue-900 leading-tight">Connection Required</h4>
          <p className="text-xs text-blue-700/80 font-medium mt-0.5 leading-relaxed">
            Only talents with an active creator account are listed here. To manage commissions for pending or uninvited roster members, please ensure they have accepted their invitation to the talent portal.
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={`Search ${entitySingularLower} by name...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 bg-white border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/10"
            />
          </div>
          <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-indigo-500" />
              Custom Rate
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-gray-300" />
              Tier Default
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">
                {entitySingularLower}
              </th>
              <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">
                Current Tier
              </th>
              <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">
                Effective Rate
              </th>
              <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">
                Override Rate (%)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredTalents.length > 0 ? (
              filteredTalents.map((talent) => {
                const tier = TIER_CONFIG[talent.tier.tier_name] || TIER_CONFIG.Inactive;
                const TierIcon = tier.icon;
                const draft = draftRates[talent.id];
                const isDirty = draft !== undefined;

                return (
                  <tr key={talent.id} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border border-gray-100 shadow-sm">
                          <AvatarImage src={talent.photo_url || ""} />
                          <AvatarFallback className="bg-indigo-50 text-indigo-700 text-xs font-bold">
                            {talent.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{talent.name}</p>
                          <div className={cn(
                            "inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold mt-1 border",
                            talent.is_custom_rate
                              ? "bg-indigo-50 text-indigo-600 border-indigo-100"
                              : "bg-gray-50 text-gray-400 border-gray-100"
                          )}>
                            {talent.is_custom_rate ? "Custom Applied" : "Using Default"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <div className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-sm",
                          tier.bgColor,
                          tier.borderColor
                        )}>
                          <TierIcon className={cn("w-3.5 h-3.5", tier.color)} />
                          <span className={cn("text-xs font-bold", tier.color)}>
                            {talent.tier.tier_name}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-center justify-center">
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-lg font-black text-gray-900 leading-none">
                            {talent.commission_rate}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400">%</span>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-1">
                          Agency Share
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <div className="relative group/input">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={draft ?? talent.commission_rate}
                            onChange={(e) => handleRateChange(talent.id, e.target.value)}
                            className={cn(
                              "w-24 h-9 text-right pr-7 font-bold text-sm bg-white border-gray-200 rounded-lg transition-all",
                              isDirty ? "border-indigo-300 ring-2 ring-indigo-500/10" : "group-hover/input:border-gray-300"
                            )}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 pointer-events-none">
                            %
                          </span>
                        </div>

                        {isDirty ? (
                          <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-200">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setDraftRates(prev => {
                                  const next = { ...prev };
                                  delete next[talent.id];
                                  return next;
                                });
                              }}
                              className="w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                              title="Discard change"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : talent.is_custom_rate ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => resetRate(talent.id)}
                            title="Reset to tier default"
                            className="w-8 h-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Undo2 className="w-4 h-4" />
                          </Button>
                        ) : (
                          <div className="w-8 h-8" />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                      <Target className="w-6 h-6 text-gray-200" />
                    </div>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                      {searchTerm ? "No results found" : `No ${entitySingularLower} found`}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 sm:p-6 bg-indigo-50/50 border-t border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 border border-indigo-200">
            <DollarSign className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-1">Commission Model</h4>
            <p className="text-xs text-indigo-700/80 font-medium leading-relaxed max-w-2xl">
              Commission rates represent the <span className="font-bold underline decoration-indigo-300">agency's share</span>.
              The {entitySingularLower} will receive the remaining amount (e.g., if agency commission is 20%,
              the {entitySingularLower} receives 80% of the gross payment).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {Object.keys(draftRates).length > 0 && (
            <Button
              variant="ghost"
              onClick={() => setDraftRates({})}
              className="h-12 px-6 rounded-xl font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all border border-gray-200 bg-white"
            >
              Discard All
            </Button>
          )}
          
          <Button
            className={cn(
              "rounded-xl px-8 h-12 font-bold shadow-lg transition-all gap-2 relative overflow-hidden min-w-[200px]",
              Object.keys(draftRates).length > 0
                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200/50 hover:scale-[1.02] active:scale-[0.98]"
                : "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
            )}
            disabled={Object.keys(draftRates).length === 0 || updateMutation.isPending}
            onClick={handleBulkSave}
          >
            {updateMutation.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes {Object.keys(draftRates).length > 0 && `(${Object.keys(draftRates).length})`}
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default TalentCommissionSettings;
