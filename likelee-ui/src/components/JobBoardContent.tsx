import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Search,
  Filter,
  MapPin,
  Clock,
  DollarSign,
  Briefcase,
  Building2,
  ExternalLink,
  Loader2,
  BookmarkCheck,
  Bookmark,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";

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

export default function JobBoardContent() {
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
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedJobTypes, setSelectedJobTypes] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("recent");
  const [expandingJobId, setExpandingJobId] = useState(null);
  const [enhancedJobs, setEnhancedJobs] = useState(new Set());
  const jobDetailsRef = useRef(null);

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

    const isCreativeAI =
      combined.includes("ai video") ||
      combined.includes("ai film") ||
      combined.includes("video") ||
      combined.includes("creative") ||
      combined.includes("ai content");

    if (
      isCreativeAI &&
      (combined.includes("software engineer") ||
        combined.includes("data scientist") ||
        combined.includes("developer") ||
        combined.includes("programmer") ||
        combined.includes("prompt engineer"))
    ) {
      categories.push("Technical");
    }

    let jobType = "Full-time";
    if (combined.includes("freelance") || contractType.includes("freelance")) {
      jobType = "Freelance";
    } else if (
      combined.includes("contract") ||
      contractType.includes("contract")
    ) {
      jobType = "Contract";
    } else if (combined.includes("gig") || combined.includes("project-based")) {
      jobType = "Gig";
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
      if (
        (error.response?.status === 429 || error.response?.status === 500) &&
        retries < 3
      ) {
        const delay = Math.pow(2, retries + 2) * 2000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return expandJobDescription(job, retries + 1);
      }
      return job;
    }
  };

  const handleJobClick = async (job) => {
    setSelectedJob(job);
    setShowMobileDetails(true);

    if (job.expanded_description || enhancedJobs.has(job.id)) {
      const enhancedJob = jobs.find((j) => j.id === job.id);
      if (enhancedJob) setSelectedJob(enhancedJob);
      return;
    }

    const wordCount = job.description?.split(" ").length || 0;
    if (wordCount < 300) {
      setExpandingJobId(job.id);
      try {
        const expandedJob = await expandJobDescription(job);
        setSelectedJob(expandedJob);
      } catch (error) {
        console.error("Failed to enhance job description:", error);
      } finally {
        setExpandingJobId(null);
      }
    }
  };

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    setSelectedJob(null);
    setShowMobileDetails(false);
    setEnhancedJobs(new Set());

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

      // Filter out jobs older than 1 month AND jobs with "engineer" in title/description
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const allJobs = [...joobleJobs, ...adzunaJobs].filter((job) => {
        // Filter out old jobs
        if (job.created) {
          const jobDate = new Date(job.created);
          if (jobDate < oneMonthAgo) return false;
        }

        // Filter out jobs with "engineer" or "engineering" in title or description
        const title = job.title?.toLowerCase() || "";
        const description = job.description?.toLowerCase() || "";

        if (
          title.includes("engineer") ||
          title.includes("engineering") ||
          description.includes("engineer") ||
          description.includes("engineering")
        ) {
          return false;
        }

        return true;
      });

      if (allJobs.length === 0) {
        setError("No jobs found. Try different search terms or filters.");
      }

      setJobs(allJobs);
      setTotalCount(allJobs.length);

      if (allJobs.length > 0) {
        if (window.innerWidth >= 1024) {
          handleJobClick(allJobs[0]);
          setShowMobileDetails(false);
        } else {
          setSelectedJob(allJobs[0]);
          setShowMobileDetails(false);
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
      return true;
    });

    // Sort by most recent by default
    if (sortBy === "recent") {
      filtered = filtered.sort(
        (a, b) => new Date(b.created) - new Date(a.created),
      );
    } else if (sortBy === "oldest") {
      filtered = filtered.sort(
        (a, b) => new Date(a.created) - new Date(b.created),
      );
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
      alert("Failed to save job. Please try again.");
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
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="border-b-2 border-gray-200 bg-white rounded-none">
        <div className="px-6 py-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Job Discovery Hub
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
                className="pl-10 h-12 border-2 border-gray-300 rounded-none"
              />
            </div>

            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-full lg:w-48 h-12 border-2 border-gray-300 rounded-none">
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
              <SelectTrigger className="w-full lg:w-56 h-12 border-2 border-gray-300 rounded-none">
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
              className="h-12 px-6 border-2 border-gray-300 rounded-none"
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
              className="h-12 px-8 bg-[#32C8D1] hover:bg-[#2AB8C1] text-white rounded-none"
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
            <Card className="mt-4 p-6 border-2 border-gray-200 bg-gray-50 rounded-none">
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

      {/* Job Listings */}
      <div className="px-6">
        {error && (
          <Card className="p-8 border-2 border-red-300 bg-red-50 mb-6 rounded-none">
            <p className="text-red-700 font-medium">{error}</p>
            <Button onClick={fetchJobs} className="mt-4 rounded-none">
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
          <Card className="p-12 border-2 border-gray-200 bg-gray-50 text-center rounded-none">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              No opportunities found
            </h3>
            <p className="text-lg text-gray-600 mb-6">
              Try adjusting your filters or search query.
            </p>
            <Button
              onClick={clearFilters}
              variant="outline"
              className="rounded-none"
            >
              Clear Filters
            </Button>
          </Card>
        )}

        {!loading && filteredJobs.length > 0 && (
          <div className="grid lg:grid-cols-[400px_1fr] gap-6 items-start">
            {/* Mobile Full Screen Details */}
            {showMobileDetails && selectedJob && (
              <div className="fixed inset-0 bg-white z-50 lg:hidden overflow-y-auto">
                <div className="sticky top-0 bg-white border-b-2 border-gray-200 p-4 flex items-center gap-4">
                  <Button
                    onClick={() => setShowMobileDetails(false)}
                    variant="ghost"
                    className="p-2 rounded-none"
                  >
                    <ArrowLeft className="w-6 h-6" />
                  </Button>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Job Details
                  </h2>
                </div>

                <div className="p-6">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {selectedJob.title}
                  </h1>
                  <div className="flex items-center gap-2 text-lg text-gray-700 mb-4">
                    <Building2 className="w-5 h-5" />
                    <span className="font-medium">{selectedJob.company}</span>
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

                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-6 pb-6 border-b-2 border-gray-200">
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

                  <div className="flex gap-3 sticky bottom-0 bg-white py-4 border-t-2 border-gray-200">
                    <Button
                      onClick={() =>
                        window.open(selectedJob.redirect_url, "_blank")
                      }
                      className="flex-1 h-12 bg-[#F7B750] hover:bg-[#E6A640] text-white rounded-none"
                    >
                      Apply Now
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                    <Button
                      onClick={() => handleSaveJob(selectedJob)}
                      variant="outline"
                      className="h-12 px-6 border-2 border-gray-300 rounded-none"
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

            {/* Left Column: Job List */}
            <div
              className={`space-y-3 lg:max-h-[calc(100vh-240px)] lg:overflow-y-auto lg:pr-2 ${showMobileDetails ? "hidden" : "block"} lg:block`}
            >
              {filteredJobs.map((job) => (
                <Card
                  key={job.id}
                  onClick={() => handleJobClick(job)}
                  className={`p-3 lg:p-5 border-2 cursor-pointer transition-all hover:shadow-md rounded-none ${
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

            {/* Right Column: Job Details - DESKTOP */}
            <div className="hidden lg:block">
              <div
                ref={jobDetailsRef}
                className="sticky top-32"
                style={{ height: "calc(100vh - 160px)" }}
              >
                {selectedJob ? (
                  <Card className="border-2 border-gray-300 bg-white h-full overflow-y-auto rounded-none">
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
                            className="h-11 px-6 bg-[#F7B750] hover:bg-[#E6A640] text-white rounded-none"
                          >
                            Apply Now
                            <ExternalLink className="w-4 h-4 ml-2" />
                          </Button>
                          <button
                            onClick={() => handleSaveJob(selectedJob)}
                            className="p-3 hover:bg-gray-100 rounded-full transition-colors border-2 border-gray-300"
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

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-8 pb-6 border-b-2 border-gray-200">
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
                  <Card className="border-2 border-gray-200 bg-gray-50 h-full flex items-center justify-center rounded-none">
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
    </div>
  );
}
