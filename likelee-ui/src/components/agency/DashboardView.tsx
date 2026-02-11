import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  DollarSign,
  AlertCircle,
  Clock,
  CheckCircle2,
  Trophy,
  TrendingUp,
  ShieldAlert,
  Briefcase,
  Megaphone,
} from "lucide-react";

interface DashboardViewProps {
  onKYC: () => void;
  agencyName: string;
  rosterData: any[];
  kycStatus?: string | null;
  kycLoading?: boolean;
  onRefreshStatus?: () => void;
  refreshLoading?: boolean;
  licensingRequestsCount?: number;
  overview?: any;
  talentPerformance?: any;
  revenueBreakdown?: any;
  licensingPipeline?: any;
  recentActivity?: any;
}

const DashboardView = ({
  onKYC,
  agencyName,
  rosterData,
  kycStatus,
  kycLoading,
  licensingRequestsCount,
  overview,
  talentPerformance,
  revenueBreakdown,
  licensingPipeline,
  recentActivity,
}: DashboardViewProps) => {
  const overviewRosterTotal = overview?.roster_health?.total_count;
  const overviewRosterActive = overview?.roster_health?.active_count;
  const overviewRosterPct = overview?.roster_health?.percentage;

  const totalTalent =
    typeof overviewRosterTotal === "number"
      ? overviewRosterTotal
      : rosterData.length;
  const activeTalent =
    typeof overviewRosterActive === "number"
      ? overviewRosterActive
      : rosterData.filter((t) => t.status === "active").length;

  const totalEarnings = rosterData.reduce(
    (acc, t) => acc + (t.earnings_val || 0),
    0,
  );

  const monthlyRevenueFormatted =
    overview?.monthly_revenue?.amount_formatted ?? null;
  const monthlyRevenueGrowth =
    typeof overview?.monthly_revenue?.growth_percentage === "number"
      ? overview.monthly_revenue.growth_percentage
      : null;

  const getTalentDateMs = (t: any): number | null => {
    const raw =
      t?.created_at ??
      t?.createdAt ??
      t?.joined_at ??
      t?.joinedAt ??
      t?.inserted_at ??
      t?.insertedAt ??
      null;

    if (!raw) return null;
    const d = new Date(raw);
    const ms = d.getTime();
    return Number.isFinite(ms) ? ms : null;
  };

  const timeAgo = (dateMs: number): string => {
    const diffMs = Date.now() - dateMs;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24)
      return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
    const diffWeeks = Math.floor(diffDays / 7);
    return `${diffWeeks} week${diffWeeks === 1 ? "" : "s"} ago`;
  };

  const recentTalents = React.useMemo(() => {
    const withDates = rosterData
      .map((t) => ({ t, ms: getTalentDateMs(t) }))
      .filter((x) => x.ms !== null) as Array<{ t: any; ms: number }>;
    withDates.sort((a, b) => b.ms - a.ms);
    return withDates.map((x) => x.t);
  }, [rosterData]);

  const newestTalent = React.useMemo(() => {
    if (recentTalents.length) return recentTalents[0];
    return rosterData.length ? rosterData[rosterData.length - 1] : null;
  }, [recentTalents, rosterData]);

  // Calculate expiring licenses (within 30 days)
  const expiringLicensesFromOverview =
    overview?.pending_actions?.expiring_licenses;
  const expiringLicensesFromRoster = rosterData.filter((t) => {
    if (!t.expiry || t.expiry === "—") return false;
    const expiryDate = new Date(t.expiry);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 30;
  }).length;
  const expiringLicenses =
    typeof expiringLicensesFromOverview === "number"
      ? expiringLicensesFromOverview
      : expiringLicensesFromRoster;

  const pendingLicensingRequestsFromOverview =
    overview?.pending_actions?.licensing_requests;
  const pendingLicensingRequests =
    typeof pendingLicensingRequestsFromOverview === "number"
      ? pendingLicensingRequestsFromOverview
      : Math.max(0, licensingRequestsCount ?? 0);
  const pendingActionsTotal = pendingLicensingRequests + expiringLicenses;

  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
    return `$${val}`;
  };

  return (
    <div className="space-y-8">
      {/* KYC Verification Alert */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white rounded-xl shadow-sm">
            <ShieldAlert className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              KYC Verification Required
            </h3>
            <p className="text-sm text-gray-500">
              To enable payouts and licensing for your talent, please complete
              your agency's ID verification.
            </p>
            <div className="mt-2 flex items-center gap-2">
              {kycStatus === "approved" ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : kycStatus === "pending" ? (
                <Clock className="w-4 h-4 text-yellow-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-gray-500" />
              )}
              <Badge
                variant="outline"
                className={
                  kycStatus === "approved"
                    ? "bg-green-100 text-green-700"
                    : kycStatus === "pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-700"
                }
              >
                {kycStatus === "approved"
                  ? "Approved"
                  : kycStatus === "pending"
                    ? "Pending"
                    : "Not started"}
              </Badge>
            </div>
          </div>
        </div>
        <Button
          variant="default"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 h-12 rounded-xl"
          onClick={onKYC}
          disabled={
            !!kycLoading || kycStatus === "approved" || kycStatus === "pending"
          }
        >
          {kycStatus === "pending" ? "KYC Pending" : "Complete KYC"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Roster Health */}
        <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl border-l-4 border-l-indigo-500">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">
            Roster Health
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">
              {activeTalent}/{totalTalent}
            </span>
          </div>
          <p className="text-xs text-green-600 font-medium mt-1">
            {typeof overviewRosterPct === "number"
              ? Math.round(overviewRosterPct)
              : totalTalent > 0
                ? Math.round((activeTalent / totalTalent) * 100)
                : 0}
            % active
          </p>
        </Card>

        {/* Revenue */}
        <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl border-l-4 border-l-green-500">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-green-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">
            Revenue This Month
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">
              {monthlyRevenueFormatted ?? formatCurrency(totalEarnings)}
            </span>
          </div>
          {monthlyRevenueGrowth !== null ? (
            <p className="text-xs text-green-600 font-medium mt-1">
              {monthlyRevenueGrowth >= 0 ? "+" : ""}
              {monthlyRevenueGrowth}% vs last month
            </p>
          ) : null}
        </Card>

        {/* Pending Actions */}
        <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl border-l-4 border-l-red-500 relative">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            {pendingActionsTotal > 0 && (
              <Badge
                variant="default"
                className="bg-red-600 hover:bg-red-700 text-white border-0 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]"
              >
                {pendingActionsTotal}
              </Badge>
            )}
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">
            Pending Actions
          </h3>
          <div className="space-y-1">
            <p className="text-xs text-gray-600">
              • {pendingLicensingRequests} licensing request
              {pendingLicensingRequests === 1 ? "" : "s"}
            </p>
            <p className="text-xs text-gray-600">
              • {expiringLicenses} expiring license
              {expiringLicenses === 1 ? "" : "s"}
            </p>
          </div>
        </Card>

        {/* Platform Ranking */}
        <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl border-l-4 border-l-blue-400">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Trophy className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">
            Platform Ranking
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-blue-600">
              {overview?.platform_ranking?.rank_text ?? ""}
            </span>
          </div>
          {overview?.platform_ranking?.rank_description ? (
            <p className="text-xs text-gray-500 font-medium mt-1">
              {overview.platform_ranking.rank_description}
            </p>
          ) : null}
        </Card>
      </div>

      {/* Talent Performance Summary */}
      <Card className="p-8 rounded-xl border border-gray-200 shadow-sm bg-white">
        <h2 className="text-xl font-bold text-gray-900 mb-8">
          Talent Performance Summary
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Top 3 Revenue Generators */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <h3 className="text-sm font-bold text-gray-900">
                Top 3 Revenue Generators
              </h3>
            </div>

            {(Array.isArray(talentPerformance?.top_revenue_generators)
              ? talentPerformance.top_revenue_generators
              : rosterData
                  .slice()
                  .sort((a, b) => (b.earnings_val || 0) - (a.earnings_val || 0))
                  .slice(0, 3)
            ).map((talent: any, idx: number) => (
              <div
                key={talent.id}
                className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <span className="font-bold text-2xl w-10 text-green-600">
                  #{idx + 1}
                </span>
                <img
                  src={
                    talent.photo_url || talent.img || "https://placehold.co/150"
                  }
                  alt={talent.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm">
                    {talent.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {talent.earnings_formatted ??
                      formatCurrency(talent.earnings_val || 0)}
                  </p>
                </div>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
            ))}
          </div>

          {/* Needs Activation */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <h3 className="text-sm font-bold text-gray-900">
                Needs Activation (
                {rosterData.filter((t) => t.status !== "active").length})
              </h3>
            </div>
            {rosterData.filter((t) => t.status !== "active").length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                All talent actively earning!
              </p>
            ) : (
              rosterData
                .filter((t) => t.status !== "active")
                .slice(0, 3)
                .map((talent) => (
                  <div key={talent.id} className="flex items-center gap-3">
                    <img
                      src={talent.img || "https://placehold.co/150"}
                      alt={talent.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {talent.name}
                    </span>
                    <Badge variant="outline" className="text-[10px] py-0">
                      {talent.status}
                    </Badge>
                  </div>
                ))
            )}
          </div>

          {/* New Talent Performance */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-gray-900">
                New Talent Performance
              </h3>
            </div>

            <div className="p-6 border border-gray-100 rounded-xl bg-white shadow-sm space-y-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Onboarded recently
              </p>
              {Array.isArray(talentPerformance?.new_talent_performance) &&
              talentPerformance.new_talent_performance.length ? (
                talentPerformance.new_talent_performance
                  .slice(0, 1)
                  .map((t: any) => (
                    <div key={t.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-900 text-sm">
                          {t.name}
                        </span>
                        <Badge
                          variant="default"
                          className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-0 uppercase font-bold text-[10px]"
                        >
                          {t.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        Added {t.days_since_added} day
                        {t.days_since_added === 1 ? "" : "s"} ago
                      </p>
                    </div>
                  ))
              ) : newestTalent ? (
                <div key={newestTalent.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900 text-sm">
                      {newestTalent.name}
                    </span>
                    <Badge
                      variant="default"
                      className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-0 uppercase font-bold text-[10px]"
                    >
                      {newestTalent.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    {(() => {
                      const ms = getTalentDateMs(newestTalent);
                      return ms ? `Added ${timeAgo(ms)}` : "Recently added";
                    })()}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No talent yet</p>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Revenue Breakdown</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 border border-gray-100 rounded-xl">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">
              By Campaign Type
            </h3>
            <div className="space-y-4">
              {(Array.isArray(revenueBreakdown?.by_campaign_type)
                ? revenueBreakdown.by_campaign_type.map((x: any) => ({
                    label: x?.name,
                    value:
                      typeof x?.percentage === "number"
                        ? `${x.percentage}%`
                        : "0%",
                  }))
                : []
              ).map((item: any) => (
                <div
                  key={item.label}
                  className="flex justify-between items-center"
                >
                  <span className="text-sm font-medium text-gray-600">
                    {item.label}
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 border border-gray-100 rounded-xl">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">
              By Brand Vertical
            </h3>
            <div className="space-y-4">
              {(Array.isArray(revenueBreakdown?.by_brand_vertical)
                ? revenueBreakdown.by_brand_vertical.map((x: any) => ({
                    label: x?.name,
                    value:
                      typeof x?.percentage === "number"
                        ? `${x.percentage}%`
                        : "0%",
                  }))
                : []
              ).map((item: any) => (
                <div
                  key={item.label}
                  className="flex justify-between items-center"
                >
                  <span className="text-sm font-medium text-gray-600">
                    {item.label}
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 border border-gray-100 rounded-xl">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">
              By Region
            </h3>
            <div className="space-y-4">
              {(Array.isArray(revenueBreakdown?.by_region)
                ? revenueBreakdown.by_region.map((x: any) => ({
                    label: x?.name,
                    value:
                      typeof x?.percentage === "number"
                        ? `${x.percentage}%`
                        : "0%",
                  }))
                : []
              ).map((item: any) => (
                <div
                  key={item.label}
                  className="flex justify-between items-center"
                >
                  <span className="text-sm font-medium text-gray-600">
                    {item.label}
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            Licensing Pipeline
          </h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 bg-white border border-yellow-200 shadow-sm rounded-xl">
            <div className="mb-4">
              <div className="w-8 h-8 rounded-full border border-yellow-400 flex items-center justify-center text-yellow-500 mb-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-500">
                Pending Approval
              </span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-4">
              {typeof licensingPipeline?.pending_approval === "number"
                ? licensingPipeline.pending_approval
                : pendingLicensingRequests}
            </div>
            <Button
              variant="default"
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold h-10"
            >
              Review Now
            </Button>
          </Card>

          <Card className="p-6 bg-white border border-green-200 shadow-sm rounded-xl">
            <div className="mb-4">
              <div className="w-8 h-8 rounded-full border border-green-400 flex items-center justify-center text-green-500 mb-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-500">Active</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-4">
              {typeof licensingPipeline?.active === "number"
                ? licensingPipeline.active
                : 0}
            </div>
          </Card>

          <Card className="p-6 bg-white border border-orange-200 shadow-sm rounded-xl">
            <div className="mb-4">
              <div className="w-8 h-8 rounded-full border border-orange-400 flex items-center justify-center text-orange-500 mb-2 text-lg">
                !
              </div>
              <span className="text-xs font-medium text-gray-500">
                Expiring Soon (30d)
              </span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-4">
              {typeof licensingPipeline?.expiring_soon === "number"
                ? licensingPipeline.expiring_soon
                : expiringLicenses}
            </div>
            <Button
              variant="outline"
              className="w-full border-orange-200 text-orange-600 hover:bg-orange-50 font-bold h-10"
            >
              Review
            </Button>
          </Card>

          <Card className="p-6 bg-white border border-gray-100 shadow-sm rounded-xl">
            <div className="mb-4">
              <div className="w-8 h-8 rounded-full border border-gray-400 flex items-center justify-center text-gray-400 mb-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-500">
                Total This Month
              </span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-4">
              {typeof licensingPipeline?.total_this_month === "number"
                ? licensingPipeline.total_this_month
                : 0}
            </div>
          </Card>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
        </div>
        <div className="p-8 space-y-10">
          {(Array.isArray(recentActivity?.activities)
            ? recentActivity.activities
            : (recentTalents.length
                ? recentTalents.slice(0, 4)
                : rosterData.slice(0, 4)
              ).map((talent: any) => {
                const ms = getTalentDateMs(talent);
                return {
                  id: talent?.id || talent?.user_id || talent?.name,
                  type_name: "talent",
                  title: `${talent?.name || "A talent"} added to roster`,
                  subtitle: "Roster Addition",
                  relative_time: ms ? timeAgo(ms) : "recently",
                };
              })
          )
            .slice(0, 5)
            .map((item: any) => (
              <div key={item.id} className="flex gap-4">
                <div
                  className={`mt-1.5 w-2.5 h-2.5 rounded-full ${
                    item.type_name === "payment"
                      ? "bg-green-600"
                      : item.type_name === "campaign"
                        ? "bg-blue-600"
                        : item.type_name === "licensing"
                          ? "bg-blue-600"
                          : "bg-purple-600"
                  } flex-shrink-0`}
                />
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {item.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {item.relative_time ?? ""}
                  </p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
