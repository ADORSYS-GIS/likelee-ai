import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Link2Off, Eye, CheckCircle2 } from "lucide-react";
import { CampaignBriefView } from "@/components/campaign-offers/CampaignBriefView";

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
        <Card className="p-6 border border-gray-200 rounded-xl space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Brand Offers</h3>
          {offersQuery.isLoading && (
            <p className="text-sm text-gray-500">Loading offers...</p>
          )}
          {!offersQuery.isLoading && offers.length === 0 && (
            <p className="text-sm text-gray-500">No campaign offers yet.</p>
          )}
          {offers.map((offer: any) => {
            const offerId = String(offer?.id || "");
            const status = String(offer?.status || "sent");
            const isPending = ["sent", "viewed"].includes(status);
            const isAccepted = status === "accepted";
            return (
              <div
                key={offerId}
                className="border border-gray-200 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {offer?.brand_campaigns?.name || "Campaign offer"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {offer?.offer_title || "Offer"} • {status}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {status.replace(/_/g, " ")}
                  </Badge>
                </div>
                {offer?.message && (
                  <p className="text-sm text-gray-700">{String(offer.message)}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {isPending && (
                    <>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        disabled={busyIds.has(offerId)}
                        onClick={() => respondToOffer(offerId, "accept")}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        disabled={busyIds.has(offerId)}
                        onClick={() => respondToOffer(offerId, "decline")}
                      >
                        Decline
                      </Button>
                    </>
                  )}
                  {isAccepted && (
                    <>
                      {(() => {
                        const offerPkg = (offerPackagesQuery.data || []).find(
                          (p: any) => String(p.offer_id) === offerId
                        );
                        if (offerPkg) {
                          const token = offerPkg.meta?.agency_package_token;
                          return (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled
                                className="bg-gray-50 border-gray-200 text-gray-400"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" />
                                Package Sent
                              </Button>
                              {token && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-indigo-600 hover:text-indigo-700"
                                  onClick={() => window.open(`/share/package/${token}`, "_blank")}
                                >
                                  View
                                </Button>
                              )}
                            </div>
                          );
                        }
                        return (
                          <Button
                            size="sm"
                            className="bg-black hover:bg-gray-800 text-white"
                            onClick={() => {
                              navigate("/AgencyDashboard?tab=packages", {
                                state: {
                                  fromOfferId: offerId,
                                  fromOfferBrandId: String(offer?.brand_id || "").trim(),
                                },
                              });
                            }}
                          >
                            Build/Send Package
                          </Button>
                        );
                      })()}
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setSelectedOfferId((prev) => (prev === offerId ? "" : offerId))
                    }
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    {selectedOfferId === offerId ? "Hide details" : "View details"}
                  </Button>
                </div>
                {selectedOfferId === offerId && (
                  <div className="space-y-3 pt-2">
                    <div className="rounded-md border border-gray-200 p-3 space-y-2">
                      <p className="text-xs text-gray-500">Offer brief</p>
                      {offer?.message && (
                        <p className="text-sm text-gray-700 italic">
                          {String(offer.message)}
                        </p>
                      )}
                      {offer?.brief_snapshot && typeof offer.brief_snapshot === "object" && (
                        <div className="mt-4 border border-gray-200">
                          <CampaignBriefView brief={offer.brief_snapshot} />
                        </div>
                      )}
                      {!offer?.message &&
                        !(offer?.brief_snapshot && typeof offer.brief_snapshot === "object") && (
                          <p className="text-xs text-gray-500">
                            No brief details attached to this offer.
                          </p>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-md border border-gray-200 p-3">
                        <p className="text-xs text-gray-500 mb-2">Contracts</p>
                        {(offerContractsQuery.data || []).length === 0 ? (
                          <p className="text-xs text-gray-500">No contracts yet.</p>
                        ) : (
                          (offerContractsQuery.data || []).slice(0, 3).map((c: any) => (
                            <div key={String(c?.id)} className="text-xs text-gray-700 mb-1">
                              {String(c?.title || "Contract")} • {String(c?.docuseal_status || "draft")}
                            </div>
                          ))
                        )}
                      </div>
                      <div className="rounded-md border border-gray-200 p-3">
                        <p className="text-xs text-gray-500 mb-2">Deliverables</p>
                        {(offerDeliverablesQuery.data || []).length === 0 ? (
                          <p className="text-xs text-gray-500">No deliverables yet.</p>
                        ) : (
                          (offerDeliverablesQuery.data || []).slice(0, 3).map((d: any) => (
                            <div key={String(d?.id)} className="text-xs text-gray-700 mb-1">
                              {String(d?.asset_type || "file")} • {String(d?.status || "submitted")}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      )}

      {activeTab === "feedback" && (
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
      )}

      {activeTab === "contract_hub" && (
        <Card className="p-6 border border-gray-200 rounded-xl space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Contract Hub</h3>
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
                    {(offerContractsQuery.data || []).length === 0 ? (
                      <p className="text-xs text-gray-500">No contracts yet.</p>
                    ) : (
                      (offerContractsQuery.data || []).map((c: any) => (
                        <div key={String(c?.id)} className="text-xs text-gray-700 mb-1">
                          {String(c?.title || "Contract")} • {String(c?.docuseal_status || "draft")}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      )}

      {activeTab === "deliverables" && (
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
      )}
    </div>
  );
};

export default BrandConnectionsView;
