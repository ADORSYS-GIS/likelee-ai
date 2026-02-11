import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  createTalentBookOut,
  deleteTalentBookOut,
  getTalentLicensingRevenue,
  getTalentEarningsByCampaign,
  getTalentPayoutBalance,
  requestTalentPayout,
  getTalentAnalytics,
  listVoiceRecordings,
  uploadVoiceRecording,
  deleteVoiceRecording,
  listTalentPortfolioItems,
  createTalentPortfolioItem,
  deleteTalentPortfolioItem,
  getTalentMe,
  updateTalentProfile,
  listTalentBookings,
  listTalentBookOuts,
  listTalentLicensingRequests,
  listTalentLicenses,
} from "@/api/functions";
import { BookingsView } from "@/components/Bookings/BookingsView";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  BarChart3,
  Briefcase,
  Calendar,
  CheckCircle2,
  DollarSign,
  FolderArchive,
  FolderKanban,
  MessageSquare,
  Settings,
  Sparkles,
  FileText,
  LayoutGrid,
  ShieldCheck,
  Image,
  User,
} from "lucide-react";

function useQueryParams() {
  const location = useLocation();
  return React.useMemo(() => new URLSearchParams(location.search), [location.search]);
}

export default function TalentPortal({ embedded }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useQueryParams();
  const { initialized, authenticated, profile } = useAuth();
  const queryClient = useQueryClient();

  const [embeddedMode, setEmbeddedMode] = React.useState<"ai" | "irl">("ai");
  const [embeddedTab, setEmbeddedTab] = React.useState("overview");
  const [embeddedSettingsTab, setEmbeddedSettingsTab] = React.useState("profile");

  const mode = embedded
    ? embeddedMode
    : (params.get("mode") || "ai").toLowerCase() === "irl"
      ? "irl"
      : "ai";
  const tab = embedded ? embeddedTab : (params.get("tab") || "overview").toLowerCase();
  const settingsTab = embedded
    ? embeddedSettingsTab
    : (params.get("settings") || "profile").toLowerCase();

  const { data, isLoading, error } = useQuery({
    queryKey: ["talentMe"],
    queryFn: async () => await getTalentMe(),
    enabled: initialized && authenticated,
  });

  const agencyUser = (data as any)?.agency_user;
  const talentId = agencyUser?.id as string | undefined;
  const agencyName = agencyUser?.agency_name as string | undefined;
  const profilePhotoUrl = agencyUser?.profile_photo_url as string | undefined;
  const email = (agencyUser?.email || profile?.email) as string | undefined;
  const talentName =
    agencyUser?.stage_name ||
    agencyUser?.full_legal_name ||
    profile?.full_name ||
    profile?.email;

  const fixedTalent = React.useMemo(() => {
    if (!talentId) return undefined;
    return { id: talentId, name: String(talentName || "Talent") };
  }, [talentId, talentName]);

  const currentMonth = React.useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }, []);

  const { data: bookings = [] } = useQuery({
    queryKey: ["talentBookings"],
    queryFn: async () => {
      const rows = await listTalentBookings();
      return Array.isArray(rows) ? rows : [];
    },
    enabled: !!talentId,
  });

  const { data: analytics } = useQuery({
    queryKey: ["talentAnalytics", currentMonth],
    queryFn: async () => await getTalentAnalytics({ month: currentMonth }),
    enabled: !!talentId,
  });

  const { data: payoutBalance } = useQuery({
    queryKey: ["talentPayoutBalance"],
    queryFn: async () => await getTalentPayoutBalance(),
    enabled: !!talentId,
  });

  const withdrawable = React.useMemo(() => {
    const balances = (payoutBalance as any)?.balances;
    if (!Array.isArray(balances) || balances.length === 0) return { currency: "USD", available_cents: 0 };
    const usd = balances.find((b: any) => String(b.currency || "").toUpperCase() === "USD");
    const row = usd || balances[0];
    return {
      currency: String(row.currency || "USD").toUpperCase(),
      available_cents: typeof row.available_cents === "number" ? row.available_cents : Number(row.available_cents || 0),
    };
  }, [payoutBalance]);

  const requestPayoutMutation = useMutation({
    mutationFn: async (payload: { amount_cents: number; currency?: string }) =>
      await requestTalentPayout(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["talentPayoutBalance"] });
    },
  });

  const { data: bookOuts = [] } = useQuery({
    queryKey: ["talentBookOuts"],
    queryFn: async () => {
      const rows = await listTalentBookOuts();
      return Array.isArray(rows) ? rows : [];
    },
    enabled: !!talentId,
  });

  const addBookOutMutation = useMutation({
    mutationFn: async (payload: {
      start_date: string;
      end_date: string;
      reason?: string;
      notes?: string;
    }) => await createTalentBookOut(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["talentBookOuts"] });
    },
  });

  const deleteBookOutMutation = useMutation({
    mutationFn: async (id: string) => await deleteTalentBookOut(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["talentBookOuts"] });
    },
  });

  const { data: licensingRequests = [] } = useQuery({
    queryKey: ["talentLicensingRequests"],
    queryFn: async () => {
      const rows = await listTalentLicensingRequests();
      return Array.isArray(rows) ? rows : [];
    },
    enabled: !!talentId,
  });

  const { data: licenses = [] } = useQuery({
    queryKey: ["talentLicenses"],
    queryFn: async () => {
      const rows = await listTalentLicenses();
      return Array.isArray(rows) ? rows : [];
    },
    enabled: !!talentId,
  });

  const { data: licensingRevenue } = useQuery({
    queryKey: ["talentLicensingRevenue", currentMonth],
    queryFn: async () => await getTalentLicensingRevenue({ month: currentMonth }),
    enabled: !!talentId,
  });

  const { data: earningsByCampaign = [] } = useQuery({
    queryKey: ["talentEarningsByCampaign", currentMonth],
    queryFn: async () => {
      const rows = await getTalentEarningsByCampaign({ month: currentMonth });
      return Array.isArray(rows) ? rows : [];
    },
    enabled: !!talentId,
  });

  const fmtCents = (c?: number) => {
    const v = typeof c === "number" && isFinite(c) ? c : 0;
    return `$${(v / 100).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const safeStr = (v: any) => (typeof v === "string" ? v : "");

  const todayStr = React.useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  const upcomingBookings = React.useMemo(() => {
    if (!Array.isArray(bookings)) return [];
    return bookings
      .filter((b: any) => safeStr(b.date) >= todayStr)
      .sort((a: any, b: any) => safeStr(a.date).localeCompare(safeStr(b.date)))
      .slice(0, 6);
  }, [bookings, todayStr]);

  const completedBookingsCount = React.useMemo(() => {
    if (!Array.isArray(bookings)) return 0;
    return bookings.filter((b: any) => {
      const s = safeStr(b.status).toLowerCase();
      return s === "completed";
    }).length;
  }, [bookings]);

  const thisMonthBookingsCount = React.useMemo(() => {
    if (!Array.isArray(bookings)) return 0;
    return bookings.filter((b: any) => safeStr(b.date).startsWith(currentMonth)).length;
  }, [bookings, currentMonth]);

  const pendingApprovals = React.useMemo(() => {
    if (!Array.isArray(licensingRequests)) return [];
    return licensingRequests.filter((r: any) => safeStr(r.status).toLowerCase() === "pending");
  }, [licensingRequests]);

  const activeDeals = React.useMemo(() => {
    if (!Array.isArray(licensingRequests)) return [];
    return licensingRequests.filter((r: any) => {
      const s = safeStr(r.status).toLowerCase();
      return s === "approved" || s === "confirmed";
    });
  }, [licensingRequests]);

  const setMode = (next: "ai" | "irl") => {
    if (embedded) {
      setEmbeddedMode(next);
      if (!embeddedTab) setEmbeddedTab("overview");
      return;
    }
    const nextParams = new URLSearchParams(location.search);
    nextParams.set("mode", next);
    if (!nextParams.get("tab")) nextParams.set("tab", "overview");
    navigate(
      { pathname: "/talentportal", search: `?${nextParams.toString()}` },
      { replace: true },
    );
  };

  const setTab = (nextTab: string) => {
    if (embedded) {
      setEmbeddedTab(nextTab);
      if (nextTab !== "settings") setEmbeddedSettingsTab("profile");
      return;
    }
    const nextParams = new URLSearchParams(location.search);
    nextParams.set("tab", nextTab);
    if (nextTab !== "settings") {
      nextParams.delete("settings");
    }
    navigate(
      { pathname: "/talentportal", search: `?${nextParams.toString()}` },
      { replace: true },
    );
  };

  const navItemClass = (active: boolean) =>
    `w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-[16px] font-semibold transition-all duration-200 ${
      active ? "bg-[#32C8D1] text-white shadow-md shadow-[#32C8D1]/20" : "text-[#4A5568] hover:bg-gray-50"
    }`;

  const iconClass = (active: boolean) =>
    `${active ? "text-white" : "text-[#718096]"}`;

  const buildProfileForm = React.useCallback(() => {
    const au = agencyUser || {};
    return {
      stage_name: au.stage_name || "",
      full_legal_name: au.full_legal_name || "",
      email: au.email || "",
      phone_number: au.phone_number || "",
      city: au.city || "",
      state_province: au.state_province || "",
      country: au.country || "",
      bio_notes: au.bio_notes || au.bio || "",
      instagram_handle: au.instagram_handle || "",
      profile_photo_url: au.profile_photo_url || "",
      hero_cameo_url: au.hero_cameo_url || "",
      photo_urls: Array.isArray(au.photo_urls) ? au.photo_urls : [],
      gender_identity: au.gender_identity || "",
      race_ethnicity: Array.isArray(au.race_ethnicity) ? au.race_ethnicity : [],
      hair_color: au.hair_color || "",
      eye_color: au.eye_color || "",
      height_feet: au.height_feet ?? "",
      height_inches: au.height_inches ?? "",
      bust_chest_inches: au.bust_chest_inches ?? "",
      waist_inches: au.waist_inches ?? "",
      hips_inches: au.hips_inches ?? "",
      tattoos: typeof au.tattoos === "boolean" ? au.tattoos : false,
      piercings: typeof au.piercings === "boolean" ? au.piercings : false,
      special_skills: Array.isArray(au.special_skills) ? au.special_skills : [],
    };
  }, [agencyUser]);

  const [profileForm, setProfileForm] = React.useState<any>({});
  React.useEffect(() => {
    if (!agencyUser) return;
    setProfileForm(buildProfileForm());
  }, [agencyUser, buildProfileForm]);

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: any) => await updateTalentProfile(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["talentMe"] });
    },
  });

  const saveProfile = () => {
    const payload: any = {
      stage_name: profileForm.stage_name || undefined,
      full_legal_name: profileForm.full_legal_name || undefined,
      email: profileForm.email || undefined,
      phone_number: profileForm.phone_number || undefined,
      city: profileForm.city || undefined,
      state_province: profileForm.state_province || undefined,
      country: profileForm.country || undefined,
      bio_notes: profileForm.bio_notes || undefined,
      instagram_handle: profileForm.instagram_handle || undefined,
      profile_photo_url: profileForm.profile_photo_url || undefined,
      hero_cameo_url: profileForm.hero_cameo_url || undefined,
      photo_urls: Array.isArray(profileForm.photo_urls) ? profileForm.photo_urls : undefined,
      gender_identity: profileForm.gender_identity || undefined,
      race_ethnicity: Array.isArray(profileForm.race_ethnicity) ? profileForm.race_ethnicity : undefined,
      hair_color: profileForm.hair_color || undefined,
      eye_color: profileForm.eye_color || undefined,
      height_feet: profileForm.height_feet === "" ? undefined : Number(profileForm.height_feet),
      height_inches: profileForm.height_inches === "" ? undefined : Number(profileForm.height_inches),
      bust_chest_inches: profileForm.bust_chest_inches === "" ? undefined : Number(profileForm.bust_chest_inches),
      waist_inches: profileForm.waist_inches === "" ? undefined : Number(profileForm.waist_inches),
      hips_inches: profileForm.hips_inches === "" ? undefined : Number(profileForm.hips_inches),
      tattoos: typeof profileForm.tattoos === "boolean" ? profileForm.tattoos : undefined,
      piercings: typeof profileForm.piercings === "boolean" ? profileForm.piercings : undefined,
      special_skills: Array.isArray(profileForm.special_skills) ? profileForm.special_skills : undefined,
    };
    updateProfileMutation.mutate(payload);
  };

  if (!initialized) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto p-6">
          <div className="text-sm text-gray-600">Initializing…</div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  if (!profile || (profile.role !== "creator" && profile.role !== "talent")) {
    return null;
  }

  const { data: voiceRecordings = [] } = useQuery({
    queryKey: ["voiceRecordings"],
    queryFn: async () => {
      const rows = await listVoiceRecordings();
      return Array.isArray(rows) ? rows : [];
    },
    enabled: authenticated,
  });

  const uploadVoiceMutation = useMutation({
    mutationFn: async (input: { file: File; emotion_tag?: string }) =>
      await uploadVoiceRecording(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["voiceRecordings"] });
    },
  });

  const deleteVoiceMutation = useMutation({
    mutationFn: async (id: string) => await deleteVoiceRecording(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["voiceRecordings"] });
    },
  });

  const { data: portfolioItems = [] } = useQuery({
    queryKey: ["talentPortfolioItems"],
    queryFn: async () => {
      const rows = await listTalentPortfolioItems();
      return Array.isArray(rows) ? rows : [];
    },
    enabled: !!talentId,
  });

  const createPortfolioMutation = useMutation({
    mutationFn: async (payload: { media_url: string; title?: string }) =>
      await createTalentPortfolioItem(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["talentPortfolioItems"] });
    },
  });

  const deletePortfolioMutation = useMutation({
    mutationFn: async (id: string) => await deleteTalentPortfolioItem(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["talentPortfolioItems"] });
    },
  });

  const [newPhotoUrl, setNewPhotoUrl] = React.useState("");
  const [newPortfolioUrl, setNewPortfolioUrl] = React.useState("");

  const photoUrls = Array.isArray(profileForm.photo_urls) ? profileForm.photo_urls : [];
  const photoCount = photoUrls.length;
  const voiceCount = Array.isArray(voiceRecordings) ? voiceRecordings.length : 0;
  const cameoReady = !!String(profileForm.hero_cameo_url || "").trim();

  const portalContent = (
    <>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {mode === "irl" ? "IRL Bookings Portal" : "All Licensing Portal"}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {mode === "irl"
                ? "Track your bookings and earnings"
                : "Complete talent management & licensing platform"}
            </div>
          </div>
          <button
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 bg-white text-[14px] font-semibold text-gray-900 shadow-sm hover:shadow-md transition-shadow"
            onClick={() => setMode(mode === "irl" ? "ai" : "irl")}
          >
            {mode === "irl" ? (
              <>
                <Briefcase className="h-5 w-5 text-blue-500" />
                AI Mode
              </>
            ) : (
              <>
                <Briefcase className="h-5 w-5 text-blue-500" />
                IRL Mode
              </>
            )}
          </button>
        </div>

        <div className="border-b border-gray-200 overflow-x-auto">
          <div className="flex items-center gap-6 min-w-max pb-3">
            {(mode === "irl"
              ? [
                  { id: "overview", label: "Overview", icon: LayoutGrid },
                  {
                    id: "calendar",
                    label: "Booking Calendar",
                    icon: Calendar,
                    badge: 0,
                  },
                  {
                    id: "active_projects",
                    label: "Active Projects",
                    icon: Briefcase,
                  },
                  { id: "history", label: "Job History", icon: FileText },
                  {
                    id: "availability",
                    label: "Availability",
                    icon: CheckCircle2,
                  },
                  { id: "portfolio", label: "Portfolio", icon: Image },
                  { id: "earnings", label: "Earnings", icon: DollarSign },
                  { id: "messages", label: "Messages", icon: MessageSquare },
                  { id: "settings", label: "Settings", icon: Settings },
                ]
              : [
                  { id: "overview", label: "Overview", icon: LayoutGrid },
                  { id: "likeness", label: "My Likeness", icon: Sparkles },
                  {
                    id: "campaigns",
                    label: "Active Campaigns",
                    icon: Briefcase,
                    badge: activeDeals.length,
                  },
                  {
                    id: "approvals",
                    label: "Approval Queue",
                    icon: CheckCircle2,
                    badge: pendingApprovals.length,
                  },
                  { id: "archive", label: "Archive", icon: FolderArchive },
                  {
                    id: "licenses",
                    label: "Licenses & Contracts",
                    icon: ShieldCheck,
                  },
                  { id: "earnings", label: "Earnings", icon: DollarSign },
                  { id: "analytics", label: "Analytics", icon: BarChart3 },
                  { id: "messages", label: "Messages", icon: MessageSquare },
                  { id: "settings", label: "Settings", icon: Settings },
                ]
            ).map((item) => {
              const Icon = item.icon as any;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  className={`inline-flex items-center gap-2 text-[14px] font-semibold pb-2 border-b-2 transition-colors ${
                    active
                      ? "text-[#32C8D1] border-[#32C8D1]"
                      : "text-gray-600 border-transparent hover:text-gray-900"
                  }`}
                  onClick={() => setTab(item.id)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="whitespace-nowrap">{item.label}</span>
                  {typeof (item as any).badge === "number" && (
                    <span
                      className={`inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-[11px] font-bold rounded-full ${
                        active
                          ? "bg-[#32C8D1]/15 text-[#32C8D1]"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {(item as any).badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {mode === "irl" ? (
        <>
          {tab === "overview" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                <Card className="p-6 rounded-xl shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-500">Upcoming Bookings</div>
                      <div className="text-4xl font-bold text-gray-900 mt-3">{upcomingBookings.length}</div>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-blue-500" />
                    </div>
                  </div>
                </Card>
                <Card className="p-6 rounded-xl shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-500">Total Earnings</div>
                      <div className="text-4xl font-bold text-gray-900 mt-3">$0</div>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-green-500" />
                    </div>
                  </div>
                </Card>
                <Card className="p-6 rounded-xl shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-500">Completed Jobs</div>
                      <div className="text-4xl font-bold text-gray-900 mt-3">{completedBookingsCount}</div>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-orange-500" />
                    </div>
                  </div>
                </Card>
                <Card className="p-6 rounded-xl shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-500">This Month</div>
                      <div className="text-4xl font-bold text-gray-900 mt-3">{thisMonthBookingsCount}</div>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                    </div>
                  </div>
                </Card>
              </div>

              <Card className="p-6 rounded-xl shadow-sm">
                <div className="text-lg font-semibold text-gray-900">Upcoming Bookings</div>
                <div className="mt-5 border rounded-xl border-dashed border-gray-200 p-12 bg-gray-50/50">
                  {upcomingBookings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                        <Calendar className="h-8 w-8 text-gray-400" />
                      </div>
                      <div className="text-sm text-gray-500">No upcoming bookings</div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcomingBookings.map((b: any) => (
                        <div
                          key={b.id || `${b.date}-${b.client_name}`}
                          className="flex items-center justify-between rounded-lg border bg-white px-4 py-3"
                        >
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {b.client_name || b.clientName || "Booking"}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{b.date}</div>
                          </div>
                          <Badge variant="secondary" className="capitalize">
                            {safeStr(b.status || "pending").toLowerCase() || "pending"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-5 rounded-xl shadow-sm border-0 bg-gradient-to-r from-indigo-50 to-blue-50">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-14 w-14 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden">
                      {agencyUser?.agency_logo_url ? (
                        <img
                          src={agencyUser.agency_logo_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Briefcase className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-base font-semibold text-gray-900 truncate">
                        {agencyName || "Your Agency"}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        Connected since {new Date().toLocaleDateString()}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button className="px-3 py-1.5 text-xs font-medium rounded-full bg-[#32C8D1] text-white hover:bg-[#2AB8C1] transition-colors">Edit Profile</button>
                        <button className="px-3 py-1.5 text-xs font-medium rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors">Manage Campaigns</button>
                        <button className="px-3 py-1.5 text-xs font-medium rounded-full bg-amber-400 text-white hover:bg-amber-500 transition-colors">View Earnings</button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </>
          )}

          {tab === "likeness" && (
            <div className="space-y-6">
              <Card className="p-6 rounded-xl shadow-sm">
                <div className="text-lg font-semibold text-gray-900">Likeness Asset Library</div>
                <div className="text-sm text-gray-600 mt-1">
                  Manage your photos, videos, and voice samples used for AI content generation
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="p-6 bg-[#F0FDFF] border-[#E0F2F1] rounded-xl">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-semibold text-gray-500">Reference Photos</div>
                        <div className="text-2xl font-bold text-gray-900 mt-2">{photoCount}/15</div>
                      </div>
                      <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                        <Image className="h-5 w-5 text-[#32C8D1]" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gray-900 rounded-full"
                          style={{ width: `${Math.min(100, (photoCount / 15) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6 bg-[#F5F3FF] border-[#EDE9FE] rounded-xl">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-semibold text-gray-500">Voice Samples</div>
                        <div className="text-2xl font-bold text-gray-900 mt-2">{voiceCount}/6</div>
                      </div>
                      <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                        <MessageSquare className="h-5 w-5 text-purple-500" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gray-900 rounded-full"
                          style={{ width: `${Math.min(100, (voiceCount / 6) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6 bg-[#FFF7ED] border-[#FFEDD5] rounded-xl">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-semibold text-gray-500">Cameo Video</div>
                        <div className="text-2xl font-bold text-gray-900 mt-2">
                          {cameoReady ? "1/1" : "0/1"}
                        </div>
                      </div>
                      <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                        <FolderKanban className="h-5 w-5 text-orange-500" />
                      </div>
                    </div>
                    {!cameoReady && (
                      <div className="mt-3">
                        <Badge className="bg-red-100 text-red-700 border-0">Missing</Badge>
                      </div>
                    )}
                  </Card>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="text-sm font-semibold text-gray-900">Manage Photos</div>
                    <div className="mt-3 flex gap-2">
                      <Input
                        value={newPhotoUrl}
                        onChange={(e) => setNewPhotoUrl(e.target.value)}
                        placeholder="Paste photo URL"
                      />
                      <Button
                        className="shrink-0"
                        onClick={() => {
                          const u = newPhotoUrl.trim();
                          if (!u) return;
                          setProfileForm((p: any) => ({
                            ...p,
                            photo_urls: Array.from(new Set([...(p.photo_urls || []), u])),
                          }));
                          setNewPhotoUrl("");
                        }}
                        disabled={!newPhotoUrl.trim()}
                      >
                        Add
                      </Button>
                    </div>
                    {photoUrls.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                        {photoUrls.slice(0, 9).map((u: string) => (
                          <div key={u} className="group relative rounded-lg overflow-hidden border bg-gray-50">
                            <img src={u} alt="" className="h-24 w-full object-cover" />
                            <button
                              className="absolute top-2 right-2 hidden group-hover:inline-flex text-xs px-2 py-1 rounded bg-white/90 border"
                              onClick={() =>
                                setProfileForm((p: any) => ({
                                  ...p,
                                  photo_urls: (p.photo_urls || []).filter((x: string) => x !== u),
                                }))
                              }
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-4 flex items-center gap-3">
                      <Button
                        onClick={saveProfile}
                        disabled={updateProfileMutation.isPending}
                        className="h-10"
                      >
                        {updateProfileMutation.isPending ? "Saving…" : "Save Photos"}
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="text-sm font-semibold text-gray-900">Manage Voice</div>
                    <div className="mt-3 flex items-center gap-3">
                      <Input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          uploadVoiceMutation.mutate({ file: f });
                          e.target.value = "";
                        }}
                        disabled={uploadVoiceMutation.isPending}
                      />
                    </div>

                    <div className="mt-4 space-y-2">
                      {voiceCount === 0 ? (
                        <div className="text-sm text-gray-600">No voice samples yet.</div>
                      ) : (
                        (voiceRecordings as any[]).slice(0, 6).map((r: any) => (
                          <div
                            key={r.id}
                            className="flex items-center justify-between rounded-lg border bg-white px-3 py-2"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900 truncate">
                                {r.emotion_tag || r.mime_type || "Voice sample"}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              className="h-9"
                              onClick={() => deleteVoiceMutation.mutate(String(r.id))}
                              disabled={deleteVoiceMutation.isPending}
                            >
                              Delete
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6 rounded-xl shadow-sm">
                <div className="text-lg font-semibold text-gray-900">Asset Usage Rights</div>
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Photos: Approved</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Your photos can be used for AI image generation by licensed brands
                      </div>
                    </div>
                    <Badge className="bg-green-600 text-white border-0">All Brands</Badge>
                  </div>
                  <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Voice: Approved</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Voice cloning enabled for approved emotions
                      </div>
                    </div>
                    <Badge className="bg-purple-600 text-white border-0">Limited Use</Badge>
                  </div>
                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Video: Approved</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Cameo video available for AI video generation
                      </div>
                    </div>
                    <Badge className="bg-orange-600 text-white border-0">All Campaigns</Badge>
                  </div>
                </div>
              </Card>

              <Card className="p-6 rounded-xl shadow-sm">
                <div className="text-lg font-semibold text-gray-900">Portfolio Showcase</div>
                <div className="text-sm text-gray-600 mt-1">Approved AI-generated content featuring your likeness</div>

                <div className="mt-4 flex gap-2">
                  <Input
                    value={newPortfolioUrl}
                    onChange={(e) => setNewPortfolioUrl(e.target.value)}
                    placeholder="Paste image/video URL"
                  />
                  <Button
                    className="shrink-0"
                    onClick={() => {
                      const u = newPortfolioUrl.trim();
                      if (!u) return;
                      createPortfolioMutation.mutate({ media_url: u });
                      setNewPortfolioUrl("");
                    }}
                    disabled={!newPortfolioUrl.trim() || createPortfolioMutation.isPending}
                  >
                    Add
                  </Button>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {Array.isArray(portfolioItems) && portfolioItems.length > 0 ? (
                    (portfolioItems as any[]).slice(0, 9).map((it: any) => (
                      <div key={it.id} className="group rounded-xl overflow-hidden border bg-white">
                        <div className="relative aspect-[16/9] bg-gray-100">
                          <img
                            src={it.media_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-green-500 text-white border-0 text-[10px] h-5">Live</Badge>
                          </div>
                          <button
                            className="absolute bottom-2 right-2 hidden group-hover:inline-flex text-xs px-2 py-1 rounded bg-white/90 border"
                            onClick={() => deletePortfolioMutation.mutate(String(it.id))}
                            disabled={deletePortfolioMutation.isPending}
                          >
                            Remove
                          </button>
                        </div>
                        <div className="p-4">
                          <div className="text-sm font-semibold text-gray-900 truncate">
                            {it.title || "Portfolio Item"}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-600">No portfolio items yet.</div>
                  )}
                </div>
              </Card>
            </div>
          )}
        </>
      ) : (
        <>
          {tab === "overview" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                <Card className="p-6 rounded-xl shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-500">Active Campaigns</div>
                      <div className="text-4xl font-bold text-gray-900 mt-3">{activeDeals.length}</div>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                      <Briefcase className="h-5 w-5 text-purple-500" />
                    </div>
                  </div>
                </Card>

                <Card className="p-6 rounded-xl shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-500">Monthly Revenue</div>
                      <div className="text-4xl font-bold text-gray-900 mt-2">
                        {fmtCents((licensingRevenue as any)?.total_cents)}
                      </div>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-green-500" />
                    </div>
                  </div>
                </Card>

                <Card className="p-6 rounded-xl shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-500">Pending Approvals</div>
                      <div className="text-4xl font-bold text-gray-900 mt-3">{pendingApprovals.length}</div>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-amber-500" />
                    </div>
                  </div>
                </Card>
              </div>

              <Card className="p-6 rounded-xl shadow-sm">
                <div className="text-lg font-semibold text-gray-900 mb-5">Latest Licensing Requests</div>
                <div className="space-y-3">
                  {licensingRequests.length === 0 ? (
                    <div className="text-sm text-gray-600 py-8 text-center">No licensing requests yet.</div>
                  ) : (
                    licensingRequests.slice(0, 8).map((r: any) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4"
                      >
                        <div className="min-w-0">
                          <div className="text-base font-semibold text-gray-900 truncate">
                            {r.brand_name || "Brand"}
                          </div>
                          <div className="text-sm text-gray-500 truncate">
                            {r.campaign_title || "Licensing request"}
                          </div>
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {safeStr(r.status || "pending") || "pending"}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </>
          )}

          {tab === "campaigns" && (
            <Card className="p-6 rounded-xl shadow-sm">
              <div className="text-xl font-semibold text-gray-900">Active Campaigns</div>
              <div className="text-sm text-gray-600 mt-1">Your approved/active licensing deals</div>
              <div className="mt-6 space-y-3">
                {activeDeals.length === 0 ? (
                  <div className="text-sm text-gray-600">No active campaigns yet.</div>
                ) : (
                  activeDeals.map((r: any) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4"
                    >
                      <div className="min-w-0">
                        <div className="text-base font-semibold text-gray-900 truncate">
                          {r.brand_name || "Brand"}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {r.campaign_title || "Licensing request"}
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800 border-0 capitalize">
                        {safeStr(r.status || "approved") || "approved"}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}

          {tab === "approvals" && (
            <Card className="p-6 rounded-xl shadow-sm">
              <div className="text-xl font-semibold text-gray-900">Approval Queue</div>
              <div className="text-sm text-gray-600 mt-1">Requests awaiting your decision</div>
              <div className="mt-6 space-y-3">
                {pendingApprovals.length === 0 ? (
                  <div className="text-sm text-gray-600">No pending approvals.</div>
                ) : (
                  pendingApprovals.map((r: any) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4"
                    >
                      <div className="min-w-0">
                        <div className="text-base font-semibold text-gray-900 truncate">
                          {r.brand_name || "Brand"}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {r.campaign_title || "Licensing request"}
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        pending
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}

          {tab === "archive" && (
            <Card className="p-6 rounded-xl shadow-sm">
              <div className="text-xl font-semibold text-gray-900">Archive</div>
              <div className="text-sm text-gray-600 mt-1">Rejected or past requests</div>
              <div className="mt-6 space-y-3">
                {licensingRequests.filter((r: any) => safeStr(r.status).toLowerCase() === "rejected").length === 0 ? (
                  <div className="text-sm text-gray-600">Nothing in archive yet.</div>
                ) : (
                  licensingRequests
                    .filter((r: any) => safeStr(r.status).toLowerCase() === "rejected")
                    .map((r: any) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4"
                      >
                        <div className="min-w-0">
                          <div className="text-base font-semibold text-gray-900 truncate">
                            {r.brand_name || "Brand"}
                          </div>
                          <div className="text-sm text-gray-500 truncate">
                            {r.campaign_title || "Licensing request"}
                          </div>
                        </div>
                        <Badge variant="secondary" className="capitalize">
                          rejected
                        </Badge>
                      </div>
                    ))
                )}
              </div>
            </Card>
          )}

          {tab === "licenses" && (
            <Card className="p-6 rounded-xl shadow-sm">
              <div className="text-xl font-semibold text-gray-900">Licenses & Contracts</div>
              <div className="text-sm text-gray-600 mt-1">Your active and past licenses</div>
              <div className="mt-6 space-y-3">
                {licenses.length === 0 ? (
                  <div className="text-sm text-gray-600">No licenses found yet.</div>
                ) : (
                  licenses.map((l: any) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4"
                    >
                      <div className="min-w-0">
                        <div className="text-base font-semibold text-gray-900 truncate">
                          {l.brand_name || "Brand"}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {l.type || "License"}
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {safeStr(l.status || "active").toLowerCase() || "active"}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}

          {tab === "earnings" && (
            <div className="space-y-6">
              <div>
                <div className="text-2xl font-bold text-gray-900">Earnings</div>
                <div className="text-sm text-gray-600 mt-1">Track your licensing revenue</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                <Card className="p-6 rounded-xl shadow-sm">
                  <div className="text-xs font-medium text-gray-500">Monthly Recurring</div>
                  <div className="text-3xl font-bold text-gray-900 mt-2">
                    {fmtCents((licensingRevenue as any)?.total_cents)}
                  </div>
                </Card>
                <Card className="p-6 rounded-xl shadow-sm">
                  <div className="text-xs font-medium text-gray-500">Annual Run Rate</div>
                  <div className="text-3xl font-bold text-gray-900 mt-2">
                    {fmtCents(((licensingRevenue as any)?.total_cents || 0) * 12)}
                  </div>
                </Card>
                <Card className="p-6 rounded-xl shadow-sm">
                  <div className="text-xs font-medium text-gray-500">Active Campaigns</div>
                  <div className="text-3xl font-bold text-gray-900 mt-2">{activeDeals.length}</div>
                </Card>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                <Card className="p-6 rounded-xl shadow-sm">
                  <div className="text-xs font-medium text-gray-500">Withdrawable balance</div>
                  <div className="text-3xl font-bold text-gray-900 mt-2">
                    {fmtCents(withdrawable.available_cents)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{withdrawable.currency}</div>
                </Card>
              </div>

              <Card className="p-6 rounded-xl shadow-sm">
                <div className="text-sm font-semibold text-gray-900">Earnings by Campaign</div>
                <div className="mt-4 space-y-2">
                  {earningsByCampaign.length === 0 ? (
                    <div className="text-sm text-gray-600 py-6 text-center">No earnings for this month yet.</div>
                  ) : (
                    earningsByCampaign.slice(0, 10).map((it: any) => (
                      <div
                        key={it.brand_id}
                        className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-bold text-gray-700">
                            {(String(it.brand_name || "B").trim()[0] || "B").toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">
                              {it.brand_name || "Brand"}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-green-600">
                          {fmtCents(it.monthly_cents)}/mo
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <button
                className="w-full h-11 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:hover:bg-green-600"
                disabled={
                  requestPayoutMutation.isPending ||
                  !withdrawable.available_cents ||
                  withdrawable.available_cents <= 0
                }
                onClick={() =>
                  requestPayoutMutation.mutate({
                    amount_cents: withdrawable.available_cents,
                    currency: withdrawable.currency,
                  })
                }
              >
                {requestPayoutMutation.isPending ? "Requesting…" : "Request payout"}
              </button>

              <Card className="p-5 rounded-xl shadow-sm border-0 bg-gradient-to-r from-indigo-50 to-blue-50">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-14 w-14 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden">
                      {agencyUser?.agency_logo_url ? (
                        <img
                          src={agencyUser.agency_logo_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Briefcase className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-base font-semibold text-gray-900 truncate">
                        {agencyName || "Your Agency"}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        Connected since {new Date().toLocaleDateString()}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button className="px-3 py-1.5 text-xs font-medium rounded-full bg-[#32C8D1] text-white hover:bg-[#2AB8C1] transition-colors">Edit Profile</button>
                        <button className="px-3 py-1.5 text-xs font-medium rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors">Manage Campaigns</button>
                        <button className="px-3 py-1.5 text-xs font-medium rounded-full bg-amber-400 text-white hover:bg-amber-500 transition-colors">View Earnings</button>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" className="h-10 px-4 rounded-lg">Manage</Button>
                </div>
              </Card>
            </div>
          )}

          {tab === "analytics" && (
            <div className="space-y-6">
              <div>
                <div className="text-2xl font-bold text-gray-900">Analytics</div>
                <div className="text-sm text-gray-600 mt-1">Performance metrics across all campaigns</div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <Card className="p-6 rounded-xl shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-medium text-gray-500">Total Views</div>
                      <div className="text-3xl font-bold text-gray-900 mt-2">
                        {(() => {
                          const v = (analytics as any)?.kpis?.total_views ?? 0;
                          if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                          if (v >= 1_000) return `${Math.round(v / 1_000)}K`;
                          return String(v);
                        })()}
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        {(() => {
                          const pct = Number((analytics as any)?.kpis?.views_change_pct ?? 0);
                          const sign = pct >= 0 ? "+" : "";
                          return `${sign}${pct.toFixed(0)}% this month`;
                        })()}
                      </div>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </Card>

                <Card className="p-6 rounded-xl shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-medium text-gray-500">Total Revenue</div>
                      <div className="text-3xl font-bold text-gray-900 mt-2">
                        {fmtCents((analytics as any)?.kpis?.total_revenue_cents)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Monthly recurring</div>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </Card>
              </div>

              <Card className="p-6 rounded-xl shadow-sm">
                <div className="text-sm font-semibold text-gray-900">Campaign Performance</div>
                <div className="mt-4 space-y-3">
                  {Array.isArray((analytics as any)?.campaigns) && (analytics as any).campaigns.length > 0 ? (
                    (analytics as any).campaigns.slice(0, 8).map((c: any) => (
                      <div
                        key={c.brand_id}
                        className="rounded-xl border border-gray-100 bg-white p-4"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-700">
                              {(String(c.brand_name || "B").trim()[0] || "B").toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900 truncate">
                                {c.brand_name || "Brand"}
                              </div>
                              <div className="text-xs text-gray-500 truncate">AI Licensing</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-10">
                            <div>
                              <div className="text-[11px] text-gray-500">Views/Week</div>
                              <div className="text-sm font-semibold text-gray-900">
                                {Number(c.views_week || 0).toLocaleString()}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[11px] text-gray-500">Revenue</div>
                              <div className="text-sm font-semibold text-green-600">
                                {fmtCents(c.revenue_cents)}/mo
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-600 py-8 text-center">
                      No analytics metrics yet. Ask your agency to add weekly view metrics.
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-6 rounded-xl shadow-sm border border-cyan-200 bg-cyan-50/30">
                <div className="text-sm font-semibold text-gray-900">ROI: Traditional UGC vs AI Licensing</div>
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card className="p-5 rounded-xl shadow-sm">
                    <div className="text-sm font-semibold text-gray-900">Traditional UGC Model</div>
                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="text-gray-600">Per Post:</div>
                        <div className="font-semibold text-gray-900">{fmtCents((analytics as any)?.roi?.traditional?.per_post_cents)}</div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-gray-600">Time Investment:</div>
                        <div className="font-semibold text-gray-900">{(analytics as any)?.roi?.traditional?.time_investment || "4-6 hours"}</div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-gray-600">Posts/Month:</div>
                        <div className="font-semibold text-gray-900">{(analytics as any)?.roi?.traditional?.posts_per_month || "5-8"}</div>
                      </div>
                      <div className="pt-3 mt-3 border-t flex items-center justify-between">
                        <div className="text-gray-600 font-semibold">Monthly Earnings:</div>
                        <div className="font-semibold text-gray-900">{(analytics as any)?.roi?.traditional?.monthly_earnings_range || "$2,500-$4,000"}</div>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-5 rounded-xl shadow-sm border border-green-200 bg-green-50/40">
                    <div className="text-sm font-semibold text-gray-900">AI Licensing Model (You)</div>
                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="text-gray-600">Per Campaign:</div>
                        <div className="font-semibold text-green-700">{fmtCents((analytics as any)?.roi?.ai?.per_campaign_cents)}/mo</div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-gray-600">Time Investment:</div>
                        <div className="font-semibold text-green-700">{(analytics as any)?.roi?.ai?.time_investment || "0 hours/month"}</div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-gray-600">Active Campaigns:</div>
                        <div className="font-semibold text-green-700">{(analytics as any)?.roi?.ai?.active_campaigns ?? (analytics as any)?.kpis?.active_campaigns ?? 0}</div>
                      </div>
                      <div className="pt-3 mt-3 border-t flex items-center justify-between">
                        <div className="text-gray-600 font-semibold">Monthly Earnings:</div>
                        <div className="font-semibold text-green-700">{fmtCents((analytics as any)?.roi?.ai?.monthly_earnings_cents)}</div>
                      </div>
                    </div>
                  </Card>
                </div>

                <div className="mt-4 rounded-lg bg-white border border-cyan-200 px-4 py-3 text-sm text-gray-700">
                  {(analytics as any)?.roi?.message || "Your earnings comparison will appear here."}
                </div>
              </Card>
            </div>
          )}

          {tab === "messages" && (
            <Card className="p-6 rounded-xl shadow-sm">
              <div className="text-xl font-semibold text-gray-900">Messages</div>
              <div className="text-sm text-gray-600 mt-1">Messaging will appear here.</div>
            </Card>
          )}

          {tab === "settings" && (
            <div className="space-y-4">
              <div>
                <div className="text-2xl font-bold text-gray-900">Settings</div>
                <div className="text-sm text-gray-600 mt-1">Manage your profile and media.</div>
              </div>

              <Card className="p-6 rounded-xl shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-gray-600">Stage name</div>
                    <Input
                      value={profileForm.stage_name || ""}
                      onChange={(e) => setProfileForm((p: any) => ({ ...p, stage_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-gray-600">Full legal name</div>
                    <Input
                      value={profileForm.full_legal_name || ""}
                      onChange={(e) =>
                        setProfileForm((p: any) => ({ ...p, full_legal_name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-gray-600">Email</div>
                    <Input
                      value={profileForm.email || ""}
                      onChange={(e) => setProfileForm((p: any) => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-gray-600">Instagram handle</div>
                    <Input
                      value={profileForm.instagram_handle || ""}
                      onChange={(e) =>
                        setProfileForm((p: any) => ({ ...p, instagram_handle: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-1">
                  <div className="text-xs font-semibold text-gray-600">Bio</div>
                  <Textarea
                    value={profileForm.bio_notes || ""}
                    onChange={(e) => setProfileForm((p: any) => ({ ...p, bio_notes: e.target.value }))}
                    className="min-h-[120px]"
                  />
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <Button
                    onClick={saveProfile}
                    disabled={updateProfileMutation.isPending}
                    className="h-10"
                  >
                    {updateProfileMutation.isPending ? "Saving…" : "Save"}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10"
                    onClick={() => setProfileForm(buildProfileForm())}
                    disabled={updateProfileMutation.isPending}
                  >
                    Reset
                  </Button>
                </div>

                <div className="mt-6 rounded-xl bg-gray-50 border border-gray-200 p-4">
                  <div className="text-sm font-semibold text-gray-900">Agency</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {agencyName || "Not connected"}
                  </div>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </>
  );

  if (embedded) {
    return <div className="space-y-8">{portalContent}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-10 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
          <aside className="w-[280px] flex-shrink-0 flex flex-col bg-white border-r border-gray-200 min-h-screen">
            {/* Sidebar Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/eaaf29851_Screenshot2025-10-12at31742PM.png"
                  alt="Likelee Logo"
                  className="h-6 w-auto"
                />
                <span className="text-[17px] font-bold text-[#1A1C1E]">Talent Portal</span>
              </div>
              <button
                className="p-1.5 hover:bg-gray-50 rounded-lg transition-colors group"
                onClick={() => navigate("/CreatorDashboard")}
                aria-label="Back to Dashboard"
                title="Back to Dashboard"
              >
                <svg className="h-4 w-4 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>

            {/* Profile Section */}
            <div className="p-6 border-b border-gray-50">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full p-0.5 border-2 border-[#32C8D1] overflow-hidden flex-shrink-0">
                  <div className="h-full w-full rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                    {profilePhotoUrl ? (
                      <img src={profilePhotoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-7 w-7 text-gray-400" />
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-[17px] font-bold text-[#1A1C1E] truncate leading-tight">{talentName}</div>
                  <div className="text-[14px] text-gray-500 truncate mt-0.5">{email || ""}</div>
                </div>
              </div>
            </div>

            <div className="flex-1" />
          </aside>

          <main className="flex-1 min-w-0 p-8 space-y-8">{portalContent}</main>
        </div>
      </div>
    </div>
  );
}
