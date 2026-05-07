import React, {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createPageUrl } from "@/utils";
import { createBookDemoUrl } from "@/utils/bookDemo";
import { CONTACT_EMAIL_MAILTO } from "@/config/public";
import { base44 } from "@/api/base44Client";
import {
  createBrandLicensingRequest,
  createAgencyBrandLicensingRequest,
  getBrandLicensingRequests,
  updateBrandLicensingRequestsStatus,
  deleteBrandLicensingRequests,
  getBrandProfile,
  listOfferDeliverables,
  reviewOfferDeliverable,
  getBrandBillingStatus,
  getBrandSpendAnalytics,
  getBrandEscrowSummary,
  listBrandInvoices,
  getBrandBudgetSettings,
  updateBrandBudgetSettings,
  listBrandStorageFilesPaged,
  listBrandStorageFoldersPaged,
  getBrandStorageFileSignedUrl,
} from "@/api/functions";
import {
  listGenerations,
  listCampaignGenerations,
  StudioGenerationRow,
} from "@/api/studio";
import { useAuth } from "@/auth/AuthProvider";
import {
  BRAND_STUDIO_ADDON_PRICE,
  BrandPlanTier,
  brandAllowsCampaignCollaboration,
  brandCanPurchaseStudioAddon,
  brandIncludesStudioAccess,
  brandPlanCampaignLimit,
  brandPlanPrice,
  brandPlanSeatLimit,
  formatBrandPlanLabel,
  formatBrandStudioAddonStatus,
  formatBrandSubscriptionStatus,
  hasBrandStudioAccess,
  normalizeBrandPlanTier,
} from "@/lib/brandBilling";
import { supabase } from "@/lib/supabase";
import { CampaignBriefView } from "@/components/campaign-offers/CampaignBriefView";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Search,
  Bell,
  HelpCircle,
  User,
  Plus,
  Filter,
  TrendingUp,
  FileText,
  Clock,
  CheckCircle2,
  CheckCircle,
  Play,
  DollarSign,
  Eye,
  ExternalLink,
  BarChart3,
  Download,
  Settings,
  Calendar,
  Globe,
  Star,
  Zap,
  Users,
  Image as ImageIcon,
  Video,
  AlertCircle,
  AlertTriangle,
  LayoutDashboard,
  Target,
  ShoppingCart,
  CreditCard,
  Menu,
  Building2,
  Edit,
  Archive,
  Upload,
  Send,
  Copy,
  CheckSquare,
  X,
  Briefcase,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Mail,
  Loader2,
  MessageSquare,
  RefreshCw,
  Maximize2,
  Trash2,
  Sparkles,
  Lock,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { DocusealForm } from "@docuseal/react";
import {
  MarketplaceProfile,
  MarketplaceProfileDetails,
} from "@/components/marketplace/MarketplaceSection";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { useToast } from "@/components/ui/use-toast";
import MarketplaceSection from "@/components/marketplace/MarketplaceSection";
import BrandCampaignDashboard from "@/pages/BrandCampaignDashboard";
import { TrialCountdownBanner } from "@/components/brand/TrialCountdownBanner";
import { useTeamAccess } from "@/features/team/useTeamAccess";
import { TeamManagementCard } from "@/features/team/TeamManagementCard";
import { BrandSettingsBilling } from "@/components/brand-dashboard/settings/BrandSettingsBilling";
import { currencyFormatter } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ActiveSessionAudit } from "@/components/security/ActiveSessionAudit";

const ensureProtocol = (url: string | null | undefined) => {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

const formatBillingDate = (value: unknown) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const brandPlanSummaryTheme = (
  tier: BrandPlanTier,
): {
  eyebrow: string;
  containerClass: string;
  bandClass: string;
  badgeClass: string;
  headingClass: string;
  bodyClass: string;
  statCardClass: string;
  statLabelClass: string;
  statValueClass: string;
  statMetaClass: string;
  buttonClass: string;
  actionLabel: string;
  actionPath: string;
} => {
  switch (tier) {
    case "basic":
      return {
        eyebrow: "Starter",
        containerClass: "border-[#D7E6ED] bg-white",
        bandClass: "bg-gradient-to-r from-[#6CE5E0] to-[#18B1AE]",
        badgeClass:
          "border border-[#D7F0EB] bg-[#EEF9F7] text-[#18A7A5] hover:bg-[#EEF9F7]",
        headingClass: "text-[#19305A]",
        bodyClass: "text-[#70839B]",
        statCardClass: "border border-[#D7F0EB] bg-[#F5FCFA]",
        statLabelClass: "text-[#5F7C86]",
        statValueClass: "text-[#19305A]",
        statMetaClass: "text-[#6F8F99]",
        buttonClass: "bg-[#18B1AE] hover:bg-[#119693] text-white",
        actionLabel: "Upgrade to Pro",
        actionPath: "/brandpricing",
      };
    case "pro":
      return {
        eyebrow: "Most popular",
        containerClass: "border-[#2B4B8A] bg-[#17315E]",
        bandClass: "bg-gradient-to-r from-[#1A4E74] to-[#17315E]",
        badgeClass:
          "border border-[#225F85] bg-[#1A4E74] text-[#7FECFF] hover:bg-[#1A4E74]",
        headingClass: "text-white",
        bodyClass: "text-[#B8C8E5]",
        statCardClass: "border border-[#29456F] bg-[#1C3B6C]",
        statLabelClass: "text-[#A9BBDA]",
        statValueClass: "text-white",
        statMetaClass: "text-[#9CB1D5]",
        buttonClass: "bg-white text-[#17315E] hover:bg-[#F4F8FD]",
        actionLabel: "Talk to Sales",
        actionPath: "/SalesInquiry",
      };
    case "enterprise":
      return {
        eyebrow: "Full suite",
        containerClass: "border-[#D9E4FF] bg-white",
        bandClass: "bg-gradient-to-r from-[#89A7FF] to-[#4978FF]",
        badgeClass:
          "border border-[#DCE5FF] bg-[#F3F6FF] text-[#4978FF] hover:bg-[#F3F6FF]",
        headingClass: "text-[#19305A]",
        bodyClass: "text-[#7C88A5]",
        statCardClass: "border border-[#DCE5FF] bg-[#F7F9FF]",
        statLabelClass: "text-[#7083A9]",
        statValueClass: "text-[#19305A]",
        statMetaClass: "text-[#7C88A5]",
        buttonClass:
          "border border-[#D5DDF1] bg-white text-[#253C67] hover:bg-[#F8FAFF]",
        actionLabel: "Contact Sales",
        actionPath: "/SalesInquiry",
      };
    default:
      return {
        eyebrow: "Free",
        containerClass: "border-slate-200 bg-white",
        bandClass: "bg-gradient-to-r from-slate-300 to-slate-200",
        badgeClass:
          "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-50",
        headingClass: "text-slate-900",
        bodyClass: "text-slate-600",
        statCardClass: "border border-slate-200 bg-slate-50",
        statLabelClass: "text-slate-600",
        statValueClass: "text-slate-900",
        statMetaClass: "text-slate-500",
        buttonClass: "bg-[#F7B750] hover:bg-[#E6A640] text-white",
        actionLabel: "View Plans",
        actionPath: "/brandpricing",
      };
  }
};

const getBrandInitials = (name: string) => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "B";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

// Brand data is now loaded from API via getBrandProfile()

// Mock creators removed - creators are now loaded from real marketplace data

// Mock campaigns removed - campaigns are now loaded from real API data

// Mock activities removed - activities are now loaded from real API data

// Mock assets removed - assets are now loaded from real API data

// Mock licenses removed - licenses are now loaded from real API data

export default function BrandDashboard() {
  const { t } = useTranslation();
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showCampaignSubtabs, setShowCampaignSubtabs] = useState(true);
  const [inboxSubTab, setInboxSubTab] = useState<
    "talent_packages" | "direct_requests"
  >("talent_packages");
  const [searchQuery, setSearchQuery] = useState("");
  const [brand, setBrand] = useState<any>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [campaignView, setCampaignView] = useState("active");
  const [openCampaignModalSignal, setOpenCampaignModalSignal] = useState(0);
  const [campaignBuilderContext, setCampaignBuilderContext] =
    useState<any>(null);
  // Note: "completed" tab key maps to "Expired" UI label per #360.
  // "Expired" is deadline-based; "Done" is tracked separately via completed_at.
  const [campaignHubTab, setCampaignHubTab] = useState<
    "active" | "pending_approval" | "completed" | "inbox" | "jobs"
  >("active");
  const activeSectionRef = useRef(activeSection);
  const campaignHubTabRef = useRef(campaignHubTab);
  const pendingSectionOverrideRef = useRef<string | null>(null);
  const [brandJobs, setBrandJobs] = useState<any[]>([]);
  const [loadingBrandJobs, setLoadingBrandJobs] = useState(false);
  const [jobSearch, setJobSearch] = useState("");
  const [jobStatusFilter, setJobStatusFilter] = useState("all");
  const [jobCallTypeFilter, setJobCallTypeFilter] = useState("all");
  const hasLoadedOffersRef = useRef(false);
  const hasLoadedBillingDataRef = useRef(false);
  const hasLoadedBrandAnalyticsRef = useRef(false);
  const deliverableReviewBusyRef = useRef<Set<string>>(new Set());
  const [activityEvents, setActivityEvents] = useState<any[]>([]);
  const [loadingActivityEvents, setLoadingActivityEvents] = useState(false);
  const [escrowReleasedModal, setEscrowReleasedModal] = useState<{
    open: boolean;
    offerId?: string;
    amount?: number;
    currency?: string;
  }>({ open: false });

  const billingSuccess = searchParams.get("billing_success") === "1";
  const billingSuccessProcessedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    const loadPackages = async () => {
      try {
        setLoadingInboxPackages(true);
        const response = await base44.get<{ packages?: any[] }>(
          "/api/brand/inbox/packages",
        );
        if (!mounted) return;
        const pkgs = Array.isArray(response?.packages) ? response.packages : [];
        setInboxPackages(pkgs);
        setInboxPendingCount(
          pkgs.filter((p: any) => String(p?.status || "") === "sent").length,
        );
      } catch (e) {
        if (!mounted) return;
        setInboxPackages([]);
        setInboxPendingCount(0);
      } finally {
        if (!mounted) return;
        setLoadingInboxPackages(false);
      }
    };
    loadPackages();
    const timer = setInterval(loadPackages, 15000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    campaignHubTabRef.current = campaignHubTab;
  }, [campaignHubTab]);

  // Handle billing success - refresh profile to ensure subscription is active
  useEffect(() => {
    if (!billingSuccess || billingSuccessProcessedRef.current) return;
    billingSuccessProcessedRef.current = true;

    const refreshAfterBilling = async () => {
      // Refresh profile to get updated subscription status
      await refreshProfile();

      // Clear the billing success session storage flag
      sessionStorage.removeItem("billing_success_pending");

      // Remove billing_success param from URL
      searchParams.delete("billing_success");
      searchParams.delete("plan");
      searchParams.delete("next");
      setSearchParams(searchParams, { replace: true });
    };

    void refreshAfterBilling();
  }, [billingSuccess, refreshProfile, searchParams, setSearchParams]);

  const [campaignMetrics, setCampaignMetrics] = useState<{
    active_projects_count: number;
    pending_approvals_count: number;
    action_needed: boolean;
    avg_turnaround_hours: number;
    loading: boolean;
  }>({
    active_projects_count: 0,
    pending_approvals_count: 0,
    action_needed: false,
    avg_turnaround_hours: 0,
    loading: true,
  });

  const [brandAnalytics, setBrandAnalytics] = useState<{
    total_projects_ytd: number;
    talent_performance: any[];
    loading: boolean;
  }>({
    total_projects_ytd: 0,
    talent_performance: [],
    loading: true,
  });

  const [brandBillingStatus, setBrandBillingStatus] = useState<{
    plan_tier: string;
    subscription_status: string;
    trial_active: boolean;
    trial_ends_at?: string;
  } | null>(null);

  const [brandSpendData, setBrandSpendData] = useState<{
    monthly_spend: Array<{ month: string; spend: number }>;
    ytd_spend: number;
    monthly_avg: number;
    current_month_spend: number;
    previous_month_spend: number;
    current_month_growth_percentage: number;
    projected_eoy: number;
  } | null>(null);

  const [brandInvoices, setBrandInvoices] = useState<
    Array<{
      id: string;
      number?: string;
      amount: number;
      currency: string;
      status: string;
      created_at?: string;
      invoice_url?: string;
    }>
  >([]);

  const [loadingBillingData, setLoadingBillingData] = useState(false);
  const [billingYtdSpend, setBillingYtdSpend] = useState(0);
  const [billingCurrentMonthSpend, setBillingCurrentMonthSpend] = useState(0);
  const [billingProjectedEoy, setBillingProjectedEoy] = useState(0);
  const [billingMonthlyAvg, setBillingMonthlyAvg] = useState(0);
  const [escrowSummary, setEscrowSummary] = useState<{
    breakdown: string;
    projectCount: number;
  }>({ breakdown: "$0", projectCount: 0 });
  const [budgetLimit, setBudgetLimit] = useState<number | null>(null);
  const [budgetAlertEnabled, setBudgetAlertEnabled] = useState(false);
  const [savingBudgetSettings, setSavingBudgetSettings] = useState(false);

  const navigateToSection = (
    nextSection: string,
    options?: {
      campaignHubTab?: "active" | "pending_approval" | "completed" | "jobs";
      campaignView?: "active" | "pending" | "completed";
      replace?: boolean;
    },
  ) => {
    pendingSectionOverrideRef.current = nextSection;
    startTransition(() => {
      setActiveSection(nextSection);
      if (options?.campaignHubTab) {
        setCampaignHubTab(options.campaignHubTab);
      }
      if (options?.campaignView) {
        setCampaignView(options.campaignView);
      }
    });
    const params = new URLSearchParams(location.search);
    params.set(
      "section",
      nextSection === "campaigns-hub" ? "campaigns" : nextSection,
    );
    setSearchParams(params, { replace: options?.replace ?? false });
  };

  const goToCampaignsSection = () => {
    navigateToSection("campaigns-hub", {
      campaignHubTab: "active",
      replace: false,
    });
  };

  const handleAgencyCollaborationEntry = () => {
    if (!brandCanUseCampaignCollaboration) {
      toast({
        title: "Upgrade to Pro",
        description:
          "Agency collaboration, talent browsing, and campaign launch workflows start on the Pro plan.",
      });
      navigate("/brandpricing");
      return;
    }
    goToCampaignsSection();
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
    if (brandSeatLimitReached) {
      toast({
        title: t("toasts.seatLimitReached"),
        description: t("toasts.seatLimitReachedDesc", {
          count: brandSeatLimitLabel,
        }),
        variant: "destructive" as any,
      });
      return;
    }
    // Navigate to Settings → Team tab to manage team members
    setActiveSettingsTab("team");
    navigateToSection("settings", { replace: false });
  };

  const formatRelativeTime = (value?: string | null) => {
    if (!value) return t("dashboard.time.justNow");
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t("dashboard.time.justNow");
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return t("dashboard.time.justNow");
    if (diffMins < 60)
      return t(
        diffMins === 1
          ? "dashboard.time.minuteAgo"
          : "dashboard.time.minutesAgo",
        { count: diffMins },
      );
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24)
      return t(
        diffHours === 1 ? "dashboard.time.hourAgo" : "dashboard.time.hoursAgo",
        { count: diffHours },
      );
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7)
      return t(
        diffDays === 1 ? "dashboard.time.dayAgo" : "dashboard.time.daysAgo",
        { count: diffDays },
      );
    const diffWeeks = Math.floor(diffDays / 7);
    return t(
      diffWeeks === 1 ? "dashboard.time.weekAgo" : "dashboard.time.weeksAgo",
      { count: diffWeeks },
    );
  };

  const resolveJobAssetUrl = (asset: any) => {
    if (!asset) return "";
    if (typeof asset === "string") {
      if (asset.startsWith("http")) return asset;
      if (asset.includes("/")) {
        return supabase.storage.from("likelee-public").getPublicUrl(asset).data
          ?.publicUrl;
      }
      return "";
    }
    if (asset.url) return String(asset.url);
    if (asset.public_url) return String(asset.public_url);
    if (asset.asset_url) return String(asset.asset_url);
    if (asset.file_url) return String(asset.file_url);
    if (asset.preview_url) return String(asset.preview_url);
    if (asset.path) {
      return supabase.storage.from("likelee-public").getPublicUrl(asset.path)
        .data?.publicUrl;
    }
    if (asset.name && String(asset.name).includes("/")) {
      return supabase.storage.from("likelee-public").getPublicUrl(asset.name)
        .data?.publicUrl;
    }
    return "";
  };

  const resolveResumeUrl = (app: any) => {
    if (!app) return "";
    if (app.resume_url) return String(app.resume_url);
    if (app.resume_path) {
      return supabase.storage
        .from("likelee-public")
        .getPublicUrl(app.resume_path).data?.publicUrl;
    }
    return "";
  };

  const [selectedJobForApplications, setSelectedJobForApplications] = useState<
    any | null
  >(null);
  const [selectedJobApplications, setSelectedJobApplications] = useState<any[]>(
    [],
  );
  const [loadingJobApplications, setLoadingJobApplications] = useState(false);
  const [selectedAssetIndex, setSelectedAssetIndex] = useState<number | null>(
    null,
  );

  const resolveMissingJobAssetUrls = async (job: any) => {
    if (!supabase || !job?.brand_id) return;
    if (!Array.isArray(job.brand_assets) || job.brand_assets.length === 0)
      return;
    const missing = job.brand_assets.filter((asset: any) => {
      const url = resolveJobAssetUrl(asset);
      if (url) return false;
      if (typeof asset === "string") return asset.trim().length > 0;
      return Boolean(asset?.name);
    });
    if (missing.length === 0) return;
    try {
      const { data } = await supabase.storage
        .from("likelee-public")
        .list(`job-assets/${job.brand_id}`, { limit: 200 });
      if (!data || data.length === 0) return;
      const updated = job.brand_assets.map((asset: any) => {
        const url = resolveJobAssetUrl(asset);
        const rawName =
          typeof asset === "string" ? asset : String(asset?.name || "");
        if (url || !rawName) return asset;
        const safeName = rawName.replace(/[^\w.\-]+/g, "_");
        const match = data.find((item) => item.name.endsWith(safeName));
        if (!match) return asset;
        const path = `job-assets/${job.brand_id}/${match.name}`;
        const publicUrl = supabase.storage
          .from("likelee-public")
          .getPublicUrl(path).data?.publicUrl;
        if (typeof asset === "string") {
          return { name: rawName, url: publicUrl, path };
        }
        return { ...asset, name: rawName, url: publicUrl, path };
      });
      setSelectedJobForApplications((prev) =>
        prev && prev.id === job.id ? { ...prev, brand_assets: updated } : prev,
      );
      setBrandJobs((prev) =>
        prev.map((item) =>
          item.id === job.id ? { ...item, brand_assets: updated } : item,
        ),
      );
    } catch {
      // ignore resolve failures
    }
  };

  const formatJobLabel = (value: string) =>
    value
      ? value
          .split("_")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ")
      : "";
  useEffect(() => {
    if (
      !selectedJobForApplications ||
      !selectedJobForApplications?._showDetailsOnly
    )
      return;
    resolveMissingJobAssetUrls(selectedJobForApplications);
  }, [selectedJobForApplications]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [studioGenerations, setStudioGenerations] = useState<
    StudioGenerationRow[]
  >([]);
  const [studioFiles, setStudioFiles] = useState<any[]>([]);
  const [studioFolders, setStudioFolders] = useState<any[]>([]);
  const [studioLoading, setStudioLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [studioSearchQuery, setStudioSearchQuery] = useState("");
  const [studioSourceFilter, setStudioSourceFilter] = useState<
    "all" | "studio_generation"
  >("all");
  const [studioAssetUrls, setStudioAssetUrls] = useState<
    Record<string, string>
  >({});
  const [studioDataCache, setStudioDataCache] = useState<{
    files: any[];
    generations: any[];
    folders: any[];
    timestamp: number;
  } | null>(null);
  const [signedUrlsCache, setSignedUrlsCache] = useState<
    Record<string, { url: string; expires: number }>
  >({});
  const [assetSizesCache, setAssetSizesCache] = useState<
    Record<string, number>
  >({});
  const [activeDownloads, setActiveDownloads] = useState<Set<string>>(
    new Set(),
  );
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<any>(null);
  const [showDeletePackageDialog, setShowDeletePackageDialog] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState<any>(null);
  const [deletingPackage, setDeletingPackage] = useState(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(
    new Set(),
  );
  const [collections, setCollections] = useState<
    { id: string; name: string; assetIds: string[] }[]
  >(() => {
    const saved = localStorage.getItem("studio-collections");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [
          { id: "1", name: "Holiday 2024", assetIds: [] },
          { id: "2", name: "Evergreen", assetIds: [] },
        ];
      }
    }
    return [
      { id: "1", name: "Holiday 2024", assetIds: [] },
      { id: "2", name: "Evergreen", assetIds: [] },
    ];
  });
  const [showCreateCollectionDialog, setShowCreateCollectionDialog] =
    useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    string | null
  >(null);
  const [filterType, setFilterType] = useState<"all" | "image" | "video">(
    "all",
  );
  const [filterDateRange, setFilterDateRange] = useState<
    "all" | "week" | "month" | "year"
  >("all");
  const [showEscrowDetails, setShowEscrowDetails] = useState(false);
  const [showBriefDetails, setShowBriefDetails] = useState(false);
  const [showHireModal, setShowHireModal] = useState(false);
  const [showSessionAudit, setShowSessionAudit] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState(null);
  const [showLicenseRequestModal, setShowLicenseRequestModal] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState("profile");
  const [selectedLicenseCreator, setSelectedLicenseCreator] =
    useState<MarketplaceProfile | null>(null);
  const [creatingLicenseRequest, setCreatingLicenseRequest] = useState(false);
  const [brandLicensingRequests, setBrandLicensingRequests] = useState<any[]>(
    [],
  );
  const [loadingBrandLicensingRequests, setLoadingBrandLicensingRequests] =
    useState(false);
  const [activeLicensingTab, setActiveLicensingTab] = useState<
    "Active" | "Archive"
  >("Active");
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(
    null,
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<any>(null);
  const [licenseRequestForm, setLicenseRequestForm] = useState({
    start_date: new Date().toISOString().slice(0, 10),
    license_fee: "",
    modifications_allowed: "",
    exclusivity: "",
    duration_days: "30",
    territory: "Global",
    category: "",
    description: "",
    custom_terms: "",
  });
  const [brandSignUrl, setBrandSignUrl] = useState<string | null>(null);
  const [brandSignOpen, setBrandSignOpen] = useState(false);
  const [showContractBuilder, setShowContractBuilder] = useState(false);
  const [contractStep, setContractStep] = useState(1);
  const [showCreatorProfile, setShowCreatorProfile] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [selectedCampaignContracts, setSelectedCampaignContracts] = useState<
    any[]
  >([]);
  const [
    loadingSelectedCampaignContracts,
    setLoadingSelectedCampaignContracts,
  ] = useState(false);
  const [showUpdateRequestModal, setShowUpdateRequestModal] = useState(false);
  const [updateRequestType, setUpdateRequestType] = useState(null);
  const [showContractHub, setShowContractHub] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [contractHubTab, setContractHubTab] = useState("active");
  const [contractHubSubTab, setContractHubSubTab] = useState("agency"); // New sub-tab state
  const [contractSearch, setContractSearch] = useState("");
  const [contractSort, setContractSort] = useState("newest");
  const [contractDetailTab, setContractDetailTab] = useState("summary");
  const [notificationPrefs, setNotificationPrefs] = useState<
    Record<string, boolean>
  >({
    newProjectAlerts: true,
    deliverableSubmissions: true,
    approvalReminders: true,
    licenseExpirationAlerts: true,
  });
  const [isSavingNotificationPrefs, setIsSavingNotificationPrefs] =
    useState(false);
  const { toast } = useToast();
  const brandPlanTier = normalizeBrandPlanTier(profile?.plan_tier);
  const brandSummaryTheme = brandPlanSummaryTheme(brandPlanTier);
  const brandPlanLabel = formatBrandPlanLabel(brandPlanTier);
  const brandHasStudioAddon = hasBrandStudioAccess(profile);
  const brandSubscriptionStatus = formatBrandSubscriptionStatus(profile);
  const brandStudioStatus = formatBrandStudioAddonStatus(profile);
  const brandBasePrice = brandPlanPrice(brandPlanTier);
  const brandSeatLimit = brandPlanSeatLimit(brandPlanTier);
  const brandCampaignLimit = brandPlanCampaignLimit(brandPlanTier);
  const brandCanUseCampaignCollaboration =
    brandAllowsCampaignCollaboration(profile);
  const brandHasIncludedStudio = brandIncludesStudioAccess(profile);
  const brandCanSelfServeStudioAddon = brandCanPurchaseStudioAddon(profile);
  const brandTrialEndsAt = formatBillingDate(profile?.subscription_trial_end);
  const brandCurrentPeriodEnd = formatBillingDate(
    profile?.subscription_current_period_end,
  );
  const brandStudioCurrentPeriodEnd = formatBillingDate(
    profile?.studio_addon_current_period_end,
  );
  const brandNextInvoiceDate =
    brandTrialEndsAt || brandCurrentPeriodEnd || brandStudioCurrentPeriodEnd;
  const brandRecurringAmount =
    brandPlanTier === "enterprise"
      ? null
      : (brandBasePrice || 0) +
        (brandHasStudioAddon ? BRAND_STUDIO_ADDON_PRICE : 0);
  const brandSeatLimitLabel =
    brandSeatLimit == null ? "Unlimited" : String(brandSeatLimit);
  const brandCampaignLimitLabel =
    brandCampaignLimit == null ? "Unlimited" : String(brandCampaignLimit);
  const brandCampaignSlotsUsed =
    campaignMetrics.active_projects_count +
    campaignMetrics.pending_approvals_count;
  const brandCampaignLimitReached =
    brandCampaignLimit != null && brandCampaignSlotsUsed >= brandCampaignLimit;
  const brandTeamSeatsUsed = Number.isFinite(Number(profile?.team_seats))
    ? Number(profile?.team_seats)
    : 0;
  const brandSeatLimitReached =
    brandSeatLimit != null && brandTeamSeatsUsed >= brandSeatLimit;
  const { hasPermission } = useTeamAccess("brand");
  const canApproveDeliverables = hasPermission("approve_deliverables");
  const canViewDeliverables = hasPermission("view_deliverables");
  const canManagePayOffers = hasPermission("manage_pay_offers");
  const canViewPayOffers = hasPermission("view_pay_offers");
  const canManageJobs = hasPermission("manage_jobs");
  const canViewSubscriptions = hasPermission("view_subscriptions");
  const canManageBilling = hasPermission("manage_billing");
  const canViewInbox = canViewPayOffers;

  const [inboxPackages, setInboxPackages] = useState<any[]>([]);
  const [inboxPendingCount, setInboxPendingCount] = useState(0);
  const [confirmingDonePkg, setConfirmingDonePkg] = useState<any>(null);
  const [finalizedPackageInfo, setFinalizedPackageInfo] = useState<{
    title: string;
    agencyName: string;
  } | null>(null);
  const [dismissingPkg, setDismissingPkg] = useState<any>(null);
  const [dismissingBusy, setDismissingBusy] = useState(false);
  const [confirmingDonePkgPublicData, setConfirmingDonePkgPublicData] =
    useState<any>(null);
  const [
    loadingConfirmingDonePkgPublicData,
    setLoadingConfirmingDonePkgPublicData,
  ] = useState(false);
  const [loadingInboxPackages, setLoadingInboxPackages] = useState(false);
  const [expandedInboxPackageId, setExpandedInboxPackageId] =
    useState<string>("");
  const [brandOfferItems, setBrandOfferItems] = useState<any[]>([]);
  const [loadingBrandOfferItems, setLoadingBrandOfferItems] = useState(false);

  // Memoized offer map for O(1) lookups instead of O(n) find() calls
  const offerMap = useMemo(() => {
    const map = new Map<string, any>();
    brandOfferItems.forEach((offer: any) => {
      if (offer?.id) {
        map.set(String(offer.id), offer);
      }
    });
    return map;
  }, [brandOfferItems]);

  const [selectedOfferHubId, setSelectedOfferHubId] = useState<string>("");
  const [payingOfferId, setPayingOfferId] = useState<string | null>(null);
  const [expandedCampaignHubId, setExpandedCampaignHubId] =
    useState<string>("");
  const [expandedMyOffersCampaignId, setExpandedMyOffersCampaignId] =
    useState<string>("");
  const [selectedOfferHubContracts, setSelectedOfferHubContracts] = useState<
    any[]
  >([]);
  const [contractHubRows, setContractHubRows] = useState<any[]>([]);
  const [loadingContractHubRows, setLoadingContractHubRows] = useState(false);
  const [loadingOfferHubDetails, setLoadingOfferHubDetails] = useState(false);
  const contractRefreshThrottleRef = useRef<Record<string, number>>({});
  const [selectedOfferHubDeliverables, setSelectedOfferHubDeliverables] =
    useState<any[]>([]);
  const [usageRightsTab, setUsageRightsTab] = useState("licenses");
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [creators, setCreators] = useState<any[]>([]);
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    offerId: string;
    delId: string;
    note: string;
  }>({
    open: false,
    offerId: "",
    delId: "",
    note: "",
  });
  const [previewImage, setPreviewImage] = useState<any>(null);
  const [previewItems, setPreviewItems] = useState<any[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [reviewing, setReviewing] = useState<string | null>(null);

  useEffect(() => {
    const getSession = async () => {
      if (supabase) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setAuthToken(session?.access_token || null);
      }
    };
    getSession();
  }, []);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    creator_types: [],
    races: [],
    hair_colors: [],
    hairstyles: [],
    eye_colors: [],
    facial_features: [],
    niches: [],
    age_range: [18, 65],
    height_range: [140, 210],
    weight_range: [40, 150],
    bust: "",
    waist: "",
    hips: "",
  });

  useEffect(() => {
    const sectionFromQuery = String(
      new URLSearchParams(location.search).get("section") || "",
    ).trim();
    const mappedSectionFromQuery =
      sectionFromQuery === "campaigns" ? "campaigns-hub" : sectionFromQuery;
    if (pendingSectionOverrideRef.current) {
      if (mappedSectionFromQuery === pendingSectionOverrideRef.current) {
        pendingSectionOverrideRef.current = null;
      }
      return;
    }
    if (mappedSectionFromQuery) {
      const targetSection = mappedSectionFromQuery;
      if (
        targetSection === "campaigns-hub" &&
        campaignHubTabRef.current !== "active"
      ) {
        setCampaignHubTab("active");
      }
      if (activeSectionRef.current !== targetSection) {
        setActiveSection(targetSection);
      }
      return;
    }

    const sectionFromState = (location.state as any)?.activeSection;
    if (typeof sectionFromState === "string" && sectionFromState.length > 0) {
      const targetSection =
        sectionFromState === "campaigns" ? "campaigns-hub" : sectionFromState;
      if (
        targetSection === "campaigns-hub" &&
        campaignHubTabRef.current !== "active"
      ) {
        setCampaignHubTab("active");
      }
      if (activeSectionRef.current !== targetSection) {
        setActiveSection(targetSection);
      }
    }
  }, [location.search, location.state]);

  // Handle URL parameters for opening settings and team tab
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const view = params.get("view");
    const section = params.get("section");
    const tab = params.get("tab");

    // Support both 'view=settings' and 'section=settings' for backward compatibility
    if (view === "settings" || section === "settings") {
      setActiveSection("settings");
      if (tab) {
        setActiveSettingsTab(tab);
      }
    }
  }, [location.search]);

  useEffect(() => {
    let mounted = true;
    const loadMetrics = async () => {
      try {
        setCampaignMetrics((prev) => ({ ...prev, loading: true }));
        const res = await base44.get<{
          active_projects_count?: number;
          pending_approvals_count?: number;
          action_needed?: boolean;
          avg_turnaround_hours?: number;
        }>("/api/brand/campaigns/metrics", {});
        if (!mounted) return;
        setCampaignMetrics((prev) => ({
          ...prev,
          active_projects_count: Number(res?.active_projects_count || 0),
          pending_approvals_count: Number(res?.pending_approvals_count || 0),
          action_needed: Boolean(res?.action_needed),
          avg_turnaround_hours: Number(res?.avg_turnaround_hours || 0),
          loading: false,
        }));
      } catch {
        if (!mounted) return;
        setCampaignMetrics((prev) => ({
          ...prev,
          active_projects_count: 0,
          pending_approvals_count: 0,
          action_needed: false,
          avg_turnaround_hours: 0,
          loading: false,
        }));
      }
    };

    loadMetrics();
    const onFocus = () => {
      loadMetrics();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("focus", onFocus);
    }
    const timer = setInterval(() => {
      if (mounted) {
        void loadMetrics();
      }
    }, 15000);
    return () => {
      mounted = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", onFocus);
      }
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    if (hasLoadedBrandAnalyticsRef.current) {
      return () => {
        mounted = false;
      };
    }
    const loadAnalytics = async () => {
      try {
        setBrandAnalytics((prev) => ({ ...prev, loading: true }));
        const res = await base44.get<{
          total_projects_ytd?: number;
          talent_performance?: any[];
        }>("/api/brand/analytics", {});
        if (!mounted) return;
        setBrandAnalytics({
          total_projects_ytd: Number(res?.total_projects_ytd || 0),
          talent_performance: Array.isArray(res?.talent_performance)
            ? res.talent_performance
            : [],
          loading: false,
        });
        hasLoadedBrandAnalyticsRef.current = true;
      } catch {
        if (!mounted) return;
        setBrandAnalytics({
          total_projects_ytd: 0,
          talent_performance: [],
          loading: false,
        });
        hasLoadedBrandAnalyticsRef.current = true;
      }
    };
    loadAnalytics();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (
      activeSection !== "home" &&
      activeSection !== "billing" &&
      activeSection !== "analytics" &&
      activeSection !== "usage-rights"
    )
      return;
    if (hasLoadedBillingDataRef.current) return;
    let mounted = true;

    const loadBillingData = async () => {
      hasLoadedBillingDataRef.current = true;
      setLoadingBillingData(true);
      try {
        const [statusRes, spendRes, invoicesRes, escrowRes] = await Promise.all(
          [
            getBrandBillingStatus(),
            getBrandSpendAnalytics(),
            listBrandInvoices(),
            getBrandEscrowSummary().catch(() => null),
          ],
        );
        if (!mounted) return;
        if (statusRes) {
          setBrandBillingStatus({
            plan_tier: statusRes.plan_tier || "free",
            subscription_status: statusRes.subscription_status || "inactive",
            trial_active: statusRes.trial_active || false,
            trial_ends_at: statusRes.trial_ends_at,
          });
        }
        if (spendRes) {
          setBrandSpendData({
            monthly_spend: Array.isArray(spendRes.monthly_spend)
              ? spendRes.monthly_spend
              : [],
            ytd_spend: spendRes.ytd_spend || 0,
            monthly_avg: spendRes.monthly_avg || 0,
            current_month_spend: spendRes.current_month_spend || 0,
            previous_month_spend: spendRes.previous_month_spend || 0,
            current_month_growth_percentage:
              spendRes.current_month_growth_percentage || 0,
            projected_eoy: spendRes.projected_eoy || 0,
          });
          setBillingYtdSpend(spendRes.ytd_spend || 0);
          setBillingCurrentMonthSpend(spendRes.current_month_spend || 0);
          setBillingProjectedEoy(spendRes.projected_eoy || 0);
          setBillingMonthlyAvg(spendRes.monthly_avg || 0);
        }
        if (invoicesRes) {
          setBrandInvoices(
            Array.isArray(invoicesRes.invoices) ? invoicesRes.invoices : [],
          );
        }
        if (escrowRes) {
          const entries = Object.entries(escrowRes.currencies || {});
          let breakdown: string;
          if (entries.length === 0) {
            breakdown = "$0";
          } else if (entries.length === 1) {
            const curr = entries[0][0];
            const total = Number(entries[0][1]);
            breakdown = new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: curr,
              notation: "compact",
              maximumFractionDigits: 1,
            }).format(total);
          } else {
            breakdown = entries
              .map(([curr, total]) =>
                new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: curr,
                  notation: "compact",
                  maximumFractionDigits: 1,
                }).format(Number(total)),
              )
              .join(", ");
          }
          setEscrowSummary({
            breakdown,
            projectCount: escrowRes.project_count || 0,
          });
        }
      } catch (e) {
        if (!mounted) return;
      } finally {
        if (mounted) setLoadingBillingData(false);
      }
    };

    loadBillingData();
    return () => {
      mounted = false;
    };
  }, [activeSection]);

  useEffect(() => {
    const pkgId = String(searchParams.get("package_id") || "").trim();
    if (!pkgId) return;
    setExpandedInboxPackageId(pkgId);
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;
    const loadActivityEvents = async () => {
      try {
        setLoadingActivityEvents(true);
        const res = await base44.get<{ events?: any[] }>(
          "/api/brand/activity-events",
          { params: { limit: 10 } },
        );
        if (!mounted) return;
        setActivityEvents(Array.isArray(res?.events) ? res.events : []);
      } catch {
        if (!mounted) return;
        setActivityEvents([]);
      } finally {
        if (mounted) setLoadingActivityEvents(false);
      }
    };
    loadActivityEvents();
    const timer = setInterval(() => {
      if (mounted) {
        void loadActivityEvents();
      }
    }, 30000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadBrandProfile = async () => {
      try {
        const profile = await getBrandProfile();
        if (!mounted || !profile) return;
        setBrand((prev) => ({
          ...(prev ?? {}),
          name: profile?.company_name || profile?.name || prev?.name || "Brand",
          industry: profile?.industry || prev?.industry,
          website: profile?.website || prev?.website,
          contact_email: profile?.email || prev?.contact_email,
          logo: profile?.logo_url || "",
        }));
        if (
          profile?.notification_prefs &&
          typeof profile.notification_prefs === "object"
        ) {
          const prefs = profile.notification_prefs as Record<string, boolean>;
          setNotificationPrefs({
            newProjectAlerts: prefs.newProjectAlerts ?? true,
            deliverableSubmissions: prefs.deliverableSubmissions ?? true,
            approvalReminders: prefs.approvalReminders ?? true,
            licenseExpirationAlerts: prefs.licenseExpirationAlerts ?? true,
          });
        }
      } catch {
        // Keep mock fallback on failure.
      }
    };
    loadBrandProfile();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadPackages = async () => {
      try {
        setLoadingInboxPackages(true);
        const response = await base44.get<{ packages?: any[] }>(
          "/api/brand/inbox/packages",
        );
        if (!mounted) return;
        const pkgs = Array.isArray(response?.packages) ? response.packages : [];
        setInboxPackages(pkgs);
        setInboxPendingCount(
          pkgs.filter((p: any) => String(p?.status || "") === "sent").length,
        );
      } catch (e) {
        if (!mounted) return;
        setInboxPackages([]);
        setInboxPendingCount(0);
      } finally {
        if (!mounted) return;
        setLoadingInboxPackages(false);
      }
    };
    loadPackages();
    const timer = setInterval(loadPackages, 15000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!mounted) return;
        setLoadingBrandJobs(true);
        const res = await base44.get<{ jobs?: any[] }>("/api/jobs/my");
        if (!mounted) return;
        setBrandJobs(Array.isArray(res?.jobs) ? res.jobs : []);
      } catch (e) {
        if (!mounted) return;
        setBrandJobs([]);
      } finally {
        if (!mounted) return;
        setLoadingBrandJobs(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const updateJobStatus = async (jobId: string, status: string) => {
    try {
      if (!canManageJobs) {
        toast({
          title: "View-only access",
          description: "You do not have permission to update jobs.",
          variant: "destructive",
        });
        return;
      }
      const res = await base44.put<{ job?: any }>(`/api/jobs/${jobId}`, {
        status,
      });
      const updated = res?.job;
      if (updated?.id) {
        setBrandJobs((prev) =>
          prev.map((job) => (job.id === updated.id ? updated : job)),
        );
        toast({
          title: "Job updated",
          description: `Status set to ${status}.`,
        });
      }
    } catch (e: any) {
      toast({
        title: "Failed to update job",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const startJobEdit = (jobId: string) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("jobDraftId", String(jobId));
      window.localStorage.setItem("jobEditMode", "1");
    }
    navigate(createPageUrl("PostJob"));
  };

  useEffect(() => {
    if (!authToken) return;
    let mounted = true;
    const loadInboxCount = async () => {
      try {
        const response = await base44.get<{ packages?: any[] }>(
          "/api/brand/inbox/packages",
        );
        if (!mounted) return;
        const pkgs = Array.isArray(response?.packages) ? response.packages : [];
        setInboxPendingCount(
          pkgs.filter((p: any) => String(p?.status || "") === "sent").length,
        );
      } catch {
        if (!mounted) return;
        setInboxPendingCount(0);
      }
    };
    loadInboxCount();
    const timer = setInterval(loadInboxCount, 30000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [authToken]);

  const isRefreshableDocuSealContract = (contract: any) => {
    if (!contract) return false;
    const status = String(contract?.docuseal_status || "")
      .toLowerCase()
      .trim();
    if (!status || status === "draft") return false;
    if (
      [
        "completed",
        "signed",
        "declined",
        "rejected",
        "archived",
        "voided",
      ].includes(status)
    ) {
      return false;
    }
    return Boolean(contract?.docuseal_submission_id || contract?.docuseal_slug);
  };

  const shouldAttemptDocuSealRefresh = (contract: any) => {
    if (!isRefreshableDocuSealContract(contract)) return false;

    const lastSyncedAt = Date.parse(String(contract?.last_synced_at || ""));
    if (!Number.isNaN(lastSyncedAt)) {
      // Avoid hammering DocuSeal refresh when the UI polls frequently.
      if (Date.now() - lastSyncedAt < 30_000) return false;
    }

    const contractId = String(contract?.id || "").trim();
    if (!contractId) return false;
    const lastAttempt = contractRefreshThrottleRef.current[contractId] || 0;
    if (Date.now() - lastAttempt < 15_000) return false;

    return true;
  };

  useEffect(() => {
    if (activeSection !== "campaigns-contract-hub") return;
    let mounted = true;
    (async () => {
      if (mounted) setLoadingContractHubRows(true);
      try {
        const rows = (
          await Promise.all(
            brandOfferItems.map(async (offer: any) => {
              const offerId = String(offer?.id || "");
              if (!offerId) return [];
              const contractsResp = await base44.get<{ contracts?: any[] }>(
                `/api/campaign-offers/${offerId}/contracts`,
              );
              const contracts = Array.isArray(contractsResp?.contracts)
                ? contractsResp.contracts
                : [];
              const refreshedContracts = await Promise.all(
                contracts.map(async (contract: any) => {
                  const contractId = String(contract?.id || "").trim();
                  if (!contractId) return contract;
                  if (!shouldAttemptDocuSealRefresh(contract)) return contract;
                  try {
                    contractRefreshThrottleRef.current[contractId] = Date.now();
                    const refreshed = await base44.post<{ contract?: any }>(
                      `/api/campaign-offers/${offerId}/contracts/${contractId}/refresh`,
                      {},
                    );
                    return refreshed?.contract || contract;
                  } catch {
                    return contract;
                  }
                }),
              );
              return refreshedContracts.map((c: any) => ({
                ...c,
                offer_id: offerId,
                campaign_name: String(
                  offer?.brand_campaigns?.name ||
                    offer?.offer_title ||
                    "Campaign offer",
                ),
                // Preserve creator/agency name from the offer for display
                creator_name: String(offer?.target_name || "").trim() || null,
              }));
            }),
          )
        ).flat();
        if (!mounted) return;
        setContractHubRows(rows);
      } catch {
        if (!mounted) return;
        setContractHubRows([]);
      } finally {
        if (!mounted) return;
        setLoadingContractHubRows(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [activeSection, brandOfferItems]);

  useEffect(() => {
    if (
      activeSection !== "home" &&
      activeSection !== "billing" &&
      activeSection !== "campaign-offers" &&
      activeSection !== "campaigns-contract-hub" &&
      activeSection !== "campaigns-deliverables" &&
      activeSection !== "usage"
    ) {
      return;
    }
    let mounted = true;
    const loadMyOffers = async () => {
      if (hasLoadedOffersRef.current) return;
      try {
        setLoadingBrandOfferItems(true);
        const response = await base44.get<{ offers?: any[] }>(
          "/api/campaign-offers/my",
          { params: { limit: 120 } },
        );
        if (!mounted) return;
        const offers = Array.isArray(response?.offers) ? response.offers : [];
        setBrandOfferItems(offers);
        hasLoadedOffersRef.current = true;
        setLoadingBrandOfferItems(false);

        void (async () => {
          if (!mounted) return;
          const enriched = await Promise.all(
            offers.map(async (offer: any) => {
              const offerId = String(offer?.id || "").trim();
              if (!offerId) return offer;
              try {
                const [delResp, contractsResp] = await Promise.all([
                  listOfferDeliverables(offerId),
                  base44
                    .get<{
                      contracts?: any[];
                    }>(`/api/campaign-offers/${offerId}/contracts`)
                    .catch(() => ({ contracts: [] })),
                ]);
                if (!mounted) return offer;
                const deliverables = Array.isArray(delResp?.deliverables)
                  ? delResp.deliverables
                  : [];
                const contracts = Array.isArray(contractsResp?.contracts)
                  ? contractsResp.contracts
                  : [];
                return {
                  ...offer,
                  offer_deliverables: deliverables,
                  offer_contracts: contracts,
                };
              } catch {
                return offer;
              }
            }),
          );
          if (!mounted) return;
          setBrandOfferItems(enriched);
        })();
      } catch {
        if (!mounted) return;
        setBrandOfferItems([]);
      } finally {
        if (!mounted) return;
        setLoadingBrandOfferItems(false);
      }
    };
    loadMyOffers();

    // Auto-refresh expanded offer details every 5 seconds
    const hubRefreshTimer = setInterval(() => {
      if (
        mounted &&
        selectedOfferHubId &&
        activeSection === "campaigns-contract-hub"
      ) {
        loadOfferHubDetails(selectedOfferHubId, { silent: true });
      }
    }, 5000);

    return () => {
      mounted = false;
      clearInterval(hubRefreshTimer);
    };
  }, [activeSection, selectedOfferHubId]);

  useEffect(() => {
    if (activeSection !== "licensing-requests" && activeSection !== "usage")
      return;
    let mounted = true;
    const loadBrandLicenses = async () => {
      try {
        if (mounted && brandLicensingRequests.length === 0) {
          setLoadingBrandLicensingRequests(true);
        }
        const resp = await getBrandLicensingRequests();
        console.log(
          "getBrandLicensingRequests raw response:",
          JSON.stringify(resp, null, 2),
        );
        console.log("🔍 Brand user profile:", profile);
        console.log(
          "🔍 Fetching licensing requests for brand_id:",
          profile?.id,
        );
        if (!mounted) return;
        const rows = Array.isArray(resp) ? resp : resp?.requests || [];
        setBrandLicensingRequests(Array.isArray(rows) ? rows : []);
      } catch {
        if (!mounted) return;
        setBrandLicensingRequests([]);
      } finally {
        if (!mounted) return;
        setLoadingBrandLicensingRequests(false);
      }
    };
    loadBrandLicenses();
    const refreshTimer = window.setInterval(() => {
      if (!mounted) return;
      loadBrandLicenses();
    }, 8000);
    const handleFocus = () => {
      if (!mounted) return;
      loadBrandLicenses();
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      mounted = false;
      window.clearInterval(refreshTimer);
      window.removeEventListener("focus", handleFocus);
    };
  }, [activeSection, brandLicensingRequests.length]);

  useEffect(() => {
    if (activeSection !== "billing") return;
    let mounted = true;

    const loadBillingData = async () => {
      setLoadingBillingData(true);
      try {
        const [status, spend, invoices, budgetSettings] = await Promise.all([
          getBrandBillingStatus().catch(() => null),
          getBrandSpendAnalytics().catch(() => null),
          listBrandInvoices().catch(() => null),
          getBrandBudgetSettings().catch(() => null),
        ]);
        if (!mounted) return;
        if (status) setBrandBillingStatus(status);
        if (spend?.monthly_spend) {
          setBrandSpendData({
            monthly_spend: Array.isArray(spend.monthly_spend)
              ? spend.monthly_spend
              : [],
            ytd_spend: spend.ytd_spend || 0,
            monthly_avg: spend.monthly_avg || 0,
            current_month_spend: spend.current_month_spend || 0,
            previous_month_spend: spend.previous_month_spend || 0,
            current_month_growth_percentage:
              spend.current_month_growth_percentage || 0,
            projected_eoy: spend.projected_eoy || 0,
          });
          setBillingYtdSpend(spend.ytd_spend || 0);
          setBillingCurrentMonthSpend(spend.current_month_spend || 0);
          setBillingProjectedEoy(spend.projected_eoy || 0);
          setBillingMonthlyAvg(spend.monthly_avg || 0);
        }
        if (invoices?.invoices) setBrandInvoices(invoices.invoices);
        if (budgetSettings) {
          setBudgetLimit(budgetSettings.monthly_budget_limit);
          setBudgetAlertEnabled(budgetSettings.budget_alert_enabled);
        }
      } catch {
        if (!mounted) return;
      } finally {
        if (mounted) setLoadingBillingData(false);
      }
    };

    loadBillingData();
    return () => {
      mounted = false;
    };
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== "studio") return;
    const CACHE_KEY = "studio-data-cache";
    const CACHE_TTL = 5 * 60 * 1000;
    let mounted = true;

    const loadStudioData = async (forceRefresh = false) => {
      setStudioLoading(true);
      try {
        const cachedJson = localStorage.getItem(CACHE_KEY);
        let useCache = false;

        if (cachedJson && !forceRefresh) {
          try {
            const cached = JSON.parse(cachedJson);
            if (Date.now() - cached.timestamp < CACHE_TTL) {
              useCache = true;
              if (mounted) {
                setStudioDataCache(cached);
                setStudioGenerations(cached.generations || []);
                setStudioFiles(cached.files || []);
                setStudioFolders(cached.folders || []);
                setStudioLoading(false);
              }
            }
          } catch {}
        }

        if (!useCache || forceRefresh) {
          const [generations, files, folders] = await Promise.all([
            listGenerations({ limit: 100 }).catch(() => []),
            listBrandStorageFilesPaged({ limit: 100 }).catch(() => []),
            listBrandStorageFoldersPaged().catch(() => []),
          ]);
          if (mounted) {
            const cacheData = {
              files: files || [],
              generations: generations || [],
              folders: folders || [],
              timestamp: Date.now(),
            };
            setStudioDataCache(cacheData);
            setStudioGenerations(generations || []);
            setStudioFiles(files || []);
            setStudioFolders(folders || []);
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
            if (useCache && !forceRefresh) {
              toast({
                title: "Updated from server",
                description: "Asset library refreshed with latest data.",
              });
            }
          }
        }
      } catch {
      } finally {
        if (mounted) setStudioLoading(false);
      }
    };

    loadStudioData();

    const refetchTimer = setInterval(() => {
      loadStudioData(true);
    }, 30 * 1000);

    return () => {
      mounted = false;
      clearInterval(refetchTimer);
    };
  }, [activeSection]);

  useEffect(() => {
    localStorage.setItem("studio-collections", JSON.stringify(collections));
  }, [collections]);

  useEffect(() => {
    if (activeSection !== "studio" || studioFiles.length === 0) return;
    let mounted = true;
    const loadSignedUrls = async () => {
      const urls: Record<string, string> = {};
      const now = Date.now();
      const imageFiles = studioFiles.filter((f) =>
        f.mime_type?.startsWith("image/"),
      );

      const filesToFetch = imageFiles.slice(0, 50);
      const BATCH_SIZE = 5;

      for (let i = 0; i < filesToFetch.length; i += BATCH_SIZE) {
        const batch = filesToFetch.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (file) => {
          const cached = signedUrlsCache[file.id];
          if (cached && cached.expires > now) {
            return { id: file.id, url: cached.url };
          }

          try {
            const res = await getBrandStorageFileSignedUrl(file.id);
            if (res?.signed_url) {
              return {
                id: file.id,
                url: res.signed_url,
                expires: now + 59 * 60 * 1000,
              };
            }
            return null;
          } catch {
            return null;
          }
        });

        const results = await Promise.all(batchPromises);
        const newCache: Record<string, { url: string; expires: number }> = {};

        for (const result of results) {
          if (result && result.url) {
            urls[result.id] = result.url;
            newCache[result.id] = {
              url: result.url,
              expires: result.expires || now + 59 * 60 * 1000,
            };
          }
        }

        if (mounted && Object.keys(newCache).length > 0) {
          setStudioAssetUrls((prev) => ({ ...prev, ...urls }));
          setSignedUrlsCache((prev) => ({ ...prev, ...newCache }));
        }
      }

      if (mounted) {
        setStudioAssetUrls(urls);
      }
    };
    loadSignedUrls();
    return () => {
      mounted = false;
    };
  }, [activeSection, studioFiles]);

  const studioAssets = useMemo(() => {
    const assets: Array<{
      id: string;
      file_name: string;
      url: string;
      mime_type: string;
      source_type: string;
      size_bytes: number;
      created_at: string;
      generation_id?: string;
    }> = [];

    for (const f of studioFiles) {
      const isImage = f.mime_type?.startsWith("image/");
      const isVideo = f.mime_type?.startsWith("video/");
      if (!isImage && !isVideo) continue;
      if (
        studioSourceFilter === "studio_generation" &&
        f.source_type !== "studio_generation"
      )
        continue;
      if (
        studioSearchQuery &&
        !f.file_name.toLowerCase().includes(studioSearchQuery.toLowerCase())
      )
        continue;
      assets.push({
        id: f.id,
        file_name: f.file_name,
        url: studioAssetUrls[f.id] || f.public_url || "",
        mime_type: f.mime_type || "",
        source_type: f.source_type || "upload",
        size_bytes: f.size_bytes || 0,
        created_at: f.created_at,
        generation_id: f.generation_id,
      });
    }

    for (const g of studioGenerations) {
      if (
        g.status !== "completed" ||
        !g.output_urls ||
        g.output_urls.length === 0
      )
        continue;
      for (const url of g.output_urls) {
        const isImage = url.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i);
        const isVideo = url.match(/\.(mp4|webm|mov)(\?|$)/i);
        if (!isImage && !isVideo) continue;
        const fname = url.split("/").pop()?.split("?")[0] || "asset";
        if (
          studioSearchQuery &&
          !fname.toLowerCase().includes(studioSearchQuery.toLowerCase())
        )
          continue;
        const alreadyAdded = assets.some(
          (a) => a.generation_id === g.id && a.url === url,
        );
        if (alreadyAdded) continue;

        const cachedSize = assetSizesCache[url];
        assets.push({
          id: `gen-${g.id}-${url}`,
          file_name: fname,
          url,
          mime_type: isImage ? "image/jpeg" : "video/mp4",
          source_type: "studio_generation",
          size_bytes: cachedSize || 0,
          created_at: g.created_at,
          generation_id: g.id,
        });

        if (!cachedSize) {
          fetch(url, { method: "HEAD" })
            .then((res) => {
              const size = parseInt(
                res.headers.get("content-length") || "0",
                10,
              );
              if (size > 0) {
                setAssetSizesCache((prev) => ({ ...prev, [url]: size }));
              }
            })
            .catch(() => {});
        }
      }
    }

    return assets;
  }, [
    studioFiles,
    studioGenerations,
    studioAssetUrls,
    studioSearchQuery,
    studioSourceFilter,
  ]);

  const studioStats = useMemo(() => {
    const videos = studioAssets.filter((a) => a.mime_type.startsWith("video/"));
    const images = studioAssets.filter((a) => a.mime_type.startsWith("image/"));
    const totalBytes = studioAssets.reduce(
      (sum, a) => sum + (a.size_bytes || 0),
      0,
    );
    return {
      total: studioAssets.length,
      videos: videos.length,
      images: images.length,
      totalSize: totalBytes,
    };
  }, [studioAssets]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 MB";
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return `${Math.round(bytes / 1024)} KB`;
    return `${mb.toFixed(1)} MB`;
  };

  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  };

  const selectAllAssets = () => {
    if (selectedAssetIds.size === studioAssets.length) {
      setSelectedAssetIds(new Set());
    } else {
      setSelectedAssetIds(new Set(studioAssets.map((a) => a.id)));
    }
  };

  const handleBatchDownload = async () => {
    if (selectedAssetIds.size === 0) {
      toast({
        title: "No assets selected",
        description: "Please select assets to download.",
        variant: "destructive",
      });
      return;
    }
    const selectedAssets = studioAssets.filter((a) =>
      selectedAssetIds.has(a.id),
    );
    setIsBatchDownloading(true);
    toast({
      title: "Starting download...",
      description: `Preparing to download ${selectedAssets.length} asset(s)`,
    });

    let successCount = 0;
    let failCount = 0;

    for (const asset of selectedAssets) {
      try {
        setActiveDownloads((prev) => new Set([...prev, asset.id]));
        const response = await fetch(asset.url);
        if (!response.ok) throw new Error("Download failed");
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = asset.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        successCount++;
      } catch (error) {
        failCount++;
        console.error(`Failed to download ${asset.file_name}:`, error);
      } finally {
        setActiveDownloads((prev) => {
          const next = new Set(prev);
          next.delete(asset.id);
          return next;
        });
      }
    }

    setIsBatchDownloading(false);
    if (failCount === 0) {
      toast({
        title: "Download complete",
        description: `${successCount} asset(s) downloaded successfully.`,
      });
    } else if (successCount > 0) {
      toast({
        title: "Download complete with errors",
        description: `${successCount} downloaded, ${failCount} failed.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Download failed",
        description: `Could not download any assets.`,
        variant: "destructive",
      });
    }
  };

  const handleDownloadAsset = async (asset: any) => {
    setActiveDownloads((prev) => new Set([...prev, asset.id]));
    try {
      const response = await fetch(asset.url);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = asset.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Download failed",
        description: `Could not download ${asset.file_name}`,
        variant: "destructive",
      });
    } finally {
      setActiveDownloads((prev) => {
        const next = new Set(prev);
        next.delete(asset.id);
        return next;
      });
    }
  };

  const handleCreateCollection = () => {
    if (!newCollectionName.trim()) {
      toast({
        title: "Collection name required",
        description: "Please enter a name for the collection.",
        variant: "destructive",
      });
      return;
    }
    const newCollection = {
      id: Date.now().toString(),
      name: newCollectionName.trim(),
      assetIds: Array.from(selectedAssetIds),
    };
    setCollections((prev) => [...prev, newCollection]);
    setNewCollectionName("");
    setShowCreateCollectionDialog(false);
    toast({
      title: "Collection created",
      description: `"${newCollection.name}" created with ${newCollection.assetIds.length} asset(s).`,
    });
  };

  const handleSelectCollection = (collectionId: string) => {
    if (selectedCollectionId === collectionId) {
      setSelectedCollectionId(null);
    } else {
      setSelectedCollectionId(collectionId);
    }
  };

  const getFilteredAssets = () => {
    let filtered = [...studioAssets];
    if (selectedCollectionId) {
      const collection = collections.find((c) => c.id === selectedCollectionId);
      if (collection) {
        filtered = filtered.filter((a) => collection.assetIds.includes(a.id));
      }
    }
    if (filterType === "image") {
      filtered = filtered.filter((a) => a.mime_type.startsWith("image/"));
    } else if (filterType === "video") {
      filtered = filtered.filter((a) => a.mime_type.startsWith("video/"));
    }
    if (filterDateRange !== "all") {
      const now = new Date();
      const cutoff = new Date();
      if (filterDateRange === "week") cutoff.setDate(now.getDate() - 7);
      else if (filterDateRange === "month") cutoff.setMonth(now.getMonth() - 1);
      else if (filterDateRange === "year")
        cutoff.setFullYear(now.getFullYear() - 1);
      filtered = filtered.filter((a) => new Date(a.created_at) >= cutoff);
    }
    return filtered;
  };

  const displayedAssets = getFilteredAssets();

  const handleRefreshAssets = () => {
    setStudioLoading(true);
    setIsRefreshing(true);
    const CACHE_KEY = "studio-data-cache";
    localStorage.removeItem(CACHE_KEY);
    const loadStudioData = async () => {
      try {
        const [generations, files, folders] = await Promise.all([
          listGenerations({ limit: 100 }).catch(() => []),
          listBrandStorageFilesPaged({ limit: 100 }).catch(() => []),
          listBrandStorageFoldersPaged().catch(() => []),
        ]);
        const cacheData = {
          files: files || [],
          generations: generations || [],
          folders: folders || [],
          timestamp: Date.now(),
        };
        setStudioDataCache(cacheData);
        setStudioGenerations(generations || []);
        setStudioFiles(files || []);
        setStudioFolders(folders || []);
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        setSignedUrlsCache({});
        toast({
          title: "Refreshed",
          description: "Asset library has been refreshed.",
        });
      } catch {
      } finally {
        setStudioLoading(false);
        setIsRefreshing(false);
      }
    };
    loadStudioData();
  };

  const handleDeleteAsset = async (asset: any) => {
    setAssetToDelete(asset);
    setShowDeleteDialog(true);
  };

  const confirmDeleteAsset = async () => {
    if (!assetToDelete) return;
    setShowDeleteDialog(false);

    try {
      if (
        assetToDelete.source_type === "upload" ||
        assetToDelete.generation_id === undefined
      ) {
        setStudioFiles((prev) => prev.filter((f) => f.id !== assetToDelete.id));
      } else if (assetToDelete.source_type === "studio_generation") {
        setStudioGenerations((prev) =>
          prev.filter((g) => g.id !== assetToDelete.generation_id),
        );
      }

      setCollections((prev) =>
        prev.map((c) => ({
          ...c,
          assetIds: c.assetIds.filter((id) => id !== assetToDelete.id),
        })),
      );
      setSelectedAssetIds((prev) => {
        const next = new Set(prev);
        next.delete(assetToDelete.id);
        return next;
      });

      toast({
        title: "Asset deleted",
        description: `"${assetToDelete.file_name}" has been removed.`,
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Could not delete the asset.",
        variant: "destructive",
      });
    }

    setAssetToDelete(null);
  };

  const handleDeletePackage = async (pkg: any) => {
    setPackageToDelete(pkg);
    setShowDeletePackageDialog(true);
  };

  const confirmDeletePackage = async () => {
    if (!packageToDelete) return;
    setShowDeletePackageDialog(false);
    setDeletingPackage(true);

    try {
      const offerId = String(packageToDelete?.offer_id || "");
      const packageId = String(packageToDelete?.id || "");
      await base44.post(
        `/api/campaign-offers/${encodeURIComponent(offerId)}/packages/brand-delete`,
        { package_id: packageId },
      );

      setInboxPackages((prev) => prev.filter((p) => p.id !== packageId));
      toast({
        title: "Package deleted",
        description: `"${packageToDelete.title || "Package"}" has been removed.`,
      });
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error?.message || "Could not delete the package.",
        variant: "destructive",
      });
    } finally {
      setDeletingPackage(false);
      setPackageToDelete(null);
    }
  };

  useEffect(() => {
    const fetchCreators = async () => {
      setLoading(true);
      try {
        const params: any = {};
        if (searchQuery) params.query = searchQuery;
        if (filters.creator_types.length > 0)
          params.creator_types = filters.creator_types.join(",");
        if (filters.races.length > 0) params.races = filters.races.join(",");
        if (filters.hair_colors.length > 0)
          params.hair_colors = filters.hair_colors.join(",");
        if (filters.hairstyles.length > 0)
          params.hairstyles = filters.hairstyles.join(",");
        if (filters.eye_colors.length > 0)
          params.eye_colors = filters.eye_colors.join(",");
        if (filters.facial_features.length > 0)
          params.facial_features = filters.facial_features.join(",");
        if (filters.niches.length > 0) params.niches = filters.niches.join(",");

        if (filters.age_range[0] > 18) params.age_min = filters.age_range[0];
        if (filters.age_range[1] < 65) params.age_max = filters.age_range[1];

        if (filters.height_range[0] > 140)
          params.height_min = filters.height_range[0];
        if (filters.height_range[1] < 210)
          params.height_max = filters.height_range[1];

        if (filters.weight_range[0] > 40)
          params.weight_min = filters.weight_range[0];
        if (filters.weight_range[1] < 150)
          params.weight_max = filters.weight_range[1];

        const data = await base44.get("faces/search", { params });
        if (Array.isArray(data)) {
          const mappedData = data.map((creator: any) => ({
            ...creator,
            id: creator.id || Math.random().toString(36).substr(2, 9),
            name: getDisplayName(
              creator.full_name ||
                creator.display_name ||
                creator.stage_name ||
                creator.name,
            ),
            image: creator.profile_photo_url || creator.image || null,
            location:
              creator.location ||
              (creator.city && creator.state
                ? `${creator.city}, ${creator.state}`
                : "Unknown Location"),
            tagline: creator.tagline || "Professional Creator",
            followers: creator.followers || 0,
            engagement: creator.engagement || "0%",
            price: creator.price || 0,
            turnaround: creator.turnaround || "N/A",
            tags: Array.isArray(creator.tags)
              ? creator.tags
              : Array.isArray(creator.facial_features)
                ? creator.facial_features
                : [],
            verified:
              creator.kyc_status === "approved" || creator.verified || false,
          }));
          setCreators(mappedData.filter((creator: any) => creator.verified));
        } else {
          console.error("API returned non-array data:", data);
          setCreators([]);
        }
      } catch (error) {
        console.error("Failed to fetch creators:", error);
        setCreators((prev) => (Array.isArray(prev) ? prev : []));
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchCreators, 300);
    return () => clearTimeout(debounceTimer);
  }, [filters, searchQuery]);
  const [contractData, setContractData] = useState({
    territory: "us_only",
    duration: "90",
    channels: "social_only",
    auto_renewal: "yes",
    revisions: "2",
    exclusivity: "no",
    add_disclaimer: false,
    disclaimer_text: "",
    add_restrictions: false,
    restrictions: {
      competitors: false,
      controversial: false,
      political: false,
      adult: false,
    },
    add_liability: false,
    add_special_terms: false,
    special_terms: "",
    deliverables: "",
    budget: 0,
  });

  const getDisplayName = (value: unknown) => {
    const normalized = String(value ?? "").trim();
    return normalized || "Unknown";
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
    if (parts.length === 0) return "UN";
    return parts.map((part) => part.charAt(0).toUpperCase()).join("");
  };

  const { escrowBreakdown, escrowProjects } = useMemo(() => {
    const projects: any[] = [];
    const currencies: Record<string, number> = {};
    brandOfferItems.forEach((offer: any) => {
      const escrowStatus = String(offer?.escrow_status || "").toLowerCase();
      const paymentStatus = String(offer?.payment_status || "").toLowerCase();
      if (
        (escrowStatus === "holding" || escrowStatus === "releasing") &&
        paymentStatus === "paid"
      ) {
        const budgetSnap = offer?.budget_snapshot || {};
        const rawAmount =
          budgetSnap?.budget_total ||
          budgetSnap?.total_amount ||
          budgetSnap?.amount ||
          "0";

        const normalizedAmount =
          typeof rawAmount === "string"
            ? parseFloat(rawAmount.replace(/[$,\s]/g, "")) || 0
            : Number(rawAmount) || 0;

        const currency = budgetSnap?.currency_code || "USD";
        currencies[currency] = (currencies[currency] || 0) + normalizedAmount;

        if (normalizedAmount > 0) {
          const creatorName =
            offer?.target_name ||
            offer?.creators?.full_name ||
            offer?.agencies?.agency_name ||
            (offer?.target_type === "creator" ? offer.target_id : "Unknown");
          projects.push({
            id: offer.id,
            name:
              offer?.brand_campaigns?.name || offer?.offer_title || "Campaign",
            status: escrowStatus === "holding" ? "in_progress" : "releasing",
            amount: normalizedAmount,
            creator: creatorName,
            dueDate: budgetSnap?.budget_submission_deadline || "TBD",
            currency,
          });
        }
      }
    });

    const entries = Object.entries(currencies);
    let breakdown: string;
    if (entries.length === 0) {
      breakdown = "$0";
    } else if (entries.length === 1) {
      breakdown = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: entries[0][0],
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(entries[0][1]);
    } else {
      breakdown = entries
        .map(([curr, total]) =>
          new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: curr,
            notation: "compact",
            maximumFractionDigits: 1,
          }).format(total),
        )
        .join(", ");
    }

    return { escrowBreakdown: breakdown, escrowProjects: projects };
  }, [brandOfferItems]);

  const homeCurrentMonthSpendLabel = loadingBillingData
    ? "..."
    : (brandSpendData?.current_month_spend || 0) > 0
      ? `$${((brandSpendData?.current_month_spend || 0) / 100000).toFixed(1)}K`
      : "$0";
  const homeSpendGrowth = brandSpendData?.current_month_growth_percentage || 0;
  const homeSpendGrowthLabel =
    loadingBillingData || !brandSpendData
      ? ""
      : brandSpendData.previous_month_spend > 0
        ? t("dashboard.home.stats.spendVsLastMonth", {
            value: `${homeSpendGrowth >= 0 ? "+" : ""}${homeSpendGrowth.toFixed(1)}%`,
          })
        : brandSpendData.current_month_spend > 0
          ? t("dashboard.home.stats.newSpendThisMonth")
          : t("dashboard.home.stats.noSpendRecorded");
  const homeSpendGrowthClass =
    !brandSpendData || loadingBillingData
      ? "text-gray-500"
      : homeSpendGrowth > 0
        ? "text-green-600"
        : homeSpendGrowth < 0
          ? "text-amber-600"
          : "text-gray-500";

  const recentProjects = useMemo(() => {
    const parseDate = (value?: string | null) => {
      if (!value) return null;
      const date = new Date(String(value));
      return Number.isNaN(date.getTime()) ? null : date;
    };
    const extractLatest = (dates: Array<Date | null>) =>
      dates.reduce<Date | null>((latest, current) => {
        if (!current) return latest;
        if (!latest || current.getTime() > latest.getTime()) return current;
        return latest;
      }, null);

    const grouped = new Map<string, any>();

    brandOfferItems.forEach((offer: any) => {
      const offerId = String(offer?.id || "");
      if (!offerId) return;
      const campaignId = String(
        offer?.brand_campaign_id || offer?.brand_campaigns?.id || "",
      ).trim();
      const key = campaignId || offerId;
      const campaignMeta =
        offer?.brand_campaigns && typeof offer.brand_campaigns === "object"
          ? offer.brand_campaigns
          : {};
      const startDateRaw = String(campaignMeta?.start_date || "").trim();
      const startDate = /^\d{4}-\d{2}-\d{2}$/.test(startDateRaw)
        ? new Date(`${startDateRaw}T00:00:00`)
        : null;
      const durationDaysRaw = Number(campaignMeta?.duration_days || 0);
      const durationDays =
        Number.isFinite(durationDaysRaw) && durationDaysRaw > 0
          ? durationDaysRaw
          : 30;
      const endDate = startDate
        ? new Date(
            startDate.getTime() + (durationDays - 1) * 24 * 60 * 60 * 1000,
          )
        : null;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const isAfterEnd = Boolean(
        endDate && today.getTime() > endDate.getTime(),
      );
      const contractStatuses = Array.isArray(offer?.offer_contracts)
        ? offer.offer_contracts
        : [];
      const hasCompletedContract = contractStatuses.some((contract: any) => {
        const st = String(
          contract?.docuseal_status || contract?.status || "",
        ).toLowerCase();
        return st === "completed" || st === "signed";
      });
      const isFullySigned =
        Boolean(offer?.is_fully_signed) || hasCompletedContract;
      const completedAt =
        campaignMeta?.completed_at || offer?.completed_at || null;
      const campaignStatus = String(campaignMeta?.status || "").toLowerCase();
      const offerStatus = isAfterEnd
        ? "completed"
        : isFullySigned
          ? "in_progress"
          : "pending_approval";
      const deliverables = Array.isArray(offer?.offer_deliverables)
        ? offer.offer_deliverables
        : [];
      const deliverableDates = deliverables.flatMap((deliverable: any) => {
        const commentDates = Array.isArray(deliverable?.meta?.feedback_comments)
          ? deliverable.meta.feedback_comments.map((comment: any) =>
              parseDate(comment?.created_at),
            )
          : [];
        return [
          parseDate(deliverable?.created_at),
          parseDate(deliverable?.updated_at),
          parseDate(deliverable?.submitted_at),
          ...commentDates,
        ];
      });
      const contractDates = contractStatuses.map((contract: any) =>
        parseDate(contract?.updated_at || contract?.created_at),
      );
      const activityDates = [
        parseDate(offer?.updated_at),
        parseDate(offer?.created_at),
        parseDate(campaignMeta?.updated_at),
        parseDate(campaignMeta?.created_at),
        parseDate(completedAt),
        ...deliverableDates,
        ...contractDates,
      ];
      const lastActivity = extractLatest(activityDates);
      const creatorName =
        String(offer?.target_name || "").trim() ||
        (offer?.target_type === "agency"
          ? "Agency"
          : offer?.target_type === "creator"
            ? "Creator"
            : "Collaborator");
      const campaignName =
        String(campaignMeta?.name || "").trim() ||
        String(offer?.offer_title || "").trim() ||
        "Campaign";
      const dueDate = endDate || startDate || now;
      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, {
          id: key,
          offer_id: offerId,
          name: campaignName,
          creator_name: creatorName,
          due_date: dueDate,
          status: offerStatus,
          completed_at: completedAt,
          last_activity_at: lastActivity || now,
        });
        return;
      }
      const latestActivity = extractLatest([
        existing.last_activity_at,
        lastActivity,
      ]);
      existing.last_activity_at = latestActivity || existing.last_activity_at;
      existing.due_date =
        dueDate && dueDate.getTime() > existing.due_date.getTime()
          ? dueDate
          : existing.due_date;
      if (offerStatus === "completed") {
        existing.status = "completed";
      } else if (
        offerStatus === "in_progress" &&
        existing.status !== "completed"
      ) {
        existing.status = "in_progress";
      } else if (
        offerStatus === "pending_approval" &&
        existing.status === "pending_approval"
      ) {
        existing.status = "pending_approval";
      }
      if (!existing.completed_at && completedAt) {
        existing.completed_at = completedAt;
      }
    });

    return Array.from(grouped.values())
      .sort(
        (a, b) => b.last_activity_at.getTime() - a.last_activity_at.getTime(),
      )
      .slice(0, 6);
  }, [brandOfferItems]);

  const contractHubPendingCount = useMemo(() => {
    const offers = Array.isArray(brandOfferItems) ? brandOfferItems : [];
    return offers.filter((offer: any) => {
      const st = String(offer?.status || "").toLowerCase();
      return st === "contract_sent" || st === "contract_partially_signed";
    }).length;
  }, [brandOfferItems]);

  const pendingApprovalCount = 0; // Now calculated from real campaign data

  const navigationItems = [
    {
      id: "home",
      label: t("dashboard.navigation.dashboard"),
      icon: LayoutDashboard,
    },
    {
      id: "marketplace",
      label: t("dashboard.navigation.findCreators"),
      icon: Search,
    },
    {
      id: "marketplace-agencies",
      label: t("dashboard.navigation.findAgencies"),
      icon: Building2,
    },
    {
      id: "campaigns",
      label: t("dashboard.navigation.myCampaigns"),
      icon: Target,
    },
    {
      id: "licensing-requests",
      label: t("dashboard.navigation.licensingRequests"),
      icon: FileText,
    },
    {
      id: "analytics",
      label: t("dashboard.navigation.analytics"),
      icon: BarChart3,
    },
    {
      id: "usage",
      label: t("dashboard.navigation.usageRights"),
      icon: FileText,
      badge: (() => {
        const today = new Date();
        const in15 = new Date(today);
        in15.setDate(in15.getDate() + 15);
        const count = (
          Array.isArray(brandLicensingRequests) ? brandLicensingRequests : []
        )
          .filter(
            (r: any) => String(r?.status || "").toLowerCase() === "approved",
          )
          .filter((r: any) => {
            const end = r?.license_end_date
              ? new Date(r.license_end_date)
              : null;
            return end && end >= today && end <= in15;
          }).length;
        return count > 0 ? count : undefined;
      })(),
    },
    ...(canViewSubscriptions
      ? [
          {
            id: "billing",
            label: t("dashboard.navigation.billing"),
            icon: CreditCard,
          },
        ]
      : []),
    {
      id: "settings",
      label: t("dashboard.navigation.settings"),
      icon: Settings,
    },
  ];

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadingLogo(true);
      setTimeout(() => {
        setBrand({ ...brand, logo: URL.createObjectURL(file) });
        setUploadingLogo(false);
        toast({ title: "Success", description: "Logo uploaded! (Demo mode)" });
      }, 1000);
    }
  };

  const handleSaveProfile = () => {
    toast({ title: "Success", description: "Profile updated! (Demo mode)" });
  };

  const handleToggleNotificationPref = async (
    prefId: string,
    value: boolean,
  ) => {
    const newPrefs = { ...notificationPrefs, [prefId]: value };
    setNotificationPrefs(newPrefs);
    setIsSavingNotificationPrefs(true);
    try {
      await base44.post("/api/brand-profile", { notification_prefs: newPrefs });
      toast({
        title: "Preference saved",
        description: "Your notification setting has been updated.",
      });
    } catch (e: any) {
      toast({
        title: "Failed to save preference",
        description: e?.message || "Please try again.",
        variant: "destructive" as any,
      });
      setNotificationPrefs(notificationPrefs);
    } finally {
      setIsSavingNotificationPrefs(false);
    }
  };

  const handleShareBrief = (campaignId) => {
    // Campaign sharing is now handled through real API data
    toast({
      title: "Success",
      description:
        "Brief shared with talent! They will receive an email with campaign details and contract.",
    });
  };

  const handleCreatorHire = (creator) => {
    setSelectedCreator(creator);
    setShowHireModal(true);
  };

  const getBrandTalentEntitlementMessage = (error: unknown) => {
    const message = String((error as any)?.message || error || "").trim();
    if (message.includes("brand_talent_browsing_requires_pro_plan")) {
      return "Talent browsing, licensing, and creator outreach start on the Pro plan.";
    }
    return message || "Please try again.";
  };

  const handleOpenLicenseRequest = (
    creator: MarketplaceProfile | null,
    details?: MarketplaceProfileDetails,
  ) => {
    if (!creator) return;
    if (!brandCanUseCampaignCollaboration) {
      toast({
        title: "Upgrade to Pro",
        description:
          "Talent browsing, licensing, and creator outreach start on the Pro plan.",
      });
      navigate("/brandpricing");
      return;
    }
    const detailProfile = details?.profile || null;
    const representedAgency = details?.represented_agency || null;
    const agencyId = String(
      creator.agency_id || details?.agency_id || detailProfile?.agency_id || "",
    ).trim();
    const isLicensable = Boolean(
      agencyId &&
      (details?.is_licensable === true ||
        detailProfile?.is_licensable === true ||
        creator.is_licensable === undefined ||
        creator.is_licensable),
    );
    if (!isLicensable) {
      toast({
        title: "Licensing unavailable",
        description:
          "This creator is not currently represented by an agency, so the request cannot be sent.",
        variant: "destructive",
      });
      return;
    }
    setSelectedLicenseCreator({
      ...creator,
      agency_id: agencyId,
      is_licensable: isLicensable,
      agency_name:
        representedAgency?.name ||
        detailProfile?.agency_name ||
        creator.agency_name,
      agency_logo_url:
        representedAgency?.logo_url ||
        detailProfile?.agency_logo_url ||
        creator.agency_logo_url,
    });
    setLicenseRequestForm((prev) => ({
      ...prev,
      start_date: new Date().toISOString().slice(0, 10),
      license_fee: "",
      modifications_allowed: "",
      exclusivity: "",
      duration_days: prev.duration_days || "30",
      territory: prev.territory || "Global",
      custom_terms: "",
    }));
    setShowLicenseRequestModal(true);
  };

  const parseLicensingNotes = (raw: any) => {
    const text = String(raw || "").trim();
    if (!text) return {};
    try {
      const parsed = JSON.parse(text);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  };

  const formatLicenseStatus = (value: string) => {
    const normalized = String(value || "pending").toLowerCase();
    if (normalized === "approved")
      return t("campaigns.licensingRequests.status.approved");
    if (normalized === "declined" || normalized === "rejected")
      return t("campaigns.licensingRequests.status.declined");
    if (normalized === "archived") return t("statuses.archived");
    if (normalized === "negotiating")
      return t("campaigns.licensingRequests.status.negotiating");
    return t("campaigns.licensingRequests.status.pending");
  };

  const handleContractOption = (option) => {
    if (option === "self") {
      setShowHireModal(false);
      setShowContractBuilder(true);
      setContractStep(1);
      setContractData({
        ...contractData,
        deliverables: "3 Instagram Reels (15-30 seconds each), 1 Hero Image",
        budget: selectedCreator.price,
      });
    } else if (option === "agency") {
      toast({
        title: "Coming Soon",
        description: "Agency invitation flow coming soon! (Demo mode)",
      });
      setShowHireModal(false);
    } else if (option === "browse") {
      toast({
        title: "Coming Soon",
        description: "Browse agencies feature coming soon! (Demo mode)",
      });
      setShowHireModal(false);
    }
  };

  const handleSubmitLicenseRequest = async () => {
    if (!selectedLicenseCreator) return;
    const duration = Number(licenseRequestForm.duration_days || 0);
    const fee = Number(licenseRequestForm.license_fee || 0);
    setCreatingLicenseRequest(true);
    try {
      const agencyId = String(selectedLicenseCreator.agency_id || "").trim();
      if (!agencyId) {
        throw new Error(
          "This creator is not currently represented by an active agency.",
        );
      }

      await createAgencyBrandLicensingRequest({
        creator_id: selectedLicenseCreator.id,
        agency_id: agencyId,
        campaign_title: `${selectedLicenseCreator.display_name || selectedLicenseCreator.full_name || "Licensing Request"}`,
        usage_scope: licenseRequestForm.territory,
        territory: licenseRequestForm.territory,
        duration_days:
          Number.isFinite(duration) && duration > 0 ? duration : 30,
        start_date: licenseRequestForm.start_date,
        license_fee: Number.isFinite(fee) ? fee : undefined,
        category: licenseRequestForm.category || undefined,
        description: licenseRequestForm.description,
        exclusivity: licenseRequestForm.exclusivity,
        custom_terms: licenseRequestForm.custom_terms,
        modifications_allowed: licenseRequestForm.modifications_allowed,
      });

      toast({
        title: "Licensing request created",
        description: "Your request has been sent to the agency.",
      });
      setShowLicenseRequestModal(false);
      setActiveSection("licensing-requests");
    } catch (e: any) {
      toast({
        title: "Failed to create request",
        description: getBrandTalentEntitlementMessage(e),
        variant: "destructive",
      });
    } finally {
      setCreatingLicenseRequest(false);
    }
  };

  const handleContractSubmit = () => {
    toast({
      title: "Success",
      description: `Contract created and sent to ${selectedCreator.name}! (Demo mode)\n\nCreator will receive:\n- Full project brief\n- Contract terms\n- Payment details\n\nThey have 48 hours to accept.`,
    });
    setShowContractBuilder(false);
    setContractStep(1);
    setSelectedCreator(null);
  };

  const handleUpdateRequestOption = (option) => {
    if (option === "self") {
      setShowUpdateRequestModal(false);
      toast({
        title: "Coming Soon",
        description:
          "Contract update form coming soon! (Demo mode)\nYou'll be able to modify terms, pricing, and deliverables.",
      });
    } else if (option === "agency") {
      setShowUpdateRequestModal(false);
      toast({
        title: "Success",
        description:
          "Contract update request sent to partner agency! (Demo mode)\nThey'll review and make the necessary changes.",
      });
    }
    setUpdateRequestType(null);
  };

  const calculateCreatorEarnings = () => {
    const total = contractData.budget;
    const fee = total * 0.1;
    const creatorGets = total - fee;
    return { total, fee, creatorGets };
  };

  const handleViewProfile = (creator) => {
    setSelectedCreator(creator);
    setShowCreatorProfile(true);
  };

  const toggleFilter = (category, value) => {
    setFilters((prev) => {
      const currentArray = prev[category] || [];
      const newArray = currentArray.includes(value)
        ? currentArray.filter((v) => v !== value)
        : [...currentArray, value];
      return { ...prev, [category]: newArray };
    });
  };

  const getFilteredCreators = () => {
    return creators;
  };

  const getActiveFilterCount = () => {
    let count =
      filters.creator_types.length +
      filters.races.length +
      filters.hair_colors.length +
      filters.hairstyles.length +
      filters.eye_colors.length +
      filters.facial_features.length +
      filters.niches.length;

    if (filters.age_range[0] !== 18 || filters.age_range[1] !== 65) count++;
    if (filters.height_range[0] !== 140 || filters.height_range[1] !== 210)
      count++;
    if (filters.weight_range[0] !== 40 || filters.weight_range[1] !== 150)
      count++;

    return count;
  };

  const renderEscrowDetails = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => setShowEscrowDetails(false)}
          className="border-2 border-gray-300 hover:bg-gray-100 transition-colors"
        >
          {t("dashboard.escrow.backToDashboard")}
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
            {t("dashboard.escrow.title")}
          </h1>
          <p className="text-gray-600">{t("dashboard.escrow.subtitle")}</p>
        </div>
      </div>

      {/* Escrow Summary Panel */}
      <Card className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <DollarSign className="w-32 h-32 text-blue-900" />
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <h3 className="text-lg font-semibold text-blue-900 uppercase tracking-wider mb-1">
              {t("dashboard.escrow.activeEscrow")}
            </h3>
            <p className="text-6xl font-black text-blue-600">
              {escrowBreakdown}
            </p>
            <p className="text-blue-800 mt-2 font-medium">
              {t("dashboard.escrow.protecting")} {escrowProjects.length}{" "}
              {t(
                escrowProjects.length === 1
                  ? "dashboard.escrow.project"
                  : "dashboard.escrow.projects",
              )}
            </p>
          </div>
          <Alert className="bg-white/80 backdrop-blur-sm border border-blue-200 max-w-md shadow-sm">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <AlertDescription className="text-blue-900 leading-relaxed">
              <strong>{t("dashboard.escrow.guaranteedPayment")}</strong>{" "}
              {t("dashboard.escrow.guaranteedPaymentDesc")}
            </AlertDescription>
          </Alert>
        </div>
      </Card>

      {/* Actionable Project List */}
      <Card className="p-0 bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-xl font-bold text-gray-900">
            {t("dashboard.escrow.inventory")}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left bg-gray-50/30">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Campaign / Project
                  {t("dashboard.escrow.table.campaignProject")}
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {t("dashboard.escrow.table.partner")}
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">
                  {t("dashboard.escrow.table.heldAmount")}
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {t("dashboard.escrow.table.status")}
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">
                  {t("dashboard.escrow.table.estRelease")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {escrowProjects.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-gray-500 italic"
                  >
                    {t("dashboard.escrow.table.noRecords")}
                  </td>
                </tr>
              ) : (
                escrowProjects.map((project) => (
                  <tr
                    key={project.id}
                    className="hover:bg-blue-50/30 transition-colors group"
                  >
                    <td className="px-6 py-5">
                      <p className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                        {project.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        ID: {project.id}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 overflow-hidden">
                          {project.creatorAvatars &&
                          project.creatorAvatars.length > 0 ? (
                            <img
                              src={project.creatorAvatars[0]}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {project.creator === "Unknown"
                            ? t("dashboard.escrow.table.collaborator")
                            : project.creator}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right font-mono font-bold text-gray-900">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: project.currency || "USD",
                      }).format(project.amount)}
                    </td>
                    <td className="px-6 py-5">
                      <div
                        className="relative group"
                        title={
                          project.status === "releasing"
                            ? "Funds are being transferred to the creator. This may take 1-3 business days to complete."
                            : "Funds are securely held in escrow until deliverables are approved."
                        }
                      >
                        <Badge
                          className={
                            project.status === "releasing"
                              ? "bg-amber-100 text-amber-700 border-amber-200"
                              : "bg-emerald-100 text-emerald-700 border-emerald-200"
                          }
                        >
                          {project.status === "releasing"
                            ? t("dashboard.escrow.table.processStarted")
                            : t("dashboard.escrow.table.protected")}
                        </Badge>
                        {project.status === "releasing" && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                            Funds are being transferred to the creator. This may
                            take 1-3 business days to complete.
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className="text-sm text-gray-600">
                        {project.dueDate || "N/A"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderHome = () => {
    if (showEscrowDetails) {
      return renderEscrowDetails();
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            {t("dashboard.home.welcomeBack")}
            {brand?.name ? `, ${brand.name}` : ""}
          </h1>
          <p className="text-gray-600">{t("dashboard.home.workspaceReady")}</p>
        </div>

        {/* Top Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">
                {t("dashboard.home.stats.activeProjects")}
              </p>
              <Target className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
              {campaignMetrics.active_projects_count}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {campaignMetrics.pending_approvals_count}{" "}
              {t("dashboard.home.stats.awaitingApproval")}
            </p>
          </Card>

          <Card
            className="p-6 bg-white border border-gray-200 cursor-pointer hover:shadow-lg transition-all hover:border-blue-300"
            onClick={() => setShowEscrowDetails(true)}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">
                {t("dashboard.home.stats.inEscrow")}
              </p>
              <DollarSign className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
              {loadingBillingData ? "..." : escrowSummary.breakdown}
            </p>
            <p className="text-sm text-blue-600 mt-1 font-medium">
              {t("dashboard.home.stats.clickForDetails")}
            </p>
          </Card>

          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">
                {t("dashboard.home.stats.pendingApprovals")}
              </p>
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            </div>
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
              {campaignMetrics.pending_approvals_count}
            </p>
            {campaignMetrics.pending_approvals_count > 0 && (
              <Badge className="mt-1 bg-yellow-100 text-yellow-700 border border-yellow-300">
                {t("dashboard.home.stats.actionNeeded")}
              </Badge>
            )}
          </Card>

          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">
                {t("dashboard.home.stats.thisMonthSpend")}
              </p>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
              {homeCurrentMonthSpendLabel}
            </p>
            <p className={`text-sm mt-1 ${homeSpendGrowthClass}`}>
              {homeSpendGrowthLabel}
            </p>
          </Card>

          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">
                {t("dashboard.home.stats.avgTurnaround")}
              </p>
              <Clock className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
              {campaignMetrics.avg_turnaround_hours > 0
                ? `${campaignMetrics.avg_turnaround_hours}h`
                : "—"}
            </p>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="p-6 bg-white border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {t("dashboard.home.quickActions.title")}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
            <Button
              onClick={() => {
                goToCampaignsSection();
              }}
              className="h-20 sm:h-24 bg-[#F7B750] hover:bg-[#E6A640] text-white border-2 border-gray-300 flex-col gap-2"
            >
              <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="font-semibold text-xs sm:text-sm">
                {t("dashboard.home.quickActions.startNewProject")}
              </span>
            </Button>
            <Button
              onClick={() => navigateToSection("marketplace")}
              className="h-20 sm:h-24 bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300 flex-col gap-2"
            >
              <Search className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-xs sm:text-sm">
                {t("dashboard.home.quickActions.browseCreators")}
              </span>
            </Button>
            <Button
              onClick={() => {
                goToCampaignsSection();
              }}
              className="h-20 sm:h-24 bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300 flex-col gap-2"
            >
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-xs sm:text-sm">
                {t("dashboard.home.quickActions.viewActiveCampaigns")}
              </span>
            </Button>
            <Button
              onClick={handleAgencyCollaborationEntry}
              className="h-20 sm:h-24 bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300 flex-col gap-2"
            >
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-xs sm:text-sm">
                {t("dashboard.home.quickActions.inviteAgency")}
              </span>
            </Button>
            <Button
              onClick={() => navigateToSection("marketplace-agencies")}
              className="h-20 sm:h-24 bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300 flex-col gap-2"
            >
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-xs sm:text-sm">
                {t("dashboard.home.quickActions.browseAgencies")}
              </span>
            </Button>
          </div>
        </Card>

        {/* Recent Projects & Activity Feed */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {t("dashboard.home.recentProjects.title")}
            </h3>
            <div className="space-y-3">
              {loadingBrandOfferItems && (
                <Card className="p-4 bg-gray-50 border border-gray-200">
                  <p className="text-sm text-gray-600">
                    {t("dashboard.home.recentProjects.loading")}
                  </p>
                </Card>
              )}
              {!loadingBrandOfferItems &&
                recentProjects.map((campaign: any) => (
                  <Card
                    key={campaign.id}
                    className="p-4 bg-gray-50 border border-gray-200 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 mb-1">
                          {campaign.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {campaign.creator_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            campaign.status === "in_progress"
                              ? "bg-blue-100 text-blue-700 border border-blue-300"
                              : campaign.status === "pending_approval"
                                ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                                : campaign.status === "completed"
                                  ? "bg-gray-100 text-gray-700 border border-gray-300"
                                  : "bg-gray-100 text-gray-700 border border-gray-300"
                          }
                        >
                          {campaign.status === "in_progress"
                            ? t("campaigns.contractHub.status.pending")
                            : campaign.status === "pending_approval"
                              ? t("campaigns.myOffers.tabs.pendingApproval")
                              : campaign.status === "completed"
                                ? t("campaigns.contractHub.status.completed")
                                : String(campaign.status).replace(/_/g, " ")}
                        </Badge>
                        {campaign.completed_at && (
                          <Badge className="bg-green-100 text-green-700 border border-green-300">
                            {t("dashboard.home.recentProjects.done")}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        {t("dashboard.home.recentProjects.due")}:{" "}
                        {campaign.due_date.toLocaleDateString()}
                      </span>
                      <Button
                        variant="link"
                        className="text-[#F7B750] p-0 h-auto"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (campaign.offer_id) {
                            setSelectedCampaign(campaign.offer_id);
                          }
                          navigateToSection("campaign-offers", {
                            campaignView:
                              campaign.status === "pending_approval"
                                ? "pending"
                                : campaign.status === "completed"
                                  ? "completed"
                                  : "active",
                          });
                        }}
                      >
                        {t("dashboard.home.recentProjects.viewProject")}
                      </Button>
                    </div>
                  </Card>
                ))}
              {!loadingBrandOfferItems && recentProjects.length === 0 && (
                <Card className="p-4 bg-gray-50 border border-gray-200">
                  <p className="text-sm text-gray-600">
                    {t("dashboard.home.recentProjects.noProjects")}
                  </p>
                </Card>
              )}
            </div>
          </Card>

          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {t("dashboard.home.activityFeed.title")}
            </h3>
            <div className="space-y-3">
              {loadingActivityEvents && (
                <div className="p-3 rounded-lg border bg-gray-50 border-gray-200">
                  <p className="text-sm text-gray-600">
                    {t("dashboard.home.activityFeed.loading")}
                  </p>
                </div>
              )}
              {!loadingActivityEvents && activityEvents.length === 0 && (
                <div className="p-3 rounded-lg border bg-gray-50 border-gray-200">
                  <p className="text-sm text-gray-600">
                    {t("dashboard.home.activityFeed.noActivity")}
                  </p>
                </div>
              )}
              {!loadingActivityEvents &&
                activityEvents.map((event: any) => {
                  const eventType = String(
                    event?.event_type || "",
                  ).toLowerCase();
                  const isAttention = [
                    "deliverable.submitted",
                    "deliverable.changes_requested",
                    "deliverable.comment",
                  ].includes(eventType);
                  const actor = String(event?.actor_name || "").trim();
                  const actorTypeRaw = String(
                    event?.actor_type || "",
                  ).toLowerCase();
                  const actorLabel =
                    actor ||
                    (actorTypeRaw === "agency"
                      ? t("dashboard.home.activityFeed.agency")
                      : actorTypeRaw === "creator"
                        ? t("dashboard.home.activityFeed.creator")
                        : actorTypeRaw === "brand"
                          ? t("dashboard.home.activityFeed.you")
                          : t("dashboard.home.activityFeed.someone"));
                  const description = String(event?.description || "");
                  const createdAt = formatRelativeTime(event?.created_at);
                  const fallbackActionMap: Record<string, string> = {
                    "campaign.created": t(
                      "dashboard.home.activityFeed.actions.campaignCreated",
                    ),
                    "campaign.completed": t(
                      "dashboard.home.activityFeed.actions.campaignCompleted",
                    ),
                    "offer.sent": t(
                      "dashboard.home.activityFeed.actions.offerSent",
                    ),
                    "deliverable.submitted": t(
                      "dashboard.home.activityFeed.actions.deliverableSubmitted",
                    ),
                    "deliverable.changes_requested": t(
                      "dashboard.home.activityFeed.actions.deliverableChangesRequested",
                    ),
                    "deliverable.approved": t(
                      "dashboard.home.activityFeed.actions.deliverableApproved",
                    ),
                    "deliverable.comment": t(
                      "dashboard.home.activityFeed.actions.deliverableComment",
                    ),
                    "job.created": t(
                      "dashboard.home.activityFeed.actions.jobCreated",
                    ),
                    "job.invite.sent": t(
                      "dashboard.home.activityFeed.actions.jobInviteSent",
                    ),
                    "job.invite.accepted": t(
                      "dashboard.home.activityFeed.actions.jobInviteAccepted",
                    ),
                    "job.invite.declined": t(
                      "dashboard.home.activityFeed.actions.jobInviteDeclined",
                    ),
                    "job.application.submitted": t(
                      "dashboard.home.activityFeed.actions.jobApplicationSubmitted",
                    ),
                    "connection.request.sent": t(
                      "dashboard.home.activityFeed.actions.connectionRequestSent",
                    ),
                    "connection.request.accepted": t(
                      "dashboard.home.activityFeed.actions.connectionRequestAccepted",
                    ),
                    "connection.request.declined": t(
                      "dashboard.home.activityFeed.actions.connectionRequestDeclined",
                    ),
                  };
                  const fallbackAction =
                    fallbackActionMap[eventType] ||
                    (eventType
                      ? eventType.replace(/_/g, " ").replace(/\./g, " ")
                      : t(
                          "dashboard.home.activityFeed.actions.performedAction",
                        ));
                  const normalizeActivityActor = (value: string) => {
                    const normalized = String(value || "")
                      .trim()
                      .toLowerCase();
                    return normalized === "you"
                      ? t("dashboard.home.activityFeed.you")
                      : value;
                  };
                  const fallbackDescription = `${normalizeActivityActor(actorLabel)} ${fallbackAction}.`;
                  let message = description || fallbackDescription;
                  const descriptionPatterns: Array<
                    [RegExp, (match: RegExpMatchArray) => string]
                  > = [
                    [
                      /^(.+?) created (.+)\.$/i,
                      (match) =>
                        t(
                          "dashboard.home.activityFeed.templates.campaignCreated",
                          {
                            actor: normalizeActivityActor(match[1]),
                            campaign: match[2],
                          },
                        ),
                    ],
                    [
                      /^(.+?) marked (.+?) as done\.$/i,
                      (match) =>
                        t(
                          "dashboard.home.activityFeed.templates.campaignCompleted",
                          {
                            actor: normalizeActivityActor(match[1]),
                            campaign: match[2],
                          },
                        ),
                    ],
                    [
                      /^(.+?) created a job: (.+)\.$/i,
                      (match) =>
                        t("dashboard.home.activityFeed.templates.jobCreated", {
                          actor: normalizeActivityActor(match[1]),
                          job: match[2],
                        }),
                    ],
                    [
                      /^(.+?) invited (.+?) to apply for job (.+)\.$/i,
                      (match) =>
                        t(
                          "dashboard.home.activityFeed.templates.jobInviteSent",
                          {
                            actor: normalizeActivityActor(match[1]),
                            target: match[2],
                            job: match[3],
                          },
                        ),
                    ],
                    [
                      /^(.+?) accepted the job invite for (.+)\.$/i,
                      (match) =>
                        t(
                          "dashboard.home.activityFeed.templates.jobInviteAccepted",
                          {
                            actor: normalizeActivityActor(match[1]),
                            job: match[2],
                          },
                        ),
                    ],
                    [
                      /^(.+?) declined the job invite for (.+)\.$/i,
                      (match) =>
                        t(
                          "dashboard.home.activityFeed.templates.jobInviteDeclined",
                          {
                            actor: normalizeActivityActor(match[1]),
                            job: match[2],
                          },
                        ),
                    ],
                  ];
                  for (const [pattern, formatter] of descriptionPatterns) {
                    const match = description.match(pattern);
                    if (match) {
                      message = formatter(match);
                      break;
                    }
                  }
                  if (actorTypeRaw === "brand" && message) {
                    const localizedYou = t("dashboard.home.activityFeed.you");
                    if (actor && message.startsWith(actor)) {
                      message = `${localizedYou}${message.slice(actor.length)}`;
                    } else if (message.startsWith("Brand")) {
                      message = `${localizedYou}${message.slice("Brand".length)}`;
                    }
                  }
                  return (
                    <div
                      key={String(event?.id || Math.random())}
                      className={`p-3 rounded-lg border ${
                        isAttention
                          ? "bg-yellow-50 border-yellow-300"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-2 h-2 rounded-full mt-2 ${
                            isAttention ? "bg-yellow-500" : "bg-gray-400"
                          }`}
                        />
                        <div className="flex-1">
                          <p className="text-sm text-gray-900 font-medium">
                            {message}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {createdAt}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </Card>
        </div>

        {/* Spend Chart */}
        <Card className="p-6 bg-white border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-6">
            {t("dashboard.home.monthlySpendTrend")}
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart
              data={
                brandSpendData?.monthly_spend &&
                brandSpendData.monthly_spend.length > 0
                  ? brandSpendData.monthly_spend.map((d) => ({
                      month: d.month,
                      spend: d.spend / 100,
                    }))
                  : []
              }
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => [
                  `$${Number(value || 0).toLocaleString()}`,
                  t("campaigns.analytics.totalSpend"),
                ]}
              />
              <Line
                type="monotone"
                dataKey="spend"
                stroke="#F7B750"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    );
  };

  const renderCreatorProfile = () => {
    if (!selectedCreator) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setShowCreatorProfile(false)}
            className="border-2 border-gray-300"
          >
            ← Back to Marketplace
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              {selectedCreator.name}'s Profile
            </h1>
            <p className="text-gray-600">Verified Creator</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Image & Quick Info */}
          <div className="space-y-4">
            <Card className="p-6 bg-white border border-gray-200">
              {selectedCreator.image ? (
                <img
                  src={selectedCreator.image}
                  alt={selectedCreator.name}
                  className="w-full aspect-square object-cover border-2 border-gray-200 rounded-lg mb-4"
                />
              ) : (
                <div className="w-full aspect-square border-2 border-gray-200 rounded-lg mb-4 bg-gray-100 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-2xl font-semibold">
                    {getInitials(getDisplayName(selectedCreator.name))}
                  </div>
                </div>
              )}
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {selectedCreator.name}
              </h2>
              <p className="text-gray-600 mb-4">{selectedCreator.location}</p>
              <Badge className="bg-blue-100 text-blue-700 border border-blue-300 mb-4">
                {selectedCreator.creator_type}
              </Badge>

              {selectedCreator.agency && (
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-1">
                    Represented by
                  </p>
                  <p className="text-gray-900">{selectedCreator.agency}</p>
                </div>
              )}

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Price from:</span>
                  <span className="font-bold text-gray-900">
                    ${selectedCreator.price}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Turnaround:</span>
                  <span className="font-bold text-gray-900">
                    {selectedCreator.turnaround}
                  </span>
                </div>
              </div>

              <Button
                onClick={() => handleCreatorHire(selectedCreator)}
                className="w-full bg-[#F7B750] hover:bg-[#E6A640] text-white"
              >
                Request Cameo
              </Button>
            </Card>

            {/* Social Links */}
            {(selectedCreator.instagram ||
              selectedCreator.tiktok ||
              selectedCreator.portfolio_url) && (
              <Card className="p-6 bg-white border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Links</h3>
                <div className="space-y-2">
                  {selectedCreator.instagram && (
                    <a
                      href={selectedCreator.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-gray-700 hover:text-[#F7B750] transition-colors"
                    >
                      <Globe className="w-4 h-4" />
                      <span>Instagram</span>
                    </a>
                  )}
                  {selectedCreator.tiktok && (
                    <a
                      href={selectedCreator.tiktok}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-gray-700 hover:text-[#F7B750] transition-colors"
                    >
                      <Globe className="w-4 h-4" />
                      <span>TikTok</span>
                    </a>
                  )}
                  {selectedCreator.portfolio_url && (
                    <a
                      href={selectedCreator.portfolio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-gray-700 hover:text-[#F7B750] transition-colors"
                    >
                      <Globe className="w-4 h-4" />
                      <span>Portfolio</span>
                    </a>
                  )}
                  {selectedCreator.sport && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Star className="w-4 h-4" />
                      <span>Sport: {selectedCreator.sport}</span>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Right Column - Details */}
          <div className="md:col-span-2 space-y-6">
            {/* Bio */}
            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-3">About</h3>
              <p className="text-gray-700 leading-relaxed">
                {selectedCreator.bio || selectedCreator.tagline}
              </p>
            </Card>

            {/* Physical Attributes */}
            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Physical Attributes
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {selectedCreator.height && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Height</p>
                    <p className="font-semibold text-gray-900">
                      {selectedCreator.height}
                    </p>
                  </div>
                )}
                {selectedCreator.weight && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Weight</p>
                    <p className="font-semibold text-gray-900">
                      {selectedCreator.weight}
                    </p>
                  </div>
                )}
                {selectedCreator.skin_tone && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Skin Tone</p>
                    <p className="font-semibold text-gray-900">
                      {selectedCreator.skin_tone}
                    </p>
                  </div>
                )}
                {selectedCreator.hair_color && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Hair Color</p>
                    <p className="font-semibold text-gray-900">
                      {selectedCreator.hair_color}
                    </p>
                  </div>
                )}
                {selectedCreator.eye_color && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Eye Color</p>
                    <p className="font-semibold text-gray-900">
                      {selectedCreator.eye_color}
                    </p>
                  </div>
                )}
                {selectedCreator.bust && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Bust</p>
                    <p className="font-semibold text-gray-900">
                      {selectedCreator.bust}"
                    </p>
                  </div>
                )}
                {selectedCreator.waist && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Waist</p>
                    <p className="font-semibold text-gray-900">
                      {selectedCreator.waist}"
                    </p>
                  </div>
                )}
                {selectedCreator.hips && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Hips</p>
                    <p className="font-semibold text-gray-900">
                      {selectedCreator.hips}"
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Niches */}
            {selectedCreator.niches && selectedCreator.niches.length > 0 && (
              <Card className="p-6 bg-white border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  Specialties
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedCreator.niches.map((niche) => (
                    <Badge
                      key={niche}
                      className="bg-blue-100 text-blue-700 border border-blue-300"
                    >
                      {niche}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* Rules */}
            {selectedCreator.rules && selectedCreator.rules.length > 0 && (
              <Card className="p-6 bg-white border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  Content Guidelines
                </h3>
                <div className="space-y-2">
                  {selectedCreator.rules.map((rule, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-gray-700"
                    >
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Past Projects */}
            {selectedCreator.past_projects &&
              selectedCreator.past_projects.length > 0 && (
                <Card className="p-6 bg-white border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Past Projects on Likelee
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedCreator.past_projects.map((project, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={project.image}
                          alt={project.brand}
                          className="w-full h-32 object-cover border-2 border-gray-200 rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all rounded-lg flex items-center justify-center">
                          <p className="text-white font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                            {project.brand}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

            {/* Stats */}
            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Performance Stats
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Followers</p>
                  <p className="text-xl font-bold text-gray-900">
                    {(selectedCreator.followers / 1000).toFixed(1)}K
                  </p>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Engagement</p>
                  <p className="text-xl font-bold text-gray-900">
                    {selectedCreator.engagement}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const FilterDropdown = ({ label, category, options }) => (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-gray-900">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between border-2 border-gray-300 bg-white hover:bg-gray-50 h-10"
          >
            <span className="truncate text-sm">
              {filters[category].length > 0
                ? `${filters[category].length} selected`
                : `Select ${label}`}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-2" align="start">
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {options.map((option) => (
              <div
                key={option}
                className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-md cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  toggleFilter(category, option);
                }}
              >
                <Checkbox
                  checked={filters[category].includes(option)}
                  onCheckedChange={() => toggleFilter(category, option)}
                />
                <Label className="text-sm text-gray-700 cursor-pointer flex-1 capitalize">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );

  const renderMarketplace = () => {
    if (showCreatorProfile) {
      return renderCreatorProfile();
    }

    const filteredCreators = getFilteredCreators();
    const activeFilterCount = getActiveFilterCount();

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Verified Creators Marketplace
          </h1>
          <p className="text-gray-600">
            Access real, licensed creators across every niche and language.
          </p>
        </div>

        {/* Search & Filters */}
        <Card className="p-4 bg-white border border-gray-200">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search creators by name, niche, or tag..."
                className="pl-10 border-2 border-gray-300"
              />
            </div>
            <Button
              variant="outline"
              className="border-2 border-gray-300"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="ml-2 bg-[#F7B750] text-white">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </div>
        </Card>

        {/* Active Filter Chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(filters).map(([category, values]) => {
              if (
                Array.isArray(values) &&
                !category.includes("range") &&
                values.length > 0
              ) {
                return values.map((value) => (
                  <Badge
                    key={`${category}-${value}`}
                    variant="secondary"
                    className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1 flex items-center gap-1"
                  >
                    <span className="capitalize">{value}</span>
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-blue-900"
                      onClick={() => toggleFilter(category, value)}
                    />
                  </Badge>
                ));
              }
              return null;
            })}
            {filters.age_range[0] !== 18 || filters.age_range[1] !== 65 ? (
              <Badge
                variant="secondary"
                className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1 flex items-center gap-1"
              >
                Age: {filters.age_range[0]}-{filters.age_range[1]}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-blue-900"
                  onClick={() =>
                    setFilters({ ...filters, age_range: [18, 65] })
                  }
                />
              </Badge>
            ) : null}
            <Button
              variant="destructive"
              size="icon"
              className="h-7 w-7 rounded-full shadow-sm"
              title="Clear All Filters"
              onClick={() =>
                setFilters({
                  creator_types: [],
                  races: [],
                  hair_colors: [],
                  hairstyles: [],
                  eye_colors: [],
                  facial_features: [],
                  niches: [],
                  age_range: [18, 65],
                  height_range: [140, 210],
                  weight_range: [40, 150],
                  bust: "",
                  waist: "",
                  hips: "",
                })
              }
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Advanced Filters Panel */}
        {showFilters && (
          <Card className="p-6 bg-gray-50 border-2 border-gray-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Advanced Filters
              </h3>
              <Button
                variant="ghost"
                onClick={() =>
                  setFilters({
                    creator_types: [],
                    races: [],
                    hair_colors: [],
                    hairstyles: [],
                    eye_colors: [],
                    facial_features: [],
                    niches: [],
                    age_range: [18, 65],
                    height_range: [140, 210],
                    weight_range: [40, 150],
                    bust: "",
                    waist: "",
                    hips: "",
                  })
                }
              >
                Clear All
              </Button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <FilterDropdown
                label="Creator Type"
                category="creator_types"
                options={["influencer", "ugc", "model", "athlete", "actor"]}
              />
              <FilterDropdown
                label="Race"
                category="races"
                options={[
                  "White",
                  "Black",
                  "Asian",
                  "Hispanic",
                  "Middle Eastern",
                  "Mixed",
                  "Other",
                ]}
              />
              <FilterDropdown
                label="Hair Color"
                category="hair_colors"
                options={[
                  "Blonde",
                  "Brown",
                  "Dark Brown",
                  "Black",
                  "Red",
                  "Auburn",
                  "Gray",
                  "Other",
                ]}
              />
              <FilterDropdown
                label="Hairstyle"
                category="hairstyles"
                options={[
                  "Straight",
                  "Wavy",
                  "Curly",
                  "Coily",
                  "Braids",
                  "Locs",
                  "Bald",
                  "Short",
                  "Medium",
                  "Long",
                ]}
              />
              <FilterDropdown
                label="Eye Color"
                category="eye_colors"
                options={["Blue", "Green", "Brown", "Hazel", "Gray", "Amber"]}
              />
              <FilterDropdown
                label="Facial Features"
                category="facial_features"
                options={[
                  "Dimples",
                  "Freckles",
                  "Tattoos",
                  "Piercings",
                  "Facial Hair",
                  "Glasses",
                  "High Cheekbones",
                  "Strong Jawline",
                ]}
              />
              <FilterDropdown
                label="Niches"
                category="niches"
                options={[
                  "Fashion",
                  "Beauty",
                  "Lifestyle",
                  "Sports",
                  "Fitness",
                  "Sustainable",
                  "Streetwear",
                  "Editorial",
                ]}
              />
            </div>

            {/* Range Sliders */}
            <div className="space-y-8 pt-6 mt-6 border-t border-gray-200">
              <div className="grid md:grid-cols-3 gap-8">
                {/* Age Slider */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-semibold text-gray-900">
                      Age Range
                    </Label>
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      {filters.age_range[0]} - {filters.age_range[1]} years
                    </span>
                  </div>
                  <Slider
                    defaultValue={[18, 65]}
                    max={65}
                    min={18}
                    step={1}
                    value={filters.age_range}
                    onValueChange={(value) =>
                      setFilters({ ...filters, age_range: value })
                    }
                    className="py-4"
                  />
                </div>

                {/* Height Slider */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-semibold text-gray-900">
                      Height Range
                    </Label>
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      {filters.height_range[0]} - {filters.height_range[1]} cm
                    </span>
                  </div>
                  <Slider
                    defaultValue={[140, 210]}
                    max={210}
                    min={140}
                    step={1}
                    value={filters.height_range}
                    onValueChange={(value) =>
                      setFilters({ ...filters, height_range: value })
                    }
                    className="py-4"
                  />
                </div>

                {/* Weight Slider */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-semibold text-gray-900">
                      Weight Range
                    </Label>
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      {filters.weight_range[0]} - {filters.weight_range[1]} kg
                    </span>
                  </div>
                  <Slider
                    defaultValue={[40, 150]}
                    max={150}
                    min={40}
                    step={1}
                    value={filters.weight_range}
                    onValueChange={(value) =>
                      setFilters({ ...filters, weight_range: value })
                    }
                    className="py-4"
                  />
                </div>
              </div>

              {/* Model Measurements */}
              {(filters.creator_types.length === 0 ||
                filters.creator_types.includes("model")) && (
                <div className="pt-4 border-t border-gray-100">
                  <Label className="text-sm font-semibold text-gray-900 mb-3 block">
                    Model Measurements (inches)
                  </Label>
                  <div className="flex gap-4 max-w-md">
                    <Input
                      placeholder="Bust"
                      value={filters.bust}
                      onChange={(e) =>
                        setFilters({ ...filters, bust: e.target.value })
                      }
                      className="border-2 border-gray-300"
                    />
                    <Input
                      placeholder="Waist"
                      value={filters.waist}
                      onChange={(e) =>
                        setFilters({ ...filters, waist: e.target.value })
                      }
                      className="border-2 border-gray-300"
                    />
                    <Input
                      placeholder="Hips"
                      value={filters.hips}
                      onChange={(e) =>
                        setFilters({ ...filters, hips: e.target.value })
                      }
                      className="border-2 border-gray-300"
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-gray-600">
            Showing{" "}
            <span className="font-bold text-gray-900">
              {filteredCreators.length}
            </span>{" "}
            creators
          </p>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              onClick={() =>
                setFilters({
                  creator_types: [],
                  races: [],
                  hair_colors: [],
                  hairstyles: [],
                  eye_colors: [],
                  facial_features: [],
                  niches: [],
                  age_range: [18, 65],
                  height_range: [140, 210],
                  weight_range: [40, 150],
                  bust: "",
                  waist: "",
                  hips: "",
                })
              }
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
            </Button>
          )}
        </div>

        {/* Creator Cards */}
        {loading ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F7B750] mb-4"></div>
            <p className="text-gray-600 font-medium">Searching for talent...</p>
          </div>
        ) : filteredCreators.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No creators found
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              We couldn't find any creators matching your current filters. Try
              adjusting your criteria or clearing all filters.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {filteredCreators.map((creator) => (
              <Card
                key={creator.id}
                className="p-6 bg-white border border-gray-200 hover:shadow-lg transition-all"
              >
                <div className="relative mb-4">
                  {creator.image ? (
                    <img
                      src={creator.image}
                      alt={creator.name}
                      className="w-full h-48 object-cover border-2 border-gray-200 rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-48 border-2 border-gray-200 rounded-lg bg-gray-100 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xl font-semibold">
                        {getInitials(getDisplayName(creator.name))}
                      </div>
                    </div>
                  )}
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {creator.name}
                </h3>
                <p className="text-sm text-gray-600 mb-1">{creator.location}</p>
                <p className="text-sm text-gray-700 mb-4">{creator.tagline}</p>

                <div className="flex gap-2 mb-4">
                  {creator.tags.map((tag) => (
                    <Badge
                      key={tag}
                      className="bg-gray-100 text-gray-700 border border-gray-300 text-xs"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div>
                    <p className="text-gray-600">Followers</p>
                    <p className="font-bold text-gray-900">
                      {(creator.followers / 1000).toFixed(1)}K
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Engagement</p>
                    <p className="font-bold text-gray-900">
                      {creator.engagement}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Turnaround</p>
                    <p className="font-bold text-gray-900">
                      {creator.turnaround}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">From</p>
                    <p className="font-bold text-gray-900">${creator.price}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={() => handleCreatorHire(creator)}
                    className="w-full bg-[#F7B750] hover:bg-[#E6A640] text-white"
                  >
                    Request Cameo
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 border-2 border-gray-300"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-2 border-gray-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewProfile(creator);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Profile
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderCreatorMarketplace = () => {
    return (
      <MarketplaceSection
        title={t("dashboard.marketplace.search.creatorMarketplaceTitle")}
        subtitle={t("dashboard.marketplace.search.verifiedCreatorsOnly")}
        verifiedBadgeLabel=""
        queryScope="brand-creator-marketplace"
        showRequestLicense
        onRequestLicense={(profile, details) =>
          handleOpenLicenseRequest(profile, details)
        }
        actionsLocked={!brandCanUseCampaignCollaboration}
        lockedTitle={t("dashboard.locked.proFeaturePreview")}
        lockedDescription={t("dashboard.locked.creatorsLockedDesc")}
        lockedCtaLabel={t("dashboard.locked.upgradeToProCta")}
        onLockedAction={() => navigate("/brandpricing")}
      />
    );
  };

  const renderAgencyMarketplace = () => {
    return (
      <MarketplaceSection
        entityType="agency"
        title={t("dashboard.marketplace.search.agencyMarketplaceTitle")}
        subtitle={t("dashboard.marketplace.search.verifiedAgenciesOnly")}
        verifiedBadgeLabel=""
        searchPlaceholder={t("dashboard.marketplace.search.agencyPlaceholder")}
        resultLimit={60}
        queryScope="brand-agency-marketplace"
        actionsLocked={!brandCanUseCampaignCollaboration}
        lockedTitle={t("dashboard.locked.proFeaturePreview")}
        lockedDescription={t("dashboard.locked.agenciesLockedDesc")}
        lockedCtaLabel={t("dashboard.locked.upgradeToProCta")}
        onLockedAction={() => navigate("/brandpricing")}
      />
    );
  };

  const handleArchiveRequest = async (req: any) => {
    try {
      await updateBrandLicensingRequestsStatus({
        licensing_request_ids: [req.id],
        status: "archived",
      });
      const resp = await getBrandLicensingRequests();
      const rows = (resp as any)?.requests || resp?.data || [];
      setBrandLicensingRequests(Array.isArray(rows) ? rows : []);
      toast({
        title: t("statuses.archived"),
        description: t("campaigns.licensingRequests.archivedDescription", {
          defaultValue: "Licensing request has been archived.",
        }),
      });
    } catch (e: any) {
      toast({
        title: "Archive failed",
        description: e?.message || "Could not archive licensing request",
        variant: "destructive" as any,
      });
    }
  };

  const handleDeleteRequest = async (req: any) => {
    setDeletingRequestId(req.id);
    try {
      await deleteBrandLicensingRequests({
        licensing_request_ids: [req.id],
      });
      const resp = await getBrandLicensingRequests();
      const rows = (resp as any)?.requests || resp?.data || [];
      setBrandLicensingRequests(Array.isArray(rows) ? rows : []);
      toast({
        title: "Deleted",
        description: "Licensing request permanently deleted.",
      });
    } catch (e: any) {
      toast({
        title: "Delete failed",
        description: e?.message || "Could not delete licensing request",
        variant: "destructive" as any,
      });
    } finally {
      setDeletingRequestId(null);
      setShowDeleteConfirm(false);
      setRequestToDelete(null);
    }
  };

  const renderBrandLicensingRequests = () => {
    const isArchived = (req: any) =>
      ["rejected", "declined", "archived"].includes(req?.status || "");

    const filteredRequests = brandLicensingRequests.filter((req: any) => {
      if (activeLicensingTab === "Active") return !isArchived(req);
      return isArchived(req);
    });

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold text-gray-900">
              {t("campaigns.licensingRequests.title")}
            </h2>
            <div className="flex bg-gray-100 p-1 rounded-lg w-fit mt-2">
              {[
                {
                  key: "Active",
                  label: t("campaigns.licensingRequests.tabs.active"),
                },
                {
                  key: "Archive",
                  label: t("campaigns.licensingRequests.tabs.archive"),
                },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveLicensingTab(tab.key as any)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeLicensingTab === tab.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loadingBrandLicensingRequests && (
          <Card className="p-6 bg-white border border-gray-200">
            <p className="text-sm text-gray-600">
              {t("campaigns.licensingRequests.loading")}
            </p>
          </Card>
        )}

        {!loadingBrandLicensingRequests && filteredRequests.length === 0 && (
          <Card className="p-4 sm:p-8 text-center text-sm text-gray-600">
            {activeLicensingTab === "Active"
              ? t("campaigns.licensingRequests.emptyActive")
              : t("campaigns.licensingRequests.emptyArchive")}
          </Card>
        )}

        {!loadingBrandLicensingRequests &&
          filteredRequests.map((req: any) => {
            const agencyName =
              req?.agencies?.agency_name ||
              req?.agency_name ||
              t("common.agency");
            const status = formatLicenseStatus(req?.status || "pending");
            const statusClass =
              status === t("campaigns.licensingRequests.status.approved")
                ? "bg-green-100 text-green-700 border-green-200"
                : status === t("campaigns.licensingRequests.status.declined") ||
                    status === t("statuses.archived")
                  ? "bg-red-100 text-red-700 border-red-200"
                  : "bg-amber-100 text-amber-700 border-amber-200";

            const licenseFeeValue = req?.license_fee;
            const licenseFee = licenseFeeValue
              ? `$${Number(licenseFeeValue).toLocaleString()}`
              : "\u2014";

            let submissions = req?.license_submissions;
            if (submissions && !Array.isArray(submissions)) {
              submissions = [submissions];
            }
            const directSubmission = req?.license_submission;
            if (directSubmission) {
              const directSubmissionList = Array.isArray(directSubmission)
                ? directSubmission
                : [directSubmission];
              const existingIds = new Set(
                (submissions || [])
                  .map((sub: any) => String(sub?.id || "").trim())
                  .filter(Boolean),
              );
              submissions = [
                ...directSubmissionList.filter((sub: any) => {
                  const id = String(sub?.id || "").trim();
                  return id ? !existingIds.has(id) : true;
                }),
                ...(submissions || []),
              ];
            }

            const submission = Array.isArray(submissions)
              ? submissions
                  .filter((sub: any) => sub?.status !== "draft")
                  .sort((a: any, b: any) => {
                    const linkedSubmissionId = String(
                      req?.submission_id || "",
                    ).trim();
                    const aId = String(a?.id || "").trim();
                    const bId = String(b?.id || "").trim();
                    const aMatchesLinked = linkedSubmissionId
                      ? aId === linkedSubmissionId
                      : false;
                    const bMatchesLinked = linkedSubmissionId
                      ? bId === linkedSubmissionId
                      : false;

                    if (aMatchesLinked && !bMatchesLinked) return -1;
                    if (!aMatchesLinked && bMatchesLinked) return 1;

                    const aHasUrl = !!(
                      a?.client_submitter_slug || a?.docuseal_slug
                    );
                    const bHasUrl = !!(
                      b?.client_submitter_slug || b?.docuseal_slug
                    );

                    if (aHasUrl && !bHasUrl) return -1;
                    if (!aHasUrl && bHasUrl) return 1;

                    const aDate = new Date(a?.created_at || 0);
                    const bDate = new Date(b?.created_at || 0);
                    return bDate.getTime() - aDate.getTime();
                  })[0]
              : null;

            const slug =
              submission?.client_submitter_slug || submission?.docuseal_slug;
            const signingUrl = slug ? `https://docuseal.co/s/${slug}` : "";
            const declineReason = String(req?.decline_reason || "").trim();

            return (
              <Card
                key={req?.id}
                className="p-6 bg-white border border-gray-200 rounded-xl"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {req?.campaign_title ||
                          t("campaigns.licensingRequests.requestFallback")}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {t("campaigns.licensingRequests.agency")}: {agencyName}
                        {req?.talent_name
                          ? ` • ${t("campaigns.licensingRequests.talent")}: ${req.talent_name}`
                          : ""}
                      </p>
                    </div>
                    <Badge className={`border ${statusClass}`}>{status}</Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">
                        {t("campaigns.licensingRequests.startDate")}
                      </p>
                      <p className="font-semibold text-gray-900">
                        {req?.license_start_date
                          ? new Date(
                              req.license_start_date,
                            ).toLocaleDateString()
                          : "\u2014"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">
                        {t("campaigns.licensingRequests.endDate")}
                      </p>
                      <p className="font-semibold text-gray-900">
                        {req?.license_end_date
                          ? new Date(req.license_end_date).toLocaleDateString()
                          : "\u2014"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">
                        {t("campaigns.licensingRequests.durationDays")}
                      </p>
                      <p className="font-semibold text-gray-900">
                        {req?.duration_days || "\u2014"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">
                        {t("campaigns.licensingRequests.licenseFee")}
                      </p>
                      <p className="font-semibold text-gray-900">
                        {licenseFee}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">
                        {t("campaigns.licensingRequests.territory")}
                      </p>
                      <p className="font-semibold text-gray-900">
                        {req?.territory || req?.regions || "\u2014"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">
                        {t("campaigns.licensingRequests.exclusivity")}
                      </p>
                      <p className="font-semibold text-gray-900">
                        {req?.exclusivity || req?.usage_scope || "\u2014"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">
                        {t("campaigns.licensingRequests.modificationsAllowed")}
                      </p>
                      <p className="font-semibold text-gray-900">
                        {req?.modifications_allowed || "\u2014"}
                      </p>
                    </div>
                  </div>

                  {req?.custom_terms && (
                    <div className="text-sm">
                      <p className="text-gray-500">
                        {t("campaigns.licensingRequests.additionalTerms")}
                      </p>
                      <p className="font-semibold text-gray-900">
                        {String(req.custom_terms)}
                      </p>
                    </div>
                  )}

                  {req?.description && (
                    <div className="text-sm">
                      <p className="text-gray-500">
                        {t("campaigns.licensingRequests.description")}
                      </p>
                      <p className="font-semibold text-gray-900">
                        {String(req.description)}
                      </p>
                    </div>
                  )}

                  {declineReason && status === "Declined" && (
                    <div className="text-sm bg-red-50 border border-red-100 rounded-lg p-3 text-red-700 mt-2">
                      <span className="font-semibold">
                        {t("campaigns.licensingRequests.declineReason")}:{" "}
                      </span>
                      {declineReason}
                    </div>
                  )}

                  {activeLicensingTab === "Archive" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button
                        variant="outline"
                        onClick={() => handleArchiveRequest(req)}
                        className="border-gray-300 text-gray-700 font-bold h-10 rounded-md flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Recover to Active
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setRequestToDelete(req);
                          setShowDeleteConfirm(true);
                        }}
                        disabled={deletingRequestId === req.id}
                        className="border-red-200 text-red-600 hover:bg-red-50 font-bold h-10 rounded-md flex items-center justify-center gap-2"
                      >
                        {deletingRequestId === req.id ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            Delete Permanently
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3 mt-2">
                      {signingUrl && submission?.status !== "completed" ? (
                        <Button
                          className="text-white"
                          style={{ backgroundColor: "#E9A23B" }}
                          onMouseEnter={(e) =>
                            (e.target.style.backgroundColor = "#D4941F")
                          }
                          onMouseLeave={(e) =>
                            (e.target.style.backgroundColor = "#E9A23B")
                          }
                          onClick={() => {
                            setBrandSignUrl(signingUrl);
                            setBrandSignOpen(true);
                          }}
                        >
                          {t("campaigns.licensingRequests.signContract")}
                        </Button>
                      ) : submission?.status === "completed" ? (
                        <div className="flex items-center justify-center h-11 bg-green-50 rounded-md border border-green-200">
                          <p className="text-xs font-black text-green-700 uppercase tracking-widest flex items-center gap-2">
                            <svg
                              className="w-4 h-4"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {t("campaigns.licensingRequests.contractSigned")}
                          </p>
                        </div>
                      ) : (
                        <div className="bg-gray-100 text-gray-600 border border-gray-200 px-3 py-2 rounded-md text-xs font-medium">
                          {t(
                            "campaigns.licensingRequests.awaitingAgencyContract",
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}

        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {t("campaigns.licensingRequests.deleteDialog.title")}
              </DialogTitle>
              <DialogDescription>
                {t("campaigns.licensingRequests.deleteDialog.description")}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <p className="text-sm text-gray-600">
                {t("campaigns.licensingRequests.deleteDialog.confirmPrefix")}{" "}
                <span className="font-semibold">
                  {requestToDelete?.campaign_title ||
                    t(
                      "campaigns.licensingRequests.deleteDialog.unknownCampaign",
                    )}
                </span>
                ?
              </p>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setRequestToDelete(null);
                }}
                className="font-bold"
              >
                {t("campaigns.licensingRequests.deleteDialog.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteRequest(requestToDelete)}
                disabled={deletingRequestId === requestToDelete?.id}
                className="font-bold"
              >
                {deletingRequestId === requestToDelete?.id ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {t("campaigns.licensingRequests.deleteDialog.deleting")}
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t("campaigns.licensingRequests.deleteDialog.delete")}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  const renderInboxSubtab = () => {
    if (!canViewInbox) {
      return (
        <div className="space-y-5">
          <Card className="p-12 bg-white border border-gray-300 rounded-none text-center">
            <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              {t("campaigns.inbox.accessRestricted")}
            </h2>
            <p className="text-gray-600">{t("campaigns.inbox.noPermission")}</p>
            <p className="text-sm text-gray-500 mt-2">
              {t("campaigns.inbox.contactAdmin")}
            </p>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1">
            {t("campaigns.inbox.title")}
          </h2>
          <p className="text-gray-600">{t("campaigns.inbox.subtitle")}</p>
        </div>

        <div className="inline-flex items-center bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setInboxSubTab("talent_packages")}
            className={`px-3 py-1.5 text-sm font-semibold rounded-md ${
              inboxSubTab === "talent_packages"
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500"
            }`}
          >
            {t("campaigns.inbox.tabs.talentPackages")} ({inboxPackages.length})
          </button>
          <button
            onClick={() => setInboxSubTab("direct_requests")}
            className={`px-3 py-1.5 text-sm font-semibold rounded-md ${
              inboxSubTab === "direct_requests"
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500"
            }`}
          >
            {t("campaigns.inbox.tabs.directRequests")}
          </button>
        </div>

        {inboxSubTab === "talent_packages" ? (
          <div className="space-y-4">
            {loadingInboxPackages && (
              <Card className="p-6 bg-white border border-gray-300 rounded-none">
                <p className="text-sm text-gray-500">
                  {t("campaigns.inbox.loadingPackages")}
                </p>
              </Card>
            )}
            {!loadingInboxPackages && inboxPackages.length === 0 && (
              <Card className="p-6 bg-white border border-gray-300 rounded-none">
                <p className="text-sm text-gray-500">
                  {t("campaigns.inbox.noPackagesReceived")}
                </p>
              </Card>
            )}
            {inboxPackages.map((pkg: any) => {
              const expiresAt = pkg?.expires_at
                ? new Date(pkg.expires_at)
                : null;
              const isExpired = expiresAt
                ? expiresAt.getTime() < Date.now()
                : false;
              const isDone =
                pkg?.status === "feedback_received" ||
                pkg?.status === "completed";
              const selectedTalentCount = Array.isArray(
                pkg?.meta?.selected_talent_ids,
              )
                ? pkg.meta.selected_talent_ids.length
                : 0;

              return (
                <Card
                  key={pkg.id}
                  className="p-6 bg-white border border-gray-300 rounded-none"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-2xl font-bold text-gray-900">
                          {pkg.title ||
                            pkg.campaign_offers?.offer_title ||
                            pkg.campaign_offers?.brand_campaigns?.name ||
                            t("campaigns.inbox.packageFallbackTitle")}
                        </h3>
                        {String(pkg?.status || "") === "sent" && (
                          <Badge className="bg-black text-white text-[10px] uppercase rounded-sm">
                            {t("campaigns.inbox.new")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 font-medium">
                        {t("campaigns.inbox.from")}:{" "}
                        {pkg?.agencies?.agency_name ||
                          pkg?.agency_id ||
                          t("campaigns.contractHub.targetType.agency")}
                      </p>
                      <p className="text-sm text-gray-500">
                        {t("campaigns.inbox.sent")}:{" "}
                        {pkg?.sent_at
                          ? new Date(String(pkg.sent_at)).toLocaleString()
                          : "—"}
                      </p>
                      {pkg?.expires_at && (
                        <p
                          className={`text-sm ${
                            isExpired
                              ? "text-red-600 font-bold"
                              : "text-gray-500"
                          }`}
                        >
                          {t("campaigns.inbox.expires")}:{" "}
                          {new Date(pkg.expires_at).toLocaleDateString()}
                          {isExpired && ` (${t("campaigns.inbox.expired")})`}
                        </p>
                      )}
                    </div>
                    <Badge className="bg-blue-100 text-blue-700 border border-blue-200 text-xs">
                      {t("campaigns.inbox.talentCount", {
                        count: selectedTalentCount,
                      })}
                    </Badge>
                  </div>

                  {pkg?.message && (
                    <p className="text-gray-700 italic mb-4">
                      "{String(pkg.message)}"
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 mt-2">
                    <Button
                      className={`flex-1 min-w-[120px] rounded-none text-sm ${
                        isExpired || !canManagePayOffers
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-black hover:bg-gray-800 text-white"
                      }`}
                      disabled={isExpired || isDone || !canManagePayOffers}
                      onClick={async () => {
                        setConfirmingDonePkg(pkg);
                        setConfirmingDonePkgPublicData(null);
                        // Fetch interactions via the authenticated brand endpoint.
                        // This bypasses the public package password gate — the brand
                        // is already authenticated and owns this offer, so their JWT
                        // is sufficient. The public endpoint would 401 for
                        // password-protected packages even though the brand has rights.
                        const offerId = String(
                          pkg?.offer_id || pkg?.campaign_offers?.id || "",
                        ).trim();
                        const packageId = String(pkg?.id || "").trim();
                        if (offerId && packageId) {
                          setLoadingConfirmingDonePkgPublicData(true);
                          try {
                            const resp = await base44.get<any>(
                              `/api/campaign-offers/${encodeURIComponent(offerId)}/packages/${encodeURIComponent(packageId)}/interactions`,
                            );
                            setConfirmingDonePkgPublicData(resp);
                          } catch {
                            // non-fatal — dialog will show "no talent selected" message
                          } finally {
                            setLoadingConfirmingDonePkgPublicData(false);
                          }
                        }
                      }}
                      title={
                        !canManagePayOffers
                          ? "You do not have permission to mark packages as done"
                          : ""
                      }
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {isDone
                        ? t("campaigns.inbox.done")
                        : isExpired
                          ? t("campaigns.inbox.expired")
                          : t("campaigns.inbox.markDone")}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 min-w-[120px] border border-gray-300 rounded-none text-sm"
                      disabled={isDone || isExpired}
                      onClick={() => {
                        const token = pkg?.meta?.agency_package_token;
                        const id = String(pkg?.id || "");
                        if (token) {
                          window.open(`/share/package/${token}`, "_blank");
                        } else if (id) {
                          window.open(`/share/package/${id}`, "_blank");
                        }
                      }}
                    >
                      {t("campaigns.inbox.openPackage")}
                    </Button>
                    <Button
                      variant="outline"
                      className={`border rounded-none flex-shrink-0 transition-colors ${
                        isDone
                          ? "border-gray-200 text-gray-400 cursor-not-allowed"
                          : "border-gray-300 hover:border-red-300 hover:text-red-600 hover:bg-red-50"
                      }`}
                      disabled={!canManagePayOffers}
                      title={
                        !canManagePayOffers
                          ? "You do not have permission to dismiss packages"
                          : isDone
                            ? "This package has been finalized"
                            : "Dismiss from inbox"
                      }
                      onClick={() => {
                        if (isDone) {
                          setFinalizedPackageInfo({
                            title:
                              pkg?.title ||
                              pkg?.campaign_offers?.offer_title ||
                              pkg?.campaign_offers?.brand_campaigns?.name ||
                              "Talent package",
                            agencyName:
                              pkg?.agencies?.agency_name || "the agency",
                          });
                          return;
                        }
                        // Open dismiss confirmation modal
                        setDismissingPkg(pkg);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-2 border-dashed border-gray-300 bg-white rounded-none p-16 text-center">
            <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              No direct requests yet
            </h3>
            <p className="text-lg text-gray-600">
              Agencies can send you direct licensing requests for specific
              campaigns
            </p>
          </Card>
        )}
      </div>
    );
  };

  const loadOfferHubDetails = async (
    offerId: string,
    opts?: { silent?: boolean },
  ) => {
    if (!offerId) {
      setSelectedOfferHubContracts([]);
      setSelectedOfferHubDeliverables([]);
      return;
    }
    if (!opts?.silent) setLoadingOfferHubDetails(true);
    try {
      const [contractsResp, deliverablesResp] = await Promise.all([
        base44.get<{ contracts?: any[] }>(
          `/api/campaign-offers/${offerId}/contracts`,
        ),
        listOfferDeliverables(offerId).catch(() =>
          base44.get<{ deliverables?: any[] }>(
            `/api/campaign-offers/${offerId}/deliverables`,
          ),
        ),
      ]);
      const contracts = Array.isArray(contractsResp?.contracts)
        ? contractsResp.contracts
        : [];
      const refreshedContracts = await Promise.all(
        contracts.map(async (contract: any) => {
          const contractId = String(contract?.id || "").trim();
          if (!contractId) return contract;
          if (!shouldAttemptDocuSealRefresh(contract)) return contract;
          try {
            contractRefreshThrottleRef.current[contractId] = Date.now();
            const refreshed = await base44.post<{ contract?: any }>(
              `/api/campaign-offers/${offerId}/contracts/${contractId}/refresh`,
              {},
            );
            return refreshed?.contract || contract;
          } catch {
            return contract;
          }
        }),
      );
      setSelectedOfferHubContracts(refreshedContracts);
      setSelectedOfferHubDeliverables(
        Array.isArray(deliverablesResp?.deliverables)
          ? deliverablesResp.deliverables
          : [],
      );
    } catch {
      setSelectedOfferHubContracts([]);
      setSelectedOfferHubDeliverables([]);
    } finally {
      if (!opts?.silent) setLoadingOfferHubDetails(false);
    }
  };
  const loadCampaignContractsForOffer = async (offerId: string) => {
    if (!offerId) {
      setSelectedCampaignContracts([]);
      return;
    }
    try {
      setLoadingSelectedCampaignContracts(true);
      const response = await base44.get<{ contracts?: any[] }>(
        `/api/campaign-offers/${offerId}/contracts`,
      );
      const contracts = Array.isArray(response?.contracts)
        ? response.contracts
        : [];
      setSelectedCampaignContracts(contracts);
    } catch {
      setSelectedCampaignContracts([]);
    } finally {
      setLoadingSelectedCampaignContracts(false);
    }
  };
  const resolveDeliverableFileName = (deliverable: any) => {
    const fromCaption = String(deliverable?.caption || "").trim();
    if (fromCaption) return fromCaption;
    const fromOriginal = String(deliverable?.meta?.original_name || "").trim();
    if (fromOriginal) return fromOriginal;
    return "deliverable";
  };
  const downloadOfferHubDeliverable = async (deliverable: any) => {
    const offerId = String(deliverable?.offer_id || "").trim();
    const deliverableId = String(deliverable?.id || "").trim();
    const status = String(deliverable?.status || "").toLowerCase();
    const offer = brandOfferItems.find(
      (o: any) => String(o?.id || "") === offerId,
    );
    const isPaid =
      String(offer?.payment_status || "")
        .trim()
        .toLowerCase() === "paid";
    const approvedForDownload = [
      "approved",
      "accepted",
      "brand_approved",
    ].includes(status);
    if (!offerId || !deliverableId) {
      toast({
        title: "Download unavailable",
        description: "Missing deliverable reference.",
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
    if (!isPaid) {
      toast({
        title: "Payment required",
        description:
          "Payment has not been received for this offer. Please complete payment to download deliverables.",
        variant: "destructive" as any,
      });
      return;
    }
    try {
      const response = await base44.getRaw(
        `/api/campaign-offers/${encodeURIComponent(offerId)}/deliverables/${encodeURIComponent(deliverableId)}/file?download=true`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch deliverable file.");
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = resolveDeliverableFileName(deliverable);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      await base44.post(
        `/api/campaign-offers/${encodeURIComponent(offerId)}/deliverables/${encodeURIComponent(deliverableId)}/downloaded`,
        {},
      );
      toast({ title: "Download started" });
      await loadOfferHubDetails(offerId);
    } catch (e: any) {
      toast({
        title: "Download failed",
        description: e?.message || "Please try again.",
        variant: "destructive" as any,
      });
    }
  };
  const formatHubDate = (value: unknown) => {
    const raw = String(value || "").trim();
    if (!raw) return "N/A";
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) return raw;
    return dt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  const contractStatusBadgeClass = (statusRaw: unknown) => {
    const status = String(statusRaw || "").toLowerCase();
    if (status === "completed") {
      return "inline-flex min-w-28 items-center rounded-md border border-emerald-300 bg-emerald-100 px-2.5 py-1 text-emerald-700 font-semibold";
    }
    if (status === "partially_signed" || status === "signed") {
      // Brand signed, waiting for creator — amber/waiting tone
      return "inline-flex min-w-28 items-center rounded-md border border-amber-300 bg-amber-100 px-2.5 py-1 text-amber-700 font-semibold";
    }
    if (status === "opened") {
      // Brand opened but hasn't signed yet — blue/action-needed tone
      return "inline-flex min-w-28 items-center rounded-md border border-blue-300 bg-blue-100 px-2.5 py-1 text-blue-700 font-semibold";
    }
    if (status === "sent") {
      return "inline-flex min-w-28 items-center rounded-md border border-blue-300 bg-blue-100 px-2.5 py-1 text-blue-700 font-semibold";
    }
    if (status === "declined" || status === "rejected") {
      return "inline-flex min-w-28 items-center rounded-md border border-red-300 bg-red-100 px-2.5 py-1 text-red-700 font-semibold";
    }
    return "inline-flex min-w-28 items-center rounded-md border border-gray-300 bg-white px-2.5 py-1 text-gray-700 font-semibold";
  };
  const formatContractStatusLabel = (statusRaw: unknown) => {
    const status = String(statusRaw || "sent").toLowerCase();
    if (status === "opened")
      return t("campaigns.contractHub.status.signRequired");
    if (status === "sent") return t("statuses.sent");
    if (status === "partially_signed" || status === "signed")
      return t("campaigns.contractHub.status.awaitingCreator");
    if (status === "completed") return t("statuses.completed");
    if (status === "declined" || status === "rejected")
      return t("statuses.declined");
    return status.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  };

  const handleDeliverableReview = async (
    offerId: string,
    deliverableId: string,
    action: string,
    note?: string,
  ) => {
    if (!canApproveDeliverables) {
      toast({
        title: "Permission required",
        description:
          "Your role cannot approve or request changes on deliverables.",
        variant: "destructive" as any,
      });
      return;
    }
    if (deliverableReviewBusyRef.current.has(deliverableId)) return;
    deliverableReviewBusyRef.current.add(deliverableId);
    const offer = brandOfferItems.find(
      (o: any) => String(o?.id || "") === String(offerId),
    );
    const isPaid =
      String(offer?.payment_status || "")
        .trim()
        .toLowerCase() === "paid";
    if (!isPaid) {
      toast({
        title: "Payment required",
        description:
          "You can’t approve or review deliverables until payment for this offer is completed.",
        variant: "destructive" as any,
      });
      deliverableReviewBusyRef.current.delete(deliverableId);
      return;
    }
    try {
      setReviewing(deliverableId);
      const result = await reviewOfferDeliverable(offerId, deliverableId, {
        action,
        note,
      });

      const escrow = result?.escrow;

      // Reactive Update: Update the offer in brandOfferItems if escrow status has changed.
      if (escrow?.id && escrow?.escrow_status) {
        setBrandOfferItems((prev) =>
          prev.map((o) => {
            if (String(o.id) === String(escrow.id)) {
              return {
                ...o,
                escrow_status: escrow.escrow_status,
                payment_status: escrow.payment_status || o.payment_status,
              };
            }
            return o;
          }),
        );
      }
      if (action === "approve" && escrow) {
        if (escrow?.released_now) {
          const off = brandOfferItems.find(
            (b) => String(b.id) === String(offerId),
          );
          setEscrowReleasedModal({
            open: true,
            offerId,
            amount: off?.budget,
            currency: off?.currency_code || "USD",
          });
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
        } else if (String(escrow?.escrow_status || "") === "released") {
          toast({
            title: "Escrow already released",
            description:
              "Stripe transfers were already triggered for this offer.",
          });
        } else {
          toast({
            title: "Deliverable approved",
            description: "Escrow release is not available yet for this offer.",
          });
        }
      } else {
        toast({
          title: "Success",
          description: `Deliverable ${action.replace(/_/g, " ")}.`,
        });
      }
      setReviewDialog((prev) => ({ ...prev, open: false }));
      await loadOfferHubDetails(offerId);
    } catch (error: any) {
      toast({
        title: "Review failed",
        description: error.message || "Failed to update deliverable status.",
        variant: "destructive",
      });
    } finally {
      deliverableReviewBusyRef.current.delete(deliverableId);
      setReviewing(null);
    }
  };

  const getPublicUrl = (
    del: any,
    options: { thumbnail?: boolean; download?: boolean } = {},
  ) => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
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

    // Never expose private-bucket URLs directly; access must go through API proxies.
    return "";
  };

  const renderCampaignContractHub = () => (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1">
          {t("campaigns.contractHub.title")}
        </h2>
        <p className="text-gray-600">
          {t("campaigns.contractHub.campaignContractsStatus")}
        </p>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setContractHubSubTab("agency")}
          className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            contractHubSubTab === "agency"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          {t("campaigns.contractHub.targetType.agency")}
          {brandOfferItems.filter(
            (offer: any) => offer?.target_type === "agency",
          ).length > 0 && (
            <span className="ml-1.5 text-xs font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
              {
                brandOfferItems.filter(
                  (offer: any) => offer?.target_type === "agency",
                ).length
              }
            </span>
          )}
        </button>
        <button
          onClick={() => setContractHubSubTab("creator")}
          className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            contractHubSubTab === "creator"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          {t("campaigns.contractHub.targetType.creator")}
          {contractHubRows.filter((row: any) => {
            const offer = offerMap.get(String(row?.offer_id));
            return offer?.target_type === "creator";
          }).length > 0 && (
            <span className="ml-1.5 text-xs font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
              {
                contractHubRows.filter((row: any) => {
                  const offer = offerMap.get(String(row?.offer_id));
                  return offer?.target_type === "creator";
                }).length
              }
            </span>
          )}
        </button>
      </div>

      {/* Agency Contracts Tab Content */}
      {contractHubSubTab === "agency" && (
        <div className="space-y-3">
          {loadingBrandOfferItems ? (
            <Card className="p-6 bg-white border border-gray-300 rounded-none">
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-sm text-gray-600 font-medium">
                  Loading agency contracts...
                </p>
              </div>
            </Card>
          ) : brandOfferItems.filter(
              (offer: any) => offer?.target_type === "agency",
            ).length === 0 ? (
            <Card className="p-6 bg-white border border-gray-300 rounded-none">
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Building2 className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Agency Contracts Yet
                </h3>
                <p className="text-sm text-gray-600 text-center max-w-md mb-4">
                  Agency contracts will appear here once you send campaign
                  offers to agencies and they sign the agreements.
                </p>
                <p className="text-xs text-gray-500 text-center">
                  Tip: Connect with agencies from the marketplace to get
                  started!
                </p>
              </div>
            </Card>
          ) : null}
          {brandOfferItems
            .filter((offer: any) => offer?.target_type === "agency")
            .map((offer: any) => {
              const offerId = String(offer?.id || "");
              const expanded = selectedOfferHubId === offerId;
              const contractsForStatus = expanded
                ? selectedOfferHubContracts
                : offer?.offer_contracts;
              const hasCompletedContract = Array.isArray(contractsForStatus)
                ? contractsForStatus.some((c: any) => {
                    const st = String(
                      c?.docuseal_status || c?.status || "",
                    ).toLowerCase();
                    return st === "completed" || st === "signed";
                  })
                : false;
              const isFullySigned =
                Boolean(offer?.is_fully_signed) || hasCompletedContract;
              const downloadedDeliverables =
                selectedOfferHubDeliverables.filter(
                  (d: any) =>
                    Boolean(d?.meta?.brand_downloaded_at) &&
                    ["approved", "accepted"].includes(
                      String(d?.status || "").toLowerCase(),
                    ),
                );
              const approvedCount = downloadedDeliverables.filter(
                (d: any) =>
                  String(d?.status || "").toLowerCase() === "approved",
              ).length;
              const totalCount = downloadedDeliverables.length;
              const progressPct =
                totalCount > 0
                  ? Math.round((approvedCount / totalCount) * 100)
                  : 0;
              return (
                <Card
                  key={offerId}
                  className="p-4 bg-white border border-gray-300 rounded-none space-y-2"
                >
                  {/* Payment Pending Banner */}
                  {isFullySigned && offer?.payment_status !== "paid" && (
                    <div className="flex flex-col gap-3 bg-amber-50 border border-amber-200 rounded-md p-4">
                      <span className="text-amber-800 text-sm font-semibold">
                        ⏳ Contract signed. Payment required before deliverables
                        can be downloaded.
                      </span>
                      <div className="bg-white border border-amber-200 rounded-lg p-3">
                        <div className="flex justify-between items-center text-sm py-1">
                          <span className="text-gray-600">Creator Payment</span>
                          <span className="font-medium">
                            $
                            {Number(
                              offer?.budget_snapshot?.budget_creator_payment ||
                                0,
                            ).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm py-1">
                          <span className="text-gray-600">
                            Likelee Platform Fee (
                            {brandPlanTier === "pro" ? 3 : 5}%)
                          </span>
                          <span className="font-medium">
                            $
                            {(
                              Number(
                                offer?.budget_snapshot
                                  ?.budget_creator_payment || 0,
                              ) * (brandPlanTier === "pro" ? 0.03 : 0.05)
                            ).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm py-2 mt-1 border-t border-gray-100 font-bold text-gray-900">
                          <span>Total Due</span>
                          <span>
                            $
                            {(
                              Number(
                                offer?.budget_snapshot
                                  ?.budget_creator_payment || 0,
                              ) * (brandPlanTier === "pro" ? 1.03 : 1.05)
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-end mt-1">
                        {canManagePayOffers ? (
                          <Button
                            size="sm"
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-md px-4 py-2"
                            disabled={payingOfferId === offerId}
                            onClick={async () => {
                              setPayingOfferId(offerId);
                              try {
                                const data: any = await base44.post(
                                  `/api/brand/campaign-offers/${offerId}/checkout`,
                                  {},
                                );
                                if (data?.url) {
                                  window.location.href = data.url;
                                } else {
                                  toast({
                                    title: "Payment Error",
                                    description:
                                      data?.message ||
                                      "Could not start checkout.",
                                    variant: "destructive",
                                  });
                                }
                              } catch (e: any) {
                                const msg = String(e?.message || "");
                                toast({
                                  title: msg.includes("no_talents_assigned")
                                    ? "Talent assignment required"
                                    : "Payment Error",
                                  description: msg.includes(
                                    "no_talents_assigned",
                                  )
                                    ? "The agency must assign at least 1 talent to this offer before you can pay. Please contact the agency and try again."
                                    : msg || "Could not start checkout.",
                                  variant: "destructive" as any,
                                });
                              } finally {
                                setPayingOfferId(null);
                              }
                            }}
                          >
                            {payingOfferId === offerId
                              ? "Redirecting…"
                              : "💳 Pay Offer"}
                          </Button>
                        ) : (
                          <span className="text-xs text-amber-600 italic">
                            View only - payment requires admin or project
                            manager role
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {isFullySigned && offer?.payment_status === "paid" && (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                      <span className="text-emerald-700 text-xs font-semibold">
                        ✅ {t("campaigns.deliverables.status.paymentConfirmed")}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {offer?.brand_campaigns?.name ||
                          t("campaigns.contractHub.campaignOfferFallback")}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t("campaigns.contractHub.targetType.agency")}:{" "}
                        {offer?.target_name ||
                          offer?.agencies?.agency_name ||
                          t("campaigns.contractHub.targetType.agency")}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t(`statuses.${String(offer?.status || "sent")}`, {
                          defaultValue: String(offer?.status || "sent").replace(
                            /_/g,
                            " ",
                          ),
                        })}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="border border-gray-300 rounded-none"
                      onClick={async () => {
                        const next = expanded ? "" : offerId;
                        setSelectedOfferHubId(next);
                        await loadOfferHubDetails(next);
                      }}
                    >
                      {expanded
                        ? t("campaigns.contractHub.hide")
                        : t("campaigns.contractHub.viewContracts")}
                    </Button>
                  </div>
                  {expanded && (
                    <div className="border border-gray-200 rounded-none bg-gray-50 flex flex-col gap-px">
                      {loadingOfferHubDetails ? (
                        <div className="p-8 text-center bg-white">
                          <Loader2 className="w-8 h-8 text-gray-300 mx-auto mb-3 animate-spin" />
                          <p className="text-sm text-gray-500 font-medium">
                            {t("campaigns.contractHub.loading")}
                          </p>
                        </div>
                      ) : selectedOfferHubContracts.filter(
                          (c: any) =>
                            c?.docuseal_status && c.docuseal_status !== "draft",
                        ).length === 0 ? (
                        <div className="p-8 text-center bg-white">
                          <FileText className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                          <p className="text-sm text-gray-500 font-medium">
                            {t("campaigns.contractHub.noActiveContracts")}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {t("campaigns.contractHub.contractsAttentionHere")}
                          </p>
                        </div>
                      ) : (
                        selectedOfferHubContracts
                          .filter(
                            (c: any) =>
                              c?.docuseal_status &&
                              c.docuseal_status !== "draft",
                          )
                          .map((contract: any) => {
                            const isCompleted =
                              contract?.docuseal_status === "completed";
                            const isPending =
                              contract?.docuseal_status === "sent" ||
                              contract?.docuseal_status === "opened";

                            return (
                              <div
                                key={String(contract?.id)}
                                className="bg-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-gray-50/50 transition-colors"
                              >
                                <div className="flex items-center gap-4">
                                  <div
                                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                      isCompleted ? "bg-green-50" : "bg-blue-50"
                                    }`}
                                  >
                                    {isCompleted ? (
                                      <CheckCircle className="w-5 h-5 text-green-500" />
                                    ) : (
                                      <FileText className="w-5 h-5 text-blue-500" />
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-900">
                                      {String(
                                        contract?.title || "Contract Document",
                                      )}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span
                                        className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                                          isCompleted
                                            ? "bg-green-100 text-green-700"
                                            : isPending
                                              ? "bg-blue-100 text-blue-700"
                                              : "bg-gray-100 text-gray-700"
                                        }`}
                                      >
                                        {String(
                                          contract?.docuseal_status ||
                                            "Unknown",
                                        ).replace(/_/g, " ")}
                                      </span>
                                      {contract?.updated_at && (
                                        <span className="text-xs text-gray-500">
                                          {t(
                                            "campaigns.contractHub.updatedLabel",
                                          )}{" "}
                                          {new Date(
                                            contract.updated_at,
                                          ).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isPending && (
                                    <Button
                                      variant="default"
                                      size="sm"
                                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                                      onClick={() => {
                                        // Resolve signing URL — backend stores it in
                                        // meta.brand_signing_url (primary) or
                                        // meta.docuseal_signing_url (fallback).
                                        const signingUrl =
                                          contract?.meta?.brand_signing_url ||
                                          contract?.meta
                                            ?.docuseal_signing_url ||
                                          contract?.signing_url ||
                                          contract?.docuseal_signing_url;

                                        if (signingUrl) {
                                          window.open(signingUrl, "_blank");
                                        } else {
                                          // Fallback: inform user to check email
                                          toast({
                                            title: "Check your email",
                                            description:
                                              "A secure DocuSeal signing link has been sent to your email address.",
                                          });
                                        }
                                      }}
                                    >
                                      Review & Sign
                                    </Button>
                                  )}
                                  {isCompleted && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="border-gray-200 text-gray-600"
                                      onClick={() => {
                                        if (contract?.signed_document_url) {
                                          window.open(
                                            contract.signed_document_url,
                                            "_blank",
                                          );
                                        } else {
                                          toast({
                                            title: "Download Unavailable",
                                            description:
                                              "The signed document URL is not available yet.",
                                            variant: "destructive",
                                          });
                                        }
                                      }}
                                    >
                                      <Download className="w-4 h-4 mr-2" />
                                      Download
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
        </div>
      )}

      {/* Creator Contracts Tab Content */}
      {contractHubSubTab === "creator" && (
        <Card className="p-4 bg-white border border-gray-300 rounded-none">
          {loadingContractHubRows ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-sm text-gray-600 font-medium">
                {t("campaigns.contractHub.loading")}
              </p>
            </div>
          ) : contractHubRows.filter((row: any) => {
              const offer = offerMap.get(String(row?.offer_id));
              return offer?.target_type === "creator";
            }).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t("campaigns.contractHub.noCreatorContractsYet", {
                  defaultValue: "No Creator Contracts Yet",
                })}
              </h3>
              <p className="text-sm text-gray-600 text-center max-w-md mb-4">
                {t("campaigns.contractHub.creatorContractsWillAppear", {
                  defaultValue:
                    "Creator contracts will appear here once you send campaign offers to individual creators and they sign the agreements.",
                })}
              </p>
              <p className="text-xs text-gray-500 text-center">
                {t("campaigns.contractHub.creatorContractsTip", {
                  defaultValue:
                    "Tip: Send offers from your campaigns to get started!",
                })}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left text-gray-700">
                <thead className="border-b border-gray-200 text-gray-800">
                  <tr>
                    <th className="px-2 py-2">Campaign Name</th>
                    <th className="px-2 py-2">Creator</th>
                    <th className="px-2 py-2">Template</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">
                      {t("campaigns.contractHub.table.sentDate")}
                    </th>
                    <th className="px-2 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contractHubRows
                    .filter((row: any) => {
                      const offer = offerMap.get(String(row?.offer_id));
                      return offer?.target_type === "creator";
                    })
                    .map((row: any) => {
                      const offer = offerMap.get(String(row?.offer_id));
                      return (
                        <tr
                          key={String(row?.id)}
                          className="border-b border-gray-100"
                        >
                          <td className="px-2 py-2 font-medium text-gray-900">
                            {String(row?.campaign_name || "Campaign offer")}
                          </td>
                          <td className="px-2 py-2 text-gray-700">
                            {row?.creator_name ||
                              offer?.target_name ||
                              offer?.creators?.full_name ||
                              "Creator"}
                          </td>
                          <td className="px-2 py-2 text-gray-700">
                            {String(
                              row?.title ||
                                `Template ${String(
                                  row?.docuseal_template_id || "N/A",
                                )}`,
                            )}
                          </td>
                          <td className="px-2 py-2">
                            <span
                              className={contractStatusBadgeClass(
                                row?.docuseal_status,
                              )}
                            >
                              {(() => {
                                const st = String(
                                  row?.docuseal_status || "",
                                ).toLowerCase();
                                if (st === "sent" || st === "opened")
                                  return (
                                    <Mail className="h-3.5 w-3.5 mr-1.5" />
                                  );
                                if (st === "completed")
                                  return (
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                  );
                                if (
                                  st === "partially_signed" ||
                                  st === "signed"
                                )
                                  return (
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                  );
                                return null;
                              })()}
                              {formatContractStatusLabel(row?.docuseal_status)}
                            </span>
                          </td>
                          <td className="px-2 py-2">
                            {formatHubDate(row?.sent_at || row?.created_at)}
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-3">
                              {/* Resend — always creates a fresh DocuSeal submission from the same
                                  template so the brand gets a new signing URL. The brand signs,
                                  then DocuSeal sends to the creator automatically.
                                  Not shown for completed (both signed) or draft (not sent yet). */}
                              {(() => {
                                const st = String(
                                  row?.docuseal_status || "",
                                ).toLowerCase();
                                const canResend =
                                  st === "sent" ||
                                  st === "opened" ||
                                  st === "partially_signed" ||
                                  st === "signed";
                                if (!canResend) return null;

                                return (
                                  <button
                                    className="text-blue-600 hover:text-blue-700"
                                    title="Resend — create new contract for brand to sign"
                                    aria-label="Resend"
                                    type="button"
                                    onClick={async () => {
                                      const offerId = String(
                                        row?.offer_id || "",
                                      );
                                      const contractId = String(row?.id || "");
                                      if (!offerId || !contractId) {
                                        toast({
                                          title: "Resend failed",
                                          description:
                                            "Missing offer or contract ID.",
                                          variant: "destructive" as any,
                                        });
                                        return;
                                      }
                                      try {
                                        // Always create a fresh submission — never reuse an old signing URL
                                        const result = await base44.post<{
                                          contract?: any;
                                        }>(
                                          `/api/campaign-offers/${encodeURIComponent(offerId)}/contracts/send`,
                                          {
                                            contract_id: contractId,
                                            force_new_submission: true,
                                          },
                                        );
                                        const newContract = result?.contract;
                                        const newSigningUrl =
                                          newContract?.meta
                                            ?.brand_signing_url ||
                                          newContract?.meta
                                            ?.agency_signing_url ||
                                          newContract?.meta
                                            ?.docuseal_signing_url;
                                        if (newContract) {
                                          // Update the row in place with the fresh contract data
                                          setContractHubRows((prev) =>
                                            prev.map((existing: any) =>
                                              String(existing?.id) ===
                                              contractId
                                                ? {
                                                    ...newContract,
                                                    offer_id:
                                                      existing?.offer_id,
                                                    campaign_name:
                                                      existing?.campaign_name,
                                                    creator_name:
                                                      existing?.creator_name,
                                                  }
                                                : existing,
                                            ),
                                          );
                                        }
                                        if (newSigningUrl) {
                                          window.open(
                                            String(newSigningUrl),
                                            "_blank",
                                          );
                                          toast({
                                            title: "New contract ready",
                                            description:
                                              "Sign the document — it will be sent to the creator automatically.",
                                          });
                                        } else {
                                          toast({
                                            title: "Contract resent",
                                            description:
                                              "Check your email for the new signing link.",
                                          });
                                        }
                                      } catch (e: any) {
                                        toast({
                                          title: "Resend failed",
                                          description:
                                            e?.message || "Please try again.",
                                          variant: "destructive" as any,
                                        });
                                      }
                                    }}
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </button>
                                );
                              })()}
                              <button
                                className="text-red-600 hover:text-red-700"
                                title="Archive"
                                aria-label="Archive"
                                type="button"
                                onClick={async () => {
                                  try {
                                    await base44.post(
                                      `/api/campaign-offers/${encodeURIComponent(
                                        String(row?.offer_id || ""),
                                      )}/contracts/${encodeURIComponent(
                                        String(row?.id || ""),
                                      )}/archive`,
                                      {},
                                    );
                                    setContractHubRows((prev) =>
                                      prev.filter(
                                        (x: any) =>
                                          String(x?.id) !== String(row?.id),
                                      ),
                                    );
                                    toast({
                                      title: t(
                                        "campaigns.contractHub.actions.archive",
                                      ),
                                      description: t("statuses.archived"),
                                    });
                                  } catch (e: any) {
                                    toast({
                                      title: t("campaigns.inbox.error"),
                                      description:
                                        e?.message || "Please try again.",
                                      variant: "destructive" as any,
                                    });
                                  }
                                }}
                              >
                                <Archive className="h-4 w-4" />
                              </button>
                              {/* Download — check both signed_document_url and meta.docuseal_document_url */}
                              {(() => {
                                const docUrl =
                                  row?.signed_document_url ||
                                  row?.meta?.docuseal_document_url ||
                                  row?.meta?.signed_document_url;
                                return docUrl ? (
                                  <a
                                    href={String(docUrl)}
                                    target="_blank"
                                    rel="noreferrer"
                                    download
                                    title="Download signed contract"
                                    aria-label="Download"
                                    className="text-blue-700 hover:text-blue-800"
                                  >
                                    <Download className="h-4 w-4" />
                                  </a>
                                ) : null;
                              })()}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
  const renderCampaignDeliverablesHub = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 font-syne tracking-tight">
          {t("campaigns.deliverables.title")}
        </h2>
        <p className="text-gray-500 font-medium mt-1">
          {t("campaigns.deliverables.subtitle")}
        </p>
      </div>
      <div className="space-y-4">
        {loadingBrandOfferItems ? (
          <Card className="p-12 bg-white border border-gray-300 rounded-none text-center">
            <Loader2 className="w-8 h-8 text-gray-300 mx-auto mb-3 animate-spin" />
            <p className="text-sm text-gray-500">
              {t("campaigns.campaignDetails.loadingCampaigns")}
            </p>
          </Card>
        ) : brandOfferItems.length === 0 ? (
          <Card className="p-12 bg-white border border-gray-300 rounded-none text-center">
            <p className="text-sm text-gray-500">
              {t("campaigns.campaignDetails.noActiveCampaigns")}
            </p>
          </Card>
        ) : null}
        {(() => {
          const offers = Array.isArray(brandOfferItems) ? brandOfferItems : [];
          const groups = offers.reduce<Record<string, any>>(
            (acc, offer: any) => {
              const campaignId = String(
                offer?.brand_campaigns?.id || offer?.campaign_id || "",
              ).trim();
              const key = campaignId || String(offer?.id || "");
              const name =
                offer?.brand_campaigns?.name ||
                offer?.campaign_name ||
                "Campaign Asset Submission";
              if (!acc[key]) {
                acc[key] = {
                  campaignId: key,
                  campaignName: name,
                  offers: [],
                };
              }
              acc[key].offers.push(offer);
              return acc;
            },
            {},
          );

          const groupRows = Object.values(groups);

          return groupRows.map((group: any) => {
            const campaignId = String(group?.campaignId || "");
            const campaignExpanded = expandedCampaignHubId === campaignId;

            const aggregate = group.offers.reduce(
              (
                acc: {
                  reviewed: number;
                  approved: number;
                  expected: number;
                },
                offer: any,
              ) => {
                const offerId = String(offer?.id || "");
                const isExpandedOffer = selectedOfferHubId === offerId;
                const offerDeliverables = Array.isArray(
                  offer?.offer_deliverables,
                )
                  ? offer.offer_deliverables
                  : isExpandedOffer
                    ? selectedOfferHubDeliverables
                    : [];
                const reviewedCount = offerDeliverables.filter((d: any) => {
                  const st = String(d?.status || "").toLowerCase();
                  return st !== "" && st !== "submitted" && st !== "draft";
                }).length;
                const approvedCount = offerDeliverables.filter((d: any) => {
                  const st = String(d?.status || "").toLowerCase();
                  return st === "approved" || st === "brand_approved";
                }).length;
                const expectedDeliverables = (() => {
                  const brief =
                    offer?.brief_snapshot ||
                    offer?.brand_campaigns?.brief_snapshot ||
                    offer?.brand_campaigns?.brief ||
                    {};
                  const raw = Number(brief?.total_expected_deliverables);
                  if (!Number.isNaN(raw) && raw > 0) return raw;
                  return 0;
                })();

                return {
                  reviewed: acc.reviewed + reviewedCount,
                  approved: acc.approved + approvedCount,
                  expected: acc.expected + expectedDeliverables,
                };
              },
              { reviewed: 0, approved: 0, expected: 0 },
            );

            const completionPct =
              aggregate.expected > 0
                ? Math.round((aggregate.approved / aggregate.expected) * 100)
                : 0;

            return (
              <div
                key={`campaign-${campaignId}`}
                className="rounded-2xl border-2 border-sky-300/80 bg-white/70 backdrop-blur-xl shadow-sm ring-1 ring-sky-100/70 overflow-hidden transition-shadow hover:shadow-md"
              >
                <div
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 cursor-pointer hover:bg-white/80 transition-colors"
                  onClick={() => {
                    setExpandedCampaignHubId(
                      campaignExpanded ? "" : campaignId,
                    );
                  }}
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="p-2 sm:p-3 rounded-xl bg-gray-100 text-gray-600 flex-shrink-0">
                      <Briefcase className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">
                        {group?.campaignName ||
                          t("campaigns.campaignDetails.campaign")}
                      </h3>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">
                        {t("campaigns.deliverables.badges.collaborators", {
                          count: group?.offers?.length || 0,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="rounded-full px-2 sm:px-3 py-1 text-[11px] font-semibold bg-sky-100 text-sky-700 border border-sky-200 shadow-sm">
                      {aggregate.reviewed}{" "}
                      {t("campaigns.deliverables.badges.reviewed")}
                    </Badge>
                    <Badge className="rounded-full px-2 sm:px-3 py-1 text-[11px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm">
                      {aggregate.approved}{" "}
                      {t("campaigns.deliverables.badges.approved")}
                    </Badge>
                    <Badge className="rounded-full px-2 sm:px-3 py-1 text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 shadow-sm">
                      {completionPct}%
                    </Badge>
                    {campaignExpanded ? (
                      <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {campaignExpanded && (
                  <div className="border-t border-sky-200/60 bg-white/30">
                    <div className="p-4 space-y-3">
                      {group.offers.map((offer: any) => {
                        const offerId = String(offer?.id || "");
                        const expanded = selectedOfferHubId === offerId;
                        const offerDeliverables = Array.isArray(
                          offer?.offer_deliverables,
                        )
                          ? offer.offer_deliverables
                          : selectedOfferHubId === offerId
                            ? selectedOfferHubDeliverables
                            : [];

                        const reviewedCount = offerDeliverables.filter(
                          (d: any) => {
                            const st = String(d?.status || "").toLowerCase();
                            return (
                              st !== "" && st !== "submitted" && st !== "draft"
                            );
                          },
                        ).length;
                        const approvedCount = offerDeliverables.filter(
                          (d: any) => {
                            const st = String(d?.status || "").toLowerCase();
                            return st === "approved" || st === "brand_approved";
                          },
                        ).length;
                        const expectedDeliverables = (() => {
                          const brief =
                            offer?.brief_snapshot ||
                            offer?.brand_campaigns?.brief_snapshot ||
                            offer?.brand_campaigns?.brief ||
                            {};
                          const raw = Number(
                            brief?.total_expected_deliverables,
                          );
                          if (!Number.isNaN(raw) && raw > 0) return raw;
                          return 0;
                        })();
                        const completionPct =
                          expectedDeliverables > 0
                            ? Math.round(
                                (approvedCount / expectedDeliverables) * 100,
                              )
                            : 0;

                        const collaboratorName = (() => {
                          const targetType = String(
                            offer?.target_type || "",
                          ).toLowerCase();
                          const targetName = String(
                            offer?.target_name || "",
                          ).trim();
                          if (targetType === "agency") {
                            return targetName || "Agency";
                          }
                          const creatorName = String(
                            offer?.talent_name || "",
                          ).trim();
                          return creatorName || targetName || "Creator";
                        })();

                        const collaboratorAvatar =
                          String(offer?.target_avatar_url || "").trim() ||
                          String(offer?.talent_avatar_url || "").trim() ||
                          String(offer?.avatar_url || "").trim();
                        const collaboratorInitial =
                          collaboratorName.trim().slice(0, 1).toUpperCase() ||
                          "C";

                        return (
                          <div
                            key={`offer-${offerId}`}
                            className="rounded-xl border border-sky-200/60 bg-white/60 backdrop-blur-lg shadow-sm overflow-hidden transition-shadow hover:shadow-md"
                          >
                            <div
                              className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 cursor-pointer hover:bg-white/80 transition-colors"
                              onClick={async (event) => {
                                event.stopPropagation();
                                const next = expanded ? "" : offerId;
                                setSelectedOfferHubId(next);
                                await loadOfferHubDetails(next);
                              }}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <Avatar className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0">
                                  <AvatarImage src={collaboratorAvatar} />
                                  <AvatarFallback className="bg-indigo-50 text-indigo-600 font-bold text-xs uppercase">
                                    {collaboratorInitial}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-gray-900 truncate">
                                    {collaboratorName}
                                  </p>
                                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">
                                    {(() => {
                                      const targetType = String(
                                        offer?.target_type || "",
                                      ).toLowerCase();
                                      if (targetType === "agency") {
                                        return "Creator • Agency";
                                      }
                                      return t(
                                        "campaigns.campaignDetails.creatorCreator",
                                      );
                                    })()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className="rounded-full px-2 sm:px-3 py-1 text-[11px] font-semibold bg-sky-100 text-sky-700 border border-sky-200 shadow-sm">
                                  {reviewedCount}{" "}
                                  {t("campaigns.deliverables.badges.reviewed")}
                                </Badge>
                                <Badge className="rounded-full px-2 sm:px-3 py-1 text-[11px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm">
                                  {approvedCount}{" "}
                                  {t("campaigns.deliverables.badges.approved")}
                                </Badge>
                                <Badge className="rounded-full px-2 sm:px-3 py-1 text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 shadow-sm">
                                  {completionPct}%
                                </Badge>
                                {expanded ? (
                                  <ChevronDown className="w-5 h-5 text-gray-400" />
                                ) : (
                                  <ChevronRight className="w-5 h-5 text-gray-400" />
                                )}
                              </div>
                            </div>

                            {expanded && (
                              <div className="border-t border-sky-200/60 bg-white/30 p-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                                  <div className="bg-white border border-gray-200 p-4">
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                                      {t("campaigns.campaignDetails.campaign")}
                                    </p>
                                    <p className="text-sm font-bold text-gray-900 mt-1">
                                      {group?.campaignName ||
                                        t("campaigns.campaignDetails.campaign")}
                                    </p>
                                  </div>
                                  <div className="bg-white border border-gray-200 p-4">
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                                      {t("campaigns.campaignDetails.progress")}
                                    </p>
                                    <p className="text-sm font-bold text-gray-900 mt-1">
                                      {approvedCount}/
                                      {expectedDeliverables || 0}
                                    </p>
                                  </div>
                                  <div className="bg-white border border-gray-200 p-4">
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                                      {t(
                                        "campaigns.campaignDetails.completion",
                                      )}
                                    </p>
                                    <p className="text-sm font-bold text-gray-900 mt-1">
                                      {completionPct}%
                                    </p>
                                  </div>
                                </div>
                                <div className="bg-white border border-gray-200 p-4 mb-5">
                                  <p className="text-xs font-semibold text-gray-700 mb-2">
                                    {t("campaigns.campaignDetails.progress")}
                                  </p>
                                  <Progress
                                    value={completionPct}
                                    className="h-2"
                                  />
                                  <p className="text-[11px] text-gray-500 mt-2">
                                    {approvedCount}/{expectedDeliverables || 0}{" "}
                                    {t(
                                      "campaigns.campaignDetails.deliverablesApproved",
                                    )}
                                  </p>
                                </div>
                                <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
                                  <p className="text-sm font-semibold text-amber-900">
                                    {t(
                                      "campaigns.campaignDetails.approvingDeliverableTriggers",
                                    )}
                                  </p>
                                  <p className="text-xs text-amber-800 mt-1">
                                    {t(
                                      "campaigns.campaignDetails.approvalsAreFinal",
                                    )}
                                  </p>
                                </div>
                                {loadingOfferHubDetails &&
                                selectedOfferHubId === offerId ? (
                                  <div className="py-12 text-center">
                                    <Loader2 className="w-8 h-8 text-gray-300 mx-auto mb-3 animate-spin" />
                                    <p className="text-sm text-gray-500 font-medium">
                                      {t(
                                        "campaigns.campaignDetails.loadingDeliverables",
                                      )}
                                    </p>
                                  </div>
                                ) : selectedOfferHubDeliverables.length ===
                                  0 ? (
                                  <div className="py-12 text-center">
                                    <ImageIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                                    <p className="text-sm text-gray-400 font-medium italic">
                                      {t(
                                        "campaigns.campaignDetails.noContentSubmitted",
                                      )}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {selectedOfferHubDeliverables.map(
                                      (del: any, idx: number) => {
                                        const status = String(
                                          del?.status || "",
                                        ).toLowerCase();
                                        const isApproved = [
                                          "approved",
                                          "accepted",
                                          "brand_approved",
                                        ].includes(status);
                                        const isBusy =
                                          String(reviewing || "") ===
                                          String(del?.id || "");
                                        const isPaid =
                                          String(offer?.payment_status || "")
                                            .trim()
                                            .toLowerCase() === "paid";
                                        return (
                                          <Card
                                            key={String(del.id)}
                                            className={`group overflow-hidden rounded-2xl border border-white/70 bg-white/70 backdrop-blur-lg shadow-lg hover:shadow-2xl transition-all ${
                                              isPaid
                                                ? "cursor-zoom-in"
                                                : "cursor-default"
                                            }`}
                                            onClick={() => {
                                              setPreviewItems(
                                                selectedOfferHubDeliverables,
                                              );
                                              setPreviewIndex(idx);
                                              setPreviewImage({
                                                ...del,
                                                payment_status:
                                                  offer?.payment_status,
                                              });
                                            }}
                                          >
                                            <div className="aspect-[4/5] bg-gray-100 relative overflow-hidden">
                                              {String(
                                                del?.asset_type || "",
                                              ).startsWith("image") ? (
                                                <img
                                                  src={getPublicUrl(del, {
                                                    thumbnail:
                                                      offer?.payment_status !==
                                                      "paid",
                                                  })}
                                                  alt={
                                                    del.caption || "Deliverable"
                                                  }
                                                  className="w-full h-full object-cover"
                                                />
                                              ) : offer?.payment_status !==
                                                "paid" ? (
                                                <div className="w-full h-full bg-gray-950 flex flex-col items-center justify-center text-white/90 p-4 transition-all group-hover:bg-gray-900">
                                                  <div className="relative mb-3 flex items-center justify-center">
                                                    <Lock className="w-8 h-8 text-indigo-400/80" />
                                                    <Sparkles className="w-5 h-5 text-indigo-400 absolute -top-4 -right-4 animate-pulse" />
                                                  </div>
                                                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-center px-4 leading-tight">
                                                    Premium Video
                                                  </span>
                                                  <span className="text-[7px] mt-2 font-bold text-indigo-400/60 uppercase tracking-widest border border-indigo-500/20 px-1.5 py-0.5 rounded-none">
                                                    Locked
                                                  </span>
                                                </div>
                                              ) : (
                                                <video
                                                  src={getPublicUrl(del)}
                                                  muted
                                                  playsInline
                                                  preload="metadata"
                                                  className="w-full h-full object-cover bg-gray-900"
                                                />
                                              )}
                                              {isApproved && (
                                                <div className="absolute top-3 right-3">
                                                  <Button
                                                    variant="secondary"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-full bg-white/90 text-gray-900 hover:bg-white shadow-sm"
                                                    onClick={(event) => {
                                                      event.stopPropagation();
                                                      void downloadOfferHubDeliverable(
                                                        del,
                                                      );
                                                    }}
                                                    title="Download"
                                                  >
                                                    <Download className="w-4 h-4" />
                                                  </Button>
                                                </div>
                                              )}
                                              <div className="absolute top-2 left-2">
                                                <Badge
                                                  className={`rounded-none border-0 ${
                                                    del.status === "approved" ||
                                                    del.status ===
                                                      "brand_approved"
                                                      ? "bg-emerald-600 text-white"
                                                      : del.status ===
                                                          "changes_requested"
                                                        ? "bg-rose-600 text-white"
                                                        : "bg-blue-600 text-white"
                                                  }`}
                                                >
                                                  {del.status === "submitted"
                                                    ? t("common.new")
                                                    : del.status ===
                                                        "brand_approved"
                                                      ? t("common.approved")
                                                      : del.status.replace(
                                                          /_/g,
                                                          " ",
                                                        )}
                                                </Badge>
                                              </div>
                                            </div>
                                            <div className="p-4 space-y-4">
                                              <p className="text-xs text-gray-600 font-medium leading-relaxed line-clamp-2">
                                                {del.caption || (
                                                  <span className="text-gray-300 italic">
                                                    No caption
                                                  </span>
                                                )}
                                              </p>

                                              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                                <Button
                                                  size="sm"
                                                  className="flex-1 h-8 rounded-none font-bold bg-gray-900"
                                                  disabled={
                                                    isApproved ||
                                                    isBusy ||
                                                    !canApproveDeliverables
                                                  }
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeliverableReview(
                                                      offerId,
                                                      del.id,
                                                      "approve",
                                                    );
                                                  }}
                                                >
                                                  {isApproved
                                                    ? "Approved"
                                                    : "Approve"}
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="flex-1 h-8 rounded-none font-bold"
                                                  disabled={
                                                    isApproved ||
                                                    isBusy ||
                                                    !canApproveDeliverables
                                                  }
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeliverableReview(
                                                      offerId,
                                                      del.id,
                                                      "changes_requested",
                                                    );
                                                  }}
                                                >
                                                  Request changes
                                                </Button>
                                              </div>
                                            </div>
                                          </Card>
                                        );
                                      },
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          });
        })()}
      </div>
    </div>
  );

  const renderCampaigns = () => {
    const openAddCollaboratorFlow = (campaign: any) => {
      const campaignId = String(campaign?.brand_campaign_id || "").trim();
      if (!campaignId) {
        toast({
          title: "Campaign ID missing",
          description:
            "This offer is not linked to a campaign yet. Please create a campaign first.",
          variant: "destructive" as any,
        });
        return;
      }

      setCampaignBuilderContext({
        brandCampaignId: campaignId,
        name: campaign?.name || "",
        objective: campaign?.objective || "",
        start_date: campaign?.start_date || "",
        brief_snapshot:
          campaign?.brief_snapshot &&
          typeof campaign.brief_snapshot === "object"
            ? campaign.brief_snapshot
            : {},
        category: campaign?.category || "",
        description: campaign?.description || "",
        usage_scope: campaign?.usage_scope || "",
        territory: campaign?.territory || "",
        exclusivity: campaign?.exclusivity || "",
        budget_range: campaign?.budget_range || "",
        custom_terms: campaign?.custom_terms || "",
        duration_days: campaign?.duration_days || "",
        startStep: 2,
      });
      setActiveSection("campaigns-hub");
      setOpenCampaignModalSignal((prev) => prev + 1);
    };

    const campaignsForOffers = brandOfferItems.map((offer: any) => {
      const statusRaw = String(offer?.status || "sent").toLowerCase();
      const contractStatuses = Array.isArray(offer?.offer_contracts)
        ? offer.offer_contracts
        : [];
      const hasCompletedContract = contractStatuses.some((contract: any) => {
        const st = String(
          contract?.docuseal_status || contract?.status || "",
        ).toLowerCase();
        return st === "completed" || st === "signed";
      });
      // Campaign "Active vs Pending Approval" must not be affected by deliverable workflow statuses.
      // Prefer backend-derived `is_fully_signed`, with contract parsing as a backward-compatible fallback.
      const isFullySigned =
        Boolean(offer?.is_fully_signed) || hasCompletedContract;
      const startDateRaw = String(
        offer?.brand_campaigns?.start_date || "",
      ).trim();
      const startDate = /^\d{4}-\d{2}-\d{2}$/.test(startDateRaw)
        ? new Date(`${startDateRaw}T00:00:00`)
        : null;
      const durationDaysRaw = Number(
        offer?.brand_campaigns?.duration_days || 0,
      );
      const durationDays =
        Number.isFinite(durationDaysRaw) && durationDaysRaw > 0
          ? durationDaysRaw
          : 30;
      const endDate = startDate
        ? new Date(
            startDate.getTime() + (durationDays - 1) * 24 * 60 * 60 * 1000,
          )
        : null;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const isBeforeStart = Boolean(
        startDate && today.getTime() < startDate.getTime(),
      );
      const isAfterEnd = Boolean(
        endDate && today.getTime() > endDate.getTime(),
      );

      const terminalOfferStatuses = new Set([
        "completed",
        "expired",
        "cancelled",
        "declined",
      ]);
      let mappedStatus: "pending_approval" | "in_progress" | "completed" =
        "pending_approval";
      if (isAfterEnd || terminalOfferStatuses.has(statusRaw)) {
        mappedStatus = "completed";
      } else if (isFullySigned) {
        mappedStatus = "in_progress";
      } else {
        mappedStatus = "pending_approval";
      }
      const campaignName =
        String(offer?.brand_campaigns?.name || "").trim() ||
        String(offer?.offer_title || "").trim() ||
        "Campaign Offer";
      const formattedStartDate =
        String(offer?.brand_campaigns?.start_date || "").trim() ||
        new Date().toISOString().slice(0, 10);
      const formattedDueDate = endDate
        ? endDate.toISOString().slice(0, 10)
        : formattedStartDate;
      const collaboratorLabel =
        String(offer?.target_name || "").trim() ||
        (offer?.target_type === "agency"
          ? "Agency"
          : offer?.target_type === "creator"
            ? "Creator"
            : "Collaborator");
      const brandCampaigns =
        offer?.brand_campaigns && typeof offer.brand_campaigns === "object"
          ? offer.brand_campaigns
          : {};
      return {
        id: String(offer?.id || Math.random()),
        offer_id: String(offer?.id || ""),
        brand_campaign_id: String(
          offer?.brand_campaign_id || offer?.brand_campaigns?.id || "",
        ).trim(),
        name: campaignName,
        status: mappedStatus,
        brand_campaigns: brandCampaigns,
        completed_at: brandCampaigns?.completed_at || null,
        campaign_status: String(brandCampaigns?.status || "").toLowerCase(),
        objective:
          String(offer?.brand_campaigns?.objective || "").trim() ||
          "Campaign offer",
        budget: (() => {
          const budgetText = String(brandCampaigns?.budget_range || "");
          const match = budgetText.match(/(\d[\d,]*)\s*-\s*(\d[\d,]*)/);
          if (match) return Number(String(match[2]).replace(/[^\d]/g, "")) || 0;
          return 0;
        })(),
        creators: [collaboratorLabel],
        creatorAvatars: [
          String(offer?.target_avatar_url || "").trim() || "/favicon.svg",
        ],
        channels: [],
        duration_days: durationDays,
        category: String(brandCampaigns?.category || "").trim(),
        description: String(brandCampaigns?.description || "").trim(),
        usage_scope: String(brandCampaigns?.usage_scope || "").trim(),
        territory: String(brandCampaigns?.territory || "").trim(),
        exclusivity: String(brandCampaigns?.exclusivity || "").trim(),
        budget_range: String(brandCampaigns?.budget_range || "").trim(),
        start_date: String(brandCampaigns?.start_date || "").trim(),
        due_date: endDate ? endDate.toISOString().slice(0, 10) : null,
        custom_terms: String(brandCampaigns?.custom_terms || "").trim(),
        assets_delivered: 0,
        last_update: offer?.updated_at
          ? new Date(String(offer.updated_at)).toLocaleString()
          : "Recently",
        brief_snapshot:
          offer?.brief_snapshot && typeof offer.brief_snapshot === "object"
            ? offer.brief_snapshot
            : {},
        message: typeof offer?.message === "string" ? offer.message : "",
      };
    });

    const groupedCampaigns = Object.values(
      campaignsForOffers.reduce<Record<string, any>>((acc, row: any) => {
        const campaignId = String(row?.brand_campaign_id || "").trim();
        const key = campaignId || String(row?.id || "");
        if (!acc[key]) {
          acc[key] = {
            campaignId: key,
            name: row?.name || "Campaign Offer",
            offers: [],
          };
        }
        acc[key].offers.push(row);
        return acc;
      }, {}),
    ).map((group: any) => {
      const offers = Array.isArray(group?.offers) ? group.offers : [];
      const statuses = new Set(offers.map((o: any) => String(o?.status || "")));
      const campaignMeta =
        offers[0]?.brand_campaigns &&
        typeof offers[0].brand_campaigns === "object"
          ? offers[0].brand_campaigns
          : {};
      const completedAt =
        offers.find((o: any) => o?.completed_at)?.completed_at || null;
      const campaignStatus = String(
        offers.find((o: any) => o?.campaign_status)?.campaign_status || "",
      ).toLowerCase();
      const startDateRaw = String(campaignMeta?.start_date || "").trim();
      const startDate = /^\d{4}-\d{2}-\d{2}$/.test(startDateRaw)
        ? new Date(`${startDateRaw}T00:00:00`)
        : null;
      const durationDaysRaw = Number(campaignMeta?.duration_days || 0);
      const durationDays =
        Number.isFinite(durationDaysRaw) && durationDaysRaw > 0
          ? durationDaysRaw
          : 30;
      const endDate = startDate
        ? new Date(
            startDate.getTime() + (durationDays - 1) * 24 * 60 * 60 * 1000,
          )
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
      const isExpired = isAfterEnd;
      const isDone = Boolean(completedAt);

      const groupStatus:
        | "pending_approval"
        | "in_progress"
        | "completed"
        | "draft" = isExpired
        ? "completed"
        : statuses.has("in_progress")
          ? "in_progress"
          : statuses.has("pending_approval")
            ? "pending_approval"
            : "draft";

      const representative = offers[0] || {};
      return {
        ...group,
        status: groupStatus,
        is_done: isDone,
        is_expired: isExpired,
        completed_at: completedAt,
        objective: representative?.objective || "Campaign offer",
        budget: Number(representative?.budget || 0),
        budget_range: String(representative?.budget_range || ""),
        start_date: String(representative?.start_date || ""),
        due_date: representative?.due_date || null,
        assets_delivered: Number(representative?.assets_delivered || 0),
        last_update: representative?.last_update,
      };
    });

    const filteredCampaigns = groupedCampaigns.filter((c: any) => {
      if (campaignView === "active") return c.status === "in_progress";
      if (campaignView === "pending") return c.status === "pending_approval";
      if (campaignView === "completed") return c.is_expired;
      return c.status === "in_progress";
    });

    if (selectedCampaign) {
      const campaign = campaignsForOffers.find(
        (c) => c.id === selectedCampaign,
      );
      if (!campaign) {
        return (
          <div className="space-y-6">
            <Button
              variant="outline"
              onClick={() => setSelectedCampaign(null)}
              className="border-2 border-gray-300"
            >
              {t("campaigns.campaignDetails.backToCampaigns")}
            </Button>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t("campaigns.campaignDetails.campaignNotFound")}
              </AlertDescription>
            </Alert>
          </div>
        );
      }

      if (showBriefDetails) {
        const brief =
          campaign?.brief_snapshot &&
          typeof campaign.brief_snapshot === "object"
            ? campaign.brief_snapshot
            : {};
        const briefValue = (
          key: string,
          fallback = t("campaigns.myOffers.notSpecified"),
        ) => {
          const value = brief?.[key];
          if (value === null || value === undefined) return fallback;
          const text = String(value).trim();
          return text.length > 0 ? text : fallback;
        };
        const briefLines = (key: string): string[] => {
          const raw = briefValue(key, "");
          if (!raw) return [];
          return raw
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);
        };
        const referenceImages = Array.isArray(brief?.reference_images)
          ? brief.reference_images
          : [];
        const brandAssets = Array.isArray(brief?.brand_assets)
          ? brief.brand_assets
          : [];
        const requiredDeliverablesText = (() => {
          const direct = String(brief?.required_deliverables || "").trim();
          if (direct) return direct;
          const legacy = [
            brief?.deliverables_reels,
            brief?.deliverables_hero_image,
          ]
            .map((entry) => String(entry || "").trim())
            .filter(Boolean);
          return legacy.length > 0
            ? legacy.join("\n")
            : t("campaigns.myOffers.notSpecified");
        })();

        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setShowBriefDetails(false)}
                className="border-2 border-gray-300"
              >
                {t("campaigns.campaignDetails.backToProject")}
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                  {campaign.name} -{" "}
                  {t("campaigns.campaignDetails.briefAndContract")}
                </h1>
                <p className="text-gray-600">
                  {t("campaigns.campaignDetails.detailedScope")}
                </p>
              </div>
            </div>

            <CampaignBriefView brief={brief} />
            <Card className="p-6 bg-white border border-gray-200 space-y-6">
              <h2 className="text-2xl font-bold text-slate-900">
                General Dialogue &amp; Voice Direction
              </h2>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-800">
                  Brand Voice &amp; Tone
                </h3>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <p className="text-slate-900">
                    <span className="font-semibold">Voice:</span>{" "}
                    {briefValue("voice")}
                  </p>
                  <p className="text-slate-900">
                    <span className="font-semibold">Tone:</span>{" "}
                    {briefValue("tone")}
                  </p>
                  <p className="text-slate-900">
                    <span className="font-semibold">Personality:</span>{" "}
                    {briefValue("personality")}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-800">
                  Key Messages
                </h3>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  {briefLines("key_messages").length > 0 ? (
                    <ul className="list-disc pl-5 space-y-1 text-slate-900">
                      {briefLines("key_messages").map((line, idx) => (
                        <li key={`key-message-${idx}`}>
                          {line.replace(/^[•-]\s*/, "")}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500">
                      {t("campaigns.myOffers.notSpecified")}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-800">
                  Script Guidelines (For Video/Audio)
                </h3>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <p className="text-slate-900">
                    <span className="font-semibold">Opening (0-5s):</span>{" "}
                    {briefValue("script_opening")}
                  </p>
                  <p className="text-slate-900">
                    <span className="font-semibold">Middle (5-20s):</span>{" "}
                    {briefValue("script_middle")}
                  </p>
                  <p className="text-slate-900">
                    <span className="font-semibold">Closing (20-30s):</span>{" "}
                    {briefValue("script_closing")}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-800">
                  Do&apos;s &amp; Don&apos;ts
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <p className="font-semibold text-emerald-900 mb-2">✓ DO:</p>
                    {briefLines("dos").length > 0 ? (
                      <ul className="list-disc pl-5 space-y-1 text-emerald-900">
                        {briefLines("dos").map((line, idx) => (
                          <li key={`dos-${idx}`}>
                            {line.replace(/^[•-]\s*/, "")}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-emerald-700">
                        {t("campaigns.myOffers.notSpecified")}
                      </p>
                    )}
                  </div>
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="font-semibold text-red-900 mb-2">
                      ✗ DON&apos;T:
                    </p>
                    {briefLines("donts").length > 0 ? (
                      <ul className="list-disc pl-5 space-y-1 text-red-900">
                        {briefLines("donts").map((line, idx) => (
                          <li key={`donts-${idx}`}>
                            {line.replace(/^[•-]\s*/, "")}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-red-700">
                        {t("campaigns.myOffers.notSpecified")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white border border-gray-200 space-y-6">
              <h2 className="text-2xl font-bold text-slate-900">
                Visual Requirements &amp; Style Guide
              </h2>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-800">
                  Required Deliverables
                </h3>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-slate-900 whitespace-pre-wrap">
                    {requiredDeliverablesText}
                  </p>
                  <p className="text-sm text-slate-700 mt-3">
                    <span className="font-semibold">
                      Total expected deliverables:
                    </span>{" "}
                    {briefValue("total_expected_deliverables")}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-800">
                  Visual Style &amp; Aesthetic
                </h3>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <p className="text-slate-900">
                    <span className="font-semibold">Color Palette:</span>{" "}
                    {briefValue("visual_color_palette")}
                  </p>
                  <p className="text-slate-900">
                    <span className="font-semibold">Setting:</span>{" "}
                    {briefValue("visual_setting")}
                  </p>
                  <p className="text-slate-900">
                    <span className="font-semibold">Framing:</span>{" "}
                    {briefValue("visual_framing")}
                  </p>
                  <p className="text-slate-900">
                    <span className="font-semibold">Editing:</span>{" "}
                    {briefValue("visual_editing")}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-800">
                  Reference Images
                </h3>
                {referenceImages.length > 0 ? (
                  <div className="grid md:grid-cols-3 gap-3">
                    {referenceImages.map((img: any, idx: number) => (
                      <div
                        key={`ref-img-${idx}`}
                        className="border border-gray-200 rounded-lg overflow-hidden"
                      >
                        <img
                          src={String(img?.url || "")}
                          alt={`Ref ${idx + 1}`}
                          className="w-full h-40 object-cover bg-gray-100"
                        />
                        <div className="p-2 text-xs text-gray-700 truncate">
                          {`Ref ${idx + 1}`}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-500">
                    No reference images provided.
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-800">
                  Brand Assets Provided
                </h3>
                {brandAssets.length > 0 ? (
                  <div className="space-y-2">
                    {brandAssets.map((asset: any, idx: number) => (
                      <div
                        key={`asset-${idx}`}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 flex items-center justify-between gap-3"
                      >
                        <span className="truncate">
                          {String(asset?.name || `Asset ${idx + 1}`)}
                        </span>
                        {asset?.url ? (
                          <a
                            href={String(asset.url)}
                            target="_blank"
                            rel="noreferrer"
                            download={String(asset?.name || `asset-${idx + 1}`)}
                            title="Download file"
                            className="inline-flex items-center justify-center w-9 h-9 border border-slate-300 rounded-md hover:bg-slate-100 transition-colors"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        ) : (
                          <span className="text-xs text-slate-500">
                            No file URL
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-500">
                    No brand assets provided.
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6 bg-white border border-gray-200 space-y-6">
              <h2 className="text-2xl font-bold text-slate-900">
                {t("campaigns.campaignBriefBuilder.sections.scopeDetails")}
              </h2>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <p className="text-slate-900">
                    <span className="font-semibold">
                      {t("campaigns.campaignBriefBuilder.fields.objective")}:
                    </span>{" "}
                    {briefValue("overview_objective")}
                  </p>
                  <p className="text-slate-900">
                    <span className="font-semibold">
                      {t(
                        "campaigns.campaignBriefBuilder.fields.targetAudience",
                      )}
                      :
                    </span>{" "}
                    {briefValue("overview_target_audience")}
                  </p>
                  <p className="text-slate-900">
                    <span className="font-semibold">
                      {t(
                        "campaigns.campaignBriefBuilder.fields.campaignDuration",
                      )}
                      :
                    </span>{" "}
                    {briefValue("overview_campaign_duration")}
                  </p>
                  <p className="text-slate-900">
                    <span className="font-semibold">
                      {t("campaigns.campaignBriefBuilder.fields.launchDate")}:
                    </span>{" "}
                    {briefValue("overview_launch_date")}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <p className="text-slate-900">
                    <span className="font-semibold">
                      {t("campaigns.campaignDetails.totalBudget")}:
                    </span>{" "}
                    {briefValue("budget_total")}
                  </p>
                  <p className="text-slate-900">
                    <span className="font-semibold">
                      {t("campaigns.campaignDetails.creatorPayment")}:
                    </span>{" "}
                    {briefValue("budget_creator_payment")}
                  </p>
                  <p className="text-slate-900">
                    <span className="font-semibold">
                      {t("campaigns.campaignDetails.submissionDeadline")}:
                    </span>{" "}
                    {briefValue("budget_submission_deadline")}
                  </p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-slate-900">
                  <span className="font-semibold">
                    {t("campaigns.campaignDetails.renewalTerms")}:
                  </span>{" "}
                  {briefValue("budget_renewal_terms")}
                </p>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                <p className="text-slate-900">
                  <span className="font-semibold">
                    {t(
                      "campaigns.campaignBriefBuilder.fields.includedRevisions",
                    )}
                    :
                  </span>{" "}
                  {briefValue("revision_included")}
                </p>
                <p className="text-slate-900">
                  <span className="font-semibold">
                    {t("campaigns.campaignBriefBuilder.fields.majorChanges", {
                      defaultValue: "Major Changes",
                    })}
                    :
                  </span>{" "}
                  {briefValue("revision_major_changes")}
                </p>
                <p className="text-slate-900">
                  <span className="font-semibold">
                    {t(
                      "campaigns.campaignBriefBuilder.fields.revisionTurnaround",
                    )}
                    :
                  </span>{" "}
                  {briefValue("revision_turnaround")}
                </p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="font-semibold text-slate-900 mb-2">
                  {t("campaigns.campaignBriefBuilder.fields.approvalProcess")}
                </p>
                {briefLines("approval_process").length > 0 ? (
                  <ol className="list-decimal pl-5 space-y-1 text-slate-900">
                    {briefLines("approval_process").map((line, idx) => (
                      <li key={`approval-${idx}`}>
                        {line.replace(/^[•-]?\s*\d*\s*/, "")}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-slate-500">
                    {t("campaigns.myOffers.notSpecified")}
                  </p>
                )}
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="font-semibold text-slate-900 mb-1">
                  {t(
                    "campaigns.campaignBriefBuilder.fields.watermarkProtection",
                  )}
                </p>
                <p className="text-slate-900 whitespace-pre-wrap">
                  {briefValue("watermark_protection")}
                </p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="font-semibold text-slate-900 mb-1">
                  {t("campaigns.campaignBriefBuilder.fields.legalTerms")}
                </p>
                {briefLines("legal_terms").length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1 text-slate-900">
                    {briefLines("legal_terms").map((line, idx) => (
                      <li key={`legal-${idx}`}>
                        {line.replace(/^[•-]\s*/, "")}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500">
                    {t("campaigns.myOffers.notSpecified")}
                  </p>
                )}
              </div>
            </Card>

            <div className="flex gap-4">
              <Button
                variant="outline"
                className="border-2 border-gray-300 h-12"
                onClick={() => setShowBriefDetails(false)}
              >
                {t("common.close", { defaultValue: "Close" })}
              </Button>
            </div>
          </div>
        );
      }

      const selectedBrief =
        campaign?.brief_snapshot && typeof campaign.brief_snapshot === "object"
          ? campaign.brief_snapshot
          : {};
      const selectedBriefValue = (
        key: string,
        fallback = t("campaigns.myOffers.notSpecified"),
      ) => {
        const value = selectedBrief?.[key];
        if (value === null || value === undefined) return fallback;
        const text = String(value).trim();
        return text.length > 0 ? text : fallback;
      };
      const selectedRequiredDeliverables = (() => {
        const direct = String(
          selectedBrief?.required_deliverables || "",
        ).trim();
        if (direct) return direct;
        const legacy = [
          selectedBrief?.deliverables_reels,
          selectedBrief?.deliverables_hero_image,
        ]
          .map((entry) => String(entry || "").trim())
          .filter(Boolean);
        return legacy.length > 0 ? legacy.join(", ") : "Not specified";
      })();
      const startForProgress = /^\d{4}-\d{2}-\d{2}$/.test(
        String(campaign.go_live || ""),
      )
        ? new Date(`${String(campaign.go_live)}T00:00:00`)
        : null;
      const dueForProgress = /^\d{4}-\d{2}-\d{2}$/.test(
        String(campaign.due_date || ""),
      )
        ? new Date(`${String(campaign.due_date)}T23:59:59`)
        : null;
      const nowMs = Date.now();
      const progressPercent = (() => {
        if (campaign.status === "completed") return 100;
        if (!startForProgress || !dueForProgress) return 0;
        const startMs = startForProgress.getTime();
        const dueMs = dueForProgress.getTime();
        if (dueMs <= startMs) return nowMs >= dueMs ? 100 : 0;
        if (nowMs <= startMs) return 0;
        if (nowMs >= dueMs) return 100;
        return Math.max(
          0,
          Math.min(100, ((nowMs - startMs) / (dueMs - startMs)) * 100),
        );
      })();

      return (
        <div className="space-y-6">
          <div className="space-y-3">
            <Button
              variant="outline"
              onClick={() => setSelectedCampaign(null)}
              className="border-2 border-gray-300"
            >
              {t("campaigns.campaignDetails.backToCampaigns")}
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                {campaign.name}
              </h1>
              <p className="text-gray-600">
                {t("campaigns.campaignDetails.created")} {campaign.last_update}
              </p>
            </div>
          </div>

          {/* Project Header */}
          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    campaign.status === "in_progress"
                      ? "bg-blue-100 text-blue-700 border border-blue-300"
                      : campaign.status === "pending_approval"
                        ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                        : campaign.status === "completed"
                          ? "bg-gray-100 text-gray-700 border border-gray-300"
                          : "bg-gray-100 text-gray-700 border border-gray-300"
                  }
                >
                  {campaign.status === "in_progress"
                    ? t("statuses.inProgress")
                    : campaign.status === "pending_approval"
                      ? t("campaigns.myOffers.tabs.pendingApproval")
                      : campaign.status === "completed"
                        ? t("statuses.completed")
                        : campaign.status.replace("_", " ")}
                </Badge>
                {campaign.completed_at && (
                  <Badge className="bg-green-100 text-green-700 border border-green-300">
                    {t("campaigns.myOffers.done")}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    {t("campaigns.campaignDetails.dueDate")}
                  </p>
                  <p className="font-bold text-gray-900">
                    {new Date(campaign.due_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </Card>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Brief & Scope - Now clickable */}
            <Card
              className="md:col-span-2 p-6 bg-white border border-gray-200 cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all"
              onClick={() => setShowBriefDetails(true)}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  {t("campaigns.campaignDetails.briefAndScope")}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-2 border-blue-300 text-blue-600"
                >
                  {t("campaigns.campaignDetails.viewFullDetails")}
                </Button>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold text-gray-700 block mb-2">
                    {t("campaigns.campaignDetails.deliverables")}
                  </Label>
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {selectedRequiredDeliverables}
                  </p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 block mb-2">
                      {t("campaigns.campaignDetails.timeline")}
                    </Label>
                    <p className="text-gray-900">
                      {t("campaigns.campaignDetails.start")}:{" "}
                      {(campaign as any)?.go_live || "—"}
                    </p>
                    <p className="text-gray-900">
                      {t("campaigns.campaignDetails.due")}:{" "}
                      {new Date(campaign.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 block mb-2">
                      {t("campaigns.campaignDetails.budget")}
                    </Label>
                    <p className="text-gray-900">
                      {t("campaigns.campaignDetails.totalBudget")}:{" "}
                      {selectedBriefValue("budget_total", "N/A")}
                    </p>
                    <p className="text-sm text-gray-600">
                      {t("campaigns.campaignDetails.creatorPayment")}:{" "}
                      {selectedBriefValue("budget_creator_payment", "N/A")}
                    </p>
                    <p className="text-sm text-gray-600">
                      {t("campaigns.campaignDetails.submissionDeadline")}:{" "}
                      {selectedBriefValue("budget_submission_deadline", "N/A")}
                    </p>
                  </div>
                </div>
              </div>
              <Alert className="mt-4 bg-blue-50 border border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900 text-sm">
                  {t("campaigns.campaignDetails.detailedScope")}
                </AlertDescription>
              </Alert>
            </Card>

            {/* Talent Info */}
            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {t("campaigns.campaignDetails.collaborator")}
              </h3>
              {campaign.creators.length === 0 ? (
                <p className="text-sm text-gray-500">
                  {t("campaignsDashboard.overview.noCollaboratorsYet")}
                </p>
              ) : (
                <div className="space-y-3">
                  {campaign.creators.map((creator: string, idx: number) => (
                    <div
                      key={`${creator}-${idx}`}
                      className="flex items-center gap-3"
                    >
                      <img
                        src={campaign.creatorAvatars[idx] || "/favicon.svg"}
                        alt={creator}
                        className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                      />
                      <div>
                        <p className="font-semibold text-gray-900">{creator}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Contract Update Section */}
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {t("campaigns.contractHub.contractDetails")}
            </h3>
            <p className="text-gray-600 mb-6">
              {t("campaigns.contractHub.projectOverview")}
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-2 border-gray-300"
                onClick={async () => {
                  await loadCampaignContractsForOffer(
                    String(campaign.offer_id || ""),
                  );
                  setShowContractModal(true);
                }}
              >
                <FileText className="w-4 h-4 mr-2" />
                {t("campaigns.campaignDetails.viewFullContract")}
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            {t("campaigns.myOffers.title")}
          </h1>
          <p className="text-gray-600">{t("campaigns.myOffers.subtitle")}</p>
        </div>

        {/* Campaign Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setCampaignView("active")}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
              campaignView === "active"
                ? "border-[#F7B750] text-[#F7B750]"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {t("campaigns.myOffers.tabs.active")} (
            {
              groupedCampaigns.filter((c: any) => c.status === "in_progress")
                .length
            }
            )
          </button>
          <button
            onClick={() => setCampaignView("pending")}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
              campaignView === "pending"
                ? "border-[#F7B750] text-[#F7B750]"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {t("campaigns.myOffers.tabs.pendingApproval")} (
            {
              groupedCampaigns.filter(
                (c: any) => c.status === "pending_approval",
              ).length
            }
            )
          </button>
          <button
            onClick={() => setCampaignView("completed")}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
              campaignView === "completed"
                ? "border-[#F7B750] text-[#F7B750]"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {t("campaigns.myOffers.tabs.expired")} (
            {groupedCampaigns.filter((c: any) => c.is_expired).length})
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
          {loadingBrandOfferItems && (
            <Card className="p-6 bg-white border border-gray-200">
              <p className="text-sm text-gray-600">
                {t("campaigns.myOffers.loadingCampaigns")}
              </p>
            </Card>
          )}
          {filteredCampaigns.map((campaign: any) => {
            const groupId = String(campaign?.campaignId || campaign?.id || "");
            const expanded = expandedMyOffersCampaignId === groupId;
            const offers = Array.isArray(campaign?.offers)
              ? campaign.offers
              : [];

            const statusBadgeClass =
              campaign.status === "in_progress"
                ? "bg-blue-100 text-blue-700 border border-blue-300"
                : campaign.status === "pending_approval"
                  ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                  : campaign.status === "completed"
                    ? "bg-gray-100 text-gray-700 border border-gray-300"
                    : "bg-gray-100 text-gray-700 border border-gray-300";

            return (
              <div
                key={groupId}
                className="rounded-2xl border border-gray-200 bg-white overflow-hidden"
              >
                <div className="p-6 flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg mb-1">
                      {campaign.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {t("campaigns.myOffers.collaboratorsCount", {
                        count: offers.length,
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusBadgeClass}>
                      {t(`statuses.${campaign.status}`, {
                        defaultValue: String(campaign.status).replace(
                          /_/g,
                          " ",
                        ),
                      })}
                    </Badge>
                    {campaign.completed_at && (
                      <Badge className="bg-green-100 text-green-700 border border-green-300">
                        Done
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="px-6 pb-6">
                  <div className="space-y-3 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        {t("campaigns.myOffers.budget")}:
                      </span>
                      <span className="font-bold text-gray-900">
                        {(() => {
                          const parts = String(
                            campaign.budget_range || "",
                          ).match(/(\d[\d,]*)\s*-\s*(\d[\d,]*)/);
                          if (parts) {
                            const min = Number(
                              parts[1].replace(/[^\d]/g, ""),
                            ).toLocaleString();
                            const max = Number(
                              parts[2].replace(/[^\d]/g, ""),
                            ).toLocaleString();
                            return `$${min} – $${max}`;
                          }
                          return campaign.budget > 0
                            ? `$${Number(campaign.budget).toLocaleString()}`
                            : "—";
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        {t("campaigns.jobs.start")}:
                      </span>
                      <span className="font-medium text-gray-900">
                        {campaign.start_date && campaign.start_date !== "N/A"
                          ? new Date(
                              `${campaign.start_date}T00:00:00`,
                            ).toLocaleDateString()
                          : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        {t("campaigns.myOffers.dueDate")}:
                      </span>
                      <span className="font-medium text-gray-900">
                        {campaign.due_date
                          ? new Date(
                              String(campaign.due_date),
                            ).toLocaleDateString()
                          : "—"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="w-full border-2 border-gray-300"
                      onClick={(event) => {
                        event.stopPropagation();
                        setExpandedMyOffersCampaignId(expanded ? "" : groupId);
                      }}
                    >
                      {t("campaigns.myOffers.offers")}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full border-2 border-gray-300"
                      disabled={!canManagePayOffers}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!canManagePayOffers) {
                          toast({
                            title: t("campaigns.myOffers.viewOnlyAccess"),
                            description:
                              "You do not have permission to add collaborators.",
                            variant: "destructive" as any,
                          });
                          return;
                        }
                        const first = offers[0];
                        if (first) openAddCollaboratorFlow(first);
                      }}
                    >
                      {t("campaigns.myOffers.addCollaborator")}
                    </Button>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-gray-200 bg-gray-50/50 px-6 py-4 space-y-3">
                    {offers.map((offer: any) => {
                      const collaboratorName = Array.isArray(offer?.creators)
                        ? String(offer.creators[0] || "Collaborator")
                        : "Collaborator";
                      const avatarSrc = Array.isArray(offer?.creatorAvatars)
                        ? String(offer.creatorAvatars[0] || "")
                        : "";
                      const initial = collaboratorName
                        .trim()
                        .slice(0, 1)
                        .toUpperCase();

                      return (
                        <div
                          key={String(offer?.id || "")}
                          className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="w-9 h-9">
                              <AvatarImage src={avatarSrc} />
                              <AvatarFallback className="bg-indigo-50 text-indigo-600 font-bold text-xs uppercase">
                                {initial || "C"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-bold text-gray-900">
                                {collaboratorName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {t(
                                  `statuses.${String(offer?.status || "in_progress").toLowerCase()}`,
                                  {
                                    defaultValue: String(
                                      offer?.status || "in_progress",
                                    ).replace(/_/g, " "),
                                  },
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border border-gray-300"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (offer?.id) setSelectedCampaign(offer.id);
                              }}
                            >
                              {t("campaigns.myOffers.view")}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!loadingBrandOfferItems && filteredCampaigns.length === 0 && (
          <Card className="p-12 bg-gray-50 border border-gray-200 text-center">
            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {campaignView === "active"
                ? "No active campaigns"
                : campaignView === "pending"
                  ? "No pending approval campaigns"
                  : "No expired campaigns"}
            </h3>
            <p className="text-gray-600 mb-6">
              Start a new campaign to get creators working on your content
            </p>
          </Card>
        )}
      </div>
    );
  };

  const renderCampaignHub = () => {
    // Campaigns are now loaded from real API data
    const campaignsForHub: any[] = [];

    return (
      <div className="space-y-8">
        <div className="grid grid-cols-3 gap-3 sm:gap-6">
          <Card className="p-4 sm:p-6 bg-white border-2 border-gray-200 rounded-none">
            <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-[#F7B750] mb-2 sm:mb-4" />
            <p className="text-xs sm:text-sm text-gray-600 mb-1">
              Total Spend (30d)
            </p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              $12.4K
            </p>
          </Card>
          <Card className="p-4 sm:p-6 bg-white border-2 border-gray-200 rounded-none">
            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-[#F7B750] mb-2 sm:mb-4" />
            <p className="text-xs sm:text-sm text-gray-600 mb-1">
              Active Collaborators
            </p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              8
            </p>
          </Card>
          <Card className="p-4 sm:p-6 bg-white border-2 border-gray-200 rounded-none">
            <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-[#F7B750] mb-2 sm:mb-4" />
            <p className="text-xs sm:text-sm text-gray-600 mb-1">
              Campaigns Launched
            </p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              12
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
          <Card className="p-4 sm:p-6 bg-white border-2 border-[#F7B750] rounded-none">
            <h3 className="text-sm sm:text-lg font-bold text-gray-900 mb-2">
              Collaborate with Agency
            </h3>
            <Button
              onClick={handleAgencyCollaborationEntry}
              className="w-full bg-[#F7B750] hover:bg-[#E6A640] text-white rounded-none text-xs sm:text-sm h-8 sm:h-10"
            >
              {brandCanUseCampaignCollaboration
                ? t("campaignsDashboard.quickActions.inviteAgency")
                : t("campaignsDashboard.planActions.upgradeToPro")}
            </Button>
          </Card>
          <Card className="p-4 sm:p-6 bg-white border-2 border-[#FAD54C]/60 opacity-70 rounded-none">
            <h3 className="text-sm sm:text-lg font-bold text-gray-900 mb-2">
              Add AI Creator
            </h3>
            <Button
              disabled
              className="w-full bg-[#FAD54C] text-white rounded-none cursor-not-allowed text-xs sm:text-sm h-8 sm:h-10"
            >
              Coming Soon
            </Button>
          </Card>
          <Card className="p-4 sm:p-6 bg-white border-2 border-amber-600/60 rounded-none">
            <h3 className="text-sm sm:text-lg font-bold text-gray-900 mb-2">
              {t("campaignsDashboard.overview.inviteCompanySeatDesc")}
            </h3>
            <Button
              onClick={handleCompanySeatEntry}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-none text-xs sm:text-sm h-8 sm:h-10"
            >
              {(brandSeatLimit ?? 0) === 0
                ? t("campaignsDashboard.quickActions.upgradeToBasic")
                : brandSeatLimitReached
                  ? t("campaignsDashboard.quickActions.seatLimitReached")
                  : t("quickActions.upToSeats", {
                      count: brandSeatLimitLabel,
                    })}
            </Button>
          </Card>
          <Card className="p-4 sm:p-6 bg-white border-2 border-orange-600 rounded-none">
            <h3 className="text-sm sm:text-lg font-bold text-gray-900 mb-2">
              AI Studio Add-On
            </h3>
            <Button
              className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-none text-xs sm:text-sm h-8 sm:h-10"
              onClick={() =>
                navigate(
                  brandHasStudioAddon
                    ? createPageUrl("Studio")
                    : "/brandpricing?focus=studio",
                )
              }
            >
              {brandHasStudioAddon
                ? t("brandPricingStudioAddon.openStudio")
                : brandCanSelfServeStudioAddon
                  ? t("campaignsDashboard.aiStudioModal.enableAddon")
                  : t("campaignsDashboard.aiStudioModal.upgradeToPro")}
            </Button>
          </Card>
          <Card className="p-4 sm:p-6 bg-white border-2 border-blue-600 rounded-none">
            <h3 className="text-sm sm:text-lg font-bold text-gray-900 mb-2">
              {t("campaignsDashboard.quickActions.postJob")}
            </h3>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-none text-xs sm:text-sm h-8 sm:h-10"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.localStorage.removeItem("jobDraftId");
                  window.localStorage.removeItem("jobEditMode");
                }
                navigate(createPageUrl("PostJob"));
              }}
            >
              Post Job
            </Button>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Your Campaigns
            </h2>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => setCampaignHubTab("active")}
                className={`border-2 rounded-none text-xs sm:text-sm h-8 sm:h-10 px-3 sm:px-4 ${campaignHubTab === "active" ? "border-black bg-black text-white" : "border-gray-300"}`}
              >
                Active
              </Button>
              <Button
                variant="outline"
                onClick={() => setCampaignHubTab("pending_approval")}
                className={`border-2 rounded-none text-xs sm:text-sm h-8 sm:h-10 px-3 sm:px-4 ${campaignHubTab === "pending_approval" ? "border-black bg-black text-white" : "border-gray-300"}`}
              >
                Pending
              </Button>
              <Button
                variant="outline"
                onClick={() => setCampaignHubTab("completed")}
                className={`border-2 rounded-none text-xs sm:text-sm h-8 sm:h-10 px-3 sm:px-4 ${campaignHubTab === "completed" ? "border-black bg-black text-white" : "border-gray-300"}`}
              >
                Expired
              </Button>
              <Button
                variant="outline"
                onClick={() => setCampaignHubTab("jobs")}
                className={`border-2 rounded-none text-xs sm:text-sm h-8 sm:h-10 px-3 sm:px-4 ${campaignHubTab === "jobs" ? "border-black bg-black text-white" : "border-gray-300"}`}
              >
                Jobs
              </Button>
            </div>
          </div>
          {campaignHubTab === "jobs" ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                    {t("campaigns.jobs.jobPostings")}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {t("campaigns.jobs.managePublished")}
                  </p>
                </div>
                <Button
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.localStorage.removeItem("jobDraftId");
                      window.localStorage.removeItem("jobEditMode");
                    }
                    navigate(createPageUrl("PostJob"));
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-md shrink-0"
                >
                  {t("campaigns.jobs.postJobButton")}
                </Button>
              </div>
              <Card className="p-4 bg-white border border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <div className="relative">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                      <Input
                        value={jobSearch}
                        onChange={(e) => setJobSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setJobSearch("");
                        }}
                        placeholder={t("campaigns.jobs.searchPlaceholder")}
                        className="pl-9 pr-9"
                      />
                      {jobSearch && (
                        <button
                          type="button"
                          onClick={() => setJobSearch("")}
                          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                          aria-label={t("campaigns.jobs.clearSearch")}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <Select
                    value={jobStatusFilter}
                    onValueChange={setJobStatusFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="draft">
                        {t("campaigns.jobs.draft")}
                      </SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={jobCallTypeFilter}
                    onValueChange={setJobCallTypeFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Call type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All call types</SelectItem>
                      <SelectItem value="creator">Creator call</SelectItem>
                      <SelectItem value="agency">Agency call</SelectItem>
                      <SelectItem value="athlete">Athlete call</SelectItem>
                      <SelectItem value="ai_artist">AI artist call</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Card>
              {loadingBrandJobs && (
                <Card className="p-6 text-sm text-gray-600">
                  Loading job postings...
                </Card>
              )}
              {!loadingBrandJobs && brandJobs.length === 0 && (
                <Card className="p-8 text-center">
                  <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="font-semibold text-gray-800">
                    No job postings yet.
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Post your first job to start receiving applications.
                  </p>
                </Card>
              )}
              {!loadingBrandJobs &&
                brandJobs
                  .filter((job) => {
                    const status = String(job?.status || "").toLowerCase();
                    const callType = String(job?.call_type || "").toLowerCase();
                    const haystack =
                      `${job?.job_title || ""} ${job?.about_role || ""} ${callType}`.toLowerCase();
                    if (
                      jobSearch.trim() &&
                      !haystack.includes(jobSearch.trim().toLowerCase())
                    ) {
                      return false;
                    }
                    if (
                      jobStatusFilter !== "all" &&
                      status !== jobStatusFilter
                    ) {
                      return false;
                    }
                    if (
                      jobCallTypeFilter !== "all" &&
                      callType !== jobCallTypeFilter
                    ) {
                      return false;
                    }
                    return true;
                  })
                  .map((job) => (
                    <Card
                      key={job.id}
                      className="p-6 bg-white border border-slate-200 border-l-4 border-l-blue-500 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center text-lg font-semibold">
                                {String(job.job_title || job.title || "J")
                                  .trim()
                                  .slice(0, 1)
                                  .toUpperCase()}
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-gray-900">
                                  {job.job_title || job.title}
                                </h3>
                                <p className="text-sm text-gray-500">
                                  {formatJobLabel(job.location || "Remote")} •{" "}
                                  {formatJobLabel(job.job_type || "Project")}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge
                                variant="outline"
                                className={`border ${
                                  job.status === "open"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                    : job.status === "draft"
                                      ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50"
                                      : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100"
                                }`}
                              >
                                {job.status || "open"}
                              </Badge>
                              <Badge
                                variant="outline"
                                className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50"
                              >
                                {(job.call_type || "call").replace("_", " ")}
                              </Badge>
                              {job.category ? (
                                <Badge
                                  variant="outline"
                                  className="bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-50"
                                >
                                  {String(job.category).replace("_", " ")}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {job.about_role ||
                                "No role description added yet."}
                            </p>
                          </div>
                          <div className="flex flex-col items-start lg:items-end gap-2">
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-gray-500">
                              {job.budget ? (
                                <span>
                                  Budget {job.budget} {job.currency || "USD"}
                                </span>
                              ) : null}
                              {job.start_date ? (
                                <span>Start {job.start_date}</span>
                              ) : null}
                              {job.end_date ? (
                                <span>End {job.end_date}</span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <div className="pt-3 border-t border-slate-200 flex flex-wrap gap-2">
                          {job.status === "open" && (
                            <Button
                              variant="outline"
                              className="border-2 rounded-md border-red-200 text-red-600 hover:bg-red-50 flex-1 sm:flex-none"
                              disabled={!canManageJobs}
                              title={
                                !canManageJobs
                                  ? "You do not have permission to manage jobs"
                                  : ""
                              }
                              onClick={() =>
                                updateJobStatus(String(job.id), "closed")
                              }
                            >
                              Close Job
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            className="border-2 rounded-md flex-1 sm:flex-none"
                            onClick={() =>
                              setSelectedJobForApplications({
                                ...job,
                                _showDetailsOnly: true,
                              })
                            }
                          >
                            View Details
                          </Button>
                          <Button
                            variant="outline"
                            className="border-2 rounded-md flex-1 sm:flex-none"
                            onClick={async () => {
                              setSelectedJobForApplications(job);
                              setLoadingJobApplications(true);
                              try {
                                const res = await base44.get<{
                                  applications?: any[];
                                }>(`/api/jobs/${job.id}/applications`);
                                setSelectedJobApplications(
                                  Array.isArray(res?.applications)
                                    ? res.applications
                                    : [],
                                );
                              } catch {
                                setSelectedJobApplications([]);
                              } finally {
                                setLoadingJobApplications(false);
                              }
                            }}
                          >
                            View Applications
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
              {!loadingBrandJobs &&
                brandJobs.length > 0 &&
                brandJobs.filter((job) => {
                  const status = String(job?.status || "").toLowerCase();
                  const callType = String(job?.call_type || "").toLowerCase();
                  const haystack =
                    `${job?.job_title || ""} ${job?.about_role || ""} ${callType}`.toLowerCase();
                  if (
                    jobSearch.trim() &&
                    !haystack.includes(jobSearch.trim().toLowerCase())
                  )
                    return false;
                  if (jobStatusFilter !== "all" && status !== jobStatusFilter)
                    return false;
                  if (
                    jobCallTypeFilter !== "all" &&
                    callType !== jobCallTypeFilter
                  )
                    return false;
                  return true;
                }).length === 0 && (
                  <Card className="p-8 text-center">
                    <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="font-semibold text-gray-800">
                      No results found
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Try different keywords or adjust your filters.
                    </p>
                    {jobSearch && (
                      <button
                        type="button"
                        onClick={() => setJobSearch("")}
                        className="mt-3 text-sm text-blue-600 hover:underline"
                      >
                        Clear search
                      </button>
                    )}
                  </Card>
                )}
            </div>
          ) : (
            <div className="space-y-4">
              {campaignsForHub.map((campaign) => (
                <Card
                  key={campaign.id}
                  className="p-6 bg-white border-2 border-gray-200 rounded-none"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {campaign.name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {campaign.creators.join(", ")}
                      </p>
                    </div>
                    <Button variant="outline" className="border-2 rounded-md">
                      View Details
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStudio = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            {t("assetLibrary.title")}
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            {t("assetLibrary.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="border-2 border-gray-300 h-9 px-3 text-xs sm:text-sm"
            onClick={handleBatchDownload}
            disabled={selectedAssetIds.size === 0 || isBatchDownloading}
          >
            {isBatchDownloading ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-1.5" />
            )}
            {t("assetLibrary.actions.batchDownload")}
            {selectedAssetIds.size > 0 ? ` (${selectedAssetIds.size})` : ""}
          </Button>
          <Button
            variant="outline"
            className="border-2 border-gray-300 h-9 px-3 text-xs sm:text-sm"
            onClick={() => setShowFilterDialog(true)}
          >
            <Filter className="w-4 h-4 mr-1.5" />
            {t("assetLibrary.actions.filter")}
          </Button>
          <Button
            variant="outline"
            className="border-2 border-gray-300 h-9 px-3 text-xs sm:text-sm"
            onClick={handleRefreshAssets}
            disabled={studioLoading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-1.5 ${studioLoading ? "animate-spin" : ""}`}
            />
            {t("assetLibrary.actions.refresh")}
          </Button>
        </div>
      </div>

      {/* Asset Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Total Assets</p>

          <p className="text-3xl font-bold text-gray-900">
            {studioStats.total}
          </p>
        </Card>
        <Card className="p-4 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">
            {t("assetLibrary.stats.videos")}
          </p>
          <p className="text-3xl font-bold text-gray-900">
            {studioStats.videos}
          </p>
        </Card>
        <Card className="p-4 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">
            {t("assetLibrary.stats.images")}
          </p>
          <p className="text-3xl font-bold text-gray-900">
            {studioStats.images}
          </p>
        </Card>
        <Card className="p-4 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">
            {t("assetLibrary.stats.totalSize")}
          </p>
          <p className="text-3xl font-bold text-gray-900">
            {formatBytes(studioStats.totalSize)}
          </p>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <Card className="p-3 sm:p-4 bg-white border border-gray-200">
        <div className="flex flex-wrap gap-2">
          <div className="flex-1 min-w-[140px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={t("assetLibrary.searchPlaceholder")}
              className="pl-9 border-2 border-gray-300 h-9 text-sm"
              value={studioSearchQuery}
              onChange={(e) => setStudioSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-1.5">
            <Button
              variant={studioSourceFilter === "all" ? "default" : "outline"}
              onClick={() => setStudioSourceFilter("all")}
              className="border-2 border-gray-300 h-9 px-3 text-xs sm:text-sm"
            >
              {t("assetLibrary.filters.all")}
            </Button>
            <Button
              variant={
                studioSourceFilter === "studio_generation"
                  ? "default"
                  : "outline"
              }
              onClick={() => setStudioSourceFilter("studio_generation")}
              className="border-2 border-gray-300 h-9 px-3 text-xs sm:text-sm"
            >
              {t("assetLibrary.filters.studio")}
            </Button>
          </div>
          <div className="flex gap-1.5">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              onClick={() => setViewMode("grid")}
              className="border-2 border-gray-300 h-9 px-3 text-xs sm:text-sm"
            >
              {t("assetLibrary.actions.grid")}
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              onClick={() => setViewMode("list")}
              className="border-2 border-gray-300 h-9 px-3 text-xs sm:text-sm"
            >
              {t("assetLibrary.actions.list")}
            </Button>
          </div>
        </div>
      </Card>

      {/* Asset Grid */}
      {studioLoading ? (
        <Card className="col-span-3 p-12 bg-white border border-gray-200 text-center">
          <Loader2 className="w-8 h-8 text-gray-400 mx-auto mb-3 animate-spin" />
          <p className="text-gray-500">{t("assetLibrary.loading")}</p>
        </Card>
      ) : studioAssets.length === 0 ? (
        <Card className="col-span-3 p-12 bg-white border border-gray-200 text-center">
          <p className="text-gray-500">{t("assetLibrary.emptyState")}</p>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
          {displayedAssets.map((asset) => (
            <Card
              key={asset.id}
              className="overflow-hidden border border-gray-200 hover:border-indigo-300 transition-colors"
            >
              <div className="aspect-video bg-gray-100 relative group">
                {asset.mime_type.startsWith("image/") ? (
                  <img
                    src={asset.url}
                    alt={asset.file_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={asset.url}
                    className="w-full h-full object-cover"
                    controls
                  />
                )}
                <div className="absolute top-2 left-2 flex items-center gap-2">
                  <Checkbox
                    checked={selectedAssetIds.has(asset.id)}
                    onCheckedChange={() => toggleAssetSelection(asset.id)}
                    className="bg-white/90 border-white data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                  />
                  {asset.source_type === "studio_generation" && (
                    <Badge className="bg-purple-600 text-white">Studio</Badge>
                  )}
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-white/90 hover:bg-white"
                    onClick={() => handleDownloadAsset(asset)}
                    disabled={activeDownloads.has(asset.id)}
                  >
                    {activeDownloads.has(asset.id) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-white/90 hover:bg-red-50 text-red-600 hover:text-red-700"
                    onClick={() => handleDeleteAsset(asset)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {asset.file_name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatBytes(asset.size_bytes)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border border-gray-200">
          <div className="divide-y divide-gray-100">
            <div className="flex items-center gap-4 p-4 bg-gray-50">
              <Checkbox
                checked={
                  displayedAssets.length > 0 &&
                  selectedAssetIds.size === displayedAssets.length
                }
                onCheckedChange={selectAllAssets}
              />
              <span className="text-sm text-gray-500">
                {t("assetLibrary.collectionsCount", {
                  count: displayedAssets.length,
                })}
              </span>
            </div>
            {displayedAssets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center gap-4 p-4 hover:bg-gray-50"
              >
                <Checkbox
                  checked={selectedAssetIds.has(asset.id)}
                  onCheckedChange={() => toggleAssetSelection(asset.id)}
                />
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  {asset.mime_type.startsWith("image/") ? (
                    <img
                      src={asset.url}
                      alt={asset.file_name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Video className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {asset.file_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatBytes(asset.size_bytes)} ·{" "}
                    {new Date(asset.created_at).toLocaleDateString()}
                  </p>
                </div>
                {asset.source_type === "studio_generation" && (
                  <Badge className="bg-purple-100 text-purple-700">
                    Studio
                  </Badge>
                )}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownloadAsset(asset)}
                    disabled={activeDownloads.has(asset.id)}
                  >
                    {activeDownloads.has(asset.id) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDeleteAsset(asset)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Organization Features */}
      <Card className="p-6 bg-white border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Collections</h3>

        <div className="flex gap-3 flex-wrap">
          <Button
            variant="outline"
            className="border-2 border-gray-300"
            onClick={() => setShowCreateCollectionDialog(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t("assetLibrary.actions.createCollection")}
          </Button>
          {collections.map((collection) => (
            <Badge
              key={collection.id}
              className={`px-4 py-2 cursor-pointer border border-gray-300 ${
                selectedCollectionId === collection.id
                  ? "bg-indigo-100 text-indigo-700 border-indigo-300"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              onClick={() => handleSelectCollection(collection.id)}
            >
              {collection.name} ({collection.assetIds.length} assets)
            </Badge>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          {t("campaigns.analytics.title")}
        </h1>
        <p className="text-gray-600">{t("campaigns.analytics.subtitle")}</p>
      </div>

      {/* Top KPI Section */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-4 sm:p-6 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">
            {t("campaigns.analytics.totalProjectsYtd")}
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">
            {brandAnalytics.loading ? "—" : brandAnalytics.total_projects_ytd}
          </p>
        </Card>
        <Card className="p-4 sm:p-6 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">
            {t("campaigns.analytics.totalSpendYtd")}
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">
            {billingYtdSpend > 0
              ? currencyFormatter.format(billingYtdSpend / 100)
              : "$0"}
          </p>
        </Card>
        <Card className="p-4 sm:p-6 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">
            {t("campaigns.analytics.avgCostPerProject")}
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">
            {billingYtdSpend > 0 && brandAnalytics.total_projects_ytd > 0
              ? currencyFormatter.format(
                  billingYtdSpend / 100 / brandAnalytics.total_projects_ytd,
                )
              : "$0"}
          </p>
        </Card>
      </div>

      {/* Talent Performance */}
      <Card className="p-6 bg-white border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">
            {t("campaigns.analytics.talentPerformance")}
          </h3>
          <Button
            variant="outline"
            className="border-2 border-gray-300"
            onClick={() => {
              const sanitizeCsvField = (value: string): string => {
                const needsQuoting =
                  /[,"\n\r]/.test(value) || /^[=+\-@]/.test(value.trim());
                if (needsQuoting) {
                  const safeValue = /^[=+\-@]/.test(value.trim())
                    ? `'${value}`
                    : value;
                  return `"${safeValue.replace(/"/g, '""')}"`;
                }
                return value;
              };
              const header =
                "Metric,Value\nTotal Projects (YTD),{projects}\nTotal Spend (YTD),{spend}\nAvg Cost/Project,{avgCost}\n\nTalent,Projects,Success Rate (%),Total Cost ($)\n";
              const talentRows = brandAnalytics.talent_performance
                .map((t: any) => {
                  const name = sanitizeCsvField(String(t?.name || "Talent"));
                  const projects = Number(t?.projects_count || 0);
                  const successRate = Number(t?.success_rate_pct || 0);
                  const totalCostCents = Number(t?.total_cost_cents || 0);
                  const totalCostDollars = (totalCostCents / 100).toFixed(2);
                  return `${name},${projects},${successRate},${totalCostDollars}`;
                })
                .join("\n");
              const monthlyRows =
                brandSpendData?.monthly_spend &&
                brandSpendData.monthly_spend.length > 0
                  ? "\n\nMonth,Spend ($)\n" +
                    brandSpendData.monthly_spend
                      .map(
                        (d: any) =>
                          `${sanitizeCsvField(d.month)},${(d.spend / 100).toFixed(2)}`,
                      )
                      .join("\n")
                  : "";
              const totalProjects = brandAnalytics.total_projects_ytd;
              const totalSpend =
                billingYtdSpend > 0
                  ? (billingYtdSpend / 100).toFixed(2)
                  : "0.00";
              const avgCost =
                billingYtdSpend > 0 && totalProjects > 0
                  ? (billingYtdSpend / 100 / totalProjects).toFixed(2)
                  : "0.00";
              const csv =
                header
                  .replace("{projects}", String(totalProjects))
                  .replace("{spend}", totalSpend)
                  .replace("{avgCost}", avgCost) +
                talentRows +
                monthlyRows;
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `brand-analytics-report-${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            {t("campaigns.analytics.exportReport")}
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  {t("campaigns.analytics.talent")}
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  {t("campaigns.analytics.projects")}
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  {t("campaigns.analytics.successRate")}
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  {t("campaigns.analytics.totalCost")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {brandAnalytics.loading && (
                <tr>
                  <td className="px-4 py-4 text-sm text-gray-600" colSpan={4}>
                    {t("campaigns.analytics.loadingTalentPerformance")}
                  </td>
                </tr>
              )}
              {!brandAnalytics.loading &&
                brandAnalytics.talent_performance.length === 0 && (
                  <tr>
                    <td className="px-4 py-4 text-sm text-gray-600" colSpan={4}>
                      {t("campaigns.analytics.noTalentPerformance")}
                    </td>
                  </tr>
                )}
              {!brandAnalytics.loading &&
                brandAnalytics.talent_performance.map(
                  (talent: any, idx: number) => {
                    const name = String(talent?.name || "Talent");
                    const imageUrl = String(talent?.image_url || "").trim();
                    const projectsCount = Number(talent?.projects_count || 0);
                    const successRate = Number(talent?.success_rate_pct || 0);
                    return (
                      <tr
                        key={`${talent?.target_type || "talent"}-${talent?.target_id || name}`}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                                {name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-gray-900">
                                {name}
                              </p>
                              {idx < 3 && (
                                <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-300 text-xs mt-1">
                                  {t("campaigns.analytics.topPerformer")}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-gray-900">
                          {projectsCount}
                        </td>
                        <td className="px-4 py-4 text-green-600 font-semibold">
                          {projectsCount > 0 ? `${successRate}%` : "—"}
                        </td>
                        <td className="px-4 py-4 font-bold text-gray-900">
                          {talent.total_cost_cents != null &&
                          Number(talent.total_cost_cents) > 0
                            ? currencyFormatter.format(
                                Number(talent.total_cost_cents) / 100,
                              )
                            : "—"}
                        </td>
                      </tr>
                    );
                  },
                )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Charts */}
      <div className="grid md:grid-cols-1 gap-6">
        <Card className="p-6 bg-white border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {t("campaigns.analytics.spendByMonth")}
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart
              data={
                brandSpendData?.monthly_spend &&
                brandSpendData.monthly_spend.length > 0
                  ? brandSpendData.monthly_spend.map((d) => ({
                      month: d.month,
                      spend: d.spend / 100,
                    }))
                  : []
              }
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => [
                  `$${Number(value || 0).toLocaleString()}`,
                  t("campaigns.analytics.totalSpend"),
                ]}
              />
              <Line
                type="monotone"
                dataKey="spend"
                stroke="#F7B750"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Budget Tracking */}
      <Card className="p-6 bg-white border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {t("campaigns.analytics.budgetForecast")}
        </h3>
        {loadingBillingData ? (
          <div className="p-4 text-center text-gray-500">
            {t("campaigns.analytics.loadingBudgetForecast")}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">
                {t("campaigns.analytics.ytdSpend")}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {billingYtdSpend > 0
                  ? currencyFormatter.format(billingYtdSpend / 100)
                  : "$0"}
              </p>
            </div>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">
                {t("campaigns.analytics.monthlyAvg")}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {billingMonthlyAvg > 0
                  ? currencyFormatter.format(billingMonthlyAvg / 100)
                  : "$0"}
              </p>
            </div>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">
                {t("campaigns.analytics.projectedEoy")}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {billingProjectedEoy > 0
                  ? currencyFormatter.format(billingProjectedEoy / 100)
                  : "$0"}
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );

  const renderContractDetail = () => {
    // Contracts are now loaded from real API data
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setSelectedContract(null)}
            className="border-2 border-gray-300"
          >
            {t("campaigns.contractHub.backToHub")}
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              {contract.project_name}
            </h1>
            <p className="text-gray-600">
              {t("campaigns.contractHub.contractDetails")}
            </p>
          </div>
        </div>

        {/* Contract Actions Bar */}
        <div className="flex gap-3">
          <Button variant="outline" className="border-2 border-gray-300">
            <Download className="w-4 h-4 mr-2" />
            {t("campaigns.contractHub.actions.downloadPdf")}
          </Button>
          <Button variant="outline" className="border-2 border-gray-300">
            <Download className="w-4 h-4 mr-2" />
            {t("campaigns.contractHub.actions.downloadWord")}
          </Button>
          <Button variant="outline" className="border-2 border-gray-300">
            <Send className="w-4 h-4 mr-2" />
            {t("campaigns.contractHub.actions.email")}
          </Button>
          <Button variant="outline" className="border-2 border-gray-300">
            <Copy className="w-4 h-4 mr-2" />
            {t("campaigns.contractHub.actions.print")}
          </Button>
        </div>

        {/* Project Overview */}
        <Card className="p-6 bg-white border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-6">
            {t("campaigns.contractHub.projectOverview")}
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">
                  {t("campaigns.contractHub.fields.project")}:
                </span>
                <span className="font-semibold text-gray-900">
                  {contract.project_name}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">
                  {t("campaigns.contractHub.fields.creator")}:
                </span>
                <span className="font-semibold text-gray-900">
                  {contract.creator_name} ({contract.creator_handle})
                </span>
              </div>
              {contract.agency && (
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">
                    {t("campaigns.contractHub.fields.agency")}:
                  </span>
                  <span className="font-semibold text-gray-900">
                    {contract.agency}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">
                  {t("campaigns.contractHub.fields.status")}:
                </span>
                <Badge
                  className={
                    contract.status === "signed"
                      ? "bg-green-100 text-green-700 border border-green-300"
                      : "bg-yellow-100 text-yellow-700 border border-yellow-300"
                  }
                >
                  {contract.status === "signed"
                    ? `✓ ${t("statuses.signed")}`
                    : `⏳ ${t("campaigns.contractHub.tabs.pendingSignature")}`}
                </Badge>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              {contract.signed_date && (
                <>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Signed:</span>
                    <span className="font-semibold text-gray-900">
                      {new Date(contract.signed_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Expires:</span>
                    <span className="font-semibold text-gray-900">
                      {new Date(contract.expiration_date).toLocaleDateString()}{" "}
                      ({contract.duration_days} days)
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Version:</span>
                <span className="font-semibold text-gray-900">
                  {contract.version}
                </span>
              </div>
              {contract.docusign_envelope_id && (
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">DocuSign ID:</span>
                  <span className="font-mono text-xs text-gray-900">
                    {contract.docusign_envelope_id}
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Contract Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setContractDetailTab("summary")}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
              contractDetailTab === "summary"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Summary
          </button>
          <button
            onClick={() => setContractDetailTab("full_text")}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
              contractDetailTab === "full_text"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Full Text
          </button>
          <button
            onClick={() => setContractDetailTab("custom")}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
              contractDetailTab === "custom"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Custom Clauses{" "}
            {contract.custom_clauses.length > 0 &&
              `(${contract.custom_clauses.length})`}
          </button>
          <button
            onClick={() => setContractDetailTab("history")}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
              contractDetailTab === "history"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            History
          </button>
        </div>

        {/* Tab Content */}
        {contractDetailTab === "summary" && (
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              Terms at a Glance
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Territory</p>
                <p className="font-semibold text-gray-900">
                  {contract.territory}
                </p>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Duration</p>
                <p className="font-semibold text-gray-900">
                  {contract.duration_days} days
                </p>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Auto-Renew</p>
                <p className="font-semibold text-gray-900">
                  {contract.auto_renew ? "Yes" : "No"}
                </p>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Channels</p>
                <p className="font-semibold text-gray-900">
                  {contract.channels.join(", ")}
                </p>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Revisions</p>
                <p className="font-semibold text-gray-900">
                  {contract.revisions} rounds
                </p>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Exclusivity</p>
                <p className="font-semibold text-gray-900">
                  {contract.exclusivity}
                </p>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-300 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Total Fee</p>
                <p className="text-xl font-bold text-gray-900">
                  ${contract.total_fee.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-green-50 border border-green-300 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Creator Earns</p>
                <p className="text-xl font-bold text-gray-900">
                  ${contract.creator_earnings.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Payment</p>
                <Badge
                  className={
                    contract.payment_status === "released"
                      ? "bg-green-500 text-white"
                      : "bg-yellow-500 text-white"
                  }
                >
                  {contract.payment_status === "released"
                    ? "✓ Released"
                    : t("dashboard.home.stats.inEscrow")}
                </Badge>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="font-semibold text-gray-900 mb-2">Deliverables</p>
              <p className="text-gray-700">{contract.deliverables}</p>
            </div>

            {contract.custom_clauses.length > 0 && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
                <p className="font-semibold text-gray-900">
                  Custom Clauses: {contract.custom_clauses.length}
                </p>
              </div>
            )}
          </Card>
        )}

        {contractDetailTab === "full_text" && (
          <Card className="p-8 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Official Legal Document
              </h3>
              <Button variant="outline" className="border-2 border-gray-300">
                <Copy className="w-4 h-4 mr-2" />
                Copy All Text
              </Button>
            </div>

            <div className="prose max-w-none">
              <div className="text-center mb-8 pb-6 border-b-2 border-gray-300">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  LIKELEE VERIFIED LICENSE AGREEMENT
                </h1>
                <p className="text-sm text-gray-600">
                  Contract ID:{" "}
                  {contract.docusign_envelope_id || `LK-${contract.id}-2024`}
                </p>
              </div>

              <p className="mb-6">
                This Agreement is made on{" "}
                <strong>
                  {new Date(contract.created_date).toLocaleDateString()}
                </strong>
                , by and between <strong>{brand?.name || "Brand"}</strong>{" "}
                ("Licensee") and <strong>{contract.creator_name}</strong>{" "}
                ("Licensor").
              </p>

              <p className="mb-6">
                <strong>WHEREAS,</strong> Licensor has created original content;
                and Licensee desires to license such content for commercial
                purposes;
              </p>

              <p className="mb-8">
                <strong>NOW, THEREFORE,</strong> in consideration of the mutual
                covenants and agreements contained herein, the parties agree as
                follows:
              </p>

              <h3 className="text-lg font-bold text-gray-900 mb-4">
                1. LICENSED CONTENT
              </h3>
              <p className="mb-6">
                The Licensor grants to the Licensee a non-exclusive license to
                use the following content:{" "}
                <strong>{contract.deliverables}</strong>
              </p>

              <h3 className="text-lg font-bold text-gray-900 mb-4">
                2. TERRITORY & DURATION
              </h3>
              <p className="mb-2">
                <strong>Territory:</strong> {contract.territory}
              </p>
              <p className="mb-2">
                <strong>Duration:</strong> This license is effective for a
                period of {contract.duration_days} days from the Effective Date
                (
                {new Date(
                  contract.signed_date || contract.created_date,
                ).toLocaleDateString()}{" "}
                to {new Date(contract.expiration_date).toLocaleDateString()}).
              </p>
              <p className="mb-6">
                <strong>Auto-Renewal:</strong>{" "}
                {contract.auto_renew
                  ? "Yes - Creator determines renewal terms and pricing"
                  : "No - One-time license only"}
              </p>

              <h3 className="text-lg font-bold text-gray-900 mb-4">
                3. USAGE RIGHTS
              </h3>
              <p className="mb-2">
                <strong>Permitted Channels:</strong>
              </p>
              <ul className="list-disc pl-6 mb-6">
                {contract.channels.map((channel, idx) => (
                  <li key={idx}>{channel}</li>
                ))}
              </ul>

              <h3 className="text-lg font-bold text-gray-900 mb-4">
                4. REVISIONS & MODIFICATIONS
              </h3>
              <p className="mb-6">
                <strong>Included:</strong> {contract.revisions} rounds of
                revisions. Additional revisions requested beyond this may incur
                additional fees.
              </p>

              <h3 className="text-lg font-bold text-gray-900 mb-4">
                5. FINANCIAL TERMS
              </h3>
              <p className="mb-2">
                <strong>License Fee:</strong> $
                {contract.total_fee.toLocaleString()}
              </p>
              <p className="mb-2">
                <strong>Platform Fee:</strong> $
                {contract.platform_fee.toLocaleString()} (10%)
              </p>
              <p className="mb-2">
                <strong>Creator Compensation:</strong> $
                {contract.creator_earnings.toLocaleString()}
              </p>
              <p className="mb-6">
                <strong>Payment:</strong> Funds are held in a secure neutral
                balance. Payment is released upon your manual review and
                approval of deliverables.
              </p>

              <h3 className="text-lg font-bold text-gray-900 mb-4">
                6. REVOCATION & TERMINATION
              </h3>
              <p className="mb-6">
                Licensor may revoke this license with thirty (30) days written
                notice. Upon revocation or expiration, Licensee must cease use
                of the licensed content within said notice period.
              </p>

              <h3 className="text-lg font-bold text-gray-900 mb-4">
                7. REPRESENTATIONS & WARRANTIES
              </h3>
              <p className="mb-2">
                Licensor represents that they have full authority to grant these
                rights.
              </p>
              <p className="mb-6">
                Licensor warrants the content is original and does not infringe
                third-party rights.
              </p>

              <h3 className="text-lg font-bold text-gray-900 mb-4">
                8. LIMITATION OF LIABILITY
              </h3>
              <p className="mb-8">
                Likelee acts as intermediary and is not liable for disputes
                between parties. All disputes shall be resolved through
                mediation.
              </p>

              <div className="mt-8 pt-6 border-t-2 border-gray-300">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  SIGNATURES
                </h3>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="p-4 bg-gray-50 border-2 border-gray-300 rounded-lg">
                    <p className="font-semibold text-gray-900 mb-2">
                      {contract.creator_name}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">Licensor</p>
                    {contract.signed_date && (
                      <>
                        <p className="text-xs text-gray-500 mb-2">
                          Signed:{" "}
                          {new Date(contract.signed_date).toLocaleDateString()}
                        </p>
                        <Badge className="bg-green-500 text-white">
                          ✓ Signed via DocuSign
                        </Badge>
                      </>
                    )}
                  </div>
                  <div className="p-4 bg-gray-50 border-2 border-gray-300 rounded-lg">
                    <p className="font-semibold text-gray-900 mb-2">
                      {brand?.name || "Brand"}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">Licensee</p>
                    {contract.signed_date && (
                      <>
                        <p className="text-xs text-gray-500 mb-2">
                          Signed:{" "}
                          {new Date(contract.signed_date).toLocaleDateString()}
                        </p>
                        <Badge className="bg-green-500 text-white">
                          ✓ Signed via DocuSign
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {contractDetailTab === "custom" && (
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              Custom Clauses
            </h3>
            {contract.custom_clauses.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  No custom clauses in this contract
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  This contract uses standard Likelee terms only
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {contract.custom_clauses.map((clause, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                      <p className="font-semibold text-gray-900">
                        {clause.type}: {clause.name}
                      </p>
                    </div>
                    <p className="text-gray-700 text-sm italic">
                      "{clause.text}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {contractDetailTab === "history" && (
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              Contract Versions & Audit Trail
            </h3>

            <div className="mb-8">
              <h4 className="font-semibold text-gray-900 mb-4">Versions</h4>
              <div className="space-y-3">
                <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-500 text-white">
                        Version {contract.version} (Current - Active)
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-2 border-gray-300"
                    >
                      {t("campaigns.myOffers.view")}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-700 mb-1">
                    Created:{" "}
                    {new Date(contract.created_date).toLocaleDateString()}
                  </p>
                  {contract.signed_date && (
                    <p className="text-sm text-gray-700 mb-1">
                      Signed:{" "}
                      {new Date(contract.signed_date).toLocaleDateString()}
                    </p>
                  )}
                  <p className="text-sm text-gray-600">
                    Changes: (Initial version)
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Audit Trail</h4>
              <div className="space-y-2">
                {contract.signed_date && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(contract.signed_date).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-700">
                      {t("campaigns.contractHub.audit.contractFullySigned")}
                    </p>
                    <p className="text-xs text-gray-500">
                      DocuSign Envelope: {contract.docusign_envelope_id}
                    </p>
                  </div>
                )}
                {contract.payment_release_date && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(contract.payment_release_date).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-700">
                      Payment released from escrow
                    </p>
                    <p className="text-xs text-gray-500">
                      Stripe Transaction: {contract.stripe_payout_id}
                    </p>
                  </div>
                )}
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm font-semibold text-gray-900">
                    {new Date(contract.created_date).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-700">
                    Contract created and sent to {contract.creator_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    Created by: {brand?.name || "Brand"}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Payment & Escrow Status */}
        {contract.payment_status === "released" && (
          <Card className="p-6 bg-green-50 border-2 border-green-300">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Payment & Escrow Status
            </h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600 mb-1">Total Fee:</p>
                <p className="font-bold text-gray-900">
                  ${contract.total_fee.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Platform Fee:</p>
                <p className="font-semibold text-gray-900">
                  -${contract.platform_fee.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Creator Earnings:</p>
                <p className="font-bold text-green-600">
                  ${contract.creator_earnings.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-green-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">
                    Escrow Status: ✓ Released
                  </p>
                  <p className="text-sm text-gray-600">
                    Released:{" "}
                    {new Date(
                      contract.payment_release_date,
                    ).toLocaleDateString()}
                  </p>
                </div>
                <Badge className="bg-green-500 text-white">Completed</Badge>
              </div>
              {contract.stripe_payout_id && (
                <p className="text-xs text-gray-500 mt-2">
                  Stripe Payout ID: {contract.stripe_payout_id}
                </p>
              )}
            </div>
          </Card>
        )}
      </div>
    );
  };

  const renderContractHub = () => {
    if (selectedContract) {
      return renderContractDetail();
    }

    // Aggregate all contracts from brandOfferItems (already loaded with offer_contracts)
    const allContracts = (
      Array.isArray(brandOfferItems) ? brandOfferItems : []
    ).flatMap((offer: any) => {
      const contracts = Array.isArray(offer?.offer_contracts)
        ? offer.offer_contracts
        : [];
      return contracts.map((c: any) => ({
        ...c,
        offer_title:
          offer?.offer_title || offer?.brand_campaigns?.name || "Offer",
        brand_name: offer?.brands?.company_name || "",
        target_type: offer?.target_type || "",
        target_name:
          offer?.agencies?.agency_name || offer?.creators?.full_name || "",
        budget_snapshot: offer?.budget_snapshot || {},
        offer_id: offer?.id || "",
      }));
    });

    const activeContracts = allContracts.filter(
      (c: any) =>
        String(c?.docuseal_status || "").toLowerCase() === "completed",
    );
    const pendingContracts = allContracts.filter((c: any) => {
      const s = String(c?.docuseal_status || "").toLowerCase();
      return s === "sent" || s === "pending" || s === "awaiting_signatures";
    });

    const contractsForTab =
      contractHubTab === "active"
        ? activeContracts
        : contractHubTab === "pending"
          ? pendingContracts
          : allContracts;

    // Client-side search + sort (all data already in memory)
    const contractsFiltered = contractsForTab.filter((c: any) => {
      if (!contractSearch.trim()) return true;
      const q = contractSearch.toLowerCase();
      return (
        String(c?.title || c?.offer_title || "")
          .toLowerCase()
          .includes(q) ||
        String(c?.target_name || "")
          .toLowerCase()
          .includes(q) ||
        String(c?.brand_name || "")
          .toLowerCase()
          .includes(q)
      );
    });

    const contractsSorted = [...contractsFiltered].sort((a: any, b: any) => {
      if (contractSort === "oldest") {
        return (
          new Date(a?.sent_at || 0).getTime() -
          new Date(b?.sent_at || 0).getTime()
        );
      }
      // newest (default)
      return (
        new Date(b?.sent_at || 0).getTime() -
        new Date(a?.sent_at || 0).getTime()
      );
    });

    const statusBadge = (c: any) => {
      const s = String(c?.docuseal_status || "").toLowerCase();
      if (s === "completed")
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            ✓ {t("campaigns.contractHub.status.completed")}
          </span>
        );
      if (s === "sent" || s === "awaiting_signatures")
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            ⏳ {t("campaigns.contractHub.status.awaiting_signatures")}
          </span>
        );
      if (s === "draft")
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
            {t("campaigns.jobs.draft")}
          </span>
        );
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
          {c?.docuseal_status || "Unknown"}
        </span>
      );
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Contract Hub
            </h1>
            <p className="text-gray-600">
              All your verified licensing agreements in one place
            </p>
          </div>
        </div>

        {/* Search & Sort */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={t("campaigns.contractHub.searchPlaceholder")}
              value={contractSearch}
              onChange={(e) => setContractSearch(e.target.value)}
              className="pl-9 h-9 text-sm border-gray-200"
            />
          </div>
          <Select value={contractSort} onValueChange={setContractSort}>
            <SelectTrigger className="w-40 h-9 text-sm border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">
                {t("campaigns.contractHub.sort.newestFirst")}
              </SelectItem>
              <SelectItem value="oldest">
                {t("campaigns.contractHub.sort.oldestFirst")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {[
            {
              key: "active",
              label: t("campaigns.contractHub.tabs.active"),
              count: activeContracts.length,
            },
            {
              key: "pending",
              label: t("campaigns.contractHub.tabs.pendingSignature"),
              count: pendingContracts.length,
            },
            {
              key: "all",
              label: t("campaigns.contractHub.tabs.allContracts"),
              count: allContracts.length,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setContractHubTab(tab.key)}
              className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                contractHubTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1.5 text-xs font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Contract list */}
        {loadingBrandOfferItems ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">
              {t("campaigns.contractHub.loading")}
            </span>
          </div>
        ) : contractsSorted.length === 0 ? (
          <div className="py-16 text-center">
            {contractSearch.trim() ? (
              <>
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-base font-semibold text-gray-700">
                  No results
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  No contracts match &ldquo;{contractSearch}&rdquo;
                </p>
              </>
            ) : contractHubTab === "pending" ? (
              <>
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <p className="text-base font-semibold text-gray-700">
                  {t("campaigns.contractHub.allContractsSigned")}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {t("campaigns.contractHub.noPendingSignatures")}
                </p>
              </>
            ) : (
              <>
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-base font-semibold text-gray-700">
                  {t("campaigns.contractHub.noContractsYet")}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {t("campaigns.contractHub.contractsWillAppear")}
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {contractsSorted.map((contract: any) => {
              const sentAt = contract?.sent_at
                ? new Date(contract.sent_at).toLocaleDateString()
                : "—";
              const budget = contract?.budget_snapshot?.budget_total
                ? `$${Number(String(contract.budget_snapshot.budget_total).replace(/,/g, "")).toLocaleString()}`
                : "—";
              return (
                <div
                  key={contract.id}
                  className="p-5 rounded-xl border border-gray-200 bg-white hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-900 truncate">
                          {contract.title || contract.offer_title || "Contract"}
                        </span>
                        {statusBadge(contract)}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                        {contract.target_name && (
                          <span>
                            {contract.target_type === "agency"
                              ? t("campaigns.campaignDetails.agency")
                              : t("campaigns.campaignDetails.creator")}
                            :{" "}
                            <span className="font-medium text-gray-700">
                              {contract.target_name}
                            </span>
                          </span>
                        )}
                        <span>
                          {t("campaigns.contractHub.table.sentDate")}:{" "}
                          <span className="font-medium text-gray-700">
                            {sentAt}
                          </span>
                        </span>
                        <span>
                          {t("campaigns.campaignDetails.budget")}:{" "}
                          <span className="font-medium text-gray-700">
                            {budget}
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {contract.file_url && (
                        <a
                          href={contract.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderUsageRights = () => {
    if (selectedContract) {
      return renderContractDetail();
    }

    // ── Derive real data from already-loaded state ──────────────────────────

    // Approved licensing requests = active licenses
    const approvedLicenses = (
      Array.isArray(brandLicensingRequests) ? brandLicensingRequests : []
    ).filter((r: any) => String(r?.status || "").toLowerCase() === "approved");

    // Expiring within 15 days
    const today = new Date();
    const in15 = new Date(today);
    in15.setDate(in15.getDate() + 15);
    const expiringLicensesReal = approvedLicenses.filter((r: any) => {
      const end = r?.license_end_date ? new Date(r.license_end_date) : null;
      return end && end >= today && end <= in15;
    });

    const displayLicenses =
      usageRightsTab === "expiring" ? expiringLicensesReal : approvedLicenses;

    const licenseStatusBadge = (r: any) => {
      const end = r?.license_end_date ? new Date(r.license_end_date) : null;
      if (!end) return <span className="text-xs text-gray-400">—</span>;
      if (end < today)
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
            {t("dashboard.usageRightsPage.badges.expired")}
          </span>
        );
      if (end <= in15)
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            {t("dashboard.usageRightsPage.badges.expiringSoon")}
          </span>
        );
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          {t("dashboard.usageRightsPage.badges.active")}
        </span>
      );
    };

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            {t("dashboard.usageRightsPage.title")}
          </h1>
          <p className="text-gray-600">
            {t("dashboard.usageRightsPage.subtitle")}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {[
            {
              key: "licenses",
              label: t("dashboard.usageRightsPage.tabs.activeLicenses"),
            },
            {
              key: "expiring",
              label: t("dashboard.usageRightsPage.tabs.expiringSoon", {
                count: expiringLicensesReal.length,
              }),
              count: expiringLicensesReal.length,
            },
            { key: "contracts", label: t("campaigns.contractHub.title") },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setUsageRightsTab(tab.key)}
              className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                usageRightsTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <span className="ml-1.5 text-xs font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Active Licenses / Expiring Soon ── */}
        {(usageRightsTab === "licenses" || usageRightsTab === "expiring") && (
          <div className="space-y-6">
            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 rounded-xl border border-gray-200 bg-white">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  {t("dashboard.usageRightsPage.stats.activeLicenses")}
                </p>
                <p className="text-3xl font-black text-gray-900">
                  {approvedLicenses.length}
                </p>
              </div>
              <div className="p-5 rounded-xl border border-gray-200 bg-white">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  {t("dashboard.usageRightsPage.stats.expiring30d")}
                </p>
                <p
                  className={`text-3xl font-black ${expiringLicensesReal.length > 0 ? "text-amber-600" : "text-gray-900"}`}
                >
                  {expiringLicensesReal.length}
                </p>
                {expiringLicensesReal.length > 0 && (
                  <p className="text-xs text-amber-600 font-semibold mt-0.5">
                    {t("dashboard.usageRightsPage.stats.renewSoon")}
                  </p>
                )}
              </div>
            </div>

            {/* License table */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">
                  {usageRightsTab === "expiring"
                    ? t("dashboard.usageRightsPage.licenseTable.titleExpiring")
                    : t("dashboard.usageRightsPage.licenseTable.titleActive")}
                </h3>
              </div>
              {loadingBrandLicensingRequests ? (
                <div className="flex items-center justify-center py-12 gap-3 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">
                    {t("dashboard.usageRightsPage.licenseTable.loading")}
                  </span>
                </div>
              ) : displayLicenses.length === 0 ? (
                <div className="py-14 text-center">
                  <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-600">
                    {usageRightsTab === "expiring"
                      ? t(
                          "dashboard.usageRightsPage.licenseTable.emptyExpiringTitle",
                        )
                      : t(
                          "dashboard.usageRightsPage.licenseTable.emptyActiveTitle",
                        )}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {t("dashboard.usageRightsPage.licenseTable.emptySubtitle")}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        {[
                          t(
                            "dashboard.usageRightsPage.licenseTable.headers.creatorTalent",
                          ),
                          t(
                            "dashboard.usageRightsPage.licenseTable.headers.campaign",
                          ),
                          t(
                            "dashboard.usageRightsPage.licenseTable.headers.territory",
                          ),
                          t(
                            "dashboard.usageRightsPage.licenseTable.headers.usageScope",
                          ),
                          t(
                            "dashboard.usageRightsPage.licenseTable.headers.duration",
                          ),
                          t(
                            "dashboard.usageRightsPage.licenseTable.headers.expires",
                          ),
                          t(
                            "dashboard.usageRightsPage.licenseTable.headers.status",
                          ),
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {displayLicenses.map((r: any) => (
                        <tr
                          key={r.id}
                          className="hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-4 py-3 font-semibold text-gray-900">
                            {r.talent_name || r.creator_name || "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-600 truncate max-w-[160px]">
                            {r.campaign_title || "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {r.territory || "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {r.usage_scope || "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {r.duration_days ? `${r.duration_days}d` : "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {r.license_end_date
                              ? new Date(
                                  r.license_end_date,
                                ).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="px-4 py-3">{licenseStatusBadge(r)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Contract Hub ── */}
        {usageRightsTab === "contracts" && renderContractHub()}
      </div>
    );
  };

  const renderBilling = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          {t("dashboard.billingPage.title")}
        </h1>
        <p className="text-gray-600">{t("dashboard.billingPage.subtitle")}</p>
      </div>

      {/* Budget Overview - Prominent Position */}
      {budgetLimit !== null && budgetLimit > 0 && (
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-blue-900 mb-1">
                {t("dashboard.billingPage.budgetTracker.title")}
              </h3>
              <p className="text-sm text-blue-700">
                {t("dashboard.billingPage.budgetTracker.subtitle")}
              </p>
            </div>
            {budgetAlertEnabled && (
              <Badge className="bg-blue-100 text-blue-800 border border-blue-300 self-start">
                <Bell className="w-3 h-3 mr-1" />
                {t("dashboard.billingPage.budgetTracker.alertsOn")}
              </Badge>
            )}
          </div>
          <div className="mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
              <span className="text-xl sm:text-2xl font-bold text-blue-900">
                {loadingBillingData
                  ? "..."
                  : `$${((billingCurrentMonthSpend || 0) / 100).toLocaleString()}`}
              </span>
              <span className="text-lg text-blue-700">
                {t("dashboard.billingPage.budgetTracker.ofBudget", {
                  amount: budgetLimit.toLocaleString(),
                })}
              </span>
            </div>
            <Progress
              value={Math.min(
                100,
                ((billingCurrentMonthSpend || 0) / 100 / budgetLimit) * 100,
              )}
              className="h-3 bg-blue-100"
            />
            {(billingCurrentMonthSpend || 0) / 100 >= budgetLimit * 0.8 && (
              <div className="mt-3 flex items-center gap-2">
                <AlertTriangle
                  className={`w-5 h-5 ${
                    (billingCurrentMonthSpend || 0) / 100 >= budgetLimit
                      ? "text-red-600"
                      : "text-amber-600"
                  }`}
                />
                <span
                  className={`text-sm font-medium ${
                    (billingCurrentMonthSpend || 0) / 100 >= budgetLimit
                      ? "text-red-700"
                      : "text-amber-700"
                  }`}
                >
                  {(billingCurrentMonthSpend || 0) / 100 >= budgetLimit
                    ? t("dashboard.billingPage.budgetTracker.limitReached")
                    : t("dashboard.billingPage.budgetTracker.eightyPercent")}
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Billing Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-6 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">
            {t("dashboard.billingPage.overview.thisMonthSpend")}
          </p>
          <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
            {loadingBillingData
              ? "..."
              : billingCurrentMonthSpend > 0
                ? `$${(billingCurrentMonthSpend / 100000).toFixed(1)}K`
                : "$0"}
          </p>
        </Card>
        <Card className="p-6 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">
            {t("dashboard.billingPage.overview.inEscrow")}
          </p>
          <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
            {loadingBillingData ? "..." : escrowSummary.breakdown}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {t("dashboard.billingPage.overview.pendingDelivery")}
          </p>
        </Card>
        <Card className="p-6 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">
            {t("dashboard.billingPage.overview.amountSpentYtd")}
          </p>
          <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
            {loadingBillingData
              ? "..."
              : billingYtdSpend > 0
                ? `$${(billingYtdSpend / 100000).toFixed(1)}K`
                : "$0"}
          </p>
        </Card>
        {canViewSubscriptions && (
          <Card className="p-6 bg-white border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">
              {t("dashboard.billingPage.overview.nextInvoice")}
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {brandNextInvoiceDate ||
                t("dashboard.billingPage.overview.notSet")}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {brandPlanTier === "enterprise"
                ? t("dashboard.billingPage.overview.enterpriseContract")
                : (brandRecurringAmount || 0) > 0
                  ? t("dashboard.billingPage.overview.recurring", {
                      amount: brandRecurringAmount,
                    })
                  : t("dashboard.billingPage.overview.noActiveSubscription")}
            </p>
          </Card>
        )}
      </div>

      {/* Budget Management */}
      <Card
        className={`p-4 sm:p-6 border-2 ${
          budgetLimit === null || budgetLimit === 0
            ? "bg-amber-50 border-amber-300"
            : "bg-white border-gray-200"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {t("dashboard.billingPage.management.title")}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {t("dashboard.billingPage.management.subtitle")}
            </p>
          </div>
          {budgetLimit !== null && budgetLimit > 0 && budgetAlertEnabled && (
            <Badge className="bg-green-100 text-green-700 border border-green-300">
              {t("dashboard.billingPage.management.active")}
            </Badge>
          )}
        </div>

        {budgetLimit === null || budgetLimit === 0 ? (
          <div className="bg-white border border-amber-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {t("dashboard.billingPage.management.emptyTitle")}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {t("dashboard.billingPage.management.emptyDescription")}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold text-gray-700 block mb-2">
              {t("dashboard.billingPage.management.monthlyBudgetLimit")}
            </Label>
            <Input
              type="number"
              placeholder={t(
                "dashboard.billingPage.management.monthlyBudgetPlaceholder",
              )}
              className="border-2 border-gray-300 max-w-xs"
              value={budgetLimit ?? ""}
              onChange={(e) =>
                setBudgetLimit(e.target.value ? Number(e.target.value) : null)
              }
            />
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <input
              type="checkbox"
              id="budgetAlertEnabled"
              checked={budgetAlertEnabled}
              onChange={(e) => setBudgetAlertEnabled(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <Label
                htmlFor="budgetAlertEnabled"
                className="text-sm font-medium text-gray-900"
              >
                {t("dashboard.billingPage.management.enableAlerts")}
              </Label>
              <p className="text-xs text-gray-500">
                {t("dashboard.billingPage.management.enableAlertsHelp")}
              </p>
            </div>
          </div>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={savingBudgetSettings}
            onClick={async () => {
              setSavingBudgetSettings(true);
              try {
                await updateBrandBudgetSettings({
                  monthly_budget_limit: budgetLimit,
                  budget_alert_enabled: budgetAlertEnabled,
                });
                toast({
                  title: t("dashboard.billingPage.management.savedTitle"),
                  description: t(
                    "dashboard.billingPage.management.savedDescription",
                  ),
                });
              } catch {
                toast({
                  title: t("dashboard.billingPage.management.errorTitle"),
                  description: t(
                    "dashboard.billingPage.management.errorDescription",
                  ),
                  variant: "destructive",
                });
              } finally {
                setSavingBudgetSettings(false);
              }
            }}
          >
            {savingBudgetSettings
              ? t("dashboard.billingPage.management.saving")
              : t("dashboard.billingPage.management.saveButton")}
          </Button>
        </div>
      </Card>

      {/* Current Plan */}
      {canViewSubscriptions && (
        <Card
          className={`overflow-hidden border shadow-sm ${brandSummaryTheme.containerClass}`}
        >
          <div className={`h-1.5 w-full ${brandSummaryTheme.bandClass}`} />
          <div className="p-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <Badge className={brandSummaryTheme.badgeClass}>
                  {brandSummaryTheme.eyebrow}
                </Badge>
                <h3
                  className={`mt-3 text-xl font-bold ${brandSummaryTheme.headingClass}`}
                >
                  {t("dashboard.billingPage.currentPlan.title", {
                    plan: brandPlanLabel,
                  })}
                </h3>
                <p className={`mt-1 ${brandSummaryTheme.bodyClass}`}>
                  {brandTrialEndsAt
                    ? t("dashboard.billingPage.currentPlan.freeTrialEnds", {
                        date: brandTrialEndsAt,
                      })
                    : brandCurrentPeriodEnd
                      ? t("dashboard.billingPage.currentPlan.renewsOn", {
                          date: brandCurrentPeriodEnd,
                        })
                      : brandSubscriptionStatus}
                </p>
              </div>
              {canManageBilling && (
                <Button
                  className={`font-semibold ${brandSummaryTheme.buttonClass}`}
                  onClick={() => navigate(brandSummaryTheme.actionPath)}
                >
                  {brandSummaryTheme.actionLabel}
                </Button>
              )}
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              <div
                className={`p-4 rounded-xl ${brandSummaryTheme.statCardClass}`}
              >
                <p
                  className={`text-sm mb-1 ${brandSummaryTheme.statLabelClass}`}
                >
                  {t("dashboard.billingPage.currentPlan.baseSubscription")}
                </p>
                <p
                  className={`text-2xl font-bold ${brandSummaryTheme.statValueClass}`}
                >
                  {brandBasePrice == null
                    ? brandPlanTier === "enterprise"
                      ? t("dashboard.billingPage.currentPlan.custom")
                      : "$0"
                    : `$${brandBasePrice}`}
                </p>
                <p
                  className={`text-xs mt-1 ${brandSummaryTheme.statMetaClass}`}
                >
                  {brandSubscriptionStatus}
                </p>
              </div>
              <div
                className={`p-4 rounded-xl ${brandSummaryTheme.statCardClass}`}
              >
                <p
                  className={`text-sm mb-1 ${brandSummaryTheme.statLabelClass}`}
                >
                  {t("dashboard.billingPage.currentPlan.aiStudioAddon")}
                </p>
                <p
                  className={`text-2xl font-bold ${brandSummaryTheme.statValueClass}`}
                >
                  {brandHasIncludedStudio
                    ? t("dashboard.billingPage.currentPlan.included")
                    : brandHasStudioAddon
                      ? `$${BRAND_STUDIO_ADDON_PRICE}`
                      : t("dashboard.billingPage.currentPlan.inactive")}
                </p>
                <p
                  className={`text-xs mt-1 ${brandSummaryTheme.statMetaClass}`}
                >
                  {brandStudioCurrentPeriodEnd && brandPlanTier !== "enterprise"
                    ? t("dashboard.billingPage.currentPlan.renewsOn", {
                        date: brandStudioCurrentPeriodEnd,
                      })
                    : brandStudioStatus}
                </p>
              </div>
              <div
                className={`p-4 rounded-xl ${brandSummaryTheme.statCardClass}`}
              >
                <p
                  className={`text-sm mb-1 ${brandSummaryTheme.statLabelClass}`}
                >
                  {t("dashboard.billingPage.currentPlan.campaignSlots")}
                </p>
                <p
                  className={`text-2xl font-bold ${brandSummaryTheme.statValueClass}`}
                >
                  {brandCampaignLimit == null
                    ? t("dashboard.billingPage.currentPlan.unlimited")
                    : `${brandCampaignSlotsUsed} / ${brandCampaignLimitLabel}`}
                </p>
                <p
                  className={`text-xs mt-1 ${brandSummaryTheme.statMetaClass}`}
                >
                  {t("dashboard.billingPage.currentPlan.campaignSlotsMeta", {
                    active: campaignMetrics.active_projects_count,
                    pending: campaignMetrics.pending_approvals_count,
                  })}
                </p>
              </div>
              <div
                className={`p-4 rounded-xl ${brandSummaryTheme.statCardClass}`}
              >
                <p
                  className={`text-sm mb-1 ${brandSummaryTheme.statLabelClass}`}
                >
                  {t("dashboard.billingPage.currentPlan.teamSeats")}
                </p>
                <p
                  className={`text-2xl font-bold ${brandSummaryTheme.statValueClass}`}
                >
                  {brandTeamSeatsUsed} / {brandSeatLimitLabel}
                </p>
              </div>
            </div>

            {(brandCampaignLimitReached || brandSeatLimitReached) && (
              <Alert className="mt-4 border border-amber-200 bg-amber-50 text-amber-900">
                <AlertDescription>
                  {brandCampaignLimitReached
                    ? brandCampaignLimit === 0
                      ? t("dashboard.billingPage.currentPlan.upgradeToPaid")
                      : t(
                          "dashboard.billingPage.currentPlan.campaignLimitReached",
                          {
                            used: brandCampaignSlotsUsed,
                            total: brandCampaignLimitLabel,
                          },
                        )
                    : brandSeatLimit === 0
                      ? t("dashboard.billingPage.currentPlan.upgradeForSeats")
                      : t(
                          "dashboard.billingPage.currentPlan.seatLimitReached",
                          {
                            total: brandSeatLimitLabel,
                          },
                        )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </Card>
      )}

      {/* Payment Status / Project Billing */}
      <Card className="p-6 bg-white border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-6">
          {t("dashboard.billingPage.projectPaymentStatus.title")}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  {t("dashboard.billingPage.projectPaymentStatus.project")}
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  {t("dashboard.billingPage.projectPaymentStatus.talent")}
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  {t("dashboard.billingPage.projectPaymentStatus.amount")}
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  {t("dashboard.billingPage.projectPaymentStatus.status")}
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  {t("dashboard.billingPage.projectPaymentStatus.date")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {/* Campaigns are now loaded from real API data */}
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-gray-500"
                >
                  {t("dashboard.billingPage.projectPaymentStatus.empty")}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Escrow Explanation */}
      <Card className="p-6 bg-blue-50 border border-blue-200">
        <h3 className="text-lg font-bold text-gray-900 mb-3">
          {t("dashboard.billingPage.escrow.title")}
        </h3>
        <p className="text-gray-700 mb-4">
          {t("dashboard.billingPage.escrow.description")}
        </p>
        <p className="text-sm font-semibold text-blue-900">
          {t("dashboard.billingPage.escrow.current", {
            amount: loadingBillingData ? "..." : escrowSummary.breakdown,
            count: escrowSummary.projectCount,
          })}
        </p>
      </Card>

      {/* Invoice History */}
      <Card className="p-6 bg-white border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">
            {t("dashboard.billingPage.invoiceHistory.title")}
          </h3>
          <Button
            variant="outline"
            className="border-2 border-gray-300"
            disabled={brandInvoices.length === 0}
            onClick={() => {
              const sanitizeCsvField = (value: string): string => {
                const needsQuoting =
                  /[,"\n\r]/.test(value) || /^[=+\-@]/.test(value.trim());
                if (needsQuoting) {
                  const safeValue = /^[=+\-@]/.test(value.trim())
                    ? `'${value}`
                    : value;
                  return `"${safeValue.replace(/"/g, '""')}"`;
                }
                return value;
              };
              const header = "ID,Number,Amount,Currency,Status,Date\n";
              const rows = brandInvoices.map((inv) => {
                const amountDollars = ((inv.amount || 0) / 100).toFixed(2);
                const date = inv.created_at
                  ? new Date(inv.created_at).toLocaleDateString()
                  : "";
                return `${inv.id},${sanitizeCsvField(inv.number || "")},${amountDollars},${inv.currency},${inv.status},${date}`;
              });
              const csv = header + rows.join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `invoices-${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            {t("dashboard.billingPage.invoiceHistory.exportAll")}
          </Button>
        </div>
        <div className="space-y-3">
          {loadingBillingData ? (
            <div className="p-4 text-center text-gray-500">
              {t("dashboard.billingPage.invoiceHistory.loading")}
            </div>
          ) : brandInvoices.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {t("dashboard.billingPage.invoiceHistory.empty")}
            </div>
          ) : (
            brandInvoices.map((invoice) => {
              const amountDollars = (invoice.amount || 0) / 100;
              const monthLabel = invoice.created_at
                ? new Date(invoice.created_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                  })
                : t("dashboard.billingPage.invoiceHistory.unknown");
              return (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{monthLabel}</p>
                    <p className="text-sm text-gray-600">
                      {invoice.number || invoice.id.slice(0, 8)} •{" "}
                      {invoice.created_at
                        ? new Date(invoice.created_at).toLocaleDateString()
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-gray-900">
                      ${amountDollars.toFixed(2)}
                    </span>
                    <Badge
                      className={
                        invoice.status === "paid"
                          ? "bg-green-100 text-green-700 border border-green-300"
                          : "bg-yellow-100 text-yellow-700 border border-yellow-300"
                      }
                    >
                      {invoice.status}
                    </Badge>
                    {invoice.invoice_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-2 border-gray-300"
                        onClick={() =>
                          window.open(invoice.invoice_url, "_blank")
                        }
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          {t("dashboard.settingsPage.title")}
        </h1>
        <p className="text-gray-600">{t("dashboard.settingsPage.subtitle")}</p>
      </div>

      <Tabs
        value={activeSettingsTab}
        onValueChange={setActiveSettingsTab}
        className="w-full"
      >
        <TabsList className="w-full flex justify-start bg-gray-100/50 p-1 mb-6 overflow-x-auto no-scrollbar rounded-none border-b border-gray-200 h-auto">
          <TabsTrigger
            value="profile"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7B750] data-[state=active]:bg-transparent px-6 py-3 font-bold uppercase tracking-widest text-xs"
          >
            {t("dashboard.settingsPage.tabs.profile")}
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7B750] data-[state=active]:bg-transparent px-6 py-3 font-bold uppercase tracking-widest text-xs"
          >
            {t("dashboard.settingsPage.tabs.notifications")}
          </TabsTrigger>
          <TabsTrigger
            value="billing"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7B750] data-[state=active]:bg-transparent px-6 py-3 font-bold uppercase tracking-widest text-xs"
          >
            {t("dashboard.settingsPage.tabs.billing")}
          </TabsTrigger>
          <TabsTrigger
            value="team"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7B750] data-[state=active]:bg-transparent px-6 py-3 font-bold uppercase tracking-widest text-xs"
          >
            {t("dashboard.settingsPage.tabs.team")}
          </TabsTrigger>
          <TabsTrigger
            value="integrations"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7B750] data-[state=active]:bg-transparent px-6 py-3 font-bold uppercase tracking-widest text-xs"
          >
            {t("dashboard.settingsPage.tabs.integrations")}
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7B750] data-[state=active]:bg-transparent px-6 py-3 font-bold uppercase tracking-widest text-xs"
          >
            {t("dashboard.settingsPage.tabs.securityLegal")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6 mt-0">
          {/* Company Logo */}
          <Card className="p-6 bg-white border border-gray-200 rounded-none shadow-none">
            <h3 className="text-xl font-bold text-gray-900 mb-4 uppercase tracking-tight">
              {t("dashboard.settingsPage.profile.companyLogo")}
            </h3>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
              <div className="relative">
                <Avatar className="w-24 sm:w-32 h-24 sm:h-32 border-2 border-gray-200 rounded-none bg-gray-50">
                  <AvatarImage src={brand?.logo} alt={brand?.name} />
                  <AvatarFallback className="text-2xl font-black text-gray-400 bg-gray-50 rounded-none border border-dashed border-gray-300">
                    {getBrandInitials(brand?.name)}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute -bottom-2 -right-2 bg-white rounded-none p-2 border-2 border-gray-900 cursor-pointer hover:bg-gray-50 shadow-[4px_4px_0px_rgba(0,0,0,0.1)]">
                  <Edit className="w-4 h-4 text-gray-900" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                  />
                </label>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-1">
                  {t("dashboard.settingsPage.profile.uploadOfficialLogo")}
                </p>
                <p className="text-xs text-gray-500 font-medium">
                  {t("dashboard.settingsPage.profile.logoHelp")}
                </p>
              </div>
            </div>
          </Card>

          {/* Company Information */}
          <Card className="p-4 sm:p-6 md:p-8 bg-white border-2 border-gray-900 rounded-none shadow-none">
            <h3 className="text-xl font-black text-gray-900 mb-4 sm:mb-8 uppercase tracking-tighter flex items-center gap-3">
              <Building2 className="w-6 h-6" />{" "}
              {t("dashboard.settingsPage.profile.companyInformation")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block">
                  {t("dashboard.settingsPage.profile.companyName")}
                </Label>
                <Input
                  value={brand?.name ?? ""}
                  onChange={(e) => setBrand({ ...brand, name: e.target.value })}
                  className="rounded-none border-2 border-gray-200 focus:border-gray-900 h-12 text-sm font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block">
                  {t("dashboard.settingsPage.profile.industry")}
                </Label>
                <Input
                  value={brand?.industry ?? ""}
                  onChange={(e) =>
                    setBrand({ ...brand, industry: e.target.value })
                  }
                  className="rounded-none border-2 border-gray-200 focus:border-gray-900 h-12 text-sm font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block">
                  {t("dashboard.settingsPage.profile.website")}
                </Label>
                <Input
                  value={brand?.website ?? ""}
                  onChange={(e) =>
                    setBrand({ ...brand, website: e.target.value })
                  }
                  className="rounded-none border-2 border-gray-200 focus:border-gray-900 h-12 text-sm font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block">
                  {t("dashboard.settingsPage.profile.yourEmail")}
                </Label>
                <Input
                  value={profile?.email ?? ""}
                  readOnly
                  className="rounded-none border-2 border-gray-200 bg-gray-50 cursor-not-allowed h-12 text-sm font-bold text-gray-500"
                />
              </div>
            </div>

            <div className="mt-12">
              <Button
                onClick={handleSaveProfile}
                className="rounded-none bg-[#F7B750] hover:bg-[#F7B750]/90 text-white font-black uppercase tracking-widest px-6 sm:px-12 h-11 sm:h-14 shadow-[8px_8px_0px_rgba(247,183,80,0.3)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none w-full sm:w-auto"
              >
                {t("dashboard.settingsPage.profile.saveProfileChanges")}
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6 mt-0">
          <Card className="p-4 sm:p-6 md:p-8 bg-white border border-gray-200 rounded-none shadow-none">
            <h3 className="text-xl font-black text-gray-900 mb-4 sm:mb-8 uppercase tracking-tighter flex items-center gap-3">
              <Bell className="w-6 h-6" />{" "}
              {t("dashboard.settingsPage.notifications.title")}
            </h3>
            <div className="space-y-2">
              {[
                {
                  id: "newProjectAlerts",
                  title: t(
                    "dashboard.settingsPage.notifications.items.newProjectAlerts.title",
                  ),
                  desc: t(
                    "dashboard.settingsPage.notifications.items.newProjectAlerts.desc",
                  ),
                },
                {
                  id: "deliverableSubmissions",
                  title: t(
                    "dashboard.settingsPage.notifications.items.deliverableSubmissions.title",
                  ),
                  desc: t(
                    "dashboard.settingsPage.notifications.items.deliverableSubmissions.desc",
                  ),
                },
                {
                  id: "approvalReminders",
                  title: t(
                    "dashboard.settingsPage.notifications.items.approvalReminders.title",
                  ),
                  desc: t(
                    "dashboard.settingsPage.notifications.items.approvalReminders.desc",
                  ),
                },
                {
                  id: "licenseExpirationAlerts",
                  title: t(
                    "dashboard.settingsPage.notifications.items.licenseExpirationAlerts.title",
                  ),
                  desc: t(
                    "dashboard.settingsPage.notifications.items.licenseExpirationAlerts.desc",
                  ),
                },
              ].map((pref) => (
                <div
                  key={pref.id}
                  className="flex items-center justify-between py-6 border-b border-gray-100 last:border-0"
                >
                  <div className="pr-12">
                    <Label className="text-sm font-black text-gray-900 uppercase tracking-widest block mb-1">
                      {pref.title}
                    </Label>
                    <p className="text-xs font-medium text-gray-500">
                      {pref.desc}
                    </p>
                  </div>
                  <Switch
                    checked={notificationPrefs[pref.id] ?? true}
                    onCheckedChange={(val) =>
                      handleToggleNotificationPref(pref.id, val)
                    }
                    disabled={isSavingNotificationPrefs}
                    className="data-[state=checked]:bg-[#F7B750]"
                  />
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6 mt-0">
          <BrandSettingsBilling />
        </TabsContent>

        <TabsContent value="team" className="space-y-6 mt-0">
          <TeamManagementCard
            organizationType="brand"
            title={t("dashboard.settingsPage.team.title")}
            description={t("dashboard.settingsPage.team.description")}
            seatLimit={brandSeatLimit}
            seatLimitReached={brandSeatLimitReached}
          />
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6 mt-0">
          <Card className="p-12 bg-white border border-gray-200 rounded-none shadow-none flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-none flex items-center justify-center mb-6">
              <Zap className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tighter">
              {t("dashboard.settingsPage.integrations.title")}
            </h3>
            <p className="text-sm text-gray-500 font-medium max-w-sm mb-8">
              {t("dashboard.settingsPage.integrations.description")}
            </p>
            <Button
              disabled
              className="rounded-none bg-gray-100 text-gray-400 font-black uppercase tracking-widest text-xs px-8"
            >
              {t("dashboard.settingsPage.integrations.comingSoon")}
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <Card className="p-4 sm:p-6 md:p-8 bg-white border border-gray-200 rounded-none shadow-none">
              <h3 className="text-xl font-black text-gray-900 mb-4 sm:mb-8 uppercase tracking-tighter flex items-center gap-3">
                <Shield className="w-6 h-6" />{" "}
                {t("dashboard.settingsPage.security.title")}
              </h3>
              <div className="space-y-4">
                <Button
                  variant="outline"
                  onClick={() => navigate("/forgot-password")}
                  className="w-full justify-between rounded-none border-2 border-gray-200 hover:border-gray-900 font-black uppercase tracking-widest text-[10px] h-12"
                >
                  {t("dashboard.settingsPage.security.resetAdminPassword")}{" "}
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <div className="relative group">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/TwoFactorSetup")}
                    className="w-full justify-between rounded-none border-2 border-gray-200 hover:border-gray-900 font-black uppercase tracking-widest text-[10px] h-12"
                  >
                    {t("dashboard.settingsPage.security.enable2fa")}{" "}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <div className="relative group">
                  <Button
                    variant="outline"
                    onClick={() => setShowSessionAudit((v) => !v)}
                    className="w-full justify-between rounded-none border-2 border-gray-200 hover:border-gray-900 font-black uppercase tracking-widest text-[10px] h-12"
                  >
                    {t("dashboard.settingsPage.security.activeSessionAudit")}{" "}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                {showSessionAudit && (
                  <div className="border-2 border-gray-100 p-4">
                    <ActiveSessionAudit variant="brand" />
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-4 sm:p-6 md:p-8 bg-white border border-gray-200 rounded-none shadow-none">
              <h3 className="text-xl font-black text-gray-900 mb-4 sm:mb-8 uppercase tracking-tighter flex items-center gap-3">
                <FileText className="w-6 h-6" />{" "}
                {t("dashboard.settingsPage.legal.title")}
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() =>
                    window.open(
                      "/agency_brand_terms_and-conditions.pdf",
                      "_blank",
                    )
                  }
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-none border-2 border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-900 text-[10px] font-black uppercase tracking-widest text-gray-800 text-left transition-colors"
                >
                  <FileText className="w-4 h-4 text-gray-500 shrink-0" />
                  {t("dashboard.settingsPage.legal.terms")}
                </button>
                <button
                  onClick={() =>
                    window.open("https://likelee.ai/privacypolicy", "_blank")
                  }
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-none border-2 border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-900 text-[10px] font-black uppercase tracking-widest text-gray-800 text-left transition-colors"
                >
                  <FileText className="w-4 h-4 text-gray-500 shrink-0" />
                  {t("dashboard.settingsPage.legal.privacy")}
                </button>
                <button
                  onClick={() => navigate("/sagaftraalignment")}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-none border-2 border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-900 text-[10px] font-black uppercase tracking-widest text-gray-800 text-left transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  {t("dashboard.settingsPage.legal.sagAftra")}
                </button>
                <div className="relative group">
                  <button
                    disabled
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-none border-2 border-gray-200 bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 text-left transition-colors opacity-50 blur-[1px] cursor-not-allowed"
                  >
                    <Download className="w-4 h-4 text-gray-400 shrink-0" />
                    {t("dashboard.settingsPage.legal.dataExport")}
                  </button>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <Badge
                      variant="secondary"
                      className="bg-gray-900 text-white font-black uppercase tracking-widest text-[10px]"
                    >
                      {t("dashboard.settingsPage.legal.comingSoon")}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Support Section - Global Footer */}
      <Card className="p-8 bg-gray-950 text-white rounded-none shadow-none mt-12 border-none">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h3 className="text-2xl font-black uppercase tracking-tighter mb-2 italic">
              {t("dashboard.settingsPage.support.title")}
            </h3>
            <p className="text-gray-400 font-medium text-sm">
              {t("dashboard.settingsPage.support.description")}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              onClick={() => {
                // Open support email
                window.location.href = CONTACT_EMAIL_MAILTO;
              }}
              className="rounded-none bg-[#F7B750] hover:bg-[#F7B750]/90 text-white font-black uppercase tracking-widest text-[10px] min-w-[140px] h-12"
            >
              <HelpCircle className="w-4 h-4 mr-2" />{" "}
              {t("dashboard.settingsPage.support.liveSupport")}
            </Button>
            <Button
              onClick={() => {
                // Navigate to book demo page
                navigate(createBookDemoUrl("brand_dashboard_settings"));
              }}
              className="rounded-none bg-purple-600 hover:bg-purple-700 text-white font-black uppercase tracking-widest text-[10px] min-w-[140px] h-12 border-2 border-purple-500"
            >
              <Calendar className="w-4 h-4 mr-2" />{" "}
              {t("dashboard.settingsPage.support.bookDemo")}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Hire Modal - 3 Options */}
      <Dialog open={showHireModal} onOpenChange={setShowHireModal}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Hire {selectedCreator?.name}
            </DialogTitle>
            <DialogDescription>
              Define contract terms before hiring this creator.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-gray-700 mb-6">
              Before you hire {selectedCreator?.name}, let's define the contract
              terms.
            </p>

            <div className="space-y-4">
              <Card
                className="p-6 border-2 border-gray-300 hover:border-[#F7B750] cursor-pointer transition-all"
                onClick={() => handleContractOption("self")}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#F7B750] rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      I'll Create the Project & Terms
                    </h3>
                    <p className="text-gray-600">
                      Set deliverables, budget, and contract terms yourself
                      using our guided builder.
                    </p>
                  </div>
                </div>
              </Card>

              <Card
                className="p-6 border-2 border-gray-300 hover:border-blue-500 cursor-pointer transition-all"
                onClick={() => handleContractOption("agency")}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      My Agency Will Handle It
                    </h3>
                    <p className="text-gray-600">
                      Send this to your partner agency. They'll build the
                      project and terms.
                    </p>
                  </div>
                </div>
              </Card>

              <Card
                className="p-6 border-2 border-gray-300 hover:border-purple-500 cursor-pointer transition-all"
                onClick={() => handleContractOption("browse")}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Search className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      Browse Likelee Partner Agencies
                    </h3>
                    <p className="text-gray-600">
                      Hire a Likelee partner agency to manage the project for
                      you.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showLicenseRequestModal}
        onOpenChange={setShowLicenseRequestModal}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              {t("campaigns.licensingRequest.title")}
            </DialogTitle>
            <DialogDescription>
              {selectedLicenseCreator
                ? t("campaigns.licensingRequest.subtitle", {
                    talentName:
                      selectedLicenseCreator.display_name ||
                      selectedLicenseCreator.full_name ||
                      "this talent",
                  })
                : t("campaigns.licensingRequest.subtitleGeneric")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("campaigns.licensingRequest.startDate")}</Label>
                <Input
                  type="date"
                  value={licenseRequestForm.start_date}
                  onChange={(e) =>
                    setLicenseRequestForm((prev) => ({
                      ...prev,
                      start_date: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("campaigns.licensingRequest.duration")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={licenseRequestForm.duration_days}
                  onChange={(e) =>
                    setLicenseRequestForm((prev) => ({
                      ...prev,
                      duration_days: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("campaigns.licensingRequest.licenseFee")}</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder={t(
                    "campaigns.licensingRequest.licenseFeePlaceholder",
                  )}
                  value={licenseRequestForm.license_fee}
                  onChange={(e) =>
                    setLicenseRequestForm((prev) => ({
                      ...prev,
                      license_fee: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("campaigns.licensingRequest.category")}</Label>
                <Select
                  value={licenseRequestForm.category}
                  onValueChange={(value) =>
                    setLicenseRequestForm((prev) => ({
                      ...prev,
                      category: value,
                    }))
                  }
                >
                  <SelectTrigger className="border-2 border-gray-300">
                    <SelectValue
                      placeholder={t(
                        "campaigns.licensingRequest.selectCategory",
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Social Media">
                      {t("campaigns.licensingRequest.categories.socialMedia")}
                    </SelectItem>
                    <SelectItem value="E-commerce">
                      {t("campaigns.licensingRequest.categories.ecommerce")}
                    </SelectItem>
                    <SelectItem value="Advertising">
                      {t("campaigns.licensingRequest.categories.advertising")}
                    </SelectItem>
                    <SelectItem value="Editorial">
                      {t("campaigns.licensingRequest.categories.editorial")}
                    </SelectItem>
                    <SelectItem value="Film & TV">
                      {t("campaigns.licensingRequest.categories.filmTv")}
                    </SelectItem>
                    <SelectItem value="Custom">
                      {t("campaigns.licensingRequest.categories.custom")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("campaigns.licensingRequest.territory")}</Label>
                <Input
                  placeholder={t(
                    "campaigns.licensingRequest.territoryPlaceholder",
                  )}
                  value={licenseRequestForm.territory}
                  onChange={(e) =>
                    setLicenseRequestForm((prev) => ({
                      ...prev,
                      territory: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("campaigns.licensingRequest.exclusivity")}</Label>
                <Select
                  value={licenseRequestForm.exclusivity}
                  onValueChange={(value) =>
                    setLicenseRequestForm((prev) => ({
                      ...prev,
                      exclusivity: value,
                    }))
                  }
                >
                  <SelectTrigger className="border-2 border-gray-300">
                    <SelectValue
                      placeholder={t(
                        "campaigns.licensingRequest.selectExclusivity",
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Non-exclusive">
                      {t(
                        "campaigns.licensingRequest.exclusivityOptions.nonExclusive",
                      )}
                    </SelectItem>
                    <SelectItem value="Category exclusive">
                      {t(
                        "campaigns.licensingRequest.exclusivityOptions.categoryExclusive",
                      )}
                    </SelectItem>
                    <SelectItem value="Full exclusivity">
                      {t(
                        "campaigns.licensingRequest.exclusivityOptions.fullExclusivity",
                      )}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  {t("campaigns.licensingRequest.modificationsAllowed")}
                </Label>
                <Input
                  placeholder={t(
                    "campaigns.licensingRequest.modificationsPlaceholder",
                  )}
                  value={licenseRequestForm.modifications_allowed}
                  onChange={(e) =>
                    setLicenseRequestForm((prev) => ({
                      ...prev,
                      modifications_allowed: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("campaigns.licensingRequest.description")}</Label>
              <Textarea
                placeholder={t(
                  "campaigns.licensingRequest.descriptionPlaceholder",
                )}
                value={licenseRequestForm.description}
                onChange={(e) =>
                  setLicenseRequestForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>
                {t("campaigns.licensingRequest.additionalCustomTerms")}
              </Label>
              <Textarea
                rows={4}
                value={licenseRequestForm.custom_terms}
                onChange={(e) =>
                  setLicenseRequestForm((prev) => ({
                    ...prev,
                    custom_terms: e.target.value,
                  }))
                }
                placeholder={t(
                  "campaigns.licensingRequest.customTermsPlaceholder",
                )}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowLicenseRequestModal(false)}
            >
              {t("campaigns.licensingRequest.cancel")}
            </Button>
            <Button
              onClick={handleSubmitLicenseRequest}
              disabled={creatingLicenseRequest || !selectedLicenseCreator}
              className="bg-[#F7B750] hover:bg-[#E6A640] text-white"
            >
              {creatingLicenseRequest
                ? t("campaigns.licensingRequest.creating")
                : t("campaigns.licensingRequest.createRequest")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Contract Modal */}
      <Dialog open={showContractModal} onOpenChange={setShowContractModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              {t("campaigns.campaignDetails.briefAndContract")}
            </DialogTitle>
            <DialogDescription>
              {t("campaigns.contractHub.contractDetails")}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-6">
            {loadingSelectedCampaignContracts && (
              <Card className="p-6 bg-white border border-gray-200">
                <p className="text-sm text-gray-600">
                  {t("campaigns.contractHub.loading")}
                </p>
              </Card>
            )}
            {!loadingSelectedCampaignContracts &&
              selectedCampaignContracts.length === 0 && (
                <Card className="p-6 bg-white border border-gray-200">
                  <p className="text-sm text-gray-600">
                    {t("campaigns.contractHub.noOfferContracts")}
                  </p>
                </Card>
              )}
            {!loadingSelectedCampaignContracts &&
              selectedCampaignContracts.length > 0 && (
                <>
                  <Card className="p-6 bg-gray-50 border-2 border-gray-300">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      {t("campaigns.contractHub.contractOverview", {
                        defaultValue: "Contract Overview",
                      })}
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 mb-1">
                          {t("campaigns.contractHub.contract", {
                            defaultValue: "Contract",
                          })}
                        </p>
                        <p className="font-semibold text-gray-900">
                          {String(
                            selectedCampaignContracts[0]?.title ||
                              "Campaign contract",
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 mb-1">
                          {t("campaigns.contractHub.table.status")}
                        </p>
                        <Badge className="bg-blue-100 text-blue-700 border border-blue-300">
                          {t(
                            `campaigns.contractHub.status.${String(
                              selectedCampaignContracts[0]?.docuseal_status ||
                                "sent",
                            ).toLowerCase()}`,
                            {
                              defaultValue: String(
                                selectedCampaignContracts[0]?.docuseal_status ||
                                  "sent",
                              ).replace(/_/g, " "),
                            },
                          )}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4 bg-white border border-gray-200">
                    {String(
                      selectedCampaignContracts[0]?.meta
                        ?.docuseal_document_url ||
                        selectedCampaignContracts[0]?.file_url ||
                        "",
                    ).trim() ? (
                      <iframe
                        src={String(
                          selectedCampaignContracts[0]?.meta
                            ?.docuseal_document_url ||
                            selectedCampaignContracts[0]?.file_url,
                        )}
                        className="w-full h-[70vh] border border-gray-200 rounded"
                        title="Campaign Contract Document"
                      />
                    ) : (
                      <p className="text-sm text-gray-600">
                        Contract document URL is not available yet.
                      </p>
                    )}
                  </Card>
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      className="border-2 border-gray-300"
                      onClick={() => setShowContractModal(false)}
                    >
                      {t("common.close", { defaultValue: "Close" })}
                    </Button>
                  </div>
                </>
              )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={brandSignOpen}
        onOpenChange={(open) => {
          if (!open) {
            setBrandSignOpen(false);
            setBrandSignUrl(null);
          }
        }}
      >
        <DialogContent className="fixed !inset-0 bg-background w-screen h-screen !max-w-none !translate-x-0 !translate-y-0 !rounded-none border-none p-0 flex flex-col outline-none">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>
              {t("campaigns.licensingRequests.signContract")}
            </DialogTitle>
            <DialogDescription>
              {t("campaigns.licensingRequests.signContractDescription")}
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
                setBrandSignUrl(null);
              }}
            >
              {t("common.close", { defaultValue: "Close" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selectedJobForApplications}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedJobForApplications(null);
            setSelectedJobApplications([]);
          }
        }}
      >
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-gray-100 pb-3">
            <DialogTitle className="text-2xl font-bold text-gray-900">
              {selectedJobForApplications?._showDetailsOnly
                ? t("campaigns.jobs.viewJobDetails")
                : t("campaigns.jobs.applications")}
            </DialogTitle>
            <DialogDescription>
              {t("campaigns.jobs.viewDetailsJobPosting")}
            </DialogDescription>
          </DialogHeader>
          {selectedJobForApplications?._showDetailsOnly ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="mt-3 text-2xl font-bold text-gray-900">
                    {selectedJobForApplications.job_title ||
                      selectedJobForApplications.title}
                  </h3>
                  <p className="text-lg font-semibold text-gray-800 mt-1">
                    {selectedJobForApplications.company_name ||
                      t("company", { defaultValue: "Brand" })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50"
                  >
                    {(selectedJobForApplications.call_type || "call").replace(
                      "_",
                      " ",
                    )}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100"
                  >
                    {selectedJobForApplications.status || "open"}
                  </Badge>
                  {selectedJobForApplications.category && (
                    <Badge
                      variant="outline"
                      className="bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100"
                    >
                      {String(selectedJobForApplications.category).replace(
                        "_",
                        " ",
                      )}
                    </Badge>
                  )}
                </div>
              </div>

              <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap gap-2">
                  {(selectedJobForApplications.work_types || []).map(
                    (type: string) => (
                      <Badge
                        key={type}
                        variant="outline"
                        className="bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-50"
                      >
                        {type}
                      </Badge>
                    ),
                  )}
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  {t("campaigns.jobs.details.aboutRole")}
                </div>
                <div className="text-sm text-gray-700 whitespace-pre-line">
                  {selectedJobForApplications.about_role ||
                    t("campaigns.jobs.noRoleDescription")}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600">
                  <div>
                    <span className="font-medium text-gray-900">
                      {t("campaigns.jobs.details.location")}:
                    </span>{" "}
                    {formatJobLabel(
                      selectedJobForApplications.location ||
                        t("campaigns.jobs.details.location"),
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">
                      {t("campaigns.jobs.details.jobType")}:
                    </span>{" "}
                    {formatJobLabel(
                      selectedJobForApplications.job_type ||
                        t("campaigns.jobs.details.jobType"),
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">
                      {t("campaigns.jobs.details.timeline")}:
                    </span>{" "}
                    {selectedJobForApplications.start_date || "—"}
                    {selectedJobForApplications.end_date
                      ? ` → ${selectedJobForApplications.end_date}`
                      : ""}
                  </div>
                  {selectedJobForApplications.goals &&
                    selectedJobForApplications.goals.length > 0 && (
                      <div className="md:col-span-2">
                        <span className="font-medium text-gray-900">
                          {t("campaigns.jobs.details.goals")}:
                        </span>{" "}
                        {selectedJobForApplications.goals.join(", ")}
                      </div>
                    )}
                  {selectedJobForApplications.deliverables && (
                    <div>
                      <span className="font-medium text-gray-900">
                        {t("campaigns.jobs.details.deliverables")}:
                      </span>{" "}
                      {selectedJobForApplications.deliverables}
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-900">
                  {t("campaigns.jobs.details.talentRequirements")}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(selectedJobForApplications.talent_types || []).map(
                    (type: string) => (
                      <Badge
                        key={type}
                        variant="outline"
                        className="bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-50"
                      >
                        {type}
                      </Badge>
                    ),
                  )}
                  {(selectedJobForApplications.required_skills || []).map(
                    (skill: string) => (
                      <Badge
                        key={skill}
                        variant="outline"
                        className="bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-50"
                      >
                        {skill}
                      </Badge>
                    ),
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {selectedJobForApplications.region && (
                    <span className="mr-3">
                      <span className="font-medium text-gray-900">
                        {t("campaigns.jobs.details.region")}:
                      </span>{" "}
                      {selectedJobForApplications.region}
                    </span>
                  )}
                  {selectedJobForApplications.language && (
                    <span>
                      <span className="font-medium text-gray-900">
                        {t("campaigns.jobs.details.language")}:
                      </span>{" "}
                      {selectedJobForApplications.language}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium text-gray-900">
                    {t("campaigns.jobs.details.licensingRequired")}:
                  </span>{" "}
                  {selectedJobForApplications.needs_licensing
                    ? t("campaigns.jobs.details.yes")
                    : t("campaigns.jobs.details.no")}
                </div>
              </section>

              {selectedJobForApplications.needs_licensing && (
                <section className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-5">
                  <h4 className="text-sm font-semibold text-gray-900">
                    {t("campaigns.jobs.details.licensingDetails")}
                  </h4>
                  <div className="text-sm text-gray-600">
                    {selectedJobForApplications.usage_type && (
                      <span className="mr-3">
                        <span className="font-medium text-gray-900">
                          {t("campaigns.jobs.details.usage")}:
                        </span>{" "}
                        {selectedJobForApplications.usage_type}
                      </span>
                    )}
                    {selectedJobForApplications.license_duration && (
                      <span className="mr-3">
                        <span className="font-medium text-gray-900">
                          {t("campaigns.jobs.details.duration")}:
                        </span>{" "}
                        {String(
                          selectedJobForApplications.license_duration,
                        ).replace(/_/g, " ")}
                      </span>
                    )}
                    {selectedJobForApplications.territories && (
                      <span>
                        <span className="font-medium text-gray-900">
                          {t("campaigns.jobs.details.territories")}:
                        </span>{" "}
                        {selectedJobForApplications.territories}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="mr-3">
                      <span className="font-medium text-gray-900">
                        {t("campaigns.jobs.details.exclusivity")}:
                      </span>{" "}
                      {selectedJobForApplications.exclusivity
                        ? t("campaigns.jobs.details.yes")
                        : t("campaigns.jobs.details.no")}
                    </span>
                    <span>
                      <span className="font-medium text-gray-900">
                        {t("campaigns.jobs.details.royaltyOption")}:
                      </span>{" "}
                      {selectedJobForApplications.royalty_option
                        ? t("campaigns.jobs.details.yes")
                        : t("campaigns.jobs.details.no")}
                    </span>
                  </div>
                </section>
              )}

              <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-900">
                  {t("campaigns.jobs.details.budgetCompensation")}
                </h4>
                <div className="text-sm text-gray-600">
                  <span className="font-medium text-gray-900">
                    {t("campaigns.jobs.budget")}:
                  </span>{" "}
                  {selectedJobForApplications.budget
                    ? `${selectedJobForApplications.budget} ${selectedJobForApplications.currency || "USD"}`
                    : t("campaigns.jobs.details.notSpecified")}
                </div>
                {selectedJobForApplications.payment_type && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">
                      {t("campaigns.jobs.details.paymentType")}:
                    </span>{" "}
                    {selectedJobForApplications.payment_type}
                  </div>
                )}
              </section>

              {(!selectedJobForApplications.confidential ||
                selectedJobForApplications.is_invited_viewer) &&
                (selectedJobForApplications.work_with_agency ||
                  selectedJobForApplications.invite_creator ||
                  (selectedJobForApplications.invited_agency_ids || []).length >
                    0 ||
                  (selectedJobForApplications.invited_creator_ids || [])
                    .length > 0 ||
                  (selectedJobForApplications.invited_agencies || []).length >
                    0 ||
                  (selectedJobForApplications.invited_creators || []).length >
                    0) && (
                  <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h4 className="text-sm font-semibold text-gray-900">
                      {t("campaigns.jobs.details.collaborationPreferences")}
                    </h4>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium text-gray-900">
                        {t("campaigns.jobs.details.workWithAgency")}:
                      </span>{" "}
                      {selectedJobForApplications.work_with_agency
                        ? t("campaigns.jobs.details.yes")
                        : t("campaigns.jobs.details.no")}
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium text-gray-900">
                        {t("campaigns.jobs.details.inviteCreator")}:
                      </span>{" "}
                      {selectedJobForApplications.invite_creator
                        ? t("campaigns.jobs.details.yes")
                        : t("campaigns.jobs.details.no")}
                    </div>
                    {/* Agencies */}
                    {(Array.isArray(
                      selectedJobForApplications.invited_agencies,
                    ) &&
                      selectedJobForApplications.invited_agencies.length > 0) ||
                    (Array.isArray(
                      selectedJobForApplications.declined_agencies,
                    ) &&
                      selectedJobForApplications.declined_agencies.length >
                        0) ||
                    (Array.isArray(
                      selectedJobForApplications.accepted_agencies,
                    ) &&
                      selectedJobForApplications.accepted_agencies.length >
                        0) ? (
                      <div className="pt-1">
                        <p className="text-xs font-semibold text-gray-700 mb-2">
                          {t("campaigns.jobs.details.agencies")}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {/* Show Accepted/Pending first, then Declined */}
                          {[
                            ...(selectedJobForApplications.invited_agencies ||
                              []),
                            ...(selectedJobForApplications.accepted_agencies ||
                              []),
                            ...(selectedJobForApplications.declined_agencies ||
                              []),
                          ].map((agency: any, idx: number) => {
                            const agencyId =
                              agency?.id || agency?.agency_id || idx;
                            const isDeclined = (
                              selectedJobForApplications.declined_agencies || []
                            ).some(
                              (d: any) =>
                                (d?.id || d?.agency_id) ===
                                (agency?.id || agency?.agency_id),
                            );
                            const isAccepted =
                              (Array.isArray(selectedJobApplications) &&
                                selectedJobApplications.some(
                                  (a: any) =>
                                    a.agency_id ===
                                    (agency?.id || agency?.agency_id),
                                )) ||
                              (
                                selectedJobForApplications.accepted_agencies ||
                                []
                              ).some(
                                (a: any) =>
                                  (a?.id || a?.agency_id) ===
                                  (agency?.id || agency?.agency_id),
                              );

                            let statusLabel = t(
                              "campaigns.jobs.status.pending",
                            );
                            let statusColor =
                              "bg-slate-100 text-slate-600 border-slate-200";
                            if (isAccepted) {
                              statusLabel = t("campaigns.jobs.status.accepted");
                              statusColor =
                                "bg-emerald-100 text-emerald-700 border-emerald-200";
                            } else if (isDeclined) {
                              statusLabel = t("campaigns.jobs.status.declined");
                              statusColor =
                                "bg-amber-100 text-amber-700 border-amber-200";
                            }

                            return (
                              <div
                                key={`${agencyId}`}
                                className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-gray-700"
                              >
                                {agency?.logo_url ? (
                                  <img
                                    src={agency.logo_url}
                                    alt={agency?.agency_name || "Agency"}
                                    className="h-5 w-5 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="h-5 w-5 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-semibold text-gray-600">
                                    {String(
                                      agency?.agency_name ||
                                        agency?.display_name ||
                                        "A",
                                    )
                                      .trim()
                                      .slice(0, 1)
                                      .toUpperCase()}
                                  </div>
                                )}
                                <span>
                                  {agency?.display_name ||
                                    agency?.agency_name ||
                                    agency?.contact_name ||
                                    "Agency"}
                                </span>
                                <Badge
                                  className={`${statusColor} ml-1 border px-1.5 py-0 text-[10px] font-medium uppercase shadow-none`}
                                >
                                  {statusLabel}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                    {/* Creators */}
                    {(Array.isArray(
                      selectedJobForApplications.invited_creators,
                    ) &&
                      selectedJobForApplications.invited_creators.length > 0) ||
                    (Array.isArray(
                      selectedJobForApplications.declined_creators,
                    ) &&
                      selectedJobForApplications.declined_creators.length >
                        0) ||
                    (Array.isArray(
                      selectedJobForApplications.accepted_creators,
                    ) &&
                      selectedJobForApplications.accepted_creators.length >
                        0) ? (
                      <div className="pt-3">
                        <p className="text-xs font-semibold text-gray-700 mb-2">
                          {t("campaigns.jobs.details.creators")}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            ...(selectedJobForApplications.invited_creators ||
                              []),
                            ...(selectedJobForApplications.accepted_creators ||
                              []),
                            ...(selectedJobForApplications.declined_creators ||
                              []),
                          ].map((creator: any, idx: number) => {
                            const creatorId = creator?.id || idx;
                            const isDeclined = (
                              selectedJobForApplications.declined_creators || []
                            ).some((d: any) => d?.id === creator?.id);
                            const isAccepted =
                              (Array.isArray(selectedJobApplications) &&
                                selectedJobApplications.some(
                                  (a: any) =>
                                    a.applicant_id === creator?.id &&
                                    (a.applicant_role === "creator" ||
                                      a.applicant_role === "talent"),
                                )) ||
                              (
                                selectedJobForApplications.accepted_creators ||
                                []
                              ).some((c: any) => c?.id === creator?.id);

                            let statusLabel = t(
                              "campaigns.jobs.status.pending",
                            );
                            let statusColor =
                              "bg-slate-100 text-slate-600 border-slate-200";
                            if (isAccepted) {
                              statusLabel = t("campaigns.jobs.status.accepted");
                              statusColor =
                                "bg-emerald-100 text-emerald-700 border-emerald-200";
                            } else if (isDeclined) {
                              statusLabel = t("campaigns.jobs.status.declined");
                              statusColor =
                                "bg-amber-100 text-amber-700 border-amber-200";
                            }

                            return (
                              <div
                                key={`${creatorId}`}
                                className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-gray-700"
                              >
                                {creator?.profile_photo_url ? (
                                  <img
                                    src={creator.profile_photo_url}
                                    alt={creator?.full_name || "Creator"}
                                    className="h-5 w-5 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="h-5 w-5 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-semibold text-gray-600">
                                    {String(
                                      creator?.full_name ||
                                        creator?.display_name ||
                                        "C",
                                    )
                                      .trim()
                                      .slice(0, 1)
                                      .toUpperCase()}
                                  </div>
                                )}
                                <span>
                                  {creator?.full_name ||
                                    creator?.display_name ||
                                    "Creator"}
                                </span>
                                <Badge
                                  className={`${statusColor} ml-1 border px-1.5 py-0 text-[10px] font-medium uppercase shadow-none`}
                                >
                                  {statusLabel}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </section>
                )}

              {Array.isArray(selectedJobForApplications.brand_assets) &&
                selectedJobForApplications.brand_assets.length > 0 && (
                  <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-900">
                        {t("campaigns.jobs.details.brandAssets")}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                        {t("campaigns.campaignList.assets", {
                          count: selectedJobForApplications.brand_assets.length,
                          defaultValue: `${selectedJobForApplications.brand_assets.length} Assets`,
                        })}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {selectedJobForApplications.brand_assets.map(
                        (asset: any, idx: number) => {
                          let url = String(resolveJobAssetUrl(asset) || "");
                          const assetName = String(asset?.name || "");
                          const isImage = /\.(png|jpe?g|gif|webp)$/i.test(
                            url || assetName,
                          );
                          if (isImage && !url && assetName) {
                            const safeName = assetName.replace(
                              /[^\w.\-]+/g,
                              "_",
                            );
                            url =
                              supabase.storage
                                .from("likelee-public")
                                .getPublicUrl(
                                  `job-assets/${selectedJobForApplications.brand_id}/${safeName}`,
                                ).data?.publicUrl || "";
                          }
                          return (
                            <div
                              key={`${url || asset?.name || idx}`}
                              className="group relative cursor-pointer border border-slate-200 rounded-lg overflow-hidden bg-slate-50 transition-all hover:ring-2 hover:ring-blue-500 hover:ring-offset-2"
                              onClick={() => {
                                if (isImage && url) setSelectedAssetIndex(idx);
                              }}
                            >
                              {isImage && url ? (
                                <>
                                  <img
                                    src={url}
                                    alt={asset?.name || "Brand asset"}
                                    className="h-28 w-full object-cover transition-transform duration-300 group-hover:scale-110"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                                    <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                                  </div>
                                </>
                              ) : (
                                <div className="h-28 flex flex-col items-center justify-center text-xs text-slate-500 bg-slate-50 text-center px-2 gap-1.5">
                                  <FileText className="w-5 h-5 text-slate-300" />
                                  <span className="truncate w-full font-medium">
                                    {asset?.name || "File"}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        },
                      )}
                    </div>
                  </section>
                )}

              <Dialog
                open={selectedAssetIndex !== null}
                onOpenChange={(open) => !open && setSelectedAssetIndex(null)}
              >
                <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[95vh] p-0 overflow-hidden bg-white border-none shadow-2xl rounded-2xl flex flex-col">
                  <DialogHeader className="sr-only">
                    <DialogTitle>
                      Brand Asset{" "}
                      {selectedAssetIndex !== null
                        ? selectedAssetIndex + 1
                        : ""}
                    </DialogTitle>
                    <DialogDescription>
                      View brand asset reference image in detail.
                    </DialogDescription>
                  </DialogHeader>

                  {selectedAssetIndex !== null &&
                    Array.isArray(selectedJobForApplications?.brand_assets) &&
                    selectedJobForApplications.brand_assets[
                      selectedAssetIndex
                    ] && (
                      <div className="relative w-full h-full flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
                          <h3 className="text-base font-bold text-gray-900">
                            Brand Asset {selectedAssetIndex + 1} of{" "}
                            {selectedJobForApplications.brand_assets.length}
                          </h3>
                        </div>

                        {/* Image Container */}
                        <div className="flex-1 overflow-auto bg-slate-50 flex items-center justify-center p-4 min-h-[400px]">
                          {(() => {
                            const assets =
                              selectedJobForApplications?.brand_assets;
                            const asset = Array.isArray(assets)
                              ? assets[selectedAssetIndex]
                              : null;
                            if (!asset) return null;
                            let url = String(resolveJobAssetUrl(asset) || "");
                            const assetName = String(asset?.name || "");
                            if (!url && assetName) {
                              const safeName = assetName.replace(
                                /[^\w.\-]+/g,
                                "_",
                              );
                              url =
                                supabase.storage
                                  .from("likelee-public")
                                  .getPublicUrl(
                                    `job-assets/${selectedJobForApplications.brand_id}/${safeName}`,
                                  ).data?.publicUrl || "";
                            }

                            return (
                              <img
                                src={url}
                                alt={assetName}
                                className="max-w-full max-h-[60vh] object-contain shadow-lg rounded-lg"
                              />
                            );
                          })()}
                        </div>

                        {/* Footer Navigation */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between">
                          <Button
                            variant="outline"
                            className="border-slate-200 text-slate-700 font-medium px-6 py-2 h-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAssetIndex((prev) => {
                                const assets =
                                  selectedJobForApplications?.brand_assets;
                                if (
                                  !Array.isArray(assets) ||
                                  assets.length === 0
                                )
                                  return null;
                                return prev !== null && prev > 0
                                  ? prev - 1
                                  : assets.length - 1;
                              });
                            }}
                          >
                            Previous
                          </Button>

                          <div className="text-slate-400 text-sm font-medium">
                            {selectedAssetIndex + 1} /{" "}
                            {selectedJobForApplications.brand_assets.length}
                          </div>

                          <Button
                            variant="outline"
                            className="border-slate-200 text-slate-700 font-medium px-6 py-2 h-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAssetIndex((prev) => {
                                const assets =
                                  selectedJobForApplications?.brand_assets;
                                if (
                                  !Array.isArray(assets) ||
                                  assets.length === 0
                                )
                                  return null;
                                return prev !== null && prev < assets.length - 1
                                  ? prev + 1
                                  : 0;
                              });
                            }}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                </DialogContent>
              </Dialog>
            </div>
          ) : loadingJobApplications ? (
            <div className="text-sm text-gray-600">
              {t("campaigns.jobs.loadingApplications")}
            </div>
          ) : selectedJobApplications.length === 0 ? (
            <div className="text-sm text-gray-600">
              {t("campaigns.jobs.noApplications")}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-3">
                  {selectedJobApplications.map((app) => (
                    <Card
                      key={app.id}
                      className="p-4 border border-gray-200 rounded-md"
                    >
                      <div className="flex items-center gap-3">
                        {app.applicant_photo_url ? (
                          <img
                            src={app.applicant_photo_url}
                            alt={app.applicant_name || "Applicant"}
                            className="h-10 w-10 rounded-full object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                            {String(
                              app.applicant_name || app.applicant_role || "A",
                            )
                              .trim()
                              .slice(0, 1)
                              .toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {app.applicant_name ||
                              app.applicant_display_name ||
                              String(app.applicant_role || "applicant").replace(
                                "_",
                                " ",
                              )}
                          </p>
                          <p className="text-xs text-gray-600">
                            {String(app.applicant_role || "").replace("_", " ")}
                          </p>
                        </div>
                      </div>
                      {app.message && (
                        <p className="mt-2 text-sm text-gray-700 whitespace-pre-line">
                          {app.message}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-3">
                        {resolveResumeUrl(app) && (
                          <a
                            href={resolveResumeUrl(app)}
                            target="_blank"
                            rel="noreferrer"
                            download={app.resume_name || "resume"}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700"
                          >
                            📄 {t("campaigns.jobs.viewResume")}
                          </a>
                        )}
                        {Array.isArray(app.comp_cards) &&
                        app.comp_cards.length > 0 ? (
                          app.comp_cards.map((cc: any, i: number) => (
                            <a
                              key={cc.url || i}
                              href={cc.url}
                              target="_blank"
                              rel="noreferrer"
                              download={cc.name || `comp_card_${i + 1}`}
                              className="text-sm font-medium text-purple-600 hover:text-purple-700"
                            >
                              🖼️ Card {i + 1}
                            </a>
                          ))
                        ) : app.comp_card_url ? (
                          <a
                            href={app.comp_card_url}
                            target="_blank"
                            rel="noreferrer"
                            download={app.comp_card_name || "comp_card"}
                            className="text-sm font-medium text-purple-600 hover:text-purple-700"
                          >
                            🖼️ {t("campaigns.jobs.compCard")}
                          </a>
                        ) : null}
                        {app.portfolio_link && (
                          <a
                            href={ensureProtocol(app.portfolio_link)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                          >
                            🌐 {t("campaigns.jobs.portfolio")}
                          </a>
                        )}
                        {app.github_link && (
                          <a
                            href={ensureProtocol(app.github_link)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium text-gray-700 hover:text-gray-900"
                          >
                            💻 GitHub
                          </a>
                        )}
                        {app.linkedin_link && (
                          <a
                            href={ensureProtocol(app.linkedin_link)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium text-blue-700 hover:text-blue-800"
                          >
                            🔗 LinkedIn
                          </a>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Contract Update Request Modal */}
      <Dialog
        open={showUpdateRequestModal}
        onOpenChange={setShowUpdateRequestModal}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Request Contract Update
            </DialogTitle>
            <DialogDescription>
              Select how to proceed with the contract update request.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-gray-700 mb-6">
              Choose how you'd like to handle the contract update for this
              campaign.
            </p>

            <div className="space-y-4">
              <Card
                className="p-6 border-2 border-gray-300 hover:border-[#F7B750] cursor-pointer transition-all"
                onClick={() => handleUpdateRequestOption("self")}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#F7B750] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Edit className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      I'll Make the Changes
                    </h3>
                    <p className="text-gray-600">
                      Update contract terms yourself. Modify territory,
                      duration, budget, or deliverables.
                    </p>
                  </div>
                </div>
              </Card>

              <Card
                className="p-6 border-2 border-gray-300 hover:border-blue-500 cursor-pointer transition-all"
                onClick={() => handleUpdateRequestOption("agency")}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      Send to Partner Agency
                    </h3>
                    <p className="text-gray-600">
                      Forward this update request to your partner agency.
                      They'll handle revisions and communicate with talent.
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <Alert className="mt-6 bg-blue-50 border border-blue-200">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <strong>Note:</strong> Contract updates require talent approval.
                They have 48 hours to accept or decline the proposed changes.
              </AlertDescription>
            </Alert>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contract Builder Modal */}
      <Dialog open={showContractBuilder} onOpenChange={setShowContractBuilder}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Contract Builder - {selectedCreator?.name}
            </DialogTitle>
            <DialogDescription>
              Create a new contract for this project.
            </DialogDescription>
            <p className="text-gray-600">Step {contractStep} of 5</p>
          </DialogHeader>

          <div className="py-4">
            {/* Step 1: Project Info */}
            {contractStep === 1 && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Project Information
                </h3>

                <div>
                  <Label className="text-sm font-semibold text-gray-700 block mb-2">
                    Project Name
                  </Label>
                  <Input
                    placeholder="e.g., Holiday Reels Campaign"
                    className="border-2 border-gray-300"
                  />
                </div>

                <div>
                  <Label className="text-sm font-semibold text-gray-700 block mb-2">
                    Deliverables
                  </Label>
                  <Textarea
                    value={contractData.deliverables}
                    onChange={(e) =>
                      setContractData({
                        ...contractData,
                        deliverables: e.target.value,
                      })
                    }
                    placeholder="e.g., 3 Instagram Reels (15-30 seconds each), 1 Hero Image"
                    className="border-2 border-gray-300"
                    rows={3}
                  />
                </div>

                <div>
                  <Label className="text-sm font-semibold text-gray-700 block mb-2">
                    Budget (USD)
                  </Label>
                  <Input
                    type="number"
                    value={contractData.budget}
                    onChange={(e) =>
                      setContractData({
                        ...contractData,
                        budget: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="Enter total budget"
                    className="border-2 border-gray-300"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Starting rate: ${selectedCreator?.price}/project
                  </p>
                </div>

                <Button
                  onClick={() => setContractStep(2)}
                  className="w-full bg-[#F7B750] hover:bg-[#E6A640] text-white"
                >
                  Continue to Terms
                </Button>
              </div>
            )}

            {/* Step 2: Standard Terms */}
            {contractStep === 2 && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Standard Contract Terms
                </h3>

                <div>
                  <Label className="text-sm font-semibold text-gray-700 block mb-2">
                    Territory
                  </Label>
                  <Select
                    value={contractData.territory}
                    onValueChange={(val) =>
                      setContractData({ ...contractData, territory: val })
                    }
                  >
                    <SelectTrigger className="border-2 border-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="us_only">
                        United States Only
                      </SelectItem>
                      <SelectItem value="north_america">
                        North America (US + Canada)
                      </SelectItem>
                      <SelectItem value="eu">European Union</SelectItem>
                      <SelectItem value="global">Global / Worldwide</SelectItem>
                      <SelectItem value="custom">Custom Regions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-semibold text-gray-700 block mb-2">
                    Duration
                  </Label>
                  <Select
                    value={contractData.duration}
                    onValueChange={(val) =>
                      setContractData({ ...contractData, duration: val })
                    }
                  >
                    <SelectTrigger className="border-2 border-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days (1 month)</SelectItem>
                      <SelectItem value="90">
                        90 days (3 months) - Recommended
                      </SelectItem>
                      <SelectItem value="180">180 days (6 months)</SelectItem>
                      <SelectItem value="365">365 days (1 year)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-semibold text-gray-700 block mb-2">
                    Channels / Usage Rights
                  </Label>
                  <Select
                    value={contractData.channels}
                    onValueChange={(val) =>
                      setContractData({ ...contractData, channels: val })
                    }
                  >
                    <SelectTrigger className="border-2 border-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="social_only">
                        Social Media Only (Instagram, TikTok, Facebook)
                      </SelectItem>
                      <SelectItem value="web_social">
                        Web & Social (Website + social platforms)
                      </SelectItem>
                      <SelectItem value="web_social_broadcast">
                        Web, Social & Broadcast (TV, YouTube, streaming)
                      </SelectItem>
                      <SelectItem value="all_channels">
                        All Channels (Except print/outdoor)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-semibold text-gray-700 block mb-2">
                    Auto-Renewal
                  </Label>
                  <Select
                    value={contractData.auto_renewal}
                    onValueChange={(val) =>
                      setContractData({ ...contractData, auto_renewal: val })
                    }
                  >
                    <SelectTrigger className="border-2 border-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">
                        Auto-renew (Recommended) - Creator decides price each
                        renewal
                      </SelectItem>
                      <SelectItem value="no">
                        No auto-renewal - One-time license only
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-semibold text-gray-700 block mb-2">
                    Revisions Included
                  </Label>
                  <Select
                    value={contractData.revisions}
                    onValueChange={(val) =>
                      setContractData({ ...contractData, revisions: val })
                    }
                  >
                    <SelectTrigger className="border-2 border-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 round of revisions</SelectItem>
                      <SelectItem value="2">
                        2 rounds of revisions (Recommended)
                      </SelectItem>
                      <SelectItem value="3">3 rounds of revisions</SelectItem>
                      <SelectItem value="unlimited">
                        Unlimited revisions (Premium, +$500)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-semibold text-gray-700 block mb-2">
                    Exclusivity
                  </Label>
                  <Select
                    value={contractData.exclusivity}
                    onValueChange={(val) =>
                      setContractData({ ...contractData, exclusivity: val })
                    }
                  >
                    <SelectTrigger className="border-2 border-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">
                        No exclusivity - Creator can work with competitors
                      </SelectItem>
                      <SelectItem value="category">
                        Exclusive (within category) - No direct competitors for
                        30 days
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => setContractStep(1)}
                    variant="outline"
                    className="flex-1 border-2 border-gray-300"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => setContractStep(3)}
                    className="flex-1 bg-[#F7B750] hover:bg-[#E6A640] text-white"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Custom Additions */}
            {contractStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Custom Additions (Optional)
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Add specific clauses if needed. Custom terms are reviewed
                    within 24 hours.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
                    <Checkbox
                      checked={contractData.add_disclaimer}
                      onCheckedChange={(checked) =>
                        setContractData({
                          ...contractData,
                          add_disclaimer: !!checked,
                        })
                      }
                    />
                    <div className="flex-1">
                      <Label className="text-base font-semibold text-gray-900 block mb-2">
                        Add Required Disclaimer
                      </Label>
                      {contractData.add_disclaimer && (
                        <Input
                          value={contractData.disclaimer_text}
                          onChange={(e) =>
                            setContractData({
                              ...contractData,
                              disclaimer_text: e.target.value,
                            })
                          }
                          placeholder="Enter disclaimer text..."
                          className="border-2 border-gray-300 mt-2"
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
                    <Checkbox
                      checked={contractData.add_restrictions}
                      onCheckedChange={(checked) =>
                        setContractData({
                          ...contractData,
                          add_restrictions: !!checked,
                        })
                      }
                    />
                    <div className="flex-1">
                      <Label className="text-base font-semibold text-gray-900 block mb-2">
                        Add Content Restrictions
                      </Label>
                      <p className="text-sm text-gray-600 mb-3">
                        Creator agrees NOT to use for:
                      </p>
                      {contractData.add_restrictions && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={contractData.restrictions.competitors}
                              onCheckedChange={(checked) =>
                                setContractData({
                                  ...contractData,
                                  restrictions: {
                                    ...contractData.restrictions,
                                    competitors: !!checked,
                                  },
                                })
                              }
                            />
                            <Label className="text-sm text-gray-700">
                              Competitor brands
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={contractData.restrictions.controversial}
                              onCheckedChange={(checked) =>
                                setContractData({
                                  ...contractData,
                                  restrictions: {
                                    ...contractData.restrictions,
                                    controversial: !!checked,
                                  },
                                })
                              }
                            />
                            <Label className="text-sm text-gray-700">
                              Controversial content
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={contractData.restrictions.political}
                              onCheckedChange={(checked) =>
                                setContractData({
                                  ...contractData,
                                  restrictions: {
                                    ...contractData.restrictions,
                                    political: !!checked,
                                  },
                                })
                              }
                            />
                            <Label className="text-sm text-gray-700">
                              Political campaigns
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={contractData.restrictions.adult}
                              onCheckedChange={(checked) =>
                                setContractData({
                                  ...contractData,
                                  restrictions: {
                                    ...contractData.restrictions,
                                    adult: !!checked,
                                  },
                                })
                              }
                            />
                            <Label className="text-sm text-gray-700">
                              Adult content
                            </Label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
                    <Checkbox
                      checked={contractData.add_liability}
                      onCheckedChange={(checked) =>
                        setContractData({
                          ...contractData,
                          add_liability: !!checked,
                        })
                      }
                    />
                    <div className="flex-1">
                      <Label className="text-base font-semibold text-gray-900 block mb-2">
                        Add Liability Waiver
                      </Label>
                      <p className="text-sm text-gray-600">
                        Brand assumes responsibility if content violates
                        3rd-party IP rights
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
                    <Checkbox
                      checked={contractData.add_special_terms}
                      onCheckedChange={(checked) =>
                        setContractData({
                          ...contractData,
                          add_special_terms: !!checked,
                        })
                      }
                    />
                    <div className="flex-1">
                      <Label className="text-base font-semibold text-gray-900 block mb-2">
                        Add Special Terms
                      </Label>
                      {contractData.add_special_terms && (
                        <Textarea
                          value={contractData.special_terms}
                          onChange={(e) =>
                            setContractData({
                              ...contractData,
                              special_terms: e.target.value,
                            })
                          }
                          placeholder="Enter custom terms (max 500 characters)..."
                          className="border-2 border-gray-300 mt-2"
                          rows={3}
                          maxLength={500}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <Alert className="bg-yellow-50 border border-yellow-300">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <AlertDescription className="text-yellow-900">
                    <strong>Custom clauses flagged for review.</strong> If you
                    add custom terms, Likelee legal will review within 24 hours
                    to ensure creator protection.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-3">
                  <Button
                    onClick={() => setContractStep(2)}
                    variant="outline"
                    className="flex-1 border-2 border-gray-300"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => setContractStep(4)}
                    className="flex-1 bg-[#F7B750] hover:bg-[#E6A640] text-white"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Payment & Escrow */}
            {contractStep === 4 && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Payment & Escrow
                </h3>

                <Card className="p-6 bg-gray-50 border-2 border-gray-300">
                  <div className="space-y-3">
                    <div className="flex justify-between text-lg">
                      <span className="text-gray-700">License Fee:</span>
                      <span className="font-bold text-gray-900">
                        ${contractData.budget.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Likelee Fee (10%):</span>
                      <span className="font-semibold text-gray-900">
                        -${calculateCreatorEarnings().fee.toFixed(0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg pt-3 border-t-2 border-gray-300">
                      <span className="text-gray-700 font-semibold">
                        Creator Earns:
                      </span>
                      <span className="font-bold text-green-600">
                        ${calculateCreatorEarnings().creatorGets.toFixed(0)}
                      </span>
                    </div>
                  </div>
                </Card>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-bold text-gray-900 mb-2">
                    ℹ️ What is Escrow?
                  </h4>
                  <p className="text-sm text-gray-700 mb-2">
                    Your ${contractData.budget} is held securely in escrow. When
                    you approve deliverables, the creator gets paid.
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Protection:</strong> Funds are only released once
                    you have reviewed and approved all campaign deliverables.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <span className="text-gray-700">Payment Terms:</span>
                    <Badge className="bg-green-100 text-green-700 border border-green-300">
                      Escrow (Recommended)
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <span className="text-gray-700">Payment Release:</span>
                    <span className="text-gray-900">Upon brand approval</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <span className="text-gray-700">Approval Deadline:</span>
                    <span className="text-gray-900">
                      Manual Approval Required
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => setContractStep(3)}
                    variant="outline"
                    className="flex-1 border-2 border-gray-300"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => setContractStep(5)}
                    className="flex-1 bg-[#F7B750] hover:bg-[#E6A640] text-white"
                  >
                    Review Contract
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5: Final Review */}
            {contractStep === 5 && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Contract Summary
                </h3>

                <Card className="p-6 bg-white border-2 border-gray-300">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">
                    Project Details
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Creator:</span>
                      <span className="font-semibold text-gray-900">
                        {selectedCreator?.name}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Deliverables:</span>
                      <span className="font-semibold text-gray-900">
                        {contractData.deliverables}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Budget:</span>
                      <span className="font-semibold text-gray-900">
                        ${contractData.budget}
                      </span>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-white border-2 border-gray-300">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">
                    Contract Terms
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-gray-600 mb-1">Territory</p>
                      <p className="font-semibold text-gray-900">
                        {contractData.territory === "us_only"
                          ? "United States Only"
                          : contractData.territory === "north_america"
                            ? "North America"
                            : contractData.territory === "eu"
                              ? "European Union"
                              : contractData.territory === "global"
                                ? "Global / Worldwide"
                                : "Custom"}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-gray-600 mb-1">Duration</p>
                      <p className="font-semibold text-gray-900">
                        {contractData.duration} days
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-gray-600 mb-1">Channels</p>
                      <p className="font-semibold text-gray-900">
                        {contractData.channels === "social_only"
                          ? "Social Media Only"
                          : contractData.channels === "web_social"
                            ? "Web & Social"
                            : contractData.channels === "web_social_broadcast"
                              ? "Web, Social & Broadcast"
                              : "All Channels"}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-gray-600 mb-1">Auto-Renewal</p>
                      <p className="font-semibold text-gray-900">
                        {contractData.auto_renewal === "yes" ? "Yes" : "No"}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-gray-600 mb-1">Revisions</p>
                      <p className="font-semibold text-gray-900">
                        {contractData.revisions} rounds
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-gray-600 mb-1">Exclusivity</p>
                      <p className="font-semibold text-gray-900">
                        {contractData.exclusivity === "no"
                          ? "No"
                          : "Yes (Category)"}
                      </p>
                    </div>
                  </div>

                  {(contractData.add_disclaimer ||
                    contractData.add_restrictions ||
                    contractData.add_liability ||
                    contractData.add_special_terms) && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="font-semibold text-yellow-900 mb-2">
                        Custom Terms Added:
                      </p>
                      <ul className="text-sm text-yellow-800 space-y-1">
                        {contractData.add_disclaimer && (
                          <li>• Required disclaimer included</li>
                        )}
                        {contractData.add_restrictions && (
                          <li>• Content restrictions added</li>
                        )}
                        {contractData.add_liability && (
                          <li>• Liability waiver included</li>
                        )}
                        {contractData.add_special_terms && (
                          <li>• Special terms added</li>
                        )}
                      </ul>
                    </div>
                  )}
                </Card>

                <Card className="p-6 bg-green-50 border-2 border-green-300">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    <h4 className="text-lg font-bold text-gray-900">
                      This matches our standard template
                    </h4>
                  </div>
                  <p className="text-gray-700">
                    Contract can be sent immediately to {selectedCreator?.name}
                  </p>
                </Card>

                <div className="flex gap-3">
                  <Button
                    onClick={() => setContractStep(4)}
                    variant="outline"
                    className="flex-1 border-2 border-gray-300"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleContractSubmit}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Send className="w-5 h-5 mr-2" />
                    Send Contract to Creator
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? "w-64" : "w-20"} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col fixed h-screen z-40 ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* Brand Section */}
        <div className="p-6 border-b border-gray-200">
          {brand && sidebarOpen ? (
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 border-2 border-gray-200 rounded-lg">
                <AvatarImage src={brand.logo} alt={brand.name} />
                <AvatarFallback className="font-bold text-gray-700">
                  {getBrandInitials(brand.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 truncate">{brand.name}</p>
                <p className="text-xs text-gray-600 truncate">
                  {brandPlanLabel}
                </p>
              </div>
            </div>
          ) : brand ? (
            <Avatar className="w-12 h-12 border-2 border-gray-200 rounded-lg mx-auto">
              <AvatarImage src={brand.logo} alt={brand.name} />
              <AvatarFallback className="font-bold text-gray-700">
                {getBrandInitials(brand.name)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse" />
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isCampaignGroup = item.id === "campaigns";
              const isActive = isCampaignGroup
                ? activeSection === "campaigns-hub" ||
                  activeSection === "campaigns-inbox" ||
                  activeSection === "campaign-offers" ||
                  activeSection === "campaigns-contract-hub" ||
                  activeSection === "campaigns-deliverables" ||
                  activeSection === "studio"
                : activeSection === item.id;

              return (
                <div key={item.id}>
                  <div
                    className={`w-full flex items-center gap-2 rounded-lg transition-all ${
                      isActive
                        ? "bg-[#F7B750] text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <button
                      onClick={() => {
                        if (item.id === "campaigns") {
                          navigateToSection("campaigns-hub", {
                            campaignHubTab: "active",
                          });
                          setSelectedCampaign(null);
                          return;
                        }
                        navigateToSection(item.id);
                        setShowEscrowDetails(false);
                        setShowBriefDetails(false);
                        setShowCreatorProfile(false);
                        setShowContractHub(false);
                        setSelectedContract(null);
                      }}
                      className="flex-1 flex items-center gap-3 px-3 py-3 text-left"
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {sidebarOpen && (
                        <>
                          <span className="flex-1 text-left font-medium">
                            {item.label}
                          </span>
                          {!isCampaignGroup &&
                            item.badge !== undefined &&
                            item.badge > 0 && (
                              <Badge
                                className={
                                  isActive
                                    ? "bg-white text-[#F7B750]"
                                    : "bg-gray-700 text-white"
                                }
                              >
                                {item.badge}
                              </Badge>
                            )}
                          {isCampaignGroup &&
                            item.badge !== undefined &&
                            item.badge > 0 && (
                              <Badge
                                className={
                                  isActive
                                    ? "bg-white text-[#F7B750]"
                                    : "bg-gray-700 text-white"
                                }
                              >
                                {item.badge}
                              </Badge>
                            )}
                        </>
                      )}
                    </button>

                    {sidebarOpen && isCampaignGroup && (
                      <button
                        type="button"
                        aria-label={
                          showCampaignSubtabs
                            ? t("campaigns.hideCampaignSubtabs")
                            : t("campaigns.showCampaignSubtabs")
                        }
                        onClick={() => setShowCampaignSubtabs((prev) => !prev)}
                        className="inline-flex items-center justify-center px-2 mr-2"
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${
                            showCampaignSubtabs ? "rotate-0" : "-rotate-90"
                          }`}
                        />
                      </button>
                    )}
                  </div>

                  {sidebarOpen && isCampaignGroup && showCampaignSubtabs && (
                    <div className="mt-1 ml-11 space-y-1">
                      <button
                        onClick={() => {
                          navigateToSection("campaign-offers", {
                            campaignView: "active",
                          });
                        }}
                        className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-all ${
                          activeSection === "campaign-offers"
                            ? "bg-gray-100 text-gray-900"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <Target className="w-4 h-4" />
                        <span className="flex-1 text-left">
                          {t("campaigns.myOffers.title")}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          if (canViewInbox) {
                            navigateToSection("campaigns-inbox");
                          }
                        }}
                        disabled={!canViewInbox}
                        className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-all ${
                          activeSection === "campaigns-inbox"
                            ? "bg-gray-100 text-gray-900"
                            : canViewInbox
                              ? "text-gray-600 hover:bg-gray-100"
                              : "text-gray-400 cursor-not-allowed"
                        }`}
                        title={
                          !canViewInbox ? t("campaigns.inbox.noPermission") : ""
                        }
                      >
                        <Mail className="w-4 h-4" />
                        <span className="flex-1 text-left">
                          {t("campaigns.inbox.title")}
                        </span>
                        {canViewInbox && inboxPendingCount > 0 && (
                          <Badge className="bg-gray-200 text-gray-700">
                            {inboxPendingCount}
                          </Badge>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          navigateToSection("campaigns-contract-hub");
                        }}
                        className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-all ${
                          activeSection === "campaigns-contract-hub"
                            ? "bg-gray-100 text-gray-900"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                        <span className="flex-1 text-left">
                          {t("campaigns.contractHub.title")}
                        </span>
                        {contractHubPendingCount > 0 && (
                          <Badge className="bg-amber-100 text-amber-800 border border-amber-200">
                            {contractHubPendingCount}
                          </Badge>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          navigateToSection("campaigns-deliverables");
                        }}
                        className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-all ${
                          activeSection === "campaigns-deliverables"
                            ? "bg-gray-100 text-gray-900"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="flex-1 text-left">
                          {t("campaigns.deliverables.title")}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          navigateToSection("campaigns-hub", {
                            campaignHubTab: "jobs",
                          });
                        }}
                        className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-all ${
                          activeSection === "campaigns-hub" &&
                          campaignHubTab === "jobs"
                            ? "bg-gray-100 text-gray-900"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <Briefcase className="w-4 h-4" />
                        <span className="flex-1 text-left">
                          {t("campaigns.jobs.title")}
                        </span>
                      </button>
                      <button
                        onClick={() => setActiveSection("studio")}
                        className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-all ${
                          activeSection === "studio"
                            ? "bg-gray-100 text-gray-900"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <ImageIcon className="w-4 h-4" />
                        <span className="text-left">
                          {t("assetLibrary.title")}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Toggle Sidebar Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-4 border-t border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <Menu className="w-5 h-5 text-gray-600 mx-auto" />
        </button>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main
        className={`flex-1 ${sidebarOpen ? "md:ml-64" : "md:ml-20"} transition-all duration-300 overflow-y-auto`}
      >
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-sm font-bold text-gray-900 truncate">
            {navigationItems.find((n) => n.id === activeSection)?.label ||
              t("dashboard.navigation.dashboard")}
          </span>
        </div>
        <div className="p-4 sm:p-6 md:p-8">
          <TrialCountdownBanner trialEndsAt={brandTrialEndsAt} />
          {activeSection === "home" && renderHome()}
          {activeSection === "marketplace" && renderCreatorMarketplace()}
          {activeSection === "marketplace-agencies" &&
            renderAgencyMarketplace()}
          {activeSection === "campaigns-hub" &&
            (campaignHubTab === "jobs" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {t("campaigns.jobs.title")}
                  </h3>
                  <Button
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        window.localStorage.removeItem("jobDraftId");
                        window.localStorage.removeItem("jobEditMode");
                      }
                      navigate(createPageUrl("PostJob"));
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                  >
                    {t("postJobPage.title")}
                  </Button>
                </div>
                <Card className="p-4 bg-white border border-gray-200">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <Input
                      value={jobSearch}
                      onChange={(e) => setJobSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setJobSearch("");
                      }}
                      placeholder={t("campaigns.jobs.searchPlaceholder")}
                      className="pl-9 pr-9"
                    />
                    {jobSearch && (
                      <button
                        type="button"
                        onClick={() => setJobSearch("")}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                        aria-label="Clear search"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </Card>
                {loadingBrandJobs && (
                  <Card className="p-6 text-sm text-gray-600">
                    {t("campaigns.jobs.loadingJobPostings")}
                  </Card>
                )}
                {!loadingBrandJobs && brandJobs.length === 0 && (
                  <Card className="p-8 text-center text-sm text-gray-600">
                    <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="font-semibold text-gray-800">
                      {t("campaigns.jobs.noJobPostingsYet")}
                    </p>
                    <p className="text-gray-500 mt-1">
                      {t("campaigns.jobs.postFirstJob")}
                    </p>
                  </Card>
                )}
                {brandJobs
                  .filter((job) => {
                    const haystack =
                      `${job?.job_title || ""} ${job?.about_role || ""}`.toLowerCase();
                    if (
                      jobSearch.trim() &&
                      !haystack.includes(jobSearch.trim().toLowerCase())
                    ) {
                      return false;
                    }
                    return true;
                  })
                  .map((job) => (
                    <Card
                      key={job.id}
                      className="p-6 bg-white border border-slate-200 border-l-4 border-l-blue-500 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col lg:flex-row gap-6">
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center text-lg font-semibold">
                                {String(job.job_title || job.title || "J")
                                  .trim()
                                  .slice(0, 1)
                                  .toUpperCase()}
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-gray-900">
                                  {job.job_title || job.title}
                                </h3>
                                <p className="text-sm text-gray-500">
                                  {formatJobLabel(job.location || "Remote")} •{" "}
                                  {formatJobLabel(job.job_type || "Project")}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge
                                variant="outline"
                                className={`border ${
                                  job.status === "open"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                    : job.status === "draft"
                                      ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50"
                                      : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100"
                                }`}
                              >
                                {job.status === "open"
                                  ? t("campaigns.jobs.open")
                                  : job.status === "draft"
                                    ? t("statuses.draft")
                                    : job.status === "closed"
                                      ? t("campaigns.jobs.closed")
                                      : job.status || t("campaigns.jobs.open")}
                              </Badge>
                              <Badge
                                variant="outline"
                                className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50"
                              >
                                {String(job.call_type || "call").replace(
                                  "_",
                                  " ",
                                )}
                              </Badge>
                              {job.category ? (
                                <Badge
                                  variant="outline"
                                  className="bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-50"
                                >
                                  {String(job.category).replace("_", " ")}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {job.about_role ||
                                t("campaigns.jobs.noRoleDescription")}
                            </p>
                          </div>
                          <div className="flex flex-col items-start gap-2 lg:items-end lg:ml-auto">
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-gray-500">
                              {job.budget ? (
                                <span>
                                  {t("campaigns.jobs.budget")} {job.budget}{" "}
                                  {job.currency || "USD"}
                                </span>
                              ) : null}
                              {job.start_date ? (
                                <span>
                                  {t("campaigns.jobs.start")} {job.start_date}
                                </span>
                              ) : null}
                              {job.end_date ? (
                                <span>
                                  {t("campaigns.jobs.end")} {job.end_date}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <div className="pt-3 border-t border-slate-200 flex flex-wrap gap-2">
                          {job.status === "open" && (
                            <Button
                              variant="outline"
                              className="border-2 rounded-md border-red-200 text-red-600 hover:bg-red-50 flex-1 sm:flex-none"
                              disabled={!canManageJobs}
                              title={
                                !canManageJobs
                                  ? "You do not have permission to manage jobs"
                                  : ""
                              }
                              onClick={() =>
                                updateJobStatus(String(job.id), "closed")
                              }
                            >
                              {t("campaigns.jobs.closeJob")}
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            className="border-2 rounded-md flex-1 sm:flex-none"
                            onClick={() =>
                              setSelectedJobForApplications({
                                ...job,
                                _showDetailsOnly: true,
                              })
                            }
                          >
                            {t("campaigns.jobs.viewDetails")}
                          </Button>
                          <Button
                            variant="outline"
                            className="border-2 rounded-md flex-1 sm:flex-none"
                            onClick={async () => {
                              setSelectedJobForApplications(job);
                              setLoadingJobApplications(true);
                              try {
                                const res = await base44.get<{
                                  applications?: any[];
                                }>(`/api/jobs/${job.id}/applications`);
                                setSelectedJobApplications(
                                  Array.isArray(res?.applications)
                                    ? res.applications
                                    : [],
                                );
                              } catch {
                                setSelectedJobApplications([]);
                              } finally {
                                setLoadingJobApplications(false);
                              }
                            }}
                          >
                            {t("campaigns.jobs.viewApplications")}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                {!loadingBrandJobs &&
                  brandJobs.length > 0 &&
                  brandJobs.filter((job) => {
                    const haystack =
                      `${job?.job_title || ""} ${job?.about_role || ""}`.toLowerCase();
                    if (
                      jobSearch.trim() &&
                      !haystack.includes(jobSearch.trim().toLowerCase())
                    ) {
                      return false;
                    }
                    return true;
                  }).length === 0 && (
                    <Card className="p-8 text-center">
                      <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="font-semibold text-gray-800">
                        No results found
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Try different keywords or adjust your filters.
                      </p>
                      {jobSearch && (
                        <button
                          type="button"
                          onClick={() => setJobSearch("")}
                          className="mt-3 text-sm text-blue-600 hover:underline"
                        >
                          Clear search
                        </button>
                      )}
                    </Card>
                  )}
              </div>
            ) : (
              <BrandCampaignDashboard
                embedded
                openNewCampaignSignal={openCampaignModalSignal}
                prefillCampaignContext={campaignBuilderContext}
              />
            ))}
          {activeSection === "campaigns-inbox" && renderInboxSubtab()}
          {activeSection === "campaign-offers" && renderCampaigns()}
          {activeSection === "campaigns-contract-hub" &&
            renderCampaignContractHub()}
          {activeSection === "campaigns-deliverables" &&
            renderCampaignDeliverablesHub()}
          {activeSection === "studio" && renderStudio()}
          {activeSection === "licensing-requests" &&
            renderBrandLicensingRequests()}
          {activeSection === "analytics" && renderAnalytics()}
          {activeSection === "usage" && renderUsageRights()}
          {activeSection === "billing" && renderBilling()}
          {activeSection === "settings" && renderSettings()}
        </div>
      </main>
      {/* Dismiss Confirmation Modal */}
      <Dialog
        open={!!dismissingPkg}
        onOpenChange={(open) => {
          if (!open && !dismissingBusy) setDismissingPkg(null);
        }}
      >
        <DialogContent className="max-w-sm bg-white rounded-2xl border-none shadow-2xl p-8">
          <div className="flex flex-col items-center gap-5 text-center">
            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Trash2 className="w-7 h-7 text-gray-500" />
            </div>

            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">
                {t("campaigns.inbox.dismissModal.title")}
              </h3>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                {t("campaigns.inbox.dismissModal.descriptionPrefix")}{" "}
                <span className="font-semibold text-gray-800">
                  {dismissingPkg?.title ||
                    dismissingPkg?.campaign_offers?.offer_title ||
                    dismissingPkg?.campaign_offers?.brand_campaigns?.name ||
                    t("campaigns.inbox.dismissModal.thisPackage")}
                </span>{" "}
                {t("campaigns.inbox.dismissModal.from")}{" "}
                <span className="font-semibold text-gray-800">
                  {dismissingPkg?.agencies?.agency_name ||
                    t("campaigns.inbox.dismissModal.theAgency")}
                </span>{" "}
                {t("campaigns.inbox.dismissModal.descriptionSuffix")}
              </p>
            </div>

            <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-left">
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                {t("campaigns.inbox.dismissModal.goodToKnow")}
              </p>
              <ul className="text-xs text-gray-600 space-y-1.5">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                  {t("campaigns.inbox.dismissModal.points.viewOnly")}
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                  {t("campaigns.inbox.dismissModal.points.noAssignments")}
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                  {t("campaigns.inbox.dismissModal.points.receiveNew")}
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-3 w-full mt-1">
              <Button
                className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-xl h-11 font-bold"
                disabled={dismissingBusy}
                onClick={async () => {
                  const pkg = dismissingPkg;
                  if (!pkg) return;
                  const offerId = String(
                    pkg?.offer_id || pkg?.campaign_offers?.id || "",
                  ).trim();
                  const packageId = String(pkg?.id || "").trim();
                  if (!offerId || !packageId) return;
                  setDismissingBusy(true);
                  try {
                    await base44.post(
                      `/api/campaign-offers/${encodeURIComponent(offerId)}/packages/${encodeURIComponent(packageId)}/dismiss`,
                      {},
                    );
                    setInboxPackages((prev: any[]) =>
                      prev.filter((p: any) => p.id !== packageId),
                    );
                    setDismissingPkg(null);
                    toast({
                      title: "Package removed",
                      description: "Removed from your inbox.",
                    });
                  } catch (e: any) {
                    const msg = String(e?.message || "");
                    toast({
                      title: "Could not remove package",
                      description: msg.includes(
                        "cannot_dismiss_finalized_package",
                      )
                        ? "This package has been finalized and cannot be removed."
                        : msg || "Please try again.",
                      variant: "destructive" as any,
                    });
                  } finally {
                    setDismissingBusy(false);
                  }
                }}
              >
                {dismissingBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {t("campaigns.inbox.dismissModal.confirm")}
              </Button>
              <Button
                variant="ghost"
                className="w-full rounded-xl h-11 font-semibold text-sm text-gray-500 hover:text-gray-700"
                disabled={dismissingBusy}
                onClick={() => setDismissingPkg(null)}
              >
                {t("campaigns.licensingRequest.cancel")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Finalized Package — Cannot Dismiss Modal */}
      <Dialog
        open={!!finalizedPackageInfo}
        onOpenChange={(open) => !open && setFinalizedPackageInfo(null)}
      >
        <DialogContent className="max-w-sm bg-white rounded-2xl border-none shadow-2xl p-8">
          <div className="flex flex-col items-center gap-5 text-center">
            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <FileText className="w-8 h-8 text-gray-500" />
            </div>

            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">
                Package in Progress
              </h3>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                <span className="font-semibold text-gray-700">
                  {finalizedPackageInfo?.title}
                </span>{" "}
                from{" "}
                <span className="font-semibold text-gray-700">
                  {finalizedPackageInfo?.agencyName}
                </span>{" "}
                has already been finalized. Talent assignments and contracts are
                in progress and this package cannot be removed from your inbox.
              </p>
            </div>

            <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-left space-y-2">
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest">
                What you can do
              </p>
              <ul className="text-xs text-gray-600 space-y-1.5">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                  View the contract in the Contract Hub
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                  Track deliverables once the contract is signed
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                  This package will automatically disappear from your inbox once
                  its expiry date passes
                </li>
              </ul>
            </div>

            <Button
              className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-xl h-11 font-bold"
              onClick={() => setFinalizedPackageInfo(null)}
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Mark Done */}
      <AlertDialog
        open={!!confirmingDonePkg}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmingDonePkg(null);
            setConfirmingDonePkgPublicData(null);
          }
        }}
      >
        <AlertDialogContent className="bg-white rounded-none border border-gray-300 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold text-gray-900">
              Confirm Selection
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 space-y-4">
              <p>
                You are about to finalize your talent selection for{" "}
                <strong>{confirmingDonePkg?.title}</strong>.
              </p>
              <div className="bg-gray-50 p-4 border border-gray-100">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Selected Talents:
                </p>
                {loadingConfirmingDonePkgPublicData ? (
                  <p className="text-sm text-gray-500 italic">
                    Loading selections...
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {(() => {
                      const publicPkg = confirmingDonePkgPublicData;

                      // Selected IDs come exclusively from the public package
                      // interactions (type "selected") — these are written when
                      // the brand clicks the ✓ button in PublicPackageView.
                      // meta.selected_talent_ids is only written AFTER brand-done
                      // is called, so it's never available at this point.
                      //
                      // Independent connected creators have talent_id = null and
                      // creator_id set instead — use whichever is present.
                      const selectedIds = (publicPkg?.interactions || [])
                        .filter((i: any) => i?.type === "selected")
                        .map((i: any) =>
                          String(i?.talent_id || i?.creator_id || "").trim(),
                        )
                        .filter(Boolean);

                      if (selectedIds.length === 0) {
                        return (
                          <li className="text-sm italic text-gray-500">
                            No talent selected yet. Open the package, select the
                            talent you want, then come back to confirm.
                          </li>
                        );
                      }

                      // Resolve names from the public package items — these come
                      // from agency_users and have stage_name / full_legal_name.
                      // The package_snapshot.items only carry a stale talent_name
                      // string and must not be used as the primary source.
                      const publicItems: any[] = Array.isArray(publicPkg?.items)
                        ? publicPkg.items
                        : [];

                      // Build a lookup keyed on whichever identity is present:
                      // talent_id (agency_users.id) for onboarded roster talent,
                      // creator_id (creators.id) for independent connected creators.
                      const nameById = new Map<string, string>();
                      for (const item of publicItems) {
                        const id = String(
                          item?.talent_id || item?.creator_id || item?.id || "",
                        ).trim();
                        if (!id) continue;
                        const name =
                          item?.talent?.stage_name ||
                          item?.talent?.full_legal_name ||
                          item?.talent?.full_name ||
                          item?.talent_name ||
                          null;
                        if (name) nameById.set(id, name);
                      }

                      return selectedIds.map((id: string, idx: number) => (
                        <li
                          key={idx}
                          className="text-sm font-medium text-gray-900 flex items-center gap-2"
                        >
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                          {nameById.get(id) || id}
                        </li>
                      ));
                    })()}
                  </ul>
                )}
              </div>
              <p className="text-sm font-medium text-red-600 bg-red-50 p-3 border border-red-100 italic">
                Note: Once you click "Confirm", you will not be able to modify
                your selection again. The agency will be notified of your final
                choice.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none border-gray-300">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-none bg-black hover:bg-gray-800 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={
                loadingConfirmingDonePkgPublicData ||
                (() => {
                  const selectedIds = (
                    confirmingDonePkgPublicData?.interactions || []
                  )
                    .filter((i: any) => i?.type === "selected")
                    .map((i: any) =>
                      String(i?.talent_id || i?.creator_id || "").trim(),
                    )
                    .filter(Boolean);
                  return selectedIds.length === 0;
                })()
              }
              onClick={async () => {
                const pkg = confirmingDonePkg;
                if (!pkg) return;
                try {
                  // selected_talent_ids come from the public package interactions
                  // (type "selected") — the only reliable source before brand-done
                  // is called. meta.selected_talent_ids doesn't exist yet at this point.
                  // Use talent_id when present (agency_users.id), otherwise creator_id
                  // (creators.id) for independent connected creators.
                  const selectedTalentIds = (
                    confirmingDonePkgPublicData?.interactions || []
                  )
                    .filter((i: any) => i?.type === "selected")
                    .map((i: any) =>
                      String(i?.talent_id || i?.creator_id || "").trim(),
                    )
                    .filter(Boolean);

                  await base44.post(
                    `/api/campaign-offers/${encodeURIComponent(String(pkg?.offer_id || ""))}/packages/brand-done`,
                    {
                      package_id: String(pkg?.id || ""),
                      feedback_note: "Brand completed package selection.",
                      selected_talent_ids: selectedTalentIds,
                    },
                  );
                  const response = await base44.get<{ packages?: any[] }>(
                    "/api/brand/inbox/packages",
                  );
                  setInboxPackages(
                    Array.isArray(response?.packages) ? response.packages : [],
                  );
                  toast({
                    title: "Package submitted",
                    description:
                      "Your package selection was submitted to the agency.",
                  });
                } catch (e: any) {
                  const msg = String(e?.message || "");
                  // Surface assignment errors from the backend clearly
                  let description = msg || "Please try again.";
                  try {
                    const parsed = JSON.parse(msg);
                    if (parsed?.error === "assignment_errors") {
                      description = parsed.message || description;
                    }
                  } catch {
                    // not JSON — use raw message
                  }
                  toast({
                    title: "Unable to submit package",
                    description,
                    variant: "destructive" as any,
                  });
                } finally {
                  setConfirmingDonePkg(null);
                  setConfirmingDonePkgPublicData(null);
                }
              }}
            >
              Confirm Selection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <div className="w-full aspect-[4/5] relative flex items-center justify-center bg-gray-900">
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
                    <p className="text-sm text-gray-500 max-w-xs mb-8">
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
                        className="rounded-none bg-[#F7B750] hover:bg-[#F7B750]/90 text-white font-black uppercase tracking-widest text-[10px] px-8 shadow-[4px_4px_0px_rgba(247,183,80,0.3)]"
                        onClick={() => {
                          const billingTab = document.querySelector(
                            '[id*="billing-management"]',
                          ) as HTMLElement;
                          if (billingTab) {
                            billingTab.click();
                          }
                          setPreviewImage(null);
                        }}
                      >
                        Pay Now
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
                        ? getPublicUrl(previewImage, {
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
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-md flex items-center justify-center"
                    onClick={() => {
                      const nextIndex =
                        previewIndex > 0
                          ? previewIndex - 1
                          : previewItems.length - 1;
                      setPreviewIndex(nextIndex);
                      setPreviewImage(previewItems[nextIndex]);
                    }}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-md flex items-center justify-center"
                    onClick={() => {
                      const nextIndex =
                        previewIndex < previewItems.length - 1
                          ? previewIndex + 1
                          : 0;
                      setPreviewIndex(nextIndex);
                      setPreviewImage(previewItems[nextIndex]);
                    }}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
              <div className="absolute top-4 right-4 flex gap-3">
                {["approved", "accepted", "brand_approved"].includes(
                  String(previewImage?.status || "").toLowerCase(),
                ) && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-none bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-md"
                    onClick={() => {
                      if (previewImage)
                        void downloadOfferHubDeliverable(previewImage);
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" /> Download
                  </Button>
                )}
              </div>
            </div>
            {previewImage?.caption && (
              <div className="w-full bg-gray-900 p-6 text-white text-sm border-t border-white/10">
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2">
                  Caption
                </p>
                <p className="text-sm leading-relaxed">
                  {previewImage.caption}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog
        open={reviewDialog.open}
        onOpenChange={(open) => setReviewDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-[500px] rounded-none p-0 overflow-hidden border border-gray-200 shadow-2xl">
          <div className="bg-gray-900 p-8 text-white relative">
            <DialogHeader className="space-y-1 relative z-10">
              <div className="w-12 h-12 bg-white/10 rounded-none flex items-center justify-center mb-4 border border-white/20">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <DialogTitle className="text-2xl font-bold font-syne text-white">
                Review Feedback
              </DialogTitle>
              <p className="text-gray-400 text-sm">
                Provide feedback to help the creator refine this asset.
              </p>
            </DialogHeader>
          </div>

          <div className="p-8 space-y-6 bg-white">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Your Feedback
              </label>
              <Textarea
                placeholder="What exactly should be changed? (e.g., 'Need more lighting', 'Crop the left side')"
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

            <DialogFooter className="flex-col sm:flex-row gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-none border-gray-200 hover:bg-gray-50 font-bold"
                onClick={() =>
                  setReviewDialog((prev) => ({ ...prev, open: false }))
                }
              >
                Cancel
              </Button>
              <Button
                className="flex-1 h-12 rounded-none bg-black hover:bg-gray-800 text-white font-bold shadow-lg shadow-black/10 transition-all active:scale-[0.98]"
                disabled={
                  !reviewDialog.note.trim() ||
                  reviewing === reviewDialog.delId ||
                  !canApproveDeliverables
                }
                onClick={() =>
                  handleDeliverableReview(
                    reviewDialog.offerId,
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

      <Dialog
        open={escrowReleasedModal.open}
        onOpenChange={(open) =>
          setEscrowReleasedModal((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl p-0 overflow-hidden rounded-none">
          <div className="relative p-8 text-center flex flex-col items-center">
            {/* Celebratory Background Elements */}
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
                Campaign Complete!
              </DialogTitle>
              <DialogDescription className="text-gray-500 text-base font-medium text-center">
                All deliverables have been approved. The collaboration was a
                success!
              </DialogDescription>
            </DialogHeader>

            <div className="w-full bg-gray-50 border border-gray-100 p-6 mb-8 text-left">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                  Escrow Release
                </span>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 rounded-none font-bold uppercase tracking-tighter text-[10px] h-5 px-1.5 py-0 flex items-center">
                  Released via Stripe
                </Badge>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-gray-900 leading-none">
                  {escrowReleasedModal.amount
                    ? new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: escrowReleasedModal.currency || "USD",
                      }).format(escrowReleasedModal.amount / 100)
                    : "--"}
                </span>
                <span className="text-xs font-bold text-gray-500 uppercase">
                  {escrowReleasedModal.currency}
                </span>
              </div>
              <p className="mt-4 text-[13px] text-gray-600 leading-relaxed font-medium">
                Funds have been successfully distributed to the agency and
                assigned talent's connected accounts.
              </p>
            </div>

            <Button
              className="w-full h-14 bg-black hover:bg-gray-800 text-white font-black uppercase tracking-widest text-sm rounded-none shadow-xl transition-all active:scale-[0.98]"
              onClick={() => setEscrowReleasedModal({ open: false })}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Collection Dialog */}
      <Dialog
        open={showCreateCollectionDialog}
        onOpenChange={setShowCreateCollectionDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("assetLibrary.actions.createCollection")}
            </DialogTitle>
            <DialogDescription>
              {t("assetLibrary.createCollectionDialog.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="collection-name">
                {t("assetLibrary.createCollectionDialog.collectionName")}
              </Label>
              <Input
                id="collection-name"
                placeholder={t(
                  "assetLibrary.createCollectionDialog.collectionNamePlaceholder",
                )}
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateCollection();
                }}
              />
            </div>
            <p className="text-sm text-gray-500">
              {selectedAssetIds.size > 0
                ? t("assetLibrary.createCollectionDialog.assetsSelected", {
                    count: selectedAssetIds.size,
                  })
                : t("assetLibrary.createCollectionDialog.noAssetsSelected")}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateCollectionDialog(false)}
            >
              {t("campaigns.licensingRequest.cancel")}
            </Button>
            <Button onClick={handleCreateCollection}>
              {t("assetLibrary.actions.createCollection")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filter Dialog */}
      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("assetLibrary.filterDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("assetLibrary.filterDialog.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="text-sm font-semibold">
                {t("assetLibrary.filterDialog.assetType")}
              </Label>
              <div className="flex gap-2">
                <Button
                  variant={filterType === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("all")}
                  className="flex-1"
                >
                  {t("assetLibrary.filterDialog.all")}
                </Button>
                <Button
                  variant={filterType === "image" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("image")}
                  className="flex-1"
                >
                  <ImageIcon className="w-4 h-4 mr-1" />
                  {t("assetLibrary.stats.images")}
                </Button>
                <Button
                  variant={filterType === "video" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("video")}
                  className="flex-1"
                >
                  <Video className="w-4 h-4 mr-1" />
                  {t("assetLibrary.stats.videos")}
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-semibold">
                {t("assetLibrary.filterDialog.dateRange")}
              </Label>
              <div className="flex gap-2">
                <Button
                  variant={filterDateRange === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterDateRange("all")}
                  className="flex-1"
                >
                  {t("assetLibrary.filterDialog.allTime")}
                </Button>
                <Button
                  variant={filterDateRange === "week" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterDateRange("week")}
                  className="flex-1"
                >
                  {t("assetLibrary.filterDialog.lastWeek")}
                </Button>
                <Button
                  variant={filterDateRange === "month" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterDateRange("month")}
                  className="flex-1"
                >
                  {t("assetLibrary.filterDialog.lastMonth")}
                </Button>
                <Button
                  variant={filterDateRange === "year" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterDateRange("year")}
                  className="flex-1"
                >
                  {t("assetLibrary.filterDialog.lastYear")}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setFilterType("all");
                setFilterDateRange("all");
              }}
            >
              {t("assetLibrary.filterDialog.reset")}
            </Button>
            <Button onClick={() => setShowFilterDialog(false)}>
              {t("assetLibrary.filterDialog.apply")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Asset Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Asset</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{assetToDelete?.file_name}"? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteAsset}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Package Confirmation Dialog */}
      <Dialog
        open={showDeletePackageDialog}
        onOpenChange={setShowDeletePackageDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Package</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "
              {packageToDelete?.title || "this package"}"? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeletePackageDialog(false)}
              disabled={deletingPackage}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeletePackage}
              disabled={deletingPackage}
            >
              {deletingPackage ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
