import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Users,
  DollarSign,
  Briefcase,
  Shield,
  Search,
  Plus,
  Download,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  MapPin,
  Globe,
  Pencil,
  Eye,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  History,
  Send,
  FileText,
  Upload,
  Calendar,
  Image as ImageIcon,
  Loader2,
  Mail,
  Video,
  Mic,
} from "lucide-react";
import { format } from "date-fns";
import CompCardBanner from "./CompCardBanner";
import AdvancedFilters from "./AdvancedFilters";
import TalentSideModal from "./TalentSideModal";
import CompCardModal from "./CompCardModal";
import {
  createTalentDigitals,
  createAgencyTalentInvite,
  getAgencyDigitals,
  getAgencyPayoutsAccountStatus,
  getAgencySeatBreakdown,
  listAgencyTalentInvites,
  revokeAgencyTalentInvite,
  getTalentDigitals,
  sendCoreEmail,
} from "@/api/functions";
import { supabase } from "@/lib/supabase";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DashboardTabRail,
  DashboardTableSurface,
} from "@/components/dashboard/DashboardResponsive";
import { useTranslation } from "react-i18next";

interface RosterViewProps {
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  categoryFilter: string;
  setCategoryFilter: (s: string) => void;
  sortConfig: { key: string; direction: "asc" | "desc" } | null;
  setSortConfig: (c: { key: string; direction: "asc" | "desc" } | null) => void;
  agencyMode: string;
  rosterData: any[];
  activeCampaigns?: number;
  earnings30dTotalCents?: number;
  earningsPrev30dTotalCents?: number;
  agencyName: string;
  agencyEmail?: string;
  agencyWebsite?: string;
  logoUrl?: string;
  kycStatus?: string | null;
  onEditProfile?: () => void;
  onViewMarketplace?: () => void;
  seatsLimit: number;
  isLoading?: boolean;
  onRosterChanged?: () => void;
  isSportsAgency?: boolean;
  initialOpenTalentId?: string;
  onInitialTalentOpened?: () => void;
}

const RosterView = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  sortConfig,
  setSortConfig,
  agencyMode,
  rosterData,
  activeCampaigns = 0,
  earnings30dTotalCents = 0,
  earningsPrev30dTotalCents = 0,
  agencyName,
  agencyEmail,
  agencyWebsite,
  logoUrl,
  kycStatus,
  onEditProfile,
  onViewMarketplace,
  seatsLimit,
  isLoading = false,
  onRosterChanged,
  isSportsAgency = false,
  initialOpenTalentId,
  onInitialTalentOpened,
}: RosterViewProps) => {
  const { t } = useTranslation("agency");
  const navigate = useNavigate();
  const { toast } = useToast();
  const [seatBreakdownOpen, setSeatBreakdownOpen] = useState(false);
  const [seatBreakdownLoading, setSeatBreakdownLoading] = useState(false);
  const [seatBreakdown, setSeatBreakdown] = useState<{
    total_active_seats: number;
    annual_seats: number;
    monthly_seats: number;
    items: Array<{
      source: "in_plan" | "seat_addon";
      interval: "month" | "year";
      seats: number;
      status: string;
      subscription_id: string;
      current_period_start?: string | null;
      current_period_end?: string | null;
    }>;
  } | null>(null);
  const [rosterTab, setRosterTab] = useState("roster");
  const [selectedTalent, setSelectedTalent] = useState<any | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showCompCardModal, setShowCompCardModal] = useState(false);

  const formatNumber = (value: number) =>
    new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
      Number.isFinite(value) ? value : 0,
    );

  const formatRosterStatus = (value: string | null | undefined) => {
    const normalized = String(value || "")
      .trim()
      .toLowerCase();
    if (!normalized) return t("agencyDashboard.roster.states.unknown");
    return t(`agencyDashboard.roster.filters.${normalized}`, {
      defaultValue: normalized.charAt(0).toUpperCase() + normalized.slice(1),
    });
  };

  const openSeatBreakdown = async () => {
    setSeatBreakdownOpen(true);
    setSeatBreakdownLoading(true);
    try {
      const resp = (await getAgencySeatBreakdown()) as any;
      setSeatBreakdown({
        total_active_seats: Number(resp?.total_active_seats || 0),
        annual_seats: Number(resp?.annual_seats || 0),
        monthly_seats: Number(resp?.monthly_seats || 0),
        items: Array.isArray(resp?.items) ? resp.items : [],
      });
    } catch (e: any) {
      const msg = String(e?.message || e || "");
      toast({
        title: t("agencyDashboard.roster.header.seatBreakdown.loadErrorTitle"),
        description:
          msg || t("agencyDashboard.roster.header.seatBreakdown.tryAgain"),
        variant: "destructive",
      });
    } finally {
      setSeatBreakdownLoading(false);
    }
  };
  const [digitalsFilter, setDigitalsFilter] = useState("All Talent");
  const [showInsufficientSeatsModal, setShowInsufficientSeatsModal] =
    useState(false);
  const singularLabel = isSportsAgency
    ? t("agencyDashboard.roster.entities.athlete")
    : t("agencyDashboard.roster.entities.talent");
  const pluralLabel = isSportsAgency
    ? t("agencyDashboard.roster.entities.athletes")
    : t("agencyDashboard.roster.entities.talents");
  const singularTitleLabel = isSportsAgency
    ? t("agencyDashboard.roster.entities.athleteTitle")
    : t("agencyDashboard.roster.entities.talentTitle");
  const pluralTitleLabel = isSportsAgency
    ? t("agencyDashboard.roster.entities.athletesTitle")
    : t("agencyDashboard.roster.entities.talentsTitle");
  const allRosterFilterLabel = isSportsAgency
    ? t("agencyDashboard.roster.filters.allAthletes")
    : t("agencyDashboard.roster.filters.allTalent");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSearch, setInviteSearch] = useState("");
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteSendingEmail, setInviteSendingEmail] = useState<string | null>(
    null,
  );
  const [talentInvites, setTalentInvites] = useState<any[]>([]);
  const [talentInvitesLoading, setTalentInvitesLoading] = useState(false);

  const refreshTalentInvites = async () => {
    setTalentInvitesLoading(true);
    try {
      const res: any = await listAgencyTalentInvites();
      const rows = res?.invites;
      setTalentInvites(Array.isArray(rows) ? rows : []);
    } catch {
      setTalentInvites([]);
    } finally {
      setTalentInvitesLoading(false);
    }
  };

  useEffect(() => {
    if (!inviteOpen) return;
    refreshTalentInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteOpen]);

  const [agencyDigitals, setAgencyDigitals] = useState<any[]>([]);
  const [agencyDigitalsLoading, setAgencyDigitalsLoading] = useState(false);
  const [historyTalent, setHistoryTalent] = useState<any | null>(null);
  const [historyRows, setHistoryRows] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [uploadTalent, setUploadTalent] = useState<any | null>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadDateTaken, setUploadDateTaken] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [uploadingDigitals, setUploadingDigitals] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderTargetIds, setReminderTargetIds] = useState<string[]>([]);
  const [reminderSubject, setReminderSubject] = useState(
    t("agencyDashboard.roster.digitals.reminder.subject"),
  );
  const [reminderBody, setReminderBody] = useState(
    t("agencyDashboard.roster.digitals.reminder.body"),
  );
  const [sendingReminder, setSendingReminder] = useState(false);

  const defaultAdvancedFilters = {
    gender: "all",
    heightMinCm: "",
    heightMaxCm: "",
    ageMin: "",
    ageMax: "",
    hairColor: "all",
    eyeColor: "all",
    ethnicity: "all",
    tattoos: "any",
    piercings: "any",
  };

  const [stripeStatusLoading, setStripeStatusLoading] = useState(false);
  const [stripeConnected, setStripeConnected] = useState<boolean | null>(null);
  const [stripeReady, setStripeReady] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setStripeStatusLoading(true);
      try {
        const resp = await getAgencyPayoutsAccountStatus();
        const data = (resp as any)?.data ?? resp;
        const connected = Boolean((data as any)?.connected);
        const ready = Boolean(
          (data as any)?.payouts_enabled || (data as any)?.transfers_enabled,
        );
        if (!mounted) return;
        setStripeConnected(connected);
        setStripeReady(ready);
      } catch {
        if (!mounted) return;
        setStripeConnected(null);
        setStripeReady(null);
      } finally {
        if (mounted) setStripeStatusLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const [advancedFilters, setAdvancedFilters] = useState(
    defaultAdvancedFilters,
  );

  // Real data calculations for stats
  const safeRosterData = Array.isArray(rosterData) ? rosterData : [];

  useEffect(() => {
    if (!selectedTalent) return;
    const latest = safeRosterData.find(
      (t: any) => t?.id === selectedTalent?.id,
    );
    if (latest && latest !== selectedTalent) {
      setSelectedTalent(latest);
    }
  }, [safeRosterData, selectedTalent]);

  // Auto-open side modal when navigated here with a specific talent id
  useEffect(() => {
    if (!initialOpenTalentId || safeRosterData.length === 0) return;
    const match = safeRosterData.find(
      (t: any) =>
        String(t?.id || "") === initialOpenTalentId ||
        String(t?.creator_id || "") === initialOpenTalentId,
    );
    if (match) {
      setSelectedTalent(match);
      onInitialTalentOpened?.();
    }
  }, [initialOpenTalentId, safeRosterData]);
  const activeTalentCount = safeRosterData.filter(
    (t) => t.status === "active",
  ).length;
  const totalMonthlyEarnings = safeRosterData.reduce(
    (acc, t) => acc + (t.earnings_val || 0),
    0,
  );
  const expiringLicensesCount = useMemo(() => {
    return safeRosterData.filter((talent) => {
      if (!talent?.expiry || talent.expiry === "—") return false;
      const expiryDate = new Date(talent.expiry);
      if (Number.isNaN(expiryDate.getTime())) return false;
      const today = new Date();
      const diffTime = expiryDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 && diffDays <= 30;
    }).length;
  }, [safeRosterData]);

  const earningsTrend = useMemo(() => {
    const current = Number.isFinite(earnings30dTotalCents)
      ? earnings30dTotalCents
      : totalMonthlyEarnings;
    const prev = Number.isFinite(earningsPrev30dTotalCents)
      ? earningsPrev30dTotalCents
      : 0;
    if (!prev) {
      if (!current) {
        return {
          label: t("agencyDashboard.roster.stats.previous30d", {
            value: "0%",
          }),
          positive: true,
          pct: 0,
        };
      }
      return {
        label: t("agencyDashboard.roster.stats.previous30d", {
          value: "+100%",
        }),
        positive: true,
        pct: 100,
      };
    }
    const pct = ((current - prev) / Math.abs(prev)) * 100;
    const rounded = Math.round(pct);
    const sign = rounded > 0 ? "+" : "";
    return {
      label: t("agencyDashboard.roster.stats.previous30d", {
        value: `${sign}${rounded}%`,
      }),
      positive: rounded >= 0,
      pct: rounded,
    };
  }, [
    earnings30dTotalCents,
    earningsPrev30dTotalCents,
    t,
    totalMonthlyEarnings,
  ]);

  // Digitals tracking calculations
  const calculateDaysSinceUpdate = (lastUpdated: string | null | undefined) => {
    if (!lastUpdated) return 0;
    const now = new Date();
    const updated = new Date(lastUpdated);
    const diffTime = Math.abs(now.getTime() - updated.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const refreshAgencyDigitals = async () => {
    setAgencyDigitalsLoading(true);
    try {
      const rows = (await getAgencyDigitals()) as any;
      setAgencyDigitals(Array.isArray(rows) ? rows : []);
    } catch {
      setAgencyDigitals([]);
    } finally {
      setAgencyDigitalsLoading(false);
    }
  };

  useEffect(() => {
    if (rosterTab === "digitals") {
      refreshAgencyDigitals();
    }
  }, [rosterTab]);

  const digitalsByTalent = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const row of agencyDigitals) {
      const tId = row?.talent_id;
      if (!tId) continue;
      const existing = map.get(tId) || [];
      existing.push(row);
      map.set(tId, existing);
    }
    for (const [k, rows] of map.entries()) {
      rows.sort((a, b) => {
        const da = new Date(a?.uploaded_at || a?.created_at || 0).getTime();
        const db = new Date(b?.uploaded_at || b?.created_at || 0).getTime();
        return db - da;
      });
      map.set(k, rows);
    }
    return map;
  }, [agencyDigitals]);

  const digitalsSummaryByTalent = useMemo(() => {
    const map = new Map<
      string,
      {
        lastUpdated: string | null;
        totalPhotos: number;
        latestPhotoUrls: string[];
      }
    >();
    for (const [talentId, rows] of digitalsByTalent.entries()) {
      const latest = rows[0];
      const lastUpdated = latest?.uploaded_at || latest?.created_at || null;
      const totalPhotos = rows.reduce(
        (acc, r) =>
          acc + (Array.isArray(r?.photo_urls) ? r.photo_urls.length : 0),
        0,
      );
      const latestPhotoUrls = Array.isArray(latest?.photo_urls)
        ? latest.photo_urls
        : [];
      map.set(talentId, { lastUpdated, totalPhotos, latestPhotoUrls });
    }
    return map;
  }, [digitalsByTalent]);

  const reminderTargetTalentIds = useMemo(() => {
    return safeRosterData
      .filter((talent) => {
        const last = digitalsSummaryByTalent.get(talent.id)?.lastUpdated;
        const days = calculateDaysSinceUpdate(last);
        return !!last && days >= 75;
      })
      .map((talent) => talent.id);
  }, [safeRosterData, digitalsSummaryByTalent]);

  const openReminderModal = (talentIds: string[], mode: "single" | "all") => {
    setReminderTargetIds(talentIds);
    setReminderSubject(t("agencyDashboard.roster.digitals.reminder.subject"));
    if (mode === "single") {
      setReminderBody(t("agencyDashboard.roster.digitals.reminder.body"));
      setReminderOpen(true);
    } else {
      // Remind All: send one default message without opening composer.
      void sendReminders(talentIds, {
        subject: t("agencyDashboard.roster.digitals.reminder.subject"),
        body: t("agencyDashboard.roster.digitals.reminder.body"),
      });
    }
  };

  const sendReminders = async (
    talentIds: string[],
    opts: { subject: string; body: string },
  ) => {
    const byId = new Map(
      safeRosterData.map((talent) => [talent.id, talent] as const),
    );
    const fromName = `Likelee.ai from ${agencyName}`;

    const targets = talentIds
      .map((id) => {
        const talent = byId.get(id);
        const email = String(talent?.email || "").trim();
        const name =
          String(
            talent?.name || talent?.stage_name || talent?.full_name || "there",
          ).trim() || "there";
        return { email, name };
      })
      .filter((item) => item.email.length > 0);

    if (!targets.length) {
      toast({
        title: t("agencyDashboard.roster.digitals.reminder.noEmailsTitle"),
        description: t(
          "agencyDashboard.roster.digitals.reminder.noEmailsDescription",
          { entityPlural: pluralLabel },
        ),
        variant: "destructive",
      });
      return;
    }

    setSendingReminder(true);
    try {
      let sent = 0;
      let failed = 0;
      const failures: string[] = [];
      for (const target of targets) {
        const subject = opts.subject;
        const body = opts.body.replace("{name}", target.name);
        try {
          await sendCoreEmail({
            to: target.email,
            subject,
            body,
            from_name: fromName,
          });
          sent += 1;
        } catch (e: any) {
          failed += 1;
          const msg = String(e?.message || "");
          failures.push(
            msg ||
              t("agencyDashboard.roster.digitals.reminder.failedRecipient", {
                email: target.email,
              }),
          );
        }
      }

      if (failed && !sent) {
        toast({
          title: t("agencyDashboard.roster.digitals.reminder.emailNotSent"),
          description:
            failures[0] ||
            t("agencyDashboard.roster.digitals.reminder.emailSendingFailed"),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t("agencyDashboard.roster.digitals.reminder.sentTitle"),
        description: t(
          "agencyDashboard.roster.digitals.reminder.sentDescription",
          {
            sent,
            failed,
          },
        ),
        ...(failed ? { variant: "destructive" as const } : {}),
      });
    } finally {
      setSendingReminder(false);
    }
  };

  const onSendReminderFromModal = async () => {
    if (!reminderTargetIds.length) return;
    await sendReminders(reminderTargetIds, {
      subject:
        reminderSubject.trim() ||
        t("agencyDashboard.roster.digitals.reminder.subject"),
      body: reminderBody,
    });
    setReminderOpen(false);
  };

  const digitalsStats = {
    current: safeRosterData.filter((talent) => {
      const last = digitalsSummaryByTalent.get(talent.id)?.lastUpdated;
      const days = calculateDaysSinceUpdate(last);
      return days < 75;
    }).length,
    needsReminder: safeRosterData.filter((talent) => {
      const last = digitalsSummaryByTalent.get(talent.id)?.lastUpdated;
      const days = calculateDaysSinceUpdate(last);
      return !!last && days >= 75 && days < 90;
    }).length,
    outdated: safeRosterData.filter((talent) => {
      const last = digitalsSummaryByTalent.get(talent.id)?.lastUpdated;
      const days = calculateDaysSinceUpdate(last);
      return !!last && days >= 90;
    }).length,
    total: safeRosterData.length,
  };

  const buildApiUrl = (path: string) => {
    const raw = (import.meta as any)?.env?.VITE_API_BASE_URL as
      | string
      | undefined;
    const base = raw || "/api";

    const baseUrl = base.startsWith("http")
      ? base
      : `${window.location.origin}${base.startsWith("/") ? base : `/${base}`}`;

    const baseTrimmed = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    const pathWithSlash = path.startsWith("/") ? path : `/${path}`;
    return `${baseTrimmed}${pathWithSlash}`;
  };

  const uploadDigitals = async () => {
    if (!uploadTalent) return;
    if (!uploadFiles.length) return;
    if (!uploadDateTaken) return;

    setUploadingDigitals(true);
    try {
      const {
        data: { session },
      } = supabase
        ? await supabase.auth.getSession()
        : { data: { session: null } };
      const token = session?.access_token;

      const sectionId = `digitals_${uploadTalent.id}_${Date.now()}`;
      const urls: string[] = [];
      for (const file of uploadFiles) {
        const buf = await file.arrayBuffer();
        const full = buildApiUrl(
          `/reference-images/upload?section_id=${encodeURIComponent(sectionId)}`,
        );
        const res = await fetch(full, {
          method: "POST",
          headers: {
            "content-type": file.type || "image/jpeg",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: new Uint8Array(buf),
        });
        if (!res.ok) {
          const raw = await res.text();
          throw new Error(raw);
        }
        const out = await res.json();
        const publicUrl = out?.public_url;
        if (publicUrl) urls.push(publicUrl);
      }

      const uploadedAt = new Date(`${uploadDateTaken}T00:00:00`).toISOString();
      await createTalentDigitals(uploadTalent.id, {
        photo_urls: urls,
        uploaded_at: uploadedAt,
      });

      setUploadTalent(null);
      setUploadFiles([]);
      setUploadDateTaken(new Date().toISOString().slice(0, 10));
      await refreshAgencyDigitals();
      onRosterChanged?.();

      toast({
        title: "Digital uploaded successfully!",
        description: `The ${singularLabel}'s digitals have been updated.`,
      });
    } catch (e: any) {
      const msg = typeof e?.message === "string" ? e.message : "Upload failed";
      toast({
        title: "Upload failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setUploadingDigitals(false);
    }
  };

  const openHistory = async (talent: any) => {
    setHistoryTalent(talent);
    setHistoryRows([]);
    setHistoryLoading(true);
    try {
      const rows = (await getTalentDigitals(talent.id)) as any;
      setHistoryRows(Array.isArray(rows) ? rows : []);
    } catch {
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAddTalentClick = () => {
    if (!seatsLimit || safeRosterData.length >= seatsLimit) {
      setShowInsufficientSeatsModal(true);
    } else {
      navigate("/addtalent");
    }
  };

  const handleInviteTalentClick = () => {
    setInviteSearch("");
    setInviteSendingEmail(null);
    setInviteOpen(true);
  };

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const filteredTalent = React.useMemo(() => {
    let data = Array.isArray(rosterData) ? [...rosterData] : [];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      data = data.filter((talent) => {
        const name = String(talent?.name ?? "").toLowerCase();
        const stage = String(talent?.stage_name ?? "").toLowerCase();
        const email = String(talent?.email ?? "").toLowerCase();
        const role = String(talent?.role ?? "").toLowerCase();
        const roleTypesText = Array.isArray((talent as any)?.role_types)
          ? ((talent as any).role_types as any[])
              .filter((x) => typeof x === "string")
              .join(",")
              .toLowerCase()
          : "";
        const skills = String(talent?.special_skills ?? "").toLowerCase();
        return (
          name.includes(q) ||
          stage.includes(q) ||
          email.includes(q) ||
          role.includes(q) ||
          roleTypesText.includes(q) ||
          skills.includes(q)
        );
      });
    }

    if (statusFilter !== "All Status") {
      data = data.filter(
        (talent) =>
          (talent.status || "").toLowerCase() === statusFilter.toLowerCase(),
      );
    }

    if (categoryFilter !== "All Categories") {
      const target = categoryFilter.toLowerCase();
      data = data.filter((talent) => {
        const role = String(talent?.role ?? "").toLowerCase();
        const roleTypes = Array.isArray((talent as any)?.role_types)
          ? ((talent as any).role_types as any[])
              .filter((x) => typeof x === "string")
              .map((s) => String(s).toLowerCase())
          : [];
        if (role === target) return true;
        if (roleTypes.includes(target)) return true;
        return false;
      });
    }

    const normalize = (s: any) =>
      typeof s === "string" ? s.trim().toLowerCase() : "";
    const normalizeHair = (s: any) => {
      const v = normalize(s);
      if (v === "brunette") return "brown";
      return v;
    };
    const ageYears = (dob?: string | null) => {
      if (!dob) return null;
      const d = new Date(dob);
      if (Number.isNaN(d.getTime())) return null;
      const now = new Date();
      let age = now.getFullYear() - d.getFullYear();
      const m = now.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
      return age;
    };
    const heightCm = (t: any) => {
      const ft = Number(t?.height_feet);
      const inch = Number(t?.height_inches);
      if (!Number.isFinite(ft) && !Number.isFinite(inch)) return null;
      const ftVal = Number.isFinite(ft) ? ft : 0;
      const inchVal = Number.isFinite(inch) ? inch : 0;
      return ftVal * 30.48 + inchVal * 2.54;
    };

    if (advancedFilters.gender !== "all") {
      data = data.filter(
        (t) =>
          normalize(t.gender_identity) === normalize(advancedFilters.gender),
      );
    }

    if (advancedFilters.hairColor !== "all") {
      data = data.filter(
        (t) =>
          normalizeHair(t.hair_color) ===
          normalizeHair(advancedFilters.hairColor),
      );
    }

    if (advancedFilters.eyeColor !== "all") {
      data = data.filter(
        (t) => normalize(t.eye_color) === normalize(advancedFilters.eyeColor),
      );
    }

    if (advancedFilters.ethnicity !== "all") {
      const target = normalize(advancedFilters.ethnicity);
      const matchesEth = (v: string) => {
        const s = normalize(v);
        if (target === "white")
          return s.includes("white") || s.includes("caucasian");
        if (target === "black")
          return s.includes("black") || s.includes("african");
        if (target === "asian") return s.includes("asian");
        if (target === "hispanic")
          return s.includes("hispanic") || s.includes("latino");
        if (target === "middle_eastern")
          return (
            s.includes("middle") ||
            s.includes("mena") ||
            s.includes("north african") ||
            s.includes("arab")
          );
        if (target === "mixed")
          return s.includes("mixed") || s.includes("multiracial");
        if (target === "other") return s.includes("other");
        return s.includes(target);
      };
      data = data.filter((talent) => {
        const arr = Array.isArray(talent.race_ethnicity)
          ? talent.race_ethnicity
          : [];
        return arr.some((x: any) => typeof x === "string" && matchesEth(x));
      });
    }

    if (advancedFilters.heightMinCm || advancedFilters.heightMaxCm) {
      const min = advancedFilters.heightMinCm
        ? Number(advancedFilters.heightMinCm)
        : null;
      const max = advancedFilters.heightMaxCm
        ? Number(advancedFilters.heightMaxCm)
        : null;
      data = data.filter((talent) => {
        const h = heightCm(talent);
        if (h == null) return true;
        if (min != null && Number.isFinite(min) && h < min) return false;
        if (max != null && Number.isFinite(max) && h > max) return false;
        return true;
      });
    }

    if (advancedFilters.ageMin || advancedFilters.ageMax) {
      const min = advancedFilters.ageMin
        ? Number(advancedFilters.ageMin)
        : null;
      const max = advancedFilters.ageMax
        ? Number(advancedFilters.ageMax)
        : null;
      data = data.filter((talent) => {
        const a = ageYears(talent.date_of_birth);
        if (a == null) return true;
        if (min != null && Number.isFinite(min) && a < min) return false;
        if (max != null && Number.isFinite(max) && a > max) return false;
        return true;
      });
    }

    if (advancedFilters.tattoos !== "any") {
      data = data.filter((talent: any) => {
        const has =
          typeof talent?.tattoos === "boolean"
            ? (talent.tattoos as boolean)
            : null;
        if (advancedFilters.tattoos === "yes") return has === true;
        if (advancedFilters.tattoos === "no") return has === false;
        return true;
      });
    }

    if (advancedFilters.piercings !== "any") {
      data = data.filter((talent: any) => {
        const has =
          typeof talent?.piercings === "boolean"
            ? (talent.piercings as boolean)
            : null;
        if (advancedFilters.piercings === "yes") return has === true;
        if (advancedFilters.piercings === "no") return has === false;
        return true;
      });
    }

    if (sortConfig) {
      const key = sortConfig.key;
      const dir = sortConfig.direction;
      const numericKeys = new Set(["followers_val", "earnings_val"]);

      data.sort((a, b) => {
        if (numericKeys.has(key)) {
          const valA = Number((a as any)[key] ?? 0);
          const valB = Number((b as any)[key] ?? 0);
          if (valA < valB) return dir === "asc" ? -1 : 1;
          if (valA > valB) return dir === "asc" ? 1 : -1;
          return 0;
        }

        const valA = String((a as any)[key] ?? "").toLowerCase();
        const valB = String((b as any)[key] ?? "").toLowerCase();
        if (valA < valB) return dir === "asc" ? -1 : 1;
        if (valA > valB) return dir === "asc" ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [
    rosterData,
    searchTerm,
    statusFilter,
    categoryFilter,
    sortConfig,
    advancedFilters,
  ]);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("All Status");
    setCategoryFilter("All Categories");
    setSortConfig(null);
    setAdvancedFilters(defaultAdvancedFilters);
  };

  const digitalsRows = React.useMemo(() => {
    return safeRosterData
      .filter((talent) => {
        const summary = digitalsSummaryByTalent.get(talent.id);
        const last = summary?.lastUpdated;
        const daysAgo = calculateDaysSinceUpdate(last);
        if (digitalsFilter === "Current Only") return daysAgo < 75;
        if (digitalsFilter === "Needs Reminder")
          return !!last && daysAgo >= 75 && daysAgo < 90;
        if (digitalsFilter === "Outdated Only") return !!last && daysAgo >= 90;
        return true;
      })
      .map((talent) => {
        const summary = digitalsSummaryByTalent.get(talent.id);
        const last = summary?.lastUpdated;
        const totalPhotos = summary?.totalPhotos ?? (talent.assets || 0);
        return { talent, lastUpdated: last, totalPhotos };
      });
  }, [safeRosterData, digitalsFilter, digitalsSummaryByTalent]);

  const historyGroups = React.useMemo(() => {
    const groups = new Map<string, any[]>();
    const rows = Array.isArray(historyRows) ? [...historyRows] : [];
    rows.sort((a, b) => {
      const da = new Date(a?.uploaded_at || a?.created_at || 0).getTime();
      const db = new Date(b?.uploaded_at || b?.created_at || 0).getTime();
      return db - da;
    });
    for (const row of rows) {
      const key =
        (row?.uploaded_at || row?.created_at || "").slice(0, 10) ||
        t("agencyDashboard.roster.states.unknown");
      const existing = groups.get(key) || [];
      existing.push(row);
      groups.set(key, existing);
    }
    return Array.from(groups.entries()).map(([date, entries]) => ({
      date,
      entries,
    }));
  }, [historyRows]);

  const formatCurrency = (valCents: number) => {
    const cents = Number(valCents);
    if (!Number.isFinite(cents)) return "$0";
    const abs = Math.abs(cents);
    const minFractionDigits = abs % 100 === 0 ? 0 : 2;
    const dollars = cents / 100;
    return dollars.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: minFractionDigits,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="space-y-6">
      {/* Agency Header Section */}
      <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-white border border-gray-200 rounded-lg flex items-center justify-center p-2 shadow-sm overflow-hidden">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={agencyName}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="font-serif text-2xl font-bold text-gray-900">
                  {String(agencyName).substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">
                  {agencyName}
                </h1>
                {kycStatus === "approved" && (
                  <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified Agency
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2 text-sm text-gray-500 font-medium">
                {!!agencyEmail && (
                  <span className="flex items-center gap-2 min-w-0">
                    <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="truncate">{agencyEmail}</span>
                  </span>
                )}
                {!!agencyWebsite && (
                  <a
                    className="flex items-center gap-2 min-w-0 hover:underline hover:text-[#0B9DA2] transition-colors"
                    href={agencyWebsite}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Globe className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="truncate">{agencyWebsite}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              className="w-full bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 font-semibold gap-2 transition-all sm:w-auto shadow-sm"
              onClick={() => navigate("/agencysubscribe")}
            >
              Upgrade plan
            </Button>
            <Button
              variant="outline"
              className="w-full text-blue-600 border-blue-200 bg-white/50 hover:bg-blue-50 gap-2 sm:w-auto transition-all shadow-sm"
              onClick={() => onEditProfile?.()}
              disabled={!onEditProfile}
            >
              <Pencil className="w-4 h-4" />
              Edit Profile
            </Button>
            <Button
              variant="outline"
              className="w-full text-blue-600 border-blue-200 bg-white/50 hover:bg-blue-50 gap-2 sm:w-auto transition-all shadow-sm"
              onClick={() => onViewMarketplace?.()}
              disabled={!onViewMarketplace}
            >
              <Eye className="w-4 h-4" />
              View Marketplace
            </Button>
          </div>
        </div>

        <div className="h-px bg-gray-100 my-6"></div>

        <div className="flex flex-wrap gap-8 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <ShieldCheck
              className={`w-4 h-4 ${
                stripeReady ? "text-green-500" : "text-gray-300"
              }`}
            />
            <span className="font-medium">
              {stripeStatusLoading
                ? "Stripe status"
                : stripeConnected
                  ? stripeReady
                    ? "Stripe Connected"
                    : "Stripe Connected (setup incomplete)"
                  : "Stripe Not Connected"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              void openSeatBreakdown();
            }}
            className="group flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-gray-50"
          >
            <Users className="w-4 h-4 text-gray-400 group-hover:text-[#0B9DA2]" />
            <span className="font-medium group-hover:text-[#0B9DA2]">
              {rosterData.length} / {seatsLimit || 0} seats used
            </span>
          </button>
        </div>
      </Card>

      <Dialog open={seatBreakdownOpen} onOpenChange={setSeatBreakdownOpen}>
        <DialogContent className="w-[95vw] max-w-2xl">
          <DialogHeader>
            <DialogTitle>Seat Breakdown</DialogTitle>
            <DialogDescription>
              Your total seats can come from annual and monthly subscriptions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">
                  Total active
                </div>
                <div className="mt-1 text-2xl font-black text-gray-900">
                  {seatBreakdownLoading
                    ? "…"
                    : formatNumber(seatBreakdown?.total_active_seats || 0)}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">
                  Annual
                </div>
                <div className="mt-1 text-2xl font-black text-gray-900">
                  {seatBreakdownLoading
                    ? "…"
                    : formatNumber(seatBreakdown?.annual_seats || 0)}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">
                  Monthly
                </div>
                <div className="mt-1 text-2xl font-black text-gray-900">
                  {seatBreakdownLoading
                    ? "…"
                    : formatNumber(seatBreakdown?.monthly_seats || 0)}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-12 gap-2 bg-gray-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-gray-500">
                <div className="col-span-2">Interval</div>
                <div className="col-span-2">Source</div>
                <div className="col-span-2 text-right">Seats</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-4">Renews/Ends</div>
              </div>
              <div className="divide-y divide-gray-100">
                {(seatBreakdown?.items || []).length === 0 ? (
                  <div className="px-4 py-6 text-sm text-gray-500">
                    {seatBreakdownLoading
                      ? t("agencyDashboard.roster.states.loading")
                      : t(
                          "agencyDashboard.roster.header.seatBreakdown.noActiveSubscriptions",
                        )}
                  </div>
                ) : (
                  (seatBreakdown?.items || []).map((item) => (
                    <div
                      key={item.subscription_id}
                      className="grid grid-cols-12 gap-2 px-4 py-3 text-sm"
                    >
                      <div className="col-span-2 font-bold text-gray-900">
                        {item.interval === "year"
                          ? t(
                              "agencyDashboard.roster.header.seatBreakdown.annual",
                            )
                          : t(
                              "agencyDashboard.roster.header.seatBreakdown.monthly",
                            )}
                      </div>
                      <div className="col-span-2 text-gray-600">
                        {item.source === "seat_addon"
                          ? t(
                              "agencyDashboard.roster.header.seatBreakdown.addOn",
                            )
                          : t(
                              "agencyDashboard.roster.header.seatBreakdown.inPlan",
                            )}
                      </div>
                      <div className="col-span-2 text-right font-bold text-gray-900">
                        {formatNumber(item.seats)}
                      </div>
                      <div className="col-span-2 text-gray-600">
                        {String(item.status || "").toLowerCase()}
                      </div>
                      <div className="col-span-4 text-gray-600">
                        {item.current_period_end
                          ? new Date(
                              item.current_period_end,
                            ).toLocaleDateString()
                          : "—"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSeatBreakdownOpen(false)}
            >
              {t("agencyDashboard.roster.actions.close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-xl flex items-start justify-between min-h-[150px] sm:min-h-0">
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-1">
              {t("agencyDashboard.roster.stats.activeEntities", {
                entityPlural: pluralTitleLabel,
              })}
            </p>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">
              {activeTalentCount}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {t("agencyDashboard.roster.stats.ofTotal", {
                count: rosterData.length,
              })}
            </p>
          </div>
          <Users className="w-8 h-8 sm:w-10 sm:h-10 text-gray-100" />
        </Card>
        <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-xl flex items-start justify-between min-h-[150px] sm:min-h-0">
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-1">
              {t("agencyDashboard.roster.stats.monthlyEarnings")}
            </p>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">
              {formatCurrency(totalMonthlyEarnings)}
            </div>
            {(earnings30dTotalCents !== 0 ||
              earningsPrev30dTotalCents !== 0) && (
              <p
                className={`text-xs font-medium mt-1 ${earningsTrend.positive ? "text-green-500" : "text-red-500"}`}
              >
                {earningsTrend.positive ? (
                  <TrendingUp className="w-3 h-3 inline mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 inline mr-1" />
                )}
                {earningsTrend.label}
              </p>
            )}
          </div>
          <DollarSign className="w-8 h-8 sm:w-10 sm:h-10 text-gray-100" />
        </Card>
        <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-xl flex items-start justify-between min-h-[150px] sm:min-h-0">
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-1">
              {t("agencyDashboard.roster.stats.activeCampaigns")}
            </p>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">
              {activeCampaigns}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {t("agencyDashboard.roster.stats.acrossAllEntities", {
                entityPlural: pluralLabel,
              })}
            </p>
          </div>
          <Briefcase className="w-8 h-8 sm:w-10 sm:h-10 text-gray-100" />
        </Card>
        {agencyMode === "AI" && (
          <Card className="p-4 sm:p-6 bg-white border border-gray-200 shadow-sm rounded-xl flex items-start justify-between min-h-[150px] sm:min-h-0">
            <div>
              <p className="text-sm font-semibold text-gray-500 mb-1">
                {t("agencyDashboard.roster.stats.expiringLicenses")}
              </p>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                {expiringLicensesCount}
              </div>
              <p className="text-xs text-orange-500 font-medium mt-1">
                {t("agencyDashboard.roster.stats.requireRenewal")}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-gray-100" />
          </Card>
        )}
      </div>

      {/* Roster Table Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <DashboardTabRail
            className="-mx-1 px-1 flex-1 min-w-0"
            items={[
              "Roster",
              "Digitals Tracking",
              "Campaigns",
              "Licenses",
              "Analytics",
            ]
              .filter((tab) => {
                const isLicenses = tab === "Licenses";
                const isCampaigns = tab === "Campaigns";
                const isAiMode = agencyMode === "AI";
                if (isLicenses && !isAiMode) return false;
                if (isCampaigns && isAiMode) return false;
                return true;
              })
              .map((tab) => ({
                id: tab.toLowerCase().split(" ")[0],
                label:
                  tab === "Analytics"
                    ? t("agencyDashboard.roster.tabs.analyticsPro", {
                        defaultValue: "Analytics Pro",
                      })
                    : t(
                        `agencyDashboard.roster.tabs.${
                          tab === "Digitals Tracking"
                            ? "digitalsTracking"
                            : tab.toLowerCase()
                        }`,
                        { defaultValue: tab },
                      ),
                active: rosterTab === tab.toLowerCase().split(" ")[0],
                onClick: () => setRosterTab(tab.toLowerCase().split(" ")[0]),
              }))}
          />
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 font-bold h-9 rounded-lg shrink-0"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">
                {t("agencyDashboard.roster.actions.exportCsv")}
              </span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleInviteTalentClick}
              className="border-gray-200 gap-2 font-bold h-9 rounded-lg shrink-0"
            >
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">
                {t("agencyDashboard.roster.actions.sendPortalInvite")}
              </span>
            </Button>
            <Button
              size="sm"
              onClick={handleAddTalentClick}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-bold h-9 rounded-lg px-4 shrink-0"
            >
              <Plus className="w-4 h-4" />{" "}
              <span>
                {isSportsAgency
                  ? t("agencyDashboard.roster.actions.addAthlete")
                  : t("agencyDashboard.roster.actions.addTalent")}
              </span>
            </Button>
          </div>
        </div>

        <div className="p-6">
          {rosterTab === "roster" && (
            <>
              <div
                onClick={() => setShowCompCardModal(true)}
                className="cursor-pointer"
              >
                <CompCardBanner />
              </div>
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder={t(
                        "agencyDashboard.roster.filters.searchEntity",
                        {
                          entity: singularLabel,
                        },
                      )}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-11"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="All Status">
                        {t("agencyDashboard.roster.filters.allStatus")}
                      </option>
                      <option value="Active">
                        {t("agencyDashboard.roster.filters.active")}
                      </option>
                      <option value="Pending">
                        {t("agencyDashboard.roster.filters.pending")}
                      </option>
                      <option value="Inactive">
                        {t("agencyDashboard.roster.filters.inactive")}
                      </option>
                    </select>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="All Categories">
                        {t("agencyDashboard.roster.filters.allCategories")}
                      </option>
                      <option value="Model">
                        {t("agencyDashboard.roster.categories.model")}
                      </option>
                      <option value="Actor">
                        {t("agencyDashboard.roster.categories.actor")}
                      </option>
                      <option value="Creator">
                        {t("agencyDashboard.roster.categories.creator")}
                      </option>
                      <option value="Voice">
                        {t("agencyDashboard.roster.categories.voice")}
                      </option>
                      <option value="Athlete">
                        {t("agencyDashboard.roster.categories.athlete")}
                      </option>
                    </select>
                    <Button
                      variant="outline"
                      className={`gap-2 font-bold h-11 rounded-lg px-6 w-full sm:w-auto ${showAdvancedFilters ? "bg-gray-100 border-gray-300" : ""}`}
                      onClick={() =>
                        setShowAdvancedFilters(!showAdvancedFilters)
                      }
                    >
                      <Filter className="w-4 h-4" />
                      {t("agencyDashboard.roster.filters.advancedFilters")}
                    </Button>
                  </div>
                </div>

                {showAdvancedFilters && (
                  <AdvancedFilters
                    onReset={clearFilters}
                    filters={advancedFilters}
                    onChange={setAdvancedFilters}
                  />
                )}

                <div className="md:hidden space-y-3">
                  {isLoading && filteredTalent.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500 font-medium py-8">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("agencyDashboard.roster.states.loadingEntities", {
                        entityPlural: pluralLabel,
                      })}
                    </div>
                  ) : filteredTalent.length === 0 ? (
                    <div className="text-center text-sm text-gray-500 font-medium py-8">
                      {t("agencyDashboard.roster.states.noEntities", {
                        entityPlural: pluralLabel,
                      })}
                    </div>
                  ) : (
                    filteredTalent.map((talent) => {
                      const displayStatus = formatRosterStatus(talent.status);
                      const roleLabels =
                        Array.isArray((talent as any).role_types) &&
                        (talent as any).role_types.length > 0
                          ? (talent as any).role_types
                              .filter(
                                (item: any) =>
                                  typeof item === "string" &&
                                  item.trim().length > 0,
                              )
                              .slice(0, 3)
                          : [String(talent.role || "Model")];
                      const sportsLabel = Array.isArray(talent.sports)
                        ? talent.sports.join(", ")
                        : talent.sport || talent.sports || "—";

                      return (
                        <button
                          key={talent.id}
                          type="button"
                          className="w-full text-left rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300"
                          onClick={() => setSelectedTalent(talent)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                              <img
                                src={talent.img || "https://placehold.co/150"}
                                alt={talent.name}
                                className="h-12 w-12 rounded-xl bg-slate-50 object-contain"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate text-lg font-bold text-slate-900">
                                    {talent.name}
                                  </span>
                                  {talent.is_verified && (
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                                  )}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                  {roleLabels.map((label: string) => (
                                    <Badge
                                      key={label}
                                      variant="secondary"
                                      className="border-none bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700"
                                    >
                                      {label}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <Badge
                              variant="secondary"
                              className={`shrink-0 border px-2.5 py-1 text-[10px] font-bold ${
                                displayStatus ===
                                t("agencyDashboard.roster.filters.active")
                                  ? "border-green-200 bg-green-50 text-green-700"
                                  : displayStatus ===
                                      t(
                                        "agencyDashboard.roster.filters.pending",
                                      )
                                    ? "border-amber-200 bg-amber-50 text-amber-700"
                                    : "border-slate-200 bg-slate-100 text-slate-700"
                              }`}
                            >
                              {displayStatus}
                            </Badge>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-sm">
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                {t("agencyDashboard.roster.table.followers")}
                              </div>
                              <div className="mt-1 text-base font-bold text-slate-900">
                                {formatNumber(Number(talent.followers || 0))}
                              </div>
                            </div>
                            <div>
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                {agencyMode === "IRL"
                                  ? t("agencyDashboard.roster.table.assets")
                                  : t(
                                      "agencyDashboard.roster.table.revenue30d",
                                    )}
                              </div>
                              <div className="mt-1 text-base font-bold text-slate-900">
                                {agencyMode === "IRL"
                                  ? formatNumber(Number(talent.assets || 0))
                                  : formatCurrency(
                                      Number(talent?.earnings_val ?? 0),
                                    )}
                              </div>
                            </div>
                            {agencyMode === "AI" && (
                              <>
                                <div>
                                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    {t("agencyDashboard.roster.table.topBrand")}
                                  </div>
                                  <div className="mt-1 truncate text-sm font-semibold text-slate-900">
                                    {talent.top_brand || "—"}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    {t(
                                      "agencyDashboard.roster.table.licenseExpiry",
                                    )}
                                  </div>
                                  <div className="mt-1 text-sm font-semibold text-slate-900">
                                    {talent.expiry || "—"}
                                  </div>
                                </div>
                              </>
                            )}
                            {isSportsAgency ? (
                              <>
                                <div>
                                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    {t(
                                      "agencyDashboard.roster.table.organization",
                                    )}
                                  </div>
                                  <div className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900">
                                    {talent.organization ||
                                      talent.school ||
                                      "—"}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    {t("agencyDashboard.roster.table.sports")}
                                  </div>
                                  <div className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900">
                                    {sportsLabel}
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div>
                                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                  {t("agencyDashboard.roster.table.assets")}
                                </div>
                                <div className="mt-1 text-sm font-semibold text-slate-900">
                                  {formatNumber(Number(talent.assets || 0))}
                                </div>
                              </div>
                            )}
                          </div>

                          {agencyMode === "AI" &&
                            Array.isArray(talent.ai_usage) &&
                            talent.ai_usage.length > 0 && (
                              <div className="mt-3">
                                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                  {t("agencyDashboard.roster.table.aiUsage")}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {talent.ai_usage.map((usage: string) => {
                                    let Icon = null;
                                    if (usage === "Video") Icon = Video;
                                    else if (usage === "Image")
                                      Icon = ImageIcon;
                                    else if (usage === "Voice") Icon = Mic;

                                    return (
                                      <Badge
                                        key={usage}
                                        variant="outline"
                                        className="flex items-center gap-1.5 rounded-md border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                                      >
                                        {Icon && (
                                          <Icon className="h-3.5 w-3.5" />
                                        )}
                                        {usage}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                        </button>
                      );
                    })
                  )}
                </div>

                <DashboardTableSurface className="hidden rounded-xl border border-gray-100 md:block">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-6 py-4 text-xs font-bold text-gray-900 uppercase tracking-wide">
                          <button
                            type="button"
                            onClick={() => handleSort("name")}
                            className="flex items-center gap-1 cursor-pointer pointer-events-auto"
                          >
                            {singularTitleLabel}{" "}
                            <ArrowUpDown className="w-3 h-3 text-gray-500" />
                          </button>
                        </th>
                        {agencyMode === "AI" && (
                          <>
                            <th className="px-6 py-4 text-xs font-bold text-gray-900 uppercase tracking-wide">
                              <button
                                type="button"
                                onClick={() => handleSort("status")}
                                className="flex items-center gap-1 cursor-pointer pointer-events-auto"
                              >
                                {t("agencyDashboard.roster.table.status")}{" "}
                                <ArrowUpDown className="w-3 h-3 text-gray-500" />
                              </button>
                            </th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-900 uppercase tracking-wide">
                              {t("agencyDashboard.roster.table.aiUsage")}
                            </th>
                          </>
                        )}
                        <th className="px-6 py-4 text-xs font-bold text-gray-900 uppercase tracking-wide">
                          <button
                            type="button"
                            onClick={() => handleSort("followers_val")}
                            className="flex items-center gap-1 cursor-pointer pointer-events-auto"
                          >
                            {t("agencyDashboard.roster.table.followers")}{" "}
                            <ArrowUpDown className="w-3 h-3 text-gray-500" />
                          </button>
                        </th>
                        {isSportsAgency ? (
                          <>
                            <th className="px-6 py-4 text-xs font-bold text-gray-900 uppercase tracking-wide">
                              {t("agencyDashboard.roster.table.organization")}
                            </th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-900 uppercase tracking-wide">
                              {t("agencyDashboard.roster.table.sports")}
                            </th>
                          </>
                        ) : (
                          <th className="px-6 py-4 text-xs font-bold text-gray-900 uppercase tracking-wide">
                            {t("agencyDashboard.roster.table.assets")}
                          </th>
                        )}
                        {agencyMode !== "IRL" && (
                          <>
                            <th className="px-6 py-4 text-xs font-bold text-gray-900 uppercase tracking-wide">
                              {t("agencyDashboard.roster.table.topBrand")}
                            </th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-900 uppercase tracking-wide">
                              {t("agencyDashboard.roster.table.licenseExpiry")}
                            </th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-900 uppercase tracking-wide">
                              <button
                                type="button"
                                onClick={() => handleSort("earnings_val")}
                                className="flex items-center gap-1 cursor-pointer pointer-events-auto"
                              >
                                30D Revenue{" "}
                                <ArrowUpDown className="w-3 h-3 text-gray-500" />
                              </button>
                            </th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 bg-white">
                      {isLoading && filteredTalent.length === 0 ? (
                        <tr>
                          <td
                            colSpan={
                              agencyMode === "AI"
                                ? isSportsAgency
                                  ? 10
                                  : 9
                                : isSportsAgency
                                  ? 5
                                  : 4
                            }
                            className="px-6 py-10"
                          >
                            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 font-medium">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              {`Loading ${pluralLabel}…`}
                            </div>
                          </td>
                        </tr>
                      ) : filteredTalent.length === 0 ? (
                        <tr>
                          <td
                            colSpan={
                              agencyMode === "AI"
                                ? isSportsAgency
                                  ? 10
                                  : 9
                                : isSportsAgency
                                  ? 5
                                  : 4
                            }
                            className="px-6 py-10"
                          >
                            <div className="text-center text-sm text-gray-500 font-medium">
                              {`No ${pluralLabel} to display.`}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                      {filteredTalent.map((talent) => (
                        <tr
                          key={talent.id}
                          className="hover:bg-gray-50/50 cursor-pointer transition-colors group"
                          onClick={() => setSelectedTalent(talent)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={talent.img || "https://placehold.co/150"}
                                alt={talent.name}
                                className="w-10 h-10 rounded-lg object-contain bg-gray-50"
                              />
                              <div>
                                <div className="flex items-center gap-1">
                                  <span className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                    {talent.name}
                                  </span>
                                  {talent.is_verified && (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                  )}
                                </div>
                                <div className="mt-1">
                                  <div className="flex flex-wrap gap-1">
                                    {Array.isArray(
                                      (talent as any).role_types,
                                    ) &&
                                    (talent as any).role_types.length > 0 ? (
                                      (talent as any).role_types
                                        .filter(
                                          (x: any) =>
                                            typeof x === "string" &&
                                            x.trim().length > 0,
                                        )
                                        .slice(0, 3)
                                        .map((r: string) => (
                                          <Badge
                                            key={r}
                                            variant="secondary"
                                            className="bg-gray-100 text-gray-700 border-none font-bold text-[10px]"
                                          >
                                            {r}
                                          </Badge>
                                        ))
                                    ) : (
                                      <Badge
                                        variant="secondary"
                                        className="bg-gray-100 text-gray-700 border-none font-bold text-[10px]"
                                      >
                                        {String(talent.role || "Model")}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                          {agencyMode === "AI" && (
                            <>
                              <td className="px-6 py-4 text-sm font-medium">
                                {talent.status}
                              </td>
                              <td className="px-6 py-4 flex flex-nowrap items-center gap-2">
                                {talent.ai_usage?.map((u: string) => {
                                  let Icon = null;
                                  if (u === "Video") Icon = Video;
                                  else if (u === "Image") Icon = ImageIcon;
                                  else if (u === "Voice") Icon = Mic;
                                  return (
                                    <Badge
                                      key={u}
                                      variant="outline"
                                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-white text-gray-900 border border-gray-200 shadow-sm"
                                    >
                                      {Icon && <Icon className="w-3.5 h-3.5" />}
                                      {u}
                                    </Badge>
                                  );
                                })}
                              </td>
                            </>
                          )}
                          <td className="px-6 py-4 text-sm font-medium">
                            {talent.followers || "0"}
                          </td>
                          {isSportsAgency ? (
                            <>
                              <td className="px-6 py-4 text-sm font-medium">
                                {talent.organization || talent.school || "—"}
                              </td>
                              <td className="px-6 py-4 text-sm font-medium">
                                {Array.isArray(talent.sports)
                                  ? talent.sports.join(", ")
                                  : talent.sport || talent.sports || "—"}
                              </td>
                            </>
                          ) : (
                            <td className="px-6 py-4 text-sm font-medium">
                              {talent.assets || "0"}
                            </td>
                          )}
                          {agencyMode !== "IRL" && (
                            <>
                              <td className="px-6 py-4 text-sm font-medium">
                                {talent.top_brand || "—"}
                              </td>
                              <td className="px-6 py-4 text-sm font-medium text-gray-600">
                                {talent.expiry || "—"}
                              </td>
                              <td className="px-6 py-4 text-sm font-bold text-gray-900">
                                {formatCurrency(
                                  Number(talent?.earnings_val ?? 0),
                                )}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </DashboardTableSurface>
              </div>
            </>
          )}

          {rosterTab === "analytics" && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-100">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Analytics
              </h2>
              <p className="text-gray-500 max-w-md mb-8">Coming soon.</p>
              <Button
                disabled
                className="bg-gray-200 text-gray-500 font-bold h-12 px-8 rounded-xl"
              >
                Coming soon
              </Button>
            </div>
          )}

          {rosterTab === "digitals" && (
            <div className="space-y-6">
              {/* Digitals Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {t("agencyDashboard.roster.digitals.title")}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {t("agencyDashboard.roster.digitals.subtitle", {
                      entity: singularLabel,
                    })}
                  </p>
                </div>
              </div>

              {/* Remind All Action */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() =>
                    openReminderModal(reminderTargetTalentIds, "all")
                  }
                  className="gap-2 text-gray-700 border-gray-200 font-bold hover:bg-gray-50 h-10"
                  disabled={reminderTargetTalentIds.length === 0}
                >
                  <Send className="w-4 h-4" />{" "}
                  {t("agencyDashboard.roster.digitals.remindAll")} (
                  {digitalsStats.needsReminder + digitalsStats.outdated})
                </Button>
              </div>

              {agencyDigitalsLoading && (
                <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                  <Loader2 className="w-4 h-4 animate-spin" />{" "}
                  {t("agencyDashboard.roster.digitals.loading")}
                </div>
              )}

              {/* Digitals Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card
                  className={`p-5 cursor-pointer transition-all rounded-xl ${
                    digitalsFilter === "Current Only"
                      ? "bg-indigo-50 border-2 border-indigo-200 shadow-sm"
                      : "bg-white border border-gray-100 shadow-sm hover:border-indigo-100"
                  }`}
                  onClick={() => setDigitalsFilter("Current Only")}
                >
                  <div
                    className={`flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider ${
                      digitalsFilter === "Current Only"
                        ? "text-indigo-700"
                        : "text-gray-400"
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />{" "}
                    {t("agencyDashboard.roster.digitals.current")}
                  </div>
                  <p
                    className={`text-3xl font-bold mb-1 ${
                      digitalsFilter === "Current Only"
                        ? "text-indigo-900"
                        : "text-gray-900"
                    }`}
                  >
                    {digitalsStats.current}
                  </p>
                  <p
                    className={`text-xs font-bold ${
                      digitalsFilter === "Current Only"
                        ? "text-indigo-600"
                        : "text-blue-500"
                    }`}
                  >
                    {t("agencyDashboard.roster.digitals.upToDate")}
                  </p>
                </Card>

                <Card
                  className={`p-5 cursor-pointer transition-all rounded-xl ${
                    digitalsFilter === "Needs Reminder"
                      ? "bg-indigo-50 border-2 border-indigo-200 shadow-sm"
                      : "bg-white border border-gray-100 shadow-sm hover:border-indigo-100"
                  }`}
                  onClick={() => setDigitalsFilter("Needs Reminder")}
                >
                  <div
                    className={`flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider ${
                      digitalsFilter === "Needs Reminder"
                        ? "text-indigo-700"
                        : "text-gray-400"
                    }`}
                  >
                    <Clock className="w-4 h-4" />{" "}
                    {t("agencyDashboard.roster.digitals.reminderDue")}
                  </div>
                  <p
                    className={`text-3xl font-bold mb-1 ${
                      digitalsFilter === "Needs Reminder"
                        ? "text-indigo-900"
                        : "text-gray-900"
                    }`}
                  >
                    {digitalsStats.needsReminder}
                  </p>
                  <p
                    className={`text-xs font-medium ${
                      digitalsFilter === "Needs Reminder"
                        ? "text-indigo-600"
                        : "text-gray-400"
                    }`}
                  >
                    {t("agencyDashboard.roster.digitals.daysOld75to89")}
                  </p>
                </Card>

                <Card
                  className={`p-5 cursor-pointer transition-all rounded-xl ${
                    digitalsFilter === "Outdated Only"
                      ? "bg-indigo-50 border-2 border-indigo-200 shadow-sm"
                      : "bg-white border border-gray-100 shadow-sm hover:border-indigo-100"
                  }`}
                  onClick={() => setDigitalsFilter("Outdated Only")}
                >
                  <div
                    className={`flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider ${
                      digitalsFilter === "Outdated Only"
                        ? "text-indigo-700"
                        : "text-gray-400"
                    }`}
                  >
                    <AlertCircle className="w-4 h-4" />{" "}
                    {t("agencyDashboard.roster.digitals.outdated")}
                  </div>
                  <p
                    className={`text-3xl font-bold mb-1 ${
                      digitalsFilter === "Outdated Only"
                        ? "text-indigo-900"
                        : "text-gray-900"
                    }`}
                  >
                    {digitalsStats.outdated}
                  </p>
                  <p
                    className={`text-xs font-medium ${
                      digitalsFilter === "Outdated Only"
                        ? "text-indigo-600"
                        : "text-gray-400"
                    }`}
                  >
                    {t("agencyDashboard.roster.digitals.daysOld90Plus")}
                  </p>
                </Card>

                <Card
                  className={`p-5 cursor-pointer transition-all rounded-xl ${
                    digitalsFilter === "All Talent"
                      ? "bg-indigo-50 border-2 border-indigo-200 shadow-sm"
                      : "bg-white border border-gray-100 shadow-sm hover:border-indigo-100"
                  }`}
                  onClick={() => setDigitalsFilter("All Talent")}
                >
                  <div
                    className={`flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider ${
                      digitalsFilter === "All Talent"
                        ? "text-indigo-700"
                        : "text-gray-400"
                    }`}
                  >
                    <Calendar className="w-4 h-4" />{" "}
                    {t("agencyDashboard.roster.digitals.totalEntities", {
                      entityPlural: pluralTitleLabel,
                    })}
                  </div>
                  <p
                    className={`text-3xl font-bold mb-1 ${
                      digitalsFilter === "All Talent"
                        ? "text-indigo-900"
                        : "text-gray-900"
                    }`}
                  >
                    {digitalsStats.total}
                  </p>
                  <p
                    className={`text-xs font-bold ${
                      digitalsFilter === "All Talent"
                        ? "text-indigo-600"
                        : "text-indigo-600"
                    }`}
                  >
                    {t("agencyDashboard.roster.digitals.inRoster")}
                  </p>
                </Card>
              </div>

              {/* Filter Section */}
              <div className="flex items-center gap-4">
                <div className="w-full sm:w-64">
                  <select
                    value={digitalsFilter}
                    onChange={(e) => setDigitalsFilter(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="All Talent">{allRosterFilterLabel}</option>
                    <option value="Current Only">
                      {t("agencyDashboard.roster.filters.currentOnly")}
                    </option>
                    <option value="Needs Reminder">
                      {t("agencyDashboard.roster.filters.needsReminder")}
                    </option>
                    <option value="Outdated Only">
                      {t("agencyDashboard.roster.filters.outdatedOnly")}
                    </option>
                  </select>
                </div>
              </div>

              {/* Digitals List */}
              <div className="space-y-3">
                {digitalsRows.map(({ talent, lastUpdated, totalPhotos }) => {
                  const daysAgo = calculateDaysSinceUpdate(lastUpdated);
                  let statusBadge = null;
                  if (daysAgo < 75) {
                    statusBadge = (
                      <Badge
                        variant="secondary"
                        className="bg-green-50 text-green-600 text-[10px] flex items-center gap-1 border border-green-100"
                      >
                        <CheckCircle2 className="w-3 h-3" />{" "}
                        {t("agencyDashboard.roster.digitals.upToDate")}
                      </Badge>
                    );
                  } else if (daysAgo >= 75 && daysAgo < 90) {
                    statusBadge = (
                      <Badge
                        variant="secondary"
                        className="bg-orange-50 text-orange-600 text-[10px] flex items-center gap-1 border border-orange-100"
                      >
                        <Clock className="w-3 h-3" />{" "}
                        {t("agencyDashboard.roster.digitals.reminderDue")}
                      </Badge>
                    );
                  } else if (daysAgo >= 90) {
                    statusBadge = (
                      <Badge
                        variant="secondary"
                        className="bg-red-50 text-red-600 text-[10px] flex items-center gap-1 border border-red-100"
                      >
                        <AlertCircle className="w-3 h-3" />{" "}
                        {t("agencyDashboard.roster.digitals.outdated")}
                      </Badge>
                    );
                  }

                  return (
                    <div
                      key={talent.id}
                      className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 shadow-sm hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={talent.img || "https://placehold.co/150"}
                          alt={talent.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900">
                              {talent.name}
                            </h3>
                            {statusBadge}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 text-xs text-gray-500 font-medium">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-gray-400" />
                              Last updated:{" "}
                              {lastUpdated
                                ? format(new Date(lastUpdated), "MMM d, yyyy")
                                : "Never"}
                            </span>
                            <span className="text-gray-300">|</span>
                            <span>
                              {lastUpdated ? `${daysAgo} days ago` : "Never"}
                            </span>
                            <span className="text-gray-300">|</span>
                            <span>{totalPhotos || 0} photos</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex w-full lg:w-auto flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openHistory(talent)}
                          className="h-8 gap-2 text-gray-700 border-gray-200 font-bold text-xs hover:bg-gray-50"
                        >
                          <Eye className="w-3 h-3" /> View History
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            openReminderModal([talent.id], "single")
                          }
                          className="h-8 gap-2 text-gray-700 border-gray-200 font-bold text-xs hover:bg-gray-50"
                        >
                          <Send className="w-3 h-3" /> Send Reminder
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setUploadTalent(talent);
                            setUploadFiles([]);
                            setUploadDateTaken(
                              new Date().toISOString().slice(0, 10),
                            );
                          }}
                          className="h-8 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                        >
                          <Upload className="w-3 h-3" /> Upload New
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {rosterTab === "licenses" && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-6">
                <Shield className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-400 font-medium">
                License management coming soon
              </p>
            </div>
          )}

          {rosterTab === "campaigns" && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-6">
                <FileText className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-400 font-medium">
                Campaign tracking coming soon
              </p>
            </div>
          )}
        </div>
      </div>

      <TalentSideModal
        talent={selectedTalent}
        open={!!selectedTalent}
        onOpenChange={(open) => !open && setSelectedTalent(null)}
        onSaved={() => {
          onRosterChanged?.();
        }}
      />

      <CompCardModal
        open={showCompCardModal}
        onOpenChange={setShowCompCardModal}
        talents={filteredTalent}
        agencyName={agencyName}
        agencyEmail={agencyEmail}
        agencyWebsite={agencyWebsite}
        logoUrl={logoUrl}
      />

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="w-[95vw] max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {t("agencyDashboard.roster.invites.title")}
            </DialogTitle>
            <DialogDescription>
              {t("agencyDashboard.roster.invites.description", {
                entity: singularLabel,
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                {t("agencyDashboard.roster.invites.searchLabel", {
                  entity: singularLabel,
                })}
              </Label>
              <Input
                value={inviteSearch}
                onChange={(e) => setInviteSearch(e.target.value)}
                placeholder={t(
                  "agencyDashboard.roster.invites.searchPlaceholder",
                )}
              />
            </div>

            <div className="space-y-2">
              {(() => {
                const q = inviteSearch.trim().toLowerCase();
                const rows = Array.isArray(rosterData) ? rosterData : [];
                const filtered = !q
                  ? rows
                  : rows.filter((talent: any) => {
                      const name = String(
                        talent?.name || talent?.full_legal_name || "",
                      ).toLowerCase();
                      const email = String(talent?.email || "").toLowerCase();
                      return name.includes(q) || email.includes(q);
                    });

                if (filtered.length === 0) {
                  return (
                    <div className="text-sm text-gray-600">
                      {t("agencyDashboard.roster.invites.noMatchingEntity", {
                        entity: singularLabel,
                      })}
                    </div>
                  );
                }

                return (
                  <div className="max-h-56 overflow-y-auto space-y-2">
                    {filtered.slice(0, 30).map((talent: any) => {
                      const email = String(talent?.email || "").trim();
                      const name = String(
                        talent?.name ||
                          talent?.full_legal_name ||
                          singularTitleLabel,
                      ).trim();
                      const rowSending =
                        !!inviteSendingEmail && inviteSendingEmail === email;
                      return (
                        <div
                          key={talent?.id || `${name}:${email}`}
                          className="flex flex-col gap-3 rounded-lg border bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">
                              {name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {email ||
                                t(
                                  "agencyDashboard.roster.invites.noEmailOnFile",
                                )}
                            </div>
                          </div>
                          <Button
                            className="h-9 w-full bg-indigo-600 text-white hover:bg-indigo-700 sm:w-auto"
                            disabled={inviteSending || rowSending || !email}
                            onClick={async () => {
                              if (!email) return;
                              setInviteSending(true);
                              setInviteSendingEmail(email);
                              try {
                                const res: any = await createAgencyTalentInvite(
                                  { email },
                                );
                                if (
                                  String(res?.invite_status || "") ===
                                  "already_connected"
                                ) {
                                  toast({
                                    title: t(
                                      "agencyDashboard.roster.invites.alreadyConnectedTitle",
                                    ),
                                    description: t(
                                      "agencyDashboard.roster.invites.alreadyConnectedDescription",
                                    ),
                                  });
                                  await refreshTalentInvites();
                                  return;
                                }
                                toast({
                                  title: t(
                                    "agencyDashboard.roster.invites.sentTitle",
                                  ),
                                  description: t(
                                    "agencyDashboard.roster.invites.sentDescription",
                                    { email },
                                  ),
                                });
                                await refreshTalentInvites();

                                const url = res?.invite_url;
                                if (
                                  typeof url === "string" &&
                                  url.startsWith("http")
                                ) {
                                  try {
                                    await navigator.clipboard.writeText(url);
                                    toast({
                                      title: t(
                                        "agencyDashboard.roster.invites.linkCopiedTitle",
                                      ),
                                      description: t(
                                        "agencyDashboard.roster.invites.linkCopiedDescription",
                                      ),
                                    });
                                  } catch {
                                    // ignore
                                  }
                                }
                              } catch (e: any) {
                                toast({
                                  title: t(
                                    "agencyDashboard.roster.invites.failedToSendTitle",
                                  ),
                                  description:
                                    e?.message ||
                                    t(
                                      "agencyDashboard.roster.invites.failedToSendDescription",
                                    ),
                                  variant: "destructive",
                                });
                              } finally {
                                setInviteSending(false);
                                setInviteSendingEmail(null);
                              }
                            }}
                          >
                            {rowSending ? (
                              <span className="inline-flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {t("agencyDashboard.roster.states.sending")}
                              </span>
                            ) : (
                              t("agencyDashboard.roster.actions.send")
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setInviteOpen(false)}
                disabled={inviteSending}
              >
                {t("agencyDashboard.roster.actions.close")}
              </Button>
            </div>

            <div className="pt-2 border-t">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm font-semibold text-gray-900">
                  {t("agencyDashboard.roster.invites.pendingInvites")}
                </div>
                <Button
                  variant="ghost"
                  className="h-8"
                  onClick={refreshTalentInvites}
                  disabled={talentInvitesLoading}
                >
                  {talentInvitesLoading ? (
                    <span className="inline-flex items-center gap-2 text-sm text-gray-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("agencyDashboard.roster.states.refreshing")}
                    </span>
                  ) : (
                    t("agencyDashboard.roster.actions.refresh")
                  )}
                </Button>
              </div>

              <div className="mt-3 space-y-2">
                {(() => {
                  const pending = (
                    Array.isArray(talentInvites) ? talentInvites : []
                  ).filter(
                    (i: any) =>
                      String(i?.status || "").toLowerCase() === "pending",
                  );
                  if (pending.length === 0) {
                    return (
                      <div className="text-sm text-gray-600">
                        {t("agencyDashboard.roster.invites.noPendingInvites")}
                      </div>
                    );
                  }
                  return pending.slice(0, 20).map((inv: any) => (
                    <div
                      key={inv.id}
                      className="flex flex-col gap-3 rounded-lg border bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {inv.email}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {t("agencyDashboard.roster.invites.expires")}{" "}
                          {inv.expires_at
                            ? new Date(inv.expires_at).toLocaleString()
                            : "—"}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Button
                          variant="outline"
                          className="h-9 w-full sm:w-auto"
                          disabled={inviteSending}
                          onClick={async () => {
                            try {
                              await revokeAgencyTalentInvite(String(inv.id));
                              toast({
                                title: t(
                                  "agencyDashboard.roster.invites.inviteRevokedTitle",
                                ),
                              });
                              await refreshTalentInvites();
                            } catch (e: any) {
                              toast({
                                title: t(
                                  "agencyDashboard.roster.invites.failedToRevokeTitle",
                                ),
                                description: e?.message || String(e),
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          {t("agencyDashboard.roster.actions.revoke")}
                        </Button>
                        <Button
                          className="h-9 w-full bg-indigo-600 text-white hover:bg-indigo-700 sm:w-auto"
                          disabled={inviteSending}
                          onClick={async () => {
                            try {
                              const res: any = await createAgencyTalentInvite({
                                email: String(inv.email || ""),
                              });
                              if (
                                String(res?.invite_status || "") ===
                                "already_connected"
                              ) {
                                toast({
                                  title: t(
                                    "agencyDashboard.roster.invites.alreadyConnectedTitle",
                                  ),
                                  description: t(
                                    "agencyDashboard.roster.invites.alreadyConnectedDescription",
                                  ),
                                });
                              } else {
                                toast({
                                  title: t(
                                    "agencyDashboard.roster.invites.reinvitedTitle",
                                  ),
                                });
                              }
                              await refreshTalentInvites();
                            } catch (e: any) {
                              toast({
                                title: t(
                                  "agencyDashboard.roster.invites.failedToReinviteTitle",
                                ),
                                description: e?.message || String(e),
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          {t("agencyDashboard.roster.actions.reinvite")}
                        </Button>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent className="w-[95vw] max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {t("agencyDashboard.roster.digitals.reminder.dialogTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("agencyDashboard.roster.digitals.reminder.dialogDescription", {
                entity: singularLabel,
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">
                {t("agencyDashboard.roster.digitals.reminder.subjectLabel")}
              </label>
              <Input
                value={reminderSubject}
                onChange={(e) => setReminderSubject(e.target.value)}
                placeholder={t(
                  "agencyDashboard.roster.digitals.reminder.subject",
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">
                {t("agencyDashboard.roster.digitals.reminder.messageLabel")}
              </label>
              <p className="text-xs text-gray-500 mb-2">
                {t("agencyDashboard.roster.digitals.reminder.personalizeHint")}
              </p>
              <textarea
                value={reminderBody}
                onChange={(e) => setReminderBody(e.target.value)}
                className="w-full min-h-[160px] border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setReminderOpen(false)}
                disabled={sendingReminder}
              >
                {t("agencyDashboard.roster.actions.cancel")}
              </Button>
              <Button
                onClick={onSendReminderFromModal}
                disabled={sendingReminder}
                className="font-bold"
              >
                {sendingReminder
                  ? t("agencyDashboard.roster.states.sending")
                  : t("agencyDashboard.roster.actions.send")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Insufficient Seats Modal */}
      {showInsufficientSeatsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowInsufficientSeatsModal(false)}
          />
          <Card className="relative w-full max-w-sm bg-white p-8 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Insufficient seats!
              </h3>
              <p className="text-gray-500 mb-8 font-medium">
                Your current plan allows {seatsLimit || 0} {singularLabel}
                {seatsLimit === 1 ? "" : "s"}. Upgrade to add more.
              </p>
              <div className="flex flex-col w-full gap-3">
                <Button
                  onClick={() => {
                    setShowInsufficientSeatsModal(false);
                    navigate("/agencysubscribe");
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 rounded-xl"
                >
                  View plans
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowInsufficientSeatsModal(false)}
                  className="w-full text-gray-500 font-bold h-12 rounded-xl"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {uploadTalent && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setUploadTalent(null)}
          />
          <Card className="relative w-full max-w-2xl bg-white p-6 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {t("agencyDashboard.roster.upload.title", {
                    name: uploadTalent.name,
                  })}
                </h3>
              </div>
              <button
                onClick={() => setUploadTalent(null)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
                type="button"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 border border-gray-200 rounded-xl p-4 flex gap-3">
              <div className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-gray-600" />
              </div>
              <div className="text-sm text-gray-700">
                <div className="font-bold">
                  {t("agencyDashboard.roster.upload.guidelinesTitle")}
                </div>
                <div className="text-gray-500 font-medium">
                  {t("agencyDashboard.roster.upload.guidelinesDescription")}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-sm font-bold text-gray-700 mb-2">
                {t("agencyDashboard.roster.upload.uploadPhotos")}
              </div>
              <div
                className="border-2 border-dashed border-gray-200 rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-300 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const files = Array.from(e.dataTransfer.files || []).filter(
                    (f) => f.type.startsWith("image/"),
                  );
                  if (files.length) setUploadFiles(files);
                }}
              >
                <Upload className="w-8 h-8 text-gray-400 mb-3" />
                <div className="text-sm font-bold text-gray-700">
                  {t("agencyDashboard.roster.upload.dragDrop")}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {t("agencyDashboard.roster.upload.fileHelp")}
                </div>
                {uploadFiles.length > 0 && (
                  <div className="mt-3 text-sm font-bold text-indigo-700">
                    {t("agencyDashboard.roster.upload.filesSelected", {
                      count: uploadFiles.length,
                    })}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []).filter((f) =>
                      f.type.startsWith("image/"),
                    );
                    setUploadFiles(files);
                  }}
                />
              </div>
            </div>

            <div className="mt-4">
              <div className="text-sm font-bold text-gray-700 mb-2">
                {t("agencyDashboard.roster.upload.dateTaken")}
              </div>
              <Input
                type="date"
                value={uploadDateTaken}
                onChange={(e) => setUploadDateTaken(e.target.value)}
                className="h-10"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setUploadTalent(null)}
                className="h-10 font-bold"
                disabled={uploadingDigitals}
              >
                Cancel
              </Button>
              <Button
                onClick={uploadDigitals}
                className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                disabled={
                  uploadingDigitals ||
                  uploadFiles.length === 0 ||
                  !uploadDateTaken
                }
              >
                {uploadingDigitals ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Upload className="w-4 h-4" /> Upload Digitals
                  </span>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {historyTalent && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setHistoryTalent(null)}
          />
          <Card className="relative w-full max-w-5xl bg-white p-6 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Digitals History - {historyTalent.name}
                </h3>
              </div>
              <button
                onClick={() => setHistoryTalent(null)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
                type="button"
              >
                ✕
              </button>
            </div>

            {historyLoading ? (
              <div className="mt-6 flex items-center gap-2 text-sm text-gray-500 font-medium">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading history…
              </div>
            ) : (
              <div className="mt-6 space-y-6">
                {(() => {
                  const latest = historyRows.slice().sort((a, b) => {
                    const da = new Date(
                      a?.uploaded_at || a?.created_at || 0,
                    ).getTime();
                    const db = new Date(
                      b?.uploaded_at || b?.created_at || 0,
                    ).getTime();
                    return db - da;
                  })[0];
                  const urls = Array.isArray(latest?.photo_urls)
                    ? latest.photo_urls
                    : [];
                  if (!urls.length) return null;
                  return (
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      {urls.map((u: string) => (
                        <img
                          key={u}
                          src={u}
                          className="h-32 w-32 rounded-xl object-cover border border-gray-200"
                        />
                      ))}
                    </div>
                  );
                })()}

                <div>
                  <div className="text-sm font-bold text-gray-700 mb-3">
                    Previous Updates
                  </div>
                  <div className="space-y-4">
                    {historyGroups.map((g) => {
                      const photos = g.entries.flatMap((r) =>
                        Array.isArray(r?.photo_urls) ? r.photo_urls : [],
                      );
                      const label =
                        g.date !== "Unknown"
                          ? format(new Date(g.date), "MMMM d, yyyy")
                          : "Unknown";
                      return (
                        <Card
                          key={g.date}
                          className="p-4 border border-gray-200 rounded-xl"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="font-bold text-gray-900">
                                {label}
                              </div>
                              <Badge
                                variant="secondary"
                                className="text-[10px] font-bold"
                              >
                                {photos.length} photos
                              </Badge>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-2 text-gray-700 border-gray-200 font-bold text-xs hover:bg-gray-50"
                            >
                              <Eye className="w-3 h-3" /> View
                            </Button>
                          </div>
                          <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                            {photos.slice(0, 10).map((u: string) => (
                              <img
                                key={u}
                                src={u}
                                className="h-20 w-20 rounded-lg object-cover border border-gray-200"
                              />
                            ))}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default RosterView;
