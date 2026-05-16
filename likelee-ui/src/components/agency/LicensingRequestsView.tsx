import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Filter,
  CheckCircle2,
  Send,
  RefreshCw,
  Eye,
  X,
  Trash2,
  AlertTriangle,
  MessageSquare,
  UserX,
  Info,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  getAgencyBrandLicenseRequests,
  updateAgencyBrandLicenseRequestStatus,
} from "@/api/functions";

const LicensingRequestsView = ({
  isSportsAgency = false,
  onBrandRequestAccepted,
}: {
  isSportsAgency?: boolean;
  onBrandRequestAccepted?: (ctx: {
    brandId: string;
    brandName?: string;
    brandEmail?: string;
    licensingRequestId?: string;
    talentId?: string;
    talentName?: string;
  }) => void;
}) => {
  const { t } = useTranslation("agency");
  const entitySingularTitle = isSportsAgency ? "Athlete" : "Talent";
  const entityPluralLower = isSportsAgency ? "athlete" : "talent";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["agency", "licensing-requests"],
    queryFn: async () => {
      const resp = await getAgencyLicensingRequests();
      return resp as any[];
    },
  });

  const {
    data: rawBrandLicenseData,
    isLoading: isLoadingBrandRequests,
    error: brandRequestsError,
  } = useQuery({
    queryKey: ["agency", "brand-license-requests"],
    queryFn: async () => {
      const resp = await getAgencyBrandLicenseRequests();
      return resp as any;
    },
  });
  const brandLicenseData = Array.isArray(rawBrandLicenseData)
    ? rawBrandLicenseData
    : rawBrandLicenseData?.requests || [];

  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [counterOfferModalOpen, setCounterOfferModalOpen] = useState(false);
  const [counterOfferMessage, setCounterOfferMessage] = useState("");
  const [groupToCounter, setGroupToCounter] = useState<any>(null);
  const [sendingCounterOffer, setSendingCounterOffer] = useState(false);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [groupToDecline, setGroupToDecline] = useState<any>(null);
  const [isDeclining, setIsDeclining] = useState(false);
  const [activeRequestTab, setActiveRequestTab] = useState<
    "Active" | "Archive" | "Brand Requests"
  >("Active");
  const [sendPaymentBusyKey, setSendPaymentBusyKey] = useState<string>("");
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  // Payment readiness modal — shown when talents are missing Stripe Connect
  const [paymentReadinessModal, setPaymentReadinessModal] = useState<{
    open: boolean;
    missingTalents: string[];
    action: string;
  }>({ open: false, missingTalents: [], action: "" });
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterMinLicenseFee, setFilterMinLicenseFee] = useState<string>("");
  const [filterMaxLicenseFee, setFilterMaxLicenseFee] = useState<string>("");
  const [filterMinDuration, setFilterMinDuration] = useState<string>("");
  const [filterMaxDuration, setFilterMaxDuration] = useState<string>("");
  const [deletingGroup, setDeletingGroup] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<any>(null);
  const [recoveringGroup, setRecoveringGroup] = useState<string | null>(null);

  useEffect(() => {
    if (activeRequestTab === "Active" && Array.isArray(data)) {
      const pending = data.filter((r: any) => r.status === "pending").length;
      localStorage.setItem("regular_licensing_seen_count", String(pending));
    } else if (
      activeRequestTab === "Brand Requests" &&
      Array.isArray(brandLicenseData)
    ) {
      const pending = brandLicenseData.filter(
        (r: any) => r.status === "pending",
      ).length;
      localStorage.setItem("brand_licensing_seen_count", String(pending));
    }
  }, [activeRequestTab, data, brandLicenseData]);

  const statusStyle = (status: string) => {
    if (status === "approved") return "bg-green-100 text-green-700";
    if (status === "rejected" || status === "declined")
      return "bg-red-100 text-red-700";
    if (status === "signed" || status === "completed")
      return "bg-green-100 text-green-700";
    if (status === "sent" || status === "client_pending")
      return "bg-blue-100 text-blue-700";
    if (status === "agency_pending") return "bg-purple-100 text-purple-700";
    if (status === "opened") return "bg-yellow-100 text-yellow-700";
    if (status === "archived" || status === "expired")
      return "bg-gray-100 text-gray-700";
    return "bg-gray-100 text-gray-700";
  };

  const statusLabel = (status: string) =>
    t(`agencyDashboard.licensingRequests.status.${status}`, {
      defaultValue: status,
    });

  const submissionStatusLabel = (status: string) => {
    const translationKeys: Record<string, string> = {
      draft: "draft",
      sent: "sent",
      opened: "opened",
      signed: "signed",
      completed: "signed",
      declined: "declined",
      archived: "archived",
      expired: "expired",
      client_pending: "clientPending",
      agency_pending: "agencyPending",
    };
    const normalized = status.toLowerCase();
    const translationKey = translationKeys[normalized];
    if (!translationKey) return status;
    return t(`agencyDashboard.licenseSubmissions.status.${translationKey}`, {
      defaultValue: status,
    });
  };

  const getDisplayStatus = (group: any) => {
    const submissionStatus = String(group?.submission_status || "")
      .trim()
      .toLowerCase();
    if (submissionStatus) {
      return {
        value: submissionStatus,
        label: submissionStatusLabel(submissionStatus),
      };
    }
    return {
      value: String(group?.status || "pending").toLowerCase(),
      label: statusLabel(group?.status || "pending"),
    };
  };

  const formatLicenseFee = (fee?: number | null) => {
    if (typeof fee !== "number" || !Number.isFinite(fee)) return "—";
    return fee.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const DetailMetric = ({
    label,
    value,
    compact = false,
  }: {
    label: string;
    value: React.ReactNode;
    compact?: boolean;
  }) => (
    <div
      className={`rounded-xl border border-slate-200 bg-slate-50/70 ${
        compact ? "p-2.5" : "p-3"
      }`}
    >
      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p
        className={`font-bold text-slate-900 ${
          compact ? "text-xs leading-4" : "text-sm leading-5"
        }`}
      >
        {value}
      </p>
    </div>
  );

  const handleSendCounterOffer = async () => {
    if (!groupToCounter || !counterOfferMessage.trim()) return;
    setSendingCounterOffer(true);
    try {
      const ids = (groupToCounter?.talents || [])
        .map((t: any) => t.licensing_request_id)
        .filter(Boolean);
      await updateAgencyLicensingRequestsStatus({
        licensing_request_ids: ids,
        status: "negotiating",
        notes: counterOfferMessage,
      });
      await queryClient.invalidateQueries({
        queryKey: ["agency", "licensing-requests"],
      });
      toast({
        title: t("agencyDashboard.licensingRequests.messages.counterOfferSent"),
        description: t(
          "agencyDashboard.licensingRequests.messages.clientNotified",
        ),
      });
      setCounterOfferModalOpen(false);
      setCounterOfferMessage("");
      setGroupToCounter(null);
    } catch (e: any) {
      toast({
        title: t(
          "agencyDashboard.licensingRequests.messages.failedToSendCounterOffer",
        ),
        description:
          e?.message ||
          t(
            "agencyDashboard.licensingRequests.messages.couldNotSendCounterOffer",
          ),
        variant: "destructive" as any,
      });
    } finally {
      setSendingCounterOffer(false);
    }
  };

  const updateGroupStatus = async (
    group: any,
    status:
      | "pending"
      | "approved"
      | "rejected"
      | "declined"
      | "negotiating"
      | "archived",
    notes?: string,
  ) => {
    const ids = (group?.talents || [])
      .map((t: any) => t.licensing_request_id)
      .filter(Boolean);
    if (!ids.length) {
      toast({
        title: t("agencyDashboard.licensingRequests.messages.updateFailed"),
        description: t(
          "agencyDashboard.licensingRequests.messages.couldNotFindIds",
        ),
        variant: "destructive" as any,
      });
      return;
    }

    try {
      await updateAgencyLicensingRequestsStatus({
        licensing_request_ids: ids,
        status,
        notes,
      });
      // Fire-and-forget cache invalidation
      queryClient.invalidateQueries({
        queryKey: ["agency", "licensing-requests"],
      });
      if (status === "approved") {
        const isBrand = isBrandRequestGroup(group);
        if (isBrand && onBrandRequestAccepted) {
          onBrandRequestAccepted({
            brandId: String(group?.brand_id || ""),
            brandName: String(group?.brand_name || ""),
            brandEmail: String(group?.brand_email || ""),
            licensingRequestId: String(ids[0] || ""),
          });
        }
      }
      if (status === "negotiating") {
        setCounterOfferModalOpen(false);
        setCounterOfferMessage("");
        setGroupToCounter(null);
        toast({
          title: t(
            "agencyDashboard.licensingRequests.messages.counterOfferSent",
          ),
          description: t(
            "agencyDashboard.licensingRequests.messages.clientNotified",
          ),
        });
      }
      if (status === "declined" || status === "rejected") {
        toast({
          title: t(
            "agencyDashboard.licensingRequests.messages.requestDeclined",
          ),
          description: t(
            "agencyDashboard.licensingRequests.messages.requestDeclinedDescription",
          ),
        });
      }
      if (status === "approved") {
        toast({
          title: t(
            "agencyDashboard.licensingRequests.messages.requestApproved",
          ),
          description: t(
            "agencyDashboard.licensingRequests.messages.requestApprovedDescription",
          ),
        });
      }
    } catch (e: any) {
      toast({
        title: t("agencyDashboard.licensingRequests.messages.updateFailed"),
        description:
          e?.message ||
          t("agencyDashboard.licensingRequests.messages.couldNotUpdate"),
        variant: "destructive" as any,
      });
    }
  };

  const updateBrandRequestStatus = async (
    req: any,
    status: "pending" | "approved" | "rejected" | "declined" | "archived",
    decline_reason?: string,
  ) => {
    try {
      await updateAgencyBrandLicenseRequestStatus({
        brand_request_ids: [req.id],
        status,
        decline_reason,
      });
      // Fire-and-forget cache invalidation
      queryClient.invalidateQueries({
        queryKey: ["agency", "brand-license-requests"],
      });
      if (status === "approved" && onBrandRequestAccepted) {
        onBrandRequestAccepted({
          brandId: String(req?.brand_id || ""),
          brandName: String(req?.brands?.company_name || ""),
          brandEmail: String(req?.brands?.email || ""),
          licensingRequestId: String(req?.id || ""),
          talentId: String(req?.talent_id || ""),
          talentName: String(
            req?.talent_name ||
              req?.creators?.full_legal_name ||
              req?.creators?.stage_name ||
              entitySingularTitle,
          ),
        });
      }
      if (["declined", "rejected"].includes(status)) {
        setShowDeclineConfirm(false);
        setGroupToDecline(null);
        toast({
          title: t(
            "agencyDashboard.licensingRequests.messages.requestDeclined",
          ),
          description: t(
            "agencyDashboard.licensingRequests.messages.requestDeclinedDescription",
          ),
        });
      }
    } catch (e: any) {
      toast({
        title: t("agencyDashboard.licensingRequests.messages.updateFailed"),
        description:
          e?.message ||
          t(
            "agencyDashboard.licensingRequests.toast.couldNotUpdateBrandLicenseRequest",
          ),
        variant: "destructive" as any,
      });
    }
  };

  const sendPaymentLinkForGroup = async (group: any) => {
    const ids = (group?.talents || [])
      .map((t: any) => t.licensing_request_id)
      .filter(Boolean);
    if (!ids.length) return;

    const licensingRequestId = String(ids[0] || "");
    if (!licensingRequestId) return;

    const groupKey = String(group?.group_key || "");
    setSendPaymentBusyKey(groupKey);
    try {
      const resp: any =
        await sendLicensingRequestPaymentLink(licensingRequestId);
      const paymentLinkUrl = String(resp?.payment_link_url || "");

      // Fire-and-forget cache invalidation
      queryClient.invalidateQueries({
        queryKey: ["agency", "licensing-requests"],
      });

      toast({
        title: t("agencyDashboard.licensingRequests.messages.paymentLinkSent"),
        description: paymentLinkUrl
          ? t("agencyDashboard.licensingRequests.messages.paymentLinkGenerated")
          : t(
              "agencyDashboard.licensingRequests.messages.paymentLinkSentSimple",
            ),
      });
    } catch (e: any) {
      // The base44Client extracts only the message string into e.message,
      // but preserves the full raw error payload on e.data.
      // Check e.data first for the structured MISSING_TALENT_STRIPE_CONNECT payload.
      const rawData = e?.data;
      const normalizedData =
        rawData && typeof rawData === "object"
          ? rawData
          : (() => {
              try {
                return JSON.parse(String(rawData || ""));
              } catch {
                return null;
              }
            })();

      // Also try parsing e.message in case the client serialized it there
      const parsedMessage = (() => {
        try {
          return JSON.parse(String(e?.message || ""));
        } catch {
          return null;
        }
      })();

      const structured = normalizedData || parsedMessage;

      if (structured?.code === "MISSING_TALENT_STRIPE_CONNECT") {
        setPaymentReadinessModal({
          open: true,
          missingTalents: Array.isArray(structured.missing)
            ? structured.missing
            : [],
          action: String(structured.action || ""),
        });
        return;
      }

      toast({
        title: t(
          "agencyDashboard.licensingRequests.messages.sendPaymentLinkFailed",
        ),
        description:
          e?.message ||
          t(
            "agencyDashboard.licensingRequests.messages.couldNotGenerateSendPaymentLink",
          ),
        variant: "destructive" as any,
      });
    } finally {
      setSendPaymentBusyKey("");
    }
  };

  const handleRecoverGroup = async (group: any) => {
    const groupKey = String(group?.group_key || "");
    setRecoveringGroup(groupKey);
    try {
      await updateGroupStatus(group, "pending");
      toast({
        title: t("agencyDashboard.licensingRequests.messages.recovered"),
        description: t(
          "agencyDashboard.licensingRequests.messages.recoveredDescription",
        ),
      });
    } catch (e: any) {
      toast({
        title: t("agencyDashboard.licensingRequests.messages.recoveryFailed"),
        description:
          e?.message ||
          t("agencyDashboard.licensingRequests.messages.couldNotRecover"),
        variant: "destructive" as any,
      });
    } finally {
      setRecoveringGroup(null);
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

  const getRequestDetails = (group: any) => {
    const rawNotes = String(group?.notes || "").trim();
    if (!rawNotes) return {};
    try {
      const parsed = JSON.parse(rawNotes);
      if (parsed && typeof parsed === "object")
        return parsed as Record<string, any>;
      return {};
    } catch {
      return {};
    }
  };

  const isBrandRequestGroup = (group: any) => {
    const details = getRequestDetails(group);
    const source = String(details?.source || "").toLowerCase();
    return source === "brand_dashboard";
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
    const isBrandRequest = isBrandRequestGroup(group);
    if (activeRequestTab === "Active") {
      if (isArchived || isExpired) return false;
    } else {
      if (!isArchived && !isExpired) return false;
    }
    return !isBrandRequest;
  });

  const filteredRegularData = filteredData.filter((group: any) => {
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

  const filteredBrandData = brandLicenseData.filter((req: any) => {
    const isArchived = ["rejected", "declined", "archived"].includes(
      req.status,
    );
    return activeRequestTab === "Active" ? !isArchived : true;
    // In this view, "Brand Requests" tab shows all pending brand requests.
  });

  const tabLabels = {
    Active: t("agencyDashboard.licensingRequests.tabs.active"),
    Archive: t("agencyDashboard.licensingRequests.tabs.archive"),
    "Brand Requests": t("agencyDashboard.licensingRequests.tabs.brandRequests"),
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold text-gray-900">
              {t("agencyDashboard.licensingRequests.title")}
            </h2>
            <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1 sm:flex sm:w-fit">
              {["Active", "Archive", "Brand Requests"].map((tab) => {
                let badgeCount = 0;
                if (tab === "Active") {
                  const pending = (data || []).filter(
                    (r: any) => r.status === "pending",
                  ).length;
                  const seen = parseInt(
                    localStorage.getItem("regular_licensing_seen_count") || "0",
                    10,
                  );
                  badgeCount =
                    activeRequestTab === "Active"
                      ? 0
                      : Math.max(0, pending - seen);
                } else if (tab === "Brand Requests") {
                  const pending = brandLicenseData.filter(
                    (r: any) => r.status === "pending",
                  ).length;
                  const seen = parseInt(
                    localStorage.getItem("brand_licensing_seen_count") || "0",
                    10,
                  );
                  badgeCount =
                    activeRequestTab === "Brand Requests"
                      ? 0
                      : Math.max(0, pending - seen);
                }

                return (
                  <button
                    key={tab}
                    onClick={() => setActiveRequestTab(tab as any)}
                    className={`min-h-[44px] px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 text-center ${activeRequestTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                  >
                    {tabLabels[tab as keyof typeof tabLabels]}
                    {badgeCount > 0 && (
                      <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        {badgeCount}
                      </span>
                    )}
                  </button>
                );
              })}
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
              className={`flex w-full items-center justify-center gap-2 border-gray-300 font-bold text-gray-700 bg-white sm:w-auto ${hasActiveFilters ? "border-indigo-300 bg-indigo-50" : ""}`}
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
            <div className="space-y-4">
              <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl shadow-sm">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-blue-800 font-medium leading-relaxed">
                    {t(
                      "agencyDashboard.licensingRequests.info.paidRequests",
                      { defaultValue: "Fully paid licensing requests are systematically moved to the Archive tab. They will remain available to be linked to new Catalogs in the Catalog Builder until their license expiration date." }
                    )}
                  </p>
                </div>
              </div>

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

          {!isLoading &&
            !error &&
            filteredRegularData.length === 0 &&
            activeRequestTab !== "Brand Requests" && (
              <Card className="p-8 bg-white border-2 border-gray-900 rounded-none">
                <div className="text-gray-500 font-medium">
                  {activeRequestTab === "Active"
                    ? t("agencyDashboard.licensingRequests.noActive")
                    : t("agencyDashboard.licensingRequests.noArchived")}
                </div>
              </Card>
            )}

          {activeRequestTab !== "Brand Requests" &&
            filteredRegularData.map((group: any) => {
              const displayStatus = getDisplayStatus(group);
              return (
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
                        {(group.campaign_title || "").trim() || "\u2014"}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${statusStyle(displayStatus.value)}`}
                    >
                      {displayStatus.label}
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

                  <div className="mb-8 grid grid-cols-2 gap-3">
                    <DetailMetric
                      label={t(
                        "agencyDashboard.licensingRequests.fields.licenseFee",
                      )}
                      value={formatLicenseFee(group.license_fee)}
                    />
                    <DetailMetric
                      label={t(
                        "agencyDashboard.licensingRequests.fields.regions",
                      )}
                      value={group.regions || "\u2014"}
                    />
                    <DetailMetric
                      label={t(
                        "agencyDashboard.licensingRequests.fields.usageScope",
                      )}
                      value={(() => {
                        const details = getRequestDetails(group);
                        const territory = String(
                          details?.territory || "",
                        ).trim();
                        if (territory) return territory;
                        return (group.usage_scope || "").trim() || "\u2014";
                      })()}
                    />
                    <DetailMetric
                      label={
                        group.license_start_date
                          ? t(
                              "agencyDashboard.licensingRequests.fields.duration",
                            )
                          : t(
                              "agencyDashboard.licensingRequests.fields.deadline",
                            )
                      }
                      value={
                        group.license_start_date && group.license_end_date
                          ? `${new Date(group.license_start_date).toLocaleDateString()} - ${new Date(group.license_end_date).toLocaleDateString()}`
                          : group.license_start_date
                            ? t("agencyDashboard.licensingRequests.fromDate", {
                                date: new Date(
                                  group.license_start_date,
                                ).toLocaleDateString(),
                              })
                            : group.deadline
                              ? new Date(group.deadline).toLocaleDateString()
                              : "\u2014"
                      }
                    />
                  </div>

                  {group.status === "approved" ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center h-11 bg-green-50 rounded-md border border-green-200">
                        <p className="text-xs font-black text-green-700 uppercase tracking-widest flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />{" "}
                          {t(
                            "agencyDashboard.licensingRequests.status.approved",
                          )}
                        </p>
                      </div>
                      {group.payment_link_id || group.payment_link_url ? (
                        <Button
                          onClick={() => sendPaymentLinkForGroup(group)}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 rounded-md flex items-center justify-center gap-2"
                          disabled={
                            !!sendPaymentBusyKey &&
                            sendPaymentBusyKey ===
                              String(group?.group_key || "")
                          }
                        >
                          <Send className="w-4 h-4" />
                          {sendPaymentBusyKey === String(group?.group_key || "")
                            ? t(
                                "agencyDashboard.licensingRequests.buttons.sending",
                              )
                            : t(
                                "agencyDashboard.licensingRequests.buttons.resendPaymentLink",
                              )}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => sendPaymentLinkForGroup(group)}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 rounded-md flex items-center justify-center gap-2"
                          disabled={
                            !!sendPaymentBusyKey &&
                            sendPaymentBusyKey ===
                              String(group?.group_key || "")
                          }
                        >
                          <Send className="w-4 h-4" />
                          {sendPaymentBusyKey === String(group?.group_key || "")
                            ? t(
                                "agencyDashboard.licensingRequests.buttons.sending",
                              )
                            : t(
                                "agencyDashboard.licensingRequests.buttons.sendPaymentLink",
                              )}
                        </Button>
                      )}
                    </div>
                  ) : activeRequestTab === "Archive" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button
                        variant="outline"
                        onClick={() => handleRecoverGroup(group)}
                        disabled={recoveringGroup === group.group_key}
                        className="border-gray-300 text-gray-700 font-bold h-11 rounded-md flex items-center justify-center gap-2"
                      >
                        {recoveringGroup === group.group_key ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            {t(
                              "agencyDashboard.licensingRequests.messages.recovering",
                            )}
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4" />
                            {t(
                              "agencyDashboard.licensingRequests.actions.recoverToActive",
                            )}
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setGroupToDelete(group);
                          setShowDeleteConfirm(true);
                        }}
                        disabled={deletingGroup === group.group_key}
                        className="border-red-200 text-red-600 hover:bg-red-50 font-bold h-11 rounded-md flex items-center justify-center gap-2"
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
                  ) : null}
                </Card>
              );
            })}

          {activeRequestTab === "Brand Requests" &&
            !isLoadingBrandRequests &&
            brandLicenseData.length === 0 && (
              <Card className="p-8 bg-white border-2 border-gray-900 rounded-none">
                <div className="text-gray-500 font-medium">
                  {t("agencyDashboard.licensingRequests.noActiveBrandRequests")}
                </div>
              </Card>
            )}

          {activeRequestTab === "Brand Requests" &&
            filteredBrandData.map((req: any) => (
              <Card
                key={req.id}
                className="p-8 bg-white border-2 border-gray-900 rounded-none overflow-hidden relative"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {req.brands?.company_name ||
                        t(
                          "agencyDashboard.licensingRequests.brandRequests.unknownBrand",
                        )}
                    </h3>
                    <p className="text-gray-500 font-medium text-sm">
                      {req.description ||
                        t(
                          "agencyDashboard.licensingRequests.brandRequests.noDescription",
                        )}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${statusStyle(req.status)}`}
                  >
                    {statusLabel(req.status)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-8">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded uppercase">
                    {req.talent_name ||
                      req.creators?.full_legal_name ||
                      req.creators?.stage_name ||
                      t("agencyDashboard.roster.states.unknown")}
                  </span>
                </div>

                <div className="mb-8 grid grid-cols-3 gap-2 sm:gap-3">
                  <DetailMetric
                    compact
                    label={t(
                      "agencyDashboard.licensingRequests.fields.licenseFee",
                    )}
                    value={
                      req.license_fee
                        ? `$${Number(req.license_fee).toLocaleString()}`
                        : "\u2014"
                    }
                  />
                  <DetailMetric
                    compact
                    label={t(
                      "agencyDashboard.licensingRequests.fields.territory",
                    )}
                    value={req.territory || req.usage_scope || "\u2014"}
                  />
                  <DetailMetric
                    compact
                    label={t(
                      "agencyDashboard.licensingRequests.fields.exclusivity",
                    )}
                    value={req.exclusivity || "\u2014"}
                  />
                  <DetailMetric
                    compact
                    label={t(
                      "agencyDashboard.licensingRequests.fields.duration",
                    )}
                    value={
                      req.duration_days
                        ? t("agencyDashboard.licensingRequests.days", {
                            count: req.duration_days,
                          })
                        : "\u2014"
                    }
                  />
                  <DetailMetric
                    compact
                    label={t(
                      "agencyDashboard.licensingRequests.fields.timeline",
                    )}
                    value={
                      req.license_start_date && req.license_end_date
                        ? `${new Date(req.license_start_date).toLocaleDateString()} - ${new Date(req.license_end_date).toLocaleDateString()}`
                        : req.license_start_date
                          ? t("agencyDashboard.licensingRequests.fromDate", {
                              date: new Date(
                                req.license_start_date,
                              ).toLocaleDateString(),
                            })
                          : "\u2014"
                    }
                  />
                  <DetailMetric
                    compact
                    label={t(
                      "agencyDashboard.licensingRequests.fields.modsAllowed",
                    )}
                    value={req.modifications_allowed || "\u2014"}
                  />
                </div>

                {req.custom_terms && (
                  <div className="mb-8">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                      {t(
                        "agencyDashboard.licensingRequests.brandRequests.customTerms",
                      )}
                    </p>
                    <p className="text-sm font-medium text-gray-900 whitespace-pre-wrap">
                      {req.custom_terms}
                    </p>
                  </div>
                )}

                {req.status === "approved" ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center h-11 bg-green-50 rounded-md border border-green-200">
                      <p className="text-xs font-black text-green-700 uppercase tracking-widest flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />{" "}
                        {t(
                          "agencyDashboard.licensingRequests.fields.contractPhase",
                        )}
                      </p>
                    </div>
                  </div>
                ) : req.status === "declined" ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center h-11 bg-red-50 rounded-md border border-red-200">
                      <p className="text-xs font-black text-red-700 uppercase tracking-widest flex items-center gap-2">
                        <X className="w-4 h-4" />
                        {t("agencyDashboard.licensingRequests.status.declined")}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      onClick={() => updateBrandRequestStatus(req, "approved")}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold h-11 rounded-md flex items-center justify-center gap-2"
                    >
                      <div className="w-4 h-4 rounded-full border-2 border-white flex items-center justify-center">
                        <span className="text-[10px] font-bold">✓</span>
                      </div>
                      {t(
                        "agencyDashboard.licensingRequests.actions.acceptWriteContract",
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setGroupToDecline(req);
                        setShowDeclineConfirm(true);
                      }}
                      className="border-red-200 text-red-600 hover:bg-red-50 font-bold h-11 rounded-md flex items-center justify-center gap-2"
                    >
                      <div className="w-4 h-4 rounded-full border-2 border-red-200 flex items-center justify-center">
                        <X className="w-3 h-3" />
                      </div>
                      {t("agencyDashboard.licensingRequests.actions.decline")}
                    </Button>
                  </div>
                )}
              </Card>
            ))}
        </div>

        <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
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
                {t("agencyDashboard.licensingRequests.filterModal.clear")}
              </Button>
              <Button onClick={() => setShowFilterDialog(false)}>
                {t("agencyDashboard.licensingRequests.filterModal.apply")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={counterOfferModalOpen}
          onOpenChange={setCounterOfferModalOpen}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {t("agencyDashboard.licensingRequests.counterOfferModal.title")}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "agencyDashboard.licensingRequests.counterOfferModal.description",
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>
                  {t(
                    "agencyDashboard.licensingRequests.counterOfferModal.messageLabel",
                  )}
                </Label>
                <Textarea
                  value={counterOfferMessage}
                  onChange={(e) => setCounterOfferMessage(e.target.value)}
                  placeholder={t(
                    "agencyDashboard.licensingRequests.counterOfferModal.messagePlaceholder",
                  )}
                  rows={5}
                  className="resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCounterOfferModalOpen(false)}
                className="font-bold"
              >
                {t(
                  "agencyDashboard.licensingRequests.counterOfferModal.cancel",
                )}
              </Button>
              <Button
                onClick={handleSendCounterOffer}
                disabled={!counterOfferMessage.trim() || sendingCounterOffer}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                {sendingCounterOffer ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {t(
                      "agencyDashboard.licensingRequests.messages.sendingCounterOffer",
                    )}
                  </>
                ) : (
                  t("agencyDashboard.licensingRequests.counterOfferModal.send")
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {t("agencyDashboard.licensingRequests.deleteModal.title")}
              </DialogTitle>
              <DialogDescription>
                {groupToDelete?.status === "archived"
                  ? t(
                      "agencyDashboard.licensingRequests.deleteModal.description",
                    )
                  : t(
                      "agencyDashboard.licensingRequests.deleteModal.descriptionActive",
                    )}
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

        <Dialog
          open={showDeclineConfirm}
          onOpenChange={(open) => {
            setShowDeclineConfirm(open);
            if (!open) {
              setGroupToDecline(null);
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {t("agencyDashboard.licensingRequests.declineModal.title")}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "agencyDashboard.licensingRequests.declineModal.description",
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <p className="text-sm text-gray-600">
                {t(
                  "agencyDashboard.licensingRequests.declineModal.confirmQuestion",
                )}{" "}
                <span className="font-semibold">
                  {groupToDecline?.brand_name ||
                    groupToDecline?.brands?.company_name ||
                    t(
                      "agencyDashboard.licensingRequests.declineModal.thisBrand",
                    )}
                </span>
                .
              </p>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeclineConfirm(false);
                  setGroupToDecline(null);
                }}
                className="font-bold"
              >
                {t("agencyDashboard.licensingRequests.declineModal.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  setIsDeclining(true);
                  try {
                    const isBrandRequest =
                      groupToDecline?.id &&
                      !groupToDecline?.group_key &&
                      groupToDecline?.brands;
                    if (isBrandRequest) {
                      await updateBrandRequestStatus(
                        groupToDecline,
                        "declined",
                      );
                    } else {
                      await updateGroupStatus(groupToDecline, "declined");
                    }
                    setShowDeclineConfirm(false);
                    setGroupToDecline(null);
                  } finally {
                    setIsDeclining(false);
                  }
                }}
                disabled={isDeclining}
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                {isDeclining ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {t(
                      "agencyDashboard.licensingRequests.declineModal.declining",
                    )}
                  </>
                ) : (
                  t("agencyDashboard.licensingRequests.declineModal.yesDecline")
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={!!selectedGroup}
          onOpenChange={(open) => {
            if (!open) setSelectedGroup(null);
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {t("agencyDashboard.licensingRequests.detailsModal.title")}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "agencyDashboard.licensingRequests.detailsModal.description",
                )}
              </DialogDescription>
            </DialogHeader>

            {selectedGroup && (
              <div className="space-y-4 py-2">
                {(() => {
                  const details = getRequestDetails(selectedGroup);
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">
                          {t(
                            "agencyDashboard.licensingRequests.detailsModal.campaign",
                          )}
                        </p>
                        <p className="font-semibold text-gray-900">
                          {selectedGroup?.campaign_title || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">
                          {t(
                            "agencyDashboard.licensingRequests.detailsModal.category",
                          )}
                        </p>
                        <p className="font-semibold text-gray-900">
                          {String(details?.category || "—")}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">
                          {t(
                            "agencyDashboard.licensingRequests.detailsModal.exclusivity",
                          )}
                        </p>
                        <p className="font-semibold text-gray-900">
                          {String(details?.exclusivity || "—")}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">
                          {t(
                            "agencyDashboard.licensingRequests.detailsModal.offerAmount",
                          )}
                        </p>
                        <p className="font-semibold text-gray-900">
                          {typeof details?.offer_amount === "number"
                            ? `$${details.offer_amount.toLocaleString()}`
                            : "—"}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-gray-500">
                          {t(
                            "agencyDashboard.licensingRequests.detailsModal.description",
                          )}
                        </p>
                        <p className="font-medium text-gray-900 whitespace-pre-wrap">
                          {String(details?.description || "—")}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-gray-500">
                          {t(
                            "agencyDashboard.licensingRequests.detailsModal.customTerms",
                          )}
                        </p>
                        <p className="font-medium text-gray-900 whitespace-pre-wrap">
                          {String(details?.custom_terms || "—")}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-gray-500">
                          {t(
                            "agencyDashboard.licensingRequests.detailsModal.modificationsAllowed",
                          )}
                        </p>
                        <p className="font-medium text-gray-900">
                          {String(details?.modifications_allowed || "—")}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Payment Readiness Modal — replaces the red destructive toast */}
        <Dialog
          open={paymentReadinessModal.open}
          onOpenChange={(open) =>
            setPaymentReadinessModal((prev) => ({ ...prev, open }))
          }
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
                <DialogTitle className="text-lg font-bold text-gray-900">
                  {isSportsAgency
                    ? t(
                        "agencyDashboard.licensingRequests.paymentReadinessModal.titleAthlete",
                      )
                    : t(
                        "agencyDashboard.licensingRequests.paymentReadinessModal.title",
                      )}
                </DialogTitle>
              </div>
              <DialogDescription className="text-sm text-gray-500 ml-13 pl-[52px]">
                {isSportsAgency
                  ? t(
                      "agencyDashboard.licensingRequests.paymentReadinessModal.descriptionAthlete",
                    )
                  : t(
                      "agencyDashboard.licensingRequests.paymentReadinessModal.description",
                    )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              {paymentReadinessModal.missingTalents.map((talent, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                    <UserX className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {talent.replace(/\s*\([^)]*\)\s*$/, "") || talent}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {/\(([^)]+)\)/.exec(talent)?.[1] ??
                        t(
                          "agencyDashboard.licensingRequests.paymentReadinessModal.accountSetupIncomplete",
                        )}
                    </p>
                  </div>
                </div>
              ))}

              {paymentReadinessModal.action && (
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                  <p className="text-xs text-indigo-700 leading-relaxed">
                    {paymentReadinessModal.action}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  setPaymentReadinessModal((prev) => ({
                    ...prev,
                    open: false,
                  }))
                }
                className="font-bold border-gray-200"
              >
                {t(
                  "agencyDashboard.licensingRequests.paymentReadinessModal.close",
                )}
              </Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2"
                onClick={() => {
                  setPaymentReadinessModal((prev) => ({
                    ...prev,
                    open: false,
                  }));
                  // Navigate to Messages tab so the agency can message the talent
                  navigate("/AgencyDashboard?tab=messages");
                }}
              >
                <MessageSquare className="w-4 h-4" />
                {isSportsAgency
                  ? t(
                      "agencyDashboard.licensingRequests.paymentReadinessModal.messageAthlete",
                    )
                  : t(
                      "agencyDashboard.licensingRequests.paymentReadinessModal.messageTalent",
                    )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default LicensingRequestsView;
