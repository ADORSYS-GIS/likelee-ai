import React, { useState, useEffect } from "react";
import { Button as UIButton } from "@/components/ui/button";
import { Input as UIInput } from "@/components/ui/input";
import { Label as UILabel } from "@/components/ui/label";
import { Checkbox as UICheckbox } from "@/components/ui/checkbox";
import { Card as UICard } from "@/components/ui/card";
import { Badge as UIBadge } from "@/components/ui/badge";
import { Textarea as UITextarea } from "@/components/ui/textarea";
import { RadioGroup as UIRadioGroup, RadioGroupItem as UIRadioGroupItem } from "@/components/ui/radio-group";
import { Select as UISelect, SelectContent as UISelectContent, SelectItem as UISelectItem, SelectTrigger as UISelectTrigger, SelectValue as UISelectValue } from "@/components/ui/select";
import { CheckCircle2, ArrowRight, ArrowLeft, AlertCircle } from "lucide-react";
import { Alert as UIAlert, AlertDescription as UIAlertDescription } from "@/components/ui/alert";
import { useMutation } from '@tanstack/react-query'; 
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { useNavigate } from 'react-router-dom'

// Cast UI components to any to avoid TS forwardRef prop typing frictions within this large form file only
const Button: any = UIButton
const Input: any = UIInput
const Label: any = UILabel
const Checkbox: any = UICheckbox
const Card: any = UICard
const Badge: any = UIBadge
const Textarea: any = UITextarea
const RadioGroup: any = UIRadioGroup
const RadioGroupItem: any = UIRadioGroupItem
const Select: any = UISelect
const SelectContent: any = UISelectContent
const SelectItem: any = UISelectItem
const SelectTrigger: any = UISelectTrigger
const SelectValue: any = UISelectValue
const Alert: any = UIAlert
const AlertDescription: any = UIAlertDescription

const contentTypes = [
  "Social media ads",
  "Web & banner campaigns",
  "TV / streaming commercials",
  "Film & scripted streaming",
  "Print & outdoor ads",
  "Music videos",
  "Video-game / VR characters",
  "Stock photo / video libraries",
  "Educational / nonprofit spots",
  "Other"
];

const modelWorkTypes = [
  "Print / Editorial",
  "Runway / Fashion Shows",
  "Commercial / Lifestyle",
  "Film / TV",
  "Digital / Social",
  "Fitness / Athletic",
  "Beauty / Cosmetics",
  "Luxury / High Fashion",
  "Street Style / Urban",
  "E-commerce / Catalog",
  "Trade Shows / Events",
  "Parts Modeling (hands, feet)",
  "Plus Size",
  "Mature / Senior",
  "Petite",
  "Other"
];

const industries = [
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
  "Education",
  "Real Estate",
  "Entertainment",
  "Open to any industry"
];

const athleteBrandCategories = [
  "Sportswear / Athletic Apparel",
  "Footwear",
  "Sports Equipment",
  "Health / Nutrition / Supplements",
  "Tech / Wearables",
  "Energy Drinks / Beverages",
  "Gaming / Esports",
  "Automotive",
  "Finance / Fintech",
  "Education / Training",
  "Open to any brand"
];

const sportsOptions = [
  "Football", "Basketball", "Baseball", "Soccer", "Tennis", "Golf",
  "Track & Field", "Swimming", "Gymnastics", "Volleyball", "Wrestling",
  "Boxing", "MMA", "Hockey", "Lacrosse", "Softball", "Cheerleading",
  "Dance", "Esports", "Other"
];

const ethnicities = [
  "Asian",
  "Black / African American",
  "Hispanic / Latino",
  "Middle Eastern / North African",
  "Native American / Indigenous",
  "Pacific Islander",
  "White / Caucasian",
  "Mixed / Multiracial",
  "Prefer not to say"
];

const hairColors = ["Black", "Brown", "Blonde", "Red", "Gray/White", "Dyed (specify below)"];
const eyeColors = ["Brown", "Blue", "Green", "Hazel", "Gray", "Amber"];
const skinTones = ["Fair", "Light", "Medium-Light", "Medium", "Medium-Dark", "Dark", "Deep"];
const vibes = ["Streetwear", "Glam", "Natural", "Classic", "Edgy", "Athletic", "Runway", "Editorial", "Commercial", "Casual"];

export default function ReserveProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const creatorType = urlParams.get('type') || 'influencer'; // influencer, model_actor, athlete
  const initialMode = (urlParams.get('mode') as 'signup'|'login') || 'login'
  const [authMode, setAuthMode] = useState<'signup'|'login'>(initialMode)
  const { login } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [showWarning, setShowWarning] = useState(true);
  const [profileId, setProfileId] = useState(null); 
  const [formData, setFormData] = useState({
    creator_type: creatorType,
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    stage_name: "",
    
    // Common fields
    city: "",
    state: "",
    birthdate: "",
    gender: "",
    ethnicity: [],
    vibes: [],
    visibility: "private",
    
    // Influencer specific
    content_types: [],
    content_other: "",
    industries: [],
    primary_platform: "",
    platform_handle: "",
    
    // Model specific
    work_types: [],
    representation_status: "",
    headshot_url: "",
    
    // Athlete specific
    sport: "",
    athlete_type: "",
    school_name: "",
    age: "",
    languages: "",
    instagram_handle: "",
    twitter_handle: "",
    brand_categories: [],
    bio: ""
  });

  const startVerification = async () => {
    if (!authenticated || !user?.uid) {
      alert('Please log in to start verification.')
      return
    }
    try {
      setKycLoading(true)
      const res = await fetch(`${API_BASE}/api/kyc/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.uid }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setKycProvider(data.provider || 'veriff')
      setKycSessionUrl(data.session_url)
      setKycStatus('pending')
      setLivenessStatus('pending')
      if (data.session_url) window.open(data.session_url, '_blank')
    } catch (e: any) {
      alert(`Failed to start verification: ${e?.message || e}`)
    } finally {
      setKycLoading(false)
    }
  }

  const refreshVerificationStatus = async () => {
    if (!authenticated || !user?.uid) return
    try {
      setKycLoading(true)
      const res = await fetch(`${API_BASE}/api/kyc/status?user_id=${encodeURIComponent(user.uid)}`)
      if (!res.ok) throw new Error(await res.text())
      const rows = await res.json()
      const row = Array.isArray(rows) && rows.length ? rows[0] : null
      if (row) {
        if (row.kyc_status) setKycStatus(row.kyc_status)
        if (row.liveness_status) setLivenessStatus(row.liveness_status)
        if (row.kyc_provider) setKycProvider(row.kyc_provider)
      }
    } catch (e: any) {
      alert(`Failed to fetch verification status: ${e?.message || e}`)
    } finally {
      setKycLoading(false)
    }
  }

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  // Verification state
  const { initialized, authenticated, user } = useAuth()
  const [kycStatus, setKycStatus] = useState<'not_started'|'pending'|'approved'|'rejected'>('not_started')
  const [livenessStatus, setLivenessStatus] = useState<'not_started'|'pending'|'approved'|'rejected'>('not_started')
  const [kycProvider, setKycProvider] = useState<string | null>(null)
  const [kycSessionUrl, setKycSessionUrl] = useState<string | null>(null)
  const [kycLoading, setKycLoading] = useState(false)
  const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || ''

  const getStepTitle = () => {
    if (step === 1) return "Create Your Account";
    if (step === 2) {
      if (creatorType === 'influencer') return "Profile Basics";
      if (creatorType === 'model_actor') return "Talent Details";
      if (creatorType === 'athlete') return "Athlete Info";
    }
    if (step === 3) {
      if (creatorType === 'influencer') return "Opportunities";
      if (creatorType === 'model_actor') return "Preferences";
      if (creatorType === 'athlete') return "Brand Setup";
    }
    return "";
  };

  // Initial profile creation (Step 1)
  const createInitialProfileMutation = useMutation<any, Error, any>({
    mutationFn: async (data) => {
      try {
        const profile = await base44.entities.FaceProfile.create({
          email: data.email,
          creator_type: data.creator_type,
          full_name: data.full_name || data.stage_name,
          status: "waitlist",
          content_types: [],
          industries: [],
          ethnicity: [],
          vibes: [],
          visibility: "private"
        });
        console.log("Profile created successfully:", profile);
        return profile;
      } catch (error) {
        console.error("Detailed error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      setProfileId(data.id);
      setStep(2);
    },
    onError: (error) => {
      console.error("Error creating initial profile:", error);
      const errorMessage = (error as any)?.response?.data?.message || (error as any)?.message || "Unknown error occurred";
      alert(`Failed to create profile: ${errorMessage}. Please try again.`);
    }
  });

  // Profile update (Step 3)
  const updateProfileMutation = useMutation<any, Error, any>({
    mutationFn: async (data) => {
      if (!profileId) {
        throw new Error("Profile ID not found for update.");
      }
      
      try {
        const updateData: any = {
          city: data.city || "",
          state: data.state || "",
          birthdate: data.birthdate || "",
          gender: data.gender || "",
          ethnicity: data.ethnicity || [],
          vibes: data.vibes || [],
          visibility: data.visibility || "private",
          status: "waitlist"
        };

        // Add type-specific fields
        if (data.creator_type === 'influencer') {
          updateData.content_types = data.content_types || [];
          updateData.content_other = data.content_other || "";
          updateData.industries = data.industries || [];
          updateData.primary_platform = data.primary_platform || "";
          updateData.platform_handle = data.platform_handle || "";
        } else if (data.creator_type === 'model_actor') {
          updateData.work_types = data.work_types || [];
          updateData.representation_status = data.representation_status || "";
          updateData.headshot_url = data.headshot_url || "";
        } else if (data.creator_type === 'athlete') {
          updateData.sport = data.sport || "";
          updateData.athlete_type = data.athlete_type || "";
          updateData.school_name = data.school_name || "";
          updateData.age = data.age || "";
          updateData.languages = data.languages || "";
          updateData.instagram_handle = data.instagram_handle || "";
          updateData.twitter_handle = data.twitter_handle || "";
          updateData.brand_categories = data.brand_categories || [];
          updateData.bio = data.bio || "";
        }

        console.log("Updating profile with data:", updateData);

        const updated = await base44.entities.FaceProfile.update(profileId, updateData);
        
        console.log("Profile updated successfully:", updated);
        return updated;
      } catch (error) {
        console.error("Detailed update error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      // Proceed to verification step
      setStep(4)
    },
    onError: (error) => {
      console.error("Error updating profile:", error);
      const errorMessage = (error as any)?.response?.data?.message || (error as any)?.message || "Unknown error occurred";
      alert(`Failed to update profile: ${errorMessage}. Please try again.`);
    }
  });

  const handleFirstContinue = () => {
    if (!formData.email) {
      alert("Please enter your email address.");
      return;
    }
    if (!formData.password) {
      alert("Please enter a password.");
      return;
    }
    if (!formData.confirmPassword) {
      alert("Please confirm your password.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }
    if (creatorType === 'model_actor' && !formData.stage_name && !formData.full_name) {
      alert("Please enter your full name or stage name.");
      return;
    }
    if (creatorType !== 'model_actor' && !formData.full_name) {
      alert("Please enter your full name.");
      return;
    }
    
    createInitialProfileMutation.mutate(formData);
  };

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    console.log("Submitting final form data:", formData);
    updateProfileMutation.mutate(formData);
  };

  const toggleArrayItem = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-blue-50 py-16 px-6 flex items-center justify-center">
        <Card className="max-w-2xl w-full p-12 bg-white border-2 border-black shadow-2xl rounded-none text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-[#32C8D1] to-teal-500 border-2 border-black rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Profile reserved—welcome to the Likelee ecosystem
          </h1>
          <p className="text-lg text-gray-700 leading-relaxed mb-8">
            We're onboarding talent in waves to keep demand and visibility balanced. Your profile is saved; we'll notify you when it's time to complete verification and go live.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-blue-50 py-12 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Warning Message */}
        {showWarning && step === 1 && (
          <Alert className="mb-8 bg-cyan-50 border-2 border-[#32C8D1] rounded-none">
            <AlertCircle className="h-5 w-5 text-[#32C8D1]" />
            <AlertDescription className="text-cyan-900 font-medium">
              We're launching in limited batches to make sure every Creator gets visibility and campaign opportunities. Reserve your profile to join the first creator cohort.
            </AlertDescription>
          </Alert>
        )}

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Reserve Your Profile</h2>
            <Badge className="bg-cyan-100 text-cyan-700 border-2 border-black rounded-none">
              Step {step} of {totalSteps}
            </Badge>
          </div>
          <div className="w-full h-3 bg-gray-200 border-2 border-black">
            <div
              className="h-full bg-gradient-to-r from-[#32C8D1] to-teal-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <Card className="p-8 bg-white border-2 border-black shadow-xl rounded-none">
          {/* Step 1: Account Setup */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{getStepTitle()}</h3>
                <p className="text-gray-600">
                  {creatorType === 'athlete' && "Create your NIL-ready account"}
                  {creatorType === 'model_actor' && "Create your Likelee account"}
                  {creatorType === 'influencer' && "Let's start with the basics"}
                </p>
              </div>

              {/* Auth mode switch */}
              <div className="flex gap-2">
                <Button
                  variant={authMode === 'signup' ? 'default' : 'outline'}
                  className="rounded-none border-2 border-black"
                  onClick={() => setAuthMode('signup')}
                >
                  Sign up
                </Button>
                <Button
                  variant={authMode === 'login' ? 'default' : 'outline'}
                  className="rounded-none border-2 border-black"
                  onClick={() => setAuthMode('login')}
                >
                  Log in
                </Button>
              </div>

              {authMode === 'signup' ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700 mb-2 block">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="border-2 border-gray-300 rounded-none"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700 mb-2 block">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="border-2 border-gray-300 rounded-none"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 mb-2 block">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="border-2 border-gray-300 rounded-none"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <Label htmlFor="full_name" className="text-sm font-medium text-gray-700 mb-2 block">
                    {creatorType === 'model_actor' ? "Full Name / Stage Name" : "Full Name"}
                  </Label>
                  <Input
                    id="full_name"
                    type="text"
                    value={creatorType === 'model_actor' ? (formData.stage_name || formData.full_name) : formData.full_name}
                    onChange={(e: any) => setFormData({
                      ...formData,
                      [creatorType === 'model_actor' ? 'stage_name' : 'full_name']: e.target.value
                    })}
                    className="border-2 border-gray-300 rounded-none"
                    placeholder={creatorType === 'model_actor' ? "Your name or stage name" : "Your full name"}
                  />
                </div>
                <Button
                  onClick={handleFirstContinue} 
                  disabled={createInitialProfileMutation.isPending} 
                  className="w-full h-12 bg-gradient-to-r from-[#32C8D1] to-teal-500 hover:from-[#2AB8C1] hover:to-teal-600 text-white border-2 border-black rounded-none"
                >
                  {createInitialProfileMutation.isPending ? "Saving..." : "Continue"}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
              ) : (
                <form
                  className="space-y-4"
                  onSubmit={async (e) => {
                    e.preventDefault()
                    // Reuse formData.email/password
                    await login(formData.email, formData.password)
                    navigate('/CreatorDashboard')
                  }}
                >
                  <div>
                    <Label htmlFor="login_email" className="text-sm font-medium text-gray-700 mb-2 block">
                      Email Address
                    </Label>
                    <Input
                      id="login_email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="border-2 border-gray-300 rounded-none"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="login_password" className="text-sm font-medium text-gray-700 mb-2 block">
                      Password
                    </Label>
                    <Input
                      id="login_password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="border-2 border-gray-300 rounded-none"
                      placeholder="••••••••"
                    />
                  </div>
                  <Button type="submit" className="w-full h-12 bg-black text-white border-2 border-black rounded-none">
                    Log in
                  </Button>
                </form>
              )}
            </div>
          )}

          {/* Step 2: Profile Details (varies by type) */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{getStepTitle()}</h3>
                <p className="text-gray-600">
                  {creatorType === 'influencer' && "Tell us a little about yourself"}
                  {creatorType === 'model_actor' && "Let's start your portfolio"}
                  {creatorType === 'athlete' && "Tell us about your sport"}
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city" className="text-sm font-medium text-gray-700 mb-2 block">
                      City
                    </Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="border-2 border-gray-300 rounded-none"
                      placeholder="Los Angeles"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state" className="text-sm font-medium text-gray-700 mb-2 block">
                      State
                    </Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="border-2 border-gray-300 rounded-none"
                      placeholder="CA"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="birthdate" className="text-sm font-medium text-gray-700 mb-2 block">
                    {creatorType === 'athlete' ? "Age" : "Birthdate"}
                  </Label>
                  {creatorType === 'athlete' ? (
                    <Input
                      id="age"
                      type="number"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      className="border-2 border-gray-300 rounded-none"
                      placeholder="21"
                    />
                  ) : (
                    <Input
                      id="birthdate"
                      type="date"
                      value={formData.birthdate}
                      onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                      className="border-2 border-gray-300 rounded-none"
                    />
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    How do you identify?
                  </Label>
                  <RadioGroup value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                    <div className="space-y-2">
                      {["Female", "Male", "Nonbinary", "Gender fluid", "Prefer not to say"].map((option) => (
                        <div key={option} className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50">
                          <RadioGroupItem value={option} id={option} className="border-2 border-gray-400" />
                          <Label htmlFor={option} className="text-sm text-gray-700 cursor-pointer flex-1">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-3 block">
                    Race/Ethnicity (select all that apply)
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {ethnicities.map((ethnicity) => (
                      <div key={ethnicity} className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50">
                        <Checkbox
                          id={ethnicity}
                          checked={formData.ethnicity.includes(ethnicity)}
                          onCheckedChange={() => toggleArrayItem("ethnicity", ethnicity)}
                          className="border-2 border-gray-400"
                        />
                        <label htmlFor={ethnicity} className="text-sm text-gray-700 cursor-pointer flex-1">
                          {ethnicity}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Athlete-specific fields */}
                {creatorType === 'athlete' && (
                  <>
                    <div>
                      <Label htmlFor="sport" className="text-sm font-medium text-gray-700 mb-2 block">
                        Sport
                      </Label>
                      <Select value={formData.sport} onValueChange={(value) => setFormData({ ...formData, sport: value })}>
                        <SelectTrigger className="border-2 border-gray-300 rounded-none">
                          <SelectValue placeholder="Select your sport" />
                        </SelectTrigger>
                        <SelectContent>
                          {sportsOptions.map((sport) => (
                            <SelectItem key={sport} value={sport}>{sport}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-3 block">
                        Athlete Type
                      </Label>
                      <RadioGroup value={formData.athlete_type} onValueChange={(value) => setFormData({ ...formData, athlete_type: value })}>
                        <div className="space-y-2">
                          {["University", "Professional", "Independent"].map((option) => (
                            <div key={option} className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50">
                              <RadioGroupItem value={option} id={option} className="border-2 border-gray-400" />
                              <Label htmlFor={option} className="text-sm text-gray-700 cursor-pointer flex-1">
                                {option}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>

                    {formData.athlete_type === "University" && (
                      <div>
                        <Label htmlFor="school_name" className="text-sm font-medium text-gray-700 mb-2 block">
                          School Name
                        </Label>
                        <Input
                          id="school_name"
                          value={formData.school_name}
                          onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                          className="border-2 border-gray-300 rounded-none"
                          placeholder="University name"
                        />
                      </div>
                    )}

                    <div>
                      <Label htmlFor="languages" className="text-sm font-medium text-gray-700 mb-2 block">
                        Languages
                      </Label>
                      <Input
                        id="languages"
                        value={formData.languages}
                        onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                        className="border-2 border-gray-300 rounded-none"
                        placeholder="e.g., English, Spanish"
                      />
                    </div>
                  </>
                )}

                {/* Model-specific fields */}
                {creatorType === 'model_actor' && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-medium text-gray-900">
                        Type of work (select up to 3)
                      </Label>
                      <span className="text-xs text-gray-500">You can specify more later</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-2 border-2 border-gray-200 rounded-none">
                      {modelWorkTypes.map((type) => (
                        <div key={type} className="flex items-center space-x-2 p-2 hover:bg-gray-50">
                          <Checkbox
                            id={type}
                            checked={formData.work_types.includes(type)}
                            onCheckedChange={() => {
                              if (formData.work_types.includes(type)) {
                                toggleArrayItem("work_types", type);
                              } else if (formData.work_types.length < 3) {
                                toggleArrayItem("work_types", type);
                              } else {
                                alert("Please select up to 3 options for now. You can add more later.");
                              }
                            }}
                            className="border-2 border-gray-400"
                          />
                          <label htmlFor={type} className="text-sm text-gray-700 cursor-pointer flex-1">
                            {type}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Influencer vibes */}
                {creatorType === 'influencer' && (
                  <div>
                    <Label className="text-sm font-medium text-gray-900 mb-3 block">
                      Vibe / Style Tags
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {vibes.map((vibe) => (
                        <div key={vibe} className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50">
                          <Checkbox
                            id={vibe}
                            checked={formData.vibes.includes(vibe)}
                            onCheckedChange={() => toggleArrayItem("vibes", vibe)}
                            className="border-2 border-gray-400"
                          />
                          <label htmlFor={vibe} className="text-sm text-gray-700 cursor-pointer flex-1">
                            {vibe}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1 h-12 border-2 border-black rounded-none"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  className="flex-1 h-12 bg-gradient-to-r from-[#32C8D1] to-teal-500 hover:from-[#2AB8C1] hover:to-teal-600 text-white border-2 border-black rounded-none"
                >
                  {creatorType === 'athlete' ? 'Next: Brand Setup' : 'Continue'}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Opportunities/Preferences/Brand Setup (varies by type) */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{getStepTitle()}</h3>
                <p className="text-gray-600">
                  {creatorType === 'influencer' && "Help us match you with the right campaigns"}
                  {creatorType === 'model_actor' && "Help us tailor your opportunities"}
                  {creatorType === 'athlete' && "Get ready to attract sponsorship and brand deals"}
                </p>
              </div>

              <div className="space-y-6">
                {/* Influencer Step 3 */}
                {creatorType === 'influencer' && (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-medium text-gray-900">
                          What kind of content are you interested in being featured in?
                        </Label>
                        <span className="text-xs text-gray-500">Select up to 3 for now</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {contentTypes.map((type) => (
                          <div key={type} className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50">
                            <Checkbox
                              id={type}
                              checked={formData.content_types.includes(type)}
                              onCheckedChange={() => toggleArrayItem("content_types", type)}
                              className="border-2 border-gray-400"
                            />
                            <label htmlFor={type} className="text-sm text-gray-700 cursor-pointer flex-1">
                              {type}
                            </label>
                          </div>
                        ))}
                      </div>
                      {formData.content_types.includes("Other") && (
                        <Input
                          value={formData.content_other}
                          onChange={(e) => setFormData({ ...formData, content_other: e.target.value })}
                          className="mt-3 border-2 border-gray-300 rounded-none"
                          placeholder="Please specify..."
                        />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-medium text-gray-900">
                          What types of brands or industries do you want to work with?
                        </Label>
                        <span className="text-xs text-gray-500">Select up to 3 for now</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {industries.map((industry) => (
                          <div key={industry} className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50">
                            <Checkbox
                              id={industry}
                              checked={formData.industries.includes(industry)}
                              onCheckedChange={() => toggleArrayItem("industries", industry)}
                              className="border-2 border-gray-400"
                            />
                            <label htmlFor={industry} className="text-sm text-gray-700 cursor-pointer flex-1">
                              {industry}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="primary_platform" className="text-sm font-medium text-gray-700 mb-2 block">
                          Primary Platform
                        </Label>
                        <Select value={formData.primary_platform} onValueChange={(value) => setFormData({ ...formData, primary_platform: value })}>
                          <SelectTrigger className="border-2 border-gray-300 rounded-none">
                            <SelectValue placeholder="Select platform" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="instagram">Instagram</SelectItem>
                            <SelectItem value="tiktok">TikTok</SelectItem>
                            <SelectItem value="youtube">YouTube</SelectItem>
                            <SelectItem value="twitter">Twitter/X</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="platform_handle" className="text-sm font-medium text-gray-700 mb-2 block">
                          Handle
                        </Label>
                        <Input
                          id="platform_handle"
                          value={formData.platform_handle}
                          onChange={(e) => setFormData({ ...formData, platform_handle: e.target.value })}
                          className="border-2 border-gray-300 rounded-none"
                          placeholder="@yourhandle"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Model/Actor Step 3 */}
                {creatorType === 'model_actor' && (
                  <>
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-3 block">
                        Representation Status
                      </Label>
                      <RadioGroup value={formData.representation_status} onValueChange={(value) => setFormData({ ...formData, representation_status: value })}>
                        <div className="space-y-2">
                          {["Agency", "Independent"].map((option) => (
                            <div key={option} className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50">
                              <RadioGroupItem value={option} id={option} className="border-2 border-gray-400" />
                              <Label htmlFor={option} className="text-sm text-gray-700 cursor-pointer flex-1">
                                {option}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-900 mb-3 block">
                        Vibe / Style Tags
                      </Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {vibes.map((vibe) => (
                          <div key={vibe} className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50">
                            <Checkbox
                              id={vibe}
                              checked={formData.vibes.includes(vibe)}
                              onCheckedChange={() => toggleArrayItem("vibes", vibe)}
                              className="border-2 border-gray-400"
                            />
                            <label htmlFor={vibe} className="text-sm text-gray-700 cursor-pointer flex-1">
                              {vibe}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="headshot_url" className="text-sm font-medium text-gray-700 mb-2 block">
                        Upload Headshot (optional)
                      </Label>
                      <Input
                        id="headshot_url"
                        type="text"
                        value={formData.headshot_url}
                        onChange={(e) => setFormData({ ...formData, headshot_url: e.target.value })}
                        className="border-2 border-gray-300 rounded-none"
                        placeholder="Image URL"
                      />
                      <p className="text-xs text-gray-500 mt-1">You can upload your headshot after creating your account</p>
                    </div>
                  </>
                )}

                {/* Athlete Step 3 */}
                {creatorType === 'athlete' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="instagram_handle" className="text-sm font-medium text-gray-700 mb-2 block">
                          Instagram (optional)
                        </Label>
                        <Input
                          id="instagram_handle"
                          value={formData.instagram_handle}
                          onChange={(e) => setFormData({ ...formData, instagram_handle: e.target.value })}
                          className="border-2 border-gray-300 rounded-none"
                          placeholder="@yourhandle"
                        />
                      </div>
                      <div>
                        <Label htmlFor="twitter_handle" className="text-sm font-medium text-gray-700 mb-2 block">
                          Twitter/X (optional)
                        </Label>
                        <Input
                          id="twitter_handle"
                          value={formData.twitter_handle}
                          onChange={(e) => setFormData({ ...formData, twitter_handle: e.target.value })}
                          className="border-2 border-gray-300 rounded-none"
                          placeholder="@yourhandle"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-medium text-gray-900">
                          Interests / Brand Categories
                        </Label>
                        <span className="text-xs text-gray-500">Select up to 3 for now</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {athleteBrandCategories.map((category) => (
                          <div key={category} className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50">
                            <Checkbox
                              id={category}
                              checked={formData.brand_categories.includes(category)}
                              onCheckedChange={() => toggleArrayItem("brand_categories", category)}
                              className="border-2 border-gray-400"
                            />
                            <label htmlFor={category} className="text-sm text-gray-700 cursor-pointer flex-1">
                              {category}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="bio" className="text-sm font-medium text-gray-700 mb-2 block">
                        Short Bio
                      </Label>
                      <Textarea
                        id="bio"
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        className="border-2 border-gray-300 rounded-none h-24"
                        placeholder="Tell brands a bit about you..."
                      />
                    </div>
                  </>
                )}

                {/* Profile Visibility - Common for all */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    Profile Visibility
                  </Label>
                  <RadioGroup value={formData.visibility} onValueChange={(value) => setFormData({ ...formData, visibility: value })}>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50">
                        <RadioGroupItem value="public" id="public" className="border-2 border-gray-400" />
                        <Label htmlFor="public" className="text-sm text-gray-700 cursor-pointer flex-1">
                          <span className="font-medium">Public</span> - Visible to everyone
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50">
                        <RadioGroupItem value="private" id="private" className="border-2 border-gray-400" />
                        <Label htmlFor="private" className="text-sm text-gray-700 cursor-pointer flex-1">
                          <span className="font-medium">Private</span> - Only discoverable to brands and AI creators
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1 h-12 border-2 border-black rounded-none"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={updateProfileMutation.isPending}
                  className="flex-1 h-12 bg-gradient-to-r from-[#32C8D1] to-teal-500 hover:from-[#2AB8C1] hover:to-teal-600 text-white border-2 border-black rounded-none"
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Save & Continue to Verification"}
                  <CheckCircle2 className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Verify Identity */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Verify Identity</h3>
                <p className="text-gray-600">Complete KYC and liveness to activate your profile.</p>
              </div>

              {!initialized ? (
                <p className="text-gray-700">Loading…</p>
              ) : !authenticated ? (
                <div className="p-4 border-2 border-amber-500 bg-amber-50">
                  <p className="text-amber-900 mb-3">Please log in to start verification.</p>
                  <Button onClick={() => navigate('/Login')} className="rounded-none border-2 border-black bg-black text-white">Log in</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border-2 border-gray-200">
                      <p className="text-sm text-gray-600">KYC status</p>
                      <p className="text-lg font-semibold">{kycStatus}</p>
                    </div>
                    <div className="p-4 border-2 border-gray-200">
                      <p className="text-sm text-gray-600">Liveness status</p>
                      <p className="text-lg font-semibold">{livenessStatus}</p>
                    </div>
                    <div className="p-4 border-2 border-gray-200">
                      <p className="text-sm text-gray-600">Provider</p>
                      <p className="text-lg font-semibold">{kycProvider || 'veriff'}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={startVerification} disabled={kycLoading} className="rounded-none border-2 border-black bg-black text-white">
                      {kycLoading ? 'Starting…' : (kycStatus === 'not_started' ? 'Start verification' : 'Restart verification')}
                    </Button>
                    <Button onClick={refreshVerificationStatus} variant="outline" className="rounded-none border-2 border-black">Refresh status</Button>
                    <Button
                      onClick={() => setSubmitted(true)}
                      disabled={!(kycStatus === 'approved' && livenessStatus === 'approved')}
                      className="rounded-none border-2 border-black bg-green-600 text-white disabled:opacity-50"
                    >
                      Finish
                    </Button>
                  </div>

                  {kycSessionUrl && (
                    <p className="text-sm text-gray-500">If a new window didn’t open, <a className="underline" href={kycSessionUrl} target="_blank" rel="noreferrer">click here</a>.</p>
                  )}
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1 h-12 border-2 border-black rounded-none"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}