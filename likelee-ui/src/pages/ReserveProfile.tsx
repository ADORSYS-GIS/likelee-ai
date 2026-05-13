import React, { useState, useEffect } from "react";
import { Button as UIButton } from "@/components/ui/button";
import { Input as UIInput } from "@/components/ui/input";
import { Label as UILabel } from "@/components/ui/label";
import { Checkbox as UICheckbox } from "@/components/ui/checkbox";
import { Card as UICard } from "@/components/ui/card";
import { Badge as UIBadge } from "@/components/ui/badge";
import { Textarea as UITextarea } from "@/components/ui/textarea";
import {
  RadioGroup as UIRadioGroup,
  RadioGroupItem as UIRadioGroupItem,
} from "@/components/ui/radio-group";
import {
  Select as UISelect,
  SelectContent as UISelectContent,
  SelectItem as UISelectItem,
  SelectTrigger as UISelectTrigger,
  SelectValue as UISelectValue,
} from "@/components/ui/select";
import { Slider as UISlider } from "@/components/ui/slider";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Download,
  Eye,
  EyeOff,
  Info,
} from "lucide-react";
import {
  Alert as UIAlert,
  AlertDescription as UIAlertDescription,
} from "@/components/ui/alert";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import { useTranslation } from "react-i18next";
import {
  clearAuthIntent,
  getDashboardPath,
  getOnboardingPath,
  isOnboardingIncomplete,
} from "@/auth/onboarding";

import { CreatorTermsContent } from "@/components/CreatorTermsContent";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmailOtpDialog } from "@/components/auth/EmailOtpDialog";
import { DuplicateEmailModal } from "@/components/auth/DuplicateEmailModal";
import { DobInput } from "@/components/ui/DobInput";
import {
  normalizeEmail,
  resendSignupEmailOtp,
  verifyEmailOtpCode,
} from "@/lib/emailOtp";

// Cast UI components to any to avoid TS forwardRef prop typing frictions within this large form file only
const Button: any = UIButton;
const Input: any = UIInput;
const Label: any = UILabel;
const Checkbox: any = UICheckbox;
const Card: any = UICard;
const Badge: any = UIBadge;
const Textarea: any = UITextarea;
const RadioGroup: any = UIRadioGroup;
const RadioGroupItem: any = UIRadioGroupItem;
const Select: any = UISelect;
const SelectContent: any = UISelectContent;
const SelectItem: any = UISelectItem;
const SelectTrigger: any = UISelectTrigger;
const SelectValue: any = UISelectValue;
const Slider: any = UISlider;
const Alert: any = UIAlert;
const AlertDescription: any = UIAlertDescription;

const TOTAL_STEPS = 3;

const LEGACY_ONBOARDING_STEP_MAP: Record<string, number> = {
  email_verification: 1,
  verification: 1,
  profile_details: 2,
  agreements: 3,
  complete: TOTAL_STEPS + 1,
};

function mapLegacyOnboardingStep(raw?: string | null): number | null {
  if (!raw) return null;
  const key = String(raw).trim().toLowerCase();
  if (LEGACY_ONBOARDING_STEP_MAP[key] !== undefined) {
    return LEGACY_ONBOARDING_STEP_MAP[key];
  }
  return null;
}

function clampStep(step: number): number {
  if (!Number.isFinite(step) || step < 1) return 1;
  if (step > TOTAL_STEPS) return TOTAL_STEPS;
  return step;
}

const contentTypes = [
  "Social media ads",
  "Web & banner campaigns",
  "TV / streaming commercials",
  "Film & scripted streaming",
  "Print & outdoor ads",
  "Music videos",
  "Video-game / VR characters",
  "Stock photo / video libraries",
  "Other",
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
  "Open to any industry",
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
  "Other",
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
  "Open to any brand",
];

const sportsOptions = [
  "Football",
  "Basketball",
  "Baseball",
  "Soccer",
  "Tennis",
  "Golf",
  "Track & Field",
  "Swimming",
  "Gymnastics",
  "Volleyball",
  "Wrestling",
  "Boxing",
  "MMA",
  "Hockey",
  "Lacrosse",
  "Softball",
  "Cheerleading",
  "Dance",
  "Esports",
  "Other",
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
  "Prefer not to say",
];

const hairColors = [
  "Black",
  "Brown",
  "Blonde",
  "Red",
  "Gray/White",
  "Dyed (specify below)",
];
const eyeColors = ["Brown", "Blue", "Green", "Hazel", "Gray", "Amber"];
const skinTones = [
  "Fair",
  "Light",
  "Medium-Light",
  "Medium",
  "Medium-Dark",
  "Dark",
  "Deep",
];
const vibes = [
  "Streetwear",
  "Glam",
  "Natural",
  "Classic",
  "Edgy",
  "Athletic",
  "Runway",
  "Editorial",
  "Commercial",
  "Casual",
];

// Utility function to convert technical errors into user-friendly messages
function getUserFriendlyError(error: any, t: any): string {
  const errorStr = String(error?.message || error || "").toLowerCase();

  // Email/Auth errors
  if (errorStr.includes("duplicate") && errorStr.includes("email")) {
    return t("reserveProfile.errors.duplicateEmail");
  }
  if (errorStr.includes("invalid") && errorStr.includes("email")) {
    return t("reserveProfile.errors.invalidEmail");
  }
  if (errorStr.includes("weak") || errorStr.includes("password")) {
    return t("reserveProfile.errors.weakPassword");
  }
  if (
    errorStr.includes("not authenticated") ||
    errorStr.includes("unauthorized")
  ) {
    return t("reserveProfile.errors.notAuthenticated");
  }

  // Upload/Storage errors
  if (errorStr.includes("file size") || errorStr.includes("too large")) {
    return t("reserveProfile.errors.fileTooLarge");
  }
  if (errorStr.includes("file type") || errorStr.includes("invalid format")) {
    return t("reserveProfile.errors.invalidFileType");
  }

  // Network errors
  if (errorStr.includes("network") || errorStr.includes("fetch failed")) {
    return t("reserveProfile.errors.networkError");
  }
  if (errorStr.includes("timeout")) {
    return t("reserveProfile.errors.timeout");
  }

  // Permission errors
  if (errorStr.includes("permission") || errorStr.includes("denied")) {
    return t("reserveProfile.errors.permissionDenied");
  }

  // Generic fallback
  if (errorStr.includes("failed")) {
    return t("reserveProfile.errors.genericFailed");
  }

  // If we have a clean message without technical jargon, use it
  const msg = error?.message || String(error);
  if (msg.includes("Invalid login credentials")) {
    return t("reserveProfile.toasts.invalidCredentials");
  }

  if (msg.length < 100 && !msg.includes("{") && !msg.includes("[")) {
    return msg;
  }

  return t("reserveProfile.errors.unknown");
}

export default function ReserveProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const creatorType = urlParams.get("type") || "influencer"; // influencer, model_actor, athlete
  const initialMode = (urlParams.get("mode") as "signup" | "login") || "login";
  const [authMode, setAuthMode] = useState<"signup" | "login">(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { login, refreshProfile, user, authenticated, profile, initialized } =
    useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Check if user arrived via OAuth
  const isOAuthSignup =
    authenticated &&
    (user?.app_metadata?.provider === "google" ||
      user?.app_metadata?.provider === "github");

  const [step, setStep] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const stepParam = params.get("step");
    if (stepParam) return clampStep(parseInt(stepParam, 10));
    if (isOAuthSignup) return 2;
    const saved = localStorage.getItem("reserve_step");
    return saved ? clampStep(parseInt(saved, 10)) : 1;
  });

  useEffect(() => {
    localStorage.setItem("reserve_step", clampStep(step).toString());
  }, [step]);

  const [showWarning, setShowWarning] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(() => {
    return sessionStorage.getItem("reserve_agreedToTerms") === "true";
  });

  useEffect(() => {
    sessionStorage.setItem("reserve_agreedToTerms", String(agreedToTerms));
  }, [agreedToTerms]);

  const [profileId, setProfileId] = useState<string | null>(() => {
    return localStorage.getItem("reserve_profileId") || null;
  });

  useEffect(() => {
    if (profileId) {
      localStorage.setItem("reserve_profileId", profileId);
    }
  }, [profileId]);

  const [formData, setFormData] = useState(() => {
    const saved = sessionStorage.getItem("reserve_formData");
    return saved
      ? JSON.parse(saved)
      : {
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
          // Pricing (USD-only)
          base_monthly_price_usd: "",

          // Influencer specific
          content_types: [],
          content_other: "",
          industries: [],
          primary_platform: "",

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
          bio: "",
        };
  });

  useEffect(() => {
    const { password, confirmPassword, ...safeData } = formData;
    sessionStorage.setItem("reserve_formData", JSON.stringify(safeData));
  }, [formData]);

  // Pre-fill email and set profileId for OAuth users
  useEffect(() => {
    if (isOAuthSignup && user?.email && !formData.email) {
      setFormData((prev) => ({ ...prev, email: user.email || "" }));
      if (user.id) {
        setProfileId(user.id);
      }
    }
  }, [isOAuthSignup, user, formData.email]);

  useEffect(() => {
    if (isOAuthSignup) {
      setAuthMode("signup");
      setStep((currentStep) => (currentStep < 2 ? 2 : currentStep));
    }
  }, [isOAuthSignup]);

  useEffect(() => {
    if (!initialized || !authenticated || profile === undefined) {
      return;
    }

    if (!profile) {
      const authRole = String(
        user?.user_metadata?.role || user?.app_metadata?.role || "",
      )
        .trim()
        .toLowerCase();
      if (authRole === "creator" || authRole === "talent" || isOAuthSignup) {
        if (user?.email) {
          setFormData((prev) =>
            prev.email ? prev : { ...prev, email: user.email || "" },
          );
        }
        if (user?.id) {
          setProfileId(user.id);
        }
        setAuthMode("signup");
        setStep((currentStep) => (currentStep < 2 ? 2 : currentStep));
      }
      return;
    }

    if (profile.role !== "creator" && profile.role !== "talent") {
      navigate(getDashboardPath(profile), { replace: true });
      return;
    }

    if (
      profile.creator_type &&
      profile.creator_type !== creatorType &&
      window.location.pathname === "/ReserveProfile"
    ) {
      navigate(
        `/ReserveProfile?type=${encodeURIComponent(profile.creator_type)}&mode=signup`,
        { replace: true },
      );
      return;
    }

    setProfileId(profile.id || user?.id || null);
    const profileIsIncomplete = isOnboardingIncomplete(profile);

    setFormData((prev) => ({
      ...prev,
      creator_type: profile.creator_type || prev.creator_type,
      email: profile.email || user?.email || prev.email,
      full_name: profile.full_name || prev.full_name,
      stage_name: profile.stage_name || prev.stage_name,
      city: profile.city || prev.city,
      state: profile.state || prev.state,
      birthdate: profile.birthdate || prev.birthdate,
      gender: profile.gender || prev.gender,
      ethnicity: Array.isArray(profile.ethnicity)
        ? profile.ethnicity
        : prev.ethnicity,
      vibes: Array.isArray(profile.vibes) ? profile.vibes : prev.vibes,
      // Invite/onboarding flows do not expose visibility selection yet, so keep
      // in-progress profiles private until the creator explicitly enables it later.
      visibility: profileIsIncomplete
        ? "private"
        : profile.visibility || prev.visibility,
      base_monthly_price_usd:
        typeof profile.base_monthly_price_cents === "number" &&
        profile.base_monthly_price_cents > 0
          ? String(profile.base_monthly_price_cents / 100)
          : prev.base_monthly_price_usd,
      content_types: Array.isArray(profile.content_types)
        ? profile.content_types
        : prev.content_types,
      content_other: profile.content_other || prev.content_other,
      industries: Array.isArray(profile.industries)
        ? profile.industries
        : prev.industries,
      primary_platform: profile.primary_platform || prev.primary_platform,
      instagram_handle: profile.instagram_handle || prev.instagram_handle,
      work_types: Array.isArray(profile.work_types)
        ? profile.work_types
        : prev.work_types,
      representation_status:
        profile.representation_status || prev.representation_status,
      headshot_url: profile.headshot_url || prev.headshot_url,
      sport: profile.sport || prev.sport,
      athlete_type: profile.athlete_type || prev.athlete_type,
      school_name: profile.school_name || prev.school_name,
      age: profile.age ? String(profile.age) : prev.age,
      languages: profile.languages || prev.languages,
      twitter_handle: profile.twitter_handle || prev.twitter_handle,
      brand_categories: Array.isArray(profile.brand_categories)
        ? profile.brand_categories
        : prev.brand_categories,
      bio: profile.bio || prev.bio,
    }));

    if (!isOnboardingIncomplete(profile)) {
      const dashboardPath = getDashboardPath(profile);
      // Prevent redirecting to dashboard if we are actively trying to agree to terms (step 4)
      // or if we just returned from the terms page with local state indicating we are on step 4
      const isActivelyOnboardingLocally = step > 1 && !profileSaveLoading;

      // We only force you to dashboard if server says completed AND we aren't in the middle
      // of confirming the final step locally (which can happen on a tab visibility change
      // before finalizing the profile).
      if (
        !profileSaveLoading &&
        !isActivelyOnboardingLocally &&
        window.location.pathname !== dashboardPath.split("?")[0]
      ) {
        navigate(dashboardPath, { replace: true });
      }
      return;
    }

    const resumePath = getOnboardingPath(profile);
    if (resumePath && window.location.pathname !== resumePath.split("?")[0]) {
      navigate(resumePath, { replace: true });
      return;
    }

    setAuthMode("signup");

    const serverStep = mapLegacyOnboardingStep(profile.onboarding_step);
    if (serverStep !== null) {
      if (serverStep > TOTAL_STEPS) {
        const dashboardPath = getDashboardPath(profile);
        if (window.location.pathname !== dashboardPath.split("?")[0]) {
          navigate(dashboardPath, { replace: true });
        }
        return;
      }
      setStep(clampStep(serverStep));
      return;
    }
    const sanitizedLocal = clampStep(step);
    if (sanitizedLocal !== step) {
      setStep(sanitizedLocal);
    }
  }, [
    authenticated,
    creatorType,
    initialized,
    isOAuthSignup,
    navigate,
    profile,
    user,
  ]);

  const [signupOtpOpen, setSignupOtpOpen] = useState(false);
  const [duplicateEmailModalOpen, setDuplicateEmailModalOpen] = useState(false);

  const requireSupabase = () => {
    if (!supabase) {
      throw new Error("Supabase not configured");
    }

    return supabase;
  };

  const handleCreatorOtpVerify = async (code: string) => {
    const client = requireSupabase();
    const data = await verifyEmailOtpCode(client, {
      email: formData.email,
      token: code,
      purpose: "signup",
    });

    setProfileId(data.user?.id || null);
    setSignupOtpOpen(false);
    setStep(2);
    toast({
      title: t("reserveProfile.otp.title", "Verify your email"),
      description: t(
        "reserveProfile.otp.successDescription",
        "Email verified. Continue your profile setup below.",
      ),
    });
  };

  const handleCreatorOtpResend = async (showToast = true) => {
    const client = requireSupabase();
    await resendSignupEmailOtp(client, formData.email);

    if (showToast) {
      toast({
        title: t("reserveProfile.otp.codeSentTitle", "Code sent"),
        description: t(
          "reserveProfile.otp.codeSentDescription",
          "We sent a fresh 6-digit code to your inbox.",
        ),
      });
    }
  };

  const totalSteps = TOTAL_STEPS;
  const progress = (step / totalSteps) * 100;

  const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || "";
  const API_BASE_ABS = (() => {
    try {
      if (!API_BASE) return new URL("/api", window.location.origin).toString();
      if (API_BASE.startsWith("http")) return API_BASE;
      return new URL(API_BASE, window.location.origin).toString();
    } catch {
      return new URL("/api", window.location.origin).toString();
    }
  })();
  const api = (path: string) => new URL(path, API_BASE_ABS).toString();
  const [firstContinueLoading, setFirstContinueLoading] = useState(false);
  const [profileSaveLoading, setProfileSaveLoading] = useState(false);

  const getStepTitle = () => {
    if (step === 1) return t("reserveProfile.stepTitles.step1");
    if (step === 2) {
      if (creatorType === "influencer")
        return t("reserveProfile.stepTitles.step2.influencer");
      if (creatorType === "model_actor")
        return t("reserveProfile.stepTitles.step2.model_actor");
      if (creatorType === "athlete")
        return t("reserveProfile.stepTitles.step2.athlete");
    }
    if (step === 3) return "Terms & Agreements";
    return "";
  };

  const visibilityEnablesPublicProfile = (visibility?: string) => {
    const normalized = String(visibility || "")
      .trim()
      .toLowerCase();
    return (
      normalized === "public" ||
      normalized === "brands" ||
      normalized === "visible_to_brands" ||
      normalized === "true"
    );
  };

  const resolveCreatorOnboardingStep = ({
    markComplete = false,
    onboardingStep,
  }: {
    markComplete?: boolean;
    onboardingStep?: string;
  }) => {
    if (markComplete) return "complete";
    if (onboardingStep) return onboardingStep;
    if (step >= TOTAL_STEPS) return "agreements";
    return "profile_details";
  };

  const buildCreatorPayload = (
    data: typeof formData,
    {
      markComplete = false,
      onboardingStep,
    }: { markComplete?: boolean; onboardingStep?: string } = {},
  ) => {
    const monthlyPriceUsd = Number(data.base_monthly_price_usd);
    const hasMonthlyPrice =
      Number.isFinite(monthlyPriceUsd) && monthlyPriceUsd > 0;
    return {
      email: data.email,
      full_name:
        data.creator_type === "model_actor"
          ? data.stage_name || data.full_name
          : data.full_name,
      creator_type: data.creator_type,
      content_types: data.content_types || [],
      content_other: data.content_other || null,
      industries: data.industries || [],
      primary_platform: data.primary_platform || null,
      instagram_handle: data.instagram_handle || null,
      work_types: data.work_types || [],
      representation_status: data.representation_status || "",
      headshot_url: data.headshot_url || "",
      sport: data.sport || null,
      athlete_type: data.athlete_type || null,
      school_name: data.school_name || null,
      age: data.age || null,
      languages: data.languages || null,
      twitter_handle: data.twitter_handle || null,
      brand_categories: data.brand_categories || [],
      bio: data.bio || null,
      city: data.city || "",
      state: data.state || "",
      birthdate: data.birthdate || null,
      ethnicity: data.ethnicity || [],
      gender: data.gender || "",
      vibes: data.vibes || [],
      visibility: data.visibility || "private",
      public_profile_visible: visibilityEnablesPublicProfile(data.visibility),
      base_monthly_price_cents: hasMonthlyPrice
        ? Math.round(monthlyPriceUsd * 100)
        : undefined,
      currency_code: hasMonthlyPrice ? "USD" : undefined,
      status: "waitlist",
      onboarding_step: resolveCreatorOnboardingStep({
        markComplete,
        onboardingStep,
      }),
    };
  };

  const saveCreatorProfile = async (
    data: typeof formData = formData,
    options: { markComplete?: boolean; onboardingStep?: string } = {},
  ) => {
    const session = (await supabase.auth.getSession())?.data?.session;
    if (!session?.access_token || !session.user?.id) {
      throw new Error("Not authenticated");
    }

    const res = await fetch(
      api(`/api/profile?user_id=${encodeURIComponent(session.user.id)}`),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(buildCreatorPayload(data, options)),
      },
    );

    if (!res.ok) {
      throw new Error(await res.text());
    }

    const responseData = await res.json();
    const savedProfile =
      Array.isArray(responseData) && responseData.length
        ? responseData[0]
        : responseData;
    setProfileId(savedProfile?.id || session.user.id);
    return savedProfile ?? { id: session.user.id };
  };

  const handleFirstContinue = () => {
    if (!formData.email) {
      toast({
        title: t("reserveProfile.toasts.emailRequiredTitle"),
        description: t("reserveProfile.toasts.emailRequiredDesc"),
        className: "bg-cyan-50 border-2 border-cyan-400",
      });
      return;
    }
    if (!formData.password) {
      toast({
        title: t("reserveProfile.toasts.passwordRequiredTitle"),
        description: t("reserveProfile.toasts.passwordRequiredDesc"),
        className: "bg-cyan-50 border-2 border-cyan-400",
      });
      return;
    }
    if (!formData.confirmPassword) {
      toast({
        title: t("reserveProfile.toasts.confirmPasswordTitle"),
        description: t("reserveProfile.toasts.confirmPasswordDesc"),
        className: "bg-cyan-50 border-2 border-cyan-400",
      });
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: t("reserveProfile.toasts.passwordsDoNotMatchTitle"),
        description: t("reserveProfile.toasts.passwordsDoNotMatchDesc"),
        className: "bg-cyan-50 border-2 border-cyan-400",
      });
      return;
    }
    if (
      creatorType === "model_actor" &&
      !formData.stage_name &&
      !formData.full_name
    ) {
      toast({
        title: t("reserveProfile.toasts.nameRequiredTitle"),
        description: t("reserveProfile.toasts.nameRequiredDesc"),
        className: "bg-cyan-50 border-2 border-cyan-400",
      });
      return;
    }
    if (creatorType !== "model_actor" && !formData.full_name) {
      toast({
        title: t("reserveProfile.toasts.nameRequiredTitle"),
        description: t("reserveProfile.toasts.nameRequiredDesc"),
        className: "bg-cyan-50 border-2 border-cyan-400",
      });
      return;
    }

    // Check email availability, then register in Firebase, then create profile
    if (firstContinueLoading) return;
    setFirstContinueLoading(true);
    (async () => {
      try {
        const res = await fetch(
          api(
            `/api/email/available?email=${encodeURIComponent(formData.email)}`,
          ),
        );
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (!data.available) {
          setAuthMode("login");
          setDuplicateEmailModalOpen(true);
          return;
        }
        // Create Supabase auth user and keep verification on the current page.
        const displayName =
          creatorType === "model_actor"
            ? formData.stage_name || formData.full_name
            : formData.full_name;
        const client = requireSupabase();
        const { data: signUpData, error } = await client.auth.signUp({
          email: normalizeEmail(formData.email),
          password: formData.password,
          options: {
            data: {
              full_name: displayName || null,
              role: "creator",
            },
          },
        });
        if (error) throw error;
        if (!signUpData.session) {
          setSignupOtpOpen(true);
          toast({
            title: t("reserveProfile.otp.title", "Verify your email"),
            description: t(
              "reserveProfile.otp.description",
              "Enter the 6-digit code we emailed you to continue onboarding without leaving this page.",
            ),
          });
          return;
        }
        setProfileId(signUpData.user?.id || null);
        setStep(2);
      } catch (e: any) {
        toast({
          title: t("reserveProfile.toasts.signupFailed"),
          description: getUserFriendlyError(e, t),
          variant: "destructive",
        });
        const msg = (e?.message || "").toLowerCase();
        if (
          msg.includes("already registered") ||
          msg.includes("already exists")
        ) {
          setAuthMode("login");
          setDuplicateEmailModalOpen(true);
        } else {
          toast({
            title: "Sign-up Failed",
            description: getUserFriendlyError(e, t),
            variant: "destructive",
          });
        }
      } finally {
        setFirstContinueLoading(false);
      }
    })();
  };

  const handleNext = () => {
    // Step validations
    if (step === 2) {
      // Common validations for step 2 per creator type
      if (creatorType === "influencer") {
        if (!formData.city?.trim()) {
          toast({
            title: t("reserveProfile.toasts.cityRequiredTitle"),
            description: t("reserveProfile.toasts.cityRequiredDesc"),
            className: "bg-cyan-50 border-2 border-cyan-400",
          });
          return;
        }
        if (!formData.state?.trim()) {
          toast({
            title: t("reserveProfile.toasts.stateRequiredTitle"),
            description: t("reserveProfile.toasts.stateRequiredDesc"),
            className: "bg-cyan-50 border-2 border-cyan-400",
          });
          return;
        }
        if (!formData.birthdate) {
          toast({
            title: t("reserveProfile.toasts.birthdateRequiredTitle"),
            description: t("reserveProfile.toasts.birthdateRequiredDesc"),
            className: "bg-cyan-50 border-2 border-cyan-400",
          });
          return;
        }
        // 18+ check
        const birth = new Date(formData.birthdate);
        const today = new Date();
        const age =
          today.getFullYear() -
          birth.getFullYear() -
          (today.getMonth() < birth.getMonth() ||
          (today.getMonth() === birth.getMonth() &&
            today.getDate() < birth.getDate())
            ? 1
            : 0);
        if (isFinite(age) && age < 18) {
          toast({
            title: t("reserveProfile.toasts.ageRestrictionTitle"),
            description: t("reserveProfile.toasts.ageRestrictionDesc"),
            variant: "destructive",
          });
          return;
        }
        if (!formData.gender?.trim()) {
          toast({
            title: t("reserveProfile.toasts.genderRequiredTitle"),
            description: t("reserveProfile.toasts.genderRequiredDesc"),
            className: "bg-cyan-50 border-2 border-cyan-400",
          });
          return;
        }
      }
    }
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (isOAuthSignup && step === 2) return;
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    try {
      setProfileSaveLoading(true);
      await saveCreatorProfile(formData, { onboardingStep: "agreements" });
      await refreshProfile();
      setStep(3);
    } catch (e: any) {
      toast({
        title: t("reserveProfile.toasts.profileUpdateFailed"),
        description: getUserFriendlyError(e, t),
        variant: "destructive",
      });
    } finally {
      setProfileSaveLoading(false);
    }
  };

  const finalizeProfile = async () => {
    if (!agreedToTerms) {
      toast({
        variant: "destructive",
        title: t("reserveProfile.terms.mustAgreeTitle", "Agreement Required"),
        description: t(
          "reserveProfile.terms.mustAgree",
          "You must agree to the Creator & Talent Terms to create your account.",
        ),
      });
      return;
    }
    try {
      setProfileSaveLoading(true);
      // Mark profile as complete
      await saveCreatorProfile(formData, { markComplete: true });
      await refreshProfile();
      // Clear persisted state on success
      localStorage.removeItem("reserve_step");
      localStorage.removeItem("reserve_profileId");
      sessionStorage.removeItem("reserve_formData");
      sessionStorage.removeItem("reserve_agreedToTerms");
      // Clear auth intent after successful profile completion
      clearAuthIntent();
      navigate("/CreatorSubscribe", { replace: true });
    } catch (e: any) {
      toast({
        title: t("reserveProfile.toasts.profileSaveFailed"),
        description: getUserFriendlyError(e, t),
        variant: "destructive",
      });
    } finally {
      setProfileSaveLoading(false);
    }
  };

  const toggleArrayItem = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((item) => item !== value)
        : [...prev[field], value],
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-blue-50 py-12 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Warning Message */}
        {showWarning && step === 1 && (
          <Alert className="bg-cyan-50 border-cyan-200 mb-8">
            <Info className="h-5 w-5 text-cyan-700" />
            <AlertDescription className="text-sm font-medium text-cyan-900">
              {t("reserveProfile.warning.limitedBatches")}
            </AlertDescription>
          </Alert>
        )}

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {t("reserveProfile.title")}
            </h2>
            <Badge className="bg-cyan-100 text-cyan-700 border-2 border-black rounded-none">
              {t("reserveProfile.stepProgress", { step, total: totalSteps })}
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
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {getStepTitle()}
                </h3>
                <p className="text-gray-600">
                  {t(`reserveProfile.stepDescriptions.step1.${creatorType}`)}
                </p>
              </div>

              {/* Auth mode switch */}
              <div className="flex gap-2">
                <Button
                  variant={authMode === "signup" ? "default" : "outline"}
                  className="rounded-none border-2 border-black"
                  onClick={() => setAuthMode("signup")}
                >
                  {t("reserveProfile.actions.signup")}
                </Button>
                <Button
                  variant={authMode === "login" ? "default" : "outline"}
                  className="rounded-none border-2 border-black"
                  onClick={() => setAuthMode("login")}
                >
                  {t("reserveProfile.actions.login")}
                </Button>
              </div>

              {authMode === "signup" ? (
                <div className="space-y-4">
                  <div>
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      {t("reserveProfile.form.labels.email")}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="border-2 border-gray-300 rounded-none"
                      placeholder={t("reserveProfile.form.placeholders.email")}
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="password"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      {t("reserveProfile.form.labels.password")}
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
                        placeholder={t(
                          "reserveProfile.form.placeholders.password",
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label
                      htmlFor="confirmPassword"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      {t("reserveProfile.form.labels.confirmPassword")}
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
                          "reserveProfile.form.placeholders.confirmPassword",
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
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label
                      htmlFor="full_name"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      {creatorType === "model_actor"
                        ? t("reserveProfile.form.labels.fullName")
                        : t("reserveProfile.form.labels.fullName")}
                    </Label>
                    <Input
                      id="full_name"
                      type="text"
                      value={
                        creatorType === "model_actor"
                          ? formData.stage_name || formData.full_name
                          : formData.full_name
                      }
                      onChange={(e: any) =>
                        setFormData({
                          ...formData,
                          [creatorType === "model_actor"
                            ? "stage_name"
                            : "full_name"]: e.target.value,
                        })
                      }
                      className="border-2 border-gray-300 rounded-none"
                      placeholder={
                        creatorType === "model_actor"
                          ? t("reserveProfile.form.placeholders.stageName")
                          : t("reserveProfile.form.placeholders.fullName")
                      }
                    />
                  </div>
                  <Button
                    onClick={handleFirstContinue}
                    disabled={firstContinueLoading}
                    className="w-full h-12 bg-gradient-to-r from-[#32C8D1] to-teal-500 hover:from-[#2AB8C1] hover:to-teal-600 text-white border-2 border-black rounded-none"
                  >
                    {firstContinueLoading
                      ? t("common.checking", "Checking...")
                      : t("common.continue", "Continue")}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              ) : (
                <form
                  className="space-y-4"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      await login(formData.email, formData.password);
                    } catch (err: any) {
                      const msg = err?.message || "Failed to sign in";
                      toast({
                        title: t("reserveProfile.form.validation.signInFailed"),
                        description: msg,
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <div>
                    <Label
                      htmlFor="login_email"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      {t("reserveProfile.form.labels.email")}
                    </Label>
                    <Input
                      id="login_email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="border-2 border-gray-300 rounded-none"
                      placeholder={t("reserveProfile.form.placeholders.email")}
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="login_password"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      {t("reserveProfile.form.labels.password")}
                    </Label>
                    <div className="relative">
                      <Input
                        id="login_password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        className="border-2 border-gray-300 rounded-none pr-10"
                        placeholder={t(
                          "reserveProfile.form.placeholders.password",
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <div className="text-right mt-1">
                      <Link
                        to="/forgot-password"
                        className="text-sm text-cyan-600 hover:underline"
                      >
                        {t("reserveProfile.form.forgotPassword")}
                      </Link>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-12 bg-black text-white border-2 border-black rounded-none"
                  >
                    {t("reserveProfile.actions.login")}
                  </Button>
                </form>
              )}
            </div>
          )}

          {/* Step 2: Profile Details (varies by type) */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {getStepTitle()}
                </h3>
                <p className="text-gray-600">
                  {t(`reserveProfile.stepDescriptions.step2.${creatorType}`)}
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="city"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      {t("reserveProfile.form.labels.city")}
                    </Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      className="border-2 border-gray-300 rounded-none"
                      placeholder={t("reserveProfile.form.placeholders.city")}
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="state"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      {t("reserveProfile.form.labels.state")}
                    </Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) =>
                        setFormData({ ...formData, state: e.target.value })
                      }
                      className="border-2 border-gray-300 rounded-none"
                      placeholder={t("reserveProfile.form.placeholders.state")}
                    />
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="birthdate"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    {creatorType === "athlete"
                      ? t("reserveProfile.form.age")
                      : t("reserveProfile.form.birthdate")}
                  </Label>
                  {creatorType === "athlete" ? (
                    <Input
                      id="age"
                      type="number"
                      value={formData.age}
                      onChange={(e) =>
                        setFormData({ ...formData, age: e.target.value })
                      }
                      className="border-2 border-gray-300 rounded-none"
                      placeholder={t("reserveProfile.form.placeholders.age")}
                    />
                  ) : (
                    <DobInput
                      value={formData.birthdate}
                      onChange={(iso) =>
                        setFormData({ ...formData, birthdate: iso })
                      }
                      variant="sharp"
                      minAge={18}
                    />
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-3 block">
                    {t("reserveProfile.form.gender")}
                  </Label>
                  <RadioGroup
                    value={formData.gender}
                    onValueChange={(value) =>
                      setFormData({ ...formData, gender: value })
                    }
                  >
                    <div className="space-y-2">
                      {[
                        "Female",
                        "Male",
                        "Nonbinary",
                        "Gender fluid",
                        "Prefer not to say",
                      ].map((option) => (
                        <div
                          key={option}
                          className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50"
                        >
                          <RadioGroupItem
                            value={option}
                            id={option}
                            className="border-2 border-gray-400"
                          />
                          <Label
                            htmlFor={option}
                            className="text-sm text-gray-700 cursor-pointer flex-1"
                          >
                            {t(
                              `reserveProfile.form.genderOptions.${
                                option === "Prefer not to say"
                                  ? "preferNotToSay"
                                  : option === "Gender fluid"
                                    ? "genderFluid"
                                    : option.toLowerCase()
                              }`,
                              option,
                            )}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-3 block">
                    {t("reserveProfile.form.raceEthnicity")}
                  </Label>
                  <div className="flex items-center space-x-2 p-3 border-2 border-gray-300 rounded-none bg-gray-50 mb-3">
                    <Checkbox
                      id="select-all-ethnicity"
                      checked={ethnicities.every((eth) =>
                        formData.ethnicity.includes(eth),
                      )}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({
                            ...formData,
                            ethnicity: [...ethnicities],
                          });
                        } else {
                          setFormData({ ...formData, ethnicity: [] });
                        }
                      }}
                      className="border-2 border-gray-400"
                    />
                    <label
                      htmlFor="select-all-ethnicity"
                      className="text-sm font-medium text-gray-700 cursor-pointer flex-1"
                    >
                      {t("reserveProfile.form.selectAll", "Select All")}
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {ethnicities.map((ethnicity) => (
                      <div
                        key={ethnicity}
                        className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50"
                      >
                        <Checkbox
                          id={ethnicity}
                          checked={formData.ethnicity.includes(ethnicity)}
                          onCheckedChange={() =>
                            toggleArrayItem("ethnicity", ethnicity)
                          }
                          className="border-2 border-gray-400"
                        />
                        <label
                          htmlFor={ethnicity}
                          className="text-sm text-gray-700 cursor-pointer flex-1"
                        >
                          {t(
                            `common.raceEthnicity.options.${ethnicity}`,
                            ethnicity,
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Athlete-specific fields */}
                {creatorType === "athlete" && (
                  <>
                    <div>
                      <Label
                        htmlFor="sport"
                        className="text-sm font-medium text-gray-700 mb-2 block"
                      >
                        {t("reserveProfile.form.sport")}
                      </Label>
                      <Select
                        value={formData.sport}
                        onValueChange={(value) =>
                          setFormData({ ...formData, sport: value })
                        }
                      >
                        <SelectTrigger className="border-2 border-gray-300 rounded-none">
                          <SelectValue
                            placeholder={t(
                              "reserveProfile.form.placeholders.sport",
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {sportsOptions.map((sport) => (
                            <SelectItem key={sport} value={sport}>
                              {t(`common.sports.${sport}`, sport)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-3 block">
                        {t("reserveProfile.form.athleteType")}
                      </Label>
                      <RadioGroup
                        value={formData.athlete_type}
                        onValueChange={(value) =>
                          setFormData({ ...formData, athlete_type: value })
                        }
                      >
                        <div className="space-y-2">
                          {["University", "Professional", "Independent"].map(
                            (option) => (
                              <div
                                key={option}
                                className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50"
                              >
                                <RadioGroupItem
                                  value={option}
                                  id={option}
                                  className="border-2 border-gray-400"
                                />
                                <Label
                                  htmlFor={option}
                                  className="text-sm text-gray-700 cursor-pointer flex-1"
                                >
                                  {t(
                                    `reserveProfile.form.athleteTypes.${option}`,
                                    option,
                                  )}
                                </Label>
                              </div>
                            ),
                          )}
                        </div>
                      </RadioGroup>
                    </div>

                    {formData.athlete_type === "University" && (
                      <div>
                        <Label
                          htmlFor="school_name"
                          className="text-sm font-medium text-gray-700 mb-2 block"
                        >
                          {t("reserveProfile.form.schoolName")}
                        </Label>
                        <Input
                          id="school_name"
                          value={formData.school_name}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              school_name: e.target.value,
                            })
                          }
                          className="border-2 border-gray-300 rounded-none"
                          placeholder={t(
                            "reserveProfile.form.placeholders.schoolName",
                          )}
                        />
                      </div>
                    )}

                    <div>
                      <Label
                        htmlFor="languages"
                        className="text-sm font-medium text-gray-700 mb-2 block"
                      >
                        {t("reserveProfile.form.languages")}
                      </Label>
                      <Input
                        id="languages"
                        value={formData.languages}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            languages: e.target.value,
                          })
                        }
                        className="border-2 border-gray-300 rounded-none"
                        placeholder={t(
                          "reserveProfile.form.placeholders.languages",
                        )}
                      />
                    </div>
                  </>
                )}

                {/* Model-specific fields */}
                {creatorType === "model_actor" && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-medium text-gray-900">
                        {t("reserveProfile.form.selectMax3")}
                      </Label>
                      <span className="text-xs text-gray-500">
                        {t(
                          "reserveProfile.form.specifyMoreLater",
                          "You can specify more later",
                        )}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 p-3 border-2 border-gray-300 rounded-none bg-gray-50 mb-3">
                      <Checkbox
                        id="select-all-work-types"
                        checked={modelWorkTypes.every((type) =>
                          formData.work_types.includes(type),
                        )}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              work_types: [...modelWorkTypes],
                            });
                          } else {
                            setFormData({ ...formData, work_types: [] });
                          }
                        }}
                        className="border-2 border-gray-400"
                      />
                      <label
                        htmlFor="select-all-work-types"
                        className="text-sm font-medium text-gray-700 cursor-pointer flex-1"
                      >
                        {t("reserveProfile.form.selectAll", "Select All")}
                      </label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-2 border-2 border-gray-200 rounded-none">
                      {modelWorkTypes.map((type) => (
                        <div
                          key={type}
                          className="flex items-center space-x-2 p-2 hover:bg-gray-50"
                        >
                          <Checkbox
                            id={type}
                            checked={formData.work_types.includes(type)}
                            onCheckedChange={() => {
                              if (formData.work_types.includes(type)) {
                                toggleArrayItem("work_types", type);
                              } else if (formData.work_types.length < 3) {
                                toggleArrayItem("work_types", type);
                              } else {
                                toast({
                                  title: t(
                                    "reserveProfile.form.validation.selectionLimit",
                                  ),
                                  description: t(
                                    "reserveProfile.form.validation.selectionLimitDesc",
                                  ),
                                  className:
                                    "bg-cyan-50 border-2 border-cyan-400",
                                });
                              }
                            }}
                            className="border-2 border-gray-400"
                          />
                          <label
                            htmlFor={type}
                            className="text-sm text-gray-700 cursor-pointer flex-1"
                          >
                            {t(`common.workTypes.${type}`, type)}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                {!isOAuthSignup && (
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    className="flex-1 h-12 border-2 border-black rounded-none"
                  >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    {t("common.back")}
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  className={`${isOAuthSignup ? "w-full" : "flex-1"} h-12 bg-gradient-to-r from-[#32C8D1] to-teal-500 hover:from-[#2AB8C1] hover:to-teal-600 text-white border-2 border-black rounded-none`}
                >
                  {creatorType === "athlete"
                    ? t(
                        "reserveProfile.actions.nextBrandSetup",
                        "Next: Brand Setup",
                      )
                    : t("common.continue")}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Terms & Agreements */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">
                  {t("reserveProfile.terms.title", "Terms & Agreements")}
                </h3>
                <p className="text-gray-700">
                  {t(
                    "reserveProfile.terms.subtitle",
                    "Please review and agree to the Privacy Policy and Terms of Service to complete your registration.",
                  )}
                </p>
              </div>

              <div className="border-2 border-gray-200 bg-white">
                <ScrollArea className="h-[700px] p-4">
                  <div id="creator-terms-content">
                    <CreatorTermsContent />
                  </div>
                </ScrollArea>
              </div>

              <div className="flex justify-end mt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="border-2 border-black rounded-none"
                  onClick={() =>
                    window.open(
                      "/LIKELEE%20AI%20%E2%80%94%20Creator%20%26%20Talent%20Terms%20and%20Conditions.pdf",
                      "_blank",
                    )
                  }
                >
                  <Download className="mr-2 h-4 w-4" />
                  {t("reserveProfile.terms.download")}
                </Button>
              </div>

              <div className="p-4 border-2 border-gray-200 bg-gray-50 mt-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="terms"
                    checked={agreedToTerms}
                    onCheckedChange={(checked) =>
                      setAgreedToTerms(checked as boolean)
                    }
                    className="mt-1 border-2 border-black rounded-none data-[state=checked]:bg-black data-[state=checked]:text-white"
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="terms"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {t("reserveProfile.terms.agreeTo")}{" "}
                      <a
                        href="https://likelee.ai/privacypolicy"
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 underline"
                      >
                        {t("reserveProfile.terms.policyLink")}
                      </a>{" "}
                      {t("reserveProfile.terms.andTerms")}
                    </label>
                    <p className="text-sm text-gray-500">
                      {t(
                        "reserveProfile.terms.mustAgree",
                        "You must agree to the terms to complete registration.",
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep(2)}
                  variant="outline"
                  className="w-1/3 h-12 border-2 border-black rounded-none"
                >
                  {t("common.back", "Back")}
                </Button>
                <Button
                  onClick={finalizeProfile}
                  disabled={!agreedToTerms || profileSaveLoading}
                  className="w-2/3 h-12 bg-gradient-to-r from-[#32C8D1] to-teal-500 hover:from-[#2AB8C1] hover:to-teal-600 text-white border-2 border-black rounded-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {profileSaveLoading
                    ? t("common.saving", "Saving...")
                    : t(
                        "reserveProfile.terms.completeRegistration",
                        "Complete Registration",
                      )}
                </Button>
              </div>
            </div>
          )}
        </Card>
        <EmailOtpDialog
          open={signupOtpOpen}
          onOpenChange={setSignupOtpOpen}
          email={normalizeEmail(formData.email)}
          title={t("reserveProfile.otp.title", "Verify your email")}
          description={t(
            "reserveProfile.otp.dialogDescription",
            "Stay here, check your inbox, and enter the 6-digit code to keep onboarding on the same tab.",
          )}
          helperText={t(
            "reserveProfile.otp.helperText",
            "If the code does not arrive right away, use resend and check your spam folder.",
          )}
          verifyLabel={t("reserveProfile.otp.verifyLabel", "Continue")}
          onVerify={handleCreatorOtpVerify}
          onResend={handleCreatorOtpResend}
        />
        <DuplicateEmailModal
          open={duplicateEmailModalOpen}
          onOpenChange={setDuplicateEmailModalOpen}
        />
      </div>
    </div>
  );
}
