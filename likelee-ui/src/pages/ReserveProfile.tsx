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
  Eye,
  EyeOff,
  Info,
} from "lucide-react";
import {
  Alert as UIAlert,
  AlertDescription as UIAlertDescription,
} from "@/components/ui/alert";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import { useTranslation } from "react-i18next";

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

function ReferencePhotosStep(props: any) {
  const {
    kycStatus,
    onBack,
    onUploaded,
    onComplete,
    uploadFn,
    userId,
    apiBase,
  } = props;
  const { t } = useTranslation();
  const [cameraOpen, setCameraOpen] = React.useState(false);
  const [stream, setStream] = React.useState<any>(null);
  const [currentPose, setCurrentPose] = React.useState<
    "front" | "left" | "right"
  >("front");
  const [captures, setCaptures] = React.useState<any>({
    front: null,
    left: null,
    right: null,
  });
  const [consent, setConsent] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [uploadedUrls, setUploadedUrls] = React.useState<any>({
    front: null,
    left: null,
    right: null,
  });
  const [generating, setGenerating] = React.useState(false);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);

  // Load previously uploaded reference photo URLs on mount (for refresh scenarios)
  React.useEffect(() => {
    const loadExisting = async () => {
      if (!userId || !supabase) return;
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("cameo_front_url, cameo_left_url, cameo_right_url")
          .eq("id", userId)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          setUploadedUrls({
            front: data.cameo_front_url || null,
            left: data.cameo_left_url || null,
            right: data.cameo_right_url || null,
          });
        }
      } catch (_e) {
        // ignore – previews are a best-effort enhancement
      }
    };
    loadExisting();
  }, [userId]);

  const attachStreamToVideo = () => {
    const v: any = document.getElementById("reference-video");
    if (v && stream && v.srcObject !== stream) v.srcObject = stream;
  };

  React.useEffect(() => {
    attachStreamToVideo();
  }, [stream, cameraOpen]);

  const openCamera = async () => {
    try {
      const s = await (navigator.mediaDevices as any).getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      setStream(s);
      setCameraOpen(true);
      setTimeout(attachStreamToVideo, 50);
    } catch (_e) {
      toast({
        title: t("reserveProfile.toasts.cameraAccessRequiredTitle"),
        description: t("reserveProfile.toasts.cameraAccessRequiredDesc"),
        variant: "destructive",
      });
    }
  };

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t: any) => t.stop());
      setStream(null);
    }
    setCameraOpen(false);
  };

  const capture = async () => {
    const video: any = document.getElementById("reference-video");
    if (!video) return;
    const canvas = document.createElement("canvas");
    const w = video.videoWidth || 720;
    const h = video.videoHeight || 720;
    canvas.width = w;
    canvas.height = h;
    const ctx: any = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, w, h);
    const blob: any = await new Promise((res) =>
      canvas.toBlob(res as any, "image/jpeg", 0.95),
    );
    const file = new File([blob], `${currentPose}.jpg`, { type: "image/jpeg" });
    const url = URL.createObjectURL(blob);
    setCaptures((prev: any) => ({ ...prev, [currentPose]: { file, url } }));
    if (currentPose === "front") setCurrentPose("left");
    else if (currentPose === "left") setCurrentPose("right");
  };

  const doUpload = async () => {
    if (!consent) {
      toast({
        title: t("reserveProfile.toasts.consentRequiredTitle"),
        description: t("reserveProfile.toasts.consentRequiredDesc"),
        className: "bg-cyan-50 border-2 border-cyan-400",
      });
      return;
    }
    if (!captures.front || !captures.left || !captures.right) {
      toast({
        title: t("reserveProfile.toasts.missingPhotosTitle"),
        description: t("reserveProfile.toasts.missingPhotosDesc"),
        className: "bg-cyan-50 border-2 border-cyan-400",
      });
      return;
    }
    try {
      setUploading(true);
      const resFront = await uploadFn(captures.front.file, "front");
      const resLeft = await uploadFn(captures.left.file, "left");
      const resRight = await uploadFn(captures.right.file, "right");
      const frontUrl = resFront?.publicUrl || resFront?.url || null;
      const leftUrl = resLeft?.publicUrl || resLeft?.url || null;
      const rightUrl = resRight?.publicUrl || resRight?.url || null;
      onUploaded(frontUrl, leftUrl, rightUrl);
      setUploadedUrls({ front: frontUrl, left: leftUrl, right: rightUrl });
      onComplete && onComplete();
      closeCamera();
    } catch (e: any) {
      toast({
        title: t("reserveProfile.toasts.uploadFailed"),
        description: getUserFriendlyError(e, t),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const generateAvatar = async () => {
    if (!userId) {
      toast({
        title: t("common.error", "Error"),
        description: t("reserveProfile.errors.notAuthenticated"),
        variant: "destructive",
      });
      return;
    }
    // Ensure we have uploaded URLs
    if (!uploadedUrls.front || !uploadedUrls.left || !uploadedUrls.right) {
      await doUpload();
      if (!uploadedUrls.front || !uploadedUrls.left || !uploadedUrls.right)
        return;
    }
    try {
      setGenerating(true);
      const res = await fetch(`${apiBase}/api/avatar/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          front_url: uploadedUrls.front,
          left_url: uploadedUrls.left,
          right_url: uploadedUrls.right,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (data.avatar_canonical_url) setAvatarUrl(data.avatar_canonical_url);
    } catch (e: any) {
      toast({
        title: t("reserveProfile.toasts.avatarGenFailed"),
        description: getUserFriendlyError(e, t),
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          {t("reserveProfile.photos.title")}
        </h3>
        <p className="text-gray-700">
          {t("reserveProfile.photos.description")}
        </p>
      </div>

      {kycStatus !== "approved" && (
        <div className="p-4 border-2 border-yellow-300 bg-yellow-50 text-gray-800">
          {t("reserveProfile.photos.verificationPending")}
          <div className="mt-4">
            <Button
              onClick={onBack}
              variant="outline"
              className="h-10 px-6 border-2 border-black rounded-none"
            >
              ← {t("common.back")}
            </Button>
          </div>
        </div>
      )}
      <div className="space-y-4">
        <div className="flex gap-4">
          <Button
            onClick={openCamera}
            className="h-12 bg-gradient-to-r from-[#32C8D1] to-teal-500 text-white border-2 border-black rounded-none"
          >
            {t("reserveProfile.photos.openCamera")}
          </Button>
          <Button
            onClick={onBack}
            variant="outline"
            className="h-12 border-2 border-black rounded-none"
          >
            {t("common.back")}
          </Button>
        </div>

        {cameraOpen && (
          <div className="border-2 border-black p-4 bg-gray-50">
            <div className="mb-3">
              <Label className="text-sm font-medium text-gray-900">
                {t("reserveProfile.photos.livePreview")}
              </Label>
              <div className="mt-2 h-64 bg-black flex items-center justify-center border-2 border-gray-200">
                <video
                  id="reference-video"
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-sm text-gray-600 mt-2">
                {t("reserveProfile.photos.currentPose")}{" "}
                {currentPose.toUpperCase()}
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={capture}
                className="h-10 bg-black text-white border-2 border-black rounded-none"
              >
                {t("reserveProfile.photos.capture")}
              </Button>
              <Button
                onClick={() =>
                  setCurrentPose(
                    currentPose === "front"
                      ? "left"
                      : currentPose === "left"
                        ? "right"
                        : "front",
                  )
                }
                variant="outline"
                className="h-10 border-2 border-black rounded-none"
              >
                {t("reserveProfile.photos.nextPose")}
              </Button>
              <Button
                onClick={closeCamera}
                variant="outline"
                className="h-10 border-2 border-black rounded-none"
              >
                {t("reserveProfile.actions.close")}
              </Button>
            </div>
          </div>
        )}

        {(captures.front ||
          captures.left ||
          captures.right ||
          uploadedUrls.front ||
          uploadedUrls.left ||
          uploadedUrls.right) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-900">Front</Label>
              <div className="mt-2 h-40 bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                {captures.front || uploadedUrls.front ? (
                  <img
                    src={
                      captures.front ? captures.front.url : uploadedUrls.front
                    }
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-500">Pending</span>
                )}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-900">Left</Label>
              <div className="mt-2 h-40 bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                {captures.left || uploadedUrls.left ? (
                  <img
                    src={captures.left ? captures.left.url : uploadedUrls.left}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-500">Pending</span>
                )}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-900">Right</Label>
              <div className="mt-2 h-40 bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                {captures.right || uploadedUrls.right ? (
                  <img
                    src={
                      captures.right ? captures.right.url : uploadedUrls.right
                    }
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-500">Pending</span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Checkbox
            id="consent"
            checked={consent}
            onCheckedChange={(v: any) => setConsent(!!v)}
          />
          <Label htmlFor="consent">
            I consent to store these reference photos as my digital identity.
          </Label>
        </div>

        <div className="flex gap-4">
          <Button
            onClick={doUpload}
            disabled={
              uploading ||
              !consent ||
              !captures.front ||
              !captures.left ||
              !captures.right
            }
            className="flex-1 h-12 bg-gradient-to-r from-[#32C8D1] to-teal-500 text-white border-2 border-black rounded-none"
          >
            {uploading ? t("common.checking") : "Save & Finish"}
          </Button>
          <Button
            onClick={generateAvatar}
            disabled={
              generating ||
              !consent ||
              !(captures.front && captures.left && captures.right)
            }
            variant="outline"
            className="flex-1 h-12 border-2 border-black rounded-none"
          >
            {generating ? "Generating…" : "Generate Avatar (Duix)"}
          </Button>
        </div>

        {avatarUrl && (
          <div className="mt-4">
            <Label className="text-sm font-medium text-gray-900">
              Generated Avatar
            </Label>
            <img
              src={avatarUrl}
              alt="Avatar"
              className="mt-2 w-full max-w-md border-2 border-gray-200"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReserveProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const creatorType = urlParams.get("type") || "influencer"; // influencer, model_actor, athlete
  const initialMode = (urlParams.get("mode") as "signup" | "login") || "login";
  const [authMode, setAuthMode] = useState<"signup" | "login">(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [step, setStep] = useState(1);
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

  // Cameo reference image URLs
  const [cameoFrontUrl, setCameoFrontUrl] = useState<string | null>(null);
  const [cameoLeftUrl, setCameoLeftUrl] = useState<string | null>(null);
  const [cameoRightUrl, setCameoRightUrl] = useState<string | null>(null);
  const [uploadingCameo, setUploadingCameo] = useState(false);

  const uploadCameoImage = async (
    file: File,
    side: "front" | "left" | "right",
  ) => {
    if (!supabase) {
      alert("Image upload not configured. Missing Supabase keys.");
      return;
    }
    try {
      setUploadingCameo(true);
      const owner = (user?.id || formData.email || "anonymous").replace(
        /[^a-zA-Z0-9_-]/g,
        "_",
      );
      // Pre-scan the raw bytes before storing
      {
        const apiBase =
          (import.meta as any).env.VITE_API_BASE_URL ||
          (import.meta as any).env.VITE_API_BASE ||
          "http://localhost:8787";
        const buf = await file.arrayBuffer();
        const resScan = await fetch(
          `${apiBase}/api/moderation/image-bytes?user_id=${encodeURIComponent(user?.id || owner)}&image_role=${encodeURIComponent(side)}`,
          {
            method: "POST",
            headers: { "content-type": file.type || "image/jpeg" },
            body: new Uint8Array(buf),
          },
        );
        if (resScan.ok) {
          const out = await resScan.json();
          if (out?.flagged) {
            alert(
              `Your ${side} photo was flagged and cannot be used. Please upload a different photo.`,
            );
            throw new Error("Image flagged by moderation");
          }
        } else {
          throw new Error(await resScan.text());
        }
      }
      const path = `cameo/${owner}/${Date.now()}_${side}_${file.name}`;
      const { error } = await supabase.storage
        .from("profiles")
        .upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("profiles").getPublicUrl(path);
      const url = data.publicUrl;
      // Call moderation endpoint
      try {
        const apiBase =
          (import.meta as any).env.VITE_API_BASE_URL ||
          (import.meta as any).env.VITE_API_BASE ||
          "http://localhost:8787";
        const res = await fetch(`${apiBase}/api/moderation/image`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            image_url: url,
            user_id: user?.id || owner,
            image_role: side,
          }),
        });
        if (res.ok) {
          const out = await res.json();
          if (out?.flagged) {
            alert(
              `Your ${side} photo was flagged and cannot be used. Please upload a different photo.`,
            );
            throw new Error("Image flagged by moderation");
          }
        } else {
          throw new Error(await res.text());
        }
      } catch (e) {
        throw e;
      }
      if (side === "front") setCameoFrontUrl(url);
      if (side === "left") setCameoLeftUrl(url);
      if (side === "right") setCameoRightUrl(url);
      // Persist to profile for cross-page prefill (do not create a new row yet)
      try {
        if (user?.id) {
          const column =
            side === "front"
              ? "cameo_front_url"
              : side === "left"
                ? "cameo_left_url"
                : "cameo_right_url";
          await supabase
            .from("profiles")
            .update({ [column]: url })
            .eq("id", user.id);
        }
      } catch (_e) {}
      return { publicUrl: url };
    } catch (e: any) {
      toast({
        title: t("reserveProfile.toasts.uploadFailed"),
        description: getUserFriendlyError(e, t),
        variant: "destructive",
      });
    } finally {
      setUploadingCameo(false);
    }
  };

  const startVerification = async () => {
    const targetId = user?.id || profileId;
    if (!targetId) {
      toast({
        title: t("reserveProfile.toasts.kycErrorTitle"),
        description:
          "Please complete the previous steps before starting verification.",
        className: "bg-cyan-50 border-2 border-cyan-400",
      });
      return;
    }
    try {
      setKycLoading(true);
      const u = new URL(window.location.href);
      u.searchParams.set("step", "4");
      u.searchParams.set("verified", "1");
      const returnUrl = u.toString();
      const res = await fetch(api(`/api/kyc/session`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: targetId, return_url: returnUrl }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setKycProvider(data.provider || "veriff");
      setKycSessionUrl(data.session_url);
      setKycStatus("pending");
      if (data.session_url) window.open(data.session_url, "_blank");
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

  const refreshVerificationStatus = async () => {
    const targetId = user?.id || profileId;
    if (!targetId) return;
    try {
      setKycLoading(true);
      const res = await fetch(
        api(`/api/kyc/status?user_id=${encodeURIComponent(targetId)}`),
      );
      if (!res.ok) throw new Error(await res.text());
      const rows = await res.json();
      const row = Array.isArray(rows) && rows.length ? rows[0] : null;
      if (row) {
        if (row.kyc_status) setKycStatus(row.kyc_status);
        if (row.kyc_provider) setKycProvider(row.kyc_provider);
        if (
          row.kyc_status === "approved" &&
          !cameoFrontUrl &&
          !cameoLeftUrl &&
          !cameoRightUrl
        ) {
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
    } finally {
      setKycLoading(false);
    }
  };

  const verifyAndContinue = async () => {
    try {
      setKycLoading(true);
      const row = await refreshVerificationStatus();
      const kyc = row?.kyc_status || kycStatus;
      if (kyc === "approved") {
        setStep(5);
        return;
      }
      // If user hasn't started verification, kick it off automatically
      if ((kyc || "not_started") === "not_started") {
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
            live:
              live?.replace("_", " ") || t("reserveProfile.status.notStarted"),
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
  const { initialized, authenticated, user } = useAuth();
  const [kycStatus, setKycStatus] = useState<
    "not_started" | "pending" | "approved" | "rejected"
  >("not_started");
  const [kycProvider, setKycProvider] = useState<string | null>(null);
  const [kycSessionUrl, setKycSessionUrl] = useState<string | null>(null);
  const [kycLoading, setKycLoading] = useState(false);
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

  // Initial profile creation (Step 1)
  const createInitialProfileMutation = useMutation<any, Error, any>({
    mutationFn: async (data) => {
      if (!user) throw new Error("Not authenticated");
      try {
        const payload: any = {
          id: user.id,
          email: data.email,
          full_name:
            data.creator_type === "model_actor"
              ? data.stage_name || data.full_name
              : data.full_name,
          creator_type: data.creator_type,
          content_types: [],
          content_other: null,
          industries: [],
          primary_platform: null,
          platform_handle: null,
          work_types: [],
          representation_status: null,
          headshot_url: null,
          sport: null,
          athlete_type: null,
          school_name: null,
          age: null,
          languages: null,
          instagram_handle: null,
          twitter_handle: null,
          brand_categories: [],
          bio: null,
          city: data.city || null,
          state: data.state || null,
          birthdate: data.birthdate || null,
          ethnicity: [],
          gender: data.gender || null,
          vibes: [],
          visibility: "private",
          status: "waitlist",
          is_sample: false,
        };
        const { data: upserted, error } = await supabase
          .from("profiles")
          .upsert(payload, { onConflict: "id" })
          .select();
        if (error) throw error;
        return Array.isArray(upserted) ? upserted[0] : upserted;
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
      const errorMessage =
        (error as any)?.response?.data?.message ||
        (error as any)?.message ||
        "Unknown error occurred";
      toast({
        title: t("reserveProfile.toasts.profileCreationFailed"),
        description: getUserFriendlyError(error, t),
        variant: "destructive",
      });
    },
  });

  // Profile update (Step 3)
  const updateProfileMutation = useMutation<any, Error, any>({
    mutationFn: async (data) => {
      if (!user) throw new Error("Not authenticated");
      try {
        const updateData: any = {
          id: user.id,
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
          status: "waitlist",
        };

        if (cameoFrontUrl) (updateData as any).cameo_front_url = cameoFrontUrl;
        if (cameoLeftUrl) (updateData as any).cameo_left_url = cameoLeftUrl;
        if (cameoRightUrl) (updateData as any).cameo_right_url = cameoRightUrl;

        console.log("Upserting profile with data:", updateData);
        const { data: updated, error } = await supabase
          .from("profiles")
          .upsert(updateData, { onConflict: "id" })
          .select();
        if (error) throw error;
        return Array.isArray(updated) ? updated[0] : updated;
      } catch (error) {
        console.error("Detailed update error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Proceed to verification step
      setProfileId(data.id);
      setStep(4);
    },
    onError: (error) => {
      console.error("Error updating profile:", error);
      const errorMessage =
        (error as any)?.response?.data?.message ||
        (error as any)?.message ||
        "Unknown error occurred";
      toast({
        title: t("reserveProfile.toasts.profileUpdateFailed"),
        description: getUserFriendlyError(error, t),
        variant: "destructive",
      });
    },
  });

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
        // Move to next step; profile will be saved at the end (step 5)
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
            title: "Email Already Registered",
            description:
              "This email is already registered. Please log in instead.",
            className: "bg-cyan-50 border-2 border-cyan-400",
          });
        } else {
          toast({
            title: "Sign-up Failed",
            description: getUserFriendlyError(e),
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
    console.log("Collected step 3 data (no write yet):", formData);
    setStep(4);
  };

  const finalizeProfile = async () => {
    if (!user) {
      toast({
        title: t("reserveProfile.toasts.notSignedInTitle"),
        description: t("reserveProfile.toasts.notSignedInDesc"),
        variant: "destructive",
      });
      return;
    }
    try {
      // Backfill missing cameo URLs from Storage if needed
      let front = cameoFrontUrl;
      let left = cameoLeftUrl;
      let right = cameoRightUrl;
      if ((!front || !left || !right) && supabase) {
        const prefix = `faces/${user.id}/reference`;
        const { data: files } = await supabase.storage
          .from("profiles")
          .list(prefix, { limit: 100 });
        if (files && files.length) {
          files.forEach((f: any) => {
            const name = f.name.toLowerCase();
            const pub = supabase.storage
              .from("profiles")
              .getPublicUrl(`${prefix}/${f.name}`).data.publicUrl;
            if (!front && name.includes("front")) front = pub;
            if (!left && name.includes("left")) left = pub;
            if (!right && name.includes("right")) right = pub;
          });
        }
      }

      const monthlyUsd = Number(formData.base_monthly_price_usd);
      const payload: any = {
        id: user.id,
        email: formData.email,
        full_name:
          creatorType === "model_actor"
            ? formData.stage_name || formData.full_name
            : formData.full_name,
        creator_type: creatorType,
        content_types: formData.content_types || [],
        content_other: formData.content_other || null,
        industries: formData.industries || [],
        primary_platform: formData.primary_platform || null,
        platform_handle: formData.platform_handle || null,
        work_types: formData.work_types || [],
        representation_status: formData.representation_status || "",
        headshot_url: formData.headshot_url || "",
        sport: formData.sport || null,
        athlete_type: formData.athlete_type || null,
        school_name: formData.school_name || null,
        age: formData.age || null,
        languages: formData.languages || null,
        instagram_handle: formData.instagram_handle || null,
        twitter_handle: formData.twitter_handle || null,
        brand_categories: formData.brand_categories || [],
        bio: formData.bio || null,
        city: formData.city || null,
        state: formData.state || null,
        birthdate: formData.birthdate || null,
        ethnicity: formData.ethnicity || [],
        gender: formData.gender || null,
        vibes: formData.vibes || [],
        visibility: formData.visibility || "private",
        status: "waitlist",
        // Pricing in cents (USD-only)
        base_monthly_price_cents: isFinite(monthlyUsd)
          ? Math.round(monthlyUsd * 100)
          : 15000,
        currency_code: "USD",
      };
      if (front) (payload as any).cameo_front_url = front;
      if (left) (payload as any).cameo_left_url = left;
      if (right) (payload as any).cameo_right_url = right;

      const { error } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "id" });
      if (error) throw error;
      setProfileId(user.id);
      setSubmitted(true);
    } catch (e: any) {
      toast({
        title: t("reserveProfile.toasts.profileSaveFailed"),
        description: getUserFriendlyError(e, t),
        variant: "destructive",
      });
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
          <div className="flex items-center justify-center gap-4">
            <Link to="/Login">
              <Button className="rounded-none border-2 border-black bg-black text-white px-6 h-11">
                Sign in
              </Button>
            </Link>
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
                    disabled={
                      createInitialProfileMutation.isPending ||
                      firstContinueLoading
                    }
                    className="w-full h-12 bg-gradient-to-r from-[#32C8D1] to-teal-500 hover:from-[#2AB8C1] hover:to-teal-600 text-white border-2 border-black rounded-none"
                  >
                    {firstContinueLoading
                      ? t("common.checking", "Checking...")
                      : createInitialProfileMutation.isPending
                        ? t("common.saving", "Saving...")
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
                  disabled={updateProfileMutation.isPending}
                  className="h-12 bg-gradient-to-r from-[#32C8D1] to-teal-500 hover:from-[#2AB8C1] hover:to-teal-600 text-white border-2 border-black rounded-none"
                >
                  {updateProfileMutation.isPending
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
                  disabled={kycLoading}
                  className="w-full h-12 bg-gradient-to-r from-[#32C8D1] to-teal-500 hover:from-[#2AB8C1] hover:to-teal-600 text-white border-2 border-black rounded-none"
                >
                  {kycLoading
                    ? t(
                        "reserveProfile.actions.startingVerification",
                        "Starting…",
                      )
                    : t(
                        "reserveProfile.actions.verifyIdentity",
                        "Verify Identity Now",
                      )}
                </Button>
                <div className="text-sm text-gray-700 flex items-center justify-between">
                  <span>
                    KYC:{" "}
                    <strong className="capitalize">
                      {kycStatus === "not_started"
                        ? t("reserveProfile.verification.status.notStarted")
                        : kycStatus === "approved"
                          ? t("reserveProfile.verification.status.approved")
                          : kycStatus === "rejected"
                            ? t("reserveProfile.verification.status.rejected")
                            : t("reserveProfile.verification.status.verifying")}
                    </strong>
                  </span>
                  <span />
                </div>
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
                      disabled={kycLoading}
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
                      onClick={() => setIsLogin(true)}
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
                  disabled={!agreedToTerms}
                  className="w-2/3 h-12 bg-gradient-to-r from-[#32C8D1] to-teal-500 hover:from-[#2AB8C1] hover:to-teal-600 text-white border-2 border-black rounded-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t(
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
