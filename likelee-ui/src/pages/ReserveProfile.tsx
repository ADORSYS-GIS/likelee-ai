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
  AlertCircle,
  XCircle,
  Loader2,
  RefreshCw,
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
  clearStoredKycSessionUrl,
  loadStoredKycSessionUrl,
  storeKycSessionUrl,
} from "@/utils/kycSession";
import { formatKycReason } from "@/utils/kycDisplay";

import { PrivacyPolicyContent } from "@/components/PrivacyPolicyContent";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const { login, register, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem("reserve_step");
    const params = new URLSearchParams(window.location.search);
    const stepParam = params.get("step");
    if (stepParam) return parseInt(stepParam, 10);
    return saved ? parseInt(saved) : 1;
  });

  useEffect(() => {
    localStorage.setItem("reserve_step", step.toString());
  }, [step]);

  const [submitted, setSubmitted] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [profileId, setProfileId] = useState<string | null>(() => {
    return localStorage.getItem("reserve_profileId") || null;
  });

  useEffect(() => {
    if (profileId) {
      localStorage.setItem("reserve_profileId", profileId);
    }
  }, [profileId]);

  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem("reserve_formData");
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
          bio: "",
        };
  });

  useEffect(() => {
    // Security: Do not persist passwords to localStorage
    const { password, confirmPassword, ...safeData } = formData;
    localStorage.setItem("reserve_formData", JSON.stringify(safeData));
  }, [formData]);

  const startVerification = async ({
    forceNewSession = false,
  }: {
    forceNewSession?: boolean;
  } = {}) => {
    const session = (await supabase.auth.getSession())?.data?.session;
    if (!session?.access_token) {
      toast({
        title: t("reserveProfile.toasts.kycErrorTitle"),
        description:
          "Please complete the previous steps before starting verification.",
        className: "bg-cyan-50 border-2 border-cyan-400",
      });
      return;
    }
    const normalizedStatus = String(kycStatus || "")
      .trim()
      .toLowerCase();
    if (
      !forceNewSession &&
      normalizedStatus === "pending" &&
      savedKycSessionUrl
    ) {
      setKycSessionUrl(savedKycSessionUrl);
      window.open(savedKycSessionUrl, "_blank");
      return;
    }
    try {
      setKycLoading(true);
      setKycRejectionReason(null);
      await saveCreatorProfile();
      const u = new URL(window.location.href);
      u.searchParams.set("step", "4");
      u.searchParams.set("verified", "1");
      const returnUrl = u.toString();
      const res = await fetch(api(`/api/kyc/session`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ return_url: returnUrl }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setKycProvider(data.provider || "veriff");
      if (!data.session_url) {
        throw new Error("No verification session returned");
      }
      const sessionUrl = String(data.session_url);
      const kycStorageUserId = profileId || session.user.id;
      if (kycStorageUserId) {
        storeKycSessionUrl("reserve-profile", kycStorageUserId, sessionUrl);
      }
      setSavedKycSessionUrl(sessionUrl);
      setKycSessionUrl(sessionUrl);
      setKycStatus("pending");
      window.open(sessionUrl, "_blank");
    } catch (e: any) {
      toast({
        title: t("reserveProfile.toasts.verificationFailed"),
        description: getUserFriendlyError(e, t),
        variant: "destructive",
      });
    } finally {
      setKycLoading(false);
    }
  };

  const refreshVerificationStatus = async ({
    manageLoading = true,
  }: {
    manageLoading?: boolean;
  } = {}) => {
    const session = (await supabase.auth.getSession())?.data?.session;
    if (!session?.access_token) return;
    try {
      if (manageLoading) setKycLoading(true);
      const res = await fetch(api(`/api/kyc/status`), {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!res.ok) throw new Error(await res.text());
      const rows = await res.json();
      const row = Array.isArray(rows) && rows.length ? rows[0] : null;
      if (row) {
        if (row.kyc_status) setKycStatus(row.kyc_status);
        if (row.kyc_provider) setKycProvider(row.kyc_provider);
        setKycRejectionReason(row.kyc_rejection_reason ?? null);
        const normalizedStatus = String(row.kyc_status || "")
          .trim()
          .toLowerCase();
        if (
          normalizedStatus === "approved" ||
          normalizedStatus === "rejected" ||
          normalizedStatus === "declined"
        ) {
          clearStoredKycSessionUrl("reserve-profile", profileId);
          setSavedKycSessionUrl(null);
        }
        if (row.kyc_status === "approved") {
          toast({
            title: t("reserveProfile.toasts.identityVerified"),
            description: t("reserveProfile.toasts.identityVerifiedDesc"),
          });
        }
      }
      return row;
    } catch (e: any) {
      toast({
        title: t("reserveProfile.toasts.statusCheckFailed"),
        description: getUserFriendlyError(e, t),
        variant: "destructive",
      });
      return null;
    } finally {
      if (manageLoading) setKycLoading(false);
    }
  };

  const handleManualVerificationRefresh = async () => {
    try {
      setKycRefreshLoading(true);
      await refreshVerificationStatus({ manageLoading: false });
    } finally {
      setKycRefreshLoading(false);
    }
  };

  const startNewVerificationSession = async () => {
    clearStoredKycSessionUrl("reserve-profile", profileId);
    setSavedKycSessionUrl(null);
    setKycSessionUrl(null);
    setKycRejectionReason(null);
    await startVerification({ forceNewSession: true });
  };

  const verifyAndContinue = async () => {
    try {
      setKycLoading(true);
      const row = await refreshVerificationStatus({ manageLoading: false });
      const kyc = row?.kyc_status || kycStatus;
      const normalizedKyc = String(kyc || "not_started")
        .trim()
        .toLowerCase();
      const reason = formatKycReason(
        row?.kyc_rejection_reason ?? kycRejectionReason,
      );
      if (normalizedKyc === "approved") {
        setStep(5);
        return;
      }
      if (normalizedKyc === "rejected" || normalizedKyc === "declined") {
        toast({
          title: "Verification was not approved",
          description:
            reason ||
            "Please review the verification note and start a new verification session.",
          variant: "destructive",
        });
        return;
      }
      if (normalizedKyc === "pending" && reason) {
        toast({
          title: "Additional verification required",
          description: reason,
          className: "bg-amber-50 border-2 border-amber-400",
        });
        return;
      }
      // If user hasn't started verification, kick it off automatically
      if (normalizedKyc === "not_started") {
        await startVerification();
        return;
      }
      toast({
        title: "Verification Pending",
        description: t(
          "reserveProfile.verification.verificationPendingDescription",
          {
            kyc:
              kyc?.replace("_", " ") || t("reserveProfile.status.notStarted"),
          },
        ),
        className: "bg-cyan-50 border-2 border-cyan-400",
      });
    } finally {
      setKycLoading(false);
    }
  };

  const totalSteps = 5;
  const progress = (step / totalSteps) * 100;

  // Verification state
  const [kycStatus, setKycStatus] = useState<
    "not_started" | "pending" | "approved" | "rejected"
  >("not_started");
  const [kycProvider, setKycProvider] = useState<string | null>(null);
  const [kycSessionUrl, setKycSessionUrl] = useState<string | null>(null);
  const [savedKycSessionUrl, setSavedKycSessionUrl] = useState<string | null>(
    null,
  );
  const [kycRejectionReason, setKycRejectionReason] = useState<string | null>(
    null,
  );
  const [kycLoading, setKycLoading] = useState(false);
  const [kycRefreshLoading, setKycRefreshLoading] = useState(false);
  const normalizedKycStatus = String(kycStatus || "")
    .trim()
    .toLowerCase();
  const currentKycReason = formatKycReason(kycRejectionReason);
  const hasKycFollowUp =
    normalizedKycStatus === "pending" && currentKycReason.length > 0;
  const isKycRejected =
    normalizedKycStatus === "rejected" || normalizedKycStatus === "declined";
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

  useEffect(() => {
    if (!profileId) {
      setSavedKycSessionUrl(null);
      return;
    }

    setSavedKycSessionUrl(
      loadStoredKycSessionUrl("reserve-profile", profileId),
    );
  }, [profileId]);

  useEffect(() => {
    const normalizedStatus = String(kycStatus || "")
      .trim()
      .toLowerCase();

    if (
      profileId &&
      (normalizedStatus === "approved" ||
        normalizedStatus === "rejected" ||
        normalizedStatus === "declined")
    ) {
      clearStoredKycSessionUrl("reserve-profile", profileId);
      setSavedKycSessionUrl(null);
    }
  }, [kycStatus, profileId]);

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
    if (step === 3) {
      if (creatorType === "influencer")
        return t("reserveProfile.stepTitles.step3.influencer");
      if (creatorType === "model_actor")
        return t("reserveProfile.stepTitles.step3.model_actor");
      if (creatorType === "athlete")
        return t("reserveProfile.stepTitles.step3.athlete");
    }
    if (step === 5) return "Terms & Agreements";
    return "";
  };

  useEffect(() => {
    if (step !== 4) return;
    // Initial fetch
    refreshVerificationStatus();
    // If redirected back with ?verified=1, attempt to proceed
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "1") {
      verifyAndContinue();
    }
  }, [step]);

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

  const buildCreatorPayload = (data: typeof formData) => {
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
      platform_handle: data.platform_handle || null,
      work_types: data.work_types || [],
      representation_status: data.representation_status || "",
      headshot_url: data.headshot_url || "",
      sport: data.sport || null,
      athlete_type: data.athlete_type || null,
      school_name: data.school_name || null,
      age: data.age || null,
      languages: data.languages || null,
      instagram_handle: data.instagram_handle || null,
      twitter_handle: data.twitter_handle || null,
      brand_categories: data.brand_categories || [],
      bio: data.bio || null,
      city: data.city || "",
      state: data.state || "",
      birthdate: data.birthdate || "",
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
    };
  };

  const saveCreatorProfile = async (data: typeof formData = formData) => {
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
        body: JSON.stringify(buildCreatorPayload(data)),
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
          toast({
            title: t("reserveProfile.toasts.emailRegisteredTitle"),
            description: t("reserveProfile.toasts.emailRegisteredDesc"),
            className: "bg-cyan-50 border-2 border-cyan-400",
          });
          return;
        }
        // Create Supabase auth user so login works
        const displayName =
          creatorType === "model_actor"
            ? formData.stage_name || formData.full_name
            : formData.full_name;
        const { session } = await register(
          formData.email,
          formData.password,
          displayName,
        );
        if (!session) {
          toast({
            description: t("reserveProfile.toasts.verifyEmailDesc"),
          });
          return;
        }
        setProfileId(session.user?.id || null);
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
          toast({
            title: t("reserveProfile.toasts.emailRegisteredTitle"),
            description: t("reserveProfile.toasts.emailRegisteredDesc"),
            className: "bg-cyan-50 border-2 border-cyan-400",
          });
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
      // Pricing required in onboarding step (applies to all creator types)
      const monthly = Number(formData.base_monthly_price_usd);
      if (!isFinite(monthly) || monthly < 150) {
        toast({
          title: t("reserveProfile.toasts.pricingRequiredTitle"),
          description: t("reserveProfile.toasts.pricingRequiredDesc"),
          className: "bg-cyan-50 border-2 border-cyan-400",
        });
        return;
      }
    }
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    // Step 3 validations for influencer
    if (creatorType === "influencer") {
      if (!formData.content_types || formData.content_types.length === 0) {
        toast({
          title: t("reserveProfile.toasts.campaignTypeRequiredTitle"),
          description: t("reserveProfile.toasts.campaignTypeRequiredDesc"),
          className: "bg-cyan-50 border-2 border-cyan-400",
        });
        return;
      }
      if (!formData.industries || formData.industries.length === 0) {
        toast({
          title: t("reserveProfile.toasts.industryRequiredTitle"),
          description: t("reserveProfile.toasts.industryRequiredDesc"),
          className: "bg-cyan-50 border-2 border-cyan-400",
        });
        return;
      }
      if (!formData.primary_platform?.trim()) {
        toast({
          title: t("reserveProfile.toasts.platformRequiredTitle"),
          description: t("reserveProfile.toasts.platformRequiredDesc"),
          className: "bg-cyan-50 border-2 border-cyan-400",
        });
        return;
      }
      if (!formData.platform_handle?.trim()) {
        toast({
          title: t("reserveProfile.toasts.handleRequiredTitle"),
          description: t("reserveProfile.toasts.handleRequiredDesc"),
          className: "bg-cyan-50 border-2 border-cyan-400",
        });
        return;
      }
      if (!formData.visibility) {
        toast({
          title: t("reserveProfile.toasts.visibilityRequiredTitle"),
          description: t("reserveProfile.toasts.visibilityRequiredDesc"),
          className: "bg-cyan-50 border-2 border-cyan-400",
        });
        return;
      }
    }
    try {
      setProfileSaveLoading(true);
      await saveCreatorProfile();
      await refreshProfile();
      setStep(4);
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
    try {
      setProfileSaveLoading(true);
      await saveCreatorProfile();
      await refreshProfile();
      setSubmitted(true);
      // Clear persisted state on success
      localStorage.removeItem("reserve_formData");
      localStorage.removeItem("reserve_step");
      localStorage.removeItem("reserve_profileId");
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

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-blue-50 py-16 px-6 flex items-center justify-center">
        <Card className="max-w-2xl w-full p-12 bg-white border-2 border-black shadow-2xl rounded-none text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-[#32C8D1] to-teal-500 border-2 border-black rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {t("reserveProfile.success.title")}
          </h1>
          <p className="text-lg text-gray-700 leading-relaxed mb-8">
            {t("reserveProfile.success.description")}
          </p>
          <div className="flex items-center justify-center">
            <Link to="/CreatorDashboard">
              <Button className="rounded-none border-2 border-black bg-gradient-to-r from-[#32C8D1] to-teal-500 hover:from-[#2AB8C1] hover:to-teal-600 text-white px-8 h-12">
                {t("reserveProfile.success.dashboardButton")}
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

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
                      navigate("/CreatorDashboard");
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
                    <Input
                      id="birthdate"
                      type="date"
                      value={formData.birthdate}
                      onChange={(e) =>
                        setFormData({ ...formData, birthdate: e.target.value })
                      }
                      className="border-2 border-gray-300 rounded-none"
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

                {/* Influencer vibes */}
                {creatorType === "influencer" && (
                  <div>
                    <Label className="text-sm font-medium text-gray-900 mb-3 block">
                      {t("reserveProfile.form.vibes")}
                    </Label>
                    <div className="flex items-center space-x-2 p-3 border-2 border-gray-300 rounded-none bg-gray-50 mb-3">
                      <Checkbox
                        id="select-all-vibes"
                        checked={vibes.every((vibe) =>
                          formData.vibes.includes(vibe),
                        )}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({ ...formData, vibes: [...vibes] });
                          } else {
                            setFormData({ ...formData, vibes: [] });
                          }
                        }}
                        className="border-2 border-gray-400"
                      />
                      <label
                        htmlFor="select-all-vibes"
                        className="text-sm font-medium text-gray-700 cursor-pointer flex-1"
                      >
                        {t("reserveProfile.form.selectAll", "Select All")}
                      </label>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {vibes.map((vibe) => (
                        <div
                          key={vibe}
                          className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50"
                        >
                          <Checkbox
                            id={vibe}
                            checked={formData.vibes.includes(vibe)}
                            onCheckedChange={() =>
                              toggleArrayItem("vibes", vibe)
                            }
                            className="border-2 border-gray-400"
                          />
                          <label
                            htmlFor={vibe}
                            className="text-sm text-gray-700 cursor-pointer flex-1"
                          >
                            {t(`common.vibes.${vibe}`, vibe)}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Pricing (USD-only) */}
              <div className="mt-6 border-2 border-gray-200 p-4 bg-gray-50">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">
                  {t("reserveProfile.form.licensingPricing")}
                </h4>
                <div className="w-full flex justify-center">
                  <div className="w-full max-w-sm">
                    <Label
                      htmlFor="base_monthly_price"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      {t("reserveProfile.form.basePrice")}
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-700">$</span>
                      <Input
                        id="base_monthly_price"
                        type="number"
                        min={150}
                        step={1}
                        value={formData.base_monthly_price_usd}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9.]/g, "");
                          setFormData({
                            ...formData,
                            base_monthly_price_usd: v,
                          });
                        }}
                        className="border-2 border-gray-300 rounded-none"
                        placeholder={t(
                          "reserveProfile.form.placeholders.price",
                        )}
                      />
                      <span className="text-sm text-gray-600">
                        {t("reserveProfile.form.perMonth", "/month")}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {t("reserveProfile.form.basePriceHint")}
                    </p>
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
                  onClick={handleNext}
                  className="flex-1 h-12 bg-gradient-to-r from-[#32C8D1] to-teal-500 hover:from-[#2AB8C1] hover:to-teal-600 text-white border-2 border-black rounded-none"
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

          {/* Step 3: Opportunities/Preferences/Brand Setup (varies by type) */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {getStepTitle()}
                </h3>
                <p className="text-gray-600">
                  {t(`reserveProfile.stepDescriptions.step3.${creatorType}`)}
                </p>
              </div>

              <div className="space-y-6">
                {/* Influencer Step 3 */}
                {creatorType === "influencer" && (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-medium text-gray-900">
                          {t("reserveProfile.form.contentInterest")}
                        </Label>
                        <span className="text-xs text-gray-500">
                          {t("reserveProfile.form.selectMax3")}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border-2 border-gray-300 rounded-none bg-gray-50 mb-3">
                        <Checkbox
                          id="select-all-content"
                          checked={contentTypes.every((type) =>
                            formData.content_types.includes(type),
                          )}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({
                                ...formData,
                                content_types: [...contentTypes],
                              });
                            } else {
                              setFormData({ ...formData, content_types: [] });
                            }
                          }}
                          className="border-2 border-gray-400"
                        />
                        <label
                          htmlFor="select-all-content"
                          className="text-sm font-medium text-gray-700 cursor-pointer flex-1"
                        >
                          {t("reserveProfile.form.selectAll", "Select All")}
                        </label>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {contentTypes.map((type) => (
                          <div
                            key={type}
                            className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50"
                          >
                            <Checkbox
                              id={type}
                              checked={formData.content_types.includes(type)}
                              onCheckedChange={() =>
                                toggleArrayItem("content_types", type)
                              }
                              className="border-2 border-gray-400"
                            />
                            <label
                              htmlFor={type}
                              className="text-sm text-gray-700 cursor-pointer flex-1"
                            >
                              {t(`common.contentTypes.${type}`, type)}
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
                          className="border-2 border-gray-300 rounded-none mt-2"
                          placeholder={t(
                            "reserveProfile.form.placeholders.specify",
                          )}
                        />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-medium text-gray-900">
                          {t(
                            "reserveProfile.form.brandinterest",
                            "What types of brands or industries do you want to work with?",
                          )}
                        </Label>
                        <span className="text-xs text-gray-500">
                          {t("reserveProfile.form.selectMax3")}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border-2 border-gray-300 rounded-none bg-gray-50 mb-3">
                        <Checkbox
                          id="select-all-industries"
                          checked={industries.every((industry) =>
                            formData.industries.includes(industry),
                          )}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({
                                ...formData,
                                industries: [...industries],
                              });
                            } else {
                              setFormData({ ...formData, industries: [] });
                            }
                          }}
                          className="border-2 border-gray-400"
                        />
                        <label
                          htmlFor="select-all-industries"
                          className="text-sm font-medium text-gray-700 cursor-pointer flex-1"
                        >
                          {t("reserveProfile.form.selectAll", "Select All")}
                        </label>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {industries.map((industry) => (
                          <div
                            key={industry}
                            className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50"
                          >
                            <Checkbox
                              id={industry}
                              checked={formData.industries.includes(industry)}
                              onCheckedChange={() =>
                                toggleArrayItem("industries", industry)
                              }
                              className="border-2 border-gray-400"
                            />
                            <label
                              htmlFor={industry}
                              className="text-sm text-gray-700 cursor-pointer flex-1"
                            >
                              {t(`common.industries.${industry}`, industry)}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label
                          htmlFor="primary_platform"
                          className="text-sm font-medium text-gray-700 mb-2 block"
                        >
                          {t("reserveProfile.form.primaryPlatform")}
                        </Label>
                        <Select
                          value={formData.primary_platform}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              primary_platform: value,
                            })
                          }
                        >
                          <SelectTrigger className="border-2 border-gray-300 rounded-none">
                            <SelectValue
                              placeholder={t(
                                "reserveProfile.form.placeholders.platform",
                                "Select platform",
                              )}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="instagram">Instagram</SelectItem>
                            <SelectItem value="tiktok">TikTok</SelectItem>
                            <SelectItem value="youtube">YouTube</SelectItem>
                            <SelectItem value="twitter">Twitter/X</SelectItem>
                            <SelectItem value="other">
                              {t("common.platforms.other", "Other")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label
                          htmlFor="platform_handle"
                          className="text-sm font-medium text-gray-700 mb-2 block"
                        >
                          {t("reserveProfile.form.handle")}
                        </Label>
                        <Input
                          id="platform_handle"
                          value={formData.platform_handle}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              platform_handle: e.target.value,
                            })
                          }
                          className="border-2 border-gray-300 rounded-none"
                          placeholder={t(
                            "reserveProfile.form.placeholders.handle",
                          )}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Model/Actor Step 3 */}
                {creatorType === "model_actor" && (
                  <>
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-3 block">
                        {t(
                          "reserveProfile.form.representationStatus",
                          "Representation Status",
                        )}
                      </Label>
                      <RadioGroup
                        value={formData.representation_status}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            representation_status: value,
                          })
                        }
                      >
                        <div className="space-y-2">
                          {["Agency", "Independent"].map((option) => (
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
                                  `common.representationStatus.options.${option}`,
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
                        {t("reserveProfile.form.vibes")}
                      </Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {vibes.map((vibe) => (
                          <div
                            key={vibe}
                            className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50"
                          >
                            <Checkbox
                              id={vibe}
                              checked={formData.vibes.includes(vibe)}
                              onCheckedChange={() =>
                                toggleArrayItem("vibes", vibe)
                              }
                              className="border-2 border-gray-400"
                            />
                            <label
                              htmlFor={vibe}
                              className="text-sm text-gray-700 cursor-pointer flex-1"
                            >
                              {t(`common.vibes.options.${vibe}`, vibe)}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label
                        htmlFor="headshot_url"
                        className="text-sm font-medium text-gray-700 mb-2 block"
                      >
                        {t("reserveProfile.form.headshot")}
                      </Label>
                      <Input
                        id="headshot_url"
                        type="text"
                        value={formData.headshot_url}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            headshot_url: e.target.value,
                          })
                        }
                        className="border-2 border-gray-300 rounded-none"
                        placeholder={t(
                          "reserveProfile.form.placeholders.headshot",
                        )}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {t("reserveProfile.form.headshotHint")}
                      </p>
                    </div>
                  </>
                )}

                {/* Athlete Step 3 */}
                {creatorType === "athlete" && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label
                          htmlFor="instagram_handle"
                          className="text-sm font-medium text-gray-700 mb-2 block"
                        >
                          {t(
                            "reserveProfile.form.instagramOptional",
                            "Instagram (optional)",
                          )}
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
                          placeholder={t(
                            "reserveProfile.form.placeholders.handle",
                          )}
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="twitter_handle"
                          className="text-sm font-medium text-gray-700 mb-2 block"
                        >
                          {t(
                            "reserveProfile.form.twitterOptional",
                            "Twitter/X (optional)",
                          )}
                        </Label>
                        <Input
                          id="twitter_handle"
                          value={formData.twitter_handle}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              twitter_handle: e.target.value,
                            })
                          }
                          className="border-2 border-gray-300 rounded-none"
                          placeholder={t(
                            "reserveProfile.form.placeholders.handle",
                          )}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-medium text-gray-900">
                          {t(
                            "reserveProfile.form.brandCategories",
                            "Interests / Brand Categories",
                          )}
                        </Label>
                        <span className="text-xs text-gray-500">
                          {t("reserveProfile.form.selectMax3")}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {athleteBrandCategories.map((category) => (
                          <div
                            key={category}
                            className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50"
                          >
                            <Checkbox
                              id={category}
                              checked={formData.brand_categories.includes(
                                category,
                              )}
                              onCheckedChange={() =>
                                toggleArrayItem("brand_categories", category)
                              }
                              className="border-2 border-gray-400"
                            />
                            <label
                              htmlFor={category}
                              className="text-sm text-gray-700 cursor-pointer flex-1"
                            >
                              {t(
                                `common.brandCategories.options.${category}`,
                                category,
                              )}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label
                        htmlFor="bio"
                        className="text-sm font-medium text-gray-700 mb-2 block"
                      >
                        {t("reserveProfile.form.shortBio", "Short Bio")}
                      </Label>
                      <Textarea
                        id="bio"
                        value={formData.bio}
                        onChange={(e) =>
                          setFormData({ ...formData, bio: e.target.value })
                        }
                        className="border-2 border-gray-300 rounded-none h-24"
                        placeholder={t(
                          "reserveProfile.form.placeholders.bio",
                          "Tell brands a bit about you...",
                        )}
                      />
                    </div>
                  </>
                )}

                {/* Profile Visibility - Common for all */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    {t("reserveProfile.form.visibility")}
                  </Label>
                  <RadioGroup
                    value={formData.visibility}
                    onValueChange={(value) =>
                      setFormData({ ...formData, visibility: value })
                    }
                  >
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50">
                        <RadioGroupItem
                          value="public"
                          id="public"
                          className="border-2 border-gray-400"
                        />
                        <Label
                          htmlFor="public"
                          className="text-sm text-gray-700 cursor-pointer flex-1"
                        >
                          <span className="font-medium">
                            {t(
                              "reserveProfile.form.visibilityOptions.public.label",
                            )}
                          </span>{" "}
                          -{" "}
                          {t(
                            "reserveProfile.form.visibilityOptions.public.description",
                          )}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50">
                        <RadioGroupItem
                          value="private"
                          id="private"
                          className="border-2 border-gray-400"
                        />
                        <Label
                          htmlFor="private"
                          className="text-sm text-gray-700 cursor-pointer flex-1"
                        >
                          <span className="font-medium">
                            {t(
                              "reserveProfile.form.visibilityOptions.private.label",
                            )}
                          </span>{" "}
                          -{" "}
                          {t(
                            "reserveProfile.form.visibilityOptions.private.description",
                          )}
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <div className="flex items-center gap-4 justify-between">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="h-12 border-2 border-black rounded-none"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  {t("common.back")}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={profileSaveLoading}
                  className="h-12 bg-gradient-to-r from-[#32C8D1] to-teal-500 hover:from-[#2AB8C1] hover:to-teal-600 text-white border-2 border-black rounded-none"
                >
                  {profileSaveLoading
                    ? t("common.saving", "Saving...")
                    : t("reserveProfile.actions.saveAndVerify")}
                  <CheckCircle2 className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Verify Identity - redesigned */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">
                  {t("reserveProfile.verification.title")}
                </h3>
                <p className="text-gray-700">
                  {t("reserveProfile.verification.subtitle")}
                </p>
              </div>

              {/* Why verify box */}
              <div className="p-5 border-2 border-[#32C8D1] bg-cyan-50">
                <h4 className="font-bold text-gray-900 mb-3">
                  {t("reserveProfile.verification.whyVerify.title")}
                </h4>
                <ul className="space-y-2 text-gray-800">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#32C8D1] mt-1" />{" "}
                    {t("reserveProfile.verification.whyVerify.reason1")}
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#32C8D1] mt-1" />{" "}
                    {t("reserveProfile.verification.whyVerify.reason2")}
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#32C8D1] mt-1" />{" "}
                    {t("reserveProfile.verification.whyVerify.reason3")}
                  </li>
                </ul>
              </div>

              <p className="text-gray-700">
                {t("reserveProfile.verification.description")}
              </p>

              {/* Requirements box */}
              <div className="p-5 border-2 border-gray-300 bg-gray-50">
                <h4 className="font-bold text-gray-900 mb-2">
                  {t("reserveProfile.verification.requirements.title")}
                </h4>
                <ul className="list-disc list-inside text-gray-800 space-y-1">
                  <li>{t("reserveProfile.verification.requirements.item1")}</li>
                  <li>{t("reserveProfile.verification.requirements.item2")}</li>
                  <li>{t("reserveProfile.verification.requirements.item3")}</li>
                </ul>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={startVerification}
                  disabled={kycLoading || kycRefreshLoading}
                  className="w-full h-12 bg-gradient-to-r from-[#32C8D1] to-teal-500 hover:from-[#2AB8C1] hover:to-teal-600 text-white border-2 border-black rounded-none"
                >
                  {kycLoading
                    ? t(
                        "reserveProfile.actions.startingVerification",
                        "Starting…",
                      )
                    : normalizedKycStatus === "pending"
                      ? savedKycSessionUrl
                        ? t(
                            hasKycFollowUp
                              ? "reserveProfile.actions.continueVerification"
                              : "reserveProfile.actions.resumeVerification",
                            hasKycFollowUp
                              ? "Continue Verification"
                              : "Resume Verification",
                          )
                        : t(
                            "reserveProfile.actions.restartVerification",
                            "Start New Verification",
                          )
                      : isKycRejected
                        ? t(
                            "reserveProfile.actions.retryVerification",
                            "Retry Verification",
                          )
                        : t(
                            "reserveProfile.actions.verifyIdentity",
                            "Verify Identity Now",
                          )}
                </Button>
                {normalizedKycStatus === "pending" && savedKycSessionUrl && (
                  <Button
                    onClick={startNewVerificationSession}
                    variant="outline"
                    disabled={kycLoading || kycRefreshLoading}
                    className="w-full h-12 border-2 border-black rounded-none"
                  >
                    {t(
                      "reserveProfile.actions.startNewVerification",
                      "Start New Verification",
                    )}
                  </Button>
                )}
                <div className="text-sm text-gray-700 flex items-center justify-between gap-3">
                  <span>
                    KYC:{" "}
                    <strong
                      className={
                        hasKycFollowUp
                          ? "capitalize text-amber-700"
                          : isKycRejected
                            ? "capitalize text-red-700"
                            : "capitalize"
                      }
                    >
                      {kycStatus === "not_started"
                        ? t("reserveProfile.verification.status.notStarted")
                        : kycStatus === "approved"
                          ? t("reserveProfile.verification.status.approved")
                          : hasKycFollowUp
                            ? t(
                                "reserveProfile.verification.status.actionNeeded",
                                "Action needed",
                              )
                            : kycStatus === "rejected"
                              ? t("reserveProfile.verification.status.rejected")
                              : t(
                                  "reserveProfile.verification.status.verifying",
                                )}
                    </strong>
                  </span>
                  <Button
                    onClick={handleManualVerificationRefresh}
                    variant="outline"
                    disabled={kycLoading || kycRefreshLoading}
                    className="h-9 px-3 border-2 border-black rounded-none shrink-0"
                  >
                    {kycRefreshLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    {t(
                      "reserveProfile.actions.refreshVerificationStatus",
                      "Refresh Status",
                    )}
                  </Button>
                </div>
                {(hasKycFollowUp || isKycRejected) && currentKycReason && (
                  <Alert
                    className={
                      hasKycFollowUp
                        ? "border-2 border-amber-300 bg-amber-50"
                        : "border-2 border-red-300 bg-red-50"
                    }
                  >
                    <div className="flex items-start gap-3">
                      {hasKycFollowUp ? (
                        <AlertCircle className="mt-0.5 h-4 w-4 text-amber-700" />
                      ) : (
                        <XCircle className="mt-0.5 h-4 w-4 text-red-700" />
                      )}
                      <AlertDescription
                        className={
                          hasKycFollowUp ? "text-amber-900" : "text-red-900"
                        }
                      >
                        <span className="font-semibold">
                          {hasKycFollowUp
                            ? t(
                                "reserveProfile.verification.followUpLabel",
                                "Additional action required:",
                              )
                            : t(
                                "reserveProfile.verification.rejectionLabel",
                                "Verification note:",
                              )}
                        </span>{" "}
                        {currentKycReason}
                      </AlertDescription>
                    </div>
                  </Alert>
                )}
                <p className="text-xs text-gray-500">
                  {hasKycFollowUp
                    ? savedKycSessionUrl
                      ? t(
                          "reserveProfile.verification.followUpResumeHint",
                          "Veriff requested another step. Use Continue Verification to finish approval, or start a new verification session if the earlier link no longer works.",
                        )
                      : t(
                          "reserveProfile.verification.followUpRestartHint",
                          "Veriff requested another step. Start a new verification session if the earlier link is no longer available, or use Refresh Status if you already finished it.",
                        )
                    : isKycRejected
                      ? t(
                          "reserveProfile.verification.rejectedHint",
                          "Your last verification was not approved. Review the note above and retry with a new verification session.",
                        )
                      : normalizedKycStatus === "pending"
                        ? savedKycSessionUrl
                          ? t(
                              "reserveProfile.verification.resumeHint",
                              "Closed the verification window? Use Resume Verification to continue. If that link no longer works, start a new verification session or use Refresh Status if you already finished.",
                            )
                          : t(
                              "reserveProfile.verification.restartHint",
                              "If the last verification window was closed or expired, start a new verification session or use Refresh Status if you already finished.",
                            )
                        : t(
                            "reserveProfile.verification.refreshHint",
                            "If the status does not update automatically a few seconds after verification, use Refresh Status.",
                          )}
                </p>
                <div className="w-full">
                  <div className="grid grid-cols-3 gap-2 w-full max-w-xl mx-auto">
                    <Button
                      onClick={handleBack}
                      variant="outline"
                      className="w-full h-12 border-2 border-black rounded-none"
                    >
                      <ArrowLeft className="w-5 h-5 mr-2" />
                      {t("common.back")}
                    </Button>
                    <Button
                      onClick={() => setShowSkipModal(true)}
                      variant="outline"
                      className="w-full h-12 border-2 border-gray-300 rounded-none"
                    >
                      {t("reserveProfile.actions.skip")}
                    </Button>
                    <Button
                      onClick={verifyAndContinue}
                      disabled={kycLoading || kycRefreshLoading}
                      className="w-full h-12 bg-gradient-to-r from-[#32C8D1] to-teal-500 hover:from-[#2AB8C1] hover:to-teal-600 text-white border-2 border-black rounded-none"
                    >
                      {kycLoading
                        ? t("common.checking", "Checking…")
                        : t(
                            "reserveProfile.actions.verifyAndContinue",
                            "Verify & Continue",
                          )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Skip Confirmation Modal */}
              {showSkipModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                  <div
                    className="absolute inset-0 bg-black/50"
                    onClick={() => setShowSkipModal(false)}
                  />
                  <div className="relative z-10 w-full max-w-lg bg-white border-2 border-black p-6">
                    <h4 className="text-lg font-bold mb-2">
                      {t("reserveProfile.skipModal.title")}
                    </h4>
                    <p className="text-sm text-gray-700 mb-4">
                      {t("reserveProfile.skipModal.description")}
                    </p>
                    <div className="p-3 border-2 border-amber-500 bg-amber-50 text-amber-900 mb-4 text-sm">
                      {t("reserveProfile.skipModal.note")}
                    </div>
                    {t("reserveProfile.alreadyHaveAccount")}{" "}
                    <Button
                      variant="link"
                      className="p-0 h-auto font-semibold text-black hover:underline"
                      onClick={() => setAuthMode("login")}
                    >
                      {t("reserveProfile.actions.login")}
                    </Button>
                    <div className="flex gap-3 justify-end">
                      <Button
                        variant="outline"
                        className="rounded-none border-2 border-black"
                        onClick={() => setShowSkipModal(false)}
                      >
                        {t("reserveProfile.skipModal.actions.back")}
                      </Button>
                      <Button
                        className="rounded-none border-2 border-black bg-black text-white"
                        onClick={() => {
                          setShowSkipModal(false);
                          setStep(5);
                        }}
                      >
                        {t("reserveProfile.skipModal.confirmSkip")}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Terms & Agreements */}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">
                  {t("reserveProfile.terms.title", "Terms & Agreements")}
                </h3>
                <p className="text-gray-700">
                  {t(
                    "reserveProfile.terms.subtitle",
                    "Please review and agree to our policies to complete your registration.",
                  )}
                </p>
              </div>

              <div className="border-2 border-gray-200 bg-white">
                <ScrollArea className="h-96 p-4">
                  <PrivacyPolicyContent />
                </ScrollArea>
              </div>

              <div className="p-4 border-2 border-gray-200 bg-gray-50">
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
                      {t("reserveProfile.terms.agreeTo", "I agree to the")}{" "}
                      <a
                        href="https://likelee.ai/privacypolicy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#32C8D1] hover:underline font-bold"
                      >
                        {t("reserveProfile.terms.policyLink", "Privacy Policy")}
                      </a>
                    </label>
                    <p className="text-sm text-gray-500">
                      {t(
                        "reserveProfile.terms.mustAgree",
                        "You must agree to the privacy policy to create your account.",
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep(4)}
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
      </div>
    </div>
  );
}
