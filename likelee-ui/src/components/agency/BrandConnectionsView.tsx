import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Link2Off, Eye, CheckCircle2, ArrowLeft, FileText } from "lucide-react";
import { CampaignBriefView } from "@/components/campaign-offers/CampaignBriefView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, RefreshCw, Trash2, Send, Wand2 } from "lucide-react";

const BrandConnectionsView = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    "connections" | "requests" | "offers" | "contract_hub" | "deliverables" | "feedback"
  >("connections");
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [selectedOfferId, setSelectedOfferId] = useState<string>("");
  const [packageDraftByOffer, setPackageDraftByOffer] = useState<
    Record<string, { title: string; message: string; packageId?: string }>
  >({});
  const [builderToken, setBuilderToken] = useState<string | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [currentContractId, setCurrentContractId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [contractTab, setContractTab] = useState("submissions");

  // Load DocuSeal Builder script
  const loadDocuSealBuilder = () => {
    if (document.getElementById("docuseal-builder-script")) return;
    const script = document.createElement("script");
    script.id = "docuseal-builder-script";
    script.src = "https://cdn.docuseal.com/js/builder.js";
    script.async = true;
    document.head.appendChild(script);
  };

  const requestsQuery = useQuery({
    queryKey: ["agency", "brand-connection-requests"],
    queryFn: async () => {
      const resp = await base44.get<{
        status?: string;
        requests?: any[];
      }>("/api/agency/brand-connection-requests");
      return Array.isArray(resp?.requests) ? resp.requests : [];
    },
  });

  const connectionsQuery = useQuery({
    queryKey: ["agency", "brand-connections"],
    queryFn: async () => {
      const resp = await base44.get<{
        status?: string;
        connections?: any[];
      }>("/api/agency/brand-connections");
      return Array.isArray(resp?.connections) ? resp.connections : [];
    },
  });

  const offersQuery = useQuery({
    queryKey: ["agency", "campaign-offers-my"],
    queryFn: async () => {
      const resp = await base44.get<{ offers?: any[] }>("/api/campaign-offers/my", {
        params: { limit: 80 },
      });
      return Array.isArray(resp?.offers) ? resp.offers : [];
    },
  });

  const feedbackQuery = useQuery({
    queryKey: ["agency", "package-feedback"],
    queryFn: async () => {
      const resp = await base44.get<{ items?: any[] }>(
        "/api/agency/brand-offers/package-feedback",
      );
      return Array.isArray(resp?.items) ? resp.items : [];
    },
  });

  const offerPackagesQuery = useQuery({
    queryKey: ["agency", "offer-packages", "all"],
    queryFn: async () => {
      const resp = await base44.get<{ items?: any[] }>(
        "/api/agency/brand-offers/packages",
      );
      return Array.isArray(resp?.items) ? resp.items : [];
    },
  });

  const offerContractsQuery = useQuery({
    queryKey: ["agency", "offer-contracts", selectedOfferId],
    enabled: !!selectedOfferId,
    queryFn: async () => {
      const resp = await base44.get<{ contracts?: any[] }>(
        `/api/campaign-offers/${selectedOfferId}/contracts`,
      );
      return Array.isArray(resp?.contracts) ? resp.contracts : [];
    },
  });

  const offerDeliverablesQuery = useQuery({
    queryKey: ["agency", "offer-deliverables", selectedOfferId],
    enabled: !!selectedOfferId,
    queryFn: async () => {
      const resp = await base44.get<{ deliverables?: any[] }>(
        `/api/campaign-offers/${selectedOfferId}/deliverables`,
      );
      return Array.isArray(resp?.deliverables) ? resp.deliverables : [];
    },
  });

  const requests = useMemo(() => {
    if (!Array.isArray(requestsQuery.data)) return [];
    return requestsQuery.data;
  }, [requestsQuery.data]);

  const connections = useMemo(() => {
    if (!Array.isArray(connectionsQuery.data)) return [];
    return connectionsQuery.data;
  }, [connectionsQuery.data]);
  const offers = useMemo(() => {
    if (!Array.isArray(offersQuery.data)) return [];
    return offersQuery.data;
  }, [offersQuery.data]);
  const feedbackItems = useMemo(() => {
    if (!Array.isArray(feedbackQuery.data)) return [];
    return feedbackQuery.data;
  }, [feedbackQuery.data]);

  const updateStatus = async (id: string, action: "accept" | "decline") => {
    if (!id || busyIds.has(id)) return;
    setBusyIds((prev) => new Set(prev).add(id));
    try {
      await base44.post(
        `/api/agency/brand-connection-requests/${id}/${action}`,
        {},
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["agency", "brand-connection-requests"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["agency", "brand-connections"],
        }),
      ]);
      toast({
        title: action === "accept" ? "Request accepted" : "Request declined",
        description:
          action === "accept"
            ? "Request approved successfully."
            : "Request declined.",
      });
    } catch {
      toast({
        title: "Action failed",
        description: "Please try again in a moment.",
        variant: "destructive" as any,
      });
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const disconnectBrand = async (brandId: string) => {
    if (!brandId || busyIds.has(brandId)) return;
    setBusyIds((prev) => new Set(prev).add(brandId));
    try {
      await base44.post(
        `/api/agency/brand-connections/${brandId}/disconnect`,
        {},
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["agency", "brand-connections"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["agency", "brand-connection-requests"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["agency-brand-connection-requests"],
        }),
      ]);
      toast({
        title: "Disconnected",
        description: "This brand connection has been disconnected.",
      });
    } catch {
      toast({
        title: "Disconnect failed",
        description: "Please try again in a moment.",
        variant: "destructive" as any,
      });
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(brandId);
        return next;
      });
    }
  };

  const respondToOffer = async (offerId: string, action: "accept" | "decline") => {
    if (!offerId || busyIds.has(offerId)) return;
    setBusyIds((prev) => new Set(prev).add(offerId));
    try {
      await base44.post(`/api/campaign-offers/${offerId}/respond`, { action });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["agency", "campaign-offers-my"] }),
        queryClient.invalidateQueries({ queryKey: ["agency", "offer-contracts", offerId] }),
      ]);
      toast({
        title: action === "accept" ? "Offer accepted" : "Offer declined",
      });
    } catch (e: any) {
      toast({
        title: "Action failed",
        description: e?.message || "Please try again.",
        variant: "destructive" as any,
      });
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(offerId);
        return next;
      });
    }
  };

  const handleUploadContract = async (offerId: string, file: File) => {
    if (!offerId || isUploading) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const resp = await base44.post<{ id: string; slug: string }>(
        `/api/campaign-offers/${offerId}/contracts/upload`,
        formData,
      );
      toast({
        title: "Contract uploaded",
        description: "Draft created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["agency", "offer-contracts", offerId] });
      // Automatically open builder for the new contract
      handlePrepareContract(offerId, resp.id);
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err.message || "Failed to upload contract.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handlePrepareContract = async (offerId: string, contractId: string) => {
    try {
      loadDocuSealBuilder();
      const resp = await base44.get<{ token: string }>(
        `/api/campaign-offers/${offerId}/contracts/${contractId}/builder-token`,
      );
      setBuilderToken(resp.token);
      setCurrentContractId(contractId);
      setBuilderOpen(true);
    } catch (err: any) {
      toast({
        title: "Failed to load builder",
        description: err.message || "Failed to get builder token.",
        variant: "destructive",
      });
    }
  };

  const handleSendContract = async (offerId: string, contractId: string) => {
    if (busyIds.has(contractId)) return;
    setBusyIds((prev) => new Set(prev).add(contractId));
    try {
      await base44.post(`/api/campaign-offers/${offerId}/contracts/send`, {
        contract_id: contractId,
      });
      toast({
        title: "Contract sent",
        description: "The contract has been sent to the brand.",
      });
      queryClient.invalidateQueries({ queryKey: ["agency", "offer-contracts", offerId] });
      queryClient.invalidateQueries({ queryKey: ["agency", "campaign-offers-my"] });
    } catch (err: any) {
      toast({
        title: "Send failed",
        description: err.message || "Failed to send contract.",
        variant: "destructive",
      });
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(contractId);
        return next;
      });
    }
  };

  const handleSyncContract = async (offerId: string, contractId: string) => {
    if (busyIds.has(contractId)) return;
    setBusyIds((prev) => new Set(prev).add(contractId));
    try {
      await base44.post(`/api/campaign-offers/${offerId}/contracts/sync`, {
        contract_id: contractId,
      });
      toast({
        title: "Status synced",
        description: "Contract status updated from DocuSeal.",
      });
      queryClient.invalidateQueries({ queryKey: ["agency", "offer-contracts", offerId] });
      queryClient.invalidateQueries({ queryKey: ["agency", "campaign-offers-my"] });
    } catch (err: any) {
      toast({
        title: "Sync failed",
        description: err.message || "Failed to sync status.",
        variant: "destructive",
      });
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(contractId);
        return next;
      });
    }
  };

  const handleDeleteContract = async (offerId: string, contractId: string) => {
    if (!confirm("Are you sure you want to delete this contract draft?")) return;
    if (busyIds.has(contractId)) return;
    setBusyIds((prev) => new Set(prev).add(contractId));
    try {
      await base44.delete(`/api/campaign-offers/${offerId}/contracts/${contractId}`);
      toast({
        title: "Contract deleted",
        description: "Draft removed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["agency", "offer-contracts", offerId] });
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err.message || "Failed to delete contract.",
        variant: "destructive",
      });
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(contractId);
        return next;
      });
    }
  };

  const createAndSendPackage = async (offerId: string) => {
    if (!offerId || busyIds.has(offerId)) return;
    const draft = packageDraftByOffer[offerId] || { title: "", message: "" };
    setBusyIds((prev) => new Set(prev).add(offerId));
    try {
      const createResp = await base44.post<{ package?: any }>(
        `/api/campaign-offers/${offerId}/packages`,
        {
          title: draft.title || "Talent Package",
          message: draft.message || "",
          package_snapshot: { talents: [] },
        },
      );
      const packageId = String(createResp?.package?.id || "").trim();
      if (!packageId) throw new Error("Package was not created");
      await base44.post(`/api/campaign-offers/${offerId}/packages/send`, {
        package_id: packageId,
      });
      setPackageDraftByOffer((prev) => ({
        ...prev,
        [offerId]: { ...draft, packageId },
      }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["agency", "campaign-offers-my"] }),
        queryClient.invalidateQueries({ queryKey: ["agency", "package-feedback"] }),
      ]);
      toast({
        title: "Package sent",
        description: (
          <div className="flex items-center gap-2">
            <span>Talent package has been sent to the brand inbox.</span>
            <Button
              variant="link"
              className="p-0 h-auto text-sm"
              onClick={() => {
                const shareLink = `${window.location.origin}/share/package/${packageId}`;
                window.open(shareLink, "_blank");
              }}
            >
              View
            </Button>
          </div>
        ),
      });
    } catch (e: any) {
      toast({
        title: "Package send failed",
        description: e?.message || "Please try again.",
        variant: "destructive" as any,
      });
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(offerId);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Brand Connections</h2>
        <p className="text-gray-600">
          Manage active connections and invitations.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeTab === "connections" ? "default" : "outline"}
          onClick={() => setActiveTab("connections")}
        >
          Connected Brands
        </Button>
        <Button
          variant={activeTab === "requests" ? "default" : "outline"}
          onClick={() => setActiveTab("requests")}
        >
          Requests
        </Button>
        <Button
          variant={activeTab === "offers" ? "default" : "outline"}
          onClick={() => setActiveTab("offers")}
        >
          Brand Offers
        </Button>
        <Button
          variant={activeTab === "contract_hub" ? "default" : "outline"}
          onClick={() => setActiveTab("contract_hub")}
        >
          Contract Hub
        </Button>
        <Button
          variant={activeTab === "deliverables" ? "default" : "outline"}
          onClick={() => setActiveTab("deliverables")}
        >
          Deliverables
        </Button>
        <Button
          variant={activeTab === "feedback" ? "default" : "outline"}
          onClick={() => setActiveTab("feedback")}
        >
          Package Feedback
        </Button>
      </div>

      {activeTab === "connections" && (
        <Card className="p-6 border border-gray-200 rounded-xl">
          <h3 className="text-lg font-bold text-gray-900 mb-3">
            Connected Brands
          </h3>
          {connectionsQuery.isLoading && (
            <p className="text-sm text-gray-500">Loading connected brands...</p>
          )}
          {!connectionsQuery.isLoading && connectionsQuery.error && (
            <p className="text-sm text-red-600">
              Failed to load connected brands.
            </p>
          )}
          {!connectionsQuery.isLoading &&
            !connectionsQuery.error &&
            connections.length === 0 && (
              <p className="text-sm text-gray-500">No connected brands yet.</p>
            )}
          {!connectionsQuery.isLoading &&
            !connectionsQuery.error &&
            connections.length > 0 && (
              <div className="space-y-3">
                {connections.map((connection: any) => {
                  const companyName = String(
                    connection?.brands?.company_name || "Brand",
                  );
                  const email = String(connection?.brands?.email || "").trim();
                  const brandId = String(connection?.brand_id || "").trim();
                  const connectedAt = connection?.connected_at
                    ? new Date(
                      String(connection.connected_at),
                    ).toLocaleDateString()
                    : "—";
                  const isBusy = busyIds.has(brandId);
                  return (
                    <div
                      key={String(
                        connection?.id || `${companyName}-${connectedAt}`,
                      )}
                      className="border border-gray-200 rounded-lg p-4 flex items-center justify-between gap-4"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">
                          {companyName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {email || "No email provided"}
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <Button
                          variant="destructive"
                          size="icon"
                          disabled={!brandId || isBusy}
                          onClick={() => disconnectBrand(brandId)}
                          aria-label="Disconnect from brand"
                          title="Disconnect"
                        >
                          <Link2Off className="h-4 w-4" />
                        </Button>
                        <div>
                          <Badge className="bg-green-100 text-green-700 border border-green-300">
                            Connected
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            Since {connectedAt}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </Card>
      )}

      {activeTab === "requests" && (
        <Card className="p-6 border border-gray-200 rounded-xl">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Requests</h3>
          {requestsQuery.isLoading && (
            <p className="text-sm text-gray-500">Loading requests...</p>
          )}
          {!requestsQuery.isLoading && requestsQuery.error && (
            <p className="text-sm text-red-600">Failed to load requests.</p>
          )}
          {!requestsQuery.isLoading &&
            !requestsQuery.error &&
            requests.length === 0 && (
              <p className="text-sm text-gray-500">
                No pending requests right now.
              </p>
            )}
          {!requestsQuery.isLoading &&
            !requestsQuery.error &&
            requests.length > 0 && (
              <div className="space-y-4">
                {requests.map((req: any) => {
                  const requestId = String(req?.id || "");
                  const isBusy = busyIds.has(requestId);
                  const companyName = String(
                    req?.brands?.company_name || req?.brand_name || "Brand",
                  );
                  const email = String(req?.brands?.email || "").trim();
                  const message = String(req?.message || "").trim();
                  const createdAt = req?.created_at
                    ? new Date(String(req.created_at)).toLocaleDateString()
                    : "—";
                  const requestType = String(req?.request_type || "connection")
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (m) => m.toUpperCase());

                  return (
                    <div
                      key={requestId}
                      className="border border-gray-200 rounded-lg p-4 bg-white"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {companyName}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {email || "No email provided"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-amber-100 text-amber-700 border border-amber-300">
                            Pending
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-gray-300 text-gray-700"
                          >
                            {requestType}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">
                        Requested on: {createdAt}
                      </p>
                      {message && (
                        <p className="text-sm text-gray-800 mb-4 italic">
                          "{message}"
                        </p>
                      )}
                      <div className="flex gap-3">
                        <Button
                          onClick={() => updateStatus(requestId, "accept")}
                          disabled={isBusy}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {isBusy ? "Working..." : "Accept"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => updateStatus(requestId, "decline")}
                          disabled={isBusy}
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </Card>
      )}

      {activeTab === "offers" && (
        <Card className="p-6 border border-gray-200 rounded-xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                {selectedOfferId ? (
                  <button
                    onClick={() => setSelectedOfferId("")}
                    className="flex items-center gap-2 hover:text-indigo-600 transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5" />
                    Brand Offers
                  </button>
                ) : (
                  "Brand Offers"
                )}
              </h3>
            </div>

            {offersQuery.isLoading && (
              <p className="text-sm text-gray-500">Loading offers...</p>
            )}

            {!offersQuery.isLoading && offers.length === 0 && (
              <p className="text-sm text-gray-500">No campaign offers yet.</p>
            )}

            {selectedOfferId ? (
              (() => {
                const offer = offers.find((o: any) => String(o.id) === selectedOfferId);
                if (!offer) {
                  return (
                    <div className="p-8 text-center">
                      <p className="text-gray-500 mb-4">Offer not found</p>
                      <Button onClick={() => setSelectedOfferId("")}>
                        Back to list
                      </Button>
                    </div>
                  );
                }

                const status = String(offer?.status || "sent");
                const isPending = ["sent", "viewed"].includes(status);
                const isAccepted = status === "accepted";

                return (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Fixed Header Style */}
                    <div className="bg-gray-50 px-6 py-6 border-b border-gray-200">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <FileText className="h-6 w-6 text-indigo-600" />
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                              {offer?.brand_campaigns?.name || "Campaign Offer"}
                            </h2>
                          </div>
                          <p className="text-gray-500 font-medium ml-9">
                            {offer?.offer_title || "Direct Request"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            className={`px-3 py-1 text-xs font-bold uppercase tracking-wider ${isAccepted
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-indigo-50 text-indigo-700 border-indigo-200"
                              }`}
                          >
                            {status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 md:p-8 space-y-8">
                      {/* Action Bar */}
                      <div className="flex flex-wrap items-center gap-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50">
                        {isPending && (
                          <>
                            <Button
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6"
                              disabled={busyIds.has(selectedOfferId)}
                              onClick={() => respondToOffer(selectedOfferId, "accept")}
                            >
                              Accept Offer
                            </Button>
                            <Button
                              variant="outline"
                              className="border-red-200 text-red-600 hover:bg-red-50 font-bold"
                              disabled={busyIds.has(selectedOfferId)}
                              onClick={() => respondToOffer(selectedOfferId, "decline")}
                            >
                              Decline
                            </Button>
                          </>
                        )}
                        {isAccepted && (
                          <>
                            {(() => {
                              const offerPkg = (offerPackagesQuery.data || []).find(
                                (p: any) => String(p.offer_id) === selectedOfferId
                              );
                              if (offerPkg) {
                                const token = offerPkg.meta?.agency_package_token;
                                return (
                                  <div className="flex items-center gap-3">
                                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 py-2 px-4 rounded-full flex items-center gap-2">
                                      <CheckCircle2 className="h-4 w-4" />
                                      Package Successfully Sent
                                    </Badge>
                                    {token && (
                                      <Button
                                        variant="secondary"
                                        className="font-bold"
                                        onClick={() => window.open(`/share/package/${token}`, "_blank")}
                                      >
                                        View Shared Package
                                      </Button>
                                    )}
                                  </div>
                                );
                              }
                              return (
                                <Button
                                  className="bg-black hover:bg-gray-800 text-white font-bold px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
                                  onClick={() => {
                                    navigate("/AgencyDashboard?tab=packages", {
                                      state: {
                                        fromOfferId: selectedOfferId,
                                        fromOfferBrandId: String(offer?.brand_id || "").trim(),
                                      },
                                    });
                                  }}
                                >
                                  Build & Send Talent Package
                                </Button>
                              );
                            })()}
                          </>
                        )}
                      </div>


                      {/* Full brief — shown directly, no duplicate summary */}
                      {offer?.brief_snapshot && typeof offer.brief_snapshot === "object" ? (
                        <div className="rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                          <CampaignBriefView brief={offer.brief_snapshot} />
                        </div>
                      ) : offer?.message ? (
                        <div className="bg-slate-50 p-6 rounded-2xl border-l-4 border-indigo-400 italic text-gray-700 text-lg leading-relaxed">
                          "{String(offer.message)}"
                        </div>
                      ) : (
                        <div className="p-12 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                          <p className="text-gray-400 font-medium">No detailed brief attached to this offer.</p>
                        </div>
                      )}


                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="space-y-5">
                {offers.map((offer: any) => {
                  const offerId = String(offer?.id || "");
                  const status = String(offer?.status || "sent");
                  const isPending = ["sent", "viewed"].includes(status);
                  const isAccepted = status === "accepted";

                  const bs = offer?.brief_snapshot && typeof offer.brief_snapshot === "object" ? offer.brief_snapshot : null;
                  const briefVal = (key: string, fallback = "") => {
                    if (!bs) return fallback;
                    const v = bs[key];
                    const t = v !== null && v !== undefined ? String(v).trim() : "";
                    return t || fallback;
                  };
                  const reels = briefVal("deliverables_reels");
                  const heroImg = briefVal("deliverables_hero_image");
                  const deliverablesSummary = [reels, heroImg].filter(Boolean).join(", ") || "—";
                  const launchDate = briefVal("overview_launch_date");
                  const deadlineDate = briefVal("budget_submission_deadline");
                  const budgetTotal = briefVal("budget_total");
                  const budgetCreator = briefVal("budget_creator_payment");
                  const budgetFee = briefVal("budget_platform_fee");

                  return (
                    <div key={offerId} className="rounded-xl border-2 border-blue-200 bg-white shadow-sm overflow-hidden cursor-pointer hover:border-blue-400 hover:shadow-md transition-all" onClick={() => setSelectedOfferId(offerId)}>
                      {/* Row header */}
                      <div className="flex items-center justify-between px-6 py-4 border-b border-blue-100 bg-white gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-gray-900 text-base tracking-tight truncate">
                              {offer?.brand_campaigns?.name || offer?.offer_title || "Campaign Offer"}
                            </h4>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                              {offer?.offer_title || "Direct Request"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <Badge
                            className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${isAccepted
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : "bg-indigo-100 text-indigo-700 border-indigo-200"
                              }`}
                          >
                            {status.replace(/_/g, " ")}
                          </Badge>
                          {isPending && (
                            <>
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                disabled={busyIds.has(offerId)}
                                onClick={(e) => { e.stopPropagation(); respondToOffer(offerId, "accept"); }}
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-200 text-red-600 hover:bg-red-50 font-bold"
                                disabled={busyIds.has(offerId)}
                                onClick={(e) => { e.stopPropagation(); respondToOffer(offerId, "decline"); }}
                              >
                                Decline
                              </Button>
                            </>
                          )}
                          {isAccepted && (() => {
                            const offerPkg = (offerPackagesQuery.data || []).find(
                              (p: any) => String(p.offer_id) === offerId
                            );
                            if (offerPkg) {
                              const token = offerPkg.meta?.agency_package_token;
                              return (
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1.5 px-3 py-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Package Sent
                                  </Badge>
                                  {token && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="font-bold text-xs"
                                      onClick={(e) => { e.stopPropagation(); window.open(`/share/package/${token}`, "_blank"); }}
                                    >
                                      View Package
                                    </Button>
                                  )}
                                </div>
                              );
                            }
                            return (
                              <Button
                                size="sm"
                                className="bg-black hover:bg-gray-800 text-white font-bold"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate("/AgencyDashboard?tab=packages", {
                                    state: {
                                      fromOfferId: offerId,
                                      fromOfferBrandId: String(offer?.brand_id || "").trim(),
                                    },
                                  });
                                }}
                              >
                                Build Package
                              </Button>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Brief & Scope body */}
                      <div className="px-6 py-5 space-y-5">
                        <div className="flex items-center justify-between gap-4">
                          <h3 className="text-base font-extrabold text-gray-900 tracking-tight">
                            Brief &amp; Scope
                          </h3>
                          <button
                            onClick={() => setSelectedOfferId(offerId)}
                            className="text-sm font-semibold text-blue-600 border border-blue-300 rounded-lg px-4 py-1.5 hover:bg-blue-50 transition-colors whitespace-nowrap"
                          >
                            View Full Details →
                          </button>
                        </div>

                        {/* Deliverables */}
                        <div>
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Deliverables</p>
                          <p className="text-sm text-gray-800">{deliverablesSummary}</p>
                        </div>

                        {/* Timeline + Budget */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Timeline</p>
                            {launchDate && <p className="text-sm text-gray-800">Start: {launchDate}</p>}
                            {deadlineDate && <p className="text-sm text-gray-800">Due: {deadlineDate}</p>}
                            {!launchDate && !deadlineDate && <p className="text-sm text-gray-400">Not specified</p>}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Budget</p>
                            {budgetTotal && <p className="text-sm font-bold text-gray-900">Total: {budgetTotal}</p>}
                            {budgetCreator && <p className="text-sm text-gray-700">Creator: {budgetCreator}</p>}
                            {budgetFee && <p className="text-sm text-gray-500">Likelee Fee: {budgetFee}</p>}
                            {!budgetTotal && !budgetCreator && !budgetFee && (
                              <p className="text-sm text-gray-400">Not specified</p>
                            )}
                          </div>
                        </div>

                        {/* Teaser — navigates to full-page detail */}
                        {(bs || offer?.message) && (
                          <div
                            className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4 cursor-pointer hover:bg-blue-100/50 transition-colors"
                            onClick={() => setSelectedOfferId(offerId)}
                          >
                            <span className="text-blue-500 mt-0.5 shrink-0">ⓘ</span>
                            <p className="text-sm font-medium text-blue-700">
                              Click to view complete brief with dialogue, visuals, and contract details
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      )}

      {
        activeTab === "feedback" && (
          <Card className="p-6 border border-gray-200 rounded-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Package Feedback</h3>
            {feedbackQuery.isLoading && (
              <p className="text-sm text-gray-500">Loading package feedback...</p>
            )}
            {!feedbackQuery.isLoading && feedbackItems.length === 0 && (
              <p className="text-sm text-gray-500">No package feedback yet.</p>
            )}
            {feedbackItems.length > 0 && (
              <div className="space-y-3">
                {feedbackItems.map((item: any) => (
                  <div key={String(item?.id)} className="border border-gray-200 rounded-lg p-4">
                    <p className="font-semibold text-gray-900">
                      {String(item?.title || "Talent package")}
                    </p>
                    <p className="text-xs text-gray-500">
                      Status: {String(item?.status || "feedback_received")}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-sm text-gray-700">
                        {item?.meta?.feedback_note ? String(item.meta.feedback_note) : ""}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs font-bold border-gray-300 h-8"
                        onClick={() => {
                          // Navigate to packages tab and pass the package ID
                          navigate("/AgencyDashboard?tab=packages", {
                            state: {
                              openFeedbackForPackageId: String(item?.meta?.agency_package_id || item?.id || ""),
                            },
                          });
                        }}
                      >
                        <Eye className="w-3 h-3 mr-2" />
                        View Activity
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )
      }

      {activeTab === "contract_hub" && (
        <Card className="p-6 border border-gray-200 rounded-xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">Contract Hub</h3>
            <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              Agency Management
            </div>
          </div>

          {offers.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">No active campaign offers to manage contracts for.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Sidebar: Offer List */}
              <div className="md:col-span-1 space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Campaign Offers</p>
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {offers.map((offer: any) => {
                    const offerId = String(offer?.id || "");
                    const isSelected = selectedOfferId === offerId;
                    return (
                      <div
                        key={offerId}
                        onClick={() => setSelectedOfferId(offerId)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${isSelected
                          ? "border-blue-500 bg-blue-50 shadow-sm"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 bg-white"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className={`font-bold text-sm ${isSelected ? "text-blue-900" : "text-gray-900"}`}>
                            {String(offer?.brand_campaigns?.name || "Campaign offer")}
                          </p>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          Brand: {String(offer?.brand_campaigns?.brands?.name || "Unknown")}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Main: Contract Management */}
              <div className="md:col-span-2">
                {!selectedOfferId ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-gray-50 rounded-2xl border border-gray-200">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                      <ArrowLeft className="w-6 h-6 text-gray-400" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 mb-1">Select an offer</h4>
                    <p className="text-sm text-gray-500 max-w-xs">
                      Choose an offer from the sidebar to manage its contracts.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <Tabs value={contractTab} onValueChange={setContractTab} className="w-full">
                      <div className="flex items-center justify-between mb-4">
                        <TabsList className="bg-gray-100 p-1 rounded-lg">
                          <TabsTrigger value="submissions" className="px-6 py-2 rounded-md transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            Submissions
                          </TabsTrigger>
                          <TabsTrigger value="upload" className="px-6 py-2 rounded-md transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            New Contract
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      <TabsContent value="submissions" className="space-y-4 m-0">
                        {offerContractsQuery.isLoading ? (
                          <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                          </div>
                        ) : (offerContractsQuery.data || []).length === 0 ? (
                          <div className="text-center py-20 bg-white border border-gray-200 rounded-2xl shadow-sm">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                              <FileText className="w-8 h-8 text-gray-300" />
                            </div>
                            <p className="text-gray-500 font-medium mb-4">No contracts found for this offer.</p>
                            <Button
                              variant="outline"
                              className="border-blue-200 text-blue-600 hover:bg-blue-50"
                              onClick={() => setContractTab("upload")}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Create First Contract
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-8">
                            {/* Templates Section */}
                            {(offerContractsQuery.data || []).some((c: any) => c?.docuseal_status === "draft" || !c?.docuseal_status) && (
                              <section className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <h5 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Contract Templates</h5>
                                  <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">Ready to Prepare</span>
                                </div>
                                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                  <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                      <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Title</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {(offerContractsQuery.data || [])
                                        .filter((c: any) => c?.docuseal_status === "draft" || !c?.docuseal_status)
                                        .map((c: any) => {
                                          const cId = String(c?.id);
                                          const isBusy = busyIds.has(cId);
                                          return (
                                            <tr key={cId} className="hover:bg-gray-50/50 transition-colors">
                                              <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                                                    <FileText className="w-5 h-5 text-blue-500" />
                                                  </div>
                                                  <div>
                                                    <p className="text-sm font-bold text-gray-900">
                                                      {String(c?.title || "Contract Draft")}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                                      Template ID: {String(c?.docuseal_template_id || "N/A")}
                                                    </p>
                                                  </div>
                                                </div>
                                              </td>
                                              <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                    onClick={() => handlePrepareContract(selectedOfferId, cId)}
                                                    disabled={isBusy}
                                                  >
                                                    <Wand2 className="w-4 h-4 mr-2" />
                                                    Prepare
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="default"
                                                    className="bg-blue-600 hover:bg-blue-700 h-9"
                                                    onClick={() => handleSendContract(selectedOfferId, cId)}
                                                    disabled={isBusy}
                                                  >
                                                    {isBusy ? (
                                                      <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                      <>
                                                        <Send className="w-4 h-4 mr-2" />
                                                        Send
                                                      </>
                                                    )}
                                                  </Button>
                                                  <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="text-red-400 hover:text-red-500 hover:bg-red-50"
                                                    onClick={() => handleDeleteContract(selectedOfferId, cId)}
                                                    disabled={isBusy}
                                                  >
                                                    <Trash2 className="w-4 h-4" />
                                                  </Button>
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                    </tbody>
                                  </table>
                                </div>
                              </section>
                            )}

                            {/* Submissions Section */}
                            {(offerContractsQuery.data || []).some((c: any) => c?.docuseal_status && c?.docuseal_status !== "draft") && (
                              <section className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <h5 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Sent Submissions</h5>
                                  <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium">Active Submissions</span>
                                </div>
                                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                  <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                      <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Title</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {(offerContractsQuery.data || [])
                                        .filter((c: any) => c?.docuseal_status && c?.docuseal_status !== "draft")
                                        .map((c: any) => {
                                          const cId = String(c?.id);
                                          const isBusy = busyIds.has(cId);
                                          return (
                                            <tr key={cId} className="hover:bg-gray-50/50 transition-colors">
                                              <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                  <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                                                    <FileText className="w-5 h-5 text-green-500" />
                                                  </div>
                                                  <div>
                                                    <p className="text-sm font-bold text-gray-900">
                                                      {String(c?.title || "Contract Submission")}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                                      ID: {cId.slice(0, 8)}...
                                                    </p>
                                                  </div>
                                                </div>
                                              </td>
                                              <td className="px-6 py-4">
                                                <Badge
                                                  variant="secondary"
                                                  className={`capitalize ${c?.docuseal_status === "completed" || c?.docuseal_status === "fully_signed"
                                                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                                                    : c?.docuseal_status === "sent"
                                                      ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                    }`}
                                                >
                                                  {String(c?.docuseal_status || "sent")}
                                                </Badge>
                                              </td>
                                              <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-gray-200 hover:bg-gray-50"
                                                    onClick={() => {
                                                      const subId = c?.docuseal_slug || c?.docuseal_submission_id;
                                                      if (subId) {
                                                        const url = `https://docuseal.com/s/${subId}`;
                                                        navigator.clipboard.writeText(url);
                                                        toast({
                                                          title: "Link Copied",
                                                          description: "Signing link copied to clipboard.",
                                                        });
                                                      } else {
                                                        toast({
                                                          title: "Link Unavailable",
                                                          description: "No submission found for this contract.",
                                                          variant: "destructive"
                                                        });
                                                      }
                                                    }}
                                                    disabled={isBusy || (!c?.docuseal_slug && !c?.docuseal_submission_id)}
                                                  >
                                                    <FileText className="w-4 h-4 mr-2" />
                                                    Copy Link
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-gray-200 hover:bg-gray-50"
                                                    onClick={() => handleSyncContract(selectedOfferId, cId)}
                                                    disabled={isBusy}
                                                  >
                                                    {isBusy ? (
                                                      <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                      <>
                                                        <RefreshCw className="w-4 h-4 mr-2" />
                                                        Sync
                                                      </>
                                                    )}
                                                  </Button>
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                    </tbody>
                                  </table>
                                </div>
                              </section>
                            )}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="upload" className="m-0">
                        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center hover:border-blue-400 transition-all group overflow-hidden relative">
                          {isUploading ? (
                            <div className="space-y-4">
                              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
                              <p className="text-gray-900 font-bold">Uploading PDF...</p>
                              <p className="text-xs text-gray-500">Creating your DocuSeal template draft</p>
                            </div>
                          ) : (
                            <>
                              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                                <Plus className="w-10 h-10 text-blue-500" />
                              </div>
                              <h4 className="text-xl font-bold text-gray-900 mb-2">Upload Contract PDF</h4>
                              <p className="text-gray-500 mb-8 max-w-sm mx-auto text-sm leading-relaxed">
                                Upload a PDF contract to create a new signature request. You can place fields in the builder afterwards.
                              </p>
                              <div className="flex items-center justify-center gap-4">
                                <input
                                  type="file"
                                  id="contract-pdf-upload"
                                  className="hidden"
                                  accept=".pdf"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleUploadContract(selectedOfferId, file);
                                    e.target.value = "";
                                  }}
                                />
                                <label
                                  htmlFor="contract-pdf-upload"
                                  className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-95 flex items-center"
                                >
                                  <FileText className="w-5 h-5 mr-3" />
                                  Choose PDF File
                                </label>
                              </div>
                            </>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs >
                  </div >
                )}
              </div >
            </div >
          )}
        </Card >
      )
      }

      {
        activeTab === "deliverables" && (
          <Card className="p-6 border border-gray-200 rounded-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Deliverables</h3>
            {offers.length === 0 && (
              <p className="text-sm text-gray-500">No offers available.</p>
            )}
            {offers.map((offer: any) => {
              const offerId = String(offer?.id || "");
              return (
                <div key={offerId} className="border border-gray-200 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-gray-900">
                      {String(offer?.brand_campaigns?.name || "Campaign offer")}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedOfferId((prev) => (prev === offerId ? "" : offerId))}
                    >
                      {selectedOfferId === offerId ? "Hide" : "Open"}
                    </Button>
                  </div>
                  {selectedOfferId === offerId && (
                    <div className="rounded-md border border-gray-200 p-3">
                      {(offerDeliverablesQuery.data || []).length === 0 ? (
                        <p className="text-xs text-gray-500">No deliverables yet.</p>
                      ) : (
                        (offerDeliverablesQuery.data || []).map((d: any) => (
                          <div key={String(d?.id)} className="text-xs text-gray-700 mb-1">
                            {String(d?.asset_type || "file")} • {String(d?.status || "submitted")}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        )
      }
      {/* DocuSeal Builder Modal */}
      {
        builderOpen && builderToken && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
            <div className="bg-white w-full h-full rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Prepare Contract</h3>
                    <p className="text-xs text-gray-500">Place signature fields and save to finish</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setBuilderOpen(false);
                    setBuilderToken(null);
                    if (selectedOfferId) {
                      queryClient.invalidateQueries({ queryKey: ["agency", "offer-contracts", selectedOfferId] });
                    }
                  }}
                  className="hover:bg-red-50 hover:text-red-500 rounded-full w-10 h-10 p-0"
                >
                  ✕
                </Button>
              </div>
              <div className="flex-1 bg-gray-50 relative">
                <docuseal-builder
                  data-token={builderToken}
                  data-autosave={true}
                  className="w-full h-full block"
                  ref={(el: any) => {
                    if (el && !el._hasSaveListener) {
                      el.addEventListener("save", () => {
                        if (selectedOfferId) {
                          queryClient.invalidateQueries({
                            queryKey: ["agency", "offer-contracts", selectedOfferId],
                          });
                        }
                        toast({
                          title: "Contract saved",
                          description: "Your changes have been saved successfully.",
                        });
                      });
                      el._hasSaveListener = true;
                    }
                  }}
                ></docuseal-builder>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default BrandConnectionsView;
