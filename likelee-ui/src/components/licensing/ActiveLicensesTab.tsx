import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { activeLicenses, ActiveLicense } from "@/api/activeLicenses";
import { ActiveLicenseDetailsSheet } from "./ActiveLicenseDetailsSheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, CheckCircle, AlertCircle, RefreshCw, XCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const ActiveLicensesTab = () => {
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedLicense, setSelectedLicense] = useState<ActiveLicense | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    const { data: list, isLoading: isListLoading } = useQuery({
        queryKey: ["agency", "active-licenses", statusFilter, searchQuery],
        queryFn: () => activeLicenses.list(statusFilter, searchQuery),
    });

    const { data: stats, isLoading: isStatsLoading } = useQuery({
        queryKey: ["agency", "active-licenses", "stats"],
        queryFn: activeLicenses.stats,
    });

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(val);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "Active":
                return <Badge className="bg-green-500 hover:bg-green-600">ACTIVE</Badge>;
            case "Expiring":
                return <Badge className="bg-orange-500 hover:bg-orange-600">EXPIRING</Badge>;
            case "Expired":
                return <Badge className="bg-red-500 hover:bg-red-600">EXPIRED</Badge>;
            default:
                return <Badge variant="secondary">{status.toUpperCase()}</Badge>;
        }
    };

    const getDaysLeftText = (days?: number) => {
        if (days === undefined || days === null) return "";
        if (days < 0) return `${Math.abs(days)} days ago`;
        return `${days} days left`;
    };

    const handleViewDetails = (license: ActiveLicense) => {
        console.log("Viewing details for license:", license);
        setSelectedLicense(license);
        setIsDetailsOpen(true);
    };

    const handleRenew = (license: ActiveLicense) => {
        // Placeholder for renewal logic or navigation
        console.log("Renew license", license.id);
        // Could open a "Renew License Modal" or navigate to a renewal page
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">Active Licenses</h2>
            <p className="text-muted-foreground">Manage all talent licensing agreements</p>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Active Licenses
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.active_count || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-orange-500" />
                            Expiring Soon
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.expiring_count || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-500" />
                            Expired
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.expired_count || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
                            <span className="font-bold border border-blue-200 rounded px-1 text-xs">$</span> Total Value
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(stats?.total_value || 0)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
                <div className="relative w-full sm:w-[300px]">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by talent, brand, or license type..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <ToggleGroup type="single" value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)} className="justify-start">
                    <ToggleGroupItem value="all" aria-label="Toggle all">All</ToggleGroupItem>
                    <ToggleGroupItem value="active" aria-label="Toggle active">Active</ToggleGroupItem>
                    <ToggleGroupItem value="expiring" aria-label="Toggle expiring">Expiring</ToggleGroupItem>
                    <ToggleGroupItem value="expired" aria-label="Toggle expired">Expired</ToggleGroupItem>
                </ToggleGroup>
            </div>

            {/* Table */}
            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>TALENT</TableHead>
                            <TableHead>LICENSE TYPE</TableHead>
                            <TableHead>BRAND</TableHead>
                            <TableHead>DURATION</TableHead>
                            <TableHead>USAGE SCOPE</TableHead>
                            <TableHead>VALUE</TableHead>
                            <TableHead>STATUS</TableHead>
                            <TableHead>ACTIONS</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isListLoading ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center h-24">Loading...</TableCell>
                            </TableRow>
                        ) : list?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">No active licenses found.</TableCell>
                            </TableRow>
                        ) : (
                            list?.map((license) => (
                                <TableRow key={license.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={license.talent_avatar} alt={license.talent_name} />
                                                <AvatarFallback>{license.talent_name.substring(0, 2)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">{license.talent_name}</span>
                                                <span className="text-xs text-muted-foreground">{license.talent_id.substring(0, 8)}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">{license.license_type}</TableCell>
                                    <TableCell className="font-medium">{license.brand}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-xs">
                                            <span className="font-semibold">{license.start_date}</span>
                                            <span className="text-muted-foreground">to {license.end_date}</span>
                                            <span className={license.status === "Expiring" ? "text-orange-500 font-medium" : "text-gray-500"}>
                                                {getDaysLeftText(license.days_left)}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate text-xs" title={license.usage_scope}>
                                        {license.usage_scope}
                                    </TableCell>
                                    <TableCell className="font-bold">
                                        <div>{formatCurrency(license.value / 100)}</div>
                                    </TableCell>
                                    <TableCell>{getStatusBadge(license.status)}</TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-gray-500 hover:text-indigo-600"
                                            onClick={() => handleViewDetails(license)}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {isDetailsOpen && console.log("Rendering ActiveLicenseDetailsSheet with open=", isDetailsOpen)}
            <ActiveLicenseDetailsSheet
                license={selectedLicense}
                open={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
                onRenew={handleRenew}
            />
        </div>
    );
};
