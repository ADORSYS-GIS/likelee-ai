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
} from "lucide-react";
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

const TIER_CONFIG: Record<string, any> = {
    Premium: {
        label: "Tier 1 - Premium",
        icon: Trophy,
        color: "border-yellow-400",
        textColor: "text-yellow-500",
        iconBg: "bg-[#FAFAF5]",
        statsBg: "bg-[#FFFEF0]",
        statsBorder: "border-yellow-50",
        recommendation: "Prioritize for high-value campaigns. Consider exclusive partnerships.",
        thresholds: "≥ $5,000/mo • ≥ 8 bookings",
        id: "Premium",
    },
    Core: {
        label: "Tier 2 - Core",
        icon: TrendingUp,
        color: "border-blue-400",
        textColor: "text-blue-500",
        iconBg: "bg-[#FAFCFF]",
        statsBg: "bg-[#F5F9FF]",
        statsBorder: "border-blue-50",
        recommendation: "Stable performers. Focus on increasing campaign frequency and average deal value.",
        thresholds: "≥ $2,500/mo • ≥ 5 bookings",
        id: "Core",
    },
    Growth: {
        label: "Tier 3 - Growth",
        icon: Target,
        color: "border-emerald-400",
        textColor: "text-emerald-500",
        iconBg: "bg-[#FAFFFC]",
        statsBg: "bg-[#F5FFF8]",
        statsBorder: "border-emerald-50",
        recommendation: "Invest in portfolio development. Increase brand exposure and campaign opportunities.",
        thresholds: "≥ $500/mo • ≥ 1 bookings",
        id: "Growth",
    },
    Inactive: {
        label: "Tier 4 - Needs Attention",
        icon: AlertCircle,
        color: "border-gray-300",
        textColor: "text-gray-500",
        iconBg: "bg-gray-50",
        statsBg: "bg-gray-50",
        statsBorder: "border-gray-100",
        recommendation: "Requires immediate action. Consider portfolio refresh, marketing push, or roster review.",
        thresholds: "Includes all talent that don't meet Tier 3 requirements",
        id: "Inactive",
    },
};

interface TierRule {
    tier_name: string;
    tier_level: number;
    min_monthly_earnings: number;
    min_monthly_bookings: number;
    description: string | null;
}

interface TalentPerformance {
    id: string;
    name: string;
    photo_url: string | null;
    earnings_30d: number;
    bookings_this_month: number;
    tier: TierRule;
}

interface TierGroup {
    name: string;
    level: number;
    description: string;
    talents: TalentPerformance[];
}

interface PerformanceTiersResponse {
    tiers: TierGroup[];
    config?: Record<string, { min_earnings: number; min_bookings: number }>;
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
});

export const PerformanceTiers: React.FC = () => {
    const queryClient = useQueryClient();
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [configForm, setConfigForm] = useState<Record<string, { min_earnings: number; min_bookings: number }>>({
        Premium: { min_earnings: 5000, min_bookings: 8 },
        Core: { min_earnings: 2500, min_bookings: 5 },
        Growth: { min_earnings: 500, min_bookings: 1 },
    });

    const { data, isLoading, error } = useQuery<PerformanceTiersResponse>({
        queryKey: ["performance-tiers"],
        queryFn: async () => {
            const { data: { session } } = (await supabase?.auth.getSession()) || { data: { session: null } };
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (session?.access_token) {
                headers["Authorization"] = `Bearer ${session.access_token}`;
            }
            const resp = await fetch("/api/agency/dashboard/performance-tiers", { headers });
            if (!resp.ok) {
                const text = await resp.text();
                throw new Error(`Failed to fetch: ${resp.status} ${text}`);
            }
            return resp.json();
        },
    });

    useEffect(() => {
        if (data?.config) {
            setConfigForm(data.config as any);
        }
    }, [data?.config]);

    const configMutation = useMutation({
        mutationFn: async (config: any) => {
            const { data: { session } } = (await supabase?.auth.getSession()) || { data: { session: null } };
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (session?.access_token) {
                headers["Authorization"] = `Bearer ${session.access_token}`;
            }
            const resp = await fetch("/api/agency/dashboard/performance-tiers/configure", {
                method: "POST",
                headers,
                body: JSON.stringify({ config }),
            });
            if (!resp.ok) throw new Error("Failed to update configuration");
            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["performance-tiers"] });
            setIsConfigModalOpen(false);
            toast.success("Tier thresholds updated successfully");
        },
        onError: (err: any) => {
            toast.error(err.message || "Failed to update configuration");
        }
    });

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
            <Card className="w-full border-red-200 bg-red-50">
                <CardContent className="p-4 text-red-600">Error: {(error as Error).message}</CardContent>
            </Card>
        );
    }

    const totalTalents = data?.tiers.reduce((acc, t) => acc + t.talents.length, 0) || 0;

    const handleSaveConfig = () => {
        configMutation.mutate(configForm);
    };

    const handleResetToDefaults = () => {
        const defaults = {
            Premium: { min_earnings: 5000, min_bookings: 8 },
            Core: { min_earnings: 2500, min_bookings: 5 },
            Growth: { min_earnings: 500, min_bookings: 1 },
        };
        setConfigForm(defaults);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-12">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Performance Tiers</h1>
                    <p className="text-gray-500 font-medium text-sm mt-1">Talent segmented by earnings and activity levels</p>
                </div>
                <Button
                    variant="outline"
                    onClick={() => setIsConfigModalOpen(true)}
                    className="flex items-center gap-2 border-gray-300 font-bold text-gray-700 bg-white shadow-sm"
                >
                    <Settings className="w-4 h-4 text-gray-400" /> Configure Tiers
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Object.keys(TIER_CONFIG).map((key) => {
                    const cfg = TIER_CONFIG[key];
                    const group = data?.tiers.find((t) => t.name === key) || { talents: [] };
                    return (
                        <Card key={key} className={cn("p-6 bg-white border-2 shadow-sm rounded-xl hover:shadow-md transition-shadow", cfg.color)}>
                            <div className="flex flex-col h-full">
                                <div className="mb-4">
                                    <cfg.icon className={cn("w-10 h-10", cfg.textColor)} />
                                </div>
                                <h3 className="text-sm font-bold text-gray-900 mb-1">{cfg.label}</h3>
                                <div className="flex items-baseline gap-1.5 mt-auto">
                                    <span className="text-3xl font-bold text-gray-900">{group.talents.length}</span>
                                    <span className="text-xs text-gray-500 font-medium pb-1">talent</span>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            <div className="space-y-12 mt-12">
                {data?.tiers.map((group) => {
                    const cfg = TIER_CONFIG[group.name] || TIER_CONFIG.Inactive;
                    const avgEarnings =
                        group.talents.length > 0 ? group.talents.reduce((acc, t) => acc + t.earnings_30d, 0) / group.talents.length : 0;
                    const avgBookings =
                        group.talents.length > 0 ? group.talents.reduce((acc, t) => acc + t.bookings_this_month, 0) / group.talents.length : 0;
                    const percentOfRoster = totalTalents > 0 ? Math.round((group.talents.length / totalTalents) * 100) : 0;

                    // Get threshold string from data.config if available, otherwise use defaults
                    let thresholdStr = cfg.thresholds;
                    if (data?.config && data.config[group.name]) {
                        const c = data.config[group.name];
                        thresholdStr = `≥ ${currencyFormatter.format(c.min_earnings)}/mo • ≥ ${c.min_bookings} bookings`;
                    } else if (group.name === "Inactive") {
                        thresholdStr = "Includes all talent that don't meet Tier 3 requirements";
                    }

                    return (
                        <div key={group.name} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-8">
                            <div className="flex items-center gap-4 mb-8">
                                <div className={cn("p-4 rounded-xl", cfg.iconBg)}>
                                    <cfg.icon className={cn("w-6 h-6", cfg.textColor)} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 leading-tight">{cfg.label}</h2>
                                    <p className="text-sm text-gray-500 font-medium">{thresholdStr}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div className={cn("p-6 rounded-2xl border", cfg.statsBg, cfg.statsBorder)}>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                            <DollarSign className={cn("w-4 h-4", cfg.textColor)} />
                                        </div>
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Avg Monthly Earnings</span>
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900">{currencyFormatter.format(avgEarnings)}</div>
                                </div>

                                <div className={cn("p-6 rounded-2xl border", cfg.statsBg, cfg.statsBorder)}>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                            <Calendar className={cn("w-4 h-4", cfg.textColor)} />
                                        </div>
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Avg Booking Frequency</span>
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900">
                                        {avgBookings.toFixed(1)} <span className="text-sm font-medium text-gray-500">campaigns/month</span>
                                    </div>
                                </div>

                                <div className={cn("p-6 rounded-2xl border", cfg.statsBg, cfg.statsBorder)}>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                            <Users className={cn("w-4 h-4", cfg.textColor)} />
                                        </div>
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Talent</span>
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900">
                                        {group.talents.length} <span className="text-sm font-medium text-gray-500">{percentOfRoster}% of roster</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#F5F8FF] border border-[#E0E7FF] p-5 rounded-2xl flex items-start gap-4 mb-8">
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border-[3px] border-[#C7D2FE] flex-shrink-0 mt-0.5 shadow-sm">
                                    <Check className="w-4 h-4 text-indigo-600" strokeWidth={3} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 mb-1">Agency Recommendation</h4>
                                    <p className="text-[13px] text-[#4F46E5] font-semibold leading-snug">{cfg.recommendation}</p>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-bold text-gray-900 mb-6 font-bold">Talent in This Tier</h4>
                                <div className="space-y-3">
                                    {group.talents.length > 0 ? (
                                        group.talents.map((talent) => (
                                            <div
                                                key={talent.id}
                                                className="flex items-center gap-4 p-5 border border-gray-100 rounded-2xl bg-white shadow-sm hover:shadow-md hover:border-indigo-100 transition-all group"
                                            >
                                                <Avatar className="w-14 h-14 rounded-2xl object-cover bg-gray-50 shadow-sm border border-gray-50">
                                                    <AvatarImage src={talent.photo_url || ""} />
                                                    <AvatarFallback className="bg-indigo-50 text-indigo-700 text-xs">
                                                        {talent.name.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-gray-900 text-[15px]">{talent.name}</span>
                                                        <CheckCircle2 className="w-4 h-4 text-green-500 fill-green-500/10" />
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400">
                                                        <span className="text-gray-900 font-bold">{currencyFormatter.format(talent.earnings_30d)}/mo</span>
                                                        <span className="text-gray-300">•</span>
                                                        <span className="flex items-center gap-1 group-hover:text-indigo-500 transition-colors">
                                                            <TrendingUp className="w-3.5 h-3.5" /> {talent.bookings_this_month} campaigns
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="hidden md:flex flex-col items-center gap-2 w-48 mr-6">
                                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-50">
                                                        <div
                                                            className="h-full bg-gray-900 rounded-full"
                                                            style={{ width: talent.tier.tier_name === "Premium" ? "85%" : talent.tier.tier_name === "Core" ? "65%" : "45%" }}
                                                        ></div>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-10 font-bold text-gray-700 bg-white border-gray-200 px-6 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                                                >
                                                    View
                                                </Button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-16 text-center bg-gray-50/30 rounded-2xl border border-dashed border-gray-200">
                                            <div className="p-6 bg-white rounded-full mb-4 shadow-sm">
                                                <Users className="w-12 h-12 text-gray-100" />
                                            </div>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                                                No talent assigned to<br />this performance tier yet
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
                <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl max-h-[90vh] flex flex-col">
                    <DialogHeader className="p-8 pb-4 flex-shrink-0">
                        <DialogTitle className="text-2xl font-bold text-gray-900">Configure Performance Tier Thresholds</DialogTitle>
                        <DialogDescription className="text-gray-500 font-medium pt-1">
                            Set minimum earnings and booking requirements for each tier
                        </DialogDescription>
                    </DialogHeader>

                    <div className="px-8 py-2 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                        <div className="space-y-6 pb-6">
                            {["Premium", "Core", "Growth"].map((tier) => (
                                <div key={tier} className={cn("p-6 rounded-2xl border-2 transition-all", TIER_CONFIG[tier].color, TIER_CONFIG[tier].iconBg)}>
                                    <div className="flex items-center gap-2 mb-4">
                                        {React.createElement(TIER_CONFIG[tier].icon, { className: cn("w-5 h-5", TIER_CONFIG[tier].textColor) })}
                                        <span className="font-bold text-gray-900">{TIER_CONFIG[tier].label}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-[13px] font-bold text-gray-600 ml-1">Minimum Monthly Earnings ($)</Label>
                                            <Input
                                                type="number"
                                                value={configForm[tier]?.min_earnings}
                                                onChange={(e) => setConfigForm({
                                                    ...configForm,
                                                    [tier]: { ...configForm[tier], min_earnings: Number(e.target.value) }
                                                })}
                                                className="h-12 bg-white border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[13px] font-bold text-gray-600 ml-1">Minimum Bookings/Month</Label>
                                            <Input
                                                type="number"
                                                value={configForm[tier]?.min_bookings}
                                                onChange={(e) => setConfigForm({
                                                    ...configForm,
                                                    [tier]: { ...configForm[tier], min_bookings: Number(e.target.value) }
                                                })}
                                                className="h-12 bg-white border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <p className="text-[13px] text-gray-400 font-medium italic pl-1 mb-4">
                                Note: Tier 4 includes all talent that don't meet Tier 3 requirements.
                            </p>
                        </div>
                    </div>

                    <div className="px-8 pb-10 pt-2 flex flex-col sm:flex-row gap-3 sm:justify-end flex-shrink-0">
                        <Button
                            variant="outline"
                            onClick={handleResetToDefaults}
                            className="h-11 px-6 rounded-xl border-gray-200 font-bold text-gray-700 hover:bg-gray-50 order-2 sm:order-1"
                        >
                            Reset to Defaults
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setIsConfigModalOpen(false)}
                            className="h-11 px-6 rounded-xl border-gray-200 font-bold text-gray-700 hover:bg-gray-50 order-3 sm:order-2"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveConfig}
                            disabled={configMutation.isPending}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 px-8 rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-70 order-1 sm:order-3 min-w-[140px]"
                        >
                            {configMutation.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PerformanceTiers;
