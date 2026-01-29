import React, { useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { scoutingService } from "@/services/scoutingService";
import { useAuth } from "../auth/AuthProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Plus,
  ArrowLeft,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Download,
  Copy,
  Eye,
  MoreHorizontal,
  RefreshCw,
  Upload,
  Trash2,
  Archive,
  ChevronDown,
  FilePenLine,
} from "lucide-react";
import { ScoutingTemplate, ScoutingOffer } from "@/types/scouting";

export default function ScoutingOffers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prospectId = searchParams.get("prospectId");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showSendOfferDialog, setShowSendOfferDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<ScoutingTemplate | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingOffers, setIsSyncingOffers] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [replacingTemplateId, setReplacingTemplateId] = useState<number | null>(
    null,
  );
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  // Builder state
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [builderToken, setBuilderToken] = useState<string>("");
  const [builderTemplateId, setBuilderTemplateId] = useState<number | null>(
    null,
  );
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [offerToArchive, setOfferToArchive] = useState<ScoutingOffer | null>(
    null,
  );

  // Archive filtering and permanent delete state
  const [filterMode, setFilterMode] = useState<"active" | "archived" | "all">(
    "active",
  );
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<ScoutingOffer | null>(
    null,
  );
  const [showDeleteTemplateDialog, setShowDeleteTemplateDialog] =
    useState(false);
  const [templateToDelete, setTemplateToDelete] =
    useState<ScoutingTemplate | null>(null);
  const [offersToDeleteCount, setOffersToDeleteCount] = useState(0);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"templates" | "submissions">(
    "templates",
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const ALL_STATUSES = ["completed", "declined", "opened", "sent"];

  const handleStatusFilterChange = (status: string) => {
    setStatusFilters((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status],
    );
  };

  // Load DocuSeal builder script
  React.useEffect(() => {
    if (showTemplateBuilder) {
      const script = document.createElement("script");
      script.src = "https://cdn.docuseal.com/js/builder.js";
      script.async = true;
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    }
  }, [showTemplateBuilder]);

  // Fetch agency templates
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["templates", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const agencyId = await scoutingService.getUserAgencyId();
      if (!agencyId) return [];
      return scoutingService.getTemplates(agencyId);
    },
    enabled: !!user,
  });

  // Welcome modal logic
  React.useEffect(() => {
    if (templates && templates.length === 0 && !localStorage.getItem("template_welcome_shown")) {
      setShowWelcomeModal(true);
    }
  }, [templates]);

  // Fetch agency offers
  const { data: offers, isLoading: offersLoading } = useQuery({
    queryKey: ["offers", user?.id, filterMode],
    queryFn: async () => {
      if (!user) return [];
      const agencyId = await scoutingService.getUserAgencyId();
      if (!agencyId) return [];
      return scoutingService.getOffers(agencyId, filterMode);
    },
    enabled: !!user,
    refetchInterval: 5000, // Poll every 5 seconds to sync with webhook updates
  });

  const filteredOffers = React.useMemo(() => {
    if (!offers) return [];
    return offers.filter((offer) => {
      const searchMatch = searchQuery
        ? offer.template?.name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        offer.prospect?.full_name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        offer.prospect?.email
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase())
        : true;

      const statusMatch =
        statusFilters.length > 0
          ? statusFilters.some((filter) => {
            if (filter === "completed")
              return ["completed", "signed"].includes(offer.status);
            if (filter === "declined")
              return ["declined", "voided"].includes(offer.status);
            return offer.status === filter;
          })
          : true;

      return searchMatch && statusMatch;
    });
  }, [offers, searchQuery, statusFilters]);

  // Fetch prospect details
  const { data: prospect, isLoading: prospectLoading } = useQuery({
    queryKey: ["prospect", prospectId],
    queryFn: async () => {
      if (!prospectId) return null;
      return scoutingService.getProspect(prospectId);
    },
    enabled: !!prospectId,
  });

  const handleReplacePdf = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !replacingTemplateId) return;

    setIsReplacing(true);
    try {
      await scoutingService.updateTemplateFromPdf(replacingTemplateId, file);

      toast({
        title: "Template Updated",
        description: "The contract document has been replaced successfully.",
      });

      queryClient.invalidateQueries({ queryKey: ["templates"] });
    } catch (error) {
      console.error("Error replacing PDF:", error);
      toast({
        title: "Update Failed",
        description: "Failed to replace the contract document.",
        variant: "destructive",
      });
    } finally {
      setIsReplacing(false);
      setReplacingTemplateId(null);
      if (replaceFileInputRef.current) replaceFileInputRef.current.value = "";
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const agencyId = await scoutingService.getUserAgencyId();
      if (!agencyId) throw new Error("Agency not found");

      // 1. Upload PDF and create template
      const template = await scoutingService.createTemplateFromPdf(
        agencyId,
        file,
      );

      // 2. Get builder token
      const token = await scoutingService.getBuilderToken(
        agencyId,
        template.id,
      );

      // 3. Open builder with new template
      setBuilderToken(token);
      setBuilderTemplateId(template.id); // This ID is the DocuSeal ID
      setShowTemplateBuilder(true);

      toast({
        title: "Template Created",
        description: "PDF uploaded successfully. You can now add fields.",
      });

      queryClient.invalidateQueries({ queryKey: ["templates"] });
    } catch (error) {
      console.error("Error uploading template:", error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSyncOffers = async () => {
    setIsSyncingOffers(true);
    try {
      const pendingOffers =
        offers?.filter((o) => o.status === "sent" || o.status === "pending") ||
        [];
      if (pendingOffers.length === 0) {
        toast({
          title: "No pending offers",
          description: "All offers are already up to date.",
        });
        return;
      }

      await Promise.all(
        pendingOffers.map((o) => scoutingService.refreshOfferStatus(o.id)),
      );

      toast({
        title: "Offers Synced",
        description: "Successfully updated offer statuses.",
      });

      queryClient.invalidateQueries({ queryKey: ["offers"] });
    } catch (error) {
      console.error("Error syncing offers:", error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync offers. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSyncingOffers(false);
    }
  };

  const handleSyncTemplates = async (delayMs: number = 0) => {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    setIsSyncing(true);
    try {
      const agencyId = await scoutingService.getUserAgencyId();
      if (!agencyId) throw new Error("Agency not found");

      console.log("Syncing templates from DocuSeal...");
      await scoutingService.syncTemplates(agencyId);

      toast({
        title: "Templates Synced",
        description: "Successfully synced templates from DocuSeal.",
      });

      queryClient.invalidateQueries({ queryKey: ["templates"] });
    } catch (error) {
      console.error("Error syncing templates:", error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync templates. Please check your connection.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const [isSendingOffer, setIsSendingOffer] = useState(false);

  const handleSendOffer = async () => {
    if (!selectedTemplate || !prospectId) return;

    setIsSendingOffer(true);
    try {
      const agencyId = await scoutingService.getUserAgencyId();
      if (!agencyId) throw new Error("Agency not found");

      await scoutingService.createOffer({
        prospect_id: prospectId,
        agency_id: agencyId,
        template_id: selectedTemplate.id,
      });

      toast({
        title: "Offer Sent",
        description: "The offer has been sent to the prospect.",
      });

      queryClient.invalidateQueries({ queryKey: ["offers"] });
      setShowSendOfferDialog(false);
    } catch (error: any) {
      console.error("Error sending offer:", error);
      const msg = error?.message || "";
      toast({
        title: "Error",
        description: msg.includes("Template does not contain fields")
          ? "This template has no DocuSeal fields. Open the builder and add at least one role/signature field, then try again."
          : "Failed to send offer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingOffer(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "signed":
        return "bg-green-100 text-green-700 border-green-200";
      case "declined":
      case "voided":
        return "bg-red-100 text-red-700 border-red-200";
      case "opened":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "sent":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <Button
            variant="outline"
            onClick={() => navigate("/AgencyDashboard?tab=scouting")}
            className="flex items-center gap-2 bg-white shadow-sm mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Offer Management
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage your contract templates and track submissions
              </p>
            </div>
            {prospect && (
              <div className="flex items-center gap-4 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-lg">
                <div className="p-2 bg-indigo-100 rounded-full">
                  <Send className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-indigo-900 uppercase tracking-wider">
                    Recipient
                  </p>
                  <p className="text-sm font-medium text-indigo-700">
                    {prospect.full_name}{" "}
                    <span className="text-indigo-400 font-normal">
                      ({prospect.email})
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("templates")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "templates"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Templates
            </button>
            <button
              onClick={() => setActiveTab("submissions")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "submissions"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Submissions
            </button>
          </nav>
        </div>

        {/* Templates Section */}
        {activeTab === "templates" && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Templates</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => handleSyncTemplates()}
                disabled={isSyncing}
                className="bg-white hover:bg-gray-50 text-gray-700 font-medium shadow-sm"
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${isSyncing ? "animate-spin" : ""}`}
                />
                Sync Templates
              </Button>

              <input
                type="file"
                accept=".pdf,.docx,.doc"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <Button
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                disabled={isUploading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm"
              >
                {isUploading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Upload Contract
              </Button>
              <input
                type="file"
                accept=".pdf,.docx,.doc"
                className="hidden"
                ref={replaceFileInputRef}
                onChange={handleReplacePdf}
              />
            </div>
          </div>



      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templatesLoading
          ? [1, 2].map((i) => (
            <div
              key={i}
              className="h-48 bg-gray-100 rounded-xl animate-pulse"
            />
          ))
          : templates?.map((template) => (
            <button
              key={template.id}
              className="group bg-indigo-50 rounded-xl border border-indigo-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col text-left"
              onClick={async () => {
                try {
                  const agencyId =
                    await scoutingService.getUserAgencyId();
                  if (!agencyId) return;
                  const token = await scoutingService.getBuilderToken(
                    agencyId,
                    template.docuseal_template_id,
                  );
                  setBuilderToken(token);
                  setBuilderTemplateId(template.docuseal_template_id);
                  setShowTemplateBuilder(true);
                } catch (e) {
                  console.error(e);
                }
              }}
            >
              <div className="h-32 bg-indigo-100 border-b border-indigo-200 flex items-center justify-center relative">
                <FilePenLine className="w-12 h-12 text-indigo-300" />
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 bg-white/80 backdrop-blur-sm"
                      >
                        <MoreHorizontal className="w-4 h-4 text-gray-600" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setTemplateToDelete(template);
                          const count = offers?.filter(o => o.template_id === template.id).length || 0;
                          setOffersToDeleteCount(count);
                          setShowDeleteTemplateDialog(true);
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-semibold text-gray-900 truncate">
                  {template.name}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Created{" "}
                  {new Date(template.created_at).toLocaleDateString()}
                </p>
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-8"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setShowSendOfferDialog(true);
                    }}
                    disabled={!prospectId}
                  >
                    <Send className="w-3 h-3 mr-1.5" />
                    Use Template
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-8 px-2"
                    title="Replace PDF"
                    disabled={isReplacing}
                    onClick={() => {
                      setReplacingTemplateId(
                        template.docuseal_template_id,
                      );
                      replaceFileInputRef.current?.click();
                    }}
                  >
                    <Upload className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-8 px-2"
                    onClick={(e) => e.stopPropagation()} // Let the parent button handle the click
                  >
                    <Eye className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </button>
          ))}

        {/* Empty State Placeholder */}
        {(!templates || templates.length === 0) && !templatesLoading && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900">
              No templates yet
            </h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Upload a PDF contract to create your first template.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                variant="outline"
                size="sm"
                disabled={isUploading}
              >
                <Upload className="w-3 h-3 mr-2" />
                Upload PDF
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
        )}

        {/* Submissions Section */ }
  {activeTab === "submissions" && (
  <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
    <div className="p-6 border-b border-gray-200 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gray-100 rounded-lg">
          <FileText className="w-5 h-5 text-gray-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Submissions</h2>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search submissions..."
            className="pl-9 h-9 w-64 bg-gray-50 border-gray-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 bg-white hover:bg-gray-50 text-gray-700 font-medium shadow-sm"
            >
              <Archive className="w-4 h-4 mr-2" />
              {filterMode === "active" && "Active"}
              {filterMode === "archived" && "Archived"}
              {filterMode === "all" && "All"}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => setFilterMode("active")}
              className={
                filterMode === "active"
                  ? "bg-indigo-50 text-indigo-700"
                  : ""
              }
            >
              <div className="flex items-center justify-between w-full">
                <span>Active</span>
                {filterMode === "active" && (
                  <CheckCircle2 className="w-4 h-4" />
                )}
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setFilterMode("archived")}
              className={
                filterMode === "archived"
                  ? "bg-indigo-50 text-indigo-700"
                  : ""
              }
            >
              <div className="flex items-center justify-between w-full">
                <span>Archived</span>
                {filterMode === "archived" && (
                  <CheckCircle2 className="w-4 h-4" />
                )}
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setFilterMode("all")}
              className={
                filterMode === "all" ? "bg-indigo-50 text-indigo-700" : ""
              }
            >
              <div className="flex items-center justify-between w-full">
                <span>All</span>
                {filterMode === "all" && (
                  <CheckCircle2 className="w-4 h-4" />
                )}
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 bg-white hover:bg-gray-50 text-gray-700 font-medium shadow-sm"
            >
              <Filter className="w-4 h-4 mr-2" />
              Status
              {statusFilters.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs">
                  {statusFilters.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ALL_STATUSES.map((status) => (
              <DropdownMenuCheckboxItem
                key={status}
                checked={statusFilters.includes(status)}
                onCheckedChange={() => handleStatusFilterChange(status)}
                className="capitalize"
              >
                {status}
              </DropdownMenuCheckboxItem>
            ))}
            {statusFilters.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setStatusFilters([])}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  Clear Filters
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="sm"
          onClick={handleSyncOffers}
          disabled={isSyncingOffers}
          className="h-9 bg-white hover:bg-gray-50 text-gray-700 font-medium shadow-sm"
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isSyncingOffers ? "animate-spin" : ""}`}
          />
          Sync Status
        </Button>
      </div>
    </div>

    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 w-1/3">Document Name</th>
            <th className="px-6 py-3">Status</th>
            <th className="px-6 py-3">Recipient</th>
            <th className="px-6 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {offersLoading ? (
            <tr>
              <td
                colSpan={4}
                className="px-6 py-8 text-center text-gray-500"
              >
                Loading submissions...
              </td>
            </tr>
          ) : !offers || offers.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="px-6 py-12 text-center text-gray-500"
              >
                No submissions found
              </td>
            </tr>
          ) : (
            filteredOffers.map((offer: any) => (
              <tr
                key={offer.id}
                className="hover:bg-gray-50/50 transition-colors group"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded text-blue-600">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {offer.document_name ||
                          offer.template?.name ||
                          "Untitled Document"}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(offer.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge
                    className={`uppercase text-[10px] tracking-wider font-bold px-2 py-0.5 border-0 ${getStatusColor(offer.status)}`}
                  >
                    {offer.status}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-gray-900 font-medium">
                      {offer.prospect?.full_name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {offer.prospect?.email}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 transition-opacity">
                    {(offer.status === "completed" ||
                      offer.status === "signed") && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100"
                          onClick={() =>
                            window.open(offer.signed_document_url, "_blank")
                          }
                        >
                          <Download className="w-3 h-3 mr-1.5" />
                          Download
                        </Button>
                      )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={async () => {
                        const direct =
                          offer.signing_url &&
                            offer.signing_url.trim() !== ""
                            ? offer.signing_url
                            : undefined;
                        if (direct) {
                          window.location.href = direct;
                          return;
                        }
                        try {
                          const updated = await scoutingService.getOffer(
                            offer.id,
                          );
                          const link =
                            (updated.signing_url &&
                              updated.signing_url.trim() !== ""
                              ? updated.signing_url
                              : undefined) ||
                            (updated as any)?.docuseal_details
                              ?.submitters?.[0]?.url;
                          if (link) {
                            window.location.href = link;
                          } else {
                            toast({
                              title: "No signing link",
                              description:
                                "No signing URL available yet. Try Refresh Status and retry.",
                            });
                          }
                        } catch (e: any) {
                          toast({
                            title: "Failed to fetch offer",
                            description: e?.message || String(e),
                          });
                        }
                      }}
                    >
                      <Eye className="w-3 h-3 mr-1.5" />
                      View
                    </Button>
                    {offer.status === "archived" ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setOfferToDelete(offer);
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setOfferToArchive(offer);
                          setShowArchiveDialog(true);
                        }}
                      >
                        <Archive className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </section>
  )}
      </div>

    {/* Send Offer Dialog */ }
    < Dialog open = { showSendOfferDialog } onOpenChange = { setShowSendOfferDialog } >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Offer</DialogTitle>
          <DialogDescription>
            Send a contract offer using the selected template
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Template
            </p>
            <p className="text-sm font-medium text-gray-900">
              {selectedTemplate?.name}
            </p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
            <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">
              Recipient
            </p>
            <p className="text-sm font-medium text-indigo-900">
              {prospect?.full_name}
            </p>
            <p className="text-xs text-indigo-600">{prospect?.email}</p>
          </div>
          <p className="text-xs text-gray-500">
            This will create a DocuSeal submission and send it to the prospect
            for signing.
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowSendOfferDialog(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSendOffer}
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={isSendingOffer}
          >
            {isSendingOffer ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Offer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
      </Dialog >

    {/* Archive Confirmation Dialog */ }
    < Dialog open = { showArchiveDialog } onOpenChange = { setShowArchiveDialog } >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archive Submission?</DialogTitle>
          <DialogDescription>
            Are you sure you want to archive this submission? This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowArchiveDialog(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              if (!offerToArchive) return;
              try {
                await scoutingService.deleteOffer(offerToArchive.id);
                toast({
                  title: "Submission Archived",
                  description: "The offer has been successfully archived.",
                });
                queryClient.invalidateQueries({ queryKey: ["offers"] });
                setShowArchiveDialog(false);
              } catch (error) {
                console.error("Error archiving offer:", error);
                toast({
                  title: "Error",
                  description: "Failed to archive submission.",
                  variant: "destructive",
                });
              }
            }}
          >
            Archive
          </Button>
        </DialogFooter>
      </DialogContent>
      </Dialog >

    {/* Delete Template Confirmation Dialog */ }
    < Dialog
  open = { showDeleteTemplateDialog }
  onOpenChange = { setShowDeleteTemplateDialog }
    >
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Delete Template?</DialogTitle>
        <DialogDescription className="space-y-3 pt-2">
          <p>Are you sure you want to delete this template?</p>
          <div className="p-3 bg-red-50 border border-red-100 rounded-md text-red-800 text-sm">
            <p className="font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Warning: Data Loss
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-1">
              <li>The template will be permanently deleted</li>
              <li>{offersToDeleteCount} offer{offersToDeleteCount !== 1 ? 's' : ''} sent using this template will be deleted</li>
              <li>All submission data associated with these offers will be lost</li>
            </ul>
          </div>
          <p className="font-medium text-gray-900">This action cannot be undone.</p>
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => setShowDeleteTemplateDialog(false)}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={async () => {
            if (!templateToDelete) return;
            try {
              await scoutingService.deleteTemplate(templateToDelete.id);
              toast({
                title: "Template Deleted",
                description: "The template has been permanently deleted.",
              });
              queryClient.invalidateQueries({ queryKey: ["templates"] });
              setShowDeleteTemplateDialog(false);
            } catch (error) {
              console.error("Error deleting template:", error);
              toast({
                title: "Error",
                description: "Failed to delete template.",
                variant: "destructive",
              });
            }
          }}
        >
          Delete Template
        </Button>
      </DialogFooter>
    </DialogContent>
      </Dialog >

    {/* Permanent Delete Confirmation Dialog */ }
    < Dialog open = { showDeleteDialog } onOpenChange = { setShowDeleteDialog } >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Permanently Delete Submission?</DialogTitle>
          <DialogDescription>
            This will permanently delete this submission from the database.
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowDeleteDialog(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              if (!offerToDelete) return;
              try {
                await scoutingService.permanentlyDeleteOffer(
                  offerToDelete.id,
                );
                toast({
                  title: "Submission Deleted",
                  description: "The submission has been permanently deleted.",
                });
                queryClient.invalidateQueries({ queryKey: ["offers"] });
                setShowDeleteDialog(false);
              } catch (error) {
                console.error("Error deleting offer:", error);
                toast({
                  title: "Error",
                  description: "Failed to delete submission.",
                  variant: "destructive",
                });
              }
            }}
          >
            Permanently Delete
          </Button>
        </DialogFooter>
      </DialogContent>
      </Dialog >

    {/* Template Builder Modal */ }
  {
    showTemplateBuilder && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col bg-white shadow-2xl rounded-2xl">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
            <h2 className="text-lg font-bold text-gray-900">Edit Template</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowTemplateBuilder(false)}
            >
              <XCircle className="w-5 h-5 text-gray-500" />
            </Button>
          </div>
          <div className="flex-1 bg-gray-50 relative">
            {/* DocuSeal Builder Component */}
            <docuseal-builder
              data-token={builderToken}
              data-template-id={builderTemplateId}
              data-autosave={false}
              data-save-button-text="Save Template"
              data-with-send-button={true}
              data-with-sign-yourself-button={false}
              className="w-full h-full absolute inset-0"
              ref={(el: any) => {
                if (el && !el._hasSaveListener) {
                  console.log("Attaching save listener to DocuSeal builder");
                  el.addEventListener("save", () => {
                    console.log("DocuSeal builder 'save' event captured!");
                    handleSyncTemplates(2000); // 2 second delay for API consistency
                    toast({
                      title: "Template Saved",
                      description: "Your changes are being synchronized...",
                    });
                  });
                  el._hasSaveListener = true;
                }
              }}
            ></docuseal-builder>
          </div>
        </Card>
      </div>
    )
  }

  {/* Welcome Modal */ }
  <Dialog open={showWelcomeModal} onOpenChange={setShowWelcomeModal}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>📋 Template Management</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <p className="text-gray-600">
          Each template stores all offers sent using it.
        </p>
        <div className="p-3 bg-amber-50 border border-amber-100 rounded-md text-amber-800 text-sm">
          <p className="font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Important
          </p>
          <p className="mt-1">
            Deleting a template will permanently delete all associated offers and submission data.
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => {
          localStorage.setItem('template_welcome_shown', 'true');
          setShowWelcomeModal(false);
        }}>
          Got it
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
    </div >
  );
}
