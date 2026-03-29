import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/auth/AuthProvider";
import { createPageUrl } from "@/utils";

const AgencyJobInvitesView = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmJobId, setConfirmJobId] = useState("");
  const [confirmAction, setConfirmAction] = useState<"accept" | "decline" | "">(
    "",
  );

  const jobInvitesQuery = useQuery({
    queryKey: ["agency", "job-invites"],
    queryFn: async () => {
      const resp = await base44.get<{ jobs?: any[] }>("/api/jobs", {
        params: { limit: 100 },
      });
      const jobs = Array.isArray(resp?.jobs) ? resp.jobs : [];
      return jobs.filter((job) => {
        const invitedAgencies = Array.isArray(job?.invited_agency_ids)
          ? job.invited_agency_ids
          : [];
        const acceptedAgencies = Array.isArray(job?.accepted_agency_ids)
          ? job.accepted_agency_ids
          : [];
        const myId = user?.id;
        return invitedAgencies.includes(myId) || acceptedAgencies.includes(myId);
      });
    },
  });

  const jobInvites = useMemo(() => {
    if (!Array.isArray(jobInvitesQuery.data)) return [];
    return jobInvitesQuery.data;
  }, [jobInvitesQuery.data]);

  const isConfidentialBrandPlaceholder = (value: unknown) =>
    String(value || "")
      .trim()
      .toLowerCase() === "confidential brand";

  const resolveJobCompanyName = (job: any) => {
    const brandName = String(job?.brands?.company_name || "").trim();
    const companyName = String(job?.company_name || "").trim();
    if (brandName && !isConfidentialBrandPlaceholder(brandName)) {
      return brandName;
    }
    if (companyName && !isConfidentialBrandPlaceholder(companyName)) {
      return companyName;
    }
    return brandName || companyName || "Brand";
  };

  const declineJobInvite = async (jobId: string) => {
    try {
      setBusyIds((prev) => new Set(prev).add(jobId));
      await base44.post(`/api/jobs/${jobId}/decline`);
      toast({ title: "Job invite declined" });
      jobInvitesQuery.refetch();
    } catch (err: any) {
      toast({
        title: "Error declining job invite",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
      setConfirmOpen(false);
    }
  };

  const acceptJobInvite = async (jobId: string) => {
    try {
      setBusyIds((prev) => new Set(prev).add(jobId));
      await base44.post(`/api/jobs/${jobId}/accept`);
      toast({ title: "Job invite accepted" });
      jobInvitesQuery.refetch();
    } catch (err: any) {
      toast({
        title: "Error accepting job invite",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
      setConfirmOpen(false);
    }
  };

  const confirmInviteAction = () => {
    if (!confirmJobId || !confirmAction) return;
    if (confirmAction === "accept") {
      acceptJobInvite(confirmJobId);
      return;
    }
    declineJobInvite(confirmJobId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Job Invites</h2>
        <p className="text-gray-600">
          Review invited jobs and respond from the agency dashboard.
        </p>
      </div>

      <Card className="p-6 border border-gray-200 rounded-xl space-y-4">
        {jobInvitesQuery.isLoading && (
          <p className="text-sm text-gray-500">Loading job invites...</p>
        )}
        {!jobInvitesQuery.isLoading && jobInvites.length === 0 && (
          <p className="text-sm text-gray-500">No job invites yet.</p>
        )}
        {jobInvites.map((job: any) => {
          const jobId = String(job?.id || "");
          const companyName = resolveJobCompanyName(job);
          const jobTitle = String(job?.job_title || "Job invite");
          const isBusy = busyIds.has(jobId);
          const isAccepted = (job?.accepted_agency_ids || []).includes(
            profile?.id || user?.id,
          );

          return (
            <div
              key={jobId}
              className="border border-green-200 bg-green-50 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{companyName}</p>
                  <p className="text-xs text-gray-600">{jobTitle}</p>
                </div>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none">
                  Job Invite
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {!isAccepted ? (
                  <>
                    <Button
                      size="sm"
                      className="bg-white text-black border border-gray-200 hover:bg-gray-100"
                      onClick={() => {
                        navigate(
                          `${createPageUrl("Jobs")}?jobId=${encodeURIComponent(jobId)}`,
                        );
                      }}
                    >
                      View job details
                    </Button>
                    <Button
                      size="sm"
                      className="bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
                      disabled={isBusy}
                      onClick={() => {
                        setConfirmJobId(jobId);
                        setConfirmAction("accept");
                        setConfirmOpen(true);
                      }}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-600 bg-white hover:bg-red-50"
                      disabled={isBusy}
                      onClick={() => {
                        setConfirmJobId(jobId);
                        setConfirmAction("decline");
                        setConfirmOpen(true);
                      }}
                    >
                      Decline
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    className="bg-black text-white hover:bg-gray-800"
                    onClick={() =>
                      navigate(
                        `${createPageUrl("Jobs")}?jobId=${encodeURIComponent(jobId)}&apply=true`,
                      )
                    }
                  >
                    Apply
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirm {confirmAction === "accept" ? "Acceptance" : "Decline"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {confirmAction} this job invite?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmInviteAction}
              className={
                confirmAction === "accept"
                  ? "bg-[#32C8D1] hover:bg-[#2AB8C1]"
                  : "bg-red-600 hover:bg-red-700"
              }
              disabled={busyIds.has(confirmJobId)}
            >
              {busyIds.has(confirmJobId)
                ? "Working..."
                : `Yes, ${confirmAction}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AgencyJobInvitesView;
