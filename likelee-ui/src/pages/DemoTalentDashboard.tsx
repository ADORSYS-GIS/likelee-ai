import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Play,
  Edit,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Crown,
  Lock,
  Sparkles,
  ExternalLink,
  DollarSign,
  TrendingUp,
  Download,
  Eye,
  Star,
  Package,
  QrCode,
  Share2,
  FileText,
  Zap,
  BarChart3,
  Palette,
} from "lucide-react";
import JobBoardContent from "@/components/JobBoardContent";

const mockPortfolio = {
  name: "Alex Chen",
  profile_photo:
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300",
  bio: "AI video creator specializing in cinematic storytelling and brand campaigns. 3+ years experience with cutting-edge AI tools.",
  hourly_rate: 150,
  project_rate_min: 2000,
  project_rate_max: 8000,
  availability: "available",
  available_for_collabs: true,
  skills_tags: [
    "AI Video Editing",
    "Lip-sync Animation",
    "Compositing",
    "Script-to-Video",
    "Color Grading",
  ],
  ai_tools: ["Sora", "Runway Gen-3", "Midjourney", "Pika Labs", "Fal AI"],
};

const mockProjects = [
  {
    id: "1",
    title: "Nike AI Campaign - 'Future of Sport'",
    description:
      "Created AI-generated campaign showcasing futuristic sports scenarios using Runway Gen-3 and custom prompting.",
    thumbnail_url:
      "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800",
    tools_used: ["Runway Gen-3", "Midjourney", "After Effects"],
    duration_seconds: 45,
    view_count: 342,
    is_featured: true,
  },
  {
    id: "2",
    title: "Short Film: 'Digital Dreams'",
    description:
      "Experimental short film exploring AI consciousness. Won Best AI Film at Digital Arts Festival 2024.",
    thumbnail_url:
      "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800",
    tools_used: ["Sora", "Pika Labs", "Fal AI"],
    duration_seconds: 180,
    view_count: 1523,
    is_featured: false,
  },
  {
    id: "3",
    title: "Product Demo Reel - Tech Startup",
    description:
      "AI-generated product showcase for SaaS startup. Clean, modern aesthetic with dynamic transitions.",
    thumbnail_url:
      "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800",
    tools_used: ["Midjourney", "Runway Gen-3", "DaVinci Resolve"],
    duration_seconds: 30,
    view_count: 856,
    is_featured: false,
  },
];

const mockActiveJobs = [
  {
    id: 1,
    title: "Brand Campaign for Nike",
    client: "Nike Inc.",
    status: "in_progress",
    deadline: "2025-02-15",
    payment_status: "pending",
    amount: 4500,
  },
  {
    id: 2,
    title: "Product Demo Video",
    client: "Tech Startup",
    status: "delivered",
    deadline: "2025-01-20",
    payment_status: "paid",
    amount: 2000,
  },
];

const mockApplications = [
  {
    id: 1,
    job_title: "AI Film Production Assistant",
    company: "Film Studio ABC",
    applied_date: "2025-01-18",
    status: "pending",
    budget: "$3,000 - $6,000",
  },
  {
    id: 2,
    job_title: "UGC Content Creator",
    company: "Beauty Brand",
    applied_date: "2025-01-16",
    status: "accepted",
    budget: "$1,200 - $2,500",
  },
  {
    id: 3,
    job_title: "AI Video Editor for Ads",
    company: "Marketing Agency",
    applied_date: "2025-01-14",
    status: "rejected",
    budget: "$800 - $1,500",
  },
];

const mockEarnings = {
  total_earned: 12450,
  pending_payment: 4500,
  completed_jobs: 8,
  average_job_value: 1556,
};

const mockPackageData = {
  display_name: "Alex Chen",
  role_title: "AI Video Artist | Motion Designer",
  short_bio:
    "I merge cinematic storytelling with generative AI tools to create immersive brand experiences.",
  skills_tools: [
    "Runway Gen-3",
    "Midjourney",
    "Sora",
    "After Effects",
    "DaVinci Resolve",
  ],
  portfolio_links: [
    "https://behance.net/alexchen",
    "https://tiktok.com/@alexchen",
  ],
  contact_email: "alex@example.com",
  packages_generated: 3,
  total_views: 127,
  total_downloads: 45,
};

const hairColors = [
  "Black",
  "Brown",
  "Blonde",
  "Red",
  "Gray/White",
  "Dyed (specify below)",
];
const eyeColors = ["Brown", "Blue", "Green", "Hazel", "Gray", "Amber"];
const skinTones = [
  "Fair",
  "Light",
  "Medium-Light",
  "Medium",
  "Medium-Dark",
  "Dark",
  "Deep",
];

export default function DemoTalentDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const { toast } = useToast();
  const [packageTab, setPackageTab] = useState("overview");
  const [portfolio] = useState(mockPortfolio);
  const [projects] = useState(mockProjects);
  const [packageData, setPackageData] = useState(mockPackageData);
  const [profileData, setProfileData] = useState({
    hairColor: "Brown",
    eyeColor: "Brown",
    skinTone: "Medium",
    height: "5'10\"",
  });
  const isPro = false;

  const handleGeneratePackage = () => {
    toast({
      title: "Info",
      description:
        "Package generated! (Demo mode - download would start in production)",
    });
  };

  const handleSaveProfile = () => {
    toast({ title: "Info", description: "Profile saved! (Demo mode)" });
    setShowEditProfileModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Demo Banner */}
        <div className="mb-8 bg-blue-50 border-2 border-blue-500 rounded-none p-4 flex items-start">
          <AlertCircle className="h-5 w-5 text-blue-600 mr-3" />
          <div className="text-blue-900 font-medium">
            <strong>Demo Mode:</strong> This is a preview of the AI Talent
            Dashboard with sample data. Sign up to create your real profile and
            start getting matched with opportunities!
            <Button
              onClick={() => navigate(createPageUrl("CreatorSignup"))}
              variant="outline"
              className="ml-4 h-8 bg-white text-blue-600 hover:bg-blue-50 border-2 border-blue-600 rounded-none"
            >
              Sign Up Now
            </Button>
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="bg-white border-2 border-gray-200 mb-8 rounded-none">
          <div className="flex items-center justify-between px-6 py-4 border-b-2 border-gray-200">
            <div className="flex items-center gap-4">
              <img
                src={portfolio.profile_photo}
                alt={portfolio.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-[#F18B6A]"
              />
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {portfolio.name}
                </h2>
                <p className="text-sm text-gray-600">AI Creator Dashboard</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowPackageModal(true)}
                variant="outline"
                className="border-2 border-[#32C8D1] text-[#32C8D1] hover:bg-[#32C8D1] hover:text-white rounded-none"
              >
                <Package className="w-4 h-4 mr-2" />
                Manage Likelee Package
              </Button>
              <Button
                onClick={() => setShowEditProfileModal(true)}
                variant="outline"
                className="border-2 border-gray-300 rounded-none"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          </div>

          <div className="flex overflow-x-auto px-2 py-2 gap-1">
            <Button
              variant={activeTab === "overview" ? "default" : "ghost"}
              onClick={() => setActiveTab("overview")}
              className="text-sm rounded-none whitespace-nowrap"
            >
              Overview
            </Button>
            <Button
              variant={activeTab === "job_board" ? "default" : "ghost"}
              onClick={() => setActiveTab("job_board")}
              className="text-sm rounded-none whitespace-nowrap"
            >
              Job Board
            </Button>
            <Button
              variant={activeTab === "my_jobs" ? "default" : "ghost"}
              onClick={() => setActiveTab("my_jobs")}
              className="text-sm rounded-none whitespace-nowrap"
            >
              My Jobs
            </Button>
            <Button
              variant={activeTab === "applications" ? "default" : "ghost"}
              onClick={() => setActiveTab("applications")}
              className="text-sm rounded-none whitespace-nowrap"
            >
              Applications
            </Button>
            <Button
              variant={activeTab === "portfolio" ? "default" : "ghost"}
              onClick={() => setActiveTab("portfolio")}
              className="text-sm rounded-none whitespace-nowrap"
            >
              Portfolio
            </Button>
            <Button
              variant={activeTab === "earnings" ? "default" : "ghost"}
              onClick={() => setActiveTab("earnings")}
              className="text-sm rounded-none whitespace-nowrap"
            >
              Earnings
            </Button>
            <Button
              variant={activeTab === "upgrade" ? "default" : "ghost"}
              onClick={() => setActiveTab("upgrade")}
              className="text-sm rounded-none whitespace-nowrap relative"
            >
              <Crown className="w-4 h-4 mr-1 text-amber-500" />
              Upgrade
            </Button>
          </div>
        </div>

        {/* Edit Profile Modal */}
        <Dialog
          open={showEditProfileModal}
          onOpenChange={setShowEditProfileModal}
        >
          <DialogContent className="max-w-2xl rounded-none">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                Edit Profile
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 mt-6">
              <div>
                <Label
                  htmlFor="hairColor"
                  className="text-sm font-medium text-gray-700 mb-2 block"
                >
                  Hair Color
                </Label>
                <Select
                  value={profileData.hairColor}
                  onValueChange={(value) =>
                    setProfileData({ ...profileData, hairColor: value })
                  }
                >
                  <SelectTrigger className="border-2 border-gray-300 rounded-none">
                    <SelectValue placeholder="Select hair color" />
                  </SelectTrigger>
                  <SelectContent>
                    {hairColors.map((color) => (
                      <SelectItem key={color} value={color}>
                        {color}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label
                  htmlFor="eyeColor"
                  className="text-sm font-medium text-gray-700 mb-2 block"
                >
                  Eye Color
                </Label>
                <Select
                  value={profileData.eyeColor}
                  onValueChange={(value) =>
                    setProfileData({ ...profileData, eyeColor: value })
                  }
                >
                  <SelectTrigger className="border-2 border-gray-300 rounded-none">
                    <SelectValue placeholder="Select eye color" />
                  </SelectTrigger>
                  <SelectContent>
                    {eyeColors.map((color) => (
                      <SelectItem key={color} value={color}>
                        {color}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label
                  htmlFor="skinTone"
                  className="text-sm font-medium text-gray-700 mb-2 block"
                >
                  Skin Tone
                </Label>
                <Select
                  value={profileData.skinTone}
                  onValueChange={(value) =>
                    setProfileData({ ...profileData, skinTone: value })
                  }
                >
                  <SelectTrigger className="border-2 border-gray-300 rounded-none">
                    <SelectValue placeholder="Select skin tone" />
                  </SelectTrigger>
                  <SelectContent>
                    {skinTones.map((tone) => (
                      <SelectItem key={tone} value={tone}>
                        {tone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label
                  htmlFor="height"
                  className="text-sm font-medium text-gray-700 mb-2 block"
                >
                  Height (optional)
                </Label>
                <Input
                  id="height"
                  value={profileData.height}
                  onChange={(e) =>
                    setProfileData({ ...profileData, height: e.target.value })
                  }
                  className="border-2 border-gray-300 rounded-none"
                  placeholder="e.g., 5'10&quot; or 178cm"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => setShowEditProfileModal(false)}
                  variant="outline"
                  className="flex-1 border-2 border-gray-300 rounded-none"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveProfile}
                  className="flex-1 bg-[#F18B6A] hover:bg-[#E07A5A] text-white rounded-none"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Likelee Package Modal */}
        <Dialog open={showPackageModal} onOpenChange={setShowPackageModal}>
          <DialogContent className="max-w-5xl h-[90vh] overflow-y-auto rounded-none">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <Package className="w-6 h-6 text-[#32C8D1]" />
                Manage Likelee Package
              </DialogTitle>
            </DialogHeader>

            <Tabs
              value={packageTab}
              onValueChange={setPackageTab}
              className="mt-4"
            >
              <TabsList className="grid w-full grid-cols-3 rounded-none">
                <TabsTrigger value="overview" className="rounded-none">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="settings" className="rounded-none">
                  Package Settings
                </TabsTrigger>
                <TabsTrigger value="analytics" className="rounded-none">
                  Analytics
                  {!isPro && <Lock className="w-3 h-3 ml-1" />}
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6 mt-6">
                <Card className="p-6 bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-[#32C8D1] rounded-none">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#32C8D1] border-2 border-black flex items-center justify-center rounded-none">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        What is the Likelee Package?
                      </h3>
                      <p className="text-gray-700 leading-relaxed mb-4">
                        Your Likelee Package is an auto-generated branded
                        portfolio PDF + shareable link that serves as your
                        professional application card. It pulls your profile
                        data, skills, projects, and contact info into a
                        beautiful, branded format that hiring managers love.
                      </p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-gray-900">
                              Clean & Brand-Consistent
                            </p>
                            <p className="text-sm text-gray-600">
                              Likelee watermark, gradient backgrounds,
                              professional layout
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-gray-900">
                              Dynamic Data
                            </p>
                            <p className="text-sm text-gray-600">
                              Auto-pulls from your profile: name, skills, links,
                              stats
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-gray-900">
                              Shareable Link + QR
                            </p>
                            <p className="text-sm text-gray-600">
                              Links back to your Likelee profile for more
                              visibility
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-gray-900">
                              PDF + Web Format
                            </p>
                            <p className="text-sm text-gray-600">
                              Download as PDF or share as interactive link
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="p-6 border-2 border-gray-200 rounded-none">
                    <FileText className="w-8 h-8 text-[#F18B6A] mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      Your Package Stats
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">
                          Packages Generated
                        </span>
                        <span className="font-bold text-gray-900">
                          {packageData.packages_generated}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Views</span>
                        <span className="font-bold text-gray-900">
                          {packageData.total_views}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Downloads</span>
                        <span className="font-bold text-gray-900">
                          {packageData.total_downloads}
                        </span>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6 border-2 border-gray-200 rounded-none">
                    <QrCode className="w-8 h-8 text-[#32C8D1] mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      Quick Actions
                    </h3>
                    <div className="space-y-3">
                      <Button
                        onClick={handleGeneratePackage}
                        className="w-full bg-[#32C8D1] hover:bg-[#2AB8C1] text-white rounded-none"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Generate New Package
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-2 border-gray-300 rounded-none"
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Share Package Link
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-2 border-gray-300 rounded-none"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Latest PDF
                      </Button>
                    </div>
                  </Card>
                </div>

                {!isPro && (
                  <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-600 rounded-none">
                    <div className="flex items-start gap-4">
                      <Crown className="w-8 h-8 text-purple-600 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          Unlock Pro Package Features
                        </h3>
                        <div className="grid md:grid-cols-2 gap-3 mb-4">
                          <div className="flex items-center gap-2">
                            <Palette className="w-4 h-4 text-purple-600" />
                            <span className="text-sm text-gray-700">
                              Custom color themes
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-purple-600" />
                            <span className="text-sm text-gray-700">
                              Analytics dashboard
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-purple-600" />
                            <span className="text-sm text-gray-700">
                              Multiple package formats
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-purple-600" />
                            <span className="text-sm text-gray-700">
                              Auto-send feature
                            </span>
                          </div>
                        </div>
                        <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-none">
                          Upgrade to Pro - $39/mo
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-6 mt-6">
                <Card className="p-6 border-2 border-gray-200 rounded-none">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Package Information
                  </h3>
                  <p className="text-gray-600 mb-6">
                    This information will be included in your generated Likelee
                    Package
                  </p>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Display Name
                      </Label>
                      <Input
                        value={packageData.display_name}
                        onChange={(e) =>
                          setPackageData({
                            ...packageData,
                            display_name: e.target.value,
                          })
                        }
                        className="border-2 border-gray-300 rounded-none"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Role / Title
                      </Label>
                      <Input
                        value={packageData.role_title}
                        onChange={(e) =>
                          setPackageData({
                            ...packageData,
                            role_title: e.target.value,
                          })
                        }
                        className="border-2 border-gray-300 rounded-none"
                        placeholder="e.g., AI Video Artist | Motion Designer"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Short Bio (max 280 characters)
                      </Label>
                      <Textarea
                        value={packageData.short_bio}
                        onChange={(e) =>
                          setPackageData({
                            ...packageData,
                            short_bio: e.target.value,
                          })
                        }
                        maxLength={280}
                        className="border-2 border-gray-300 rounded-none h-24"
                        placeholder="Brief description of your work and expertise..."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {packageData.short_bio.length}/280 characters
                      </p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Contact Email
                      </Label>
                      <Input
                        type="email"
                        value={packageData.contact_email}
                        onChange={(e) =>
                          setPackageData({
                            ...packageData,
                            contact_email: e.target.value,
                          })
                        }
                        className="border-2 border-gray-300 rounded-none"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-3 block">
                        Skills / AI Tools
                      </Label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {packageData.skills_tools.map((skill, index) => (
                          <Badge
                            key={index}
                            className="bg-[#32C8D1] text-white rounded-none"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">
                        Edit your skills in Profile Settings
                      </p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Portfolio Links
                      </Label>
                      {packageData.portfolio_links.map((link, index) => (
                        <Input
                          key={index}
                          value={link}
                          className="border-2 border-gray-300 rounded-none mb-2"
                          placeholder="https://..."
                          readOnly // For demo purposes, editing links directly here is not implemented. They would usually be managed in profile settings.
                        />
                      ))}
                      <Button
                        variant="outline"
                        className="border-2 border-gray-300 rounded-none text-sm"
                      >
                        + Add Link
                      </Button>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t-2 border-gray-200 flex gap-3">
                    <Button
                      onClick={() =>
                        toast({
                          title: "Info",
                          description: "Settings saved! (Demo mode)",
                        })
                      }
                      className="bg-[#32C8D1] hover:bg-[#2AB8C1] text-white rounded-none"
                    >
                      Save Settings
                    </Button>
                    <Button
                      onClick={handleGeneratePackage}
                      variant="outline"
                      className="border-2 border-[#32C8D1] text-[#32C8D1] rounded-none"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Generate Package Now
                    </Button>
                  </div>
                </Card>

                {!isPro && (
                  <Card className="p-6 bg-amber-50 border-2 border-amber-600 rounded-none">
                    <div className="flex items-start gap-4">
                      <Lock className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="font-bold text-gray-900 mb-2">
                          Pro Theme Options
                        </h3>
                        <p className="text-gray-700 mb-4">
                          Upgrade to Pro to unlock custom themes, color options,
                          and multiple package formats.
                        </p>
                        <Button className="bg-amber-600 hover:bg-amber-700 text-white rounded-none">
                          Unlock Pro Features
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-6 mt-6">
                {!isPro ? (
                  <Card className="p-12 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-600 rounded-none text-center">
                    <BarChart3 className="w-16 h-16 text-purple-600 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                      Advanced Analytics - Pro Feature
                    </h3>
                    <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
                      Track package views, downloads, click-through rates, and
                      see which companies viewed your profile. Get insights on
                      when recruiters open your package and optimize your
                      applications.
                    </p>
                    <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-none">
                      <Crown className="w-4 h-4 mr-2" />
                      Upgrade to Pro - $39/mo
                    </Button>
                  </Card>
                ) : (
                  <Card className="p-6 border-2 border-gray-200 rounded-none">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Package Analytics
                    </h3>
                    <p className="text-gray-600">
                      Analytics dashboard would appear here for Pro users
                    </p>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">
                      Job Opportunities
                    </p>
                    <p className="text-3xl font-bold text-gray-900">150+</p>
                  </div>
                  <Briefcase className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Available opportunities
                </p>
              </Card>

              <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Projects</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {projects.length}
                    </p>
                  </div>
                  <Play className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {projects.filter((p) => p.is_featured).length} featured
                </p>
              </Card>
            </div>

            <Card className="p-8 bg-gradient-to-br from-[#F18B6A] to-[#E07A5A] border-2 border-black text-center rounded-none">
              <h2 className="text-2xl font-bold text-white mb-4">
                Start Browsing Job Opportunities
              </h2>
              <p className="text-white/90 mb-6">
                Discover AI creative opportunities matched to your skills
              </p>
              <Button
                onClick={() => setActiveTab("job_board")}
                className="bg-white hover:bg-gray-100 text-[#F18B6A] border-2 border-black rounded-none"
              >
                <Briefcase className="w-5 h-5 mr-2" />
                View Job Board
              </Button>
            </Card>

            <Card className="p-12 bg-gradient-to-br from-orange-50 via-pink-50 to-rose-50 border-2 border-[#F18B6A] text-center rounded-none">
              <div className="w-20 h-20 bg-gradient-to-r from-[#F18B6A] to-[#E07A5A] border-2 border-black flex items-center justify-center mx-auto mb-6 rounded-none">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">
                Create AI Content with Likelee Studio
              </h3>
              <p className="text-xl text-gray-700 leading-relaxed max-w-2xl mx-auto mb-8">
                Create and add content to your portfolio on platform with all
                the latest video generation models
              </p>
              <Button
                onClick={() => navigate(createPageUrl("Studio"))}
                className="h-14 px-12 text-lg font-medium bg-gradient-to-r from-[#F18B6A] to-[#E07A5A] hover:from-[#E07A5A] hover:to-[#D06A4A] text-white border-2 border-black shadow-lg transition-all hover:scale-105 rounded-none"
              >
                Go to Likelee.studio
                <ExternalLink className="w-5 h-5 ml-2" />
              </Button>
            </Card>
          </div>
        )}

        {/* Job Board Tab */}
        {activeTab === "job_board" && <JobBoardContent />}

        {/* My Jobs Tab */}
        {activeTab === "my_jobs" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My Jobs</h1>
              <p className="text-gray-600">
                Manage your active and completed projects
              </p>
            </div>

            <div className="space-y-4">
              {mockActiveJobs.map((job) => (
                <Card
                  key={job.id}
                  className="p-6 bg-white border-2 border-gray-200 rounded-none"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {job.title}
                      </h3>
                      <p className="text-gray-700 mb-3">Client: {job.client}</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge
                          className={
                            job.status === "in_progress"
                              ? "bg-blue-600 text-white rounded-none"
                              : job.status === "delivered"
                                ? "bg-green-600 text-white rounded-none"
                                : "bg-gray-600 text-white rounded-none"
                          }
                        >
                          {job.status.replace("_", " ")}
                        </Badge>
                        <Badge
                          className={
                            job.payment_status === "paid"
                              ? "bg-green-100 text-green-800 rounded-none"
                              : "bg-yellow-100 text-yellow-800 rounded-none"
                          }
                        >
                          Payment: {job.payment_status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Amount: ${job.amount.toLocaleString()}</span>
                        <span>Deadline: {job.deadline}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="border-2 border-gray-300 rounded-none"
                      >
                        View Details
                      </Button>
                      {job.status === "delivered" && (
                        <Button className="bg-[#F18B6A] hover:bg-[#E07A5A] text-white rounded-none">
                          Request Feedback
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {!isPro && (
              <Card className="p-6 bg-amber-50 border-2 border-amber-600 rounded-none">
                <div className="flex items-start gap-4">
                  <Lock className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">
                      Unlock Advanced Job Management
                    </h3>
                    <p className="text-gray-700 mb-4">
                      Upgrade to Pro for auto-invoice generator and integrated
                      client chat portal.
                    </p>
                    <Button className="bg-amber-600 hover:bg-amber-700 text-white rounded-none">
                      Upgrade to Pro
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Applications Tab */}
        {activeTab === "applications" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Applications
              </h1>
              <p className="text-gray-600">Track your job applications</p>
            </div>

            <Card className="p-6 bg-blue-50 border-2 border-blue-600 rounded-none">
              <div className="flex items-start gap-4">
                <Sparkles className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-2">
                    Apply with Likelee Package
                  </h3>
                  <p className="text-gray-700 mb-4">
                    Auto-attach your verified profile, top 3 projects, and AI
                    tools specialties in a professional one-page kit. This
                    feature is FREE and helps you stand out to clients.
                  </p>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-700">
                      Automatically included in all applications
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            <div className="space-y-4">
              {mockApplications.map((app) => (
                <Card
                  key={app.id}
                  className="p-6 bg-white border-2 border-gray-200 rounded-none"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        {app.job_title}
                      </h3>
                      <p className="text-gray-700 mb-3">{app.company}</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge
                          className={
                            app.status === "accepted"
                              ? "bg-green-600 text-white rounded-none"
                              : app.status === "rejected"
                                ? "bg-red-600 text-white rounded-none"
                                : "bg-gray-600 text-white rounded-none"
                          }
                        >
                          {app.status}
                        </Badge>
                        <Badge className="bg-gray-200 text-gray-700 rounded-none">
                          {app.budget}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        Applied: {app.applied_date}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="border-2 border-gray-300 rounded-none"
                    >
                      View Application
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {!isPro && (
              <Alert className="bg-amber-50 border-2 border-amber-600 rounded-none">
                <Lock className="h-5 w-5 text-amber-600" />
                <div className="text-amber-900">
                  <strong>Free tier limit:</strong> You can have 3 active
                  applications at a time. Upgrade to Pro for unlimited
                  applications.
                </div>
              </Alert>
            )}
          </div>
        )}

        {/* Portfolio Tab */}
        {activeTab === "portfolio" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Portfolio & Profile
                </h1>
                <p className="text-gray-600">
                  Showcase your work to potential clients
                </p>
              </div>
              <Button
                onClick={() => navigate(createPageUrl("UploadProject"))}
                className="bg-[#F18B6A] hover:bg-[#E07A5A] text-white rounded-none"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Add Project
              </Button>
            </div>

            <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
              <div className="flex items-start gap-6 mb-6">
                <img
                  src={portfolio.profile_photo}
                  alt={portfolio.name}
                  className="w-24 h-24 rounded-full object-cover border-2 border-[#F18B6A]"
                />
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {portfolio.name}
                  </h2>
                  <p className="text-gray-700 mb-4">{portfolio.bio}</p>
                  <div className="flex items-center gap-3 mb-4">
                    <Badge className="bg-[#F18B6A] text-white rounded-none">
                      {portfolio.availability === "available"
                        ? "Available"
                        : "Unavailable"}
                    </Badge>
                    {portfolio.available_for_collabs && (
                      <Badge className="bg-gray-200 text-gray-700 rounded-none">
                        Open to Collaborations
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <span>${portfolio.hourly_rate}/hr</span>
                    <span>
                      Projects: ${portfolio.project_rate_min.toLocaleString()} -
                      ${portfolio.project_rate_max.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t-2 border-gray-200 pt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-bold text-gray-900 mb-3">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {portfolio.skills_tags.map((skill) => (
                        <Badge
                          key={skill}
                          className="bg-gray-200 text-gray-700 rounded-none"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-3">AI Tools</h3>
                    <div className="flex flex-wrap gap-2">
                      {portfolio.ai_tools.map((tool) => (
                        <Badge
                          key={tool}
                          className="bg-gray-200 text-gray-700 rounded-none"
                        >
                          {tool}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid md:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  className="p-4 bg-white border-2 border-gray-200 rounded-none"
                >
                  <div className="relative mb-4">
                    <img
                      src={project.thumbnail_url}
                      alt={project.title}
                      className="w-full h-48 object-cover rounded-none"
                    />
                    {project.is_featured && (
                      <Badge className="absolute top-2 right-2 bg-[#F18B6A] text-white rounded-none">
                        <Star className="w-3 h-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">
                    {project.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {project.description}
                  </p>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {project.view_count}
                    </span>
                    <span>{project.duration_seconds}s</span>
                  </div>
                </Card>
              ))}
            </div>

            {!isPro && (
              <Card className="p-6 bg-purple-50 border-2 border-purple-600 rounded-none">
                <div className="flex items-start gap-4">
                  <Lock className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">
                      Unlock Advanced Personalization
                    </h3>
                    <p className="text-gray-700 mb-4">
                      Upgrade to get custom banner, vanity URL, and detailed
                      showcase analytics.
                    </p>
                    <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-none">
                      Upgrade Now
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Earnings Tab */}
        {activeTab === "earnings" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Earnings & Payments
              </h1>
              <p className="text-gray-600">
                Track your income and withdraw funds
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
                <DollarSign className="w-8 h-8 text-green-600 mb-4" />
                <p className="text-sm text-gray-600 mb-1">Total Earned</p>
                <p className="text-3xl font-bold text-gray-900">
                  ${mockEarnings.total_earned.toLocaleString()}
                </p>
              </Card>

              <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
                <AlertCircle className="w-8 h-8 text-amber-600 mb-4" />
                <p className="text-sm text-gray-600 mb-1">Pending Payment</p>
                <p className="text-3xl font-bold text-gray-900">
                  ${mockEarnings.pending_payment.toLocaleString()}
                </p>
              </Card>

              <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
                <CheckCircle2 className="w-8 h-8 text-blue-600 mb-4" />
                <p className="text-sm text-gray-600 mb-1">Completed Jobs</p>
                <p className="text-3xl font-bold text-gray-900">
                  {mockEarnings.completed_jobs}
                </p>
              </Card>

              <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
                <TrendingUp className="w-8 h-8 text-purple-600 mb-4" />
                <p className="text-sm text-gray-600 mb-1">Avg Job Value</p>
                <p className="text-3xl font-bold text-gray-900">
                  ${mockEarnings.average_job_value.toLocaleString()}
                </p>
              </Card>
            </div>

            <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Completed Jobs
              </h3>
              <div className="space-y-3">
                {mockActiveJobs
                  .filter((j) => j.payment_status === "paid")
                  .map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-none"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{job.title}</p>
                        <p className="text-sm text-gray-600">{job.client}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          ${job.amount.toLocaleString()}
                        </p>
                        <Badge className="bg-green-100 text-green-800 rounded-none">
                          Paid
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>

              <div className="flex justify-between items-center mt-6 pt-6 border-t-2 border-gray-200">
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    Available to Withdraw
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    $
                    {(
                      mockEarnings.total_earned - mockEarnings.pending_payment
                    ).toLocaleString()}
                  </p>
                </div>
                <Button className="bg-green-600 hover:bg-green-700 text-white rounded-none">
                  <Download className="w-4 h-4 mr-2" />
                  Withdraw Funds
                </Button>
              </div>
            </Card>

            {!isPro && (
              <Card className="p-6 bg-amber-50 border-2 border-amber-600 rounded-none">
                <div className="flex items-start gap-4">
                  <Lock className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">
                      Unlock Instant Payouts
                    </h3>
                    <p className="text-gray-700 mb-4">
                      Pro members get instant payouts and advanced earnings
                      projections.
                    </p>
                    <Button className="bg-amber-600 hover:bg-amber-700 text-white rounded-none">
                      Upgrade to Pro
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Upgrade Tab */}
        {activeTab === "upgrade" && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Boost Your Visibility & Earnings
              </h1>
              <p className="text-xl text-gray-600">
                Choose the plan that fits your goals
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-8 bg-white border-2 border-gray-200 rounded-none">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Free
                  </h3>
                  <p className="text-4xl font-bold text-gray-900 mb-2">$0</p>
                  <p className="text-gray-600">Forever free</p>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      Unlimited job browsing
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      Apply with Likelee Package
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">3 active applications</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">Standard portfolio</span>
                  </li>
                </ul>
                <Button
                  disabled
                  className="w-full bg-gray-300 text-gray-600 rounded-none cursor-not-allowed"
                >
                  Current Plan
                </Button>
              </Card>

              <Card className="p-8 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-600 rounded-none relative">
                <Badge className="absolute top-4 right-4 bg-blue-600 text-white rounded-none">
                  Popular
                </Badge>
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Pro</h3>
                  <p className="text-4xl font-bold text-gray-900 mb-2">$39</p>
                  <p className="text-gray-600">per month</p>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">Everything in Free</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      Unlimited applications
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">Instant payouts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      Custom application templates
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      Featured placement on listings
                    </span>
                  </li>
                </ul>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-none">
                  Upgrade to Pro
                </Button>
              </Card>

              <Card className="p-8 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-600 rounded-none relative">
                <div className="absolute top-4 right-4">
                  <Crown className="w-8 h-8 text-amber-600" />
                </div>
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Elite
                  </h3>
                  <p className="text-4xl font-bold text-gray-900 mb-2">$99</p>
                  <p className="text-gray-600">per month</p>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">Everything in Pro</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      Top-tier listing priority
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">Personalized branding</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      Verified Creator badge
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Crown className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 font-semibold">
                      Direct Brand Invites
                    </span>
                  </li>
                </ul>
                <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-none">
                  Upgrade to Elite
                </Button>
              </Card>
            </div>

            <Card className="p-8 bg-gradient-to-r from-blue-600 to-purple-600 border-2 border-black rounded-none text-white text-center">
              <h3 className="text-2xl font-bold mb-4">
                Feature Your Portfolio on Likelee Marketplace
              </h3>
              <p className="text-lg mb-6">
                Get priority job matching and increased visibility to brands
                actively hiring AI creators.
              </p>
              <Button className="bg-white hover:bg-gray-100 text-blue-600 rounded-none">
                Learn More
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
