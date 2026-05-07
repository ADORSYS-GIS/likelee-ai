import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { getBrandProfile } from "@/api/functions";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Briefcase,
  FileText,
  Users,
  DollarSign,
  Settings,
  Eye,
  Upload,
  X,
  AlertCircle,
  Calendar,
  Building2,
  Mail,
  Globe,
  Shield,
  Sparkles,
  Plus,
} from "lucide-react";

const categories = [
  "Marketing Campaign",
  "Film Production",
  "Advertising Creative",
  "Brand Content",
  "UGC Campaign",
  "AI Video Production",
  "Product Launch",
  "Social Media Content",
  "Other",
];

const workTypes = [
  "UGC Campaign",
  "Ad Creative",
  "Likeness Licensing",
  "Full Project Management",
  "Video Editing",
  "Voice Synthesis",
  "AI Generation",
  "Brand Partnership",
];

const talentTypes = [
  "AI Talent (Virtual)",
  "Creator (Licensing Call)",
  "Model (Licensing Call)",
  "Production Studio",
  "Marketing Agency",
];

const skills = [
  "Video Editing",
  "Sora Generation",
  "Runway ML",
  "Voice Synthesis",
  "ElevenLabs",
  "Lip Sync",
  "Face Swap",
  "Content Strategy",
  "Campaign Management",
];

export default function PostJob() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation("brand");
  const [currentStep, setCurrentStep] = useState(1);
  const [showCustomWorkType, setShowCustomWorkType] = useState(false);
  const [customWorkType, setCustomWorkType] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [loadingAgencies, setLoadingAgencies] = useState(false);
  const [loadingCreators, setLoadingCreators] = useState(false);
  const [agencySearch, setAgencySearch] = useState("");
  const [creatorSearch, setCreatorSearch] = useState("");
  const [connectedAgencies, setConnectedAgencies] = useState<any[]>([]);
  const [connectedCreators, setConnectedCreators] = useState<any[]>([]);
  const initialFormState = {
    // Basic Info
    job_title: "",
    company_name: "",
    contact_email: "",
    category: "",
    call_type: "",
    work_types: [],
    custom_work_types: [],
    status: "open",

    // Project Overview
    location: "remote",
    job_type: "",
    description: "",
    goals: [],
    deliverables: "",
    start_date: "",
    end_date: "",

    // Talent Requirements
    talent_types: ["AI Talent (Virtual)"], // Default selection
    region: "",
    language: "",
    required_skills: [],
    needs_licensing: false,

    // Licensing (if needs_licensing = true)
    usage_type: "",
    license_duration: "",
    territories: "",
    exclusivity: false,
    royalty_option: false,

    // Budget
    budget: "",
    payment_type: "",
    currency: "USD",

    // Collaboration
    work_with_agency: false,
    invite_creator: false,
    invited_agency_ids: [],
    invited_creator_ids: [],
    brand_assets: [],
    confidential: false,
  };

  const [formData, setFormData] = useState(() => ({ ...initialFormState }));

  const totalSteps = 7;
  const progress = (currentStep / totalSteps) * 100;

  useEffect(() => {
    let mounted = true;
    const loadBrandProfile = async () => {
      try {
        const profile = await getBrandProfile();
        if (!mounted || !profile) return;
        setFormData((prev) => ({
          ...prev,
          company_name:
            prev.company_name || profile?.company_name || profile?.name || "",
          contact_email:
            prev.contact_email || profile?.email || prev.contact_email,
        }));
      } catch {
        // Ignore profile load failures; form remains editable.
      }
    };
    loadBrandProfile();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!formData.work_with_agency) return;
    let mounted = true;
    const loadAgencies = async () => {
      try {
        setLoadingAgencies(true);
        const res = await base44.get<{ agencies?: any[] }>(
          "/api/brand/connected-agencies",
        );
        if (!mounted) return;
        setConnectedAgencies(Array.isArray(res?.agencies) ? res.agencies : []);
      } catch {
        if (!mounted) return;
        setConnectedAgencies([]);
      } finally {
        if (!mounted) return;
        setLoadingAgencies(false);
      }
    };
    loadAgencies();
    return () => {
      mounted = false;
    };
  }, [formData.work_with_agency]);

  useEffect(() => {
    if (!formData.invite_creator) return;
    let mounted = true;
    const loadCreators = async () => {
      try {
        setLoadingCreators(true);
        const res = await base44.get<any>("/api/marketplace/search", {
          params: {
            entity_type: "creator",
            profile_type: "connected",
            limit: 200,
          },
        });
        if (!mounted) return;
        const rows = Array.isArray(res)
          ? res
          : Array.isArray(res?.items)
            ? res.items
            : [];
        setConnectedCreators(rows);
      } catch {
        if (!mounted) return;
        setConnectedCreators([]);
      } finally {
        if (!mounted) return;
        setLoadingCreators(false);
      }
    };
    loadCreators();
    return () => {
      mounted = false;
    };
  }, [formData.invite_creator]);

  useEffect(() => {
    let mounted = true;
    const loadDraft = async () => {
      try {
        const editMode =
          typeof window !== "undefined" &&
          window.localStorage.getItem("jobEditMode") === "1";
        if (!editMode) {
          if (typeof window !== "undefined") {
            window.localStorage.removeItem("jobDraftId");
          }
          setEditingJobId(null);
          setCurrentStep(1);
          setFormData((prev) => ({
            ...initialFormState,
            company_name: prev.company_name,
            contact_email: prev.contact_email,
          }));
          return;
        }
        if (formData.job_title.trim()) return;
        const draftId =
          typeof window !== "undefined"
            ? window.localStorage.getItem("jobDraftId")
            : null;
        const res = await base44.get<{ jobs?: any[] }>("/api/jobs/my");
        if (!mounted) return;
        const jobs = Array.isArray(res?.jobs) ? res.jobs : [];
        const draft = draftId
          ? jobs.find((job) => String(job?.id) === draftId)
          : null;
        if (!draft) {
          if (typeof window !== "undefined") {
            window.localStorage.removeItem("jobDraftId");
            window.localStorage.removeItem("jobEditMode");
          }
          return;
        }
        setEditingJobId(String(draft?.id || ""));
        setFormData((prev) => ({
          ...prev,
          job_title: draft?.job_title || prev.job_title,
          company_name: draft?.company_name || prev.company_name,
          contact_email: draft?.contact_email || prev.contact_email,
          category: draft?.category || prev.category,
          call_type: draft?.call_type || prev.call_type,
          work_types: Array.isArray(draft?.work_types)
            ? draft.work_types
            : prev.work_types,
          status: draft?.status || prev.status,
          location: draft?.location || prev.location,
          job_type: draft?.job_type || prev.job_type,
          description: draft?.about_role || prev.description,
          goals: Array.isArray(draft?.goals) ? draft.goals : prev.goals,
          deliverables: draft?.deliverables || prev.deliverables,
          start_date: draft?.start_date || prev.start_date,
          end_date: draft?.end_date || prev.end_date,
          talent_types: Array.isArray(draft?.talent_types)
            ? draft.talent_types
            : prev.talent_types,
          region: draft?.region || prev.region,
          language: draft?.language || prev.language,
          required_skills: Array.isArray(draft?.required_skills)
            ? draft.required_skills
            : prev.required_skills,
          needs_licensing: Boolean(draft?.needs_licensing),
          usage_type: draft?.usage_type || prev.usage_type,
          license_duration: draft?.license_duration || prev.license_duration,
          territories: draft?.territories || prev.territories,
          exclusivity: Boolean(draft?.exclusivity),
          royalty_option: Boolean(draft?.royalty_option),
          budget: draft?.budget ? String(draft.budget) : prev.budget,
          payment_type: draft?.payment_type || prev.payment_type,
          currency: draft?.currency || prev.currency,
          work_with_agency: Boolean(draft?.work_with_agency),
          invite_creator: Boolean(draft?.invite_creator),
          invited_agency_ids: Array.isArray(draft?.invited_agency_ids)
            ? draft.invited_agency_ids
            : prev.invited_agency_ids,
          invited_creator_ids: Array.isArray(draft?.invited_creator_ids)
            ? draft.invited_creator_ids
            : prev.invited_creator_ids,
          brand_assets: Array.isArray(draft?.brand_assets)
            ? draft.brand_assets
            : prev.brand_assets,
          confidential: Boolean(draft?.confidential),
        }));
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("jobEditMode");
        }
      } catch {
        // ignore draft load errors
      }
    };
    loadDraft();
    return () => {
      mounted = false;
    };
  }, []);

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.job_title.trim()) {
        toast({
          title: t("postJobPage.validation.requiredField"),
          description: t("postJobPage.validation.jobTitleRequired"),
        });
        return;
      }
      if (!formData.contact_email.trim()) {
        toast({
          title: t("postJobPage.validation.requiredField"),
          description: t("postJobPage.validation.contactEmailRequired"),
        });
        return;
      }
      if (!formData.category) {
        toast({
          title: t("postJobPage.validation.requiredField"),
          description: t("postJobPage.validation.categoryRequired"),
        });
        return;
      }
      if (!formData.call_type) {
        toast({
          title: t("postJobPage.validation.requiredField"),
          description: t("postJobPage.validation.callTypeRequired"),
        });
        return;
      }
    }

    if (currentStep === 2) {
      if (!formData.job_type) {
        toast({
          title: t("postJobPage.validation.requiredField"),
          description: t("postJobPage.validation.jobTypeRequired"),
        });
        return;
      }
      if (!formData.description.trim()) {
        toast({
          title: t("postJobPage.validation.requiredField"),
          description: t("postJobPage.validation.aboutRoleRequired"),
        });
        return;
      }
    }

    if (currentStep === 3) {
      if (!formData.talent_types || formData.talent_types.length === 0) {
        toast({
          title: "Required Field",
          description: "Please select at least one Talent Type.",
        });
        return;
      }
    }

    if (currentStep === 4 && formData.needs_licensing) {
      if (!formData.usage_type) {
        toast({
          title: "Required Field",
          description: "Usage Type is required for licensing.",
        });
        return;
      }
      if (!formData.license_duration) {
        toast({
          title: "Required Field",
          description: "License Duration is required.",
        });
        return;
      }
      if (!formData.territories) {
        toast({
          title: "Required Field",
          description: "Territories are required.",
        });
        return;
      }
    }

    // Step 4 (Budget) if NO licensing, or Step 5 if HAS licensing
    const budgetStep = formData.needs_licensing ? 5 : 4;
    if (currentStep === budgetStep) {
      if (!formData.budget) {
        toast({
          title: t("postJobPage.validation.requiredField"),
          description: t("postJobPage.validation.budgetRequired"),
        });
        return;
      }
      if (!formData.payment_type) {
        toast({
          title: t("postJobPage.validation.requiredField"),
          description: t("postJobPage.validation.paymentTypeRequired"),
        });
        return;
      }
    }

    if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!formData.job_title.trim()) {
      toast({
        title: t("postJobPage.validation.missingTitle"),
        description: t("postJobPage.validation.jobTitleRequired"),
      });
      return;
    }
    if (!formData.description.trim()) {
      toast({
        title: "Missing description",
        description: t("postJobPage.validation.aboutRoleRequired"),
      });
      return;
    }
    if (!formData.call_type) {
      toast({
        title: "Missing call type",
        description: "Please select the call type for this job.",
      });
      return;
    }
    try {
      setSubmitting(true);
      if (editingJobId) {
        await base44.put(`/api/jobs/${editingJobId}`, buildJobPayload());
        toast({ title: "Success", description: "Job updated successfully!" });
      } else {
        await base44.post("/api/jobs", buildJobPayload());
        toast({
          title: t("postJobPage.validation.success"),
          description: t("postJobPage.validation.jobPostedSuccessfully"),
        });
      }
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("jobDraftId");
        window.localStorage.removeItem("jobEditMode");
      }
      navigate(createPageUrl("BrandDashboard"));
    } catch (e: any) {
      toast({
        title: "Failed to post job",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const buildJobPayload = (statusOverride?: string) => {
    const normalizedJobType = formData.job_type
      ? formData.job_type.toLowerCase().replace(/\s+/g, "_")
      : undefined;
    const normalizedLocation = formData.location
      ? formData.location.toLowerCase().replace(/\s+/g, "_")
      : undefined;
    const sanitizedAssets = Array.isArray(formData.brand_assets)
      ? formData.brand_assets
          .map((asset: any) => ({
            name: asset?.name,
            url: asset?.url,
            path: asset?.path,
            mime_type: asset?.mime_type,
            size: asset?.size,
          }))
          .filter((asset) =>
            Boolean(
              String(asset?.url || asset?.path || asset?.name || "").trim(),
            ),
          )
      : [];
    return {
      company_name: formData.company_name || undefined,
      contact_email: formData.contact_email || undefined,
      job_title: formData.job_title || undefined,
      about_role: formData.description || undefined,
      call_type: formData.call_type || undefined,
      category: formData.category || undefined,
      job_type: normalizedJobType,
      location: normalizedLocation || undefined,
      budget: formData.budget ? Number(formData.budget) : undefined,
      payment_type: formData.payment_type || undefined,
      currency: formData.currency || "USD",
      deliverables: formData.deliverables || undefined,
      start_date: formData.start_date || undefined,
      end_date: formData.end_date || undefined,
      status: statusOverride || formData.status || "open",
      work_types: formData.work_types,
      talent_types: formData.talent_types,
      goals: formData.goals,
      region: formData.region || undefined,
      language: formData.language || undefined,
      required_skills: formData.required_skills,
      needs_licensing: formData.needs_licensing,
      usage_type: formData.usage_type || undefined,
      license_duration: formData.license_duration || undefined,
      territories: formData.territories || undefined,
      exclusivity: formData.exclusivity,
      royalty_option: formData.royalty_option,
      work_with_agency: formData.work_with_agency,
      invite_creator: formData.invite_creator,
      invited_agency_ids: formData.invited_agency_ids,
      invited_creator_ids: formData.invited_creator_ids,
      brand_assets: sanitizedAssets,
      confidential: formData.confidential,
    };
  };

  const handleSaveDraft = async () => {
    try {
      setSavingDraft(true);
      const payload = buildJobPayload("draft");
      const res = editingJobId
        ? await base44.put<{ job?: any }>(`/api/jobs/${editingJobId}`, payload)
        : await base44.post<{ job?: any }>("/api/jobs", payload);
      const jobId = res?.job?.id || editingJobId;
      if (jobId && typeof window !== "undefined") {
        window.localStorage.setItem("jobDraftId", String(jobId));
      }
      toast({
        title: editingJobId
          ? t("postJobPage.validation.draftUpdated")
          : t("postJobPage.validation.draftSaved"),
        description: "You can come back and continue later.",
      });
    } catch (e: any) {
      toast({
        title: "Failed to save draft",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingDraft(false);
    }
  };

  const handleBrandAssetsUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    if (!supabase) {
      toast({
        title: "Upload unavailable",
        description: "Storage is not configured for this environment.",
        variant: "destructive",
      });
      return;
    }
    try {
      const session = await supabase.auth.getSession();
      const userId = String(session.data.session?.user?.id || "brand");
      const uploaded = await Promise.all(
        files.map(async (file) => {
          const previewUrl = URL.createObjectURL(file);
          const safeName = file.name.replace(/[^\w.\-]+/g, "_");
          const path = `job-assets/${userId}/${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 8)}_${safeName}`;
          const { error: uploadError } = await supabase.storage
            .from("likelee-public")
            .upload(path, file);
          if (uploadError) throw uploadError;
          const { data } = supabase.storage
            .from("likelee-public")
            .getPublicUrl(path);
          return {
            name: file.name,
            size: file.size,
            url: String(data?.publicUrl || ""),
            path,
            preview_url: previewUrl,
            mime_type: file.type,
          };
        }),
      );
      const valid = uploaded.filter(
        (x) => String(x.url || "").trim().length > 0,
      );
      setFormData((prev) => ({
        ...prev,
        brand_assets: [...prev.brand_assets, ...valid],
      }));
    } catch (e: any) {
      toast({
        title: "Brand asset upload failed",
        description: e?.message || "We could not upload one or more files.",
        variant: "destructive",
      });
    } finally {
      event.target.value = "";
    }
  };

  const toggleSelectedAgency = (agencyId: string) => {
    setFormData((prev) => {
      const next = new Set(prev.invited_agency_ids);
      if (next.has(agencyId)) {
        next.delete(agencyId);
      } else {
        next.add(agencyId);
      }
      return { ...prev, invited_agency_ids: Array.from(next) };
    });
  };

  const toggleSelectedCreator = (creatorId: string) => {
    setFormData((prev) => {
      const next = new Set(prev.invited_creator_ids);
      if (next.has(creatorId)) {
        next.delete(creatorId);
      } else {
        next.add(creatorId);
      }
      return { ...prev, invited_creator_ids: Array.from(next) };
    });
  };

  const filteredAgencies = connectedAgencies.filter((agency) => {
    const name = String(
      agency?.display_name || agency?.agency_name || "",
    ).toLowerCase();
    return agencySearch.trim() === ""
      ? true
      : name.includes(agencySearch.trim().toLowerCase());
  });

  const filteredCreators = connectedCreators.filter((creator) => {
    const name = String(
      creator?.full_name || creator?.display_name || "",
    ).toLowerCase();
    return creatorSearch.trim() === ""
      ? true
      : name.includes(creatorSearch.trim().toLowerCase());
  });

  const toggleArrayItem = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((item) => item !== value)
        : [...prev[field], value],
    }));
  };

  const addCustomWorkType = () => {
    if (customWorkType.trim()) {
      setFormData((prev) => ({
        ...prev,
        custom_work_types: [...prev.custom_work_types, customWorkType.trim()],
      }));
      setCustomWorkType("");
      setShowCustomWorkType(false);
    }
  };

  const removeCustomWorkType = (type) => {
    setFormData((prev) => ({
      ...prev,
      custom_work_types: prev.custom_work_types.filter((t) => t !== type),
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate(createPageUrl("BrandDashboard"));
              }
            }}
            className="mb-4 rounded-none"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {t("postJobPage.backToDashboard")}
          </Button>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-none flex items-center justify-center">
              <Briefcase className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {t("postJobPage.title")}
              </h1>
              <p className="text-gray-600">{t("postJobPage.subtitle")}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {t("postJobPage.stepCounter", {
                  current: currentStep,
                  total: totalSteps,
                })}
              </span>
              <span className="text-sm text-gray-600">
                {t("postJobPage.percentComplete", {
                  percent: Math.round(progress),
                })}
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-none">
              <div
                className="h-full bg-blue-600 transition-all duration-300 rounded-none"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <Card className="p-8 bg-white border-2 border-gray-200 rounded-none">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <FileText className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("postJobPage.steps.basicInformation")}
                </h2>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t("postJobPage.fields.jobTitle")}
                </Label>
                <Input
                  value={formData.job_title}
                  onChange={(e) =>
                    setFormData({ ...formData, job_title: e.target.value })
                  }
                  placeholder={t("postJobPage.placeholders.jobTitle")}
                  className="border-2 border-gray-300 rounded-none"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t("postJobPage.fields.companyName")}
                </Label>
                <Input
                  value={formData.company_name}
                  onChange={(e) =>
                    setFormData({ ...formData, company_name: e.target.value })
                  }
                  className="border-2 border-gray-300 rounded-none bg-gray-50"
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t("postJobPage.autoFilledProfile")}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t("postJobPage.fields.contactEmail")}
                </Label>
                <Input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_email: e.target.value })
                  }
                  placeholder={t("postJobPage.placeholders.contactEmail")}
                  className="border-2 border-gray-300 rounded-none"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t("postJobPage.fields.category")}
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) =>
                    setFormData({ ...formData, category: v })
                  }
                >
                  <SelectTrigger className="border-2 border-gray-300 rounded-none">
                    <SelectValue
                      placeholder={t("postJobPage.placeholders.selectCategory")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem
                        key={cat}
                        value={cat.toLowerCase().replace(/ /g, "_")}
                      >
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t("postJobPage.fields.callType")}
                </Label>
                <Select
                  value={formData.call_type}
                  onValueChange={(v) =>
                    setFormData({ ...formData, call_type: v })
                  }
                >
                  <SelectTrigger className="border-2 border-gray-300 rounded-none">
                    <SelectValue
                      placeholder={t("postJobPage.placeholders.selectCallType")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="creator">
                      {t("postJobPage.callType.creator")}
                    </SelectItem>
                    <SelectItem value="agency">
                      {t("postJobPage.callType.agency")}
                    </SelectItem>
                    <SelectItem value="athlete">
                      {t("postJobPage.callType.athlete")}
                    </SelectItem>
                    <SelectItem value="ai_artist">
                      {t("postJobPage.callType.aiArtist")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-3 block">
                  {t("postJobPage.fields.workTypes")}
                </Label>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {workTypes.map((type) => (
                    <div
                      key={type}
                      className="flex items-center gap-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleArrayItem("work_types", type)}
                    >
                      <Checkbox
                        id={type}
                        checked={formData.work_types.includes(type)}
                        onCheckedChange={() =>
                          toggleArrayItem("work_types", type)
                        }
                        className="border-2 border-gray-400 shrink-0"
                      />
                      <label
                        htmlFor={type}
                        className="text-xs sm:text-sm text-gray-700 cursor-pointer leading-tight"
                      >
                        {type}
                      </label>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    onClick={() => setShowCustomWorkType(true)}
                    className="col-span-2 border-2 border-gray-300 rounded-none hover:bg-gray-50 justify-start"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t("postJobPage.customWorkType.other")}
                  </Button>
                </div>

                {showCustomWorkType && (
                  <div className="mt-4 p-4 border-2 border-blue-200 bg-blue-50 rounded-none">
                    <Label className="text-sm font-medium text-gray-700 mb-3 block">
                      {t("postJobPage.customWorkType.add")}
                    </Label>
                    <Input
                      value={customWorkType}
                      onChange={(e) => setCustomWorkType(e.target.value)}
                      placeholder={t("postJobPage.placeholders.customWorkType")}
                      className="w-full border-2 border-gray-300 rounded-none mb-3"
                      onKeyPress={(e) =>
                        e.key === "Enter" && addCustomWorkType()
                      }
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={addCustomWorkType}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-none"
                      >
                        {t("postJobPage.actions.add")}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowCustomWorkType(false);
                          setCustomWorkType("");
                        }}
                        className="flex-1 border-2 border-gray-300 rounded-none"
                      >
                        {t("postJobPage.actions.cancel")}
                      </Button>
                    </div>
                  </div>
                )}

                {formData.custom_work_types.length > 0 && (
                  <div className="mt-4">
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      {t("postJobPage.customWorkType.listLabel")}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {formData.custom_work_types.map((type) => (
                        <Badge
                          key={type}
                          className="bg-blue-100 text-blue-800 flex items-center gap-1"
                        >
                          {type}
                          <X
                            className="w-3 h-3 cursor-pointer hover:text-blue-900"
                            onClick={() => removeCustomWorkType(type)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t("postJobPage.fields.jobStatus")}
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger className="border-2 border-gray-300 rounded-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">
                      {t("campaigns.jobs.open")}
                    </SelectItem>
                    <SelectItem value="closed">
                      {t("campaigns.jobs.closed")}
                    </SelectItem>
                    <SelectItem value="draft">
                      {t("campaigns.jobs.draft")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end pt-6">
                <Button
                  onClick={handleNext}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-none"
                >
                  {t("postJobPage.next.projectOverview")}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Project Overview */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <FileText className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("postJobPage.steps.projectOverview")}
                </h2>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t("postJobPage.fields.location")}
                </Label>
                <Select
                  value={formData.location || "remote"}
                  onValueChange={(v) =>
                    setFormData({ ...formData, location: v })
                  }
                >
                  <SelectTrigger className="border-2 border-gray-300 rounded-none">
                    <SelectValue
                      placeholder={t("postJobPage.placeholders.selectLocation")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remote">
                      {t("postJobPage.location.remote")}
                    </SelectItem>
                    <SelectItem value="hybrid">
                      {t("postJobPage.location.hybrid")}
                    </SelectItem>
                    <SelectItem value="on_site">
                      {t("postJobPage.location.onSite")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  {t("postJobPage.location.help")}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t("postJobPage.fields.jobType")}
                </Label>
                <Select
                  value={formData.job_type}
                  onValueChange={(v) =>
                    setFormData({ ...formData, job_type: v })
                  }
                >
                  <SelectTrigger className="border-2 border-gray-300 rounded-none">
                    <SelectValue
                      placeholder={t("postJobPage.placeholders.selectJobType")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contract">
                      {t("postJobPage.jobType.contract")}
                    </SelectItem>
                    <SelectItem value="per_project">
                      {t("postJobPage.jobType.perProject")}
                    </SelectItem>
                    <SelectItem value="part_time">
                      {t("postJobPage.jobType.partTime")}
                    </SelectItem>
                    <SelectItem value="full_time">
                      {t("postJobPage.jobType.fullTime")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t("postJobPage.fields.aboutRole")}
                </Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder={t("postJobPage.placeholders.aboutRole")}
                  className="border-2 border-gray-300 rounded-none min-h-[150px]"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-3 block">
                  {t("postJobPage.fields.goalsKpis")}
                </Label>
                <div className="grid grid-cols-1 gap-3">
                  <Textarea
                    value={formData.goals.join("\\n")}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        goals: e.target.value
                          ? e.target.value.split("\\n")
                          : [],
                      })
                    }
                    placeholder={t("postJobPage.placeholders.goalsKpis")}
                    className="border-2 border-gray-300 rounded-none w-full min-h-[100px]"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t("postJobPage.fields.deliverables")}
                </Label>
                <Input
                  value={formData.deliverables}
                  onChange={(e) =>
                    setFormData({ ...formData, deliverables: e.target.value })
                  }
                  placeholder={t("postJobPage.placeholders.deliverables")}
                  className="border-2 border-gray-300 rounded-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    {t("postJobPage.fields.expectedStartDate")}
                  </Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                    className="border-2 border-gray-300 rounded-none"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    {t("postJobPage.fields.expectedEndDate")}
                  </Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                    className="border-2 border-gray-300 rounded-none"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-6">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="border-2 border-gray-300 rounded-none"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t("postJobPage.actions.back")}
                </Button>
                <Button
                  onClick={handleNext}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-none"
                >
                  {t("postJobPage.next.talentRequirements")}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Talent Requirements */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <Users className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("postJobPage.steps.talentRequirements")}
                </h2>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-3 block">
                  {t("postJobPage.fields.preferredTalentType")}
                </Label>

                {/* AI Talent Section */}
                <div className="mb-4">
                  <Label className="text-xs font-semibold text-gray-600 mb-2 block uppercase">
                    {t("postJobPage.talentSections.aiTalentDefault")}
                  </Label>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center space-x-2 p-3 border-2 border-blue-200 bg-blue-50 rounded-none">
                      <Checkbox
                        id="AI Talent (Virtual)"
                        checked={formData.talent_types.includes(
                          "AI Talent (Virtual)",
                        )}
                        onCheckedChange={() =>
                          toggleArrayItem("talent_types", "AI Talent (Virtual)")
                        }
                        className="border-2 border-blue-400"
                      />
                      <label
                        htmlFor="AI Talent (Virtual)"
                        className="text-sm text-gray-700 cursor-pointer flex-1"
                      >
                        AI Talent (Virtual)
                      </label>
                    </div>
                  </div>
                </div>

                {/* Human Talent Section */}
                <div>
                  <Label className="text-xs font-semibold text-gray-600 mb-2 block uppercase">
                    {t("postJobPage.talentSections.humanTalentOther")}
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {talentTypes
                      .filter((t) => t !== "AI Talent (Virtual)")
                      .map((type) => (
                        <div
                          key={type}
                          className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50"
                        >
                          <Checkbox
                            id={type}
                            checked={formData.talent_types.includes(type)}
                            onCheckedChange={() =>
                              toggleArrayItem("talent_types", type)
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    {t("postJobPage.fields.region")}
                  </Label>
                  <Input
                    value={formData.region}
                    onChange={(e) =>
                      setFormData({ ...formData, region: e.target.value })
                    }
                    placeholder={t("postJobPage.placeholders.region")}
                    className="border-2 border-gray-300 rounded-none"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    {t("postJobPage.fields.language")}
                  </Label>
                  <Input
                    value={formData.language}
                    onChange={(e) =>
                      setFormData({ ...formData, language: e.target.value })
                    }
                    placeholder={t("postJobPage.placeholders.language")}
                    className="border-2 border-gray-300 rounded-none"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-3 block">
                  {t("postJobPage.fields.skillsNeeded")}
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {skills.map((skill) => (
                    <div
                      key={skill}
                      className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50"
                    >
                      <Checkbox
                        id={skill}
                        checked={formData.required_skills.includes(skill)}
                        onCheckedChange={() =>
                          toggleArrayItem("required_skills", skill)
                        }
                        className="border-2 border-gray-400"
                      />
                      <label
                        htmlFor={skill}
                        className="text-sm text-gray-700 cursor-pointer flex-1"
                      >
                        {skill}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 border-2 border-blue-200 bg-blue-50 rounded-none">
                <Checkbox
                  id="needs_licensing"
                  checked={formData.needs_licensing}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, needs_licensing: checked })
                  }
                  className="border-2 border-blue-400"
                />
                <label
                  htmlFor="needs_licensing"
                  className="text-sm font-medium text-gray-900 cursor-pointer flex-1"
                >
                  {t("postJobPage.fields.needsLicensing")}
                </label>
              </div>

              <div className="flex justify-between pt-6">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="border-2 border-gray-300 rounded-none"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t("postJobPage.actions.back")}
                </Button>
                <Button
                  onClick={handleNext}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-none"
                >
                  {formData.needs_licensing
                    ? t("postJobPage.next.licensingDetails")
                    : t("postJobPage.next.budget")}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Likeness Usage & Licensing (conditional) */}
          {currentStep === 4 && formData.needs_licensing && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("postJobPage.steps.likenessLicensing")}
                </h2>
              </div>

              <Alert className="bg-blue-50 border-2 border-blue-200 rounded-none">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  {t("postJobPage.licensing.help")}
                </AlertDescription>
              </Alert>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t("postJobPage.fields.usageType")}
                </Label>
                <Select
                  value={formData.usage_type}
                  onValueChange={(v) =>
                    setFormData({ ...formData, usage_type: v })
                  }
                >
                  <SelectTrigger className="border-2 border-gray-300 rounded-none">
                    <SelectValue
                      placeholder={t(
                        "postJobPage.placeholders.selectUsageType",
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="commercial">
                      {t("postJobPage.usageType.commercial")}
                    </SelectItem>
                    <SelectItem value="film">
                      {t("postJobPage.usageType.film")}
                    </SelectItem>
                    <SelectItem value="ad">
                      {t("postJobPage.usageType.advertising")}
                    </SelectItem>
                    <SelectItem value="social">
                      {t("postJobPage.usageType.socialMedia")}
                    </SelectItem>
                    <SelectItem value="music">
                      {t("postJobPage.usageType.musicVideo")}
                    </SelectItem>
                    <SelectItem value="other">
                      {t("postJobPage.usageType.other")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t("postJobPage.fields.licenseDuration")}
                </Label>
                <Select
                  value={formData.license_duration}
                  onValueChange={(v) =>
                    setFormData({ ...formData, license_duration: v })
                  }
                >
                  <SelectTrigger className="border-2 border-gray-300 rounded-none">
                    <SelectValue
                      placeholder={t("postJobPage.placeholders.selectDuration")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30_days">
                      {t("postJobPage.licenseDuration.days30")}
                    </SelectItem>
                    <SelectItem value="3_months">
                      {t("postJobPage.licenseDuration.months3")}
                    </SelectItem>
                    <SelectItem value="6_months">
                      {t("postJobPage.licenseDuration.months6")}
                    </SelectItem>
                    <SelectItem value="1_year">
                      {t("postJobPage.licenseDuration.year1")}
                    </SelectItem>
                    <SelectItem value="perpetual">
                      {t("postJobPage.licenseDuration.perpetual")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t("postJobPage.fields.territories")}
                </Label>
                <Select
                  value={formData.territories}
                  onValueChange={(v) =>
                    setFormData({ ...formData, territories: v })
                  }
                >
                  <SelectTrigger className="border-2 border-gray-300 rounded-none">
                    <SelectValue
                      placeholder={t(
                        "postJobPage.placeholders.selectTerritories",
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">
                      {t("postJobPage.territories.global")}
                    </SelectItem>
                    <SelectItem value="us">
                      {t("postJobPage.territories.us")}
                    </SelectItem>
                    <SelectItem value="eu">
                      {t("postJobPage.territories.eu")}
                    </SelectItem>
                    <SelectItem value="asia">
                      {t("postJobPage.territories.asia")}
                    </SelectItem>
                    <SelectItem value="latam">
                      {t("postJobPage.territories.latam")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-none hover:bg-gray-50">
                  <Checkbox
                    id="exclusivity"
                    checked={formData.exclusivity}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, exclusivity: checked })
                    }
                    className="border-2 border-gray-400"
                  />
                  <label
                    htmlFor="exclusivity"
                    className="text-sm text-gray-700 cursor-pointer flex-1"
                  >
                    {t("postJobPage.fields.exclusiveUse")}
                  </label>
                </div>

                <div className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-none hover:bg-gray-50">
                  <Checkbox
                    id="royalty_option"
                    checked={formData.royalty_option}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, royalty_option: checked })
                    }
                    className="border-2 border-gray-400"
                  />
                  <label
                    htmlFor="royalty_option"
                    className="text-sm text-gray-700 cursor-pointer flex-1"
                  >
                    {t("postJobPage.fields.royaltyOption")}
                  </label>
                </div>
              </div>

              <div className="flex justify-between pt-6">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="border-2 border-gray-300 rounded-none"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t("postJobPage.actions.back")}
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={
                    !formData.usage_type ||
                    !formData.license_duration ||
                    !formData.territories
                  }
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-none"
                >
                  {t("postJobPage.next.budget")}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4 or 5: Budget & Compensation */}
          {currentStep === (formData.needs_licensing ? 5 : 4) && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <DollarSign className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("postJobPage.steps.budgetCompensation")}
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    {t("postJobPage.fields.budget")}
                  </Label>
                  <Input
                    type="number"
                    value={formData.budget}
                    onChange={(e) =>
                      setFormData({ ...formData, budget: e.target.value })
                    }
                    placeholder={t("postJobPage.placeholders.budget")}
                    className="border-2 border-gray-300 rounded-none"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    {t("postJobPage.budgetHelp")}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t("postJobPage.fields.paymentType")}
                </Label>
                <Select
                  value={formData.payment_type}
                  onValueChange={(v) =>
                    setFormData({ ...formData, payment_type: v })
                  }
                >
                  <SelectTrigger className="border-2 border-gray-300 rounded-none">
                    <SelectValue
                      placeholder={t(
                        "postJobPage.placeholders.selectPaymentType",
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">
                      {t("postJobPage.paymentType.fixed")}
                    </SelectItem>
                    <SelectItem value="per_deliverable">
                      {t("postJobPage.paymentType.perDeliverable")}
                    </SelectItem>
                    <SelectItem value="hourly">
                      {t("postJobPage.paymentType.hourly")}
                    </SelectItem>
                    <SelectItem value="royalty_base">
                      {t("postJobPage.paymentType.royaltyBase")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t("postJobPage.fields.currency")}
                </Label>
                <Select
                  value={formData.currency}
                  onValueChange={(v) =>
                    setFormData({ ...formData, currency: v })
                  }
                >
                  <SelectTrigger className="border-2 border-gray-300 rounded-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Alert className="bg-amber-50 border-2 border-amber-600 rounded-none">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <AlertDescription className="text-amber-900">
                  <strong>{t("postJobPage.paymentMethodRequiredTitle")}</strong>{" "}
                  {t("postJobPage.paymentMethodRequiredDesc")}
                </AlertDescription>
              </Alert>

              <div className="flex justify-between pt-6">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="border-2 border-gray-300 rounded-none"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t("postJobPage.actions.back")}
                </Button>
                <Button
                  onClick={handleNext}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-none"
                >
                  {t("postJobPage.next.collaboration")}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 5 or 6: Collaboration Preferences */}
          {currentStep === (formData.needs_licensing ? 6 : 5) && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <Users className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("postJobPage.steps.collaborationPreferences")}
                </h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-none">
                  <div className="flex-1">
                    <label
                      htmlFor="work_with_agency"
                      className="text-sm font-medium text-gray-900 cursor-pointer block mb-1"
                    >
                      {t("postJobPage.fields.workWithAgency")}
                    </label>
                    <p className="text-xs text-gray-600">
                      {t("postJobPage.workWithAgencyHelp")}
                    </p>
                  </div>
                  <Checkbox
                    id="work_with_agency"
                    checked={formData.work_with_agency}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        work_with_agency: checked,
                        invited_agency_ids: checked
                          ? formData.invited_agency_ids
                          : [],
                      })
                    }
                    className="border-2 border-gray-400"
                  />
                </div>

                {formData.work_with_agency && (
                  <Card className="p-4 bg-blue-50 border-2 border-blue-200 rounded-none space-y-3">
                    <p className="text-sm text-gray-700">
                      {t("postJobPage.searchInviteAgencies")}
                    </p>
                    <Input
                      value={agencySearch}
                      onChange={(e) => setAgencySearch(e.target.value)}
                      placeholder={t("postJobPage.placeholders.searchAgencies")}
                      className="border-2 border-gray-300 rounded-none"
                    />
                    {loadingAgencies ? (
                      <p className="text-xs text-gray-600">
                        {t("postJobPage.loadingConnectedAgencies")}
                      </p>
                    ) : filteredAgencies.length === 0 ? (
                      <p className="text-xs text-gray-600">
                        {t("postJobPage.noConnectedAgencies")}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {filteredAgencies.map((agency) => {
                          const agencyId = String(
                            agency?.id || agency?.agency_id || "",
                          );
                          const label =
                            agency?.display_name ||
                            agency?.agency_name ||
                            "Agency";
                          return (
                            <label
                              key={agencyId}
                              className="flex items-center justify-between gap-3 bg-white border border-blue-100 rounded-md px-3 py-2 text-sm text-gray-800"
                            >
                              <span className="flex-1">{label}</span>
                              <Checkbox
                                checked={formData.invited_agency_ids.includes(
                                  agencyId,
                                )}
                                onCheckedChange={() =>
                                  toggleSelectedAgency(agencyId)
                                }
                              />
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                )}

                <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-none">
                  <div className="flex-1">
                    <label
                      htmlFor="invite_creator"
                      className="text-sm font-medium text-gray-900 cursor-pointer block mb-1"
                    >
                      {t("postJobPage.fields.inviteCreator")}
                    </label>
                    <p className="text-xs text-gray-600">
                      {t("postJobPage.inviteCreatorHelp")}
                    </p>
                  </div>
                  <Checkbox
                    id="invite_creator"
                    checked={formData.invite_creator}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        invite_creator: checked,
                        invited_creator_ids: checked
                          ? formData.invited_creator_ids
                          : [],
                      })
                    }
                    className="border-2 border-gray-400"
                  />
                </div>

                {formData.invite_creator && (
                  <Card className="p-4 bg-purple-50 border-2 border-purple-200 rounded-none space-y-3">
                    <p className="text-sm text-gray-700">
                      {t("postJobPage.searchInviteCreators")}
                    </p>
                    <Input
                      value={creatorSearch}
                      onChange={(e) => setCreatorSearch(e.target.value)}
                      placeholder={t("postJobPage.placeholders.searchCreators")}
                      className="border-2 border-gray-300 rounded-none"
                    />
                    {loadingCreators ? (
                      <p className="text-xs text-gray-600">
                        {t("postJobPage.loadingConnectedCreators")}
                      </p>
                    ) : filteredCreators.length === 0 ? (
                      <p className="text-xs text-gray-600">
                        {t("postJobPage.noConnectedCreators")}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {filteredCreators.map((creator) => {
                          const creatorId = String(creator?.id || "");
                          const label =
                            creator?.full_name ||
                            creator?.display_name ||
                            "Creator";
                          return (
                            <label
                              key={creatorId}
                              className="flex items-center justify-between gap-3 bg-white border border-purple-100 rounded-md px-3 py-2 text-sm text-gray-800"
                            >
                              <span className="flex-1">{label}</span>
                              <Checkbox
                                checked={formData.invited_creator_ids.includes(
                                  creatorId,
                                )}
                                onCheckedChange={() =>
                                  toggleSelectedCreator(creatorId)
                                }
                              />
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t("postJobPage.fields.attachBrandAssets")}
                </Label>
                <label
                  htmlFor="job-brand-assets-upload"
                  className="border-2 border-dashed border-gray-300 rounded-none p-8 text-center hover:border-blue-600 transition-colors cursor-pointer block"
                >
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    {t("postJobPage.brandAssetsUploadTitle")}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t("postJobPage.brandAssetsUploadHelp")}
                  </p>
                </label>
                <input
                  id="job-brand-assets-upload"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleBrandAssetsUpload}
                />
                {formData.brand_assets.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                    {formData.brand_assets.map((asset, idx) => {
                      const url = String(
                        asset?.url || asset?.preview_url || "",
                      );
                      const mimeType = String(asset?.mime_type || "");
                      const isImage =
                        mimeType.startsWith("image/") ||
                        /\\.(png|jpe?g|gif|webp)$/i.test(url);
                      return (
                        <div
                          key={`${url || asset?.name || idx}`}
                          className="relative border border-gray-200 rounded-md overflow-hidden bg-white"
                        >
                          {isImage ? (
                            <img
                              src={url}
                              alt={asset?.name || t("postJobPage.brandAsset")}
                              className="h-24 w-full object-cover"
                            />
                          ) : (
                            <div className="h-24 flex items-center justify-center text-xs text-gray-600 bg-gray-50">
                              {asset?.name || t("postJobPage.fileUploaded")}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                brand_assets: prev.brand_assets.filter(
                                  (_, i) => i !== idx,
                                ),
                              }))
                            }
                            className="absolute top-1 right-1 bg-white/90 border border-gray-200 rounded-full p-1 hover:bg-white"
                            aria-label={t("postJobPage.removeAsset")}
                          >
                            <X className="w-3 h-3 text-gray-700" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-none hover:bg-gray-50">
                <Checkbox
                  id="confidential"
                  checked={formData.confidential}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, confidential: checked })
                  }
                  className="border-2 border-gray-400"
                />
                <label
                  htmlFor="confidential"
                  className="text-sm text-gray-700 cursor-pointer flex-1"
                >
                  {t("postJobPage.fields.confidential")}
                </label>
              </div>

              <div className="flex justify-between pt-6">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="border-2 border-gray-300 rounded-none"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t("postJobPage.actions.back")}
                </Button>
                <Button
                  onClick={handleNext}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-none"
                >
                  {t("postJobPage.next.previewPublish")}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 6 or 7: Preview & Publish */}
          {currentStep === (formData.needs_licensing ? 7 : 6) && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <Eye className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("postJobPage.steps.previewPublish")}
                </h2>
              </div>

              <Card className="p-6 bg-white border-2 border-blue-600 rounded-none">
                <div className="flex gap-6 mb-6">
                  <div className="w-32 h-32 bg-gray-200 rounded-none flex items-center justify-center">
                    <Briefcase className="w-12 h-12 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {formData.job_title}
                    </h3>
                    <p className="text-gray-600 mb-3">
                      {formData.company_name}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge className="bg-blue-100 text-blue-800">
                        {formData.category}
                      </Badge>
                      {formData.work_types.slice(0, 3).map((type) => (
                        <Badge key={type} className="bg-gray-200 text-gray-700">
                          {type}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1 text-gray-900 font-bold">
                        <DollarSign className="w-4 h-4" />
                        {formData.budget} {formData.currency}
                      </div>
                      {formData.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {`${t("postJobPage.fields.expectedStartDate")}: ${formData.start_date}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t-2 border-gray-200 pt-6">
                  <h4 className="font-bold text-gray-900 mb-3">
                    {t("postJobPage.steps.projectOverview")}
                  </h4>
                  <p className="text-gray-700 mb-4">
                    {formData.description || t("postJobPage.noDescription")}
                  </p>

                  {formData.deliverables && (
                    <div className="mb-4">
                      <span className="text-sm font-medium text-gray-700">
                        {t("postJobPage.fields.deliverables")}:{" "}
                      </span>
                      <span className="text-sm text-gray-600">
                        {formData.deliverables}
                      </span>
                    </div>
                  )}

                  {formData.talent_types.length > 0 && (
                    <div className="mb-4">
                      <span className="text-sm font-medium text-gray-700 block mb-2">
                        {t("postJobPage.lookingFor")}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {formData.talent_types.map((type) => (
                          <Badge
                            key={type}
                            className="bg-purple-100 text-purple-800"
                          >
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {formData.needs_licensing && (
                    <Alert className="bg-amber-50 border-2 border-amber-600 rounded-none mt-4">
                      <Shield className="h-5 w-5 text-amber-600" />
                      <AlertDescription className="text-amber-900">
                        <strong>{t("postJobPage.licensingRequired")}:</strong>{" "}
                        {formData.usage_type} usage, {formData.license_duration}{" "}
                        duration, {formData.territories} territories
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </Card>

              <div className="flex gap-4 pt-6">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1 border-2 border-gray-300 rounded-none"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t("postJobPage.backToEdit")}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  className="flex-1 border-2 border-gray-300 rounded-none"
                  disabled={savingDraft}
                >
                  {savingDraft
                    ? t("postJobPage.actions.saving")
                    : t("postJobPage.actions.saveDraft")}
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-none"
                  disabled={submitting}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {submitting
                    ? t("postJobPage.actions.publishing")
                    : t("postJobPage.actions.publishMarketplace")}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
