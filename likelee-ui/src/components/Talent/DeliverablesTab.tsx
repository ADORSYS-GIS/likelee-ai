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
  MessageSquare,
  Briefcase,
  Sparkles,
  Loader2,
  Trash2,
  Eye,
  RefreshCw,
  Download,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  listBookingDeliverables,
  uploadBookingDeliverable,
  submitBookingDeliverables,
  deleteBookingDeliverable,
} from "@/api/functions";
import { supabase } from "@/lib/supabase";

interface Deliverable {
  id: string;
  booking_campaign_id: string;
  asset_url: string;
  asset_type: string;
  status: string;
  caption?: string;
  agency_review_note?: string;
  created_at: string;
}

interface Campaign {
  id: string;
  name: string;
  status?: string;
}

interface DeliverablesTabProps {
  activeCampaigns: Campaign[];
}

export function DeliverablesTab({ activeCampaigns }: DeliverablesTabProps) {
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [deliverablesMap, setDeliverablesMap] = useState<Record<string, Deliverable[]>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [uploadingMap, setUploadingMap] = useState<Record<string, boolean>>({});
  const [submittingMap, setSubmittingMap] = useState<Record<string, boolean>>({});
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [openFeedback, setOpenFeedback] = useState<Set<string>>(new Set());
  const [previewImage, setPreviewImage] = useState<Deliverable | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setAuthToken(session?.access_token || null);
      });
    }
  }, []);

  const loadDeliverables = async (campaignId: string) => {
    setLoadingMap((prev) => ({ ...prev, [campaignId]: true }));
    try {
      const resp = await listBookingDeliverables(campaignId);
      setDeliverablesMap((prev) => ({
        ...prev,
        [campaignId]: (resp as any)?.deliverables || [],
      }));
    } catch (error) {
      console.error("Failed to load deliverables", error);
    } finally {
      setLoadingMap((prev) => ({ ...prev, [campaignId]: false }));
    }
  };

  useEffect(() => {
    if (selectedCampaign && !deliverablesMap[selectedCampaign]) {
      loadDeliverables(selectedCampaign);
    }
  }, [selectedCampaign]);

  const handleSubmit = async (campaignId: string) => {
    setSubmittingMap((prev) => ({ ...prev, [campaignId]: true }));
    try {
      await submitBookingDeliverables(campaignId);
      toast({ title: "Submitted", description: "Deliverables sent to the agency." });
      loadDeliverables(campaignId);
    } catch (error: any) {
      toast({ title: "Submit failed", description: error?.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setSubmittingMap((prev) => ({ ...prev, [campaignId]: false }));
    }
  };

  const handleDelete = async (campaignId: string, deliverableId: string) => {
    if (!confirm("Delete this deliverable?")) return;
    try {
      await deleteBookingDeliverable(campaignId, deliverableId);
      toast({ title: "Deleted", description: "Deliverable removed." });
      loadDeliverables(campaignId);
    } catch (error: any) {
      toast({ title: "Delete failed", description: error?.message || "Something went wrong.", variant: "destructive" });
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    campaignId: string,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/"),
    );

    if (validFiles.length === 0) {
      toast({ title: "Invalid file type", description: "Only images and videos are supported.", variant: "destructive" });
      return;
    }

    setUploadingMap((prev) => ({ ...prev, [campaignId]: true }));
    let successCount = 0;

    await Promise.all(
      validFiles.map(async (file) => {
        try {
          await uploadBookingDeliverable(campaignId, { file });
          successCount++;
        } catch (e) {
          console.error("Upload failed", file.name, e);
        }
      }),
    );

    if (successCount > 0) {
      toast({ title: "Uploaded", description: `${successCount} file${successCount > 1 ? "s" : ""} uploaded.` });
      loadDeliverables(campaignId);
    } else {
      toast({ title: "Upload failed", description: "All uploads failed.", variant: "destructive" });
    }

    setUploadingMap((prev) => ({ ...prev, [campaignId]: false }));
    event.target.value = "";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft": return <Badge className="bg-gray-100 text-gray-600 border-gray-200 px-2 py-0.5"><Clock className="w-3 h-3 mr-1" />Draft</Badge>;
      case "submitted": return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 px-2 py-0.5"><Clock className="w-3 h-3 mr-1" />Submitted</Badge>;
      case "approved": return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-2 py-0.5"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>;
      case "changes_requested": return <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20 px-2 py-0.5"><AlertCircle className="w-3 h-3 mr-1" />Changes Requested</Badge>;
      default: return <Badge variant="outline" className="px-2 py-0.5 text-[10px]">{status.replace(/_/g, " ")}</Badge>;
    }
  };

  const getFileUrl = (del: Deliverable) => {
    const base = `/api/bookings-campaigns/${del.booking_campaign_id}/deliverables/${del.id}/file`;
    return authToken ? `${base}?token=${authToken}` : base;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-900 to-gray-800 p-8 text-white shadow-xl">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold font-syne bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">
            Campaign Deliverables
          </h2>
          <p className="mt-2 text-gray-400 max-w-lg text-sm">
            Upload your content for each campaign you've been booked for. Submit when ready for agency review.
          </p>
        </div>
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeCampaigns.length === 0 ? (
          <Card className="p-20 flex flex-col items-center justify-center border-dashed border-2 bg-white/50 backdrop-blur-sm rounded-3xl">
            <div className="p-4 bg-gray-50 rounded-full mb-4">
              <Sparkles className="w-12 h-12 text-gray-300" />
            </div>
            <p className="text-gray-500 font-syne font-medium text-lg">No active campaigns.</p>
            <p className="text-gray-400 text-sm mt-2">You'll see campaigns here once your agency books you.</p>
          </Card>
        ) : (
          activeCampaigns.map((campaign, index) => {
            const campaignId = campaign.id;
            const isExpanded = selectedCampaign === campaignId;
            const deliverables = deliverablesMap[campaignId] || [];
            const isLoading = loadingMap[campaignId];
            const isUploading = uploadingMap[campaignId];

            return (
              <motion.div
                key={campaignId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`overflow-hidden transition-all duration-300 border-gray-200 shadow-sm hover:shadow-md ${isExpanded ? "ring-2 ring-primary/5" : ""}`}>
                  <div
                    className={`p-5 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? "bg-primary/5" : "bg-white hover:bg-gray-50"}`}
                    onClick={() => setSelectedCampaign(isExpanded ? null : campaignId)}
                  >
                    <div className="flex items-center gap-5">
                      <div className={`p-3 rounded-xl transition-colors ${isExpanded ? "bg-primary text-white shadow-lg shadow-primary/25" : "bg-gray-100 text-gray-600"}`}>
                        <Briefcase className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 font-syne leading-tight">
                          {campaign.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500 flex items-center">
                            {deliverables.length} file{deliverables.length !== 1 ? "s" : ""}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-gray-300" />
                          <span className="text-xs font-medium text-primary uppercase tracking-wider">
                            {isExpanded ? "Hide" : "View & Upload"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      {isExpanded ? (
                        <motion.div initial={{ rotate: 0 }} animate={{ rotate: 180 }}>
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
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6 pt-2 border-t border-gray-100 bg-white">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 mb-2">
                            <div>
                              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Asset Library</h4>
                              <p className="text-[10px] text-gray-500 mt-0.5">Manage your photos and videos for this campaign.</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {deliverables.some((d) => d.status === "draft") && (
                                <Button
                                  variant="outline"
                                  className="h-11 px-6 border-blue-500 text-blue-500 hover:bg-blue-50 rounded-xl font-semibold"
                                  onClick={() => handleSubmit(campaignId)}
                                  disabled={submittingMap[campaignId] || isUploading}
                                >
                                  {submittingMap[campaignId] ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <MessageSquare className="w-5 h-5 mr-2" />}
                                  Submit to Agency
                                </Button>
                              )}
                              <input
                                type="file"
                                id={`file-upload-${campaignId}`}
                                className="hidden"
                                accept="image/*,video/*"
                                multiple
                                onChange={(e) => handleFileUpload(e, campaignId)}
                                disabled={isUploading}
                              />
                              <Button
                                className="h-11 px-6 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20"
                                onClick={() => document.getElementById(`file-upload-${campaignId}`)?.click()}
                                disabled={isUploading}
                              >
                                {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Upload className="w-5 h-5 mr-2" /><span className="font-semibold">Upload</span></>}
                              </Button>
                            </div>
                          </div>

                          {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                              <Loader2 className="w-10 h-10 animate-spin text-primary/30" />
                              <p className="text-sm text-gray-400 mt-4 italic">Loading…</p>
                            </div>
                          ) : deliverables.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 bg-gray-50/30 rounded-2xl border-2 border-dashed border-gray-200">
                              <Upload className="w-6 h-6 text-gray-300 mb-2" />
                              <p className="text-sm text-gray-500 font-medium">No files yet.</p>
                              <p className="text-xs text-gray-400 mt-1">Upload your first asset above.</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                              {deliverables.map((del) => (
                                <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} key={del.id}>
                                  <Card className="group relative overflow-hidden bg-white border-gray-200 rounded-2xl transition-all hover:shadow-xl hover:-translate-y-1">
                                    <div className="aspect-[4/5] bg-gray-100 relative overflow-hidden">
                                      {del.asset_type === "image" ? (
                                        <img src={getFileUrl(del)} alt={del.caption || "Deliverable"} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                          <FileVideo className="w-12 h-12 text-blue-400/50" />
                                        </div>
                                      )}
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                      <div className="absolute top-3 left-3">{getStatusBadge(del.status)}</div>
                                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                        {(del.status === "draft" || del.status === "changes_requested") && (
                                          <Button variant="destructive" size="icon" className="w-8 h-8 rounded-full bg-rose-500/20 backdrop-blur-md text-rose-500 hover:bg-rose-500 hover:text-white"
                                            onClick={() => handleDelete(campaignId, del.id)}>
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        )}
                                        <Button
                                          variant="secondary"
                                          size="icon"
                                          className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white hover:text-gray-900"
                                          onClick={() => setPreviewImage(del)}
                                        >
                                          <Eye className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="secondary"
                                          size="icon"
                                          className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white hover:text-gray-900"
                                          asChild
                                        >
                                          <a
                                            href={getFileUrl(del)}
                                            download
                                            target="_blank"
                                            rel="noreferrer"
                                          >
                                            <Download className="w-4 h-4" />
                                          </a>
                                        </Button>
                                      </div>
                                    </div>
                                    {del.agency_review_note && (
                                      <div className="border-t border-amber-100">
                                        <button
                                          onClick={() => {
                                            const next = new Set(openFeedback);
                                            if (next.has(del.id)) next.delete(del.id);
                                            else next.add(del.id);
                                            setOpenFeedback(next);
                                          }}
                                          className="w-full p-3 flex items-center justify-between bg-amber-50/50 hover:bg-amber-100/50 transition-colors"
                                        >
                                          <div className="flex items-center gap-2 font-bold text-[10px] text-amber-700 tracking-wider uppercase">
                                            <MessageSquare className="w-3.5 h-3.5" />
                                            Agency Feedback
                                          </div>
                                          {openFeedback.has(del.id) ? (
                                            <ChevronDown className="w-3.5 h-3.5 text-amber-400 rotate-180 transition-transform" />
                                          ) : (
                                            <ChevronDown className="w-3.5 h-3.5 text-amber-400 transition-transform" />
                                          )}
                                        </button>
                                        
                                        <AnimatePresence>
                                          {openFeedback.has(del.id) && (
                                            <motion.div
                                              initial={{ height: 0, opacity: 0 }}
                                              animate={{ height: "auto", opacity: 1 }}
                                              exit={{ height: 0, opacity: 0 }}
                                              className="overflow-hidden"
                                            >
                                              <div className="px-4 pb-4 pt-1 bg-amber-50/50">
                                                <p className="text-[11px] text-amber-900 leading-relaxed font-medium bg-white/60 rounded-xl p-3 border border-amber-200/50 shadow-sm">
                                                  {del.agency_review_note}
                                                </p>
                                              </div>
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
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

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-[800px] p-0 overflow-hidden border-none bg-black/95 shadow-2xl rounded-3xl">
          <div className="relative w-full h-full flex flex-col items-center justify-center p-0">
            <div className="w-full aspect-[4/3] relative flex items-center justify-center bg-gray-900/50">
              {previewImage?.asset_type === "video" ? (
                <video
                  src={getFileUrl(previewImage)}
                  controls
                  className="max-w-full max-h-full"
                  autoPlay
                />
              ) : (
                <img
                  src={previewImage ? getFileUrl(previewImage) : ""}
                  className="max-w-full max-h-full object-contain"
                  alt="Preview"
                />
              )}
              
              {/* Overlay controls */}
              <div className="absolute top-6 right-6 flex gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-xl bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-xl font-bold h-10 px-4"
                  asChild
                >
                  <a
                    href={previewImage ? getFileUrl(previewImage) : ""}
                    download
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Download className="w-4 h-4 mr-2" /> Download
                  </a>
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-xl bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-xl h-10 w-10 transition-all hover:rotate-90"
                  onClick={() => setPreviewImage(null)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            {previewImage?.caption && (
              <div className="w-full bg-white/5 backdrop-blur-md p-8 text-white text-sm border-t border-white/5">
                <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-3">
                  Caption
                </p>
                <p className="text-base leading-relaxed text-gray-200">{previewImage.caption}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
