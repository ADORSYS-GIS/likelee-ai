import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Copy,
  Trash2,
  Archive,
  Mail,
  Loader2,
  Library,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { catalogApi } from "@/api/catalogs";
import { CatalogBuilderWizard } from "./CatalogBuilderWizard";

export function CatalogsView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showBuilder, setShowBuilder] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewCatalog, setPreviewCatalog] = useState<any | null>(null);

  const catalogsQuery = useQuery({
    queryKey: ["agency-catalogs"],
    queryFn: async () => {
      const res = await catalogApi.list();
      return (res as any)?.data ?? res ?? [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => catalogApi.remove(id),
    onSuccess: () => {
      toast({ title: "Catalog deleted" });
      queryClient.invalidateQueries({ queryKey: ["agency-catalogs"] });
      setDeleteId(null);
    },
    onError: (e: any) => {
      toast({
        title: "Failed to delete catalog",
        description: String(e?.message || e),
        variant: "destructive" as any,
      });
    },
  });

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/share/catalog/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied to clipboard!" });
  };

  const catalogs: any[] = Array.isArray(catalogsQuery.data)
    ? catalogsQuery.data
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Asset Catalogs</h2>
          <p className="text-gray-500 font-medium text-sm mt-0.5">
            Deliver licensed assets and voice recordings to clients after
            payment.
          </p>
        </div>
        <Button
          className="h-10 w-full sm:w-auto px-5 rounded-xl font-bold flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700"
          onClick={() => setShowBuilder(true)}
        >
          <Plus className="w-4 h-4" />
          New Catalog
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Catalogs", value: catalogs.length },
          {
            label: "Sent",
            value: catalogs.filter((c: any) => c.sent_at).length,
          },
          {
            label: "Pending Delivery",
            value: catalogs.filter((c: any) => !c.sent_at).length,
          },
        ].map((stat) => (
          <Card
            key={stat.label}
            className="p-4 bg-white border border-gray-100 rounded-xl"
          >
            <p className="text-2xl font-black text-gray-900">{stat.value}</p>
            <p className="text-xs font-medium text-gray-500 mt-0.5">
              {stat.label}
            </p>
          </Card>
        ))}
      </div>

      {/* Catalog list */}
      {catalogsQuery.isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : catalogs.length === 0 ? (
        <Card className="p-12 bg-white border border-gray-100 rounded-2xl text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Archive className="w-8 h-8 text-indigo-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">
            No catalogs yet
          </h3>
          <p className="text-sm text-gray-500 font-medium mb-6">
            After a licensing payment clears, create a catalog to deliver the
            assets and recordings to your client.
          </p>
          <Button
            onClick={() => setShowBuilder(true)}
            className="rounded-xl font-bold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Catalog
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {catalogs.map((catalog: any) => (
            <Card
              key={catalog.id}
              onClick={() => setPreviewCatalog(catalog)}
              className="p-5 bg-white border border-gray-100 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer hover:border-indigo-100 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                  <Library className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 truncate">
                    {catalog.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {catalog.client_name && (
                      <span className="text-xs text-gray-500 font-medium truncate">
                        {catalog.client_name}
                      </span>
                    )}
                    {catalog.client_email && (
                      <span className="flex items-center gap-1 text-xs text-gray-400 break-all">
                        <Mail className="w-3 h-3" />
                        {catalog.client_email}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Created{" "}
                    {new Date(catalog.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {catalog.expires_at && (
                      <>
                        {" • "}
                        <span className="text-orange-500 font-medium">
                          Expires{" "}
                          {new Date(catalog.expires_at).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex w-full sm:w-auto items-center gap-2 shrink-0 flex-wrap">
                <Badge
                  variant="secondary"
                  className={
                    catalog.sent_at
                      ? "bg-green-50 text-green-700 border-green-100"
                      : "bg-amber-50 text-amber-700 border-amber-100"
                  }
                >
                  {catalog.sent_at ? "Sent" : "Draft"}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 rounded-lg font-semibold text-xs flex items-center gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyLink(catalog.access_token);
                  }}
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy Link
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteId(catalog.id);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Builder dialog */}
      {showBuilder && (
        <CatalogBuilderWizard
          open={showBuilder}
          onClose={() => setShowBuilder(false)}
          onCreated={() => {
            setShowBuilder(false);
            queryClient.invalidateQueries({ queryKey: ["agency-catalogs"] });
          }}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Catalog?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the catalog and its share link. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 font-bold"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      <Dialog
        open={!!previewCatalog}
        onOpenChange={(o) => !o && setPreviewCatalog(null)}
      >
        <DialogContent className="max-w-xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Library className="w-5 h-5 text-indigo-600" />
              Catalog Preview
            </DialogTitle>
            <DialogDescription>
              Summary of the distribution settings for this catalog.
            </DialogDescription>
          </DialogHeader>

          {previewCatalog && (
            <div className="mt-6 space-y-6">
              {(() => {
                const items = previewCatalog.items || [];
                const talentCount = items.length;
                const assetCount = items.reduce(
                  (sum: number, it: any) => sum + (it.assets?.[0]?.count || 0),
                  0,
                );
                const recordingCount = items.reduce(
                  (sum: number, it: any) =>
                    sum + (it.recordings?.[0]?.count || 0),
                  0,
                );

                return (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3 text-sm">
                    <div className="flex justify-between items-start">
                      <span className="text-gray-500 font-medium shrink-0">
                        Title
                      </span>
                      <span className="font-bold text-gray-900 text-right uppercase tracking-tight">
                        {previewCatalog.title}
                      </span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-gray-500 font-medium shrink-0">
                        Client
                      </span>
                      <span className="font-semibold text-gray-900 text-right">
                        {previewCatalog.client_name || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-gray-500 font-medium shrink-0">
                        Recipient
                      </span>
                      <span className="font-semibold text-gray-900 text-right">
                        {previewCatalog.client_email || "—"}
                      </span>
                    </div>
                    <div className="h-px bg-gray-100 my-1" />

                    <div className="grid grid-cols-3 gap-2 py-1">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          Talents
                        </span>
                        <span className="font-bold text-gray-900">
                          {talentCount}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          Assets
                        </span>
                        <span className="font-bold text-gray-900">
                          {assetCount}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          Voice
                        </span>
                        <span className="font-bold text-gray-900">
                          {recordingCount}
                        </span>
                      </div>
                    </div>

                    <div className="h-px bg-gray-100 my-1" />

                    <div className="flex justify-between">
                      <span className="text-gray-500 font-medium">
                        Linked Receipt
                      </span>
                      <span
                        className={`font-bold ${previewCatalog.licensing_request_id ? "text-green-600" : "text-gray-400"}`}
                      >
                        {previewCatalog.licensing_request_id ? "Active" : "No"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-medium">
                        Created On
                      </span>
                      <span className="font-semibold text-gray-900">
                        {new Date(previewCatalog.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-medium text-orange-600">
                        Expiration
                      </span>
                      <span className="font-bold text-orange-600">
                        {previewCatalog.expires_at
                          ? new Date(previewCatalog.expires_at).toLocaleString()
                          : "Mandatory (Missing)"}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {previewCatalog.notes && (
                <div className="space-y-1.5">
                  <span className="text-xs font-black uppercase tracking-widest text-gray-400">
                    Internal Notes
                  </span>
                  <div className="p-4 bg-white border border-gray-100 rounded-xl text-sm text-gray-600 italic">
                    “{previewCatalog.notes}”
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setPreviewCatalog(null)}
                  className="rounded-xl font-bold"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    copyLink(previewCatalog.access_token);
                    setPreviewCatalog(null);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy Link
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
