import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Progress } from "@/components/ui/progress";
import {
  X,
  ArrowLeft,
  Upload,
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
  MessageSquare,
  ThumbsUp,
  Edit3,
  Clock,
  TrendingUp,
  Zap,
  Shield,
  Briefcase,
} from "lucide-react";

const mockBrand = {
  name: "Urban Apparel Co.",
  logo: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200",
};

const mockCampaigns = [
  {
    id: 1,
    name: "Spring Collection Launch",
    status: "active",
    objective: "Product Launch",
    budget: 5000,
    collaborators: ["CreativeWorks Agency"],
    deliverables: 8,
    approved: 6,
    start_date: "2025-02-01",
  },
  {
    id: 2,
    name: "Summer Fitness Challenge",
    status: "pending_approval",
    objective: "UGC Campaign",
    budget: 2500,
    collaborators: ["Marcus Davis"],
    deliverables: 3,
    approved: 0,
    start_date: "2025-03-01",
  },
];

const mockMetrics = {
  total_spend: 12450,
  active_creators: 8,
  campaigns_launched: 12,
  roi: 3.2,
};

export default function BrandCampaignDashboard() {
  const navigate = useNavigate();
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [showInviteAgencyModal, setShowInviteAgencyModal] = useState(false);
  const [showInviteCreatorModal, setShowInviteCreatorModal] = useState(false);
  const [showInviteSeatModal, setShowInviteSeatModal] = useState(false);
  const [showStudioUpgradeModal, setShowStudioUpgradeModal] = useState(false);
  const [showPostJobModal, setShowPostJobModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [newCampaignStep, setNewCampaignStep] = useState(1);
  const [hasStudioAddon, setHasStudioAddon] = useState(false);

  const [campaignForm, setCampaignForm] = useState({
    name: "",
    objective: "",
    brief_file: null,
    budget_range: "",
    collaborator_type: "",
    collaborators: [],
  });

  const handleCreateCampaign = () => {
    console.log("Creating campaign:", campaignForm);
    alert("Campaign created successfully!");
    setShowNewCampaignModal(false);
    setNewCampaignStep(1);
    setCampaignForm({
      name: "",
      objective: "",
      brief_file: null,
      budget_range: "",
      collaborator_type: "",
      collaborators: [],
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
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
                Back to Dashboard
              </Button>
              <div className="flex items-center gap-3">
                <img
                  src={mockBrand.logo}
                  alt="Brand"
                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                />
                <span className="text-xl font-bold text-gray-900">
                  {mockBrand.name}
                </span>
              </div>
            </div>

            <Button
              onClick={() => setShowNewCampaignModal(true)}
              className="bg-[#F7B750] hover:bg-[#E6A640] text-white rounded-none"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Alert className="mb-8 bg-amber-50 border-2 border-amber-600 rounded-none">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <AlertDescription className="text-amber-900 font-medium">
            <strong>Demo Mode:</strong> This is a preview of the Brand Campaign
            Hub for companies and brands.
          </AlertDescription>
        </Alert>

        {/* Metrics Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
            <DollarSign className="w-8 h-8 text-[#F7B750] mb-4" />
            <p className="text-sm text-gray-600 mb-1">Total Spend (30d)</p>
            <p className="text-3xl font-bold text-gray-900">
              ${(mockMetrics.total_spend / 1000).toFixed(1)}K
            </p>
          </Card>

          <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
            <Users className="w-8 h-8 text-[#F7B750] mb-4" />
            <p className="text-sm text-gray-600 mb-1">Active Collaborators</p>
            <p className="text-3xl font-bold text-gray-900">
              {mockMetrics.active_creators}
            </p>
          </Card>

          <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
            <FileText className="w-8 h-8 text-[#F7B750] mb-4" />
            <p className="text-sm text-gray-600 mb-1">Campaigns Launched</p>
            <p className="text-3xl font-bold text-gray-900">
              {mockMetrics.campaigns_launched}
            </p>
          </Card>

          <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
            <TrendingUp className="w-8 h-8 text-[#F7B750] mb-4" />
            <p className="text-sm text-gray-600 mb-1">Avg ROI</p>
            <p className="text-3xl font-bold text-gray-900">
              {mockMetrics.roi}x
            </p>
          </Card>
        </div>

        {/* Collaboration CTAs + Post Job */}
        <div className="grid md:grid-cols-5 gap-6 mb-8">
          <Card
            className="p-6 bg-white border-2 border-[#F7B750] hover:shadow-xl transition-all cursor-pointer rounded-none"
            onClick={() => setShowInviteAgencyModal(true)}
          >
            <div className="w-12 h-12 bg-[#F7B750] rounded-none flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Collaborate with Agency
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Invite a marketing agency to manage your campaigns
            </p>
            <Button className="w-full bg-[#F7B750] hover:bg-[#E6A640] text-white rounded-none">
              <Mail className="w-4 h-4 mr-2" />
              Invite Agency
            </Button>
          </Card>

          <Card
            className="p-6 bg-white border-2 border-[#FAD54C] hover:shadow-xl transition-all cursor-pointer rounded-none"
            onClick={() => setShowInviteCreatorModal(true)}
          >
            <div className="w-12 h-12 bg-[#FAD54C] rounded-none flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Add AI Creator
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Work directly with verified AI creators
            </p>
            <Button className="w-full bg-[#FAD54C] hover:bg-[#E6C33C] text-white rounded-none">
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Creator
            </Button>
          </Card>

          <Card
            className="p-6 bg-white border-2 border-amber-600 hover:shadow-xl transition-all cursor-pointer rounded-none"
            onClick={() => setShowInviteSeatModal(true)}
          >
            <div className="w-12 h-12 bg-amber-600 rounded-none flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Invite Company Seat
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Add in-house AI creator to your team
            </p>
            <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-none">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Team Member
            </Button>
          </Card>

          <Card
            className="p-6 bg-white border-2 border-orange-600 hover:shadow-xl transition-all cursor-pointer rounded-none"
            onClick={() => setShowStudioUpgradeModal(true)}
          >
            <div className="w-12 h-12 bg-orange-600 rounded-none flex items-center justify-center mb-4 relative">
              {!hasStudioAddon && (
                <Lock className="w-4 h-4 text-white absolute top-1 right-1" />
              )}
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              AI Studio Add-On
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Generate content in-house without waiting
            </p>
            <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-none">
              {hasStudioAddon ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Enabled
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Enable Add-On
                </>
              )}
            </Button>
          </Card>

          <Card
            className="p-6 bg-white border-2 border-blue-600 hover:shadow-xl transition-all cursor-pointer rounded-none"
            onClick={() => setShowPostJobModal(true)}
          >
            <div className="w-12 h-12 bg-blue-600 rounded-none flex items-center justify-center mb-4">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Post a Job</h3>
            <p className="text-sm text-gray-600 mb-4">
              Find talent on the marketplace
            </p>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-none">
              <Plus className="w-4 h-4 mr-2" />
              Post Job
            </Button>
          </Card>
        </div>

        {/* Campaign Cards */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Your Campaigns</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-2 border-gray-300 rounded-none"
              >
                Active
              </Button>
              <Button
                variant="outline"
                className="border-2 border-gray-300 rounded-none"
              >
                Pending Approval
              </Button>
              <Button
                variant="outline"
                className="border-2 border-gray-300 rounded-none"
              >
                Completed
              </Button>
            </div>
          </div>

          {mockCampaigns.map((campaign) => (
            <Card
              key={campaign.id}
              className="p-6 bg-white border-2 border-gray-200 hover:shadow-lg transition-all rounded-none"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {campaign.name}
                  </h3>
                  <div className="flex items-center gap-3 mb-3">
                    <Badge
                      className={
                        campaign.status === "active"
                          ? "bg-green-100 text-green-800"
                          : campaign.status === "pending_approval"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                      }
                    >
                      {campaign.status.replace("_", " ")}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {campaign.objective}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Budget: ${campaign.budget.toLocaleString()}</span>
                    <span>•</span>
                    <span>Start: {campaign.start_date}</span>
                    <span>•</span>
                    <span>{campaign.collaborators.length} collaborator(s)</span>
                  </div>
                </div>
                <Button
                  onClick={() => setSelectedCampaign(campaign)}
                  className="bg-[#F7B750] hover:bg-[#E6A640] text-white rounded-none"
                >
                  View Details
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Progress</p>
                  <Progress
                    value={(campaign.approved / campaign.deliverables) * 100}
                    className="h-2 mb-2"
                  />
                  <p className="text-sm text-gray-600">
                    {campaign.approved} / {campaign.deliverables} deliverables
                    approved
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2">Collaborators</p>
                  <div className="flex flex-wrap gap-2">
                    {campaign.collaborators.map((collab, idx) => (
                      <Badge key={idx} className="bg-gray-200 text-gray-700">
                        {collab}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* New Campaign Modal */}
      {showNewCampaignModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="min-h-screen flex items-center justify-center p-6">
            <Card className="w-full max-w-3xl bg-white p-8 border-2 border-black rounded-none">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Create New Campaign
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowNewCampaignModal(false)}
                  className="rounded-none"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex items-center gap-2 ${newCampaignStep >= 1 ? "text-black" : "text-gray-400"}`}
                  >
                    <div
                      className={`w-8 h-8 border-2 rounded-none flex items-center justify-center ${newCampaignStep >= 1 ? "border-black bg-black text-white" : "border-gray-300"}`}
                    >
                      1
                    </div>
                    <span className="text-sm font-medium">Campaign Info</span>
                  </div>
                  <div className="flex-1 h-px bg-gray-300" />
                  <div
                    className={`flex items-center gap-2 ${newCampaignStep >= 2 ? "text-black" : "text-gray-400"}`}
                  >
                    <div
                      className={`w-8 h-8 border-2 rounded-none flex items-center justify-center ${newCampaignStep >= 2 ? "border-black bg-black text-white" : "border-gray-300"}`}
                    >
                      2
                    </div>
                    <span className="text-sm font-medium">
                      Assign Collaborators
                    </span>
                  </div>
                </div>
              </div>

              {newCampaignStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      Campaign Name *
                    </label>
                    <Input
                      value={campaignForm.name}
                      onChange={(e) =>
                        setCampaignForm({
                          ...campaignForm,
                          name: e.target.value,
                        })
                      }
                      placeholder="e.g., Spring Collection Launch"
                      className="border-2 border-gray-300 rounded-none"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      Campaign Objective *
                    </label>
                    <Select
                      value={campaignForm.objective}
                      onValueChange={(v) =>
                        setCampaignForm({ ...campaignForm, objective: v })
                      }
                    >
                      <SelectTrigger className="border-2 border-gray-300 rounded-none">
                        <SelectValue placeholder="Select objective" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="awareness">
                          Brand Awareness
                        </SelectItem>
                        <SelectItem value="product_launch">
                          Product Launch
                        </SelectItem>
                        <SelectItem value="ugc">UGC Campaign</SelectItem>
                        <SelectItem value="regional_promo">
                          Regional Promotion
                        </SelectItem>
                        <SelectItem value="seasonal">
                          Seasonal Campaign
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      Upload Brand Assets
                    </label>
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-none p-8 text-center hover:border-black transition-colors cursor-pointer"
                      onClick={() =>
                        setCampaignForm({
                          ...campaignForm,
                          brief_file: { name: "brand_brief.pdf" },
                        })
                      }
                    >
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        Upload logo, media, or PDF brief
                      </p>
                      <p className="text-xs text-gray-500">
                        PDF, JPG, PNG up to 50MB
                      </p>
                      {campaignForm.brief_file && (
                        <Badge className="mt-3 bg-green-100 text-green-800">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          File uploaded
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      Budget Range
                    </label>
                    <Select
                      value={campaignForm.budget_range}
                      onValueChange={(v) =>
                        setCampaignForm({ ...campaignForm, budget_range: v })
                      }
                    >
                      <SelectTrigger className="border-2 border-gray-300 rounded-none">
                        <SelectValue placeholder="Select budget range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0-5k">$0 - $5,000</SelectItem>
                        <SelectItem value="5k-15k">$5,000 - $15,000</SelectItem>
                        <SelectItem value="15k-50k">
                          $15,000 - $50,000
                        </SelectItem>
                        <SelectItem value="50k+">$50,000+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowNewCampaignModal(false)}
                      className="border-2 border-gray-300 rounded-none bg-white text-black hover:bg-gray-50"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => setNewCampaignStep(2)}
                      disabled={!campaignForm.name || !campaignForm.objective}
                      className="bg-black hover:bg-gray-800 text-white border-2 border-black rounded-none"
                    >
                      Next: Assign Collaborators
                    </Button>
                  </div>
                </div>
              )}

              {newCampaignStep === 2 && (
                <div className="space-y-6">
                  <Alert className="bg-blue-50 border-2 border-blue-200 rounded-none">
                    <AlertCircle className="h-5 w-5 text-blue-600" />
                    <AlertDescription className="text-blue-900">
                      Campaigns require an assigned agency or creator for
                      production. You can invite one now or return later.
                    </AlertDescription>
                  </Alert>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-3">
                      Select Collaborator Type
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <Card
                        className={`p-4 border-2 cursor-pointer transition-all rounded-none ${
                          campaignForm.collaborator_type === "agency"
                            ? "border-black bg-gray-50"
                            : "border-gray-300 hover:border-black"
                        }`}
                        onClick={() =>
                          setCampaignForm({
                            ...campaignForm,
                            collaborator_type: "agency",
                          })
                        }
                      >
                        <Building2 className="w-8 h-8 text-black mb-2" />
                        <h4 className="font-bold text-gray-900 mb-1">
                          Marketing Agency
                        </h4>
                        <p className="text-xs text-gray-600">
                          Full campaign management
                        </p>
                      </Card>

                      <Card
                        className={`p-4 border-2 cursor-pointer transition-all rounded-none ${
                          campaignForm.collaborator_type === "creator"
                            ? "border-black bg-gray-50"
                            : "border-gray-300 hover:border-black"
                        }`}
                        onClick={() =>
                          setCampaignForm({
                            ...campaignForm,
                            collaborator_type: "creator",
                          })
                        }
                      >
                        <Sparkles className="w-8 h-8 text-black mb-2" />
                        <h4 className="font-bold text-gray-900 mb-1">
                          AI Creator
                        </h4>
                        <p className="text-xs text-gray-600">
                          Task-specific work
                        </p>
                      </Card>
                    </div>
                  </div>

                  {campaignForm.collaborator_type && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-3">
                        {campaignForm.collaborator_type === "agency"
                          ? "Select Agency"
                          : "Select Creator"}
                      </label>
                      <div className="flex gap-3 mb-4">
                        <Input
                          placeholder="Search by name or email..."
                          className="flex-1 border-2 border-gray-300 rounded-none"
                        />
                        <Button className="bg-black hover:bg-gray-800 text-white border-2 border-black rounded-none">
                          <Search className="w-4 h-4 mr-2" />
                          Search
                        </Button>
                      </div>

                      <div className="border-2 border-gray-200 rounded-none p-4 mb-4">
                        <p className="text-sm text-gray-600 mb-3">
                          Or invite via email:
                        </p>
                        <div className="flex gap-3">
                          <Input
                            placeholder="email@example.com"
                            className="flex-1 border-2 border-gray-300 rounded-none"
                          />
                          <Button className="bg-black hover:bg-gray-800 text-white border-2 border-black rounded-none">
                            <Mail className="w-4 h-4 mr-2" />
                            Send Invite
                          </Button>
                        </div>
                      </div>

                      <Alert className="bg-green-50 border-2 border-green-200 rounded-none">
                        <Shield className="h-5 w-5 text-green-600" />
                        <AlertDescription className="text-green-900">
                          <strong>Agency Agreement Preview:</strong> Standard
                          payment split (10% platform fee), campaign-level data
                          access, and rights defined by license terms.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  <div className="flex justify-between gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setNewCampaignStep(1)}
                      className="border-2 border-gray-300 rounded-none bg-white text-black hover:bg-gray-50"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={handleCreateCampaign}
                        className="border-2 border-gray-300 rounded-none bg-white text-black hover:bg-gray-50"
                      >
                        Save & Add Collaborators Later
                      </Button>
                      <Button
                        onClick={handleCreateCampaign}
                        disabled={!campaignForm.collaborator_type}
                        className="bg-black hover:bg-gray-800 text-white border-2 border-black rounded-none"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Create Campaign
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Invite Agency Modal */}
      {showInviteAgencyModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="min-h-screen flex items-center justify-center p-6">
            <Card className="w-full max-w-2xl bg-white p-8 rounded-none">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Invite Marketing Agency
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
                    Choose Invitation Method
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-6 border-2 border-gray-300 hover:border-[#F7B750] cursor-pointer transition-all rounded-none">
                      <Mail className="w-8 h-8 text-[#F7B750] mb-3" />
                      <h4 className="font-bold text-gray-900 mb-2">
                        Invite via Email
                      </h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Send onboarding link to agency email
                      </p>
                      <Input
                        placeholder="agency@example.com"
                        className="border-2 border-gray-300 rounded-none mb-3"
                      />
                      <Button className="w-full bg-[#F7B750] hover:bg-[#E6A640] text-white rounded-none">
                        Send Invitation
                      </Button>
                    </Card>

                    <Card className="p-6 border-2 border-gray-300 hover:border-[#F7B750] cursor-pointer transition-all rounded-none">
                      <Building2 className="w-8 h-8 text-[#F7B750] mb-3" />
                      <h4 className="font-bold text-gray-900 mb-2">
                        Browse Marketplace
                      </h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Select from Likelee partner agencies
                      </p>
                      <Button className="w-full bg-[#F7B750] hover:bg-[#E6A640] text-white rounded-none">
                        <Search className="w-4 h-4 mr-2" />
                        View Agencies
                      </Button>
                    </Card>
                  </div>
                </div>

                <Alert className="bg-blue-50 border-2 border-blue-200 rounded-none">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    <strong>Agency Agreement Preview:</strong> Standard 10%
                    platform fee on payments, campaign-level data access only,
                    and full rights transparency.
                    <button className="text-blue-700 underline ml-1">
                      View full terms
                    </button>
                  </AlertDescription>
                </Alert>
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
          <div className="min-h-screen flex items-center justify-center p-6">
            <Card className="w-full max-w-3xl bg-white p-8 rounded-none">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
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

              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-none flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Generate Content In-House
                </h3>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Unlock the full Likelee Studio to create AI-generated videos,
                  images, and voiceovers without waiting for agency cycles.
                  Perfect for brands scaling fast.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <Card className="p-6 border-2 border-gray-200 rounded-none">
                  <CheckCircle2 className="w-8 h-8 text-green-600 mb-3" />
                  <h4 className="font-bold text-gray-900 mb-2">
                    Direct Content Creation
                  </h4>
                  <p className="text-sm text-gray-600">
                    Generate videos and images instantly without agency delays
                  </p>
                </Card>

                <Card className="p-6 border-2 border-gray-200 rounded-none">
                  <Users className="w-8 h-8 text-orange-600 mb-3" />
                  <h4 className="font-bold text-gray-900 mb-2">
                    Team Collaboration
                  </h4>
                  <p className="text-sm text-gray-600">
                    Share studio access with your in-house creative team
                  </p>
                </Card>

                <Card className="p-6 border-2 border-gray-200 rounded-none">
                  <Sparkles className="w-8 h-8 text-purple-600 mb-3" />
                  <h4 className="font-bold text-gray-900 mb-2">
                    AI-Powered Tools
                  </h4>
                  <p className="text-sm text-gray-600">
                    Access Runway, Sora, ElevenLabs, and more via one platform
                  </p>
                </Card>

                <Card className="p-6 border-2 border-gray-200 rounded-none">
                  <Shield className="w-8 h-8 text-blue-600 mb-3" />
                  <h4 className="font-bold text-gray-900 mb-2">
                    Rights Management
                  </h4>
                  <p className="text-sm text-gray-600">
                    Automatic tracking and compliance for all generated content
                  </p>
                </Card>
              </div>

              <Card className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-600 rounded-none mb-8">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-2xl font-bold text-gray-900 mb-2">
                      $299/month
                    </h4>
                    <p className="text-gray-700 mb-4">
                      Includes 500 AI generation credits/month
                    </p>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-orange-600" />
                        Full Studio access for up to 5 team members
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-orange-600" />
                        Priority rendering & faster generation
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-orange-600" />
                        Advanced analytics & performance tracking
                      </li>
                    </ul>
                  </div>
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white rounded-none">
                    Enable Add-On
                  </Button>
                </div>
              </Card>

              <p className="text-sm text-gray-600 text-center">
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
                    {selectedCampaign.status.replace("_", " ")}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedCampaign(null)}
                  className="rounded-none"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <Card className="p-4 border-2 border-gray-200 rounded-none">
                  <p className="text-sm text-gray-600 mb-1">Budget</p>
                  <p className="text-xl font-bold text-gray-900">
                    ${selectedCampaign.budget.toLocaleString()}
                  </p>
                </Card>
                <Card className="p-4 border-2 border-gray-200 rounded-none">
                  <p className="text-sm text-gray-600 mb-1">Deliverables</p>
                  <p className="text-xl font-bold text-gray-900">
                    {selectedCampaign.approved} /{" "}
                    {selectedCampaign.deliverables}
                  </p>
                </Card>
                <Card className="p-4 border-2 border-gray-200 rounded-none">
                  <p className="text-sm text-gray-600 mb-1">Start Date</p>
                  <p className="text-xl font-bold text-gray-900">
                    {selectedCampaign.start_date}
                  </p>
                </Card>
              </div>

              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Deliverables & Feedback
                </h3>

                {[1, 2, 3].map((i) => (
                  <Card
                    key={i}
                    className="p-6 border-2 border-gray-200 rounded-none"
                  >
                    <div className="flex items-start gap-6">
                      <div className="w-48 h-32 bg-gray-200 rounded-none flex items-center justify-center">
                        <Play className="w-12 h-12 text-gray-400" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-bold text-gray-900 mb-1">
                              Video Asset #{i}
                            </h4>
                            <p className="text-sm text-gray-600 mb-2">
                              Uploaded 2 days ago by CreativeWorks Agency
                            </p>
                            <Badge className="bg-yellow-100 text-yellow-800">
                              Pending Review
                            </Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white rounded-none"
                            >
                              <ThumbsUp className="w-3 h-3 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-2 border-gray-300 rounded-none"
                            >
                              <MessageSquare className="w-3 h-3 mr-1" />
                              Request Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-2 border-gray-300 rounded-none"
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>

                        <div className="border-t-2 border-gray-200 pt-4">
                          <h5 className="text-sm font-bold text-gray-900 mb-3">
                            Comments & Feedback
                          </h5>
                          <div className="space-y-3">
                            <div className="flex gap-3">
                              <div className="w-8 h-8 bg-gray-300 rounded-full flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  Brand Manager
                                </p>
                                <p className="text-sm text-gray-600">
                                  Looks great! Can we adjust the color grading
                                  slightly?
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  2 hours ago
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-3 mt-4">
                            <Input
                              placeholder="Add a comment..."
                              className="flex-1 border-2 border-gray-300 rounded-none"
                            />
                            <Button className="bg-[#F7B750] hover:bg-[#E6A640] text-white rounded-none">
                              Send
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
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
              Open Full Form
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
                  Post a Job to Find Talent
                </h2>
                <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                  Create a detailed job posting to connect with AI creators,
                  marketing agencies, and verified talent for your next
                  campaign.
                </p>
                <Button
                  onClick={() => navigate(createPageUrl("PostJob"))}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-none"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Job Posting
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
