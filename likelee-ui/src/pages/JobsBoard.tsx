import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Briefcase,
  Building2,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  FileText,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { createPageUrl } from "@/utils";

const PAGE_SIZE = 10;

const callTypeOptions = [
  { value: "all", label: "All call types" },
  { value: "creator", label: "Creator call" },
  { value: "agency", label: "Agency call" },
  { value: "athlete", label: "Athlete call" },
  { value: "ai_artist", label: "AI artist call" },
];

const jobTypeOptions = [
  { value: "all", label: "All job types" },
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "freelance", label: "Freelance" },
  { value: "gig", label: "Gig" },
];

const locationOptions = [
  { value: "all", label: "All locations" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "on_site", label: "On-site" },
];

export default function JobsBoard() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const backTo = searchParams.get("backTo");
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [revealingMore, setRevealingMore] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [autoOpenedJobId, setAutoOpenedJobId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [callType, setCallType] = useState("all");
  const [jobType, setJobType] = useState("all");
  const [location, setLocation] = useState("all");
  const [category, setCategory] = useState("");
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyMessage, setApplyMessage] = useState("");
  const [portfolioLink, setPortfolioLink] = useState("");
  const [githubLink, setGithubLink] = useState("");
  const [linkedinLink, setLinkedinLink] = useState("");
  const [applyLoading, setApplyLoading] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeMeta, setResumeMeta] = useState<any | null>(null);
  const [compCardFile, setCompCardFile] = useState<File | null>(null);
  const [compCardUploading, setCompCardUploading] = useState(false);
  const [compCardMeta, setCompCardMeta] = useState<any | null>(null);
  const [selectedAssetIndex, setSelectedAssetIndex] = useState<number | null>(
    null,
  );
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const compCardInputRef = useRef<HTMLInputElement>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);

  const resolveAssetUrl = (asset: any) => {
    if (!asset) return "";
    if (typeof asset === "string") {
      if (asset.startsWith("http")) return asset;
      if (asset.includes("/")) {
        return supabase.storage.from("likelee-public").getPublicUrl(asset).data
          ?.publicUrl;
      }
      return "";
    }
    if (asset.url) return String(asset.url);
    if (asset.public_url) return String(asset.public_url);
    if (asset.asset_url) return String(asset.asset_url);
    if (asset.file_url) return String(asset.file_url);
    if (asset.preview_url) return String(asset.preview_url);
    if (asset.path) {
      return supabase.storage.from("likelee-public").getPublicUrl(asset.path)
        .data?.publicUrl;
    }
    if (asset.name && String(asset.name).includes("/")) {
      return supabase.storage.from("likelee-public").getPublicUrl(asset.name)
        .data?.publicUrl;
    }
    return "";
  };

  const resolveMissingJobAssetUrls = async (job: any) => {
    if (!supabase || !job?.brand_id) return;
    if (!Array.isArray(job.brand_assets) || job.brand_assets.length === 0)
      return;
    const missing = job.brand_assets.filter((asset: any) => {
      const url = resolveAssetUrl(asset);
      if (url) return false;
      if (typeof asset === "string") return asset.trim().length > 0;
      return Boolean(asset?.name);
    });
    if (missing.length === 0) return;
    try {
      const { data } = await supabase.storage
        .from("likelee-public")
        .list(`job-assets/${job.brand_id}`, { limit: 200 });
      if (!data || data.length === 0) return;
      const updated = job.brand_assets.map((asset: any) => {
        const url = resolveAssetUrl(asset);
        const rawName =
          typeof asset === "string" ? asset : String(asset?.name || "");
        if (url || !rawName) return asset;
        const safeName = rawName.replace(/[^\w.\-]+/g, "_");
        const match = data.find((item) => item.name.endsWith(safeName));
        if (!match) return asset;
        const path = `job-assets/${job.brand_id}/${match.name}`;
        const publicUrl = supabase.storage
          .from("likelee-public")
          .getPublicUrl(path).data?.publicUrl;
        if (typeof asset === "string") {
          return { name: rawName, url: publicUrl, path };
        }
        return { ...asset, name: rawName, url: publicUrl, path };
      });
      setSelectedJob((prev) =>
        prev && prev.id === job.id ? { ...prev, brand_assets: updated } : prev,
      );
      setJobs((prev) =>
        prev.map((item) =>
          item.id === job.id ? { ...item, brand_assets: updated } : item,
        ),
      );
    } catch {
      // ignore resolve failures
    }
  };

  const formatLabel = (value: string) =>
    value
      ? value
          .split("_")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ")
      : "";

  const isConfidentialBrandPlaceholder = (value: unknown) =>
    String(value || "")
      .trim()
      .toLowerCase() === "confidential brand";

  const resolveJobCompanyName = (job: any) => {
    const brandName = String(job?.brands?.company_name || "").trim();
    const companyName = String(job?.company_name || "").trim();
    if (brandName && !isConfidentialBrandPlaceholder(brandName))
      return brandName;
    if (companyName && !isConfidentialBrandPlaceholder(companyName))
      return companyName;
    return brandName || companyName || "Brand";
  };

  const formatYesNo = (value: unknown) => {
    if (value === true) return "Yes";
    if (value === false) return "No";
    return "Not specified";
  };

  const queryParams = useMemo(
    () => ({
      search: search || undefined,
      call_type: callType === "all" ? undefined : callType,
      job_type: jobType === "all" ? undefined : jobType,
      location: location === "all" ? undefined : location,
      category: category || undefined,
      status: "open",
    }),
    [search, callType, jobType, location, category],
  );

  const loadJobs = async () => {
    try {
      setLoading(true);
      setVisibleCount(PAGE_SIZE);
      const res = await base44.get<{ jobs?: any[] }>("/api/jobs", {
        params: queryParams,
      });
      const rows = Array.isArray(res?.jobs) ? res.jobs : [];
      setJobs(rows);
      if (rows.length > 0) {
        setSelectedJob((prev) => prev || rows[0]);
      } else {
        setSelectedJob(null);
      }
    } catch (e: any) {
      setJobs([]);
      setSelectedJob(null);
      toast({
        title: "Unable to load jobs",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [queryParams]);

  const loadMore = useCallback(() => {
    if (revealingMore) return;
    setRevealingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => prev + PAGE_SIZE);
      setRevealingMore(false);
    }, 400);
  }, [revealingMore]);

  const visibleJobs = jobs.slice(0, visibleCount);
  const hasMore = visibleCount < jobs.length;
  const isFiltered =
    search.trim() !== "" ||
    callType !== "all" ||
    jobType !== "all" ||
    location !== "all" ||
    category !== "";

  // Auto-load next batch when sentinel enters viewport
  useEffect(() => {
    if (!loadMoreSentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !revealingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(loadMoreSentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, revealingMore, loadMore]);

  useEffect(() => {
    if (!detailsOpen || !selectedJob) return;
    resolveMissingJobAssetUrls(selectedJob);
  }, [detailsOpen, selectedJob]);

  useEffect(() => {
    const jobIdParam = searchParams.get("jobId");
    const shouldApply = searchParams.get("apply") === "true";
    if (!jobIdParam || jobs.length === 0) return;
    if (autoOpenedJobId === jobIdParam) return;
    const match = jobs.find((job) => String(job?.id || "") === jobIdParam);
    if (match) {
      setSelectedJob(match);
      if (shouldApply) {
        setApplyOpen(true);
        setDetailsOpen(false);
      } else {
        setDetailsOpen(true);
      }
      setAutoOpenedJobId(jobIdParam);
    }
  }, [searchParams, jobs, autoOpenedJobId]);

  const handleApply = async () => {
    if (!selectedJob?.id) return;
    try {
      setApplyLoading(true);
      await base44.post(`/api/jobs/${selectedJob.id}/apply`, {
        message: applyMessage || undefined,
        resume_name: resumeMeta?.name,
        resume_url: resumeMeta?.url,
        resume_path: resumeMeta?.path,
        resume_mime: resumeMeta?.mime_type,
        resume_size: resumeMeta?.size,
        comp_card_name: compCardMeta?.name,
        comp_card_url: compCardMeta?.url,
        comp_card_path: compCardMeta?.path,
        portfolio_link: portfolioLink || undefined,
        github_link: githubLink || undefined,
        linkedin_link: linkedinLink || undefined,
      });
      toast({
        title: "Application sent",
        description: "Your application was submitted to the brand.",
      });
      setApplyOpen(false);
      setApplyMessage("");
      setPortfolioLink("");
      setGithubLink("");
      setLinkedinLink("");
      setResumeFile(null);
      setResumeMeta(null);
      setCompCardFile(null);
      setCompCardMeta(null);
    } catch (e: any) {
      toast({
        title: "Apply failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setApplyLoading(false);
    }
  };

  const handleResumeUpload = async (file: File | null) => {
    setResumeFile(file);
    setResumeMeta(null);
    if (!file) return;
    if (!/pdf$/i.test(file.name) && !String(file.type).includes("pdf")) {
      toast({
        title: "Invalid file",
        description: "Please upload a PDF resume.",
        variant: "destructive",
      });
      return;
    }
    if (!supabase) {
      toast({
        title: "Upload unavailable",
        description: "Storage is not configured for this environment.",
        variant: "destructive",
      });
      return;
    }
    try {
      setResumeUploading(true);
      const session = await supabase.auth.getSession();
      const userId = String(session.data.session?.user?.id || "applicant");
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `job-resumes/${userId}/${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}_${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("likelee-public")
        .upload(path, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage
        .from("likelee-public")
        .getPublicUrl(path);
      setResumeMeta({
        name: file.name,
        size: file.size,
        url: String(data?.publicUrl || ""),
        path,
        mime_type: file.type,
      });
    } catch (e: any) {
      toast({
        title: "Resume upload failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setResumeUploading(false);
    }
  };

  const handleCompCardUpload = async (file: File | null) => {
    setCompCardFile(file);
    setCompCardMeta(null);
    if (!file) return;
    if (!supabase) {
      toast({
        title: "Upload unavailable",
        description: "Storage is not configured for this environment.",
        variant: "destructive",
      });
      return;
    }
    try {
      setCompCardUploading(true);
      const session = await supabase.auth.getSession();
      const userId = String(session.data.session?.user?.id || "applicant");
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `job-comp-cards/${userId}/${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}_${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("likelee-public")
        .upload(path, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage
        .from("likelee-public")
        .getPublicUrl(path);
      setCompCardMeta({
        name: file.name,
        size: file.size,
        url: String(data?.publicUrl || ""),
        path,
        mime_type: file.type,
      });
    } catch (e: any) {
      toast({
        title: "Comp card upload failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCompCardUploading(false);
    }
  };

  const handleRemoveCompCard = () => {
    setCompCardFile(null);
    setCompCardMeta(null);
    if (compCardInputRef.current) compCardInputRef.current.value = "";
  };

  const handleRemoveResume = () => {
    setResumeFile(null);
    setResumeMeta(null);
    if (resumeInputRef.current) resumeInputRef.current.value = "";
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 px-6 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <Button
                type="button"
                variant="ghost"
                className="px-2"
                onClick={() => {
                  if (backTo) {
                    navigate(backTo);
                    return;
                  }
                  if (window.history.length > 1) {
                    navigate(-1);
                  } else {
                    navigate(createPageUrl("CreatorDashboard"));
                  }
                }}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back to dashboard
              </Button>
              <h1 className="text-3xl font-bold text-gray-900">Find Jobs</h1>
              <p className="text-gray-600">
                Browse brand-posted opportunities and apply directly.
              </p>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <Briefcase className="w-5 h-5" />
              <span className="text-sm">{jobs.length} open roles</span>
            </div>
          </div>

          <Card className="p-4 border border-gray-200 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search job title or keyword"
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={callType} onValueChange={setCallType}>
                <SelectTrigger>
                  <SelectValue placeholder="Call type" />
                </SelectTrigger>
                <SelectContent>
                  {callTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={jobType} onValueChange={setJobType}>
                <SelectTrigger>
                  <SelectValue placeholder="Job type" />
                </SelectTrigger>
                <SelectContent>
                  {jobTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  {locationOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading &&
              Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <Card
                  key={`skeleton-${i}`}
                  className="flex flex-col h-full border border-gray-200 bg-white overflow-visible animate-pulse"
                >
                  <div className="p-5 flex-grow space-y-3">
                    <div className="h-5 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-100 rounded w-1/2" />
                    <div className="flex gap-2 pt-2">
                      <div className="h-5 bg-gray-200 rounded-full w-20" />
                      <div className="h-5 bg-gray-100 rounded-full w-16" />
                    </div>
                    <div className="h-4 bg-gray-100 rounded w-1/3" />
                    <div className="space-y-1.5">
                      <div className="h-3 bg-gray-100 rounded" />
                      <div className="h-3 bg-gray-100 rounded w-5/6" />
                      <div className="h-3 bg-gray-100 rounded w-4/6" />
                    </div>
                  </div>
                  <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3">
                    <div className="h-9 bg-gray-200 rounded w-full" />
                    <div className="h-9 bg-gray-300 rounded w-full" />
                  </div>
                </Card>
              ))}
            {!loading && jobs.length === 0 && (
              <div className="col-span-full">
                <Card className="p-8 text-center">
                  <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="font-semibold text-gray-800">
                    {isFiltered
                      ? "No results found for your search"
                      : "No jobs available right now"}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {isFiltered
                      ? "Try different keywords or clear your filters."
                      : "Check back soon — new roles are posted regularly."}
                  </p>
                </Card>
              </div>
            )}
            {visibleJobs.map((job) => (
              <Card
                key={job.id}
                className="flex flex-col h-full border border-gray-200 bg-white hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedJob(job);
                  setDetailsOpen(true);
                }}
              >
                <div className="p-5 flex-grow">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-lg text-gray-900 truncate">
                        {job.job_title || job.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-sm font-medium text-gray-600 mt-1">
                        <Building2 className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">
                          {resolveJobCompanyName(job)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mt-4">
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      >
                        {(job.call_type || "call").replace("_", " ")}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-600"
                      >
                        {formatLabel(job.job_type || "Project")}
                      </Badge>
                    </div>

                    <div className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="truncate">
                        {formatLabel(job.location || "Remote")}
                      </span>
                      {job.budget && (
                        <>
                          <span>•</span>
                          <span className="font-medium text-gray-900">
                            {job.budget} {job.currency || "USD"}
                          </span>
                        </>
                      )}
                    </div>

                    <p className="text-sm text-gray-500 line-clamp-3">
                      {job.about_role || job.description}
                    </p>
                  </div>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3">
                  <Button
                    className="w-full bg-white text-gray-900 border border-gray-200 hover:bg-gray-50"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedJob(job);
                      setDetailsOpen(true);
                    }}
                  >
                    View Details
                  </Button>
                  <Button
                    className="w-full bg-black text-white hover:bg-gray-800"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedJob(job);
                      setApplyOpen(true);
                    }}
                  >
                    Apply Now
                  </Button>
                </div>
              </Card>
            ))}

            {/* Progressive auto-load sentinel (invisible, triggers IntersectionObserver) */}
            {!loading && hasMore && (
              <div
                ref={loadMoreSentinelRef}
                className="col-span-full flex justify-center py-4"
                aria-hidden
              >
                {revealingMore && (
                  <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
                )}
              </div>
            )}

            {/* All jobs shown indicator */}
            {!loading && jobs.length > 0 && !hasMore && (
              <div className="col-span-full text-center py-4">
                <p className="text-sm text-gray-400">
                  Showing all {jobs.length} job{jobs.length !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>
        </div>

        <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader className="pb-3">
              <DialogTitle className="text-lg font-semibold">
                Apply to {selectedJob?.title}
              </DialogTitle>
              <DialogDescription>
                Provide your details and resume to apply for this position.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-3">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Resume upload */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">
                      Upload resume (CV)
                    </label>
                    <input
                      ref={resumeInputRef}
                      id="job-resume-upload"
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) =>
                        handleResumeUpload(e.target.files?.[0] || null)
                      }
                    />
                    <div className="space-y-2">
                      {!resumeMeta?.name && (
                        <label
                          htmlFor="job-resume-upload"
                          className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:border-gray-400 cursor-pointer"
                        >
                          Browse resume
                        </label>
                      )}
                      {resumeUploading && (
                        <p className="text-xs text-gray-500">
                          Uploading resume...
                        </p>
                      )}
                      {!resumeUploading && resumeMeta?.name && (
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <span className="text-xs text-gray-700 truncate max-w-[180px]">
                            {resumeMeta.name}
                          </span>
                          <button
                            type="button"
                            onClick={handleRemoveResume}
                            className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex-shrink-0"
                            aria-label="Remove resume"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Comp card upload */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">
                      Upload comp card
                    </label>
                    <input
                      ref={compCardInputRef}
                      id="job-comp-card-upload"
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) =>
                        handleCompCardUpload(e.target.files?.[0] || null)
                      }
                    />
                    <div className="space-y-2">
                      {!compCardMeta?.name && (
                        <label
                          htmlFor="job-comp-card-upload"
                          className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:border-gray-400 cursor-pointer"
                        >
                          Browse comp card
                        </label>
                      )}
                      {compCardUploading && (
                        <p className="text-xs text-gray-500">
                          Uploading comp card...
                        </p>
                      )}
                      {!compCardUploading && compCardMeta?.name && (
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <span className="text-xs text-gray-700 truncate max-w-[180px]">
                            {compCardMeta.name}
                          </span>
                          <button
                            type="button"
                            onClick={handleRemoveCompCard}
                            className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex-shrink-0"
                            aria-label="Remove comp card"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">
                      Portfolio Link
                    </label>
                    <Input
                      placeholder="https://yourportfolio.com"
                      value={portfolioLink}
                      onChange={(e) => setPortfolioLink(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">
                      LinkedIn Profile
                    </label>
                    <Input
                      placeholder="https://linkedin.com/in/..."
                      value={linkedinLink}
                      onChange={(e) => setLinkedinLink(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900">
                    GitHub Profile
                  </label>
                  <Input
                    placeholder="https://github.com/..."
                    value={githubLink}
                    onChange={(e) => setGithubLink(e.target.value)}
                  />
                </div>
              </div>
              <Textarea
                value={applyMessage}
                onChange={(e) => setApplyMessage(e.target.value)}
                placeholder='Optional message, e.g. "Here is my resume..."'
                className="min-h-[160px]"
              />
            </div>
            <DialogFooter className="pt-5">
              <Button variant="outline" onClick={() => setApplyOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-black text-white"
                onClick={handleApply}
                disabled={applyLoading}
              >
                {applyLoading ? "Sending..." : "Send application"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-gray-100 pb-3">
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Job Details
            </DialogTitle>
            <DialogDescription>
              In-depth information about the selected job posting.
            </DialogDescription>
          </DialogHeader>
          {selectedJob ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="mt-2 text-2xl font-bold text-gray-900">
                    {selectedJob.job_title || selectedJob.title}
                  </h2>
                  <p className="text-base font-semibold text-gray-800 mt-1">
                    {resolveJobCompanyName(selectedJob)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50"
                  >
                    {(selectedJob.call_type || "call").replace("_", " ")}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100"
                  >
                    {selectedJob.status || "open"}
                  </Badge>
                  {selectedJob.category && (
                    <Badge
                      variant="outline"
                      className="bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100"
                    >
                      {String(selectedJob.category).replace("_", " ")}
                    </Badge>
                  )}
                </div>
              </div>

              <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap gap-2">
                  {(selectedJob.work_types || []).map((type: string) => (
                    <Badge
                      key={type}
                      variant="outline"
                      className="bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-50"
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  About the role
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-line">
                  {selectedJob.about_role || selectedJob.description || "—"}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600">
                  <div>
                    <span className="font-medium text-gray-900">Location:</span>{" "}
                    {formatLabel(selectedJob.location || "Remote")}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Job type:</span>{" "}
                    {formatLabel(selectedJob.job_type || "Project")}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Timeline:</span>{" "}
                    {selectedJob.start_date || "—"}
                    {selectedJob.end_date ? ` → ${selectedJob.end_date}` : ""}
                  </div>
                  {selectedJob.goals && selectedJob.goals.length > 0 && (
                    <div className="md:col-span-2">
                      <span className="font-medium text-gray-900">Goals:</span>{" "}
                      {selectedJob.goals.join(", ")}
                    </div>
                  )}
                  {selectedJob.deliverables && (
                    <div>
                      <span className="font-medium text-gray-900">
                        Deliverables:
                      </span>{" "}
                      {selectedJob.deliverables}
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900">
                  Talent Requirements
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(selectedJob.talent_types || []).map((type: string) => (
                    <Badge
                      key={type}
                      variant="outline"
                      className="bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-50"
                    >
                      {type}
                    </Badge>
                  ))}
                  {(selectedJob.required_skills || []).map((skill: string) => (
                    <Badge
                      key={skill}
                      variant="outline"
                      className="bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-50"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
                <div className="text-sm text-gray-600">
                  {selectedJob.region && (
                    <span className="mr-3">
                      <span className="font-medium text-gray-900">Region:</span>{" "}
                      {selectedJob.region}
                    </span>
                  )}
                  {selectedJob.language && (
                    <span>
                      <span className="font-medium text-gray-900">
                        Language:
                      </span>{" "}
                      {selectedJob.language}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium text-gray-900">
                    Licensing required:
                  </span>{" "}
                  {selectedJob.needs_licensing ? "Yes" : "No"}
                </div>
              </section>

              {selectedJob.needs_licensing && (
                <section className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-5">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Licensing Details
                  </h3>
                  <div className="text-sm text-gray-600">
                    {selectedJob.usage_type && (
                      <span className="mr-3">
                        <span className="font-medium text-gray-900">
                          Usage:
                        </span>{" "}
                        {selectedJob.usage_type}
                      </span>
                    )}
                    {selectedJob.license_duration && (
                      <span className="mr-3">
                        <span className="font-medium text-gray-900">
                          Duration:
                        </span>{" "}
                        {String(selectedJob.license_duration).replace(
                          /_/g,
                          " ",
                        )}
                      </span>
                    )}
                    {selectedJob.territories && (
                      <span>
                        <span className="font-medium text-gray-900">
                          Territories:
                        </span>{" "}
                        {selectedJob.territories}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="mr-3">
                      <span className="font-medium text-gray-900">
                        Exclusivity:
                      </span>{" "}
                      {selectedJob.exclusivity ? "Yes" : "No"}
                    </span>
                    <span>
                      <span className="font-medium text-gray-900">
                        Royalty option:
                      </span>{" "}
                      {selectedJob.royalty_option ? "Yes" : "No"}
                    </span>
                  </div>
                </section>
              )}

              <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900">
                  Budget & Compensation
                </h3>
                <div className="text-sm text-gray-600">
                  <span className="font-medium text-gray-900">Budget:</span>{" "}
                  {selectedJob.budget
                    ? `${selectedJob.budget} ${selectedJob.currency || "USD"}`
                    : "Not specified"}
                </div>
                {selectedJob.payment_type && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">
                      Payment type:
                    </span>{" "}
                    {selectedJob.payment_type}
                  </div>
                )}
              </section>

              {(!selectedJob.confidential || selectedJob.is_invited_viewer) && (
                <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Collaboration Preferences
                  </h3>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">
                      Work with agency:
                    </span>{" "}
                    {formatYesNo(selectedJob.work_with_agency)}
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">
                      Invite creator:
                    </span>{" "}
                    {formatYesNo(selectedJob.invite_creator)}
                  </div>
                  {Array.isArray(selectedJob.invited_agencies) &&
                    selectedJob.invited_agencies.length > 0 && (
                      <div className="pt-1">
                        <p className="text-xs font-semibold text-gray-700 mb-2">
                          Invited agencies
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedJob.invited_agencies.map(
                            (agency: any, idx: number) => (
                              <div
                                key={`${agency?.id || idx}`}
                                className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-gray-700"
                              >
                                {agency?.logo_url ? (
                                  <img
                                    src={agency.logo_url}
                                    alt={agency?.agency_name || "Agency"}
                                    className="h-5 w-5 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="h-5 w-5 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-semibold text-gray-600">
                                    {String(
                                      agency?.agency_name ||
                                        agency?.display_name ||
                                        "A",
                                    )
                                      .trim()
                                      .slice(0, 1)
                                      .toUpperCase()}
                                  </div>
                                )}
                                <span>
                                  {agency?.display_name ||
                                    agency?.agency_name ||
                                    agency?.contact_name ||
                                    "Agency"}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                  {Array.isArray(selectedJob.invited_creators) &&
                    selectedJob.invited_creators.length > 0 && (
                      <div className="pt-1">
                        <p className="text-xs font-semibold text-gray-700 mb-2">
                          Invited creators
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedJob.invited_creators.map(
                            (creator: any, idx: number) => (
                              <div
                                key={`${creator?.id || idx}`}
                                className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-gray-700"
                              >
                                {creator?.profile_photo_url ? (
                                  <img
                                    src={creator.profile_photo_url}
                                    alt={creator?.full_name || "Creator"}
                                    className="h-5 w-5 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="h-5 w-5 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-semibold text-gray-600">
                                    {String(
                                      creator?.full_name ||
                                        creator?.display_name ||
                                        "C",
                                    )
                                      .trim()
                                      .slice(0, 1)
                                      .toUpperCase()}
                                  </div>
                                )}
                                <span>
                                  {creator?.full_name ||
                                    creator?.display_name ||
                                    "Creator"}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                </section>
              )}

              {Array.isArray(selectedJob.brand_assets) &&
                selectedJob.brand_assets.length > 0 &&
                (!selectedJob.confidential ||
                  selectedJob.is_invited_viewer) && (
                  <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Brand Assets
                      </h3>
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                        {selectedJob.brand_assets.length} Assets
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {selectedJob.brand_assets.map(
                        (asset: any, idx: number) => {
                          let url = String(resolveAssetUrl(asset) || "");
                          const assetName = String(asset?.name || "");
                          const isImage = /\.(png|jpe?g|gif|webp)$/i.test(
                            url || assetName,
                          );
                          if (isImage && !url && assetName) {
                            const safeName = assetName.replace(
                              /[^\w.\-]+/g,
                              "_",
                            );
                            url =
                              supabase.storage
                                .from("likelee-public")
                                .getPublicUrl(
                                  `job-assets/${selectedJob.brand_id}/${safeName}`,
                                ).data?.publicUrl || "";
                          }
                          return (
                            <div
                              key={`${url || asset?.name || idx}`}
                              className="group relative cursor-pointer border border-slate-200 rounded-lg overflow-hidden bg-slate-50 transition-all hover:ring-2 hover:ring-blue-500 hover:ring-offset-2"
                              onClick={() => {
                                if (isImage && url) setSelectedAssetIndex(idx);
                              }}
                            >
                              {isImage && url ? (
                                <>
                                  <img
                                    src={url}
                                    alt={asset?.name || "Brand asset"}
                                    className="h-28 w-full object-cover transition-transform duration-300 group-hover:scale-110"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                                    <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                                  </div>
                                </>
                              ) : (
                                <div className="h-28 flex flex-col items-center justify-center text-xs text-slate-500 bg-slate-50 text-center px-2 gap-1.5">
                                  <FileText className="w-5 h-5 text-slate-300" />
                                  <span className="truncate w-full font-medium">
                                    {asset?.name || "File"}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        },
                      )}
                    </div>
                  </section>
                )}

              <Dialog
                open={selectedAssetIndex !== null}
                onOpenChange={(open) => !open && setSelectedAssetIndex(null)}
              >
                <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[95vh] p-0 overflow-hidden bg-white border-none shadow-2xl rounded-2xl flex flex-col">
                  <DialogHeader className="sr-only">
                    <DialogTitle>
                      Brand Asset{" "}
                      {selectedAssetIndex !== null
                        ? selectedAssetIndex + 1
                        : ""}
                    </DialogTitle>
                    <DialogDescription>
                      View brand asset reference image in detail.
                    </DialogDescription>
                  </DialogHeader>

                  {selectedAssetIndex !== null &&
                    Array.isArray(selectedJob?.brand_assets) &&
                    selectedJob.brand_assets[selectedAssetIndex] && (
                      <div className="relative w-full h-full flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
                          <h3 className="text-base font-bold text-gray-900">
                            Brand Asset {selectedAssetIndex + 1} of{" "}
                            {selectedJob.brand_assets.length}
                          </h3>
                        </div>

                        {/* Image Container */}
                        <div className="flex-1 overflow-auto bg-slate-50 flex items-center justify-center p-4 min-h-[400px]">
                          {(() => {
                            const asset =
                              selectedJob.brand_assets[selectedAssetIndex];
                            let url = String(resolveAssetUrl(asset) || "");
                            const assetName = String(asset?.name || "");
                            if (!url && assetName) {
                              const safeName = assetName.replace(
                                /[^\w.\-]+/g,
                                "_",
                              );
                              url =
                                supabase.storage
                                  .from("likelee-public")
                                  .getPublicUrl(
                                    `job-assets/${selectedJob.brand_id}/${safeName}`,
                                  ).data?.publicUrl || "";
                            }

                            return (
                              <img
                                src={url}
                                alt={assetName}
                                className="max-w-full max-h-[60vh] object-contain shadow-lg rounded-lg"
                              />
                            );
                          })()}
                        </div>

                        {/* Footer Navigation */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between">
                          <Button
                            variant="outline"
                            className="border-slate-200 text-slate-700 font-medium px-6 py-2 h-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAssetIndex((prev) => {
                                const assets = selectedJob?.brand_assets;
                                if (
                                  !Array.isArray(assets) ||
                                  assets.length === 0
                                )
                                  return null;
                                return prev !== null && prev > 0
                                  ? prev - 1
                                  : assets.length - 1;
                              });
                            }}
                          >
                            Previous
                          </Button>

                          <div className="text-slate-400 text-sm font-medium">
                            {selectedAssetIndex + 1} /{" "}
                            {selectedJob.brand_assets.length}
                          </div>

                          <Button
                            variant="outline"
                            className="border-slate-200 text-slate-700 font-medium px-6 py-2 h-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAssetIndex((prev) => {
                                const assets = selectedJob?.brand_assets;
                                if (
                                  !Array.isArray(assets) ||
                                  assets.length === 0
                                )
                                  return null;
                                return prev !== null && prev < assets.length - 1
                                  ? prev + 1
                                  : 0;
                              });
                            }}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <div className="text-sm text-gray-600">Select a job to view.</div>
          )}
          <DialogFooter className="mt-6 border-t border-gray-100 pt-4">
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
            {selectedJob && (
              <Button
                className="bg-black text-white"
                onClick={() => {
                  setDetailsOpen(false);
                  setApplyOpen(true);
                }}
              >
                Apply
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
