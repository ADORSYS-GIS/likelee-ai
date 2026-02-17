import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getLicenseSubmissions,
  resendLoginSubmission,
  archiveLicenseSubmission,
  recoverLicenseSubmission,
  LicenseSubmission,
} from "@/api/licenseSubmissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  RefreshCw,
  Archive,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Mail,
  ExternalLink,
  Eye,
  Download,
  Info,
  Link2,
  Copy,
} from "lucide-react";
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
      toast({
        title: "Email Resent",
        description: "The license submission email has been resent.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to resend email.",
        variant: "destructive",
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: archiveLicenseSubmission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["license-submissions"] });
      toast({ title: "Archived", description: "Submission archived." });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to archive submission.",
        variant: "destructive",
      });
    },
  });

  const recoverMutation = useMutation({
    mutationFn: recoverLicenseSubmission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["license-submissions"] });
      toast({
        title: "Recovered",
        description: "Submission recovered to active.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to recover submission.",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (sub: LicenseSubmission) => {
    const status = sub.status;
    switch (status.toLowerCase()) {
      case "completed":
      case "signed":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200 text-xs px-2 py-0.5">
            <CheckCircle className="w-3 h-3 mr-1" /> Signed
          </Badge>
        );
      case "sent":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs px-2 py-0.5">
            <Mail className="w-3 h-3 mr-1" /> Sent
          </Badge>
        );
      case "opened":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs px-2 py-0.5">
            <ExternalLink className="w-3 h-3 mr-1" /> Opened
          </Badge>
        );
      case "declined":
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge className="bg-red-100 text-red-800 border-red-200 cursor-help text-xs px-2 py-0.5">
                  <XCircle className="w-3 h-3 mr-1" /> Declined
                </Badge>
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
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-200 text-xs px-2 py-0.5">
            <Clock className="w-3 h-3 mr-1" /> Expired
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const [activeTab, setActiveTab] = useState<"Active" | "Archive">("Active");

  const getClientSigningUrl = (sub: LicenseSubmission) => {
    const appBase =
      ((import.meta as any)?.env?.VITE_DOCUSEAL_APP_URL as string) ||
      "https://docuseal.co";
    const base = appBase.endsWith("/") ? appBase.slice(0, -1) : appBase;
    const slug = sub.client_submitter_slug || sub.docuseal_slug;
    if (!slug) return null;
    return `${base}/s/${slug}`;
  };

  const filteredSubmissions = submissions.filter((sub) => {
    if (sub.status === "draft") return false;
    const isArchived = sub.status === "archived";
    return activeTab === "Active" ? !isArchived : isArchived;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight">
            License Submissions
          </h2>
          <p className="text-muted-foreground">
            Track contracts sent to clients for signature
          </p>
          <div className="flex bg-gray-100 p-1 rounded-lg w-fit mt-4">
            {["Active", "Archive"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Outbound Contracts
          </CardTitle>
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
                  <TableCell colSpan={5} className="text-center h-24">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredSubmissions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center h-24 text-muted-foreground"
                  >
                    {activeTab === "Active"
                      ? "No active submissions found."
                      : "No archived submissions found."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubmissions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">
                          {sub.client_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {sub.client_email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-semibold text-gray-700">
                        {sub.template_name || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(sub)}
                        {sub.status === "declined" && sub.decline_reason && (
                          <p className="text-[10px] text-red-600 bg-red-50 p-1.5 rounded border border-red-100 mt-1 max-w-[200px]">
                            <span className="font-bold">Reason:</span>{" "}
                            {sub.decline_reason}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(
                        new Date(sub.sent_at || sub.created_at),
                        "MMM d, yyyy",
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {getClientSigningUrl(sub) && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Open Client Signing Link"
                              onClick={() =>
                                window.open(getClientSigningUrl(sub)!, "_blank")
                              }
                            >
                              <Link2 className="h-4 w-4 text-gray-500 hover:text-indigo-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Copy Client Signing Link"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(
                                    getClientSigningUrl(sub)!,
                                  );
                                  toast({
                                    title: "Client link copied",
                                    description:
                                      "Share this link with the client for testing.",
                                  });
                                } catch {
                                  toast({
                                    title: "Copy failed",
                                    description:
                                      "Could not copy client link.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              <Copy className="h-4 w-4 text-gray-500 hover:text-indigo-600" />
                            </Button>
                          </>
                        )}
                        {sub.signed_document_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Download Contract"
                            onClick={() =>
                              window.open(sub.signed_document_url, "_blank")
                            }
                          >
                            <Download className="h-4 w-4 text-gray-500 hover:text-green-600" />
                          </Button>
                        )}
                        {activeTab === "Archive" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Recover to Active"
                            onClick={() => recoverMutation.mutate(sub.id)}
                          >
                            <RefreshCw className="h-4 w-4 text-gray-500 hover:text-blue-600" />
                          </Button>
                        ) : (
                          <>
                            {sub.status !== "completed" &&
                              sub.status !== "signed" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Resend Email"
                                  onClick={() => resendMutation.mutate(sub.id)}
                                >
                                  <RefreshCw className="h-4 w-4 text-gray-500 hover:text-blue-600" />
                                </Button>
                              )}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Archive"
                              onClick={() => archiveMutation.mutate(sub.id)}
                            >
                              <Archive className="h-4 w-4 text-gray-500 hover:text-red-600" />
                            </Button>
                          </>
                        )}
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
