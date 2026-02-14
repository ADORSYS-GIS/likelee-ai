import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Copy, Edit, Trash2, FileSignature, MoreVertical, Layout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { TemplateModal } from "./TemplateModal";
import { DocuSealBuilderModal } from "./DocuSealBuilderModal";
import { SubmissionWizard } from "./SubmissionWizard";
import { LicenseSubmissionsTab } from "./LicenseSubmissionsTab";
import { LicensingRequestsTab } from "./LicensingRequestsTab";
import {
  getLicenseTemplates,
  getTemplateStats,
  createLicenseTemplate,
  updateLicenseTemplate,
  deleteLicenseTemplate,
  copyLicenseTemplate,
  LicenseTemplate,
  CreateTemplateRequest,
} from "@/api/licenseTemplates";

const CATEGORIES = [
  "All Categories",
  "Social Media",
  "E-commerce",
  "Advertising",
  "Editorial",
  "Film & TV",
  "Custom",
];

export const LicenseTemplatesTab: React.FC = () => {
  const [topTab, setTopTab] = useState<"requests" | "templates" | "submissions">(
    "templates",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hideContractInModal, setHideContractInModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<LicenseTemplate | null>(null);
  const [isViewOnly, setIsViewOnly] = useState(false);

  const [templateToDelete, setTemplateToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [wizardTemplate, setWizardTemplate] = useState<LicenseTemplate | null>(
    null,
  );
  const [builderTarget, setBuilderTarget] = useState<{
    id: string;
    docuseal_template_id: number;
    template_name: string;
    external_id?: string;
  } | null>(null);

  const [builderMode, setBuilderMode] = useState<"template" | "submission">(
    "template",
  );

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ["license-templates"],
    queryFn: getLicenseTemplates,
  });

  const { data: stats } = useQuery({
    queryKey: ["license-templates-stats"],
    queryFn: getTemplateStats,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createLicenseTemplate,
    onSuccess: (data: LicenseTemplate) => {
      queryClient.invalidateQueries({ queryKey: ["license-templates"] });
      queryClient.invalidateQueries({ queryKey: ["license-templates-stats"] });
      toast({ title: "Success", description: "Template created successfully" });
      // Automatically open builder for the new template
      if (data.docuseal_template_id) {
        setBuilderTarget({
          id: data.id,
          docuseal_template_id: data.docuseal_template_id,
          template_name: data.template_name,
        });
        setBuilderMode("template");
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateTemplateRequest }) =>
      updateLicenseTemplate(id, data),
    onSuccess: (data: LicenseTemplate) => {
      queryClient.invalidateQueries({ queryKey: ["license-templates"] });
      queryClient.invalidateQueries({ queryKey: ["license-templates-stats"] });
      toast({ title: "Success", description: "Template updated successfully" });
      // Automatically open builder after update
      if (data.docuseal_template_id) {
        setBuilderTarget({
          id: data.id,
          docuseal_template_id: data.docuseal_template_id,
          template_name: data.template_name,
        });
        setBuilderMode("template");
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update template",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLicenseTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["license-templates"] });
      queryClient.invalidateQueries({ queryKey: ["license-templates-stats"] });
      toast({ title: "Success", description: "Template deleted successfully" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    },
  });

  const copyMutation = useMutation({
    mutationFn: copyLicenseTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["license-templates"] });
      queryClient.invalidateQueries({ queryKey: ["license-templates-stats"] });
      toast({
        title: "Success",
        description: "Template duplicated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to copy template",
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleCreate = async (data: CreateTemplateRequest) => {
    await createMutation.mutateAsync(data);
  };

  const handleUpdate = async (data: CreateTemplateRequest) => {
    if (editingTemplate) {
      await updateMutation.mutateAsync({ id: editingTemplate.id, data });
    }
  };

  const handleSave = async (data: CreateTemplateRequest) => {
    if (editingTemplate) {
      await handleUpdate(data);
    } else {
      await handleCreate(data);
    }
  };

  const openNewTemplateModal = () => {
    setEditingTemplate(null);
    setIsViewOnly(false);
    setTopTab("templates");
    setHideContractInModal(false);
    setIsModalOpen(true);
  };

  const openEditModal = (template: LicenseTemplate) => {
    setEditingTemplate(template);
    setIsViewOnly(false);
    setHideContractInModal(topTab === "requests");
    setIsModalOpen(true);
  };

  const openViewModal = (template: LicenseTemplate) => {
    setEditingTemplate(template);
    setIsViewOnly(true);
    setHideContractInModal(false);
    setIsModalOpen(true);
  };

  const openRequestLicenseModal = () => {
    setEditingTemplate(null);
    setIsViewOnly(false);
    setHideContractInModal(true);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    setTemplateToDelete({ id, name });
  };

  const confirmDelete = async () => {
    if (templateToDelete) {
      await deleteMutation.mutateAsync(templateToDelete.id);
      setTemplateToDelete(null);
    }
  };

  const handleCopy = (id: string) => {
    copyMutation.mutate(id);
  };

  // Filter logic
  const filteredTemplates = templates.filter((t) => {
    const matchesSearch = t.template_name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "All Categories" || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatPrice = (amount?: number) => {
    if (amount === undefined) return "Not set";
    return (amount / 100).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <Tabs value={topTab} onValueChange={(v) => setTopTab(v as any)}>
        <TabsList className="w-full justify-start bg-transparent p-0 border-b rounded-none">
          <TabsTrigger
            value="templates"
            className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 px-6 font-bold"
          >
            Templates
          </TabsTrigger>
          <TabsTrigger
            value="submissions"
            className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 px-6 font-bold"
          >
            Submissions
          </TabsTrigger>
          <TabsTrigger
            value="requests"
            className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 px-6 font-bold"
          >
            Requests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6 mt-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Templates</h2>
              <p className="text-muted-foreground">
                Manage your agency license agreements and contract templates
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={openNewTemplateModal}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-6 rounded-xl shadow-lg shadow-indigo-100"
              >
                <Plus className="mr-2 h-4 w-4" /> New Template
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-3">
            {loadingTemplates ? (
              <p className="text-muted-foreground col-span-3 text-center py-20">
                Loading templates...
              </p>
            ) : filteredTemplates.length === 0 ? (
              <p className="text-muted-foreground col-span-3 text-center py-20">
                {searchTerm || selectedCategory !== "All Categories"
                  ? "No templates match your criteria."
                  : "No templates yet. Create your first one to get started!"}
              </p>
            ) : (
              filteredTemplates.map((template) => (
                <Card
                  key={template.id}
                  className="bg-white border-slate-200 overflow-hidden group hover:shadow-xl hover:border-indigo-200 transition-all cursor-pointer flex flex-col rounded-2xl shadow-sm"
                  onClick={() => openViewModal(template)}
                >
                  <div className="h-32 bg-slate-50 flex items-center justify-center relative shrink-0 border-b border-slate-100 transition-colors group-hover:bg-indigo-50/50">
                    <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform">
                      <FileSignature className="h-7 w-7 text-indigo-600" />
                    </div>

                    <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-white shadow-sm border border-transparent hover:border-slate-100 transition-all">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl border-slate-200 shadow-xl p-1.5">
                          <DropdownMenuItem onClick={() => openEditModal(template)} className="rounded-lg gap-2 cursor-pointer font-semibold py-2.5">
                            <Edit className="h-4 w-4 text-slate-500" /> Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setBuilderTarget({
                                id: template.id,
                                docuseal_template_id: template.docuseal_template_id as any,
                                template_name: template.template_name,
                              });
                              setBuilderMode("template");
                            }}
                            className="rounded-lg gap-2 cursor-pointer font-semibold py-2.5"
                          >
                            <Layout className="h-4 w-4 text-slate-500" /> Edit Layout
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopy(template.id)} className="rounded-lg gap-2 cursor-pointer font-semibold py-2.5">
                            <Copy className="h-4 w-4 text-slate-500" /> Duplicate
                          </DropdownMenuItem>
                          <div className="h-px bg-slate-100 my-1" />
                          <DropdownMenuItem onClick={() => handleDelete(template.id, template.template_name)} className="rounded-lg gap-2 cursor-pointer font-semibold text-red-600 py-2.5 hover:bg-red-50 focus:bg-red-50">
                            <Trash2 className="h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <CardContent className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-slate-900 truncate text-base mb-1">
                        {template.template_name}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[10px] uppercase font-bold tracking-tight px-1.5 py-0">
                          {template.category}
                        </Badge>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          {template.created_at ? formatDate(template.created_at) : ""}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6">
                      <Button
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setWizardTemplate(template);
                        }}
                      >
                        Use Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="submissions" className="mt-6">
          <LicenseSubmissionsTab />
        </TabsContent>

        <TabsContent value="requests" className="mt-6">
          <LicensingRequestsTab />
        </TabsContent>
      </Tabs>

      <TemplateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initialData={editingTemplate}
        hideContract={hideContractInModal}
        readOnly={isViewOnly}
      />

      {wizardTemplate && (
        <SubmissionWizard
          isOpen={!!wizardTemplate}
          onClose={() => setWizardTemplate(null)}
          template={wizardTemplate}
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ["license-templates"] });
            queryClient.invalidateQueries({ queryKey: ["license-submissions"] });
          }}
        />
      )}

      {builderTarget && (
        <DocuSealBuilderModal
          open={!!builderTarget}
          onClose={() => setBuilderTarget(null)}
          templateName={builderTarget.template_name}
          docusealTemplateId={builderTarget.docuseal_template_id}
          externalId={builderTarget.external_id || builderTarget.id}
          onSave={async (docusealId) => {
            queryClient.invalidateQueries({ queryKey: ["license-templates"] });
            setBuilderTarget(null);
          }}
        />
      )}

      <Dialog
        open={!!templateToDelete}
        onOpenChange={(open) => !open && setTemplateToDelete(null)}
      >
        <DialogContent className="sm:max-w-[400px] rounded-3xl p-8 border-none shadow-2xl">
          <DialogHeader className="space-y-3">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-2">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900">Delete Template</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              Are you sure you want to delete <span className="text-slate-900 font-bold">"{templateToDelete?.name}"</span>?
              This action cannot be undone and will remove the template from your library.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-8 sm:justify-start gap-3">
            <Button
              variant="ghost"
              onClick={() => setTemplateToDelete(null)}
              className="px-6 font-bold text-slate-500 rounded-xl h-10"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 font-bold px-8 rounded-xl h-10 shadow-lg shadow-red-100"
            >
              Delete Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
