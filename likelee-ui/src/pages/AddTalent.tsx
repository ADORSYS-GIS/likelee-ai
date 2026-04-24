import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Upload,
  Instagram,
  Mic,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Loader2,
  User,
  Image as ImageIcon,
  Video,
  Trash2,
  Play,
  UserCheck,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

import { createAgencyTalent } from "@/api/functions";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { DobInput } from "@/components/ui/DobInput";

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

const getEthnicityTranslationKey = (ethnicity: string) => {
  const keyMap: Record<string, string> = {
    Asian: "asian",
    "Black / African American": "blackAfrican",
    "Hispanic / Latino": "hispanicLatino",
    "Middle Eastern / North African": "middleEasternNorthAfrican",
    "Native American / Indigenous": "nativeAmericanIndigenous",
    "Pacific Islander": "pacificIslander",
    "White / Caucasian": "whiteCaucasian",
    "Mixed / Multiracial": "mixedMultiracial",
    "Prefer not to say": "preferNotToSay",
  };
  return keyMap[ethnicity] || ethnicity.toLowerCase().replace(/\s+/g, "");
};

const hairColors = ["Black", "Brown", "Blonde", "Red", "Gray/White", "Dyed"];
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

export default function AddTalent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const totalSteps = 3;
  const [duplicateConflict, setDuplicateConflict] = useState<{
    open: boolean;
    talentName: string;
    talentId: string;
    sameAgency: boolean;
  }>({ open: false, talentName: "", talentId: "", sameAgency: false });

  const [profilePhotoIndex, setProfilePhotoIndex] = useState<number | null>(
    null,
  );

  const [formData, setFormData] = useState({
    // Basic Info
    full_name: "",
    stage_name: "",
    email: "",
    phone: "",
    birthdate: "",
    role_types: [],

    // Physical Attributes
    gender: "",
    ethnicity: [],
    hair_color: "",
    eye_color: "",
    skin_tone: "",
    tattoos: "unknown",
    piercings: "unknown",
    height_feet: "",
    height_inches: "",
    bust_inches: "",
    waist_inches: "",
    hips_inches: "",

    // Location
    city: "",
    state: "",
    country: "",
    organization: "",
    sports: "",

    // Media
    hero_media: null,
    photos: [],
    voice_sample: null,

    // Social
    instagram_handle: "",

    // Notes
    bio: "",
    special_skills: "",
    licensing_rate_monthly_usd: "",
    accept_negotiations: true,
  });

  const normalizedAgencyType = String((profile as any)?.agency_type || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  const isSportsAgency = normalizedAgencyType === "sports_agency";
  const showOrganizationField = isSportsAgency;
  const entityTitle = isSportsAgency ? "Athlete" : "Talent";
  const entityTitlePlural = isSportsAgency ? "Athletes" : "Talent";
  const entityLower = isSportsAgency ? "athlete" : "talent";

  useEffect(() => {
    const prospect = (location as any)?.state?.prospect;
    if (prospect) {
      setFormData((prev) => ({
        ...prev,
        full_name: prospect.full_name || "",
        email: prospect.email || "",
        phone: prospect.phone || "",
        instagram_handle: prospect.instagram_handle || "",
      }));
    }
  }, [location]);

  useEffect(() => {
    setProfilePhotoIndex((prev) => {
      const len = Array.isArray(formData.photos) ? formData.photos.length : 0;
      if (len === 0) return null;
      if (prev === null) return 0;
      if (prev >= len) return 0;
      return prev;
    });
  }, [formData.photos]);

  const roleCategories = isSportsAgency
    ? ["Actor", "Creator", "Voice", "Athlete"]
    : ["Model", "Actor", "Creator", "Voice"];

  const fileInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const voiceInputRef = useRef(null);

  const handleHeroUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = (e.target.files?.[0] as File | undefined) ?? undefined;
    if (file) {
      setUploading(true);
      setTimeout(() => {
        setFormData((prev) => ({
          ...prev,
          hero_media: {
            url: URL.createObjectURL(file),
            type: file.type.includes("video") ? "video" : "image",
            name: file.name,
            file,
          },
        }));
        setUploading(false);
      }, 1000);
    }
  };

  const handlePhotosUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e?.target;
    const files = Array.from(input?.files || []) as File[];
    if (input) {
      input.value = "";
    }
    if (files.length > 0) {
      setUploading(true);
      setTimeout(() => {
        const newPhotos = files.map((file: File) => ({
          url: URL.createObjectURL(file),
          name: file.name,
          file,
        }));
        setFormData((prev) => ({
          ...prev,
          photos: [...prev.photos, ...newPhotos],
        }));
        setProfilePhotoIndex((prev) => {
          if (prev !== null) return prev;
          return 0;
        });
        setUploading(false);
      }, 1000);
    }
  };

  const handleVoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = (e.target.files?.[0] as File | undefined) ?? undefined;
    if (file) {
      setUploadingVoice(true);
      setTimeout(() => {
        setFormData((prev) => ({
          ...prev,
          voice_sample: {
            url: URL.createObjectURL(file),
            name: file.name,
            file,
          },
        }));
        setUploadingVoice(false);
      }, 1000);
    }
  };

  const handleDeletePhoto = (index) => {
    setFormData({
      ...formData,
      photos: formData.photos.filter((_, i) => i !== index),
    });
    setProfilePhotoIndex((prev) => {
      if (prev === null) return null;
      if (prev === index) {
        const nextLen = formData.photos.length - 1;
        return nextLen > 0 ? 0 : null;
      }
      if (prev > index) return prev - 1;
      return prev;
    });
  };

  const getAgeYears = (dob: string) => {
    if (!dob) return null;
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
    return age;
  };

  const isAtLeast18 = (dob: string) => {
    const age = getAgeYears(dob);
    if (age === null) return false;
    return age >= 18;
  };

  const toggleEthnicity = (ethnicity) => {
    setFormData((prev) => {
      const exists = prev.ethnicity.includes(ethnicity);
      if (exists) {
        return {
          ...prev,
          ethnicity: prev.ethnicity.filter((e) => e !== ethnicity),
        };
      } else {
        return { ...prev, ethnicity: [...prev.ethnicity, ethnicity] };
      }
    });
  };

  const toggleRoleCategory = (category) => {
    const current = Array.isArray(formData.role_types)
      ? formData.role_types
      : [];
    if (current.includes(category)) {
      setFormData({
        ...formData,
        role_types: current.filter((c) => c !== category),
      });
    } else {
      setFormData({
        ...formData,
        role_types: [...current, category],
      });
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);

      if (!isAtLeast18(formData.birthdate)) {
        toast({
          title: t("agencyDashboard.addTalent.toast.invalidDateOfBirth", {
            defaultValue: "Invalid date of birth",
          }),
          description: t("agencyDashboard.addTalent.toast.mustBeAtLeast18", {
            entityTitle,
            defaultValue: `${entityTitle} must be at least 18 years old.`,
          }),
          variant: "destructive",
        });
        return;
      }

      let profilePhotoUrl = "";
      let galleryPhotoUrls: string[] = [];

      // Upload Gallery Photos if exist
      const photoFiles: File[] = Array.isArray(formData.photos)
        ? (formData.photos
            .map((p: any) => p?.file)
            .filter((f: any) => !!f) as File[])
        : [];
      if (photoFiles.length > 0 && supabase && user?.id) {
        try {
          const urls: string[] = [];
          for (const file of photoFiles) {
            const safeName = (file.name || "photo")
              .toString()
              .replace(/[^a-zA-Z0-9_.-]/g, "_");
            const ext = safeName.includes(".")
              ? safeName.split(".").pop()
              : file.type?.includes("png")
                ? "png"
                : "jpg";
            const rand =
              (globalThis as any)?.crypto?.randomUUID?.() ||
              `${Date.now()}_${Math.random().toString(16).slice(2)}`;
            const path = `agency/${user.id}/talents/gallery_${rand}.${ext}`;
            const { error } = await supabase.storage
              .from("likelee-public")
              .upload(path, file, {
                upsert: true,
                contentType: file.type || "image/jpeg",
              });
            if (error) throw error;
            const { data } = supabase.storage
              .from("likelee-public")
              .getPublicUrl(path);
            const publicUrl = data.publicUrl || "";
            if (publicUrl) urls.push(publicUrl);
          }
          galleryPhotoUrls = urls;
          const idx = profilePhotoIndex ?? 0;
          profilePhotoUrl = urls[idx] || urls[0] || "";
        } catch (e: any) {
          console.error("Photo upload failed:", e);
          toast({
            title: t("agencyDashboard.addTalent.toast.uploadFailed", {
              defaultValue: "Upload failed",
            }),
            description: t(
              "agencyDashboard.addTalent.toast.couldNotUploadPhotos",
              {
                entityTitle,
                defaultValue: `Could not upload photos. ${entityTitle} will be created without photos.`,
              },
            ),
            variant: "destructive",
          });
        }
      }

      // Upload Hero Media if exists
      let heroMediaUrl = "";
      if (
        formData.hero_media &&
        formData.hero_media.file &&
        supabase &&
        user?.id
      ) {
        try {
          const file = formData.hero_media.file;
          const safeName = (file.name || "hero")
            .toString()
            .replace(/[^a-zA-Z0-9_.-]/g, "_");
          const ext = safeName.includes(".")
            ? safeName.split(".").pop()
            : file.type?.includes("video")
              ? "mp4"
              : "jpg";
          const rand =
            (globalThis as any)?.crypto?.randomUUID?.() ||
            `${Date.now()}_${Math.random().toString(16).slice(2)}`;
          const path = `agency/${user.id}/talents/hero_${rand}.${ext}`;
          const { error } = await supabase.storage
            .from("likelee-public")
            .upload(path, file, {
              upsert: true,
              contentType: file.type || "application/octet-stream",
            });
          if (error) throw error;
          const { data } = supabase.storage
            .from("likelee-public")
            .getPublicUrl(path);
          heroMediaUrl = data.publicUrl || "";

          // If hero media is an image and we don't have a profile photo yet, use it
          if (!profilePhotoUrl && formData.hero_media.type === "image") {
            profilePhotoUrl = heroMediaUrl;
          }
        } catch (e: any) {
          const msg = e?.message || String(e);
          console.error("Hero media upload failed:", msg, e);
          toast({
            title: t("agencyDashboard.addTalent.toast.heroUploadFailed"),
            description: t(
              "agencyDashboard.addTalent.toast.heroUploadFailedDesc",
              { msg },
            ),
            variant: "destructive",
          });
        }
      }

      // Upload Voice Sample if exists
      let voiceSampleUrl = "";
      if (
        formData.voice_sample &&
        formData.voice_sample.file &&
        supabase &&
        user?.id
      ) {
        try {
          const file = formData.voice_sample.file;
          const safeName = (file.name || "voice")
            .toString()
            .replace(/[^a-zA-Z0-9_.-]/g, "_");
          const ext = safeName.includes(".")
            ? safeName.split(".").pop()
            : "mp3";
          const rand =
            (globalThis as any)?.crypto?.randomUUID?.() ||
            `${Date.now()}_${Math.random().toString(16).slice(2)}`;
          const path = `agency/${user.id}/talents/voice_${rand}.${ext}`;
          const { error } = await supabase.storage
            .from("likelee-public")
            .upload(path, file, {
              upsert: true,
              contentType: file.type || "audio/mpeg",
            });
          if (error) throw error;
          const { data } = supabase.storage
            .from("likelee-public")
            .getPublicUrl(path);
          voiceSampleUrl = data.publicUrl || "";
        } catch (e: any) {
          const msg = e?.message || String(e);
          console.error("Voice sample upload failed:", msg, e);
          toast({
            title: t("agencyDashboard.addTalent.toast.voiceUploadFailed"),
            description: t(
              "agencyDashboard.addTalent.toast.voiceUploadFailedDesc",
              { msg },
            ),
            variant: "destructive",
          });
        }
      }

      const aiUsage: string[] = [];
      if (formData.hero_media) {
        if (formData.hero_media.type === "video") aiUsage.push("Video");
        if (formData.hero_media.type === "image") aiUsage.push("Image");
      }
      if (formData.photos && formData.photos.length > 0) {
        if (!aiUsage.includes("Image")) aiUsage.push("Image");
      }
      if (formData.voice_sample) {
        if (!aiUsage.includes("Voice")) aiUsage.push("Voice");
      }

      // Map frontend form data to backend expected format
      // Note: Ideally we upload images to S3/Storage first and get a URL.
      // For this demo, we'll use a placeholder if it's a local blob URL.
      const payload = {
        full_name: formData.full_name,
        stage_name: formData.stage_name,
        email: formData.email,
        phone: formData.phone,
        birthdate: formData.birthdate,
        role_type: formData.role_types,
        status: "inactive",
        instagram_handle: formData.instagram_handle,
        instagram_followers: 0,
        engagement_rate: 0,
        profile_photo_url: profilePhotoUrl || heroMediaUrl,
        photo_urls: galleryPhotoUrls,
        video_url:
          formData.hero_media?.type === "video" ? heroMediaUrl : undefined,
        voice_sample_url: voiceSampleUrl,
        bio: formData.bio,
        special_skills: formData.special_skills,

        // Physicals
        height_feet: parseInt(formData.height_feet) || 0,
        height_inches: parseInt(formData.height_inches) || 0,
        bust_inches: formData.bust_inches
          ? parseInt(formData.bust_inches)
          : undefined,
        waist_inches: formData.waist_inches
          ? parseInt(formData.waist_inches)
          : undefined,
        hips_inches: formData.hips_inches
          ? parseInt(formData.hips_inches)
          : undefined,
        gender_identity: formData.gender,
        race_ethnicity: formData.ethnicity,
        hair_color: formData.hair_color,
        eye_color: formData.eye_color,
        skin_tone: formData.skin_tone,
        tattoos:
          formData.tattoos === "yes"
            ? true
            : formData.tattoos === "no"
              ? false
              : undefined,
        piercings:
          formData.piercings === "yes"
            ? true
            : formData.piercings === "no"
              ? false
              : undefined,

        // Location
        city: formData.city,
        state_province: formData.state,
        country: formData.country,
        organization: showOrganizationField ? formData.organization : undefined,
        sports: formData.sports,
        licensing_rate_monthly_cents: Math.round(
          Number(formData.licensing_rate_monthly_usd || 0) * 100,
        ),
        accept_negotiations: !!formData.accept_negotiations,
        rate_currency: "USD",
        ai_usage: aiUsage,
      };

      await createAgencyTalent(payload);

      if (user?.id) {
        await queryClient.invalidateQueries({
          queryKey: ["agency-roster", user.id],
        });
        await queryClient.invalidateQueries({
          queryKey: ["agency-profile", user.id],
        });
      }

      toast({
        title: t("agencyDashboard.addTalent.toast.success"),
        description: t("agencyDashboard.addTalent.toast.addedSuccessfully", {
          entityTitle,
        }),
      });
      {
        const rosterSubTab = isSportsAgency ? "All Athletes" : "All Talent";
        navigate(
          {
            pathname: "/AgencyDashboard",
            search: `?tab=roster&subTab=${encodeURIComponent(rosterSubTab)}`,
          },
          { replace: true },
        );
      }
    } catch (error: any) {
      console.error(error);
      // The base44Client attaches the raw parsed response body to err.data
      // and the HTTP status to err.status.
      const status = error?.status;
      const raw = error?.data;
      const code =
        typeof raw === "object" && raw !== null ? String(raw?.code || "") : "";

      if (
        status === 409 &&
        (code === "duplicate_email_same_agency" ||
          code === "duplicate_email_other_agency")
      ) {
        setDuplicateConflict({
          open: true,
          talentName: raw?.existing_talent_name || "",
          talentId: raw?.existing_talent_id || "",
          sameAgency: raw?.same_agency === true,
        });
      } else {
        toast({
          title: t("agencyDashboard.addTalent.toast.error"),
          description: t("agencyDashboard.addTalent.toast.failedToCreate", {
            entityLower,
          }),
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceedStep1 =
    formData.full_name &&
    formData.email &&
    formData.birthdate &&
    isAtLeast18(formData.birthdate) &&
    Number(formData.licensing_rate_monthly_usd || 0) > 0;
  const canProceedStep2 =
    formData.gender &&
    formData.ethnicity.length > 0 &&
    Array.isArray(formData.role_types) &&
    formData.role_types.length > 0;

  const progress = (step / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => {
              const rosterSubTab = isSportsAgency
                ? "All Athletes"
                : "All Talent";
              navigate({
                pathname: "/AgencyDashboard",
                search: `?tab=roster&subTab=${encodeURIComponent(rosterSubTab)}`,
              });
            }}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("agencyDashboard.addTalent.backToAll", {
              entityTitlePlural: entityTitlePlural,
            })}
          </Button>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t("agencyDashboard.addTalent.title", { entityTitle })}
          </h1>
          <p className="text-gray-600">
            {t("agencyDashboard.addTalent.subtitle", { entityLower })}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-8">
              <div
                className={`flex items-center gap-2 ${step >= 1 ? "text-indigo-600" : "text-gray-400"}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? "bg-indigo-600 text-white" : "bg-gray-200"}`}
                >
                  1
                </div>
                <span className="font-medium">
                  {t("agencyDashboard.addTalent.steps.basicInfo")}
                </span>
              </div>
              <div
                className={`flex items-center gap-2 ${step >= 2 ? "text-indigo-600" : "text-gray-400"}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? "bg-indigo-600 text-white" : "bg-gray-200"}`}
                >
                  2
                </div>
                <span className="font-medium">
                  {t("agencyDashboard.addTalent.steps.attributes")}
                </span>
              </div>
              <div
                className={`flex items-center gap-2 ${step >= 3 ? "text-indigo-600" : "text-gray-400"}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? "bg-indigo-600 text-white" : "bg-gray-200"}`}
                >
                  3
                </div>
                <span className="font-medium">
                  {t("agencyDashboard.addTalent.steps.mediaSocial")}
                </span>
              </div>
            </div>
          </div>
          <Progress value={progress} className="h-2 bg-gray-200" />
        </div>

        <Card className="p-8 bg-white border border-gray-200">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {t("agencyDashboard.addTalent.basicInfo.title")}
                </h3>
                <p className="text-gray-600">
                  {t("agencyDashboard.addTalent.basicInfo.description")}
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="full_name"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    {t("agencyDashboard.addTalent.basicInfo.fullName")}{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="full_name"
                    type="text"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    className="border-2 border-gray-300"
                    placeholder={t(
                      "agencyDashboard.addTalent.placeholders.fullLegalName",
                      {
                        defaultValue: "Full legal name",
                      },
                    )}
                  />
                </div>

                <div>
                  <Label
                    htmlFor="stage_name"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    {t("agencyDashboard.addTalent.basicInfo.stageName")}
                  </Label>
                  <Input
                    id="stage_name"
                    type="text"
                    value={formData.stage_name}
                    onChange={(e) =>
                      setFormData({ ...formData, stage_name: e.target.value })
                    }
                    className="border-2 border-gray-300"
                    placeholder={t(
                      "agencyDashboard.addTalent.placeholders.optional",
                      {
                        defaultValue: "Optional",
                      },
                    )}
                  />
                </div>

                <div>
                  <Label
                    htmlFor="email"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    {t("agencyDashboard.addTalent.basicInfo.email")}{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={`${entityLower}@example.com`}
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="border-2 border-gray-300"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="phone"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    {t("agencyDashboard.addTalent.basicInfo.phone")}
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="border-2 border-gray-300"
                    placeholder={t(
                      "agencyDashboard.addTalent.placeholders.phone",
                      {
                        defaultValue: "+1 (555) 123-4567",
                      },
                    )}
                  />
                </div>
              </div>

              <div>
                <Label
                  htmlFor="birthdate"
                  className="text-sm font-medium text-gray-700 mb-2 block"
                >
                  {t("agencyDashboard.addTalent.basicInfo.dateOfBirth")}{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <DobInput
                  value={formData.birthdate}
                  onChange={(iso) =>
                    setFormData({ ...formData, birthdate: iso })
                  }
                  variant="sharp"
                  minAge={18}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="city"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    {t("agencyDashboard.addTalent.mediaSocial.city")}
                  </Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    className="border-2 border-gray-300"
                    placeholder={t(
                      "agencyDashboard.addTalent.placeholders.losAngeles",
                      {
                        defaultValue: "Los Angeles",
                      },
                    )}
                  />
                </div>

                <div>
                  <Label
                    htmlFor="state"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    {t("agencyDashboard.addTalent.mediaSocial.state")}
                  </Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                    className="border-2 border-gray-300"
                    placeholder={t(
                      "agencyDashboard.addTalent.placeholders.ca",
                      {
                        defaultValue: "CA",
                      },
                    )}
                  />
                </div>

                <div>
                  <Label
                    htmlFor="country"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    {t("agencyDashboard.addTalent.mediaSocial.country")}
                  </Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) =>
                      setFormData({ ...formData, country: e.target.value })
                    }
                    className="border-2 border-gray-300"
                    placeholder={t(
                      "agencyDashboard.addTalent.placeholders.usa",
                      {
                        defaultValue: "USA",
                      },
                    )}
                  />
                </div>
                {showOrganizationField && (
                  <div>
                    <Label
                      htmlFor="organization"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      {t("agencyDashboard.addTalent.mediaSocial.organization")}
                    </Label>
                    <Input
                      id="organization"
                      value={formData.organization}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          organization: e.target.value,
                        })
                      }
                      className="border-2 border-gray-300"
                      placeholder={t(
                        "agencyDashboard.addTalent.placeholders.ucla",
                        {
                          defaultValue: "e.g. UCLA",
                        },
                      )}
                    />
                  </div>
                )}
                {isSportsAgency && (
                  <div className="md:col-span-2">
                    <Label
                      htmlFor="sports"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      {t("agencyDashboard.addTalent.mediaSocial.sports")}
                    </Label>
                    <Input
                      id="sports"
                      value={formData.sports}
                      onChange={(e) =>
                        setFormData({ ...formData, sports: e.target.value })
                      }
                      className="border-2 border-gray-300"
                      placeholder={t(
                        "agencyDashboard.addTalent.placeholders.footballBasketball",
                        {
                          defaultValue: "e.g. Football, Basketball",
                        },
                      )}
                    />
                  </div>
                )}
              </div>

              <div>
                <Label
                  htmlFor="bio"
                  className="text-sm font-medium text-gray-700 mb-2 block"
                >
                  {t("agencyDashboard.addTalent.mediaSocial.bio")}
                </Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                  className="border-2 border-gray-300 min-h-24"
                  placeholder={t(
                    "agencyDashboard.addTalent.placeholders.briefBio",
                    {
                      entityLower,
                      defaultValue: `Brief bio or internal notes about this ${entityLower}...`,
                    },
                  )}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="licensing_rate_monthly_usd"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    {t("agencyDashboard.addTalent.basicInfo.licensingRate")}{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="licensing_rate_monthly_usd"
                    type="number"
                    min="1"
                    step="1"
                    value={formData.licensing_rate_monthly_usd}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        licensing_rate_monthly_usd: e.target.value,
                      })
                    }
                    className="border-2 border-gray-300"
                    placeholder={t(
                      "agencyDashboard.addTalent.placeholders.licensingRate",
                      {
                        defaultValue: "e.g. 750",
                      },
                    )}
                  />
                </div>
                <div className="flex items-end">
                  <div className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <Label className="text-sm font-medium text-gray-900">
                          {t(
                            "agencyDashboard.addTalent.mediaSocial.acceptNegotiations",
                          )}
                        </Label>
                        <p className="mt-0.5 text-xs text-gray-600">
                          {t(
                            "agencyDashboard.addTalent.placeholders.allowBrands",
                            {
                              entityLower,
                              defaultValue: `Allow brands to propose custom rates for this ${entityLower}.`,
                            },
                          )}
                        </p>
                      </div>
                      <Switch
                        checked={!!formData.accept_negotiations}
                        onCheckedChange={(checked: boolean) =>
                          setFormData({
                            ...formData,
                            accept_negotiations: checked,
                          })
                        }
                        aria-label="Open to negotiations"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-gray-400"
              >
                {t("agencyDashboard.addTalent.buttons.continue")}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}

          {/* Step 2: Physical Attributes */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {t("agencyDashboard.addTalent.attributes.title")}
                </h3>
                <p className="text-gray-600">
                  {t("agencyDashboard.addTalent.attributes.description")}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-3 block">
                  {t("agencyDashboard.addTalent.attributes.gender")}{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <div className="grid md:grid-cols-3 gap-3">
                  {[
                    { value: "Female", key: "female" },
                    { value: "Male", key: "male" },
                    { value: "Non-binary", key: "nonBinary" },
                    { value: "Gender fluid", key: "genderFluid" },
                    { value: "Prefer not to say", key: "preferNotToSay" },
                  ].map((option) => (
                    <Card
                      key={option.value}
                      onClick={() =>
                        setFormData({ ...formData, gender: option.value })
                      }
                      className={`p-4 cursor-pointer transition-all ${
                        formData.gender === option.value
                          ? "border-2 border-indigo-600 bg-indigo-50"
                          : "border-2 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">
                          {t(
                            `agencyDashboard.addTalent.genders.${option.key}`,
                            {
                              defaultValue: option.value,
                            },
                          )}
                        </span>
                        {formData.gender === option.value && (
                          <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-900 mb-3 block">
                  {t("agencyDashboard.addTalent.attributes.ethnicity")}{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <div className="grid md:grid-cols-2 gap-3">
                  {ethnicities.map((ethnicity) => (
                    <Card
                      key={ethnicity}
                      onClick={() => toggleEthnicity(ethnicity)}
                      className={`p-3 cursor-pointer transition-all ${
                        formData.ethnicity.includes(ethnicity)
                          ? "border-2 border-indigo-600 bg-indigo-50"
                          : "border-2 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">
                          {t(
                            `agencyDashboard.addTalent.ethnicities.${getEthnicityTranslationKey(ethnicity)}`,
                            {
                              defaultValue: ethnicity,
                            },
                          )}
                        </span>
                        {formData.ethnicity.includes(ethnicity) && (
                          <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-900 mb-3 block">
                  {t("agencyDashboard.addTalent.attributes.roleCategories")}{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {roleCategories.map((category) => {
                    const selected = Array.isArray(formData.role_types)
                      ? formData.role_types.includes(category)
                      : false;
                    return (
                      <Card
                        key={category}
                        onClick={() => toggleRoleCategory(category)}
                        className={`p-5 min-h-[56px] cursor-pointer transition-all flex items-center ${
                          selected
                            ? "border-2 border-indigo-600 bg-indigo-50"
                            : "border-2 border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="w-full flex items-center justify-between">
                          <span className="font-semibold text-gray-900">
                            {t(
                              `agencyDashboard.addTalent.categories.${category.toLowerCase()}`,
                              {
                                defaultValue: category,
                              },
                            )}
                          </span>
                          {selected && (
                            <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label
                    htmlFor="hair_color"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    {t("agencyDashboard.addTalent.attributes.hairColor")}
                  </Label>
                  <Select
                    value={formData.hair_color}
                    onValueChange={(value) =>
                      setFormData({ ...formData, hair_color: value })
                    }
                  >
                    <SelectTrigger className="border-2 border-gray-300">
                      <SelectValue
                        placeholder={t(
                          "agencyDashboard.addTalent.fields.select",
                          {
                            defaultValue: "Select",
                          },
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {hairColors.map((color) => (
                        <SelectItem key={color} value={color}>
                          {color}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label
                    htmlFor="eye_color"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    {t("agencyDashboard.addTalent.attributes.eyeColor")}
                  </Label>
                  <Select
                    value={formData.eye_color}
                    onValueChange={(value) =>
                      setFormData({ ...formData, eye_color: value })
                    }
                  >
                    <SelectTrigger className="border-2 border-gray-300">
                      <SelectValue
                        placeholder={t(
                          "agencyDashboard.addTalent.fields.select",
                          {
                            defaultValue: "Select",
                          },
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {eyeColors.map((color) => (
                        <SelectItem key={color} value={color}>
                          {color}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label
                    htmlFor="skin_tone"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    {t("agencyDashboard.addTalent.attributes.skinTone")}
                  </Label>
                  <Select
                    value={formData.skin_tone}
                    onValueChange={(value) =>
                      setFormData({ ...formData, skin_tone: value })
                    }
                  >
                    <SelectTrigger className="border-2 border-gray-300">
                      <SelectValue
                        placeholder={t(
                          "agencyDashboard.addTalent.fields.select",
                          {
                            defaultValue: "Select",
                          },
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {skinTones.map((tone) => (
                        <SelectItem key={tone} value={tone}>
                          {tone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="tattoos"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    {t("agencyDashboard.addTalent.attributes.tattoos")}
                  </Label>
                  <Select
                    value={formData.tattoos}
                    onValueChange={(value) =>
                      setFormData({ ...formData, tattoos: value })
                    }
                  >
                    <SelectTrigger className="border-2 border-gray-300">
                      <SelectValue
                        placeholder={t(
                          "agencyDashboard.addTalent.fields.select",
                          {
                            defaultValue: "Select",
                          },
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unknown">
                        {t(
                          "agencyDashboard.addTalent.attributes.preferNotToSay",
                        )}
                      </SelectItem>
                      <SelectItem value="yes">
                        {t("agencyDashboard.addTalent.attributes.yes")}
                      </SelectItem>
                      <SelectItem value="no">
                        {t("agencyDashboard.addTalent.attributes.no")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label
                    htmlFor="piercings"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    {t("agencyDashboard.addTalent.attributes.piercings")}
                  </Label>
                  <Select
                    value={formData.piercings}
                    onValueChange={(value) =>
                      setFormData({ ...formData, piercings: value })
                    }
                  >
                    <SelectTrigger className="border-2 border-gray-300">
                      <SelectValue
                        placeholder={t(
                          "agencyDashboard.addTalent.fields.select",
                          {
                            defaultValue: "Select",
                          },
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unknown">
                        {t(
                          "agencyDashboard.addTalent.attributes.preferNotToSay",
                        )}
                      </SelectItem>
                      <SelectItem value="yes">
                        {t("agencyDashboard.addTalent.attributes.yes")}
                      </SelectItem>
                      <SelectItem value="no">
                        {t("agencyDashboard.addTalent.attributes.no")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t("agencyDashboard.addTalent.attributes.height")}
                </Label>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      type="number"
                      value={formData.height_feet}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          height_feet: e.target.value,
                        })
                      }
                      className="border-2 border-gray-300"
                      placeholder={t(
                        "agencyDashboard.addTalent.placeholders.heightFeet",
                        {
                          defaultValue: "5",
                        },
                      )}
                      min="0"
                      max="8"
                    />
                    <span className="text-xs text-gray-500 mt-1 block">
                      {t("agencyDashboard.addTalent.attributes.feet")}
                    </span>
                  </div>
                  <div className="flex-1">
                    <Input
                      type="number"
                      value={formData.height_inches}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          height_inches: e.target.value,
                        })
                      }
                      className="border-2 border-gray-300"
                      placeholder={t(
                        "agencyDashboard.addTalent.placeholders.heightInches",
                        {
                          defaultValue: "7",
                        },
                      )}
                      min="0"
                      max="11"
                    />
                    <span className="text-xs text-gray-500 mt-1 block">
                      {t("agencyDashboard.addTalent.attributes.inches")}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t("agencyDashboard.addTalent.fields.measurements", {
                    defaultValue: "Measurements (in)",
                  })}
                </Label>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Input
                      type="number"
                      value={formData.bust_inches}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bust_inches: e.target.value,
                        })
                      }
                      className="border-2 border-gray-300"
                      placeholder={t("agencyDashboard.addTalent.fields.bust", {
                        defaultValue: "Bust",
                      })}
                      min="0"
                    />
                    <span className="text-xs text-gray-500 mt-1 block">
                      {t("agencyDashboard.addTalent.attributes.bust")}
                    </span>
                  </div>
                  <div>
                    <Input
                      type="number"
                      value={formData.waist_inches}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          waist_inches: e.target.value,
                        })
                      }
                      className="border-2 border-gray-300"
                      placeholder={t("agencyDashboard.addTalent.fields.waist", {
                        defaultValue: "Waist",
                      })}
                      min="0"
                    />
                    <span className="text-xs text-gray-500 mt-1 block">
                      {t("agencyDashboard.addTalent.attributes.waist")}
                    </span>
                  </div>
                  <div>
                    <Input
                      type="number"
                      value={formData.hips_inches}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          hips_inches: e.target.value,
                        })
                      }
                      className="border-2 border-gray-300"
                      placeholder={t("agencyDashboard.addTalent.fields.hips", {
                        defaultValue: "Hips",
                      })}
                      min="0"
                    />
                    <span className="text-xs text-gray-500 mt-1 block">
                      {t("agencyDashboard.addTalent.attributes.hips")}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <Label
                  htmlFor="special_skills"
                  className="text-sm font-medium text-gray-700 mb-2 block"
                >
                  {t("agencyDashboard.addTalent.mediaSocial.specialSkills")}
                </Label>
                <Input
                  id="special_skills"
                  value={formData.special_skills}
                  onChange={(e) =>
                    setFormData({ ...formData, special_skills: e.target.value })
                  }
                  className="border-2 border-gray-300"
                  placeholder={t(
                    "agencyDashboard.addTalent.placeholders.dancerAthlete",
                    {
                      defaultValue: "e.g., Dancer, Athlete, Bilingual Spanish",
                    },
                  )}
                />
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="flex-1 h-12 border-2 border-gray-300"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  {t("agencyDashboard.addTalent.buttons.back")}
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!canProceedStep2}
                  className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-gray-400"
                >
                  {t("agencyDashboard.addTalent.buttons.continue")}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Media & Social */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {t("agencyDashboard.addTalent.mediaSocial.title")}
                </h3>
                <p className="text-gray-600">
                  {t("agencyDashboard.addTalent.mediaSocial.description")}
                </p>
              </div>

              {/* Hero Media */}
              <div>
                <Label className="text-sm font-medium text-gray-900 mb-3 block">
                  {t("agencyDashboard.addTalent.mediaSocial.heroMedia")}
                </Label>
                {!formData.hero_media ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleHeroUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full"
                      disabled={uploading}
                    >
                      {uploading ? (
                        <Loader2 className="w-10 h-10 text-gray-400 mx-auto mb-3 animate-spin" />
                      ) : (
                        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                      )}
                      <p className="text-gray-700 font-medium mb-1">
                        {uploading
                          ? t("agencyDashboard.addTalent.uploading", {
                              defaultValue: "Uploading...",
                            })
                          : t(
                              "agencyDashboard.addTalent.mediaSocial.uploadHero",
                            )}
                      </p>
                      <p className="text-sm text-gray-500">
                        {t(
                          "agencyDashboard.addTalent.placeholders.imageOrVideoFile",
                          {
                            defaultValue: "Image or video file",
                          },
                        )}
                      </p>
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        {formData.hero_media.type === "video" ? (
                          <Video className="w-5 h-5 text-green-600" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {formData.hero_media.name}
                        </p>
                        {formData.hero_media.type === "video" ? (
                          <video
                            controls
                            src={formData.hero_media.url}
                            className="w-full mt-2 max-h-48"
                          />
                        ) : (
                          <img
                            src={formData.hero_media.url}
                            alt="Hero media"
                            className="w-full mt-2 max-h-48 object-cover rounded"
                          />
                        )}
                      </div>
                      <Button
                        onClick={() =>
                          setFormData({ ...formData, hero_media: null })
                        }
                        variant="outline"
                        size="sm"
                        className="bg-white"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Photos */}
              <div>
                <Label className="text-sm font-medium text-gray-900 mb-3 block">
                  {t("agencyDashboard.addTalent.mediaSocial.profilePhotos")}
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {formData.photos.map((photo, index) => (
                    <div
                      key={index}
                      className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200"
                    >
                      <img
                        src={photo.url}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {formData.photos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setProfilePhotoIndex(index)}
                          className={`absolute bottom-1 left-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            profilePhotoIndex === index
                              ? "bg-indigo-600 text-white"
                              : "bg-white/90 text-gray-700 border border-gray-200"
                          }`}
                        >
                          {profilePhotoIndex === index
                            ? t("agencyDashboard.addTalent.buttons.profile", {
                                defaultValue: "Profile",
                              })
                            : t(
                                "agencyDashboard.addTalent.buttons.setAsProfile",
                                {
                                  defaultValue: "Set as profile",
                                },
                              )}
                        </button>
                      )}
                      <Button
                        onClick={() => handleDeletePhoto(index)}
                        variant="outline"
                        size="sm"
                        className="absolute top-1 right-1 bg-white opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                {formData.photos.length < 10 && (
                  <Button
                    variant="outline"
                    onClick={() => photoInputRef.current?.click()}
                    className="w-full mt-4"
                    disabled={uploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {t("agencyDashboard.addTalent.mediaSocial.uploadPhotos")}
                  </Button>
                )}
              </div>

              {/* Instagram */}
              <div>
                <Label
                  htmlFor="instagram_handle"
                  className="text-sm font-medium text-gray-900 mb-3 block"
                >
                  {t("agencyDashboard.addTalent.mediaSocial.instagram")}
                </Label>
                <div className="flex items-center gap-2">
                  <Instagram className="w-5 h-5 text-gray-400" />
                  <Input
                    id="instagram_handle"
                    value={formData.instagram_handle}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        instagram_handle: e.target.value,
                      })
                    }
                    className="border-2 border-gray-300"
                    placeholder={t(
                      "agencyDashboard.addTalent.placeholders.username",
                      {
                        defaultValue: "@username",
                      },
                    )}
                  />
                </div>
              </div>

              {/* Voice Sample */}
              <div>
                <Label className="text-sm font-medium text-gray-900 mb-3 block">
                  {t("agencyDashboard.addTalent.mediaSocial.voiceSample")}
                </Label>
                {!formData.voice_sample ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors">
                    <input
                      ref={voiceInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleVoiceUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => voiceInputRef.current?.click()}
                      className="w-full"
                      disabled={uploadingVoice}
                    >
                      {uploadingVoice ? (
                        <Loader2 className="w-10 h-10 text-gray-400 mx-auto mb-3 animate-spin" />
                      ) : (
                        <Mic className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                      )}
                      <p className="text-gray-700 font-medium mb-1">
                        {uploadingVoice
                          ? t("agencyDashboard.addTalent.uploading", {
                              defaultValue: "Uploading...",
                            })
                          : t(
                              "agencyDashboard.addTalent.mediaSocial.uploadVoice",
                            )}
                      </p>
                      <p className="text-sm text-gray-500">
                        {t(
                          "agencyDashboard.addTalent.placeholders.mp3WavAudio",
                          {
                            defaultValue: "MP3, WAV, or other audio format",
                          },
                        )}
                      </p>
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Mic className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {formData.voice_sample.name}
                        </p>
                        <audio
                          controls
                          src={formData.voice_sample.url}
                          className="w-full mt-2"
                        />
                      </div>
                      <Button
                        onClick={() =>
                          setFormData({ ...formData, voice_sample: null })
                        }
                        variant="outline"
                        size="sm"
                        className="bg-white"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => setStep(2)}
                  variant="outline"
                  className="flex-1 h-12 border-2 border-gray-300"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  {t("agencyDashboard.addTalent.buttons.back")}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !canProceedStep2}
                  className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-gray-400"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : null}
                  {t("agencyDashboard.addTalent.buttons.submit")}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
