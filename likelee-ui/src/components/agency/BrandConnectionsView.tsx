import React, { useEffect, useMemo, useState } from "react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTeamAccess } from "@/features/team/useTeamAccess";
import {
  DashboardSectionHeader,
  DashboardTabRail,
  DashboardTableSurface,
} from "@/components/dashboard/DashboardResponsive";

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
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission, loading: accessLoading } = useTeamAccess("agency");
  const canViewConnections = hasPermission("view_brand_connections");
  const canManageConnections = hasPermission("manage_brand_connections");
  const canDisconnectBrands = hasPermission("disconnect_brand_connections");
  const isReadOnly = canViewConnections && !canManageConnections;

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
      const resp = await base44.get<{ assignments?: any[]; is_locked?: boolean }>(
        `/api/campaign-offers/${selectedOfferId}/assignments`,
      );
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
    if (!offerId) return { locked: false, contractSigned: false, packageFinalized: false };
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

  const pendingRequests = requests.length;
  const pendingOffers = offers.filter((o) =>
    ["sent", "viewed"].includes(o.status),
  ).length;
  const pendingFeedback = feedbackItems.length;

  React.useEffect(() => {
    setSeenCounts((prev) => {
      const next = { ...prev };
      let changed = false;

      if (activeTab === "requests" && prev.requests !== pendingRequests) {
        next.requests = pendingRequests;
        changed = true;
      }
      if (activeTab === "offers" && prev.offers !== pendingOffers) {
        next.offers = pendingOffers;
        changed = true;
      }
      if (activeTab === "feedback" && prev.feedback !== pendingFeedback) {
        next.feedback = pendingFeedback;
        changed = true;
      }

      if (changed) {
        localStorage.setItem(
          "brand_connections_seen_counts",
          JSON.stringify(next),
        );
        return next;
      }
      return prev;
    });
  }, [activeTab, pendingRequests, pendingOffers, pendingFeedback]);

  const showRequestsBadge = pendingRequests > (seenCounts.requests || 0);
  const showOffersBadge = pendingOffers > (seenCounts.offers || 0);
  const showFeedbackBadge = pendingFeedback > (seenCounts.feedback || 0);

  if (accessLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px]">
        <Loader2 className="h-10 w-10 text-gray-400 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Verifying access...</p>
      </div>
    );
  }

  if (!canViewConnections) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Brand Connections
          </h2>
          <p className="text-gray-600">Access Restricted</p>
        </div>
        <Card className="p-12 flex flex-col items-center justify-center text-center border-dashed border-2">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Permission Required
          </h3>
          <p className="text-gray-600 max-w-sm">
            You do not have the required permissions to view brand connections.
            Please contact your agency administrator if you believe this is an
            error.
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
            <p className="font-bold text-amber-800">View Only Mode</p>
            <p className="text-sm text-amber-700">
              Your role allows viewing brand connections but not managing them.
            </p>
          </div>
        </div>
      )}
      <DashboardSectionHeader
        title="Brand Connections"
        description="Manage active connections and invitations."
      />

      {/* Mobile Tabs: Horizontal Scroll */}
      <div className="flex gap-2 mb-6 sm:hidden overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {[
          {
            id: "connections",
            label: "Brands",
            active: activeTab === "connections",
            onClick: () => setActiveTab("connections"),
          },
          {
            id: "requests",
            label: showRequestsBadge
              ? `Requests (${pendingRequests - (seenCounts.requests || 0)})`
              : "Requests",
            active: activeTab === "requests",
            onClick: () => setActiveTab("requests"),
          },
          {
            id: "offers",
            label: showOffersBadge
              ? `Offers (${pendingOffers - (seenCounts.offers || 0)})`
              : "Offers",
            active: activeTab === "offers",
            onClick: () => setActiveTab("offers"),
          },
          {
            id: "contract_hub",
            label: "Contracts",
            active: activeTab === "contract_hub",
            onClick: () => setActiveTab("contract_hub"),
          },
          {
            id: "deliverables",
            label: "Deliverables",
            active: false,
            onClick: () => {
              navigate("/AgencyDashboard?tab=deliverables");
              setActiveTab("connections");
            },
          },
          {
            id: "feedback",
            label: showFeedbackBadge
              ? `Feedback (${pendingFeedback - (seenCounts.feedback || 0)})`
              : "Feedback",
            active: activeTab === "feedback",
            onClick: () => setActiveTab("feedback"),
          },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            className={`min-h-[40px] rounded-xl px-4 py-2 text-center text-[13px] font-bold transition-all whitespace-nowrap ${
              item.active
                ? "bg-indigo-50/70 text-indigo-700 shadow-sm ring-1 ring-indigo-700/10"
                : "bg-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-transparent"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="hidden sm:block">
        <DashboardTabRail
          items={[
            {
              id: "connections",
              label: "Connected Brands",
              active: activeTab === "connections",
              onClick: () => setActiveTab("connections"),
            },
            {
              id: "requests",
              label: showRequestsBadge
                ? `Requests (${pendingRequests - (seenCounts.requests || 0)})`
                : "Requests",
              active: activeTab === "requests",
              onClick: () => setActiveTab("requests"),
            },
            {
              id: "offers",
              label: showOffersBadge
                ? `Brand Offers (${pendingOffers - (seenCounts.offers || 0)})`
                : "Brand Offers",
              active: activeTab === "offers",
              onClick: () => setActiveTab("offers"),
            },
            {
              id: "contract_hub",
              label: "Contract Hub",
              active: activeTab === "contract_hub",
              onClick: () => setActiveTab("contract_hub"),
            },
            {
              id: "deliverables",
              label: "Deliverables",
              active: false,
              onClick: () => {
                navigate("/AgencyDashboard?tab=deliverables");
                setActiveTab("connections");
              },
            },
            {
              id: "feedback",
              label: showFeedbackBadge
                ? `Package Feedback (${pendingFeedback - (seenCounts.feedback || 0)})`
                : "Package Feedback",
              active: activeTab === "feedback",
              onClick: () => setActiveTab("feedback"),
            },
          ]}
        />
      </div>

      {activeTab === "connections" && (
        <Card className="p-4 sm:p-6 border border-gray-200 rounded-xl">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                      className="border border-gray-200 rounded-lg p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 break-words">
                          {companyName}
                        </p>
                        <p className="text-sm text-gray-600 break-words">
                          {email || "No email provided"}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:justify-end sm:text-right">
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
                                  aria-label="Disconnect from brand"
                                  className="disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Link2Off className="h-4 w-4" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {!canDisconnectBrands && (
                              <TooltipContent>
                                <p>Your role cannot disconnect brands</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                                  {isBusy ? "Working..." : "Accept"}
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {!canManageConnections && (
                              <TooltipContent>
                                <p>Your role cannot accept requests</p>
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
                                  Decline
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {!canManageConnections && (
                              <TooltipContent>
                                <p>Your role cannot decline requests</p>
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
          <Card className="p-4 sm:p-6 border border-gray-200 rounded-xl">
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
                  const offer = offers.find(
                    (o: any) => String(o.id) === selectedOfferId,
                  );
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
                  const isFullySigned = new Set([
                    "contract_fully_signed",
                    "signed",
                    "fully_signed",
                    "completed",
                  ]).has(status.toLowerCase());

                  return (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                      {/* Fixed Header Style */}
                      <div className="bg-gray-50 px-4 py-4 sm:px-6 sm:py-6 border-b border-gray-200">
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

                      <div className="p-4 sm:p-6 md:p-8 space-y-8">
                        {/* Action Bar */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-indigo-50/50 p-2.5 sm:p-4 rounded-xl border border-indigo-100/50">
                          {isPending && (
                            <>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span>
                                      <Button
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 sm:px-6 h-8 sm:h-auto text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                                      <p>Your role cannot accept offers</p>
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
                                        className="border-red-200 text-red-600 hover:bg-red-50 font-bold px-3 sm:px-4 h-8 sm:h-auto text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                                      <p>Your role cannot decline offers</p>
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
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 py-1.5 sm:py-2 px-3 sm:px-4 rounded-full flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                                        <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                        Package Successfully Sent
                                      </Badge>
                                      {token && (
                                        <Button
                                          variant="secondary"
                                          className="font-bold h-8 sm:h-10 text-xs sm:text-sm px-3 sm:px-4"
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
                                    className="bg-indigo-50/70 hover:bg-indigo-100/80 text-indigo-700 font-bold px-4 sm:px-5 py-2 sm:py-3 w-full sm:w-auto h-9 sm:h-11 text-xs sm:text-sm rounded-xl transition-all ring-1 ring-indigo-700/10"
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
                              <div className="w-full flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 sm:px-4 py-2 sm:py-3">
                                <span className="text-amber-700 text-[10px] sm:text-sm font-semibold">
                                  ⏳ Brand has not yet completed payment.
                                  Deliverable uploads/submissions are disabled.
                                </span>
                              </div>
                            )}
                        </div>

                        <div className="rounded-xl border border-indigo-100 bg-white p-3 sm:p-4 space-y-3">
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
                                  The brand has reviewed your package and finalized their talent selection. These talents are automatically assigned to the contract.
                                </p>
                              </div>
                              {(offerAssignmentsQuery.data?.assignments || []).length === 0 ? (
                                <p className="text-xs text-gray-500">
                                  No talents were auto-assigned. Contact support if this is unexpected.
                                </p>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {(offerAssignmentsQuery.data?.assignments || []).map(
                                    (a: any) => {
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
                                                if (creatorId && onMessageTalent) {
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
                                    },
                                  )}
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
                                  The brand will review your package and choose which talents they want. Once they confirm their selection, the talents will be automatically assigned here and you can proceed to create the contract.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Full brief — shown directly, no duplicate summary, full width of container */}
                        {offer?.brief_snapshot &&
                        typeof offer.brief_snapshot === "object" ? (
                          <div className="-mx-4 sm:-mx-6 md:-mx-8 -mb-4 sm:-mb-6 md:-mb-8 border-t border-gray-200 bg-slate-50 overflow-hidden">
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
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 sm:px-6 border-b border-blue-100 bg-white gap-3 sm:gap-4">
                          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-gray-900 text-sm sm:text-base tracking-tight truncate">
                                {offer?.brand_campaigns?.name ||
                                  offer?.offer_title ||
                                  "Campaign Offer"}
                              </h4>
                              <p className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-widest truncate">
                                {offer?.offer_title || "Direct Request"}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
                            <Badge
                              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wide ${
                                isAccepted
                                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                  : "bg-indigo-100 text-indigo-700 border-indigo-200"
                              }`}
                            >
                              {status.replace(/_/g, " ")}
                            </Badge>
                            {isFullySigned && (
                              <Badge
                                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wide ${
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
                              <div className="flex items-center gap-1.5 sm:gap-2">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span>
                                        <Button
                                          size="sm"
                                          className="h-7 sm:h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] sm:text-xs disabled:opacity-50 disabled:cursor-not-allowed"
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
                                        <p>Your role cannot accept offers</p>
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
                                          className="h-7 sm:h-8 border-red-200 text-red-600 hover:bg-red-50 font-bold text-[10px] sm:text-xs disabled:opacity-50 disabled:cursor-not-allowed"
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
                                        <p>Your role cannot decline offers</p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
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
                                    ? offerPkg.meta.selected_talent_ids.map(
                                        (id: any) => String(id || "").trim(),
                                      ).filter(Boolean)
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
                                    className="bg-indigo-50/70 hover:bg-indigo-100/80 text-indigo-700 font-bold h-8 px-3"
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
                          </div>
                        </div>

                        {/* Brief & Scope body */}
                        <div className="px-4 py-3 sm:px-6 sm:py-5 space-y-5">
                          <div className="flex items-center justify-between gap-4 mb-1">
                            <h3 className="text-sm font-black text-gray-900 tracking-tight uppercase">
                              Brief &amp; Scope
                            </h3>
                            <button
                              onClick={() => setSelectedOfferId(offerId)}
                              className="text-[11px] font-bold text-blue-600 border border-blue-200 rounded-md px-2.5 py-1 hover:bg-blue-50 transition-colors whitespace-nowrap"
                            >
                              Details →
                            </button>
                          </div>

                          {/* Reorganized Metadata Grid: Deliverables | Timeline | Budget */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 bg-gray-50/50 rounded-xl p-3 border border-gray-100">
                            {/* Deliverables */}
                            <div className="space-y-0.5">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                Deliverables
                              </p>
                              <p className="text-sm font-semibold text-gray-800">
                                {deliverablesSummary}
                              </p>
                            </div>

                            {/* Timeline */}
                            <div className="space-y-0.5">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                Timeline
                              </p>
                              <div className="text-[13px] text-gray-700 font-medium">
                                {launchDate || deadlineDate ? (
                                  <>
                                    {launchDate && (
                                      <div>Start: {launchDate}</div>
                                    )}
                                    {deadlineDate && (
                                      <div>Due: {deadlineDate}</div>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-gray-400 italic font-normal">
                                    Not specified
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Budget */}
                            <div className="space-y-0.5">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                Budget
                              </p>
                              <div className="text-[13px] text-gray-700">
                                {budgetTotal || budgetCreator ? (
                                  <>
                                    {budgetTotal && (
                                      <div className="font-bold text-gray-900">
                                        Total: {budgetTotal}
                                      </div>
                                    )}
                                    {budgetCreator && (
                                      <div className="text-gray-500 text-[11px]">
                                        Talent: {budgetCreator}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-gray-400 italic font-normal">
                                    Not specified
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Teaser — navigates to full-page detail */}
                          {(bs || offer?.message) && (
                            <div
                              className="flex items-center gap-2 bg-blue-50/50 border border-blue-100/50 rounded-lg px-3 py-2 cursor-pointer hover:bg-blue-100/50 transition-colors"
                              onClick={() => setSelectedOfferId(offerId)}
                            >
                              <span className="text-blue-500 text-xs shrink-0">
                                ⓘ
                              </span>
                              <p className="text-[11px] font-medium text-blue-700">
                                View complete brief, dialogue & visuals
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
            Package Feedback
          </h3>
          {feedbackQuery.isLoading && (
            <p className="text-sm text-gray-500">Loading package feedback...</p>
          )}
          {!feedbackQuery.isLoading && feedbackItems.length === 0 && (
            <p className="text-sm text-gray-500">No package feedback yet.</p>
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
        <Card className="p-4 sm:p-6 border border-gray-200 rounded-xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">Contract Hub</h3>
            <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              Agency Management
            </div>
          </div>

          {offers.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">
                No active campaign offers to manage contracts for.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Sidebar: Offer List - Hidden on mobile if an offer is selected */}
              <div
                className={`${selectedOfferId ? "hidden md:block" : "block"} md:col-span-1 space-y-3`}
              >
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Campaign Offers
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
                              offer?.brand_campaigns?.name || "Campaign offer",
                            )}
                          </p>
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          Brand:{" "}
                          {String(
                            offer?.brands?.company_name ||
                              offer?.brands?.name ||
                              offer?.brand_campaigns?.brands?.company_name ||
                              offer?.brand_campaigns?.brands?.name ||
                              "Unknown",
                          )}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Main: Contract Management - Full width on mobile if selected */}
              <div
                className={`${selectedOfferId ? "block" : "hidden md:block"} md:col-span-2`}
              >
                {selectedOfferId && (
                  <div className="md:hidden mb-4">
                    <Button
                      variant="ghost"
                      onClick={() => setSelectedOfferId("")}
                      className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 -ml-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Offers
                    </Button>
                  </div>
                )}
                {!selectedOfferId ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-gray-50 rounded-2xl border border-gray-200">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                      <ArrowLeft className="w-6 h-6 text-gray-400" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 mb-1">
                      Select an offer
                    </h4>
                    <p className="text-sm text-gray-500 max-w-xs">
                      Choose an offer from the sidebar to manage its contracts.
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
                            className="px-4 py-1.5 text-xs font-semibold rounded-md transition-all data-[state=active]:bg-indigo-50/70 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm ring-1 ring-indigo-700/5"
                          >
                            Submissions
                          </TabsTrigger>
                          <TabsTrigger
                            value="upload"
                            className="px-4 py-1.5 text-xs font-semibold rounded-md transition-all data-[state=active]:bg-indigo-50/70 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm ring-1 ring-indigo-700/5"
                          >
                            New Contract
                          </TabsTrigger>
                        </TabsList>
                      </div>
                      {!hasAssignedTalent && (
                        <div className="mb-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                          <span className="text-amber-700 text-sm font-semibold">
                            Assign at least 1 talent before preparing/sending a
                            contract. This is required for correct payouts when
                            the brand pays.
                          </span>
                        </div>
                      )}
                      {!agencyStripeReadyForPayouts && (
                        <Alert className="mb-4 bg-blue-50 border border-blue-200 rounded-xl">
                          <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                          <AlertDescription className="text-blue-900 text-sm font-medium mt-1">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <p className="flex-1">
                                Before sending contracts, connect your agency
                                Stripe account and complete onboarding. Brands
                                can’t pay until payouts are set up, and
                                commissions/talent earnings can’t be transferred
                                unless transfers are enabled.
                              </p>
                              <Button
                                size="sm"
                                variant="outline"
                                className="shrink-0 border-blue-300 text-blue-700 hover:bg-blue-100 whitespace-nowrap"
                                onClick={() =>
                                  navigate("/AgencyDashboard?tab=payouts")
                                }
                              >
                                Go to Payouts
                              </Button>
                            </div>
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
                              No contracts found for this offer.
                            </p>
                            <Button
                              variant="outline"
                              className="border-blue-200 text-blue-600 hover:bg-blue-50"
                              onClick={() => setContractTab("upload")}
                              disabled={!hasAssignedTalent}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Create First Contract
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
                                    Contract Templates
                                  </h5>
                                  <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                                    Ready to Prepare
                                  </span>
                                </div>
                                <DashboardTableSurface className="bg-white shadow-sm">
                                  <table className="min-w-[620px] w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                      <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">
                                          Title
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">
                                          Actions
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
                                              <td className="px-3 sm:px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                                                    <FileText className="w-5 h-5 text-blue-500" />
                                                  </div>
                                                  <div>
                                                    <p className="text-sm font-bold text-gray-900">
                                                      {String(
                                                        c?.title ||
                                                          "Contract Draft",
                                                      )}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                                      Template ID:{" "}
                                                      {String(
                                                        c?.docuseal_template_id ||
                                                          "N/A",
                                                      )}
                                                    </p>
                                                  </div>
                                                </div>
                                              </td>
                                              <td className="px-3 sm:px-6 py-4 text-right">
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
                                                    Prepare
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
                                                        Send
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
                                </DashboardTableSurface>
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
                                    Sent Submissions
                                  </h5>
                                  <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium">
                                    Active Submissions
                                  </span>
                                </div>
                                <DashboardTableSurface className="bg-white shadow-sm">
                                  <table className="min-w-[760px] w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                      <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">
                                          Title
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">
                                          Status
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">
                                          Actions
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
                                                          "Contract Submission",
                                                      )}
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
                                                  {statusLabel}
                                                </Badge>
                                              </td>
                                              <td className="px-3 sm:px-6 py-4 text-right">
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
                                </DashboardTableSurface>
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
                                Uploading PDF...
                              </p>
                              <p className="text-xs text-gray-500">
                                Creating your DocuSeal template draft
                              </p>
                            </div>
                          ) : (
                            <>
                              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                                <Plus className="w-10 h-10 text-blue-500" />
                              </div>
                              <h4 className="text-xl font-bold text-gray-900 mb-2">
                                Upload Contract PDF
                              </h4>
                              <p className="text-gray-500 mb-8 max-w-sm mx-auto text-sm leading-relaxed">
                                Upload a PDF contract to create a new signature
                                request. You can place fields in the builder
                                afterwards.
                              </p>
                              {!hasAssignedTalent && (
                                <p className="text-sm text-amber-700 font-semibold mb-6">
                                  Assign at least 1 talent to this offer first.
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
