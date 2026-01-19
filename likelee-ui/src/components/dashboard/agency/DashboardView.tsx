import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    ShieldCheck,
    AlertTriangle,
    Users,
    DollarSign,
    AlertCircle,
    Trophy,
    TrendingUp,
    TrendingDown,
    FileText,
    Clock,
    CheckCircle2
} from "lucide-react";

interface RevenueBreakdownItem {
    category: string;
    percentage: number;
}

interface RevenueBreakdown {
    by_campaign_type: RevenueBreakdownItem[];
    by_brand_vertical: RevenueBreakdownItem[];
    by_region: RevenueBreakdownItem[];
}

interface LicensingPipeline {
    pending_approval: number;
    active: number;
    expiring_soon: number;
    total_this_month: number;
}

interface RecentActivity {
    activity_type: string;
    description: string;
    timestamp: string;
}

interface DashboardMetrics {
    roster_health: {
        active_count: number;
        total_count: number;
        percentage: number;
    };
    revenue_this_month: {
        amount_cents: number;
        currency: string;
        change_percentage: number;
    };
    pending_actions: {
        licensing_requests: number;
        expiring_licenses: number;
        compliance_issues: number;
    };
    platform_ranking: {
        percentile: number;
        status: string;
    };
    revenue_breakdown: RevenueBreakdown;
    licensing_pipeline: LicensingPipeline;
}

interface TopTalent {
    id: string;
    name: string;
    earnings_cents: number;
    profile_photo_url?: string;
}

interface NewTalent {
    id: string;
    name: string;
    status: string;
    days_to_first_booking: number;
    profile_photo_url?: string;
}

interface DashboardData {
    agency_name: string;
    metrics: DashboardMetrics;
    top_revenue_generators: TopTalent[];
    needs_activation: TopTalent[];
    new_talent_performance: NewTalent[];
    recent_activity: RecentActivity[];
}

export const DashboardView = ({
    agencyId,
    onKYC,
    kycStatus
}: {
    agencyId?: string;
    onKYC: () => void;
    kycStatus?: string;
}) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<DashboardData | null>(null);

    const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || "";
    const API_BASE_ABS = (() => {
        try {
            if (!API_BASE) return new URL("/", window.location.origin).toString();
            if (API_BASE.startsWith("http")) return API_BASE;
            return new URL(API_BASE, window.location.origin).toString();
        } catch {
            return new URL("/", window.location.origin).toString();
        }
    })();
    const api = (path: string) => new URL(path, API_BASE_ABS).toString();

    useEffect(() => {
        if (agencyId) {
            fetchDashboardData();
        }
    }, [agencyId]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Use the actual agencyId passed from the parent dashboard
            const idToUse = agencyId || localStorage.getItem("agency_id");

            if (!idToUse) {
                // If no ID is available yet, it might still be loading in the parent
                setLoading(false);
                return;
            }

            const response = await fetch(
                api(`/api/agency/dashboard?agency_id=${encodeURIComponent(idToUse)}`)
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch dashboard: ${response.statusText} - ${errorText}`);
            }

            const dashboardData: DashboardData = await response.json();
            setData(dashboardData);
        } catch (err: any) {
            console.error("Failed to fetch dashboard data:", err);

            // Fallback to mock data if API fails
            const mockData: DashboardData = {
                agency_name: "Mock Agency",
                metrics: {
                    roster_health: {
                        active_count: 9,
                        total_count: 10,
                        percentage: 90
                    },
                    revenue_this_month: {
                        amount_cents: 3770000, // $37,700
                        currency: "USD",
                        change_percentage: 12
                    },
                    pending_actions: {
                        licensing_requests: 3,
                        expiring_licenses: 1,
                        compliance_issues: 1
                    },
                    platform_ranking: {
                        percentile: 15,
                        status: "Top performer"
                    },
                    revenue_breakdown: {
                        by_campaign_type: [
                            { category: "Social Media", percentage: 45 },
                            { category: "E-commerce", percentage: 35 },
                            { category: "Traditional", percentage: 20 }
                        ],
                        by_brand_vertical: [
                            { category: "Beauty", percentage: 40 },
                            { category: "Fashion", percentage: 35 },
                            { category: "Lifestyle", percentage: 25 }
                        ],
                        by_region: [
                            { category: "North America", percentage: 60 },
                            { category: "Europe", percentage: 30 },
                            { category: "Other", percentage: 10 }
                        ]
                    },
                    licensing_pipeline: {
                        pending_approval: 3,
                        active: 9,
                        expiring_soon: 1,
                        total_this_month: 13
                    }
                },
                top_revenue_generators: [
                    {
                        id: "1",
                        name: "Carla",
                        earnings_cents: 680000,
                        profile_photo_url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/carla.jpg"
                    },
                    {
                        id: "2",
                        name: "Clemence",
                        earnings_cents: 540000,
                        profile_photo_url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/clemence.jpg"
                    },
                    {
                        id: "3",
                        name: "Julia",
                        earnings_cents: 520000,
                        profile_photo_url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/julia.jpg"
                    }
                ],
                needs_activation: [],
                new_talent_performance: [
                    {
                        id: "4",
                        name: "Aaron",
                        status: "PENDING",
                        days_to_first_booking: 12,
                        profile_photo_url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/aaron.jpg"
                    }
                ],
                recent_activity: [
                    {
                        activity_type: "license_approved",
                        description: "License approved for Emma - Glossier Beauty",
                        timestamp: "2 hours ago"
                    },
                    {
                        activity_type: "payment_received",
                        description: "Payment received: $5,200 from & Other Stories",
                        timestamp: "5 hours ago"
                    }
                ]
            };

            setData(mockData);
            setError("Using fallback data - " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (cents: number, currency: string = "USD") => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(cents / 100);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center py-20">
                <Card className="p-8 max-w-md text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Error Loading Dashboard</h3>
                    <p className="text-gray-500 mb-4">{error}</p>
                    <Button onClick={fetchDashboardData}>Retry</Button>
                </Card>
            </div>
        );
    }

    if (!data) return null;

    const { metrics, top_revenue_generators, needs_activation, new_talent_performance } = data;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">{data.agency_name}</h2>
                    <p className="text-gray-500">Welcome back to your dashboard.</p>
                </div>
                <div className="flex gap-3">
                    {kycStatus !== "approved" && (
                        <Button
                            onClick={onKYC}
                            className={`${kycStatus === "pending"
                                ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                                : "bg-indigo-600 hover:bg-indigo-700 text-white"
                                }`}
                        >
                            {kycStatus === "pending" ? (
                                <>
                                    <AlertTriangle className="w-4 h-4 mr-2" />
                                    Verification Pending
                                </>
                            ) : (
                                <>
                                    <ShieldCheck className="w-4 h-4 mr-2" />
                                    Verify Agency
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>

            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Roster Health */}
                <Card className="p-6 border-2 border-indigo-100 hover:border-indigo-300 transition-all">
                    <div className="flex items-start justify-between mb-4">
                        <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                            <Users className="w-5 h-5 text-indigo-600" />
                        </div>
                        <TrendingUp className="w-4 h-4 text-green-500" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Roster Health</h3>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-black text-gray-900">
                            {metrics.roster_health.active_count}/{metrics.roster_health.total_count}
                        </p>
                    </div>
                    <p className="text-xs font-bold text-green-600 mt-2">
                        {metrics.roster_health.percentage}% active
                    </p>
                </Card>

                {/* Revenue This Month */}
                <Card className="p-6 border-2 border-green-100 hover:border-green-300 transition-all">
                    <div className="flex items-start justify-between mb-4">
                        <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <TrendingUp className="w-4 h-4 text-green-500" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Revenue This Month</h3>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-black text-gray-900">
                            {formatCurrency(metrics.revenue_this_month.amount_cents, metrics.revenue_this_month.currency)}
                        </p>
                    </div>
                    <p className="text-xs font-bold text-green-600 mt-2">
                        +{metrics.revenue_this_month.change_percentage}% vs last month
                    </p>
                </Card>

                {/* Pending Actions */}
                <Card className="p-6 border-2 border-red-100 hover:border-red-300 transition-all">
                    <div className="flex items-start justify-between mb-4">
                        <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <Badge className="bg-red-500 text-white text-xs px-2 py-0.5">
                            {metrics.pending_actions.licensing_requests +
                                metrics.pending_actions.expiring_licenses +
                                metrics.pending_actions.compliance_issues}
                        </Badge>
                    </div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Pending Actions</h3>
                    <div className="space-y-1 mt-3">
                        <p className="text-xs text-gray-600">
                            • {metrics.pending_actions.licensing_requests} licensing requests
                        </p>
                        <p className="text-xs text-gray-600">
                            • {metrics.pending_actions.expiring_licenses} expiring license
                        </p>
                        <p className="text-xs text-gray-600">
                            • {metrics.pending_actions.compliance_issues} compliance issue
                        </p>
                    </div>
                </Card>

                {/* Platform Ranking */}
                <Card className="p-6 border-2 border-purple-100 hover:border-purple-300 transition-all">
                    <div className="flex items-start justify-between mb-4">
                        <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-purple-600" />
                        </div>
                        <TrendingUp className="w-4 h-4 text-purple-500" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Platform Ranking</h3>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-black text-purple-600">
                            top {metrics.platform_ranking.percentile}%
                        </p>
                    </div>
                    <p className="text-xs font-bold text-purple-600 mt-2">
                        {metrics.platform_ranking.status}
                    </p>
                </Card>
            </div>

            {/* Talent Performance Summary */}
            <Card className="border border-gray-200 shadow-sm">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">Talent Performance Summary</h3>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Top 3 Revenue Generators */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Trophy className="w-5 h-5 text-yellow-500" />
                                <h4 className="font-bold text-gray-900">Top 3 Revenue Generators</h4>
                            </div>
                            <div className="space-y-3">
                                {top_revenue_generators.map((talent, index) => (
                                    <div key={talent.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white font-black text-sm">
                                            #{index + 1}
                                        </div>
                                        {talent.profile_photo_url && (
                                            <img
                                                src={talent.profile_photo_url}
                                                alt={talent.name}
                                                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                                            />
                                        )}
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-900 text-sm">{talent.name}</p>
                                            <p className="text-xs text-gray-500">{formatCurrency(talent.earnings_cents)}</p>
                                        </div>
                                        <TrendingUp className="w-4 h-4 text-green-500" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Needs Activation */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <AlertCircle className="w-5 h-5 text-orange-500" />
                                <h4 className="font-bold text-gray-900">Needs Activation ({needs_activation.length})</h4>
                            </div>
                            {needs_activation.length === 0 ? (
                                <div className="p-6 bg-green-50 border border-green-100 rounded-lg text-center">
                                    <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                                    <p className="text-sm font-medium text-green-700">All talent actively earning!</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {needs_activation.map((talent) => (
                                        <div key={talent.id} className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                                            {talent.profile_photo_url && (
                                                <img
                                                    src={talent.profile_photo_url}
                                                    alt={talent.name}
                                                    className="w-10 h-10 rounded-full object-cover"
                                                />
                                            )}
                                            <div className="flex-1">
                                                <p className="font-bold text-gray-900 text-sm">{talent.name}</p>
                                                <p className="text-xs text-gray-500">No earnings yet</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* New Talent Performance */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp className="w-5 h-5 text-blue-500" />
                                <h4 className="font-bold text-gray-900">New Talent Performance</h4>
                            </div>
                            {new_talent_performance.length === 0 ? (
                                <div className="p-6 bg-gray-50 border border-gray-100 rounded-lg text-center">
                                    <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500">No new talent onboarded</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                                        Onboarded in last 30 days
                                    </p>
                                    {new_talent_performance.map((talent) => (
                                        <div key={talent.id} className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                            <div className="flex items-center gap-3 mb-2">
                                                {talent.profile_photo_url && (
                                                    <img
                                                        src={talent.profile_photo_url}
                                                        alt={talent.name}
                                                        className="w-10 h-10 rounded-full object-cover"
                                                    />
                                                )}
                                                <div className="flex-1">
                                                    <p className="font-bold text-gray-900 text-sm">{talent.name}</p>
                                                    <Badge className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 mt-1">
                                                        {talent.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-600 mt-2">
                                                <Clock className="w-3 h-3" />
                                                <span>Average time to first booking: {talent.days_to_first_booking} days</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Revenue Breakdown */}
            <Card className="border border-gray-200 shadow-sm">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">Revenue Breakdown</h3>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* By Campaign Type */}
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                                By Campaign Type
                            </h4>
                            <div className="space-y-3">
                                {data.metrics.revenue_breakdown.by_campaign_type.map((item) => (
                                    <div key={item.category} className="flex items-center justify-between">
                                        <span className="text-sm text-gray-700">{item.category}</span>
                                        <span className="text-sm font-bold text-gray-900">{item.percentage}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* By Brand Vertical */}
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                                By Brand Vertical
                            </h4>
                            <div className="space-y-3">
                                {data.metrics.revenue_breakdown.by_brand_vertical.map((item) => (
                                    <div key={item.category} className="flex items-center justify-between">
                                        <span className="text-sm text-gray-700">{item.category}</span>
                                        <span className="text-sm font-bold text-gray-900">{item.percentage}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* By Region */}
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                                By Region
                            </h4>
                            <div className="space-y-3">
                                {data.metrics.revenue_breakdown.by_region.map((item) => (
                                    <div key={item.category} className="flex items-center justify-between">
                                        <span className="text-sm text-gray-700">{item.category}</span>
                                        <span className="text-sm font-bold text-gray-900">{item.percentage}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Licensing Pipeline */}
            <Card className="border border-gray-200 shadow-sm">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">Licensing Pipeline</h3>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Pending Approval */}
                        <Card className="p-6 bg-yellow-50 border-2 border-yellow-200">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-yellow-100 mb-4 mx-auto">
                                <Clock className="w-6 h-6 text-yellow-600" />
                            </div>
                            <p className="text-xs text-gray-500 text-center mb-1">Pending Approval</p>
                            <p className="text-3xl font-black text-gray-900 text-center">{data.metrics.licensing_pipeline.pending_approval}</p>
                            <Button className="w-full mt-4 bg-yellow-600 hover:bg-yellow-700 text-white font-bold">
                                Review Now
                            </Button>
                        </Card>

                        {/* Active */}
                        <Card className="p-6 bg-green-50 border-2 border-green-200">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4 mx-auto">
                                <CheckCircle2 className="w-6 h-6 text-green-600" />
                            </div>
                            <p className="text-xs text-gray-500 text-center mb-1">Active</p>
                            <p className="text-3xl font-black text-gray-900 text-center">{data.metrics.licensing_pipeline.active}</p>
                        </Card>

                        {/* Expiring Soon */}
                        <Card className="p-6 bg-orange-50 border-2 border-orange-200">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-100 mb-4 mx-auto">
                                <AlertCircle className="w-6 h-6 text-orange-600" />
                            </div>
                            <p className="text-xs text-gray-500 text-center mb-1">Expiring Soon (30d)</p>
                            <p className="text-3xl font-black text-gray-900 text-center">{data.metrics.licensing_pipeline.expiring_soon}</p>
                            <Button variant="outline" className="w-full mt-4 border-orange-600 text-orange-600 hover:bg-orange-50 font-bold">
                                Review
                            </Button>
                        </Card>

                        {/* Total This Month */}
                        <Card className="p-6 bg-indigo-50 border-2 border-indigo-200">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 mb-4 mx-auto">
                                <FileText className="w-6 h-6 text-indigo-600" />
                            </div>
                            <p className="text-xs text-gray-500 text-center mb-1">Total This Month</p>
                            <p className="text-3xl font-black text-gray-900 text-center">{data.metrics.licensing_pipeline.total_this_month}</p>
                        </Card>
                    </div>
                </div>
            </Card>

            {/* Recent Activity */}
            <Card className="border border-gray-200 shadow-sm">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
                </div>
                <div className="p-6">
                    <div className="space-y-4">
                        {data.recent_activity.map((activity, index) => (
                            <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <div className={`w-2 h-2 rounded-full mt-2 ${activity.activity_type === 'license_approved' ? 'bg-blue-500' :
                                    activity.activity_type === 'payment_received' ? 'bg-green-500' :
                                        'bg-gray-400'
                                    }`} />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                                    <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default DashboardView;
