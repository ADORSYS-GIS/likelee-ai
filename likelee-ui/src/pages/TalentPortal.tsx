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

export default function TalentPortal() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useQueryParams();
  const { initialized, authenticated, profile } = useAuth();
  const queryClient = useQueryClient();

  const mode = (params.get("mode") || "ai").toLowerCase() === "irl" ? "irl" : "ai";
  const tab = (params.get("tab") || "overview").toLowerCase();
  const settingsTab = (params.get("settings") || "profile").toLowerCase();

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

  const { data: bookings = [] } = useQuery({
    queryKey: ["talentBookings"],
    queryFn: async () => {
      const rows = await listTalentBookings();
      return Array.isArray(rows) ? rows : [];
    },
    enabled: !!talentId,
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

  const currentMonth = React.useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }, []);

  const { data: licensingRevenue } = useQuery({
    queryKey: ["talentLicensingRevenue", currentMonth],
    queryFn: async () => await getTalentLicensingRevenue({ month: currentMonth }),
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
    const nextParams = new URLSearchParams(location.search);
    nextParams.set("mode", next);
    if (!nextParams.get("tab")) nextParams.set("tab", "overview");
    navigate({ pathname: "/talentportal", search: `?${nextParams.toString()}` }, { replace: true });
  };

  const setTab = (nextTab: string) => {
    const nextParams = new URLSearchParams(location.search);
    nextParams.set("tab", nextTab);
    if (nextTab !== "settings") {
      nextParams.delete("settings");
    }
    navigate({ pathname: "/talentportal", search: `?${nextParams.toString()}` }, { replace: true });
  };

  const navItemClass = (active: boolean) =>
    `w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-[16px] font-semibold transition-all duration-200 ${
      active ? "bg-[#32C8D1] text-white shadow-md shadow-[#32C8D1]/20" : "text-[#4A5568] hover:bg-gray-50"
    }`;

  const iconClass = (active: boolean) =>
    `${active ? "text-white" : "text-[#718096]"}`;

  const setSettingsTab = (next: string) => {
    const nextParams = new URLSearchParams(location.search);
    nextParams.set("tab", "settings");
    nextParams.set("settings", next);
    navigate({ pathname: "/talentportal", search: `?${nextParams.toString()}` }, { replace: true });
  };

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
              <button className="p-1.5 hover:bg-gray-50 rounded-lg transition-colors group">
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

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5">
                <button className={navItemClass(tab === "overview")} onClick={() => setTab("overview")}>
                  <LayoutGrid className={`h-[18px] w-[18px] ${iconClass(tab === "overview")}`} />
                  <span className="flex-1 text-left font-semibold">Overview</span>
                </button>

                {mode === "irl" ? (
                  <>
                    <button
                      className={navItemClass(tab === "calendar")}
                      onClick={() => setTab("calendar")}
                    >
                      <Calendar className={`h-[18px] w-[18px] ${iconClass(tab === "calendar")}`} />
                      <span className="flex-1 text-left font-semibold">Booking Calendar</span>
                      <span className={`inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-[11px] font-bold rounded-full ${tab === 'calendar' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        0
                      </span>
                    </button>

                    <button
                      className={navItemClass(tab === "active_projects")}
                      onClick={() => setTab("active_projects")}
                    >
                      <Briefcase className={`h-[18px] w-[18px] ${iconClass(tab === "active_projects")}`} />
                      <span className="flex-1 text-left font-semibold">Active Projects</span>
                    </button>

                    <button className={navItemClass(tab === "history")} onClick={() => setTab("history")}>
                      <FileText className={`h-[18px] w-[18px] ${iconClass(tab === "history")}`} />
                      <span className="flex-1 text-left font-semibold">Job History</span>
                    </button>

                    <button
                      className={navItemClass(tab === "availability")}
                      onClick={() => setTab("availability")}
                    >
                      <CheckCircle2 className={`h-[18px] w-[18px] ${iconClass(tab === "availability")}`} />
                      <span className="flex-1 text-left font-semibold">Availability</span>
                    </button>

                    <button
                      className={navItemClass(tab === "portfolio")}
                      onClick={() => setTab("portfolio")}
                    >
                      <Image className={`h-[18px] w-[18px] ${iconClass(tab === "portfolio")}`} />
                      <span className="flex-1 text-left font-semibold">Portfolio</span>
                    </button>

                    <button
                      className={navItemClass(tab === "earnings")}
                      onClick={() => setTab("earnings")}
                    >
                      <DollarSign className={`h-[18px] w-[18px] ${iconClass(tab === "earnings")}`} />
                      <span className="flex-1 text-left font-semibold">Earnings</span>
                    </button>

                    <button
                      className={navItemClass(tab === "messages")}
                      onClick={() => setTab("messages")}
                    >
                      <MessageSquare className={`h-[18px] w-[18px] ${iconClass(tab === "messages")}`} />
                      <span className="flex-1 text-left font-semibold">Messages</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className={navItemClass(tab === "likeness")}
                      onClick={() => setTab("likeness")}
                    >
                      <Sparkles className={`h-[18px] w-[18px] ${iconClass(tab === "likeness")}`} />
                      <span className="flex-1 text-left font-semibold">My Likeness</span>
                    </button>

                    <button
                      className={navItemClass(tab === "campaigns")}
                      onClick={() => setTab("campaigns")}
                    >
                      <Briefcase className={`h-[18px] w-[18px] ${iconClass(tab === "campaigns")}`} />
                      <span className="flex-1 text-left font-semibold">Active Campaigns</span>
                      <span className={`inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-[11px] font-bold rounded-full ${tab === 'campaigns' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {activeDeals.length}
                      </span>
                    </button>

                    <button
                      className={navItemClass(tab === "approvals")}
                      onClick={() => setTab("approvals")}
                    >
                      <CheckCircle2 className={`h-[18px] w-[18px] ${iconClass(tab === "approvals")}`} />
                      <span className="flex-1 text-left font-semibold">Approval Queue</span>
                      <span className={`inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-[11px] font-bold rounded-full ${tab === 'approvals' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {pendingApprovals.length}
                      </span>
                    </button>

                    <button
                      className={navItemClass(tab === "archive")}
                      onClick={() => setTab("archive")}
                    >
                      <FolderArchive className={`h-[18px] w-[18px] ${iconClass(tab === "archive")}`} />
                      <span className="flex-1 text-left font-semibold">Archive</span>
                    </button>

                    <button
                      className={navItemClass(tab === "licenses")}
                      onClick={() => setTab("licenses")}
                    >
                      <ShieldCheck className={`h-[18px] w-[18px] ${iconClass(tab === "licenses")}`} />
                      <span className="flex-1 text-left font-semibold">Licenses & Contracts</span>
                    </button>

                    <button
                      className={navItemClass(tab === "earnings")}
                      onClick={() => setTab("earnings")}
                    >
                      <DollarSign className={`h-[18px] w-[18px] ${iconClass(tab === "earnings")}`} />
                      <span className="flex-1 text-left font-semibold">Earnings</span>
                    </button>

                    <button
                      className={navItemClass(tab === "analytics")}
                      onClick={() => setTab("analytics")}
                    >
                      <BarChart3 className={`h-[18px] w-[18px] ${iconClass(tab === "analytics")}`} />
                      <span className="flex-1 text-left font-semibold">Analytics</span>
                    </button>

                    <button
                      className={navItemClass(tab === "messages")}
                      onClick={() => setTab("messages")}
                    >
                      <MessageSquare className={`h-[18px] w-[18px] ${iconClass(tab === "messages")}`} />
                      <span className="flex-1 text-left font-semibold">Messages</span>
                    </button>
                  </>
                )}

                <button
                  className={navItemClass(tab === "settings")}
                  onClick={() => setTab("settings")}
                >
                  <Settings className={`h-[18px] w-[18px] ${iconClass(tab === "settings")}`} />
                  <span className="flex-1 text-left font-semibold">Settings</span>
                </button>
              </div>
          </aside>

          <main className="flex-1 min-w-0 p-8 space-y-8">
                {mode === "irl" ? (
                  <>
                    {tab === "overview" && (
                      <>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-2xl font-bold text-gray-900">IRL Bookings Overview</div>
                            <div className="text-sm text-gray-600 mt-1">Track your bookings and earnings</div>
                          </div>
                          <button
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 bg-white text-[14px] font-semibold text-gray-900 shadow-sm hover:shadow-md transition-shadow"
                            onClick={() => setMode("ai")}
                          >
                            <Sparkles className="h-5 w-5 text-purple-500" />
                            AI Mode
                          </button>
                        </div>

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
                            <Button variant="outline" className="h-10 px-4 rounded-lg">Manage</Button>
                          </div>
                        </Card>
                      </>
                    )}

                    {tab === "calendar" && (
                      <BookingsView
                        activeSubTab="Calendar & Schedule"
                        bookings={bookings}
                        bookOuts={bookOuts}
                        onAddBooking={() => {}}
                        onUpdateBooking={() => {}}
                        onCancelBooking={() => {}}
                        onAddBookOut={(bo: any) => {
                          const payload = {
                            start_date: bo.startDate || bo.start_date,
                            end_date: bo.endDate || bo.end_date,
                            reason: bo.reason,
                            notes: bo.notes,
                          };
                          addBookOutMutation.mutate(payload);
                        }}
                        onRemoveBookOut={(id: string) => deleteBookOutMutation.mutate(id)}
                        fixedTalent={fixedTalent}
                        disableBookingEdits
                      />
                    )}

                    {tab === "availability" && (
                      <BookingsView
                        activeSubTab="Talent Availability"
                        bookings={bookings}
                        bookOuts={bookOuts}
                        onAddBooking={() => {}}
                        onUpdateBooking={() => {}}
                        onCancelBooking={() => {}}
                        onAddBookOut={(bo: any) => {
                          const payload = {
                            start_date: bo.startDate || bo.start_date,
                            end_date: bo.endDate || bo.end_date,
                            reason: bo.reason,
                            notes: bo.notes,
                          };
                          addBookOutMutation.mutate(payload);
                        }}
                        onRemoveBookOut={(id: string) => deleteBookOutMutation.mutate(id)}
                        fixedTalent={fixedTalent}
                        disableBookingEdits
                      />
                    )}

                    {tab === "active_projects" && (
                      <Card className="p-6">
                        <div className="text-xl font-semibold text-gray-900">Active Projects</div>
                        <div className="text-sm text-gray-600 mt-1">Coming soon.</div>
                      </Card>
                    )}

                    {tab === "history" && (
                      <Card className="p-6">
                        <div className="text-xl font-semibold text-gray-900">Job History</div>
                        <div className="text-sm text-gray-600 mt-1">No completed jobs yet.</div>
                      </Card>
                    )}

                    {tab === "portfolio" && (
                      <div className="space-y-8">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-2xl font-bold text-gray-900">Portfolio</div>
                            <div className="text-sm text-gray-600 mt-1">Showcase your work and past projects</div>
                          </div>
                          <button
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 bg-white text-[14px] font-semibold text-gray-900 shadow-sm hover:shadow-md transition-shadow"
                            onClick={() => setMode("ai")}
                          >
                            <Sparkles className="h-5 w-5 text-purple-500" />
                            AI Mode
                          </button>
                        </div>

                        <Card className="p-8 rounded-xl shadow-sm">
                          <div className="flex items-center justify-between mb-8">
                            <div className="text-lg font-semibold text-gray-900">Portfolio Images</div>
                            <button className="flex items-center gap-2 px-4 py-2 bg-[#32C8D1] hover:bg-[#2AB8C1] text-white text-sm font-medium rounded-lg transition-colors">
                              <Sparkles className="h-4 w-4" />
                              Add Images
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[1, 2, 3, 4].map((i) => (
                              <div key={i} className="aspect-[3/4] rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 flex items-center justify-center">
                                <Sparkles className="h-10 w-10 text-gray-300" />
                              </div>
                            ))}
                          </div>
                        </Card>

                        <Card className="p-8 rounded-xl shadow-sm">
                          <div className="text-lg font-semibold text-gray-900 mb-6">Past Work Highlights</div>
                          <div className="border rounded-xl border-dashed border-gray-200 p-20 bg-gray-50/50">
                            <div className="flex flex-col items-center justify-center text-center">
                              <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center mb-6">
                                <Briefcase className="h-10 w-10 text-gray-400" />
                              </div>
                              <div className="text-sm text-gray-500">Complete bookings will appear here</div>
                            </div>
                          </div>
                        </Card>

                        <Card className="p-5 rounded-xl shadow-sm border-0 bg-gradient-to-r from-indigo-50 to-blue-50">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 min-w-0">
                              <div className="h-14 w-14 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden">
                                {agencyUser?.agency_logo_url ? (
                                  <img src={agencyUser.agency_logo_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <Briefcase className="h-6 w-6 text-gray-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="text-base font-semibold text-gray-900 truncate">{agencyName || "Your Agency"}</div>
                                <div className="text-sm text-gray-500 truncate">Connected since 2/10/2026</div>
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

                    {tab === "earnings" && (
                      <Card className="p-6">
                        <div className="text-xl font-semibold text-gray-900">Earnings</div>
                        <div className="text-sm text-gray-600 mt-1">Coming soon.</div>
                      </Card>
                    )}

                    {tab === "messages" && (
                      <Card className="p-6">
                        <div className="text-xl font-semibold text-gray-900">Messages</div>
                        <div className="text-sm text-gray-600 mt-1">Coming soon.</div>
                      </Card>
                    )}
                  </>
                ) : (
                  <>
                    {tab === "overview" && (
                      <div className="space-y-8">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-2xl font-bold text-gray-900">AI Licensing Overview</div>
                            <div className="text-sm text-gray-600 mt-1">
                              Complete talent management & licensing platform
                            </div>
                          </div>
                          <button
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 bg-white text-[14px] font-semibold text-gray-900 shadow-sm hover:shadow-md transition-shadow"
                            onClick={() => setMode("irl")}
                          >
                            <Briefcase className="h-5 w-5 text-blue-500" />
                            IRL Mode
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                          <Card className="p-6 rounded-xl shadow-sm">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="text-sm font-medium text-gray-500">Active Campaigns</div>
                                <div className="text-4xl font-bold text-gray-900 mt-3">{activeDeals.length}</div>
                              </div>
                              <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                                <Sparkles className="h-5 w-5 text-purple-500" />
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
                          <div className="text-lg font-semibold text-gray-900 mb-5">Active Licensing Deals</div>
                          <div className="space-y-4">
                            {activeDeals.length === 0 ? (
                              <div className="text-sm text-gray-600 py-8 text-center">No active deals yet.</div>
                            ) : (
                              activeDeals.slice(0, 6).map((r: any) => (
                                <div
                                  key={r.id}
                                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                                >
                                  <div className="flex items-center gap-4 min-w-0">
                                    <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                                      {r.brand_logo_url ? (
                                        <img src={r.brand_logo_url} alt="" className="h-full w-full object-cover" />
                                      ) : (
                                        <Briefcase className="h-6 w-6 text-gray-400" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-base font-semibold text-gray-900 truncate">
                                        {r.brand_name || "Brand"}
                                      </div>
                                      <div className="text-sm text-gray-500 truncate">
                                        {r.campaign_title || "Licensing request"}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-semibold text-green-600">$0/mo</div>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                                      Active
                                    </span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                          <button className="w-full mt-5 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200" onClick={() => setTab("campaigns")}>
                            View All {activeDeals.length} Deals
                          </button>
                        </Card>

                        <div className="rounded-xl bg-amber-50 border border-amber-200 p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-semibold text-gray-900">Pending Approvals</h3>
                                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-500 text-white text-xs font-bold">
                                  {pendingApprovals.length}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">You have licensing requests waiting for review</p>
                            </div>
                          </div>
                          <button 
                            className="w-full mt-5 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors shadow-sm"
                            onClick={() => setTab("approvals")}
                          >
                            Review Requests
                          </button>
                        </div>

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

                    {tab === "approvals" && (
                      <Card className="p-6">
                        <div className="text-xl font-semibold text-gray-900">Approval Queue</div>
                        <div className="text-sm text-gray-600 mt-1">Requests awaiting your approval.</div>
                        <div className="mt-5 space-y-3">
                          {pendingApprovals.length === 0 ? (
                            <div className="text-sm text-gray-600">No pending approvals.</div>
                          ) : (
                            pendingApprovals.map((r: any) => (
                              <div
                                key={r.id}
                                className="flex items-center justify-between rounded-lg border bg-white px-4 py-3"
                              >
                                <div>
                                  <div className="text-sm font-semibold text-gray-900">
                                    {r.brand_name || "Brand"}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {r.campaign_title || "Licensing request"}
                                  </div>
                                </div>
                                <Badge variant="outline" className="capitalize">pending</Badge>
                              </div>
                            ))
                          )}
                        </div>
                      </Card>
                    )}

                    {tab === "licenses" && (
                      <Card className="p-6">
                        <div className="text-xl font-semibold text-gray-900">Licenses & Contracts</div>
                        <div className="text-sm text-gray-600 mt-1">Coming soon.</div>
                      </Card>
                    )}

                    {tab === "campaigns" && (
                      <Card className="p-6">
                        <div className="text-xl font-semibold text-gray-900">Active Campaigns</div>
                        <div className="text-sm text-gray-600 mt-1">Coming soon.</div>
                      </Card>
                    )}

                    {tab === "archive" && (
                      <Card className="p-6">
                        <div className="text-xl font-semibold text-gray-900">Archive</div>
                        <div className="text-sm text-gray-600 mt-1">Coming soon.</div>
                      </Card>
                    )}

                    {tab === "earnings" && (
                      <Card className="p-6">
                        <div className="text-xl font-semibold text-gray-900">Earnings</div>
                        <div className="text-sm text-gray-600 mt-1">Coming soon.</div>
                      </Card>
                    )}

                    {tab === "analytics" && (
                      <Card className="p-6">
                        <div className="text-xl font-semibold text-gray-900">Analytics</div>
                        <div className="text-sm text-gray-600 mt-1">Coming soon.</div>
                      </Card>
                    )}

                    {tab === "messages" && (
                      <Card className="p-6">
                        <div className="text-xl font-semibold text-gray-900">Messages</div>
                        <div className="text-sm text-gray-600 mt-1">Coming soon.</div>
                      </Card>
                    )}

                    {tab === "likeness" && (
                      <div className="space-y-8">
                        <div>
                          <div className="text-2xl font-bold text-gray-900">My Likeness</div>
                          <div className="text-sm text-gray-600 mt-1">Manage your photos, videos, and voice samples</div>
                        </div>

                        <Card className="p-8 rounded-xl shadow-sm">
                          <div className="text-lg font-semibold text-gray-900 mb-6">Likeness Asset Library</div>
                          <p className="text-sm text-gray-500 mb-8">Manage your photos, videos, and voice samples used for AI content generation</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <Card className="p-6 bg-[#F0FDFF] border-[#E0F2F1] rounded-xl">
                              <div className="flex flex-col h-full">
                                <div className="flex items-center gap-3 mb-4">
                                  <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                                    <Sparkles className="h-5 w-5 text-[#32C8D1]" />
                                  </div>
                                  <div>
                                    <div className="text-xs font-semibold text-gray-500">Reference Photos</div>
                                    <div className="text-2xl font-bold text-gray-900">8/15</div>
                                  </div>
                                </div>
                                <div className="mt-auto">
                                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-gray-900 rounded-full" style={{ width: '53%' }}></div>
                                  </div>
                                </div>
                              </div>
                            </Card>

                            <Card className="p-6 bg-[#F5F3FF] border-[#EDE9FE] rounded-xl">
                              <div className="flex flex-col h-full">
                                <div className="flex items-center gap-3 mb-4">
                                  <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                                    <MessageSquare className="h-5 w-5 text-purple-500" />
                                  </div>
                                  <div>
                                    <div className="text-xs font-semibold text-gray-500">Voice Samples</div>
                                    <div className="text-2xl font-bold text-gray-900">3/6</div>
                                  </div>
                                </div>
                                <div className="mt-auto">
                                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-gray-900 rounded-full" style={{ width: '50%' }}></div>
                                  </div>
                                </div>
                              </div>
                            </Card>

                            <Card className="p-6 bg-[#FFF7ED] border-[#FFEDD5] rounded-xl">
                              <div className="flex flex-col h-full">
                                <div className="flex items-center gap-3 mb-4">
                                  <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                                    <FolderKanban className="h-5 w-5 text-orange-500" />
                                  </div>
                                  <div>
                                    <div className="text-xs font-semibold text-gray-500">Cameo Video</div>
                                    <div className="text-2xl font-bold text-gray-900">1/1</div>
                                  </div>
                                </div>
                                <div className="mt-auto">
                                  <Badge className="bg-green-500 text-white hover:bg-green-600 border-0">Complete</Badge>
                                </div>
                              </div>
                            </Card>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button className="flex items-center justify-center gap-2 py-3.5 px-4 bg-[#32C8D1] hover:bg-[#2AB8C1] text-white font-medium rounded-lg transition-colors shadow-sm">
                              <Sparkles className="h-4 w-4" />
                              Manage Photos
                            </button>
                            <button className="flex items-center justify-center gap-2 py-3.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors shadow-sm">
                              <MessageSquare className="h-4 w-4" />
                              Manage Voice
                            </button>
                          </div>
                        </Card>

                        <div className="space-y-4">
                          <h3 className="text-xl font-bold text-gray-900">Portfolio Showcase</h3>
                          <p className="text-sm text-gray-500">Approved AI-generated content featuring your likeness</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                              { brand: "Nike Sportswear", views: "125,000 views", img: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=400" },
                              { brand: "Glossier Beauty", views: "89,000 views", img: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=400" },
                              { brand: "Tesla Motors", views: "450,000 views", img: "https://images.unsplash.com/photo-1536700503339-1e4b06520771?auto=format&fit=crop&q=80&w=400" }
                            ].map((item, i) => (
                              <Card key={i} className="overflow-hidden rounded-xl border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="relative aspect-[16/9]">
                                  <img src={item.img} alt={item.brand} className="w-full h-full object-cover" />
                                  <div className="absolute top-2 right-2">
                                    <Badge className="bg-green-500 text-white border-0 text-[10px] h-5">Live</Badge>
                                  </div>
                                </div>
                                <div className="p-4 bg-white">
                                  <div className="font-bold text-gray-900">{item.brand}</div>
                                  <div className="text-xs text-gray-500">{item.views}</div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>

                        <Card className="p-5 rounded-xl shadow-sm border-0 bg-gradient-to-r from-indigo-50 to-blue-50">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 min-w-0">
                              <div className="h-14 w-14 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden">
                                {agencyUser?.agency_logo_url ? (
                                  <img src={agencyUser.agency_logo_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <Briefcase className="h-6 w-6 text-gray-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="text-base font-semibold text-gray-900 truncate">{agencyName || "Your Agency"}</div>
                                <div className="text-sm text-gray-500 truncate">Connected since 2/10/2026</div>
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
                  </>
                )}

                {tab === "settings" && (
                  <div className="space-y-4">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">Settings</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Manage your profile and likeness.
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {[
                        { key: "profile", label: "Profile" },
                        { key: "attributes", label: "Attributes" },
                        { key: "media_social", label: "Media & Social" },
                        { key: "notes", label: "Notes" },
                        { key: "my_likeness", label: "My Likeness" },
                      ].map((t) => (
                        <Button
                          key={t.key}
                          variant={settingsTab === t.key ? "default" : "outline"}
                          className="h-9"
                          onClick={() => setSettingsTab(t.key)}
                        >
                          {t.label}
                        </Button>
                      ))}
                    </div>

                    <Card className="p-6">
                      {settingsTab === "profile" && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-gray-600">Stage name</div>
                              <Input
                                value={profileForm.stage_name || ""}
                                onChange={(e) =>
                                  setProfileForm((p: any) => ({ ...p, stage_name: e.target.value }))
                                }
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
                                onChange={(e) =>
                                  setProfileForm((p: any) => ({ ...p, email: e.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-gray-600">Phone</div>
                              <Input
                                value={profileForm.phone_number || ""}
                                onChange={(e) =>
                                  setProfileForm((p: any) => ({ ...p, phone_number: e.target.value }))
                                }
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-gray-600">Bio</div>
                            <Textarea
                              value={profileForm.bio_notes || ""}
                              onChange={(e) =>
                                setProfileForm((p: any) => ({ ...p, bio_notes: e.target.value }))
                              }
                              className="min-h-[120px]"
                            />
                          </div>
                        </div>
                      )}

                      {settingsTab === "attributes" && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-gray-600">Gender identity</div>
                              <Input
                                value={profileForm.gender_identity || ""}
                                onChange={(e) =>
                                  setProfileForm((p: any) => ({ ...p, gender_identity: e.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-gray-600">Race / Ethnicity (comma separated)</div>
                              <Input
                                value={(profileForm.race_ethnicity || []).join(", ")}
                                onChange={(e) =>
                                  setProfileForm((p: any) => ({
                                    ...p,
                                    race_ethnicity: e.target.value
                                      .split(",")
                                      .map((s) => s.trim())
                                      .filter(Boolean),
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-gray-600">Hair color</div>
                              <Input
                                value={profileForm.hair_color || ""}
                                onChange={(e) =>
                                  setProfileForm((p: any) => ({ ...p, hair_color: e.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-gray-600">Eye color</div>
                              <Input
                                value={profileForm.eye_color || ""}
                                onChange={(e) =>
                                  setProfileForm((p: any) => ({ ...p, eye_color: e.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-gray-600">Height (ft)</div>
                              <Input
                                type="number"
                                value={profileForm.height_feet}
                                onChange={(e) =>
                                  setProfileForm((p: any) => ({ ...p, height_feet: e.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-gray-600">Height (in)</div>
                              <Input
                                type="number"
                                value={profileForm.height_inches}
                                onChange={(e) =>
                                  setProfileForm((p: any) => ({ ...p, height_inches: e.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-gray-600">Bust/Chest (in)</div>
                              <Input
                                type="number"
                                value={profileForm.bust_chest_inches}
                                onChange={(e) =>
                                  setProfileForm((p: any) => ({ ...p, bust_chest_inches: e.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-gray-600">Waist (in)</div>
                              <Input
                                type="number"
                                value={profileForm.waist_inches}
                                onChange={(e) =>
                                  setProfileForm((p: any) => ({ ...p, waist_inches: e.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-gray-600">Hips (in)</div>
                              <Input
                                type="number"
                                value={profileForm.hips_inches}
                                onChange={(e) =>
                                  setProfileForm((p: any) => ({ ...p, hips_inches: e.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-gray-600">Special skills (comma separated)</div>
                              <Input
                                value={(profileForm.special_skills || []).join(", ")}
                                onChange={(e) =>
                                  setProfileForm((p: any) => ({
                                    ...p,
                                    special_skills: e.target.value
                                      .split(",")
                                      .map((s) => s.trim())
                                      .filter(Boolean),
                                  }))
                                }
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {settingsTab === "media_social" && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-gray-600">Instagram handle</div>
                              <Input
                                value={profileForm.instagram_handle || ""}
                                onChange={(e) =>
                                  setProfileForm((p: any) => ({ ...p, instagram_handle: e.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-gray-600">Profile photo URL</div>
                              <Input
                                value={profileForm.profile_photo_url || ""}
                                onChange={(e) =>
                                  setProfileForm((p: any) => ({ ...p, profile_photo_url: e.target.value }))
                                }
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-gray-600">Photo URLs (comma separated)</div>
                            <Textarea
                              value={(profileForm.photo_urls || []).join(", ")}
                              onChange={(e) =>
                                setProfileForm((p: any) => ({
                                  ...p,
                                  photo_urls: e.target.value
                                    .split(",")
                                    .map((s) => s.trim())
                                    .filter(Boolean),
                                }))
                              }
                              className="min-h-[110px]"
                            />
                          </div>
                        </div>
                      )}

                      {settingsTab === "notes" && (
                        <div className="space-y-3">
                          <div className="text-sm text-gray-600">
                            Notes are stored in your profile bio for now.
                          </div>
                          <Textarea
                            value={profileForm.bio_notes || ""}
                            onChange={(e) =>
                              setProfileForm((p: any) => ({ ...p, bio_notes: e.target.value }))
                            }
                            className="min-h-[160px]"
                          />
                        </div>
                      )}

                      {settingsTab === "my_likeness" && (
                        <div className="space-y-2">
                          <div className="text-sm text-gray-600">
                            This section will be expanded with likeness capture/consent workflows.
                          </div>
                          <div className="text-sm text-gray-900">
                            Consent status: <span className="font-semibold">{agencyUser?.consent_status || "missing"}</span>
                          </div>
                        </div>
                      )}

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
                    </Card>
                  </div>
                )}
        </main>
      </div>
    </div>
    </div>
  );
}
