import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  Mail,
  UserX,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import {
  createOfferAssetRequest,
  createOfferTalentAssignment,
  getAgencyTalents,
  getOfferTransferStatus,
  retryOfferTransfers,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useIndexedDbQuery } from "@/lib/useIndexedDbCache";
import { useTeamAccess } from "@/features/team/useTeamAccess";

export function AgencyDeliverablesView() {
  const { t } = useTranslation("agency");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useTeamAccess("agency");
  const canApproveDeliverables = hasPermission("approve_deliverables");
  const canViewDeliverables = hasPermission("view_deliverables");
  const isReadOnly = canViewDeliverables && !canApproveDeliverables;
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
  const [inviteRequiredDialog, setInviteRequiredDialog] = useState<{
    open: boolean;
    talentName: string;
    talentId: string;
  }>({ open: false, talentName: "", talentId: "" });
  // Transfer status panel: keyed by offerId
  const [transferStatusByOffer, setTransferStatusByOffer] = useState<
    Record<string, any>
  >({});
  const [loadingTransferStatus, setLoadingTransferStatus] = useState<
    Record<string, boolean>
  >({});
  const [retryingTransfers, setRetryingTransfers] = useState<
    Record<string, boolean>
  >({});
  const [retryResultDialog, setRetryResultDialog] = useState<{
    open: boolean;
    results: Array<{
      name: string;
      recipient_id: string;
      recipient_type: string;
      amount_cents: number;
      result: string;
      failure_reason?: string;
    }>;
  }>({ open: false, results: [] });
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
        title: t("agencyDashboard.deliverables.toasts.assignmentsLocked"),
        description:
          status === "contract_fully_signed"
            ? "Contract is already signed and you can’t change assigned talents."
            : "You can’t change assigned talents after the contract is sent.",
        variant: "warning",
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
        title: t("agencyDashboard.deliverables.toasts.talentUnassigned"),
        description: t("agencyDashboard.deliverables.toasts.talentRemoved"),
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
        title: t("agencyDashboard.deliverables.toasts.unassignFailed"),
        description:
          err?.message ||
          t("agencyDashboard.deliverables.toasts.pleaseTryAgain"),
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
      const resp: any = await getAgencyTalents();
      const rows = Array.isArray(resp?.talents)
        ? resp.talents
        : Array.isArray(resp?.data?.talents)
          ? resp.data.talents
          : Array.isArray(resp)
            ? resp
            : [];
      const talents = rows.map((row: any) => ({
        id: String(row?.id || row?.creator_id || ""),
        creator_id: String(row?.creator_id || ""),
        stage_name: row?.full_name || "",
        full_legal_name: row?.full_name || "",
        profile_photo_url: row?.profile_photo_url || "",
        img: row?.profile_photo_url || "",
        email: row?.email || "",
        has_creator_account:
          typeof row?.has_creator_account === "boolean"
            ? row.has_creator_account
            : Boolean(row?.creator_id),
        is_connected_creator: Boolean(row?.is_connected_creator),
      }));
      return { talents };
    },
    maxAge: 60 * 1000, // 1 minute
    syncInterval: 30 * 1000,
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
    if (status === "draft")
      return t("agencyDashboard.deliverables.statusLabels.draft");
    if (status === "brand_review")
      return t("agencyDashboard.deliverables.statusLabels.sentToBrand");
    if (status === "brand_approved")
      return t("agencyDashboard.deliverables.statusLabels.brandApproved");
    if (status === "submitted")
      return t("agencyDashboard.deliverables.statusLabels.new");
    return status.replace(/_/g, " ");
  };

  const offerStatusLabel = (statusRaw: unknown) => {
    const status = String(statusRaw || "")
      .toLowerCase()
      .trim();
    if (!status) return "";
    if (status === "contract_fully_signed")
      return t("agencyDashboard.deliverables.statusLabels.contractSigned");
    if (status === "contract_sent")
      return t("agencyDashboard.deliverables.statusLabels.contractSent");
    if (status === "sent")
      return t("agencyDashboard.deliverables.statusLabels.sent");
    if (status === "accepted")
      return t("agencyDashboard.deliverables.statusLabels.accepted");
    if (status === "open")
      return t("agencyDashboard.deliverables.statusLabels.open");
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
          t("agencyDashboard.deliverables.deliverableCard.deliverable");
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
      options?.layout ===
        t("agencyDashboard.deliverables.payoutStatus.agency") &&
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
              alt={
                caption ||
                t("agencyDashboard.deliverables.deliverableCard.deliverable")
              }
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
                {t("agencyDashboard.deliverables.deliverableCard.feedback")}
              </Badge>
            )}
          </div>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-gray-700 font-medium leading-relaxed line-clamp-2">
            {caption || (
              <span className="text-gray-300 italic">
                {t("agencyDashboard.deliverables.deliverableCard.noCaption")}
              </span>
            )}
          </p>

          {agencyFeedback && (
            <div className="p-2 bg-amber-50 border border-amber-100 text-[10px] text-amber-800 rounded-xl">
              <strong>
                {t("agencyDashboard.deliverables.deliverableCard.yourFeedback")}
              </strong>{" "}
              {agencyFeedback}
            </div>
          )}
          {brandFeedback && (
            <div className="p-2 bg-blue-50 border border-blue-100 text-[10px] text-blue-800 rounded-xl">
              <strong>
                {t(
                  "agencyDashboard.deliverables.deliverableCard.brandFeedback",
                )}
              </strong>{" "}
              {brandFeedback}
            </div>
          )}

          {options?.showActions && options?.offerId && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              {isBrandApproved && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          size="sm"
                          className="h-9 rounded-full font-semibold bg-emerald-500 hover:bg-emerald-600 text-white col-span-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                          disabled={isFinalized || !canApproveDeliverables}
                        >
                          {t(
                            "agencyDashboard.deliverables.deliverableCard.approve",
                          )}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!canApproveDeliverables && (
                      <TooltipContent>
                        <p>
                          {t(
                            "agencyDashboard.deliverables.permissionCannotApprove",
                          )}
                        </p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={isBrandApproved ? "col-span-1" : "col-span-2"}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-full font-semibold border-blue-400/70 text-blue-700 hover:bg-blue-50 w-full disabled:opacity-50 disabled:cursor-not-allowed"
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
                        disabled={isFinalized || !canApproveDeliverables}
                      >
                        {t(
                          "agencyDashboard.deliverables.deliverableCard.revise",
                        )}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!canApproveDeliverables && (
                    <TooltipContent>
                      <p>
                        {t(
                          "agencyDashboard.deliverables.permissionCannotRevise",
                        )}
                      </p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="col-span-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="col-span-2 h-8 rounded-full font-semibold text-rose-600 hover:bg-rose-50 w-full disabled:opacity-50 disabled:cursor-not-allowed"
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
                        disabled={isFinalized || !canApproveDeliverables}
                      >
                        {t(
                          "agencyDashboard.deliverables.deliverableCard.reject",
                        )}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!canApproveDeliverables && (
                    <TooltipContent>
                      <p>
                        {t(
                          "agencyDashboard.deliverables.permissionCannotReject",
                        )}
                      </p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {options?.layout ===
            t("agencyDashboard.deliverables.payoutStatus.agency") &&
            options?.offerId &&
            isDraft &&
            null}
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
      // Auto-load transfer status if offer is released
      const offer = (offersQuery.data?.offers ?? []).find(
        (o: any) => String(o?.id || "") === next,
      );
      if (String(offer?.escrow_status || "") === "released") {
        loadTransferStatus(next);
      }
    }
  };

  const loadTransferStatus = async (offerId: string) => {
    if (loadingTransferStatus[offerId]) return;
    setLoadingTransferStatus((prev) => ({ ...prev, [offerId]: true }));
    try {
      const data = await getOfferTransferStatus(offerId);
      setTransferStatusByOffer((prev) => ({ ...prev, [offerId]: data }));
    } catch (_) {
      // best-effort — don't surface errors for status polling
    } finally {
      setLoadingTransferStatus((prev) => ({ ...prev, [offerId]: false }));
    }
  };

  const handleRetryTransfers = async (offerId: string) => {
    if (retryingTransfers[offerId]) return;
    setRetryingTransfers((prev) => ({ ...prev, [offerId]: true }));
    try {
      const result: any = await retryOfferTransfers(offerId);
      if (result?.nothing_to_retry) {
        toast({
          title: t("agencyDashboard.deliverables.toasts.nothingToRetry"),
          description: t(
            "agencyDashboard.deliverables.toasts.allTransfersSuccessful",
          ),
        });
      } else {
        // Show professional result modal
        setRetryResultDialog({
          open: true,
          results: (result?.retried ?? []).map((r: any) => ({
            name: r.name || "Recipient",
            recipient_id: r.recipient_id || "",
            recipient_type: r.recipient_type,
            amount_cents: r.amount_cents ?? 0,
            result: r.result,
            failure_reason: r.failure_reason,
          })),
        });
      }
      // Refresh transfer status after retry
      await loadTransferStatus(offerId);
    } catch (err: any) {
      const body = err?.data;
      const code = body?.code;
      if (code === "escrow_not_released") {
        toast({
          title: t("agencyDashboard.deliverables.toasts.notYetAvailable"),
          description: t(
            "agencyDashboard.deliverables.toasts.retryAfterApproval",
          ),
          variant: "destructive",
        });
      } else {
        toast({
          title: t("agencyDashboard.deliverables.toasts.retryFailed"),
          description:
            err?.message ||
            t("agencyDashboard.deliverables.toasts.pleaseTryAgain"),
          variant: "destructive",
        });
      }
    } finally {
      setRetryingTransfers((prev) => ({ ...prev, [offerId]: false }));
    }
  };

  const handleAssignTalents = async () => {
    if (!assignDialog.offerId || assignSelectedIds.length === 0) return;
    if (assignSubmitting) return;
    if (assignmentLockedForOffer) {
      toast({
        title: t("agencyDashboard.deliverables.toasts.assignmentsLocked"),
        description:
          "You can change assigned talents before the contract is sent. This offer is already sent, so assignments can’t be changed.",
        variant: "warning",
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
      toast({ title: t("agencyDashboard.deliverables.toasts.talentAssigned") });
    } catch (e: any) {
      const msg = String(e?.message || "");
      const isLockedAssignmentError =
        msg.includes("cannot_change_assignments_after_contract_sent") ||
        msg.includes("cannot_change_assignments_after_payment_started");
      toast({
        title: isLockedAssignmentError
          ? t("agencyDashboard.deliverables.toasts.assignmentsLocked")
          : t("agencyDashboard.deliverables.toasts.assignmentFailed"),
        description: isLockedAssignmentError
          ? "This offer is already in progress, so talent assignments can’t be changed anymore."
          : msg || t("agencyDashboard.deliverables.toasts.pleaseTryAgain"),
        variant: isLockedAssignmentError ? "warning" : "destructive",
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
      toast({
        title: t("agencyDashboard.deliverables.requestAssetModal.sendRequest"),
      });
      await listOfferAssetRequests(requestDialog.offerId);
    } catch (e: any) {
      toast({
        title: t("agencyDashboard.deliverables.requestAssetModal.sendRequest"),
        description:
          e?.message ||
          t("agencyDashboard.deliverables.requestAssetModal.sending"),
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
      toast({
        title: t("agencyDashboard.deliverables.toasts.deliverablesUploaded"),
      });
    } catch (e: any) {
      toast({
        title: t("agencyDashboard.deliverables.toasts.uploadFailed"),
        description:
          e?.message || t("agencyDashboard.deliverables.toasts.pleaseTryAgain"),
        variant: "destructive",
      });
      setUploadDialog((prev) => ({ ...prev, sending: false }));
    }
  };

  const handleSubmitDrafts = async (offerId: string) => {
    if (!offerId) return;
    if (!canApproveDeliverables) {
      toast({
        title: t("agencyDashboard.deliverables.toasts.permissionRequired"),
        description: t(
          "agencyDashboard.deliverables.toasts.cannotSubmitDeliverables",
        ),
        variant: "destructive",
      });
      return;
    }

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
      toast({
        title: t("agencyDashboard.deliverables.toasts.submittedToBrand"),
      });
    } catch (e: any) {
      toast({
        title: t("agencyDashboard.deliverables.toasts.submitFailed"),
        description:
          e?.message || t("agencyDashboard.deliverables.toasts.pleaseTryAgain"),
        variant: "destructive",
      });
    } finally {
      setSubmittingDrafts((prev) => ({ ...prev, [offerId]: false }));
    }
  };

  const handleReviewDeliverable = async () => {
    if (!reviewDialog.offerId || !reviewDialog.deliverableId) return;
    if (reviewDialog.submitting) return;
    if (!canApproveDeliverables) {
      toast({
        title: t("agencyDashboard.deliverables.toasts.permissionRequired"),
        description: t(
          "agencyDashboard.deliverables.toasts.cannotReviewDeliverables",
        ),
        variant: "destructive",
      });
      return;
    }
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
      toast({
        title: t("agencyDashboard.deliverables.toasts.reviewSubmitted"),
      });
    } catch (e: any) {
      toast({
        title: t("agencyDashboard.deliverables.toasts.reviewFailed"),
        description:
          e?.message || t("agencyDashboard.deliverables.toasts.pleaseTryAgain"),
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
      toast({
        title: t("agencyDashboard.deliverables.toasts.deliverableDeleted"),
      });
    } catch (e: any) {
      toast({
        title: t("agencyDashboard.deliverables.toasts.deleteFailed"),
        description:
          e?.message || t("agencyDashboard.deliverables.toasts.pleaseTryAgain"),
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
      {isReadOnly && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <Eye className="w-5 h-5 text-amber-600" />
          <div>
            <p className="font-bold text-amber-800">
              {t("agencyDashboard.deliverables.viewOnlyMode")}
            </p>
            <p className="text-sm text-amber-700">
              {t("agencyDashboard.deliverables.viewOnlyDescription")}
            </p>
          </div>
        </div>
      )}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-900 to-gray-800 p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">
              {t("agencyDashboard.deliverables.title")}
            </h2>
            <p className="mt-2 text-gray-400 text-sm">
              {t("agencyDashboard.deliverables.description")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full border-purple-300/50 text-white bg-white/10 hover:bg-white/20 sm:w-auto"
            onClick={() => {
              setExpandedOfferId("");
              setSelectedCreatorId("");
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t("agencyDashboard.deliverables.collapseAll")}
          </Button>
        </div>
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      {offers.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 bg-white/50 rounded-2xl">
          <p className="text-gray-500 text-sm">
            {t("agencyDashboard.deliverables.noBrandOffers")}
          </p>
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
              String(d?.submitted_by_role || "") !==
                t("agencyDashboard.deliverables.payoutStatus.agency"),
          );
          const agencyDeliverables = deliverables.filter(
            (d: any) =>
              deliverableMatchesSelection(d) &&
              String(d?.submitted_by_role || "") ===
                t("agencyDashboard.deliverables.payoutStatus.agency"),
          );
          const hasDraftAgencyDeliverables = agencyDeliverables.some(
            (d: any) => String(d?.status || "").toLowerCase() === "draft",
          );
          // For the Submit to Brand button: check ALL agency drafts for this offer,
          // not just those matching the currently selected talent.
          const hasAnyDraftAgencyDeliverables = deliverables.some(
            (d: any) =>
              String(d?.submitted_by_role || "") ===
                t("agencyDashboard.deliverables.payoutStatus.agency") &&
              String(d?.status || "").toLowerCase() === "draft",
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
                  className={`p-4 sm:p-5 flex flex-col gap-4 cursor-pointer transition-colors ${expanded ? "bg-primary/5" : "bg-white hover:bg-gray-50"}`}
                  onClick={() => openOffer(offerId)}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-xl ${expanded ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}`}
                    >
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-bold text-gray-900">
                        {offer?.offer_title ||
                          offer?.brand_campaigns?.name ||
                          t("agencyDashboard.deliverables.offerCard.offer")}
                      </h3>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-gray-400 break-words">
                          {offer?.brands?.company_name ||
                            t("agencyDashboard.deliverables.offerCard.brand")}
                        </span>
                        <span className="hidden sm:block w-1 h-1 rounded-full bg-gray-300" />
                        <Badge
                          className={`text-[10px] py-0 ${offerStatusClass(offer?.status)}`}
                        >
                          {offerStatusLabel(offer?.status) ||
                            String(offer?.status || "")}
                        </Badge>
                        <Badge
                          className={`text-[10px] py-0 ${isOfferSigned ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}
                        >
                          {isOfferSigned
                            ? t("agencyDashboard.deliverables.offerCard.signed")
                            : t(
                                "agencyDashboard.deliverables.offerCard.notSigned",
                              )}
                        </Badge>
                        {isOfferSigned ? (
                          <Badge
                            className={`text-[10px] py-0 ${isOfferPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                          >
                            {isOfferPaid
                              ? t("agencyDashboard.deliverables.offerCard.paid")
                              : t(
                                  "agencyDashboard.deliverables.offerCard.awaitingPayment",
                                )}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-blue-400/70 text-blue-700 hover:bg-blue-50 sm:w-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        openOffer(offerId);
                      }}
                    >
                      {expanded
                        ? t("agencyDashboard.deliverables.offerCard.hide")
                        : t("agencyDashboard.deliverables.offerCard.open")}
                    </Button>
                    <Button
                      size="sm"
                      className="border-0 bg-gradient-to-r from-gray-900 to-slate-800 text-white hover:from-gray-800 hover:to-slate-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (offerAssignmentsLocked) {
                          toast({
                            title: t(
                              "agencyDashboard.deliverables.toasts.assignmentsLocked",
                            ),
                            description: t(
                              "agencyDashboard.deliverables.toasts.assignmentsLockedDescription",
                              {
                                defaultValue:
                                  "You can change assigned talents before the contract is sent. This offer is already sent, so assignments cannot be changed.",
                              },
                            ),
                            variant: "warning",
                          });
                          return;
                        }
                        setAssignDialog({ open: true, offerId });
                      }}
                      disabled={offerAssignmentsLocked}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {assignments.length === 0
                        ? t(
                            "agencyDashboard.deliverables.offerCard.assignTalent",
                          )
                        : t("agencyDashboard.deliverables.offerCard.addTalent")}
                    </Button>
                  </div>
                </div>

                {/* Payment gate banner for signed but unpaid offers */}
                {offer?.status === "contract_fully_signed" && !isOfferPaid && (
                  <div className="mx-5 mb-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    <span className="text-amber-700 text-xs font-semibold">
                      {t("agencyDashboard.deliverables.paymentPendingBanner", {
                        defaultValue:
                          "Brand payment is still pending. You can upload and submit deliverables now, but you'll need to confirm the unpaid status before submitting.",
                      })}
                    </span>
                  </div>
                )}

                {/* ── Payout Status Panel ── visible once escrow is released ── */}
                {String(offer?.escrow_status || "") === "released" &&
                  expanded &&
                  (() => {
                    const ts = transferStatusByOffer[offerId];
                    const isLoading = loadingTransferStatus[offerId];
                    const isRetrying = retryingTransfers[offerId];
                    const hasFailedTransfers = ts?.recipients?.some(
                      (r: any) =>
                        r.transfer_status ===
                        t(
                          "agencyDashboard.deliverables.retryTransferDialog.failed",
                        ),
                    );
                    const allSucceeded =
                      ts?.recipients?.length > 0 &&
                      ts?.recipients?.every(
                        (r: any) => r.transfer_status === "created",
                      );

                    const statusIcon = (r: any) => {
                      if (r.transfer_status === "created")
                        return (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        );
                      if (
                        r.transfer_status ===
                          t(
                            "agencyDashboard.deliverables.retryTransferDialog.failed",
                          ) ||
                        r.transfer_status === "pending_retry"
                      )
                        return (
                          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        );
                      return (
                        <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      );
                    };

                    const statusLabel = (r: any) => {
                      if (r.transfer_status === "created")
                        return t(
                          "agencyDashboard.deliverables.retryTransferDialog.transferred",
                        );
                      if (r.transfer_status === "pending_retry")
                        return t(
                          "agencyDashboard.deliverables.payoutStatus.retrying",
                          { defaultValue: "retrying..." },
                        );
                      if (
                        r.transfer_status ===
                        t(
                          "agencyDashboard.deliverables.retryTransferDialog.failed",
                        )
                      )
                        return t(
                          "agencyDashboard.deliverables.retryTransferDialog.failed",
                        );
                      if (r.transfer_status === "reversed")
                        return t(
                          "agencyDashboard.deliverables.payoutStatus.reversed",
                          { defaultValue: "reversed" },
                        );
                      return t(
                        "agencyDashboard.deliverables.payoutStatus.notAttempted",
                        { defaultValue: "not attempted" },
                      );
                    };

                    const friendlyReason = (reason: string) => {
                      if (!reason) return null;
                      if (
                        reason.includes(
                          "insufficient_capabilities_for_transfer",
                        )
                      )
                        return t(
                          "agencyDashboard.deliverables.payoutStatus.stripeTransfersNotEnabled",
                          {
                            defaultValue:
                              "Stripe account not fully set up - transfers not enabled.",
                          },
                        );
                      if (reason.includes("transfers_not_allowed"))
                        return t(
                          "agencyDashboard.deliverables.retryTransferDialog.transfersNotAllowed",
                        );
                      if (reason.includes("payouts_not_allowed"))
                        return t(
                          "agencyDashboard.deliverables.payoutStatus.payoutsNotAllowed",
                          {
                            defaultValue:
                              "Payouts not allowed on this Stripe account.",
                          },
                        );
                      if (reason.includes("balance_insufficient"))
                        return t(
                          "agencyDashboard.deliverables.payoutStatus.platformBalanceInsufficient",
                          {
                            defaultValue:
                              "Platform balance insufficient - contact support.",
                          },
                        );
                      if (
                        reason.includes("no_stripe_account") ||
                        reason.includes("No Stripe Connect")
                      )
                        return t(
                          "agencyDashboard.deliverables.payoutStatus.noStripeConnected",
                          {
                            defaultValue:
                              "No Stripe account connected. Ask them to complete Stripe onboarding.",
                          },
                        );
                      return reason.length > 120
                        ? reason.slice(0, 120) + "\u2026"
                        : reason;
                    };

                    return (
                      <div className="mx-5 mb-4 rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/60">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-800">
                              {t(
                                "agencyDashboard.deliverables.payoutStatus.title",
                                { defaultValue: "Payout Status" },
                              )}
                            </span>
                            {allSucceeded && (
                              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                {t(
                                  "agencyDashboard.deliverables.payoutStatus.allTransferred",
                                  { defaultValue: "all transferred" },
                                )}
                              </span>
                            )}
                            {hasFailedTransfers && (
                              <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                {t(
                                  "agencyDashboard.deliverables.payoutStatus.actionRequired",
                                  { defaultValue: "action required" },
                                )}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700"
                              onClick={() => loadTransferStatus(offerId)}
                              disabled={isLoading}
                            >
                              <RefreshCw
                                className={`w-3 h-3 mr-1 ${isLoading ? "animate-spin" : ""}`}
                              />
                              {t(
                                "agencyDashboard.deliverables.payoutStatus.refresh",
                                { defaultValue: "Refresh" },
                              )}
                            </Button>
                            {hasFailedTransfers && (
                              <Button
                                size="sm"
                                className="h-7 px-3 text-xs bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-lg flex items-center gap-1.5"
                                onClick={() => handleRetryTransfers(offerId)}
                                disabled={isRetrying}
                              >
                                {isRetrying ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <RotateCcw className="w-3 h-3" />
                                )}
                                {t(
                                  "agencyDashboard.deliverables.payoutStatus.retryFailed",
                                  { defaultValue: "Retry failed" },
                                )}
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Body */}
                        {isLoading && !ts ? (
                          <div className="flex items-center justify-center py-6 gap-2 text-gray-400">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-xs">
                              {t(
                                "agencyDashboard.deliverables.payoutStatus.loading",
                                { defaultValue: "Loading payout status..." },
                              )}
                            </span>
                          </div>
                        ) : !ts ? (
                          <div className="px-4 py-4 text-xs text-gray-400 text-center">
                            {t(
                              "agencyDashboard.deliverables.payoutStatus.clickRefresh",
                              {
                                defaultValue:
                                  "Click refresh to load payout status.",
                              },
                            )}
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-100">
                            {(ts.recipients ?? []).map((r: any) => (
                              <div
                                key={`${r.recipient_type}-${r.recipient_id}`}
                                className="px-4 py-3"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3 min-w-0">
                                    {statusIcon(r)}
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-semibold text-gray-900 truncate">
                                          {r.name}
                                        </span>
                                        <span className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">
                                          {r.recipient_type ===
                                          t(
                                            "agencyDashboard.deliverables.payoutStatus.agency",
                                          )
                                            ? t(
                                                "agencyDashboard.deliverables.payoutStatus.agency",
                                              )
                                            : t(
                                                "agencyDashboard.deliverables.payoutStatus.talent",
                                              )}
                                        </span>
                                      </div>
                                      {/* Stripe health */}
                                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                        {!r.stripe_connected ? (
                                          <span className="text-[10px] text-red-600 font-semibold">
                                            {t(
                                              "agencyDashboard.deliverables.payoutStatus.noStripeAccount",
                                              { defaultValue: "No Stripe account" },
                                            )}
                                          </span>
                                        ) : !r.stripe_transfers_enabled ? (
                                          <span className="text-[10px] text-amber-600 font-semibold">
                                            {t(
                                              "agencyDashboard.deliverables.payoutStatus.transfersNotEnabled",
                                              {
                                                defaultValue:
                                                  "Transfers not enabled",
                                              },
                                            )}
                                          </span>
                                        ) : (
                                          <span className="text-[10px] text-emerald-600 font-semibold">
                                            {t(
                                              "agencyDashboard.deliverables.payoutStatus.stripeReady",
                                              { defaultValue: "Stripe ready" },
                                            )}
                                          </span>
                                        )}
                                        {r.retry_count > 0 && (
                                          <span className="text-[10px] text-gray-400">
                                            {r.retry_count}{" "}
                                            {r.retry_count === 1
                                              ? t(
                                                  "agencyDashboard.deliverables.payoutStatus.retry",
                                                )
                                              : t(
                                                  "agencyDashboard.deliverables.payoutStatus.retries",
                                                )}
                                          </span>
                                        )}
                                      </div>
                                      {r.transfer_status ===
                                        t(
                                          "agencyDashboard.deliverables.retryTransferDialog.failed",
                                        ) &&
                                        r.failure_reason && (
                                          <p className="text-[11px] text-amber-700 mt-1 leading-snug">
                                            {friendlyReason(r.failure_reason)}
                                          </p>
                                        )}
                                      {/* Fix Stripe account CTA */}
                                      {r.transfer_status ===
                                        t(
                                          "agencyDashboard.deliverables.retryTransferDialog.failed",
                                        ) &&
                                        !r.stripe_transfers_enabled && (
                                          <>
                                            {r.recipient_type ===
                                            t(
                                              "agencyDashboard.deliverables.payoutStatus.agency",
                                            ) ? (
                                              // Agency = this user's own account → navigate to payouts
                                              <button
                                                className="mt-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline underline-offset-2 flex items-center gap-1"
                                                onClick={() =>
                                                  navigate(
                                                    `/AgencyDashboard?tab=payouts`,
                                                  )
                                                }
                                              >
                                                <ArrowRight className="w-3 h-3" />
                                                {t(
                                                  "agencyDashboard.deliverables.payoutStatus.fixStripeAccount",
                                                  {
                                                    defaultValue:
                                                      "Fix your Stripe account",
                                                  },
                                                )}
                                              </button>
                                            ) : (
                                              // Creator = talent's account → agency can't fix it, show guidance + message button
                                              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                                                <p className="text-[11px] text-gray-500 leading-snug">
                                                  {t(
                                                    "agencyDashboard.deliverables.payoutStatus.askTalentStripe",
                                                    {
                                                      defaultValue:
                                                        "Ask this talent to complete their Stripe onboarding in their portal.",
                                                    },
                                                  )}
                                                </p>
                                                <button
                                                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline underline-offset-2 flex items-center gap-1 flex-shrink-0"
                                                  onClick={() =>
                                                    navigate(
                                                      `/AgencyDashboard?tab=messages&openCreatorId=${encodeURIComponent(r.recipient_id)}`,
                                                    )
                                                  }
                                                >
                                                  <Mail className="w-3 h-3" />
                                                  {t(
                                                    "agencyDashboard.deliverables.payoutStatus.messageTalent",
                                                    {
                                                      defaultValue:
                                                        "Message talent",
                                                    },
                                                  )}
                                                </button>
                                              </div>
                                            )}
                                          </>
                                        )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 flex-shrink-0">
                                    <span className="text-sm font-bold text-gray-900">
                                      $
                                      {((r.amount_cents ?? 0) / 100).toFixed(2)}
                                    </span>
                                    <span
                                      className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                                        r.transfer_status === "created"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : r.transfer_status ===
                                              t(
                                                "agencyDashboard.deliverables.retryTransferDialog.failed",
                                              )
                                            ? "bg-amber-50 text-amber-700 border-amber-200"
                                            : r.transfer_status ===
                                                "pending_retry"
                                              ? "bg-blue-50 text-blue-700 border-blue-200"
                                              : "bg-gray-50 text-gray-500 border-gray-200"
                                      }`}
                                    >
                                      {statusLabel(r)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

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
                            {t(
                              "agencyDashboard.deliverables.assignTalent.loadingAssignments",
                              { defaultValue: "Loading assignments..." },
                            )}
                          </p>
                        ) : assignments.length === 0 ? (
                          <p className="text-xs text-gray-500">
                            {t(
                              "agencyDashboard.deliverables.assignTalent.noAssigned",
                              { defaultValue: "No talents assigned yet." },
                            )}
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
                                          t(
                                            "agencyDashboard.deliverables.assignTalent.talentFallback",
                                          )}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {t(
                                          "agencyDashboard.deliverables.assignTalent.assigned",
                                          { defaultValue: "Assigned" },
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {!offerAssignmentsLocked ? (
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        className="h-8 w-8 border-red-200 text-red-600 hover:bg-red-50"
                                        title={t(
                                          "agencyDashboard.deliverables.assignTalent.unassignTalent",
                                          { defaultValue: "Unassign talent" },
                                        )}
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (!assignment?.id) return;
                                          const name = String(
                                            talent?.stage_name ||
                                              talent?.full_name ||
                                              talent?.full_legal_name ||
                                              t(
                                                "agencyDashboard.deliverables.assignTalent.talentFallback",
                                              ),
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
                                      {t(
                                        "agencyDashboard.deliverables.requestAssetModal.requestAsset",
                                        { defaultValue: "Request Asset" },
                                      )}
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
                                  {t("agencyDashboard.deliverables.title")}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {selectedAssignment?.creators?.full_name ||
                                    selectedAssignment?.agency_users
                                      ?.stage_name ||
                                    selectedAssignment?.agency_users
                                      ?.full_legal_name ||
                                    t(
                                      "agencyDashboard.deliverables.assignTalent.talentFallback",
                                    )}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-blue-400/70 text-blue-700 hover:bg-blue-50"
                                  disabled={
                                    !hasAnyDraftAgencyDeliverables ||
                                    submittingDrafts[offerId] ||
                                    !canApproveDeliverables
                                  }
                                  onClick={() => handleSubmitDrafts(offerId)}
                                >
                                  {submittingDrafts[offerId] ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                  ) : null}
                                  {t(
                                    "agencyDashboard.deliverables.submitToBrand",
                                    { defaultValue: "Submit to Brand" },
                                  )}
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
                                  <Upload className="w-4 h-4 mr-2" />{" "}
                                  {t(
                                    "agencyDashboard.deliverables.upload",
                                    { defaultValue: "Upload" },
                                  )}
                                </Button>
                              </div>
                            </div>

                            {loadingDeliverables[offerId] ? (
                              <p className="text-xs text-gray-500">
                                {t(
                                  "agencyDashboard.deliverables.loadingDeliverables",
                                  { defaultValue: "Loading deliverables..." },
                                )}
                              </p>
                            ) : (
                              <div className="space-y-6">
                                <div className="border border-gray-200 rounded-2xl p-4 bg-white">
                                  <p className="text-sm font-semibold text-gray-900 mb-3">
                                    {t(
                                      "agencyDashboard.deliverables.creatorUploads",
                                      { defaultValue: "Creator uploads" },
                                    )}
                                  </p>
                                  {creatorDeliverables.length === 0 ? (
                                    <p className="text-xs text-gray-400">
                                      {t(
                                        "agencyDashboard.deliverables.noneYet",
                                        { defaultValue: "None yet." },
                                      )}
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
                                    {t(
                                      "agencyDashboard.deliverables.agencyUploads",
                                      { defaultValue: "Agency uploads" },
                                    )}
                                  </p>
                                  {agencyDeliverables.length === 0 ? (
                                    <p className="text-xs text-gray-400">
                                      {t(
                                        "agencyDashboard.deliverables.noneYet",
                                        { defaultValue: "None yet." },
                                      )}
                                    </p>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                                      {agencyDeliverables.map(
                                        (d: any, idx: number) =>
                                          renderDeliverableCard(d, {
                                            offerId,
                                            layout: t(
                                              "agencyDashboard.deliverables.payoutStatus.agency",
                                            ),
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
        <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-2xl rounded-2xl sm:rounded-[3rem] p-4 sm:p-10 border-none bg-white/95 backdrop-blur-xl shadow-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-2xl font-black text-gray-900 tracking-tight">
              {t("agencyDashboard.deliverables.assignTalent.title")}
            </DialogTitle>
            <p className="text-sm text-gray-500 font-medium mt-1">
              {t("agencyDashboard.deliverables.assignTalent.description", {
                defaultValue:
                  "Select one or more talents from your roster to assign to this offer.",
              })}
            </p>
          </DialogHeader>

          <Alert className="mb-6 bg-blue-50 border-blue-200 rounded-xl">
            <AlertDescription className="text-sm text-blue-900 font-medium">
              {t("agencyDashboard.deliverables.assignTalent.lockHint", {
                defaultValue:
                  "You can change assigned talents any time before the contract is sent. Once you send the contract, assignments are locked.",
              })}
            </AlertDescription>
          </Alert>

          {assignmentLockedForOffer ? (
            <Alert className="mb-6 bg-amber-50 border-amber-200 rounded-xl">
              <AlertDescription className="text-sm text-amber-900 font-semibold">
                {t("agencyDashboard.deliverables.assignTalent.lockedWarning", {
                  defaultValue:
                    "This offer's contract has already been sent. Talent assignments are locked.",
                })}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={t(
                "agencyDashboard.deliverables.assignTalent.filterPlaceholder",
              )}
              value={assignSearch}
              onChange={(e) => setAssignSearch(e.target.value)}
              className="h-12 pl-10 bg-gray-100 border-none rounded-xl"
            />
          </div>

          <ScrollArea className="h-[55vh] sm:h-[450px] pr-2 sm:pr-4">
            {loadingRoster ? (
              <div className="h-[420px] flex flex-col items-center justify-center text-center">
                <Loader2 className="w-10 h-10 animate-spin text-gray-300 mb-4" />
                <p className="text-sm font-bold text-gray-500">
                  {t("agencyDashboard.deliverables.assignTalent.loadingTalents", {
                    defaultValue: "Loading talents...",
                  })}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {t(
                    "agencyDashboard.deliverables.assignTalent.fetchingRoster",
                    { defaultValue: "Fetching your agency roster." },
                  )}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredRoster.map((talent: any) => {
                  const creatorId = getRosterCreatorId(talent);
                  const needsInvite = !talent?.has_creator_account;
                  const canAssign = Boolean(creatorId) && !needsInvite;
                  const alreadyAssigned = creatorId
                    ? assignedTalentIds.has(creatorId)
                    : false;
                  const isSelected = creatorId
                    ? assignSelectedIds.includes(creatorId)
                    : false;
                  const talentName =
                    talent?.stage_name ||
                    talent?.name ||
                    talent?.full_legal_name ||
                    t(
                      "agencyDashboard.deliverables.assignTalent.talentFallback",
                    );
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
                        if (needsInvite) {
                          setInviteRequiredDialog({
                            open: true,
                            talentName,
                            talentId: talent?.id || creatorId,
                          });
                          return;
                        }
                        if (!canAssign || alreadyAssigned) return;
                        setAssignSelectedIds((prev) =>
                          prev.includes(creatorId)
                            ? prev.filter((x) => x !== creatorId)
                            : [...prev, creatorId],
                        );
                      }}
                      className={`p-5 rounded-[2rem] border-2 transition-all duration-500 flex items-center gap-5 ${
                        needsInvite
                          ? "border-dashed border-amber-200 bg-amber-50/30 cursor-pointer hover:border-amber-300"
                          : alreadyAssigned || assignmentLockedForOffer
                            ? "border-gray-100 bg-gray-50/80 opacity-70 cursor-not-allowed"
                            : "cursor-pointer border-gray-50 hover:border-gray-100 bg-white"
                      } ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/30 shadow-lg shadow-indigo-100/20"
                          : ""
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
                          {talentName}
                        </h6>
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          {alreadyAssigned && (
                            <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] tracking-widest font-black px-2 py-0.5">
                              assigned
                            </Badge>
                          )}
                          {needsInvite && (
                            <Badge className="bg-amber-50 text-amber-600 border border-amber-200 text-[10px] tracking-widest font-black px-2 py-0.5 flex items-center gap-1">
                              <Mail className="w-2.5 h-2.5" />
                              invite required
                            </Badge>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="bg-indigo-600 rounded-full p-1 shadow-md shadow-indigo-200">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                      {needsInvite && !isSelected && (
                        <UserX className="w-4 h-4 text-amber-400 flex-shrink-0" />
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

      {/* Invite Required Modal */}
      <Dialog
        open={inviteRequiredDialog.open}
        onOpenChange={(open) =>
          setInviteRequiredDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent className="max-w-sm rounded-2xl p-8 border-none bg-white shadow-2xl text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center">
              <UserX className="w-7 h-7 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight">
                Onboarding not completed
              </h3>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                <span className="font-semibold text-gray-700">
                  {inviteRequiredDialog.talentName}
                </span>{" "}
                hasn't accepted their portal invite yet. They need to complete
                onboarding before they can be assigned to a contract.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full mt-2">
              <Button
                onClick={() => {
                  setInviteRequiredDialog({
                    open: false,
                    talentName: "",
                    talentId: "",
                  });
                  setAssignDialog({ open: false, offerId: "" });
                  navigate(
                    `/AgencyDashboard?tab=roster&subTab=${encodeURIComponent("All Talent")}&openTalentId=${encodeURIComponent(inviteRequiredDialog.talentId || "")}`,
                  );
                }}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-xl h-11 font-bold text-sm flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Go to Roster &amp; Invite
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  setInviteRequiredDialog({
                    open: false,
                    talentName: "",
                    talentId: "",
                  })
                }
                className="w-full rounded-xl h-11 font-semibold text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Retry Transfer Result Modal */}
      <Dialog
        open={retryResultDialog.open}
        onOpenChange={(open) =>
          setRetryResultDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent className="max-w-md rounded-2xl p-0 border-none bg-white shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              {retryResultDialog.results.every(
                (r) => r.result === "succeeded",
              ) ? (
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
              )}
              <div>
                <h3 className="text-base font-black text-gray-900 tracking-tight">
                  Transfer Retry Results
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {
                    retryResultDialog.results.filter(
                      (r) => r.result === "succeeded",
                    ).length
                  }{" "}
                  of {retryResultDialog.results.length} transfers succeeded
                </p>
              </div>
            </div>
          </div>

          {/* Results list */}
          <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
            {retryResultDialog.results.map((r, i) => (
              <div
                key={i}
                className="px-6 py-3 flex items-start justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 truncate">
                      {r.name}
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide font-medium flex-shrink-0">
                      {r.recipient_type ===
                      t("agencyDashboard.deliverables.payoutStatus.agency")
                        ? t("agencyDashboard.deliverables.payoutStatus.agency")
                        : t("agencyDashboard.deliverables.payoutStatus.talent")}
                    </span>
                  </div>
                  {r.result ===
                    t(
                      "agencyDashboard.deliverables.retryTransferDialog.failed",
                    ) &&
                    r.failure_reason && (
                      <p className="text-[11px] text-amber-700 mt-0.5 leading-snug">
                        {r.failure_reason.includes(
                          "insufficient_capabilities_for_transfer",
                        )
                          ? t(
                              "agencyDashboard.deliverables.retryTransferDialog.stripeNotSetup",
                            )
                          : r.failure_reason.includes("transfers_not_allowed")
                            ? t(
                                "agencyDashboard.deliverables.retryTransferDialog.transfersNotAllowed",
                              )
                            : r.failure_reason.includes("no_stripe_account") ||
                                r.failure_reason.includes("No Stripe Connect")
                              ? t(
                                  "agencyDashboard.deliverables.retryTransferDialog.noStripeConnected",
                                )
                              : r.failure_reason.length > 100
                                ? r.failure_reason.slice(0, 100) + "\u2026"
                                : r.failure_reason}
                      </p>
                    )}
                  {r.result === "skipped_no_account" && (
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      No Stripe account connected yet.
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-bold text-gray-900">
                    ${(r.amount_cents / 100).toFixed(2)}
                  </span>
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                      r.result === "succeeded"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : r.result === "skipped_no_account"
                          ? "bg-gray-50 text-gray-500 border-gray-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {r.result === "succeeded"
                      ? t(
                          "agencyDashboard.deliverables.retryTransferDialog.transferred",
                        )
                      : r.result === "skipped_no_account"
                        ? t(
                            "agencyDashboard.deliverables.retryTransferDialog.noAccount",
                          )
                        : t(
                            "agencyDashboard.deliverables.retryTransferDialog.failed",
                          )}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50/60 border-t border-gray-100 space-y-3">
            {retryResultDialog.results.some(
              (r) =>
                r.result ===
                  t(
                    "agencyDashboard.deliverables.retryTransferDialog.failed",
                  ) || r.result === "skipped_no_account",
            ) && (
              <div className="space-y-1.5">
                {/* Agency-specific guidance */}
                {retryResultDialog.results.some(
                  (r) =>
                    (r.result ===
                      t(
                        "agencyDashboard.deliverables.retryTransferDialog.failed",
                      ) ||
                      r.result === "skipped_no_account") &&
                    r.recipient_type ===
                      t("agencyDashboard.deliverables.payoutStatus.agency"),
                ) && (
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Your Stripe account needs attention. Complete your Stripe
                    onboarding to receive transfers.
                  </p>
                )}
                {/* Creator-specific guidance */}
                {retryResultDialog.results.some(
                  (r) =>
                    (r.result ===
                      t(
                        "agencyDashboard.deliverables.retryTransferDialog.failed",
                      ) ||
                      r.result === "skipped_no_account") &&
                    r.recipient_type === "creator",
                ) && (
                  <div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      One or more talents need to complete their Stripe
                      onboarding before funds can be sent to them.
                    </p>
                    {/* Message buttons for each failed creator */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {retryResultDialog.results
                        .filter(
                          (r) =>
                            (r.result ===
                              t(
                                "agencyDashboard.deliverables.retryTransferDialog.failed",
                              ) ||
                              r.result === "skipped_no_account") &&
                            r.recipient_type === "creator",
                        )
                        .map((r) => (
                          <button
                            key={r.recipient_id}
                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline underline-offset-2 flex items-center gap-1"
                            onClick={() => {
                              setRetryResultDialog({
                                open: false,
                                results: [],
                              });
                              navigate(
                                `/AgencyDashboard?tab=messages&openCreatorId=${encodeURIComponent(r.recipient_id)}`,
                              );
                            }}
                          >
                            <Mail className="w-3 h-3" />
                            Message {r.name}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2">
              {retryResultDialog.results.some(
                (r) =>
                  (r.result ===
                    t(
                      "agencyDashboard.deliverables.retryTransferDialog.failed",
                    ) ||
                    r.result === "skipped_no_account") &&
                  r.recipient_type ===
                    t("agencyDashboard.deliverables.payoutStatus.agency"),
              ) && (
                <Button
                  size="sm"
                  className="h-9 px-4 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
                  onClick={() => {
                    setRetryResultDialog({ open: false, results: [] });
                    navigate(`/AgencyDashboard?tab=payouts`);
                  }}
                >
                  <ArrowRight className="w-3 h-3" />
                  Fix your Stripe account
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-9 px-4 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-700 ml-auto"
                onClick={() =>
                  setRetryResultDialog({ open: false, results: [] })
                }
              >
                Close
              </Button>
            </div>
          </div>
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
                  toast({
                    title: t(
                      "agencyDashboard.deliverables.toasts.submittedToBrand",
                    ),
                  });
                  setUnpaidSubmitDialog({
                    open: false,
                    offerId: "",
                    submitting: false,
                  });
                } catch (e: any) {
                  toast({
                    title: t(
                      "agencyDashboard.deliverables.toasts.submitFailed",
                    ),
                    description:
                      e?.message ||
                      t("agencyDashboard.deliverables.toasts.pleaseTryAgain"),
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
              {unassignDialog.submitting
                ? t("agencyDashboard.deliverables.unassignTalent.unassigning")
                : t("agencyDashboard.deliverables.unassignTalent.unassign")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={requestDialog.open}
        onOpenChange={(open) => setRequestDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="w-[95vw] sm:max-w-[560px] rounded-none p-0 overflow-hidden border border-gray-200 shadow-2xl flex flex-col max-h-[85vh]">
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
                            t(
                              "agencyDashboard.deliverables.assignTalent.talentFallback",
                            )}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {requestTalent?.email ||
                            t(
                              "agencyDashboard.deliverables.requestAssetModal.selectedTalent",
                            )}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      Title
                    </label>
                    <Input
                      placeholder={t(
                        "agencyDashboard.deliverables.requestAssetModal.titlePlaceholder",
                      )}
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
                      placeholder={t(
                        "agencyDashboard.deliverables.requestAssetModal.detailsPlaceholder",
                      )}
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
                        {requestDialog.file?.name ||
                          t(
                            "agencyDashboard.deliverables.requestAssetModal.noFileSelected",
                          )}
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
                      t(
                        "agencyDashboard.deliverables.requestAssetModal.sendRequest",
                      )
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
        <DialogContent className="w-[95vw] sm:max-w-[520px] rounded-lg p-4 sm:p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle>Upload Deliverable</DialogTitle>
            <p className="text-xs text-gray-500">
              Add a caption and upload one or more files.
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder={t(
                "agencyDashboard.deliverables.uploadDeliverableModal.captionPlaceholder",
              )}
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
                  : t(
                      "agencyDashboard.deliverables.uploadDeliverableModal.noFilesSelected",
                    )}
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
        <DialogContent className="w-[95vw] sm:max-w-[500px] rounded-none p-0 overflow-hidden border border-gray-200 shadow-2xl">
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
                  ? t(
                      "agencyDashboard.deliverables.reviewModal.approveDescription",
                    )
                  : reviewDialog.action === "reject"
                    ? t(
                        "agencyDashboard.deliverables.reviewModal.rejectDescription",
                      )
                    : t(
                        "agencyDashboard.deliverables.reviewModal.requestChangesDescription",
                      )}
              </p>
            </DialogHeader>
          </div>

          <div className="p-8 space-y-6 bg-white">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                {reviewDialog.action === "final_approve"
                  ? t(
                      "agencyDashboard.deliverables.reviewModal.optionalNoteLabel",
                    )
                  : t("agencyDashboard.deliverables.reviewModal.feedbackLabel")}
              </label>
              <Textarea
                placeholder={
                  reviewDialog.action === "final_approve"
                    ? t(
                        "agencyDashboard.deliverables.reviewModal.optionalNoteLabel",
                      )
                    : t(
                        "agencyDashboard.deliverables.reviewModal.feedbackPlaceholder",
                      )
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
                  t("agencyDashboard.deliverables.deliverableCard.approve")
                ) : reviewDialog.action === "reject" ? (
                  t("agencyDashboard.deliverables.deliverableCard.reject")
                ) : (
                  t(
                    "agencyDashboard.deliverables.reviewModal.sendFeedbackAction",
                  )
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
        <DialogContent className="w-[95vw] sm:max-w-[420px] rounded-none p-0 overflow-hidden border border-gray-200 shadow-2xl">
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
                  t("agencyDashboard.deliverables.delete")
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="h-[100dvh] w-screen max-w-none rounded-none border-0 bg-black p-0 text-white sm:h-auto sm:w-[95vw] sm:max-w-5xl sm:rounded-xl sm:border sm:border-gray-900">
          {galleryItems[galleryIndex] ? (
            <div className="flex min-h-[100dvh] flex-col sm:min-h-0">
              <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 pr-16 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm font-semibold truncate pr-10 sm:pr-0">
                  {galleryItems[galleryIndex].caption}
                </div>
                <div className="mr-4 flex items-center gap-2 self-end sm:self-auto">
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
              <div className="relative flex flex-1 items-center justify-center bg-black min-h-[60vh] sm:min-h-[60vh]">
                <button
                  type="button"
                  className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 sm:left-4"
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
                    className="max-h-[72vh] w-auto object-contain sm:max-h-[75vh]"
                  />
                ) : galleryItems[galleryIndex].type === "video" ? (
                  <video
                    src={galleryItems[galleryIndex].url}
                    controls
                    className="max-h-[72vh] w-auto bg-black sm:max-h-[75vh]"
                  />
                ) : (
                  <div className="text-sm text-white/70">
                    This file cannot be previewed. Use download to open it.
                  </div>
                )}
                <button
                  type="button"
                  className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 sm:right-4"
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
