import React from "react";
import {
  Loader2,
  Mail,
  Plus,
  Shield,
  History,
  BadgeCheck,
  XCircle,
  Activity,
  User,
  Edit2,
  Check,
  ArrowRight,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";

type TeamRoleValue = "owner" | "admin" | "project_manager" | "reviewer";

type TeamMemberRecord = {
  organization_name: string;
  user_id: string;
  email: string;
  role: TeamRoleValue;
  status: string;
  created_at?: string | null;
  last_role_changed_at?: string | null;
};

type TeamInviteRecord = {
  id: string;
  email: string;
  role: Exclude<TeamRoleValue, "owner">;
  status: string;
  expires_at: string;
};

type TeamContextResponse = {
  organization_name: string;
  membership_role: TeamRoleValue;
  permissions: string[];
  members: TeamMemberRecord[];
  invites: TeamInviteRecord[];
};

type TeamAuditLogRecord = {
  id: string;
  target_email?: string | null;
  action: string;
  old_role?: string | null;
  new_role?: string | null;
  created_at: string;
};

const TEAM_ROLE_OPTIONS: Array<{
  value: Exclude<TeamRoleValue, "owner">;
  label: string;
  description: string;
  permissions: string[];
}> = [
  {
    value: "admin",
    label: "Admin",
    description: "Full team management, billing, campaigns, and approvals.",
    permissions: [
      "Full team management",
      "Billing & subscriptions",
      "Campaigns & approvals",
      "Pay offers",
      "Jobs management",
      "Contracts management",
      "License management",
      "Brand connections",
    ],
  },
  {
    value: "project_manager",
    label: "Project Manager",
    description: "Campaign creation and deliverable approvals without billing.",
    permissions: [
      "Pay offers",
      "Manage jobs",
      "Manage contracts",
      "Manage licenses",
      "Manage brand connections",
      "Manage clients",
      "View subscriptions & billing",
      "Campaign creation",
      "Deliverable approvals",
    ],
  },
  {
    value: "reviewer",
    label: "Reviewer",
    description: "Read-only access to deliverables with team visibility.",
    permissions: [
      "View pay offers",
      "View jobs",
      "View contracts",
      "View deliverables",
      "View team members",
      "View brand connections",
      "View clients",
      "View licenses",
    ],
  },
];

const formatTeamRoleLabel = (role?: string) => {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "project_manager":
      return "Project Manager";
    case "reviewer":
      return "Reviewer";
    default:
      return role || "Unknown";
  }
};

async function parseApiResponse(resp: Response) {
  const raw = await resp.text();
  if (!raw.trim()) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {
      status: resp.ok ? "success" : "error",
      message: raw.trim(),
    };
  }
}

export function TeamManagementCard({
  organizationType,
  title = "Team Management",
  description,
  accentClassName = "bg-[#F7B750] hover:bg-[#E6A640] text-white",
  seatLimit,
  seatLimitReached,
}: {
  organizationType: "agency" | "brand";
  title?: string;
  description?: string;
  accentClassName?: string;
  seatLimit?: number | null;
  seatLimitReached?: boolean;
}) {
  const { token } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [context, setContext] = React.useState<TeamContextResponse | null>(
    null,
  );
  const [logs, setLogs] = React.useState<TeamAuditLogRecord[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [showInviteModal, setShowInviteModal] = React.useState(false);
  const [showRoleModal, setShowRoleModal] = React.useState(false);
  const [showActivityModal, setShowActivityModal] = React.useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [seatLimitError, setSeatLimitError] = React.useState<string | null>(
    null,
  );
  const [selectedMember, setSelectedMember] =
    React.useState<TeamMemberRecord | null>(null);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] =
    React.useState<Exclude<TeamRoleValue, "owner">>("reviewer");
  const [pendingRoleValue, setPendingRoleValue] =
    React.useState<Exclude<TeamRoleValue, "owner">>("reviewer");
  const [submittingInvite, setSubmittingInvite] = React.useState(false);
  const [updatingRole, setUpdatingRole] = React.useState(false);
  const [deletingMember, setDeletingMember] = React.useState(false);

  const seatLimitBlocked = seatLimit === 0 || seatLimitReached === true;

  const inviteRoleOption = React.useMemo(
    () => TEAM_ROLE_OPTIONS.find((option) => option.value === inviteRole),
    [inviteRole],
  );

  const pendingRoleOption = React.useMemo(
    () => TEAM_ROLE_OPTIONS.find((option) => option.value === pendingRoleValue),
    [pendingRoleValue],
  );

  const authHeaders = React.useMemo(
    () => ({
      Authorization: `Bearer ${token || ""}`,
    }),
    [token],
  );

  const loadContext = React.useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const resp = await fetch(
        `/api/team/context?organization_type=${encodeURIComponent(organizationType)}&include_details=true`,
        { headers: authHeaders },
      );
      const payload = await parseApiResponse(resp);
      if (!resp.ok) {
        throw new Error(
          payload?.message || payload?.error || "Failed to load team context.",
        );
      }
      setContext(payload as TeamContextResponse);
    } catch (err: any) {
      toast({
        title: "Failed to load team",
        description: err?.message || "Could not load team members.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [authHeaders, organizationType, toast, token]);

  const loadAuditLogs = React.useCallback(async () => {
    if (!token) return;
    try {
      const resp = await fetch(
        `/api/team/audit-logs?organization_type=${encodeURIComponent(organizationType)}`,
        { headers: authHeaders },
      );
      const payload = await parseApiResponse(resp);
      if (!resp.ok) {
        throw new Error(
          payload?.message || payload?.error || "Failed to load activity.",
        );
      }
      setLogs(Array.isArray(payload) ? (payload as TeamAuditLogRecord[]) : []);
    } catch {
      setLogs([]);
    }
  }, [authHeaders, organizationType, token]);

  React.useEffect(() => {
    void loadContext();
    void loadAuditLogs();
  }, [loadAuditLogs, loadContext]);

  const canInvite = Boolean(
    context?.permissions?.includes("invite_team_members"),
  );
  const canUpdateRoles = Boolean(
    context?.permissions?.includes("update_member_roles"),
  );
  const canRemoveMembers = Boolean(
    context?.permissions?.includes("remove_team_members"),
  );

  const handleInviteButtonClick = () => {
    if (seatLimitBlocked) {
      const message =
        seatLimit === 0
          ? "Upgrade to Basic or above to unlock team seats."
          : `You've reached your ${seatLimit ?? 0} seat limit. Upgrade to add more team members.`;
      setSeatLimitError(message);
      setShowUpgradeModal(true);
    } else {
      setShowInviteModal(true);
    }
  };

  const handleInvite = async () => {
    const normalizedEmail = String(inviteEmail || "")
      .trim()
      .toLowerCase();
    if (!normalizedEmail) return;
    try {
      setSubmittingInvite(true);
      const resp = await fetch(
        `/api/team/invites?organization_type=${encodeURIComponent(organizationType)}`,
        {
          method: "POST",
          headers: {
            ...authHeaders,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: normalizedEmail,
            role: inviteRole,
          }),
        },
      );
      const payload = await parseApiResponse(resp);
      if (!resp.ok) {
        const errorMessage =
          payload?.message || payload?.error || "Failed to send invite.";
        if (errorMessage.startsWith("SEAT_LIMIT_EXCEEDED:")) {
          setSeatLimitError(errorMessage.replace("SEAT_LIMIT_EXCEEDED: ", ""));
          setShowInviteModal(false);
          setShowUpgradeModal(true);
          throw new Error(errorMessage);
        }
        throw new Error(errorMessage);
      }
      setInviteEmail("");
      setInviteRole("reviewer");
      setShowInviteModal(false);
      await loadContext();
      await loadAuditLogs();
      toast({
        title: "Invitation sent",
        description: `${normalizedEmail} has been invited.`,
      });
    } catch (err: any) {
      if (!err?.message?.startsWith("SEAT_LIMIT_EXCEEDED:")) {
        toast({
          title: "Invite failed",
          description: err?.message || "Could not send invite.",
          variant: "destructive",
        });
      }
    } finally {
      setSubmittingInvite(false);
    }
  };

  const handleRoleUpdate = async () => {
    if (!selectedMember) return;
    try {
      setUpdatingRole(true);
      const resp = await fetch(
        `/api/team/members/${encodeURIComponent(selectedMember.user_id)}/role?organization_type=${encodeURIComponent(organizationType)}`,
        {
          method: "POST",
          headers: {
            ...authHeaders,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            role: pendingRoleValue,
          }),
        },
      );
      const payload = await parseApiResponse(resp);
      if (!resp.ok) {
        throw new Error(
          payload?.message || payload?.error || "Failed to update role.",
        );
      }
      setShowRoleModal(false);
      setSelectedMember(null);
      await loadContext();
      await loadAuditLogs();
      toast({
        title: "Role updated",
        description: `${selectedMember.email} is now ${formatTeamRoleLabel(
          pendingRoleValue,
        )}.`,
      });
    } catch (err: any) {
      toast({
        title: "Role update failed",
        description: err?.message || "Could not update the member role.",
        variant: "destructive",
      });
    } finally {
      setUpdatingRole(false);
    }
  };

  const openRoleEditor = (member: TeamMemberRecord) => {
    setSelectedMember(member);
    setPendingRoleValue(
      (member.role === "owner" ? "admin" : member.role) as Exclude<
        TeamRoleValue,
        "owner"
      >,
    );
    setShowRoleModal(true);
  };

  const openRemoveDialog = (member: TeamMemberRecord) => {
    setSelectedMember(member);
    setShowDeleteModal(true);
  };

  const handleRemove = async () => {
    if (!selectedMember) return;
    try {
      setDeletingMember(true);
      const resp = await fetch(
        `/api/team/members/${encodeURIComponent(selectedMember.user_id)}?organization_type=${encodeURIComponent(organizationType)}`,
        {
          method: "DELETE",
          headers: authHeaders,
        },
      );
      const payload = await parseApiResponse(resp);
      if (!resp.ok) {
        throw new Error(
          payload?.message || payload?.error || "Failed to remove member.",
        );
      }
      setShowDeleteModal(false);
      setSelectedMember(null);
      await loadContext();
      await loadAuditLogs();
      toast({
        title: "Member removed",
        description: `${selectedMember.email} has been removed from the team.`,
      });
    } catch (err: any) {
      toast({
        title: "Removal failed",
        description: err?.message || "Could not remove the member.",
        variant: "destructive",
      });
    } finally {
      setDeletingMember(false);
    }
  };

  const decorateActivity = (log: TeamAuditLogRecord) => {
    switch (log.action) {
      case "team_invite_created":
        return {
          label: "Invitation created",
          details: `${log.target_email || "A member"} invited as ${formatTeamRoleLabel(log.new_role || "")}`,
          icon: Mail,
        };
      case "member_role_updated":
        return {
          label: "Role updated",
          details: `${log.target_email || "A member"} changed from ${formatTeamRoleLabel(
            log.old_role || "",
          )} to ${formatTeamRoleLabel(log.new_role || "")}`,
          icon: Shield,
        };
      case "team_invite_accepted":
        return {
          label: "Invitation accepted",
          details: `${log.target_email || "A member"} joined the team`,
          icon: BadgeCheck,
        };
      case "team_invite_declined":
        return {
          label: "Invitation declined",
          details: `${log.target_email || "A member"} declined the invitation`,
          icon: XCircle,
        };
      case "member_removed":
        return {
          label: "Member removed",
          details: `${log.target_email || "A member"} was removed from the team`,
          icon: User,
        };
      default:
        return {
          label: log.action.replaceAll("_", " "),
          details: log.target_email || "Team activity",
          icon: Activity,
        };
    }
  };

  return (
    <>
      <Card
        className={
          organizationType === "brand"
            ? "p-6 bg-white border-2 border-gray-900 rounded-none shadow-none"
            : "p-6 bg-white border border-gray-200"
        }
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <h3
              className={
                organizationType === "brand"
                  ? "text-xl font-black text-gray-900 uppercase tracking-tighter"
                  : "text-xl font-bold text-gray-900"
              }
            >
              {title}
            </h3>
            <p
              className={
                organizationType === "brand"
                  ? "text-xs text-gray-500 font-bold uppercase tracking-widest mt-2"
                  : "text-gray-600 mt-1"
              }
            >
              {description ||
                `Manage members, roles, and invitations for ${context?.organization_name || "your team"}.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="outline"
              className={
                organizationType === "brand"
                  ? "rounded-none border-2 border-gray-900 font-black uppercase tracking-widest text-[10px] h-10 px-4 sm:px-6 hover:bg-gray-950 hover:text-white"
                  : "border-2 border-gray-300"
              }
              onClick={() => setShowActivityModal(true)}
            >
              <History className="w-4 h-4 mr-2" />
              Activity
            </Button>
            <Button
              className={`${accentClassName} text-xs sm:text-sm px-3 sm:px-4`}
              onClick={handleInviteButtonClick}
              disabled={!canInvite && !seatLimitBlocked}
            >
              <Plus className="w-4 h-4 mr-1 sm:mr-2" />
              {seatLimitBlocked ? "Upgrade to Add Members" : "Invite"}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading team members...
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4
                  className={
                    organizationType === "brand"
                      ? "text-[10px] font-black text-gray-900 uppercase tracking-[0.2em]"
                      : "text-sm font-bold text-gray-900 uppercase tracking-wide"
                  }
                >
                  Active Members
                </h4>
                <Badge
                  variant="secondary"
                  className={
                    organizationType === "brand"
                      ? "rounded-none font-black uppercase tracking-widest text-[10px]"
                      : ""
                  }
                >
                  {(context?.members || []).length} Members
                </Badge>
              </div>
              <div className="space-y-3">
                {(context?.members || []).map((member) => {
                  const actorRole = context?.membership_role;
                  const canEditRole =
                    canUpdateRoles &&
                    member.role !== "owner" &&
                    !(actorRole === "admin" && member.role === "admin");
                  const canRemove =
                    canRemoveMembers &&
                    member.role !== "owner" &&
                    !(actorRole === "admin" && member.role === "admin");
                  return (
                    <div
                      key={member.user_id}
                      className={
                        organizationType === "brand"
                          ? "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gray-50 border-2 border-gray-200 rounded-none"
                          : "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg"
                      }
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={
                            organizationType === "brand"
                              ? "w-10 h-10 bg-gray-900 rounded-none flex items-center justify-center shrink-0"
                              : "w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center shrink-0"
                          }
                        >
                          <User
                            className={
                              organizationType === "brand"
                                ? "w-5 h-5 text-white"
                                : "w-5 h-5 text-gray-600"
                            }
                          />
                        </div>
                        <div className="min-w-0">
                          <p
                            className={
                              organizationType === "brand"
                                ? "font-black text-gray-900 text-sm truncate"
                                : "font-semibold text-gray-900 truncate"
                            }
                          >
                            {member.email}
                          </p>
                          <p
                            className={
                              organizationType === "brand"
                                ? "text-[10px] text-gray-500 font-bold uppercase tracking-widest"
                                : "text-sm text-gray-600"
                            }
                          >
                            Added{" "}
                            {member.created_at
                              ? new Date(member.created_at).toLocaleDateString()
                              : "recently"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          className={
                            organizationType === "brand"
                              ? "bg-amber-100 text-amber-900 border-2 border-amber-300 rounded-none font-black uppercase tracking-widest text-[10px]"
                              : "bg-blue-100 text-blue-700 border border-blue-300"
                          }
                        >
                          {formatTeamRoleLabel(member.role)}
                        </Badge>
                        {canEditRole ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className={
                              organizationType === "brand"
                                ? "rounded-none border-2 border-gray-900 hover:bg-gray-950 hover:text-white"
                                : "border-2 border-gray-300"
                            }
                            onClick={() => openRoleEditor(member)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        ) : null}
                        {canRemove ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className={
                              organizationType === "brand"
                                ? "rounded-none border-2 border-red-500 text-red-600 hover:bg-red-50"
                                : "border-2 border-red-300 text-red-600 hover:bg-red-50"
                            }
                            onClick={() => openRemoveDialog(member)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
                {(context?.members || []).length === 0 ? (
                  <div
                    className={
                      organizationType === "brand"
                        ? "rounded-none border-2 border-dashed border-gray-300 p-4 text-xs text-gray-500 font-bold uppercase tracking-widest"
                        : "rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500"
                    }
                  >
                    No team members found yet.
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h4
                  className={
                    organizationType === "brand"
                      ? "text-[10px] font-black text-gray-900 uppercase tracking-[0.2em]"
                      : "text-sm font-bold text-gray-900 uppercase tracking-wide"
                  }
                >
                  Pending Invites
                </h4>
                <Badge
                  variant="secondary"
                  className={
                    organizationType === "brand"
                      ? "rounded-none font-black uppercase tracking-widest text-[10px]"
                      : ""
                  }
                >
                  {
                    (context?.invites || []).filter(
                      (invite) => invite.status === "pending",
                    ).length
                  }{" "}
                  Pending
                </Badge>
              </div>
              <div className="space-y-3">
                {(context?.invites || [])
                  .filter((invite) => invite.status === "pending")
                  .map((invite) => (
                    <div
                      key={invite.id}
                      className={
                        organizationType === "brand"
                          ? "flex items-center justify-between p-4 bg-gray-50 border-2 border-gray-200 rounded-none"
                          : "flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg"
                      }
                    >
                      <div>
                        <p
                          className={
                            organizationType === "brand"
                              ? "font-black text-gray-900 text-sm"
                              : "font-semibold text-gray-900"
                          }
                        >
                          {invite.email}
                        </p>
                        <p
                          className={
                            organizationType === "brand"
                              ? "text-[10px] text-gray-500 font-bold uppercase tracking-widest"
                              : "text-sm text-gray-600"
                          }
                        >
                          {formatTeamRoleLabel(invite.role)} · Expires{" "}
                          {new Date(invite.expires_at).toLocaleString()}
                        </p>
                      </div>
                      <Badge
                        className={
                          organizationType === "brand"
                            ? "bg-amber-100 text-amber-900 border-2 border-amber-300 rounded-none font-black uppercase tracking-widest text-[10px]"
                            : "bg-amber-100 text-amber-700 border border-amber-300"
                        }
                      >
                        Pending
                      </Badge>
                    </div>
                  ))}
                {(context?.invites || []).filter(
                  (invite) => invite.status === "pending",
                ).length === 0 ? (
                  <div
                    className={
                      organizationType === "brand"
                        ? "rounded-none border-2 border-dashed border-gray-300 p-4 text-xs text-gray-500 font-bold uppercase tracking-widest"
                        : "rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500"
                    }
                  >
                    No pending invites.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent
          className={
            organizationType === "brand"
              ? "max-w-md rounded-none border-2 border-gray-900 shadow-[8px_8px_0px_rgba(0,0,0,0.1)]"
              : "max-w-md rounded-2xl"
          }
        >
          <DialogHeader>
            <DialogTitle
              className={
                organizationType === "brand"
                  ? "text-xl font-black text-gray-900 uppercase tracking-tighter"
                  : "text-xl font-bold text-gray-900"
              }
            >
              Invite Team Member
            </DialogTitle>
            <DialogDescription
              className={
                organizationType === "brand"
                  ? "text-xs text-gray-500 font-bold uppercase tracking-widest"
                  : "text-sm text-gray-500 font-medium"
              }
            >
              {organizationType === "brand"
                ? "Add a new collaborator to your brand"
                : "Send an email invitation to join your team"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label
                className={
                  organizationType === "brand"
                    ? "text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block"
                    : "text-sm font-bold text-gray-900"
                }
              >
                Email Address
              </Label>
              <Input
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="colleague@example.com"
                className={
                  organizationType === "brand"
                    ? "rounded-none border-2 border-gray-200 focus:border-gray-900 h-12 text-sm font-bold"
                    : "h-11 bg-gray-50 border-gray-200 rounded-xl"
                }
              />
            </div>
            <div className="space-y-2">
              <Label
                className={
                  organizationType === "brand"
                    ? "text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block"
                    : "text-sm font-bold text-gray-900"
                }
              >
                User Role
              </Label>
              <Select
                value={inviteRole}
                onValueChange={(value) =>
                  setInviteRole(value as Exclude<TeamRoleValue, "owner">)
                }
              >
                <SelectTrigger
                  className={
                    organizationType === "brand"
                      ? "rounded-none border-2 border-gray-200 focus:border-gray-900 h-12 text-sm font-bold"
                      : "h-11 bg-gray-50 border-gray-200 rounded-xl"
                  }
                >
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label} - {option.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {inviteRoleOption?.permissions?.length ? (
              <div
                className={
                  organizationType === "brand"
                    ? "border-2 border-gray-200 bg-gray-50 p-5 rounded-none"
                    : "border border-gray-200 bg-gray-50 p-5 rounded-xl"
                }
              >
                <div className="flex items-center justify-between gap-3">
                  <div
                    className={
                      organizationType === "brand"
                        ? "text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]"
                        : "text-xs font-bold text-gray-700 uppercase tracking-wide"
                    }
                  >
                    Access Rights
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      organizationType === "brand"
                        ? "rounded-none font-black uppercase tracking-widest text-[10px]"
                        : ""
                    }
                  >
                    {inviteRoleOption.permissions.length}
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  {inviteRoleOption.permissions.map((permission) => (
                    <div key={permission} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-gray-700 mt-0.5" />
                      <div
                        className={
                          organizationType === "brand"
                            ? "text-[13px] font-bold text-gray-900 leading-snug"
                            : "text-xs font-medium text-gray-700 leading-snug"
                        }
                      >
                        {permission}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div
              className={
                organizationType === "brand"
                  ? "p-4 bg-amber-50 border-2 border-amber-200 rounded-none"
                  : "p-4 bg-indigo-50 border border-indigo-100 rounded-xl"
              }
            >
              <p
                className={
                  organizationType === "brand"
                    ? "text-xs text-amber-900 font-bold leading-relaxed"
                    : "text-xs text-indigo-700 font-medium leading-relaxed"
                }
              >
                <span className="font-bold">Note:</span> The invited user will
                receive an email with instructions to set up their account and
                access the dashboard with the assigned role.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setShowInviteModal(false)}
              className={
                organizationType === "brand"
                  ? "font-black uppercase tracking-widest rounded-none"
                  : "font-bold"
              }
              disabled={submittingInvite}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={submittingInvite}
              className={
                organizationType === "brand"
                  ? "rounded-none bg-[#F7B750] hover:bg-[#E6A640] text-white font-black uppercase tracking-widest px-8 shadow-[4px_4px_0px_rgba(247,183,80,0.3)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none flex items-center gap-2"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 rounded-xl flex items-center gap-2"
              }
            >
              {submittingInvite ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              {submittingInvite ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRoleModal} onOpenChange={setShowRoleModal}>
        <DialogContent className="max-w-md rounded-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl font-bold text-gray-900">
              Update Team Role
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 font-medium">
              {selectedMember?.email || "Member"} is currently{" "}
              {formatTeamRoleLabel(selectedMember?.role)}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-900">
                New Role
              </Label>
              <Select
                value={pendingRoleValue}
                onValueChange={(value) =>
                  setPendingRoleValue(value as Exclude<TeamRoleValue, "owner">)
                }
              >
                <SelectTrigger className="h-11 bg-gray-50 border-gray-200 rounded-xl">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label} - {option.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {pendingRoleOption?.permissions?.length ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Access Rights
                  </div>
                  <Badge variant="secondary">
                    {pendingRoleOption.permissions.length}
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  {pendingRoleOption.permissions.map((permission) => (
                    <div key={permission} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-gray-700 mt-0.5" />
                      <div className="text-xs font-medium text-gray-700 leading-snug">
                        {permission}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-xs font-medium text-amber-800">
              This change takes effect immediately for the member's active
              session.
            </div>
          </div>
          <DialogFooter className="p-6 border-t border-gray-100 gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setShowRoleModal(false)}
              className="font-bold"
              disabled={updatingRole}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRoleUpdate}
              disabled={updatingRole}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 rounded-xl"
            >
              {updatingRole ? "Saving..." : "Confirm Role Change"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showActivityModal} onOpenChange={setShowActivityModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Team Activity</DialogTitle>
            <DialogDescription>
              Recent invite, role, and membership events.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {logs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                No activity recorded yet.
              </div>
            ) : (
              logs.map((log) => {
                const activity = decorateActivity(log);
                return (
                  <div
                    key={log.id}
                    className="flex gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    <activity.icon className="w-5 h-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900">
                        {activity.label}
                      </p>
                      <p className="text-sm text-gray-600">
                        {activity.details}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent
          className={
            organizationType === "brand"
              ? "max-w-md rounded-none border-2 border-gray-900 shadow-[8px_8px_0px_rgba(0,0,0,0.1)]"
              : "max-w-md rounded-2xl"
          }
        >
          <DialogHeader>
            <DialogTitle
              className={
                organizationType === "brand"
                  ? "text-xl font-black text-gray-900 uppercase tracking-tighter"
                  : "text-xl font-bold text-gray-900"
              }
            >
              Seat Limit Reached
            </DialogTitle>
            <DialogDescription
              className={
                organizationType === "brand"
                  ? "text-xs text-gray-500 font-bold uppercase tracking-widest"
                  : "text-sm text-gray-500 font-medium"
              }
            >
              {seatLimitError || "You've reached your team member limit."}
            </DialogDescription>
          </DialogHeader>
          <div
            className={
              organizationType === "brand"
                ? "p-4 bg-amber-50 border-2 border-amber-200 rounded-none"
                : "p-4 bg-indigo-50 border border-indigo-100 rounded-xl"
            }
          >
            <p
              className={
                organizationType === "brand"
                  ? "text-xs text-amber-900 font-bold leading-relaxed"
                  : "text-xs text-indigo-700 font-medium leading-relaxed"
              }
            >
              Upgrade your plan to add more team members and unlock additional
              features.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => {
                setShowUpgradeModal(false);
                setSeatLimitError(null);
              }}
              className={
                organizationType === "brand"
                  ? "font-black uppercase tracking-widest rounded-none"
                  : "font-bold"
              }
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowUpgradeModal(false);
                setSeatLimitError(null);
                if (organizationType === "brand") {
                  navigate("/brandpricing");
                } else {
                  navigate("/agency/billing");
                }
              }}
              className={
                organizationType === "brand"
                  ? "rounded-none bg-[#F7B750] hover:bg-[#E6A640] text-white font-black uppercase tracking-widest px-8 shadow-[4px_4px_0px_rgba(247,183,80,0.3)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none flex items-center gap-2"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 rounded-xl flex items-center gap-2"
              }
            >
              Upgrade Plan
              <ArrowRight className="w-4 h-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent
          className={
            organizationType === "brand"
              ? "max-w-md rounded-none border-2 border-gray-900 shadow-[8px_8px_0px_rgba(0,0,0,0.1)]"
              : "max-w-md rounded-2xl"
          }
        >
          <DialogHeader>
            <DialogTitle
              className={
                organizationType === "brand"
                  ? "text-xl font-black text-gray-900 uppercase tracking-tighter"
                  : "text-xl font-bold text-gray-900"
              }
            >
              Remove Team Member
            </DialogTitle>
            <DialogDescription
              className={
                organizationType === "brand"
                  ? "text-xs text-gray-500 font-bold uppercase tracking-widest"
                  : "text-sm text-gray-500 font-medium"
              }
            >
              Are you sure you want to remove{" "}
              {selectedMember?.email || "this member"} from the team?
            </DialogDescription>
          </DialogHeader>
          <div
            className={
              organizationType === "brand"
                ? "p-4 bg-red-50 border-2 border-red-200 rounded-none"
                : "p-4 bg-red-50 border border-red-100 rounded-xl"
            }
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <p
                className={
                  organizationType === "brand"
                    ? "text-xs text-red-900 font-bold leading-relaxed"
                    : "text-xs text-red-700 font-medium leading-relaxed"
                }
              >
                This action cannot be undone. The member will lose access to all
                organization resources immediately.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setShowDeleteModal(false)}
              className={
                organizationType === "brand"
                  ? "font-black uppercase tracking-widest rounded-none"
                  : "font-bold"
              }
              disabled={deletingMember}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRemove}
              disabled={deletingMember}
              className={
                organizationType === "brand"
                  ? "rounded-none bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest px-8 flex items-center gap-2"
                  : "bg-red-600 hover:bg-red-700 text-white font-bold px-6 rounded-xl flex items-center gap-2"
              }
            >
              {deletingMember ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {deletingMember ? "Removing..." : "Remove Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
