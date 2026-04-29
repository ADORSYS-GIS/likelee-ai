import React, { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { createPageUrl, clampAndSnapCommissionPct } from "@/utils";
import {
  getAgencyPayoutsAccountStatus,
  getTeamAuditLogs,
} from "@/api/functions";
import { Loader2, RefreshCw } from "lucide-react";
import {
  Building2,
  Upload,
  Save,
  DollarSign,
  CreditCard,
  Plus,
  Edit2,
  Mail,
  Copy,
  Bell,
  User,
  FileText,
  Users,
  Globe,
  Calendar,
  MoreVertical,
  Search,
  Shield,
  History,
  Trash2,
  XCircle,
  Eye,
  EyeOff,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Activity,
  ChevronDown,
  ShieldCheck,
  ExternalLink,
  Key,
  Check,
  Info,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import FileStorageView from "./FileStorageView";
import { getUserFriendlyError } from "@/utils/error-utils";
import TalentCommissionSettings from "./TalentCommissionSettings";

type GeneralSettingsViewProps = {
  hasIrlBookingAddon?: boolean;
  hasProAccess?: boolean;
  agencyDisplayPlanLabel?: string;
  kycStatus?: string;
};

type TextTranslator = (key: string, options?: Record<string, any>) => string;

const asTranslationText = (value: unknown, fallback: string): string =>
  typeof value === "string" ? value : fallback;

const createTextTranslator = (
  rawT: (key: string, options?: Record<string, any>) => unknown,
): TextTranslator => {
  return (key, options) => asTranslationText(rawT(key, options), key);
};

const CALENDLY_USE_DEFAULT_VALUE = "__use_default_mapping__";
const CALENDLY_EVENT_TYPE_URI_PREFIX = "https://api.calendly.com/event_types/";
const CALENDLY_BOOKING_TYPE_OPTIONS = [
  { key: "default", label: "Calendly Event Type" },
] as const;

type CalendlySettingsState = {
  calendly_api_token: string;
  scheduling_url: string;
  is_enabled: boolean;
  mappings: Record<string, string>;
};

type CalendlyFieldStatus = "idle" | "saving" | "saved" | "error";

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

function isCalendlyEventTypeUri(value?: string | null) {
  return Boolean(value?.trim().startsWith(CALENDLY_EVENT_TYPE_URI_PREFIX));
}

function withCalendlyManualMappingGuidance(message: string) {
  if (!message) return message;
  if (message.toLowerCase().includes("paste event type uris manually")) {
    return message;
  }
  return `${message} You can still paste event type URIs manually below.`;
}

function normalizeCalendlyMappingsWithEventTypes(
  mappings: Record<string, string>,
  eventTypes: any[],
) {
  const eventTypeUriBySlug = new Map(
    eventTypes
      .filter((eventType) => eventType?.slug && eventType?.uri)
      .map((eventType) => [eventType.slug, eventType.uri]),
  );

  return Object.fromEntries(
    Object.entries(mappings).map(([key, value]) => {
      if (isCalendlyEventTypeUri(value)) {
        return [key, value];
      }
      return [key, eventTypeUriBySlug.get(value) || value];
    }),
  );
}

function cloneCalendlySettings(
  settings: CalendlySettingsState,
): CalendlySettingsState {
  return {
    calendly_api_token: settings.calendly_api_token || "",
    scheduling_url: settings.scheduling_url || "",
    is_enabled: Boolean(settings.is_enabled),
    mappings: { ...(settings.mappings || {}) },
  };
}

function areCalendlySettingsEqual(
  left: CalendlySettingsState,
  right: CalendlySettingsState,
) {
  return (
    JSON.stringify(cloneCalendlySettings(left)) ===
    JSON.stringify(cloneCalendlySettings(right))
  );
}

function getCalendlyMappingFieldKey(typeKey: string) {
  return `mapping:${typeKey}`;
}

const CalendlyAutosaveStatus = ({
  status,
}: {
  status?: CalendlyFieldStatus;
}) => {
  if (!status || status === "idle") return null;

  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
        <RefreshCw className="h-3 w-3 animate-spin" />
        Saving...
      </span>
    );
  }

  if (status === "saved") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
        <Check className="h-3 w-3" />
        Saved
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
      <XCircle className="h-3 w-3" />
      Save failed
    </span>
  );
};

type TeamRoleValue = "owner" | "admin" | "project_manager" | "reviewer";

type TeamMemberRecord = {
  organization_type: string;
  organization_id: string;
  organization_name: string;
  user_id: string;
  email: string;
  role: TeamRoleValue;
  status: string;
  created_at?: string | null;
  updated_at?: string | null;
  last_role_changed_at?: string | null;
};

type TeamInviteRecord = {
  id: string;
  organization_type: string;
  organization_id: string;
  email: string;
  role: Exclude<TeamRoleValue, "owner">;
  status: string;
  invited_by: string;
  expires_at: string;
  created_at?: string | null;
  updated_at?: string | null;
};

type TeamContextResponse = {
  organization_type: string;
  organization_id: string;
  organization_name: string;
  membership_role: TeamRoleValue;
  permissions: string[];
  members: TeamMemberRecord[];
  invites: TeamInviteRecord[];
};

type TeamAuditLogRecord = {
  id: string;
  organization_type: string;
  organization_id: string;
  actor_user_id: string;
  target_user_id?: string | null;
  target_email?: string | null;
  action: string;
  old_role?: string | null;
  new_role?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
};

const getTeamRoleOptions = (
  t: TextTranslator,
): Array<{
  value: Exclude<TeamRoleValue, "owner">;
  label: string;
  description: string;
}> => [
  {
    value: "admin",
    label: t("agencyDashboard.settings.team.roles.admin.label"),
    description: t("agencyDashboard.settings.team.roles.admin.description"),
  },
  {
    value: "project_manager",
    label: t("agencyDashboard.settings.team.roles.projectManager.label"),
    description: t(
      "agencyDashboard.settings.team.roles.projectManager.description",
    ),
  },
  {
    value: "reviewer",
    label: t("agencyDashboard.settings.team.roles.reviewer.label"),
    description: t("agencyDashboard.settings.team.roles.reviewer.description"),
  },
];

const formatTeamRoleLabel = (role: string | undefined, t: TextTranslator) => {
  switch (role) {
    case "owner":
      return t("agencyDashboard.settings.team.roles.owner");
    case "admin":
      return t("agencyDashboard.settings.team.roles.admin.label");
    case "project_manager":
      return t("agencyDashboard.settings.team.roles.projectManager.label");
    case "reviewer":
      return t("agencyDashboard.settings.team.roles.reviewer.label");
    default:
      return role || t("agencyDashboard.settings.team.roles.unknown");
  }
};

const InviteTeamMemberModal = ({
  open,
  onOpenChange,
  email,
  role,
  onEmailChange,
  onRoleChange,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  role: Exclude<TeamRoleValue, "owner">;
  onEmailChange: (value: string) => void;
  onRoleChange: (value: Exclude<TeamRoleValue, "owner">) => void;
  onSubmit: () => void;
  submitting: boolean;
}) => {
  const { t: rawT } = useTranslation();
  const t = createTextTranslator(rawT);
  const teamRoleOptions = getTeamRoleOptions(t);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">
            {t("agencyDashboard.settings.team.modals.inviteTitle")}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 font-medium">
            {t("agencyDashboard.settings.team.modals.inviteDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-bold text-gray-900">
              {t("agencyDashboard.settings.team.modals.emailAddress")}
            </Label>
            <Input
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder={t(
                "agencyDashboard.settings.team.modals.emailPlaceholder",
              )}
              className="h-11 bg-gray-50 border-gray-200 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-bold text-gray-900">
              {t("agencyDashboard.settings.team.userRole")}
            </Label>
            <Select
              value={role}
              onValueChange={(value) =>
                onRoleChange(value as Exclude<TeamRoleValue, "owner">)
              }
            >
              <SelectTrigger className="h-11 bg-gray-50 border-gray-200 rounded-xl">
                <SelectValue
                  placeholder={t("agencyDashboard.settings.team.selectRole")}
                />
              </SelectTrigger>
              <SelectContent>
                {teamRoleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label} - {option.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
            <p className="text-xs text-indigo-700 font-medium leading-relaxed">
              <span className="font-bold">
                {t("agencyDashboard.settings.team.note")}:
              </span>{" "}
              {t("agencyDashboard.settings.team.inviteNote")}
            </p>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="font-bold"
            disabled={submitting}
          >
            {t("agencyDashboard.catalogs.actions.cancel")}
          </Button>
          <Button
            onClick={onSubmit}
            disabled={submitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 rounded-xl flex items-center gap-2"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Mail className="w-4 h-4" />
            )}
            {submitting
              ? t("agencyDashboard.settings.team.modals.sending")
              : t("agencyDashboard.settings.team.modals.sendInvitation")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const EditPermissionsModal = ({
  open,
  onOpenChange,
  member,
  nextRole,
  onRoleChange,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: TeamMemberRecord | null;
  nextRole: Exclude<TeamRoleValue, "owner">;
  onRoleChange: (value: Exclude<TeamRoleValue, "owner">) => void;
  onSubmit: () => void;
  submitting: boolean;
}) => {
  const { t: rawT } = useTranslation();
  const t = createTextTranslator(rawT);
  const teamRoleOptions = getTeamRoleOptions(t);
  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold text-gray-900">
            {t("agencyDashboard.settings.team.modals.updateRoleTitle")}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 font-medium">
            {t("agencyDashboard.settings.team.modals.currentRole", {
              email: member.email,
              role: formatTeamRoleLabel(member.role, t),
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-bold text-gray-900">
              {t("agencyDashboard.settings.team.newRole")}
            </Label>
            <Select
              value={nextRole}
              onValueChange={(value) =>
                onRoleChange(value as Exclude<TeamRoleValue, "owner">)
              }
            >
              <SelectTrigger className="h-11 bg-gray-50 border-gray-200 rounded-xl">
                <SelectValue
                  placeholder={t("agencyDashboard.settings.team.selectRole")}
                />
              </SelectTrigger>
              <SelectContent>
                {teamRoleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label} - {option.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-xs font-medium text-amber-800">
            {t("agencyDashboard.settings.team.modals.roleChangeWarning")}
          </div>
        </div>
        <DialogFooter className="p-6 border-t border-gray-100 gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="font-bold"
            disabled={submitting}
          >
            {t("agencyDashboard.catalogs.actions.cancel")}
          </Button>
          <Button
            onClick={onSubmit}
            disabled={submitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 rounded-xl"
          >
            {submitting
              ? t("agencyDashboard.settings.team.modals.saving")
              : t("agencyDashboard.settings.team.modals.confirmRoleChange")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ActivityLogModal = ({
  open,
  onOpenChange,
  logs,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logs: TeamAuditLogRecord[];
}) => {
  const { t: rawT } = useTranslation();
  const t = createTextTranslator(rawT);
  const decorateActivity = (log: TeamAuditLogRecord) => {
    switch (log.action) {
      case "team_invite_created":
        return {
          label: t("agencyDashboard.settings.team.activity.invitationCreated"),
          details: t(
            "agencyDashboard.settings.team.activity.invitationCreatedDetails",
            {
              member:
                log.target_email ||
                t("agencyDashboard.settings.team.activity.memberFallback"),
              role: formatTeamRoleLabel(log.new_role || "", t),
            },
          ),
          icon: Mail,
          color: "text-indigo-600 bg-indigo-50",
        };
      case "member_role_updated":
        return {
          label: t("agencyDashboard.settings.team.activity.roleUpdated"),
          details: t(
            "agencyDashboard.settings.team.activity.roleUpdatedDetails",
            {
              member:
                log.target_email ||
                t("agencyDashboard.settings.team.activity.memberFallback"),
              oldRole: formatTeamRoleLabel(log.old_role || "", t),
              newRole: formatTeamRoleLabel(log.new_role || "", t),
            },
          ),
          icon: Shield,
          color: "text-amber-600 bg-amber-50",
        };
      case "team_invite_accepted":
        return {
          label: t("agencyDashboard.settings.team.activity.invitationAccepted"),
          details: t(
            "agencyDashboard.settings.team.activity.invitationAcceptedDetails",
            {
              member:
                log.target_email ||
                t("agencyDashboard.settings.team.activity.memberFallback"),
              role: formatTeamRoleLabel(log.new_role || "", t),
            },
          ),
          icon: BadgeCheck,
          color: "text-green-600 bg-green-50",
        };
      case "team_invite_declined":
        return {
          label: t(
            "agencyDashboard.settings.team.activity.invitationDeclined",
            {
              defaultValue: "Invitation declined",
            },
          ),
          details: t(
            "agencyDashboard.settings.team.activity.invitationDeclinedDetails",
            {
              defaultValue: "{{member}} declined the invitation",
              member:
                log.target_email ||
                t("agencyDashboard.settings.team.activity.memberFallback"),
            },
          ),
          icon: XCircle,
          color: "text-red-600 bg-red-50",
        };
      case "member_removed":
        return {
          label: t("agencyDashboard.settings.team.activity.memberRemoved", {
            defaultValue: "Member removed",
          }),
          details: t(
            "agencyDashboard.settings.team.activity.memberRemovedDetails",
            {
              defaultValue: "{{member}} was removed from the team",
              member:
                log.target_email ||
                t("agencyDashboard.settings.team.activity.memberFallback"),
            },
          ),
          icon: User,
          color: "text-red-600 bg-red-50",
        };
      default:
        return {
          label: log.action.replaceAll("_", " "),
          details: log.target_email || "Team activity",
          icon: Activity,
          color: "text-gray-600 bg-gray-50",
        };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold text-gray-900">
            {t("agencyDashboard.settings.team.activity.logTitle", {
              defaultValue: "Team Activity Log",
            })}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 font-medium">
            {t("agencyDashboard.settings.team.activity.logDescription", {
              defaultValue: "Recent invite, role, and membership events",
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-4">
          {logs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
              {t("agencyDashboard.settings.team.activity.empty", {
                defaultValue: "No team activity recorded yet.",
              })}
            </div>
          ) : (
            logs.map((log) => {
              const activity = decorateActivity(log);
              return (
                <div
                  key={log.id}
                  className="flex gap-4 p-4 bg-gray-50/50 border border-gray-100 rounded-2xl"
                >
                  <div
                    className={`w-10 h-10 rounded-xl ${activity.color} flex items-center justify-center shrink-0`}
                  >
                    <activity.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {activity.label}
                    </p>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                      {activity.details}
                    </p>
                    <p className="text-[10px] text-gray-400 font-medium mt-1">
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <DialogFooter className="p-6 border-t border-gray-100">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full font-bold rounded-xl h-11"
          >
            {t("common.close", { defaultValue: "Close" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const GeneralSettingsView = (props: GeneralSettingsViewProps) => {
  const { t: rawT } = useTranslation();
  const t: TextTranslator = (key, options) => {
    if (!key.startsWith("agencyDashboard.settings.")) {
      return asTranslationText(rawT(key, options), key);
    }
    const suffix = key.replace("agencyDashboard.settings.", "");
    const fallback = asTranslationText(
      rawT(`agencyDashboard.analytics.settings.${suffix}`, options),
      key,
    );
    return asTranslationText(
      rawT(key, {
        ...(options || {}),
        defaultValue: fallback,
      }),
      fallback,
    );
  };
  const {
    hasIrlBookingAddon,
    hasProAccess,
    agencyDisplayPlanLabel,
    kycStatus,
  } = props;
  const { profile, refreshProfile, token } = useAuth();
  const { toast } = useToast();
  const normalizedAgencyType = String((profile as any)?.agency_type || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  const isSportsAgency = normalizedAgencyType === "sports_agency";
  const entitySingularTitle = isSportsAgency ? "Athlete" : "Talent";
  const entitySingularLower = isSportsAgency ? "athlete" : "talent";
  const entityPluralLower = isSportsAgency ? "athletes" : "talent";
  const entityNameToken = isSportsAgency ? "{athlete_name}" : "{talent_name}";
  const templateValueForDisplay = (value: string) =>
    isSportsAgency
      ? String(value || "").replaceAll("{talent_name}", "{athlete_name}")
      : String(value || "");
  const templateValueForStorage = (value: string) =>
    isSportsAgency
      ? String(value || "").replaceAll("{athlete_name}", "{talent_name}")
      : String(value || "");
  const [activeTab, setActiveTab] = useState("Profile");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMemberRecord | null>(
    null,
  );
  const [teamContext, setTeamContext] = useState<TeamContextResponse | null>(
    null,
  );
  const [isLoadingTeamContext, setIsLoadingTeamContext] = useState(false);
  const [isSubmittingTeamInvite, setIsSubmittingTeamInvite] = useState(false);
  const [isUpdatingTeamRole, setIsUpdatingTeamRole] = useState(false);
  const [teamInviteEmail, setTeamInviteEmail] = useState("");
  const [teamInviteRole, setTeamInviteRole] =
    useState<Exclude<TeamRoleValue, "owner">>("reviewer");
  const [pendingRoleValue, setPendingRoleValue] =
    useState<Exclude<TeamRoleValue, "owner">>("reviewer");
  const [teamAuditLogs, setTeamAuditLogs] = useState<TeamAuditLogRecord[]>([]);
  const [defaultCommissionRate, setDefaultCommissionRate] =
    useState<number>(20);
  const [isSavingCommissions, setIsSavingCommissions] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState<
    {
      id?: string;
      template_key: string;
      name: string;
      subject: string;
      body: string;
      is_active: boolean;
    }[]
  >([]);
  const [isLoadingEmailTemplates, setIsLoadingEmailTemplates] = useState(false);
  const [isSavingEmailTemplates, setIsSavingEmailTemplates] = useState(false);
  const [showEmailTemplateModal, setShowEmailTemplateModal] = useState(false);
  const [editingTemplateKey, setEditingTemplateKey] = useState<string | null>(
    null,
  );
  const [emailTemplateDraft, setEmailTemplateDraft] = useState({
    name: "",
    subject: "",
    body: "",
    is_active: true,
  });
  const [primaryColor, setPrimaryColor] = useState(
    profile?.primary_color || "#4F46E5",
  );
  const [secondaryColor, setSecondaryColor] = useState(
    profile?.secondary_color || "#10B981",
  );
  const [prodKey, setProdKey] = useState("pk_live_51P2x8S2e3f4g5h6i7j8k9l0m");
  const [testKey, setTestKey] = useState("pk_test_51P2x8S2e3f4g5h6i7j8k9l0m");
  const [showProdKey, setShowProdKey] = useState(false);
  const [showTestKey, setShowTestKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calendly State
  const [calendlySettings, setCalendlySettings] =
    useState<CalendlySettingsState>({
      calendly_api_token: "",
      scheduling_url: "",
      is_enabled: false,
      mappings: {},
    });
  const [lastSavedCalendlySettings, setLastSavedCalendlySettings] =
    useState<CalendlySettingsState>({
      calendly_api_token: "",
      scheduling_url: "",
      is_enabled: false,
      mappings: {},
    });
  const [calendlyEventTypes, setCalendlyEventTypes] = useState<any[]>([]);
  const [isFetchingCalendlyEventTypes, setIsFetchingCalendlyEventTypes] =
    useState(false);
  const [isSavingCalendlySettings, setIsSavingCalendlySettings] =
    useState(false);
  const getEmailTemplateDisplayName = (
    templateKey: string,
    fallback: string,
  ) => {
    if (templateKey.startsWith("booking_confirmation")) {
      return t(
        "agencyDashboard.settings.emailTemplates.templateNames.bookingConfirmation",
        { defaultValue: "Booking Confirmation" },
      );
    }
    if (templateKey.startsWith("invoice_email")) {
      return t(
        "agencyDashboard.settings.emailTemplates.templateNames.invoiceEmail",
        { defaultValue: "Invoice Email" },
      );
    }
    if (templateKey.startsWith("payment_reminder")) {
      return t(
        "agencyDashboard.settings.emailTemplates.templateNames.paymentReminder",
        { defaultValue: "Payment Reminder" },
      );
    }
    return fallback;
  };
  const [isFetchingCalendlySettings, setIsFetchingCalendlySettings] =
    useState(false);
  const hasCalendlyAccess = hasIrlBookingAddon && hasProAccess;
  const [calendlyEventTypesError, setCalendlyEventTypesError] = useState<
    string | null
  >(null);
  const [hasSavedCalendlyToken, setHasSavedCalendlyToken] = useState(false);
  const [isCalendlyMappingsOpen, setIsCalendlyMappingsOpen] = useState(false);
  const [calendlyFieldStatuses, setCalendlyFieldStatuses] = useState<
    Record<string, CalendlyFieldStatus>
  >({});
  const calendlyFieldStatusTimeoutsRef = useRef<Record<string, number>>({});

  const getAccessToken = () => token || "";

  const fetchTeamContext = async () => {
    try {
      setIsLoadingTeamContext(true);
      const resp = await fetch(
        "/api/team/context?organization_type=agency&include_details=true",
        {
          headers: {
            Authorization: `Bearer ${getAccessToken()}`,
          },
        },
      );
      const payload = await parseApiResponse(resp);
      if (!resp.ok) {
        throw new Error(
          payload?.message || payload?.error || "Failed to load team members.",
        );
      }
      setTeamContext(payload);
    } catch (error: any) {
      console.error("Failed to load team context", error);
      toast({
        title: "Failed to load team",
        description:
          error?.message || "Could not load team members and invitations.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTeamContext(false);
    }
  };

  const fetchTeamAuditLogs = async () => {
    try {
      const payload = (await getTeamAuditLogs()) as TeamAuditLogRecord[];
      setTeamAuditLogs(Array.isArray(payload) ? payload : []);
    } catch (error) {
      console.error("Failed to load team audit logs", error);
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
    setShowPermissionsModal(true);
  };

  const handleInviteTeamMember = async () => {
    try {
      const normalizedEmail = String(teamInviteEmail || "")
        .trim()
        .toLowerCase();
      if (!normalizedEmail) {
        throw new Error("Email is required.");
      }
      setIsSubmittingTeamInvite(true);
      const resp = await fetch("/api/team/invites?organization_type=agency", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify({
          email: normalizedEmail,
          role: teamInviteRole,
        }),
      });
      const payload = await parseApiResponse(resp);
      if (!resp.ok) {
        throw new Error(
          payload?.message || payload?.error || "Failed to send invitation.",
        );
      }
      setShowInviteModal(false);
      setTeamInviteEmail("");
      setTeamInviteRole("reviewer");
      toast({
        title: "Invitation sent",
        description: `${normalizedEmail} has been invited to your team.`,
      });
      await fetchTeamContext();
      await fetchTeamAuditLogs();
    } catch (error: any) {
      toast({
        title: "Invite failed",
        description: error?.message || "Could not send the team invitation.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingTeamInvite(false);
    }
  };

  const handleUpdateMemberRole = async () => {
    if (!selectedMember) return;
    try {
      setIsUpdatingTeamRole(true);
      const resp = await fetch(
        `/api/team/members/${encodeURIComponent(selectedMember.user_id)}/role?organization_type=agency`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getAccessToken()}`,
          },
          body: JSON.stringify({
            role: pendingRoleValue,
          }),
        },
      );
      const payload = await parseApiResponse(resp);
      if (!resp.ok) {
        throw new Error(
          payload?.message || payload?.error || "Failed to update member role.",
        );
      }
      setShowPermissionsModal(false);
      setSelectedMember(null);
      toast({
        title: t("agencyDashboard.settings.team.activity.roleUpdated"),
        description: t(
          "agencyDashboard.settings.team.toasts.roleUpdatedDescription",
          {
            email: selectedMember.email,
            role: formatTeamRoleLabel(pendingRoleValue, t),
          },
        ),
      });
      await fetchTeamContext();
      await fetchTeamAuditLogs();
    } catch (error: any) {
      toast({
        title: "Role update failed",
        description: error?.message || "Could not update the member role.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingTeamRole(false);
    }
  };

  useEffect(() => {
    void fetchTeamContext();
  }, []);

  useEffect(() => {
    if (activeTab === "Team") {
      void fetchTeamContext();
      void fetchTeamAuditLogs();
    }
  }, [activeTab]);

  const setCalendlyFieldStatus = (
    fieldKey: string,
    status: CalendlyFieldStatus,
  ) => {
    const existingTimeout = calendlyFieldStatusTimeoutsRef.current[fieldKey];
    if (existingTimeout) {
      window.clearTimeout(existingTimeout);
      delete calendlyFieldStatusTimeoutsRef.current[fieldKey];
    }

    setCalendlyFieldStatuses((prev) => ({
      ...prev,
      [fieldKey]: status,
    }));

    if (status === "saved") {
      calendlyFieldStatusTimeoutsRef.current[fieldKey] = window.setTimeout(
        () => {
          setCalendlyFieldStatuses((prev) => ({
            ...prev,
            [fieldKey]: "idle",
          }));
          delete calendlyFieldStatusTimeoutsRef.current[fieldKey];
        },
        1800,
      );
    }
  };

  const updateCalendlySettings = (
    updater:
      | CalendlySettingsState
      | ((previous: CalendlySettingsState) => CalendlySettingsState),
  ) => {
    let nextSettings!: CalendlySettingsState;
    setCalendlySettings((previous) => {
      nextSettings =
        typeof updater === "function"
          ? cloneCalendlySettings(updater(previous))
          : cloneCalendlySettings(updater);
      return nextSettings;
    });
    return nextSettings;
  };

  const fetchCalendlySettings = async () => {
    if (!hasCalendlyAccess) {
      setIsFetchingCalendlySettings(false);
      setHasSavedCalendlyToken(false);
      setCalendlyEventTypesError(null);
      const emptySettings = cloneCalendlySettings({
        calendly_api_token: "",
        scheduling_url: "",
        is_enabled: false,
        mappings: {},
      });
      setCalendlySettings(emptySettings);
      setLastSavedCalendlySettings(emptySettings);
      return null;
    }
    try {
      setIsFetchingCalendlySettings(true);
      const resp = await fetch("/api/calendly/settings", {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
      });
      const payload = await parseApiResponse(resp);
      if (payload.status !== "success" || !payload.data) {
        throw new Error(payload.message || "Failed to load Calendly settings");
      }
      const data = payload.data;
      if (data) {
        const normalizedSettings = cloneCalendlySettings({
          calendly_api_token: data.calendly_api_token || "",
          scheduling_url: data.scheduling_url || "",
          is_enabled: data.is_enabled ?? false,
          mappings: data.mappings || {},
        });
        setCalendlySettings(normalizedSettings);
        setLastSavedCalendlySettings(normalizedSettings);
        setHasSavedCalendlyToken(Boolean(data.calendly_api_token?.trim()));
        return data;
      }
    } catch (err: any) {
      console.error("Error fetching Calendly settings:", err);
      setHasSavedCalendlyToken(false);
      setCalendlyEventTypesError(
        err.message || "Failed to load your saved Calendly configuration.",
      );
    } finally {
      setIsFetchingCalendlySettings(false);
    }
    return null;
  };

  const fetchCalendlyEventTypes = async () => {
    if (!hasCalendlyAccess) {
      setIsFetchingCalendlyEventTypes(false);
      setCalendlyEventTypes([]);
      setCalendlyEventTypesError(null);
      return;
    }
    try {
      setIsFetchingCalendlyEventTypes(true);
      setCalendlyEventTypesError(null);
      const resp = await fetch("/api/calendly/event-types", {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
      });
      const data = await parseApiResponse(resp);
      if (data.status === "success" && Array.isArray(data.data)) {
        setCalendlyEventTypes(data.data);
        setCalendlySettings((prev) => ({
          ...prev,
          mappings: normalizeCalendlyMappingsWithEventTypes(
            prev.mappings,
            data.data,
          ),
        }));
      } else {
        setCalendlyEventTypes([]);
        setCalendlyEventTypesError(
          withCalendlyManualMappingGuidance(
            data.message || "Failed to load Calendly event types.",
          ),
        );
      }
    } catch (err: any) {
      console.error("Error fetching Calendly event types:", err);
      setCalendlyEventTypes([]);
      setCalendlyEventTypesError(
        withCalendlyManualMappingGuidance(
          err.message || "Failed to load Calendly event types.",
        ),
      );
    } finally {
      setIsFetchingCalendlyEventTypes(false);
    }
  };

  const handleSaveCalendlySettings = async ({
    nextSettings,
    fieldKey,
    silentSuccess = false,
  }: {
    nextSettings?: CalendlySettingsState;
    fieldKey?: string;
    silentSuccess?: boolean;
  } = {}) => {
    if (!hasCalendlyAccess) {
      toast({
        title: "Pro plan required",
        description:
          "Calendly integration is available on Pro plans with the IRL Booking add-on.",
        variant: "destructive",
      });
      return;
    }
    if (!hasIrlBookingAddon) {
      toast({
        title: "IRL Booking add-on required",
        description:
          "Enable the IRL Booking add-on before configuring Calendly integration.",
        variant: "destructive",
      });
      return;
    }

    const payload = cloneCalendlySettings(nextSettings || calendlySettings);
    if (fieldKey) {
      setCalendlyFieldStatus(fieldKey, "saving");
    }

    try {
      setIsSavingCalendlySettings(true);
      setCalendlyEventTypesError(null);
      const resp = await fetch("/api/calendly/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await parseApiResponse(resp);
      if (data.status === "success") {
        const savedSettings = cloneCalendlySettings({
          calendly_api_token:
            data.data?.calendly_api_token || payload.calendly_api_token,
          scheduling_url: data.data?.scheduling_url || payload.scheduling_url,
          is_enabled: data.data?.is_enabled ?? payload.is_enabled,
          mappings: data.data?.mappings || payload.mappings,
        });
        if (data.data) {
          setCalendlySettings(savedSettings);
          setHasSavedCalendlyToken(
            Boolean(data.data.calendly_api_token?.trim()),
          );
        } else {
          setCalendlySettings(savedSettings);
          setHasSavedCalendlyToken(Boolean(payload.calendly_api_token.trim()));
        }
        setLastSavedCalendlySettings(savedSettings);
        if (fieldKey) {
          setCalendlyFieldStatus(fieldKey, "saved");
        }
        if (!silentSuccess) {
          toast({
            title: "Settings Saved",
            description:
              data.message ||
              "Calendly integration settings have been updated.",
          });
        }
        if (
          payload.calendly_api_token.trim() &&
          (payload.calendly_api_token !==
            lastSavedCalendlySettings.calendly_api_token ||
            calendlyEventTypes.length === 0)
        ) {
          await fetchCalendlyEventTypes();
        } else if (!payload.calendly_api_token.trim()) {
          setCalendlyEventTypes([]);
        }
        return true;
      } else {
        throw new Error(data.message || "Failed to save Calendly settings");
      }
    } catch (err: any) {
      setCalendlyEventTypesError(err.message || null);
      if (fieldKey) {
        setCalendlyFieldStatus(fieldKey, "error");
      }
      toast({
        title: "Error",
        description: err.message || "Failed to save Calendly settings",
        variant: "destructive",
      });
    } finally {
      setIsSavingCalendlySettings(false);
    }
    return false;
  };

  const [bankStatusLoading, setBankStatusLoading] = useState(false);
  const [bankStatus, setBankStatus] = useState<{
    connected: boolean;
    bank_last4?: string;
  } | null>(null);

  const planTier = useMemo(() => {
    const t = (profile as any)?.plan_tier;
    return typeof t === "string" && t.trim() ? t.trim().toLowerCase() : "free";
  }, [profile]);

  const planLabel = useMemo(() => {
    if (planTier === "pro") return "Pro";
    if (planTier === "basic") return "Basic";
    if (planTier === "enterprise") return "Enterprise";
    return "Free";
  }, [planTier]);

  const currentPlanDisplay = useMemo(() => {
    const label = String(agencyDisplayPlanLabel || "").trim();
    const normalized = label
      .replace(/\b(annual|monthly)\b/gi, "")
      .replace(/\bplan\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    if (normalized) return normalized;
    return planLabel;
  }, [agencyDisplayPlanLabel, planLabel]);

  useEffect(() => {
    if (activeTab !== "Integrations") return;
    let mounted = true;
    (async () => {
      setBankStatusLoading(true);
      try {
        const resp = await getAgencyPayoutsAccountStatus();
        const data = (resp as any)?.data ?? resp;
        if (!mounted) return;
        const last4 = String((data as any)?.bank_last4 || "").trim();
        setBankStatus({
          connected: Boolean((data as any)?.connected),
          bank_last4: last4 || undefined,
        });
      } catch {
        if (!mounted) return;
        setBankStatus(null);
      } finally {
        if (mounted) setBankStatusLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "Integrations") return;
    if (!hasIrlBookingAddon) {
      setHasSavedCalendlyToken(false);
      setCalendlyEventTypesError(null);
      const emptySettings = cloneCalendlySettings({
        calendly_api_token: "",
        scheduling_url: "",
        is_enabled: false,
        mappings: {},
      });
      setCalendlySettings(emptySettings);
      setLastSavedCalendlySettings(emptySettings);
      setCalendlyEventTypes([]);
      return;
    }
    let mounted = true;
    void (async () => {
      const data = await fetchCalendlySettings();
      if (!mounted) return;
      if (data?.calendly_api_token) {
        await fetchCalendlyEventTypes();
      } else {
        setCalendlyEventTypes([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [activeTab, hasIrlBookingAddon, profile?.id]);

  useEffect(() => {
    if (!hasIrlBookingAddon || !calendlySettings.is_enabled) {
      setIsCalendlyMappingsOpen(false);
      return;
    }

    if (
      calendlyEventTypesError ||
      Object.keys(calendlySettings.mappings || {}).length > 0
    ) {
      setIsCalendlyMappingsOpen(true);
    }
  }, [
    calendlyEventTypesError,
    calendlySettings.is_enabled,
    calendlySettings.mappings,
    hasIrlBookingAddon,
  ]);

  useEffect(() => {
    return () => {
      Object.values(calendlyFieldStatusTimeoutsRef.current).forEach(
        (timeoutId) => window.clearTimeout(timeoutId),
      );
    };
  }, []);

  const autosaveCalendlyField = async (
    fieldKey: string,
    nextSettings?: CalendlySettingsState,
  ) => {
    const settingsToSave = cloneCalendlySettings(
      nextSettings || calendlySettings,
    );
    if (areCalendlySettingsEqual(settingsToSave, lastSavedCalendlySettings)) {
      return;
    }
    await handleSaveCalendlySettings({
      nextSettings: settingsToSave,
      fieldKey,
      silentSuccess: true,
    });
  };

  const defaultNotificationPrefs = [
    {
      key: "booking_created",
      title: t(
        "agencyDashboard.settings.notifications.events.bookingCreated.title",
        {
          defaultValue: "Booking Created",
        },
      ),
      desc: t(
        "agencyDashboard.settings.notifications.events.bookingCreated.desc",
        {
          defaultValue: "When a new booking is created",
        },
      ),
      channels: { email: true, sms: false, push: false },
    },
    {
      key: "booking_confirmed",
      title: t(
        "agencyDashboard.settings.notifications.events.bookingConfirmed.title",
        {
          defaultValue: "Booking Confirmed",
        },
      ),
      desc: t(
        "agencyDashboard.settings.notifications.events.bookingConfirmed.desc",
        {
          defaultValue: "When a booking status changes to confirmed",
        },
      ),
      channels: { email: true, sms: false, push: false },
    },
    {
      key: "payment_received",
      title: t(
        "agencyDashboard.settings.notifications.events.paymentReceived.title",
        {
          defaultValue: "Payment Received",
        },
      ),
      desc: t(
        "agencyDashboard.settings.notifications.events.paymentReceived.desc",
        {
          defaultValue: "When payment is received from a client",
        },
      ),
      channels: { email: true, sms: false, push: false },
    },
    {
      key: "invoice_sent",
      title: t(
        "agencyDashboard.settings.notifications.events.invoiceSent.title",
        {
          defaultValue: "Invoice Sent",
        },
      ),
      desc: t(
        "agencyDashboard.settings.notifications.events.invoiceSent.desc",
        {
          defaultValue: "When an invoice is sent to a client",
        },
      ),
      channels: { email: true, sms: false, push: false },
    },
    {
      key: "talent_book_out",
      title: t(
        "agencyDashboard.settings.notifications.events.entityBookOut.title",
        {
          entitySingular: entitySingularTitle,
          defaultValue: `${entitySingularTitle} Book Out`,
        },
      ),
      desc: t(
        "agencyDashboard.settings.notifications.events.entityBookOut.desc",
        {
          entitySingularLower,
          defaultValue: `When ${entitySingularLower} marks themselves unavailable`,
        },
      ),
      channels: { email: true, sms: false, push: false },
    },
    {
      key: "license_expiring",
      title: t(
        "agencyDashboard.settings.notifications.events.licenseExpiring.title",
        {
          defaultValue: "License Expiring",
        },
      ),
      desc: t(
        "agencyDashboard.settings.notifications.events.licenseExpiring.desc",
        {
          entitySingularLower,
          defaultValue: `When a ${entitySingularLower} license is about to expire`,
        },
      ),
      channels: { email: true, sms: false, push: false },
    },
  ] as {
    key: string;
    title: string;
    desc: string;
    channels: { email: boolean; sms: boolean; push: boolean };
  }[];

  const [notificationPrefs, setNotificationPrefs] = useState(
    defaultNotificationPrefs,
  );
  const [notificationRecipients, setNotificationRecipients] = useState({
    primaryEmail: "",
    smsNumber: "",
    additionalEmails: "",
  });
  const [isSavingNotificationSettings, setIsSavingNotificationSettings] =
    useState(false);

  const [taxCurrencySettings, setTaxCurrencySettings] = useState({
    defaultCurrency: "usd",
    currencyDisplayFormat: "1234.56",
    defaultTaxRatePct: "8.875",
    taxDisplayName: "Sales Tax",
    includeTaxInDisplayedPrices: true,
    defaultPaymentTerms: "net30",
    latePaymentFeePct: "1.5",
    invoicePrefix: "INV-",
  });
  const [isSavingTaxCurrencySettings, setIsSavingTaxCurrencySettings] =
    useState(false);

  const [formData, setFormData] = useState({
    agency_name: "",
    legal_entity_name: "",
    address: "",
    city: "",
    state: "",
    zip_postal_code: "",
    country: "us",
    time_zone: "est",
    phone_number: "",
    email: "",
    website: "",
    tax_id_ein: "",
    email_signature: "",
  });

  useEffect(() => {
    if (profile) {
      // For team members, use organization_id for settings queries.
      // This ensures team members see and modify the organization's settings,
      // not their own (which shouldn't exist for team members).
      const effectiveAgencyId = (profile as any).organization_id || profile.id;

      setFormData({
        agency_name: profile.agency_name || "",
        legal_entity_name: profile.legal_entity_name || "",
        address: profile.address || "",
        city: profile.city || "",
        state: profile.state || "",
        zip_postal_code: profile.zip_postal_code || "",
        country: profile.country || "us",
        time_zone: profile.time_zone || "est",
        phone_number: profile.phone_number || "",
        email: profile.email || "",
        website: profile.website || "",
        tax_id_ein: profile.tax_id_ein || "",
        email_signature: profile.email_signature || "",
      });
      setPrimaryColor(profile.primary_color || "#4F46E5");
      setSecondaryColor(profile.secondary_color || "#10B981");

      (async () => {
        try {
          const { data, error } = await supabase
            .from("agency_commission_settings")
            .select("default_commission_bps, division_commissions")
            .eq("agency_id", effectiveAgencyId)
            .maybeSingle();

          if (error) throw error;
          if (!data) return;

          if (typeof data.default_commission_bps === "number") {
            setDefaultCommissionRate(
              Math.max(0, Math.min(100, data.default_commission_bps / 100)),
            );
          }
        } catch (e: any) {
          toast({
            title: "Failed to load commission settings",
            description: getUserFriendlyError(e),
            variant: "destructive",
          });
        }
      })();

      (async () => {
        try {
          const { data, error } = await supabase
            .from("agency_notification_settings")
            .select("prefs, recipients")
            .eq("agency_id", effectiveAgencyId)
            .maybeSingle();
          if (error) throw error;

          if (!data) {
            const seedPayload = {
              agency_id: effectiveAgencyId,
              prefs: defaultNotificationPrefs,
              recipients: {
                primaryEmail: profile.email || "",
                smsNumber: "",
                additionalEmails: "",
              },
              updated_at: new Date().toISOString(),
            };
            const { error: seedError } = await supabase
              .from("agency_notification_settings")
              .upsert(seedPayload, { onConflict: "agency_id" });
            if (seedError) throw seedError;
            setNotificationPrefs(defaultNotificationPrefs);
            setNotificationRecipients(seedPayload.recipients);
            return;
          }

          const prefs = Array.isArray((data as any)?.prefs)
            ? (data as any).prefs
            : null;
          const recipientsObj =
            (data as any)?.recipients &&
            typeof (data as any).recipients === "object"
              ? (data as any).recipients
              : null;

          if (prefs) {
            const normalized = defaultNotificationPrefs.map((d) => {
              const found = prefs.find((p: any) => String(p?.key) === d.key);
              const ch = found?.channels || {};
              return {
                ...d,
                channels: {
                  email:
                    typeof ch.email === "boolean" ? ch.email : d.channels.email,
                  sms: false,
                  push: false,
                },
              };
            });
            setNotificationPrefs(normalized);
          } else {
            setNotificationPrefs(defaultNotificationPrefs);
          }

          setNotificationRecipients({
            primaryEmail:
              typeof recipientsObj?.primaryEmail === "string"
                ? recipientsObj.primaryEmail
                : profile.email || "",
            smsNumber:
              typeof recipientsObj?.smsNumber === "string"
                ? recipientsObj.smsNumber
                : "",
            additionalEmails:
              typeof recipientsObj?.additionalEmails === "string"
                ? recipientsObj.additionalEmails
                : "",
          });
        } catch (e: any) {
          setNotificationPrefs(defaultNotificationPrefs);
          setNotificationRecipients({
            primaryEmail: profile.email || "",
            smsNumber: "",
            additionalEmails: "",
          });
          toast({
            title: "Failed to load notification settings",
            description: getUserFriendlyError(e),
            variant: "destructive",
          });
        }
      })();

      (async () => {
        try {
          const { data, error } = await supabase
            .from("agency_tax_currency_settings")
            .select(
              "default_currency, currency_display_format, default_tax_rate, tax_display_name, include_tax_in_displayed_prices, default_payment_terms, late_payment_fee, invoice_prefix",
            )
            .eq("agency_id", effectiveAgencyId)
            .maybeSingle();
          if (error) throw error;

          if (!data) {
            const seedPayload = {
              agency_id: effectiveAgencyId,
              default_currency: taxCurrencySettings.defaultCurrency,
              currency_display_format:
                taxCurrencySettings.currencyDisplayFormat,
              default_tax_rate: Number(
                String(taxCurrencySettings.defaultTaxRatePct || "0").replace(
                  /,/g,
                  ".",
                ),
              ),
              tax_display_name: taxCurrencySettings.taxDisplayName,
              include_tax_in_displayed_prices:
                !!taxCurrencySettings.includeTaxInDisplayedPrices,
              default_payment_terms: taxCurrencySettings.defaultPaymentTerms,
              late_payment_fee: Number(
                String(taxCurrencySettings.latePaymentFeePct || "0").replace(
                  /,/g,
                  ".",
                ),
              ),
              invoice_prefix: taxCurrencySettings.invoicePrefix,
              updated_at: new Date().toISOString(),
            };
            const { error: seedError } = await supabase
              .from("agency_tax_currency_settings")
              .upsert(seedPayload, { onConflict: "agency_id" });
            if (seedError) throw seedError;
            return;
          }

          const d: any = data;
          setTaxCurrencySettings((prev) => ({
            ...prev,
            defaultCurrency:
              typeof d.default_currency === "string"
                ? d.default_currency
                : prev.defaultCurrency,
            currencyDisplayFormat:
              typeof d.currency_display_format === "string"
                ? d.currency_display_format
                : prev.currencyDisplayFormat,
            defaultTaxRatePct:
              typeof d.default_tax_rate === "number" ||
              typeof d.default_tax_rate === "string"
                ? String(d.default_tax_rate)
                : prev.defaultTaxRatePct,
            taxDisplayName:
              typeof d.tax_display_name === "string"
                ? d.tax_display_name
                : prev.taxDisplayName,
            includeTaxInDisplayedPrices:
              typeof d.include_tax_in_displayed_prices === "boolean"
                ? d.include_tax_in_displayed_prices
                : prev.includeTaxInDisplayedPrices,
            defaultPaymentTerms:
              typeof d.default_payment_terms === "string"
                ? d.default_payment_terms
                : prev.defaultPaymentTerms,
            latePaymentFeePct:
              typeof d.late_payment_fee === "number" ||
              typeof d.late_payment_fee === "string"
                ? String(d.late_payment_fee)
                : prev.latePaymentFeePct,
            invoicePrefix:
              typeof d.invoice_prefix === "string"
                ? d.invoice_prefix
                : prev.invoicePrefix,
          }));
        } catch (e: any) {
          toast({
            title: "Failed to load tax & currency settings",
            description: getUserFriendlyError(e),
            variant: "destructive",
          });
        }
      })();

      (async () => {
        try {
          setIsLoadingEmailTemplates(true);
          const { data, error } = await supabase
            .from("agency_email_templates")
            .select("id, template_key, name, subject, body, is_active")
            .eq("agency_id", effectiveAgencyId)
            .order("updated_at", { ascending: false });

          if (error) throw error;

          if (Array.isArray(data) && data.length > 0) {
            const mapped = data.map((t: any) => ({
              id: t.id,
              template_key: t.template_key,
              name: t.name,
              subject: templateValueForDisplay(t.subject),
              body: templateValueForDisplay(t.body),
              is_active: !!t.is_active,
            }));
            const order = new Map<string, number>([
              ["booking_confirmation", 1],
              ["invoice_email", 2],
              ["payment_reminder", 3],
            ]);
            mapped.sort((a, b) => {
              const aKey = String(a.template_key || "");
              const bKey = String(b.template_key || "");
              const aRank = order.get(aKey) ?? 99;
              const bRank = order.get(bKey) ?? 99;
              if (aRank !== bRank) return aRank - bRank;
              return aKey.localeCompare(bKey);
            });
            setEmailTemplates(mapped);
            return;
          }

          const defaults = [
            {
              template_key: "booking_confirmation",
              name: "Booking Confirmation",
              subject: "Booking Confirmed - {client_name}",
              body: `Hi ${entityNameToken},\n\nYour booking with {client_name} on {booking_date} at {call_time} has been confirmed.\n\nLocation: {location}\nRate: {rate}\n\nBest regards,\n{agency_name}`,
              is_active: true,
            },
            {
              template_key: "invoice_email",
              name: "Invoice Email",
              subject: "Invoice {invoice_number} from {agency_name}",
              body: "Dear {client_name},\n\nPlease find attached invoice {invoice_number} for the amount of {invoice_total}.\n\nPayment terms: {payment_terms}\n\nThank you for your business.\n\n{agency_name}",
              is_active: true,
            },
            {
              template_key: "payment_reminder",
              name: "Payment Reminder",
              subject: "Payment Reminder - Invoice {invoice_number}",
              body: "Dear {client_name},\n\nThis is a friendly reminder that invoice {invoice_number} for {invoice_total} is due on {due_date}.\n\nIf you have already made the payment, please disregard this message.\n\nThank you,\n{agency_name}",
              is_active: true,
            },
          ];

          const seedPayload = defaults.map((t) => ({
            agency_id: effectiveAgencyId,
            template_key: t.template_key,
            name: t.name,
            subject: templateValueForStorage(t.subject),
            body: templateValueForStorage(t.body),
            is_active: t.is_active,
            updated_at: new Date().toISOString(),
          }));

          const { error: seedError } = await supabase
            .from("agency_email_templates")
            .upsert(seedPayload, { onConflict: "agency_id,template_key" });

          if (seedError) throw seedError;
          setEmailTemplates(defaults);
        } catch (e: any) {
          toast({
            title: "Failed to load email templates",
            description: getUserFriendlyError(e),
            variant: "destructive",
          });
        } finally {
          setIsLoadingEmailTemplates(false);
        }
      })();
    }
  }, [profile]);

  const saveNotificationSettings = async () => {
    setIsSavingNotificationSettings(true);
    try {
      const payload = {
        agency_id: profile?.id,
        prefs: notificationPrefs,
        recipients: notificationRecipients,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("agency_notification_settings")
        .upsert(payload, { onConflict: "agency_id" });

      if (error) throw error;
      toast({
        title: "Notification settings saved",
        description: "Your notification preferences have been updated.",
      });
    } catch (e: any) {
      toast({
        title: "Failed to save notification settings",
        description: getUserFriendlyError(e),
        variant: "destructive" as any,
      });
    } finally {
      setIsSavingNotificationSettings(false);
    }
  };

  const saveTaxCurrencySettings = async () => {
    setIsSavingTaxCurrencySettings(true);
    try {
      const defaultTaxRate = Number(
        String(taxCurrencySettings.defaultTaxRatePct || "0").replace(/,/g, "."),
      );
      const latePaymentFee = Number(
        String(taxCurrencySettings.latePaymentFeePct || "0").replace(/,/g, "."),
      );

      const payload = {
        agency_id: profile?.id,
        default_currency: taxCurrencySettings.defaultCurrency,
        currency_display_format: taxCurrencySettings.currencyDisplayFormat,
        default_tax_rate: Number.isFinite(defaultTaxRate) ? defaultTaxRate : 0,
        tax_display_name: taxCurrencySettings.taxDisplayName,
        include_tax_in_displayed_prices:
          !!taxCurrencySettings.includeTaxInDisplayedPrices,
        default_payment_terms: taxCurrencySettings.defaultPaymentTerms,
        late_payment_fee: Number.isFinite(latePaymentFee) ? latePaymentFee : 0,
        invoice_prefix: taxCurrencySettings.invoicePrefix,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("agency_tax_currency_settings")
        .upsert(payload, { onConflict: "agency_id" });

      if (error) throw error;
      toast({
        title: "Tax & currency settings saved",
        description: "Your settings have been updated.",
      });
    } catch (e: any) {
      toast({
        title: "Failed to save tax & currency settings",
        description: getUserFriendlyError(e),
        variant: "destructive" as any,
      });
    } finally {
      setIsSavingTaxCurrencySettings(false);
    }
  };

  const openNewEmailTemplate = () => {
    setEditingTemplateKey(null);
    setEmailTemplateDraft({
      name: "",
      subject: "",
      body: "",
      is_active: true,
    });
    setShowEmailTemplateModal(true);
  };

  const openEditEmailTemplate = (template: {
    template_key: string;
    name: string;
    subject: string;
    body: string;
    is_active: boolean;
  }) => {
    setEditingTemplateKey(template.template_key);
    setEmailTemplateDraft({
      name: template.name,
      subject: template.subject,
      body: template.body,
      is_active: template.is_active,
    });
    setShowEmailTemplateModal(true);
  };

  const duplicateEmailTemplate = (template: {
    template_key: string;
    name: string;
    subject: string;
    body: string;
    is_active: boolean;
  }) => {
    const suffix = Math.random().toString(16).slice(2, 8);
    const template_key = `${template.template_key}_${suffix}`;
    setEmailTemplates((prev) => [
      {
        template_key,
        name: `${template.name} (Copy)`,
        subject: template.subject,
        body: template.body,
        is_active: template.is_active,
      },
      ...prev,
    ]);
  };

  const saveEmailTemplateDraft = () => {
    const name = (emailTemplateDraft.name || "").trim();
    const subject = (emailTemplateDraft.subject || "").trim();
    const body = (emailTemplateDraft.body || "").trim();
    if (!name || !subject || !body) {
      toast({
        title: "Missing fields",
        description: "Please fill in name, subject, and body.",
        variant: "destructive",
      });
      return;
    }

    setEmailTemplates((prev) => {
      if (editingTemplateKey) {
        return prev.map((t) =>
          t.template_key === editingTemplateKey
            ? {
                ...t,
                name,
                subject,
                body,
                is_active: emailTemplateDraft.is_active,
              }
            : t,
        );
      }
      const base = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .slice(0, 32);
      const template_key = `${base}_${Math.random().toString(16).slice(2, 8)}`;
      return [
        {
          template_key,
          name,
          subject,
          body,
          is_active: emailTemplateDraft.is_active,
        },
        ...prev,
      ];
    });

    setShowEmailTemplateModal(false);
  };

  const handleSaveEmailTemplates = async () => {
    if (!profile?.id) return;
    const effectiveAgencyId = (profile as any).organization_id || profile.id;
    try {
      setIsSavingEmailTemplates(true);
      const payload = emailTemplates.map((t) => ({
        id: t.id,
        agency_id: effectiveAgencyId,
        template_key: t.template_key,
        name: t.name,
        subject: templateValueForStorage(t.subject),
        body: templateValueForStorage(t.body),
        is_active: t.is_active,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("agency_email_templates")
        .upsert(payload, { onConflict: "agency_id,template_key" });

      if (error) throw error;
      toast({
        title: "Email templates saved",
        description: "Your email templates have been saved.",
      });
    } catch (e: any) {
      toast({
        title: "Error",
        description: getUserFriendlyError(e),
        variant: "destructive",
      });
    } finally {
      setIsSavingEmailTemplates(false);
    }
  };

  const handleSaveCommissionSettings = async () => {
    if (!profile?.id) return;
    const effectiveAgencyId = (profile as any).organization_id || profile.id;
    try {
      setIsSavingCommissions(true);

      const payload = {
        agency_id: effectiveAgencyId,
        default_commission_bps: Math.round(
          Math.max(0, Math.min(100, defaultCommissionRate)) * 100,
        ),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("agency_commission_settings")
        .upsert(payload, { onConflict: "agency_id" });

      if (error) throw error;

      toast({
        title: "Commission settings saved",
        description: "Your commission settings have been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: getUserFriendlyError(error),
        variant: "destructive",
      });
    } finally {
      setIsSavingCommissions(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    if (!profile?.id) return;
    // For team members, update the organization's profile (owner's profile)
    const effectiveAgencyId = (profile as any).organization_id || profile.id;
    try {
      setIsSaving(true);
      // Exclude email from update payload as it's not allowed to be changed after sign-in
      const { email, ...updateData } = formData;
      const { error } = await supabase
        .from("agencies")
        .update({
          ...updateData,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          updated_at: new Date().toISOString(),
        })
        .eq("id", effectiveAgencyId);

      if (error) throw error;

      await refreshProfile();
      toast({
        title: "Settings Saved",
        description: "Your agency profile has been updated successfully.",
      });
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: getUserFriendlyError(error),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    // For team members, update the organization's profile (owner's profile)
    const effectiveAgencyId = (profile as any).organization_id || profile.id;

    try {
      setIsUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${effectiveAgencyId}-${Math.random()}.${fileExt}`;
      const filePath = `agency-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("likelee-public")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("likelee-public").getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("agencies")
        .update({ logo_url: publicUrl })
        .eq("id", effectiveAgencyId);

      if (updateError) throw updateError;

      await refreshProfile();
      toast({
        title: "Logo Updated",
        description: "Your agency logo has been updated successfully.",
      });
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast({
        title: "Error",
        description: getUserFriendlyError(error),
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-full mx-auto">
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            {t("agencyDashboard.settings.title", { defaultValue: "Settings" })}
          </h2>
          <p className="text-sm sm:text-base text-gray-600 font-medium">
            {t("agencyDashboard.settings.profile.subtitle", {
              defaultValue: "Manage your agency profile and settings",
            })}
          </p>
        </div>

        <div className="flex gap-2 p-1 bg-gray-100/50 rounded-xl w-full overflow-x-auto no-scrollbar lg:w-fit">
          {[
            {
              key: "Profile",
              label: t("agencyDashboard.settings.subTabs.profile", {
                defaultValue: "Profile",
              }),
            },
            {
              key: "Commissions",
              label: t("agencyDashboard.settings.subTabs.commissions", {
                defaultValue: "Commissions",
              }),
            },
            {
              key: "Email Templates",
              label: t("agencyDashboard.settings.subTabs.emailTemplates", {
                defaultValue: "Email Templates",
              }),
            },
            {
              key: "Notifications",
              label: t("agencyDashboard.settings.subTabs.notifications", {
                defaultValue: "Notifications",
              }),
            },
            {
              key: "Tax & Currency",
              label: t("agencyDashboard.settings.subTabs.taxAndCurrency", {
                defaultValue: "Tax & Currency",
              }),
            },
            {
              key: "Team",
              label: t("agencyDashboard.settings.subTabs.team", {
                defaultValue: "Team",
              }),
            },
            {
              key: "File Storage",
              label: t("agencyDashboard.settings.subTabs.fileStorage", {
                defaultValue: "File Storage",
              }),
            },
            {
              key: "Integrations",
              label: t("agencyDashboard.settings.subTabs.integrations", {
                defaultValue: "Integrations",
              }),
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "Profile" && (
          <div className="space-y-6">
            <Card
              className={`p-4 sm:p-6 border shadow-sm rounded-2xl transition-all duration-300 ${
                planTier === "pro"
                  ? "bg-[#0F1225] border-indigo-500/30 text-white"
                  : planTier === "basic" || planTier === "agency"
                    ? "bg-emerald-50 border-emerald-100 text-gray-900"
                    : planTier === "enterprise"
                      ? "bg-amber-50 border-amber-200 text-gray-900"
                      : "bg-white border-gray-200 text-gray-900"
              }`}
            >
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div
                    className={`text-[11px] font-black uppercase tracking-[0.3em] ${
                      planTier === "pro" ? "text-indigo-300" : "text-gray-400"
                    }`}
                  >
                    {t("agencyDashboard.settings.profile.currentPlan")}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div
                      className={`text-xl font-black ${
                        planTier === "pro" ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {currentPlanDisplay}
                    </div>
                  </div>
                </div>
                {(!teamContext ||
                  teamContext.permissions?.includes("manage_billing")) && (
                  <Button
                    asChild
                    variant={
                      planTier === "pro" ||
                      planTier === "basic" ||
                      planTier === "enterprise"
                        ? "default"
                        : "outline"
                    }
                    className={`rounded-xl font-bold ${
                      planTier === "pro"
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-lg shadow-indigo-500/20"
                        : planTier === "basic" || planTier === "agency"
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-lg shadow-emerald-500/20"
                          : planTier === "enterprise"
                            ? "bg-amber-600 hover:bg-amber-700 text-white border-none shadow-lg shadow-amber-500/20"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <a href={createPageUrl("AgencySubscribe")}>
                      Billing & Subscription
                    </a>
                  </Button>
                )}
              </div>
            </Card>

            {/* Agency Information */}
            {/* Agency Information */}
            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                    {t("agencyDashboard.settings.agencyInformation.title", {
                      defaultValue: "Agency Information",
                    })}
                  </h3>
                  {(kycStatus === "approved" ||
                    kycStatus === "verified" ||
                    kycStatus === "active") && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 rounded-full border border-green-100 shadow-sm animate-in fade-in zoom-in-95 duration-500">
                      <BadgeCheck className="w-3.5 h-3.5 text-green-600" />
                      <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">
                        {t(
                          "agencyDashboard.settings.agencyInformation.verified",
                          {
                            defaultValue: "Verified",
                          },
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    {t(
                      "agencyDashboard.settings.agencyInformation.agencyName",
                      {
                        defaultValue: "Agency Name",
                      },
                    )}{" "}
                    *
                  </Label>
                  <Input
                    value={formData.agency_name}
                    onChange={(e) =>
                      handleInputChange("agency_name", e.target.value)
                    }
                    className="bg-white border-gray-200 h-9 sm:h-11 text-gray-900 font-medium rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    {t(
                      "agencyDashboard.settings.agencyInformation.legalEntityName",
                      {
                        defaultValue: "Legal Entity Name",
                      },
                    )}
                  </Label>
                  <Input
                    value={formData.legal_entity_name}
                    onChange={(e) =>
                      handleInputChange("legal_entity_name", e.target.value)
                    }
                    className="bg-white border-gray-200 h-9 sm:h-11 text-gray-900 font-medium rounded-xl text-sm"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    {t("agencyDashboard.settings.agencyInformation.address", {
                      defaultValue: "Address",
                    })}
                  </Label>
                  <Input
                    value={formData.address}
                    onChange={(e) =>
                      handleInputChange("address", e.target.value)
                    }
                    className="bg-white border-gray-200 h-9 sm:h-11 text-gray-900 font-medium rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    {t("agencyDashboard.settings.agencyInformation.city", {
                      defaultValue: "City",
                    })}
                  </Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    className="bg-white border-gray-200 h-9 sm:h-11 text-gray-900 font-medium rounded-xl text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-gray-900">
                      {t(
                        "agencyDashboard.settings.agencyInformation.stateProvince",
                        {
                          defaultValue: "State/Province",
                        },
                      )}
                    </Label>
                    <Input
                      value={formData.state}
                      onChange={(e) =>
                        handleInputChange("state", e.target.value)
                      }
                      className="bg-white border-gray-200 h-9 sm:h-11 text-gray-900 font-medium rounded-xl text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-gray-900">
                      {t(
                        "agencyDashboard.settings.agencyInformation.zipPostalCode",
                        {
                          defaultValue: "ZIP/Postal Code",
                        },
                      )}
                    </Label>
                    <Input
                      value={formData.zip_postal_code}
                      onChange={(e) =>
                        handleInputChange("zip_postal_code", e.target.value)
                      }
                      className="bg-white border-gray-200 h-9 sm:h-11 text-gray-900 font-medium rounded-xl text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    {t("agencyDashboard.settings.agencyInformation.country", {
                      defaultValue: "Country",
                    })}
                  </Label>
                  <Select
                    value={formData.country}
                    onValueChange={(val) => handleInputChange("country", val)}
                  >
                    <SelectTrigger className="bg-white border-gray-200 h-9 sm:h-11 text-gray-900 font-medium rounded-xl text-sm">
                      <SelectValue
                        placeholder={t(
                          "agencyDashboard.settings.agencyInformation.selectCountry",
                          {
                            defaultValue: "Select country",
                          },
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="us">
                        {t(
                          "agencyDashboard.settings.agencyInformation.countries.us",
                          {
                            defaultValue: "United States",
                          },
                        )}
                      </SelectItem>
                      <SelectItem value="uk">
                        {t(
                          "agencyDashboard.settings.agencyInformation.countries.uk",
                          {
                            defaultValue: "United Kingdom",
                          },
                        )}
                      </SelectItem>
                      <SelectItem value="ca">
                        {t(
                          "agencyDashboard.settings.agencyInformation.countries.ca",
                          {
                            defaultValue: "Canada",
                          },
                        )}
                      </SelectItem>
                      <SelectItem value="de">
                        {t(
                          "agencyDashboard.settings.agencyInformation.countries.de",
                          {
                            defaultValue: "Germany",
                          },
                        )}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    {t("agencyDashboard.settings.agencyInformation.timeZone", {
                      defaultValue: "Time Zone",
                    })}
                  </Label>
                  <Select
                    value={formData.time_zone}
                    onValueChange={(val) => handleInputChange("time_zone", val)}
                  >
                    <SelectTrigger className="bg-white border-gray-200 h-9 sm:h-11 text-gray-900 font-medium rounded-xl text-sm">
                      <SelectValue
                        placeholder={t(
                          "agencyDashboard.settings.agencyInformation.selectTimezone",
                          {
                            defaultValue: "Select timezone",
                          },
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="est">
                        {t(
                          "agencyDashboard.settings.agencyInformation.timezones.est",
                          {
                            defaultValue: "Eastern Time (EST)",
                          },
                        )}
                      </SelectItem>
                      <SelectItem value="cst">
                        {t(
                          "agencyDashboard.settings.agencyInformation.timezones.cst",
                          {
                            defaultValue: "Central Time (CST)",
                          },
                        )}
                      </SelectItem>
                      <SelectItem value="pst">
                        {t(
                          "agencyDashboard.settings.agencyInformation.timezones.pst",
                          {
                            defaultValue: "Pacific Time (PST)",
                          },
                        )}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    {t("agencyDashboard.settings.agencyInformation.phone", {
                      defaultValue: "Phone",
                    })}
                  </Label>
                  <Input
                    value={formData.phone_number}
                    onChange={(e) =>
                      handleInputChange("phone_number", e.target.value)
                    }
                    className="bg-white border-gray-200 h-9 sm:h-11 text-gray-900 font-medium rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    {t("agencyDashboard.settings.agencyInformation.email", {
                      defaultValue: "Email",
                    })}
                  </Label>
                  <Input
                    value={formData.email}
                    disabled
                    className="bg-gray-50 border-gray-200 h-9 sm:h-11 text-gray-500 font-medium rounded-xl text-sm cursor-not-allowed opacity-70"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    {t("agencyDashboard.settings.agencyInformation.website", {
                      defaultValue: "Website",
                    })}
                  </Label>
                  <Input
                    value={formData.website}
                    onChange={(e) =>
                      handleInputChange("website", e.target.value)
                    }
                    className="bg-white border-gray-200 h-9 sm:h-11 text-gray-900 font-medium rounded-xl text-sm"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    {t("agencyDashboard.settings.agencyInformation.taxIdEin", {
                      defaultValue: "Tax ID / EIN",
                    })}
                  </Label>
                  <Input
                    value={formData.tax_id_ein}
                    onChange={(e) =>
                      handleInputChange("tax_id_ein", e.target.value)
                    }
                    className="bg-white border-gray-200 h-9 sm:h-11 text-gray-900 font-medium rounded-xl text-sm"
                  />
                </div>
              </div>
            </Card>

            {/* Branding */}
            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <h3 className="text-lg font-bold text-gray-900 mb-6 tracking-tight">
                {t("agencyDashboard.settings.branding.title", {
                  defaultValue: "Branding",
                })}
              </h3>
              <div className="space-y-8">
                <div className="space-y-4">
                  <Label className="text-sm font-bold text-gray-900">
                    {t("agencyDashboard.settings.branding.agencyLogo", {
                      defaultValue: "Agency Logo",
                    })}
                  </Label>
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm overflow-hidden p-2">
                      {profile?.logo_url ? (
                        <img
                          src={profile.logo_url}
                          alt="Logo"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full bg-indigo-50 flex items-center justify-center">
                          <Building2 className="w-8 h-8 text-indigo-600" />
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleLogoUpload}
                      className="hidden"
                      accept="image/*"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="h-10 px-4 rounded-xl border-gray-200 font-bold flex items-center gap-2"
                    >
                      {isUploading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {isUploading
                        ? t("agencyDashboard.settings.branding.uploading", {
                            defaultValue: "Uploading...",
                          })
                        : t("agencyDashboard.settings.branding.uploadNewLogo", {
                            defaultValue: "Upload New Logo",
                          })}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    {t("agencyDashboard.settings.branding.emailSignature", {
                      defaultValue: "Email Signature",
                    })}
                  </Label>
                  <Textarea
                    value={formData.email_signature}
                    onChange={(e) =>
                      handleInputChange("email_signature", e.target.value)
                    }
                    placeholder={t(
                      "agencyDashboard.settings.branding.emailSignaturePlaceholder",
                      {
                        defaultValue:
                          "Best regards,\\nAgency Name\\nhttps://agency.com/\\n+1 (212) 555-0123",
                      },
                    )}
                    className="bg-white border-gray-200 min-h-[120px] text-xs sm:text-sm text-gray-900 font-medium rounded-xl resize-none"
                  />
                </div>
              </div>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="w-full sm:w-auto h-10 px-6 sm:h-12 sm:px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {isSaving
                  ? t("agencyDashboard.settings.saveProfile.saving", {
                      defaultValue: "Saving...",
                    })
                  : t(
                      "agencyDashboard.settings.saveProfile.saveProfileSettings",
                      {
                        defaultValue: "Save Profile Settings",
                      },
                    )}
              </Button>
            </div>
          </div>
        )}

        {activeTab === "Commissions" && (
          <div className="space-y-6">
            {/* Default Commission Rate */}
            {/* Default Commission Rate */}
            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                  {t(
                    "agencyDashboard.settings.commissions.defaultCommissionRate",
                    {
                      defaultValue: "Default Commission Rate",
                    },
                  )}
                </h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    {t(
                      "agencyDashboard.settings.commissions.agencyCommission",
                      {
                        defaultValue: "Agency Commission (%)",
                      },
                    )}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={5}
                    value={String(defaultCommissionRate)}
                    onChange={(e) => {
                      const n = parseFloat(e.target.value);
                      if (!Number.isFinite(n)) {
                        setDefaultCommissionRate(0);
                        return;
                      }
                      setDefaultCommissionRate(Math.max(0, Math.min(100, n)));
                    }}
                    onBlur={() => {
                      setDefaultCommissionRate((prev) =>
                        clampAndSnapCommissionPct(prev),
                      );
                    }}
                    className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl"
                  />
                  <p className="text-xs text-gray-500 font-medium">
                    {t(
                      "agencyDashboard.settings.commissions.appliedUnlessOverridden",
                      {
                        defaultValue:
                          "Applied to all bookings unless overridden",
                      },
                    )}
                  </p>
                </div>
              </div>
            </Card>

            {/* Talent Commission Rules */}

            <div>
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2 tracking-tight">
                  {t("agencyDashboard.settings.commissions.rulesTitle", {
                    entitySingular: entitySingularTitle,
                    defaultValue: `${entitySingularTitle} Commission Rules`,
                  })}
                </h3>
                <p className="text-sm text-gray-500 font-medium tracking-tight">
                  {t("agencyDashboard.settings.commissions.rulesDescription", {
                    entityPlural: entityPluralLower,
                    defaultValue: `Agency-managed ${entityPluralLower} can use settings-based overrides here. Marketplace-connected ${entityPluralLower} follow the active signed contract rate and are read-only on this screen.`,
                  })}
                </p>
              </div>

              <TalentCommissionSettings
                entitySingularLower={entitySingularLower}
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveCommissionSettings}
                disabled={isSavingCommissions}
                className="w-full sm:w-auto h-10 px-6 sm:h-12 sm:px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
              >
                {isSavingCommissions ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {isSavingCommissions
                  ? t("agencyDashboard.settings.common.saving", {
                      defaultValue: "Saving...",
                    })
                  : t("agencyDashboard.settings.commissions.save", {
                      defaultValue: "Save Commission Settings",
                    })}
              </Button>
            </div>
          </div>
        )}

        {activeTab === "Email Templates" && (
          <div className="space-y-6">
            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                      {t("agencyDashboard.settings.emailTemplates.title", {
                        defaultValue: "Email Templates",
                      })}
                    </h3>
                    <p className="text-sm text-gray-500 font-medium">
                      {t("agencyDashboard.settings.emailTemplates.subtitle", {
                        defaultValue: "Customize automated email messages",
                      })}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={openNewEmailTemplate}
                  className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-2"
                >
                  <Plus className="w-3 h-3" />
                  {t("agencyDashboard.settings.emailTemplates.newTemplate", {
                    defaultValue: "New Template",
                  })}
                </Button>
              </div>

              <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-2xl mb-8">
                <h4 className="text-sm font-bold text-blue-900 mb-4">
                  {t(
                    "agencyDashboard.settings.emailTemplates.availableVariables",
                    {
                      defaultValue: "Available Variables:",
                    },
                  )}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-y-3 gap-x-8">
                  {[
                    entityNameToken,
                    "{client_name}",
                    "{booking_date}",
                    "{call_time}",
                    "{location}",
                    "{rate}",
                    "{invoice_number}",
                    "{invoice_total}",
                    "{payment_terms}",
                    "{due_date}",
                    "{agency_name}",
                  ].map((variable) => (
                    <code
                      key={variable}
                      className="text-xs font-bold text-blue-600 bg-white px-2 py-1 rounded border border-blue-100 w-fit"
                    >
                      {variable}
                    </code>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                {isLoadingEmailTemplates ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-5 h-5 animate-spin text-gray-500" />
                  </div>
                ) : (
                  emailTemplates.map((template) => (
                    <div
                      key={template.template_key}
                      className="p-4 sm:p-6 bg-gray-50/50 border border-gray-100 rounded-2xl space-y-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <h4 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                            {getEmailTemplateDisplayName(
                              template.template_key,
                              template.name,
                            )}
                          </h4>
                          <Badge
                            className={`border font-bold text-[10px] h-5 shrink-0 ${template.is_active ? "bg-green-50 text-green-600 border-green-100" : "bg-gray-100 text-gray-600 border-gray-200"}`}
                          >
                            {template.is_active
                              ? t("agencyDashboard.settings.team.active", {
                                  defaultValue: "Active",
                                })
                              : t("agencyDashboard.settings.team.inactive", {
                                  defaultValue: "Inactive",
                                })}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-7 h-7 rounded-lg border-gray-200"
                            onClick={() =>
                              openEditEmailTemplate(template as any)
                            }
                          >
                            <Edit2 className="w-3 h-3 text-gray-500" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-7 h-7 rounded-lg border-gray-200"
                            onClick={() =>
                              duplicateEmailTemplate(template as any)
                            }
                          >
                            <Copy className="w-3 h-3 text-gray-500" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                          {t(
                            "agencyDashboard.settings.emailTemplates.subject",
                            {
                              defaultValue: "Subject:",
                            },
                          )}
                        </Label>
                        <p className="text-sm font-bold text-gray-900">
                          {template.subject}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                          {t("agencyDashboard.settings.emailTemplates.body", {
                            defaultValue: "Body:",
                          })}
                        </Label>
                        <div className="p-6 bg-gray-100 border border-gray-200 rounded-xl text-base text-gray-700 font-medium whitespace-pre-line leading-relaxed min-h-[150px]">
                          {template.body}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveEmailTemplates}
                disabled={isSavingEmailTemplates}
                className="w-full sm:w-auto h-10 px-6 sm:h-12 sm:px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
              >
                {isSavingEmailTemplates ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {isSavingEmailTemplates
                  ? t("agencyDashboard.settings.common.saving", {
                      defaultValue: "Saving...",
                    })
                  : t("agencyDashboard.settings.emailTemplates.save", {
                      defaultValue: "Save Email Templates",
                    })}
              </Button>
            </div>

            <Dialog
              open={showEmailTemplateModal}
              onOpenChange={setShowEmailTemplateModal}
            >
              <DialogContent className="max-w-2xl rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-gray-900">
                    {editingTemplateKey
                      ? t(
                          "agencyDashboard.settings.emailTemplates.editTemplate",
                          {
                            defaultValue: "Edit Template",
                          },
                        )
                      : t(
                          "agencyDashboard.settings.emailTemplates.newTemplate",
                          {
                            defaultValue: "New Template",
                          },
                        )}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-5 py-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-gray-900">
                      {t(
                        "agencyDashboard.settings.emailTemplates.templateName",
                        {
                          defaultValue: "Template Name",
                        },
                      )}
                    </Label>
                    <Input
                      value={emailTemplateDraft.name}
                      onChange={(e) =>
                        setEmailTemplateDraft((p) => ({
                          ...p,
                          name: e.target.value,
                        }))
                      }
                      className="h-11 bg-gray-50 border-gray-200 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-gray-900">
                      {t(
                        "agencyDashboard.settings.emailTemplates.subjectLabel",
                        {
                          defaultValue: "Subject",
                        },
                      )}
                    </Label>
                    <Input
                      value={emailTemplateDraft.subject}
                      onChange={(e) =>
                        setEmailTemplateDraft((p) => ({
                          ...p,
                          subject: e.target.value,
                        }))
                      }
                      className="h-11 bg-gray-50 border-gray-200 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-gray-900">
                      {t("agencyDashboard.settings.emailTemplates.bodyLabel", {
                        defaultValue: "Body",
                      })}
                    </Label>
                    <Textarea
                      value={emailTemplateDraft.body}
                      onChange={(e) =>
                        setEmailTemplateDraft((p) => ({
                          ...p,
                          body: e.target.value,
                        }))
                      }
                      className="bg-gray-50 border-gray-200 min-h-[200px] text-sm text-gray-900 font-medium rounded-xl resize-none"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {t("agencyDashboard.settings.emailTemplates.active", {
                          defaultValue: "Active",
                        })}
                      </p>
                      <p className="text-xs text-gray-500 font-medium">
                        {t(
                          "agencyDashboard.settings.emailTemplates.enableTemplateHint",
                          {
                            defaultValue:
                              "Enable this template for automated emails",
                          },
                        )}
                      </p>
                    </div>
                    <Switch
                      checked={emailTemplateDraft.is_active}
                      onCheckedChange={(checked) =>
                        setEmailTemplateDraft((p) => ({
                          ...p,
                          is_active: !!checked,
                        }))
                      }
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="ghost"
                    onClick={() => setShowEmailTemplateModal(false)}
                    className="font-bold"
                  >
                    {t("agencyDashboard.catalogs.actions.cancel", {
                      defaultValue: "Cancel",
                    })}
                  </Button>
                  <Button
                    onClick={saveEmailTemplateDraft}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 rounded-xl"
                  >
                    {t("agencyDashboard.settings.common.save", {
                      defaultValue: "Save",
                    })}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {activeTab === "Notifications" && (
          <div className="space-y-6">
            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                    {t("agencyDashboard.settings.notifications.title", {
                      defaultValue: "Notification Preferences",
                    })}
                  </h3>
                  <p className="text-sm text-gray-500 font-medium">
                    {t("agencyDashboard.settings.notifications.subtitle", {
                      defaultValue:
                        "Choose how you want to be notified about important events",
                    })}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {notificationPrefs.map((pref) => (
                  <div
                    key={pref.key}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50/50 border border-gray-100 rounded-xl"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">
                        {pref.title}
                      </p>
                      <p className="text-xs text-gray-500 font-medium">
                        {pref.desc}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full sm:w-auto">
                      <div className="flex items-center justify-between sm:justify-start gap-2">
                        <Switch
                          checked={pref.channels.email}
                          onCheckedChange={(checked) =>
                            setNotificationPrefs((prev) =>
                              prev.map((p) =>
                                p.key === pref.key
                                  ? {
                                      ...p,
                                      channels: {
                                        ...p.channels,
                                        email: !!checked,
                                      },
                                    }
                                  : p,
                              ),
                            )
                          }
                        />
                        <span className="text-xs font-bold text-gray-900">
                          {t(
                            "agencyDashboard.settings.notifications.channels.email",
                            {
                              defaultValue: "Email",
                            },
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-start gap-2">
                        <Switch checked={false} disabled />
                        <span className="text-xs font-bold text-gray-900 opacity-60">
                          {t(
                            "agencyDashboard.settings.notifications.channels.sms",
                            {
                              defaultValue: "SMS",
                            },
                          )}
                        </span>
                        <span className="text-[10px] font-bold text-gray-500 opacity-80">
                          {t(
                            "agencyDashboard.settings.notifications.channels.comingSoon",
                            {
                              defaultValue: "Coming Soon",
                            },
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-start gap-2">
                        <Switch checked={false} disabled />
                        <span className="text-xs font-bold text-gray-900 opacity-60">
                          {t(
                            "agencyDashboard.settings.notifications.channels.push",
                            {
                              defaultValue: "Push",
                            },
                          )}
                        </span>
                        <span className="text-[10px] font-bold text-gray-500 opacity-80">
                          {t(
                            "agencyDashboard.settings.notifications.channels.comingSoon",
                            {
                              defaultValue: "Coming Soon",
                            },
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <h3 className="text-lg font-bold text-gray-900 mb-6 tracking-tight">
                {t("agencyDashboard.settings.notifications.recipients.title", {
                  defaultValue: "Notification Recipients",
                })}
              </h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    {t(
                      "agencyDashboard.settings.notifications.recipients.primaryEmail",
                      {
                        defaultValue: "Primary Notification Email",
                      },
                    )}
                  </Label>
                  <Input
                    value={notificationRecipients.primaryEmail}
                    onChange={(e) =>
                      setNotificationRecipients((p) => ({
                        ...p,
                        primaryEmail: e.target.value,
                      }))
                    }
                    className="bg-white border-gray-200 h-11 text-gray-500 font-medium rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    {t(
                      "agencyDashboard.settings.notifications.recipients.smsNumber",
                      {
                        defaultValue: "SMS Notification Number",
                      },
                    )}
                  </Label>
                  <Input
                    value={notificationRecipients.smsNumber}
                    onChange={(e) =>
                      setNotificationRecipients((p) => ({
                        ...p,
                        smsNumber: e.target.value,
                      }))
                    }
                    className="bg-white border-gray-200 h-11 text-gray-500 font-medium rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    {t(
                      "agencyDashboard.settings.notifications.recipients.additional",
                      {
                        defaultValue: "Additional Recipients (comma-separated)",
                      },
                    )}
                  </Label>
                  <Input
                    value={notificationRecipients.additionalEmails}
                    onChange={(e) =>
                      setNotificationRecipients((p) => ({
                        ...p,
                        additionalEmails: e.target.value,
                      }))
                    }
                    className="bg-white border-gray-200 h-11 text-gray-500 font-medium rounded-xl"
                  />
                </div>
              </div>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={saveNotificationSettings}
                disabled={isSavingNotificationSettings}
                className="w-full sm:w-auto h-10 px-6 sm:h-12 sm:px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {t("agencyDashboard.settings.notifications.save", {
                  defaultValue: "Save Notification Settings",
                })}
              </Button>
            </div>
          </div>
        )}

        {activeTab === "Tax & Currency" && (
          <div className="space-y-6">
            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-gray-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                  {t("agencyDashboard.settings.taxAndCurrency.title", {
                    defaultValue: "Tax & Currency Settings",
                  })}
                </h3>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    {t(
                      "agencyDashboard.settings.taxAndCurrency.defaultCurrency",
                      {
                        defaultValue: "Default Currency",
                      },
                    )}
                  </Label>
                  <Select
                    value={taxCurrencySettings.defaultCurrency}
                    onValueChange={(v) =>
                      setTaxCurrencySettings((p) => ({
                        ...p,
                        defaultCurrency: v,
                      }))
                    }
                  >
                    <SelectTrigger className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl">
                      <SelectValue
                        placeholder={t(
                          "agencyDashboard.settings.taxAndCurrency.selectCurrency",
                          {
                            defaultValue: "Select currency",
                          },
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="usd">
                        {t(
                          "agencyDashboard.settings.taxAndCurrency.currencies.usd",
                          {
                            defaultValue: "USD - US Dollar",
                          },
                        )}
                      </SelectItem>
                      <SelectItem value="eur">
                        {t(
                          "agencyDashboard.settings.taxAndCurrency.currencies.eur",
                          {
                            defaultValue: "EUR - Euro",
                          },
                        )}
                      </SelectItem>
                      <SelectItem value="gbp">
                        {t(
                          "agencyDashboard.settings.taxAndCurrency.currencies.gbp",
                          {
                            defaultValue: "GBP - British Pound",
                          },
                        )}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    {t("agencyDashboard.settings.taxAndCurrency.dateFormat", {
                      defaultValue: "Date Format",
                    })}
                  </Label>
                  <Select
                    value={taxCurrencySettings.currencyDisplayFormat}
                    onValueChange={(v) =>
                      setTaxCurrencySettings((p) => ({
                        ...p,
                        currencyDisplayFormat: v,
                      }))
                    }
                  >
                    <SelectTrigger className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl">
                      <SelectValue
                        placeholder={t(
                          "agencyDashboard.settings.taxAndCurrency.selectFormat",
                          {
                            defaultValue: "Select format",
                          },
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="1234.56">$1,234.56</SelectItem>
                      <SelectItem value="1234,56">$1.234,56</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <h3 className="text-lg font-bold text-gray-900 mb-6 tracking-tight">
                {t("agencyDashboard.settings.taxAndCurrency.invoiceSettings", {
                  defaultValue: "Invoice Settings",
                })}
              </h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Default Tax Rate (%)
                  </Label>
                  <Input
                    value={taxCurrencySettings.defaultTaxRatePct}
                    onChange={(e) =>
                      setTaxCurrencySettings((p) => ({
                        ...p,
                        defaultTaxRatePct: e.target.value,
                      }))
                    }
                    className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl"
                  />
                  <p className="text-xs text-gray-500 font-medium">
                    Applied to invoices (e.g., sales tax, VAT)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Tax Display Name
                  </Label>
                  <Input
                    value={taxCurrencySettings.taxDisplayName}
                    onChange={(e) =>
                      setTaxCurrencySettings((p) => ({
                        ...p,
                        taxDisplayName: e.target.value,
                      }))
                    }
                    className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl"
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50/50 border border-gray-100 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={taxCurrencySettings.includeTaxInDisplayedPrices}
                      onCheckedChange={(checked) =>
                        setTaxCurrencySettings((p) => ({
                          ...p,
                          includeTaxInDisplayedPrices: !!checked,
                        }))
                      }
                    />
                    <span className="text-sm font-bold text-gray-900">
                      Include tax in displayed prices
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <h3 className="text-lg font-bold text-gray-900 mb-6 tracking-tight">
                Payment Terms
              </h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    {t(
                      "agencyDashboard.settings.taxAndCurrency.defaultPaymentTerms",
                      {
                        defaultValue: "Default Payment Terms",
                      },
                    )}
                  </Label>
                  <Select
                    value={taxCurrencySettings.defaultPaymentTerms}
                    onValueChange={(v) =>
                      setTaxCurrencySettings((p) => ({
                        ...p,
                        defaultPaymentTerms: v,
                      }))
                    }
                  >
                    <SelectTrigger className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl">
                      <SelectValue
                        placeholder={t(
                          "agencyDashboard.settings.taxAndCurrency.selectTerms",
                          {
                            defaultValue: "Select terms",
                          },
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="due">
                        {t(
                          "agencyDashboard.settings.taxAndCurrency.paymentTerms.due",
                          {
                            defaultValue: "Due on Receipt",
                          },
                        )}
                      </SelectItem>
                      <SelectItem value="net15">
                        {t(
                          "agencyDashboard.settings.taxAndCurrency.paymentTerms.net15",
                          {
                            defaultValue: "Net 15",
                          },
                        )}
                      </SelectItem>
                      <SelectItem value="net30">
                        {t(
                          "agencyDashboard.settings.taxAndCurrency.paymentTerms.net30",
                          {
                            defaultValue: "Net 30",
                          },
                        )}
                      </SelectItem>
                      <SelectItem value="net60">
                        {t(
                          "agencyDashboard.settings.taxAndCurrency.paymentTerms.net60",
                          {
                            defaultValue: "Net 60",
                          },
                        )}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Late Payment Fee (%)
                  </Label>
                  <Input
                    value={taxCurrencySettings.latePaymentFeePct}
                    onChange={(e) =>
                      setTaxCurrencySettings((p) => ({
                        ...p,
                        latePaymentFeePct: e.target.value,
                      }))
                    }
                    className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl"
                  />
                  <p className="text-xs text-gray-500 font-medium">
                    Monthly interest on overdue invoices
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-900">
                    Invoice Prefix
                  </Label>
                  <Input
                    value={taxCurrencySettings.invoicePrefix}
                    onChange={(e) =>
                      setTaxCurrencySettings((p) => ({
                        ...p,
                        invoicePrefix: e.target.value,
                      }))
                    }
                    className="bg-white border-gray-200 h-11 text-gray-900 font-medium rounded-xl"
                  />
                  <p className="text-xs text-gray-500 font-medium">
                    Example: INV-00001, INV-00002
                  </p>
                </div>
              </div>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={saveTaxCurrencySettings}
                disabled={isSavingTaxCurrencySettings}
                className="w-full sm:w-auto h-10 px-6 sm:h-12 sm:px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {t("agencyDashboard.settings.taxAndCurrency.save", {
                  defaultValue: "Save Tax & Currency Settings",
                })}
              </Button>
            </div>
          </div>
        )}

        {activeTab === "File Storage" && <FileStorageView />}

        {activeTab === "Team" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {t("agencyDashboard.settings.team.title", {
                    defaultValue: "Team Management",
                  })}
                </h3>
                <p className="text-sm text-gray-500 font-medium hidden sm:block">
                  {t("agencyDashboard.settings.team.subtitle", {
                    defaultValue: "Manage team members, roles, and permissions",
                  })}
                </p>
              </div>
              <Button
                onClick={() => setShowInviteModal(true)}
                disabled={
                  isLoadingTeamContext ||
                  !teamContext?.permissions?.includes("invite_team_members")
                }
                className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shrink-0 w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" />
                {t("agencyDashboard.settings.team.actions.inviteUser", {
                  defaultValue: "Invite User",
                })}
              </Button>
            </div>

            {isLoadingTeamContext ? (
              <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("agencyDashboard.settings.team.loadingMembers", {
                    defaultValue: "Loading team members...",
                  })}
                </div>
              </Card>
            ) : (
              <>
                <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
                  <div className="flex flex-col gap-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                          <Users className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-gray-900 tracking-tight">
                            {t("agencyDashboard.settings.team.activeMembers", {
                              defaultValue: "Active Team Members",
                            })}
                          </h4>
                          <p className="text-sm text-gray-500 font-medium mt-1">
                            Current access inside{" "}
                            {teamContext?.organization_name || "your agency"}.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => setShowActivityModal(true)}
                        >
                          <History className="w-4 h-4 mr-2" />
                          {t("agencyDashboard.settings.team.activity.title", {
                            defaultValue: "Activity",
                          })}
                        </Button>
                        <Badge className="bg-gray-50 text-gray-700 border-gray-200 font-bold text-[10px] h-6">
                          {t("agencyDashboard.settings.team.memberCount", {
                            count: teamContext?.members?.length || 0,
                            defaultValue: "{{count}} Members",
                          })}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {(teamContext?.members || []).length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                          {t("agencyDashboard.settings.team.emptyMembers", {
                            defaultValue: "No active team members yet.",
                          })}
                        </div>
                      ) : (
                        (teamContext?.members || []).map((member) => {
                          const actorRole = teamContext?.membership_role;
                          const canEditRole =
                            teamContext?.permissions?.includes(
                              "update_member_roles",
                            ) &&
                            member.role !== "owner" &&
                            !(actorRole === "admin" && member.role === "admin");
                          return (
                            <div
                              key={member.user_id}
                              className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-gray-900 truncate">
                                  {member.email}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                  <Badge className="bg-white text-gray-700 border-gray-200">
                                    {formatTeamRoleLabel(member.role, t)}
                                  </Badge>
                                  <span>
                                    {t(
                                      "agencyDashboard.settings.team.memberStatus",
                                      { defaultValue: "Status" },
                                    )}
                                    : {member.status}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {member.role === "owner" ? (
                                  <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                                    {t(
                                      "agencyDashboard.settings.team.roles.owner",
                                      { defaultValue: "Owner" },
                                    )}
                                  </Badge>
                                ) : (
                                  <>
                                    <Button
                                      variant="outline"
                                      className="rounded-xl"
                                      disabled={!canEditRole}
                                      onClick={() => openRoleEditor(member)}
                                    >
                                      <Edit2 className="w-4 h-4 mr-2" />
                                      {t(
                                        "agencyDashboard.settings.team.actions.editRole",
                                      )}
                                    </Button>
                                    {canRemove && (
                                      <Button
                                        variant="outline"
                                        className="rounded-xl border-red-300 text-red-600 hover:bg-red-50"
                                        onClick={() => {
                                          setSelectedMember(member);
                                          setShowDeleteMemberModal(true);
                                        }}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
                  <div className="flex flex-col gap-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                          <Mail className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-gray-900 tracking-tight">
                            {t(
                              "agencyDashboard.settings.team.pendingInvitations.title",
                              { defaultValue: "Pending Invitations" },
                            )}
                          </h4>
                          <p className="text-sm text-gray-500 font-medium mt-1">
                            {t(
                              "agencyDashboard.settings.team.pendingInvitations.description",
                              {
                                defaultValue:
                                  "Invitations sent to teammates who haven't joined yet.",
                              },
                            )}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-gray-50 text-gray-700 border-gray-200 font-bold text-[10px] h-6">
                        {
                          (teamContext?.invites || []).filter(
                            (invite) => invite.status === "pending",
                          ).length
                        }{" "}
                        {t(
                          "agencyDashboard.settings.team.pendingInvitations.pending",
                          { defaultValue: "pending" },
                        )}
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      {(teamContext?.invites || []).filter(
                        (invite) => invite.status === "pending",
                      ).length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                          {t(
                            "agencyDashboard.settings.team.pendingInvitations.empty",
                            { defaultValue: "No pending invitations." },
                          )}
                        </div>
                      ) : (
                        (teamContext?.invites || [])
                          .filter((invite) => invite.status === "pending")
                          .map((invite) => (
                            <div
                              key={invite.id}
                              className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-gray-900 truncate">
                                  {invite.email}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                  <Badge className="bg-white text-gray-700 border-gray-200">
                                    {formatTeamRoleLabel(invite.role, t)}
                                  </Badge>
                                  <span>
                                    {t(
                                      "agencyDashboard.settings.team.pendingInvitations.expires",
                                    )}{" "}
                                    {new Date(
                                      invite.expires_at,
                                    ).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                              <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                                {t(
                                  "agencyDashboard.settings.team.pendingInvitations.pending",
                                  { defaultValue: "pending" },
                                )}
                              </Badge>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>
        )}

        {activeTab === "Integrations" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {t("agencyDashboard.settings.integrations.title", {
                    defaultValue: "Integrations",
                  })}
                </h3>
                <p className="text-sm text-gray-500 font-medium">
                  {t("agencyDashboard.settings.integrations.subtitle", {
                    defaultValue: "Connect your agency with other tools",
                  })}
                </p>
              </div>
              <Button
                disabled
                className="h-9 px-3 sm:h-10 sm:px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {t("agencyDashboard.settings.integrations.addIntegration", {
                  defaultValue: "Add Integration",
                })}
              </Button>
            </div>

            <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 tracking-tight">
                      {t(
                        "agencyDashboard.settings.integrations.connectBankAccount",
                        {
                          defaultValue: "Connect Bank Account",
                        },
                      )}
                    </h4>
                    <p className="text-sm text-gray-500 font-medium mt-1">
                      {t(
                        "agencyDashboard.settings.integrations.connectBankHint",
                        {
                          defaultValue:
                            "Link your bank to receive client payments and manage payouts.",
                        },
                      )}
                    </p>
                    {bankStatus?.connected && (
                      <p className="text-xs text-gray-600 font-medium mt-2">
                        {t("agencyDashboard.settings.integrations.connected", {
                          defaultValue: "Connected",
                        })}
                        {bankStatus.bank_last4
                          ? ` • Account ending in ••••${bankStatus.bank_last4}`
                          : ""}
                      </p>
                    )}
                    {!bankStatusLoading &&
                      bankStatus &&
                      !bankStatus.connected && (
                        <p className="text-xs text-gray-500 font-medium mt-2">
                          {t(
                            "agencyDashboard.settings.integrations.notConnected",
                            {
                              defaultValue: "Not connected",
                            },
                          )}
                        </p>
                      )}
                  </div>
                </div>
                <Button asChild className="h-10 px-5 rounded-xl font-bold">
                  <a href={`/AgencyDashboard?tab=payouts`}>
                    {bankStatus?.connected
                      ? t(
                          "agencyDashboard.settings.integrations.changeAccount",
                          {
                            defaultValue: "Change account",
                          },
                        )
                      : t("agencyDashboard.settings.integrations.connect", {
                          defaultValue: "Connect",
                        })}
                  </a>
                </Button>
              </div>
            </Card>

            {/* Calendly Integration */}
            <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden relative">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                        {t(
                          "agencyDashboard.settings.integrations.calendly.title",
                          {
                            defaultValue: "Calendly Integration",
                          },
                        )}
                      </h3>
                      <p className="text-sm text-gray-500 font-medium">
                        {hasCalendlyAccess
                          ? t(
                              "agencyDashboard.settings.integrations.calendly.enabledHint",
                              {
                                defaultValue:
                                  "Automate meeting scheduling with your clients",
                              },
                            )
                          : t(
                              "agencyDashboard.settings.integrations.calendly.lockedHint",
                              {
                                defaultValue:
                                  "Available on Pro with the IRL Booking add-on",
                              },
                            )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mr-1">
                        {hasCalendlyAccess
                          ? calendlySettings.is_enabled
                            ? t("agencyDashboard.settings.team.active", {
                                defaultValue: "Active",
                              })
                            : t(
                                "agencyDashboard.settings.integrations.disabled",
                                {
                                  defaultValue: "Disabled",
                                },
                              )
                          : t("agencyDashboard.settings.integrations.locked", {
                              defaultValue: "Locked",
                            })}
                      </span>
                      <Switch
                        checked={
                          hasCalendlyAccess && calendlySettings.is_enabled
                        }
                        disabled={!hasCalendlyAccess}
                        onCheckedChange={(checked) =>
                          setCalendlySettings((p) => ({
                            ...p,
                            is_enabled: checked,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {!hasIrlBookingAddon && (
                <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    {t(
                      "agencyDashboard.settings.integrations.calendly.upgradeHint",
                      {
                        defaultValue:
                          "Enable the IRL Booking add-on to use Calendly, scouting, client CRM, bookings, and IRL accounting workflows.",
                      },
                    )}
                  </div>
                  <Button
                    asChild
                    size="sm"
                    className="h-9 rounded-xl bg-amber-600 px-4 font-bold text-white hover:bg-amber-700"
                  >
                    <a href={createPageUrl("AgencySubscribe")}>
                      {t(
                        "agencyDashboard.settings.integrations.calendly.getAddon",
                        {
                          defaultValue: "Get IRL Booking Add-on",
                        },
                      )}
                    </a>
                  </Button>
                </div>
              )}

              <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <Key className="w-4 h-4 text-gray-400" />
                      Calendly Personal Access Token
                    </Label>
                    <a
                      href="https://calendly.com/integrations/api_webhooks"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                    >
                      Get Token
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex justify-end">
                    <CalendlyAutosaveStatus
                      status={calendlyFieldStatuses.calendly_api_token}
                    />
                  </div>
                  <Input
                    type="password"
                    placeholder="calendly_v2_..."
                    value={calendlySettings.calendly_api_token}
                    disabled={!hasCalendlyAccess}
                    onChange={(e) => {
                      updateCalendlySettings((p) => {
                        const nextToken = e.target.value;
                        const tokenChanged =
                          p.calendly_api_token.trim() &&
                          p.calendly_api_token !== nextToken;

                        return {
                          ...p,
                          calendly_api_token: nextToken,
                          mappings: tokenChanged ? {} : p.mappings,
                        };
                      });
                      setCalendlyFieldStatuses((prev) => ({
                        ...prev,
                        calendly_api_token: "idle",
                      }));
                    }}
                    onBlur={() =>
                      void autosaveCalendlyField("calendly_api_token")
                    }
                    className="bg-gray-50/50 border-gray-200 h-11 text-gray-900 font-medium rounded-xl pr-10 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                  {calendlySettings.calendly_api_token && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-green-50 text-green-600">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                      Public Calendly Scheduling Link
                    </Label>
                    <a
                      href="https://help.calendly.com/hc/en-us/articles/223193448-How-to-share-your-scheduling-link"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                    >
                      Where to find it
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex justify-end">
                    <CalendlyAutosaveStatus
                      status={calendlyFieldStatuses.scheduling_url}
                    />
                  </div>
                  <Input
                    type="url"
                    placeholder="https://calendly.com/your-handle/your-event"
                    value={calendlySettings.scheduling_url}
                    disabled={!hasCalendlyAccess}
                    onChange={(e) => {
                      updateCalendlySettings((p) => ({
                        ...p,
                        scheduling_url: e.target.value,
                      }));
                      setCalendlyFieldStatuses((prev) => ({
                        ...prev,
                        scheduling_url: "idle",
                      }));
                    }}
                    onBlur={() => void autosaveCalendlyField("scheduling_url")}
                    className="bg-gray-50/50 border-gray-200 h-11 text-gray-900 font-medium rounded-xl focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                  <p className="text-xs text-gray-400 font-medium leading-relaxed flex items-start gap-2 italic">
                    <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    Use the public Calendly event link that should open when a
                    booking is sent through Calendly from Likelee. In Calendly,
                    open your Scheduling page, find the event type, and copy its
                    link.
                  </p>
                </div>

                {hasCalendlyAccess && calendlySettings.is_enabled && (
                  <Collapsible
                    open={isCalendlyMappingsOpen}
                    onOpenChange={setIsCalendlyMappingsOpen}
                  >
                    <div className="space-y-4 pt-4 border-t border-gray-100 animate-in zoom-in-95 duration-500">
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-gray-50/70 px-4 py-3 text-left transition-colors hover:border-indigo-200 hover:bg-indigo-50/40"
                        >
                          <div>
                            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-1">
                              <Activity className="w-4 h-4 text-gray-400" />
                              Calendly Event Type
                            </h4>
                            <p className="text-xs text-gray-500 font-medium">
                              Select the Calendly event type Likelee should use
                              for booking invites and reminders
                            </p>
                          </div>
                          <ChevronDown
                            className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${
                              isCalendlyMappingsOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </CollapsibleTrigger>

                      {calendlyEventTypesError && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                          {calendlyEventTypesError}
                        </div>
                      )}

                      <CollapsibleContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {CALENDLY_BOOKING_TYPE_OPTIONS.map((type) => (
                            <div
                              key={type.key}
                              className="space-y-2 p-4 bg-gray-50/50 border border-gray-100 rounded-xl group hover:border-indigo-100 transition-colors"
                            >
                              <Label className="text-[11px] font-black uppercase tracking-wider text-gray-400 group-hover:text-indigo-600 transition-colors">
                                {type.label}
                              </Label>
                              {isFetchingCalendlyEventTypes ? (
                                <div className="h-10 flex items-center justify-center bg-white border border-gray-100 rounded-lg animate-pulse">
                                  <RefreshCw className="w-4 h-4 animate-spin text-gray-300" />
                                </div>
                              ) : calendlyEventTypes.length > 0 ? (
                                <div className="space-y-2">
                                  <div className="flex justify-end">
                                    <CalendlyAutosaveStatus
                                      status={
                                        calendlyFieldStatuses[
                                          getCalendlyMappingFieldKey(type.key)
                                        ]
                                      }
                                    />
                                  </div>
                                  <Select
                                    value={(() => {
                                      const currentMapping =
                                        calendlySettings.mappings[type.key];
                                      if (!currentMapping) {
                                        return CALENDLY_USE_DEFAULT_VALUE;
                                      }
                                      if (
                                        isCalendlyEventTypeUri(currentMapping)
                                      ) {
                                        return currentMapping;
                                      }
                                      const matchingEventType =
                                        calendlyEventTypes.find(
                                          (eventType: any) =>
                                            eventType.slug === currentMapping,
                                        );
                                      return (
                                        matchingEventType?.uri ||
                                        CALENDLY_USE_DEFAULT_VALUE
                                      );
                                    })()}
                                    onValueChange={(val) => {
                                      const nextSettings =
                                        updateCalendlySettings((p) => {
                                          const nextMappings = {
                                            ...p.mappings,
                                          };
                                          if (
                                            val === CALENDLY_USE_DEFAULT_VALUE
                                          ) {
                                            delete nextMappings[type.key];
                                          } else {
                                            nextMappings[type.key] = val;
                                          }
                                          return {
                                            ...p,
                                            mappings: nextMappings,
                                          };
                                        });
                                      void autosaveCalendlyField(
                                        getCalendlyMappingFieldKey(type.key),
                                        nextSettings,
                                      );
                                    }}
                                  >
                                    <SelectTrigger className="h-10 bg-white border-gray-200 rounded-lg text-xs font-bold shadow-sm">
                                      <SelectValue placeholder="Select Calendly Event" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-gray-200 shadow-xl">
                                      <SelectItem
                                        value={CALENDLY_USE_DEFAULT_VALUE}
                                        className="text-xs font-bold text-gray-400 italic"
                                      >
                                        Leave Unset
                                      </SelectItem>
                                      {calendlyEventTypes.map((et: any) => (
                                        <SelectItem
                                          key={et.uri || et.slug}
                                          value={et.uri || et.slug}
                                          className="text-xs font-bold py-2.5"
                                        >
                                          <div className="flex flex-col gap-0.5">
                                            <span>{et.name}</span>
                                            <span className="text-[10px] text-gray-400">
                                              {et.slug}
                                            </span>
                                            {et.duration && (
                                              <span className="text-[10px] text-gray-400">
                                                {et.duration} mins
                                              </span>
                                            )}
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              ) : hasSavedCalendlyToken ? (
                                <div className="space-y-2">
                                  <div className="flex justify-end">
                                    <CalendlyAutosaveStatus
                                      status={
                                        calendlyFieldStatuses[
                                          getCalendlyMappingFieldKey(type.key)
                                        ]
                                      }
                                    />
                                  </div>
                                  <Input
                                    value={
                                      calendlySettings.mappings[type.key] || ""
                                    }
                                    onChange={(e) => {
                                      updateCalendlySettings((p) => {
                                        const nextMappings = { ...p.mappings };
                                        const nextValue = e.target.value.trim();
                                        if (!nextValue) {
                                          delete nextMappings[type.key];
                                        } else {
                                          nextMappings[type.key] = nextValue;
                                        }
                                        return {
                                          ...p,
                                          mappings: nextMappings,
                                        };
                                      });
                                      setCalendlyFieldStatuses((prev) => ({
                                        ...prev,
                                        [getCalendlyMappingFieldKey(type.key)]:
                                          "idle",
                                      }));
                                    }}
                                    onBlur={() =>
                                      void autosaveCalendlyField(
                                        getCalendlyMappingFieldKey(type.key),
                                      )
                                    }
                                    placeholder="https://api.calendly.com/event_types/..."
                                    className="h-10 bg-white border-gray-200 rounded-lg text-xs font-medium"
                                  />
                                  <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
                                    Paste the full Calendly event type URI that
                                    Likelee should use for bookings. This works
                                    even when the token cannot list event types
                                    automatically.
                                  </p>
                                </div>
                              ) : (
                                <div className="p-3 bg-white border border-gray-100 rounded-lg text-[10px] text-gray-400 font-bold flex items-center justify-center text-center">
                                  {hasSavedCalendlyToken
                                    ? "No active Calendly event types found for this account"
                                    : "Save a valid Calendly token to load event types"}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  {!hasIrlBookingAddon && (
                    <Button
                      asChild
                      variant="outline"
                      className="h-11 rounded-xl border-amber-300 px-6 font-bold text-amber-800 hover:bg-amber-50"
                    >
                      <a href={createPageUrl("AgencySubscribe")}>
                        Buy IRL Booking Add-on
                      </a>
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      void handleSaveCalendlySettings();
                    }}
                    disabled={isSavingCalendlySettings || !hasIrlBookingAddon}
                    className="h-11 px-8 bg-indigo-600 hover:bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
                  >
                    {isSavingCalendlySettings ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {isSavingCalendlySettings
                      ? t("agencyDashboard.settings.common.saving", {
                          defaultValue: "Saving...",
                        })
                      : t(
                          "agencyDashboard.settings.integrations.calendly.saveConfiguration",
                          {
                            defaultValue: "Save Calendly Configuration",
                          },
                        )}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        <InviteTeamMemberModal
          open={showInviteModal}
          onOpenChange={setShowInviteModal}
          email={teamInviteEmail}
          role={teamInviteRole}
          onEmailChange={setTeamInviteEmail}
          onRoleChange={setTeamInviteRole}
          onSubmit={handleInviteTeamMember}
          submitting={isSubmittingTeamInvite}
        />
        <EditPermissionsModal
          open={showPermissionsModal}
          onOpenChange={setShowPermissionsModal}
          member={selectedMember}
          nextRole={pendingRoleValue}
          onRoleChange={setPendingRoleValue}
          onSubmit={handleUpdateMemberRole}
          submitting={isUpdatingTeamRole}
        />
        <ActivityLogModal
          open={showActivityModal}
          onOpenChange={setShowActivityModal}
          logs={teamAuditLogs}
        />
      </div>
    </div>
  );
};

export default GeneralSettingsView;
