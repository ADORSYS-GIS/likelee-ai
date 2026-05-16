import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreatorTermsContent } from "@/components/CreatorTermsContent";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Upload,
  Download,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { getFriendlyErrorMessage } from "@/utils/errorMapping";

const getContentTypes = (t: any) => [
  t("creatorSignup.options.contentTypes.aiGeneratedFilms"),
  t("creatorSignup.options.contentTypes.aiDrivenCommercials"),
  t("creatorSignup.options.contentTypes.aiArtInstallations"),
  t("creatorSignup.options.contentTypes.virtualRealityExperiences"),
  t("creatorSignup.options.contentTypes.interactiveMedia"),
  t("creatorSignup.options.contentTypes.digitalFashion"),
  t("creatorSignup.options.contentTypes.musicVideos"),
  t("creatorSignup.options.contentTypes.other"),
];

const getAiTools = (t: any) => [
  t("creatorSignup.options.aiTools.adobeFirefly"),
  t("creatorSignup.options.aiTools.dallE4"),
  t("creatorSignup.options.aiTools.googleVeo"),
  t("creatorSignup.options.aiTools.hailouMinimax"),
  t("creatorSignup.options.aiTools.inVideoAi"),
  t("creatorSignup.options.aiTools.klingAi"),
  t("creatorSignup.options.aiTools.lumaDreamMachine"),
  t("creatorSignup.options.aiTools.metaMovieGen"),
  t("creatorSignup.options.aiTools.midjourney"),
  t("creatorSignup.options.aiTools.openAiSora"),
  t("creatorSignup.options.aiTools.pikaLabs"),
  t("creatorSignup.options.aiTools.runwayGen4"),
  t("creatorSignup.options.aiTools.stableDiffusionXl"),
  t("creatorSignup.options.aiTools.stableVideoDiffusion"),
  t("creatorSignup.options.aiTools.synthesia"),
  t("creatorSignup.options.aiTools.vidu"),
  t("creatorSignup.options.aiTools.other"),
];

export default function CreatorSignup() {
  const { t } = useTranslation("auth");
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem("signup_formData");
    return saved
      ? JSON.parse(saved)
      : {
          full_name: "",
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
        };
  });

  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem("signup_step");
    return saved ? parseInt(saved) : 1;
  });

  const [profileId, setProfileId] = useState(() => {
    return localStorage.getItem("signup_profileId") || null;
  });

  // Persist state changes
  React.useEffect(() => {
    localStorage.setItem("signup_formData", JSON.stringify(formData));
  }, [formData]);

  React.useEffect(() => {
    localStorage.setItem("signup_step", step.toString());
  }, [step]);

  React.useEffect(() => {
    if (profileId) {
      localStorage.setItem("signup_profileId", profileId);
    }
  }, [profileId]);

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  // Initial profile creation (Step 1)
  const createInitialProfileMutation = useMutation({
    mutationFn: (data: typeof formData) => {
      return base44.entities.CreatorProfile.create({
        full_name: data.full_name,
        name: data.full_name,
        email: data.email,
        password: data.password,
        instagram_handle: data.instagram_handle || "",
        tiktok_handle: data.tiktok_handle || "",
        youtube_handle: data.youtube_handle || "",
        agency_name: data.agency_name || "",
        status: "waitlist",
        // Default base rate should be empty (0) until creator explicitly sets it.
        base_weekly_price_cents: 0,
        base_monthly_price_cents: 0,
        // Default marketplace visibility ON for new creators.
        public_profile_visible: true,
        visibility: "brands",
      });
    },
    onSuccess: (data: any) => {
      setProfileId(data.id);
      setStep(2);
    },
    onError: (error) => {
      console.error("Error creating initial profile:", error);
      toast({
        title: t("common.error"),
        description: getFriendlyErrorMessage(error, t),
        variant: "destructive",
      });
    },
  });

  // Profile update (Step 2)
  const updateProfileMutation = useMutation({
    mutationFn: async (dataToUpdate: typeof formData) => {
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
        full_name: dataToUpdate.full_name,
        name: dataToUpdate.full_name,
        email: formData.email,
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
      toast({
        title: t("common.error"),
        description: getFriendlyErrorMessage(error, t),
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (step === 1) {
      if (
        !formData.full_name ||
        !formData.email ||
        !formData.password ||
        !formData.confirmPassword
      ) {
        toast({
          title: t("creatorSignup.validation.title"),
          description: t("creatorSignup.validation.requiredFields"),
          variant: "destructive",
        });
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast({
          title: t("creatorSignup.validation.title"),
          description: t("creatorSignup.validation.passwordMismatch"),
          variant: "destructive",
        });
        return;
      }
      // Check that at least one social handle is provided
      if (
        !formData.instagram_handle &&
        !formData.tiktok_handle &&
        !formData.youtube_handle
      ) {
        toast({
          title: t("creatorSignup.validation.title"),
          description: t("creatorSignup.validation.socialRequired"),
          variant: "destructive",
        });
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
    if (step === 2) {
      if (!formData.content_types.length && !formData.content_other) {
        toast({
          title: t("creatorSignup.validation.title"),
          description: t("creatorSignup.validation.contentTypeRequired"),
          variant: "destructive",
        });
        return;
      }
      if (
        formData.content_types.includes(
          t("creatorSignup.options.contentTypes.other"),
        ) &&
        !formData.content_other.trim()
      ) {
        toast({
          title: t("creatorSignup.validation.title"),
          description: t("creatorSignup.validation.contentTypeOtherRequired"),
          variant: "destructive",
        });
        return;
      }
      if (!formData.ai_tools.length && !formData.ai_tools_other) {
        toast({
          title: t("creatorSignup.validation.title"),
          description: t("creatorSignup.validation.aiToolRequired"),
          variant: "destructive",
        });
        return;
      }
      if (
        formData.ai_tools.includes(t("creatorSignup.options.aiTools.other")) &&
        !formData.ai_tools_other.trim()
      ) {
        toast({
          title: t("creatorSignup.validation.title"),
          description: t("creatorSignup.validation.aiToolOtherRequired"),
          variant: "destructive",
        });
        return;
      }
      if (!formData.city || !formData.state) {
        toast({
          title: t("creatorSignup.validation.title"),
          description: t("creatorSignup.validation.locationRequired"),
          variant: "destructive",
        });
        return;
      }
      if (!formData.experience) {
        toast({
          title: t("creatorSignup.validation.title"),
          description: t("creatorSignup.validation.experienceRequired"),
          variant: "destructive",
        });
        return;
      }
      setStep(3);
      return;
    }

    if (!agreedToTerms) {
      toast({
        title: t("creatorSignup.terms.mustAgreeTitle"),
        description: t("creatorSignup.terms.mustAgree"),
        variant: "destructive",
      });
      return;
    }

    if (!formData.content_types.length && !formData.content_other) {
      toast({
        title: t("creatorSignup.validation.title"),
        description: t("creatorSignup.validation.contentTypeRequired"),
        variant: "destructive",
      });
      return;
    }
    if (
      formData.content_types.includes(
        t("creatorSignup.options.contentTypes.other"),
      ) &&
      !formData.content_other.trim()
    ) {
      toast({
        title: t("creatorSignup.validation.title"),
        description: t("creatorSignup.validation.contentTypeOtherRequired"),
        variant: "destructive",
      });
      return;
    }
    if (!formData.ai_tools.length && !formData.ai_tools_other) {
      toast({
        title: t("creatorSignup.validation.title"),
        description: t("creatorSignup.validation.aiToolRequired"),
        variant: "destructive",
      });
      return;
    }
    if (
      formData.ai_tools.includes(t("creatorSignup.options.aiTools.other")) &&
      !formData.ai_tools_other.trim()
    ) {
      toast({
        title: t("creatorSignup.validation.title"),
        description: t("creatorSignup.validation.aiToolOtherRequired"),
        variant: "destructive",
      });
      return;
    }
    if (!formData.city || !formData.state) {
      toast({
        title: t("creatorSignup.validation.title"),
        description: t("creatorSignup.validation.locationRequired"),
        variant: "destructive",
      });
      return;
    }
    if (!formData.experience) {
      toast({
        title: t("creatorSignup.validation.title"),
        description: t("creatorSignup.validation.experienceRequired"),
        variant: "destructive",
      });
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
            {t("creatorSignup.submitted.title")}
          </h1>
          <p className="text-lg text-gray-700 leading-relaxed mb-8">
            {t("creatorSignup.submitted.description")}
          </p>
          <div className="bg-gradient-to-br from-orange-50 to-pink-50 p-6 border-2 border-black rounded-none mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              {t("creatorSignup.submitted.nextTitle")}
            </h3>
            <p className="text-gray-700 leading-relaxed">
              {t("creatorSignup.submitted.nextDescription")}
            </p>
          </div>
          <div className="space-y-4">
            <p className="text-lg font-semibold text-gray-900">
              {t("creatorSignup.submitted.followUpdates")}
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
              <strong>{t("creatorSignup.alert.title")}</strong>{" "}
              {t("creatorSignup.alert.description")}
            </AlertDescription>
          </Alert>
        )}

        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {t("creatorSignup.header.title")}
            </h2>
            <Badge className="bg-orange-100 text-orange-700 border-2 border-black rounded-none">
              {t("creatorSignup.header.step", { step, totalSteps })}
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
                  {t("creatorSignup.basic.title")}
                </h3>
                <p className="text-gray-600">
                  {t("creatorSignup.basic.subtitle")}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="full_name"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    {t("common.fullNameRequired")}
                  </Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    className="border-2 border-gray-300 rounded-none"
                    placeholder={t("common.johnDoe")}
                  />
                </div>

                <div>
                  <Label
                    htmlFor="email"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    {t("common.emailRequired")}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="border-2 border-gray-300 rounded-none"
                    placeholder={t("common.emailPlaceholder")}
                  />
                </div>

                <div>
                  <Label
                    htmlFor="password"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    {t("common.passwordRequired")}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="border-2 border-gray-300 rounded-none pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="confirmPassword"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    {t("common.confirmPasswordRequired")}
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="border-2 border-gray-300 rounded-none pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t-2 border-gray-200">
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    {t("creatorSignup.basic.socialHandles")}{" "}
                    <span className="text-sm text-gray-500 font-normal">
                      {t("creatorSignup.basic.atLeastOneRequired")}
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
                        placeholder={t("common.instagramPlaceholder")}
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
                        placeholder={t("common.instagramPlaceholder")}
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
                        placeholder={t("common.youtubePlaceholder")}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t-2 border-gray-200">
                  <Label
                    htmlFor="agency_name"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    {t("common.agencyOptional")}
                  </Label>
                  <Input
                    id="agency_name"
                    value={formData.agency_name}
                    onChange={(e) =>
                      setFormData({ ...formData, agency_name: e.target.value })
                    }
                    className="border-2 border-gray-300 rounded-none"
                    placeholder={t("common.agencyNamePlaceholder")}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    {t("creatorSignup.basic.agencyHelp")}
                  </p>
                </div>
              </div>

              <Button
                onClick={handleNext}
                disabled={createInitialProfileMutation.isPending}
                className="w-full h-12 bg-gradient-to-r from-[#F18B6A] to-pink-500 hover:from-[#E07A5A] hover:to-pink-600 text-white border-2 border-black rounded-none"
              >
                {createInitialProfileMutation.isPending
                  ? t("common.saving")
                  : t("common.continue")}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {t("creatorSignup.profile.title")}
                </h3>
                <p className="text-gray-600">
                  {t("creatorSignup.profile.subtitle")}
                </p>
              </div>

              <div className="space-y-6 border-b pb-6 border-gray-200">
                <h4 className="text-xl font-bold text-gray-900">
                  {t("creatorSignup.profile.creativeFocus")}
                </h4>
                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-3 block">
                    {t("creatorSignup.profile.contentTypesQuestion")}
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="col-span-1 md:col-span-2 flex items-center space-x-2 p-3 border-2 border-black bg-gray-50 rounded-none mb-2">
                      <Checkbox
                        id="select_all_content"
                        checked={getContentTypes(t)
                          .filter((t) => t !== "Other")
                          .every((type) =>
                            formData.content_types.includes(type),
                          )}
                        onCheckedChange={() =>
                          toggleSelectAll("content_types", getContentTypes(t))
                        }
                        className="border-2 border-gray-900"
                      />
                      <label
                        htmlFor="select_all_content"
                        className="text-sm font-bold text-gray-900 cursor-pointer flex-1"
                      >
                        {t("common.selectAll")}
                      </label>
                    </div>
                    {getContentTypes(t).map((type) => (
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
                      placeholder={t("common.contentTypePlaceholder")}
                    />
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-3 block">
                    {t("creatorSignup.profile.aiToolsQuestion")}
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
                    <div className="col-span-1 md:col-span-2 flex items-center space-x-2 p-3 border-2 border-black bg-gray-50 rounded-none mb-2">
                      <Checkbox
                        id="select_all_ai_tools"
                        checked={getAiTools(t).every((tool) =>
                          formData.ai_tools.includes(tool),
                        )}
                        onCheckedChange={() =>
                          toggleSelectAll("ai_tools", getAiTools(t))
                        }
                        className="border-2 border-gray-900"
                      />
                      <label
                        htmlFor="select_all_ai_tools"
                        className="text-sm font-bold text-gray-900 cursor-pointer flex-1"
                      >
                        {t("common.selectAll")}
                      </label>
                    </div>
                    {getAiTools(t).map((tool) => (
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
                      placeholder={t("common.aiToolPlaceholder")}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-6 border-b pb-6 border-gray-200">
                <h4 className="text-xl font-bold text-gray-900">
                  {t("creatorSignup.profile.locationExperience")}
                </h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label
                        htmlFor="city"
                        className="text-sm font-medium text-gray-700 mb-2 block"
                      >
                        {t("common.cityRequired")}
                      </Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) =>
                          setFormData({ ...formData, city: e.target.value })
                        }
                        className="border-2 border-gray-300 rounded-none"
                        placeholder={t("common.cityPlaceholder")}
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="state"
                        className="text-sm font-medium text-gray-700 mb-2 block"
                      >
                        {t("common.stateCountryRequired")}
                      </Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) =>
                          setFormData({ ...formData, state: e.target.value })
                        }
                        className="border-2 border-gray-300 rounded-none"
                        placeholder={t("common.statePlaceholder")}
                      />
                    </div>
                  </div>

                  <div>
                    <Label
                      htmlFor="experience"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      {t("common.experienceRequired")}
                    </Label>
                    <Select
                      value={formData.experience}
                      onValueChange={(value) =>
                        setFormData({ ...formData, experience: value })
                      }
                    >
                      <SelectTrigger className="border-2 border-gray-300 rounded-none">
                        <SelectValue
                          placeholder={t(
                            "creatorSignup.profile.selectExperience",
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="less_than_1">
                          {t("creatorSignup.profile.experience.lessThan1")}
                        </SelectItem>
                        <SelectItem value="1_2">
                          {t("creatorSignup.profile.experience.oneToTwo")}
                        </SelectItem>
                        <SelectItem value="3_5">
                          {t("creatorSignup.profile.experience.threeToFive")}
                        </SelectItem>
                        <SelectItem value="5_plus">
                          {t("creatorSignup.profile.experience.fivePlus")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-6 border-b pb-6 border-gray-200">
                <h4 className="text-xl font-bold text-gray-900">
                  {t("creatorSignup.profile.portfolioSocial")}
                </h4>
                <p className="text-gray-600">
                  {t("creatorSignup.profile.portfolioSocialSubtitle")}
                </p>
                <div className="space-y-4">
                  <div>
                    <Label
                      htmlFor="portfolio_url"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      {t("common.portfolioUrl")}
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
                      placeholder={t("common.portfolioPlaceholder")}
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="social_url"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      {t("common.socialMediaUrl")}
                    </Label>
                    <Input
                      id="social_url"
                      type="url"
                      value={formData.social_url}
                      onChange={(e) =>
                        setFormData({ ...formData, social_url: e.target.value })
                      }
                      className="border-2 border-gray-300 rounded-none"
                      placeholder={t("common.socialProfilePlaceholder")}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-xl font-bold text-gray-900">
                  {t("creatorSignup.profile.uploadPhoto")}
                </h4>
                <p className="text-gray-600">
                  {t("creatorSignup.profile.uploadPhotoSubtitle")}
                </p>
                <div className="space-y-4">
                  <div>
                    <Label
                      htmlFor="profilePhotoInput"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      {t("common.profilePhotoOptional")}
                    </Label>
                    <p className="text-sm text-gray-500 mb-3">
                      {t("creatorSignup.profile.photoRequirements")}
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
                            : t("creatorSignup.profile.clickToUpload")}
                        </p>
                        <p className="text-sm text-gray-500">
                          {t("creatorSignup.profile.dragDrop")}
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
                  {t("common.back")}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={updateProfileMutation.isPending}
                  className="flex-1 h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-2 border-black rounded-none"
                >
                  {updateProfileMutation.isPending
                    ? t("creatorSignup.terms.submitting")
                    : t("creatorSignup.profile.continueToTerms")}
                  <CheckCircle2 className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {t("creatorSignup.terms.title")}
                </h3>
                <p className="text-gray-600">
                  {t("creatorSignup.terms.subtitle")}
                </p>
              </div>

              <ScrollArea className="h-[600px] border-2 border-gray-200 rounded-none p-4 bg-gray-50">
                <CreatorTermsContent />
              </ScrollArea>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="border-2 border-black rounded-none"
                  onClick={() => {
                    window.open(
                      "/creator-talent-terms-and-conditions.html",
                      "_blank",
                    );
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {t("creatorSignup.terms.download")}
                </Button>
              </div>

              <div className="flex items-start space-x-3 p-4 border-2 border-black bg-gray-50 rounded-none">
                <Checkbox
                  id="creator-agree-terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) =>
                    setAgreedToTerms(checked === true)
                  }
                  className="border-2 border-gray-900 mt-0.5"
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="creator-agree-terms"
                    className="text-sm text-gray-700 cursor-pointer leading-relaxed"
                  >
                    {t("creatorSignup.terms.agreeTo")}{" "}
                    <a
                      href="https://likelee.ai/privacypolicy"
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold underline text-indigo-600"
                    >
                      {t("creatorSignup.terms.policyLink")}
                    </a>{" "}
                    {t("creatorSignup.terms.andTerms")}
                  </label>
                  <p className="text-sm text-gray-500">
                    {t("creatorSignup.terms.mustAgree")}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => setStep(2)}
                  variant="outline"
                  className="flex-1 h-12 border-2 border-black rounded-none"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  {t("common.back")}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!agreedToTerms || updateProfileMutation.isPending}
                  className="flex-1 h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-2 border-black rounded-none"
                >
                  {updateProfileMutation.isPending
                    ? t("creatorSignup.terms.submitting")
                    : t("creatorSignup.terms.completeRegistration")}
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
