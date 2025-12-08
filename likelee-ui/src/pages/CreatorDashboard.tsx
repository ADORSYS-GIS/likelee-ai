import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Check,
  CheckCircle,
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
import CameoUpload from "./CameoUpload";
const CONTENT_TYPES = [
  "Social-media ads",
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
];

// Voice recording scripts for different emotions
const VOICE_SCRIPTS = {
  happy:
    "I'm absolutely thrilled to be here today! Life is full of wonderful surprises and exciting opportunities. Every morning brings a fresh start and new possibilities. I love connecting with people and sharing positive energy. The world is an amazing place when you look at it with optimism. Let's celebrate the little victories and cherish every moment of joy. Happiness is contagious, so let's spread it around!",

  emotional:
    "There are moments in life that touch our hearts deeply. Sometimes we feel overwhelmed by the beauty of human connection. These experiences shape who we are and remind us of what truly matters. I've learned that vulnerability is not weakness, but courage. Every person we meet carries their own story, their own struggles and triumphs. Let's honor those moments and hold space for authentic emotion.",

  excited:
    "Oh my goodness, this is incredible! I can barely contain my enthusiasm right now! There's so much energy and potential in this moment. I'm buzzing with anticipation for what's coming next. Can you feel that electricity in the air? This is going to be absolutely amazing! I'm ready to jump in with both feet and make things happen. The future is bright and I'm here for it!",

  mellow:
    "Sometimes it's nice to just slow down and take things easy. There's no rush, no pressure. Just a calm, steady presence in the moment. Life doesn't always have to be intense or dramatic. These quiet moments have their own beauty and purpose. Let's just breathe and appreciate the stillness. Everything unfolds in its own time, and that's perfectly okay.",

  relaxed:
    "Hey there, just taking it easy today. No stress, no worries. Everything's flowing naturally and smoothly. I'm in a really good headspace right now, just enjoying the present moment. Life feels balanced and comfortable. There's something peaceful about not overthinking things. Just being here, being present, and letting things happen naturally. It's all good.",

  angry:
    "I cannot believe this is happening. This is completely unacceptable and frankly, I'm fed up. There are limits to what anyone should have to tolerate. This situation needs to change, and it needs to change now. I'm tired of excuses and empty promises. Actions speak louder than words, and I'm ready to demand what's right. This ends here.",
};

const IMAGE_SECTIONS = [
  {
    id: "headshot_neutral",
    title: "Headshots - Neutral Expression",
    description:
      "Face front-facing, neutral expression (not smiling or frowning). Good lighting on face. Professional clothing or plain background. 1080x1080 minimum.",
    bestFor: "Brands need a clean face reference",
  },
  {
    id: "headshot_smiling",
    title: "Headshots - Smiling",
    description:
      "Face front-facing, natural smile (genuine, not forced). Good lighting. Professional setting. 1080x1080 minimum.",
    bestFor: "Brands want to show you happy/approachable",
  },
  {
    id: "fullbody_casual",
    title: "Full Body - Casual Outfit",
    description: "Full body shot in casual everyday clothing. Natural pose.",
    bestFor: "Everyday casual look",
  },
  {
    id: "fullbody_formal",
    title: "Full Body - Formal/Professional",
    description: "Full body shot in professional or formal attire.",
    bestFor: "Professional or business contexts",
  },
  {
    id: "side_profile",
    title: "Side Profile",
    description: "Clean side view of your face and upper body.",
    bestFor: "Brands need your side angle",
  },
  {
    id: "three_quarter",
    title: "3/4 Angle",
    description: "Face turned at a 45-degree angle, natural expression.",
    bestFor: "Natural conversational angle",
  },
  {
    id: "hair_down",
    title: "Hair Down - Loose/Wavy",
    description: "Hair worn down in your natural style.",
    bestFor: "Casual, relaxed look",
  },
  {
    id: "hair_up",
    title: "Hair Up - Ponytail/Bun",
    description: "Hair pulled up/back, clean look.",
    bestFor: "Professional or active look",
  },
  {
    id: "hair_styling",
    title: "Hair Styling - Braids/Specific Style",
    description: "If you have a signature hairstyle.",
    bestFor: "If you have a signature style",
  },
  {
    id: "upper_body",
    title: "Upper Body Close-Up",
    description: "Shoulders and up, detailed facial features visible.",
    bestFor: "Close-up shots, detailed facial features",
  },
  {
    id: "outdoors",
    title: "In Environment - Outdoors",
    description: "You in an outdoor setting (park, street, nature).",
    bestFor: "Contextual, lifestyle content",
  },
  {
    id: "indoors",
    title: "In Environment - Indoors",
    description: "You in an indoor setting (home, office, cafe).",
    bestFor: "Indoor/office/home contexts",
  },
  {
    id: "makeup_variation",
    title: "Different Makeup Style",
    description: "If you vary your makeup style, show different looks.",
    bestFor: "If you vary makeup, brands should know",
  },
  {
    id: "seasonal",
    title: "Seasonal/Outfit Variation",
    description: "Different seasonal styles or outfit variations.",
    bestFor: "Seasonal campaigns, different looks",
  },
  {
    id: "signature",
    title: "Your Choice - Signature Moment",
    description:
      "A photo that really represents YOU and how people recognize you.",
    bestFor: "A photo that really represents YOU",
  },
];

// Example campaigns for blank users (shown when no real campaigns exist)
const exampleCampaigns = [
  {
    id: "example-nike",
    brand: "Nike",
    brand_logo:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRi7Zx9TmyT9DJpbcODrb4HbvoNES_u0yr7tQ&s",
    brand_image_url:
      "https://9f8e62d4.delivery.rocketcdn.me/wp-content/uploads/2024/09/man-wearing-black-nike-hoodie-1.jpg",
    campaign: "Best Nike Heritage Collection",
    usage_type: "Social Ads",
    rate: 15000,
    status: "active",
    start_date: "2024-01-15",
    end_date: "2024-07-15",
    active_until: "2024-07-15",
    regions: ["North America", "Europe"],
    impressions_week: "125000 impressions/week",
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
    impressions_week: "89000 impressions/week",
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
    impressions_week: "250000 impressions/week",
    auto_renewal: false,
    isExample: true,
  },
];

// Example approval for blank users (shown when no real approvals exist)
const exampleApprovals = [
  {
    id: "example-adidas-approval",
    brand: "Adidas Running",
    brand_logo:
      "https://upload.wikimedia.org/wikipedia/commons/2/20/Adidas_Logo.svg",
    campaign_type: "Social Media Campaign",
    requested_date: "2025-02-06",
    proposed_rate: 600,
    term_length: "6 months",
    estimated_monthly: 540, // after 10% Likelee fee
    regions: ["North America", "Asia"],
    industries: ["Sports / Fitness"],
    usage_type: "Social Media",
    duration: "6 months",
    territory: "North America, Asia",
    perpetual: false,
    isExample: true,
  },
];

// Example archived campaign for blank users (shown when no real archived campaigns exist)
const exampleArchivedCampaigns = [
  {
    id: "example-spotify-archive",
    brand: "Spotify Premium",
    brand_logo:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Spotify_logo_without_text.svg/2048px-Spotify_logo_without_text.svg.png",
    campaign: "Audio Campaign",
    campaign_type: "Audio Campaign",
    completed_date: "2/1/2026",
    duration: "2 months",
    monthly_rate: 600,
    total_earned: 1200,
    regions: ["Global"],
    show_on_portfolio: false,
    isExample: true,
  },
];

// Example contract for blank users (shown when no real contracts exist)
const exampleContracts = [
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
    usage_description: "Instagram Reels (15-30s each) Hero Image",
    deliverables: "Instagram Reels (15-30s each) Hero Image",
    territory: "North America, Europe",
    channels: ["Social Media", "Website"],
    restrictions: "Competitor brands, political content",
    prohibited_uses: "Competitor brands, political content",
    auto_renew: false,
    can_pause: true,
    can_revoke: true,
    isExample: true,
  },
];

// Empty defaults for campaigns (until wired to real data)
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

export default function CreatorDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, initialized, authenticated, logout } = useAuth();
  const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || "";
  const [activeSection, setActiveSection] = useState("dashboard");
  const [settingsTab, setSettingsTab] = useState("profile"); // 'profile' or 'rules'
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [creator, setCreator] = useState<any>({});
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [heroMedia, setHeroMedia] = useState(null);
  const [photos, setPhotos] = useState([]);

  // Initialize active section from query string if provided
  useEffect(() => {
    const s = searchParams.get("section");
    if (!s) return;
    const validIds = navigationItems.map((n) => n.id);
    if (validIds.includes(s)) {
      setActiveSection(s);
    }
  }, [searchParams]);
  const [voiceLibrary, setVoiceLibrary] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [kycLoading, setKycLoading] = useState(false);
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
  const [showReuploadCameoModal, setShowReuploadCameoModal] = useState(false);
  const [showImageUploadModal, setShowImageUploadModal] = useState(false);
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

  // Content Restrictions State
  const [contentRestrictions, setContentRestrictions] = useState<string[]>([
    "Political Content",
    "Controversial Topics",
    "Explicit/Adult Content",
    "Pharmaceutical Claims",
    "Financial/Investment Advice",
    "Tobacco/Vaping Products",
    "Gambling (Unlicensed)",
  ]);
  const [availableRestrictions, setAvailableRestrictions] = useState<string[]>([
    "Alcohol",
    "Weapons/Firearms",
    "Cryptocurrency/NFT",
    "MLM/Multi-Level Marketing",
    "Unlicensed Financial Products",
    "Health/Medical Claims",
  ]);
  const [brandExclusivity, setBrandExclusivity] = useState<string[]>([]);
  const [showRestrictionsModal, setShowRestrictionsModal] = useState(false);
  const [customRestriction, setCustomRestriction] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [editingLicensingRate, setEditingLicensingRate] = useState(false);
  const [localMonthlyRate, setLocalMonthlyRate] = useState("");
  const [savingRules, setSavingRules] = useState(false);

  // Sync local rate when creator data loads or when entering edit mode
  // Sync local rate when creator data loads or when entering edit mode
  useEffect(() => {
    // If we are not editing, keep the local value in sync with the saved data
    if (!editingLicensingRate) {
      if (
        creator?.base_monthly_price_cents !== undefined &&
        creator?.base_monthly_price_cents !== null
      ) {
        setLocalMonthlyRate(
          (creator.base_monthly_price_cents / 100).toString(),
        );
      } else if (creator?.price_per_week !== undefined) {
        setLocalMonthlyRate(((creator.price_per_week || 0) * 4).toString());
      }
    }
  }, [
    creator?.price_per_week,
    creator?.base_monthly_price_cents,
    editingLicensingRate,
  ]);

  // Load persisted Reference Image Library on mount/auth ready
  useEffect(() => {
    if (!initialized || !authenticated || !user?.id) return;
    const abort = new AbortController();
    (async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/reference-images?user_id=${encodeURIComponent(user.id)}`,
          { signal: abort.signal },
        );
        if (!res.ok) return; // best-effort
        const items = await res.json();
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
        // 1) List recordings
        const res = await fetch(
          `${API_BASE}/api/voice/recordings?user_id=${encodeURIComponent(
            user.id,
          )}`,
          { signal: abort.signal },
        );
        if (!res.ok) return; // best-effort
        const rows = await res.json();
        if (!Array.isArray(rows)) return;

        // 2) Fetch signed URLs for playback
        const withUrls = await Promise.all(
          rows.map(async (row: any) => {
            try {
              const s = await fetch(
                `${API_BASE}/api/voice/recordings/signed-url?recording_id=${encodeURIComponent(
                  row.id,
                )}&expires_sec=600`,
                { signal: abort.signal },
              );
              const j = s.ok ? await s.json() : { url: null };
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
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentWord, setCurrentWord] = useState(0);
  const [generatingVoice, setGeneratingVoice] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
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
        console.log("Fetching dashboard data for user:", user.id);
        const res = await fetch(
          `${API_BASE}/api/dashboard?user_id=${encodeURIComponent(user.id)}`,
          { signal: abort.signal },
        );
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        const profile = json.profile || {};
        console.log(
          "Dashboard loaded with content_types:",
          profile.content_types,
          "industries:",
          profile.industries,
        );
        setCreator({
          name: profile.full_name || creator.name,
          email: profile.email || creator.email,
          profile_photo: profile.profile_photo_url || creator.profile_photo,
          location: [profile.city, profile.state].filter(Boolean).join(", "),
          bio: profile.bio || creator.bio,
          instagram_handle: profile.platform_handle
            ? `@${profile.platform_handle}`
            : creator.instagram_handle,
          tiktok_handle: creator.tiktok_handle,
          instagram_connected: creator.instagram_connected ?? false,
          instagram_followers: creator.instagram_followers ?? 0,
          content_types: profile.content_types || [],
          industries: profile.industries || [],
          // Derive weekly price from monthly base (USD-only)
          price_per_week:
            typeof profile.base_monthly_price_cents === "number"
              ? Math.round(profile.base_monthly_price_cents / 100 / 4)
              : (creator.price_per_week ?? 0),
          royalty_percentage: creator.royalty_percentage ?? 0,
          accept_negotiations: creator.accept_negotiations ?? true,
          kyc_status: profile.kyc_status,
          verified_at: profile.verified_at,
          cameo_front_url: profile.cameo_front_url,
          cameo_left_url: profile.cameo_left_url,
          cameo_right_url: profile.cameo_right_url,
        });

        // Populate restrictions state
        if (
          profile.content_restrictions &&
          Array.isArray(profile.content_restrictions)
        ) {
          setContentRestrictions(profile.content_restrictions);
        }
        if (
          profile.brand_exclusivity &&
          Array.isArray(profile.brand_exclusivity)
        ) {
          setBrandExclusivity(profile.brand_exclusivity);
        }
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
        const res = await fetch(
          `${API_BASE}/api/creator-rates?user_id=${encodeURIComponent(user.id)}`,
        );
        if (res.ok) {
          const data = await res.json();
          setCustomRates(data);
        }
      } catch (e) {
        console.error("Failed to fetch rates", e);
      }
    })();
  }, [initialized, authenticated, user?.id, API_BASE]);

  // Verification actions from dashboard
  const startVerificationFromDashboard = async () => {
    if (!authenticated || !user?.id) {
      alert("Please log in to start verification.");
      return;
    }
    try {
      setKycLoading(true);
      const res = await fetch(`${API_BASE}/api/kyc/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (data.session_url) window.open(data.session_url, "_blank");
    } catch (e: any) {
      alert(`Failed to start verification: ${e?.message || e}`);
    } finally {
      setKycLoading(false);
    }
  };

  const refreshVerificationFromDashboard = async () => {
    if (!authenticated || !user?.id) return;
    try {
      setKycLoading(true);
      const res = await fetch(
        `${API_BASE}/api/kyc/status?user_id=${encodeURIComponent(user.id)}`,
      );
      if (!res.ok) throw new Error(await res.text());
      const rows = await res.json();
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
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "content", label: "Content", icon: PlayCircle },
    { id: "likeness", label: "My Likeness", icon: ImageIcon },
    { id: "voice", label: "Voice & Recordings", icon: Mic },
    {
      id: "campaigns",
      label: "Active Campaigns",
      icon: Target,
      badge: activeCampaigns.length,
    },
    {
      id: "approvals",
      label: "Approval Queue",
      icon: CheckSquare,
      badge: pendingCount,
      urgent: pendingCount > 0,
    },
    {
      id: "archive",
      label: "Campaign Archive",
      icon: Archive,
      badge: undefined,
    },
    {
      id: "contracts",
      label: "Licenses & Contracts",
      icon: FileText,
      badge:
        contracts.filter((c) => c.status === "expiring_soon").length > 0
          ? contracts.filter((c) => c.status === "expiring_soon").length
          : undefined,
    },
    { id: "earnings", label: "Earnings", icon: DollarSign },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const handleHeroUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploading(true);
      setTimeout(() => {
        setHeroMedia({
          url: URL.createObjectURL(file),
          type: file.type.includes("video") ? "video" : "image",
          name: file.name,
        });
        setUploading(false);
        alert("Hero media uploaded! (Demo mode)");
      }, 1000);
    }
  };

  const renderContent = () => {
    const detectionsCount = 0;
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Content</h2>
          <p className="text-gray-600 mt-1">
            Track content created with your likeness
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200">
          <AlertCircle className="h-5 w-5 text-blue-600" />
          <p className="text-blue-900">
            Welcome to your Content page! You don't have any content yet — when
            brands publish content with your licensed likeness, it will appear
            here.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Badge className="bg-gray-900 text-white">
            Brand Content ({contentItems.length})
          </Badge>
          <Badge className="bg-red-100 text-red-700 border border-red-300">
            Detections ({detectionsCount})
          </Badge>
        </div>

        {contentItems.length === 0 ? (
          <Card className="p-10 text-center text-gray-600">
            <p>No brand content yet.</p>
            <p className="text-sm text-gray-500 mt-1">
              Complete your profile to get discovered and start receiving
              opportunities.
            </p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contentItems.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                {item.thumbnail_url ? (
                  <img
                    src={item.thumbnail_url}
                    alt={item.title || "Content"}
                    className="w-full h-40 object-cover"
                  />
                ) : null}
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-gray-900 truncate">
                      {item.title || "Untitled Content"}
                    </div>
                    {item.platform && (
                      <Badge className="bg-gray-100 text-gray-700 border border-gray-300">
                        {item.platform}
                      </Badge>
                    )}
                  </div>
                  {item.published_at && (
                    <div className="text-xs text-gray-500 mt-1">
                      Published{" "}
                      {new Date(item.published_at).toLocaleDateString()}
                    </div>
                  )}
                  {item.url && (
                    <Button
                      asChild
                      variant="outline"
                      className="w-full mt-3 border-2 border-gray-300"
                    >
                      <a href={item.url} target="_blank" rel="noreferrer">
                        Open
                      </a>
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  const handlePhotosUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setUploading(true);
      setTimeout(() => {
        const newPhotos = files.map((file) => ({
          url: URL.createObjectURL(file),
          name: file.name,
        }));
        setPhotos([...photos, ...newPhotos]);
        setUploading(false);
        alert(`${files.length} photo(s) uploaded! `);
      }, 1000);
    }
  };

  const handleDeletePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!user?.id) {
        alert("You must be logged in to upload a photo.");
        return;
      }
      if (file.size > 5_000_000) {
        alert("Please upload an image of 5 MB or less.");
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
        const res = await fetch(
          `${API_BASE}/api/profile/photo-upload?user_id=${encodeURIComponent(
            user.id,
          )}`,
          {
            method: "POST",
            headers: { "content-type": file.type || "image/jpeg" },
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

        alert("Profile photo updated!");
      } catch (err: any) {
        alert(`Upload failed: ${err.message}`);
        // Revert optimistic update on error by refreshing dashboard
        try {
          const profileRes = await fetch(
            `${API_BASE}/api/dashboard?user_id=${encodeURIComponent(user.id)}`,
            { cache: "no-cache" },
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      let options = { mimeType: "audio/webm" };
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        options = { mimeType: "audio/webm;codecs=opus" };
      }

      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const mimeType = mediaRecorderRef.current.mimeType;
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
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

      mediaRecorderRef.current.start();
      setIsRecording(true);

      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRecordingTime(elapsed);

        const script = VOICE_SCRIPTS[selectedEmotion];
        const words = script.split(" ");
        const wordsPerSecond = words.length / 60;
        const wordIndex = Math.min(
          Math.floor(elapsed * wordsPerSecond),
          words.length - 1,
        );
        setCurrentWord(wordIndex);

        if (elapsed >= 60) {
          stopRecording();
        }
      }, 100);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Failed to access microphone. Please check permissions.");
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
    if (!confirm("Delete this recording?")) return;
    const rec = voiceLibrary.find((r) => r.id === id);
    setVoiceLibrary(voiceLibrary.filter((r) => r.id !== id));
    try {
      // If it exists on server, delete there too
      const sid = rec?.server_recording_id || rec?.id;
      if (sid) {
        await fetch(
          `${API_BASE}/api/voice/recordings/${encodeURIComponent(sid)}`,
          {
            method: "DELETE",
          },
        );
      }
    } catch (_) {
      // best-effort
    }
  };

  const createVoiceProfile = async (recording) => {
    try {
      setGeneratingVoice(true);

      const ct = recording?.mimeType || recording?.blob?.type || "audio/webm";

      // 1) Upload recording to Likelee server (private bucket)
      const uploadRes = await fetch(
        `${API_BASE}/api/voice/recordings?user_id=${encodeURIComponent(
          user.id,
        )}&emotion_tag=${encodeURIComponent(recording.emotion || "")}`,
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
      const cloneRes = await fetch(`${API_BASE}/api/voice/models/clone`, {
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

      alert("Voice profile created successfully with ElevenLabs!");
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

      alert(
        `Error: ${errorMessage}\n\nPossible issues:\n• Recording quality too low\n• File format not supported by ElevenLabs\n• Recording too short (need 30+ seconds)\n• Try re-recording with better audio`,
      );
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
              className={`inline-block mx-1 transition-all duration-300 ${index === currentWord
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
    alert("Campaign approved! Contract signed! (Demo mode)");
  };

  const handleDecline = (approvalId) => {
    setPendingApprovals(pendingApprovals.filter((a) => a.id !== approvalId));
    setShowApprovalContract(null);
    alert("Campaign declined! (Demo mode)");
  };

  const handlePauseLicense = (contract, immediate) => {
    const option = immediate ? "immediate" : "next_month";
    setPauseOption(option);
    setShowPauseModal(false);
    alert(
      `License ${option === "immediate" ? "paused immediately" : "scheduled to pause next month"}! (Demo mode)\n\n${option === "immediate" ? "You will forfeit this month's payment." : "You'll receive full payment for this month, pause starts next month."}`,
    );
  };

  const handleRevokeLicense = (contract) => {
    setShowRevokeModal(false);
    alert(
      `License revoked! (Demo mode)\n\n30-day notice period has begun.\nYou'll receive final payment of $${contract.creator_earnings} on the notice expiration date.`,
    );
  };

  const handlePauseCampaign = (campaignId) => {
    setActiveCampaigns(
      activeCampaigns.map((c) =>
        c.id === campaignId ? { ...c, status: "paused" } : c,
      ),
    );
    alert("Campaign paused! (Demo mode)");
  };

  const handleRevokeCampaign = (campaignId) => {
    if (confirm("Are you sure you want to revoke this campaign license?")) {
      setActiveCampaigns(activeCampaigns.filter((c) => c.id !== campaignId));
      alert("Campaign revoked! (Demo mode)");
    }
  };

  const handleToggleContentType = (type) => {
    const current = creator.content_types || [];
    if (current.includes(type)) {
      setCreator({
        ...creator,
        content_types: current.filter((t) => t !== type),
      });
    } else {
      setCreator({ ...creator, content_types: [...current, type] });
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

  // Content Restrictions Helper Functions
  const addRestriction = (restriction: string) => {
    setContentRestrictions([...contentRestrictions, restriction]);
    setAvailableRestrictions(
      availableRestrictions.filter((r) => r !== restriction),
    );
  };

  const removeRestriction = (restriction: string) => {
    setContentRestrictions(
      contentRestrictions.filter((r) => r !== restriction),
    );
    // Only add back to available if it was originally in the predefined list
    const predefinedRestrictions = [
      "Alcohol",
      "Weapons/Firearms",
      "Cryptocurrency/NFT",
      "MLM/Multi-Level Marketing",
      "Unlicensed Financial Products",
      "Health/Medical Claims",
    ];
    if (predefinedRestrictions.includes(restriction)) {
      setAvailableRestrictions([...availableRestrictions, restriction]);
    }
  };

  const addCustomRestriction = () => {
    if (customRestriction.trim() && customRestriction.length <= 25) {
      setContentRestrictions([
        ...contentRestrictions,
        customRestriction.trim(),
      ]);
      setCustomRestriction("");
    }
  };

  const addBrandExclusivity = () => {
    if (newBrand.trim() && newBrand.length <= 25) {
      setBrandExclusivity([...brandExclusivity, newBrand.trim()]);
      setNewBrand("");
    }
  };

  const removeBrandExclusivity = (brand: string) => {
    setBrandExclusivity(brandExclusivity.filter((b) => b !== brand));
  };

  const handleSaveRestrictions = async () => {
    if (!user) return;

    // Save restrictions to backend
    const profileData = {
      email: creator.email || user.email,
      content_restrictions: contentRestrictions,
      brand_exclusivity: brandExclusivity,
    };

    try {
      const res = await fetch(`${API_BASE}/api/profile?user_id=${user.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });

      if (!res.ok) {
        throw new Error("Failed to save restrictions");
      }

      setShowRestrictionsModal(false);
    } catch (e) {
      console.error("Error saving restrictions:", e);
      alert("Failed to save restrictions. Please try again.");
    }
  };

  const handleSaveRules = async (creatorOverride?: any) => {
    setSavingRules(true);
    try {
      // Use override if provided, otherwise use current state
      const dataToSave = creatorOverride || creator;

      const profileData = {
        email: dataToSave.email || user.email,
        content_types: dataToSave.content_types,
        industries: dataToSave.industries,
        price_per_week: dataToSave.price_per_week,
        accept_negotiations: dataToSave.accept_negotiations,
        content_restrictions: contentRestrictions,
        brand_exclusivity: brandExclusivity,
        base_monthly_price_cents: dataToSave.base_monthly_price_cents,
      };

      console.log("Saving profile with data:", {
        content_types: profileData.content_types,
        industries: profileData.industries,
        email: profileData.email,
        price_per_week: creator.price_per_week,
        base_monthly_price_cents: profileData.base_monthly_price_cents,
      });

      try {
        const res = await fetch(`${API_BASE}/api/profile?user_id=${user.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profileData),
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error("Save failed:", errorText);
          throw new Error(`Server error: ${errorText}`);
        }

        const responseData = await res.json();
        console.log("Save response:", responseData);

        // Update creator state with the saved data from the response
        if (Array.isArray(responseData) && responseData.length > 0) {
          const savedProfile = responseData[0];
          setCreator((prev) => ({
            ...prev,
            content_types: savedProfile.content_types || [],
            industries: savedProfile.industries || [],
            base_monthly_price_cents: savedProfile.base_monthly_price_cents,
            price_per_week: savedProfile.base_monthly_price_cents
              ? Math.round(savedProfile.base_monthly_price_cents / 100 / 4)
              : prev.price_per_week,
          }));
        }

        setEditingRules(false);
        alert("Licensing preferences updated!");
      } catch (error: any) {
        console.error("Failed to save rules:", error);
        alert(`Failed to save preferences: ${error?.message || error}`);
      }
    } catch (e) {
      console.error("Unexpected error in handleSaveRules:", e);
    } finally {
      setSavingRules(false);
    }
  };

  const handleSaveProfile = () => {
    alert("Profile updated! (Demo mode)");
  };

  const renderDashboard = () => {
    const imagesFilled = Object.values(referenceImages).filter(
      (img) => img !== null,
    ).length;
    const imagesTotal = IMAGE_SECTIONS.length;
    const cameoPresent = !!heroMedia;
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">
                Total Monthly Revenue
              </p>
              <DollarSign className="w-5 h-5 text-[#32C8D1]" />
            </div>
            <p className="text-4xl font-bold text-gray-900">
              ${totalMonthlyRevenue.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Your revenue will appear here once your first license activates
            </p>
          </Card>
          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">
                Active Campaigns
              </p>
              <Target className="w-5 h-5 text-[#32C8D1]" />
            </div>
            <p className="text-4xl font-bold text-gray-900">
              {activeCampaigns.length}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Ready for your first deal? Complete your profile below to get
              discovered
            </p>
          </Card>
          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">
                Pending Approvals
              </p>
              <AlertCircle className="w-5 h-5 text-gray-500" />
            </div>
            <p className="text-4xl font-bold text-gray-900">{pendingCount}</p>
            <p className="text-sm text-gray-600 mt-1">
              Brands are waiting to see your complete profile
            </p>
          </Card>
          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">
                Annual Run Rate
              </p>
              <TrendingUp className="w-5 h-5 text-[#32C8D1]" />
            </div>
            <p className="text-4xl font-bold text-gray-900">
              ${annualRunRate.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Based on active licenses
            </p>
          </Card>
        </div>

        <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
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
                Priority
              </Badge>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Complete Your Profile
            </h3>
            <p className="text-sm text-gray-600">
              Add reference images and your cameo video to get discovered by
              brands
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
              Upload Your First Voice Tone
            </h3>
            <p className="text-sm text-gray-600">
              Strengthen your profile with voice recordings
            </p>
          </Card>
        </div>

        <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
        {activeCampaigns.length === 0 ? (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-blue-900">
                <strong>Preview Examples:</strong> These are sample campaigns to
                show you what opportunities look like. Complete your profile to
                start receiving real brand deals!
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
                        Active
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
            <p>Your campaign activity will show here once licenses activate</p>
            <p className="text-sm text-gray-500 mt-1">
              Complete your profile to start receiving brand opportunities
            </p>
          </Card>
        )}

        <Card className="p-4 md:p-5 bg-white border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Profile Status</h3>
            <Badge className="bg-[#32C8D1] text-white">
              Complete to Get Discovered During Pilot
            </Badge>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {/* Reference Images */}
            <div className="p-5 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-600" />
                <span>Reference Images</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {imagesFilled}/{imagesTotal}
              </div>
              <Progress
                value={Math.round((imagesFilled / imagesTotal) * 100)}
                className="h-2 mt-3 bg-gray-200"
              />
            </div>

            {/* Voice Recordings */}
            <div className="p-5 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                <Mic className="w-4 h-4 text-purple-600" />
                <span>Voice Recordings</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {voiceLibrary.length}/6
              </div>
              <Progress
                value={Math.min(voiceLibrary.length * (100 / 6), 100)}
                className="h-2 mt-3 bg-gray-200"
              />
            </div>

            {/* Cameo Video */}
            <div className="p-5 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <Video className="w-4 h-4 text-orange-600" />
                  <span>Cameo Video</span>
                </div>
                {!cameoPresent && (
                  <span className="text-xs bg-red-100 text-red-700 border border-red-300 rounded px-2 py-0.5">
                    Missing
                  </span>
                )}
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {cameoPresent ? 1 : 0}/1
              </div>
              <Progress
                value={cameoPresent ? 100 : 0}
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
        alert("Please log in to upload.");
        return;
      }
      const file: File = previewImage.file;
      if (!file) {
        alert("No file selected.");
        return;
      }
      // Server pre-scan is limited to 5MB
      if (file.size > 5_000_000) {
        alert("Please upload an image ≤ 5MB.");
        return;
      }

      setUploadingToSection(true);

      // Upload via backend (Option B: server-only writes)
      const apiBase =
        (import.meta as any).env.VITE_API_BASE_URL ||
        (import.meta as any).env.VITE_API_BASE ||
        "http://localhost:8787";
      const buf = await file.arrayBuffer();
      const res = await fetch(
        `${apiBase}/api/reference-images/upload?user_id=${encodeURIComponent(user.id)}&section_id=${encodeURIComponent(selectedImageSection)}`,
        {
          method: "POST",
          headers: { "content-type": file.type || "image/jpeg" },
          body: new Uint8Array(buf),
        },
      );
      if (!res.ok) {
        const raw = await res.text();
        try {
          const err = JSON.parse(raw);
          const msg: string = err?.message || "Upload failed";
          const reasons: string[] = Array.isArray(err?.reasons)
            ? err.reasons
            : [];
          alert(
            `${msg}${reasons.length ? "\n\nDetails:\n- " + reasons.join("\n- ") : ""}`,
          );
        } catch {
          alert(raw || "Upload failed");
        }
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
      alert("Reference image uploaded!");
    } catch (e: any) {
      alert(`Upload failed: ${e?.message || e}`);
    } finally {
      setUploadingToSection(false);
    }
  };

  const deleteReferenceImage = (sectionId) => {
    if (confirm("Delete this reference image?")) {
      setReferenceImages({
        ...referenceImages,
        [sectionId]: null,
      });
    }
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
            <h2 className="text-3xl font-bold text-gray-900">My Likeness</h2>
            <p className="text-gray-600 mt-1">
              Your complete likeness profile - used by brands to generate
              content
            </p>
          </div>
        </div>

        {/* Completeness Card */}
        <Card className="p-6 bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-[#32C8D1]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Profile Completeness: {completeness.percentage}%
              </h3>
              <p className="text-gray-700">
                You're missing {IMAGE_SECTIONS.length - completeness.filled}{" "}
                sections
              </p>
            </div>
          </div>
          <Progress value={completeness.percentage} className="h-3 mb-3" />
          <div className="bg-white border border-blue-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-blue-900">
              <strong>Complete profiles earn 15% more.</strong> Brands pay
              premium rates for creators with full reference libraries.
            </p>
          </div>
        </Card>

        {/* MY CAMEO Section - NOW FIRST */}
        <Card className="p-6 bg-white border border-gray-200">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">MY CAMEO</h3>
            <p className="text-gray-600">
              The video representation of you - brands use this for AI cameos
              and content generation
            </p>
          </div>

          {heroMedia ? (
            <div className="space-y-4">
              <Card className="p-4 bg-green-50 border border-green-200">
                <div className="grid md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1">Uploaded:</p>
                    <p className="font-bold text-gray-900">Nov 12, 2024</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Duration:</p>
                    <p className="font-bold text-gray-900">45 seconds</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Quality:</p>
                    <p className="font-bold text-gray-900">4K</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Status:</p>
                    <Badge className="bg-green-500 text-white">
                      ✓ Verified & Approved
                    </Badge>
                  </div>
                </div>
              </Card>

              <div className="relative">
                {heroMedia.type === "video" ? (
                  <video
                    src={heroMedia.url}
                    controls
                    className="w-full h-96 object-cover border-2 border-gray-200 rounded-lg"
                  />
                ) : (
                  <img
                    src={heroMedia.url}
                    alt="Hero media"
                    className="w-full h-96 object-cover border-2 border-gray-200 rounded-lg"
                  />
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-blue-900 text-sm">
                  <strong>About Your Cameo:</strong> Brands use this to generate
                  AI cameos of you speaking, reference your voice/expressions,
                  and create photorealistic content featuring you.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-2 border-gray-300"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Watch Full Cameo
                </Button>
                <Button
                  onClick={() => setShowReuploadCameoModal(true)}
                  variant="outline"
                  className="flex-1 border-2 border-[#32C8D1] text-[#32C8D1]"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Re-upload New Cameo
                </Button>
                <Button variant="outline" className="border-2 border-gray-300">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Coming Soon Upload Box */}
              <div className="border-2 border-dashed border-cyan-400 rounded-lg p-16 text-center bg-white">
                <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Coming Soon
                </p>
                <p className="text-sm text-gray-600">
                  Cameo video upload will be available soon
                </p>
              </div>

              {/* Yellow Warning Alert */}
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-amber-900 text-sm">
                  <strong>Your cameo is required to start earning.</strong>{" "}
                  Brands need this video reference to create content featuring
                  you.
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* REFERENCE IMAGE LIBRARY */}
        <Card className="p-6 bg-white border border-gray-200">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              REFERENCE IMAGE LIBRARY
            </h3>
            <p className="text-gray-600 mb-4">
              Brands use these to match your appearance across different
              contexts
            </p>
            <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div>
                <p className="font-bold text-gray-900 text-lg">
                  Completeness: {completeness.filled}/{completeness.total}{" "}
                  sections filled
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {IMAGE_SECTIONS.length - completeness.filled} sections needed
                  for "Complete Profile"
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
              <strong>How This Works:</strong> Upload photos in 15 different
              categories. Brands use these to generate images of you that look
              consistent and photorealistic. More variety = better quality
              content = higher rates.
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
                            <strong>Best For:</strong> {section.bestFor}
                          </p>
                          <Badge
                            variant="outline"
                            className={
                              hasImage
                                ? "bg-green-500 text-white"
                                : "bg-gray-300 text-gray-700"
                            }
                          >
                            {hasImage ? "UPLOADED" : "MISSING"}
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

                      <div className="flex gap-2">
                        {hasImage ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-2 border-gray-300"
                              onClick={() =>
                                window.open(hasImage.url, "_blank")
                              }
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-2 border-[#32C8D1] text-[#32C8D1]"
                              onClick={() =>
                                handleImageSectionUpload(section.id)
                              }
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Replace
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-2 border-red-300 text-red-600"
                              onClick={() => deleteReferenceImage(section.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </Button>
                          </>
                        ) : (
                          <Button
                            onClick={() => handleImageSectionUpload(section.id)}
                            className="bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Image
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
          <div className="mt-6 bg-amber-50 border border-amber-200">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <p className="text-amber-900">
              <strong>Quality Standards:</strong> High-resolution (minimum
              1080x1080), clear lighting, face/body clearly visible, no heavy
              filters, professional quality preferred.
            </p>
          </div>
        </Card>

        {/* Content Guidelines */}
        <Card className="p-6 bg-white border border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            USAGE GUIDELINES
          </h3>
          <p className="text-gray-600 mb-6">
            Tell brands what you're comfortable with
          </p>

          <div className="space-y-6">
            <div>
              <Label className="text-lg font-semibold text-gray-900 block mb-3">
                Comfortable With:
              </Label>
              <div className="flex flex-wrap gap-2">
                {contentPreferences.comfortable.map((item) => (
                  <Badge
                    key={item}
                    variant="outline"
                    className="bg-green-100 text-green-700 border border-green-300 px-3 py-2"
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-lg font-semibold text-gray-900 block mb-3">
                Not Comfortable With:
              </Label>
              <div className="flex flex-wrap gap-2">
                {contentPreferences.not_comfortable.map((item) => (
                  <Badge
                    key={item}
                    variant="outline"
                    className="bg-red-100 text-red-700 border border-red-300 px-3 py-2"
                  >
                    ✗ {item}
                  </Badge>
                ))}
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full border-2 border-gray-300"
            >
              <Settings className="w-4 h-4 mr-2" />
              Edit Preferences
            </Button>
          </div>
        </Card>

        {/* Verification Status */}
        <Card className="p-6 bg-white border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Verification & Status
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
                  Identity Verification
                </span>
              </div>
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
                  ? creator.kyc_status.charAt(0).toUpperCase() +
                  creator.kyc_status.slice(1)
                  : "Not started"}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-[#32C8D1]" />
                <span className="font-medium text-gray-900">
                  Likeness Rights
                </span>
              </div>
              <Badge variant="outline" className="bg-green-100 text-green-700">
                Confirmed
              </Badge>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={startVerificationFromDashboard}
                disabled={kycLoading}
                variant="outline"
                className="border-2 border-gray-300"
              >
                {kycLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4 mr-2" />
                )}
                Complete Verification
              </Button>
              <Button
                onClick={refreshVerificationFromDashboard}
                disabled={kycLoading}
                variant="outline"
                className="border-2 border-gray-300"
              >
                {kycLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Refresh Status
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
            Voice & Recordings
          </h2>
          <p className="text-gray-600 mt-1">
            Build your voice library for different emotions and tones
          </p>
        </div>
        <Badge
          variant="outline"
          className="bg-purple-100 text-purple-700 border border-purple-300 px-4 py-2 text-lg"
        >
          {voiceLibrary.length} Voice{voiceLibrary.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Voice Overview Card */}
      {voiceLibrary.length > 0 && (
        <Card className="p-6 bg-white border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Voice Profile Overview
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Total Recordings</p>
              <p className="text-3xl font-bold text-gray-900">
                {voiceLibrary.length}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">ElevenLabs Profiles</p>
              <p className="text-3xl font-bold text-gray-900">
                {voiceLibrary.filter((v) => v.voiceProfileCreated).length}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Total Usage</p>
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
          Record New Voice Sample
        </h3>
        <p className="text-gray-600 mb-6">
          Record samples with different emotions to create a versatile voice
          profile
        </p>

        <div className="grid md:grid-cols-3 gap-4">
          {Object.keys(VOICE_SCRIPTS).map((emotion) => {
            const hasRecording = voiceLibrary.find(
              (r) => r.emotion === emotion,
            );
            return (
              <Card
                key={emotion}
                className={`p-6 border-2 cursor-pointer transition-all hover:shadow-lg ${hasRecording
                    ? "border-green-300 bg-green-50"
                    : "border-gray-200 hover:border-[#32C8D1]"
                  }`}
                onClick={() => handleEmotionSelect(emotion)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${hasRecording ? "bg-green-500" : "bg-[#32C8D1]"
                      }`}
                  >
                    <Mic className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 capitalize text-lg">
                      {emotion}
                    </h4>
                    <p className="text-xs text-gray-500">~60 seconds</p>
                  </div>
                </div>
                {hasRecording && (
                  <Badge className="bg-green-500 text-white">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Recorded
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
            Voice Library
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
                      className={`w-14 h-14 rounded-full flex items-center justify-center ${recording.accessible ? "bg-green-500" : "bg-gray-400"
                        }`}
                    >
                      <Mic className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 capitalize text-xl">
                        {recording.emotion}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {new Date(recording.date).toLocaleDateString()} •{" "}
                        {recording.duration}s • Used {recording.usageCount || 0}{" "}
                        times
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {recording.voiceProfileCreated && (
                      <Badge className="bg-purple-100 text-purple-700 border border-purple-300">
                        ElevenLabs Ready
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
                      Re-record
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
                        Creating Voice Profile...
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Create Voice Profile with ElevenLabs
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
          <strong>Voice Training Tips:</strong> Speak clearly, avoid background
          noise, record in a quiet room, and maintain consistent volume
          throughout the recording.
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
              Active Campaigns
            </h2>
            <p className="text-gray-600 mt-1">
              Track and manage your licensing agreements
            </p>
          </div>
          <Badge
            className={`${activeCampaigns.length === 0
                ? "bg-orange-100 text-orange-700 border border-orange-300"
                : "bg-green-100 text-green-700 border border-green-300"
              } px-4 py-2 text-lg`}
          >
            {activeCampaigns.length} Active
          </Badge>
        </div>

        {/* Welcome message for blank users showing examples */}
        {showingExamples && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-blue-900">
              <strong>Welcome to your Active Campaigns!</strong> This is an
              example of what your campaigns will look like. You don't have any
              active campaigns yet — but when brands start working with you,
              they'll appear here!
            </p>
          </div>
        )}

        {/* Campaigns Table */}
        <Card className="p-6 bg-white border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-4 px-4 font-bold text-gray-900">
                    Brand
                  </th>
                  <th className="text-left py-4 px-4 font-bold text-gray-900">
                    Usage Type
                  </th>
                  <th className="text-left py-4 px-4 font-bold text-gray-900">
                    Rate
                  </th>
                  <th className="text-left py-4 px-4 font-bold text-gray-900">
                    Active Until
                  </th>
                  <th className="text-left py-4 px-4 font-bold text-gray-900">
                    Status
                  </th>
                  <th className="text-left py-4 px-4 font-bold text-gray-900">
                    This Month
                  </th>
                  <th className="text-left py-4 px-4 font-bold text-gray-900">
                    Actions
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
                          Auto-Renew
                        </Badge>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <Badge
                        className={`${campaign.status === "active"
                            ? "bg-green-100 text-green-700 border border-green-300"
                            : campaign.status === "expiring_soon"
                              ? "bg-orange-100 text-orange-700 border border-orange-300"
                              : "bg-gray-100 text-gray-700 border border-gray-300"
                          }`}
                      >
                        {campaign.status === "active"
                          ? "Active"
                          : campaign.status === "expiring_soon"
                            ? "Expiring Soon"
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
                          Revoke
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

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
                  {campaign.status === "active" ? "Active" : "Expiring Soon"}
                </Badge>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly Rate:</span>
                  <span className="font-bold text-gray-900">
                    ${campaign.rate.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Until:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(campaign.active_until).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Regions:</span>
                  <span className="font-medium text-gray-900">
                    {campaign.regions.join(", ")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Weekly Impressions:</span>
                  <span className="font-medium text-gray-900">
                    {campaign.impressions_week.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button variant="outline" className="flex-1">
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-red-600 hover:bg-red-50"
                  onClick={() => handleRevokeCampaign(campaign.id)}
                >
                  Revoke
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Rights Expiration Calendar */}
        <div className="bg-blue-50 border border-blue-200">
          <Calendar className="h-5 w-5 text-blue-600" />
          <p className="text-blue-900">
            <strong>Your consent required for all uses.</strong>{" "}
            {activeCampaigns.length} active campaigns, all time-limited, all
            approved by you. You can pause/revoke anytime.
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
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => setShowApprovalContract(null)}
              className="border-2 border-gray-300"
            >
              ← Back to Queue
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {approval.brand} - Contract Review
              </h1>
              <p className="text-gray-600">Review terms before approving</p>
            </div>
          </div>

          {/* What You're Earning */}
          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              What You'll Earn
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-gray-700 mb-2">Your Monthly Payment:</p>
                <p className="text-5xl font-bold text-green-600">
                  ${approval.proposed_rate}
                </p>
              </div>
              <div>
                <p className="text-gray-700 mb-2">
                  If you keep this for {approval.term_length}:
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  $
                  {approval.term_length === "Perpetual"
                    ? "Ongoing"
                    : approval.proposed_rate * parseInt(approval.term_length)}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Total estimated earnings
                </p>
              </div>
            </div>
          </Card>

          {/* Contract Terms */}
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              Contract Terms
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Duration:</p>
                  <p className="font-bold text-gray-900 text-lg">
                    {approval.term_length}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Territory:</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {approval.regions.map((region) => (
                      <Badge key={region} className="bg-blue-100 text-blue-700">
                        {region}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Usage Type:</p>
                  <p className="font-bold text-gray-900 text-lg">
                    {approval.usage_type}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Industries:</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {approval.industries.map((industry) => (
                      <Badge
                        key={industry}
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
              Your Rights & Protections
            </h3>
            <div className="space-y-3 text-gray-900">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <p>
                  You can pause this license anytime (temporarily stop usage)
                </p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <p>You can revoke with 30 days notice (permanently end)</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <p>License expires on a specific date (not forever)</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <p>
                  Payment protected in escrow until brand approves deliverables
                </p>
              </div>
            </div>
          </Card>

          {approval.perpetual && (
            <div className="bg-red-50 border-2 border-red-400">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-900">
                <strong>⚠️ Perpetual Use Warning:</strong> This brand wants to
                use your likeness forever. You should negotiate for time-limited
                terms (6 months, 1 year) instead.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => handleDecline(approval.id)}
              variant="outline"
              className="flex-1 h-14 border-2 border-gray-300"
            >
              <XCircle className="w-5 h-5 mr-2" />
              Decline
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-14 border-2 border-[#32C8D1] text-[#32C8D1]"
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              Counter Offer
            </Button>
            <Button
              onClick={() => handleApprove(approval.id)}
              className="flex-1 h-14 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Accept & Sign
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
            <h2 className="text-3xl font-bold text-gray-900">Approval Queue</h2>
            <p className="text-gray-600 mt-1">
              Review and approve licensing requests
            </p>
          </div>
          <Badge
            className={`${pendingCount > 0 ? "bg-yellow-100 text-yellow-700 border border-yellow-300" : "bg-gray-100 text-gray-700 border border-gray-300"} px-4 py-2 text-lg`}
          >
            {pendingCount} Pending
          </Badge>
        </div>

        {/* Welcome banner for blank users showing examples */}
        {showingExamples && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-blue-900">
              <strong>Welcome to your Approval Queue!</strong> This is an
              example of what brand requests will look like. You don't have any
              pending approvals yet — but when brands want to work with you,
              their requests will appear here!
            </p>
          </div>
        )}

        <div className="space-y-6">
          {approvalsToShow.map((approval) => (
            <Card
              key={approval.id}
              className={`p-6 bg-white border-2 ${approval.perpetual ? "border-red-400" : "border-blue-400"}`}
            >
              <div className="flex items-start justify-between mb-6">
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
                      Requested{" "}
                      {new Date(approval.requested_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {approval.perpetual && (
                  <Badge className="bg-red-500 text-white">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    Perpetual Request
                  </Badge>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">
                      Proposed Rate:
                    </span>
                    <span className="font-bold text-gray-900 text-lg">
                      ${approval.proposed_rate}/month
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Term Length:</span>
                    <span className="font-bold text-gray-900">
                      {approval.term_length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">
                      Estimated Monthly:
                    </span>
                    <span className="font-bold text-green-600 text-lg">
                      ${approval.proposed_rate}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Regions:</p>
                    <div className="flex flex-wrap gap-2">
                      {approval.regions.map((region) => (
                        <Badge
                          key={region}
                          className="bg-blue-100 text-blue-700 border border-blue-300"
                        >
                          {region}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Industries:</p>
                    <div className="flex flex-wrap gap-2">
                      {approval.industries.map((industry) => (
                        <Badge
                          key={industry}
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
                <div className="mb-6 bg-red-50 border-2 border-red-300">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <p className="text-red-900">
                    <strong>Warning:</strong> This is a perpetual-use request.
                    You would give up long-term control of your likeness for
                    this campaign. Consider negotiating for time-limited terms
                    instead.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowApprovalContract(approval.id)}
                  variant="outline"
                  className="flex-1 h-12 border-2 border-blue-300 text-blue-600"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  View Contract
                </Button>
                <Button
                  onClick={() => handleDecline(approval.id)}
                  variant="outline"
                  className="h-12 border-2 border-gray-300"
                >
                  <XCircle className="w-5 h-5 mr-2" />
                  Decline
                </Button>
                <Button
                  variant="outline"
                  className="h-12 border-2 border-[#32C8D1] text-[#32C8D1]"
                >
                  Counter Offer
                </Button>
                <Button
                  onClick={() => handleApprove(approval.id)}
                  className="h-12 bg-green-600 hover:bg-green-700 text-white px-8"
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Accept & Sign
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
              Campaign Archive
            </h2>
            <p className="text-gray-600 mt-1">
              View your completed campaigns and manage portfolio visibility
            </p>
          </div>
          <Badge className="bg-gray-100 text-gray-700 border border-gray-300 px-4 py-2 text-lg">
            {archivedCampaigns.length} Completed
          </Badge>
        </div>

        {/* Welcome banner for blank users showing examples */}
        {showingExamples && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-blue-900">
              <strong>Welcome to your Campaign Archive!</strong> This is an
              example of what your completed campaigns will look like. You don't
              have any archived campaigns yet — but when you do, they'll appear
              here just like this!
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
                      Completed {campaign.completed_date}
                    </p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-700 border border-green-300">
                  Completed
                </Badge>
              </div>

              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Duration:</p>
                  <p className="font-bold text-gray-900">{campaign.duration}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Monthly Rate:</p>
                  <p className="font-bold text-gray-900">
                    ${campaign.monthly_rate}
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Total Earned:</p>
                  <p className="font-bold text-green-600 text-lg">
                    ${campaign.total_earned.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Regions:</p>
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
                        alert(
                          "This is an example campaign. In the real app, toggling this would update your portfolio visibility settings.",
                        );
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
                      Show on Portfolio
                    </p>
                    <p className="text-sm text-gray-600">
                      {campaign.show_on_portfolio
                        ? "Visible to brands viewing your profile"
                        : "Hidden from public portfolio"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="border-2 border-gray-300"
                  disabled={campaign.isExample}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
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
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowContractDetails(false);
                setSelectedContract(null);
              }}
              className="border-2 border-gray-300"
            >
              ← Back to Contracts
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {contract.brand}
              </h1>
              <p className="text-gray-600">{contract.project_name}</p>
            </div>
          </div>

          {/* What You're Earning */}
          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              What You're Earning
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <p className="text-gray-700 mb-2">Monthly Payment:</p>
                <p className="text-4xl font-bold text-green-600">
                  ${contract.creator_earnings}
                </p>
              </div>
              <div>
                <p className="text-gray-700 mb-2">Total Earned So Far:</p>
                <p className="text-3xl font-bold text-gray-900">
                  ${contract.earnings_to_date.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-gray-700 mb-2">Payment Status:</p>
                <Badge className="bg-green-500 text-white text-lg">
                  ✓ Paid
                </Badge>
                <p className="text-sm text-gray-600 mt-2">
                  ${contract.amount_paid} received
                </p>
              </div>
            </div>
          </Card>

          {/* Timeline */}
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              Your Timeline
            </h3>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="text-center flex-1">
                  <p className="text-sm text-gray-600 mb-1">Started</p>
                  <p className="font-bold text-gray-900">
                    {new Date(contract.effective_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-sm text-gray-600 mb-1">Today</p>
                  <div className="w-4 h-4 bg-[#32C8D1] rounded-full mx-auto"></div>
                </div>
                <div className="text-center flex-1">
                  <p className="text-sm text-gray-600 mb-1">Expires</p>
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
                {contract.days_remaining} days remaining
              </p>
            </div>
            {contract.auto_renew && (
              <div className="mt-4 bg-blue-50 border border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <p className="text-blue-900 text-sm">
                  <strong>Auto-Renewal Enabled:</strong> After expiration, you
                  can decide whether to renew on new terms.
                </p>
              </div>
            )}
          </Card>

          {/* How Your Likeness Is Being Used */}
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              How Your Likeness Is Being Used
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  What They're Using:
                </p>
                <p className="text-gray-900">{contract.deliverables}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Where They Can Use It:
                </p>
                <p className="text-gray-900 mb-2">
                  <strong>Territory:</strong> {contract.territory}
                </p>
                <p className="text-gray-900">
                  <strong>Channels:</strong> {contract.channels.join(", ")}
                </p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm font-semibold text-red-700 mb-2">
                  What They CAN'T Do:
                </p>
                <p className="text-red-900">{contract.prohibited_uses}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Revisions:
                </p>
                <p className="text-gray-900">
                  {contract.revisions} rounds included
                </p>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              Manage This License
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
                Pause License
              </Button>
              <Button
                onClick={() => {
                  setShowRevokeModal(true);
                }}
                variant="outline"
                className="h-12 border-2 border-red-300 text-red-600 hover:bg-red-50"
              >
                <XCircle className="w-5 h-5 mr-2" />
                Revoke (30-day notice)
              </Button>
              <Button
                variant="outline"
                className="h-12 border-2 border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                Message Brand
              </Button>
              <Button
                variant="outline"
                className="h-12 border-2 border-gray-300"
              >
                <FileText className="w-5 h-5 mr-2" />
                View Full Legal Contract
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
              Licenses & Contracts
            </h2>
            <p className="text-gray-600 mt-1">
              Track all your licensing deals and earnings
            </p>
          </div>
        </div>

        {/* Welcome banner for blank users showing examples */}
        {showingExamples && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-blue-900">
              <strong>Welcome to your Licenses & Contracts!</strong> This is an
              example of what your active licensing deals will look like. You
              don't have any contracts yet — but when brands approve your work,
              they'll appear here just like this!
            </p>
          </div>
        )}

        {/* Contract Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setContractsTab("active")}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${contractsTab === "active"
                ? "border-[#32C8D1] text-[#32C8D1]"
                : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
          >
            Active ({activeContracts.length})
          </button>
          <button
            onClick={() => setContractsTab("expired")}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${contractsTab === "expired"
                ? "border-[#32C8D1] text-[#32C8D1]"
                : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
          >
            Expired ({expiredContracts.length})
          </button>
        </div>

        {/* Active Contracts */}
        {contractsTab === "active" && (
          <div className="space-y-4">
            {activeContracts.map((contract) => (
              <Card
                key={contract.id}
                className={`p-6 bg-white border-2 ${contract.status === "expiring_soon"
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
                    {contract.status === "active"
                      ? "✓ Active & Earning"
                      : "⏳ Expiring Soon"}
                  </Badge>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-gray-600 mb-1">
                      Your Monthly Fee:
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      ${contract.creator_earnings}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">
                      Earned to Date:
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${contract.earnings_to_date.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">
                      Days Remaining:
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {contract.days_remaining}
                    </p>
                  </div>
                </div>

                {contract.status === "expiring_soon" && (
                  <div className="mb-4 bg-orange-50 border-2 border-orange-300">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <p className="text-orange-900">
                      <strong>
                        Expiring in {contract.days_remaining} days!
                      </strong>{" "}
                      Would you like to renew this license?
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
                    View Details
                  </Button>
                  {contract.status === "expiring_soon" && (
                    <Button className="bg-green-600 hover:bg-green-700 text-white">
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Renew
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
              No Expired Contracts
            </h3>
            <p className="text-gray-600">
              Completed contracts will appear here
            </p>
          </Card>
        )}
      </div>
    );
  };

  const renderEarnings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            Earnings Dashboard
          </h2>
          <p className="text-gray-600 mt-1">Track your revenue and payments</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-md px-4 py-2 flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Cash Out
        </Button>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-lg p-4 flex gap-3">
        <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <p>
          <span className="font-semibold">
            Your earnings dashboard is ready!
          </span>{" "}
          Once your licenses activate, you'll see real-time earnings here.
          Currently, you have no active contracts.
        </p>
      </div>

      {/* Key metrics */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="p-6 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Total Earned YTD</p>
          <p className="text-3xl font-bold text-gray-900">$0</p>
          <p className="text-sm text-gray-600 mt-1">
            Will update once your first license activates
          </p>
        </Card>
        <Card className="p-6 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">This Month's Recurring</p>
          <p className="text-3xl font-bold text-gray-900">$0</p>
          <p className="text-sm text-gray-600 mt-1">
            Waiting for active campaigns
          </p>
        </Card>
        <Card className="p-6 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Projected Next Month</p>
          <p className="text-3xl font-bold text-gray-900">$0</p>
          <p className="text-sm text-gray-600 mt-1">
            Will calculate based on active licenses
          </p>
        </Card>
        <Card className="p-6 bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Next Payment</p>
          <p className="text-2xl font-bold text-gray-900">To be determined</p>
          <p className="text-sm text-gray-600 mt-1">No active contracts yet</p>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6 bg-white border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Revenue Trend (Last 6 Months)
          </h3>
          <div className="p-12 bg-gray-50 border border-gray-200 rounded-lg text-center text-gray-600">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <div>Your revenue trend will appear here</div>
            <div className="text-sm text-gray-500 mt-1">
              Once you have active campaigns
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-white border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Earnings by Industry
          </h3>
          <div className="p-12 bg-gray-50 border border-gray-200 rounded-lg text-center text-gray-600">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <div>Your industry breakdown will appear here</div>
            <div className="text-sm text-gray-500 mt-1">
              Once you have active campaigns
            </div>
          </div>
        </Card>
      </div>

      {/* Comparison Banner */}
      <Card className="p-6 bg-gradient-to-r from-cyan-50 to-white border border-cyan-200">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            This is what your earnings could look like
          </h3>
          <p className="text-sm text-gray-600">
            See how Likelee's recurring model compares to traditional one-time
            payments
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-5 bg-white rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Traditional Model:</p>
            <p className="text-3xl font-bold text-gray-900">$500</p>
            <p className="text-sm text-gray-600">
              One-time payment per campaign
            </p>
          </div>
          <div className="p-5 bg-white rounded-lg border border-cyan-300">
            <p className="text-sm text-gray-600 mb-1">Likelee Model:</p>
            <p className="text-3xl font-bold text-[#32C8D1]">$2,500+/month</p>
            <p className="text-sm text-gray-600">
              Per active license • Recurring revenue
            </p>
          </div>
        </div>
      </Card>

      {/* Earnings by Campaign */}
      <Card className="p-6 bg-white border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Earnings by Campaign
        </h3>
        {activeCampaigns.length === 0 ? (
          <div className="p-12 bg-gray-50 border border-gray-200 rounded-lg text-center text-gray-600">
            <Gift className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <div className="font-semibold text-gray-900">
              Your campaigns will appear here
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Once you have active licenses generating revenue
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
                  <div className="text-xs text-gray-500">this month</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Payment History */}
      <Card className="p-6 bg-white border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Payment History
        </h3>
        <div className="p-12 bg-gray-50 border border-gray-200 rounded-lg text-center text-gray-600">
          <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <div className="font-semibold text-gray-900">
            Your payment history will appear here
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Once you receive your first payout
          </div>
        </div>
      </Card>
      <Button
        variant="outline"
        disabled
        className="w-full mt-3 border-2 border-gray-200 text-gray-400 cursor-not-allowed"
      >
        Download Tax Summary (1099)
      </Button>
    </div>
  );

  const handleSaveRates = async (e) => {
    e.preventDefault();
    setSavingRates(true);
    try {
      const formData = new FormData(e.target);
      const newRates: any[] = [];

      // Determine which modal is open and process only its rates
      if (showRatesModal === "content") {
        creator.content_types
          ?.filter((t) => CONTENT_TYPES.includes(t))
          .forEach((type) => {
            const val = formData.get(`rate_content_${type}`);
            if (val && val.toString().trim() !== "") {
              newRates.push({
                rate_type: "content_type",
                rate_name: type,
                price_per_week_cents: Math.round(
                  (parseFloat(val.toString()) / 4) * 100,
                ),
              });
            }
          });
      }
      // 1. Save the selection (content_types or industries) to the profile
      const profileUpdate: any = {
        email: creator.email || user.email,
      };

      if (showRatesModal === "content") {
        profileUpdate.content_types = creator.content_types;
      } else if (showRatesModal === "industry") {
        profileUpdate.industries = creator.industries;
      }

      // Save profile selection
      const profileRes = await fetch(
        `${API_BASE}/api/profile?user_id=${user.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profileUpdate),
        },
      );

      if (!profileRes.ok) {
        throw new Error("Failed to save selection to profile");
      }

      // 2. Save rates (only for content types)
      // If we are editing content rates, we use the new ones.
      // If we are editing industries (which have no rates now), we must preserve the existing content rates.
      // We explicitly DO NOT preserve industry rates, effectively deleting them.
      if (showRatesModal !== "content") {
        const existingContentRates = customRates.filter(
          (r) => r.rate_type === "content_type",
        );
        newRates.push(...existingContentRates);
      }

      const finalRates = [...newRates];

      try {
        const res = await fetch(
          `${API_BASE}/api/creator-rates?user_id=${encodeURIComponent(user.id)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(finalRates),
          },
        );

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText);
        }

        // Reload rates from database to confirm persistence
        const reloadRes = await fetch(
          `${API_BASE}/api/creator-rates?user_id=${encodeURIComponent(user.id)}`,
        );
        if (reloadRes.ok) {
          const reloadedRates = await reloadRes.json();
          setCustomRates(reloadedRates);
        }

        alert("Changes saved successfully!");
      } catch (rateError: any) {
        console.error("Rate save error:", rateError);
        // If profile saved but rates failed, we still consider it a partial success
        // and close the modal, but warn the user.
        alert(
          `Selection saved, but failed to save custom rates: ${rateError.message || "Unknown error"}`,
        );
      }

      setShowRatesModal(null);
      setEditingRules(false);
    } catch (e: any) {
      console.error("Save error:", e);
      alert(`Failed to save: ${e?.message || e}`);
    } finally {
      setSavingRates(false);
    }
  };

  const renderSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Settings</h2>
          <p className="text-gray-600 mt-1">
            Manage your profile and preferences
          </p>
        </div>
      </div>

      {/* Settings Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setSettingsTab("profile")}
          className={`px-6 py-3 font-semibold border-b-2 transition-colors ${settingsTab === "profile"
              ? "border-[#32C8D1] text-[#32C8D1]"
              : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
        >
          Profile Settings
        </button>
        <button
          onClick={() => setSettingsTab("rules")}
          className={`px-6 py-3 font-semibold border-b-2 transition-colors ${settingsTab === "rules"
              ? "border-[#32C8D1] text-[#32C8D1]"
              : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
        >
          My Rules
        </button>
      </div>

      {/* Profile Settings Tab */}
      {settingsTab === "profile" && (
        <div className="space-y-6">
          {/* Profile Photo */}
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Profile Photo
            </h3>
            <div className="flex items-center gap-6">
              <div className="relative">
                <img
                  src={creator.profile_photo}
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
                  Upload a professional headshot
                </p>
                <p className="text-xs text-gray-500">JPG or PNG, max 5MB</p>
              </div>
            </div>
          </Card>

          {/* Basic Information */}
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              Basic Information
            </h3>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Name
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
                  Email
                </Label>
                <Input
                  value={creator.email}
                  disabled
                  className="border-2 border-gray-200 bg-gray-50"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Location
                </Label>
                <Input
                  value={creator.location}
                  onChange={(e) =>
                    setCreator({ ...creator, location: e.target.value })
                  }
                  className="border-2 border-gray-300"
                  placeholder="City, State"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Bio
                </Label>
                <Textarea
                  value={creator.bio}
                  onChange={(e) =>
                    setCreator({ ...creator, bio: e.target.value })
                  }
                  className="border-2 border-gray-300 min-h-32"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <Button
                onClick={handleSaveProfile}
                className="w-full bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
              >
                Save Profile
              </Button>
            </div>
          </Card>

          {/* Social Media Links */}
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              Social Media
            </h3>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  <Instagram className="w-4 h-4 inline mr-2" />
                  Instagram Handle
                </Label>
                <Input
                  value={creator.instagram_handle || ""}
                  onChange={(e) =>
                    setCreator({ ...creator, instagram_handle: e.target.value })
                  }
                  className="border-2 border-gray-300"
                  placeholder="@yourhandle"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  <Video className="w-4 h-4 inline mr-2" />
                  TikTok Handle
                </Label>
                <Input
                  value={creator.tiktok_handle || ""}
                  onChange={(e) =>
                    setCreator({ ...creator, tiktok_handle: e.target.value })
                  }
                  className="border-2 border-gray-300"
                  placeholder="@yourhandle"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  <LinkIcon className="w-4 h-4 inline mr-2" />
                  External Portfolio URL
                </Label>
                <Input
                  value={creator.portfolio_url || ""}
                  onChange={(e) =>
                    setCreator({ ...creator, portfolio_url: e.target.value })
                  }
                  className="border-2 border-gray-300"
                  placeholder="https://yourportfolio.com"
                />
              </div>

              <Button
                onClick={handleSaveProfile}
                className="w-full bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
              >
                Save Social Links
              </Button>
            </div>
          </Card>

          {/* Visibility Settings */}
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              Visibility Settings
            </h3>

            <div className="space-y-6">
              <div className="flex items-center justify-between py-4 border-b border-gray-200">
                <div>
                  <Label className="text-base font-semibold text-gray-900 block mb-1">
                    Visible to Brands
                  </Label>
                  <p className="text-sm text-gray-600">
                    Allow brands to discover and contact you
                  </p>
                </div>
                <Switch
                  checked={creator.is_public_brands || false}
                  onCheckedChange={(checked) => {
                    setCreator({ ...creator, is_public_brands: checked });
                    alert(
                      `Profile is now ${checked ? "VISIBLE" : "HIDDEN"} to brands! (Demo mode)`,
                    );
                  }}
                />
              </div>

              <div className="flex items-center justify-between py-4 border-b border-gray-200">
                <div>
                  <Label className="text-base font-semibold text-gray-900 block mb-1">
                    Enable Licensing
                  </Label>
                  <p className="text-sm text-gray-600">
                    Accept licensing requests from brands
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between py-4">
                <div>
                  <Label className="text-base font-semibold text-gray-900 block mb-1">
                    Email Notifications
                  </Label>
                  <p className="text-sm text-gray-600">
                    Receive updates about campaigns and approvals
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
          <Card className="p-6 bg-white border border-gray-200">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-1">My Rules</h3>
              <p className="text-sm text-gray-600">
                Set your licensing preferences and rates
              </p>
            </div>

            <div className="space-y-8">
              {/* Content Types */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-semibold text-gray-900">
                    Content I'm Open To
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRatesModal("content")}
                    className="border-2 border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Rate
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {CONTENT_TYPES.map((type) => {
                    const isSelected = creator.content_types?.includes(type);
                    return (
                      <Badge
                        key={type}
                        className={`px-4 py-2 border-2 ${isSelected
                            ? "bg-[#32C8D1] text-white border-[#32C8D1] hover:!bg-[#32C8D1]"
                            : "bg-gray-100 text-gray-700 border-gray-300 hover:!bg-gray-100"
                          }`}
                      >
                        {isSelected && <Check className="w-3 h-3 mr-1" />}
                        {type}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Industries */}
              <div className="pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-semibold text-gray-900">
                    Industries I Work With
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRatesModal("industry")}
                    className="border-2 border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {INDUSTRIES.map((industry) => {
                    const isSelected = creator.industries?.includes(industry);
                    return (
                      <Badge
                        key={industry}
                        className={`px-4 py-2 border-2 ${isSelected
                            ? "bg-[#32C8D1] text-white border-[#32C8D1] hover:!bg-[#32C8D1]"
                            : "bg-gray-100 text-gray-700 border-gray-300 hover:!bg-gray-100"
                          }`}
                      >
                        {isSelected && <Check className="w-3 h-3 mr-1" />}
                        {industry}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Content I'm NOT Comfortable With */}
              <div className="pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-semibold text-gray-900">
                    Content I'm NOT Comfortable With
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRestrictionsModal(true)}
                    className="border-2 border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {contentRestrictions.map((restriction) => (
                    <Badge
                      key={restriction}
                      className="bg-red-500 text-white px-4 py-2 border-2 border-red-500 hover:!bg-red-500"
                    >
                      ✕ {restriction}
                    </Badge>
                  ))}
                </div>

                {/* Conflicting Campaigns (Brand Exclusivity) */}
                <div className="mt-4 p-4 bg-[#FFF9E6] border border-[#FFE066] rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-1">
                    Conflicting Campaigns (Brand Exclusivity)
                  </h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Add brands you're exclusive with to prevent competing
                    campaigns
                  </p>
                  {brandExclusivity.length === 0 ? (
                    <p className="text-sm italic text-gray-500">
                      No brand exclusivity set
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {brandExclusivity.map((brand) => (
                        <span
                          key={brand}
                          className="text-sm text-gray-700 font-medium bg-white px-2 py-1 rounded border border-[#FFE066]"
                        >
                          {brand}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing */}
              <div className="pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-semibold text-gray-900">
                    Initial Licensing Rate
                  </Label>
                  {!editingLicensingRate ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingLicensingRate(true)}
                      className="border-2 border-gray-300 text-gray-700 hover:bg-gray-100"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingLicensingRate(false)}
                        className="border-2 border-gray-300"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          // Commit local rate to creator state before saving
                          const val = parseInt(localMonthlyRate);
                          if (!isNaN(val)) {
                            // We need to update the creator state reference that handleSaveRules uses
                            // Since handleSaveRules uses the 'creator' state variable, we need to update it
                            // However, setState is async. So we might need to pass the value or update it differently.
                            // Actually, handleSaveRules uses the current state.
                            // Let's update it and then call save? No, race condition.
                            // Better: Update the creator object directly in handleSaveRules or pass it.
                            // For now, let's update state and assume the user clicks save again? No.
                            // Let's manually update the creator state and wait a tick? No.
                            // Let's modify handleSaveRules to accept an override or read from a ref?
                            // Or simpler: Just update the state here, and handleSaveRules will read it?
                            // Wait, handleSaveRules reads 'creator'. If I setCreator here, it won't be updated in the same closure if I call handleSaveRules immediately.
                            // I will update handleSaveRules to take an optional override.
                            // But I can't easily change handleSaveRules signature without checking all calls.
                            // Let's just update the state and rely on the fact that we are in a functional component?
                            // No, the closure captures the old state.
                            // I will update the creator state, and then call handleSaveRules in a useEffect or similar?
                            // Actually, I can just update the creator object in place? No, immutable.
                            // I will modify handleSaveRules to read from a ref?
                            // Or I can just pass the new price to handleSaveRules?
                            // Let's try passing the price to handleSaveRules.
                            // Let's try passing the price to handleSaveRules.
                            const val = parseFloat(localMonthlyRate);
                            const monthlyCents = Math.round(val * 100);
                            const newWeeklyRate = Math.round(val / 4);
                            const updatedCreator = {
                              ...creator,
                              price_per_week: newWeeklyRate,
                              base_monthly_price_cents: monthlyCents,
                            };
                            setCreator(updatedCreator);
                            // We need to pass this updated object to save function
                            handleSaveRules(updatedCreator);
                          } else {
                            handleSaveRules();
                          }
                          setEditingLicensingRate(false);
                        }}
                        className="bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
                      >
                        Save
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Base rate per month for cameo usage
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex-1 max-w-md">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-700 font-medium text-lg">
                        $
                      </span>
                      <Input
                        type="number"
                        value={localMonthlyRate}
                        onChange={(e) => {
                          setLocalMonthlyRate(e.target.value);
                        }}
                        disabled={!editingLicensingRate}
                        className={`border-2 text-lg ${!editingLicensingRate ? "bg-gray-100 cursor-not-allowed" : "border-gray-300"}`}
                        min="0"
                        step="50"
                      />
                      <span className="text-gray-700 font-medium text-lg">
                        / month
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Negotiation Acceptance */}
              <div className="pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold text-gray-900 block mb-1">
                      Accept Negotiations
                    </Label>
                    <p className="text-sm text-gray-600">
                      Allow brands to propose counter-offers to your base rate
                    </p>
                  </div>
                  <Switch
                    checked={creator.accept_negotiations || false}
                    onCheckedChange={(checked) => {
                      const updated = { ...creator, accept_negotiations: checked };
                      setCreator(updated);
                      handleSaveRules(updated);
                    }}
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
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? "w-64" : "w-20"} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col fixed h-screen z-40`}
      >
        {/* Profile Section */}
        <div className="p-6 border-b border-gray-200 relative">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
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
                  <Badge
                    variant="outline"
                    className="bg-green-100 text-green-700 border border-green-300"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Verified Creator
                  </Badge>
                )}
              </div>
              <button
                className="ml-auto text-gray-600 hover:text-gray-900"
                onClick={() => setShowProfileMenu((v) => !v)}
                aria-label="Open profile menu"
              >
                <ChevronRight
                  className={`w-5 h-5 transition-transform ${showProfileMenu ? "rotate-90" : ""}`}
                />
              </button>
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
                    Edit Profile
                  </span>
                </button>

                <button
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
                  onClick={() => {
                    const url = `${window.location.origin}/PublicProfile`;
                    window.open(url, "_blank");
                    setShowProfileMenu(false);
                  }}
                >
                  <Eye className="w-4 h-4 text-gray-700" />
                  <span className="text-sm font-medium text-gray-900">
                    View Public Profile
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
                    Help / Support
                  </span>
                </button>
              </div>

              <div className="p-2 border-t border-gray-200">
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left text-red-600"
                  onClick={async () => {
                    try {
                      await logout?.();
                    } catch (_) { }
                    setShowProfileMenu(false);
                    navigate("/Login");
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium">Logout</span>
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
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${isActive
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
          {activeSection === "dashboard" && renderDashboard()}
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
      </main>

      {/* Pause License Modal */}
      <Dialog open={showPauseModal} onOpenChange={setShowPauseModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Pause This License?
            </DialogTitle>
          </DialogHeader>

          {selectedContract &&
            (() => {
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
                <div className="py-4 space-y-6">
                  <div className="bg-amber-50 border-2 border-amber-300">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <p className="text-amber-900">
                      <strong>⚠️ IMPORTANT PAYMENT WARNING</strong>
                      <p className="mt-2">If you pause NOW (mid-month):</p>
                      <ul className="list-disc ml-6 mt-2 space-y-1">
                        <li>You will NOT receive payment for {currentMonth}</li>
                        <li>
                          Even though you've earned ${proratedAmount} so far
                          this month
                        </li>
                        <li>That money will be forfeited</li>
                      </ul>
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Card
                      className="p-6 border-2 border-red-300 hover:border-red-400 cursor-pointer transition-all"
                      onClick={() => handlePauseLicense(contract, true)}
                    >
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        OPTION 1: Pause Immediately
                      </h3>
                      <div className="space-y-2 text-sm text-gray-700 mb-4">
                        <p>
                          <strong>Effective:</strong> Today
                        </p>
                        <p>
                          <strong>This Month's Payment:</strong>{" "}
                          <span className="text-red-600 font-bold">
                            ✗ FORFEITED (${proratedAmount})
                          </span>
                        </p>
                        <p>
                          <strong>Next Month's Payment:</strong>{" "}
                          <span className="text-red-600">✗ PAUSED</span>
                        </p>
                      </div>
                      <p className="text-sm text-gray-600">
                        Use this if you want to stop immediately and are okay
                        losing this month's partial payment.
                      </p>
                    </Card>

                    <Card
                      className="p-6 border-2 border-green-300 hover:border-green-400 cursor-pointer transition-all"
                      onClick={() => handlePauseLicense(contract, false)}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <Badge className="bg-green-500 text-white">
                          Recommended
                        </Badge>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        OPTION 2: Pause Next Month
                      </h3>
                      <div className="space-y-2 text-sm text-gray-700 mb-4">
                        <p>
                          <strong>Effective:</strong>{" "}
                          {new Date(
                            new Date().getFullYear(),
                            new Date().getMonth() + 1,
                            1,
                          ).toLocaleDateString()}
                        </p>
                        <p>
                          <strong>This Month's Payment:</strong>{" "}
                          <span className="text-green-600 font-bold">
                            ✓ YOU'LL GET PAID (${contract.creator_earnings})
                          </span>
                        </p>
                        <p>
                          <strong>Next Month's Payment:</strong>{" "}
                          <span className="text-red-600">✗ PAUSED</span>
                        </p>
                      </div>
                      <p className="text-sm text-gray-600">
                        Use this to keep earning through the end of this month,
                        then pause starting next month.
                      </p>
                    </Card>
                  </div>

                  <div className="text-center">
                    <Button
                      variant="outline"
                      onClick={() => setShowPauseModal(false)}
                      className="border-2 border-gray-300"
                    >
                      Cancel - Don't Pause
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
              Revoke This License?
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
                  <div className="bg-red-50 border-2 border-red-300">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <p className="text-red-900">
                      <strong>What happens when you revoke:</strong>
                      <ul className="list-disc ml-6 mt-2 space-y-1">
                        <li>
                          You're requesting to END this license permanently
                        </li>
                        <li>
                          30-day notice period begins (they keep rights for 30
                          more days)
                        </li>
                        <li>After 30 days, they must take down all content</li>
                        <li>Your earnings STOP after the 30-day period ends</li>
                        <li>The license cannot be reactivated</li>
                      </ul>
                    </p>
                  </div>

                  <Card className="p-6 bg-gray-50 border border-gray-200">
                    <h3 className="font-bold text-gray-900 mb-4">
                      Revocation Timeline
                    </h3>
                    <div className="relative">
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-center flex-1">
                          <p className="text-sm text-gray-600 mb-1">
                            Notice Starts
                          </p>
                          <p className="font-bold text-gray-900">
                            {revocationDate.toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-center flex-1">
                          <p className="text-sm text-gray-600 mb-1">
                            Final Takedown
                          </p>
                          <p className="font-bold text-gray-900">
                            {finalDate.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full">
                        <div className="h-full w-0 bg-red-500 rounded-full"></div>
                      </div>
                    </div>
                    <div className="mt-6 space-y-2 text-sm">
                      <p className="text-gray-700">
                        <strong>Days 1-30:</strong> {contract.brand} can still
                        use your likeness (final payments due)
                      </p>
                      <p className="text-gray-700">
                        <strong>Day 30:</strong> All content must be taken down
                      </p>
                      <p className="text-gray-700">
                        <strong>Your Final Payment:</strong> $
                        {contract.creator_earnings} on{" "}
                        {finalDate.toLocaleDateString()}
                      </p>
                    </div>
                  </Card>

                  <div>
                    <Label className="text-sm font-medium text-gray-700 block mb-2">
                      Reason for revoking (optional):
                    </Label>
                    <Textarea
                      placeholder="e.g., I don't want to work with this brand anymore"
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
                      Cancel
                    </Button>
                    <Button
                      onClick={() => handleRevokeLicense(contract)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    >
                      <XCircle className="w-5 h-5 mr-2" />
                      Yes, Revoke License
                    </Button>
                  </div>
                </div>
              );
            })()}
        </DialogContent>
      </Dialog>

      {/* Re-upload Cameo Modal */}
      <Dialog
        open={showReuploadCameoModal}
        onOpenChange={setShowReuploadCameoModal}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Re-Record Your Cameo
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-6">
            <Card className="p-4 bg-gray-50 border border-gray-200">
              <h4 className="font-bold text-gray-900 mb-3">
                Your Current Cameo:
              </h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Uploaded:</p>
                  <p className="font-bold text-gray-900">Nov 12, 2024</p>
                </div>
                <div>
                  <p className="text-gray-600">Duration:</p>
                  <p className="font-bold text-gray-900">45 seconds</p>
                </div>
                <div>
                  <p className="text-gray-600">Quality:</p>
                  <p className="font-bold text-gray-900">4K</p>
                </div>
              </div>
            </Card>

            <div>
              <h4 className="font-bold text-gray-900 mb-3">
                You can re-upload if you've made changes to your appearance:
              </h4>
              <div className="space-y-2 text-gray-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#32C8D1]" />
                  <p>Changed hairstyle</p>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#32C8D1]" />
                  <p>Changed hair color</p>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#32C8D1]" />
                  <p>Significant weight loss/gain</p>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#32C8D1]" />
                  <p>New tattoos</p>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#32C8D1]" />
                  <p>Changed style/fashion</p>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#32C8D1]" />
                  <p>Just want a fresher look</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border-2 border-blue-300">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <p className="text-blue-900">
                <strong>What Happens After You Upload:</strong>
                <ul className="list-disc ml-6 mt-2 space-y-1">
                  <li>New cameo goes through verification (24 hours)</li>
                  <li>If approved, new cameo becomes your primary</li>
                  <li>Old cameo is archived but still available</li>
                  <li>
                    All active licenses continue using the version they signed
                    (old cameo)
                  </li>
                  <li>New licenses will use the new cameo</li>
                </ul>
              </p>
            </div>

            <div className="bg-amber-50 border-2 border-amber-300">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <p className="text-amber-900">
                <strong>Important:</strong> Existing contracts will NOT change.
                Brands who signed with your old cameo will continue using that
                version. Only new projects will use the updated cameo.
              </p>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#32C8D1] transition-colors">
              <input
                type="file"
                id="reuploadCameo"
                accept="video/*"
                onChange={handleHeroUpload}
                className="hidden"
              />
              <label htmlFor="reuploadCameo" className="cursor-pointer">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-700 font-medium mb-2">
                  Click to upload new cameo
                </p>
                <p className="text-sm text-gray-500">
                  MP4 or MOV, 30-60 seconds
                </p>
              </label>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowReuploadCameoModal(false)}
                className="flex-1 border-2 border-gray-300"
              >
                Cancel
              </Button>
            </div>
          </div>
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
              Upload Reference Image
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
                        <strong>Section:</strong> {section.title}
                      </p>
                      <p className="text-gray-600">
                        <strong>Best For:</strong> {section.bestFor}
                      </p>
                    </div>

                    <Card className="p-4 bg-gray-50 border border-gray-200">
                      <h4 className="font-bold text-gray-900 mb-3">
                        Requirements Checklist:
                      </h4>
                      <div className="space-y-2 text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-green-600" />
                          <p>At least 1080x1080 resolution</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-green-600" />
                          <p>Face/body clearly visible</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-green-600" />
                          <p>Good lighting (natural or studio)</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-green-600" />
                          <p>Recent photo (from last 3 months)</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-green-600" />
                          <p>No heavy filters</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-green-600" />
                          <p>
                            Professional quality preferred (not selfie-style)
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
                          Drag photos here or click to browse
                        </p>
                        <p className="text-sm text-gray-500">
                          File Size: Max 10MB | Formats: JPG, PNG, WebP
                        </p>
                      </label>
                    </div>

                    {previewImage && (
                      <div>
                        <h4 className="font-bold text-gray-900 mb-3">
                          Preview:
                        </h4>
                        <img
                          src={previewImage.url}
                          alt="Preview"
                          className="w-full max-h-[50vh] object-contain border-2 border-gray-200 rounded-lg mb-4"
                        />

                        <Card className="p-4 bg-green-50 border border-green-200">
                          <h5 className="font-bold text-gray-900 mb-2">
                            Auto-Check:
                          </h5>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                              <p className="text-gray-900">
                                Resolution: {previewImage.resolution}{" "}
                                (Excellent)
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                              <p className="text-gray-900">
                                Faces Detected: 1 (You alone)
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                              <p className="text-gray-900">
                                Lighting Quality: Good
                              </p>
                            </div>
                          </div>
                        </Card>
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
                        Cancel
                      </Button>
                      <Button
                        onClick={confirmImageUpload}
                        disabled={!previewImage || uploadingToSection}
                        className="flex-1 bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
                      >
                        {uploadingToSection ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload
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
            <DialogTitle className="text-2xl font-bold text-gray-900 capitalize">
              Record {selectedEmotion} Voice Sample
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {!isRecording ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-[#32C8D1] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Mic className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Ready to Record?
                </h3>
                <p className="text-gray-600 mb-6">
                  The script will scroll slowly. Speak naturally and
                  expressively.
                </p>
                <Button
                  onClick={startRecording}
                  className="h-14 px-8 bg-red-500 hover:bg-red-600 text-white text-lg"
                >
                  <Mic className="w-5 h-5 mr-2" />
                  Start Recording
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
                    Stop Recording
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

      {/* Custom Rates Modal */}
      <Dialog
        open={showRatesModal !== null}
        onOpenChange={() => setShowRatesModal(null)}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              {showRatesModal === "content"
                ? "Edit Content I'm Open To"
                : "Edit Industries I Work With"}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handleSaveRates}
            className="flex-1 overflow-y-auto py-4 pr-2"
          >
            {/* Content Type Selection - Only show if modal type is 'content' */}
            {showRatesModal === "content" && (
              <div className="mb-6">
                <h4 className="font-normal text-gray-900 mb-3">
                  Select the content types you're open to working with:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {CONTENT_TYPES.map((type) => (
                    <Badge
                      key={type}
                      onClick={() => handleToggleContentType(type)}
                      className={`cursor-pointer transition-all px-4 py-2 flex items-center gap-2 ${creator.content_types?.includes(type)
                          ? "bg-[#32C8D1] text-white font-bold border-2 border-[#32C8D1] hover:!bg-[#32C8D1]"
                          : "bg-gray-100 text-gray-700 border-2 border-gray-300 hover:!bg-gray-100"
                        }`}
                    >
                      {creator.content_types?.includes(type) && (
                        <Check className="w-3 h-3" />
                      )}
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Industry Selection - Only show if modal type is 'industry' */}
            {showRatesModal === "industry" && (
              <div className="mb-6">
                <h4 className="font-normal text-gray-900 mb-3">
                  Select the industries you're open to working with:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {INDUSTRIES.map((industry) => (
                    <Badge
                      key={industry}
                      onClick={() => handleToggleIndustry(industry)}
                      className={`cursor-pointer transition-all px-4 py-2 flex items-center gap-2 ${creator.industries?.includes(industry)
                          ? "bg-[#32C8D1] text-white font-bold border-2 border-[#32C8D1] hover:!bg-[#32C8D1]"
                          : "bg-gray-100 text-gray-700 border-2 border-gray-300 hover:!bg-gray-100"
                        }`}
                    >
                      {creator.industries?.includes(industry) && (
                        <Check className="w-3 h-3" />
                      )}
                      {industry}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Content Types - Only show if modal type is 'content' */}
            {showRatesModal === "content" &&
              ((
                creator.content_types?.filter((t) =>
                  CONTENT_TYPES.includes(t),
                ) || []
              ).length > 0 ? (
                <div className="mb-8">
                  <h4 className="font-bold text-gray-900 mb-2">
                    Custom Rates by Content Type
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Set custom rates for specific content types. Leave blank to
                    use your base rate of ${(creator.price_per_week || 0) * 4}
                    /month.
                  </p>
                  <div className="grid gap-4">
                    {creator.content_types
                      ?.filter((type) => CONTENT_TYPES.includes(type))
                      .map((type) => {
                        const existing = customRates.find(
                          (r) =>
                            r.rate_type === "content_type" &&
                            r.rate_name === type,
                        );
                        return (
                          <div
                            key={type}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <Label className="font-medium text-gray-700">
                              {type}
                            </Label>
                            <div className="flex items-center gap-2 w-48">
                              <span className="text-gray-500">$</span>
                              <Input
                                type="number"
                                name={`rate_content_${type}`}
                                defaultValue={
                                  existing
                                    ? (
                                      (existing.price_per_week_cents / 100) *
                                      4
                                    ).toString()
                                    : ""
                                }
                                placeholder={(
                                  (creator.price_per_week || 0) * 4
                                ).toString()}
                                className="bg-white"
                                min="0"
                                step="1"
                              />
                              <span className="text-gray-500 text-sm">/mo</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : null)}

            {/* Industries - Only show if modal type is 'industry' - NO CUSTOM RATES */}
            {showRatesModal === "industry" && <div className="mb-6"></div>}

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRatesModal(null)}
                className="border-2 border-gray-300"
              >
                Cancel
              </Button>
              {/* Save button - always show, different text for each modal */}
              <Button
                type="submit"
                disabled={savingRates}
                className="bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
              >
                {savingRates ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : showRatesModal === "content" ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Save Rates
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Content Restrictions Modal */}
      <Dialog
        open={showRestrictionsModal}
        onOpenChange={() => setShowRestrictionsModal(false)}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Edit Content I'm NOT Comfortable With
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 pr-2 space-y-6">
            <p className="text-sm text-gray-600">
              Manage content types and categories you don't want to be
              associated with:
            </p>

            {/* Current Restrictions */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">
                Current Restrictions:
              </h4>
              <div className="flex flex-wrap gap-2">
                {contentRestrictions.map((restriction) => (
                  <Badge
                    key={restriction}
                    className="bg-red-500 text-white px-3 py-1 cursor-pointer hover:!bg-red-500"
                    onClick={() => removeRestriction(restriction)}
                  >
                    ✕ {restriction}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Click to add restrictions */}
            {availableRestrictions.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">
                  Click to add restrictions:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {availableRestrictions.map((restriction) => (
                    <Badge
                      key={restriction}
                      className="bg-gray-200 text-gray-700 px-3 py-1 cursor-pointer hover:!bg-gray-200"
                      onClick={() => addRestriction(restriction)}
                    >
                      + {restriction}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Add custom restriction */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">
                Add custom restriction:
              </h4>
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom restriction (max 25 chars)"
                  maxLength={25}
                  value={customRestriction}
                  onChange={(e) => setCustomRestriction(e.target.value)}
                  className="px-3 pl-4 bg-white"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomRestriction();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addCustomRestriction}
                  className="border-red-500 text-red-500 hover:bg-red-50"
                >
                  +
                </Button>
              </div>
            </div>

            {/* Brand Exclusivity */}
            <div className="pt-4 border-t">
              <h4 className="font-semibold text-gray-900 mb-2">
                Conflicting Campaigns (Brand Exclusivity)
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                Add brands you're exclusive with to prevent competing campaigns
              </p>

              {brandExclusivity.length === 0 ? (
                <p className="text-sm italic text-gray-500 mb-3">
                  No brand exclusivity set
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 mb-3">
                  {brandExclusivity.map((brand) => (
                    <Badge
                      key={brand}
                      className="bg-gray-200 text-gray-700 px-3 py-1 flex items-center gap-2 hover:!bg-gray-200"
                    >
                      {brand}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-red-600"
                        onClick={() => removeBrandExclusivity(brand)}
                      />
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  placeholder="Enter brand name (max 25 chars)"
                  maxLength={25}
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  className="px-3 pl-4 bg-white"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addBrandExclusivity();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addBrandExclusivity}
                  className="border-yellow-500 text-yellow-500 hover:bg-yellow-50"
                >
                  +
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowRestrictionsModal(false)}
              className="border-2 border-gray-300"
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
              onClick={handleSaveRestrictions}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
