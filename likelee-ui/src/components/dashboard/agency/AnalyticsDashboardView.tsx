import React, { useState } from "react";
import {
    Download,
    DollarSign,
    TrendingUp,
    BarChart2,
    Target,
    ShieldCheck,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    Legend,
} from "recharts";
import {
    TALENT_DATA,
    ANALYTICS_CAMPAIGN_STATUS,
    ANALYTICS_PERFORMANCE_TRENDS,
    ANALYTICS_AI_USAGE_TYPE,
    ANALYTICS_CONSENT_STATUS,
    ROSTER_INSIGHTS_DATA,
    CLIENTS_PERFORMANCE_DATA,
} from "@/data/agencyMockData";

const PlaceholderView = ({ title }: { title: string }) => (
    <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <BarChart2 className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-500 max-w-sm">
            This analytics view is active and gathering data. Detailed visualization
            will appear here once enough data points are collected.
        </p>
    </div>
);

const AnalyticsDashboardView = () => {
    const [activeTab, setActiveTab] = useState("Overview");
    const subTabs = [
        "Overview",
        "Roster Insights",
        "Clients & Campaigns",
        "Compliance",
    ];

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center bg-white p-6 border-b border-gray-100">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        Analytics Dashboard
                    </h2>
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
                    {/* Top Row - 2 Columns */}
                    <div className="grid grid-cols-3 gap-6">
                        {/* Total Earnings Card */}
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
                                    $37,700
                                </h3>
                                <p className="text-xs font-bold text-green-600 flex items-center gap-1.5">
                                    <TrendingUp className="w-3.5 h-3.5" /> +12% vs last period
                                </p>
                            </div>
                        </Card>

                        {/* Active Campaigns Card */}
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
                                            9
                                        </h3>
                                    </div>
                                </div>
                                <TrendingUp className="w-5 h-5 text-indigo-600" />
                            </div>

                            <div className="grid grid-cols-3 gap-4 mb-10">
                                <div className="p-6 bg-gray-50/50 border border-gray-100 rounded-2xl">
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                                        Total Value
                                    </p>
                                    <p className="text-2xl font-black text-gray-900">$37,700</p>
                                </div>
                                <div className="p-6 bg-gray-50/50 border border-gray-100 rounded-2xl">
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                                        Avg Value
                                    </p>
                                    <p className="text-2xl font-black text-gray-900">$4,189</p>
                                </div>
                                <div className="p-6 bg-gray-50/50 border border-gray-100 rounded-2xl">
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                                        Top Scope
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-lg font-black text-gray-900 tracking-tight">
                                            Social Media
                                        </p>
                                        <span className="text-xs font-bold text-gray-500">42%</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <p className="text-[11px] font-black text-gray-400 uppercase mb-5 tracking-[0.2em]">
                                    Campaign Status Breakdown
                                </p>
                                <div className="space-y-6">
                                    {ANALYTICS_CAMPAIGN_STATUS.map((status, i) => (
                                        <div key={i} className="space-y-2">
                                            <div className="flex justify-between items-center text-xs font-black text-gray-600 tracking-wider">
                                                <span className="uppercase">{status.name}</span>
                                                <span>{status.value}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gray-900"
                                                    style={{
                                                        width: `${(status.value / 15) * 100}%`,
                                                        backgroundColor: status.color,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Middle Section - Stacked Horizontal Cards */}
                    <Card className="p-8 bg-white border border-gray-900 shadow-sm relative overflow-hidden h-[180px] flex flex-col justify-center">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="mb-4">
                                    <TrendingUp className="w-8 h-8 text-purple-600" />
                                </div>
                                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">
                                    AI Usages (30d)
                                </p>
                                <h3 className="text-5xl font-black text-gray-900 tracking-tighter">
                                    73
                                </h3>
                                <p className="text-xs font-bold text-purple-600 flex items-center gap-1.5 mt-2">
                                    <TrendingUp className="w-3.5 h-3.5" /> +18% vs last period
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center border border-purple-100">
                                <BarChart2 className="w-7 h-7 text-purple-600" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-8 bg-white border border-gray-900 shadow-sm relative overflow-hidden h-[140px] flex flex-col justify-center">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">
                                    Avg Campaign Value
                                </p>
                                <h3 className="text-4xl font-black text-gray-900 tracking-tighter">
                                    $1,796
                                </h3>
                                <p className="text-xs font-bold text-orange-600 mt-2">
                                    0 expiring soon
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center border border-orange-100">
                                <Target className="w-7 h-7 text-orange-600" />
                            </div>
                        </div>
                    </Card>

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
                                    data={ANALYTICS_PERFORMANCE_TRENDS}
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                        stroke="#f1f5f9"
                                    />
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fontWeight: "bold", fill: "#94a3b8" }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fontWeight: "bold", fill: "#94a3b8" }}
                                    />
                                    <RechartsTooltip
                                        contentStyle={{
                                            borderRadius: "12px",
                                            border: "1px solid #e2e8f0",
                                            fontWeight: "bold",
                                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                        }}
                                    />
                                    <Legend
                                        iconType="circle"
                                        wrapperStyle={{
                                            paddingTop: "40px",
                                            fontWeight: "bold",
                                            fontSize: "12px",
                                        }}
                                        formatter={(value) => (
                                            <span className="text-gray-600 uppercase tracking-widest">
                                                {value}
                                            </span>
                                        )}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="earnings"
                                        name="Earnings ($)"
                                        stroke="#10b981"
                                        strokeWidth={3}
                                        dot={{
                                            r: 4,
                                            fill: "#10b981",
                                            strokeWidth: 2,
                                            stroke: "#fff",
                                        }}
                                        activeDot={{ r: 6 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="campaigns"
                                        name="Campaigns"
                                        stroke="#6366f1"
                                        strokeWidth={3}
                                        dot={{
                                            r: 4,
                                            fill: "#6366f1",
                                            strokeWidth: 2,
                                            stroke: "#fff",
                                        }}
                                        activeDot={{ r: 6 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="usages"
                                        name="AI Usages"
                                        stroke="#a855f7"
                                        strokeWidth={3}
                                        dot={{
                                            r: 4,
                                            fill: "#a855f7",
                                            strokeWidth: 2,
                                            stroke: "#fff",
                                        }}
                                        activeDot={{ r: 6 }}
                                    />
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
                                                data={ANALYTICS_AI_USAGE_TYPE}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={0}
                                                outerRadius={100}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {ANALYTICS_AI_USAGE_TYPE.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="w-full mt-8 flex flex-col gap-3">
                                    {ANALYTICS_AI_USAGE_TYPE.map((item) => (
                                        <div
                                            key={item.name}
                                            className="flex items-center justify-between"
                                        >
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
                                        <PieChart>
                                            <Pie
                                                data={ANALYTICS_CONSENT_STATUS}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={0}
                                                outerRadius={100}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {ANALYTICS_CONSENT_STATUS.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="w-full mt-8 flex flex-col gap-3 text-right">
                                    {ANALYTICS_CONSENT_STATUS.map((item) => (
                                        <div
                                            key={item.name}
                                            className="flex items-center justify-between"
                                        >
                                            <span className="text-xs font-bold text-gray-900 uppercase tracking-widest">
                                                {item.name}: {item.value}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            ) : activeTab === "Roster Insights" ? (
                <div className="space-y-8 animate-in fade-in duration-500 pb-20">
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-[0.15em] mb-10">
                        Earnings by Talent (Last 30 Days)
                    </h3>
                    <Card className="p-10 bg-white border border-gray-900 shadow-sm mb-8">
                        <div className="h-[500px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={ROSTER_INSIGHTS_DATA}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                        stroke="#f1f5f9"
                                    />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 13, fontWeight: "bold", fill: "#64748b" }}
                                        dy={15}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 13, fontWeight: "bold", fill: "#94a3b8" }}
                                    />
                                    <RechartsTooltip
                                        contentStyle={{
                                            borderRadius: "12px",
                                            border: "1px solid #e2e8f0",
                                            fontWeight: "bold",
                                        }}
                                    />
                                    <Legend
                                        verticalAlign="bottom"
                                        align="center"
                                        iconType="rect"
                                        wrapperStyle={{
                                            paddingTop: "40px",
                                            fontWeight: "bold",
                                            fontSize: "13px",
                                        }}
                                        formatter={(value) => (
                                            <span className="text-gray-700 uppercase tracking-widest px-2">
                                                {value === "earnings"
                                                    ? "30D Earnings ($)"
                                                    : "Projected ($)"}
                                            </span>
                                        )}
                                    />
                                    <Bar
                                        dataKey="earnings"
                                        fill="#10b981"
                                        radius={[4, 4, 0, 0]}
                                        barSize={32}
                                        name="earnings"
                                    />
                                    <Bar
                                        dataKey="projected"
                                        fill="#3b82f6"
                                        radius={[4, 4, 0, 0]}
                                        barSize={32}
                                        name="projected"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    {/* Top Talent Summary Cards */}
                    <div className="grid grid-cols-3 gap-6 mb-8">
                        <Card className="p-6 bg-white border border-gray-900 shadow-sm relative overflow-hidden">
                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6">
                                Top Performer (Earnings)
                            </p>
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-green-500 p-0.5">
                                    <img
                                        src={TALENT_DATA.find((t) => t.id === "carla")?.img}
                                        alt="Carla"
                                        className="w-full h-full object-cover rounded-lg"
                                    />
                                </div>
                                <div>
                                    <h4 className="text-xl font-black text-gray-900 tracking-tight">
                                        Carla
                                    </h4>
                                    <p className="text-2xl font-black text-green-600">$6,800</p>
                                    <p className="text-[11px] font-bold text-gray-500 mt-1">
                                        13 campaigns • 7.1% engagement
                                    </p>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6 bg-white border border-gray-900 shadow-sm relative overflow-hidden">
                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6">
                                Most Active (Campaigns)
                            </p>
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-indigo-500 p-0.5">
                                    <img
                                        src={TALENT_DATA.find((t) => t.id === "julia")?.img}
                                        alt="Julia"
                                        className="w-full h-full object-cover rounded-lg"
                                    />
                                </div>
                                <div>
                                    <h4 className="text-xl font-black text-gray-900 tracking-tight">
                                        Julia
                                    </h4>
                                    <p className="text-2xl font-black text-indigo-600">11 uses</p>
                                    <p className="text-[11px] font-bold text-gray-500 mt-1">
                                        $5,200 earnings • 6.2% engagement
                                    </p>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6 bg-white border border-gray-900 shadow-sm relative overflow-hidden">
                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6">
                                Highest Engagement
                            </p>
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-purple-500 p-0.5">
                                    <img
                                        src={TALENT_DATA.find((t) => t.id === "carla")?.img}
                                        alt="Carla"
                                        className="w-full h-full object-cover rounded-lg"
                                    />
                                </div>
                                <div>
                                    <h4 className="text-xl font-black text-gray-900 tracking-tight">
                                        Carla
                                    </h4>
                                    <p className="text-2xl font-black text-purple-600">7.1%</p>
                                    <p className="text-[11px] font-bold text-gray-500 mt-1">
                                        53,400 followers • 13 campaigns
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Talent Performance Metrics Table */}
                    <Card className="bg-white border border-gray-900 shadow-sm overflow-hidden mb-8">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest">
                                Talent Performance Metrics
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50/80">
                                        <th className="px-8 py-5 text-[11px] font-black text-gray-500 uppercase tracking-widest">
                                            Talent
                                        </th>
                                        <th className="px-8 py-5 text-[11px] font-black text-gray-500 uppercase tracking-widest">
                                            30D Earnings
                                        </th>
                                        <th className="px-8 py-5 text-[11px] font-black text-gray-500 uppercase tracking-widest">
                                            Campaigns
                                        </th>
                                        <th className="px-8 py-5 text-[11px] font-black text-gray-500 uppercase tracking-widest">
                                            Avg Value
                                        </th>
                                        <th className="px-8 py-5 text-[11px] font-black text-gray-500 uppercase tracking-widest">
                                            Engagement
                                        </th>
                                        <th className="px-8 py-5 text-[11px] font-black text-gray-500 uppercase tracking-widest">
                                            Status
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {TALENT_DATA.filter((t) => t.status === "active")
                                        .slice(0, 10)
                                        .map((talent) => (
                                            <tr
                                                key={talent.id}
                                                className="hover:bg-gray-50/50 transition-colors"
                                            >
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <img
                                                            src={talent.img}
                                                            alt={talent.name}
                                                            className="w-8 h-8 rounded-full object-cover border border-gray-200"
                                                        />
                                                        <span className="text-sm font-bold text-gray-900">
                                                            {talent.name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-sm font-black text-gray-900">
                                                    {talent.earnings}
                                                </td>
                                                <td className="px-8 py-5 text-sm font-bold text-gray-600">
                                                    {Math.floor(Math.random() * 10) + 4}
                                                </td>
                                                <td className="px-8 py-5 text-sm font-bold text-gray-600">
                                                    ${Math.floor(Math.random() * 200) + 400}
                                                </td>
                                                <td className="px-8 py-5 text-sm font-bold text-gray-600">
                                                    {(Math.random() * 4 + 3).toFixed(1)}%
                                                </td>
                                                <td className="px-8 py-5">
                                                    <Badge className="bg-green-50 text-green-600 border-green-100 font-bold text-[10px] py-0.5">
                                                        Active
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            ) : activeTab === "Clients & Campaigns" ? (
                <div className="space-y-8 animate-in fade-in duration-500 pb-20">
                    <div className="grid grid-cols-2 gap-6">
                        {/* Budget Distribution Pie */}
                        <Card className="p-10 bg-white border border-gray-900 shadow-sm">
                            <h3 className="text-xl font-bold text-gray-900 mb-12 tracking-tight">
                                Earnings by Client
                            </h3>
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={CLIENTS_PERFORMANCE_DATA}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={80}
                                            outerRadius={120}
                                            paddingAngle={5}
                                            dataKey="budget"
                                            stroke="none"
                                        >
                                            {CLIENTS_PERFORMANCE_DATA.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip
                                            contentStyle={{
                                                borderRadius: "12px",
                                                border: "none",
                                                fontWeight: "bold",
                                                boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                                            }}
                                        />
                                        <Legend
                                            verticalAlign="middle"
                                            align="right"
                                            layout="vertical"
                                            iconType="circle"
                                            wrapperStyle={{ paddingLeft: "20px", fontWeight: "bold" }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        {/* Campaign Performance Bar Chart */}
                        <Card className="p-10 bg-white border border-gray-900 shadow-sm">
                            <h3 className="text-xl font-bold text-gray-900 mb-12 tracking-tight">
                                Geographic Distribution
                            </h3>
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={[
                                            { name: "North America", value: 42, color: "#f59e0b" }, // Amber
                                            { name: "Europe", value: 18, color: "#6366f1" }, // Indigo
                                            { name: "Asia-Pacific", value: 8, color: "#8b5cf6" }, // Violet
                                            { name: "Global", value: 5, color: "#ec4899" }, // Rose
                                        ]}
                                        margin={{ left: 20 }}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            horizontal={false}
                                            stroke="#f1f5f9"
                                        />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{
                                                fontSize: 11,
                                                fontWeight: "bold",
                                                fill: "#64748b",
                                            }}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{
                                                fontSize: 13,
                                                fontWeight: "bold",
                                                fill: "#64748b",
                                            }}
                                        />
                                        <RechartsTooltip
                                            contentStyle={{
                                                borderRadius: "12px",
                                                border: "none",
                                                fontWeight: "bold",
                                                boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                                            }}
                                            cursor={{ fill: "#f8fafc" }}
                                        />
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                                            {[
                                                { name: "North America", value: 42, color: "#f59e0b" },
                                                { name: "Europe", value: 18, color: "#6366f1" },
                                                { name: "Asia-Pacific", value: 8, color: "#8b5cf6" },
                                                { name: "Global", value: 5, color: "#ec4899" },
                                            ].map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </div>

                    {/* Client Performance List Table */}
                    <Card className="bg-white border border-gray-900 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                                Top Clients Performance
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50/80">
                                        <th className="px-8 py-5 text-[11px] font-bold text-gray-500 tracking-widest">
                                            Client
                                        </th>
                                        <th className="px-8 py-5 text-[11px] font-bold text-gray-500 tracking-widest text-right">
                                            Action
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {CLIENTS_PERFORMANCE_DATA.map((client) => (
                                        <tr
                                            key={client.name}
                                            className="hover:bg-gray-50/50 transition-colors"
                                        >
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-900">
                                                        {client.name}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500 font-bold">
                                                        {Math.floor(Math.random() * 5) + 3} campaigns
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-sm font-bold text-green-600">
                                                        ${client.budget.toLocaleString()}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 font-bold">
                                                        {((client.budget / 45000) * 100).toFixed(1)}% of
                                                        total
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* Summary Cards AT BOTTOM */}
                    <div className="grid grid-cols-3 gap-6">
                        <Card className="p-8 bg-white border border-gray-900 shadow-sm relative overflow-hidden flex flex-col justify-center h-[180px]">
                            <p className="text-sm font-bold text-gray-500 mb-2">
                                Repeat Client Rate
                            </p>
                            <h3 className="text-4xl font-bold text-gray-900 tracking-tighter">
                                78%
                            </h3>
                            <div className="w-full bg-gray-100 h-1.5 rounded-full mt-4 overflow-hidden">
                                <div
                                    className="h-full bg-gray-900 rounded-full"
                                    style={{ width: "78%" }}
                                />
                            </div>
                        </Card>

                        <Card className="p-8 bg-white border border-gray-900 shadow-sm relative overflow-hidden flex flex-col justify-center h-[180px]">
                            <p className="text-sm font-bold text-gray-500 mb-2">
                                Avg Campaign Duration
                            </p>
                            <h3 className="text-4xl font-bold text-gray-900 tracking-tighter">
                                18 days
                            </h3>
                            <p className="text-xs text-gray-500 mt-2 font-medium">
                                From booking to completion
                            </p>
                        </Card>

                        <Card className="p-8 bg-white border border-gray-900 shadow-sm relative overflow-hidden flex flex-col justify-center h-[180px]">
                            <p className="text-sm font-bold text-gray-500 mb-2">
                                Client Acquisition
                            </p>
                            <h3 className="text-4xl font-bold text-green-600 tracking-tighter">
                                4
                            </h3>
                            <p className="text-xs text-green-600/70 mt-2 font-bold">
                                New clients this quarter
                            </p>
                        </Card>
                    </div>
                </div>
            ) : activeTab === "Compliance" ? (
                <div className="space-y-6 animate-in fade-in duration-500">
                    {/* Top Row: 3 Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="p-8 bg-white border border-gray-900 shadow-sm rounded-lg">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center">
                                    <ShieldCheck className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        Verification Rate
                                    </p>
                                    <h3 className="text-3xl font-black text-gray-900 tracking-tighter">
                                        100%
                                    </h3>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gray-900 rounded-full"
                                        style={{ width: "100%" }}
                                    />
                                </div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                    All talent verified
                                </p>
                            </div>
                        </Card>

                        <Card className="p-8 bg-white border border-gray-900 shadow-sm rounded-lg">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center">
                                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        Active Consents
                                    </p>
                                    <h3 className="text-3xl font-black text-gray-900 tracking-tighter">
                                        80%
                                    </h3>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gray-400 rounded-full"
                                        style={{ width: "80%" }}
                                    />
                                </div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                    8 of 10 complete
                                </p>
                            </div>
                        </Card>

                        <Card className="p-8 bg-white border border-gray-900 shadow-sm rounded-lg">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center">
                                    <AlertCircle className="w-5 h-5 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        Expiring Soon
                                    </p>
                                    <h3 className="text-3xl font-black text-gray-900 tracking-tighter">
                                        0
                                    </h3>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">
                                    Next 30 days
                                </p>
                            </div>
                        </Card>
                    </div>

                    {/* Middle Row: License Expiry Pipeline */}
                    <Card className="p-8 bg-white border border-gray-900 shadow-sm rounded-lg">
                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest mb-6">
                            License Expiry Pipeline
                        </h3>
                        <div className="bg-[#FFF7ED] border border-orange-100 p-4 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <img
                                    src={TALENT_DATA.find((t) => t.id === "julia")?.img}
                                    alt="Julia"
                                    className="w-12 h-12 rounded-lg object-cover"
                                />
                                <div>
                                    <p className="text-sm font-black text-gray-900">Julia</p>
                                    <p className="text-xs font-bold text-gray-500">
                                        License expires 2/15/2025
                                    </p>
                                </div>
                            </div>
                            <Button className="bg-[#EA580C] hover:bg-[#C2410C] text-white font-black text-xs px-8 h-10 rounded-lg uppercase tracking-widest gap-2">
                                <RefreshCw className="w-4 h-4" /> Renew
                            </Button>
                        </div>
                    </Card>

                    {/* Bottom Row: Compliance Summary */}
                    <Card className="p-8 bg-white border border-gray-900 shadow-sm rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            {/* Left Column: Consent Status Distribution */}
                            <div>
                                <h3 className="text-xl font-black text-gray-900 uppercase tracking-widest mb-10">
                                    Compliance Summary
                                </h3>
                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6 font-sans">
                                    Consent Status Distribution
                                </p>
                                <div className="space-y-8">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest">
                                            <span className="text-gray-600">Complete</span>
                                            <span className="text-green-600">8 (80%)</span>
                                        </div>
                                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gray-900 rounded-full"
                                                style={{ width: "80%" }}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest">
                                            <span className="text-gray-600">Expiring</span>
                                            <span className="text-orange-600">1 (10%)</span>
                                        </div>
                                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-[#FB923C]/30 rounded-full shadow-inner"
                                                style={{ width: "10%" }}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest">
                                            <span className="text-gray-600">Missing</span>
                                            <span className="text-red-600">1 (10%)</span>
                                        </div>
                                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-[#FECACA] rounded-full"
                                                style={{ width: "10%" }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Likeness Protection */}
                            <div className="space-y-10">
                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest font-sans">
                                    Likeness Protection
                                </p>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-6 bg-green-50/50 border border-green-100 rounded-xl">
                                        <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                                            Authorized Uses (30d)
                                        </span>
                                        <span className="text-3xl font-black text-green-600">
                                            73
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between p-6 bg-red-50/50 border border-red-100 rounded-xl">
                                        <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                                            Unauthorized Alerts
                                        </span>
                                        <span className="text-3xl font-black text-red-600">0</span>
                                    </div>
                                    <div className="flex items-center justify-between p-6 bg-blue-50/50 border border-blue-100 rounded-xl">
                                        <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                                            Disputes Resolved
                                        </span>
                                        <span className="text-3xl font-black text-blue-600">2</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            ) : (
                <PlaceholderView title={activeTab} />
            )}
        </div>
    );
};

export default AnalyticsDashboardView;
