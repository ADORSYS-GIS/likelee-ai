import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  CheckCircle,
  Clock,
  X,
  Calendar,
  DollarSign,
  Globe,
  Star,
  Building2,
  User,
  Edit,
  Eye,
  AlertCircle,
  FileText,
  Plus,
} from "lucide-react";

interface LicensingRequestsViewProps {
  brandLicensingRequests: any[];
  loadingBrandLicensingRequests: boolean;
  setBrandSignUrl: (url: string) => void;
  setBrandSignOpen: (open: boolean) => void;
  navigateToSection: (section: string) => void;
}

const formatLicenseStatus = (status: string) => {
  switch (String(status || "").toLowerCase()) {
    case "approved":
      return "Approved";
    case "declined":
      return "Declined";
    case "completed":
      return "Completed";
    case "pending":
    default:
      return "Pending";
  }
};

export const LicensingRequestsView: React.FC<LicensingRequestsViewProps> = ({
  brandLicensingRequests,
  loadingBrandLicensingRequests,
  setBrandSignUrl,
  setBrandSignOpen,
  navigateToSection,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            Licensing Requests
          </h2>
          <p className="text-gray-600">
            Track licensing requests you have sent to agencies and manage
            contracts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {brandLicensingRequests.length} Total
          </Badge>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="inline-flex items-center bg-gray-100 p-1 rounded-lg">
        {["all", "pending", "approved", "completed", "declined"].map(
          (status) => {
            const count =
              status === "all"
                ? brandLicensingRequests.length
                : brandLicensingRequests.filter((req) =>
                    status === "completed"
                      ? req?.license_submissions?.[0]?.status === "completed"
                      : req?.status === status,
                  ).length;

            return (
              <button
                key={status}
                className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all ${
                  "all" === status // You can add state management for active filter
                    ? "bg-white shadow-sm text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)} ({count})
              </button>
            );
          },
        )}
      </div>

      {loadingBrandLicensingRequests && (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card
              key={i}
              className="p-6 bg-white border border-gray-200 rounded-xl animate-pulse"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="h-6 bg-gray-200 rounded w-48"></div>
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="space-y-1">
                      <div className="h-3 bg-gray-200 rounded w-16"></div>
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loadingBrandLicensingRequests &&
        brandLicensingRequests.length === 0 && (
          <Card className="p-12 text-center bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-xl">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No licensing requests yet
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Start by browsing the marketplace and requesting licenses from
                agencies for their talent.
              </p>
              <Button
                onClick={() => navigateToSection("marketplace")}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Browse Marketplace
              </Button>
            </div>
          </Card>
        )}

      <div className="grid gap-4">
        {!loadingBrandLicensingRequests &&
          brandLicensingRequests.map((req: any) => {
            const agencyName =
              req?.agencies?.agency_name || req?.agency_name || "Agency";

            // Status only depends on agency action (accept/decline), never on contract signing
            const status = formatLicenseStatus(req?.status || "pending");

            // Submissions handling for contract signing UI only
            let submissions = req?.license_submissions;
            if (submissions && !Array.isArray(submissions)) {
              submissions = [submissions];
            }
            const directSubmission = req?.license_submission;
            if (directSubmission) {
              const directSubmissionList = Array.isArray(directSubmission)
                ? directSubmission
                : [directSubmission];
              const existingIds = new Set(
                (submissions || [])
                  .map((sub: any) => String(sub?.id || "").trim())
                  .filter(Boolean),
              );
              submissions = [
                ...directSubmissionList.filter((sub: any) => {
                  const id = String(sub?.id || "").trim();
                  return id ? !existingIds.has(id) : true;
                }),
                ...(submissions || []),
              ];
            }

            // Find the best submission for signing:
            // 1. Prioritize submissions with client_submitter_slug or docuseal_slug
            // 2. Exclude draft submissions
            // 3. Get the most recent one
            const submission = Array.isArray(submissions)
              ? submissions
                  .filter((sub) => sub?.status !== "draft") // Exclude drafts
                  .sort((a, b) => {
                    // Prioritize submissions with signing URLs
                    const aHasUrl = !!(
                      a?.client_submitter_slug || a?.docuseal_slug
                    );
                    const bHasUrl = !!(
                      b?.client_submitter_slug || b?.docuseal_slug
                    );

                    if (aHasUrl && !bHasUrl) return -1;
                    if (!aHasUrl && bHasUrl) return 1;

                    // Then sort by creation date (most recent first)
                    const aDate = new Date(a?.created_at || 0);
                    const bDate = new Date(b?.created_at || 0);
                    return bDate.getTime() - aDate.getTime();
                  })[0]
              : null;
            const isContractSigned = submission?.status === "completed";

            // Enhanced status styling
            const getStatusConfig = (status: string) => {
              switch (status) {
                case "Approved":
                  return {
                    bg: "bg-emerald-50",
                    text: "text-emerald-700",
                    border: "border-emerald-200",
                    icon: CheckCircle2,
                    iconColor: "text-emerald-500",
                  };
                case "Declined":
                  return {
                    bg: "bg-red-50",
                    text: "text-red-700",
                    border: "border-red-200",
                    icon: X,
                    iconColor: "text-red-500",
                  };
                case "Completed":
                  return {
                    bg: "bg-green-50",
                    text: "text-green-700",
                    border: "border-green-200",
                    icon: CheckCircle,
                    iconColor: "text-green-500",
                  };
                default:
                  return {
                    bg: "bg-amber-50",
                    text: "text-amber-700",
                    border: "border-amber-200",
                    icon: Clock,
                    iconColor: "text-amber-500",
                  };
              }
            };

            const statusConfig = getStatusConfig(status);
            const StatusIcon = statusConfig.icon;

            const licenseFeeValue = req?.license_fee;
            const licenseFee = licenseFeeValue
              ? `$${Number(licenseFeeValue).toLocaleString()}`
              : "—";

            const slug =
              submission?.client_submitter_slug || submission?.docuseal_slug;
            const signingUrl = slug ? `https://docuseal.co/s/${slug}` : "";
            const declineReason = String(req?.decline_reason || "").trim();

            const hasContractToSign = signingUrl && !isContractSigned;

            return (
              <Card
                key={req?.id}
                className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all duration-200 group"
              >
                <div className="space-y-5">
                  {/* Header */}
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {req?.campaign_title || "Licensing Request"}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600 font-medium">
                              {agencyName}
                            </span>
                            {req?.talent_name && (
                              <>
                                <span className="text-gray-400">•</span>
                                <User className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-600">
                                  {req.talent_name}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge
                        className={`${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} border font-medium px-3 py-1`}
                      >
                        <StatusIcon
                          className={`w-3 h-3 mr-1.5 ${statusConfig.iconColor}`}
                        />
                        {status}
                      </Badge>
                    </div>
                  </div>

                  {/* Key Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                        <span className="text-xs text-gray-500 font-medium">
                          Duration
                        </span>
                      </div>
                      <p className="font-bold text-gray-900">
                        {req?.duration_days ? `${req.duration_days} days` : "—"}
                      </p>
                    </div>

                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <DollarSign className="w-4 h-4 text-gray-400 mr-1" />
                        <span className="text-xs text-gray-500 font-medium">
                          License Fee
                        </span>
                      </div>
                      <p className="font-bold text-gray-900">{licenseFee}</p>
                    </div>

                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <Globe className="w-4 h-4 text-gray-400 mr-1" />
                        <span className="text-xs text-gray-500 font-medium">
                          Territory
                        </span>
                      </div>
                      <p className="font-bold text-gray-900 text-sm">
                        {req?.territory || "—"}
                      </p>
                    </div>

                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <Star className="w-4 h-4 text-gray-400 mr-1" />
                        <span className="text-xs text-gray-500 font-medium">
                          Exclusivity
                        </span>
                      </div>
                      <p className="font-bold text-gray-900 text-sm">
                        {req?.exclusivity || "—"}
                      </p>
                    </div>
                  </div>

                  {/* Additional Details */}
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-3">
                      <div>
                        <p className="text-gray-500 font-medium mb-1">
                          License Period
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-gray-900">
                            {req?.license_start_date
                              ? new Date(
                                  req.license_start_date,
                                ).toLocaleDateString()
                              : "—"}
                          </p>
                          <span className="text-gray-400">→</span>
                          <p className="text-gray-900">
                            {req?.license_end_date
                              ? new Date(
                                  req.license_end_date,
                                ).toLocaleDateString()
                              : "—"}
                          </p>
                        </div>
                      </div>

                      {req?.modifications_allowed && (
                        <div>
                          <p className="text-gray-500 font-medium mb-1">
                            Modifications
                          </p>
                          <p className="text-gray-900">
                            {req.modifications_allowed}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {req?.description && (
                        <div>
                          <p className="text-gray-500 font-medium mb-1">
                            Description
                          </p>
                          <p className="text-gray-900 leading-relaxed">
                            {req.description}
                          </p>
                        </div>
                      )}

                      {req?.custom_terms && (
                        <div>
                          <p className="text-gray-500 font-medium mb-1">
                            Additional Terms
                          </p>
                          <p className="text-gray-900 leading-relaxed">
                            {req.custom_terms}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Decline Reason */}
                  {declineReason && status === "Declined" && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-red-800 mb-1">
                            Request Declined
                          </p>
                          <p className="text-red-700 text-sm leading-relaxed">
                            {declineReason}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
                    {hasContractToSign && (
                      <Button
                        className="text-white font-semibold px-6 py-2.5 rounded-lg transition-all duration-200 hover:shadow-md"
                        style={{ backgroundColor: "#E9A23B" }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = "#D4941F")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor = "#E9A23B")
                        }
                        onClick={() => {
                          setBrandSignUrl(signingUrl);
                          setBrandSignOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Sign Contract
                      </Button>
                    )}

                    {isContractSigned && (
                      <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2.5 rounded-lg border border-green-200">
                        <CheckCircle className="w-4 h-4" />
                        <span className="font-semibold text-sm">
                          Contract Signed
                        </span>
                      </div>
                    )}

                    {!hasContractToSign && !isContractSigned && (
                      <div className="flex items-center gap-2 bg-gray-50 text-gray-600 px-4 py-2.5 rounded-lg border border-gray-200">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          Awaiting contract from agency
                        </span>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
      </div>
    </div>
  );
};
