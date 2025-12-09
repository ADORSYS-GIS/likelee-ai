import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  MapPin,
  DollarSign,
  Clock,
  Briefcase,
  Search,
  Filter,
  Loader2,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  X,
  Building2,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const categoryOptions = [
  "AI Video",
  "3D Design",
  "Post-Production",
  "Marketing",
  "Editor",
  "Creator",
  "Technical",
];
const jobTypeOptions = ["Full-time", "Contract", "Freelance", "Gig"];
const locationOptions = ["Remote", "Hybrid", "On-site"];
const sortOptions = [
  { value: "smart", label: "Smart Sort (AI Video Priority)" },
  { value: "recent", label: "Most Recent" },
  { value: "oldest", label: "Oldest First" },
];

export default function AITalentBoard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("us");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedJob, setSelectedJob] = useState(null);
  const [savedJobs, setSavedJobs] = useState(new Set());
  const [currentUser, setCurrentUser] = useState(null);
  const [showMobileDetails, setShowMobileDetails] = useState(false);

  // Filter states
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedJobTypes, setSelectedJobTypes] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [fullTimeSalary, setFullTimeSalary] = useState([0, 400000]);
  const [freelanceSalary, setFreelanceSalary] = useState([0, 20000]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("smart");
  const [expandingJobId, setExpandingJobId] = useState(null);
  const [enhancedJobs, setEnhancedJobs] = useState(new Set());
  const jobDetailsRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
    fetchJobs();
  }, []);

  const checkUser = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);

      const saved = await base44.entities.SavedJob.filter({
        user_email: user.email,
      });
      setSavedJobs(new Set(saved.map((j) => j.job_id)));
    } catch (err) {
      setCurrentUser(null);
    }
  };

  const categorizeJob = (job) => {
    const title = job.title?.toLowerCase() || "";
    const description = job.description?.toLowerCase() || "";
    const combined = title + " " + description;
    const contractType = job.contract_type?.toLowerCase() || "";

    const categories = [];

    const isCreativeAI =
      combined.includes("ai video") ||
      combined.includes("ai film") ||
      combined.includes("video") ||
      combined.includes("creative") ||
      combined.includes("ai content") ||
      combined.includes("ai campaign") ||
      combined.includes("ai marketing") ||
      combined.includes("generative ai") ||
      combined.includes("ai art") ||
      combined.includes("ai design");

    if (
      combined.includes("video") ||
      combined.includes("film") ||
      combined.includes("cinemat")
    ) {
      categories.push("AI Video");
    }
    if (
      combined.includes("3d") ||
      combined.includes("three dimensional") ||
      combined.includes("modeling")
    ) {
      categories.push("3D Design");
    }
    if (
      combined.includes("post-production") ||
      combined.includes("post production") ||
      combined.includes("editing") ||
      combined.includes("color grade")
    ) {
      categories.push("Post-Production");
    }
    if (
      combined.includes("marketing") ||
      combined.includes("campaign") ||
      combined.includes("brand")
    ) {
      categories.push("Marketing");
    }
    if (combined.includes("editor") || combined.includes("edit")) {
      categories.push("Editor");
    }
    if (
      combined.includes("creator") ||
      combined.includes("content creator") ||
      combined.includes("ugc")
    ) {
      categories.push("Creator");
    }

    if (
      isCreativeAI &&
      (combined.includes("software engineer") ||
        combined.includes("data scientist") ||
        combined.includes("data engineer") ||
        combined.includes("machine learning engineer") ||
        combined.includes("ml engineer") ||
        combined.includes("ai engineer") ||
        combined.includes("developer") ||
        combined.includes("programmer") ||
        combined.includes("prompt engineer") ||
        combined.includes("ai research") ||
        combined.includes("ai solutions architect"))
    ) {
      categories.push("Technical");
    }

    let jobType = "Full-time";

    if (
      combined.includes("freelance") ||
      combined.includes("freelancer") ||
      combined.includes("self-employed") ||
      contractType.includes("freelance")
    ) {
      jobType = "Freelance";
    } else if (
      combined.includes("contract") ||
      combined.includes("contractor") ||
      combined.includes("temporary") ||
      combined.includes("temp ") ||
      combined.includes(" temp") ||
      combined.includes("per diem") ||
      contractType.includes("contract")
    ) {
      jobType = "Contract";
    } else if (
      combined.includes("gig") ||
      combined.includes("project-based") ||
      combined.includes("project based") ||
      combined.includes("one-off") ||
      combined.includes("short-term") ||
      combined.includes("short term")
    ) {
      jobType = "Gig";
    } else if (
      combined.includes("part-time") ||
      combined.includes("part time") ||
      contractType.includes("part_time")
    ) {
      jobType = "Contract";
    }

    let locationType = "On-site";
    if (combined.includes("remote")) {
      locationType = "Remote";
    } else if (combined.includes("hybrid")) {
      locationType = "Hybrid";
    }

    return {
      ...job,
      detected_categories: categories,
      detected_job_type: jobType,
      detected_location_type: locationType,
    };
  };

  const getJoobleLocation = (code) => {
    const locations = {
      us: "United States",
      gb: "United Kingdom",
      ca: "Canada",
      au: "Australia",
      de: "Germany",
      fr: "France",
    };
    return locations[code] || "United States";
  };

  const expandJobDescription = async (job, retries = 0) => {
    if (job.expanded_description || enhancedJobs.has(job.id)) {
      return job;
    }

    try {
      const result = await base44.functions.invoke("expandJobDescription", {
        title: job.title,
        company: job.company,
        description: job.description,
        location: job.location,
        job_type: job.detected_job_type,
      });

      const updatedJob = {
        ...job,
        expanded_description: result.data.expanded_description,
        description: result.data.expanded_description,
      };

      setJobs((prevJobs) =>
        prevJobs.map((j) => (j.id === job.id ? updatedJob : j)),
      );

      setEnhancedJobs((prev) => new Set([...prev, job.id]));

      return updatedJob;
    } catch (error) {
      console.error("Error expanding description:", error);

      // If rate limited (429) or server error (500), retry with exponential backoff
      if (
        (error.response?.status === 429 || error.response?.status === 500) &&
        retries < 3
      ) {
        const delay = Math.pow(2, retries + 2) * 2000; // 8s, 16s, 32s
        console.log(
          `Error ${error.response?.status}. Retrying after ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return expandJobDescription(job, retries + 1);
      }

      // Don't throw - just return original job on error
      return job;
    }
  };

  // Background preloading: enhance jobs while user browses (VERY SLOW)
  useEffect(() => {
    if (jobs.length === 0) return;

    const preloadJobDescriptions = async () => {
      // Only enhance jobs that need it (less than 300 words)
      const jobsToEnhance = jobs.filter((job) => {
        const wordCount = job.description?.split(" ").length || 0;
        return (
          wordCount < 300 &&
          !job.expanded_description &&
          !enhancedJobs.has(job.id)
        );
      });

      if (jobsToEnhance.length === 0) return;

      // Only preload first 10 jobs maximum to avoid overwhelming the API
      const limitedJobs = jobsToEnhance.slice(0, 10);
      console.log(
        `Preloading ${limitedJobs.length} job descriptions (max 10 at a time)...`,
      );

      // Enhance jobs one at a time with VERY conservative delays
      for (let i = 0; i < limitedJobs.length; i++) {
        // Check if we should stop (component unmounted or jobs changed)
        // This check is a simple safeguard, more robust cancellation might involve AbortController
        // but for a simple loop, this helps.
        if (!limitedJobs[i]) break;

        await expandJobDescription(limitedJobs[i]);

        // MUCH longer delays between requests: 8 seconds minimum
        if (i + 1 < limitedJobs.length) {
          const delay = 8000; // Fixed 8 second delay
          console.log(`Waiting ${delay}ms before next job...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      console.log("Background preloading complete!");
    };

    // Start preloading after 5 seconds (longer initial delay)
    const timer = setTimeout(() => {
      preloadJobDescriptions();
    }, 5000);

    return () => clearTimeout(timer); // Cleanup timer if component unmounts
  }, [jobs.length]);

  const handleJobClick = async (job) => {
    // Set selected job immediately for responsive UI
    setSelectedJob(job);

    // Show mobile details view on mobile
    setShowMobileDetails(true);

    // If job description is already enhanced, we're done
    if (job.expanded_description || enhancedJobs.has(job.id)) {
      const enhancedJob = jobs.find((j) => j.id === job.id);
      if (enhancedJob) {
        setSelectedJob(enhancedJob);
      }
      return;
    }

    // Otherwise, check if description needs enhancement
    const wordCount = job.description?.split(" ").length || 0;
    if (wordCount < 300) {
      setExpandingJobId(job.id);

      try {
        const expandedJob = await expandJobDescription(job);
        setSelectedJob(expandedJob);
      } catch (error) {
        console.error("Failed to enhance job description:", error);
        // Keep original job if enhancement fails
      } finally {
        setExpandingJobId(null);
      }
    }
  };

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    setSelectedJob(null);
    setShowMobileDetails(false); // Hide mobile details view when fetching new jobs
    setEnhancedJobs(new Set()); // Reset enhanced jobs when new jobs are fetched

    try {
      const [joobleResponse, adzunaResponse] = await Promise.all([
        base44.functions
          .invoke("fetchJoobleJobs", {
            search: searchQuery || null,
            location: getJoobleLocation(locationFilter),
            page: 1,
          })
          .catch((err) => {
            console.error("Jooble error:", err);
            return { data: { jobs: [] } };
          }),
        base44.functions
          .invoke("fetchAdzunaJobs", {
            search: searchQuery || null,
            location: locationFilter,
            page: 1,
            results_per_page: 100,
          })
          .catch((err) => {
            console.error("Adzuna error:", err);
            return { data: { jobs: [] } };
          }),
      ]);

      const joobleJobs = (joobleResponse.data.jobs || []).map(categorizeJob);
      const adzunaJobs = (adzunaResponse.data.jobs || []).map(categorizeJob);

      const allJobs = [...joobleJobs, ...adzunaJobs];

      if (allJobs.length === 0) {
        setError("No jobs found. Try different search terms or filters.");
      }

      setJobs(allJobs);
      setTotalCount(allJobs.length);

      if (allJobs.length > 0) {
        // Automatically select the first job on desktop, but don't show mobile details
        if (window.innerWidth >= 1024) {
          // Equivalent to lg breakpoint
          handleJobClick(allJobs[0]);
          setShowMobileDetails(false); // Ensure it's false for desktop initial load
        } else {
          setSelectedJob(allJobs[0]); // Select but don't show details view yet on mobile
          setShowMobileDetails(false); // Ensure job list is visible
        }
      }
    } catch (err) {
      setError("Error loading jobs: " + err.message);
      console.error("Error fetching jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return "1 week ago";
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 60) return "1 month ago";
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const filterJobs = () => {
    let filtered = jobs.filter((job) => {
      if (selectedCategories.length > 0) {
        const hasCategory = selectedCategories.some((cat) =>
          job.detected_categories.includes(cat),
        );
        if (!hasCategory) return false;
      }

      if (selectedJobTypes.length > 0) {
        if (!selectedJobTypes.includes(job.detected_job_type)) return false;
      }

      if (selectedLocations.length > 0) {
        if (!selectedLocations.includes(job.detected_location_type))
          return false;
      }

      const hasSalaryInfo = job.salary_min || job.salary_max;

      if (hasSalaryInfo) {
        const avgSalary =
          (job.salary_min + job.salary_max) / 2 ||
          job.salary_min ||
          job.salary_max;

        if (job.detected_job_type === "Full-time") {
          if (fullTimeSalary[0] > 0 || fullTimeSalary[1] < 400000) {
            if (avgSalary < fullTimeSalary[0] || avgSalary > fullTimeSalary[1])
              return false;
          }
        } else {
          if (freelanceSalary[0] > 0 || freelanceSalary[1] < 20000) {
            if (
              avgSalary < freelanceSalary[0] ||
              avgSalary > freelanceSalary[1]
            )
              return false;
          }
        }
      }

      return true;
    });

    if (sortBy === "recent") {
      filtered = filtered.sort((a, b) => {
        return new Date(b.created) - new Date(a.created);
      });
    } else if (sortBy === "oldest") {
      filtered = filtered.sort((a, b) => {
        return new Date(a.created) - new Date(b.created);
      });
    } else if (sortBy === "smart") {
      filtered = filtered.sort((a, b) => {
        const aIsAIVideo = a.detected_categories.includes("AI Video");
        const bIsAIVideo = b.detected_categories.includes("AI Video");

        if (aIsAIVideo && !bIsAIVideo) return -1;
        if (!aIsAIVideo && bIsAIVideo) return 1;

        return new Date(b.created) - new Date(a.created);
      });
    }

    return filtered;
  };

  const filteredJobs = filterJobs();

  const handleSaveJob = async (job) => {
    if (!currentUser) {
      navigate(createPageUrl("CreatorSignup"));
      return;
    }

    try {
      if (savedJobs.has(job.id)) {
        const saved = await base44.entities.SavedJob.filter({
          user_email: currentUser.email,
          job_id: job.id,
        });
        if (saved.length > 0) {
          await base44.entities.SavedJob.delete(saved[0].id);
        }
        setSavedJobs((prev) => {
          const newSet = new Set(prev);
          newSet.delete(job.id);
          return newSet;
        });
      } else {
        await base44.entities.SavedJob.create({
          user_email: currentUser.email,
          job_id: job.id,
          job_title: job.title,
          company: job.company,
          job_data: job,
        });
        setSavedJobs((prev) => new Set([...prev, job.id]));
      }
    } catch (err) {
      console.error("Error saving job:", err);
      toast({ title: "Error", description: "Failed to save job. Please try again.", variant: "destructive" });
    }
  };

  const formatSalary = (min, max) => {
    if (min === null && max === null) return null;

    if (min && max && Math.abs(min - max) < 10) {
      return `$${Math.round(min).toLocaleString()}`;
    }

    if (min && max)
      return `$${Math.round(min).toLocaleString()} - $${Math.round(max).toLocaleString()}`;
    if (min) return `From $${Math.round(min).toLocaleString()}`;
    if (max) return `Up to $${Math.round(max).toLocaleString()}`;
    return null;
  };

  const getJobColor = (category) => {
    const colorMap = {
      "IT Jobs": "#32C8D1",
      "Creative & Design Jobs": "#F18B6A",
      "Marketing & PR Jobs": "#F7B750",
      "Media & Publishing Jobs": "#8B5CF6",
    };
    return colorMap[category] || "#6B7280";
  };

  const getCategoryColor = (category) => {
    const colorMap = {
      "AI Video": "bg-[#F18B6A] text-white",
      "3D Design": "bg-[#32C8D1] text-white",
      "Post-Production": "bg-purple-500 text-white",
      Marketing: "bg-[#F7B750] text-white",
      Editor: "bg-cyan-500 text-white",
      Creator: "bg-pink-500 text-white",
      Technical: "bg-slate-600 text-white",
    };
    return colorMap[category] || "bg-gray-100 text-gray-700";
  };

  const getJobTypeColor = (jobType) => {
    const colorMap = {
      "Full-time": "bg-[#32C8D1] text-white",
      Contract: "bg-[#F7B750] text-white",
      Freelance: "bg-[#F18B6A] text-white",
      Gig: "bg-purple-500 text-white",
    };
    return colorMap[jobType] || "bg-gray-100 text-gray-700";
  };

  const toggleCategory = (category) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  };

  const toggleJobType = (type) => {
    setSelectedJobTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const toggleLocation = (location) => {
    setSelectedLocations((prev) =>
      prev.includes(location)
        ? prev.filter((l) => l !== location)
        : [...prev, location],
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedJobTypes([]);
    setSelectedLocations([]);
    setFullTimeSalary([0, 400000]);
    setFreelanceSalary([0, 20000]);
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section */}
      <section className="px-6 pt-12 pb-8 bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Find Your Next
            <span className="block text-[#32C8D1]">
              Creative Job or Project
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
            Discover AI film, video, and campaign opportunities from brands and
            studios worldwide.
          </p>
        </div>
      </section>

      {/* Header with Filters */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Explore AI Jobs
          </h2>

          {/* Filter Bar */}
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search by title, skill, or company"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && fetchJobs()}
                className="pl-10 h-12 border border-gray-300"
              />
            </div>

            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-full lg:w-48 h-12 border border-gray-300">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <SelectValue placeholder="Location" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="us">United States</SelectItem>
                <SelectItem value="gb">United Kingdom</SelectItem>
                <SelectItem value="ca">Canada</SelectItem>
                <SelectItem value="au">Australia</SelectItem>
                <SelectItem value="de">Germany</SelectItem>
                <SelectItem value="fr">France</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full lg:w-56 h-12 border border-gray-300">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="h-12 px-6 border border-gray-300"
            >
              <Filter className="w-5 h-5 mr-2" />
              Filters
              {selectedCategories.length +
                selectedJobTypes.length +
                selectedLocations.length >
                0 && (
                <Badge className="ml-2 bg-[#32C8D1] text-white">
                  {selectedCategories.length +
                    selectedJobTypes.length +
                    selectedLocations.length}
                </Badge>
              )}
            </Button>

            <Button
              onClick={fetchJobs}
              disabled={loading}
              className="h-12 px-8 bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>

          {/* Filters Expansion */}
          {showFilters && (
            <Card className="mt-4 p-6 border border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                <Button
                  onClick={clearFilters}
                  variant="ghost"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Clear all
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-3 block">
                    Category / Role Type
                  </Label>
                  <div className="space-y-2">
                    {categoryOptions.map((category) => (
                      <div
                        key={category}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`category-${category}`}
                          checked={selectedCategories.includes(category)}
                          onCheckedChange={() => toggleCategory(category)}
                        />
                        <label
                          htmlFor={`category-${category}`}
                          className="text-sm text-gray-700 cursor-pointer flex-1"
                        >
                          {category}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-3 block">
                    Job Type
                  </Label>
                  <div className="space-y-2">
                    {jobTypeOptions.map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`jobtype-${type}`}
                          checked={selectedJobTypes.includes(type)}
                          onCheckedChange={() => toggleJobType(type)}
                        />
                        <label
                          htmlFor={`jobtype-${type}`}
                          className="text-sm text-gray-700 cursor-pointer flex-1"
                        >
                          {type}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-3 block">
                    Location Type
                  </Label>
                  <div className="space-y-2">
                    {locationOptions.map((location) => (
                      <div
                        key={location}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`location-${location}`}
                          checked={selectedLocations.includes(location)}
                          onCheckedChange={() => toggleLocation(location)}
                        />
                        <label
                          htmlFor={`location-${location}`}
                          className="text-sm text-gray-700 cursor-pointer flex-1"
                        >
                          {location}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Two Column Layout - LinkedIn Style */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {error && (
          <Card className="p-8 border border-red-300 bg-red-50 mb-6">
            <p className="text-red-700 font-medium">{error}</p>
            <Button onClick={fetchJobs} className="mt-4">
              Try Again
            </Button>
          </Card>
        )}

        {loading && (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-[#32C8D1]" />
          </div>
        )}

        {!loading && filteredJobs.length === 0 && !error && (
          <Card className="p-12 border border-gray-200 bg-gray-50 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              No opportunities found
            </h3>
            <p className="text-lg text-gray-600 mb-6">
              Try adjusting your filters or search query.
            </p>
            <Button onClick={clearFilters} variant="outline">
              Clear Filters
            </Button>
          </Card>
        )}

        {!loading && filteredJobs.length > 0 && (
          <div className="grid lg:grid-cols-[400px_1fr] gap-6 items-start">
            {/* Mobile: Full screen job details view */}
            {showMobileDetails && selectedJob && (
              <div className="fixed inset-0 bg-white z-50 lg:hidden overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center gap-4">
                  <Button
                    onClick={() => setShowMobileDetails(false)}
                    variant="ghost"
                    className="p-2"
                  >
                    <ArrowLeft className="w-6 h-6" />
                  </Button>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Job Details
                  </h2>
                </div>

                <div className="p-6">
                  <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      {selectedJob.title}
                    </h1>
                    <div className="flex items-center gap-2 text-lg text-gray-700 mb-4">
                      <Building2 className="w-5 h-5" />
                      <span className="font-medium">{selectedJob.company}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {selectedJob.detected_categories.map((cat) => (
                      <Badge
                        key={cat}
                        className={`${getCategoryColor(cat)} text-sm px-3 py-1`}
                      >
                        {cat}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-6 pb-6 border-b border-gray-200">
                    {formatSalary(
                      selectedJob.salary_min,
                      selectedJob.salary_max,
                    ) && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-[#F7B750]" />
                        <span className="font-medium">
                          {formatSalary(
                            selectedJob.salary_min,
                            selectedJob.salary_max,
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-[#F18B6A]" />
                      <span>{selectedJob.location}</span>
                    </div>
                    {selectedJob.detected_job_type && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-[#32C8D1]" />
                        <span>{selectedJob.detected_job_type}</span>
                      </div>
                    )}
                    {selectedJob.created && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <span>{getTimeAgo(selectedJob.created)}</span>
                      </div>
                    )}
                  </div>

                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      Job Description
                    </h3>
                    {expandingJobId === selectedJob.id ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-[#32C8D1] mr-3" />
                        <span className="text-gray-600">
                          Loading Job Description...
                        </span>
                      </div>
                    ) : (
                      <div
                        className="text-gray-700 leading-relaxed prose max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: selectedJob.description,
                        }}
                      />
                    )}
                  </div>

                  <div className="flex gap-3 sticky bottom-0 bg-white py-4 border-t border-gray-200">
                    <Button
                      onClick={() =>
                        window.open(selectedJob.redirect_url, "_blank")
                      }
                      className="flex-1 h-12 bg-[#F7B750] hover:bg-[#E6A640] text-white"
                    >
                      Apply Now
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                    <Button
                      onClick={() => handleSaveJob(selectedJob)}
                      variant="outline"
                      className="h-12 px-6"
                    >
                      {savedJobs.has(selectedJob.id) ? (
                        <BookmarkCheck className="w-5 h-5 text-[#F7B750]" />
                      ) : (
                        <Bookmark className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Left Column: Job List - Visible on mobile when showMobileDetails is false, scrollable on desktop */}
            <div
              className={`space-y-3 lg:max-h-[calc(100vh-240px)] lg:overflow-y-auto lg:pr-2 ${
                showMobileDetails ? "hidden" : "block"
              } lg:block`}
            >
              {filteredJobs.map((job) => (
                <Card
                  key={job.id}
                  onClick={() => handleJobClick(job)}
                  className={`p-3 lg:p-5 border cursor-pointer transition-all hover:shadow-md ${
                    selectedJob?.id === job.id
                      ? "border-[#32C8D1] bg-blue-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm lg:text-base font-semibold text-gray-900 mb-1 line-clamp-2">
                        {job.title}
                      </h3>
                      <p className="text-xs lg:text-sm text-gray-600 font-medium truncate">
                        {job.company}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveJob(job);
                      }}
                      className="p-1 lg:p-1.5 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                    >
                      {savedJobs.has(job.id) ? (
                        <BookmarkCheck className="w-4 h-4 lg:w-5 lg:h-5 text-[#F7B750]" />
                      ) : (
                        <Bookmark className="w-4 h-4 lg:w-5 lg:h-5 text-gray-400" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 lg:gap-3 text-xs lg:text-sm text-gray-600 mb-2 lg:mb-3">
                    <div className="flex items-center gap-1 min-w-0">
                      <MapPin className="w-3 h-3 lg:w-4 lg:h-4 flex-shrink-0" />
                      <span className="truncate">{job.location}</span>
                    </div>
                    {job.created && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Clock className="w-3 h-3 lg:w-4 lg:h-4" />
                        <span className="whitespace-nowrap">
                          {getTimeAgo(job.created)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 lg:gap-2">
                    {job.detected_categories.slice(0, 2).map((cat) => (
                      <Badge
                        key={cat}
                        className={`${getCategoryColor(cat)} text-[10px] lg:text-xs px-1.5 lg:px-2 py-0.5`}
                      >
                        {cat}
                      </Badge>
                    ))}
                    {job.detected_job_type && (
                      <Badge
                        className={`${getJobTypeColor(job.detected_job_type)} text-[10px] lg:text-xs px-1.5 lg:px-2 py-0.5`}
                      >
                        {job.detected_job_type}
                      </Badge>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {/* Right Column: Job Details - DESKTOP ONLY */}
            <div className="hidden lg:block">
              <div
                ref={jobDetailsRef}
                className="sticky top-32"
                style={{ height: "calc(100vh - 160px)" }}
              >
                {selectedJob ? (
                  <Card className="border border-gray-300 bg-white h-full overflow-y-auto">
                    <div className="p-8">
                      <div className="flex items-start justify-between gap-4 mb-6">
                        <div className="flex-1">
                          <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            {selectedJob.title}
                          </h2>
                          <div className="flex items-center gap-2 text-lg text-gray-700 mb-4">
                            <Building2 className="w-5 h-5" />
                            <span className="font-medium">
                              {selectedJob.company}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            onClick={() =>
                              window.open(selectedJob.redirect_url, "_blank")
                            }
                            className="h-11 px-6 bg-[#F7B750] hover:bg-[#E6A640] text-white"
                          >
                            Apply Now
                            <ExternalLink className="w-4 h-4 ml-2" />
                          </Button>
                          <button
                            onClick={() => handleSaveJob(selectedJob)}
                            className="p-3 hover:bg-gray-100 rounded-full transition-colors border border-gray-300"
                          >
                            {savedJobs.has(selectedJob.id) ? (
                              <BookmarkCheck className="w-5 h-5 text-[#F7B750]" />
                            ) : (
                              <Bookmark className="w-5 h-5 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-6">
                        {selectedJob.detected_categories.map((cat) => (
                          <Badge
                            key={cat}
                            className={`${getCategoryColor(cat)} px-3 py-1`}
                          >
                            {cat}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-8 pb-6 border-b border-gray-200">
                        {formatSalary(
                          selectedJob.salary_min,
                          selectedJob.salary_max,
                        ) && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-[#F7B750]" />
                            <span className="font-medium">
                              {formatSalary(
                                selectedJob.salary_min,
                                selectedJob.salary_max,
                              )}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-[#F18B6A]" />
                          <span>{selectedJob.location}</span>
                        </div>
                        {selectedJob.detected_job_type && (
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-[#32C8D1]" />
                            <span>{selectedJob.detected_job_type}</span>
                          </div>
                        )}
                        {selectedJob.created && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-gray-400" />
                            <span>{getTimeAgo(selectedJob.created)}</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-4">
                          Job Description
                        </h3>
                        {expandingJobId === selectedJob.id ? (
                          <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-[#32C8D1] mr-3" />
                            <span className="text-gray-600">
                              Loading Job Description...
                            </span>
                          </div>
                        ) : (
                          <div
                            className="text-gray-700 leading-relaxed prose max-w-none"
                            dangerouslySetInnerHTML={{
                              __html: selectedJob.description,
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Card className="border border-gray-200 bg-gray-50 h-full flex items-center justify-center">
                    <p className="text-gray-500 text-lg">
                      Select a job to view details
                    </p>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CTA */}
      <section className="px-6 py-16 bg-[#32C8D1] mt-12">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to join as AI Artists?
          </h2>
          <p className="text-lg text-white/90 mb-8">
            Sign up to access exclusive opportunities and build your portfolio
            with top brands.
          </p>
          <Button
            onClick={() => navigate(createPageUrl("CreatorSignup"))}
            className="h-14 px-10 text-lg font-medium bg-white hover:bg-gray-100 text-[#32C8D1]"
          >
            Join as AI Artists
          </Button>
        </div>
      </section>
    </div>
  );
}
