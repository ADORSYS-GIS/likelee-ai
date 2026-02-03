import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Plus, Search, Filter, MoreHorizontal, Eye,
    Share2, Trash2, Loader2, Package, TrendingUp,
    Clock, CheckCircle2, AlertCircle, Copy, ExternalLink,
    Image as ImageIcon, ChevronLeft, ChevronRight
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { packageApi } from "@/api/packages";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { CreatePackageWizard } from "./CreatePackageWizard";
import { TemplateCard } from "./TemplateCard";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function PackagesView() {
    const [activeTab, setActiveTab] = useState<"templates" | "sent">("templates");
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 8;

    const [searchTerm, setSearchTerm] = useState("");
    const [showWizard, setShowWizard] = useState(false);
    const [wizardMode, setWizardMode] = useState<"template" | "package" | "send-from-template">("template");
    const [editingPackage, setEditingPackage] = useState<any | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: templates, isLoading: isTemplatesLoading } = useQuery({
        queryKey: ["agency-package-templates"],
        queryFn: () => packageApi.listTemplates(),
        enabled: activeTab === "templates",
    });

    const { data: sentPackages, isLoading: isSentLoading } = useQuery({
        queryKey: ["agency-sent-packages"],
        queryFn: () => packageApi.listSentPackages(),
        enabled: activeTab === "sent",
    });

    const { data: statsData, isLoading: isStatsLoading } = useQuery({
        queryKey: ["agency-package-stats"],
        queryFn: () => packageApi.getPackageStats(),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => packageApi.deletePackage(id),
        onSuccess: () => {
            toast({ title: "Package deleted" });
            queryClient.invalidateQueries({ queryKey: ["agency-packages"] });
            queryClient.invalidateQueries({ queryKey: ["agency-package-templates"] });
            queryClient.invalidateQueries({ queryKey: ["agency-sent-packages"] });
            queryClient.invalidateQueries({ queryKey: ["agency-package-stats"] });
        },
    });

    const fetchFullPackageMutation = useMutation({
        mutationFn: (id: string) => packageApi.getPackage(id),
        onSuccess: (fullPackageData) => {
            setEditingPackage(fullPackageData);
            setShowWizard(true);
        },
    });

    const copyToClipboard = (token: string) => {
        const url = `${window.location.origin}/share/package/${token}`;
        navigator.clipboard.writeText(url);
        toast({ title: "Link copied to clipboard!" });
    };

    const currentPackages = activeTab === "templates" ? templates : sentPackages;
    const isLoading = activeTab === "templates" ? isTemplatesLoading : isSentLoading;

    // Filter packages
    const filteredPackages = (currentPackages as any)?.filter((p: any) =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    // Pagination Logic for Templates
    const totalPages = Math.ceil(filteredPackages.length / ITEMS_PER_PAGE);
    const paginatedTemplates = activeTab === "templates"
        ? filteredPackages.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
        : [];

    const realStats = (statsData as any) || {
        total_packages: 0,
        active_shares: 0,
        total_views: 0,
        conversion_rate: "0%"
    };

    const stats = [
        { label: "Total Packages", value: realStats.total_packages, icon: Package, color: "text-blue-600", bgColor: "bg-blue-100" },
        { label: "Active Shares", value: realStats.active_shares, icon: CheckCircle2, color: "text-green-600", bgColor: "bg-green-100" },
        { label: "Total Views", value: realStats.total_views.toLocaleString(), icon: Eye, color: "text-purple-600", bgColor: "bg-purple-100" },
        { label: "Conversion", value: realStats.conversion_rate, icon: TrendingUp, color: "text-orange-600", bgColor: "bg-orange-100" },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-6">
                {stats.map((s, i) => (
                    <Card key={i} className="p-6 bg-white border border-gray-200 shadow-sm relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-2 rounded-lg ${s.bgColor} transition-colors border border-transparent`}>
                                <s.icon className={`w-5 h-5 ${s.color}`} />
                            </div>
                            <Badge variant="secondary" className="bg-gray-100 text-[10px] font-black uppercase tracking-widest">+4%</Badge>
                        </div>
                        <p className="text-[11px] font-black text-gray-700 uppercase tracking-widest">{s.label}</p>
                        <h3 className="text-3xl font-black text-gray-900 tracking-tighter mt-1">{s.value}</h3>
                    </Card>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab("templates")}
                    className={`px-6 py-3 font-bold text-sm uppercase tracking-wider transition-all ${activeTab === "templates"
                        ? "border-b-2 border-indigo-600 text-indigo-600"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                >
                    Templates
                </button>
                <button
                    onClick={() => setActiveTab("sent")}
                    className={`px-6 py-3 font-bold text-sm uppercase tracking-wider transition-all ${activeTab === "sent"
                        ? "border-b-2 border-indigo-600 text-indigo-600"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                >
                    Packages Sent
                </button>
            </div>

            {/* Header & Search */}
            <div className="flex justify-between items-center gap-4">
                <div className="flex-1 relative max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder={`Search ${activeTab === "templates" ? "templates" : "sent packages"}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-12 bg-white border-gray-200 font-medium rounded-lg"
                    />
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="h-10 px-6 font-bold text-sm rounded-lg border-2">
                        <Filter className="w-4 h-4 mr-2" /> Filter
                    </Button>
                    <Button
                        onClick={() => {
                            setWizardMode(activeTab === "templates" ? "template" : "package");
                            setShowWizard(true);
                        }}
                        className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-300 rounded-lg"
                    >
                        <Plus className="w-4 h-4 mr-2" /> {activeTab === "templates" ? "Template" : "Package"}
                    </Button>
                </div>
            </div>

            {/* Package/Template List */}
            {isLoading ? (
                <div className="flex items-center justify-center p-20">
                    <Loader2 className="w-10 h-10 animate-spin text-gray-400" />
                </div>
            ) : filteredPackages.length === 0 ? (
                <Card className="p-20 flex flex-col items-center justify-center bg-white border-2 border-dashed border-gray-200">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                        <Package className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                        No {activeTab === "templates" ? "Templates" : "Packages"} Found
                    </h3>
                    <p className="text-gray-500 font-medium mt-2 mb-8">
                        {activeTab === "templates"
                            ? "Create reusable templates to send to multiple clients."
                            : "Start by creating your first talent portfolio for a client."}
                    </p>
                    <Button
                        onClick={() => {
                            setWizardMode(activeTab === "templates" ? "template" : "package");
                            setShowWizard(true);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg px-6 h-10 rounded-lg shadow-md shadow-indigo-300"
                    >
                        +
                    </Button>
                </Card>
            ) : activeTab === "templates" ? (
                <>
                    {/* Templates Grid View */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {paginatedTemplates.map((template: any) => (
                            <TemplateCard
                                key={template.id}
                                template={template}
                                onEdit={() => {
                                    setWizardMode("template");
                                    fetchFullPackageMutation.mutate(template.id);
                                }}
                                onSend={() => {
                                    setWizardMode("send-from-template");
                                    fetchFullPackageMutation.mutate(template.id);
                                }}
                                onDelete={() => setDeleteTarget(template)}
                            />
                        ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-12 pt-4">
                            <Button
                                variant="ghost"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="font-medium text-gray-500 hover:text-gray-900 px-2"
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                            </Button>

                            <div className="flex items-center gap-2">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                    <Button
                                        key={page}
                                        variant={currentPage === page ? "default" : "outline"}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-10 h-10 p-0 rounded-lg font-bold text-sm transition-all ${currentPage === page
                                                ? "bg-gray-900 text-white shadow-md hover:bg-gray-800"
                                                : "text-gray-600 border-gray-200 hover:border-gray-900 hover:text-gray-900"
                                            }`}
                                    >
                                        {page}
                                    </Button>
                                ))}
                            </div>

                            <Button
                                variant="ghost"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="font-medium text-gray-500 hover:text-gray-900 px-2"
                            >
                                Next <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    )}
                </>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredPackages.map((pkg: any) => (
                        <Card key={pkg.id} className="p-6 bg-white border border-gray-200 hover:border-gray-900 transition-all duration-300 group">
                            <div className="flex items-center gap-6">
                                <div className="w-32 h-20 rounded-xl bg-gray-100 flex-shrink-0 relative overflow-hidden border border-gray-100">
                                    {pkg.cover_image_url ? (
                                        <img src={pkg.cover_image_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300" style={{ backgroundColor: pkg.primary_color + '22' }}>
                                            <ImageIcon className="w-8 h-8" />
                                        </div>
                                    )}
                                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-white/90 backdrop-blur text-[8px] font-black uppercase tracking-tighter">
                                        {pkg.items?.length || 0} Talent
                                    </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight truncate">{pkg.title}</h4>
                                        <Badge className={
                                            !pkg.expires_at || new Date(pkg.expires_at) > new Date()
                                                ? "bg-green-50 text-green-600 border-green-100"
                                                : "bg-red-50 text-red-600 border-red-100"
                                        }>
                                            {!pkg.expires_at || new Date(pkg.expires_at) > new Date() ? "Active" : "Expired"}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-gray-500 font-bold uppercase tracking-widest">
                                        <span className="flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5" /> Created {format(new Date(pkg.created_at), 'MMM d, yyyy')}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <Eye className="w-3.5 h-3.5" /> {pkg.stats?.[0]?.view_count || 0} Views
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-10 w-10 border-gray-200"
                                        onClick={() => copyToClipboard(pkg.access_token)}
                                    >
                                        <Share2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="h-10 px-4 font-black uppercase tracking-widest text-[10px] border-gray-200"
                                    >
                                        View Analytics
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-10 w-10">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                            <DropdownMenuItem
                                                className="font-bold text-xs uppercase tracking-widest p-3"
                                                onClick={() => fetchFullPackageMutation.mutate(pkg.id)}
                                            >
                                                <Pencil className="w-4 h-4 mr-2" /> Edit Package
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="font-bold text-xs uppercase tracking-widest p-3 text-red-600"
                                                onClick={() => setDeleteTarget(pkg)}
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <CreatePackageWizard
                open={showWizard || !!editingPackage}
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        setShowWizard(false);
                        setEditingPackage(null);
                    }
                }}
                packageToEdit={editingPackage}
                mode={wizardMode}
                onSuccess={() => {
                    setShowWizard(false);
                    setEditingPackage(null);
                }}
            />

            <AlertDialog open={!!deleteTarget} onOpenChange={(isOpen) => !isOpen && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the package "{deleteTarget?.title}".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => {
                                if (deleteTarget) {
                                    deleteMutation.mutate(deleteTarget.id);
                                    setDeleteTarget(null);
                                }
                            }}>
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

const Pencil = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
);
