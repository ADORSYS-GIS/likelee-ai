import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatKycReason } from "@/utils/kycDisplay";
import { useTranslation } from "react-i18next";
import {
  Users,
  DollarSign,
  AlertCircle,
  Clock,
  CheckCircle2,
  RefreshCw,
  Trophy,
  TrendingUp,
  ShieldAlert,
  Briefcase,
  Megaphone,
} from "lucide-react";

interface DashboardViewProps {
  isSportsAgency?: boolean;
  onKYC: () => void;
  agencyName: string;
  rosterData: any[];
  kycStatus?: string | null;
  kycRejectionReason?: string | null;
  kycLoading?: boolean;
  onRefreshStatus?: () => void;
  refreshLoading?: boolean;
  canResumeKyc?: boolean;
  licensingRequestsCount?: number;
  overview?: any;
  talentPerformance?: any;
  revenueBreakdown?: any;
  licensingPipeline?: any;
  recentActivity?: any;
}

const DashboardView = ({
  isSportsAgency = false,
  onKYC,
  agencyName,
  rosterData,
  kycStatus,
  kycRejectionReason,
  kycLoading,
  onRefreshStatus,
  refreshLoading,
  canResumeKyc = false,
  licensingRequestsCount,
  overview,
  talentPerformance,
  revenueBreakdown,
  licensingPipeline,
  recentActivity,
}: DashboardViewProps) => {
  const { t } = useTranslation();
  const entitySingularLower = isSportsAgency ? "athlete" : "talent";
  const entityPluralLower = isSportsAgency ? "athletes" : "talent";
  const entityLabel = isSportsAgency
    ? t("agencyDashboard.dashboard.entities.athlete")
    : t("agencyDashboard.dashboard.entities.talent");
  const entityLabelPlural = isSportsAgency
    ? t("agencyDashboard.dashboard.entities.athletePlural")
    : t("agencyDashboard.dashboard.entities.talentPlural");
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
    if (diffMins < 1) return t("agencyDashboard.dashboard.time.justNow");
    if (diffMins < 60)
      return t("agencyDashboard.dashboard.time.minutesAgo", {
        count: diffMins,
      });
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24)
      return t("agencyDashboard.dashboard.time.hoursAgo", {
        count: diffHours,
      });
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7)
      return t("agencyDashboard.dashboard.time.daysAgo", {
        count: diffDays,
      });
    const diffWeeks = Math.floor(diffDays / 7);
    return t("agencyDashboard.dashboard.time.weeksAgo", {
      count: diffWeeks,
    });
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
  const normalizedKycStatus = String(kycStatus || "")
    .trim()
    .toLowerCase();
  const isKycApproved = normalizedKycStatus === "approved";
  const isKycPending = normalizedKycStatus === "pending";
  const isKycRejected =
    normalizedKycStatus === "rejected" || normalizedKycStatus === "declined";
  const formattedKycReason = formatKycReason(kycRejectionReason);
  const hasPendingFollowUp = isKycPending && formattedKycReason.length > 0;
  const kycTitle = isKycApproved
    ? t("agencyDashboard.dashboard.kyc.completedTitle")
    : hasPendingFollowUp
      ? t("agencyDashboard.dashboard.kyc.additionalVerificationTitle")
      : isKycPending
        ? t("agencyDashboard.dashboard.kyc.inProgressTitle")
        : isKycRejected
          ? t("agencyDashboard.dashboard.kyc.rejectedTitle")
          : t("agencyDashboard.dashboard.kyc.requiredTitle");
  const kycDescription = isKycApproved
    ? t("agencyDashboard.dashboard.kyc.completedDescription")
    : hasPendingFollowUp
      ? t("agencyDashboard.dashboard.kyc.additionalVerificationDescription", {
          entityPlural: entityLabelPlural,
        })
      : isKycPending
        ? canResumeKyc
          ? t("agencyDashboard.dashboard.kyc.resumeDescription")
          : t("agencyDashboard.dashboard.kyc.startNewDescription")
        : isKycRejected
          ? t("agencyDashboard.dashboard.kyc.rejectedDescription", {
              entityPlural: entityLabelPlural,
            })
          : t("agencyDashboard.dashboard.kyc.requiredDescription", {
              entitySingular: entityLabel,
            });
  const kycBadgeLabel = isKycApproved
    ? t("agencyDashboard.dashboard.kyc.badges.approved")
    : hasPendingFollowUp
      ? t("agencyDashboard.dashboard.kyc.badges.actionNeeded")
      : isKycPending
        ? t("agencyDashboard.dashboard.kyc.badges.pending")
        : isKycRejected
          ? t("agencyDashboard.dashboard.kyc.badges.rejected")
          : t("agencyDashboard.dashboard.kyc.badges.notStarted");
  const kycButtonLabel = isKycPending
    ? canResumeKyc
      ? hasPendingFollowUp
        ? t("agencyDashboard.dashboard.kyc.actions.continue")
        : t("agencyDashboard.dashboard.kyc.actions.resume")
      : t("agencyDashboard.dashboard.kyc.actions.startNew")
    : isKycRejected
      ? t("agencyDashboard.dashboard.kyc.actions.retry")
      : t("agencyDashboard.dashboard.kyc.actions.complete");
  const KycIcon = isKycApproved
    ? CheckCircle2
    : hasPendingFollowUp || isKycRejected
      ? ShieldAlert
      : isKycPending
        ? Clock
        : AlertCircle;
  const kycBannerClassName = isKycApproved
    ? "rounded-2xl bg-gradient-to-r from-emerald-50 via-white to-teal-50 p-5 shadow-sm ring-1 ring-emerald-100"
    : hasPendingFollowUp || isKycRejected
      ? "rounded-2xl bg-gradient-to-r from-rose-50 via-white to-amber-50 p-5 shadow-sm ring-1 ring-rose-100"
      : "rounded-2xl bg-gradient-to-r from-indigo-50 via-white to-cyan-50 p-5 shadow-sm ring-1 ring-indigo-100";
  const kycIconWrapClassName = isKycApproved
    ? "bg-white/90 text-emerald-600"
    : hasPendingFollowUp || isKycRejected
      ? "bg-white/90 text-rose-600"
      : isKycPending
        ? "bg-white/90 text-amber-600"
        : "bg-white/90 text-indigo-600";
  const kycBadgeClassName = isKycApproved
    ? "border-0 bg-white/90 text-emerald-700 shadow-sm"
    : hasPendingFollowUp || isKycRejected
      ? "border-0 bg-white/90 text-rose-700 shadow-sm"
      : isKycPending
        ? "border-0 bg-white/90 text-amber-700 shadow-sm"
        : "border-0 bg-white/90 text-gray-700 shadow-sm";

  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
    return `$${val}`;
  };

  return (
    <div className="space-y-8">
      {/* KYC Verification Alert */}
      <div className={kycBannerClassName}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1 ring-black/5 ${kycIconWrapClassName}`}
            >
              <KycIcon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900">{kycTitle}</h3>
                <Badge variant="outline" className={kycBadgeClassName}>
                  {kycBadgeLabel}
                </Badge>
              </div>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                {kycDescription}
              </p>
              {(hasPendingFollowUp || isKycRejected) && formattedKycReason && (
                <div className="mt-3 max-w-2xl rounded-2xl bg-white/90 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-100">
                  <span className="font-semibold">
                    {hasPendingFollowUp
                      ? t("agencyDashboard.dashboard.kyc.veriffNote")
                      : t("agencyDashboard.dashboard.kyc.reason")}
                  </span>{" "}
                  {formattedKycReason}
                </div>
              )}
              {!isKycApproved && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onRefreshStatus}
                    disabled={
                      !onRefreshStatus || !!kycLoading || !!refreshLoading
                    }
                    className="h-9 rounded-full border-gray-200 bg-white/90 px-3 text-gray-700 shadow-sm hover:bg-white"
                  >
                    <RefreshCw
                      className={`mr-2 h-4 w-4 ${refreshLoading ? "animate-spin" : ""}`}
                    />
                    {t("agencyDashboard.dashboard.kyc.refreshStatus")}
                  </Button>
                </div>
              )}
            </div>
          </div>
          <Button
            variant="default"
            className="h-12 rounded-full bg-indigo-600 px-8 font-bold text-white hover:bg-indigo-700"
            onClick={onKYC}
            disabled={!!kycLoading || !!refreshLoading || isKycApproved}
          >
            {kycButtonLabel}
          </Button>
        </div>
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
            {t("agencyDashboard.dashboard.cards.rosterHealth")}
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
            {t("agencyDashboard.dashboard.cards.activePercentSuffix")}
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
            {t("agencyDashboard.dashboard.cards.revenueThisMonth")}
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">
              {monthlyRevenueFormatted ?? formatCurrency(totalEarnings)}
            </span>
          </div>
          {monthlyRevenueGrowth !== null ? (
            <p className="text-xs text-green-600 font-medium mt-1">
              {monthlyRevenueGrowth >= 0 ? "+" : ""}
              {t("agencyDashboard.dashboard.cards.growthVsLastMonth", {
                value: `${monthlyRevenueGrowth}%`,
              })}
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
            {t("agencyDashboard.dashboard.cards.pendingActions")}
          </h3>
          <div className="space-y-1">
            <p className="text-xs text-gray-600">
              •{" "}
              {t("agencyDashboard.dashboard.cards.licensingRequests", {
                count: pendingLicensingRequests,
              })}
            </p>
            <p className="text-xs text-gray-600">
              •{" "}
              {t("agencyDashboard.dashboard.cards.expiringLicenses", {
                count: expiringLicenses,
              })}
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
            {t("agencyDashboard.dashboard.cards.platformRanking")}
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
          {t("agencyDashboard.dashboard.sections.talentPerformanceSummary")}
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Top 3 Revenue Generators */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <h3 className="text-sm font-bold text-gray-900">
                {t("agencyDashboard.dashboard.sections.topRevenueGenerators")}
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
                {t("agencyDashboard.dashboard.sections.needsActivation", {
                  count: rosterData.filter((t) => t.status !== "active").length,
                })}
              </h3>
            </div>
            {rosterData.filter((t) => t.status !== "active").length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                {t("agencyDashboard.dashboard.sections.allActivelyEarning", {
                  entityPlural: entityLabelPlural,
                })}
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
                {t("agencyDashboard.dashboard.sections.newTalentPerformance")}
              </h3>
            </div>

            <div className="p-6 border border-gray-100 rounded-xl bg-white shadow-sm space-y-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                {t("agencyDashboard.dashboard.sections.onboardedRecently")}
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
                        {t("agencyDashboard.dashboard.time.addedDaysAgo", {
                          count: t.days_since_added,
                        })}
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
                      return ms
                        ? t("agencyDashboard.dashboard.time.addedRelative", {
                            value: timeAgo(ms),
                          })
                        : t("agencyDashboard.dashboard.time.recentlyAdded");
                    })()}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  {t("agencyDashboard.dashboard.sections.noEntityYet", {
                    entitySingular: entityLabel,
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {t("agencyDashboard.dashboard.sections.revenueBreakdown")}
          </h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 border border-gray-100 rounded-xl">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">
              {t("agencyDashboard.dashboard.sections.byCampaignType")}
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
              {t("agencyDashboard.dashboard.sections.byBrandVertical")}
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
              {t("agencyDashboard.dashboard.sections.byRegion")}
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
            {t("agencyDashboard.dashboard.sections.licensingPipeline")}
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
                {t("agencyDashboard.dashboard.pipeline.pendingApproval")}
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
              {t("agencyDashboard.dashboard.pipeline.reviewNow")}
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
              <span className="text-xs font-medium text-gray-500">
                {t("agencyDashboard.dashboard.pipeline.active")}
              </span>
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
                {t("agencyDashboard.dashboard.pipeline.expiringSoon30d")}
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
              {t("agencyDashboard.dashboard.pipeline.review")}
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
                {t("agencyDashboard.dashboard.pipeline.totalThisMonth")}
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
          <h2 className="text-lg font-bold text-gray-900">
            {t("agencyDashboard.dashboard.sections.recentActivity")}
          </h2>
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
                  title: t(
                    "agencyDashboard.dashboard.recentActivity.rosterAdded",
                    {
                      name:
                        talent?.name ||
                        t(
                          "agencyDashboard.dashboard.recentActivity.talentFallback",
                        ),
                    },
                  ),
                  subtitle: t(
                    "agencyDashboard.dashboard.recentActivity.rosterAddition",
                  ),
                  relative_time: ms
                    ? timeAgo(ms)
                    : t("agencyDashboard.dashboard.time.recently"),
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
