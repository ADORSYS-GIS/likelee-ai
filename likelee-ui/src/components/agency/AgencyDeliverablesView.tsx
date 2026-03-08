import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  ChevronDown,
  User,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Clock,
  MessageSquare,
  ExternalLink,
  Loader2,
  RefreshCw,
  FileVideo,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  getBookingsCampaigns,
  listBookingDeliverables,
  reviewBookingDeliverable,
  listMyCampaignOffers,
  submitToBrand,
} from "@/api/functions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";

interface Deliverable {
  id: string;
  booking_campaign_id: string;
  booking_id?: string;
  creator_id?: string;
  asset_url: string;
  asset_type: string;
  status: string;
  caption?: string;
  agency_review_note?: string;
  created_at: string;
}

interface TalentNode {
  talentName: string;
  talentId?: string;
  bookingId?: string;
  profilePhotoUrl?: string;
}

interface CampaignNode {
  id: string;
  name: string;
  status: string;
  talents: TalentNode[];
}

export function AgencyDeliverablesView() {
  const [campaigns, setCampaigns] = useState<CampaignNode[]>([]);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(
    new Set(),
  );
  const [expandedTalents, setExpandedTalents] = useState<Set<string>>(
    new Set(),
  );
  const [deliverablesMap, setDeliverablesMap] = useState<
    Record<string, Deliverable[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [loadingDeliverables, setLoadingDeliverables] = useState<
    Record<string, boolean>
  >({});
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    delId: string;
    campaignId: string;
    note: string;
  }>({ open: false, delId: "", campaignId: "", note: "" });
  const [brandOffers, setBrandOffers] = useState<any[]>([]);
  const [submitDialog, setSubmitDialog] = useState<{
    open: boolean;
    delId: string;
    campaignId: string;
    offerId: string;
  }>({ open: false, delId: "", campaignId: "", offerId: "" });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setAuthToken(session?.access_token || null);
      });
    }
  }, []);

  const fetchHierarchy = async () => {
    setLoading(true);
    try {
      // getBookingsCampaigns already returns bookings joined: bookings(id, talent_name, client_name)
      const resp = await getBookingsCampaigns();
      const items: any[] = Array.isArray(resp) ? resp : [];

      const nodes: CampaignNode[] = items.map((c: any) => {
        const bookings: any[] = Array.isArray(c.bookings) ? c.bookings : [];
        const uniqueTalents = new Map<string, TalentNode>();
        bookings.forEach((b: any) => {
          const name =
            b.talent_name ||
            b.client_name ||
            b.talent_id ||
            "Unknown Talent";
          const key = b.talent_id || name;
          if (!uniqueTalents.has(key)) {
            uniqueTalents.set(key, {
              talentName: name,
              talentId: b.talent_id,
              bookingId: b.id,
              profilePhotoUrl: b.agency_users?.profile_photo_url,
            });
          }
        });
        return {
          id: c.id,
          name: c.name || "Untitled Campaign",
          status: c.status || "created",
          talents: Array.from(uniqueTalents.values()),
        };
      });

      setCampaigns(nodes);
    } catch (error) {
      console.error("Failed to fetch campaigns hierarchy", error);
      toast({
        title: "Error",
        description: "Failed to load campaigns.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOffers = async () => {
    try {
      const resp = await listMyCampaignOffers();
      setBrandOffers((resp as any)?.offers || []);
    } catch (error) {
      console.error("Failed to fetch brand offers", error);
    }
  };

  useEffect(() => {
    fetchHierarchy();
    fetchOffers();
  }, []);

  const toggleCampaign = (id: string) => {
    const next = new Set(expandedCampaigns);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedCampaigns(next);
  };

  const toggleTalent = async (campaignId: string, talentKey: string) => {
    const key = `${campaignId}__${talentKey}`;
    const next = new Set(expandedTalents);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
      if (!deliverablesMap[campaignId]) {
        await fetchDeliverables(campaignId);
      }
    }
    setExpandedTalents(next);
  };

  const fetchDeliverables = async (campaignId: string) => {
    setLoadingDeliverables((prev) => ({ ...prev, [campaignId]: true }));
    try {
      const resp = await listBookingDeliverables(campaignId);
      setDeliverablesMap((prev) => ({
        ...prev,
        [campaignId]: (resp as any)?.deliverables || [],
      }));
    } catch (error) {
      console.error("Failed to fetch deliverables", error);
    } finally {
      setLoadingDeliverables((prev) => ({ ...prev, [campaignId]: false }));
    }
  };

  const handleReview = async (
    campaignId: string,
    delId: string,
    status: string,
    note?: string,
  ) => {
    setReviewing(delId);
    try {
      await reviewBookingDeliverable(campaignId, delId, { status, note });
      toast({
        title: "Done",
        description: `Deliverable ${status.replace(/_/g, " ")}.`,
      });
      fetchDeliverables(campaignId);
      setReviewDialog((prev) => ({ ...prev, open: false, note: "" }));
    } catch (error: any) {
      toast({
        title: "Review failed",
        description: error.message || "Failed to update status.",
        variant: "destructive",
      });
    } finally {
      setReviewing(null);
    }
  };

  const handleSubmitToBrand = async () => {
    if (!submitDialog.offerId) return;
    setSubmitting(true);
    try {
      await submitToBrand(submitDialog.campaignId, {
        deliverable_ids: [submitDialog.delId],
        brand_offer_id: submitDialog.offerId,
      });
      toast({
        title: "Submitted to Brand",
        description: "The deliverable has been sent for brand review.",
      });
      setSubmitDialog((prev) => ({ ...prev, open: false }));
      fetchDeliverables(submitDialog.campaignId);
    } catch (error: any) {
      toast({
        title: "Submission failed",
        description: error.message || "Failed to submit to brand.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getFileUrl = (del: Deliverable) => {
    const base = `/api/bookings-campaigns/${del.booking_campaign_id}/deliverables/${del.id}/file`;
    return authToken ? `${base}?token=${authToken}` : base;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px]">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "submitted":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 text-[10px]">
            <Clock className="w-3 h-3 mr-1" />
            Submitted
          </Badge>
        );
      case "changes_requested":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 text-[10px]">
            <AlertCircle className="w-3 h-3 mr-1" />
            Changes Requested
          </Badge>
        );
      case "draft":
        return (
          <Badge className="bg-gray-100 text-gray-500 border-gray-200 text-[10px]">
            <Clock className="w-3 h-3 mr-1" />
            Draft
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            {status}
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-10 h-10 animate-spin text-primary/40" />
        <p className="mt-4 text-sm text-gray-400">Loading campaigns…</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-900 to-gray-800 p-8 text-white shadow-xl">
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold font-syne bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">
              Campaign Deliverables
            </h2>
            <p className="mt-2 text-gray-400 text-sm max-w-lg">
              Review and approve content uploaded by your booked talent for each
              campaign.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-white/20 text-white hover:bg-white/10"
            onClick={fetchHierarchy}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      {campaigns.length === 0 ? (
        <Card className="p-20 flex flex-col items-center justify-center border-dashed border-2 bg-white/50 backdrop-blur-sm rounded-3xl">
          <div className="p-4 bg-gray-50 rounded-full mb-4">
            <Briefcase className="w-12 h-12 text-gray-300" />
          </div>
          <p className="text-gray-500 font-syne font-medium text-lg">
            No booking campaigns yet.
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Create a campaign and book talents to see deliverables here.
          </p>
        </Card>
      ) : (
        campaigns.map((campaign, ci) => {
          const isExpanded = expandedCampaigns.has(campaign.id);
          const allDeliverables = deliverablesMap[campaign.id] || [];

          return (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: ci * 0.05 }}
            >
              <Card
                className={`overflow-hidden transition-all border-gray-200 shadow-sm hover:shadow-md ${isExpanded ? "ring-2 ring-primary/10" : ""}`}
              >
                {/* Campaign header */}
                <div
                  className={`p-5 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? "bg-primary/5" : "bg-white hover:bg-gray-50"}`}
                  onClick={() => toggleCampaign(campaign.id)}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-3 rounded-xl transition-colors ${isExpanded ? "bg-primary text-white shadow-lg shadow-primary/25" : "bg-gray-100 text-gray-600"}`}
                    >
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 font-syne">
                        {campaign.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">
                          {campaign.talents.length} talent
                          {campaign.talents.length !== 1 ? "s" : ""}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                        <Badge variant="outline" className="text-[10px] py-0">
                          {campaign.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden border-t border-gray-100"
                    >
                      <div className="p-4 space-y-3 bg-gray-50/50">
                        {campaign.talents.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-8">
                            No talents booked to this campaign yet.
                          </p>
                        ) : (
                          campaign.talents.map((talent) => {
                            const talentKey =
                              talent.talentId || talent.talentName;
                            const expandKey = `${campaign.id}__${talentKey}`;
                            const isTalentExpanded =
                              expandedTalents.has(expandKey);

                            // Filter deliverables for this specific talent
                            const talentDeliverables = talent.bookingId
                              ? allDeliverables.filter(
                                  (d) => d.booking_id === talent.bookingId || d.creator_id === talent.talentId,
                                )
                              : allDeliverables;

                            const isLoadingDels =
                              loadingDeliverables[campaign.id];

                            return (
                              <Card
                                key={talentKey}
                                className={`overflow-hidden border-gray-200 ${isTalentExpanded ? "ring-1 ring-primary/10" : ""}`}
                              >
                                {/* Talent row */}
                                <div
                                  className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors ${isTalentExpanded ? "bg-primary/5" : "bg-white hover:bg-gray-50"}`}
                                  onClick={() =>
                                    toggleTalent(campaign.id, talentKey)
                                  }
                                >
                                  <div className="flex items-center gap-3">
                                    <div
                                      className="relative group/avatar"
                                    >
                                      <Avatar className="h-10 w-10 border-2 border-white shadow-sm transition-transform group-hover/avatar:scale-105">
                                        <AvatarImage
                                          src={talent.profilePhotoUrl}
                                          alt={talent.talentName}
                                        />
                                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                          {talent.talentName
                                            .substring(0, 2)
                                            .toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      {isTalentExpanded && (
                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold text-gray-900">
                                        {talent.talentName}
                                      </p>
                                      {!isLoadingDels && isTalentExpanded && (
                                        <p className="text-xs text-gray-400">
                                          {talentDeliverables.length} file
                                          {talentDeliverables.length !== 1
                                            ? "s"
                                            : ""}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {isTalentExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                  )}
                                </div>

                                <AnimatePresence>
                                  {isTalentExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="overflow-hidden border-t border-gray-100"
                                    >
                                      <div className="p-4 bg-white">
                                        {isLoadingDels ? (
                                          <div className="flex items-center justify-center py-10">
                                            <Loader2 className="w-6 h-6 animate-spin text-primary/30" />
                                          </div>
                                        ) : talentDeliverables.length === 0 ? (
                                          <p className="text-sm text-gray-400 text-center py-8">
                                            No deliverables uploaded yet.
                                          </p>
                                        ) : (
                                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {talentDeliverables.map((del) => (
                                              <Card
                                                key={del.id}
                                                className="group overflow-hidden border-gray-200 rounded-xl transition-all hover:shadow-md hover:-translate-y-0.5"
                                              >
                                                {/* Preview */}
                                                <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                                                  {del.asset_type ===
                                                  "image" ? (
                                                    <img
                                                      src={getFileUrl(del)}
                                                      alt={
                                                        del.caption ||
                                                        "Deliverable"
                                                      }
                                                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                    />
                                                  ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                                      <FileVideo className="w-10 h-10 text-blue-400/50" />
                                                    </div>
                                                  )}
                                                  <div className="absolute top-2 left-2">
                                                    {getStatusBadge(
                                                      del.status,
                                                    )}
                                                  </div>
                                                  <a
                                                    href={getFileUrl(del)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm rounded-full p-1.5"
                                                  >
                                                    <ExternalLink className="w-3.5 h-3.5 text-white" />
                                                  </a>
                                                </div>

                                                {/* Review actions */}
                                                {del.status === "submitted" && (
                                                  <div className="p-3 border-t border-gray-100 flex gap-2">
                                                    <Button
                                                      size="sm"
                                                      className="flex-1 h-8 bg-emerald-500 hover:bg-emerald-600 text-white text-xs"
                                                      disabled={
                                                        reviewing === del.id
                                                      }
                                                      onClick={() =>
                                                        handleReview(
                                                          campaign.id,
                                                          del.id,
                                                          "approved",
                                                        )
                                                      }
                                                    >
                                                      {reviewing === del.id ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                      ) : (
                                                        <>
                                                          <CheckCircle2 className="w-3 h-3 mr-1" />
                                                          Approve
                                                        </>
                                                      )}
                                                    </Button>
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      className="flex-1 h-8 border-amber-300 text-amber-600 hover:bg-amber-50 text-xs"
                                                      disabled={
                                                        reviewing === del.id
                                                      }
                                                      onClick={() => {
                                                        setReviewDialog({
                                                          open: true,
                                                          delId: del.id,
                                                          campaignId: campaign.id,
                                                          note: "",
                                                        });
                                                      }}
                                                    >
                                                      <MessageSquare className="w-3 h-3 mr-1" />
                                                      Revise
                                                    </Button>
                                                  </div>
                                                )}

                                                 {del.status === "approved" && (
                                                   <div className="p-3 border-t border-gray-100">
                                                     <Button
                                                       size="sm"
                                                       variant="outline"
                                                       className="w-full h-8 border-primary/30 text-primary hover:bg-primary/5 text-xs font-semibold"
                                                       onClick={() => {
                                                         setSubmitDialog({
                                                           open: true,
                                                           delId: del.id,
                                                           campaignId: campaign.id,
                                                           offerId: "",
                                                         });
                                                       }}
                                                     >
                                                       <ExternalLink className="w-3 h-3 mr-1.5" />
                                                       Submit to Brand
                                                     </Button>
                                                   </div>
                                                 )}

                                                {del.agency_review_note && (
                                                  <div className="px-3 pb-3">
                                                    <p className="text-[10px] text-amber-700 bg-amber-50 rounded p-2 leading-relaxed">
                                                      {del.agency_review_note}
                                                    </p>
                                                  </div>
                                                )}
                                              </Card>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </Card>
                            );
                          })
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

      {/* Review Feedback Dialog */}
      <Dialog
        open={reviewDialog.open}
        onOpenChange={(open) =>
          setReviewDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent className="sm:max-w-[500px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-primary/20 p-8 text-white relative">
            <DialogHeader className="space-y-1 relative z-10">
              <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center mb-4 border border-amber-500/30">
                <MessageSquare className="w-6 h-6 text-amber-500" />
              </div>
              <DialogTitle className="text-2xl font-bold font-syne">
                Request Changes
              </DialogTitle>
              <p className="text-gray-400 text-sm">
                Provide specific feedback to help the talent improve this
                deliverable.
              </p>
            </DialogHeader>
          </div>

          <div className="p-8 space-y-6">
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                Your Feedback
              </label>
              <Textarea
                placeholder="What exactly should be changed? (e.g., 'Brightness too low', 'Need a different background')"
                className="min-h-[150px] resize-none rounded-2xl border-gray-100 bg-gray-50 focus:bg-white focus:ring-primary/20 transition-all text-sm leading-relaxed"
                value={reviewDialog.note}
                onChange={(e) =>
                  setReviewDialog((prev) => ({
                    ...prev,
                    note: e.target.value,
                  }))
                }
              />
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-xl border-gray-100 hover:bg-gray-50 font-semibold"
                onClick={() =>
                  setReviewDialog((prev) => ({ ...prev, open: false }))
                }
              >
                Cancel
              </Button>
              <Button
                className="flex-1 h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]"
                disabled={!reviewDialog.note.trim() || reviewing === reviewDialog.delId}
                onClick={() =>
                  handleReview(
                    reviewDialog.campaignId,
                    reviewDialog.delId,
                    "changes_requested",
                    reviewDialog.note,
                  )
                }
              >
                {reviewing === reviewDialog.delId ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Send Feedback"
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Submit to Brand Dialog */}
      <Dialog
        open={submitDialog.open}
        onOpenChange={(open) =>
          setSubmitDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent className="sm:max-w-[450px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-gradient-to-br from-primary via-primary/90 to-blue-600 p-8 text-white relative">
            <DialogHeader className="space-y-1 relative z-10">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4 border border-white/30">
                <ExternalLink className="w-6 h-6 text-white" />
              </div>
              <DialogTitle className="text-2xl font-bold font-syne text-white">
                Submit to Brand
              </DialogTitle>
              <p className="text-white/70 text-sm">
                Promote this approved deliverable to an active Brand Offer.
              </p>
            </DialogHeader>
          </div>

          <div className="p-8 space-y-6">
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                Select Brand Offer
              </label>
              <Select
                value={submitDialog.offerId}
                onValueChange={(val) =>
                  setSubmitDialog((prev) => ({ ...prev, offerId: val }))
                }
              >
                <SelectTrigger className="h-12 rounded-xl border-gray-100 bg-gray-50 focus:ring-primary/20 transition-all text-sm">
                  <SelectValue placeholder="Choose a campaign offer..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                  {brandOffers.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-400">
                      No active brand offers found.
                    </div>
                  ) : (
                    brandOffers.map((offer) => (
                      <SelectItem
                        key={offer.id}
                        value={offer.id}
                        className="rounded-lg my-1 focus:bg-primary/5"
                      >
                        <div className="flex flex-col py-0.5">
                          <span className="font-semibold text-gray-900">
                            {offer.offer_title || "Untitled Offer"}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            Brand: {offer.brands?.company_name || "Unknown"}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-xl border-gray-100 hover:bg-gray-50 font-semibold"
                onClick={() =>
                  setSubmitDialog((prev) => ({ ...prev, open: false }))
                }
              >
                Cancel
              </Button>
              <Button
                className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                disabled={!submitDialog.offerId || submitting}
                onClick={handleSubmitToBrand}
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Confirm Submission"
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
