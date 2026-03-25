import React, {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { getBrandProfile } from "@/api/functions";
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
} from "lucide-react";
import { reviewOfferDeliverable, listOfferDeliverables } from "@/api/functions";
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

const ensureProtocol = (url: string | null | undefined) => {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

// Mock data
const mockBrand = {
  name: "Urban Apparel Co.",
  logo: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200",
  industry: "Retail & E-commerce",
  website: "www.urbanapparel.com",
  contact_email: "team@urbanapparel.com",
  plan: "Pro Studio",
  team_seats: 3,
};

const mockCreators = [
  {
    id: 1,
    name: "Emma",
    image:
      "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/5d413193e_Screenshot2025-10-29at63349PM.png",
    location: "Los Angeles, CA",
    tagline: "Fashion model specializing in beauty and lifestyle",
    followers: 42300,
    engagement: "4.2%",
    price: 450,
    turnaround: "12h",
    tags: ["Fashion", "Beauty", "Lifestyle"],
    verified: true,
    creator_type: "model",
    agency: "Elite Models LA",
    instagram: "https://instagram.com/emma",
    tiktok: "https://tiktok.com/@emma",
    portfolio_url: "https://emmamodels.com",
    bio: "Professional fashion model with 8+ years experience in editorial and commercial work. Specialized in beauty campaigns and lifestyle content.",
    height: "5ft 9in",
    weight: "125 lbs",
    bust: "34",
    waist: "25",
    hips: "36",
    skin_tone: "Fair",
    hair_color: "Blonde",
    eye_color: "Blue",
    niches: ["Fashion", "Beauty", "Lifestyle"],
    rules: ["No alcohol", "No swimwear"],
    past_projects: [
      {
        brand: "Urban Apparel",
        image:
          "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400",
      },
      {
        brand: "Beauty Co",
        image:
          "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400",
      },
    ],
  },
  {
    id: 2,
    name: "Sergine",
    image:
      "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/7b92ca646_Screenshot2025-10-29at63428PM.png",
    location: "New York, NY",
    tagline: "Minimalist fashion model with clean aesthetic",
    followers: 2800,
    engagement: "3.8%",
    price: 380,
    turnaround: "24h",
    tags: ["Fashion", "Minimalist", "Editorial"],
    verified: true,
    creator_type: "influencer",
    instagram: "https://instagram.com/sergine",
    tiktok: "https://tiktok.com/@sergine",
    bio: "Minimalist fashion influencer focused on sustainable style and clean aesthetics.",
    skin_tone: "Medium",
    hair_color: "Brown",
    eye_color: "Brown",
    niches: ["Fashion", "Minimalist", "Sustainable"],
    rules: [],
    past_projects: [
      {
        brand: "Sustainable Fashion Co",
        image:
          "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400",
      },
    ],
  },
  {
    id: 3,
    name: "Milan",
    image:
      "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/b0ae64ffa_Screenshot2025-10-29at63451PM.png",
    location: "Miami, FL",
    tagline: "Street style and urban fashion model",
    followers: 15200,
    engagement: "5.1%",
    price: 520,
    turnaround: "8h",
    tags: ["Streetwear", "Urban", "Fashion"],
    verified: true,
    creator_type: "ugc",
    instagram: "https://instagram.com/milan",
    bio: "UGC creator specializing in street style and urban fashion content.",
    skin_tone: "Tan",
    hair_color: "Black",
    eye_color: "Brown",
    niches: ["Streetwear", "Urban", "Fashion"],
    rules: ["No tobacco"],
    past_projects: [],
  },
  {
    id: 4,
    name: "Julia",
    image:
      "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/c5a5c61e4_Screenshot2025-10-29at63512PM.png",
    location: "Paris, France",
    tagline: "High fashion editorial and commercial model",
    followers: 5700,
    engagement: "6.2%",
    price: 580,
    turnaround: "24h",
    tags: ["Editorial", "High Fashion", "Commercial"],
    verified: true,
    creator_type: "actor",
    agency: "Talent Works Paris",
    portfolio_url: "https://juliaactor.com",
    bio: "Professional actor with extensive commercial and editorial experience.",
    skin_tone: "Olive",
    hair_color: "Dark Brown",
    eye_color: "Green",
    niches: ["Editorial", "High Fashion", "Commercial"],
    rules: ["No political content"],
    past_projects: [
      {
        brand: "Luxury Brand",
        image:
          "https://images.unsplash.com/photo-1445205170230-053b83016050?w=400",
      },
    ],
  },
  {
    id: 5,
    name: "Matt",
    image:
      "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/eb5550a53_Screenshot2025-10-29at63527PM.png",
    location: "London, UK",
    tagline: "Grooming and lifestyle model, skincare specialist",
    followers: 18600,
    engagement: "4.5%",
    price: 490,
    turnaround: "16h",
    tags: ["Grooming", "Lifestyle", "Skincare"],
    verified: true,
    creator_type: "athlete",
    sport: "Basketball",
    instagram: "https://instagram.com/matt",
    bio: "Professional athlete and grooming model. Specialist in skincare and lifestyle campaigns.",
    height: "6ft 2in",
    weight: "195 lbs",
    skin_tone: "Fair",
    hair_color: "Brown",
    eye_color: "Blue",
    niches: ["Grooming", "Lifestyle", "Skincare", "Sports"],
    rules: [],
    past_projects: [
      {
        brand: "Grooming Brand",
        image:
          "https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?w=400",
      },
    ],
  },
  {
    id: 6,
    name: "Carla",
    image:
      "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/cf591ec97_Screenshot2025-10-29at63544PM.png",
    location: "Los Angeles, CA",
    tagline: "Sustainable fashion advocate and lifestyle creator",
    followers: 53400,
    engagement: "7.1%",
    price: 650,
    turnaround: "12h",
    tags: ["Sustainable", "Fashion", "Lifestyle"],
    verified: true,
    creator_type: "model",
    agency: "IMG Models",
    instagram: "https://instagram.com/carla",
    tiktok: "https://tiktok.com/@carla",
    portfolio_url: "https://carlamodels.com",
    bio: "Sustainable fashion model and advocate. Passionate about eco-friendly brands and ethical fashion.",
    height: "5ft 10in",
    weight: "130 lbs",
    bust: "32",
    waist: "24",
    hips: "35",
    skin_tone: "Medium",
    hair_color: "Dark Brown",
    eye_color: "Brown",
    niches: ["Sustainable", "Fashion", "Lifestyle"],
    rules: ["No fast fashion", "Eco-friendly brands only"],
    past_projects: [
      {
        brand: "Eco Fashion Co",
        image:
          "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400",
      },
      {
        brand: "Green Apparel",
        image:
          "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400",
      },
    ],
  },
];

const mockCampaigns = [
  {
    id: 1,
    name: "Spring Collection Launch",
    creators: ["Sophia Chen"],
    creatorAvatars: [
      "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/5d413193e_Screenshot2025-10-29at63349PM.png",
    ],
    status: "in_progress",
    budget: 5000,
    escrow_amount: 5000,
    assets_delivered: 8,
    go_live: "2025-02-15",
    license_expiry: "2025-03-15",
    due_date: "2025-12-20",
    last_update: "2 hours ago",
    territory: "North America",
    channels: ["Social", "Web"],
    duration: "90 days",
  },
  {
    id: 2,
    name: "Summer Fitness Challenge",
    creators: ["Marcus Davis"],
    creatorAvatars: [
      "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/eb5550a53_Screenshot2025-10-29at63527PM.png",
    ],
    status: "pending_approval",
    budget: 2500,
    escrow_amount: 2500,
    assets_delivered: 6,
    go_live: "2025-03-01",
    license_expiry: "2025-04-01",
    due_date: "2025-11-15",
    last_update: "1 day ago",
    territory: "Global",
    channels: ["Social"],
    duration: "60 days",
  },
  {
    id: 3,
    name: "Holiday Gift Guide",
    creators: ["Emma"],
    creatorAvatars: [
      "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/5d413193e_Screenshot2025-10-29at63349PM.png",
    ],
    status: "completed",
    budget: 3200,
    escrow_amount: 0,
    assets_delivered: 12,
    go_live: "2024-12-01",
    license_expiry: "2025-01-15",
    due_date: "2024-11-30",
    last_update: "2 weeks ago",
    territory: "US Only",
    channels: ["Social", "Web", "Email"],
    duration: "45 days",
  },
  {
    id: 4,
    name: "Q1 Product Launch",
    creators: ["Milan"],
    creatorAvatars: [
      "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/b0ae64ffa_Screenshot2025-10-29at63451PM.png",
    ],
    status: "draft",
    budget: 1800,
    escrow_amount: 0,
    assets_delivered: 0,
    go_live: "2025-01-15",
    license_expiry: "2025-02-28",
    due_date: "2025-01-10",
    last_update: "3 days ago",
    territory: "North America",
    channels: ["Social"],
    duration: "30 days",
  },
];

const mockActivities = [
  {
    type: "deliverable",
    message: "Sophia Chen submitted 3 new assets for Spring Collection",
    time: "2 hours ago",
    urgent: true,
  },
  {
    type: "status",
    message: "Summer Fitness Challenge moved to Pending Approval",
    time: "1 day ago",
    urgent: true,
  },
  {
    type: "agency",
    message: "Agency submitted brief for New Product Launch",
    time: "2 days ago",
    urgent: false,
  },
  {
    type: "budget",
    message: "Spring Collection is within budget",
    time: "3 days ago",
    urgent: false,
  },
];

const mockAssets = [
  {
    id: 1,
    filename: "spring_collection_social_01.mp4",
    thumbnail:
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300",
    project: "Spring Collection Launch",
    creator: "Sophia Chen",
    type: "video",
    format: "MP4",
    resolution: "1080p",
    size: "24.5 MB",
    date: "2025-11-10",
    watermarked: true,
    territory: "North America",
    valid_until: "2025-03-15",
  },
  {
    id: 2,
    filename: "fitness_challenge_hero.png",
    thumbnail:
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300",
    project: "Summer Fitness Challenge",
    creator: "Marcus Davis",
    type: "image",
    format: "PNG",
    resolution: "4K",
    size: "8.2 MB",
    date: "2025-11-08",
    watermarked: true,
    territory: "Global",
    valid_until: "2025-04-01",
  },
  {
    id: 3,
    filename: "holiday_gift_carousel_01.jpg",
    thumbnail:
      "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=300",
    project: "Holiday Gift Guide",
    creator: "Emma",
    type: "image",
    format: "JPG",
    resolution: "1920x1080",
    size: "3.4 MB",
    date: "2024-11-25",
    watermarked: true,
    territory: "US Only",
    valid_until: "2025-01-15",
  },
];

const mockLicenses = [
  {
    id: 1,
    asset_name: "Spring Collection Video Suite",
    creator: "Sophia Chen",
    territory: "North America",
    duration: "90 days",
    start_date: "2024-12-15",
    end_date: "2025-03-15",
    channels: ["Social", "Web"],
    status: "active",
    days_remaining: 123,
  },
  {
    id: 2,
    asset_name: "Fitness Hero Images",
    creator: "Marcus Davis",
    territory: "Global",
    duration: "60 days",
    start_date: "2025-02-01",
    end_date: "2025-04-01",
    channels: ["Social"],
    status: "active",
    days_remaining: 140,
  },
  {
    id: 3,
    asset_name: "Holiday Campaign Assets",
    creator: "Emma",
    territory: "US Only",
    duration: "45 days",
    start_date: "2024-12-01",
    end_date: "2025-01-15",
    channels: ["Social", "Web", "Email"],
    status: "expiring_soon",
    days_remaining: 34,
  },
];

const spendData = [
  { month: "Jun", spend: 1200 },
  { month: "Jul", spend: 2400 },
  { month: "Aug", spend: 3100 },
  { month: "Sep", spend: 2800 },
  { month: "Oct", spend: 4200 },
  { month: "Nov", spend: 5100 },
];

const mockContracts = [
  {
    id: 1,
    project_name: "Spring Collection Launch",
    creator_name: "Sophia Chen",
    creator_handle: "@sophiachen",
    agency: null,
    status: "signed",
    signed_date: "2024-11-01",
    created_date: "2024-10-28",
    expiration_date: "2025-03-15",
    duration_days: 90,
    territory: "North America",
    channels: ["Social Media", "Website"],
    total_fee: 5000,
    platform_fee: 500,
    creator_earnings: 4500,
    auto_renew: true,
    revisions: 2,
    exclusivity: "Non-exclusive",
    deliverables: "3 Instagram Reels (15-30 seconds each), 1 Hero Image",
    payment_status: "released",
    payment_release_date: "2024-11-15",
    docusign_envelope_id: "ENV-2024-001",
    stripe_payout_id: "po_1234567890",
    custom_clauses: [],
    version: 1,
  },
  {
    id: 2,
    project_name: "Summer Fitness Challenge",
    creator_name: "Marcus Davis",
    creator_handle: "@marcusdavis",
    agency: "Fitness First Agency",
    status: "pending_signature",
    signed_date: null,
    created_date: "2024-11-08",
    sent_date: "2024-11-08",
    days_pending: 4,
    expiration_date: "2025-04-01",
    duration_days: 60,
    territory: "Global",
    channels: ["Social Media"],
    total_fee: 2500,
    platform_fee: 250,
    creator_earnings: 2250,
    auto_renew: false,
    revisions: 2,
    exclusivity: "Non-exclusive",
    deliverables: "2 TikTok videos (30-60 seconds each), 3 Instagram posts",
    payment_status: "in_escrow",
    custom_clauses: [
      {
        type: "Restriction",
        name: "No Competitor Brands",
        text: "Creator agrees not to promote direct competitor fitness brands during license period",
      },
    ],
    version: 1,
  },
  {
    id: 3,
    project_name: "Holiday Gift Guide",
    creator_name: "Emma",
    creator_handle: "@emma",
    agency: null,
    status: "signed",
    signed_date: "2024-10-15",
    created_date: "2024-10-10",
    expiration_date: "2025-01-15",
    duration_days: 45,
    territory: "US Only",
    channels: ["Social Media", "Website", "Email Marketing"],
    total_fee: 3200,
    platform_fee: 320,
    creator_earnings: 2880,
    auto_renew: true,
    revisions: 3,
    exclusivity: "Category exclusive",
    deliverables: "5 Instagram Reels, 2 Hero images, 1 Email banner",
    payment_status: "released",
    payment_release_date: "2024-11-20",
    docusign_envelope_id: "ENV-2024-003",
    stripe_payout_id: "po_9876543210",
    custom_clauses: [],
    version: 1,
  },
];

export default function BrandDashboard() {
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
  const [brand, setBrand] = useState(mockBrand);
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

  useEffect(() => {
    activeSectionRef.current = activeSection;
  }, [activeSection]);

  useEffect(() => {
    campaignHubTabRef.current = campaignHubTab;
  }, [campaignHubTab]);

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

  const formatRelativeTime = (value?: string | null) => {
    if (!value) return "Just now";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Just now";
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return "Just now";
    if (diffMins < 60)
      return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24)
      return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
    const diffWeeks = Math.floor(diffDays / 7);
    return `${diffWeeks} week${diffWeeks === 1 ? "" : "s"} ago`;
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
  const [showEscrowDetails, setShowEscrowDetails] = useState(false);
  const [showBriefDetails, setShowBriefDetails] = useState(false);
  const [showHireModal, setShowHireModal] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState(null);
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
  const [contractDetailTab, setContractDetailTab] = useState("summary");
  const { toast } = useToast();

  const [showSettings, setShowSettings] = useState(false);
  const [inboxPackages, setInboxPackages] = useState<any[]>([]);
  const [inboxPendingCount, setInboxPendingCount] = useState(0);
  const [confirmingDonePkg, setConfirmingDonePkg] = useState<any>(null);
  const [loadingInboxPackages, setLoadingInboxPackages] = useState(false);
  const [expandedInboxPackageId, setExpandedInboxPackageId] =
    useState<string>("");
  const [brandOfferItems, setBrandOfferItems] = useState<any[]>([]);
  const [loadingBrandOfferItems, setLoadingBrandOfferItems] = useState(false);
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
  const [creators, setCreators] = useState(mockCreators);
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
    return () => {
      mounted = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", onFocus);
      }
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
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadBrandProfile = async () => {
      try {
        const profile = await getBrandProfile();
        if (!mounted || !profile) return;
        setBrand((prev) => ({
          ...prev,
          name: profile?.company_name || profile?.name || prev.name || "Brand",
          industry: profile?.industry || prev.industry,
          website: profile?.website || prev.website,
          contact_email: profile?.email || prev.contact_email,
          logo: profile?.logo_url || prev.logo,
        }));
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
    if (activeSection !== "campaigns-inbox") return;
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
  }, [activeSection]);

  useEffect(() => {
    if (campaignHubTab !== "jobs") return;
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
  }, [campaignHubTab]);

  const updateJobStatus = async (jobId: string, status: string) => {
    try {
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
      activeSection !== "campaign-offers" &&
      activeSection !== "campaigns-contract-hub" &&
      activeSection !== "campaigns-deliverables"
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
        const withDeliverables = await Promise.all(
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
        setBrandOfferItems(withDeliverables);
        hasLoadedOffersRef.current = true;
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

  const escrowTotal = mockCampaigns
    .filter(
      (c) => c.status === "in_progress" || c.status === "pending_approval",
    )
    .reduce((sum, c) => sum + c.escrow_amount, 0);

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

  const pendingApprovalCount = mockCampaigns.filter(
    (c) => c.status === "pending_approval",
  ).length;
  const activeLicenses = mockLicenses.filter(
    (l) => l.status === "active" || l.status === "expiring_soon",
  );
  const expiringLicenses = mockLicenses.filter(
    (l) => l.status === "expiring_soon",
  );
  const escrowProjects = mockCampaigns.filter((c) => c.escrow_amount > 0);

  const navigationItems = [
    { id: "home", label: "Dashboard", icon: LayoutDashboard },
    { id: "marketplace", label: "Find Creators", icon: Search },
    { id: "marketplace-agencies", label: "Find Agencies", icon: Building2 },
    {
      id: "campaigns",
      label: "My Campaigns",
      icon: Target,
    },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    {
      id: "usage",
      label: "Usage Rights",
      icon: FileText,
      badge: expiringLicenses.length > 0 ? expiringLicenses.length : undefined,
    },
    { id: "billing", label: "Billing", icon: CreditCard },
    { id: "settings", label: "Settings", icon: Settings },
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

  const handleShareBrief = (campaignId) => {
    const campaign = mockCampaigns.find((c) => c.id === campaignId);
    if (campaign) {
      toast({
        title: "Success",
        description: `Brief shared with talent ${campaign.creators[0]}! (Demo mode)\nTalent will receive email with campaign details and contract.`,
      });
    }
  };

  const handleCreatorHire = (creator) => {
    setSelectedCreator(creator);
    setShowHireModal(true);
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
          className="border-2 border-gray-300"
        >
          ← Back to Dashboard
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Escrow Details</h1>
          <p className="text-gray-600">Projects with protected payments</p>
        </div>
      </div>

      {/* Escrow Summary */}
      <Card className="p-6 bg-blue-50 border-2 border-blue-300">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              Total in Escrow
            </h3>
            <p className="text-gray-600">
              Protected payment across {escrowProjects.length} active projects
            </p>
          </div>
          <p className="text-5xl font-bold text-blue-600">
            ${(escrowTotal / 1000).toFixed(1)}K
          </p>
        </div>
        <Alert className="bg-white border border-blue-200">
          <AlertCircle className="h-5 w-5 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>How Escrow Works:</strong> Your payment is held securely
            until you approve deliverables. Once approved, funds release to
            creators. If no action taken within 48 hours, payment auto-releases.
            This protects both you and the creator.
          </AlertDescription>
        </Alert>
      </Card>

      {/* Escrow Projects Table */}
      <Card className="p-6 bg-white border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-6">
          Projects with Funds in Escrow
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Project Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Creator
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Escrow Amount
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Due Date
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {escrowProjects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-gray-900">
                      {project.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      Last updated: {project.last_update}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {project.creatorAvatars &&
                        project.creatorAvatars.length > 0 && (
                          <img
                            src={project.creatorAvatars[0]}
                            alt={project.creators[0]}
                            className="w-8 h-8 rounded-full object-cover border border-gray-200"
                          />
                        )}
                      <span className="text-gray-900">
                        {project.creators[0]}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-2xl font-bold text-blue-600">
                      ${project.escrow_amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      Creator gets: ${(project.escrow_amount * 0.9).toFixed(0)}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <Badge
                      className={
                        project.status === "in_progress"
                          ? "bg-blue-100 text-blue-700 border border-blue-300"
                          : project.status === "pending_approval"
                            ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                            : "bg-gray-100 text-gray-700 border border-gray-300"
                      }
                    >
                      {project.status === "in_progress"
                        ? "In Progress"
                        : project.status === "pending_approval"
                          ? "Awaiting Your Approval"
                          : project.status.replace("_", " ")}
                    </Badge>
                    {project.status === "pending_approval" && (
                      <p className="text-xs text-yellow-600 mt-1 font-semibold">
                        ⏰ 48h to approve
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4 text-gray-700">
                    {new Date(project.due_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-2 border-gray-300"
                      onClick={() => {
                        setActiveSection("campaign-offers");
                        setSelectedCampaign(project.id);
                        setShowEscrowDetails(false);
                      }}
                    >
                      View Project
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Breakdown by Status */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6 bg-white border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Escrow by Status
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div>
                <p className="font-semibold text-gray-900">In Progress</p>
                <p className="text-sm text-gray-600">
                  {
                    escrowProjects.filter((p) => p.status === "in_progress")
                      .length
                  }{" "}
                  projects
                </p>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                $
                {escrowProjects
                  .filter((p) => p.status === "in_progress")
                  .reduce((sum, p) => sum + p.escrow_amount, 0)
                  .toLocaleString()}
              </p>
            </div>
            <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div>
                <p className="font-semibold text-gray-900">Awaiting Approval</p>
                <p className="text-sm text-gray-600">
                  {
                    escrowProjects.filter(
                      (p) => p.status === "pending_approval",
                    ).length
                  }{" "}
                  projects
                </p>
              </div>
              <p className="text-2xl font-bold text-yellow-600">
                $
                {escrowProjects
                  .filter((p) => p.status === "pending_approval")
                  .reduce((sum, p) => sum + p.escrow_amount, 0)
                  .toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Escrow Timeline
          </h3>
          <div className="space-y-3">
            <p className="text-gray-700">
              <strong className="text-gray-900">What happens next:</strong>
            </p>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  1
                </div>
                <p>Creator submits deliverables for your review</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  2
                </div>
                <p>You have 48 hours to approve or request revisions</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  3
                </div>
                <p>
                  Once approved, funds release to creator within 3 business days
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  4
                </div>
                <p>If no action taken, payment auto-releases after 48 hours</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  const renderHome = () => {
    if (showEscrowDetails) {
      return renderEscrowDetails();
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {brand.name}
          </h1>
          <p className="text-gray-600">Your creative workspace is ready.</p>
        </div>

        {/* Top Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">
                Active Projects
              </p>
              <Target className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-4xl font-bold text-gray-900">
              {campaignMetrics.active_projects_count}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {campaignMetrics.pending_approvals_count} awaiting approval
            </p>
          </Card>

          <Card
            className="p-6 bg-white border border-gray-200 cursor-pointer hover:shadow-lg transition-all hover:border-blue-300"
            onClick={() => setShowEscrowDetails(true)}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">In Escrow</p>
              <DollarSign className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-4xl font-bold text-gray-900">
              ${(escrowTotal / 1000).toFixed(1)}K
            </p>
            <p className="text-sm text-blue-600 mt-1 font-medium">
              Click for details →
            </p>
          </Card>

          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">
                Pending Approvals
              </p>
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            </div>
            <p className="text-4xl font-bold text-gray-900">
              {campaignMetrics.pending_approvals_count}
            </p>
            {campaignMetrics.pending_approvals_count > 0 && (
              <Badge className="mt-1 bg-yellow-100 text-yellow-700 border border-yellow-300">
                Action needed
              </Badge>
            )}
          </Card>

          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">
                This Month's Spend
              </p>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-4xl font-bold text-gray-900">$12.5K</p>
            <p className="text-sm text-green-600 mt-1">+22% vs last month</p>
          </Card>

          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">
                Avg. Turnaround
              </p>
              <Clock className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-4xl font-bold text-gray-900">
              {campaignMetrics.avg_turnaround_hours > 0
                ? `${campaignMetrics.avg_turnaround_hours}h`
                : "—"}
            </p>
            <p className="text-sm text-gray-600 mt-1">Industry: 48h</p>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="p-6 bg-white border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid md:grid-cols-5 gap-4">
            <Button
              onClick={() => {
                goToCampaignsSection();
              }}
              className="h-24 bg-[#F7B750] hover:bg-[#E6A640] text-white border-2 border-gray-300 flex-col gap-2"
            >
              <Plus className="w-6 h-6" />
              <span className="font-semibold">Start New Project</span>
            </Button>
            <Button
              onClick={() => setActiveSection("marketplace")}
              className="h-24 bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300 flex-col gap-2"
            >
              <Search className="w-6 h-6" />
              <span>Browse Creators</span>
            </Button>
            <Button
              onClick={() => {
                goToCampaignsSection();
              }}
              className="h-24 bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300 flex-col gap-2"
            >
              <CheckCircle2 className="w-6 h-6" />
              <span>View Active Campaigns</span>
            </Button>
            <Button
              onClick={() => {
                goToCampaignsSection();
              }}
              className="h-24 bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300 flex-col gap-2"
            >
              <Users className="w-6 h-6" />
              <span>Invite Agency</span>
            </Button>
            <Button
              onClick={() => setActiveSection("marketplace-agencies")}
              className="h-24 bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300 flex-col gap-2"
            >
              <Users className="w-6 h-6" />
              <span>Browse Agencies</span>
            </Button>
          </div>
        </Card>

        {/* Recent Projects & Activity Feed */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Recent Projects
            </h3>
            <div className="space-y-3">
              {loadingBrandOfferItems && (
                <Card className="p-4 bg-gray-50 border border-gray-200">
                  <p className="text-sm text-gray-600">
                    Loading recent projects...
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
                          {String(campaign.status).replace(/_/g, " ")}
                        </Badge>
                        {campaign.completed_at && (
                          <Badge className="bg-green-100 text-green-700 border border-green-300">
                            Done
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        Due: {campaign.due_date.toLocaleDateString()}
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
                        View Project →
                      </Button>
                    </div>
                  </Card>
                ))}
              {!loadingBrandOfferItems && recentProjects.length === 0 && (
                <Card className="p-4 bg-gray-50 border border-gray-200">
                  <p className="text-sm text-gray-600">
                    No recent projects yet.
                  </p>
                </Card>
              )}
            </div>
          </Card>

          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Activity Feed
            </h3>
            <div className="space-y-3">
              {loadingActivityEvents && (
                <div className="p-3 rounded-lg border bg-gray-50 border-gray-200">
                  <p className="text-sm text-gray-600">
                    Loading activity feed...
                  </p>
                </div>
              )}
              {!loadingActivityEvents && activityEvents.length === 0 && (
                <div className="p-3 rounded-lg border bg-gray-50 border-gray-200">
                  <p className="text-sm text-gray-600">
                    No recent activity yet.
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
                      ? "Agency"
                      : actorTypeRaw === "creator"
                        ? "Creator"
                        : actorTypeRaw === "brand"
                          ? "You"
                          : "Someone");
                  const description = String(event?.description || "");
                  const createdAt = formatRelativeTime(event?.created_at);
                  const fallbackActionMap: Record<string, string> = {
                    "campaign.created": "created a campaign",
                    "campaign.completed": "marked a campaign as done",
                    "offer.sent": "sent an offer",
                    "deliverable.submitted": "submitted a deliverable",
                    "deliverable.changes_requested":
                      "requested edits on a deliverable",
                    "deliverable.approved": "approved a deliverable",
                    "deliverable.comment": "left feedback on a deliverable",
                    "job.created": "created a job",
                    "job.invite.sent": "sent a job invite",
                    "job.invite.accepted": "accepted a job invite",
                    "job.invite.declined": "declined a job invite",
                    "job.application.submitted": "applied for a job",
                    "connection.request.sent": "sent a connection request",
                    "connection.request.accepted":
                      "accepted a connection request",
                    "connection.request.declined":
                      "declined a connection request",
                  };
                  const fallbackAction =
                    fallbackActionMap[eventType] ||
                    (eventType
                      ? eventType.replace(/_/g, " ").replace(/\./g, " ")
                      : "performed an action");
                  const fallbackDescription = `${actorLabel} ${fallbackAction}.`;
                  let message = description || fallbackDescription;
                  if (actorTypeRaw === "brand" && message) {
                    if (actor && message.startsWith(actor)) {
                      message = `You${message.slice(actor.length)}`;
                    } else if (message.startsWith("Brand")) {
                      message = `You${message.slice("Brand".length)}`;
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
            Monthly Spend Trend
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={spendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
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
            <h1 className="text-3xl font-bold text-gray-900">
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
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

  const renderAgencyMarketplace = () => (
    <MarketplaceSection
      entityType="agency"
      title="Agency Marketplace"
      subtitle="Verified agencies only"
      verifiedBadgeLabel=""
      searchPlaceholder="Search by agency name, type, service, or location..."
      resultLimit={60}
      queryScope="brand-agency-marketplace"
    />
  );

  const renderInboxSubtab = () => (
    <div className="space-y-5">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-1">Inbox</h2>
        <p className="text-gray-600">
          View packages and licensing proposals from agencies
        </p>
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
          Talent Packages ({inboxPackages.length})
        </button>
        <button
          onClick={() => setInboxSubTab("direct_requests")}
          className={`px-3 py-1.5 text-sm font-semibold rounded-md ${
            inboxSubTab === "direct_requests"
              ? "bg-white shadow-sm text-gray-900"
              : "text-gray-500"
          }`}
        >
          Direct Requests
        </button>
      </div>

      {inboxSubTab === "talent_packages" ? (
        <div className="space-y-4">
          {loadingInboxPackages && (
            <Card className="p-6 bg-white border border-gray-300 rounded-none">
              <p className="text-sm text-gray-500">Loading packages...</p>
            </Card>
          )}
          {!loadingInboxPackages && inboxPackages.length === 0 && (
            <Card className="p-6 bg-white border border-gray-300 rounded-none">
              <p className="text-sm text-gray-500">No packages received yet.</p>
            </Card>
          )}
          {inboxPackages.map((pkg: any) => {
            const expiresAt = pkg?.expires_at ? new Date(pkg.expires_at) : null;
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
                          "Talent package"}
                      </h3>
                      {String(pkg?.status || "") === "sent" && (
                        <Badge className="bg-black text-white text-[10px] uppercase rounded-sm">
                          New
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 font-medium">
                      From:{" "}
                      {pkg?.agencies?.agency_name || pkg?.agency_id || "Agency"}
                    </p>
                    <p className="text-sm text-gray-500">
                      Sent:{" "}
                      {pkg?.sent_at
                        ? new Date(String(pkg.sent_at)).toLocaleString()
                        : "—"}
                    </p>
                    {pkg?.expires_at && (
                      <p
                        className={`text-sm ${
                          isExpired ? "text-red-600 font-bold" : "text-gray-500"
                        }`}
                      >
                        Expires: {new Date(pkg.expires_at).toLocaleDateString()}
                        {isExpired && " (Expired)"}
                      </p>
                    )}
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 border border-blue-200 text-xs">
                    {selectedTalentCount} talent
                  </Badge>
                </div>

                {pkg?.message && (
                  <p className="text-gray-700 italic mb-4">
                    "{String(pkg.message)}"
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    className={`flex-1 rounded-none ${
                      isExpired
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-black hover:bg-gray-800 text-white"
                    }`}
                    disabled={isExpired || isDone}
                    onClick={() => setConfirmingDonePkg(pkg)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {isDone ? "Done" : isExpired ? "Expired" : "Mark Done"}
                  </Button>
                  <Button
                    variant="outline"
                    className="border border-gray-300 rounded-none"
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
                    Open Package
                  </Button>
                  <Button
                    variant="outline"
                    className="border border-gray-300 rounded-none"
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
  const formatContractStatusLabel = (statusRaw: unknown) =>
    String(statusRaw || "sent")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase());

  const handleDeliverableReview = async (
    offerId: string,
    deliverableId: string,
    action: string,
    note?: string,
  ) => {
    if (deliverableReviewBusyRef.current.has(deliverableId)) return;
    deliverableReviewBusyRef.current.add(deliverableId);
    try {
      setReviewing(deliverableId);
      const result = await reviewOfferDeliverable(offerId, deliverableId, {
        action,
        note,
      });
      const escrow = result?.escrow;
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
        } else if (String(escrow?.payment_status || "") !== "paid") {
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

  const getPublicUrl = (del: any) => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
    const path = typeof del === "string" ? del : del?.asset_url;
    if (!path) return "";
    if (path.startsWith("http")) return path;

    if (typeof del === "object" && del?.id && del?.offer_id) {
      const proxyUrl = `/api/campaign-offers/${del.offer_id}/deliverables/${del.id}/file`;
      return authToken ? `${proxyUrl}?token=${authToken}` : proxyUrl;
    }

    // Never expose private-bucket URLs directly; access must go through API proxies.
    return "";
  };

  const renderCampaignContractHub = () => (
    <div className="space-y-5">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-1">Contract Hub</h2>
        <p className="text-gray-600">Campaign contracts and signing status.</p>
      </div>
      <div className="space-y-3">
        {loadingBrandOfferItems ? (
          <Card className="p-6 bg-white border border-gray-300 rounded-none">
            <div className="flex items-center gap-3">
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
              <p className="text-sm text-gray-500">Loading offers...</p>
            </div>
          </Card>
        ) : brandOfferItems.length === 0 ? (
          <Card className="p-6 bg-white border border-gray-300 rounded-none">
            <p className="text-sm text-gray-500">
              No offer contracts available yet.
            </p>
          </Card>
        ) : null}
        {brandOfferItems.map((offer: any) => {
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
          const downloadedDeliverables = selectedOfferHubDeliverables.filter(
            (d: any) =>
              Boolean(d?.meta?.brand_downloaded_at) &&
              ["approved", "accepted"].includes(
                String(d?.status || "").toLowerCase(),
              ),
          );
          const approvedCount = downloadedDeliverables.filter(
            (d: any) => String(d?.status || "").toLowerCase() === "approved",
          ).length;
          const totalCount = downloadedDeliverables.length;
          const progressPct =
            totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;
          return (
            <Card
              key={offerId}
              className="p-4 bg-white border border-gray-300 rounded-none space-y-2"
            >
              {/* Payment Pending Banner */}
              {isFullySigned && offer?.payment_status !== "paid" && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  <span className="text-amber-700 text-xs font-semibold">
                    ⏳ Contract signed. Payment required before deliverables can
                    start.
                  </span>
                  <Button
                    size="sm"
                    className="ml-auto bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-md px-3 py-1"
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
                              data?.message || "Could not start checkout.",
                            variant: "destructive",
                          });
                        }
                      } catch (e: any) {
                        const msg = String(e?.message || "");
                        toast({
                          title: msg.includes("no_talents_assigned")
                            ? "Talent assignment required"
                            : "Payment Error",
                          description: msg.includes("no_talents_assigned")
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
                </div>
              )}
              {isFullySigned && offer?.payment_status === "paid" && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                  <span className="text-emerald-700 text-xs font-semibold">
                    ✅ Payment confirmed — deliverables can be submitted.
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">
                    {offer?.brand_campaigns?.name || "Campaign offer"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {String(offer?.status || "sent").replace(/_/g, " ")}
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
                  {expanded ? "Hide" : "View Contracts"}
                </Button>
              </div>
              {expanded && (
                <div className="border border-gray-200 rounded-none bg-gray-50 flex flex-col gap-px">
                  {loadingOfferHubDetails ? (
                    <div className="p-8 text-center bg-white">
                      <Loader2 className="w-8 h-8 text-gray-300 mx-auto mb-3 animate-spin" />
                      <p className="text-sm text-gray-500 font-medium">
                        Loading contracts...
                      </p>
                    </div>
                  ) : selectedOfferHubContracts.filter(
                      (c: any) =>
                        c?.docuseal_status && c.docuseal_status !== "draft",
                    ).length === 0 ? (
                    <div className="p-8 text-center bg-white">
                      <FileText className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500 font-medium">
                        No active contracts
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Contracts requiring your attention will appear here.
                      </p>
                    </div>
                  ) : (
                    selectedOfferHubContracts
                      .filter(
                        (c: any) =>
                          c?.docuseal_status && c.docuseal_status !== "draft",
                      )
                      .map((contract: any) => {
                        const isCompleted =
                          contract?.docuseal_status === "completed";
                        const isPending =
                          contract?.docuseal_status === "sent" ||
                          contract?.docuseal_status === "opened";
                        // Calculate signing URL from submission ID
                        const submissionId = contract?.docuseal_submission_id;
                        // Based on standard DocuSeal flow, though typically we'd fetch this from backend
                        // For now we'll link to a placeholder or rely on email if URL isn't directly available,
                        // but ideally we'd have the signing_url. We'll add a realistic button.

                        return (
                          <div
                            key={String(contract?.id)}
                            className="bg-white p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
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
                                      contract?.docuseal_status || "Unknown",
                                    ).replace(/_/g, " ")}
                                  </span>
                                  {contract?.updated_at && (
                                    <span className="text-xs text-gray-500">
                                      Updated{" "}
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
                                    const subId =
                                      contract?.docuseal_slug ||
                                      contract?.docuseal_submission_id;
                                    if (subId) {
                                      window.open(
                                        `https://docuseal.com/s/${subId}`,
                                        "_blank",
                                      );
                                    } else {
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
      <Card className="p-4 bg-white border border-gray-300 rounded-none">
        {loadingContractHubRows ? (
          <p className="text-sm text-gray-500">Loading submissions</p>
        ) : contractHubRows.length === 0 ? (
          <p className="text-sm text-gray-500">No contract submissions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-gray-700">
              <thead className="border-b border-gray-200 text-gray-800">
                <tr>
                  <th className="px-2 py-2">Campaign Name</th>
                  <th className="px-2 py-2">Template</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Sent Date</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contractHubRows.map((row: any) => (
                  <tr
                    key={String(row?.id)}
                    className="border-b border-gray-100"
                  >
                    <td className="px-2 py-2 font-medium text-gray-900">
                      {String(row?.campaign_name || "Campaign offer")}
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
                        {String(row?.docuseal_status || "").toLowerCase() ===
                          "sent" && <Mail className="h-3.5 w-3.5 mr-1.5" />}
                        {String(row?.docuseal_status || "").toLowerCase() ===
                          "signed" && (
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        {formatContractStatusLabel(row?.docuseal_status)}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      {formatHubDate(row?.sent_at || row?.created_at)}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-3">
                        <button
                          className="text-blue-600 hover:text-blue-700"
                          title="Resend"
                          aria-label="Resend"
                          type="button"
                          onClick={async () => {
                            try {
                              await base44.post(
                                `/api/campaign-offers/${encodeURIComponent(
                                  String(row?.offer_id || ""),
                                )}/contracts/send`,
                                { contract_id: String(row?.id || "") },
                              );
                              const refreshed = await base44.get<{
                                contracts?: any[];
                              }>(
                                `/api/campaign-offers/${encodeURIComponent(
                                  String(row?.offer_id || ""),
                                )}/contracts`,
                              );
                              const refreshedContracts = Array.isArray(
                                refreshed?.contracts,
                              )
                                ? refreshed.contracts
                                : [];
                              setContractHubRows((prev) =>
                                prev.map((existing: any) => {
                                  if (String(existing?.id) !== String(row?.id))
                                    return existing;
                                  const fresh = refreshedContracts.find(
                                    (c: any) =>
                                      String(c?.id) === String(row?.id),
                                  );
                                  return fresh
                                    ? {
                                        ...fresh,
                                        offer_id: existing?.offer_id,
                                        campaign_name: existing?.campaign_name,
                                      }
                                    : existing;
                                }),
                              );
                              toast({ title: "Contract resent" });
                            } catch (e: any) {
                              toast({
                                title: "Resend failed",
                                description: e?.message || "Please try again.",
                                variant: "destructive" as any,
                              });
                            }
                          }}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
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
                                  (x: any) => String(x?.id) !== String(row?.id),
                                ),
                              );
                              toast({ title: "Contract archived" });
                            } catch (e: any) {
                              toast({
                                title: "Archive failed",
                                description: e?.message || "Please try again.",
                                variant: "destructive" as any,
                              });
                            }
                          }}
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                        {row?.meta?.docuseal_document_url && (
                          <a
                            href={String(row.meta.docuseal_document_url)}
                            target="_blank"
                            rel="noreferrer"
                            download
                            title="Download"
                            aria-label="Download"
                            className="text-blue-700 hover:text-blue-800"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );

  const renderCampaignDeliverablesHub = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-black text-gray-900 font-syne tracking-tight">
          Deliverables
        </h2>
        <p className="text-gray-500 font-medium mt-1">
          Review and approve content from your campaign creators.
        </p>
      </div>
      <div className="space-y-4">
        {loadingBrandOfferItems ? (
          <Card className="p-12 bg-white border border-gray-300 rounded-none text-center">
            <Loader2 className="w-8 h-8 text-gray-300 mx-auto mb-3 animate-spin" />
            <p className="text-sm text-gray-500">Loading campaigns...</p>
          </Card>
        ) : brandOfferItems.length === 0 ? (
          <Card className="p-12 bg-white border border-gray-300 rounded-none text-center">
            <p className="text-sm text-gray-500">
              No active campaigns available.
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
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/80 transition-colors"
                  onClick={() => {
                    setExpandedCampaignHubId(
                      campaignExpanded ? "" : campaignId,
                    );
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-gray-100 text-gray-600">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">
                        {group?.campaignName || "Campaign"}
                      </h3>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">
                        {group?.offers?.length || 0} collaborators
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className="rounded-full px-3 py-1 text-[11px] font-semibold bg-sky-100 text-sky-700 border border-sky-200 shadow-sm">
                      {aggregate.reviewed} reviewed
                    </Badge>
                    <Badge className="rounded-full px-3 py-1 text-[11px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm">
                      {aggregate.approved} approved
                    </Badge>
                    <Badge className="rounded-full px-3 py-1 text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 shadow-sm">
                      {completionPct}%
                    </Badge>
                    {campaignExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
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
                              className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/80 transition-colors"
                              onClick={async (event) => {
                                event.stopPropagation();
                                const next = expanded ? "" : offerId;
                                setSelectedOfferHubId(next);
                                await loadOfferHubDetails(next);
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <Avatar className="w-9 h-9">
                                  <AvatarImage src={collaboratorAvatar} />
                                  <AvatarFallback className="bg-indigo-50 text-indigo-600 font-bold text-xs uppercase">
                                    {collaboratorInitial}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-bold text-gray-900">
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
                                      return "Creator • Creator";
                                    })()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge className="rounded-full px-3 py-1 text-[11px] font-semibold bg-sky-100 text-sky-700 border border-sky-200 shadow-sm">
                                  {reviewedCount} reviewed
                                </Badge>
                                <Badge className="rounded-full px-3 py-1 text-[11px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm">
                                  {approvedCount} approved
                                </Badge>
                                <Badge className="rounded-full px-3 py-1 text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 shadow-sm">
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
                                      Campaign
                                    </p>
                                    <p className="text-sm font-bold text-gray-900 mt-1">
                                      {group?.campaignName || "Campaign"}
                                    </p>
                                  </div>
                                  <div className="bg-white border border-gray-200 p-4">
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                                      Progress
                                    </p>
                                    <p className="text-sm font-bold text-gray-900 mt-1">
                                      {approvedCount}/
                                      {expectedDeliverables || 0}
                                    </p>
                                  </div>
                                  <div className="bg-white border border-gray-200 p-4">
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                                      Completion
                                    </p>
                                    <p className="text-sm font-bold text-gray-900 mt-1">
                                      {completionPct}%
                                    </p>
                                  </div>
                                </div>
                                <div className="bg-white border border-gray-200 p-4 mb-5">
                                  <p className="text-xs font-semibold text-gray-700 mb-2">
                                    Progress
                                  </p>
                                  <Progress
                                    value={completionPct}
                                    className="h-2"
                                  />
                                  <p className="text-[11px] text-gray-500 mt-2">
                                    {approvedCount}/{expectedDeliverables || 0}{" "}
                                    deliverables approved
                                  </p>
                                </div>
                                <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
                                  <p className="text-sm font-semibold text-amber-900">
                                    Approving any 1 deliverable triggers escrow
                                    payout (once).
                                  </p>
                                  <p className="text-xs text-amber-800 mt-1">
                                    After you approve a deliverable, the
                                    Download button appears. Approvals are final
                                    and can’t be undone.
                                  </p>
                                </div>
                                {loadingOfferHubDetails &&
                                selectedOfferHubId === offerId ? (
                                  <div className="py-12 text-center">
                                    <Loader2 className="w-8 h-8 text-gray-300 mx-auto mb-3 animate-spin" />
                                    <p className="text-sm text-gray-500 font-medium">
                                      Loading deliverables...
                                    </p>
                                  </div>
                                ) : selectedOfferHubDeliverables.length ===
                                  0 ? (
                                  <div className="py-12 text-center">
                                    <ImageIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                                    <p className="text-sm text-gray-400 font-medium italic">
                                      No content has been submitted yet.
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
                                        return (
                                          <Card
                                            key={String(del.id)}
                                            className="group overflow-hidden rounded-2xl border border-white/70 bg-white/70 backdrop-blur-lg shadow-lg hover:shadow-2xl transition-all cursor-zoom-in"
                                            onClick={() => {
                                              setPreviewItems(
                                                selectedOfferHubDeliverables,
                                              );
                                              setPreviewIndex(idx);
                                              setPreviewImage(del);
                                            }}
                                          >
                                            <div className="aspect-[4/5] bg-gray-100 relative overflow-hidden">
                                              {String(
                                                del?.asset_type || "",
                                              ).startsWith("image") ? (
                                                <img
                                                  src={getPublicUrl(del)}
                                                  alt={
                                                    del.caption || "Deliverable"
                                                  }
                                                  className="w-full h-full object-cover"
                                                />
                                              ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                                  <Video className="w-12 h-12 text-white/20" />
                                                </div>
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
                                                    ? "New"
                                                    : del.status ===
                                                        "brand_approved"
                                                      ? "approved"
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
                                                    isApproved || isBusy
                                                  }
                                                  onClick={() =>
                                                    handleDeliverableReview(
                                                      offerId,
                                                      del.id,
                                                      "approve",
                                                    )
                                                  }
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
                                                    isApproved || isBusy
                                                  }
                                                  onClick={() =>
                                                    handleDeliverableReview(
                                                      offerId,
                                                      del.id,
                                                      "changes_requested",
                                                    )
                                                  }
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
        budget: 0,
        creators: [collaboratorLabel],
        creatorAvatars: [
          String(offer?.target_avatar_url || "").trim() || "/favicon.svg",
        ],
        channels: [],
        duration_days: durationDays,
        category: String(brandCampaigns?.category || "").trim(),
        description: String(brandCampaigns?.description || "").trim(),
        objective: String(brandCampaigns?.objective || "").trim(),
        usage_scope: String(brandCampaigns?.usage_scope || "").trim(),
        territory: String(brandCampaigns?.territory || "").trim(),
        exclusivity: String(brandCampaigns?.exclusivity || "").trim(),
        budget_range: String(brandCampaigns?.budget_range || "").trim(),
        start_date: String(brandCampaigns?.start_date || "").trim(),
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
        due_date: representative?.due_date,
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
              ← Back to Campaigns
            </Button>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Campaign not found.</AlertDescription>
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
        const briefValue = (key: string, fallback = "Not specified") => {
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
          return legacy.length > 0 ? legacy.join("\n") : "Not specified";
        })();

        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setShowBriefDetails(false)}
                className="border-2 border-gray-300"
              >
                ← Back to Project
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {campaign.name} - Brief & Contract
                </h1>
                <p className="text-gray-600">Detailed scope and requirements</p>
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
                          <li key={`donts-${idx}`}>
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
                Campaign Scope &amp; Contract Details
              </h2>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <p className="text-slate-900">
                    <span className="font-semibold">Objective:</span>{" "}
                    {briefValue("overview_objective")}
                  </p>
                  <p className="text-slate-900">
                    <span className="font-semibold">Target Audience:</span>{" "}
                    {briefValue("overview_target_audience")}
                  </p>
                  <p className="text-slate-900">
                    <span className="font-semibold">Campaign Duration:</span>{" "}
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
                    <span className="font-semibold">Creator Payment:</span>{" "}
                    {briefValue("budget_creator_payment")}
                  </p>
                  <p className="text-slate-900">
                    <span className="font-semibold">Submission Deadline:</span>{" "}
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
                  <span className="font-semibold">Included Revisions:</span>{" "}
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
                      <li key={`approval-${idx}`}>
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
                <p className="font-semibold text-slate-900 mb-1">Legal Terms</p>
                {briefLines("legal_terms").length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1 text-slate-900">
                    {briefLines("legal_terms").map((line, idx) => (
                      <li key={`legal-${idx}`}>
                        {line.replace(/^[•-]\s*/, "")}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500">Not specified</p>
                )}
              </div>
            </Card>

            <div className="flex gap-4">
              <Button
                variant="outline"
                className="border-2 border-gray-300 h-12"
                onClick={() => setShowBriefDetails(false)}
              >
                Close
              </Button>
            </div>
          </div>
        );
      }

      const selectedBrief =
        campaign?.brief_snapshot && typeof campaign.brief_snapshot === "object"
          ? campaign.brief_snapshot
          : {};
      const selectedBriefValue = (key: string, fallback = "Not specified") => {
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
              ← Back to Campaigns
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {campaign.name}
              </h1>
              <p className="text-gray-600">Created {campaign.last_update}</p>
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
                  {campaign.status.replace("_", " ")}
                </Badge>
                {campaign.completed_at && (
                  <Badge className="bg-green-100 text-green-700 border border-green-300">
                    Done
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm text-gray-600">Due Date</p>
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
                  Brief & Scope
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-2 border-blue-300 text-blue-600"
                >
                  View Full Details →
                </Button>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold text-gray-700 block mb-2">
                    Deliverables
                  </Label>
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {selectedRequiredDeliverables}
                  </p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 block mb-2">
                      Timeline
                    </Label>
                    <p className="text-gray-900">
                      Start: {(campaign as any)?.go_live || "—"}
                    </p>
                    <p className="text-gray-900">
                      Due: {new Date(campaign.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 block mb-2">
                      Budget
                    </Label>
                    <p className="text-gray-900">
                      Total: {selectedBriefValue("budget_total", "N/A")}
                    </p>
                    <p className="text-sm text-gray-600">
                      Creator:{" "}
                      {selectedBriefValue("budget_creator_payment", "N/A")}
                    </p>
                    <p className="text-sm text-gray-600">
                      Submission Deadline:{" "}
                      {selectedBriefValue("budget_submission_deadline", "N/A")}
                    </p>
                  </div>
                </div>
              </div>
              <Alert className="mt-4 bg-blue-50 border border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900 text-sm">
                  Click to view complete brief with dialogue, visuals, and
                  contract details
                </AlertDescription>
              </Alert>
            </Card>

            {/* Talent Info */}
            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Assigned Collaborators
              </h3>
              {campaign.creators.length === 0 ? (
                <p className="text-sm text-gray-500">No collaborators yet.</p>
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
              Contract Management
            </h3>
            <p className="text-gray-600 mb-6">
              Need to modify the contract terms? Request changes or updates.
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
                View Full Contract
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Offers</h1>
          <p className="text-gray-600">
            Review and manage campaign offers and ongoing collaborations
          </p>
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
            Active (
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
            Pending Approval (
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
            Expired ({groupedCampaigns.filter((c: any) => c.is_expired).length})
          </button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {loadingBrandOfferItems && (
            <Card className="p-6 bg-white border border-gray-200">
              <p className="text-sm text-gray-600">Loading campaigns...</p>
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
                      {offers.length} collaborators
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusBadgeClass}>
                      {String(campaign.status).replace(/_/g, " ")}
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
                      <span className="text-gray-600">Budget:</span>
                      <span className="font-bold text-gray-900">
                        ${Number(campaign.budget || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Due Date:</span>
                      <span className="font-medium text-gray-900">
                        {campaign.due_date
                          ? new Date(
                              String(campaign.due_date),
                            ).toLocaleDateString()
                          : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Assets:</span>
                      <span className="font-medium text-gray-900">
                        {Number(campaign.assets_delivered || 0)} delivered
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Update:</span>
                      <span className="font-medium text-gray-900">
                        {campaign.last_update || "—"}
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
                      Offers
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full border-2 border-gray-300"
                      onClick={(event) => {
                        event.stopPropagation();
                        const first = offers[0];
                        if (first) openAddCollaboratorFlow(first);
                      }}
                    >
                      Add Collaborator
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
                                {String(offer?.status || "").replace(/_/g, " ")}
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
                              View
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
    const campaignsForHub = mockCampaigns.filter((campaign) => {
      if (campaignHubTab === "inbox") return false;
      const mappedStatus =
        campaign.status === "in_progress"
          ? "active"
          : campaign.status === "pending_approval"
            ? "pending_approval"
            : campaign.status === "completed"
              ? "completed"
              : "draft";
      return mappedStatus === campaignHubTab;
    });

    return (
      <div className="space-y-8">
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
            <DollarSign className="w-8 h-8 text-[#F7B750] mb-4" />
            <p className="text-sm text-gray-600 mb-1">Total Spend (30d)</p>
            <p className="text-3xl font-bold text-gray-900">$12.4K</p>
          </Card>
          <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
            <Users className="w-8 h-8 text-[#F7B750] mb-4" />
            <p className="text-sm text-gray-600 mb-1">Active Collaborators</p>
            <p className="text-3xl font-bold text-gray-900">8</p>
          </Card>
          <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
            <FileText className="w-8 h-8 text-[#F7B750] mb-4" />
            <p className="text-sm text-gray-600 mb-1">Campaigns Launched</p>
            <p className="text-3xl font-bold text-gray-900">12</p>
          </Card>
        </div>

        <div className="grid md:grid-cols-5 gap-6">
          <Card className="p-6 bg-white border-2 border-[#F7B750] rounded-none">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Collaborate with Agency
            </h3>
            <Button
              onClick={() => {
                goToCampaignsSection();
              }}
              className="w-full bg-[#F7B750] hover:bg-[#E6A640] text-white rounded-none"
            >
              Invite Agency
            </Button>
          </Card>
          <Card className="p-6 bg-white border-2 border-[#FAD54C]/60 opacity-70 rounded-none">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Add AI Creator
            </h3>
            <Button
              disabled
              className="w-full bg-[#FAD54C] text-white rounded-none cursor-not-allowed"
            >
              Coming Soon
            </Button>
          </Card>
          <Card className="p-6 bg-white border-2 border-amber-600/60 opacity-70 rounded-none">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Invite Company Seat
            </h3>
            <Button
              disabled
              className="w-full bg-amber-600 text-white rounded-none cursor-not-allowed"
            >
              Coming Soon
            </Button>
          </Card>
          <Card className="p-6 bg-white border-2 border-orange-600 rounded-none">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              AI Studio Add-On
            </h3>
            <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-none">
              Enable Add-On
            </Button>
          </Card>
          <Card className="p-6 bg-white border-2 border-blue-600 rounded-none">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Post a Job</h3>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-none"
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
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Your Campaigns</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCampaignHubTab("active")}
                className={`border-2 rounded-none ${campaignHubTab === "active" ? "border-black bg-black text-white" : "border-gray-300"}`}
              >
                Active
              </Button>
              <Button
                variant="outline"
                onClick={() => setCampaignHubTab("pending_approval")}
                className={`border-2 rounded-none ${campaignHubTab === "pending_approval" ? "border-black bg-black text-white" : "border-gray-300"}`}
              >
                Pending Approval
              </Button>
              <Button
                variant="outline"
                onClick={() => setCampaignHubTab("completed")}
                className={`border-2 rounded-none ${campaignHubTab === "completed" ? "border-black bg-black text-white" : "border-gray-300"}`}
              >
                Expired
              </Button>
              <Button
                variant="outline"
                onClick={() => setCampaignHubTab("jobs")}
                className={`border-2 rounded-none ${campaignHubTab === "jobs" ? "border-black bg-black text-white" : "border-gray-300"}`}
              >
                Jobs
              </Button>
            </div>
          </div>
          {campaignHubTab === "jobs" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Job Postings
                  </h3>
                  <p className="text-sm text-gray-600">
                    Manage published jobs, drafts, and applications.
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
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                >
                  Post Job
                </Button>
              </div>
              <Card className="p-4 bg-white border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <div className="relative">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                      <Input
                        value={jobSearch}
                        onChange={(e) => setJobSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setJobSearch("");
                        }}
                        placeholder="Search job title, call type, or role"
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
                      <SelectItem value="draft">Draft</SelectItem>
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
                          <div className="flex flex-col items-start lg:items-end gap-3">
                            <div className="flex items-center gap-6 text-sm text-gray-500 whitespace-nowrap">
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
                        <div className="pt-3 border-t border-slate-200 flex flex-wrap justify-end gap-2">
                          {job.status === "open" && (
                            <Button
                              variant="outline"
                              className="border-2 rounded-md border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() =>
                                updateJobStatus(String(job.id), "closed")
                              }
                            >
                              Close Job
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            className="border-2 rounded-md"
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
                            className="border-2 rounded-md"
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Asset Library
          </h1>
          <p className="text-gray-600">
            Download, manage, and organize all your creative assets
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-2 border-gray-300">
            <Download className="w-4 h-4 mr-2" />
            Batch Download
          </Button>
          <Button variant="outline" className="border-2 border-gray-300">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* Asset Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Total Assets</p>
          <p className="text-3xl font-bold text-gray-900">
            {mockAssets.length}
          </p>
        </Card>
        <Card className="p-4 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Videos</p>
          <p className="text-3xl font-bold text-gray-900">
            {mockAssets.filter((a) => a.type === "video").length}
          </p>
        </Card>
        <Card className="p-4 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Images</p>
          <p className="text-3xl font-bold text-gray-900">
            {mockAssets.filter((a) => a.type === "image").length}
          </p>
        </Card>
        <Card className="p-4 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Total Size</p>
          <p className="text-3xl font-bold text-gray-900">36.1 MB</p>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <Card className="p-4 bg-white border border-gray-200">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search by project, creator, or filename..."
              className="pl-10 border-2 border-gray-300"
            />
          </div>
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            onClick={() => setViewMode("grid")}
            className="border-2 border-gray-300"
          >
            Grid
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            onClick={() => setViewMode("list")}
            className="border-2 border-gray-300"
          >
            List
          </Button>
        </div>
      </Card>

      {/* Asset Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {mockAssets.map((asset) => (
          <Card
            key={asset.id}
            className="p-4 bg-white border border-gray-200 hover:shadow-lg transition-all"
          >
            <div className="relative mb-4">
              <img
                src={asset.thumbnail}
                alt={asset.filename}
                className="w-full h-48 object-cover border-2 border-gray-200 rounded-lg"
              />
              {asset.watermarked && (
                <Badge className="absolute top-2 right-2 bg-green-500 text-white">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Watermarked
                </Badge>
              )}
              <Badge className="absolute top-2 left-2 bg-gray-900 text-white">
                {asset.format}
              </Badge>
            </div>

            <h4 className="font-semibold text-gray-900 mb-2 truncate">
              {asset.filename}
            </h4>
            <div className="space-y-1 text-sm text-gray-600 mb-4">
              <p>Project: {asset.project}</p>
              <p>Creator: {asset.creator}</p>
              <p>Date: {new Date(asset.date).toLocaleDateString()}</p>
              <p className="text-xs">
                {asset.resolution} • {asset.size}
              </p>
            </div>

            <Alert className="mb-3 bg-blue-50 border border-blue-200 p-3">
              <p className="text-xs text-blue-900">
                <strong>Usage:</strong> {asset.territory}, valid until{" "}
                {asset.valid_until}
              </p>
            </Alert>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-2 border-gray-300"
              >
                <Eye className="w-4 h-4 mr-1" />
                Preview
              </Button>
              <Button className="flex-1 bg-[#F7B750] hover:bg-[#E6A640] text-white">
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Organization Features */}
      <Card className="p-6 bg-white border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Collections</h3>
        <div className="flex gap-3">
          <Button variant="outline" className="border-2 border-gray-300">
            <Plus className="w-4 h-4 mr-2" />
            Create Collection
          </Button>
          <Badge className="bg-gray-100 text-gray-700 border border-gray-300 px-4 py-2 cursor-pointer hover:bg-gray-200">
            Holiday 2024 (12 assets)
          </Badge>
          <Badge className="bg-gray-100 text-gray-700 border border-gray-300 px-4 py-2 cursor-pointer hover:bg-gray-200">
            Evergreen (5 assets)
          </Badge>
        </div>
      </Card>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Analytics & Reporting
        </h1>
        <p className="text-gray-600">
          Measure ROI and track efficiency metrics
        </p>
      </div>

      {/* Top KPI Section */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Total Projects (YTD)</p>
          <p className="text-3xl font-bold text-gray-900">
            {brandAnalytics.loading ? "—" : brandAnalytics.total_projects_ytd}
          </p>
        </Card>
        <Card className="p-6 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Avg Turnaround</p>
          <p className="text-3xl font-bold text-gray-900">
            {campaignMetrics.avg_turnaround_hours > 0
              ? `${campaignMetrics.avg_turnaround_hours}h`
              : "—"}
          </p>
          <p className="text-xs text-gray-500 mt-1">Industry: 48h</p>
        </Card>
        <Card className="p-6 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Total Spend (YTD)</p>
          <p className="text-3xl font-bold text-gray-900">$45.2K</p>
        </Card>
        <Card className="p-6 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Avg Cost/Project</p>
          <p className="text-3xl font-bold text-gray-900">$3.8K</p>
        </Card>
      </div>

      {/* Talent Performance */}
      <Card className="p-6 bg-white border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">
            Talent Performance
          </h3>
          <Button variant="outline" className="border-2 border-gray-300">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Talent
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Projects
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Avg Turnaround
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Success Rate
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Total Cost
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {brandAnalytics.loading && (
                <tr>
                  <td className="px-4 py-4 text-sm text-gray-600" colSpan={5}>
                    Loading talent performance...
                  </td>
                </tr>
              )}
              {!brandAnalytics.loading &&
                brandAnalytics.talent_performance.length === 0 && (
                  <tr>
                    <td className="px-4 py-4 text-sm text-gray-600" colSpan={5}>
                      No talent performance data yet.
                    </td>
                  </tr>
                )}
              {!brandAnalytics.loading &&
                brandAnalytics.talent_performance.map(
                  (talent: any, idx: number) => {
                    const name = String(talent?.name || "Talent");
                    const imageUrl = String(talent?.image_url || "").trim();
                    const projectsCount = Number(talent?.projects_count || 0);
                    const avgTurnaround = Number(
                      talent?.avg_turnaround_hours || 0,
                    );
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
                                  Top Performer
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-gray-900">
                          {projectsCount}
                        </td>
                        <td className="px-4 py-4 text-gray-900">
                          {avgTurnaround > 0 ? `${avgTurnaround}h` : "—"}
                        </td>
                        <td className="px-4 py-4 text-green-600 font-semibold">
                          {projectsCount > 0 ? `${successRate}%` : "—"}
                        </td>
                        <td className="px-4 py-4 font-bold text-gray-900">—</td>
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
            Spend by Month
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={spendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
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
          Budget Forecast
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">YTD Spend</p>
            <p className="text-2xl font-bold text-gray-900">$45,200</p>
          </div>
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Monthly Avg</p>
            <p className="text-2xl font-bold text-gray-900">$7,533</p>
          </div>
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Projected EOY</p>
            <p className="text-2xl font-bold text-gray-900">$90.4K</p>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderContractDetail = () => {
    const contract = mockContracts.find((c) => c.id === selectedContract);
    if (!contract) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setSelectedContract(null)}
            className="border-2 border-gray-300"
          >
            ← Back to Contract Hub
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {contract.project_name}
            </h1>
            <p className="text-gray-600">Contract Details</p>
          </div>
        </div>

        {/* Contract Actions Bar */}
        <div className="flex gap-3">
          <Button variant="outline" className="border-2 border-gray-300">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          <Button variant="outline" className="border-2 border-gray-300">
            <Download className="w-4 h-4 mr-2" />
            Download Word
          </Button>
          <Button variant="outline" className="border-2 border-gray-300">
            <Send className="w-4 h-4 mr-2" />
            Email
          </Button>
          <Button variant="outline" className="border-2 border-gray-300">
            <Copy className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>

        {/* Project Overview */}
        <Card className="p-6 bg-white border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-6">
            Project Overview
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Project:</span>
                <span className="font-semibold text-gray-900">
                  {contract.project_name}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Creator:</span>
                <span className="font-semibold text-gray-900">
                  {contract.creator_name} ({contract.creator_handle})
                </span>
              </div>
              {contract.agency && (
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Agency:</span>
                  <span className="font-semibold text-gray-900">
                    {contract.agency}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Status:</span>
                <Badge
                  className={
                    contract.status === "signed"
                      ? "bg-green-100 text-green-700 border border-green-300"
                      : "bg-yellow-100 text-yellow-700 border border-yellow-300"
                  }
                >
                  {contract.status === "signed"
                    ? "✓ Fully Signed"
                    : "⏳ Pending Signature"}
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
                    : "In Escrow"}
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
                , by and between <strong>{mockBrand.name}</strong> ("Licensee")
                and <strong>{contract.creator_name}</strong> ("Licensor").
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
                <strong>Payment:</strong> Held in escrow until {mockBrand.name}{" "}
                approval of deliverables. Release upon approval or automatic
                after 48 hours.
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
                      {mockBrand.name}
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
                      View
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
                      Contract fully signed by both parties
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
                    Created by: {mockBrand.name}
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

    const activeContracts = mockContracts.filter((c) => c.status === "signed");
    const pendingContracts = mockContracts.filter(
      (c) => c.status === "pending_signature",
    );

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Contract Hub
            </h1>
            <p className="text-gray-600">
              All your verified licensing agreements in one place
            </p>
          </div>
          <Button variant="outline" className="border-2 border-gray-300">
            <Download className="w-4 h-4 mr-2" />
            Bulk Export
          </Button>
        </div>

        {/* Search & Filter */}
        <Card className="p-4 bg-white border border-gray-200">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search by creator, project, date..."
                className="pl-10 border-2 border-gray-300"
              />
            </div>
            <Select defaultValue="newest">
              <SelectTrigger className="w-48 border-2 border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="expiring">Expiring Soon</SelectItem>
                <SelectItem value="fee_high">Fee (High to Low)</SelectItem>
                <SelectItem value="fee_low">Fee (Low to High)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Contract Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setContractHubTab("active")}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
              contractHubTab === "active"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Active ({activeContracts.length})
          </button>
          <button
            onClick={() => setContractHubTab("pending")}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
              contractHubTab === "pending"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Pending Signature ({pendingContracts.length})
          </button>
          <button
            onClick={() => setContractHubTab("all")}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
              contractHubTab === "all"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            All Contracts ({mockContracts.length})
          </button>
        </div>

        {/* Active Contracts */}
        {contractHubTab === "active" && (
          <div className="space-y-4">
            {activeContracts.map((contract) => (
              <Card
                key={contract.id}
                className="p-6 bg-white border border-gray-200 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {contract.project_name}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span>
                        {contract.creator_name} ({contract.creator_handle})
                      </span>
                      {contract.agency && (
                        <>
                          <span>•</span>
                          <span>via {contract.agency}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700 border border-green-300">
                    ✓ Fully Signed
                  </Badge>
                </div>

                <div className="grid md:grid-cols-4 gap-4 mb-4 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1">Signed</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(contract.signed_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Expires</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(contract.expiration_date).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      ({contract.duration_days} days)
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Territory</p>
                    <p className="font-semibold text-gray-900">
                      {contract.territory}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Fee</p>
                    <p className="font-bold text-gray-900">
                      ${contract.total_fee.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="border-2 border-gray-300"
                    onClick={() => setSelectedContract(contract.id)}
                  >
                    View Full Contract
                  </Button>
                  <Button
                    variant="outline"
                    className="border-2 border-gray-300"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="border-2 border-gray-300"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  <Button
                    variant="outline"
                    className="border-2 border-gray-300"
                  >
                    Archive
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Pending Signature */}
        {contractHubTab === "pending" && (
          <div className="space-y-4">
            {pendingContracts.map((contract) => (
              <Card
                key={contract.id}
                className="p-6 bg-yellow-50 border-2 border-yellow-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {contract.project_name}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span>
                        {contract.creator_name} ({contract.creator_handle})
                      </span>
                      {contract.agency && (
                        <>
                          <span>•</span>
                          <span>via {contract.agency}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge className="bg-yellow-500 text-white">
                    ⏳ Awaiting Signature ({contract.days_pending} days)
                  </Badge>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-4 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1">Sent</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(contract.sent_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Territory</p>
                    <p className="font-semibold text-gray-900">
                      {contract.territory}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Fee</p>
                    <p className="font-bold text-gray-900">
                      ${contract.total_fee.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="border-2 border-gray-300"
                    onClick={() => setSelectedContract(contract.id)}
                  >
                    View Contract
                  </Button>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Send className="w-4 h-4 mr-2" />
                    Resend Signature Request
                  </Button>
                  <Button
                    variant="outline"
                    className="border-2 border-red-300 text-red-600 hover:bg-red-50"
                  >
                    Cancel
                  </Button>
                </div>
              </Card>
            ))}

            {pendingContracts.length === 0 && (
              <Card className="p-12 bg-white border border-gray-200 text-center">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  All contracts signed!
                </h3>
                <p className="text-gray-600">
                  No pending signatures at this time
                </p>
              </Card>
            )}
          </div>
        )}

        {/* All Contracts */}
        {contractHubTab === "all" && (
          <div className="space-y-4">
            {mockContracts.map((contract) => (
              <Card
                key={contract.id}
                className={`p-6 border ${
                  contract.status === "signed"
                    ? "bg-white border-gray-200"
                    : "bg-yellow-50 border-yellow-300"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {contract.project_name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {contract.creator_name} ({contract.creator_handle})
                    </p>
                  </div>
                  <Badge
                    className={
                      contract.status === "signed"
                        ? "bg-green-100 text-green-700 border border-green-300"
                        : "bg-yellow-100 text-yellow-700 border border-yellow-300"
                    }
                  >
                    {contract.status === "signed"
                      ? "✓ Fully Signed"
                      : "⏳ Pending"}
                  </Badge>
                </div>

                <div className="grid md:grid-cols-4 gap-4 mb-4 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1">Created</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(contract.created_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Territory</p>
                    <p className="font-semibold text-gray-900">
                      {contract.territory}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Duration</p>
                    <p className="font-semibold text-gray-900">
                      {contract.duration_days} days
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Fee</p>
                    <p className="font-bold text-gray-900">
                      ${contract.total_fee.toLocaleString()}
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="border-2 border-gray-300"
                  onClick={() => setSelectedContract(contract.id)}
                >
                  View Details
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderUsageRights = () => {
    if (selectedContract) {
      return renderContractDetail();
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Usage Rights & Compliance
          </h1>
          <p className="text-gray-600">
            Manage licensing, prevent misuse, ensure compliance
          </p>
        </div>

        {/* Usage Rights Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setUsageRightsTab("licenses")}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
              usageRightsTab === "licenses"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Active Licenses
          </button>
          <button
            onClick={() => setUsageRightsTab("expiring")}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
              usageRightsTab === "expiring"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Expiring Soon{" "}
            {expiringLicenses.length > 0 && `(${expiringLicenses.length})`}
          </button>
          <button
            onClick={() => setUsageRightsTab("contracts")}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
              usageRightsTab === "contracts"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Contract Hub
          </button>
          <button
            onClick={() => setUsageRightsTab("compliance")}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
              usageRightsTab === "compliance"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Compliance
          </button>
        </div>

        {/* Licenses Tab */}
        {usageRightsTab === "licenses" && (
          <div className="space-y-6">
            {/* License Stats */}
            <div className="grid md:grid-cols-4 gap-6">
              <Card className="p-6 bg-white border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Active Licenses</p>
                <p className="text-4xl font-bold text-gray-900">
                  {activeLicenses.length}
                </p>
              </Card>
              <Card className="p-6 bg-white border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Expiring (30d)</p>
                <p className="text-4xl font-bold text-gray-900">
                  {expiringLicenses.length}
                </p>
                {expiringLicenses.length > 0 && (
                  <Badge className="mt-1 bg-orange-100 text-orange-700 border border-orange-300">
                    Renew soon
                  </Badge>
                )}
              </Card>
              <Card className="p-6 bg-white border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Royalties Paid</p>
                <p className="text-4xl font-bold text-gray-900">$8.4K</p>
              </Card>
              <Card className="p-6 bg-white border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Violations</p>
                <p className="text-4xl font-bold text-green-600">0</p>
                <Badge className="mt-1 bg-green-100 text-green-700 border border-green-300">
                  All clear
                </Badge>
              </Card>
            </div>

            {/* Active Licenses Table */}
            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                Active Licenses
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Asset
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Creator
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Territory
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Duration
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Channels
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Expires
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {mockLicenses.map((license) => (
                      <tr key={license.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 font-medium text-gray-900">
                          {license.asset_name}
                        </td>
                        <td className="px-4 py-4 text-gray-700">
                          {license.creator}
                        </td>
                        <td className="px-4 py-4 text-gray-700">
                          {license.territory}
                        </td>
                        <td className="px-4 py-4 text-gray-700">
                          {license.duration}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-1">
                            {license.channels.map((ch) => (
                              <Badge
                                key={ch}
                                className="bg-blue-100 text-blue-700 border border-blue-300 text-xs"
                              >
                                {ch}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-gray-700">
                          {new Date(license.end_date).toLocaleDateString()}
                          <p className="text-xs text-gray-500">
                            {license.days_remaining} days left
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <Badge
                            className={
                              license.status === "active"
                                ? "bg-green-100 text-green-700 border border-green-300"
                                : "bg-orange-100 text-orange-700 border border-orange-300"
                            }
                          >
                            {license.status === "active"
                              ? "Active"
                              : "Expiring Soon"}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-2 border-gray-300"
                            >
                              Renew
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-2 border-gray-300"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Expiring Tab */}
        {usageRightsTab === "expiring" && (
          <div className="space-y-6">
            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                License Expiration Calendar
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                {mockLicenses
                  .filter((l) => l.status === "expiring_soon")
                  .map((license) => (
                    <div
                      key={license.id}
                      className="p-4 rounded-lg border-2 bg-orange-50 border-orange-300"
                    >
                      <p className="font-semibold text-gray-900 mb-2">
                        {license.asset_name}
                      </p>
                      <p className="text-sm text-gray-600 mb-3">
                        Expires:{" "}
                        {new Date(license.end_date).toLocaleDateString()}
                      </p>
                      <Badge className="bg-orange-500 text-white">
                        {license.days_remaining} days remaining
                      </Badge>
                      <Button
                        variant="outline"
                        className="w-full mt-3 border-2 border-gray-300"
                      >
                        Renew License
                      </Button>
                    </div>
                  ))}
                {mockLicenses.filter((l) => l.status === "expiring_soon")
                  .length === 0 && (
                  <div className="col-span-3 text-center py-12">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      No licenses expiring soon
                    </h3>
                    <p className="text-gray-600">
                      All your licenses are active for 30+ days
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Contracts Tab - Contract Hub */}
        {usageRightsTab === "contracts" && renderContractHub()}

        {/* Compliance Tab */}
        {usageRightsTab === "compliance" && (
          <div className="space-y-6">
            {/* Watermark Verification */}
            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Watermark Verification Tool
              </h3>
              <p className="text-gray-600 mb-4">
                Upload an asset to verify its watermark and license status
              </p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#F7B750] transition-colors cursor-pointer">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-700 mb-2">
                  Drag & drop file or click to upload
                </p>
                <p className="text-sm text-gray-500">
                  Verify watermark and license authenticity
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  };

  const renderBilling = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Billing & Payments
        </h1>
        <p className="text-gray-600">
          Payment tracking, invoicing, and budget management
        </p>
      </div>

      {/* Billing Overview */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="p-6 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">This Month's Spend</p>
          <p className="text-4xl font-bold text-gray-900">$7.5K</p>
        </Card>
        <Card className="p-6 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">In Escrow</p>
          <p className="text-4xl font-bold text-gray-900">
            ${(escrowTotal / 1000).toFixed(1)}K
          </p>
          <p className="text-xs text-gray-500 mt-1">Pending delivery</p>
        </Card>
        <Card className="p-6 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Amount Spent YTD</p>
          <p className="text-4xl font-bold text-gray-900">$45.2K</p>
        </Card>
        <Card className="p-6 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Next Invoice</p>
          <p className="text-2xl font-bold text-gray-900">Mar 1</p>
          <p className="text-xs text-gray-500 mt-1">$299 subscription</p>
        </Card>
      </div>

      {/* Current Plan */}
      <Card className="p-6 bg-white border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              Current Plan: {brand.plan}
            </h3>
            <p className="text-gray-600">Renews on March 1, 2025</p>
          </div>
          <Button className="bg-[#F7B750] hover:bg-[#E6A640] text-white">
            Upgrade Plan
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Monthly Subscription</p>
            <p className="text-2xl font-bold text-gray-900">$299</p>
          </div>
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Campaign Slots</p>
            <p className="text-2xl font-bold text-gray-900">3 / 20</p>
          </div>
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Team Seats</p>
            <p className="text-2xl font-bold text-gray-900">
              {brand.team_seats} / 5
            </p>
          </div>
        </div>
      </Card>

      {/* Payment Status / Project Billing */}
      <Card className="p-6 bg-white border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-6">
          Project Payment Status
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Project
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Talent
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mockCampaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 font-medium text-gray-900">
                    {campaign.name}
                  </td>
                  <td className="px-4 py-4 text-gray-700">
                    {campaign.creators.join(", ")}
                  </td>
                  <td className="px-4 py-4 font-bold text-gray-900">
                    ${campaign.budget.toLocaleString()}
                  </td>
                  <td className="px-4 py-4">
                    <Badge
                      className={
                        campaign.status === "pending_approval"
                          ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                          : campaign.status === "completed"
                            ? "bg-green-100 text-green-700 border border-green-300"
                            : "bg-blue-100 text-blue-700 border border-blue-300"
                      }
                    >
                      {campaign.status === "pending_approval"
                        ? "Pending Approval"
                        : campaign.status === "completed"
                          ? "Paid"
                          : "In Escrow"}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700">
                    {campaign.go_live}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Escrow Explanation */}
      <Card className="p-6 bg-blue-50 border border-blue-200">
        <h3 className="text-lg font-bold text-gray-900 mb-3">
          How Escrow Works
        </h3>
        <p className="text-gray-700 mb-4">
          Escrow protects both you and creators. When you start a project,
          payment is held securely. Once you approve deliverables, payment
          releases to the creator. If not approved within 48 hours, it
          auto-releases.
        </p>
        <p className="text-sm font-semibold text-blue-900">
          Current Escrow: ${(escrowTotal / 1000).toFixed(1)}K across{" "}
          {mockCampaigns.filter((c) => c.escrow_amount > 0).length} projects
        </p>
      </Card>

      {/* Invoice History */}
      <Card className="p-6 bg-white border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Invoice History</h3>
          <Button variant="outline" className="border-2 border-gray-300">
            <Download className="w-4 h-4 mr-2" />
            Export All
          </Button>
        </div>
        <div className="space-y-3">
          {[
            {
              month: "February 2025",
              invoice: "INV-001",
              amount: 299,
              status: "Paid",
              date: "2025-02-01",
            },
            {
              month: "January 2025",
              invoice: "INV-002",
              amount: 299,
              status: "Paid",
              date: "2025-01-01",
            },
            {
              month: "December 2024",
              invoice: "INV-003",
              amount: 299,
              status: "Paid",
              date: "2024-12-01",
            },
          ].map((invoice, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg"
            >
              <div>
                <p className="font-semibold text-gray-900">{invoice.month}</p>
                <p className="text-sm text-gray-600">
                  {invoice.invoice} • {invoice.date}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-bold text-gray-900">
                  ${invoice.amount}.00
                </span>
                <Badge className="bg-green-100 text-green-700 border border-green-300">
                  {invoice.status}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-2 border-gray-300"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Budget Alerts */}
      <Card className="p-6 bg-white border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          Budget Management
        </h3>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold text-gray-700 block mb-2">
              Monthly Budget Limit (Optional)
            </Label>
            <Input
              type="number"
              placeholder="Enter amount"
              className="border-2 border-gray-300 max-w-xs"
            />
            <p className="text-sm text-gray-500 mt-1">
              Get alerts when spend reaches 80% or 100%
            </p>
          </div>
          <Button variant="outline" className="border-2 border-gray-300">
            Set Budget Alerts
          </Button>
        </div>
      </Card>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">
          Manage your company profile and preferences
        </p>
      </div>

      {/* Company Logo */}
      <Card className="p-6 bg-white border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Company Logo</h3>
        <div className="flex items-center gap-6">
          <div className="relative">
            <img
              src={brand.logo}
              alt={brand.name}
              className="w-32 h-32 object-cover border-2 border-gray-200 rounded-lg"
            />
            <label className="absolute bottom-0 right-0 bg-white rounded-full p-2 border-2 border-gray-300 cursor-pointer hover:bg-gray-50">
              <Edit className="w-4 h-4 text-gray-600" />
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
            <p className="text-sm text-gray-600 mb-2">
              Upload your company logo
            </p>
            <p className="text-xs text-gray-500">
              JPG or PNG, max 5MB, square format recommended
            </p>
          </div>
        </div>
      </Card>

      {/* Company Information */}
      <Card className="p-6 bg-white border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-6">
          Company Information
        </h3>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Company Name
            </Label>
            <Input
              value={brand.name}
              onChange={(e) => setBrand({ ...brand, name: e.target.value })}
              className="border-2 border-gray-300"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Industry
            </Label>
            <Input
              value={brand.industry}
              onChange={(e) => setBrand({ ...brand, industry: e.target.value })}
              className="border-2 border-gray-300"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Website
            </Label>
            <Input
              value={brand.website}
              onChange={(e) => setBrand({ ...brand, website: e.target.value })}
              className="border-2 border-gray-300"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Contact Email
            </Label>
            <Input
              value={brand.contact_email}
              onChange={(e) =>
                setBrand({ ...brand, contact_email: e.target.value })
              }
              className="border-2 border-gray-300"
            />
          </div>

          <Button
            onClick={handleSaveProfile}
            className="w-full bg-[#F7B750] hover:bg-[#E6A640] text-white"
          >
            Save Changes
          </Button>
        </div>
      </Card>

      {/* Team Management */}
      <Card className="p-6 bg-white border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          Team Management
        </h3>
        <p className="text-gray-600 mb-4">
          Manage your team ({brand.team_seats} / 5 seats used)
        </p>

        <div className="space-y-3 mb-6">
          {[
            {
              name: "John Smith",
              email: "john@urbanapparel.com",
              role: "Admin",
            },
            {
              name: "Sarah Jones",
              email: "sarah@urbanapparel.com",
              role: "Project Manager",
            },
            {
              name: "Mike Chen",
              email: "mike@urbanapparel.com",
              role: "Reviewer",
            },
          ].map((member, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{member.name}</p>
                  <p className="text-sm text-gray-600">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-blue-100 text-blue-700 border border-blue-300">
                  {member.role}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-2 border-gray-300"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Button className="w-full bg-[#F7B750] hover:bg-[#E6A640] text-white">
          <Plus className="w-4 h-4 mr-2" />
          Invite Team Member
        </Button>
      </Card>

      {/* Billing Information */}
      <Card className="p-6 bg-white border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-6">
          Billing Information
        </h3>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Billing Address
            </Label>
            <Textarea
              defaultValue="123 Main St&#10;Los Angeles, CA 90001&#10;United States"
              className="border-2 border-gray-300"
              rows={3}
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Billing Email
            </Label>
            <Input
              defaultValue="billing@urbanapparel.com"
              className="border-2 border-gray-300"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Tax ID (Optional)
            </Label>
            <Input
              placeholder="XX-XXXXXXX"
              className="border-2 border-gray-300"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Payment Method
            </Label>
            <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900">•••• •••• •••• 4242</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-2 border-gray-300"
              >
                Update
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Notification Preferences */}
      <Card className="p-6 bg-white border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-6">
          Notification Preferences
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div>
              <Label className="text-base font-medium text-gray-900 block mb-1">
                New Project Alerts
              </Label>
              <p className="text-sm text-gray-600">
                When talent accepts or delivers assets
              </p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="w-5 h-5 accent-[#F7B750]"
            />
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div>
              <Label className="text-base font-medium text-gray-900 block mb-1">
                Deliverable Submissions
              </Label>
              <p className="text-sm text-gray-600">
                When creators submit work for approval
              </p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="w-5 h-5 accent-[#F7B750]"
            />
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div>
              <Label className="text-base font-medium text-gray-900 block mb-1">
                Approval Reminders
              </Label>
              <p className="text-sm text-gray-600">
                48-hour countdown notifications
              </p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="w-5 h-5 accent-[#F7B750]"
            />
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div>
              <Label className="text-base font-medium text-gray-900 block mb-1">
                License Expiration Alerts
              </Label>
              <p className="text-sm text-gray-600">30-day advance notice</p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="w-5 h-5 accent-[#F7B750]"
            />
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <Label className="text-base font-medium text-gray-900 block mb-1">
                Monthly Analytics Summary
              </Label>
              <p className="text-sm text-gray-600">
                Monthly performance email report
              </p>
            </div>
            <input type="checkbox" className="w-5 h-5 accent-[#F7B750]" />
          </div>
        </div>
      </Card>

      {/* Security */}
      <Card className="p-6 bg-white border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Security</h3>
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start border-2 border-gray-300"
          >
            Change Password
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start border-2 border-gray-300"
          >
            Enable Two-Factor Authentication
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start border-2 border-gray-300"
          >
            View Active Sessions
          </Button>
        </div>
      </Card>

      {/* Compliance & Legal */}
      <Card className="p-6 bg-white border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-6">
          Compliance & Legal
        </h3>
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start border-2 border-gray-300"
          >
            <FileText className="w-4 h-4 mr-2" />
            Terms & Conditions
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start border-2 border-gray-300"
          >
            <FileText className="w-4 h-4 mr-2" />
            Privacy Policy
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start border-2 border-gray-300"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            SAG-AFTRA Alignment Statement
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start border-2 border-gray-300"
          >
            <Download className="w-4 h-4 mr-2" />
            Download My Data (GDPR)
          </Button>
        </div>
      </Card>

      {/* Support */}
      <Card className="p-6 bg-white border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Support & Help</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="justify-start border-2 border-gray-300"
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            Contact Support
          </Button>
          <Button
            variant="outline"
            className="justify-start border-2 border-gray-300"
          >
            <FileText className="w-4 h-4 mr-2" />
            Knowledge Base
          </Button>
          <Button
            variant="outline"
            className="justify-start border-2 border-gray-300"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Schedule a Call
          </Button>
          <Button
            variant="outline"
            className="justify-start border-2 border-gray-300"
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            Report a Bug
          </Button>
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

      {/* View Contract Modal */}
      <Dialog open={showContractModal} onOpenChange={setShowContractModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Campaign Contract
            </DialogTitle>
            <DialogDescription>
              View the campaign contract details.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-6">
            {loadingSelectedCampaignContracts && (
              <Card className="p-6 bg-white border border-gray-200">
                <p className="text-sm text-gray-600">Loading contract...</p>
              </Card>
            )}
            {!loadingSelectedCampaignContracts &&
              selectedCampaignContracts.length === 0 && (
                <Card className="p-6 bg-white border border-gray-200">
                  <p className="text-sm text-gray-600">
                    No contract found for this campaign offer yet.
                  </p>
                </Card>
              )}
            {!loadingSelectedCampaignContracts &&
              selectedCampaignContracts.length > 0 && (
                <>
                  <Card className="p-6 bg-gray-50 border-2 border-gray-300">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      Contract Overview
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 mb-1">Contract</p>
                        <p className="font-semibold text-gray-900">
                          {String(
                            selectedCampaignContracts[0]?.title ||
                              "Campaign contract",
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 mb-1">Status</p>
                        <Badge className="bg-blue-100 text-blue-700 border border-blue-300">
                          {String(
                            selectedCampaignContracts[0]?.docuseal_status ||
                              "sent",
                          ).replace(/_/g, " ")}
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
                      Close
                    </Button>
                  </div>
                </>
              )}
          </div>
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
                ? "Job Details"
                : "Applications"}
            </DialogTitle>
            <DialogDescription>
              View details for this job posting or review submitted
              applications.
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
                    {selectedJobForApplications.company_name || "Brand"}
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
                  About the role
                </div>
                <div className="text-sm text-gray-700 whitespace-pre-line">
                  {selectedJobForApplications.about_role ||
                    "No role description provided."}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600">
                  <div>
                    <span className="font-medium text-gray-900">Location:</span>{" "}
                    {formatJobLabel(
                      selectedJobForApplications.location || "Remote",
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Job type:</span>{" "}
                    {formatJobLabel(
                      selectedJobForApplications.job_type || "Project",
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Timeline:</span>{" "}
                    {selectedJobForApplications.start_date || "—"}
                    {selectedJobForApplications.end_date
                      ? ` → ${selectedJobForApplications.end_date}`
                      : ""}
                  </div>
                  {selectedJobForApplications.goals &&
                    selectedJobForApplications.goals.length > 0 && (
                      <div className="md:col-span-2">
                        <span className="font-medium text-gray-900">
                          Goals:
                        </span>{" "}
                        {selectedJobForApplications.goals.join(", ")}
                      </div>
                    )}
                  {selectedJobForApplications.deliverables && (
                    <div>
                      <span className="font-medium text-gray-900">
                        Deliverables:
                      </span>{" "}
                      {selectedJobForApplications.deliverables}
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-900">
                  Talent Requirements
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
                      <span className="font-medium text-gray-900">Region:</span>{" "}
                      {selectedJobForApplications.region}
                    </span>
                  )}
                  {selectedJobForApplications.language && (
                    <span>
                      <span className="font-medium text-gray-900">
                        Language:
                      </span>{" "}
                      {selectedJobForApplications.language}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium text-gray-900">
                    Licensing required:
                  </span>{" "}
                  {selectedJobForApplications.needs_licensing ? "Yes" : "No"}
                </div>
              </section>

              {selectedJobForApplications.needs_licensing && (
                <section className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-5">
                  <h4 className="text-sm font-semibold text-gray-900">
                    Licensing Details
                  </h4>
                  <div className="text-sm text-gray-600">
                    {selectedJobForApplications.usage_type && (
                      <span className="mr-3">
                        <span className="font-medium text-gray-900">
                          Usage:
                        </span>{" "}
                        {selectedJobForApplications.usage_type}
                      </span>
                    )}
                    {selectedJobForApplications.license_duration && (
                      <span className="mr-3">
                        <span className="font-medium text-gray-900">
                          Duration:
                        </span>{" "}
                        {String(
                          selectedJobForApplications.license_duration,
                        ).replace(/_/g, " ")}
                      </span>
                    )}
                    {selectedJobForApplications.territories && (
                      <span>
                        <span className="font-medium text-gray-900">
                          Territories:
                        </span>{" "}
                        {selectedJobForApplications.territories}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="mr-3">
                      <span className="font-medium text-gray-900">
                        Exclusivity:
                      </span>{" "}
                      {selectedJobForApplications.exclusivity ? "Yes" : "No"}
                    </span>
                    <span>
                      <span className="font-medium text-gray-900">
                        Royalty option:
                      </span>{" "}
                      {selectedJobForApplications.royalty_option ? "Yes" : "No"}
                    </span>
                  </div>
                </section>
              )}

              <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-900">
                  Budget & Compensation
                </h4>
                <div className="text-sm text-gray-600">
                  <span className="font-medium text-gray-900">Budget:</span>{" "}
                  {selectedJobForApplications.budget
                    ? `${selectedJobForApplications.budget} ${selectedJobForApplications.currency || "USD"}`
                    : "Not specified"}
                </div>
                {selectedJobForApplications.payment_type && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">
                      Payment type:
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
                      Collaboration Preferences
                    </h4>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium text-gray-900">
                        Work with agency:
                      </span>{" "}
                      {selectedJobForApplications.work_with_agency
                        ? "Yes"
                        : "No"}
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium text-gray-900">
                        Invite creator:
                      </span>{" "}
                      {selectedJobForApplications.invite_creator ? "Yes" : "No"}
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
                          Agencies
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

                            let statusLabel = "Pending";
                            let statusColor =
                              "bg-slate-100 text-slate-600 border-slate-200";
                            if (isAccepted) {
                              statusLabel = "Accepted";
                              statusColor =
                                "bg-emerald-100 text-emerald-700 border-emerald-200";
                            } else if (isDeclined) {
                              statusLabel = "Declined";
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
                          Creators
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

                            let statusLabel = "Pending";
                            let statusColor =
                              "bg-slate-100 text-slate-600 border-slate-200";
                            if (isAccepted) {
                              statusLabel = "Accepted";
                              statusColor =
                                "bg-emerald-100 text-emerald-700 border-emerald-200";
                            } else if (isDeclined) {
                              statusLabel = "Declined";
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
                        Brand Assets
                      </h4>
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                        {selectedJobForApplications.brand_assets.length} Assets
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
            <div className="text-sm text-gray-600">Loading applications...</div>
          ) : selectedJobApplications.length === 0 ? (
            <div className="text-sm text-gray-600">No applications yet.</div>
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
                            📄 View resume
                          </a>
                        )}
                        {app.comp_card_url && (
                          <a
                            href={app.comp_card_url}
                            target="_blank"
                            rel="noreferrer"
                            download={app.comp_card_name || "comp_card"}
                            className="text-sm font-medium text-purple-600 hover:text-purple-700"
                          >
                            🖼️ Comp card
                          </a>
                        )}
                        {app.portfolio_link && (
                          <a
                            href={ensureProtocol(app.portfolio_link)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                          >
                            🌐 Portfolio
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
                    <strong>Protection:</strong> No disputes after 48 hours. If
                    you don't approve within 48h, payment auto-releases.
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
                    <span className="text-gray-900">48 hours</span>
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
        className={`${sidebarOpen ? "w-64" : "w-20"} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col fixed h-screen z-40`}
      >
        {/* Brand Section */}
        <div className="p-6 border-b border-gray-200">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <img
                src={brand.logo}
                alt={brand.name}
                className="w-12 h-12 object-cover border-2 border-gray-200 rounded-lg"
              />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 truncate">{brand.name}</p>
                <p className="text-xs text-gray-600 truncate">{brand.plan}</p>
              </div>
            </div>
          ) : (
            <img
              src={brand.logo}
              alt={brand.name}
              className="w-12 h-12 object-cover border-2 border-gray-200 rounded-lg mx-auto"
            />
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
                            ? "Hide campaign subtabs"
                            : "Show campaign subtabs"
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
                        <span className="flex-1 text-left">My Offers</span>
                      </button>
                      <button
                        onClick={() => {
                          navigateToSection("campaigns-inbox");
                        }}
                        className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-all ${
                          activeSection === "campaigns-inbox"
                            ? "bg-gray-100 text-gray-900"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <Mail className="w-4 h-4" />
                        <span className="flex-1 text-left">Inbox</span>
                        {inboxPendingCount > 0 && (
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
                        <span className="flex-1 text-left">Contract Hub</span>
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
                        <span className="flex-1 text-left">Deliverables</span>
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
                        <span className="flex-1 text-left">Jobs</span>
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
                        <span className="text-left">Asset Library</span>
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

      {/* Main Content */}
      <main
        className={`flex-1 ${sidebarOpen ? "ml-64" : "ml-20"} transition-all duration-300 overflow-y-auto`}
      >
        <div className="p-8">
          {activeSection === "home" && renderHome()}
          {activeSection === "marketplace" && (
            <MarketplaceSection
              title="Likelee Marketplace"
              subtitle="Verified creators only"
              verifiedBadgeLabel=""
              queryScope="brand-creator-marketplace"
            />
          )}
          {activeSection === "marketplace-agencies" &&
            renderAgencyMarketplace()}
          {activeSection === "campaigns-hub" &&
            (campaignHubTab === "jobs" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-gray-900">
                    Job Postings
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
                    Post Job
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
                      placeholder="Search job title or campaign name"
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
                    Loading job postings...
                  </Card>
                )}
                {!loadingBrandJobs && brandJobs.length === 0 && (
                  <Card className="p-8 text-center text-sm text-gray-600">
                    <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="font-semibold text-gray-800">
                      No job postings yet.
                    </p>
                    <p className="text-gray-500 mt-1">
                      Post your first job to start receiving applications.
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
                                {job.status || "open"}
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
                                "No role description added yet."}
                            </p>
                          </div>
                          <div className="flex flex-col items-start gap-3 lg:items-end lg:ml-auto">
                            <div className="flex items-center gap-6 text-sm text-gray-500 whitespace-nowrap">
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
                        <div className="pt-3 border-t border-slate-200 flex flex-wrap justify-end gap-2">
                          {job.status === "open" && (
                            <Button
                              variant="outline"
                              className="border-2 rounded-md border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() =>
                                updateJobStatus(String(job.id), "closed")
                              }
                            >
                              Close Job
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            className="border-2 rounded-md"
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
                            className="border-2 rounded-md"
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
          {activeSection === "analytics" && renderAnalytics()}
          {activeSection === "usage" && renderUsageRights()}
          {activeSection === "billing" && renderBilling()}
          {activeSection === "settings" && renderSettings()}
        </div>
      </main>
      {/* Confirmation Dialog for Mark Done */}
      <AlertDialog
        open={!!confirmingDonePkg}
        onOpenChange={(open) => !open && setConfirmingDonePkg(null)}
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
                <ul className="space-y-1">
                  {(() => {
                    const selectedIds =
                      confirmingDonePkg?.meta?.selected_talent_ids || [];
                    const items =
                      confirmingDonePkg?.package_snapshot?.items || [];
                    const selectedNames = items
                      .filter((item: any) =>
                        selectedIds.includes(String(item.talent_id || item.id)),
                      )
                      .map((item: any) => item.talent_name || "Unnamed Talent");

                    if (selectedNames.length === 0)
                      return (
                        <li className="text-sm italic">No talent selected</li>
                      );
                    return selectedNames.map((name: string, idx: number) => (
                      <li
                        key={idx}
                        className="text-sm font-medium text-gray-900 flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                        {name}
                      </li>
                    ));
                  })()}
                </ul>
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
              className="rounded-none bg-black hover:bg-gray-800 text-white"
              onClick={async () => {
                const pkg = confirmingDonePkg;
                if (!pkg) return;
                try {
                  await base44.post(
                    `/api/campaign-offers/${encodeURIComponent(String(pkg?.offer_id || ""))}/packages/brand-done`,
                    {
                      package_id: String(pkg?.id || ""),
                      feedback_note: "Brand completed package selection.",
                      selected_talent_ids: pkg?.meta?.selected_talent_ids || [],
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
                  toast({
                    title: "Unable to submit package",
                    description: e?.message || "Please try again.",
                    variant: "destructive" as any,
                  });
                } finally {
                  setConfirmingDonePkg(null);
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
                <video
                  src={getPublicUrl(previewImage)}
                  controls
                  className="max-w-full max-h-full"
                />
              ) : (
                <img
                  src={previewImage ? getPublicUrl(previewImage) : ""}
                  className="max-w-full max-h-full object-contain"
                  alt="Preview"
                />
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
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-none bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-md"
                  asChild
                >
                  <a
                    href={previewImage ? getPublicUrl(previewImage) : ""}
                    download
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Download className="w-4 h-4 mr-2" /> Download
                  </a>
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-none bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-md h-8 w-8"
                  onClick={() => setPreviewImage(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
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
                  !reviewDialog.note.trim() || reviewing === reviewDialog.delId
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
                    ? `$${(escrowReleasedModal.amount / 100).toLocaleString()}`
                    : "$ --"}
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
    </div>
  );
}
