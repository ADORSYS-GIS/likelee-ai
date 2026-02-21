import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Filter,
  X,
  Loader2,
  Globe,
  ShieldCheck,
  User,
  Image as ImageIcon,
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
import { useToast } from "@/components/ui/use-toast";

export type MarketplaceProfile = {
  id: string;
  profile_type: "creator";
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
  connection_status?: "none" | "pending" | "connected" | "declined";
  updated_at?: string | null;
};

type MarketplaceProfileDetails = {
  profile_type: "creator";
  profile: Record<string, any> | null;
  availability: Record<string, any>;
  rates: Array<Record<string, any>>;
  portfolio: Array<Record<string, any>>;
  campaigns: Array<Record<string, any>>;
  connection_status: "none" | "pending" | "connected";
};

type MarketplaceSectionProps = {
  title?: string;
  subtitle?: string;
  verifiedBadgeLabel?: string;
  searchPlaceholder?: string;
  searchEndpoint?: string;
  connectEndpoint?: string;
  detailsEndpointBuilder?: (profileType: "creator", id: string) => string;
  queryScope?: string;
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

const parseApiErrorMessage = (error: any, fallback: string) => {
  const parsed = parseApiErrorPayload(error);
  const message = parsed.message || parsed.raw;
  if (parsed.code === "23505" || /already exists/i.test(message)) {
    return "Connection request already exists. Waiting for creator response.";
  }
  if (/^(GET|POST|PUT|PATCH|DELETE)\s/i.test(message)) {
    return fallback;
  }
  return message || fallback;
};

export function MarketplaceSection({
  title = "Likelee Marketplace",
  subtitle = "Verified creators only",
  verifiedBadgeLabel = "Verified Profiles",
  searchPlaceholder = "Search by name, role, bio, or skills...",
  searchEndpoint = "marketplace/search",
  connectEndpoint = "marketplace/connect",
  detailsEndpointBuilder = (profileType, id) =>
    `marketplace/${profileType}/${id}/details`,
  queryScope = "scouting-marketplace",
}: MarketplaceSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [pendingConnectKeys, setPendingConnectKeys] = useState<Set<string>>(
    new Set(),
  );
  const [selectedProfile, setSelectedProfile] = useState<MarketplaceProfile | null>(
    null,
  );
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | "models" | "actors" | "influencers" | "athletes"
  >("all");
  const [profileType, setProfileType] = useState<
    "all" | "creator" | "connected" | "waiting"
  >("all");
  const [sortBy, setSortBy] = useState<"recent" | "name" | "followers">(
    "followers",
  );

  const activeFilterCount =
    Number(categoryFilter !== "all") +
    Number(profileType !== "all") +
    Number(sortBy !== "followers");
  const hasActiveFilters = activeFilterCount > 0;
  const marketplaceSelectItemClass =
    "rounded-lg py-2.5 pl-3 pr-8 text-[15px] font-medium text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:text-slate-700 data-[state=checked]:bg-blue-50 data-[state=checked]:text-blue-700";
  const debouncedSearch = useDebounce(searchInput, 300);
  const detailsOpen = !!selectedProfile;

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

  const marketplaceQuery = useQuery({
    queryKey: [queryScope, profileType, debouncedSearch.trim().toLowerCase()],
    queryFn: async () =>
      await base44.get<MarketplaceProfile[]>(searchEndpoint, {
        params: {
          profile_type:
            profileType === "connected" || profileType === "waiting"
              ? "all"
              : profileType,
          query: debouncedSearch.trim() || undefined,
          limit: 120,
        },
      }),
    staleTime: 60_000,
  });

  const detailsQuery = useQuery({
    queryKey: [
      `${queryScope}-details`,
      selectedProfile?.profile_type,
      selectedProfile?.id,
    ],
    queryFn: async () =>
      await base44.get<MarketplaceProfileDetails>(
        detailsEndpointBuilder(
          "creator",
          selectedProfile?.id || "",
        ),
      ),
    enabled: !!selectedProfile,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!marketplaceQuery.error) return;
    toast({
      title: "Failed to load marketplace profiles",
      description: parseApiErrorMessage(marketplaceQuery.error, "Please try again."),
      variant: "destructive" as any,
    });
  }, [marketplaceQuery.error, toast]);

  useEffect(() => {
    if (!detailsQuery.error) return;
    toast({
      title: "Failed to load profile details",
      description: parseApiErrorMessage(detailsQuery.error, "Please try again."),
      variant: "destructive" as any,
    });
  }, [detailsQuery.error, toast]);

  const profiles = useMemo(() => {
    const rows = Array.isArray(marketplaceQuery.data) ? marketplaceQuery.data : [];

    const normalized = rows.map((row: any) => ({
      id: String(row?.id || Math.random().toString(36).slice(2)),
      profile_type: "creator",
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
        row?.connection_status === "pending" ||
        row?.connection_status === "declined"
          ? row.connection_status
          : "none",
      updated_at: row?.updated_at ?? null,
    })) as MarketplaceProfile[];

    const matchesCategory = (profile: MarketplaceProfile) => {
      if (categoryFilter === "all") return true;
      if (profile.profile_type !== "creator") return false;
      const creatorType = String(profile.creator_type || "").toLowerCase();
      if (categoryFilter === "models") return creatorType.includes("model");
      if (categoryFilter === "actors") return creatorType.includes("actor");
      if (categoryFilter === "influencers")
        return creatorType.includes("influencer");
      if (categoryFilter === "athletes") return creatorType.includes("athlete");
      return true;
    };

    const filtered = normalized.filter(matchesCategory).filter((profile) => {
      if (profileType === "connected") return !!profile.is_connected;
      if (profileType === "waiting")
        return (
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
  }, [marketplaceQuery.data, categoryFilter, profileType, sortBy]);

  return (
    <Card className="p-8 bg-white border border-gray-200 shadow-sm rounded-3xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500 font-medium">{subtitle}</p>
        </div>
        <Badge className="h-10 px-4 rounded-lg bg-green-50 text-green-700 border border-green-200">
          <ShieldCheck className="w-4 h-4 mr-2" />
          {verifiedBadgeLabel}
        </Badge>
      </div>

      <div className="flex flex-col gap-6">
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
            Filters
            {hasActiveFilters && (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-[11px] font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
            {hasActiveFilters && (
              <span
                role="button"
                aria-label="Reset all filters"
                className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSearchInput("");
                  setCategoryFilter("all");
                  setProfileType("all");
                  setSortBy("followers");
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
                Filter Options
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  onClick={() => {
                    setCategoryFilter("all");
                    setProfileType("all");
                    setSortBy("followers");
                  }}
                >
                  Reset filters
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <Select
                value={categoryFilter}
                onValueChange={(v) =>
                  setCategoryFilter(
                    (v as
                      | "all"
                      | "models"
                      | "actors"
                      | "influencers"
                      | "athletes") || "all",
                  )
                }
              >
                <SelectTrigger className="h-10 w-[190px] border-blue-300 bg-white rounded-lg text-sm font-medium text-slate-800 focus:ring-blue-300 focus:border-blue-400">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-blue-100 bg-white p-1 shadow-xl">
                  <SelectItem className={marketplaceSelectItemClass} value="all">
                    All Categories
                  </SelectItem>
                  <SelectItem className={marketplaceSelectItemClass} value="models">
                    Models
                  </SelectItem>
                  <SelectItem className={marketplaceSelectItemClass} value="actors">
                    Actors
                  </SelectItem>
                  <SelectItem
                    className={marketplaceSelectItemClass}
                    value="influencers"
                  >
                    Influencers
                  </SelectItem>
                  <SelectItem
                    className={marketplaceSelectItemClass}
                    value="athletes"
                  >
                    Athletes
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={profileType}
                onValueChange={(v) =>
                  setProfileType(
                    (v as "all" | "creator" | "connected" | "waiting") ||
                      "all",
                  )
                }
              >
                <SelectTrigger className="h-10 w-[190px] border-blue-300 bg-white rounded-lg text-sm font-medium text-slate-800 focus:ring-blue-300 focus:border-blue-400">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-blue-100 bg-white p-1 shadow-xl">
                  <SelectItem className={marketplaceSelectItemClass} value="all">
                    All
                  </SelectItem>
                  <SelectItem className={marketplaceSelectItemClass} value="creator">
                    Verified Creators
                  </SelectItem>
                  <SelectItem className={marketplaceSelectItemClass} value="connected">
                    Connected
                  </SelectItem>
                  <SelectItem className={marketplaceSelectItemClass} value="waiting">
                    Waiting
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={sortBy}
                onValueChange={(v) =>
                  setSortBy((v as "recent" | "name" | "followers") || "followers")
                }
              >
                <SelectTrigger className="h-10 w-[190px] border-blue-300 bg-white rounded-lg text-sm font-medium text-slate-800 focus:ring-blue-300 focus:border-blue-400">
                  <SelectValue placeholder="Followers" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-blue-100 bg-white p-1 shadow-xl">
                  <SelectItem className={marketplaceSelectItemClass} value="followers">
                    Followers
                  </SelectItem>
                  <SelectItem className={marketplaceSelectItemClass} value="name">
                    Name
                  </SelectItem>
                  <SelectItem className={marketplaceSelectItemClass} value="recent">
                    Recently Updated
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
              Loading verified marketplace profiles...
            </p>
          </div>
        ) : profiles.length === 0 ? (
          <div className="border border-dashed border-gray-200 rounded-2xl p-20 flex flex-col items-center justify-center text-center mt-4">
            <div className="p-5 bg-gray-50 rounded-full mb-5">
              <Globe className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              No verified profiles found
            </h3>
            <p className="text-gray-500 max-w-md font-medium">
              Try adjusting your search terms or filters to discover more creators.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 mt-2">
            {profiles.map((profile) => {
              const profileKey = `${profile.profile_type}:${profile.id}`;
              const isPendingConnect = pendingConnectKeys.has(profileKey);
              const connectionStatus: "none" | "pending" | "connected" | "declined" =
                profile.is_connected
                  ? "connected"
                  : isPendingConnect
                    ? "pending"
                    : profile.connection_status === "pending" ||
                        profile.connection_status === "connected" ||
                        profile.connection_status === "declined"
                      ? profile.connection_status
                      : profile.is_pending
                        ? "pending"
                        : "none";
              const disableConnectAction = connectionStatus !== "none";
              const followers = Number(profile.followers || 0);
              const engagement = Number(profile.engagement_rate || 0);
              const roleLabel = `Verified Creator${profile.creator_type ? ` • ${profile.creator_type}` : ""}`;

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
                        className="w-full aspect-[4/3] object-cover bg-slate-100"
                      />
                    ) : (
                      <div className="w-full aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                        <User className="w-9 h-9 text-slate-400" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 top-0 p-1.5 flex items-center justify-between">
                      <Badge className="h-5 px-2 rounded-md bg-white/90 text-slate-700 border border-slate-200 text-[10px] font-semibold shadow-sm">
                        Creator
                      </Badge>
                      <div className="flex items-center gap-1.5">
                        {profile.is_connected && (
                          <Badge className="h-5 px-2 rounded-md bg-blue-50/95 text-blue-700 border border-blue-200 text-[10px] font-semibold shadow-sm">
                            Connected
                          </Badge>
                        )}
                        {!profile.is_connected && connectionStatus === "pending" && (
                          <Badge className="h-5 px-2 rounded-md bg-amber-50/95 text-amber-700 border border-amber-200 text-[10px] font-semibold shadow-sm">
                            Waiting
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
                      <p className="text-xs text-slate-400 min-h-[32px]">No bio available yet.</p>
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

                    <div className="grid grid-cols-2 gap-1.5 mt-2">
                      <div className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1">
                        <p className="text-slate-500 text-[11px] font-medium">Followers</p>
                        <p className="text-slate-900 text-sm font-bold mt-0.5 leading-none">
                          {followers > 0 ? followers.toLocaleString() : "N/A"}
                        </p>
                      </div>
                      <div className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1">
                        <p className="text-slate-500 text-[11px] font-medium">Engagement</p>
                        <p className="text-slate-900 text-sm font-bold mt-0.5 leading-none">
                          {engagement > 0 ? `${engagement.toFixed(1)}%` : "N/A"}
                        </p>
                      </div>
                    </div>

                    {connectionStatus !== "connected" && (
                      <div className="mt-2.5 flex items-center gap-2">
                        <Button
                          className={`h-6 px-2 text-xs rounded-md ${
                            connectionStatus === "pending"
                              ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-50"
                              : connectionStatus === "declined"
                                ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-50"
                                : "bg-indigo-600 hover:bg-indigo-700 text-white"
                          }`}
                          disabled={disableConnectAction}
                          onClick={async (e) => {
                            // Prevent card click from opening details when pressing connect.
                            e.stopPropagation();
                            try {
                              const result: any = await base44.post(connectEndpoint, {
                                profile_type: profile.profile_type,
                                target_id: profile.id,
                              });
                              const status = String(result?.status || "pending");
                              if (status === "declined") {
                                toast({
                                  title: "Request already declined",
                                  description:
                                    "This connection was declined previously. Please contact the creator directly to reconnect.",
                                });
                              } else if (status === "connected") {
                                toast({
                                  title: "Already connected",
                                  description: "This profile is already in your network.",
                                });
                              } else {
                                toast({
                                  title: "Connection request sent",
                                  description:
                                    "Waiting for creator response. You will be notified after they accept or decline.",
                                });
                                setPendingConnectKeys((prev) => new Set(prev).add(profileKey));
                              }
                              await queryClient.invalidateQueries({ queryKey: [queryScope] });
                              if (selectedProfile?.id === profile.id) {
                                await detailsQuery.refetch();
                              }
                            } catch (e: any) {
                              const parsed = parseApiErrorPayload(e);
                              const isDuplicate =
                                parsed.code === "23505" ||
                                /already exists/i.test(parsed.message || parsed.raw);
                              if (isDuplicate) {
                                setPendingConnectKeys((prev) => new Set(prev).add(profileKey));
                                toast({
                                  title: "Request already pending",
                                  description:
                                    "Waiting for creator response. You can track updates in Agency Connection.",
                                });
                                await queryClient.invalidateQueries({
                                  queryKey: [queryScope],
                                });
                                return;
                              }
                              toast({
                                title: "Failed to send connection request",
                                description: parseApiErrorMessage(
                                  e,
                                  "Unable to send connection request right now.",
                                ),
                                variant: "destructive" as any,
                              });
                            }
                          }}
                        >
                          {connectionStatus === "pending"
                            ? "Waiting for creator response"
                            : connectionStatus === "declined"
                              ? "Declined"
                              : "Connect"}
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Sheet
        open={detailsOpen}
        onOpenChange={(open) => {
          if (!open) setSelectedProfile(null);
        }}
      >
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {selectedProfile?.display_name || "Marketplace Profile"}
            </SheetTitle>
            <SheetDescription>
              Availability, rates, portfolio, and campaign history
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            {detailsQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading profile details...
              </div>
            ) : (
              <>
                {(() => {
                  const profile = (detailsQuery.data?.profile || {}) as Record<
                    string,
                    any
                  >;
                  const openToWork = Array.isArray(profile?.content_types)
                    ? profile.content_types
                    : [];
                  const industries = Array.isArray(profile?.industries)
                    ? profile.industries
                    : [];
                  const baseRateCents = Number(
                    profile?.base_monthly_price_cents || 0,
                  );
                  const rateCurrency = String(profile?.currency_code || "USD");
                  const openToNegotiations = !!profile?.accept_negotiations;

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
                      </div>
                      <p className="text-xs font-medium text-slate-500">
                        {selectedProfile?.location || "Location not specified"}
                      </p>
                      <p className="text-sm text-slate-600 mt-3 line-clamp-3 min-h-[60px]">
                        {selectedProfile?.tagline ||
                          selectedProfile?.bio ||
                          "No profile summary available yet."}
                      </p>
                      <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                        <div className="rounded-lg border border-slate-100 bg-white/80 px-3 py-2">
                          <p className="text-slate-500 font-medium">Followers</p>
                          <p className="text-slate-900 font-bold mt-0.5">
                            {Number(selectedProfile?.followers || 0) > 0
                              ? Number(selectedProfile?.followers || 0).toLocaleString()
                              : "N/A"}
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-100 bg-white/80 px-3 py-2">
                          <p className="text-slate-500 font-medium">Engagement</p>
                          <p className="text-slate-900 font-bold mt-0.5">
                            {Number(selectedProfile?.engagement_rate || 0) > 0
                              ? `${Number(selectedProfile?.engagement_rate || 0).toFixed(1)}%`
                              : "N/A"}
                          </p>
                        </div>
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

                <Card className="p-4 border border-gray-200 rounded-xl">
                  <h4 className="text-sm font-bold text-gray-900 mb-3">
                    Availability & Rates
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                      <p className="text-gray-500">Willing to Travel</p>
                      <p className="font-semibold text-gray-900 mt-1">
                        {detailsQuery.data?.availability?.willing_to_travel
                          ? "Yes"
                          : "Not specified"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                      <p className="text-gray-500">Connection Status</p>
                      <p className="font-semibold text-gray-900 mt-1 capitalize">
                        {detailsQuery.data?.connection_status || "none"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(detailsQuery.data?.rates || []).slice(0, 6).map((r, i) => (
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
                      <p className="text-sm text-gray-500">No rates published yet.</p>
                    )}
                  </div>
                </Card>

                <Card className="p-4 border border-gray-200 rounded-xl">
                  <h4 className="text-sm font-bold text-gray-900 mb-3">Portfolio</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {(detailsQuery.data?.portfolio || []).slice(0, 9).map((item, i) => (
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
                      <p className="text-sm text-gray-500">No portfolio items yet.</p>
                    )}
                  </div>
                </Card>

                <Card className="p-4 border border-gray-200 rounded-xl">
                  <h4 className="text-sm font-bold text-gray-900 mb-3">
                    Past Campaigns
                  </h4>
                  <div className="space-y-2">
                    {(detailsQuery.data?.campaigns || []).slice(0, 8).map((c, i) => (
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
                          {String(c?.campaign_type || "Type not set")} {c?.date ? `• ${String(c?.date)}` : ""}
                        </p>
                      </div>
                    ))}
                    {(detailsQuery.data?.campaigns || []).length === 0 && (
                      <p className="text-sm text-gray-500">No campaign history yet.</p>
                    )}
                  </div>
                </Card>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  );
}

export default MarketplaceSection;
