import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
// Temporary comment to trigger TypeScript re-evaluation
import { useNavigate } from "react-router-dom";
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
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Upload,
  Eye,
  EyeOff,
  Download,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AgencyTermsContent } from "@/components/AgencyTermsContent";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { getFriendlyErrorMessage } from "@/utils/errorMapping";
import {
  EmailOtpDialog,
  type EmailOtpDialogTheme,
} from "@/components/auth/EmailOtpDialog";
import {
  normalizeEmail,
  resendSignupEmailOtp,
  verifyEmailOtpCode,
} from "@/lib/emailOtp";
import {
  getOrganizationKycStatus,
  registerBrand,
  registerAgency,
  updateBrandProfile,
  updateAgencyProfile,
  getBrandProfile,
  getAgencyProfile,
  createOrganizationKycSession,
} from "@/api/functions";
import {
  clearAuthIntent,
  getDashboardPath,
  getOnboardingPath,
  getSignupPathForRole,
  isOnboardingIncomplete,
  normalizeOrganizationSignupType,
} from "@/auth/onboarding";

const getProductionTypes = (t: any) => [
  {
    label: t("organizationSignup.options.productionTypes.film"),
    value: "film",
  },
  { label: t("organizationSignup.options.productionTypes.tv"), value: "tv" },
  {
    label: t("organizationSignup.options.productionTypes.commercial"),
    value: "commercial",
  },
  {
    label: t("organizationSignup.options.productionTypes.musicVideo"),
    value: "music_video",
  },
  {
    label: t("organizationSignup.options.productionTypes.animation"),
    value: "animation",
  },
  {
    label: t("organizationSignup.options.productionTypes.mixedAiLive"),
    value: "mixed_ai_live",
  },
];

const getServices = (t: any) => [
  {
    label: t("organizationSignup.options.services.socialMediaManagement"),
    value: "social_media_management",
  },
  {
    label: t("organizationSignup.options.services.influencerCampaigns"),
    value: "influencer_campaigns",
  },
  {
    label: t("organizationSignup.options.services.videoAds"),
    value: "video_ads",
  },
  {
    label: t("organizationSignup.options.services.ugcProduction"),
    value: "ugc_production",
  },
  {
    label: t("organizationSignup.options.services.contentCreation"),
    value: "content_creation",
  },
  {
    label: t("organizationSignup.options.services.brandStrategy"),
    value: "brand_strategy",
  },
];

const getCampaignTypes = (t: any) => [
  {
    label: t("organizationSignup.options.campaignTypes.fashion"),
    value: "fashion",
  },
  {
    label: t("organizationSignup.options.campaignTypes.music"),
    value: "music",
  },
  {
    label: t("organizationSignup.options.campaignTypes.fitness"),
    value: "fitness",
  },
  {
    label: t("organizationSignup.options.campaignTypes.lifestyle"),
    value: "lifestyle",
  },
  {
    label: t("organizationSignup.options.campaignTypes.beauty"),
    value: "beauty",
  },
  {
    label: t("organizationSignup.options.campaignTypes.sports"),
    value: "sports",
  },
  {
    label: t("organizationSignup.options.campaignTypes.entertainment"),
    value: "entertainment",
  },
];

const getPrimaryGoals = (t: any) => [
  {
    label: t("organizationSignup.options.primaryGoals.runAdCampaigns"),
    value: "run_ad_campaigns",
  },
  {
    label: t("organizationSignup.options.primaryGoals.findBrandAmbassadors"),
    value: "find_brand_ambassadors",
  },
  {
    label: t("organizationSignup.options.primaryGoals.licenseAiReadyFaces"),
    value: "license_ai_ready_faces",
  },
];

const getRolesNeeded = (t: any) => [
  {
    label: t("organizationSignup.options.rolesNeeded.talentFacesVoices"),
    value: "talent_faces_voices",
  },
  {
    label: t(
      "organizationSignup.options.rolesNeeded.postproductionAiGeneration",
    ),
    value: "post_production_ai_generation",
  },
  {
    label: t("organizationSignup.options.rolesNeeded.creativeCollaboration"),
    value: "creative_collaboration",
  },
];

const getOpenToAiOptions = (t: any) => [
  {
    label: t("organizationSignup.options.openToAiOptions.aiRecreation"),
    value: "ai_recreation",
  },
  {
    label: t(
      "organizationSignup.options.openToAiOptions.likenessProtectionOnly",
    ),
    value: "likeness_protection_only",
  },
  {
    label: t("organizationSignup.options.openToAiOptions.variesByTalent"),
    value: "varies_by_talent",
  },
];

const getIndustries = (t: any) => [
  { label: t("organizationSignup.industries.fashion"), value: "fashion" },
  { label: t("organizationSignup.industries.beauty"), value: "beauty" },
  { label: t("organizationSignup.industries.technology"), value: "technology" },
  { label: t("organizationSignup.industries.automotive"), value: "automotive" },
  {
    label: t("organizationSignup.industries.foodBeverage"),
    value: "food & beverage",
  },
  { label: t("organizationSignup.industries.travel"), value: "travel" },
  {
    label: t("organizationSignup.industries.entertainment"),
    value: "entertainment",
  },
  {
    label: t("organizationSignup.industries.healthWellness"),
    value: "health & wellness",
  },
  { label: t("organizationSignup.industries.finance"), value: "finance" },
  { label: t("organizationSignup.industries.other"), value: "other" },
];

export default function OrganizationSignup() {
  const { t } = useTranslation();
  const { user, profile, refreshProfile, initialized, login, authenticated } =
    useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check if user arrived via OAuth
  const isOAuthSignup =
    user &&
    (user.app_metadata?.provider === "google" ||
      user.app_metadata?.provider === "github");

  const [step, setStep] = useState(1); // All users start at step 1 to collect org basics
  const [orgType, setOrgType] = useState("");
  const [isPreSelected, setIsPreSelected] = useState(false);
  const [submitted, setSubmitted] = useState(false); // New state for submission status
  const [profileId, setProfileId] = useState<string | null>(null); // Add profileId state
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [kycSessionUrl, setKycSessionUrl] = useState<string | null>(null); // State for KYC session URL
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  // For OAuth users: 2 steps (org basics + type-specific details)
  // For non-OAuth users: 2 steps (email/password + org basics, then type-specific details)
  // Same number of steps, but different field requirements
  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const [emailVerificationPending, setEmailVerificationPending] =
    useState(false);

  // Pre-fill email and set profileId for OAuth users
  useEffect(() => {
    if (isOAuthSignup && user?.email && !formData.email) {
      setFormData((prev) => ({ ...prev, email: user.email || "" }));
      if (user.id) {
        setProfileId(user.id);
      }
    }
  }, [isOAuthSignup, user, formData.email]);

  const requireSupabase = () => {
    if (!supabase) {
      throw new Error("Supabase not configured");
    }

    return supabase;
  };

  const handleOrganizationOtpVerify = async (code: string) => {
    const client = requireSupabase();
    await verifyEmailOtpCode(client, {
      email: formData.email,
      token: code,
      purpose: "signup",
    });
    setEmailVerificationPending(false);
    setStep(2);
    toast({
      title: "Email verified",
      description:
        "Your organization account is verified. Continue setup below.",
    });
  };

  const handleOrganizationOtpResend = async (showToast = true) => {
    const client = requireSupabase();
    await resendSignupEmailOtp(client, formData.email);
    if (showToast) {
      toast({
        title: "Code sent",
        description: "We sent a fresh 6-digit code to your inbox.",
      });
    }
  };

  const loginExistingAccount = async () => {
    await login(normalizeEmail(formData.email), formData.password);
    toast({
      title: "Account found",
      description:
        "This email already belongs to an existing account. Continuing there now.",
    });
  };

  const toOptionalText = (value: unknown) => {
    const trimmed = String(value ?? "").trim();
    return trimmed ? trimmed : undefined;
  };

  const getOrganizationBasics = (data: typeof formData) => {
    const typedEmail = toOptionalText(data.email);

    return {
      organizationName:
        toOptionalText(data.organization_name) ||
        toOptionalText(profile?.company_name) ||
        toOptionalText(profile?.agency_name),
      contactName:
        toOptionalText(data.contact_name) ||
        toOptionalText(profile?.contact_name),
      contactTitle:
        toOptionalText(data.contact_title) ||
        toOptionalText(profile?.contact_title),
      email: typedEmail
        ? normalizeEmail(typedEmail)
        : toOptionalText(profile?.email) || toOptionalText(user?.email),
      website: toOptionalText(data.website) || toOptionalText(profile?.website),
      phoneNumber:
        toOptionalText(data.phone_number) ||
        toOptionalText(profile?.phone_number),
      agencyType:
        toOptionalText(orgType) ||
        toOptionalText(profile?.agency_type) ||
        toOptionalText(profile?.organization_type),
    };
  };

  const mergeOrganizationBasicsIntoForm = (source: any) => {
    setFormData((prev) => ({
      ...prev,
      email: prev.email || source?.email || user?.email || "",
      organization_name:
        prev.organization_name ||
        source?.company_name ||
        source?.agency_name ||
        "",
      contact_name: prev.contact_name || source?.contact_name || "",
      contact_title: prev.contact_title || source?.contact_title || "",
      website: prev.website || source?.website || "",
      phone_number: prev.phone_number || source?.phone_number || "",
    }));
  };

  const isExistingOrganizationSignupError = (error: any) => {
    const code = String(error?.data?.code || error?.code || "").toLowerCase();
    const message = String(
      error?.message ||
        error?.data?.msg ||
        error?.data?.message ||
        error?.data?.error ||
        "",
    ).toLowerCase();

    return (
      code === "email_exists" ||
      message.includes("already exists") ||
      message.includes("already registered") ||
      message.includes("already been registered")
    );
  };

  // Debug logging
  useEffect(() => {
    console.log("OrganizationSignup State:", {
      step,
      orgType,
      profileId,
      user: user?.id,
      profile: profile?.id,
      emailVerificationPending,
    });
  }, [step, orgType, profileId, user, profile, emailVerificationPending]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const rawType = urlParams.get("type");

    if (rawType === "creator") {
      const creatorType = urlParams.get("creator_type");
      navigate(getSignupPathForRole("creator", creatorType), { replace: true });
      return;
    }

    const type = normalizeOrganizationSignupType(rawType);
    if (rawType && !type) {
      navigate("/organization-signup", { replace: true });
      return;
    }

    if (type) {
      setOrgType(type);
      setIsPreSelected(true);
    }
  }, [navigate]);

  const flow = React.useMemo(() => {
    if (["brand_company", "production_studio"].includes(orgType))
      return "brand";
    if (
      ["marketing_agency", "talent_agency", "sports_agency"].includes(orgType)
    )
      return "agency";
    return null;
  }, [orgType]);

  useEffect(() => {
    if (!initialized || !authenticated || profile === undefined) {
      return;
    }

    if (profile) {
      if (profile.role !== "brand" && profile.role !== "agency") {
        const path = isOnboardingIncomplete(profile)
          ? getOnboardingPath(profile)
          : getDashboardPath(profile);
        if (path) {
          navigate(path, { replace: true });
        }
        return;
      }
      return;
    }

    const authRole = String(
      user?.user_metadata?.role || user?.app_metadata?.role || "",
    )
      .trim()
      .toLowerCase();
    if (authRole === "creator" || authRole === "talent") {
      navigate(
        getSignupPathForRole(
          "creator",
          new URLSearchParams(window.location.search).get("creator_type"),
        ),
        { replace: true },
      );
    }
  }, [authenticated, initialized, navigate, profile, user]);

  // Check for existing session and onboarding step
  // This effect handles the user's return after email verification.
  useEffect(() => {
    const handleVerifiedUser = async () => {
      console.log("handleVerifiedUser check:", {
        initialized,
        hasUser: !!user,
        profileState:
          profile === undefined
            ? "PENDING"
            : profile === null
              ? "NO_PROFILE"
              : "EXISTS",
        userRole: user?.user_metadata?.role,
        profileRole: profile?.role,
        onboardingStep: profile?.onboarding_step,
        isOAuthSignup,
      });

      // Wait for auth to be fully initialized
      if (!initialized) {
        console.log("handleVerifiedUser: waiting for initialization...");
        return;
      }

      // Wait for profile resolution to complete (undefined = still loading)
      if (profile === undefined) {
        console.log("handleVerifiedUser: waiting for profile resolution...");
        return;
      }

      // We need the user object to proceed.
      if (user) {
        // If we already have the profile from useAuth, use it.
        if (profile) {
          const isBrand = profile.role === "brand";
          const isAgency = profile.role === "agency";

          if (isBrand || isAgency) {
            if (
              profile.status === "complete" ||
              profile.onboarding_step === "complete"
            ) {
              console.log("Onboarding complete, redirecting to dashboard");
              if (isBrand) {
                navigate("/BrandDashboard", { replace: true });
              } else {
                navigate("/AgencyDashboard", { replace: true });
              }
              return;
            }

            if (profile.onboarding_step === "email_verification") {
              console.log("Advancing to Step 2 based on AuthProvider profile");
              setProfileId(profile.id);
              setOrgType(
                profile.organization_type ||
                  profile.agency_type ||
                  (isBrand ? "brand_company" : "marketing_agency"),
              );
              mergeOrganizationBasicsIntoForm(profile);
              setStep(2);
              return;
            }
          }
        }

        // For OAuth signup users without a profile, they should just fill out the form
        // No need for API fallback - they have no profile to fetch
        if (isOAuthSignup && profile === null) {
          console.log(
            "OAuth signup user without profile, ready for form input",
          );
          // Pre-fill email from OAuth provider (only if we have it and form is empty)
          if (user.email) {
            setFormData((prev) =>
              prev.email ? prev : { ...prev, email: user.email || "" },
            );
          }
          return;
        }

        // Fallback to direct API calls only for non-OAuth users (email/password returning after verification)
        if (!isOAuthSignup) {
          console.log(
            "Email/password user, falling back to API calls to check profile",
          );
          try {
            const expectedFlow =
              flow ||
              (user.user_metadata?.role === "brand"
                ? "brand"
                : user.user_metadata?.role === "agency"
                  ? "agency"
                  : null);

            const fetchBrandProfile = () =>
              getBrandProfile().catch((err) => {
                if (
                  err.name === "AbortError" ||
                  err.message?.includes("aborted")
                ) {
                  console.log("getBrandProfile aborted");
                }
                return null;
              });

            const fetchAgencyProfile = () =>
              getAgencyProfile().catch((err) => {
                if (
                  err.name === "AbortError" ||
                  err.message?.includes("aborted")
                ) {
                  console.log("getAgencyProfile aborted");
                }
                return null;
              });

            let brandProfile = null;
            let agencyProfile = null;

            if (expectedFlow === "brand") {
              brandProfile = await fetchBrandProfile();
            } else if (expectedFlow === "agency") {
              agencyProfile = await fetchAgencyProfile();
            } else {
              [brandProfile, agencyProfile] = await Promise.all([
                fetchBrandProfile(),
                fetchAgencyProfile(),
              ]);
            }

            const orgProfile = brandProfile || agencyProfile;

            if (orgProfile) {
              console.log("Found orgProfile via API fallback:", orgProfile);
              if (
                orgProfile.status === "complete" ||
                orgProfile.onboarding_step === "complete"
              ) {
                console.log("Onboarding complete via fallback, redirecting");
                if (brandProfile) {
                  navigate("/BrandDashboard", { replace: true });
                } else {
                  navigate("/AgencyDashboard", { replace: true });
                }
                return;
              }

              if (orgProfile.onboarding_step === "email_verification") {
                console.log("Advancing to Step 2 via API fallback");
                setProfileId(orgProfile.id);
                setOrgType(
                  orgProfile.organization_type ||
                    orgProfile.agency_type ||
                    (brandProfile ? "brand_company" : "marketing_agency"),
                );
                mergeOrganizationBasicsIntoForm(orgProfile);
                setStep(2);
              }
            } else {
              console.log("No organization profile found via API fallback yet");
            }
          } catch (err) {
            console.error("Error in handleVerifiedUser API fallback:", err);
          }
        }
      }
    };

    handleVerifiedUser();
  }, [flow, user, profile, initialized, isOAuthSignup]); // Rerun when auth state changes

  // Color schemes for each organization type
  const getColorScheme = () => {
    const schemes = {
      brand_company: {
        gradient: "from-amber-50 via-yellow-50 to-orange-50",
        primary: "from-[#F7B750] to-[#FAD54C]",
        button: "bg-[#F7B750] hover:bg-[#E6A640]",
        badge: "bg-amber-100 text-amber-700",
        otpTheme: {
          headerClassName:
            "bg-gradient-to-r from-[#F7B750] to-[#FAD54C] text-slate-950",
          headerTitleClassName: "text-slate-950",
          headerDescriptionClassName: "text-slate-900/80",
          iconWrapperClassName:
            "border border-slate-950/10 bg-white/35 text-slate-950",
          infoClassName: "border-amber-200 bg-amber-50 text-amber-950",
          primaryButtonClassName: "bg-[#F7B750] text-white hover:bg-[#E6A640]",
          activeSlotClassName: "border-[#F7B750] ring-[#F7B750]/30",
          resendButtonClassName: "text-amber-700 hover:text-amber-800",
        } satisfies EmailOtpDialogTheme,
      },
      marketing_agency: {
        gradient: "from-cyan-50 via-teal-50 to-blue-50",
        primary: "from-[#32C8D1] to-teal-500",
        button: "bg-[#32C8D1] hover:bg-[#2AB8C1]",
        badge: "bg-cyan-100 text-cyan-700",
        otpTheme: {
          headerClassName:
            "bg-gradient-to-r from-[#32C8D1] to-teal-500 text-white",
          headerTitleClassName: "text-white",
          headerDescriptionClassName: "text-white/80",
          iconWrapperClassName: "border border-white/30 bg-white/15 text-white",
          infoClassName: "border-cyan-100 bg-cyan-50 text-cyan-950",
          primaryButtonClassName: "bg-[#32C8D1] text-white hover:bg-[#2AB8C1]",
          activeSlotClassName: "border-[#32C8D1] ring-[#32C8D1]/30",
          resendButtonClassName: "text-cyan-700 hover:text-cyan-800",
        } satisfies EmailOtpDialogTheme,
      },
      talent_agency: {
        gradient: "from-indigo-50 via-violet-50 to-purple-50",
        primary: "from-indigo-600 to-purple-600",
        button: "bg-indigo-600 hover:bg-indigo-700",
        badge: "bg-indigo-100 text-indigo-700",
        otpTheme: {
          headerClassName:
            "bg-gradient-to-r from-indigo-600 to-purple-600 text-white",
          headerTitleClassName: "text-white",
          headerDescriptionClassName: "text-white/80",
          iconWrapperClassName: "border border-white/30 bg-white/15 text-white",
          infoClassName: "border-indigo-100 bg-indigo-50 text-indigo-950",
          primaryButtonClassName:
            "bg-indigo-600 text-white hover:bg-indigo-700",
          activeSlotClassName: "border-indigo-500 ring-indigo-500/30",
          resendButtonClassName: "text-indigo-700 hover:text-indigo-800",
        } satisfies EmailOtpDialogTheme,
      },
      production_studio: {
        gradient: "from-slate-50 via-gray-50 to-zinc-50",
        primary: "from-slate-700 to-gray-800",
        button: "bg-slate-700 hover:bg-slate-800",
        badge: "bg-slate-100 text-slate-700",
        otpTheme: {
          headerClassName:
            "bg-gradient-to-r from-slate-700 to-gray-800 text-white",
          headerTitleClassName: "text-white",
          headerDescriptionClassName: "text-white/80",
          iconWrapperClassName: "border border-white/30 bg-white/15 text-white",
          infoClassName: "border-slate-200 bg-slate-50 text-slate-950",
          primaryButtonClassName: "bg-slate-700 text-white hover:bg-slate-800",
          activeSlotClassName: "border-slate-500 ring-slate-500/30",
          resendButtonClassName: "text-slate-700 hover:text-slate-800",
        } satisfies EmailOtpDialogTheme,
      },
      sports_agency: {
        gradient: "from-blue-50 via-indigo-50 to-slate-50",
        primary: "from-[#0D1B3A] to-[#1E3A8A]",
        button: "bg-[#0D1B3A] hover:bg-[#1E3A8A]",
        badge: "bg-blue-100 text-blue-700",
        otpTheme: {
          headerClassName:
            "bg-gradient-to-r from-[#0D1B3A] to-[#1E3A8A] text-white",
          headerTitleClassName: "text-white",
          headerDescriptionClassName: "text-white/80",
          iconWrapperClassName: "border border-white/30 bg-white/15 text-white",
          infoClassName: "border-blue-100 bg-blue-50 text-blue-950",
          primaryButtonClassName: "bg-[#0D1B3A] text-white hover:bg-[#1E3A8A]",
          activeSlotClassName: "border-[#1E3A8A] ring-[#1E3A8A]/30",
          resendButtonClassName: "text-blue-700 hover:text-blue-800",
        } satisfies EmailOtpDialogTheme,
      },
    };
    return schemes[orgType] || schemes.brand_company;
  };

  const colors = getColorScheme();

  // New mutation for initial profile creation (Step 1)
  const createInitialProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const organizationBasics = getOrganizationBasics(data);

      if (!organizationBasics.organizationName) {
        throw new Error("Organization name is required.");
      }

      if (flow === "brand") {
        const payload = {
          email: organizationBasics.email || normalizeEmail(data.email),
          password: data.password,
          company_name: organizationBasics.organizationName,
          contact_name: organizationBasics.contactName,
          contact_title: organizationBasics.contactTitle,
          website: organizationBasics.website,
          phone_number: organizationBasics.phoneNumber,
        };
        return await registerBrand(payload);
      } else {
        if (!organizationBasics.agencyType) {
          throw new Error("Agency type is required.");
        }

        const payload = {
          email: organizationBasics.email || normalizeEmail(data.email),
          password: data.password,
          agency_name: organizationBasics.organizationName,
          agency_type: organizationBasics.agencyType,
          contact_name: organizationBasics.contactName,
          contact_title: organizationBasics.contactTitle,
          website: organizationBasics.website,
          phone_number: organizationBasics.phoneNumber,
        };
        return await registerAgency(payload);
      }
    },
    onSuccess: async (resp: any) => {
      // Postgrest usually returns an array of inserted rows; handle both array/object
      const created = Array.isArray(resp) ? resp[0] : resp;
      const newId = created?.user_id || created?.id;
      setProfileId(newId);

      // Trigger email confirmation from the client and keep verification in-app.
      try {
        await handleOrganizationOtpResend(false);
      } catch (err) {
        console.error("Failed to send confirmation email:", err);
        toast({
          title: "Code delivery failed",
          description:
            "We created the account, but could not send the verification code yet. Please try resending it.",
          variant: "destructive",
        });
      }

      setEmailVerificationPending(true);
      toast({
        title: "Account Created",
        description: "Enter the 6-digit code from your email to continue.",
      });
    },
    onError: async (error) => {
      if (isExistingOrganizationSignupError(error)) {
        try {
          await loginExistingAccount();
          return;
        } catch {
          // Existing unverified organization signups still resume via OTP.
        }

        try {
          await handleOrganizationOtpResend(false);
          setEmailVerificationPending(true);
          toast({
            title: "Continue signup",
            description:
              "We found an existing signup for this email. Enter the 6-digit code from your email to continue.",
          });
          return;
        } catch (resendError) {
          console.error(
            "Existing organization signup found, but resend failed:",
            resendError,
          );
          toast({
            title: "Account already exists",
            description:
              "This email already belongs to another account. Sign in instead to continue with that account.",
            className: "bg-cyan-50 border-2 border-cyan-400",
          });
          return;
        }
      }

      console.error("Error creating initial profile:", error);
      toast({
        title: t("common.error"),
        description: getTranslatedErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  // Updated mutation for profile updates (Step 2)
  const updateProfileMutation = useMutation({
    mutationFn: (data: typeof formData) => {
      const organizationBasics = getOrganizationBasics(data);

      if (!organizationBasics.organizationName) {
        throw new Error("Organization name is required.");
      }

      if (flow === "brand") {
        return updateBrandProfile({
          company_name: organizationBasics.organizationName,
          contact_name: organizationBasics.contactName,
          contact_title: organizationBasics.contactTitle,
          email: organizationBasics.email,
          website: organizationBasics.website,
          phone_number: organizationBasics.phoneNumber,
          industry: data.industry,
          primary_goal: data.primary_goal,
          geographic_target: data.geographic_target,
          production_type: data.production_type,
          budget_range: data.budget_range,
          creates_for: data.creates_for,
          uses_ai: data.uses_ai,
          roles_needed: data.roles_needed,
          status: "waitlist",
          onboarding_step: "complete",
        });
      } else {
        if (!organizationBasics.agencyType) {
          throw new Error("Agency type is required.");
        }

        return updateAgencyProfile({
          agency_name: organizationBasics.organizationName,
          contact_name: organizationBasics.contactName,
          contact_title: organizationBasics.contactTitle,
          email: organizationBasics.email,
          website: organizationBasics.website,
          phone_number: organizationBasics.phoneNumber,
          agency_type: organizationBasics.agencyType,
          client_count: data.client_count,
          campaign_budget: data.campaign_budget,
          services_offered: data.services_offered,
          provide_creators: data.provide_creators,
          handle_contracts: data.handle_contracts,
          talent_count: data.talent_count,
          licenses_likeness: data.licenses_likeness,
          open_to_ai: data.open_to_ai,
          campaign_types: data.campaign_types,
          bulk_onboard: data.bulk_onboard,
          status: "waitlist",
          onboarding_step: "complete",
        });
      }
    },
    onSuccess: async () => {
      try {
        await refreshProfile();
      } catch (e) {
        console.warn(
          "Failed to refresh profile after onboarding completion",
          e,
        );
      }
      // Clear auth intent after successful profile completion
      clearAuthIntent();
      if (flow === "brand") {
        navigate("/BrandDashboard", { replace: true });
        return;
      }
      if (flow === "agency") {
        navigate("/AgencySubscribe", { replace: true });
        return;
      }
      setSubmitted(true);
    },
    onError: (error) => {
      console.error("Error updating profile:", error);
      // Optionally handle error, e.g., show a toast notification
      toast({
        title: t("common.error"),
        description: getTranslatedErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const getTranslatedErrorMessage = (error: any) => {
    return getFriendlyErrorMessage(error, t);
  };

  const handleNext = () => {
    // Basic validation for Step 1 before proceeding
    if (step === 1) {
      // Validate organization type is set
      if (!orgType) {
        toast({
          title: t("error"),
          description:
            "Organization type is missing. Please try again from the beginning.",
          variant: "destructive",
        });
        return;
      }

      // Validate organization name is set for all users
      if (!formData.organization_name) {
        toast({
          title: t("organizationSignup.missingFieldsTitle"),
          description: t("organizationSignup.missingFieldsDescription"),
          variant: "destructive",
        });
        return;
      }

      // For OAuth users, skip email/password validation and move to step 2
      if (isOAuthSignup) {
        console.log("OAuth user proceeding to step 2 with org basics");
        setStep(2);
        return;
      }

      // For non-OAuth users, validate email and passwords
      if (!formData.email || !formData.password || !formData.confirmPassword) {
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
      if (formData.password.length < 6) {
        toast({
          title: t("common.error"),
          description: t("organizationSignup.errors.weakPassword"),
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

  const agencyStep2MissingFields = () => {
    if (flow !== "agency" || step !== 2) return [] as string[];

    if (orgType === "marketing_agency") {
      const missing: string[] = [];
      if (!String(formData.client_count || "").trim())
        missing.push("client_count");
      if (!String(formData.campaign_budget || "").trim())
        missing.push("campaign_budget");
      if (
        !Array.isArray(formData.services_offered) ||
        formData.services_offered.length === 0
      )
        missing.push("services_offered");
      if (!String(formData.provide_creators || "").trim())
        missing.push("provide_creators");
      if (!String(formData.handle_contracts || "").trim())
        missing.push("handle_contracts");
      return missing;
    }

    if (orgType === "talent_agency") {
      const missing: string[] = [];
      if (!String(formData.talent_count || "").trim())
        missing.push("talent_count");
      if (!String(formData.licenses_likeness || "").trim())
        missing.push("licenses_likeness");
      if (
        !Array.isArray(formData.open_to_ai) ||
        formData.open_to_ai.length === 0
      )
        missing.push("open_to_ai");
      if (
        !Array.isArray(formData.campaign_types) ||
        formData.campaign_types.length === 0
      )
        missing.push("campaign_types");
      if (!String(formData.bulk_onboard || "").trim())
        missing.push("bulk_onboard");
      return missing;
    }

    if (orgType === "sports_agency") {
      const missing: string[] = [];
      if (!String(formData.talent_count || "").trim())
        missing.push("talent_count");
      if (!String(formData.licenses_likeness || "").trim())
        missing.push("licenses_likeness");
      if (
        !Array.isArray(formData.open_to_ai) ||
        formData.open_to_ai.length === 0
      )
        missing.push("open_to_ai");
      if (
        !Array.isArray(formData.campaign_types) ||
        formData.campaign_types.length === 0
      )
        missing.push("campaign_types");
      if (!String(formData.bulk_onboard || "").trim())
        missing.push("bulk_onboard");
      return missing;
    }

    return [] as string[];
  };

  const canSubmitAgencyStep2 = agencyStep2MissingFields().length === 0;

  const handleStep2Next = () => {
    if (flow === "agency" && step === 2) {
      const missing = agencyStep2MissingFields();
      if (missing.length > 0) {
        toast({
          title: t("organizationSignup.missingFieldsTitle"),
          description: t("organizationSignup.missingFieldsDescription"),
          variant: "destructive",
        });
        return;
      }
    }
    // Move to the final Agreements step
    setStep(3);
  };

  const handleFinalSubmit = () => {
    if (!agreedToTerms) {
      toast({
        title: t(
          "organizationSignup.terms.mustAgreeTitle",
          "Agreement Required",
        ),
        description: t(
          "organizationSignup.terms.mustAgree",
          "You must agree to the privacy policy to complete your registration.",
        ),
        variant: "destructive",
      });
      return;
    }
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
      sports_agency: t("sportsAgency"),
    };
    return titles[orgType] || t("common.organization");
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

              {/* Added Go to Dashboard button */}
              <Button
                onClick={() => {
                  if (flow === "brand") {
                    window.location.href = "/BrandDashboard";
                  } else {
                    window.location.href = "/AgencyDashboard";
                  }
                }}
                variant="outline"
                className="mt-4 w-full h-12 border-2 border-black rounded-none font-bold hover:bg-gray-100"
              >
                Go to Dashboard
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
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
                  {flow === "agency"
                    ? t("organizationSignup.agencyInfo")
                    : t("organizationSignup.companyInfo")}
                </h3>
                <p className="text-gray-600">
                  {isOAuthSignup
                    ? "Tell us about your organization"
                    : t("organizationSignup.startWithBasics")}
                </p>
              </div>

              <div className="space-y-4">
                {/* NEW: Organization Type Selector - Hidden if pre-selected */}
                {!isPreSelected && (
                  <div>
                    <Label
                      htmlFor="organization_type"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      Organization Type *
                    </Label>
                    <Select
                      value={orgType}
                      onValueChange={(value) => setOrgType(value)}
                    >
                      <SelectTrigger className="border-2 border-gray-300 rounded-none">
                        <SelectValue placeholder="Select your organization type" />
                      </SelectTrigger>
                      <SelectContent>
                        {(flow === "brand" || !flow) && (
                          <>
                            <SelectItem value="brand_company">
                              Brand / Company
                            </SelectItem>
                            <SelectItem value="production_studio">
                              Production Studio
                            </SelectItem>
                          </>
                        )}
                        {(flow === "agency" || !flow) && (
                          <>
                            <SelectItem value="marketing_agency">
                              Marketing Agency
                            </SelectItem>
                            <SelectItem value="talent_agency">
                              Talent / Modeling Agency
                            </SelectItem>
                            <SelectItem value="sports_agency">
                              Sports Agency
                            </SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Only show email/password for non-OAuth users */}
                {!isOAuthSignup && (
                  <>
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
                        placeholder={t("organizationSignup.emailPlaceholder")}
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
                            setFormData({
                              ...formData,
                              password: e.target.value,
                            })
                          }
                          className="border-2 border-gray-300 rounded-none pr-10"
                          placeholder={t(
                            "organizationSignup.passwordPlaceholder",
                          )}
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
                          placeholder={t(
                            "organizationSignup.passwordPlaceholder",
                          )}
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
                  </>
                )}

                <div>
                  <Label
                    htmlFor="organization_name"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    {flow === "agency"
                      ? t("organizationSignup.agencyName")
                      : t("organizationSignup.organizationName")}{" "}
                    *
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
                    placeholder={
                      flow === "agency"
                        ? "e.g., Elite Sports Management"
                        : t("common.companyNamePlaceholder")
                    }
                  />
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
                disabled={
                  isOAuthSignup ? false : createInitialProfileMutation.isPending
                }
                className={`w-full h-12 ${colors.button} text-white border-2 border-black rounded-none`}
              >
                {isOAuthSignup ? (
                  <>
                    {t("common.continue")}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                ) : createInitialProfileMutation.isPending ? (
                  t("common.saving")
                ) : (
                  <>
                    {t("common.continue")}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
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
                      {getIndustries(t).map((industry) => (
                        <SelectItem key={industry.value} value={industry.value}>
                          {industry.label}
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
                            formData.primary_goal.includes(goal.value),
                          )}
                          onCheckedChange={() =>
                            toggleSelectAll(
                              "primary_goal",
                              getPrimaryGoals(t).map((g) => g.value),
                            )
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
                          key={goal.value}
                          className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50"
                        >
                          <Checkbox
                            id={goal.value}
                            checked={formData.primary_goal.includes(goal.value)}
                            onCheckedChange={() =>
                              toggleArrayItem("primary_goal", goal.value)
                            }
                            className="border-2 border-gray-400"
                          />
                          <label
                            htmlFor={goal.value}
                            className="text-sm text-gray-700 cursor-pointer flex-1"
                          >
                            {goal.label}
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
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="w-1/2 h-12 border-2 border-black rounded-none"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  {t("organizationSignup.back")}
                </Button>
                <Button
                  onClick={handleStep2Next}
                  disabled={updateProfileMutation.isPending}
                  className={`w-1/2 h-12 ${colors.button} text-white border-2 border-black rounded-none`}
                >
                  {updateProfileMutation.isPending
                    ? t("organizationSignup.submitting")
                    : t("organizationSignup.continue")}
                  <CheckCircle2 className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Production Studio */}
          {step === 2 && orgType === "production_studio" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {t("organizationSignup.productionStudio.title")}
                </h3>
                <p className="text-gray-600">
                  {t("organizationSignup.productionStudio.subtitle")}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="production_type"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    {t(
                      "organizationSignup.productionStudio.primaryProductionType",
                    )}
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
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
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
                    {t("organizationSignup.productionStudio.budgetRangeLabel")}
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
                    {t(
                      "organizationSignup.productionStudio.createsForQuestion",
                    )}
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
                          {t("organizationSignup.productionStudio.forClients")}
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
                          {t("organizationSignup.productionStudio.ownIp")}
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
                          {t("organizationSignup.productionStudio.both")}
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    {t("organizationSignup.productionStudio.usesAiQuestion")}
                  </Label>
                  <RadioGroup
                    value={formData.uses_ai}
                    onValueChange={(value) =>
                      setFormData({ ...formData, uses_ai: value })
                    }
                  >
                    <div className="space-y-2">
                      {[
                        {
                          label: t("organizationSignup.options.aiUsage.yes"),
                          value: "yes",
                        },
                        {
                          label: t("organizationSignup.options.aiUsage.no"),
                          value: "no",
                        },
                        {
                          label: t(
                            "organizationSignup.options.aiUsage.exploring",
                          ),
                          value: "exploring",
                        },
                      ].map((option) => (
                        <div
                          key={option.value}
                          className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50"
                        >
                          <RadioGroupItem
                            value={option.value}
                            id={option.value}
                            className="border-2 border-gray-400"
                          />
                          <Label
                            htmlFor={option.value}
                            className="text-sm text-gray-700 cursor-pointer flex-1"
                          >
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-3 block">
                    {t("organizationSignup.productionStudio.rolesNeededLabel")}
                  </Label>
                  <div className="space-y-3">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 p-3 border-2 border-black bg-gray-50 rounded-none mb-2">
                        <Checkbox
                          id="select_all_roles"
                          checked={getRolesNeeded(t).every((role) =>
                            formData.roles_needed.includes(role.value),
                          )}
                          onCheckedChange={() =>
                            toggleSelectAll(
                              "roles_needed",
                              getRolesNeeded(t).map((r) => r.value),
                            )
                          }
                          className="border-2 border-gray-900"
                        />
                        <label
                          htmlFor="select_all_roles"
                          className="text-sm font-bold text-gray-900 cursor-pointer flex-1"
                        >
                          {t("organizationSignup.selectAll")}
                        </label>
                      </div>
                      {getRolesNeeded(t).map((role) => (
                        <div
                          key={role.value}
                          className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50"
                        >
                          <Checkbox
                            id={role.value}
                            checked={formData.roles_needed.includes(role.value)}
                            onCheckedChange={() =>
                              toggleArrayItem("roles_needed", role.value)
                            }
                            className="border-2 border-gray-400"
                          />
                          <label
                            htmlFor={role.value}
                            className="text-sm text-gray-700 cursor-pointer flex-1"
                          >
                            {role.label}
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
                  {t("organizationSignup.back")}
                </Button>
                <Button
                  onClick={handleStep2Next}
                  disabled={
                    updateProfileMutation.isPending || !canSubmitAgencyStep2
                  } // Disable while submitting
                  className={`flex-1 h-12 ${colors.button} text-white border-2 border-black rounded-none`}
                >
                  {updateProfileMutation.isPending
                    ? t("organizationSignup.submitting")
                    : t("organizationSignup.continue")}{" "}
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
                  {t("organizationSignup.marketingAgency.title")}
                </h3>
                <p className="text-gray-600">
                  {t("organizationSignup.marketingAgency.subtitle")}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="client_count"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    {t("organizationSignup.marketingAgency.clientCountLabel")}
                  </Label>
                  <Input
                    id="client_count"
                    type="number"
                    value={formData.client_count}
                    onChange={(e) =>
                      setFormData({ ...formData, client_count: e.target.value })
                    }
                    className="border-2 border-gray-300 rounded-none"
                    placeholder={t(
                      "organizationSignup.marketingAgency.clientCountPlaceholder",
                    )}
                  />
                </div>

                <div>
                  <Label
                    htmlFor="campaign_budget"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    {t(
                      "organizationSignup.marketingAgency.campaignBudgetLabel",
                    )}
                  </Label>
                  <Select
                    value={formData.campaign_budget}
                    onValueChange={(value) =>
                      setFormData({ ...formData, campaign_budget: value })
                    }
                  >
                    <SelectTrigger className="border-2 border-gray-300 rounded-none">
                      <SelectValue
                        placeholder={t(
                          "organizationSignup.marketingAgency.campaignBudgetPlaceholder",
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="under_5k">
                        {t("organizationSignup.marketingAgency.budgetUnder5k")}
                      </SelectItem>
                      <SelectItem value="5k_25k">
                        {t("organizationSignup.marketingAgency.budget5k25k")}
                      </SelectItem>
                      <SelectItem value="25k_100k">
                        {t("organizationSignup.marketingAgency.budget25k100k")}
                      </SelectItem>
                      <SelectItem value="100k_500k">
                        {t("organizationSignup.marketingAgency.budget100k500k")}
                      </SelectItem>
                      <SelectItem value="over_500k">
                        {t("organizationSignup.marketingAgency.budgetOver500k")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-3 block">
                    {t("organizationSignup.marketingAgency.servicesLabel")}
                  </Label>
                  <div className="space-y-3">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 p-3 border-2 border-black bg-gray-50 rounded-none mb-2">
                        <Checkbox
                          id="select_all_services"
                          checked={getServices(t).every((service) =>
                            formData.services_offered.includes(service.value),
                          )}
                          onCheckedChange={() =>
                            toggleSelectAll(
                              "services_offered",
                              getServices(t).map((s) => s.value),
                            )
                          }
                          className="border-2 border-gray-900"
                        />
                        <label
                          htmlFor="select_all_services"
                          className="text-sm font-bold text-gray-900 cursor-pointer flex-1"
                        >
                          {t("organizationSignup.selectAll")}
                        </label>
                      </div>
                      {getServices(t).map((service) => (
                        <div
                          key={service.value}
                          className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50"
                        >
                          <Checkbox
                            id={service.value}
                            checked={formData.services_offered.includes(
                              service.value,
                            )}
                            onCheckedChange={() =>
                              toggleArrayItem("services_offered", service.value)
                            }
                            className="border-2 border-gray-400"
                          />
                          <label
                            htmlFor={service.value}
                            className="text-sm text-gray-700 cursor-pointer flex-1"
                          >
                            {service.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    {t(
                      "organizationSignup.marketingAgency.matchCreatorsQuestion",
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
                          value="match"
                          id="match"
                          className="border-2 border-gray-400"
                        />
                        <Label
                          htmlFor="match"
                          className="text-sm text-gray-700 cursor-pointer flex-1"
                        >
                          {t(
                            "organizationSignup.marketingAgency.matchWithCreators",
                          )}
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
                          {t(
                            "organizationSignup.marketingAgency.justProvideTools",
                          )}
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    {t(
                      "organizationSignup.marketingAgency.handleContractsQuestion",
                    )}
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
                          {t("organizationSignup.marketingAgency.weHandleIt")}
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
                          {t(
                            "organizationSignup.marketingAgency.automateWithLikelee",
                          )}
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
                  {t("organizationSignup.back")}
                </Button>
                <Button
                  onClick={handleStep2Next}
                  disabled={
                    updateProfileMutation.isPending || !canSubmitAgencyStep2
                  } // Disable while submitting
                  className={`flex-1 h-12 ${colors.button} text-white border-2 border-black rounded-none`}
                >
                  {updateProfileMutation.isPending
                    ? t("organizationSignup.submitting")
                    : t("organizationSignup.continue")}{" "}
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
                  {t("organizationSignup.talentAgency.title")}
                </h3>
                <p className="text-gray-600">
                  {t("organizationSignup.talentAgency.subtitle")}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="talent_count"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    {t("organizationSignup.talentAgency.talentCountLabel")}
                  </Label>
                  <Input
                    id="talent_count"
                    type="number"
                    value={formData.talent_count}
                    onChange={(e) =>
                      setFormData({ ...formData, talent_count: e.target.value })
                    }
                    className="border-2 border-gray-300 rounded-none"
                    placeholder={t(
                      "organizationSignup.talentAgency.talentCountPlaceholder",
                    )}
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    {t(
                      "organizationSignup.talentAgency.licenseLikenessQuestion",
                    )}
                  </Label>
                  <RadioGroup
                    value={formData.licenses_likeness}
                    onValueChange={(value) =>
                      setFormData({ ...formData, licenses_likeness: value })
                    }
                  >
                    <div className="space-y-2">
                      {[
                        {
                          label: t("organizationSignup.options.aiUsage.yes"),
                          value: "yes",
                        },
                        {
                          label: t("organizationSignup.options.aiUsage.no"),
                          value: "no",
                        },
                      ].map((option) => (
                        <div
                          key={option.value}
                          className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50"
                        >
                          <RadioGroupItem
                            value={option.value}
                            id={`license_${option.value}`}
                            className="border-2 border-gray-400"
                          />
                          <Label
                            htmlFor={`license_${option.value}`}
                            className="text-sm text-gray-700 cursor-pointer flex-1"
                          >
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-3 block">
                    {t("organizationSignup.talentAgency.openToAiQuestion")}
                  </Label>
                  <div className="space-y-3">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 p-3 border-2 border-black bg-gray-50 rounded-none mb-2">
                        <Checkbox
                          id="select_all_open_to_ai"
                          checked={getOpenToAiOptions(t).every((option) =>
                            formData.open_to_ai.includes(option.value),
                          )}
                          onCheckedChange={() =>
                            toggleSelectAll(
                              "open_to_ai",
                              getOpenToAiOptions(t).map((o) => o.value),
                            )
                          }
                          className="border-2 border-gray-900"
                        />
                        <label
                          htmlFor="select_all_open_to_ai"
                          className="text-sm font-bold text-gray-900 cursor-pointer flex-1"
                        >
                          {t("organizationSignup.selectAll")}
                        </label>
                      </div>
                      {getOpenToAiOptions(t).map((option) => (
                        <div
                          key={option.value}
                          className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50"
                        >
                          <Checkbox
                            id={option.value}
                            checked={formData.open_to_ai.includes(option.value)}
                            onCheckedChange={() =>
                              toggleArrayItem("open_to_ai", option.value)
                            }
                            className="border-2 border-gray-400"
                          />
                          <label
                            htmlFor={option.value}
                            className="text-sm text-gray-700 cursor-pointer flex-1"
                          >
                            {option.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-3 block">
                    {t("organizationSignup.talentAgency.campaignsPursuedLabel")}
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 flex items-center space-x-2 p-3 border-2 border-black bg-gray-50 rounded-none mb-2">
                      <Checkbox
                        id="select_all_campaign_types"
                        checked={getCampaignTypes(t).every((type) =>
                          formData.campaign_types.includes(type.value),
                        )}
                        onCheckedChange={() =>
                          toggleSelectAll(
                            "campaign_types",
                            getCampaignTypes(t).map((c) => c.value),
                          )
                        }
                        className="border-2 border-gray-900"
                      />
                      <label
                        htmlFor="select_all_campaign_types"
                        className="text-sm font-bold text-gray-900 cursor-pointer flex-1"
                      >
                        {t("organizationSignup.selectAll")}
                      </label>
                    </div>
                    {getCampaignTypes(t).map((type) => (
                      <div
                        key={type.value}
                        className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50"
                      >
                        <Checkbox
                          id={type.value}
                          checked={formData.campaign_types.includes(type.value)}
                          onCheckedChange={() =>
                            toggleArrayItem("campaign_types", type.value)
                          }
                          className="border-2 border-gray-400"
                        />
                        <label
                          htmlFor={type.value}
                          className="text-sm text-gray-700 cursor-pointer flex-1"
                        >
                          {type.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    {t("organizationSignup.talentAgency.bulkOnboardQuestion")}
                  </Label>
                  <RadioGroup
                    value={formData.bulk_onboard}
                    onValueChange={(value) =>
                      setFormData({ ...formData, bulk_onboard: value })
                    }
                  >
                    <div className="space-y-2">
                      {[
                        {
                          label: t("organizationSignup.options.aiUsage.yes"),
                          value: "yes",
                        },
                        {
                          label: t("organizationSignup.options.aiUsage.no"),
                          value: "no",
                        },
                        {
                          label: t(
                            "organizationSignup.options.aiUsage.maybeLater",
                          ),
                          value: "maybe later",
                        },
                      ].map((option) => (
                        <div
                          key={option.value}
                          className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50"
                        >
                          <RadioGroupItem
                            value={option.value}
                            id={`bulk_${option.value}`}
                            className="border-2 border-gray-400"
                          />
                          <Label
                            htmlFor={`bulk_${option.value}`}
                            className="text-sm text-gray-700 cursor-pointer flex-1"
                          >
                            {option.label}
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
                  {t("organizationSignup.back")}
                </Button>
                <Button
                  onClick={handleStep2Next}
                  disabled={
                    updateProfileMutation.isPending || !canSubmitAgencyStep2
                  } // Disable while submitting
                  className={`flex-1 h-12 ${colors.button} text-white border-2 border-black rounded-none`}
                >
                  {updateProfileMutation.isPending
                    ? t("organizationSignup.submitting")
                    : t("organizationSignup.continue")}{" "}
                  {/* Dynamic text */}
                  <CheckCircle2 className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          )}
          {/* Step 2: Sports Agency */}
          {step === 2 && orgType === "sports_agency" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {t("organizationSignup.sportsAgency.title")}
                </h3>
                <p className="text-gray-600">
                  {t("organizationSignup.sportsAgency.subtitle")}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="talent_count"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    {t("organizationSignup.sportsAgency.athleteCount")}
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
                    {t(
                      "organizationSignup.sportsAgency.licenseAthletesQuestion",
                    )}
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
                    {t("organizationSignup.sportsAgency.openToAiQuestion")}
                  </Label>
                  <div className="space-y-3">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 p-3 border-2 border-black bg-gray-50 rounded-none mb-2">
                        <Checkbox
                          id="select_all_open_to_ai"
                          checked={getOpenToAiOptions(t).every((option) =>
                            formData.open_to_ai.includes(option.value),
                          )}
                          onCheckedChange={() =>
                            toggleSelectAll(
                              "open_to_ai",
                              getOpenToAiOptions(t).map((o) => o.value),
                            )
                          }
                          className="border-2 border-gray-900"
                        />
                        <label
                          htmlFor="select_all_open_to_ai"
                          className="text-sm font-bold text-gray-900 cursor-pointer flex-1"
                        >
                          {t("organizationSignup.selectAll")}
                        </label>
                      </div>
                      {getOpenToAiOptions(t).map((option) => (
                        <div
                          key={option.value}
                          className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50"
                        >
                          <Checkbox
                            id={option.value}
                            checked={formData.open_to_ai.includes(option.value)}
                            onCheckedChange={() =>
                              toggleArrayItem("open_to_ai", option.value)
                            }
                            className="border-2 border-gray-400"
                          />
                          <label
                            htmlFor={option.value}
                            className="text-sm text-gray-700 cursor-pointer flex-1"
                          >
                            {option.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-3 block">
                    {t("organizationSignup.sportsAgency.campaignTypesQuestion")}
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 flex items-center space-x-2 p-3 border-2 border-black bg-gray-50 rounded-none mb-2">
                      <Checkbox
                        id="select_all_campaign_types"
                        checked={getCampaignTypes(t).every((type) =>
                          formData.campaign_types.includes(type.value),
                        )}
                        onCheckedChange={() =>
                          toggleSelectAll(
                            "campaign_types",
                            getCampaignTypes(t).map((c) => c.value),
                          )
                        }
                        className="border-2 border-gray-900"
                      />
                      <label
                        htmlFor="select_all_campaign_types"
                        className="text-sm font-bold text-gray-900 cursor-pointer flex-1"
                      >
                        {t("organizationSignup.selectAll")}
                      </label>
                    </div>
                    {getCampaignTypes(t).map((type) => (
                      <div
                        key={type.value}
                        className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50"
                      >
                        <Checkbox
                          id={type.value}
                          checked={formData.campaign_types.includes(type.value)}
                          onCheckedChange={() =>
                            toggleArrayItem("campaign_types", type.value)
                          }
                          className="border-2 border-gray-400"
                        />
                        <label
                          htmlFor={type.value}
                          className="text-sm text-gray-700 cursor-pointer flex-1"
                        >
                          {type.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    {t("organizationSignup.sportsAgency.bulkOnboardQuestion")}
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
                  onClick={handleStep2Next}
                  disabled={
                    updateProfileMutation.isPending || !canSubmitAgencyStep2
                  } // Disable while submitting
                  className={`flex-1 h-12 ${colors.button} text-white border-2 border-black rounded-none`}
                >
                  {updateProfileMutation.isPending
                    ? t("organizationSignup.submitting")
                    : t("organizationSignup.continue")}{" "}
                  {/* Dynamic text */}
                  <CheckCircle2 className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          )}
          {/* Step 3: Terms & Agreements */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {t("organizationSignup.terms.title", "Terms & Agreements")}
                </h3>
                <p className="text-gray-600">
                  {t(
                    "organizationSignup.terms.subtitle",
                    "Please review and agree to the Privacy Policy and Terms of Service to complete your registration.",
                  )}
                </p>
              </div>

              <ScrollArea className="h-[600px] border-2 border-gray-200 rounded-none p-4 bg-gray-50">
                <div id="agency-terms-content">
                  <AgencyTermsContent />
                </div>
              </ScrollArea>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="border-2 border-black rounded-none"
                  onClick={() =>
                    window.open("/terms-and-conditions-agency.html", "_blank")
                  }
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>

              <div className="flex items-start space-x-3 p-4 border-2 border-black bg-gray-50 rounded-none">
                <Checkbox
                  id="org-agree-terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) =>
                    setAgreedToTerms(checked === true)
                  }
                  className="border-2 border-gray-900 mt-0.5"
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="org-agree-terms"
                    className="text-sm text-gray-700 cursor-pointer leading-relaxed"
                  >
                    I agree to the{" "}
                    <a
                      href="https://likelee.ai/privacypolicy"
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold underline text-indigo-600"
                    >
                      Privacy Policy
                    </a>{" "}
                    and Terms of Service.
                  </label>
                  <p className="text-sm text-gray-500">
                    {t(
                      "organizationSignup.terms.mustAgree",
                      "You must agree to the terms to complete your registration.",
                    )}
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
                  {t("organizationSignup.back")}
                </Button>
                <Button
                  onClick={handleFinalSubmit}
                  disabled={!agreedToTerms || updateProfileMutation.isPending}
                  className={`flex-1 h-12 ${colors.button} text-white border-2 border-black rounded-none`}
                >
                  {updateProfileMutation.isPending
                    ? t("organizationSignup.submitting")
                    : t(
                        "organizationSignup.terms.completeRegistration",
                        "Complete Registration",
                      )}{" "}
                  <CheckCircle2 className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Fallback for invalid state */}
          {step === 2 &&
            ![
              "brand_company",
              "production_studio",
              "marketing_agency",
              "talent_agency",
              "sports_agency",
            ].includes(orgType) && (
              <div className="text-center py-12">
                <h3 className="text-xl font-bold text-red-600 mb-2">
                  Error: Invalid Organization Type
                </h3>
                <p className="text-gray-600 mb-4">
                  We could not determine your organization type. Please try
                  refreshing the page or contacting support.
                </p>
                <p className="text-sm text-gray-400">
                  Debug Info: orgType="{orgType}", step={step}, profileId="
                  {profileId}"
                </p>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="mt-4"
                >
                  Refresh Page
                </Button>
              </div>
            )}
        </Card>
        <EmailOtpDialog
          open={emailVerificationPending}
          onOpenChange={setEmailVerificationPending}
          email={normalizeEmail(formData.email)}
          title="Verify your email"
          description="Enter the 6-digit code from your inbox to keep setup on this tab."
          helperText="Use resend if the email takes a moment to arrive."
          verifyLabel="Continue"
          onVerify={handleOrganizationOtpVerify}
          onResend={handleOrganizationOtpResend}
          theme={colors.otpTheme}
        />
      </div>
    </div>
  );
}
