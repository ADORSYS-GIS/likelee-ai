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
import {
  DashboardSectionHeader,
} from "@/components/dashboard/DashboardResponsive";

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
  const [closedDialogOpen, setClosedDialogOpen] = useState(false);
  const [closedJobLabel, setClosedJobLabel] = useState("");
  const agencyJobsBackTo = `${createPageUrl("AgencyDashboard")}?tab=jobs&subTab=${encodeURIComponent("Job Invites")}`;

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
        return (
          invitedAgencies.includes(myId) || acceptedAgencies.includes(myId)
        );
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

  const isJobClosed = (job: any) => {
    const status = String(
      job?.status || job?.job_status || job?.state || "",
    ).toLowerCase();
    return [
      "closed",
      "filled",
      "inactive",
      "expired",
      "cancelled",
      "canceled",
      "completed",
    ].includes(status);
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
      <DashboardSectionHeader
        title="Job Invites"
        description="Review invited jobs and respond from the agency dashboard."
      />

      <Card className="space-y-4 rounded-2xl border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="text-lg font-semibold text-gray-900 sm:text-xl">
              Brand Offers
            </div>
            <div className="text-sm font-semibold text-gray-800 sm:text-base">
              Job Invites
            </div>
          </div>
          <Badge className="w-fit bg-slate-100 text-slate-700 border border-slate-200">
            {jobInvites.length}
          </Badge>
        </div>
        {jobInvitesQuery.isLoading && (
          <p className="text-sm text-gray-500">Loading job invites...</p>
        )}
        {!jobInvitesQuery.isLoading && jobInvites.length === 0 && (
          <p className="text-sm text-gray-500">No job invites yet.</p>
        )}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {jobInvites.map((job: any) => {
            const jobId = String(job?.id || "");
            const companyName = resolveJobCompanyName(job);
            const jobTitle = String(job?.job_title || "Job invite");
            const isBusy = busyIds.has(jobId);
            const isAccepted = (job?.accepted_agency_ids || []).includes(
              profile?.id || user?.id,
            );
            const location = String(job?.location || "").replaceAll("_", " ");
            const jobType = String(job?.job_type || "").replaceAll("_", " ");
            const callType = String(job?.call_type || "creator").replaceAll(
              "_",
              " ",
            );

            return (
              <div
                key={jobId}
                className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xl font-semibold text-gray-900 break-words sm:text-2xl">
                      {jobTitle}
                    </p>
                    <p className="text-sm text-gray-600 break-words">
                      {companyName}
                    </p>
                  </div>
                  <Badge className="w-fit bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                    {callType}
                  </Badge>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  {location || jobType ? (
                    <p className="lowercase">
                      {[location, jobType].filter(Boolean).join("   ")}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {!isAccepted ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-gray-300 bg-white hover:bg-gray-50 sm:w-auto"
                        onClick={() => {
                          navigate(
                            `${createPageUrl("Jobs")}?jobId=${encodeURIComponent(jobId)}&backTo=${encodeURIComponent(agencyJobsBackTo)}`,
                          );
                        }}
                      >
                        View job details
                      </Button>
                      <Button
                        size="sm"
                        className="w-full bg-[#32C8D1] text-white hover:bg-[#2AB8C1] sm:w-auto"
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
                        className="w-full border-red-300 bg-white text-red-600 hover:bg-red-50 sm:w-auto"
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
                      className="w-full bg-black text-white hover:bg-gray-800 sm:w-auto"
                      onClick={() => {
                        if (isJobClosed(job)) {
                          setClosedJobLabel(
                            String(job?.job_title || job?.title || "This job"),
                          );
                          setClosedDialogOpen(true);
                          return;
                        }
                        navigate(
                          `${createPageUrl("Jobs")}?jobId=${encodeURIComponent(jobId)}&apply=true&backTo=${encodeURIComponent(agencyJobsBackTo)}`,
                        );
                      }}
                    >
                      Apply
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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

      <AlertDialog open={closedDialogOpen} onOpenChange={setClosedDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Job closed or no vacancies</AlertDialogTitle>
            <AlertDialogDescription>
              {closedJobLabel || "This job"} is no longer accepting
              applications.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setClosedDialogOpen(false)}>
              Okay
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AgencyJobInvitesView;
