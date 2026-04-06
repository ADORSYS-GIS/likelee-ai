import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Check,
  Search,
  Briefcase,
  RefreshCw,
  FileText,
  Upload,
  User,
  Eye,
  Download,
  Video,
  Trash2,
  X,
} from "lucide-react";
import {
  createOfferAssetRequest,
  createOfferTalentAssignment,
  getAgencyRoster,
  listMyCampaignOffers,
  listOfferAssetRequests,
  listOfferDeliverables,
  listOfferTalentAssignments,
  reviewOfferDeliverable,
  submitAllDraftDeliverables,
  uploadOfferAssetRequestFile,
  uploadOfferDeliverable,
} from "@/api/functions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useIndexedDbQuery } from "@/lib/useIndexedDbCache";

export function AgencyDeliverablesView() {
  const queryClient = useQueryClient();
  const [expandedOfferId, setExpandedOfferId] = useState<string>("");
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>("");
  const [assignmentsByOffer, setAssignmentsByOffer] = useState<
    Record<string, any[]>
  >({});
  const [deliverablesByOffer, setDeliverablesByOffer] = useState<
    Record<string, any[]>
  >({});
  const [loadingAssignments, setLoadingAssignments] = useState<
    Record<string, boolean>
  >({});
  const [loadingDeliverables, setLoadingDeliverables] = useState<
    Record<string, boolean>
  >({});
  const [authToken, setAuthToken] = useState<string>("");
  const [submittingDrafts, setSubmittingDrafts] = useState<
    Record<string, boolean>
  >({});
  const [assignDialog, setAssignDialog] = useState<{
    open: boolean;
    offerId: string;
  }>({ open: false, offerId: "" });
  const [assignSearch, setAssignSearch] = useState("");
  const [assignSelectedIds, setAssignSelectedIds] = useState<string[]>([]);
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignConfirmOpen, setAssignConfirmOpen] = useState(false);
  const [unassignDialog, setUnassignDialog] = useState<{
    open: boolean;
    offerId: string;
    assignmentId: string;
    creatorId: string;
    talentName: string;
    submitting: boolean;
    offerStatus: string;
  }>({
    open: false,
    offerId: "",
    assignmentId: "",
    creatorId: "",
    talentName: "",
    submitting: false,
    offerStatus: "",
  });
  const [requestDialog, setRequestDialog] = useState<{
    open: boolean;
    offerId: string;
    creatorId: string;
    title: string;
    message: string;
    file?: File | null;
    sending: boolean;
  }>({
    open: false,
    offerId: "",
    creatorId: "",
    title: "",
    message: "",
    file: null,
    sending: false,
  });
  const [uploadDialog, setUploadDialog] = useState<{
    open: boolean;
    offerId: string;
    creatorId: string;
    caption: string;
    files?: File[];
    assetRequestId?: string;
    sending: boolean;
  }>({
    open: false,
    offerId: "",
    creatorId: "",
    caption: "",
    files: [],
    assetRequestId: undefined,
    sending: false,
  });
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    offerId: string;
    deliverableId: string;
    action: "changes_requested" | "reject" | "final_approve";
    note: string;
    submitting: boolean;
  }>({
    open: false,
    offerId: "",
    deliverableId: "",
    action: "changes_requested",
    note: "",
    submitting: false,
  });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    offerId: string;
    deliverableId: string;
    submitting: boolean;
  }>({
    open: false,
    offerId: "",
    deliverableId: "",
    submitting: false,
  });
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryItems, setGalleryItems] = useState<
    { url: string; type: "image" | "video" | "file"; caption: string }[]
  >([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [notSignedDialog, setNotSignedDialog] = useState<{
    open: boolean;
    offerId: string;
  }>({ open: false, offerId: "" });
  const [unpaidSubmitDialog, setUnpaidSubmitDialog] = useState<{
    open: boolean;
    offerId: string;
    submitting: boolean;
  }>({ open: false, offerId: "", submitting: false });
  const { toast } = useToast();
  const confirmUnassign = async () => {
    if (unassignDialog.submitting) return;
    const offerId = String(unassignDialog.offerId || "").trim();
    const assignmentId = String(unassignDialog.assignmentId || "").trim();
    if (!offerId || !assignmentId) return;
    const status = String(unassignDialog.offerStatus || "")
      .trim()
      .toLowerCase();
    const locked =
      status === "contract_sent" || status === "contract_fully_signed";
    if (locked) {
      toast({
        title: "Assignments locked",
        description:
          status === "contract_fully_signed"
            ? "Contract is already signed and you can’t change assigned talents."
            : "You can’t change assigned talents after the contract is sent.",
        variant: "destructive",
      });
      setUnassignDialog((prev) => ({ ...prev, open: false }));
      return;
    }
    setUnassignDialog((prev) => ({ ...prev, submitting: true }));
    try {
      await base44.delete(
        `/api/campaign-offers/${encodeURIComponent(offerId)}/assignments/${encodeURIComponent(assignmentId)}`,
      );
      if (selectedCreatorId && selectedCreatorId === unassignDialog.creatorId) {
        setSelectedCreatorId("");
      }
      await loadAssignments(offerId);
      toast({
        title: "Talent unassigned",
        description: "Talent was removed from this offer.",
      });
      setUnassignDialog({
        open: false,
        offerId: "",
        assignmentId: "",
        creatorId: "",
        talentName: "",
        submitting: false,
        offerStatus: "",
      });
    } catch (err: any) {
      toast({
        title: "Unassign failed",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
      setUnassignDialog((prev) => ({ ...prev, submitting: false }));
    }
  };

  // IndexedDB-backed queries for offers and roster
  const offersQuery = useIndexedDbQuery<{ offers: any[] }>({
    queryKey: ["agency-campaign-offers-my", "deliverables"],
    queryFn: async () => {
      const resp = await listMyCampaignOffers();
      return { offers: (resp as any)?.offers || [] };
    },
    maxAge: 60 * 1000, // 1 minute
    syncInterval: 60 * 1000,
    staleWhileRevalidate: true,
  });

  const rosterQuery = useIndexedDbQuery<{ talents: any[] }>({
    queryKey: ["agency-roster", "deliverables"],
    queryFn: async () => {
      const resp = await getAgencyRoster();
      const talents = Array.isArray(resp)
        ? resp
        : Array.isArray((resp as any)?.talents)
          ? (resp as any).talents
          : Array.isArray((resp as any)?.data?.talents)
            ? (resp as any).data.talents
            : [];
      return { talents };
    },
    maxAge: 5 * 60 * 1000, // 5 minutes
    syncInterval: 60 * 1000,
    staleWhileRevalidate: true,
  });

  const offers = offersQuery.data?.offers ?? [];
  const roster = rosterQuery.data?.talents ?? [];
  const loadingOffers = offersQuery.isLoading && !offersQuery.data;
  const loadingRoster = rosterQuery.isLoading && !rosterQuery.data;

  const rosterOptions = useMemo(
    () => (Array.isArray(roster) ? roster : []),
    [roster],
  );
  const filteredRoster = useMemo(() => {
    const q = assignSearch.trim().toLowerCase();
    if (!q) return rosterOptions;
    return rosterOptions.filter((t: any) => {
      const name = String(
        t?.stage_name || t?.name || t?.full_legal_name || "",
      ).toLowerCase();
      const email = String(t?.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [assignSearch, rosterOptions]);
  const getRosterCreatorId = (t: any) =>
    String(t?.creator_id || t?.creatorId || t?.creator?.id || "").trim();
  const getTalentAvatar = (t: any) => {
    if (!t) return "";
    if (t.img) return t.img;
    if (t.profile_photo_url) return t.profile_photo_url;
    if (t.photo_url) return t.photo_url;
    if (Array.isArray(t.photo_urls) && t.photo_urls.length > 0) {
      return t.photo_urls[0];
    }
    return "";
  };
  const getTalentInitial = (t: any) => {
    const name = String(
      t?.stage_name || t?.name || t?.full_legal_name || t?.email || "",
    )
      .trim()
      .toUpperCase();
    return name ? name.slice(0, 1) : "T";
  };
  const deliverableIsImage = (deliverable: any) => {
    const type = String(deliverable?.asset_type || "").toLowerCase();
    if (type === "image" || type.startsWith("image/")) return true;
    const contentType = String(
      deliverable?.meta?.content_type || "",
    ).toLowerCase();
    if (contentType.startsWith("image/")) return true;
    const url = String(deliverable?.asset_url || "").toLowerCase();
    return /\.(png|jpg|jpeg|webp|gif|bmp|svg)(\?.*)?$/.test(url);
  };
  const deliverableIsVideo = (deliverable: any) => {
    const type = String(deliverable?.asset_type || "").toLowerCase();
    if (type === "video" || type.startsWith("video/")) return true;
    const contentType = String(
      deliverable?.meta?.content_type || "",
    ).toLowerCase();
    if (contentType.startsWith("video/")) return true;
    const url = String(deliverable?.asset_url || "").toLowerCase();
    return /\.(mp4|mov|webm|m4v)(\?.*)?$/.test(url);
  };
  const assignedTalentIds = useMemo(() => {
    const offerId = assignDialog.offerId;
    const rows = offerId ? assignmentsByOffer[offerId] || [] : [];
    return new Set(
      rows
        .map((a: any) => String(a?.creator_id || a?.talent_id || ""))
        .filter(Boolean),
    );
  }, [assignDialog.offerId, assignmentsByOffer]);

  const assignmentLockedForOffer = useMemo(() => {
    const offerId = assignDialog.offerId;
    if (!offerId) return false;
    const offer = (offers || []).find(
      (o: any) => String(o?.id || "") === offerId,
    );
    const status = String(offer?.status || "")
      .trim()
      .toLowerCase();
    return status === "contract_sent" || status === "contract_fully_signed";
  }, [assignDialog.offerId, offers]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setAuthToken(session?.access_token || "");
      })
      .catch(() => {
        setAuthToken("");
      });
  }, []);

  const loadAssignments = async (offerId: string) => {
    setLoadingAssignments((prev) => ({ ...prev, [offerId]: true }));
    try {
      const resp = await listOfferTalentAssignments(offerId);
      const rows = Array.isArray((resp as any)?.assignments)
        ? (resp as any).assignments
        : [];
      setAssignmentsByOffer((prev) => ({ ...prev, [offerId]: rows }));
    } catch {
      setAssignmentsByOffer((prev) => ({ ...prev, [offerId]: [] }));
    } finally {
      setLoadingAssignments((prev) => ({ ...prev, [offerId]: false }));
    }
  };

  const loadDeliverables = async (offerId: string) => {
    setLoadingDeliverables((prev) => ({ ...prev, [offerId]: true }));
    try {
      const resp = await listOfferDeliverables(offerId);
      const rows = Array.isArray((resp as any)?.deliverables)
        ? (resp as any).deliverables
        : [];
      setDeliverablesByOffer((prev) => ({ ...prev, [offerId]: rows }));

      // Cache deliverables to IndexedDB
      const { setCachedQuery } = await import("@/lib/indexedDb");
      await setCachedQuery(["offer-deliverables", offerId], rows, offerId);
    } catch {
      setDeliverablesByOffer((prev) => ({ ...prev, [offerId]: [] }));
    } finally {
      setLoadingDeliverables((prev) => ({ ...prev, [offerId]: false }));
    }
  };

  // Load deliverables from IndexedDB cache on offer expand
  const loadDeliverablesWithCache = async (offerId: string) => {
    // Try to load from cache first
    const { getCachedQuery } = await import("@/lib/indexedDb");
    const cached = await getCachedQuery<any[]>(
      ["offer-deliverables", offerId],
      offerId,
      60 * 1000,
    );

    if (cached) {
      setDeliverablesByOffer((prev) => ({ ...prev, [offerId]: cached }));
    }

    // Always fetch fresh data in background
    await loadDeliverables(offerId);
  };

  const deliverableStatusLabel = (statusRaw: unknown) => {
    const status = String(statusRaw || "submitted").toLowerCase();
    if (status === "draft") return "Draft";
    if (status === "brand_review") return "Sent to Brand";
    if (status === "brand_approved") return "Brand Approved";
    if (status === "submitted") return "New";
    return status.replace(/_/g, " ");
  };

  const offerStatusLabel = (statusRaw: unknown) => {
    const status = String(statusRaw || "")
      .toLowerCase()
      .trim();
    if (!status) return "";
    if (status === "contract_fully_signed") return "Contract Signed";
    if (status === "contract_sent") return "Contract Sent";
    if (status === "sent") return "Sent";
    if (status === "accepted") return "Accepted";
    if (status === "open") return "Open";
    return status.replace(/_/g, " ");
  };

  const offerStatusClass = (statusRaw: unknown) => {
    const status = String(statusRaw || "")
      .toLowerCase()
      .trim();
    if (!status) return "bg-gray-100 text-gray-700 border border-gray-200";
    if (status === "contract_fully_signed") {
      return "bg-emerald-100 text-emerald-800 border border-emerald-200";
    }
    if (status === "contract_sent") {
      return "bg-amber-100 text-amber-800 border border-amber-200";
    }
    if (status === "accepted") {
      return "bg-teal-100 text-teal-800 border border-teal-200";
    }
    if (status === "sent") {
      return "bg-sky-100 text-sky-800 border border-sky-200";
    }
    if (status === "open") {
      return "bg-indigo-100 text-indigo-800 border border-indigo-200";
    }
    return "bg-gray-100 text-gray-700 border border-gray-200";
  };

  const deliverableStatusClass = (statusRaw: unknown) => {
    const status = String(statusRaw || "submitted").toLowerCase();
    if (status === "draft") return "bg-slate-600 text-white";
    if (status === "brand_review") return "bg-amber-500 text-white";
    if (status === "brand_approved") return "bg-emerald-500 text-white";
    if (status === "approved") return "bg-emerald-500 text-white";
    if (status === "changes_requested") return "bg-rose-500 text-white";
    if (status === "rejected") return "bg-slate-700 text-white";
    return "bg-gradient-to-r from-blue-600 to-cyan-600 text-white";
  };

  const resolveDeliverableUrl = (
    deliverable: any,
    offerIdOverride?: string,
  ) => {
    const assetUrl = String(deliverable?.asset_url || "");
    if (!assetUrl) return "";
    if (assetUrl.startsWith("http")) return assetUrl;
    const offerId = String(
      deliverable?.offer_id || offerIdOverride || "",
    ).trim();
    const deliverableId = String(deliverable?.id || "").trim();
    if (offerId && deliverableId) {
      const proxyUrl = `/api/campaign-offers/${offerId}/deliverables/${deliverableId}/file`;
      return authToken ? `${proxyUrl}?token=${authToken}` : proxyUrl;
    }
    return assetUrl;
  };

  const buildGalleryItems = (rows: any[], offerId?: string) =>
    rows
      .map((deliverable) => {
        const url = resolveDeliverableUrl(deliverable, offerId);
        if (!url) return null;
        const caption =
          String(deliverable?.caption || "").trim() ||
          String(deliverable?.meta?.original_name || "").trim() ||
          "Deliverable";
        const type = deliverableIsImage(deliverable)
          ? "image"
          : deliverableIsVideo(deliverable)
            ? "video"
            : "file";
        return { url, type, caption };
      })
      .filter(Boolean) as {
      url: string;
      type: "image" | "video" | "file";
      caption: string;
    }[];

  const handleDownload = async (url: string, filename?: string) => {
    if (!url) return;
    const safeName = filename?.trim() || "deliverable";
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = safeName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      const fallback = document.createElement("a");
      fallback.href = url;
      fallback.download = safeName;
      document.body.appendChild(fallback);
      fallback.click();
      fallback.remove();
    }
  };

  const renderDeliverableCard = (
    deliverable: any,
    options?: {
      showActions?: boolean;
      offerId?: string;
      layout?: "creator" | "agency";
      galleryItems?: {
        url: string;
        type: "image" | "video" | "file";
        caption: string;
      }[];
      galleryIndex?: number;
    },
  ) => {
    const assetUrl = String(deliverable?.asset_url || "");
    const resolvedUrl = resolveDeliverableUrl(deliverable, options?.offerId);
    const caption =
      String(deliverable?.caption || "").trim() ||
      String(deliverable?.meta?.original_name || "").trim();
    const agencyFeedback = String(deliverable?.agency_review_note || "").trim();
    const brandFeedback = String(deliverable?.brand_review_note || "").trim();
    const statusValue = String(
      deliverable?.status || "submitted",
    ).toLowerCase();
    const isSentToBrand = statusValue === "brand_review";
    const isBrandApproved = statusValue === "brand_approved";
    const isFinalized =
      statusValue === "approved" ||
      statusValue === "rejected" ||
      statusValue === "changes_requested";
    const isDraft = statusValue === "draft";
    const canDelete =
      options?.layout === "agency" &&
      (statusValue === "draft" || statusValue === "changes_requested");
    return (
      <Card
        key={String(deliverable?.id || deliverable?.asset_url || "deliverable")}
        className="group relative overflow-hidden bg-white border-gray-200 rounded-2xl transition-all hover:shadow-xl hover:-translate-y-1 cursor-zoom-in"
        onClick={() => {
          if (!resolvedUrl || !options?.galleryItems?.length) return;
          setGalleryItems(options.galleryItems);
          setGalleryIndex(options.galleryIndex || 0);
          setGalleryOpen(true);
        }}
      >
        <div className="aspect-[4/5] bg-gray-100 relative overflow-hidden">
          {assetUrl && deliverableIsImage(deliverable) ? (
            <img
              src={resolvedUrl}
              alt={caption || "Deliverable"}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : assetUrl && deliverableIsVideo(deliverable) ? (
            <video
              src={resolvedUrl}
              className="w-full h-full object-cover bg-black"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-900">
              <Video className="w-12 h-12 text-white/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          {assetUrl && (
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <button
                type="button"
                className="h-8 w-8 rounded-full bg-white/90 text-gray-900 flex items-center justify-center shadow-sm hover:bg-white"
                onClick={(event) => {
                  event.stopPropagation();
                  void handleDownload(resolvedUrl, caption || "deliverable");
                }}
              >
                <Download className="w-4 h-4" />
              </button>
              {canDelete && (
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100"
                  onClick={(event) => {
                    event.stopPropagation();
                    setDeleteDialog({
                      open: true,
                      offerId: options?.offerId || "",
                      deliverableId: String(deliverable?.id || ""),
                      submitting: false,
                    });
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
            <Badge
              className={`rounded-full border-0 ${deliverableStatusClass(deliverable?.status)}`}
            >
              {deliverableStatusLabel(deliverable?.status)}
            </Badge>
            {(agencyFeedback || brandFeedback) && (
              <Badge className="rounded-full border-0 bg-amber-500 text-white">
                Feedback
              </Badge>
            )}
          </div>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-gray-700 font-medium leading-relaxed line-clamp-2">
            {caption || (
              <span className="text-gray-300 italic">No caption</span>
            )}
          </p>

          {agencyFeedback && (
            <div className="p-2 bg-amber-50 border border-amber-100 text-[10px] text-amber-800 rounded-xl">
              <strong>Your Feedback:</strong> {agencyFeedback}
            </div>
          )}
          {brandFeedback && (
            <div className="p-2 bg-blue-50 border border-blue-100 text-[10px] text-blue-800 rounded-xl">
              <strong>Brand Feedback:</strong> {brandFeedback}
            </div>
          )}

          {options?.showActions && options?.offerId && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              {isBrandApproved && (
                <Button
                  size="sm"
                  className="h-9 rounded-full font-semibold bg-emerald-500 hover:bg-emerald-600 text-white col-span-2"
                  onClick={(event) => {
                    event.stopPropagation();
                    setReviewDialog({
                      open: true,
                      offerId: options.offerId || "",
                      deliverableId: String(deliverable?.id || ""),
                      action: "final_approve",
                      note: "",
                      submitting: false,
                    });
                  }}
                  disabled={isFinalized}
                >
                  Approve
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className={`h-9 rounded-full font-semibold border-blue-400/70 text-blue-700 hover:bg-blue-50 ${isBrandApproved ? "col-span-1" : "col-span-2"}`}
                onClick={(event) => {
                  event.stopPropagation();
                  setReviewDialog({
                    open: true,
                    offerId: options.offerId || "",
                    deliverableId: String(deliverable?.id || ""),
                    action: "changes_requested",
                    note: "",
                    submitting: false,
                  });
                }}
                disabled={isFinalized}
              >
                Revise
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="col-span-2 h-8 rounded-full font-semibold text-rose-600 hover:bg-rose-50"
                onClick={(event) => {
                  event.stopPropagation();
                  setReviewDialog({
                    open: true,
                    offerId: options.offerId || "",
                    deliverableId: String(deliverable?.id || ""),
                    action: "reject",
                    note: "",
                    submitting: false,
                  });
                }}
                disabled={isFinalized}
              >
                Reject
              </Button>
            </div>
          )}

          {options?.layout === "agency" && options?.offerId && isDraft && null}
        </div>
      </Card>
    );
  };

  const openOffer = async (offerId: string) => {
    const next = offerId === expandedOfferId ? "" : offerId;
    setExpandedOfferId(next);
    setSelectedCreatorId("");
    if (next) {
      await Promise.all([
        loadAssignments(next),
        loadDeliverablesWithCache(next),
      ]);
    }
  };

  const handleAssignTalents = async () => {
    if (!assignDialog.offerId || assignSelectedIds.length === 0) return;
    if (assignSubmitting) return;
    if (assignmentLockedForOffer) {
      toast({
        title: "Assignments locked",
        description:
          "You can change assigned talents before the contract is sent. This offer is already sent, so assignments can’t be changed.",
        variant: "destructive",
      });
      return;
    }
    setAssignSubmitting(true);
    try {
      await Promise.all(
        assignSelectedIds.map((creatorId) =>
          createOfferTalentAssignment(assignDialog.offerId, {
            creator_id: creatorId,
          }),
        ),
      );
      await loadAssignments(assignDialog.offerId);
      setAssignDialog({ open: false, offerId: "" });
      setAssignSelectedIds([]);
      setAssignSearch("");
      toast({ title: "Talent assigned" });
    } catch (e: any) {
      const msg = String(e?.message || "");
      toast({
        title: "Assignment failed",
        description: msg.includes(
          "cannot_change_assignments_after_contract_sent",
        )
          ? "You can’t change assigned talents after the contract is sent."
          : msg || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setAssignSubmitting(false);
    }
  };

  const handleRequestAsset = async () => {
    if (!requestDialog.offerId || !requestDialog.creatorId) return;
    setRequestDialog((prev) => ({ ...prev, sending: true }));
    try {
      let fileUrl: string | undefined;
      if (requestDialog.file) {
        const uploadResp = await uploadOfferAssetRequestFile(
          requestDialog.offerId,
          requestDialog.file,
        );
        fileUrl = (uploadResp as any)?.file_url;
      }
      await createOfferAssetRequest(requestDialog.offerId, {
        creator_id: requestDialog.creatorId,
        title: requestDialog.title || undefined,
        message: requestDialog.message || undefined,
        file_url: fileUrl,
      });
      setRequestDialog({
        open: false,
        offerId: "",
        creatorId: "",
        title: "",
        message: "",
        file: null,
        sending: false,
      });
      toast({ title: "Asset request sent" });
      await listOfferAssetRequests(requestDialog.offerId);
    } catch (e: any) {
      toast({
        title: "Request failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
      setRequestDialog((prev) => ({ ...prev, sending: false }));
    }
  };

  const handleUploadDeliverable = async () => {
    if (
      !uploadDialog.offerId ||
      !uploadDialog.creatorId ||
      !uploadDialog.files ||
      uploadDialog.files.length === 0
    )
      return;
    setUploadDialog((prev) => ({ ...prev, sending: true }));
    try {
      await Promise.all(
        uploadDialog.files.map((file) =>
          uploadOfferDeliverable(uploadDialog.offerId, {
            file,
            caption: uploadDialog.caption || undefined,
            creator_id: uploadDialog.creatorId,
            asset_request_id: uploadDialog.assetRequestId,
            status: "draft",
          }),
        ),
      );
      await loadDeliverables(uploadDialog.offerId);
      setUploadDialog({
        open: false,
        offerId: "",
        creatorId: "",
        caption: "",
        files: [],
        assetRequestId: undefined,
        sending: false,
      });
      toast({ title: "Deliverables uploaded" });
    } catch (e: any) {
      toast({
        title: "Upload failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
      setUploadDialog((prev) => ({ ...prev, sending: false }));
    }
  };

  const handleSubmitDrafts = async (offerId: string) => {
    if (!offerId) return;

    const offer = offers.find((o: any) => String(o?.id || "") === offerId);
    const status = String(offer?.status || "")
      .trim()
      .toLowerCase();
    const isSigned = [
      "contract_fully_signed",
      "signed",
      "in_execution",
      "deliverables_submitted",
      "in_review",
      "changes_requested",
      "approved",
      "completed",
    ].includes(status);
    if (!isSigned) {
      setNotSignedDialog({ open: true, offerId });
      return;
    }

    const isPaid =
      String(offer?.payment_status || "")
        .trim()
        .toLowerCase() === "paid";
    if (!isPaid) {
      setUnpaidSubmitDialog({ open: true, offerId, submitting: false });
      return;
    }

    setSubmittingDrafts((prev) => ({ ...prev, [offerId]: true }));
    try {
      await submitAllDraftDeliverables(offerId);
      await loadDeliverables(offerId);
      toast({ title: "Submitted to brand" });
    } catch (e: any) {
      toast({
        title: "Submit failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmittingDrafts((prev) => ({ ...prev, [offerId]: false }));
    }
  };

  const handleReviewDeliverable = async () => {
    if (!reviewDialog.offerId || !reviewDialog.deliverableId) return;
    if (reviewDialog.submitting) return;
    setReviewDialog((prev) => ({ ...prev, submitting: true }));
    try {
      await reviewOfferDeliverable(
        reviewDialog.offerId,
        reviewDialog.deliverableId,
        {
          action: reviewDialog.action,
          note: reviewDialog.note || undefined,
        },
      );
      await loadDeliverables(reviewDialog.offerId);
      setReviewDialog({
        open: false,
        offerId: "",
        deliverableId: "",
        action: "changes_requested",
        note: "",
        submitting: false,
      });
      toast({ title: "Review submitted" });
    } catch (e: any) {
      toast({
        title: "Review failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
      setReviewDialog((prev) => ({ ...prev, submitting: false }));
    }
  };

  const handleDeleteDeliverable = async () => {
    if (!deleteDialog.offerId || !deleteDialog.deliverableId) return;
    if (deleteDialog.submitting) return;
    setDeleteDialog((prev) => ({ ...prev, submitting: true }));
    try {
      await base44.delete(
        `/api/campaign-offers/${deleteDialog.offerId}/deliverables/${deleteDialog.deliverableId}`,
      );
      await loadDeliverables(deleteDialog.offerId);
      setDeleteDialog({
        open: false,
        offerId: "",
        deliverableId: "",
        submitting: false,
      });
      toast({ title: "Deliverable deleted" });
    } catch (e: any) {
      toast({
        title: "Delete failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
      setDeleteDialog((prev) => ({ ...prev, submitting: false }));
    }
  };

  if (loadingOffers) {
    return (
      <Card className="p-8 flex items-center gap-2 text-sm text-gray-600">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading offers...
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-900 to-gray-800 p-6 text-white shadow-xl">
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">
              Offer Deliverables
            </h2>
            <p className="mt-2 text-gray-400 text-sm">
              Assign talents, request assets, and review deliverables for brand
              offers.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-purple-300/50 text-white bg-white/10 hover:bg-white/20"
            onClick={() => {
              setExpandedOfferId("");
              setSelectedCreatorId("");
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Collapse All
          </Button>
        </div>
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      {offers.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 bg-white/50 rounded-2xl">
          <p className="text-gray-500 text-sm">No brand offers available.</p>
        </Card>
      ) : (
        offers.map((offer, idx) => {
          const offerId = String(offer?.id || "");
          const expanded = expandedOfferId === offerId;
          const assignments = assignmentsByOffer[offerId] || [];
          const deliverables = deliverablesByOffer[offerId] || [];
          const selectedAssignment = selectedCreatorId
            ? assignments.find(
                (a: any) => String(a?.creator_id || "") === selectedCreatorId,
              ) ||
              assignments.find(
                (a: any) => String(a?.talent_id || "") === selectedCreatorId,
              )
            : null;
          const selectedLegacyTalentId = String(
            selectedAssignment?.talent_id || "",
          ).trim();
          const deliverableMatchesSelection = (d: any) => {
            if (!selectedCreatorId) return false;
            const deliverableCreatorId = String(d?.creator_id || "").trim();
            const deliverableTalentId = String(d?.talent_id || "").trim();
            if (deliverableCreatorId) {
              return deliverableCreatorId === selectedCreatorId;
            }
            if (selectedLegacyTalentId) {
              return deliverableTalentId === selectedLegacyTalentId;
            }
            return false;
          };
          const creatorDeliverables = deliverables.filter(
            (d: any) =>
              deliverableMatchesSelection(d) &&
              String(d?.submitted_by_role || "") !== "agency",
          );
          const agencyDeliverables = deliverables.filter(
            (d: any) =>
              deliverableMatchesSelection(d) &&
              String(d?.submitted_by_role || "") === "agency",
          );
          const hasDraftAgencyDeliverables = agencyDeliverables.some(
            (d: any) => String(d?.status || "").toLowerCase() === "draft",
          );
          const isOfferPaid =
            String(offer?.payment_status || "").toLowerCase() === "paid";
          const isOfferSigned = (() => {
            const st = String(offer?.status || "")
              .trim()
              .toLowerCase();
            return [
              "contract_fully_signed",
              "signed",
              "in_execution",
              "deliverables_submitted",
              "in_review",
              "changes_requested",
              "approved",
              "completed",
            ].includes(st);
          })();
          const offerAssignmentsLocked = (() => {
            const status = String(offer?.status || "")
              .trim()
              .toLowerCase();
            return (
              status === "contract_sent" || status === "contract_fully_signed"
            );
          })();
          return (
            <motion.div
              key={offerId}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
            >
              <Card
                className={`overflow-hidden border-gray-200 shadow-sm hover:shadow-md ${expanded ? "ring-2 ring-primary/10" : ""}`}
              >
                <div
                  className={`p-5 flex items-center justify-between cursor-pointer transition-colors ${expanded ? "bg-primary/5" : "bg-white hover:bg-gray-50"}`}
                  onClick={() => openOffer(offerId)}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-3 rounded-xl ${expanded ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}`}
                    >
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {offer?.offer_title ||
                          offer?.brand_campaigns?.name ||
                          "Offer"}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">
                          {offer?.brands?.company_name || "Brand"}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                        <Badge
                          className={`text-[10px] py-0 ${offerStatusClass(offer?.status)}`}
                        >
                          {offerStatusLabel(offer?.status) ||
                            String(offer?.status || "")}
                        </Badge>
                        <Badge
                          className={`text-[10px] py-0 ${isOfferSigned ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}
                        >
                          {isOfferSigned ? "Signed" : "Not signed"}
                        </Badge>
                        {isOfferSigned ? (
                          <Badge
                            className={`text-[10px] py-0 ${isOfferPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                          >
                            {isOfferPaid ? "Paid" : "Awaiting Payment"}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-blue-400/70 text-blue-700 hover:bg-blue-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        openOffer(offerId);
                      }}
                    >
                      {expanded ? "Hide" : "Open"}
                    </Button>
                    <Button
                      size="sm"
                      className="border-0 bg-gradient-to-r from-gray-900 to-slate-800 text-white hover:from-gray-800 hover:to-slate-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (offerAssignmentsLocked) {
                          toast({
                            title: "Assignments locked",
                            description:
                              "You can change assigned talents before the contract is sent. This offer is already sent, so assignments can’t be changed.",
                            variant: "destructive",
                          });
                          return;
                        }
                        setAssignDialog({ open: true, offerId });
                      }}
                      disabled={offerAssignmentsLocked}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {assignments.length === 0
                        ? "Assign Talent"
                        : "Add Talent"}
                    </Button>
                  </div>
                </div>

                {/* Payment gate banner for signed but unpaid offers */}
                {offer?.status === "contract_fully_signed" && !isOfferPaid && (
                  <div className="mx-5 mb-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    <span className="text-amber-700 text-xs font-semibold">
                      ⏳ Brand payment is still pending. You can upload and
                      submit deliverables now, but you’ll need to confirm the
                      unpaid status before submitting.
                    </span>
                  </div>
                )}

                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden border-t border-gray-100"
                    >
                      <div className="p-4 space-y-4 bg-gray-50/50">
                        {loadingAssignments[offerId] ? (
                          <p className="text-xs text-gray-500">
                            Loading assignments...
                          </p>
                        ) : assignments.length === 0 ? (
                          <p className="text-xs text-gray-500">
                            No talents assigned yet.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {assignments.map((assignment: any) => {
                              const talent =
                                assignment?.creators ||
                                assignment?.agency_users ||
                                {};
                              const creatorId = String(
                                assignment?.creator_id ||
                                  assignment?.talent_id ||
                                  "",
                              ).trim();
                              return (
                                <div
                                  key={assignment.id}
                                  className={`border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between ${
                                    selectedCreatorId === creatorId
                                      ? "bg-white"
                                      : "bg-white"
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <Avatar className="w-9 h-9">
                                      <AvatarImage
                                        src={getTalentAvatar(talent)}
                                      />
                                      <AvatarFallback className="bg-indigo-50 text-indigo-600 font-bold text-xs uppercase">
                                        {getTalentInitial(talent)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="text-sm font-semibold text-gray-900">
                                        {talent?.stage_name ||
                                          talent?.full_name ||
                                          talent?.full_legal_name ||
                                          "Talent"}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        Assigned
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {!offerAssignmentsLocked ? (
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        className="h-8 w-8 border-red-200 text-red-600 hover:bg-red-50"
                                        title="Unassign talent"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (!assignment?.id) return;
                                          const name = String(
                                            talent?.stage_name ||
                                              talent?.full_name ||
                                              talent?.full_legal_name ||
                                              "Talent",
                                          );
                                          setUnassignDialog({
                                            open: true,
                                            offerId,
                                            assignmentId: String(assignment.id),
                                            creatorId,
                                            talentName: name,
                                            submitting: false,
                                            offerStatus: String(
                                              offer?.status || "",
                                            ),
                                          });
                                        }}
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    ) : null}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-blue-400/70 text-blue-700 hover:bg-blue-50"
                                      onClick={() => {
                                        if (!creatorId) return;
                                        setSelectedCreatorId(
                                          selectedCreatorId === creatorId
                                            ? ""
                                            : creatorId,
                                        );
                                      }}
                                    >
                                      {selectedCreatorId === creatorId ? (
                                        <ChevronDown className="w-4 h-4" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4" />
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-blue-400/70 text-blue-700 hover:bg-blue-50"
                                      onClick={() =>
                                        setRequestDialog({
                                          open: true,
                                          offerId,
                                          creatorId: String(
                                            assignment?.creator_id || "",
                                          ).trim(),
                                          title: "",
                                          message: "",
                                          file: null,
                                          sending: false,
                                        })
                                      }
                                    >
                                      Request Asset
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {selectedCreatorId && selectedAssignment && (
                          <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-white">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-gray-900">
                                  Deliverables
                                </p>
                                <p className="text-xs text-gray-500">
                                  {selectedAssignment?.creators?.full_name ||
                                    selectedAssignment?.agency_users
                                      ?.stage_name ||
                                    selectedAssignment?.agency_users
                                      ?.full_legal_name ||
                                    "Talent"}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-blue-400/70 text-blue-700 hover:bg-blue-50"
                                  disabled={
                                    !hasDraftAgencyDeliverables ||
                                    submittingDrafts[offerId]
                                  }
                                  onClick={() => handleSubmitDrafts(offerId)}
                                >
                                  {submittingDrafts[offerId] ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                  ) : null}
                                  Submit to Brand
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    setUploadDialog({
                                      open: true,
                                      offerId,
                                      creatorId: selectedCreatorId,
                                      caption: "",
                                      files: [],
                                      assetRequestId: undefined,
                                      sending: false,
                                    })
                                  }
                                >
                                  <Upload className="w-4 h-4 mr-2" /> Upload
                                </Button>
                              </div>
                            </div>

                            {loadingDeliverables[offerId] ? (
                              <p className="text-xs text-gray-500">
                                Loading deliverables...
                              </p>
                            ) : (
                              <div className="space-y-6">
                                <div className="border border-gray-200 rounded-2xl p-4 bg-white">
                                  <p className="text-sm font-semibold text-gray-900 mb-3">
                                    Creator uploads
                                  </p>
                                  {creatorDeliverables.length === 0 ? (
                                    <p className="text-xs text-gray-400">
                                      None yet.
                                    </p>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                                      {creatorDeliverables.map(
                                        (d: any, idx: number) =>
                                          renderDeliverableCard(d, {
                                            showActions: true,
                                            offerId,
                                            galleryItems: buildGalleryItems(
                                              creatorDeliverables,
                                              offerId,
                                            ),
                                            galleryIndex: idx,
                                          }),
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="border border-gray-200 rounded-2xl p-4 bg-white">
                                  <p className="text-sm font-semibold text-gray-900 mb-3">
                                    Agency uploads
                                  </p>
                                  {agencyDeliverables.length === 0 ? (
                                    <p className="text-xs text-gray-400">
                                      None yet.
                                    </p>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                                      {agencyDeliverables.map(
                                        (d: any, idx: number) =>
                                          renderDeliverableCard(d, {
                                            offerId,
                                            layout: "agency",
                                            galleryItems: buildGalleryItems(
                                              agencyDeliverables,
                                              offerId,
                                            ),
                                            galleryIndex: idx,
                                          }),
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
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

      <Dialog
        open={assignDialog.open}
        onOpenChange={(open) => {
          setAssignDialog((prev) => ({ ...prev, open }));
          if (!open) {
            setAssignSearch("");
            setAssignSelectedIds([]);
          }
        }}
      >
        <DialogContent className="max-w-[96vw] sm:max-w-2xl rounded-2xl sm:rounded-[3rem] p-4 sm:p-10 border-none bg-white/95 backdrop-blur-xl shadow-2xl">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-2xl font-black text-gray-900 tracking-tight">
              Assign Talent
            </DialogTitle>
            <p className="text-sm text-gray-500 font-medium mt-1">
              Select one or more talents from your roster to assign to this
              offer.
            </p>
          </DialogHeader>

          <Alert className="mb-6 bg-blue-50 border-blue-200 rounded-xl">
            <AlertDescription className="text-sm text-blue-900 font-medium">
              You can change assigned talents any time before the contract is
              sent. Once you send the contract, assignments are locked.
            </AlertDescription>
          </Alert>

          {assignmentLockedForOffer ? (
            <Alert className="mb-6 bg-amber-50 border-amber-200 rounded-xl">
              <AlertDescription className="text-sm text-amber-900 font-semibold">
                This offer’s contract has already been sent. Talent assignments
                are locked.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Filter by name or email..."
              value={assignSearch}
              onChange={(e) => setAssignSearch(e.target.value)}
              className="h-12 pl-10 bg-gray-100 border-none rounded-xl"
            />
          </div>

          <ScrollArea className="h-[450px] pr-2 sm:pr-4">
            {loadingRoster ? (
              <div className="h-[420px] flex flex-col items-center justify-center text-center">
                <Loader2 className="w-10 h-10 animate-spin text-gray-300 mb-4" />
                <p className="text-sm font-bold text-gray-500">
                  Loading talents…
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Fetching your agency roster.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredRoster.map((talent: any) => {
                  const creatorId = getRosterCreatorId(talent);
                  const canAssign = Boolean(creatorId);
                  const alreadyAssigned = creatorId
                    ? assignedTalentIds.has(creatorId)
                    : false;
                  const isSelected = creatorId
                    ? assignSelectedIds.includes(creatorId)
                    : false;
                  return (
                    <Card
                      key={
                        creatorId ||
                        String(
                          talent?.id ||
                            talent?.talent_id ||
                            talent?.email ||
                            "",
                        )
                      }
                      onClick={() => {
                        if (assignmentLockedForOffer) return;
                        if (!canAssign) {
                          toast({
                            title: "Talent not ready",
                            description:
                              "This talent needs a creator account before they can be assigned to a contract. Ask them to accept the invite and finish onboarding.",
                            variant: "destructive",
                          });
                          return;
                        }
                        if (alreadyAssigned) return;
                        setAssignSelectedIds((prev) =>
                          prev.includes(creatorId)
                            ? prev.filter((x) => x !== creatorId)
                            : [...prev, creatorId],
                        );
                      }}
                      className={`p-5 rounded-[2rem] border-2 transition-all duration-500 flex items-center gap-5 ${
                        alreadyAssigned
                          ? "border-gray-100 bg-gray-50/80 opacity-70 cursor-not-allowed"
                          : assignmentLockedForOffer
                            ? "border-gray-100 bg-gray-50/80 opacity-70 cursor-not-allowed"
                            : "cursor-pointer"
                      } ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/30 shadow-lg shadow-indigo-100/20"
                          : "border-gray-50 hover:border-gray-100 bg-white"
                      }`}
                    >
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0 shadow-inner">
                        <Avatar className="w-16 h-16 rounded-2xl">
                          <AvatarImage src={getTalentAvatar(talent)} />
                          <AvatarFallback className="bg-indigo-50 text-indigo-600 font-black text-lg uppercase">
                            {getTalentInitial(talent)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h6 className="font-black text-gray-900 truncate tracking-tight text-base">
                          {talent?.stage_name ||
                            talent?.name ||
                            talent?.full_name ||
                            talent?.full_legal_name ||
                            "Talent"}
                        </h6>
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          {alreadyAssigned && (
                            <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] uppercase tracking-widest font-black px-2 py-0.5">
                              Assigned
                            </Badge>
                          )}
                          <Badge
                            className={`text-[10px] uppercase tracking-widest font-black px-2 py-0.5 ${
                              talent?.has_creator_account
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {talent?.has_creator_account
                              ? "Dashboard Access"
                              : "No Dashboard Access"}
                          </Badge>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="bg-indigo-600 rounded-full p-1 shadow-md shadow-indigo-200">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <Button
            onClick={() => setAssignConfirmOpen(true)}
            disabled={
              assignmentLockedForOffer ||
              assignSelectedIds.length === 0 ||
              assignSubmitting
            }
            className="w-full mt-8 border-0 bg-gradient-to-r from-gray-900 to-slate-800 hover:from-gray-800 hover:to-slate-700 text-white rounded-lg h-12 font-bold tracking-wider text-sm shadow-md"
          >
            {assignSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin mr-3" />
            ) : null}
            Confirm Selection ({assignSelectedIds.length})
          </Button>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={notSignedDialog.open}
        onOpenChange={(open) => {
          setNotSignedDialog((prev) => ({ ...prev, open }));
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Offer not signed yet</AlertDialogTitle>
            <AlertDialogDescription>
              The offer must be fully signed before you can submit deliverables.
              Once signed, you can submit even if payment is still pending (with
              confirmation).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setNotSignedDialog({ open: false, offerId: "" })}
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={unpaidSubmitDialog.open}
        onOpenChange={(open) => {
          if (unpaidSubmitDialog.submitting) return;
          setUnpaidSubmitDialog((prev) => ({ ...prev, open }));
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Submit deliverables before payment?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The brand has not paid for this offer yet. You can still submit
              deliverables now, but payment is required before escrow release.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unpaidSubmitDialog.submitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={unpaidSubmitDialog.submitting}
              onClick={async () => {
                const offerId = unpaidSubmitDialog.offerId;
                if (!offerId) return;

                const offer = offers.find(
                  (o: any) => String(o?.id || "") === offerId,
                );
                const status = String(offer?.status || "")
                  .trim()
                  .toLowerCase();
                const isSigned = [
                  "contract_fully_signed",
                  "signed",
                  "in_execution",
                  "deliverables_submitted",
                  "in_review",
                  "changes_requested",
                  "approved",
                  "completed",
                ].includes(status);
                if (!isSigned) {
                  setUnpaidSubmitDialog((prev) => ({
                    ...prev,
                    open: false,
                    offerId: "",
                    submitting: false,
                  }));
                  setNotSignedDialog({ open: true, offerId });
                  return;
                }

                setUnpaidSubmitDialog((prev) => ({
                  ...prev,
                  submitting: true,
                }));
                try {
                  await submitAllDraftDeliverables(offerId, {
                    confirm_unpaid: true,
                  });
                  await loadDeliverables(offerId);
                  toast({ title: "Submitted to brand" });
                  setUnpaidSubmitDialog({
                    open: false,
                    offerId: "",
                    submitting: false,
                  });
                } catch (e: any) {
                  toast({
                    title: "Submit failed",
                    description: e?.message || "Please try again.",
                    variant: "destructive",
                  });
                  setUnpaidSubmitDialog((prev) => ({
                    ...prev,
                    submitting: false,
                  }));
                }
              }}
            >
              Submit anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={assignConfirmOpen}
        onOpenChange={(open) => {
          if (assignSubmitting) return;
          setAssignConfirmOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm talent assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              You can update assigned talents before the contract is sent. After
              you send the contract, assignments are locked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={assignSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={assignSubmitting}
              onClick={async () => {
                await handleAssignTalents();
                setAssignConfirmOpen(false);
              }}
            >
              Confirm assignment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={unassignDialog.open}
        onOpenChange={(open) => {
          if (unassignDialog.submitting) return;
          setUnassignDialog((prev) => ({ ...prev, open }));
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unassign talent?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{unassignDialog.talentName}</strong> from this
              offer. You can change assigned talents before the contract is
              sent. After you send the contract, assignments are locked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unassignDialog.submitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={unassignDialog.submitting}
              onClick={confirmUnassign}
            >
              {unassignDialog.submitting ? "Unassigning..." : "Unassign"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={requestDialog.open}
        onOpenChange={(open) => setRequestDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-[560px] rounded-none p-0 overflow-hidden border border-gray-200 shadow-2xl flex flex-col max-h-[85vh]">
          {(() => {
            const assigned = assignmentsByOffer[requestDialog.offerId] || [];
            const assignment = assigned.find(
              (a: any) =>
                String(a?.creator_id || "").trim() ===
                String(requestDialog.creatorId || "").trim(),
            );
            const requestTalent =
              assignment?.creators ||
              assignment?.agency_users ||
              rosterOptions.find(
                (t: any) =>
                  getRosterCreatorId(t) ===
                  String(requestDialog.creatorId || "").trim(),
              ) ||
              null;
            return (
              <>
                <div className="bg-gray-900 p-8 text-white relative">
                  <DialogHeader className="space-y-2 relative z-10">
                    <div className="w-12 h-12 bg-white/10 rounded-none flex items-center justify-center mb-4 border border-white/20">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <DialogTitle className="text-2xl font-bold text-white">
                      Request Asset
                    </DialogTitle>
                    <p className="text-gray-400 text-sm">
                      Send a clear brief and optional PDF to guide the talent.
                    </p>
                  </DialogHeader>
                </div>
                <div className="p-8 space-y-6 bg-white flex-1 overflow-y-auto">
                  {requestTalent && (
                    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={getTalentAvatar(requestTalent)} />
                        <AvatarFallback className="bg-indigo-50 text-indigo-600 font-bold text-xs uppercase">
                          {getTalentInitial(requestTalent)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {requestTalent?.stage_name ||
                            requestTalent?.full_name ||
                            requestTalent?.name ||
                            requestTalent?.full_legal_name ||
                            "Talent"}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {requestTalent?.email || "Selected talent"}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      Title
                    </label>
                    <Input
                      placeholder="Short title (e.g., Product shots for May)"
                      value={requestDialog.title}
                      onChange={(e) =>
                        setRequestDialog((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      className="rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      Details
                    </label>
                    <Textarea
                      placeholder="Describe exactly what you need, delivery format, and deadline."
                      value={requestDialog.message}
                      onChange={(e) =>
                        setRequestDialog((prev) => ({
                          ...prev,
                          message: e.target.value,
                        }))
                      }
                      className="min-h-[140px] resize-none rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:ring-black/5 transition-all text-sm leading-relaxed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      Brief PDF (optional)
                    </label>
                    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                      <input
                        id="request-asset-file"
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) =>
                          setRequestDialog((prev) => ({
                            ...prev,
                            file: e.target.files?.[0] || null,
                          }))
                        }
                      />
                      <label
                        htmlFor="request-asset-file"
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        Choose File
                      </label>
                      <span className="text-xs text-gray-500 truncate">
                        {requestDialog.file?.name || "No file selected"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-white border-t border-gray-200 px-8 py-4">
                  <Button
                    onClick={handleRequestAsset}
                    disabled={requestDialog.sending}
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                  >
                    {requestDialog.sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Send Request"
                    )}
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog
        open={uploadDialog.open}
        onOpenChange={(open) => setUploadDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-[520px] w-full rounded-lg p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle>Upload Deliverable</DialogTitle>
            <p className="text-xs text-gray-500">
              Add a caption and upload one or more files.
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Caption"
              value={uploadDialog.caption}
              onChange={(e) =>
                setUploadDialog((prev) => ({
                  ...prev,
                  caption: e.target.value,
                }))
              }
              className="rounded-lg"
            />
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <input
                id="upload-deliverable-files"
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={(e) =>
                  setUploadDialog((prev) => ({
                    ...prev,
                    files: Array.from(e.target.files || []),
                  }))
                }
              />
              <label
                htmlFor="upload-deliverable-files"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                Choose Files
              </label>
              <span className="text-xs text-gray-500 truncate">
                {uploadDialog.files?.length
                  ? `${uploadDialog.files.length} file(s) selected`
                  : "No files selected"}
              </span>
            </div>
            <Button
              onClick={handleUploadDeliverable}
              disabled={
                uploadDialog.sending ||
                !uploadDialog.files ||
                uploadDialog.files.length === 0
              }
              className="rounded-lg h-11"
            >
              {uploadDialog.sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>Upload</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={reviewDialog.open}
        onOpenChange={(open) => setReviewDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-[500px] rounded-none p-0 overflow-hidden border border-gray-200 shadow-2xl">
          <div className="bg-gray-900 p-8 text-white relative">
            <DialogHeader className="space-y-1 relative z-10">
              <div className="w-12 h-12 bg-white/10 rounded-none flex items-center justify-center mb-4 border border-white/20">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <DialogTitle className="text-2xl font-bold text-white">
                {reviewDialog.action === "final_approve"
                  ? "Approve Deliverable"
                  : reviewDialog.action === "reject"
                    ? "Reject Deliverable"
                    : "Request Changes"}
              </DialogTitle>
              <p className="text-gray-400 text-sm">
                {reviewDialog.action === "final_approve"
                  ? "Mark this deliverable as approved after brand sign-off."
                  : reviewDialog.action === "reject"
                    ? "Reject this deliverable and notify the creator."
                    : "Request revisions from the creator."}
              </p>
            </DialogHeader>
          </div>

          <div className="p-8 space-y-6 bg-white">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                {reviewDialog.action === "final_approve"
                  ? "Optional note for the creator."
                  : "Feedback for creator"}
              </label>
              <Textarea
                placeholder={
                  reviewDialog.action === "final_approve"
                    ? "Optional note for the creator."
                    : "What exactly should be changed?"
                }
                className="min-h-[150px] resize-none rounded-none border-gray-200 bg-gray-50 focus:bg-white focus:ring-black/5 transition-all text-sm leading-relaxed"
                value={reviewDialog.note}
                onChange={(e) =>
                  setReviewDialog((prev) => ({
                    ...prev,
                    note: e.target.value,
                  }))
                }
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-none border-blue-300/70 text-blue-700 hover:bg-blue-50 font-bold"
                onClick={() =>
                  setReviewDialog((prev) => ({ ...prev, open: false }))
                }
              >
                Cancel
              </Button>
              <Button
                className="flex-1 h-12 rounded-none bg-black hover:bg-gray-800 text-white font-bold shadow-lg shadow-black/10 transition-all active:scale-[0.98]"
                onClick={handleReviewDeliverable}
                disabled={
                  reviewDialog.submitting ||
                  (reviewDialog.action !== "final_approve" &&
                    !reviewDialog.note.trim())
                }
              >
                {reviewDialog.submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : reviewDialog.action === "final_approve" ? (
                  "Approve"
                ) : reviewDialog.action === "reject" ? (
                  "Reject"
                ) : (
                  "Send Feedback"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-[420px] rounded-none p-0 overflow-hidden border border-gray-200 shadow-2xl">
          <div className="bg-gray-900 p-6 text-white">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-xl font-bold text-white">
                Delete Deliverable
              </DialogTitle>
              <p className="text-gray-400 text-sm">
                This will permanently remove the deliverable. Continue?
              </p>
            </DialogHeader>
          </div>
          <div className="p-6 bg-white">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1 h-11 rounded-none border-blue-300/70 text-blue-700 hover:bg-blue-50"
                onClick={() =>
                  setDeleteDialog((prev) => ({ ...prev, open: false }))
                }
              >
                Cancel
              </Button>
              <Button
                className="flex-1 h-11 rounded-none bg-rose-600 hover:bg-rose-700 text-white font-bold"
                onClick={handleDeleteDeliverable}
                disabled={deleteDialog.submitting}
              >
                {deleteDialog.submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Delete"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-5xl w-[95vw] p-0 overflow-hidden border border-gray-900 bg-black text-white">
          {galleryItems[galleryIndex] ? (
            <div className="flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 pr-16">
                <div className="text-sm font-semibold truncate">
                  {galleryItems[galleryIndex].caption}
                </div>
                <div className="flex items-center gap-2 mr-4">
                  <button
                    type="button"
                    className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                    onClick={() =>
                      handleDownload(
                        galleryItems[galleryIndex].url,
                        galleryItems[galleryIndex].caption,
                      )
                    }
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="bg-black flex items-center justify-center min-h-[60vh] relative">
                <button
                  type="button"
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                  onClick={() =>
                    setGalleryIndex((idx) =>
                      idx <= 0 ? galleryItems.length - 1 : idx - 1,
                    )
                  }
                  disabled={galleryItems.length <= 1}
                >
                  <ChevronDown className="w-4 h-4 rotate-90" />
                </button>
                {galleryItems[galleryIndex].type === "image" ? (
                  <img
                    src={galleryItems[galleryIndex].url}
                    alt={galleryItems[galleryIndex].caption}
                    className="max-h-[75vh] w-auto object-contain"
                  />
                ) : galleryItems[galleryIndex].type === "video" ? (
                  <video
                    src={galleryItems[galleryIndex].url}
                    controls
                    className="max-h-[75vh] w-auto bg-black"
                  />
                ) : (
                  <div className="text-sm text-white/70">
                    This file cannot be previewed. Use download to open it.
                  </div>
                )}
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                  onClick={() =>
                    setGalleryIndex((idx) =>
                      idx >= galleryItems.length - 1 ? 0 : idx + 1,
                    )
                  }
                  disabled={galleryItems.length <= 1}
                >
                  <ChevronDown className="w-4 h-4 -rotate-90" />
                </button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

export default AgencyDeliverablesView;
