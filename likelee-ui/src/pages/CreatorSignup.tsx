import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Upload,
  AlertCircle,
} from "lucide-react";

const contentTypes = [
  "AI-generated films",
  "AI-driven commercials",
  "AI art installations",
  "Virtual-reality experiences",
  "Interactive media",
  "Digital fashion",
  "Music videos",
  "Other",
];

const aiTools = [
  "Adobe Firefly",
  "DALL·E 4",
  "Google Veo",
  "Hailou Minimax",
  "InVideo AI",
  "Kling AI",
  "Luma Dream Machine",
  "Meta Movie Gen",
  "Midjourney",
  "OpenAI Sora",
  "Pika Labs",
  "Runway Gen-4",
  "Stable Diffusion XL",
  "Stable Video Diffusion",
  "Synthesia",
  "Vidu",
  "Other",
];

export default function CreatorSignup() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [profileId, setProfileId] = useState(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    instagram_handle: "",
    tiktok_handle: "",
    youtube_handle: "",
    agency_name: "",
    content_types: [],
    content_other: "",
    ai_tools: [],
    ai_tools_other: "",
    city: "",
    state: "",
    experience: "",
    portfolio_url: "",
    social_url: "",
    profile_photo_url: "",
  });

  const totalSteps = 2;
  const progress = (step / totalSteps) * 100;

  // Initial profile creation (Step 1)
  const createInitialProfileMutation = useMutation({
    mutationFn: (data) => {
      return base44.entities.CreatorProfile.create({
        name: data.name,
        email: data.email,
        instagram_handle: data.instagram_handle || "",
        tiktok_handle: data.tiktok_handle || "",
        youtube_handle: data.youtube_handle || "",
        agency_name: data.agency_name || "",
        status: "waitlist",
      });
    },
    onSuccess: (data) => {
      setProfileId(data.id);
      setStep(2);
    },
    onError: (error) => {
      console.error("Error creating initial profile:", error);
      alert(
        "Failed to create initial profile. Please check your inputs and try again.",
      );
    },
  });

  // Profile update (Step 2)
  const updateProfileMutation = useMutation({
    mutationFn: async (dataToUpdate) => {
      if (!profileId) {
        throw new Error(
          "Profile ID not found for update. Please complete Step 1 first.",
        );
      }

      let finalProfilePhotoUrl = dataToUpdate.profile_photo_url;

      if (profilePhotoFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({
          file: profilePhotoFile,
        });
        finalProfilePhotoUrl = file_url;
      }

      return base44.entities.CreatorProfile.update(profileId, {
        content_types: dataToUpdate.content_types || [],
        content_other: dataToUpdate.content_other || "",
        ai_tools: dataToUpdate.ai_tools || [],
        ai_tools_other: dataToUpdate.ai_tools_other || "",
        city: dataToUpdate.city || "",
        state: dataToUpdate.state || "",
        experience: dataToUpdate.experience || "",
        portfolio_url: dataToUpdate.portfolio_url || "",
        social_url: dataToUpdate.social_url || "",
        profile_photo_url: finalProfilePhotoUrl,
        status: "waitlist",
      });
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (error) => {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    },
  });

  const handleNext = () => {
    if (step === 1) {
      if (
        !formData.name ||
        !formData.email ||
        !formData.password ||
        !formData.confirmPassword
      ) {
        alert("Please fill in all required fields.");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        alert("Passwords do not match.");
        return;
      }
      // Check that at least one social handle is provided
      if (
        !formData.instagram_handle &&
        !formData.tiktok_handle &&
        !formData.youtube_handle
      ) {
        alert(
          "Please provide at least one social media handle (Instagram, TikTok, or YouTube).",
        );
        return;
      }
      createInitialProfileMutation.mutate(formData);
      return;
    }
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = () => {
    if (!formData.content_types.length && !formData.content_other) {
      alert("Please select at least one content type or specify 'Other'.");
      return;
    }
    if (
      formData.content_types.includes("Other") &&
      !formData.content_other.trim()
    ) {
      alert("Please specify your 'Other' content type.");
      return;
    }
    if (!formData.ai_tools.length && !formData.ai_tools_other) {
      alert("Please select at least one AI tool or specify 'Other'.");
      return;
    }
    if (
      formData.ai_tools.includes("Other") &&
      !formData.ai_tools_other.trim()
    ) {
      alert("Please specify your 'Other' AI tool.");
      return;
    }
    if (!formData.city || !formData.state) {
      alert("Please fill in your city and state/country.");
      return;
    }
    if (!formData.experience) {
      alert("Please select your years of AI creative experience.");
      return;
    }

    updateProfileMutation.mutate(formData);
  };

  const toggleArrayItem = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((item) => item !== value)
        : [...prev[field], value],
    }));
  };

  const toggleSelectAll = (field, allOptions) => {
    const currentSelection = formData[field];
    // Filter out "Other" from allOptions for the check, or include it if desired.
    // Usually "Select All" implies selecting all defined options.
    // Let's assume we select all options present in the list.
    const optionsToSelect = allOptions.filter((opt) => opt !== "Other");

    const isAllSelected = optionsToSelect.every((option) =>
      currentSelection.includes(option),
    );

    setFormData((prev) => ({
      ...prev,
      [field]: isAllSelected
        ? prev[field].filter((item) => !optionsToSelect.includes(item))
        : [...new Set([...prev[field], ...optionsToSelect])],
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePhotoFile(file);
    } else {
      setProfilePhotoFile(null);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-rose-50 py-16 px-6 flex items-center justify-center">
        <Card className="max-w-2xl w-full p-12 bg-white border-2 border-black shadow-2xl rounded-none text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-[#F18B6A] to-pink-500 border-2 border-black rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            You're on the list for our next Creator cohort
          </h1>
          <p className="text-lg text-gray-700 leading-relaxed mb-8">
            The first 200 Creator spots are filled. We're growing the Likelee
            ecosystem carefully so every AI Creator gets real visibility and
            paid opportunities. You're in the next cohort queue—we'll email you
            as soon as we open the gate.
          </p>
          <div className="bg-gradient-to-br from-orange-50 to-pink-50 p-6 border-2 border-black rounded-none mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              What's next:
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Watch for a welcome email with a quick profile checklist.
            </p>
          </div>
          <div className="space-y-4">
            <p className="text-lg font-semibold text-gray-900">
              Follow updates →
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() =>
                  window.open("https://instagram.com/likelee", "_blank")
                }
                variant="outline"
                className="h-12 px-8 border-2 border-black rounded-none"
              >
                @likelee (IG)
              </Button>
              <Button
                onClick={() =>
                  (window.location.href = "mailto:hello@likelee.ai")
                }
                variant="outline"
                className="h-12 px-8 border-2 border-black rounded-none"
              >
                hello@likelee.ai
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-rose-50 py-12 px-6">
      <div className="max-w-3xl mx-auto">
        {step === 1 && (
          <Alert className="mb-8 bg-amber-50 border-2 border-amber-500 rounded-none">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <AlertDescription className="text-amber-900 font-medium">
              <strong>Heads-up:</strong> The first 200 Creator spots are filled.
              We are onboarding in cohorts so every AI Creator gets an
              opportunity for visibility! Continue to sign up to lock-in your
              spot :)
            </AlertDescription>
          </Alert>
        )}

        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Join as Creator
            </h2>
            <Badge className="bg-orange-100 text-orange-700 border-2 border-black rounded-none">
              Step {step} of {totalSteps}
            </Badge>
          </div>
          <div className="w-full h-3 bg-gray-200 border-2 border-black">
            <div
              className="h-full bg-gradient-to-r from-[#F18B6A] to-pink-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <Card className="p-8 bg-white border-2 border-black shadow-xl rounded-none">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Basic Details
                </h3>
                <p className="text-gray-600">
                  Let's start with your information
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="name"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    Full Name *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="border-2 border-gray-300 rounded-none"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="email"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    Email Address *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="border-2 border-gray-300 rounded-none"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="password"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    Password *
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="border-2 border-gray-300 rounded-none"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="confirmPassword"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    Confirm Password *
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="border-2 border-gray-300 rounded-none"
                    placeholder="••••••••"
                  />
                </div>

                <div className="pt-4 border-t-2 border-gray-200">
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    Social Media Handles *{" "}
                    <span className="text-sm text-gray-500 font-normal">
                      (At least 1 required)
                    </span>
                  </Label>
                  <div className="space-y-3">
                    <div>
                      <Label
                        htmlFor="instagram_handle"
                        className="text-sm text-gray-600 mb-2 block"
                      >
                        Instagram
                      </Label>
                      <Input
                        id="instagram_handle"
                        value={formData.instagram_handle}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            instagram_handle: e.target.value,
                          })
                        }
                        className="border-2 border-gray-300 rounded-none"
                        placeholder="@yourusername"
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="tiktok_handle"
                        className="text-sm text-gray-600 mb-2 block"
                      >
                        TikTok
                      </Label>
                      <Input
                        id="tiktok_handle"
                        value={formData.tiktok_handle}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            tiktok_handle: e.target.value,
                          })
                        }
                        className="border-2 border-gray-300 rounded-none"
                        placeholder="@yourusername"
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="youtube_handle"
                        className="text-sm text-gray-600 mb-2 block"
                      >
                        YouTube
                      </Label>
                      <Input
                        id="youtube_handle"
                        value={formData.youtube_handle}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            youtube_handle: e.target.value,
                          })
                        }
                        className="border-2 border-gray-300 rounded-none"
                        placeholder="@yourchannel"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t-2 border-gray-200">
                  <Label
                    htmlFor="agency_name"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    Agency (if applicable)
                  </Label>
                  <Input
                    id="agency_name"
                    value={formData.agency_name}
                    onChange={(e) =>
                      setFormData({ ...formData, agency_name: e.target.value })
                    }
                    className="border-2 border-gray-300 rounded-none"
                    placeholder="Your agency name"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    If you're represented by an agency, enter their name here
                  </p>
                </div>
              </div>

              <Button
                onClick={handleNext}
                disabled={createInitialProfileMutation.isPending}
                className="w-full h-12 bg-gradient-to-r from-[#F18B6A] to-pink-500 hover:from-[#E07A5A] hover:to-pink-600 text-white border-2 border-black rounded-none"
              >
                {createInitialProfileMutation.isPending
                  ? "Saving..."
                  : "Continue"}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Creator Profile Details
                </h3>
                <p className="text-gray-600">
                  Tell us more about your creative work and experience.
                </p>
              </div>

              <div className="space-y-6 border-b pb-6 border-gray-200">
                <h4 className="text-xl font-bold text-gray-900">
                  Creative Focus
                </h4>
                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-3 block">
                    What kind of AI content do you create? *
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="col-span-1 md:col-span-2 flex items-center space-x-2 p-3 border-2 border-black bg-gray-50 rounded-none mb-2">
                      <Checkbox
                        id="select_all_content"
                        checked={contentTypes
                          .filter((t) => t !== "Other")
                          .every((type) =>
                            formData.content_types.includes(type),
                          )}
                        onCheckedChange={() =>
                          toggleSelectAll("content_types", contentTypes)
                        }
                        className="border-2 border-gray-900"
                      />
                      <label
                        htmlFor="select_all_content"
                        className="text-sm font-bold text-gray-900 cursor-pointer flex-1"
                      >
                        Select All
                      </label>
                    </div>
                    {contentTypes.map((type) => (
                      <div
                        key={type}
                        className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50"
                      >
                        <Checkbox
                          id={`content-type-${type.replace(/\s+/g, "-")}`}
                          checked={formData.content_types.includes(type)}
                          onCheckedChange={() =>
                            toggleArrayItem("content_types", type)
                          }
                          className="border-2 border-gray-400"
                        />
                        <label
                          htmlFor={`content-type-${type.replace(/\s+/g, "-")}`}
                          className="text-sm text-gray-700 cursor-pointer flex-1"
                        >
                          {type}
                        </label>
                      </div>
                    ))}
                  </div>
                  {formData.content_types.includes("Other") && (
                    <Input
                      value={formData.content_other}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          content_other: e.target.value,
                        })
                      }
                      className="mt-3 border-2 border-gray-300 rounded-none"
                      placeholder="Please specify your content type..."
                    />
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-3 block">
                    What AI tools do you primarily use? *
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
                    <div className="col-span-1 md:col-span-2 flex items-center space-x-2 p-3 border-2 border-black bg-gray-50 rounded-none mb-2">
                      <Checkbox
                        id="select_all_ai_tools"
                        checked={aiTools
                          .filter((t) => t !== "Other")
                          .every((tool) => formData.ai_tools.includes(tool))}
                        onCheckedChange={() =>
                          toggleSelectAll("ai_tools", aiTools)
                        }
                        className="border-2 border-gray-900"
                      />
                      <label
                        htmlFor="select_all_ai_tools"
                        className="text-sm font-bold text-gray-900 cursor-pointer flex-1"
                      >
                        Select All
                      </label>
                    </div>
                    {aiTools.map((tool) => (
                      <div
                        key={tool}
                        className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50"
                      >
                        <Checkbox
                          id={`ai-tool-${tool.replace(/\s+/g, "-")}`}
                          checked={formData.ai_tools.includes(tool)}
                          onCheckedChange={() =>
                            toggleArrayItem("ai_tools", tool)
                          }
                          className="border-2 border-gray-400"
                        />
                        <label
                          htmlFor={`ai-tool-${tool.replace(/\s+/g, "-")}`}
                          className="text-sm text-gray-700 cursor-pointer flex-1"
                        >
                          {tool}
                        </label>
                      </div>
                    ))}
                  </div>
                  {formData.ai_tools.includes("Other") && (
                    <Input
                      value={formData.ai_tools_other}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          ai_tools_other: e.target.value,
                        })
                      }
                      className="mt-3 border-2 border-gray-300 rounded-none"
                      placeholder="Please specify your AI tools..."
                    />
                  )}
                </div>
              </div>

              <div className="space-y-6 border-b pb-6 border-gray-200">
                <h4 className="text-xl font-bold text-gray-900">
                  Location & Experience
                </h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label
                        htmlFor="city"
                        className="text-sm font-medium text-gray-700 mb-2 block"
                      >
                        City *
                      </Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) =>
                          setFormData({ ...formData, city: e.target.value })
                        }
                        className="border-2 border-gray-300 rounded-none"
                        placeholder="Los Angeles"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="state"
                        className="text-sm font-medium text-gray-700 mb-2 block"
                      >
                        State / Country *
                      </Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) =>
                          setFormData({ ...formData, state: e.target.value })
                        }
                        className="border-2 border-gray-300 rounded-none"
                        placeholder="CA / USA"
                      />
                    </div>
                  </div>

                  <div>
                    <Label
                      htmlFor="experience"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      Years of AI creative experience *
                    </Label>
                    <Select
                      value={formData.experience}
                      onValueChange={(value) =>
                        setFormData({ ...formData, experience: value })
                      }
                    >
                      <SelectTrigger className="border-2 border-gray-300 rounded-none">
                        <SelectValue placeholder="Select experience level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="less_than_1">
                          Less than 1 year
                        </SelectItem>
                        <SelectItem value="1_2">1 – 2 years</SelectItem>
                        <SelectItem value="3_5">3 – 5 years</SelectItem>
                        <SelectItem value="5_plus">5+ years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-6 border-b pb-6 border-gray-200">
                <h4 className="text-xl font-bold text-gray-900">
                  Portfolio & Social
                </h4>
                <p className="text-gray-600">
                  Optional: Share your work and social presence
                </p>
                <div className="space-y-4">
                  <div>
                    <Label
                      htmlFor="portfolio_url"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      Portfolio URL
                    </Label>
                    <Input
                      id="portfolio_url"
                      type="url"
                      value={formData.portfolio_url}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          portfolio_url: e.target.value,
                        })
                      }
                      className="border-2 border-gray-300 rounded-none"
                      placeholder="https://yourportfolio.com"
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="social_url"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      Social Media URL
                    </Label>
                    <Input
                      id="social_url"
                      type="url"
                      value={formData.social_url}
                      onChange={(e) =>
                        setFormData({ ...formData, social_url: e.target.value })
                      }
                      className="border-2 border-gray-300 rounded-none"
                      placeholder="https://instagram.com/yourprofile"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-xl font-bold text-gray-900">
                  Upload Profile Photo
                </h4>
                <p className="text-gray-600">
                  Add a professional photo to your profile
                </p>
                <div className="space-y-4">
                  <div>
                    <Label
                      htmlFor="profilePhotoInput"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      Profile Photo (optional)
                    </Label>
                    <p className="text-sm text-gray-500 mb-3">
                      Minimum 800 × 800 px, JPG or PNG, maximum 5 MB
                    </p>
                    <div className="border-2 border-dashed border-gray-300 rounded-none p-8 text-center hover:border-[#F18B6A] transition-colors">
                      <input
                        id="profilePhotoInput"
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="profilePhotoInput"
                        className="cursor-pointer"
                      >
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-700 font-medium mb-1">
                          {profilePhotoFile
                            ? profilePhotoFile.name
                            : "Click to upload"}
                        </p>
                        <p className="text-sm text-gray-500">
                          or drag and drop
                        </p>
                      </label>
                    </div>
                  </div>
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
                  className="flex-1 h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-2 border-black rounded-none"
                >
                  {updateProfileMutation.isPending
                    ? "Submitting..."
                    : "Complete Sign Up"}
                  <CheckCircle2 className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
