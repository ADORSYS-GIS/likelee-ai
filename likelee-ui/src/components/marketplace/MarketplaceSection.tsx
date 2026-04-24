import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Search,
  Filter,
  X,
  Loader2,
  Globe,
  ShieldCheck,
  Lock,
  Building2,
  User,
  Image as ImageIcon,
  AlertTriangle,
  ExternalLink,
  CalendarDays,
  Percent,
} from "lucide-react";

import { base44 } from "@/api/base44Client";
import { useDebounce } from "@/hooks/useDebounce";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { useToast } from "@/components/ui/use-toast";
import MarketplaceConnectContractModal from "@/components/marketplace/MarketplaceConnectContractModal";
import { useIndexedDbQuery } from "@/lib/useIndexedDbCache";
import { isDefaultPricing } from "@/utils/pricingDefaults";
import {
  approveAgencyCreatorDisconnectRequest,
  rejectAgencyCreatorDisconnectRequest,
} from "@/api/creatorAgencyConnection";
import { MarketplaceContractSummary } from "@/api/marketplaceContracts";
import { useTranslation } from "react-i18next";

export type MarketplaceProfile = {
  id: string;
  profile_type: "creator" | "agency";
  display_name: string;
  full_name?: string | null;
  location?: string | null;
  bio?: string | null;
  tagline?: string | null;
  profile_photo_url?: string | null;
  creator_type?: string | null;
  skills?: string[] | null;
  followers?: number | null;
  engagement_rate?: number | null;
  is_connected?: boolean;
  is_pending?: boolean;
  connection_status?:
    | "none"
    | "waiting"
    | "pending"
    | "connected"
    | "declined"
    | "disconnected";
  updated_at?: string | null;
  talent_ownership?: "agency_owned" | "regular" | null;
  marketplace_contract?: MarketplaceContractSummary | null;
  agency_id?: string | null;
  is_licensable?: boolean;
};

export type MarketplaceProfileDetails = {
  profile_type: "creator" | "agency";
  profile: Record<string, any> | null;
  availability: Record<string, any>;
  rates: Array<Record<string, any>>;
  portfolio: Array<Record<string, any>>;
  campaigns: Array<Record<string, any>>;
  agency_id?: string | null;
  is_licensable?: boolean;
  represented_agency?: {
    id?: string | null;
    name?: string | null;
    logo_url?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
  } | null;
  connection_status:
    | "none"
    | "waiting"
    | "pending"
    | "connected"
    | "declined"
    | "disconnected";
  marketplace_contract?: MarketplaceContractSummary | null;
};

type MarketplaceSectionProps = {
  entityType?: "creator" | "agency";
  title?: string;
  subtitle?: string;
  verifiedBadgeLabel?: string;
  searchPlaceholder?: string;
  searchEndpoint?: string;
  connectEndpoint?: string;
  resultLimit?: number;
  detailsEndpointBuilder?: (
    profileType: "creator" | "agency",
    id: string,
  ) => string;
  queryScope?: string;
  showRequestLicense?: boolean;
  onRequestLicense?: (
    profile: MarketplaceProfile,
    details?: MarketplaceProfileDetails,
  ) => void;
  actionsLocked?: boolean;
  lockedTitle?: string;
  lockedDescription?: string;
  lockedCtaLabel?: string;
  onLockedAction?: () => void;
  enableAgencyContractConnect?: boolean;
  connectLocked?: boolean;
  connectLockedReason?: string;
  onConnectLocked?: () => void;
  translationPrefix?: string;
};

const parseApiErrorPayload = (error: any) => {
  const raw = String(error?.message || "");
  const payloads: any[] = [];
  if (error && typeof error === "object") payloads.push(error);
  if (error?.response && typeof error.response === "object") {
    payloads.push(error.response);
  }
  if (error?.response?.data) payloads.push(error.response.data);

  let parsedFromMessage: any = null;
  if (raw) {
    try {
      parsedFromMessage = JSON.parse(raw);
    } catch {
      const idx = raw.indexOf("{");
      if (idx >= 0) {
        try {
          parsedFromMessage = JSON.parse(raw.slice(idx));
        } catch {}
      }
    }
  }
  if (parsedFromMessage) payloads.push(parsedFromMessage);

  for (const p of payloads) {
    if (!p || typeof p !== "object") continue;
    const body = p?.data && typeof p.data === "object" ? p.data : p;
    const code = String(body?.code || "").trim();
    const errorMsg = String(body?.error || "").trim();
    const details = String(body?.details || "").trim();
    const message = errorMsg || details || "";
    if (message || code) {
      return { code, message, raw };
    }
  }
  return { code: "", message: "", raw };
};

const parseApiErrorMessage = (
  error: any,
  fallback: string,
  waitingLabel = "creator",
) => {
  const parsed = parseApiErrorPayload(error);
  const message = parsed.message || parsed.raw;
  if (parsed.code === "23505" || /already exists/i.test(message)) {
    return `Connection request already exists. Waiting for ${waitingLabel} response.`;
  }
  // Always keep connection-request failures UX-safe; never surface raw backend errors.
  return fallback;
};

export function MarketplaceSection({
  entityType = "creator",
  title = "Likelee Marketplace",
  subtitle = "Verified creators only",
  verifiedBadgeLabel = "Verified Profiles",
  searchPlaceholder = "Search by name, role, bio, or skills...",
  searchEndpoint = "marketplace/search",
  connectEndpoint = "marketplace/connect",
  resultLimit = 120,
  detailsEndpointBuilder = (profileType, id) =>
    `marketplace/${profileType}/${id}/details`,
  queryScope = "scouting-marketplace",
  showRequestLicense = false,
  onRequestLicense,
  actionsLocked = false,
  lockedTitle = "Preview only",
  lockedDescription = "Upgrade to unlock connections and licensing actions.",
  lockedCtaLabel = "Upgrade",
  onLockedAction,
  enableAgencyContractConnect = false,
  connectLocked = false,
  connectLockedReason = "",
  onConnectLocked,
  translationPrefix = "agencyDashboard.marketplace",
}: MarketplaceSectionProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const entityLabel = entityType === "agency" ? "agency" : "creator";
  const entityLabelTitle = entityType === "agency" ? "Agency" : "Creator";
  const entityLabelTranslated = t(
    `agencyDashboard.marketplace.entities.${entityLabel}`,
    { defaultValue: entityLabel },
  );
  const entityLabelTitleTranslated = t(
    `agencyDashboard.marketplace.entities.${entityLabel.toLowerCase()}Title`,
    { defaultValue: entityLabelTitle },
  );
  const [searchInput, setSearchInput] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [pendingConnectKeys, setPendingConnectKeys] = useState<Set<string>>(
    new Set(),
  );
  const [requestingConnectKeys, setRequestingConnectKeys] = useState<
    Set<string>
  >(new Set());
  const [selectedProfile, setSelectedProfile] =
    useState<MarketplaceProfile | null>(null);
  const [contractConnectProfile, setContractConnectProfile] =
    useState<MarketplaceProfile | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [profileType, setProfileType] = useState<
    "all" | "creator" | "agency" | "connected" | "waiting"
  >("all");
  const [disconnectDecision, setDisconnectDecision] = useState<
    null | "approve" | "reject"
  >(null);
  const [disconnectActionLoading, setDisconnectActionLoading] = useState<
    null | "approve" | "reject"
  >(null);
  const [sortBy, setSortBy] = useState<"recent" | "name" | "followers">(
    entityType === "agency" ? "recent" : "followers",
  );

  const activeFilterCount =
    Number(categoryFilter !== "all") +
    Number(profileType !== "all") +
    Number(sortBy !== (entityType === "agency" ? "recent" : "followers"));
  const hasActiveFilters = activeFilterCount > 0;
  const marketplaceSelectItemClass =
    "rounded-lg py-2.5 pl-3 pr-8 text-[15px] font-medium text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:text-slate-700 data-[state=checked]:bg-blue-50 data-[state=checked]:text-blue-700";
  const debouncedSearch = useDebounce(searchInput, 300);
  const detailsOpen = !!selectedProfile;
  const lockedHighlights =
    entityType === "agency"
      ? [
          t(`${translationPrefix}.locked.highlights.connectAgencies`, {
            defaultValue: "Connect with agencies",
          }),
          t(`${translationPrefix}.locked.highlights.collaboratorWorkflows`, {
            defaultValue: "Unlock collaborator workflows",
          }),
          t(`${translationPrefix}.locked.highlights.campaignHandoff`, {
            defaultValue: "Launch full campaign handoff",
          }),
        ]
      : [
          t(`${translationPrefix}.locked.highlights.connectCreators`, {
            defaultValue: "Connect with creators",
          }),
          t(`${translationPrefix}.locked.highlights.requestLicenses`, {
            defaultValue: "Request licenses",
          }),
          t(`${translationPrefix}.locked.highlights.collaboratorWorkflows`, {
            defaultValue: "Unlock collaborator workflows",
          }),
        ];
  const selectedProfileId = String(selectedProfile?.id || "").trim();
  const selectedProfileType = selectedProfile?.profile_type || entityType;
  const canFetchDetails = detailsOpen && selectedProfileId.length > 0;
  const isDisconnectBusy = disconnectActionLoading !== null;
  const getConnectionStatusLabel = (
    status:
      | "none"
      | "waiting"
      | "pending"
      | "connected"
      | "declined"
      | "disconnected",
  ) =>
    t(`agencyDashboard.marketplace.status.${status}`, {
      defaultValue:
        status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " "),
    });
  const getOwnershipLabel = (ownership: "agency_owned" | "regular") =>
    t(`agencyDashboard.marketplace.ownership.${ownership}`, {
      defaultValue: ownership === "agency_owned" ? "Agency-Owned" : "Regular",
    });

  const formatMoney = (amountCents: any, currency: any = "USD") => {
    const n = Number(amountCents || 0);
    if (!isFinite(n) || n <= 0) return "N/A";
    const value = n / 100;
    const c = String(currency || "USD").toUpperCase();
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: c,
        maximumFractionDigits: 0,
      }).format(value);
    } catch {
      return `$${value.toFixed(0)}`;
    }
  };

  const marketplaceQuery = useIndexedDbQuery<MarketplaceProfile[]>({
    queryKey: [
      queryScope,
      entityType,
      profileType,
      debouncedSearch.trim().toLowerCase(),
    ],
    queryFn: async () =>
      await base44.get<MarketplaceProfile[]>(searchEndpoint, {
        params: {
          profile_type:
            profileType === "connected" || profileType === "waiting"
              ? "all"
              : profileType,
          entity_type: entityType,
          query: debouncedSearch.trim() || undefined,
          limit: resultLimit,
        },
      }),
    maxAge: 60 * 1000, // 1 minute
    syncInterval: 60 * 1000, // Sync every minute
    staleWhileRevalidate: true,
  });

  const detailsQuery = useIndexedDbQuery<MarketplaceProfileDetails>({
    queryKey: [`${queryScope}-details`, selectedProfileType, selectedProfileId],
    queryFn: async () => {
      if (!canFetchDetails) {
        throw new Error("Missing marketplace profile id for details request.");
      }
      return await base44.get<MarketplaceProfileDetails>(
        detailsEndpointBuilder(selectedProfileType, selectedProfileId),
      );
    },
    maxAge: 5 * 60 * 1000, // 5 minutes
    syncInterval: 5 * 60 * 1000,
    staleWhileRevalidate: true,
    enabled: canFetchDetails,
  });
  const detailProfile = detailsQuery.data?.profile || null;
  const representedAgency = detailsQuery.data?.represented_agency || null;
  const effectiveLicensingAgencyId = String(
    selectedProfile?.agency_id ||
      detailsQuery.data?.agency_id ||
      detailProfile?.agency_id ||
      "",
  ).trim();
  const representedAgencyName = String(
    representedAgency?.name || "Represented Agency",
  ).trim();
  const representedAgencyLogo = String(
    representedAgency?.logo_url || "",
  ).trim();
  const representedAgencyLocation = [
    representedAgency?.city,
    representedAgency?.state,
    representedAgency?.country,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(", ");
  const selectedCreatorIsLicensable =
    selectedProfile?.profile_type === "creator" &&
    Boolean(
      effectiveLicensingAgencyId &&
      (selectedProfile?.is_licensable !== false ||
        detailsQuery.data?.is_licensable === true ||
        detailProfile?.is_licensable === true),
    );

  useEffect(() => {
    if (!marketplaceQuery.error) return;
    toast({
      title: t(`${translationPrefix}.toasts.loadFailedTitle`, {
        defaultValue: "Failed to load marketplace profiles",
      }),
      description: parseApiErrorMessage(
        marketplaceQuery.error,
        t(`${translationPrefix}.toasts.tryAgain`, {
          defaultValue: "Please try again.",
        }),
        entityLabel,
      ),
      variant: "destructive" as any,
    });
  }, [marketplaceQuery.error, toast, entityLabel]);

  const profiles = useMemo(() => {
    const rows = Array.isArray(marketplaceQuery.data)
      ? marketplaceQuery.data
      : [];

    const normalized = rows.map((row: any) => ({
      id: String(row?.id || Math.random().toString(36).slice(2)),
      profile_type: row?.profile_type === "agency" ? "agency" : "creator",
      display_name: String(row?.display_name || row?.full_name || "Unknown"),
      full_name: row?.full_name ?? null,
      location: row?.location ?? null,
      bio: row?.bio ?? null,
      tagline: row?.tagline ?? null,
      profile_photo_url: row?.profile_photo_url ?? null,
      creator_type: row?.creator_type ?? null,
      skills: Array.isArray(row?.skills) ? row.skills : [],
      followers:
        typeof row?.followers === "number"
          ? row.followers
          : Number(row?.followers || 0),
      engagement_rate:
        typeof row?.engagement_rate === "number"
          ? row.engagement_rate
          : Number(row?.engagement_rate || 0),
      is_connected: !!row?.is_connected,
      is_pending: !!row?.is_pending,
      connection_status:
        row?.connection_status === "connected" ||
        row?.connection_status === "waiting" ||
        row?.connection_status === "pending" ||
        row?.connection_status === "declined"
          ? row.connection_status
          : "none",
      updated_at: row?.updated_at ?? null,
      talent_ownership:
        row?.talent_ownership === "agency_owned" ||
        row?.talent_ownership === "regular"
          ? row.talent_ownership
          : null,
      marketplace_contract:
        row?.marketplace_contract &&
        typeof row.marketplace_contract === "object"
          ? row.marketplace_contract
          : null,
    })) as MarketplaceProfile[];

    const creatorCategories = ["models", "actors", "influencers", "athletes"];
    const agencyCategories = ["talent_agency", "sports_agency"];

    const matchesCategory = (profile: MarketplaceProfile) => {
      if (categoryFilter === "all") return true;
      if (profile.profile_type !== entityType) return false;
      const creatorType = String(profile.creator_type || "").toLowerCase();
      if (
        entityType === "agency" &&
        agencyCategories.includes(categoryFilter)
      ) {
        return creatorType === categoryFilter;
      }
      if (
        entityType === "creator" &&
        !creatorCategories.includes(categoryFilter)
      ) {
        return true;
      }
      if (categoryFilter === "models") return creatorType.includes("model");
      if (categoryFilter === "actors") return creatorType.includes("actor");
      if (categoryFilter === "influencers")
        return creatorType.includes("influencer");
      if (categoryFilter === "athletes") return creatorType.includes("athlete");
      return true;
    };

    const filtered = normalized.filter(matchesCategory).filter((profile) => {
      if (profile.profile_type !== entityType) return false;
      if (profileType === "connected") return !!profile.is_connected;
      if (profileType === "waiting")
        return (
          profile.connection_status === "waiting" ||
          profile.connection_status === "pending" ||
          profile.is_pending === true
        );
      return true;
    });

    if (sortBy === "name") {
      return [...filtered].sort((a, b) =>
        a.display_name.localeCompare(b.display_name),
      );
    }

    if (sortBy === "followers") {
      return [...filtered].sort(
        (a, b) => Number(b.followers || 0) - Number(a.followers || 0),
      );
    }

    return [...filtered].sort((a, b) =>
      String(b.updated_at || "").localeCompare(String(a.updated_at || "")),
    );
  }, [marketplaceQuery.data, categoryFilter, profileType, sortBy, entityType]);

  return (
    <Card className="p-8 bg-white border border-gray-200 shadow-sm rounded-3xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500 font-medium">{subtitle}</p>
        </div>
        {verifiedBadgeLabel?.trim() ? (
          <Badge className="h-10 px-4 rounded-lg bg-green-50 text-green-700 border border-green-200">
            <ShieldCheck className="w-4 h-4 mr-2" />
            {verifiedBadgeLabel}
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-col gap-6">
        {actionsLocked && (
          <div className="relative overflow-hidden rounded-[28px] border border-[#F3C46B] bg-[linear-gradient(135deg,#FFF8E6_0%,#FFF2D8_40%,#FFE2B3_100%)] px-5 py-5 shadow-[0_22px_55px_rgba(247,183,80,0.18)] ring-1 ring-[#FFE7BA]">
            <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[#F7B750]/20 blur-3xl" />
            <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#F7B750] via-[#F5A623] to-[#F2994A]" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="mt-1 inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white text-[#C46A00] shadow-sm">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <Badge className="border border-[#F5D497] bg-white/80 text-[#B86B05] hover:bg-white/80">
                    {t(`${translationPrefix}.locked.previewMode`, {
                      defaultValue: "Preview mode",
                    })}
                  </Badge>
                  <p className="mt-3 text-lg font-bold tracking-tight text-[#7A3D00]">
                    {lockedTitle}
                  </p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#9A5608]">
                    {lockedDescription}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {lockedHighlights.map((item) => (
                      <Badge
                        key={item}
                        className="border border-[#F4D29B] bg-white/75 text-[#A56310] hover:bg-white/75"
                      >
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 lg:min-w-[220px]">
                <Button
                  className="h-11 rounded-2xl bg-[#F7B750] text-white shadow-[0_12px_24px_rgba(247,183,80,0.28)] hover:bg-[#E6A640] disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => onLockedAction?.()}
                  disabled={!onLockedAction}
                >
                  {lockedCtaLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <p className="text-center text-xs font-semibold text-[#B16B12]">
                  {t(`${translationPrefix}.locked.previewFootnote`, {
                    defaultValue:
                      "Visible in preview. Pro makes every action live.",
                  })}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 w-full">
          <div className="relative w-full md:max-w-4xl">
            <Search className="w-4 h-4 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 border-blue-200 bg-white rounded-lg pl-9 focus-visible:ring-blue-300"
            />
          </div>
          <Button
            className={`h-9 px-3 rounded-lg text-sm font-medium shadow-sm transition-colors ${
              hasActiveFilters
                ? "bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
                : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-50"
            } ${showFilters ? "border-indigo-500" : ""} ${
              showFilters ? "ring-1 ring-indigo-200" : ""
            }`}
            onClick={() => setShowFilters((prev) => !prev)}
          >
            <Filter
              className={`w-3.5 h-3.5 mr-1.5 ${
                showFilters
                  ? "text-indigo-600"
                  : hasActiveFilters
                    ? "text-indigo-600"
                    : "text-slate-500"
              }`}
            />
            {t(`${translationPrefix}.filters.button`, {
              defaultValue: "Filters",
            })}
            {hasActiveFilters && (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-[11px] font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
            {hasActiveFilters && (
              <span
                role="button"
                aria-label={t(`${translationPrefix}.filters.resetAllAria`, {
                  defaultValue: "Reset all filters",
                })}
                className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSearchInput("");
                  setCategoryFilter("all");
                  setProfileType("all");
                  setSortBy(entityType === "agency" ? "recent" : "followers");
                }}
              >
                <X className="h-3 w-3" />
              </span>
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {t(`${translationPrefix}.filters.optionsTitle`, {
                  defaultValue: "Filter Options",
                })}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  onClick={() => {
                    setCategoryFilter("all");
                    setProfileType("all");
                    setSortBy(entityType === "agency" ? "recent" : "followers");
                  }}
                >
                  {t(`${translationPrefix}.filters.reset`, {
                    defaultValue: "Reset filters",
                  })}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <Select
                value={categoryFilter}
                onValueChange={(v) => setCategoryFilter(v || "all")}
              >
                <SelectTrigger className="h-10 w-[190px] border-blue-300 bg-white rounded-lg text-sm font-medium text-slate-800 focus:ring-blue-300 focus:border-blue-400">
                  <SelectValue
                    placeholder={t(
                      `${translationPrefix}.filters.allCategories`,
                      {
                        defaultValue: "All Categories",
                      },
                    )}
                  />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-blue-100 bg-white p-1 shadow-xl">
                  <SelectItem
                    className={marketplaceSelectItemClass}
                    value="all"
                  >
                    {t(`${translationPrefix}.filters.allCategories`, {
                      defaultValue: "All Categories",
                    })}
                  </SelectItem>
                  {entityType === "creator" ? (
                    <>
                      <SelectItem
                        className={marketplaceSelectItemClass}
                        value="models"
                      >
                        {t(`${translationPrefix}.categories.models`, {
                          defaultValue: "Models",
                        })}
                      </SelectItem>
                      <SelectItem
                        className={marketplaceSelectItemClass}
                        value="actors"
                      >
                        {t(`${translationPrefix}.categories.actors`, {
                          defaultValue: "Actors",
                        })}
                      </SelectItem>
                      <SelectItem
                        className={marketplaceSelectItemClass}
                        value="influencers"
                      >
                        {t(`${translationPrefix}.categories.influencers`, {
                          defaultValue: "Influencers",
                        })}
                      </SelectItem>
                      <SelectItem
                        className={marketplaceSelectItemClass}
                        value="athletes"
                      >
                        {t(`${translationPrefix}.categories.athletes`, {
                          defaultValue: "Athletes",
                        })}
                      </SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem
                        className={marketplaceSelectItemClass}
                        value="talent_agency"
                      >
                        {t(`${translationPrefix}.categories.talentAgencies`, {
                          defaultValue: "Talent Agencies",
                        })}
                      </SelectItem>
                      <SelectItem
                        className={marketplaceSelectItemClass}
                        value="sports_agency"
                      >
                        {t(`${translationPrefix}.categories.sportsAgencies`, {
                          defaultValue: "Sports Agencies",
                        })}
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              <Select
                value={profileType}
                onValueChange={(v) =>
                  setProfileType(
                    (v as
                      | "all"
                      | "creator"
                      | "agency"
                      | "connected"
                      | "waiting") || "all",
                  )
                }
              >
                <SelectTrigger className="h-10 w-[190px] border-blue-300 bg-white rounded-lg text-sm font-medium text-slate-800 focus:ring-blue-300 focus:border-blue-400">
                  <SelectValue
                    placeholder={t(`${translationPrefix}.filters.all`, {
                      defaultValue: "All",
                    })}
                  />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-blue-100 bg-white p-1 shadow-xl">
                  <SelectItem
                    className={marketplaceSelectItemClass}
                    value="all"
                  >
                    {t(`${translationPrefix}.filters.all`, {
                      defaultValue: "All",
                    })}
                  </SelectItem>
                  <SelectItem
                    className={marketplaceSelectItemClass}
                    value={entityType}
                  >
                    {entityType === "agency"
                      ? t(`${translationPrefix}.filters.verifiedAgencies`, {
                          defaultValue: "Verified Agencies",
                        })
                      : t(`${translationPrefix}.filters.verifiedCreators`, {
                          defaultValue: "Verified Creators",
                        })}
                  </SelectItem>
                  <SelectItem
                    className={marketplaceSelectItemClass}
                    value="connected"
                  >
                    {t(`${translationPrefix}.filters.connected`, {
                      defaultValue: "Connected",
                    })}
                  </SelectItem>
                  <SelectItem
                    className={marketplaceSelectItemClass}
                    value="waiting"
                  >
                    {t(`${translationPrefix}.filters.waiting`, {
                      defaultValue: "Waiting",
                    })}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={sortBy}
                onValueChange={(v) =>
                  setSortBy(
                    (v as "recent" | "name" | "followers") ||
                      (entityType === "agency" ? "recent" : "followers"),
                  )
                }
              >
                <SelectTrigger className="h-10 w-[190px] border-blue-300 bg-white rounded-lg text-sm font-medium text-slate-800 focus:ring-blue-300 focus:border-blue-400">
                  <SelectValue
                    placeholder={
                      entityType === "agency"
                        ? t(`${translationPrefix}.sort.recent`, {
                            defaultValue: "Recently Updated",
                          })
                        : t(`${translationPrefix}.sort.followers`, {
                            defaultValue: "Followers",
                          })
                    }
                  />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-blue-100 bg-white p-1 shadow-xl">
                  {entityType === "creator" && (
                    <SelectItem
                      className={marketplaceSelectItemClass}
                      value="followers"
                    >
                      {t(`${translationPrefix}.sort.followers`, {
                        defaultValue: "Followers",
                      })}
                    </SelectItem>
                  )}
                  <SelectItem
                    className={marketplaceSelectItemClass}
                    value="name"
                  >
                    {t(`${translationPrefix}.sort.name`, {
                      defaultValue: "Name",
                    })}
                  </SelectItem>
                  <SelectItem
                    className={marketplaceSelectItemClass}
                    value="recent"
                  >
                    {t(`${translationPrefix}.sort.recent`, {
                      defaultValue: "Recently Updated",
                    })}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {marketplaceQuery.isLoading ? (
          <div className="border border-dashed border-gray-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center mt-4">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin mb-4" />
            <p className="text-sm text-gray-500 font-medium">
              {t(`${translationPrefix}.states.loadingProfiles`, {
                entityLabel,
                defaultValue: "Loading verified {{entityLabel}}s...",
              })}
            </p>
          </div>
        ) : profiles.length === 0 ? (
          <div className="border border-dashed border-gray-200 rounded-2xl p-20 flex flex-col items-center justify-center text-center mt-4">
            <div className="p-5 bg-gray-50 rounded-full mb-5">
              <Globe className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {t(`${translationPrefix}.states.noProfilesTitle`, {
                defaultValue: "No verified profiles found",
              })}
            </h3>
            <p className="text-gray-500 max-w-md font-medium">
              {t(`${translationPrefix}.states.noProfilesDescription`, {
                role:
                  entityType === "agency"
                    ? t(`${translationPrefix}.roles.agencies`, {
                        defaultValue: "agencies",
                      })
                    : t(`${translationPrefix}.roles.creators`, {
                        defaultValue: "creators",
                      }),
                defaultValue:
                  "Try adjusting your search terms or filters to discover more {{role}}.",
              })}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-y-6 gap-x-4 mt-2">
            {profiles.map((profile) => {
              const profileKey = `${profile.profile_type}:${profile.id}`;
              const isPendingConnect = pendingConnectKeys.has(profileKey);
              const isRequestingConnect = requestingConnectKeys.has(profileKey);
              const connectionStatus:
                | "none"
                | "waiting"
                | "pending"
                | "connected"
                | "declined" = profile.is_connected
                ? "connected"
                : isPendingConnect
                  ? "waiting"
                  : profile.connection_status === "waiting" ||
                      profile.connection_status === "pending" ||
                      profile.connection_status === "connected" ||
                      profile.connection_status === "declined"
                    ? profile.connection_status
                    : profile.is_pending
                      ? "waiting"
                      : "none";
              const disableConnectAction =
                connectionStatus === "waiting" ||
                connectionStatus === "pending" ||
                isRequestingConnect ||
                connectLocked;
              const followers = Number(profile.followers || 0);
              const engagement = Number(profile.engagement_rate || 0);
              const roleLabel = `${t(`${translationPrefix}.labels.verified`, {
                defaultValue: "Verified",
              })} ${entityLabelTitleTranslated}${profile.creator_type ? ` • ${profile.creator_type}` : ""}`;
              const ownershipLabel =
                profile.profile_type === "creator" &&
                profile.talent_ownership === "agency_owned"
                  ? getOwnershipLabel("agency_owned")
                  : profile.profile_type === "creator"
                    ? getOwnershipLabel("regular")
                    : null;
              const ownershipBadgeClass =
                profile.talent_ownership === "agency_owned"
                  ? "bg-violet-50/95 text-violet-700 border-violet-200"
                  : "bg-slate-50/95 text-slate-700 border-slate-200";
              const hasPendingDisconnect =
                String(
                  profile.marketplace_contract?.disconnect_status || "",
                ).toLowerCase() === "pending";

              return (
                <Card
                  key={profile.id}
                  className="group w-full overflow-hidden border border-slate-200 rounded-lg bg-white hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => setSelectedProfile(profile)}
                >
                  <div className="relative">
                    {profile.profile_photo_url ? (
                      <img
                        src={profile.profile_photo_url}
                        alt={profile.display_name}
                        className="w-full aspect-[3/4] object-cover object-center bg-slate-100"
                      />
                    ) : (
                      <div className="w-full aspect-[3/4] bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                        <User className="w-9 h-9 text-slate-400" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 top-0 p-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {/* Agency-owned badge removed as per request */}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {hasPendingDisconnect && (
                          <div className="h-5 w-5 rounded-md bg-rose-50/95 border border-rose-200 shadow-sm flex items-center justify-center">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          </div>
                        )}
                        {profile.is_connected && (
                          <Badge className="h-5 px-2 rounded-md bg-blue-50/95 text-blue-700 border border-blue-200 text-[10px] font-semibold shadow-sm">
                            {t(`${translationPrefix}.statuses.connected`, {
                              defaultValue: "Connected",
                            })}
                          </Badge>
                        )}
                        {!profile.is_connected &&
                          (connectionStatus === "waiting" ||
                            connectionStatus === "pending") && (
                            <Badge className="h-5 px-2 rounded-md bg-amber-50/95 text-amber-700 border border-amber-200 text-[10px] font-semibold shadow-sm">
                              {t(`${translationPrefix}.statuses.waiting`, {
                                defaultValue: "Waiting",
                              })}
                            </Badge>
                          )}
                        {!profile.is_connected &&
                          connectionStatus === "declined" && (
                            <Badge className="h-5 px-2 rounded-md bg-rose-50/95 text-rose-700 border border-rose-200 text-[10px] font-semibold shadow-sm">
                              {t(`${translationPrefix}.statuses.declined`, {
                                defaultValue: "Declined",
                              })}
                            </Badge>
                          )}
                        <div className="h-5 w-5 rounded-md bg-white/90 border border-slate-200 shadow-sm flex items-center justify-center">
                          <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                        </div>
                      </div>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-slate-950/65 via-slate-900/20 to-transparent">
                      <h3 className="text-sm font-bold text-white truncate">
                        {profile.display_name}
                      </h3>
                      <p className="text-[11px] text-white/90 font-medium mt-0.5 truncate">
                        {roleLabel}
                      </p>
                      {profile.location && (
                        <p className="text-[11px] text-white/80 mt-0.5 truncate">
                          {profile.location}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-2.5">
                    {(profile.tagline || profile.bio) && (
                      <p className="text-xs text-slate-600 line-clamp-2 min-h-[32px]">
                        {profile.tagline || profile.bio}
                      </p>
                    )}
                    {!(profile.tagline || profile.bio) && (
                      <p className="text-xs text-slate-400 min-h-[32px]">
                        {t(`${translationPrefix}.states.noBio`, {
                          defaultValue: "No bio available yet.",
                        })}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      {(profile.skills || []).slice(0, 2).map((skill) => (
                        <Badge
                          key={skill}
                          variant="secondary"
                          className="text-[11px] bg-slate-100 text-slate-700 border-0"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>

                    <div
                      className={`grid gap-1.5 mt-2 ${
                        entityType === "agency" ? "grid-cols-2" : "grid-cols-1"
                      }`}
                    >
                      <div className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1">
                        <p className="text-slate-500 text-[11px] font-medium">
                          {entityType === "agency"
                            ? t(`${translationPrefix}.card.agencyType`, {
                                defaultValue: "Agency Type",
                              })
                            : t(`${translationPrefix}.card.followers`, {
                                defaultValue: "Followers",
                              })}
                        </p>
                        <p className="text-slate-900 text-sm font-bold mt-0.5 leading-none">
                          {entityType === "agency"
                            ? profile.creator_type || "N/A"
                            : followers > 0
                              ? followers.toLocaleString()
                              : "N/A"}
                        </p>
                      </div>
                      {entityType === "agency" && (
                        <div className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1">
                          <p className="text-slate-500 text-[11px] font-medium">
                            {t(`${translationPrefix}.card.services`, {
                              defaultValue: "Services",
                            })}
                          </p>
                          <p className="text-slate-900 text-sm font-bold mt-0.5 leading-none">
                            {(profile.skills || []).length || "N/A"}
                          </p>
                        </div>
                      )}
                    </div>

                    {connectionStatus !== "connected" && (
                      <div className="mt-2.5 flex items-center gap-2">
                        <Button
                          className={`h-6 px-2 text-xs rounded-md ${
                            actionsLocked
                              ? "bg-slate-900 hover:bg-slate-800 text-white"
                              : connectionStatus === "waiting" ||
                                  connectionStatus === "pending"
                                ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-50"
                                : "bg-indigo-600 hover:bg-indigo-700 text-white"
                          }`}
                          disabled={
                            actionsLocked
                              ? !onLockedAction ||
                                connectionStatus === "waiting" ||
                                connectionStatus === "pending"
                              : disableConnectAction
                          }
                          onClick={async (e) => {
                            // Prevent card click from opening details when pressing connect.
                            e.stopPropagation();
                            if (actionsLocked) {
                              onLockedAction?.();
                              return;
                            }
                            if (connectLocked) {
                              onConnectLocked?.();
                              return;
                            }
                            if (isRequestingConnect) return;
                            setRequestingConnectKeys((prev) =>
                              new Set(prev).add(profileKey),
                            );
                            try {
                              if (
                                enableAgencyContractConnect &&
                                profile.profile_type === "creator"
                              ) {
                                setRequestingConnectKeys((prev) => {
                                  const next = new Set(prev);
                                  next.delete(profileKey);
                                  return next;
                                });
                                setContractConnectProfile(profile);
                                return;
                              }

                              const result: any = await base44.post(
                                connectEndpoint,
                                {
                                  profile_type: profile.profile_type,
                                  target_id: profile.id,
                                },
                              );
                              const status = String(
                                result?.status || "waiting",
                              );
                              if (status === "declined") {
                                toast({
                                  title: t(
                                    `${translationPrefix}.toasts.requestAlreadyDeclinedTitle`,
                                    {
                                      defaultValue: "Request already declined",
                                    },
                                  ),
                                  description: t(
                                    `${translationPrefix}.toasts.requestAlreadyDeclinedDescription`,
                                    {
                                      entityLabel:
                                        entityLabelTranslated.toLowerCase(),
                                      defaultValue:
                                        "This connection was declined previously. You can re-invite this {{entityLabel}}.",
                                    },
                                  ),
                                });
                              } else if (status === "connected") {
                                toast({
                                  title: t(
                                    `${translationPrefix}.toasts.alreadyConnectedTitle`,
                                    {
                                      defaultValue: "Already connected",
                                    },
                                  ),
                                  description: t(
                                    `${translationPrefix}.toasts.alreadyConnectedDescription`,
                                    {
                                      defaultValue:
                                        "This profile is already in your network.",
                                    },
                                  ),
                                });
                              } else {
                                toast({
                                  title: t(
                                    `${translationPrefix}.toasts.connectionRequestSentTitle`,
                                    {
                                      defaultValue: "Connection request sent",
                                    },
                                  ),
                                  description: t(
                                    `${translationPrefix}.toasts.connectionRequestSentDescription`,
                                    {
                                      entityLabel:
                                        entityLabelTranslated.toLowerCase(),
                                      defaultValue:
                                        "Waiting for {{entityLabel}} response. You will be notified after they accept or decline.",
                                    },
                                  ),
                                });
                                setPendingConnectKeys((prev) =>
                                  new Set(prev).add(profileKey),
                                );
                              }
                              await queryClient.invalidateQueries({
                                queryKey: [queryScope],
                              });
                              if (selectedProfile?.id === profile.id) {
                                await detailsQuery.refetch();
                              }
                            } catch (e: any) {
                              const parsed = parseApiErrorPayload(e);
                              const isDuplicate =
                                parsed.code === "23505" ||
                                /already exists/i.test(
                                  parsed.message || parsed.raw,
                                );
                              if (isDuplicate) {
                                setPendingConnectKeys((prev) =>
                                  new Set(prev).add(profileKey),
                                );
                                toast({
                                  title: t(
                                    `${translationPrefix}.toasts.requestPendingTitle`,
                                    {
                                      defaultValue: "Request already pending",
                                    },
                                  ),
                                  description: t(
                                    `${translationPrefix}.toasts.requestPendingDescription`,
                                    {
                                      entityLabel:
                                        entityLabelTranslated.toLowerCase(),
                                      defaultValue:
                                        "Waiting for {{entityLabel}} response.",
                                    },
                                  ),
                                });
                                await queryClient.invalidateQueries({
                                  queryKey: [queryScope],
                                });
                                return;
                              }
                              toast({
                                title: t(
                                  `${translationPrefix}.toasts.failedConnectionRequestTitle`,
                                  {
                                    defaultValue:
                                      "Failed to send connection request",
                                  },
                                ),
                                description: parseApiErrorMessage(
                                  e,
                                  t(
                                    `${translationPrefix}.toasts.failedConnectionRequestDescription`,
                                    {
                                      defaultValue:
                                        "Unable to send connection request right now.",
                                    },
                                  ),
                                  entityLabelTranslated.toLowerCase(),
                                ),
                                variant: "destructive" as any,
                              });
                            } finally {
                              setRequestingConnectKeys((prev) => {
                                const next = new Set(prev);
                                next.delete(profileKey);
                                return next;
                              });
                            }
                          }}
                        >
                          {isRequestingConnect
                            ? t(`${translationPrefix}.actions.sending`, {
                                defaultValue: "Sending...",
                              })
                            : actionsLocked || connectLocked
                              ? t(
                                  `${translationPrefix}.actions.upgradeToConnect`,
                                  {
                                    defaultValue: "Upgrade to Connect",
                                  },
                                )
                              : connectionStatus === "pending" ||
                                  connectionStatus === "waiting"
                                ? t(
                                    `${translationPrefix}.actions.waitingForResponse`,
                                    {
                                      entityLabel:
                                        entityLabelTranslated.toLowerCase(),
                                      defaultValue:
                                        "Waiting for {{entityLabel}} response",
                                    },
                                  )
                                : t(`${translationPrefix}.actions.connect`, {
                                    defaultValue: "Connect",
                                  })}
                        </Button>
                        {connectLockedReason ? (
                          <span className="text-[10px] font-semibold text-amber-700">
                            {connectLockedReason}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <MarketplaceConnectContractModal
        open={!!contractConnectProfile}
        profile={contractConnectProfile}
        onClose={() => setContractConnectProfile(null)}
        onSuccess={(contract) => {
          if (!contractConnectProfile) return;
          const profileKey = `${contractConnectProfile.profile_type}:${contractConnectProfile.id}`;
          setPendingConnectKeys((prev) => new Set(prev).add(profileKey));
          toast({
            title: t(`${translationPrefix}.toasts.contractSentTitle`, {
              defaultValue: "Contract sent",
            }),
            description: contract?.agency_sign_url
              ? t(
                  `${translationPrefix}.toasts.contractSentWithLinkDescription`,
                  {
                    defaultValue:
                      "The contract has been sent for signature and the agency signing link opened in a new tab.",
                  },
                )
              : t(`${translationPrefix}.toasts.contractSentDescription`, {
                  defaultValue: "The contract has been sent for signature.",
                }),
          });
          queryClient.invalidateQueries({
            queryKey: [queryScope],
          });
        }}
      />

      <Sheet
        open={detailsOpen}
        onOpenChange={(open) => {
          if (isDisconnectBusy) return;
          if (!open) setSelectedProfile(null);
        }}
      >
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {isDisconnectBusy ? (
            <div className="absolute inset-0 z-50 bg-white/75 backdrop-blur-[1px] flex items-center justify-center">
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm text-sm font-medium text-slate-700">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-600" />
                {t(`${translationPrefix}.details.processingDisconnect`, {
                  defaultValue: "Processing disconnect request...",
                })}
              </div>
            </div>
          ) : null}
          <SheetHeader>
            <SheetTitle>
              {selectedProfile?.display_name ||
                t(`${translationPrefix}.details.marketplaceProfile`, {
                  defaultValue: "Marketplace Profile",
                })}
            </SheetTitle>
            <SheetDescription>
              {selectedProfile?.profile_type === "agency"
                ? t(`${translationPrefix}.details.agencyDescription`, {
                    defaultValue: "Agency profile and connection status",
                  })
                : t(`${translationPrefix}.details.creatorDescription`, {
                    defaultValue:
                      "Availability, rates, portfolio, and campaign history",
                  })}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            {detailsQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t(`${translationPrefix}.details.loading`, {
                  defaultValue: "Loading profile details...",
                })}
              </div>
            ) : detailsQuery.error ? (
              <Card className="p-4 border border-rose-200 bg-rose-50 rounded-xl">
                <div className="text-sm font-semibold text-rose-900">
                  {t(`${translationPrefix}.details.loadFailedTitle`, {
                    defaultValue: "Failed to load profile details",
                  })}
                </div>
                <div className="text-sm text-rose-800 mt-1">
                  {parseApiErrorMessage(
                    detailsQuery.error,
                    t(`${translationPrefix}.details.tryAgain`, {
                      defaultValue: "Please try again.",
                    }),
                    entityLabelTranslated.toLowerCase(),
                  )}
                </div>
              </Card>
            ) : (
              <>
                {(() => {
                  const profile = (detailsQuery.data?.profile || {}) as Record<
                    string,
                    any
                  >;
                  const marketplaceContract =
                    detailsQuery.data?.marketplace_contract ||
                    selectedProfile?.marketplace_contract ||
                    null;
                  const pendingDisconnect =
                    String(
                      marketplaceContract?.disconnect_status || "",
                    ).toLowerCase() === "pending";
                  const openToWork = Array.isArray(profile?.content_types)
                    ? profile.content_types
                    : [];
                  const industries = Array.isArray(profile?.industries)
                    ? profile.industries
                    : [];
                  const rawBaseRateCents = Number(
                    profile?.base_monthly_price_cents || 0,
                  );
                  const baseRateCents = isDefaultPricing(profile)
                    ? 0
                    : rawBaseRateCents;
                  const rateCurrency = String(profile?.currency_code || "USD");
                  const openToNegotiations = !!profile?.accept_negotiations;
                  const isAgencyProfile =
                    selectedProfile?.profile_type === "agency";

                  if (isAgencyProfile) {
                    const services = Array.isArray(profile?.services_offered)
                      ? profile.services_offered
                      : Array.isArray(selectedProfile?.skills)
                        ? selectedProfile.skills
                        : [];
                    return (
                      <Card className="p-4 border border-gray-200 rounded-xl">
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-bold text-gray-900 mb-2">
                              Services
                            </h4>
                            {services.length ? (
                              <div className="flex flex-wrap gap-2">
                                {services.map((tag: string) => (
                                  <Badge
                                    key={tag}
                                    className="bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100"
                                  >
                                    {String(tag)}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">
                                No services shared yet.
                              </p>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                              <p className="text-gray-500">Website</p>
                              <p className="font-semibold text-gray-900 mt-1 break-all">
                                {profile?.website || "Not specified"}
                              </p>
                            </div>
                            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                              <p className="text-gray-500">Connection Status</p>
                              <p className="font-semibold text-gray-900 mt-1 capitalize">
                                {detailsQuery.data?.connection_status || "none"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  }

                  return (
                    <>
                      <Card className="p-4 border border-gray-200 rounded-xl">
                        <div className="space-y-5">
                          <div>
                            <h4 className="text-sm font-bold text-gray-900 mb-2">
                              Open to work
                            </h4>
                            {openToWork.length ? (
                              <div className="flex flex-wrap gap-2">
                                {openToWork.map((tag: string) => (
                                  <Badge
                                    key={tag}
                                    className="bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100"
                                  >
                                    {String(tag)}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">
                                No open-work preferences shared yet.
                              </p>
                            )}
                          </div>

                          <div>
                            <h4 className="text-sm font-bold text-gray-900 mb-2">
                              Industries
                            </h4>
                            {industries.length ? (
                              <div className="flex flex-wrap gap-2">
                                {industries.map((tag: string) => (
                                  <Badge
                                    key={tag}
                                    variant="secondary"
                                    className="bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100"
                                  >
                                    {String(tag)}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">
                                No industries shared yet.
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>

                      <Card className="p-4 border border-cyan-100 bg-cyan-50/50 rounded-xl">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-bold text-gray-900">
                              Licensing rate
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">
                              Base rate from public profile
                            </p>
                            <p className="text-xs text-emerald-700 mt-2 font-medium">
                              {openToNegotiations
                                ? "Open to negotiations"
                                : "Negotiation preferences not specified"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-cyan-600">
                              {baseRateCents > 0
                                ? formatMoney(baseRateCents, rateCurrency)
                                : "N/A"}
                            </p>
                            <p className="text-xs text-gray-500">/month</p>
                          </div>
                        </div>
                      </Card>
                    </>
                  );
                })()}

                <Card className="overflow-hidden border border-slate-200 rounded-xl">
                  <div className="grid grid-cols-1 md:grid-cols-12">
                    <div className="md:col-span-7 p-5 bg-gradient-to-br from-cyan-50 via-white to-indigo-50/50">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-lg font-bold text-slate-900 truncate">
                          {selectedProfile?.display_name || "Profile"}
                        </h4>
                        <Badge className="h-5 px-2 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                          Verified
                        </Badge>
                        {/* Regular/Agency-Owned badge removed to keep layout clean */}
                      </div>
                      <p className="text-xs font-medium text-slate-500">
                        {selectedProfile?.location || "Location not specified"}
                      </p>
                      <p className="text-sm text-slate-600 mt-3 break-words whitespace-pre-line">
                        {selectedProfile?.tagline ||
                          selectedProfile?.bio ||
                          "No profile summary available yet."}
                      </p>
                      <div
                        className={`grid gap-3 mt-4 text-xs ${
                          selectedProfile?.profile_type === "agency"
                            ? "grid-cols-2"
                            : "grid-cols-1"
                        }`}
                      >
                        <div className="rounded-lg border border-slate-100 bg-white/80 px-3 py-2">
                          <p className="text-slate-500 font-medium">
                            {selectedProfile?.profile_type === "agency"
                              ? "Agency Type"
                              : "Followers"}
                          </p>
                          <p className="text-slate-900 font-bold mt-0.5">
                            {selectedProfile?.profile_type === "agency"
                              ? selectedProfile?.creator_type || "N/A"
                              : Number(selectedProfile?.followers || 0) > 0
                                ? Number(
                                    selectedProfile?.followers || 0,
                                  ).toLocaleString()
                                : "N/A"}
                          </p>
                        </div>
                        {selectedProfile?.profile_type === "agency" && (
                          <div className="rounded-lg border border-slate-100 bg-white/80 px-3 py-2">
                            <p className="text-slate-500 font-medium">
                              Services
                            </p>
                            <p className="text-slate-900 font-bold mt-0.5">
                              {(selectedProfile?.skills || []).length || "N/A"}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="md:col-span-5 relative min-h-[260px]">
                      {selectedProfile?.profile_photo_url ? (
                        <img
                          src={selectedProfile.profile_photo_url}
                          alt={selectedProfile?.display_name || "Profile image"}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                          <User className="w-14 h-14 text-slate-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent" />
                      <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-cyan-100/45 to-transparent" />
                    </div>
                  </div>
                </Card>

                {selectedProfile?.profile_type === "creator" && (
                  <>
                    {(() => {
                      const marketplaceContract =
                        detailsQuery.data?.marketplace_contract ||
                        selectedProfile?.marketplace_contract ||
                        null;
                      const pendingDisconnect =
                        String(
                          marketplaceContract?.disconnect_status || "",
                        ).toLowerCase() === "pending";

                      return enableAgencyContractConnect &&
                        marketplaceContract ? (
                        <Card
                          className={`p-4 rounded-xl ${
                            pendingDisconnect
                              ? "border-rose-200 bg-rose-50/60"
                              : "border-gray-200"
                          }`}
                        >
                          <div className="flex flex-col gap-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h4 className="text-sm font-bold text-gray-900">
                                  Marketplace contract
                                </h4>
                                <p className="text-xs text-gray-500 mt-1">
                                  Contract terms for this agency-creator
                                  connection.
                                </p>
                              </div>
                              {pendingDisconnect ? (
                                <Badge className="bg-rose-100 text-rose-700 border border-rose-200">
                                  Creator requested disconnect
                                </Badge>
                              ) : null}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                                <div className="flex items-center gap-2 text-gray-500">
                                  <Percent className="w-3 h-3" />
                                  Commission
                                </div>
                                <p className="font-semibold text-gray-900 mt-1">
                                  {Number(
                                    marketplaceContract?.commission_rate || 0,
                                  ).toFixed(2)}
                                  %
                                </p>
                              </div>
                              <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                                <div className="text-gray-500">Status</div>
                                <p className="font-semibold text-gray-900 mt-1 capitalize">
                                  {String(
                                    marketplaceContract?.status || "unknown",
                                  ).replaceAll("_", " ")}
                                </p>
                              </div>
                              <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                                <div className="flex items-center gap-2 text-gray-500">
                                  <CalendarDays className="w-3 h-3" />
                                  Start date
                                </div>
                                <p className="font-semibold text-gray-900 mt-1">
                                  {marketplaceContract?.valid_from || "—"}
                                </p>
                              </div>
                              <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                                <div className="flex items-center gap-2 text-gray-500">
                                  <CalendarDays className="w-3 h-3" />
                                  End date
                                </div>
                                <p className="font-semibold text-gray-900 mt-1">
                                  {marketplaceContract?.valid_until || "—"}
                                </p>
                              </div>
                            </div>

                            {pendingDisconnect ? (
                              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
                                <div className="font-semibold">
                                  Creator is requesting disconnect
                                </div>
                                {marketplaceContract?.disconnect_reason ? (
                                  <div className="mt-2 whitespace-pre-wrap">
                                    {marketplaceContract.disconnect_reason}
                                  </div>
                                ) : (
                                  <div className="mt-2">
                                    No reason was provided.
                                  </div>
                                )}
                              </div>
                            ) : null}

                            <div className="flex flex-wrap gap-2">
                              {marketplaceContract?.signed_document_url ? (
                                <Button
                                  variant="outline"
                                  disabled={isDisconnectBusy}
                                  onClick={() =>
                                    window.open(
                                      marketplaceContract.signed_document_url ||
                                        "",
                                      "_blank",
                                      "noopener,noreferrer",
                                    )
                                  }
                                >
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  View signed contract
                                </Button>
                              ) : null}
                              {pendingDisconnect ? (
                                <>
                                  <Button
                                    className="bg-[#32C8D1] hover:bg-[#2AB8C1] text-white"
                                    disabled={isDisconnectBusy}
                                    onClick={() =>
                                      setDisconnectDecision("approve")
                                    }
                                  >
                                    Approve disconnect
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="border-rose-200 text-rose-700"
                                    disabled={isDisconnectBusy}
                                    onClick={() =>
                                      setDisconnectDecision("reject")
                                    }
                                  >
                                    Reject request
                                  </Button>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </Card>
                      ) : null;
                    })()}

                    <Card className="p-4 border border-gray-200 rounded-xl">
                      <h4 className="text-sm font-bold text-gray-900 mb-3">
                        Availability & Rates
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                          <p className="text-gray-500">Willing to Travel</p>
                          <p className="font-semibold text-gray-900 mt-1">
                            {typeof detailsQuery.data?.availability
                              ?.willing_to_travel === "boolean"
                              ? detailsQuery.data?.availability
                                  ?.willing_to_travel
                                ? "Yes"
                                : "No"
                              : "Not specified"}
                          </p>
                        </div>
                        <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                          <p className="text-gray-500">Connection Status</p>
                          <div className="flex flex-col">
                            <p className="font-semibold text-gray-900 mt-1 capitalize leading-none">
                              {detailsQuery.data?.connection_status || "none"}
                            </p>
                            {selectedProfile?.talent_ownership ===
                              "agency_owned" && (
                              <p className="text-[10px] text-indigo-600 font-semibold mt-1.5">
                                Automatically connected (Created by you)
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(detailsQuery.data?.rates || [])
                          .slice(0, 6)
                          .map((r, i) => (
                            <div
                              key={`${r?.label || r?.rate_name || "rate"}-${i}`}
                              className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-3 text-sm"
                            >
                              <p className="text-indigo-700 font-semibold">
                                {String(r?.label || r?.rate_name || "Rate")}
                              </p>
                              <p className="text-gray-900 font-bold mt-1">
                                {formatMoney(
                                  r?.amount_cents ?? r?.price_per_month_cents,
                                  r?.currency || "USD",
                                )}
                              </p>
                            </div>
                          ))}
                        {(detailsQuery.data?.rates || []).length === 0 && (
                          <p className="text-sm text-gray-500">
                            No rates published yet.
                          </p>
                        )}
                      </div>
                    </Card>
                  </>
                )}

                {selectedProfile?.profile_type === "creator" && (
                  <Card className="p-4 border border-gray-200 rounded-xl">
                    <h4 className="text-sm font-bold text-gray-900 mb-3">
                      Portfolio
                    </h4>
                    {!!detailsQuery.data?.profile?.portfolio_link && (
                      <a
                        href={String(detailsQuery.data.profile.portfolio_link)}
                        target="_blank"
                        rel="noreferrer"
                        className="mb-3 inline-flex items-center rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 hover:bg-cyan-100"
                      >
                        Open portfolio link
                      </a>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {(detailsQuery.data?.portfolio || [])
                        .slice(0, 9)
                        .map((item, i) => (
                          <a
                            key={`${item?.id || i}`}
                            href={String(item?.media_url || "#")}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border border-gray-100 p-2 bg-white hover:border-indigo-200 transition-colors"
                          >
                            <div className="aspect-square rounded-md bg-gray-100 overflow-hidden">
                              {item?.media_url ? (
                                <img
                                  src={String(item.media_url)}
                                  alt={String(item?.title || "Portfolio item")}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                                  <ImageIcon className="w-8 h-8 text-slate-400" />
                                </div>
                              )}
                            </div>
                            <p className="text-xs font-medium text-gray-700 mt-2 truncate">
                              {String(item?.title || "Portfolio")}
                            </p>
                          </a>
                        ))}
                      {(detailsQuery.data?.portfolio || []).length === 0 && (
                        <p className="text-sm text-gray-500">
                          {detailsQuery.data?.profile?.portfolio_link
                            ? "No uploaded portfolio media yet."
                            : "No portfolio items yet."}
                        </p>
                      )}
                    </div>
                  </Card>
                )}

                {selectedProfile?.profile_type === "creator" && (
                  <Card className="p-4 border border-gray-200 rounded-xl">
                    <h4 className="text-sm font-bold text-gray-900 mb-3">
                      Past Campaigns
                    </h4>
                    <div className="space-y-2">
                      {(detailsQuery.data?.campaigns || [])
                        .slice(0, 8)
                        .map((c, i) => (
                          <div
                            key={`${c?.id || i}`}
                            className="rounded-lg border border-gray-100 p-3 bg-white"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {String(c?.name || "Campaign")}
                              </p>
                              <Badge
                                variant="secondary"
                                className="text-[10px] bg-gray-100 text-gray-700"
                              >
                                {String(c?.status || "Unknown")}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {String(c?.campaign_type || "Type not set")}{" "}
                              {c?.date ? `• ${String(c?.date)}` : ""}
                            </p>
                          </div>
                        ))}
                      {(detailsQuery.data?.campaigns || []).length === 0 && (
                        <p className="text-sm text-gray-500">
                          No campaign history yet.
                        </p>
                      )}
                    </div>
                  </Card>
                )}
                {showRequestLicense &&
                  selectedProfile?.profile_type === "creator" &&
                  selectedCreatorIsLicensable && (
                    <Card className="overflow-hidden border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-amber-50 rounded-xl shadow-sm">
                      <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-12 w-12 rounded-xl border border-amber-200 bg-white shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                            {representedAgencyLogo ? (
                              <img
                                src={representedAgencyLogo}
                                alt={representedAgencyName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Building2 className="w-5 h-5 text-amber-600" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-amber-900">
                              Ready to license this talent?
                            </h4>
                            <p className="mt-1 text-sm font-semibold text-slate-900 truncate">
                              {representedAgencyName}
                            </p>
                            <p className="text-xs text-amber-700 mt-1">
                              {representedAgencyLocation
                                ? `${representedAgencyLocation} • Send your licensing request directly to this agency.`
                                : "Send your licensing request directly to this represented agency."}
                            </p>
                          </div>
                        </div>
                        <Button
                          className="bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-sm"
                          onClick={() => {
                            if (actionsLocked) {
                              onLockedAction?.();
                              return;
                            }
                            if (!selectedProfile) return;
                            onRequestLicense?.(
                              selectedProfile,
                              detailsQuery.data || undefined,
                            );
                          }}
                          disabled={actionsLocked && !onLockedAction}
                        >
                          {actionsLocked
                            ? "Upgrade to Request License"
                            : "Request License"}
                        </Button>
                      </div>
                    </Card>
                  )}
                {showRequestLicense &&
                  selectedProfile?.profile_type === "creator" &&
                  !selectedCreatorIsLicensable && (
                    <Card className="p-4 border border-slate-200 bg-slate-50 rounded-xl">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-900">
                          Licensing unavailable
                        </h4>
                        <p className="text-xs text-slate-600">
                          This creator is not currently represented by an active
                          agency roster entry, so licensing requests can’t be
                          sent from marketplace right now.
                        </p>
                      </div>
                    </Card>
                  )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={disconnectDecision !== null}
        onOpenChange={(open) => {
          if (!open) setDisconnectDecision(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {disconnectDecision === "approve"
                ? "Approve creator disconnect request?"
                : "Reject creator disconnect request?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {disconnectDecision === "approve"
                ? "This will terminate the live connection for this agency-creator pair while preserving the contract record for history."
                : "This will keep the current contract and live connection active."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDisconnectBusy}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={
                isDisconnectBusy || !selectedProfile?.id || !disconnectDecision
              }
              onClick={async () => {
                const creatorId = String(selectedProfile?.id || "").trim();
                if (!disconnectDecision || !creatorId) return;
                try {
                  setDisconnectActionLoading(disconnectDecision);
                  if (disconnectDecision === "approve") {
                    await approveAgencyCreatorDisconnectRequest(creatorId);
                    toast({
                      title: "Disconnect approved",
                      description:
                        "The creator connection has been removed for this agency.",
                    });
                  } else {
                    await rejectAgencyCreatorDisconnectRequest(creatorId);
                    toast({
                      title: "Disconnect rejected",
                      description:
                        "The creator remains connected under the active contract.",
                    });
                  }
                  await Promise.all([
                    queryClient.invalidateQueries({ queryKey: [queryScope] }),
                    queryClient.invalidateQueries({
                      queryKey: [
                        `${queryScope}-details`,
                        selectedProfileType,
                        creatorId,
                      ],
                    }),
                  ]);
                  setSelectedProfile(null);
                } catch (error: any) {
                  toast({
                    title: `Failed to ${disconnectDecision} request`,
                    description: error?.message || String(error),
                    variant: "destructive" as any,
                  });
                } finally {
                  setDisconnectActionLoading(null);
                  setDisconnectDecision(null);
                }
              }}
            >
              {disconnectActionLoading === disconnectDecision ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {disconnectDecision === "approve"
                ? disconnectActionLoading === "approve"
                  ? "Approving..."
                  : "Approve disconnect"
                : disconnectActionLoading === "reject"
                  ? "Rejecting..."
                  : "Reject request"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default MarketplaceSection;
