import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
// Temporary comment to trigger TypeScript re-evaluation
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle2, ArrowRight, ArrowLeft, Upload } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import {
  createOrganizationKycSession,
  getOrganizationKycStatus,
  registerOrganization,
  updateOrganizationProfile,
} from "@/api/functions";

const getProductionTypes = (t: any) => [
  t("organizationSignup.options.productionTypes.film"),
  t("organizationSignup.options.productionTypes.tv"),
  t("organizationSignup.options.productionTypes.commercial"),
  t("organizationSignup.options.productionTypes.musicVideo"),
  t("organizationSignup.options.productionTypes.animation"),
  t("organizationSignup.options.productionTypes.mixedAiLive"),
];

const getServices = (t: any) => [
  t("organizationSignup.options.services.socialMediaManagement"),
  t("organizationSignup.options.services.influencerCampaigns"),
  t("organizationSignup.options.services.videoAds"),
  t("organizationSignup.options.services.ugcProduction"),
  t("organizationSignup.options.services.contentCreation"),
  t("organizationSignup.options.services.brandStrategy"),
];

const getCampaignTypes = (t: any) => [
  t("organizationSignup.options.campaignTypes.fashion"),
  t("organizationSignup.options.campaignTypes.music"),
  t("organizationSignup.options.campaignTypes.fitness"),
  t("organizationSignup.options.campaignTypes.lifestyle"),
  t("organizationSignup.options.campaignTypes.beauty"),
  t("organizationSignup.options.campaignTypes.sports"),
  t("organizationSignup.options.campaignTypes.entertainment"),
];

const getPrimaryGoals = (t: any) => [
  t("organizationSignup.options.primaryGoals.runAdCampaigns"),
  t("organizationSignup.options.primaryGoals.findBrandAmbassadors"),
  t("organizationSignup.options.primaryGoals.licenseAiReadyFaces"),
];

const getRolesNeeded = (t: any) => [
  t("organizationSignup.options.rolesNeeded.talentFacesVoices"),
  t("organizationSignup.options.rolesNeeded.postproductionAiGeneration"),
  t("organizationSignup.options.rolesNeeded.creativeCollaboration"),
];

const getOpenToAiOptions = (t: any) => [
  t("organizationSignup.options.openToAiOptions.aiRecreation"),
  t("organizationSignup.options.openToAiOptions.likenessProtectionOnly"),
  t("organizationSignup.options.openToAiOptions.variesByTalent"),
];

const industries = [
  "Fashion",
  "Beauty",
  "Technology",
  "Automotive",
  "Food & Beverage",
  "Travel",
  "Entertainment",
  "Health & Wellness",
  "Finance",
  "Other",
];

export default function OrganizationSignup() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [orgType, setOrgType] = useState("");
  const [submitted, setSubmitted] = useState(false); // New state for submission status
  const [profileId, setProfileId] = useState<string | null>(null); // Add profileId state
  const [kycSessionUrl, setKycSessionUrl] = useState<string | null>(null); // State for KYC session URL
  const [formData, setFormData] = useState({
    // Step 1 - Basic
    email: "",
    password: "",
    confirmPassword: "",
    organization_name: "",
    contact_name: "",
    contact_title: "",
    website: "",
    phone_number: "",
    // Step 2 - Type specific
    industry: "",
    primary_goal: [],
    geographic_target: "",
    provide_creators: "", // Changed to string to match RadioGroup value type, used for brand_company and marketing_agency
    production_type: "",
    budget_range: "",
    creates_for: "",
    uses_ai: "",
    roles_needed: [],
    client_count: "",
    campaign_budget: "",
    services_offered: [],
    handle_contracts: "",
    talent_count: "",
    licenses_likeness: "",
    open_to_ai: [],
    campaign_types: [],
    bulk_onboard: "",
  });

  const totalSteps = 2;
  const progress = (step / totalSteps) * 100;

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get("type");
    if (type) setOrgType(type);
  }, []);

  // Color schemes for each organization type
  const getColorScheme = () => {
    const schemes = {
      brand_company: {
        gradient: "from-amber-50 via-yellow-50 to-orange-50",
        primary: "from-[#F7B750] to-[#FAD54C]",
        button: "bg-[#F7B750] hover:bg-[#E6A640]",
        badge: "bg-amber-100 text-amber-700",
      },
      marketing_agency: {
        gradient: "from-cyan-50 via-teal-50 to-blue-50",
        primary: "from-[#32C8D1] to-teal-500",
        button: "bg-[#32C8D1] hover:bg-[#2AB8C1]",
        badge: "bg-cyan-100 text-cyan-700",
      },
      talent_agency: {
        gradient: "from-indigo-50 via-violet-50 to-purple-50",
        primary: "from-indigo-600 to-purple-600",
        button: "bg-indigo-600 hover:bg-indigo-700",
        badge: "bg-indigo-100 text-indigo-700",
      },
      production_studio: {
        gradient: "from-slate-50 via-gray-50 to-zinc-50",
        primary: "from-slate-700 to-gray-800",
        button: "bg-slate-700 hover:bg-slate-800",
        badge: "bg-slate-100 text-slate-700",
      },
    };
    return schemes[orgType] || schemes.brand_company;
  };

  const colors = getColorScheme();

  // New mutation for initial profile creation (Step 1)
  const createInitialProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        email: data.email,
        password: data.password,
        organization_name: data.organization_name,
        contact_name: data.contact_name || undefined,
        contact_title: data.contact_title || undefined,
        organization_type: orgType || undefined,
        website: data.website || undefined,
        phone_number: data.phone_number || undefined,
      };
      return await registerOrganization(payload);
    },
    onSuccess: async (resp: any) => {
      // Postgrest usually returns an array of inserted rows; handle both array/object
      const created = Array.isArray(resp) ? resp[0] : resp;
      const newId = created?.id;
      setProfileId(newId);
      // Move to Step 2; KYC/Liveness will happen in Step 3
      setStep(2);
    },
    onError: (error) => {
      console.error("Error creating initial profile:", error);
      alert("Failed to create profile. Please try again."); // Modified alert message
    },
  });

  // Updated mutation for profile updates (Step 2)
  const updateProfileMutation = useMutation({
    mutationFn: (data: typeof formData) => {
      if (!profileId) {
        throw new Error("Profile ID not found for update."); // Modified error message
      }
      return updateOrganizationProfile(
        profileId,
        {
          // Step 2 specific fields
          industry: data.industry,
          primary_goal: data.primary_goal,
          geographic_target: data.geographic_target,
          production_type: data.production_type,
          budget_range: data.budget_range,
          uses_ai: data.uses_ai,
          creates_for: data.creates_for,
          roles_needed: data.roles_needed,
          client_count: data.client_count,
          campaign_budget: data.campaign_budget,
          services_offered: data.services_offered,
          handle_contracts: data.handle_contracts,
          talent_count: data.talent_count,
          licenses_likeness: data.licenses_likeness,
          open_to_ai: data.open_to_ai,
          campaign_types: data.campaign_types,
          bulk_onboard: data.bulk_onboard,
          provide_creators: data.provide_creators,
          status: "waitlist",
        },
        user?.id,
      );
    },
    onSuccess: () => {
      // Move to Success Page
      setSubmitted(true);
    },
    onError: (error) => {
      console.error("Error updating profile:", error);
      // Optionally handle error, e.g., show a toast notification
      alert("Failed to update profile. Please try again.");
    },
  });

  const handleNext = () => {
    // Basic validation for Step 1 before proceeding
    if (step === 1) {
      if (
        !formData.email ||
        !formData.password ||
        !formData.confirmPassword ||
        !formData.organization_name ||
        !formData.contact_name
      ) {
        toast({
          title: t("organizationSignup.missingFieldsTitle"),
          description: t("organizationSignup.missingFieldsDescription"),
          variant: "destructive",
        });
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast({
          title: t("organizationSignup.passwordMismatchTitle"),
          description: t("organizationSignup.passwordMismatchDescription"),
          variant: "destructive",
        });
        return;
      }
      // Create initial profile and move to step 2
      createInitialProfileMutation.mutate(formData);
      return; // Prevent further execution of handleNext
    }
    // This part should technically not be reached in a 2-step process if step 1 calls mutation
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    // Submit the full formData to update the profile
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

  const toggleSelectAll = (field: string, allOptions: string[]) => {
    const currentSelection = formData[
      field as keyof typeof formData
    ] as string[];
    const isAllSelected = allOptions.every((option) =>
      currentSelection.includes(option),
    );

    setFormData((prev) => ({
      ...prev,
      [field]: isAllSelected ? [] : [...allOptions],
    }));
  };

  const getOrgTypeTitle = () => {
    const titles = {
      brand_company: t("organizationSignup.orgType.brandCompany"),
      production_studio: t("organizationSignup.orgType.productionStudio"),
      marketing_agency: t("organizationSignup.orgType.marketingAgency"),
      talent_agency: t("organizationSignup.orgType.talentAgency"),
    };
    return titles[orgType] || "Organization";
  };

  // Fetch KYC status in Step 3 when profileId is available
  const {
    data: kycStatusData,
    isLoading: isKycStatusLoading,
    refetch: refetchKycStatus,
  } = useQuery({
    queryKey: ["organizationKycStatus", profileId],
    queryFn: () => getOrganizationKycStatus(profileId!),
    enabled: !!profileId && submitted,
  });

  // Render success message if form was submitted successfully
  if (submitted) {
    const kycStatus = kycStatusData?.kyc_status;
    const kycSessionId = kycStatusData?.kyc_session_id;

    // Handlers for Step 3 (Verification)
    const startOrgKyc = async () => {
      if (!profileId) {
        toast({
          title: t("organizationSignup.profileNotFoundTitle"),
          description: t("organizationSignup.profileNotFoundDescription"),
          variant: "destructive",
        });
        return;
      }
      try {
        const session = await createOrganizationKycSession({
          organization_id: profileId,
        });
        const url =
          (session as any)?.session_url || (session as any)?.data?.session_url;
        if (url) {
          window.location.href = url;
        } else {
          toast({
            title: "Error",
            description: t("organizationSignup.kycError"),
            variant: "destructive",
          });
        }
      } catch (e) {
        console.error("Error starting organization KYC", e);
        toast({
          title: "Error",
          description: t("organizationSignup.kycFail"),
          variant: "destructive",
        });
      }
    };

    return (
      <div
        className={`min-h-screen bg-gradient-to-br ${colors.gradient} py-16 px-6 flex items-center justify-center`}
      >
        <Card className="max-w-2xl w-full p-12 bg-white border-2 border-black shadow-2xl rounded-none text-center">
          <div
            className={`w-20 h-20 bg-gradient-to-r ${colors.primary} border-2 border-black rounded-full flex items-center justify-center mx-auto mb-8`}
          >
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {kycStatus === "approved"
              ? t("organizationSignup.kycVerifiedTitle")
              : t("organizationSignup.onboardingInProgressTitle")}
          </h1>
          <p className="text-lg text-gray-700 leading-relaxed mb-8">
            {kycStatus === "approved"
              ? t("organizationSignup.kycVerifiedDescription")
              : t("organizationSignup.onboardingInProgressDescription")}
          </p>
          {kycStatus !== "approved" && (
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-6 border-2 border-black rounded-none mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {t("organizationSignup.whatsNext")}
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {kycSessionUrl
                  ? t("organizationSignup.kycRedirect")
                  : t("organizationSignup.calendarLink")}
              </p>
              {kycSessionUrl && (
                <Button
                  onClick={() => (window.location.href = kycSessionUrl)}
                  className={`mt-4 w-full h-12 ${colors.button} text-white border-2 border-black rounded-none`}
                >
                  {t("organizationSignup.completeKycButton")}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-gradient-to-br ${colors.gradient} py-12 px-6`}
    >
      <div className="max-w-3xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {t("organizationSignup.signUpAs")} {getOrgTypeTitle()}
              </h2>
            </div>
            <Badge
              variant="default"
              className={`${colors.badge} border-2 border-black rounded-none`}
            >
              {t("organizationSignup.step")} {step} {t("organizationSignup.of")}{" "}
              {totalSteps}
            </Badge>
          </div>
          <div className="w-full h-3 bg-gray-200 border-2 border-black">
            <div
              className={`h-full bg-gradient-to-r ${colors.primary} transition-all duration-500`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <Card className="p-8 bg-white border-2 border-black shadow-xl rounded-none">
          {/* Step 1: Basic Company Sign-Up */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {t("organizationSignup.companyInfo")}
                </h3>
                <p className="text-gray-600">
                  {t("organizationSignup.startWithBasics")}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="email"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    {t("organizationSignup.companyEmail")}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="border-2 border-gray-300 rounded-none"
                    placeholder="company@example.com"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="password"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    {t("common.passwordRequired")}
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
                    {t("common.confirmPasswordRequired")}
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

                <div>
                  <Label
                    htmlFor="organization_name"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    {t("organizationSignup.organizationName")}
                  </Label>
                  <Input
                    id="organization_name"
                    value={formData.organization_name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        organization_name: e.target.value,
                      })
                    }
                    className="border-2 border-gray-300 rounded-none"
                    placeholder={t("common.companyNamePlaceholder")}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="contact_name"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      {t("organizationSignup.contactName")}
                    </Label>
                    <Input
                      id="contact_name"
                      value={formData.contact_name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contact_name: e.target.value,
                        })
                      }
                      className="border-2 border-gray-300 rounded-none"
                      placeholder={t("common.johnDoe")}
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="contact_title"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      {t("organizationSignup.contactTitle")}
                    </Label>
                    <Input
                      id="contact_title"
                      value={formData.contact_title}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contact_title: e.target.value,
                        })
                      }
                      className="border-2 border-gray-300 rounded-none"
                      placeholder={t(
                        "organizationSignup.contactTitlePlaceholder",
                      )}
                    />
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="website"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    {t("organizationSignup.website")}
                  </Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) =>
                      setFormData({ ...formData, website: e.target.value })
                    }
                    className="border-2 border-gray-300 rounded-none"
                    placeholder={t("common.websitePlaceholder")}
                  />
                </div>

                <div>
                  <Label
                    htmlFor="phone_number"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    {t("organizationSignup.phoneNumber")}
                  </Label>
                  <Input
                    id="phone_number"
                    value={formData.phone_number}
                    onChange={(e) =>
                      setFormData({ ...formData, phone_number: e.target.value })
                    }
                    className="border-2 border-gray-300 rounded-none"
                    placeholder={t("common.phonePlaceholder")}
                  />
                </div>
              </div>

              <Button
                onClick={handleNext}
                disabled={createInitialProfileMutation.isPending} // Disable while saving initial profile
                className={`w-full h-12 ${colors.button} text-white border-2 border-black rounded-none`}
              >
                {createInitialProfileMutation.isPending
                  ? t("common.saving")
                  : t("common.continue")}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}

          {/* Step 2: Type-Specific Details */}
          {step === 2 && orgType === "brand_company" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {t("organizationSignup.brandDetails.title")}
                </h3>
                <p className="text-gray-600">
                  {t("organizationSignup.brandDetails.subtitle")}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="industry"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    {t("organizationSignup.brandDetails.industry")}
                  </Label>
                  <Select
                    value={formData.industry}
                    onValueChange={(value) =>
                      setFormData({ ...formData, industry: value })
                    }
                  >
                    <SelectTrigger className="border-2 border-gray-300 rounded-none">
                      <SelectValue
                        placeholder={t(
                          "organizationSignup.brandDetails.selectIndustry",
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map((industry) => (
                        <SelectItem
                          key={industry}
                          value={industry.toLowerCase()}
                        >
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-3 block">
                    {t("organizationSignup.brandDetails.primaryGoal")}
                  </Label>
                  <div className="space-y-3">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 p-3 border-2 border-black bg-gray-50 rounded-none mb-2">
                        <Checkbox
                          id="select_all_goals"
                          checked={getPrimaryGoals(t).every((goal) =>
                            formData.primary_goal.includes(goal),
                          )}
                          onCheckedChange={() =>
                            toggleSelectAll("primary_goal", getPrimaryGoals(t))
                          }
                          className="border-2 border-gray-900"
                        />
                        <label
                          htmlFor="select_all_goals"
                          className="text-sm font-bold text-gray-900 cursor-pointer flex-1"
                        >
                          {t("organizationSignup.selectAll")}
                        </label>
                      </div>
                      {getPrimaryGoals(t).map((goal) => (
                        <div
                          key={goal}
                          className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50"
                        >
                          <Checkbox
                            id={goal}
                            checked={formData.primary_goal.includes(goal)}
                            onCheckedChange={() =>
                              toggleArrayItem("primary_goal", goal)
                            }
                            className="border-2 border-gray-400"
                          />
                          <label
                            htmlFor={goal}
                            className="text-sm text-gray-700 cursor-pointer flex-1"
                          >
                            {goal}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="geographic_target"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    {t("organizationSignup.brandDetails.geographicTarget")}
                  </Label>
                  <Input
                    id="geographic_target"
                    value={formData.geographic_target}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        geographic_target: e.target.value,
                      })
                    }
                    className="border-2 border-gray-300 rounded-none"
                    placeholder={t(
                      "organizationSignup.brandDetails.geographicTargetPlaceholder",
                    )}
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    {t(
                      "organizationSignup.brandDetails.provideCreatorsQuestion",
                    )}
                  </Label>
                  <RadioGroup
                    value={formData.provide_creators}
                    onValueChange={(value) =>
                      setFormData({ ...formData, provide_creators: value })
                    }
                  >
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50">
                        <RadioGroupItem
                          value="provide"
                          id="provide"
                          className="border-2 border-gray-400"
                        />
                        <Label
                          htmlFor="provide"
                          className="text-sm text-gray-700 cursor-pointer flex-1"
                        >
                          {t("organizationSignup.brandDetails.provideCreators")}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50">
                        <RadioGroupItem
                          value="upload"
                          id="upload"
                          className="border-2 border-gray-400"
                        />
                        <Label
                          htmlFor="upload"
                          className="text-sm text-gray-700 cursor-pointer flex-1"
                        >
                          {t("organizationSignup.brandDetails.uploadOwnAssets")}
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
                  className="w-1/2 h-12 border-2 border-black rounded-none"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  {t("common.back")}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={updateProfileMutation.isPending}
                  className={`w-1/2 h-12 ${colors.button} text-white border-2 border-black rounded-none`}
                >
                  {updateProfileMutation.isPending
                    ? t("common.submitting")
                    : t("common.submit")}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Production Studio */}
          {step === 2 && orgType === "production_studio" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Studio Details
                </h3>
                <p className="text-gray-600">
                  Tell us about your production work
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="production_type"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    Primary Production Type *
                  </Label>
                  <Select
                    value={formData.production_type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, production_type: value })
                    }
                  >
                    <SelectTrigger className="border-2 border-gray-300 rounded-none">
                      <SelectValue
                        placeholder={t(
                          "organizationSignup.productionStudio.selectProductionType",
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {getProductionTypes(t).map((type) => (
                        <SelectItem key={type} value={type.toLowerCase()}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label
                    htmlFor="budget_range"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    Typical Production Budget Range
                  </Label>
                  <Select
                    value={formData.budget_range}
                    onValueChange={(value) =>
                      setFormData({ ...formData, budget_range: value })
                    }
                  >
                    <SelectTrigger className="border-2 border-gray-300 rounded-none">
                      <SelectValue
                        placeholder={t(
                          "organizationSignup.productionStudio.selectBudgetRange",
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="under_10k">
                        {t(
                          "organizationSignup.productionStudio.budgetRangeUnder10k",
                        )}
                      </SelectItem>
                      <SelectItem value="10k_50k">
                        {t(
                          "organizationSignup.productionStudio.budgetRange10k50k",
                        )}
                      </SelectItem>
                      <SelectItem value="50k_250k">
                        {t(
                          "organizationSignup.productionStudio.budgetRange50k250k",
                        )}
                      </SelectItem>
                      <SelectItem value="250k_1m">
                        {t(
                          "organizationSignup.productionStudio.budgetRange250k1m",
                        )}
                      </SelectItem>
                      <SelectItem value="over_1m">
                        {t(
                          "organizationSignup.productionStudio.budgetRangeOver1m",
                        )}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    Do you create for clients or your own IP?
                  </Label>
                  <RadioGroup
                    value={formData.creates_for}
                    onValueChange={(value) =>
                      setFormData({ ...formData, creates_for: value })
                    }
                  >
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50">
                        <RadioGroupItem
                          value="clients"
                          id="clients"
                          className="border-2 border-gray-400"
                        />
                        <Label
                          htmlFor="clients"
                          className="text-sm text-gray-700 cursor-pointer flex-1"
                        >
                          For clients
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50">
                        <RadioGroupItem
                          value="own_ip"
                          id="own_ip"
                          className="border-2 border-gray-400"
                        />
                        <Label
                          htmlFor="own_ip"
                          className="text-sm text-gray-700 cursor-pointer flex-1"
                        >
                          Own IP
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50">
                        <RadioGroupItem
                          value="both"
                          id="both"
                          className="border-2 border-gray-400"
                        />
                        <Label
                          htmlFor="both"
                          className="text-sm text-gray-700 cursor-pointer flex-1"
                        >
                          Both
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    Do you already use AI in your production workflow?
                  </Label>
                  <RadioGroup
                    value={formData.uses_ai}
                    onValueChange={(value) =>
                      setFormData({ ...formData, uses_ai: value })
                    }
                  >
                    <div className="space-y-2">
                      {["Yes", "No", "Exploring"].map((option) => (
                        <div
                          key={option}
                          className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50"
                        >
                          <RadioGroupItem
                            value={option.toLowerCase()}
                            id={option}
                            className="border-2 border-gray-400"
                          />
                          <Label
                            htmlFor={option}
                            className="text-sm text-gray-700 cursor-pointer flex-1"
                          >
                            {option}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-3 block">
                    What roles are you looking to fill through Likelee?
                  </Label>
                  <div className="space-y-3">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 p-3 border-2 border-black bg-gray-50 rounded-none mb-2">
                        <Checkbox
                          id="select_all_roles"
                          checked={getRolesNeeded(t).every((role) =>
                            formData.roles_needed.includes(role),
                          )}
                          onCheckedChange={() =>
                            toggleSelectAll("roles_needed", getRolesNeeded(t))
                          }
                          className="border-2 border-gray-900"
                        />
                        <label
                          htmlFor="select_all_roles"
                          className="text-sm font-bold text-gray-900 cursor-pointer flex-1"
                        >
                          Select All
                        </label>
                      </div>
                      {getRolesNeeded(t).map((role) => (
                        <div
                          key={role}
                          className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50"
                        >
                          <Checkbox
                            id={role}
                            checked={formData.roles_needed.includes(role)}
                            onCheckedChange={() =>
                              toggleArrayItem("roles_needed", role)
                            }
                            className="border-2 border-gray-400"
                          />
                          <label
                            htmlFor={role}
                            className="text-sm text-gray-700 cursor-pointer flex-1"
                          >
                            {role}
                          </label>
                        </div>
                      ))}
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
                  disabled={updateProfileMutation.isPending} // Disable while submitting
                  className={`flex-1 h-12 ${colors.button} text-white border-2 border-black rounded-none`}
                >
                  {updateProfileMutation.isPending
                    ? "Submitting..."
                    : "Complete Sign Up"}{" "}
                  {/* Dynamic text */}
                  <CheckCircle2 className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Marketing Agency */}
          {step === 2 && orgType === "marketing_agency" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Agency Details
                </h3>
                <p className="text-gray-600">Tell us about your agency</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="client_count"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    Number of Client Brands Currently Managed
                  </Label>
                  <Input
                    id="client_count"
                    type="number"
                    value={formData.client_count}
                    onChange={(e) =>
                      setFormData({ ...formData, client_count: e.target.value })
                    }
                    className="border-2 border-gray-300 rounded-none"
                    placeholder="e.g., 5"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="campaign_budget"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    Typical Campaign Budget Per Brand
                  </Label>
                  <Select
                    value={formData.campaign_budget}
                    onValueChange={(value) =>
                      setFormData({ ...formData, campaign_budget: value })
                    }
                  >
                    <SelectTrigger className="border-2 border-gray-300 rounded-none">
                      <SelectValue placeholder="Select budget range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="under_5k">Under $5,000</SelectItem>
                      <SelectItem value="5k_25k">$5,000 - $25,000</SelectItem>
                      <SelectItem value="25k_100k">
                        $25,000 - $100,000
                      </SelectItem>
                      <SelectItem value="100k_500k">
                        $100,000 - $500,000
                      </SelectItem>
                      <SelectItem value="over_500k">Over $500,000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-3 block">
                    Primary Services Offered
                  </Label>
                  <div className="space-y-3">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 p-3 border-2 border-black bg-gray-50 rounded-none mb-2">
                        <Checkbox
                          id="select_all_services"
                          checked={getServices(t).every((service) =>
                            formData.services_offered.includes(service),
                          )}
                          onCheckedChange={() =>
                            toggleSelectAll("services_offered", getServices(t))
                          }
                          className="border-2 border-gray-900"
                        />
                        <label
                          htmlFor="select_all_services"
                          className="text-sm font-bold text-gray-900 cursor-pointer flex-1"
                        >
                          Select All
                        </label>
                      </div>
                      {getServices(t).map((service) => (
                        <div
                          key={service}
                          className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50"
                        >
                          <Checkbox
                            id={service}
                            checked={formData.services_offered.includes(
                              service,
                            )}
                            onCheckedChange={() =>
                              toggleArrayItem("services_offered", service)
                            }
                            className="border-2 border-gray-400"
                          />
                          <label
                            htmlFor={service}
                            className="text-sm text-gray-700 cursor-pointer flex-1"
                          >
                            {service}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    Would you like Likelee to match you with creators or just
                    provide licensing tools?
                  </Label>
                  <RadioGroup
                    value={formData.provide_creators}
                    onValueChange={(value) =>
                      setFormData({ ...formData, provide_creators: value })
                    }
                  >
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50">
                        <RadioGroupItem
                          value="match"
                          id="match"
                          className="border-2 border-gray-400"
                        />
                        <Label
                          htmlFor="match"
                          className="text-sm text-gray-700 cursor-pointer flex-1"
                        >
                          Match me with creators
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50">
                        <RadioGroupItem
                          value="tools"
                          id="tools"
                          className="border-2 border-gray-400"
                        />
                        <Label
                          htmlFor="tools"
                          className="text-sm text-gray-700 cursor-pointer flex-1"
                        >
                          Just provide licensing tools
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    Do you handle contracts and royalties for clients or want
                    Likelee to automate that?
                  </Label>
                  <RadioGroup
                    value={formData.handle_contracts}
                    onValueChange={(value) =>
                      setFormData({ ...formData, handle_contracts: value })
                    }
                  >
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50">
                        <RadioGroupItem
                          value="handle"
                          id="handle"
                          className="border-2 border-gray-400"
                        />
                        <Label
                          htmlFor="handle"
                          className="text-sm text-gray-700 cursor-pointer flex-1"
                        >
                          We handle it
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50">
                        <RadioGroupItem
                          value="automate"
                          id="automate"
                          className="border-2 border-gray-400"
                        />
                        <Label
                          htmlFor="automate"
                          className="text-sm text-gray-700 cursor-pointer flex-1"
                        >
                          Automate with Likelee
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
                  disabled={updateProfileMutation.isPending} // Disable while submitting
                  className={`flex-1 h-12 ${colors.button} text-white border-2 border-black rounded-none`}
                >
                  {updateProfileMutation.isPending
                    ? "Submitting..."
                    : "Complete Sign Up"}{" "}
                  {/* Dynamic text */}
                  <CheckCircle2 className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Talent Agency */}
          {step === 2 && orgType === "talent_agency" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Agency Details
                </h3>
                <p className="text-gray-600">
                  Tell us about your talent roster
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="talent_count"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    Number of Models or Talent Represented
                  </Label>
                  <Input
                    id="talent_count"
                    type="number"
                    value={formData.talent_count}
                    onChange={(e) =>
                      setFormData({ ...formData, talent_count: e.target.value })
                    }
                    className="border-2 border-gray-300 rounded-none"
                    placeholder="e.g., 25"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    Do you currently license your models' likeness?
                  </Label>
                  <RadioGroup
                    value={formData.licenses_likeness}
                    onValueChange={(value) =>
                      setFormData({ ...formData, licenses_likeness: value })
                    }
                  >
                    <div className="space-y-2">
                      {["Yes", "No"].map((option) => (
                        <div
                          key={option}
                          className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50"
                        >
                          <RadioGroupItem
                            value={option.toLowerCase()}
                            id={`license_${option}`}
                            className="border-2 border-gray-400"
                          />
                          <Label
                            htmlFor={`license_${option}`}
                            className="text-sm text-gray-700 cursor-pointer flex-1"
                          >
                            {option}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-3 block">
                    Are your talents open to AI recreation or only likeness
                    protection?
                  </Label>
                  <div className="space-y-3">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 p-3 border-2 border-black bg-gray-50 rounded-none mb-2">
                        <Checkbox
                          id="select_all_open_to_ai"
                          checked={getOpenToAiOptions(t).every((option) =>
                            formData.open_to_ai.includes(option),
                          )}
                          onCheckedChange={() =>
                            toggleSelectAll("open_to_ai", getOpenToAiOptions(t))
                          }
                          className="border-2 border-gray-900"
                        />
                        <label
                          htmlFor="select_all_open_to_ai"
                          className="text-sm font-bold text-gray-900 cursor-pointer flex-1"
                        >
                          Select All
                        </label>
                      </div>
                      {getOpenToAiOptions(t).map((option) => (
                        <div
                          key={option}
                          className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50"
                        >
                          <Checkbox
                            id={option}
                            checked={formData.open_to_ai.includes(option)}
                            onCheckedChange={() =>
                              toggleArrayItem("open_to_ai", option)
                            }
                            className="border-2 border-gray-400"
                          />
                          <label
                            htmlFor={option}
                            className="text-sm text-gray-700 cursor-pointer flex-1"
                          >
                            {option}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-3 block">
                    What types of campaigns or collaborations do you pursue
                    most?
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 flex items-center space-x-2 p-3 border-2 border-black bg-gray-50 rounded-none mb-2">
                      <Checkbox
                        id="select_all_campaign_types"
                        checked={getCampaignTypes(t).every((type) =>
                          formData.campaign_types.includes(type),
                        )}
                        onCheckedChange={() =>
                          toggleSelectAll("campaign_types", getCampaignTypes(t))
                        }
                        className="border-2 border-gray-900"
                      />
                      <label
                        htmlFor="select_all_campaign_types"
                        className="text-sm font-bold text-gray-900 cursor-pointer flex-1"
                      >
                        Select All
                      </label>
                    </div>
                    {getCampaignTypes(t).map((type) => (
                      <div
                        key={type}
                        className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50"
                      >
                        <Checkbox
                          id={type}
                          checked={formData.campaign_types.includes(type)}
                          onCheckedChange={() =>
                            toggleArrayItem("campaign_types", type)
                          }
                          className="border-2 border-gray-400"
                        />
                        <label
                          htmlFor={type}
                          className="text-sm text-gray-700 cursor-pointer flex-1"
                        >
                          {type}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    Do you want to bulk-onboard your roster to Likelee?
                  </Label>
                  <RadioGroup
                    value={formData.bulk_onboard}
                    onValueChange={(value) =>
                      setFormData({ ...formData, bulk_onboard: value })
                    }
                  >
                    <div className="space-y-2">
                      {["Yes", "No", "Maybe later"].map((option) => (
                        <div
                          key={option}
                          className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50"
                        >
                          <RadioGroupItem
                            value={option.toLowerCase()}
                            id={`bulk_${option}`}
                            className="border-2 border-gray-400"
                          />
                          <Label
                            htmlFor={`bulk_${option}`}
                            className="text-sm text-gray-700 cursor-pointer flex-1"
                          >
                            {option}
                          </Label>
                        </div>
                      ))}
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
                  disabled={updateProfileMutation.isPending} // Disable while submitting
                  className={`flex-1 h-12 ${colors.button} text-white border-2 border-black rounded-none`}
                >
                  {updateProfileMutation.isPending
                    ? "Submitting..."
                    : "Complete Sign Up"}{" "}
                  {/* Dynamic text */}
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
