import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Filter, CheckCircle2, Send, RefreshCw, Eye, X } from "lucide-react";
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
  getAgencyLicensingRequests,
  updateAgencyLicensingRequestsStatus,
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
  const entitySingularTitle = isSportsAgency ? "Athlete" : "Talent";
  const entityPluralLower = isSportsAgency ? "athlete" : "talent";
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

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
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [groupToDecline, setGroupToDecline] = useState<any>(null);
  const [activeRequestTab, setActiveRequestTab] = useState<
    "Active" | "Archive" | "Brand Requests"
  >("Active");
  const [sendPaymentBusyKey, setSendPaymentBusyKey] = useState<string>("");

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
    return "bg-gray-100 text-gray-700";
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
    if (!ids.length) return;

    try {
      await updateAgencyLicensingRequestsStatus({
        licensing_request_ids: ids,
        status,
        notes,
      });
      await queryClient.invalidateQueries({
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
          title: t("agencyDashboard.licensingRequests.toast.counterOfferSent"),
          description: t(
            "agencyDashboard.licensingRequests.toast.counterOfferSentDescription",
          ),
        });
      }
    } catch (e: any) {
      toast({
        title: t("agencyDashboard.licensingRequests.toast.updateFailed"),
        description:
          e?.message ||
          t(
            "agencyDashboard.licensingRequests.toast.couldNotUpdateLicensingRequest",
          ),
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
      await queryClient.invalidateQueries({
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
        setDeclineModalOpen(false);
        setDeclineReason("");
        setGroupToDecline(null);
        toast({
          title: t("agencyDashboard.licensingRequests.toast.requestDeclined"),
          description: t(
            "agencyDashboard.licensingRequests.toast.requestDeclinedDescription",
          ),
        });
      }
    } catch (e: any) {
      toast({
        title: t("agencyDashboard.licensingRequests.toast.updateFailed"),
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

      await queryClient.invalidateQueries({
        queryKey: ["agency", "licensing-requests"],
      });

      toast({
        title: t("agencyDashboard.licensingRequests.toast.paymentLinkSent"),
        description: paymentLinkUrl
          ? t("agencyDashboard.licensingRequests.toast.paymentLinkGenerated")
          : t("agencyDashboard.licensingRequests.toast.paymentLinkSentSimple"),
      });
    } catch (e: any) {
      let friendlyTitle = t(
        "agencyDashboard.licensingRequests.toast.sendPaymentLinkFailed",
      );
      let friendlyDesc =
        e?.message ||
        t(
          "agencyDashboard.licensingRequests.toast.couldNotGenerateSendPaymentLink",
        );
      try {
        const parsed = JSON.parse(String(e?.message || ""));
        if (
          parsed &&
          typeof parsed === "object" &&
          parsed.code === "MISSING_TALENT_STRIPE_CONNECT"
        ) {
          friendlyTitle = t(
            "agencyDashboard.licensingRequests.toast.actionRequiredConnectPayouts",
            { entityPluralLower },
          );
          const missingList = Array.isArray(parsed.missing)
            ? parsed.missing
            : [];
          const missingText = missingList.length
            ? `${t("agencyDashboard.licensingRequests.toast.missing")} ${missingList.join(", ")}`
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
      setSendPaymentBusyKey("");
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

  const filteredData = (data || []).filter((group: any) => {
    const isArchived = ["rejected", "declined", "archived"].includes(
      group.status,
    );
    const isBrandRequest = isBrandRequestGroup(group);
    const matchesStatus =
      activeRequestTab === "Active" ? !isArchived : isArchived;
    if (!matchesStatus) return false;
    return !isBrandRequest;
  });

  const filteredBrandData = brandLicenseData.filter((req: any) => {
    const isArchived = ["rejected", "declined", "archived"].includes(
      req.status,
    );
    return activeRequestTab === "Active" ? !isArchived : true;
    // In this view, "Brand Requests" tab shows all pending brand requests.
  });

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold text-gray-900">
              {t("agencyDashboard.licensingRequests.title")}
            </h2>
            <div className="flex bg-gray-100 p-1 rounded-lg w-fit mt-2">
              {[
                {
                  value: "Active",
                  label: t("agencyDashboard.licensingRequests.tabs.active"),
                },
                {
                  value: "Archive",
                  label: t("agencyDashboard.licensingRequests.tabs.archive"),
                },
                {
                  value: "Brand Requests",
                  label: t(
                    "agencyDashboard.licensingRequests.tabs.brandRequests",
                  ),
                },
              ].map((tab) => {
                let badgeCount = 0;
                if (tab.value === "Active") {
                  const pending = (data || []).filter(
                    (r: any) => r.status === "pending",
                  ).length;
                  const seen = parseInt(
                    localStorage.getItem("regular_licensing_seen_count") || "0",
                    10,
                  );
                  // While viewing, we show 0 badge
                  badgeCount =
                    activeRequestTab === "Active"
                      ? 0
                      : Math.max(0, pending - seen);
                } else if (tab.value === "Brand Requests") {
                  const pending = brandLicenseData.filter(
                    (r: any) => r.status === "pending",
                  ).length;
                  const seen = parseInt(
                    localStorage.getItem("brand_licensing_seen_count") || "0",
                    10,
                  );
                  // While viewing, we show 0 badge
                  badgeCount =
                    activeRequestTab === "Brand Requests"
                      ? 0
                      : Math.max(0, pending - seen);
                }

                return (
                  <button
                    key={tab.value}
                    onClick={() => setActiveRequestTab(tab.value as any)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${activeRequestTab === tab.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                  >
                    {tab.label}
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
          <Button
            variant="outline"
            className="flex items-center gap-2 border-gray-300 font-bold text-gray-700 bg-white"
          >
            <Filter className="w-4 h-4" />{" "}
            {t("agencyDashboard.licensingRequests.filter")}
          </Button>
        </div>

        <div className="space-y-6">
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
            filteredData.length === 0 &&
            activeRequestTab !== "Brand Requests" && (
              <Card className="p-8 bg-white border-2 border-gray-900 rounded-none">
                <div className="text-gray-500 font-medium">
                  {activeRequestTab === "Active"
                    ? t("agencyDashboard.licensingRequests.noActiveRequests")
                    : t("agencyDashboard.licensingRequests.noArchivedRequests")}
                </div>
              </Card>
            )}

          {activeRequestTab !== "Brand Requests" &&
            filteredData.map((group: any) => (
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
                    className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${statusStyle(group.status)}`}
                  >
                    {group.status}
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
                        {t("agencyDashboard.licensingRequests.licenseFee")}
                      </p>
                      <p className="text-sm font-bold text-gray-900">
                        {formatLicenseFee(group.license_fee)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                        {t("agencyDashboard.licensingRequests.regions")}
                      </p>
                      <p className="text-sm font-bold text-gray-900">
                        {group.regions || "\u2014"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                        {t("agencyDashboard.licensingRequests.usageScope")}
                      </p>
                      <p className="text-sm font-bold text-gray-900">
                        {(() => {
                          const details = getRequestDetails(group);
                          const territory = String(
                            details?.territory || "",
                          ).trim();
                          if (territory) return territory;
                          return (group.usage_scope || "").trim() || "\u2014";
                        })()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                        {group.license_start_date
                          ? t("agencyDashboard.licensingRequests.duration")
                          : t("agencyDashboard.licensingRequests.deadline")}
                      </p>
                      <p className="text-sm font-bold text-gray-900">
                        {group.license_start_date && group.license_end_date
                          ? `${new Date(group.license_start_date).toLocaleDateString()} - ${new Date(group.license_end_date).toLocaleDateString()}`
                          : group.license_start_date
                            ? `${t("agencyDashboard.licensingRequests.brandRequests.from")} ${new Date(group.license_start_date).toLocaleDateString()}`
                            : group.deadline
                              ? new Date(group.deadline).toLocaleDateString()
                              : "\u2014"}
                      </p>
                    </div>
                  </div>
                </div>

                {group.status === "approved" ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center h-11 bg-green-50 rounded-md border border-green-200">
                      <p className="text-xs font-black text-green-700 uppercase tracking-widest flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />{" "}
                        {t("agencyDashboard.licensingRequests.status.approved")}
                      </p>
                    </div>
                    {group.payment_link_id || group.payment_link_url ? (
                      <Button
                        onClick={() => sendPaymentLinkForGroup(group)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 rounded-md flex items-center justify-center gap-2"
                        disabled={
                          !!sendPaymentBusyKey &&
                          sendPaymentBusyKey === String(group?.group_key || "")
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
                          sendPaymentBusyKey === String(group?.group_key || "")
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
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                    <Button
                      variant="outline"
                      onClick={() => updateGroupStatus(group, "pending")}
                      className="border-gray-300 text-gray-700 font-bold h-11 rounded-md flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      {t(
                        "agencyDashboard.licensingRequests.buttons.recoverToActive",
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button
                      onClick={() => updateGroupStatus(group, "approved")}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold h-11 rounded-md flex items-center justify-center gap-2"
                    >
                      <div className="w-4 h-4 rounded-full border-2 border-white flex items-center justify-center">
                        <span className="text-[10px] font-bold">✓</span>
                      </div>
                      {t("agencyDashboard.licensingRequests.buttons.approve")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setGroupToCounter(group);
                        setCounterOfferModalOpen(true);
                      }}
                      className="border-gray-300 text-gray-700 font-bold h-11 rounded-md"
                    >
                      {t(
                        "agencyDashboard.licensingRequests.buttons.counterOffer",
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => updateGroupStatus(group, "rejected")}
                      className="border-red-200 text-red-600 hover:bg-red-50 font-bold h-11 rounded-md flex items-center justify-center gap-2"
                    >
                      <div className="w-4 h-4 rounded-full border-2 border-red-200 flex items-center justify-center">
                        <X className="w-3 h-3" />
                      </div>
                      {t("agencyDashboard.licensingRequests.buttons.decline")}
                    </Button>
                  </div>
                )}
              </Card>
            ))}

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
                    {req.status}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-8">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded uppercase">
                    {req.talent_name ||
                      req.creators?.full_legal_name ||
                      req.creators?.stage_name ||
                      t(
                        "agencyDashboard.licensingRequests.brandRequests.unknownBrand",
                      )}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12 mb-8">
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                        {t(
                          "agencyDashboard.licensingRequests.brandRequests.licenseFee",
                        )}
                      </p>
                      <p className="text-sm font-bold text-gray-900">
                        {req.license_fee
                          ? `$${Number(req.license_fee).toLocaleString()}`
                          : "\u2014"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                        {t(
                          "agencyDashboard.licensingRequests.brandRequests.territory",
                        )}
                      </p>
                      <p className="text-sm font-bold text-gray-900">
                        {req.territory || req.usage_scope || "\u2014"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                        {t(
                          "agencyDashboard.licensingRequests.brandRequests.exclusivity",
                        )}
                      </p>
                      <p className="text-sm font-bold text-gray-900">
                        {req.exclusivity || "\u2014"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                        {t(
                          "agencyDashboard.licensingRequests.brandRequests.duration",
                        )}
                      </p>
                      <p className="text-sm font-bold text-gray-900">
                        {req.duration_days
                          ? `${req.duration_days} ${t("agencyDashboard.licensingRequests.brandRequests.days")}`
                          : "\u2014"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                        {t(
                          "agencyDashboard.licensingRequests.brandRequests.timeline",
                        )}
                      </p>
                      <p className="text-sm font-bold text-gray-900">
                        {req.license_start_date && req.license_end_date
                          ? `${new Date(req.license_start_date).toLocaleDateString()} - ${new Date(req.license_end_date).toLocaleDateString()}`
                          : req.license_start_date
                            ? `${t("agencyDashboard.licensingRequests.brandRequests.from")} ${new Date(req.license_start_date).toLocaleDateString()}`
                            : "\u2014"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                        {t(
                          "agencyDashboard.licensingRequests.brandRequests.modificationsAllowed",
                        )}
                      </p>
                      <p className="text-sm font-bold text-gray-900">
                        {req.modifications_allowed || "\u2014"}
                      </p>
                    </div>
                  </div>
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
                          "agencyDashboard.licensingRequests.brandRequests.contractPhase",
                        )}
                      </p>
                    </div>
                  </div>
                ) : req.status === "declined" ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center h-11 bg-red-50 rounded-md border border-red-200">
                      <p className="text-xs font-black text-red-700 uppercase tracking-widest flex items-center gap-2">
                        <X className="w-4 h-4" />
                        {t(
                          "agencyDashboard.licensingRequests.brandRequests.declined",
                        )}
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
                        "agencyDashboard.licensingRequests.buttons.acceptWriteContract",
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setGroupToDecline(req);
                        setDeclineModalOpen(true);
                      }}
                      className="border-red-200 text-red-600 hover:bg-red-50 font-bold h-11 rounded-md flex items-center justify-center gap-2"
                    >
                      <div className="w-4 h-4 rounded-full border-2 border-red-200 flex items-center justify-center">
                        <X className="w-3 h-3" />
                      </div>
                      {t("agencyDashboard.licensingRequests.buttons.decline")}
                    </Button>
                  </div>
                )}
              </Card>
            ))}
        </div>

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
                    "agencyDashboard.licensingRequests.counterOfferModal.messagePlaceholder",
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
                onClick={() =>
                  updateGroupStatus(
                    groupToCounter,
                    "negotiating",
                    counterOfferMessage,
                  )
                }
                disabled={!counterOfferMessage.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                {t("agencyDashboard.licensingRequests.counterOfferModal.send")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={declineModalOpen}
          onOpenChange={(open) => {
            setDeclineModalOpen(open);
            if (!open) {
              setDeclineReason("");
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

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>
                  {t(
                    "agencyDashboard.licensingRequests.declineModal.reasonPlaceholder",
                  )}
                </Label>
                <Textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder={t(
                    "agencyDashboard.licensingRequests.declineModal.reasonPlaceholder",
                  )}
                  rows={5}
                  className="resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDeclineModalOpen(false);
                  setDeclineReason("");
                  setGroupToDecline(null);
                }}
                className="font-bold"
              >
                {t("agencyDashboard.licensingRequests.declineModal.cancel")}
              </Button>
              <Button
                onClick={() => {
                  if (groupToDecline?.id && !groupToDecline?.group_key) {
                    // This is a brand request
                    updateBrandRequestStatus(
                      groupToDecline,
                      "declined",
                      declineReason,
                    );
                  } else {
                    // This is a regular licensing request group
                    updateGroupStatus(
                      groupToDecline,
                      "declined",
                      declineReason,
                    );
                  }
                }}
                disabled={!declineReason.trim()}
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                {t("agencyDashboard.licensingRequests.declineModal.decline")}
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
      </div>
    </>
  );
};

export default LicensingRequestsView;
