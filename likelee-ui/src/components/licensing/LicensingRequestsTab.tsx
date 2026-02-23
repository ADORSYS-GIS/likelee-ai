import React, { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import {
  getAgencyLicensingRequests,
  updateAgencyLicensingRequestsStatus,
  sendLicensingRequestPaymentLink,
} from "@/api/functions";

export const LicensingRequestsTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["agency", "licensing-requests"],
    queryFn: async () => {
      const resp = await getAgencyLicensingRequests();
      return resp as any[];
    },
  });

  const [sendingPaymentLink, setSendingPaymentLink] = useState<
    Record<string, boolean>
  >({});

  const [counterOfferModalOpen, setCounterOfferModalOpen] = useState(false);
  const [counterOfferMessage, setCounterOfferMessage] = useState("");
  const [groupToCounter, setGroupToCounter] = useState<any>(null);
  const [activeRequestTab, setActiveRequestTab] = useState<
    "Active" | "Archive"
  >("Active");

  const statusStyle = (status: string) => {
    if (status === "approved") return "bg-green-100 text-green-700";
    if (status === "rejected") return "bg-red-100 text-red-700";
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
    status: "pending" | "approved" | "rejected" | "negotiating" | "archived",
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
      if (status === "negotiating") {
        setCounterOfferModalOpen(false);
        setCounterOfferMessage("");
        setGroupToCounter(null);
        toast({
          title: "Counter offer sent",
          description: "The client has been notified.",
        });
      }
    } catch (e: any) {
      toast({
        title: "Update failed",
        description: e?.message || "Could not update licensing request",
        variant: "destructive" as any,
      });
    }
  };

  const handleSendPaymentLink = async (group: any) => {
    const firstTalent = (group?.talents || [])[0];
    const licensingRequestId = firstTalent?.licensing_request_id;
    if (!licensingRequestId) {
      toast({
        title: "No licensing request ID found",
        variant: "destructive" as any,
      });
      return;
    }

    setSendingPaymentLink((prev) => ({ ...prev, [group.group_key]: true }));
    try {
      const resp = await sendLicensingRequestPaymentLink(licensingRequestId);
      const emailSent = (resp as any)?.email_sent;
      await queryClient.invalidateQueries({
        queryKey: ["agency", "licensing-requests"],
      });
      toast({
        title: "Payment link sent!",
        description: emailSent
          ? "The payment link has been emailed to the client."
          : "Payment link generated. No client email found — please share the link manually.",
      });
    } catch (e: any) {
      let friendlyTitle = "Failed to send payment link";
      let friendlyDesc = e?.message || "Could not generate payment link";
      try {
        const parsed = JSON.parse(String(e?.message || ""));
        if (
          parsed &&
          typeof parsed === "object" &&
          parsed.code === "MISSING_TALENT_STRIPE_CONNECT"
        ) {
          friendlyTitle = "Action required: connect talent payouts";
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

  const filteredData = (data || []).filter((group: any) => {
    const isArchived = ["rejected", "declined", "archived"].includes(
      group.status,
    );
    return activeRequestTab === "Active" ? !isArchived : isArchived;
  });

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold text-gray-900">
              Licensing Requests
            </h2>
            <div className="flex bg-gray-100 p-1 rounded-lg w-fit mt-2">
              {["Active", "Archive"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveRequestTab(tab as any)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeRequestTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <Button
            variant="outline"
            className="flex items-center gap-2 border-gray-300 font-bold text-gray-700 bg-white"
          >
            <Filter className="w-4 h-4" /> Filter
          </Button>
        </div>

        <div className="space-y-6">
          {isLoading && (
            <Card className="p-8 bg-white border-2 border-gray-900 rounded-none">
              <div className="text-gray-500 font-medium">Loading...</div>
            </Card>
          )}

          {!isLoading && error && (
            <Card className="p-8 bg-white border-2 border-gray-900 rounded-none">
              <div className="text-red-600 font-medium">
                Failed to load licensing requests
              </div>
            </Card>
          )}

          {!isLoading && !error && filteredData.length === 0 && (
            <Card className="p-8 bg-white border-2 border-gray-900 rounded-none">
              <div className="text-gray-500 font-medium">
                {activeRequestTab === "Active"
                  ? "No active licensing requests"
                  : "No archived licensing requests"}
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
                    {group.brand_name || "Unknown brand"}
                  </h3>
                  <p className="text-gray-500 font-medium">
                    {(group.campaign_title || "").trim() || "—"}
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
                      {name || "Talent"}
                    </span>
                  ));
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12 mb-8">
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                      License Fee
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {formatLicenseFee(group.license_fee)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                      Regions
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {group.regions || "—"}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                      Usage Scope
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {(group.usage_scope || "").trim() || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                      {group.license_start_date ? "Duration" : "Deadline"}
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {group.license_start_date && group.license_end_date
                        ? `${new Date(group.license_start_date).toLocaleDateString()} - ${new Date(group.license_end_date).toLocaleDateString()}`
                        : group.license_start_date
                          ? `From ${new Date(group.license_start_date).toLocaleDateString()}`
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
                        Sending...
                      </>
                    ) : group.payment_link_id || group.payment_link_url ? (
                      <>
                        <Send className="w-4 h-4" /> Resend payment link
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Send payment link
                      </>
                    )}
                  </Button>
                </div>
              ) : activeRequestTab === "Archive" ? (
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => updateGroupStatus(group, "pending")}
                    className="border-gray-300 text-gray-700 font-bold h-10 rounded-md flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Recover to Active
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    onClick={() => handleSendPaymentLink(group)}
                    disabled={sendingPaymentLink[group.group_key]}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold h-10 rounded-md flex items-center justify-center gap-2"
                  >
                    {sendingPaymentLink[group.group_key] ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />{" "}
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Send Payment Link
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setGroupToCounter(group);
                      setCounterOfferModalOpen(true);
                    }}
                    className="border-gray-300 text-gray-700 font-bold h-10 rounded-md"
                  >
                    Counter Offer
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => updateGroupStatus(group, "rejected")}
                    className="border-red-200 text-red-600 hover:bg-red-50 font-bold h-10 rounded-md flex items-center justify-center gap-2"
                  >
                    <div className="w-4 h-4 rounded-full border-2 border-red-200 flex items-center justify-center">
                      <span className="text-[10px]">✕</span>
                    </div>
                    Decline
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
              <DialogTitle>Send Counter Offer</DialogTitle>
              <DialogDescription>
                Explain your proposed terms to the client. They will be notified
                by email.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Message to Client</Label>
                <Textarea
                  value={counterOfferMessage}
                  onChange={(e) => setCounterOfferMessage(e.target.value)}
                  placeholder="Describe your counter offer terms..."
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
                Cancel
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
                className="bg-indigo-500 hover:bg-indigo-500 text-white font-bold"
              >
                Send Counter Offer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};
