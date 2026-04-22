import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { DobInput } from "@/components/ui/DobInput";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import TalentPortal from "@/pages/TalentPortal";
import {
  acceptCreatorAgencyInvite,
  declineCreatorAgencyInvite,
  disconnectCreatorAgencyConnection,
  listCreatorAgencyConnections,
  listCreatorAgencyInvites,
  syncCreatorAgencyMarketplaceContract,
  type CreatorAgencyConnection,
  type CreatorAgencyInvite,
} from "@/api/creatorAgencyConnection";
import {
  getKycStatus,
  getCreatorBillingStatus,
  listTalentAgencyInvites,
  listTalentAssetRequests,
  listTalentBookings,
  listTalentLicenses,
  listTalentLicensingRequests,
  markTalentAssetRequestViewed,
} from "@/api/functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ToastAction } from "@/components/ui/toast";
import { getUserFriendlyError } from "@/utils";
import {
  clearStoredKycSessionUrl,
  loadStoredKycSessionUrl,
  storeKycSessionUrl,
} from "@/utils/kycSession";
import { formatKycReason } from "@/utils/kycDisplay";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Upload,
  Instagram,
  Mic,
  Users,
  Eye,
  Search,
  Image as ImageIcon,
  Video,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  Settings,
  DollarSign,
  TrendingUp,
  Briefcase,
  Edit,
  Play,
  Pause,
  Square,
  Volume2,
  Download,
  Lock,
  Unlock,
  Plus,
  X,
  LayoutDashboard,
  FileText,
  Calendar,
  BarChart3,
  Menu,
  ChevronRight,
  ChevronLeft,
  Clock,
  Shield,
  Building2,
  Target,
  PlayCircle,
  CheckSquare,
  XCircle,
  Send,
  Mail,
  MessageSquare,
  Copy,
  ArrowRight,
  RefreshCw,
  Wallet as WalletIcon,
  Gift,
  CreditCard,
  Link as LinkIcon,
  Link2Off,
  HelpCircle,
  LogOut,
  Archive,
  Globe,
  ShieldAlert,
  ExternalLink,
  AlertTriangle,
  Check,
  Youtube,
  ArrowLeft,
  Ban,
  BadgeCheck,
  Sparkles,
  ChevronDown,
  Crown,
  Star,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/auth/AuthProvider";
import {
  isDefaultPricing,
  MIN_BASE_MONTHLY_CENTS,
  shouldDefaultVisibilityOn,
} from "@/utils/pricingDefaults";
import { supabase } from "@/lib/supabase";
import { DocusealForm } from "@docuseal/react";

import { useTranslation } from "react-i18next";

const CONTENT_TYPES = [
  "Social media ads",
  "Web & banner campaigns",
  "TV / streaming commercials",
  "Film & scripted streaming",
  "Print & outdoor ads",
  "Music videos",
  "Video-game / VR characters",
  "Stock photo / video libraries",
  "Educational / nonprofit spots",
];

const INDUSTRIES = [
  "Fashion / Beauty",
  "Tech / Electronics",
  "Sports / Fitness",
  "Food / Beverage",
  "Film / Gaming / Music",
  "Automotive",
  "Finance / Fintech",
  "Health / Wellness",
  "Luxury & Lifestyle",
  "Travel / Hospitality",
  "Education",
  "Real Estate",
  "Entertainment",
  "Open to any industry",
];

const RESTRICTIONS = [
  "Political Content",
  "Controversial Topics",
  "Explicit/Adult Content",
  "Pharmaceutical Claims",
  "Financial/Investment Advice",
  "Tobacco/Vaping Products",
  "Gambling (Unlicensed)",
  "Alcohol",
  "Byproducts/Animal Testing",
  "Weapons/Firearms",
  "Cryptocurrency/NFT",
  "MLM/Multi-Level Marketing",
  "Unlicensed Financial Products",
  "Health/Medical Claims",
];

const VIBES = [
  "Streetwear",
  "Glam",
  "Natural",
  "Classic",
  "Edgy",
  "Athletic",
  "Runway",
  "Editorial",
  "Commercial",
  "Casual",
];

// Voice recording scripts for different emotions
const getVoiceScripts = (t: any) => ({
  happy: t("creatorDashboard.voiceScripts.happy"),
  emotional: t("creatorDashboard.voiceScripts.emotional"),
  excited: t("creatorDashboard.voiceScripts.excited"),
  mellow: t("creatorDashboard.voiceScripts.mellow"),
  relaxed: t("creatorDashboard.voiceScripts.relaxed"),
  angry: t("creatorDashboard.voiceScripts.angry"),
});

const getImageSections = (t: any) => [
  {
    id: "headshot_neutral",
    title: t("imageSections.headshot_neutral.title"),
    description: t("imageSections.headshot_neutral.description"),
    bestFor: t("imageSections.headshot_neutral.bestFor"),
  },
  {
    id: "headshot_smiling",
    title: t("imageSections.headshot_smiling.title"),
    description: t("imageSections.headshot_smiling.description"),
    bestFor: t("imageSections.headshot_smiling.bestFor"),
  },
  {
    id: "fullbody_casual",
    title: t("imageSections.fullbody_casual.title"),
    description: t("imageSections.fullbody_casual.description"),
    bestFor: t("imageSections.fullbody_casual.bestFor"),
  },
  {
    id: "fullbody_formal",
    title: t("imageSections.fullbody_formal.title"),
    description: t("imageSections.fullbody_formal.description"),
    bestFor: t("imageSections.fullbody_formal.bestFor"),
  },
  {
    id: "side_profile",
    title: t("imageSections.side_profile.title"),
    description: t("imageSections.side_profile.description"),
    bestFor: t("imageSections.side_profile.bestFor"),
  },
  {
    id: "three_quarter",
    title: t("imageSections.three_quarter.title"),
    description: t("imageSections.three_quarter.description"),
    bestFor: t("imageSections.three_quarter.bestFor"),
  },
  {
    id: "hair_down",
    title: t("imageSections.hair_down.title"),
    description: t("imageSections.hair_down.description"),
    bestFor: t("imageSections.hair_down.bestFor"),
  },
  {
    id: "hair_up",
    title: t("imageSections.hair_up.title"),
    description: t("imageSections.hair_up.description"),
    bestFor: t("imageSections.hair_up.bestFor"),
  },
  {
    id: "hair_styling",
    title: t("imageSections.hair_styling.title"),
    description: t("imageSections.hair_styling.description"),
    bestFor: t("imageSections.hair_styling.bestFor"),
  },
  {
    id: "upper_body",
    title: t("imageSections.upper_body.title"),
    description: t("imageSections.upper_body.description"),
    bestFor: t("imageSections.upper_body.bestFor"),
  },
  {
    id: "outdoors",
    title: t("imageSections.outdoors.title"),
    description: t("imageSections.outdoors.description"),
    bestFor: t("imageSections.outdoors.bestFor"),
  },
  {
    id: "indoors",
    title: t("imageSections.indoors.title"),
    description: t("imageSections.indoors.description"),
    bestFor: t("imageSections.indoors.bestFor"),
  },
  {
    id: "makeup_variation",
    title: t("imageSections.makeup_variation.title"),
    description: t("imageSections.makeup_variation.description"),
    bestFor: t("imageSections.makeup_variation.bestFor"),
  },
  {
    id: "seasonal",
    title: t("imageSections.seasonal.title"),
    description: t("imageSections.seasonal.description"),
    bestFor: t("imageSections.seasonal.bestFor"),
  },
  {
    id: "signature",
    title: t("imageSections.signature.title"),
    description: t("imageSections.signature.description"),
    bestFor: t("imageSections.signature.bestFor"),
  },
];

// Example campaigns for blank users (shown when no real campaigns exist)
// Example campaigns moved inside CreatorDashboard component to support translations

// Example content items for blank users
const exampleContentItems = [
  {
    id: "content-nike",
    brand: "Nike Sportswear",
    brand_logo:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRi7Zx9TmyT9DJpbcODrb4HbvoNES_u0yr7tQ&s",
    titleKey: "instagramReel",
    thumbnail_url:
      "https://images.unsplash.com/photo-1556906781-9a412961c28c?q=80&w=2000&auto=format&fit=crop",
    platform: "Instagram",
    views: "125,000",
    engagement: "4.2%",
    published_at: "2026-03-20",
    is_live: true,
    url: "#",
  },
  {
    id: "content-glossier",
    brand: "Glossier Beauty",
    brand_logo:
      "https://images.seeklogo.com/logo-png/61/1/glossier-icon-logo-png_seeklogo-618085.png",
    titleKey: "webBanner",
    thumbnail_url:
      "https://ae.buynship.com/contents/uploads/2022/01/Glossier-Blog-Banner-1024x536.png",
    platform: "Website",
    views: "89,000",
    engagement: "2.8%",
    published_at: "2026-03-18",
    is_live: true,
    url: "#",
  },
  {
    id: "content-tesla",
    brand: "Tesla Motors",
    brand_logo:
      "https://upload.wikimedia.org/wikipedia/commons/e/e8/Tesla_logo.png",
    titleKey: "tvCommercial",
    thumbnail_url:
      "https://images.unsplash.com/photo-1617788138017-80ad40651399?q=80&w=2000&auto=format&fit=crop",
    platform: "YouTube",
    views: "450,000",
    engagement: "5.1%",
    published_at: "2026-02-15",
    is_live: true,
    url: "#",
  },
];

const exampleDetections = [
  {
    id: "det-1",
    account: "@crypto_gains_2026",
    platform: "TikTok",
    thumbnail_url:
      "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop",
    status: "needs_review",
    match_confidence: 94,
    detected_at: "2026-03-24",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/a/a9/TikTok_logo.svg/1200px-TikTok_logo.svg.png",
  },
  {
    id: "det-2",
    account: "@beauty_deals_shop",
    platform: "Instagram",
    thumbnail_url:
      "https://images.unsplash.com/photo-1611262588024-d12430b98920?q=80&w=1000&auto=format&fit=crop",
    status: "takedown_requested",
    match_confidence: 87,
    detected_at: "2026-03-22",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Instagram_logo_2016.svg/2048px-Instagram_logo_2016.svg.png",
  },
  {
    id: "det-3",
    account: "Quick Weight Loss Co.",
    platform: "Facebook",
    thumbnail_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Facebook_icon_2013.svg/2048px-Facebook_icon_2013.svg.png",
    status: "resolved",
    match_confidence: 91,
    detected_at: "2026-03-19",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/2021_Facebook_icon.svg/2048px-2021_Facebook_icon.svg.png",
  },
];

// Example public profile data
const exampleProfilePreviewData = {
  first_name: "[Insert user first name]",
  location: "[Auto-Insert Location signed up with]",
  handles: "[Auto-Insert handles signed up with]",
  followers: "28.4K",
  bio: "UGC creator & influencer specializing in beauty, lifestyle, and product reviews. Passionate about authentic storytelling.",
  active_campaigns: 3,
  completed_projects: 3,
  voice_profiles: 0,
  open_to_work: ["Social-media ads", "Web & banner campaigns"],
  industries: ["Fashion / Beauty", "Tech / Electronics"],
  base_rate: 500,
  portfolio: [
    {
      id: "p1",
      brand: "Target Retail",
      campaign: "Holiday Campaign",
      duration: "3 months",
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Target_Corporation_logo_%28vector%29.svg/1024px-Target_Corporation_logo_%28vector%29.svg.png",
    },
    {
      id: "p2",
      brand: "Spotify Premium",
      campaign: "Audio Campaign",
      duration: "2 months",
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Spotify_logo_without_text.svg/2048px-Spotify_logo_without_text.svg.png",
    },
    {
      id: "p3",
      brand: "Lululemon",
      campaign: "Fitness Series",
      duration: "4 months",
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Lululemon_Athletica_logo.svg/2048px-Lululemon_Athletica_logo.svg.png",
    },
  ],
};

// Empty defaults for campaigns (until wired to real data.)
const mockActiveCampaigns: any[] = [];

const revenueData = [
  { month: "Jun", revenue: 0 },
  { month: "Jul", revenue: 0 },
  { month: "Aug", revenue: 0 },
  { month: "Sep", revenue: 0 },
  { month: "Oct", revenue: 0 },
  { month: "Nov", revenue: 0 },
];

const earningsByIndustry: any[] = [];

const mockContracts: any[] = [];

function parseErrorMessage(err: any, t: any): string {
  let msg = err?.message || String(err);

  // Check for specific error patterns and return user-friendly translation keys
  const lowerMsg = msg.toLowerCase();

  // Storage/bucket errors
  if (
    lowerMsg.includes("bucket not found") ||
    lowerMsg.includes("bucket") ||
    lowerMsg.includes("storage")
  ) {
    return t("common.errors.bucketNotFound");
  }

  // Database constraint errors
  if (
    lowerMsg.includes("constraint") ||
    lowerMsg.includes("violates") ||
    lowerMsg.includes("duplicate")
  ) {
    return t("common.errors.constraintViolation");
  }

  // Generic database errors
  if (
    lowerMsg.includes("database") ||
    lowerMsg.includes("postgres") ||
    lowerMsg.includes("sql")
  ) {
    return t("common.errors.databaseError");
  }

  // Upload/storage errors
  if (lowerMsg.includes("upload") || lowerMsg.includes("file")) {
    return t("common.errors.uploadFailed");
  }

  // Save errors
  if (
    lowerMsg.includes("save") ||
    lowerMsg.includes("update") ||
    lowerMsg.includes("insert")
  ) {
    return t("common.errors.saveFailed");
  }

  // Try to parse JSON error messages
  try {
    const jsonMatch = msg.match(/(\{.*\})/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const errorMsg = parsed.message || parsed.error || msg;
      // Recursively check the parsed message
      return parseErrorMessage({ message: errorMsg }, t);
    }
  } catch (e) {
    // Parsing failed, continue
  }

  // Default to generic error
  return t("common.errors.genericError");
}

export default function CreatorDashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { user, profile, initialized, authenticated, logout, refreshProfile } =
    useAuth();
  const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || "";
  const API_BASE_ABS = (() => {
    try {
      if (!API_BASE) return new URL("/", window.location.origin).toString();
      if (API_BASE.startsWith("http")) return API_BASE;
      return new URL(API_BASE, window.location.origin).toString();
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
  const [activeSection, setActiveSection] = useState("dashboard");
  const [settingsTab, setSettingsTab] = useState("profile"); // 'profile' | 'rules' | 'billing'
  const [creatorBilling, setCreatorBilling] = useState<any>(null);
  const [creatorBillingLoaded, setCreatorBillingLoaded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 1024);
  const [agencyInvites, setAgencyInvites] = useState<any[]>([]);
  const [agencyConnections, setAgencyConnections] = useState<
    CreatorAgencyConnection[]
  >([]);
  const [brandConnectionRequests, setBrandConnectionRequests] = useState<any[]>(
    [],
  );
  const [brandConnections, setBrandConnections] = useState<any[]>([]);
  const [brandOffers, setBrandOffers] = useState<any[]>([]);
  const [assetRequests, setAssetRequests] = useState<any[]>([]);
  const [offerDeliverablesById, setOfferDeliverablesById] = useState<
    Record<string, any[]>
  >({});
  const [loadingOfferDeliverablesById, setLoadingOfferDeliverablesById] =
    useState<Record<string, boolean>>({});
  const [expandedAssetRequests, setExpandedAssetRequests] = useState<
    Set<string>
  >(new Set());
  const [assetRequestsInitialized, setAssetRequestsInitialized] =
    useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [creatorCampaigns, setCreatorCampaigns] = useState<any[]>([]);
  const [brandConnectionSubTab, setBrandConnectionSubTab] = useState<
    "connections" | "requests" | "offers" | "job-invites" | "deliverables"
  >("connections");
  const [jobsSubTab, setJobsSubTab] = useState<"job_invites" | "job_board">(
    "job_invites",
  );
  const [agencyConnectionSubTab, setAgencyConnectionSubTab] = useState<
    "connections" | "asset_requests"
  >("connections");
  const [campaignSearch, setCampaignSearch] = useState("");
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);
  const [archiveSearch, setArchiveSearch] = useState("");
  const [selectedBrandOfferId, setSelectedBrandOfferId] = useState<string>("");
  const [selectedOfferBriefId, setSelectedOfferBriefId] = useState<string>("");
  const [selectedOfferContracts, setSelectedOfferContracts] = useState<any[]>(
    [],
  );
  const [selectedOfferDeliverables, setSelectedOfferDeliverables] = useState<
    any[]
  >([]);
  const [deliverableUrlByOffer, setDeliverableUrlByOffer] = useState<
    Record<string, string>
  >({});
  const [creatorContractHubRows, setCreatorContractHubRows] = useState<any[]>(
    [],
  );
  const [creatorSignUrl, setCreatorSignUrl] = useState("");
  const [creatorSignOpen, setCreatorSignOpen] = useState(false);
  const [offerActionLoading, setOfferActionLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const handleManageSubscription = async () => {
    try {
      setPortalLoading(true);
      const { createCreatorBillingPortal } = await import("@/api/functions");
      const res = await createCreatorBillingPortal();
      // base44Client returns the payload directly
      const url =
        (res as any)?.checkout_url || (res as any)?.data?.checkout_url;
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e.message || "Failed to open billing portal",
      });
    } finally {
      setPortalLoading(false);
    }
  };
  const [loadingBrandOffers, setLoadingBrandOffers] = useState(false);
  const [loadingJobInvites, setLoadingJobInvites] = useState(false);
  const [jobInvites, setJobInvites] = useState<any[]>([]);
  const [jobInviteConfirmOpen, setJobInviteConfirmOpen] = useState(false);
  const [jobInviteConfirmId, setJobInviteConfirmId] = useState("");
  const [jobInviteConfirmAction, setJobInviteConfirmAction] = useState<
    "accept" | "decline" | ""
  >("");
  const [agencyContractDetailOpen, setAgencyContractDetailOpen] =
    useState(false);
  const [selectedAgencyConnection, setSelectedAgencyConnection] =
    useState<CreatorAgencyConnection | null>(null);
  const [disconnectReason, setDisconnectReason] = useState("");
  const [loadingOfferDetails, setLoadingOfferDetails] = useState(false);
  const [loadingAssetRequests, setLoadingAssetRequests] = useState(false);
  const [sendDeliverableOpen, setSendDeliverableOpen] = useState(false);
  const [sendDeliverableBrandId, setSendDeliverableBrandId] = useState("");
  const [sendDeliverableOfferId, setSendDeliverableOfferId] = useState("");
  const [sendDeliverableRequestId, setSendDeliverableRequestId] = useState("");
  const [sendDeliverableRequestMeta, setSendDeliverableRequestMeta] = useState<{
    agency_name?: string;
    agency_logo_url?: string;
    offer_title?: string;
    campaign_name?: string;
  } | null>(null);
  const [sendDeliverableFiles, setSendDeliverableFiles] = useState<File[]>([]);
  const [sendDeliverablePreviewUrls, setSendDeliverablePreviewUrls] = useState<
    string[]
  >([]);
  const [seenBrandRequestIds, setSeenBrandRequestIds] = useState<Set<string>>(
    new Set(),
  );
  const [seenOfferNotificationIds, setSeenOfferNotificationIds] = useState<
    Set<string>
  >(new Set());
  const [
    seenDeliverableNotificationOfferIds,
    setSeenDeliverableNotificationOfferIds,
  ] = useState<Set<string>>(new Set());
  const [briefGalleryOpen, setBriefGalleryOpen] = useState(false);
  const [briefGalleryIndex, setBriefGalleryIndex] = useState(0);
  const [agencyConnectionLoading, setAgencyConnectionLoading] = useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [disconnectConfirmChecked, setDisconnectConfirmChecked] =
    useState(false);
  const [disconnectTarget, setDisconnectTarget] = useState<{
    agency_id: string;
    agency_name?: string;
    marketplace_contract?: CreatorAgencyConnection["marketplace_contract"];
  } | null>(null);
  const [showPhotoFull, setShowPhotoFull] = useState(false);
  const IMAGE_SECTIONS = getImageSections(t);

  const fullySignedOfferStatuses = useMemo(
    () =>
      new Set([
        "contract_fully_signed",
        "fully_signed",
        "contract_signed",
        "signed",
        "accepted",
        "active",
        "in_progress",
        "in_execution",
        "deliverables_submitted",
        "in_review",
        "changes_requested",
        "approved",
        "completed",
      ]),
    [],
  );

  const isDirectCreatorOffer = React.useCallback(
    (offer: any) => {
      const targetType = String(offer?.target_type || "creator").toLowerCase();
      if (targetType === "agency") return false;
      const targetId = String(offer?.target_id || "").trim();
      if (targetId && user?.id) return targetId === user.id;
      return true;
    },
    [user?.id],
  );

  const directBrandOffers = useMemo(
    () => brandOffers.filter(isDirectCreatorOffer),
    [brandOffers, isDirectCreatorOffer],
  );

  const deliverableEligibleOffers = useMemo(
    () =>
      directBrandOffers.filter((offer: any) =>
        fullySignedOfferStatuses.has(String(offer?.status || "").toLowerCase()),
      ),
    [directBrandOffers, fullySignedOfferStatuses],
  );

  const campaignOptions = useMemo(
    () =>
      Array.from(
        new Map(
          deliverableEligibleOffers
            .filter((offer: any) => {
              if (!sendDeliverableBrandId) return true;
              return String(offer?.brand_id || "") === sendDeliverableBrandId;
            })
            .map((offer: any) => [String(offer?.id || ""), offer]),
        ).values(),
      ),
    [deliverableEligibleOffers, sendDeliverableBrandId],
  );

  const pending = useMemo(
    () => brandConnectionRequests.filter((i) => i.status === "pending"),
    [brandConnectionRequests],
  );
  const pendingCount = pending.length;
  const creatorPlanTierForLoad = String(creatorBilling?.plan_tier || "free");
  const creatorCanUseKycForLoad =
    typeof creatorBilling?.can_use_kyc === "boolean"
      ? creatorBilling.can_use_kyc
      : creatorPlanTierForLoad !== "free";
  const directOfferIds = new Set(
    directBrandOffers.map((offer: any) => String(offer?.id || "")),
  );
  const unseenRequestCount = pending.filter(
    (req: any) => !seenBrandRequestIds.has(String(req?.id || "")),
  ).length;
  const unseenOfferCount = directBrandOffers.filter(
    (offer: any) =>
      [
        "changes_requested",
        "contract_sent",
        "contract_partially_signed",
      ].includes(String(offer?.status || "").toLowerCase()) &&
      !seenOfferNotificationIds.has(String(offer?.id || "")),
  ).length;
  const unseenDeliverableFeedbackCount = deliverableEligibleOffers.reduce(
    (count: number, offer: any) => {
      const hasFeedbackNotification =
        String(offer?.status || "").toLowerCase() === "changes_requested";
      if (
        hasFeedbackNotification &&
        !seenDeliverableNotificationOfferIds.has(String(offer?.id || ""))
      ) {
        return count + 1;
      }
      return count;
    },
    0,
  );
  const totalBrandConnectionNotifications =
    unseenRequestCount + unseenOfferCount + unseenDeliverableFeedbackCount;

  const formatStatus = (status: unknown) => {
    const normalized = String(status || "sent").toLowerCase();
    const keyMap: Record<string, string> = {
      accepted: "brandConnections.accepted",
      approved: "brandConnections.approved",
      sent: "brandConnections.sent",
      viewed: "brandConnections.viewed",
      fulfilled: "brandConnections.fulfilled",
      submitted: "brandConnections.submitted",
      brand_approved: "brandConnections.approved",
      declined: "brandConnections.declined",
      changes_requested: "brandConnections.changesRequested",
      contract_fully_signed: "brandConnections.contractFullySigned",
      contract_partially_signed: "brandConnections.contractPartiallySigned",
      contract_sent: "brandConnections.contractSent",
    };
    const key = keyMap[normalized];
    if (key) return t(key);
    return String(status || "sent")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase());
  };

  const translateJobCallType = (value: unknown) => {
    const normalized = String(value || "creator").toLowerCase();
    const keyMap: Record<string, string> = {
      creator: "jobsPage.callTypes.creator",
      agency: "jobsPage.callTypes.agency",
      athlete: "jobsPage.callTypes.athlete",
      ai_artist: "jobsPage.callTypes.aiArtist",
    };
    return keyMap[normalized]
      ? t(keyMap[normalized])
      : normalized.replace(/_/g, " ");
  };

  const translateJobMetaValue = (
    value: unknown,
    type: "location" | "jobType",
  ) => {
    const normalized = String(value || "").toLowerCase();
    if (!normalized) return "";
    const keyMap =
      type === "location"
        ? {
            remote: "jobsPage.locations.remote",
            hybrid: "jobsPage.locations.hybrid",
            on_site: "jobsPage.locations.onSite",
          }
        : {
            full_time: "jobsPage.jobTypes.fullTime",
            part_time: "jobsPage.jobTypes.partTime",
            contract: "jobsPage.jobTypes.contract",
            freelance: "jobsPage.jobTypes.freelance",
            gig: "jobsPage.jobTypes.gig",
            per_project: "jobsPage.jobTypes.perProject",
          };
    return (keyMap as Record<string, string>)[normalized]
      ? t((keyMap as Record<string, string>)[normalized])
      : normalized.replace(/_/g, " ");
  };

  const translateAgencyFeedbackText = (value: unknown) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const cleaned = raw
      .replace(/^agencyConnection\.agencyFeedback:\s*/i, "")
      .replace(/^agencyConnections\.agencyFeedback:\s*/i, "");
    const normalized = cleaned.trim().toLowerCase();
    const keyMap: Record<string, string> = {
      good: "agencyConnections.feedback.good",
      "request changes": "agencyConnections.feedback.requestingChanges",
      "requesting changes": "agencyConnections.feedback.requestingChanges",
      changes_requested: "agencyConnections.feedback.requestingChanges",
    };
    return keyMap[normalized] ? t(keyMap[normalized]) : cleaned;
  };

  const translateOfferDeliverableStatus = (value: unknown) => {
    const normalized = String(value || "").toLowerCase();
    if (normalized.includes("changes_requested")) {
      return t("brandConnections.requestReview");
    }
    if (normalized.includes("deliverables_submitted")) {
      return t("brandConnections.submitted");
    }
    if (normalized.includes("approved")) {
      return t("brandConnections.approved");
    }
    if (
      normalized.includes("contract_fully_signed") ||
      normalized.includes("signed")
    ) {
      return t("brandConnections.readyToSubmit");
    }
    return t("brandConnections.notStarted");
  };

  const offerStatusBadgeClass = (statusRaw: unknown) => {
    const status = String(statusRaw || "").toLowerCase();
    if (status === "contract_fully_signed" || status === "signed") {
      return "bg-emerald-100 text-emerald-700 border border-emerald-300";
    }
    if (status === "contract_partially_signed" || status === "contract_sent") {
      return "bg-blue-100 text-blue-700 border border-blue-300";
    }
    if (status === "changes_requested") {
      return "bg-amber-100 text-amber-700 border border-amber-300";
    }
    if (status === "declined") {
      return "bg-red-100 text-red-700 border border-red-300";
    }
    return "bg-gray-100 text-gray-700 border border-gray-300";
  };

  const normalizeDisplayName = (value: unknown) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const lowered = raw.toLowerCase();
    if (["brand", "agency", "creator", "user"].includes(lowered)) return "";
    return raw;
  };

  const fallbackNameFromEmail = (email: unknown) => {
    const raw = String(email || "").trim();
    if (!raw.includes("@")) return "";
    const local = raw
      .split("@")[0]
      .replace(/[._-]+/g, " ")
      .trim();
    return local
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };

  const resolveConnectedBrandName = (connection: any) => {
    if (!connection) return "";
    const company = normalizeDisplayName(connection?.brands?.company_name);
    if (company) return company;
    const emailName = fallbackNameFromEmail(connection?.brands?.email);
    if (emailName) return emailName;
    return String(connection?.brand_id || "Connected brand");
  };

  const resolveOfferBrandName = (offer: any) => {
    const company = normalizeDisplayName(offer?.brands?.company_name);
    if (company) return company;
    const brandId = String(offer?.brand_id || "").trim();
    if (brandId) {
      const fromConnection = brandConnections.find(
        (conn: any) => String(conn?.brand_id || "") === brandId,
      );
      const connectedName = resolveConnectedBrandName(fromConnection);
      if (connectedName) return connectedName;
    }
    const emailName = fallbackNameFromEmail(offer?.brands?.email);
    if (emailName) return emailName;
    return "Brand Manager";
  };

  const toFiniteNumber = (value: unknown) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const centsToDollars = (value: unknown) => {
    const cents = toFiniteNumber(value);
    if (!cents || cents <= 0) return null;
    return cents / 100;
  };

  const monthlyFromWeeklyCents = (value: unknown) => {
    const cents = toFiniteNumber(value);
    if (!cents || cents <= 0) return null;
    return (cents / 100) * 4.345;
  };

  const parseDate = (value: unknown) => {
    const raw = String(value || "").trim();
    if (!raw) return null;
    const dt = new Date(raw);
    return Number.isNaN(dt.getTime()) ? null : dt;
  };

  const deriveEndDate = (
    start: Date | null,
    end: Date | null,
    durationDays?: unknown,
    durationMonths?: unknown,
  ) => {
    if (end) return end;
    if (!start) return null;
    const days = toFiniteNumber(durationDays);
    if (days && days > 0) {
      const dt = new Date(start);
      dt.setDate(dt.getDate() + Math.round(days));
      return dt;
    }
    const months = toFiniteNumber(durationMonths);
    if (months && months > 0) {
      const dt = new Date(start);
      dt.setMonth(dt.getMonth() + Math.round(months));
      return dt;
    }
    return null;
  };

  const formatDurationLabel = (daysRaw?: unknown, monthsRaw?: unknown) => {
    const months = toFiniteNumber(monthsRaw);
    if (months && months > 0) {
      return `${Math.round(months)} month${months === 1 ? "" : "s"}`;
    }
    const days = toFiniteNumber(daysRaw);
    if (days && days > 0) {
      return `${Math.round(days)} day${days === 1 ? "" : "s"}`;
    }
    return "";
  };

  const contractStatusFromDates = (
    endDateRaw?: string,
    statusRaw?: unknown,
  ) => {
    const normalized = String(statusRaw || "").toLowerCase();
    if (["expired", "ended", "completed"].includes(normalized))
      return "expired";
    const end = parseDate(endDateRaw || "");
    if (!end) return "active";
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (end < startOfToday) return "expired";
    const diffDays = Math.ceil(
      (end.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24),
    );
    return diffDays <= 5 ? "expiring_soon" : "active";
  };

  const resolveMonthlyRate = (
    candidates: Array<number | null | undefined>,
    fallback: number,
  ) => {
    for (const candidate of candidates) {
      if (typeof candidate === "number" && Number.isFinite(candidate)) {
        if (candidate > 0) return candidate;
      }
    }
    return Number.isFinite(fallback) ? fallback : 0;
  };
  const [creator, setCreator] = useState<any>({
    name: profile?.full_name || user?.user_metadata?.full_name || "",
    email: profile?.email || user?.email || "",
    profile_photo: profile?.profile_photo_url || "",
    location: "",
    bio: "",
    birthday: "",
    gender: "",
    ethnicity: "",
    creator_type: "",
    race: "",
    hair_color: "",
    eye_color: "",
    height_cm: "",
    instagram_handle: "",
    tiktok_handle: "",
    portfolio_url: "",
    instagram_connected: false,
    content_types: [] as string[],
    industries: [] as string[],
    content_restrictions: [] as string[],
    brand_exclusivity: [] as string[],
    price_per_month: 0,
    royalty_percentage: 0,
    accept_negotiations: true,
    is_public_brands: resolvePublicBrandsVisibility(profile),
  });
  const baseRateRef = useRef<number | null>(null);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [licensingRequests, setLicensingRequests] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);

  const baseMonthlyRate = Number.isFinite(Number(creator.price_per_month))
    ? Number(creator.price_per_month)
    : 0;

  const normalizedOfferCampaigns = useMemo(() => {
    return brandOffers
      .filter((offer: any) =>
        fullySignedOfferStatuses.has(String(offer?.status || "").toLowerCase()),
      )
      .map((offer: any) => {
        const campaign = offer?.brand_campaigns || {};
        const brandLogo =
          campaign?.brands?.logo_url ||
          campaign?.brands?.logo ||
          campaign?.brand_logo ||
          offer?.brands?.logo_url ||
          offer?.brands?.logo ||
          offer?.brand_logo ||
          "";
        const startDate =
          parseDate(
            campaign?.start_date ||
              offer?.start_date ||
              campaign?.start_at ||
              offer?.start_at ||
              offer?.license_start_date,
          ) || new Date();
        const endDate = parseDate(
          campaign?.end_date ||
            offer?.end_date ||
            campaign?.end_at ||
            offer?.end_at ||
            offer?.license_end_date ||
            campaign?.license_end_date,
        );
        const durationDays =
          campaign?.duration_days ||
          offer?.duration_days ||
          campaign?.duration_in_days ||
          offer?.duration_in_days ||
          offer?.contract_duration_days ||
          offer?.license_duration_days;
        const durationMonths =
          campaign?.duration_months ||
          offer?.duration_months ||
          campaign?.duration_in_months ||
          offer?.duration_in_months ||
          offer?.contract_duration_months ||
          offer?.license_duration_months;
        const derivedEndDate = deriveEndDate(
          startDate,
          endDate,
          durationDays,
          durationMonths,
        );
        const rate = resolveMonthlyRate(
          [
            toFiniteNumber(campaign?.monthly_rate),
            toFiniteNumber(offer?.monthly_rate),
            centsToDollars(offer?.monthly_rate_cents),
            centsToDollars(offer?.rate_cents),
            monthlyFromWeeklyCents(offer?.creator_rate_weekly_cents),
            centsToDollars(offer?.offered_rate_monthly_cents),
            centsToDollars(offer?.rate_monthly_cents),
          ],
          baseMonthlyRate,
        );
        const briefSnapshot =
          offer?.campaign_brief_snapshot || offer?.brief_snapshot;
        const amount = resolveMonthlyRate(
          [
            toFiniteNumber(briefSnapshot?.budget_creator_payment),
            centsToDollars(briefSnapshot?.budget_creator_payment_cents),
            toFiniteNumber(offer?.offer_amount),
            centsToDollars(offer?.offer_amount_cents),
          ],
          baseMonthlyRate,
        );
        return {
          id: `offer:${offer?.id || campaign?.id || campaign?.campaign_id}`,
          brand: resolveOfferBrandName(offer),
          brand_logo: brandLogo,
          campaign: campaign?.name || offer?.campaign_title || "Campaign",
          usage_type:
            campaign?.category ||
            campaign?.usage_scope ||
            offer?.usage_scope ||
            campaign?.campaign_type ||
            "Social Ads",
          rate,
          amount,
          start_date: startDate.toISOString(),
          end_date: derivedEndDate ? derivedEndDate.toISOString() : "",
          active_until: derivedEndDate ? derivedEndDate.toISOString() : "",
          raw_campaign_name: campaign?.name || offer?.campaign_title,
          source_type: "offer",
          source_id: String(offer?.id || ""),
          duration_days: durationDays,
          duration_months: durationMonths,
          regions: Array.isArray(campaign?.territory)
            ? campaign.territory
            : String(campaign?.territory || "")
                .split(",")
                .map((r) => r.trim())
                .filter(Boolean),
          impressions_week: toFiniteNumber(campaign?.impressions_week) ?? 0,
        };
      })
      .filter((c) => c.id);
  }, [
    brandOffers,
    fullySignedOfferStatuses,
    baseMonthlyRate,
    brandConnections,
  ]);

  const normalizedLicenseCampaigns = useMemo(() => {
    return (Array.isArray(licenses) ? licenses : [])
      .map((license: any) => {
        const startDate =
          parseDate(
            license?.start_at ||
              license?.start_date ||
              license?.license_start_date,
          ) || new Date();
        const endDate = parseDate(
          license?.end_at || license?.end_date || license?.license_end_date,
        );
        const durationDays =
          license?.duration_days ||
          license?.duration_in_days ||
          license?.license_duration_days;
        const durationMonths =
          license?.duration_months ||
          license?.duration_in_months ||
          license?.license_duration_months;
        const derivedEndDate = deriveEndDate(
          startDate,
          endDate,
          durationDays,
          durationMonths,
        );
        const rate = resolveMonthlyRate(
          [
            toFiniteNumber(license?.monthly_rate),
            toFiniteNumber(license?.rate),
            centsToDollars(license?.monthly_rate_cents),
            centsToDollars(license?.rate_cents),
            monthlyFromWeeklyCents(license?.weekly_rate_cents),
            monthlyFromWeeklyCents(license?.rate_weekly_cents),
          ],
          baseMonthlyRate,
        );
        const amount = resolveMonthlyRate(
          [
            toFiniteNumber(license?.license_fee),
            centsToDollars(license?.license_fee_cents),
            toFiniteNumber(license?.offer_amount),
            centsToDollars(license?.offer_amount_cents),
          ],
          baseMonthlyRate,
        );
        const brandName =
          normalizeDisplayName(license?.brand_name) ||
          normalizeDisplayName(license?.brand?.company_name) ||
          normalizeDisplayName(license?.brand?.name) ||
          "Brand";
        return {
          id: `license:${license?.id || license?.license_id}`,
          brand: brandName,
          brand_logo:
            license?.brand_logo_url ||
            license?.brand_logo ||
            license?.brand?.logo_url ||
            "",
          campaign:
            license?.campaign_title ||
            license?.project_name ||
            license?.license_title ||
            "Licensing campaign",
          usage_type:
            license?.usage_scope ||
            license?.usage_type ||
            license?.type ||
            "License",
          rate,
          amount,
          start_date: startDate.toISOString(),
          end_date: derivedEndDate ? derivedEndDate.toISOString() : "",
          active_until: derivedEndDate ? derivedEndDate.toISOString() : "",
          raw_campaign_name:
            license?.campaign_title ||
            license?.project_name ||
            license?.license_title,
          source_type: "license",
          source_id: String(license?.id || license?.license_id || ""),
          duration_days: durationDays,
          duration_months: durationMonths,
          regions: Array.isArray(license?.territory)
            ? license.territory
            : String(license?.territory || "")
                .split(",")
                .map((r) => r.trim())
                .filter(Boolean),
          impressions_week: toFiniteNumber(license?.impressions_week) ?? 0,
          license_status: String(license?.status || ""),
          total_earned: centsToDollars(license?.total_earned_cents) || 0,
          show_on_portfolio: Boolean(license?.show_on_portfolio),
        };
      })
      .filter((c) => c.id);
  }, [licenses, baseMonthlyRate]);

  const normalizedContracts = useMemo(() => {
    const offerById = new Map<string, any>(
      brandOffers.map((offer: any) => [String(offer?.id || ""), offer]),
    );
    const seen = new Set<string>();
    const rows: any[] = [];

    const addRow = (row: any) => {
      const id = String(row?.id || "").trim();
      if (!id || seen.has(id)) return;
      seen.add(id);
      rows.push(row);
    };

    const normalizeFromOfferContract = (contract: any) => {
      const offerId = String(
        contract?.offer_id || contract?.campaign_offer_id || "",
      );
      const offer = offerById.get(offerId);
      const campaign = offer?.brand_campaigns || {};
      const startDate =
        parseDate(
          contract?.effective_date ||
            contract?.start_date ||
            contract?.start_at ||
            campaign?.start_date ||
            offer?.start_date,
        ) || new Date();
      const endDate = parseDate(
        contract?.expiration_date ||
          contract?.end_date ||
          contract?.end_at ||
          campaign?.end_date ||
          offer?.end_date,
      );
      const durationDays =
        contract?.duration_days ||
        campaign?.duration_days ||
        offer?.duration_days;
      const durationMonths =
        contract?.duration_months ||
        campaign?.duration_months ||
        offer?.duration_months;
      const derivedEndDate = deriveEndDate(
        startDate,
        endDate,
        durationDays,
        durationMonths,
      );
      const monthly = resolveMonthlyRate(
        [
          toFiniteNumber(contract?.creator_earnings),
          toFiniteNumber(contract?.monthly_rate),
          centsToDollars(contract?.creator_earnings_cents),
          centsToDollars(contract?.monthly_rate_cents),
          monthlyFromWeeklyCents(contract?.rate_weekly_cents),
        ],
        baseMonthlyRate,
      );
      const brandName = resolveOfferBrandName(offer || {});
      return {
        id: String(contract?.id || contract?.contract_id || `offer-${offerId}`),
        brand: brandName || "Brand",
        brand_logo:
          campaign?.brands?.logo_url ||
          campaign?.brands?.logo ||
          offer?.brands?.logo_url ||
          offer?.brands?.logo ||
          contract?.brand_logo ||
          contract?.brand_logo_url ||
          "",
        project_name:
          contract?.campaign_name ||
          contract?.project_name ||
          campaign?.name ||
          offer?.offer_title ||
          "Campaign",
        creator_earnings: Math.round(monthly),
        earnings_to_date:
          toFiniteNumber(contract?.earnings_to_date) ||
          toFiniteNumber(contract?.amount_paid) ||
          0,
        amount_paid: toFiniteNumber(contract?.amount_paid) || 0,
        payment_status: String(contract?.payment_status || "Paid"),
        effective_date: startDate.toISOString(),
        expiration_date: derivedEndDate ? derivedEndDate.toISOString() : "",
        status: contractStatusFromDates(
          derivedEndDate ? derivedEndDate.toISOString() : "",
          contract?.status || contract?.docuseal_status,
        ),
        days_remaining: derivedEndDate
          ? Math.max(
              0,
              Math.ceil(
                (derivedEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
              ),
            )
          : 0,
        deliverables:
          contract?.deliverables ||
          contract?.usage_description ||
          campaign?.usage_scope ||
          "Deliverables",
        territory:
          contract?.territory ||
          campaign?.territory ||
          contract?.regions ||
          "Global",
        channels:
          Array.isArray(contract?.channels) && contract.channels.length > 0
            ? contract.channels
            : [String(campaign?.category || "Social Media")],
        prohibited_uses: contract?.prohibited_uses || "N/A",
        revisions: toFiniteNumber(contract?.revisions) || 0,
        auto_renew: Boolean(contract?.auto_renew || contract?.auto_renewal),
        can_pause: true,
        can_revoke: true,
      };
    };

    const normalizeFromLicense = (license: any) => {
      const startDate =
        parseDate(
          license?.start_at ||
            license?.start_date ||
            license?.license_start_date,
        ) || new Date();
      const endDate = parseDate(
        license?.end_at || license?.end_date || license?.license_end_date,
      );
      const durationDays =
        license?.duration_days ||
        license?.duration_in_days ||
        license?.license_duration_days;
      const durationMonths =
        license?.duration_months ||
        license?.duration_in_months ||
        license?.license_duration_months;
      const derivedEndDate = deriveEndDate(
        startDate,
        endDate,
        durationDays,
        durationMonths,
      );
      const monthly = resolveMonthlyRate(
        [
          toFiniteNumber(license?.monthly_rate),
          toFiniteNumber(license?.rate),
          centsToDollars(license?.monthly_rate_cents),
          centsToDollars(license?.rate_cents),
          monthlyFromWeeklyCents(license?.weekly_rate_cents),
          monthlyFromWeeklyCents(license?.rate_weekly_cents),
        ],
        baseMonthlyRate,
      );
      return {
        id: String(
          license?.id || license?.license_id || `license-${license?.brand_id}`,
        ),
        brand:
          normalizeDisplayName(license?.brand_name) ||
          normalizeDisplayName(license?.brand?.company_name) ||
          normalizeDisplayName(license?.brand?.name) ||
          "Brand",
        brand_logo:
          license?.brand_logo_url ||
          license?.brand_logo ||
          license?.brand?.logo_url ||
          "",
        project_name:
          license?.campaign_title ||
          license?.project_name ||
          license?.license_title ||
          "License",
        creator_earnings: Math.round(monthly),
        earnings_to_date: centsToDollars(license?.total_earned_cents) || 0,
        amount_paid: centsToDollars(license?.total_earned_cents) || 0,
        payment_status: "Paid",
        effective_date: startDate.toISOString(),
        expiration_date: derivedEndDate ? derivedEndDate.toISOString() : "",
        status: contractStatusFromDates(
          derivedEndDate ? derivedEndDate.toISOString() : "",
          license?.status,
        ),
        days_remaining: derivedEndDate
          ? Math.max(
              0,
              Math.ceil(
                (derivedEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
              ),
            )
          : 0,
        deliverables: license?.usage_scope || "License usage",
        territory: license?.territory || "Global",
        channels: [String(license?.usage_type || "License")],
        prohibited_uses: "N/A",
        revisions: 0,
        auto_renew: Boolean(license?.auto_renew || license?.auto_renewal),
        can_pause: true,
        can_revoke: true,
      };
    };

    const normalizeFromLicensingRequest = (req: any) => {
      const statusRaw = String(req?.status || "").toLowerCase();
      if (!["signed", "accepted", "approved", "active"].includes(statusRaw)) {
        return null;
      }
      const startDate =
        parseDate(req?.license_start_date || req?.start_date) || new Date();
      const endDate = parseDate(req?.license_end_date || req?.end_date);
      const durationDays = req?.duration_days || req?.duration_in_days;
      const durationMonths = req?.duration_months || req?.duration_in_months;
      const derivedEndDate = deriveEndDate(
        startDate,
        endDate,
        durationDays,
        durationMonths,
      );
      const monthly = resolveMonthlyRate(
        [
          toFiniteNumber(req?.monthly_rate),
          toFiniteNumber(req?.offer_amount),
          centsToDollars(req?.offer_amount_cents),
          centsToDollars(req?.monthly_rate_cents),
        ],
        baseMonthlyRate,
      );
      return {
        id: String(
          req?.id || req?.licensing_request_id || `request-${req?.brand_id}`,
        ),
        brand:
          normalizeDisplayName(req?.brand_name) ||
          normalizeDisplayName(req?.brands?.company_name) ||
          "Brand",
        brand_logo:
          req?.brand_logo_url || req?.brand_logo || req?.brands?.logo_url || "",
        project_name: req?.campaign_title || "Licensing request",
        creator_earnings: Math.round(monthly),
        earnings_to_date: 0,
        amount_paid: 0,
        payment_status: "Pending",
        effective_date: startDate.toISOString(),
        expiration_date: derivedEndDate ? derivedEndDate.toISOString() : "",
        status: contractStatusFromDates(
          derivedEndDate ? derivedEndDate.toISOString() : "",
          statusRaw,
        ),
        days_remaining: derivedEndDate
          ? Math.max(
              0,
              Math.ceil(
                (derivedEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
              ),
            )
          : 0,
        deliverables: req?.usage_scope || "License usage",
        territory: req?.regions || req?.region || "Global",
        channels: [String(req?.usage_scope || "License")],
        prohibited_uses: "N/A",
        revisions: 0,
        auto_renew: false,
        can_pause: false,
        can_revoke: false,
      };
    };

    (Array.isArray(creatorContractHubRows)
      ? creatorContractHubRows
      : []
    ).forEach((contract: any) => addRow(normalizeFromOfferContract(contract)));
    (Array.isArray(contracts) ? contracts : []).forEach((contract: any) =>
      addRow(normalizeFromOfferContract(contract)),
    );
    (Array.isArray(licenses) ? licenses : []).forEach((license: any) =>
      addRow(normalizeFromLicense(license)),
    );
    (Array.isArray(licensingRequests) ? licensingRequests : []).forEach(
      (req: any) => {
        const row = normalizeFromLicensingRequest(req);
        if (row) addRow(row);
      },
    );

    return rows;
  }, [
    brandOffers,
    creatorContractHubRows,
    contracts,
    licenses,
    licensingRequests,
    baseMonthlyRate,
  ]);

  const activeCampaignsDerived = useMemo(() => {
    const today = new Date();
    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);
    const isActive = (startRaw: string, endRaw: string, status?: string) => {
      const start = parseDate(startRaw) || startOfToday;
      const end = parseDate(endRaw);
      if (status && String(status).toLowerCase() === "active") return true;
      if (start > startOfToday) return false;
      if (!end) return true;
      return end >= startOfToday;
    };
    const withStatus = (item: any) => {
      const end = parseDate(item.end_date || item.active_until);
      if (!end) return { ...item, status: "active" };
      const diffDays = Math.ceil(
        (end.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24),
      );
      return {
        ...item,
        status: diffDays <= 5 ? "expiring_soon" : "active",
      };
    };
    const activeOffers = normalizedOfferCampaigns.filter((offer: any) =>
      isActive(offer.start_date, offer.end_date, offer.status),
    );
    const activeLicenses = normalizedLicenseCampaigns.filter((license: any) =>
      isActive(license.start_date, license.end_date, license.license_status),
    );
    const activeRequests = (
      Array.isArray(licensingRequests) ? licensingRequests : []
    )
      .filter((req: any) =>
        ["signed", "accepted", "approved", "active"].includes(
          String(req?.status || "").toLowerCase(),
        ),
      )
      .map((req: any) => {
        const startDate =
          parseDate(req?.license_start_date || req?.start_date) || new Date();
        const endDate = parseDate(req?.license_end_date || req?.end_date);
        const durationDays = req?.duration_days || req?.duration_in_days;
        const durationMonths = req?.duration_months || req?.duration_in_months;
        const derivedEndDate = deriveEndDate(
          startDate,
          endDate,
          durationDays,
          durationMonths,
        );
        const rate = resolveMonthlyRate(
          [
            toFiniteNumber(req?.monthly_rate),
            toFiniteNumber(req?.offer_amount),
            centsToDollars(req?.offer_amount_cents),
            centsToDollars(req?.monthly_rate_cents),
          ],
          baseMonthlyRate,
        );
        return {
          id: `request:${req?.id || req?.licensing_request_id || req?.brand_id}`,
          brand:
            normalizeDisplayName(req?.brand_name) ||
            normalizeDisplayName(req?.brands?.company_name) ||
            "Brand",
          brand_logo:
            req?.brand_logo_url ||
            req?.brand_logo ||
            req?.brands?.logo_url ||
            "",
          campaign: req?.campaign_title || "Licensing request",
          usage_type: req?.usage_scope || "License",
          rate,
          start_date: startDate.toISOString(),
          end_date: derivedEndDate ? derivedEndDate.toISOString() : "",
          active_until: derivedEndDate ? derivedEndDate.toISOString() : "",
          duration_days: durationDays,
          duration_months: durationMonths,
          source_type: "request",
          source_id: String(req?.id || req?.licensing_request_id || ""),
        };
      });
    return [...activeOffers, ...activeLicenses, ...activeRequests].map(
      withStatus,
    );
  }, [
    normalizedOfferCampaigns,
    normalizedLicenseCampaigns,
    licensingRequests,
    baseMonthlyRate,
  ]);

  const archivedCampaigns = useMemo(() => {
    const today = new Date();
    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);
    const isArchived = (endRaw: string, status?: string) => {
      const normalized = String(status || "").toLowerCase();
      if (["expired", "ended", "completed"].includes(normalized)) return true;
      const end = parseDate(endRaw);
      if (!end) return false;
      return end < startOfToday;
    };
    const formatDuration = (startRaw: string, endRaw: string) => {
      const start = parseDate(startRaw);
      const end = parseDate(endRaw);
      if (!start || !end) return "N/A";
      const days = Math.max(
        1,
        Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
      );
      const months = Math.max(1, Math.round(days / 30));
      return t("creatorDashboard.approvals.labels.months", { count: months });
    };
    const fromOffers = normalizedOfferCampaigns
      .filter((offer: any) => isArchived(offer.end_date, offer.status))
      .map((offer: any) => ({
        ...offer,
        campaign_type: offer.usage_type,
        completed_date: offer.end_date
          ? new Date(offer.end_date).toLocaleDateString()
          : "N/A",
        duration: formatDuration(offer.start_date, offer.end_date),
        monthly_rate: offer.rate,
        total_earned: 0,
        show_on_portfolio: false,
      }));
    const fromLicenses = normalizedLicenseCampaigns
      .filter((license: any) =>
        isArchived(license.end_date, license.license_status),
      )
      .map((license: any) => ({
        ...license,
        campaign_type: license.usage_type,
        completed_date: license.end_date
          ? new Date(license.end_date).toLocaleDateString()
          : "N/A",
        duration: formatDuration(license.start_date, license.end_date),
        monthly_rate: license.rate,
        total_earned: license.total_earned || 0,
        show_on_portfolio: Boolean(license.show_on_portfolio),
      }));
    return [...fromOffers, ...fromLicenses];
  }, [normalizedOfferCampaigns, normalizedLicenseCampaigns, t]);

  useEffect(() => {
    setActiveCampaigns(activeCampaignsDerived);
  }, [activeCampaignsDerived]);

  const resolveJobBrandName = (job: any) => {
    const company = normalizeDisplayName(job?.brands?.company_name);
    if (company) return company;
    const brandId = String(job?.brand_id || "").trim();
    if (brandId) {
      const fromConnection = brandConnections.find(
        (conn: any) => String(conn?.brand_id || "") === brandId,
      );
      const connectedName = resolveConnectedBrandName(fromConnection);
      if (connectedName) return connectedName;
    }
    const emailName = fallbackNameFromEmail(job?.brands?.email);
    if (emailName) return emailName;
    return "Brand Manager";
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
    if (status === "signed") {
      return "inline-flex min-w-28 items-center rounded-md border border-emerald-300 bg-emerald-100 px-2.5 py-1 text-emerald-700 font-semibold";
    }
    if (status === "sent") {
      return "inline-flex min-w-28 items-center rounded-md border border-blue-300 bg-blue-100 px-2.5 py-1 text-blue-700 font-semibold";
    }
    if (status === "opened") {
      return "inline-flex min-w-28 items-center rounded-md border border-amber-300 bg-amber-100 px-2.5 py-1 text-amber-700 font-semibold";
    }
    if (status === "declined" || status === "rejected") {
      return "inline-flex min-w-28 items-center rounded-md border border-red-300 bg-red-100 px-2.5 py-1 text-red-700 font-semibold";
    }
    return "inline-flex min-w-28 items-center rounded-md border border-gray-300 bg-white px-2.5 py-1 text-gray-700 font-semibold";
  };

  const deliverableStatusBadgeClass = (statusRaw: unknown) => {
    const status = String(statusRaw || "").toLowerCase();
    if (["approved", "accepted"].includes(status)) {
      return "bg-emerald-100 text-emerald-700 border border-emerald-300";
    }
    if (
      ["changes_requested", "needs_changes", "request_review"].includes(status)
    ) {
      return "bg-amber-100 text-amber-700 border border-amber-300";
    }
    if (
      [
        "submitted",
        "deliverables_submitted",
        "in_review",
        "pending_review",
        "brand_approved",
      ].includes(status)
    ) {
      return "bg-blue-100 text-blue-700 border border-blue-300";
    }
    if (["declined", "rejected"].includes(status)) {
      return "bg-red-100 text-red-700 border border-red-300";
    }
    return "bg-gray-100 text-gray-700 border border-gray-300";
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

  const inferAssetType = (contentType: string) => {
    const normalized = String(contentType || "").toLowerCase();
    if (normalized.startsWith("image/")) return "image";
    if (normalized.startsWith("video/")) return "video";
    if (normalized.startsWith("audio/")) return "audio";
    return "file";
  };

  const selectedBriefOffer = brandOffers.find(
    (offer: any) => String(offer?.id || "") === selectedOfferBriefId,
  );
  const selectedBriefCampaign = selectedBriefOffer?.brand_campaigns || {};
  const selectedBrief = selectedBriefOffer?.brief_snapshot || {};

  const briefValue = (key: string, fallback = "Not specified") => {
    const value = selectedBrief?.[key];
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

  const briefReferenceImages = Array.isArray(selectedBrief?.reference_images)
    ? selectedBrief.reference_images
    : [];
  const brandAssets = Array.isArray(selectedBrief?.brand_assets)
    ? selectedBrief.brand_assets
    : [];

  const requiredDeliverablesText = (() => {
    const direct = String(selectedBrief?.required_deliverables || "").trim();
    if (direct) return direct;
    const legacy = [
      selectedBrief?.deliverables_reels,
      selectedBrief?.deliverables_hero_image,
    ]
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
    return legacy.length > 0 ? legacy.join("\n") : "Not specified";
  })();

  const selectedBriefContract = selectedOfferContracts[0] || null;
  const creatorAlreadySigned = selectedOfferContracts.some((contract: any) => {
    const creatorStatus = String(
      contract?.meta?.creator_submitter_status || "",
    ).toLowerCase();
    const submitterStatuses = Array.isArray(contract?.meta?.submitter_statuses)
      ? contract.meta.submitter_statuses
      : [];
    const secondPartyStatus = String(
      submitterStatuses.find(
        (s: any) =>
          String(s?.role || "")
            .toLowerCase()
            .replace(/\s+/g, "") === "secondparty",
      )?.status || "",
    ).toLowerCase();
    const contractStatus = String(
      contract?.docuseal_status || "",
    ).toLowerCase();
    return (
      creatorStatus === "completed" ||
      creatorStatus === "signed" ||
      secondPartyStatus === "completed" ||
      secondPartyStatus === "signed" ||
      contractStatus === "signed"
    );
  });

  const resolveStoredUrl = (value: unknown): string => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (
      raw.startsWith("http://") ||
      raw.startsWith("https://") ||
      raw.startsWith("blob:")
    ) {
      return raw;
    }
    const cleaned = raw.replace(/^\/+/, "");
    const fromBucket = supabase?.storage
      .from("likelee-public")
      .getPublicUrl(cleaned)?.data?.publicUrl;
    return String(fromBucket || "");
  };

  const briefItemUrl = (item: any): string =>
    resolveStoredUrl(
      item?.url ||
        item?.public_url ||
        item?.file_url ||
        item?.asset_url ||
        item?.path ||
        item,
    );

  const downloadBriefFile = async (url: string, fileName: string) => {
    const safeUrl = String(url || "").trim();
    if (!safeUrl) return;
    try {
      const res = await fetch(safeUrl);
      if (!res.ok) throw new Error("Failed to fetch file.");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = fileName || "file";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(safeUrl, "_blank", "noopener,noreferrer");
    }
  };

  const refreshBrandConnections = async () => {
    const [{ requests, connections }, offers, jobInvitesRes] =
      await Promise.all([
        loadBrandConnectionData(),
        loadBrandOffers().catch(() => []),
        loadJobInvites().catch(() => []),
      ]);
    setBrandConnectionRequests(requests);
    setBrandConnections(connections);
    setBrandOffers(Array.isArray(offers) ? offers : []);
    setJobInvites(Array.isArray(jobInvitesRes) ? jobInvitesRes : []);
  };

  const onRespond = async (id: string, action: "accept" | "decline") => {
    try {
      setAgencyConnectionLoading(true);
      await base44.post(
        `/api/creator/brand-connection-requests/${id}/${action}`,
        {},
      );
      await refreshBrandConnections();
      toast({
        title:
          action === "accept" ? "Connection accepted" : "Connection declined",
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Failed to update request",
        description: e?.message || String(e),
      });
    } finally {
      setAgencyConnectionLoading(false);
    }
  };

  const onDisconnect = async (brandId: string) => {
    try {
      setAgencyConnectionLoading(true);
      await base44.post(
        `/api/creator/brand-connections/${brandId}/disconnect`,
        {},
      );
      await refreshBrandConnections();
      toast({ title: "Disconnected from brand" });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Failed to disconnect",
        description: e?.message || String(e),
      });
    } finally {
      setAgencyConnectionLoading(false);
    }
  };

  const openOfferBrief = async (offerId: string) => {
    const next = selectedBrandOfferId === offerId ? "" : offerId;
    setSelectedBrandOfferId(next);
    if (next) {
      setSeenOfferNotificationIds((prev) => {
        const nextSet = new Set(prev);
        nextSet.add(next);
        return nextSet;
      });
    }
    if (!next) {
      setSelectedOfferContracts([]);
      setSelectedOfferDeliverables([]);
      return;
    }
    try {
      await loadOfferDetails(next);
    } catch {
      setSelectedOfferContracts([]);
      setSelectedOfferDeliverables([]);
    }
  };

  const openOfferBriefPage = async (offerId: string) => {
    setSelectedOfferBriefId(offerId);
    setSelectedBrandOfferId(offerId);
    setSeenOfferNotificationIds((prev) => {
      const nextSet = new Set(prev);
      nextSet.add(offerId);
      return nextSet;
    });
    try {
      await loadOfferDetails(offerId);
    } catch {
      setSelectedOfferContracts([]);
    }
  };

  const closeOfferBriefPage = () => {
    setSelectedOfferBriefId("");
  };

  const signContract = () => {
    const contract = selectedOfferContracts[0];
    const creatorSigningUrl = String(
      contract?.meta?.creator_signing_url ||
        contract?.meta?.docuseal_signing_url ||
        "",
    ).trim();
    const fileUrl = String(contract?.file_url || "").trim();
    const rawSlug = String(contract?.docuseal_slug || "").trim();
    const slugUrl = rawSlug
      ? rawSlug.startsWith("http")
        ? rawSlug
        : `https://docuseal.co/s/${rawSlug}`
      : "";
    const signUrl = creatorSigningUrl || slugUrl || fileUrl;
    if (!signUrl) {
      toast({
        title: "Contract unavailable",
        description:
          "Signing link is not ready yet. DocuSeal flow will be connected next.",
        variant: "destructive",
      });
      return;
    }
    setCreatorSignUrl(signUrl);
    setCreatorSignOpen(true);
  };

  const sendDeliverable = async () => {
    if (sendDeliverableFiles.length === 0) {
      toast({
        title: "Upload required",
        description: "Please choose at least one deliverable file.",
        variant: "destructive",
      });
      return;
    }
    if (!sendDeliverableOfferId) {
      toast({
        title: "Campaign required",
        description: "Please select the campaign offer.",
        variant: "destructive",
      });
      return;
    }
    const selectedOffer = brandOffers.find(
      (offer: any) => String(offer?.id || "") === sendDeliverableOfferId,
    );
    const selectedOfferBrandId = String(selectedOffer?.brand_id || "");
    const isPaid =
      String(selectedOffer?.payment_status || "").toLowerCase() === "paid";

    if (selectedOffer && !isPaid && !sendDeliverableRequestId) {
      toast({
        title: "Payment required",
        description:
          "The brand must complete the payment for this offer before deliverables can be uploaded.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedOffer) {
      toast({
        title: "Campaign unavailable",
        description: "The selected campaign offer could not be found.",
        variant: "destructive",
      });
      return;
    }
    if (
      sendDeliverableBrandId &&
      selectedOfferBrandId &&
      selectedOfferBrandId !== sendDeliverableBrandId
    ) {
      toast({
        title: "Brand and campaign mismatch",
        description:
          "Please select a campaign that belongs to the selected connected brand.",
        variant: "destructive",
      });
      return;
    }
    try {
      setOfferActionLoading(true);
      const session = supabase
        ? await supabase.auth.getSession()
        : { data: { session: null } };
      const token = session.data.session?.access_token;
      for (const file of sendDeliverableFiles) {
        const uploadRes = await fetch(
          api(
            `/api/campaign-offers/${encodeURIComponent(sendDeliverableOfferId)}/deliverables/upload`,
          ),
          {
            method: "POST",
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              "Content-Type": file.type || "application/octet-stream",
            },
            body: await file.arrayBuffer(),
          },
        );
        const uploadText = await uploadRes.text();
        if (!uploadRes.ok) {
          throw new Error(uploadText || "Failed to upload deliverable file");
        }
        const uploadJson = uploadText ? JSON.parse(uploadText) : {};
        const assetUrl = String(uploadJson?.public_url || "").trim();
        if (!assetUrl) {
          throw new Error("Deliverable upload URL missing");
        }

        await base44.post(
          `/api/campaign-offers/${encodeURIComponent(sendDeliverableOfferId)}/deliverables`,
          {
            asset_url: assetUrl,
            asset_type: inferAssetType(file.type),
            caption: file.name,
            brand_id: selectedOfferBrandId || sendDeliverableBrandId || "",
            brand_campaign_id: String(selectedOffer?.brand_campaign_id || ""),
            asset_request_id: sendDeliverableRequestId || undefined,
            meta: {
              original_name: file.name,
              content_type: file.type,
            },
          },
        );
      }
      await refreshBrandConnections();
      if (selectedBrandOfferId === sendDeliverableOfferId) {
        await loadOfferDetails(sendDeliverableOfferId);
      }
      setSendDeliverableOpen(false);
      setSendDeliverableBrandId("");
      setSendDeliverableOfferId("");
      setSendDeliverableRequestId("");
      setSendDeliverableFiles([]);
      sendDeliverablePreviewUrls.forEach((url) => {
        if (String(url).startsWith("blob:")) URL.revokeObjectURL(url);
      });
      setSendDeliverablePreviewUrls([]);
      toast({
        title: "Deliverable sent",
        description: `${sendDeliverableFiles.length} deliverable${sendDeliverableFiles.length > 1 ? "s were" : " was"} uploaded and sent to the brand.`,
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Send failed",
        description: e?.message || String(e),
      });
    } finally {
      setOfferActionLoading(false);
    }
  };

  const talentPortalEnabled =
    (profile as any)?.role === "talent" || agencyConnections.length > 0;

  const loadAgencyConnectionData = async () => {
    const [connections, creatorInvitesRes, talentInvitesRes] =
      await Promise.all([
        listCreatorAgencyConnections(),
        listCreatorAgencyInvites(),
        listTalentAgencyInvites().then((r: any) => (r?.invites as any[]) || []),
      ]);

    const mergedInvites = [...creatorInvitesRes, ...talentInvitesRes];
    const inviteMap = new Map<string, any>();
    for (const inv of mergedInvites) {
      const id = String(inv?.id || "");
      if (!id) continue;
      if (!inviteMap.has(id)) {
        inviteMap.set(id, inv);
      }
    }

    return {
      connections,
      invites: Array.from(inviteMap.values()),
    };
  };

  const loadBrandConnectionData = async () => {
    const [requestsResp, connectionsResp] = await Promise.all([
      base44.get<{ requests?: any[] }>(
        "/api/creator/brand-connection-requests",
      ),
      base44.get<{ connections?: any[] }>("/api/creator/brand-connections"),
    ]);
    return {
      requests: Array.isArray(requestsResp?.requests)
        ? requestsResp.requests
        : [],
      connections: Array.isArray(connectionsResp?.connections)
        ? connectionsResp.connections
        : [],
    };
  };

  const loadBrandOffers = async (silent = false) => {
    if (!silent) setLoadingBrandOffers(true);
    try {
      const offersResp = await base44.get<{ offers?: any[] }>(
        "/api/campaign-offers/my",
        {
          params: { limit: 300 },
        },
      );
      return Array.isArray(offersResp?.offers) ? offersResp.offers : [];
    } finally {
      if (!silent) setLoadingBrandOffers(false);
    }
  };

  const loadJobInvites = async (silent = false) => {
    if (!silent) setLoadingJobInvites(true);
    try {
      const res = await base44.get<{ jobs?: any[] }>("/api/jobs", {
        params: { status: "open", limit: 200 },
      });
      const jobs = Array.isArray(res?.jobs) ? res.jobs : [];
      const invites = jobs.filter((job) => {
        const invitedCreators = Array.isArray(job?.invited_creator_ids)
          ? job.invited_creator_ids
          : [];
        const acceptedCreators = Array.isArray(job?.accepted_creator_ids)
          ? job.accepted_creator_ids
          : [];
        // Show if explicitly invited OR already accepted
        return (
          invitedCreators.includes(user?.id) ||
          acceptedCreators.includes(user?.id)
        );
      });
      return invites;
    } finally {
      if (!silent) setLoadingJobInvites(false);
    }
  };

  const declineJobInvite = async (jobId: string) => {
    try {
      setOfferActionLoading(true);
      await base44.post(`/api/jobs/${encodeURIComponent(jobId)}/decline`, {});
      toast({
        title: "Invite declined",
        description: "The brand will see your response in job details.",
      });
      const jobInvitesRes = await loadJobInvites().catch(() => []);
      setJobInvites(Array.isArray(jobInvitesRes) ? jobInvitesRes : []);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Decline failed",
        description: e?.message || String(e),
      });
    } finally {
      setOfferActionLoading(false);
      setJobInviteConfirmOpen(false);
    }
  };

  const acceptJobInvite = async (jobId: string) => {
    try {
      setOfferActionLoading(true);
      await base44.post(`/api/jobs/${encodeURIComponent(jobId)}/accept`, {});
      toast({
        title: "Invite accepted",
        description: "The job is now accepted.",
      });
      const jobInvitesRes = await loadJobInvites().catch(() => []);
      setJobInvites(Array.isArray(jobInvitesRes) ? jobInvitesRes : []);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Accept failed",
        description: e?.message || String(e),
      });
    } finally {
      setOfferActionLoading(false);
      setJobInviteConfirmOpen(false);
    }
  };

  const confirmJobInviteAction = () => {
    if (!jobInviteConfirmId || !jobInviteConfirmAction) return;
    if (jobInviteConfirmAction === "accept") {
      acceptJobInvite(jobInviteConfirmId);
    } else {
      declineJobInvite(jobInviteConfirmId);
    }
  };

  const loadAssetRequests = async () => {
    setLoadingAssetRequests(true);
    try {
      const resp = await listTalentAssetRequests();
      return Array.isArray((resp as any)?.requests)
        ? (resp as any).requests
        : [];
    } finally {
      setLoadingAssetRequests(false);
    }
  };

  const isTalentProfileMissingError = (error: unknown) => {
    const message =
      error instanceof Error ? error.message : String(error || "");
    return message.toLowerCase().includes("talent profile not found");
  };

  const loadBookings = async () => {
    try {
      const resp = await listTalentBookings();
      const items = Array.isArray(resp) ? resp : [];
      // Derive unique campaigns from bookings
      const campaignMap = new Map<string, any>();
      items.forEach((b: any) => {
        const campaignId = b.campaign_id;
        const campaignName = b.bookings_campaigns?.name;
        if (campaignId && campaignName && !campaignMap.has(campaignId)) {
          campaignMap.set(campaignId, { id: campaignId, name: campaignName });
        }
      });
      return {
        bookings: items,
        campaigns: Array.from(campaignMap.values()),
        hasTalentProfile: true,
      };
    } catch (e) {
      if (!isTalentProfileMissingError(e)) {
        console.error("Failed to load bookings", e);
      }
      return {
        bookings: [],
        campaigns: [],
        hasTalentProfile: !isTalentProfileMissingError(e),
      };
    }
  };

  const loadOfferDetails = async (offerId: string) => {
    if (!offerId) {
      setSelectedOfferContracts([]);
      setSelectedOfferDeliverables([]);
      return;
    }
    setLoadingOfferDetails(true);
    try {
      const [contractsResp, deliverablesResp] = await Promise.all([
        base44.get<{ contracts?: any[] }>(
          `/api/campaign-offers/${offerId}/contracts`,
        ),
        base44.get<{ deliverables?: any[] }>(
          `/api/campaign-offers/${offerId}/deliverables`,
        ),
      ]);
      const contracts = Array.isArray(contractsResp?.contracts)
        ? contractsResp.contracts
        : [];
      const refreshedContracts = await Promise.all(
        contracts.map(async (contract: any) => {
          const contractId = String(contract?.id || "").trim();
          if (!contractId) return contract;
          try {
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
      setSelectedOfferContracts(refreshedContracts);
      setSelectedOfferDeliverables(
        Array.isArray(deliverablesResp?.deliverables)
          ? deliverablesResp.deliverables
          : [],
      );
    } finally {
      setLoadingOfferDetails(false);
    }
  };
  const loadCreatorContractHubRows = async (offersInput?: any[]) => {
    const offers = Array.isArray(offersInput) ? offersInput : brandOffers;
    const rows = (
      await Promise.all(
        offers.map(async (offer: any) => {
          const offerId = String(offer?.id || "");
          if (!offerId) return [];
          try {
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
                try {
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
            }));
          } catch {
            return [];
          }
        }),
      )
    ).flat();
    setCreatorContractHubRows(rows);
  };

  useEffect(() => {
    if (!initialized || !authenticated || !creatorBillingLoaded) return;
    let active = true;
    (async () => {
      try {
        setIsLoadingCampaigns(true);
        setAgencyConnectionLoading(true);
        const canLoadTalentCommerceData = creatorPlanTierForLoad !== "free";
        const [
          { connections, invites },
          { requests, connections: brandConnected },
          offers,
          jobInvitesRes,
          assetRequestsResp,
          bookingsData,
        ] = await Promise.all([
          loadAgencyConnectionData(),
          loadBrandConnectionData(),
          loadBrandOffers().catch(() => []),
          loadJobInvites().catch(() => []),
          loadAssetRequests().catch(() => []),
          canLoadTalentCommerceData
            ? loadBookings().catch(() => ({
                bookings: [],
                campaigns: [],
                hasTalentProfile: false,
              }))
            : Promise.resolve({
                bookings: [],
                campaigns: [],
                hasTalentProfile: false,
              }),
        ]);
        const [licensesResp, licensingRequestsResp] =
          bookingsData.hasTalentProfile
            ? await Promise.all([
                listTalentLicenses().catch((e) => {
                  if (!isTalentProfileMissingError(e)) throw e;
                  return [];
                }),
                listTalentLicensingRequests().catch((e) => {
                  if (!isTalentProfileMissingError(e)) throw e;
                  return [];
                }),
              ])
            : [[], []];
        if (!active) return;
        setAgencyConnections(connections);
        setAgencyInvites(invites);
        setBrandConnectionRequests(requests);
        setBrandConnections(brandConnected);
        setBrandOffers(Array.isArray(offers) ? offers : []);
        setJobInvites(Array.isArray(jobInvitesRes) ? jobInvitesRes : []);
        // Contract hub rows are not needed now that contracts tab is removed.
        const assets = Array.isArray(assetRequestsResp)
          ? assetRequestsResp
          : [];
        setAssetRequests(assets);
        const offerIds = Array.from(
          new Set(
            assets
              .map((req: any) =>
                String(req?.offer_id || req?.campaign_offers?.id || ""),
              )
              .filter(Boolean),
          ),
        );
        if (offerIds.length > 0) {
          await Promise.all(
            offerIds.map(async (offerId) => {
              setLoadingOfferDeliverablesById((prev) => ({
                ...prev,
                [offerId]: true,
              }));
              try {
                const resp = await base44.get<{ deliverables?: any[] }>(
                  `/api/campaign-offers/${offerId}/deliverables`,
                );
                const rows = Array.isArray(resp?.deliverables)
                  ? resp.deliverables
                  : [];
                setOfferDeliverablesById((prev) => ({
                  ...prev,
                  [offerId]: rows,
                }));
              } catch {
                setOfferDeliverablesById((prev) => ({
                  ...prev,
                  [offerId]: [],
                }));
              } finally {
                setLoadingOfferDeliverablesById((prev) => ({
                  ...prev,
                  [offerId]: false,
                }));
              }
            }),
          );
        }
        setBookings(
          Array.isArray(bookingsData.bookings) ? bookingsData.bookings : [],
        );
        setCreatorCampaigns(
          Array.isArray(bookingsData.campaigns) ? bookingsData.campaigns : [],
        );
        const normalizedLicenses = Array.isArray(licensesResp)
          ? licensesResp
          : Array.isArray((licensesResp as any)?.licenses)
            ? (licensesResp as any).licenses
            : Array.isArray((licensesResp as any)?.data)
              ? (licensesResp as any).data
              : [];
        setLicenses(normalizedLicenses);
        const normalizedRequests = Array.isArray(licensingRequestsResp)
          ? licensingRequestsResp
          : Array.isArray((licensingRequestsResp as any)?.requests)
            ? (licensingRequestsResp as any).requests
            : Array.isArray((licensingRequestsResp as any)?.data)
              ? (licensingRequestsResp as any).data
              : [];
        setLicensingRequests(normalizedRequests);
      } catch (e: any) {
        if (!active) return;
        console.error("Failed to load agency connection data", e);
      } finally {
        if (!active) return;
        setAgencyConnectionLoading(false);
        setIsLoadingCampaigns(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [
    initialized,
    authenticated,
    creatorPlanTierForLoad,
    creatorBillingLoaded,
  ]);
  useEffect(() => {
    if (assetRequestsInitialized) return;
    if (assetRequests.length === 0) return;
    setExpandedAssetRequests(new Set());
    setAssetRequestsInitialized(true);
  }, [assetRequests, assetRequestsInitialized]);
  useEffect(() => {
    return () => {
      sendDeliverablePreviewUrls.forEach((url) => {
        if (String(url).startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
  }, [sendDeliverablePreviewUrls]);

  useEffect(() => {
    if (!initialized || !authenticated) return;
    if (
      activeSection !== "brand-connection" &&
      activeSection !== "agency-connection"
    ) {
      return;
    }
    let active = true;
    (async () => {
      try {
        const { requests, connections } = await loadBrandConnectionData();
        const [offers, jobInvitesRes] = await Promise.all([
          loadBrandOffers().catch(() => []),
          loadJobInvites().catch(() => []),
        ]);
        const assets = await loadAssetRequests().catch(() => []);
        if (!active) return;
        setBrandConnectionRequests(requests);
        setBrandConnections(connections);
        setBrandOffers(Array.isArray(offers) ? offers : []);
        setJobInvites(Array.isArray(jobInvitesRes) ? jobInvitesRes : []);
        setAssetRequests(Array.isArray(assets) ? assets : []);
      } catch (e) {
        if (!active) return;
        console.error("Failed to refresh brand connection data", e);
      }
    })();
    return () => {
      active = false;
    };
  }, [activeSection, initialized, authenticated]);

  useEffect(() => {
    if (!initialized || !authenticated) return;
    let active = true;
    const refresh = async () => {
      try {
        const { requests, connections } = await loadBrandConnectionData();
        const [offers, jobInvitesRes] = await Promise.all([
          loadBrandOffers(true).catch(() => []),
          loadJobInvites(true).catch(() => []),
        ]);
        const assets = await loadAssetRequests().catch(() => []);
        if (!active) return;
        setBrandConnectionRequests(requests);
        setBrandConnections(connections);
        setBrandOffers(Array.isArray(offers) ? offers : []);
        setJobInvites(Array.isArray(jobInvitesRes) ? jobInvitesRes : []);
        setAssetRequests(Array.isArray(assets) ? assets : []);
      } catch (e) {
        if (!active) return;
        console.error("Failed to poll brand connection data", e);
      }
    };
    const timer = setInterval(refresh, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [initialized, authenticated]);

  const resolveTranslation = (key: string, fallback: string) => {
    const resolved = t(key, { defaultValue: "" });
    if (resolved && resolved !== key) return resolved;
    return fallback;
  };

  // Helper functions to get translated arrays (with robust fallback chain)
  const getTranslatedContentTypes = () => [
    resolveTranslation(
      "creatorDashboard.contentTypes.socialMediaAds",
      resolveTranslation(
        "content.contentTypes.socialMediaAds",
        CONTENT_TYPES[0],
      ),
    ),
    resolveTranslation(
      "creatorDashboard.contentTypes.webBannerCampaigns",
      resolveTranslation(
        "content.contentTypes.webBannerCampaigns",
        CONTENT_TYPES[1],
      ),
    ),
    resolveTranslation(
      "creatorDashboard.contentTypes.tvStreamingCommercials",
      resolveTranslation(
        "content.contentTypes.tvStreamingCommercials",
        CONTENT_TYPES[2],
      ),
    ),
    resolveTranslation(
      "creatorDashboard.contentTypes.filmScriptedStreaming",
      resolveTranslation(
        "content.contentTypes.filmScriptedStreaming",
        CONTENT_TYPES[3],
      ),
    ),
    resolveTranslation(
      "creatorDashboard.contentTypes.printOutdoorAds",
      resolveTranslation(
        "content.contentTypes.printOutdoorAds",
        CONTENT_TYPES[4],
      ),
    ),
    resolveTranslation(
      "creatorDashboard.contentTypes.musicVideos",
      resolveTranslation("content.contentTypes.musicVideos", CONTENT_TYPES[5]),
    ),
    resolveTranslation(
      "creatorDashboard.contentTypes.videoGameVRCharacters",
      resolveTranslation(
        "content.contentTypes.videoGameVRCharacters",
        CONTENT_TYPES[6],
      ),
    ),
    resolveTranslation(
      "creatorDashboard.contentTypes.stockPhotoVideoLibraries",
      resolveTranslation(
        "content.contentTypes.stockPhotoVideoLibraries",
        CONTENT_TYPES[7],
      ),
    ),
    resolveTranslation(
      "creatorDashboard.contentTypes.educationalNonprofitSpots",
      resolveTranslation(
        "content.contentTypes.educationalNonprofitSpots",
        CONTENT_TYPES[8],
      ),
    ),
  ];

  const getTranslatedIndustries = () => [
    resolveTranslation(
      "creatorDashboard.industries.fashionBeauty",
      resolveTranslation("content.industries.fashionBeauty", INDUSTRIES[0]),
    ),
    resolveTranslation(
      "creatorDashboard.industries.techElectronics",
      resolveTranslation("content.industries.techElectronics", INDUSTRIES[1]),
    ),
    resolveTranslation(
      "creatorDashboard.industries.sportsFitness",
      resolveTranslation("content.industries.sportsFitness", INDUSTRIES[2]),
    ),
    resolveTranslation(
      "creatorDashboard.industries.foodBeverage",
      resolveTranslation("content.industries.foodBeverage", INDUSTRIES[3]),
    ),
    resolveTranslation(
      "creatorDashboard.industries.filmGamingMusic",
      resolveTranslation("content.industries.filmGamingMusic", INDUSTRIES[4]),
    ),
    resolveTranslation(
      "creatorDashboard.industries.automotive",
      resolveTranslation("content.industries.automotive", INDUSTRIES[5]),
    ),
    resolveTranslation(
      "creatorDashboard.industries.financeFintech",
      resolveTranslation("content.industries.financeFintech", INDUSTRIES[6]),
    ),
    resolveTranslation(
      "creatorDashboard.industries.healthWellness",
      resolveTranslation("content.industries.healthWellness", INDUSTRIES[7]),
    ),
    resolveTranslation(
      "creatorDashboard.industries.luxuryLifestyle",
      resolveTranslation("content.industries.luxuryLifestyle", INDUSTRIES[8]),
    ),
    resolveTranslation(
      "creatorDashboard.industries.travelHospitality",
      resolveTranslation("content.industries.travelHospitality", INDUSTRIES[9]),
    ),
    resolveTranslation(
      "creatorDashboard.industries.education",
      resolveTranslation("content.industries.education", INDUSTRIES[10]),
    ),
    resolveTranslation(
      "creatorDashboard.industries.realEstate",
      resolveTranslation("content.industries.realEstate", INDUSTRIES[11]),
    ),
    resolveTranslation(
      "creatorDashboard.industries.entertainment",
      resolveTranslation("content.industries.entertainment", INDUSTRIES[12]),
    ),
    resolveTranslation(
      "creatorDashboard.industries.openToAny",
      resolveTranslation("content.industries.openToAny", INDUSTRIES[13]),
    ),
  ];

  const getTranslatedRestrictions = () => [
    t("creatorDashboard.restrictions.politicalContent"),
    t("creatorDashboard.restrictions.controversialTopics"),
    t("creatorDashboard.restrictions.explicitAdultContent"),
    t("creatorDashboard.restrictions.pharmaceuticalClaims"),
    t("creatorDashboard.restrictions.financialInvestmentAdvice"),
    t("creatorDashboard.restrictions.tobaccoVapingProducts"),
    t("creatorDashboard.restrictions.gamblingUnlicensed"),
    t("creatorDashboard.restrictions.alcohol"),
    t("creatorDashboard.restrictions.byproductsAnimalTesting"),
    t("creatorDashboard.restrictions.weaponsFirearms"),
    t("creatorDashboard.restrictions.cryptocurrencyNFT"),
    t("creatorDashboard.restrictions.mlmMultiLevelMarketing"),
    t("creatorDashboard.restrictions.unlicensedFinancialProducts"),
    t("creatorDashboard.restrictions.healthMedicalClaims"),
  ];

  const getTranslatedVibes = () =>
    VIBES.map((vibe) => resolveTranslation(`vibes.${vibe}`, vibe));

  // Mapping functions to translate stored English values to localized display text
  const translateContentType = (englishType: string): string => {
    const index = CONTENT_TYPES.indexOf(englishType);
    if (index === -1) return englishType;
    return getTranslatedContentTypes()[index];
  };

  const translateIndustry = (englishIndustry: string): string => {
    const index = INDUSTRIES.indexOf(englishIndustry);
    if (index === -1) return englishIndustry;
    return getTranslatedIndustries()[index];
  };

  const translateRestriction = (englishRestriction: string): string => {
    const index = RESTRICTIONS.indexOf(englishRestriction);
    if (index === -1) return englishRestriction;
    return getTranslatedRestrictions()[index];
  };

  const translateVibe = (englishVibe: string): string => {
    const index = VIBES.indexOf(englishVibe);
    if (index === -1) return englishVibe;
    return getTranslatedVibes()[index];
  };

  useEffect(() => {
    const handleResize = () => {
      const small = window.innerWidth < 1024;
      setIsSmallScreen(small);
      if (!small) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Set initial state

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Sync creator state when auth profile changes
  useEffect(() => {
    if (profile) {
      const weeklyCents =
        typeof profile.base_weekly_price_cents === "number"
          ? profile.base_weekly_price_cents
          : null;
      const monthlyCents =
        typeof profile.base_monthly_price_cents === "number"
          ? profile.base_monthly_price_cents
          : null;
      const resolvedVisibility = resolvePublicBrandsVisibility(profile);
      const isPublicBrands =
        resolvedVisibility ||
        (!resolvedVisibility && shouldDefaultVisibilityOn(profile));
      setCreator((prev: any) => ({
        ...prev,
        name: profile.full_name || user?.user_metadata?.full_name || prev.name,
        email: profile.email || prev.email,
        profile_photo: profile.profile_photo_url || prev.profile_photo,
        kyc_status: profile.kyc_status || prev.kyc_status,
        kyc_rejection_reason:
          profile.kyc_rejection_reason ?? prev.kyc_rejection_reason ?? null,
        location: [profile.city, profile.state].filter(Boolean).join(", "),
        bio: profile.bio ?? prev.bio,
        birthday: profile.birthdate ?? prev.birthday,
        gender: profile.gender ?? prev.gender,
        ethnicity: profile.ethnicity ?? prev.ethnicity,
        creator_type: profile.creator_type ?? prev.creator_type,
        race: profile.race ?? prev.race,
        hair_color: profile.hair_color ?? prev.hair_color,
        eye_color: profile.eye_color ?? prev.eye_color,
        height_cm:
          typeof profile.height_cm === "number"
            ? String(profile.height_cm)
            : prev.height_cm,
        tiktok_handle: profile.tiktok_handle ?? prev.tiktok_handle,
        portfolio_url: profile.portfolio_link ?? prev.portfolio_url,
        vibes: profile.vibes ?? prev.vibes,
        is_public_brands: isPublicBrands,
      }));
    }
  }, [profile]);

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(
    null,
  );

  const heroMedia = useMemo(() => {
    // Fallback to first portfolio item if available (or null)
    if (profile?.portfolio && profile.portfolio.length > 0) {
      // Find a video if possible
      const video = profile.portfolio.find((p) => p.type === "video");
      if (video) return { type: "video" as const, url: video.url };
      // Otherwise first image
      return { type: "image" as const, url: profile.portfolio[0].url };
    }
    return null;
  }, [profile?.portfolio]);
  const [photos, setPhotos] = useState([]);

  const [voiceLibrary, setVoiceLibrary] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [kycLoading, setKycLoading] = useState(false);
  const [kycStatusRefreshing, setKycStatusRefreshing] = useState(false);
  const [showKycModal, setShowKycModal] = useState(false);
  const [kycSessionUrl, setKycSessionUrl] = useState<string | null>(null);
  const [savedKycSessionUrl, setSavedKycSessionUrl] = useState<string | null>(
    null,
  );
  const veriffFrameRef = useRef<any>(null);
  const [kycEmbedLoading, setKycEmbedLoading] = useState(false);
  const creatorUserId = user?.id ? String(user.id) : null;

  const currentCreatorKycReason = useMemo(
    () =>
      formatKycReason(
        creator?.kyc_rejection_reason ?? profile?.kyc_rejection_reason,
      ),
    [creator?.kyc_rejection_reason, profile?.kyc_rejection_reason],
  );

  const normalizedCreatorStatus = useMemo(
    () =>
      String(creator?.kyc_status || "")
        .trim()
        .toLowerCase(),
    [creator?.kyc_status],
  );

  const isCreatorApproved = normalizedCreatorStatus === "approved";
  const isCreatorPending = normalizedCreatorStatus === "pending";
  const isCreatorRejected =
    normalizedCreatorStatus === "rejected" ||
    normalizedCreatorStatus === "declined";

  const hasCreatorPendingFollowUp =
    isCreatorPending && currentCreatorKycReason.length > 0;

  const verificationButtonLabel = useMemo(() => {
    if (isCreatorPending) {
      return savedKycSessionUrl
        ? t(
            hasCreatorPendingFollowUp
              ? "creatorDashboard.verificationStatus.continueVerification"
              : "creatorDashboard.verificationStatus.resumeVerification",
            hasCreatorPendingFollowUp
              ? "Continue Verification"
              : "Resume Verification",
          )
        : t(
            "creatorDashboard.verificationStatus.restartVerification",
            "Start New Verification",
          );
    }

    if (isCreatorRejected) {
      return t(
        "creatorDashboard.verificationStatus.retryVerification",
        "Retry Verification",
      );
    }

    return t("creatorDashboard.verificationStatus.completeVerification");
  }, [
    isCreatorPending,
    isCreatorRejected,
    savedKycSessionUrl,
    hasCreatorPendingFollowUp,
    t,
  ]);

  const openCreatorKycModal = (sessionUrl: string) => {
    setShowKycModal(true);
    setKycEmbedLoading(true);
    setKycSessionUrl(sessionUrl);
  };

  useEffect(() => {
    if (!creatorUserId) {
      setSavedKycSessionUrl(null);
      return;
    }

    setSavedKycSessionUrl(loadStoredKycSessionUrl("creator", creatorUserId));
  }, [creatorUserId]);

  useEffect(() => {
    if (!creatorUserId) return;
    const normalizedStatus = String(creator?.kyc_status || "")
      .trim()
      .toLowerCase();

    if (
      normalizedStatus === "approved" ||
      normalizedStatus === "rejected" ||
      normalizedStatus === "declined"
    ) {
      clearStoredKycSessionUrl("creator", creatorUserId);
      setSavedKycSessionUrl(null);
    }
  }, [creator?.kyc_status, creatorUserId]);

  useEffect(() => {
    if (!kycSessionUrl) return;

    const rootElementId = "veriff-kyc-embedded-creator";
    let cancelled = false;

    const loadIncontextScript = () => {
      const w = window as any;
      if (w.veriffSDK?.createVeriffFrame) return Promise.resolve();

      return new Promise<void>((resolve, reject) => {
        const existing = document.querySelector(
          'script[data-likelee-veriff-incontext="1"]',
        ) as HTMLScriptElement | null;
        if (existing) {
          existing.addEventListener("load", () => resolve(), { once: true });
          existing.addEventListener("error", () => reject(), { once: true });
          return;
        }

        const s = document.createElement("script");
        s.src = "https://cdn.veriff.me/incontext/js/v2.5.0/veriff.js";
        s.async = true;
        s.setAttribute("data-likelee-veriff-incontext", "1");
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Failed to load Veriff InContext"));
        document.body.appendChild(s);
      });
    };

    (async () => {
      try {
        setKycEmbedLoading(true);
        await loadIncontextScript();
        if (cancelled) return;

        const container = document.getElementById(rootElementId);
        if (container) container.innerHTML = "";

        const w = window as any;
        if (!w.veriffSDK?.createVeriffFrame) {
          throw new Error("Veriff SDK not available");
        }

        veriffFrameRef.current = w.veriffSDK.createVeriffFrame({
          url: kycSessionUrl,
          embedded: true,
          embeddedOptions: {
            rootElementID: rootElementId,
          },
          onEvent: (msg: any) => {
            if (msg === "SUBMITTED") {
              setCreator((prev: any) => ({
                ...prev,
                kyc_status: "pending",
                kyc_rejection_reason: null,
              }));
              if (creatorUserId) {
                clearStoredKycSessionUrl("creator", creatorUserId);
              }
              setSavedKycSessionUrl(null);
              setShowKycModal(false);
              setKycSessionUrl(null);
              refreshVerificationFromDashboard({ manageLoading: false });
            }
          },
        });

        setKycEmbedLoading(false);
      } catch (e: any) {
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description:
            e?.message || "Failed to load verification. Please try again.",
        });
        if (creatorUserId) {
          clearStoredKycSessionUrl("creator", creatorUserId);
        }
        setSavedKycSessionUrl(null);
        setKycEmbedLoading(false);
        setKycSessionUrl(null);
        setShowKycModal(false);
      }
    })();

    return () => {
      cancelled = true;
      try {
        veriffFrameRef.current?.close?.();
      } catch {
        // ignore
      }
      veriffFrameRef.current = null;
      const container = document.getElementById(rootElementId);
      if (container) container.innerHTML = "";
    };
  }, [kycSessionUrl]);

  useEffect(() => {
    if (!showKycModal) return;
    if (!authenticated || !user?.id || !creatorCanUseKycForLoad) return;

    let active = true;
    const interval = window.setInterval(async () => {
      try {
        const rows: any = await getKycStatus();
        const row = Array.isArray(rows) && rows.length ? rows[0] : null;
        const status = row?.kyc_status;
        if (!active || !status) return;

        setCreator((prev: any) => ({
          ...prev,
          kyc_status: status,
          verified_at: row?.verified_at ?? prev?.verified_at,
          kyc_rejection_reason: row?.kyc_rejection_reason ?? null,
        }));

        if (status === "approved") {
          if (creatorUserId) {
            clearStoredKycSessionUrl("creator", creatorUserId);
          }
          setSavedKycSessionUrl(null);
          toast({
            title: "Verification Complete",
            description: "Your verification is approved.",
          });
          setShowKycModal(false);
          setKycSessionUrl(null);
        } else if (status === "declined") {
          if (creatorUserId) {
            clearStoredKycSessionUrl("creator", creatorUserId);
          }
          setSavedKycSessionUrl(null);
          toast({
            variant: "destructive",
            title: "Verification Complete",
            description: "Your verification was declined.",
          });
          setShowKycModal(false);
          setKycSessionUrl(null);
        }
      } catch {
        // ignore polling errors
      }
    }, 2500);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [
    authenticated,
    creatorCanUseKycForLoad,
    creatorUserId,
    showKycModal,
    user?.id,
  ]);
  const [activeCampaigns, setActiveCampaigns] =
    useState<any[]>(mockActiveCampaigns);
  const [editingRules, setEditingRules] = useState(false);
  const [contentItems, setContentItems] = useState<any[]>([]);
  const [selectedContract, setSelectedContract] = useState(null);
  const [showContractDetails, setShowContractDetails] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseOption, setPauseOption] = useState(null);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [contractsTab, setContractsTab] = useState("active");
  const [showImageUploadModal, setShowImageUploadModal] = useState(false);
  const [showRestrictionsModal, setShowRestrictionsModal] = useState(false);
  const [newRestriction, setNewRestriction] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [selectedImageSection, setSelectedImageSection] = useState(null);
  const [uploadingToSection, setUploadingToSection] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [referenceImages, setReferenceImages] = useState({
    headshot_neutral: null,
    headshot_smiling: null,
    fullbody_casual: null,
    fullbody_formal: null,
    side_profile: null,
    three_quarter: null,
    hair_down: null,
    hair_up: null,
    hair_styling: null,
    upper_body: null,
    outdoors: null,
    indoors: null,
    makeup_variation: null,
    seasonal: null,
    signature: null,
  });

  // Custom Rates State
  const [customRates, setCustomRates] = useState<any[]>([]);
  const [showRatesModal, setShowRatesModal] = useState<
    "content" | "industry" | null
  >(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSocialLinks, setSavingSocialLinks] = useState(false);
  const [savingRates, setSavingRates] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showConnectBankAccount, setShowConnectBankAccount] = useState(false);
  const [isLoadingPayout, setIsLoadingPayout] = useState(false);
  const [showPayoutSettings, setShowPayoutSettings] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<
    "stripe" | "paypal" | "wise"
  >("stripe");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [wiseDetails, setWiseDetails] = useState("");
  const [showShoutOut, setShowShoutOut] = useState(true);
  const [payoutAccountStatus, setPayoutAccountStatus] = useState<any>(null);
  const [balances, setBalances] = useState<any[]>([]);
  const [stripeBalances, setStripeBalances] = useState<any[]>([]);
  const [payoutHistory, setPayoutHistory] = useState<any[]>([]);
  const [showRequestPayoutModal, setShowRequestPayoutModal] = useState(false);
  const [requestPayoutAmount, setRequestPayoutAmount] = useState("");

  const fetchPayoutStatus = async () => {
    if (!initialized || !authenticated || !user?.id) return;
    try {
      const { getPayoutsAccountStatus, getPayoutBalance, getHistory } =
        await import("@/api/functions");
      const [statusRes, balanceRes, historyRes] = await Promise.all([
        getPayoutsAccountStatus(user.id),
        getPayoutBalance(user.id),
        getHistory({ profile_id: user.id, limit: 5 }),
      ]);
      setPayoutAccountStatus(statusRes.data);
      setBalances(balanceRes.data.balances || []);
      setStripeBalances(balanceRes.data.stripe_balances || []);
      setPayoutHistory(historyRes.data.items || historyRes.items || []);
    } catch (e) {
      console.error("Failed to fetch payout status", e);
    }
  };

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const state = urlParams.get("state"); // Should match user ID ideally, or session state

      if (code && initialized && authenticated && user?.id) {
        // Should verify state matches user.id
        if (state && state !== user.id) {
          console.warn("OAuth state mismatch", state, user.id);
          // handle error or ignore
        }

        try {
          setIsLoadingPayout(true);
          const { exchangeStripeOAuthCode } = await import("@/api/functions");
          const res = await exchangeStripeOAuthCode(code, user.id);

          if (res.data.status === "ok") {
            toast({
              title: "Success",
              description: "Stripe account linked successfully via OAuth!",
            });
            // Clear query params
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname,
            );
            // Refresh status
            await fetchPayoutStatus();
          } else {
            throw new Error(res.data.error || "OAuth exchange failed");
          }
        } catch (e) {
          console.error("OAuth error", e);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to link Stripe account via OAuth",
          });
        } finally {
          setIsLoadingPayout(false);
        }
      }
    };

    handleOAuthCallback();
  }, [initialized, authenticated, user?.id]);

  useEffect(() => {
    if (initialized && authenticated && user?.id) {
      fetchPayoutStatus();
    }
  }, [initialized, authenticated, user?.id]);

  // Shoutout should only disappear once payouts are set up; clear any previous localStorage gating
  useEffect(() => {
    localStorage.removeItem("cashout_announcement_dismissed");
    localStorage.removeItem("cashout_announcement_first_sight");
  }, []);

  // Auto-hide shoutout once payouts are connected/enabled
  useEffect(() => {
    if (
      payoutAccountStatus?.connected ||
      payoutAccountStatus?.payouts_enabled ||
      payoutAccountStatus?.transfers_enabled ||
      payoutAccountStatus?.details_submitted
    ) {
      if (showShoutOut) {
        setShowShoutOut(false);
      }
    }
  }, [payoutAccountStatus, showShoutOut]);

  // Load persisted Reference Image Library on mount/auth ready
  useEffect(() => {
    if (!initialized || !authenticated || !user?.id) return;
    const abort = new AbortController();
    (async () => {
      try {
        // Use authenticated client so Authorization header is attached
        const items = await base44.get<any[]>(`/reference-images`);
        if (Array.isArray(items)) {
          // keep latest per section_id
          const bySection = new Map<string, any>();
          for (const it of items) {
            const sid = it.section_id;
            if (!sid) continue;
            if (!bySection.has(sid)) bySection.set(sid, it);
          }
          setReferenceImages((prev) => {
            const next = { ...prev } as any;
            Object.keys(next).forEach((sid) => {
              const row = bySection.get(sid);
              next[sid] = row ? { url: row.public_url } : null;
            });
            return next;
          });
        }
      } catch (_) {
        // ignore
      }
    })();
    return () => abort.abort();
  }, [initialized, authenticated, user?.id, API_BASE]);

  // Load persisted Voice Library from backend on mount/auth ready
  useEffect(() => {
    if (!initialized || !authenticated || !user?.id) return;
    const abort = new AbortController();
    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;

        // 1) List recordings via authenticated client
        const rows = await base44.get<any[]>(`/voice/recordings`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { user_id: user.id },
        } as any);
        if (!Array.isArray(rows)) return;

        // 2) Fetch signed URLs for playback
        const withUrls = await Promise.all(
          rows.map(async (row: any) => {
            try {
              if (row?.accessible === false) {
                return {
                  id: row.id,
                  emotion: row.emotion_tag || null,
                  url: null,
                  blob: null,
                  mimeType: row.mime_type || "audio/webm",
                  duration: row.duration_sec || 0,
                  date: row.created_at,
                  accessible: false,
                  voiceProfileCreated: !!row.voice_profile_created,
                  usageCount: 0,
                  server_recording_id: row.id,
                };
              }

              const j = await base44.get<any>(`/voice/recordings/signed-url`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { recording_id: row.id, expires_sec: 600 },
              } as any);
              return {
                id: row.id,
                emotion: row.emotion_tag || null,
                url: j.url || null,
                blob: null,
                mimeType: row.mime_type || "audio/webm",
                duration: row.duration_sec || 0,
                date: row.created_at,
                accessible: row.accessible ?? true,
                voiceProfileCreated: !!row.voice_profile_created,
                usageCount: 0,
                server_recording_id: row.id,
              };
            } catch (e: any) {
              const msg = typeof e?.message === "string" ? e.message : "";
              const isNotFound = msg.includes(" failed: 404 ");

              if (isNotFound) {
                return {
                  id: row.id,
                  emotion: row.emotion_tag || null,
                  url: null,
                  blob: null,
                  mimeType: row.mime_type || "audio/webm",
                  duration: row.duration_sec || 0,
                  date: row.created_at,
                  accessible: false,
                  voiceProfileCreated: !!row.voice_profile_created,
                  usageCount: 0,
                  server_recording_id: row.id,
                };
              }

              return null;
            }
          }),
        );

        setVoiceLibrary((withUrls || []).filter(Boolean));
      } catch (_) {
        // ignore errors to avoid blocking dashboard
      }
    })();
    return () => abort.abort();
  }, [initialized, authenticated, user?.id, API_BASE]);
  const [contentPreferences, setContentPreferences] = useState({
    comfortable: [
      "Fashion & Beauty",
      "Product Reviews",
      "Testimonials",
      "Social Media Content",
      "Educational Content",
      "Fitness/Wellness",
      "Lifestyle Content",
    ],
    not_comfortable: [
      "Political Content",
      "Controversial Topics",
      "Explicit/Adult Content",
      "Pharmaceutical Claims",
      "Financial/Investment Advice",
    ],
  });

  // Voice recording states
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [selectedEmotion, setSelectedEmotion] = useState(null);
  const VOICE_SCRIPTS = getVoiceScripts(t);
  const [isRecording, setIsRecording] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentWord, setCurrentWord] = useState(0);
  const [generatingVoiceId, setGeneratingVoiceId] = useState<
    string | number | null
  >(null);
  const [tempContentTypes, setTempContentTypes] = useState<string[]>([]);
  const [tempIndustries, setTempIndustries] = useState<string[]>([]);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const dataChunkCountRef = useRef(0);
  const timerRef = useRef(null);

  // Track if we've loaded data for the current user to prevent unnecessary refetches
  const loadedUserRef = useRef<string | null>(null);

  // Calculate metrics (fallback to computed if backend doesn't send)
  const totalMonthlyRevenue = activeCampaigns.reduce(
    (sum, c) => sum + (c.rate || 0),
    0,
  );
  const annualRunRate = totalMonthlyRevenue * 12;
  const expiringCount = activeCampaigns.filter(
    (c) => c.status === "expiring_soon",
  ).length;

  // Fetch per-user dashboard data
  useEffect(() => {
    if (!initialized) return;
    if (!authenticated || !user?.id) return;

    // Skip if we've already loaded data for this user
    if (loadedUserRef.current === user.id) return;

    loadedUserRef.current = user.id;
    const abort = new AbortController();
    (async () => {
      try {
        const json = await base44.get("/dashboard");
        const profile = json.profile || {};
        const weeklyCents =
          typeof profile.base_weekly_price_cents === "number"
            ? profile.base_weekly_price_cents
            : null;
        const monthlyCents =
          typeof profile.base_monthly_price_cents === "number"
            ? profile.base_monthly_price_cents
            : null;
        const monthlyFromProfile =
          typeof monthlyCents === "number"
            ? Math.round(monthlyCents / 100)
            : typeof weeklyCents === "number"
              ? Math.round((weeklyCents / 100) * 4.345)
              : undefined;
        const hasExplicitBaseRate =
          !isDefaultPricing(profile) &&
          ((typeof weeklyCents === "number" && weeklyCents > 0) ||
            (typeof monthlyCents === "number" && monthlyCents > 0));
        const resolvedPricePerMonth = hasExplicitBaseRate
          ? typeof monthlyFromProfile === "number"
            ? monthlyFromProfile
            : 0
          : 0;
        baseRateRef.current = resolvedPricePerMonth;
        const visibilityField = String(profile?.visibility || "").trim();
        const resolvedVisibility = resolvePublicBrandsVisibility(profile);
        const isPublicBrands =
          resolvedVisibility ||
          (!resolvedVisibility && shouldDefaultVisibilityOn(profile));
        setCreator((prev: any) => ({
          ...prev,
          name:
            profile.full_name ||
            user?.user_metadata?.full_name ||
            prev.name ||
            "",
          email: profile.email || prev.email || "",
          profile_photo: profile.profile_photo_url || prev.profile_photo,
          location: [profile.city, profile.state].filter(Boolean).join(", "),
          bio: profile.bio || prev.bio,
          instagram_handle: profile.platform_handle
            ? `@${profile.platform_handle}`
            : prev.instagram_handle,
          birthday: profile.birthdate ?? prev.birthday,
          gender: profile.gender ?? prev.gender,
          ethnicity: profile.ethnicity ?? prev.ethnicity,
          creator_type: profile.creator_type ?? prev.creator_type,
          race: profile.race ?? prev.race,
          hair_color: profile.hair_color ?? prev.hair_color,
          eye_color: profile.eye_color ?? prev.eye_color,
          height_cm:
            typeof profile.height_cm === "number"
              ? String(profile.height_cm)
              : prev.height_cm,
          tiktok_handle: profile.tiktok_handle ?? prev.tiktok_handle,
          portfolio_url: profile.portfolio_link ?? prev.portfolio_url,
          is_public_brands: isPublicBrands,
          instagram_connected: prev.instagram_connected ?? false,
          content_types: profile.content_types || [],
          industries: profile.industries || [],
          // Canonical rate is weekly; fall back to legacy monthly when needed.
          // If pricing was never explicitly set, keep it blank (0) instead of
          // showing the platform minimum default.
          price_per_month:
            typeof resolvedPricePerMonth === "number"
              ? resolvedPricePerMonth
              : (prev.price_per_month ?? 0),
          royalty_percentage: prev.royalty_percentage ?? 0,
          accept_negotiations:
            profile.accept_negotiations ?? prev.accept_negotiations ?? true,
          content_restrictions: profile.content_restrictions || [],
          brand_exclusivity: profile.brand_exclusivity || [],
          kyc_status: profile.kyc_status,
          kyc_rejection_reason: profile.kyc_rejection_reason ?? null,
          verified_at: profile.verified_at,
          avatar_canonical_url: profile.avatar_canonical_url,
        }));
        // Campaigns are derived from offers + licenses
        if (Array.isArray(json.contracts) && json.contracts.length)
          setContracts(json.contracts);
        // Optionally, if backend provides metrics, you can store them to override computed ones
      } catch (e) {
        console.error("Failed to fetch dashboard", e);
      }
    })();
    return () => abort.abort();
  }, [initialized, authenticated, user?.id]);

  // Fetch custom rates
  useEffect(() => {
    if (!initialized || !authenticated || !user?.id) return;
    (async () => {
      try {
        const data = await base44.get("/creator-rates");
        setCustomRates(
          data.filter(
            (rate: any) =>
              rate.rate_name !== "Social-media ads" &&
              rate.rate_name !== "Other" &&
              (CONTENT_TYPES.includes(rate.rate_name) ||
                INDUSTRIES.includes(rate.rate_name)),
          ),
        );
      } catch (e) {
        console.error("Failed to fetch rates", e);
      }
    })();
  }, [initialized, authenticated, user?.id, API_BASE]);

  // Sync verification status from backend on load
  useEffect(() => {
    if (!initialized || !authenticated || !user?.id) return;
    refreshVerificationFromDashboard({ manageLoading: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, authenticated, user?.id]);

  // Keep status fresh while pending (even if modal is closed)
  useEffect(() => {
    if (!initialized || !authenticated || !user?.id) return;
    if (creator?.kyc_status !== "pending") return;

    const interval = window.setInterval(
      () => {
        refreshVerificationFromDashboard({ manageLoading: false });
      },
      10 * 60 * 1000,
    );

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creator?.kyc_status, initialized, authenticated, user?.id]);

  // Verification actions from dashboard
  const startVerificationFromDashboard = async () => {
    if (!creatorCanUseKyc) {
      navigate("/CreatorSubscribe");
      return;
    }
    if (!authenticated || !user?.id) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to start verification.",
      });
      return;
    }

    const normalizedStatus = String(creator?.kyc_status || "")
      .trim()
      .toLowerCase();

    if (normalizedStatus === "pending" && savedKycSessionUrl) {
      openCreatorKycModal(savedKycSessionUrl);
      return;
    }
    if (normalizedStatus === "approved") {
      toast({
        title: "Already Verified",
        description: "Your KYC verification is already approved.",
      });
      return;
    }

    try {
      setKycLoading(true);
      const data: any = await base44.post("/kyc/session", {
        user_id: user.id,
      });
      // Optimistic UI: once a session is created, verification is in progress.
      setCreator((prev: any) => ({
        ...prev,
        kyc_status: "pending",
        kyc_rejection_reason: null,
      }));
      if (data.session_url) {
        const sessionUrl = String(data.session_url);
        if (creatorUserId) {
          storeKycSessionUrl("creator", creatorUserId, sessionUrl);
        }
        setSavedKycSessionUrl(sessionUrl);
        openCreatorKycModal(sessionUrl);
      } else {
        throw new Error("No verification session returned");
      }
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: `Failed to start verification: ${e?.message || e}`,
      });
      setShowKycModal(false);
      setKycSessionUrl(null);
    } finally {
      setKycLoading(false);
    }
  };

  const refreshVerificationFromDashboard = async ({
    manageLoading = true,
  }: {
    manageLoading?: boolean;
  } = {}) => {
    if (!authenticated || !user?.id || !creatorCanUseKycForLoad) return;
    try {
      if (manageLoading) setKycStatusRefreshing(true);
      const rows = await getKycStatus();
      const row = Array.isArray(rows) && rows.length ? rows[0] : null;
      if (row && (row.kyc_status || row.liveness_status)) {
        const normalizedStatus = String(row.kyc_status || "")
          .trim()
          .toLowerCase();
        setCreator((prev: any) => ({
          ...prev,
          kyc_status: row.kyc_status,
          verified_at: row.verified_at,
          kyc_rejection_reason: row.kyc_rejection_reason ?? null,
        }));
        if (
          normalizedStatus === "approved" ||
          normalizedStatus === "rejected" ||
          normalizedStatus === "declined"
        ) {
          if (creatorUserId) {
            clearStoredKycSessionUrl("creator", creatorUserId);
          }
          setSavedKycSessionUrl(null);
        }
      }
    } catch (e: any) {
      console.error("Failed to refresh verification status", e);
    } finally {
      if (manageLoading) setKycStatusRefreshing(false);
    }
  };

  const brandPendingRequestsUnseen = brandConnectionRequests.filter(
    (i) =>
      i.status === "pending" && !seenBrandRequestIds.has(String(i?.id || "")),
  ).length;
  const brandOfferNotificationsUnseen = directBrandOffers.filter(
    (offer: any) => {
      const status = String(offer?.status || "").toLowerCase();
      return (
        [
          "changes_requested",
          "contract_sent",
          "contract_partially_signed",
          "deliverables_submitted",
        ].includes(status) &&
        !seenOfferNotificationIds.has(String(offer?.id || ""))
      );
    },
  ).length;
  const totalBrandConnectionUnseen =
    brandPendingRequestsUnseen + brandOfferNotificationsUnseen;

  useEffect(() => {
    if (activeSection === "brand-connection") {
      setSeenBrandRequestIds((prev) => {
        const next = new Set(prev);
        let changed = false;
        brandConnectionRequests.forEach((r: any) => {
          const rid = String(r?.id || "");
          if (rid && !next.has(rid)) {
            next.add(rid);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
      setSeenOfferNotificationIds((prev) => {
        const next = new Set(prev);
        let changed = false;
        directBrandOffers.forEach((o: any) => {
          const oid = String(o?.id || "");
          if (oid && !next.has(oid)) {
            next.add(oid);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [activeSection, brandConnectionRequests, directBrandOffers]);

  // Initialize active section from query string if provided
  useEffect(() => {
    const s = searchParams.get("section");
    if (!s) return;
    const validIds = navigationItems.map((n) => n.id);
    if (validIds.includes(s)) {
      setActiveSection(s);
    }
  }, [searchParams]);

  useEffect(() => {
    const nextSettings = searchParams.get("settings");
    if (!nextSettings) return;
    if (
      nextSettings === "profile" ||
      nextSettings === "rules" ||
      nextSettings === "billing"
    ) {
      setSettingsTab(nextSettings);
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    async function loadBilling() {
      try {
        const resp = await getCreatorBillingStatus();
        if (!cancelled) {
          setCreatorBilling(resp);
        }
      } catch (error) {
        console.error("Failed to load creator billing status", error);
      } finally {
        if (!cancelled) {
          setCreatorBillingLoaded(true);
        }
      }
    }
    void loadBilling();
    return () => {
      cancelled = true;
    };
  }, []);

  const creatorPlanTier = String(creatorBilling?.plan_tier || "free");
  const trialActive = !!creatorBilling?.trial_active;
  const effectivePlanTier = String(
    (creatorBilling as any)?.entitlement_tier || creatorPlanTier,
  );
  const hasUsedProTrial =
    !!creatorBilling?.trial_pro_start_at ||
    (!!creatorBilling?.trial_start_at && creatorPlanTier === "pro");

  const [trialCountdown, setTrialCountdown] = useState<string>("");
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const trialStartAt = creatorBilling?.trial_start_at;
  const trialEndsAt = creatorBilling?.trial_ends_at
    ? String(creatorBilling.trial_ends_at)
    : "";

  useEffect(() => {
    if (!trialActive || !trialEndsAt) {
      setTrialCountdown("");
      setDaysLeft(null);
      return;
    }

    const compute = () => {
      const end = new Date(trialEndsAt).getTime();
      const now = Date.now();
      const ms = Math.max(0, end - now);

      const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
      setDaysLeft(days);
      if (ms <= 0) {
        setTrialCountdown("Trial ended");
        return;
      }
      setTrialCountdown(`${days} ${days === 1 ? "day" : "days"}`);
    };

    compute();
    const id = window.setInterval(compute, 60 * 1000);
    return () => window.clearInterval(id);
  }, [creatorPlanTier, trialActive, trialEndsAt]);

  const creatorCategoryLimit =
    typeof creatorBilling?.category_limit === "number"
      ? creatorBilling.category_limit
      : 15;
  const creatorVoiceLimit =
    typeof creatorBilling?.voice_tone_limit === "number"
      ? creatorBilling.voice_tone_limit
      : 0;
  const creatorCanUseKyc =
    typeof creatorBilling?.can_use_kyc === "boolean"
      ? creatorBilling.can_use_kyc
      : creatorPlanTier !== "free";
  const creatorCanUseLikeness =
    typeof creatorBilling?.can_use_likeness === "boolean"
      ? creatorBilling.can_use_likeness
      : creatorPlanTier !== "free";
  const creatorCanUseAgencyConnection =
    typeof creatorBilling?.can_use_agency_connection === "boolean"
      ? creatorBilling.can_use_agency_connection
      : creatorPlanTier !== "free";
  const creatorCanUseBrandConnection =
    typeof creatorBilling?.can_use_brand_connection === "boolean"
      ? creatorBilling.can_use_brand_connection
      : creatorPlanTier !== "free";
  const creatorCanUsePayouts =
    typeof creatorBilling?.can_use_payouts === "boolean"
      ? creatorBilling.can_use_payouts
      : creatorPlanTier !== "free";
  const creatorCanUseVoice = !!creatorBilling?.can_use_voice_profiles;
  const creatorCanUseMonitoring =
    !!creatorBilling?.can_use_unauthorized_monitoring;
  const creatorCanUseAdvancedAnalytics =
    !!creatorBilling?.can_use_advanced_analytics;
  const creatorCanUseJobs =
    typeof creatorBilling?.can_use_jobs === "boolean"
      ? creatorBilling.can_use_jobs
      : creatorPlanTier === "pro";
  const creatorCanUseRules =
    typeof creatorBilling?.can_use_rules === "boolean"
      ? creatorBilling.can_use_rules
      : creatorPlanTier === "pro";
  const creatorCanUseTalentPortal =
    typeof creatorBilling?.can_use_talent_portal === "boolean"
      ? creatorBilling.can_use_talent_portal
      : creatorPlanTier === "pro";
  const creatorCanUseCampaignArchive =
    typeof creatorBilling?.can_use_campaign_archive === "boolean"
      ? creatorBilling.can_use_campaign_archive
      : creatorPlanTier === "pro";
  const creatorCanUseActiveCampaigns =
    typeof creatorBilling?.can_use_active_campaigns === "boolean"
      ? creatorBilling.can_use_active_campaigns
      : creatorPlanTier === "pro";
  const creatorPlanLabel =
    effectivePlanTier === "pro"
      ? trialActive
        ? "Pro Trial"
        : "Pro Plan"
      : effectivePlanTier === "basic"
        ? trialActive
          ? "Basic Trial"
          : "Basic Plan"
        : "Free Plan";
  const creatorPlanBadgeClass =
    effectivePlanTier === "pro"
      ? "bg-gradient-to-br from-[#2B59FF] to-[#3B2BFF] text-white border-0 shadow-[0_2px_10px_rgba(43,89,255,0.3)]"
      : effectivePlanTier === "basic"
        ? "bg-gradient-to-br from-[#0D9488] to-[#14B8A6] text-white border-0 shadow-[0_2px_10px_rgba(13,148,136,0.3)]"
        : "bg-gradient-to-br from-[#64748B] to-[#94A3B8] text-white border-0 shadow-sm";

  useEffect(() => {
    const lockedFallback = creatorPlanTier === "free" ? "content" : "dashboard";
    const inaccessible =
      (activeSection === "likeness" && !creatorCanUseLikeness) ||
      (activeSection === "voice" && !creatorCanUseVoice) ||
      (activeSection === "campaigns" && !creatorCanUseActiveCampaigns) ||
      (activeSection === "archive" && !creatorCanUseCampaignArchive) ||
      (activeSection === "earnings" && !creatorCanUsePayouts) ||
      (activeSection === "agency-connection" &&
        !creatorCanUseAgencyConnection) ||
      (activeSection === "brand-connection" && !creatorCanUseBrandConnection) ||
      (activeSection === "talent-portal" &&
        (!creatorCanUseTalentPortal || !talentPortalEnabled));
    if (inaccessible) {
      setActiveSection(lockedFallback);
    }
  }, [
    activeSection,
    creatorCanUseActiveCampaigns,
    creatorCanUseAgencyConnection,
    creatorCanUseBrandConnection,
    creatorCanUseCampaignArchive,
    creatorCanUseLikeness,
    creatorCanUsePayouts,
    creatorCanUseTalentPortal,
    creatorCanUseVoice,
    creatorPlanTier,
    talentPortalEnabled,
  ]);

  useEffect(() => {
    if (settingsTab === "rules" && !creatorCanUseRules) {
      setSettingsTab("billing");
    }
  }, [creatorCanUseRules, settingsTab]);

  const navigationItems: Array<{
    id: string;
    label: string;
    icon: any;
    badge?: number;
    urgent?: boolean;
    disabled?: boolean;
    locked?: boolean;
    requiredPlan?: "basic" | "pro";
    premiumFeature?: string;
    onClick?: () => void;
  }> = [
    {
      id: "dashboard",
      label: t("creatorDashboard.nav.dashboard"),
      icon: LayoutDashboard,
    },
    {
      id: "content",
      label: t("creatorDashboard.nav.content"),
      icon: PlayCircle,
    },
    {
      id: "likeness",
      label: t("creatorDashboard.nav.likeness"),
      icon: ImageIcon,
      locked: !creatorCanUseLikeness,
      requiredPlan: "basic",
      premiumFeature: "My Likeness",
    },
    {
      id: "voice",
      label: t("creatorDashboard.nav.voice"),
      icon: Mic,
      locked: !creatorCanUseVoice,
      requiredPlan: "pro",
      premiumFeature: "ElevenLabs voice profiles",
    },
    {
      id: "campaigns",
      label: t("creatorDashboard.nav.campaigns"),
      icon: Target,
      locked: !creatorCanUseActiveCampaigns,
      requiredPlan: "pro",
      premiumFeature: "Active Campaigns",
      badge: activeCampaigns.length,
    },
    {
      id: "jobs",
      label: t("jobs.title"),
      icon: Briefcase,
      locked: !creatorCanUseJobs,
      requiredPlan: "pro",
      premiumFeature: "Jobs",
      onClick: () => {
        navigate(createPageUrl("Jobs"));
      },
    },
    {
      id: "approvals",
      label: t("creatorDashboard.nav.approvals"),
      icon: CheckSquare,
      locked: !creatorCanUseBrandConnection,
      requiredPlan: "basic",
      premiumFeature: "Brand workflow approvals",
      badge: pendingCount,
      urgent: pendingCount > 0,
    },
    {
      id: "archive",
      label: t("creatorDashboard.nav.archive"),
      icon: Archive,
      locked: !creatorCanUseCampaignArchive,
      requiredPlan: "pro",
      premiumFeature: "Campaign Archives",
      badge: undefined,
    },
    {
      id: "contracts",
      label: t("creatorDashboard.nav.contracts"),
      icon: FileText,
      locked: !creatorCanUseBrandConnection,
      requiredPlan: "basic",
      premiumFeature: "Licenses & Contracts",
      badge:
        contracts.filter((c) => c.status === "expiring_soon").length > 0
          ? contracts.filter((c) => c.status === "expiring_soon").length
          : undefined,
    },
    {
      id: "earnings",
      label: t("creatorDashboard.nav.payouts"),
      icon: WalletIcon,
      locked: !creatorCanUsePayouts,
      requiredPlan: "basic",
      premiumFeature: "Payouts",
    },
    {
      id: "talent-portal",
      label: t("talentPortal.title"),
      icon: Briefcase,
      locked: !creatorCanUseTalentPortal,
      requiredPlan: "pro",
      disabled: creatorCanUseTalentPortal && !talentPortalEnabled,
      onClick: () => {
        if (!creatorCanUseTalentPortal) {
          navigate("/CreatorSubscribe");
          return;
        }
        if (!talentPortalEnabled) {
          toast({
            title: t("talentPortal.title"),
            description: t("talentPortal.disabledDescription"),
          });
          return;
        }
        setActiveSection("talent-portal");
      },
    },
    {
      id: "agency-connection",
      label: t("agencyConnections.title"),
      icon: LinkIcon,
      locked: !creatorCanUseAgencyConnection,
      requiredPlan: "basic",
      premiumFeature: "Agency Connection",
      badge:
        agencyInvites.filter((i) => i.status === "pending").length > 0
          ? agencyInvites.filter((i) => i.status === "pending").length
          : undefined,
    },
    {
      id: "brand-connection",
      label: t("brandConnections.title"),
      icon: LinkIcon,
      locked: !creatorCanUseBrandConnection,
      requiredPlan: "basic",
      premiumFeature: "Brand Connection",
      badge:
        totalBrandConnectionUnseen > 0 ? totalBrandConnectionUnseen : undefined,
    },
    {
      id: "settings",
      label: t("creatorDashboard.nav.settings"),
      icon: Settings,
    },
  ];

  const [contentTab, setContentTab] = useState("brand_content");
  const creatorJobsBackTo = `${createPageUrl("CreatorDashboard")}?section=jobs`;

  const renderJobInvitesCards = () => (
    <>
      {loadingJobInvites && (
        <p className="text-sm text-gray-600">{t("jobs.loadingInvites")}</p>
      )}
      {!loadingJobInvites && jobInvites.length === 0 && (
        <p className="text-sm text-gray-600">{t("jobs.noInvites")}</p>
      )}
      {!loadingJobInvites && jobInvites.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {jobInvites.map((job: any) => (
            <div
              key={String(job?.id || "")}
              className="rounded-xl border border-slate-200 bg-white p-4 space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-2xl text-gray-900 truncate">
                    {job?.job_title || t("jobs.inviteFallbackTitle")}
                  </div>
                  <div className="text-sm text-gray-600 truncate mt-1">
                    {resolveJobBrandName(job)}
                  </div>
                </div>
                <Badge className="bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                  {translateJobCallType(job?.call_type)}
                </Badge>
              </div>
              <div className="text-sm text-gray-600 lowercase">
                {[
                  job?.location
                    ? translateJobMetaValue(job.location, "location")
                    : "",
                  job?.job_type
                    ? translateJobMetaValue(job.job_type, "jobType")
                    : "",
                ]
                  .filter(Boolean)
                  .join("   ")}
              </div>
              <div className="flex items-center gap-2">
                {!(job?.accepted_creator_ids || []).includes(user?.id) ? (
                  <>
                    <Button
                      variant="outline"
                      className="border-gray-300"
                      onClick={() =>
                        navigate(
                          `${createPageUrl("Jobs")}?jobId=${encodeURIComponent(
                            String(job?.id || ""),
                          )}&backTo=${encodeURIComponent(creatorJobsBackTo)}`,
                        )
                      }
                    >
                      {t("jobs.viewJobDetails")}
                    </Button>
                    <Button
                      variant="outline"
                      className="bg-[#32C8D1] hover:bg-[#2AB8C1] text-white border-none"
                      onClick={() => {
                        setJobInviteConfirmId(String(job?.id || ""));
                        setJobInviteConfirmAction("accept");
                        setJobInviteConfirmOpen(true);
                      }}
                    >
                      {t("jobs.acceptInvite")}
                    </Button>
                    <Button
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => {
                        setJobInviteConfirmId(String(job?.id || ""));
                        setJobInviteConfirmAction("decline");
                        setJobInviteConfirmOpen(true);
                      }}
                    >
                      {t("jobs.declineInvite")}
                    </Button>
                  </>
                ) : (
                  <Button
                    className="bg-black text-white"
                    onClick={() =>
                      navigate(
                        `${createPageUrl("Jobs")}?jobId=${encodeURIComponent(
                          String(job?.id || ""),
                        )}&apply=true&backTo=${encodeURIComponent(creatorJobsBackTo)}`,
                      )
                    }
                  >
                    {t("jobs.apply")}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const renderJobsSection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">{t("jobs.title")}</h2>
        <p className="text-gray-600 mt-1">{t("jobs.subtitle")}</p>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 pb-4">
          <Button
            variant={jobsSubTab === "job_invites" ? "default" : "outline"}
            className={
              jobsSubTab === "job_invites"
                ? "bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
                : ""
            }
            onClick={() => setJobsSubTab("job_invites")}
          >
            {t("jobs.jobInvites")}
            {jobInvites.length > 0 ? (
              <Badge className="ml-2 bg-white/20 text-current border border-white/30">
                {jobInvites.length}
              </Badge>
            ) : null}
          </Button>
          <Button
            variant={jobsSubTab === "job_board" ? "default" : "outline"}
            className={
              jobsSubTab === "job_board"
                ? "bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
                : ""
            }
            onClick={() => {
              setJobsSubTab("job_board");
              navigate(
                `${createPageUrl("Jobs")}?backTo=${encodeURIComponent(creatorJobsBackTo)}`,
              );
            }}
          >
            {t("jobs.openJobBoard")}
          </Button>
        </div>

        <div className="mt-6">
          {jobsSubTab === "job_invites" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-gray-900">
                    {t("jobs.jobInvites")}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {t("jobs.jobInvitesDescription")}
                  </div>
                </div>
                <Badge className="bg-slate-100 text-slate-700 border border-slate-200">
                  {jobInvites.length}
                </Badge>
              </div>
              {renderJobInvitesCards()}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 flex flex-col gap-4">
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {t("jobs.browseBoardTitle")}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {t("jobs.browseBoardDescription")}
                </div>
              </div>
              <div>
                <Button
                  className="bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
                  onClick={() =>
                    navigate(
                      `${createPageUrl("Jobs")}?backTo=${encodeURIComponent(creatorJobsBackTo)}`,
                    )
                  }
                >
                  {t("jobs.openJobBoard")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  const renderContent = () => {
    const showingExamples = contentItems.length === 0;
    const itemsToShow = showingExamples ? exampleContentItems : contentItems;
    // For now, we don't have real detections state, so we assume empty if not showing examples
    const detectionsToShow = showingExamples ? exampleDetections : [];
    const detectionsCount = detectionsToShow.length;

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            {t("creatorDashboard.content.title")}
          </h2>
          <p className="text-gray-600 mt-1">
            {t("creatorDashboard.content.subtitle")}
          </p>
        </div>

        {showingExamples && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-blue-900 text-sm">
              {t("creatorDashboard.content.welcome.message")}
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex gap-6">
            <button
              onClick={() => setContentTab("brand_content")}
              className={`pb-3 border-b-2 font-medium flex items-center gap-2 ${
                contentTab === "brand_content"
                  ? "border-[#32C8D1] text-[#32C8D1]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t("creatorDashboard.content.tabs.brandContent")}
              <Badge className="bg-gray-100 text-gray-900 hover:bg-gray-200 ml-1">
                {itemsToShow.length}
              </Badge>
            </button>
          </div>
        </div>

        {contentTab === "brand_content" && (
          <>
            <div className="flex items-center gap-2 text-sm text-blue-800 bg-blue-50 p-3 rounded-lg border border-blue-100">
              <Eye className="h-4 w-4" />
              {t("creatorDashboard.content.brandContent.info")}
            </div>

            {itemsToShow.length > 0 ? (
              <div className="grid md:grid-cols-3 gap-6">
                {itemsToShow.map((item) => (
                  <Card
                    key={item.id}
                    className="overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="relative aspect-video bg-gray-100">
                      <img
                        src={item.thumbnail_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      {item.is_live && (
                        <Badge className="absolute top-3 right-3 bg-green-500 text-white border-none px-2 py-0.5 text-xs font-bold uppercase tracking-wide">
                          Live
                        </Badge>
                      )}
                      {item.brand_logo && (
                        <div className="absolute bottom-3 left-3 w-8 h-8 rounded-full bg-white p-1 shadow-sm">
                          <img
                            src={item.brand_logo}
                            alt={item.brand}
                            className="w-full h-full object-contain rounded-full"
                          />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-gray-900 text-base">
                            {item.brand}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {(item as any).titleKey
                              ? t(
                                  `creatorDashboard.content.examples.${(item as any).titleKey}`,
                                )
                              : item.title}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className="text-xs font-normal"
                        >
                          {item.platform}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">
                            {t("creatorDashboard.content.brandContent.views")}
                          </p>
                          <p className="font-bold text-gray-900 text-sm">
                            {item.views}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">
                            {t(
                              "creatorDashboard.content.brandContent.engagement",
                            )}
                          </p>
                          <p className="font-bold text-gray-900 text-sm">
                            {item.engagement}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                        {t("creatorDashboard.content.brandContent.published", {
                          date: new Date(item.published_at).toLocaleDateString(
                            i18n.language,
                          ),
                        })}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-500">
                  {t("creatorDashboard.content.brandContent.noContent")}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderTalentPortal = () => {
    return (
      <TalentPortal
        embedded
        initialTab="settings"
        initialSettingsTab="profile"
      />
    );
  };

  const renderPublicProfilePreview = () => {
    const fullName =
      creator.name ||
      profile?.full_name ||
      user?.user_metadata?.full_name ||
      user?.email?.split("@")[0] ||
      "";
    const location =
      creator.location ||
      [profile?.city, profile?.state].filter(Boolean).join(", ") ||
      "";
    const handles = [creator.instagram_handle, creator.tiktok_handle]
      .map((h: any) => (typeof h === "string" ? h.trim() : ""))
      .filter(Boolean)
      .join(" ");

    const data = {
      first_name: fullName,
      location,
      handles,
      followers: "0",
      bio: creator.bio || profile?.bio || "",
      active_campaigns: Array.isArray(activeCampaigns)
        ? activeCampaigns.length
        : 0,
      completed_projects: 0,
      voice_profiles: Array.isArray(voiceLibrary) ? voiceLibrary.length : 0,
      open_to_work: Array.isArray(creator.content_types)
        ? creator.content_types
        : [],
      industries: Array.isArray(creator.industries) ? creator.industries : [],
      base_rate:
        typeof creator.price_per_month === "number"
          ? creator.price_per_month
          : 0,
      portfolio_link:
        typeof creator.portfolio_url === "string" ? creator.portfolio_url : "",
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              {t("creatorDashboard.publicProfile.title")}
            </h2>
            <p className="text-gray-600 mt-1">
              {t("creatorDashboard.publicProfile.subtitle")}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowCardModal(true)}
              variant="outline"
              className="border-2 border-gray-300"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {t("creatorDashboard.publicProfile.viewCard")}
            </Button>
            <Button
              onClick={() => setActiveSection("settings")}
              className="bg-[#32C8D1] hover:bg-[#2bb0b8] text-white"
            >
              <Edit className="w-4 h-4 mr-2" />
              {t("creatorDashboard.publicProfile.editProfile")}
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden border-gray-200 bg-white shadow-sm w-full max-w-10xl">
          {/* Banner */}
          <div className="h-48 bg-[#32C8D1]"></div>
          <div className="px-6">
            {/* Header Section with Avatar */}
            <div className="relative flex justify-between items-start mb-6">
              <div className="flex items-end -mt-16 mb-4">
                <div className="relative">
                  <div
                    className="relative cursor-zoom-in hover:scale-105 transition-transform"
                    onClick={() => setShowPhotoFull(true)}
                  >
                    <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                      <AvatarImage
                        src={
                          profile?.profile_photo_url ||
                          creator.profile_photo ||
                          user?.user_metadata?.avatar_url
                        }
                      />
                      <AvatarFallback className="bg-[#32C8D1] text-white text-4xl">
                        {data.first_name && data.first_name[0] !== "["
                          ? data.first_name[0].toUpperCase()
                          : user?.email?.[0].toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                <div className="ml-6 mb-2">
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-3xl font-bold text-gray-900">
                      {data.first_name}
                    </h1>
                    {profile?.kyc_status === "approved" && (
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200 gap-1"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {t("creatorDashboard.publicProfile.verifiedUser")}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-gray-600 text-sm">
                    <span>{data.location}</span>
                    <span className="flex items-center gap-1">
                      <Badge
                        variant="secondary"
                        className="bg-pink-50 text-pink-700 hover:bg-pink-100 border-pink-200 text-xs"
                      >
                        {data.handles || "-"}
                      </Badge>
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {data.followers}{" "}
                      {t("creatorDashboard.publicProfile.followers")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bio */}
            <p className="text-gray-700 mb-8 max-w-3xl">{data.bio || "-"}</p>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {data.active_campaigns}
                </div>
                <div className="text-sm text-gray-500">
                  {t("creatorDashboard.publicProfile.activeCampaigns")}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {data.completed_projects}
                </div>
                <div className="text-sm text-gray-500">
                  {t("creatorDashboard.publicProfile.completedProjects")}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {data.voice_profiles}
                </div>
                <div className="text-sm text-gray-500">
                  {t("creatorDashboard.publicProfile.voiceProfiles")}
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-8 mb-8 border-t border-gray-100 pt-6">
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-3">
                  {t("creatorDashboard.publicProfile.openToWork")}
                </h3>
                {data.open_to_work.length ? (
                  <div className="flex flex-wrap gap-2">
                    {data.open_to_work.map((tag: string) => (
                      <Badge
                        key={tag}
                        variant="default"
                        className="bg-[#32C8D1] hover:bg-[#2bb0b8] text-white border-0 text-sm px-3 py-1"
                      >
                        {t(`common.contentTypes.${tag}`, { defaultValue: tag })}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    No content types selected yet.
                  </p>
                )}
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-3">
                  {t("creatorDashboard.publicProfile.industries")}
                </h3>
                {data.industries.length ? (
                  <div className="flex flex-wrap gap-2">
                    {data.industries.map((tag: string) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200 text-sm px-3 py-1"
                      >
                        {t(`common.industries.${tag}`, { defaultValue: tag })}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    No industries selected yet.
                  </p>
                )}
              </div>
            </div>

            {/* Licensing Rate */}
            <div className="bg-cyan-50 border border-cyan-100 rounded-lg p-6 mb-8 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 mb-1">
                  {t("creatorDashboard.publicProfile.licensingRate")}
                </h3>
                <p className="text-gray-600 text-sm mb-2">
                  {t("creatorDashboard.publicProfile.baseRateDescription")}
                </p>
                <div className="flex items-center gap-2 text-green-700 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  {t("creatorDashboard.publicProfile.openToNegotiations")}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-[#32C8D1]">
                  ${data.base_rate}
                </div>
                <div className="text-sm text-gray-500">
                  {t("creatorDashboard.publicProfile.perWeek")}
                </div>
              </div>
            </div>

            {/* Portfolio */}
            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-base font-semibold text-gray-900 mb-3">
                {t("creatorDashboard.publicProfile.portfolio")}
              </h3>
              {data.portfolio_link ? (
                <a
                  href={data.portfolio_link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-[#32C8D1] hover:underline"
                >
                  <LinkIcon className="h-4 w-4" />
                  {data.portfolio_link}
                </a>
              ) : (
                <p className="text-sm text-gray-500">
                  Add your portfolio link in Settings → Profile.
                </p>
              )}
            </div>

            {/* Social Links */}
            <div className="flex gap-3 mt-8">
              <Button variant="outline" className="gap-2">
                <Instagram className="h-4 w-4" />
                Instagram
              </Button>
              <Button variant="outline" className="gap-2">
                <Video className="h-4 w-4" />
                TikTok
              </Button>
            </div>

            <div className="mt-8 -mx-6 border-t border-blue-100 bg-blue-50 px-6 py-4 flex gap-3 items-start">
              <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-blue-900 text-sm">
                {t("creatorDashboard.publicProfile.previewNote")}
              </p>
            </div>
          </div>
        </Card>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3 items-start max-w-10xl">
          <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-blue-900 text-sm">
            {t("creatorDashboard.publicProfile.previewNote")}
          </p>
        </div>

        {/* Card Modal Overlay */}
        {showCardModal && (
          <div
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setShowCardModal(false)}
          >
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-[90vw] sm:max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Card Header */}
              <div className="h-32 bg-[#32C8D1] flex items-center justify-center">
                <Avatar className="h-20 w-20 border-4 border-white shadow-sm">
                  <AvatarImage
                    src={
                      creator.profile_photo || user?.user_metadata?.avatar_url
                    }
                  />
                  <AvatarFallback className="bg-white/20 text-white text-4xl">
                    {data.first_name && data.first_name[0] !== "["
                      ? data.first_name[0].toUpperCase()
                      : user?.email?.[0].toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Card Content */}
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-gray-900">
                    {data.first_name}
                  </h3>

                  {profile?.kyc_status === "approved" && (
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-700 border-green-200 text-[10px]"
                    >
                      {t("creatorDashboard.publicProfile.verifiedCreator")}
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-gray-500 mb-4">{data.location}</p>

                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {data.bio}
                </p>

                <div className="flex gap-2 mb-6">
                  <Badge
                    variant="outline"
                    className="rounded-full px-3 py-1 text-xs font-normal border-gray-300 text-gray-600"
                  >
                    Fashion
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full px-3 py-1 text-xs font-normal border-gray-300 text-gray-600"
                  >
                    Tech
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-6">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">
                      {t("creatorDashboard.publicProfile.followers")}
                    </p>
                    <p className="font-bold text-gray-900">{data.followers}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">
                      {t("creatorDashboard.publicProfile.engagement")}
                    </p>
                    <p className="font-bold text-gray-900">4.2%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">
                      {t("creatorDashboard.publicProfile.turnaround")}
                    </p>
                    <p className="font-bold text-gray-900">12h</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">
                      {t("creatorDashboard.publicProfile.from")}
                    </p>
                    <p className="font-bold text-gray-900">${data.base_rate}</p>
                  </div>
                </div>

                <Button className="w-full bg-black hover:bg-gray-800 text-white mb-3 rounded-full">
                  {t("creatorDashboard.publicProfile.hireCreator")}
                </Button>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="rounded-full border-gray-200"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {t("creatorDashboard.publicProfile.preview")}
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full border-gray-200"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {t("creatorDashboard.publicProfile.profile")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleDeletePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  // ...

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!user?.id) {
        toast({
          variant: "destructive",
          title: t("creatorDashboard.toasts.authRequiredTitle"),
          description: t("creatorDashboard.toasts.authRequiredPhotoDesc"),
        });
        return;
      }

      if (file.size > 20_000_000) {
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: "Please upload an image of 20 MB or less.",
        });
        return;
      }
      setUploadingPhoto(true);

      // Optimistic update: Show local preview immediately
      const objectUrl = URL.createObjectURL(file);
      setCreator((prev) => ({
        ...prev,
        profile_photo: objectUrl,
      }));

      try {
        const buf = await file.arrayBuffer();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          throw new Error("Missing auth session. Please sign in again.");
        }
        const res = await fetch(
          api(
            `/api/profile/photo-upload?user_id=${encodeURIComponent(user.id)}`,
          ),
          {
            method: "POST",
            headers: {
              "content-type": file.type || "image/jpeg",
              Authorization: `Bearer ${token}`,
            },
            body: new Uint8Array(buf),
            cache: "no-cache",
          },
        );
        if (!res.ok) {
          throw new Error(await res.text());
        }
        const json = await res.json();

        // Use the public_url directly from the upload response
        // Backend generates unique filename with UUID, so no cache issues
        const newPhotoUrl = json.public_url;

        setCreator((prev) => ({
          ...prev,
          profile_photo: newPhotoUrl,
        }));

        await refreshProfile();
        toast({
          title: t("creatorDashboard.toasts.profilePhotoUpdated"),
        });
      } catch (err: any) {
        console.error("Profile photo upload error:", err);
        toast({
          variant: "destructive",
          title: t("common.error"),
          description: parseErrorMessage(err, t),
        });
        // Revert optimistic update on error by refreshing dashboard
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          const token = session?.access_token;
          const profileRes = await fetch(
            api(`/api/dashboard?user_id=${encodeURIComponent(user.id)}`),
            {
              cache: "no-cache",
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            },
          );
          if (profileRes.ok) {
            const profileJson = await profileRes.json();
            const profile = profileJson.profile || {};
            setCreator((prev) => ({
              ...prev,
              profile_photo: profile.profile_photo_url,
            }));
          }
        } catch (revertErr) {
          console.error("Failed to revert profile photo:", revertErr);
        }
      } finally {
        setUploadingPhoto(false);
      }
    }
  };

  // Recording functions
  const startRecording = async () => {
    // Start countdown first
    setIsCountingDown(true);
    setCountdown(3);

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setIsCountingDown(false);
          // Actually start the recording logic
          proceedWithRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const proceedWithRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 44100,
        } as any,
      });

      if (typeof window === "undefined" || !("MediaRecorder" in window)) {
        throw new Error(
          "MediaRecorder is not supported on this device/browser",
        );
      }

      // Pick the best supported audio MIME type for the current browser (mobile-friendly)
      const pickSupportedMime = () => {
        const candidates = [
          "audio/mp4;codecs=mp4a.40.2",
          "audio/mp4",
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/ogg;codecs=opus",
          "audio/ogg",
        ];
        for (const mt of candidates) {
          try {
            if ((window as any).MediaRecorder?.isTypeSupported?.(mt)) {
              return mt;
            }
          } catch (_) {
            // ignore and try next
          }
        }
        return ""; // let browser choose
      };

      const chosenMime = pickSupportedMime();
      const options: MediaRecorderOptions = chosenMime
        ? { mimeType: chosenMime }
        : {};

      // Safely construct MediaRecorder; if options cause an error, retry without options
      try {
        mediaRecorderRef.current = new MediaRecorder(stream, options);
      } catch (_) {
        mediaRecorderRef.current = new MediaRecorder(stream);
      }
      audioChunksRef.current = [];
      dataChunkCountRef.current = 0;

      mediaRecorderRef.current.ondataavailable = (event) => {
        // Some mobile browsers may emit empty chunks; ignore those
        if (event?.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          dataChunkCountRef.current += 1;
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const finalize = async () => {
          if (!audioChunksRef.current || audioChunksRef.current.length === 0) {
            console.warn(
              "Recording stopped but no audio chunks were captured (after wait).",
            );
            toast({
              variant: "destructive",
              title: t(
                "creatorDashboard.toasts.micNoDataTitle",
                "No audio data received",
              ),
              description: t(
                "creatorDashboard.toasts.micNoDataDesc",
                "Your browser did not deliver audio data. Please ensure microphone access is granted and try again.",
              ),
            });
            // Cleanup tracks
            stream.getTracks().forEach((track) => track.stop());
            setIsRecording(false);
            clearInterval(timerRef.current);
            return;
          }

          const mimeType =
            mediaRecorderRef.current?.mimeType || chosenMime || "audio/webm";
          const audioBlob = new Blob(audioChunksRef.current, {
            type: mimeType,
          });
          const audioUrl = URL.createObjectURL(audioBlob);

          const tempId = Date.now();
          const newRecording = {
            id: tempId,
            emotion: selectedEmotion,
            url: audioUrl,
            blob: audioBlob,
            mimeType: mimeType,
            duration: recordingTime,
            date: new Date().toISOString(),
            accessible: true,
            voiceProfileCreated: false,
            usageCount: 0,
          };

          setVoiceLibrary((prev) => [...prev, newRecording]);
          setShowRecordingModal(false);
          setRecordingTime(0);
          setCurrentWord(0);

          stream.getTracks().forEach((track) => track.stop());

          // Persist to backend so it remains after refresh
          try {
            const {
              data: { session },
            } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token)
              throw new Error("Missing auth session. Please sign in again.");

            const uploadRes = await fetch(
              api(
                `/voice/recordings?emotion_tag=${encodeURIComponent(selectedEmotion || "")}`,
              ),
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "content-type": mimeType || "audio/webm",
                },
                body: audioBlob,
              },
            );
            if (!uploadRes.ok) {
              const txt = await uploadRes.text();
              throw new Error(txt || `Upload failed (${uploadRes.status})`);
            }
            const uploaded = await uploadRes.json();
            const serverId = uploaded?.id;
            if (!serverId) throw new Error("Missing recording id after upload");

            const signed = await base44.get<any>(
              `/voice/recordings/signed-url`,
              {
                params: { recording_id: serverId, expires_sec: 600 },
              } as any,
            );

            setVoiceLibrary((prev) =>
              prev.map((r) =>
                r.id === tempId
                  ? {
                      ...r,
                      id: serverId,
                      server_recording_id: serverId,
                      url: signed?.url || r.url,
                      blob: null,
                    }
                  : r,
              ),
            );
          } catch (e: any) {
            toast({
              variant: "destructive",
              title: t("creatorDashboard.toasts.voiceErrorTitle"),
              description:
                e?.message ||
                "Failed to save recording. It may disappear after refresh.",
            });
          }
        };

        // If no chunks yet, some browsers emit the final chunk just after stop
        if (!audioChunksRef.current || audioChunksRef.current.length === 0) {
          setTimeout(() => {
            void finalize();
          }, 150);
        } else {
          void finalize();
        }
      };

      mediaRecorderRef.current.onerror = (e: any) => {
        console.error("MediaRecorder error:", e?.error || e);
      };

      mediaRecorderRef.current.onstart = () => {
        setIsRecording(true);
      };

      // Mark recording active immediately (some browsers delay onstart)
      setIsRecording(true);
      // On some mobile browsers, a shorter timeslice improves data flow
      mediaRecorderRef.current.start(250);

      // Diagnostics: if no chunks after 2s, notify for debugging
      setTimeout(() => {
        if (isRecording && dataChunkCountRef.current === 0) {
          console.warn(
            "No audio chunks received after 2s; device/browser may not be emitting data.",
          );
          toast({
            variant: "destructive",
            title: t(
              "creatorDashboard.toasts.micNoDataTitle",
              "No audio data received",
            ),
            description: t(
              "creatorDashboard.toasts.micNoDataDesc",
              "Your browser did not deliver audio data. Please ensure microphone access is granted and try again.",
            ),
          });
        }
      }, 2000);

      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRecordingTime(elapsed);

        // Safely update word progress; avoid crashes if script is missing
        try {
          const script = selectedEmotion ? VOICE_SCRIPTS[selectedEmotion] : "";
          if (typeof script === "string" && script.length > 0) {
            const words = script.split(" ");
            const wordsPerSecond = words.length / 60;
            const wordIndex = Math.min(
              Math.floor(elapsed * wordsPerSecond),
              Math.max(words.length - 1, 0),
            );
            setCurrentWord(wordIndex);
          } else {
            setCurrentWord(0);
          }
        } catch {
          setCurrentWord(0);
        }

        if (elapsed >= 60) {
          stopRecording();
        }
      }, 100);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        variant: "destructive",
        title: t("creatorDashboard.toasts.micErrorTitle"),
        description: t("creatorDashboard.toasts.micErrorDesc"),
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const handleEmotionSelect = (emotion) => {
    setSelectedEmotion(emotion);
    setShowRecordingModal(true);
    setRecordingTime(0);
    setCurrentWord(0);
  };

  const toggleRecordingAccess = (id) => {
    setVoiceLibrary(
      voiceLibrary.map((rec) =>
        rec.id === id ? { ...rec, accessible: !rec.accessible } : rec,
      ),
    );
  };

  const DeleteVoiceRecordingToastAction = ({
    uiId,
    serverId,
    dismiss,
  }: {
    uiId: any;
    serverId: any;
    dismiss: () => void;
  }) => {
    const [isDeleting, setIsDeleting] = useState(false);

    return (
      <ToastAction
        altText={t(
          "creatorDashboard.voice.deleteConfirmation.action",
          "Delete",
        )}
        disabled={isDeleting}
        className={
          "border-white/40 bg-white/10 text-white font-semibold shadow-sm " +
          "hover:bg-white/15 active:bg-white/20 focus-visible:ring-white/70"
        }
        onClick={async () => {
          try {
            if (!serverId) {
              toast({
                title: t(
                  "creatorDashboard.voice.deleteFailedTitle",
                  "Delete failed",
                ),
                description: t(
                  "creatorDashboard.voice.deleteFailedDesc",
                  "Missing recording id.",
                ),
                variant: "destructive",
              });
              return;
            }

            if (isDeleting) return;
            setIsDeleting(true);

            await base44.delete(
              `/voice/recordings/${encodeURIComponent(String(serverId))}`,
            );
            setVoiceLibrary((prev) =>
              prev.filter(
                (r) =>
                  r.id !== uiId &&
                  String(r?.server_recording_id || r?.id) !== String(serverId),
              ),
            );
            dismiss();
          } catch (err: any) {
            const msg =
              typeof err?.message === "string"
                ? err.message
                : t(
                    "creatorDashboard.voice.deleteFailedDesc",
                    "Failed to delete recording.",
                  );
            toast({
              title: t(
                "creatorDashboard.voice.deleteFailedTitle",
                "Delete failed",
              ),
              description: msg,
              variant: "destructive",
            });
          } finally {
            setIsDeleting(false);
          }
        }}
      >
        {isDeleting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Deleting…
          </>
        ) : (
          t("creatorDashboard.voice.deleteConfirmation.action", "Delete")
        )}
      </ToastAction>
    );
  };

  const deleteRecording = async (id) => {
    const rec = voiceLibrary.find((r) => r.id === id);
    const sid = rec?.server_recording_id || rec?.id;

    // Create the toast first, then attach an action using `update`.
    // This avoids a TDZ crash when passing `dismiss` into the JSX before it's initialized.
    const tinst = toast({
      title: t(
        "creatorDashboard.voice.deleteConfirmation.title",
        "Delete Recording?",
      ),
      description: t(
        "creatorDashboard.voice.deleteConfirmation.description",
        "This action cannot be undone.",
      ),
      variant: "destructive",
    });

    tinst.update({
      action: (
        <DeleteVoiceRecordingToastAction
          uiId={id}
          serverId={sid}
          dismiss={tinst.dismiss}
        />
      ),
    });
  };

  const createVoiceProfile = async (recording) => {
    try {
      const genId = recording?.server_recording_id ?? recording?.id;
      if (generatingVoiceId && generatingVoiceId !== genId) return;
      setGeneratingVoiceId(genId);

      const ct = recording?.mimeType || recording?.blob?.type || "audio/webm";

      // 1) Use existing persisted recording if available, otherwise upload it
      let recordingId = recording?.server_recording_id;
      if (!recordingId) {
        if (!recording?.blob) {
          throw new Error(
            "Recording audio is not available. Please re-record and try again.",
          );
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          throw new Error("Missing auth session. Please sign in again.");
        }

        const uploadRes = await fetch(
          api(
            `/voice/recordings?emotion_tag=${encodeURIComponent(recording.emotion || "")}`,
          ),
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "content-type": ct,
            },
            body: recording.blob,
          },
        );
        if (!uploadRes.ok) {
          const txt = await uploadRes.text();
          throw new Error(`Upload failed: ${txt}`);
        }
        const uploaded = await uploadRes.json(); // { id, storage_bucket, storage_path }
        recordingId = uploaded?.id;
        if (!recordingId) throw new Error("Missing recording id after upload");
      }

      // 2) Create ElevenLabs clone via Likelee server
      const cloned = await base44.post(`/voice/models/clone`, {
        user_id: user.id,
        recording_id: recordingId,
        voice_name: `${creator.name}_${recording.emotion}`,
        description: `${recording.emotion} voice profile for ${creator.name}`,
      });

      setVoiceLibrary(
        voiceLibrary.map((rec) =>
          rec.id === recording.id
            ? {
                ...rec,
                voiceProfileCreated: true,
                voice_id: cloned.voice_id,
                server_recording_id: recordingId,
              }
            : rec,
        ),
      );

      toast({
        title: t("creatorDashboard.toasts.voiceSuccessTitle"),
        description: t("creatorDashboard.toasts.voiceSuccessDesc"),
      });
    } catch (error) {
      console.error("Voice profile creation error:", error);

      let errorMessage = "Failed to create voice profile";
      if (error.response?.data) {
        errorMessage =
          error.response.data.details ||
          error.response.data.error ||
          errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        variant: "destructive",
        title: t("creatorDashboard.toasts.voiceErrorTitle"),
        description: t("creatorDashboard.toasts.voiceErrorDesc", {
          error: errorMessage,
        }),
      });
    } finally {
      setGeneratingVoiceId(null);
    }
  };

  const renderScript = () => {
    if (!selectedEmotion) return null;

    const script = VOICE_SCRIPTS[selectedEmotion];
    const words = script.split(" ");

    return (
      <div className="text-center py-8 px-6 max-h-96 overflow-hidden">
        <div className="text-2xl leading-relaxed">
          {words.map((word, index) => (
            <span
              key={index}
              className={`inline-block mx-1 transition-all duration-300 ${
                index === currentWord
                  ? "text-[#32C8D1] font-bold scale-110"
                  : index < currentWord
                    ? "text-gray-400"
                    : "text-gray-700"
              }`}
            >
              {word}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const handlePauseLicense = (contract, immediate) => {
    const option = immediate ? "immediate" : "next_month";
    setPauseOption(option);
    setShowPauseModal(false);
    toast({
      title: t("creatorDashboard.toasts.licensePausedTitle"),
      description:
        option === "immediate"
          ? t("creatorDashboard.toasts.licensePausedImmediate")
          : t("creatorDashboard.toasts.licensePausedNextMonth"),
    });
  };

  const handleRevokeLicense = (contract) => {
    setShowRevokeModal(false);
    toast({
      title: t("creatorDashboard.toasts.licenseRevokedTitle"),
      description: t("creatorDashboard.toasts.licenseRevokedDesc", {
        amount: contract.creator_earnings,
      }),
    });
  };

  const handlePauseCampaign = (campaignId) => {
    setActiveCampaigns(
      activeCampaigns.map((c) =>
        c.id === campaignId ? { ...c, status: "paused" } : c,
      ),
    );
    toast({
      title: t("creatorDashboard.toasts.campaignPaused"),
    });
  };

  const handleRevokeCampaign = (campaignId) => {
    if (confirm("Are you sure you want to revoke this campaign license?")) {
      setActiveCampaigns(activeCampaigns.filter((c) => c.id !== campaignId));
      toast({
        title: t("creatorDashboard.toasts.campaignRevoked"),
      });
    }
  };

  const handleToggleContentType = (type) => {
    const current = creator.content_types || [];
    // Filter out the known typo before processing
    const cleaned_current = current.filter(
      (t) => t !== "Social-medial ads" && t !== "Social-media ads",
    );

    if (cleaned_current.includes(type)) {
      setCreator({
        ...creator,
        content_types: cleaned_current.filter((t) => t !== type),
      });
    } else {
      const combinedCount = new Set([
        ...(cleaned_current || []),
        ...(creator.industries || []),
      ]).size;
      if (
        creatorPlanTier !== "pro" &&
        creatorPlanTier !== "enterprise" &&
        combinedCount >= creatorCategoryLimit
      ) {
        toast({
          variant: "destructive",
          title: "Category limit reached",
          description: `Basic creators can select up to ${creatorCategoryLimit} combined categories.`,
        });
        return;
      }
      setCreator({ ...creator, content_types: [...cleaned_current, type] });
    }
  };

  const handleToggleIndustry = (industry) => {
    const current = creator.industries || [];
    if (current.includes(industry)) {
      setCreator({
        ...creator,
        industries: current.filter((i) => i !== industry),
      });
    } else {
      const combinedCount = new Set([
        ...(creator.content_types || []),
        ...(current || []),
      ]).size;
      if (
        creatorPlanTier !== "pro" &&
        creatorPlanTier !== "enterprise" &&
        combinedCount >= creatorCategoryLimit
      ) {
        toast({
          variant: "destructive",
          title: "Category limit reached",
          description: `Basic creators can select up to ${creatorCategoryLimit} combined categories.`,
        });
        return;
      }
      setCreator({ ...creator, industries: [...current, industry] });
    }
  };

  const handleToggleVibe = (vibe) => {
    const current = creator.vibes || [];
    if (current.includes(vibe)) {
      setCreator({
        ...creator,
        vibes: current.filter((v) => v !== vibe),
      });
    } else {
      setCreator({ ...creator, vibes: [...current, vibe] });
    }
  };

  const handleSaveRules = async (
    customToast?: any,
    overrides?: Partial<typeof creator>,
  ) => {
    if (!user) return;

    // Robust safeguard for React event objects being passed to toast
    const toastTitle =
      typeof customToast === "string"
        ? customToast
        : t("creatorDashboard.toasts.profileSaved");

    const rawTiktok =
      typeof creator.tiktok_handle === "string"
        ? creator.tiktok_handle.trim()
        : "";
    const normalizedTiktok =
      rawTiktok.length > 0 && !rawTiktok.startsWith("@")
        ? `@${rawTiktok}`
        : rawTiktok;
    const normalizedPortfolio =
      typeof creator.portfolio_url === "string"
        ? creator.portfolio_url.trim()
        : "";
    const parseOptionalInt = (raw: unknown): number | undefined => {
      if (raw === null || raw === undefined) return undefined;
      const text = String(raw).trim();
      if (!text) return undefined;
      const value = Number.parseInt(text, 10);
      return Number.isFinite(value) ? value : undefined;
    };
    const parseOptionalFloat = (raw: unknown): number | undefined => {
      if (raw === null || raw === undefined) return undefined;
      const text = String(raw).trim();
      if (!text) return undefined;
      const value = Number.parseFloat(text);
      return Number.isFinite(value) ? value : undefined;
    };
    const nextRate =
      overrides?.price_per_month ?? creator.price_per_month ?? undefined;
    const prevRate = baseRateRef.current;
    const rateChanged =
      typeof nextRate === "number"
        ? typeof prevRate === "number"
          ? nextRate !== prevRate
          : nextRate > 0
        : false;
    const hasPositiveMonthlyRate =
      typeof nextRate === "number" && Number.isFinite(nextRate) && nextRate > 0;

    // Only send fields that exist in the profiles table
    // Apply overrides if provided (e.g. for immediate toggle updates)
    const profileData = {
      email: creator.email || user.email,
      full_name:
        creator.name || profile?.full_name || user?.user_metadata?.full_name,
      bio: creator.bio,
      city: creator.location?.split(",")[0]?.trim(),
      state: creator.location?.split(",")[1]?.trim(),
      base_monthly_price_cents: hasPositiveMonthlyRate
        ? Math.round(nextRate * 100)
        : undefined,
      base_weekly_price_cents: hasPositiveMonthlyRate
        ? Math.round((nextRate / 4.345) * 100)
        : undefined,
      pricing_updated_at:
        hasPositiveMonthlyRate && rateChanged
          ? new Date().toISOString()
          : undefined,
      birthdate:
        typeof creator.birthday === "string" && creator.birthday.trim().length
          ? creator.birthday.trim()
          : undefined,
      gender:
        typeof creator.gender === "string" && creator.gender.trim().length
          ? creator.gender.trim()
          : undefined,
      ethnicity:
        typeof creator.ethnicity === "string" && creator.ethnicity.trim().length
          ? creator.ethnicity.trim()
          : undefined,
      creator_type:
        typeof creator.creator_type === "string" &&
        creator.creator_type.trim().length
          ? creator.creator_type.trim()
          : undefined,
      race:
        typeof creator.race === "string" && creator.race.trim().length
          ? creator.race.trim()
          : undefined,
      hair_color:
        typeof creator.hair_color === "string" &&
        creator.hair_color.trim().length
          ? creator.hair_color.trim()
          : undefined,
      eye_color:
        typeof creator.eye_color === "string" && creator.eye_color.trim().length
          ? creator.eye_color.trim()
          : undefined,
      height_cm: parseOptionalInt(creator.height_cm),
      platform_handle: creator.instagram_handle?.replace("@", ""),
      tiktok_handle: normalizedTiktok,
      portfolio_link: normalizedPortfolio,
      accept_negotiations:
        overrides?.accept_negotiations ?? creator.accept_negotiations,
      content_restrictions:
        overrides?.content_restrictions ?? creator.content_restrictions,
      brand_exclusivity:
        overrides?.brand_exclusivity ?? creator.brand_exclusivity,
      public_profile_visible:
        overrides?.is_public_brands ?? creator.is_public_brands ?? true,
      visibility:
        (overrides?.is_public_brands ?? creator.is_public_brands ?? true)
          ? "brands"
          : "private",
      content_types: overrides?.content_types ?? creator.content_types,
      industries: overrides?.industries ?? creator.industries,
      vibes: overrides?.vibes ?? creator.vibes,
    };

    try {
      const session = (await supabase.auth.getSession())?.data?.session;
      const res = await fetch(api(`/api/profile?user_id=${user.id}`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(profileData),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Save failed:", errorText);
        throw new Error(`Server error: ${errorText}`);
      }

      const responseData = await res.json();

      // Update creator state with the saved data from the response
      if (Array.isArray(responseData) && responseData.length > 0) {
        const savedProfile = responseData[0];
        const savedMonthlyRate =
          typeof savedProfile.base_monthly_price_cents === "number"
            ? Math.round(savedProfile.base_monthly_price_cents / 100)
            : typeof savedProfile.base_weekly_price_cents === "number"
              ? Math.round((savedProfile.base_weekly_price_cents / 100) * 4.345)
              : creator.price_per_month || 0;
        setCreator((prev) => ({
          ...prev,
          name: savedProfile.full_name || prev.name,
          bio: savedProfile.bio ?? prev.bio,
          location:
            [savedProfile.city, savedProfile.state]
              .filter(Boolean)
              .join(", ") || prev.location,
          birthday: savedProfile.birthdate ?? prev.birthday,
          gender: savedProfile.gender ?? prev.gender,
          ethnicity: savedProfile.ethnicity ?? prev.ethnicity,
          creator_type: savedProfile.creator_type ?? prev.creator_type,
          race: savedProfile.race ?? prev.race,
          hair_color: savedProfile.hair_color ?? prev.hair_color,
          eye_color: savedProfile.eye_color ?? prev.eye_color,
          height_cm:
            typeof savedProfile.height_cm === "number"
              ? String(savedProfile.height_cm)
              : prev.height_cm,
          tiktok_handle: savedProfile.tiktok_handle ?? prev.tiktok_handle,
          portfolio_url: savedProfile.portfolio_link ?? prev.portfolio_url,
          content_types: savedProfile.content_types ?? prev.content_types,
          industries: savedProfile.industries ?? prev.industries,
          vibes: savedProfile.vibes ?? prev.vibes,
          content_restrictions:
            savedProfile.content_restrictions ?? prev.content_restrictions,
          brand_exclusivity:
            savedProfile.brand_exclusivity ?? prev.brand_exclusivity,
          accept_negotiations:
            savedProfile.accept_negotiations ?? prev.accept_negotiations,
          is_public_brands: resolvePublicBrandsVisibility(savedProfile),
          price_per_month: savedMonthlyRate,
        }));
        if (typeof savedMonthlyRate === "number") {
          baseRateRef.current = savedMonthlyRate;
        }
      }

      setEditingRules(false);
      toast({
        title: toastTitle,
      });
    } catch (error: any) {
      console.error("Failed to save rules:", error);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: parseErrorMessage(error, t),
      });
    }
  };

  const handleSaveProfile = async () => {
    if (savingProfile) return;
    setSavingProfile(true);
    try {
      await handleSaveRules(t("creatorDashboard.toasts.profileSaved"));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveSocialLinks = async () => {
    if (savingSocialLinks) return;
    setSavingSocialLinks(true);
    try {
      await handleSaveRules(t("creatorDashboard.toasts.profileSaved"));
    } finally {
      setSavingSocialLinks(false);
    }
  };

  const renderMarketplaceVerificationBar = () => {
    if (!creatorCanUseKyc) {
      return (
        <div className="rounded-2xl bg-gradient-to-r from-[#F7FBFF] via-[#EFF7FF] to-[#FFF8EF] px-4 py-3 shadow-sm ring-1 ring-[#D9E7F5] sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/90 shadow-sm ring-1 ring-black/5">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">
                    Upgrade to Basic to start KYC
                  </p>
                  <Badge className="rounded-full border-0 bg-white/90 px-2.5 py-0.5 text-[11px] font-medium text-gray-700 shadow-sm">
                    Basic required
                  </Badge>
                </div>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  Without Basic and approved KYC, your creator profile cannot be
                  visible in the marketplace or managed by brands and agencies.
                </p>
              </div>
            </div>
            <Button
              disabled={portalLoading}
              onClick={() => {
                if (trialActive || creatorPlanTier !== "free") {
                  handleManageSubscription();
                } else {
                  navigate("/CreatorSubscribe");
                }
              }}
              className="h-10 rounded-full bg-[#0F172A] px-4 text-white hover:bg-black disabled:opacity-70"
            >
              {portalLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Crown className="mr-2 h-4 w-4" />
              )}
              {portalLoading ? "Processing..." : "Upgrade plan"}
            </Button>
          </div>
        </div>
      );
    }

    const currentKycStatus = creator?.kyc_status ?? profile?.kyc_status;
    const currentKycReason = formatKycReason(
      creator?.kyc_rejection_reason ?? profile?.kyc_rejection_reason,
    );
    const normalizedStatus = String(currentKycStatus || "")
      .trim()
      .toLowerCase();
    if (normalizedStatus === "approved") return null;

    const isPending = normalizedStatus === "pending";
    const isRejected =
      normalizedStatus === "rejected" || normalizedStatus === "declined";
    const hasPendingFollowUp = isPending && currentKycReason.length > 0;
    const BannerIcon =
      hasPendingFollowUp || isRejected ? ShieldAlert : isPending ? Clock : Lock;
    const bannerClassName =
      hasPendingFollowUp || isRejected
        ? "mb-6 rounded-2xl bg-gradient-to-r from-rose-50 via-white to-amber-50 px-4 py-3 shadow-sm ring-1 ring-rose-100 sm:px-5"
        : "mb-6 rounded-2xl bg-gradient-to-r from-white via-[#F3FBFC] to-[#FFF7ED] px-4 py-3 shadow-sm ring-1 ring-black/5 sm:px-5";

    const title = hasPendingFollowUp
      ? t(
          "creatorDashboard.marketplaceVerification.followUpTitle",
          "Continue verification to finish approval",
        )
      : isPending
        ? t(
            "creatorDashboard.marketplaceVerification.pendingTitle",
            "Verification in review",
          )
        : isRejected
          ? t(
              "creatorDashboard.marketplaceVerification.rejectedTitle",
              "Verification was not approved",
            )
          : t(
              "creatorDashboard.marketplaceVerification.title",
              "Verify to unlock marketplace visibility",
            );
    const description = hasPendingFollowUp
      ? t(
          "creatorDashboard.marketplaceVerification.followUpDescription",
          "Veriff requested one more step before approval. Complete it below so your profile can appear to brands and agencies in marketplace discovery.",
        )
      : isPending
        ? t(
            "creatorDashboard.marketplaceVerification.pendingDescription",
            savedKycSessionUrl
              ? "Closed the verification window? Resume it anytime below. Once approved, your profile can appear to brands and agencies in marketplace discovery."
              : "Your identity check is processing. If the last verification link expired, start a new session below. Once approved, your profile can appear to brands and agencies in marketplace discovery.",
          )
        : isRejected
          ? t(
              "creatorDashboard.marketplaceVerification.rejectedDescription",
              "Your last verification was not approved. Review the reason below and retry so your profile can appear to brands and agencies in marketplace discovery.",
            )
          : t(
              "creatorDashboard.marketplaceVerification.description",
              "Complete identity verification so brands and agencies can discover your profile in the marketplace.",
            );
    const statusLabel = hasPendingFollowUp
      ? t(
          "creatorDashboard.marketplaceVerification.followUpBadge",
          "Action needed",
        )
      : isPending
        ? t("creatorDashboard.verificationStatus.pending", "Pending")
        : isRejected
          ? t("creatorDashboard.verificationStatus.rejected", "Rejected")
          : t(
              "creatorDashboard.marketplaceVerification.notVerified",
              "Not verified",
            );
    const primaryButtonLabel = isPending
      ? savedKycSessionUrl
        ? t(
            hasPendingFollowUp
              ? "creatorDashboard.marketplaceVerification.continueCta"
              : "creatorDashboard.marketplaceVerification.resumeCta",
            hasPendingFollowUp
              ? "Continue verification"
              : "Resume verification",
          )
        : t(
            "creatorDashboard.marketplaceVerification.restartCta",
            "Start new verification",
          )
      : isRejected
        ? t(
            "creatorDashboard.marketplaceVerification.retryCta",
            "Retry verification",
          )
        : t("creatorDashboard.marketplaceVerification.cta", "Verify now");

    return (
      <div className={bannerClassName}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/90 shadow-sm ring-1 ring-black/5">
              <BannerIcon
                className={`h-5 w-5 ${
                  hasPendingFollowUp || isRejected
                    ? "text-rose-600"
                    : isPending
                      ? "text-amber-600"
                      : "text-[#32C8D1]"
                }`}
              />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-gray-900">{title}</p>
                <Badge className="rounded-full border-0 bg-white/90 px-2.5 py-0.5 text-[11px] font-medium text-gray-700 shadow-sm">
                  {statusLabel}
                </Badge>
              </div>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                {description}
              </p>
              {(hasPendingFollowUp || isRejected) && currentKycReason && (
                <div className="mt-2 max-w-2xl rounded-2xl bg-white/90 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-100">
                  <span className="font-semibold">
                    {hasPendingFollowUp
                      ? t(
                          "creatorDashboard.marketplaceVerification.followUpReasonLabel",
                          "Veriff note:",
                        )
                      : t(
                          "creatorDashboard.marketplaceVerification.rejectedReasonLabel",
                          "Reason:",
                        )}
                  </span>{" "}
                  {currentKycReason}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {isPending && (
              <Button
                onClick={() => refreshVerificationFromDashboard()}
                disabled={kycLoading || kycStatusRefreshing}
                variant="outline"
                className="h-10 rounded-full border-gray-200 bg-white/90 px-4 text-gray-700 shadow-sm hover:bg-white"
              >
                {kycStatusRefreshing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {t(
                  "creatorDashboard.marketplaceVerification.refreshCta",
                  "Refresh status",
                )}
              </Button>
            )}
            <Button
              onClick={startVerificationFromDashboard}
              disabled={kycLoading || kycStatusRefreshing}
              className="h-10 rounded-full bg-[#0F172A] px-4 text-white hover:bg-black"
            >
              {kycLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Shield className="mr-2 h-4 w-4" />
              )}
              {primaryButtonLabel}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderPlanStatusBar = () => {
    if (
      activeSection === "settings" ||
      activeSection === "talent-portal" ||
      !creatorBillingLoaded ||
      effectivePlanTier === "free"
    )
      return null;

    const isExpiringSoon = trialActive && daysLeft !== null && daysLeft <= 5;

    return (
      <div
        className={`mb-6 rounded-[20px] p-5 transition-all duration-500 overflow-hidden relative ${
          isExpiringSoon
            ? "bg-gradient-to-r from-[#FFF1F2] via-white to-[#FFF1F2] border border-red-200/60 shadow-[0_12px_40px_-12px_rgba(220,38,38,0.12)]"
            : "bg-white border border-[#E2E8F0] shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
        }`}
      >
        {isExpiringSoon && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.05, 0.15, 0.05] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-red-500 pointer-events-none"
          />
        )}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-5">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-colors duration-500 ${
                isExpiringSoon
                  ? "bg-red-50 text-red-500"
                  : effectivePlanTier === "basic"
                    ? "bg-blue-50 text-blue-500"
                    : effectivePlanTier === "pro"
                      ? "bg-amber-50 text-amber-500"
                      : "bg-blue-50 text-blue-500"
              }`}
            >
              {effectivePlanTier === "pro" ? (
                <Crown className="h-6 w-6" />
              ) : (
                <Star className="h-6 w-6" />
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center justify-center min-w-[50px] cursor-pointer hover:opacity-90 transition-opacity ${creatorPlanBadgeClass}`}
                  onClick={() => navigate("/CreatorSubscribe")}
                >
                  {effectivePlanTier}
                </div>
              </div>
              {trialActive && trialEndsAt && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-[#64748B]">
                    <span className="text-[#94A3B8]">Ends in:</span>
                    <span
                      className={`font-black ${
                        isExpiringSoon ? "text-red-500" : "text-[#0F172A]"
                      }`}
                    >
                      {trialCountdown}
                    </span>
                  </div>
                  {trialStartAt && (
                    <span className="text-[10px] text-[#94A3B8] font-medium bg-[#F1F5F9] px-2 py-0.5 rounded-full">
                      Started {new Date(trialStartAt).toLocaleDateString()}
                    </span>
                  )}
                  {isExpiringSoon && (
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="flex items-center gap-1 bg-red-100/80 text-red-700 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tight"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      Expiring Soon
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </div>
          <Button
            variant={isExpiringSoon ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setActiveSection("settings");
              setSettingsTab("billing");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            disabled={portalLoading}
            className={`h-11 rounded-xl px-6 font-black text-sm transition-all duration-300 group ${
              isExpiringSoon
                ? "bg-[#1E293B] text-white hover:bg-[#0F172A] hover:scale-[1.02] shadow-[0_8px_20px_-6px_rgba(30,41,59,0.4)] border-0"
                : "border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
            }`}
          >
            {isExpiringSoon && (
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 3 }}
                className="mr-2"
              >
                <Gift className="h-4 w-4 text-[#38BDF8]" />
              </motion.div>
            )}
            {trialActive ? "Manage Subscription" : "Account Settings"}
            <ChevronRight
              className={`ml-2 h-4 w-4 transition-transform ${
                isExpiringSoon
                  ? "group-hover:translate-x-1"
                  : "group-hover:translate-x-0.5"
              }`}
            />
          </Button>
        </div>
      </div>
    );
  };

  const renderDashboard = () => {
    const showTrialGift =
      creatorPlanTier === "free" && !trialStartAt && creatorBillingLoaded;

    const imagesFilled = Object.values(referenceImages).filter(
      (img) => img !== null,
    ).length;
    const imagesTotal = IMAGE_SECTIONS.length;
    return (
      <div className="space-y-8">
        {showTrialGift && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-[32px] border border-emerald-200/30 bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#042f2e] text-white shadow-[0_32px_64px_-16px_rgba(4,47,46,0.5)]"
          >
            <div className="flex flex-col gap-8 p-8 md:p-12 lg:flex-row lg:items-center lg:justify-between relative overflow-hidden">
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -ml-32 -mb-32" />

              <div className="flex flex-col md:flex-row items-start md:items-center gap-8 relative z-10">
                <motion.div
                  animate={{
                    y: [0, -12, 0],
                    rotate: [0, -8, 8, 0],
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] bg-white/10 ring-1 ring-white/20 backdrop-blur-xl shadow-2xl"
                >
                  <Gift className="h-10 w-10 text-[#5eead4]" />
                </motion.div>

                <div className="max-w-xl">
                  <div className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-[#5eead4] mb-6">
                    Exclusive Creator Offer
                  </div>
                  <h2 className="text-3xl font-black tracking-tight sm:text-4xl leading-tight">
                    Experience Likelee{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5eead4] to-[#2dd4bf]">
                      Pro
                    </span>{" "}
                    for 30 Days
                  </h2>
                  <p className="mt-4 text-lg text-slate-300 leading-relaxed font-medium">
                    Unlock professional features including AI Voice profiles,
                    advanced analytics, content monitoring, and premium campaign
                    opportunities.
                  </p>
                </div>
              </div>

              <div className="w-full lg:w-auto min-w-[320px] relative z-10">
                <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                  <div className="space-y-4 mb-8">
                    {[
                      "30 Days of Premium Access",
                      "Cancel anytime during trial",
                      "Automatic billing after 30 days",
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 text-slate-200"
                      >
                        <div className="h-2 w-2 rounded-full bg-emerald-400" />
                        <span className="text-sm font-semibold">{item}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    onClick={() => navigate("/CreatorSubscribe")}
                    className="w-full h-14 rounded-2xl bg-white text-[#0f172a] hover:bg-[#ccfbf1] transition-all duration-300 font-black text-lg shadow-xl hover:shadow-emerald-500/20 group"
                  >
                    Explore Plans & Unlock Trial
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">
                {t("creatorDashboard.dashboard.totalMonthlyRevenue")}
              </p>
              <DollarSign className="w-5 h-5 text-[#32C8D1]" />
            </div>
            <p className="text-4xl font-bold text-gray-900">
              ${totalMonthlyRevenue.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {t("creatorDashboard.dashboard.revenueInfo")}
            </p>
          </Card>
          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">
                {t("creatorDashboard.dashboard.activeCampaigns")}
              </p>
              <Target className="w-5 h-5 text-[#32C8D1]" />
            </div>
            <p className="text-4xl font-bold text-gray-900">
              {activeCampaigns.length}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {t("creatorDashboard.dashboard.activeCampaignsInfo")}
            </p>
          </Card>
          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">
                {t("creatorDashboard.dashboard.annualRunRate")}
              </p>
              <TrendingUp className="w-5 h-5 text-[#32C8D1]" />
            </div>
            <p className="text-4xl font-bold text-gray-900">
              ${annualRunRate.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {t("creatorDashboard.dashboard.annualRunRateInfo")}
            </p>
          </Card>
        </div>

        <h3 className="text-lg font-bold text-gray-900">
          {t("creatorDashboard.dashboard.quickActions")}
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <Card
            className="p-6 bg-white border border-gray-200 cursor-pointer hover:shadow-lg transition-all"
            onClick={() => setActiveSection("likeness")}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-[#32C8D1]" />
              </div>
              <Badge className="bg-cyan-100 text-cyan-700 border border-cyan-300">
                {t("creatorDashboard.dashboard.priority")}
              </Badge>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {t("creatorDashboard.dashboard.completeProfile")}
            </h3>
            <p className="text-sm text-gray-600">
              {t("creatorDashboard.dashboard.completeProfileInfo")}
            </p>
          </Card>
          <Card
            className="p-6 bg-white border border-gray-200 cursor-pointer hover:shadow-lg transition-all"
            onClick={() =>
              creatorCanUseVoice
                ? setActiveSection("voice")
                : navigate("/CreatorSubscribe")
            }
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Mic className="w-6 h-6 text-purple-600" />
              </div>
              <Badge className="bg-purple-100 text-purple-700 border border-purple-300">
                {creatorCanUseVoice
                  ? `${voiceLibrary.length}/${Math.max(creatorVoiceLimit, 6)}`
                  : "Pro"}
              </Badge>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {t("creatorDashboard.dashboard.uploadVoiceTone")}
            </h3>
            <p className="text-sm text-gray-600">
              {t("creatorDashboard.dashboard.uploadVoiceToneInfo")}
            </p>
          </Card>
        </div>

        <h3 className="text-lg font-bold text-gray-900">
          {t("creatorDashboard.dashboard.recentActivity")}
        </h3>
        {activeCampaigns.length === 0 ? (
          <Card className="p-10 bg-white border border-gray-200 text-center text-gray-600">
            <p>{t("creatorDashboard.dashboard.noCampaigns")}</p>
            <p className="text-sm text-gray-500 mt-1">
              {t("creatorDashboard.dashboard.noCampaignsInfo")}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {activeCampaigns.slice(0, 3).map((campaign) => (
              <Card
                key={campaign.id}
                className="p-5 bg-white border border-gray-200 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-4">
                  {campaign.brand_logo ? (
                    <img
                      src={campaign.brand_logo}
                      alt={campaign.brand}
                      className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-700">
                      {String(campaign.brand || "B")
                        .trim()
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {campaign.brand}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {campaign.campaign}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <Badge className="bg-green-100 text-green-700 border border-green-300">
                    {campaign.status === "expiring_soon"
                      ? t("creatorDashboard.campaigns.status.expiringSoon")
                      : t("creatorDashboard.campaigns.status.active")}
                  </Badge>
                  <span className="font-bold text-gray-900">
                    ${campaign.rate.toLocaleString()}/mo
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Card className="p-4 md:p-5 bg-white border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              {t("creatorDashboard.dashboard.profileStatus")}
            </h3>
            <Badge className="bg-[#32C8D1] text-white">
              {t("creatorDashboard.dashboard.completeToGetDiscovered")}
            </Badge>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {/* Reference Images */}
            <div className="p-5 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-600" />
                <span>{t("creatorDashboard.dashboard.referenceImages")}</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {imagesFilled}/{imagesTotal}
              </div>
              <Progress
                value={Math.round((imagesFilled / IMAGE_SECTIONS.length) * 100)}
                className="h-2 mt-3 bg-gray-200"
              />
            </div>

            {/* Voice Recordings */}
            <div className="p-5 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                <Mic className="w-4 h-4 text-purple-600" />
                <span>{t("creatorDashboard.dashboard.voiceRecordings")}</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {creatorCanUseVoice
                  ? `${voiceLibrary.length}/${Math.max(creatorVoiceLimit, 6)}`
                  : "Pro only"}
              </div>
              <Progress
                value={
                  creatorCanUseVoice
                    ? Math.min(
                        voiceLibrary.length *
                          (100 / Math.max(1, Math.max(creatorVoiceLimit, 6))),
                        100,
                      )
                    : 0
                }
                className="h-2 mt-3 bg-gray-200"
              />
            </div>
          </div>
        </Card>
      </div>
    );
  };

  const handleImageSectionUpload = (sectionId) => {
    setSelectedImageSection(sectionId);
    setShowImageUploadModal(true);
    setPreviewImage(null);
  };

  const handleImageFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPreviewImage({
        file,
        url: URL.createObjectURL(file),
        size: file.size,
        resolution: "1920x1920", // Mock resolution
      });
    }
  };

  const confirmImageUpload = async () => {
    try {
      if (!previewImage || !selectedImageSection) return;
      if (!user) {
        toast({
          variant: "destructive",
          title: "Authentication Required",
          description: "Please log in to upload.",
        });
        return;
      }
      const file: File = previewImage.file;
      if (!file) {
        toast({
          variant: "destructive",
          title: "No file selected",
        });
        return;
      }

      // Server pre-scan is limited to 20MB
      if (file.size > 20_000_000) {
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: "Please upload an image ≤ 20MB.",
        });
        return;
      }

      setUploadingToSection(true);

      // Upload via backend (Option B: server-only writes)
      const buf = await file.arrayBuffer();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error("Missing auth session. Please sign in again.");
      }
      const full = api(
        `/reference-images/upload?section_id=${encodeURIComponent(selectedImageSection)}`,
      );
      const res = await fetch(full, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "content-type": file.type || "image/jpeg",
        },
        body: new Uint8Array(buf),
      });
      if (!res.ok) {
        const raw = await res.text();
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: getUserFriendlyError(raw),
        });
        setUploadingToSection(false);
        return;
      }
      const out = await res.json();
      const publicUrl = out?.public_url;

      setReferenceImages({
        ...referenceImages,
        [selectedImageSection]: { url: publicUrl },
      });
      setShowImageUploadModal(false);
      setSelectedImageSection(null);
      setPreviewImage(null);
      toast({
        title: "Reference image uploaded!",
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: getUserFriendlyError(e),
      });
    } finally {
      setUploadingToSection(false);
    }
  };

  const deleteReferenceImage = (sectionId) => {
    const DeleteReferenceImageToastAction = ({
      sectionId,
      dismiss,
    }: {
      sectionId: string;
      dismiss: () => void;
    }) => {
      const [isDeleting, setIsDeleting] = useState(false);

      return (
        <ToastAction
          altText="Delete"
          disabled={isDeleting}
          className={
            "border-white/40 bg-white/10 text-white font-semibold shadow-sm " +
            "hover:bg-white/15 active:bg-white/20 focus-visible:ring-white/70"
          }
          onClick={async () => {
            try {
              if (isDeleting) return;
              setIsDeleting(true);

              await base44.delete(
                `/reference-images/${encodeURIComponent(String(sectionId))}`,
              );

              setReferenceImages((prev) => ({
                ...prev,
                [sectionId]: null,
              }));

              dismiss();
            } catch (e: any) {
              toast({
                variant: "destructive",
                title: "Delete failed",
                description: getUserFriendlyError(e),
              });
            } finally {
              setIsDeleting(false);
            }
          }}
        >
          {isDeleting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Deleting…
            </>
          ) : (
            "Delete"
          )}
        </ToastAction>
      );
    };

    const tinst = toast({
      title: "Delete Reference Image?",
      description: "This action cannot be undone.",
      variant: "destructive",
    });

    tinst.update({
      action: (
        <DeleteReferenceImageToastAction
          sectionId={sectionId}
          dismiss={tinst.dismiss}
        />
      ),
    });
  };

  const getCompleteness = () => {
    const filled = Object.values(referenceImages).filter(
      (img) => img !== null,
    ).length;
    return {
      filled,
      total: IMAGE_SECTIONS.length,
      percentage: Math.round((filled / IMAGE_SECTIONS.length) * 100),
    };
  };

  const renderLikeness = () => {
    const completeness = getCompleteness();

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              {t("creatorDashboard.myLikeness")}
            </h2>
            <p className="text-gray-600 mt-1">{t("faces.meta.description")}</p>
          </div>
        </div>

        {/* Completeness Card */}
        <Card className="p-6 bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-[#32C8D1]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {t("creatorDashboard.completeness.profileCompleteness", {
                  percentage: completeness.percentage,
                })}
              </h3>
              <p className="text-gray-700">
                {t("creatorDashboard.completeness.missingSections", {
                  count: IMAGE_SECTIONS.length - completeness.filled,
                })}
              </p>
            </div>
          </div>
          <Progress value={completeness.percentage} className="h-3 mb-3" />
          <div className="bg-white border border-blue-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-blue-900">
              <strong>
                {t("creatorDashboard.myLikenessSection.banner.strong")}
              </strong>{" "}
              {t("creatorDashboard.myLikenessSection.banner.text")}
            </p>
          </div>
        </Card>

        {/* REFERENCE IMAGE LIBRARY */}
        <Card className="p-6 bg-white border border-gray-200">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {t("creatorDashboard.referenceImageLibrary.title")}
            </h3>
            <p className="text-gray-600 mb-4">
              {t("creatorDashboard.referenceImageLibrary.subtitle")}
            </p>
            <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div>
                <p className="font-bold text-gray-900 text-lg">
                  {t(
                    "creatorDashboard.referenceImageLibrary.completenessFilled",
                    { filled: completeness.filled, total: completeness.total },
                  )}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {t("creatorDashboard.referenceImageLibrary.sectionsNeeded", {
                    count: IMAGE_SECTIONS.length - completeness.filled,
                  })}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-[#32C8D1]">
                  {completeness.percentage}%
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-blue-900">
              <strong>
                {t("creatorDashboard.myLikenessSection.howThisWorks.title")}
              </strong>{" "}
              {t("creatorDashboard.myLikenessSection.howThisWorks.text")}
            </p>
          </div>

          <div className="space-y-4">
            {IMAGE_SECTIONS.map((section, index) => {
              const hasImage = referenceImages[section.id];

              return (
                <Card
                  key={section.id}
                  className={`p-4 border-2 ${hasImage ? "border-green-200 bg-green-50" : "border-gray-200"}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-gray-900 text-lg mb-1">
                            {section.title}
                          </h4>
                          <p className="text-sm text-gray-600 mb-2">
                            <strong>
                              {t(
                                "creatorDashboard.myLikenessSection.imageStatus.bestFor",
                              )}
                            </strong>{" "}
                            {section.bestFor}
                          </p>
                          <Badge
                            variant="outline"
                            className={
                              hasImage
                                ? "bg-green-500 text-white"
                                : "bg-gray-300 text-gray-700"
                            }
                          >
                            {hasImage
                              ? t(
                                  "creatorDashboard.myLikenessSection.imageStatus.uploaded",
                                )
                              : t(
                                  "creatorDashboard.myLikenessSection.imageStatus.missing",
                                )}
                          </Badge>
                        </div>
                        {hasImage && (
                          <img
                            src={hasImage.url}
                            alt={section.title}
                            className="w-24 h-24 object-cover border-2 border-gray-200 rounded-lg"
                          />
                        )}
                      </div>

                      <p className="text-sm text-gray-700 mb-4">
                        {section.description}
                      </p>

                      <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                        {hasImage ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-2 border-gray-300 flex-shrink-0"
                              onClick={() =>
                                window.open(hasImage.url, "_blank")
                              }
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              <span className="text-xs sm:text-sm">
                                {t(
                                  "creatorDashboard.myLikenessSection.imageActions.view",
                                )}
                              </span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-2 border-[#32C8D1] text-[#32C8D1] flex-shrink-0"
                              onClick={() =>
                                handleImageSectionUpload(section.id)
                              }
                            >
                              <Upload className="w-4 h-4 mr-1" />
                              <span className="text-xs sm:text-sm">
                                {t(
                                  "creatorDashboard.myLikenessSection.imageActions.replace",
                                )}
                              </span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-2 border-red-300 text-red-600 flex-shrink-0"
                              onClick={() => deleteReferenceImage(section.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              <span className="text-xs sm:text-sm">
                                {t(
                                  "creatorDashboard.myLikenessSection.imageActions.delete",
                                )}
                              </span>
                            </Button>
                          </>
                        ) : (
                          <Button
                            onClick={() => handleImageSectionUpload(section.id)}
                            className="bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {t(
                              "creatorDashboard.myLikenessSection.imageActions.uploadImage",
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Quality Standards */}
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <p className="text-gray-700 text-sm">
              <strong>
                {t("creatorDashboard.myLikenessSection.qualityStandards.title")}
              </strong>{" "}
              {t("creatorDashboard.myLikenessSection.qualityStandards.text")}
            </p>
          </div>
        </Card>

        {/* Content Guidelines */}
        <Card className="p-6 bg-white border border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            {t("creatorDashboard.usageGuidelines.title")}
          </h3>
          <p className="text-gray-600 mb-6">
            {t("creatorDashboard.usageGuidelines.subtitle")}
          </p>

          <div className="space-y-6">
            <div>
              <Label className="text-lg font-semibold text-gray-900 block mb-3">
                {t("creatorDashboard.usageGuidelines.comfortableWith")}
              </Label>
              <div className="flex flex-wrap gap-2">
                {contentPreferences.comfortable.map((item) => (
                  <Badge
                    key={item}
                    variant="outline"
                    className="bg-green-100 text-green-700 border border-green-300 px-3 py-2"
                  >
                    {t(`common.contentTypes.${item}`, { defaultValue: item })}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-lg font-semibold text-gray-900 block mb-3">
                {t("creatorDashboard.usageGuidelines.notComfortableWith")}
              </Label>
              <div className="flex flex-wrap gap-2">
                {contentPreferences.not_comfortable.map((item) => (
                  <Badge
                    key={item}
                    variant="outline"
                    className="bg-red-100 text-red-700 border border-red-300 px-3 py-2"
                  >
                    ✗ {t(`common.contentTypes.${item}`, { defaultValue: item })}
                  </Badge>
                ))}
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full border-2 border-gray-300"
            >
              <Settings className="w-4 h-4 mr-2" />
              {t("creatorDashboard.usageGuidelines.editPreferences")}
            </Button>
          </div>
        </Card>

        {/* Verification Status */}
        <Card className="p-6 bg-white border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            {t("creatorDashboard.verificationStatus.title")}
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {isCreatorApproved && (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                )}
                {isCreatorPending && (
                  <Clock className="w-5 h-5 text-yellow-600" />
                )}
                {isCreatorRejected && (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                {!normalizedCreatorStatus && (
                  <AlertCircle className="w-5 h-5 text-gray-500" />
                )}
                <span className="font-medium text-gray-900">
                  {t(
                    "creatorDashboard.verificationStatus.identityVerification",
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    isCreatorApproved
                      ? "bg-green-100 text-green-700"
                      : isCreatorPending
                        ? "bg-yellow-100 text-yellow-700"
                        : isCreatorRejected
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700"
                  }
                >
                  {normalizedCreatorStatus
                    ? isCreatorRejected &&
                      normalizedCreatorStatus === "declined"
                      ? t(
                          "creatorDashboard.verificationStatus.rejected",
                          "Rejected",
                        )
                      : hasCreatorPendingFollowUp
                        ? t(
                            "creatorDashboard.verificationStatus.followUpNeeded",
                            "Action Needed",
                          )
                        : t(
                            `creatorDashboard.verificationStatus.${normalizedCreatorStatus}`,
                          )
                    : t("creatorDashboard.verificationStatus.notStarted")}
                </Badge>
                {!isCreatorApproved && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => refreshVerificationFromDashboard()}
                    disabled={kycLoading || kycStatusRefreshing}
                    className="h-8 px-2"
                    title={t(
                      "creatorDashboard.verificationStatus.refreshStatus",
                    )}
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${kycStatusRefreshing ? "animate-spin" : ""}`}
                    />
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-[#32C8D1]" />
                <span className="font-medium text-gray-900">
                  {t("creatorDashboard.verificationStatus.likenessRights")}
                </span>
              </div>
              <Badge variant="outline" className="bg-green-100 text-green-700">
                {t("creatorDashboard.verificationStatus.confirmed")}
              </Badge>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                onClick={startVerificationFromDashboard}
                disabled={
                  kycLoading || kycStatusRefreshing || isCreatorApproved
                }
                variant="outline"
                className="border-2 border-gray-300 w-full sm:w-auto"
              >
                {kycLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4 mr-2" />
                )}
                {verificationButtonLabel}
              </Button>
              <Button
                onClick={() => refreshVerificationFromDashboard()}
                disabled={kycLoading || kycStatusRefreshing}
                variant="outline"
                className="border-2 border-gray-300 w-full sm:w-auto"
              >
                {kycStatusRefreshing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                {t("creatorDashboard.verificationStatus.refreshStatus")}
              </Button>
            </div>
            {(hasCreatorPendingFollowUp || isCreatorRejected) &&
              currentCreatorKycReason && (
                <div
                  className={`rounded-lg border px-4 py-3 text-sm ${
                    hasCreatorPendingFollowUp
                      ? "border-amber-200 bg-amber-50 text-amber-900"
                      : "border-rose-200 bg-rose-50 text-rose-900"
                  }`}
                >
                  <span className="font-semibold">
                    {hasCreatorPendingFollowUp
                      ? t(
                          "creatorDashboard.verificationStatus.followUpReasonLabel",
                          "Next step:",
                        )
                      : t(
                          "creatorDashboard.verificationStatus.rejectedReasonLabel",
                          "Reason:",
                        )}
                  </span>{" "}
                  {currentCreatorKycReason}
                </div>
              )}
            {isCreatorPending && !hasCreatorPendingFollowUp && (
              <p className="text-sm text-gray-500">
                {savedKycSessionUrl
                  ? t(
                      "creatorDashboard.verificationStatus.resumeHint",
                      "Closed the verification window? Use Resume Verification to continue, or Refresh Status if you already finished.",
                    )
                  : t(
                      "creatorDashboard.verificationStatus.restartHint",
                      "If the last verification window was closed or expired, start a new verification session or refresh your status if you already finished.",
                    )}
              </p>
            )}
          </div>
        </Card>
      </div>
    );
  };

  const renderVoice = () => (
    <div className="space-y-6">
      {!creatorCanUseVoice ? (
        <Card className="p-8 bg-white border border-[#C7B8FF]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                Voice Profiles
              </h2>
              <p className="text-gray-600 mt-2">
                Upgrade to Pro to unlock ElevenLabs voice profile creation for
                up to {Math.max(creatorVoiceLimit, 6)} tones.
              </p>
            </div>
            <Button
              className="bg-[#4B4AE6] hover:bg-[#3F3EE0]"
              onClick={() => navigate("/CreatorSubscribe")}
            >
              Upgrade to Pro
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                {t("creatorDashboard.voice.title")}
              </h2>
              <p className="text-gray-600 mt-1">
                {t("creatorDashboard.voice.subtitle")}
              </p>
            </div>
            <Badge
              variant="outline"
              className="bg-purple-100 text-purple-700 border border-purple-300 px-4 py-2 text-lg"
            >
              {voiceLibrary.length}{" "}
              {t(
                voiceLibrary.length !== 1
                  ? "creatorDashboard.voice.voiceBadgePlural"
                  : "creatorDashboard.voice.voiceBadge",
              )}
            </Badge>
          </div>

          {/* Voice Overview Card */}
          {voiceLibrary.length > 0 && (
            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {t("creatorDashboard.voice.overview.title")}
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">
                    {t("creatorDashboard.voice.overview.totalRecordings")}
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {voiceLibrary.length}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">
                    {t("creatorDashboard.voice.overview.elevenLabsProfiles")}
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {voiceLibrary.filter((v) => v.voiceProfileCreated).length}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">
                    {t("creatorDashboard.voice.overview.totalUsage")}
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {voiceLibrary.reduce(
                      (sum, v) => sum + (v.usageCount || 0),
                      0,
                    )}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Record New Voice Sample */}
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              {t("creatorDashboard.voice.record.title")}
            </h3>
            <p className="text-gray-600 mb-6">
              {t("creatorDashboard.voice.record.subtitle")}
            </p>

            <div className="grid md:grid-cols-3 gap-4">
              {Object.keys(VOICE_SCRIPTS).map((emotion) => {
                const hasRecording = voiceLibrary.find(
                  (r) => r.emotion === emotion,
                );
                return (
                  <Card
                    key={emotion}
                    className={`p-6 border-2 cursor-pointer transition-all hover:shadow-lg ${
                      hasRecording
                        ? "border-green-300 bg-green-50"
                        : "border-gray-200 hover:border-[#32C8D1]"
                    }`}
                    onClick={() => handleEmotionSelect(emotion)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          hasRecording ? "bg-green-500" : "bg-[#32C8D1]"
                        }`}
                      >
                        <Mic className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 capitalize text-lg">
                          {t(`creatorDashboard.voice.emotionNames.${emotion}`)}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {t("creatorDashboard.voice.record.duration")}
                        </p>
                      </div>
                    </div>
                    {hasRecording && (
                      <Badge className="bg-green-500 text-white">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {t("creatorDashboard.voice.record.recorded")}
                      </Badge>
                    )}
                  </Card>
                );
              })}
            </div>
          </Card>

          {/* Voice Library */}
          {voiceLibrary.length > 0 && (
            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                {t("creatorDashboard.voice.library.title")}
              </h3>
              <div className="space-y-4">
                {voiceLibrary.map((recording) => (
                  <div
                    key={recording.id}
                    className="p-6 bg-gray-50 border-2 border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-14 h-14 rounded-full flex items-center justify-center ${
                            recording.accessible
                              ? "bg-green-500"
                              : "bg-gray-400"
                          }`}
                        >
                          <Mic className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 capitalize text-xl">
                            {t(
                              `creatorDashboard.voice.emotionNames.${recording.emotion.toLowerCase()}`,
                              recording.emotion,
                            )}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {new Date(recording.date).toLocaleDateString()} •{" "}
                            {recording.duration}s •{" "}
                            {t("creatorDashboard.voice.library.used", {
                              count: recording.usageCount || 0,
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {recording.voiceProfileCreated && (
                          <Badge className="bg-purple-100 text-purple-700 border border-purple-300">
                            {t(
                              "creatorDashboard.voice.library.elevenLabsReady",
                            )}
                          </Badge>
                        )}
                        <Button
                          onClick={() => toggleRecordingAccess(recording.id)}
                          variant="outline"
                          size="sm"
                        >
                          {recording.accessible ? (
                            <Unlock className="w-4 h-4" />
                          ) : (
                            <Lock className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          onClick={() => handleEmotionSelect(recording.emotion)}
                          variant="outline"
                          size="sm"
                        >
                          {t("creatorDashboard.voice.library.reRecord")}
                        </Button>
                        <Button
                          onClick={() => deleteRecording(recording.id)}
                          variant="outline"
                          size="sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <audio
                      controls
                      src={recording.url}
                      className="w-full mb-4"
                    />

                    {!recording.voiceProfileCreated && recording.accessible && (
                      <Button
                        onClick={() => createVoiceProfile(recording)}
                        disabled={
                          generatingVoiceId !== null &&
                          generatingVoiceId !==
                            (recording?.server_recording_id ?? recording?.id)
                        }
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        {generatingVoiceId ===
                        (recording?.server_recording_id ?? recording?.id) ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {t(
                              "creatorDashboard.voice.library.creatingProfile",
                            )}
                          </>
                        ) : (
                          <>
                            <PlayCircle className="w-4 h-4 mr-2" />
                            {t("creatorDashboard.voice.library.createProfile")}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                ))}
                {!recording.voiceProfileCreated && recording.accessible && (
                  <Button
                    disabled={true}
                    className="w-full bg-gray-400 cursor-not-allowed text-white"
                  >
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Coming Soon
                  </Button>
                )}
              </div>
            </Card>
          )}
          {/* Voice Training Tips */}
          <div className="bg-purple-50 border border-purple-200">
            <Volume2 className="h-5 w-5 text-purple-600" />
            <p className="text-purple-900">
              <strong>{t("creatorDashboard.voice.tips.title")}</strong>{" "}
              {t("creatorDashboard.voice.tips.message")}
            </p>
          </div>
        </>
      )}
    </div>
  );

  const renderAgencyConnection = () => {
    const pending = agencyInvites.filter((i) => {
      const contractStatus = String(
        i?.marketplace_contract?.status || "",
      ).toLowerCase();
      return (
        String(i?.status || "").toLowerCase() === "pending" &&
        contractStatus !== "active"
      );
    });
    const isTalent =
      (profile as any)?.role === "talent" || agencyConnections.length > 0;
    const unseenAssetRequestCount = assetRequests.filter(
      (req: any) => String(req?.status || "").toLowerCase() === "sent",
    ).length;

    const disconnectLabel =
      disconnectTarget?.agency_name ||
      disconnectTarget?.agency_id ||
      t("agencyConnections.thisAgency");
    const disconnectContract = disconnectTarget?.marketplace_contract;
    const disconnectRequiresApproval =
      String(disconnectContract?.status || "").toLowerCase() === "active";
    const disconnectPending =
      String(disconnectContract?.disconnect_status || "").toLowerCase() ===
      "pending";

    const doDisconnect = async () => {
      if (!disconnectTarget?.agency_id) return;
      try {
        setAgencyConnectionLoading(true);
        const result = await disconnectCreatorAgencyConnection(
          String(disconnectTarget.agency_id),
          disconnectRequiresApproval ? disconnectReason : undefined,
        );

        const { connections, invites } = await loadAgencyConnectionData();

        setAgencyConnections(connections);
        setAgencyInvites(invites);
        if (result?.status === "disconnect_requested") {
          toast({
            title: t("agencyConnections.toasts.disconnectRequestedTitle"),
            description: t(
              "agencyConnections.toasts.disconnectRequestedDescription",
            ),
          });
        } else if (result?.status === "disconnect_pending") {
          toast({
            title: t("agencyConnections.toasts.requestAlreadyPendingTitle"),
            description: t(
              "agencyConnections.toasts.requestAlreadyPendingDescription",
            ),
          });
        } else {
          toast({
            title: t("agencyConnections.toasts.disconnectedTitle"),
            description: t("agencyConnections.toasts.disconnectedDescription"),
          });
        }
      } catch (e: any) {
        toast({
          variant: "destructive",
          title: t("agencyConnections.toasts.failedDisconnectTitle"),
          description: e?.message || String(e),
        });
      } finally {
        setAgencyConnectionLoading(false);
        setDisconnectReason("");
      }
    };

    return (
      <div className="space-y-8">
        <AlertDialog
          open={disconnectDialogOpen}
          onOpenChange={(open) => {
            setDisconnectDialogOpen(open);
            if (!open) {
              setDisconnectConfirmChecked(false);
              setDisconnectTarget(null);
              setDisconnectReason("");
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {disconnectRequiresApproval
                  ? t("agencyConnections.dialogs.requestDisconnectTitle", {
                      agency: disconnectLabel,
                    })
                  : t("agencyConnections.dialogs.disconnectTitle", {
                      agency: disconnectLabel,
                    })}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {disconnectRequiresApproval
                  ? t("agencyConnections.dialogs.requestDisconnectDescription")
                  : t("agencyConnections.dialogs.disconnectDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="flex items-start gap-3">
              <Checkbox
                checked={disconnectConfirmChecked}
                onCheckedChange={(v) => setDisconnectConfirmChecked(Boolean(v))}
                id="confirm-disconnect"
              />
              <Label htmlFor="confirm-disconnect" className="text-sm leading-5">
                {disconnectRequiresApproval
                  ? t("agencyConnections.dialogs.requestDisconnectConfirm")
                  : t("agencyConnections.dialogs.disconnectConfirm")}
              </Label>
            </div>

            {disconnectRequiresApproval && (
              <div className="space-y-2">
                <Label htmlFor="disconnect-reason">
                  {t("agencyConnections.dialogs.requestReasonLabel")}
                </Label>
                <Textarea
                  id="disconnect-reason"
                  value={disconnectReason}
                  onChange={(e) => setDisconnectReason(e.target.value)}
                  placeholder={t(
                    "agencyConnections.dialogs.requestReasonPlaceholder",
                  )}
                  rows={4}
                />
                {disconnectPending ? (
                  <p className="text-xs text-amber-700">
                    {t("agencyConnections.dialogs.requestPending")}
                  </p>
                ) : null}
              </div>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel>
                {t("agencyConnections.dialogs.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={
                  !disconnectConfirmChecked ||
                  agencyConnectionLoading ||
                  disconnectPending
                }
                onClick={async () => {
                  await doDisconnect();
                }}
              >
                {disconnectRequiresApproval
                  ? t("agencyConnections.dialogs.requestDisconnect")
                  : t("agencyConnections.dialogs.disconnect")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog
          open={agencyContractDetailOpen}
          onOpenChange={(open) => {
            setAgencyContractDetailOpen(open);
            if (!open) {
              setSelectedAgencyConnection(null);
            }
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {t("agencyConnections.contract.title", {
                  agency:
                    selectedAgencyConnection?.agencies?.agency_name ||
                    t("agencyConnections.contract.agencyFallback"),
                })}
              </DialogTitle>
              <DialogDescription>
                {t("agencyConnections.contract.description")}
              </DialogDescription>
            </DialogHeader>
            {selectedAgencyConnection?.marketplace_contract ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <div className="text-xs text-gray-500">
                      {t("agencyConnections.contract.status")}
                    </div>
                    <div className="mt-1 font-semibold text-gray-900 capitalize">
                      {String(
                        selectedAgencyConnection.marketplace_contract.status ||
                          "unknown",
                      ).replaceAll("_", " ")}
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-xs text-gray-500">
                      {t("agencyConnections.contract.commission")}
                    </div>
                    <div className="mt-1 font-semibold text-gray-900">
                      {Number(
                        selectedAgencyConnection.marketplace_contract
                          .commission_rate || 0,
                      ).toFixed(2)}
                      %
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-xs text-gray-500">
                      {t("agencyConnections.contract.startDate")}
                    </div>
                    <div className="mt-1 font-semibold text-gray-900">
                      {selectedAgencyConnection.marketplace_contract
                        .valid_from || "—"}
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-xs text-gray-500">
                      {t("agencyConnections.contract.endDate")}
                    </div>
                    <div className="mt-1 font-semibold text-gray-900">
                      {selectedAgencyConnection.marketplace_contract
                        .valid_until || "—"}
                    </div>
                  </Card>
                </div>

                {selectedAgencyConnection.marketplace_contract
                  .disconnect_status &&
                selectedAgencyConnection.marketplace_contract
                  .disconnect_status !== "none" ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <div className="font-semibold">
                      {t("agencyConnections.contract.disconnectStatus")}{" "}
                      {String(
                        selectedAgencyConnection.marketplace_contract
                          .disconnect_status,
                      ).replaceAll("_", " ")}
                    </div>
                    {selectedAgencyConnection.marketplace_contract
                      .disconnect_reason ? (
                      <div className="mt-1">
                        {t("agencyConnections.contract.reason")}{" "}
                        {
                          selectedAgencyConnection.marketplace_contract
                            .disconnect_reason
                        }
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  {selectedAgencyConnection.marketplace_contract
                    .signed_document_url ? (
                    <Button
                      variant="outline"
                      onClick={() =>
                        window.open(
                          selectedAgencyConnection.marketplace_contract
                            ?.signed_document_url || "",
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      {t("agencyConnections.contract.viewSignedContract")}
                    </Button>
                  ) : null}
                  {selectedAgencyConnection.agencies?.website ? (
                    <Button
                      variant="outline"
                      onClick={() =>
                        window.open(
                          selectedAgencyConnection.agencies?.website || "",
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                    >
                      <Globe className="w-4 h-4 mr-2" />
                      {t("agencyConnections.contract.agencyWebsite")}
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-600">
                {t("agencyConnections.contract.noDetails")}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            {t("agencyConnections.title")}
          </h2>
          <p className="text-gray-600 mt-1">
            {t("agencyConnections.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={
              agencyConnectionSubTab === "connections" ? "default" : "outline"
            }
            className={
              agencyConnectionSubTab === "connections"
                ? "bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
                : "border-gray-300"
            }
            onClick={() => setAgencyConnectionSubTab("connections")}
          >
            {t("agencyConnections.connections")}
          </Button>
          <Button
            variant={
              agencyConnectionSubTab === "asset_requests"
                ? "default"
                : "outline"
            }
            className={
              agencyConnectionSubTab === "asset_requests"
                ? "bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
                : "border-gray-300"
            }
            onClick={() => setAgencyConnectionSubTab("asset_requests")}
          >
            {t("agencyConnections.assetRequests")}
            {unseenAssetRequestCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-white/20 px-1 text-xs">
                {unseenAssetRequestCount}
              </span>
            )}
          </Button>
        </div>

        {agencyConnectionSubTab === "connections" && (
          <>
            <Card className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-gray-900">
                    {t("agencyConnections.connectedAgencies")}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {agencyConnections.length > 0
                      ? t("agencyConnections.connectedAgenciesDescription")
                      : t("agencyConnections.noConnectionsDescription")}
                  </div>
                </div>
                {agencyConnectionLoading && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("agencyConnections.loading")}
                  </div>
                )}
              </div>

              {agencyConnections.length > 0 && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {agencyConnections.map((c) => (
                    <div
                      key={c.agency_id}
                      className="flex items-center justify-between gap-3 p-4 border border-gray-200 rounded-lg bg-white"
                    >
                      <button
                        type="button"
                        className="flex items-center gap-3 min-w-0 flex-1 text-left"
                        onClick={() => {
                          setSelectedAgencyConnection(c);
                          setAgencyContractDetailOpen(true);
                        }}
                      >
                        <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {c.agencies?.logo_url ? (
                            <img
                              src={c.agencies.logo_url}
                              alt={c.agencies.agency_name || "Agency"}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Building2 className="w-5 h-5 text-gray-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 truncate">
                            {c.agencies?.agency_name || c.agency_id}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {String(
                              c.marketplace_contract?.disconnect_status || "",
                            ).toLowerCase() === "pending"
                              ? t("agencyConnections.disconnectPending")
                              : t("agencyConnections.connectedAgencyFallback")}
                          </div>
                        </div>
                      </button>

                      {((profile as any)?.role === "talent" ||
                        agencyConnections.length > 0) && (
                        <Button
                          variant={
                            String(
                              c.marketplace_contract?.disconnect_status || "",
                            ).toLowerCase() === "pending"
                              ? "outline"
                              : "destructive"
                          }
                          size="sm"
                          disabled={agencyConnectionLoading}
                          onClick={() => {
                            setDisconnectTarget({
                              agency_id: String(c.agency_id),
                              agency_name: c.agencies?.agency_name || undefined,
                              marketplace_contract:
                                c.marketplace_contract || undefined,
                            });
                            setDisconnectConfirmChecked(false);
                            setDisconnectDialogOpen(true);
                          }}
                          aria-label={t("agencyConnections.disconnectAria")}
                        >
                          <Link2Off className="h-4 w-4 mr-2" />
                          {String(
                            c.marketplace_contract?.status || "",
                          ).toLowerCase() === "active"
                            ? t("agencyConnections.dialogs.requestDisconnect")
                            : t("agencyConnections.disconnect")}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-gray-900">
                    {t("agencyConnections.invitations")}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {pending.length > 0
                      ? t("agencyConnections.pendingInvitationsDescription")
                      : t("agencyConnections.noPendingInvitations")}
                  </div>
                </div>
                {pending.length > 0 && (
                  <Badge className="bg-[#32C8D1] text-white">
                    {pending.length}
                  </Badge>
                )}
              </div>
              {pending.length > 0 && (
                <div className="mt-6 space-y-3">
                  {pending.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-4 border border-gray-200 rounded-lg space-y-3"
                    >
                      {(() => {
                        const contract = inv.marketplace_contract;
                        const requiresSignature =
                          contract &&
                          contract.status !== "active" &&
                          contract.status !== "expired";
                        return (
                          <>
                            <div className="flex items-center justify-between gap-4">
                              <div className="min-w-0 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                  {inv?.agencies?.logo_url ? (
                                    <img
                                      src={inv.agencies.logo_url}
                                      alt={inv.agencies.agency_name || "Agency"}
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <Building2 className="w-5 h-5 text-gray-500" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-gray-900 truncate">
                                    {inv?.agencies?.agency_name
                                      ? t(
                                          "agencyConnections.invitationFromAgencyNamed",
                                          { agency: inv.agencies.agency_name },
                                        )
                                      : t(
                                          "agencyConnections.invitationFromAgency",
                                        )}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate mt-1">
                                    {inv?.agencies?.email ||
                                      inv?.agencies?.website ||
                                      t("agencyConnections.profileAvailable")}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Button
                                  variant="outline"
                                  className="border-gray-200"
                                  onClick={async () => {
                                    try {
                                      const token = String(inv?.token || "");
                                      if (token) {
                                        navigate(
                                          `/invite/agency/${encodeURIComponent(token)}`,
                                        );
                                        return;
                                      }

                                      await declineCreatorAgencyInvite(inv.id);
                                      setAgencyInvites((prev) =>
                                        prev.map((p) =>
                                          p.id === inv.id
                                            ? { ...p, status: "declined" }
                                            : p,
                                        ),
                                      );
                                      toast({ title: "Invitation declined" });
                                    } catch (e: any) {
                                      toast({
                                        variant: "destructive",
                                        title: "Failed to decline",
                                        description:
                                          "We could not decline this invitation right now. Please try again.",
                                      });
                                    }
                                  }}
                                >
                                  Decline
                                </Button>
                                {requiresSignature ? (
                                  <>
                                    <Button
                                      variant="outline"
                                      className="border-cyan-200 text-cyan-700"
                                      onClick={async () => {
                                        try {
                                          if (contract?.creator_sign_url) {
                                            window.open(
                                              contract.creator_sign_url,
                                              "_blank",
                                              "noopener,noreferrer",
                                            );
                                          }
                                          await syncCreatorAgencyMarketplaceContract(
                                            contract?.id || "",
                                          );
                                          const [connections, invites] =
                                            await Promise.all([
                                              listCreatorAgencyConnections(),
                                              listTalentAgencyInvites().then(
                                                (r: any) =>
                                                  (r?.invites as any[]) || [],
                                              ),
                                            ]);
                                          setAgencyConnections(connections);
                                          setAgencyInvites(invites);
                                        } catch (e: any) {
                                          toast({
                                            variant: "destructive",
                                            title: "Failed to open contract",
                                            description:
                                              "We could not refresh this contract right now. Please try again.",
                                          });
                                        }
                                      }}
                                    >
                                      Review contract
                                    </Button>
                                    <Button
                                      className="bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
                                      onClick={async () => {
                                        try {
                                          await syncCreatorAgencyMarketplaceContract(
                                            contract?.id || "",
                                          );
                                          const [connections, invites] =
                                            await Promise.all([
                                              listCreatorAgencyConnections(),
                                              listTalentAgencyInvites().then(
                                                (r: any) =>
                                                  (r?.invites as any[]) || [],
                                              ),
                                            ]);
                                          setAgencyConnections(connections);
                                          setAgencyInvites(invites);
                                          toast({
                                            title: "Contract synced",
                                            description:
                                              "We refreshed the contract status from DocuSeal.",
                                          });
                                        } catch (e: any) {
                                          toast({
                                            variant: "destructive",
                                            title: "Failed to sync contract",
                                            description:
                                              "We could not sync the contract right now. Please try again.",
                                          });
                                        }
                                      }}
                                    >
                                      Sync
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    className="bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
                                    onClick={async () => {
                                      try {
                                        const token = String(
                                          (inv as any)?.token || "",
                                        );
                                        if (token) {
                                          navigate(
                                            `/invite/agency/${encodeURIComponent(token)}`,
                                          );
                                          return;
                                        }

                                        await acceptCreatorAgencyInvite(inv.id);
                                        const [connections] = await Promise.all(
                                          [listCreatorAgencyConnections()],
                                        );
                                        setAgencyConnections(connections);
                                        setAgencyInvites((prev) =>
                                          prev.map((p) =>
                                            p.id === inv.id
                                              ? { ...p, status: "accepted" }
                                              : p,
                                          ),
                                        );
                                        toast({
                                          title: "Invitation accepted",
                                          description:
                                            "You are now connected to this agency. You can edit your profile per agency in Talent Portal settings.",
                                        });
                                      } catch (e: any) {
                                        toast({
                                          variant: "destructive",
                                          title: "Failed to accept",
                                          description:
                                            "We could not accept this invitation right now. Please try again.",
                                        });
                                      }
                                    }}
                                  >
                                    Accept
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="rounded-md border border-cyan-100 bg-cyan-50 px-3 py-2 text-xs text-cyan-900">
                              <span className="font-semibold">
                                Likelee notice:
                              </span>{" "}
                              This agency found your public profile in
                              marketplace and sent a connection invitation.
                            </div>
                            {contract ? (
                              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                                Contract status:{" "}
                                <span className="font-semibold capitalize">
                                  {contract.status}
                                </span>
                                {contract.commission_rate != null
                                  ? ` • ${contract.commission_rate}% commission`
                                  : ""}
                                {contract.valid_until
                                  ? ` • valid until ${contract.valid_until}`
                                  : ""}
                              </div>
                            ) : null}
                          </>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
        {agencyConnectionSubTab === "asset_requests" && (
          <Card className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {t("agencyConnections.assetRequests")}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {t("agencyConnections.assetRequestsDescription")}
                </div>
              </div>
              {unseenAssetRequestCount > 0 && (
                <Badge className="bg-[#32C8D1] text-white">
                  {unseenAssetRequestCount}
                </Badge>
              )}
            </div>
            <div className="mt-6 space-y-4">
              {loadingAssetRequests && (
                <p className="text-sm text-gray-600">
                  {t("agencyConnections.loadingRequests")}
                </p>
              )}
              {!loadingAssetRequests && assetRequests.length === 0 && (
                <p className="text-sm text-gray-600">
                  {t("agencyConnections.noAssetRequests")}
                </p>
              )}
              {assetRequests.map((req: any) => {
                const offer = req?.campaign_offers || {};
                const offerId = String(
                  req?.offer_id ||
                    req?.campaign_offer_id ||
                    req?.campaign_offers?.id ||
                    offer?.id ||
                    "",
                );
                const reqId = String(req?.id || "");
                const agencyName =
                  req?.agencies?.agency_name ||
                  t("agencyConnections.contract.agencyFallback");
                const agencyLogo = req?.agencies?.logo_url || "";
                const requestTitle = String(
                  req?.title || t("agencyConnections.assetRequestFallback"),
                );
                const offerDeliverables = offerId
                  ? offerDeliverablesById[offerId] || []
                  : [];
                const requestDeliverables = offerDeliverables.filter(
                  (d: any) =>
                    String(d?.asset_request_id || "") === reqId &&
                    String(d?.submitted_by_role || "") === "creator",
                );
                const isExpanded = expandedAssetRequests.has(reqId);
                return (
                  <div
                    key={String(req?.id)}
                    className="border border-gray-200 rounded-lg p-4 bg-white space-y-2"
                  >
                    <button
                      type="button"
                      className="w-full flex items-start justify-between gap-3 text-left"
                      onClick={() => {
                        const next = new Set(expandedAssetRequests);
                        if (next.has(reqId)) next.delete(reqId);
                        else next.add(reqId);
                        setExpandedAssetRequests(next);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                          {agencyLogo ? (
                            <img
                              src={String(agencyLogo)}
                              alt={agencyName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            agencyName.slice(0, 1).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {requestTitle}
                          </div>
                          <div className="text-xs text-gray-500">
                            {agencyName} •{" "}
                            {offer?.offer_title ||
                              offer?.brand_campaigns?.name ||
                              t("brandConnections.campaignFallback")}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {String(req?.status || "sent").replace(/_/g, " ")}
                        </Badge>
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </button>
                    {isExpanded && (
                      <>
                        {req?.message && (
                          <p className="text-sm text-gray-700">
                            {String(req.message)}
                          </p>
                        )}
                        {req?.file_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-200"
                            onClick={() =>
                              window.open(String(req.file_url), "_blank")
                            }
                          >
                            <FileText className="w-4 h-4 mr-2" />{" "}
                            {t("brandConnections.viewPDF")}
                          </Button>
                        )}
                        <div className="flex flex-wrap gap-2 pt-2">
                          <Button
                            size="sm"
                            // If it's an asset request from an agency, we bypass the brand payment gate
                            // because the agency's request implies they are managing the workflow.
                            disabled={false}
                            onClick={async () => {
                              if (!offerId) {
                                toast({
                                  title: t(
                                    "agencyConnections.offerMissingTitle",
                                  ),
                                  description: t(
                                    "agencyConnections.offerMissingDescription",
                                  ),
                                  variant: "destructive",
                                });
                                return;
                              }
                              setSendDeliverableBrandId(
                                String(offer?.brand_id || ""),
                              );
                              setSendDeliverableOfferId(offerId);
                              setSendDeliverableRequestId(
                                String(req?.id || ""),
                              );
                              setSendDeliverableRequestMeta({
                                agency_name: agencyName,
                                agency_logo_url: agencyLogo,
                                offer_title: offer?.offer_title || undefined,
                                campaign_name:
                                  offer?.brand_campaigns?.name || undefined,
                              });
                              setSendDeliverableOpen(true);
                              try {
                                if (
                                  String(req?.status || "").toLowerCase() ===
                                  "sent"
                                ) {
                                  await markTalentAssetRequestViewed(
                                    String(req?.id || ""),
                                  );
                                }
                              } catch {}
                            }}
                          >
                            {t("brandConnections.uploadDeliverables")}
                          </Button>
                        </div>
                        <div className="pt-2 border-t border-gray-100">
                          <div className="flex items-center justify-between text-xs font-semibold text-gray-700 mb-2">
                            <span>
                              {t("brandConnections.yourDeliverables")}
                            </span>
                          </div>
                          {loadingOfferDeliverablesById[offerId] && (
                            <p className="text-xs text-gray-500">
                              {t("brandConnections.loadingDeliverables")}
                            </p>
                          )}
                          {!loadingOfferDeliverablesById[offerId] &&
                            requestDeliverables.length === 0 && (
                              <p className="text-xs text-gray-500">
                                {t("brandConnections.noDeliverablesSubmitted")}
                              </p>
                            )}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                            {requestDeliverables.map((deliverable: any) => {
                              const assetUrl = String(
                                deliverable?.asset_url || "",
                              );
                              const caption =
                                String(deliverable?.caption || "").trim() ||
                                String(
                                  deliverable?.meta?.original_name || "",
                                ).trim();
                              const agencyNote = String(
                                deliverable?.agency_review_note || "",
                              ).trim();
                              return (
                                <div
                                  key={String(deliverable?.id)}
                                  className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm"
                                >
                                  <div className="relative aspect-[4/5] bg-gray-100">
                                    {assetUrl &&
                                      deliverableIsImage(deliverable) && (
                                        <img
                                          src={assetUrl}
                                          alt={caption || "Deliverable"}
                                          className="w-full h-full object-cover"
                                        />
                                      )}
                                    {assetUrl &&
                                      deliverableIsVideo(deliverable) && (
                                        <video
                                          src={assetUrl}
                                          controls
                                          className="w-full h-full object-cover bg-black"
                                        />
                                      )}
                                    <div className="absolute top-2 left-2">
                                      <Badge
                                        className={`text-[11px] ${deliverableStatusBadgeClass(
                                          deliverable?.status || "submitted",
                                        )}`}
                                      >
                                        {formatStatus(
                                          deliverable?.status || "submitted",
                                        )}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="p-3 space-y-2">
                                    <div className="text-xs text-gray-700 font-medium">
                                      {caption || "Deliverable"}
                                    </div>
                                    {agencyNote && (
                                      <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded p-2">
                                        <strong>
                                          {t(
                                            "agencyConnections.agencyFeedback",
                                          )}
                                          :
                                        </strong>{" "}
                                        {translateAgencyFeedbackText(
                                          agencyNote,
                                        )}
                                      </div>
                                    )}
                                    {assetUrl &&
                                      !deliverableIsImage(deliverable) &&
                                      !deliverableIsVideo(deliverable) && (
                                        <a
                                          href={assetUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-xs text-blue-600 underline"
                                        >
                                          {t("brandConnections.openFile")}
                                        </a>
                                      )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    );
  };

  const renderBrandConnection = () => {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            {t("brandConnections.title")}
          </h2>
          <p className="text-gray-600 mt-1">{t("brandConnections.subtitle")}</p>
          {totalBrandConnectionNotifications > 0 && (
            <p className="text-xs text-amber-700 mt-2">
              {t(
                totalBrandConnectionNotifications > 1
                  ? "brandConnections.notificationSummaryPlural"
                  : "brandConnections.notificationSummarySingular",
                { count: totalBrandConnectionNotifications },
              )}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={
              brandConnectionSubTab === "connections" ? "default" : "outline"
            }
            className={
              brandConnectionSubTab === "connections"
                ? "bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
                : "border-gray-300"
            }
            onClick={() => setBrandConnectionSubTab("connections")}
          >
            {t("brandConnections.connections")}
          </Button>
          <Button
            variant={
              brandConnectionSubTab === "requests" ? "default" : "outline"
            }
            className={
              brandConnectionSubTab === "requests"
                ? "bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
                : "border-gray-300"
            }
            onClick={() => {
              setBrandConnectionSubTab("requests");
              setSeenBrandRequestIds(
                new Set(
                  brandConnectionRequests
                    .filter((req: any) => req?.status === "pending")
                    .map((req: any) => String(req?.id || "")),
                ),
              );
            }}
          >
            {t("brandConnections.requests")}
            {unseenRequestCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-white/20 px-1 text-xs">
                {unseenRequestCount}
              </span>
            )}
          </Button>
          <Button
            variant={brandConnectionSubTab === "offers" ? "default" : "outline"}
            className={
              brandConnectionSubTab === "offers"
                ? "bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
                : "border-gray-300"
            }
            onClick={() => {
              setBrandConnectionSubTab("offers");
              setSeenOfferNotificationIds(
                new Set(
                  directBrandOffers.map((offer: any) =>
                    String(offer?.id || ""),
                  ),
                ),
              );
            }}
          >
            {t("brandConnections.offers")}
            {unseenOfferCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-white/20 px-1 text-xs">
                {unseenOfferCount}
              </span>
            )}
          </Button>
          <Button
            variant={
              brandConnectionSubTab === "job-invites" ? "default" : "outline"
            }
            className={
              brandConnectionSubTab === "job-invites"
                ? "bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
                : "border-gray-300"
            }
            onClick={() => setBrandConnectionSubTab("job-invites")}
          >
            {t("jobs.jobInvites")}
            {jobInvites.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-white/20 px-1 text-xs">
                {jobInvites.length}
              </span>
            )}
          </Button>
          <Button
            variant={
              brandConnectionSubTab === "deliverables" ? "default" : "outline"
            }
            className={
              brandConnectionSubTab === "deliverables"
                ? "bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
                : "border-gray-300"
            }
            onClick={() => {
              setBrandConnectionSubTab("deliverables");
              setSeenDeliverableNotificationOfferIds(
                new Set(
                  deliverableEligibleOffers.map((offer: any) =>
                    String(offer?.id || ""),
                  ),
                ),
              );
            }}
          >
            {t("brandConnections.deliverables")}
            {unseenDeliverableFeedbackCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-white/20 px-1 text-xs">
                {unseenDeliverableFeedbackCount}
              </span>
            )}
          </Button>
        </div>

        {brandConnectionSubTab === "connections" && (
          <Card className="p-6">
            <div className="text-lg font-semibold text-gray-900">
              {t("brandConnections.connections")}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {brandConnections.length > 0
                ? t("brandConnections.connectionsDescription")
                : t("brandConnections.noConnectionsDescription")}
            </div>
            {brandConnections.length > 0 && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {brandConnections.map((c: any) => (
                  <div
                    key={String(c?.brand_id || c?.id)}
                    className="flex items-center justify-between gap-3 p-4 border border-gray-200 rounded-lg bg-white"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {c?.brands?.logo_url ? (
                          <img
                            src={c.brands.logo_url}
                            alt={c.brands.company_name || "Brand"}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Building2 className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 truncate">
                          {resolveConnectedBrandName(c)}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {c?.brands?.email ||
                            t("brandConnections.connectedBrandFallback")}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      disabled={agencyConnectionLoading}
                      onClick={() => onDisconnect(String(c?.brand_id || ""))}
                      aria-label={t("brandConnections.disconnectAria")}
                      title={t("agencyConnections.dialogs.disconnect")}
                    >
                      <Link2Off className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {brandConnectionSubTab === "requests" && (
          <Card className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {t("brandConnections.requests")}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {pending.length > 0
                    ? t("brandConnections.requestsDescription")
                    : t("brandConnections.noPendingRequestsDescription")}
                </div>
              </div>
              {pending.length > 0 && (
                <Badge className="bg-[#32C8D1] text-white">
                  {pending.length}
                </Badge>
              )}
            </div>
            {pending.length > 0 && (
              <div className="mt-6 space-y-3">
                {pending.map((req: any) => (
                  <div
                    key={String(req?.id)}
                    className="p-4 border border-gray-200 rounded-lg space-y-3"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 truncate">
                          {req?.brands?.company_name ||
                            t("brandConnections.requestFallback")}
                        </div>
                        <div className="text-xs text-gray-500 truncate mt-1">
                          {req?.brands?.email ||
                            t("brandConnections.profileAvailable")}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          className="border-gray-200"
                          onClick={() =>
                            onRespond(String(req?.id || ""), "decline")
                          }
                          disabled={agencyConnectionLoading}
                        >
                          {t("brandConnections.declineRequest")}
                        </Button>
                        <Button
                          className="bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
                          onClick={() =>
                            onRespond(String(req?.id || ""), "accept")
                          }
                          disabled={agencyConnectionLoading}
                        >
                          {t("brandConnections.acceptRequest")}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {brandConnectionSubTab === "job-invites" && (
          <Card className="p-6">
            <div className="space-y-4">
              <div className="text-lg font-semibold text-gray-900">
                {t("jobs.jobInvites")}
              </div>
              {loadingJobInvites && (
                <p className="text-sm text-gray-600">
                  {t("jobs.loadingInvites")}
                </p>
              )}
              {!loadingJobInvites && jobInvites.length === 0 && (
                <p className="text-sm text-gray-600">{t("jobs.noInvites")}</p>
              )}
              {!loadingJobInvites && jobInvites.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {jobInvites.map((job: any) => (
                    <div
                      key={String(job?.id || "")}
                      className="p-4 border border-slate-200 rounded-lg bg-white space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 truncate">
                            {job?.job_title || t("jobs.inviteFallbackTitle")}
                          </div>
                          <div className="text-xs text-gray-500 truncate mt-1">
                            {resolveJobBrandName(job)}
                          </div>
                        </div>
                        <Badge className="bg-blue-50 text-blue-700 border border-blue-200">
                          {translateJobCallType(job?.call_type)}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600 flex flex-wrap gap-2">
                        {job?.location && (
                          <span>
                            {translateJobMetaValue(job.location, "location")}
                          </span>
                        )}
                        {job?.job_type && (
                          <span>
                            {translateJobMetaValue(job.job_type, "jobType")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!(job?.accepted_creator_ids || []).includes(
                          user?.id,
                        ) ? (
                          <>
                            <Button
                              variant="outline"
                              className="border-gray-300"
                              onClick={() =>
                                navigate(
                                  `${createPageUrl("Jobs")}?jobId=${encodeURIComponent(
                                    String(job?.id || ""),
                                  )}`,
                                )
                              }
                            >
                              {t("jobs.viewJobDetails")}
                            </Button>
                            <Button
                              variant="outline"
                              className="bg-[#32C8D1] hover:bg-[#2AB8C1] text-white border-none"
                              onClick={() => {
                                setJobInviteConfirmId(String(job?.id || ""));
                                setJobInviteConfirmAction("accept");
                                setJobInviteConfirmOpen(true);
                              }}
                            >
                              {t("jobs.acceptInvite")}
                            </Button>
                            <Button
                              variant="outline"
                              className="border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => {
                                setJobInviteConfirmId(String(job?.id || ""));
                                setJobInviteConfirmAction("decline");
                                setJobInviteConfirmOpen(true);
                              }}
                            >
                              {t("jobs.declineInvite")}
                            </Button>
                          </>
                        ) : (
                          <Button
                            className="bg-black text-white"
                            onClick={() =>
                              navigate(
                                `${createPageUrl("Jobs")}?jobId=${encodeURIComponent(
                                  String(job?.id || ""),
                                )}&apply=true`,
                              )
                            }
                          >
                            {t("jobs.apply")}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}

        {brandConnectionSubTab === "offers" && (
          <Card className="p-6">
            <div className="space-y-4">
              <div className="text-lg font-semibold text-gray-900">
                {t("brandConnections.offers")}
              </div>
              {loadingBrandOffers && (
                <p className="text-sm text-gray-600">
                  {t("brandConnections.loadingOffers")}
                </p>
              )}
              {!loadingBrandOffers && brandOffers.length === 0 && (
                <p className="text-sm text-gray-600">
                  {t("brandConnections.noOffersAvailable")}
                </p>
              )}
              {!selectedOfferBriefId && brandOffers.length > 0 && (
                <div className="space-y-3">
                  {brandOffers.map((offer: any) => {
                    const offerId = String(offer?.id || "");
                    const status = String(offer?.status || "sent");
                    return (
                      <div
                        key={offerId}
                        className="border border-gray-200 rounded-lg p-4 bg-white space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold text-gray-900">
                              {offer?.brand_campaigns?.name ||
                                t("brandConnections.offerFallback")}
                            </div>
                            <div className="text-xs text-gray-500">
                              {offer?.brands?.company_name || "Brand"} •{" "}
                              {status.replace(/_/g, " ")}
                            </div>
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        {offer?.message && (
                          <p className="text-sm text-gray-700">
                            {String(offer.message)}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            className="border-gray-200"
                            onClick={() => openOfferBriefPage(offerId)}
                          >
                            {t("brandConnections.viewBrief")}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {selectedOfferBriefId && !selectedBriefOffer && (
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="border-gray-300"
                    onClick={closeOfferBriefPage}
                  >
                    {t("brandConnections.backToOffers")}
                  </Button>
                  <p className="text-sm text-red-600">
                    {t("brandConnections.offerBriefNotFound")}
                  </p>
                </div>
              )}
              {selectedOfferBriefId && selectedBriefOffer && (
                <div className="space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <Button
                        variant="outline"
                        onClick={closeOfferBriefPage}
                        className="border-2 border-gray-300"
                      >
                        {t("brandConnections.backToOffers")}
                      </Button>
                      <h1 className="text-3xl font-bold text-gray-900">
                        {t("brandConnections.briefAndContractTitle", {
                          campaign:
                            selectedBriefCampaign?.name ||
                            t("brandConnections.campaignFallback"),
                        })}
                      </h1>
                      <p className="text-gray-600">
                        {t("brandConnections.briefAndContractSubtitle")}
                      </p>
                    </div>
                    <Badge
                      className={`text-xs ${offerStatusBadgeClass(selectedBriefOffer?.status)}`}
                    >
                      {formatStatus(selectedBriefOffer?.status)}
                    </Badge>
                  </div>

                  {selectedOfferContracts.length > 0 && (
                    <div className="rounded-md border border-gray-200 p-3 bg-white">
                      {selectedOfferContracts.map((contract: any) => (
                        <div
                          key={String(contract?.id)}
                          className="text-xs text-gray-700 mb-1"
                        >
                          {String(contract?.title || "Contract")} •{" "}
                          {String(contract?.docuseal_status || "draft")}
                        </div>
                      ))}
                    </div>
                  )}

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
                              <li key={`brief-key-message-${idx}`}>
                                {line.replace(/^[•-]\s*/, "")}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-slate-500">Not specified</p>
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
                          <span className="font-semibold">
                            Closing (20-30s):
                          </span>{" "}
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
                          <p className="font-semibold text-emerald-900 mb-2">
                            ✓ DO:
                          </p>
                          {briefLines("dos").length > 0 ? (
                            <ul className="list-disc pl-5 space-y-1 text-emerald-900">
                              {briefLines("dos").map((line, idx) => (
                                <li key={`brief-dos-${idx}`}>
                                  {line.replace(/^[•-]\s*/, "")}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-emerald-700">Not specified</p>
                          )}
                        </div>
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                          <p className="font-semibold text-red-900 mb-2">
                            ✗ DON&apos;T:
                          </p>
                          {briefLines("donts").length > 0 ? (
                            <ul className="list-disc pl-5 space-y-1 text-red-900">
                              {briefLines("donts").map((line, idx) => (
                                <li key={`brief-donts-${idx}`}>
                                  {line.replace(/^[•-]\s*/, "")}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-red-700">Not specified</p>
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
                      {briefReferenceImages.length > 0 ? (
                        <div className="grid md:grid-cols-3 gap-3">
                          {briefReferenceImages.map((img: any, idx: number) => {
                            const imageUrl = briefItemUrl(img);
                            const isLegacyBlob = imageUrl.startsWith("blob:");
                            return (
                              <div
                                key={idx}
                                className="border border-gray-200 rounded-lg overflow-hidden"
                              >
                                {imageUrl && !isLegacyBlob ? (
                                  <button
                                    type="button"
                                    className="w-full text-left"
                                    onClick={() => {
                                      setBriefGalleryIndex(idx);
                                      setBriefGalleryOpen(true);
                                    }}
                                  >
                                    <img
                                      src={imageUrl}
                                      alt={`Ref ${idx + 1}`}
                                      className="w-full h-40 object-cover bg-gray-100 hover:opacity-95 transition-opacity"
                                    />
                                  </button>
                                ) : (
                                  <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-xs text-gray-500 px-3 text-center">
                                    {isLegacyBlob
                                      ? "This image was attached as a temporary local file. Ask brand to re-upload."
                                      : "Reference image unavailable."}
                                  </div>
                                )}
                                <div className="p-2 text-xs text-gray-700 truncate">
                                  {`Ref ${idx + 1}`}
                                </div>
                              </div>
                            );
                          })}
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
                          {brandAssets.map((asset: any, idx: number) => {
                            const assetUrl = briefItemUrl(asset);
                            const isLegacyBlob = assetUrl.startsWith("blob:");
                            return (
                              <div
                                key={idx}
                                className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 flex items-center justify-between gap-3"
                              >
                                <span className="truncate">
                                  {String(asset?.name || `Asset ${idx + 1}`)}
                                </span>
                                {assetUrl && !isLegacyBlob ? (
                                  <button
                                    type="button"
                                    title="Download file"
                                    className="inline-flex items-center justify-center w-9 h-9 border border-slate-300 rounded-md hover:bg-slate-100 transition-colors"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void downloadBriefFile(
                                        assetUrl,
                                        String(
                                          asset?.name || `asset-${idx + 1}`,
                                        ),
                                      );
                                    }}
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <span className="text-xs text-slate-500">
                                    {isLegacyBlob
                                      ? "Legacy local file URL. Ask brand to re-upload."
                                      : "No file URL"}
                                  </span>
                                )}
                              </div>
                            );
                          })}
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
                      Campaign Scope &amp; Contract Details
                    </h2>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                        <p className="text-slate-900">
                          <span className="font-semibold">Objective:</span>{" "}
                          {briefValue("overview_objective")}
                        </p>
                        <p className="text-slate-900">
                          <span className="font-semibold">
                            Target Audience:
                          </span>{" "}
                          {briefValue("overview_target_audience")}
                        </p>
                        <p className="text-slate-900">
                          <span className="font-semibold">
                            Campaign Duration:
                          </span>{" "}
                          {briefValue("overview_campaign_duration")}
                        </p>
                        <p className="text-slate-900">
                          <span className="font-semibold">Launch Date:</span>{" "}
                          {briefValue("overview_launch_date")}
                        </p>
                      </div>
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                        <p className="text-slate-900">
                          <span className="font-semibold">Total Budget:</span>{" "}
                          {briefValue("budget_total")}
                        </p>
                        <p className="text-slate-900">
                          <span className="font-semibold">
                            Creator Payment:
                          </span>{" "}
                          {briefValue("budget_creator_payment")}
                        </p>
                        <p className="text-slate-900">
                          <span className="font-semibold">
                            Submission Deadline:
                          </span>{" "}
                          {briefValue("budget_submission_deadline")}
                        </p>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                      <p className="text-slate-900">
                        <span className="font-semibold">Renewal Terms:</span>{" "}
                        {briefValue("budget_renewal_terms")}
                      </p>
                    </div>
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                      <p className="text-slate-900">
                        <span className="font-semibold">
                          Included Revisions:
                        </span>{" "}
                        {briefValue("revision_included")}
                      </p>
                      <p className="text-slate-900">
                        <span className="font-semibold">Major Changes:</span>{" "}
                        {briefValue("revision_major_changes")}
                      </p>
                      <p className="text-slate-900">
                        <span className="font-semibold">
                          Turnaround for Revisions:
                        </span>{" "}
                        {briefValue("revision_turnaround")}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                      <p className="font-semibold text-slate-900 mb-2">
                        Approval Process
                      </p>
                      {briefLines("approval_process").length > 0 ? (
                        <ol className="list-decimal pl-5 space-y-1 text-slate-900">
                          {briefLines("approval_process").map((line, idx) => (
                            <li key={`creator-approval-${idx}`}>
                              {line.replace(/^[•-]?\s*\d*\s*/, "")}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="text-slate-500">Not specified</p>
                      )}
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                      <p className="font-semibold text-slate-900 mb-1">
                        Watermark &amp; Protection
                      </p>
                      <p className="text-slate-900 whitespace-pre-wrap">
                        {briefValue("watermark_protection")}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                      <p className="font-semibold text-slate-900 mb-1">
                        Legal Terms
                      </p>
                      {briefLines("legal_terms").length > 0 ? (
                        <ul className="list-disc pl-5 space-y-1 text-slate-900">
                          {briefLines("legal_terms").map((line, idx) => (
                            <li key={`creator-legal-${idx}`}>
                              {line.replace(/^[•-]\s*/, "")}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-500">Not specified</p>
                      )}
                    </div>
                  </Card>

                  <div className="flex justify-end">
                    {!creatorAlreadySigned ? (
                      <Button
                        className="bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
                        onClick={signContract}
                        disabled={!selectedBriefContract}
                      >
                        {t("brandConnections.signContract")}
                      </Button>
                    ) : (
                      <div className="text-sm font-medium text-emerald-700">
                        {t("brandConnections.contractAlreadySigned")}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {!selectedOfferBriefId &&
                brandOffers.map((offer: any) => {
                  const offerId = String(offer?.id || "");
                  const campaign = offer?.brand_campaigns || {};
                  return (
                    <div
                      key={offerId}
                      className="p-4 border border-gray-200 rounded-lg space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <p className="text-xs text-gray-600 uppercase tracking-wide">
                            Brand
                          </p>
                          <p className="text-base font-bold text-gray-900">
                            {resolveOfferBrandName(offer)}
                          </p>
                          <div className="font-semibold text-gray-900">
                            {campaign?.name ||
                              offer?.offer_title ||
                              "Campaign offer"}
                          </div>
                        </div>
                        <Badge
                          className={`text-xs ${offerStatusBadgeClass(offer?.status)}`}
                        >
                          {formatStatus(offer?.status || "sent")}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-700">
                        <p>
                          {t("brandConnections.offerStatus")}{" "}
                          <span className="font-semibold text-gray-900">
                            {formatStatus(offer?.status || "sent")}
                          </span>
                        </p>
                        <p>
                          {t("brandConnections.deliverableStatus")}{" "}
                          <span className="font-semibold text-gray-900">
                            {translateOfferDeliverableStatus(offer?.status)}
                          </span>
                        </p>
                        <p>
                          Category:{" "}
                          <span className="font-semibold text-gray-900">
                            {String(campaign?.category || "N/A")}
                          </span>
                        </p>
                        <p>
                          Budget range:{" "}
                          <span className="font-semibold text-gray-900">
                            {String(campaign?.budget_range || "N/A")}
                          </span>
                        </p>
                        <p>
                          Usage scope:{" "}
                          <span className="font-semibold text-gray-900">
                            {String(campaign?.usage_scope || "N/A")}
                          </span>
                        </p>
                        <p>
                          Territory:{" "}
                          <span className="font-semibold text-gray-900">
                            {String(campaign?.territory || "N/A")}
                          </span>
                        </p>
                        <p>
                          Start date:{" "}
                          <span className="font-semibold text-gray-900">
                            {String(campaign?.start_date || "N/A")}
                          </span>
                        </p>
                        <p>
                          Duration:{" "}
                          <span className="font-semibold text-gray-900">
                            {campaign?.duration_days
                              ? `${campaign.duration_days} days`
                              : "N/A"}
                          </span>
                        </p>
                      </div>
                      {offer?.message && (
                        <p className="text-sm text-gray-700">
                          {String(offer.message)}
                        </p>
                      )}
                      {String(offer?.status || "").toLowerCase() ===
                        "changes_requested" &&
                        !seenOfferNotificationIds.has(
                          String(offer?.id || ""),
                        ) && (
                          <div className="flex items-center rounded-md border border-amber-300 bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                            {t("brandConnections.editsRequestedByBrand")}
                          </div>
                        )}
                      <Button
                        variant="outline"
                        className="border-gray-200"
                        onClick={() => openOfferBriefPage(offerId)}
                      >
                        {t("brandConnections.viewBrief")}
                      </Button>
                    </div>
                  );
                })}
            </div>
          </Card>
        )}

        {brandConnectionSubTab === "deliverables" && (
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-lg font-semibold text-gray-900">
                  {t("brandConnections.deliverables")}
                </div>
                <Button
                  className="bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
                  onClick={() => {
                    setSendDeliverableRequestId("");
                    setSendDeliverableRequestMeta(null);
                    setSendDeliverableOpen(true);
                  }}
                >
                  {t("brandConnections.sendDeliverable")}
                </Button>
              </div>
              {loadingBrandOffers && (
                <p className="text-sm text-gray-600">
                  {t("brandConnections.loadingDeliverables")}
                </p>
              )}
              {!loadingBrandOffers &&
                deliverableEligibleOffers.length === 0 && (
                  <p className="text-sm text-gray-600">
                    {t("brandConnections.noDeliverablesForSignedOffers")}
                  </p>
                )}
              {deliverableEligibleOffers.map((offer: any) => {
                const offerId = String(offer?.id || "");
                const expanded = selectedBrandOfferId === offerId;
                return (
                  <div
                    key={offerId}
                    className="p-4 border border-gray-200 rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="space-y-1">
                        <p className="font-semibold text-gray-900">
                          {offer?.brand_campaigns?.name ||
                            t("brandConnections.offerFallback")}
                        </p>
                        <p className="text-xs text-gray-600">
                          {t("brandConnections.offerStatusLabel")}{" "}
                          {formatStatus(offer?.status || "sent")}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="border-gray-200"
                        onClick={() => openOfferBrief(offerId)}
                      >
                        {expanded
                          ? t("brandConnections.hide")
                          : t("brandConnections.open")}
                      </Button>
                    </div>
                    {expanded && (
                      <div className="rounded-md border border-gray-200 p-3">
                        {loadingOfferDetails ? (
                          <div className="text-xs text-gray-500">
                            {t("brandConnections.loadingDeliverables")}
                          </div>
                        ) : selectedOfferDeliverables.length === 0 ? (
                          <div className="text-xs text-gray-500">
                            {t("brandConnections.noDeliverablesYet")}
                          </div>
                        ) : (
                          selectedOfferDeliverables.map((deliverable: any) => (
                            <div
                              key={String(deliverable?.id)}
                              className="text-xs text-gray-700 mb-3 border border-gray-200 rounded-md p-3 bg-white"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">
                                  {String(deliverable?.asset_type || "file")}
                                </span>
                                <Badge
                                  className={`text-[11px] ${deliverableStatusBadgeClass(
                                    deliverable?.status || "submitted",
                                  )}`}
                                >
                                  {String(
                                    deliverable?.status || "submitted",
                                  ).toLowerCase() === "brand_approved"
                                    ? t("brandConnections.approved")
                                    : formatStatus(
                                        deliverable?.status || "submitted",
                                      )}
                                </Badge>
                              </div>
                              <div className="mt-1 text-[11px] text-gray-600">
                                {String(
                                  deliverable?.caption ||
                                    deliverable?.meta?.original_name ||
                                    "Deliverable image",
                                )}
                              </div>
                              {deliverable?.asset_url && (
                                <div className="mt-2">
                                  {deliverableIsImage(deliverable) && (
                                    <img
                                      src={String(deliverable.asset_url)}
                                      alt={String(
                                        deliverable?.caption ||
                                          deliverable?.meta?.original_name ||
                                          "Deliverable image",
                                      )}
                                      className="h-28 w-auto max-w-full rounded border border-gray-200 object-cover bg-white"
                                    />
                                  )}
                                  {deliverableIsVideo(deliverable) && (
                                    <video
                                      src={String(deliverable.asset_url)}
                                      controls
                                      className="h-32 w-auto max-w-full rounded border border-gray-200 bg-black"
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <Dialog open={briefGalleryOpen} onOpenChange={setBriefGalleryOpen}>
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>
                Reference Image {briefGalleryIndex + 1} of{" "}
                {briefReferenceImages.length}
              </DialogTitle>
            </DialogHeader>
            {(() => {
              const activeImage = briefReferenceImages[briefGalleryIndex];
              const activeImageUrl = briefItemUrl(activeImage);
              return activeImageUrl ? (
                <div className="space-y-3">
                  <img
                    src={activeImageUrl}
                    alt={`Reference ${briefGalleryIndex + 1}`}
                    className="w-full max-h-[70vh] object-contain bg-gray-50 border border-gray-200 rounded"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      onClick={() =>
                        setBriefGalleryIndex((idx) =>
                          idx <= 0 ? briefReferenceImages.length - 1 : idx - 1,
                        )
                      }
                      disabled={briefReferenceImages.length <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setBriefGalleryIndex((idx) =>
                          idx >= briefReferenceImages.length - 1 ? 0 : idx + 1,
                        )
                      }
                      disabled={briefReferenceImages.length <= 1}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">No image available.</div>
              );
            })()}
          </DialogContent>
        </Dialog>
        <Dialog
          open={creatorSignOpen}
          onOpenChange={async (open) => {
            if (open) return;
            setCreatorSignOpen(false);
            if (selectedOfferBriefId) {
              try {
                await loadOfferDetails(selectedOfferBriefId);
              } catch {
                // no-op
              }
            }
            // Contract hub rows not needed
          }}
        >
          <DialogContent className="fixed !inset-0 bg-background w-screen h-screen !max-w-none !translate-x-0 !translate-y-0 !rounded-none border-none p-0 flex flex-col outline-none">
            <DialogHeader className="p-4 border-b">
              <DialogTitle>Sign Contract</DialogTitle>
              <DialogDescription>
                Complete your signature to finalize this campaign contract.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 w-full bg-gray-50 overflow-auto">
              {creatorSignUrl ? <DocusealForm src={creatorSignUrl} /> : null}
            </div>
            <DialogFooter className="p-4 border-t">
              <Button
                variant="outline"
                type="button"
                onClick={async () => {
                  setCreatorSignOpen(false);
                  if (selectedOfferBriefId) {
                    try {
                      await loadOfferDetails(selectedOfferBriefId);
                    } catch {
                      // no-op
                    }
                  }
                  // Contract hub rows not needed
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };
  const renderCampaigns = () => {
    const query = campaignSearch.trim().toLowerCase();
    const campaignsToShow = query
      ? activeCampaigns.filter((campaign) => {
          const brand = String(campaign.brand || "").toLowerCase();
          const name = String(
            campaign.raw_campaign_name || campaign.campaign || "",
          ).toLowerCase();
          return brand.includes(query) || name.includes(query);
        })
      : activeCampaigns;

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                {t("creatorDashboard.campaigns.title")}
              </h2>
              <p className="text-gray-600 mt-1">
                {t("creatorDashboard.campaigns.subtitle")}
              </p>
            </div>
            <Badge
              className={`${
                activeCampaigns.length === 0
                  ? "bg-orange-100 text-orange-700 border border-orange-300"
                  : "bg-green-100 text-green-700 border border-green-300"
              } px-4 py-2 text-lg w-fit`}
            >
              {t("creatorDashboard.campaigns.activeCount", {
                count: activeCampaigns.length,
              })}
            </Badge>
          </div>
          <div className="w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={campaignSearch}
                onChange={(e) => setCampaignSearch(e.target.value)}
                placeholder={t("creatorDashboard.campaigns.searchPlaceholder")}
                className="pl-12 pr-12 h-12"
              />
              {campaignSearch.trim() && (
                <button
                  type="button"
                  onClick={() => setCampaignSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-gray-500 hover:text-gray-700"
                  aria-label={t("creatorDashboard.campaigns.clearSearch")}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>

        {campaignsToShow.length === 0 && (
          <Card className="p-6 bg-white border border-gray-200 text-center text-gray-600">
            {campaignSearch.trim() ? (
              <>
                <p>{t("creatorDashboard.campaigns.empty.searchTitle")}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {t("creatorDashboard.campaigns.empty.searchDescription")}
                </p>
              </>
            ) : isLoadingCampaigns ? (
              <>
                <p>{t("creatorDashboard.campaigns.empty.loadingTitle")}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {t("creatorDashboard.campaigns.empty.loadingDescription")}
                </p>
              </>
            ) : (
              <>
                <p>{t("creatorDashboard.campaigns.empty.noneTitle")}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {t("creatorDashboard.campaigns.empty.noneDescription")}
                </p>
              </>
            )}
          </Card>
        )}

        {/* Campaigns Table - Desktop Only */}
        {campaignsToShow.length > 0 && (
          <Card className="p-6 bg-white border border-gray-200 hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-4 px-4 font-bold text-gray-900">
                      {t("creatorDashboard.campaigns.table.brand")}
                    </th>
                    <th className="text-left py-4 px-4 font-bold text-gray-900">
                      {t("creatorDashboard.campaigns.table.usageType")}
                    </th>
                    <th className="text-left py-4 px-4 font-bold text-gray-900">
                      Amount
                    </th>
                    <th className="text-left py-4 px-4 font-bold text-gray-900">
                      {t("creatorDashboard.campaigns.table.activeUntil")}
                    </th>
                    <th className="text-left py-4 px-4 font-bold text-gray-900">
                      {t("creatorDashboard.campaigns.table.status")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {campaignsToShow.map((campaign) => (
                    <tr
                      key={campaign.id}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {campaign.brand_logo && (
                            <img
                              src={campaign.brand_logo}
                              alt={campaign.brand}
                              className="w-10 h-10 rounded-full object-cover border border-gray-200"
                            />
                          )}
                          {!campaign.brand_logo && (
                            <div className="w-10 h-10 rounded-full bg-[#32C8D1] flex items-center justify-center text-white font-bold">
                              {campaign.brand.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-900">
                              {campaign.brand}
                            </p>
                            {campaign.raw_campaign_name && (
                              <p className="text-xs text-gray-500 truncate">
                                {campaign.raw_campaign_name}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-700">
                        {campaign.usage_type ||
                          campaign.campaign?.split(",")[0] ||
                          "Social Ads"}
                      </td>
                      <td className="py-4 px-4 font-bold text-gray-900">
                        $
                        {(
                          campaign.amount ??
                          campaign.rate ??
                          0
                        ).toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-gray-700">
                        {parseDate(
                          campaign.active_until || campaign.end_date,
                        )?.toLocaleDateString() ||
                          formatDurationLabel(
                            campaign.duration_days,
                            campaign.duration_months,
                          ) ||
                          "Ongoing"}
                        {campaign.auto_renewal && (
                          <Badge
                            className="ml-2 bg-blue-100 text-blue-700 border border-blue-300 text-xs"
                            variant="outline"
                          >
                            {t("creatorDashboard.campaigns.labels.autoRenew")}
                          </Badge>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <Badge
                          className={`${
                            campaign.status === "active"
                              ? "bg-green-100 text-green-700 border border-green-300"
                              : campaign.status === "expiring_soon"
                                ? "bg-orange-100 text-orange-700 border border-orange-300"
                                : "bg-gray-100 text-gray-700 border border-gray-300"
                          }`}
                        >
                          {campaign.status === "active"
                            ? t("creatorDashboard.campaigns.status.active")
                            : campaign.status === "expiring_soon"
                              ? t(
                                  "creatorDashboard.campaigns.status.expiringSoon",
                                )
                              : campaign.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Mobile Campaign Cards */}
        {campaignsToShow.length > 0 && (
          <div className="md:hidden space-y-4">
            {campaignsToShow.map((campaign) => {
              const isExpanded = expandedCampaignId === campaign.id;

              return (
                <Card
                  key={campaign.id}
                  className="bg-white border border-gray-200 overflow-hidden"
                >
                  {/* Collapsible Header */}
                  <button
                    onClick={() =>
                      setExpandedCampaignId(isExpanded ? null : campaign.id)
                    }
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {campaign.brand_logo && (
                        <img
                          src={campaign.brand_logo}
                          alt={campaign.brand}
                          className="w-12 h-12 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                        />
                      )}
                      {!campaign.brand_logo && (
                        <div className="w-12 h-12 rounded-lg bg-[#32C8D1] flex items-center justify-center text-white font-bold flex-shrink-0">
                          {campaign.brand.charAt(0)}
                        </div>
                      )}
                      <div className="text-left flex-1 min-w-0">
                        <p className="font-bold text-gray-900 truncate">
                          {campaign.brand}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {campaign.usage_type ||
                            campaign.campaign?.split(",")[0] ||
                            "Social Ads"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    />
                  </button>

                  {/* Expandable Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-3">
                      {/* Amount */}
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-gray-600">Amount</span>
                        <span className="font-bold text-gray-900">
                          $
                          {(
                            campaign.amount ??
                            campaign.rate ??
                            0
                          ).toLocaleString()}
                        </span>
                      </div>

                      {/* Active Until */}
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-gray-600">
                          {t("creatorDashboard.campaigns.activeUntilLabel")}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-900">
                            {parseDate(
                              campaign.active_until || campaign.end_date,
                            )?.toLocaleDateString() ||
                              formatDurationLabel(
                                campaign.duration_days,
                                campaign.duration_months,
                              ) ||
                              "Ongoing"}
                          </span>
                          {campaign.auto_renewal && (
                            <Badge className="bg-blue-100 text-blue-700 border border-blue-300 text-xs">
                              {t("creatorDashboard.campaigns.labels.autoRenew")}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-gray-600">
                          {t("creatorDashboard.campaigns.statusLabel")}
                        </span>
                        <Badge
                          className={`${
                            campaign.status === "active"
                              ? "bg-green-100 text-green-700 border border-green-300"
                              : campaign.status === "expiring_soon"
                                ? "bg-orange-100 text-orange-700 border border-orange-300"
                                : "bg-gray-100 text-gray-700 border border-gray-300"
                          }`}
                        >
                          {campaign.status === "active"
                            ? t("creatorDashboard.campaigns.status.active")
                            : campaign.status === "expiring_soon"
                              ? t(
                                  "creatorDashboard.campaigns.status.expiringSoon",
                                )
                              : campaign.status}
                        </Badge>
                      </div>

                      {/* Actions removed */}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderApprovals = () => {
    const actionableOffers = directBrandOffers.filter((offer: any) =>
      [
        "contract_sent",
        "contract_partially_signed",
        "changes_requested",
      ].includes(String(offer?.status || "").toLowerCase()),
    );

    const pendingDeliverables = deliverableEligibleOffers.filter(
      (offer: any) =>
        String(offer?.status || "").toLowerCase() === "changes_requested",
    );

    const openBrandConnectionSubTab = (
      subTab: "requests" | "offers" | "deliverables",
    ) => {
      setBrandConnectionSubTab(subTab);
      setActiveSection("brand-connection");
    };

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Approval Queue</h2>
          <p className="text-gray-600 mt-1">
            Review brand requests, contract actions, and deliverable feedback.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 border border-[#DDE5EF] shadow-sm">
            <div className="text-sm text-gray-500">Pending requests</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              {pending.length}
            </div>
            <Button
              className="mt-4 w-full bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
              onClick={() => openBrandConnectionSubTab("requests")}
            >
              Open requests
            </Button>
          </Card>

          <Card className="p-5 border border-[#DDE5EF] shadow-sm">
            <div className="text-sm text-gray-500">Offer actions</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              {actionableOffers.length}
            </div>
            <Button
              className="mt-4 w-full bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
              onClick={() => openBrandConnectionSubTab("offers")}
            >
              Review offers
            </Button>
          </Card>

          <Card className="p-5 border border-[#DDE5EF] shadow-sm">
            <div className="text-sm text-gray-500">Deliverable feedback</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              {pendingDeliverables.length}
            </div>
            <Button
              className="mt-4 w-full bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
              onClick={() => openBrandConnectionSubTab("deliverables")}
            >
              View feedback
            </Button>
          </Card>
        </div>

        <Card className="p-6 border border-[#DDE5EF] shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-lg font-semibold text-gray-900">
                Needs your attention
              </div>
              <div className="text-sm text-gray-600 mt-1">
                The latest items that still need a response from you.
              </div>
            </div>
            <Badge className="bg-[#1A2140] text-white">
              {pending.length +
                actionableOffers.length +
                pendingDeliverables.length}
            </Badge>
          </div>

          {pending.length === 0 &&
          actionableOffers.length === 0 &&
          pendingDeliverables.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center text-sm text-gray-600">
              No approvals are waiting right now.
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {pending.slice(0, 5).map((req: any) => (
                <div
                  key={`request-${String(req?.id || "")}`}
                  className="rounded-xl border border-gray-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 truncate">
                        {req?.brands?.company_name ||
                          "Brand connection request"}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Connection request awaiting your response
                      </div>
                    </div>
                    <Badge className="bg-amber-50 text-amber-700 border border-amber-200">
                      Request
                    </Badge>
                  </div>
                </div>
              ))}

              {actionableOffers.slice(0, 5).map((offer: any) => (
                <div
                  key={`offer-${String(offer?.id || "")}`}
                  className="rounded-xl border border-gray-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 truncate">
                        {offer?.brand_campaigns?.name || "Campaign offer"}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {offer?.brands?.company_name || "Brand"} •{" "}
                        {String(offer?.status || "sent").replace(/_/g, " ")}
                      </div>
                    </div>
                    <Badge className="bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                      {String(offer?.status || "sent").replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>
              ))}

              {pendingDeliverables.slice(0, 5).map((offer: any) => (
                <div
                  key={`deliverable-${String(offer?.id || "")}`}
                  className="rounded-xl border border-gray-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 truncate">
                        {offer?.brand_campaigns?.name || "Deliverable review"}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Feedback received on submitted deliverables
                      </div>
                    </div>
                    <Badge className="bg-rose-50 text-rose-700 border border-rose-200">
                      Feedback
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  };

  const renderCampaignArchive = () => {
    const archiveQuery = archiveSearch.trim().toLowerCase();
    const campaignsToShow = archiveQuery
      ? archivedCampaigns.filter((campaign) => {
          const brand = String(campaign.brand || "").toLowerCase();
          const name = String(
            campaign.raw_campaign_name || campaign.campaign || "",
          ).toLowerCase();
          return brand.includes(archiveQuery) || name.includes(archiveQuery);
        })
      : archivedCampaigns;

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                {t("creatorDashboard.archive.title")}
              </h2>
              <p className="text-gray-600 mt-1">
                {t("creatorDashboard.archive.subtitle")}
              </p>
            </div>
            <Badge className="bg-gray-100 text-gray-700 border border-gray-300 px-4 py-2 text-lg w-fit">
              {t("creatorDashboard.archive.completedCount", {
                count: archivedCampaigns.length,
              })}
            </Badge>
          </div>
          <div className="w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={archiveSearch}
                onChange={(e) => setArchiveSearch(e.target.value)}
                placeholder="Search by brand or campaign"
                className="pl-12 pr-12 h-12"
              />
              {archiveSearch.trim() && (
                <button
                  type="button"
                  onClick={() => setArchiveSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-gray-500 hover:text-gray-700"
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
        {campaignsToShow.length === 0 ? (
          <Card className="p-6 rounded-xl shadow-sm text-center text-gray-600">
            {archiveSearch.trim() ? (
              <>
                <p>No campaigns match your search.</p>
                <p className="text-sm text-gray-500 mt-1">
                  Try a different brand or campaign name.
                </p>
              </>
            ) : loadingBrandOffers ? (
              <>
                <p>Loading past campaigns...</p>
                <p className="text-sm text-gray-500 mt-1">
                  Fetching your completed campaigns.
                </p>
              </>
            ) : (
              <>
                <p>No past campaigns yet.</p>
                <p className="text-sm text-gray-500 mt-1">
                  Completed campaigns will appear here.
                </p>
              </>
            )}
          </Card>
        ) : (
          <div className="space-y-6">
            {campaignsToShow.map((campaign) => (
              <Card
                key={campaign.id}
                className="p-6 bg-white border-2 border-gray-200"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    {campaign.brand_logo ? (
                      <img
                        src={campaign.brand_logo}
                        alt={campaign.brand}
                        className="w-16 h-16 rounded-lg object-contain border-2 border-gray-200 p-2"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gray-100 border-2 border-gray-200 flex items-center justify-center text-lg font-bold text-gray-700">
                        {String(campaign.brand || "B")
                          .trim()
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-gray-900 text-2xl">
                        {campaign.brand}
                      </h3>
                      <p className="text-gray-600">{campaign.campaign_type}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {t("creatorDashboard.archive.completedOn", {
                          date: campaign.completed_date,
                        })}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700 border border-green-300">
                    {t("creatorDashboard.archive.status.completed")}
                  </Badge>
                </div>

                <div className="grid md:grid-cols-4 gap-4 mb-6">
                  <div className="p-3 bg-slate-100 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">
                      {t("creatorDashboard.archive.duration")}
                    </p>
                    <p className="font-bold text-gray-900">
                      {campaign.duration}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-100 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">
                      {t("creatorDashboard.archive.monthlyRate")}
                    </p>
                    <p className="font-bold text-gray-900">
                      ${campaign.monthly_rate}
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-gray-600 mb-1">
                      {t("creatorDashboard.archive.totalEarned")}
                    </p>
                    <p className="font-bold text-green-600 text-lg">
                      ${campaign.total_earned.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-100 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">
                      {t("creatorDashboard.archive.regions")}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {campaign.regions.map((region) => (
                        <Badge
                          key={region}
                          className="bg-blue-100 text-blue-700 border border-blue-300 text-xs"
                        >
                          {region}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={campaign.show_on_portfolio}
                      className="data-[state=checked]:bg-gray-900"
                      onCheckedChange={(checked) => {
                        // For examples, just show a message
                        if (campaign.isExample) {
                          toast({
                            title: "Demo Mode",
                            description:
                              "This is an example campaign. In the real app, toggling this would update your portfolio visibility settings.",
                          });
                          return;
                        }
                        // For real campaigns, update the state
                        // TODO: Add API call to update portfolio visibility
                        console.log(
                          `Toggle portfolio visibility for ${campaign.id}: ${checked}`,
                        );
                      }}
                    />
                    <div>
                      <p className="font-semibold text-gray-900">
                        {t("creatorDashboard.archive.showOnPortfolio")}
                      </p>
                      <p className="text-sm text-gray-600">
                        {campaign.show_on_portfolio
                          ? t("creatorDashboard.archive.visibleOnPortfolio")
                          : t("creatorDashboard.archive.hiddenFromPortfolio")}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="border-2 border-gray-300"
                    disabled={campaign.isExample}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {t("creatorDashboard.archive.viewDetails")}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderContracts = () => {
    if (showContractDetails && selectedContract) {
      const contract = normalizedContracts.find(
        (c) => c.id === selectedContract,
      );
      if (!contract) return null;

      const currentMonth = new Date().toLocaleString("default", {
        month: "long",
      });
      const proratedAmount = Math.round(
        contract.creator_earnings * (new Date().getDate() / 30),
      );

      return (
        <div className="space-y-6">
          <div className="flex flex-col gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowContractDetails(false);
                setSelectedContract(null);
              }}
              className="border-2 border-gray-300 w-fit"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("creatorDashboard.contracts.backToContracts")}
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {contract.brand}
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">
                {contract.project_name}
              </p>
            </div>
          </div>

          {/* What You're Earning */}
          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              {t("creatorDashboard.contracts.whatYoureEarning")}
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <p className="text-gray-700 mb-2">
                  {t("creatorDashboard.contracts.monthlyPayment")}
                </p>
                <p className="text-4xl font-bold text-green-600">
                  ${contract.creator_earnings}
                </p>
              </div>
              <div>
                <p className="text-gray-700 mb-2">
                  {t("creatorDashboard.contracts.totalEarnedSoFar")}
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  ${contract.earnings_to_date.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-gray-700 mb-2">
                  {t("creatorDashboard.contracts.paymentStatus")}
                </p>
                <Badge className="bg-green-500 text-white text-lg">
                  {t("creatorDashboard.contracts.paid")}
                </Badge>
                <p className="text-sm text-gray-600 mt-2">
                  {t("creatorDashboard.contracts.amountReceived", {
                    amount: contract.amount_paid,
                  })}
                </p>
              </div>
            </div>
          </Card>

          {/* Timeline */}
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              {t("creatorDashboard.contracts.yourTimeline")}
            </h3>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="text-center flex-1">
                  <p className="text-sm text-gray-600 mb-1">
                    {t("creatorDashboard.contracts.started")}
                  </p>
                  <p className="font-bold text-gray-900">
                    {new Date(contract.effective_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-sm text-gray-600 mb-1">
                    {t("creatorDashboard.contracts.today")}
                  </p>
                  <div className="w-4 h-4 bg-[#32C8D1] rounded-full mx-auto"></div>
                </div>
                <div className="text-center flex-1">
                  <p className="text-sm text-gray-600 mb-1">
                    {t("creatorDashboard.contracts.expires")}
                  </p>
                  <p className="font-bold text-gray-900">
                    {new Date(contract.expiration_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="h-2 bg-gray-200 rounded-full relative overflow-hidden">
                <div
                  className="h-full bg-[#32C8D1] rounded-full"
                  style={{ width: "45%" }}
                ></div>
              </div>
              <p className="text-center text-sm text-gray-600 mt-3">
                {t("creatorDashboard.contracts.daysRemaining", {
                  count: contract.days_remaining,
                })}
              </p>
            </div>
            {contract.auto_renew && (
              <div className="mt-4 bg-blue-50 border border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <p className="text-blue-900 text-sm">
                  <strong>
                    {t("creatorDashboard.contracts.autoRenewal.title")}
                  </strong>{" "}
                  {t("creatorDashboard.contracts.autoRenewal.message")}
                </p>
              </div>
            )}
          </Card>

          {/* How Your Likeness Is Being Used */}
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              {t("creatorDashboard.contracts.howLikenessIsUsed")}
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  {t("creatorDashboard.contracts.whatTheyreUsing")}
                </p>
                <p className="text-gray-900">{contract.deliverables}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  {t("creatorDashboard.contracts.whereTheyCanUseIt")}
                </p>
                <p className="text-gray-900 mb-2">
                  <strong>{t("creatorDashboard.contracts.territory")}</strong>{" "}
                  {contract.territory}
                </p>
                <p className="text-gray-900">
                  <strong>{t("creatorDashboard.contracts.channels")}</strong>{" "}
                  {contract.channels.join(", ")}
                </p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm font-semibold text-red-700 mb-2">
                  {t("creatorDashboard.contracts.whatTheyCantDo")}
                </p>
                <p className="text-red-900">{contract.prohibited_uses}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  {t("creatorDashboard.contracts.revisions")}
                </p>
                <p className="text-gray-900">
                  {t("creatorDashboard.contracts.roundsIncluded", {
                    count: contract.revisions,
                  })}
                </p>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              {t("creatorDashboard.contracts.manageLicense")}
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Button
                onClick={() => {
                  setShowPauseModal(true);
                }}
                variant="outline"
                className="h-12 border-2 border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <Pause className="w-5 h-5 mr-2" />
                {t("creatorDashboard.contracts.pauseLicense")}
              </Button>
              <Button
                onClick={() => {
                  setShowRevokeModal(true);
                }}
                variant="outline"
                className="h-12 border-2 border-red-300 text-red-600 hover:bg-red-50"
              >
                <XCircle className="w-5 h-5 mr-2" />
                {t("creatorDashboard.contracts.revokeLicense")}
              </Button>
              <Button
                variant="outline"
                className="h-12 border-2 border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                {t("creatorDashboard.contracts.messageBrand")}
              </Button>
              <Button
                variant="outline"
                className="h-12 border-2 border-gray-300"
              >
                <FileText className="w-5 h-5 mr-2" />
                {t("creatorDashboard.contracts.viewFullLegalContract")}
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    const activeContracts = normalizedContracts.filter(
      (c) => c.status === "active" || c.status === "expiring_soon",
    );
    const expiredContracts = normalizedContracts.filter(
      (c) => c.status === "expired",
    );

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              {t("creatorDashboard.contracts.title")}
            </h2>
            <p className="text-gray-600 mt-1">
              {t("creatorDashboard.contracts.subtitle")}
            </p>
          </div>
        </div>

        {activeContracts.length === 0 && expiredContracts.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-blue-900">No licenses or contracts yet.</p>
          </div>
        )}

        {/* Contract Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setContractsTab("active")}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
              contractsTab === "active"
                ? "border-[#32C8D1] text-[#32C8D1]"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {t("creatorDashboard.contracts.activeTab", {
              count: activeContracts.length,
            })}
          </button>
          <button
            onClick={() => setContractsTab("expired")}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
              contractsTab === "expired"
                ? "border-[#32C8D1] text-[#32C8D1]"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {t("creatorDashboard.contracts.expiredTab", {
              count: expiredContracts.length,
            })}
          </button>
        </div>

        {/* Active Contracts */}
        {contractsTab === "active" && (
          <div className="space-y-4">
            {activeContracts.map((contract) => (
              <Card
                key={contract.id}
                className={`p-6 bg-white border-2 ${
                  contract.status === "expiring_soon"
                    ? "border-orange-300"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={contract.brand_logo}
                      alt={contract.brand}
                      className="w-14 h-14 rounded-lg object-cover border-2 border-gray-200"
                    />
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {contract.brand}
                      </h3>
                      <p className="text-gray-600">{contract.project_name}</p>
                    </div>
                  </div>
                  <Badge
                    className={
                      contract.status === "active"
                        ? "bg-green-100 text-green-700 border border-green-300"
                        : "bg-orange-100 text-orange-700 border border-orange-300"
                    }
                  >
                    {t(`creatorDashboard.contracts.status.${contract.status}`)}
                  </Badge>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-gray-600 mb-1">
                      {t("creatorDashboard.contracts.yourMonthlyFee")}
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      ${contract.creator_earnings}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">
                      {t("creatorDashboard.contracts.earnedToDate")}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${contract.earnings_to_date.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">
                      {t("creatorDashboard.contracts.daysRemainingLabel")}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {contract.days_remaining}
                    </p>
                  </div>
                </div>

                {contract.status === "expiring_soon" && (
                  <div className="mb-4 bg-orange-50 border border-orange-300 rounded-lg p-3 flex items-center gap-3">
                    <Clock className="h-5 w-5 text-orange-600 shrink-0" />
                    <p className="text-orange-900 text-sm">
                      <span className="font-bold">
                        {t("creatorDashboard.contracts.expiringIn", {
                          count: contract.days_remaining,
                        })}
                      </span>{" "}
                      {t("creatorDashboard.contracts.renewLicensePrompt")}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setSelectedContract(contract.id);
                      setShowContractDetails(true);
                    }}
                    className="flex-1 bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {t("creatorDashboard.contracts.viewDetails")}
                  </Button>
                  {contract.status === "expiring_soon" && (
                    <Button className="bg-green-600 hover:bg-green-700 text-white">
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {t("creatorDashboard.contracts.renew")}
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Expired Contracts */}
        {contractsTab === "expired" && (
          <Card className="p-12 bg-gray-50 border border-gray-200 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {t("creatorDashboard.contracts.noExpiredContracts")}
            </h3>
            <p className="text-gray-600">
              {t("creatorDashboard.contracts.completedContractsWillAppearHere")}
            </p>
          </Card>
        )}
      </div>
    );
  };

  const renderConnectBankAccount = () => (
    <div className="max-w-2xl mx-auto py-12">
      <Button
        variant="outline"
        onClick={() => setShowConnectBankAccount(false)}
        className="mb-8 flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("creatorDashboard.earnings.bankConnection.back")}
      </Button>
      <Card className="p-10 text-center bg-white border border-gray-200 shadow-sm">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <FileText className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          {t("creatorDashboard.earnings.bankConnection.title")}
        </h2>
        <p className="text-gray-600 mb-8">
          {t("creatorDashboard.earnings.bankConnection.subtitle")}
        </p>

        <div className="space-y-4 text-left mb-8">
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <Shield className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900">
                {t("creatorDashboard.earnings.bankConnection.securityTitle")}
              </h3>
              <p className="text-sm text-gray-600">
                {t("creatorDashboard.earnings.bankConnection.securityMessage")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <Lock className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900">
                {t("creatorDashboard.earnings.bankConnection.privateTitle")}
              </h3>
              <p className="text-sm text-gray-600">
                {t("creatorDashboard.earnings.bankConnection.privateMessage")}
              </p>
            </div>
          </div>
        </div>

        <Button
          size="lg"
          className="w-full h-12 bg-green-500 hover:bg-green-600 text-white text-base"
        >
          {t("creatorDashboard.earnings.bankConnection.button")}
        </Button>
        <p className="text-xs text-gray-500 mt-4">
          {t("creatorDashboard.earnings.bankConnection.comingSoon")}
        </p>
      </Card>
    </div>
  );

  const renderEarnings = () => {
    return (
      <div className="space-y-6">
        {/* New Feature Shout Out */}
        {showShoutOut && (
          <Card className="p-3 bg-[#E6FAFB] text-[#0F3D3F] border border-[#BFEFF2] shadow-sm relative animate-pulse">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold truncate">
                    {t("creatorDashboard.earnings.announcement.title")}
                  </h3>
                  <Badge className="bg-[#32C8D1] text-white border-none px-1.5 py-0 text-[10px]">
                    New
                  </Badge>
                </div>
                <p className="text-sm text-[#0F3D3F]/80">
                  {t("creatorDashboard.earnings.announcement.message")}
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              {t("creatorDashboard.earnings.title")}
            </h2>
            <p className="text-gray-600 mt-1">
              {t("creatorDashboard.earnings.subtitle")}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                if (
                  payoutAccountStatus?.payouts_enabled ||
                  payoutAccountStatus?.details_submitted
                ) {
                  setShowRequestPayoutModal(true);
                } else {
                  setShowPayoutSettings(true);
                }
              }}
              className={`h-11 px-6 font-bold shadow-md transition-all duration-500 scale-100 transform ${
                showShoutOut
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white animate-twinkle animate-shine scale-110"
                  : "bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
              }`}
              disabled={isLoadingPayout}
            >
              {isLoadingPayout ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {t("creatorDashboard.earnings.actions.loading")}
                </>
              ) : (
                <>
                  <WalletIcon className="w-5 h-5 mr-2" />
                  {payoutAccountStatus?.payouts_enabled ||
                  payoutAccountStatus?.details_submitted
                    ? t("creatorDashboard.earnings.actions.cashOut")
                    : t("payouts.setupPayouts")}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-lg p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>
              <span className="font-semibold">
                {t("creatorDashboard.earnings.readyTitle")}
              </span>{" "}
              {t("creatorDashboard.earnings.readyMessage")}
            </p>
            {payoutAccountStatus?.bank_last4 && (
              <div className="mt-2 flex items-center gap-2 text-sm text-blue-800 font-medium">
                <CreditCard className="w-4 h-4" />
                <span>
                  Connected bank account ending in{" "}
                  <strong>{payoutAccountStatus.bank_last4}</strong>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid md:grid-cols-4 gap-6">
          <Card className="p-6 bg-white border border-gray-200 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-500"></div>
            <p className="text-sm font-medium text-gray-600 mb-2 relative z-10">
              cashout Balance (Stripe)
            </p>
            <p className="text-3xl font-bold text-emerald-600 relative z-10">
              $
              {(
                (stripeBalances.find((b) => b.currency === "USD")
                  ?.available_cents || 0) / 100
              ).toFixed(2)}
            </p>
            <p className="text-sm text-gray-600 mt-1 relative z-10">
              Available in your connected Stripe account.
            </p>
            <p className="text-xs text-gray-500 mt-2 relative z-10">
              Held (pending transfer): $
              {(
                (balances.find((b) => b.currency === "USD")?.available_cents ||
                  0) / 100
              ).toFixed(2)}
            </p>
          </Card>
          <Card className="p-6 bg-white border border-gray-200">
            <p className="text-sm text-gray-600 mb-2">
              {t("creatorDashboard.earnings.metrics.thisMonthRecurring")}
            </p>
            <p className="text-3xl font-bold text-gray-900">$0</p>
            <p className="text-sm text-gray-600 mt-1">
              {t("creatorDashboard.earnings.metrics.waitingForCampaigns")}
            </p>
          </Card>
          <Card className="p-6 bg-white border border-gray-200">
            <p className="text-sm text-gray-600 mb-2">
              {t("creatorDashboard.earnings.metrics.projectedNextMonth")}
            </p>
            <p className="text-3xl font-bold text-gray-900">$0</p>
            <p className="text-sm text-gray-600 mt-1">
              {t("creatorDashboard.earnings.metrics.willCalculate")}
            </p>
          </Card>
          <Card className="p-6 bg-white border border-gray-200">
            <p className="text-sm text-gray-600 mb-2">
              {t("creatorDashboard.earnings.metrics.nextPayment")}
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {t("creatorDashboard.earnings.metrics.toBeDetermined")}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {t("creatorDashboard.earnings.metrics.noActiveContracts")}
            </p>
          </Card>
        </div>

        {/* Charts row */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {t("creatorDashboard.earnings.charts.revenueTrend")}
            </h3>
            <div className="p-12 bg-gray-50 border border-gray-200 rounded-lg text-center text-gray-600">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <div>
                {t("creatorDashboard.earnings.charts.revenuePlaceholder")}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {t("creatorDashboard.earnings.charts.activePlaceholder")}
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {t("creatorDashboard.earnings.charts.industryBreakdown")}
            </h3>
            <div className="p-12 bg-gray-50 border border-gray-200 rounded-lg text-center text-gray-600">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <div>
                {t("creatorDashboard.earnings.charts.industryPlaceholder")}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {t("creatorDashboard.earnings.charts.activePlaceholder")}
              </div>
            </div>
          </Card>
        </div>

        {/* Comparison Banner */}
        <Card className="p-6 bg-gradient-to-r from-cyan-50 to-white border border-cyan-200">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {t("creatorDashboard.earnings.comparison.title")}
            </h3>
            <p className="text-sm text-gray-600">
              {t("creatorDashboard.earnings.comparison.subtitle")}
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-5 bg-white rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">
                {t("creatorDashboard.earnings.comparison.traditionalModel")}
              </p>
              <p className="text-3xl font-bold text-gray-900">$500</p>
              <p className="text-sm text-gray-600">
                {t("creatorDashboard.earnings.comparison.traditionalDesc")}
              </p>
            </div>
            <div className="p-5 bg-white rounded-lg border border-cyan-300">
              <p className="text-sm text-gray-600 mb-1">
                {t("creatorDashboard.earnings.comparison.likeleeModel")}
              </p>
              <p className="text-3xl font-bold text-[#32C8D1]">
                {t("creatorDashboard.earnings.comparison.likeleeAmount")}
              </p>
              <p className="text-sm text-gray-600">
                {t("creatorDashboard.earnings.comparison.likeleeDesc")}
              </p>
            </div>
          </div>
        </Card>

        {/* Earnings by Campaign */}
        <Card className="p-6 bg-white border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {t("creatorDashboard.earnings.campaigns.title")}
          </h3>
          {activeCampaigns.length === 0 ? (
            <div className="p-12 bg-gray-50 border border-gray-200 rounded-lg text-center text-gray-600">
              <Gift className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <div className="font-semibold text-gray-900">
                {t("creatorDashboard.earnings.campaigns.placeholderTitle")}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {t("creatorDashboard.earnings.campaigns.placeholderMessage")}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {activeCampaigns.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="font-semibold text-gray-900 truncate">
                    {c.name || c.brand || "Campaign"}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">
                      ${(c.earnings_this_month || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {t("creatorDashboard.earnings.campaigns.thisMonth")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Payment History */}
        <Card className="p-6 bg-white border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {t("creatorDashboard.earnings.history.title")}
          </h3>
          {payoutHistory.length === 0 ? (
            <div className="p-12 bg-gray-50 border border-gray-200 rounded-lg text-center text-gray-600">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <div className="font-semibold text-gray-900">
                {t("creatorDashboard.earnings.history.placeholderTitle")}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {t("creatorDashboard.earnings.history.placeholderMessage")}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-3 font-semibold text-gray-600">Date</th>
                    <th className="pb-3 font-semibold text-gray-600">Amount</th>
                    <th className="pb-3 font-semibold text-gray-600">Method</th>
                    <th className="pb-3 font-semibold text-gray-600 text-right">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {payoutHistory.slice(0, 5).map((item) => (
                    <tr key={item.id} className="group">
                      <td className="py-4 text-gray-600">
                        {new Date(
                          item.created_at || item.requested_at,
                        ).toLocaleDateString()}
                      </td>
                      <td className="py-4 font-medium text-gray-900">
                        ${(item.amount_cents / 100).toFixed(2)}
                      </td>
                      <td className="py-4 capitalize text-gray-600">
                        {item.payout_method || "standard"}
                      </td>
                      <td className="py-4 text-right">
                        <Badge
                          variant="outline"
                          className={
                            item.status === "paid" || item.status === "approved"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : item.status === "failed" ||
                                  item.status === "cancelled"
                                ? "bg-rose-50 text-rose-700 border-rose-100"
                                : "bg-blue-50 text-blue-700 border-blue-100"
                          }
                        >
                          {item.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Button
          variant="outline"
          disabled
          className="w-full mt-3 border-2 border-gray-200 text-gray-400 cursor-not-allowed"
        >
          {t("creatorDashboard.earnings.actions.downloadTax")}
        </Button>
      </div>
    );
  };
  const handleSaveRates = async (e: any) => {
    e.preventDefault();
    if (savingRates) return;
    setSavingRates(true);
    try {
      const formData = new FormData(e.target);
      const newRates: any[] = [];

      // Define baseRate in cents from creator's base monthly price
      const baseRate = (creator.price_per_month || 0) * 100;

      // Which selections to use?
      const finalSelections =
        showRatesModal === "content" ? tempContentTypes : tempIndustries;

      if (showRatesModal === "content") {
        const tempRates = CONTENT_TYPES.map((type) => {
          const existingRate = customRates.find(
            (r) => r.rate_name === type && r.rate_name !== "Social-media ads",
          );
          return {
            rate_type: showRatesModal,
            rate_name: type,
            price_per_month_cents:
              existingRate?.price_per_month_cents ?? baseRate,
          };
        });
        finalSelections.forEach((type) => {
          const val = formData.get(`rate_content_${type}`);
          const parsed = parseFloat(val?.toString() || "");
          const existing = tempRates.find((r) => r.rate_name === type);
          const finalVal = isNaN(parsed)
            ? existing
              ? existing.price_per_month_cents / 100
              : creator.price_per_month || 0
            : parsed;

          // Optimization: Only save rate if it differs from the base rate to allow dynamic updates
          // When price matches base rate, we don't save it, so the frontend will default to the live base rate next time
          const isDefault = Math.round(finalVal * 100) === baseRate;
          // But we must respect explicit user intent if they typed it.
          // However, to fix the user's issue of "not updating when base changes", we must treat matching rates as "default".

          if (!isDefault) {
            newRates.push({
              rate_type: "content_type",
              rate_name: type,
              price_per_month_cents: Math.round(finalVal * 100),
            });
          }
        });
      } else if (showRatesModal === "industry") {
        // Industries don't have custom rates in this UI yet, but we collect them
        finalSelections.forEach((ind) => {
          // Placeholder if needed
        });
      }

      // Get existing rates for the OTHER type to preserve them
      const otherRateType =
        showRatesModal === "content" ? "industry" : "content_type";
      const preservedRates = customRates.filter(
        (r) => r.rate_type === otherRateType,
      );
      const finalRates = [...newRates, ...preservedRates];

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error("Missing auth session. Please sign in again.");
      }

      const res = await fetch(
        api(`/api/creator-rates?user_id=${encodeURIComponent(user.id)}`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(finalRates),
        },
      );

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to save rates: ${errorText}`);
      }

      await handleSaveRules(undefined, {
        content_types:
          showRatesModal === "content"
            ? tempContentTypes
            : creator.content_types,
        industries:
          showRatesModal === "industry" ? tempIndustries : creator.industries,
      });

      // Update local state immediately to ensure UI is snappy
      setCustomRates(finalRates);

      // Reload rates from database to confirm persistence
      const reloadRes = await fetch(
        api(`/api/creator-rates?user_id=${encodeURIComponent(user.id)}`),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (reloadRes.ok) {
        const reloadedRates = await reloadRes.json();
        setCustomRates(reloadedRates);
      }

      const successTitle =
        showRatesModal === "content"
          ? t("creatorDashboard.toasts.contentSaved")
          : t("creatorDashboard.toasts.industrySaved");

      // Also update profiles table fields locally to ensure dashboard syncs
      if (showRatesModal === "content") {
        setCreator((prev) => ({ ...prev, content_types: tempContentTypes }));
      } else if (showRatesModal === "industry") {
        setCreator((prev) => ({ ...prev, industries: tempIndustries }));
      }

      setShowRatesModal(null);
      setEditingRules(false);
      toast({
        title: successTitle,
      });
    } catch (e: any) {
      console.error("Save error:", e);
      toast({
        variant: "destructive",
        title: t("creatorDashboard.toasts.error"),
        description: `${t("creatorDashboard.toasts.saveFailed")}: ${e?.message || e}`,
      });
    } finally {
      setSavingRates(false);
    }
  };

  const renderSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            {t("creatorDashboard.settingsView.title")}
          </h2>
          <p className="text-gray-600 mt-1">
            {t("creatorDashboard.settingsView.subtitle")}
          </p>
        </div>
      </div>

      {/* Settings Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setSettingsTab("profile")}
          className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
            settingsTab === "profile"
              ? "border-[#32C8D1] text-[#32C8D1]"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          {t("creatorDashboard.settingsView.tabs.profile")}
        </button>
        <button
          onClick={() =>
            creatorCanUseRules
              ? setSettingsTab("rules")
              : navigate("/CreatorSubscribe")
          }
          className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
            settingsTab === "rules"
              ? "border-[#32C8D1] text-[#32C8D1]"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          <span className="inline-flex items-center gap-2">
            {t("creatorDashboard.settingsView.tabs.rules")}
            {!creatorCanUseRules && (
              <Crown className="h-4 w-4 text-amber-500" />
            )}
          </span>
        </button>
        <button
          onClick={() => setSettingsTab("billing")}
          className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
            settingsTab === "billing"
              ? "border-[#32C8D1] text-[#32C8D1]"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Billing
        </button>
      </div>

      {/* Profile Settings Tab */}
      {settingsTab === "profile" && (
        <div className="space-y-6">
          {/* Profile Photo */}
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {t("creatorDashboard.settingsView.profile.photoTitle")}
            </h3>
            <div className="flex items-center gap-6">
              <div className="relative">
                <div
                  className="relative cursor-zoom-in hover:scale-105 transition-transform"
                  onClick={() => setShowPhotoFull(true)}
                >
                  <img
                    src={profile?.profile_photo_url || creator.profile_photo}
                    alt={creator.name}
                    className={`w-32 h-32 rounded-full object-cover object-top border-4 ${creator?.kyc_status === "approved" ? "border-red-500" : "border-[#32C8D1]"}`}
                  />
                </div>
                <label className="absolute bottom-0 right-0 bg-white rounded-full p-2 border-2 border-gray-300 cursor-pointer hover:bg-gray-50">
                  <Edit className="w-4 h-4 text-gray-600" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                  />
                </label>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  {t("creatorDashboard.settingsView.profile.uploadText")}
                </p>
                <p className="text-xs text-gray-500">
                  {t("creatorDashboard.settingsView.profile.uploadHint")}
                </p>
              </div>
            </div>
          </Card>

          {/* Basic Information */}
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              {t("creatorDashboard.settingsView.profile.basicInfo")}
            </h3>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t("creatorDashboard.settingsView.profile.name")}
                </Label>
                <Input
                  value={creator.name}
                  onChange={(e) =>
                    setCreator({ ...creator, name: e.target.value })
                  }
                  className="border-2 border-gray-300"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t("creatorDashboard.settingsView.profile.email")}
                </Label>
                <Input
                  value={creator.email}
                  disabled
                  className="border-2 border-gray-200 bg-gray-50"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t("creatorDashboard.settingsView.profile.location")}
                </Label>
                <Input
                  value={creator.location}
                  onChange={(e) =>
                    setCreator({ ...creator, location: e.target.value })
                  }
                  className="border-2 border-gray-300"
                  placeholder={t(
                    "creatorDashboard.settingsView.profile.placeholders.city",
                  )}
                />
              </div>

              <div className="pt-2">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  {t(
                    "creatorDashboard.settingsView.profile.professionalDetails",
                  )}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      {t("creatorDashboard.settingsView.profile.creatorType")}
                    </Label>
                    <Input
                      value={creator.creator_type || ""}
                      onChange={(e) =>
                        setCreator({
                          ...creator,
                          creator_type: e.target.value,
                        })
                      }
                      className="border-2 border-gray-300"
                      placeholder="Model / Influencer / Actor"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      {t("creatorDashboard.settingsView.profile.dateOfBirth")}
                    </Label>
                    <DobInput
                      value={creator.birthday || ""}
                      onChange={(iso) =>
                        setCreator({
                          ...creator,
                          birthday: iso,
                        })
                      }
                      variant="rounded"
                      minAge={18}
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      {t("creatorDashboard.settingsView.profile.gender")}
                    </Label>
                    <Input
                      value={creator.gender || ""}
                      onChange={(e) =>
                        setCreator({
                          ...creator,
                          gender: e.target.value,
                        })
                      }
                      className="border-2 border-gray-300"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      {t("creatorDashboard.settingsView.profile.ethnicity")}
                    </Label>
                    <Input
                      value={creator.ethnicity || ""}
                      onChange={(e) =>
                        setCreator({
                          ...creator,
                          ethnicity: e.target.value,
                        })
                      }
                      className="border-2 border-gray-300"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      {t("creatorDashboard.settingsView.profile.race")}
                    </Label>
                    <Input
                      value={creator.race || ""}
                      onChange={(e) =>
                        setCreator({
                          ...creator,
                          race: e.target.value,
                        })
                      }
                      className="border-2 border-gray-300"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      {t("creatorDashboard.settingsView.profile.hairColor")}
                    </Label>
                    <Input
                      value={creator.hair_color || ""}
                      onChange={(e) =>
                        setCreator({
                          ...creator,
                          hair_color: e.target.value,
                        })
                      }
                      className="border-2 border-gray-300"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      {t("creatorDashboard.settingsView.profile.eyeColor")}
                    </Label>
                    <Input
                      value={creator.eye_color || ""}
                      onChange={(e) =>
                        setCreator({
                          ...creator,
                          eye_color: e.target.value,
                        })
                      }
                      className="border-2 border-gray-300"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      {t("creatorDashboard.settingsView.profile.heightCm")}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={String(creator.height_cm || "")}
                      onChange={(e) =>
                        setCreator({
                          ...creator,
                          height_cm: e.target.value,
                        })
                      }
                      className="border-2 border-gray-300"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t("creatorDashboard.settingsView.profile.bio")}
                </Label>
                <Textarea
                  value={creator.bio}
                  onChange={(e) =>
                    setCreator({ ...creator, bio: e.target.value })
                  }
                  className="border-2 border-gray-300 min-h-32"
                  placeholder={t(
                    "creatorDashboard.settingsView.profile.placeholders.bio",
                  )}
                />
              </div>

              <div className="pt-2">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  {t("reserveProfile.form.vibes")}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {VIBES.map((vibe) => {
                    const isSelected = creator.vibes?.includes(vibe);
                    return (
                      <button
                        key={vibe}
                        type="button"
                        onClick={() => handleToggleVibe(vibe)}
                        className={`px-3 py-1.5 text-sm transition-all border-2 rounded-lg flex items-center gap-2 ${
                          isSelected
                            ? "bg-[#32C8D1] text-white border-[#32C8D1] hover:bg-[#2AB8C1]"
                            : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
                        }`}
                      >
                        {isSelected && <Check className="w-4 h-4" />}
                        {translateVibe(vibe)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="w-full bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
              >
                {savingProfile ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("creatorDashboard.settingsView.profile.saveProfile")}
                  </>
                ) : (
                  t("creatorDashboard.settingsView.profile.saveProfile")
                )}
              </Button>
            </div>
          </Card>

          {/* Social Media Links */}
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              {t("creatorDashboard.settingsView.profile.socialMedia")}
            </h3>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  <Instagram className="w-4 h-4 inline mr-2" />
                  {t("creatorDashboard.settingsView.profile.instagram")}
                </Label>
                <Input
                  value={creator.instagram_handle || ""}
                  onChange={(e) =>
                    setCreator({ ...creator, instagram_handle: e.target.value })
                  }
                  className="border-2 border-gray-300"
                  placeholder={t(
                    "creatorDashboard.settingsView.profile.placeholders.instagram",
                  )}
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  <Video className="w-4 h-4 inline mr-2" />
                  {t("creatorDashboard.settingsView.profile.tiktok")}
                </Label>
                <Input
                  value={creator.tiktok_handle || ""}
                  onChange={(e) =>
                    setCreator({ ...creator, tiktok_handle: e.target.value })
                  }
                  className="border-2 border-gray-300"
                  placeholder={t(
                    "creatorDashboard.settingsView.profile.placeholders.tiktok",
                  )}
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  <LinkIcon className="w-4 h-4 inline mr-2" />
                  {t("creatorDashboard.settingsView.profile.portfolio")}
                </Label>
                <Input
                  value={creator.portfolio_url || ""}
                  onChange={(e) =>
                    setCreator({ ...creator, portfolio_url: e.target.value })
                  }
                  className="border-2 border-gray-300"
                  placeholder={t(
                    "creatorDashboard.settingsView.profile.placeholders.portfolio",
                  )}
                />
              </div>

              <Button
                onClick={handleSaveSocialLinks}
                disabled={savingSocialLinks}
                className="w-full bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
              >
                {savingSocialLinks ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("creatorDashboard.settingsView.profile.saveSocial")}
                  </>
                ) : (
                  t("creatorDashboard.settingsView.profile.saveSocial")
                )}
              </Button>
            </div>
          </Card>

          {/* Visibility Settings */}
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              {t("creatorDashboard.settingsView.profile.visibility")}
            </h3>

            <div className="space-y-6">
              <div className="flex items-center justify-between py-4">
                <div>
                  <Label className="text-base font-semibold text-gray-900 block mb-1">
                    Marketplace Visibility
                  </Label>
                  <p className="text-sm text-gray-600">
                    {t(
                      "creatorDashboard.settingsView.profile.visibleToBrandsDesc",
                    )}
                  </p>
                </div>
                <Switch
                  checked={creator.is_public_brands || false}
                  onCheckedChange={async (checked) => {
                    setCreator({ ...creator, is_public_brands: checked });
                    await handleSaveRules(
                      checked
                        ? "Profile is now visible in the marketplace."
                        : "Profile is now hidden from the marketplace.",
                      { is_public_brands: checked },
                    );
                  }}
                />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* My Rules Tab */}
      {settingsTab === "rules" && (
        <div className="space-y-6">
          <Card className="p-0 overflow-hidden bg-white border border-gray-200">
            <div className="p-6 pb-2">
              <h3 className="text-xl font-semibold text-gray-900 mb-1">
                {t("creatorDashboard.settingsView.rules.title")}
              </h3>
              <p className="text-sm text-gray-600">
                {t("creatorDashboard.settingsView.rules.subtitle")}
              </p>
            </div>

            <div className="p-6 pt-2 space-y-8">
              <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
                {effectivePlanTier === "pro"
                  ? t("common.proCreatorsUnlimited")
                  : t("creatorDashboard.settingsView.rules.planLimitMessage", {
                      plan:
                        effectivePlanTier === "basic"
                          ? t("billing.basic")
                          : t("billing.free"),
                      limit: creatorCategoryLimit,
                    })}
              </div>
              {/* Content I'm Open To */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-base font-semibold text-gray-900">
                    {t("creatorDashboard.settingsView.rules.contentOpenTo")}
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTempContentTypes(creator.content_types || []);
                      setShowRatesModal("content");
                    }}
                    className="border-2 border-gray-200 text-gray-700 hover:bg-gray-100 flex items-center gap-2 font-medium h-8 px-3 rounded-md shadow-sm text-xs"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    {t("creatorDashboard.settingsView.rules.editRate")}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {CONTENT_TYPES.filter(
                    (type) => type !== "Social-medial ads",
                  ).map((type) => {
                    const isSelected = creator.content_types?.includes(type);
                    return (
                      <Badge
                        key={type}
                        className={`px-3 py-1.5 text-sm transition-all border-2 ${
                          isSelected
                            ? "bg-[#32C8D1] text-white border-[#32C8D1] hover:bg-[#2AB8C1]"
                            : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
                        } cursor-default font-normal flex items-center gap-2 rounded-lg`}
                      >
                        {isSelected && <Check className="w-4 h-4" />}
                        {translateContentType(type)}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Industries I Work With */}
              <div className="pt-8 border-t border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-base font-semibold text-gray-900">
                    {t("creatorDashboard.settingsView.rules.industries")}
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTempIndustries(creator.industries || []);
                      setShowRatesModal("industry");
                    }}
                    className="border-2 border-gray-200 text-gray-700 hover:bg-gray-100 flex items-center gap-2 font-medium h-8 px-3 rounded-md shadow-sm text-xs"
                  >
                    {/* Button changed to Edit per user request */}
                    <Edit className="w-3.5 h-3.5" />
                    {t("creatorDashboard.settingsView.rules.edit")}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {INDUSTRIES.map((industry) => {
                    const isSelected = creator.industries?.includes(industry);
                    return (
                      <Badge
                        key={industry}
                        className={`px-3 py-1.5 text-sm transition-all border-2 ${
                          isSelected
                            ? "bg-[#32C8D1] text-white border-[#32C8D1] hover:bg-[#2AB8C1]"
                            : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
                        } cursor-default font-normal flex items-center gap-2 rounded-lg`}
                      >
                        {isSelected && <Check className="w-4 h-4" />}
                        {translateIndustry(industry)}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Content I'm NOT Comfortable With */}
              <div className="pt-8 border-t border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-base font-semibold text-gray-900">
                    {t(
                      "creatorDashboard.settingsView.rules.notComfortableWith",
                    )}
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRestrictionsModal(true)}
                    className="border-2 border-gray-200 text-gray-700 hover:bg-gray-100 flex items-center gap-2 font-medium h-8 px-3 rounded-md shadow-sm text-xs"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    {t("creatorDashboard.settingsView.rules.edit")}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mb-6">
                  {creator.content_restrictions &&
                  creator.content_restrictions.length > 0 ? (
                    creator.content_restrictions.map((restriction) => (
                      <Badge
                        key={restriction}
                        className="px-3 py-1.5 text-sm bg-[#F34D4D] text-white border-2 border-[#F34D4D] hover:bg-[#E23C3C] cursor-default font-normal flex items-center gap-2 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                        {translateRestriction(restriction)}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-gray-500 italic text-sm font-normal">
                      {t("creatorDashboard.settingsView.rules.noRestrictions")}
                    </p>
                  )}
                </div>

                <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-5">
                  <h5 className="font-semibold text-gray-900 mb-1">
                    {t(
                      "creatorDashboard.settingsView.rules.conflictingCampaigns",
                    )}
                  </h5>
                  <p className="text-sm text-gray-600 mb-3 font-normal">
                    {t(
                      "creatorDashboard.settingsView.rules.conflictingCampaignsDesc",
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {creator.brand_exclusivity &&
                    creator.brand_exclusivity.length > 0 ? (
                      creator.brand_exclusivity.map((brand) => (
                        <Badge
                          key={brand}
                          className="px-3 py-1.5 text-sm bg-amber-100/50 text-amber-800 border-2 border-amber-200 hover:bg-amber-200/50 cursor-default font-normal flex items-center gap-2 rounded-lg"
                        >
                          <Ban className="w-4 h-4" />
                          {brand}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 italic font-normal">
                        {t(
                          "creatorDashboard.settingsView.rules.noBrandExclusivity",
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Initial Licensing Rate */}
              <div className="pt-8 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-base font-semibold text-gray-900">
                    {t(
                      "creatorDashboard.settingsView.rules.initialLicensingRate",
                    )}
                  </h4>
                  <div className="flex gap-2">
                    {editingRules ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => setEditingRules(false)}
                          variant="outline"
                          className="border-2 border-gray-300 font-medium"
                        >
                          {t("creatorDashboard.settingsView.rules.cancel")}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveRules()}
                          className="bg-[#32C8D1] hover:bg-[#2AB8C1] text-white font-medium"
                        >
                          {t("creatorDashboard.settingsView.rules.save")}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingRules(true)}
                        className="border-2 border-gray-200 text-gray-700 hover:bg-gray-100 flex items-center gap-2 font-medium h-8 px-3 rounded-md shadow-sm text-xs"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        {t("creatorDashboard.settingsView.rules.edit")}
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2 font-normal">
                  {t("creatorDashboard.settingsView.rules.baseRateDesc")}
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-medium text-gray-900">$</span>
                    <Input
                      type="number"
                      value={creator.price_per_month ?? ""}
                      onChange={(e) =>
                        setCreator({
                          ...creator,
                          price_per_month: parseInt(e.target.value) || 0,
                        })
                      }
                      disabled={!editingRules}
                      className={`w-[480px] h-11 text-base font-normal border-gray-200 focus:ring-[#32C8D1] focus:border-[#32C8D1] rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-auto [&::-webkit-inner-spin-button]:appearance-auto [&::-webkit-inner-spin-button]:opacity-100 [&::-webkit-outer-spin-button]:opacity-100 ${
                        !editingRules
                          ? "bg-gray-50 text-gray-900 cursor-not-allowed border-gray-200"
                          : "bg-white"
                      }`}
                    />
                  </div>
                  <div className="flex flex-col -space-y-1 text-gray-900 font-medium leading-tight">
                    <span className="text-xl">/</span>
                    <span className="text-base">month</span>
                  </div>
                </div>
              </div>

              {/* Accept Negotiations */}
              <div className="pt-8 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold text-gray-900 block mb-1">
                      {t(
                        "creatorDashboard.settingsView.rules.acceptNegotiations",
                      )}
                    </Label>
                    <p className="text-sm text-gray-600">
                      {t(
                        "creatorDashboard.settingsView.rules.acceptNegotiationsDesc",
                      )}
                    </p>
                  </div>
                  <Switch
                    checked={creator.accept_negotiations || false}
                    onCheckedChange={(checked) => {
                      setCreator({ ...creator, accept_negotiations: checked });
                      handleSaveRules(
                        checked
                          ? t("creatorDashboard.toasts.negotiationEnabled")
                          : t("creatorDashboard.toasts.negotiationDisabled"),
                        { accept_negotiations: checked },
                      );
                    }}
                    className="data-[state=checked]:bg-[#32C8D1]"
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {settingsTab === "billing" && (
        <div className="space-y-6">
          <Card className="overflow-hidden border border-[#DDE5EF] bg-white shadow-sm">
            <div className="border-b border-[#E7EDF5] bg-gradient-to-r from-[#F9FBFE] to-[#F5F8FC] px-6 py-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-[#142033]">
                      {t("creatorDashboard.settingsView.billingSummary.title")}
                    </h3>
                    <Badge
                      className={
                        effectivePlanTier === "pro"
                          ? "border-0 bg-[#1A2140] text-white"
                          : effectivePlanTier === "basic"
                            ? "border border-[#BFEAF0] bg-[#ECFAFC] text-[#136B86]"
                            : "border border-[#E2E8F0] bg-white text-[#5B667A]"
                      }
                    >
                      {effectivePlanTier === "pro"
                        ? trialActive
                          ? "Pro Trial"
                          : "Pro"
                        : effectivePlanTier === "basic"
                          ? trialActive
                            ? "Basic Trial"
                            : "Basic"
                          : "Free"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 p-6 lg:grid-cols-[1.25fr_0.95fr]">
              <div className="rounded-3xl border border-[#E3EAF3] bg-[#FCFDFE] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7A889F]">
                      {t(
                        "creatorDashboard.settingsView.billingSummary.currentAccess",
                      )}
                    </div>
                    <div className="mt-1 text-2xl font-bold text-[#142033]">
                      {effectivePlanTier === "pro"
                        ? trialActive
                          ? t(
                              "creatorDashboard.settingsView.billingSummary.access.proTrial",
                            )
                          : t(
                              "creatorDashboard.settingsView.billingSummary.access.pro",
                            )
                        : effectivePlanTier === "basic"
                          ? trialActive
                            ? t(
                                "creatorDashboard.settingsView.billingSummary.access.basicTrial",
                              )
                            : t(
                                "creatorDashboard.settingsView.billingSummary.access.basic",
                              )
                          : t(
                              "creatorDashboard.settingsView.billingSummary.access.free",
                            )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  {[
                    {
                      label: t(
                        "creatorDashboard.settingsView.billingSummary.cards.content.label",
                      ),
                      value: t(
                        "creatorDashboard.settingsView.billingSummary.cards.content.value",
                      ),
                      included: true,
                    },
                    {
                      label: t(
                        "creatorDashboard.settingsView.billingSummary.cards.kyc.label",
                      ),
                      value: creatorCanUseKyc
                        ? t(
                            "creatorDashboard.settingsView.billingSummary.included",
                          )
                        : t(
                            "creatorDashboard.settingsView.billingSummary.upgradeToBasic",
                          ),
                      included: creatorCanUseKyc,
                    },
                    {
                      label: t(
                        "creatorDashboard.settingsView.billingSummary.cards.likeness.label",
                      ),
                      value: creatorCanUseLikeness
                        ? t(
                            "creatorDashboard.settingsView.billingSummary.included",
                          )
                        : t(
                            "creatorDashboard.settingsView.billingSummary.upgradeToBasic",
                          ),
                      included: creatorCanUseLikeness,
                    },
                    {
                      label: t(
                        "creatorDashboard.settingsView.billingSummary.cards.payouts.label",
                      ),
                      value: creatorCanUsePayouts
                        ? t(
                            "creatorDashboard.settingsView.billingSummary.included",
                          )
                        : t(
                            "creatorDashboard.settingsView.billingSummary.upgradeToBasic",
                          ),
                      included: creatorCanUsePayouts,
                    },
                    {
                      label: t(
                        "creatorDashboard.settingsView.billingSummary.cards.rules.label",
                      ),
                      value: creatorCanUseRules
                        ? t(
                            "creatorDashboard.settingsView.billingSummary.included",
                          )
                        : t(
                            "creatorDashboard.settingsView.billingSummary.proOnly",
                          ),
                      included: creatorCanUseRules,
                    },
                    {
                      label: t(
                        "creatorDashboard.settingsView.billingSummary.cards.voice.label",
                      ),
                      value: creatorCanUseVoice
                        ? t(
                            "creatorDashboard.settingsView.billingSummary.voiceEnabled",
                            { count: Math.max(creatorVoiceLimit, 6) },
                          )
                        : t(
                            "creatorDashboard.settingsView.billingSummary.proOnly",
                          ),
                      included: creatorCanUseVoice,
                    },
                    {
                      label: t(
                        "creatorDashboard.settingsView.billingSummary.cards.jobs.label",
                      ),
                      value: creatorCanUseJobs
                        ? t(
                            "creatorDashboard.settingsView.billingSummary.included",
                          )
                        : t(
                            "creatorDashboard.settingsView.billingSummary.proOnly",
                          ),
                      included: creatorCanUseJobs,
                    },
                    {
                      label: t(
                        "creatorDashboard.settingsView.billingSummary.cards.activeCampaigns.label",
                      ),
                      value: creatorCanUseActiveCampaigns
                        ? t(
                            "creatorDashboard.settingsView.billingSummary.included",
                          )
                        : t(
                            "creatorDashboard.settingsView.billingSummary.proOnly",
                          ),
                      included: creatorCanUseActiveCampaigns,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-[#E6EDF5] bg-white px-4 py-3"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full ${
                            item.included
                              ? "bg-[#E8F7FB] text-[#1683A3]"
                              : item.value === "Pro only"
                                ? "bg-[#FFF4DA] text-[#B7791F]"
                                : "bg-[#F1F5F9] text-[#718096]"
                          }`}
                        >
                          {item.included ? (
                            <Check className="h-4 w-4" />
                          ) : item.value === "Pro only" ? (
                            <Crown className="h-4 w-4 text-amber-500" />
                          ) : item.value.startsWith("Upgrade to Basic") ? (
                            <Star className="h-4 w-4 text-blue-500" />
                          ) : (
                            <Shield className="h-4 w-4" />
                          )}
                        </span>
                        <div>
                          <div className="text-sm font-semibold text-[#142033]">
                            {item.label}
                          </div>
                          <div className="text-sm text-[#5A6880]">
                            {item.value}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-3xl border border-[#D7E6F5] bg-gradient-to-br from-[#F9FCFF] to-[#EEF5FB] p-6">
                  <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7A889F]">
                    {t(
                      "creatorDashboard.settingsView.billingSummary.recommendedNextStep",
                    )}
                  </div>
                  <div className="mt-2 text-2xl font-bold text-[#142033]">
                    {effectivePlanTier === "free"
                      ? t(
                          "creatorDashboard.settingsView.billingSummary.next.free",
                        )
                      : effectivePlanTier === "basic"
                        ? t(
                            "creatorDashboard.settingsView.billingSummary.next.basic",
                          )
                        : t(
                            "creatorDashboard.settingsView.billingSummary.next.pro",
                          )}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#5A6880]">
                    {effectivePlanTier === "free"
                      ? t(
                          "creatorDashboard.settingsView.billingSummary.descriptions.free",
                        )
                      : effectivePlanTier === "basic"
                        ? t(
                            "creatorDashboard.settingsView.billingSummary.descriptions.basic",
                          )
                        : t(
                            "creatorDashboard.settingsView.billingSummary.descriptions.pro",
                          )}
                  </p>
                  {effectivePlanTier !== "pro" && (
                    <Button
                      className="mt-5 rounded-full bg-[#16324F] px-5 text-white hover:bg-[#10263D]"
                      disabled={portalLoading}
                      onClick={() => navigate("/CreatorSubscribe")}
                    >
                      {portalLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          {t(
                            "creatorDashboard.settingsView.billingSummary.processing",
                          )}
                        </>
                      ) : (
                        t(
                          "creatorDashboard.settingsView.billingSummary.viewDetails",
                        )
                      )}
                    </Button>
                  )}
                </div>

                <div className="rounded-3xl border border-[#D1FAE5] bg-gradient-to-br from-[#10192D] to-[#1A2E44] p-8 text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl transition-all group-hover:bg-emerald-500/20"></div>
                  <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                    <div className="max-w-md text-center md:text-left">
                      <h4 className="text-2xl font-black tracking-tight">
                        {t(
                          "creatorDashboard.settingsView.billingSummary.lockInProTitle",
                        )}
                      </h4>
                      <p className="mt-3 text-base text-indigo-100/100 leading-relaxed font-medium">
                        {t(
                          "creatorDashboard.settingsView.billingSummary.lockInProDescription",
                        )}
                      </p>
                    </div>
                    <Button
                      onClick={() => navigate("/CreatorSubscribe")}
                      className="w-full md:w-auto rounded-full bg-[#32C8D1] px-10 py-7 text-xl font-black text-white transition-all hover:scale-105 hover:bg-[#2bb2bb] shadow-[0_12px_24px_-8px_rgba(50,200,209,0.5)] border-0 disabled:opacity-70"
                    >
                      {portalLoading ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin mr-3" />
                          {t(
                            "creatorDashboard.settingsView.billingSummary.openingPortal",
                          )}
                        </>
                      ) : (
                        t(
                          "creatorDashboard.settingsView.billingSummary.selectPlan",
                        )
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Overlay for mobile sidebar */}
      {isSmallScreen && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`bg-white border-r border-gray-200 transition-all duration-300 flex flex-col fixed z-40 ${
          isSmallScreen
            ? sidebarOpen
              ? "w-64 h-screen top-0"
              : "-translate-x-full w-64 h-screen top-0"
            : sidebarOpen
              ? "w-64 h-[calc(100vh-5rem)] top-20"
              : "w-20 h-[calc(100vh-5rem)] top-20"
        }`}
      >
        {/* Mobile Sidebar Header */}
        {isSmallScreen && (
          <div className="flex items-center justify-center gap-3 p-4 border-b border-gray-200">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/eaaf29851_Screenshot2025-10-12at31742PM.png"
              alt="Likelee Logo"
              className="w-8 h-8"
            />
            <span className="font-bold text-xl font-display">Likelee</span>
          </div>
        )}

        {/* Profile Section */}
        <div className="p-6 border-b border-gray-200 relative">
          {sidebarOpen ? (
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => setShowProfileMenu((v) => !v)}
            >
              {creator?.kyc_status === "approved" ? (
                <Avatar className="w-12 h-12 border-2 border-green-500">
                  {creator?.profile_photo ? (
                    <AvatarImage
                      src={creator.profile_photo}
                      alt={creator.name || "User"}
                    />
                  ) : null}
                  <AvatarFallback className="bg-gray-200 text-gray-800 font-semibold">
                    {(() => {
                      const base = (
                        creator?.name ||
                        creator?.email ||
                        ""
                      ).trim();
                      if (!base) return "U";
                      const parts = base.includes(" ")
                        ? base.split(/\s+/)
                        : base.split("@")[0].split(/\.|_/);
                      const initials = parts
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((p) => p[0]?.toUpperCase())
                        .join("");
                      return initials || "U";
                    })()}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div
                  className="w-14 h-14 rounded-full p-[2px]"
                  style={{
                    background:
                      "conic-gradient(from 0deg, #ef4444, #f59e0b, #22c55e)",
                  }}
                >
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                    <Avatar className="w-12 h-12">
                      {creator?.profile_photo ? (
                        <AvatarImage
                          src={creator.profile_photo}
                          alt={creator.name || "User"}
                        />
                      ) : null}
                      <AvatarFallback className="bg-gray-200 text-gray-800 font-semibold">
                        {(() => {
                          const base = (
                            creator?.name ||
                            creator?.email ||
                            ""
                          ).trim();
                          if (!base) return "U";
                          const parts = base.includes(" ")
                            ? base.split(/\s+/)
                            : base.split("@")[0].split(/\.|_/);
                          const initials = parts
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((p) => p[0]?.toUpperCase())
                            .join("");
                          return initials || "U";
                        })()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              )}
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <p className="font-bold text-gray-900 truncate">
                  {creator.name}
                </p>
                {creator?.kyc_status === "approved" && (
                  <span
                    className="inline-flex items-center justify-center shrink-0"
                    title="Verified"
                  >
                    <BadgeCheck className="w-4 h-4 text-[#32C8D1]" />
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 ml-auto" />
              </div>
            </div>
          ) : (
            <div className="mx-auto">
              {creator?.kyc_status === "approved" ? (
                <Avatar className="w-12 h-12 border-2 border-green-500">
                  {creator?.profile_photo ? (
                    <AvatarImage
                      src={creator.profile_photo}
                      alt={creator.name || "User"}
                    />
                  ) : null}
                  <AvatarFallback className="bg-gray-200 text-gray-800 font-semibold">
                    {(() => {
                      const base = (
                        creator?.name ||
                        creator?.email ||
                        ""
                      ).trim();
                      if (!base) return "U";
                      const parts = base.includes(" ")
                        ? base.split(/\s+/)
                        : base.split("@")[0].split(/\.|_/);
                      const initials = parts
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((p) => p[0]?.toUpperCase())
                        .join("");
                      return initials || "U";
                    })()}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div
                  className="w-14 h-14 rounded-full p-[2px] animate-spin"
                  style={{
                    background:
                      "conic-gradient(from 0deg, #ef4444, #f59e0b, #22c55e)",
                    animationDuration: "3s",
                  }}
                >
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                    <Avatar className="w-12 h-12">
                      {creator?.profile_photo ? (
                        <AvatarImage
                          src={creator.profile_photo}
                          alt={creator.name || "User"}
                        />
                      ) : null}
                      <AvatarFallback className="bg-gray-200 text-gray-800 font-semibold">
                        {(() => {
                          const base = (
                            creator?.name ||
                            creator?.email ||
                            ""
                          ).trim();
                          if (!base) return "U";
                          const parts = base.includes(" ")
                            ? base.split(/\s+/)
                            : base.split("@")[0].split(/\.|_/);
                          const initials = parts
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((p) => p[0]?.toUpperCase())
                            .join("");
                          return initials || "U";
                        })()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              )}
            </div>
          )}

          {showProfileMenu && (
            <div className="absolute left-6 right-6 mt-2 bg-white border-2 border-gray-200 shadow-xl z-50">
              <div className="p-2">
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
                  onClick={() => {
                    setActiveSection("settings");
                    setSettingsTab("profile");
                    setShowProfileMenu(false);
                  }}
                >
                  <Edit className="w-4 h-4 text-gray-700" />
                  <span className="text-sm font-medium text-gray-900">
                    {t("creatorDashboard.nav.profile.edit", {
                      defaultValue: "Edit Profile",
                    })}
                  </span>
                </button>

                <button
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
                  onClick={() => {
                    setActiveSection("public-profile");
                    setShowProfileMenu(false);
                  }}
                >
                  <Eye className="w-4 h-4 text-gray-700" />
                  <span className="text-sm font-medium text-gray-900">
                    {t("creatorDashboard.nav.profile.viewPublic", {
                      defaultValue: "View Public Profile",
                    })}
                  </span>
                </button>

                <button
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
                  onClick={() => {
                    navigate("/Support");
                    setShowProfileMenu(false);
                  }}
                >
                  <HelpCircle className="w-4 h-4 text-gray-700" />
                  <span className="text-sm font-medium text-gray-900">
                    {t("creatorDashboard.nav.profile.help", {
                      defaultValue: "Help / Support",
                    })}
                  </span>
                </button>
              </div>

              <div className="p-2 border-t border-gray-200">
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left text-red-600"
                  onClick={async () => {
                    try {
                      await logout?.();
                    } catch (_) {}
                    setShowProfileMenu(false);
                    navigate("/Login");
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {t("creatorDashboard.nav.profile.logout", {
                      defaultValue: "Logout",
                    })}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.disabled) return;
                    if (item.locked) {
                      navigate("/CreatorSubscribe");
                      return;
                    }
                    if (item.onClick) {
                      item.onClick();
                      return;
                    }
                    setActiveSection(item.id);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                    item.disabled
                      ? "text-gray-400 cursor-not-allowed opacity-60"
                      : isActive
                        ? "bg-[#32C8D1] text-white"
                        : "text-gray-700 hover:bg-gray-100"
                  }`}
                  aria-disabled={item.disabled ? "true" : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 text-left font-medium">
                        {item.label}
                      </span>
                      {item.locked &&
                        (item.requiredPlan === "pro" ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#FFF4DA] text-[#B7791F]">
                            <Crown className="h-3.5 w-3.5" />
                          </span>
                        ) : item.requiredPlan === "basic" ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                            <Star className="h-3.5 w-3.5" />
                          </span>
                        ) : (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#E8F7FB] text-[#1683A3]">
                            <Shield className="h-3.5 w-3.5" />
                          </span>
                        ))}
                      {item.badge !== undefined && item.badge > 0 && (
                        <Badge
                          className={`${item.urgent ? "bg-red-500" : "bg-gray-500"} text-white`}
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Toggle Sidebar Button */}
        {!isSmallScreen && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-4 border-t border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-600 mx-auto" />
          </button>
        )}
      </aside>

      {/* Mobile Header */}
      {isSmallScreen && (
        <>
          <header
            className={`fixed ${isSmallScreen ? "top-20" : "top-0"} left-0 right-0 bg-white border-b border-gray-200 z-50 flex items-center justify-between p-4 lg:hidden`}
          >
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-600 hover:text-gray-900 transition-colors"
              aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="font-bold text-lg">
              {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
            </h1>
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="More options"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>
          </header>

          {/* Mobile Menu Dropdown */}
          {showMobileMenu && (
            <>
              {/* Backdrop to close menu when clicking outside */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMobileMenu(false)}
              />
              <div className="fixed top-16 right-4 bg-white border-2 border-gray-200 shadow-xl rounded-lg z-[60] w-64">
                <div className="p-2">
                  <button
                    onClick={() => {
                      navigate("/BrandCompany");
                      setShowMobileMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 active:bg-gray-200 rounded-lg text-left transition-colors duration-150"
                  >
                    <Building2 className="w-5 h-5 text-gray-700" />
                    <span className="text-sm font-medium text-gray-900">
                      Brands
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      navigate("/AgencySelection");
                      setShowMobileMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 active:bg-gray-200 rounded-lg text-left transition-colors duration-150"
                  >
                    <Users className="w-5 h-5 text-gray-700" />
                    <span className="text-sm font-medium text-gray-900">
                      Agencies
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      navigate("/AboutUs");
                      setShowMobileMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 active:bg-gray-200 rounded-lg text-left transition-colors duration-150"
                  >
                    <AlertCircle className="w-5 h-5 text-gray-700" />
                    <span className="text-sm font-medium text-gray-900">
                      About Us
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      navigate("/Contact");
                      setShowMobileMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 active:bg-gray-200 rounded-lg text-left transition-colors duration-150"
                  >
                    <MessageSquare className="w-5 h-5 text-gray-700" />
                    <span className="text-sm font-medium text-gray-900">
                      Contact
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Main Content */}
      <main
        className={`flex-1 ${isSmallScreen ? "mt-16 pt-0" : sidebarOpen ? "lg:ml-64 pt-0" : "lg:ml-20 pt-0"} transition-all duration-300 overflow-y-auto`}
      >
        <div className={`${isSmallScreen ? "p-4" : "p-8"}`}>
          {activeSection !== "settings" &&
            activeSection !== "talent-portal" && (
              <>
                {renderPlanStatusBar()}
                {renderMarketplaceVerificationBar()}
              </>
            )}
          {activeSection === "dashboard" && renderDashboard()}
          {activeSection === "public-profile" && renderPublicProfilePreview()}
          {activeSection === "content" && renderContent()}
          {activeSection === "likeness" && renderLikeness()}
          {activeSection === "voice" && renderVoice()}
          {activeSection === "campaigns" && renderCampaigns()}
          {activeSection === "jobs" && renderJobsSection()}
          {activeSection === "approvals" && renderApprovals()}
          {activeSection === "archive" && renderCampaignArchive()}
          {activeSection === "earnings" && renderEarnings()}
          {activeSection === "settings" && renderSettings()}
          {activeSection === "agency-connection" && renderAgencyConnection()}
          {activeSection === "brand-connection" && renderBrandConnection()}
          {activeSection === "talent-portal" && renderTalentPortal()}
        </div>

        <Dialog
          open={sendDeliverableOpen}
          onOpenChange={(open) => {
            setSendDeliverableOpen(open);
            if (!open) {
              setSendDeliverableFiles([]);
              setSendDeliverableRequestId("");
              setSendDeliverableRequestMeta(null);
              sendDeliverablePreviewUrls.forEach((url) => {
                if (String(url).startsWith("blob:")) URL.revokeObjectURL(url);
              });
              setSendDeliverablePreviewUrls([]);
            }
          }}
        >
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Send deliverable</DialogTitle>
              <DialogDescription>
                {sendDeliverableRequestId
                  ? "Upload deliverables for the agency request."
                  : "Upload a deliverable, choose the connected brand, and select the campaign offer."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {sendDeliverableRequestId && sendDeliverableRequestMeta && (
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-white border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                    {sendDeliverableRequestMeta.agency_logo_url ? (
                      <img
                        src={sendDeliverableRequestMeta.agency_logo_url}
                        alt={sendDeliverableRequestMeta.agency_name || "Agency"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      String(sendDeliverableRequestMeta.agency_name || "A")
                        .slice(0, 1)
                        .toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {sendDeliverableRequestMeta.agency_name || "Agency"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {sendDeliverableRequestMeta.offer_title ||
                        sendDeliverableRequestMeta.campaign_name ||
                        "Campaign offer"}
                    </div>
                  </div>
                </div>
              )}
              {(() => {
                const selectedOffer = brandOffers.find(
                  (o) => String(o.id) === sendDeliverableOfferId,
                );
                const isPaid =
                  String(selectedOffer?.payment_status || "").toLowerCase() ===
                  "paid";
                if (sendDeliverableOfferId && !isPaid) {
                  return (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                      <span className="text-amber-700 text-sm font-semibold">
                        ⏳ Awaiting brand payment before deliverables can be
                        uploaded.
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
              <div className="space-y-2">
                <Label htmlFor="deliverable-upload">Upload deliverables</Label>
                <Input
                  id="deliverable-upload"
                  type="file"
                  multiple
                  onChange={(e) => {
                    const selectedFiles = Array.from(e.target.files || []);
                    if (selectedFiles.length === 0) return;
                    const nextFiles = [
                      ...sendDeliverableFiles,
                      ...selectedFiles,
                    ];
                    const nextPreviewUrls = [...sendDeliverablePreviewUrls];
                    selectedFiles.forEach((file) => {
                      if (
                        file.type.startsWith("image/") ||
                        file.type.startsWith("video/")
                      ) {
                        nextPreviewUrls.push(URL.createObjectURL(file));
                      } else {
                        nextPreviewUrls.push("");
                      }
                    });
                    setSendDeliverableFiles(nextFiles);
                    setSendDeliverablePreviewUrls(nextPreviewUrls);
                    e.target.value = "";
                  }}
                />
                <p className="text-xs text-gray-500">
                  Uploaded assets will be stored and shared as downloadable
                  links.
                </p>
                {sendDeliverableFiles.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {sendDeliverableFiles.map((file, idx) => (
                      <div
                        key={`${file.name}-${idx}`}
                        className="border border-gray-200 rounded-md p-2 bg-white"
                      >
                        {sendDeliverablePreviewUrls[idx] ? (
                          sendDeliverableFiles[idx]?.type?.startsWith(
                            "video/",
                          ) ? (
                            <video
                              src={sendDeliverablePreviewUrls[idx]}
                              controls
                              className="h-40 w-auto max-w-full rounded border border-gray-200 bg-black"
                            />
                          ) : (
                            <img
                              src={sendDeliverablePreviewUrls[idx]}
                              alt={`Deliverable preview ${idx + 1}`}
                              className="h-32 w-auto max-w-full rounded border border-gray-200 object-cover bg-white"
                            />
                          )
                        ) : null}
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <p className="text-xs text-gray-700 truncate">
                            {file.name}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            className="border-gray-300"
                            onClick={() => {
                              const nextFiles = sendDeliverableFiles.filter(
                                (_f, index) => index !== idx,
                              );
                              const nextUrls = [...sendDeliverablePreviewUrls];
                              const removedUrl = nextUrls[idx];
                              if (String(removedUrl).startsWith("blob:")) {
                                URL.revokeObjectURL(removedUrl);
                              }
                              nextUrls.splice(idx, 1);
                              setSendDeliverableFiles(nextFiles);
                              setSendDeliverablePreviewUrls(nextUrls);
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {!sendDeliverableRequestId && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="deliverable-brand">Select brand</Label>
                    <select
                      id="deliverable-brand"
                      value={sendDeliverableBrandId}
                      onChange={(e) => {
                        setSendDeliverableBrandId(e.target.value);
                        setSendDeliverableOfferId("");
                      }}
                      className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm"
                    >
                      <option value="">Select connected brand</option>
                      {brandConnections.map((c: any) => (
                        <option
                          key={String(c?.brand_id || c?.id)}
                          value={String(c?.brand_id || "")}
                        >
                          {resolveConnectedBrandName(c)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deliverable-campaign">
                      Select campaign
                    </Label>
                    <select
                      id="deliverable-campaign"
                      value={sendDeliverableOfferId}
                      onChange={(e) => {
                        const offerId = e.target.value;
                        setSendDeliverableOfferId(offerId);
                        const selected = brandOffers.find(
                          (offer: any) => String(offer?.id || "") === offerId,
                        );
                        const selectedBrandId = String(
                          selected?.brand_id || "",
                        );
                        if (selectedBrandId) {
                          setSendDeliverableBrandId(selectedBrandId);
                        }
                      }}
                      className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm"
                    >
                      <option value="">Select campaign offer</option>
                      {campaignOptions.map((offer: any) => (
                        <option
                          key={String(offer?.id)}
                          value={String(offer?.id)}
                        >
                          {String(
                            offer?.brand_campaigns?.name ||
                              offer?.offer_title ||
                              "Campaign offer",
                          )}
                        </option>
                      ))}
                    </select>
                    {sendDeliverableBrandId && campaignOptions.length === 0 && (
                      <p className="text-xs text-amber-700">
                        No campaign offers found for this brand yet.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
            <DialogFooter className="mt-3">
              <Button
                variant="outline"
                onClick={() => {
                  setSendDeliverableOpen(false);
                  setSendDeliverableFiles([]);
                  sendDeliverablePreviewUrls.forEach((url) => {
                    if (String(url).startsWith("blob:"))
                      URL.revokeObjectURL(url);
                  });
                  setSendDeliverablePreviewUrls([]);
                }}
                disabled={offerActionLoading}
              >
                Cancel
              </Button>
              <Button
                className="bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
                onClick={sendDeliverable}
                disabled={
                  offerActionLoading ||
                  (sendDeliverableOfferId &&
                    (() => {
                      const selectedOffer = brandOffers.find(
                        (o) => String(o.id) === sendDeliverableOfferId,
                      );
                      return (
                        String(
                          selectedOffer?.payment_status || "",
                        ).toLowerCase() !== "paid"
                      );
                    })())
                }
              >
                {offerActionLoading ? "Sending..." : "Send"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Mobile Footer */}
        {isSmallScreen && (
          <footer className="bg-white border-t border-gray-200 px-6 py-6">
            <div className="space-y-6 text-center">
              {/* Logo and Tagline - Centered */}
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2">
                  <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/eaaf29851_Screenshot2025-10-12at31742PM.png"
                    alt="Likelee Logo"
                    className="w-10 h-10"
                  />
                  <span className="font-bold text-lg font-display">
                    Likelee
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  The Verified Talent Ecosystem for AI-powered Media.
                </p>
              </div>

              {/* Resources - Centered */}
              <div>
                <h3 className="font-bold text-sm text-gray-900 mb-3 uppercase tracking-wider">
                  RESOURCES
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => navigate("#")}
                    className="block w-full text-sm text-gray-600 hover:text-gray-900"
                  >
                    Blog
                  </button>
                  <button
                    onClick={() => navigate("/Impact")}
                    className="block w-full text-sm text-gray-600 hover:text-gray-900"
                  >
                    Impact
                  </button>
                  <button
                    onClick={() => navigate("/Support")}
                    className="block w-full text-sm text-gray-600 hover:text-gray-900"
                  >
                    Support
                  </button>
                  <button
                    onClick={() => navigate("/SalesInquiry")}
                    className="block w-full text-sm text-gray-600 hover:text-gray-900"
                  >
                    Contact Us
                  </button>
                </div>
              </div>

              {/* Legal & Compliance - Centered */}
              <div>
                <h3 className="font-bold text-sm text-gray-900 mb-3 uppercase tracking-wider">
                  LEGAL & COMPLIANCE
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => navigate("/SAGAFTRAAlignment")}
                    className="block w-full text-sm text-gray-600 hover:text-gray-900"
                  >
                    SAG-AFTRA Alignment
                  </button>
                  <button
                    onClick={() => navigate("/PrivacyPolicy")}
                    className="block w-full text-sm text-gray-600 hover:text-gray-900"
                  >
                    Privacy Policy
                  </button>
                  <button
                    onClick={() => navigate("/CommercialRights")}
                    className="block w-full text-sm text-gray-600 hover:text-gray-900"
                  >
                    Commercial Rights
                  </button>
                </div>
              </div>

              {/* Company - Centered */}
              <div>
                <h3 className="font-bold text-sm text-gray-900 mb-3 uppercase tracking-wider">
                  COMPANY
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => navigate("/AboutUs")}
                    className="block w-full text-sm text-gray-600 hover:text-gray-900"
                  >
                    About Us
                  </button>
                  <button
                    onClick={() => navigate("/ReserveProfile")}
                    className="block w-full text-sm text-gray-600 hover:text-gray-900"
                  >
                    Creators
                  </button>
                </div>
              </div>

              {/* Copyright */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  © {new Date().getFullYear()} Likelee. All rights reserved.
                </p>
              </div>
            </div>
          </footer>
        )}
      </main>

      {/* Pause License Modal */}
      <Dialog open={showPauseModal} onOpenChange={setShowPauseModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              {t("creatorDashboard.contracts.modals.pause.title")}
            </DialogTitle>
          </DialogHeader>

          {selectedContract &&
            (() => {
              const contract = normalizedContracts.find(
                (c) => c.id === selectedContract,
              );
              if (!contract) return null;
              const currentMonth = new Date().toLocaleString(i18n.language, {
                month: "long",
              });
              const proratedAmount = Math.round(
                contract.creator_earnings * (new Date().getDate() / 30),
              );

              return (
                <div className="py-4 space-y-6">
                  <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-lg flex gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-amber-900 text-sm">
                      <p className="font-bold">
                        {t(
                          "creatorDashboard.contracts.modals.pause.warningTitle",
                        )}
                      </p>
                      <p className="mt-2">
                        {t(
                          "creatorDashboard.contracts.modals.pause.warningDescription",
                        )}
                      </p>
                      <ul className="list-disc ml-4 mt-1 space-y-1">
                        <li>
                          {t(
                            "creatorDashboard.contracts.modals.pause.warningBullets.noPayment",
                            { month: currentMonth },
                          )}
                        </li>
                        <li>
                          {t(
                            "creatorDashboard.contracts.modals.pause.warningBullets.earnedSoFar",
                            { amount: proratedAmount },
                          )}
                        </li>
                        <li>
                          {t(
                            "creatorDashboard.contracts.modals.pause.warningBullets.forfeited",
                          )}
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Card
                      className="p-6 border-2 border-red-300 hover:border-red-400 cursor-pointer transition-all"
                      onClick={() => handlePauseLicense(contract, true)}
                    >
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        {t(
                          "creatorDashboard.contracts.modals.pause.option1.title",
                        )}
                      </h3>
                      <div className="space-y-2 text-sm text-gray-700 mb-4">
                        <p>
                          <strong>
                            {t(
                              "creatorDashboard.contracts.modals.pause.option1.effective",
                            )}
                          </strong>{" "}
                          {t(
                            "creatorDashboard.contracts.modals.pause.option1.effectiveToday",
                          )}
                        </p>
                        <p>
                          <strong>
                            {t(
                              "creatorDashboard.contracts.modals.pause.option1.thisMonthPayment",
                            )}
                          </strong>{" "}
                          <span className="text-red-600 font-bold">
                            {t(
                              "creatorDashboard.contracts.modals.pause.option1.forfeited",
                              { amount: proratedAmount },
                            )}
                          </span>
                        </p>
                        <p>
                          <strong>
                            {t(
                              "creatorDashboard.contracts.modals.pause.option1.nextMonthPayment",
                            )}
                          </strong>{" "}
                          <span className="text-red-600">
                            {t(
                              "creatorDashboard.contracts.modals.pause.option1.paused",
                            )}
                          </span>
                        </p>
                      </div>
                      <p className="text-sm text-gray-600">
                        {t(
                          "creatorDashboard.contracts.modals.pause.option1.description",
                        )}
                      </p>
                    </Card>

                    <Card
                      className="p-6 border-2 border-green-300 hover:border-green-400 cursor-pointer transition-all"
                      onClick={() => handlePauseLicense(contract, false)}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <Badge className="bg-green-500 text-white">
                          {t(
                            "creatorDashboard.contracts.modals.pause.option2.recommended",
                          )}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        {t(
                          "creatorDashboard.contracts.modals.pause.option2.title",
                        )}
                      </h3>
                      <div className="space-y-2 text-sm text-gray-700 mb-4">
                        <p>
                          <strong>
                            {t(
                              "creatorDashboard.contracts.modals.pause.option2.effective",
                            )}
                          </strong>{" "}
                          {new Date(
                            new Date().getFullYear(),
                            new Date().getMonth() + 1,
                            1,
                          ).toLocaleDateString(i18n.language)}
                        </p>
                        <p>
                          <strong>
                            {t(
                              "creatorDashboard.contracts.modals.pause.option2.thisMonthPayment",
                            )}
                          </strong>{" "}
                          <span className="text-green-600 font-bold">
                            {t(
                              "creatorDashboard.contracts.modals.pause.option2.willBePaid",
                              { amount: contract.creator_earnings },
                            )}
                          </span>
                        </p>
                        <p>
                          <strong>
                            {t(
                              "creatorDashboard.contracts.modals.pause.option2.nextMonthPayment",
                            )}
                          </strong>{" "}
                          <span className="text-red-600">
                            {t(
                              "creatorDashboard.contracts.modals.pause.option2.paused",
                            )}
                          </span>
                        </p>
                      </div>
                      <p className="text-sm text-gray-600">
                        {t(
                          "creatorDashboard.contracts.modals.pause.option2.description",
                        )}
                      </p>
                    </Card>
                  </div>

                  <div className="text-center">
                    <Button
                      variant="outline"
                      onClick={() => setShowPauseModal(false)}
                      className="border-2 border-gray-300"
                    >
                      {t("creatorDashboard.contracts.modals.pause.cancel")}
                    </Button>
                  </div>
                </div>
              );
            })()}
        </DialogContent>
      </Dialog>

      {/* Revoke License Modal */}
      <Dialog open={showRevokeModal} onOpenChange={setShowRevokeModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              {t("creatorDashboard.contracts.modals.revoke.title")}
            </DialogTitle>
          </DialogHeader>

          {selectedContract &&
            (() => {
              const contract = normalizedContracts.find(
                (c) => c.id === selectedContract,
              );
              if (!contract) return null;
              const revocationDate = new Date();
              const finalDate = new Date(revocationDate);
              finalDate.setDate(finalDate.getDate() + 30);

              return (
                <div className="py-4 space-y-6">
                  <div className="bg-red-50 border-2 border-red-300 p-4 rounded-lg flex gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="text-red-900 text-sm">
                      <p className="font-bold">
                        {t(
                          "creatorDashboard.contracts.modals.revoke.whatHappens",
                        )}
                      </p>
                      <ul className="list-disc ml-4 mt-1 space-y-1">
                        <li>
                          {t(
                            "creatorDashboard.contracts.modals.revoke.bullets.endPermanently",
                          )}
                        </li>
                        <li>
                          {t(
                            "creatorDashboard.contracts.modals.revoke.bullets.noticePeriod",
                          )}
                        </li>
                        <li>
                          {t(
                            "creatorDashboard.contracts.modals.revoke.bullets.takedown",
                          )}
                        </li>
                        <li>
                          {t(
                            "creatorDashboard.contracts.modals.revoke.bullets.earningsStop",
                          )}
                        </li>
                        <li>
                          {t(
                            "creatorDashboard.contracts.modals.revoke.bullets.cannotReactivate",
                          )}
                        </li>
                      </ul>
                    </div>
                  </div>

                  <Card className="p-6 bg-gray-50 border border-gray-200">
                    <h3 className="font-bold text-gray-900 mb-4">
                      {t(
                        "creatorDashboard.contracts.modals.revoke.timeline.title",
                      )}
                    </h3>
                    <div className="relative">
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-center flex-1">
                          <p className="text-sm text-gray-600 mb-1">
                            {t(
                              "creatorDashboard.contracts.modals.revoke.timeline.noticeStarts",
                            )}
                          </p>
                          <p className="font-bold text-gray-900">
                            {revocationDate.toLocaleDateString(i18n.language)}
                          </p>
                        </div>
                        <div className="text-center flex-1">
                          <p className="text-sm text-gray-600 mb-1">
                            {t(
                              "creatorDashboard.contracts.modals.revoke.timeline.finalTakedown",
                            )}
                          </p>
                          <p className="font-bold text-gray-900">
                            {finalDate.toLocaleDateString(i18n.language)}
                          </p>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full">
                        <div className="h-full w-0 bg-red-500 rounded-full"></div>
                      </div>
                    </div>
                    <div className="mt-6 space-y-2 text-sm">
                      <p className="text-gray-700">
                        <strong>
                          {t(
                            "creatorDashboard.contracts.modals.revoke.days1to30",
                            {
                              brand: contract.brand,
                            },
                          )}
                        </strong>
                      </p>
                      <p className="text-gray-700">
                        <strong>
                          {t("creatorDashboard.contracts.modals.revoke.day30")}
                        </strong>
                      </p>
                      <p className="text-gray-700">
                        <strong>
                          {t(
                            "creatorDashboard.contracts.modals.revoke.finalPayment",
                            {
                              amount: contract.creator_earnings,
                              date: finalDate.toLocaleDateString(i18n.language),
                            },
                          )}
                        </strong>
                      </p>
                    </div>
                  </Card>

                  <div>
                    <Label className="text-sm font-medium text-gray-700 block mb-2">
                      {t(
                        "creatorDashboard.contracts.modals.revoke.reasonLabel",
                      )}
                    </Label>
                    <Textarea
                      placeholder={t(
                        "creatorDashboard.contracts.modals.revoke.reasonPlaceholder",
                      )}
                      className="border-2 border-gray-300"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowRevokeModal(false)}
                      className="flex-1 border-2 border-gray-300"
                    >
                      {t("creatorDashboard.contracts.modals.revoke.cancel")}
                    </Button>
                    <Button
                      onClick={() => handleRevokeLicense(contract)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    >
                      <XCircle className="w-5 h-5 mr-2" />
                      {t("creatorDashboard.contracts.modals.revoke.confirm")}
                    </Button>
                  </div>
                </div>
              );
            })()}
        </DialogContent>
      </Dialog>

      {/* Image Upload Modal */}
      <Dialog
        open={showImageUploadModal}
        onOpenChange={setShowImageUploadModal}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              {t("creatorDashboard.uploadModal.modalTitle")}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-6 overflow-y-auto pr-2 max-h-[65vh]">
            {selectedImageSection &&
              (() => {
                const section = IMAGE_SECTIONS.find(
                  (s) => s.id === selectedImageSection,
                );
                if (!section) return null;

                return (
                  <>
                    <div>
                      <p className="text-gray-700 mb-2">
                        <strong>
                          {t("creatorDashboard.uploadModal.sectionLabel")}
                        </strong>{" "}
                        {section.title}
                      </p>
                      <p className="text-gray-600">
                        <strong>
                          {t("creatorDashboard.uploadModal.bestForLabel")}
                        </strong>{" "}
                        {section.bestFor}
                      </p>
                    </div>

                    <Card className="p-4 bg-gray-50 border border-gray-200">
                      <h4 className="font-bold text-gray-900 mb-3">
                        {t("creatorDashboard.uploadModal.requirementsTitle")}
                      </h4>
                      <div className="space-y-2 text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-green-600" />
                          <p>{t("creatorDashboard.uploadModal.resolution")}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-green-600" />
                          <p>{t("creatorDashboard.uploadModal.faceVisible")}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-green-600" />
                          <p>
                            {t("creatorDashboard.uploadModal.goodLighting")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-green-600" />
                          <p>{t("creatorDashboard.uploadModal.recentPhoto")}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-green-600" />
                          <p>{t("creatorDashboard.uploadModal.noFilters")}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-green-600" />
                          <p>
                            {t(
                              "creatorDashboard.uploadModal.professionalQuality",
                            )}
                          </p>
                        </div>
                      </div>
                    </Card>

                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#32C8D1] transition-colors">
                      <input
                        type="file"
                        id="sectionImageUpload"
                        accept="image/*"
                        onChange={handleImageFileSelect}
                        className="hidden"
                      />
                      <label
                        htmlFor="sectionImageUpload"
                        className="cursor-pointer"
                      >
                        <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-700 font-medium mb-2">
                          {t("creatorDashboard.uploadModal.dragOrClick")}
                        </p>
                        <p className="text-sm text-gray-500">
                          {t("creatorDashboard.uploadModal.fileInfo")}
                        </p>
                      </label>
                    </div>

                    {previewImage && (
                      <div>
                        <h4 className="font-bold text-gray-900 mb-3">
                          {t("creatorDashboard.uploadModal.preview")}
                        </h4>
                        <img
                          src={previewImage.url}
                          alt="Preview"
                          className="w-full max-h-[50vh] object-contain border-2 border-gray-200 rounded-lg mb-4"
                        />
                      </div>
                    )}

                    <div className="flex gap-3 sticky bottom-0 bg-white pt-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowImageUploadModal(false);
                          setPreviewImage(null);
                          setSelectedImageSection(null);
                        }}
                        className="flex-1 border-2 border-gray-300"
                      >
                        {t("creatorDashboard.uploadModal.cancel")}
                      </Button>
                      <Button
                        onClick={confirmImageUpload}
                        disabled={!previewImage || uploadingToSection}
                        className="flex-1 bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
                      >
                        {uploadingToSection ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {t("creatorDashboard.uploadModal.uploading")}
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            {t("creatorDashboard.uploadModal.upload")}
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                );
              })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Recording Modal */}
      <Dialog open={showRecordingModal} onOpenChange={setShowRecordingModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              {t("creatorDashboard.voice.recordingModal.title", {
                emotion: t(
                  `creatorDashboard.voice.emotionNames.${selectedEmotion?.toLowerCase()}`,
                  selectedEmotion,
                ),
              })}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {isCountingDown ? (
              <div className="text-center py-12 animate-in fade-in zoom-in-95 duration-300">
                <div className="text-8xl font-black text-[#32C8D1] tabular-nums">
                  {countdown}
                </div>
                <p className="text-xl font-bold text-gray-400 mt-4 uppercase tracking-widest">
                  Get ready...
                </p>
                <div className="mt-8 opacity-40 grayscale pointer-events-none">
                  {renderScript()}
                </div>
              </div>
            ) : !isRecording ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-[#32C8D1] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Mic className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {t("creatorDashboard.voice.recordingModal.ready")}
                </h3>
                <p className="text-gray-600 mb-6">
                  {t("creatorDashboard.voice.recordingModal.instruction")}
                </p>
                <Button
                  onClick={startRecording}
                  className="h-14 px-8 bg-red-500 hover:bg-red-600 text-white text-lg"
                >
                  <Mic className="w-5 h-5 mr-2" />
                  {t("creatorDashboard.voice.recordingModal.start")}
                </Button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-2xl font-bold text-gray-900">
                    {Math.floor(recordingTime / 60)}:
                    {(recordingTime % 60).toString().padStart(2, "0")}
                  </span>
                </div>

                {renderScript()}

                <div className="flex justify-center gap-4 mt-6">
                  <Button
                    onClick={stopRecording}
                    className="h-12 px-8 bg-red-500 hover:bg-red-600 text-white"
                  >
                    <Square className="w-5 h-5 mr-2" />
                    {t("creatorDashboard.voice.recordingModal.stop")}
                  </Button>
                </div>

                <Progress
                  value={(recordingTime / 60) * 100}
                  className="mt-6 h-2"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showRatesModal === "content"}
        onOpenChange={() => setShowRatesModal(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl rounded-2xl">
          <DialogHeader className="p-6 bg-white border-b border-gray-100 relative">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              {t("creatorDashboard.modals.customizeContentTypeRate.title")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t(
                "creatorDashboard.modals.customizeContentTypeRate.description",
              )}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSaveRates}
            className="flex-1 overflow-y-auto p-6 space-y-8"
          >
            <div>
              <p className="text-sm text-gray-600 mb-4 font-normal">
                {t(
                  "creatorDashboard.modals.customizeContentTypeRate.description",
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {getTranslatedContentTypes().map((type, index) => {
                  const originalType = CONTENT_TYPES[index];
                  const isSelected = tempContentTypes.includes(originalType);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        const originalType = CONTENT_TYPES[index];
                        setTempContentTypes((prev) =>
                          prev.includes(originalType)
                            ? prev.filter((t) => t !== originalType)
                            : [...prev, originalType],
                        );
                      }}
                      className={`px-2.5 py-1 rounded-lg border-2 text-xs font-normal transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-[#32C8D1] border-[#32C8D1] text-white"
                          : "bg-gray-50 border-gray-100 text-gray-600 hover:border-gray-200"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      <span className="truncate">{type}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <h4 className="text-base font-semibold text-gray-900 mb-1">
                {t(
                  "creatorDashboard.modals.customizeContentTypeRate.customRatesTitle",
                )}
              </h4>
              <p className="text-sm text-gray-600 mb-2 font-normal">
                {t(
                  "creatorDashboard.modals.customizeContentTypeRate.customRatesDesc",
                  { rate: creator.price_per_month || 0 },
                )}
              </p>

              <div className="space-y-3">
                {tempContentTypes
                  .filter(
                    (type) =>
                      type !== "Social-medial ads" &&
                      type !== "Social-media ads",
                  )
                  .map((type) => {
                    const info = type;
                    const existing = customRates.find(
                      (r) =>
                        r.rate_type === "content_type" && r.rate_name === type,
                    );

                    return (
                      <div
                        key={type}
                        className="bg-gray-50/50 border border-gray-100 rounded-xl p-4 flex items-center justify-between"
                      >
                        <div>
                          <Label className="font-medium text-gray-900 text-base block mb-0.5">
                            {translateContentType(type)}
                          </Label>
                          <p className="text-xs text-gray-400 font-normal italic">
                            {t(
                              "creatorDashboard.modals.customizeContentTypeRate.usingBaseRate",
                              { rate: creator.price_per_month || 0 },
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-lg font-medium text-gray-900">
                              $
                            </span>
                            <Input
                              type="number"
                              name={`rate_content_${type}`}
                              defaultValue={
                                existing
                                  ? (
                                      existing.price_per_month_cents / 100
                                    ).toString()
                                  : (creator.price_per_month || 0).toString()
                              }
                              className="w-24 h-9 bg-white border-gray-200 focus:ring-[#32C8D1] focus:border-[#32C8D1] rounded-lg font-normal text-gray-900 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-auto [&::-webkit-inner-spin-button]:appearance-auto [&::-webkit-inner-spin-button]:opacity-100 [&::-webkit-outer-spin-button]:opacity-100"
                              min="0"
                            />
                          </div>
                          <div className="flex flex-col -space-y-0.5 text-gray-900 font-medium leading-tight">
                            <span className="text-lg">/</span>
                            <span className="text-base text-[10px]">mo</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="flex justify-center gap-3 mt-6 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRatesModal(null)}
                className="h-11 w-full font-medium border-2 border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl"
              >
                {t("creatorDashboard.modals.customizeContentTypeRate.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={savingRates}
                className="h-11 w-full font-semibold bg-[#32C8D1] hover:bg-[#2AB8C1] text-white rounded-xl shadow-lg shadow-[#32C8D1]/20 flex items-center justify-center gap-2"
              >
                {savingRates ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    {t(
                      "creatorDashboard.modals.customizeContentTypeRate.saveChanges",
                    )}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showRatesModal === "industry"}
        onOpenChange={() => setShowRatesModal(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl rounded-2xl">
          <DialogHeader className="p-6 bg-white border-b border-gray-100 relative">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              {t("creatorDashboard.modals.customizeIndustryRate.title")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t("creatorDashboard.modals.customizeIndustryRate.description")}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSaveRates}
            className="flex-1 overflow-y-auto p-6 space-y-6"
          >
            <div>
              <p className="text-sm text-gray-600 mb-2 font-normal">
                {t("creatorDashboard.modals.customizeIndustryRate.description")}
              </p>
              <div className="flex flex-wrap gap-2">
                {getTranslatedIndustries().map((industry, index) => {
                  const originalIndustry = INDUSTRIES[index];
                  const isSelected = tempIndustries.includes(originalIndustry);
                  return (
                    <button
                      key={industry}
                      type="button"
                      onClick={() => {
                        const originalIndustry = INDUSTRIES[index];
                        setTempIndustries((prev) =>
                          prev.includes(originalIndustry)
                            ? prev.filter((i) => i !== originalIndustry)
                            : [...prev, originalIndustry],
                        );
                      }}
                      className={`px-2.5 py-1 rounded-lg border-2 text-xs font-normal transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-[#32C8D1] border-[#32C8D1] text-white"
                          : "bg-gray-50 border-gray-100 text-gray-600 hover:border-gray-200"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      <span className="truncate">{industry}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-center gap-3 mt-6 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRatesModal(null)}
                className="h-11 w-full font-medium border-2 border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl"
              >
                {t("creatorDashboard.modals.customizeIndustryRate.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={savingRates}
                className="h-11 w-full font-semibold bg-[#32C8D1] hover:bg-[#2AB8C1] text-white rounded-xl shadow-lg shadow-[#32C8D1]/20 flex items-center justify-center gap-2"
              >
                {savingRates ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    {t(
                      "creatorDashboard.modals.customizeIndustryRate.saveChanges",
                    )}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showRestrictionsModal}
        onOpenChange={() => setShowRestrictionsModal(false)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl rounded-2xl">
          <DialogHeader className="p-6 bg-white border-b border-gray-100 relative">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              {t("creatorDashboard.modals.contentRestrictions.title")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t("creatorDashboard.modals.contentRestrictions.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <p className="text-sm text-gray-600 font-normal">
              {t("creatorDashboard.modals.contentRestrictions.description")}
            </p>

            {/* Current Restrictions Section */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                {t(
                  "creatorDashboard.modals.contentRestrictions.currentRestrictions",
                )}
              </h4>
              <div className="flex flex-wrap gap-2">
                {creator.content_restrictions &&
                creator.content_restrictions.length > 0 ? (
                  creator.content_restrictions.map((restriction) => (
                    <Badge
                      key={restriction}
                      className="px-3 py-1.5 text-sm bg-[#F34D4D] text-white border-none hover:bg-[#E23C3C] cursor-default flex items-center gap-2 rounded-lg font-normal"
                    >
                      <span>{translateRestriction(restriction)}</span>
                      <button
                        onClick={() => {
                          setCreator({
                            ...creator,
                            content_restrictions: (
                              creator.content_restrictions || []
                            ).filter((r) => r !== restriction),
                          });
                        }}
                        className="hover:scale-110 transition-transform ml-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </Badge>
                  ))
                ) : (
                  <p className="text-xs text-gray-400 font-normal italic">
                    {t(
                      "creatorDashboard.modals.contentRestrictions.currentRestrictions",
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Predefined Selection Grid */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                {t("creatorDashboard.modals.contentRestrictions.clickToAdd")}
              </h4>
              <div className="flex flex-wrap gap-2">
                {getTranslatedRestrictions().map((restriction, index) => {
                  const originalRestriction = RESTRICTIONS[index];
                  if (
                    creator.content_restrictions?.includes(originalRestriction)
                  )
                    return null;
                  return (
                    <button
                      key={restriction}
                      onClick={() => {
                        const originalRestriction = RESTRICTIONS[index];
                        const current = creator.content_restrictions || [];
                        if (!current.includes(originalRestriction)) {
                          setCreator({
                            ...creator,
                            content_restrictions: [
                              ...current,
                              originalRestriction,
                            ],
                          });
                        }
                      }}
                      className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 rounded-lg flex items-center gap-2 font-normal transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      {restriction}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Restriction Input */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">
                {t(
                  "creatorDashboard.modals.contentRestrictions.addCustomRestriction",
                )}
              </h4>
              <div className="flex gap-2">
                <Input
                  placeholder={t(
                    "creatorDashboard.modals.contentRestrictions.customPlaceholder",
                  )}
                  value={newRestriction}
                  onChange={(e) => setNewRestriction(e.target.value)}
                  maxLength={25}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (newRestriction.trim()) {
                        const current = creator.content_restrictions || [];
                        if (!current.includes(newRestriction.trim())) {
                          setCreator({
                            ...creator,
                            content_restrictions: [
                              ...current,
                              newRestriction.trim(),
                            ],
                          });
                        }
                        setNewRestriction("");
                      }
                    }
                  }}
                  className="flex-1 h-11 border-gray-200 rounded-xl focus:ring-[#F34D4D] focus:border-[#F34D4D] text-sm font-normal"
                />
                <Button
                  onClick={() => {
                    if (newRestriction.trim()) {
                      const current = creator.content_restrictions || [];
                      if (!current.includes(newRestriction.trim())) {
                        setCreator({
                          ...creator,
                          content_restrictions: [
                            ...current,
                            newRestriction.trim(),
                          ],
                        });
                      }
                      setNewRestriction("");
                    }
                  }}
                  className="h-11 w-11 bg-[#F34D4D] hover:bg-[#E23C3C] text-white rounded-xl flex items-center justify-center shadow-lg shadow-[#F34D4D]/20 transition-all hover:scale-105 active:scale-95"
                >
                  <Plus className="w-5 h-5 font-bold" />
                </Button>
              </div>
            </div>

            {/* Brand Exclusivity Section */}
            <div className="pt-6 border-t border-gray-100 space-y-4">
              <h4 className="text-base font-semibold text-gray-900">
                {t(
                  "creatorDashboard.modals.contentRestrictions.brandExclusivity",
                )}
              </h4>
              <p className="text-sm text-gray-600 font-normal">
                {t(
                  "creatorDashboard.settingsView.rules.conflictingCampaignsDesc",
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {!creator.brand_exclusivity ||
                creator.brand_exclusivity.length === 0 ? (
                  <p className="text-sm text-gray-400 font-normal italic">
                    {t(
                      "creatorDashboard.settingsView.rules.noBrandExclusivity",
                    )}
                  </p>
                ) : (
                  creator.brand_exclusivity.map((brand) => (
                    <Badge
                      key={brand}
                      className="px-3 py-1.5 text-sm bg-amber-100/50 text-amber-800 border-2 border-amber-200 hover:bg-amber-200/50 cursor-default flex items-center gap-2 rounded-lg font-normal"
                    >
                      {brand}
                      <button
                        onClick={() => {
                          setCreator({
                            ...creator,
                            brand_exclusivity: (
                              creator.brand_exclusivity || []
                            ).filter((b) => b !== brand),
                          });
                        }}
                        className="hover:scale-110 transition-transform ml-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder={"e.g., Nike, Adidas"}
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  maxLength={25}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (newBrand.trim()) {
                        const current = creator.brand_exclusivity || [];
                        if (!current.includes(newBrand.trim())) {
                          setCreator({
                            ...creator,
                            brand_exclusivity: [...current, newBrand.trim()],
                          });
                        }
                        setNewBrand("");
                      }
                    }
                  }}
                  className="flex-1 h-11 border-gray-200 rounded-xl focus:ring-[#F59E0B] focus:border-[#F59E0B] text-sm font-normal"
                />
                <Button
                  onClick={() => {
                    if (newBrand.trim()) {
                      const current = creator.brand_exclusivity || [];
                      if (!current.includes(newBrand.trim())) {
                        setCreator({
                          ...creator,
                          brand_exclusivity: [...current, newBrand.trim()],
                        });
                      }
                      setNewBrand("");
                    }
                  }}
                  className="h-11 w-11 bg-[#F59E0B] hover:bg-[#D97706] text-white rounded-xl flex items-center justify-center shadow-lg shadow-[#F59E0B]/20 transition-all hover:scale-105 active:scale-95"
                >
                  <Plus className="w-5 h-5 font-bold" />
                </Button>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white border-t border-gray-100 flex justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowRestrictionsModal(false)}
              className="h-12 w-full max-w-[240px] font-medium border-2 border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl"
            >
              {t("creatorDashboard.modals.contentRestrictions.cancel")}
            </Button>
            <Button
              onClick={() => {
                handleSaveRules(t("creatorDashboard.toasts.restrictionsSaved"));
                setShowRestrictionsModal(false);
              }}
              className="h-12 w-full max-w-[240px] font-semibold bg-[#32C8D1] hover:bg-[#2AB8C1] text-white rounded-xl shadow-lg shadow-[#32C8D1]/20 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              {t("creatorDashboard.modals.contentRestrictions.saveChanges")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payout Settings Modal */}
      <Dialog open={showPayoutSettings} onOpenChange={setShowPayoutSettings}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Payout Settings
            </DialogTitle>
            <DialogDescription>
              Choose how you want to receive your earnings
            </DialogDescription>
          </DialogHeader>

          {isLoadingPayout && (
            <div className="absolute inset-0 z-50 bg-white/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3 rounded-lg">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <p className="text-sm text-gray-700">Setting up payouts…</p>
            </div>
          )}

          <div className="space-y-6 py-4">
            <div className="grid gap-4">
              {/* Stripe Connect */}
              <div
                onClick={() => setPayoutMethod("stripe")}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  payoutMethod === "stripe"
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                      payoutMethod === "stripe"
                        ? "border-emerald-500"
                        : "border-gray-300"
                    }`}
                  >
                    {payoutMethod === "stripe" && (
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          Stripe Connect
                        </h3>
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
                          Recommended
                        </Badge>
                      </div>
                      <img
                        src="https://www.vectorlogo.zone/logos/stripe/stripe-icon.svg"
                        className="h-6 w-auto opacity-80"
                        alt="Stripe"
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Connect your existing Stripe account or create a new one.
                      Fast, secure, and supports multiple currencies.
                    </p>
                    {payoutAccountStatus?.bank_last4 && (
                      <div className="mt-2 flex items-center gap-2 text-emerald-700 bg-emerald-100/50 w-fit px-2 py-1 rounded-md text-sm border border-emerald-200">
                        <CreditCard className="w-4 h-4" />
                        <span>
                          Connected: •••• {payoutAccountStatus.bank_last4}
                        </span>
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">
                        Instant Setup
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Multiple Currencies
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Direct Deposit
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* PayPal - Coming Soon */}
              <div className="p-4 border-2 rounded-lg border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed relative">
                <div className="absolute top-2 right-2">
                  <Badge className="bg-amber-100 text-amber-700 border-amber-300">
                    Coming Soon
                  </Badge>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center border-gray-300" />
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-500">PayPal</h3>
                      <img
                        src="https://www.vectorlogo.zone/logos/paypal/paypal-icon.svg"
                        className="h-6 w-auto opacity-50"
                        alt="PayPal"
                      />
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      Receive payments directly to your PayPal account.
                    </p>
                  </div>
                </div>
              </div>

              {/* Wise - Coming Soon */}
              <div className="p-4 border-2 rounded-lg border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed relative">
                <div className="absolute top-2 right-2">
                  <Badge className="bg-amber-100 text-amber-700 border-amber-300">
                    Coming Soon
                  </Badge>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center border-gray-300" />
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-500">
                        Wise (TransferWise)
                      </h3>
                      <img
                        src="https://www.vectorlogo.zone/logos/transferwise/transferwise-icon.svg"
                        className="h-6 w-auto opacity-50"
                        alt="Wise"
                      />
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      International transfers with low fees. Great for
                      cross-border payments.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold">Important Information</p>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>
                      Stripe Connect is currently our active payout method
                    </li>
                    <li>PayPal and Wise integration is coming soon</li>
                    <li>We provide secure and fast payouts through Stripe</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPayoutSettings(false)}
              className="mr-auto"
            >
              Cancel
            </Button>

            {payoutMethod === "stripe" ? (
              <>
                <Button
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/5"
                  disabled={isLoadingPayout}
                  onClick={async () => {
                    try {
                      setIsLoadingPayout(true);
                      if (!user?.id) throw new Error("Not authenticated");
                      const { getStripeOAuthUrl } =
                        await import("@/api/functions");
                      const res = await getStripeOAuthUrl(user.id);

                      // Handle both possible response formats
                      const url = res?.data?.url || res?.url;
                      const status = res?.data?.status || res?.status;

                      if (status === "ok" && url) {
                        window.location.href = url;
                        return; // Don't reset loading state, we're redirecting
                      } else {
                        throw new Error("Failed to get onboarding URL");
                      }
                    } catch (e) {
                      console.error(e);
                      toast({
                        variant: "destructive",
                        title: "Error",
                        description: "Failed to initiate Stripe connection",
                      });
                      setIsLoadingPayout(false);
                    }
                  }}
                >
                  Link Existing Account
                </Button>
                <Button
                  disabled={isLoadingPayout}
                  onClick={async () => {
                    try {
                      setIsLoadingPayout(true);
                      const profileId = user?.id;
                      if (!profileId) throw new Error("Not authenticated");

                      const { getStripeOAuthUrl } =
                        await import("@/api/functions");
                      const res = await getStripeOAuthUrl(profileId);

                      const url = res?.data?.url || res?.url;
                      if (url) {
                        // Don't reset loading state - we're redirecting away
                        window.location.href = url;
                        return; // Exit early to prevent finally block
                      } else {
                        toast({
                          variant: "destructive",
                          title: "Error",
                          description:
                            "Failed to create Stripe onboarding link",
                        });
                        setIsLoadingPayout(false);
                      }
                    } catch (e) {
                      setIsLoadingPayout(false);
                      throw e;
                    }
                  }}
                >
                  Create New Account
                </Button>
              </>
            ) : (
              <Button
                onClick={async () => {
                  try {
                    setIsLoadingPayout(true);
                    const profileId = user?.id;
                    if (!profileId) throw new Error("Not authenticated");

                    const { updatePayoutSettings } =
                      await import("@/api/functions");
                    const result = await updatePayoutSettings({
                      profile_id: profileId,
                      preference: payoutMethod,
                      paypal_email:
                        payoutMethod === "paypal" ? paypalEmail : undefined,
                      wise_details:
                        payoutMethod === "wise"
                          ? { email: wiseDetails }
                          : undefined,
                    });

                    if (result.data?.status === "error") {
                      throw new Error(result.data?.error || "Unknown error");
                    }

                    toast({
                      title: "Success",
                      description: `${payoutMethod === "paypal" ? "PayPal" : "Wise"} payout method configured successfully! You can now withdraw funds.`,
                    });
                    setShowPayoutSettings(false);
                    await fetchPayoutStatus();
                  } catch (e) {
                    console.error(e);
                    toast({
                      description: "Failed to setup payout method",
                    });
                  } finally {
                    setIsLoadingPayout(false);
                  }
                }}
              >
                Save Settings
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Payout Modal */}
      <Dialog
        open={showRequestPayoutModal}
        onOpenChange={setShowRequestPayoutModal}
      >
        <DialogContent className="max-w-md ">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Cash Out</DialogTitle>
            <DialogDescription>
              Withdraw your earnings to your {payoutAccountStatus?.preference}{" "}
              account
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {(() => {
              const internalHeldCents =
                balances.find((b) => b.currency === "USD")?.available_cents ||
                0;
              const stripecashoutCents =
                stripeBalances.find((b) => b.currency === "USD")
                  ?.available_cents || 0;
              return (
                <div className="space-y-3">
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <WalletIcon className="h-5 w-5 text-amber-700" />
                      <div className="leading-tight">
                        <div className="text-amber-900 font-medium">
                          Held (pending transfer)
                        </div>
                        <div className="text-xs text-amber-800/70">
                          Tracked in Likelee. Not necessarily cashout yet.
                        </div>
                      </div>
                    </div>
                    <span className="text-amber-900 font-bold text-lg">
                      ${(internalHeldCents / 100).toFixed(2)}
                    </span>
                  </div>

                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <WalletIcon className="h-5 w-5 text-emerald-600" />
                      <div className="leading-tight">
                        <div className="text-emerald-900 font-medium">
                          cashout (Stripe)
                        </div>
                        <div className="text-xs text-emerald-800/70">
                          Available in your connected Stripe account.
                        </div>
                      </div>
                    </div>
                    <span className="text-emerald-900 font-bold text-lg">
                      ${(stripecashoutCents / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })()}

            <div className="space-y-2">
              <Label htmlFor="payout-amount">Amount to Withdraw</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  $
                </span>
                <Input
                  id="payout-amount"
                  type="number"
                  placeholder="0.00"
                  value={requestPayoutAmount}
                  onChange={(e) => setRequestPayoutAmount(e.target.value)}
                  className="pl-7"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  variant="link"
                  size="sm"
                  className="text-emerald-600 h-auto p-0"
                  onClick={() =>
                    setRequestPayoutAmount(
                      (
                        (stripeBalances.find((b) => b.currency === "USD")
                          ?.available_cents || 0) / 100
                      ).toString(),
                    )
                  }
                >
                  Withdraw Maximum
                </Button>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 flex gap-3">
              <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
              <div className="text-sm text-gray-600">
                <p className="font-semibold">Processing Time</p>
                <p>
                  {payoutAccountStatus?.preference === "stripe"
                    ? "1-2 business days"
                    : "3-5 business days (manual)"}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRequestPayoutModal(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={
                !requestPayoutAmount ||
                parseFloat(requestPayoutAmount) <= 0 ||
                parseFloat(requestPayoutAmount) >
                  (stripeBalances.find((b) => b.currency === "USD")
                    ?.available_cents || 0) /
                    100 ||
                isLoadingPayout
              }
              onClick={async () => {
                try {
                  setIsLoadingPayout(true);
                  const { requestTalentPayout } =
                    await import("@/api/functions");
                  const amountCents = Math.round(
                    parseFloat(requestPayoutAmount) * 100,
                  );
                  const res = await requestTalentPayout({
                    amount_cents: amountCents,
                    currency: "USD",
                  });

                  const ok =
                    (res as any)?.status === "ok" ||
                    (res as any)?.payout_request?.status === "ok";

                  if (ok) {
                    toast({
                      title: "Success",
                      description: "Payout request submitted successfully!",
                    });
                    setShowRequestPayoutModal(false);
                    setRequestPayoutAmount("");
                    fetchPayoutStatus();
                  } else {
                    throw new Error(
                      (res as any)?.error || "Failed to request payout",
                    );
                  }
                } catch (e: any) {
                  toast({
                    variant: "destructive",
                    title: "Error",
                    description: e.message || "Failed to request payout",
                  });
                } finally {
                  setIsLoadingPayout(false);
                }
              }}
            >
              {isLoadingPayout ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Requesting...
                </>
              ) : (
                "Confirm Withdrawal"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showKycModal}
        onOpenChange={(open) => {
          setShowKycModal(open);
          if (!open) {
            setKycSessionUrl(null);
            setKycEmbedLoading(false);
          }
        }}
      >
        <DialogContent className="max-w-4xl h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>KYC Verification</DialogTitle>
            <DialogDescription>
              Complete identity verification securely in this modal.
            </DialogDescription>
          </DialogHeader>
          <div className="w-full h-full bg-white">
            {(kycEmbedLoading || !kycSessionUrl) && (
              <div className="absolute inset-0 z-10 bg-white flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <p className="text-sm text-gray-700">Loading verification…</p>
              </div>
            )}
            <div id="veriff-kyc-embedded-creator" className="w-full h-full" />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={jobInviteConfirmOpen}
        onOpenChange={setJobInviteConfirmOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirm{" "}
              {jobInviteConfirmAction === "accept" ? "Acceptance" : "Decline"}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {jobInviteConfirmAction} this job invite?
              This action cannot be undone. Please ensure you have viewed the
              job details first.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setJobInviteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className={
                jobInviteConfirmAction === "accept"
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }
              onClick={confirmJobInviteAction}
              disabled={offerActionLoading}
            >
              {offerActionLoading
                ? "Processing..."
                : `Yes, ${jobInviteConfirmAction}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPhotoFull} onOpenChange={setShowPhotoFull}>
        <DialogContent className="max-w-3xl border-none bg-transparent p-0 shadow-none">
          <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-900/50 backdrop-blur-sm">
            <img
              src={
                profile?.profile_photo_url ||
                creator.profile_photo ||
                user?.user_metadata?.avatar_url
              }
              alt=""
              className="h-full w-full object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
const resolvePublicBrandsVisibility = (data: any): boolean => {
  if (typeof data?.public_profile_visible === "boolean") {
    const rawVisibility = String(data?.visibility || "")
      .trim()
      .toLowerCase();
    if (!rawVisibility && data.public_profile_visible === false) {
      return true;
    }
    return data.public_profile_visible;
  }
  const rawVisibility = String(data?.visibility || "")
    .trim()
    .toLowerCase();
  if (!rawVisibility) return true;
  return (
    rawVisibility === "public" ||
    rawVisibility === "brands" ||
    rawVisibility === "visible_to_brands" ||
    rawVisibility === "true"
  );
};
