import React, { useMemo, useState } from "react";
import {
  BarChart2,
  Calendar,
  DollarSign,
  TrendingUp,
  Filter,
  ArrowUpDown,
  ChevronDown,
  CheckCircle2,
  FileText,
  Mail,
  Search,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { format, parseISO, isSameMonth, isSameWeek } from "date-fns";
import { useTranslation } from "react-i18next";

export const ManagementAnalyticsView = ({ bookings }: { bookings: any[] }) => {
  const { t } = useTranslation("agency");
  const [activeTab, setActiveTab] = useState(
    t("agencyDashboard.bookings.tabs.managementAnalytics.tabs.analytics"),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-indigo-600" />
            <h2 className="text-2xl font-bold text-gray-900">
              {t("agencyDashboard.bookings.tabs.managementAnalytics.title")}
            </h2>
          </div>
          <p className="text-gray-500 font-medium text-sm mt-1">
            {t("agencyDashboard.bookings.tabs.managementAnalytics.subtitle")}
          </p>
        </div>
        <div className="overflow-x-auto">
          <div className="flex bg-gray-100 p-1 rounded-lg w-max min-w-full sm:min-w-0 sm:w-fit">
            {[
              t(
                "agencyDashboard.bookings.tabs.managementAnalytics.tabs.analytics",
              ),
              t(
                "agencyDashboard.bookings.tabs.managementAnalytics.tabs.manageBookings",
              ),
              t(
                "agencyDashboard.bookings.tabs.managementAnalytics.tabs.reportsExport",
              ),
            ].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-bold rounded-md whitespace-nowrap transition-all ${
                  activeTab === tab
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab ===
        t(
          "agencyDashboard.bookings.tabs.managementAnalytics.tabs.analytics",
        ) && <ManagementAnalyticsTab bookings={bookings} />}
      {activeTab ===
        t(
          "agencyDashboard.bookings.tabs.managementAnalytics.tabs.manageBookings",
        ) && <ManageBookingsTab bookings={bookings} />}
      {activeTab ===
        t(
          "agencyDashboard.bookings.tabs.managementAnalytics.tabs.reportsExport",
        ) && <ReportsExportTab bookings={bookings} />}
    </div>
  );
};

const ManagementAnalyticsTab = ({ bookings }: { bookings: any[] }) => {
  const { t } = useTranslation("agency");
  const now = new Date();

  const safeParseDate = (v: any) => {
    if (typeof v !== "string" || v.trim().length === 0) return null;
    try {
      const d = parseISO(v);
      return isNaN(d.getTime()) ? null : d;
    } catch (_e) {
      return null;
    }
  };

  const pickString = (...vals: any[]) => {
    for (const v of vals) {
      if (typeof v === "string" && v.trim().length > 0) return v;
    }
    return "";
  };

  const normalizeType = (v: any) => {
    const raw = String(v || "")
      .trim()
      .toLowerCase();
    return raw.length > 0 ? raw : "other";
  };

  const normalizeStatus = (v: any) => {
    const raw = String(v || "")
      .trim()
      .toLowerCase();
    return raw.length > 0 ? raw : "";
  };

  const formatTypeLabel = (type: string) => {
    const t_type = normalizeType(type);
    if (t_type === "test-shoot")
      return t(
        "agencyDashboard.bookings.tabs.managementAnalytics.analytics.testShoot",
      );
    return t_type
      .split("-")
      .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
      .join(" ");
  };

  const overviewStats = useMemo(() => {
    const acc = {
      monthCount: 0,
      weekCount: 0,
      monthRevenue: 0,
      typeCounts: {} as Record<string, number>,
      castingCountMonth: 0,
      confirmedCountMonth: 0,
    };

    for (const b of bookings || []) {
      const bDate = safeParseDate(b?.date);
      if (!bDate) continue;

      const isThisMonth = isSameMonth(bDate, now);
      const isThisWeek = isSameWeek(bDate, now);
      const type = normalizeType(b?.type || b?.booking_type);
      const status = normalizeStatus(b?.status);

      if (isThisMonth) acc.monthCount++;
      if (isThisWeek) acc.weekCount++;

      acc.typeCounts[type] = (acc.typeCounts[type] || 0) + 1;

      if (isThisMonth) {
        if (type === "casting") acc.castingCountMonth++;
        if (status === "confirmed" || status === "completed")
          acc.confirmedCountMonth++;
      }

      if (isThisMonth && (status === "confirmed" || status === "completed")) {
        const cents = typeof b?.rate_cents === "number" ? b.rate_cents : 0;
        acc.monthRevenue += Math.max(0, cents) / 100;
      }
    }
    return acc;
  }, [bookings, now]);

  const totalBookings = Array.isArray(bookings) ? bookings.length : 0;

  const typeCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const b of bookings || []) {
      const t = normalizeType(b?.type || b?.booking_type);
      m[t] = (m[t] || 0) + 1;
    }
    return m;
  }, [bookings]);

  const topTalent = useMemo(() => {
    const m: Record<string, number> = {};
    for (const b of bookings || []) {
      const name = pickString(
        b?.talent_name,
        b?.talentName,
        b?.talent?.full_name,
        b?.talent?.name,
      );
      const key = name || "Unknown";
      m[key] = (m[key] || 0) + 1;
    }
    let best: { name: string; count: number } = { name: "—", count: 0 };
    for (const [name, count] of Object.entries(m)) {
      if (count > best.count) best = { name, count };
    }
    return best;
  }, [bookings]);

  const conversionPct = useMemo(() => {
    const denom =
      overviewStats.castingCountMonth + overviewStats.confirmedCountMonth;
    if (denom <= 0) return "—";
    const pct = Math.round((overviewStats.confirmedCountMonth / denom) * 100);
    return `${pct}%`;
  }, [overviewStats]);

  const stats = [
    {
      label: t(
        "agencyDashboard.bookings.tabs.managementAnalytics.analytics.thisMonth",
      ),
      value: overviewStats.monthCount.toString(),
      subtext: t(
        "agencyDashboard.bookings.tabs.managementAnalytics.analytics.totalBookings",
      ),
      icon: Calendar,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: t(
        "agencyDashboard.bookings.tabs.managementAnalytics.analytics.thisWeek",
      ),
      value: overviewStats.weekCount.toString(),
      subtext: t(
        "agencyDashboard.bookings.tabs.managementAnalytics.analytics.totalBookings",
      ),
      icon: Calendar,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: t(
        "agencyDashboard.bookings.tabs.managementAnalytics.analytics.revenue",
      ),
      value: `$${overviewStats.monthRevenue.toLocaleString()}`,
      subtext: t(
        "agencyDashboard.bookings.tabs.managementAnalytics.analytics.thisMonthLower",
      ),
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: t(
        "agencyDashboard.bookings.tabs.managementAnalytics.analytics.conversion",
      ),
      value: conversionPct,
      subtext: t(
        "agencyDashboard.bookings.tabs.managementAnalytics.analytics.thisMonthLower",
      ),
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <Card key={i} className="p-6 border shadow-sm">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${s.bg}`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500">{s.label}</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-1">
                  {s.value}
                </h3>
                <p className="text-xs text-gray-400 mt-1 font-medium">
                  {s.subtext}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="p-6 border shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">
            {t(
              "agencyDashboard.bookings.tabs.managementAnalytics.analytics.bookingsByType",
            )}
          </h3>
          <div className="space-y-4">
            {Object.entries(typeCounts).length > 0 ? (
              (Object.entries(typeCounts) as [string, number][]).map(
                ([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {formatTypeLabel(type)}
                    </span>
                    <div className="flex items-center gap-4 flex-1 mx-4">
                      <div className="h-2 flex-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            type === "confirmed"
                              ? "bg-green-500"
                              : type === "cancelled"
                                ? "bg-red-500"
                                : "bg-indigo-600"
                          }`}
                          style={{
                            width: `${totalBookings > 0 ? (count / totalBookings) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        {count}
                      </span>
                    </div>
                  </div>
                ),
              )
            ) : (
              <p className="text-sm text-gray-500">
                {t(
                  "agencyDashboard.bookings.tabs.managementAnalytics.analytics.noBookingsYet",
                )}
              </p>
            )}
          </div>
        </Card>

        <Card className="p-6 border shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">
              {t(
                "agencyDashboard.bookings.tabs.managementAnalytics.analytics.topBookedTalent",
              )}
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b last:border-0 border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-400">#1</span>
                <span className="text-sm font-bold text-gray-900">
                  {topTalent.name}
                </span>
              </div>
              <Badge variant="secondary" className="font-bold">
                {topTalent.count}{" "}
                {t(
                  "agencyDashboard.bookings.tabs.managementAnalytics.analytics.bookings",
                )}
              </Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

const ManageBookingsTab = ({ bookings }: { bookings: any[] }) => {
  const { t } = useTranslation("agency");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [rateMin, setRateMin] = useState("");
  const [rateMax, setRateMax] = useState("");
  const [sortKey, setSortKey] = useState("bookingDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const pickString = (...vals: any[]) => {
    for (const v of vals) {
      if (typeof v === "string" && v.trim().length > 0) return v;
    }
    return "";
  };

  const safeParseDate = (v: any) => {
    if (typeof v !== "string" || v.trim().length === 0) return null;
    try {
      const d = parseISO(v);
      return isNaN(d.getTime()) ? null : d;
    } catch (_e) {
      return null;
    }
  };

  const bookingRateDollars = (b: any) => {
    const cents = typeof b?.rate_cents === "number" ? b.rate_cents : 0;
    return Math.max(0, cents) / 100;
  };

  // Filter and sort bookings
  const filteredAndSortedBookings = bookings
    .filter((b) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const talentName = pickString(
          b?.talent_name,
          b?.talentName,
          b?.talent?.full_name,
          b?.talent?.name,
        );
        const clientName = pickString(b?.client_name, b?.clientName, b?.client);
        const matchesTalent = talentName.toLowerCase().includes(query);
        const matchesClient = clientName.toLowerCase().includes(query);
        const matchesLocation = (b.location || "")
          .toLowerCase()
          .includes(query);
        const matchesNotes = (b.notes || "").toLowerCase().includes(query);
        if (
          !matchesTalent &&
          !matchesClient &&
          !matchesLocation &&
          !matchesNotes
        ) {
          return false;
        }
      }

      // Date range filter
      if (dateStart && b?.date) {
        const d = safeParseDate(b.date);
        const ds = safeParseDate(dateStart);
        if (d && ds && d < ds) return false;
      }
      if (dateEnd && b?.date) {
        const d = safeParseDate(b.date);
        const de = safeParseDate(dateEnd);
        if (d && de && d > de) return false;
      }

      // Rate range filter
      const rate = bookingRateDollars(b);
      if (rateMin && rate < Number(rateMin)) return false;
      if (rateMax && rate > Number(rateMax)) return false;

      return true;
    })
    .sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortKey) {
        case "bookingDate":
          aVal = safeParseDate(a?.date)?.getTime() ?? 0;
          bVal = safeParseDate(b?.date)?.getTime() ?? 0;
          break;
        case "talentName":
          aVal = pickString(a?.talent_name, a?.talentName).toLowerCase();
          bVal = pickString(b?.talent_name, b?.talentName).toLowerCase();
          break;
        case "clientName":
          aVal = pickString(
            a?.client_name,
            a?.clientName,
            a?.client,
          ).toLowerCase();
          bVal = pickString(
            b?.client_name,
            b?.clientName,
            b?.client,
          ).toLowerCase();
          break;
        case "rateAmount":
          aVal = bookingRateDollars(a);
          bVal = bookingRateDollars(b);
          break;
        case "createdDate":
          aVal =
            safeParseDate(
              a?.created_at || a?.createdAt || a?.date,
            )?.getTime() ?? 0;
          bVal =
            safeParseDate(
              b?.created_at || b?.createdAt || b?.date,
            )?.getTime() ?? 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

  const toggleSortDirection = () => {
    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder={t(
            "agencyDashboard.bookings.tabs.managementAnalytics.manage.searchPlaceholder",
          )}
          className="pl-10 h-10 bg-white"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Card className="p-6 border shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-900" />
          <h3 className="font-bold text-gray-900">
            {t(
              "agencyDashboard.bookings.tabs.managementAnalytics.manage.filters",
            )}
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <Label className="font-bold text-xs uppercase text-gray-500 mb-3 block">
              {t(
                "agencyDashboard.bookings.tabs.managementAnalytics.manage.talent",
              )}
            </Label>
            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
              {["Emma", "Sergine", "Milan", "Julia", "Matt"].map((t) => (
                <div key={t} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`t-${t}`}
                    className="rounded border-gray-300"
                  />
                  <label
                    htmlFor={`t-${t}`}
                    className="text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    {t}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <Label className="font-bold text-xs uppercase text-gray-500 mb-3 block">
              {t(
                "agencyDashboard.bookings.tabs.managementAnalytics.manage.client",
              )}
            </Label>
            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
              {["Company", "Company", "name"].map((c, i) => (
                <div key={`${c}-${i}`} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`c-${i}`}
                    className="rounded border-gray-300"
                  />
                  <label
                    htmlFor={`c-${i}`}
                    className="text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    {c}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <Label className="font-bold text-xs uppercase text-gray-500 mb-3 block">
              {t(
                "agencyDashboard.bookings.tabs.managementAnalytics.manage.bookingType",
              )}
            </Label>
            <div className="space-y-2">
              {[
                {
                  label: t(
                    "agencyDashboard.bookings.tabs.managementAnalytics.manage.casting",
                  ),
                  value: "Casting",
                },
                {
                  label: t(
                    "agencyDashboard.bookings.tabs.managementAnalytics.manage.option",
                  ),
                  value: "Option",
                },
                {
                  label: t(
                    "agencyDashboard.bookings.tabs.managementAnalytics.manage.confirmed",
                  ),
                  value: "Confirmed",
                },
                {
                  label: t(
                    "agencyDashboard.bookings.tabs.managementAnalytics.manage.completed",
                  ),
                  value: "Completed",
                },
                {
                  label: t(
                    "agencyDashboard.bookings.tabs.managementAnalytics.manage.cancelled",
                  ),
                  value: "Cancelled",
                },
              ].map((bt) => (
                <div key={bt.value} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`bt-${bt.value}`}
                    className="rounded border-gray-300"
                  />
                  <label
                    htmlFor={`bt-${bt.value}`}
                    className="text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    {bt.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <Label className="font-bold text-xs uppercase text-gray-500 mb-3 block">
              {t(
                "agencyDashboard.bookings.tabs.managementAnalytics.manage.status",
              )}
            </Label>
            <div className="space-y-2">
              {[
                {
                  label: t(
                    "agencyDashboard.bookings.tabs.managementAnalytics.manage.pendingConfirmation",
                  ),
                  value: "Pending Confirmation",
                },
                {
                  label: t(
                    "agencyDashboard.bookings.tabs.managementAnalytics.manage.confirmed",
                  ),
                  value: "Confirmed",
                },
                {
                  label: t(
                    "agencyDashboard.bookings.tabs.managementAnalytics.manage.completed",
                  ),
                  value: "Completed",
                },
                {
                  label: t(
                    "agencyDashboard.bookings.tabs.managementAnalytics.manage.cancelled",
                  ),
                  value: "Cancelled",
                },
              ].map((s) => (
                <div key={s.value} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`s-${s.value}`}
                    className="rounded border-gray-300"
                  />
                  <label
                    htmlFor={`s-${s.value}`}
                    className="text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    {s.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <Label className="font-bold text-xs uppercase text-gray-500 mb-3 block">
              {t(
                "agencyDashboard.bookings.tabs.managementAnalytics.manage.dateRange",
              )}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                placeholder={t(
                  "agencyDashboard.bookings.tabs.managementAnalytics.manage.startDate",
                )}
              />
              <Input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                placeholder={t(
                  "agencyDashboard.bookings.tabs.managementAnalytics.manage.endDate",
                )}
              />
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <Label className="font-bold text-xs uppercase text-gray-500 mb-3 block">
              {t(
                "agencyDashboard.bookings.tabs.managementAnalytics.manage.rateRange",
              )}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder={t(
                  "agencyDashboard.bookings.tabs.managementAnalytics.manage.min",
                )}
                type="number"
                value={rateMin}
                onChange={(e) => setRateMin(e.target.value)}
              />
              <Input
                placeholder={t(
                  "agencyDashboard.bookings.tabs.managementAnalytics.manage.max",
                )}
                type="number"
                value={rateMax}
                onChange={(e) => setRateMax(e.target.value)}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4 border shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-bold text-gray-700">
            {t(
              "agencyDashboard.bookings.tabs.managementAnalytics.manage.sortBy",
            )}
          </span>
          <Select value={sortKey} onValueChange={setSortKey}>
            <SelectTrigger className="w-full sm:w-[180px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bookingDate">
                {t(
                  "agencyDashboard.bookings.tabs.managementAnalytics.manage.bookingDate",
                )}
              </SelectItem>
              <SelectItem value="talentName">
                {t(
                  "agencyDashboard.bookings.tabs.managementAnalytics.manage.talentName",
                )}
              </SelectItem>
              <SelectItem value="clientName">
                {t(
                  "agencyDashboard.bookings.tabs.managementAnalytics.manage.clientName",
                )}
              </SelectItem>
              <SelectItem value="rateAmount">
                {t(
                  "agencyDashboard.bookings.tabs.managementAnalytics.manage.rateAmount",
                )}
              </SelectItem>
              <SelectItem value="createdDate">
                {t(
                  "agencyDashboard.bookings.tabs.managementAnalytics.manage.createdDate",
                )}
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={toggleSortDirection}
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${sortDirection === "asc" ? "rotate-180" : ""}`}
            />
          </Button>
        </div>
      </Card>

      <div className="space-y-4">
        <h4 className="font-bold text-gray-900">
          {t(
            "agencyDashboard.bookings.tabs.managementAnalytics.manage.results",
            { count: filteredAndSortedBookings.length },
          )}
        </h4>
        {filteredAndSortedBookings.length > 0 ? (
          filteredAndSortedBookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-white border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center font-bold text-indigo-700">
                  {pickString(
                    booking?.talent_name,
                    booking?.talentName,
                    "?",
                  )[0].toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">
                    {pickString(booking?.talent_name, booking?.talentName) ||
                      "Unknown"}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {pickString(booking?.status, booking?.type) ||
                      t(
                        "agencyDashboard.bookings.tabs.managementAnalytics.manage.pending",
                      )}{" "}
                    •{" "}
                    {pickString(
                      booking?.type,
                      booking?.bookingType,
                      booking?.booking_type,
                    ) || "Booking"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:gap-6">
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-500">
                    {booking.date
                      ? format(parseISO(booking.date), "MMM dd, yyyy")
                      : t(
                          "agencyDashboard.bookings.tabs.managementAnalytics.manage.noDate",
                        )}
                  </p>
                  <p className="text-xs text-gray-400">
                    {pickString(booking?.call_time, booking?.callTime) ||
                      "--:--"}
                  </p>
                </div>
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none px-3">
                  {pickString(booking?.status, booking?.type) ||
                    t(
                      "agencyDashboard.bookings.tabs.managementAnalytics.manage.pending",
                    )}
                </Badge>
                <p className="font-bold text-gray-900">
                  {(() => {
                    const dollars = bookingRateDollars(booking);
                    const currency =
                      pickString(booking?.currency, "USD") || "USD";
                    if (dollars <= 0) return "—";
                    return `${currency} ${dollars.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
                  })()}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>
              {t(
                "agencyDashboard.bookings.tabs.managementAnalytics.manage.noBookingsFound",
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const ReportsExportTab = ({ bookings }: { bookings?: any[] }) => {
  const { t } = useTranslation("agency");
  const { toast } = useToast();

  const bookingsCount = Array.isArray(bookings) ? bookings.length : 0;

  const handleExport = (format: string) => {
    const { dismiss } = toast({
      title: `Exporting ${bookingsCount} bookings as ${format}...`,
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            dismiss();
          }}
        >
          OK
        </Button>
      ),
    });
  };

  const handleScheduleReports = () => {
    const { dismiss } = toast({
      title: t(
        "agencyDashboard.bookings.tabs.managementAnalytics.reports.scheduledWeeklyReports",
      ),
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            dismiss();
          }}
        >
          {t("agencyDashboard.bookings.tabs.managementAnalytics.reports.ok")}
        </Button>
      ),
    });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 border shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900">
            {t(
              "agencyDashboard.bookings.tabs.managementAnalytics.reports.exportBookings",
            )}
          </h3>
          <p className="text-gray-500 font-medium text-sm mt-1">
            {t(
              "agencyDashboard.bookings.tabs.managementAnalytics.reports.exportDescription",
              { count: bookingsCount },
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2 border-green-200 hover:bg-green-50 hover:border-green-300 transition-all group"
            onClick={() => handleExport("CSV")}
          >
            <FileText className="w-6 h-6 text-green-600 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-green-700">
              {t(
                "agencyDashboard.bookings.tabs.managementAnalytics.reports.exportToCSV",
              )}
            </span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2 border-red-200 hover:bg-red-50 hover:border-red-300 transition-all group"
            onClick={() => handleExport("PDF")}
          >
            <FileText className="w-6 h-6 text-red-600 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-red-700">
              {t(
                "agencyDashboard.bookings.tabs.managementAnalytics.reports.exportToPDF",
              )}
            </span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2 border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all group"
            onClick={() => handleExport("EXCEL")}
          >
            <FileText className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-blue-700">
              {t(
                "agencyDashboard.bookings.tabs.managementAnalytics.reports.exportToExcel",
              )}
            </span>
          </Button>
        </div>

        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
          <h4 className="font-bold text-gray-900 mb-4">
            {t(
              "agencyDashboard.bookings.tabs.managementAnalytics.reports.includedColumns",
            )}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              t(
                "agencyDashboard.bookings.tabs.managementAnalytics.reports.talentName",
              ),
              t(
                "agencyDashboard.bookings.tabs.managementAnalytics.reports.clientName",
              ),
              t(
                "agencyDashboard.bookings.tabs.managementAnalytics.reports.bookingDate",
              ),
              t(
                "agencyDashboard.bookings.tabs.managementAnalytics.reports.callTime",
              ),
              t(
                "agencyDashboard.bookings.tabs.managementAnalytics.reports.wrapTime",
              ),
              t(
                "agencyDashboard.bookings.tabs.managementAnalytics.reports.location",
              ),
              t(
                "agencyDashboard.bookings.tabs.managementAnalytics.reports.rate",
              ),
              t(
                "agencyDashboard.bookings.tabs.managementAnalytics.reports.type",
              ),
              t(
                "agencyDashboard.bookings.tabs.managementAnalytics.reports.status",
              ),
              t(
                "agencyDashboard.bookings.tabs.managementAnalytics.reports.notes",
              ),
              t(
                "agencyDashboard.bookings.tabs.managementAnalytics.reports.createdDate",
              ),
              t(
                "agencyDashboard.bookings.tabs.managementAnalytics.reports.updatedDate",
              ),
            ].map((col) => (
              <div key={col} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-orange-500 fill-orange-500" />
                <span className="text-sm font-medium text-gray-700">{col}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-6 border shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900">
            {t(
              "agencyDashboard.bookings.tabs.managementAnalytics.reports.scheduleAutomatedReports",
            )}
          </h3>
          <p className="text-gray-500 font-medium text-sm mt-1">
            {t(
              "agencyDashboard.bookings.tabs.managementAnalytics.reports.scheduleDescription",
            )}
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="font-bold">
              {t(
                "agencyDashboard.bookings.tabs.managementAnalytics.reports.reportFrequency",
              )}
            </Label>
            <Select defaultValue="weekly">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">
                  {t(
                    "agencyDashboard.bookings.tabs.managementAnalytics.reports.daily",
                  )}
                </SelectItem>
                <SelectItem value="weekly">
                  {t(
                    "agencyDashboard.bookings.tabs.managementAnalytics.reports.weekly",
                  )}
                </SelectItem>
                <SelectItem value="monthly">
                  {t(
                    "agencyDashboard.bookings.tabs.managementAnalytics.reports.monthly",
                  )}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="font-bold">
              {t(
                "agencyDashboard.bookings.tabs.managementAnalytics.reports.emailRecipients",
              )}
            </Label>
            <Input defaultValue="agent@agency.com" />
          </div>

          <Button
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 mt-2"
            onClick={handleScheduleReports}
          >
            <Mail className="w-4 h-4 mr-2" /> Schedule Weekly Reports
          </Button>
        </div>
      </Card>
    </div>
  );
};
