
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Briefcase, FileText,
  Users, DollarSign, Settings, Eye, Upload, X, AlertCircle,
  Calendar, Building2, Mail, Globe, Shield, Sparkles, Plus
} from "lucide-react";

const categories = [
  "Marketing Campaign",
  "Film Production",
  "Advertising Creative",
  "Brand Content",
  "UGC Campaign",
  "AI Video Production",
  "Product Launch",
  "Social Media Content",
  "Other"
];

const workTypes = [
  "UGC Campaign",
  "Ad Creative",
  "Likeness Licensing",
  "Full Project Management",
  "Video Editing",
  "Voice Synthesis",
  "AI Generation",
  "Brand Partnership"
];

const talentTypes = [
  "AI Talent (Virtual)",
  "Creator (Licensing Call)",
  "Model (Licensing Call)",
  "Production Studio",
  "Marketing Agency"
];

const skills = [
  "Video Editing",
  "Sora Generation",
  "Runway ML",
  "Voice Synthesis",
  "ElevenLabs",
  "Lip Sync",
  "Face Swap",
  "Content Strategy",
  "Campaign Management"
];

const licensingMetrics = [
  "Follower Count Requirements",
  "Engagement Rate Requirements",
  "Platform Verification Status"
];

export default function PostJob() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [showCustomWorkType, setShowCustomWorkType] = useState(false);
  const [customWorkType, setCustomWorkType] = useState("");
  const [formData, setFormData] = useState({
    // Basic Info
    job_title: "",
    company_name: "Urban Apparel Co.",
    contact_email: "",
    category: "",
    work_types: [],
    custom_work_types: [],
    status: "open",
    
    // Project Overview
    location: "Remote",
    job_type: "",
    description: "",
    goals: [],
    deliverables: "",
    start_date: "",
    end_date: "",
    
    // Talent Requirements
    talent_types: ["AI Talent (Virtual)"], // Default selection
    gender: "",
    age_range: "",
    region: "",
    language: "",
    required_skills: [],
    licensing_metrics: [],
    needs_licensing: false,
    
    // Licensing (if needs_licensing = true)
    usage_type: "",
    license_duration: "",
    territories: "",
    exclusivity: false,
    royalty_option: false,
    
    // Budget
    budget_min: "",
    budget_max: "",
    payment_type: "",
    currency: "USD",
    
    // Collaboration
    work_with_agency: false,
    invite_creator: false,
    brand_assets: [],
    confidential: false
  });

  const totalSteps = 7;
  const progress = (currentStep / totalSteps) * 100;

  const handleNext = () => {
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = () => {
    console.log("Job posting:", formData);
    alert("Job posted successfully!");
    navigate(createPageUrl("BrandCampaignDashboard"));
  };

  const toggleArrayItem = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  };

  const addCustomWorkType = () => {
    if (customWorkType.trim()) {
      setFormData(prev => ({
        ...prev,
        custom_work_types: [...prev.custom_work_types, customWorkType.trim()]
      }));
      setCustomWorkType("");
      setShowCustomWorkType(false);
    }
  };

  const removeCustomWorkType = (type) => {
    setFormData(prev => ({
      ...prev,
      custom_work_types: prev.custom_work_types.filter(t => t !== type)
    }));
  };

  const showDemographicFilters = formData.talent_types.includes("Creator (Licensing Call)") || 
                                  formData.talent_types.includes("Model (Licensing Call)");

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("BrandCampaignDashboard"))}
            className="mb-4 rounded-none"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-none flex items-center justify-center">
              <Briefcase className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Post a Job</h1>
              <p className="text-gray-600">Find the perfect talent for your campaign</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Step {currentStep} of {totalSteps}</span>
              <span className="text-sm text-gray-600">{Math.round(progress)}% Complete</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-none">
              <div
                className="h-full bg-blue-600 transition-all duration-300 rounded-none"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <Card className="p-8 bg-white border-2 border-gray-200 rounded-none">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <FileText className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">Basic Information</h2>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Job Title / Campaign Title *</Label>
                <Input
                  value={formData.job_title}
                  onChange={(e) => setFormData({...formData, job_title: e.target.value})}
                  placeholder="e.g., AI Product Launch Campaign"
                  className="border-2 border-gray-300 rounded-none"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Company Name</Label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                  className="border-2 border-gray-300 rounded-none bg-gray-50"
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">Auto-filled from your profile</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Contact Email *</Label>
                <Input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                  placeholder="contact@company.com"
                  className="border-2 border-gray-300 rounded-none"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Category *</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                  <SelectTrigger className="border-2 border-gray-300 rounded-none">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat.toLowerCase().replace(/ /g, '_')}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-3 block">Type of Work (Select all that apply)</Label>
                <div className="grid grid-cols-2 gap-3">
                  {workTypes.map(type => (
                    <div key={type} className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50">
                      <Checkbox
                        id={type}
                        checked={formData.work_types.includes(type)}
                        onCheckedChange={() => toggleArrayItem("work_types", type)}
                        className="border-2 border-gray-400"
                      />
                      <label htmlFor={type} className="text-sm text-gray-700 cursor-pointer flex-1">
                        {type}
                      </label>
                    </div>
                  ))}
                  
                  <Button
                    variant="outline"
                    onClick={() => setShowCustomWorkType(true)}
                    className="border-2 border-gray-300 rounded-none hover:bg-gray-50 justify-start"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Other (Custom)
                  </Button>
                </div>

                {showCustomWorkType && (
                  <div className="mt-4 p-4 border-2 border-blue-200 bg-blue-50 rounded-none">
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Add Custom Work Type</Label>
                    <div className="flex gap-2">
                      <Input
                        value={customWorkType}
                        onChange={(e) => setCustomWorkType(e.target.value)}
                        placeholder="e.g., Virtual Event Hosting"
                        className="flex-1 border-2 border-gray-300 rounded-none"
                        onKeyPress={(e) => e.key === 'Enter' && addCustomWorkType()}
                      />
                      <Button onClick={addCustomWorkType} className="bg-blue-600 hover:bg-blue-700 text-white rounded-none">
                        Add
                      </Button>
                      <Button variant="outline" onClick={() => setShowCustomWorkType(false)} className="border-2 border-gray-300 rounded-none">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {formData.custom_work_types.length > 0 && (
                  <div className="mt-4">
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Custom Work Types:</Label>
                    <div className="flex flex-wrap gap-2">
                      {formData.custom_work_types.map(type => (
                        <Badge key={type} className="bg-blue-100 text-blue-800 flex items-center gap-1">
                          {type}
                          <X 
                            className="w-3 h-3 cursor-pointer hover:text-blue-900" 
                            onClick={() => removeCustomWorkType(type)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Job Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                  <SelectTrigger className="border-2 border-gray-300 rounded-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end pt-6">
                <Button onClick={handleNext} disabled={!formData.job_title || !formData.contact_email} className="bg-blue-600 hover:bg-blue-700 text-white rounded-none">
                  Next: Project Overview
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Project Overview */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <FileText className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">Project Overview</h2>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Location</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="Remote (default)"
                  className="border-2 border-gray-300 rounded-none"
                />
                <p className="text-xs text-gray-500 mt-1">Most jobs are automatically labeled as remote</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Job Type *</Label>
                <Select value={formData.job_type} onValueChange={(v) => setFormData({...formData, job_type: v})}>
                  <SelectTrigger className="border-2 border-gray-300 rounded-none">
                    <SelectValue placeholder="Select job type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="per_project">Per Project</SelectItem>
                    <SelectItem value="part_time">Part-Time</SelectItem>
                    <SelectItem value="full_time">Full-Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">About the Role *</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="What's being created, who it's for, what style it should have..."
                  className="border-2 border-gray-300 rounded-none min-h-[150px]"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-3 block">Goals & KPIs</Label>
                <div className="grid grid-cols-2 gap-3">
                  {["Awareness", "Sales", "Social Reach", "AI R&D", "Film Production", "Brand Building"].map(goal => (
                    <div key={goal} className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50">
                      <Checkbox
                        id={goal}
                        checked={formData.goals.includes(goal)}
                        onCheckedChange={() => toggleArrayItem("goals", goal)}
                        className="border-2 border-gray-400"
                      />
                      <label htmlFor={goal} className="text-sm text-gray-700 cursor-pointer flex-1">
                        {goal}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Deliverables</Label>
                <Input
                  value={formData.deliverables}
                  onChange={(e) => setFormData({...formData, deliverables: e.target.value})}
                  placeholder="e.g., 3 short videos, 5 stills, 1 voiceover clip"
                  className="border-2 border-gray-300 rounded-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Expected Start Date</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    className="border-2 border-gray-300 rounded-none"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Expected End Date</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    className="border-2 border-gray-300 rounded-none"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-6">
                <Button onClick={handleBack} variant="outline" className="border-2 border-gray-300 rounded-none">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleNext} disabled={!formData.description || !formData.job_type} className="bg-blue-600 hover:bg-blue-700 text-white rounded-none">
                  Next: Talent Requirements
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Talent Requirements */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <Users className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">Talent Requirements</h2>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-3 block">Preferred Talent Type</Label>
                
                {/* AI Talent Section */}
                <div className="mb-4">
                  <Label className="text-xs font-semibold text-gray-600 mb-2 block uppercase">AI Talent (Default)</Label>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center space-x-2 p-3 border-2 border-blue-200 bg-blue-50 rounded-none">
                      <Checkbox
                        id="AI Talent (Virtual)"
                        checked={formData.talent_types.includes("AI Talent (Virtual)")}
                        onCheckedChange={() => toggleArrayItem("talent_types", "AI Talent (Virtual)")}
                        className="border-2 border-blue-400"
                      />
                      <label htmlFor="AI Talent (Virtual)" className="text-sm text-gray-700 cursor-pointer flex-1">
                        AI Talent (Virtual)
                      </label>
                    </div>
                  </div>
                </div>

                {/* Human Talent Section */}
                <div>
                  <Label className="text-xs font-semibold text-gray-600 mb-2 block uppercase">Human Talent & Other</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {talentTypes.filter(t => t !== "AI Talent (Virtual)").map(type => (
                      <div key={type} className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50">
                        <Checkbox
                          id={type}
                          checked={formData.talent_types.includes(type)}
                          onCheckedChange={() => toggleArrayItem("talent_types", type)}
                          className="border-2 border-gray-400"
                        />
                        <label htmlFor={type} className="text-sm text-gray-700 cursor-pointer flex-1">
                          {type}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Demographic Filters - Only show if licensing options selected */}
              {showDemographicFilters && (
                <div className="p-4 border-2 border-purple-200 bg-purple-50 rounded-none">
                  <Label className="text-sm font-medium text-gray-900 mb-3 block">Demographic Filters (For Licensing)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">Gender</Label>
                      <Select value={formData.gender} onValueChange={(v) => setFormData({...formData, gender: v})}>
                        <SelectTrigger className="border-2 border-gray-300 rounded-none">
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="non_binary">Non-Binary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">Age Range</Label>
                      <Select value={formData.age_range} onValueChange={(v) => setFormData({...formData, age_range: v})}>
                        <SelectTrigger className="border-2 border-gray-300 rounded-none">
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="18-25">18-25</SelectItem>
                          <SelectItem value="26-35">26-35</SelectItem>
                          <SelectItem value="36-45">36-45</SelectItem>
                          <SelectItem value="46+">46+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Region</Label>
                  <Input
                    value={formData.region}
                    onChange={(e) => setFormData({...formData, region: e.target.value})}
                    placeholder="e.g., North America, Global"
                    className="border-2 border-gray-300 rounded-none"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Language</Label>
                  <Input
                    value={formData.language}
                    onChange={(e) => setFormData({...formData, language: e.target.value})}
                    placeholder="e.g., English, Spanish"
                    className="border-2 border-gray-300 rounded-none"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-3 block">Skills Needed</Label>
                <div className="grid grid-cols-2 gap-3">
                  {skills.map(skill => (
                    <div key={skill} className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50">
                      <Checkbox
                        id={skill}
                        checked={formData.required_skills.includes(skill)}
                        onCheckedChange={() => toggleArrayItem("required_skills", skill)}
                        className="border-2 border-gray-400"
                      />
                      <label htmlFor={skill} className="text-sm text-gray-700 cursor-pointer flex-1">
                        {skill}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* For Licensing Section */}
              {showDemographicFilters && (
                <div className="p-4 border-2 border-amber-200 bg-amber-50 rounded-none">
                  <Label className="text-sm font-medium text-gray-900 mb-3 block">For Licensing (Optional Metrics)</Label>
                  <div className="grid grid-cols-1 gap-3">
                    {licensingMetrics.map(metric => (
                      <div key={metric} className="flex items-center space-x-2 p-3 border-2 border-gray-200 bg-white rounded-none hover:bg-gray-50">
                        <Checkbox
                          id={metric}
                          checked={formData.licensing_metrics.includes(metric)}
                          onCheckedChange={() => toggleArrayItem("licensing_metrics", metric)}
                          className="border-2 border-gray-400"
                        />
                        <label htmlFor={metric} className="text-sm text-gray-700 cursor-pointer flex-1">
                          {metric}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-3 p-4 border-2 border-blue-200 bg-blue-50 rounded-none">
                <Checkbox
                  id="needs_licensing"
                  checked={formData.needs_licensing}
                  onCheckedChange={(checked) => setFormData({...formData, needs_licensing: checked})}
                  className="border-2 border-blue-400"
                />
                <label htmlFor="needs_licensing" className="text-sm font-medium text-gray-900 cursor-pointer flex-1">
                  This job requires Face or Voice Licensing
                </label>
              </div>

              <div className="flex justify-between pt-6">
                <Button onClick={handleBack} variant="outline" className="border-2 border-gray-300 rounded-none">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700 text-white rounded-none">
                  {formData.needs_licensing ? "Next: Licensing Details" : "Next: Budget"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Likeness Usage & Licensing (conditional) */}
          {currentStep === 4 && formData.needs_licensing && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">Likeness Usage & Licensing</h2>
              </div>

              <Alert className="bg-blue-50 border-2 border-blue-200 rounded-none">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  Legal agreement templates and royalty calculations will be auto-embedded based on your selections.
                </AlertDescription>
              </Alert>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Usage Type *</Label>
                <Select value={formData.usage_type} onValueChange={(v) => setFormData({...formData, usage_type: v})}>
                  <SelectTrigger className="border-2 border-gray-300 rounded-none">
                    <SelectValue placeholder="Select usage type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="film">Film</SelectItem>
                    <SelectItem value="ad">Advertising</SelectItem>
                    <SelectItem value="social">Social Media</SelectItem>
                    <SelectItem value="music">Music Video</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Duration of License *</Label>
                <Select value={formData.license_duration} onValueChange={(v) => setFormData({...formData, license_duration: v})}>
                  <SelectTrigger className="border-2 border-gray-300 rounded-none">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30_days">30 Days</SelectItem>
                    <SelectItem value="3_months">3 Months</SelectItem>
                    <SelectItem value="6_months">6 Months</SelectItem>
                    <SelectItem value="1_year">1 Year</SelectItem>
                    <SelectItem value="perpetual">Perpetual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Territories *</Label>
                <Select value={formData.territories} onValueChange={(v) => setFormData({...formData, territories: v})}>
                  <SelectTrigger className="border-2 border-gray-300 rounded-none">
                    <SelectValue placeholder="Select territories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global</SelectItem>
                    <SelectItem value="us">United States</SelectItem>
                    <SelectItem value="eu">European Union</SelectItem>
                    <SelectItem value="asia">Asia</SelectItem>
                    <SelectItem value="latam">Latin America</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-none hover:bg-gray-50">
                  <Checkbox
                    id="exclusivity"
                    checked={formData.exclusivity}
                    onCheckedChange={(checked) => setFormData({...formData, exclusivity: checked})}
                    className="border-2 border-gray-400"
                  />
                  <label htmlFor="exclusivity" className="text-sm text-gray-700 cursor-pointer flex-1">
                    Exclusive use of likeness for this campaign
                  </label>
                </div>

                <div className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-none hover:bg-gray-50">
                  <Checkbox
                    id="royalty_option"
                    checked={formData.royalty_option}
                    onCheckedChange={(checked) => setFormData({...formData, royalty_option: checked})}
                    className="border-2 border-gray-400"
                  />
                  <label htmlFor="royalty_option" className="text-sm text-gray-700 cursor-pointer flex-1">
                    Include royalty-based payout (%)
                  </label>
                </div>
              </div>

              <div className="flex justify-between pt-6">
                <Button onClick={handleBack} variant="outline" className="border-2 border-gray-300 rounded-none">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleNext} disabled={!formData.usage_type || !formData.license_duration || !formData.territories} className="bg-blue-600 hover:bg-blue-700 text-white rounded-none">
                  Next: Budget
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4 or 5: Budget & Compensation */}
          {currentStep === (formData.needs_licensing ? 5 : 4) && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <DollarSign className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">Budget & Compensation</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Budget Min *</Label>
                  <Input
                    type="number"
                    value={formData.budget_min}
                    onChange={(e) => setFormData({...formData, budget_min: e.target.value})}
                    placeholder="500"
                    className="border-2 border-gray-300 rounded-none"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Budget Max *</Label>
                  <Input
                    type="number"
                    value={formData.budget_max}
                    onChange={(e) => setFormData({...formData, budget_max: e.target.value})}
                    placeholder="2000"
                    className="border-2 border-gray-300 rounded-none"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Payment Type *</Label>
                <Select value={formData.payment_type} onValueChange={(v) => setFormData({...formData, payment_type: v})}>
                  <SelectTrigger className="border-2 border-gray-300 rounded-none">
                    <SelectValue placeholder="Select payment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Price</SelectItem>
                    <SelectItem value="per_deliverable">Per Deliverable</SelectItem>
                    <SelectItem value="hourly">Hourly Rate</SelectItem>
                    <SelectItem value="royalty_base">Royalty + Base</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Currency</Label>
                <Select value={formData.currency} onValueChange={(v) => setFormData({...formData, currency: v})}>
                  <SelectTrigger className="border-2 border-gray-300 rounded-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Alert className="bg-amber-50 border-2 border-amber-600 rounded-none">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <AlertDescription className="text-amber-900">
                  <strong>Payment Method Required:</strong> You'll need to add payment information before this job goes live.
                </AlertDescription>
              </Alert>

              <div className="flex justify-between pt-6">
                <Button onClick={handleBack} variant="outline" className="border-2 border-gray-300 rounded-none">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleNext} disabled={!formData.budget_min || !formData.budget_max || !formData.payment_type} className="bg-blue-600 hover:bg-blue-700 text-white rounded-none">
                  Next: Collaboration
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 5 or 6: Collaboration Preferences */}
          {currentStep === (formData.needs_licensing ? 6 : 5) && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <Users className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">Collaboration Preferences</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-none">
                  <div className="flex-1">
                    <label htmlFor="work_with_agency" className="text-sm font-medium text-gray-900 cursor-pointer block mb-1">
                      Work with a Marketing Agency?
                    </label>
                    <p className="text-xs text-gray-600">Connect with verified agencies from marketplace</p>
                  </div>
                  <Checkbox
                    id="work_with_agency"
                    checked={formData.work_with_agency}
                    onCheckedChange={(checked) => setFormData({...formData, work_with_agency: checked})}
                    className="border-2 border-gray-400"
                  />
                </div>

                {formData.work_with_agency && (
                  <Card className="p-4 bg-blue-50 border-2 border-blue-200 rounded-none">
                    <p className="text-sm text-gray-700 mb-3">Search and invite agencies:</p>
                    <div className="flex gap-2">
                      <Input placeholder="Search agencies..." className="flex-1 border-2 border-gray-300 rounded-none" />
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-none">
                        Search
                      </Button>
                    </div>
                  </Card>
                )}

                <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-none">
                  <div className="flex-1">
                    <label htmlFor="invite_creator" className="text-sm font-medium text-gray-900 cursor-pointer block mb-1">
                      Invite AI Creator or Talent?
                    </label>
                    <p className="text-xs text-gray-600">Browse top-rated creators and AI talent</p>
                  </div>
                  <Checkbox
                    id="invite_creator"
                    checked={formData.invite_creator}
                    onCheckedChange={(checked) => setFormData({...formData, invite_creator: checked})}
                    className="border-2 border-gray-400"
                  />
                </div>

                {formData.invite_creator && (
                  <Card className="p-4 bg-purple-50 border-2 border-purple-200 rounded-none">
                    <p className="text-sm text-gray-700 mb-3">Filter creators by:</p>
                    <div className="flex gap-2 flex-wrap">
                      <Badge className="bg-purple-200 text-purple-800">Top Rated</Badge>
                      <Badge className="bg-purple-200 text-purple-800">Recent Projects</Badge>
                      <Badge className="bg-purple-200 text-purple-800">Sora</Badge>
                      <Badge className="bg-purple-200 text-purple-800">Runway</Badge>
                      <Badge className="bg-purple-200 text-purple-800">Pika</Badge>
                    </div>
                  </Card>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Attach Brand Assets</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-none p-8 text-center hover:border-blue-600 transition-colors cursor-pointer">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-700 mb-1">Upload logos, media kits, or reference content</p>
                  <p className="text-xs text-gray-500">PDF, JPG, PNG, MP4 up to 100MB</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-none hover:bg-gray-50">
                <Checkbox
                  id="confidential"
                  checked={formData.confidential}
                  onCheckedChange={(checked) => setFormData({...formData, confidential: checked})}
                  className="border-2 border-gray-400"
                />
                <label htmlFor="confidential" className="text-sm text-gray-700 cursor-pointer flex-1">
                  Mark this as private (visible to invited collaborators only)
                </label>
              </div>

              <div className="flex justify-between pt-6">
                <Button onClick={handleBack} variant="outline" className="border-2 border-gray-300 rounded-none">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700 text-white rounded-none">
                  Next: Preview & Publish
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 6 or 7: Preview & Publish */}
          {currentStep === (formData.needs_licensing ? 7 : 6) && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <Eye className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">Preview & Publish</h2>
              </div>

              <Card className="p-6 bg-white border-2 border-blue-600 rounded-none">
                <div className="flex gap-6 mb-6">
                  <div className="w-32 h-32 bg-gray-200 rounded-none flex items-center justify-center">
                    <Briefcase className="w-12 h-12 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{formData.job_title}</h3>
                    <p className="text-gray-600 mb-3">{formData.company_name}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge className="bg-blue-100 text-blue-800">{formData.category}</Badge>
                      {formData.work_types.slice(0, 3).map(type => (
                        <Badge key={type} className="bg-gray-200 text-gray-700">{type}</Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        ${formData.budget_min} - ${formData.budget_max}
                      </span>
                      {formData.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Starts {formData.start_date}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t-2 border-gray-200 pt-6">
                  <h4 className="font-bold text-gray-900 mb-3">Project Overview</h4>
                  <p className="text-gray-700 mb-4">{formData.description || "No description provided"}</p>
                  
                  {formData.deliverables && (
                    <div className="mb-4">
                      <span className="text-sm font-medium text-gray-700">Deliverables: </span>
                      <span className="text-sm text-gray-600">{formData.deliverables}</span>
                    </div>
                  )}

                  {formData.talent_types.length > 0 && (
                    <div className="mb-4">
                      <span className="text-sm font-medium text-gray-700 block mb-2">Looking for:</span>
                      <div className="flex flex-wrap gap-2">
                        {formData.talent_types.map(type => (
                          <Badge key={type} className="bg-purple-100 text-purple-800">{type}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {formData.needs_licensing && (
                    <Alert className="bg-amber-50 border-2 border-amber-600 rounded-none mt-4">
                      <Shield className="h-5 w-5 text-amber-600" />
                      <AlertDescription className="text-amber-900">
                        <strong>Licensing Required:</strong> {formData.usage_type} usage, {formData.license_duration} duration, {formData.territories} territories
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </Card>

              <div className="flex gap-4 pt-6">
                <Button onClick={handleBack} variant="outline" className="flex-1 border-2 border-gray-300 rounded-none">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Edit
                </Button>
                <Button variant="outline" onClick={() => alert("Saved as draft!")} className="flex-1 border-2 border-gray-300 rounded-none">
                  Save as Draft
                </Button>
                <Button onClick={handleSubmit} className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-none">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Publish to Marketplace
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
