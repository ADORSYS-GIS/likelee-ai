import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Trophy,
  Zap,
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

// Mock sports agency data
const mockAgency = {
  name: "Elite Sports Management",
  logo: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=200&h=200&fit=crop",
  website: "https://elitesportsmanagement.com",
  location: "United States",
  status: "verified",
  marketplace_visible: true,
  athletes_count: 42,
  active_athletes: 38,
  stripe_connected: true,
  elevenlabs_connected: true,
};

// Mock athlete roster
const mockAthletes = [
  {
    id: 1,
    name: "Kyson Blake",
    headshot:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop",
    school: "Auburn University",
    sport: "Football",
    position: "Quarterback",
    status: "active",
    consent: "complete",
    verified: true,
    social_followers: 125000,
    campaigns_30d: 5,
    earnings_30d: 4110,
    consent_expiry: "2025-12-31",
    top_brand: "Gatorade",
    ai_usage_types: ["video", "image"],
    projected_earnings: 5200,
    categories: ["Athlete", "NIL"],
    recent_campaigns: [
      { brand: "Gatorade", earnings: 1200, date: "2025-01-15" },
      { brand: "Nike", earnings: 1800, date: "2024-12-20" },
      { brand: "EA Sports", earnings: 1110, date: "2024-12-05" },
    ],
  },
  {
    id: 2,
    name: "Chloe Ramirez",
    headshot:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
    school: "UCLA",
    sport: "Basketball",
    position: "Point Guard",
    status: "active",
    consent: "complete",
    verified: true,
    social_followers: 89000,
    campaigns_30d: 4,
    earnings_30d: 2875,
    consent_expiry: "2026-01-15",
    top_brand: "Adidas",
    ai_usage_types: ["image", "video"],
    projected_earnings: 3400,
    categories: ["Athlete", "NIL"],
    recent_campaigns: [
      { brand: "Adidas", earnings: 1500, date: "2025-01-10" },
      { brand: "Gatorade", earnings: 875, date: "2024-12-28" },
      { brand: "Dick's Sporting Goods", earnings: 500, date: "2024-12-15" },
    ],
  },
  {
    id: 3,
    name: "Noah Singh",
    headshot:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
    school: "Clemson University",
    sport: "Track & Field",
    position: "Sprinter",
    status: "active",
    consent: "expiring",
    verified: true,
    social_followers: 34000,
    campaigns_30d: 2,
    earnings_30d: 610,
    consent_expiry: "2025-02-28",
    top_brand: "Nike",
    ai_usage_types: ["image"],
    projected_earnings: 900,
    categories: ["Athlete", "NIL"],
    recent_campaigns: [
      { brand: "Nike", earnings: 400, date: "2025-01-12" },
      { brand: "Red Bull", earnings: 210, date: "2024-12-20" },
    ],
  },
  {
    id: 4,
    name: "Jordan Martinez",
    headshot:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
    school: "Ohio State University",
    sport: "Football",
    position: "Wide Receiver",
    status: "active",
    consent: "complete",
    verified: true,
    social_followers: 156000,
    campaigns_30d: 7,
    earnings_30d: 6200,
    consent_expiry: "2025-11-30",
    top_brand: "Nike",
    ai_usage_types: ["video", "image", "voice"],
    projected_earnings: 7800,
    categories: ["Athlete", "NIL", "Voice"],
    recent_campaigns: [
      { brand: "Nike", earnings: 2800, date: "2025-01-18" },
      { brand: "Beats by Dre", earnings: 2100, date: "2025-01-05" },
      { brand: "Panini", earnings: 1300, date: "2024-12-22" },
    ],
  },
  {
    id: 5,
    name: "Maya Johnson",
    headshot:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop",
    school: "University of Texas",
    sport: "Volleyball",
    position: "Outside Hitter",
    status: "active",
    consent: "complete",
    verified: true,
    social_followers: 67000,
    campaigns_30d: 3,
    earnings_30d: 1850,
    consent_expiry: "2025-09-15",
    top_brand: "Under Armour",
    ai_usage_types: ["image", "video"],
    projected_earnings: 2300,
    categories: ["Athlete", "NIL"],
    recent_campaigns: [
      { brand: "Under Armour", earnings: 1100, date: "2025-01-14" },
      { brand: "Gatorade", earnings: 500, date: "2024-12-30" },
      { brand: "BodyArmor", earnings: 250, date: "2024-12-18" },
    ],
  },
];

// Mock NIL campaigns
const mockCampaigns = [
  {
    id: 1,
    name: "Refuel Mode",
    brand: "Gatorade",
    type: "AI Video",
    athletes: ["Kyson Blake"],
    start_date: "2025-11-01",
    duration: "30 days",
    budget: 1200,
    status: "active",
    usage_type: "Social Media + Digital",
  },
  {
    id: 2,
    name: "Hustle Season",
    brand: "Adidas",
    type: "Hybrid",
    athletes: ["Chloe Ramirez"],
    start_date: "2024-10-15",
    duration: "45 days",
    budget: 2800,
    status: "completed",
    usage_type: "Social Media + Print",
  },
  {
    id: 3,
    name: "Game Day Ready",
    brand: "Nike",
    type: "AI Image",
    athletes: ["Jordan Martinez", "Noah Singh"],
    start_date: "2025-01-10",
    duration: "60 days",
    budget: 4500,
    status: "active",
    usage_type: "E-commerce + Social",
  },
];

// Analytics data
const monthlyEarningsData = [
  { month: "Jul", earnings: 18400, campaigns: 12, athletes: 35 },
  { month: "Aug", earnings: 21200, campaigns: 15, athletes: 37 },
  { month: "Sep", earnings: 19800, campaigns: 13, athletes: 38 },
  { month: "Oct", earnings: 24600, campaigns: 18, athletes: 40 },
  { month: "Nov", earnings: 28200, campaigns: 21, athletes: 42 },
];

const sportDistributionData = [
  { name: "Football", value: 42, color: "#10b981" },
  { name: "Basketball", value: 28, color: "#3b82f6" },
  { name: "Baseball", value: 15, color: "#8b5cf6" },
  { name: "Track & Field", value: 10, color: "#f59e0b" },
  { name: "Other", value: 5, color: "#6b7280" },
];

const consentStatusData = [
  { name: "Complete", value: 85, color: "#10b981" },
  { name: "Expiring Soon", value: 10, color: "#f59e0b" },
  { name: "Renewal Required", value: 5, color: "#ef4444" },
];

export default function SportsAgencyDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("roster");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [sortColumn, setSortColumn] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [sportFilter, setSportFilter] = useState("all");
  const [consentFilter, setConsentFilter] = useState("all");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const totalEarnings = mockAthletes.reduce(
    (sum, a) => sum + a.earnings_30d,
    0,
  );
  const activeCampaigns = mockCampaigns.filter(
    (c) => c.status === "active",
  ).length;
  const expiringConsents = mockAthletes.filter(
    (a) => a.consent === "expiring",
  ).length;

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const filteredAthletes = mockAthletes
    .filter((a) => {
      if (sportFilter !== "all" && a.sport !== sportFilter) return false;
      if (consentFilter !== "all" && a.consent !== consentFilter) return false;
      if (
        searchQuery &&
        !a.name.toLowerCase().includes(searchQuery.toLowerCase())
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

  const isConsentExpiring = (expiryDate) => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry < 60 && daysUntilExpiry > 0;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <Trophy className="w-8 h-8 text-emerald-600" />
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
                  variant={activeTab === "campaigns" ? "default" : "ghost"}
                  onClick={() => setActiveTab("campaigns")}
                  className="text-sm"
                >
                  Campaigns
                </Button>
                <Button
                  variant={activeTab === "royalties" ? "default" : "ghost"}
                  onClick={() => setActiveTab("royalties")}
                  className="text-sm"
                >
                  Royalties
                </Button>
                <Button
                  variant={activeTab === "compliance" ? "default" : "ghost"}
                  onClick={() => setActiveTab("compliance")}
                  className="text-sm"
                >
                  Compliance
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
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
                </Button>

                {showNotifications && (
                  <div
                    className="absolute right-0 mt-2 w-80 bg-white border-2 border-gray-200 shadow-xl z-50"
                    onMouseEnter={() => setShowNotifications(true)}
                    onMouseLeave={() => setShowNotifications(false)}
                  >
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="font-bold text-gray-900">Notifications</h3>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray-600">
                        Noah Singh consent expires in 28 days
                      </p>
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
                      <p className="font-bold text-gray-900">
                        {mockAgency.name}
                      </p>
                      <p className="text-xs text-gray-500">Sports Agency</p>
                    </div>
                    <div className="p-2">
                      <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left">
                        <Settings className="w-4 h-4 text-gray-600" />
                        <span className="text-sm text-gray-900">
                          Agency Settings
                        </span>
                      </button>
                      <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left">
                        <LogOut className="w-4 h-4 text-gray-600" />
                        <span className="text-sm text-gray-900">Sign Out</span>
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
        {/* Demo Alert */}
        <Alert className="mb-6 py-2 px-4 bg-blue-50 border border-blue-300 rounded-none">
          <AlertDescription className="text-blue-900 text-sm font-medium">
            <strong>Demo Mode:</strong> This is a preview of the Sports Agency
            Dashboard for NIL management and athlete representation.
          </AlertDescription>
        </Alert>

        {activeTab === "roster" && (
          <div className="space-y-6">
            {/* Agency Overview */}
            <Card className="p-6 bg-white border-2 border-gray-200">
              <div className="flex items-start justify-between mb-6">
                <div className="flex gap-6">
                  <div className="w-20 h-20 bg-emerald-100 border-2 border-emerald-600 flex items-center justify-center">
                    <Trophy className="w-12 h-12 text-emerald-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      {mockAgency.name}
                    </h1>
                    <div className="flex items-center gap-3 mb-3">
                      <Badge className="bg-emerald-500 text-white">
                        <Shield className="w-3 h-3 mr-1" />
                        Verified Agency
                      </Badge>
                      <Badge className="bg-blue-500 text-white">
                        NIL Compliant
                      </Badge>
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
                </div>
              </div>
            </Card>

            {/* Key Metrics */}
            <div className="grid md:grid-cols-4 gap-6">
              <Card className="p-6 bg-white border-2 border-gray-300 rounded-none">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1 font-medium">
                      Active Athletes
                    </p>
                    <p className="text-4xl font-bold text-gray-900">
                      {mockAgency.active_athletes}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      of {mockAgency.athletes_count} total
                    </p>
                  </div>
                  <Users className="w-12 h-12 text-gray-400" />
                </div>
              </Card>

              <Card className="p-6 bg-white border-2 border-gray-300 rounded-none">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1 font-medium">
                      NIL Earnings (30d)
                    </p>
                    <p className="text-4xl font-bold text-gray-900">
                      ${(totalEarnings / 1000).toFixed(1)}K
                    </p>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      +15% vs last month
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
                      AI + Traditional
                    </p>
                  </div>
                  <Zap className="w-12 h-12 text-gray-400" />
                </div>
              </Card>

              <Card className="p-6 bg-white border-2 border-gray-300 rounded-none">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1 font-medium">
                      Consent Renewals
                    </p>
                    <p className="text-4xl font-bold text-gray-900">
                      {expiringConsents}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      require attention
                    </p>
                  </div>
                  <AlertCircle className="w-12 h-12 text-gray-400" />
                </div>
              </Card>
            </div>

            {/* Athlete Roster */}
            <Card className="p-6 bg-white border-2 border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Athlete Roster
                </h2>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="border-2 border-gray-300"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Athlete
                  </Button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-4 mb-6 pb-6 border-b border-gray-200">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="Search athletes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border-2 border-gray-300"
                  />
                </div>

                <Select value={sportFilter} onValueChange={setSportFilter}>
                  <SelectTrigger className="w-40 border-2 border-gray-300">
                    <SelectValue placeholder="Sport" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sports</SelectItem>
                    <SelectItem value="Football">Football</SelectItem>
                    <SelectItem value="Basketball">Basketball</SelectItem>
                    <SelectItem value="Track & Field">Track & Field</SelectItem>
                    <SelectItem value="Volleyball">Volleyball</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={consentFilter} onValueChange={setConsentFilter}>
                  <SelectTrigger className="w-40 border-2 border-gray-300">
                    <SelectValue placeholder="Consent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Consent</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                    <SelectItem value="expiring">Expiring</SelectItem>
                  </SelectContent>
                </Select>

                {(searchQuery ||
                  sportFilter !== "all" ||
                  consentFilter !== "all") && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSearchQuery("");
                        setSportFilter("all");
                        setConsentFilter("all");
                      }}
                      className="text-gray-600"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Clear
                    </Button>
                  )}
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <button
                          onClick={() => handleSort("name")}
                          className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase hover:text-gray-900"
                        >
                          Athlete
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        School
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        Sport
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
                          onClick={() => handleSort("social_followers")}
                          className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase hover:text-gray-900"
                        >
                          Followers
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        Campaigns
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
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        Consent Expiry
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredAthletes.map((athlete) => (
                      <tr
                        key={athlete.id}
                        onClick={() => setSelectedAthlete(athlete)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={athlete.headshot}
                              alt={athlete.name}
                              className="w-12 h-12 object-cover rounded-full border-2 border-gray-200"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">
                                  {athlete.name}
                                </span>
                                {athlete.verified && (
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                )}
                              </div>
                              <span className="text-xs text-gray-500">
                                {athlete.position}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          {athlete.school}
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant="outline">{athlete.sport}</Badge>
                        </td>
                        <td className="px-4 py-4">
                          <Badge
                            className={
                              athlete.consent === "complete"
                                ? "bg-green-100 text-green-800"
                                : "bg-orange-100 text-orange-800"
                            }
                          >
                            {athlete.consent === "complete" ? (
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                            ) : (
                              <Clock className="w-3 h-3 mr-1" />
                            )}
                            {athlete.consent}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-1">
                            {athlete.ai_usage_types.includes("video") && (
                              <Badge variant="outline" className="text-xs">
                                <Video className="w-3 h-3 mr-1" />
                                Video
                              </Badge>
                            )}
                            {athlete.ai_usage_types.includes("image") && (
                              <Badge variant="outline" className="text-xs">
                                <ImageIcon className="w-3 h-3 mr-1" />
                                Image
                              </Badge>
                            )}
                            {athlete.ai_usage_types.includes("voice") && (
                              <Badge variant="outline" className="text-xs">
                                <Mic className="w-3 h-3 mr-1" />
                                Voice
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          {athlete.social_followers.toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          {athlete.campaigns_30d}
                        </td>
                        <td className="px-4 py-4 text-sm font-medium text-gray-900">
                          ${athlete.earnings_30d.toLocaleString()}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm ${isConsentExpiring(athlete.consent_expiry) ? "text-orange-600 font-medium" : "text-gray-700"}`}
                            >
                              {new Date(
                                athlete.consent_expiry,
                              ).toLocaleDateString()}
                            </span>
                            {isConsentExpiring(athlete.consent_expiry) && (
                              <Clock className="w-4 h-4 text-orange-500" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "campaigns" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                NIL Campaigns
              </h2>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </div>

            <div className="grid gap-6">
              {mockCampaigns.map((campaign) => (
                <Card
                  key={campaign.id}
                  className="p-6 bg-white border-2 border-black rounded-none hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {campaign.name}
                      </h3>
                      <p className="text-lg text-gray-700 mb-3">
                        {campaign.brand}
                      </p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {campaign.athletes.map((name) => (
                          <Badge
                            key={name}
                            className="bg-emerald-100 text-emerald-800"
                          >
                            {name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Badge
                      className={
                        campaign.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }
                    >
                      {campaign.status}
                    </Badge>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Type</p>
                      <p className="text-base font-medium text-gray-900">
                        {campaign.type}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Budget</p>
                      <p className="text-base font-medium text-gray-900">
                        ${campaign.budget.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Start Date</p>
                      <p className="text-base font-medium text-gray-900">
                        {new Date(campaign.start_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Duration</p>
                      <p className="text-base font-medium text-gray-900">
                        {campaign.duration}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === "royalties" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                NIL Royalties
              </h2>
              <Button variant="outline" className="border-2 border-gray-300">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-6 bg-white border-2 border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Total This Month</p>
                <p className="text-4xl font-bold text-gray-900">
                  ${totalEarnings.toLocaleString()}
                </p>
              </Card>
              <Card className="p-6 bg-white border-2 border-gray-200">
                <p className="text-sm text-gray-600 mb-2">
                  Pending Distribution
                </p>
                <p className="text-4xl font-bold text-gray-900">$3,200</p>
              </Card>
              <Card className="p-6 bg-white border-2 border-gray-200">
                <p className="text-sm text-gray-600 mb-2">YTD Total</p>
                <p className="text-4xl font-bold text-gray-900">$184,600</p>
              </Card>
            </div>

            <Card className="p-6 bg-white border-2 border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Top Earning Athletes
              </h3>
              <div className="space-y-3">
                {mockAthletes
                  .filter((a) => a.earnings_30d > 0)
                  .sort((a, b) => b.earnings_30d - a.earnings_30d)
                  .map((athlete) => (
                    <div
                      key={athlete.id}
                      className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={athlete.headshot}
                          alt={athlete.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <span className="font-medium text-gray-900 block">
                            {athlete.name}
                          </span>
                          <span className="text-xs text-gray-600">
                            {athlete.school}
                          </span>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-gray-900">
                        ${athlete.earnings_30d.toLocaleString()}
                      </span>
                    </div>
                  ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === "compliance" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">NIL Compliance</h2>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-6 bg-white border-2 border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Verification Rate</p>
                    <p className="text-3xl font-bold text-gray-900">100%</p>
                  </div>
                </div>
                <Progress value={100} className="h-2" />
              </Card>

              <Card className="p-6 bg-white border-2 border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Active Consents</p>
                    <p className="text-3xl font-bold text-gray-900">85%</p>
                  </div>
                </div>
                <Progress value={85} className="h-2" />
              </Card>

              <Card className="p-6 bg-white border-2 border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="w-8 h-8 text-orange-600" />
                  <div>
                    <p className="text-sm text-gray-600">Expiring Soon</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {expiringConsents}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-6 bg-white border-2 border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Consent Renewals Required
              </h3>
              <div className="space-y-3">
                {mockAthletes
                  .filter((a) => a.consent === "expiring")
                  .map((athlete) => (
                    <div
                      key={athlete.id}
                      className="flex items-center justify-between p-4 bg-orange-50 border-2 border-orange-200 rounded-none"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={athlete.headshot}
                          alt={athlete.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-bold text-gray-900">
                            {athlete.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            Consent expires{" "}
                            {new Date(
                              athlete.consent_expiry,
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
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Analytics Dashboard
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 bg-white border-2 border-black rounded-none">
                <h3 className="text-lg font-bold text-gray-900 mb-6">
                  Monthly Performance
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyEarningsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "2px solid #000",
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
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6 bg-white border-2 border-black rounded-none">
                <h3 className="text-lg font-bold text-gray-900 mb-6">
                  Sport Distribution
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={sportDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {sportDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </Card>
            </div>
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
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Athlete Detail Panel */}
      {selectedAthlete && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-end"
          onClick={() => setSelectedAthlete(null)}
        >
          <div
            className="bg-white h-full w-full md:w-[600px] shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-gray-900">
                Athlete Details
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedAthlete(null)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex gap-6">
                <img
                  src={selectedAthlete.headshot}
                  alt={selectedAthlete.name}
                  className="w-32 h-32 object-cover rounded-full border-2 border-gray-200"
                />
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {selectedAthlete.name}
                  </h3>
                  <p className="text-gray-600 mb-2">{selectedAthlete.school}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{selectedAthlete.sport}</Badge>
                    <Badge variant="outline">{selectedAthlete.position}</Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 bg-gray-50">
                  <p className="text-xs text-gray-600 mb-1">Followers</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {selectedAthlete.social_followers.toLocaleString()}
                  </p>
                </Card>
                <Card className="p-4 bg-gray-50">
                  <p className="text-xs text-gray-600 mb-1">30D Earnings</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${selectedAthlete.earnings_30d.toLocaleString()}
                  </p>
                </Card>
              </div>

              <Card className="p-4 bg-emerald-50 border-2 border-emerald-200">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-600" />
                  NIL Status
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Consent:</span>
                    <Badge
                      className={
                        selectedAthlete.consent === "complete"
                          ? "bg-green-100 text-green-800"
                          : "bg-orange-100 text-orange-800"
                      }
                    >
                      {selectedAthlete.consent}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Expiry:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(
                        selectedAthlete.consent_expiry,
                      ).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Card>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">
                  Recent Campaigns
                </h4>
                {selectedAthlete.recent_campaigns.map((campaign, idx) => (
                  <Card key={idx} className="p-4 bg-gray-50 mb-2">
                    <div className="flex justify-between items-start">
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
