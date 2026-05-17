import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Download,
  FileText,
  Users,
  Eye,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  DollarSign,
  Info,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTeamAccess } from "@/features/team/useTeamAccess";
import { ActiveLicenseDetailsSheet } from "@/components/licensing/ActiveLicenseDetailsSheet";
import {
  getAgencyActiveLicenses,
  getAgencyActiveLicensesStats,
} from "@/api/functions";
import { ComplianceRenewableLicense } from "@/types/licensing";
import { useTranslation } from "react-i18next";

const ActiveLicensesView = ({
  onRenew,
  isSportsAgency = false,
}: {
  onRenew: (license: ComplianceRenewableLicense) => void;
  isSportsAgency?: boolean;
}) => {
  const { t } = useTranslation("agency");
  const entitySingularTitle = isSportsAgency
    ? t("agencyDashboard.activeLicenses.details.athlete")
    : t("agencyDashboard.activeLicenses.details.talent");
  const entitySingularLower = isSportsAgency
    ? t("agencyDashboard.dashboard.entities.athlete")
    : t("agencyDashboard.dashboard.entities.talent");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedLicense, setSelectedLicense] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const {
    hasPermission,
    loading: accessLoading,
    context,
  } = useTeamAccess("agency");
  // Let the backend be the source of truth for read access. Some existing
  // agency sessions have stale team permission payloads, which incorrectly
  // blocked owners from this tab before the API request could run.
  const canViewLicenses = true;
  const canManageLicenses = hasPermission("manage_licenses");
  const isReadOnly = canViewLicenses && !canManageLicenses;

  const handleViewDetails = (license: any) => {
    setSelectedLicense(license);
    setIsDetailsOpen(true);
  };

  const handleRenew = (license: ComplianceRenewableLicense) => {
    onRenew(license);
  };

  const canRenewLicense = (license: any) => {
    const status = String(license?.status || "");
    return status === "Expiring" || status === "Expired";
  };

  const { data: licenses = [], isLoading: isLicensesLoading } = useQuery<any[]>(
    {
      queryKey: ["agency", "active-licenses", filterStatus, searchTerm],
      queryFn: async () => {
        const params: any = {};
        if (filterStatus !== "All") params.status = filterStatus;
        if (searchTerm) params.search = searchTerm;
        return await getAgencyActiveLicenses(params);
      },
      enabled: true,
    },
  );

  const { data: stats } = useQuery({
    queryKey: ["agency", "active-licenses", "stats"],
    queryFn: () => getAgencyActiveLicensesStats(),
    enabled: true,
  });

  const statusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-500";
      case "Expiring":
        return "bg-orange-500";
      case "Expired":
        return "bg-gray-500";
      default:
        return "bg-gray-400";
    }
  };

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (accessLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {isReadOnly && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <Eye className="w-5 h-5 text-amber-600" />
          <div>
            <p className="font-bold text-amber-800">
              {t("agencyDashboard.activeLicenses.viewOnlyMode")}
            </p>
            <p className="text-sm text-amber-700">
              {t("agencyDashboard.activeLicenses.viewOnlyModeDescription")}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl shadow-sm">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-bold text-blue-900 text-sm">
            {t("agencyDashboard.activeLicenses.info.title", {
              defaultValue: "About Active Licenses",
            })}
          </p>
          <p className="text-sm text-blue-800 mt-1">
            {t("agencyDashboard.activeLicenses.info.description", {
              defaultValue:
                "Successfully paid licensing requests automatically appear here as Active Licenses. Once a license reaches its expiration date, it will systematically change to Expired and will no longer be available for new catalog creations.",
            })}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
        <div>
          <h2 className="text-3xl font-black text-gray-900 mb-2">
            {t("agencyDashboard.activeLicenses.title")}
          </h2>
          <p className="text-gray-500 font-medium">
            {t("agencyDashboard.activeLicenses.description", {
              entity: entitySingularLower,
            })}
          </p>
        </div>
        <Button
          variant="default"
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-2 px-6 h-11 rounded-xl shadow-lg shadow-indigo-200"
          onClick={() => {
            if (!licenses || licenses.length === 0) {
              return;
            }
            const headers = [
              entitySingularTitle,
              t("agencyDashboard.activeLicenses.headers.licenseType"),
              t("agencyDashboard.activeLicenses.headers.brand"),
              t("agencyDashboard.activeLicenses.headers.startDate"),
              t("agencyDashboard.activeLicenses.headers.endDate"),
              t("agencyDashboard.activeLicenses.headers.deadline"),
              t("agencyDashboard.activeLicenses.headers.daysLeft"),
              t("agencyDashboard.activeLicenses.headers.usageScope"),
              t("agencyDashboard.activeLicenses.headers.value"),
              t("agencyDashboard.activeLicenses.headers.status"),
              t("agencyDashboard.activeLicenses.headers.autoRenew"),
            ];
            const rows = licenses.map((lic: any) => [
              `"${(lic.talent_name || "").replace(/"/g, '""')}"`,
              `"${(lic.license_type || "").replace(/"/g, '""')}"`,
              `"${(lic.brand || "").replace(/"/g, '""')}"`,
              lic.start_date || "",
              lic.end_date || "",
              lic.deadline || "",
              lic.days_left ?? "",
              `"${Array.isArray(lic.usage_scope) ? lic.usage_scope.join(", ") : (lic.usage_scope || "").replace(/"/g, '""')}"`,
              lic.value || 0,
              lic.status || "",
              lic.auto_renew
                ? t("agencyDashboard.activeLicenses.headers.yes")
                : t("agencyDashboard.activeLicenses.headers.no"),
            ]);
            const csv = [
              headers.join(","),
              ...rows.map((r) => r.join(",")),
            ].join("\n");
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `active-licenses-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
          }}
        >
          <Download className="w-4 h-4" />{" "}
          {t("agencyDashboard.activeLicenses.exportReport")}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {[
          {
            icon: CheckCircle2,
            label: t("agencyDashboard.activeLicenses.stats.activeLicenses"),
            value: stats?.active || "0",
            color: "text-green-600",
            bg: "bg-green-50",
            border: "border-green-100",
          },
          {
            icon: Clock,
            label: t("agencyDashboard.activeLicenses.stats.expiringSoon"),
            value: stats?.expiring || "0",
            color: "text-orange-600",
            bg: "bg-orange-50",
            border: "border-orange-100",
          },
          {
            icon: AlertCircle,
            label: t("agencyDashboard.activeLicenses.stats.expired"),
            value: stats?.expired || "0",
            color: "text-red-600",
            bg: "bg-red-50",
            border: "border-red-100",
          },
          {
            icon: DollarSign,
            label: t("agencyDashboard.activeLicenses.stats.totalValue"),
            value: formatMoney(stats?.total_value || 0),
            color: "text-indigo-600",
            bg: "bg-indigo-50",
            border: "border-indigo-100",
            large: true,
          },
        ].map((card, i) => (
          <Card
            key={i}
            className={`p-4 sm:p-6 bg-white border ${card.border} shadow-sm rounded-2xl min-h-[150px] sm:min-h-0`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}
              >
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <p className={`text-sm font-bold ${card.color}`}>{card.label}</p>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-gray-900 break-words">
              {card.value}
            </p>
          </Card>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="relative w-full flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t(
                "agencyDashboard.activeLicenses.searchPlaceholder",
              )}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
            />
          </div>
          <div className="w-full sm:w-auto overflow-x-auto">
            <div className="flex w-max bg-gray-100 p-1 rounded-lg sm:ml-auto">
              {["All", "Active", "Expiring", "Expired"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setFilterStatus(filter)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-all ${filterStatus === filter ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                >
                  {t(
                    `agencyDashboard.activeLicenses.filter.${filter.toLowerCase()}`,
                    { defaultValue: filter },
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {entitySingularTitle}
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {t("agencyDashboard.activeLicenses.headers.licenseType")}
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {t("agencyDashboard.activeLicenses.headers.brand")}
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {t("agencyDashboard.activeLicenses.headers.deadline")}
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {t("agencyDashboard.activeLicenses.headers.usageScope")}
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {t("agencyDashboard.activeLicenses.headers.value")}
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {t("agencyDashboard.activeLicenses.headers.status")}
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {t("agencyDashboard.activeLicenses.headers.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {licenses.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <FileText className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-gray-900 font-medium">
                        {t("agencyDashboard.activeLicenses.noLicenses")}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {t(
                          "agencyDashboard.activeLicenses.tryAdjustingFilters",
                          {
                            defaultValue:
                              "Try adjusting your filters or search terms",
                          },
                        )}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
              {licenses.map((lic: any) => (
                <tr
                  key={lic.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-6 py-8 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                        {lic.talent_avatar ? (
                          <img
                            src={lic.talent_avatar}
                            alt={lic.talent_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Users className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm leading-none mb-1">
                          {lic.talent_name}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-8">
                    <p className="text-sm font-bold text-gray-900 leading-tight max-w-[150px]">
                      {lic.license_type ||
                        t("agencyDashboard.activeLicenses.unknownLicense")}
                    </p>
                  </td>
                  <td className="px-6 py-8">
                    <p className="text-sm font-bold text-gray-900">
                      {lic.brand ||
                        t("agencyDashboard.activeLicenses.unknownBrand")}
                    </p>
                  </td>
                  <td className="px-6 py-8">
                    {lic.start_date || lic.end_date || lic.deadline ? (
                      <>
                        {lic.start_date && (
                          <p className="text-xs font-bold text-gray-900 mb-1">
                            {new Date(lic.start_date).toLocaleDateString()}
                          </p>
                        )}
                        {lic.end_date ? (
                          <p className="text-[10px] font-medium text-gray-400 mb-1">
                            {t("agencyDashboard.activeLicenses.to", {
                              defaultValue: "to",
                            })}{" "}
                            {new Date(lic.end_date).toLocaleDateString()}
                          </p>
                        ) : lic.deadline ? (
                          <p className="text-[10px] font-medium text-gray-400 mb-1">
                            {t(
                              "agencyDashboard.activeLicenses.headers.deadline",
                            )}
                            : {new Date(lic.deadline).toLocaleDateString()}
                          </p>
                        ) : lic.start_date && lic.duration_days ? (
                          <p className="text-[10px] font-medium text-gray-400 mb-1">
                            {t(
                              "agencyDashboard.activeLicenses.headers.deadline",
                            )}
                            :{" "}
                            {(() => {
                              const d = new Date(lic.start_date);
                              d.setDate(d.getDate() + lic.duration_days);
                              return d.toLocaleDateString();
                            })()}
                          </p>
                        ) : null}
                        {lic.days_left !== null &&
                          lic.days_left !== undefined && (
                            <p className="text-[10px] font-bold text-gray-400 italic">
                              {lic.days_left > 0
                                ? t("agencyDashboard.activeLicenses.daysLeft", {
                                    days: lic.days_left,
                                  })
                                : lic.days_left === 0
                                  ? t(
                                      "agencyDashboard.activeLicenses.expiresToday",
                                    )
                                  : t("agencyDashboard.activeLicenses.expired")}
                            </p>
                          )}
                      </>
                    ) : (
                      <p className="text-xs font-medium text-gray-400">
                        {t("agencyDashboard.activeLicenses.ongoing")}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-8">
                    <p className="text-xs font-medium text-gray-600 max-w-[140px] leading-relaxed">
                      {Array.isArray(lic.usage_scope)
                        ? lic.usage_scope.join(", ")
                        : String(lic.usage_scope || "")}
                    </p>
                  </td>
                  <td className="px-6 py-8">
                    <p className="text-sm font-bold text-gray-900 mb-2">
                      {formatMoney(lic.value)}
                    </p>
                    {lic.auto_renew && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold w-fit border border-blue-100">
                        <RefreshCw className="w-3.5 h-3.5" />{" "}
                        {t("agencyDashboard.activeLicenses.autoRenew")}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-8 whitespace-nowrap">
                    <span
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black text-white uppercase tracking-wider shadow-sm ${statusColor(lic.status)}`}
                    >
                      {t(
                        `agencyDashboard.activeLicenses.status.${String(lic.status || "").toLowerCase()}`,
                        { defaultValue: lic.status },
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-8 whitespace-nowrap text-center">
                    <div className="flex justify-center gap-2">
                      {canRenewLicense(lic) && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  className="h-9 px-4 bg-green-600 hover:bg-green-700 text-white text-[11px] font-extrabold rounded-lg flex items-center gap-2 shadow-md shadow-green-100 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                  onClick={() => handleRenew(lic)}
                                  disabled={!canManageLicenses}
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />{" "}
                                  {t(
                                    "agencyDashboard.activeLicenses.actions.renew",
                                  )}
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {!canManageLicenses && (
                              <TooltipContent>
                                <p>
                                  {t(
                                    "agencyDashboard.activeLicenses.cannotRenew",
                                    {
                                      defaultValue:
                                        "Your role cannot renew licenses",
                                    },
                                  )}
                                </p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <Button
                        variant="outline"
                        className="h-9 w-9 p-0 border-gray-200 text-gray-400 hover:text-gray-900 hover:border-gray-300 rounded-lg bg-white shadow-sm transition-all active:scale-95"
                        onClick={() => handleViewDetails(lic)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ActiveLicenseDetailsSheet
        license={selectedLicense}
        open={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onRenew={
          selectedLicense && canRenewLicense(selectedLicense)
            ? handleRenew
            : undefined
        }
        isSportsAgency={isSportsAgency}
      />
    </div>
  );
};

export default ActiveLicensesView;
