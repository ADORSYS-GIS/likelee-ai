import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Plus, Search, Filter, MoreHorizontal, Eye,
    Share2, Trash2, Loader2, Package, TrendingUp,
    Clock, CheckCircle2, AlertCircle, Copy, ExternalLink,
    Image as ImageIcon
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
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";

export function PackagesView() {
    const [searchTerm, setSearchTerm] = useState("");
    const [showWizard, setShowWizard] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: packages, isLoading } = useQuery({
        queryKey: ["agency-packages"],
        queryFn: () => packageApi.listPackages(),
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
            queryClient.invalidateQueries({ queryKey: ["agency-package-stats"] });
        },
    });

    const copyToClipboard = (token: string) => {
        const url = `${window.location.origin}/share/package/${token}`;
        navigator.clipboard.writeText(url);
        toast({ title: "Link copied to clipboard!" });
    };

    const filteredPackages = packages?.data?.filter((p: any) =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const realStats = statsData?.data || {
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

            {/* Header & Search */}
            <div className="flex justify-between items-center gap-4">
                <div className="flex-1 relative max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Search packages..."
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
                        onClick={() => setShowWizard(true)}
                        className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-300 rounded-lg"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Package
                    </Button>
                </div>
            </div>

            {/* Package List */}
            {isLoading ? (
                <div className="flex items-center justify-center p-20">
                    <Loader2 className="w-10 h-10 animate-spin text-gray-400" />
                </div>
            ) : filteredPackages.length === 0 ? (
                <Card className="p-20 flex flex-col items-center justify-center bg-white border-2 border-dashed border-gray-200">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                        <Package className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">No Packages Found</h3>
                    <p className="text-gray-500 font-medium mt-2 mb-8">Start by creating your first talent portfolio for a client.</p>
                    <Button
                        onClick={() => setShowWizard(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg px-6 h-10 rounded-lg shadow-md shadow-indigo-300"
                    >
                        +
                    </Button>
                </Card>
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
                                            <Eye className="w-3.5 h-3.5" /> {pkg.stats?.view_count || 0} Views
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
                                            <DropdownMenuItem className="font-bold text-xs uppercase tracking-widest p-3">
                                                <Pencil className="w-4 h-4 mr-2" /> Edit Package
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="font-bold text-xs uppercase tracking-widest p-3 text-red-600"
                                                onClick={() => deleteMutation.mutate(pkg.id)}
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

            <CreatePackageWizard open={showWizard} onOpenChange={setShowWizard} />
        </div>
    );
}

const Pencil = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
);
