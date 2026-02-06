import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Copy, Edit, Trash2, FileText } from "lucide-react";
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
import { useToast } from "@/components/ui/use-toast";
import { TemplateModal } from "./TemplateModal";
import { DocuSealBuilderModal } from "./DocuSealBuilderModal";
import { SendContractModal } from "./SendContractModal";
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
import { finalizeLicenseSubmission, createLicenseSubmissionDraft } from "@/api/licenseSubmissions";

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
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All Categories");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<LicenseTemplate | null>(null);
    const [isSendModalOpen, setIsSendModalOpen] = useState(false);
    const [sendTemplateId, setSendTemplateId] = useState<string | null>(null);
    const [sendLicenseFee, setSendLicenseFee] = useState<number | undefined>(undefined);
    const [sendDocusealTemplateId, setSendDocusealTemplateId] = useState<number | null>(null);

    const [templateToDelete, setTemplateToDelete] = useState<{
        id: string;
        name: string;
    } | null>(null);
    const [builderTarget, setBuilderTarget] = useState<{
        id: string;
        docuseal_template_id: number;
        template_name: string;
        external_id?: string;
    } | null>(null);

    const [builderMode, setBuilderMode] = useState<"template" | "submission">("template");

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
                    template_name: data.template_name
                });
                setBuilderMode("template");
            }
        },
        onError: () => {
            toast({ title: "Error", description: "Failed to create template", variant: "destructive" });
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
                    template_name: data.template_name
                });
                setBuilderMode("template");
            }
        },
        onError: () => {
            toast({ title: "Error", description: "Failed to update template", variant: "destructive" });
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
            toast({ title: "Error", description: "Failed to delete template", variant: "destructive" });
        },
    });

    const copyMutation = useMutation({
        mutationFn: copyLicenseTemplate,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["license-templates"] });
            queryClient.invalidateQueries({ queryKey: ["license-templates-stats"] });
            toast({ title: "Success", description: "Template duplicated successfully" });
        },
        onError: () => {
            toast({ title: "Error", description: "Failed to copy template", variant: "destructive" });
        },
    });

    // UseTemplate logic:
    const handleUseTemplate = (template: LicenseTemplate) => {
        setSendTemplateId(template.id);
        setSendDocusealTemplateId(template.docuseal_template_id ?? null);
        setSendLicenseFee(template.license_fee);
        setIsSendModalOpen(true);
    };

    const handleUseSuccess = () => {
        setIsSendModalOpen(false);
        setSendTemplateId(null);
        setSendDocusealTemplateId(null);
        setSendLicenseFee(undefined);
        queryClient.invalidateQueries({ queryKey: ["license-submissions"] });
        queryClient.invalidateQueries({ queryKey: ["license-templates"] });
        toast({ title: "Sent", description: "Contract sent successfully!" });
    };

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
        setIsModalOpen(true);
    };

    const openEditModal = (template: LicenseTemplate) => {
        setEditingTemplate(template);
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">License Templates</h2>
                    <p className="text-muted-foreground">
                        Pre-built license terms you can reuse for faster negotiations
                    </p>
                </div>
                <Button onClick={openNewTemplateModal} className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="mr-2 h-4 w-4" /> New Template
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.total_templates || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Categories</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.categories || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Most Used</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold truncate">{stats?.most_used || "None"}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats?.most_used !== "None" ? "Category" : ""}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Deal Value</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.avg_deal_value || "$0"}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex space-x-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search templates..."
                        className="pl-8 bg-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[180px] bg-white">
                        <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                        {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                                {cat}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Templates Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                {loadingTemplates ? (
                    <p className="text-muted-foreground col-span-3 text-center py-10">Loading templates...</p>
                ) : filteredTemplates.length === 0 ? (
                    <p className="text-muted-foreground col-span-3 text-center py-10">No templates found.</p>
                ) : (
                    filteredTemplates.map((template) => (
                        <Card
                            key={template.id}
                            className="relative bg-white shadow-sm border-gray-200 hover:shadow-md transition-shadow"
                        >
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-indigo-600" />
                                        <CardTitle className="text-lg font-bold text-gray-900">
                                            {template.template_name}
                                        </CardTitle>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-gray-400 hover:text-gray-600"
                                            onClick={() => handleCopy(template.id)}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-gray-400 hover:text-gray-600"
                                            onClick={() => openEditModal(template)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-400 hover:text-red-600"
                                            onClick={() =>
                                                handleDelete(template.id, template.template_name)
                                            }
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <Badge
                                    variant="secondary"
                                    className="mt-1 w-fit bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-none rounded-md px-2 py-0.5 text-xs font-semibold"
                                >
                                    {template.category}
                                </Badge>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-0">
                                <div className="text-sm text-gray-600">
                                    {template.description || "No description provided."}
                                </div>

                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between items-start">
                                        <span className="text-gray-500 min-w-[100px]">
                                            Usage Scope:
                                        </span>
                                        <span className="font-semibold text-gray-900 text-right flex-1">
                                            {template.usage_scope || "-"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">Duration:</span>
                                        <span className="font-semibold text-gray-900">
                                            {template.duration_days} days
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">Territory:</span>
                                        <span className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                            {template.territory}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">Exclusivity:</span>
                                        <span className="font-semibold text-gray-900">
                                            {template.exclusivity}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center pb-2 border-b border-gray-100 mb-2">
                                        <span className="text-gray-500">License Fee:</span>
                                        <span className="font-bold text-green-600 text-lg">
                                            {template.license_fee
                                                ? `$${(template.license_fee / 100).toLocaleString()}`
                                                : "N/A"}
                                        </span>
                                    </div>
                                </div>

                                <Button
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2"
                                    onClick={() => handleUseTemplate(template)}
                                >
                                    Use This Template
                                </Button>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <TemplateModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                initialData={editingTemplate}
            />

            {sendTemplateId && (
                <SendContractModal
                    isOpen={isSendModalOpen}
                    onClose={() => setIsSendModalOpen(false)}
                    templateId={sendTemplateId}
                    docusealTemplateId={sendDocusealTemplateId ?? undefined}
                    licenseFee={sendLicenseFee}
                    onSuccess={handleUseSuccess}
                />
            )}

            {/* UseTemplateModal removed for direct flow */}

            {builderTarget && (
                <DocuSealBuilderModal
                    open={!!builderTarget}
                    onClose={() => setBuilderTarget(null)}
                    templateName={builderTarget.template_name}
                    docusealTemplateId={builderTarget.docuseal_template_id}
                    // For submissions, we want a unique session ID.
                    // Using `template-${id}-${timestamp}` creates a unique editing session without a DB record.
                    externalId={builderTarget.external_id || builderTarget.id}
                    onSave={async (docusealId) => {
                        if (builderMode === "submission") {
                            // Open Send Modal instead of immediate finalize
                            // builderTarget.id is the License Template ID here
                            setSendTemplateId(builderTarget.id);
                            setSendDocusealTemplateId(docusealId);
                            // Pass along the license fee from the template to the modal context
                            setSendLicenseFee(builderTarget.license_fee);

                            setBuilderTarget(null); // Close builder
                            setIsSendModalOpen(true);
                        } else {
                            // Persist the DocuSeal ID back to our DB for global template
                            try {
                                queryClient.invalidateQueries({ queryKey: ["license-templates"] });
                            } catch (err) {
                                console.error("Failed to update template DocuSeal ID:", err);
                            }
                            setBuilderTarget(null);
                        }
                    }}
                />
            )}

            <Dialog
                open={!!templateToDelete}
                onOpenChange={(open) => !open && setTemplateToDelete(null)}
            >
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Delete Template</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setTemplateToDelete(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
