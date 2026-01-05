import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
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
  Play,
  DollarSign,
  Eye,
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
  Trash2,
  Upload,
  Send,
  Copy,
  CheckSquare,
  X,
  ChevronDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { useToast } from "@/components/ui/use-toast";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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
  const [activeSection, setActiveSection] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [brand, setBrand] = useState(mockBrand);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [campaignView, setCampaignView] = useState("active");
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
  const [showUpdateRequestModal, setShowUpdateRequestModal] = useState(false);
  const [updateRequestType, setUpdateRequestType] = useState(null);
  const [showContractHub, setShowContractHub] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [contractHubTab, setContractHubTab] = useState("active");
  const [contractDetailTab, setContractDetailTab] = useState("summary");
  const { toast } = useToast();
  const [usageRightsTab, setUsageRightsTab] = useState("licenses");
  const [creators, setCreators] = useState(mockCreators);
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
    const fetchCreators = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.append("query", searchQuery);
        if (filters.creator_types.length > 0)
          params.append("creator_types", filters.creator_types.join(","));
        if (filters.races.length > 0)
          params.append("races", filters.races.join(","));
        if (filters.hair_colors.length > 0)
          params.append("hair_colors", filters.hair_colors.join(","));
        if (filters.hairstyles.length > 0)
          params.append("hairstyles", filters.hairstyles.join(","));
        if (filters.eye_colors.length > 0)
          params.append("eye_colors", filters.eye_colors.join(","));
        if (filters.facial_features.length > 0)
          params.append("facial_features", filters.facial_features.join(","));

        if (filters.age_range[0] > 18)
          params.append("age_min", filters.age_range[0].toString());
        if (filters.age_range[1] < 65)
          params.append("age_max", filters.age_range[1].toString());

        if (filters.height_range[0] > 140)
          params.append("height_min", filters.height_range[0].toString());
        if (filters.height_range[1] < 210)
          params.append("height_max", filters.height_range[1].toString());

        if (filters.weight_range[0] > 40)
          params.append("weight_min", filters.weight_range[0].toString());
        if (filters.weight_range[1] < 150)
          params.append("weight_max", filters.weight_range[1].toString());

        const apiUrl = import.meta.env.VITE_API_BASE_URL;
        const response = await fetch(
          `${apiUrl}/api/faces/search?${params.toString()}`,
        );
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        if (Array.isArray(data)) {
          const mappedData = data.map((creator: any) => ({
            ...creator,
            id: creator.id || Math.random().toString(36).substr(2, 9),
            name: creator.full_name || creator.name || "Unknown Creator",
            image:
              creator.profile_photo_url ||
              creator.image ||
              "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/5d413193e_Screenshot2025-10-29at63349PM.png",
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
          setCreators(mappedData);
        } else {
          console.error("API returned non-array data:", data);
          setCreators(mockCreators);
        }
      } catch (error) {
        console.error("Failed to fetch creators:", error);
        setCreators((prev) =>
          Array.isArray(prev) && prev.length > 0 ? prev : mockCreators,
        );
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

  const escrowTotal = mockCampaigns
    .filter(
      (c) => c.status === "in_progress" || c.status === "pending_approval",
    )
    .reduce((sum, c) => sum + c.escrow_amount, 0);

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
    {
      id: "campaigns",
      label: "My Campaigns",
      icon: Target,
      badge: mockCampaigns.length,
    },
    { id: "studio", label: "Asset Library", icon: ImageIcon },
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
                        setActiveSection("campaigns");
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
              {mockCampaigns.filter((c) => c.status === "in_progress").length}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {pendingApprovalCount} awaiting approval
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
              {pendingApprovalCount}
            </p>
            {pendingApprovalCount > 0 && (
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
            <p className="text-4xl font-bold text-gray-900">14h</p>
            <p className="text-sm text-gray-600 mt-1">Industry: 48h</p>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="p-6 bg-white border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid md:grid-cols-4 gap-4">
            <Button
              onClick={() => navigate(createPageUrl("BrandCampaignDashboard"))}
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
              onClick={() => setActiveSection("campaigns")}
              className="h-24 bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300 flex-col gap-2"
            >
              <CheckCircle2 className="w-6 h-6" />
              <span>View Active Campaigns</span>
            </Button>
            <Button className="h-24 bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300 flex-col gap-2">
              <Users className="w-6 h-6" />
              <span>Invite Agency</span>
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
              {mockCampaigns.slice(0, 5).map((campaign) => (
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
                        {campaign.creators.join(", ")}
                      </p>
                    </div>
                    <Badge
                      className={
                        campaign.status === "in_progress"
                          ? "bg-blue-100 text-blue-700 border border-blue-300"
                          : campaign.status === "pending_approval"
                            ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                            : campaign.status === "completed"
                              ? "bg-green-100 text-green-700 border border-green-300"
                              : "bg-gray-100 text-gray-700 border border-gray-300"
                      }
                    >
                      {campaign.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      Due: {new Date(campaign.due_date).toLocaleDateString()}
                    </span>
                    <Button
                      variant="link"
                      className="text-[#F7B750] p-0 h-auto"
                    >
                      View Project →
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </Card>

          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Activity Feed
            </h3>
            <div className="space-y-3">
              {mockActivities.map((activity, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${activity.urgent
                    ? "bg-yellow-50 border-yellow-300"
                    : "bg-gray-50 border-gray-200"
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-2 h-2 rounded-full mt-2 ${activity.urgent ? "bg-yellow-500" : "bg-gray-400"
                        }`}
                    />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 font-medium">
                        {activity.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
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
              <img
                src={selectedCreator.image}
                alt={selectedCreator.name}
                className="w-full aspect-square object-cover border-2 border-gray-200 rounded-lg mb-4"
              />
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
                  <img
                    src={creator.image}
                    alt={creator.name}
                    className="w-full h-48 object-cover border-2 border-gray-200 rounded-lg"
                  />
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

  const renderCampaigns = () => {
    const filteredCampaigns = mockCampaigns.filter((c) => {
      if (campaignView === "active") return c.status === "in_progress";
      if (campaignView === "pending") return c.status === "pending_approval";
      if (campaignView === "completed") return c.status === "completed";
      if (campaignView === "drafts") return c.status === "draft";
      return true;
    });

    if (selectedCampaign) {
      const campaign = mockCampaigns.find((c) => c.id === selectedCampaign);
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

            {/* Share Brief */}
            <Card className="p-6 bg-blue-50 border-2 border-blue-300">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    Share with Talent
                  </h3>
                  <p className="text-sm text-gray-600">
                    Send this brief and contract to {campaign.creators[0]}
                  </p>
                </div>
                <Button
                  onClick={() => handleShareBrief(campaign.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Share Brief
                </Button>
              </div>
            </Card>

            {/* General Dialogue & Voice Direction */}
            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                General Dialogue & Voice Direction
              </h3>

              <div className="space-y-6">
                <div>
                  <Label className="text-base font-semibold text-gray-900 block mb-3">
                    Brand Voice & Tone
                  </Label>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-gray-900 mb-3">
                      <strong>Voice:</strong> Friendly, authentic, approachable
                    </p>
                    <p className="text-gray-900 mb-3">
                      <strong>Tone:</strong> Upbeat and energetic, but not
                      over-the-top. Natural enthusiasm that feels genuine.
                    </p>
                    <p className="text-gray-900">
                      <strong>Personality:</strong> Think "your stylish friend
                      giving honest recommendations" rather than polished
                      influencer.
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold text-gray-900 block mb-3">
                    Key Messages
                  </Label>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                    <p className="text-gray-900">
                      • "Spring collection drops next week - these pieces are
                      incredible"
                    </p>
                    <p className="text-gray-900">
                      • "Quality you can feel, style you can trust"
                    </p>
                    <p className="text-gray-900">
                      • "Perfect for everyday wear or special occasions"
                    </p>
                    <p className="text-gray-900">
                      • Call to action: "Shop now at urbanapparel.com"
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold text-gray-900 block mb-3">
                    Script Guidelines (For Video/Audio)
                  </Label>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-gray-900 mb-3">
                      <strong>Opening (0-5s):</strong> Hook viewer with energy -
                      "You guys! I just got early access to Urban Apparel's
                      spring line..."
                    </p>
                    <p className="text-gray-900 mb-3">
                      <strong>Middle (5-20s):</strong> Show product features,
                      talk about quality, fit, versatility. Be specific about
                      what you love.
                    </p>
                    <p className="text-gray-900">
                      <strong>Closing (20-30s):</strong> Clear CTA - "Link in
                      bio to shop" or "Head to urbanapparel.com before it sells
                      out"
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold text-gray-900 block mb-3">
                    Do's & Don'ts
                  </Label>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="font-semibold text-green-900 mb-2">✓ DO:</p>
                      <ul className="text-sm text-green-800 space-y-1">
                        <li>• Be authentic and natural</li>
                        <li>• Show product in real-life settings</li>
                        <li>• Speak to camera directly</li>
                        <li>• Mention brand name at least once</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="font-semibold text-red-900 mb-2">
                        ✗ DON'T:
                      </p>
                      <ul className="text-sm text-red-800 space-y-1">
                        <li>• Use competitor brands in frame</li>
                        <li>• Over-script - keep it natural</li>
                        <li>• Include controversial topics</li>
                        <li>• Disparage other brands</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Visual Requirements */}
            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Visual Requirements & Style Guide
              </h3>

              <div className="space-y-6">
                <div>
                  <Label className="text-base font-semibold text-gray-900 block mb-3">
                    Required Deliverables
                  </Label>
                  <div className="space-y-3">
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-gray-900">
                          3x Instagram Reels (15-30 seconds each)
                        </p>
                        <Badge className="bg-blue-100 text-blue-700 border border-blue-300">
                          Video
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">
                        Format: 9:16 vertical, 1080x1920, MP4
                      </p>
                      <p className="text-sm text-gray-700">
                        Content: Product showcase, try-on, styling tips
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-gray-900">
                          1x Hero Image
                        </p>
                        <Badge className="bg-purple-100 text-purple-700 border border-purple-300">
                          Image
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">
                        Format: 1920x1080, JPG/PNG, high resolution
                      </p>
                      <p className="text-sm text-gray-700">
                        Content: Lifestyle shot wearing spring collection piece
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold text-gray-900 block mb-3">
                    Visual Style & Aesthetic
                  </Label>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
                    <p className="text-gray-900">
                      <strong>Color Palette:</strong> Warm earth tones, natural
                      lighting, bright but not oversaturated
                    </p>
                    <p className="text-gray-900">
                      <strong>Setting:</strong> Indoor/outdoor lifestyle
                      settings - coffee shop, park, urban backdrop, home
                    </p>
                    <p className="text-gray-900">
                      <strong>Framing:</strong> Mix of close-ups and full-body
                      shots. Show product clearly.
                    </p>
                    <p className="text-gray-900">
                      <strong>Editing:</strong> Clean, minimal cuts. Trendy but
                      not overly filtered. Authentic feel.
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold text-gray-900 block mb-3">
                    Reference Images
                  </Label>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="relative">
                      <img
                        src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400"
                        alt="Reference 1"
                        className="w-full h-48 object-cover border-2 border-gray-200 rounded-lg"
                      />
                      <Badge className="absolute top-2 left-2 bg-white text-gray-900 border border-gray-300">
                        Style Ref 1
                      </Badge>
                    </div>
                    <div className="relative">
                      <img
                        src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400"
                        alt="Reference 2"
                        className="w-full h-48 object-cover border-2 border-gray-200 rounded-lg"
                      />
                      <Badge className="absolute top-2 left-2 bg-white text-gray-900 border border-gray-300">
                        Style Ref 2
                      </Badge>
                    </div>
                    <div className="relative">
                      <img
                        src="https://images.unsplash.com/photo-1445205170230-053b83016050?w=400"
                        alt="Reference 3"
                        className="w-full h-48 object-cover border-2 border-gray-200 rounded-lg"
                      />
                      <Badge className="absolute top-2 left-2 bg-white text-gray-900 border border-gray-300">
                        Vibe Ref
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold text-gray-900 block mb-3">
                    Brand Assets Provided
                  </Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-gray-600" />
                        <span className="text-gray-900">
                          Brand_Guidelines.pdf
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-2 border-gray-300"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <ImageIcon className="w-5 h-5 text-gray-600" />
                        <span className="text-gray-900">
                          Product_Photos_SpringCollection.zip
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-2 border-gray-300"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Campaign Scope & Details */}
            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Campaign Scope & Contract Details
              </h3>

              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-base font-semibold text-gray-900 block mb-3">
                      Campaign Overview
                    </Label>
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-2 text-sm">
                      <p className="text-gray-900">
                        <strong>Objective:</strong> Drive awareness and sales
                        for Spring 2025 collection launch
                      </p>
                      <p className="text-gray-900">
                        <strong>Target Audience:</strong> Women 25-40,
                        fashion-conscious, urban lifestyle
                      </p>
                      <p className="text-gray-900">
                        <strong>Campaign Duration:</strong> {campaign.duration}
                      </p>
                      <p className="text-gray-900">
                        <strong>Launch Date:</strong> {campaign.go_live}
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-semibold text-gray-900 block mb-3">
                      Budget & Timeline
                    </Label>
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-2 text-sm">
                      <p className="text-gray-900">
                        <strong>Total Budget:</strong> $
                        {campaign.budget.toLocaleString()}
                      </p>
                      <p className="text-gray-900">
                        <strong>Creator Payment:</strong> $
                        {(campaign.budget * 0.9).toFixed(0)}
                      </p>
                      <p className="text-gray-900">
                        <strong>Platform Fee:</strong> $
                        {(campaign.budget * 0.1).toFixed(0)} (10%)
                      </p>
                      <p className="text-gray-900">
                        <strong>Submission Deadline:</strong>{" "}
                        {new Date(campaign.due_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold text-gray-900 block mb-3">
                    Usage Rights & Licensing
                  </Label>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="p-3 bg-white border border-gray-200 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Territory</p>
                        <p className="font-semibold text-gray-900">
                          {campaign.territory}
                        </p>
                      </div>
                      <div className="p-3 bg-white border border-gray-200 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Duration</p>
                        <p className="font-semibold text-gray-900">
                          {campaign.duration}
                        </p>
                      </div>
                      <div className="p-3 bg-white border border-gray-200 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">
                          License Expiry
                        </p>
                        <p className="font-semibold text-gray-900">
                          {campaign.license_expiry}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-300">
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Approved Channels:</strong>
                      </p>
                      <div className="flex gap-2">
                        {campaign.channels.map((channel) => (
                          <Badge
                            key={channel}
                            className="bg-blue-100 text-blue-700 border border-blue-300"
                          >
                            {channel}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-300">
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Exclusivity:</strong>
                      </p>
                      <p className="text-gray-900">
                        Non-exclusive. Creator may work with non-competing
                        brands in same category.
                      </p>
                    </div>

                    <div className="pt-3 border-t border-gray-300">
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Renewal Terms:</strong>
                      </p>
                      <p className="text-gray-900">
                        Auto-renewal available at end of term. Brand must notify
                        14 days prior if not renewing.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold text-gray-900 block mb-3">
                    Revision Policy
                  </Label>
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-gray-900 mb-2">
                      <strong>Included Revisions:</strong> 2 rounds of minor
                      edits (color correction, text changes, music swaps)
                    </p>
                    <p className="text-gray-900 mb-2">
                      <strong>Major Changes:</strong> Require new brief and
                      additional budget (e.g., re-shoot, complete re-edit)
                    </p>
                    <p className="text-gray-900">
                      <strong>Turnaround for Revisions:</strong> 24-48 hours
                      depending on scope
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold text-gray-900 block mb-3">
                    Approval Process
                  </Label>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-[#F7B750] text-white rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">
                          1
                        </div>
                        <p className="text-gray-900">
                          Creator submits deliverables to platform
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-[#F7B750] text-white rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">
                          2
                        </div>
                        <p className="text-gray-900">
                          Brand has 48 hours to review and approve/request
                          revisions
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-[#F7B750] text-white rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">
                          3
                        </div>
                        <p className="text-gray-900">
                          Once approved, funds release from escrow to creator (3
                          business days)
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-[#F7B750] text-white rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">
                          4
                        </div>
                        <p className="text-gray-900">
                          If no action taken, payment auto-releases after 48
                          hours
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold text-gray-900 block mb-3">
                    Watermark & Protection
                  </Label>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-gray-900 mb-2">
                      All delivered assets include embedded Likelee watermark
                      for license verification and usage tracking.
                    </p>
                    <p className="text-gray-900">
                      <strong>DMCA Protection:</strong> Automatic takedown
                      notices if assets used outside approved scope.
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold text-gray-900 block mb-3">
                    Legal Terms
                  </Label>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 space-y-2">
                    <p>
                      • Creator retains copyright; Brand receives usage license
                      as specified
                    </p>
                    <p>
                      • SAG-AFTRA compliant terms and fair compensation
                      standards
                    </p>
                    <p>
                      • Creator has right to approve final usage before
                      publishing
                    </p>
                    <p>• Brand cannot sublicense without creator consent</p>
                    <p>
                      • Usage limited to approved channels, territories, and
                      duration
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Contract Actions */}
            <div className="flex gap-4">
              <Button
                onClick={() => handleShareBrief(campaign.id)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-12"
              >
                <Users className="w-5 h-5 mr-2" />
                Share Full Brief with Talent
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-2 border-gray-300 h-12"
              >
                <Download className="w-5 h-5 mr-2" />
                Download Contract PDF
              </Button>
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

      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
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
              <Badge
                className={
                  campaign.status === "in_progress"
                    ? "bg-blue-100 text-blue-700 border border-blue-300"
                    : campaign.status === "pending_approval"
                      ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                      : campaign.status === "completed"
                        ? "bg-green-100 text-green-700 border border-green-300"
                        : "bg-gray-100 text-gray-700 border border-gray-300"
                }
              >
                {campaign.status.replace("_", " ")}
              </Badge>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  className="border-2 border-gray-300"
                  onClick={() => setShowContractModal(true)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Contract
                </Button>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Due Date</p>
                  <p className="font-bold text-gray-900">
                    {new Date(campaign.due_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
            <Progress
              value={
                campaign.status === "completed"
                  ? 100
                  : campaign.status === "pending_approval"
                    ? 75
                    : 50
              }
              className="h-2"
            />
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
                  <p className="text-gray-900">
                    3 Instagram Reels (15-30 seconds each), 1 Hero Image
                  </p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 block mb-2">
                      Timeline
                    </Label>
                    <p className="text-gray-900">Start: {campaign.go_live}</p>
                    <p className="text-gray-900">
                      Due: {new Date(campaign.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 block mb-2">
                      Budget
                    </Label>
                    <p className="text-gray-900">Total: ${campaign.budget}</p>
                    <p className="text-sm text-gray-600">
                      Creator: ${(campaign.budget * 0.9).toFixed(0)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Likelee Fee: ${(campaign.budget * 0.1).toFixed(0)}
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
                Assigned Talent
              </h3>
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={campaign.creatorAvatars[0]}
                  alt={campaign.creators[0]}
                  className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                />
                <div>
                  <p className="font-semibold text-gray-900">
                    {campaign.creators[0]}
                  </p>
                  <p className="text-sm text-gray-600">★★★★★ 4.9</p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full border-2 border-gray-300 mb-2"
              >
                Message Talent
              </Button>
              <Button
                variant="outline"
                className="w-full border-2 border-blue-300 text-blue-600"
                onClick={() => setShowBriefDetails(true)}
              >
                Share Brief with Talent
              </Button>
            </Card>
          </div>

          {/* Deliverables Section */}
          {campaign.status === "pending_approval" && (
            <Card className="p-6 bg-white border border-yellow-300 border-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  Review Deliverables
                </h3>
                <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-300">
                  <Clock className="w-4 h-4 mr-1" />
                  48h to approve
                </Badge>
              </div>
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="relative">
                    <img
                      src={`https://images.unsplash.com/photo-${1540202404 + i}-d0c7fe46a087?w=400`}
                      alt={`Asset ${i}`}
                      className="w-full h-48 object-cover border-2 border-gray-200 rounded-lg"
                    />
                    <Badge className="absolute top-2 right-2 bg-green-500 text-white">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Watermarked
                    </Badge>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Approve Deliverables
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-2 border-gray-300"
                >
                  Request Revisions
                </Button>
              </div>
            </Card>
          )}

          {/* License & Usage Rights */}
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              License & Usage Rights
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <Label className="text-sm font-semibold text-gray-700 block mb-2">
                  Territory
                </Label>
                <p className="text-gray-900">{campaign.territory}</p>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <Label className="text-sm font-semibold text-gray-700 block mb-2">
                  Duration
                </Label>
                <p className="text-gray-900">{campaign.duration}</p>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <Label className="text-sm font-semibold text-gray-700 block mb-2">
                  Channels
                </Label>
                <p className="text-gray-900">{campaign.channels.join(", ")}</p>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <Label className="text-sm font-semibold text-gray-700 block mb-2">
                  Valid Until
                </Label>
                <p className="text-gray-900">{campaign.license_expiry}</p>
              </div>
            </div>
          </Card>

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
                onClick={() => setShowContractModal(true)}
              >
                <FileText className="w-4 h-4 mr-2" />
                View Full Contract
              </Button>
              <Button
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => setShowUpdateRequestModal(true)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Request Contract Update
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              My Campaigns
            </h1>
            <p className="text-gray-600">
              Create, manage, and track all projects from brief to completion
            </p>
          </div>
          <Button
            onClick={() => navigate(createPageUrl("BrandCampaignDashboard"))}
            className="h-12 px-6 bg-[#F7B750] hover:bg-[#E6A640] text-white"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Campaign
          </Button>
        </div>

        {/* Campaign Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setCampaignView("active")}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${campaignView === "active"
              ? "border-[#F7B750] text-[#F7B750]"
              : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
          >
            Active (
            {mockCampaigns.filter((c) => c.status === "in_progress").length})
          </button>
          <button
            onClick={() => setCampaignView("pending")}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${campaignView === "pending"
              ? "border-[#F7B750] text-[#F7B750]"
              : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
          >
            Pending Approval ({pendingApprovalCount})
          </button>
          <button
            onClick={() => setCampaignView("completed")}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${campaignView === "completed"
              ? "border-[#F7B750] text-[#F7B750]"
              : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
          >
            Completed (
            {mockCampaigns.filter((c) => c.status === "completed").length})
          </button>
          <button
            onClick={() => setCampaignView("drafts")}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${campaignView === "drafts"
              ? "border-[#F7B750] text-[#F7B750]"
              : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
          >
            Drafts ({mockCampaigns.filter((c) => c.status === "draft").length})
          </button>
        </div>

        {/* Campaign Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign) => (
            <Card
              key={campaign.id}
              className="p-6 bg-white border border-gray-200 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => setSelectedCampaign(campaign.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1">
                    {campaign.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {campaign.creators.join(", ")}
                  </p>
                </div>
                <Badge
                  className={
                    campaign.status === "in_progress"
                      ? "bg-blue-100 text-blue-700 border border-blue-300"
                      : campaign.status === "pending_approval"
                        ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                        : campaign.status === "completed"
                          ? "bg-green-100 text-green-700 border border-green-300"
                          : "bg-gray-100 text-gray-700 border border-gray-300"
                  }
                >
                  {campaign.status.replace("_", " ")}
                </Badge>
              </div>

              <div className="space-y-3 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Budget:</span>
                  <span className="font-bold text-gray-900">
                    ${campaign.budget.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Due Date:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(campaign.due_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Assets:</span>
                  <span className="font-medium text-gray-900">
                    {campaign.assets_delivered} delivered
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Update:</span>
                  <span className="font-medium text-gray-900">
                    {campaign.last_update}
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full border-2 border-gray-300"
              >
                View Details
              </Button>
            </Card>
          ))}
        </div>

        {filteredCampaigns.length === 0 && (
          <Card className="p-12 bg-gray-50 border border-gray-200 text-center">
            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No {campaignView} campaigns
            </h3>
            <p className="text-gray-600 mb-6">
              Start a new campaign to get creators working on your content
            </p>
            <Button
              onClick={() => navigate(createPageUrl("BrandCampaignDashboard"))}
              className="bg-[#F7B750] hover:bg-[#E6A640] text-white"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New Campaign
            </Button>
          </Card>
        )}
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
      <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-6 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Total Projects (YTD)</p>
          <p className="text-3xl font-bold text-gray-900">12</p>
        </Card>
        <Card className="p-6 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Avg Turnaround</p>
          <p className="text-3xl font-bold text-gray-900">14h</p>
          <p className="text-xs text-gray-500 mt-1">Industry: 48h</p>
        </Card>
        <Card className="p-6 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Approval Rate</p>
          <p className="text-3xl font-bold text-gray-900">96%</p>
          <p className="text-xs text-green-600 mt-1">First submission</p>
        </Card>
        <Card className="p-6 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Total Spend (YTD)</p>
          <p className="text-3xl font-bold text-gray-900">$45.2K</p>
        </Card>
        <Card className="p-6 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Avg Cost/Project</p>
          <p className="text-3xl font-bold text-gray-900">$3.8K</p>
        </Card>
        <Card className="p-6 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Revision Rate</p>
          <p className="text-3xl font-bold text-gray-900">4%</p>
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
                  Avg Rating
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
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <img
                      src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/5d413193e_Screenshot2025-10-29at63349PM.png"
                      className="w-10 h-10 rounded-full object-cover"
                      alt="Emma"
                    />
                    <div>
                      <p className="font-semibold text-gray-900">Emma</p>
                      <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-300 text-xs">
                        Top Performer
                      </Badge>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-gray-900">5</td>
                <td className="px-4 py-4 text-gray-900">★★★★★ 4.9</td>
                <td className="px-4 py-4 text-gray-900">12h</td>
                <td className="px-4 py-4 text-green-600 font-semibold">100%</td>
                <td className="px-4 py-4 font-bold text-gray-900">$8,200</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <img
                      src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/eb5550a53_Screenshot2025-10-29at63527PM.png"
                      className="w-10 h-10 rounded-full object-cover"
                      alt="Marcus"
                    />
                    <p className="font-semibold text-gray-900">Marcus Davis</p>
                  </div>
                </td>
                <td className="px-4 py-4 text-gray-900">3</td>
                <td className="px-4 py-4 text-gray-900">★★★★☆ 4.7</td>
                <td className="px-4 py-4 text-gray-900">16h</td>
                <td className="px-4 py-4 text-green-600 font-semibold">95%</td>
                <td className="px-4 py-4 font-bold text-gray-900">$6,000</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
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

        <Card className="p-6 bg-white border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Project Completion Time
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">0-12 hours</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: "40%" }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-900">40%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">12-24 hours</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: "35%" }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-900">35%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">24-48 hours</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500"
                    style={{ width: "20%" }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-900">20%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">48+ hours</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500" style={{ width: "5%" }} />
                </div>
                <span className="text-sm font-semibold text-gray-900">5%</span>
              </div>
            </div>
          </div>
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
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${contractDetailTab === "summary"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
          >
            Summary
          </button>
          <button
            onClick={() => setContractDetailTab("full_text")}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${contractDetailTab === "full_text"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
          >
            Full Text
          </button>
          <button
            onClick={() => setContractDetailTab("custom")}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${contractDetailTab === "custom"
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
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${contractDetailTab === "history"
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
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${contractHubTab === "active"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
          >
            Active ({activeContracts.length})
          </button>
          <button
            onClick={() => setContractHubTab("pending")}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${contractHubTab === "pending"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
          >
            Pending Signature ({pendingContracts.length})
          </button>
          <button
            onClick={() => setContractHubTab("all")}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${contractHubTab === "all"
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
                className={`p-6 border ${contract.status === "signed"
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
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${usageRightsTab === "licenses"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
          >
            Active Licenses
          </button>
          <button
            onClick={() => setUsageRightsTab("expiring")}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${usageRightsTab === "expiring"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
          >
            Expiring Soon{" "}
            {expiringLicenses.length > 0 && `(${expiringLicenses.length})`}
          </button>
          <button
            onClick={() => setUsageRightsTab("contracts")}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${usageRightsTab === "contracts"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
          >
            Contract Hub
          </button>
          <button
            onClick={() => setUsageRightsTab("compliance")}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${usageRightsTab === "compliance"
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Hire {selectedCreator?.name}
            </DialogTitle>
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
          </DialogHeader>

          <div className="py-4 space-y-6">
            {selectedCampaign &&
              mockCampaigns.find((c) => c.id === selectedCampaign) && (
                <>
                  <Card className="p-6 bg-gray-50 border-2 border-gray-300">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      Contract Overview
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 mb-1">Campaign Name</p>
                        <p className="font-semibold text-gray-900">
                          {
                            mockCampaigns.find((c) => c.id === selectedCampaign)
                              .name
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 mb-1">Talent</p>
                        <p className="font-semibold text-gray-900">
                          {mockCampaigns
                            .find((c) => c.id === selectedCampaign)
                            .creators.join(", ")}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 mb-1">Budget</p>
                        <p className="font-semibold text-gray-900">
                          $
                          {mockCampaigns
                            .find((c) => c.id === selectedCampaign)
                            .budget.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 mb-1">Status</p>
                        <Badge className="bg-blue-100 text-blue-700 border border-blue-300">
                          {mockCampaigns
                            .find((c) => c.id === selectedCampaign)
                            .status.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6 bg-white border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Contract Terms
                    </h3>
                    <div className="space-y-4 text-sm">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <p className="text-gray-600 mb-1">Territory</p>
                          <p className="font-semibold text-gray-900">
                            {
                              mockCampaigns.find(
                                (c) => c.id === selectedCampaign,
                              ).territory
                            }
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <p className="text-gray-600 mb-1">Duration</p>
                          <p className="font-semibold text-gray-900">
                            {
                              mockCampaigns.find(
                                (c) => c.id === selectedCampaign,
                              ).duration
                            }
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <p className="text-gray-600 mb-1">License Expires</p>
                          <p className="font-semibold text-gray-900">
                            {
                              mockCampaigns.find(
                                (c) => c.id === selectedCampaign,
                              ).license_expiry
                            }
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <p className="text-gray-600 mb-1">Channels</p>
                          <p className="font-semibold text-gray-900">
                            {mockCampaigns
                              .find((c) => c.id === selectedCampaign)
                              .channels.join(", ")}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="font-semibold text-gray-900 mb-2">
                          Deliverables
                        </p>
                        <p className="text-gray-700">
                          3 Instagram Reels (15-30 seconds each), 1 Hero Image
                        </p>
                      </div>

                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="font-semibold text-gray-900 mb-2">
                          Revision Policy
                        </p>
                        <p className="text-gray-700">
                          2 rounds of revisions included
                        </p>
                      </div>

                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="font-semibold text-gray-900 mb-2">
                          Payment Terms
                        </p>
                        <p className="text-gray-700">
                          Escrow-protected, releases upon approval or after 48
                          hours
                        </p>
                      </div>
                    </div>
                  </Card>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 border-2 border-gray-300"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
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
              const isActive = activeSection === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    setShowEscrowDetails(false);
                    setShowBriefDetails(false);
                    setShowCreatorProfile(false);
                    setShowContractHub(false);
                    setSelectedContract(null);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${isActive
                    ? "bg-[#F7B750] text-white"
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
          <Alert className="mb-6 bg-amber-50 border border-amber-200">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <AlertDescription className="text-amber-900 font-medium">
              <strong>Demo Mode:</strong> This is a preview of the Brand
              Dashboard for companies and brands.
            </AlertDescription>
          </Alert>

          {activeSection === "home" && renderHome()}
          {activeSection === "marketplace" && renderMarketplace()}
          {activeSection === "campaigns" && renderCampaigns()}
          {activeSection === "studio" && renderStudio()}
          {activeSection === "analytics" && renderAnalytics()}
          {activeSection === "usage" && renderUsageRights()}
          {activeSection === "billing" && renderBilling()}
          {activeSection === "settings" && renderSettings()}
        </div>
      </main>
    </div>
  );
}
