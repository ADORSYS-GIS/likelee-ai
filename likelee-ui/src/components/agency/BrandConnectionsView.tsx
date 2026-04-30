import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import {
  Link2Off,
  Eye,
  CheckCircle2,
  ArrowLeft,
  FileText,
  Download,
  User,
  Check,
  Search,
  Loader2,
  Plus,
  RefreshCw,
  X,
  Trash2,
  Send,
  Wand2,
  AlertCircle,
  ArrowRight,
  Lock,
  Mail,
  UserX,
  Clock,
} from "lucide-react";
import { CampaignBriefView } from "@/components/campaign-offers/CampaignBriefView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAgencyTalents } from "@/api/functions";
import { useAuth } from "@/auth/AuthProvider";
import {
  DashboardSectionHeader,
  DashboardTabRail,
} from "@/components/dashboard/DashboardResponsive";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTeamAccess } from "@/features/team/useTeamAccess";

const extractFirstNumber = (value: unknown): number => {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;

  // Only treat numbers as quantities when the text clearly expresses a count.
  // This avoids miscounting specs like "1080x1920" or "15 sec".
  const patterns: RegExp[] = [
    /\b(\d{1,3})\s*[x×]\b/i, // "3x"
    /\b[x×]\s*(\d{1,3})\b/i, // "x3"
    /\bqty\s*[:\-]?\s*(\d{1,3})\b/i, // "qty 3" / "qty:3"
    /\bquantity\s*[:\-]?\s*(\d{1,3})\b/i, // "quantity 3"
    /\b(\d{1,3})\s*(?:pcs?|pieces?)\b/i, // "3 pcs" / "3 pieces"
    /\b(\d{1,3})\s*(?:deliverables?|deliverable|assets?)\b/i, // "3 deliverables" / "2 assets"
  ];

  for (const re of patterns) {
    const match = raw.match(re);
    if (!match) continue;
    const parsed = Number.parseInt(match[1], 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  return 0;
};

const extractDeliverableCount = (value: unknown): number => {
  const text = String(value ?? "").trim();
  if (!text) return 0;

  const lines = text
    .split(/\n|,|;/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (lines.length === 0) return 0;

  const counted = lines.reduce((sum, line) => {
    const amount = extractFirstNumber(line);
    return sum + (amount > 0 ? amount : 1);
  }, 0);

  return counted > 0 ? counted : lines.length;
};

const BrandConnectionsView = ({
  onMessageTalent,
}: {
  onMessageTalent?: (creatorId: string) => void;
}) => {
  const { t } = useTranslation();
  const tBrand = (path: string, options?: Record<string, any>) => {
    const fallback = t(
      `agencyDashboard.analytics.brandConnections.${path}`,
      options,
    );
    return t(`agencyDashboard.brandConnections.${path}`, {
      ...(options || {}),
      defaultValue: fallback,
    });
  };
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { hasPermission, loading: accessLoading } = useTeamAccess("agency");
  const canViewConnections = hasPermission("view_brand_connections");
  const canManageConnections = hasPermission("manage_brand_connections");
  const canDisconnectBrands = hasPermission("disconnect_brand_connections");
  const isReadOnly = canViewConnections && !canManageConnections;
  const currentUserKey = String(profile?.id || user?.id || "").trim();

  const [activeTab, setActiveTab] = useState<
    | "connections"
    | "requests"
    | "offers"
    | "contract_hub"
    | "deliverables"
    | "feedback"
  >("connections");

  // Deliverables is handled in the main Agency sidebar; keep this tab as a redirect only.
  useEffect(() => {
    if (activeTab !== "deliverables") return;
    navigate("/AgencyDashboard?tab=deliverables");
    setActiveTab("connections");
  }, [activeTab, navigate]);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [selectedOfferId, setSelectedOfferId] = useState<string>("");
  const [packageDraftByOffer, setPackageDraftByOffer] = useState<
    Record<string, { title: string; message: string; packageId?: string }>
  >({});
  const [builderToken, setBuilderToken] = useState<string | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [currentContractId, setCurrentContractId] = useState<string | null>(
    null,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [contractTab, setContractTab] = useState("submissions");
  const [assignDialog, setAssignDialog] = useState<{
    open: boolean;
    offerId: string;
    talentId: string;
  }>({
    open: false,
    offerId: "",
    talentId: "",
  });
  const [assignSearch, setAssignSearch] = useState("");
  const [assignSelectedIds, setAssignSelectedIds] = useState<string[]>([]);
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignConfirmOpen, setAssignConfirmOpen] = useState(false);
  const [inviteRequiredDialog, setInviteRequiredDialog] = useState<{
    open: boolean;
    talentName: string;
    talentId: string;
  }>({
    open: false,
    talentName: "",
    talentId: "",
  });
  const [unassignConfirm, setUnassignConfirm] = useState<{
    open: boolean;
    offerId: string;
    assignmentId: string;
    talentName: string;
  }>({
    open: false,
    offerId: "",
    assignmentId: "",
    talentName: "",
  });
  const [messageDialog, setMessageDialog] = useState<{
    open: boolean;
    offerId: string;
    talentId: string;
    title: string;
    message: string;
    file?: File | null;
    sending: boolean;
  }>({
    open: false,
    offerId: "",
    talentId: "",
    title: "",
    message: "",
    file: null,
    sending: false,
  });

  const [sendPrecheckOpen, setSendPrecheckOpen] = useState(false);
  const [sendPrecheckTitle, setSendPrecheckTitle] = useState("");
  const [sendPrecheckBody, setSendPrecheckBody] =
    useState<React.ReactNode>(null);
  const [sendPrecheckActions, setSendPrecheckActions] = useState<
    { label: string; onClick: () => void; variant?: "default" | "outline" }[]
  >([]);

  // Load DocuSeal Builder script
  const loadDocuSealBuilder = () => {
    if (document.getElementById("docuseal-builder-script")) return;
    const script = document.createElement("script");
    script.id = "docuseal-builder-script";
    script.src = "https://cdn.docuseal.com/js/builder.js";
    script.async = true;
    document.head.appendChild(script);
  };

  const [seenCounts, setSeenCounts] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem("brand_connections_seen_counts");
    return saved ? JSON.parse(saved) : {};
  });

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
      const resp = await base44.get<{ offers?: any[] }>(
        "/api/campaign-offers/my",
        {
          params: { limit: 80 },
        },
      );
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
      const contracts = Array.isArray(resp?.contracts) ? resp.contracts : [];
      const refreshable = contracts.filter((contract: any) => {
        if (!contract) return false;
        const status = String(contract?.docuseal_status || "").toLowerCase();
        if (!status || status === "draft" || status === "completed")
          return false;
        if (["signed", "declined", "rejected"].includes(status)) return false;
        return Boolean(
          contract?.docuseal_submission_id || contract?.docuseal_slug,
        );
      });
      if (refreshable.length === 0) return contracts;
      const refreshed = await Promise.all(
        contracts.map(async (contract: any) => {
          const contractId = String(contract?.id || "").trim();
          if (!contractId) return contract;
          if (!refreshable.some((c: any) => c?.id === contract?.id))
            return contract;
          try {
            const refreshedResp = await base44.post<{ contract?: any }>(
              `/api/campaign-offers/${selectedOfferId}/contracts/${contractId}/refresh`,
              {},
            );
            return refreshedResp?.contract || contract;
          } catch {
            return contract;
          }
        }),
      );
      return refreshed;
    },
    refetchInterval: 5000,
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
    refetchInterval: 5000,
  });

  const rosterQuery = useQuery({
    queryKey: ["agency", "roster"],
    queryFn: async () => {
      const resp: any = await getAgencyTalents();
      const rows = Array.isArray(resp?.talents)
        ? resp.talents
        : Array.isArray(resp?.data?.talents)
          ? resp.data.talents
          : Array.isArray(resp)
            ? resp
            : [];
      return rows.map((row: any) => ({
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
    },
  });

  const offerAssignmentsQuery = useQuery({
    queryKey: ["agency", "offer-assignments", selectedOfferId],
    enabled: !!selectedOfferId,
    queryFn: async () => {
      const resp = await base44.get<{
        assignments?: any[];
        is_locked?: boolean;
      }>(`/api/campaign-offers/${selectedOfferId}/assignments`);
      return {
        assignments: Array.isArray(resp?.assignments) ? resp.assignments : [],
        // is_locked is true when the brand has finalized their package selection.
        // When true, assignments are immutable and the agency sees a read-only view.
        is_locked: Boolean(resp?.is_locked),
      };
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
  const roster = useMemo(() => {
    if (!Array.isArray(rosterQuery.data)) return [];
    return rosterQuery.data;
  }, [rosterQuery.data]);
  const assignedTalentIds = useMemo(() => {
    const assignments = offerAssignmentsQuery.data?.assignments || [];
    return new Set(
      assignments.map((a: any) =>
        String(
          a?.creator_id || a?.agency_users?.creator_id || a?.talent_id || "",
        ),
      ),
    );
  }, [offerAssignmentsQuery.data]);
  const feedbackItems = useMemo(() => {
    if (!Array.isArray(feedbackQuery.data)) return [];
    return feedbackQuery.data;
  }, [feedbackQuery.data]);

  const hasAssignedTalent = useMemo(
    () => (offerAssignmentsQuery.data?.assignments || []).length > 0,
    [offerAssignmentsQuery.data],
  );
  const selectedOfferLockInfo = useMemo(() => {
    const offerId = String(selectedOfferId || "").trim();
    if (!offerId)
      return { locked: false, contractSigned: false, packageFinalized: false };
    const offer = (offers || []).find(
      (o: any) => String(o?.id || "") === offerId,
    );
    const status = String(offer?.status || "")
      .trim()
      .toLowerCase();
    const pay = String(offer?.payment_status || "unpaid")
      .trim()
      .toLowerCase();
    const contractSigned = status === "contract_fully_signed";
    // Package finalized = brand has selected talents from the agency's package.
    // Assignments are immutable from this point forward.
    const packageFinalized = Boolean(offerAssignmentsQuery.data?.is_locked);
    const locked =
      packageFinalized ||
      (pay !== "unpaid" && pay !== "") ||
      status === "contract_sent" ||
      contractSigned;
    return { locked, contractSigned, packageFinalized };
  }, [offers, selectedOfferId, offerAssignmentsQuery.data]);
  const assignmentLockedForSelectedOffer = selectedOfferLockInfo.locked;
  const selectedOfferContractSigned = selectedOfferLockInfo.contractSigned;
  const selectedOfferPackageFinalized = selectedOfferLockInfo.packageFinalized;
  const assignmentLockedForOffer =
    !!assignDialog.offerId &&
    assignDialog.offerId === selectedOfferId &&
    assignmentLockedForSelectedOffer;
  const filteredRoster = useMemo(() => {
    const query = assignSearch.trim().toLowerCase();
    if (!query) return roster;
    return roster.filter((talent: any) => {
      const haystack = [
        talent?.stage_name,
        talent?.name,
        talent?.full_legal_name,
        talent?.email,
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");
      return haystack.includes(query);
    });
  }, [assignSearch, roster]);

  useEffect(() => {
    if (!assignDialog.open) return;
    const offerId = String(assignDialog.offerId || "").trim();
    if (offerId && offerId !== selectedOfferId) {
      setSelectedOfferId(offerId);
    }
  }, [assignDialog.open, assignDialog.offerId, selectedOfferId]);

  const agencyPayoutAccountStatusQuery = useQuery({
    queryKey: ["agency", "payouts", "account_status"],
    queryFn: async () => {
      try {
        return await base44.get<{
          connected?: boolean;
          payouts_enabled?: boolean;
          transfers_enabled?: boolean;
          last_error?: string;
          bank_last4?: string | null;
        }>("/api/agency/payouts/account_status");
      } catch {
        return {
          connected: false,
          payouts_enabled: false,
          transfers_enabled: false,
          last_error: "",
          bank_last4: null,
        };
      }
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const agencyStripeConnected =
    !!agencyPayoutAccountStatusQuery.data?.connected;
  const agencyStripeTransfersEnabled =
    !!agencyPayoutAccountStatusQuery.data?.transfers_enabled;
  const agencyStripeReadyForPayouts =
    agencyStripeConnected && agencyStripeTransfersEnabled;

  const openSendPrecheckModal = (opts: {
    title: string;
    body: React.ReactNode;
    actions: {
      label: string;
      onClick: () => void;
      variant?: "default" | "outline";
    }[];
  }) => {
    setSendPrecheckTitle(opts.title);
    setSendPrecheckBody(opts.body);
    setSendPrecheckActions(opts.actions);
    setSendPrecheckOpen(true);
  };

  const attemptSendContract = (offerId: string, contractId: string) => {
    if (busyIds.has(contractId)) return;

    if (!hasAssignedTalent) {
      openSendPrecheckModal({
        title: "Assign talents before sending",
        body: (
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              This offer has no assigned talents. Assign at least 1 talent
              before sending the contract.
            </p>
            <p className="text-xs text-gray-500">
              Assignments are locked after the contract is sent.
            </p>
          </div>
        ),
        actions: [
          {
            label: "Close",
            variant: "outline",
            onClick: () => setSendPrecheckOpen(false),
          },
        ],
      });
      return;
    }

    if (!agencyStripeConnected) {
      openSendPrecheckModal({
        title: "Connect Stripe before sending",
        body: (
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              Connect your agency Stripe account before sending contracts. This
              ensures payouts and commissions can be transferred correctly when
              the brand pays.
            </p>
          </div>
        ),
        actions: [
          {
            label: "Go to Payouts",
            onClick: () => {
              setSendPrecheckOpen(false);
              navigate("/AgencyDashboard?tab=payouts");
            },
          },
          {
            label: "Close",
            variant: "outline",
            onClick: () => setSendPrecheckOpen(false),
          },
        ],
      });
      return;
    }

    if (agencyStripeConnected && !agencyStripeTransfersEnabled) {
      openSendPrecheckModal({
        title: "Stripe transfers not enabled",
        body: (
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              Your Stripe account is connected, but Stripe reports that{" "}
              <span className="font-semibold">transfers are not enabled</span>{" "}
              for this account yet.
            </p>
            <p>
              If you send this contract now, the brand may be able to pay, but
              transfers to your agency and creators can fail until Stripe
              enables transfers.
            </p>
            <p className="text-xs text-gray-500">
              Recommendation: finish Stripe onboarding in Payouts. If transfers
              stay disabled, contact system support for help.
            </p>
          </div>
        ),
        actions: [
          {
            label: "Send anyway",
            onClick: () => {
              setSendPrecheckOpen(false);
              handleSendContract(offerId, contractId);
            },
          },
          {
            label: "Go to Payouts",
            variant: "outline",
            onClick: () => {
              setSendPrecheckOpen(false);
              navigate("/AgencyDashboard?tab=payouts");
            },
          },
        ],
      });
      return;
    }

    handleSendContract(offerId, contractId);
  };

  const builderSendDisabledReason = useMemo(() => {
    if (!selectedOfferId) return "Select an offer before sending.";
    if (!currentContractId) return "Select a contract before sending.";
    if (busyIds.has(currentContractId)) return "Sending…";
    return "";
  }, [busyIds, currentContractId, selectedOfferId]);

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
        title:
          action === "accept"
            ? t("agencyDashboard.brandConnections.toasts.requestAccepted")
            : t("agencyDashboard.brandConnections.toasts.requestDeclined"),
        description:
          action === "accept"
            ? t("agencyDashboard.brandConnections.toasts.requestApproved")
            : t("agencyDashboard.brandConnections.toasts.requestDeclinedDesc"),
      });
    } catch {
      toast({
        title: t("agencyDashboard.brandConnections.toasts.actionFailed"),
        description: t(
          "agencyDashboard.brandConnections.toasts.pleaseTryAgain",
        ),
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

  const handleAssignTalents = async () => {
    if (!assignDialog.offerId) return;
    if (assignSubmitting) return;
    if (assignmentLockedForOffer) {
      toast({
        title: t("agencyDashboard.brandConnections.toasts.assignmentsLocked"),
        description: t(
          "agencyDashboard.brandConnections.toasts.assignmentsLockedDesc",
        ),
        variant: "destructive",
      });
      return;
    }
    setAssignSubmitting(true);
    try {
      const offerId = assignDialog.offerId;
      const current = Array.isArray(offerAssignmentsQuery.data?.assignments)
        ? offerAssignmentsQuery.data.assignments
        : [];
      const currentByCreatorId = new Map<string, string>();
      current.forEach((a: any) => {
        const creatorScopedId = String(
          a?.creator_id || a?.agency_users?.creator_id || a?.talent_id || "",
        ).trim();
        const aid = String(a?.id || "").trim();
        if (creatorScopedId && aid)
          currentByCreatorId.set(creatorScopedId, aid);
      });

      const desiredIds = new Set(
        assignSelectedIds.map((id) => String(id || "").trim()).filter(Boolean),
      );
      const currentIds = new Set([...currentByCreatorId.keys()]);
      const toAdd = [...desiredIds].filter((id) => !currentIds.has(id));
      const toRemove = [...currentIds].filter((id) => !desiredIds.has(id));

      if (toAdd.length === 0 && toRemove.length === 0) {
        toast({
          title: "No changes",
          description: "Talent assignments are already up to date.",
        });
        setAssignDialog({ open: false, offerId: "", talentId: "" });
        setAssignSelectedIds([]);
        setAssignSearch("");
        return;
      }

      await Promise.all([
        ...toAdd.map((creatorId) =>
          base44.post(`/api/campaign-offers/${offerId}/assignments`, {
            creator_id: creatorId,
          }),
        ),
        ...toRemove.map((creatorId) => {
          const assignmentId = currentByCreatorId.get(creatorId);
          if (!assignmentId) return Promise.resolve(null);
          return base44.delete(
            `/api/campaign-offers/${offerId}/assignments/${assignmentId}`,
          );
        }),
      ]);
      queryClient.invalidateQueries({
        queryKey: ["agency", "offer-assignments", assignDialog.offerId],
      });
      setAssignDialog({ open: false, offerId: "", talentId: "" });
      setAssignSelectedIds([]);
      setAssignSearch("");
      toast({
        title: "Assignments updated",
        description: "Talent assignments saved successfully.",
      });
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

  const handleUnassignTalent = async () => {
    const offerId = String(unassignConfirm.offerId || "").trim();
    const assignmentId = String(unassignConfirm.assignmentId || "").trim();
    if (!offerId || !assignmentId) return;
    if (assignmentLockedForSelectedOffer) {
      toast({
        title: t("agencyDashboard.brandConnections.toasts.assignmentsLocked"),
        description: selectedOfferContractSigned
          ? t("agencyDashboard.brandConnections.toasts.contractAlreadySigned")
          : t("agencyDashboard.brandConnections.toasts.cantUnassignAfterSent"),
        variant: "destructive",
      });
      return;
    }
    setAssignSubmitting(true);
    try {
      await base44.delete(
        `/api/campaign-offers/${encodeURIComponent(offerId)}/assignments/${encodeURIComponent(assignmentId)}`,
      );
      queryClient.invalidateQueries({
        queryKey: ["agency", "offer-assignments", offerId],
      });
      toast({
        title: "Talent unassigned",
        description: "Talent was removed from this offer.",
      });
    } catch (e: any) {
      toast({
        title: "Unassign failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setAssignSubmitting(false);
      setUnassignConfirm({
        open: false,
        offerId: "",
        assignmentId: "",
        talentName: "",
      });
    }
  };

  const handleSendTalentMessage = async () => {
    if (!messageDialog.offerId || !messageDialog.talentId) return;
    if (messageDialog.sending) return;
    setMessageDialog((prev) => ({ ...prev, sending: true }));
    try {
      let fileUrl: string | undefined;
      if (messageDialog.file) {
        const fd = new FormData();
        fd.append("file", messageDialog.file);
        const uploadResp = await base44.post<{ file_url?: string }>(
          `/api/campaign-offers/${messageDialog.offerId}/asset-requests/upload`,
          fd,
        );
        fileUrl = uploadResp?.file_url;
      }
      await base44.post(
        `/api/campaign-offers/${messageDialog.offerId}/asset-requests`,
        {
          talent_id: messageDialog.talentId,
          title: messageDialog.title || undefined,
          message: messageDialog.message || undefined,
          file_url: fileUrl,
        },
      );
      setMessageDialog({
        open: false,
        offerId: "",
        talentId: "",
        title: "",
        message: "",
        file: null,
        sending: false,
      });
      toast({ title: "Message sent" });
    } catch (e: any) {
      toast({
        title: "Message failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
      setMessageDialog((prev) => ({ ...prev, sending: false }));
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
        title: t("agencyDashboard.brandConnections.toasts.disconnected"),
        description: t(
          "agencyDashboard.brandConnections.toasts.disconnectedDesc",
        ),
      });
    } catch {
      toast({
        title: t("agencyDashboard.brandConnections.toasts.disconnectFailed"),
        description: t(
          "agencyDashboard.brandConnections.toasts.pleaseTryAgain",
        ),
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

  const respondToOffer = async (
    offerId: string,
    action: "accept" | "decline",
  ) => {
    if (!offerId || busyIds.has(offerId)) return;
    setBusyIds((prev) => new Set(prev).add(offerId));
    try {
      await base44.post(`/api/campaign-offers/${offerId}/respond`, { action });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["agency", "campaign-offers-my"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["agency", "offer-contracts", offerId],
        }),
      ]);
      toast({
        title: action === "accept" ? "Offer accepted" : "Offer declined",
      });
    } catch (e: any) {
      toast({
        title: t("agencyDashboard.brandConnections.toasts.actionFailed"),
        description:
          e?.message ||
          t("agencyDashboard.brandConnections.toasts.pleaseTryAgainShort"),
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
      queryClient.invalidateQueries({
        queryKey: ["agency", "offer-contracts", offerId],
      });
      // Automatically open builder for the new contract
      handlePrepareContract(offerId, resp.id);
    } catch (err: any) {
      console.error("upload_offer_contract failed", err);
      toast({
        title: "Upload failed",
        description:
          "Failed to upload contract. Please try again with a valid PDF.",
        variant: "destructive" as any,
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
      console.error("get_builder_token failed", err);
      toast({
        title: "Failed to load builder",
        description:
          "Could not load the contract builder. Please refresh and try again.",
        variant: "destructive" as any,
      });
    }
  };

  const handleSendContract = async (offerId: string, contractId: string) => {
    if (busyIds.has(contractId)) return;
    if (!agencyStripeConnected) {
      toast({
        title: "Connect Stripe first",
        description:
          "Connect your agency Stripe account before sending contracts. Brands can’t pay until payout setup is complete.",
        variant: "destructive",
      });
      return;
    }
    setBusyIds((prev) => new Set(prev).add(contractId));
    try {
      const resp = await base44.post<{ contract?: any }>(
        `/api/campaign-offers/${offerId}/contracts/send`,
        {
          contract_id: contractId,
        },
      );
      const contract = resp?.contract;
      const status = String(contract?.docuseal_status || "").toLowerCase();
      const agencySignUrl =
        String(contract?.meta?.agency_signing_url || "").trim() ||
        String(contract?.meta?.docuseal_signing_url || "").trim();
      if (status === "agency_pending" && agencySignUrl) {
        window.open(agencySignUrl, "_blank");
        toast({
          title: "Agency signature required",
          description: "Sign the contract to release it to the brand.",
        });
      } else {
        toast({
          title: "Contract sent",
          description: "The contract has been sent to the brand.",
        });
      }
      queryClient.invalidateQueries({
        queryKey: ["agency", "offer-contracts", offerId],
      });
      queryClient.invalidateQueries({
        queryKey: ["agency", "campaign-offers-my"],
      });
    } catch (err: any) {
      // Avoid showing raw backend/API errors to users. Log details for debugging.
      console.error("send_offer_contract failed", err);
      const msg = String(err?.message || "");
      toast({
        title: "Send failed",
        description: msg.includes("no_talents_assigned")
          ? "Assign at least 1 talent to this offer before sending the contract."
          : msg.toLowerCase().includes("template does not contain fields")
            ? "This PDF template has no signature fields. Open Prepare, place fields, save, then try again."
            : "Failed to send contract. Please try again.",
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
      queryClient.invalidateQueries({
        queryKey: ["agency", "offer-contracts", offerId],
      });
      queryClient.invalidateQueries({
        queryKey: ["agency", "campaign-offers-my"],
      });
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

  const handleDownloadContract = async (
    offerId: string,
    contractId: string,
    fileName?: string,
  ) => {
    if (busyIds.has(contractId)) return;
    setBusyIds((prev) => new Set(prev).add(contractId));
    try {
      const response = await base44.getRaw(
        `/api/campaign-offers/${offerId}/contracts/${contractId}/download`,
      );
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to download contract.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download =
        fileName && fileName.trim()
          ? fileName.toLowerCase().endsWith(".pdf")
            ? fileName.trim()
            : `${fileName.trim()}.pdf`
          : "signed-contract.pdf";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({
        title: "Download failed",
        description:
          err?.message || "We couldn't download the signed contract.",
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
    if (!confirm("Are you sure you want to delete this contract draft?"))
      return;
    if (busyIds.has(contractId)) return;
    setBusyIds((prev) => new Set(prev).add(contractId));
    try {
      await base44.delete(
        `/api/campaign-offers/${offerId}/contracts/${contractId}`,
      );
      toast({
        title: "Contract deleted",
        description: "Draft removed successfully.",
      });
      queryClient.invalidateQueries({
        queryKey: ["agency", "offer-contracts", offerId],
      });
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
        queryClient.invalidateQueries({
          queryKey: ["agency", "campaign-offers-my"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["agency", "package-feedback"],
        }),
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

  // Track viewed feedback items in localStorage (keyed by user ID to avoid cross-account leakage)
  const [viewedFeedbackIds, setViewedFeedbackIds] = useState<Set<string>>(
    () => {
      if (typeof window === "undefined") return new Set(); // SSR guard
      try {
        const userKey = currentUserKey || "anonymous";
        const saved = localStorage.getItem(`viewed_feedback_ids_${userKey}`);
        return saved ? new Set(JSON.parse(saved)) : new Set();
      } catch {
        return new Set();
      }
    },
  );

  // Save viewed feedback IDs to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return; // SSR guard
    const userKey = currentUserKey || "anonymous";
    localStorage.setItem(
      `viewed_feedback_ids_${userKey}`,
      JSON.stringify(Array.from(viewedFeedbackIds)),
    );
  }, [currentUserKey, viewedFeedbackIds]);

  // Mark feedback as viewed when on feedback tab
  useEffect(() => {
    if (activeTab === "feedback" && feedbackItems.length > 0) {
      const newViewedIds = new Set(viewedFeedbackIds);
      let hasNewViews = false;

      feedbackItems.forEach((item: any) => {
        const feedbackId = String(item?.id || "");
        if (feedbackId && !newViewedIds.has(feedbackId)) {
          newViewedIds.add(feedbackId);
          hasNewViews = true;
        }
      });

      if (hasNewViews) {
        setViewedFeedbackIds(newViewedIds);
      }
    }
  }, [activeTab, feedbackItems, viewedFeedbackIds]);

  // Calculate unviewed feedback count
  const unviewedFeedbackCount = useMemo(() => {
    return feedbackItems.filter((item: any) => {
      const feedbackId = String(item?.id || "");
      return feedbackId && !viewedFeedbackIds.has(feedbackId);
    }).length;
  }, [feedbackItems, viewedFeedbackIds]);

  const pendingRequests = requests.length;
  const pendingOffers = offers.filter((o) =>
    ["sent", "viewed"].includes(o.status),
  ).length;
  const pendingFeedback = unviewedFeedbackCount;

  // Always show badges - they disappear when count reaches 0
  const showRequestsBadge = pendingRequests > 0;
  const showOffersBadge = pendingOffers > 0;
  const showFeedbackBadge = pendingFeedback > 0;

  if (accessLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px]">
        <Loader2 className="h-10 w-10 text-gray-400 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">
          {tBrand("ui.verifyingAccess")}
        </p>
      </div>
    );
  }

  if (!canViewConnections) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {tBrand("title")}
          </h2>
          <p className="text-gray-600">{tBrand("ui.accessRestricted")}</p>
        </div>
        <Card className="p-12 flex flex-col items-center justify-center text-center border-dashed border-2">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {tBrand("ui.permissionRequired")}
          </h3>
          <p className="text-gray-600 max-w-sm">
            {tBrand("ui.permissionDescription")}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isReadOnly && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <Eye className="w-5 h-5 text-amber-600" />
          <div>
            <p className="font-bold text-amber-800">
              {tBrand("ui.viewOnlyTitle")}
            </p>
            <p className="text-sm text-amber-700">
              {tBrand("ui.viewOnlyDescription")}
            </p>
          </div>
        </div>
      )}
      <DashboardSectionHeader
        title={tBrand("title")}
        description={tBrand("ui.subtitle")}
      />

      {/* Mobile Tabs: Horizontal Scroll */}
      <div className="flex gap-2 mb-6 sm:hidden overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {[
          {
            id: "connections",
            label: tBrand("connectedBrands"),
            badge: null,
            active: activeTab === "connections",
            onClick: () => setActiveTab("connections"),
          },
          {
            id: "requests",
            label: tBrand("requests"),
            badge: showRequestsBadge ? pendingRequests : null,
            active: activeTab === "requests",
            onClick: () => setActiveTab("requests"),
          },
          {
            id: "offers",
            label: tBrand("brandOffers"),
            badge: showOffersBadge ? pendingOffers : null,
            active: activeTab === "offers",
            onClick: () => setActiveTab("offers"),
          },
          {
            id: "contract_hub",
            label: tBrand("contractHub.title"),
            badge: null,
            active: activeTab === "contract_hub",
            onClick: () => setActiveTab("contract_hub"),
          },
          {
            id: "deliverables",
            label: tBrand("deliverables"),
            badge: null,
            active: false,
            onClick: () => {
              navigate("/AgencyDashboard?tab=deliverables");
              setActiveTab("connections");
            },
          },
          {
            id: "feedback",
            label: tBrand("packageFeedback"),
            badge: showFeedbackBadge ? pendingFeedback : null,
            active: activeTab === "feedback",
            onClick: () => setActiveTab("feedback"),
          },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            className={`min-h-[40px] rounded-xl px-4 py-2 text-center text-[13px] font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              item.active
                ? "bg-indigo-50/70 text-indigo-700 shadow-sm ring-1 ring-indigo-700/10"
                : "bg-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-transparent"
            }`}
          >
            {item.label}
            {item.badge !== null && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-indigo-600 rounded-full min-w-[20px]">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="hidden sm:block">
        <DashboardTabRail
          items={[
            {
              id: "connections",
              label: tBrand("connectedBrands"),
              active: activeTab === "connections",
              onClick: () => setActiveTab("connections"),
            },
            {
              id: "requests",
              label: (
                <span className="flex items-center gap-2">
                  {tBrand("requests")}
                  {showRequestsBadge && (
                    <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-indigo-600 rounded-full min-w-[20px]">
                      {pendingRequests}
                    </span>
                  )}
                </span>
              ),
              active: activeTab === "requests",
              onClick: () => setActiveTab("requests"),
            },
            {
              id: "offers",
              label: (
                <span className="flex items-center gap-2">
                  {tBrand("brandOffers")}
                  {showOffersBadge && (
                    <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-indigo-600 rounded-full min-w-[20px]">
                      {pendingOffers}
                    </span>
                  )}
                </span>
              ),
              active: activeTab === "offers",
              onClick: () => setActiveTab("offers"),
            },
            {
              id: "contract_hub",
              label: tBrand("contractHub.title"),
              active: activeTab === "contract_hub",
              onClick: () => setActiveTab("contract_hub"),
            },
            {
              id: "deliverables",
              label: tBrand("deliverables"),
              active: false,
              onClick: () => {
                navigate("/AgencyDashboard?tab=deliverables");
                setActiveTab("connections");
              },
            },
            {
              id: "feedback",
              label: (
                <span className="flex items-center gap-2">
                  {tBrand("packageFeedback")}
                  {showFeedbackBadge && (
                    <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-indigo-600 rounded-full min-w-[20px]">
                      {pendingFeedback}
                    </span>
                  )}
                </span>
              ),
              active: activeTab === "feedback",
              onClick: () => setActiveTab("feedback"),
            },
          ]}
        />
      </div>

      {activeTab === "connections" && (
        <Card className="p-6 border border-gray-200 rounded-xl">
          <h3 className="text-lg font-bold text-gray-900 mb-3">
            {tBrand("connectedBrands")}
          </h3>
          {connectionsQuery.isLoading && (
            <p className="text-sm text-gray-500">{tBrand("loadingBrands")}</p>
          )}
          {!connectionsQuery.isLoading && connectionsQuery.error && (
            <p className="text-sm text-red-600">{tBrand("loadBrandsFailed")}</p>
          )}
          {!connectionsQuery.isLoading &&
            !connectionsQuery.error &&
            connections.length === 0 && (
              <p className="text-sm text-gray-500">{tBrand("noBrands")}</p>
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
                          {email ||
                            t(
                              "agencyDashboard.analytics.brandConnections.ui.noEmailProvided",
                            )}
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  disabled={
                                    !brandId || isBusy || !canDisconnectBrands
                                  }
                                  onClick={() => disconnectBrand(brandId)}
                                  aria-label={t(
                                    "agencyDashboard.analytics.brandConnections.ui.disconnectFromBrand",
                                  )}
                                  className="disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Link2Off className="h-4 w-4" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {!canDisconnectBrands && (
                              <TooltipContent>
                                {t(
                                  "agencyDashboard.analytics.brandConnections.ui.noDisconnectPermission",
                                )}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                        <div>
                          <Badge className="bg-green-100 text-green-700 border border-green-300">
                            {tBrand("ui.connected")}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            {tBrand("ui.since", {
                              date: connectedAt,
                            })}
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
          <h3 className="text-lg font-bold text-gray-900 mb-3">
            {tBrand("requests")}
          </h3>
          {requestsQuery.isLoading && (
            <p className="text-sm text-gray-500">
              {tBrand("ui.loadingRequests")}
            </p>
          )}
          {!requestsQuery.isLoading && requestsQuery.error && (
            <p className="text-sm text-red-600">
              {tBrand("ui.failedToLoadRequests")}
            </p>
          )}
          {!requestsQuery.isLoading &&
            !requestsQuery.error &&
            requests.length === 0 && (
              <p className="text-sm text-gray-500">
                {tBrand("ui.noPendingRequests")}
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
                    req?.brands?.company_name ||
                      req?.brand_name ||
                      t("agencyDashboard.brandConnections.ui.brandFallback"),
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
                            {email ||
                              t(
                                "agencyDashboard.analytics.brandConnections.ui.noEmailProvided",
                              )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-amber-100 text-amber-700 border border-amber-300">
                            {t("agencyDashboard.brandConnections.ui.pending")}
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
                        {t("agencyDashboard.brandConnections.ui.requestedOn", {
                          date: createdAt,
                        })}
                      </p>
                      {message && (
                        <p className="text-sm text-gray-800 mb-4 italic">
                          "{message}"
                        </p>
                      )}
                      <div className="flex gap-3">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  onClick={() =>
                                    updateStatus(requestId, "accept")
                                  }
                                  disabled={isBusy || !canManageConnections}
                                  className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isBusy
                                    ? t(
                                        "agencyDashboard.brandConnections.ui.working",
                                      )
                                    : t(
                                        "agencyDashboard.brandConnections.ui.accept",
                                      )}
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {!canManageConnections && (
                              <TooltipContent>
                                {t(
                                  "agencyDashboard.brandConnections.ui.noAcceptRequestPermission",
                                )}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  variant="outline"
                                  onClick={() =>
                                    updateStatus(requestId, "decline")
                                  }
                                  disabled={isBusy || !canManageConnections}
                                  className="border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {t(
                                    "agencyDashboard.brandConnections.ui.decline",
                                  )}
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {!canManageConnections && (
                              <TooltipContent>
                                {t(
                                  "agencyDashboard.brandConnections.ui.noDeclineRequestPermission",
                                )}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </Card>
      )}

      {activeTab === "offers" && (
        <>
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
                      {tBrand("brandOffers")}
                    </button>
                  ) : (
                    tBrand("brandOffers")
                  )}
                </h3>
              </div>

              {offersQuery.isLoading && (
                <p className="text-sm text-gray-500">
                  {t("agencyDashboard.brandConnections.ui.loadingOffers")}
                </p>
              )}

              {!offersQuery.isLoading && offers.length === 0 && (
                <p className="text-sm text-gray-500">
                  {t("agencyDashboard.brandConnections.ui.noOffers")}
                </p>
              )}

              {selectedOfferId ? (
                (() => {
                  const offer = offers.find(
                    (o: any) => String(o.id) === selectedOfferId,
                  );
                  if (!offer) {
                    return (
                      <div className="p-8 text-center">
                        <p className="text-gray-500 mb-4">
                          {t(
                            "agencyDashboard.brandConnections.ui.offerNotFound",
                          )}
                        </p>
                        <Button onClick={() => setSelectedOfferId("")}>
                          {t("agencyDashboard.brandConnections.ui.backToList")}
                        </Button>
                      </div>
                    );
                  }

                  const status = String(offer?.status || "sent");
                  const isPending = ["sent", "viewed"].includes(status);
                  const isAccepted = status === "accepted";
                  const isFullySigned = new Set([
                    "contract_fully_signed",
                    "signed",
                    "fully_signed",
                    "completed",
                  ]).has(status.toLowerCase());

                  return (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                      {/* Fixed Header Style */}
                      <div className="bg-gray-50 px-6 py-6 border-b border-gray-200">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <FileText className="h-6 w-6 text-indigo-600" />
                              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                                {offer?.brand_campaigns?.name ||
                                  "Campaign Offer"}
                              </h2>
                            </div>
                            <p className="text-gray-500 font-medium ml-9">
                              {offer?.offer_title || "Direct Request"}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge
                              className={`px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                                isAccepted
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-indigo-50 text-indigo-700 border-indigo-200"
                              }`}
                            >
                              {status.replace(/_/g, " ")}
                            </Badge>
                            {isFullySigned && (
                              <Badge
                                className={`px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                                  offer?.payment_status === "paid"
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                    : "bg-amber-100 text-amber-800 border-amber-200"
                                }`}
                              >
                                {offer?.payment_status === "paid"
                                  ? "Paid"
                                  : "Awaiting Payment"}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="p-6 md:p-8 space-y-8">
                        {/* Action Bar */}
                        <div className="flex flex-wrap items-center gap-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50">
                          {isPending && (
                            <>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span>
                                      <Button
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={
                                          busyIds.has(selectedOfferId) ||
                                          !canManageConnections
                                        }
                                        onClick={() =>
                                          respondToOffer(
                                            selectedOfferId,
                                            "accept",
                                          )
                                        }
                                      >
                                        Accept Offer
                                      </Button>
                                    </span>
                                  </TooltipTrigger>
                                  {!canManageConnections && (
                                    <TooltipContent>
                                      Your role cannot accept offers
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span>
                                      <Button
                                        variant="outline"
                                        className="border-red-200 text-red-600 hover:bg-red-50 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={
                                          busyIds.has(selectedOfferId) ||
                                          !canManageConnections
                                        }
                                        onClick={() =>
                                          respondToOffer(
                                            selectedOfferId,
                                            "decline",
                                          )
                                        }
                                      >
                                        Decline
                                      </Button>
                                    </span>
                                  </TooltipTrigger>
                                  {!canManageConnections && (
                                    <TooltipContent>
                                      Your role cannot decline offers
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            </>
                          )}
                          {isAccepted && (
                            <>
                              {(() => {
                                const offerPkg = (
                                  offerPackagesQuery.data || []
                                ).find(
                                  (p: any) =>
                                    String(p.offer_id) === selectedOfferId,
                                );
                                if (offerPkg) {
                                  const token =
                                    offerPkg.meta?.agency_package_token;
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
                                          onClick={() =>
                                            window.open(
                                              `/share/package/${token}`,
                                              "_blank",
                                            )
                                          }
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
                                      navigate(
                                        "/AgencyDashboard?tab=packages",
                                        {
                                          state: {
                                            fromOfferId: selectedOfferId,
                                            fromOfferBrandId: String(
                                              offer?.brand_id || "",
                                            ).trim(),
                                          },
                                        },
                                      );
                                    }}
                                  >
                                    Build & Send Talent Package
                                  </Button>
                                );
                              })()}
                            </>
                          )}
                          {isFullySigned &&
                            offer?.payment_status !== "paid" && (
                              <div className="w-full flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                                <span className="text-amber-700 text-sm font-semibold">
                                  ⏳ Brand has not yet completed payment.
                                  Deliverable uploads and submissions are
                                  disabled until paid.
                                </span>
                              </div>
                            )}
                          {(() => {
                            const pay = String(
                              offer?.payment_status || "unpaid",
                            ).toLowerCase();
                            const canEdit =
                              pay !== "processing" &&
                              pay !== "paid" &&
                              !assignmentLockedForSelectedOffer;
                            return (
                              <Button
                                variant="outline"
                                className="border-indigo-200 text-indigo-700 font-bold"
                                disabled={!canEdit}
                                onClick={() =>
                                  setAssignDialog({
                                    open: true,
                                    offerId: selectedOfferId,
                                    talentId: "",
                                  })
                                }
                                title={
                                  assignmentLockedForSelectedOffer
                                    ? selectedOfferContractSigned
                                      ? "Contract is already signed. Assigned talents can’t be changed."
                                      : "Assignments are locked after the contract is sent."
                                    : undefined
                                }
                              >
                                <User className="h-4 w-4 mr-2" />
                                {tBrand("contractHub.assignTalent", {
                                  defaultValue: "Assign Talent",
                                })}
                              </Button>
                            );
                          })()}
                          {assignmentLockedForSelectedOffer && (
                            <p className="text-xs text-gray-500">
                              {selectedOfferContractSigned
                                ? "Contract is already signed and you can’t change assigned talents."
                                : "Talent assignments are locked because the contract was already sent."}
                            </p>
                          )}
                        </div>

                        <div className="rounded-xl border border-indigo-100 bg-white p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-gray-900">
                              Assigned Talent
                            </p>
                          </div>
                          {selectedOfferPackageFinalized ? (
                            <>
                              <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg">
                                <Lock className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                                <p className="text-xs font-semibold text-indigo-800">
                                  The brand has reviewed your package and
                                  finalized their talent selection. These
                                  talents are automatically assigned to the
                                  contract.
                                </p>
                              </div>
                              {(offerAssignmentsQuery.data?.assignments || [])
                                .length === 0 ? (
                                <p className="text-xs text-gray-500">
                                  No talents were auto-assigned. Contact support
                                  if this is unexpected.
                                </p>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {(
                                    offerAssignmentsQuery.data?.assignments ||
                                    []
                                  ).map((a: any) => {
                                    const talent = a?.agency_users || {};
                                    const tid = String(a?.talent_id || "");
                                    const assignmentId = String(a?.id || "");
                                    const creatorId = String(
                                      a?.creator_id ||
                                        a?.agency_users?.creator_id ||
                                        "",
                                    ).trim();
                                    return (
                                      <div
                                        key={String(a?.id)}
                                        className="border border-gray-200 rounded-lg p-3 flex items-center justify-between gap-3"
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                            <User className="h-4 w-4 text-gray-500" />
                                          </div>
                                          <div>
                                            <p className="text-sm font-semibold text-gray-900">
                                              {talent?.stage_name ||
                                                talent?.full_legal_name ||
                                                "Talent"}
                                            </p>
                                            <p className="text-xs text-green-600 font-medium">
                                              Selected by brand
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              if (
                                                creatorId &&
                                                onMessageTalent
                                              ) {
                                                onMessageTalent(creatorId);
                                              } else {
                                                // Fallback: open asset request dialog
                                                setMessageDialog({
                                                  open: true,
                                                  offerId: selectedOfferId,
                                                  talentId: tid,
                                                  title: "",
                                                  message: "",
                                                  file: null,
                                                  sending: false,
                                                });
                                              }
                                            }}
                                          >
                                            Send Message
                                          </Button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </>
                          ) : (
                            // Package sent but brand hasn't reviewed yet
                            <div className="flex flex-col items-center gap-3 py-4 px-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
                                <Clock className="h-4 w-4 text-amber-600" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-amber-900">
                                  Waiting for brand to select talents
                                </p>
                                <p className="text-xs text-amber-700 mt-1">
                                  The brand will review your package and choose
                                  which talents they want. Once they confirm
                                  their selection, the talents will be
                                  automatically assigned here and you can
                                  proceed to create the contract.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Full brief — shown directly, no duplicate summary */}
                        {offer?.brief_snapshot &&
                        typeof offer.brief_snapshot === "object" ? (
                          <div className="rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <CampaignBriefView
                              brief={offer.brief_snapshot}
                              brandName={String(
                                offer?.brand_campaigns?.brands?.name || "Brand",
                              )}
                              campaignName={String(
                                offer?.brand_campaigns?.name || "Campaign",
                              )}
                            />
                          </div>
                        ) : offer?.message ? (
                          <div className="bg-slate-50 p-6 rounded-2xl border-l-4 border-indigo-400 italic text-gray-700 text-lg leading-relaxed">
                            "{String(offer.message)}"
                          </div>
                        ) : (
                          <div className="p-12 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                            <p className="text-gray-400 font-medium">
                              No detailed brief attached to this offer.
                            </p>
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
                    const isFullySigned = new Set([
                      "contract_fully_signed",
                      "signed",
                      "fully_signed",
                      "completed",
                    ]).has(status.toLowerCase());

                    const bs =
                      offer?.brief_snapshot &&
                      typeof offer.brief_snapshot === "object"
                        ? offer.brief_snapshot
                        : null;
                    const briefVal = (key: string, fallback = "") => {
                      if (!bs) return fallback;
                      const v = bs[key];
                      const t =
                        v !== null && v !== undefined ? String(v).trim() : "";
                      return t || fallback;
                    };
                    const reels = briefVal("deliverables_reels");
                    const heroImg = briefVal("deliverables_hero_image");
                    const explicitExpected = Number.parseInt(
                      briefVal("total_expected_deliverables"),
                      10,
                    );
                    const requiredDeliverablesText = briefVal(
                      "required_deliverables",
                    );
                    const requiredDeliverablesCount = extractDeliverableCount(
                      requiredDeliverablesText,
                    );
                    const reelsCount = extractFirstNumber(reels);
                    const heroCount = extractFirstNumber(heroImg);
                    const fallbackHero =
                      heroCount > 0 ? heroCount : heroImg ? 1 : 0;
                    const deliverablesCount =
                      Number.isFinite(explicitExpected) && explicitExpected > 0
                        ? explicitExpected
                        : requiredDeliverablesCount > 0
                          ? requiredDeliverablesCount
                          : reelsCount + fallbackHero;
                    const deliverablesSummary =
                      deliverablesCount > 0
                        ? `${deliverablesCount} deliverable${deliverablesCount === 1 ? "" : "s"}`
                        : [reels, heroImg].filter(Boolean).join(", ") || "—";
                    const launchDate = briefVal("overview_launch_date");
                    const deadlineDate = briefVal("budget_submission_deadline");
                    const budgetTotal = briefVal("budget_total");
                    const budgetCreator = briefVal("budget_creator_payment");

                    return (
                      <div
                        key={offerId}
                        className="rounded-xl border-2 border-blue-200 bg-white shadow-sm overflow-hidden cursor-pointer hover:border-blue-400 hover:shadow-md transition-all"
                        onClick={() => setSelectedOfferId(offerId)}
                      >
                        {/* Row header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-blue-100 bg-white gap-4">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-gray-900 text-base tracking-tight truncate">
                                {offer?.brand_campaigns?.name ||
                                  offer?.offer_title ||
                                  "Campaign Offer"}
                              </h4>
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                                {offer?.offer_title || "Direct Request"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <Badge
                              className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
                                isAccepted
                                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                  : "bg-indigo-100 text-indigo-700 border-indigo-200"
                              }`}
                            >
                              {status.replace(/_/g, " ")}
                            </Badge>
                            {isFullySigned && (
                              <Badge
                                className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
                                  offer?.payment_status === "paid"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                }`}
                              >
                                {offer?.payment_status === "paid"
                                  ? "Paid"
                                  : "Unpaid"}
                              </Badge>
                            )}
                            {isPending && (
                              <>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span>
                                        <Button
                                          size="sm"
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                          disabled={
                                            busyIds.has(offerId) ||
                                            !canManageConnections
                                          }
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            respondToOffer(offerId, "accept");
                                          }}
                                        >
                                          Accept
                                        </Button>
                                      </span>
                                    </TooltipTrigger>
                                    {!canManageConnections && (
                                      <TooltipContent>
                                        Your role cannot accept offers
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="border-red-200 text-red-600 hover:bg-red-50 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                          disabled={
                                            busyIds.has(offerId) ||
                                            !canManageConnections
                                          }
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            respondToOffer(offerId, "decline");
                                          }}
                                        >
                                          Decline
                                        </Button>
                                      </span>
                                    </TooltipTrigger>
                                    {!canManageConnections && (
                                      <TooltipContent>
                                        Your role cannot decline offers
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
                              </>
                            )}
                            {isAccepted &&
                              (() => {
                                const offerPkg = (
                                  offerPackagesQuery.data || []
                                ).find(
                                  (p: any) => String(p.offer_id) === offerId,
                                );
                                if (offerPkg) {
                                  const token =
                                    offerPkg.meta?.agency_package_token;
                                  const isFinalized =
                                    offerPkg.status === "feedback_received";
                                  // Resolve selected talent names from the package
                                  const selectedIds: string[] = Array.isArray(
                                    offerPkg.meta?.selected_talent_ids,
                                  )
                                    ? offerPkg.meta.selected_talent_ids
                                        .map((id: any) =>
                                          String(id || "").trim(),
                                        )
                                        .filter(Boolean)
                                    : [];
                                  const pkgItems: any[] = Array.isArray(
                                    offerPkg.package_snapshot?.items,
                                  )
                                    ? offerPkg.package_snapshot.items
                                    : [];
                                  const selectedTalentNames = pkgItems
                                    .filter((item: any) => {
                                      const id = String(
                                        item?.talent_id || item?.id || "",
                                      ).trim();
                                      return id && selectedIds.includes(id);
                                    })
                                    .map(
                                      (item: any) =>
                                        item?.talent_name ||
                                        item?.talent?.stage_name ||
                                        item?.talent?.full_legal_name ||
                                        item?.talent?.full_name ||
                                        "Talent",
                                    );

                                  return (
                                    <div className="flex flex-col gap-2 w-full">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        {isFinalized ? (
                                          <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 flex items-center gap-1.5 px-3 py-1">
                                            <Lock className="h-3 w-3" />
                                            Brand Selected Talents
                                          </Badge>
                                        ) : (
                                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1.5 px-3 py-1">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Package Sent — Awaiting Brand Review
                                          </Badge>
                                        )}
                                        {token && !isFinalized && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="font-bold text-xs"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              window.open(
                                                `/share/package/${token}`,
                                                "_blank",
                                              );
                                            }}
                                          >
                                            View Package
                                          </Button>
                                        )}
                                      </div>
                                      {isFinalized &&
                                        selectedTalentNames.length > 0 && (
                                          <div className="flex flex-wrap gap-1.5 mt-1">
                                            {selectedTalentNames.map(
                                              (name: string, idx: number) => (
                                                <span
                                                  key={idx}
                                                  className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                                                >
                                                  <CheckCircle2 className="h-2.5 w-2.5 text-indigo-600" />
                                                  {name}
                                                </span>
                                              ),
                                            )}
                                            <button
                                              className="text-[11px] font-bold text-indigo-600 underline underline-offset-2 ml-1"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedOfferId(offerId);
                                              }}
                                            >
                                              View details →
                                            </button>
                                          </div>
                                        )}
                                      {isFinalized &&
                                        selectedTalentNames.length === 0 && (
                                          <p className="text-[11px] text-indigo-700 font-medium">
                                            Open offer details to see assigned
                                            talents.
                                          </p>
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
                                      navigate(
                                        "/AgencyDashboard?tab=packages",
                                        {
                                          state: {
                                            fromOfferId: offerId,
                                            fromOfferBrandId: String(
                                              offer?.brand_id || "",
                                            ).trim(),
                                          },
                                        },
                                      );
                                    }}
                                  >
                                    Build Package
                                  </Button>
                                );
                              })()}
                            {isFullySigned && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-indigo-200 text-indigo-700 font-bold"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAssignDialog({
                                    open: true,
                                    offerId,
                                    talentId: "",
                                  });
                                }}
                              >
                                <User className="h-4 w-4 mr-2" />
                                {tBrand("contractHub.assignTalent", {
                                  defaultValue: "Assign Talent",
                                })}
                              </Button>
                            )}
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
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                              Deliverables
                            </p>
                            <p className="text-sm text-gray-800">
                              {deliverablesSummary}
                            </p>
                          </div>

                          {/* Timeline + Budget */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                                Timeline
                              </p>
                              {launchDate && (
                                <p className="text-sm text-gray-800">
                                  Start: {launchDate}
                                </p>
                              )}
                              {deadlineDate && (
                                <p className="text-sm text-gray-800">
                                  Due: {deadlineDate}
                                </p>
                              )}
                              {!launchDate && !deadlineDate && (
                                <p className="text-sm text-gray-400">
                                  Not specified
                                </p>
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                                Budget
                              </p>
                              {budgetTotal && (
                                <p className="text-sm font-bold text-gray-900">
                                  Total: {budgetTotal}
                                </p>
                              )}
                              {budgetCreator && (
                                <p className="text-sm text-gray-700">
                                  Creator: {budgetCreator}
                                </p>
                              )}
                              {!budgetTotal && !budgetCreator && (
                                <p className="text-sm text-gray-400">
                                  Not specified
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Teaser — navigates to full-page detail */}
                          {(bs || offer?.message) && (
                            <div
                              className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4 cursor-pointer hover:bg-blue-100/50 transition-colors"
                              onClick={() => setSelectedOfferId(offerId)}
                            >
                              <span className="text-blue-500 mt-0.5 shrink-0">
                                ⓘ
                              </span>
                              <p className="text-sm font-medium text-blue-700">
                                Click to view complete brief with dialogue,
                                visuals, and contract details
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
        </>
      )}

      {activeTab === "feedback" && (
        <Card className="p-6 border border-gray-200 rounded-xl">
          <h3 className="text-lg font-bold text-gray-900 mb-3">
            {tBrand("feedback.title", {
              defaultValue: "Package Feedback",
            })}
          </h3>
          {feedbackQuery.isLoading && (
            <p className="text-sm text-gray-500">
              {tBrand("feedback.loading", {
                defaultValue: "Loading package feedback...",
              })}
            </p>
          )}
          {!feedbackQuery.isLoading && feedbackItems.length === 0 && (
            <p className="text-sm text-gray-500">
              {tBrand("feedback.empty", {
                defaultValue: "No package feedback yet.",
              })}
            </p>
          )}
          {feedbackItems.length > 0 && (
            <div className="space-y-3">
              {feedbackItems.map((item: any) => (
                <div
                  key={String(item?.id)}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <p className="font-semibold text-gray-900">
                    {String(item?.title || "Talent package")}
                  </p>
                  <p className="text-xs text-gray-500">
                    Status: {String(item?.status || "feedback_received")}
                  </p>
                  {item?.meta?.feedback_note && (
                    <p className="text-sm text-gray-700 mt-2">
                      {String(item.meta.feedback_note)}
                    </p>
                  )}
                  <div className="flex items-center justify-end mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs font-bold border-gray-300 h-8"
                      onClick={() => {
                        navigate("/AgencyDashboard?tab=packages", {
                          state: {
                            openFeedbackForPackageId: String(
                              item?.meta?.agency_package_id || item?.id || "",
                            ),
                          },
                        });
                      }}
                    >
                      <Eye className="w-3 h-3 mr-2" />
                      {tBrand("feedback.viewActivity", {
                        defaultValue: "View Activity",
                      })}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === "contract_hub" && (
        <Card className="p-6 border border-gray-200 rounded-xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">
              {tBrand("contractHub.title", {
                defaultValue: "Contract Hub",
              })}
            </h3>
            <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {tBrand("contractHub.managementTag", {
                defaultValue: "Agency Management",
              })}
            </div>
          </div>

          {offers.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">
                {tBrand("contractHub.noActiveOffers", {
                  defaultValue:
                    "No active campaign offers to manage contracts for.",
                })}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Sidebar: Offer List */}
              <div className="md:col-span-1 space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                  {tBrand("contractHub.campaignOffers", {
                    defaultValue: "Campaign Offers",
                  })}
                </p>
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {offers.map((offer: any) => {
                    const offerId = String(offer?.id || "");
                    const isSelected = selectedOfferId === offerId;
                    return (
                      <div
                        key={offerId}
                        onClick={() => setSelectedOfferId(offerId)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "border-blue-500 bg-blue-50 shadow-sm"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`font-bold text-sm ${isSelected ? "text-blue-900" : "text-gray-900"}`}
                          >
                            {String(
                              offer?.brand_campaigns?.name ||
                                tBrand("contractHub.campaignOffer", {
                                  defaultValue: "Campaign offer",
                                }),
                            )}
                          </p>
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {tBrand("contractHub.brandLabel", {
                            defaultValue: "Brand",
                          })}
                          :{" "}
                          {String(
                            offer?.brands?.company_name ||
                              offer?.brands?.name ||
                              offer?.brand_campaigns?.brands?.company_name ||
                              offer?.brand_campaigns?.brands?.name ||
                              tBrand("contractHub.unknownBrand", {
                                defaultValue: "Unknown",
                              }),
                          )}
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
                    <h4 className="text-lg font-bold text-gray-900 mb-1">
                      {tBrand("contractHub.selectOfferTitle", {
                        defaultValue: "Select an offer",
                      })}
                    </h4>
                    <p className="text-sm text-gray-500 max-w-xs">
                      {tBrand("contractHub.selectOfferDescription", {
                        defaultValue:
                          "Choose an offer from the sidebar to manage its contracts.",
                      })}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <Tabs
                      value={contractTab}
                      onValueChange={setContractTab}
                      className="w-full"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <TabsList className="bg-gray-100 p-1 rounded-lg">
                          <TabsTrigger
                            value="submissions"
                            className="px-6 py-2 rounded-md transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm"
                          >
                            {t(
                              "agencyDashboard.brandConnections.contractHub.submissions",
                            )}
                          </TabsTrigger>
                          <TabsTrigger
                            value="upload"
                            className="px-6 py-2 rounded-md transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm"
                          >
                            {t(
                              "agencyDashboard.brandConnections.contractHub.newContract",
                            )}
                          </TabsTrigger>
                        </TabsList>
                      </div>
                      {!hasAssignedTalent && (
                        <div className="mb-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                          <span className="text-amber-700 text-sm font-semibold">
                            {t(
                              "agencyDashboard.brandConnections.contractHub.assignTalentBeforeContract",
                            )}
                          </span>
                        </div>
                      )}
                      {!agencyStripeReadyForPayouts && (
                        <Alert className="mb-4 bg-blue-50 border border-blue-200 rounded-xl">
                          <AlertCircle className="h-4 w-4 text-blue-600" />
                          <AlertDescription className="text-blue-900 text-sm font-medium flex items-start justify-between gap-3">
                            <span>
                              {t(
                                "agencyDashboard.brandConnections.contractHub.connectStripeBeforeSending",
                              )}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="ml-auto shrink-0 bg-white border-blue-200 text-blue-600 hover:bg-blue-50 font-bold text-xs"
                              onClick={() =>
                                navigate(
                                  "/AgencyDashboard?tab=accounting&subTab=Connect Bank",
                                )
                              }
                            >
                              {t(
                                "agencyDashboard.brandConnections.contractHub.setupPayouts",
                              )}
                            </Button>
                          </AlertDescription>
                        </Alert>
                      )}

                      <TabsContent
                        value="submissions"
                        className="space-y-4 m-0"
                      >
                        {offerContractsQuery.isLoading ? (
                          <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                          </div>
                        ) : (offerContractsQuery.data || []).length === 0 ? (
                          <div className="text-center py-20 bg-white border border-gray-200 rounded-2xl shadow-sm">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                              <FileText className="w-8 h-8 text-gray-300" />
                            </div>
                            <p className="text-gray-500 font-medium mb-4">
                              {t(
                                "agencyDashboard.brandConnections.contractHub.noContractsForOffer",
                              )}
                            </p>
                            <Button
                              variant="outline"
                              className="border-blue-200 text-blue-600 hover:bg-blue-50"
                              onClick={() => setContractTab("upload")}
                              disabled={!hasAssignedTalent}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              {t(
                                "agencyDashboard.brandConnections.contractHub.createFirstContract",
                              )}
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-8">
                            {/* Templates Section */}
                            {(offerContractsQuery.data || []).some(
                              (c: any) =>
                                c?.docuseal_status === "draft" ||
                                !c?.docuseal_status,
                            ) && (
                              <section className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <h5 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                                    {t(
                                      "agencyDashboard.brandConnections.contractHub.contractTemplates",
                                      { defaultValue: "Contract Templates" },
                                    )}
                                  </h5>
                                  <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                                    {t(
                                      "agencyDashboard.brandConnections.contractHub.readyToPrepare",
                                      { defaultValue: "Ready to Prepare" },
                                    )}
                                  </span>
                                </div>
                                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                  <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                      <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">
                                          {t(
                                            "agencyDashboard.brandConnections.contractHub.titleColumn",
                                            { defaultValue: "Title" },
                                          )}
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">
                                          {t(
                                            "agencyDashboard.brandConnections.contractHub.actionsColumn",
                                            { defaultValue: "Actions" },
                                          )}
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {(offerContractsQuery.data || [])
                                        .filter(
                                          (c: any) =>
                                            c?.docuseal_status === "draft" ||
                                            !c?.docuseal_status,
                                        )
                                        .map((c: any) => {
                                          const cId = String(c?.id);
                                          const isBusy = busyIds.has(cId);
                                          const statusRaw = String(
                                            c?.docuseal_status || "sent",
                                          ).toLowerCase();
                                          const statusLabel =
                                            statusRaw === "signed"
                                              ? "completed"
                                              : statusRaw;
                                          return (
                                            <tr
                                              key={cId}
                                              className="hover:bg-gray-50/50 transition-colors"
                                            >
                                              <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                                                    <FileText className="w-5 h-5 text-blue-500" />
                                                  </div>
                                                  <div>
                                                    <p className="text-sm font-bold text-gray-900">
                                                      {String(
                                                        c?.title ||
                                                          t(
                                                            "agencyDashboard.brandConnections.contractHub.contractDraft",
                                                            {
                                                              defaultValue:
                                                                "Contract Draft",
                                                            },
                                                          ),
                                                      )}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                                      {t(
                                                        "agencyDashboard.brandConnections.contractHub.templateId",
                                                        {
                                                          defaultValue:
                                                            "Template ID",
                                                        },
                                                      )}
                                                      :{" "}
                                                      {String(
                                                        c?.docuseal_template_id ||
                                                          "N/A",
                                                      )}
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
                                                    onClick={() =>
                                                      handlePrepareContract(
                                                        selectedOfferId,
                                                        cId,
                                                      )
                                                    }
                                                    disabled={
                                                      isBusy ||
                                                      !hasAssignedTalent
                                                    }
                                                  >
                                                    <Wand2 className="w-4 h-4 mr-2" />
                                                    {t(
                                                      "agencyDashboard.brandConnections.contractHub.prepare",
                                                      {
                                                        defaultValue: "Prepare",
                                                      },
                                                    )}
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="default"
                                                    className="bg-blue-600 hover:bg-blue-700 h-9"
                                                    onClick={() =>
                                                      attemptSendContract(
                                                        selectedOfferId,
                                                        cId,
                                                      )
                                                    }
                                                    disabled={isBusy}
                                                  >
                                                    {isBusy ? (
                                                      <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                      <>
                                                        <Send className="w-4 h-4 mr-2" />
                                                        {t(
                                                          "agencyDashboard.brandConnections.contractHub.send",
                                                          {
                                                            defaultValue:
                                                              "Send",
                                                          },
                                                        )}
                                                      </>
                                                    )}
                                                  </Button>
                                                  <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="text-red-400 hover:text-red-500 hover:bg-red-50"
                                                    onClick={() =>
                                                      handleDeleteContract(
                                                        selectedOfferId,
                                                        cId,
                                                      )
                                                    }
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
                            {(offerContractsQuery.data || []).some(
                              (c: any) =>
                                c?.docuseal_status &&
                                c?.docuseal_status !== "draft",
                            ) && (
                              <section className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <h5 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                                    {t(
                                      "agencyDashboard.brandConnections.contractHub.sentSubmissions",
                                      { defaultValue: "Sent Submissions" },
                                    )}
                                  </h5>
                                  <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium">
                                    {t(
                                      "agencyDashboard.brandConnections.contractHub.activeSubmissions",
                                      { defaultValue: "Active Submissions" },
                                    )}
                                  </span>
                                </div>
                                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                  <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                      <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">
                                          {t(
                                            "agencyDashboard.brandConnections.contractHub.titleColumn",
                                            { defaultValue: "Title" },
                                          )}
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">
                                          {t(
                                            "agencyDashboard.brandConnections.contractHub.statusColumn",
                                            { defaultValue: "Status" },
                                          )}
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">
                                          {t(
                                            "agencyDashboard.brandConnections.contractHub.actionsColumn",
                                            { defaultValue: "Actions" },
                                          )}
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {(offerContractsQuery.data || [])
                                        .filter(
                                          (c: any) =>
                                            c?.docuseal_status &&
                                            c?.docuseal_status !== "draft",
                                        )
                                        .map((c: any) => {
                                          const cId = String(c?.id);
                                          const isBusy = busyIds.has(cId);
                                          const statusRaw = String(
                                            c?.docuseal_status || "sent",
                                          ).toLowerCase();
                                          const statusLabel =
                                            statusRaw === "signed"
                                              ? "completed"
                                              : statusRaw;
                                          return (
                                            <tr
                                              key={cId}
                                              className="hover:bg-gray-50/50 transition-colors"
                                            >
                                              <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                  <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                                                    <FileText className="w-5 h-5 text-green-500" />
                                                  </div>
                                                  <div>
                                                    <p className="text-sm font-bold text-gray-900">
                                                      {String(
                                                        c?.title ||
                                                          t(
                                                            "agencyDashboard.brandConnections.contractHub.contractSubmission",
                                                            {
                                                              defaultValue:
                                                                "Contract Submission",
                                                            },
                                                          ),
                                                      )}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                                      {t(
                                                        "agencyDashboard.brandConnections.contractHub.id",
                                                        { defaultValue: "ID" },
                                                      )}
                                                      : {cId.slice(0, 8)}...
                                                    </p>
                                                  </div>
                                                </div>
                                              </td>
                                              <td className="px-6 py-4">
                                                <Badge
                                                  variant="secondary"
                                                  className={`capitalize ${
                                                    statusLabel ===
                                                      "completed" ||
                                                    c?.docuseal_status ===
                                                      "fully_signed"
                                                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                                                      : statusLabel === "sent"
                                                        ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                                        : statusLabel ===
                                                            "agency_pending"
                                                          ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                  }`}
                                                >
                                                  {t(
                                                    `statuses.${statusLabel}`,
                                                    {
                                                      defaultValue:
                                                        statusLabel.replace(
                                                          /_/g,
                                                          " ",
                                                        ),
                                                    },
                                                  )}
                                                </Badge>
                                              </td>
                                              <td className="px-6 py-4 text-right">
                                                {(() => {
                                                  const agencySignUrl =
                                                    String(
                                                      c?.meta
                                                        ?.agency_signing_url ||
                                                        "",
                                                    ).trim() ||
                                                    String(
                                                      c?.meta
                                                        ?.docuseal_signing_url ||
                                                        "",
                                                    ).trim();
                                                  const agencyStatus = String(
                                                    c?.meta
                                                      ?.agency_submitter_status ||
                                                      "",
                                                  ).toLowerCase();
                                                  const agencySigned = [
                                                    "completed",
                                                    "signed",
                                                    "done",
                                                  ].includes(agencyStatus);
                                                  const brandSignUrl = String(
                                                    c?.meta
                                                      ?.brand_signing_url || "",
                                                  ).trim();
                                                  const canCopyBrand =
                                                    agencySigned &&
                                                    Boolean(brandSignUrl);
                                                  const downloadUrl =
                                                    String(
                                                      c?.meta
                                                        ?.docuseal_document_url ||
                                                        "",
                                                    ).trim() ||
                                                    String(
                                                      c?.signed_document_url ||
                                                        "",
                                                    ).trim();
                                                  return (
                                                    <div className="flex items-center justify-end gap-2">
                                                      {String(
                                                        c?.docuseal_status ||
                                                          "",
                                                      ).toLowerCase() ===
                                                        "agency_pending" &&
                                                      agencySignUrl ? (
                                                        <Button
                                                          size="sm"
                                                          variant="outline"
                                                          className="border-blue-200 text-blue-700 hover:bg-blue-50"
                                                          onClick={() =>
                                                            window.open(
                                                              agencySignUrl,
                                                              "_blank",
                                                            )
                                                          }
                                                          disabled={isBusy}
                                                        >
                                                          <FileText className="w-4 h-4 mr-2" />
                                                          Sign now
                                                        </Button>
                                                      ) : (
                                                        <Button
                                                          size="sm"
                                                          variant="outline"
                                                          className="border-gray-200 hover:bg-gray-50"
                                                          onClick={() => {
                                                            const subId =
                                                              canCopyBrand
                                                                ? brandSignUrl
                                                                : c?.docuseal_slug ||
                                                                  c?.docuseal_submission_id;
                                                            if (subId) {
                                                              const url =
                                                                canCopyBrand
                                                                  ? subId
                                                                  : `https://docuseal.com/s/${subId}`;
                                                              navigator.clipboard.writeText(
                                                                url,
                                                              );
                                                              toast({
                                                                title:
                                                                  "Link Copied",
                                                                description:
                                                                  "Signing link copied to clipboard.",
                                                              });
                                                            } else {
                                                              toast({
                                                                title:
                                                                  "Link Unavailable",
                                                                description:
                                                                  "No submission found for this contract.",
                                                                variant:
                                                                  "destructive",
                                                              });
                                                            }
                                                          }}
                                                          disabled={
                                                            isBusy ||
                                                            (!c?.docuseal_slug &&
                                                              !c?.docuseal_submission_id &&
                                                              !canCopyBrand)
                                                          }
                                                        >
                                                          <FileText className="w-4 h-4 mr-2" />
                                                          Copy Link
                                                        </Button>
                                                      )}
                                                      {downloadUrl ? (
                                                        <Button
                                                          size="icon"
                                                          variant="outline"
                                                          className="border-gray-200 hover:bg-gray-50"
                                                          onClick={() =>
                                                            window.open(
                                                              downloadUrl,
                                                              "_blank",
                                                            )
                                                          }
                                                          disabled={isBusy}
                                                          title="Download"
                                                        >
                                                          <Download className="w-4 h-4" />
                                                        </Button>
                                                      ) : null}
                                                      <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-gray-200 hover:bg-gray-50"
                                                        onClick={() =>
                                                          handleSyncContract(
                                                            selectedOfferId,
                                                            cId,
                                                          )
                                                        }
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
                                                  );
                                                })()}
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
                              <p className="text-gray-900 font-bold">
                                {t(
                                  "agencyDashboard.brandConnections.contractHub.uploadingPdf",
                                )}
                              </p>
                              <p className="text-xs text-gray-500">
                                {t(
                                  "agencyDashboard.brandConnections.contractHub.creatingTemplate",
                                )}
                              </p>
                            </div>
                          ) : (
                            <>
                              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                                <Plus className="w-10 h-10 text-blue-500" />
                              </div>
                              <h4 className="text-xl font-bold text-gray-900 mb-2">
                                {t(
                                  "agencyDashboard.brandConnections.contractHub.uploadContractPdf",
                                )}
                              </h4>
                              <p className="text-gray-500 mb-8 max-w-sm mx-auto text-sm leading-relaxed">
                                {t(
                                  "agencyDashboard.brandConnections.contractHub.uploadPdfDescription",
                                )}
                              </p>
                              {!hasAssignedTalent && (
                                <p className="text-sm text-amber-700 font-semibold mb-6">
                                  {t(
                                    "agencyDashboard.brandConnections.contractHub.assignTalentFirst",
                                  )}
                                </p>
                              )}
                              <div className="flex items-center justify-center gap-4">
                                <input
                                  type="file"
                                  id="contract-pdf-upload"
                                  className="hidden"
                                  accept=".pdf"
                                  disabled={!hasAssignedTalent}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file)
                                      handleUploadContract(
                                        selectedOfferId,
                                        file,
                                      );
                                    e.target.value = "";
                                  }}
                                />
                                <label
                                  htmlFor="contract-pdf-upload"
                                  className={`px-8 py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center ${
                                    hasAssignedTalent
                                      ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                                      : "bg-gray-200 text-gray-500 cursor-not-allowed"
                                  }`}
                                >
                                  <FileText className="w-5 h-5 mr-3" />
                                  Choose PDF File
                                </label>
                              </div>
                            </>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </div>
            </div>
          )}
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
              <div
                key={offerId}
                className="border border-gray-200 rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-gray-900">
                    {String(offer?.brand_campaigns?.name || "Campaign offer")}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setSelectedOfferId((prev) =>
                        prev === offerId ? "" : offerId,
                      )
                    }
                  >
                    {selectedOfferId === offerId ? "Hide" : "Open"}
                  </Button>
                </div>
                {selectedOfferId === offerId && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-md border border-gray-200 p-3">
                      <p className="text-xs text-gray-500 mb-2">Contracts</p>
                      {(offerContractsQuery.data || []).length === 0 ? (
                        <p className="text-xs text-gray-500">
                          No contracts yet.
                        </p>
                      ) : (
                        (offerContractsQuery.data || []).map((c: any) => (
                          <div
                            key={String(c?.id)}
                            className="text-xs text-gray-700 mb-1"
                          >
                            {String(c?.title || "Contract")} •{" "}
                            {String(c?.docuseal_status || "draft")}
                          </div>
                        ))
                      )}
                    </div>
                    <div className="rounded-md border border-gray-200 p-3">
                      <p className="text-xs text-gray-500 mb-2">Deliverables</p>
                      {(offerDeliverablesQuery.data || []).length === 0 ? (
                        <p className="text-xs text-gray-500">
                          No deliverables yet.
                        </p>
                      ) : (
                        (offerDeliverablesQuery.data || []).map((d: any) => (
                          <div
                            key={String(d?.id)}
                            className="text-xs text-gray-700 mb-1"
                          >
                            {String(d?.asset_type || "file")} •{" "}
                            {String(d?.status || "submitted")}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      )}

      <Dialog
        open={assignDialog.open}
        onOpenChange={(open) => {
          setAssignDialog((prev) => ({ ...prev, open }));
          if (open) {
            // Preselect currently assigned talents so the agency can also unassign
            // by deselecting before saving (until the contract is sent).
            setAssignSelectedIds(Array.from(assignedTalentIds));
          } else {
            setAssignSearch("");
            setAssignSelectedIds([]);
          }
        }}
      >
        <DialogContent className="max-w-[96vw] sm:max-w-2xl rounded-2xl sm:rounded-[3rem] p-4 sm:p-10 border-none bg-white/95 backdrop-blur-xl shadow-2xl">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-2xl font-black text-gray-900 tracking-tight">
              {tBrand("contractHub.assignTalent", {
                defaultValue: "Assign Talent",
              })}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 font-medium mt-1">
              Select one or more talents from your roster to assign to this
              offer.
            </DialogDescription>
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
            {rosterQuery.isLoading ? (
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
                  const id = String(talent?.creator_id || talent?.id || "");
                  const needsInvite = !talent?.has_creator_account;
                  const canAssign = !needsInvite && Boolean(id);
                  const alreadyAssigned = assignedTalentIds.has(id);
                  const isSelected = assignSelectedIds.includes(id);
                  const willUnassign = alreadyAssigned && !isSelected;
                  const talentName =
                    talent?.stage_name ||
                    talent?.name ||
                    talent?.full_legal_name ||
                    "Talent";
                  return (
                    <Card
                      key={id || talent?.id}
                      onClick={() => {
                        if (assignmentLockedForOffer) return;
                        if (needsInvite) {
                          setInviteRequiredDialog({
                            open: true,
                            talentName,
                            talentId: talent?.id || id,
                          });
                          return;
                        }
                        if (!canAssign) return;
                        setAssignSelectedIds((prev) =>
                          prev.includes(id)
                            ? prev.filter((x) => x !== id)
                            : [...prev, id],
                        );
                      }}
                      className={`p-5 rounded-[2rem] border-2 transition-all duration-500 flex items-center gap-5 ${
                        needsInvite
                          ? "border-dashed border-amber-200 bg-amber-50/30 cursor-pointer hover:border-amber-300"
                          : assignmentLockedForOffer
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
                            <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-[10px] tracking-widest font-black px-2 py-0.5">
                              assigned
                            </Badge>
                          )}
                          {willUnassign && (
                            <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px] tracking-widest font-black px-2 py-0.5">
                              will unassign
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
            className="w-full mt-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg h-12 font-bold tracking-wider text-sm shadow-md shadow-indigo-200"
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
                  navigate(
                    `/AgencyDashboard?tab=roster&subTab=${encodeURIComponent("All Talent")}&openTalentId=${encodeURIComponent(inviteRequiredDialog.talentId || "")}`,
                  );
                }}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-xl h-11 font-bold text-sm flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                {tBrand("dialogs.goToRosterInvite", {
                  defaultValue: "Go to Roster & Invite",
                })}
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
                {t("agencyDashboard.deliverables.unassignTalent.cancel", {
                  defaultValue: "Cancel",
                })}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={assignConfirmOpen}
        onOpenChange={(open) => {
          if (assignSubmitting) return;
          setAssignConfirmOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(
                "agencyDashboard.deliverables.assignTalent.confirmDialogTitle",
                {
                  defaultValue: "Confirm talent assignment?",
                },
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "agencyDashboard.deliverables.assignTalent.changeBeforeContract",
                {
                  defaultValue:
                    "You can change assigned talents any time before the contract is sent. Once you send the contract, assignments are locked.",
                },
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={assignSubmitting}>
              {t("agencyDashboard.deliverables.unassignTalent.cancel", {
                defaultValue: "Cancel",
              })}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={assignSubmitting || assignmentLockedForOffer}
              onClick={async () => {
                await handleAssignTalents();
                setAssignConfirmOpen(false);
              }}
            >
              {t(
                "agencyDashboard.deliverables.assignTalent.confirmAssignment",
                {
                  defaultValue: "Confirm assignment",
                },
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={unassignConfirm.open}
        onOpenChange={(open) => {
          if (assignSubmitting) return;
          setUnassignConfirm((prev) => ({ ...prev, open }));
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("agencyDashboard.deliverables.unassignTalent.title", {
                defaultValue: "Unassign talent?",
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("agencyDashboard.deliverables.unassignTalent.description", {
                defaultValue:
                  "Remove {talentName} from this offer. You can change assigned talents before the contract is sent. After you send the contract, assignments are locked.",
                talentName: unassignConfirm.talentName,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={assignSubmitting}>
              {t("agencyDashboard.deliverables.unassignTalent.cancel", {
                defaultValue: "Cancel",
              })}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={assignSubmitting || assignmentLockedForSelectedOffer}
              onClick={async () => {
                await handleUnassignTalent();
              }}
            >
              {t("agencyDashboard.deliverables.unassignTalent.unassign", {
                defaultValue: "Unassign",
              })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={messageDialog.open}
        onOpenChange={(open) => setMessageDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Message Talent</DialogTitle>
            <DialogDescription>
              Send a short instruction or request to this talent. Attach a file
              if needed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Title (optional)"
              value={messageDialog.title}
              onChange={(e) =>
                setMessageDialog((prev) => ({
                  ...prev,
                  title: e.target.value,
                }))
              }
            />
            <Textarea
              placeholder="Write a short instruction or note..."
              value={messageDialog.message}
              onChange={(e) =>
                setMessageDialog((prev) => ({
                  ...prev,
                  message: e.target.value,
                }))
              }
              className="min-h-[120px]"
            />
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.mp4,.mov,video/*"
                onChange={(e) =>
                  setMessageDialog((prev) => ({
                    ...prev,
                    file: e.target.files?.[0] || null,
                  }))
                }
              />
              {messageDialog.file && (
                <span className="text-xs text-gray-500">
                  {messageDialog.file.name}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-3">
            <Button
              variant="outline"
              onClick={() =>
                setMessageDialog((prev) => ({ ...prev, open: false }))
              }
            >
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-6 rounded-lg shadow-md shadow-indigo-100"
              onClick={handleSendTalentMessage}
              disabled={messageDialog.sending}
            >
              {messageDialog.sending ? "Sending..." : "Send Message"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={sendPrecheckOpen} onOpenChange={setSendPrecheckOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{sendPrecheckTitle || "Before you send"}</DialogTitle>
            <DialogDescription>
              Please review the information below.
            </DialogDescription>
          </DialogHeader>
          <div className="py-1">{sendPrecheckBody}</div>
          <DialogFooter className="gap-2 sm:gap-2">
            {sendPrecheckActions.map((a, idx) => (
              <Button
                key={`${a.label}-${idx}`}
                variant={a.variant === "outline" ? "outline" : "default"}
                onClick={a.onClick}
              >
                {a.label}
              </Button>
            ))}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DocuSeal Builder Modal */}
      {builderOpen && builderToken && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
          <div className="bg-white w-full h-full rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Prepare Contract</h3>
                  <p className="text-xs text-gray-500">
                    Place signature fields and save to finish
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="border-gray-200 hover:bg-gray-50 ml-3"
                  onClick={() => {
                    if (!selectedOfferId || !currentContractId) {
                      toast({
                        title: "Missing contract",
                        description: "Select a contract before sending.",
                        variant: "destructive" as any,
                      });
                      return;
                    }
                    attemptSendContract(selectedOfferId, currentContractId);
                  }}
                  disabled={
                    !selectedOfferId ||
                    !currentContractId ||
                    busyIds.has(currentContractId)
                  }
                  title={builderSendDisabledReason || undefined}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {busyIds.has(currentContractId) ? "Sending..." : "Send"}
                </Button>
              </div>
              <Button
                variant="ghost"
                onClick={() => {
                  setBuilderOpen(false);
                  setBuilderToken(null);
                  if (selectedOfferId) {
                    queryClient.invalidateQueries({
                      queryKey: ["agency", "offer-contracts", selectedOfferId],
                    });
                  }
                }}
                className="hover:bg-red-50 hover:text-red-500 rounded-full w-10 h-10 p-0"
              >
                ✕
              </Button>
            </div>
            <div className="flex-1 bg-gray-50 relative flex flex-col">
              <div className="px-6 py-3 border-b border-gray-200 bg-white shadow-sm flex items-center justify-between shrink-0">
                <div className="text-xs sm:text-sm text-gray-700 font-medium flex items-center gap-4">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    Party mapping:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-red-50 text-red-700 border border-red-100 px-3 py-1 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-red-500 mr-2 shadow-sm shadow-red-200" />
                      First Party = Agency
                    </span>
                    <ArrowRight className="w-3 h-3 text-gray-300" />
                    <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-blue-500 mr-2 shadow-sm shadow-blue-200" />
                      Second Party = Client
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex-1 relative">
                <docuseal-builder
                  data-token={builderToken}
                  data-autosave={true}
                  data-save-button-text="Save Contract"
                  data-with-send-button={false}
                  data-with-sign-yourself-button={false}
                  className="w-full h-full block"
                  ref={(el: any) => {
                    if (el && !el._hasSaveListener) {
                      const hideActionButtons = (root: ParentNode) => {
                        const buttons = Array.from(
                          root.querySelectorAll("button"),
                        );
                        buttons.forEach((btn) => {
                          const label = (btn.textContent || "")
                            .replace(/\s+/g, " ")
                            .trim()
                            .toLowerCase();
                          if (
                            label === "sign yourself" ||
                            label === "send" ||
                            label.includes("sign yourself")
                          ) {
                            (btn as HTMLElement).style.display = "none";
                          }
                        });
                      };
                      const root = el.shadowRoot || el;
                      hideActionButtons(root);
                      const observer = new MutationObserver(() =>
                        hideActionButtons(root),
                      );
                      observer.observe(root, {
                        childList: true,
                        subtree: true,
                      });
                      el._hideObserver = observer;
                      el.addEventListener("save", () => {
                        if (selectedOfferId) {
                          queryClient.invalidateQueries({
                            queryKey: [
                              "agency",
                              "offer-contracts",
                              selectedOfferId,
                            ],
                          });
                        }
                        toast({
                          title: "Contract saved",
                          description:
                            "Your changes have been saved successfully.",
                        });
                      });
                      el._hasSaveListener = true;
                    }
                  }}
                ></docuseal-builder>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandConnectionsView;
