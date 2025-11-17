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
  Search, Bell, HelpCircle, User, Plus, Filter, TrendingUp,
  FileText, Clock, CheckCircle2, Play, DollarSign, Eye,
  BarChart3, Download, Settings, Calendar, Globe, Star,
  Zap, Users, Video, AlertCircle, Building2, ExternalLink,
  Edit3, Sparkles, X
} from "lucide-react";

import CampaignBuilder from "../components/CampaignBuilder";

const mockAgency = {
  name: "CreativeWorks Agency",
  logo: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200",
  clients: 8,
  active_campaigns: 12,
  team_members: 15,
  monthly_budget: 125000
};

const mockClients = [
  {
    id: 1,
    name: "Nike",
    logo: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100",
    industry: "Sports & Fitness",
    campaigns: 3,
    spend: 24500,
    status: "active",
    ad_accounts: 2,
    generations: 45
  },
  {
    id: 2,
    name: "Sephora",
    logo: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=100",
    industry: "Beauty & Cosmetics",
    campaigns: 2,
    spend: 18200,
    status: "active",
    ad_accounts: 1,
    generations: 28
  },
  {
    id: 3,
    name: "Tesla",
    logo: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=100",
    industry: "Automotive",
    campaigns: 1,
    spend: 35000,
    status: "active",
    ad_accounts: 3,
    generations: 18
  }
];

const mockGenerations = [
  {
    id: 1,
    client_id: 1,
    client_name: "Nike",
    campaign_id: 1,
    campaign_name: "Nike Spring Collection",
    type: "video",
    thumbnail: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=300",
    status: "completed",
    created_date: "2025-01-15",
    aspect_ratio: "16:9"
  },
  {
    id: 2,
    client_id: 1,
    client_name: "Nike",
    campaign_id: 1,
    campaign_name: "Nike Spring Collection",
    type: "image",
    thumbnail: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=300",
    status: "completed",
    created_date: "2025-01-14",
    aspect_ratio: "1:1"
  },
  {
    id: 3,
    client_id: 2,
    client_name: "Sephora",
    campaign_id: 2,
    campaign_name: "Sephora Holiday Campaign",
    type: "video",
    thumbnail: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=300",
    status: "processing",
    created_date: "2025-01-16",
    aspect_ratio: "9:16"
  }
];

const mockCampaigns = [
  {
    id: 1,
    name: "Nike Spring Collection",
    client: "Nike",
    status: "active",
    start_date: "2025-01-10",
    end_date: "2025-02-28",
    budget: 12000,
    creators: 3,
    deliverables: 8
  },
  {
    id: 2,
    name: "Sephora Holiday Campaign",
    client: "Sephora",
    status: "active",
    start_date: "2025-01-05",
    end_date: "2025-01-31",
    budget: 8500,
    creators: 2,
    deliverables: 5
  }
];

const mockCreators = [
  {
    id: 1,
    name: "Sarah Johnson",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
    tagline: "Lifestyle & Fashion Influencer",
    followers: 245000,
    engagement: "4.2%",
    platforms: ["Instagram", "TikTok"],
    price: 450,
    approval_rate: 94
  },
  {
    id: 2,
    name: "Marcus Lee",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
    tagline: "Tech & Gadgets Reviewer",
    followers: 189000,
    engagement: "5.8%",
    platforms: ["YouTube", "Instagram"],
    price: 380,
    approval_rate: 88
  },
  {
    id: 3,
    name: "Emma Davis (AI)",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200",
    tagline: "AI-Generated Talent",
    followers: 0,
    engagement: "N/A",
    platforms: ["Virtual"],
    price: 520,
    approval_rate: 100
  }
];

export default function MarketingAgencyDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("home");
  const [selectedClient, setSelectedClient] = useState("all");
  const [showCampaignBuilder, setShowCampaignBuilder] = useState(false);
  const [showCreatorProfile, setShowCreatorProfile] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(null);

  const handleCreateCampaign = (campaignData) => {
    console.log("New campaign created:", campaignData);
    alert("Campaign created successfully!");
  };

  const getFilteredCampaigns = () => {
    if (selectedClient === "all") return mockCampaigns;
    const client = mockClients.find(c => c.id.toString() === selectedClient);
    return mockCampaigns.filter(c => c.client === client?.name);
  };

  const getFilteredGenerations = () => {
    if (selectedClient === "all") return mockGenerations;
    return mockGenerations.filter(g => g.client_id.toString() === selectedClient);
  };

  const getClientStats = () => {
    if (selectedClient === "all") {
      return {
        campaigns: mockAgency.active_campaigns,
        generations: mockGenerations.length,
        spend: mockClients.reduce((sum, c) => sum + c.spend, 0),
        ad_accounts: mockClients.reduce((sum, c) => sum + c.ad_accounts, 0)
      };
    }
    const client = mockClients.find(c => c.id.toString() === selectedClient);
    const clientGens = mockGenerations.filter(g => g.client_id.toString() === selectedClient);
    return {
      campaigns: client?.campaigns || 0,
      generations: clientGens.length,
      spend: client?.spend || 0,
      ad_accounts: client?.ad_accounts || 0
    };
  };

  const clientStats = getClientStats();
  const filteredCampaigns = getFilteredCampaigns();
  const filteredGenerations = getFilteredGenerations();

  const generationsByCampaign = filteredGenerations.reduce((acc, gen) => {
    if (!acc[gen.campaign_id]) {
      acc[gen.campaign_id] = {
        campaign_name: gen.campaign_name,
        generations: []
      };
    }
    acc[gen.campaign_id].generations.push(gen);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b-2 border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <img src={mockAgency.logo} alt="Agency" className="w-10 h-10 rounded-full object-cover border-2 border-gray-200" />
                <span className="text-xl font-bold text-gray-900">Likelee Agency</span>
              </div>
              
              <div className="hidden md:flex items-center gap-1">
                <Button
                  variant={activeTab === "home" ? "default" : "ghost"}
                  onClick={() => setActiveTab("home")}
                  className="text-sm rounded-none"
                >
                  Home
                </Button>
                <Button
                  variant={activeTab === "marketplace" ? "default" : "ghost"}
                  onClick={() => setActiveTab("marketplace")}
                  className="text-sm rounded-none"
                >
                  Marketplace
                </Button>
                <Button
                  variant={activeTab === "clients" ? "default" : "ghost"}
                  onClick={() => setActiveTab("clients")}
                  className="text-sm rounded-none"
                >
                  Clients
                </Button>
                <Button
                  variant={activeTab === "campaigns" ? "default" : "ghost"}
                  onClick={() => setActiveTab("campaigns")}
                  className="text-sm rounded-none"
                >
                  Campaigns
                </Button>
                <Button
                  variant={activeTab === "studio" ? "default" : "ghost"}
                  onClick={() => setActiveTab("studio")}
                  className="text-sm rounded-none"
                >
                  Studio
                </Button>
                <Button
                  variant={activeTab === "performance" ? "default" : "ghost"}
                  onClick={() => setActiveTab("performance")}
                  className="text-sm rounded-none"
                >
                  Performance
                </Button>
                <Button
                  variant={activeTab === "settings" ? "default" : "ghost"}
                  onClick={() => setActiveTab("settings")}
                  className="text-sm rounded-none"
                >
                  Settings
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <label className="text-sm text-gray-600 mr-2">Client:</label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="border-2 border-gray-300 px-4 py-2 rounded-none text-sm font-medium bg-white"
                >
                  <option value="all">All Clients</option>
                  {mockClients.map(client => (
                    <option key={client.id} value={client.id.toString()}>{client.name}</option>
                  ))}
                </select>
              </div>
              <Button variant="ghost" size="icon" className="rounded-none">
                <Search className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-none">
                <Bell className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-none">
                <HelpCircle className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-none">
                <User className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {selectedClient !== "all" && (
          <Alert className="mb-8 bg-white border-2 border-cyan-600 rounded-none">
            <Building2 className="h-5 w-5 text-cyan-600" />
            <AlertDescription className="text-gray-900 font-medium flex items-center justify-between">
              <span>
                Viewing data for: <strong>{mockClients.find(c => c.id.toString() === selectedClient)?.name}</strong>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedClient("all")}
                className="border-cyan-600 text-cyan-600 rounded-none"
              >
                View All Clients
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Alert className="mb-8 bg-cyan-50 border-2 border-cyan-600 rounded-none">
          <AlertCircle className="h-5 w-5 text-cyan-600" />
          <AlertDescription className="text-cyan-900 font-medium">
            🎬 <strong>Demo Mode:</strong> This is a preview of the Marketing Agency Dashboard - a multi-client command center.
          </AlertDescription>
        </Alert>

        {activeTab === "home" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome back, {mockAgency.name}
              </h1>
              <p className="text-gray-600">
                {selectedClient === "all" 
                  ? `You're managing ${mockAgency.clients} clients and ${mockAgency.active_campaigns} active campaigns.`
                  : `Viewing ${mockClients.find(c => c.id.toString() === selectedClient)?.name}'s account with ${clientStats.campaigns} campaigns.`
                }
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
                <div className="flex items-center justify-between mb-4">
                  <FileText className="w-8 h-8 text-cyan-600" />
                </div>
                <p className="text-sm text-gray-600 mb-1">Active Campaigns</p>
                <p className="text-3xl font-bold text-gray-900">{clientStats.campaigns}</p>
              </Card>

              <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
                <div className="flex items-center justify-between mb-4">
                  <Video className="w-8 h-8 text-cyan-600" />
                </div>
                <p className="text-sm text-gray-600 mb-1">Total Generations</p>
                <p className="text-3xl font-bold text-gray-900">{clientStats.generations}</p>
              </Card>

              <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
                <div className="flex items-center justify-between mb-4">
                  <DollarSign className="w-8 h-8 text-cyan-600" />
                </div>
                <p className="text-sm text-gray-600 mb-1">Total Spend</p>
                <p className="text-3xl font-bold text-gray-900">${(clientStats.spend / 1000).toFixed(1)}K</p>
              </Card>

              <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
                <div className="flex items-center justify-between mb-4">
                  <Globe className="w-8 h-8 text-cyan-600" />
                </div>
                <p className="text-sm text-gray-600 mb-1">Ad Accounts</p>
                <p className="text-3xl font-bold text-gray-900">{clientStats.ad_accounts}</p>
              </Card>
            </div>

            <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid md:grid-cols-4 gap-4">
                <Button
                  onClick={() => setActiveTab("marketplace")}
                  className="h-24 bg-gradient-to-br from-cyan-500 to-cyan-600 hover:opacity-90 text-white flex-col gap-2 rounded-none"
                >
                  <Search className="w-6 h-6" />
                  <span>Find Creators</span>
                </Button>
                <Button
                  onClick={() => setShowCampaignBuilder(true)}
                  className="h-24 bg-gradient-to-br from-cyan-600 to-cyan-700 hover:opacity-90 text-white flex-col gap-2 rounded-none"
                >
                  <Plus className="w-6 h-6" />
                  <span>New Campaign</span>
                </Button>
                <Button
                  onClick={() => setActiveTab("studio")}
                  className="h-24 bg-gradient-to-br from-cyan-700 to-cyan-800 hover:opacity-90 text-white flex-col gap-2 rounded-none"
                >
                  <Zap className="w-6 h-6" />
                  <span>Studio</span>
                </Button>
                <Button
                  onClick={() => setActiveTab("performance")}
                  className="h-24 bg-gradient-to-br from-cyan-800 to-cyan-900 hover:opacity-90 text-white flex-col gap-2 rounded-none"
                >
                  <BarChart3 className="w-6 h-6" />
                  <span>Analytics</span>
                </Button>
              </div>
            </Card>

            {Object.keys(generationsByCampaign).length > 0 && (
              <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Generations by Campaign</h3>
                <div className="space-y-6">
                  {Object.entries(generationsByCampaign).map(([campaignId, data]) => (
                    <div key={campaignId} className="border-b pb-4 last:border-b-0">
                      <h4 className="font-bold text-gray-900 mb-3">{data.campaign_name}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {data.generations.map(gen => (
                          <div key={gen.id} className="group relative">
                            <div className="aspect-video bg-gray-100 rounded-none overflow-hidden border-2 border-gray-200">
                              <img src={gen.thumbnail} alt="" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <Button size="sm" className="bg-white text-gray-900 hover:bg-gray-100 rounded-none">
                                  <Eye className="w-3 h-3 mr-1" />
                                  View
                                </Button>
                                <Button size="sm" variant="outline" className="border-white text-white hover:bg-white/20 rounded-none">
                                  <Download className="w-3 h-3 mr-1" />
                                  Download
                                </Button>
                              </div>
                            </div>
                            <div className="mt-2">
                              <Badge className={gen.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                {gen.status}
                              </Badge>
                              <p className="text-xs text-gray-500 mt-1">{gen.aspect_ratio} • {gen.created_date}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 pb-3 border-b border-gray-200">
                    <Clock className="w-4 h-4 text-gray-500 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 font-medium">Campaign "Nike Spring Collection" started</p>
                      <p className="text-xs text-gray-500">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 pb-3 border-b border-gray-200">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 font-medium">3 videos approved for Tesla campaign</p>
                      <p className="text-xs text-gray-500">5 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="w-4 h-4 text-cyan-600 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 font-medium">New creator "Sarah Johnson" added</p>
                      <p className="text-xs text-gray-500">1 day ago</p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Top Performing Clients</h3>
                <div className="space-y-3">
                  {mockClients.map((client, idx) => (
                    <div key={client.id} className="flex items-center justify-between p-3 bg-gray-50 border-2 border-gray-200 rounded-none">
                      <div className="flex items-center gap-3">
                        <img src={client.logo} alt={client.name} className="w-10 h-10 rounded-full object-cover border-2 border-gray-200" />
                        <div>
                          <p className="font-medium text-gray-900">{client.name}</p>
                          <p className="text-xs text-gray-500">{client.campaigns} campaigns</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">${(client.spend / 1000).toFixed(1)}K</p>
                        <Badge className="bg-green-100 text-green-800">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          +{(idx + 1) * 12}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "marketplace" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Creator Marketplace</h1>
                <p className="text-gray-600">Discover and connect with creators and AI talent</p>
              </div>
              <Button className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-none">
                <Filter className="w-4 h-4 mr-2" />
                Advanced Filters
              </Button>
            </div>

            <div className="flex gap-4">
              <Input
                placeholder="Search creators by name, niche, or platform..."
                className="flex-1 border-2 border-gray-300 rounded-none"
              />
              <Button className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-none">
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {mockCreators.map(creator => (
                <Card key={creator.id} className="p-6 bg-white border-2 border-gray-200 hover:shadow-lg transition-all rounded-none">
                  <div className="flex items-start gap-4 mb-4">
                    <img
                      src={creator.image}
                      alt={creator.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                    />
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-1">{creator.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{creator.tagline}</p>
                      <div className="flex flex-wrap gap-1">
                        {creator.platforms.map(platform => (
                          <Badge key={platform} className="bg-gray-200 text-gray-700 text-xs">
                            {platform}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Followers</p>
                      <p className="text-base font-bold text-gray-900">
                        {creator.followers > 0 ? `${(creator.followers / 1000).toFixed(0)}K` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Engagement</p>
                      <p className="text-base font-bold text-gray-900">{creator.engagement}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Starting at</p>
                      <p className="text-base font-bold text-gray-900">${creator.price}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Approval</p>
                      <p className="text-base font-bold text-gray-900">{creator.approval_rate}%</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-none">
                      Add to Campaign
                    </Button>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1 border-2 border-gray-300 rounded-none"
                        onClick={() => setShowPreviewModal(creator)}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1 border-2 border-gray-300 rounded-none"
                        onClick={() => setShowCreatorProfile(creator)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Profile
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === "clients" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Clients</h1>
                <p className="text-gray-600">Manage your client accounts and relationships</p>
              </div>
              <Button className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-none">
                <Plus className="w-4 h-4 mr-2" />
                Add Client
              </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {mockClients.map(client => (
                <Card key={client.id} className="p-6 bg-white border-2 border-gray-200 hover:shadow-lg transition-all rounded-none">
                  <div className="flex items-start gap-4 mb-4">
                    <img src={client.logo} alt={client.name} className="w-16 h-16 rounded-full object-cover border-2 border-gray-200" />
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-1">{client.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{client.industry}</p>
                      <Badge className="bg-green-100 text-green-800">
                        {client.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Active Campaigns</span>
                      <span className="font-bold text-gray-900">{client.campaigns}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Spend</span>
                      <span className="font-bold text-gray-900">${(client.spend / 1000).toFixed(1)}K</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Ad Accounts</span>
                      <span className="font-bold text-gray-900">{client.ad_accounts}</span>
                    </div>
                  </div>

                  <Button 
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-none"
                    onClick={() => setSelectedClient(client.id.toString())}
                  >
                    View Details
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === "campaigns" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Campaigns</h1>
                <p className="text-gray-600">
                  {selectedClient === "all" 
                    ? "All active campaigns across clients"
                    : `Campaigns for ${mockClients.find(c => c.id.toString() === selectedClient)?.name}`
                  }
                </p>
              </div>
              <Button 
                onClick={() => setShowCampaignBuilder(true)}
                className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-none"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </div>

            <div className="space-y-4">
              {filteredCampaigns.map(campaign => (
                <Card key={campaign.id} className="p-6 bg-white border-2 border-gray-200 hover:shadow-lg transition-all rounded-none">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{campaign.name}</h3>
                      <p className="text-gray-600 mb-3">Client: {campaign.client}</p>
                      <Badge className="bg-green-100 text-green-800">
                        {campaign.status}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-none">
                      <Settings className="w-5 h-5" />
                    </Button>
                  </div>

                  <div className="grid md:grid-cols-5 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Start Date</p>
                      <p className="font-medium text-gray-900">{campaign.start_date}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">End Date</p>
                      <p className="font-medium text-gray-900">{campaign.end_date}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Budget</p>
                      <p className="font-medium text-gray-900">${(campaign.budget / 1000).toFixed(1)}K</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Creators</p>
                      <p className="font-medium text-gray-900">{campaign.creators}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Deliverables</p>
                      <p className="font-medium text-gray-900">{campaign.deliverables}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-3">
                    <Button className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-none">
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                    <Button variant="outline" className="border-2 border-gray-300 rounded-none">
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button variant="outline" className="border-2 border-gray-300 rounded-none">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Analytics
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === "studio" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Likelee Studio</h1>
              <p className="text-gray-600">
                {selectedClient === "all" 
                  ? "View all generations across clients"
                  : `Viewing generations for ${mockClients.find(c => c.id.toString() === selectedClient)?.name}`
                }
              </p>
            </div>

            {Object.keys(generationsByCampaign).length > 0 ? (
              <div className="space-y-6">
                {Object.entries(generationsByCampaign).map(([campaignId, data]) => (
                  <Card key={campaignId} className="p-6 bg-white border-2 border-gray-200 rounded-none">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900">{data.campaign_name}</h3>
                      <Badge className="bg-cyan-100 text-cyan-800">
                        {data.generations.length} generations
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {data.generations.map(gen => (
                        <Card key={gen.id} className="p-4 border-2 border-gray-200 rounded-none">
                          <div className="aspect-video bg-gray-100 rounded-none mb-3 overflow-hidden">
                            <img src={gen.thumbnail} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900">{gen.type}</span>
                            <Badge className={gen.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                              {gen.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mb-3">{gen.aspect_ratio}</p>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1 border-2 border-gray-300 rounded-none">
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1 border-2 border-gray-300 rounded-none">
                              <Edit3 className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
                <div className="text-center py-12">
                  <Zap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Generations Yet</h3>
                  <p className="text-gray-600 mb-6">Start creating content for your campaigns</p>
                  <Button 
                    onClick={() => setShowCampaignBuilder(true)}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-none"
                  >
                    Create Campaign
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}

        {activeTab === "performance" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Performance & Analytics</h1>
              <p className="text-gray-600">
                {selectedClient === "all" 
                  ? "Track ROI and engagement across all campaigns"
                  : `Performance analytics for ${mockClients.find(c => c.id.toString() === selectedClient)?.name}`
                }
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
                <p className="text-sm text-gray-600 mb-1">Total Campaigns</p>
                <p className="text-3xl font-bold text-gray-900">{clientStats.campaigns}</p>
              </Card>
              <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
                <p className="text-sm text-gray-600 mb-1">Avg Duration</p>
                <p className="text-3xl font-bold text-gray-900">18d</p>
              </Card>
              <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
                <p className="text-sm text-gray-600 mb-1">Avg Response Time</p>
                <p className="text-3xl font-bold text-gray-900">12h</p>
              </Card>
              <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
                <p className="text-sm text-gray-600 mb-1">Total ROI</p>
                <p className="text-3xl font-bold text-gray-900">3.4x</p>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-cyan-100 rounded-none flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-cyan-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Competitor Tracker</h3>
                    <p className="text-sm text-gray-600">Track up to 20 competitors</p>
                  </div>
                </div>
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-none">
                    <span className="text-sm text-gray-700">Competitors Tracked</span>
                    <span className="font-bold text-gray-900">12 / 20</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-none">
                    <span className="text-sm text-gray-700">Insights Generated</span>
                    <span className="font-bold text-gray-900">48</span>
                  </div>
                </div>
                <Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-none">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Competitor
                </Button>
              </Card>

              <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-cyan-100 rounded-none flex items-center justify-center">
                    <Globe className="w-6 h-6 text-cyan-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Ad Accounts</h3>
                    <p className="text-sm text-gray-600">Connect up to 3 platforms</p>
                  </div>
                </div>
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-none">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-600 rounded-none flex items-center justify-center text-white text-xs font-bold">
                        M
                      </div>
                      <span className="text-sm text-gray-700">Meta Ads</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Connected</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-none">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-black rounded-none flex items-center justify-center text-white text-xs font-bold">
                        T
                      </div>
                      <span className="text-sm text-gray-700">TikTok Ads</span>
                    </div>
                    <Badge className="bg-gray-200 text-gray-700">Not Connected</Badge>
                  </div>
                </div>
                <Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-none">
                  <Plus className="w-4 h-4 mr-2" />
                  Connect Platform
                </Button>
              </Card>

              <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-cyan-100 rounded-none flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-cyan-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Ads Inspiration Library</h3>
                    <p className="text-sm text-gray-600">Browse winning ad creatives</p>
                  </div>
                </div>
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-none">
                    <span className="text-sm text-gray-700">Total Ads</span>
                    <span className="font-bold text-gray-900">2,450+</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-none">
                    <span className="text-sm text-gray-700">Categories</span>
                    <span className="font-bold text-gray-900">18</span>
                  </div>
                </div>
                <Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-none">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Browse Library
                </Button>
              </Card>

              <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-cyan-100 rounded-none flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-cyan-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Market Trend Analysis</h3>
                    <p className="text-sm text-gray-600">AI-powered trend detection</p>
                  </div>
                </div>
                <div className="space-y-3 mb-4">
                  <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-none">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-cyan-600" />
                      <span className="text-sm font-medium text-gray-900">Trending: UGC Testimonials</span>
                    </div>
                    <p className="text-xs text-gray-600">+47% engagement vs last month</p>
                  </div>
                  <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-none">
                    <div className="flex items-center gap-2 mb-1">
                      <Star className="w-4 h-4 text-cyan-600" />
                      <span className="text-sm font-medium text-gray-900">Hot Topic: AI-Generated</span>
                    </div>
                    <p className="text-xs text-gray-600">3.2x higher CTR</p>
                  </div>
                </div>
                <Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-none">
                  View All Trends
                </Button>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-600" />
                  Smart Ads Reports
                </h3>
                <p className="text-gray-600 mb-4">Automated performance reports with AI insights</p>
                <div className="space-y-2 mb-4">
                  <Button variant="outline" className="w-full justify-between border-2 border-gray-300 rounded-none">
                    <span>Weekly Performance Summary</span>
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" className="w-full justify-between border-2 border-gray-300 rounded-none">
                    <span>Monthly ROI Analysis</span>
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" className="w-full justify-between border-2 border-gray-300 rounded-none">
                    <span>Creative Performance Report</span>
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
                <Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-none">
                  Generate Custom Report
                </Button>
              </Card>

              <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-red-600" />
                  Creative Performance Alerts
                </h3>
                <p className="text-gray-600 mb-4">Get notified when creative performance changes</p>
                <div className="space-y-3">
                  <div className="p-3 bg-red-50 border border-red-200 rounded-none">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium text-gray-900">Campaign CTR Drop</span>
                    </div>
                    <p className="text-xs text-gray-600">Nike Spring Collection: -12% CTR in last 24h</p>
                  </div>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-none">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-900">High Performer</span>
                    </div>
                    <p className="text-xs text-gray-600">Sephora Video #3: 4.2x above benchmark</p>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-none">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-900">Optimization Suggestion</span>
                    </div>
                    <p className="text-xs text-gray-600">Try 9:16 format for +23% engagement</p>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Performance Over Time</h3>
              <div className="h-64 flex items-center justify-center bg-gray-50">
                <p className="text-gray-500">Chart placeholder - Will integrate with analytics API</p>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
            <Card className="p-6 bg-white border-2 border-gray-200 rounded-none">
              <p className="text-center text-gray-500 py-12">Settings coming soon</p>
            </Card>
          </div>
        )}
      </div>

      {showCampaignBuilder && (
        <CampaignBuilder
          onClose={() => setShowCampaignBuilder(false)}
          onSubmit={handleCreateCampaign}
        />
      )}

      {showCreatorProfile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="min-h-screen flex items-center justify-center p-6">
            <Card className="w-full max-w-4xl bg-white p-8 rounded-none">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-start gap-6">
                  <img 
                    src={showCreatorProfile.image} 
                    alt={showCreatorProfile.name}
                    className="w-32 h-32 rounded-full object-cover border-2 border-gray-200"
                  />
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">{showCreatorProfile.name}</h2>
                    <p className="text-gray-600 mb-3">{showCreatorProfile.tagline}</p>
                    <div className="flex gap-2">
                      {showCreatorProfile.platforms.map(platform => (
                        <Badge key={platform} className="bg-gray-200 text-gray-700">
                          {platform}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowCreatorProfile(null)} className="rounded-none">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Followers</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {showCreatorProfile.followers > 0 ? `${(showCreatorProfile.followers / 1000).toFixed(0)}K` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Engagement Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{showCreatorProfile.engagement}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Starting Price</p>
                    <p className="text-2xl font-bold text-gray-900">${showCreatorProfile.price}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Approval Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{showCreatorProfile.approval_rate}%</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-none">
                  Add to Campaign
                </Button>
                <Button 
                  variant="outline" 
                  className="border-2 border-gray-300 rounded-none"
                  onClick={() => setShowPreviewModal(showCreatorProfile)}
                >
                  <Play className="w-4 h-4 mr-2" />
                  View Preview
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="min-h-screen flex items-center justify-center p-6">
            <div className="w-full max-w-3xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">{showPreviewModal.name} - Preview Reel</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowPreviewModal(null)} className="text-white hover:bg-white/10 rounded-none">
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="relative bg-black rounded-none overflow-hidden">
                <div className="aspect-video flex items-center justify-center bg-gray-900">
                  <Play className="w-20 h-20 text-white opacity-50" />
                </div>
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="text-white text-6xl font-bold opacity-20 rotate-[-30deg]">
                    PREVIEW
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <Button className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-none">
                  Request Full Access
                </Button>
                <Button 
                  variant="outline" 
                  className="border-2 border-white text-white hover:bg-white/10 rounded-none"
                  onClick={() => {
                    setShowPreviewModal(null);
                    setShowCreatorProfile(showPreviewModal);
                  }}
                >
                  View Full Profile
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}