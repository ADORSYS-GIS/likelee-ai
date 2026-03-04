import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import { Link2Off } from "lucide-react";

const BrandConnectionsView = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

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

  const requests = useMemo(() => {
    if (!Array.isArray(requestsQuery.data)) return [];
    return requestsQuery.data;
  }, [requestsQuery.data]);

  const connections = useMemo(() => {
    if (!Array.isArray(connectionsQuery.data)) return [];
    return connectionsQuery.data;
  }, [connectionsQuery.data]);

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Brand Connections</h2>
        <p className="text-gray-600">
          Manage active connections and invitations.
        </p>
      </div>

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
    </div>
  );
};

export default BrandConnectionsView;
