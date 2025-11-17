
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  X, ArrowRight, ArrowLeft, Upload, CheckCircle2, Calendar,
  FileText, Users, Sparkles, BarChart3, AlertCircle, Play,
  Eye, Plus, Download, Globe, DollarSign, RefreshCw, ExternalLink,
  Edit3, Video, Mic, Volume2, Sliders // Added new icons
} from "lucide-react";

const mockClients = [
  { id: 1, name: "Nike" },
  { id: 2, name: "Sephora" },
  { id: 3, name: "Tesla" }
];

const mockCreators = [
  {
    id: 1,
    name: "Alex Rivera",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
    price: 450,
    followers: "245K",
    approval_time: "12h",
    cameo_video: "https://example.com/alex-cameo.mp4"
  },
  {
    id: 2,
    name: "Jordan Kim",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
    price: 380,
    followers: "189K",
    approval_time: "24h",
    cameo_video: "https://example.com/jordan-cameo.mp4"
  },
  {
    id: 3,
    name: "Maya Chen (AI)",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200",
    price: 520,
    followers: "N/A",
    approval_time: "Instant",
    cameo_video: null
  }
];

export default function CampaignBuilder({ onClose, onSubmit }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [generatingObjective, setGeneratingObjective] = useState(false);
  const [campaignSubmitted, setCampaignSubmitted] = useState(false);
  const [showCameoLibrary, setShowCameoLibrary] = useState(false); // New state for cameo library modal
  const [showVoiceToneModal, setShowVoiceToneModal] = useState(false); // New state for voice tone modal
  const [studioTab, setStudioTab] = useState("setup"); // New state for managing studio sub-tabs ("setup", "review", "edit")
  const [formData, setFormData] = useState({
    // Step 1
    client: "",
    campaign_title: "",
    category: "",
    budget: "",
    regions: [], // Re-added as per new outline
    start_date: "",
    end_date: "",
    license_type: "30-day",
    usage_scope: [],
    
    // Step 2
    uploaded_brief: null,
    creative_objective: "",
    key_message: "",
    target_audience: "",
    hashtags: [], // Re-added as per new outline
    deliverables: "",
    
    // Step 3
    selected_creators: [],
    allow_creator_approval: false,
    
    // Step 4
    creation_method: "studio", // or "upload"
    ai_model: "",
    generation_type: "",
    creator_cameo_url: "",
    script: "",
    ai_voice: "",
    voice_tone: "", // New field
    style_template: "",
    aspect_ratio: "16:9",
    
    // Step 5
    tracking_pixels: "",
    connect_ad_account: false,
    auto_report: false
  });

  const steps = [
    { number: 1, title: "Client & Info", icon: FileText },
    { number: 2, title: "Brief", icon: FileText },
    { number: 3, title: "Talent", icon: Users },
    { number: 4, title: "AI Creation", icon: Sparkles },
    { number: 5, title: "Rights", icon: CheckCircle2 },
    { number: 6, title: "Summary", icon: BarChart3 }
  ];

  const progress = (currentStep / 6) * 100;

  const handleNext = () => {
    if (currentStep < 6) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSaveDraft = () => {
    console.log("Saving draft:", formData);
    alert("Campaign draft saved!");
  };

  const handleGenerateObjective = async () => {
    if (!formData.uploaded_brief) {
      alert("Please upload a brief first to generate objective");
      return;
    }
    
    setGeneratingObjective(true);
    // Simulate LLM generation - will be replaced with actual API call
    setTimeout(() => {
      const generatedText = `Based on your brief, this campaign aims to increase brand awareness and drive engagement through authentic creator-led content that resonates with your target demographic. The primary goal is to showcase product benefits while maintaining a genuine, relatable tone that encourages social sharing and community building.`;
      updateFormData('creative_objective', generatedText);
      setGeneratingObjective(false);
    }, 2000);
  };

  const handleFinish = () => {
    console.log("Submitting campaign:", formData);
    setCampaignSubmitted(true);
    if (onSubmit) onSubmit(formData);
  };

  const handleViewClientReview = () => {
    // Navigate to client review portal
    console.log("Opening client review portal");
    onClose && onClose();
    // In real app: navigate(createPageUrl("CampaignReview") + "?id=" + campaignId);
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayField = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value]
    }));
  };

  const getSelectedCreatorNames = () => {
    return formData.selected_creators
      .map(id => mockCreators.find(c => c.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  };

  const getSelectedCreatorCameos = () => {
    return formData.selected_creators
      .map(id => mockCreators.find(c => c.id === id))
      .filter(c => c && c.cameo_video);
  };

  // If campaign submitted, show success screen
  if (campaignSubmitted) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="bg-white rounded-lg w-full max-w-3xl p-12">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Campaign Created Successfully!</h2>
              <p className="text-lg text-gray-600 mb-8">
                Your campaign "{formData.campaign_title}" has been submitted and assets will begin processing. 
                Creators have been notified and typically respond within 12-24 hours.
              </p>

              <div className="bg-cyan-50 border-2 border-cyan-200 rounded-lg p-6 mb-8">
                <h3 className="font-bold text-gray-900 mb-3">What happens next?</h3>
                <ol className="text-left space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-cyan-600 flex-shrink-0">1.</span>
                    <span>Selected creators review and approve participation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-cyan-600 flex-shrink-0">2.</span>
                    <span>AI assets begin generation with your specifications</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-cyan-600 flex-shrink-0">3.</span>
                    <span>You'll receive notifications as assets are delivered</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-cyan-600 flex-shrink-0">4.</span>
                    <span>Share results with your client via review portal</span>
                  </li>
                </ol>
              </div>

              <div className="flex gap-4 justify-center">
                <Button
                  onClick={handleViewClientReview}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white px-8"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Review with Client
                </Button>
                <Button
                  onClick={() => {
                    setCampaignSubmitted(false);
                    setCurrentStep(1);
                    setFormData({
                      client: "",
                      campaign_title: "",
                      category: "",
                      budget: "",
                      regions: [], // Re-added to reset
                      start_date: "",
                      end_date: "",
                      license_type: "30-day",
                      usage_scope: [],
                      uploaded_brief: null,
                      creative_objective: "",
                      key_message: "",
                      target_audience: "",
                      hashtags: [], // Re-added to reset
                      deliverables: "",
                      selected_creators: [],
                      allow_creator_approval: false,
                      creation_method: "studio",
                      ai_model: "",
                      generation_type: "",
                      creator_cameo_url: "",
                      script: "",
                      ai_voice: "",
                      voice_tone: "", // Re-added to reset
                      style_template: "",
                      aspect_ratio: "16:9",
                      tracking_pixels: "",
                      connect_ad_account: false,
                      auto_report: false
                    });
                  }}
                  variant="outline"
                  className="border-2 border-gray-300 px-8"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Another Campaign
                </Button>
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="border-2 border-gray-300 px-8"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-lg w-full max-w-5xl">
          {/* Header */}
          <div className="border-b-2 border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Create New Campaign</h2>
              <Button variant="ghost" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Progress Stepper */}
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    currentStep === step.number 
                      ? 'bg-cyan-600 border-cyan-600 text-white'
                      : currentStep > step.number
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                    {currentStep > step.number ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className="text-xs mt-2 text-gray-600 hidden md:block">{step.title}</span>
                </div>
              ))}
            </div>

            <Progress value={progress} className="h-2" />
          </div>

          {/* Content */}
          <div className="p-6 min-h-[500px]">
            {/* Step 1: Client & Campaign Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Client *</label>
                    <Select value={formData.client} onValueChange={(v) => updateFormData('client', v)}>
                      <SelectTrigger className="border-2 border-gray-300">
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockClients.map(client => (
                          <SelectItem key={client.id} value={client.name}>{client.name}</SelectItem>
                        ))}
                        <SelectItem value="new">+ Add New Client</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Campaign Title *</label>
                    <Input
                      value={formData.campaign_title}
                      onChange={(e) => updateFormData('campaign_title', e.target.value)}
                      placeholder="e.g., Spring Collection Launch"
                      className="border-2 border-gray-300"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Category</label>
                    <Select value={formData.category} onValueChange={(v) => updateFormData('category', v)}>
                      <SelectTrigger className="border-2 border-gray-300">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="product_launch">Product Launch</SelectItem>
                        <SelectItem value="ugc_series">UGC Series</SelectItem>
                        <SelectItem value="brand_film">Brand Film</SelectItem>
                        <SelectItem value="ad_spot">Ad Spot</SelectItem>
                        <SelectItem value="social_campaign">Social Campaign</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Budget ($)</label>
                    <Input
                      type="number"
                      value={formData.budget}
                      onChange={(e) => updateFormData('budget', e.target.value)}
                      placeholder="10000"
                      className="border-2 border-gray-300"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Start Date</label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => updateFormData('start_date', e.target.value)}
                      className="border-2 border-gray-300"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">End Date</label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => updateFormData('end_date', e.target.value)}
                      className="border-2 border-gray-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">License Type</label>
                  <Select value={formData.license_type} onValueChange={(v) => updateFormData('license_type', v)}>
                    <SelectTrigger className="border-2 border-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_licensing">No Licensing</SelectItem>
                      <SelectItem value="flat">Flat Rate</SelectItem>
                      <SelectItem value="cpm">CPM Based</SelectItem>
                      <SelectItem value="30-day">30-Day License</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-3">Usage Scope</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {['Paid Social', 'Organic', 'Web Ads', 'TV', 'Print', 'Broadcast'].map(scope => (
                      <label key={scope} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.usage_scope.includes(scope)}
                          onChange={() => toggleArrayField('usage_scope', scope)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-gray-700">{scope}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-3">Regions</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {['North America', 'Europe', 'Asia', 'South America', 'Africa', 'Oceania'].map(region => (
                      <label key={region} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.regions.includes(region)}
                          onChange={() => toggleArrayField('regions', region)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-gray-700">{region}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <Card className="p-4 bg-cyan-50 border-2 border-cyan-200">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-cyan-900 mb-1">Tips for Better Campaign Setup</p>
                      <p className="text-sm text-cyan-700">Specify region early for auto-compliance. Choose license type that matches your distribution plan.</p>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Step 2: Brief & Objectives */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Upload Brief / References</label>
                  {/* For demo purposes, clicking this simulates an upload */}
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-cyan-500 transition-colors cursor-pointer"
                    onClick={() => updateFormData('uploaded_brief', { name: "campaign_brief.pdf", size: "1MB" })}
                  >
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-700 mb-1">Drop files here or click to upload</p>
                    <p className="text-xs text-gray-500">PDF, PPT, Images, or Moodboards</p>
                    {formData.uploaded_brief && (
                      <Badge className="mt-2 bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Brief uploaded
                      </Badge>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Creative Objective *</label>
                    <Button
                      onClick={handleGenerateObjective}
                      disabled={generatingObjective || !formData.uploaded_brief}
                      variant="outline"
                      size="sm"
                      className="border-2 border-cyan-600 text-cyan-600 hover:bg-cyan-50"
                    >
                      {generatingObjective ? (
                        <>
                          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 mr-1" />
                          Generate from Brief
                        </>
                      )}
                    </Button>
                  </div>
                  <Textarea
                    value={formData.creative_objective}
                    onChange={(e) => updateFormData('creative_objective', e.target.value)}
                    placeholder="Describe the creative direction and campaign goals... or upload a brief and click Generate"
                    className="border-2 border-gray-300 min-h-32"
                  />
                  <p className="text-xs text-gray-500 mt-1">~250 words</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Key Message</label>
                  <Input
                    value={formData.key_message}
                    onChange={(e) => updateFormData('key_message', e.target.value)}
                    placeholder="One compelling statement..."
                    className="border-2 border-gray-300"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Target Audience</label>
                  <Input
                    value={formData.target_audience}
                    onChange={(e) => updateFormData('target_audience', e.target.value)}
                    placeholder="e.g., Women 25-40, Urban, Fashion-forward"
                    className="border-2 border-gray-300"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Hashtags</label>
                  <Input
                    value={formData.hashtags.join(', ')}
                    onChange={(e) => updateFormData('hashtags', e.target.value.split(',').map(tag => tag.trim()))}
                    placeholder="e.g., #SpringFashion #NewArrivals"
                    className="border-2 border-gray-300"
                  />
                  <p className="text-xs text-gray-500 mt-1">Separate with commas</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Deliverables</label>
                  <Textarea
                    value={formData.deliverables}
                    onChange={(e) => updateFormData('deliverables', e.target.value)}
                    placeholder="List expected deliverables: UGC clips, still ads, voice-over spots, etc."
                    className="border-2 border-gray-300 min-h-24"
                  />
                </div>

                <Button variant="outline" className="border-2 border-gray-300">
                  <Upload className="w-4 h-4 mr-2" />
                  Import from Google Doc / Notion
                </Button>
              </div>
            )}

            {/* Step 3: Talent & Likeness */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <Tabs defaultValue="verified" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="verified">Verified Creators</TabsTrigger>
                    <TabsTrigger value="ai">AI Talent</TabsTrigger>
                  </TabsList>

                  <TabsContent value="verified" className="space-y-4">
                    <div className="relative mb-4">
                      <Input placeholder="Search creators..." className="border-2 border-gray-300 pl-10" />
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      {mockCreators.filter(c => !c.name.includes('AI')).map(creator => (
                        <Card key={creator.id} className="p-4 border-2 border-gray-200 hover:border-cyan-500 transition-all cursor-pointer">
                          <div className="flex items-start gap-4">
                            <img src={creator.image} alt={creator.name} className="w-16 h-16 rounded-lg object-cover" />
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-900 mb-1">{creator.name}</h4>
                              <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mb-3">
                                <div>
                                  <p className="text-gray-500">Followers</p>
                                  <p className="font-medium">{creator.followers}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Price</p>
                                  <p className="font-medium">${creator.price}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Response</p>
                                  <p className="font-medium">{creator.approval_time}</p>
                                </div>
                              </div>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={formData.selected_creators.includes(creator.id)}
                                  onChange={() => toggleArrayField('selected_creators', creator.id)}
                                  className="w-4 h-4"
                                />
                                <span className="text-sm text-gray-700">Select for campaign</span>
                              </label>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="ai" className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      {mockCreators.filter(c => c.name.includes('AI')).map(creator => (
                        <Card key={creator.id} className="p-4 border-2 border-gray-200 hover:border-cyan-500 transition-all cursor-pointer">
                          <div className="flex items-start gap-4">
                            <img src={creator.image} alt={creator.name} className="w-16 h-16 rounded-lg object-cover" />
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-900 mb-1">{creator.name}</h4>
                              <Badge className="bg-purple-100 text-purple-700 mb-3">AI Talent</Badge>
                              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                                <div>
                                  <p className="text-gray-500">Price</p>
                                  <p className="font-medium">${creator.price}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Response</p>
                                  <p className="font-medium">{creator.approval_time}</p>
                                </div>
                              </div>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={formData.selected_creators.includes(creator.id)}
                                  onChange={() => toggleArrayField('selected_creators', creator.id)}
                                  className="w-4 h-4"
                                />
                                <span className="text-sm text-gray-700">Select for campaign</span>
                              </label>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>

                <label className="flex items-center gap-2 cursor-pointer p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                  <input
                    type="checkbox"
                    checked={formData.allow_creator_approval}
                    onChange={(e) => updateFormData('allow_creator_approval', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Allow creator to approve final asset before publication</span>
                </label>
              </div>
            )}

            {/* Step 4: AI Creation or Upload */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <Tabs value={formData.creation_method} onValueChange={(v) => updateFormData('creation_method', v)} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="studio">Use Likelee Studio</TabsTrigger>
                    <TabsTrigger value="upload">Import Own Work</TabsTrigger>
                  </TabsList>

                  <TabsContent value="studio" className="space-y-6">
                    {/* Studio Sub-Tabs */}
                    <Tabs value={studioTab} onValueChange={setStudioTab} className="w-full">
                      <TabsList className="grid w-full grid-cols-3 mb-6 bg-gray-100">
                        <TabsTrigger value="setup">Setup</TabsTrigger>
                        <TabsTrigger value="review">Review Outputs</TabsTrigger>
                        <TabsTrigger value="edit">Edit Video</TabsTrigger>
                      </TabsList>

                      {/* Setup Tab */}
                      <TabsContent value="setup" className="space-y-6">
                        {/* Model & Generation Type Selection */}
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700 block mb-2">AI Model *</label>
                            <Select value={formData.ai_model} onValueChange={(v) => updateFormData('ai_model', v)}>
                              <SelectTrigger className="border-2 border-gray-300">
                                <SelectValue placeholder="Select AI model" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="runway-gen3">Runway Gen-3 (Premium)</SelectItem>
                                <SelectItem value="sora">OpenAI Sora (Beta)</SelectItem>
                                <SelectItem value="luma">Luma Dream Machine</SelectItem>
                                <SelectItem value="pika">Pika Labs</SelectItem>
                                <SelectItem value="stable-video">Stable Video</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <label className="text-sm font-medium text-gray-700 block mb-2">Generation Type *</label>
                            <Select value={formData.generation_type} onValueChange={(v) => updateFormData('generation_type', v)}>
                              <SelectTrigger className="border-2 border-gray-300">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text-to-video">Text to Video</SelectItem>
                                <SelectItem value="image-to-video">Image to Video</SelectItem>
                                <SelectItem value="video-to-video">Video to Video</SelectItem>
                                <SelectItem value="ai-avatar">AI Avatar (Talking Head)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Creator Cameo Auto-Import */}
                        <Card className="p-4 bg-gray-50 border-2 border-gray-200">
                          <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <Users className="w-4 h-4 text-cyan-600" />
                            Creator Cameos
                          </h4>
                          {formData.selected_creators.length > 0 ? (
                            <div className="space-y-3">
                              <p className="text-sm text-gray-700 mb-3">
                                Automatically importing cameos for: <span className="font-medium">{getSelectedCreatorNames()}</span>
                              </p>
                              <div className="grid grid-cols-2 gap-3">
                                {getSelectedCreatorCameos().map(creator => (
                                  <div key={creator.id} className="p-3 bg-white border-2 border-gray-200 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                      <img src={creator.image} alt={creator.name} className="w-8 h-8 rounded-full object-cover" />
                                      <span className="text-sm font-medium text-gray-900">{creator.name}</span>
                                    </div>
                                    <Badge className="bg-green-100 text-green-800 text-xs">
                                      <CheckCircle2 className="w-3 h-3 mr-1" />
                                      Cameo Ready
                                    </Badge>
                                  </div>
                                ))}
                                {formData.selected_creators.length > getSelectedCreatorCameos().length && (
                                   <div className="p-3 bg-white border-2 border-gray-200 rounded-lg flex items-center gap-2">
                                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                                      <span className="text-sm text-gray-700">Some creators do not have cameos</span>
                                   </div>
                                )}
                              </div>
                              <Button
                                onClick={() => setShowCameoLibrary(true)}
                                variant="outline"
                                size="sm"
                                className="border-2 border-gray-300 w-full mt-3"
                              >
                                <Video className="w-3 h-3 mr-1" />
                                Browse Cameo Library
                              </Button>
                              {formData.creator_cameo_url && (
                                <p className="text-xs text-gray-600 mt-2">Selected custom cameo: {formData.creator_cameo_url.split('/').pop()}</p>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-sm text-gray-600 mb-3">No creators selected yet</p>
                              <Button
                                onClick={() => setCurrentStep(3)}
                                variant="outline"
                                size="sm"
                                className="border-2 border-cyan-600 text-cyan-600"
                              >
                                Go Back to Select Creators
                              </Button>
                            </div>
                          )}
                        </Card>

                        {/* Script Creation */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-2">Campaign Script *</label>
                          <Textarea
                            value={formData.script}
                            onChange={(e) => updateFormData('script', e.target.value)}
                            placeholder="Write your campaign script here... (Max 60 seconds)"
                            className="border-2 border-gray-300 min-h-40"
                          />
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-gray-500">Recommended: 150-200 words for 60 second video</p>
                            <Button variant="outline" size="sm" className="border-2 border-gray-300">
                              <Sparkles className="w-3 h-3 mr-1" />
                              AI Script Assist
                            </Button>
                          </div>
                        </div>

                        {/* Voice & Style Settings */}
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700 block mb-2">AI Voice (ElevenLabs)</label>
                            <Select value={formData.ai_voice} onValueChange={(v) => {
                              updateFormData('ai_voice', v);
                              if (v === 'creator_voice' && formData.selected_creators.length > 0) {
                                setShowVoiceToneModal(true);
                              }
                            }}>
                              <SelectTrigger className="border-2 border-gray-300">
                                <SelectValue placeholder="Select voice" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="voice1">Professional Male</SelectItem>
                                <SelectItem value="voice2">Warm Female</SelectItem>
                                <SelectItem value="voice3">Energetic Young</SelectItem>
                                <SelectItem value="voice4">Corporate Neutral</SelectItem>
                                {formData.selected_creators.length > 0 && (
                                  <SelectItem value="creator_voice">
                                    <div className="flex items-center gap-2">
                                      <Mic className="w-3 h-3" />
                                      Pull {getSelectedCreatorNames().split(',')[0].replace(/\s\(AI\)/, '')}'s Voice
                                    </div>
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            {formData.ai_voice === 'creator_voice' && formData.voice_tone && (
                              <Badge className="mt-2 bg-purple-100 text-purple-800 flex items-center w-fit">
                                <Volume2 className="w-3 h-3 mr-1" />
                                Tone: {formData.voice_tone}
                              </Badge>
                            )}
                          </div>

                          <div>
                            <label className="text-sm font-medium text-gray-700 block mb-2">Style Template</label>
                            <Select value={formData.style_template} onValueChange={(v) => updateFormData('style_template', v)}>
                              <SelectTrigger className="border-2 border-gray-300">
                                <SelectValue placeholder="Select template" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ugc_reel">UGC Reel</SelectItem>
                                <SelectItem value="cinematic">Cinematic</SelectItem>
                                <SelectItem value="ad_spot_15s">Ad Spot 15s</SelectItem>
                                <SelectItem value="explainer">Explainer</SelectItem>
                                <SelectItem value="testimonial">Testimonial</SelectItem>
                                <SelectItem value="product_demo">Product Demo</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Aspect Ratio */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-2">Aspect Ratio</label>
                          <div className="grid grid-cols-3 gap-3">
                            {['16:9', '9:16', '1:1'].map(ratio => (
                              <button
                                key={ratio}
                                onClick={() => updateFormData('aspect_ratio', ratio)}
                                className={`p-3 border-2 rounded-lg text-sm font-medium transition-all ${
                                  formData.aspect_ratio === ratio
                                    ? 'border-cyan-600 bg-cyan-50 text-cyan-900'
                                    : 'border-gray-300 text-gray-700 hover:border-cyan-300'
                                }`}
                              >
                                {ratio}
                                <span className="block text-xs text-gray-500 mt-1">
                                  {ratio === '16:9' ? 'YouTube/Web' : ratio === '9:16' ? 'TikTok/Reels' : 'Instagram'}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Advanced Studio Options */}
                        <Card className="p-4 bg-cyan-50 border-2 border-cyan-200">
                          <div className="flex items-start gap-3">
                            <Sparkles className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <h4 className="text-sm font-bold text-cyan-900 mb-2">Need More Control?</h4>
                              <p className="text-sm text-cyan-700 mb-3">
                                Access the full Likelee Studio for advanced editing, multi-scene composition, and real-time preview.
                              </p>
                              <Button
                                onClick={() => window.open('/studio', '_blank')}
                                variant="outline"
                                size="sm"
                                className="border-2 border-cyan-600 text-cyan-600 hover:bg-cyan-100"
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Open Likelee Studio
                              </Button>
                              <p className="text-xs text-cyan-600 mt-2">
                                Your settings will be saved. Return here when done to continue campaign setup.
                              </p>
                            </div>
                          </div>
                        </Card>

                        {/* Generate Preview */}
                        <div className="flex gap-3">
                          <Button className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white">
                            <Play className="w-4 h-4 mr-2" />
                            Generate Preview (5 credits)
                          </Button>
                          <Button 
                            variant="outline" 
                            className="border-2 border-gray-300"
                            onClick={() => setStudioTab('review')}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Sample Output
                          </Button>
                        </div>
                      </TabsContent>

                      {/* Review Outputs Tab */}
                      <TabsContent value="review" className="space-y-6">
                        <div className="text-center py-8">
                          <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-xl font-bold text-gray-900 mb-2">Review Generated Outputs</h3>
                          <p className="text-gray-600 mb-6">
                            Your generated videos will appear here once processing is complete
                          </p>
                          
                          {/* Sample Output Grid */}
                          <div className="grid md:grid-cols-2 gap-4 mt-6">
                            <Card className="p-4 bg-white border-2 border-gray-200">
                              <div className="aspect-video bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                                <Play className="w-12 h-12 text-gray-400" />
                              </div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-900">Output 1 - 16:9</span>
                                <Badge className="bg-yellow-100 text-yellow-800">Processing</Badge>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="flex-1 border-2 border-gray-300">
                                  <Download className="w-3 h-3 mr-1" />
                                  Download
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="flex-1 border-2 border-gray-300"
                                  onClick={() => setStudioTab('edit')}
                                >
                                  <Edit3 className="w-3 h-3 mr-1" />
                                  Edit
                                </Button>
                              </div>
                            </Card>

                            <Card className="p-4 bg-white border-2 border-gray-200">
                              <div className="aspect-[9/16] bg-gray-100 rounded-lg mb-3 flex items-center justify-center max-h-64 mx-auto">
                                <Play className="w-12 h-12 text-gray-400" />
                              </div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-900">Output 2 - 9:16</span>
                                <Badge className="bg-green-100 text-green-800">Ready</Badge>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="flex-1 border-2 border-gray-300">
                                  <Download className="w-3 h-3 mr-1" />
                                  Download
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="flex-1 border-2 border-gray-300"
                                  onClick={() => setStudioTab('edit')}
                                >
                                  <Edit3 className="w-3 h-3 mr-1" />
                                  Edit
                                </Button>
                              </div>
                            </Card>
                          </div>

                          <Button 
                            className="mt-6 bg-cyan-600 hover:bg-cyan-700 text-white"
                            onClick={() => setStudioTab('setup')}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Generate More Variations
                          </Button>
                        </div>
                      </TabsContent>

                      {/* Edit Video Tab */}
                      <TabsContent value="edit" className="space-y-6">
                        <Card className="p-6 bg-white border-2 border-gray-200">
                          <h3 className="text-lg font-bold text-gray-900 mb-4">Video Editor</h3>
                          
                          {/* Video Preview */}
                          <div className="aspect-video bg-gray-900 rounded-lg mb-4 flex items-center justify-center">
                            <Play className="w-16 h-16 text-white opacity-50" />
                          </div>

                          {/* Editing Controls */}
                          <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-3">
                              <Button variant="outline" className="border-2 border-gray-300">
                                <Sliders className="w-4 h-4 mr-2" />
                                Trim
                              </Button>
                              <Button variant="outline" className="border-2 border-gray-300">
                                <Volume2 className="w-4 h-4 mr-2" />
                                Audio
                              </Button>
                              <Button variant="outline" className="border-2 border-gray-300">
                                <FileText className="w-4 h-4 mr-2" />
                                Captions
                              </Button>
                            </div>

                            <div className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg">
                              <p className="text-sm text-gray-700 mb-2">Quick Edits:</p>
                              <div className="flex flex-wrap gap-2">
                                <Badge className="cursor-pointer hover:bg-gray-300">Add Text Overlay</Badge>
                                <Badge className="cursor-pointer hover:bg-gray-300">Apply Filter</Badge>
                                <Badge className="cursor-pointer hover:bg-gray-300">Adjust Speed</Badge>
                                <Badge className="cursor-pointer hover:bg-gray-300">Add Transitions</Badge>
                              </div>
                            </div>

                            <div className="flex gap-3">
                              <Button className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white">
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Save Changes
                              </Button>
                              <Button 
                                variant="outline" 
                                className="border-2 border-gray-300"
                                onClick={() => window.open('/studio', '_blank')}
                              >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Advanced Editor
                              </Button>
                            </div>
                          </div>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </TabsContent>

                  <TabsContent value="upload" className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-cyan-500 transition-colors cursor-pointer">
                      <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-base font-medium text-gray-700 mb-2">Upload Your Assets</p>
                      <p className="text-sm text-gray-500 mb-4">Drag & drop video, image, or audio files</p>
                      <Button variant="outline" className="border-2 border-gray-300">
                        Choose Files
                      </Button>
                    </div>

                    <Card className="p-4 bg-gray-50 border-2 border-gray-200">
                      <p className="text-sm text-gray-700">
                        Auto-read metadata: duration, fps, creator ID. You can assign assets to specific creators and licenses after upload.
                      </p>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* Step 5: Rights & Deliverables */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <Card className="p-6 bg-white border-2 border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Rights Coverage Status</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium text-gray-900">Creator Consent</span>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Complete</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium text-gray-900">License Mapping</span>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Complete</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-600" />
                        <span className="text-sm font-medium text-gray-900">Region Compliance</span>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-800">Review Needed</Badge>
                    </div>
                  </div>
                </Card>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Delivery Method</label>
                  <Select>
                    <SelectTrigger className="border-2 border-gray-300">
                      <SelectValue placeholder="Select delivery method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="download">Direct Download</SelectItem>
                      <SelectItem value="portal">Client Review Portal</SelectItem>
                      <SelectItem value="auto">Auto Publish</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-t-2 border-gray-200 pt-6 mt-6">
                  <h3 className="text-base font-bold text-gray-900 mb-4">Advanced Setup (Optional)</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-2">Tracking Pixels / UTMs</label>
                      <Input
                        value={formData.tracking_pixels}
                        onChange={(e) => updateFormData('tracking_pixels', e.target.value)}
                        placeholder="utm_source=likelee&utm_campaign=spring2025"
                        className="border-2 border-gray-300"
                      />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                      <input
                        type="checkbox"
                        checked={formData.connect_ad_account}
                        onChange={(e) => updateFormData('connect_ad_account', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700">Connect Meta / TikTok Ad Account</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                      <input
                        type="checkbox"
                        checked={formData.auto_report}
                        onChange={(e) => updateFormData('auto_report', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700">Send auto-report to client every 7 days</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Summary */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <Card className="p-6 bg-gradient-to-br from-cyan-50 to-teal-50 border-2 border-cyan-200">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Campaign Ready to Launch!</h3>
                  <p className="text-gray-700">Review your campaign details below and submit for processing.</p>
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="p-6 bg-white border-2 border-gray-200">
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-cyan-600" />
                      Campaign Info
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Client:</span>
                        <span className="font-medium text-gray-900">{formData.client || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Title:</span>
                        <span className="font-medium text-gray-900">{formData.campaign_title || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Category:</span>
                        <span className="font-medium text-gray-900">{formData.category || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-medium text-gray-900">
                          {formData.start_date && formData.end_date 
                            ? `${formData.start_date} - ${formData.end_date}`
                            : 'Not set'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Regions:</span>
                        <span className="font-medium text-gray-900">{formData.regions.join(', ') || 'Not set'}</span>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6 bg-white border-2 border-gray-200">
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      Budget Breakdown
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Budget:</span>
                        <span className="font-medium text-gray-900">${formData.budget || '0'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Creator Fees:</span>
                        <span className="font-medium text-gray-900">
                          ${formData.selected_creators.length * 450}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Platform Fee:</span>
                        <span className="font-medium text-gray-900">$120</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-200">
                        <span className="text-gray-900 font-bold">Remaining:</span>
                        <span className="font-bold text-gray-900">
                          ${(formData.budget || 0) - (formData.selected_creators.length * 450) - 120}
                        </span>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6 bg-white border-2 border-gray-200">
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-600" />
                      Selected Talent
                    </h4>
                    <div className="space-y-2 text-sm">
                      <p className="text-gray-600">
                        {formData.selected_creators.length} creator(s) selected
                      </p>
                      <p className="text-gray-600">Expected turnaround: 24-48 hours</p>
                    </div>
                  </Card>

                  <Card className="p-6 bg-white border-2 border-gray-200">
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      Rights Status
                    </h4>
                    <div className="space-y-2">
                      <Badge className="bg-green-100 text-green-800">All Rights Clear</Badge>
                      <p className="text-sm text-gray-600">License type: {formData.license_type}</p>
                      <p className="text-sm text-gray-600">
                        Usage: {formData.usage_scope.join(', ') || 'None selected'}
                      </p>
                    </div>
                  </Card>
                </div>

                <Card className="p-6 bg-white border-2 border-gray-200">
                  <h4 className="font-bold text-gray-900 mb-3">What happens next?</h4>
                  <ol className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-cyan-600">1.</span>
                      <span>Campaign is submitted and creators are notified</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-cyan-600">2.</span>
                      <span>Creators review and approve participation (typically 12-24 hours)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-cyan-600">3.</span>
                      <span>Assets begin processing and generation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-cyan-600">4.</span>
                      <span>You'll receive notifications as assets are delivered</span>
                    </li>
                  </ol>
                </Card>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="border-t-2 border-gray-200 p-6 flex items-center justify-between bg-gray-50">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="border-2 border-gray-300"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                className="border-2 border-gray-300"
              >
                Save Draft
              </Button>
              
              {currentStep < 6 ? (
                <Button
                  onClick={handleNext}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleFinish}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Submit Campaign
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cameo Library Modal */}
      {showCameoLibrary && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-6">
          <Card className="w-full max-w-4xl bg-white p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Creator Cameo Library</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowCameoLibrary(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {mockCreators.filter(c => c.cameo_video).map(creator => (
                <Card key={creator.id} className="p-4 border-2 border-gray-200 hover:border-cyan-500 transition-all cursor-pointer">
                  <div className="aspect-video bg-gray-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                    <img src={creator.image} alt={creator.name} className="w-full h-full object-cover" />
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1">{creator.name}</h4>
                  <p className="text-xs text-gray-600 mb-3">Followers: {creator.followers}</p>
                  <Button
                    size="sm"
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
                    onClick={() => {
                      updateFormData('creator_cameo_url', creator.cameo_video);
                      setShowCameoLibrary(false);
                    }}
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Select Cameo
                  </Button>
                </Card>
              ))}
              {/* Option to upload new cameo */}
              <Card className="p-4 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-center">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-700 mb-1">Upload New Cameo</p>
                <p className="text-xs text-gray-500 mb-3">MP4, MOV, up to 100MB</p>
                <Button size="sm" variant="outline" className="border-2 border-gray-300">
                  Browse Files
                </Button>
              </Card>
            </div>
          </Card>
        </div>
      )}

      {/* Voice Tone Selection Modal */}
      {showVoiceToneModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-6">
          <Card className="w-full max-w-2xl bg-white p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Mic className="w-5 h-5 text-cyan-600" />
                Voice Tone & Mood Selection
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setShowVoiceToneModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Choose the tone and mood for {getSelectedCreatorNames().split(',')[0].replace(/\s\(AI\)/, '')}'s voice sample
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-3">Select Voice Tone</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {['Professional', 'Friendly', 'Energetic', 'Calm', 'Authoritative', 'Conversational'].map(tone => (
                    <button
                      key={tone}
                      onClick={() => updateFormData('voice_tone', tone)}
                      className={`p-3 border-2 rounded-lg text-sm font-medium transition-all ${
                        formData.voice_tone === tone
                          ? 'border-cyan-600 bg-cyan-50 text-cyan-900'
                          : 'border-gray-300 text-gray-700 hover:border-cyan-300'
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              <Card className="p-4 bg-purple-50 border-2 border-purple-200">
                <h4 className="text-sm font-bold text-purple-900 mb-2 flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  Available Mood Samples (ElevenLabs)
                </h4>
                <div className="space-y-2">
                  {['Happy & Upbeat', 'Serious & Professional', 'Warm & Caring', 'Excited & Dynamic'].map(mood => (
                    <label key={mood} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-purple-100 rounded">
                      <input type="radio" name="mood" className="w-4 h-4" />
                      <span className="text-sm text-gray-700">{mood}</span>
                      <Button size="sm" variant="ghost" className="ml-auto">
                        <Play className="w-3 h-3" />
                      </Button>
                    </label>
                  ))}
                </div>
              </Card>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowVoiceToneModal(false)}
                  className="border-2 border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setShowVoiceToneModal(false)}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
                  disabled={!formData.voice_tone}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm Selection
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
