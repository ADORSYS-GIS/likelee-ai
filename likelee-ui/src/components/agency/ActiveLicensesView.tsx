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
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActiveLicenseDetailsSheet } from "@/components/licensing/ActiveLicenseDetailsSheet";
import {
  getAgencyActiveLicenses,
  getAgencyActiveLicensesStats,
} from "@/api/functions";
import { ComplianceRenewableLicense } from "@/types/licensing";

const ActiveLicensesView = ({
  onRenew,
}: {
  onRenew: (license: ComplianceRenewableLicense) => void;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedLicense, setSelectedLicense] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const handleViewDetails = (license: any) => {
    setSelectedLicense(license);
    setIsDetailsOpen(true);
  };

  const handleRenew = (license: ComplianceRenewableLicense) => {
    onRenew(license);
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
    },
  );

  const { data: stats } = useQuery({
    queryKey: ["agency", "active-licenses", "stats"],
    queryFn: () => getAgencyActiveLicensesStats(),
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

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-black text-gray-900 mb-2">
            Active Licenses
          </h2>
          <p className="text-gray-500 font-medium">
            Manage all talent licensing agreements
          </p>
        </div>
        <Button
          variant="default"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2 px-6 h-11 rounded-xl shadow-lg shadow-indigo-200"
        >
          <Download className="w-4 h-4" /> Export Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          {
            icon: CheckCircle2,
            label: "Active Licenses",
            value: stats?.active || "0",
            color: "text-green-600",
            bg: "bg-green-50",
            border: "border-green-100",
          },
          {
            icon: Clock,
            label: "Expiring Soon",
            value: stats?.expiring || "0",
            color: "text-orange-600",
            bg: "bg-orange-50",
            border: "border-orange-100",
          },
          {
            icon: AlertCircle,
            label: "Expired",
            value: stats?.expired || "0",
            color: "text-red-600",
            bg: "bg-red-50",
            border: "border-red-100",
          },
          {
            icon: DollarSign,
            label: "Total Value",
            value: formatMoney(stats?.total_value || 0),
            color: "text-indigo-600",
            bg: "bg-indigo-50",
            border: "border-indigo-100",
            large: true,
          },
        ].map((card, i) => (
          <Card
            key={i}
            className={`p-6 bg-white border ${card.border} shadow-sm rounded-2xl`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}
              >
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <p className={`text-sm font-bold ${card.color}`}>{card.label}</p>
            </div>
            <p className="text-3xl font-black text-gray-900">{card.value}</p>
          </Card>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by talent, brand, or license type..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
            />
          </div>
          <div className="flex bg-gray-100 p-1 rounded-lg ml-auto">
            {["All", "Active", "Expiring", "Expired"].map((filter) => (
              <button
                key={filter}
                onClick={() => setFilterStatus(filter)}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filterStatus === filter ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Talent
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  License Type
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Brand
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Deadline
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Usage Scope
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Value
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Actions
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
                        No active licenses found
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Try adjusting your filters or search terms
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
                      {lic.license_type || "Unknown License"}
                    </p>
                  </td>
                  <td className="px-6 py-8">
                    <p className="text-sm font-bold text-gray-900">
                      {lic.brand || "Unknown Brand"}
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
                            to {new Date(lic.end_date).toLocaleDateString()}
                          </p>
                        ) : lic.deadline ? (
                          <p className="text-[10px] font-medium text-gray-400 mb-1">
                            Deadline:{" "}
                            {new Date(lic.deadline).toLocaleDateString()}
                          </p>
                        ) : lic.start_date && lic.duration_days ? (
                          <p className="text-[10px] font-medium text-gray-400 mb-1">
                            Deadline:{" "}
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
                                ? `${lic.days_left} days left`
                                : lic.days_left === 0
                                  ? "Expires today"
                                  : "Expired"}
                            </p>
                          )}
                      </>
                    ) : (
                      <p className="text-xs font-medium text-gray-400">
                        Ongoing
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
                        <RefreshCw className="w-3.5 h-3.5" /> Auto-renew
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-8 whitespace-nowrap">
                    <span
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black text-white uppercase tracking-wider shadow-sm ${statusColor(lic.status)}`}
                    >
                      {lic.status}
                    </span>
                  </td>
                  <td className="px-6 py-8 whitespace-nowrap text-center">
                    <div className="flex justify-center gap-2">
                      {String(lic.status).includes("Expiring") && (
                        <Button
                          className="h-9 px-4 bg-green-600 hover:bg-green-700 text-white text-[11px] font-extrabold rounded-lg flex items-center gap-2 shadow-md shadow-green-100 transition-all active:scale-95"
                          onClick={() => handleRenew(lic)}
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Renew
                        </Button>
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
        onRenew={handleRenew}
      />
    </div>
  );
};

export default ActiveLicensesView;
