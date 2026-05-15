import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/auth/AuthProvider";
import {
  brandAllowsCampaignCollaboration,
  brandMaxCampaignWizardStep,
  brandPlanCampaignLimit,
  brandPlanSeatLimit,
  hasBrandStudioAccess,
  normalizeBrandPlanTier,
} from "@/lib/brandBilling";
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
import { UnpaidDeliverableModal } from "@/components/brand/UnpaidDeliverableModal";

// Brand data is now loaded from API via getBrandProfile()

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
  const { t } = useTranslation("brand");
  const { toast } = useToast();
  const { user, supabase, profile } = useAuth();

  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [step1FieldErrors, setStep1FieldErrors] = useState<
    Record<string, string>
  >({});
  const [step2FieldErrors, setStep2FieldErrors] = useState<
    Record<string, string>
  >({});
  const [wizardErrorBanner, setWizardErrorBanner] = useState<string | null>(
    null,
  );
  const [showInviteAgencyModal, setShowInviteAgencyModal] = useState(false);
  const [showInviteCreatorModal, setShowInviteCreatorModal] = useState(false);
  const [showInviteSeatModal, setShowInviteSeatModal] = useState(false);
  const [showStudioUpgradeModal, setShowStudioUpgradeModal] = useState(false);
  const [showPostJobModal, setShowPostJobModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [selectedCampaignDeliverables, setSelectedCampaignDeliverables] =
    useState<any[]>([]);
  const [reviewingDeliverableId, setReviewingDeliverableId] = useState<
    string | null
  >(null);
  const deliverableReviewBusyRef = useRef<Set<string>>(new Set());
  const [selectedCampaignCollaborators, setSelectedCampaignCollaborators] =
    useState<{ label: string; logo?: string }[]>([]);
  const [markDoneOpen, setMarkDoneOpen] = useState(false);
  const [markDoneBusy, setMarkDoneBusy] = useState(false);
  const [loadingSelectedCampaignDetails, setLoadingSelectedCampaignDetails] =
    useState(false);
  const [brandCampaignId, setBrandCampaignId] = useState<string>("");
  const [isExistingCampaign, setIsExistingCampaign] = useState(false);
  const [campaignCards, setCampaignCards] = useState<any[]>([]);
  const [loadingCampaignCards, setLoadingCampaignCards] = useState(false);
  const [showEscrowReleaseModal, setShowEscrowReleaseModal] = useState(false);
  const [escrowReleaseInfo, setEscrowReleaseInfo] = useState<any>(null);
  const [campaignListTab, setCampaignListTab] = useState<
    "active" | "pending_approval" | "completed"
  >("active");
  const [deliverableCommentDrafts, setDeliverableCommentDrafts] = useState<
    Record<string, string>
  >({});
  const [newCampaignStep, setNewCampaignStep] = useState(1);
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
  const [showUnpaidModal, setShowUnpaidModal] = useState(false);
  const [unpaidOfferId, setUnpaidOfferId] = useState<string>("");
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
  const [existingCampaignAgencyIds, setExistingCampaignAgencyIds] = useState<
    Set<string>
  >(new Set());
  const [existingCampaignCreatorIds, setExistingCampaignCreatorIds] = useState<
    Set<string>
  >(new Set());
  const [loadingExistingCollaborators, setLoadingExistingCollaborators] =
    useState(false);
  const creatorFetchRequestIdRef = useRef(0);
  const connectedCreatorCacheRef = useRef<Record<string, any[]>>({});
  const agencyTalentCacheRef = useRef<Record<string, any[]>>({});
  const previousCollaboratorTypeRef = useRef<string>("");
  const isFetchingCampaignCardsRef = useRef(false);
  const hasStudioAddon = hasBrandStudioAccess(profile);
  const brandPlanTier = normalizeBrandPlanTier(profile?.plan_tier);
  const brandCampaignLimit = brandPlanCampaignLimit(brandPlanTier);
  const brandCampaignLimitLabel =
    brandCampaignLimit == null ? "Unlimited" : String(brandCampaignLimit);
  const brandSeatLimit = brandPlanSeatLimit(brandPlanTier);
  const brandSeatLimitLabel =
    brandSeatLimit == null ? "Unlimited" : String(brandSeatLimit);
  const brandTeamSeatsUsed = Number.isFinite(Number(profile?.team_seats))
    ? Number(profile?.team_seats)
    : 0;
  const canUseCampaignCollaboration = brandAllowsCampaignCollaboration(profile);
  const maxCampaignWizardStep = brandMaxCampaignWizardStep(profile);
  const platformFee = brandPlanTier === "pro" ? 3 : 5;
  const [previewImage, setPreviewImage] = useState<any>(null);
  const [previewItems, setPreviewItems] = useState<any[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

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
      const boundedStep = Number.isFinite(nextStep) ? Math.max(1, nextStep) : 3;
      const safeStep = Math.min(maxCampaignWizardStep, boundedStep);
      const brandCampaignId = String(context?.brandCampaignId || "").trim();

      setBrandCampaignId(brandCampaignId);
      setIsExistingCampaign(true);
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
      // Full reset — reuse resetCampaignBuilder logic to clear all wizard state
      // (form, brief, collaborator selections, contract draft, validation errors, etc.)
      // then re-open the modal for a fresh new campaign.
      setShowCampaignDocuSealBuilder(false);
      setBrandSignOpen(false);
      setBrandSignUrl("");
      setAwaitingBrandSignature(false);
      setNewCampaignStep(1);
      setBrandCampaignId("");
      setIsExistingCampaign(false);
      setStep1FieldErrors({});
      setStep2FieldErrors({});
      setWizardErrorBanner(null);
      setExistingCampaignAgencyIds(new Set());
      setExistingCampaignCreatorIds(new Set());
      setLoadingExistingCollaborators(false);
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
      setContractDraft({ title: "", file_url: "", docuseal_template_id: "" });
      setSelectedCreatorsById({});
      setSelectedTalentCreatorIds(new Set());
      setMarketplaceCreators([]);
      setCreatorSearch("");
    }

    setShowNewCampaignModal(true);
  }, [
    embedded,
    maxCampaignWizardStep,
    openNewCampaignSignal,
    prefillCampaignContext,
  ]);

  useEffect(() => {
    if (!showNewCampaignModal) return;
    if (newCampaignStep <= maxCampaignWizardStep) return;
    setNewCampaignStep(maxCampaignWizardStep);
  }, [maxCampaignWizardStep, newCampaignStep, showNewCampaignModal]);

  useEffect(() => {
    if (!showNewCampaignModal) return;
    const campaignId = String(brandCampaignId || "").trim();
    if (!campaignId) {
      setExistingCampaignAgencyIds(new Set());
      setExistingCampaignCreatorIds(new Set());
      return;
    }
    let cancelled = false;
    const loadExistingCollaborators = async () => {
      setLoadingExistingCollaborators(true);
      try {
        const offersResp = await base44.get<{ offers?: any[] }>(
          `/api/brand/campaigns/${encodeURIComponent(campaignId)}/offers`,
        );
        const offers = Array.isArray(offersResp?.offers)
          ? offersResp.offers
          : [];
        const nextAgency = new Set<string>();
        const nextCreator = new Set<string>();
        offers.forEach((offer: any) => {
          const targetType = String(
            offer?.target_type || offer?.targetType || "",
          )
            .trim()
            .toLowerCase();
          const targetId = String(
            offer?.target_id || offer?.targetId || "",
          ).trim();
          if (!targetId) return;
          if (targetType === "agency") nextAgency.add(targetId);
          if (targetType === "creator") nextCreator.add(targetId);
        });
        if (cancelled) return;
        setExistingCampaignAgencyIds(nextAgency);
        setExistingCampaignCreatorIds(nextCreator);
      } catch {
        if (cancelled) return;
        setExistingCampaignAgencyIds(new Set());
        setExistingCampaignCreatorIds(new Set());
      } finally {
        if (!cancelled) setLoadingExistingCollaborators(false);
      }
    };
    void loadExistingCollaborators();
    return () => {
      cancelled = true;
    };
  }, [brandCampaignId, showNewCampaignModal]);

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
      return t(`campaignsDashboard.status.${label}`, {
        defaultValue: label.charAt(0).toUpperCase() + label.slice(1),
      });
    }
    if (status === "active") {
      return t("campaignsDashboard.status.active", {
        defaultValue: "Active",
      });
    }
    const cleaned = status.replace("_", " ");
    return t(`campaignsDashboard.status.${status}`, {
      defaultValue: cleaned.charAt(0).toUpperCase() + cleaned.slice(1),
    });
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

  const campaignSlotsUsed = useMemo(
    () =>
      campaignCards.filter((campaign: any) => {
        const offersCount = Number(campaign?.offers_count || 0);
        const status = String(campaign?.status || "")
          .trim()
          .toLowerCase();
        return offersCount > 0 && status !== "completed";
      }).length,
    [campaignCards],
  );

  const campaignLimitReached =
    brandCampaignLimit != null && campaignSlotsUsed >= brandCampaignLimit;

  const currentCampaignOccupiesSlot = useMemo(() => {
    const currentCampaignId = String(brandCampaignId || "").trim();
    if (!currentCampaignId) return false;
    return campaignCards.some((campaign: any) => {
      const id = String(
        campaign?.id || campaign?.brand_campaign_id || "",
      ).trim();
      const offersCount = Number(campaign?.offers_count || 0);
      const status = String(campaign?.status || "")
        .trim()
        .toLowerCase();
      return (
        id === currentCampaignId && offersCount > 0 && status !== "completed"
      );
    });
  }, [brandCampaignId, campaignCards]);

  const canLaunchCurrentCampaign =
    !campaignLimitReached || currentCampaignOccupiesSlot;

  const getCampaignEntitlementMessage = (error: unknown): string => {
    const message = String((error as any)?.message || error || "").trim();
    if (message.includes("brand_campaign_collaboration_requires_pro_plan")) {
      return "Collaborator selection, talent browsing, and offer sending start on the Pro plan.";
    }
    if (message.includes("brand_talent_browsing_requires_pro_plan")) {
      return "Talent browsing, creator licensing, and agency discovery start on the Pro plan.";
    }
    if (message.includes("brand_campaign_limit_reached")) {
      return `You've reached your ${brandCampaignLimitLabel} active campaign limit. Mark a campaign done or upgrade your plan to launch another one.`;
    }
    return message || "Please try again.";
  };

  const promptCampaignUpgrade = () => {
    toast({
      title: "Upgrade to Pro",
      description:
        "Basic plans stop after the campaign brief. Upgrade to Pro to choose agencies or creators and send offers.",
    });
  };

  const handleInviteAgencyEntry = () => {
    if (!canUseCampaignCollaboration) {
      promptCampaignUpgrade();
      navigate("/brandpricing");
      return;
    }
    setShowInviteAgencyModal(true);
  };

  const handleCompanySeatEntry = () => {
    if ((brandSeatLimit ?? 0) === 0) {
      toast({
        title: t("toasts.upgradeRequired"),
        description: t("toasts.upgradeRequiredSeatsDesc"),
      });
      navigate("/brandpricing");
      return;
    }
    if (brandSeatLimit != null && brandTeamSeatsUsed >= brandSeatLimit) {
      toast({
        title: t("toasts.seatLimitReached"),
        description: t("toasts.seatLimitReachedDesc", {
          count: brandSeatLimitLabel,
        }),
        variant: "destructive" as any,
      });
      return;
    }
    // Navigate to Brand Dashboard Settings → Team tab to manage team members
    navigate("/BrandDashboard?section=settings&tab=team");
  };

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
  const formatCollaboratorLabel = (label: unknown) => {
    const text = String(label || "").trim();
    const separatorMatch = text.match(
      /^(Creator|Agency|Collaborator)\s*•\s*(.+)$/i,
    );
    if (separatorMatch) {
      const type = separatorMatch[1].toLowerCase();
      const name = separatorMatch[2];
      const typeLabel =
        type === "creator"
          ? t("campaigns.campaignDetails.creator")
          : type === "agency"
            ? t("campaigns.campaignDetails.agency")
            : t("campaigns.campaignDetails.collaborator");
      return `${typeLabel} • ${name}`;
    }
    const prefixMatch = text.match(/^(Creator|Agency|Collaborator)\s+(.+)$/i);
    if (prefixMatch) {
      const type = prefixMatch[1].toLowerCase();
      const suffix = prefixMatch[2];
      const typeLabel =
        type === "creator"
          ? t("campaigns.campaignDetails.creator")
          : type === "agency"
            ? t("campaigns.campaignDetails.agency")
            : t("campaigns.campaignDetails.collaborator");
      return `${typeLabel} ${suffix}`;
    }
    if (/^creator$/i.test(text)) return t("campaigns.campaignDetails.creator");
    if (/^agency$/i.test(text)) return t("campaigns.campaignDetails.agency");
    if (/^collaborator$/i.test(text)) {
      return t("campaigns.campaignDetails.collaborator");
    }
    return text;
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
    // Campaign "Active vs Pending Approval" must not be affected by deliverable workflow statuses.
    // Prefer backend-derived `is_fully_signed`.
    const hasSignedOffer = safeOffers.some((offer: any) =>
      Boolean(offer?.is_fully_signed),
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
      duration_days: Number(campaign?.duration_days || 0),
      due_date: (() => {
        const start = String(campaign?.start_date || "").trim();
        const days = Number(campaign?.duration_days || 0);
        if (!start || !days || !/^\d{4}-\d{2}-\d{2}$/.test(start)) return null;
        const d = new Date(`${start}T00:00:00`);
        d.setDate(d.getDate() + days - 1);
        return d.toISOString().slice(0, 10);
      })(),
      budget_range: String(campaign?.budget_range || ""),
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
      const collaboratorsMap = new Map<
        string,
        { label: string; logo?: string }
      >();
      offers.forEach((offer: any) => {
        const label = collaboratorLabelFromOffer(offer);
        if (label && !collaboratorsMap.has(label)) {
          collaboratorsMap.set(label, {
            label,
            logo: offer?.target_logo,
          });
        }
      });
      const collaborators = Array.from(collaboratorsMap.values());
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
              payment_status: offer?.payment_status,
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
    if (deliverableReviewBusyRef.current.has(deliverableId)) return;
    deliverableReviewBusyRef.current.add(deliverableId);
    setReviewingDeliverableId(deliverableId);
    try {
      const resp = await base44.post<any>(
        `/api/campaign-offers/${encodeURIComponent(offerId)}/deliverables/${encodeURIComponent(deliverableId)}/review`,
        { action },
      );

      const escrow = resp?.escrow;
      if (action === "approve" && escrow) {
        if (escrow?.released_now) {
          setEscrowReleaseInfo(escrow);
          setShowEscrowReleaseModal(true);
        } else if (
          String(escrow?.payment_status || "")
            .trim()
            .toLowerCase() !== "paid"
        ) {
          toast({
            title: "Approved, but payment not received",
            description:
              "Deliverable was approved. Escrow payout cannot be released until the offer is paid.",
            variant: "destructive" as any,
          });
        }
      }
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
      const msg = String(e?.message || "");
      if (e?.status === 402 || msg.includes("payment_required")) {
        setUnpaidOfferId(offerId);
        setShowUnpaidModal(true);
        return;
      }
      toast({
        title: "Update failed",
        description: e?.message || "Please try again.",
        variant: "destructive" as any,
      });
    } finally {
      deliverableReviewBusyRef.current.delete(deliverableId);
      setReviewingDeliverableId(null);
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
    const status = String(deliverable?.status || "").toLowerCase();
    const approvedForDownload = [
      "approved",
      "accepted",
      "brand_approved",
    ].includes(status);
    if (!offerId || !deliverableId) {
      toast({
        title: "Download unavailable",
        description: "Deliverable reference is missing.",
        variant: "destructive" as any,
      });
      return;
    }
    if (!approvedForDownload) {
      toast({
        title: "Download unavailable",
        description: "Approve this deliverable to unlock downloads.",
        variant: "destructive" as any,
      });
      return;
    }
    try {
      const response = await base44.getRaw(
        `/api/campaign-offers/${encodeURIComponent(offerId)}/deliverables/${encodeURIComponent(deliverableId)}/file?download=true`,
      );
      if (!response.ok) {
        if (response.status === 402) {
          setUnpaidOfferId(offerId);
          setShowUnpaidModal(true);
          return;
        }
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
    let mounted = true;

    const loadConnectedAgencies = async () => {
      setLoadingConnectedAgencies(true);
      try {
        const response = await base44.get<{
          status?: string;
          agencies?: any[];
        }>("/api/brand/connected-agencies");
        if (!mounted) return;
        setConnectedAgencies(
          Array.isArray(response?.agencies) ? response.agencies : [],
        );
      } catch {
        if (!mounted) return;
        setConnectedAgencies([]);
      } finally {
        if (!mounted) return;
        setLoadingConnectedAgencies(false);
      }
    };

    const refreshData = async () => {
      if (!mounted) return;
      await loadConnectedAgencies();
      await loadCampaignCards();
    };

    void refreshData();

    const campaignTimer = setInterval(() => {
      if (mounted) {
        void loadCampaignCards();
      }
    }, 15000);

    const agencyTimer = setInterval(() => {
      if (mounted) {
        void loadConnectedAgencies();
      }
    }, 30000);

    return () => {
      mounted = false;
      clearInterval(campaignTimer);
      clearInterval(agencyTimer);
    };
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
      (newCampaignStep !== 3 && newCampaignStep !== 4) ||
      !canUseCampaignCollaboration
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

    const fetchCreators = async () => {
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
    };

    const timer = setTimeout(fetchCreators, 250);

    const pollTimer = setInterval(() => {
      if (
        creatorFetchRequestIdRef.current === requestId &&
        showNewCampaignModal
      ) {
        void fetchCreators();
      }
    }, 20000);

    return () => {
      clearTimeout(timer);
      clearInterval(pollTimer);
    };
  }, [
    creatorSearch,
    brandCampaignId,
    showNewCampaignModal,
    newCampaignStep,
    campaignForm.collaborator_type,
    canUseCampaignCollaboration,
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
    if (existingCampaignCreatorIds.has(creatorId)) {
      toast({
        title: "Collaborator already added",
        description: "This creator is already part of the campaign.",
      });
      return;
    }
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
    setIsExistingCampaign(false);
    setStep1FieldErrors({});
    setStep2FieldErrors({});
    setWizardErrorBanner(null);
    setExistingCampaignAgencyIds(new Set());
    setExistingCampaignCreatorIds(new Set());
    setLoadingExistingCollaborators(false);
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
    const errors: Record<string, string> = {};
    if (!campaignForm.name.trim()) errors.name = "Campaign name is required.";
    if (!campaignForm.objective.trim())
      errors.objective = "Please select a campaign objective.";
    if (!campaignForm.category.trim())
      errors.category = "Please select a category.";
    if (!campaignForm.description.trim())
      errors.description = "Description is required.";
    if (!campaignForm.start_date.trim())
      errors.start_date = "Start date is required.";
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(campaignForm.start_date.trim()))
      errors.start_date = "Please enter a valid date.";
    const min = Number.parseInt(budgetParts.min, 10);
    const max = Number.parseInt(budgetParts.max, 10);
    if (!Number.isFinite(min) || min <= 0)
      errors.budget_min = "Budget min must be greater than zero.";
    if (!Number.isFinite(max) || max <= 0)
      errors.budget_max = "Budget max must be greater than zero.";
    else if (Number.isFinite(min) && min > 0 && max < min)
      errors.budget_max = "Budget max must be ≥ budget min.";
    const duration = Number.parseInt(
      String(campaignForm.duration_days || "").trim(),
      10,
    );
    if (!Number.isFinite(duration) || duration <= 0)
      errors.duration_days = "Duration must be at least 1 day.";

    setStep1FieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      const firstKey = Object.keys(errors)[0];
      setWizardErrorBanner(errors[firstKey]);
      // Auto-focus first invalid field
      setTimeout(() => {
        const el = document.getElementById(`step1-${firstKey}`);
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 50);
      return;
    }

    setWizardErrorBanner(null);
    const id = await ensureCampaignDraft();
    if (!id) return;
    setNewCampaignStep(2);
  };

  const handleStep2Next = async () => {
    const errors: Record<string, string> = {};
    const expectedTotal = Number.parseInt(
      String(campaignBrief.total_expected_deliverables || "").trim(),
      10,
    );
    if (!Number.isFinite(expectedTotal) || expectedTotal <= 0)
      errors.total_expected_deliverables =
        "Total expected deliverables must be greater than 0.";
    const duration = Number.parseInt(
      String(campaignBrief.overview_campaign_duration || "").trim(),
      10,
    );
    if (!Number.isFinite(duration) || duration <= 0)
      errors.overview_campaign_duration =
        "Campaign duration must be a valid number of days.";
    if (!isValidDateString(String(campaignBrief.overview_launch_date || "")))
      errors.overview_launch_date = "Please enter a valid launch date.";
    if (
      !isValidDateString(String(campaignBrief.budget_submission_deadline || ""))
    )
      errors.budget_submission_deadline =
        "Please enter a valid submission deadline.";
    if (!parsePositiveNumber(campaignBrief.budget_total))
      errors.budget_total = "Total budget must be a valid amount.";
    if (!parsePositiveNumber(campaignBrief.budget_creator_payment))
      errors.budget_creator_payment = "Creator payment must be a valid amount.";

    setStep2FieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      const firstKey = Object.keys(errors)[0];
      setWizardErrorBanner(errors[firstKey]);
      setTimeout(() => {
        const el = document.getElementById(`step2-${firstKey}`);
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 50);
      return;
    }

    setWizardErrorBanner(null);
    const id = await ensureCampaignDraft();
    if (!id) return;
    try {
      setSavingCampaign(true);
      await base44.post(`/api/brand/campaigns/${id}`, {
        brief_snapshot: campaignBrief,
      });
      if (!canUseCampaignCollaboration) {
        toast({
          title: "Campaign brief saved",
          description:
            "Steps 1-2 are available on your current plan. Upgrade to Pro to unlock collaborator selection and send offers.",
        });
        return;
      }
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

      const uploaded = await Promise.all(
        files.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("visibility", "public");
          formData.append("source_type", "brief_reference_image");
          const res = await fetch(api("/api/brand/storage/files/upload"), {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: formData,
          });
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          return { name: file.name, url: data.public_url };
        }),
      );

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

      const uploaded = await Promise.all(
        files.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("visibility", "public");
          formData.append("source_type", "brief_brand_guideline");
          const res = await fetch(api("/api/brand/storage/files/upload"), {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: formData,
          });
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          return { name: file.name, size: file.size, url: data.public_url };
        }),
      );

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

  const [authToken, setAuthToken] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!mounted) return;
        setAuthToken(session?.access_token || null);
      } catch {
        if (!mounted) return;
        setAuthToken(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const deliverablePreviewSrc = (
    deliverable: any,
    options: { thumbnail?: boolean } = {},
  ) => {
    const raw = String(deliverable?.asset_url || "").trim();
    if (!raw) return "";
    if (raw.startsWith("http")) return raw;
    const offerId = String(deliverable?.offer_id || "").trim();
    const deliverableId = String(deliverable?.id || "").trim();
    if (!offerId || !deliverableId) return raw;

    const proxyUrl = `/api/campaign-offers/${encodeURIComponent(offerId)}/deliverables/${encodeURIComponent(deliverableId)}/file`;
    const queryParams = new URLSearchParams();
    if (authToken) queryParams.set("token", authToken);
    if (options.thumbnail) queryParams.set("thumbnail", "true");

    const queryString = queryParams.toString();
    return queryString ? `${proxyUrl}?${queryString}` : proxyUrl;
  };

  const deliverableFileSrc = (deliverable: any) =>
    deliverablePreviewSrc(deliverable);

  const getPublicUrl = (
    del: any,
    options: { thumbnail?: boolean; download?: boolean } = {},
  ) => {
    const path = typeof del === "string" ? del : del?.asset_url;
    if (!path) return "";
    if (path.startsWith("http")) return path;

    if (typeof del === "object" && del?.id && del?.offer_id) {
      const proxyUrl = `/api/campaign-offers/${del.offer_id}/deliverables/${del.id}/file`;
      const queryParams = new URLSearchParams();
      if (authToken) queryParams.set("token", authToken);
      if (options.thumbnail) queryParams.set("thumbnail", "true");
      if (options.download) queryParams.set("download", "true");

      const queryString = queryParams.toString();
      return queryString ? `${proxyUrl}?${queryString}` : proxyUrl;
    }

    return "";
  };

  const handleSendOffer = async () => {
    if (savingCampaign) return;
    if (!canUseCampaignCollaboration) {
      promptCampaignUpgrade();
      return;
    }
    if (!brandCampaignId) {
      toast({
        title: "Campaign not ready",
        description: "Please save campaign details first.",
        variant: "destructive" as any,
      });
      return;
    }
    if (!canLaunchCurrentCampaign) {
      toast({
        title: "Campaign limit reached",
        description: `You've already used ${campaignSlotsUsed} of ${brandCampaignLimitLabel} campaign slots.`,
        variant: "destructive" as any,
      });
      return;
    }

    setSavingCampaign(true);
    try {
      if (campaignForm.collaborator_type === "creator") {
        if (
          newCampaignStep >= 5 &&
          !contractDraft.docuseal_template_id.trim()
        ) {
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
        const duplicates = creatorIds.filter((id) =>
          existingCampaignCreatorIds.has(String(id)),
        );
        if (duplicates.length > 0) {
          toast({
            title: "Collaborator already added",
            description:
              duplicates.length === 1
                ? "One selected creator is already part of this campaign."
                : "Some selected creators are already part of this campaign.",
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
              budget_snapshot: {
                budget_total: campaignBrief.budget_total || "0",
                budget_creator_payment:
                  campaignBrief.budget_creator_payment || "0",
                budget_submission_deadline:
                  campaignBrief.budget_submission_deadline || null,
                currency_code: "USD",
              },
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
            description: getCampaignEntitlementMessage(e),
            variant: "destructive" as any,
          });
          return;
        }

        await loadCampaignCards();
        resetCampaignBuilder();
        toast({
          title: "Offers sent",
          description: `${creatorIds.length} creator offer${creatorIds.length > 1 ? "s were" : " was"} sent successfully.`,
        });
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
      if (existingCampaignAgencyIds.has(agencyId)) {
        toast({
          title: "Collaborator already added",
          description: "This agency is already part of the campaign.",
        });
        return;
      }
      try {
        await base44.post(`/api/brand/campaigns/${brandCampaignId}/offers`, {
          target_type: "agency",
          target_ids: [agencyId],
          brief_snapshot: campaignBrief,
          budget_snapshot: {
            budget_total: campaignBrief.budget_total || "0",
            budget_creator_payment: campaignBrief.budget_creator_payment || "0",
            budget_submission_deadline:
              campaignBrief.budget_submission_deadline || null,
          },
          message: campaignForm.custom_terms || null,
        });
        await loadCampaignCards();
        resetCampaignBuilder();
        toast({
          title: "Offer sent",
          description: "Offer sent to the selected agency.",
        });
      } catch (e: any) {
        const msg = String(e?.message || "");
        toast({
          title:
            msg === "This record already exists."
              ? "Offer already sent"
              : "Failed to send offer",
          description:
            msg === "This record already exists."
              ? "An offer to this agency already exists for this campaign."
              : getCampaignEntitlementMessage(e),
          variant:
            msg === "This record already exists."
              ? ("default" as any)
              : ("destructive" as any),
        });
        if (msg === "This record already exists.") {
          await loadCampaignCards();
        }
      }
    } finally {
      setSavingCampaign(false);
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

  const deliverablesByCollaborator = useMemo(() => {
    const groups: Record<string, any[]> = {};
    selectedCampaignDeliverables.forEach((d) => {
      const label = d.collaborator_label || "Other Collaborators";
      if (!groups[label]) groups[label] = [];
      groups[label].push(d);
    });
    return groups;
  }, [selectedCampaignDeliverables]);

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
                  {t("campaignsDashboard.backToDashboard")}
                </Button>
                <div className="flex items-center gap-3">
                  {profile?.logo_url && (
                    <img
                      src={profile.logo_url}
                      alt="Brand"
                      className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                    />
                  )}
                  <span className="text-xl font-bold text-gray-900">
                    {profile?.company_name || t("dashboardTitle")}
                  </span>
                </div>
              </div>

              <Button
                onClick={() => setShowNewCampaignModal(true)}
                className="bg-[#F7B750] hover:bg-[#E6A640] text-white rounded-none"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t("campaignsDashboard.newCampaign")}
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
              {t("campaignsDashboard.newCampaign")}
            </Button>
          </div>
        )}
        {/* Metrics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
            <DollarSign className="w-8 h-8 text-[#F7B750] mb-4" />
            <p className="text-sm text-gray-600 mb-1">
              {t("campaignsDashboard.stats.totalSpend30d")}
            </p>
            <p className="text-3xl font-bold text-gray-900">
              ${(dashboardMetrics.totalSpend / 1000).toFixed(1)}K
            </p>
          </Card>

          <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
            <Users className="w-8 h-8 text-[#F7B750] mb-4" />
            <p className="text-sm text-gray-600 mb-1">
              {t("campaignsDashboard.stats.activeCollaborators")}
            </p>
            <p className="text-3xl font-bold text-gray-900">
              {dashboardMetrics.activeCollaborators}
            </p>
          </Card>

          <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
            <FileText className="w-8 h-8 text-[#F7B750] mb-4" />
            <p className="text-sm text-gray-600 mb-1">
              {t("campaignsDashboard.stats.campaignsLaunched")}
            </p>
            <p className="text-3xl font-bold text-gray-900">
              {dashboardMetrics.campaignsLaunched}
            </p>
          </Card>
        </div>

        {(campaignLimitReached || !canUseCampaignCollaboration) && (
          <Alert className="mb-8 border-2 border-amber-200 bg-amber-50 rounded-none">
            <AlertCircle className="h-5 w-5 text-amber-700" />
            <AlertDescription className="text-amber-900">
              {!canUseCampaignCollaboration
                ? t("campaignsDashboard.plan.basicBriefOnly")
                : t("campaignsDashboard.plan.slotsUsed", {
                    used: campaignSlotsUsed,
                    total: brandCampaignLimitLabel,
                  })}
            </AlertDescription>
          </Alert>
        )}

        {/* Collaboration CTAs + Post Job */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card
            className="p-4 sm:p-6 bg-white border-2 border-[#F7B750] hover:shadow-xl transition-all cursor-pointer rounded-none flex flex-col"
            onClick={handleInviteAgencyEntry}
          >
            <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-0 flex-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#F7B750] rounded-none flex items-center justify-center sm:mb-4 shrink-0">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="flex-1 sm:flex-none">
                <h3 className="text-sm sm:text-lg font-bold text-gray-900 sm:mb-2">
                  {t("campaignsDashboard.quickActions.collaborateWithAgency")}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block sm:mb-4">
                  {t("campaignsDashboard.overview.collaborateWithAgencyDesc")}
                </p>
              </div>
            </div>
            <Button className="w-full mt-3 sm:mt-4 bg-[#F7B750] hover:bg-[#E6A640] text-white rounded-none text-xs sm:text-sm h-8 sm:h-10">
              {canUseCampaignCollaboration ? (
                <>
                  <Mail className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  {t("campaignsDashboard.inviteAgency.title")}
                </>
              ) : (
                t("campaignsDashboard.overview.upgradePlan")
              )}
            </Button>
          </Card>

          <Card className="p-4 sm:p-6 bg-white border-2 border-[#FAD54C]/60 opacity-70 rounded-none flex flex-col">
            <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-0 flex-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#FAD54C] rounded-none flex items-center justify-center sm:mb-4 shrink-0">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="flex-1 sm:flex-none">
                <h3 className="text-sm sm:text-lg font-bold text-gray-900 sm:mb-2">
                  {t("campaignsDashboard.quickActions.addAICreator")}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block sm:mb-4">
                  {t("campaignsDashboard.overview.addAICreatorDesc")}
                </p>
              </div>
            </div>
            <Button
              disabled
              className="w-full mt-3 sm:mt-4 bg-[#FAD54C] text-white rounded-none cursor-not-allowed text-xs sm:text-sm h-8 sm:h-10"
            >
              {t("campaignsDashboard.quickActions.comingSoon")}
            </Button>
          </Card>

          <Card
            className="p-4 sm:p-6 bg-white border-2 border-amber-600/60 rounded-none cursor-pointer flex flex-col"
            onClick={handleCompanySeatEntry}
          >
            <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-0 flex-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-600 rounded-none flex items-center justify-center sm:mb-4 shrink-0">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="flex-1 sm:flex-none">
                <h3 className="text-sm sm:text-lg font-bold text-gray-900 sm:mb-2">
                  {t("campaignsDashboard.quickActions.inviteCompanySeat")}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block sm:mb-4">
                  {t("campaignsDashboard.overview.inviteCompanySeatDesc")}
                </p>
              </div>
            </div>
            <Button className="w-full mt-3 sm:mt-4 bg-amber-600 hover:bg-amber-700 text-white rounded-none text-xs sm:text-sm h-8 sm:h-10">
              {(brandSeatLimit ?? 0) === 0
                ? t("campaignsDashboard.overview.upgradePlan")
                : brandSeatLimit != null && brandTeamSeatsUsed >= brandSeatLimit
                  ? t("campaignsDashboard.quickActions.seatLimitReached")
                  : t("campaignsDashboard.quickActions.upToSeats", {
                      count: brandSeatLimitLabel,
                    })}
            </Button>
          </Card>

          <Card
            className="p-4 sm:p-6 bg-white border-2 border-orange-600 hover:shadow-xl transition-all cursor-pointer rounded-none flex flex-col"
            onClick={() => {
              if (hasStudioAddon) {
                navigate(createPageUrl("Studio"));
                return;
              }
              setShowStudioUpgradeModal(true);
            }}
          >
            <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-0 flex-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-600 rounded-none flex items-center justify-center sm:mb-4 shrink-0 relative">
                {!hasStudioAddon && (
                  <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-white absolute top-1 right-1" />
                )}
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="flex-1 sm:flex-none">
                <h3 className="text-sm sm:text-lg font-bold text-gray-900 sm:mb-2">
                  {t("campaignsDashboard.quickActions.aiStudioAddon")}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block sm:mb-4">
                  {t("campaignsDashboard.overview.aiStudioAddonDesc")}
                </p>
              </div>
            </div>
            <Button className="w-full mt-3 sm:mt-4 bg-orange-600 hover:bg-orange-700 text-white rounded-none text-xs sm:text-sm h-8 sm:h-10">
              {hasStudioAddon ? (
                <>
                  <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  {t("brandPricingStudioAddon.openStudio")}
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  {brandPlanTier === "pro"
                    ? t("campaignsDashboard.overview.unlockAddon")
                    : t("campaignsDashboard.overview.upgradePlan")}
                </>
              )}
            </Button>
          </Card>

          <Card
            className="p-4 sm:p-6 bg-white border-2 border-blue-600 hover:shadow-xl transition-all cursor-pointer rounded-none flex flex-col"
            onClick={() => setShowPostJobModal(true)}
          >
            <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-0 flex-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-none flex items-center justify-center sm:mb-4 shrink-0">
                <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="flex-1 sm:flex-none">
                <h3 className="text-sm sm:text-lg font-bold text-gray-900 sm:mb-2">
                  {t("campaignsDashboard.quickActions.postJob")}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block sm:mb-4">
                  {t("campaignsDashboard.overview.postJobDesc")}
                </p>
              </div>
            </div>
            <Button className="w-full mt-3 sm:mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-none text-xs sm:text-sm h-8 sm:h-10">
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              {t("campaigns.jobs.postJob")}
            </Button>
          </Card>
        </div>

        {/* Campaign Cards */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              {t("campaignsDashboard.yourCampaigns")}
            </h2>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => setCampaignListTab("active")}
                className={`border-2 rounded-none text-xs sm:text-sm h-8 sm:h-10 px-3 ${
                  campaignListTab === "active"
                    ? "border-black bg-black text-white"
                    : "border-gray-300"
                }`}
              >
                {t("campaigns.myOffers.tabs.active")}
              </Button>
              <Button
                variant="outline"
                onClick={() => setCampaignListTab("pending_approval")}
                className={`border-2 rounded-none text-xs sm:text-sm h-8 sm:h-10 px-3 ${
                  campaignListTab === "pending_approval"
                    ? "border-black bg-black text-white"
                    : "border-gray-300"
                }`}
              >
                {t("campaigns.myOffers.tabs.pendingApproval")}
              </Button>
              <Button
                variant="outline"
                onClick={() => setCampaignListTab("completed")}
                className={`border-2 rounded-none text-xs sm:text-sm h-8 sm:h-10 px-3 ${
                  campaignListTab === "completed"
                    ? "border-black bg-black text-white"
                    : "border-gray-300"
                }`}
              >
                {t("campaigns.myOffers.tabs.expired")}
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
                  <p className="text-sm text-gray-600">
                    {t("campaigns.myOffers.loadingCampaigns")}
                  </p>
                </Card>
              );
            }
            if (filteredCampaigns.length === 0) {
              return (
                <Card className="p-4 bg-white border-2 border-gray-200 rounded-none">
                  <p className="text-sm text-gray-600">
                    {campaignListTab === "active"
                      ? t("campaignsDashboard.overview.noActiveCampaigns")
                      : campaignListTab === "pending_approval"
                        ? t("campaignsDashboard.overview.noPendingCampaigns")
                        : t("campaignsDashboard.overview.noExpiredCampaigns")}
                  </p>
                </Card>
              );
            }
            return filteredCampaigns.map((campaign) => (
              <Card
                key={campaign.id}
                className="p-4 sm:p-6 bg-white border-2 border-gray-200 hover:shadow-lg transition-all rounded-none"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 truncate">
                      {campaign.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
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
                      <span className="text-xs sm:text-sm text-gray-600">
                        {campaign.objective}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-gray-600">
                      {(() => {
                        const parts = String(campaign.budget_range || "").match(
                          /(\d[\d,]*)\s*-\s*(\d[\d,]*)/,
                        );
                        if (parts) {
                          const min = Number(
                            parts[1].replace(/[^\d]/g, ""),
                          ).toLocaleString();
                          const max = Number(
                            parts[2].replace(/[^\d]/g, ""),
                          ).toLocaleString();
                          return (
                            <span>
                              {t("campaigns.myOffers.budget")}: ${min} – ${max}
                            </span>
                          );
                        }
                        if (campaign.budget > 0)
                          return (
                            <span>
                              {t("campaigns.myOffers.budget")}: $
                              {campaign.budget.toLocaleString()}
                            </span>
                          );
                        return null;
                      })()}
                      {campaign.start_date && campaign.start_date !== "N/A" && (
                        <span>
                          {t("campaigns.jobs.start")}: {campaign.start_date}
                        </span>
                      )}
                      {campaign.due_date && (
                        <span>
                          {t("campaigns.myOffers.dueDate")}: {campaign.due_date}
                        </span>
                      )}
                      <span>
                        {t("campaigns.myOffers.collaboratorsCount", {
                          count: campaign.collaborators.length,
                        })}
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={() => void openCampaignDetails(campaign)}
                    className="bg-[#F7B750] hover:bg-[#E6A640] text-white rounded-none shrink-0 text-xs sm:text-sm h-8 sm:h-10"
                  >
                    {t("campaignsDashboard.viewDetails")}
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      {t("campaignsDashboard.overview.progress")}
                    </p>
                    <Progress
                      value={
                        campaign.deliverables > 0
                          ? (campaign.approved / campaign.deliverables) * 100
                          : 0
                      }
                      className="h-2 mb-2"
                    />
                    <p className="text-sm text-gray-600">
                      {t("campaignsDashboard.overview.deliverablesApproved", {
                        approved: campaign.approved,
                        total: campaign.deliverables,
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      {t("campaignsDashboard.overview.collaborators")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {campaign.collaborators.length === 0 ? (
                        <span className="text-sm text-gray-500">
                          {t("campaignsDashboard.overview.noCollaboratorsYet")}
                        </span>
                      ) : (
                        campaign.collaborators.map((collab, idx) => (
                          <Badge
                            key={idx}
                            className="bg-gray-200 text-gray-700"
                          >
                            {formatCollaboratorLabel(collab)}
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
          <div className="min-h-screen flex items-start sm:items-center justify-center p-0 sm:p-6">
            <Card className="w-full max-w-6xl bg-white sm:p-8 p-4 border-0 sm:border-2 border-black rounded-none min-h-screen sm:min-h-0">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {t("campaignsDashboard.builder.title")}
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

              {/* Stepper — scrollable on mobile */}
              <div className="mb-4 sm:mb-6 overflow-x-auto pb-2">
                <div className="flex items-center gap-1.5 sm:gap-4 min-w-max">
                  <div
                    className={`flex items-center gap-1 sm:gap-2 ${newCampaignStep >= 1 ? "text-black" : "text-gray-400"}`}
                  >
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 border-2 rounded-none flex items-center justify-center text-xs sm:text-sm shrink-0 ${newCampaignStep >= 1 ? "border-black bg-black text-white" : "border-gray-300"}`}
                    >
                      1
                    </div>
                    <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
                      {t("campaignsDashboard.builder.steps.campaignInfo")}
                    </span>
                  </div>
                  <div className="w-4 sm:flex-1 h-px bg-gray-300 shrink-0" />
                  <div
                    className={`flex items-center gap-1 sm:gap-2 ${newCampaignStep >= 2 ? "text-black" : "text-gray-400"}`}
                  >
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 border-2 rounded-none flex items-center justify-center text-xs sm:text-sm shrink-0 ${newCampaignStep >= 2 ? "border-black bg-black text-white" : "border-gray-300"}`}
                    >
                      2
                    </div>
                    <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
                      {t("campaignsDashboard.builder.steps.campaignBrief")}
                    </span>
                  </div>
                  <div className="w-4 sm:flex-1 h-px bg-gray-300 shrink-0" />
                  <div
                    className={`flex items-center gap-1 sm:gap-2 ${newCampaignStep >= 3 ? "text-black" : "text-gray-400"}`}
                  >
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 border-2 rounded-none flex items-center justify-center text-xs sm:text-sm shrink-0 ${newCampaignStep >= 3 ? "border-black bg-black text-white" : "border-gray-300"}`}
                    >
                      3
                    </div>
                    <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
                      {t("campaignsDashboard.builder.steps.collaborators")}
                    </span>
                  </div>
                  <div className="w-4 sm:flex-1 h-px bg-gray-300 shrink-0" />
                  <div
                    className={`flex items-center gap-1 sm:gap-2 ${newCampaignStep >= 4 ? "text-black" : "text-gray-400"}`}
                  >
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 border-2 rounded-none flex items-center justify-center text-xs sm:text-sm shrink-0 ${newCampaignStep >= 4 ? "border-black bg-black text-white" : "border-gray-300"}`}
                    >
                      4
                    </div>
                    <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
                      {t("campaignsDashboard.builder.steps.offerSummary")}
                    </span>
                  </div>
                  {campaignForm.collaborator_type === "creator" && (
                    <>
                      <div className="w-4 sm:flex-1 h-px bg-gray-300 shrink-0" />
                      <div
                        className={`flex items-center gap-1 sm:gap-2 ${newCampaignStep >= 5 ? "text-black" : "text-gray-400"}`}
                      >
                        <div
                          className={`w-7 h-7 sm:w-8 sm:h-8 border-2 rounded-none flex items-center justify-center text-xs sm:text-sm shrink-0 ${newCampaignStep >= 5 ? "border-black bg-black text-white" : "border-gray-300"}`}
                        >
                          5
                        </div>
                        <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
                          {t("campaignsDashboard.builder.steps.contractUpload")}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {!canUseCampaignCollaboration && (
                <Alert className="mb-6 border-2 border-amber-200 bg-amber-50 rounded-none">
                  <AlertCircle className="h-5 w-5 text-amber-700" />
                  <AlertDescription className="text-amber-900">
                    {t("campaignsDashboard.builder.planLimit")}
                  </AlertDescription>
                </Alert>
              )}

              {campaignLimitReached && !currentCampaignOccupiesSlot && (
                <Alert className="mb-6 border-2 border-amber-200 bg-amber-50 rounded-none">
                  <AlertCircle className="h-5 w-5 text-amber-700" />
                  <AlertDescription className="text-amber-900">
                    You&apos;ve already used {campaignSlotsUsed} of{" "}
                    {brandCampaignLimitLabel} active campaign slots. Mark a
                    campaign done or upgrade your plan before launching another
                    one.
                  </AlertDescription>
                </Alert>
              )}

              {newCampaignStep === 1 && (
                <div className="space-y-4 sm:space-y-5 overflow-y-auto max-h-[calc(100vh-200px)] sm:max-h-none pr-1">
                  {/* Error banner */}
                  {wizardErrorBanner && (
                    <div className="animate-shake flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-900">
                          {t(
                            "campaignsDashboard.builder.reviewRequired",
                            "Almost there — just a few fields need attention",
                          )}
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          {wizardErrorBanner}
                        </p>
                      </div>
                      <button
                        onClick={() => setWizardErrorBanner(null)}
                        className="ml-auto text-amber-500 hover:text-amber-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Campaign Name */}
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                      {t("campaignsDashboard.builder.fields.campaignName")}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="step1-name"
                      value={campaignForm.name}
                      onChange={(e) => {
                        setCampaignForm({
                          ...campaignForm,
                          name: e.target.value,
                        });
                        if (step1FieldErrors.name)
                          setStep1FieldErrors((p) => ({ ...p, name: "" }));
                      }}
                      placeholder={t(
                        "campaignsDashboard.builder.placeholders.campaignName",
                      )}
                      className={`rounded-none transition-colors ${step1FieldErrors.name ? "border-2 border-amber-400 bg-amber-50 focus:border-amber-500" : "border-2 border-gray-200 focus:border-black"}`}
                    />
                    {step1FieldErrors.name && (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {step1FieldErrors.name}
                      </p>
                    )}
                  </div>

                  {/* Objective */}
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                      {t("campaignsDashboard.builder.fields.campaignObjective")}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={campaignForm.objective}
                      onValueChange={(v) => {
                        setCampaignForm({ ...campaignForm, objective: v });
                        if (step1FieldErrors.objective)
                          setStep1FieldErrors((p) => ({ ...p, objective: "" }));
                      }}
                    >
                      <SelectTrigger
                        id="step1-objective"
                        className={`rounded-none transition-colors ${step1FieldErrors.objective ? "border-2 border-amber-400 bg-amber-50" : "border-2 border-gray-200"}`}
                      >
                        <SelectValue
                          placeholder={t(
                            "campaignsDashboard.builder.placeholders.selectObjective",
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="awareness">
                          {t("campaignsDashboard.builder.objectives.awareness")}
                        </SelectItem>
                        <SelectItem value="product_launch">
                          {t(
                            "campaignsDashboard.builder.objectives.productLaunch",
                          )}
                        </SelectItem>
                        <SelectItem value="ugc">
                          {t("campaignsDashboard.builder.objectives.ugc")}
                        </SelectItem>
                        <SelectItem value="regional_promo">
                          {t(
                            "campaignsDashboard.builder.objectives.regionalPromo",
                          )}
                        </SelectItem>
                        <SelectItem value="seasonal">
                          {t("campaignsDashboard.builder.objectives.seasonal")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {step1FieldErrors.objective && (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {step1FieldErrors.objective}
                      </p>
                    )}
                  </div>

                  {/* Category */}
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                      {t("campaignsDashboard.builder.fields.category")}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={campaignForm.category}
                      onValueChange={(v) => {
                        setCampaignForm({ ...campaignForm, category: v });
                        if (step1FieldErrors.category)
                          setStep1FieldErrors((p) => ({ ...p, category: "" }));
                      }}
                    >
                      <SelectTrigger
                        id="step1-category"
                        className={`rounded-none transition-colors ${step1FieldErrors.category ? "border-2 border-amber-400 bg-amber-50" : "border-2 border-gray-200"}`}
                      >
                        <SelectValue
                          placeholder={t(
                            "campaignsDashboard.builder.placeholders.selectCategory",
                          )}
                        />
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
                    {step1FieldErrors.category && (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {step1FieldErrors.category}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                      {t("campaignsDashboard.builder.fields.description")}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <Textarea
                      id="step1-description"
                      value={campaignForm.description}
                      onChange={(e) => {
                        setCampaignForm({
                          ...campaignForm,
                          description: e.target.value,
                        });
                        if (step1FieldErrors.description)
                          setStep1FieldErrors((p) => ({
                            ...p,
                            description: "",
                          }));
                      }}
                      placeholder={t(
                        "campaignsDashboard.builder.placeholders.description",
                      )}
                      className={`rounded-none min-h-[90px] transition-colors ${step1FieldErrors.description ? "border-2 border-amber-400 bg-amber-50" : "border-2 border-gray-200"}`}
                    />
                    {step1FieldErrors.description && (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {step1FieldErrors.description}
                      </p>
                    )}
                  </div>

                  {/* Budget + Start Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                        {t("campaignsDashboard.builder.fields.budgetMin")}{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <Input
                        id="step1-budget_min"
                        type="number"
                        min={1}
                        step={1}
                        inputMode="numeric"
                        value={budgetParts.min}
                        onChange={(e) => {
                          setBudgetPart("min", e.target.value);
                          if (step1FieldErrors.budget_min)
                            setStep1FieldErrors((p) => ({
                              ...p,
                              budget_min: "",
                            }));
                        }}
                        placeholder="5000"
                        className={`rounded-none transition-colors ${step1FieldErrors.budget_min ? "border-2 border-amber-400 bg-amber-50" : "border-2 border-gray-200"}`}
                      />
                      {step1FieldErrors.budget_min && (
                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {step1FieldErrors.budget_min}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                        {t("campaignsDashboard.builder.fields.budgetMax")}{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <Input
                        id="step1-budget_max"
                        type="number"
                        min={1}
                        step={1}
                        inputMode="numeric"
                        value={budgetParts.max}
                        onChange={(e) => {
                          setBudgetPart("max", e.target.value);
                          if (step1FieldErrors.budget_max)
                            setStep1FieldErrors((p) => ({
                              ...p,
                              budget_max: "",
                            }));
                        }}
                        placeholder="10000"
                        className={`rounded-none transition-colors ${step1FieldErrors.budget_max ? "border-2 border-amber-400 bg-amber-50" : "border-2 border-gray-200"}`}
                      />
                      {step1FieldErrors.budget_max && (
                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {step1FieldErrors.budget_max}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                        {t("campaignsDashboard.builder.fields.startDate")}{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <Input
                        id="step1-start_date"
                        type="date"
                        value={campaignForm.start_date}
                        onChange={(e) => {
                          setCampaignForm({
                            ...campaignForm,
                            start_date: e.target.value,
                          });
                          if (step1FieldErrors.start_date)
                            setStep1FieldErrors((p) => ({
                              ...p,
                              start_date: "",
                            }));
                        }}
                        className={`rounded-none transition-colors ${step1FieldErrors.start_date ? "border-2 border-amber-400 bg-amber-50" : "border-2 border-gray-200"}`}
                      />
                      {step1FieldErrors.start_date && (
                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {step1FieldErrors.start_date}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                        {t("campaignsDashboard.builder.fields.durationDays")}{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <Input
                        id="step1-duration_days"
                        type="number"
                        min={1}
                        value={campaignForm.duration_days}
                        onChange={(e) => {
                          setCampaignForm({
                            ...campaignForm,
                            duration_days: e.target.value,
                          });
                          if (step1FieldErrors.duration_days)
                            setStep1FieldErrors((p) => ({
                              ...p,
                              duration_days: "",
                            }));
                        }}
                        placeholder="30"
                        className={`rounded-none transition-colors ${step1FieldErrors.duration_days ? "border-2 border-amber-400 bg-amber-50" : "border-2 border-gray-200"}`}
                      />
                      {step1FieldErrors.duration_days && (
                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {step1FieldErrors.duration_days}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Optional fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600 block mb-1.5">
                        {t("campaignsDashboard.builder.fields.usageScope")}
                      </label>
                      <Input
                        value={campaignForm.usage_scope}
                        onChange={(e) =>
                          setCampaignForm({
                            ...campaignForm,
                            usage_scope: e.target.value,
                          })
                        }
                        placeholder={t(
                          "campaignsDashboard.builder.placeholders.usageScope",
                        )}
                        className="border-2 border-gray-200 rounded-none"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 block mb-1.5">
                        {t("campaignsDashboard.builder.fields.territory")}
                      </label>
                      <Input
                        value={campaignForm.territory}
                        onChange={(e) =>
                          setCampaignForm({
                            ...campaignForm,
                            territory: e.target.value,
                          })
                        }
                        placeholder={t(
                          "campaignsDashboard.builder.placeholders.territory",
                        )}
                        className="border-2 border-gray-200 rounded-none"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 block mb-1.5">
                        {t("campaignsDashboard.builder.fields.exclusivity")}
                      </label>
                      <Select
                        value={campaignForm.exclusivity}
                        onValueChange={(v) =>
                          setCampaignForm({ ...campaignForm, exclusivity: v })
                        }
                      >
                        <SelectTrigger className="border-2 border-gray-200 rounded-none">
                          <SelectValue
                            placeholder={t(
                              "campaignsDashboard.builder.placeholders.selectExclusivity",
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Non-exclusive">
                            {t(
                              "campaignsDashboard.builder.exclusivity.nonExclusive",
                            )}
                          </SelectItem>
                          <SelectItem value="Category exclusive">
                            {t(
                              "campaignsDashboard.builder.exclusivity.categoryExclusive",
                            )}
                          </SelectItem>
                          <SelectItem value="Full exclusivity">
                            {t(
                              "campaignsDashboard.builder.exclusivity.fullExclusivity",
                            )}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600 block mb-1.5">
                      {t("campaignsDashboard.builder.fields.customTerms")}
                    </label>
                    <Textarea
                      value={campaignForm.custom_terms}
                      onChange={(e) =>
                        setCampaignForm({
                          ...campaignForm,
                          custom_terms: e.target.value,
                        })
                      }
                      placeholder={t(
                        "campaignsDashboard.builder.placeholders.customTerms",
                      )}
                      className="border-2 border-gray-200 rounded-none min-h-[80px]"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={resetCampaignBuilder}
                      className="border-2 border-gray-300 rounded-none bg-white text-black hover:bg-gray-50"
                    >
                      {t("campaignsDashboard.builder.actions.cancel")}
                    </Button>
                    <Button
                      onClick={handleStep1Next}
                      disabled={savingCampaign}
                      className="bg-black hover:bg-gray-800 text-white border-2 border-black rounded-none"
                    >
                      {savingCampaign
                        ? t("campaignsDashboard.builder.actions.saving")
                        : t("campaignsDashboard.builder.actions.next")}
                    </Button>
                  </div>
                </div>
              )}

              {newCampaignStep === 2 && (
                <>
                  {wizardErrorBanner && (
                    <div className="animate-shake flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 mb-4">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-900">
                          {t(
                            "campaignsDashboard.builder.reviewBriefTitle",
                            "Please review the campaign brief",
                          )}
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          {wizardErrorBanner}
                        </p>
                      </div>
                      <button
                        onClick={() => setWizardErrorBanner(null)}
                        className="ml-auto text-amber-500 hover:text-amber-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <CampaignBriefStep
                    campaignBrief={campaignBrief}
                    setCampaignBrief={setCampaignBrief}
                    platformFeePercent={platformFee}
                    onReferenceImagesUpload={handleReferenceImageUpload}
                    onBrandAssetsUpload={handleBrandAssetsUpload}
                    fieldErrors={step2FieldErrors}
                    onFieldChange={(field: string) => {
                      if (step2FieldErrors[field])
                        setStep2FieldErrors((p) => ({ ...p, [field]: "" }));
                    }}
                    onBack={() => {
                      if (isExistingCampaign) return;
                      setNewCampaignStep(1);
                    }}
                    hideBack={isExistingCampaign}
                    onNext={handleStep2Next}
                    isSaving={savingCampaign}
                    uploading={uploadingImages}
                  />
                </>
              )}

              {newCampaignStep === 3 && (
                <div className="space-y-6">
                  <Alert className="bg-blue-50 border-2 border-blue-200 rounded-none">
                    <AlertCircle className="h-5 w-5 text-blue-600" />
                    <AlertDescription className="text-blue-900">
                      {t("campaignsDashboard.builder.step3Intro", {
                        role:
                          campaignForm.collaborator_type === "agency"
                            ? t("campaignsDashboard.builder.copy.talents")
                            : t("campaignsDashboard.builder.copy.creators"),
                      })}
                    </AlertDescription>
                  </Alert>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-3">
                      {t(
                        "campaignsDashboard.builder.fields.selectCollaboratorType",
                      )}
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
                          {t(
                            "campaignsDashboard.builder.collaborators.marketingAgency",
                          )}
                        </h4>
                        <p className="text-xs text-gray-600">
                          {t(
                            "campaignsDashboard.builder.collaborators.marketingAgencyDesc",
                          )}
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
                          {t(
                            "campaignsDashboard.builder.collaborators.aiCreator",
                          )}
                        </h4>
                        <p className="text-xs text-gray-600">
                          {t(
                            "campaignsDashboard.builder.collaborators.aiCreatorDesc",
                          )}
                        </p>
                      </Card>
                    </div>
                  </div>

                  {campaignForm.collaborator_type === "agency" && (
                    <div className="space-y-4">
                      <label className="text-sm font-medium text-gray-700 block">
                        {t("campaignsDashboard.builder.fields.selectAgency")}
                      </label>
                      {loadingExistingCollaborators ? (
                        <p className="text-xs text-gray-500">
                          {t(
                            "campaignsDashboard.builder.loadingExistingCollaborators",
                          )}
                        </p>
                      ) : null}
                      <Input
                        value={agencySearch}
                        onChange={(e) => setAgencySearch(e.target.value)}
                        placeholder={t(
                          "campaignsDashboard.builder.placeholders.searchConnectedAgencies",
                        )}
                        className="border-2 border-gray-300 rounded-none"
                      />
                      <div className="border-2 border-gray-200 rounded-none p-3 space-y-3">
                        {loadingConnectedAgencies ? (
                          <p className="text-sm text-gray-500">
                            {t(
                              "campaignsDashboard.builder.loadingConnectedAgencies",
                            )}
                          </p>
                        ) : filteredConnectedAgencies.length === 0 ? (
                          <p className="text-sm text-gray-500">
                            {t(
                              "campaignsDashboard.builder.noConnectedAgencies",
                            )}
                          </p>
                        ) : (
                          filteredConnectedAgencies.map((agency) => {
                            const agencyId = String(
                              agency?.agency_id || agency?.id || "",
                            );
                            const selected =
                              campaignForm.collaborators?.includes(agencyId);
                            const alreadyInCampaign =
                              agencyId &&
                              existingCampaignAgencyIds.has(agencyId);
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
                                    {alreadyInCampaign ? (
                                      <p className="text-[11px] font-semibold text-amber-700 mt-1">
                                        {t(
                                          "campaignsDashboard.builder.alreadyInCampaign",
                                        )}
                                      </p>
                                    ) : null}
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-10 border-2 border-gray-300 rounded-none"
                                    onClick={() =>
                                      (() => {
                                        if (!agencyId) return;
                                        if (alreadyInCampaign) {
                                          toast({
                                            title: t(
                                              "campaignsDashboard.builder.collaboratorAlreadyAdded",
                                            ),
                                            description: t(
                                              "campaignsDashboard.builder.agencyAlreadyInCampaign",
                                            ),
                                          });
                                          return;
                                        }
                                        setCampaignForm((prev) => ({
                                          ...prev,
                                          collaborators: [agencyId],
                                        }));
                                      })()
                                    }
                                    disabled={alreadyInCampaign}
                                  >
                                    {selected
                                      ? t(
                                          "campaignsDashboard.builder.actions.selected",
                                        )
                                      : t(
                                          "campaignsDashboard.builder.actions.select",
                                        )}
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
                        {t("campaignsDashboard.builder.fields.selectCreators")}
                      </label>
                      <Input
                        value={creatorSearch}
                        onChange={(e) => setCreatorSearch(e.target.value)}
                        placeholder={t(
                          "campaignsDashboard.builder.placeholders.searchConnectedCreators",
                        )}
                        className="border-2 border-gray-300 rounded-none"
                      />
                      <div className="border-2 border-gray-200 rounded-none p-3 max-h-[340px] overflow-y-auto space-y-3">
                        {loadingMarketplaceCreators ? (
                          <p className="text-sm text-gray-500">
                            Loading creators...
                          </p>
                        ) : marketplaceCreators.length === 0 ? (
                          <p className="text-sm text-gray-500">
                            No connected creators found.
                          </p>
                        ) : (
                          marketplaceCreators.map((creator) => {
                            const creatorId = String(creator?.id || "");
                            const selected =
                              selectedTalentCreatorIds.has(creatorId) ||
                              campaignForm.collaborators?.includes(creatorId);
                            const alreadyInCampaign =
                              creatorId &&
                              existingCampaignCreatorIds.has(creatorId);
                            const name = getDisplayName(
                              creator?.display_name ||
                                creator?.full_name ||
                                creator?.name,
                            );
                            const creatorType = String(
                              creator?.creator_type || "Creator",
                            );
                            const baseRateMonthlyCents = Number(
                              creator?.base_rate_monthly_cents ??
                                creator?.base_monthly_price_cents ??
                                creator?.licensing_rate_monthly_cents ??
                                creator?.base_weekly_price_cents ??
                                0,
                            );
                            const hasBaseRate =
                              Number.isFinite(baseRateMonthlyCents) &&
                              baseRateMonthlyCents > 0;
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
                                      if (alreadyInCampaign) {
                                        toast({
                                          title: "Collaborator already added",
                                          description:
                                            "This creator is already part of the campaign.",
                                        });
                                        return;
                                      }
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
                                    disabled={alreadyInCampaign}
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

                    <div className="pt-3 border-t border-gray-100 flex flex-col gap-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Financial Summary
                      </p>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">
                          Collaborator Payout (Net)
                        </span>
                        <span className="font-semibold text-gray-900">
                          ${campaignBrief.budget_creator_payment || "0"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">
                          Likelee Platform Fee ({platformFee}%)
                        </span>
                        <span className="text-blue-600 font-medium">
                          +$
                          {(
                            Number(campaignBrief.budget_total || 0) -
                            Number(campaignBrief.budget_creator_payment || 0)
                          ).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-base pt-1 border-t border-dashed border-gray-200">
                        <span className="font-bold text-gray-900">
                          Total Brand Spend (Gross)
                        </span>
                        <span className="font-bold text-black">
                          ${campaignBrief.budget_total || "0"}
                        </span>
                      </div>
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
                          const baseRateMonthlyCents = Number(
                            creator?.base_rate_monthly_cents ??
                              creator?.base_monthly_price_cents ??
                              creator?.licensing_rate_monthly_cents ??
                              creator?.base_weekly_price_cents ??
                              0,
                          );
                          const hasBaseRate =
                            Number.isFinite(baseRateMonthlyCents) &&
                            baseRateMonthlyCents > 0;
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
                        disabled={savingCampaign || !canLaunchCurrentCampaign}
                        className="bg-black hover:bg-gray-800 text-white border-2 border-black rounded-none"
                      >
                        {savingCampaign ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending…
                          </>
                        ) : (
                          "Send Offer"
                        )}
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
                          !contractDraft.docuseal_template_id ||
                          savingCampaign ||
                          !canLaunchCurrentCampaign
                        }
                        className="bg-black hover:bg-gray-800 text-white border-2 border-black rounded-none"
                      >
                        {savingCampaign ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending…
                          </>
                        ) : (
                          "Send Offer"
                        )}
                      </Button>
                    </div>
                  </div>
                )}
            </Card>
          </div>
        </div>
      )}

      <Dialog
        open={showEscrowReleaseModal}
        onOpenChange={(open) => {
          setShowEscrowReleaseModal(open);
          if (!open) setEscrowReleaseInfo(null);
        }}
      >
        <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl p-0 overflow-hidden rounded-none">
          <div className="relative p-8 text-center flex flex-col items-center">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600" />

            <div className="mb-6 relative">
              <div className="w-20 h-20 bg-emerald-100 rounded-none flex items-center justify-center relative z-10 animate-bounce-short">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-100 flex items-center justify-center animate-ping-slow">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
              </div>
            </div>

            <DialogHeader className="space-y-2 mb-6 text-center">
              <DialogTitle className="text-3xl font-black tracking-tight text-gray-900 uppercase italic text-center w-full">
                Escrow Released!
              </DialogTitle>
              <DialogDescription className="text-gray-500 text-base font-medium text-center">
                Funds have been successfully distributed via Stripe.
              </DialogDescription>
            </DialogHeader>

            <div className="w-full bg-gray-50 border border-gray-100 p-6 mb-8 text-left">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                  Payout Details
                </span>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 rounded-none font-bold uppercase tracking-tighter text-[10px] h-5 px-1.5 py-0 flex items-center">
                  Released via Stripe
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Status:</span>
                  <span className="font-medium text-gray-900">
                    {String(escrowReleaseInfo?.payment_status || "unknown")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Escrow Status:</span>
                  <span className="font-medium text-gray-900">
                    {String(escrowReleaseInfo?.escrow_status || "unknown")}
                  </span>
                </div>
              </div>
            </div>

            <Button
              className="w-full h-14 bg-black hover:bg-gray-800 text-white font-black uppercase tracking-widest text-sm rounded-none shadow-xl transition-all active:scale-[0.98]"
              onClick={() => setShowEscrowReleaseModal(false)}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                  {t("campaignsDashboard.inviteAgency.title")}
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
                    {t("campaignsDashboard.inviteAgency.chooseMethod")}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-6 border-2 border-gray-200 bg-gray-50 rounded-none opacity-80">
                      <Mail className="w-8 h-8 text-gray-400 mb-3" />
                      <h4 className="font-bold text-gray-900 mb-2">
                        {t("campaignsDashboard.inviteAgency.emailTitle")}
                      </h4>
                      <p className="text-sm text-gray-600 mb-4">
                        {t("campaignsDashboard.inviteAgency.emailSoon")}
                      </p>
                      <Input
                        placeholder={t(
                          "campaignsDashboard.inviteAgency.emailPlaceholder",
                        )}
                        className="border-2 border-gray-300 rounded-none mb-3"
                        disabled
                      />
                      <Button
                        disabled
                        className="w-full bg-gray-300 text-gray-600 rounded-none cursor-not-allowed"
                      >
                        {t("campaignsDashboard.planLabels.comingSoon", {
                          defaultValue: "Coming Soon",
                        })}
                      </Button>
                    </Card>

                    <Card className="p-6 border-2 border-gray-300 hover:border-[#F7B750] cursor-pointer transition-all rounded-none">
                      <Building2 className="w-8 h-8 text-[#F7B750] mb-3" />
                      <h4 className="font-bold text-gray-900 mb-2">
                        {t("campaignsDashboard.inviteAgency.marketplaceTitle")}
                      </h4>
                      <p className="text-sm text-gray-600 mb-4">
                        {t(
                          "campaignsDashboard.inviteAgency.marketplaceDescription",
                        )}
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
                        {t("campaignsDashboard.inviteAgency.marketplaceCta")}
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
          <div className="min-h-screen flex items-start sm:items-center justify-center p-0 sm:p-6">
            <Card className="w-full max-w-3xl bg-white p-4 sm:p-8 rounded-none min-h-screen sm:min-h-0">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900">
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

              {/* Hero — horizontal on mobile */}
              <div className="flex flex-col sm:text-center mb-5 sm:mb-8">
                <div className="flex items-center gap-4 sm:flex-col sm:items-center sm:gap-0">
                  <div className="w-14 h-14 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-none flex items-center justify-center sm:mx-auto sm:mb-4 shrink-0">
                    <Zap className="w-7 h-7 sm:w-10 sm:h-10 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-2xl font-bold text-gray-900 sm:mb-3">
                      Generate Content In-House
                    </h3>
                    <p className="text-sm text-gray-600 sm:max-w-2xl sm:mx-auto">
                      Unlock Likelee Studio to create AI-generated videos,
                      images, and voiceovers without waiting for agency cycles.
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature cards — 2x2 grid always */}
              <div className="grid grid-cols-2 gap-3 sm:gap-6 mb-4 sm:mb-8">
                <Card className="p-3 sm:p-6 border-2 border-gray-200 rounded-none">
                  <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 mb-2 sm:mb-3" />
                  <h4 className="font-bold text-gray-900 mb-1 sm:mb-2 text-xs sm:text-base">
                    Direct Content Creation
                  </h4>
                  <p className="text-xs text-gray-600 hidden sm:block">
                    Generate videos and images instantly without agency delays
                  </p>
                </Card>

                <Card className="p-3 sm:p-6 border-2 border-gray-200 rounded-none">
                  <Users className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 mb-2 sm:mb-3" />
                  <h4 className="font-bold text-gray-900 mb-1 sm:mb-2 text-xs sm:text-base">
                    Team Collaboration
                  </h4>
                  <p className="text-xs text-gray-600 hidden sm:block">
                    Share studio access with your in-house creative team
                  </p>
                </Card>

                <Card className="p-3 sm:p-6 border-2 border-gray-200 rounded-none">
                  <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 mb-2 sm:mb-3" />
                  <h4 className="font-bold text-gray-900 mb-1 sm:mb-2 text-xs sm:text-base">
                    AI-Powered Tools
                  </h4>
                  <p className="text-xs text-gray-600 hidden sm:block">
                    Access Runway, Sora, ElevenLabs, and more via one platform
                  </p>
                </Card>

                <Card className="p-3 sm:p-6 border-2 border-gray-200 rounded-none">
                  <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 mb-2 sm:mb-3" />
                  <h4 className="font-bold text-gray-900 mb-1 sm:mb-2 text-xs sm:text-base">
                    Rights Management
                  </h4>
                  <p className="text-xs text-gray-600 hidden sm:block">
                    Automatic tracking and compliance for all generated content
                  </p>
                </Card>
              </div>

              {/* Pricing card */}
              <Card className="p-4 sm:p-6 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-600 rounded-none mb-4 sm:mb-8">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <h4 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
                      $299/month
                    </h4>
                    <p className="text-sm text-gray-700 mb-3">
                      Added as a separate billing line item from your base plan
                    </p>
                    <ul className="space-y-1.5 text-xs sm:text-sm text-gray-700">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                        Unlock brand access to Likelee Studio tools
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                        Purchased separately from the base plan free trial
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                        Included automatically with Enterprise
                      </li>
                    </ul>
                  </div>
                  <Button
                    className="bg-orange-600 hover:bg-orange-700 text-white rounded-none shrink-0 w-full sm:w-auto"
                    onClick={() => navigate("/brandpricing?focus=studio")}
                  >
                    {brandPlanTier === "pro"
                      ? "Enable Add-On"
                      : "Upgrade to Pro"}
                  </Button>
                </div>
              </Card>

              <p className="text-xs sm:text-sm text-gray-600 text-center">
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
                      {t("campaigns.markDone.confirm")}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <Card className="p-4 border-2 border-gray-200 rounded-none">
                  <p className="text-sm text-gray-600 mb-1">
                    {t("campaigns.campaignDetails.budget")}
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    ${selectedCampaign.budget.toLocaleString()}
                  </p>
                </Card>
                <Card className="p-4 border-2 border-gray-200 rounded-none">
                  <p className="text-sm text-gray-600 mb-1">
                    {t("campaigns.campaignDetails.deliverables")}
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {selectedCampaignApprovedCount} /{" "}
                    {selectedCampaignTotalExpected}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {t("campaigns.campaignDetails.submittedCount", {
                      count: selectedCampaignSubmittedCount,
                    })}
                  </p>
                </Card>
                <Card className="p-4 border-2 border-gray-200 rounded-none">
                  <p className="text-sm text-gray-600 mb-1">
                    {t("campaigns.campaignDetails.startDate")}
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {selectedCampaign.start_date}
                  </p>
                </Card>
              </div>
              {selectedCampaign.status === "completed" && (
                <Card className="p-4 border-2 border-gray-200 rounded-none mb-8">
                  <p className="text-sm text-gray-600 mb-1">
                    {t("campaigns.selectedCampaign.completionStatus")}
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {selectedCampaign.completed_at
                      ? t("campaignsDashboard.status.completed")
                      : t("campaignsDashboard.status.incomplete")}
                  </p>
                  {selectedCampaign.completed_at && (
                    <p className="text-xs text-gray-500 mt-1">
                      {t("campaigns.selectedCampaign.markedDoneOn")}{" "}
                      {new Date(
                        String(selectedCampaign.completed_at),
                      ).toLocaleString()}
                    </p>
                  )}
                </Card>
              )}
              <div className="mb-8">
                <p className="text-sm text-gray-600 mb-2">
                  {t("campaigns.campaignDetails.collaborators")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedCampaignCollaborators.length === 0 ? (
                    <span className="text-sm text-gray-500">
                      {t("campaigns.campaignDetails.noCollaborators")}
                    </span>
                  ) : (
                    selectedCampaignCollaborators.map((collaborator, idx) => {
                      const label =
                        typeof collaborator === "string"
                          ? collaborator
                          : collaborator.label;
                      return (
                        <Badge
                          key={`${label}-${idx}`}
                          className="bg-gray-200 text-gray-700"
                        >
                          {formatCollaboratorLabel(label)}
                        </Badge>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900 uppercase tracking-widest text-sm">
                  {t("campaigns.campaignDetails.deliverablesFeedback")}
                </h3>
                <Alert className="border-2 border-gray-200 rounded-none">
                  <AlertDescription className="flex items-center gap-2 text-sm text-gray-700">
                    <Lock className="w-4 h-4" />
                    {t("campaigns.campaignDetails.approvalThresholdWarning")}
                  </AlertDescription>
                </Alert>
                {loadingSelectedCampaignDetails && (
                  <Card className="p-6 border-2 border-gray-200 rounded-none">
                    <p className="text-xs text-gray-600 flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {t("campaigns.campaignDetails.loadingDeliverables")}
                    </p>
                  </Card>
                )}
                {!loadingSelectedCampaignDetails &&
                  selectedCampaignDeliverables.length === 0 && (
                    <Card className="p-6 border-2 border-gray-200 rounded-none">
                      <p className="text-sm text-gray-600">
                        {t("campaigns.campaignDetails.noContentSubmitted")}
                      </p>
                    </Card>
                  )}

                {!loadingSelectedCampaignDetails &&
                  selectedCampaignCollaborators.map((collaborator) => {
                    const label =
                      typeof collaborator === "string"
                        ? collaborator
                        : collaborator.label;
                    const logo =
                      typeof collaborator === "string"
                        ? null
                        : collaborator.logo;
                    const items = deliverablesByCollaborator[label] || [];
                    if (items.length === 0) return null;

                    return (
                      <div key={label} className="space-y-4 pt-8 first:pt-2">
                        <div className="flex items-center gap-3 pb-3 border-b-2 border-gray-100">
                          <div className="bg-[#F7B750] w-7 h-7 flex items-center justify-center rounded-none overflow-hidden">
                            {logo ? (
                              <img
                                src={logo}
                                alt={label}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Users className="w-3.5 h-3.5 text-white" />
                            )}
                          </div>
                          <h4 className="font-black text-gray-900 uppercase tracking-widest text-[11px]">
                            {formatCollaboratorLabel(label)}
                          </h4>
                          <span className="ml-auto text-[10px] text-gray-400 font-black bg-gray-50 px-2 py-0.5 border border-gray-100 uppercase tracking-tighter">
                            {t("campaigns.campaignDetails.assetsCount", {
                              count: items.length,
                            })}
                          </span>
                        </div>
                        <div className="space-y-6">
                          {items.map((deliverable: any, idx: number) => {
                            const status = String(
                              deliverable?.status || "pending_review",
                            ).toLowerCase();
                            const deliverableId = String(deliverable?.id || "");
                            const isBusy =
                              reviewingDeliverableId === deliverableId;
                            const isApproved = [
                              "approved",
                              "accepted",
                              "brand_approved",
                            ].includes(status);
                            const displayStatus =
                              status === "brand_approved" ? "approved" : status;
                            const isPaid =
                              String(deliverable?.payment_status || "")
                                .trim()
                                .toLowerCase() === "paid";
                            const statusClass =
                              displayStatus === "approved" ||
                              displayStatus === "accepted"
                                ? "bg-emerald-100 text-emerald-700 font-bold border-none"
                                : displayStatus === "changes_requested" ||
                                    displayStatus === "rejected"
                                  ? "bg-red-100 text-red-700 font-bold border-none"
                                  : "bg-yellow-100 text-yellow-800 font-bold border-none";

                            const uploadedAtRaw = String(
                              deliverable?.created_at || "",
                            ).trim();
                            const uploadedAt = uploadedAtRaw
                              ? new Date(uploadedAtRaw).toLocaleString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  },
                                )
                              : "N/A";

                            return (
                              <Card
                                key={deliverableId || idx}
                                className={`p-6 border-2 border-gray-200 rounded-none hover:border-gray-300 transition-colors shadow-none ${
                                  isPaid ? "cursor-zoom-in" : "cursor-default"
                                }`}
                                onClick={() => {
                                  setPreviewItems(selectedCampaignDeliverables);
                                  setPreviewIndex(idx);
                                  setPreviewImage({
                                    ...deliverable,
                                    payment_status: deliverable?.payment_status,
                                  });
                                }}
                              >
                                <div className="flex items-start gap-6">
                                  <div className="w-48 h-32 bg-gray-100 rounded-none flex items-center justify-center overflow-hidden border border-gray-200">
                                    {String(
                                      deliverable?.asset_type || "",
                                    ).startsWith("image") &&
                                    deliverable?.asset_url ? (
                                      <img
                                        src={deliverablePreviewSrc(
                                          deliverable,
                                          {
                                            thumbnail:
                                              deliverable?.payment_status !==
                                              "paid",
                                          },
                                        )}
                                        alt={`Deliverable ${idx + 1}`}
                                        className="w-full h-full object-cover"
                                        onContextMenu={(e) =>
                                          e.preventDefault()
                                        }
                                        draggable={false}
                                      />
                                    ) : deliverable?.payment_status !==
                                      "paid" ? (
                                      <div className="w-full h-full bg-gray-950 flex flex-col items-center justify-center text-white/90 p-4 transition-all">
                                        <div className="relative mb-2 flex items-center justify-center">
                                          <Lock className="w-6 h-6 text-indigo-400/80" />
                                          <Sparkles className="w-4 h-4 text-indigo-400 absolute -top-3 -right-3 animate-pulse" />
                                        </div>
                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-center px-2 leading-tight">
                                          {t(
                                            "campaigns.campaignDetails.videoLocked",
                                          )}
                                        </span>
                                      </div>
                                    ) : (
                                      <video
                                        src={deliverablePreviewSrc(deliverable)}
                                        muted
                                        playsInline
                                        preload="metadata"
                                        className="w-full h-full object-cover bg-gray-900"
                                        onContextMenu={(e) =>
                                          e.preventDefault()
                                        }
                                        controlsList="nodownload noplaybackrate"
                                      />
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-start justify-between mb-4">
                                      <div>
                                        <h4 className="font-black text-gray-900 mb-1 uppercase tracking-tight">
                                          {t(
                                            "campaigns.campaignDetails.deliverableNumber",
                                            {
                                              count: idx + 1,
                                            },
                                          )}
                                        </h4>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">
                                          {t(
                                            "campaigns.campaignDetails.uploadedOn",
                                            {
                                              date: uploadedAt,
                                            },
                                          )}
                                        </p>
                                        <Badge
                                          className={`${statusClass} text-[10px] uppercase tracking-wider h-5 rounded-none px-2`}
                                        >
                                          {displayStatus.replace(/_/g, " ")}
                                        </Badge>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          className="bg-green-600 hover:bg-green-700 text-white rounded-none h-8 text-[10px] font-black uppercase tracking-widest px-4 shadow-none"
                                          disabled={isApproved || isBusy}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            void reviewSelectedCampaignDeliverable(
                                              deliverable,
                                              "approve",
                                            );
                                          }}
                                        >
                                          {isApproved
                                            ? t(
                                                "campaigns.campaignDetails.approved",
                                              )
                                            : isBusy
                                              ? "..."
                                              : t(
                                                  "campaigns.campaignDetails.approve",
                                                )}
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="border-2 border-gray-200 hover:border-gray-900 rounded-none h-8 text-[10px] font-black uppercase tracking-widest px-4 shadow-none"
                                          disabled={isApproved || isBusy}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            void reviewSelectedCampaignDeliverable(
                                              deliverable,
                                              "changes_requested",
                                            );
                                          }}
                                        >
                                          {t(
                                            "campaigns.campaignDetails.requestChanges",
                                          )}
                                        </Button>
                                        {isApproved && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="border-2 border-gray-200 hover:border-gray-900 rounded-none h-8 text-[10px] font-black uppercase tracking-widest px-3 shadow-none"
                                            onClick={() =>
                                              downloadSelectedCampaignDeliverable(
                                                deliverable,
                                                idx,
                                              )
                                            }
                                          >
                                            <Download className="w-3.5 h-3.5" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-gray-100">
                                      <div className="space-y-2">
                                        {deliverable?.meta?.feedback_comments?.map(
                                          (comment: any, cidx: number) => (
                                            <div
                                              key={cidx}
                                              className="bg-gray-50 p-3 border border-gray-100 rounded-none"
                                            >
                                              <div className="flex justify-between items-center mb-1.5">
                                                <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">
                                                  {comment?.author_role ||
                                                    t(
                                                      "campaigns.campaignDetails.user",
                                                    )}
                                                </span>
                                                <span className="text-[9px] text-gray-400 font-bold">
                                                  {comment?.created_at
                                                    ? new Date(
                                                        comment.created_at,
                                                      ).toLocaleTimeString()
                                                    : ""}
                                                </span>
                                              </div>
                                              <p className="text-xs text-gray-700 leading-relaxed">
                                                {comment?.message}
                                              </p>
                                            </div>
                                          ),
                                        )}
                                      </div>

                                      <div className="flex gap-2">
                                        <Input
                                          placeholder={t(
                                            "campaigns.campaignDetails.feedbackPlaceholder",
                                          )}
                                          value={
                                            deliverableCommentDrafts[
                                              deliverableId
                                            ] || ""
                                          }
                                          onChange={(e) =>
                                            setDeliverableCommentDrafts(
                                              (prev) => ({
                                                ...prev,
                                                [deliverableId]: e.target.value,
                                              }),
                                            )
                                          }
                                          className="border-2 border-gray-200 rounded-none h-9 text-xs focus:border-gray-900 transition-colors shadow-none"
                                        />
                                        <Button
                                          onClick={() =>
                                            void commentSelectedCampaignDeliverable(
                                              deliverable,
                                            )
                                          }
                                          className="bg-gray-900 hover:bg-black text-white rounded-none h-9 text-[10px] font-black uppercase tracking-widest px-5 shadow-none"
                                        >
                                          {t("campaigns.campaignDetails.send")}
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
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
              {t("campaignsDashboard.postJobModal.openFullForm")}
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
                  {t("campaignsDashboard.postJobModal.title", {
                    defaultValue: t("campaigns.postJobModal.title"),
                  })}
                </h2>
                <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                  {t("campaignsDashboard.postJobModal.description", {
                    defaultValue: t("campaigns.postJobModal.description"),
                  })}
                </p>
                <Button
                  onClick={() => navigate(createPageUrl("PostJob"))}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-none"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {t("campaignsDashboard.postJobModal.cta", {
                    defaultValue: t("campaigns.postJobModal.createJobPosting"),
                  })}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
      {/* Image Preview Dialog */}
      <Dialog
        open={!!previewImage}
        onOpenChange={() => {
          setPreviewImage(null);
          setPreviewItems([]);
          setPreviewIndex(0);
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-[700px] p-0 overflow-hidden border-none bg-black/90 shadow-2xl rounded-none">
          <div className="relative w-full h-full flex flex-col items-center justify-center p-0">
            <div className="w-full aspect-[4/5] relative flex items-center justify-center bg-gray-900 border border-white/5">
              {previewImage?.asset_type === "video" ? (
                previewImage?.payment_status !== "paid" ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-950 p-8 text-center">
                    <div className="w-24 h-24 mb-6 rounded-none border-2 border-indigo-500/20 flex items-center justify-center bg-indigo-500/5">
                      <video
                        src={getPublicUrl(previewImage)}
                        className="w-full h-full object-cover opacity-10 grayscale blur-sm"
                        muted
                      />
                      <div className="absolute flex flex-col items-center">
                        <Lock className="w-10 h-10 text-indigo-400 mb-2" />
                        <Sparkles className="w-6 h-6 text-indigo-400/50 absolute -top-8 -right-8 animate-pulse" />
                      </div>
                    </div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">
                      Premium Campaign Asset
                    </h3>
                    <p className="text-sm text-gray-500 max-w-xs mb-8 font-medium">
                      This high-resolution deliverable is secured until the
                      escrow payment is released.
                    </p>
                    <div className="flex gap-4">
                      <Button
                        variant="outline"
                        className="rounded-none border-white/10 text-white hover:bg-white/5 font-black uppercase tracking-widest text-[10px]"
                        onClick={() => setPreviewImage(null)}
                      >
                        Go back
                      </Button>
                      <Button
                        className="rounded-none bg-[#F7B750] hover:bg-[#F7B750]/90 text-white font-black uppercase tracking-widest text-[10px] px-8"
                        onClick={() => {
                          setPreviewImage(null);
                          // In campaign dashboard, we don't have the billing tab directly
                          toast({
                            title: "Redirecting...",
                            description:
                              "Please visit Brand Settings to manage payments.",
                          });
                        }}
                      >
                        View Billing
                      </Button>
                    </div>
                  </div>
                ) : (
                  <video
                    src={getPublicUrl(previewImage)}
                    controls
                    className="max-w-full max-h-full"
                    onContextMenu={(e) => e.preventDefault()}
                    controlsList="nodownload noplaybackrate"
                  />
                )
              ) : (
                <div className="relative group/preview">
                  {/* Watermark Overlay for Unpaid Assets */}
                  {previewImage?.payment_status !== "paid" && (
                    <div
                      className="absolute inset-0 z-10 pointer-events-none opacity-[0.08]"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='150' height='150' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='50%25' y='50%25' font-size='10' fill='white' font-family='sans-serif' font-weight='black' text-anchor='middle' transform='rotate(-45 75 75)'%3ELIKELEE PREVIEW%3C/text%3E%3C/svg%3E")`,
                        backgroundRepeat: "repeat",
                      }}
                    />
                  )}

                  {/* Interaction Shield - Transparent layer over the image */}
                  <div
                    className="absolute inset-0 z-20 cursor-default"
                    onContextMenu={(e) => e.preventDefault()}
                  />

                  <img
                    src={
                      previewImage
                        ? deliverablePreviewSrc(previewImage, {
                            thumbnail: previewImage?.payment_status !== "paid",
                          })
                        : ""
                    }
                    className="max-w-full max-h-full object-contain"
                    alt="Preview"
                    onContextMenu={(e) => e.preventDefault()}
                    draggable={false}
                  />
                </div>
              )}
              {previewItems.length > 1 && (
                <>
                  <button
                    type="button"
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-md flex items-center justify-center z-30"
                    onClick={() => {
                      const nextIndex =
                        previewIndex > 0
                          ? previewIndex - 1
                          : previewItems.length - 1;
                      setPreviewIndex(nextIndex);
                      setPreviewImage(previewItems[nextIndex]);
                    }}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-md flex items-center justify-center z-30"
                    onClick={() => {
                      const nextIndex =
                        previewIndex < previewItems.length - 1
                          ? previewIndex + 1
                          : 0;
                      setPreviewIndex(nextIndex);
                      setPreviewImage(previewItems[nextIndex]);
                    }}
                  >
                    <ArrowLeft className="w-5 h-5 rotate-180" />
                  </button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={markDoneOpen} onOpenChange={setMarkDoneOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("campaigns.markDone.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("campaigns.markDone.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={markDoneBusy}>
              {t("common.cancel", { defaultValue: "Cancel" })}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkCampaignDone}
              disabled={markDoneBusy}
            >
              {markDoneBusy
                ? t("common.saving", { defaultValue: "Saving..." })
                : t("campaigns.markDone.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {showUnpaidModal && (
        <UnpaidDeliverableModal
          open={showUnpaidModal}
          onOpenChange={setShowUnpaidModal}
          offerId={unpaidOfferId}
        />
      )}
    </div>
  );
}
