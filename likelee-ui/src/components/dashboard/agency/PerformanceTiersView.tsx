import React from "react";
import {
    Trophy,
    TrendingUp,
    Target,
    AlertCircle,
    FileText,
    Users,
    DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TALENT_DATA } from "@/data/agencyMockData";

const PerformanceTiersView = ({ onBack }: { onBack: () => void }) => {
    const tiers = [
        {
            id: "Premium",
            label: "Tier 1 - Premium",
            icon: Trophy,
            color: "border-yellow-400",
            textColor: "text-yellow-500",
            bg: "bg-[#FFFEF0]",
            iconBg: "bg-[#FEFCE8]",
            desc: "Top 10% earners with high activity",
            avgEarnings: "$6,800",
            freq: "13.0",
            capacity: "10%",
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
            avgEarnings: "$3,200",
            freq: "6.0",
            capacity: "30%",
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
            avgEarnings: "$2,400",
            freq: "4.0",
            capacity: "10%",
        },
        {
            id: "Inactive",
            label: "Tier 4 - Inactive",
            icon: AlertCircle,
            color: "border-gray-300",
            textColor: "text-gray-500",
            bg: "bg-gray-50",
            iconBg: "bg-gray-100",
            desc: "No activity in 60+ days",
            avgEarnings: "$0",
            freq: "0.0",
            capacity: "0%",
        },
    ];

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
                {tiers.map((tier) => {
                    const count = TALENT_DATA.filter(
                        (t: any) => t.tier === tier.id,
                    ).length;
                    return (
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
                                        {count}
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

            {/* Detail Sections */}
            <div className="space-y-12">
                {tiers.map((tier) => {
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
                                <div className="w-10 h-10 bg-[#E0E7FF] rounded-full flex items-center justify-center flex-shrink-0">
                                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 mb-1">
                                        Strategy Recommendation
                                    </h4>
                                    <p className="text-xs text-gray-600 leading-relaxed">
                                        {tier.id === "Premium"
                                            ? "Focus on retaining these high-performers. Schedule quarterly career reviews and explore exclusive brand partnerships."
                                            : tier.id === "Core"
                                                ? "Great potential for growth. Identify 2-3 key talents to push for premium campaigns next quarter."
                                                : tier.id === "Growth"
                                                    ? "Monitor engagement closely. Invest in portfolio development and test with smaller commercial bookings."
                                                    : "Review contracts and consider archiving profiles to declutter the roster."}
                                    </p>
                                </div>
                            </div>

                            {/* Talent List (Compact) */}
                            <div className="border-t border-gray-100 pt-6">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                                    Talent in this Tier
                                </h4>
                                {talentInTier.length > 0 ? (
                                    <div className="space-y-3">
                                        {talentInTier.map((talent: any) => (
                                            <div
                                                key={talent.id}
                                                className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={talent.img}
                                                        alt={talent.name}
                                                        className="w-10 h-10 rounded-full object-cover border border-gray-100"
                                                    />
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                                            {talent.name}
                                                        </p>
                                                        <p className="text-xs text-gray-500 font-medium">
                                                            {talent.role}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right">
                                                        <p className="text-xs font-bold text-gray-900">
                                                            {talent.earnings}
                                                        </p>
                                                        <p className="text-[10px] text-gray-500 font-medium">
                                                            Earnings
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-bold text-gray-900">
                                                            {talent.engagement || "N/A"}
                                                        </p>
                                                        <p className="text-[10px] text-gray-500 font-medium">
                                                            Eng. Rate
                                                        </p>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 font-bold h-8 rounded-lg"
                                                    >
                                                        View
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400 italic py-4">
                                        No talent currently in this tier.
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PerformanceTiersView;
