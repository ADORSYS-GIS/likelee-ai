import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import CampaignBriefStep from "@/components/campaign-offers/CampaignBriefStep";
import {
  X,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  FileText,
  Users,
  Sparkles,
  BarChart3,
  AlertCircle,
  Play,
  Eye,
  Plus,
  Download,
  Globe,
  DollarSign,
  Lock,
  Mail,
  Search,
  Building2,
  UserPlus,
  Edit3,
  Trash2,
  Settings,
  Clock,
  Zap,
  Shield,
  Briefcase,
  User,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DocuSealBuilderModal } from "@/components/licensing/DocuSealBuilderModal";
import { DocusealForm } from "@docuseal/react";

const mockBrand = {
  name: "Urban Apparel Co.",
  logo: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200",
};

type BrandCampaignDashboardProps = {
  embedded?: boolean;
  openNewCampaignSignal?: number;
  prefillCampaignContext?: {
    brandCampaignId?: string;
    name?: string;
    objective?: string;
    category?: string;
    description?: string;
    usage_scope?: string;
    duration_days?: string | number;
    territory?: string;
    exclusivity?: string;
    budget_range?: string;
    start_date?: string;
    custom_terms?: string;
    brief_snapshot?: Record<string, any>;
    startStep?: number;
  } | null;
};

export default function BrandCampaignDashboard({
  embedded = false,
  openNewCampaignSignal = 0,
  prefillCampaignContext = null,
}: BrandCampaignDashboardProps) {
  const API_BASE_RAW = (
    import.meta.env.VITE_API_URL ||
    (typeof window !== "undefined" ? `${window.location.origin}/api` : "/api")
  ).toString();
  const API_BASE_ABS = (() => {
    try {
      return new URL(API_BASE_RAW, window.location.origin).toString();
    } catch {
      return new URL("/", window.location.origin).toString();
    }
  })();
  const api = (path: string) => {
    const normalizedBase = API_BASE_ABS.endsWith("/")
      ? API_BASE_ABS
      : `${API_BASE_ABS}/`;
    let normalizedPath = path.startsWith("/") ? path.slice(1) : path;
    if (normalizedBase.endsWith("/api/") && normalizedPath.startsWith("api/")) {
      normalizedPath = normalizedPath.slice("api/".length);
    }
    return new URL(normalizedPath, normalizedBase).toString();
  };
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, supabase } = useAuth();

  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [showInviteAgencyModal, setShowInviteAgencyModal] = useState(false);
  const [showInviteCreatorModal, setShowInviteCreatorModal] = useState(false);
  const [showInviteSeatModal, setShowInviteSeatModal] = useState(false);
  const [showStudioUpgradeModal, setShowStudioUpgradeModal] = useState(false);
  const [showPostJobModal, setShowPostJobModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [selectedCampaignDeliverables, setSelectedCampaignDeliverables] =
    useState<any[]>([]);
  const [selectedCampaignCollaborators, setSelectedCampaignCollaborators] =
    useState<string[]>([]);
  const [markDoneOpen, setMarkDoneOpen] = useState(false);
  const [markDoneBusy, setMarkDoneBusy] = useState(false);
  const [loadingSelectedCampaignDetails, setLoadingSelectedCampaignDetails] =
    useState(false);
  const [brandCampaignId, setBrandCampaignId] = useState<string>("");
  const [campaignCards, setCampaignCards] = useState<any[]>([]);
  const [loadingCampaignCards, setLoadingCampaignCards] = useState(false);
  const [campaignListTab, setCampaignListTab] = useState<
    "active" | "pending_approval" | "completed"
  >("active");
  const [deliverableCommentDrafts, setDeliverableCommentDrafts] = useState<
    Record<string, string>
  >({});
  const [newCampaignStep, setNewCampaignStep] = useState(1);
  const [hasStudioAddon, setHasStudioAddon] = useState(false);
  const [agencySearch, setAgencySearch] = useState("");
  const [connectedAgencies, setConnectedAgencies] = useState<any[]>([]);
  const [loadingConnectedAgencies, setLoadingConnectedAgencies] =
    useState(false);
  const [creatorSearch, setCreatorSearch] = useState("");
  const [marketplaceCreators, setMarketplaceCreators] = useState<any[]>([]);
  const [loadingMarketplaceCreators, setLoadingMarketplaceCreators] =
    useState(false);
  const [offerByCreatorId, setOfferByCreatorId] = useState<
    Record<string, string>
  >({});
  const [contractDraft, setContractDraft] = useState({
    title: "",
    file_url: "",
    docuseal_template_id: "",
  });
  const [contractUploadName, setContractUploadName] = useState("");
  const [showCampaignDocuSealBuilder, setShowCampaignDocuSealBuilder] =
    useState(false);
  const [isSendingFromBuilder, setIsSendingFromBuilder] = useState(false);
  const [brandSignUrl, setBrandSignUrl] = useState("");
  const [brandSignOpen, setBrandSignOpen] = useState(false);
  const [awaitingBrandSignature, setAwaitingBrandSignature] = useState(false);
  const [selectedCreatorsById, setSelectedCreatorsById] = useState<
    Record<string, any>
  >({});
  const [selectedTalentCreatorIds, setSelectedTalentCreatorIds] = useState<
    Set<string>
  >(new Set());
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const creatorFetchRequestIdRef = useRef(0);
  const connectedCreatorCacheRef = useRef<Record<string, any[]>>({});
  const agencyTalentCacheRef = useRef<Record<string, any[]>>({});
  const previousCollaboratorTypeRef = useRef<string>("");
  const isFetchingCampaignCardsRef = useRef(false);

  const [campaignForm, setCampaignForm] = useState({
    name: "",
    objective: "",
    brief_file: null,
    category: "",
    description: "",
    usage_scope: "",
    duration_days: "30",
    territory: "Global",
    exclusivity: "Non-exclusive",
    budget_range: "",
    start_date: "",
    custom_terms: "",
    collaborator_type: "",
    collaborators: [],
  });
  const [campaignBrief, setCampaignBrief] = useState({
    voice: "",
    tone: "",
    personality: "",
    key_messages: "",
    script_opening: "",
    script_middle: "",
    script_closing: "",
    dos: "",
    donts: "",
    required_deliverables: "",
    total_expected_deliverables: "",
    deliverables_reels: "",
    deliverables_hero_image: "",
    visual_color_palette: "",
    visual_setting: "",
    visual_framing: "",
    visual_editing: "",
    reference_images: [] as { name: string; url: string }[],
    brand_assets: [] as { name: string; size: number; url: string }[],
    overview_objective: "",
    overview_target_audience: "",
    overview_campaign_duration: "",
    overview_launch_date: "",
    budget_total: "",
    budget_creator_payment: "",
    budget_submission_deadline: "",
    budget_renewal_terms: "",
    revision_included: "",
    revision_major_changes: "",
    revision_turnaround: "",
    approval_process: "",
    watermark_protection: "",
    legal_terms: "",
  });

  useEffect(() => {
    if (!embedded) return;
    if (!openNewCampaignSignal) return;
    const context = prefillCampaignContext || {};
    const hasPrefillCampaignId = Boolean(
      String(context?.brandCampaignId || "").trim(),
    );

    if (hasPrefillCampaignId) {
      const nextStep = Number(context?.startStep || 3);
      const safeStep = Number.isFinite(nextStep) ? Math.max(1, nextStep) : 3;
      const brandCampaignId = String(context?.brandCampaignId || "").trim();

      setBrandCampaignId(brandCampaignId);
      setCampaignForm((prev) => ({
        ...prev,
        name: String(context?.name || prev.name || "").trim(),
        objective: String(context?.objective || prev.objective || "").trim(),
        category: String(context?.category || prev.category || "").trim(),
        description: String(
          context?.description || prev.description || "",
        ).trim(),
        usage_scope: String(
          context?.usage_scope || prev.usage_scope || "",
        ).trim(),
        duration_days: String(
          context?.duration_days || prev.duration_days || "30",
        ).trim(),
        territory: String(
          context?.territory || prev.territory || "Global",
        ).trim(),
        exclusivity: String(
          context?.exclusivity || prev.exclusivity || "Non-exclusive",
        ).trim(),
        budget_range: String(
          context?.budget_range || prev.budget_range || "",
        ).trim(),
        start_date: String(context?.start_date || prev.start_date || "").trim(),
        custom_terms: String(
          context?.custom_terms || prev.custom_terms || "",
        ).trim(),
      }));

      if (
        context?.brief_snapshot &&
        typeof context.brief_snapshot === "object" &&
        !Array.isArray(context.brief_snapshot)
      ) {
        setCampaignBrief((prev) => ({
          ...prev,
          ...context.brief_snapshot,
        }));
      }

      setNewCampaignStep(safeStep);
    } else {
      setNewCampaignStep(1);
    }

    setShowNewCampaignModal(true);
  }, [embedded, openNewCampaignSignal, prefillCampaignContext]);

  const getDisplayName = (value: unknown) => {
    const normalized = String(value ?? "").trim();
    return normalized || "Unknown";
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
    if (parts.length === 0) return "UN";
    return parts.map((part) => part.charAt(0).toUpperCase()).join("");
  };

  const isNegotiationEnabled = (value: unknown): boolean => {
    if (value === false) return false;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "false" || normalized === "0" || normalized === "no")
        return false;
      return true;
    }
    if (typeof value === "number") {
      return value !== 0;
    }
    return true;
  };

  const parseBudgetRange = (value: string): { min: string; max: string } => {
    const clean = String(value || "").trim();
    if (!clean) return { min: "", max: "" };
    const match = clean.match(/^\s*(\d+)\s*-\s*(\d+)\s*$/);
    if (!match) return { min: "", max: "" };
    return { min: match[1], max: match[2] };
  };

  const formatCampaignStatusLabel = (campaign: any): string => {
    const status = String(campaign?.status || "").toLowerCase();
    if (status === "completed") {
      const label = campaign?.completed_at ? "completed" : "incomplete";
      return label.charAt(0).toUpperCase() + label.slice(1);
    }
    const cleaned = status.replace("_", " ");
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  };

  const budgetParts = parseBudgetRange(campaignForm.budget_range);
  const dashboardMetrics = useMemo(() => {
    const activeCampaigns = campaignCards.filter(
      (c) => String(c?.status || "") === "active",
    );
    const uniqueCollaborators = new Set<string>();
    activeCampaigns.forEach((campaign: any) => {
      const collaborators = Array.isArray(campaign?.collaborators)
        ? campaign.collaborators
        : [];
      collaborators.forEach((collaborator: any) => {
        const value = String(collaborator || "").trim();
        if (value) uniqueCollaborators.add(value);
      });
    });
    const campaignsLaunched = campaignCards.reduce((sum, campaign: any) => {
      const offersCount = Number(campaign?.offers_count);
      if (Number.isFinite(offersCount)) return sum + offersCount;
      return sum + 1;
    }, 0);
    return {
      totalSpend: 0,
      activeCollaborators: uniqueCollaborators.size,
      campaignsLaunched,
      avgRoi: 0,
      activeCount: activeCampaigns.length,
    };
  }, [campaignCards]);

  const setBudgetPart = (part: "min" | "max", nextValue: string) => {
    const normalized = String(nextValue || "").replace(/[^\d]/g, "");
    const min = part === "min" ? normalized : budgetParts.min;
    const max = part === "max" ? normalized : budgetParts.max;
    if (!min && !max) {
      setCampaignForm((prev) => ({ ...prev, budget_range: "" }));
      return;
    }
    setCampaignForm((prev) => ({
      ...prev,
      budget_range: `${min || "0"}-${max || "0"}`,
    }));
  };

  const validateStep1Form = (): { ok: boolean; message?: string } => {
    if (!campaignForm.name.trim())
      return { ok: false, message: "Campaign name is required." };
    if (!campaignForm.objective.trim())
      return { ok: false, message: "Campaign objective is required." };
    if (!campaignForm.category.trim())
      return { ok: false, message: "Category is required." };
    if (!campaignForm.description.trim())
      return { ok: false, message: "Description is required." };
    if (!campaignForm.start_date.trim())
      return { ok: false, message: "Start date is required." };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(campaignForm.start_date.trim())) {
      return { ok: false, message: "Start date must be a valid date." };
    }
    const min = Number.parseInt(budgetParts.min, 10);
    const max = Number.parseInt(budgetParts.max, 10);
    if (
      !Number.isFinite(min) ||
      min <= 0 ||
      !Number.isFinite(max) ||
      max <= 0
    ) {
      return {
        ok: false,
        message: "Budget min and max must be greater than zero.",
      };
    }
    if (max < min) {
      return {
        ok: false,
        message: "Budget max must be greater than or equal to budget min.",
      };
    }
    const duration = Number.parseInt(
      String(campaignForm.duration_days || "").trim(),
      10,
    );
    if (!Number.isFinite(duration) || duration <= 0) {
      return { ok: false, message: "Duration must be at least 1 day." };
    }
    return { ok: true };
  };
  const SIGNED_OFFER_STATUSES = new Set(["contract_fully_signed", "signed"]);
  const isStartDateReached = (startDateRaw: unknown) => {
    const startDate = String(startDateRaw || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return false;
    const today = new Date();
    const todayOnly = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const startOnly = new Date(`${startDate}T00:00:00`);
    return startOnly.getTime() <= todayOnly.getTime();
  };
  const collaboratorLabelFromOffer = (offer: any) => {
    const targetType = String(offer?.target_type || "").toLowerCase();
    const targetName = String(offer?.target_name || "").trim();
    const targetId = String(offer?.target_id || "").trim();
    const shortId = targetId ? targetId.slice(0, 8) : "";
    if (targetType === "creator" || targetType === "talent") {
      if (targetName) return `Creator • ${targetName}`;
      return shortId ? `Creator ${shortId}` : "Creator";
    }
    if (targetType === "agency") {
      if (targetName) return `Agency • ${targetName}`;
      return shortId ? `Agency ${shortId}` : "Agency";
    }
    if (targetName) return `Collaborator • ${targetName}`;
    return shortId ? `Collaborator ${shortId}` : "Collaborator";
  };
  const extractFirstNumber = (value: unknown): number => {
    const text = String(value || "");
    const match = text.match(/(\d+)/);
    const num = match ? Number(match[1]) : 0;
    return Number.isFinite(num) && num > 0 ? num : 0;
  };
  const extractDeliverableCount = (value: unknown): number => {
    const text = String(value || "").trim();
    if (!text) return 0;
    const lines = text
      .split(/\r?\n|[;]+/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) return 0;
    return lines.reduce((total, line) => {
      const countMatch =
        line.match(/(\d+)\s*[xX]\b/) || line.match(/\b(\d+)\b/);
      if (countMatch) {
        const parsed = Number(countMatch[1]);
        return total + (Number.isFinite(parsed) && parsed > 0 ? parsed : 0);
      }
      return total + 1;
    }, 0);
  };
  const expectedDeliverablesFromBrief = (campaign: any): number => {
    const brief =
      campaign?.brief_snapshot && typeof campaign.brief_snapshot === "object"
        ? campaign.brief_snapshot
        : {};
    const explicitExpected = Number.parseInt(
      String(brief?.total_expected_deliverables || "").trim(),
      10,
    );
    if (Number.isFinite(explicitExpected) && explicitExpected > 0) {
      return explicitExpected;
    }
    const requiredDeliverablesCount = extractDeliverableCount(
      brief?.required_deliverables,
    );
    if (requiredDeliverablesCount > 0) return requiredDeliverablesCount;
    const reelsCount = extractFirstNumber(brief?.deliverables_reels);
    const heroCount = extractFirstNumber(brief?.deliverables_hero_image);
    const fallbackHero =
      heroCount > 0
        ? heroCount
        : String(brief?.deliverables_hero_image || "").trim()
          ? 1
          : 0;
    return reelsCount + fallbackHero;
  };
  const normalizeCampaignCard = (
    campaign: any,
    offers: any[],
    deliverableStats?: { total: number; approved: number },
  ) => {
    const rawStatus = String(campaign?.status || "").toLowerCase();
    const completedAt = campaign?.completed_at || null;
    const isMarkedDone = Boolean(completedAt);
    const safeOffers = Array.isArray(offers) ? offers : [];
    const hasSignedOffer = safeOffers.some((offer: any) =>
      SIGNED_OFFER_STATUSES.has(String(offer?.status || "").toLowerCase()),
    );
    const collaboratorLabels = Array.from(
      new Set(
        safeOffers
          .map((offer: any) => collaboratorLabelFromOffer(offer))
          .filter(Boolean),
      ),
    );
    const startDateRaw = String(campaign?.start_date || "").trim();
    const startDate = /^\d{4}-\d{2}-\d{2}$/.test(startDateRaw)
      ? new Date(`${startDateRaw}T00:00:00`)
      : null;
    const durationDaysRaw = Number(campaign?.duration_days || 0);
    const durationDays =
      Number.isFinite(durationDaysRaw) && durationDaysRaw > 0
        ? durationDaysRaw
        : 30;
    const endDate = startDate
      ? new Date(startDate.getTime() + (durationDays - 1) * 24 * 60 * 60 * 1000)
      : null;
    const today = new Date();
    const todayOnly = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const isAfterEnd = Boolean(
      endDate && todayOnly.getTime() > endDate.getTime(),
    );
    const status =
      isMarkedDone ||
      rawStatus === "completed" ||
      rawStatus === "archived" ||
      isAfterEnd
        ? "completed"
        : hasSignedOffer
          ? "active"
          : "pending_approval";
    const budgetText = String(campaign?.budget_range || "");
    const budgetMatch = budgetText.match(/(\d[\d,]*)\s*-\s*(\d[\d,]*)/);
    const budget = budgetMatch
      ? Number(String(budgetMatch[2]).replace(/[^\d]/g, "")) || 0
      : 0;
    const expectedDeliverables = expectedDeliverablesFromBrief(campaign);
    const submittedDeliverables = Number(deliverableStats?.total || 0);
    const totalDeliverables =
      expectedDeliverables > 0
        ? Math.max(expectedDeliverables, submittedDeliverables)
        : submittedDeliverables;
    return {
      id: String(campaign?.id || ""),
      brand_campaign_id: String(campaign?.id || ""),
      name: String(campaign?.name || "Campaign"),
      status,
      objective: String(
        campaign?.objective || campaign?.category || "Campaign",
      ),
      budget,
      collaborators: collaboratorLabels,
      collaborator_count: collaboratorLabels.length,
      offers_count: safeOffers.length,
      completed_at: completedAt,
      deliverables: totalDeliverables,
      approved: Number(deliverableStats?.approved || 0),
      start_date: String(campaign?.start_date || "N/A"),
      has_signed_offer: hasSignedOffer,
      start_reached: isStartDateReached(campaign?.start_date),
      brief_snapshot:
        campaign?.brief_snapshot && typeof campaign.brief_snapshot === "object"
          ? campaign.brief_snapshot
          : {},
    };
  };
  const loadCampaignCards = async () => {
    if (isFetchingCampaignCardsRef.current) return;
    isFetchingCampaignCardsRef.current = true;
    setLoadingCampaignCards(true);
    try {
      const response = await base44.get<{ campaigns?: any[] }>(
        "/api/brand/campaigns",
        {
          params: { limit: 120 },
        },
      );
      const rows = Array.isArray(response?.campaigns) ? response.campaigns : [];
      const normalized = await Promise.all(
        rows.map(async (campaign: any) => {
          const campaignId = String(campaign?.id || "").trim();
          if (!campaignId) return normalizeCampaignCard(campaign, []);
          try {
            const offersResp = await base44.get<{ offers?: any[] }>(
              `/api/brand/campaigns/${campaignId}/offers`,
            );
            const offers = Array.isArray(offersResp?.offers)
              ? offersResp.offers
              : [];
            const offerBrief =
              (offers[0]?.brief_snapshot &&
              typeof offers[0].brief_snapshot === "object"
                ? offers[0].brief_snapshot
                : offers[0]?.brand_campaigns?.brief_snapshot) || {};
            const campaignBrief =
              campaign?.brief_snapshot &&
              typeof campaign.brief_snapshot === "object"
                ? campaign.brief_snapshot
                : {};
            const mergedBrief =
              Object.keys(offerBrief || {}).length > 0
                ? { ...campaignBrief, ...offerBrief }
                : campaignBrief;
            const campaignWithBrief =
              Object.keys(mergedBrief || {}).length > 0
                ? { ...campaign, brief_snapshot: mergedBrief }
                : campaign;
            const deliverablesByOffer = await Promise.all(
              offers.map(async (offer: any) => {
                const offerId = String(offer?.id || "").trim();
                if (!offerId) return [];
                try {
                  const deliverablesResp = await base44.get<{
                    deliverables?: any[];
                  }>(`/api/campaign-offers/${offerId}/deliverables`);
                  return Array.isArray(deliverablesResp?.deliverables)
                    ? deliverablesResp.deliverables
                    : [];
                } catch {
                  return [];
                }
              }),
            );
            const flatDeliverables = deliverablesByOffer.flat();
            const approvedCount = flatDeliverables.filter((d: any) =>
              ["approved", "accepted", "brand_approved"].includes(
                String(d?.status || "").toLowerCase(),
              ),
            ).length;
            return normalizeCampaignCard(campaignWithBrief, offers, {
              total: flatDeliverables.length,
              approved: approvedCount,
            });
          } catch {
            return normalizeCampaignCard(campaign, []);
          }
        }),
      );
      setCampaignCards(normalized);
    } catch {
      setCampaignCards([]);
    } finally {
      setLoadingCampaignCards(false);
      isFetchingCampaignCardsRef.current = false;
    }
  };

  const openCampaignDetails = async (campaign: any) => {
    const campaignId = String(
      campaign?.id || campaign?.brand_campaign_id || "",
    ).trim();
    setSelectedCampaign(campaign);
    if (!campaignId) {
      setSelectedCampaignDeliverables([]);
      setSelectedCampaignCollaborators([]);
      return;
    }
    setLoadingSelectedCampaignDetails(true);
    try {
      const offersResp = await base44.get<{ offers?: any[] }>(
        `/api/brand/campaigns/${campaignId}/offers`,
      );
      const offers = Array.isArray(offersResp?.offers) ? offersResp.offers : [];
      {
        const offerBrief =
          (offers[0]?.brief_snapshot &&
          typeof offers[0].brief_snapshot === "object"
            ? offers[0].brief_snapshot
            : offers[0]?.brand_campaigns?.brief_snapshot) || {};
        const campaignBrief =
          campaign?.brief_snapshot &&
          typeof campaign.brief_snapshot === "object"
            ? campaign.brief_snapshot
            : {};
        const mergedBrief =
          Object.keys(offerBrief || {}).length > 0
            ? { ...campaignBrief, ...offerBrief }
            : campaignBrief;
        if (Object.keys(mergedBrief || {}).length > 0) {
          setSelectedCampaign((prev) =>
            prev ? { ...prev, brief_snapshot: mergedBrief } : prev,
          );
        }
      }
      const collaborators = Array.from(
        new Set(
          offers
            .map((offer: any) => collaboratorLabelFromOffer(offer))
            .filter(Boolean),
        ),
      );
      const deliverablesByOffer = await Promise.all(
        offers.map(async (offer: any) => {
          const offerId = String(offer?.id || "").trim();
          if (!offerId) return [];
          try {
            const deliverablesResp = await base44.get<{ deliverables?: any[] }>(
              `/api/campaign-offers/${offerId}/deliverables`,
            );
            const rows = Array.isArray(deliverablesResp?.deliverables)
              ? deliverablesResp.deliverables
              : [];
            return rows.map((deliverable: any) => ({
              ...deliverable,
              offer_id: offerId,
              collaborator_label: collaboratorLabelFromOffer(offer),
            }));
          } catch {
            return [];
          }
        }),
      );
      setSelectedCampaignCollaborators(collaborators);
      setSelectedCampaignDeliverables(deliverablesByOffer.flat());
    } catch {
      setSelectedCampaignCollaborators([]);
      setSelectedCampaignDeliverables([]);
    } finally {
      setLoadingSelectedCampaignDetails(false);
    }
  };

  const handleMarkCampaignDone = async () => {
    if (!selectedCampaign) return;
    const campaignId = String(
      selectedCampaign?.id || selectedCampaign?.brand_campaign_id || "",
    ).trim();
    if (!campaignId) return;
    setMarkDoneBusy(true);
    try {
      const res = await base44.post<any>(
        `/api/brand/campaigns/${campaignId}/mark-done`,
      );
      const completedAt = res?.completed_at || new Date().toISOString();
      const updatedCampaign = {
        ...selectedCampaign,
        status: "completed",
        completed_at: completedAt,
      };
      setSelectedCampaign(updatedCampaign);
      setCampaignCards((prev) =>
        prev.map((item) =>
          String(item?.id || "") === campaignId
            ? { ...item, status: "completed", completed_at: completedAt }
            : item,
        ),
      );
      toast({ title: "Campaign marked as done" });
    } catch {
      toast({
        title: "Unable to mark campaign as done",
        description: "Please try again.",
        variant: "destructive" as any,
      });
    } finally {
      setMarkDoneBusy(false);
      setMarkDoneOpen(false);
    }
  };
  const resolveDownloadFileName = (deliverable: any, fallbackIndex: number) => {
    const byCaption = String(deliverable?.caption || "").trim();
    if (byCaption) return byCaption;
    const original = String(deliverable?.meta?.original_name || "").trim();
    if (original) return original;
    return `deliverable-${fallbackIndex + 1}`;
  };
  const refreshSelectedCampaignDetails = async () => {
    if (!selectedCampaign) return;
    await openCampaignDetails(selectedCampaign);
    await loadCampaignCards();
  };
  const reviewSelectedCampaignDeliverable = async (
    deliverable: any,
    action: "approve" | "changes_requested",
  ) => {
    const offerId = String(deliverable?.offer_id || "").trim();
    const deliverableId = String(deliverable?.id || "").trim();
    if (!offerId || !deliverableId) return;
    try {
      await base44.post(
        `/api/campaign-offers/${encodeURIComponent(offerId)}/deliverables/${encodeURIComponent(deliverableId)}/review`,
        { action },
      );
      toast({
        title:
          action === "approve" ? "Deliverable approved" : "Edit request sent",
        description:
          action === "changes_requested"
            ? "Creator has been notified. Add details in comments below."
            : undefined,
      });
      await refreshSelectedCampaignDetails();
    } catch (e: any) {
      toast({
        title: "Update failed",
        description: e?.message || "Please try again.",
        variant: "destructive" as any,
      });
    }
  };
  const commentSelectedCampaignDeliverable = async (deliverable: any) => {
    const deliverableId = String(deliverable?.id || "").trim();
    const offerId = String(deliverable?.offer_id || "").trim();
    const message = String(
      deliverableCommentDrafts[deliverableId] || "",
    ).trim();
    if (!deliverableId || !offerId) return;
    if (!message) {
      toast({
        title: "Comment required",
        description: "Type your feedback message first.",
        variant: "destructive" as any,
      });
      return;
    }
    try {
      await base44.post(
        `/api/campaign-offers/${encodeURIComponent(offerId)}/deliverables/${encodeURIComponent(deliverableId)}/comments`,
        { message },
      );
      setDeliverableCommentDrafts((prev) => ({
        ...prev,
        [deliverableId]: "",
      }));
      toast({ title: "Feedback sent" });
      await refreshSelectedCampaignDetails();
    } catch (e: any) {
      const message = String(e?.message || "");
      toast({
        title: "Comment failed",
        description: message.includes(" failed: 404 ")
          ? "Comments endpoint not found on current backend instance. Restart backend server and try again."
          : message || "Please try again.",
        variant: "destructive" as any,
      });
    }
  };
  const downloadSelectedCampaignDeliverable = async (
    deliverable: any,
    index: number,
  ) => {
    const offerId = String(deliverable?.offer_id || "").trim();
    const deliverableId = String(deliverable?.id || "").trim();
    const assetUrl = String(deliverable?.asset_url || "").trim();
    if (!assetUrl || !offerId || !deliverableId) {
      toast({
        title: "Download unavailable",
        description: "Deliverable file URL is missing.",
        variant: "destructive" as any,
      });
      return;
    }
    try {
      const response = await fetch(assetUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch deliverable file.");
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = resolveDownloadFileName(deliverable, index);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);

      await base44.post(
        `/api/campaign-offers/${encodeURIComponent(offerId)}/deliverables/${encodeURIComponent(deliverableId)}/downloaded`,
        {},
      );
      toast({ title: "Download started" });
      await refreshSelectedCampaignDetails();
    } catch (e: any) {
      toast({
        title: "Download failed",
        description: e?.message || "Please try again.",
        variant: "destructive" as any,
      });
    }
  };

  const isValidDateString = (value: string): boolean =>
    /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim());

  const parsePositiveNumber = (value: unknown): number | null => {
    if (value === null || value === undefined) return null;
    const normalized = String(value)
      .replace(/[$,\s]/g, "")
      .trim();
    if (!normalized) return null;
    const num = Number(normalized);
    if (!Number.isFinite(num) || num <= 0) return null;
    return num;
  };

  const validateStep2Brief = (): { ok: boolean; message?: string } => {
    const expectedTotal = Number.parseInt(
      String(campaignBrief.total_expected_deliverables || "").trim(),
      10,
    );
    if (!Number.isFinite(expectedTotal) || expectedTotal <= 0) {
      return {
        ok: false,
        message:
          "Total expected deliverables is required and must be greater than 0.",
      };
    }
    const duration = Number.parseInt(
      String(campaignBrief.overview_campaign_duration || "").trim(),
      10,
    );
    if (!Number.isFinite(duration) || duration <= 0) {
      return {
        ok: false,
        message: "Campaign duration must be a valid number of days.",
      };
    }
    if (!isValidDateString(String(campaignBrief.overview_launch_date || ""))) {
      return { ok: false, message: "Launch date must be a valid date." };
    }
    if (
      !isValidDateString(String(campaignBrief.budget_submission_deadline || ""))
    ) {
      return {
        ok: false,
        message: "Submission deadline must be a valid date.",
      };
    }
    if (!parsePositiveNumber(campaignBrief.budget_total)) {
      return { ok: false, message: "Total budget must be a valid amount." };
    }
    if (!parsePositiveNumber(campaignBrief.budget_creator_payment)) {
      return {
        ok: false,
        message: "Creator payment must be a valid amount.",
      };
    }
    return { ok: true };
  };

  useEffect(() => {
    const loadConnectedAgencies = async () => {
      setLoadingConnectedAgencies(true);
      try {
        const response = await base44.get<{
          status?: string;
          agencies?: any[];
        }>("/api/brand/connected-agencies");
        setConnectedAgencies(
          Array.isArray(response?.agencies) ? response.agencies : [],
        );
      } catch {
        setConnectedAgencies([]);
      } finally {
        setLoadingConnectedAgencies(false);
      }
    };

    loadConnectedAgencies();
    void loadCampaignCards();
  }, []);

  const filteredConnectedAgencies = useMemo(() => {
    const term = agencySearch.trim().toLowerCase();
    if (!term) return connectedAgencies;
    return connectedAgencies.filter((agency) => {
      const name = String(agency?.display_name || agency?.agency_name || "")
        .trim()
        .toLowerCase();
      const email = String(agency?.email || "")
        .trim()
        .toLowerCase();
      const type = String(agency?.agency_type || "")
        .trim()
        .toLowerCase();
      return name.includes(term) || email.includes(term) || type.includes(term);
    });
  }, [agencySearch, connectedAgencies]);

  useEffect(() => {
    if (
      !showNewCampaignModal ||
      (newCampaignStep !== 3 && newCampaignStep !== 4)
    ) {
      return;
    }
    if (campaignForm.collaborator_type !== "creator") {
      setMarketplaceCreators([]);
      setLoadingMarketplaceCreators(false);
      return;
    }
    if (!brandCampaignId) {
      setMarketplaceCreators([]);
      setLoadingMarketplaceCreators(false);
      return;
    }

    const requestId = ++creatorFetchRequestIdRef.current;
    const collaboratorType = campaignForm.collaborator_type;
    const normalizedQuery = creatorSearch.trim().toLowerCase();
    const creatorCacheKey = `connected::${normalizedQuery}`;

    const cached = connectedCreatorCacheRef.current[creatorCacheKey];
    if (cached) {
      setMarketplaceCreators(cached);
      setLoadingMarketplaceCreators(false);
      return;
    }

    if (previousCollaboratorTypeRef.current !== collaboratorType) {
      setMarketplaceCreators([]);
    }
    previousCollaboratorTypeRef.current = collaboratorType;
    setLoadingMarketplaceCreators(true);

    const timer = setTimeout(async () => {
      try {
        const response = await base44.get<{
          items?: any[];
        }>(`/api/brand/campaigns/${brandCampaignId}/offer-options`, {
          params: {
            target_type: "creator",
            q: creatorSearch.trim() || undefined,
            limit: 60,
          },
        });
        if (creatorFetchRequestIdRef.current !== requestId) return;
        const normalizedRows = Array.isArray(response?.items)
          ? response.items
          : [];
        connectedCreatorCacheRef.current[creatorCacheKey] = normalizedRows;
        setMarketplaceCreators(normalizedRows);
      } catch {
        if (creatorFetchRequestIdRef.current !== requestId) return;
        setMarketplaceCreators([]);
      } finally {
        if (creatorFetchRequestIdRef.current !== requestId) return;
        setLoadingMarketplaceCreators(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [
    creatorSearch,
    brandCampaignId,
    showNewCampaignModal,
    newCampaignStep,
    campaignForm.collaborator_type,
  ]);

  const step3Creators = useMemo(() => {
    if (campaignForm.collaborator_type === "agency") {
      return marketplaceCreators;
    }
    return (campaignForm.collaborators || [])
      .map((creatorId) => selectedCreatorsById[String(creatorId)])
      .filter(Boolean);
  }, [
    campaignForm.collaborator_type,
    campaignForm.collaborators,
    marketplaceCreators,
    selectedCreatorsById,
  ]);

  const selectedCreatorIdsForRequest = useMemo(() => {
    if (campaignForm.collaborator_type === "agency") {
      return (campaignForm.collaborators || []).map((id) => String(id));
    }
    return (campaignForm.collaborators || []).map((id) => String(id));
  }, [
    campaignForm.collaborator_type,
    campaignForm.collaborators,
    selectedTalentCreatorIds,
  ]);

  const summaryCreatorNames = useMemo(() => {
    if (campaignForm.collaborator_type === "agency") {
      const agencyId = String(campaignForm.collaborators?.[0] || "");
      const selectedAgency = connectedAgencies.find(
        (agency) => String(agency?.agency_id || agency?.id || "") === agencyId,
      );
      if (!selectedAgency) return "N/A";
      return getDisplayName(
        selectedAgency?.display_name || selectedAgency?.agency_name,
      );
    }
    const names = selectedCreatorIdsForRequest
      .map((creatorId) => {
        const creator =
          selectedCreatorsById[creatorId] ||
          step3Creators.find((c) => String(c?.id || "") === creatorId);
        return getDisplayName(
          creator?.display_name || creator?.full_name || creator?.name,
        );
      })
      .filter(Boolean);
    return names.length > 0 ? names.join(", ") : "N/A";
  }, [
    campaignForm.collaborator_type,
    campaignForm.collaborators,
    connectedAgencies,
    selectedCreatorIdsForRequest,
    selectedCreatorsById,
    step3Creators,
  ]);

  const toggleCreatorCollaborator = (creator: any) => {
    const creatorId = String(creator?.id || "");
    if (!creatorId) return;
    setCampaignForm((prev) => {
      const exists = (prev.collaborators || []).some(
        (id) => String(id) === creatorId,
      );
      return {
        ...prev,
        collaborators: exists
          ? prev.collaborators.filter((id) => String(id) !== creatorId)
          : [...(prev.collaborators || []), creatorId],
      };
    });
    setSelectedCreatorsById((prev) => {
      const next = { ...prev };
      if (Object.prototype.hasOwnProperty.call(next, creatorId)) {
        delete next[creatorId];
      } else {
        next[creatorId] = creator;
      }
      return next;
    });
  };

  const resetCampaignBuilder = () => {
    setShowNewCampaignModal(false);
    setShowCampaignDocuSealBuilder(false);
    setBrandSignOpen(false);
    setBrandSignUrl("");
    setAwaitingBrandSignature(false);
    setNewCampaignStep(1);
    setBrandCampaignId("");
    setCampaignForm({
      name: "",
      objective: "",
      brief_file: null,
      category: "",
      description: "",
      usage_scope: "",
      duration_days: "30",
      territory: "Global",
      exclusivity: "Non-exclusive",
      budget_range: "",
      start_date: "",
      custom_terms: "",
      collaborator_type: "",
      collaborators: [],
    });
    setCampaignBrief({
      voice: "",
      tone: "",
      personality: "",
      key_messages: "",
      script_opening: "",
      script_middle: "",
      script_closing: "",
      dos: "",
      donts: "",
      required_deliverables: "",
      total_expected_deliverables: "",
      deliverables_reels: "",
      deliverables_hero_image: "",
      visual_color_palette: "",
      visual_setting: "",
      visual_framing: "",
      visual_editing: "",
      reference_images: [],
      brand_assets: [],
      overview_objective: "",
      overview_target_audience: "",
      overview_campaign_duration: "",
      overview_launch_date: "",
      budget_total: "",
      budget_creator_payment: "",
      budget_submission_deadline: "",
      budget_renewal_terms: "",
      revision_included: "",
      revision_major_changes: "",
      revision_turnaround: "",
      approval_process: "",
      watermark_protection: "",
      legal_terms: "",
    });
    setOfferByCreatorId({});
    setContractDraft({
      title: "",
      file_url: "",
      docuseal_template_id: "",
    });
    setSelectedCreatorsById({});
    setSelectedTalentCreatorIds(new Set());
    setMarketplaceCreators([]);
    setCreatorSearch("");
  };

  const ensureCampaignDraft = async (): Promise<string | null> => {
    try {
      setSavingCampaign(true);
      const durationDays = Number.parseInt(
        String(campaignForm.duration_days || "").trim(),
        10,
      );
      const normalizedDurationDays =
        Number.isFinite(durationDays) && durationDays > 0 ? durationDays : null;
      const normalizedBudgetRange = campaignForm.budget_range.trim();
      const normalizedStartDate = campaignForm.start_date.trim();
      if (!brandCampaignId) {
        const created = await base44.post<any>("/api/brand/campaigns", {
          name: campaignForm.name,
          objective: campaignForm.objective,
          category: campaignForm.category,
          description: campaignForm.description,
          usage_scope: campaignForm.usage_scope || null,
          duration_days: normalizedDurationDays,
          territory: campaignForm.territory || null,
          exclusivity: campaignForm.exclusivity || null,
          budget_range: normalizedBudgetRange,
          start_date: normalizedStartDate,
          custom_terms: campaignForm.custom_terms || null,
          brief_snapshot: campaignBrief,
        });
        const id = String(created?.id || "").trim();
        if (!id) {
          throw new Error("Campaign ID missing in create response");
        }
        setBrandCampaignId(id);
        return id;
      }
      await base44.post(`/api/brand/campaigns/${brandCampaignId}`, {
        name: campaignForm.name,
        objective: campaignForm.objective,
        category: campaignForm.category,
        description: campaignForm.description,
        usage_scope: campaignForm.usage_scope || null,
        duration_days: normalizedDurationDays,
        territory: campaignForm.territory || null,
        exclusivity: campaignForm.exclusivity || null,
        budget_range: normalizedBudgetRange,
        start_date: normalizedStartDate,
        custom_terms: campaignForm.custom_terms || null,
      });
      return brandCampaignId;
    } catch (e: any) {
      toast({
        title: "Unable to save campaign",
        description: e?.message || "Please check fields and try again.",
        variant: "destructive" as any,
      });
      return null;
    } finally {
      setSavingCampaign(false);
    }
  };

  const handleStep1Next = async () => {
    const validation = validateStep1Form();
    if (!validation.ok) {
      toast({
        title: "Please correct the form",
        description: validation.message || "Some fields are invalid.",
        variant: "destructive" as any,
      });
      return;
    }
    const id = await ensureCampaignDraft();
    if (!id) return;
    setNewCampaignStep(2);
  };

  const handleStep2Next = async () => {
    const validation = validateStep2Brief();
    if (!validation.ok) {
      toast({
        title: "Please correct the campaign brief",
        description: validation.message || "Some brief fields are invalid.",
        variant: "destructive" as any,
      });
      return;
    }
    const id = await ensureCampaignDraft();
    if (!id) return;
    try {
      setSavingCampaign(true);
      await base44.post(`/api/brand/campaigns/${id}`, {
        brief_snapshot: campaignBrief,
      });
      setNewCampaignStep(3);
    } catch (e: any) {
      toast({
        title: "Unable to save brief",
        description:
          e?.message || "We could not save step 2 data. Please try again.",
        variant: "destructive" as any,
      });
    } finally {
      setSavingCampaign(false);
    }
  };

  const handleReferenceImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    setUploadingImages(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const uploadWithApi = async () =>
        Promise.all(
          files.map(async (file) => {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch(api("/api/brand/brief-assets/upload"), {
              method: "POST",
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
              body: formData,
            });
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            return { name: file.name, url: data.url };
          }),
        );

      const uploadWithStorage = async () => {
        const userId = String(session?.user?.id || "brand");
        return Promise.all(
          files.map(async (file) => {
            const safeName = file.name.replace(/[^\w.\-]+/g, "_");
            const path = `campaign-brief/reference-images/${userId}/${Date.now()}_${Math.random()
              .toString(36)
              .slice(2, 8)}_${safeName}`;
            const { error: uploadError } = await supabase.storage
              .from("likelee-public")
              .upload(path, file);
            if (uploadError) throw uploadError;
            const { data } = supabase.storage
              .from("likelee-public")
              .getPublicUrl(path);
            return {
              name: file.name,
              url: String(data?.publicUrl || ""),
            };
          }),
        );
      };

      let uploaded: { name: string; url: string }[] = [];
      try {
        uploaded = await uploadWithApi();
      } catch {
        uploaded = await uploadWithStorage();
      }
      const valid = uploaded.filter(
        (x) => String(x.url || "").trim().length > 0,
      );
      setCampaignBrief((prev) => ({
        ...prev,
        reference_images: [...prev.reference_images, ...valid],
      }));
    } catch (e: any) {
      toast({
        title: "Reference image upload failed",
        description:
          e?.message || "We could not upload one or more reference images.",
        variant: "destructive" as any,
      });
    } finally {
      setUploadingImages(false);
      event.target.value = "";
    }
  };

  const handleBrandAssetsUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    setUploadingImages(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const uploadWithApi = async () =>
        Promise.all(
          files.map(async (file) => {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch(api("/api/brand/brief-assets/upload"), {
              method: "POST",
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
              body: formData,
            });
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            return { name: file.name, size: file.size, url: data.url };
          }),
        );

      const uploadWithStorage = async () => {
        const userId = String(session?.user?.id || "brand");
        return Promise.all(
          files.map(async (file) => {
            const safeName = file.name.replace(/[^\w.\-]+/g, "_");
            const path = `campaign-brief/brand-assets/${userId}/${Date.now()}_${Math.random()
              .toString(36)
              .slice(2, 8)}_${safeName}`;
            const { error: uploadError } = await supabase.storage
              .from("likelee-public")
              .upload(path, file);
            if (uploadError) throw uploadError;
            const { data } = supabase.storage
              .from("likelee-public")
              .getPublicUrl(path);
            return {
              name: file.name,
              size: file.size,
              url: String(data?.publicUrl || ""),
            };
          }),
        );
      };

      let uploaded: { name: string; size: number; url: string }[] = [];
      try {
        uploaded = await uploadWithApi();
      } catch {
        uploaded = await uploadWithStorage();
      }
      const valid = uploaded.filter(
        (x) => String(x.url || "").trim().length > 0,
      );
      setCampaignBrief((prev) => ({
        ...prev,
        brand_assets: [...prev.brand_assets, ...valid],
      }));
    } catch (e: any) {
      toast({
        title: "Brand asset upload failed",
        description: e?.message || "We could not upload one or more PDF files.",
        variant: "destructive" as any,
      });
    } finally {
      setUploadingImages(false);
      event.target.value = "";
    }
  };

  const handleSendOffer = async () => {
    if (!brandCampaignId) {
      toast({
        title: "Campaign not ready",
        description: "Please save campaign details first.",
        variant: "destructive" as any,
      });
      return;
    }

    if (campaignForm.collaborator_type === "creator") {
      if (newCampaignStep >= 5 && !contractDraft.docuseal_template_id.trim()) {
        toast({
          title: "DocuSeal template missing",
          description:
            "Upload a contract PDF first so we can create a DocuSeal template before sending.",
          variant: "destructive" as any,
        });
        return;
      }
      const creatorIds = selectedCreatorIdsForRequest.filter(Boolean);
      if (creatorIds.length === 0) {
        toast({
          title: "Select at least one creator",
          description: "Choose one or more creators before sending offer.",
          variant: "destructive" as any,
        });
        return;
      }

      try {
        const created = await base44.post<{ offers?: any[] }>(
          `/api/brand/campaigns/${brandCampaignId}/offers`,
          {
            target_type: "creator",
            target_ids: creatorIds,
            brief_snapshot: campaignBrief,
            message: campaignForm.custom_terms || null,
          },
        );

        const createdOffers = Array.isArray(created?.offers)
          ? created.offers
          : [];

        const shouldCreateContract =
          newCampaignStep >= 5 &&
          (contractDraft.file_url.trim() ||
            contractDraft.docuseal_template_id.trim());
        let brandSignatureRequested = false;

        if (shouldCreateContract && createdOffers.length > 0) {
          let firstBrandSigningUrl = "";
          await Promise.all(
            createdOffers.map(async (offer: any) => {
              const offerId = String(offer?.id || "").trim();
              if (!offerId) return;
              const contractResp = await base44.post<{ contract?: any }>(
                `/api/campaign-offers/${offerId}/contracts`,
                {
                  title:
                    contractDraft.title.trim() ||
                    `${campaignForm.name || "Campaign"} Contract`,
                  file_url: contractDraft.file_url.trim() || null,
                  docuseal_template_id: contractDraft.docuseal_template_id
                    ? Number(contractDraft.docuseal_template_id)
                    : null,
                },
              );
              const contractId = String(
                contractResp?.contract?.id || "",
              ).trim();
              const sendResp = await base44.post<{ contract?: any }>(
                `/api/campaign-offers/${offerId}/contracts/send`,
                {
                  contract_id: contractId || undefined,
                },
              );
              const brandSigningUrl = String(
                sendResp?.contract?.meta?.brand_signing_url || "",
              ).trim();
              if (!firstBrandSigningUrl && brandSigningUrl) {
                firstBrandSigningUrl = brandSigningUrl;
              }
            }),
          );
          if (firstBrandSigningUrl) {
            toast({
              title: "Brand signature required",
              description:
                "Sign as First Party now. Creator (Second Party) signs after your signature.",
            });
            setAwaitingBrandSignature(true);
            setBrandSignUrl(firstBrandSigningUrl);
            setBrandSignOpen(true);
            brandSignatureRequested = true;
          }
        }

        const requiresBrandSignature = brandSignatureRequested;
        if (requiresBrandSignature) {
          toast({
            title: "Offers sent",
            description:
              "Complete your brand signature before closing this campaign flow.",
          });
          await loadCampaignCards();
          return;
        }
      } catch (e: any) {
        toast({
          title: "Failed to send offers",
          description: e?.message || "Please try again.",
          variant: "destructive" as any,
        });
        return;
      }

      toast({
        title: "Offers sent",
        description: `${creatorIds.length} creator offer${creatorIds.length > 1 ? "s were" : " was"} sent successfully.`,
      });
      await loadCampaignCards();
      resetCampaignBuilder();
      return;
    }

    const agencyId = String(campaignForm.collaborators?.[0] || "");
    if (!agencyId) {
      toast({
        title: "Select an agency",
        description: "Choose a connected agency before sending offer.",
        variant: "destructive" as any,
      });
      return;
    }
    try {
      await base44.post(`/api/brand/campaigns/${brandCampaignId}/offers`, {
        target_type: "agency",
        target_ids: [agencyId],
        brief_snapshot: campaignBrief,
        message: campaignForm.custom_terms || null,
      });
      toast({
        title: "Offer sent",
        description: "Offer sent to the selected agency.",
      });
      await loadCampaignCards();
      resetCampaignBuilder();
    } catch (e: any) {
      toast({
        title: "Failed to send offer",
        description: e?.message || "Please try again.",
        variant: "destructive" as any,
      });
    }
  };

  const handleContractPdfUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast({
        title: "PDF required",
        description: "Please upload a PDF contract file.",
        variant: "destructive" as any,
      });
      event.target.value = "";
      return;
    }
    try {
      setSavingCampaign(true);
      const session = supabase
        ? await supabase.auth.getSession()
        : { data: { session: null } };
      const token = session.data.session?.access_token;
      const uploadRes = await fetch(
        api("/api/brand/docuseal/templates/upload"),
        {
          method: "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "Content-Type": "application/pdf",
            "x-file-name": file.name,
          },
          body: await file.arrayBuffer(),
        },
      );
      const uploadText = await uploadRes.text();
      if (!uploadRes.ok) {
        throw new Error(uploadText || "Failed to upload contract to DocuSeal");
      }
      const uploadJson = uploadText ? JSON.parse(uploadText) : {};
      const templateId = Number(uploadJson?.docuseal_template_id || 0);
      if (!templateId) {
        throw new Error("DocuSeal template ID missing from upload response");
      }
      setContractDraft((prev) => ({
        ...prev,
        title: file.name.replace(/\.pdf$/i, ""),
        file_url: "",
        docuseal_template_id: String(templateId),
      }));
      setContractUploadName(file.name);
      toast({
        title: "Contract uploaded",
        description:
          "PDF uploaded. DocuSeal editor is now open. Add signature fields for First Party and Second Party, then click Finalize & Send.",
      });
      setShowCampaignDocuSealBuilder(true);
    } catch (e: any) {
      toast({
        title: "Contract upload failed",
        description: e?.message || "Unable to upload PDF contract to DocuSeal.",
        variant: "destructive" as any,
      });
    } finally {
      setSavingCampaign(false);
      event.target.value = "";
    }
  };

  const selectedCampaignExpectedDeliverables = selectedCampaign
    ? expectedDeliverablesFromBrief(selectedCampaign)
    : 0;
  const selectedCampaignApprovedCount = selectedCampaignDeliverables.filter(
    (deliverable: any) =>
      ["approved", "accepted", "brand_approved"].includes(
        String(deliverable?.status || "").toLowerCase(),
      ),
  ).length;
  const selectedCampaignSubmittedCount = selectedCampaignDeliverables.length;
  const selectedCampaignTotalExpected =
    selectedCampaignExpectedDeliverables > 0
      ? selectedCampaignExpectedDeliverables
      : selectedCampaignSubmittedCount;

  return (
    <div className={`${embedded ? "bg-gray-50" : "min-h-screen bg-gray-50"}`}>
      {/* Top Navigation */}
      {!embedded && (
        <nav className="bg-white border-b-2 border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={() => navigate(createPageUrl("BrandDashboard"))}
                  className="rounded-none"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back to Dashboard
                </Button>
                <div className="flex items-center gap-3">
                  <img
                    src={mockBrand.logo}
                    alt="Brand"
                    className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                  />
                  <span className="text-xl font-bold text-gray-900">
                    {mockBrand.name}
                  </span>
                </div>
              </div>

              <Button
                onClick={() => setShowNewCampaignModal(true)}
                className="bg-[#F7B750] hover:bg-[#E6A640] text-white rounded-none"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </div>
          </div>
        </nav>
      )}

      <div className={`${embedded ? "" : "max-w-7xl mx-auto"} px-6 py-8`}>
        {embedded && (
          <div className="flex justify-end mb-3">
            <Button
              onClick={() => setShowNewCampaignModal(true)}
              className="bg-[#F7B750] hover:bg-[#E6A640] text-white rounded-none"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
          </div>
        )}
        {/* Metrics Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
            <DollarSign className="w-8 h-8 text-[#F7B750] mb-4" />
            <p className="text-sm text-gray-600 mb-1">Total Spend (30d)</p>
            <p className="text-3xl font-bold text-gray-900">
              ${(dashboardMetrics.totalSpend / 1000).toFixed(1)}K
            </p>
          </Card>

          <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
            <Users className="w-8 h-8 text-[#F7B750] mb-4" />
            <p className="text-sm text-gray-600 mb-1">Active Collaborators</p>
            <p className="text-3xl font-bold text-gray-900">
              {dashboardMetrics.activeCollaborators}
            </p>
          </Card>

          <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
            <FileText className="w-8 h-8 text-[#F7B750] mb-4" />
            <p className="text-sm text-gray-600 mb-1">Campaigns Launched</p>
            <p className="text-3xl font-bold text-gray-900">
              {dashboardMetrics.campaignsLaunched}
            </p>
          </Card>
        </div>

        {/* Collaboration CTAs + Post Job */}
        <div className="grid md:grid-cols-5 gap-6 mb-8">
          <Card
            className="p-6 bg-white border-2 border-[#F7B750] hover:shadow-xl transition-all cursor-pointer rounded-none"
            onClick={() => setShowInviteAgencyModal(true)}
          >
            <div className="w-12 h-12 bg-[#F7B750] rounded-none flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Collaborate with Agency
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Invite a marketing agency to manage your campaigns
            </p>
            <Button className="w-full bg-[#F7B750] hover:bg-[#E6A640] text-white rounded-none">
              <Mail className="w-4 h-4 mr-2" />
              Invite Agency
            </Button>
          </Card>

          <Card className="p-6 bg-white border-2 border-[#FAD54C]/60 opacity-70 rounded-none">
            <div className="w-12 h-12 bg-[#FAD54C] rounded-none flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Add AI Creator
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Work directly with verified AI creators
            </p>
            <Button
              disabled
              className="w-full bg-[#FAD54C] text-white rounded-none cursor-not-allowed"
            >
              Coming Soon
            </Button>
          </Card>

          <Card className="p-6 bg-white border-2 border-amber-600/60 opacity-70 rounded-none">
            <div className="w-12 h-12 bg-amber-600 rounded-none flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Invite Company Seat
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Add in-house AI creator to your team
            </p>
            <Button
              disabled
              className="w-full bg-amber-600 text-white rounded-none cursor-not-allowed"
            >
              Coming Soon
            </Button>
          </Card>

          <Card
            className="p-6 bg-white border-2 border-orange-600 hover:shadow-xl transition-all cursor-pointer rounded-none"
            onClick={() => setShowStudioUpgradeModal(true)}
          >
            <div className="w-12 h-12 bg-orange-600 rounded-none flex items-center justify-center mb-4 relative">
              {!hasStudioAddon && (
                <Lock className="w-4 h-4 text-white absolute top-1 right-1" />
              )}
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              AI Studio Add-On
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Generate content in-house without waiting
            </p>
            <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-none">
              {hasStudioAddon ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Enabled
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Enable Add-On
                </>
              )}
            </Button>
          </Card>

          <Card
            className="p-6 bg-white border-2 border-blue-600 hover:shadow-xl transition-all cursor-pointer rounded-none"
            onClick={() => setShowPostJobModal(true)}
          >
            <div className="w-12 h-12 bg-blue-600 rounded-none flex items-center justify-center mb-4">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Post a Job</h3>
            <p className="text-sm text-gray-600 mb-4">
              Find talent on the marketplace
            </p>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-none">
              <Plus className="w-4 h-4 mr-2" />
              Post Job
            </Button>
          </Card>
        </div>

        {/* Campaign Cards */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Your Campaigns</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCampaignListTab("active")}
                className={`border-2 rounded-none ${
                  campaignListTab === "active"
                    ? "border-black bg-black text-white"
                    : "border-gray-300"
                }`}
              >
                Active
              </Button>
              <Button
                variant="outline"
                onClick={() => setCampaignListTab("pending_approval")}
                className={`border-2 rounded-none ${
                  campaignListTab === "pending_approval"
                    ? "border-black bg-black text-white"
                    : "border-gray-300"
                }`}
              >
                Pending Approval
              </Button>
              <Button
                variant="outline"
                onClick={() => setCampaignListTab("completed")}
                className={`border-2 rounded-none ${
                  campaignListTab === "completed"
                    ? "border-black bg-black text-white"
                    : "border-gray-300"
                }`}
              >
                Expired
              </Button>
            </div>
          </div>

          {(() => {
            const filteredCampaigns = campaignCards.filter(
              (campaign) => campaign.status === campaignListTab,
            );
            if (loadingCampaignCards) {
              return (
                <Card className="p-4 bg-white border-2 border-gray-200 rounded-none">
                  <p className="text-sm text-gray-600">Loading campaigns...</p>
                </Card>
              );
            }
            if (filteredCampaigns.length === 0) {
              return (
                <Card className="p-4 bg-white border-2 border-gray-200 rounded-none">
                  <p className="text-sm text-gray-600">
                    {campaignListTab === "active"
                      ? "No active campaigns yet."
                      : campaignListTab === "pending_approval"
                        ? "No campaigns pending approval."
                        : "No expired campaigns yet."}
                  </p>
                </Card>
              );
            }
            return filteredCampaigns.map((campaign) => (
              <Card
                key={campaign.id}
                className="p-6 bg-white border-2 border-gray-200 hover:shadow-lg transition-all rounded-none"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {campaign.name}
                    </h3>
                    <div className="flex items-center gap-3 mb-3">
                      <Badge
                        className={
                          campaign.status === "active"
                            ? "bg-green-100 text-green-800"
                            : campaign.status === "pending_approval"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                        }
                      >
                        {formatCampaignStatusLabel(campaign)}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {campaign.objective}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>Budget: ${campaign.budget.toLocaleString()}</span>
                      <span>•</span>
                      <span>Start: {campaign.start_date}</span>
                      <span>•</span>
                      <span>
                        {campaign.collaborators.length} collaborator(s)
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={() => void openCampaignDetails(campaign)}
                    className="bg-[#F7B750] hover:bg-[#E6A640] text-white rounded-none"
                  >
                    View Details
                  </Button>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Progress</p>
                    <Progress
                      value={
                        campaign.deliverables > 0
                          ? (campaign.approved / campaign.deliverables) * 100
                          : 0
                      }
                      className="h-2 mb-2"
                    />
                    <p className="text-sm text-gray-600">
                      {campaign.approved} / {campaign.deliverables} deliverables
                      approved
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Collaborators</p>
                    <div className="flex flex-wrap gap-2">
                      {campaign.collaborators.length === 0 ? (
                        <span className="text-sm text-gray-500">
                          No collaborators yet.
                        </span>
                      ) : (
                        campaign.collaborators.map((collab, idx) => (
                          <Badge
                            key={idx}
                            className="bg-gray-200 text-gray-700"
                          >
                            {collab}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ));
          })()}
        </div>
      </div>

      {/* New Campaign Modal */}
      {showNewCampaignModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="min-h-screen flex items-center justify-center p-6">
            <Card className="w-full max-w-6xl bg-white p-8 border-2 border-black rounded-none">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Create New Campaign
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={resetCampaignBuilder}
                  className="rounded-none"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex items-center gap-2 ${newCampaignStep >= 1 ? "text-black" : "text-gray-400"}`}
                  >
                    <div
                      className={`w-8 h-8 border-2 rounded-none flex items-center justify-center ${newCampaignStep >= 1 ? "border-black bg-black text-white" : "border-gray-300"}`}
                    >
                      1
                    </div>
                    <span className="text-sm font-medium">Campaign Info</span>
                  </div>
                  <div className="flex-1 h-px bg-gray-300" />
                  <div
                    className={`flex items-center gap-2 ${newCampaignStep >= 2 ? "text-black" : "text-gray-400"}`}
                  >
                    <div
                      className={`w-8 h-8 border-2 rounded-none flex items-center justify-center ${newCampaignStep >= 2 ? "border-black bg-black text-white" : "border-gray-300"}`}
                    >
                      2
                    </div>
                    <span className="text-sm font-medium">Campaign Brief</span>
                  </div>
                  <div className="flex-1 h-px bg-gray-300" />
                  <div
                    className={`flex items-center gap-2 ${newCampaignStep >= 3 ? "text-black" : "text-gray-400"}`}
                  >
                    <div
                      className={`w-8 h-8 border-2 rounded-none flex items-center justify-center ${newCampaignStep >= 3 ? "border-black bg-black text-white" : "border-gray-300"}`}
                    >
                      3
                    </div>
                    <span className="text-sm font-medium">
                      {campaignForm.collaborator_type === "creator"
                        ? "Collaborators"
                        : "Collaborators"}
                    </span>
                  </div>
                  <div className="flex-1 h-px bg-gray-300" />
                  <div
                    className={`flex items-center gap-2 ${newCampaignStep >= 4 ? "text-black" : "text-gray-400"}`}
                  >
                    <div
                      className={`w-8 h-8 border-2 rounded-none flex items-center justify-center ${newCampaignStep >= 4 ? "border-black bg-black text-white" : "border-gray-300"}`}
                    >
                      4
                    </div>
                    <span className="text-sm font-medium">Offer Summary</span>
                  </div>
                  {campaignForm.collaborator_type === "creator" && (
                    <>
                      <div className="flex-1 h-px bg-gray-300" />
                      <div
                        className={`flex items-center gap-2 ${newCampaignStep >= 5 ? "text-black" : "text-gray-400"}`}
                      >
                        <div
                          className={`w-8 h-8 border-2 rounded-none flex items-center justify-center ${newCampaignStep >= 5 ? "border-black bg-black text-white" : "border-gray-300"}`}
                        >
                          5
                        </div>
                        <span className="text-sm font-medium">
                          Contract Upload
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {newCampaignStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      Campaign Name *
                    </label>
                    <Input
                      value={campaignForm.name}
                      onChange={(e) =>
                        setCampaignForm({
                          ...campaignForm,
                          name: e.target.value,
                        })
                      }
                      placeholder="e.g., Spring Collection Launch"
                      className="border-2 border-gray-300 rounded-none"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      Campaign Objective *
                    </label>
                    <Select
                      value={campaignForm.objective}
                      onValueChange={(v) =>
                        setCampaignForm({ ...campaignForm, objective: v })
                      }
                    >
                      <SelectTrigger className="border-2 border-gray-300 rounded-none">
                        <SelectValue placeholder="Select objective" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="awareness">
                          Brand Awareness
                        </SelectItem>
                        <SelectItem value="product_launch">
                          Product Launch
                        </SelectItem>
                        <SelectItem value="ugc">UGC Campaign</SelectItem>
                        <SelectItem value="regional_promo">
                          Regional Promotion
                        </SelectItem>
                        <SelectItem value="seasonal">
                          Seasonal Campaign
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      Category *
                    </label>
                    <Select
                      value={campaignForm.category}
                      onValueChange={(v) =>
                        setCampaignForm({ ...campaignForm, category: v })
                      }
                    >
                      <SelectTrigger className="border-2 border-gray-300 rounded-none">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Social Media">
                          Social Media
                        </SelectItem>
                        <SelectItem value="E-commerce">E-commerce</SelectItem>
                        <SelectItem value="Advertising">Advertising</SelectItem>
                        <SelectItem value="Editorial">Editorial</SelectItem>
                        <SelectItem value="Film & TV">Film & TV</SelectItem>
                        <SelectItem value="Custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      Description *
                    </label>
                    <Textarea
                      value={campaignForm.description}
                      onChange={(e) =>
                        setCampaignForm({
                          ...campaignForm,
                          description: e.target.value,
                        })
                      }
                      placeholder="Describe campaign goals and licensing context..."
                      className="border-2 border-gray-300 rounded-none min-h-[90px]"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-2">
                        Budget Min (USD) *
                      </label>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        inputMode="numeric"
                        value={budgetParts.min}
                        onChange={(e) => setBudgetPart("min", e.target.value)}
                        placeholder="5000"
                        className="border-2 border-gray-300 rounded-none"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-2">
                        Budget Max (USD) *
                      </label>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        inputMode="numeric"
                        value={budgetParts.max}
                        onChange={(e) => setBudgetPart("max", e.target.value)}
                        placeholder="10000"
                        className="border-2 border-gray-300 rounded-none"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-2">
                        Start Date *
                      </label>
                      <Input
                        type="date"
                        value={campaignForm.start_date}
                        onChange={(e) =>
                          setCampaignForm({
                            ...campaignForm,
                            start_date: e.target.value,
                          })
                        }
                        className="border-2 border-gray-300 rounded-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-2">
                        Usage scope
                      </label>
                      <Input
                        value={campaignForm.usage_scope}
                        onChange={(e) =>
                          setCampaignForm({
                            ...campaignForm,
                            usage_scope: e.target.value,
                          })
                        }
                        placeholder="e.g., Paid social + website"
                        className="border-2 border-gray-300 rounded-none"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-2">
                        Duration (days)
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={campaignForm.duration_days}
                        onChange={(e) =>
                          setCampaignForm({
                            ...campaignForm,
                            duration_days: e.target.value,
                          })
                        }
                        placeholder="30"
                        className="border-2 border-gray-300 rounded-none"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-2">
                        Territory
                      </label>
                      <Input
                        value={campaignForm.territory}
                        onChange={(e) =>
                          setCampaignForm({
                            ...campaignForm,
                            territory: e.target.value,
                          })
                        }
                        placeholder="Global / US only / EU"
                        className="border-2 border-gray-300 rounded-none"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-2">
                        Exclusivity
                      </label>
                      <Select
                        value={campaignForm.exclusivity}
                        onValueChange={(v) =>
                          setCampaignForm({
                            ...campaignForm,
                            exclusivity: v,
                          })
                        }
                      >
                        <SelectTrigger className="border-2 border-gray-300 rounded-none">
                          <SelectValue placeholder="Select exclusivity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Non-exclusive">
                            Non-exclusive
                          </SelectItem>
                          <SelectItem value="Category exclusive">
                            Category exclusive
                          </SelectItem>
                          <SelectItem value="Full exclusivity">
                            Full exclusivity
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      Custom Terms
                    </label>
                    <Textarea
                      value={campaignForm.custom_terms}
                      onChange={(e) =>
                        setCampaignForm({
                          ...campaignForm,
                          custom_terms: e.target.value,
                        })
                      }
                      placeholder="Any additional legal/commercial terms..."
                      className="border-2 border-gray-300 rounded-none min-h-[90px]"
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={resetCampaignBuilder}
                      className="border-2 border-gray-300 rounded-none bg-white text-black hover:bg-gray-50"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleStep1Next}
                      disabled={
                        savingCampaign ||
                        !campaignForm.name ||
                        !campaignForm.objective ||
                        !campaignForm.category ||
                        !campaignForm.description.trim() ||
                        !campaignForm.start_date ||
                        !budgetParts.min ||
                        !budgetParts.max
                      }
                      className="bg-black hover:bg-gray-800 text-white border-2 border-black rounded-none"
                    >
                      {savingCampaign ? "Saving..." : "Next"}
                    </Button>
                  </div>
                </div>
              )}

              {newCampaignStep === 2 && (
                <CampaignBriefStep
                  campaignBrief={campaignBrief}
                  setCampaignBrief={setCampaignBrief}
                  onReferenceImagesUpload={handleReferenceImageUpload}
                  onBrandAssetsUpload={handleBrandAssetsUpload}
                  onBack={() => setNewCampaignStep(1)}
                  onNext={handleStep2Next}
                  uploading={uploadingImages}
                />
              )}

              {newCampaignStep === 3 && (
                <div className="space-y-6">
                  <Alert className="bg-blue-50 border-2 border-blue-200 rounded-none">
                    <AlertCircle className="h-5 w-5 text-blue-600" />
                    <AlertDescription className="text-blue-900">
                      Select your collaborator type, then choose connected{" "}
                      {campaignForm.collaborator_type === "agency"
                        ? "talents"
                        : "creators"}
                      .
                    </AlertDescription>
                  </Alert>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-3">
                      Select Collaborator Type
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card
                        className={`p-4 border-2 cursor-pointer transition-all rounded-none ${
                          campaignForm.collaborator_type === "agency"
                            ? "border-black bg-gray-50"
                            : "border-gray-300 hover:border-black"
                        }`}
                        onClick={() => {
                          setCampaignForm((prev) => ({
                            ...prev,
                            collaborator_type: "agency",
                            collaborators: [],
                          }));
                          setSelectedCreatorsById({});
                          setSelectedTalentCreatorIds(new Set());
                          setCreatorSearch("");
                        }}
                      >
                        <Building2 className="w-8 h-8 text-black mb-2" />
                        <h4 className="font-bold text-gray-900 mb-1">
                          Marketing Agency
                        </h4>
                        <p className="text-xs text-gray-600">
                          Select talents from a connected agency
                        </p>
                      </Card>
                      <Card
                        className={`p-4 border-2 cursor-pointer transition-all rounded-none ${
                          campaignForm.collaborator_type === "creator"
                            ? "border-black bg-gray-50"
                            : "border-gray-300 hover:border-black"
                        }`}
                        onClick={() => {
                          setCampaignForm((prev) => ({
                            ...prev,
                            collaborator_type: "creator",
                            collaborators: [],
                          }));
                          setSelectedCreatorsById({});
                          setMarketplaceCreators([]);
                          setSelectedTalentCreatorIds(new Set());
                          setCreatorSearch("");
                        }}
                      >
                        <Sparkles className="w-8 h-8 text-black mb-2" />
                        <h4 className="font-bold text-gray-900 mb-1">
                          AI Creator
                        </h4>
                        <p className="text-xs text-gray-600">
                          Work directly with connected creators
                        </p>
                      </Card>
                    </div>
                  </div>

                  {campaignForm.collaborator_type === "agency" && (
                    <div className="space-y-4">
                      <label className="text-sm font-medium text-gray-700 block">
                        Select Agency
                      </label>
                      <Input
                        value={agencySearch}
                        onChange={(e) => setAgencySearch(e.target.value)}
                        placeholder="Search connected agencies..."
                        className="border-2 border-gray-300 rounded-none"
                      />
                      <div className="border-2 border-gray-200 rounded-none p-3 space-y-3">
                        {loadingConnectedAgencies ? (
                          <p className="text-sm text-gray-500">
                            Loading connected agencies...
                          </p>
                        ) : filteredConnectedAgencies.length === 0 ? (
                          <p className="text-sm text-gray-500">
                            No connected agencies found.
                          </p>
                        ) : (
                          filteredConnectedAgencies.map((agency) => {
                            const agencyId = String(
                              agency?.agency_id || agency?.id || "",
                            );
                            const selected =
                              campaignForm.collaborators?.includes(agencyId);
                            return (
                              <div
                                key={agencyId}
                                className={`w-full border-2 p-3 rounded-none transition-colors ${
                                  selected
                                    ? "border-black bg-gray-50"
                                    : "border-gray-200 hover:border-gray-400"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="font-semibold text-gray-900">
                                      {agency?.display_name ||
                                        agency?.agency_name ||
                                        "Agency"}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                      {agency?.agency_type || "Agency"}
                                    </p>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-10 border-2 border-gray-300 rounded-none"
                                    onClick={() =>
                                      setCampaignForm((prev) => ({
                                        ...prev,
                                        collaborators: agencyId
                                          ? [agencyId]
                                          : [],
                                      }))
                                    }
                                  >
                                    {selected ? "Selected" : "Select"}
                                  </Button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {campaignForm.collaborator_type === "creator" && (
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-700 block">
                        {campaignForm.collaborator_type === "agency"
                          ? "Select Talents"
                          : "Select Creators"}
                      </label>
                      <Input
                        value={creatorSearch}
                        onChange={(e) => setCreatorSearch(e.target.value)}
                        placeholder={
                          campaignForm.collaborator_type === "agency"
                            ? "Search talents..."
                            : "Search creators..."
                        }
                        className="border-2 border-gray-300 rounded-none"
                      />
                      <div className="border-2 border-gray-200 rounded-none p-3 max-h-[340px] overflow-y-auto space-y-3">
                        {loadingMarketplaceCreators ? (
                          <p className="text-sm text-gray-500">
                            {campaignForm.collaborator_type === "agency"
                              ? "Loading talents..."
                              : "Loading creators..."}
                          </p>
                        ) : marketplaceCreators.length === 0 ? (
                          <p className="text-sm text-gray-500">
                            {campaignForm.collaborator_type === "agency"
                              ? "No talents found for this agency."
                              : "No connected creators found."}
                          </p>
                        ) : (
                          marketplaceCreators.map((creator) => {
                            const creatorId = String(creator?.id || "");
                            const selected =
                              campaignForm.collaborator_type === "agency"
                                ? selectedTalentCreatorIds.has(creatorId)
                                : campaignForm.collaborators?.includes(
                                    creatorId,
                                  );
                            const name = getDisplayName(
                              creator?.display_name ||
                                creator?.full_name ||
                                creator?.name,
                            );
                            const creatorType = String(
                              creator?.creator_type ||
                                (campaignForm.collaborator_type === "agency"
                                  ? "Talent"
                                  : "Creator"),
                            );
                            const baseRateWeeklyCents = Number(
                              creator?.base_rate_weekly_cents ??
                                creator?.base_weekly_price_cents ??
                                creator?.licensing_rate_weekly_cents ??
                                0,
                            );
                            const hasBaseRate =
                              Number.isFinite(baseRateWeeklyCents) &&
                              baseRateWeeklyCents > 0;
                            const rateCurrency = String(
                              creator?.rate_currency ||
                                creator?.currency_code ||
                                "USD",
                            );
                            const canNegotiate = isNegotiationEnabled(
                              creator?.accept_negotiations,
                            );

                            return (
                              <div
                                key={creatorId}
                                className={`border-2 p-3 rounded-none ${
                                  selected
                                    ? "border-black bg-gray-50"
                                    : "border-gray-200"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-4">
                                  <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-gray-900 truncate">
                                      {name}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                      {creatorType}
                                    </p>
                                  </div>
                                  <div className="w-56 shrink-0 text-right">
                                    {/* Keep negotiation logic in data layer, but hide per request */}
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-10 border-2 border-gray-300 rounded-none"
                                    onClick={() => {
                                      if (
                                        campaignForm.collaborator_type ===
                                        "agency"
                                      ) {
                                        setSelectedTalentCreatorIds((prev) => {
                                          const next = new Set(prev);
                                          if (next.has(creatorId)) {
                                            next.delete(creatorId);
                                          } else {
                                            next.add(creatorId);
                                          }
                                          return next;
                                        });
                                        setSelectedCreatorsById((prev) => ({
                                          ...prev,
                                          [creatorId]: creator,
                                        }));
                                        return;
                                      }
                                      toggleCreatorCollaborator(creator);
                                    }}
                                  >
                                    {selected ? "Selected" : "Select"}
                                  </Button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setNewCampaignStep(2)}
                      className="border-2 border-gray-300 rounded-none bg-white text-black hover:bg-gray-50"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={() => setNewCampaignStep(4)}
                      disabled={
                        !campaignForm.collaborator_type ||
                        selectedCreatorIdsForRequest.length === 0
                      }
                      className="bg-black hover:bg-gray-800 text-white border-2 border-black rounded-none"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}

              {newCampaignStep === 4 && (
                <div className="space-y-6">
                  <Alert className="bg-blue-50 border-2 border-blue-200 rounded-none">
                    <CheckCircle2 className="h-5 w-5 text-blue-700" />
                    <AlertDescription className="text-blue-900">
                      {campaignForm.collaborator_type === "agency"
                        ? "Summary of selected agency. Send this offer to continue."
                        : "Summary of selected creators. Continue to contract upload."}
                    </AlertDescription>
                  </Alert>

                  <div className="border-2 border-gray-200 rounded-none p-4 space-y-3">
                    <p className="text-sm text-gray-600">Campaign name</p>
                    <p className="font-semibold text-gray-900">
                      {campaignForm.name || "Untitled Campaign"}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
                      <p>
                        {campaignForm.collaborator_type === "agency"
                          ? "Agency name(s): "
                          : "Creator name(s): "}
                        <span className="font-semibold text-gray-900">
                          {summaryCreatorNames}
                        </span>
                      </p>
                      <p>
                        Category:{" "}
                        <span className="font-semibold text-gray-900">
                          {campaignForm.category || "N/A"}
                        </span>
                      </p>
                      <p>
                        Budget range:{" "}
                        <span className="font-semibold text-gray-900">
                          {campaignForm.budget_range || "N/A"}
                        </span>
                      </p>
                      <p>
                        Usage scope:{" "}
                        <span className="font-semibold text-gray-900">
                          {campaignForm.usage_scope || "N/A"}
                        </span>
                      </p>
                      <p>
                        Territory:{" "}
                        <span className="font-semibold text-gray-900">
                          {campaignForm.territory || "N/A"}
                        </span>
                      </p>
                      <p>
                        Start date:{" "}
                        <span className="font-semibold text-gray-900">
                          {campaignForm.start_date || "N/A"}
                        </span>
                      </p>
                      <p>
                        Duration:{" "}
                        <span className="font-semibold text-gray-900">
                          {campaignForm.duration_days
                            ? `${campaignForm.duration_days} days`
                            : "N/A"}
                        </span>
                      </p>
                    </div>
                  </div>

                  {campaignForm.collaborator_type === "agency" ? (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-gray-700">
                        Selected agency
                      </p>
                      <div className="border border-gray-200 rounded-none p-3 bg-white">
                        <p className="font-semibold text-gray-900">
                          {(() => {
                            const agencyId = String(
                              campaignForm.collaborators?.[0] || "",
                            );
                            const selectedAgency = connectedAgencies.find(
                              (agency) =>
                                String(
                                  agency?.agency_id || agency?.id || "",
                                ) === agencyId,
                            );
                            return (
                              selectedAgency?.display_name ||
                              selectedAgency?.agency_name ||
                              "Agency"
                            );
                          })()}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-gray-700">
                        Selected creators ({selectedCreatorIdsForRequest.length}
                        )
                      </p>
                      <div className="border-2 border-gray-200 rounded-none p-3 max-h-[320px] overflow-y-auto space-y-3">
                        {selectedCreatorIdsForRequest.map((creatorId) => {
                          const creator =
                            selectedCreatorsById[creatorId] ||
                            step3Creators.find(
                              (c) => String(c?.id || "") === creatorId,
                            );
                          const name = getDisplayName(
                            creator?.display_name ||
                              creator?.full_name ||
                              creator?.name,
                          );
                          const baseRateWeeklyCents = Number(
                            creator?.base_rate_weekly_cents ??
                              creator?.base_weekly_price_cents ??
                              creator?.licensing_rate_weekly_cents ??
                              0,
                          );
                          const hasBaseRate =
                            Number.isFinite(baseRateWeeklyCents) &&
                            baseRateWeeklyCents > 0;
                          const rateCurrency = String(
                            creator?.rate_currency ||
                              creator?.currency_code ||
                              "USD",
                          );
                          const canNegotiate = isNegotiationEnabled(
                            creator?.accept_negotiations,
                          );

                          return (
                            <div
                              key={creatorId}
                              className="border border-gray-200 rounded-none p-3 bg-white"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <p className="font-semibold text-gray-900">
                                  {name}
                                </p>
                                <div className="text-right" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setNewCampaignStep(3)}
                      className="border-2 border-gray-300 rounded-none bg-white text-black hover:bg-gray-50"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    {campaignForm.collaborator_type === "creator" ? (
                      <Button
                        type="button"
                        onClick={() => setNewCampaignStep(5)}
                        className="bg-black hover:bg-gray-800 text-white border-2 border-black rounded-none"
                      >
                        Next
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleSendOffer}
                        className="bg-black hover:bg-gray-800 text-white border-2 border-black rounded-none"
                      >
                        Send Offer
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {newCampaignStep === 5 &&
                campaignForm.collaborator_type === "creator" && (
                  <div className="space-y-6">
                    <Alert className="bg-blue-50 border-2 border-blue-200 rounded-none">
                      <AlertCircle className="h-5 w-5 text-blue-700" />
                      <AlertDescription className="text-blue-900">
                        Upload your PDF contract. The DocuSeal editor will open
                        immediately so you can add First/Second party fields and
                        signature blocks, then send with each creator offer.
                      </AlertDescription>
                    </Alert>
                    <div className="border-2 border-gray-200 rounded-none p-4 space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-2">
                          Upload contract PDF
                        </label>
                        <div className="flex flex-wrap items-center gap-3">
                          <input
                            id="campaign-contract-upload"
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={handleContractPdfUpload}
                            className="text-sm"
                          />
                          {contractUploadName && (
                            <span className="text-xs text-gray-600">
                              Uploaded: {contractUploadName}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-600">
                        {contractDraft.docuseal_template_id
                          ? `Template ID: ${contractDraft.docuseal_template_id}. Editor opens automatically after upload.`
                          : "Choose a PDF to create a DocuSeal template and open the editor."}
                      </p>
                    </div>
                    <div className="flex justify-between gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setNewCampaignStep(4)}
                        className="border-2 border-gray-300 rounded-none bg-white text-black hover:bg-gray-50"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSendOffer}
                        disabled={
                          !contractDraft.docuseal_template_id || savingCampaign
                        }
                        className="bg-black hover:bg-gray-800 text-white border-2 border-black rounded-none"
                      >
                        Send Offer
                      </Button>
                    </div>
                  </div>
                )}
            </Card>
          </div>
        </div>
      )}

      <DocuSealBuilderModal
        open={showCampaignDocuSealBuilder}
        onClose={useCallback(() => setShowCampaignDocuSealBuilder(false), [])}
        templateName={
          contractDraft.title || campaignForm.name || "Campaign Contract"
        }
        docusealTemplateId={
          contractDraft.docuseal_template_id
            ? Number(contractDraft.docuseal_template_id)
            : undefined
        }
        builderRoles={useMemo(() => ["First Party", "Second Party"], [])}
        onSave={useCallback(() => {}, [])}
        onSend={useCallback(async () => {
          setIsSendingFromBuilder(true);
          try {
            await handleSendOffer();
          } finally {
            setIsSendingFromBuilder(false);
          }
        }, [handleSendOffer])}
        isSending={isSendingFromBuilder}
      />
      <Dialog
        open={brandSignOpen}
        onOpenChange={(open) => {
          if (!open && awaitingBrandSignature) return;
          setBrandSignOpen(open);
        }}
      >
        <DialogContent className="fixed !inset-0 bg-background w-screen h-screen !max-w-none !translate-x-0 !translate-y-0 !rounded-none border-none p-0 flex flex-col outline-none">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Brand Signature</DialogTitle>
            <DialogDescription>
              Sign as First Party. The creator receives this same contract as
              Second Party.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 w-full bg-gray-50 overflow-auto">
            {brandSignUrl ? <DocusealForm src={brandSignUrl} /> : null}
          </div>
          <DialogFooter className="p-4 border-t">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setBrandSignOpen(false);
                if (awaitingBrandSignature) {
                  setAwaitingBrandSignature(false);
                  resetCampaignBuilder();
                }
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Agency Modal */}
      {showInviteAgencyModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="min-h-screen flex items-center justify-center p-6">
            <Card className="w-full max-w-2xl bg-white p-8 rounded-none">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Invite Marketing Agency
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowInviteAgencyModal(false)}
                  className="rounded-none"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">
                    Choose Invitation Method
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-6 border-2 border-gray-200 bg-gray-50 rounded-none opacity-80">
                      <Mail className="w-8 h-8 text-gray-400 mb-3" />
                      <h4 className="font-bold text-gray-900 mb-2">
                        Invite via Email
                      </h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Email invite flow will be available soon
                      </p>
                      <Input
                        placeholder="agency@example.com"
                        className="border-2 border-gray-300 rounded-none mb-3"
                        disabled
                      />
                      <Button
                        disabled
                        className="w-full bg-gray-300 text-gray-600 rounded-none cursor-not-allowed"
                      >
                        Coming Soon
                      </Button>
                    </Card>

                    <Card className="p-6 border-2 border-gray-300 hover:border-[#F7B750] cursor-pointer transition-all rounded-none">
                      <Building2 className="w-8 h-8 text-[#F7B750] mb-3" />
                      <h4 className="font-bold text-gray-900 mb-2">
                        Browse Marketplace
                      </h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Select from Likelee partner agencies
                      </p>
                      <Button
                        onClick={() => {
                          setShowInviteAgencyModal(false);
                          navigate(createPageUrl("BrandDashboard"), {
                            state: { activeSection: "marketplace-agencies" },
                          });
                        }}
                        className="w-full bg-[#F7B750] hover:bg-[#E6A640] text-white rounded-none"
                      >
                        <Search className="w-4 h-4 mr-2" />
                        View Agencies
                      </Button>
                    </Card>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Invite Creator Modal */}
      {showInviteCreatorModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="min-h-screen flex items-center justify-center p-6">
            <Card className="w-full max-w-2xl bg-white p-8 rounded-none">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Invite AI Creator
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowInviteCreatorModal(false)}
                  className="rounded-none"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-6">
                <Input
                  placeholder="Search verified AI creators..."
                  className="border-2 border-gray-300 rounded-none"
                />

                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Card
                      key={i}
                      className="p-4 border-2 border-gray-200 hover:border-[#FAD54C] transition-all rounded-none"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gray-200 rounded-full" />
                          <div>
                            <h4 className="font-bold text-gray-900">
                              AI Creator {i}
                            </h4>
                            <p className="text-sm text-gray-600">
                              Video editing & voice synthesis
                            </p>
                          </div>
                        </div>
                        <Button className="bg-[#FAD54C] hover:bg-[#E6C33C] text-white rounded-none">
                          Invite
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Invite Seat Modal */}
      {showInviteSeatModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="min-h-screen flex items-center justify-center p-6">
            <Card className="w-full max-w-2xl bg-white p-8 rounded-none">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Invite Company Seat (In-House Creator)
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowInviteSeatModal(false)}
                  className="rounded-none"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <Alert className="mb-6 bg-amber-50 border-2 border-amber-600 rounded-none">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <AlertDescription className="text-amber-900">
                  This will create an in-house AI Creator profile for your team
                  member. All their work and details will stay within your brand
                  dashboard.
                </AlertDescription>
              </Alert>

              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Team Member Email *
                  </label>
                  <Input
                    placeholder="teammate@yourcompany.com"
                    className="border-2 border-gray-300 rounded-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Full Name *
                  </label>
                  <Input
                    placeholder="John Doe"
                    className="border-2 border-gray-300 rounded-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Role
                  </label>
                  <Select>
                    <SelectTrigger className="border-2 border-gray-300 rounded-none">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video_editor">Video Editor</SelectItem>
                      <SelectItem value="designer">Designer</SelectItem>
                      <SelectItem value="content_creator">
                        Content Creator
                      </SelectItem>
                      <SelectItem value="campaign_manager">
                        Campaign Manager
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowInviteSeatModal(false)}
                    className="border-2 border-gray-300 rounded-none"
                  >
                    Cancel
                  </Button>
                  <Button className="bg-amber-600 hover:bg-amber-700 text-white rounded-none">
                    <Mail className="w-4 h-4 mr-2" />
                    Send Invitation
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Studio Upgrade Modal */}
      {showStudioUpgradeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="min-h-screen flex items-center justify-center p-6">
            <Card className="w-full max-w-3xl bg-white p-8 rounded-none">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  AI Studio Add-On
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowStudioUpgradeModal(false)}
                  className="rounded-none"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-none flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Generate Content In-House
                </h3>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Unlock the full Likelee Studio to create AI-generated videos,
                  images, and voiceovers without waiting for agency cycles.
                  Perfect for brands scaling fast.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <Card className="p-6 border-2 border-gray-200 rounded-none">
                  <CheckCircle2 className="w-8 h-8 text-green-600 mb-3" />
                  <h4 className="font-bold text-gray-900 mb-2">
                    Direct Content Creation
                  </h4>
                  <p className="text-sm text-gray-600">
                    Generate videos and images instantly without agency delays
                  </p>
                </Card>

                <Card className="p-6 border-2 border-gray-200 rounded-none">
                  <Users className="w-8 h-8 text-orange-600 mb-3" />
                  <h4 className="font-bold text-gray-900 mb-2">
                    Team Collaboration
                  </h4>
                  <p className="text-sm text-gray-600">
                    Share studio access with your in-house creative team
                  </p>
                </Card>

                <Card className="p-6 border-2 border-gray-200 rounded-none">
                  <Sparkles className="w-8 h-8 text-purple-600 mb-3" />
                  <h4 className="font-bold text-gray-900 mb-2">
                    AI-Powered Tools
                  </h4>
                  <p className="text-sm text-gray-600">
                    Access Runway, Sora, ElevenLabs, and more via one platform
                  </p>
                </Card>

                <Card className="p-6 border-2 border-gray-200 rounded-none">
                  <Shield className="w-8 h-8 text-blue-600 mb-3" />
                  <h4 className="font-bold text-gray-900 mb-2">
                    Rights Management
                  </h4>
                  <p className="text-sm text-gray-600">
                    Automatic tracking and compliance for all generated content
                  </p>
                </Card>
              </div>

              <Card className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-600 rounded-none mb-8">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-2xl font-bold text-gray-900 mb-2">
                      $299/month
                    </h4>
                    <p className="text-gray-700 mb-4">
                      Includes 500 AI generation credits/month
                    </p>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-orange-600" />
                        Full Studio access for up to 5 team members
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-orange-600" />
                        Priority rendering & faster generation
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-orange-600" />
                        Advanced analytics & performance tracking
                      </li>
                    </ul>
                  </div>
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white rounded-none">
                    Enable Add-On
                  </Button>
                </div>
              </Card>

              <p className="text-sm text-gray-600 text-center">
                💡 <strong>Note:</strong> You can still work with agencies and
                creators even with Studio access. This add-on simply gives you
                the flexibility to create in-house when needed.
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* Campaign Details Modal (Deliverables & Feedback) */}
      {selectedCampaign && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="min-h-screen flex items-center justify-center p-6">
            <Card className="w-full max-w-5xl bg-white p-8 rounded-none max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedCampaign.name}
                  </h2>
                  <Badge className="mt-2 bg-green-100 text-green-800">
                    {formatCampaignStatusLabel(selectedCampaign)}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  {(selectedCampaign.status === "active" ||
                    (selectedCampaign.status === "completed" &&
                      !selectedCampaign.completed_at)) && (
                    <Button
                      onClick={() => setMarkDoneOpen(true)}
                      className="bg-green-600 hover:bg-green-700 text-white rounded-none"
                    >
                      Mark as Done
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedCampaign(null);
                      setSelectedCampaignDeliverables([]);
                      setSelectedCampaignCollaborators([]);
                    }}
                    className="rounded-none"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <Card className="p-4 border-2 border-gray-200 rounded-none">
                  <p className="text-sm text-gray-600 mb-1">Budget</p>
                  <p className="text-xl font-bold text-gray-900">
                    ${selectedCampaign.budget.toLocaleString()}
                  </p>
                </Card>
                <Card className="p-4 border-2 border-gray-200 rounded-none">
                  <p className="text-sm text-gray-600 mb-1">Deliverables</p>
                  <p className="text-xl font-bold text-gray-900">
                    {selectedCampaignApprovedCount} /{" "}
                    {selectedCampaignTotalExpected}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedCampaignSubmittedCount} submitted
                  </p>
                </Card>
                <Card className="p-4 border-2 border-gray-200 rounded-none">
                  <p className="text-sm text-gray-600 mb-1">Start Date</p>
                  <p className="text-xl font-bold text-gray-900">
                    {selectedCampaign.start_date}
                  </p>
                </Card>
              </div>
              {selectedCampaign.status === "completed" && (
                <Card className="p-4 border-2 border-gray-200 rounded-none mb-8">
                  <p className="text-sm text-gray-600 mb-1">
                    Completion Status
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {selectedCampaign.completed_at ? "Completed" : "Incomplete"}
                  </p>
                  {selectedCampaign.completed_at && (
                    <p className="text-xs text-gray-500 mt-1">
                      Marked done on{" "}
                      {new Date(
                        String(selectedCampaign.completed_at),
                      ).toLocaleString()}
                    </p>
                  )}
                </Card>
              )}
              <div className="mb-8">
                <p className="text-sm text-gray-600 mb-2">Collaborators</p>
                <div className="flex flex-wrap gap-2">
                  {selectedCampaignCollaborators.length === 0 ? (
                    <span className="text-sm text-gray-500">
                      No collaborators assigned yet.
                    </span>
                  ) : (
                    selectedCampaignCollaborators.map((label, idx) => (
                      <Badge
                        key={`${label}-${idx}`}
                        className="bg-gray-200 text-gray-700"
                      >
                        {label}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Deliverables & Feedback
                </h3>
                {loadingSelectedCampaignDetails && (
                  <Card className="p-6 border-2 border-gray-200 rounded-none">
                    <p className="text-sm text-gray-600">
                      Loading campaign deliverables...
                    </p>
                  </Card>
                )}
                {!loadingSelectedCampaignDetails &&
                  selectedCampaignDeliverables.length === 0 && (
                    <Card className="p-6 border-2 border-gray-200 rounded-none">
                      <p className="text-sm text-gray-600">
                        No deliverables submitted yet for this campaign.
                      </p>
                    </Card>
                  )}
                {!loadingSelectedCampaignDetails &&
                  selectedCampaignDeliverables.map(
                    (deliverable: any, idx: number) => {
                      const status = String(
                        deliverable?.status || "pending_review",
                      ).toLowerCase();
                      const displayStatus =
                        status === "brand_approved" ? "approved" : status;
                      const statusClass =
                        displayStatus === "approved" ||
                        displayStatus === "accepted"
                          ? "bg-emerald-100 text-emerald-700"
                          : displayStatus === "changes_requested" ||
                              displayStatus === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-800";
                      const uploadedAtRaw = String(
                        deliverable?.created_at || "",
                      ).trim();
                      const uploadedAt = uploadedAtRaw
                        ? new Date(uploadedAtRaw).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "N/A";
                      return (
                        <Card
                          key={String(deliverable?.id || idx)}
                          className="p-6 border-2 border-gray-200 rounded-none"
                        >
                          <div className="flex items-start gap-6">
                            <div className="w-48 h-32 bg-gray-100 rounded-none flex items-center justify-center overflow-hidden">
                              {String(deliverable?.asset_type || "").startsWith(
                                "image",
                              ) && deliverable?.asset_url ? (
                                <img
                                  src={String(deliverable.asset_url)}
                                  alt={String(
                                    deliverable?.caption ||
                                      `Deliverable #${idx + 1}`,
                                  )}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Play className="w-12 h-12 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h4 className="font-bold text-gray-900 mb-1">
                                    {`Deliverable ${idx + 1}`}
                                  </h4>
                                  <p className="text-sm text-gray-600 mb-2">
                                    Uploaded {uploadedAt} by{" "}
                                    {String(
                                      deliverable?.collaborator_label ||
                                        "Campaign collaborator",
                                    )}
                                  </p>
                                  <Badge className={statusClass}>
                                    {displayStatus.replace(/_/g, " ")}
                                  </Badge>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white rounded-none"
                                    onClick={() =>
                                      void reviewSelectedCampaignDeliverable(
                                        deliverable,
                                        "approve",
                                      )
                                    }
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-2 border-gray-300 rounded-none"
                                    onClick={() =>
                                      void reviewSelectedCampaignDeliverable(
                                        deliverable,
                                        "changes_requested",
                                      )
                                    }
                                  >
                                    Request Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-2 border-gray-300 rounded-none"
                                    onClick={() =>
                                      void downloadSelectedCampaignDeliverable(
                                        deliverable,
                                        idx,
                                      )
                                    }
                                  >
                                    <Download className="w-3 h-3 mr-1" />
                                    Download
                                  </Button>
                                </div>
                              </div>
                              <div className="border-t-2 border-gray-200 pt-4">
                                <h5 className="text-sm font-bold text-gray-900 mb-1">
                                  Comments &amp; Feedback
                                </h5>
                                <div className="space-y-3">
                                  {(Array.isArray(
                                    deliverable?.meta?.feedback_comments,
                                  )
                                    ? deliverable.meta.feedback_comments
                                    : []
                                  ).map((comment: any) => (
                                    <div
                                      key={String(comment?.id || Math.random())}
                                      className="rounded-md border border-gray-200 bg-white px-3 py-2"
                                    >
                                      <p className="text-sm font-semibold text-gray-900">
                                        {String(comment?.author_role || "User")}
                                      </p>
                                      <p className="text-sm text-gray-700">
                                        {String(comment?.message || "")}
                                      </p>
                                      <p className="text-xs text-gray-500 mt-1">
                                        {comment?.created_at
                                          ? new Date(
                                              String(comment.created_at),
                                            ).toLocaleString()
                                          : ""}
                                      </p>
                                    </div>
                                  ))}
                                  <div className="flex items-center gap-2">
                                    <Input
                                      value={
                                        deliverableCommentDrafts[
                                          String(deliverable?.id || "")
                                        ] || ""
                                      }
                                      onChange={(event) =>
                                        setDeliverableCommentDrafts((prev) => ({
                                          ...prev,
                                          [String(deliverable?.id || "")]:
                                            event.target.value,
                                        }))
                                      }
                                      placeholder="Add a comment..."
                                      className="border-2 border-gray-300 rounded-none"
                                    />
                                    <Button
                                      className="bg-black hover:bg-gray-900 text-white rounded-none"
                                      onClick={() =>
                                        void commentSelectedCampaignDeliverable(
                                          deliverable,
                                        )
                                      }
                                    >
                                      Send
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    },
                  )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Post Job Modal */}
      {showPostJobModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="min-h-screen flex items-center justify-center p-6">
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl("PostJob"))}
              className="absolute top-4 left-4 text-white hover:bg-white/10 rounded-none"
            >
              Open Full Form
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPostJobModal(false)}
              className="absolute top-4 right-4 text-white hover:bg-white/10 rounded-none"
            >
              <X className="w-5 h-5" />
            </Button>
            <Card className="w-full max-w-4xl bg-white p-8 rounded-none">
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-blue-600 rounded-none flex items-center justify-center mx-auto mb-6">
                  <Briefcase className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Post a Job to Find Talent
                </h2>
                <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                  Create a detailed job posting to connect with AI creators,
                  marketing agencies, and verified talent for your next
                  campaign.
                </p>
                <Button
                  onClick={() => navigate(createPageUrl("PostJob"))}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-none"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Job Posting
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      <AlertDialog open={markDoneOpen} onOpenChange={setMarkDoneOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark campaign as done?</AlertDialogTitle>
            <AlertDialogDescription>
              This action is irreversible. The campaign will be marked as
              completed and removed from Active.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={markDoneBusy}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkCampaignDone}
              disabled={markDoneBusy}
            >
              {markDoneBusy ? "Saving..." : "Mark as Done"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
