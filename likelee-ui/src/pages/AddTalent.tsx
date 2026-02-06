import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
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
} from "lucide-react";

import { createAgencyTalent } from "@/api/functions";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";

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
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const totalSteps = 3;

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

    // Media
    hero_media: null,
    photos: [],
    voice_sample: null,

    // Social
    instagram_connected: false,
    instagram_handle: "",

    // Notes
    bio: "",
    special_skills: "",
  });

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

  const roleCategories = ["Model", "Actor", "Creator", "Voice", "Athlete"];

  const fileInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const voiceInputRef = useRef(null);

  const handleHeroUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploading(true);
      setTimeout(() => {
        setFormData({
          ...formData,
          hero_media: {
            url: URL.createObjectURL(file),
            type: file.type.includes("video") ? "video" : "image",
            name: file.name,
          },
        });
        setUploading(false);
      }, 1000);
    }
  };

  const handlePhotosUpload = (e) => {
    const input = e?.target;
    const files = Array.from((input?.files || []) as any);
    if (input) {
      input.value = "";
    }
    if (files.length > 0) {
      setUploading(true);
      setTimeout(() => {
        const newPhotos = files.map((file) => ({
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

  const handleVoiceUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadingVoice(true);
      setTimeout(() => {
        setFormData({
          ...formData,
          voice_sample: {
            url: URL.createObjectURL(file),
            name: file.name,
          },
        });
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

  const handleConnectInstagram = () => {
    // Demo mode - simulate connection
    setFormData({
      ...formData,
      instagram_connected: true,
      instagram_handle: "@talent_handle",
    });
    toast({ title: "Info", description: "Instagram connected! (Demo mode)" });
  };

  const toggleEthnicity = (ethnicity) => {
    const current = formData.ethnicity;
    if (current.includes(ethnicity)) {
      setFormData({
        ...formData,
        ethnicity: current.filter((e) => e !== ethnicity),
      });
    } else {
      setFormData({
        ...formData,
        ethnicity: [...current, ethnicity],
      });
    }
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
      console.log("Submitting talent data:", formData);

      if (!isAtLeast18(formData.birthdate)) {
        toast({
          title: "Invalid date of birth",
          description: "Talent must be at least 18 years old.",
          variant: "destructive",
        });
        return;
      }

      let profilePhotoUrl = "";
      let galleryPhotoUrls: string[] = [];
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
            title: "Upload failed",
            description:
              "Could not upload photos. Talent will be created without photos.",
            variant: "destructive",
          });
        }
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
        profile_photo_url: profilePhotoUrl,
        photo_urls: galleryPhotoUrls,
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
        title: "Success",
        description: "Talent added successfully!",
      });
      {
        const base = createPageUrl("AgencyDashboard");
        const hasQuery = base.includes("?");
        navigate(
          `${base}${hasQuery ? "&" : "?"}tab=roster&subTab=${encodeURIComponent("All Talent")}`,
          { replace: true },
        );
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to create talent. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceedStep1 =
    formData.full_name &&
    formData.email &&
    formData.birthdate &&
    isAtLeast18(formData.birthdate);
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
              const base = createPageUrl("AgencyDashboard");
              const hasQuery = base.includes("?");
              navigate(`${base}${hasQuery ? "&" : "?"}tab=roster`);
            }}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to All Talent
          </Button>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Add New Talent
          </h1>
          <p className="text-gray-600">
            Add a new talent to your agency roster
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
                <span className="font-medium">Basic Info</span>
              </div>
              <div
                className={`flex items-center gap-2 ${step >= 2 ? "text-indigo-600" : "text-gray-400"}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? "bg-indigo-600 text-white" : "bg-gray-200"}`}
                >
                  2
                </div>
                <span className="font-medium">Attributes</span>
              </div>
              <div
                className={`flex items-center gap-2 ${step >= 3 ? "text-indigo-600" : "text-gray-400"}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? "bg-indigo-600 text-white" : "bg-gray-200"}`}
                >
                  3
                </div>
                <span className="font-medium">Media & Social</span>
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
                  Basic Information
                </h3>
                <p className="text-gray-600">
                  Let's start with the essential details
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="full_name"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    Full Legal Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="full_name"
                    type="text"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    className="border-2 border-gray-300"
                    placeholder="Full legal name"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="stage_name"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    Stage Name
                  </Label>
                  <Input
                    id="stage_name"
                    type="text"
                    value={formData.stage_name}
                    onChange={(e) =>
                      setFormData({ ...formData, stage_name: e.target.value })
                    }
                    className="border-2 border-gray-300"
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="email"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="talent@example.com"
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
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="border-2 border-gray-300"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <Label
                  htmlFor="birthdate"
                  className="text-sm font-medium text-gray-700 mb-2 block"
                >
                  Date of Birth <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="birthdate"
                  type="date"
                  value={formData.birthdate}
                  onChange={(e) =>
                    setFormData({ ...formData, birthdate: e.target.value })
                  }
                  className="border-2 border-gray-300"
                />
                {formData.birthdate && !isAtLeast18(formData.birthdate) && (
                  <p className="text-sm text-red-600 mt-2 font-medium">
                    Talent must be at least 18 years old.
                  </p>
                )}
              </div>

              <div className="grid md:grid-cols-3 gap-4">
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
                    className="border-2 border-gray-300"
                    placeholder="Los Angeles"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="state"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    State / Province
                  </Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                    className="border-2 border-gray-300"
                    placeholder="CA"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="country"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    Country
                  </Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) =>
                      setFormData({ ...formData, country: e.target.value })
                    }
                    className="border-2 border-gray-300"
                    placeholder="USA"
                  />
                </div>
              </div>

              <div>
                <Label
                  htmlFor="bio"
                  className="text-sm font-medium text-gray-700 mb-2 block"
                >
                  Bio / Notes
                </Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                  className="border-2 border-gray-300 min-h-24"
                  placeholder="Brief bio or internal notes about this talent..."
                />
              </div>

              <Button
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-gray-400"
              >
                Continue to Attributes
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}

          {/* Step 2: Physical Attributes */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Physical Attributes
                </h3>
                <p className="text-gray-600">
                  Help brands find the right match
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-3 block">
                  Gender Identity <span className="text-red-500">*</span>
                </Label>
                <div className="grid md:grid-cols-3 gap-3">
                  {[
                    "Female",
                    "Male",
                    "Non-binary",
                    "Gender fluid",
                    "Prefer not to say",
                  ].map((option) => (
                    <Card
                      key={option}
                      onClick={() =>
                        setFormData({ ...formData, gender: option })
                      }
                      className={`p-4 cursor-pointer transition-all ${
                        formData.gender === option
                          ? "border-2 border-indigo-600 bg-indigo-50"
                          : "border-2 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">
                          {option}
                        </span>
                        {formData.gender === option && (
                          <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-900 mb-3 block">
                  Race / Ethnicity <span className="text-red-500">*</span>{" "}
                  (Select all that apply)
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
                          {ethnicity}
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
                  Role Type <span className="text-red-500">*</span> (Select all
                  that apply)
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
                            {category}
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
                    Hair Color
                  </Label>
                  <Select
                    value={formData.hair_color}
                    onValueChange={(value) =>
                      setFormData({ ...formData, hair_color: value })
                    }
                  >
                    <SelectTrigger className="border-2 border-gray-300">
                      <SelectValue placeholder="Select" />
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
                    Eye Color
                  </Label>
                  <Select
                    value={formData.eye_color}
                    onValueChange={(value) =>
                      setFormData({ ...formData, eye_color: value })
                    }
                  >
                    <SelectTrigger className="border-2 border-gray-300">
                      <SelectValue placeholder="Select" />
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
                    Skin Tone
                  </Label>
                  <Select
                    value={formData.skin_tone}
                    onValueChange={(value) =>
                      setFormData({ ...formData, skin_tone: value })
                    }
                  >
                    <SelectTrigger className="border-2 border-gray-300">
                      <SelectValue placeholder="Select" />
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
                    Tattoos
                  </Label>
                  <Select
                    value={formData.tattoos}
                    onValueChange={(value) =>
                      setFormData({ ...formData, tattoos: value })
                    }
                  >
                    <SelectTrigger className="border-2 border-gray-300">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unknown">Unknown</SelectItem>
                      <SelectItem value="yes">Has tattoos</SelectItem>
                      <SelectItem value="no">No tattoos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label
                    htmlFor="piercings"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    Piercings
                  </Label>
                  <Select
                    value={formData.piercings}
                    onValueChange={(value) =>
                      setFormData({ ...formData, piercings: value })
                    }
                  >
                    <SelectTrigger className="border-2 border-gray-300">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unknown">Unknown</SelectItem>
                      <SelectItem value="yes">Has piercings</SelectItem>
                      <SelectItem value="no">No piercings</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Height
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
                      placeholder="5"
                      min="0"
                      max="8"
                    />
                    <span className="text-xs text-gray-500 mt-1 block">
                      Feet
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
                      placeholder="8"
                      min="0"
                      max="11"
                    />
                    <span className="text-xs text-gray-500 mt-1 block">
                      Inches
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Measurements (in)
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
                      placeholder="Bust"
                      min="0"
                    />
                    <span className="text-xs text-gray-500 mt-1 block">
                      Bust
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
                      placeholder="Waist"
                      min="0"
                    />
                    <span className="text-xs text-gray-500 mt-1 block">
                      Waist
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
                      placeholder="Hips"
                      min="0"
                    />
                    <span className="text-xs text-gray-500 mt-1 block">
                      Hips
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <Label
                  htmlFor="special_skills"
                  className="text-sm font-medium text-gray-700 mb-2 block"
                >
                  Special Skills / Tags (separated by comma)
                </Label>
                <Input
                  id="special_skills"
                  value={formData.special_skills}
                  onChange={(e) =>
                    setFormData({ ...formData, special_skills: e.target.value })
                  }
                  className="border-2 border-gray-300"
                  placeholder="e.g., Dancer, Athlete, Bilingual Spanish"
                />
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="flex-1 h-12 border-2 border-gray-300"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!canProceedStep2}
                  className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-gray-400"
                >
                  Continue to Media
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
                  Media & Social
                </h3>
                <p className="text-gray-600">
                  Upload cameo and connect social accounts
                </p>
              </div>

              {/* Hero Media / Cameo */}
              <div>
                <Label className="text-sm font-medium text-gray-900 mb-3 block">
                  Hero Cameo (Image or Video)
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
                        <Loader2 className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
                      ) : (
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      )}
                      <p className="text-gray-700 font-medium mb-1">
                        {uploading ? "Uploading..." : "Click to upload"}
                      </p>
                      <p className="text-sm text-gray-500">
                        Video (MP4, MOV) or Image (JPG, PNG)
                      </p>
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    {formData.hero_media.type === "video" ? (
                      <video
                        src={formData.hero_media.url}
                        controls
                        className="w-full h-64 object-cover border-2 border-gray-200 rounded-lg"
                      />
                    ) : (
                      <img
                        src={formData.hero_media.url}
                        alt="Hero"
                        className="w-full h-64 object-cover border-2 border-gray-200 rounded-lg"
                      />
                    )}
                    <Button
                      onClick={() =>
                        setFormData({ ...formData, hero_media: null })
                      }
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2 bg-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Photo Gallery */}
              <div>
                <Label className="text-sm font-medium text-gray-900 mb-3 block">
                  Photo Gallery ({formData.photos.length}/10)
                </Label>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotosUpload}
                  className="hidden"
                />
                {formData.photos.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="w-full"
                      disabled={uploading}
                    >
                      {uploading ? (
                        <Loader2 className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
                      ) : (
                        <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      )}
                      <p className="text-gray-700 font-medium mb-1">
                        {uploading ? "Uploading..." : "Click to upload photos"}
                      </p>
                      <p className="text-sm text-gray-500">
                        JPG or PNG, multiple files accepted
                      </p>
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-4">
                      {formData.photos.map((photo, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={photo.url}
                            alt={photo.name}
                            className="w-full h-24 object-cover border-2 border-gray-200 rounded-lg"
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
                                ? "Profile"
                                : "Set as profile"}
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
                        className="w-full"
                        disabled={uploading}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Add More Photos
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Voice Sample */}
              <div>
                <Label className="text-sm font-medium text-gray-900 mb-3 block">
                  Voice Sample (Optional)
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
                          ? "Uploading..."
                          : "Click to upload voice sample"}
                      </p>
                      <p className="text-sm text-gray-500">
                        MP3, WAV, or other audio format
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
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Instagram Connection */}
              <div>
                <Label className="text-sm font-medium text-gray-900 mb-3 block">
                  Instagram Account
                </Label>
                {!formData.instagram_connected ? (
                  <Button
                    onClick={handleConnectInstagram}
                    className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white"
                  >
                    <Instagram className="w-5 h-5 mr-2" />
                    Connect Instagram
                  </Button>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Instagram className="w-6 h-6 text-purple-600" />
                      <div>
                        <p className="font-bold text-gray-900">
                          {formData.instagram_handle}
                        </p>
                        <p className="text-sm text-gray-600">Connected</p>
                      </div>
                    </div>
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                )}
              </div>

              <Alert className="bg-blue-50 border-2 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900 text-sm">
                  You can always add more media and update details later from
                  the roster management screen.
                </AlertDescription>
              </Alert>

              <div className="flex gap-4">
                <Button
                  onClick={() => setStep(2)}
                  variant="outline"
                  className="flex-1 h-12 border-2 border-gray-300"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={`flex-1 h-12 bg-green-600 hover:bg-green-700 text-white ${isSubmitting ? "opacity-80 blur-[0.3px] cursor-not-allowed" : ""}`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Adding talent...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Add Talent to Roster
                    </>
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
