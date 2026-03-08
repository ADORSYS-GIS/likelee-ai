import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  FileVideo,
  FileImage,
  File as FileIcon,
  MessageSquare,
  Briefcase,
  Sparkles,
  Loader2,
  ExternalLink,
  Trash2,
} from "lucide-react";
import {
  listOfferDeliverables,
  uploadOfferDeliverable,
  submitAllDraftDeliverables,
  deleteOfferDeliverable,
} from "@/api/functions";
import { supabase } from "@/lib/supabase";

interface Deliverable {
  id: string;
  offer_id: string;
  asset_url: string;
  asset_type: string;
  status: string;
  caption?: string;
  brand_review_note?: string;
  agency_review_note?: string;
  created_at: string;
}

interface DeliverablesTabProps {
  activeCampaigns: any[];
}

export function DeliverablesTab({ activeCampaigns }: DeliverablesTabProps) {
  const [selectedOffer, setSelectedOffer] = useState<string | null>(null);
  const [deliverablesMap, setDeliverablesMap] = useState<
    Record<string, Deliverable[]>
  >({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [uploadingMap, setUploadingMap] = useState<Record<string, boolean>>({});
  const [submittingDrafts, setSubmittingDrafts] = useState<
    Record<string, boolean>
  >({});
  const [authToken, setAuthToken] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getSession = async () => {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        setAuthToken(session?.access_token || null);
      }
    };
    getSession();
  }, []);

  const loadDeliverables = async (offerId: string) => {
    setLoadingMap((prev) => ({ ...prev, [offerId]: true }));
    try {
      const resp = await listOfferDeliverables(offerId);
      setDeliverablesMap((prev) => ({
        ...prev,
        [offerId]: resp.deliverables || [],
      }));
    } catch (error) {
      console.error("Failed to load deliverables", error);
    } finally {
      setLoadingMap((prev) => ({ ...prev, [offerId]: false }));
    }
  };

  const handleSubmitDrafts = async (offerId: string) => {
    setSubmittingDrafts((prev) => ({ ...prev, [offerId]: true }));
    try {
      await submitAllDraftDeliverables(offerId);
      toast({
        title: "Submitted",
        description:
          "Your deliverables have been successfully sent to the agency.",
      });
      loadDeliverables(offerId);
    } catch (error: any) {
      toast({
        title: "Submission failed",
        description: error?.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSubmittingDrafts((prev) => ({ ...prev, [offerId]: false }));
    }
  };

  const handleDeleteDeliverable = async (
    offerId: string,
    deliverableId: string,
  ) => {
    if (!confirm("Are you sure you want to delete this deliverable?")) return;
    try {
      await deleteOfferDeliverable(offerId, deliverableId);
      toast({
        title: "Deleted",
        description: "Deliverable removed successfully.",
      });
      loadDeliverables(offerId);
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error?.message || "Something went wrong.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (selectedOffer && !deliverablesMap[selectedOffer]) {
      loadDeliverables(selectedOffer);
    }
  }, [selectedOffer]);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    offerId: string,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/"),
    );

    if (validFiles.length === 0) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image or video.",
        variant: "destructive",
      });
      return;
    }

    if (validFiles.length !== files.length) {
      toast({
        title: "Some files ignored",
        description: "Only image and video files are supported.",
        variant: "destructive",
      });
    }

    setUploadingMap((prev) => ({ ...prev, [offerId]: true }));
    let successCount = 0;

    try {
      await Promise.all(
        validFiles.map(async (file) => {
          try {
            await uploadOfferDeliverable(offerId, { file });
            successCount++;
          } catch (e) {
            console.error("Failed to upload file", file.name, e);
          }
        }),
      );

      if (successCount > 0) {
        toast({
          title: "Success",
          description: `Successfully uploaded ${successCount} deliverable${successCount > 1 ? "s" : ""}.`,
        });
        loadDeliverables(offerId);
      } else {
        throw new Error("Failed to upload all selected files.");
      }
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setUploadingMap((prev) => ({ ...prev, [offerId]: false }));
      // Reset input
      event.target.value = "";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return (
          <Badge className="bg-gray-100 text-gray-600 border-gray-200 px-2 py-0.5">
            <Clock className="w-3 h-3 mr-1" /> Draft
          </Badge>
        );
      case "submitted":
        return (
          <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 px-2 py-0.5">
            <Clock className="w-3 h-3 mr-1" /> Submitted
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-2 py-0.5">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
          </Badge>
        );
      case "changes_requested":
        return (
          <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20 px-2 py-0.5">
            <AlertCircle className="w-3 h-3 mr-1" /> Changes Requested
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="px-2 py-0.5 text-[10px]">
            {status.replace(/_/g, " ")}
          </Badge>
        );
    }
  };

  const getPublicUrl = (del: Deliverable) => {
    if (!del || !del.asset_url) return "";
    if (del.asset_url.startsWith("http")) return del.asset_url;
    // Use relative path to leverage Vite proxy and ensure cookies are sent
    const baseUrl = `/api/campaign-offers/${del.offer_id}/deliverables/${del.id}/file`;
    return authToken ? `${baseUrl}?token=${authToken}` : baseUrl;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-900 to-gray-800 p-8 text-white shadow-xl">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold font-syne bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">
            Campaign Deliverables
          </h2>
          <p className="mt-2 text-gray-400 max-w-lg text-sm">
            Upload your high-quality content for active campaigns. Track
            reviews, apply feedback, and get your work approved.
          </p>
        </div>
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" />
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeCampaigns.length === 0 ? (
          <Card className="p-20 flex flex-col items-center justify-center border-dashed border-2 bg-white/50 backdrop-blur-sm rounded-3xl">
            <div className="p-4 bg-gray-50 rounded-full mb-4">
              <Sparkles className="w-12 h-12 text-gray-300" />
            </div>
            <p className="text-gray-500 font-syne font-medium text-lg">
              No active campaigns available.
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Finish your active deals to see them here.
            </p>
          </Card>
        ) : (
          activeCampaigns.map((offer: any, index: number) => {
            const offerId = offer.id;
            const isExpanded = selectedOffer === offerId;
            const deliverables = deliverablesMap[offerId] || [];
            const isLoading = loadingMap[offerId];
            const isUploading = uploadingMap[offerId];

            return (
              <motion.div
                key={offerId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className={`overflow-hidden transition-all duration-300 border-gray-200 shadow-sm hover:shadow-md ${isExpanded ? "ring-2 ring-primary/5" : ""}`}
                >
                  <div
                    className={`p-5 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? "bg-primary/5" : "bg-white hover:bg-gray-50"}`}
                    onClick={() =>
                      setSelectedOffer(isExpanded ? null : offerId)
                    }
                  >
                    <div className="flex items-center gap-5">
                      <div
                        className={`p-3 rounded-xl transition-colors ${isExpanded ? "bg-primary text-white shadow-lg shadow-primary/25" : "bg-gray-100 text-gray-600"}`}
                      >
                        <Briefcase className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 font-syne leading-tight">
                          {offer.brand_campaigns?.name ||
                            offer.offer_title ||
                            "Untitled Campaign"}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500 flex items-center">
                            {deliverables.length} submitted
                          </span>
                          <span className="w-1 h-1 rounded-full bg-gray-300" />
                          <span className="text-xs font-medium text-primary uppercase tracking-wider">
                            {isExpanded ? "Hide Details" : "View & Upload"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {isExpanded ? (
                        <motion.div
                          initial={{ rotate: 0 }}
                          animate={{ rotate: 180 }}
                        >
                          <ChevronDown className="w-6 h-6 text-gray-400" />
                        </motion.div>
                      ) : (
                        <ChevronRight className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6 pt-2 border-t border-gray-100 bg-white">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 mb-2">
                            <div>
                              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">
                                Asset Library
                              </h4>
                              <p className="text-[10px] text-gray-500 mt-0.5">
                                Manage your photos and videos for this campaign.
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              {deliverables.some(
                                (d: any) => d.status === "draft",
                              ) && (
                                <Button
                                  variant="outline"
                                  className="h-11 px-6 border-blue-500 text-blue-500 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors font-semibold"
                                  onClick={() => handleSubmitDrafts(offerId)}
                                  disabled={
                                    submittingDrafts[offerId] || isUploading
                                  }
                                >
                                  {submittingDrafts[offerId] ? (
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                  ) : (
                                    <MessageSquare className="w-5 h-5 mr-2" />
                                  )}
                                  Submit to Agency
                                </Button>
                              )}
                              <input
                                type="file"
                                id={`file-upload-${offerId}`}
                                className="hidden"
                                accept="image/*,video/*"
                                multiple
                                onChange={(e) => handleFileUpload(e, offerId)}
                                disabled={isUploading}
                              />
                              <Button
                                className="relative overflow-hidden group h-11 px-6 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20"
                                onClick={() =>
                                  document
                                    .getElementById(`file-upload-${offerId}`)
                                    ?.click()
                                }
                                disabled={isUploading}
                              >
                                {isUploading ? (
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                  <>
                                    <Upload className="w-5 h-5 mr-2 group-hover:-translate-y-1 transition-transform" />
                                    <span className="font-semibold">
                                      Upload Content
                                    </span>
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>

                          {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                              <Loader2 className="w-10 h-10 animate-spin text-primary/30" />
                              <p className="text-sm text-gray-400 mt-4 font-medium italic">
                                Fetching your masterpieces...
                              </p>
                            </div>
                          ) : deliverables.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 bg-gray-50/30 rounded-2xl border-2 border-dashed border-gray-200">
                              <div className="p-3 bg-white rounded-full shadow-sm mb-3">
                                <Upload className="w-6 h-6 text-gray-300" />
                              </div>
                              <p className="text-sm text-gray-500 font-medium">
                                No files uploaded yet.
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                Get started by uploading your first asset.
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                              {deliverables.map((del) => (
                                <motion.div
                                  layout
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  key={del.id}
                                >
                                  <Card className="group relative overflow-hidden bg-white border-gray-200 rounded-2xl transition-all hover:shadow-xl hover:-translate-y-1">
                                    <div className="aspect-[4/5] bg-gray-100 relative overflow-hidden">
                                      {del.asset_type === "image" ? (
                                        <img
                                          src={getPublicUrl(del)}
                                          alt={del.caption || "Deliverable"}
                                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                          <FileVideo className="w-12 h-12 text-blue-400/50" />
                                        </div>
                                      )}

                                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                      <div className="absolute top-3 left-3">
                                        {getStatusBadge(del.status)}
                                      </div>

                                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                        {(del.status === "draft" ||
                                          del.status === "rejected" ||
                                          del.status ===
                                            "changes_requested") && (
                                          <Button
                                            variant="destructive"
                                            size="icon"
                                            className="w-8 h-8 rounded-full bg-rose-500/20 backdrop-blur-md border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white"
                                            onClick={() =>
                                              handleDeleteDeliverable(
                                                offerId,
                                                del.id,
                                              )
                                            }
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        )}
                                        <Button
                                          variant="secondary"
                                          size="icon"
                                          className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border-white/20 text-white hover:bg-white hover:text-gray-900"
                                          asChild
                                        >
                                          <a
                                            href={getPublicUrl(del)}
                                            target="_blank"
                                            rel="noreferrer"
                                          >
                                            <ExternalLink className="w-4 h-4" />
                                          </a>
                                        </Button>
                                      </div>

                                      <div className="absolute bottom-4 left-4 right-4 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                        <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
                                          {new Date(
                                            del.created_at,
                                          ).toLocaleDateString()}
                                        </p>
                                        <p className="text-xs text-white font-medium line-clamp-2 mt-1">
                                          {del.caption ||
                                            "Campaign deliverable asset"}
                                        </p>
                                      </div>
                                    </div>

                                    {(del.agency_review_note ||
                                      del.brand_review_note) && (
                                      <div className="p-4 bg-amber-50/80 backdrop-blur-sm border-t border-amber-100">
                                        <div className="flex items-center gap-2 mb-1.5 font-bold text-[10px] text-amber-700 tracking-wider">
                                          <MessageSquare className="w-3 h-3" />{" "}
                                          FEEDBACK
                                        </div>
                                        <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                                          {del.agency_review_note ||
                                            del.brand_review_note}
                                        </p>
                                      </div>
                                    )}
                                  </Card>
                                </motion.div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
