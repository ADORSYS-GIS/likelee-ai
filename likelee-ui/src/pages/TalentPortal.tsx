import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import DobInput from "@/components/ui/DobInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createTalentBookOut,
  deleteTalentBookOut,
  getTalentLicensingRevenue,
  getTalentEarningsByCampaign,
  getTalentEarningsByAgency,
  getTalentPayoutBalance,
  requestTalentPayout,
  getTalentAnalytics,
  listVoiceRecordings,
  uploadVoiceRecording,
  deleteVoiceRecording,
  listTalentPortfolioItems,
  createTalentPortfolioItem,
  deleteTalentPortfolioItem,
  uploadTalentPortfolioItem,
  listTalentNotifications,
  markTalentNotificationRead,
  getTalentPortalSettings,
  updateTalentPortalSettings,
  getLatestTalentTaxDocument,
  getTalentMe,
  listTalentAgencyInvites,
  updateTalentProfile,
  listTalentBookings,
  listTalentBookOuts,
  listTalentLicensingRequests,
  listTalentLicenses,
  getTalentBookingPreferences,
  updateTalentBookingPreferences,
  getTalentIrlEarningsSummary,
  listTalentIrlPayments,
  createTalentIrlPayoutRequest,
  listMyCampaignOffers,
  listOfferDeliverables,
  uploadOfferDeliverable,
} from "@/api/functions";
import { isAtLeastAge } from "@/lib/dob";
import { BookingsView } from "@/components/Bookings/BookingsView";
import {
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  DollarSign,
  FileText,
  FolderArchive,
  Image as LucideImage,
  LayoutGrid,
  Loader2,
  MessageSquare,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Upload,
  User,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

import {
  acceptCreatorAgencyInvite,
  declineCreatorAgencyInvite,
  disconnectCreatorAgencyConnection,
  listCreatorAgencyConnections,
} from "@/api/creatorAgencyConnection";

function useQueryParams() {
  const location = useLocation();
  return React.useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
}

export default function TalentPortal({
  embedded,
  initialTab,
  initialSettingsTab,
  initialMode,
}: {
  embedded?: boolean;
  initialTab?: string;
  initialSettingsTab?: string;
  initialMode?: "ai" | "irl";
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useQueryParams();
  const { initialized, authenticated, profile } = useAuth();
  const queryClient = useQueryClient();

  const [embeddedMode, setEmbeddedMode] = React.useState<"ai" | "irl">(
    initialMode || "ai",
  );
  const [embeddedTab, setEmbeddedTab] = React.useState(
    (initialTab || "overview").toLowerCase(),
  );
  const [embeddedSettingsTab, setEmbeddedSettingsTab] = React.useState(
    (initialSettingsTab || "profile").toLowerCase(),
  );

  const mode = embedded
    ? embeddedMode
    : (params.get("mode") || "ai").toLowerCase() === "irl"
      ? "irl"
      : "ai";
  const tab = embedded
    ? embeddedTab
    : (params.get("tab") || "overview").toLowerCase();
  const settingsTab = embedded
    ? embeddedSettingsTab
    : (params.get("settings") || "profile").toLowerCase();

  const {
    data: baseMe,
    isLoading: isLoading,
    error,
  } = useQuery({
    queryKey: ["talentMe", "base"],
    queryFn: async () => await getTalentMe(),
    enabled: initialized && authenticated,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  const baseConnectedAgencies = Array.isArray(
    (baseMe as any)?.connected_agencies,
  )
    ? ((baseMe as any)?.connected_agencies as any[])
    : [];
  const { data: creatorAgencyConnections = [] } = useQuery({
    queryKey: ["creatorAgencyConnections", "talentPortal"],
    queryFn: async () => await listCreatorAgencyConnections(),
    enabled: initialized && authenticated,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const mergedConnectedAgencies = React.useMemo(() => {
    const out: any[] = [];
    const seen = new Set<string>();
    const add = (row: any) => {
      const id = String(row?.agency_id || row?.id || "").trim();
      if (!id || seen.has(id)) return;
      seen.add(id);
      out.push(row);
    };
    baseConnectedAgencies.forEach(add);
    (Array.isArray(creatorAgencyConnections)
      ? creatorAgencyConnections
      : []
    ).forEach(add);
    return out;
  }, [baseConnectedAgencies, creatorAgencyConnections]);
  const baseConnectedAgencyIds = Array.isArray(
    (baseMe as any)?.connected_agency_ids,
  )
    ? ((baseMe as any)?.connected_agency_ids as string[])
    : mergedConnectedAgencies
        .map((r: any) => String(r?.agency_id || r?.id || ""))
        .filter((s: string) => !!s);

  const defaultAgencyId = baseConnectedAgencyIds[0];

  const [selectedAgencyId, setSelectedAgencyId] = React.useState<string>("all");
  const [selectedBrandId, setSelectedBrandId] = React.useState<string>("all");
  const [campaignSearch, setCampaignSearch] = React.useState("");
  React.useEffect(() => {
    setSelectedAgencyId("all");
  }, [baseConnectedAgencyIds.join(",")]);

  const canSelectAgency = baseConnectedAgencyIds.length > 0;
  const effectiveAgencyId =
    selectedAgencyId === "all" ? undefined : selectedAgencyId;
  const profileAgencyId = effectiveAgencyId || defaultAgencyId;

  const { data: agencyMe } = useQuery({
    queryKey: ["talentMe", profileAgencyId || "default"],
    queryFn: async () =>
      await getTalentMe(
        profileAgencyId ? { agency_id: profileAgencyId } : undefined,
      ),
    enabled: initialized && authenticated && !!profileAgencyId,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  const agencyUser =
    (agencyMe as any)?.agency_user || (baseMe as any)?.agency_user;
  const talentId = agencyUser?.id as string | undefined;
  const agencyName = agencyUser?.agency_name as string | undefined;
  const profilePhotoUrl = agencyUser?.profile_photo_url as string | undefined;
  const email = (agencyUser?.email || profile?.email) as string | undefined;
  const talentName =
    agencyUser?.stage_name ||
    agencyUser?.full_legal_name ||
    profile?.full_name ||
    profile?.email;

  const connectedAgencies = mergedConnectedAgencies;
  const connectedAgencyIds = baseConnectedAgencyIds;

  const agencyNameById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const r of connectedAgencies) {
      const id = String(r?.agency_id || r?.id || "").trim();
      const name =
        (r?.agencies && (r.agencies as any)?.agency_name) ||
        r?.agency?.agency_name ||
        r?.agency_name ||
        r?.name ||
        undefined;
      if (id) map.set(id, name || id);
    }
    return map;
  }, [connectedAgencies]);

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
    queryKey: ["talentBookings", effectiveAgencyId || "all"],
    queryFn: async () => {
      const rows = await listTalentBookings(
        effectiveAgencyId ? { agency_id: effectiveAgencyId } : {},
      );
      return Array.isArray(rows) ? rows : [];
    },
    enabled: !!talentId,
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });

  const { data: analytics } = useQuery({
    queryKey: ["talentAnalytics", currentMonth],
    queryFn: async () => await getTalentAnalytics({ month: currentMonth }),
    enabled: !!talentId,
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });

  const { data: irlEarningsSummary } = useQuery({
    queryKey: ["talentIrlEarningsSummary"],
    queryFn: async () => await getTalentIrlEarningsSummary(),
    enabled: !!talentId,
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });

  const { data: irlPayments = [] } = useQuery({
    queryKey: ["talentIrlPayments", effectiveAgencyId || "all"],
    queryFn: async () => {
      const rows = await listTalentIrlPayments(
        effectiveAgencyId
          ? { agency_id: effectiveAgencyId, limit: 200 }
          : { limit: 200 },
      );
      return Array.isArray(rows) ? rows : [];
    },
    enabled: !!talentId,
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });

  const createIrlPayoutRequestMutation = useMutation({
    mutationFn: async (payload: { amount_cents: number; currency?: string }) =>
      await createTalentIrlPayoutRequest(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["talentIrlEarningsSummary"],
      });
      await queryClient.invalidateQueries({ queryKey: ["talentIrlPayments"] });
    },
  });

  const { data: bookOuts = [] } = useQuery({
    queryKey: ["talentBookOuts", effectiveAgencyId || "all"],
    queryFn: async () => {
      const rows = await listTalentBookOuts(
        effectiveAgencyId ? { agency_id: effectiveAgencyId } : {},
      );
      return Array.isArray(rows) ? rows : [];
    },
    enabled: !!talentId,
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });

  const addBookOutMutation = useMutation({
    mutationFn: async (payload: any) => await createTalentBookOut(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["talentBookOuts"] });
    },
  });

  const deleteBookOutMutation = useMutation({
    mutationFn: async (id: string) => await deleteTalentBookOut(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["talentBookOuts"] });
    },
  });

  const { data: bookingPreferences } = useQuery({
    queryKey: ["talentBookingPreferences", profileAgencyId || "all"],
    queryFn: async () =>
      await getTalentBookingPreferences(
        profileAgencyId ? { agency_id: profileAgencyId } : {},
      ),
    enabled: !!talentId,
    staleTime: 5 * 60 * 1000, // 5 minutes - rarely changes
    refetchOnWindowFocus: false,
  });

  const updateBookingPreferencesMutation = useMutation({
    mutationFn: async (payload: {
      willing_to_travel?: boolean;
      min_day_rate_cents?: number | null;
      currency?: string;
    }) => await updateTalentBookingPreferences(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["talentBookingPreferences"],
      });
    },
    onError: (e: any) => {
      const msg = String(e?.message || "");
      const normalized = msg.toLowerCase();
      if (
        normalized.includes("agency_id is required") ||
        normalized.includes("not connected to agency") ||
        normalized.includes("missing required information")
      ) {
        toast({
          variant: "destructive",
          title: "Select an agency first",
          description:
            "Choose an agency in the Agency filter, then update booking preferences.",
        });
        return;
      }
      toast({
        variant: "destructive",
        title: "Failed to update booking preferences",
        description: msg || "Please try again.",
      });
    },
  });

  const { data: licensingRequests = [] } = useQuery({
    queryKey: ["talentLicensingRequests"],
    queryFn: async () => {
      const rows = await listTalentLicensingRequests();
      return Array.isArray(rows) ? rows : [];
    },
    enabled: !!talentId,
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });

  const { data: licenses = [] } = useQuery({
    queryKey: ["talentLicenses"],
    queryFn: async () => {
      const rows = await listTalentLicenses();
      return Array.isArray(rows) ? rows : [];
    },
    enabled: !!talentId,
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });

  const { data: licensingRevenue } = useQuery({
    queryKey: ["talentLicensingRevenue", currentMonth],
    queryFn: async () =>
      await getTalentLicensingRevenue({
        month: currentMonth,
        ...(effectiveAgencyId ? { agency_id: effectiveAgencyId } : {}),
      }),
    enabled: !!talentId,
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });

  const { data: earningsByCampaign = [] } = useQuery({
    queryKey: ["talentEarningsByCampaign", currentMonth],
    queryFn: async () => {
      const rows = await getTalentEarningsByCampaign({
        month: currentMonth,
        ...(effectiveAgencyId ? { agency_id: effectiveAgencyId } : {}),
      });
      return Array.isArray(rows) ? rows : [];
    },
    enabled: !!talentId,
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });

  const { data: earningsByAgency = [] } = useQuery({
    queryKey: [
      "talentEarningsByAgency",
      currentMonth,
      effectiveAgencyId || "all",
    ],
    queryFn: async () => {
      const rows = await getTalentEarningsByAgency({
        month: currentMonth,
        ...(effectiveAgencyId ? { agency_id: effectiveAgencyId } : {}),
      });
      return Array.isArray(rows) ? rows : [];
    },
    enabled: !!talentId,
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });

  const { data: earningsByCampaignAllTime = [] } = useQuery({
    queryKey: ["talentEarningsByCampaignAllTime"],
    queryFn: async () => {
      const rows = await getTalentEarningsByCampaign();
      return Array.isArray(rows) ? rows : [];
    },
    enabled: !!talentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const fmtCents = (c?: number) => {
    const v = typeof c === "number" && isFinite(c) ? c : 0;
    return `$${(v / 100).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const safeStr = (v: any) => (typeof v === "string" ? v : "");
  const getBrandKey = React.useCallback(
    (row: any) => {
      const id = safeStr(
        row?.brand_id ||
          row?.brand_org_id ||
          row?.brand_org ||
          row?.brand_company_id ||
          row?.brand_org_uuid ||
          row?.brand_uuid ||
          row?.brand?.id ||
          row?.brands?.id ||
          row?.brand_campaigns?.brand_id ||
          row?.brand_campaigns?.brand_org_id ||
          row?.brand,
      );
      const name = safeStr(
        row?.brand_name ||
          row?.brand_company_name ||
          row?.company_name ||
          row?.organization_name ||
          row?.business_name ||
          row?.brands?.company_name ||
          row?.brands?.name ||
          row?.brand_campaigns?.brand_name ||
          row?.brand_campaigns?.brand ||
          row?.brand?.company_name ||
          row?.brand?.name ||
          row?.brand,
      );
      return id || name;
    },
    [safeStr],
  );

  const getBrandName = React.useCallback(
    (row: any) => {
      return (
        safeStr(
          row?.brand_name ||
            row?.brand_company_name ||
            row?.company_name ||
            row?.organization_name ||
            row?.business_name ||
            row?.brands?.company_name ||
            row?.brands?.name ||
            row?.brand_campaigns?.brand_name ||
            row?.brand_campaigns?.brand ||
            row?.brand?.company_name ||
            row?.brand?.name ||
            row?.brand,
        ) || "Brand"
      );
    },
    [safeStr],
  );

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
      .filter((b: any) => {
        const s = safeStr(b.status).toLowerCase();
        return s === "pending" || s === "confirmed";
      })
      .slice(0, 6);
  }, [bookings, todayStr]);

  const { data: myCampaignOffersData, isLoading: isLoadingCampaignOffers } =
    useQuery({
      queryKey: ["myCampaignOffers"],
      queryFn: async () => {
        const r = await listMyCampaignOffers();
        return r?.offers || [];
      },
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    });

  const activeProjects = React.useMemo(() => {
    if (!Array.isArray(bookings)) return [];
    return bookings
      .filter((b: any) => safeStr(b.date) >= todayStr)
      .filter((b: any) => {
        const s = safeStr(b.status).toLowerCase();
        return s === "pending" || s === "confirmed";
      })
      .sort((a: any, b: any) => safeStr(a.date).localeCompare(safeStr(b.date)));
  }, [bookings, todayStr]);

  const fullySignedOfferStatuses = React.useMemo(
    () =>
      new Set([
        "contract_fully_signed",
        "fully_signed",
        "contract_signed",
        "signed",
        "accepted",
        "active",
        "in_progress",
        "in_execution",
        "deliverables_submitted",
        "in_review",
        "changes_requested",
        "approved",
        "completed",
      ]),
    [],
  );

  const activeCampaignOffers = React.useMemo(() => {
    if (!Array.isArray(myCampaignOffersData)) return [];
    const now = new Date();
    return myCampaignOffersData.filter((offer: any) => {
      const status = safeStr(offer?.status).toLowerCase();
      if (!fullySignedOfferStatuses.has(status)) return false;
      const campaign = offer?.brand_campaigns || {};
      const startRaw =
        safeStr(campaign?.start_date) ||
        safeStr(offer?.start_date) ||
        safeStr(campaign?.start_at) ||
        safeStr(offer?.start_at);
      const endRaw =
        safeStr(campaign?.end_date) ||
        safeStr(offer?.end_date) ||
        safeStr(campaign?.end_at) ||
        safeStr(offer?.end_at);
      const startDate = startRaw ? new Date(startRaw) : null;
      const endDate = endRaw ? new Date(endRaw) : null;
      const startOk =
        !startDate || isNaN(startDate.getTime()) ? true : startDate <= now;
      const endOk =
        !endDate || isNaN(endDate.getTime()) ? true : endDate >= now;
      return startOk && endOk;
    });
  }, [myCampaignOffersData, fullySignedOfferStatuses, safeStr]);

  const offerIsActive = React.useCallback(
    (offer: any) => {
      const campaign = offer?.brand_campaigns || {};
      const startRaw =
        safeStr(campaign?.start_date) ||
        safeStr(offer?.start_date) ||
        safeStr(campaign?.start_at) ||
        safeStr(offer?.start_at);
      const endRaw =
        safeStr(campaign?.end_date) ||
        safeStr(offer?.end_date) ||
        safeStr(campaign?.end_at) ||
        safeStr(offer?.end_at);
      const startDate = startRaw ? new Date(startRaw) : null;
      const endDate = endRaw ? new Date(endRaw) : null;
      const now = new Date();
      const startOk =
        !startDate || isNaN(startDate.getTime()) ? true : startDate <= now;
      const endOk =
        !endDate || isNaN(endDate.getTime()) ? true : endDate >= now;
      return startOk && endOk;
    },
    [safeStr],
  );

  const deriveEndDate = React.useCallback(
    (
      startDate: Date | null,
      endDate: Date | null,
      durationDays?: number,
      durationMonths?: number,
    ) => {
      if (endDate && !isNaN(endDate.getTime())) return endDate;
      if (!startDate || isNaN(startDate.getTime())) return null;
      if (typeof durationDays === "number" && durationDays > 0) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + durationDays);
        return d;
      }
      if (typeof durationMonths === "number" && durationMonths > 0) {
        const d = new Date(startDate);
        d.setMonth(d.getMonth() + durationMonths);
        return d;
      }
      return null;
    },
    [],
  );

  const fallbackActiveCampaignRows = React.useMemo(() => {
    if (!Array.isArray(activeCampaignOffers)) return [];
    return activeCampaignOffers
      .filter((offer: any) => offerIsActive(offer))
      .map((offer: any) => ({ kind: "offer", row: offer }));
  }, [activeCampaignOffers, offerIsActive]);

  const fallbackArchivedCampaigns = React.useMemo(() => {
    if (!Array.isArray(myCampaignOffersData)) return [];
    const now = new Date();
    return myCampaignOffersData.filter((offer: any) => {
      const status = safeStr(offer?.status).toLowerCase();
      if (!fullySignedOfferStatuses.has(status)) return false;
      const campaign = offer?.brand_campaigns || {};
      const endRaw =
        safeStr(campaign?.end_date) ||
        safeStr(offer?.end_date) ||
        safeStr(campaign?.end_at) ||
        safeStr(offer?.end_at);
      const endDate = endRaw ? new Date(endRaw) : null;
      if (!endDate || isNaN(endDate.getTime())) return false;
      return endDate < now;
    });
  }, [myCampaignOffersData, fullySignedOfferStatuses, safeStr]);

  const jobHistory = React.useMemo(() => {
    if (!Array.isArray(bookings)) return [];
    return bookings
      .filter((b: any) => {
        const s = safeStr(b.status).toLowerCase();
        const isPast = safeStr(b.date) < todayStr;
        return s === "completed" || s === "cancelled" || isPast;
      })
      .sort((a: any, b: any) => safeStr(b.date).localeCompare(safeStr(a.date)));
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
    return bookings.filter((b: any) => safeStr(b.date).startsWith(currentMonth))
      .length;
  }, [bookings, currentMonth]);

  const activeDeals = React.useMemo(() => {
    if (!Array.isArray(licensingRequests)) return [];
    return licensingRequests.filter((r: any) => {
      const s = safeStr(r.status).toLowerCase();
      return s === "approved" || s === "confirmed";
    });
  }, [licensingRequests]);

  const fmtDollars = (c?: number) => {
    const v = typeof c === "number" && isFinite(c) ? c : 0;
    const dollars = v / 100;
    return `$${dollars.toLocaleString(undefined, {
      minimumFractionDigits: dollars % 1 === 0 ? 0 : 2,
      maximumFractionDigits: dollars % 1 === 0 ? 0 : 2,
    })}`;
  };

  const fmtCompact = (n?: number) => {
    const v = typeof n === "number" && isFinite(n) ? n : 0;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${Math.round(v / 1_000)}K`;
    return String(Math.round(v));
  };

  const today = React.useMemo(() => new Date(), []);

  const activeLicenses = React.useMemo(() => {
    if (!Array.isArray(licenses)) return [];
    return licenses.filter((l: any) => {
      const s = safeStr(l.status).toLowerCase();
      return s === "active";
    });
  }, [licenses]);

  const completedLicenses = React.useMemo(() => {
    if (!Array.isArray(licenses)) return [];
    return licenses.filter((l: any) => {
      const s = safeStr(l.status).toLowerCase();
      if (s === "expired" || s === "ended" || s === "completed") return true;
      const end = safeStr(l.end_at);
      if (end) {
        const d = new Date(end);
        if (!isNaN(d.getTime()) && d.getTime() < today.getTime()) return true;
      }
      return false;
    });
  }, [licenses, today]);

  const viewsByBrandId = React.useMemo(() => {
    const out: Record<string, number> = {};
    const arr = (analytics as any)?.campaigns;
    if (!Array.isArray(arr)) return out;
    for (const c of arr) {
      const id = safeStr(c?.brand_id);
      if (!id) continue;
      out[id] =
        typeof c?.views_week === "number"
          ? c.views_week
          : Number(c?.views_week || 0);
    }
    return out;
  }, [analytics]);

  const earningsByBrandId = React.useMemo(() => {
    const out: Record<string, number> = {};
    if (!Array.isArray(earningsByCampaign)) return out;
    for (const it of earningsByCampaign as any[]) {
      const id = safeStr(it?.brand_id);
      if (!id) continue;
      out[id] =
        typeof it?.total_cents === "number"
          ? it.total_cents
          : Number(it?.total_cents || 0);
    }
    return out;
  }, [earningsByCampaign]);

  const earningsAllTimeByBrandId = React.useMemo(() => {
    const out: Record<string, number> = {};
    if (!Array.isArray(earningsByCampaignAllTime)) return out;
    for (const it of earningsByCampaignAllTime as any[]) {
      const id = safeStr(it?.brand_id);
      if (!id) continue;
      out[id] =
        typeof it?.total_cents === "number"
          ? it.total_cents
          : Number(it?.total_cents || 0);
    }
    return out;
  }, [earningsByCampaignAllTime]);

  const talentApiAvailable = !error;

  const activeCampaignRows = React.useMemo(() => {
    if (fallbackActiveCampaignRows.length > 0) {
      return fallbackActiveCampaignRows;
    }
    if (!talentApiAvailable) {
      return [];
    }
    if (activeLicenses.length > 0) {
      return activeLicenses.map((l: any) => ({ kind: "license", row: l }));
    }
    return activeDeals.map((r: any) => ({ kind: "request", row: r }));
  }, [
    activeLicenses,
    activeDeals,
    fallbackActiveCampaignRows,
    talentApiAvailable,
  ]);

  const brandOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    const add = (row: any) => {
      const key = getBrandKey(row);
      const name = getBrandName(row);
      if (!key || !name || name.toLowerCase() === "brand") return;
      if (!map.has(key)) map.set(key, name);
    };
    (Array.isArray(licenses) ? licenses : []).forEach(add);
    (Array.isArray(licensingRequests) ? licensingRequests : []).forEach(add);
    (Array.isArray(myCampaignOffersData) ? myCampaignOffersData : []).forEach(
      add,
    );
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [
    licenses,
    licensingRequests,
    myCampaignOffersData,
    getBrandKey,
    getBrandName,
  ]);

  React.useEffect(() => {
    setSelectedBrandId("all");
  }, [brandOptions.map((b) => b.id).join("|")]);

  const filteredActiveCampaignRows = React.useMemo(() => {
    if (selectedBrandId === "all") return activeCampaignRows;
    return activeCampaignRows.filter((it: any) => {
      const row = it?.row || {};
      return getBrandKey(row) === selectedBrandId;
    });
  }, [activeCampaignRows, selectedBrandId, getBrandKey]);

  const filteredActiveCampaignRowsBySearch = React.useMemo(() => {
    const query = campaignSearch.trim().toLowerCase();
    if (!query) return filteredActiveCampaignRows;
    return filteredActiveCampaignRows.filter((it: any) => {
      const row = it?.row || {};
      const brand = getBrandName(row).toLowerCase();
      const campaign =
        row?.brand_campaigns?.name ||
        row?.campaign_title ||
        row?.usage_scope ||
        "";
      return (
        brand.includes(query) || String(campaign).toLowerCase().includes(query)
      );
    });
  }, [campaignSearch, filteredActiveCampaignRows, getBrandName]);

  const archiveRows = React.useMemo(() => {
    const rows: Array<{ kind: "offer"; row: any }> = [];
    (Array.isArray(fallbackArchivedCampaigns)
      ? fallbackArchivedCampaigns
      : []
    ).forEach((o: any) => rows.push({ kind: "offer", row: o }));
    return rows;
  }, [fallbackArchivedCampaigns]);

  const filteredArchiveRows = React.useMemo(() => {
    if (selectedBrandId === "all") return archiveRows;
    return archiveRows.filter((it: any) => {
      const row = it?.row || {};
      return getBrandKey(row) === selectedBrandId;
    });
  }, [archiveRows, selectedBrandId, getBrandKey]);

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

  const setSettingsTab = (nextSettingsTab: string) => {
    if (embedded) {
      setEmbeddedSettingsTab(nextSettingsTab);
      return;
    }
    const nextParams = new URLSearchParams(location.search);
    nextParams.set("tab", "settings");
    nextParams.set("settings", nextSettingsTab);
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
      active
        ? "bg-[#32C8D1] text-white shadow-md shadow-[#32C8D1]/20"
        : "text-[#4A5568] hover:bg-gray-50"
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
      date_of_birth: au.date_of_birth || au.birthdate || "",
      role_type: au.role_type || "",
      status: au.status || "",
      city: au.city || "",
      state_province: au.state_province || "",
      country: au.country || "",
      bio_notes: au.bio_notes || au.bio || "",
      instagram_handle: au.instagram_handle || "",
      instagram_followers: au.instagram_followers ?? "",
      engagement_rate: au.engagement_rate ?? "",
      profile_photo_url: au.profile_photo_url || "",
      photo_urls: Array.isArray(au.photo_urls) ? au.photo_urls : [],
      gender_identity: au.gender_identity || "",
      race_ethnicity: Array.isArray(au.race_ethnicity) ? au.race_ethnicity : [],
      hair_color: au.hair_color || "",
      eye_color: au.eye_color || "",
      skin_tone: au.skin_tone || "",
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
      await queryClient.invalidateQueries({ queryKey: ["talentMe", "base"] });
      if (profileAgencyId) {
        await queryClient.invalidateQueries({
          queryKey: ["talentMe", profileAgencyId],
        });
      }
    },
  });

  const saveProfile = () => {
    if (
      typeof profileForm.date_of_birth === "string" &&
      profileForm.date_of_birth.trim().length > 0 &&
      !isAtLeastAge(profileForm.date_of_birth.trim(), 18)
    ) {
      toast({
        title: "Invalid date of birth",
        description: "Talent must be at least 18 years old.",
        variant: "destructive",
      });
      return;
    }
    const payload: any = {
      agency_id: profileAgencyId || undefined,
      stage_name: profileForm.stage_name || undefined,
      full_legal_name: profileForm.full_legal_name || undefined,
      email: profileForm.email || undefined,
      phone_number: profileForm.phone_number || undefined,
      date_of_birth: profileForm.date_of_birth || undefined,
      role_type: profileForm.role_type || undefined,
      status: profileForm.status || undefined,
      city: profileForm.city || undefined,
      state_province: profileForm.state_province || undefined,
      country: profileForm.country || undefined,
      bio_notes: profileForm.bio_notes || undefined,
      instagram_handle: profileForm.instagram_handle || undefined,
      instagram_followers:
        profileForm.instagram_followers === ""
          ? undefined
          : Number(profileForm.instagram_followers),
      engagement_rate:
        profileForm.engagement_rate === ""
          ? undefined
          : Number(profileForm.engagement_rate),
      profile_photo_url: profileForm.profile_photo_url || undefined,
      photo_urls: Array.isArray(profileForm.photo_urls)
        ? profileForm.photo_urls
        : undefined,
      gender_identity: profileForm.gender_identity || undefined,
      race_ethnicity: Array.isArray(profileForm.race_ethnicity)
        ? profileForm.race_ethnicity
        : undefined,
      hair_color: profileForm.hair_color || undefined,
      eye_color: profileForm.eye_color || undefined,
      skin_tone: profileForm.skin_tone || undefined,
      height_feet:
        profileForm.height_feet === ""
          ? undefined
          : Number(profileForm.height_feet),
      height_inches:
        profileForm.height_inches === ""
          ? undefined
          : Number(profileForm.height_inches),
      bust_chest_inches:
        profileForm.bust_chest_inches === ""
          ? undefined
          : Number(profileForm.bust_chest_inches),
      waist_inches:
        profileForm.waist_inches === ""
          ? undefined
          : Number(profileForm.waist_inches),
      hips_inches:
        profileForm.hips_inches === ""
          ? undefined
          : Number(profileForm.hips_inches),
      tattoos:
        typeof profileForm.tattoos === "boolean"
          ? profileForm.tattoos
          : undefined,
      piercings:
        typeof profileForm.piercings === "boolean"
          ? profileForm.piercings
          : undefined,
      special_skills: Array.isArray(profileForm.special_skills)
        ? profileForm.special_skills
        : undefined,
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
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
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
    queryKey: ["talentPortfolioItems", effectiveAgencyId || "all"],
    queryFn: async () => {
      const rows = await listTalentPortfolioItems(
        effectiveAgencyId ? { agency_id: effectiveAgencyId } : {},
      );
      return Array.isArray(rows) ? rows : [];
    },
    enabled: !!talentId,
    staleTime: 5 * 60 * 1000, // 5 minutes - portfolio rarely changes
    refetchOnWindowFocus: false,
  });

  const { data: agencyInvitesResp, isLoading: agencyInvitesLoading } = useQuery(
    {
      queryKey: ["talentAgencyInvites"],
      queryFn: async () => await listTalentAgencyInvites(),
      enabled: authenticated,
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  );

  const agencyInvites = ((agencyInvitesResp as any)?.invites as any[]) || [];
  const pendingAgencyInvitesCount = (agencyInvites as any[]).filter(
    (i) => String(i?.status || "").toLowerCase() === "pending",
  ).length;

  const { data: agencyConnections = [], isLoading: agencyConnectionsLoading } =
    useQuery({
      queryKey: ["creatorAgencyConnections"],
      queryFn: async () => await listCreatorAgencyConnections(),
      enabled: authenticated,
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    });

  const disconnectAgencyMutation = useMutation({
    mutationFn: async (agencyId: string) =>
      await disconnectCreatorAgencyConnection(agencyId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["creatorAgencyConnections"],
      });
      await queryClient.invalidateQueries({ queryKey: ["talentMe"] });
      await queryClient.invalidateQueries({ queryKey: ["talentBookings"] });
      await queryClient.invalidateQueries({ queryKey: ["talentBookOuts"] });
      await queryClient.invalidateQueries({
        queryKey: ["talentPortfolioItems"],
      });
      await queryClient.invalidateQueries({ queryKey: ["talentIrlPayments"] });
    },
  });

  const createPortfolioMutation = useMutation({
    mutationFn: async (payload: { media_url: string; title?: string }) =>
      await createTalentPortfolioItem(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["talentPortfolioItems"],
      });
    },
  });

  const deletePortfolioMutation = useMutation({
    mutationFn: async (id: string) => await deleteTalentPortfolioItem(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["talentPortfolioItems"],
      });
    },
  });

  const [newPortfolioUrl, setNewPortfolioUrl] = React.useState("");

  const { data: portalSettings } = useQuery({
    queryKey: ["talentPortalSettings"],
    queryFn: async () => await getTalentPortalSettings(),
    enabled: initialized && authenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes - settings rarely change
    refetchOnWindowFocus: false,
  });

  const currentYear = React.useMemo(() => new Date().getFullYear(), []);
  const taxYear = currentYear - 1;

  const { data: tax1099Doc } = useQuery({
    queryKey: ["talentTaxDoc", "1099", taxYear],
    queryFn: async () =>
      await getLatestTalentTaxDocument({ doc_type: "1099", tax_year: taxYear }),
    enabled: !!talentId,
    staleTime: 10 * 60 * 1000, // 10 minutes - tax docs rarely change
    refetchOnWindowFocus: false,
  });

  const { data: w9Doc } = useQuery({
    queryKey: ["talentTaxDoc", "w9"],
    queryFn: async () => await getLatestTalentTaxDocument({ doc_type: "w9" }),
    enabled: !!talentId,
    staleTime: 10 * 60 * 1000, // 10 minutes - tax docs rarely change
    refetchOnWindowFocus: false,
  });

  const updatePortalSettingsMutation = useMutation({
    mutationFn: async (payload: {
      allow_training?: boolean;
      public_profile_visible?: boolean;
    }) => await updateTalentPortalSettings(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["talentPortalSettings"],
      });
    },
  });

  const { data: talentNotifications = [] } = useQuery({
    queryKey: ["talentNotifications"],
    queryFn: async () => {
      const rows = await listTalentNotifications({ limit: 100 });
      return Array.isArray(rows) ? rows : [];
    },
    enabled: authenticated,
    staleTime: 30 * 1000, // 30 seconds - notifications change frequently
    refetchOnWindowFocus: false,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => await markTalentNotificationRead(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["talentNotifications"],
      });
    },
  });

  const filteredNotifications = React.useMemo(() => {
    if (!Array.isArray(talentNotifications)) return [];
    if (selectedAgencyId === "all") return talentNotifications;
    return (talentNotifications as any[]).filter((n: any) => {
      const agencyId = String(
        n?.agency_id || n?.agency?.id || n?.agencyId || "",
      );
      return agencyId === selectedAgencyId;
    });
  }, [talentNotifications, selectedAgencyId]);

  const photoUrls = Array.isArray(profileForm.photo_urls)
    ? profileForm.photo_urls
    : [];
  const photoCount = photoUrls.length;
  const voiceCount = Array.isArray(voiceRecordings)
    ? voiceRecordings.length
    : 0;

  const portalContent = (
    <>
      <div className="sticky top-0 z-20 space-y-4 bg-gray-50/95 backdrop-blur supports-[backdrop-filter]:bg-gray-50/80 py-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {mode === "irl" ? "IRL Bookings Portal" : "AI Licensing Portal"}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {mode === "irl"
                ? "Track your bookings and earnings"
                : "Manage your AI licensing deals and earnings"}
            </div>
          </div>
          <div />
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
                  { id: "portfolio", label: "Portfolio", icon: LucideImage },
                  { id: "earnings", label: "Earnings", icon: DollarSign },
                  { id: "messages", label: "Messages", icon: MessageSquare },
                  { id: "settings", label: "Settings", icon: Settings },
                  {
                    id: "agency_connection",
                    label: "Agency Connection",
                    icon: Building2,
                    badge: pendingAgencyInvitesCount || undefined,
                  },
                ]
              : [
                  { id: "overview", label: "Overview", icon: LayoutGrid },
                  { id: "likeness", label: "My Likeness", icon: Sparkles },
                  {
                    id: "campaigns",
                    label: "Active Campaigns",
                    icon: Briefcase,
                    badge: activeCampaignRows.length,
                  },
                  { id: "archive", label: "Archive", icon: FolderArchive },
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
                      <div className="text-sm font-medium text-gray-500">
                        Upcoming Bookings
                      </div>
                      <div className="text-4xl font-bold text-gray-900 mt-3">
                        {upcomingBookings.length}
                      </div>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-blue-500" />
                    </div>
                  </div>
                </Card>
                <Card className="p-6 rounded-xl shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-500">
                        Total Earnings
                      </div>
                      <div className="text-4xl font-bold text-gray-900 mt-3">
                        {fmtCents(
                          (irlEarningsSummary as any)?.total_paid_cents,
                        )}
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
                      <div className="text-sm font-medium text-gray-500">
                        Completed Jobs
                      </div>
                      <div className="text-4xl font-bold text-gray-900 mt-3">
                        {completedBookingsCount}
                      </div>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-orange-500" />
                    </div>
                  </div>
                </Card>
                <Card className="p-6 rounded-xl shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-500">
                        This Month
                      </div>
                      <div className="text-4xl font-bold text-gray-900 mt-3">
                        {thisMonthBookingsCount}
                      </div>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                    </div>
                  </div>
                </Card>
              </div>

              <Card className="p-6 rounded-xl shadow-sm">
                <div className="text-lg font-semibold text-gray-900">
                  Upcoming Bookings
                </div>
                <div className="mt-5 border rounded-xl border-dashed border-gray-200 p-12 bg-gray-50/50">
                  {upcomingBookings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                        <Calendar className="h-8 w-8 text-gray-400" />
                      </div>
                      <div className="text-sm text-gray-500">
                        No upcoming bookings
                      </div>
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
                            <div className="text-xs text-gray-500 mt-1">
                              {b.date}
                            </div>
                          </div>
                          <Badge variant="secondary" className="capitalize">
                            {safeStr(b.status || "pending").toLowerCase() ||
                              "pending"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-6 rounded-xl shadow-sm">
                <div className="text-sm font-semibold text-gray-900">
                  Earnings by Agency
                </div>
                <div className="mt-4 space-y-2">
                  {earningsByAgency.length === 0 ? (
                    <div className="text-sm text-gray-600 py-6 text-center">
                      No earnings by agency for this month yet.
                    </div>
                  ) : (
                    earningsByAgency.slice(0, 10).map((it: any) => (
                      <div
                        key={String(it.agency_id || "")}
                        className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-bold text-gray-700">
                            {(
                              String(
                                it.agency_name || it.agency_id || "A",
                              ).trim()[0] || "A"
                            ).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">
                              {it.agency_name || it.agency_id || "Agency"}
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
                        <button className="px-3 py-1.5 text-xs font-medium rounded-full bg-[#32C8D1] text-white hover:bg-[#2AB8C1] transition-colors">
                          Edit Profile
                        </button>
                        <button className="px-3 py-1.5 text-xs font-medium rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors">
                          Manage Campaigns
                        </button>
                        <button className="px-3 py-1.5 text-xs font-medium rounded-full bg-amber-400 text-white hover:bg-amber-500 transition-colors">
                          View Earnings
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </>
          )}

          {tab === "calendar" && (
            <div className="space-y-6">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  Booking Calendar
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  View and manage your upcoming bookings
                </div>
              </div>

              <Card className="p-6 rounded-xl shadow-sm">
                <BookingsView
                  activeSubTab="Calendar & Schedule"
                  bookings={Array.isArray(bookings) ? (bookings as any[]) : []}
                  onAddBooking={() => {}}
                  onUpdateBooking={() => {}}
                  onCancelBooking={() => {}}
                  bookOuts={Array.isArray(bookOuts) ? (bookOuts as any[]) : []}
                  onAddBookOut={(bo: any) => {
                    const payload: any = {
                      start_date: bo.startDate || bo.start_date,
                      end_date: bo.endDate || bo.end_date,
                      reason: bo.reason,
                      notes: bo.notes,
                      notify_agency: !!bo.notifyAgency,
                    };
                    if (fixedTalent?.id) payload.agency_id = fixedTalent.id;
                    addBookOutMutation.mutate(payload);
                  }}
                  onRemoveBookOut={(id: string) => {
                    deleteBookOutMutation.mutate(id);
                  }}
                  fixedTalent={
                    selectedAgencyId === "all"
                      ? { id: "all", name: String(talentName || "My Profile") }
                      : fixedTalent
                  }
                  disableBookingEdits
                />
              </Card>
            </div>
          )}

          {tab === "active_projects" && (
            <div className="space-y-6">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  Active Projects
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Current ongoing projects and gigs
                </div>
              </div>

              <Card className="p-6 rounded-xl shadow-sm">
                <div className="mt-2 border rounded-xl border-dashed border-gray-200 p-12 bg-gray-50/50">
                  {activeProjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                        <Briefcase className="h-8 w-8 text-gray-400" />
                      </div>
                      <div className="text-sm text-gray-500">
                        No Active Projects
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Confirmed bookings will appear here
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeProjects.map((b: any) => (
                        <div
                          key={b.id}
                          className="rounded-xl border bg-white p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900 truncate">
                                {b.client_name || "Project"}
                              </div>
                              <div className="text-xs text-gray-600 mt-1 truncate">
                                {b.date}
                                {b.location ? ` • ${b.location}` : ""}
                              </div>
                              {b.notes && (
                                <div className="text-xs text-gray-500 mt-2 line-clamp-2">
                                  {String(b.notes)}
                                </div>
                              )}
                            </div>
                            <Badge variant="outline" className="capitalize">
                              {safeStr(b.status || "pending").toLowerCase() ||
                                "pending"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {tab === "history" && (
            <div className="space-y-6">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  Job History
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  View all completed bookings
                </div>
              </div>

              <Card className="p-6 rounded-xl shadow-sm">
                <div className="mt-2 border rounded-xl border-dashed border-gray-200 p-12 bg-gray-50/50">
                  {jobHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                        <FileText className="h-8 w-8 text-gray-400" />
                      </div>
                      <div className="text-sm text-gray-500">
                        No Completed Jobs
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Completed bookings will appear here
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {jobHistory.map((b: any) => (
                        <div
                          key={b.id || `${b.date}-${b.client_name}`}
                          className="flex items-start justify-between gap-4 rounded-xl border bg-white p-4"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">
                              {b.client_name || "Job"}
                            </div>
                            <div className="text-xs text-gray-600 mt-1 truncate">
                              {b.date}
                              {b.location ? ` • ${b.location}` : ""}
                            </div>
                          </div>
                          <Badge variant="secondary" className="capitalize">
                            {safeStr(b.status || "completed").toLowerCase() ||
                              "completed"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {tab === "availability" && (
            <div className="space-y-6">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  Availability Settings
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Manage your booking availability and book-outs
                </div>
              </div>

              <Card className="p-6 rounded-xl shadow-sm">
                <div className="text-sm font-semibold text-gray-900">
                  Book-Out Calendar
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Block dates when you're not available for bookings
                </div>

                <div className="mt-5">
                  <BookingsView
                    activeSubTab="Talent Availability"
                    bookings={[]}
                    onAddBooking={() => {}}
                    onUpdateBooking={() => {}}
                    onCancelBooking={() => {}}
                    bookOuts={
                      Array.isArray(bookOuts) ? (bookOuts as any[]) : []
                    }
                    onAddBookOut={(bo: any) => {
                      if (!effectiveAgencyId && connectedAgencyIds.length > 1) {
                        toast({
                          variant: "destructive",
                          title: "Select an agency",
                          description:
                            "Please choose the agency for this book-out using the Agency filter dropdown.",
                        });
                        return;
                      }
                      addBookOutMutation.mutate({
                        start_date: bo.startDate || bo.start_date,
                        end_date: bo.endDate || bo.end_date,
                        reason: bo.reason,
                        notes: bo.notes,
                        notify_agency: !!bo.notifyAgency,
                        ...(effectiveAgencyId
                          ? { agency_id: effectiveAgencyId }
                          : {}),
                      });
                    }}
                    onRemoveBookOut={(id: string) =>
                      deleteBookOutMutation.mutate(id)
                    }
                    fixedTalent={fixedTalent}
                    disableBookingEdits
                  />
                </div>
              </Card>

              <Card className="p-6 rounded-xl shadow-sm">
                <div className="text-sm font-semibold text-gray-900">
                  Booking Preferences
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Set preferences your agency can use when booking you
                </div>

                <div className="mt-5 space-y-4">
                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        Willing to Travel
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Accept bookings outside local area
                      </div>
                    </div>
                    <Switch
                      checked={!!(bookingPreferences as any)?.willing_to_travel}
                      onCheckedChange={(checked: boolean) =>
                        updateBookingPreferencesMutation.mutate({
                          willing_to_travel: checked,
                          ...(profileAgencyId
                            ? { agency_id: profileAgencyId }
                            : {}),
                        } as any)
                      }
                      disabled={updateBookingPreferencesMutation.isPending}
                    />
                  </div>

                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          Minimum Day Rate
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          Your minimum acceptable rate
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-semibold text-gray-600">
                          USD
                        </div>
                        <Input
                          className="w-28 bg-white"
                          placeholder="500"
                          defaultValue={
                            (bookingPreferences as any)?.min_day_rate_cents
                              ? Math.round(
                                  Number(
                                    (bookingPreferences as any)
                                      ?.min_day_rate_cents,
                                  ) / 100,
                                )
                              : ""
                          }
                          onBlur={(e) => {
                            const raw = String(e.target.value || "").trim();
                            if (!raw) {
                              updateBookingPreferencesMutation.mutate({
                                min_day_rate_cents: null,
                                ...(profileAgencyId
                                  ? { agency_id: profileAgencyId }
                                  : {}),
                              } as any);
                              return;
                            }
                            const dollars = Number(raw);
                            if (isNaN(dollars) || dollars < 0) return;
                            updateBookingPreferencesMutation.mutate({
                              min_day_rate_cents: Math.round(dollars * 100),
                              ...(profileAgencyId
                                ? { agency_id: profileAgencyId }
                                : {}),
                            } as any);
                          }}
                          disabled={updateBookingPreferencesMutation.isPending}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {tab === "portfolio" && (
            <div className="space-y-6">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  Portfolio
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Showcase your work and past projects
                </div>
              </div>

              <Card className="p-6 rounded-xl shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      Portfolio Images
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Upload images to your IRL portfolio
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#32C8D1] text-white text-sm font-semibold cursor-pointer hover:bg-[#2AB8C1]">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        if (
                          !effectiveAgencyId &&
                          connectedAgencyIds.length > 1
                        ) {
                          toast({
                            variant: "destructive",
                            title: "Select an agency",
                            description:
                              "Please choose the agency for this upload using the Agency filter dropdown.",
                          });
                          e.target.value = "";
                          return;
                        }
                        uploadTalentPortfolioItem({
                          file: f,
                          ...(effectiveAgencyId
                            ? { agency_id: effectiveAgencyId }
                            : {}),
                        })
                          .then(() =>
                            queryClient.invalidateQueries({
                              queryKey: ["talentPortfolioItems"],
                            }),
                          )
                          .finally(() => {
                            e.target.value = "";
                          });
                      }}
                    />
                    Add Images
                  </label>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {(() => {
                    const items = Array.isArray(portfolioItems)
                      ? (portfolioItems as any[])
                      : [];
                    const real = items.slice(0, 12);
                    const placeholders = Math.max(0, 4 - real.length);
                    return (
                      <>
                        {real.map((it: any) => (
                          <div
                            key={it.id}
                            className="group rounded-xl overflow-hidden border bg-white"
                          >
                            <div className="relative aspect-[4/3] bg-gray-100">
                              <img
                                src={it.media_url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                              <button
                                className="absolute bottom-2 right-2 hidden group-hover:inline-flex text-xs px-2 py-1 rounded bg-white/90 border"
                                onClick={() =>
                                  deletePortfolioMutation.mutate(String(it.id))
                                }
                                disabled={deletePortfolioMutation.isPending}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                        {Array.from({ length: placeholders }).map((_, idx) => (
                          <div
                            key={`ph-${idx}`}
                            className="rounded-xl overflow-hidden border border-dashed bg-gray-50"
                          >
                            <div className="aspect-[4/3] flex items-center justify-center">
                              <LucideImage className="h-8 w-8 text-gray-400" />
                            </div>
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>
              </Card>

              <Card className="p-6 rounded-xl shadow-sm">
                <div className="text-sm font-semibold text-gray-900">
                  Past Work Highlights
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Add standout projects, collaborations, or press mentions
                </div>

                <div className="mt-5 border rounded-xl border-dashed border-gray-200 p-12 bg-gray-50/50">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                      <Briefcase className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="text-sm text-gray-500">
                      Highlights coming soon
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Your agency can help curate portfolio highlights here
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {tab === "earnings" && (
            <div className="space-y-6">
              <div>
                <div className="text-2xl font-bold text-gray-900">Earnings</div>
                <div className="text-sm text-gray-600 mt-1">
                  Track your booking earnings
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <Card className="p-6 rounded-xl shadow-sm">
                  <div className="text-xs font-medium text-gray-500">
                    Total Earnings
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mt-2">
                    {fmtCents((irlEarningsSummary as any)?.total_paid_cents)}
                  </div>
                </Card>
                <Card className="p-6 rounded-xl shadow-sm">
                  <div className="text-xs font-medium text-gray-500">
                    Withdrawable
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mt-2">
                    {fmtCents((irlEarningsSummary as any)?.withdrawable_cents)}
                  </div>
                </Card>
                <Card className="p-6 rounded-xl shadow-sm">
                  <div className="text-xs font-medium text-gray-500">
                    Completed Jobs
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mt-2">
                    {completedBookingsCount}
                  </div>
                </Card>
              </div>

              <Card className="p-6 rounded-xl shadow-sm">
                <div className="text-sm font-semibold text-gray-900">
                  Recent Payments
                </div>
                <div className="mt-4 space-y-2">
                  {irlPayments.length === 0 ? (
                    <div className="text-sm text-gray-600">
                      No payments yet.
                    </div>
                  ) : (
                    (irlPayments as any[]).slice(0, 20).map((p: any) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">
                            {p.source || "Payment"}
                          </div>
                          <div className="text-xs text-gray-600 mt-0.5">
                            {p.paid_at
                              ? new Date(p.paid_at).toLocaleDateString()
                              : "—"}
                            {p.status
                              ? ` • ${String(p.status).toLowerCase()}`
                              : ""}
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-gray-900">
                          {fmtCents(p.amount_cents)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <button
                className="w-full h-11 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:hover:bg-green-600"
                disabled={
                  createIrlPayoutRequestMutation.isPending ||
                  !Number((irlEarningsSummary as any)?.withdrawable_cents || 0)
                }
                onClick={() => {
                  const amt = Number(
                    (irlEarningsSummary as any)?.withdrawable_cents || 0,
                  );
                  if (!amt || amt <= 0) return;
                  createIrlPayoutRequestMutation.mutate({ amount_cents: amt });
                }}
              >
                {createIrlPayoutRequestMutation.isPending
                  ? "Requesting…"
                  : "Cash Out Earnings"}
              </button>
            </div>
          )}

          {tab === "messages" && (
            <div className="space-y-6">
              <div>
                <div className="text-2xl font-bold text-gray-900">Messages</div>
                <div className="text-sm text-gray-600 mt-1">
                  Your agency notifications inbox
                </div>
              </div>
              <div className="w-[240px]">
                <Select
                  value={selectedAgencyId}
                  onValueChange={setSelectedAgencyId}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="All agencies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All agencies</SelectItem>
                    {connectedAgencyIds.map((id) => (
                      <SelectItem key={id} value={id}>
                        {agencyNameById.get(id) || id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Card className="p-6 rounded-xl shadow-sm">
                <div className="text-sm font-semibold text-gray-900">
                  Communication Hub
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Email notifications sent by your agency
                </div>

                <div className="mt-5 space-y-3">
                  {filteredNotifications.length > 0 ? (
                    filteredNotifications.map((n: any) => {
                      const id = String(n.id);
                      const from = n.from_label || agencyName || "Agency";
                      const subject = n.subject || "Notification";
                      const msg =
                        typeof n.message === "string" ? n.message : "";
                      const preview =
                        msg.split("\n").filter(Boolean)[0] || msg.slice(0, 80);
                      const unread = !n.read_at;
                      const ts = n.created_at
                        ? new Date(n.created_at).toLocaleString()
                        : "";

                      return (
                        <button
                          key={id}
                          className={`w-full text-left rounded-xl border p-4 transition-colors ${
                            unread
                              ? "bg-blue-50/60 border-blue-200 hover:bg-blue-50"
                              : "bg-white border-gray-100 hover:bg-gray-50"
                          }`}
                          onClick={() => {
                            if (unread && !markReadMutation.isPending) {
                              markReadMutation.mutate(id);
                            }
                          }}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900 truncate">
                                {from}
                              </div>
                              <div className="text-xs text-gray-600 truncate">
                                {subject}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {unread && (
                                <Badge className="bg-blue-600 text-white border-0">
                                  New
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-gray-600 truncate">
                            {preview}
                          </div>
                          <div className="mt-2 text-[11px] text-gray-500">
                            {ts}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-sm text-gray-600">
                      No messages yet.
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {tab === "settings" && (
            <div className="space-y-6">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  Portal Settings
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Configure your talent portal preferences
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto">
                {[
                  { id: "profile", label: "Profile" },
                  { id: "payments", label: "Payments" },
                  { id: "privacy", label: "Privacy" },
                ].map((it) => {
                  const active = settingsTab === it.id;
                  return (
                    <button
                      key={it.id}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors whitespace-nowrap ${
                        active
                          ? "bg-[#32C8D1] text-white border-[#32C8D1]"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      }`}
                      onClick={() => setSettingsTab(it.id)}
                    >
                      {it.label}
                    </button>
                  );
                })}
              </div>

              {settingsTab === "profile" && (
                <Card className="p-6 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        Profile
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        This profile is specific to the selected agency.
                      </div>
                    </div>
                    {canSelectAgency && (
                      <div className="w-[240px]">
                        <Select
                          value={selectedAgencyId}
                          onValueChange={setSelectedAgencyId}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="All agencies" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Default agency</SelectItem>
                            {connectedAgencyIds.map((id) => (
                              <SelectItem key={id} value={id}>
                                {agencyNameById.get(id) || id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">
                        Stage Name
                      </div>
                      <Input
                        value={profileForm.stage_name || ""}
                        onChange={(e) =>
                          setProfileForm((p: any) => ({
                            ...p,
                            stage_name: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">
                        Full Legal Name
                      </div>
                      <Input
                        value={profileForm.full_legal_name || ""}
                        onChange={(e) =>
                          setProfileForm((p: any) => ({
                            ...p,
                            full_legal_name: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Email</div>
                      <Input
                        value={profileForm.email || ""}
                        onChange={(e) =>
                          setProfileForm((p: any) => ({
                            ...p,
                            email: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Phone</div>
                      <Input
                        value={profileForm.phone_number || ""}
                        onChange={(e) =>
                          setProfileForm((p: any) => ({
                            ...p,
                            phone_number: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div>
                      <div className="text-xs text-gray-600 mb-1">
                        Date of Birth
                      </div>
                      <DobInput
                        value={profileForm.date_of_birth || ""}
                        onChange={(value) =>
                          setProfileForm((p: any) => ({
                            ...p,
                            date_of_birth: value,
                          }))
                        }
                        minAge={18}
                      />
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">
                        Role Type
                      </div>
                      <Input
                        value={profileForm.role_type || ""}
                        onChange={(e) =>
                          setProfileForm((p: any) => ({
                            ...p,
                            role_type: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Status</div>
                      <Input
                        value={profileForm.status || ""}
                        onChange={(e) =>
                          setProfileForm((p: any) => ({
                            ...p,
                            status: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">
                        Skin Tone
                      </div>
                      <Input
                        value={profileForm.skin_tone || ""}
                        onChange={(e) =>
                          setProfileForm((p: any) => ({
                            ...p,
                            skin_tone: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div>
                      <div className="text-xs text-gray-600 mb-1">
                        Instagram
                      </div>
                      <Input
                        value={profileForm.instagram_handle || ""}
                        onChange={(e) =>
                          setProfileForm((p: any) => ({
                            ...p,
                            instagram_handle: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">
                        Instagram Followers
                      </div>
                      <Input
                        value={String(profileForm.instagram_followers ?? "")}
                        onChange={(e) =>
                          setProfileForm((p: any) => ({
                            ...p,
                            instagram_followers: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">
                        Engagement Rate
                      </div>
                      <Input
                        value={String(profileForm.engagement_rate ?? "")}
                        onChange={(e) =>
                          setProfileForm((p: any) => ({
                            ...p,
                            engagement_rate: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">City</div>
                      <Input
                        value={profileForm.city || ""}
                        onChange={(e) =>
                          setProfileForm((p: any) => ({
                            ...p,
                            city: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">
                        State / Province
                      </div>
                      <Input
                        value={profileForm.state_province || ""}
                        onChange={(e) =>
                          setProfileForm((p: any) => ({
                            ...p,
                            state_province: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Country</div>
                      <Input
                        value={profileForm.country || ""}
                        onChange={(e) =>
                          setProfileForm((p: any) => ({
                            ...p,
                            country: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-xs text-gray-600 mb-1">Bio</div>
                    <Textarea
                      value={profileForm.bio_notes || ""}
                      onChange={(e) =>
                        setProfileForm((p: any) => ({
                          ...p,
                          bio_notes: e.target.value,
                        }))
                      }
                      className="min-h-[120px]"
                    />
                  </div>

                  <Button
                    className="mt-6 h-11 w-full bg-[#32C8D1] hover:bg-[#2AB8C1]"
                    disabled={updateProfileMutation.isPending}
                    onClick={saveProfile}
                  >
                    {updateProfileMutation.isPending
                      ? "Saving..."
                      : "Save profile"}
                  </Button>
                </Card>
              )}

              {settingsTab !== "profile" && (
                <>
                  <Card className="p-6 rounded-xl shadow-sm">
                    <div className="text-sm font-semibold text-gray-900">
                      Payment Preferences
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            Tax Documentation
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {(w9Doc as any)?.id && (w9Doc as any)?.created_at
                              ? `W-9 on file • Updated ${new Date((w9Doc as any).created_at).toLocaleDateString()}`
                              : "No W-9 on file"}
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          className="mt-4 w-full h-10"
                          disabled={!(tax1099Doc as any)?.public_url}
                          onClick={() => {
                            const url = (tax1099Doc as any)?.public_url;
                            if (url) window.open(url, "_blank");
                          }}
                        >
                          Download 1099 ({taxYear})
                        </Button>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6 rounded-xl shadow-sm">
                    <div className="text-sm font-semibold text-gray-900">
                      Privacy Controls
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            Data Usage for Training
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            Allow anonymized data for AI model improvement
                          </div>
                        </div>
                        <Switch
                          checked={!!(portalSettings as any)?.allow_training}
                          onCheckedChange={(checked: boolean) =>
                            updatePortalSettingsMutation.mutate({
                              allow_training: checked,
                            })
                          }
                          disabled={updatePortalSettingsMutation.isPending}
                        />
                      </div>

                      <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            Public Profile Visibility
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            Show in marketplace search results
                          </div>
                        </div>
                        <Switch
                          checked={
                            (portalSettings as any)?.public_profile_visible ===
                            undefined
                              ? true
                              : !!(portalSettings as any)
                                  ?.public_profile_visible
                          }
                          onCheckedChange={(checked: boolean) =>
                            updatePortalSettingsMutation.mutate({
                              public_profile_visible: checked,
                            })
                          }
                          disabled={updatePortalSettingsMutation.isPending}
                        />
                      </div>
                    </div>
                  </Card>
                </>
              )}
            </div>
          )}

          {tab === "agency_connection" && (
            <div className="space-y-6">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  Agency Connection
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Manage agency invitations and your connected agencies.
                </div>
              </div>

              <Card className="p-6 rounded-xl shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      Connected Agencies
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {agencyConnections.length > 0
                        ? "You can be connected to multiple agencies at once."
                        : "You are not connected to any agencies yet."}
                    </div>
                  </div>
                  {(agencyConnectionsLoading ||
                    disconnectAgencyMutation.isPending) && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading
                    </div>
                  )}
                </div>

                {agencyConnections.length > 0 && (
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {agencyConnections.map((c: any) => (
                      <div
                        key={c.agency_id}
                        className="flex items-center justify-between gap-3 p-4 border border-gray-200 rounded-lg bg-white"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden">
                            {c.agencies?.logo_url ? (
                              <img
                                src={c.agencies.logo_url}
                                alt={c.agencies.agency_name || "Agency"}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <Building2 className="w-5 h-5 text-gray-500" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 truncate">
                              {c.agencies?.agency_name || c.agency_id}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {c.agency_id}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          disabled={disconnectAgencyMutation.isPending}
                          onClick={async () => {
                            try {
                              const agencyLabel =
                                c.agencies?.agency_name ||
                                String(c.agency_id || "");
                              const ok = window.confirm(
                                `Disconnect from ${agencyLabel}? This may remove access to bookings, earnings, and portal data for that agency.`,
                              );
                              if (!ok) return;
                              await disconnectAgencyMutation.mutateAsync(
                                String(c.agency_id),
                              );
                              toast({
                                title: "Disconnected",
                                description:
                                  "You have disconnected from the agency.",
                              });
                            } catch (e: any) {
                              toast({
                                variant: "destructive",
                                title: "Failed to disconnect",
                                description: e?.message || String(e),
                              });
                            }
                          }}
                        >
                          Disconnect
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-6 rounded-xl shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      Invitations
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Respond to pending invitations from agencies.
                    </div>
                  </div>
                  {agencyInvitesLoading && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading
                    </div>
                  )}
                </div>

                {(agencyInvites as any[]).filter((i) => i.status === "pending")
                  .length > 0 ? (
                  <div className="mt-6 space-y-3">
                    {(agencyInvites as any[])
                      .filter((i) => i.status === "pending")
                      .map((inv: any) => (
                        <div
                          key={inv.id}
                          className="p-4 border border-gray-200 rounded-lg space-y-3"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0 flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {inv?.agencies?.logo_url ? (
                                  <img
                                    src={inv.agencies.logo_url}
                                    alt={inv?.agencies?.agency_name || "Agency"}
                                    className="w-full h-full object-contain"
                                  />
                                ) : (
                                  <Building2 className="w-5 h-5 text-gray-500" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-gray-900 truncate">
                                  {inv?.agencies?.agency_name
                                    ? `Invitation from ${inv.agencies.agency_name}`
                                    : "Invitation from agency"}
                                </div>
                                <div className="text-xs text-gray-500 truncate mt-1">
                                  {inv?.agencies?.email ||
                                    inv?.agencies?.website ||
                                    "Agency profile available on request"}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Button
                                variant="outline"
                                disabled={disconnectAgencyMutation.isPending}
                                onClick={async () => {
                                  try {
                                    const token = String(inv?.token || "");
                                    if (token) {
                                      navigate(
                                        `/invite/agency/${encodeURIComponent(token)}`,
                                      );
                                      return;
                                    }
                                    toast({
                                      title: "Missing invite token",
                                      description:
                                        "Open the invite link to respond.",
                                      variant: "destructive" as any,
                                    });
                                  } catch (e: any) {
                                    toast({
                                      variant: "destructive",
                                      title: "Failed to decline",
                                      description: e?.message || String(e),
                                    });
                                  }
                                }}
                              >
                                Decline
                              </Button>
                              <Button
                                className="bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
                                disabled={disconnectAgencyMutation.isPending}
                                onClick={async () => {
                                  try {
                                    await acceptCreatorAgencyInvite(
                                      String(inv.id),
                                    );
                                    await Promise.all([
                                      queryClient.invalidateQueries({
                                        queryKey: ["creatorAgencyInvites"],
                                      }),
                                      queryClient.invalidateQueries({
                                        queryKey: ["creatorAgencyConnections"],
                                      }),
                                      queryClient.invalidateQueries({
                                        queryKey: ["talentMe"],
                                      }),
                                    ]);
                                    toast({
                                      title: "Invitation accepted",
                                      description:
                                        "You are now connected to the agency.",
                                    });
                                  } catch (e: any) {
                                    toast({
                                      variant: "destructive",
                                      title: "Failed to accept",
                                      description: e?.message || String(e),
                                    });
                                  }
                                }}
                              >
                                Accept
                              </Button>
                            </div>
                          </div>
                          <div className="rounded-md border border-cyan-100 bg-cyan-50 px-3 py-2 text-xs text-cyan-900">
                            <span className="font-semibold">
                              Likelee notice:
                            </span>{" "}
                            This agency found your public profile in marketplace
                            and sent a connection invitation.
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="mt-6 text-sm text-gray-500">
                    No pending invitations.
                  </div>
                )}
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
                      <div className="text-sm font-medium text-gray-500">
                        Active Campaigns
                      </div>
                      <div className="text-4xl font-bold text-gray-900 mt-3">
                        {activeDeals.length}
                      </div>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                      <Briefcase className="h-5 w-5 text-purple-500" />
                    </div>
                  </div>
                </Card>

                <Card className="p-6 rounded-xl shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-500">
                        Monthly Revenue
                      </div>
                      <div className="text-4xl font-bold text-gray-900 mt-2">
                        {fmtCents((licensingRevenue as any)?.total_cents)}
                      </div>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-green-500" />
                    </div>
                  </div>
                </Card>
              </div>

              <Card className="p-6 rounded-xl shadow-sm">
                <div className="text-lg font-semibold text-gray-900 mb-5">
                  Latest Licensing Requests
                </div>
                <div className="space-y-3">
                  {licensingRequests.length === 0 ? (
                    <div className="text-sm text-gray-600 py-8 text-center">
                      No licensing requests yet.
                    </div>
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

          {tab === "likeness" && (
            <div className="space-y-6">
              <Card className="p-6 rounded-xl shadow-sm">
                <div className="text-lg font-semibold text-gray-900">
                  Likeness Asset Library
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Manage your photos, videos, and voice samples used for AI
                  content generation
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-6 bg-[#F0FDFF] border-[#E0F2F1] rounded-xl">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-semibold text-gray-500">
                          Reference Photos
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mt-2">
                          {photoCount}/15
                        </div>
                      </div>
                      <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                        <LucideImage className="h-5 w-5 text-[#32C8D1]" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gray-900 rounded-full"
                          style={{
                            width: `${Math.min(100, (photoCount / 15) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6 bg-[#F5F3FF] border-[#EDE9FE] rounded-xl">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-semibold text-gray-500">
                          Voice Samples
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mt-2">
                          {voiceCount}/6
                        </div>
                      </div>
                      <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                        <MessageSquare className="h-5 w-5 text-purple-500" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gray-900 rounded-full"
                          style={{
                            width: `${Math.min(100, (voiceCount / 6) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </Card>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button
                    className="h-12 rounded-xl bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
                    onClick={() =>
                      navigate({
                        pathname: "/CreatorDashboard",
                        search: "?section=likeness",
                      })
                    }
                  >
                    <LucideImage className="h-4 w-4 mr-2" />
                    Manage Photos
                  </Button>
                  <Button
                    className="h-12 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
                    onClick={() =>
                      navigate({
                        pathname: "/CreatorDashboard",
                        search: "?section=voice",
                      })
                    }
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Manage Voice
                  </Button>
                </div>
              </Card>

              <Card className="p-6 rounded-xl shadow-sm">
                <div className="text-lg font-semibold text-gray-900">
                  Asset Usage Rights
                </div>
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        Photos: Approved
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Your photos can be used for AI image generation by
                        licensed brands
                      </div>
                    </div>
                    <Badge className="bg-green-600 text-white border-0">
                      All Brands
                    </Badge>
                  </div>
                  <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        Voice: Approved
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Voice cloning enabled for approved emotions
                      </div>
                    </div>
                    <Badge className="bg-purple-600 text-white border-0">
                      Limited Use
                    </Badge>
                  </div>
                </div>
              </Card>

              <Card className="p-6 rounded-xl shadow-sm">
                <div className="text-lg font-semibold text-gray-900">
                  Portfolio Showcase
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Approved AI-generated content featuring your likeness
                </div>

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
                    disabled={
                      !newPortfolioUrl.trim() ||
                      createPortfolioMutation.isPending
                    }
                  >
                    Add
                  </Button>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {Array.isArray(portfolioItems) &&
                  portfolioItems.length > 0 ? (
                    (portfolioItems as any[]).slice(0, 9).map((it: any) => (
                      <div
                        key={it.id}
                        className="group rounded-xl overflow-hidden border bg-white"
                      >
                        <div className="relative aspect-[16/9] bg-gray-100">
                          <img
                            src={it.media_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-green-500 text-white border-0 text-[10px] h-5">
                              Live
                            </Badge>
                          </div>
                          <button
                            className="absolute bottom-2 right-2 hidden group-hover:inline-flex text-xs px-2 py-1 rounded bg-white/90 border"
                            onClick={() =>
                              deletePortfolioMutation.mutate(String(it.id))
                            }
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
                    <div className="text-sm text-gray-600">
                      No portfolio items yet.
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {tab === "campaigns" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-[240px]">
                  <Select
                    value={selectedBrandId}
                    onValueChange={setSelectedBrandId}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="All brands" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All brands</SelectItem>
                      {brandOptions.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[220px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={campaignSearch}
                      onChange={(e) => setCampaignSearch(e.target.value)}
                      placeholder="Search by brand or campaign"
                      className="pl-10 pr-12"
                    />
                    {campaignSearch.trim() && (
                      <button
                        type="button"
                        onClick={() => setCampaignSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-gray-500 hover:text-gray-700"
                        aria-label="Clear search"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Active summary card removed */}
              </div>

              <Card className="p-6 rounded-xl shadow-sm">
                <div className="text-lg font-semibold text-gray-900">
                  Active Campaigns
                </div>
                <div className="mt-5 space-y-4">
                  {filteredActiveCampaignRowsBySearch.length === 0 ? (
                    <div className="text-sm text-gray-600">
                      {campaignSearch.trim()
                        ? "No campaigns match your search."
                        : isLoadingCampaignOffers
                          ? "Loading active campaigns..."
                          : "No active campaigns yet."}
                    </div>
                  ) : (
                    filteredActiveCampaignRowsBySearch.map((it: any) => {
                      const row = it.row || {};
                      const kind = it.kind || "license";
                      const brandId = getBrandKey(row);
                      const brandName = getBrandName(row);
                      const campaign = row?.brand_campaigns || {};
                      const subtitle =
                        kind === "offer"
                          ? campaign?.name || row?.campaign_title || "Campaign"
                          : row.type ||
                            row.campaign_title ||
                            row.usage_scope ||
                            "Campaign";

                      const startRaw =
                        kind === "offer"
                          ? safeStr(
                              campaign?.start_date ||
                                campaign?.start_at ||
                                row?.start_date ||
                                row?.start_at,
                            )
                          : safeStr(row?.start_at || row?.start_date);
                      const endRaw =
                        kind === "offer"
                          ? safeStr(
                              campaign?.end_date ||
                                campaign?.end_at ||
                                row?.end_date ||
                                row?.end_at,
                            )
                          : safeStr(
                              row.end_at || row.deadline || row.license_expiry,
                            );
                      const startDate = startRaw ? new Date(startRaw) : null;
                      const endDate = endRaw ? new Date(endRaw) : null;
                      const derivedEnd =
                        kind === "offer"
                          ? deriveEndDate(
                              startDate,
                              endDate,
                              campaign?.duration_days ??
                                row?.duration_days ??
                                row?.duration_in_days,
                              campaign?.duration_months ??
                                row?.duration_months ??
                                row?.duration_in_months,
                            )
                          : deriveEndDate(
                              startDate,
                              endDate,
                              row?.duration_days,
                              row?.duration_months,
                            );
                      const activeUntil =
                        derivedEnd && !isNaN(derivedEnd.getTime())
                          ? derivedEnd.toLocaleDateString()
                          : "—";

                      const regions =
                        kind === "offer"
                          ? Array.isArray(campaign?.territory)
                            ? campaign.territory.join(", ")
                            : safeStr(campaign?.territory) || "—"
                          : Array.isArray(row.regions)
                            ? row.regions.join(", ")
                            : safeStr(row.regions) || "—";

                      const impressionsWk = fmtCompact(
                        viewsByBrandId[brandId] || 0,
                      );
                      const briefSnapshot =
                        row?.campaign_brief_snapshot || row?.brief_snapshot;
                      const amountRaw =
                        briefSnapshot?.budget_creator_payment ??
                        briefSnapshot?.budget_creator_payment_cents ??
                        0;
                      const amountValue = Number(amountRaw) || 0;
                      const amountDisplay = `$${amountValue.toLocaleString()}`;
                      const monthlyCents = earningsByBrandId[brandId] || 0;

                      return (
                        <div
                          key={row.id || `${brandId}-${brandName}`}
                          className="rounded-2xl border-2 border-green-200 bg-green-50/40 p-5"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-10 w-10 rounded-lg bg-white border flex items-center justify-center text-sm font-bold text-gray-700">
                                {(
                                  String(brandName).trim()[0] || "B"
                                ).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="text-base font-semibold text-gray-900 truncate">
                                  {brandName}
                                </div>
                                <div className="text-xs text-gray-600 truncate">
                                  {subtitle}
                                </div>
                              </div>
                            </div>
                            <Badge className="bg-green-600 text-white border-0">
                              Active
                            </Badge>
                          </div>

                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="rounded-xl border bg-white p-3">
                              <div className="text-[11px] text-gray-500">
                                Amount
                              </div>
                              <div className="text-sm font-semibold text-gray-900">
                                {kind === "offer"
                                  ? amountDisplay
                                  : fmtDollars(monthlyCents)}
                              </div>
                            </div>
                            <div className="rounded-xl border bg-white p-3">
                              <div className="text-[11px] text-gray-500">
                                Active Until
                              </div>
                              <div className="text-sm font-semibold text-gray-900">
                                {activeUntil}
                              </div>
                            </div>
                            <div className="rounded-xl border bg-white p-3">
                              <div className="text-[11px] text-gray-500">
                                Regions
                              </div>
                              <div className="text-sm font-semibold text-gray-900">
                                {regions}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </div>
          )}
          {tab === "archive" && (
            <Card className="p-6 rounded-xl shadow-sm">
              <div className="text-xl font-semibold text-gray-900">Archive</div>
              <div className="text-sm text-gray-600 mt-1">
                Past campaigns (expired)
              </div>
              <div className="mt-6 space-y-3">
                {(() => {
                  const archivedLicenses = Array.isArray(filteredArchiveRows)
                    ? filteredArchiveRows
                    : [];

                  const items: Array<{
                    key: string;
                    brandName: string;
                    subtitle: string;
                    badge: string;
                    badgeVariant?: "secondary" | "outline";
                  }> = [];

                  for (const entry of archivedLicenses as any[]) {
                    const row = entry?.row || entry;
                    const kind = entry?.kind || "offer";
                    const status = "completed";
                    items.push({
                      key: `${kind}-${row?.id || row?.campaign_offer_id || row?.offer_id || Math.random()}`,
                      brandName: getBrandName(row),
                      subtitle:
                        row?.brand_campaigns?.name ||
                        row?.campaign_title ||
                        "Campaign",
                      badge: status,
                      badgeVariant: "secondary",
                    });
                  }

                  if (items.length === 0) {
                    return (
                      <div className="text-sm text-gray-600">
                        {isLoadingCampaignOffers
                          ? "Loading past campaigns..."
                          : "No past campaigns yet"}
                      </div>
                    );
                  }

                  return items.map((it) => (
                    <div
                      key={it.key}
                      className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4"
                    >
                      <div className="min-w-0">
                        <div className="text-base font-semibold text-gray-900 truncate">
                          {it.brandName}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {it.subtitle}
                        </div>
                      </div>
                      <Badge
                        variant={it.badgeVariant || "secondary"}
                        className="capitalize"
                      >
                        {it.badge}
                      </Badge>
                    </div>
                  ));
                })()}
              </div>
            </Card>
          )}

          {tab === "earnings" && (
            <div className="space-y-6">
              <div>
                <div className="text-2xl font-bold text-gray-900">Earnings</div>
                <div className="text-sm text-gray-600 mt-1">
                  Track your licensing revenue
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                <Card className="p-6 rounded-xl shadow-sm">
                  <div className="text-xs font-medium text-gray-500">
                    Monthly Recurring
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mt-2">
                    {fmtCents((licensingRevenue as any)?.total_cents)}
                  </div>
                </Card>
                <Card className="p-6 rounded-xl shadow-sm">
                  <div className="text-xs font-medium text-gray-500">
                    Annual Run Rate
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mt-2">
                    {fmtCents(
                      ((licensingRevenue as any)?.total_cents || 0) * 12,
                    )}
                  </div>
                </Card>
                <Card className="p-6 rounded-xl shadow-sm">
                  <div className="text-xs font-medium text-gray-500">
                    Active Campaigns
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mt-2">
                    {activeDeals.length}
                  </div>
                </Card>
              </div>

              <Card className="p-6 rounded-xl shadow-sm">
                <div className="text-sm font-semibold text-gray-900">
                  Earnings by Campaign
                </div>
                <div className="mt-4 space-y-2">
                  {earningsByCampaign.length === 0 ? (
                    <div className="text-sm text-gray-600 py-6 text-center">
                      No earnings for this month yet.
                    </div>
                  ) : (
                    earningsByCampaign.slice(0, 10).map((it: any) => (
                      <div
                        key={it.brand_id}
                        className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-bold text-gray-700">
                            {(
                              String(it.brand_name || "B").trim()[0] || "B"
                            ).toUpperCase()}
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
                        <button className="px-3 py-1.5 text-xs font-medium rounded-full bg-[#32C8D1] text-white hover:bg-[#2AB8C1] transition-colors">
                          Edit Profile
                        </button>
                        <button className="px-3 py-1.5 text-xs font-medium rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors">
                          Manage Campaigns
                        </button>
                        <button className="px-3 py-1.5 text-xs font-medium rounded-full bg-amber-400 text-white hover:bg-amber-500 transition-colors">
                          View Earnings
                        </button>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" className="h-10 px-4 rounded-lg">
                    Manage
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {tab === "analytics" && (
            <div className="space-y-6">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  Analytics
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Performance metrics across all campaigns
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <Card className="p-6 rounded-xl shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-medium text-gray-500">
                        Total Views
                      </div>
                      <div className="text-3xl font-bold text-gray-900 mt-2">
                        {(() => {
                          const v = (analytics as any)?.kpis?.total_views ?? 0;
                          if (v >= 1_000_000)
                            return `${(v / 1_000_000).toFixed(1)}M`;
                          if (v >= 1_000) return `${Math.round(v / 1_000)}K`;
                          return String(v);
                        })()}
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        {(() => {
                          const pct = Number(
                            (analytics as any)?.kpis?.views_change_pct ?? 0,
                          );
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
                      <div className="text-xs font-medium text-gray-500">
                        Total Revenue
                      </div>
                      <div className="text-3xl font-bold text-gray-900 mt-2">
                        {fmtCents(
                          (analytics as any)?.kpis?.total_revenue_cents,
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Monthly recurring
                      </div>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </Card>
              </div>

              <Card className="p-6 rounded-xl shadow-sm">
                <div className="text-sm font-semibold text-gray-900">
                  Campaign Performance
                </div>
                <div className="mt-4 space-y-3">
                  {Array.isArray((analytics as any)?.campaigns) &&
                  (analytics as any).campaigns.length > 0 ? (
                    (analytics as any).campaigns.slice(0, 8).map((c: any) => (
                      <div
                        key={c.brand_id}
                        className="rounded-xl border border-gray-100 bg-white p-4"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-700">
                              {(
                                String(c.brand_name || "B").trim()[0] || "B"
                              ).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900 truncate">
                                {c.brand_name || "Brand"}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                AI Licensing
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-10">
                            <div>
                              <div className="text-[11px] text-gray-500">
                                Views/Week
                              </div>
                              <div className="text-sm font-semibold text-gray-900">
                                {Number(c.views_week || 0).toLocaleString()}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[11px] text-gray-500">
                                Revenue
                              </div>
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
                      No analytics metrics yet. Ask your agency to add weekly
                      view metrics.
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-6 rounded-xl shadow-sm border border-cyan-200 bg-cyan-50/30">
                <div className="text-sm font-semibold text-gray-900">
                  ROI: Traditional UGC vs AI Licensing
                </div>
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card className="p-5 rounded-xl shadow-sm">
                    <div className="text-sm font-semibold text-gray-900">
                      Traditional UGC Model
                    </div>
                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="text-gray-600">Per Post:</div>
                        <div className="font-semibold text-gray-900">
                          {fmtCents(
                            (analytics as any)?.roi?.traditional
                              ?.per_post_cents,
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-gray-600">Time Investment:</div>
                        <div className="font-semibold text-gray-900">
                          {(analytics as any)?.roi?.traditional
                            ?.time_investment || "4-6 hours"}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-gray-600">Posts/Month:</div>
                        <div className="font-semibold text-gray-900">
                          {(analytics as any)?.roi?.traditional
                            ?.posts_per_month || "5-8"}
                        </div>
                      </div>
                      <div className="pt-3 mt-3 border-t flex items-center justify-between">
                        <div className="text-gray-600 font-semibold">
                          Monthly Earnings:
                        </div>
                        <div className="font-semibold text-gray-900">
                          {(analytics as any)?.roi?.traditional
                            ?.monthly_earnings_range || "$2,500-$4,000"}
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-5 rounded-xl shadow-sm border border-green-200 bg-green-50/40">
                    <div className="text-sm font-semibold text-gray-900">
                      AI Licensing Model (You)
                    </div>
                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="text-gray-600">Per Campaign:</div>
                        <div className="font-semibold text-green-700">
                          {fmtCents(
                            (analytics as any)?.roi?.ai?.per_campaign_cents,
                          )}
                          /mo
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-gray-600">Time Investment:</div>
                        <div className="font-semibold text-green-700">
                          {(analytics as any)?.roi?.ai?.time_investment ||
                            "0 hours/month"}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-gray-600">Active Campaigns:</div>
                        <div className="font-semibold text-green-700">
                          {(analytics as any)?.roi?.ai?.active_campaigns ??
                            (analytics as any)?.kpis?.active_campaigns ??
                            0}
                        </div>
                      </div>
                      <div className="pt-3 mt-3 border-t flex items-center justify-between">
                        <div className="text-gray-600 font-semibold">
                          Monthly Earnings:
                        </div>
                        <div className="font-semibold text-green-700">
                          {fmtCents(
                            (analytics as any)?.roi?.ai?.monthly_earnings_cents,
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                <div className="mt-4 rounded-lg bg-white border border-cyan-200 px-4 py-3 text-sm text-gray-700">
                  {(analytics as any)?.roi?.message ||
                    "Your earnings comparison will appear here."}
                </div>
              </Card>
            </div>
          )}

          {tab === "messages" && (
            <div className="space-y-6">
              <div>
                <div className="text-2xl font-bold text-gray-900">Messages</div>
                <div className="text-sm text-gray-600 mt-1">
                  Your agency notifications inbox
                </div>
              </div>
              <div className="w-[240px]">
                <Select
                  value={selectedAgencyId}
                  onValueChange={setSelectedAgencyId}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="All agencies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All agencies</SelectItem>
                    {connectedAgencyIds.map((id) => (
                      <SelectItem key={id} value={id}>
                        {agencyNameById.get(id) || id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Card className="p-6 rounded-xl shadow-sm">
                <div className="text-sm font-semibold text-gray-900">
                  Communication Hub
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Email notifications sent by your agency
                </div>

                <div className="mt-5 space-y-3">
                  {filteredNotifications.length > 0 ? (
                    filteredNotifications.map((n: any) => {
                      const id = String(n.id);
                      const from = n.from_label || agencyName || "Agency";
                      const subject = n.subject || "Notification";
                      const msg =
                        typeof n.message === "string" ? n.message : "";
                      const preview =
                        msg.split("\n").filter(Boolean)[0] || msg.slice(0, 80);
                      const unread = !n.read_at;
                      const ts = n.created_at
                        ? new Date(n.created_at).toLocaleString()
                        : "";

                      return (
                        <button
                          key={id}
                          className={`w-full text-left rounded-xl border p-4 transition-colors ${
                            unread
                              ? "bg-blue-50/60 border-blue-200 hover:bg-blue-50"
                              : "bg-white border-gray-100 hover:bg-gray-50"
                          }`}
                          onClick={() => {
                            if (unread && !markReadMutation.isPending) {
                              markReadMutation.mutate(id);
                            }
                          }}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900 truncate">
                                {from}
                              </div>
                              <div className="text-xs text-gray-600 truncate">
                                {subject}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {unread && (
                                <Badge className="bg-blue-600 text-white border-0">
                                  New
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="mt-2 text-xs text-gray-600 truncate">
                            {preview}
                          </div>
                          <div className="mt-2 text-[11px] text-gray-500">
                            {ts}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-sm text-gray-600">
                      No messages yet.
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {tab === "settings" && (
            <div className="space-y-6">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  Portal Settings
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Configure your talent portal preferences
                </div>
              </div>

              <Card className="p-6 rounded-xl shadow-sm">
                <div className="text-sm font-semibold text-gray-900">
                  Payment Preferences
                </div>

                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        Tax Documentation
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {(w9Doc as any)?.id && (w9Doc as any)?.created_at
                          ? `W-9 on file • Updated ${new Date((w9Doc as any).created_at).toLocaleDateString()}`
                          : "No W-9 on file"}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="mt-4 w-full h-10"
                      disabled={!(tax1099Doc as any)?.public_url}
                      onClick={() => {
                        const url = (tax1099Doc as any)?.public_url;
                        if (url) window.open(url, "_blank");
                      }}
                    >
                      Download 1099 ({taxYear})
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="p-6 rounded-xl shadow-sm">
                <div className="text-sm font-semibold text-gray-900">
                  Privacy Controls
                </div>

                <div className="mt-4 space-y-3">
                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        Data Usage for Training
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Allow anonymized data for AI model improvement
                      </div>
                    </div>
                    <Switch
                      checked={!!(portalSettings as any)?.allow_training}
                      onCheckedChange={(checked: boolean) =>
                        updatePortalSettingsMutation.mutate({
                          allow_training: checked,
                        })
                      }
                      disabled={updatePortalSettingsMutation.isPending}
                    />
                  </div>

                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        Public Profile Visibility
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Show in marketplace search results
                      </div>
                    </div>
                    <Switch
                      checked={
                        (portalSettings as any)?.public_profile_visible ===
                        undefined
                          ? true
                          : !!(portalSettings as any)?.public_profile_visible
                      }
                      onCheckedChange={(checked: boolean) =>
                        updatePortalSettingsMutation.mutate({
                          public_profile_visible: checked,
                        })
                      }
                      disabled={updatePortalSettingsMutation.isPending}
                    />
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
                <span className="text-[17px] font-bold text-[#1A1C1E]">
                  Talent Portal
                </span>
              </div>
              <button
                className="p-1.5 hover:bg-gray-50 rounded-lg transition-colors group"
                onClick={() => navigate("/CreatorDashboard")}
                aria-label="Back to Dashboard"
                title="Back to Dashboard"
              >
                <svg
                  className="h-4 w-4 text-gray-400 group-hover:text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            </div>

            {/* Profile Section */}
            <div className="p-6 border-b border-gray-50">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full p-0.5 border-2 border-[#32C8D1] overflow-hidden flex-shrink-0">
                  <div className="h-full w-full rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                    {profilePhotoUrl ? (
                      <img
                        src={profilePhotoUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-7 w-7 text-gray-400" />
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-[17px] font-bold text-[#1A1C1E] truncate leading-tight">
                    {talentName}
                  </div>
                  <div className="text-[14px] text-gray-500 truncate mt-0.5">
                    {email || ""}
                  </div>
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
