import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RoyaltyWallet from "./RoyaltyWallet";
import {
  Play, Plus, Edit, Trash2, Star, ExternalLink, TrendingUp,
  Eye, MessageSquare, Briefcase, DollarSign, Upload, Link as LinkIcon,
  Award, Target, Clock, CheckCircle
} from "lucide-react";

export default function TalentDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [uploadingProject, setUploadingProject] = useState(false);

  const [profileData, setProfileData] = useState({
    bio: "",
    hourly_rate: 0,
    project_rate_min: 0,
    project_rate_max: 0,
    availability: "available",
    available_for_collabs: true,
    skills_tags: [],
    ai_tools: [],
    external_links: {}
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
    } catch (err) {
      navigate(createPageUrl("CreatorSignup"));
    }
  };

  // Fetch portfolio
  const { data: portfolio, isLoading: portfolioLoading } = useQuery({
    queryKey: ['talentPortfolio', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return null;
      const profiles = await base44.entities.TalentPortfolio.filter({ user_email: currentUser.email });
      return profiles[0] || null;
    },
    enabled: !!currentUser
  });

  // Fetch projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['talentProjects', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.TalentProject.filter({ user_email: currentUser.email }, '-created_date');
    },
    enabled: !!currentUser
  });

  // Fetch job matches
  const { data: jobMatches = [], isLoading: matchesLoading } = useQuery({
    queryKey: ['jobMatches', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.JobMatch.filter({ user_email: currentUser.email }, '-match_score');
    },
    enabled: !!currentUser
  });

  // Create/Update portfolio
  const saveProfileMutation = useMutation({
    mutationFn: async (data) => {
      if (portfolio) {
        return await base44.entities.TalentPortfolio.update(portfolio.id, data);
      } else {
        return await base44.entities.TalentPortfolio.create({
          ...data,
          user_email: currentUser.email
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['talentPortfolio'] });
      setEditingProfile(false);
    }
  });

  // Delete project
  const deleteProjectMutation = useMutation({
    mutationFn: (projectId) => base44.entities.TalentProject.delete(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['talentProjects'] });
    }
  });

  // Set featured project
  const setFeaturedMutation = useMutation({
    mutationFn: async (projectId) => {
      if (portfolio) {
        return await base44.entities.TalentPortfolio.update(portfolio.id, {
          featured_project_id: projectId
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['talentPortfolio'] });
    }
  });

  const featuredProject = projects.find(p => p.id === portfolio?.featured_project_id);
  const conversionRate = portfolio?.inquiry_count > 0
    ? ((portfolio.booking_count / portfolio.inquiry_count) * 100).toFixed(1)
    : 0;

  const highMatches = jobMatches.filter(m => m.is_high_match);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8">
          <p className="text-gray-600">Loading...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-rose-50 py-8 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                AI Talent Dashboard
              </h1>
              <p className="text-lg text-gray-600">
                Welcome back, {currentUser.full_name}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={`${
                portfolio?.availability === 'available' ? 'bg-green-100 text-green-800' :
                portfolio?.availability === 'busy' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              } px-4 py-2 text-sm`}>
                {portfolio?.availability || 'Not Set'}
              </Badge>
              <Button
                onClick={() => navigate(createPageUrl("AITalentBoard"))}
                variant="outline"
                className="border-2 border-black rounded-none"
              >
                Browse Jobs
              </Button>
            </div>
          </div>
        </div>

        {/* Analytics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 bg-white border-2 border-black rounded-none">
            <div className="flex items-center justify-between mb-2">
              <Eye className="w-8 h-8 text-[#32C8D1]" />
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{portfolio?.profile_views || 0}</p>
            <p className="text-sm text-gray-600">Profile Views</p>
          </Card>

          <Card className="p-6 bg-white border-2 border-black rounded-none">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-8 h-8 text-[#F18B6A]" />
              <Badge className="bg-orange-100 text-orange-800 text-xs">{highMatches.length} high</Badge>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{jobMatches.length}</p>
            <p className="text-sm text-gray-600">Job Matches</p>
          </Card>

          <Card className="p-6 bg-white border-2 border-black rounded-none">
            <div className="flex items-center justify-between mb-2">
              <MessageSquare className="w-8 h-8 text-[#F7B750]" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{portfolio?.inquiry_count || 0}</p>
            <p className="text-sm text-gray-600">Inquiries Received</p>
          </Card>

          <Card className="p-6 bg-white border-2 border-black rounded-none">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <Badge className="bg-green-100 text-green-800 text-xs">{conversionRate}%</Badge>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{portfolio?.booking_count || 0}</p>
            <p className="text-sm text-gray-600">Bookings</p>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="portfolio" className="space-y-6">
          <TabsList className="bg-white border-2 border-black p-1 rounded-none">
            <TabsTrigger value="portfolio" className="rounded-none">Portfolio</TabsTrigger>
            <TabsTrigger value="jobs" className="rounded-none">
              Job Feed
              {highMatches.length > 0 && (
                <Badge className="ml-2 bg-[#F18B6A] text-white text-xs">{highMatches.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="profile" className="rounded-none">Profile Settings</TabsTrigger>
          </TabsList>

          {/* Portfolio Tab */}
          <TabsContent value="portfolio" className="space-y-6">
            {/* Featured Project */}
            {featuredProject && (
              <Card className="p-6 bg-gradient-to-br from-[#F18B6A] to-pink-500 border-2 border-black rounded-none">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Star className="w-6 h-6 text-white fill-white" />
                    <h3 className="text-xl font-bold text-white">Featured Project</h3>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-none p-4">
                  <h4 className="text-2xl font-bold text-white mb-2">{featuredProject.title}</h4>
                  <p className="text-white/90 mb-4">{featuredProject.description}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {featuredProject.tools_used?.map((tool, i) => (
                      <Badge key={i} className="bg-white/20 text-white border border-white/30">
                        {tool}
                      </Badge>
                    ))}
                  </div>
                  {featuredProject.media_url && (
                    <video
                      src={featuredProject.media_url}
                      controls
                      className="w-full max-h-96 bg-black border-2 border-white rounded-none"
                    />
                  )}
                </div>
              </Card>
            )}

            {/* Projects Grid */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Your Projects</h3>
                <Button
                  onClick={() => navigate(createPageUrl("UploadProject"))}
                  className="bg-[#F18B6A] hover:bg-[#E07A5A] text-white border-2 border-black rounded-none"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Upload Project
                </Button>
              </div>

              {projects.length === 0 ? (
                <Card className="p-12 text-center border-2 border-dashed border-gray-300 rounded-none">
                  <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-xl font-bold text-gray-900 mb-2">No projects yet</h4>
                  <p className="text-gray-600 mb-6">
                    Start building your portfolio by uploading your first AI-generated project
                  </p>
                  <Button
                    onClick={() => navigate(createPageUrl("UploadProject"))}
                    className="bg-[#F18B6A] hover:bg-[#E07A5A] text-white border-2 border-black rounded-none"
                  >
                    Upload Your First Project
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map((project) => (
                    <Card key={project.id} className="bg-white border-2 border-black rounded-none overflow-hidden group hover:shadow-xl transition-all">
                      {project.media_url && (
                        <div className="relative aspect-video bg-gray-900">
                          <video
                            src={project.media_url}
                            className="w-full h-full object-cover"
                            controls
                          />
                          {project.id === portfolio?.featured_project_id && (
                            <div className="absolute top-2 right-2">
                              <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                            </div>
                          )}
                        </div>
                      )}
                      <div className="p-4">
                        <h4 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
                          {project.title}
                        </h4>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {project.description}
                        </p>
                        <div className="flex flex-wrap gap-1 mb-4">
                          {project.tools_used?.slice(0, 3).map((tool, i) => (
                            <Badge key={i} className="bg-orange-100 text-orange-800 text-xs">
                              {tool}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              <span>{project.view_count || 0}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {project.id !== portfolio?.featured_project_id && (
                              <Button
                                onClick={() => setFeaturedMutation.mutate(project.id)}
                                variant="ghost"
                                size="sm"
                                className="p-2"
                                title="Set as featured"
                              >
                                <Star className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              onClick={() => deleteProjectMutation.mutate(project.id)}
                              variant="ghost"
                              size="sm"
                              className="p-2 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Job Feed Tab */}
          <TabsContent value="jobs" className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Matched Opportunities</h3>
              {jobMatches.length === 0 ? (
                <Card className="p-12 text-center border-2 border-gray-200 rounded-none">
                  <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-xl font-bold text-gray-900 mb-2">No job matches yet</h4>
                  <p className="text-gray-600 mb-6">
                    Complete your profile and upload projects to start receiving matched opportunities
                  </p>
                  <Button
                    onClick={() => navigate(createPageUrl("AITalentBoard"))}
                    variant="outline"
                    className="border-2 border-black rounded-none"
                  >
                    Browse All Jobs
                  </Button>
                </Card>
              ) : (
                <div className="space-y-4">
                  {jobMatches.map((match) => (
                    <Card key={match.id} className="p-6 bg-white border-2 border-black rounded-none hover:shadow-lg transition-all">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-xl font-bold text-gray-900">{match.job_title}</h4>
                            {match.is_high_match && (
                              <Badge className="bg-green-500 text-white">High Match</Badge>
                            )}
                          </div>
                          <p className="text-gray-600 font-medium mb-2">{match.company}</p>
                          <p className="text-gray-700 mb-4">{match.job_description}</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-2 mb-2">
                            <Target className="w-5 h-5 text-[#F18B6A]" />
                            <span className="text-2xl font-bold text-gray-900">{match.match_score}%</span>
                          </div>
                          <p className="text-sm text-gray-600">Match</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {match.matched_skills?.map((skill, i) => (
                          <Badge key={i} className="bg-[#32C8D1] text-white">
                            {skill}
                          </Badge>
                        ))}
                      </div>

                      {match.budget_range && (
                        <div className="flex items-center gap-2 text-gray-700 mb-4">
                          <DollarSign className="w-5 h-5 text-[#F7B750]" />
                          <span className="font-medium">{match.budget_range}</span>
                        </div>
                      )}

                      <div className="flex gap-3">
                        <Button
                          className="flex-1 bg-[#F18B6A] hover:bg-[#E07A5A] text-white border-2 border-black rounded-none"
                        >
                          Apply Now
                        </Button>
                        <Button
                          variant="outline"
                          className="border-2 border-black rounded-none"
                        >
                          View Details
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Profile Settings Tab */}
          
          <TabsContent value="profile" className="space-y-6">
            <Card className="p-6 bg-white border-2 border-black rounded-none">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Profile Settings</h3>

              <div className="space-y-6">
                {/* Bio */}
                <div>
                  <Label htmlFor="bio" className="text-sm font-medium text-gray-900 mb-2 block">
                    Professional Bio
                  </Label>
                  <Textarea
                    id="bio"
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    placeholder="Tell brands and studios about your AI creative expertise..."
                    className="min-h-[120px] border-2 border-gray-300 rounded-none"
                  />
                </div>

                {/* Rates */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="hourly_rate" className="text-sm font-medium text-gray-900 mb-2 block">
                      Hourly Rate ($)
                    </Label>
                    <Input
                      id="hourly_rate"
                      type="number"
                      value={profileData.hourly_rate}
                      onChange={(e) => setProfileData({ ...profileData, hourly_rate: Number(e.target.value) })}
                      className="border-2 border-gray-300 rounded-none"
                    />
                  </div>
                  <div>
                    <Label htmlFor="project_min" className="text-sm font-medium text-gray-900 mb-2 block">
                      Project Min ($)
                    </Label>
                    <Input
                      id="project_min"
                      type="number"
                      value={profileData.project_rate_min}
                      onChange={(e) => setProfileData({ ...profileData, project_rate_min: Number(e.target.value) })}
                      className="border-2 border-gray-300 rounded-none"
                    />
                  </div>
                  <div>
                    <Label htmlFor="project_max" className="text-sm font-medium text-gray-900 mb-2 block">
                      Project Max ($)
                    </Label>
                    <Input
                      id="project_max"
                      type="number"
                      value={profileData.project_rate_max}
                      onChange={(e) => setProfileData({ ...profileData, project_rate_max: Number(e.target.value) })}
                      className="border-2 border-gray-300 rounded-none"
                    />
                  </div>
                </div>

                {/* Availability & Collabs */}
                <div className="grid md:grid-cols-2 gap-6 p-4 bg-gray-50 border-2 border-gray-200 rounded-none">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium text-gray-900 mb-1 block">
                        Availability Status
                      </Label>
                      <p className="text-xs text-gray-600">Show brands your current status</p>
                    </div>
                    <select
                      value={profileData.availability}
                      onChange={(e) => setProfileData({ ...profileData, availability: e.target.value })}
                      className="border-2 border-gray-300 rounded-none px-3 py-2 text-sm font-medium"
                    >
                      <option value="available">Available</option>
                      <option value="busy">Busy</option>
                      <option value="unavailable">Unavailable</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium text-gray-900 mb-1 block">
                        Open for Brand Collabs
                      </Label>
                      <p className="text-xs text-gray-600">Auto-recommend to businesses</p>
                    </div>
                    <Switch
                      checked={profileData.available_for_collabs}
                      onCheckedChange={(checked) => setProfileData({ ...profileData, available_for_collabs: checked })}
                    />
                  </div>
                </div>

                {/* External Links */}
                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-3 block">
                    External Profiles
                  </Label>
                  <div className="grid md:grid-cols-2 gap-4">
                    {['youtube', 'tiktok', 'instagram', 'twitter', 'artstation'].map((platform) => (
                      <div key={platform}>
                        <Label htmlFor={platform} className="text-xs text-gray-600 mb-1 block capitalize">
                          {platform}
                        </Label>
                        <div className="flex items-center gap-2">
                          <LinkIcon className="w-4 h-4 text-gray-400" />
                          <Input
                            id={platform}
                            value={profileData.external_links?.[platform] || ''}
                            onChange={(e) => setProfileData({
                              ...profileData,
                              external_links: {
                                ...profileData.external_links,
                                [platform]: e.target.value
                              }
                            })}
                            placeholder={`https://${platform}.com/...`}
                            className="border-2 border-gray-300 rounded-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => saveProfileMutation.mutate(profileData)}
                  disabled={saveProfileMutation.isPending}
                  className="w-full h-14 text-lg bg-gradient-to-r from-[#F18B6A] to-pink-500 hover:from-[#E07A5A] hover:to-pink-600 text-white border-2 border-black rounded-none"
                >
                  {saveProfileMutation.isPending ? 'Saving...' : 'Save Profile'}
                </Button>

                {/* Licensing + Royalty Wallet (read-only) */}
                <div className="mt-10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xl font-bold text-gray-900">Licensing & Earnings</h4>
                    <Button
                      onClick={() => navigate(createPageUrl("LicensingSettings"))}
                      variant="outline"
                      className="border-2 border-black rounded-none"
                    >
                      Licensing Settings
                    </Button>
                  </div>
                  <Card className="p-4 bg-white border-2 border-black rounded-none">
                    <RoyaltyWallet faceName={currentUser?.full_name} />
                  </Card>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}