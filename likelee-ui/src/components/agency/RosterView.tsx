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
}: RosterViewProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rosterTab, setRosterTab] = useState("roster");
  const [selectedTalent, setSelectedTalent] = useState<any | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showCompCardModal, setShowCompCardModal] = useState(false);
  const [digitalsFilter, setDigitalsFilter] = useState("All Talent");
  const [showInsufficientSeatsModal, setShowInsufficientSeatsModal] =
    useState(false);

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
    "Digitals update reminder",
  );
  const [reminderBody, setReminderBody] = useState(
    "Hi {name},\n\nPlease upload your latest digitals (plain photos, no makeup) to keep your profile up to date.\n\nThank you,\nLikelee",
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
  const activeTalentCount = safeRosterData.filter(
    (t) => t.status === "active",
  ).length;
  const totalMonthlyEarnings = safeRosterData.reduce(
    (acc, t) => acc + (t.earnings_val || 0),
    0,
  );
  const expiringLicensesCount = useMemo(() => {
    return safeRosterData.filter((t) => {
      if (!t?.expiry || t.expiry === "—") return false;
      const expiryDate = new Date(t.expiry);
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
        return { label: "0% vs previous 30d", positive: true, pct: 0 };
      }
      return { label: "+100% vs previous 30d", positive: true, pct: 100 };
    }
    const pct = ((current - prev) / Math.abs(prev)) * 100;
    const rounded = Math.round(pct);
    const sign = rounded > 0 ? "+" : "";
    return {
      label: `${sign}${rounded}% vs previous 30d`,
      positive: rounded >= 0,
      pct: rounded,
    };
  }, [earnings30dTotalCents, earningsPrev30dTotalCents, totalMonthlyEarnings]);

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
      .filter((t) => {
        const last = digitalsSummaryByTalent.get(t.id)?.lastUpdated;
        const days = calculateDaysSinceUpdate(last);
        return !!last && days >= 75;
      })
      .map((t) => t.id);
  }, [safeRosterData, digitalsSummaryByTalent]);

  const openReminderModal = (talentIds: string[], mode: "single" | "all") => {
    setReminderTargetIds(talentIds);
    setReminderSubject("Digitals update reminder");
    if (mode === "single") {
      setReminderBody(
        "Hi {name},\n\nPlease upload your latest digitals (plain photos, no makeup) to keep your profile up to date.\n\nThank you,\nLikelee",
      );
      setReminderOpen(true);
    } else {
      // Remind All: send one default message without opening composer.
      void sendReminders(talentIds, {
        subject: "Digitals update reminder",
        body: "Hi {name},\n\nPlease upload your latest digitals (plain photos, no makeup) to keep your profile up to date.\n\nThank you,\nLikelee",
      });
    }
  };

  const sendReminders = async (
    talentIds: string[],
    opts: { subject: string; body: string },
  ) => {
    const byId = new Map(safeRosterData.map((t) => [t.id, t] as const));
    const fromName = `Likelee.ai from ${agencyName}`;

    const targets = talentIds
      .map((id) => {
        const t = byId.get(id);
        const email = String(t?.email || "").trim();
        const name =
          String(t?.name || t?.stage_name || t?.full_name || "there").trim() ||
          "there";
        return { email, name };
      })
      .filter((t) => t.email.length > 0);

    if (!targets.length) {
      toast({
        title: "No emails found",
        description:
          "None of the selected talent have an email address on file.",
        variant: "destructive",
      });
      return;
    }

    setSendingReminder(true);
    try {
      let sent = 0;
      let failed = 0;
      const failures: string[] = [];
      for (const t of targets) {
        const subject = opts.subject;
        const body = opts.body.replace("{name}", t.name);
        try {
          await sendCoreEmail({
            to: t.email,
            subject,
            body,
            from_name: fromName,
          });
          sent += 1;
        } catch (e: any) {
          failed += 1;
          const msg = String(e?.message || "");
          failures.push(msg || `Failed to send to ${t.email}`);
        }
      }

      if (failed && !sent) {
        toast({
          title: "Email not sent",
          description: failures[0] || "Email sending failed",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Reminders sent",
        description: `Sent: ${sent}${failed ? `, Failed: ${failed}` : ""}`,
        ...(failed ? { variant: "destructive" as const } : {}),
      });
    } finally {
      setSendingReminder(false);
    }
  };

  const onSendReminderFromModal = async () => {
    if (!reminderTargetIds.length) return;
    await sendReminders(reminderTargetIds, {
      subject: reminderSubject.trim() || "Digitals update reminder",
      body: reminderBody,
    });
    setReminderOpen(false);
  };

  const digitalsStats = {
    current: safeRosterData.filter((t) => {
      const last = digitalsSummaryByTalent.get(t.id)?.lastUpdated;
      const days = calculateDaysSinceUpdate(last);
      return days < 75;
    }).length,
    needsReminder: safeRosterData.filter((t) => {
      const last = digitalsSummaryByTalent.get(t.id)?.lastUpdated;
      const days = calculateDaysSinceUpdate(last);
      return !!last && days >= 75 && days < 90;
    }).length,
    outdated: safeRosterData.filter((t) => {
      const last = digitalsSummaryByTalent.get(t.id)?.lastUpdated;
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
        description: "The talent's digitals have been updated.",
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
      data = data.filter((t) => {
        const name = String(t?.name ?? "").toLowerCase();
        const stage = String(t?.stage_name ?? "").toLowerCase();
        const email = String(t?.email ?? "").toLowerCase();
        const role = String(t?.role ?? "").toLowerCase();
        const roleTypesText = Array.isArray((t as any)?.role_types)
          ? ((t as any).role_types as any[])
              .filter((x) => typeof x === "string")
              .join(",")
              .toLowerCase()
          : "";
        const skills = String(t?.special_skills ?? "").toLowerCase();
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
        (t) => (t.status || "").toLowerCase() === statusFilter.toLowerCase(),
      );
    }

    if (categoryFilter !== "All Categories") {
      const target = categoryFilter.toLowerCase();
      data = data.filter((t) => {
        const role = String(t?.role ?? "").toLowerCase();
        const roleTypes = Array.isArray((t as any)?.role_types)
          ? ((t as any).role_types as any[])
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
      data = data.filter((t) => {
        const arr = Array.isArray(t.race_ethnicity) ? t.race_ethnicity : [];
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
      data = data.filter((t) => {
        const h = heightCm(t);
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
      data = data.filter((t) => {
        const a = ageYears(t.date_of_birth);
        if (a == null) return true;
        if (min != null && Number.isFinite(min) && a < min) return false;
        if (max != null && Number.isFinite(max) && a > max) return false;
        return true;
      });
    }

    if (advancedFilters.tattoos !== "any") {
      data = data.filter((t: any) => {
        const has =
          typeof t?.tattoos === "boolean" ? (t.tattoos as boolean) : null;
        if (advancedFilters.tattoos === "yes") return has === true;
        if (advancedFilters.tattoos === "no") return has === false;
        return true;
      });
    }

    if (advancedFilters.piercings !== "any") {
      data = data.filter((t: any) => {
        const has =
          typeof t?.piercings === "boolean" ? (t.piercings as boolean) : null;
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
      .filter((t) => {
        const summary = digitalsSummaryByTalent.get(t.id);
        const last = summary?.lastUpdated;
        const daysAgo = calculateDaysSinceUpdate(last);
        if (digitalsFilter === "Current Only") return daysAgo < 75;
        if (digitalsFilter === "Needs Reminder")
          return !!last && daysAgo >= 75 && daysAgo < 90;
        if (digitalsFilter === "Outdated Only") return !!last && daysAgo >= 90;
        return true;
      })
      .map((t) => {
        const summary = digitalsSummaryByTalent.get(t.id);
        const last = summary?.lastUpdated;
        const totalPhotos = summary?.totalPhotos ?? (t.assets || 0);
        return { talent: t, lastUpdated: last, totalPhotos };
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
        (row?.uploaded_at || row?.created_at || "").slice(0, 10) || "Unknown";
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
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 font-medium">
                {!!agencyEmail && (
                  <span className="flex items-center gap-1 truncate">
                    <span className="truncate">{agencyEmail}</span>
                  </span>
                )}
                {!!agencyWebsite && (
                  <a
                    className="flex items-center gap-1 truncate hover:underline"
                    href={agencyWebsite}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Globe className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{agencyWebsite}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="text-gray-700 border-gray-300 gap-2"
              onClick={() => onEditProfile?.()}
              disabled={!onEditProfile}
            >
              <Pencil className="w-4 h-4" />
              Edit Profile
            </Button>
            <Button
              variant="outline"
              className="text-gray-700 border-gray-300 gap-2"
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
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="font-medium">
              {rosterData.length} / {seatsLimit || 0} seats used
            </span>
          </div>
        </div>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-1">
              Active Talent
            </p>
            <div className="text-3xl font-bold text-gray-900">
              {activeTalentCount}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              of {rosterData.length} total
            </p>
          </div>
          <Users className="w-10 h-10 text-gray-100" />
        </Card>
        <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-1">
              Monthly Earnings
            </p>
            <div className="text-3xl font-bold text-gray-900">
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
          <DollarSign className="w-10 h-10 text-gray-100" />
        </Card>
        <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-1">
              Active Campaigns
            </p>
            <div className="text-3xl font-bold text-gray-900">
              {activeCampaigns}
            </div>
            <p className="text-xs text-gray-400 mt-1">across all talent</p>
          </div>
          <Briefcase className="w-10 h-10 text-gray-100" />
        </Card>
        {agencyMode === "AI" && (
          <Card className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-500 mb-1">
                Expiring Licenses
              </p>
              <div className="text-3xl font-bold text-gray-900">
                {expiringLicensesCount}
              </div>
              <p className="text-xs text-orange-500 font-medium mt-1">
                require renewal
              </p>
            </div>
            <AlertCircle className="w-10 h-10 text-gray-100" />
          </Card>
        )}
      </div>

      {/* Roster Table Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1">
            {[
              "Roster",
              "Digitals Tracking",
              "Campaigns",
              "Licenses",
              "Analytics",
            ].map((tab) => {
              const isLicenses = tab === "Licenses";
              const isCampaigns = tab === "Campaigns";
              const isAiMode = agencyMode === "AI";

              // Filter logic:
              // 1. Hide Licenses in IRL mode
              // 2. Hide Campaigns in AI mode
              if (isLicenses && !isAiMode) return null;
              if (isCampaigns && isAiMode) return null;

              return (
                <button
                  key={tab}
                  onClick={() => setRosterTab(tab.toLowerCase().split(" ")[0])}
                  className={`px-4 py-2 text-sm font-bold transition-colors relative ${
                    rosterTab === tab.toLowerCase().split(" ")[0]
                      ? "text-gray-900 border-b-2 border-gray-900"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {tab}
                  {tab === "Analytics" && (
                    <span className="ml-2 bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                      Pro
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex w-full md:w-auto flex-wrap gap-3">
            <Button
              variant="outline"
              className="gap-2 font-bold h-10 rounded-lg w-full sm:w-auto"
            >
              <Download className="w-4 h-4" /> Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={handleInviteTalentClick}
              className="border-gray-200 gap-2 font-bold h-10 rounded-lg w-full sm:w-auto"
            >
              <Mail className="w-4 h-4" /> Send Portal Invite
            </Button>
            <Button
              onClick={handleAddTalentClick}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-bold h-10 rounded-lg w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" /> Add Talent
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
                      placeholder="Search talent..."
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
                      <option>All Status</option>
                      <option>Active</option>
                      <option>Pending</option>
                      <option>Inactive</option>
                    </select>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option>All Categories</option>
                      <option>Model</option>
                      <option>Actor</option>
                      <option>Creator</option>
                      <option>Voice</option>
                      <option>Athlete</option>
                    </select>
                    <Button
                      variant="outline"
                      className={`gap-2 font-bold h-11 rounded-lg px-6 w-full sm:w-auto ${showAdvancedFilters ? "bg-gray-100 border-gray-300" : ""}`}
                      onClick={() =>
                        setShowAdvancedFilters(!showAdvancedFilters)
                      }
                    >
                      <Filter className="w-4 h-4" />
                      Advanced Filters
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
                      Loading talents...
                    </div>
                  ) : filteredTalent.length === 0 ? (
                    <div className="text-center text-sm text-gray-500 font-medium py-8">
                      No talents to display.
                    </div>
                  ) : (
                    filteredTalent.map((talent) => (
                      <button
                        key={talent.id}
                        type="button"
                        className="w-full text-left bg-white border border-gray-200 rounded-xl p-4"
                        onClick={() => setSelectedTalent(talent)}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={talent.img || "https://placehold.co/150"}
                            alt={talent.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-gray-900 truncate">
                                {talent.name}
                              </span>
                              {talent.is_verified && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {String(talent.role || "Model")}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                          <div>
                            <div className="text-xs text-gray-500">
                              Followers
                            </div>
                            <div className="font-bold text-gray-900">
                              {talent.followers || "0"}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Revenue</div>
                            <div className="font-bold text-gray-900">
                              {formatCurrency(
                                Number(talent?.earnings_val ?? 0),
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-6 py-4 text-xs font-bold text-gray-900 uppercase tracking-wide">
                          <button
                            type="button"
                            onClick={() => handleSort("name")}
                            className="flex items-center gap-1 cursor-pointer pointer-events-auto"
                          >
                            Talent{" "}
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
                                Status{" "}
                                <ArrowUpDown className="w-3 h-3 text-gray-500" />
                              </button>
                            </th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-900 uppercase tracking-wide">
                              AI Usage
                            </th>
                          </>
                        )}
                        <th className="px-6 py-4 text-xs font-bold text-gray-900 uppercase tracking-wide">
                          <button
                            type="button"
                            onClick={() => handleSort("followers_val")}
                            className="flex items-center gap-1 cursor-pointer pointer-events-auto"
                          >
                            Followers{" "}
                            <ArrowUpDown className="w-3 h-3 text-gray-500" />
                          </button>
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-900 uppercase tracking-wide">
                          Assets
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-900 uppercase tracking-wide">
                          Top Brand
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-900 uppercase tracking-wide">
                          License Expiry
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 bg-white">
                      {isLoading && filteredTalent.length === 0 ? (
                        <tr>
                          <td
                            colSpan={agencyMode === "AI" ? 8 : 6}
                            className="px-6 py-10"
                          >
                            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 font-medium">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Loading talents…
                            </div>
                          </td>
                        </tr>
                      ) : filteredTalent.length === 0 ? (
                        <tr>
                          <td
                            colSpan={agencyMode === "AI" ? 8 : 6}
                            className="px-6 py-10"
                          >
                            <div className="text-center text-sm text-gray-500 font-medium">
                              No talents to display.
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
                                className="w-10 h-10 rounded-lg object-cover"
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
                              <td className="px-6 py-4 flex gap-1">
                                {talent.ai_usage?.map((u: string) => (
                                  <Badge
                                    key={u}
                                    variant="secondary"
                                    className="text-[10px] font-bold"
                                  >
                                    {u}
                                  </Badge>
                                ))}
                              </td>
                            </>
                          )}
                          <td className="px-6 py-4 text-sm font-medium">
                            {talent.followers || "0"}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium">
                            {talent.assets || "0"}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium">
                            {talent.top_brand || "—"}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-600">
                            {talent.expiry || "—"}
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-gray-900">
                            {formatCurrency(Number(talent?.earnings_val ?? 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                    Digitals Tracking
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Monitor and manage talent digitals (plain photos, no makeup)
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
                  <Send className="w-4 h-4" /> Remind All (
                  {digitalsStats.needsReminder + digitalsStats.outdated})
                </Button>
              </div>

              {agencyDigitalsLoading && (
                <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading digitals…
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
                    <ImageIcon className="w-4 h-4" /> Current
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
                    Up to date
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
                    <Clock className="w-4 h-4" /> Reminder Due
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
                    75-89 days old
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
                    <AlertCircle className="w-4 h-4" /> Outdated
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
                    90+ days old
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
                    <Calendar className="w-4 h-4" /> Total Talent
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
                    In roster
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
                    <option value="All Talent">All Talent</option>
                    <option value="Current Only">Current Only</option>
                    <option value="Needs Reminder">Needs Reminder</option>
                    <option value="Outdated Only">Outdated Only</option>
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
                        <CheckCircle2 className="w-3 h-3" /> Up to date
                      </Badge>
                    );
                  } else if (daysAgo >= 75 && daysAgo < 90) {
                    statusBadge = (
                      <Badge
                        variant="secondary"
                        className="bg-orange-50 text-orange-600 text-[10px] flex items-center gap-1 border border-orange-100"
                      >
                        <Clock className="w-3 h-3" /> Reminder Due
                      </Badge>
                    );
                  } else if (daysAgo >= 90) {
                    statusBadge = (
                      <Badge
                        variant="secondary"
                        className="bg-red-50 text-red-600 text-[10px] flex items-center gap-1 border border-red-100"
                      >
                        <AlertCircle className="w-3 h-3" /> Outdated
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
      />

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Send Portal Invite
            </DialogTitle>
            <DialogDescription>
              Select an existing talent in your roster to send them a portal
              invite.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Search talent</Label>
              <Input
                value={inviteSearch}
                onChange={(e) => setInviteSearch(e.target.value)}
                placeholder="Search by name or email"
              />
            </div>

            <div className="space-y-2">
              {(() => {
                const q = inviteSearch.trim().toLowerCase();
                const rows = Array.isArray(rosterData) ? rosterData : [];
                const filtered = !q
                  ? rows
                  : rows.filter((t: any) => {
                      const name = String(
                        t?.name || t?.full_legal_name || "",
                      ).toLowerCase();
                      const email = String(t?.email || "").toLowerCase();
                      return name.includes(q) || email.includes(q);
                    });

                if (filtered.length === 0) {
                  return (
                    <div className="text-sm text-gray-600">
                      No matching talent.
                    </div>
                  );
                }

                return (
                  <div className="max-h-56 overflow-y-auto space-y-2">
                    {filtered.slice(0, 30).map((t: any) => {
                      const email = String(t?.email || "").trim();
                      const name = String(
                        t?.name || t?.full_legal_name || "Talent",
                      ).trim();
                      const rowSending =
                        !!inviteSendingEmail && inviteSendingEmail === email;
                      return (
                        <div
                          key={t?.id || `${name}:${email}`}
                          className="flex items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">
                              {name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {email || "No email on file"}
                            </div>
                          </div>
                          <Button
                            className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white"
                            disabled={inviteSending || rowSending || !email}
                            onClick={async () => {
                              if (!email) return;
                              setInviteSending(true);
                              setInviteSendingEmail(email);
                              try {
                                const res: any = await createAgencyTalentInvite(
                                  { email },
                                );
                                toast({
                                  title: "Portal invite sent",
                                  description: `Invitation sent to ${email}`,
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
                                      title: "Invite link copied",
                                      description:
                                        "Copied invite URL to clipboard.",
                                    });
                                  } catch {
                                    // ignore
                                  }
                                }
                              } catch (e: any) {
                                toast({
                                  title: "Failed to send",
                                  description:
                                    e?.message || "Could not send invite",
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
                                Sending…
                              </span>
                            ) : (
                              "Send"
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
                Close
              </Button>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900">
                  Pending invites
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
                      Refreshing
                    </span>
                  ) : (
                    "Refresh"
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
                        No pending invites.
                      </div>
                    );
                  }
                  return pending.slice(0, 20).map((inv: any) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {inv.email}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          Expires{" "}
                          {inv.expires_at
                            ? new Date(inv.expires_at).toLocaleString()
                            : "—"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          className="h-9"
                          disabled={inviteSending}
                          onClick={async () => {
                            try {
                              await revokeAgencyTalentInvite(String(inv.id));
                              toast({ title: "Invite revoked" });
                              await refreshTalentInvites();
                            } catch (e: any) {
                              toast({
                                title: "Failed to revoke",
                                description: e?.message || String(e),
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          Revoke
                        </Button>
                        <Button
                          className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white"
                          disabled={inviteSending}
                          onClick={async () => {
                            try {
                              await createAgencyTalentInvite({
                                email: String(inv.email || ""),
                              });
                              toast({ title: "Re-invited" });
                              await refreshTalentInvites();
                            } catch (e: any) {
                              toast({
                                title: "Failed to re-invite",
                                description: e?.message || String(e),
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          Re-invite
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Send digitals reminder
            </DialogTitle>
            <DialogDescription>
              Sends an email to the selected talent. Requires SMTP configuration
              on the server.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">
                Subject
              </label>
              <Input
                value={reminderSubject}
                onChange={(e) => setReminderSubject(e.target.value)}
                placeholder="Digitals update reminder"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">
                Message
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Use {"{name}"} to personalize.
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
                Cancel
              </Button>
              <Button
                onClick={onSendReminderFromModal}
                disabled={sendingReminder}
                className="font-bold"
              >
                {sendingReminder ? "Sending..." : "Send"}
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
                Your current plan allows {seatsLimit || 0} talent
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
                  Upload New Digitals - {uploadTalent.name}
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
                <div className="font-bold">Digitals Guidelines:</div>
                <div className="text-gray-500 font-medium">
                  Plain photos with no makeup, natural lighting, simple
                  background. Include: headshot, 3/4 body, full body, left
                  profile, right profile.
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-sm font-bold text-gray-700 mb-2">
                Upload Photos
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
                  Click to upload or drag and drop
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  JPEG or PNG, max 5MB each
                </div>
                {uploadFiles.length > 0 && (
                  <div className="mt-3 text-sm font-bold text-indigo-700">
                    {uploadFiles.length} file(s) selected
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
                Date Taken
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
