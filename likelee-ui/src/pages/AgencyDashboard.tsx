import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Bell,
  HelpCircle,
  User,
  Upload,
  Filter,
  MoreVertical,
  Shield,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  DollarSign,
  TrendingUp,
  Users,
  FileText,
  Settings,
  AlertCircle,
  Download,
  Link as LinkIcon,
  MapPin,
  Instagram,
  Calendar,
  Globe,
  Plus,
  Edit,
  ArrowUpDown,
  X,
  Video,
  Image as ImageIcon,
  Mic,
  ChevronRight,
  Mail,
  RefreshCw,
  LogOut,
  CreditCard,
  Building2,
  UserCog,
  FileText as FileTextIcon,
  BarChart3,
  PieChart,
  Activity,
  Target,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  getOrganizationProfileByUserId,
  getKycStatus as fetchUserKycStatus,
  createKycSession,
} from "../api/functions";
import { KycStatusResponse } from "../types/kyc";
import { OrganizationProfile } from "../api/entities";
import { useToast } from "@/components/ui/use-toast";

// Mock agency data
const mockAgency = {
  name: "CM Models",
  logo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/a37a561a8_Screenshot2025-10-29at70538PM.png",
  website: "https://cmmodels.com/",
  location: "U.S.",
  status: "verified",
  marketplace_visible: true,
  seats_used: 10,
  seats_total: 15,
  stripe_connected: true,
  elevenlabs_connected: true,
};

// Mock roster data
const mockRoster = [
  {
    id: 1,
    name: "Emma",
    headshot:
      "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/5d413193e_Screenshot2025-10-29at63349PM.png",
    status: "active",
    consent: "complete",
    verified: true,
    instagram_followers: 42300,
    assets_count: 38,
    last_campaign: "Glossier Beauty",
    usage_30d: 7,
    earnings_30d: 3200,
    license_expiry: "2025-08-15",
    top_brand: "Glossier",
    ai_usage_types: ["video", "image"],
    projected_earnings: 4100,
    engagement_rate: 4.2,
    bio: "Fashion model specializing in beauty and lifestyle campaigns",
    categories: ["Model", "Creator"],
    recent_campaigns: [
      { brand: "Glossier Beauty", earnings: 1200, date: "2025-01-15" },
      { brand: "Rare Beauty", earnings: 1100, date: "2024-12-20" },
      { brand: "Fenty Beauty", earnings: 900, date: "2024-12-05" },
    ],
  },
  {
    id: 2,
    name: "Sergine",
    headshot:
      "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/7b92ca646_Screenshot2025-10-29at63428PM.png",
    status: "active",
    consent: "complete",
    verified: true,
    instagram_followers: 2800,
    assets_count: 31,
    last_campaign: "Everlane Basics",
    usage_30d: 5,
    earnings_30d: 2800,
    license_expiry: "2025-09-22",
    top_brand: "Everlane",
    ai_usage_types: ["image"],
    projected_earnings: 3400,
    engagement_rate: 3.8,
    bio: "Minimalist fashion model with clean aesthetic",
    categories: ["Model"],
    recent_campaigns: [
      { brand: "Everlane Basics", earnings: 1500, date: "2025-01-10" },
      { brand: "Cuyana", earnings: 800, date: "2024-12-28" },
      { brand: "Jenni Kayne", earnings: 500, date: "2024-12-15" },
    ],
  },
  {
    id: 3,
    name: "Milan",
    headshot:
      "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/b0ae64ffa_Screenshot2025-10-29at63451PM.png",
    status: "active",
    consent: "complete",
    verified: true,
    instagram_followers: 15200,
    assets_count: 42,
    last_campaign: "Carhartt WIP",
    usage_30d: 9,
    earnings_30d: 4100,
    license_expiry: "2025-07-30",
    top_brand: "Carhartt WIP",
    ai_usage_types: ["video", "image"],
    projected_earnings: 5200,
    engagement_rate: 5.1,
    bio: "Street style and urban fashion model",
    categories: ["Model", "Creator"],
    recent_campaigns: [
      { brand: "Carhartt WIP", earnings: 2100, date: "2025-01-18" },
      { brand: "Stüssy", earnings: 1200, date: "2025-01-05" },
      { brand: "Palace", earnings: 800, date: "2024-12-22" },
    ],
  },
  {
    id: 4,
    name: "Julia",
    headshot:
      "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/c5a5c61e4_Screenshot2025-10-29at63512PM.png",
    status: "active",
    consent: "expiring",
    verified: true,
    instagram_followers: 5700,
    assets_count: 54,
    last_campaign: "& Other Stories",
    usage_30d: 11,
    earnings_30d: 5200,
    license_expiry: "2025-02-15",
    top_brand: "& Other Stories",
    ai_usage_types: ["video", "image", "voice"],
    projected_earnings: 6500,
    engagement_rate: 6.2,
    bio: "High fashion editorial and commercial model",
    categories: ["Model", "Voice"],
    recent_campaigns: [
      { brand: "& Other Stories", earnings: 2800, date: "2025-01-20" },
      { brand: "Arket", earnings: 1500, date: "2025-01-08" },
      { brand: "Massimo Dutti", earnings: 900, date: "2024-12-18" },
    ],
  },
  {
    id: 5,
    name: "Matt",
    headshot:
      "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/eb5550a53_Screenshot2025-10-29at63527PM.png",
    status: "active",
    consent: "complete",
    verified: true,
    instagram_followers: 18600,
    assets_count: 29,
    last_campaign: "Aesop Skincare",
    usage_30d: 6,
    earnings_30d: 3600,
    license_expiry: "2025-10-12",
    top_brand: "Aesop",
    ai_usage_types: ["image", "video"],
    projected_earnings: 4300,
    engagement_rate: 4.5,
    bio: "Grooming and lifestyle model, skincare specialist",
    categories: ["Model", "Actor"],
    recent_campaigns: [
      { brand: "Aesop Skincare", earnings: 1900, date: "2025-01-22" },
      { brand: "Le Labo", earnings: 1000, date: "2025-01-10" },
      { brand: "Byredo", earnings: 700, date: "2024-12-30" },
    ],
  },
  {
    id: 6,
    name: "Carla",
    headshot:
      "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/cf591ec97_Screenshot2025-10-29at63544PM.png",
    status: "active",
    consent: "complete",
    verified: true,
    instagram_followers: 53400,
    assets_count: 61,
    last_campaign: "Reformation",
    usage_30d: 13,
    earnings_30d: 6800,
    license_expiry: "2025-11-08",
    top_brand: "Reformation",
    ai_usage_types: ["video", "image"],
    projected_earnings: 8200,
    engagement_rate: 7.1,
    bio: "Sustainable fashion advocate and lifestyle creator",
    categories: ["Model", "Creator"],
    recent_campaigns: [
      { brand: "Reformation", earnings: 3200, date: "2025-01-25" },
      { brand: "Patagonia", earnings: 2100, date: "2025-01-12" },
      { brand: "Girlfriend Collective", earnings: 1500, date: "2024-12-28" },
    ],
  },
  {
    id: 7,
    name: "Luisa",
    headshot:
      "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/dfe7c47ac_Screenshot2025-10-29at63612PM.png",
    status: "active",
    consent: "complete",
    verified: true,
    instagram_followers: 6200,
    assets_count: 36,
    last_campaign: "Ganni",
    usage_30d: 8,
    earnings_30d: 4200,
    license_expiry: "2025-06-20",
    top_brand: "Ganni",
    ai_usage_types: ["image", "video"],
    projected_earnings: 5100,
    engagement_rate: 5.3,
    bio: "Contemporary fashion model with Scandinavian aesthetic",
    categories: ["Model"],
    recent_campaigns: [
      { brand: "Ganni", earnings: 2200, date: "2025-01-19" },
      { brand: "Baum und Pferdgarten", earnings: 1200, date: "2025-01-05" },
      { brand: "Samsøe Samsøe", earnings: 800, date: "2024-12-20" },
    ],
  },
  {
    id: 8,
    name: "Clemence",
    headshot:
      "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/ee3aae03f_Screenshot2025-10-29at63651PM.png",
    status: "active",
    consent: "complete",
    verified: true,
    instagram_followers: 32200,
    assets_count: 47,
    last_campaign: "COS Minimalist",
    usage_30d: 10,
    earnings_30d: 5400,
    license_expiry: "2025-08-28",
    top_brand: "COS",
    ai_usage_types: ["image"],
    projected_earnings: 6200,
    engagement_rate: 5.8,
    bio: "Minimalist fashion and editorial model",
    categories: ["Model"],
    recent_campaigns: [
      { brand: "COS Minimalist", earnings: 2600, date: "2025-01-23" },
      { brand: "Filippa K", earnings: 1600, date: "2025-01-10" },
      { brand: "Toteme", earnings: 1200, date: "2024-12-25" },
    ],
  },
  {
    id: 9,
    name: "Lina",
    headshot:
      "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/ac71e274e_Screenshot2025-10-29at63715PM.png",
    status: "active",
    consent: "complete",
    verified: true,
    instagram_followers: 12700,
    assets_count: 28,
    last_campaign: "Sezane",
    usage_30d: 4,
    earnings_30d: 2400,
    license_expiry: "2025-09-15",
    top_brand: "Sezane",
    ai_usage_types: ["image"],
    projected_earnings: 2900,
    engagement_rate: 3.5,
    bio: "French-inspired lifestyle and fashion model",
    categories: ["Model", "Creator"],
    recent_campaigns: [
      { brand: "Sezane", earnings: 1400, date: "2025-01-17" },
      { brand: "Rouje", earnings: 600, date: "2025-01-02" },
      { brand: "Musier Paris", earnings: 400, date: "2024-12-18" },
    ],
  },
  {
    id: 10,
    name: "Aaron",
    headshot:
      "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/86e331be1_Screenshot2025-10-29at63806PM.png",
    status: "pending",
    consent: "missing",
    verified: false,
    instagram_followers: 2100,
    assets_count: 19,
    last_campaign: "—",
    usage_30d: 0,
    earnings_30d: 0,
    license_expiry: "—",
    top_brand: "—",
    ai_usage_types: [],
    projected_earnings: 0,
    engagement_rate: 2.8,
    bio: "Emerging talent, onboarding in progress",
    categories: ["Model"],
    recent_campaigns: [],
  },
];

// Mock licensing requests
const mockLicensingRequests = [
  {
    id: 1,
    brand: "Aime Leon Dore",
    campaign: "Holiday Gift Guide 2025",
    talent: ["Emma", "Milan"],
    budget: "$8,000 - $12,000",
    scope: "Social Media + E-commerce",
    regions: ["North America"],
    deadline: "2025-11-28",
    status: "reviewing",
  },
  {
    id: 2,
    brand: "Byredo",
    campaign: "Winter Fragrance Campaign",
    talent: ["Julia"],
    budget: "$15,000 - $20,000",
    scope: "Digital Campaign + Print",
    regions: ["North America", "Europe"],
    deadline: "2025-12-10",
    status: "negotiating",
  },
  {
    id: 3,
    brand: "Outdoor Voices",
    campaign: "Holiday Activewear Collection",
    talent: ["Carla", "Luisa"],
    budget: "$10,000 - $15,000",
    scope: "Social Media + Website",
    regions: ["North America"],
    deadline: "2025-12-05",
    status: "pending",
  },
];

// Mock notifications
const mockNotifications = [
  {
    id: 1,
    type: "license_expiry",
    message: "Julia's license expires in 15 days",
    time: "2 hours ago",
    unread: true,
  },
  {
    id: 2,
    type: "new_request",
    message: "New licensing request from Byredo",
    time: "5 hours ago",
    unread: true,
  },
  {
    id: 3,
    type: "payment",
    message: "Payment received: $5,200 from & Other Stories",
    time: "1 day ago",
    unread: false,
  },
  {
    id: 4,
    type: "talent_added",
    message: "Aaron added to roster (pending verification)",
    time: "2 days ago",
    unread: false,
  },
];

// Mock analytics data
const talentEarningsData = mockRoster
  .filter((t) => t.earnings_30d > 0)
  .map((t) => ({
    name: t.name,
    earnings: t.earnings_30d,
    projected: t.projected_earnings,
    campaigns: t.usage_30d,
  }))
  .sort((a, b) => b.earnings - a.earnings);

const monthlyTrendsData = [
  { month: "Jul", earnings: 28400, campaigns: 12, usages: 45 },
  { month: "Aug", earnings: 31200, campaigns: 15, usages: 52 },
  { month: "Sep", earnings: 29800, campaigns: 13, usages: 48 },
  { month: "Oct", earnings: 33600, campaigns: 18, usages: 61 },
  { month: "Nov", earnings: 37700, campaigns: 21, usages: 73 },
];

const clientEarningsData = [
  { name: "Glossier", value: 8200, campaigns: 5 },
  { name: "& Other Stories", value: 7800, campaigns: 4 },
  { name: "Reformation", value: 6800, campaigns: 3 },
  { name: "Carhartt WIP", value: 5400, campaigns: 4 },
  { name: "Aesop", value: 4200, campaigns: 3 },
  { name: "Others", value: 5300, campaigns: 8 },
];

const aiUsageTypeData = [
  { name: "Image", value: 45, color: "#3b82f6" },
  { name: "Video", value: 38, color: "#8b5cf6" },
  { name: "Voice", value: 17, color: "#ec4899" },
];

const consentStatusData = [
  { name: "Complete", value: 80, color: "#10b981" },
  { name: "Expiring", value: 10, color: "#f59e0b" },
  { name: "Missing", value: 10, color: "#ef4444" },
];

const geographicData = [
  { region: "North America", campaigns: 42, earnings: 28400 },
  { region: "Europe", campaigns: 18, earnings: 12200 },
  { region: "Asia-Pacific", campaigns: 8, earnings: 4100 },
  { region: "Global", campaigns: 5, earnings: 3000 },
];

export default function AgencyDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("roster");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTalent, setSelectedTalent] = useState(null);
  const [sortColumn, setSortColumn] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [statusFilter, setStatusFilter] = useState("all");
  const [consentFilter, setConsentFilter] = useState("all");
  const [rosterTab, setRosterTab] = useState("roster");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [analyticsTab, setAnalyticsTab] = useState("overview");
  const { toast } = useToast();

  const activeTalent = mockRoster.filter((t) => t.status === "active").length;
  const totalEarnings = mockRoster.reduce((sum, t) => sum + t.earnings_30d, 0);
  const activeCampaigns = new Set(
    mockRoster
      .filter((t) => t.last_campaign !== "—")
      .map((t) => t.last_campaign),
  ).size;
  const expiringLicenses = mockRoster.filter((t) => {
    if (t.license_expiry === "—") return false;
    const expiry = new Date(t.license_expiry);
    const now = new Date();
    const daysUntilExpiry =
      (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry < 30 && daysUntilExpiry > 0;
  }).length;

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const filteredRoster = mockRoster
    .filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (consentFilter !== "all" && t.consent !== consentFilter) return false;
      if (
        searchQuery &&
        !t.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

  const isLicenseExpiring = (expiryDate) => {
    if (expiryDate === "—") return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysUntilExpiry =
      (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry < 30 && daysUntilExpiry > 0;
  };

  const isLicenseExpired = (expiryDate) => {
    if (expiryDate === "—") return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    return expiry < now;
  };

  const { user } = useAuth();
  const {
    data: ownerKyc,
    isLoading: isOwnerKycLoading,
    refetch: refetchOwnerKyc,
  } = useQuery<KycStatusResponse | any>({
    queryKey: ["ownerKycStatus", user?.id],
    queryFn: () => fetchUserKycStatus(user!.id),
    enabled: !!user?.id,
  });

  const startOwnerKyc = async () => {
    if (!user?.id) return;
    try {
      const session = await createKycSession({ user_id: user.id });
      // If base client returns raw axios-like response, handle .session_url accordingly
      const url =
        (session as any)?.session_url || (session as any)?.data?.session_url;
      if (url) {
        window.location.href = url;
      } else {
        toast({ title: "Error", description: "Unable to start verification. Please try again later.", variant: "destructive" });
      }
    } catch (e) {
      console.error("Error starting KYC session", e);
      toast({ title: "Error", description: "Failed to start KYC verification.", variant: "destructive" });
    }
  };

  return (
    <React.Fragment>
      {/* KYC gate for Agency creation */}
      <div className="max-w-7xl mx-auto px-6 mt-6">
        {ownerKyc?.kyc_status === "approved" ? (
          <Button
            variant="default"
            onClick={() => navigate(createPageUrl("CreateAgency"))}
          >
            Create Agency
          </Button>
        ) : (
          <Card className="mb-4 p-4 border-2 border-dashed">
            <p className="text-sm text-gray-700">
              Identity verification is required to create and manage an Agency.
              Complete KYC to enable Agency tools.
            </p>
            <div className="mt-3">
              <Button
                onClick={startOwnerKyc}
                disabled={!user?.id || isOwnerKycLoading}
              >
                {isOwnerKycLoading ? "Checking..." : "Verify identity (KYC)"}
              </Button>
            </div>
          </Card>
        )}
      </div>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-3">
                  <img
                    src={mockAgency.logo}
                    alt="Agency"
                    className="w-10 h-10 object-contain"
                  />
                  <span className="text-xl font-bold text-gray-900">
                    {mockAgency.name}
                  </span>
                </div>

                <div className="hidden md:flex items-center gap-1">
                  <Button
                    variant={activeTab === "roster" ? "default" : "ghost"}
                    onClick={() => setActiveTab("roster")}
                    className="text-sm"
                  >
                    Roster
                  </Button>
                  <Button
                    variant={activeTab === "licensing" ? "default" : "ghost"}
                    onClick={() => setActiveTab("licensing")}
                    className="text-sm"
                  >
                    Licensing
                  </Button>
                  <Button
                    variant={activeTab === "usage" ? "default" : "ghost"}
                    onClick={() => setActiveTab("usage")}
                    className="text-sm"
                  >
                    Protect & Usage
                  </Button>
                  <Button
                    variant={activeTab === "royalties" ? "default" : "ghost"}
                    onClick={() => setActiveTab("royalties")}
                    className="text-sm"
                  >
                    Royalties
                  </Button>
                  <Button
                    variant={activeTab === "analytics" ? "default" : "ghost"}
                    onClick={() => setActiveTab("analytics")}
                    className="text-sm"
                  >
                    Analytics
                  </Button>
                  <Button
                    variant={activeTab === "settings" ? "default" : "ghost"}
                    onClick={() => setActiveTab("settings")}
                    className="text-sm"
                  >
                    Settings
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon">
                  <Search className="w-5 h-5" />
                </Button>

                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    onMouseEnter={() => setShowNotifications(true)}
                    onMouseLeave={() => setShowNotifications(false)}
                    className="relative"
                  >
                    <Bell className="w-5 h-5" />
                    {mockNotifications.filter((n) => n.unread).length > 0 && (
                      <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
                    )}
                  </Button>

                  {showNotifications && (
                    <div
                      className="absolute right-0 mt-2 w-96 bg-white border-2 border-gray-200 shadow-xl z-50"
                      onMouseEnter={() => setShowNotifications(true)}
                      onMouseLeave={() => setShowNotifications(false)}
                    >
                      <div className="p-4 border-b border-gray-200">
                        <h3 className="font-bold text-gray-900">
                          Notifications
                        </h3>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {mockNotifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${notification.unread ? "bg-blue-50" : ""}`}
                          >
                            <p className="text-sm text-gray-900 mb-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500">
                              {notification.time}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="p-3 border-t border-gray-200 text-center">
                        <Button
                          variant="ghost"
                          className="text-sm text-indigo-600 hover:text-indigo-700"
                        >
                          View all notifications
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <Button variant="ghost" size="icon">
                  <HelpCircle className="w-5 h-5" />
                </Button>

                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                  >
                    <User className="w-5 h-5" />
                  </Button>

                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-72 bg-white border-2 border-gray-200 shadow-xl z-50">
                      <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center gap-3 mb-2">
                          <img
                            src={mockAgency.logo}
                            alt="Agency"
                            className="w-12 h-12 object-contain"
                          />
                          <div>
                            <p className="font-bold text-gray-900">
                              {mockAgency.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              Agency Account
                            </p>
                          </div>
                        </div>
                        <span className="bg-green-100 text-green-800 text-xs">
                          <Shield className="w-3 h-3 mr-1" />
                          Verified
                        </span>
                      </div>

                      <div className="p-2">
                        <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left">
                          <Building2 className="w-4 h-4 text-gray-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Organization Settings
                            </p>
                            <p className="text-xs text-gray-500">
                              Manage company profile
                            </p>
                          </div>
                        </button>

                        <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left">
                          <UserCog className="w-4 h-4 text-gray-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Team & Permissions
                            </p>
                            <p className="text-xs text-gray-500">
                              {mockAgency.seats_used} active users
                            </p>
                          </div>
                        </button>

                        <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left">
                          <CreditCard className="w-4 h-4 text-gray-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Billing & Subscription
                            </p>
                            <p className="text-xs text-gray-500">
                              Agency Pro Plan
                            </p>
                          </div>
                        </button>

                        <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left">
                          <FileTextIcon className="w-4 h-4 text-gray-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Legal & Compliance
                            </p>
                            <p className="text-xs text-gray-500">
                              Contracts, terms, privacy
                            </p>
                          </div>
                        </button>

                        <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left">
                          <LinkIcon className="w-4 h-4 text-gray-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Integrations
                            </p>
                            <p className="text-xs text-gray-500">
                              Stripe, ElevenLabs connected
                            </p>
                          </div>
                        </button>
                      </div>

                      <div className="p-2 border-t border-gray-200">
                        <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left text-red-600">
                          <LogOut className="w-4 h-4" />
                          <span className="text-sm font-medium">Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex gap-4 mb-6">
            <div className="flex-1 py-2 px-4 bg-blue-50 border border-blue-300 rounded-none">
              <div className="text-blue-900 text-sm font-medium">
                <strong>Demo Mode:</strong> This is a preview of the Agency
                Dashboard for talent and modeling agencies.
              </div>
            </div>
          </div>

          {activeTab === "roster" && (
            <div className="space-y-6">
              <Card className="p-6 bg-white border-2 border-gray-200">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex gap-6">
                    <img
                      src={mockAgency.logo}
                      alt={mockAgency.name}
                      className="w-20 h-20 object-contain border-2 border-gray-200"
                    />
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        {mockAgency.name}
                      </h1>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="bg-green-500 text-white">
                          <Shield className="w-3 h-3 mr-1" />
                          Verified Agency
                        </span>
                        <span
                          className={
                            mockAgency.marketplace_visible
                              ? "bg-blue-500 text-white"
                              : "bg-gray-400 text-white"
                          }
                        >
                          Marketplace:{" "}
                          {mockAgency.marketplace_visible
                            ? "Public"
                            : "Private"}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {mockAgency.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Globe className="w-4 h-4" />
                          {mockAgency.website}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="border-2 border-gray-300"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                    <Button
                      variant="outline"
                      className="border-2 border-gray-300"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Marketplace
                    </Button>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-gray-700">
                      Stripe Connected
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-gray-700">
                      ElevenLabs Connected
                    </span>
                  </div>
                  <div className="flex items-center gap-3 group relative cursor-pointer">
                    <Users className="w-5 h-5 text-gray-600" />
                    <span className="text-sm text-gray-700">
                      {mockAgency.seats_used} / {mockAgency.seats_total} seats
                      used
                    </span>
                    <div className="absolute left-0 top-full mt-2 bg-gray-900 text-white text-xs px-3 py-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      Add more seats (you have{" "}
                      {mockAgency.seats_total - mockAgency.seats_used} left)
                    </div>
                  </div>
                </div>
              </Card>

              <div className="grid md:grid-cols-4 gap-6">
                <Card className="p-6 bg-white border-2 border-gray-300 rounded-none">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1 font-medium">
                        Active Talent
                      </p>
                      <p className="text-4xl font-bold text-gray-900">
                        {activeTalent}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        of {mockRoster.length} total
                      </p>
                    </div>
                    <Users className="w-12 h-12 text-gray-400" />
                  </div>
                </Card>

                <Card className="p-6 bg-white border-2 border-gray-300 rounded-none">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1 font-medium">
                        Monthly Earnings
                      </p>
                      <p className="text-4xl font-bold text-gray-900">
                        ${(totalEarnings / 1000).toFixed(1)}K
                      </p>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        +12% vs last month
                      </p>
                    </div>
                    <DollarSign className="w-12 h-12 text-gray-400" />
                  </div>
                </Card>

                <Card className="p-6 bg-white border-2 border-gray-300 rounded-none">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1 font-medium">
                        Active Campaigns
                      </p>
                      <p className="text-4xl font-bold text-gray-900">
                        {activeCampaigns}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        across all talent
                      </p>
                    </div>
                    <FileText className="w-12 h-12 text-gray-400" />
                  </div>
                </Card>

                <Card className="p-6 bg-white border-2 border-gray-300 rounded-none">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1 font-medium">
                        Expiring Licenses
                      </p>
                      <p className="text-4xl font-bold text-gray-900">
                        {expiringLicenses}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        require renewal
                      </p>
                    </div>
                    <AlertCircle className="w-12 h-12 text-gray-400" />
                  </div>
                </Card>
              </div>

              <Card className="p-6 bg-white border-2 border-gray-200">
                <Tabs value={rosterTab} onValueChange={setRosterTab}>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <button onClick={() => setRosterTab("roster")}>
                        Roster
                      </button>
                      <button onClick={() => setRosterTab("campaigns")}>
                        Campaigns
                      </button>
                      <button onClick={() => setRosterTab("licenses")}>
                        Licenses
                      </button>
                      <button onClick={() => setRosterTab("analytics")}>
                        Analytics
                        <span className="ml-2 bg-indigo-600 text-white text-xs">
                          Pro
                        </span>
                      </button>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="border-2 border-gray-300"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                      </Button>
                      <Button
                        onClick={() => navigate(createPageUrl("AddTalent"))}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Talent
                      </Button>
                    </div>
                  </div>

                  <div className="mt-0">
                    <div className="flex flex-wrap gap-4 mb-6 pb-6 border-b border-gray-200">
                      <div className="flex-1 min-w-[200px]">
                        <Input
                          placeholder="Search talent..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="border-2 border-gray-300"
                        />
                      </div>

                      <div className="w-40 border-2 border-gray-300">
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                        >
                          <option value="all">All Status</option>
                          <option value="active">Active</option>
                          <option value="pending">Pending</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>

                      <div className="w-40 border-2 border-gray-300">
                        <select
                          value={consentFilter}
                          onChange={(e) => setConsentFilter(e.target.value)}
                        >
                          <option value="all">All Consent</option>
                          <option value="complete">Complete</option>
                          <option value="expiring">Expiring</option>
                          <option value="missing">Missing</option>
                        </select>
                      </div>

                      {(searchQuery ||
                        statusFilter !== "all" ||
                        consentFilter !== "all") && (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setSearchQuery("");
                            setStatusFilter("all");
                            setConsentFilter("all");
                          }}
                          className="text-gray-600"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Clear Filters
                        </Button>
                      )}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left">
                              <button
                                onClick={() => handleSort("name")}
                                className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase hover:text-gray-900"
                              >
                                Talent
                                <ArrowUpDown className="w-3 h-3" />
                              </button>
                            </th>
                            <th className="px-4 py-3 text-left">
                              <button
                                onClick={() => handleSort("status")}
                                className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase hover:text-gray-900"
                              >
                                Status
                                <ArrowUpDown className="w-3 h-3" />
                              </button>
                            </th>
                            <th className="px-4 py-3 text-left">
                              <button
                                onClick={() => handleSort("consent")}
                                className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase hover:text-gray-900"
                              >
                                Consent
                                <ArrowUpDown className="w-3 h-3" />
                              </button>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                              AI Usage
                            </th>
                            <th className="px-4 py-3 text-left">
                              <button
                                onClick={() =>
                                  handleSort("instagram_followers")
                                }
                                className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase hover:text-gray-900"
                              >
                                Followers
                                <ArrowUpDown className="w-3 h-3" />
                              </button>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                              Assets
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                              Top Brand
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                              License Expiry
                            </th>
                            <th className="px-4 py-3 text-left">
                              <button
                                onClick={() => handleSort("earnings_30d")}
                                className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase hover:text-gray-900"
                              >
                                30D Earnings
                                <ArrowUpDown className="w-3 h-3" />
                              </button>
                            </th>
                            <th className="px-4 py-3 text-left">
                              <button
                                onClick={() => handleSort("projected_earnings")}
                                className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase hover:text-gray-900"
                              >
                                Projected
                                <ArrowUpDown className="w-3 h-3" />
                              </button>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {filteredRoster.map((talent) => (
                            <tr
                              key={talent.id}
                              onClick={() => setSelectedTalent(talent)}
                              className="hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={talent.headshot}
                                    alt={talent.name}
                                    className="w-12 h-12 object-cover border-2 border-gray-200"
                                  />
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-gray-900">
                                        {talent.name}
                                      </span>
                                      {talent.verified && (
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                      )}
                                    </div>
                                    <span className="text-xs text-gray-500">
                                      {talent.categories.join(", ")}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <span
                                  className={
                                    talent.status === "active"
                                      ? "bg-green-100 text-green-800"
                                      : talent.status === "pending"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-gray-100 text-gray-800"
                                  }
                                >
                                  {talent.status}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <span
                                  className={
                                    talent.consent === "complete"
                                      ? "bg-green-100 text-green-800"
                                      : talent.consent === "expiring"
                                        ? "bg-orange-100 text-orange-800"
                                        : "bg-red-100 text-red-800"
                                  }
                                >
                                  {talent.consent === "expiring" ? (
                                    <Clock className="w-3 h-3 mr-1" />
                                  ) : talent.consent === "missing" ? (
                                    <XCircle className="w-3 h-3 mr-1" />
                                  ) : (
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                  )}
                                  {talent.consent}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex gap-1">
                                  {talent.ai_usage_types.includes("video") && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      <Video className="w-3 h-3 mr-1" />
                                      Video
                                    </Badge>
                                  )}
                                  {talent.ai_usage_types.includes("image") && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      <ImageIcon className="w-3 h-3 mr-1" />
                                      Image
                                    </Badge>
                                  )}
                                  {talent.ai_usage_types.includes("voice") && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      <Mic className="w-3 h-3 mr-1" />
                                      Voice
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-1 text-sm text-gray-700">
                                  <Instagram className="w-4 h-4 text-purple-600" />
                                  {talent.instagram_followers.toLocaleString()}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-700">
                                {talent.assets_count}
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-700">
                                {talent.top_brand}
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-sm ${isLicenseExpired(talent.license_expiry) ? "text-red-600 font-medium" : isLicenseExpiring(talent.license_expiry) ? "text-orange-600 font-medium" : "text-gray-700"}`}
                                  >
                                    {talent.license_expiry !== "—"
                                      ? new Date(
                                          talent.license_expiry,
                                        ).toLocaleDateString()
                                      : "—"}
                                  </span>
                                  {isLicenseExpiring(talent.license_expiry) && (
                                    <Clock className="w-4 h-4 text-orange-500" />
                                  )}
                                  {isLicenseExpired(talent.license_expiry) && (
                                    <XCircle className="w-4 h-4 text-red-500" />
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-sm font-medium text-gray-900">
                                ${talent.earnings_30d.toLocaleString()}
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-700">
                                ${talent.projected_earnings.toLocaleString()}
                              </td>
                              <td className="px-4 py-4">
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <div className="text-center py-12">
                      <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">
                        Campaign tracking coming soon
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="text-center py-12">
                      <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">
                        License management coming soon
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="text-center py-12">
                      <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg mb-2">
                        Advanced Analytics
                      </p>
                      <p className="text-gray-400 text-sm mb-6">
                        Upgrade to Agency Pro to unlock revenue forecasting,
                        performance charts, and insights.
                      </p>
                      <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        Upgrade to Pro
                      </Button>
                    </div>
                  </div>
                </Tabs>
              </Card>
            </div>
          )}

          {activeTab === "licensing" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  Licensing Requests
                </h2>
                <Button variant="outline" className="border-2 border-gray-300">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </div>

              <div className="grid gap-6">
                {mockLicensingRequests.map((request) => (
                  <Card
                    key={request.id}
                    className="p-6 bg-white border-2 border-black rounded-none hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {request.brand}
                        </h3>
                        <p className="text-lg text-gray-700 mb-3">
                          {request.campaign}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {request.talent.map((name) => (
                            <span
                              key={name}
                              className="bg-indigo-100 text-indigo-800"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span
                        className={
                          request.status === "reviewing"
                            ? "bg-blue-100 text-blue-800"
                            : request.status === "negotiating"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                        }
                      >
                        {request.status}
                      </span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">
                          Budget Range
                        </p>
                        <p className="text-base font-medium text-gray-900">
                          {request.budget}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">
                          Usage Scope
                        </p>
                        <p className="text-base font-medium text-gray-900">
                          {request.scope}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Regions</p>
                        <p className="text-base font-medium text-gray-900">
                          {request.regions.join(", ")}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Deadline</p>
                        <p className="text-base font-medium text-gray-900 flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(request.deadline).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 border-2 border-gray-300"
                      >
                        Counter Offer
                      </Button>
                      <Button
                        variant="outline"
                        className="border-2 border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Decline
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === "usage" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Protect & Usage Tracking
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="p-6 bg-white border-2 border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">
                    Total Detections (30d)
                  </p>
                  <p className="text-4xl font-bold text-gray-900">35</p>
                </Card>
                <Card className="p-6 bg-white border-2 border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">Unique Campaigns</p>
                  <p className="text-4xl font-bold text-gray-900">8</p>
                </Card>
                <Card className="p-6 bg-white border-2 border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">Top Region</p>
                  <p className="text-4xl font-bold text-gray-900">NA</p>
                </Card>
              </div>
              <Card className="p-6 bg-white border-2 border-gray-200">
                <p className="text-center text-gray-500 py-12">
                  Usage tracking data will appear here once campaigns are live
                </p>
              </Card>
            </div>
          )}

          {activeTab === "royalties" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  Royalties & Payouts
                </h2>
                <Button variant="outline" className="border-2 border-gray-300">
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </Button>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="p-6 bg-white border-2 border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">
                    Accrued This Month
                  </p>
                  <p className="text-4xl font-bold text-gray-900">$8,450</p>
                </Card>
                <Card className="p-6 bg-white border-2 border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">Pending Approval</p>
                  <p className="text-4xl font-bold text-gray-900">$3,200</p>
                </Card>
                <Card className="p-6 bg-white border-2 border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">Paid YTD</p>
                  <p className="text-4xl font-bold text-gray-900">$124,800</p>
                </Card>
              </div>
              <Card className="p-6 bg-white border-2 border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Top Earning Talent
                </h3>
                <div className="space-y-3">
                  {mockRoster
                    .filter((t) => t.earnings_30d > 0)
                    .map((talent) => (
                      <div
                        key={talent.id}
                        className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={talent.headshot}
                            alt={talent.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <span className="font-medium text-gray-900">
                            {talent.name}
                          </span>
                        </div>
                        <span className="text-lg font-bold text-gray-900">
                          ${talent.earnings_30d.toLocaleString()}
                        </span>
                      </div>
                    ))}
                </div>
              </Card>
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-gray-900">
                  Analytics Dashboard
                </h2>
                <Button variant="outline" className="border-2 border-gray-300">
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </Button>
              </div>

              <Tabs value={analyticsTab} onValueChange={setAnalyticsTab}>
                <div className="border-b border-gray-200">
                  <button onClick={() => setAnalyticsTab("overview")}>
                    Overview
                  </button>
                  <button onClick={() => setAnalyticsTab("roster")}>
                    Roster Insights
                  </button>
                  <button onClick={() => setAnalyticsTab("clients")}>
                    Clients & Campaigns
                  </button>
                  <button onClick={() => setAnalyticsTab("compliance")}>
                    Compliance
                  </button>
                </div>

                <div className="space-y-6 mt-6">
                  <div className="grid md:grid-cols-4 gap-6">
                    <Card className="p-6 bg-white border-2 border-black rounded-none">
                      <div className="flex items-center justify-between mb-4">
                        <DollarSign className="w-8 h-8 text-green-600" />
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        Total Earnings (30d)
                      </p>
                      <p className="text-3xl font-bold text-gray-900">
                        ${totalEarnings.toLocaleString()}
                      </p>
                      <p className="text-xs text-green-600 mt-2">
                        +12% vs last period
                      </p>
                    </Card>

                    <Card className="p-6 bg-white border-2 border-black rounded-none">
                      <div className="flex items-center justify-between mb-4">
                        <BarChart3 className="w-8 h-8 text-blue-600" />
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        Active Campaigns
                      </p>
                      <p className="text-3xl font-bold text-gray-900">
                        {activeCampaigns}
                      </p>
                      <p className="text-xs text-blue-600 mt-2">
                        Across {activeTalent} talent
                      </p>
                    </Card>

                    <Card className="p-6 bg-white border-2 border-black rounded-none">
                      <div className="flex items-center justify-between mb-4">
                        <Activity className="w-8 h-8 text-purple-600" />
                        <TrendingUp className="w-4 h-4 text-purple-600" />
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        AI Usages (30d)
                      </p>
                      <p className="text-3xl font-bold text-gray-900">73</p>
                      <p className="text-xs text-purple-600 mt-2">
                        +18% vs last period
                      </p>
                    </Card>

                    <Card className="p-6 bg-white border-2 border-black rounded-none">
                      <div className="flex items-center justify-between mb-4">
                        <Target className="w-8 h-8 text-orange-600" />
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        Avg Campaign Value
                      </p>
                      <p className="text-3xl font-bold text-gray-900">$1,796</p>
                      <p className="text-xs text-orange-600 mt-2">
                        {expiringLicenses} expiring soon
                      </p>
                    </Card>
                  </div>

                  <Card className="p-6 bg-white border-2 border-black rounded-none">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">
                      Monthly Performance Trends
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={monthlyTrendsData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="month" stroke="#6b7280" />
                        <YAxis stroke="#6b7280" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "2px solid #000",
                            borderRadius: 0,
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="earnings"
                          stroke="#10b981"
                          strokeWidth={3}
                          name="Earnings ($)"
                        />
                        <Line
                          type="monotone"
                          dataKey="campaigns"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          name="Campaigns"
                        />
                        <Line
                          type="monotone"
                          dataKey="usages"
                          stroke="#8b5cf6"
                          strokeWidth={3}
                          name="AI Usages"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>

                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className="p-6 bg-white border-2 border-black rounded-none">
                      <h3 className="text-lg font-bold text-gray-900 mb-6">
                        AI Usage Type Distribution
                      </h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <RechartsPieChart>
                          <Pie
                            data={aiUsageTypeData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value }) => `${name}: ${value}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {aiUsageTypeData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </Card>

                    <Card className="p-6 bg-white border-2 border-black rounded-none">
                      <h3 className="text-lg font-bold text-gray-900 mb-6">
                        Consent Status Breakdown
                      </h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <RechartsPieChart>
                          <Pie
                            data={consentStatusData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value }) => `${name}: ${value}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {consentStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </Card>
                  </div>
                </div>

                <div className="space-y-6 mt-6">
                  <Card className="p-6 bg-white border-2 border-black rounded-none">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">
                      Earnings by Talent (Last 30 Days)
                    </h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={talentEarningsData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" stroke="#6b7280" />
                        <YAxis stroke="#6b7280" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "2px solid #000",
                            borderRadius: 0,
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="earnings"
                          fill="#10b981"
                          name="30D Earnings ($)"
                        />
                        <Bar
                          dataKey="projected"
                          fill="#3b82f6"
                          name="Projected ($)"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>

                  <div className="grid md:grid-cols-3 gap-6">
                    <Card className="p-6 bg-white border-2 border-black rounded-none">
                      <h4 className="font-bold text-gray-900 mb-4">
                        Top Performer (Earnings)
                      </h4>
                      <div className="flex items-center gap-3 mb-3">
                        <img
                          src={mockRoster[5].headshot}
                          alt="Carla"
                          className="w-16 h-16 object-cover border-2 border-black"
                        />
                        <div>
                          <p className="font-bold text-xl text-gray-900">
                            Carla
                          </p>
                          <p className="text-2xl font-bold text-green-600">
                            ${mockRoster[5].earnings_30d.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        {mockRoster[5].usage_30d} campaigns •{" "}
                        {mockRoster[5].engagement_rate}% engagement
                      </p>
                    </Card>

                    <Card className="p-6 bg-white border-2 border-black rounded-none">
                      <h4 className="font-bold text-gray-900 mb-4">
                        Most Active (Campaigns)
                      </h4>
                      <div className="flex items-center gap-3 mb-3">
                        <img
                          src={mockRoster[3].headshot}
                          alt="Julia"
                          className="w-16 h-16 object-cover border-2 border-black"
                        />
                        <div>
                          <p className="font-bold text-xl text-gray-900">
                            Julia
                          </p>
                          <p className="text-2xl font-bold text-blue-600">
                            {mockRoster[3].usage_30d} uses
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        ${mockRoster[3].earnings_30d.toLocaleString()} earnings
                        • {mockRoster[3].engagement_rate}% engagement
                      </p>
                    </Card>

                    <Card className="p-6 bg-white border-2 border-black rounded-none">
                      <h4 className="font-bold text-gray-900 mb-4">
                        Highest Engagement
                      </h4>
                      <div className="flex items-center gap-3 mb-3">
                        <img
                          src={mockRoster[5].headshot}
                          alt="Carla"
                          className="w-16 h-16 object-cover border-2 border-black"
                        />
                        <div>
                          <p className="font-bold text-xl text-gray-900">
                            Carla
                          </p>
                          <p className="text-2xl font-bold text-purple-600">
                            {mockRoster[5].engagement_rate}%
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        {mockRoster[5].instagram_followers.toLocaleString()}{" "}
                        followers • {mockRoster[5].usage_30d} campaigns
                      </p>
                    </Card>
                  </div>

                  <Card className="p-6 bg-white border-2 border-black rounded-none">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Talent Performance Metrics
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b-2 border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                              Talent
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                              30D Earnings
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                              Campaigns
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                              Avg Value
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                              Engagement
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {mockRoster
                            .filter((t) => t.earnings_30d > 0)
                            .map((talent) => (
                              <tr key={talent.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <img
                                      src={talent.headshot}
                                      alt={talent.name}
                                      className="w-8 h-8 object-cover"
                                    />
                                    <span className="font-medium text-gray-900">
                                      {talent.name}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 font-bold text-gray-900">
                                  ${talent.earnings_30d.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-gray-700">
                                  {talent.usage_30d}
                                </td>
                                <td className="px-4 py-3 text-gray-700">
                                  $
                                  {Math.round(
                                    talent.earnings_30d / talent.usage_30d,
                                  ).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-gray-700">
                                  {talent.engagement_rate}%
                                </td>
                                <td className="px-4 py-3">
                                  <span className="bg-green-100 text-green-800">
                                    Active
                                  </span>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>

                <div className="space-y-6 mt-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className="p-6 bg-white border-2 border-black rounded-none">
                      <h3 className="text-lg font-bold text-gray-900 mb-6">
                        Earnings by Client
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart>
                          <Pie
                            data={clientEarningsData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value }) =>
                              `${name}: $${(value / 1000).toFixed(1)}K`
                            }
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {clientEarningsData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={`hsl(${index * 60}, 70%, 50%)`}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </Card>

                    <Card className="p-6 bg-white border-2 border-black rounded-none">
                      <h3 className="text-lg font-bold text-gray-900 mb-6">
                        Geographic Distribution
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={geographicData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e5e7eb"
                          />
                          <XAxis dataKey="region" stroke="#6b7280" />
                          <YAxis stroke="#6b7280" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#fff",
                              border: "2px solid #000",
                              borderRadius: 0,
                            }}
                          />
                          <Bar
                            dataKey="campaigns"
                            fill="#3b82f6"
                            name="Campaigns"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  </div>

                  <Card className="p-6 bg-white border-2 border-black rounded-none">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Top Clients Performance
                    </h3>
                    <div className="space-y-4">
                      {clientEarningsData.slice(0, 5).map((client, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-4 bg-gray-50 border-2 border-gray-200 rounded-none"
                        >
                          <div>
                            <p className="font-bold text-gray-900">
                              {client.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {client.campaigns} campaigns
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-green-600">
                              ${client.value.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">
                              {((client.value / totalEarnings) * 100).toFixed(
                                1,
                              )}
                              % of total
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <div className="grid md:grid-cols-3 gap-6">
                    <Card className="p-6 bg-white border-2 border-black rounded-none">
                      <p className="text-sm text-gray-600 mb-2">
                        Repeat Client Rate
                      </p>
                      <p className="text-4xl font-bold text-gray-900">78%</p>
                      <Progress value={78} className="mt-3 h-2" />
                    </Card>

                    <Card className="p-6 bg-white border-2 border-black rounded-none">
                      <p className="text-sm text-gray-600 mb-2">
                        Avg Campaign Duration
                      </p>
                      <p className="text-4xl font-bold text-gray-900">
                        18 days
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        From booking to completion
                      </p>
                    </Card>

                    <Card className="p-6 bg-white border-2 border-black rounded-none">
                      <p className="text-sm text-gray-600 mb-2">
                        Client Acquisition
                      </p>
                      <p className="text-4xl font-bold text-gray-900">4</p>
                      <p className="text-xs text-green-600 mt-2">
                        New clients this quarter
                      </p>
                    </Card>
                  </div>
                </div>

                <div className="space-y-6 mt-6">
                  <div className="grid md:grid-cols-3 gap-6">
                    <Card className="p-6 bg-white border-2 border-black rounded-none">
                      <div className="flex items-center gap-3 mb-4">
                        <Shield className="w-8 h-8 text-green-600" />
                        <div>
                          <p className="text-sm text-gray-600">
                            Verification Rate
                          </p>
                          <p className="text-3xl font-bold text-gray-900">
                            100%
                          </p>
                        </div>
                      </div>
                      <Progress value={100} className="h-2" />
                      <p className="text-xs text-gray-500 mt-2">
                        All talent verified
                      </p>
                    </Card>

                    <Card className="p-6 bg-white border-2 border-black rounded-none">
                      <div className="flex items-center gap-3 mb-4">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                        <div>
                          <p className="text-sm text-gray-600">
                            Active Consents
                          </p>
                          <p className="text-3xl font-bold text-gray-900">
                            80%
                          </p>
                        </div>
                      </div>
                      <Progress value={80} className="h-2" />
                      <p className="text-xs text-gray-500 mt-2">
                        8 of 10 complete
                      </p>
                    </Card>

                    <Card className="p-6 bg-white border-2 border-black rounded-none">
                      <div className="flex items-center gap-3 mb-4">
                        <AlertCircle className="w-8 h-8 text-orange-600" />
                        <div>
                          <p className="text-sm text-gray-600">Expiring Soon</p>
                          <p className="text-3xl font-bold text-gray-900">
                            {expiringLicenses}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-orange-600 mt-2">
                        Next 30 days
                      </p>
                    </Card>
                  </div>

                  <Card className="p-6 bg-white border-2 border-black rounded-none">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      License Expiry Pipeline
                    </h3>
                    <div className="space-y-3">
                      {mockRoster
                        .filter((t) => t.consent === "expiring")
                        .map((talent) => (
                          <div
                            key={talent.id}
                            className="flex items-center justify-between p-4 bg-orange-50 border-2 border-orange-200 rounded-none"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={talent.headshot}
                                alt={talent.name}
                                className="w-10 h-10 object-cover"
                              />
                              <div>
                                <p className="font-bold text-gray-900">
                                  {talent.name}
                                </p>
                                <p className="text-sm text-gray-600">
                                  License expires{" "}
                                  {new Date(
                                    talent.license_expiry,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Renew
                            </Button>
                          </div>
                        ))}
                    </div>
                  </Card>

                  <Card className="p-6 bg-white border-2 border-black rounded-none">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Compliance Summary
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-gray-600 mb-3">
                          Consent Status Distribution
                        </p>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-700">
                              Complete
                            </span>
                            <span className="font-bold text-green-600">
                              8 (80%)
                            </span>
                          </div>
                          <Progress value={80} className="h-2" />

                          <div className="flex justify-between items-center mt-3">
                            <span className="text-sm text-gray-700">
                              Expiring
                            </span>
                            <span className="font-bold text-orange-600">
                              1 (10%)
                            </span>
                          </div>
                          <Progress value={10} className="h-2 bg-orange-200" />

                          <div className="flex justify-between items-center mt-3">
                            <span className="text-sm text-gray-700">
                              Missing
                            </span>
                            <span className="font-bold text-red-600">
                              1 (10%)
                            </span>
                          </div>
                          <Progress value={10} className="h-2 bg-red-200" />
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600 mb-3">
                          Likeness Protection
                        </p>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200">
                            <span className="text-sm text-gray-700">
                              Authorized Uses (30d)
                            </span>
                            <span className="font-bold text-green-600">73</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200">
                            <span className="text-sm text-gray-700">
                              Unauthorized Alerts
                            </span>
                            <span className="font-bold text-red-600">0</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200">
                            <span className="text-sm text-gray-700">
                              Disputes Resolved
                            </span>
                            <span className="font-bold text-blue-600">2</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </Tabs>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
              <Card className="p-6 bg-white border-2 border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Agency Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      Agency Name
                    </label>
                    <Input
                      value={mockAgency.name}
                      className="border-2 border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      Website
                    </label>
                    <Input
                      value={mockAgency.website}
                      className="border-2 border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      Location
                    </label>
                    <Input
                      value={mockAgency.location}
                      className="border-2 border-gray-300"
                    />
                  </div>
                </div>
              </Card>
              <Card className="p-6 bg-white border-2 border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Integrations
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-6 h-6 text-gray-700" />
                      <div>
                        <p className="font-medium text-gray-900">
                          Stripe Connect
                        </p>
                        <p className="text-sm text-gray-600">
                          Payouts & invoicing
                        </p>
                      </div>
                    </div>
                    <span className="bg-green-100 text-green-800">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Connected
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200">
                    <div className="flex items-center gap-3">
                      <LinkIcon className="w-6 h-6 text-gray-700" />
                      <div>
                        <p className="font-medium text-gray-900">ElevenLabs</p>
                        <p className="text-sm text-gray-600">Voice cloning</p>
                      </div>
                    </div>
                    <span className="bg-green-100 text-green-800">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Connected
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        {selectedTalent && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-end"
            onClick={() => setSelectedTalent(null)}
          >
            <div
              className="bg-white h-full w-full md:w-[600px] shadow-2xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
                <h2 className="text-2xl font-bold text-gray-900">
                  Talent Details
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedTalent(null)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex gap-6">
                  <img
                    src={selectedTalent.headshot}
                    alt={selectedTalent.name}
                    className="w-32 h-32 object-cover border-2 border-gray-200"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-2xl font-bold text-gray-900">
                        {selectedTalent.name}
                      </h3>
                      {selectedTalent.verified && (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {selectedTalent.categories.map((cat) => (
                        <span key={cat} className="text-xs">
                          {cat}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-gray-600">
                      {selectedTalent.bio}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4 bg-gray-50">
                    <p className="text-xs text-gray-600 mb-1">
                      Instagram Followers
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {selectedTalent.instagram_followers.toLocaleString()}
                    </p>
                  </Card>
                  <Card className="p-4 bg-gray-50">
                    <p className="text-xs text-gray-600 mb-1">
                      Engagement Rate
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {selectedTalent.engagement_rate}%
                    </p>
                  </Card>
                  <Card className="p-4 bg-gray-50">
                    <p className="text-xs text-gray-600 mb-1">Total Assets</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {selectedTalent.assets_count}
                    </p>
                  </Card>
                  <Card className="p-4 bg-gray-50">
                    <p className="text-xs text-gray-600 mb-1">30D Earnings</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${selectedTalent.earnings_30d.toLocaleString()}
                    </p>
                  </Card>
                </div>

                <Card className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-600" />
                    License Status
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Consent:</span>
                      <span
                        className={
                          selectedTalent.consent === "complete"
                            ? "bg-green-100 text-green-800"
                            : selectedTalent.consent === "expiring"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-red-100 text-red-800"
                        }
                      >
                        {selectedTalent.consent}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Expiry Date:</span>
                      <span
                        className={`font-medium ${isLicenseExpiring(selectedTalent.license_expiry) ? "text-orange-600" : "text-gray-900"}`}
                      >
                        {selectedTalent.license_expiry !== "—"
                          ? new Date(
                              selectedTalent.license_expiry,
                            ).toLocaleDateString()
                          : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">AI Usage:</span>
                      <div className="flex gap-1">
                        {selectedTalent.ai_usage_types.map((type) => (
                          <span key={type} className="text-xs capitalize">
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-600" />
                    Recent Campaigns
                  </h4>
                  {selectedTalent.recent_campaigns.length > 0 ? (
                    <div className="space-y-2">
                      {selectedTalent.recent_campaigns.map((campaign, idx) => (
                        <Card key={idx} className="p-4 bg-gray-50">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-gray-900">
                              {campaign.brand}
                            </span>
                            <span className="text-sm font-semibold text-green-600">
                              ${campaign.earnings.toLocaleString()}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(campaign.date).toLocaleDateString()}
                          </span>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No campaigns yet</p>
                  )}
                </div>

                <div className="space-y-3">
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Mail className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-2 border-gray-300"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Renew License
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-2 border-gray-300"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </React.Fragment>
  );
}
