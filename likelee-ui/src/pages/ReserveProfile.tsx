import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  FaceLivenessDetector,
  FaceLivenessDetectorCore,
} from "@aws-amplify/ui-react-liveness";
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
} from "lucide-react";
import {
  Alert as UIAlert,
  AlertDescription as UIAlertDescription,
} from "@/components/ui/alert";
import { ToastAction } from "@/components/ui/toast";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { fetchAuthSession } from "aws-amplify/auth";
import { toast } from "@/components/ui/use-toast";

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
const FaceLivenessDetectorAny: any = FaceLivenessDetector;
const FaceLivenessDetectorCoreAny: any = FaceLivenessDetectorCore;

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
        variant: "destructive",
        title: "Camera Error",
        description:
          "Unable to access camera. Please allow camera permissions.",
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
        variant: "destructive",
        title: "Consent required",
        description: "Please give consent before uploading.",
      });
      return;
    }
    if (!captures.front || !captures.left || !captures.right) {
      toast({
        variant: "destructive",
        title: "Photos required",
        description: "Please capture all three views.",
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
        variant: "destructive",
        title: "Upload failed",
        description: `Failed to upload reference photos: ${e?.message || e}`,
      });
    } finally {
      setUploading(false);
    }
  };

  const generateAvatar = async () => {
    if (!userId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Missing user id.",
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
        variant: "destructive",
        title: "Generation failed",
        description: `Failed to generate avatar: ${e?.message || e}`,
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Reference Photos
        </h3>
        <p className="text-gray-700">
          Capture three photos of your face: front, left profile, and right
          profile. This happens after verification.
        </p>
      </div>

      {kycStatus !== "approved" && (
        <div className="p-4 border-2 border-yellow-300 bg-yellow-50 text-gray-800">
          Verification is pending. You can capture and upload your reference
          photos now, but your profile won't go live until verification is
          approved.
          <div className="mt-4">
            <Button
              onClick={onBack}
              variant="outline"
              className="h-10 px-6 border-2 border-black rounded-none"
            >
              ← Back
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
            Open Camera
          </Button>
          <Button
            onClick={onBack}
            variant="outline"
            className="h-12 border-2 border-black rounded-none"
          >
            Back
          </Button>
        </div>

        {cameraOpen && (
          <div className="border-2 border-black p-4 bg-gray-50">
            <div className="mb-3">
              <Label className="text-sm font-medium text-gray-900">
                Live Camera Preview
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
                Current pose: {currentPose.toUpperCase()}
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                type="submit"
                disabled
                className="w-full h-12 bg-black text-white border-2 border-black rounded-none opacity-50 cursor-not-allowed"
              >
                Log in
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
                Next Pose
              </Button>
              <Button
                onClick={closeCamera}
                variant="outline"
                className="h-10 border-2 border-black rounded-none"
              >
                Close
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
            {uploading ? "Uploading…" : "Save & Finish"}
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
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [step, setStep] = useState(1);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stepParam = params.get("step");
    if (stepParam) {
      setStep(parseInt(stepParam, 10));
    }
  }, []);
  const [submitted, setSubmitted] = useState(false);
  const [showWarning, setShowWarning] = useState(true);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
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
  });

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
      toast({
        variant: "destructive",
        title: "Configuration Error",
        description: "Image upload not configured. Missing Supabase keys.",
      });
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
          (import.meta as any).env.VITE_API_BASE;
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
            toast({
              variant: "destructive",
              title: "Image Flagged",
              description: `Your ${side} photo was flagged and cannot be used. Please upload a different photo.`,
            });
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
          (import.meta as any).env.VITE_API_BASE;
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
            toast({
              variant: "destructive",
              title: "Image Flagged",
              description: `Your ${side} photo was flagged and cannot be used. Please upload a different photo.`,
            });
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
      } catch (_e) { }
      return { publicUrl: url };
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: `Failed to upload image: ${e?.message || e}`,
      });
    } finally {
      setUploadingCameo(false);
    }
  };

  const startVerification = async () => {
    const targetId = user?.id || profileId;
    if (!targetId) {
      toast({
        variant: "destructive",
        title: "Not ready",
        description: "Profile not ready yet. Please complete previous steps.",
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
      setLivenessStatus("pending");
      if (data.session_url) window.open(data.session_url, "_blank");
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: `Failed to start verification: ${e?.message || e}`,
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
        if (row.liveness_status) setLivenessStatus(row.liveness_status);
        if (row.kyc_provider) setKycProvider(row.kyc_provider);
        if (
          row.kyc_status === "approved" &&
          !cameoFrontUrl &&
          !cameoLeftUrl &&
          !cameoRightUrl
        ) {
          toast({
            title: "Identity Verified",
            description:
              "Identity verified! Please upload your 3 reference photos (Front, Left, Right) to complete your setup.",
          });
        }
      }
      return row;
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Status check failed",
        description: `Failed to fetch verification status: ${e?.message || e}`,
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
      const live = row?.liveness_status || livenessStatus;
      if (kyc === "approved" && live === "approved") {
        setStep(5);
        return;
      }
      // If user hasn't started verification, kick it off automatically
      if (
        (kyc || "not_started") === "not_started" &&
        (live || "not_started") === "not_started"
      ) {
        await startVerification();
        return;
      }
      toast({
        variant: "destructive",
        title: "Verification Incomplete",
        description: `Verification not complete yet. KYC: ${kyc || "not_started"}, Liveness: ${live || "not_started"}.`,
      });
    } finally {
      setKycLoading(false);
    }
  };

  const startLiveness = async () => {
    try {
      // Prevent starting new sessions after approval (cost control)
      if (livenessStatus === "approved") {
        toast({
          title: "Info",
          description:
            "Liveness is already approved. No further checks needed.",
        });
        return;
      }
      if (!COGNITO_IDENTITY_POOL_ID) {
        toast({
          variant: "destructive",
          title: "Configuration Error",
          description:
            "Missing VITE_COGNITO_IDENTITY_POOL_ID in UI environment.",
        });
        return;
      }
      setLivenessRunning(true);
      console.log("[liveness] creating server session...");

      // Ensure Amplify fetches/refreshes unauth credentials so the component can use them
      try {
        const session = await fetchAuthSession();
        const accessKeyId = (session as any)?.credentials?.accessKeyId;
        if (accessKeyId)
          console.log("[liveness] Amplify session creds ready", {
            accessKeyId,
          });
      } catch (e) {
        console.warn("[liveness] fetchAuthSession failed (will continue):", e);
      }

      const res = await fetch(api(`/api/liveness/create`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(await res.text());
      const { session_id } = await res.json();
      if (!session_id) throw new Error("Missing session_id");

      // Resolve AWS credentials now and keep them stable for the session
      let resolvedCreds: any | null = null;
      try {
        const session = await fetchAuthSession();
        const creds: any = (session as any)?.credentials;
        if (creds?.accessKeyId && creds?.secretAccessKey) {
          resolvedCreds = {
            accessKeyId: creds.accessKeyId,
            secretAccessKey: creds.secretAccessKey,
            sessionToken: creds.sessionToken,
          };
          console.log("[liveness] pre-resolved Amplify creds", {
            accessKeyId: resolvedCreds.accessKeyId,
          });
        }
      } catch (e) {
        console.warn("[liveness] fetchAuthSession failed (pre-resolve):", e);
      }
      if (!resolvedCreds) {
        const { fromCognitoIdentityPool } =
          await import("@aws-sdk/credential-providers");
        const provider = fromCognitoIdentityPool({
          clientConfig: { region: "us-east-1" },
          identityPoolId: COGNITO_IDENTITY_POOL_ID,
        });
        resolvedCreds = await provider();
        console.log("[liveness] pre-resolved fallback creds", {
          accessKeyId: resolvedCreds.accessKeyId,
        });
      }

      setLivenessCreds(resolvedCreds);
      setLivenessSessionId(session_id);
      setShowLiveness(true);
      // Session is created and modal is open; allow user to click again later if needed
      setLivenessRunning(false);
      console.log("[liveness] session ready, modal opened", session_id);
      setLivenessError(null);
    } catch (e: any) {
      setLivenessRunning(false);
      setShowLiveness(true);
      setLivenessError(e?.message || String(e));
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to start liveness check: ${e?.message || e}`,
      });
    }
  };

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  // Verification state
  const { initialized, authenticated, user } = useAuth();
  const [kycStatus, setKycStatus] = useState<
    "not_started" | "pending" | "approved" | "rejected"
  >("not_started");
  const [livenessStatus, setLivenessStatus] = useState<
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
  const AWS_REGION = (import.meta as any).env.VITE_AWS_REGION || "eu-central-1";
  const COGNITO_IDENTITY_POOL_ID =
    (import.meta as any).env.VITE_COGNITO_IDENTITY_POOL_ID || "";
  const [firstContinueLoading, setFirstContinueLoading] = useState(false);
  const [showLiveness, setShowLiveness] = useState(false);
  const [livenessRunning, setLivenessRunning] = useState(false);
  const [livenessSessionId, setLivenessSessionId] = useState<string | null>(
    null,
  );
  const [livenessCreds, setLivenessCreds] = useState<any | null>(null);
  const LIVENESS_DEBUG =
    ((import.meta as any).env.VITE_LIVENESS_DEBUG || "") === "1";
  const [livenessError, setLivenessError] = useState<string | null>(null);
  const coreCredentialsProvider = React.useCallback(async () => {
    try {
      const session = await fetchAuthSession();
      const creds: any = (session as any)?.credentials;
      if (creds?.accessKeyId && creds?.secretAccessKey) {
        console.log("[liveness] using Amplify creds", {
          accessKeyId: creds.accessKeyId,
        });
        return {
          accessKeyId: creds.accessKeyId,
          secretAccessKey: creds.secretAccessKey,
          sessionToken: creds.sessionToken,
        };
      }
    } catch (e) {
      console.warn(
        "[liveness] fetchAuthSession failed, will fallback to identity pool:",
        e,
      );
    }
    // Fallback: resolve via Cognito Identity Pool directly
    if (!COGNITO_IDENTITY_POOL_ID)
      throw new Error("Missing identity pool id for fallback provider");
    const { fromCognitoIdentityPool } =
      await import("@aws-sdk/credential-providers");
    const provider = fromCognitoIdentityPool({
      clientConfig: { region: "us-east-1" },
      identityPoolId: COGNITO_IDENTITY_POOL_ID,
    });
    const c = await provider();
    console.log("[liveness] using fallback identity-pool creds", {
      accessKeyId: c.accessKeyId,
    });
    return c;
  }, [COGNITO_IDENTITY_POOL_ID]);

  // Ensure modal stays visible whenever we have a session id
  useEffect(() => {
    if (livenessSessionId && !showLiveness) {
      console.log("[liveness] restoring modal visibility");
      setShowLiveness(true);
    }
  }, [livenessSessionId, showLiveness]);

  const getStepTitle = () => {
    if (step === 1) return "Create Your Account";
    if (step === 2) {
      if (creatorType === "influencer") return "Profile Basics";
      if (creatorType === "model_actor") return "Talent Details";
      if (creatorType === "athlete") return "Athlete Info";
    }
    if (step === 3) {
      if (creatorType === "influencer") return "Opportunities";
      if (creatorType === "model_actor") return "Preferences";
      if (creatorType === "athlete") return "Brand Setup";
    }
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
    // Poll every 5s while on step 4
    const interval = setInterval(() => {
      refreshVerificationStatus();
    }, 5000);
    return () => clearInterval(interval);
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
    onSuccess: () => {
      setProfileId(user?.id || null);
      setStep(2);
    },
    onError: (error) => {
      console.error("Error creating initial profile:", error);
      const errorMessage =
        (error as any)?.response?.data?.message ||
        (error as any)?.message ||
        "Unknown error occurred";
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to create profile: ${errorMessage}. Please try again.`,
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
    onSuccess: () => {
      // Proceed to verification step
      setStep(4);
    },
    onError: (error) => {
      console.error("Error updating profile:", error);
      const errorMessage =
        (error as any)?.response?.data?.message ||
        (error as any)?.message ||
        "Unknown error occurred";
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to update profile: ${errorMessage}. Please try again.`,
      });
    },
  });

  const handleFirstContinue = () => {
    if (!formData.email) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter your email address.",
      });
      return;
    }
    if (!formData.password) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter a password.",
      });
      return;
    }
    if (!formData.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please confirm your password.",
      });
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Passwords do not match.",
      });
      return;
    }
    if (
      creatorType === "model_actor" &&
      !formData.stage_name &&
      !formData.full_name
    ) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter your full name or stage name.",
      });
      return;
    }
    if (creatorType !== "model_actor" && !formData.full_name) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter your full name.",
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
            title: "Email Registered",
            description:
              "This email is already registered. Would you like us to send a magic link to sign in?",
            action: (
              <ToastAction
                altText="Send Magic Link"
                onClick={async () => {
                  const { error } = await supabase.auth.signInWithOtp({
                    email: formData.email.trim().toLowerCase(),
                    options: {
                      emailRedirectTo: `${window.location.origin}/ReserveProfile`,
                    },
                  });
                  if (error) {
                    toast({
                      variant: "destructive",
                      title: "Error",
                      description: error.message,
                    });
                  } else {
                    toast({
                      title: "Magic Link Sent",
                      description: "Check your email to complete sign-in.",
                    });
                  }
                }}
              >
                Send Magic Link
              </ToastAction>
            ),
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
            title: "Registration Successful",
            description:
              "Please check your email to verify your account before continuing.",
          });
          return;
        }

        // Move to next step; profile will be saved at the end (step 5)
        setStep(2);
      } catch (e: any) {
        toast({
          variant: "destructive",
          title: "Sign Up Failed",
          description: e?.message || e,
        });
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
            variant: "destructive",
            title: "City is required",
            description: "Please enter your city.",
          });
          return;
        }
        if (!formData.state?.trim()) {
          toast({
            variant: "destructive",
            title: "State is required",
            description: "Please enter your state.",
          });
          return;
        }
        if (!formData.birthdate) {
          toast({
            variant: "destructive",
            title: "Birthdate is required",
            description: "Please enter your birthdate.",
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
            variant: "destructive",
            title: "Age restriction",
            description: "You must be 18 or older.",
          });
          return;
        }
        if (!formData.gender?.trim()) {
          toast({
            variant: "destructive",
            title: "Identity required",
            description: "Please select how you identify.",
          });
          return;
        }
      }
      // Pricing required in onboarding step (applies to all creator types)
      const monthly = Number(formData.base_monthly_price_usd);
      if (!isFinite(monthly) || monthly < 150) {
        toast({
          variant: "destructive",
          title: "Price required",
          description:
            "Please set your base monthly license price (minimum $150).",
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
          variant: "destructive",
          title: "Campaign type required",
          description: "Select at least one campaign type.",
        });
        return;
      }
      if (!formData.industries || formData.industries.length === 0) {
        toast({
          variant: "destructive",
          title: "Industry required",
          description: "Select at least one industry.",
        });
        return;
      }
      if (!formData.primary_platform?.trim()) {
        toast({
          variant: "destructive",
          title: "Platform required",
          description: "Primary platform is required.",
        });
        return;
      }
      if (!formData.platform_handle?.trim()) {
        toast({
          variant: "destructive",
          title: "Handle required",
          description: "Handle is required.",
        });
        return;
      }
      if (!formData.visibility) {
        toast({
          variant: "destructive",
          title: "Visibility required",
          description: "Please select a profile visibility.",
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
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in.",
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
        variant: "destructive",
        title: "Save Failed",
        description: `Failed to save your profile: ${e?.message || e}`,
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
            Profile reserved—welcome to the Likelee ecosystem
          </h1>
          <p className="text-lg text-gray-700 leading-relaxed mb-8">
            We're onboarding talent in waves to keep demand and visibility
            balanced. Your profile is saved; we'll notify you when it's time to
            complete verification and go live.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/ReserveProfile">
              <Button className="rounded-none border-2 border-black bg-black text-white px-6 h-11">
                Sign in
              </Button>
            </Link>
            <Link to="/CreatorDashboard">
              <Button
                variant="outline"
                className="rounded-none border-2 border-black h-11 px-6"
              >
                Go to Dashboard
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

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Reserve Your Profile
            </h2>
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
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {getStepTitle()}
                </h3>
                <p className="text-gray-600">
                  {creatorType === "athlete" && "Create your NIL-ready account"}
                  {creatorType === "model_actor" &&
                    "Create your Likelee account"}
                  {creatorType === "influencer" &&
                    "Let's start with the basics"}
                </p>
              </div>

              {/* Auth mode switch */}
              <div className="flex gap-2">
                <Button
                  variant={authMode === "signup" ? "default" : "outline"}
                  className="rounded-none border-2 border-black"
                  onClick={() => setAuthMode("signup")}
                >
                  Sign up
                </Button>
                <Button
                  variant={authMode === "login" ? "default" : "outline"}
                  className="rounded-none border-2 border-black"
                  onClick={() => setAuthMode("login")}
                >
                  Log in
                </Button>
              </div>

              {authMode === "signup" ? (
                <div className="space-y-4">
                  <div>
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      Email Address
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
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        required
                        className="border-gray-300 rounded-none pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500"
                      >
                        {showPassword ? (
                          <EyeOff size={20} />
                        ) : (
                          <Eye size={20} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label
                      htmlFor="confirmPassword"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      Confirm Password
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
                        required
                        className="border-gray-300 rounded-none pr-10"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500"
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={20} />
                        ) : (
                          <Eye size={20} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label
                      htmlFor="full_name"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      Full Name
                    </Label>
                    <Input
                      id="full_name"
                      type="text"
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData({ ...formData, full_name: e.target.value })
                      }
                      required
                      className="border-gray-300 rounded-none"
                      placeholder="Your full name"
                    />
                  </div>
                  <div
                    onClick={() =>
                      toast({
                        title: "Temporarily Disabled",
                        description:
                          "Sign-up is under maintenance. Please check back later.",
                      })
                    }
                  >
                    <Button
                      disabled
                      className="w-full h-12 bg-gradient-to-r from-[#32C8D1] to-teal-500 text-white border-2 border-black rounded-none opacity-50 cursor-not-allowed"
                    >
                      Continue
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </div>
                </div>
              ) : (
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    toast({
                      title: "Temporarily Disabled",
                      description:
                        "Login is under maintenance. Please check back later.",
                    });
                  }}
                >
                  <div>
                    <Label
                      htmlFor="login_email"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      Email Address
                    </Label>
                    <Input
                      id="login_email"
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
                      htmlFor="login_password"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="login_password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        required
                        className="border-gray-300 rounded-none pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500"
                      >
                        {showPassword ? (
                          <EyeOff size={20} />
                        ) : (
                          <Eye size={20} />
                        )}
                      </button>
                    </div>
                    <div className="text-right">
                      <Link
                        to="/forgot-password"
                        className="text-sm text-cyan-600 hover:underline"
                      >
                        Forgot Password?
                      </Link>
                    </div>
                  </div>
                  <div
                    onClick={() =>
                      toast({
                        title: "Temporarily Disabled",
                        description:
                          "Login is under maintenance. Please check back later.",
                      })
                    }
                  >
                    <Button
                      type="submit"
                      disabled
                      className="w-full h-12 bg-black text-white border-2 border-black rounded-none opacity-50 cursor-not-allowed"
                    >
                      Log in
                    </Button>
                  </div>
                </form>
              )}

              {/* Liveness Modal */}
              {showLiveness &&
                createPortal(
                  <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" />
                    <div className="relative z-10 w-full max-w-2xl bg-white border-2 border-black p-3">
                      <div className="mb-2 font-semibold">Face Liveness</div>
                      <div className="text-xs text-gray-600 mb-2">
                        Session: {livenessSessionId} • Region: {AWS_REGION}
                      </div>
                      {livenessError && (
                        <div className="mb-2 p-2 border-2 border-red-400 bg-red-50 text-red-800 text-xs">
                          Error: {livenessError}
                        </div>
                      )}
                      {livenessSessionId && livenessCreds && (
                        <FaceLivenessDetectorCoreAny
                          sessionId={livenessSessionId}
                          region={"us-east-1"}
                          // Provide multiple shapes to satisfy various lib expectations
                          credentialProvider={async () => livenessCreds}
                          credentialsProvider={async () => livenessCreds}
                          credentials={livenessCreds}
                          config={{
                            awsCredentials: livenessCreds,
                            credentialProvider: async () => livenessCreds,
                          }}
                          onAnalysisComplete={async () => {
                            try {
                              console.log(
                                "[liveness] analysis complete; fetching results",
                              );
                              const r = await fetch(
                                api(`/api/liveness/result`),
                                {
                                  method: "POST",
                                  headers: {
                                    "content-type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    session_id: livenessSessionId,
                                  }),
                                },
                              );
                              if (r.ok) {
                                const data = await r.json();
                                console.log("[liveness] result", data);
                                setLivenessStatus(
                                  data.passed ? "approved" : "rejected",
                                );
                                // Close modal and clear session/creds on either outcome to reset UI.
                                // For rejection, user can re-open and retry cleanly.
                                if (!data.passed) {
                                  toast({
                                    variant: "destructive",
                                    title: "Liveness Check Failed",
                                    description:
                                      "Liveness check failed. Please try again with good lighting and follow prompts.",
                                  });
                                }
                                setTimeout(() => {
                                  setShowLiveness(false);
                                  setLivenessSessionId(null);
                                  setLivenessCreds(null);
                                }, 300);
                              } else {
                                toast({
                                  variant: "destructive",
                                  title: "Upload Failed",
                                  description: `Failed to fetch liveness result: ${await r.text()}`,
                                });
                              }
                            } finally {
                              setLivenessRunning(false);
                              // Keep modal and session so user can see result and retry/close manually
                            }
                          }}
                          onError={(e: any) => {
                            console.error("Liveness error", e);
                            setLivenessError(e?.message || String(e));
                            toast({
                              variant: "destructive",
                              title: "Liveness Error",
                              description: e?.message || e,
                            });
                            setLivenessRunning(false);
                            // Keep modal open to present the error
                            // Do not clear session id; keep it for retry/diagnostics
                          }}
                        />
                      )}
                      <div className="mt-3 text-sm text-gray-600">
                        Follow the on-screen prompts. This uses secure AWS
                        Rekognition.
                      </div>

                      <div className="mt-3 flex justify-end gap-2">
                        <Button
                          variant="outline"
                          className="h-8 border-2 border-black rounded-none"
                          onClick={() => {
                            setShowLiveness(false);
                            setLivenessError(null);
                          }}
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                  </div>,
                  document.body,
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
                  {creatorType === "influencer" &&
                    "Tell us a little about yourself"}
                  {creatorType === "model_actor" &&
                    "Let's start your portfolio"}
                  {creatorType === "athlete" && "Tell us about your sport"}
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="city"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      City
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
                      State
                    </Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) =>
                        setFormData({ ...formData, state: e.target.value })
                      }
                      className="border-2 border-gray-300 rounded-none"
                      placeholder="CA"
                    />
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="birthdate"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    {creatorType === "athlete" ? "Age" : "Birthdate"}
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
                      placeholder="21"
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
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    How do you identify?
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
                          {ethnicity}
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
                        Sport
                      </Label>
                      <Select
                        value={formData.sport}
                        onValueChange={(value) =>
                          setFormData({ ...formData, sport: value })
                        }
                      >
                        <SelectTrigger className="border-2 border-gray-300 rounded-none">
                          <SelectValue placeholder="Select your sport" />
                        </SelectTrigger>
                        <SelectContent>
                          {sportsOptions.map((sport) => (
                            <SelectItem key={sport} value={sport}>
                              {sport}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-3 block">
                        Athlete Type
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
                                  {option}
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
                          School Name
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
                          placeholder="University name"
                        />
                      </div>
                    )}

                    <div>
                      <Label
                        htmlFor="languages"
                        className="text-sm font-medium text-gray-700 mb-2 block"
                      >
                        Languages
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
                        placeholder="e.g., English, Spanish"
                      />
                    </div>
                  </>
                )}

                {/* Model-specific fields */}
                {creatorType === "model_actor" && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-medium text-gray-900">
                        Type of work (select up to 3)
                      </Label>
                      <span className="text-xs text-gray-500">
                        You can specify more later
                      </span>
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
                                  variant: "destructive",
                                  title: "Selection Limit",
                                  description:
                                    "Please select up to 3 options for now. You can add more later.",
                                });
                              }
                            }}
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
                )}

                {/* Influencer vibes */}
                {creatorType === "influencer" && (
                  <div>
                    <Label className="text-sm font-medium text-gray-900 mb-3 block">
                      Vibe / Style Tags
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
                            {vibe}
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
                  Licensing Pricing
                </h4>
                <div className="w-full flex justify-center">
                  <div className="w-full max-w-sm">
                    <Label
                      htmlFor="base_monthly_price"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      Base monthly license price (USD)
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
                        placeholder="150"
                      />
                      <span className="text-sm text-gray-600">/month</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum $150/month. Currency is locked to USD.
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
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  className="flex-1 h-12 bg-gradient-to-r from-[#32C8D1] to-teal-500 hover:from-[#2AB8C1] hover:to-teal-600 text-white border-2 border-black rounded-none"
                >
                  {creatorType === "athlete" ? "Next: Brand Setup" : "Continue"}
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
                  {creatorType === "influencer" &&
                    "Help us match you with the right campaigns"}
                  {creatorType === "model_actor" &&
                    "Help us tailor your opportunities"}
                  {creatorType === "athlete" &&
                    "Get ready to attract sponsorship and brand deals"}
                </p>
              </div>

              <div className="space-y-6">
                {/* Influencer Step 3 */}
                {creatorType === "influencer" && (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-medium text-gray-900">
                          What kind of content are you interested in being
                          featured in?
                        </Label>
                        <span className="text-xs text-gray-500">
                          Select up to 3 for now
                        </span>
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
                          placeholder="Please specify..."
                        />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-medium text-gray-900">
                          What types of brands or industries do you want to work
                          with?
                        </Label>
                        <span className="text-xs text-gray-500">
                          Select up to 3 for now
                        </span>
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
                              {industry}
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
                          Primary Platform
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
                        <Label
                          htmlFor="platform_handle"
                          className="text-sm font-medium text-gray-700 mb-2 block"
                        >
                          Handle
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
                          placeholder="@yourhandle"
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
                        Representation Status
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
                              {vibe}
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
                        Upload Headshot (optional)
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
                        placeholder="Image URL"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        You can upload your headshot after creating your account
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
                          Instagram (optional)
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
                          placeholder="@yourhandle"
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="twitter_handle"
                          className="text-sm font-medium text-gray-700 mb-2 block"
                        >
                          Twitter/X (optional)
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
                          placeholder="@yourhandle"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-medium text-gray-900">
                          Interests / Brand Categories
                        </Label>
                        <span className="text-xs text-gray-500">
                          Select up to 3 for now
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
                              {category}
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
                        Short Bio
                      </Label>
                      <Textarea
                        id="bio"
                        value={formData.bio}
                        onChange={(e) =>
                          setFormData({ ...formData, bio: e.target.value })
                        }
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
                          <span className="font-medium">Public</span> - Visible
                          to everyone
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
                          <span className="font-medium">Private</span> - Only
                          discoverable to brands and AI creators
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
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={updateProfileMutation.isPending}
                  className="h-12 bg-gradient-to-r from-[#32C8D1] to-teal-500 hover:from-[#2AB8C1] hover:to-teal-600 text-white border-2 border-black rounded-none"
                >
                  {updateProfileMutation.isPending
                    ? "Saving..."
                    : "Save & Continue to Verification"}
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
                  Identity Verification
                </h3>
                <p className="text-gray-700">
                  Verify your identity to become visible to brands and unlock
                  opportunities
                </p>
              </div>

              {/* Why verify box */}
              <div className="p-5 border-2 border-[#32C8D1] bg-cyan-50">
                <h4 className="font-bold text-gray-900 mb-3">
                  Why verify your identity?
                </h4>
                <ul className="space-y-2 text-gray-800">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#32C8D1] mt-1" /> Get
                    discovered by brands looking for verified creators
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#32C8D1] mt-1" />{" "}
                    Build trust and credibility with licensing partners
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#32C8D1] mt-1" />{" "}
                    Unlock higher-value campaign opportunities
                  </li>
                </ul>
              </div>

              <p className="text-gray-700">
                We use secure identity verification to ensure all creators on
                Likelee are authentic. This process typically takes 2–3 minutes.
              </p>

              {/* Requirements box */}
              <div className="p-5 border-2 border-gray-300 bg-gray-50">
                <h4 className="font-bold text-gray-900 mb-2">
                  What you'll need:
                </h4>
                <ul className="list-disc list-inside text-gray-800 space-y-1">
                  <li>
                    Government-issued ID (driver's license, passport, or state
                    ID)
                  </li>
                  <li>Good lighting and camera/mic access</li>
                  <li>2–3 minutes in a quiet space</li>
                </ul>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={startVerification}
                  disabled={kycLoading}
                  className="w-full h-12 bg-gradient-to-r from-[#32C8D1] to-teal-500 hover:from-[#2AB8C1] hover:to-teal-600 text-white border-2 border-black rounded-none"
                >
                  {kycLoading ? "Starting…" : "Verify Identity Now"}
                </Button>
                <Button
                  onClick={startLiveness}
                  disabled={livenessRunning || livenessStatus === "approved"}
                  variant="outline"
                  className="w-full h-12 border-2 border-black rounded-none"
                >
                  {livenessStatus === "approved"
                    ? "Liveness Approved"
                    : livenessRunning
                      ? "Preparing…"
                      : "Start Liveness Check"}
                </Button>
                {LIVENESS_DEBUG && showLiveness && (
                  <div className="p-3 border-2 border-purple-400 bg-purple-50 text-xs text-gray-800 space-y-2">
                    <div>
                      Debug: step={step} • showLiveness={String(showLiveness)} •
                      session={livenessSessionId || "—"} • region={AWS_REGION}
                    </div>
                    {livenessSessionId && livenessCreds && (
                      <div className="border border-gray-200">
                        <FaceLivenessDetectorCoreAny
                          sessionId={livenessSessionId}
                          region={"us-east-1"}
                          credentialProvider={async () => livenessCreds}
                          credentialsProvider={async () => livenessCreds}
                          credentials={livenessCreds}
                          config={{
                            awsCredentials: livenessCreds,
                            credentialProvider: async () => livenessCreds,
                          }}
                          onAnalysisComplete={async () => {
                            try {
                              const r = await fetch(
                                api(`/api/liveness/result`),
                                {
                                  method: "POST",
                                  headers: {
                                    "content-type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    session_id: livenessSessionId,
                                  }),
                                },
                              );
                              if (r.ok) {
                                const data = await r.json();
                                setLivenessStatus(
                                  data.passed ? "approved" : "rejected",
                                );
                                if (!data.passed) {
                                  toast({
                                    variant: "destructive",
                                    title: "Liveness Check Failed",
                                    description:
                                      "Liveness check failed. Please try again with good lighting and follow prompts.",
                                  });
                                }
                                // Always close and clear after a result to avoid lingering "Verifying" UI
                                setTimeout(() => {
                                  setShowLiveness(false);
                                  setLivenessSessionId(null);
                                  setLivenessCreds(null);
                                }, 300);
                              } else {
                                toast({
                                  variant: "destructive",
                                  title: "Upload Failed",
                                  description: `Failed to fetch liveness result: ${await r.text()}`,
                                });
                              }
                            } finally {
                              setLivenessRunning(false);
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
                <div className="text-sm text-gray-700 flex items-center justify-between">
                  <span>
                    KYC:{" "}
                    <strong className="capitalize">
                      {kycStatus.replace("_", " ")}
                    </strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <span>Liveness:</span>
                    {livenessStatus === "approved" && (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <strong className="capitalize text-green-700">
                          approved
                        </strong>
                      </>
                    )}
                    {livenessStatus === "rejected" && (
                      <>
                        <XCircle className="w-4 h-4 text-red-600" />
                        <strong className="capitalize text-red-700">
                          rejected
                        </strong>
                      </>
                    )}
                    {livenessStatus === "pending" && (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <strong className="capitalize text-blue-700">
                          verifying
                        </strong>
                      </>
                    )}
                    {livenessStatus === "not_started" && (
                      <strong className="capitalize text-gray-700">
                        not started
                      </strong>
                    )}
                  </span>
                </div>
                <div className="w-full">
                  <div className="grid grid-cols-3 gap-2 w-full max-w-xl mx-auto">
                    <Button
                      onClick={handleBack}
                      variant="outline"
                      className="w-full h-12 border-2 border-black rounded-none"
                    >
                      <ArrowLeft className="w-5 h-5 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={() => setShowSkipModal(true)}
                      variant="outline"
                      className="w-full h-12 border-2 border-gray-300 rounded-none"
                    >
                      Skip for Now
                    </Button>
                    <Button
                      onClick={verifyAndContinue}
                      disabled={kycLoading}
                      className="w-full h-12 bg-gradient-to-r from-[#32C8D1] to-teal-500 hover:from-[#2AB8C1] hover:to-teal-600 text-white border-2 border-black rounded-none"
                    >
                      {kycLoading ? "Checking…" : "Verify & Continue"}
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
                      Skip Identity Verification?
                    </h4>
                    <p className="text-sm text-gray-700 mb-4">
                      If you skip now, your profile will be created, but brands
                      won't see you until you complete verification.
                    </p>
                    <div className="p-3 border-2 border-amber-500 bg-amber-50 text-amber-900 mb-4 text-sm">
                      You can complete verification anytime from your dashboard.
                    </div>
                    <div className="flex gap-3 justify-end">
                      <Button
                        variant="outline"
                        className="rounded-none border-2 border-black"
                        onClick={() => setShowSkipModal(false)}
                      >
                        ← Go Back
                      </Button>
                      <Button
                        className="rounded-none border-2 border-black bg-black text-white"
                        onClick={() => {
                          setShowSkipModal(false);
                          finalizeProfile();
                        }}
                      >
                        Skip for Now - I'm Sure
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
