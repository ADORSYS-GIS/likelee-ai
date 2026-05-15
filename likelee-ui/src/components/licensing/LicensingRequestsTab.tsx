import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Filter,
  DollarSign,
  Eye,
  RefreshCw,
  FileText,
  Search,
  Link,
  Send,
  Copy,
  CheckCircle,
  X,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getAgencyLicensingRequests,
  updateAgencyLicensingRequestsStatus,
  deleteAgencyLicensingRequests,
  sendLicensingRequestPaymentLink,
} from "@/api/functions";

export const LicensingRequestsTab = ({
  isSportsAgency = false,
}: {
  isSportsAgency?: boolean;
}) => {
  const entitySingularTitle = isSportsAgency ? "Athlete" : "Talent";
  const entityPluralLower = isSportsAgency ? "athlete" : "talent";
  const { t } = useTranslation("agency");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["agency", "licensing-requests"],
    queryFn: async () => {
      const resp = await getAgencyLicensingRequests();
      // Ensure we always return an array even if backend returns an object or null
      return Array.isArray(resp) ? resp : (resp as any)?.data || [];
    },
  });

  const [sendingPaymentLink, setSendingPaymentLink] = useState<
    Record<string, boolean>
  >({});
  const [activeRequestTab, setActiveRequestTab] = useState<
    "Active" | "Archive"
  >("Active");
  const tabLabels = {
    Active: t("agencyDashboard.licensingRequests.tabs.active"),
    Archive: t("agencyDashboard.licensingRequests.tabs.archive"),
  };
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterMinLicenseFee, setFilterMinLicenseFee] = useState<string>("");
  const [filterMaxLicenseFee, setFilterMaxLicenseFee] = useState<string>("");
  const [filterMinDuration, setFilterMinDuration] = useState<string>("");
  const [filterMaxDuration, setFilterMaxDuration] = useState<string>("");
  const [deletingGroup, setDeletingGroup] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<any>(null);

  const statusStyle = (status: string) => {
    if (status === "approved") return "bg-green-100 text-green-700";
    if (status === "rejected") return "bg-red-100 text-red-700";
    // DocuSeal submission statuses
    if (status === "signed" || status === "completed") return "bg-green-100 text-green-700";
    if (status === "sent") return "bg-blue-100 text-blue-700";
    if (status === "opened") return "bg-indigo-100 text-indigo-700";
    if (status === "declined") return "bg-red-100 text-red-700";
    if (status === "draft") return "bg-slate-100 text-slate-600";
    return "bg-gray-100 text-gray-700";
  };

  const submissionStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: "Draft",
      sent: "Awaiting Signature",
      opened: "Opened",
      signed: "Signed",
      completed: "Signed",
      declined: "Declined",
      archived: "Archived",
    };
    return labels[status.toLowerCase()] ?? status;
  };

  const statusLabel = (status: string) =>
    t(`agencyDashboard.licensingRequests.status.${status}`, {
      defaultValue: status,
    });

  const formatLicenseFee = (fee?: number | null) => {
    if (typeof fee !== "number" || !Number.isFinite(fee)) return "—";
    return fee.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const handleSendPaymentLink = async (group: any) => {
    const firstTalent = (group?.talents || [])[0];
    const licensingRequestId = firstTalent?.licensing_request_id;
    if (!licensingRequestId) {
      toast({
        title: t("agencyDashboard.licensingRequests.messages.couldNotFindIds"),
        variant: "destructive" as any,
      });
      return;
    }

    setSendingPaymentLink((prev) => ({ ...prev, [group.group_key]: true }));
    try {
      const resp = await sendLicensingRequestPaymentLink(licensingRequestId);
      const emailSent = (resp as any)?.email_sent;
      // Fire-and-forget cache invalidation
      queryClient.invalidateQueries({
        queryKey: ["agency", "licensing-requests"],
      });
      toast({
        title: t("agencyDashboard.licensingRequests.messages.paymentLinkSent"),
        description: emailSent
          ? t("agencyDashboard.licensingRequests.messages.paymentLinkEmailed")
          : t(
              "agencyDashboard.licensingRequests.messages.paymentLinkGeneratedManual",
            ),
      });
    } catch (e: any) {
      let friendlyTitle = t(
        "agencyDashboard.licensingRequests.messages.sendPaymentLinkFailed",
      );
      let friendlyDesc =
        e?.message ||
        t(
          "agencyDashboard.licensingRequests.messages.couldNotGenerateSendPaymentLink",
        );
      try {
        const parsed = JSON.parse(String(e?.message || ""));
        if (
          parsed &&
          typeof parsed === "object" &&
          parsed.code === "MISSING_TALENT_STRIPE_CONNECT"
        ) {
          friendlyTitle = `Action required: connect ${entityPluralLower} payouts`;
          const missingList = Array.isArray(parsed.missing)
            ? parsed.missing
            : [];
          const missingText = missingList.length
            ? `Missing: ${missingList.join(", ")}`
            : "";
          const actionText = parsed.action ? String(parsed.action) : "";
          friendlyDesc = [String(parsed.message || ""), actionText, missingText]
            .filter((s) => Boolean(String(s || "").trim()))
            .join("\n");
        }
      } catch {
        // ignore parse errors
      }
      toast({
        title: friendlyTitle,
        description: friendlyDesc,
        variant: "destructive" as any,
      });
    } finally {
      setSendingPaymentLink((prev) => ({ ...prev, [group.group_key]: false }));
    }
  };

  const handleDeleteGroup = async (group: any) => {
    const ids = (group?.talents || [])
      .map((t: any) => t.licensing_request_id)
      .filter(Boolean);
    if (!ids.length) return;

    setDeletingGroup(group.group_key);
    try {
      await deleteAgencyLicensingRequests({
        licensing_request_ids: ids,
      });
      // Fire-and-forget cache invalidation
      queryClient.invalidateQueries({
        queryKey: ["agency", "licensing-requests"],
      });
      toast({
        title: t("agencyDashboard.licensingRequests.messages.deleted"),
        description: t(
          "agencyDashboard.licensingRequests.messages.deletedDescription",
        ),
      });
    } catch (e: any) {
      toast({
        title: t("agencyDashboard.licensingRequests.messages.deleteFailed"),
        description:
          e?.message ||
          t("agencyDashboard.licensingRequests.messages.couldNotDelete"),
        variant: "destructive" as any,
      });
    } finally {
      setDeletingGroup(null);
      setShowDeleteConfirm(false);
      setGroupToDelete(null);
    }
  };

  const getRequestDurationDays = (group: any) => {
    const startDateRaw = group?.license_start_date
      ? new Date(group.license_start_date)
      : null;
    const endDateRaw = group?.license_end_date
      ? new Date(group.license_end_date)
      : null;

    if (
      startDateRaw &&
      !Number.isNaN(startDateRaw.getTime()) &&
      endDateRaw &&
      !Number.isNaN(endDateRaw.getTime())
    ) {
      return Math.max(
        0,
        Math.ceil(
          (endDateRaw.getTime() - startDateRaw.getTime()) /
            (1000 * 60 * 60 * 24),
        ) + 1,
      );
    }

    const deadlineRaw = group?.deadline ? new Date(group.deadline) : null;
    if (deadlineRaw && !Number.isNaN(deadlineRaw.getTime())) {
      return Math.max(
        0,
        Math.ceil((deadlineRaw.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      );
    }

    return null;
  };

  const isLicenseExpired = (group: any) => {
    const now = new Date();
    const endDateRaw = group?.license_end_date
      ? new Date(group.license_end_date)
      : null;
    if (endDateRaw && !Number.isNaN(endDateRaw.getTime()) && endDateRaw < now) {
      return true;
    }
    const deadlineRaw = group?.deadline ? new Date(group.deadline) : null;
    if (
      deadlineRaw &&
      !Number.isNaN(deadlineRaw.getTime()) &&
      deadlineRaw < now
    ) {
      return true;
    }
    return false;
  };

  const filteredData = (data || []).filter((group: any) => {
    const isArchived = ["rejected", "declined", "archived"].includes(
      group.status,
    );
    const isExpired = isLicenseExpired(group);
    if (
      activeRequestTab === "Active"
        ? isArchived || isExpired
        : !isArchived && !isExpired
    )
      return false;

    if (filterStatus !== "all" && group.status !== filterStatus) return false;

    const fee = Number(group?.license_fee);
    if (filterMinLicenseFee.trim()) {
      const min = Number(filterMinLicenseFee);
      if (Number.isFinite(min) && Number.isFinite(fee) && fee < min) {
        return false;
      }
      if (Number.isFinite(min) && !Number.isFinite(fee)) return false;
    }

    if (filterMaxLicenseFee.trim()) {
      const max = Number(filterMaxLicenseFee);
      if (Number.isFinite(max) && Number.isFinite(fee) && fee > max) {
        return false;
      }
      if (Number.isFinite(max) && !Number.isFinite(fee)) return false;
    }

    const durationDays = getRequestDurationDays(group);
    if (filterMinDuration.trim()) {
      const min = Number(filterMinDuration);
      if (Number.isFinite(min)) {
        if (durationDays === null || durationDays < min) return false;
      }
    }

    if (filterMaxDuration.trim()) {
      const max = Number(filterMaxDuration);
      if (Number.isFinite(max)) {
        if (durationDays === null || durationDays > max) return false;
      }
    }

    return true;
  });

  const clearFilters = () => {
    setFilterStatus("all");
    setFilterMinLicenseFee("");
    setFilterMaxLicenseFee("");
    setFilterMinDuration("");
    setFilterMaxDuration("");
  };

  const hasActiveFilters =
    filterStatus !== "all" ||
    filterMinLicenseFee ||
    filterMaxLicenseFee ||
    filterMinDuration ||
    filterMaxDuration;

  const feePresets = [
    {
      label: t("agencyDashboard.licensingRequests.filterModal.any"),
      min: "",
      max: "",
    },
    { label: "< $1k", min: "", max: "999" },
    { label: "$1k - $5k", min: "1000", max: "5000" },
    { label: "$5k - $10k", min: "5001", max: "10000" },
    { label: "$10k+", min: "10001", max: "" },
  ];

  const durationPresets = [
    {
      label: t("agencyDashboard.licensingRequests.filterModal.any"),
      min: "",
      max: "",
    },
    {
      label: t("agencyDashboard.licensingRequests.filterModal.days0to7"),
      min: "0",
      max: "7",
    },
    {
      label: t("agencyDashboard.licensingRequests.filterModal.days8to30"),
      min: "8",
      max: "30",
    },
    {
      label: t("agencyDashboard.licensingRequests.filterModal.days31to90"),
      min: "31",
      max: "90",
    },
    {
      label: t("agencyDashboard.licensingRequests.filterModal.days90Plus"),
      min: "91",
      max: "",
    },
  ];

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold text-gray-900">
              {t("agencyDashboard.licensingRequests.title")}
            </h2>
            <div className="flex bg-gray-100 p-1 rounded-lg w-fit mt-2">
              {["Active", "Archive"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveRequestTab(tab as any)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeRequestTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                >
                  {tabLabels[tab as keyof typeof tabLabels]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-3 h-3 mr-1" />{" "}
                {t("agencyDashboard.licensingRequests.filter.clear")}
              </Button>
            )}
            <Button
              variant="outline"
              className={`flex items-center gap-2 border-gray-300 font-bold text-gray-700 bg-white ${hasActiveFilters ? "border-indigo-300 bg-indigo-50" : ""}`}
              onClick={() => setShowFilterDialog(true)}
            >
              <Filter className="w-4 h-4" />{" "}
              {t("agencyDashboard.licensingRequests.filter.button")}
              {hasActiveFilters && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-indigo-500 text-white rounded-full">
                  {
                    [
                      filterStatus !== "all",
                      filterMinLicenseFee,
                      filterMaxLicenseFee,
                      filterMinDuration,
                      filterMaxDuration,
                    ].filter(Boolean).length
                  }
                </span>
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {activeRequestTab === "Active" && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <svg
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-xs text-amber-800">
                {t("agencyDashboard.licensingRequests.archiveNotice")}
              </p>
            </div>
          )}

          {isLoading && (
            <Card className="p-8 bg-white border-2 border-gray-900 rounded-none">
              <div className="text-gray-500 font-medium">
                {t("agencyDashboard.licensingRequests.loading")}
              </div>
            </Card>
          )}

          {!isLoading && error && (
            <Card className="p-8 bg-white border-2 border-gray-900 rounded-none">
              <div className="text-red-600 font-medium">
                {t("agencyDashboard.licensingRequests.loadFailed")}
              </div>
            </Card>
          )}

          {!isLoading && !error && filteredData.length === 0 && (
            <Card className="p-8 bg-white border-2 border-gray-900 rounded-none">
              <div className="text-gray-500 font-medium">
                {activeRequestTab === "Active"
                  ? t("agencyDashboard.licensingRequests.noActiveRequests")
                  : t("agencyDashboard.licensingRequests.noArchivedRequests")}
              </div>
            </Card>
          )}

          {filteredData.map((group: any) => (
            <Card
              key={group.group_key}
              className="p-8 bg-white border-2 border-gray-900 rounded-none overflow-hidden relative"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {group.brand_name ||
                      t("agencyDashboard.licensingRequests.unknownBrand")}
                  </h3>
                  <p className="text-gray-500 font-medium">
                    {(group.campaign_title || "").trim() || "—"}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${statusStyle(group.submission_id ? (group.submission_status || group.status) : group.status)}`}
                >
                  {group.submission_id
                    ? submissionStatusLabel(group.submission_status || group.status)
                    : statusLabel(group.status)}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mb-8">
                {(group.talents || []).map((t: any) => {
                  const names = (t.talent_name || "")
                    .split(",")
                    .map((s: string) => s.trim())
                    .filter(Boolean);
                  return names.map((name: string, i: number) => (
                    <span
                      key={`${t.licensing_request_id}-${i}`}
                      className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded uppercase"
                    >
                      {name || entitySingularTitle}
                    </span>
                  ));
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12 mb-8">
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                      {t("agencyDashboard.licensingRequests.fields.licenseFee")}
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {formatLicenseFee(group.license_fee)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                      {t("agencyDashboard.licensingRequests.fields.regions")}
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {group.regions || "—"}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                      {t("agencyDashboard.licensingRequests.fields.usageScope")}
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {(group.usage_scope || "").trim() || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                      {group.license_start_date
                        ? t("agencyDashboard.licensingRequests.fields.duration")
                        : t(
                            "agencyDashboard.licensingRequests.fields.deadline",
                          )}
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {group.license_start_date && group.license_end_date
                        ? `${new Date(group.license_start_date).toLocaleDateString()} - ${new Date(group.license_end_date).toLocaleDateString()}`
                        : group.license_start_date
                          ? t("agencyDashboard.licensingRequests.fromDate", {
                              date: new Date(
                                group.license_start_date,
                              ).toLocaleDateString(),
                            })
                          : group.deadline
                            ? new Date(group.deadline).toLocaleDateString()
                            : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {group.status === "approved" ? (
                <div>
                  <Button
                    onClick={() => handleSendPaymentLink(group)}
                    disabled={sendingPaymentLink[group.group_key]}
                    className="w-full font-bold h-10 rounded-md flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                  >
                    {sendingPaymentLink[group.group_key] ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />{" "}
                        {t("agencyDashboard.licensingRequests.buttons.sending")}
                      </>
                    ) : group.payment_link_id || group.payment_link_url ? (
                      <>
                        <Send className="w-4 h-4" />{" "}
                        {t(
                          "agencyDashboard.licensingRequests.buttons.resendPaymentLink",
                        )}
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />{" "}
                        {t(
                          "agencyDashboard.licensingRequests.buttons.sendPaymentLink",
                        )}
                      </>
                    )}
                  </Button>
                </div>
              ) : activeRequestTab === "Archive" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => updateGroupStatus(group, "pending")}
                    className="border-gray-300 text-gray-700 font-bold h-10 rounded-md flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {t(
                      "agencyDashboard.licensingRequests.buttons.recoverToActive",
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setGroupToDelete(group);
                      setShowDeleteConfirm(true);
                    }}
                    disabled={deletingGroup === group.group_key}
                    className="border-red-200 text-red-600 hover:bg-red-50 font-bold h-10 rounded-md flex items-center justify-center gap-2"
                  >
                    {deletingGroup === group.group_key ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        {t(
                          "agencyDashboard.licensingRequests.messages.deleting",
                        )}
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        {t(
                          "agencyDashboard.licensingRequests.actions.deletePermanently",
                        )}
                      </>
                    )}
                  </Button>
                </div>
              ) : group.submission_id || !group.brand_id ? (
                // Agency-initiated via SubmissionWizard — no brand actions needed,
                // the agency is waiting on the client to sign. Show nothing.
                null
              ) : (
                null
              )}
            </Card>
          ))}
        </div>

        <Dialog
          open={showFilterDialog}
          onOpenChange={setShowFilterDialog}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {t("agencyDashboard.licensingRequests.filterModal.title")}
              </DialogTitle>
              <DialogDescription>
                {t("agencyDashboard.licensingRequests.filterModal.description")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>
                  {t("agencyDashboard.licensingRequests.filterModal.status")}
                </Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t(
                        "agencyDashboard.licensingRequests.filterModal.allStatuses",
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t(
                        "agencyDashboard.licensingRequests.filterModal.allStatuses",
                      )}
                    </SelectItem>
                    <SelectItem value="pending">
                      {statusLabel("pending")}
                    </SelectItem>
                    <SelectItem value="approved">
                      {statusLabel("approved")}
                    </SelectItem>
                    <SelectItem value="rejected">
                      {statusLabel("rejected")}
                    </SelectItem>
                    <SelectItem value="negotiating">
                      {statusLabel("negotiating")}
                    </SelectItem>
                    <SelectItem value="declined">
                      {statusLabel("declined")}
                    </SelectItem>
                    <SelectItem value="archived">
                      {statusLabel("archived")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  {t(
                    "agencyDashboard.licensingRequests.filterModal.licenseFee",
                  )}
                </Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {feePresets.map((preset) => {
                    const active =
                      filterMinLicenseFee === preset.min &&
                      filterMaxLicenseFee === preset.max;
                    return (
                      <Button
                        key={preset.label}
                        type="button"
                        variant={active ? "default" : "outline"}
                        onClick={() => {
                          setFilterMinLicenseFee(preset.min);
                          setFilterMaxLicenseFee(preset.max);
                        }}
                        className={`justify-center font-bold ${active ? "bg-indigo-600 text-white hover:bg-indigo-600" : "border-gray-200 text-gray-700"}`}
                      >
                        {preset.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  {t("agencyDashboard.licensingRequests.filterModal.duration")}
                </Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {durationPresets.map((preset) => {
                    const active =
                      filterMinDuration === preset.min &&
                      filterMaxDuration === preset.max;
                    return (
                      <Button
                        key={preset.label}
                        type="button"
                        variant={active ? "default" : "outline"}
                        onClick={() => {
                          setFilterMinDuration(preset.min);
                          setFilterMaxDuration(preset.max);
                        }}
                        className={`justify-center font-bold ${active ? "bg-indigo-600 text-white hover:bg-indigo-600" : "border-gray-200 text-gray-700"}`}
                      >
                        {preset.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={clearFilters}
                className="font-bold"
              >
                {t(
                  "agencyDashboard.licensingRequests.filterModal.clearFilters",
                )}
              </Button>
              <Button onClick={() => setShowFilterDialog(false)}>
                {t(
                  "agencyDashboard.licensingRequests.filterModal.applyFilters",
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {t("agencyDashboard.licensingRequests.deleteModal.title")}
              </DialogTitle>
              <DialogDescription>
                {t("agencyDashboard.licensingRequests.deleteModal.description")}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <p className="text-sm text-gray-600">
                {t(
                  "agencyDashboard.licensingRequests.deleteModal.confirmQuestion",
                )}{" "}
                <span className="font-semibold">
                  {groupToDelete?.brand_name ||
                    t(
                      "agencyDashboard.licensingRequests.deleteModal.unknownBrand",
                    )}
                </span>
                ?
              </p>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setGroupToDelete(null);
                }}
                className="font-bold"
              >
                {t("agencyDashboard.licensingRequests.deleteModal.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteGroup(groupToDelete)}
                disabled={deletingGroup === groupToDelete?.group_key}
                className="font-bold"
              >
                {deletingGroup === groupToDelete?.group_key ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {t(
                      "agencyDashboard.licensingRequests.deleteModal.deleting",
                    )}
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t("agencyDashboard.licensingRequests.deleteModal.delete")}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </>
  );
};
