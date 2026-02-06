import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getLicenseSubmissions,
    resendLoginSubmission,
    archiveLicenseSubmission,
    LicenseSubmission
} from "@/api/licenseSubmissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshCw, Archive, CheckCircle, Clock, AlertTriangle, XCircle, Mail, ExternalLink, Eye, Download, Info } from "lucide-react";
import { format } from "date-fns";

export const LicenseSubmissionsTab = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");

    const { data: submissions = [], isLoading } = useQuery({
        queryKey: ["license-submissions"],
        queryFn: getLicenseSubmissions,
    });

    const resendMutation = useMutation({
        mutationFn: resendLoginSubmission,
        onSuccess: () => {
            toast({ title: "Email Resent", description: "The license submission email has been resent." });
        },
        onError: () => {
            toast({ title: "Error", description: "Failed to resend email.", variant: "destructive" });
        }
    });

    const archiveMutation = useMutation({
        mutationFn: archiveLicenseSubmission,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["license-submissions"] });
            toast({ title: "Archived", description: "Submission archived." });
        },
        onError: () => {
            toast({ title: "Error", description: "Failed to archive submission.", variant: "destructive" });
        }
    });

    const getStatusBadge = (sub: LicenseSubmission) => {
        const status = sub.status;
        switch (status.toLowerCase()) {
            case "completed":
            case "signed":
                return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="w-3 h-3 mr-1" /> Signed</Badge>;
            case "sent":
                return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><Mail className="w-3 h-3 mr-1" /> Sent</Badge>;
            case "opened":
                return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><ExternalLink className="w-3 h-3 mr-1" /> Opened</Badge>;
            case "declined":
                return (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <Badge className="bg-red-100 text-red-800 border-red-200 cursor-help"><XCircle className="w-3 h-3 mr-1" /> Declined</Badge>
                            </TooltipTrigger>
                            {sub.decline_reason && (
                                <TooltipContent className="max-w-[300px]">
                                    <p className="font-semibold mb-1">Reason:</p>
                                    <p>{sub.decline_reason}</p>
                                </TooltipContent>
                            )}
                        </Tooltip>
                    </TooltipProvider>
                );
            case "expired":
                return <Badge className="bg-gray-100 text-gray-800 border-gray-200"><Clock className="w-3 h-3 mr-1" /> Expired</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">License Submissions</h2>
                    <p className="text-muted-foreground">
                        Track contracts sent to clients for signature
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Outbound Contracts</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Client</TableHead>
                                <TableHead>Template</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Sent Date</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">Loading...</TableCell>
                                </TableRow>
                            ) : submissions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No submissions found.</TableCell>
                                </TableRow>
                            ) : (
                                submissions
                                    .filter(sub => sub.status !== 'draft' && sub.status !== 'archived')
                                    .map((sub) => (
                                        <TableRow key={sub.id}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">{sub.client_name}</span>
                                                    <span className="text-xs text-muted-foreground">{sub.client_email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{sub.template_name}</TableCell>
                                            <TableCell>{getStatusBadge(sub)}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {format(new Date(sub.sent_at || sub.created_at), "MMM d, yyyy")}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    {sub.signed_document_url && (
                                                        <Button variant="ghost" size="icon" title="Download Contract" onClick={() => window.open(sub.signed_document_url, '_blank')}>
                                                            <Download className="h-4 w-4 text-gray-500 hover:text-green-600" />
                                                        </Button>
                                                    )}
                                                    {sub.status !== 'completed' && sub.status !== 'signed' && (
                                                        <Button variant="ghost" size="icon" title="Resend Email" onClick={() => resendMutation.mutate(sub.id)}>
                                                            <RefreshCw className="h-4 w-4 text-gray-500 hover:text-blue-600" />
                                                        </Button>
                                                    )}
                                                    <Button variant="ghost" size="icon" title="Archive" onClick={() => archiveMutation.mutate(sub.id)}>
                                                        <Archive className="h-4 w-4 text-gray-500 hover:text-red-600" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};
