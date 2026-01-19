import React, { useState, useEffect } from "react";
import {
    Trophy,
    TrendingUp,
    Target,
    AlertCircle,
    DollarSign,
    FileText,
    Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TALENT_DATA } from "@/data/mockData";

interface PerformanceTiersViewProps {
    onBack: () => void;
}

export const PerformanceTiersView: React.FC<PerformanceTiersViewProps> = ({
    onBack,
}) => {
    const [tiersData, setTiersData] = useState<any[]>([]);
    const [talentsByTier, setTalentsByTier] = useState<Record<string, any[]>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Tier UI configuration (styling and icons)
    const tierConfig = [
        {
            id: "Premium",
            label: "Tier 1 - Premium",
            icon: Trophy,
            color: "border-yellow-400",
            textColor: "text-yellow-500",
            bg: "bg-[#FFFEF0]",
            iconBg: "bg-[#FEFCE8]",
            desc: "Top 10% earners with high activity",
            recommendation:
                "Prioritize for high-value campaigns. Consider exclusive partnerships.",
        },
        {
            id: "Core",
            label: "Tier 2 - Core",
            icon: TrendingUp,
            color: "border-blue-400",
            textColor: "text-blue-500",
            bg: "bg-[#F5F9FF]",
            iconBg: "bg-[#EFF6FF]",
            desc: "Mid-tier earners with consistent bookings",
            recommendation:
                "Stable performers. Focus on increasing campaign frequency and average deal value.",
        },
        {
            id: "Growth",
            label: "Tier 3 - Growth",
            icon: Target,
            color: "border-green-400",
            textColor: "text-green-500",
            bg: "bg-[#F5FFF8]",
            iconBg: "bg-[#F0FDF4]",
            desc: "Newer or emerging talent",
            recommendation:
                "Invest in portfolio development. Increase brand exposure and campaign opportunities.",
        },
        {
            id: "Inactive",
            label: "Tier 4 - Inactive",
            icon: AlertCircle,
            color: "border-gray-300",
            textColor: "text-gray-500",
            bg: "bg-gray-50",
            iconBg: "bg-gray-100",
            desc: "Requires immediate attention",
            recommendation:
                "Requires immediate action. Consider portfolio refresh, marketing push, or roster review.",
        },
    ];

    // Fetch tier data from API
    useEffect(() => {
        const fetchTiersData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Fetch tier summary data
                const tiersResponse = await fetch("/api/performance-tiers");
                if (!tiersResponse.ok) {
                    throw new Error("Failed to fetch performance tiers");
                }
                const tiers = await tiersResponse.json();
                setTiersData(tiers);

                // Fetch talents for each tier
                const talentsData: Record<string, any[]> = {};
                for (const tier of tiers) {
                    try {
                        const talentsResponse = await fetch(
                            `/api/performance-tiers/${tier.tier_name}/talents`,
                        );
                        if (talentsResponse.ok) {
                            const talents = await talentsResponse.json();
                            talentsData[tier.tier_name] = talents;
                        } else {
                            talentsData[tier.tier_name] = [];
                        }
                    } catch (err) {
                        console.error(`Error fetching talents for ${tier.tier_name}:`, err);
                        talentsData[tier.tier_name] = [];
                    }
                }
                setTalentsByTier(talentsData);
            } catch (err) {
                console.error("Error fetching performance tiers:", err);
                setError(err instanceof Error ? err.message : "Unknown error");
            } finally {
                setLoading(false);
            }
        };

        fetchTiersData();
    }, []);

    // Merge API data with UI configuration
    const tiers = tierConfig.map((config) => {
        const apiData = tiersData.find((t) => t.tier_name === config.id);
        return {
            ...config,
            count: apiData?.talent_count || 0,
            avgEarnings: apiData?.avg_monthly_earnings
                ? `$${Math.round(apiData.avg_monthly_earnings).toLocaleString()}`
                : "$0",
            freq: apiData?.avg_booking_frequency
                ? apiData.avg_booking_frequency.toFixed(1)
                : "0.0",
        };
    });

    // Show loading state
    if (loading) {
        return (
            <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
                <div className="flex justify-between items-start">
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
                        onClick={onBack}
                        className="flex items-center gap-2 border-gray-300 font-bold text-gray-700 bg-white shadow-sm"
                    >
                        <TrendingUp className="w-4 h-4 text-gray-400" /> View All Roster
                    </Button>
                </div>
                <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-4 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p className="text-gray-600 font-medium">
                            Loading performance tiers...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Show error state with fallback to mock data
    if (error) {
        console.warn("Using mock data due to API error:", error);
        // Fall back to mock data from TALENT_DATA
        const mockTiers = tierConfig.map((config) => ({
            ...config,
            count: TALENT_DATA.filter((t: any) => t.tier === config.id).length,
            avgEarnings:
                config.id === "Premium"
                    ? "$6,800"
                    : config.id === "Core"
                        ? "$3,200"
                        : config.id === "Growth"
                            ? "$2,400"
                            : "$0",
            freq:
                config.id === "Premium"
                    ? "13.0"
                    : config.id === "Core"
                        ? "6.0"
                        : config.id === "Growth"
                            ? "4.0"
                            : "0.0",
        }));

        return (
            <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-start">
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
                        onClick={onBack}
                        className="flex items-center gap-2 border-gray-300 font-bold text-gray-700 bg-white shadow-sm"
                    >
                        <TrendingUp className="w-4 h-4 text-gray-400" /> View All Roster
                    </Button>
                </div>

                {/* Error Banner */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-amber-900">Using Demo Data</p>
                        <p className="text-xs text-amber-700 mt-1">
                            Unable to load live data. Showing sample tier information for
                            demonstration purposes.
                        </p>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {mockTiers.map((tier) => (
                        <Card
                            key={tier.id}
                            className={`p-6 bg-white border-2 ${tier.color} shadow-sm rounded-xl hover:shadow-md transition-shadow`}
                        >
                            <div className="flex flex-col h-full">
                                <div className="mb-4">
                                    <tier.icon className={`w-10 h-10 ${tier.textColor}`} />
                                </div>
                                <h3 className="text-sm font-bold text-gray-900 mb-1">
                                    {tier.label}
                                </h3>
                                <div className="flex items-baseline gap-1.5 mt-auto">
                                    <span className="text-3xl font-bold text-gray-900">
                                        {tier.count}
                                    </span>
                                    <span className="text-xs text-gray-500 font-medium pb-1">
                                        talent
                                    </span>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Detail Sections with Mock Data */}
                <div className="space-y-12">
                    {mockTiers.map((tier) => {
                        const talentInTier = TALENT_DATA.filter(
                            (t: any) => t.tier === tier.id,
                        );
                        return (
                            <div
                                key={tier.id}
                                className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-8"
                            >
                                {/* Tier Info Header */}
                                <div className="flex items-center gap-4 mb-8">
                                    <div
                                        className={`p-4 rounded-xl ${tier.id === "Premium" ? "bg-[#FAFAF5]" : tier.id === "Core" ? "bg-[#FAFCFF]" : tier.id === "Growth" ? "bg-[#FAFFFC]" : "bg-gray-50"}`}
                                    >
                                        <tier.icon className={`w-6 h-6 ${tier.textColor}`} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 leading-tight">
                                            {tier.label}
                                        </h2>
                                        <p className="text-sm text-gray-500 font-medium">
                                            {tier.desc}
                                        </p>
                                    </div>
                                </div>

                                {/* Tier Stats Row */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    <div
                                        className={`p-6 rounded-2xl border ${tier.id === "Premium" ? "bg-[#FFFEF0] border-yellow-50" : tier.id === "Core" ? "bg-[#F5F9FF] border-blue-50" : tier.id === "Growth" ? "bg-[#F5FFF8] border-green-50" : "bg-gray-50 border-gray-100"}`}
                                    >
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="p-2 bg-white rounded-lg shadow-sm">
                                                <DollarSign className={`w-4 h-4 ${tier.textColor}`} />
                                            </div>
                                            <span className="text-xs font-bold text-gray-500">
                                                Avg Monthly Earnings
                                            </span>
                                        </div>
                                        <div className="text-2xl font-bold text-gray-900">
                                            {tier.avgEarnings}
                                        </div>
                                    </div>

                                    <div
                                        className={`p-6 rounded-2xl border ${tier.id === "Premium" ? "bg-[#FFFEF0] border-yellow-50" : tier.id === "Core" ? "bg-[#F5F9FF] border-blue-50" : tier.id === "Growth" ? "bg-[#F5FFF8] border-green-50" : "bg-gray-50 border-gray-100"}`}
                                    >
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="p-2 bg-white rounded-lg shadow-sm">
                                                <FileText className={`w-4 h-4 ${tier.textColor}`} />
                                            </div>
                                            <span className="text-xs font-bold text-gray-500">
                                                Avg Booking Frequency
                                            </span>
                                        </div>
                                        <div className="text-2xl font-bold text-gray-900">
                                            {tier.freq}
                                        </div>
                                    </div>

                                    <div
                                        className={`p-6 rounded-2xl border ${tier.id === "Premium" ? "bg-[#FFFEF0] border-yellow-50" : tier.id === "Core" ? "bg-[#F5F9FF] border-blue-50" : tier.id === "Growth" ? "bg-[#F5FFF8] border-green-50" : "bg-gray-50 border-gray-100"}`}
                                    >
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="p-2 bg-white rounded-lg shadow-sm">
                                                <Users className={`w-4 h-4 ${tier.textColor}`} />
                                            </div>
                                            <span className="text-xs font-bold text-gray-500">
                                                Total Talent
                                            </span>
                                        </div>
                                        <div className="text-2xl font-bold text-gray-900">
                                            {talentInTier.length}
                                        </div>
                                    </div>
                                </div>

                                {/* Recommendation Box */}
                                <div className="bg-[#F5F8FF] border border-[#E0E7FF] p-5 rounded-2xl flex items-start gap-4 mb-8">
                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border-[3px] border-[#C7D2FE] flex-shrink-0 mt-0.5 shadow-sm">
                                        <svg
                                            className="w-4 h-4 text-indigo-600"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={3}
                                                d="M5 13l4 4L19 7"
                                            />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 mb-1">
                                            Agency Recommendation
                                        </h4>
                                        <p className="text-[13px] text-[#4F46E5] font-semibold leading-snug">
                                            {tier.recommendation}
                                        </p>
                                    </div>
                                </div>

                                {/* Talent List in Tier */}
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 mb-6">
                                        Talent in This Tier
                                    </h4>
                                    <div className="space-y-3">
                                        {talentInTier.length > 0 ? (
                                            [...talentInTier]
                                                .sort(
                                                    (a: any, b: any) =>
                                                        (a.sortOrder || 99) - (b.sortOrder || 99),
                                                )
                                                .map((t) => (
                                                    <div
                                                        key={t.id}
                                                        className="flex items-center gap-4 p-5 border border-gray-100 rounded-2xl bg-white shadow-sm hover:shadow-md hover:border-indigo-100 transition-all group"
                                                    >
                                                        <img
                                                            src={t.img}
                                                            alt={t.name}
                                                            className="w-14 h-14 rounded-2xl object-cover bg-gray-50 shadow-sm border border-gray-50"
                                                        />
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-bold text-gray-900 text-[15px]">
                                                                    {t.name}
                                                                </span>
                                                                <div className="bg-green-100 p-0.5 rounded-full">
                                                                    <svg
                                                                        className="w-2.5 h-2.5 text-green-600"
                                                                        fill="currentColor"
                                                                        viewBox="0 0 20 20"
                                                                    >
                                                                        <path
                                                                            fillRule="evenodd"
                                                                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                                            clipRule="evenodd"
                                                                        />
                                                                    </svg>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400">
                                                                <span className="text-gray-900 font-bold">
                                                                    {t.earnings}/mo
                                                                </span>
                                                                <span className="text-gray-300">•</span>
                                                                <span className="flex items-center gap-1 group-hover:text-indigo-500 transition-colors">
                                                                    <TrendingUp className="w-3.5 h-3.5" />{" "}
                                                                    {t.campaigns} campaigns
                                                                </span>
                                                                <span className="text-gray-300">•</span>
                                                                <span>{t.engagement} engagement</span>
                                                            </div>
                                                        </div>
                                                        <div className="hidden md:flex flex-col items-center gap-2 w-48 mr-6">
                                                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-50">
                                                                <div
                                                                    className="h-full bg-gray-900 rounded-full"
                                                                    style={{
                                                                        width:
                                                                            (t as any).id === "carla"
                                                                                ? "85%"
                                                                                : (t as any).tier === "Core"
                                                                                    ? "65%"
                                                                                    : (t as any).tier === "Growth"
                                                                                        ? "45%"
                                                                                        : "10%",
                                                                    }}
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
            </div>
        );
    }

    // Render with real API data
    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-start">
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
                    onClick={onBack}
                    className="flex items-center gap-2 border-gray-300 font-bold text-gray-700 bg-white shadow-sm"
                >
                    <TrendingUp className="w-4 h-4 text-gray-400" /> View All Roster
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {tiers.map((tier) => (
                    <Card
                        key={tier.id}
                        className={`p-6 bg-white border-2 ${tier.color} shadow-sm rounded-xl hover:shadow-md transition-shadow`}
                    >
                        <div className="flex flex-col h-full">
                            <div className="mb-4">
                                <tier.icon className={`w-10 h-10 ${tier.textColor}`} />
                            </div>
                            <h3 className="text-sm font-bold text-gray-900 mb-1">
                                {tier.label}
                            </h3>
                            <div className="flex items-baseline gap-1.5 mt-auto">
                                <span className="text-3xl font-bold text-gray-900">
                                    {tier.count}
                                </span>
                                <span className="text-xs text-gray-500 font-medium pb-1">
                                    talent
                                </span>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Detail Sections */}
            <div className="space-y-12">
                {tiers.map((tier) => {
                    const talentInTier = talentsByTier[tier.id] || [];
                    return (
                        <div
                            key={tier.id}
                            className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-8"
                        >
                            {/* Tier Info Header */}
                            <div className="flex items-center gap-4 mb-8">
                                <div
                                    className={`p-4 rounded-xl ${tier.id === "Premium" ? "bg-[#FAFAF5]" : tier.id === "Core" ? "bg-[#FAFCFF]" : tier.id === "Growth" ? "bg-[#FAFFFC]" : "bg-gray-50"}`}
                                >
                                    <tier.icon className={`w-6 h-6 ${tier.textColor}`} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 leading-tight">
                                        {tier.label}
                                    </h2>
                                    <p className="text-sm text-gray-500 font-medium">
                                        {tier.desc}
                                    </p>
                                </div>
                            </div>

                            {/* Tier Stats Row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div
                                    className={`p-6 rounded-2xl border ${tier.id === "Premium" ? "bg-[#FFFEF0] border-yellow-50" : tier.id === "Core" ? "bg-[#F5F9FF] border-blue-50" : tier.id === "Growth" ? "bg-[#F5FFF8] border-green-50" : "bg-gray-50 border-gray-100"}`}
                                >
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                            <DollarSign className={`w-4 h-4 ${tier.textColor}`} />
                                        </div>
                                        <span className="text-xs font-bold text-gray-500">
                                            Avg Monthly Earnings
                                        </span>
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900">
                                        {tier.avgEarnings}
                                    </div>
                                </div>

                                <div
                                    className={`p-6 rounded-2xl border ${tier.id === "Premium" ? "bg-[#FFFEF0] border-yellow-50" : tier.id === "Core" ? "bg-[#F5F9FF] border-blue-50" : tier.id === "Growth" ? "bg-[#F5FFF8] border-green-50" : "bg-gray-50 border-gray-100"}`}
                                >
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                            <FileText className={`w-4 h-4 ${tier.textColor}`} />
                                        </div>
                                        <span className="text-xs font-bold text-gray-500">
                                            Avg Booking Frequency
                                        </span>
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900">
                                        {tier.freq}
                                    </div>
                                </div>

                                <div
                                    className={`p-6 rounded-2xl border ${tier.id === "Premium" ? "bg-[#FFFEF0] border-yellow-50" : tier.id === "Core" ? "bg-[#F5F9FF] border-blue-50" : tier.id === "Growth" ? "bg-[#F5FFF8] border-green-50" : "bg-gray-50 border-gray-100"}`}
                                >
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                            <Users className={`w-4 h-4 ${tier.textColor}`} />
                                        </div>
                                        <span className="text-xs font-bold text-gray-500">
                                            Total Talent
                                        </span>
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900">
                                        {talentInTier.length}
                                    </div>
                                </div>
                            </div>

                            {/* Recommendation Box */}
                            <div className="bg-[#F5F8FF] border border-[#E0E7FF] p-5 rounded-2xl flex items-start gap-4 mb-8">
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border-[3px] border-[#C7D2FE] flex-shrink-0 mt-0.5 shadow-sm">
                                    <svg
                                        className="w-4 h-4 text-indigo-600"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={3}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 mb-1">
                                        Agency Recommendation
                                    </h4>
                                    <p className="text-[13px] text-[#4F46E5] font-semibold leading-snug">
                                        {tier.recommendation}
                                    </p>
                                </div>
                            </div>

                            {/* Talent List in Tier */}
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 mb-6">
                                    Talent in This Tier
                                </h4>
                                <div className="space-y-3">
                                    {talentInTier.length > 0 ? (
                                        talentInTier.map((t) => (
                                            <div
                                                key={t.profile_id}
                                                className="flex items-center gap-4 p-5 border border-gray-100 rounded-2xl bg-white shadow-sm hover:shadow-md hover:border-indigo-100 transition-all group"
                                            >
                                                <img
                                                    src={t.photo_url || "/placeholder-avatar.png"}
                                                    alt={t.name}
                                                    className="w-14 h-14 rounded-2xl object-cover bg-gray-50 shadow-sm border border-gray-50"
                                                />
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-gray-900 text-[15px]">
                                                            {t.name}
                                                        </span>
                                                        <div className="bg-green-100 p-0.5 rounded-full">
                                                            <svg
                                                                className="w-2.5 h-2.5 text-green-600"
                                                                fill="currentColor"
                                                                viewBox="0 0 20 20"
                                                            >
                                                                <path
                                                                    fillRule="evenodd"
                                                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                                    clipRule="evenodd"
                                                                />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400">
                                                        <span className="text-gray-900 font-bold">
                                                            $
                                                            {Math.round(
                                                                t.avg_monthly_earnings,
                                                            ).toLocaleString()}
                                                            /mo
                                                        </span>
                                                        <span className="text-gray-300">•</span>
                                                        <span className="flex items-center gap-1 group-hover:text-indigo-500 transition-colors">
                                                            <TrendingUp className="w-3.5 h-3.5" />{" "}
                                                            {t.total_campaigns} campaigns
                                                        </span>
                                                        <span className="text-gray-300">•</span>
                                                        <span>
                                                            {t.engagement_percentage.toFixed(0)}% engagement
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="hidden md:flex flex-col items-center gap-2 w-48 mr-6">
                                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-50">
                                                        <div
                                                            className="h-full bg-gray-900 rounded-full"
                                                            style={{
                                                                width: `${Math.min(100, t.engagement_percentage)}%`,
                                                            }}
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
        </div>
    );
};
