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
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!formData.job_title.trim()) {
      toast({ title: "Missing title", description: "Job title is required." });
      return;
    }
    if (!formData.description.trim()) {
      toast({
        title: "Missing description",
        description: "About the role is required.",
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
        toast({ title: "Success", description: "Job posted successfully!" });
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
        title: editingJobId ? "Draft updated" : "Draft saved",
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
            Back to Dashboard
          </Button>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-none flex items-center justify-center">
              <Briefcase className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Post a Job</h1>
              <p className="text-gray-600">
                Find the perfect talent for your campaign
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Step {currentStep} of {totalSteps}
              </span>
              <span className="text-sm text-gray-600">
                {Math.round(progress)}% Complete
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
                  Basic Information
                </h2>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Job Title / Campaign Title *
                </Label>
                <Input
                  value={formData.job_title}
                  onChange={(e) =>
                    setFormData({ ...formData, job_title: e.target.value })
                  }
                  placeholder="e.g., AI Product Launch Campaign"
                  className="border-2 border-gray-300 rounded-none"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Company Name
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
                  Auto-filled from your profile
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Contact Email *
                </Label>
                <Input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_email: e.target.value })
                  }
                  placeholder="contact@company.com"
                  className="border-2 border-gray-300 rounded-none"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Category *
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) =>
                    setFormData({ ...formData, category: v })
                  }
                >
                  <SelectTrigger className="border-2 border-gray-300 rounded-none">
                    <SelectValue placeholder="Select category" />
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
                  Call Type *
                </Label>
                <Select
                  value={formData.call_type}
                  onValueChange={(v) =>
                    setFormData({ ...formData, call_type: v })
                  }
                >
                  <SelectTrigger className="border-2 border-gray-300 rounded-none">
                    <SelectValue placeholder="Select call type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="creator">Creator call</SelectItem>
                    <SelectItem value="agency">Agency call</SelectItem>
                    <SelectItem value="athlete">Athlete call</SelectItem>
                    <SelectItem value="ai_artist">AI artist call</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-3 block">
                  Type of Work (Select all that apply)
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {workTypes.map((type) => (
                    <div
                      key={type}
                      className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50"
                    >
                      <Checkbox
                        id={type}
                        checked={formData.work_types.includes(type)}
                        onCheckedChange={() =>
                          toggleArrayItem("work_types", type)
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

                  <Button
                    variant="outline"
                    onClick={() => setShowCustomWorkType(true)}
                    className="border-2 border-gray-300 rounded-none hover:bg-gray-50 justify-start"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Other (Custom)
                  </Button>
                </div>

                {showCustomWorkType && (
                  <div className="mt-4 p-4 border-2 border-blue-200 bg-blue-50 rounded-none">
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Add Custom Work Type
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={customWorkType}
                        onChange={(e) => setCustomWorkType(e.target.value)}
                        placeholder="e.g., Virtual Event Hosting"
                        className="flex-1 border-2 border-gray-300 rounded-none"
                        onKeyPress={(e) =>
                          e.key === "Enter" && addCustomWorkType()
                        }
                      />
                      <Button
                        onClick={addCustomWorkType}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-none"
                      >
                        Add
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowCustomWorkType(false)}
                        className="border-2 border-gray-300 rounded-none"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {formData.custom_work_types.length > 0 && (
                  <div className="mt-4">
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Custom Work Types:
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
                  Job Status
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger className="border-2 border-gray-300 rounded-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end pt-6">
                <Button
                  onClick={handleNext}
                  disabled={!formData.job_title || !formData.contact_email}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-none"
                >
                  Next: Project Overview
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
                  Project Overview
                </h2>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Location
                </Label>
                <Select
                  value={formData.location || "remote"}
                  onValueChange={(v) =>
                    setFormData({ ...formData, location: v })
                  }
                >
                  <SelectTrigger className="border-2 border-gray-300 rounded-none">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="on_site">On-site</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Most jobs are automatically labeled as remote
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Job Type *
                </Label>
                <Select
                  value={formData.job_type}
                  onValueChange={(v) =>
                    setFormData({ ...formData, job_type: v })
                  }
                >
                  <SelectTrigger className="border-2 border-gray-300 rounded-none">
                    <SelectValue placeholder="Select job type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="per_project">Per Project</SelectItem>
                    <SelectItem value="part_time">Part-Time</SelectItem>
                    <SelectItem value="full_time">Full-Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  About the Role *
                </Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="What's being created, who it's for, what style it should have..."
                  className="border-2 border-gray-300 rounded-none min-h-[150px]"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-3 block">
                  Goals & KPIs
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    "Awareness",
                    "Sales",
                    "Social Reach",
                    "AI R&D",
                    "Film Production",
                    "Brand Building",
                  ].map((goal) => (
                    <div
                      key={goal}
                      className="flex items-center space-x-2 p-3 border-2 border-gray-200 rounded-none hover:bg-gray-50"
                    >
                      <Checkbox
                        id={goal}
                        checked={formData.goals.includes(goal)}
                        onCheckedChange={() => toggleArrayItem("goals", goal)}
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

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Deliverables
                </Label>
                <Input
                  value={formData.deliverables}
                  onChange={(e) =>
                    setFormData({ ...formData, deliverables: e.target.value })
                  }
                  placeholder="e.g., 3 short videos, 5 stills, 1 voiceover clip"
                  className="border-2 border-gray-300 rounded-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Expected Start Date
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
                    Expected End Date
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
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!formData.description || !formData.job_type}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-none"
                >
                  Next: Talent Requirements
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
                  Talent Requirements
                </h2>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-3 block">
                  Preferred Talent Type
                </Label>

                {/* AI Talent Section */}
                <div className="mb-4">
                  <Label className="text-xs font-semibold text-gray-600 mb-2 block uppercase">
                    AI Talent (Default)
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
                    Human Talent & Other
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
                    Region
                  </Label>
                  <Input
                    value={formData.region}
                    onChange={(e) =>
                      setFormData({ ...formData, region: e.target.value })
                    }
                    placeholder="e.g., North America, Global"
                    className="border-2 border-gray-300 rounded-none"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Language
                  </Label>
                  <Input
                    value={formData.language}
                    onChange={(e) =>
                      setFormData({ ...formData, language: e.target.value })
                    }
                    placeholder="e.g., English, Spanish"
                    className="border-2 border-gray-300 rounded-none"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-3 block">
                  Skills Needed
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
                  This job requires Face or Voice Licensing
                </label>
              </div>

              <div className="flex justify-between pt-6">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="border-2 border-gray-300 rounded-none"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-none"
                >
                  {formData.needs_licensing
                    ? "Next: Licensing Details"
                    : "Next: Budget"}
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
                  Likeness Usage & Licensing
                </h2>
              </div>

              <Alert className="bg-blue-50 border-2 border-blue-200 rounded-none">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  Legal agreement templates and royalty calculations will be
                  auto-embedded based on your selections.
                </AlertDescription>
              </Alert>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Usage Type *
                </Label>
                <Select
                  value={formData.usage_type}
                  onValueChange={(v) =>
                    setFormData({ ...formData, usage_type: v })
                  }
                >
                  <SelectTrigger className="border-2 border-gray-300 rounded-none">
                    <SelectValue placeholder="Select usage type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="film">Film</SelectItem>
                    <SelectItem value="ad">Advertising</SelectItem>
                    <SelectItem value="social">Social Media</SelectItem>
                    <SelectItem value="music">Music Video</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Duration of License *
                </Label>
                <Select
                  value={formData.license_duration}
                  onValueChange={(v) =>
                    setFormData({ ...formData, license_duration: v })
                  }
                >
                  <SelectTrigger className="border-2 border-gray-300 rounded-none">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30_days">30 Days</SelectItem>
                    <SelectItem value="3_months">3 Months</SelectItem>
                    <SelectItem value="6_months">6 Months</SelectItem>
                    <SelectItem value="1_year">1 Year</SelectItem>
                    <SelectItem value="perpetual">Perpetual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Territories *
                </Label>
                <Select
                  value={formData.territories}
                  onValueChange={(v) =>
                    setFormData({ ...formData, territories: v })
                  }
                >
                  <SelectTrigger className="border-2 border-gray-300 rounded-none">
                    <SelectValue placeholder="Select territories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global</SelectItem>
                    <SelectItem value="us">United States</SelectItem>
                    <SelectItem value="eu">European Union</SelectItem>
                    <SelectItem value="asia">Asia</SelectItem>
                    <SelectItem value="latam">Latin America</SelectItem>
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
                    Exclusive use of likeness for this campaign
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
                    Include royalty-based payout (%)
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
                  Back
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
                  Next: Budget
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
                  Budget & Compensation
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Budget *
                  </Label>
                  <Input
                    type="number"
                    value={formData.budget}
                    onChange={(e) =>
                      setFormData({ ...formData, budget: e.target.value })
                    }
                    placeholder="2000"
                    className="border-2 border-gray-300 rounded-none"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Enter the total fixed budget or base payment for this
                    project.
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Payment Type *
                </Label>
                <Select
                  value={formData.payment_type}
                  onValueChange={(v) =>
                    setFormData({ ...formData, payment_type: v })
                  }
                >
                  <SelectTrigger className="border-2 border-gray-300 rounded-none">
                    <SelectValue placeholder="Select payment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Price</SelectItem>
                    <SelectItem value="per_deliverable">
                      Per Deliverable
                    </SelectItem>
                    <SelectItem value="hourly">Hourly Rate</SelectItem>
                    <SelectItem value="royalty_base">Royalty + Base</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Currency
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
                  <strong>Payment Method Required:</strong> You'll need to add
                  payment information before this job goes live.
                </AlertDescription>
              </Alert>

              <div className="flex justify-between pt-6">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="border-2 border-gray-300 rounded-none"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!formData.budget || !formData.payment_type}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-none"
                >
                  Next: Collaboration
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
                  Collaboration Preferences
                </h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-none">
                  <div className="flex-1">
                    <label
                      htmlFor="work_with_agency"
                      className="text-sm font-medium text-gray-900 cursor-pointer block mb-1"
                    >
                      Work with a Marketing Agency?
                    </label>
                    <p className="text-xs text-gray-600">
                      Connect with verified agencies from marketplace
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
                      Search and invite connected agencies:
                    </p>
                    <Input
                      value={agencySearch}
                      onChange={(e) => setAgencySearch(e.target.value)}
                      placeholder="Search agencies..."
                      className="border-2 border-gray-300 rounded-none"
                    />
                    {loadingAgencies ? (
                      <p className="text-xs text-gray-600">
                        Loading connected agencies...
                      </p>
                    ) : filteredAgencies.length === 0 ? (
                      <p className="text-xs text-gray-600">
                        No connected agencies found.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {filteredAgencies.map((agency) => {
                          const agencyId = String(
                            agency?.agency_id || agency?.id || "",
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
                      Invite AI Creator or Talent?
                    </label>
                    <p className="text-xs text-gray-600">
                      Browse top-rated creators and AI talent
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
                      Search and invite connected creators:
                    </p>
                    <Input
                      value={creatorSearch}
                      onChange={(e) => setCreatorSearch(e.target.value)}
                      placeholder="Search creators..."
                      className="border-2 border-gray-300 rounded-none"
                    />
                    {loadingCreators ? (
                      <p className="text-xs text-gray-600">
                        Loading connected creators...
                      </p>
                    ) : filteredCreators.length === 0 ? (
                      <p className="text-xs text-gray-600">
                        No connected creators found.
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
                  Attach Brand Assets
                </Label>
                <label
                  htmlFor="job-brand-assets-upload"
                  className="border-2 border-dashed border-gray-300 rounded-none p-8 text-center hover:border-blue-600 transition-colors cursor-pointer block"
                >
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Upload logos, media kits, or reference content
                  </p>
                  <p className="text-xs text-gray-500">
                    PDF, JPG, PNG, MP4 up to 100MB
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
                              alt={asset?.name || "Brand asset"}
                              className="h-24 w-full object-cover"
                            />
                          ) : (
                            <div className="h-24 flex items-center justify-center text-xs text-gray-600 bg-gray-50">
                              {asset?.name || "File uploaded"}
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
                            aria-label="Remove asset"
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
                  Mark this as private (visible to invited collaborators only)
                </label>
              </div>

              <div className="flex justify-between pt-6">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="border-2 border-gray-300 rounded-none"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-none"
                >
                  Next: Preview & Publish
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
                  Preview & Publish
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
                          Starts {formData.start_date}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t-2 border-gray-200 pt-6">
                  <h4 className="font-bold text-gray-900 mb-3">
                    Project Overview
                  </h4>
                  <p className="text-gray-700 mb-4">
                    {formData.description || "No description provided"}
                  </p>

                  {formData.deliverables && (
                    <div className="mb-4">
                      <span className="text-sm font-medium text-gray-700">
                        Deliverables:{" "}
                      </span>
                      <span className="text-sm text-gray-600">
                        {formData.deliverables}
                      </span>
                    </div>
                  )}

                  {formData.talent_types.length > 0 && (
                    <div className="mb-4">
                      <span className="text-sm font-medium text-gray-700 block mb-2">
                        Looking for:
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
                        <strong>Licensing Required:</strong>{" "}
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
                  Back to Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  className="flex-1 border-2 border-gray-300 rounded-none"
                  disabled={savingDraft}
                >
                  {savingDraft ? "Saving..." : "Save as Draft"}
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-none"
                  disabled={submitting}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {submitting ? "Publishing..." : "Publish to Marketplace"}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
