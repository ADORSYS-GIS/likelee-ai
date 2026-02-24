import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DollarSign,
    TrendingUp,
    BarChart2,
    User,
    Users,
    AlertCircle,
    CheckCircle2,
    ShieldCheck,
    Download,
    Settings,
} from "lucide-react";
import { RefreshCw } from "lucide-react";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";

import { ComplianceRenewableLicense } from "@/types/licensing";

const formatLicenseDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "N/A";
    return format(d, "MMM d, yyyy");
};

const PlaceholderView = ({ title }: { title: string }) => (
    <div className="flex flex-col items-center justify-center h-full py-20 text-center">
        <div className="bg-gray-100 p-6 rounded-full mb-4">
            <Settings className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-500 max-w-sm">
            This section is currently under development. Check back soon for updates.
        </p>
    </div>
);

interface AnalyticsDashboardViewProps {
    onRenewLicense?: (license: ComplianceRenewableLicense) => void;
    agencyMode: "AI" | "IRL";
    licenseComplianceData: any[];
    talentData: any[];
}

const ANALYTICS_CACHE_TTL_MS = 10 * 60 * 1000;

const AnalyticsDashboardView = ({
    onRenewLicense,
    agencyMode,
    licenseComplianceData,
    talentData,
}: AnalyticsDashboardViewProps) => {
    // Use a single shared cache key - data is fetched for the current mode
    // and persisted so switching modes doesn't cause a re-fetch within TTL.
    const analyticsCacheKey =
        agencyMode === "AI"
            ? "__agencyAnalyticsDashboardCache_ai"
            : "__agencyAnalyticsDashboardCache_irl";

    const initialHasWarmCache = useMemo(() => {
        const cache = (globalThis as any)[analyticsCacheKey];
        return cache && Date.now() - cache.fetchedAt < ANALYTICS_CACHE_TTL_MS;
    }, [analyticsCacheKey]);

    const { toast } = useToast();
    const analyticsModeQuery = agencyMode === "AI" ? "ai" : "irl";
    const [activeTab, setActiveTab] = useState("Overview");
    const [analytics, setAnalytics] = useState<any>(
        initialHasWarmCache
            ? (globalThis as any)[analyticsCacheKey].analytics
            : null,
    );
    const [rosterInsights, setRosterInsights] = useState<any>(
        initialHasWarmCache
            ? (globalThis as any)[analyticsCacheKey].rosterInsights
            : null,
    );
    const [clientsAnalytics, setClientsAnalytics] = useState<any>(
        initialHasWarmCache
            ? (globalThis as any)[analyticsCacheKey].clientsAnalytics
            : null,
    );
    const [expiredLicensesFromDB, setExpiredLicensesFromDB] = useState<any[]>([]);
    const [loading, setLoading] = useState(!initialHasWarmCache);
    const [error, setError] = useState<string | null>(null);

    // Fetch expired licenses from DB when Compliance tab is active
    useEffect(() => {
        if (activeTab !== "Compliance") return;
        let active = true;
        (async () => {
            const session = (await supabase?.auth.getSession())?.data?.session;
            const token = session?.access_token;
            if (!token) return;
            const res = await fetch(
                `/api/agency/analytics/expired-licenses`,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            if (res.ok && active) {
                const data = await res.json();
                setExpiredLicensesFromDB(Array.isArray(data) ? data : []);
            }
        })();
        return () => { active = false; };
    }, [activeTab]);

    const subTabs =
        agencyMode === "AI"
            ? ["Overview", "Roster Insights", "Clients & Campaigns", "Compliance"]
            : ["Overview", "Roster Insights", "Clients & Campaigns"];

    useEffect(() => {
        let isMounted = true;

        async function fetchAllAnalytics() {
            const shouldBlockUI = !initialHasWarmCache;
            if (shouldBlockUI) setLoading(true);

            try {
                const session = (await supabase?.auth.getSession())?.data?.session;
                const token = session?.access_token;
                if (!token) throw new Error("Not authenticated");

                const overviewRes = await fetch(
                    `/api/agency/analytics/dashboard?mode=${analyticsModeQuery}`,
                    { headers: { Authorization: `Bearer ${token}` } },
                );

                if (!overviewRes.ok) throw new Error("Failed to fetch analytics overview");

                const overviewData = await overviewRes.json();
                const existingCache = (globalThis as any)[analyticsCacheKey] || {};

                (globalThis as any)[analyticsCacheKey] = {
                    analytics: overviewData,
                    rosterInsights: existingCache.rosterInsights ?? null,
                    clientsAnalytics: existingCache.clientsAnalytics ?? null,
                    fetchedAt: Date.now(),
                };

                if (isMounted) {
                    setAnalytics(overviewData);
                    setError(null);
                    if (shouldBlockUI) setLoading(false);
                }

                const [rosterRes, clientsRes] = await Promise.allSettled([
                    fetch(`/api/agency/analytics/roster?mode=${analyticsModeQuery}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    fetch(
                        `/api/agency/analytics/clients-campaigns?mode=${analyticsModeQuery}`,
                        { headers: { Authorization: `Bearer ${token}` } },
                    ),
                ]);

                let nextRosterInsights =
                    (globalThis as any)[analyticsCacheKey]?.rosterInsights ?? null;
                if (rosterRes.status === "fulfilled" && rosterRes.value.ok) {
                    const data = await rosterRes.value.json();
                    nextRosterInsights = data;
                    if (isMounted) setRosterInsights(data);
                }

                let nextClientsAnalytics =
                    (globalThis as any)[analyticsCacheKey]?.clientsAnalytics ?? null;
                if (clientsRes.status === "fulfilled" && clientsRes.value.ok) {
                    const data = await clientsRes.value.json();
                    nextClientsAnalytics = data;
                    if (isMounted) setClientsAnalytics(data);
                }

                (globalThis as any)[analyticsCacheKey] = {
                    analytics: overviewData,
                    rosterInsights: nextRosterInsights,
                    clientsAnalytics: nextClientsAnalytics,
                    fetchedAt: Date.now(),
                };
            } catch (err: any) {
                if (!isMounted) return;
                console.error(err);
                setError(err.message);
                toast({ title: "Analytics error", description: err.message, variant: "destructive" });
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        fetchAllAnalytics();

        return () => {
            isMounted = false;
        };
        // analyticsModeQuery intentionally omitted: data is cached per-mode so
        // toggling AI ⇔ IRL re-uses the warm cache instead of re-fetching.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialHasWarmCache, analyticsCacheKey]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-gray-500">Loading analytics...</div>
            </div>
        );
    }

    if (error || !analytics) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-red-500">Failed to load analytics data</div>
            </div>
        );
    }

    const campaignStatusData = [
        { name: "In Progress", value: analytics.campaign_status.in_progress, color: "#111827" },
        { name: "Ready to Launch", value: analytics.campaign_status.ready_to_launch, color: "#9ca3af" },
        { name: "Completed", value: analytics.campaign_status.completed, color: "#374151" },
    ];

    const totalCampaigns =
        analytics.campaign_status.in_progress +
        analytics.campaign_status.ready_to_launch +
        analytics.campaign_status.completed;

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center bg-white p-6 border-b border-gray-100">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
                    <div className="flex bg-gray-100 p-1 rounded-xl mt-6 w-fit">
                        {subTabs.map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 text-sm font-semibold transition-all rounded-lg ${activeTab === tab
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
                <Button
                    variant="outline"
                    className="gap-2 border-gray-200 font-bold bg-white h-10 px-4 text-sm hover:bg-gray-50 transition-all"
                >
                    <Download className="w-4 h-4" /> Export Report
                </Button>
            </div>

            {activeTab === "Overview" ? (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="grid grid-cols-3 gap-6">
                        {/* Total Earnings */}
                        <Card className="p-8 bg-white border border-gray-900 shadow-sm relative overflow-hidden flex flex-col justify-center min-h-[420px]">
                            <div className="relative z-10">
                                <div className="mb-6 flex items-center justify-between">
                                    <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center border border-green-100">
                                        <DollarSign className="w-7 h-7 text-green-600" />
                                    </div>
                                    <TrendingUp className="w-5 h-5 text-green-500" />
                                </div>
                                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">
                                    Total Earnings (30d)
                                </p>
                                <h3 className="text-5xl font-black text-gray-900 tracking-tighter mb-4">
                                    {analytics.overview.total_earnings_formatted}
                                </h3>
                                <p
                                    className={`text-xs font-bold flex items-center gap-1.5 ${analytics.overview.earnings_growth_percentage >= 0
                                        ? "text-green-600"
                                        : "text-red-600"
                                        }`}
                                >
                                    <TrendingUp className="w-3.5 h-3.5" />{" "}
                                    {analytics.overview.earnings_growth_percentage >= 0 ? "+" : ""}
                                    {analytics.overview.earnings_growth_percentage}% vs last period
                                </p>
                            </div>
                        </Card>

                        {/* Right side — mode dependent */}
                        {agencyMode === "AI" ? (
                            <div className="col-span-2 flex flex-col gap-6">
                                <Card className="p-8 bg-white border border-gray-900 shadow-sm relative overflow-hidden h-[200px] flex flex-col justify-center">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div className="mb-4">
                                                <BarChart2 className="w-8 h-8 text-indigo-600" />
                                            </div>
                                            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">
                                                Active Licenses
                                            </p>
                                            <h3 className="text-5xl font-black text-gray-900 tracking-tighter">
                                                {analytics.overview.active_campaigns}
                                            </h3>
                                            <p className="text-xs font-bold text-indigo-600 flex items-center gap-1.5 mt-2">
                                                <TrendingUp className="w-3.5 h-3.5" /> +12% growth
                                            </p>
                                        </div>
                                        <div className="w-16 h-16 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
                                            <ShieldCheck className="w-8 h-8 text-indigo-600" />
                                        </div>
                                    </div>
                                </Card>
                                <Card className="p-8 bg-white border border-gray-900 shadow-sm relative overflow-hidden h-[195px] flex flex-col justify-center">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div className="mb-4">
                                                <TrendingUp className="w-8 h-8 text-purple-600" />
                                            </div>
                                            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">
                                                AI Usages (30d)
                                            </p>
                                            <h3 className="text-5xl font-black text-gray-900 tracking-tighter">
                                                {analytics.ai_usage.total_usages_30d}
                                            </h3>
                                            <p className="text-xs font-bold text-purple-600 flex items-center gap-1.5 mt-2">
                                                <TrendingUp className="w-3.5 h-3.5" /> +18% vs last period
                                            </p>
                                        </div>
                                        <div className="w-16 h-16 bg-purple-50 rounded-xl flex items-center justify-center border border-purple-100">
                                            <BarChart2 className="w-8 h-8 text-purple-600" />
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        ) : (
                            <Card className="col-span-2 p-8 bg-white border border-gray-900 shadow-sm relative overflow-hidden flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-10">
                                    <div className="flex gap-5 items-center">
                                        <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
                                            <BarChart2 className="w-8 h-8 text-indigo-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                                                Active Campaigns
                                            </p>
                                            <h3 className="text-5xl font-black text-gray-900 tracking-tighter">
                                                {analytics.overview.active_campaigns}
                                            </h3>
                                        </div>
                                    </div>
                                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div className="grid grid-cols-3 gap-4 mb-10">
                                    <div className="p-6 bg-gray-50/50 border border-gray-100 rounded-2xl">
                                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Value</p>
                                        <p className="text-2xl font-black text-gray-900">{analytics.overview.total_earnings_formatted}</p>
                                    </div>
                                    <div className="p-6 bg-gray-50/50 border border-gray-100 rounded-2xl">
                                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Avg Value</p>
                                        <p className="text-2xl font-black text-gray-900">{analytics.overview.avg_value_formatted}</p>
                                    </div>
                                    <div className="p-6 bg-gray-50/50 border border-gray-100 rounded-2xl">
                                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Top Scope</p>
                                        <p className="text-lg font-black text-gray-900 tracking-tight">{analytics.overview.top_scope}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[11px] font-black text-gray-400 uppercase mb-5 tracking-[0.2em]">
                                        Campaign Status Breakdown
                                    </p>
                                    <div className="space-y-6">
                                        {campaignStatusData.map((status, i) => (
                                            <div key={i} className="space-y-2">
                                                <div className="flex justify-between items-center text-xs font-black text-gray-600 tracking-wider">
                                                    <span className="uppercase">{status.name}</span>
                                                    <span>{status.value}</span>
                                                </div>
                                                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gray-900"
                                                        style={{
                                                            width: `${totalCampaigns > 0 ? (status.value / totalCampaigns) * 100 : 0}%`,
                                                            backgroundColor: status.color,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Card>
                        )}
                    </div>

                    {/* Monthly Performance Trends */}
                    <Card className="p-8 bg-white border border-gray-900 shadow-sm">
                        <div className="flex justify-between items-center mb-10">
                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-[0.15em]">
                                Monthly Performance Trends
                            </h3>
                            <TrendingUp className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                    data={analytics.monthly_trends}
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: "bold", fill: "#94a3b8" }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: "bold", fill: "#94a3b8" }} />
                                    <RechartsTooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontWeight: "bold" }} />
                                    <Legend iconType="circle" wrapperStyle={{ paddingTop: "40px", fontWeight: "bold", fontSize: "12px" }} formatter={(value) => <span className="text-gray-600 uppercase tracking-widest">{value}</span>} />
                                    <Line type="monotone" dataKey="earnings" name="Earnings ($)" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6 }} />
                                    <Line type="monotone" dataKey="campaigns" name={agencyMode === "AI" ? "Licenses" : "Campaigns"} stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: "#6366f1", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6 }} />
                                    {agencyMode === "AI" && (
                                        <Line type="monotone" dataKey="usages" name="AI Usages" stroke="#a855f7" strokeWidth={3} dot={{ r: 4, fill: "#a855f7", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6 }} />
                                    )}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    {/* Distribution Pie Charts */}
                    <div className="grid grid-cols-2 gap-6 pb-10">
                        <Card className="p-8 bg-white border border-gray-900 shadow-sm">
                            <h3 className="text-lg font-black text-gray-900 mb-10 uppercase tracking-[0.1em]">
                                AI Usage Type Distribution
                            </h3>
                            <div className="flex flex-col items-center">
                                <div className="h-[280px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: "Image", value: analytics.ai_usage.usage_by_type.image, color: "#60a5fa" },
                                                    { name: "Video", value: analytics.ai_usage.usage_by_type.video, color: "#8b5cf6" },
                                                    { name: "Voice", value: analytics.ai_usage.usage_by_type.voice, color: "#ec4899" },
                                                ]}
                                                cx="50%" cy="50%" innerRadius={0} outerRadius={100} dataKey="value" stroke="none"
                                            >
                                                {[{ color: "#60a5fa" }, { color: "#8b5cf6" }, { color: "#ec4899" }].map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="w-full mt-8 flex flex-col gap-3">
                                    {[
                                        { name: "Image", value: analytics.ai_usage.usage_by_type.image },
                                        { name: "Video", value: analytics.ai_usage.usage_by_type.video },
                                        { name: "Voice", value: analytics.ai_usage.usage_by_type.voice },
                                    ].map((item) => (
                                        <div key={item.name} className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-gray-900 uppercase tracking-widest">
                                                {item.name}: {item.value}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>

                        <Card className="p-8 bg-white border border-gray-900 shadow-sm">
                            <h3 className="text-lg font-black text-gray-900 mb-10 uppercase tracking-[0.1em]">
                                Consent Status Breakdown
                            </h3>
                            <div className="flex flex-col items-center">
                                <div className="h-[280px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        {(() => {
                                            const total = analytics.consent_status.total || 1;
                                            const completePct = Math.round((analytics.consent_status.complete / total) * 100);
                                            const missingPct = Math.round((analytics.consent_status.missing / total) * 100);
                                            const expiringPct = Math.round((analytics.consent_status.expiring / total) * 100);
                                            const otherPct = Math.max(0, 100 - completePct - missingPct - expiringPct);
                                            const pieData = [
                                                { name: "Complete", value: completePct, color: "#10b981" },
                                                { name: "Missing", value: missingPct, color: "#f59e0b" },
                                                { name: "Expiring", value: expiringPct, color: "#facc15" },
                                                ...(otherPct > 0 ? [{ name: "No Consent Data", value: otherPct, color: "#e5e7eb" }] : []),
                                            ];
                                            return (
                                                <PieChart>
                                                    <Pie
                                                        data={pieData}
                                                        cx="50%" cy="50%" innerRadius={0} outerRadius={100} dataKey="value" stroke="none"
                                                    >
                                                        {pieData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <RechartsTooltip formatter={(val: number) => `${val}%`} />
                                                </PieChart>
                                            );
                                        })()}
                                    </ResponsiveContainer>
                                </div>
                                <div className="w-full mt-8 flex flex-col gap-3 text-right">
                                    {[
                                        { name: "Complete", value: analytics.consent_status.complete, color: "text-green-600" },
                                        { name: "Missing", value: analytics.consent_status.missing, color: "text-amber-600" },
                                        { name: "Expiring", value: analytics.consent_status.expiring, color: "text-yellow-500" },
                                    ].map((item) => {
                                        const total = analytics.consent_status.total || 1;
                                        const pct = Math.round((item.value / total) * 100);
                                        return (
                                            <div key={item.name} className="flex items-center justify-between">
                                                <span className={`text-xs font-bold uppercase tracking-widest ${item.color}`}>{item.name}</span>
                                                <span className="text-xs font-bold text-gray-900">{item.value} of {analytics.consent_status.total} ({pct}%)</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            ) : activeTab === "Roster Insights" ? (
                rosterInsights ? (
                    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-[0.15em] mb-10">
                            Earnings by Talent (Last 30 Days)
                        </h3>
                        <Card className="p-10 bg-white border border-gray-900 shadow-sm mb-8">
                            <div className="h-[500px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={rosterInsights.talent_metrics.map((m: any) => ({
                                            name: m.talent_name,
                                            earnings: m.earnings_30d_cents / 100,
                                            projected: m.projected_earnings_cents / 100,
                                        }))}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fontWeight: "bold", fill: "#64748b" }} dy={15} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 13, fontWeight: "bold", fill: "#94a3b8" }} tickFormatter={(val) => `$${val}`} />
                                        <RechartsTooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontWeight: "bold" }} formatter={(val: number) => `$${val.toLocaleString()}`} cursor={false} />
                                        <Legend verticalAlign="bottom" align="center" iconType="rect" wrapperStyle={{ paddingTop: "40px", fontWeight: "bold", fontSize: "13px" }} formatter={(value) => <span className="text-gray-700 uppercase tracking-widest px-2">{value === "earnings" ? "30D Earnings ($)" : "Projected ($)"}</span>} />
                                        <Bar dataKey="earnings" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} name="earnings" />
                                        <Bar dataKey="projected" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} name="projected" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        <div className="grid grid-cols-3 gap-6 mb-8">
                            {[
                                { label: "Top Performer (Earnings)", data: rosterInsights.top_performer, borderColor: "border-green-500", textColor: "text-green-600" },
                                { label: `Most Active (${agencyMode === "AI" ? "Licenses" : "Campaigns"})`, data: rosterInsights.most_active, borderColor: "border-indigo-500", textColor: "text-blue-600" },
                                { label: "Highest Followers", data: rosterInsights.highest_engagement, borderColor: "border-purple-500", textColor: "text-purple-600" },
                            ].map(({ label, data, borderColor, textColor }) => (
                                <Card key={label} className="p-6 bg-white border border-gray-900 shadow-sm relative overflow-hidden">
                                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6">{label}</p>
                                    {data ? (
                                        <div className="flex items-center gap-5">
                                            <div className={`w-16 h-16 rounded-xl overflow-hidden border-2 ${borderColor} p-0.5`}>
                                                {data.image_url ? (
                                                    <img src={data.image_url} alt={data.talent_name} className="w-full h-full object-cover rounded-lg" />
                                                ) : (
                                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-lg">
                                                        <User className="w-8 h-8 text-gray-400" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-black text-gray-900 tracking-tight">{data.talent_name}</h4>
                                                <p className={`text-2xl font-black ${textColor}`}>{data.value}</p>
                                                <p className="text-[11px] font-bold text-gray-500 mt-1">{data.sub_text}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-gray-400 text-sm">No data available</div>
                                    )}
                                </Card>
                            ))}
                        </div>

                        <Card className="bg-white border border-gray-900 shadow-sm overflow-hidden mb-8">
                            <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest">Talent Performance Metrics</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-50/80">
                                            {["Talent", "30D Earnings", agencyMode === "AI" ? "Licenses" : "Campaigns", "Avg Value", "Status"].map((h) => (
                                                <th key={h} className="px-8 py-5 text-[11px] font-black text-gray-500 uppercase tracking-widest">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {rosterInsights.talent_metrics.map((talent: any) => (
                                            <tr key={talent.talent_id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        {talent.image_url ? (
                                                            <img src={talent.image_url} alt={talent.talent_name} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center border border-gray-200">
                                                                <User className="w-4 h-4 text-gray-400" />
                                                            </div>
                                                        )}
                                                        <span className="text-sm font-bold text-gray-900">{talent.talent_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-sm font-black text-gray-900">{talent.earnings_30d_formatted}</td>
                                                <td className="px-8 py-5 text-sm font-bold text-gray-600">{talent.campaigns_count_30d}</td>
                                                <td className="px-8 py-5 text-sm font-bold text-gray-600">{talent.avg_value_formatted}</td>
                                                <td className="px-8 py-5">
                                                    <Badge className={`font-bold text-[10px] py-0.5 ${talent.status === "Active" ? "bg-green-50 text-green-600 border-green-100" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                                                        {talent.status}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-96">
                        <div className="text-gray-500">Loading roster insights...</div>
                    </div>
                )
            ) : activeTab === "Clients & Campaigns" ? (
                clientsAnalytics ? (
                    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
                        <div className="grid grid-cols-2 gap-6">
                            <Card className="p-10 bg-white border border-gray-900 shadow-sm">
                                <h3 className="text-xl font-bold text-gray-900 mb-12 tracking-tight">Earnings by Client</h3>
                                <div className="h-[350px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={clientsAnalytics.earnings_by_client} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="budget" stroke="none">
                                                {clientsAnalytics.earnings_by_client.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip contentStyle={{ borderRadius: "12px", border: "none", fontWeight: "bold" }} />
                                            <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{ paddingLeft: "20px", fontWeight: "bold" }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                            <Card className="p-10 bg-white border border-gray-900 shadow-sm">
                                <h3 className="text-xl font-bold text-gray-900 mb-12 tracking-tight">Geographic Distribution</h3>
                                <div className="h-[350px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={clientsAnalytics.geographic_distribution} margin={{ left: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: "bold", fill: "#64748b" }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 13, fontWeight: "bold", fill: "#64748b" }} />
                                            <RechartsTooltip contentStyle={{ borderRadius: "12px", border: "none", fontWeight: "bold" }} cursor={{ fill: "#f8fafc" }} />
                                            <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                                                {clientsAnalytics.geographic_distribution.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        </div>

                        <Card className="bg-white border border-gray-900 shadow-sm overflow-hidden">
                            <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-gray-900 tracking-tight">Top Clients Performance</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-50/80">
                                            <th className="px-8 py-5 text-[11px] font-bold text-gray-500 tracking-widest">Client</th>
                                            <th className="px-8 py-5 text-[11px] font-bold text-gray-500 tracking-widest text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {clientsAnalytics.top_clients_performance.map((client: any) => (
                                            <tr key={client.name} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-8 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-gray-900">{client.name}</span>
                                                        <span className="text-[10px] text-gray-500 font-bold">{client.campaigns} {agencyMode === "AI" ? "licenses" : "campaigns"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-sm font-bold text-green-600">${client.budget.toLocaleString()}</span>
                                                        <span className="text-[10px] text-gray-400 font-bold">{client.percentage.toFixed(1)}% of total</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                        <div className={`grid gap-6 ${agencyMode === "AI" ? "grid-cols-2" : "grid-cols-3"}`}>
                            <Card className="p-8 bg-white border border-gray-900 shadow-sm relative overflow-hidden flex flex-col justify-center h-[180px]">
                                <p className="text-sm font-bold text-gray-500 mb-2">Repeat Client Rate</p>
                                <h3 className="text-4xl font-bold text-gray-900 tracking-tighter">{clientsAnalytics.repeat_client_rate.toFixed(0)}%</h3>
                                <div className="w-full bg-gray-100 h-1.5 rounded-full mt-4 overflow-hidden">
                                    <div className="h-full bg-gray-900 rounded-full" style={{ width: `${clientsAnalytics.repeat_client_rate}%` }} />
                                </div>
                            </Card>
                            {agencyMode !== "AI" && (
                                <Card className="p-8 bg-white border border-gray-900 shadow-sm relative overflow-hidden flex flex-col justify-center h-[180px]">
                                    <p className="text-sm font-bold text-gray-500 mb-2">Avg Campaign Duration</p>
                                    <h3 className="text-4xl font-bold text-gray-900 tracking-tighter">{clientsAnalytics.avg_campaign_duration} days</h3>
                                    <p className="text-xs text-gray-500 mt-2 font-medium">From booking to completion</p>
                                </Card>
                            )}
                            <Card className="p-8 bg-white border border-gray-900 shadow-sm relative overflow-hidden flex flex-col justify-center h-[180px]">
                                <p className="text-sm font-bold text-gray-500 mb-2">Client Acquisition</p>
                                <h3 className="text-4xl font-bold text-green-600 tracking-tighter">{clientsAnalytics.client_acquisition}</h3>
                                <p className="text-xs text-green-600/70 mt-2 font-bold">New clients in the last 30 days</p>
                            </Card>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-96">
                        <div className="text-gray-500">Loading clients &amp; campaigns analytics...</div>
                    </div>
                )
            ) : activeTab === "Compliance" ? (
                (() => {
                    const totalTalents = analytics.consent_status.total;
                    const activeCount = analytics.consent_status.complete;
                    const activePct = totalTalents ? Math.round((activeCount / totalTalents) * 100) : 0;
                    const verifiedCount = analytics.consent_status.verified;
                    const verificationPct = totalTalents ? Math.round((verifiedCount / totalTalents) * 100) : 0;
                    const expiringSoonLicensesCount = analytics.consent_status.expiring;
                    const consentExpiringCount = analytics.consent_status.expiring;
                    const missingCount = analytics.consent_status.missing;
                    const completePct = activePct;
                    const expiringPct = totalTalents ? Math.round((consentExpiringCount / totalTalents) * 100) : 0;
                    const missingPct = Math.max(100 - completePct - expiringPct, 0);

                    const parseUsDate = (v: string) => {
                        if (!v || v === "—" || v === "N/A") return null;
                        const parts = v.split("/").map((p) => Number(p));
                        if (parts.length !== 3 || parts.some((p) => Number.isNaN(p))) return null;
                        const [m, d, y] = parts;
                        if (!m || !d || !y) return null;
                        const dt = new Date(y, m - 1, d);
                        return Number.isNaN(dt.getTime()) ? null : dt;
                    };

                    const startOfToday = () => {
                        const now = new Date();
                        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    };

                    const daysUntil = (dt: Date) => {
                        const base = startOfToday();
                        return Math.floor((dt.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
                    };

                    const upcomingLicenses = licenseComplianceData
                        .map((l: any) => {
                            const dt = parseUsDate(String(l.expiry));
                            return { license: l, expiryDate: dt, daysUntil: dt ? daysUntil(dt) : null };
                        })
                        .filter((x: any) => x.expiryDate && x.daysUntil !== null) as Array<{ license: any; expiryDate: Date; daysUntil: number }>;

                    const nextLicense = upcomingLicenses.filter((x) => x.daysUntil >= 0).sort((a, b) => a.daysUntil - b.daysUntil)[0];
                    const pipelineTalentName = nextLicense?.license?.talent || "Julia";
                    const pipelineTalent = talentData.find((t: any) => t.name === pipelineTalentName) || talentData.find((t: any) => t.id === "julia");

                    const effectiveExpired: any[] = expiredLicensesFromDB.map((x: any) => ({
                        id: x.id,
                        template_id: x.id,
                        talent_name: x.talent_name ?? x.talent ?? "Unknown",
                        talent_avatar: x.talent_avatar ?? null,
                        brand: x.brand_name ?? x.client_name ?? "—",
                        end_date: x.deadline ?? x.effective_end_date ?? x.end_date ?? null,
                        client_name: x.brand_name ?? x.client_name ?? "—",
                    }));

                    return (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    { icon: <ShieldCheck className="w-5 h-5 text-green-600" />, label: "Verification Rate", value: `${verificationPct}%`, sub: `${verifiedCount} of ${totalTalents} verified`, pct: verificationPct, barColor: "bg-gray-900" },
                                    { icon: <CheckCircle2 className="w-5 h-5 text-green-600" />, label: "Active Consents", value: `${activePct}%`, sub: `${activeCount} of ${totalTalents} complete`, pct: activePct, barColor: "bg-gray-400" },
                                    { icon: <AlertCircle className="w-5 h-5 text-orange-600" />, label: "Expiring Soon", value: String(expiringSoonLicensesCount), sub: "Next 10 days", pct: null, barColor: "" },
                                ].map(({ icon, label, value, sub, pct, barColor }) => (
                                    <Card key={label} className="p-8 bg-white border border-gray-900 shadow-sm rounded-lg">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center">{icon}</div>
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
                                                <h3 className="text-3xl font-black text-gray-900 tracking-tighter">{value}</h3>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            {pct !== null && (
                                                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                                    <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
                                                </div>
                                            )}
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{sub}</p>
                                        </div>
                                    </Card>
                                ))}
                            </div>

                            <Card className="p-8 bg-white border border-gray-900 shadow-sm rounded-lg">
                                <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest mb-6">License Expiry Pipeline</h3>
                                <div className="space-y-3">
                                    {effectiveExpired.length === 0 ? (
                                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
                                            <p className="text-sm font-bold text-gray-900">No expired licenses</p>
                                            <p className="text-xs font-medium text-gray-500 mt-1">Expired contracts will appear here for renewal.</p>
                                        </div>
                                    ) : (
                                        (effectiveExpired as any[]).map((license) => (
                                            <div key={license.id} className="bg-[#FFF7ED] border border-orange-100 p-4 rounded-xl flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-white border border-orange-100 shrink-0">
                                                        {license.talent_avatar ? (
                                                            <img src={license.talent_avatar} alt={license.talent_name || "Talent"} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-orange-400">
                                                                <Users className="w-5 h-5" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-black text-gray-900 truncate">{license.talent_name || "Assigned Talent"}</p>
                                                        <p className="text-xs font-bold text-gray-500 truncate">Expired on {formatLicenseDate(license.end_date)}</p>
                                                    </div>
                                                </div>
                                                <Button className="bg-[#EA580C] hover:bg-[#C2410C] text-white font-black text-xs px-6 h-10 rounded-lg uppercase tracking-widest gap-2" onClick={() => onRenewLicense?.(license)}>
                                                    <RefreshCw className="w-4 h-4" /> Renew
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </Card>

                            <Card className="p-8 bg-white border border-gray-900 shadow-sm rounded-lg">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-widest mb-10">Compliance Summary</h3>
                                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6">Consent Status Distribution</p>
                                        <div className="space-y-8">
                                            {[
                                                { label: "Complete", count: activeCount, pct: completePct, labelColor: "text-green-600", barClass: "bg-gray-900" },
                                                { label: "Expiring", count: consentExpiringCount, pct: expiringPct, labelColor: "text-orange-600", barClass: "bg-[#FB923C]/30" },
                                                { label: "Missing", count: missingCount, pct: missingPct, labelColor: "text-red-600", barClass: "bg-[#FECACA]" },
                                            ].map(({ label, count, pct, labelColor, barClass }) => (
                                                <div key={label} className="space-y-3">
                                                    <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest">
                                                        <span className="text-gray-600">{label}</span>
                                                        <span className={labelColor}>{count} ({pct}%)</span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                                        <div className={`h-full ${barClass} rounded-full`} style={{ width: `${pct}%` }} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-10 relative">
                                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-[2px] rounded-xl">
                                            <div className="bg-black/80 text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg">Coming Soon</div>
                                        </div>
                                        <div className="opacity-50 pointer-events-none select-none filter blur-[2px]">
                                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Likeness Protection</p>
                                            <div className="space-y-4">
                                                {[{ label: "Authorized Uses (30d)", value: 73, color: "green" }, { label: "Unauthorized Alerts", value: 0, color: "red" }, { label: "Disputes Resolved", value: 2, color: "blue" }].map(({ label, value, color }) => (
                                                    <div key={label} className={`flex items-center justify-between p-6 bg-${color}-50/50 border border-${color}-100 rounded-xl`}>
                                                        <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">{label}</span>
                                                        <span className={`text-3xl font-black text-${color}-600`}>{value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    );
                })()
            ) : (
                <PlaceholderView title={activeTab} />
            )}
        </div>
    );
};

export default AnalyticsDashboardView;
