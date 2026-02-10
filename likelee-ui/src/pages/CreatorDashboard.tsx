import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { getUserFriendlyError } from "@/utils";
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
  MessageSquare,
  Copy,
  ArrowRight,
  RefreshCw,
  Wallet as WalletIcon,
  Gift,
  CreditCard,
  Link as LinkIcon,
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
import { supabase } from "@/lib/supabase";

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

// Example approval for blank users (shown when no real approvals exist)
// Example data (approvals, archived campaigns, contracts) moved inside component to support translations

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

const mockPendingApprovals: any[] = [];

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

  const exampleCampaigns = React.useMemo(
    () => [
      {
        id: "example-nike",
        brand: "Nike",
        brand_logo:
          "https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg",
        brand_image_url:
          "https://9f8e62d4.delivery.rocketcdn.me/wp-content/uploads/2024/09/man-wearing-black-nike-hoodie-1.jpg",
        campaign: "Summer Running Collection",
        usage_type: "Social Ads",
        rate: 2500,
        status: "active",
        start_date: "2024-01-15",
        end_date: "2024-07-15",
        active_until: "2024-07-15",
        regions: ["North America", "Europe"],
        impressions_week: t(
          "creatorDashboard.campaigns.labels.impressionsPerWeek",
          { count: 125000 },
        ),
        auto_renewal: true,
        isExample: true,
      },
      {
        id: "example-skincare",
        brand: "Avo Beauty",
        brand_logo:
          "https://www.avoclinic.com/wp-content/uploads/2025/10/Avo-Logo.png",
        brand_image_url:
          "https://media.cnn.com/api/v1/images/stellar/prod/230713052220-09-uncover-kenya-africa-startup-spc-intl-green-tea.jpg?c=original&q=h_447,c_fill",
        campaign: "Natural Glow Collection",
        usage_type: "Social Ads",
        rate: 15000,
        status: "expiring_soon",
        start_date: "2024-02-01",
        end_date: "2024-08-01",
        active_until: "2024-08-01",
        regions: ["Global"],
        impressions_week: t(
          "creatorDashboard.campaigns.labels.impressionsPerWeek",
          { count: 89000 },
        ),
        auto_renewal: false,
        isExample: true,
      },
      {
        id: "example-pepsi",
        brand: "Pepsi",
        brand_logo:
          "https://upload.wikimedia.org/wikipedia/commons/0/0f/Pepsi_logo_2014.svg",
        brand_image_url:
          "https://www.multivu.com/players/tr/7812852-pepsi-global-loveitliveit-football-campaign/external/painttheworldtr_1520024258552-1-HR.jpg",
        campaign: "Thirsty for More, Best energy drink",
        usage_type: "Energy Drink",
        rate: 50000,
        status: "active",
        start_date: "2024-03-01",
        end_date: "2024-06-30",
        active_until: "2024-06-30",
        regions: ["North America"],
        impressions_week: t(
          "creatorDashboard.campaigns.labels.impressionsPerWeek",
          { count: 250000 },
        ),
        auto_renewal: false,
        isExample: true,
      },
    ],
    [t],
  );

  const exampleApprovals = React.useMemo(
    () => [
      {
        id: "example-adidas-approval",
        brand: "Adidas Running",
        brand_logo:
          "https://upload.wikimedia.org/wikipedia/commons/2/20/Adidas_Logo.svg",
        campaign_type: t("common.usageTypes.socialMediaCampaign"),
        requested_date: "2025-02-06",
        proposed_rate: 600,
        term_length: t("creatorDashboard.approvals.labels.months", {
          count: 6,
        }),
        estimated_monthly: 540, // after 10% Likelee fee
        regions: [t("common.regions.northAmerica"), t("common.regions.asia")],
        industries: [t("common.industries.sportsFitness")],
        usage_type: t("common.usageTypes.socialMedia"),
        duration: t("creatorDashboard.approvals.labels.months", { count: 6 }),
        territory: `${t("common.regions.northAmerica")}, ${t("common.regions.asia")}`,
        perpetual: false,
        isExample: true,
      },
      {
        id: "example-samsung-approval",
        brand: "Samsung Electronic",
        brand_logo:
          "https://www.techoffside.com/wp-content/uploads/2020/11/samsung-logo.jpg",
        campaign_type: t("common.usageTypes.productLaunch"),
        requested_date: "2025-02-10",
        proposed_rate: 800,
        term_length: t("creatorDashboard.approvals.labels.months", {
          count: 3,
        }),
        estimated_monthly: 720,
        regions: [t("common.regions.global")],
        industries: [t("common.industries.tech")],
        usage_type: t("common.usageTypes.tvDigital"),
        duration: t("creatorDashboard.approvals.labels.months", { count: 3 }),
        territory: t("common.regions.global"),
        perpetual: false,
        isExample: true,
      },
      {
        id: "example-pepsi-approval",
        brand: "Pepsi",
        brand_logo:
          "https://www.timeoutriyadh.com/cloud/timeoutriyadh/2024/03/01/Pepsi-1-2.jpg",
        campaign_type: t("common.usageTypes.summerCampaign"),
        requested_date: "2025-02-12",
        proposed_rate: 700,
        term_length: t("creatorDashboard.approvals.labels.months", {
          count: 4,
        }),
        estimated_monthly: 630,
        regions: [t("common.regions.northAmerica"), t("common.regions.europe")],
        industries: [t("common.industries.foodBeverage")],
        usage_type: t("common.usageTypes.socialMedia"),
        duration: t("creatorDashboard.approvals.labels.months", { count: 4 }),
        territory: `${t("common.regions.northAmerica")}, ${t("common.regions.europe")}`,
        perpetual: false,
        isExample: true,
      },
    ],
    [t],
  );

  const exampleArchivedCampaigns = React.useMemo(
    () => [
      {
        id: "example-spotify-archive",
        brand: "Spotify Premium",
        brand_logo:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Spotify_logo_without_text.svg/2048px-Spotify_logo_without_text.svg.png",
        campaign: "Audio Campaign",
        campaign_type: "Audio Campaign",
        completed_date: "2/1/2026",
        duration: t("creatorDashboard.approvals.labels.months", { count: 2 }),
        monthly_rate: 600,
        total_earned: 1200,
        regions: [t("common.regions.global")],
        show_on_portfolio: false,
        isExample: true,
      },
      {
        id: "example-lululemon-archive",
        brand: "Lululemon",
        brand_logo:
          "https://upload.wikimedia.org/wikipedia/commons/2/22/Lululemon_Athletica_logo.svg",
        campaign: "Yoga Collection",
        campaign_type: t("common.usageTypes.socialMediaCampaign"),
        completed_date: "1/15/2026",
        duration: t("creatorDashboard.approvals.labels.months", { count: 3 }),
        monthly_rate: 750,
        total_earned: 2250,
        regions: [t("common.regions.northAmerica")],
        show_on_portfolio: true,
        isExample: true,
      },
      {
        id: "example-shopify-archive",
        brand: "Shopify",
        brand_logo:
          "https://upload.wikimedia.org/wikipedia/commons/0/0e/Shopify_logo_2018.svg",
        campaign: "Entrepreneur Stories",
        campaign_type: "Digital Ad",
        completed_date: "12/20/2025",
        duration: t("creatorDashboard.approvals.labels.months", { count: 1 }),
        monthly_rate: 900,
        total_earned: 900,
        regions: [t("common.regions.global")],
        show_on_portfolio: true,
        isExample: true,
      },
    ],
    [t],
  );

  const exampleContracts = React.useMemo(
    () => [
      {
        id: "example-nike-contract",
        brand: "Nike Sportswear",
        brand_logo:
          "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRi7Zx9TmyT9DJpbcODrb4HbvoNES_u0yr7tQ&s",
        project_name: "Spring Running Campaign",
        creator_earnings: 500,
        earnings_to_date: 3000,
        amount_paid: 3000,
        payment_status: "Paid",
        start_date: "2026-01-01",
        end_date: "2026-06-30",
        effective_date: "2026-01-01",
        expiration_date: "2026-06-30",
        status: "active",
        days_until_expiration: 132,
        days_remaining: 132,
        usage_description: "Instagram Reels, Hero Image",
        deliverables: "Instagram Reels, Hero Image",
        territory: `${t("common.regions.northAmerica")}, ${t("common.regions.europe")}`,
        channels: [t("common.usageTypes.socialMedia"), "Website"],
        restrictions: "Competitor brands, political content",
        prohibited_uses: "Competitor brands, political content",
        auto_renew: false,
        can_pause: true,
        can_revoke: true,
        isExample: true,
      },
      {
        id: "example-glossier-contract",
        brand: "Glossier Beauty",
        brand_logo:
          "https://images.seeklogo.com/logo-png/61/1/glossier-icon-logo-png_seeklogo-618085.png",
        project_name: "Spring Beauty Collection",
        creator_earnings: 750,
        earnings_to_date: 4500,
        amount_paid: 4500,
        payment_status: "Paid",
        start_date: "2026-01-01",
        end_date: "2026-04-15",
        effective_date: "2026-01-01",
        expiration_date: "2026-04-15",
        status: "active",
        days_until_expiration: 75,
        days_remaining: 75,
        usage_description: t("common.usageTypes.socialMedia"),
        deliverables: "TikTok Videos, Instagram Posts",
        territory: t("common.regions.northAmerica"),
        channels: [t("common.usageTypes.socialMedia"), "Website"],
        restrictions: "Competitor brands",
        prohibited_uses: "Competitor brands",
        auto_renew: false,
        can_pause: true,
        can_revoke: true,
        isExample: true,
      },
      {
        id: "example-tesla-contract",
        brand: "Tesla Motors",
        brand_logo:
          "https://upload.wikimedia.org/wikipedia/commons/e/e8/Tesla_logo.png",
        project_name: "Model Y Launch",
        creator_earnings: 1200,
        earnings_to_date: 7200,
        amount_paid: 7200,
        payment_status: "Paid",
        start_date: "2026-01-01",
        end_date: "2026-03-15",
        effective_date: "2026-01-01",
        expiration_date: "2026-03-15",
        status: "expiring_soon",
        days_until_expiration: 45,
        days_remaining: 45,
        usage_description: "TV Commercial, Digital Ads",
        deliverables: "TV Commercial, Digital Ads",
        territory: t("common.regions.global"),
        channels: [t("common.usageTypes.tvDigital")],
        restrictions: "Competitor automotive brands",
        prohibited_uses: "Competitor automotive brands",
        auto_renew: false,
        can_pause: true,
        can_revoke: true,
        isExample: true,
      },
    ],
    [t],
  );
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
  const api = (path: string) => new URL(path, API_BASE_ABS).toString();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [settingsTab, setSettingsTab] = useState("profile"); // 'profile' or 'rules'
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 1024);
  const IMAGE_SECTIONS = getImageSections(t);

  // Helper functions to get translated arrays
  const getTranslatedContentTypes = () => [
    t("creatorDashboard.contentTypes.socialMediaAds"),
    t("creatorDashboard.contentTypes.webBannerCampaigns"),
    t("creatorDashboard.contentTypes.tvStreamingCommercials"),
    t("creatorDashboard.contentTypes.filmScriptedStreaming"),
    t("creatorDashboard.contentTypes.printOutdoorAds"),
    t("creatorDashboard.contentTypes.musicVideos"),
    t("creatorDashboard.contentTypes.videoGameVRCharacters"),
    t("creatorDashboard.contentTypes.stockPhotoVideoLibraries"),
    t("creatorDashboard.contentTypes.educationalNonprofitSpots"),
  ];

  const getTranslatedIndustries = () => [
    t("creatorDashboard.industries.fashionBeauty"),
    t("creatorDashboard.industries.techElectronics"),
    t("creatorDashboard.industries.sportsFitness"),
    t("creatorDashboard.industries.foodBeverage"),
    t("creatorDashboard.industries.filmGamingMusic"),
    t("creatorDashboard.industries.automotive"),
    t("creatorDashboard.industries.financeFintech"),
    t("creatorDashboard.industries.healthWellness"),
    t("creatorDashboard.industries.luxuryLifestyle"),
    t("creatorDashboard.industries.travelHospitality"),
    t("creatorDashboard.industries.education"),
    t("creatorDashboard.industries.realEstate"),
    t("creatorDashboard.industries.entertainment"),
    t("creatorDashboard.industries.openToAny"),
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

  // Creator profile state (declare before any hooks that reference `creator`)
  const [creator, setCreator] = useState<any>({
    name: profile?.full_name || user?.user_metadata?.full_name || "",
    email: profile?.email || user?.email || "",
    profile_photo: profile?.profile_photo_url || "",
    location: "",
    bio: "",
    instagram_handle: "",
    tiktok_handle: "",
    instagram_connected: false,
    instagram_followers: 0,
    content_types: [] as string[],
    industries: [] as string[],
    content_restrictions: [] as string[],
    brand_exclusivity: [] as string[],
    price_per_month: 0,
    royalty_percentage: 0,
    accept_negotiations: true,
  });

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
      setCreator((prev: any) => ({
        ...prev,
        name: profile.full_name || user?.user_metadata?.full_name || prev.name,
        email: profile.email || prev.email,
        profile_photo: profile.profile_photo_url || prev.profile_photo,
        kyc_status: profile.kyc_status || prev.kyc_status,
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
  const [showKycModal, setShowKycModal] = useState(false);
  const [kycSessionUrl, setKycSessionUrl] = useState<string | null>(null);
  const veriffFrameRef = useRef<any>(null);
  const [kycEmbedLoading, setKycEmbedLoading] = useState(false);

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
              setCreator((prev: any) => ({ ...prev, kyc_status: "pending" }));
              setShowKycModal(false);
              setKycSessionUrl(null);
              refreshVerificationFromDashboard();
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
    if (!authenticated || !user?.id) return;

    let active = true;
    const interval = window.setInterval(async () => {
      try {
        const rows: any = await base44.get("/api/kyc/status");
        const row = Array.isArray(rows) && rows.length ? rows[0] : null;
        const status = row?.kyc_status;
        if (!active || !status) return;

        if (status === "approved") {
          toast({
            title: "Verification Complete",
            description: "Your verification is approved.",
          });
          setShowKycModal(false);
          setKycSessionUrl(null);
        } else if (status === "declined") {
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
  }, [authenticated, showKycModal, user?.id]);
  const [activeCampaigns, setActiveCampaigns] =
    useState<any[]>(mockActiveCampaigns);
  const [pendingApprovals, setPendingApprovals] =
    useState<any[]>(mockPendingApprovals);
  const [editingRules, setEditingRules] = useState(false);
  const [contracts, setContracts] = useState<any[]>(mockContracts);
  const [contentItems, setContentItems] = useState<any[]>([]);
  const [selectedContract, setSelectedContract] = useState(null);
  const [showContractDetails, setShowContractDetails] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseOption, setPauseOption] = useState(null);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [showApprovalContract, setShowApprovalContract] = useState(null);
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
  const [showRequestPayoutModal, setShowRequestPayoutModal] = useState(false);
  const [requestPayoutAmount, setRequestPayoutAmount] = useState("");

  const fetchPayoutStatus = async () => {
    if (!initialized || !authenticated || !user?.id) return;
    try {
      const { getPayoutsAccountStatus, getPayoutBalance } =
        await import("@/api/functions");
      const [statusRes, balanceRes] = await Promise.all([
        getPayoutsAccountStatus(user.id),
        getPayoutBalance(user.id),
      ]);
      setPayoutAccountStatus(statusRes.data);
      setBalances(balanceRes.data.balances || []);
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
        const items = await base44.get<any[]>(`/api/reference-images`);
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
        // 1) List recordings via authenticated client
        const rows = await base44.get<any[]>(`/api/voice/recordings`, {
          params: { user_id: user.id },
        } as any);
        if (!Array.isArray(rows)) return;

        // 2) Fetch signed URLs for playback
        const withUrls = await Promise.all(
          rows.map(async (row: any) => {
            try {
              const j = await base44.get<any>(
                `/api/voice/recordings/signed-url`,
                { params: { recording_id: row.id, expires_sec: 600 } } as any,
              );
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
            } catch (_) {
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
  const [generatingVoice, setGeneratingVoice] = useState(false);
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
  const pendingCount = pendingApprovals.length;
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
        const json = await base44.get("/api/dashboard");
        const profile = json.profile || {};
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
          tiktok_handle: prev.tiktok_handle,
          instagram_connected: prev.instagram_connected ?? false,
          instagram_followers: prev.instagram_followers ?? 0,
          content_types: profile.content_types || [],
          industries: profile.industries || [],
          // Derive weekly price from monthly base (USD-only)
          price_per_month:
            typeof profile.base_monthly_price_cents === "number"
              ? Math.round(profile.base_monthly_price_cents / 100)
              : (prev.price_per_month ?? 0),
          royalty_percentage: prev.royalty_percentage ?? 0,
          accept_negotiations:
            profile.accept_negotiations ?? prev.accept_negotiations ?? true,
          content_restrictions: profile.content_restrictions || [],
          brand_exclusivity: profile.brand_exclusivity || [],
          kyc_status: profile.kyc_status,
          verified_at: profile.verified_at,
          avatar_canonical_url: profile.avatar_canonical_url,
        }));
        // If backend provides arrays later, replace mocks
        if (Array.isArray(json.campaigns) && json.campaigns.length)
          setActiveCampaigns(json.campaigns);
        if (Array.isArray(json.approvals) && json.approvals.length)
          setPendingApprovals(json.approvals);
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
        const data = await base44.get("/api/creator-rates");
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
    refreshVerificationFromDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, authenticated, user?.id]);

  // Keep status fresh while pending (even if modal is closed)
  useEffect(() => {
    if (!initialized || !authenticated || !user?.id) return;
    if (creator?.kyc_status !== "pending") return;

    const interval = window.setInterval(
      () => {
        refreshVerificationFromDashboard();
      },
      10 * 60 * 1000,
    );

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creator?.kyc_status, initialized, authenticated, user?.id]);

  // Verification actions from dashboard
  const startVerificationFromDashboard = async () => {
    if (!authenticated || !user?.id) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to start verification.",
      });
      return;
    }

    if (creator?.kyc_status === "pending") {
      toast({
        title: "Verification In Progress",
        description: "Your KYC verification is already pending.",
      });
      return;
    }
    if (creator?.kyc_status === "approved") {
      toast({
        title: "Already Verified",
        description: "Your KYC verification is already approved.",
      });
      return;
    }

    try {
      setShowKycModal(true);
      setKycEmbedLoading(true);
      setKycLoading(true);
      const data: any = await base44.post("/api/kyc/session", {
        user_id: user.id,
      });
      // Optimistic UI: once a session is created, verification is in progress.
      setCreator((prev: any) => ({ ...prev, kyc_status: "pending" }));
      if (data.session_url) setKycSessionUrl(String(data.session_url));
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

  const refreshVerificationFromDashboard = async () => {
    if (!authenticated || !user?.id) return;
    try {
      setKycLoading(true);
      const rows = await base44.get("/api/kyc/status");
      const row = Array.isArray(rows) && rows.length ? rows[0] : null;
      if (row && (row.kyc_status || row.liveness_status)) {
        setCreator((prev: any) => ({
          ...prev,
          kyc_status: row.kyc_status,
          verified_at: row.verified_at,
        }));
      }
    } catch (e: any) {
      console.error("Failed to refresh verification status", e);
    } finally {
      setKycLoading(false);
    }
  };

  const navigationItems = [
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
    },
    { id: "voice", label: t("creatorDashboard.nav.voice"), icon: Mic },
    {
      id: "campaigns",
      label: t("creatorDashboard.nav.campaigns"),
      icon: Target,
      badge: activeCampaigns.length,
    },
    {
      id: "approvals",
      label: t("creatorDashboard.nav.approvals"),
      icon: CheckSquare,
      badge: pendingCount,
      urgent: pendingCount > 0,
    },
    {
      id: "archive",
      label: t("creatorDashboard.nav.archive"),
      icon: Archive,
      badge: undefined,
    },
    {
      id: "contracts",
      label: t("creatorDashboard.nav.contracts"),
      icon: FileText,
      badge:
        contracts.filter((c) => c.status === "expiring_soon").length > 0
          ? contracts.filter((c) => c.status === "expiring_soon").length
          : undefined,
    },
    {
      id: "earnings",
      label: t("creatorDashboard.nav.earnings"),
      icon: DollarSign,
    },
    {
      id: "settings",
      label: t("creatorDashboard.nav.settings"),
      icon: Settings,
    },
  ];

  // Initialize active section from query string if provided
  useEffect(() => {
    const s = searchParams.get("section");
    if (!s) return;
    const validIds = navigationItems.map((n) => n.id);
    if (validIds.includes(s)) {
      setActiveSection(s);
    }
  }, [searchParams]);

  const [contentTab, setContentTab] = useState("brand_content");

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
            <button
              onClick={() => setContentTab("detections")}
              className={`pb-3 border-b-2 font-medium flex items-center gap-2 ${
                contentTab === "detections"
                  ? "border-[#32C8D1] text-[#32C8D1]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t("creatorDashboard.content.tabs.detections")}
              <Badge className="bg-red-500 text-white hover:bg-red-600 ml-1">
                {detectionsCount}
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

        {contentTab === "detections" && (
          <>
            <div className="flex items-center gap-2 text-sm text-orange-800 bg-orange-50 p-3 rounded-lg border border-orange-100">
              <ShieldAlert className="h-4 w-4" />
              {t("creatorDashboard.content.detections.info")}
            </div>

            {detectionsToShow.length > 0 ? (
              <div className="space-y-4">
                {detectionsToShow.map((item) => (
                  <Card
                    key={item.id}
                    className={`p-4 border ${
                      item.status === "needs_review"
                        ? "border-red-200 bg-red-50"
                        : item.status === "takedown_requested"
                          ? "border-orange-200 bg-orange-50"
                          : "border-green-200 bg-green-50"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="w-full sm:w-32 h-32 shrink-0 rounded-lg overflow-hidden bg-gray-100 relative group cursor-pointer">
                        <img
                          src={item.thumbnail_url}
                          alt="Detected content"
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <ExternalLink className="w-6 h-6 text-white" />
                        </div>
                        {item.logo && (
                          <div className="absolute bottom-1 right-1 w-8 h-8 bg-white rounded-full p-0.5 shadow-sm">
                            <img
                              src={item.logo}
                              alt={item.platform}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 gap-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-gray-900 text-lg">
                                {item.account}
                              </h3>
                              {item.status === "needs_review" && (
                                <Badge className="bg-red-500 text-white hover:bg-red-600 border-none">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  {t(
                                    "creatorDashboard.content.detections.needsReview",
                                  )}
                                </Badge>
                              )}
                              {item.status === "takedown_requested" && (
                                <Badge className="bg-orange-400 text-white hover:bg-orange-500 border-none">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {t(
                                    "creatorDashboard.content.detections.takedownRequested",
                                  )}
                                </Badge>
                              )}
                              {item.status === "resolved" && (
                                <Badge className="bg-green-500 text-white hover:bg-green-600 border-none">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  {t(
                                    "creatorDashboard.content.detections.resolved",
                                  )}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {item.platform}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 mb-1">
                              {t(
                                "creatorDashboard.content.detections.detected",
                              )}
                            </p>
                            <p className="font-medium text-gray-900">
                              {new Date(item.detected_at).toLocaleDateString(
                                i18n.language,
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mb-4">
                          <div className="bg-white px-3 py-1.5 rounded border border-gray-100 shadow-sm">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-0.5">
                              {t(
                                "creatorDashboard.content.detections.matchConfidence",
                              )}
                            </p>
                            <p className="font-bold text-lg text-red-500">
                              {item.match_confidence}%
                            </p>
                          </div>
                          <button className="text-sm text-[#32C8D1] hover:underline flex items-center gap-1 font-medium">
                            {t(
                              "creatorDashboard.content.detections.viewOriginal",
                            )}{" "}
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                          {item.status === "needs_review" && (
                            <>
                              <Button
                                size="sm"
                                className="bg-red-600 hover:bg-red-700 text-white gap-2 w-full sm:w-auto"
                              >
                                <XCircle className="w-4 h-4" />
                                {t(
                                  "creatorDashboard.content.detections.requestTakedown",
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-white border-gray-300 text-gray-600 hover:bg-gray-50 w-full sm:w-auto"
                              >
                                {t(
                                  "creatorDashboard.content.detections.dismiss",
                                )}
                              </Button>
                            </>
                          )}
                          {item.status === "takedown_requested" && (
                            <p className="text-sm text-orange-700 flex items-center gap-2">
                              {t(
                                "creatorDashboard.content.detections.takedownSent",
                              )}
                            </p>
                          )}
                          {item.status === "resolved" && (
                            <p className="text-sm text-green-700 flex items-center gap-2">
                              <Check className="w-4 h-4" />
                              {t(
                                "creatorDashboard.content.detections.contentRemoved",
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-500">
                  {t("creatorDashboard.content.detections.noDetections")}
                </p>
              </div>
            )}

            {/* How Detection Works */}
            <div className="mt-8 bg-gray-50 border border-gray-200 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 mb-4">
                {t("creatorDashboard.content.detections.howItWorks.title")}
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                  <div className="mb-3">
                    <Eye className="w-6 h-6 text-[#32C8D1]" />
                  </div>
                  <p className="font-bold text-gray-900 text-sm mb-1">
                    {t(
                      "creatorDashboard.content.detections.howItWorks.scanning.title",
                    )}
                  </p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {t(
                      "creatorDashboard.content.detections.howItWorks.scanning.desc",
                    )}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                  <div className="mb-3">
                    <AlertCircle className="w-6 h-6 text-orange-500" />
                  </div>
                  <p className="font-bold text-gray-900 text-sm mb-1">
                    {t(
                      "creatorDashboard.content.detections.howItWorks.ai.title",
                    )}
                  </p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {t(
                      "creatorDashboard.content.detections.howItWorks.ai.desc",
                    )}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                  <div className="mb-3">
                    <Shield className="w-6 h-6 text-green-500" />
                  </div>
                  <p className="font-bold text-gray-900 text-sm mb-1">
                    {t(
                      "creatorDashboard.content.detections.howItWorks.takedown.title",
                    )}
                  </p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {t(
                      "creatorDashboard.content.detections.howItWorks.takedown.desc",
                    )}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderPublicProfilePreview = () => {
    // Use real user data if available, otherwise example data
    const data = {
      ...exampleProfilePreviewData,
      first_name:
        creator.name ||
        profile?.full_name ||
        user?.user_metadata?.full_name ||
        user?.email?.split("@")[0] ||
        exampleProfilePreviewData.first_name,
      location:
        user?.user_metadata?.location || exampleProfilePreviewData.location,
      // Add other real fields mapping here
    };

    return (
      <div>
        <Card className="overflow-hidden border-gray-200 bg-white">
          {/* Banner */}
          <div className="h-48 bg-[#32C8D1]"></div>
          {/* Header Section with Avatar */}
          <div className="relative flex justify-between items-start mb-6">
            <div className="flex items-end -mt-16 mb-4">
              <div className="relative">
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
              <div className="ml-6 mb-2">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl font-bold text-gray-900">
                    {data.first_name}
                  </h1>
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200 gap-1"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    {t("creatorDashboard.publicProfile.verifiedUser")}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-gray-600 text-sm">
                  <span>{data.location}</span>
                  <span className="flex items-center gap-1">
                    <Badge
                      variant="secondary"
                      className="bg-pink-50 text-pink-700 hover:bg-pink-100 border-pink-200 text-xs"
                    >
                      {data.handles}
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
          <p className="text-gray-700 mb-8 max-w-3xl">{data.bio}</p>

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
          <div className="space-y-6 mb-8">
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3">
                {t("creatorDashboard.publicProfile.openToWork")}
              </h3>
              <div className="flex flex-wrap gap-2">
                {data.open_to_work.map((tag: string) => (
                  <Badge
                    key={tag}
                    variant="default"
                    className="bg-[#32C8D1] hover:bg-[#2bb0b8] text-white border-0"
                  >
                    {t(`common.contentTypes.${tag}`, { defaultValue: tag })}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3">
                {t("creatorDashboard.publicProfile.industries")}
              </h3>
              <div className="flex flex-wrap gap-2">
                {data.industries.map((tag: string) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200"
                  >
                    {t(`common.industries.${tag}`, { defaultValue: tag })}
                  </Badge>
                ))}
              </div>
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
          <div>
            <h3 className="font-bold text-gray-900 mb-4">
              {t("creatorDashboard.publicProfile.portfolio")}
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              {data.portfolio.map((item: any) => (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-lg p-4 flex items-center gap-4"
                >
                  <img
                    src={item.logo}
                    alt={item.brand}
                    className="w-10 h-10 object-contain"
                  />
                  <div>
                    <div className="font-bold text-gray-900 text-sm">
                      {item.brand}
                    </div>
                    <div className="text-xs text-gray-500">{item.campaign}</div>
                    <Badge variant="secondary" className="mt-1 text-[10px] h-5">
                      {item.duration}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
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
        </Card>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3 items-start">
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
              className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200"
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
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-700 border-green-200 text-[10px]"
                  >
                    {t("creatorDashboard.publicProfile.verifiedCreator")}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-700 border-green-200 text-[10px]"
                  >
                    Verified Creator
                  </Badge>
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
        const finalize = () => {
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

          const newRecording = {
            id: Date.now(),
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

          setVoiceLibrary([...voiceLibrary, newRecording]);
          setShowRecordingModal(false);
          setRecordingTime(0);
          setCurrentWord(0);

          stream.getTracks().forEach((track) => track.stop());
        };

        // If no chunks yet, some browsers emit the final chunk just after stop
        if (!audioChunksRef.current || audioChunksRef.current.length === 0) {
          setTimeout(finalize, 150);
        } else {
          finalize();
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

  const deleteRecording = async (id) => {
    const rec = voiceLibrary.find((r) => r.id === id);

    const { dismiss } = toast({
      title: t(
        "creatorDashboard.voice.deleteConfirmation.title",
        "Delete Recording?",
      ),
      description: t(
        "creatorDashboard.voice.deleteConfirmation.description",
        "This action cannot be undone.",
      ),
      variant: "destructive",
      action: (
        <ToastAction
          altText={t(
            "creatorDashboard.voice.deleteConfirmation.action",
            "Delete",
          )}
          className="bg-white text-red-600 hover:bg-gray-100 border-none font-bold shadow-sm"
          onClick={async () => {
            setVoiceLibrary(voiceLibrary.filter((r) => r.id !== id));
            dismiss();
            try {
              const sid = rec?.server_recording_id || rec?.id;
              if (sid) {
                await fetch(
                  api(`/api/voice/recordings/${encodeURIComponent(sid)}`),
                  {
                    method: "DELETE",
                  },
                );
              }
            } catch (err) {
              console.error("Error deleting recording:", err);
            }
          }}
        >
          {t("creatorDashboard.voice.deleteConfirmation.action", "Delete")}
        </ToastAction>
      ),
    });
  };

  const createVoiceProfile = async (recording) => {
    try {
      setGeneratingVoice(true);

      const ct = recording?.mimeType || recording?.blob?.type || "audio/webm";

      // 1) Upload recording to Likelee server (private bucket)
      const uploadRes = await fetch(
        api(
          `/api/voice/recordings?user_id=${encodeURIComponent(user.id)}&emotion_tag=${encodeURIComponent(recording.emotion || "")}`,
        ),
        {
          method: "POST",
          headers: { "content-type": ct },
          body: recording.blob,
        },
      );
      if (!uploadRes.ok) {
        const txt = await uploadRes.text();
        throw new Error(`Upload failed: ${txt}`);
      }
      const uploaded = await uploadRes.json(); // { id, storage_bucket, storage_path }
      const recordingId = uploaded?.id;
      if (!recordingId) throw new Error("Missing recording id after upload");

      // 2) Create ElevenLabs clone via Likelee server
      const cloneRes = await fetch(api(`/api/voice/models/clone`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          recording_id: recordingId,
          voice_name: `${creator.name}_${recording.emotion}`,
          description: `${recording.emotion} voice profile for ${creator.name}`,
        }),
      });
      if (!cloneRes.ok) {
        const txt = await cloneRes.text();
        throw new Error(`Clone failed: ${txt}`);
      }
      const cloned = await cloneRes.json(); // { provider, voice_id, model_row_id }

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
      setGeneratingVoice(false);
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

  const handleApprove = (approvalId) => {
    setPendingApprovals(pendingApprovals.filter((a) => a.id !== approvalId));
    setShowApprovalContract(null);
    toast({
      title: t("creatorDashboard.toasts.campaignApproved"),
    });
  };

  const handleDecline = (approvalId) => {
    setPendingApprovals(pendingApprovals.filter((a) => a.id !== approvalId));
    setShowApprovalContract(null);
    toast({
      title: t("creatorDashboard.toasts.campaignDeclined"),
    });
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
      setCreator({ ...creator, industries: [...current, industry] });
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

    // Only send fields that exist in the profiles table
    // Apply overrides if provided (e.g. for immediate toggle updates)
    const profileData = {
      email: creator.email || user.email,
      full_name:
        creator.name || profile?.full_name || user?.user_metadata?.full_name,
      bio: creator.bio,
      city: creator.location?.split(",")[0]?.trim(),
      state: creator.location?.split(",")[1]?.trim(),
      base_monthly_price_cents: (creator.price_per_month || 0) * 100,
      platform_handle: creator.instagram_handle?.replace("@", ""),
      accept_negotiations:
        overrides?.accept_negotiations ?? creator.accept_negotiations,
      content_restrictions:
        overrides?.content_restrictions ?? creator.content_restrictions,
      brand_exclusivity:
        overrides?.brand_exclusivity ?? creator.brand_exclusivity,
      content_types: overrides?.content_types ?? creator.content_types,
      industries: overrides?.industries ?? creator.industries,
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
        setCreator((prev) => ({
          ...prev,
          name: savedProfile.full_name || prev.name,
          content_types: savedProfile.content_types ?? prev.content_types,
          industries: savedProfile.industries ?? prev.industries,
          content_restrictions:
            savedProfile.content_restrictions ?? prev.content_restrictions,
          brand_exclusivity:
            savedProfile.brand_exclusivity ?? prev.brand_exclusivity,
          accept_negotiations:
            savedProfile.accept_negotiations ?? prev.accept_negotiations,
          price_per_month: savedProfile.base_monthly_price_cents
            ? Math.round(savedProfile.base_monthly_price_cents / 100)
            : prev.price_per_month,
        }));
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

  const handleSaveProfile = () => {
    toast({
      title: t("creatorDashboard.toasts.profileUpdatedDemo"),
    });
  };

  const renderDashboard = () => {
    const imagesFilled = Object.values(referenceImages).filter(
      (img) => img !== null,
    ).length;
    const imagesTotal = IMAGE_SECTIONS.length;

    return (
      <div className="space-y-6">
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
                {t("creatorDashboard.dashboard.pendingApprovals")}
              </p>
              <AlertCircle className="w-5 h-5 text-gray-500" />
            </div>
            <p className="text-4xl font-bold text-gray-900">{pendingCount}</p>
            <p className="text-sm text-gray-600 mt-1">
              {t("creatorDashboard.dashboard.pendingApprovalsInfo")}
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
            onClick={() => setActiveSection("voice")}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Mic className="w-6 h-6 text-purple-600" />
              </div>
              <Badge className="bg-purple-100 text-purple-700 border border-purple-300">
                {voiceLibrary.length}/6
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
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-blue-900">
                <strong>
                  {t("creatorDashboard.dashboard.previewExamples.title")}
                </strong>{" "}
                {t("creatorDashboard.dashboard.previewExamples.message")}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {exampleCampaigns.map((campaign) => (
                <Card
                  key={campaign.id}
                  className="relative overflow-hidden rounded-lg h-64 bg-cover bg-center text-white shadow-lg transform hover:scale-105 transition-transform duration-300"
                  style={{
                    backgroundImage: `url(${campaign.brand_image_url})`,
                  }}
                >
                  <div className="absolute inset-0 bg-black bg-opacity-50 p-4 flex flex-col justify-end">
                    <h4 className="font-bold text-xl mb-1">{campaign.brand}</h4>
                    <p className="text-sm mb-2">{campaign.campaign}</p>
                    <div className="flex items-center justify-between text-sm">
                      <Badge className="bg-green-500 text-white border-none">
                        {t("creatorDashboard.dashboard.active")}
                      </Badge>
                      <span className="font-bold">${campaign.rate}/mo</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <Card className="p-10 bg-white border border-gray-200 text-center text-gray-600">
            <p>{t("creatorDashboard.dashboard.noCampaigns")}</p>
            <p className="text-sm text-gray-500 mt-1">
              {t("creatorDashboard.dashboard.noCampaignsInfo")}
            </p>
          </Card>
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
                {voiceLibrary.length}/6
              </div>
              <Progress
                value={Math.min(voiceLibrary.length * (100 / 6), 100)}
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
      const full = api(
        `/api/reference-images/upload?section_id=${encodeURIComponent(selectedImageSection)}`,
      );
      const res = await fetch(full, {
        method: "POST",
        headers: { "content-type": file.type || "image/jpeg" },
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
    toast({
      title: "Delete Reference Image?",
      description: "This action cannot be undone.",
      variant: "destructive",
      action: (
        <ToastAction
          altText="Delete"
          className="bg-white text-red-600 hover:bg-gray-100 border-none font-bold shadow-sm"
          onClick={() => {
            setReferenceImages({
              ...referenceImages,
              [sectionId]: null,
            });
          }}
        >
          Delete
        </ToastAction>
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
                {creator?.kyc_status === "approved" && (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                )}
                {creator?.kyc_status === "pending" && (
                  <Clock className="w-5 h-5 text-yellow-600" />
                )}
                {creator?.kyc_status === "rejected" && (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                {!creator?.kyc_status && (
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
                    creator?.kyc_status === "approved"
                      ? "bg-green-100 text-green-700"
                      : creator?.kyc_status === "pending"
                        ? "bg-yellow-100 text-yellow-700"
                        : creator?.kyc_status === "rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700"
                  }
                >
                  {creator?.kyc_status
                    ? t(
                        `creatorDashboard.verificationStatus.${creator.kyc_status}`,
                      )
                    : t("creatorDashboard.verificationStatus.notStarted")}
                </Badge>
                {creator?.kyc_status !== "approved" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={refreshVerificationFromDashboard}
                    disabled={kycLoading}
                    className="h-8 px-2"
                    title={t(
                      "creatorDashboard.verificationStatus.refreshStatus",
                    )}
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${kycLoading ? "animate-spin" : ""}`}
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
                  kycLoading ||
                  creator?.kyc_status === "approved" ||
                  creator?.kyc_status === "pending"
                }
                variant="outline"
                className="border-2 border-gray-300 w-full sm:w-auto"
              >
                {kycLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4 mr-2" />
                )}
                {t("creatorDashboard.verificationStatus.completeVerification")}
              </Button>
              <Button
                onClick={refreshVerificationFromDashboard}
                disabled={kycLoading}
                variant="outline"
                className="border-2 border-gray-300 w-full sm:w-auto"
              >
                {kycLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                {t("creatorDashboard.verificationStatus.refreshStatus")}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  const renderVoice = () => (
    <div className="space-y-6">
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
                {voiceLibrary.reduce((sum, v) => sum + (v.usageCount || 0), 0)}
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
                        recording.accessible ? "bg-green-500" : "bg-gray-400"
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
                        {t("creatorDashboard.voice.library.elevenLabsReady")}
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
                <audio controls src={recording.url} className="w-full mb-4" />

                {!recording.voiceProfileCreated && recording.accessible && (
                  <Button
                    onClick={() => createVoiceProfile(recording)}
                    disabled={generatingVoice}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {generatingVoice ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t("creatorDashboard.voice.library.creatingProfile")}
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
    </div>
  );

  const renderCampaigns = () => {
    // Use example campaigns if activeCampaigns is empty, otherwise use real data
    const campaignsToShow =
      activeCampaigns.length === 0 ? exampleCampaigns : activeCampaigns;
    const showingExamples = activeCampaigns.length === 0;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
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
            } px-4 py-2 text-lg`}
          >
            {t("creatorDashboard.campaigns.activeCount", {
              count: activeCampaigns.length,
            })}
          </Badge>
        </div>

        {/* Welcome message for blank users showing examples */}
        {showingExamples && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-blue-900">
              <strong>{t("creatorDashboard.campaigns.welcome.title")}</strong>{" "}
              {t("creatorDashboard.campaigns.welcome.message")}
            </p>
          </div>
        )}

        {/* Campaigns Table - Desktop Only */}
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
                    {t("creatorDashboard.campaigns.table.rate")}
                  </th>
                  <th className="text-left py-4 px-4 font-bold text-gray-900">
                    {t("creatorDashboard.campaigns.table.activeUntil")}
                  </th>
                  <th className="text-left py-4 px-4 font-bold text-gray-900">
                    {t("creatorDashboard.campaigns.table.status")}
                  </th>
                  <th className="text-left py-4 px-4 font-bold text-gray-900">
                    {t("creatorDashboard.campaigns.table.thisMonth")}
                  </th>
                  <th className="text-left py-4 px-4 font-bold text-gray-900">
                    {t("creatorDashboard.campaigns.table.actions")}
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
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                            {campaign.brand.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">
                            {campaign.brand}
                          </p>
                          <p className="text-xs text-gray-500">
                            {campaign.impressions_week?.toLocaleString() ||
                              campaign.campaign}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-700">
                      {campaign.usage_type ||
                        campaign.campaign?.split(",")[0] ||
                        "Social Ads"}
                    </td>
                    <td className="py-4 px-4 font-bold text-gray-900">
                      ${campaign.rate.toLocaleString()}/mo
                    </td>
                    <td className="py-4 px-4 text-gray-700">
                      {new Date(
                        campaign.active_until || campaign.end_date,
                      ).toLocaleDateString()}
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
                    <td className="py-4 px-4 font-bold text-green-600">
                      $
                      {campaign.earnings_this_month ||
                        campaign.rate.toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handlePauseCampaign(campaign.id)}
                          variant="outline"
                          size="sm"
                        >
                          <Pause className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleRevokeCampaign(campaign.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                        >
                          {t("creatorDashboard.campaigns.actions.revoke")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Mobile Campaign Cards */}
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
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
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
                    {/* Rate */}
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-600">
                        {t("creatorDashboard.campaigns.rateLabel")}
                      </span>
                      <span className="font-bold text-gray-900">
                        ${campaign.rate.toLocaleString()}/mo
                      </span>
                    </div>

                    {/* Active Until */}
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-600">
                        {t("creatorDashboard.campaigns.activeUntilLabel")}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-900">
                          {new Date(
                            campaign.active_until || campaign.end_date,
                          ).toLocaleDateString()}
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

                    {/* This Month */}
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-600">
                        {t("creatorDashboard.campaigns.thisMonthLabel")}
                      </span>
                      <span className="font-bold text-green-600">
                        $
                        {campaign.earnings_this_month ||
                          campaign.rate.toLocaleString()}
                      </span>
                    </div>

                    {/* Impressions (if available) */}
                    {campaign.impressions_week && (
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-gray-600">
                          {t("creatorDashboard.campaigns.impressionsLabel")}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {campaign.impressions_week.toLocaleString()}
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePauseCampaign(campaign.id);
                        }}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Pause className="w-4 h-4 mr-2" />
                        {t("creatorDashboard.campaigns.pause")}
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRevokeCampaign(campaign.id);
                        }}
                        variant="outline"
                        size="sm"
                        className="flex-1 text-red-600 hover:bg-red-50"
                      >
                        Revoke
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Campaign Details Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {campaignsToShow.slice(0, 2).map((campaign) => (
            <Card
              key={campaign.id}
              className="p-6 bg-white border border-gray-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={campaign.brand_logo}
                    alt={campaign.brand}
                    className="w-12 h-12 rounded-lg object-cover border-2 border-gray-200"
                  />
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">
                      {campaign.brand}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {campaign.usage_type}
                    </p>
                  </div>
                </div>
                <Badge
                  className={
                    campaign.status === "active"
                      ? "bg-green-100 text-green-700 border border-green-300"
                      : "bg-orange-100 text-orange-700 border border-orange-300"
                  }
                >
                  {campaign.status === "active"
                    ? t("creatorDashboard.campaigns.status.active")
                    : t("creatorDashboard.campaigns.status.expiringSoon")}
                </Badge>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {t("creatorDashboard.campaigns.labels.monthlyRate")}
                  </span>
                  <span className="font-bold text-gray-900">
                    ${campaign.rate.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {t("creatorDashboard.campaigns.labels.activeUntil")}
                  </span>
                  <span className="font-medium text-gray-900">
                    {new Date(campaign.active_until).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {t("creatorDashboard.campaigns.labels.regions")}
                  </span>
                  <span className="font-medium text-gray-900">
                    {campaign.regions.join(", ")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {t("creatorDashboard.campaigns.labels.weeklyImpressions")}
                  </span>
                  <span className="font-medium text-gray-900">
                    {campaign.impressions_week.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button variant="outline" className="flex-1">
                  <Eye className="w-4 h-4 mr-2" />
                  {t("creatorDashboard.campaigns.actions.viewDetails")}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-red-600 hover:bg-red-50"
                  onClick={() => handleRevokeCampaign(campaign.id)}
                >
                  {t("creatorDashboard.campaigns.actions.revoke")}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Rights Expiration Calendar */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Calendar className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-blue-900 text-sm">
            <strong>{t("creatorDashboard.campaigns.consent.title")}</strong>{" "}
            {t("creatorDashboard.campaigns.consent.message", {
              count: activeCampaigns.length,
            })}
          </p>
        </div>
      </div>
    );
  };

  const renderApprovals = () => {
    if (showApprovalContract) {
      // Check both real approvals and examples
      const approval =
        pendingApprovals.find((a) => a.id === showApprovalContract) ||
        exampleApprovals.find((a) => a.id === showApprovalContract);
      if (!approval) return null;

      return (
        <div className="space-y-6">
          <div className="flex flex-col gap-4">
            <Button
              variant="outline"
              onClick={() => setShowApprovalContract(null)}
              className="border-2 border-gray-300 w-fit"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("creatorDashboard.approvals.backToQueue")}
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {t("creatorDashboard.approvals.contractReviewTitle", {
                  brand: approval.brand,
                })}
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">
                {t("creatorDashboard.approvals.contractReviewSubtitle")}
              </p>
            </div>
          </div>

          {/* What You're Earning */}
          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              {t("creatorDashboard.approvals.whatYouWillEarn")}
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-gray-700 mb-2">
                  {t("creatorDashboard.approvals.yourMonthlyPayment")}
                </p>
                <p className="text-5xl font-bold text-green-600">
                  ${approval.proposed_rate}
                </p>
              </div>
              <div>
                <p className="text-gray-700 mb-2">
                  {t("creatorDashboard.approvals.ifYouKeepThisFor", {
                    term: approval.term_length,
                  })}
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  $
                  {approval.term_length === "Perpetual"
                    ? t("common.ongoing")
                    : approval.proposed_rate * parseInt(approval.term_length)}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {t("creatorDashboard.approvals.totalEstimatedEarnings")}
                </p>
              </div>
            </div>
          </Card>

          {/* Contract Terms */}
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              {t("creatorDashboard.approvals.contractTerms")}
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">
                    {t("creatorDashboard.approvals.duration")}
                  </p>
                  <p className="font-bold text-gray-900 text-lg">
                    {approval.term_length}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">
                    {t("creatorDashboard.approvals.territory")}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {approval.regions.map((region) => (
                      <Badge
                        key={region}
                        variant="secondary"
                        className="bg-blue-100 text-blue-700"
                      >
                        {region}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">
                    {t("creatorDashboard.approvals.usageType")}
                  </p>
                  <p className="font-bold text-gray-900 text-lg">
                    {approval.usage_type}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">
                    {t("creatorDashboard.approvals.industries")}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {approval.industries.map((industry) => (
                      <Badge
                        key={industry}
                        variant="secondary"
                        className="bg-purple-100 text-purple-700"
                      >
                        {industry}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Your Rights */}
          <Card className="p-6 bg-blue-50 border-2 border-blue-300">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {t("creatorDashboard.approvals.yourRightsAndProtections")}
            </h3>
            <div className="space-y-3 text-gray-900">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <p>{t("creatorDashboard.approvals.canPause")}</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <p>{t("creatorDashboard.approvals.canRevoke")}</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <p>{t("creatorDashboard.approvals.licenseExpires")}</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <p>{t("creatorDashboard.approvals.paymentProtected")}</p>
              </div>
            </div>
          </Card>

          {approval.perpetual && (
            <div className="bg-red-50 border-2 border-red-400 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-900 text-sm">
                <strong>
                  {t("creatorDashboard.approvals.perpetualUseWarning.title")}
                </strong>{" "}
                {t("creatorDashboard.approvals.perpetualUseWarning.message")}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              onClick={() => handleDecline(approval.id)}
              variant="outline"
              className="flex-1 h-14 border-2 border-gray-300"
            >
              <XCircle className="w-5 h-5 mr-2" />
              {t("creatorDashboard.approvals.decline")}
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-14 border-2 border-[#32C8D1] text-[#32C8D1]"
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              {t("creatorDashboard.approvals.counterOffer")}
            </Button>
            <Button
              onClick={() => handleApprove(approval.id)}
              className="flex-1 h-14 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              {t("creatorDashboard.approvals.acceptAndSign")}
            </Button>
          </div>
        </div>
      );
    }

    // Use example approvals if pendingApprovals is empty, otherwise use real data
    const approvalsToShow =
      pendingApprovals.length === 0 ? exampleApprovals : pendingApprovals;
    const showingExamples = pendingApprovals.length === 0;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              {t("creatorDashboard.approvals.title")}
            </h2>
            <p className="text-gray-600 mt-1">
              {t("creatorDashboard.approvals.subtitle")}
            </p>
          </div>
          <Badge
            variant="secondary"
            className={`${pendingCount > 0 ? "bg-yellow-100 text-yellow-700 border border-yellow-300" : "bg-gray-100 text-gray-700 border border-gray-300"} px-4 py-2 text-lg`}
          >
            {t("creatorDashboard.approvals.pendingCount", {
              count: pendingCount,
            })}
          </Badge>
        </div>

        {/* Welcome banner for blank users showing examples */}
        {showingExamples && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-blue-900">
              <strong>{t("creatorDashboard.approvals.welcome.title")}</strong>{" "}
              {t("creatorDashboard.approvals.welcome.message")}
            </p>
          </div>
        )}

        <div className="space-y-6">
          {approvalsToShow.map((approval) => (
            <Card
              key={approval.id}
              className={`p-6 bg-white border-2 ${approval.perpetual ? "border-red-400" : "border-blue-400"}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 gap-4">
                <div className="flex items-center gap-4">
                  <img
                    src={approval.brand_logo}
                    alt={approval.brand}
                    className="w-16 h-16 rounded-lg object-cover border-2 border-gray-200"
                  />
                  <div>
                    <h3 className="font-bold text-gray-900 text-2xl">
                      {approval.brand}
                    </h3>
                    <p className="text-gray-600">{approval.usage_type}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {t("creatorDashboard.approvals.requestedOn", {
                        date: new Date(
                          approval.requested_date,
                        ).toLocaleDateString(),
                      })}
                    </p>
                  </div>
                </div>
                {approval.perpetual && (
                  <Badge
                    variant="destructive"
                    className="bg-red-500 text-white"
                  >
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {t("creatorDashboard.approvals.perpetualRequest")}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-100 rounded-lg border border-gray-200">
                    <span className="text-sm text-gray-600">
                      {t("creatorDashboard.approvals.proposedRate")}
                    </span>
                    <span className="font-bold text-gray-900 text-lg">
                      {t("creatorDashboard.approvals.labels.pricePerMonth", {
                        price: approval.proposed_rate,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-100 rounded-lg border border-gray-200">
                    <span className="text-sm text-gray-600">
                      {t("creatorDashboard.approvals.termLength")}
                    </span>
                    <span className="font-bold text-gray-900">
                      {approval.term_length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-100 rounded-lg border border-gray-200">
                    <span className="text-sm text-gray-600">
                      {t("creatorDashboard.approvals.estimatedMonthly")}
                    </span>
                    <span className="font-bold text-green-600 text-lg">
                      ${approval.proposed_rate}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-slate-100 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600 mb-2">
                      {t("creatorDashboard.approvals.regions")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {approval.regions.map((region) => (
                        <Badge
                          key={region}
                          variant="secondary"
                          className="bg-blue-100 text-blue-700 border border-blue-300"
                        >
                          {region}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-100 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600 mb-2">
                      {t("creatorDashboard.approvals.industries")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {approval.industries.map((industry) => (
                        <Badge
                          key={industry}
                          variant="secondary"
                          className="bg-purple-100 text-purple-700 border border-purple-300"
                        >
                          {industry}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {approval.perpetual && (
                <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-900 text-sm">
                    <strong>
                      {t("creatorDashboard.approvals.warning.title")}
                    </strong>{" "}
                    {t("creatorDashboard.approvals.warning.message")}
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button
                  onClick={() => setShowApprovalContract(approval.id)}
                  variant="outline"
                  className="flex-1 h-12 border-2 border-blue-300 text-blue-600 w-full sm:w-auto"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  {t("creatorDashboard.approvals.actions.viewContract")}
                </Button>
                <Button
                  onClick={() => handleDecline(approval.id)}
                  variant="outline"
                  className="h-12 border-2 border-gray-300 w-full sm:w-auto"
                >
                  <XCircle className="w-5 h-5 mr-2" />
                  {t("creatorDashboard.approvals.actions.decline")}
                </Button>
                <Button
                  variant="outline"
                  className="h-12 border-2 border-[#32C8D1] text-[#32C8D1] w-full sm:w-auto"
                >
                  <MessageSquare className="w-5 h-5 mr-2" />
                  {t("creatorDashboard.approvals.actions.counterOffer")}
                </Button>
                <Button
                  onClick={() => handleApprove(approval.id)}
                  className="h-12 bg-green-600 hover:bg-green-700 text-white px-8 w-full sm:w-auto"
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  {t("creatorDashboard.approvals.actions.acceptAndSign")}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderCampaignArchive = () => {
    // Use example archived campaigns if none exist, otherwise use real data
    const archivedCampaigns: any[] = []; // This will be populated from real data later
    const campaignsToShow =
      archivedCampaigns.length === 0
        ? exampleArchivedCampaigns
        : archivedCampaigns;
    const showingExamples = archivedCampaigns.length === 0;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              {t("creatorDashboard.archive.title")}
            </h2>
            <p className="text-gray-600 mt-1">
              {t("creatorDashboard.archive.subtitle")}
            </p>
          </div>
          <Badge className="bg-gray-100 text-gray-700 border border-gray-300 px-4 py-2 text-lg">
            {t("creatorDashboard.archive.completedCount", {
              count: archivedCampaigns.length,
            })}
          </Badge>
        </div>

        {/* Welcome banner for blank users showing examples */}
        {showingExamples && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-blue-900">
              <strong>{t("creatorDashboard.archive.welcome.title")}</strong>{" "}
              {t("creatorDashboard.archive.welcome.message")}
            </p>
          </div>
        )}

        <div className="space-y-6">
          {campaignsToShow.map((campaign) => (
            <Card
              key={campaign.id}
              className="p-6 bg-white border-2 border-gray-200"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <img
                    src={campaign.brand_logo}
                    alt={campaign.brand}
                    className="w-16 h-16 rounded-lg object-contain border-2 border-gray-200 p-2"
                  />
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
                  <p className="font-bold text-gray-900">{campaign.duration}</p>
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
      </div>
    );
  };

  const renderContracts = () => {
    if (showContractDetails && selectedContract) {
      // Check both real contracts and examples
      const contract =
        contracts.find((c) => c.id === selectedContract) ||
        exampleContracts.find((c) => c.id === selectedContract);
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

    // Use example contracts if none exist, otherwise use real data
    const realActiveContracts = contracts.filter(
      (c) => c.status === "active" || c.status === "expiring_soon",
    );
    const realExpiredContracts = contracts.filter(
      (c) => c.status === "expired",
    );

    const activeContracts =
      realActiveContracts.length === 0 ? exampleContracts : realActiveContracts;
    const expiredContracts = realExpiredContracts;
    const showingExamples = realActiveContracts.length === 0;

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

        {/* Welcome banner for blank users showing examples */}
        {showingExamples && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-blue-900">
              <strong>{t("creatorDashboard.contracts.welcome.title")}</strong>{" "}
              {t("creatorDashboard.contracts.welcome.message")}
            </p>
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
                    : "Setup Payouts"}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-lg p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p>
            <span className="font-semibold">
              {t("creatorDashboard.earnings.readyTitle")}
            </span>{" "}
            {t("creatorDashboard.earnings.readyMessage")}
          </p>
        </div>

        {/* Key metrics */}
        <div className="grid md:grid-cols-4 gap-6">
          <Card className="p-6 bg-white border border-gray-200 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-500"></div>
            <p className="text-sm font-medium text-gray-600 mb-2 relative z-10">
              Available Balance
            </p>
            <p className="text-3xl font-bold text-emerald-600 relative z-10">
              $
              {(
                (balances.find((b) => b.currency === "USD")?.available_cents ||
                  0) / 100
              ).toFixed(2)}
            </p>
            <p className="text-sm text-gray-600 mt-1 relative z-10">
              {t("creatorDashboard.earnings.metrics.willUpdate")}
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
          <div className="p-12 bg-gray-50 border border-gray-200 rounded-lg text-center text-gray-600">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <div className="font-semibold text-gray-900">
              {t("creatorDashboard.earnings.history.placeholderTitle")}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {t("creatorDashboard.earnings.history.placeholderMessage")}
            </div>
          </div>
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

      const res = await fetch(
        api(`/api/creator-rates?user_id=${encodeURIComponent(user.id)}`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(finalRates),
        },
      );

      // Persist category selections to profiles table as well
      const profileStatus = await supabase
        .from("creators")
        .update({
          content_types:
            showRatesModal === "content"
              ? tempContentTypes
              : creator.content_types,
          industries:
            showRatesModal === "industry" ? tempIndustries : creator.industries,
        })
        .eq("id", user.id);

      if (profileStatus.error) {
        throw new Error(
          `Profile update failed: ${profileStatus.error.message}`,
        );
      }

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to save rates: ${errorText}`);
      }

      // Update local state immediately to ensure UI is snappy
      setCustomRates(finalRates);

      // Reload rates from database to confirm persistence
      const reloadRes = await fetch(
        api(`/api/creator-rates?user_id=${encodeURIComponent(user.id)}`),
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
          onClick={() => setSettingsTab("rules")}
          className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
            settingsTab === "rules"
              ? "border-[#32C8D1] text-[#32C8D1]"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          {t("creatorDashboard.settingsView.tabs.rules")}
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
                <img
                  src={profile?.profile_photo_url || creator.profile_photo}
                  alt={creator.name}
                  className={`w-32 h-32 rounded-full object-cover border-4 ${creator?.kyc_status === "approved" ? "border-red-500" : "border-[#32C8D1]"}`}
                />
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

              <Button
                onClick={handleSaveProfile}
                className="w-full bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
              >
                {t("creatorDashboard.settingsView.profile.saveProfile")}
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
                onClick={handleSaveProfile}
                className="w-full bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
              >
                {t("creatorDashboard.settingsView.profile.saveSocial")}
              </Button>
            </div>
          </Card>

          {/* Visibility Settings */}
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              {t("creatorDashboard.settingsView.profile.visibility")}
            </h3>

            <div className="space-y-6">
              <div className="flex items-center justify-between py-4 border-b border-gray-200">
                <div>
                  <Label className="text-base font-semibold text-gray-900 block mb-1">
                    {t("creatorDashboard.settingsView.profile.visibleToBrands")}
                  </Label>
                  <p className="text-sm text-gray-600">
                    {t(
                      "creatorDashboard.settingsView.profile.visibleToBrandsDesc",
                    )}
                  </p>
                </div>
                <Switch
                  checked={creator.is_public_brands || false}
                  onCheckedChange={(checked) => {
                    setCreator({ ...creator, is_public_brands: checked });
                    toast({
                      title: `Profile is now ${checked ? "VISIBLE" : "HIDDEN"} to brands! (Demo mode)`,
                    });
                  }}
                />
              </div>

              <div className="flex items-center justify-between py-4 border-b border-gray-200">
                <div>
                  <Label className="text-base font-semibold text-gray-900 block mb-1">
                    {t("creatorDashboard.settingsView.profile.enableLicensing")}
                  </Label>
                  <p className="text-sm text-gray-600">
                    {t(
                      "creatorDashboard.settingsView.profile.enableLicensingDesc",
                    )}
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between py-4">
                <div>
                  <Label className="text-base font-semibold text-gray-900 block mb-1">
                    {t(
                      "creatorDashboard.settingsView.profile.emailNotifications",
                    )}
                  </Label>
                  <p className="text-sm text-gray-600">
                    {t(
                      "creatorDashboard.settingsView.profile.emailNotificationsDesc",
                    )}
                  </p>
                </div>
                <Switch defaultChecked />
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
                      value={creator.price_per_month || 0}
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
                    <span className="text-base">
                      {t("creatorDashboard.settingsView.rules.month")}
                    </span>
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
            <span className="font-bold text-xl">Likelee</span>
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
                    {t("creatorDashboard.nav.profile.edit")}
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
                    {t("creatorDashboard.nav.profile.viewPublic")}
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
                    {t("creatorDashboard.nav.profile.help")}
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
                    {t("creatorDashboard.nav.profile.logout")}
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
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                    isActive
                      ? "bg-[#32C8D1] text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 text-left font-medium">
                        {item.label}
                      </span>
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
          {activeSection === "dashboard" && renderDashboard()}
          {activeSection === "public-profile" && renderPublicProfilePreview()}
          {activeSection === "content" && renderContent()}
          {activeSection === "likeness" && renderLikeness()}
          {activeSection === "voice" && renderVoice()}
          {activeSection === "campaigns" && renderCampaigns()}
          {activeSection === "approvals" && renderApprovals()}
          {activeSection === "archive" && renderCampaignArchive()}
          {activeSection === "contracts" && renderContracts()}
          {activeSection === "earnings" && renderEarnings()}
          {activeSection === "settings" && renderSettings()}
        </div>

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
                  <span className="font-bold text-lg">Likelee</span>
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
              // Check both real contracts and examples
              const contract =
                contracts.find((c) => c.id === selectedContract) ||
                exampleContracts.find((c) => c.id === selectedContract);
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
              // Check both real contracts and examples
              const contract =
                contracts.find((c) => c.id === selectedContract) ||
                exampleContracts.find((c) => c.id === selectedContract);
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
                      console.log("OAuth URL response:", res);

                      // Handle both possible response formats
                      const url = res?.data?.url || res?.url;
                      const status = res?.data?.status || res?.status;

                      if (status === "ok" && url) {
                        console.log("Redirecting to OAuth URL:", url);
                        window.location.href = url;
                        return; // Don't reset loading state, we're redirecting
                      } else {
                        console.error("Invalid response:", res);
                        throw new Error("Failed to get OAuth URL");
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
                      console.log("Stripe onboarding response:", res);

                      const url = res?.data?.url || res?.url;
                      if (url) {
                        console.log("Redirecting to Stripe onboarding:", url);
                        // Don't reset loading state - we're redirecting away
                        window.location.href = url;
                        return; // Exit early to prevent finally block
                      } else {
                        console.error("No URL in response:", res);
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
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <WalletIcon className="h-5 w-5 text-emerald-600" />
                <span className="text-emerald-900 font-medium">
                  Available Balance
                </span>
              </div>
              <span className="text-emerald-900 font-bold text-lg">
                $
                {(
                  (balances.find((b) => b.currency === "USD")
                    ?.available_cents || 0) / 100
                ).toFixed(2)}
              </span>
            </div>

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
                        (balances.find((b) => b.currency === "USD")
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
                  (balances.find((b) => b.currency === "USD")
                    ?.available_cents || 0) /
                    100 ||
                isLoadingPayout
              }
              onClick={async () => {
                try {
                  setIsLoadingPayout(true);
                  const { requestPayout } = await import("@/api/functions");
                  const res = await requestPayout({
                    profile_id: user?.id!,
                    amount_cents: Math.round(
                      parseFloat(requestPayoutAmount) * 100,
                    ),
                  });

                  if (res.data?.status === "ok") {
                    toast({
                      title: "Success",
                      description: "Payout request submitted successfully!",
                    });
                    setShowRequestPayoutModal(false);
                    setRequestPayoutAmount("");
                    fetchPayoutStatus();
                  } else {
                    throw new Error(
                      res.data?.error || "Failed to request payout",
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
                <p className="text-sm text-gray-700">Starting verification…</p>
              </div>
            )}
            <div id="veriff-kyc-embedded-creator" className="w-full h-full" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
