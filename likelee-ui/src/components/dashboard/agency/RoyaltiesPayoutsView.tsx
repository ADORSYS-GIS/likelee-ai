import React, { useState } from "react";
import {
    Download,
    DollarSign,
    TrendingUp,
    CheckCircle2,
    Percent,
    Settings,
    X,
    Save,
    History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TALENT_DATA } from "@/data/agencyMockData";

const RoyaltiesPayoutsView = () => {
    const [activeTab, setActiveTab] = useState("Commission Structure");
    const subTabs = [
        "Commission Structure",
        "Payout Preferences",
        "Commission Breakdown",
        "Payment History",
    ];

    const [selectedTier, setSelectedTier] = useState("All Tiers");
    const [showHistory, setShowHistory] = useState(false);
    const [isEditingDefaultRate, setIsEditingDefaultRate] = useState(false);
    const [defaultCommissionRate, setDefaultCommissionRate] = useState(15);

    const filteredTalent =
        selectedTier === "All Tiers"
            ? TALENT_DATA
            : TALENT_DATA.filter((t) => t.tier === selectedTier);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center bg-white p-6 border-b border-gray-100 rounded-xl">
                <h2 className="text-2xl font-bold text-gray-900">
                    Commission & Payout Management
                </h2>
                <Button
                    variant="outline"
                    className="gap-2 border-gray-200 font-bold bg-white h-10 px-4 text-sm"
                >
                    <Download className="w-4 h-4" /> Export Report
                </Button>
            </div>

            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-8 bg-white border border-gray-200 shadow-sm rounded-xl">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center border border-green-100">
                            <DollarSign className="w-6 h-6 text-green-600" />
                        </div>
                        <p className="text-sm font-bold text-gray-500">
                            Accrued This Month
                        </p>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-1">$8,450</h3>
                    <p className="text-xs font-bold text-green-600">Ready for payout</p>
                </Card>

                <Card className="p-8 bg-white border border-gray-200 shadow-sm rounded-xl">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100">
                            <TrendingUp className="w-6 h-6 text-blue-600" />
                        </div>
                        <p className="text-sm font-bold text-gray-500">Pending Approval</p>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-1">$3,200</h3>
                    <p className="text-xs font-bold text-gray-400">
                        Awaiting brand confirmation
                    </p>
                </Card>

                <Card className="p-8 bg-white border border-gray-200 shadow-sm rounded-xl">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center border border-purple-100">
                            <CheckCircle2 className="w-6 h-6 text-purple-600" />
                        </div>
                        <p className="text-sm font-bold text-gray-500">Paid YTD</p>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-1">$124,800</h3>
                    <p className="text-xs font-bold text-gray-400">To Talent This year</p>
                </Card>

                <Card className="p-8 bg-indigo-50 border border-indigo-200 shadow-sm rounded-xl">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-indigo-100 shadow-sm">
                            <Percent className="w-6 h-6 text-indigo-600" />
                        </div>
                        <p className="text-sm font-bold text-indigo-500">
                            Agency Commission YTD
                        </p>
                    </div>
                    <h3 className="text-3xl font-bold text-indigo-900 mb-1">$18,720</h3>
                    <p className="text-xs font-bold text-indigo-500">
                        15% avg commission rate
                    </p>
                </Card>
            </div>

            {/* Sub-tabs Navigation */}
            <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
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

            {activeTab === "Commission Structure" && (
                <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
                    <Card className="p-10 bg-white border border-gray-900 shadow-sm rounded-xl">
                        <div className="flex justify-between items-center mb-10">
                            <h3 className="text-lg font-bold text-gray-900">
                                Default Commission Rate
                            </h3>
                            {isEditingDefaultRate ? (
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setIsEditingDefaultRate(false);
                                            setDefaultCommissionRate(15);
                                        }}
                                        className="font-bold border-gray-200"
                                    >
                                        <X className="w-4 h-4 mr-2" /> Cancel
                                    </Button>
                                    <Button
                                        onClick={() => setIsEditingDefaultRate(false)}
                                        className="bg-indigo-600 hover:bg-indigo-700 font-bold"
                                    >
                                        <Save className="w-4 h-4 mr-2" /> Save Changes
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    variant="outline"
                                    onClick={() => setIsEditingDefaultRate(true)}
                                    className="font-bold gap-2"
                                >
                                    <Settings className="w-4 h-4" /> Edit Settings
                                </Button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-6">
                                <Label className="text-sm font-bold text-gray-900">
                                    Agency Commission Rate
                                </Label>
                                <div className="flex items-center gap-4">
                                    <div className="relative w-32">
                                        <Input
                                            type="number"
                                            value={defaultCommissionRate}
                                            onChange={(e) =>
                                                isEditingDefaultRate &&
                                                setDefaultCommissionRate(Number(e.target.value))
                                            }
                                            readOnly={!isEditingDefaultRate}
                                            className={`h-14 bg-gray-50 border-gray-200 text-2xl font-bold text-gray-900 pl-4 pr-10 ${isEditingDefaultRate ? "bg-white border-indigo-500 ring-2 ring-indigo-100" : ""}`}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-400">
                                            %
                                        </span>
                                    </div>
                                </div>
                                <p className="text-sm font-medium text-gray-500 italic">
                                    Talent sees:{" "}
                                    <span className="text-gray-900 font-bold">
                                        "Agency takes {defaultCommissionRate}% commission"
                                    </span>
                                </p>
                            </div>
                            <div className="bg-indigo-50/50 p-8 rounded-2xl border border-indigo-100 flex flex-col justify-center">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                                    Example Breakdown:
                                </p>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center py-2 border-b border-indigo-50">
                                        <span className="text-sm font-bold text-gray-600">
                                            License Deal:
                                        </span>
                                        <span className="text-sm font-black text-gray-900">
                                            $1,000
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-indigo-50">
                                        <span className="text-sm font-bold text-green-600">
                                            Talent Receives:
                                        </span>
                                        <span className="text-sm font-black text-green-600">
                                            ${(1000 * (1 - defaultCommissionRate / 100)).toFixed(0)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 font-black text-indigo-600">
                                        <span className="text-sm">Agency Commission:</span>
                                        <span className="text-sm">
                                            ${(1000 * (defaultCommissionRate / 100)).toFixed(0)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-10 bg-white border border-gray-900 shadow-sm rounded-xl">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            Commission by Performance Tier
                        </h3>
                        <p className="text-sm font-medium text-gray-500 mb-10">
                            Set different commission rates based on talent performance tier.
                            Higher-performing talent can earn lower commission rates as an
                            incentive.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="p-8 bg-[#FAF5FF] border border-purple-100 rounded-2xl space-y-6">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-purple-900">
                                        Premium Tier
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 bg-white border border-purple-200 rounded text-sm font-bold text-gray-500">
                                            12
                                        </span>
                                        <span className="text-gray-400 font-bold">%</span>
                                    </div>
                                </div>
                                <div className="w-full bg-purple-200 h-2 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gray-900 rounded-full"
                                        style={{ width: "85%" }}
                                    />
                                </div>
                            </div>

                            <div className="p-8 bg-[#F0F9FF] border border-blue-100 rounded-2xl space-y-6">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-blue-900">
                                        Core Tier
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 bg-white border border-blue-200 rounded text-sm font-bold text-gray-500">
                                            15
                                        </span>
                                        <span className="text-gray-400 font-bold">%</span>
                                    </div>
                                </div>
                                <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gray-900 rounded-full"
                                        style={{ width: "65%" }}
                                    />
                                </div>
                            </div>

                            <div className="p-8 bg-[#F0FDF4] border border-green-100 rounded-2xl space-y-6">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-green-900">
                                        Growth Tier
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 bg-white border border-green-200 rounded text-sm font-bold text-gray-500">
                                            18
                                        </span>
                                        <span className="text-gray-400 font-bold">%</span>
                                    </div>
                                </div>
                                <div className="w-full bg-green-200 h-2 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gray-900 rounded-full"
                                        style={{ width: "45%" }}
                                    />
                                </div>
                            </div>

                            <div className="p-8 bg-gray-50 border border-gray-100 rounded-2xl space-y-6">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-gray-900">
                                        Inactive Tier
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 bg-white border border-gray-200 rounded text-sm font-bold text-gray-500">
                                            20
                                        </span>
                                        <span className="text-gray-400 font-bold">%</span>
                                    </div>
                                </div>
                                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gray-900 rounded-full"
                                        style={{ width: "10%" }}
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="bg-white border border-gray-900 shadow-sm overflow-hidden rounded-xl">
                        <div className="p-10 border-b border-gray-100 flex justify-between items-center">
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-gray-900">
                                    Talent Commission Settings
                                </h3>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    Set custom commission rates for specific talent when needed
                                    (e.g., special contracts, VIP talent)
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                className="font-bold gap-2 border-gray-200"
                                onClick={() => setShowHistory(!showHistory)}
                            >
                                {showHistory ? (
                                    <>
                                        <History className="w-4 h-4" /> Hide History
                                    </>
                                ) : (
                                    <>
                                        <History className="w-4 h-4" /> View History
                                    </>
                                )}
                            </Button>
                        </div>

                        {showHistory ? (
                            <div className="p-8 bg-gray-50/50">
                                <div className="border border-blue-100 bg-[#F0F9FF] rounded-lg overflow-hidden">
                                    <div className="p-4 border-b border-blue-100">
                                        <h4 className="text-sm font-bold text-gray-900">
                                            Commission Changes History
                                        </h4>
                                    </div>
                                    <div className="divide-y divide-blue-50">
                                        {[
                                            {
                                                name: "Julia",
                                                date: "Jan 20, 2025",
                                                admin: "Admin",
                                                oldRate: 15,
                                                newRate: 12,
                                            },
                                            {
                                                name: "Carla",
                                                date: "Jan 15, 2025",
                                                admin: "Admin",
                                                oldRate: 15,
                                                newRate: 10,
                                            },
                                            {
                                                name: "Milan",
                                                date: "Jan 10, 2025",
                                                admin: "Admin",
                                                oldRate: 18,
                                                newRate: 15,
                                            },
                                        ].map((item, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center justify-between p-4 bg-white/50 hover:bg-white transition-colors"
                                            >
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">
                                                        {item.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {item.date} by {item.admin}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="px-3 py-1 rounded bg-red-50 text-red-600 text-xs font-bold">
                                                        {item.oldRate}%
                                                    </span>
                                                    <span className="text-gray-300">→</span>
                                                    <span className="px-3 py-1 rounded bg-green-50 text-green-600 text-xs font-bold">
                                                        {item.newRate}%
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="p-6 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            Filter by Tier:
                                        </span>
                                        <select
                                            value={selectedTier}
                                            onChange={(e) => setSelectedTier(e.target.value)}
                                            className="h-10 px-4 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                        >
                                            <option value="All Tiers">All Tiers</option>
                                            <option value="Premium">Premium</option>
                                            <option value="Core">Core</option>
                                            <option value="Growth">Growth</option>
                                            <option value="Inactive">Inactive</option>
                                        </select>
                                    </div>
                                    <p className="text-xs font-medium text-gray-400 italic">
                                        Showing {filteredTalent.length} of {TALENT_DATA.length}{" "}
                                        talent
                                    </p>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-gray-50/50">
                                                <th className="px-8 py-5 w-12 text-center">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                </th>
                                                <th className="px-8 py-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                    Talent
                                                </th>
                                                <th className="px-8 py-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                    Tier
                                                </th>
                                                <th className="px-8 py-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                    30D Earnings
                                                </th>
                                                <th className="px-8 py-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                    Current Rate
                                                </th>
                                                <th className="px-8 py-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                    Custom Rate
                                                </th>
                                                <th className="px-8 py-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                    Last Changed
                                                </th>
                                                <th className="px-8 py-5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 font-sans">
                                            {filteredTalent.map((talent) => (
                                                <tr
                                                    key={talent.id}
                                                    className="hover:bg-gray-50/30 transition-colors group"
                                                >
                                                    <td className="px-8 py-5 text-center">
                                                        <input
                                                            type="checkbox"
                                                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-3">
                                                            <img
                                                                src={talent.img}
                                                                className="w-10 h-10 rounded-lg object-cover shadow-sm bg-gray-100"
                                                            />
                                                            <span className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                                                                {talent.name}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <Badge
                                                            className={`px-2 py-0.5 font-bold text-[10px] uppercase shadow-sm ${talent.tier === "Premium" ? "bg-purple-50 text-purple-600" : talent.tier === "Core" ? "bg-blue-50 text-blue-600" : talent.tier === "Growth" ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-500"}`}
                                                        >
                                                            {talent.tier}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-8 py-5 text-sm font-bold text-gray-900">
                                                        {talent.earnings}
                                                    </td>
                                                    <td className="px-8 py-5 text-sm font-medium text-gray-500">
                                                        {talent.tier === "Premium"
                                                            ? "12%"
                                                            : talent.tier === "Core"
                                                                ? "15%"
                                                                : talent.tier === "Growth"
                                                                    ? "18%"
                                                                    : "20%"}
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <span className="text-gray-400 text-xs italic">
                                                            —
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <span className="text-gray-400 text-xs italic">
                                                            —
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-5 text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="bg-white border border-gray-200 text-gray-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-white font-bold h-8"
                                                        >
                                                            Edit
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </Card>
                </div>
            )}

            {activeTab !== "Commission Structure" && (
                <div className="text-center py-20 bg-white border border-gray-100 rounded-xl">
                    <p className="text-gray-400 font-medium">
                        Coming soon in next update...
                    </p>
                </div>
            )}
        </div>
    );
};

export default RoyaltiesPayoutsView;
